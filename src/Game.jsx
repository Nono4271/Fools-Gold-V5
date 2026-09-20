import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { unstable_batchedUpdates } from "react-dom";

// Constants
import { getFactionAlignment } from "../shared/constants/factions.js";
import { HQP, POWER_DEFS, hqSiegeValue, FORT_LEVELS } from "../shared/constants/map.js";
import { FACTION_TROOPS } from "../shared/constants/troops.js";
import { barracksCapacity, upgCost, upgDuration, maxAvailLevel, tierFromBranchLevel } from "../shared/constants/buildings.js";
import { isoXY } from "../shared/constants/geometry.js";

// Utils
import { adj, effectiveMarchSpd, marchStepMs, normaliseTroopSlots } from "../shared/utils/pathfinding.js";
import { applyGearToCmd } from "../shared/utils/gearStats.js";
import { capstoneTrainDiscount } from "../shared/utils/training.js";

// Hooks
import { useResources } from "./hooks/useResources.js";
import { useAI } from "./hooks/useAI.js";
import { useArmyEconomy } from "./hooks/useArmyEconomy.js";
import { useTraining } from "./hooks/useTraining.js";
import { useMarch } from "./hooks/useMarch.js";
import { useForts } from "./hooks/useForts.js";
import { useUpgrades } from "./hooks/useUpgrades.js";
import { useGameLoop } from "./hooks/useGameLoop.js";
import { usePathfinding } from "./hooks/usePathfinding.js";
import { useServerSync } from "./hooks/useServerSync.js";
import { useBattle } from "./hooks/useBattle.js";
import { useGacha } from "./hooks/useGacha.js";
import { useTomes } from "./hooks/useTomes.js";
import { useFortRemovals } from "./hooks/useFortRemovals.js";
import { isDoubleTap } from "../shared/utils/doubleTap.js";
import { useVoidTap } from "./hooks/useVoidTap.js";
import { useTroopSlots } from "./hooks/useTroopSlots.js";
import { useRelocation } from "./hooks/useRelocation.js";
import { useConsumables } from "./hooks/useConsumables.js";
import { useTileTimers } from "./hooks/useTileTimers.js";
import { useTacticTicks } from "./hooks/useTacticTicks.js";
import { useAiCrews } from "./hooks/useAiCrews.js";
import { useChat } from "./hooks/useChat.js";
import { useReinforcements } from "./hooks/useReinforcements.js";
import { useTactics } from "./hooks/useTactics.js";
import { useMapInit } from "./hooks/useMapInit.js";
import { consumeOne, withRssBoosts } from "../shared/utils/consumables.js";

// Screens
import GameView from "./GameView.jsx";
import { perfLog } from "./utils/perfLog.jsx";
import TitleScreen from "./components/screens/TitleScreen.jsx";
import FactionScreen from "./components/screens/FactionScreen.jsx";
import GachaScreen from "./components/screens/GachaScreen.jsx";


export default function RiseToWar() {
  // ── Screens ──
  const [screen,  setScreen]  = useState("title");
  const [facKey,  setFacKey]  = useState("pirates");
  const [facName, setFacName] = useState("Pirates");
  const playerAlignment = getFactionAlignment(facKey);

  // ── Tiles — stored in a mutable ref to avoid 490k React reconciliation ──
  const [tileVersion, setTileVersion] = useState(0);
  const tilesMapRef = useRef({});
  const [crossingsState, setCrossingsState] = useState([]);
  const [keepMeta, setKeepMeta] = useState({});
  // useMemo gives a stable object identity between tileVersion bumps so
  // MapRenderer's memo() wrapper and every other consumer only re-renders
  // when tiles actually changed, not on every unrelated Game re-render.
  const tiles = useMemo(() => tilesMapRef.current, [tileVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const setTiles = useCallback((updater) => {
    if (typeof updater === "function") {
      tilesMapRef.current = updater(tilesMapRef.current);
    } else {
      tilesMapRef.current = updater;
    }
    setTileVersion(v => v + 1);
  }, []);

  // Small index of only garrison-defeated tiles { key → { garrisonDefeated, resetAt } }
  // Maintained inside patchTile so the gameLoop snapshot never scans all 490k tiles.
  const defeatedTilesRef = useRef({});

  // Debounce ref: batch rapid forceRedrawTiles calls (e.g. AI init patching many tiles at once)
  const forceRedrawTimerRef = useRef(null);

  // Player and AI tile key indexes — maintained in patchTile on ownership changes
  // so useAI and Minimap never scan all 490k tiles.
  const pKeysRef = useRef(new Set());
  const [pKeys, setPKeys] = useState(() => new Set());
  const aiTileKeysRef = useRef(new Set());
  // Running total of ringPower for player-owned tiles — maintained in patchTile
  // so powerPerHr never requires an O(1.4M) scan. Updated O(1) per ownership change.
  const powerPerHrRef = useRef(0);
  const [powerPerHr, setPowerPerHr] = useState(0);

  const tileCapRef = useRef(60); // kept in sync with tileCap — used inside patchTile callback

  const patchTile = useCallback((key, patch) => {
    const t = tilesMapRef.current[key];
    if (!t) return;
    // Create a new root object so useMemo returns a new reference,
    // which triggers MapRenderer's useEffect([tiles]) and redraws immediately.
    // Object.assign into a same-prototype object keeps garrisonDefeated on the
    // prototype chain — no per-patch Object.defineProperty needed.
    const merged = Object.assign(Object.create(Object.getPrototypeOf(t)), t, patch);
    // Write the patched tile directly into tilesMapRef (which may be a Proxy).
    // DO NOT spread the entire map — if tilesMapRef is a Proxy over typed arrays,
    // { ...tilesMapRef.current } would enumerate all 1.4M tiles via ownKeys.
    // tileVersion bump is sufficient to notify useMemo of the change.
    tilesMapRef.current[key] = merged;
    const updated = tilesMapRef.current[key];
    // Keep defeatedTilesRef in sync — track any tile with a pending reset
    if ('defeatedWaves' in patch || 'resetAt' in patch) {
      const allDefeated = (updated.defeatedWaves?.length ?? 0) >= (updated.garrisonWaves ?? 1);
      if (allDefeated && updated.resetAt) {
        defeatedTilesRef.current[key] = { resetAt: updated.resetAt };
      } else if (updated.resetAt) {
        // Partial progress also needs reset tracking
        defeatedTilesRef.current[key] = { resetAt: updated.resetAt };
      } else {
        delete defeatedTilesRef.current[key];
      }
    }
    if ('owner' in patch && patch.owner !== t.owner) {
      const newSet = new Set(pKeysRef.current);
      if (patch.owner === "player" && newSet.size < tileCapRef.current) newSet.add(key);
      else if (patch.owner === "player") return; // tile cap reached — block capture
      else newSet.delete(key);
      pKeysRef.current = newSet;
      setPKeys(newSet);
      // Update powerPerHrRef — O(1) delta instead of O(1.4M) scan
      const pl = merged.powerLevel;
      if (pl && !merged.isHQ && !merged.isHQPart) {
        const rp = POWER_DEFS[pl]?.ringPower ?? 0;
        if (t.owner === "player") powerPerHrRef.current -= rp;
        if (patch.owner === "player") powerPerHrRef.current += rp;
        setPowerPerHr(powerPerHrRef.current);
      }
      // Keep global AI tile index in sync (legacy — used by aiTileKeysRef)
      const newAiSet = new Set(aiTileKeysRef.current);
      if (patch.owner === "ai") newAiSet.add(key);
      else newAiSet.delete(key);
      aiTileKeysRef.current = newAiSet;
      // Keep per-faction tile index in sync
      const tileFaction = merged.faction || null;
      if (patch.owner === "ai" && tileFaction) {
        const fkSet = new Set(aiTileKeysMapRef.current.get(tileFaction) || []);
        fkSet.add(key);
        aiTileKeysMapRef.current.set(tileFaction, fkSet);
      } else if (patch.owner !== "ai") {
        // Remove from whichever faction owned it
        for (const [fk, fkSet] of aiTileKeysMapRef.current) {
          if (fkSet.has(key)) { const ns = new Set(fkSet); ns.delete(key); aiTileKeysMapRef.current.set(fk, ns); break; }
        }
      }
      // Ownership changed — redraw PIXI canvas immediately rather than waiting
      // for the React effect chain (setTileVersion → render → useEffect → redraw).
      // This eliminates the 1-2 frame delay where the tile shows its old colour.
      // Debounced: if multiple tiles change ownership in the same tick (e.g. AI init),
      // we collapse them into a single redraw ~16ms later instead of N redraws.
      if (!forceRedrawTimerRef.current) {
        forceRedrawTimerRef.current = setTimeout(() => {
          forceRedrawTimerRef.current = null;
          mapRendererRef.current?.forceRedrawTiles(tilesMapRef.current);
        }, 16);
      }
    }
    setTileVersion(v => v + 1);
  }, []);

  const [mapReady, setMapReady] = useState(false);
  // Stable session ID — generated once per browser session
  const [sessionId] = useState(() => `fg-${Math.random().toString(36).slice(2,10)}`);
  const [loadPct,  setLoadPct]  = useState(0);
  const [loadLabel,setLoadLabel]= useState("Generating world...");
  const [playerHqKey, setPlayerHqKey] = useState(null);
  const {rss,setRss,troopCounts,setTroopCounts,trainingQueues,setTrainingQueues,healQueue,setHealQueue,woundedTroops,setWounded,addWounded,autoHeal,setAutoHeal,dispatch:dispatchArmy} = useArmyEconomy();
  const [gems,   setGems]    = useState(20000);
  const [crewOpen,      setCrewOpen]      = useState(false);
  const [chatOpen,      setChatOpen]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [playerCrewId,  setPlayerCrewId]  = useState(null);
  const [pendingCrewId, setPendingCrewId] = useState(null);
  const [crews,         setCrews]         = useState([]);

  const [playerCmds, setPlayerCmds] = useState([]);
  const aiCmdsRef = useRef([]);
  const cmdsRef = useRef([]);
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    console.log("[BG] html:", getComputedStyle(html).backgroundColor);
    console.log("[BG] body:", getComputedStyle(body).backgroundColor);
    console.log("[BG] root:", getComputedStyle(root).backgroundColor);
    setTimeout(() => {
      [
        { label: "BLACK-BAR", x: window.innerWidth * 0.08, y: 30 },
        { label: "MINIMAP",   x: 73, y: 80 },
      ].forEach(({ label, x, y }) => {
        const elements = document.elementsFromPoint(x, y);
        elements.slice(0, 5).forEach((el, i) => {
          const st = getComputedStyle(el);
          console.log(`[SPOT:${label}][${i}] ${el.tagName} class="${el.className}" id="${el.id}" bg=${st.backgroundColor} pe=${st.pointerEvents} z=${st.zIndex}`);
        });
      });
    }, 2000);
  }, []);

  useEffect(() => { cmdsRef.current = [...playerCmds, ...aiCmdsRef.current]; }, [playerCmds]);

  const setAiCmds = useCallback((updater) => {
    aiCmdsRef.current = typeof updater === "function" ? updater(aiCmdsRef.current) : updater;
    // Re-derive from cmdsRef (player portion) rather than stale playerCmds closure.
    const curPlayer = cmdsRef.current.filter(c => c.owner === "player");
    cmdsRef.current = [...curPlayer, ...aiCmdsRef.current];
    // Bump version so cmds useMemo recomputes → MapRenderer redraws AI commanders
    setAiCmdsVersion(v => v + 1);
  }, []);

  const setCmds = useCallback((updater) => {
    // Use functional setPlayerCmds so `prev` is always the latest player cmds —
    // avoids the stale-closure bug where commanders added after this callback was
    // created would be silently dropped when setPlayerCmds(nextPlayer) ran.
    setPlayerCmds(prev => {
      const merged = [...prev, ...aiCmdsRef.current];
      const next = typeof updater === "function" ? updater(merged) : updater;
      const nextPlayer = next.filter(c => c.owner === "player");
      const nextAi     = next.filter(c => c.owner !== "player");
      aiCmdsRef.current = nextAi;
      cmdsRef.current   = next;
      return nextPlayer;
    });
  }, []);

  // Include AI commanders so MapRenderer draws them on the map.
  const [aiCmdsVersion, setAiCmdsVersion] = useState(0);
  const cmds = useMemo(() => [...playerCmds, ...aiCmdsRef.current], [playerCmds, aiCmdsVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const [coll,   setColl]    = useState([]);

  // floatyRef lets useGacha call floaty without requiring it to be defined yet.
  // floatyRef.current is set after floaty is defined below (~line 860).
  const floatyRef = useRef(null);
  // playerHqRef must be declared before useGacha since it's passed into it.
  const playerHqRef = useRef(null);
  const onForcedRelocateRef = useRef(null);
  // staminaMaxRef — updated after tome constants derived, read by useGacha when spawning commanders
  const staminaMaxRef = useRef(150);

  // ── Gacha / gear / pull — owned by useGacha ───────────────────────────────
  const {
    pityCounters, setPityCounters,
    gearInventory, setGearInventory,
    respectSchematics, setRespectSchematics,
    pullResults, setPullResults,
    pullKey, setPullKey,
    lastFreePull, setLastFreePull,
    dailyHalfUsed, setDailyHalfUsed,
    isFreeAvailable, isHalfAvailable,
    pullCost, pull,
  } = useGacha({
    staminaMaxRef, playerAlignment, gems, setGems, playerHqRef, setCmds, setColl, floatyRef });

  const [bldgs,  setBldgs]   = useState({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, storage:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0, voidtap:0 });
  const [upgQueue, setUpgQueue] = useState({});

  const [aiFaction,      setAiFaction]      = useState(null);
  // aiRss is only consumed via aiRssRef during gameplay — never passed as a prop
  // to any rendered component. Removing the useState eliminates ~1 re-render/sec
  // from tickAiRss. setAiRss now writes directly to the ref; a no-op state shim
  // is kept so FactionScreen/WinScreen callers compile without changes.
  const [aiBldgs,        setAiBldgs]        = useState({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
  const [aiBarracksPool, setAiBarracksPool] = useState(barracksCapacity(0));
  const aiLastActionRef = useRef(0);
  const [aiHqKeys, setAiHqKeys] = useState({});

  const tilesRef   = tilesMapRef;
  const aiRssRef   = useRef({ stone:300, wood:300, gas: 300, food: 300 });
  // setAiRss: writes directly to ref, no setState → no re-render during gameplay.
  // Accepts both plain objects and updater functions (same API as useState setter).
  const setAiRss = useCallback((updater) => {
    aiRssRef.current = typeof updater === "function" ? updater(aiRssRef.current) : updater;
  }, []);
  const aiBldgsRef = useRef({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
  const aiPoolRef  = useRef(barracksCapacity(0));

  useEffect(() => { aiBldgsRef.current = aiBldgs;        }, [aiBldgs]);
  useEffect(() => { aiPoolRef.current  = aiBarracksPool; }, [aiBarracksPool]);

  // ── Per-faction AI Maps (multi-faction simulation) ───────────────────────
  // Each map is keyed by faction string. All writes go directly to refs so
  // there are zero re-renders from AI economy ticks.
  const INIT_BLDGS = { hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 };
  const aiRssMapRef      = useRef(new Map()); // Map<fk, {stone,wood,gas,food}>
  const aiBldgsMapRef    = useRef(new Map()); // Map<fk, bldgsObj>
  const aiPoolMapRef     = useRef(new Map()); // Map<fk, number>
  const aiTileKeysMapRef = useRef(new Map()); // Map<fk, Set<tileKey>>

  const aiHqKeysRef      = useRef({});        // { [fk]: hqTileKey[] }
  const aiPlayerIdMapRef = useRef(new Map()); // Map<hqKey, playerId>  e.g. "ai_pirates_3"
  const spawnedAiHqsRef  = useRef(new Set()); // Set<hqKey> — already spawned commanders
  const aiGemsRef        = useRef(new Map()); // Map<playerId, gems>
  const aiFoundersRef    = useRef(new Set()); // Set<playerId> — AIs seeded with 1000 gems to found crews
  const [aiFactionKeys,  setAiFactionKeys]   = useState([]);

  // Updater helpers — write to map ref, no setState
  const setAiRssMap = useCallback((fk, updater) => {
    const cur = aiRssMapRef.current.get(fk) || { stone:300, wood:300, gas: 300, food: 300 };
    aiRssMapRef.current.set(fk, typeof updater === "function" ? updater(cur) : updater);
  }, []);
  const setAiBldgsMap = useCallback((fk, updater) => {
    const cur = aiBldgsMapRef.current.get(fk) || { ...INIT_BLDGS };
    aiBldgsMapRef.current.set(fk, typeof updater === "function" ? updater(cur) : updater);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setAiPoolMap = useCallback((fk, updater) => {
    const cur = aiPoolMapRef.current.get(fk) ?? barracksCapacity(0);
    aiPoolMapRef.current.set(fk, typeof updater === "function" ? updater(cur) : updater);
  }, []);
  useEffect(() => { playerHqRef.current = playerHqKey;   }, [playerHqKey]);

  // ── Bug 4 fix: sync player and AI HQ siegeMax when walls level changes ──
  useEffect(() => {
    if (!mapReady) return;
    const playerHQKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const newPlayerSiegeMax = hqSiegeValue(bldgs.walls || 0);
    const tile = tilesMapRef.current[playerHQKey];
    if (!tile) return;
    const newSiege = Math.min(tile.siege ?? newPlayerSiegeMax, newPlayerSiegeMax);
    patchTile(playerHQKey, { siegeMax: newPlayerSiegeMax, siege: newSiege });
  }, [bldgs.walls, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const newAiSiegeMax = hqSiegeValue(aiBldgs.walls || 0);
    // aiHqKeysRef already indexes all AI HQ primary keys — no tile scan needed.
    Object.values(aiHqKeysRef.current).flat().forEach(hqKey => {
      const tile = tilesMapRef.current[hqKey];
      if (!tile) return;
      const newSiege = Math.min(tile.siege ?? newAiSiegeMax, newAiSiegeMax);
      patchTile(hqKey, { siegeMax: newAiSiegeMax, siege: newSiege });
    });
  }, [aiBldgs.walls, mapReady]);

  // troopCounts: { "faction:branch:tier" => number }
  // 54 independent pools — one per distinct troop type (e.g. "pirates:swashbucklers:0" = Deckhands)
  // Total of all values must not exceed barracksCapacity(bldgs.barracks)

  // Convenience: total troops across all pools (for capacity checks)
  const barracksPool = Object.values(troopCounts).reduce((s, n) => s + (n || 0), 0);

  // Helper: get count for one specific troop type key
  const troopPoolFor = (branch) => {
    if (!branch?.faction || !branch?.branch || branch?.tier == null) return 0;
    return troopCounts[`${branch.faction}:${branch.branch}:${branch.tier}`] || 0;
  };

  // Mutate one pool entry by delta (positive = add, negative = remove), clamped to [0, cap]
  const adjustTroopCount = (branchKey, delta, cap) => {
    setTroopCounts(prev => {
      const cur = prev[branchKey] || 0;
      const next = cap != null
        ? Math.min(cap - (barracksPool - cur), Math.max(0, cur + delta))
        : Math.max(0, cur + delta);
      if (next === cur) return prev;
      return { ...prev, [branchKey]: next };
    });
  };

  // Legacy setBarracks shim — only used by useUpgrades to clamp pools when
  // barracks is downgraded. It receives pool => Math.min(pool, newCap).
  const setBarracks = (fn) => {
    setTroopCounts(prev => {
      const total = Object.values(prev).reduce((s, n) => s + (n || 0), 0);
      const newTotal = fn(total);
      if (newTotal >= total) return prev; // no clamping needed
      const ratio = newTotal / total;
      const next = {};
      for (const [k, v] of Object.entries(prev)) next[k] = Math.floor((v || 0) * ratio);
      return next;
    });
  };
  // unlockedBranches: { "faction:branchKey": maxTier }  (0-indexed tier)
  // Derived from bldgs so the Army tab works without visiting quarters first
  const [unlockedBranches, setUnlockedBranches] = useState({});

  // Keep unlockedBranches in sync with bldgs — this ensures Army tab shows
  // assignable troops as long as barracks are built, without requiring the
  // user to visit the Quarters tab first to trigger the QuarterDetail useEffect.
  useEffect(() => {
    const ub = {};
    Object.entries(FACTION_TROOPS).forEach(([fKey, fDef]) => {
      fDef.branches.forEach(br => {
        const bKey = `b_${fKey}_${br.key}`;
        const bLvl = bldgs[bKey] || 0;
        if (bLvl > 0) ub[`${fKey}:${br.key}`] = tierFromBranchLevel(bLvl);
      });
    });
    setUnlockedBranches(ub);
  }, [bldgs]); // eslint-disable-line react-hooks/exhaustive-deps
  // quarterLevels: { [factionKey]: currentLevel }  — player-purchased quarter upgrades
  const [quarterLevels, setQuarterLevels] = useState({});
  const [troopSkillLevels, setTroopSkillLevels] = useState({});

  // ── Void Tap — owned by useVoidTap ───────────────────────────────────────
  const {
    mysticOrbs, setMysticOrbs,
    lastVoidTap, setLastVoidTap,
    mysticOrbsCap, voidTapLvl, voidTapCooldown, voidTapReady,
    doVoidTap,
  } = useVoidTap({ bldgs, quarterLevels });

  // ── Wizard's Tomes — owned by useTomes ───────────────────────────────────
  const {
    tomesOpen,          setTomesOpen,
    tomesLevel,         setTomesLevel,
    powerPool,          setPowerPool,
    tomesUnspentPoints, setTomesUnspentPoints,
  } = useTomes({ screen, powerPerHrRef });

  // ── Tome node state — must be declared before tome-derived constants ──────
  const [dragonEggs,      setDragonEggs]      = useState(20);
  const [spawns,          setSpawns]          = useState({}); // { [tileKey]: SpawnState }
  const [protectedTiles,  setProtectedTiles]  = useState({}); // { [tileKey]: protectedUntil ms }
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [playerEntries,   setPlayerEntries]   = useState([]);
  const spawnWorkerRef        = useRef(null);
  const eligibleSpawnKeysRef = useRef([]);
  const [tomesNodeLevels, setTomesNodeLevels] = useState({});
  const [longMarchReady,  setLongMarchReady]  = useState(false);
  const [quickMarchReady, setQuickMarchReady] = useState(false);

  // ── Tome-derived constants ────────────────────────────────────────────────
  const tomeNodeLv = (id) => tomesNodeLevels[id] ?? 0;
  const tileCap        = 60 + tomeNodeLv("tl") * 15;          // Adventurer's Trek
  tileCapRef.current   = tileCap; // keep ref in sync for patchTile callback
  const dragonEggsCap  = 20 + tomeNodeLv("tr");               // Unlimited Eggs (max 30)
  const tomeSpdBonus   = tomeNodeLv("tl_t1") * 2;             // Speedster
  const tomeFocBonus   = tomeNodeLv("tl_b1") * 2;             // Willpower
  const tomeAtkBonus   = tomeNodeLv("tl_b2") * 2;             // Overpower
  const [rssSpeedUps, setRssSpeedUps] = useState({}); // active rss boosts — must be before rssBonus
  const rssBonus = withRssBoosts({                             // RSS Mastery nodes + active boosts
    food:  tomeNodeLv("tr_b1") * 0.015,
    wood:  tomeNodeLv("tr_b2") * 0.015,
    stone: tomeNodeLv("tr_b3") * 0.015,
    gas:   tomeNodeLv("tr_b4") * 0.015,
  }, rssSpeedUps, Date.now());
  const hasQuickGather = tomeNodeLv("tl_t") >= 1;
  const hasRecon       = tomeNodeLv("tr_t") >= 1;
  const hasGather      = tomeNodeLv("tr_b") >= 1;
  const hasCmdTraining = tomeNodeLv("bl_b") >= 1;
  // Col 3 — Combat
  const staminaMax     = 150 + tomeNodeLv("bl")    * 5;   // Easily Winded: base 150, +5/lv → 200
  staminaMaxRef.current = staminaMax; // keep ref in sync for useGacha
  const combatXpMult   = 1   + tomeNodeLv("bl_t")  * 0.015; // Combat Hardened: +1.5%/lv
  const trainingXpMult = 1   + tomeNodeLv("bl_b1") * 0.02;  // Training Specialist: +2%/lv
  // PVE Power — stubbed until mobs are implemented
  // const pvePowerBonus = tomeNodeLv("bl_b2") * 0.03;  // TODO: wire when mobs built
  // Col 4 — Command
  const fortMax            = 10 + tomeNodeLv("br");                  // Numerous Forts
  const hasLongMarch       = tomeNodeLv("br_t")   >= 1;             // Long March tactic
  const marchSpeedMult     = 1  - tomeNodeLv("br_t1") * 0.01;       // Marching Efficiency (reduces stepMs)
  const hasQuickMarch      = tomeNodeLv("br_m")   >= 1;             // Quick March tactic
  const trainingSpeedMult  = 1  + tomeNodeLv("br_b")  * 0.02;       // Troop Training
  const reinSpeedMult      = 1  - tomeNodeLv("br_b1") * 0.015;      // Reins (reduces stepMs)

  // Apply gear + tome stat bonuses to a commander
  const applyAllBonuses = (cmd, inv) => {
    const g = applyGearToCmd(cmd, inv);
    return {
      ...g,
      atk: g.atk + tomeAtkBonus,
      foc: g.foc + tomeFocBonus,
      spd: g.spd + tomeSpdBonus,
    };
  };
  const [woundedQueue,   setWoundedQueue]  = useState(0);
  const [trainSlider,    setTrainSlider]   = useState(100);

  const [bLog,          setBLog]          = useState([]);
  const [battles,       setBattles]       = useState([]);
  const [unseenBattles, setUnseenBattles] = useState(0);
  const [showBattleLog, setShowBattleLog] = useState(false);

  const [mode,       setMode]      = useState("view");
  const [selKey,     setSelKey]    = useState(null);
  const selKeyRef = useRef(null);
  useEffect(() => { selKeyRef.current = selKey; }, [selKey]);
  const lastTapRef = useRef({ k: null, t: 0 });
  const [popupPos,   setPopupPos]  = useState(null);
  const [tileScreenX, setTileScreenX] = useState(null);
  const [tileScreenY, setTileScreenY] = useState(null);
  const [popupMode,  setPopupMode] = useState("main");
  const [editArmyCmd, setEditArmyCmd] = useState(null);
  const [atkKey,     setAtkKey]    = useState(null);
  const [cmdPathLengths, setCmdPathLengths] = useState(new Map()); // uid → tile count
  const [mvCmd,      setMvCmd]     = useState(null);
  const [pickCmd,    setPick]      = useState(null);
  const [reinCmd,    setReinCmd]   = useState(null);
  const [reinMarches, setReinMarches] = useState([]);
  const reinMarchesRef = useRef([]);
  useEffect(() => { reinMarchesRef.current = reinMarches; }, [reinMarches]);
  const _fortsRef = useRef([]); // populated after useForts
  const [sliderVals, setSliderVals] = useState({});
  const [floats,     setFloats]    = useState([]);
  const [winner,     setWinner]    = useState(null);
  const [deletingTiles,    setDeletingTiles]    = useState({});
  const [deletingSecsLeft, setDeletingSecsLeft] = useState({});

  const [nowTick, setNowTick] = useState(() => Date.now());

  // Initialize pan to center on the default player HQ position so the first
  // render isn't black while waiting for the worker's 100ms teleport setTimeout.
  // isoXY(87, 254) → cx≈21320, cy≈6880 at TW=80, TH=40, ROWS=700, TOP_PAD=60.
  const _initHQ = isoXY(HQP.player.c, HQP.player.r);
  const _initZ  = 1.25;
  const panRef  = useRef({
    x: -_initHQ.cx * _initZ + window.innerWidth  / 2,
    y: -_initHQ.cy * _initZ + window.innerHeight / 2,
  });
  const mapRendererRef = useRef(null);
  const zoomRef = useRef(1.25);
  const modeRef = useRef("view");
  const mvCmdRef = useRef(null);
  const ZOOM_LEVELS = useMemo(() => [0.75, 1.0, 1.25, 1.5], []);

  // ── Display-only zoom state (pan NEVER causes re-renders) ────────────────
  // Pan is read from panRef directly everywhere. Only zoom changes (rare: pinch)
  // need a re-render. Removing pan from state eliminates the Game re-render that
  // was freezing the UI for 2-7 seconds on every pan-end.
  const [zoomState, setZoomState] = useState(_initZ);

  const notifyDisplayPanZoom = useCallback(() => {
    setZoomState(zoomRef.current);
    minimapRedrawRef.current?.();
  }, []);

  const centerOnHQ = useCallback(() => {
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const [hc, hr] = hqKey.split(",").map(Number);
    const { cx, cy } = isoXY(hc, hr);
    const z = zoomRef.current;
    const px = -cx * z + window.innerWidth / 2;
    const py = -cy * z + window.innerHeight / 2;
    panRef.current = { x: px, y: py };
    mapRendererRef.current?.teleport(px, py);
  }, []);

  const minimapRedrawRef = useRef(null);
  const lazySpawnRef = useRef(null); // set after lazySpawnAiCmds is defined below
  const panNotifyTimerRef = useRef(null);
  const onPanChange = useCallback(np => {
    panRef.current = np;
    // Redraw minimap directly via ref — no setState, no Game re-render.
    // Throttle to 100ms so we don't overdraw during fast pans.
    if (!panNotifyTimerRef.current) {
      panNotifyTimerRef.current = setTimeout(() => {
        panNotifyTimerRef.current = null;
        minimapRedrawRef.current?.();
        lazySpawnRef.current?.();
      }, 100);
    }
  }, []);

  const teleportTo = useCallback((tc, tr) => {
    const { cx, cy } = isoXY(tc, tr);
    const z = zoomRef.current;
    const px = -cx * z + window.innerWidth / 2;
    const py = -cy * z + window.innerHeight / 2;
    panRef.current = { x: px, y: py };
    // Small delay so WorldMap has closed and MapRenderer is visible
    setTimeout(() => {
      mapRendererRef.current?.teleport(px, py);
      notifyDisplayPanZoom();
    }, 50);
  }, [notifyDisplayPanZoom]);

  const [hqOpen, setHqOpen] = useState(false);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [worldMapPrompt, setWorldMapPrompt] = useState(false);
  const [hqTab,  setHqTab]  = useState("hub");
  const [cmdScreenOpen,  setCmdScreenOpen]  = useState(false);
  const [cmdScreenUid,   setCmdScreenUid]   = useState(null);
  const [gearScreenOpen, setGearScreenOpen] = useState(false);
  const [showPerf,       setShowPerf]       = useState(false);
  const [consumables,    setConsumables]    = useState([
    { instanceId: "reloc_start_1", typeId: "relocation", quantity: 2 },
  ]); // [{ instanceId, typeId, quantity }]
  const [lastRelocateAt, setLastRelocateAt] = useState(null); // timestamp ms

  // ── Hooks ──
  useResources({ screen, tilesRef, setRss, bldgs, fortsRef: _fortsRef, rssBonus });

  // Compute leaderboard entries safely — only iterates patched (owned) tiles
  useEffect(() => {
    if (!leaderboardOpen) return;
    try {
      const proxy = tilesRef.current;
      if (!proxy?.__ready) return;
      const playerPow = { id:"player", name: facName || "You", faction: facKey, power: 0 };
      const aiPow = {};
      const patchedKeys = Object.keys(proxy).filter(k => k !== "__ready" && proxy[k]?.owner);
      for (const key of patchedKeys) {
        const tile = proxy[key];
        if (!tile?.owner) continue;
        // Exclude non-resource tiles from power calculation
        if (tile.isHQ || tile.isHQPart || tile.isKeep || tile.isKeepPart ||
            tile.isGate || tile.isBorder || tile.isFort) continue;
        const pl = tile.powerLevel || 1;
        const pwr = pl * 10;
        if (tile.owner === "player") {
          playerPow.power += pwr;
        } else if (tile.owner === "ai" && tile.faction) {
          const fk = tile.faction;
          if (!aiPow[fk]) aiPow[fk] = { id:fk, name:fk.charAt(0).toUpperCase()+fk.slice(1).replace(/_/g," "), faction:fk, power:0 };
          aiPow[fk].power += pwr;
        }
      }
      const all = [playerPow, ...Object.values(aiPow)]
        .sort((a,b) => b.power - a.power).slice(0, 100);
      setPlayerEntries(all);
    } catch(e) { console.warn("Leaderboard compute error:", e); }
  }, [leaderboardOpen, facName, facKey]);

  // ── Spawn worker — init after map is ready ──────────────────────────────
  useEffect(() => {
    if (screen !== "game" || !mapReady) return;
    if (spawnWorkerRef.current) return;

    const worker = new Worker(
      new URL("./workers/spawn.worker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = ({ data }) => {
      if (data.type === "spawns")   setSpawns(data.spawns ?? {});
      if (data.type === "respawned") setSpawns(prev => ({ ...prev, [data.spawnKey]: data.spawn }));
    };

    spawnWorkerRef.current = worker;

    // Pass pre-built eligible keys — avoids Proxy enumeration
    worker.postMessage({ type: "init", eligibleKeys: eligibleSpawnKeysRef.current });

    // Tick every 30s for respawns
    const tickId = setInterval(() => worker.postMessage({ type: "tick" }), 30_000);

    return () => {
      clearInterval(tickId);
      worker.terminate();
      spawnWorkerRef.current = null;
    };
  }, [screen, mapReady]);

  const { initPathfinding, findPath, findPathBatch } = usePathfinding();
  const { runBattle } = useBattle();

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { mvCmdRef.current = mvCmd; }, [mvCmd]);

  const handleZoomChange = useCallback((newZoom) => {
    if (newZoom < ZOOM_LEVELS[0]) { setWorldMapPrompt(true); return; }
    zoomRef.current = newZoom;
    notifyDisplayPanZoom();
  }, [notifyDisplayPanZoom]);

  // ── World generation, reset and mapReady — rules in shared/utils/worldTiles.js ──
  useMapInit({
    screen, facKey, playerAlignment, tiles, tileVersion, tilesMapRef, setTiles,
    setLoadPct, setLoadLabel, setMapReady, setPlayerHqKey,
    panRef, zoomRef, setZoomState, mapRendererRef,
    aiHqKeysRef, aiRssMapRef, aiBldgsMapRef, aiPoolMapRef, aiTileKeysMapRef,
    aiPlayerIdMapRef, spawnedAiHqsRef, aiGemsRef, aiFoundersRef, pKeysRef, eligibleSpawnKeysRef,
    setCrossingsState, setKeepMeta, setAiHqKeys, setAiFactionKeys, setAiCmds, setAiCmdsVersion,
    setAiFaction, setPlayerCmds, initPathfinding, perfLog,
  });

  // ── Floaty helper ──
  const floaty = useCallback((txt, col, k) => {
    const [fc, fr] = k.split(",").map(Number);
    const tile = tilesRef.current[k];
    const { cx, cy } = isoXY(fc, fr);
    const elev = tile?.isHQ ? 14 : tile?.isWin ? 10 : tile?.isKeep ? 8 : 4;
    const screenX = cx * zoomRef.current + panRef.current.x;
    const screenY = (cy - elev) * zoomRef.current + panRef.current.y + 38;
    const id = Date.now() + Math.random();
    setFloats(f => [...f, { id, txt, col, x:screenX, y:screenY }]);
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1800);
  }, []);
  // Give useGacha access to floaty now that it's defined.
  floatyRef.current = floaty;

  // ── Dragon eggs, training/gather orders, stamina — rules in shared/utils/tactics.js ──
  useTacticTicks({
    screen, dragonEggsCap, setDragonEggs, setCmds, setPlayerCmds, setRss,
    tilesMapRef, trainingXpMult, staminaMaxRef, floaty,
  });

  // ── Tile protection + abandonment timers — rules in shared/utils/tileTimers.js ──
  const { registerProtection } = useTileTimers({
    setProtectedTiles, deletingTiles, setDeletingTiles, setDeletingSecsLeft,
    tilesMapRef, patchTile, facKey, playerHqRef, cmdsRef, setPlayerCmds,
    findPathBatch, applyAllBonuses, gearInventory, floaty,
  });

  // ── Lazy AI commander spawning ──────────────────────────────────────────
  // Disabled: only the single closest same-faction HQ gets commanders (spawned at init).
  // All other HQs exist on the map but have no commanders.
  const lazySpawnAiCmds = useCallback(() => {}, []);
  lazySpawnRef.current = lazySpawnAiCmds;

  // ── Crew coloring — crewmatePlayerIds ───────────────────────────────────
  // Set of ownerPlayerIds belonging to AI factions in the player's crew.
  const crewmatePlayerIds = useMemo(() => {
    if (!playerCrewId || !crews.length) return new Set();
    const myCrew = crews.find(c => c.id === playerCrewId);
    if (!myCrew) return new Set();
    const members = new Set(myCrew.members || []);
    const ids = new Set();
    for (const [hqKey, playerId] of aiPlayerIdMapRef.current) {
      // Only match full AI player IDs (e.g. "ai_pirates_3"), not faction keys.
      // Faction key matching ("pirates") would turn ALL faction HQs blue instantly.
      if (members.has(playerId)) ids.add(playerId);
    }

    return ids;
  }, [playerCrewId, crews]);

  // ── AI crew ticker — rules in shared/utils/aiCrews.js ──
  useAiCrews({ screen, mapReady, setCrews, aiPlayerIdMapRef, aiFoundersRef, aiGemsRef });

  // ── Chat — World/Faction/Crew/DM/Group; rules in shared/utils/chatRules.js
  // + shared/utils/aiChatter.js. Local-only (see useChat.js), not yet persisted.
  const chatKnownPlayerIds = useMemo(() => [...aiPlayerIdMapRef.current.values()], [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const {
    channels: chatChannels, sendMessage: sendChatMessage, startDm: startChatDm,
    startGroup: startChatGroup, getMessages: getChatMessages,
    profanityFilterEnabled: chatProfanityFilterEnabled,
    setProfanityFilterEnabled: setChatProfanityFilterEnabled,
  } = useChat({
    screen, playerId: "player", playerName: facName, playerFacKey: facKey,
    crews, aiPlayerIds: chatKnownPlayerIds,
  });

  // ── Server sync — authoritative tile state ──
  // Roadmap item 5: give the server a starting region (around the player's
  // HQ) instead of it dumping every mutable tile in the world to a joining
  // client — see useServerSync's GAME_INIT `viewport` field and
  // server/index.js's handleGameInit/sendSessionState.
  const INITIAL_VIEWPORT_RADIUS = 50;
  const { emitTileCapture, emitTileSiege, emitFortUpdate, connected: serverConnected } = useServerSync({
    screen,
    tiles,
    mapReady,
    patchTile,
    sessionId,
    initialViewport: {
      minC: HQP.player.c - INITIAL_VIEWPORT_RADIUS, maxC: HQP.player.c + INITIAL_VIEWPORT_RADIUS,
      minR: HQP.player.r - INITIAL_VIEWPORT_RADIUS, maxR: HQP.player.r + INITIAL_VIEWPORT_RADIUS,
    },
  });
  const { tickAiRss, tickAiMarch, tickAiEcon } = useAI({
    aiFactionKeys,
    cmdsRef, tilesRef,
    aiRssMapRef, aiBldgsMapRef, aiPoolMapRef, aiTileKeysMapRef,
    setCmds: setAiCmds,
    setAiRssMap, setAiBldgsMap, setAiPoolMap,
    findPathBatch,
  });

  useTraining({screen,bldgs,dispatchArmy});

  useUpgrades({ screen, setUpgQueue, setBldgs, setBarracks });

  // Build gatePartners: for each crossing, map gateA key ↔ gateB key so that
  // a commander on gateA is treated as adjacent to gateB (and vice versa).
  // BORDER_HALF = 2, so gateA is at offset -2 and gateB at offset +1 from bCoord.
  const gatePartners = useMemo(() => {
    const map = {};
    for (const cr of crossingsState) {
      let aKey, bKey;
      if (cr.axis === 'H') {
        aKey = `${cr.gCoord},${cr.bCoord - 2}`;
        bKey = `${cr.gCoord},${cr.bCoord + 1}`;
      } else {
        aKey = `${cr.bCoord - 2},${cr.gCoord}`;
        bKey = `${cr.bCoord + 1},${cr.gCoord}`;
      }
      map[aKey] = bKey;
      map[bKey] = aKey;
    }
    return map;
  }, [crossingsState]);

  const {
    forts,
    buildFort,
    upgradeFort,
    startFortRemoval,
    cancelFortRemoval,
    destroyFort,
    stationAtFort,
    unstationCmd,
    damageFort,
    getFortAtTile,
    getStationedFort,
    getAnchors,
    loadForts,
  } = useForts({ playerHqKey, cmds, setCmds, emitFortUpdate, fortMax });

  // Wrap buildFort to deduct 3 dragon eggs
  const buildFortWithCost = useCallback((tileKey, tile) => {
    if ((dragonEggs ?? 0) < 3) { floaty("⚡ Need 3 Dragon Eggs to build a fort!", "#cc4040", tileKey); return; }
    const result = buildFort(tileKey, tile);
    if (result?.ok !== false) setDragonEggs(e => Math.max(0, e - 3));
  }, [buildFort, dragonEggs, floaty]);

  // Demolish — remove fort, tile stays player-owned
  const demolishFort = useCallback((fortId) => {
    destroyFort(fortId);
    floaty("🔨 Fort demolished", "#c8a060", null);
  }, [destroyFort, floaty]);

  // Abandon — remove fort AND release tile back to neutral
  const abandonFort = useCallback((fortId) => {
    const fort = forts.find(f => f.id === fortId);
    destroyFort(fortId);
    if (fort?.tileKey) {
      patchTile(fort.tileKey, {
        owner: null, faction: null, ownerPlayerId: null,
        garrison: 0, garrisonTroops: 0,
        siege: 50, siegeMax: 50,
        defeatedWaves: [], resetAt: null,
        defCmd: null, hasAiCommander: false,
      });
    }
    floaty("🚪 Fort abandoned", "#8a8a8a", null);
  }, [destroyFort, forts, patchTile, floaty]);

  // Fires demolish/abandon when a fort's stored deadline passes.
  useFortRemovals({ screen, forts, demolishFort, abandonFort });

  const fortsRef = useRef(forts);
  useEffect(() => { fortsRef.current = forts; _fortsRef.current = forts; }, [forts]);
  _fortsRef.current = forts; // sync immediately too

  // Recall that also unstations from fort
  const recallFromFort = useCallback((cmdUid, fortId) => {
    unstationCmd(cmdUid);
    recallStationary(cmdUid);
  }, [unstationCmd]);

  // ── Guard feature ─────────────────────────────────────────────────────────
  const startGuard = useCallback((uid) => {
    const cmd = cmdsRef.current.find(c => c.uid===uid && c.owner==="player");
    if (!cmd || cmd.march) return;
    const cost = 10;
    if ((cmd.stamina ?? staminaMax) < cost) { floaty("⚡ Not enough stamina!", "#cc8030", cmd.tk); return; }
    setCmds(p => p.map(c => c.uid===uid ? { ...c, isGuarding:true, guardedAt:Date.now(), stamina:Math.max(0,(c.stamina??staminaMax)-cost) } : c));
  }, [floaty]);

  const cancelGuard = useCallback((uid) => {
    setCmds(p => p.map(c => c.uid===uid ? { ...c, isGuarding:false, guardedAt:null } : c));
  }, []);

  // Set of tile keys currently being guarded (player/crew tiles in 3x3 around each guarding cmd)
  const guardedTiles = useMemo(() => {
    const guarded = new Map();
    for (const cmd of playerCmds) {
      if (!cmd.isGuarding || cmd.march) continue;
      const [cc, cr] = cmd.tk.split(",").map(Number);
      for (let dr=-1; dr<=1; dr++) {
        for (let dc=-1; dc<=1; dc++) {
          const key = `${cc+dc},${cr+dr}`;
          const tile = tiles[key];
          if (!tile) continue;
          if (tile.isHQ || tile.isHQPart) continue; // HQ not guardable
          const isOwned = tile.owner === "player";
          const isCrew = tile.ownerPlayerId && crewmatePlayerIds.has(tile.ownerPlayerId);
          if (!isOwned && !isCrew) continue;
          if (!guarded.has(key)) guarded.set(key, []);
          guarded.get(key).push(cmd);
        }
      }
    }
    for (const [k, arr] of guarded) {
      arr.sort((a,b) => (b.guardedAt??0) - (a.guardedAt??0));
    }
    return guarded;
  }, [playerCmds, tiles, facKey, crewmatePlayerIds]);

  useMarch({
    screen, tiles, tileVersion, bldgs,
    cmds: cmdsRef.current,
    setCmds: setPlayerCmds,
    setAiCmds,
    setTiles, patchTile, addWounded, setBarracks,
    setBattles, setBLog, setWinner, setUnseenBattles,
    tilesRef, floaty, gearInventory,
    combatXpMult,
    playerHqKey: playerHqKey || playerHqRef.current || `${HQP.player.c},${HQP.player.r}`,
    aiHqKeys,
    emitTileCapture, emitTileSiege,
    gatePartners,
    facKey,
    troopSkillLevels,
    runBattle,
    crewmatePlayerIds,
    aiPlayerIdMap: aiPlayerIdMapRef.current,
    registerProtection,
    forts,
    getAnchors,
    getFortAtTile,
    stationAtFort,
    unstationCmd,
    damageFort,
    emitFortUpdate,
    guardedTiles,
    onForcedRelocate: (...args) => onForcedRelocateRef.current?.(...args),
  });

  useGameLoop({
    screen,
    cmds,
    tiles,
    reinMarches,
    aiFaction,
    playerFacKey: facKey,
    defeatedTilesRef,
    aiTileKeysMapRef,
    aiFactionKeys,
    aiPoolMapRef,
    aiRssMapRef,
    aiBldgsMapRef,
    aiHqKeysRef,
    playerHqKey,
    onSiegeReset: (changedKeys) => {
      let changed = false;
      changedKeys.forEach(k => {
        const tile = tilesMapRef.current[k];
        if (tile) {
          const reset = Object.assign(Object.create(Object.getPrototypeOf(tile)), tile,
            { siege: tile.siegeMax, defeatedWaves: [], resetAt: null });
          tilesMapRef.current[k] = reset;
          delete defeatedTilesRef.current[k];
          changed = true;
        }
      });
      if (changed) setTileVersion(v => v + 1);
    },
    onMarchStep: (updates) => {
      setCmds(prev => {
        let changed = false;
        const next = prev.map(cmd => {
          const upd = updates.find(u => u.uid === cmd.uid);
          if (!upd) return cmd;
          changed = true;
          if (upd.clearMarch) {
            const arrived = { ...cmd, tk: upd.tk, march: null };
            // Reposition arrival — station at fort
            if (cmd.march?.type === "reposition" && cmd.march?.destFortId) {
              const fortId = cmd.march.destFortId;
              // Call stationAtFort async after state settles
              setTimeout(() => stationAtFort(cmd.uid, fortId), 0);
              return { ...arrived, stationedFortId: fortId, stranded: false };
            }
            // Recall arrival at HQ — unstation from fort
            if (cmd.march?.type === "recall" || cmd.march?.type === "move") {
              const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
              if (upd.tk === hqKey) {
                setTimeout(() => unstationCmd(cmd.uid), 0);
                return { ...arrived, stationedFortId: null, stranded: false };
              }
            }
            return arrived;
          }
          return { ...cmd, tk: upd.tk, march: upd.marchPatch };
        });
        return changed ? next : prev;
      });
    },
    onAiRssTick:    tickAiRss,
    onAiMarchCheck: tickAiMarch,  // now receives dispatches from worker
    onAiEconTick:   tickAiEcon,
    onTick: (now) => {
      // Only update nowTick every 5s — it's only used for draw-timer countdown display
      // This eliminates 4 out of 5 full Game re-renders from the 1s heartbeat
      setNowTick(prev => (now - prev >= 5000) ? now : prev);
    },
  });

  // ── Reinforcement marches — rules in shared/utils/reinforcements.js ──
  const { startReinforcement } = useReinforcements({
    screen, playerHqRef, cmdsRef, tilesRef, setReinMarches, setTroopCounts, setPlayerCmds,
    bldgs, findPath, floaty, applyAllBonuses, gearInventory, reinSpeedMult, troopCounts,
    setMode, setReinCmd, setSliderVals,
  });

  // ── Computed ──

  // ── Sync React state from pre-built refs when map becomes ready ──────────
  // pKeysRef, powerPerHrRef, and aiTileKeysMapRef are all populated in the
  // done handler before mapReady fires — no tile scan needed here.
  useEffect(() => {
    if (!tilesMapRef.current.__ready) return;
    setPKeys(pKeysRef.current);
    setPowerPerHr(powerPerHrRef.current);
  }, [mapReady]);

  // Fix #4: Removed 200ms redrawOverlays polling interval.
  // redrawOverlays is already called reactively whenever cmds changes
  // (via the [cmds] useEffect in MapRenderer). The blind 200ms interval
  // was redundant work every frame regardless of whether anything changed.

  const cByTile = useMemo(() => {
    const m = {};
    playerCmds.forEach(c => { if (c.tk) { m[c.tk]=m[c.tk]||[]; m[c.tk].push(c); } });
    aiCmdsRef.current.forEach(c => { if (c.tk) { m[c.tk]=m[c.tk]||[]; m[c.tk].push(c); } });
    return m;
  }, [playerCmds]);

  const selTile = selKey ? tiles[selKey] : null;

  const cmdsOnSel = useMemo(() =>
    selKey ? playerCmds.filter(c => c.tk === selKey) : [],
  [selKey, playerCmds]);

  const selAdjToPlayer = useMemo(() => {
    if (!selTile || selTile.owner==="player") return false;
    const result = adj(selTile.c, selTile.r).some(ak => {
      const t = tiles[ak];
      if (!t) return false;
      if (t.owner === "player") return true;
      // Blue: crewmate-owned — counts for adjacency
      const pid = t.ownerPlayerId || aiPlayerIdMapRef.current.get(ak);
      if (pid && crewmatePlayerIds.has(pid)) return true;
      // Orange keeps/gates AND purple regular faction tiles — all count for attack adjacency
      if (t.faction === facKey) return true;
      return false;
    });

    return result;
  }, [selTile, tileVersion, facKey, crewmatePlayerIds]);

  const cmdsAdjToSel = useMemo(() => {
    if (!selAdjToPlayer || !selTile) return [];
    return playerCmds.filter(cmd =>
      cmd.owner === "player" && (normaliseTroopSlots(cmd).reduce((s,sl)=>s+(sl.troops||0),0) || cmd.troops || 0) > 0 && !cmd.march
    );
  }, [selAdjToPlayer, selTile, playerCmds]);

  const cmdsForMove = useMemo(() =>
    playerCmds.filter(cmd =>
      cmd.owner === "player" && (normaliseTroopSlots(cmd).reduce((s,sl)=>s+(sl.troops||0),0) || cmd.troops || 0) > 0 && !cmd.march
    ),
  [playerCmds]);

  const canAtk = !!(selTile && selTile.owner!=="player" && (selAdjToPlayer || longMarchReady));

  // Batch-compute path lengths from each commander to atkKey via pathfinding worker
  useEffect(() => {
    if (!atkKey) { setCmdPathLengths(new Map()); return; }
    const cmds = mode === "pickAttackCmd" ? cmdsAdjToSel : cmdsForMove;
    if (!cmds.length) { setCmdPathLengths(new Map()); return; }
    const requests = cmds.map(cmd => ({ requestId: cmd.uid, from: cmd.tk, to: atkKey }));
    findPathBatch(requests).then(results => {
      const map = new Map();
      for (const { requestId, path } of results) {
        map.set(requestId, path ? path.length - 1 : null);
      }
      setCmdPathLengths(map);
    });
  }, [atkKey, cmdsAdjToSel, cmdsForMove, mode, findPathBatch]);

  const marchingToSel = useMemo(() =>
    selKey ? playerCmds.filter(c => c.march?.dest===selKey) : [],
  [selKey, playerCmds]);

  const onEnterHQ = useCallback(() => {
    unstable_batchedUpdates(() => {
      setHqOpen(true); setHqTab("hub"); setSelKey(null); setPopupPos(null); setTileScreenX(null); setTileScreenY(null);
    });
  }, []);

  const panelOpen = (mode==="selectMarchDest" || mode==="reinforce") && !hqOpen;

  // ── Actions ──
  const startMarch = useCallback((cmd, destKey) => {
    if (!cmd || !destKey) return;
    // Re-read from ref to get the freshest tk (React state cmd may be one render behind)
    const freshCmd = cmdsRef.current?.find(c => c.uid === cmd.uid) ?? cmd;
    if (freshCmd.march) return;
    const freshCmdTroops = normaliseTroopSlots(freshCmd).reduce((s,sl)=>s+(sl.troops||0),0) || freshCmd.troops || 0;
    if (!freshCmdTroops || freshCmdTroops < 1) { floaty("⚠ Assign troops first!", "#cc8030", freshCmd.tk); return; }
    const destTile = tilesMapRef.current[destKey];
    // For HQPart tiles, ownerPlayerId is only on the primary tile — walk up via hqPrimaryKey
    const destOwnerPlayerId = destTile?.ownerPlayerId
      || (destTile?.isHQPart && destTile?.hqPrimaryKey ? tilesMapRef.current[destTile.hqPrimaryKey]?.ownerPlayerId : null)
      || (destTile?.isHQPart ? (() => {
            const hqCenterKey = adj(destTile.c, destTile.r).find(k => tilesMapRef.current[k]?.isHQ);
            return hqCenterKey ? aiPlayerIdMapRef.current.get(hqCenterKey) : null;
          })() : null)
      || (destTile?.isHQ ? aiPlayerIdMapRef.current.get(destKey) : null)
      || aiPlayerIdMapRef.current.get(destKey);
    const isCrewTile = crewmatePlayerIds.has(destOwnerPlayerId);
    const isCrewHQ   = isCrewTile && (destTile?.isHQ || destTile?.isHQPart);
    const type = (destTile?.owner==="player" || isCrewTile) ? "move" : "attack";
    if (type==="move" && destTile?.owner!=="player" && !isCrewTile) return;

    // Protection check — block attack if tile is in protection window
    if (type === "attack" && destTile?.protectedUntil && Date.now() < destTile.protectedUntil) {
      const secsLeft = Math.ceil((destTile.protectedUntil - Date.now()) / 1000);
      const m = Math.floor(secsLeft / 60), s = secsLeft % 60;
      floaty(`🛡 Protected — ${m}:${String(s).padStart(2,"0")} remaining`, "#4488ff", destKey);
      return;
    }

    // Stamina check: moves cost 10, attacks cost 20
    const staminaCost = type === "attack" ? 20 : 10;
    const curStamina = freshCmd.stamina ?? staminaMax;
    if (curStamina < staminaCost) {
      floaty(`⚡ Not enough stamina! (${curStamina}/${staminaMax})`, "#cc8030", freshCmd.tk);
      return;
    }
    const boostedSpd = applyAllBonuses(freshCmd, gearInventory).spd || 60;
    const slots0 = normaliseTroopSlots(freshCmd);
    const baseStepMs = marchStepMs(effectiveMarchSpd(boostedSpd, slots0.length ? slots0.map(sl=>sl.branch) : freshCmd.troopBranch));
    const quickBonus = quickMarchReady ? 0.5 : 1;
    const stepMs = Math.max(50, Math.round(baseStepMs * marchSpeedMult * quickBonus));
    if (quickMarchReady) setQuickMarchReady(false);
    if (longMarchReady) setLongMarchReady(false);
    setMode("view"); setMvCmd(null); setSelKey(null); setPopupPos(null); setTileScreenX(null); setTileScreenY(null);
    perfLog(`march: from ${freshCmd.tk} → ${destKey}`);
    findPath(freshCmd.tk, destKey).then(path => {
      perfLog(`path: ${path?.length ?? 'NULL'} steps | impass sent earlier`);
      if (!path || path.length < 2) {
        perfLog(`FAIL: no path ${freshCmd.tk}→${destKey}`);
        floaty("⚠ No path to target!", "#cc4040", freshCmd.tk);
        return;
      }
      // Deduct stamina immediately on march dispatch
      setCmds(p => p.map(c => c.uid===freshCmd.uid ? {
        ...c,
        stamina: Math.max(0, (c.stamina ?? staminaMax) - staminaCost),
        march:{ type, path, step:0, dest:destKey, origin:freshCmd.tk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() }
      } : c));
    });
  }, [floaty, gearInventory, findPath, crewmatePlayerIds]);

  const recallMarch = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd?.march) return prev;
      const m = cmd.march;
      const reversePath = [...m.path.slice(0, m.step+1)].reverse();
      if (reversePath.length < 2) return prev.map(c => c.uid===uid ? { ...c, march:null } : c);
      return prev.map(c => c.uid===uid ? { ...c, march:{ type:"move", path:reversePath, step:0, dest:m.origin, origin:cmd.tk, stepMs:m.stepMs, startedAt:Date.now(), lastStepTime:Date.now() } } : c);
    });
  }, []);

  // ── Recall popup state (for commanders stationed at a fort) ─────────────────
  const [recallPopup, setRecallPopup] = useState(null); // { uid, fortId, fortTileKey }

  const recallStationary = useCallback((uid) => {
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const cmd = cmdsRef.current.find(c => c.uid===uid && c.owner==="player");
    if (!cmd || cmd.march || cmd.tk===hqKey) return;

    // If stationed at a fort, show popup asking where to recall
    if (cmd.stationedFortId) {
      const fort = fortsRef.current.find(f => f.id === cmd.stationedFortId);
      if (fort) {
        setRecallPopup({ uid, fortId: fort.id, fortTileKey: fort.tileKey, cmdName: cmd.n });
        return;
      }
    }

    // Direct recall to HQ (stranded or at HQ already covered above)
    const _rSlots = normaliseTroopSlots(cmd);
    const stepMs = marchStepMs(effectiveMarchSpd(applyAllBonuses(cmd, gearInventory).spd||60, _rSlots.length ? _rSlots.map(sl=>sl.branch) : cmd.troopBranch));
    findPath(cmd.tk, hqKey).then(path => {
      if (!path || path.length < 2) return;
      setCmds(prev => prev.map(c => c.uid===uid ? { ...c,
        drawTimer:null, drawTile:null, drawOrigin:null,
        march:{ type:"recall", path, step:0, dest:hqKey, origin:cmd.tk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() }
      } : c));
    });
  }, [gearInventory, findPath, forts]);

  // Recall back to stationed fort
  const recallToFort = useCallback((uid, fortTileKey) => {
    const cmd = cmdsRef.current.find(c => c.uid===uid && c.owner==="player");
    if (!cmd || cmd.march) return;
    const _rSlots = normaliseTroopSlots(cmd);
    // Recall is faster than normal march — 0.65x stepMs
    const baseStepMs = marchStepMs(effectiveMarchSpd(applyAllBonuses(cmd, gearInventory).spd||60, _rSlots.length ? _rSlots.map(sl=>sl.branch) : cmd.troopBranch));
    const stepMs = Math.round(baseStepMs * 0.65);
    findPath(cmd.tk, fortTileKey).then(path => {
      if (!path || path.length < 2) return;
      setCmds(prev => prev.map(c => c.uid===uid ? { ...c,
        drawTimer:null, drawTile:null, drawOrigin:null,
        march:{ type:"recall", path, step:0, dest:fortTileKey, origin:cmd.tk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() }
      } : c));
    });
    setRecallPopup(null);
  }, [gearInventory, findPath]);

  // Recall to HQ (dismissing fort station)
  const recallToHQ = useCallback((uid) => {
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const cmd = cmdsRef.current.find(c => c.uid===uid && c.owner==="player");
    if (!cmd || cmd.march) return;
    unstationCmd(uid);
    const _rSlots = normaliseTroopSlots(cmd);
    const baseStepMs = marchStepMs(effectiveMarchSpd(applyAllBonuses(cmd, gearInventory).spd||60, _rSlots.length ? _rSlots.map(sl=>sl.branch) : cmd.troopBranch));
    const stepMs = Math.round(baseStepMs * 0.65);
    findPath(cmd.tk, hqKey).then(path => {
      if (!path || path.length < 2) return;
      setCmds(prev => prev.map(c => c.uid===uid ? { ...c,
        drawTimer:null, drawTile:null, drawOrigin:null,
        march:{ type:"recall", path, step:0, dest:hqKey, origin:cmd.tk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() }
      } : c));
    });
    setRecallPopup(null);
  }, [gearInventory, findPath, unstationCmd]);

  // Reposition — march to a fort and become stationed there
  const startReposition = useCallback((uid, fortTileKey, fortId) => {
    const cmd = cmdsRef.current.find(c => c.uid===uid && c.owner==="player");
    if (!cmd || cmd.march) return { ok: false, reason: "Commander is marching" };
    if (cmd.stranded) return { ok: false, reason: "Commander is stranded — recall to HQ first" };
    // Check fort capacity
    const fort = getFortAtTile(fortTileKey);
    if (!fort) return { ok: false, reason: "No fort at destination" };
    const levelDef = FORT_LEVELS[fort.level - 1];
    if (fort.stationedCmdUids.length >= levelDef.capacity && !fort.stationedCmdUids.includes(uid)) {
      return { ok: false, reason: `Fort full (max ${levelDef.capacity})` };
    }
    const _rSlots = normaliseTroopSlots(cmd);
    // Recall speed multiplier: 0.6x stepMs = faster
    const baseStepMs = marchStepMs(effectiveMarchSpd(applyAllBonuses(cmd, gearInventory).spd||60, _rSlots.length ? _rSlots.map(sl=>sl.branch) : cmd.troopBranch));
    const stepMs = baseStepMs; // reposition is normal speed
    findPath(cmd.tk, fortTileKey).then(path => {
      if (!path || path.length < 2) return;
      setCmds(prev => prev.map(c => c.uid===uid ? { ...c,
        drawTimer:null, drawTile:null, drawOrigin:null,
        march:{ type:"reposition", path, step:0, dest:fortTileKey, destFortId:fortId, origin:cmd.tk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() }
      } : c));
    });
    return { ok: true };
  }, [gearInventory, findPath, getFortAtTile]);

  const canAfford = useCallback(c => Object.entries(c).every(([k,v]) => (rss[k]||0)>=v), [rss]);

  // ── Tactics — rules in shared/utils/tactics.js ──
  const { onQuickGather, onRecon, onGather, onSweep, onLongMarch, onQuickMarch } = useTactics({
    dragonEggs, setDragonEggs, setRss, setCmds, setBattles, facKey,
    spawns, spawnWorkerRef, staminaMax, runBattle, setMysticOrbs, mysticOrbsCap,
    hasLongMarch, hasQuickMarch, setLongMarchReady, setQuickMarchReady, floaty,
  });

  // Bag items + Expedience — rules in shared/utils/consumables.js
  const { onExpedience, useConsumable } = useConsumables({
    setConsumables, setUpgQueue, setRssSpeedUps, setCmds, healQueue, dispatchArmy, floaty, playerHqRef,
  });

  // ── HQ Relocation — rules in shared/utils/relocation.js ──
  const { performRelocation, onForcedRelocate } = useRelocation({
    tiles, patchTile, facKey, aiHqKeys, playerHqKey, playerHqRef, setPlayerHqKey,
    cmds, consumables, setConsumables, lastRelocateAt, setLastRelocateAt, setWinner, floaty,
  });
  onForcedRelocateRef.current = onForcedRelocate;

  // queueTraining(branchKey, amount)
  // branchKey: "faction:branch:tier" e.g. "pirates:swashbucklers:0"
  // Multiple queues allowed (even same branchKey). Max slots = trainingQueueCount(training lvl).
  const queueTraining = useCallback((branchKey, amount) => {
    const [f, key] = String(branchKey).split(":");
    const branchDef = FACTION_TROOPS[f]?.branches.find(b => b.key === key);
    const costTimeDiscount = branchDef?.capstone ? capstoneTrainDiscount(bldgs[`b_${f}_${key}`]) : 0;
    dispatchArmy({type:"train",branchKey,amount,buildings:bldgs,unlocked:unlockedBranches,speedMult:trainingSpeedMult,costTimeDiscount,now:Date.now(),id:crypto.randomUUID()});
  }, [bldgs,unlockedBranches,trainingSpeedMult,dispatchArmy]);
  const queueHealing = useCallback(amount => {
    dispatchArmy({type:"heal",amount,buildings:bldgs,now:Date.now(),id:crypto.randomUUID()});
  }, [bldgs,dispatchArmy]);

  // Troop slot actions — rules in shared/utils/troopSlots.js
  const { setTroopSlot, setArmySlots, assignTroops, returnTroops } = useTroopSlots({
    setCmds, troopCounts, setTroopCounts, commandCenterLvl: bldgs.commandcenter,
  });

  const upgrade = useCallback(type => {
    const lvl = bldgs[type]||0;
    const avail = maxAvailLevel(type, bldgs.hq||1);
    if (lvl >= avail || upgQueue[type]) return;
    const c = upgCost(type, lvl);
    if (!canAfford(c)) return;
    const dur = upgDuration(type, lvl+1);
    setRss(p => Object.fromEntries(Object.entries(p).map(([k,v]) => [k, v-(c[k]||0)])));
    setUpgQueue(q => ({ ...q, [type]:{ endsAt:Date.now()+dur, startedAt:Date.now(), newLvl:lvl+1, dur } }));
  }, [bldgs, canAfford, upgQueue]);

  // ── Tile click ──
  const onTileClick = useCallback((k, e) => {
    perfLog(`tap:${k}`);
    if (e?.stopPropagation) e.stopPropagation();
    let tile = tilesRef.current[k];
    if (!tile) return;

    // ── keepPart fix: redirect to primary keep tile ──────────────────────────
    // Clicking any tile in the keep footprint should open the keep itself,
    // not the keepPart tile which has no defCmd/keepName and causes a black screen.
    if ((tile.isKeepPart || tile.isCampPart) && tile.keepPrimaryKey) {
      const primaryTile = tilesRef.current[tile.keepPrimaryKey];
      if (primaryTile) { k = tile.keepPrimaryKey; tile = primaryTile; }
    }

    const mode = modeRef.current;
    const mvCmd = mvCmdRef.current;

    // ── Double-tap the selected tile to close its popup ──────────────────────
    const nowMs = Date.now();
    const doubleTap = mode === "view" && selKeyRef.current === k && isDoubleTap(lastTapRef.current, k, nowMs);
    lastTapRef.current = doubleTap ? { k: null, t: 0 } : { k, t: nowMs };
    if (doubleTap) {
      setSelKey(null); setPopupPos(null); setTileScreenX(null); setTileScreenY(null);
      setPopupMode("main"); setEditArmyCmd(null);
      return;
    }

    if (mode==="selectMarchDest" && mvCmd) {
      if (k===mvCmd.tk) { setMode("view"); setMvCmd(null); return; }
      const destOwnerPid = tile?.ownerPlayerId
        || (tile?.isHQPart && tile?.hqPrimaryKey ? tilesRef.current[tile.hqPrimaryKey]?.ownerPlayerId : null)
        || aiPlayerIdMapRef.current.get(k);
      const isCrewDest = crewmatePlayerIds.has(destOwnerPid);
      if (tile.owner!=="player" && !isCrewDest) { floaty("⚠ Can only move to owned or crew tiles", "#cc8030", k); return; }
      startMarch(mvCmd, k);
      return;
    }

    // Issue 2 fix: ANY part of the player HQ (isHQ or isHQPart) opens the HQ directly
    const isPlayerHqTile = (tile.isHQ || tile.isHQPart) && tile.owner === "player";
    const isPlayerHqPartTile = tile.isHQPart && (() => {
      // isHQPart tiles store hqPrimaryKey — check if that primary tile is player-owned
      const primaryKey = tile.hqPrimaryKey;
      if (!primaryKey) return false;
      const primaryTile = tilesRef.current[primaryKey];
      return primaryTile?.owner === "player";
    })();

    if (isPlayerHqTile || isPlayerHqPartTile) {
      // Show HQ popup with Enter / Summon options
      const zoom = zoomRef.current;
      const elev = 14;
      const { cx, cy } = isoXY(tile.c, tile.r);
      const screenX = cx * zoom + panRef.current.x;
      const screenY = (cy - elev) * zoom + panRef.current.y + 38;
      const POPUP_W = 130, POPUP_H = 120;
      const px = Math.min(window.innerWidth - POPUP_W - 8, Math.max(8, screenX - POPUP_W / 2));
      const py = Math.max(46, screenY - POPUP_H - 16);
      setTimeout(() => {
        unstable_batchedUpdates(() => {
          setSelKey(k); setPopupPos({ x: px, y: py });
          setTileScreenX(screenX); setTileScreenY(screenY);
          setPopupMode("hqEnter");
          setMode("view"); setAtkKey(null); setPick(null); setMvCmd(null); setReinCmd(null);
        });
      }, 0);
      return;
    }

    const zoom = zoomRef.current;
    const elev = (tile.isHQ || tile.isKeep) ? 14 : tile.isWin ? 10 : 4;
    const { cx, cy } = isoXY(tile.c, tile.r);
    const screenX = cx * zoom + panRef.current.x;
    const screenY = (cy - elev) * zoom + panRef.current.y + 38;
    const POPUP_W = 180, POPUP_H = 160;
    const px = Math.min(window.innerWidth-POPUP_W-8, Math.max(8, screenX-POPUP_W/2));
    const py = Math.max(46, screenY-POPUP_H-16);

    // Defer React state update with setTimeout(0) rather than rAF.
    // rAF joins the render queue — when the rAF queue is busy after a pan gesture,
    // this caused 5-8 second tap delays (visible as "tap:574,627 +7838ms" in PERF).
    // setTimeout(0) yields to the event loop without queuing behind pending frames.
    perfLog(`rAF:schedule`);
    setTimeout(() => {
      perfLog(`rAF:fire`);
      unstable_batchedUpdates(() => {
        setSelKey(k); setPopupPos({ x:px, y:py });
        setTileScreenX(screenX); setTileScreenY(screenY);
        setPopupMode("main"); setEditArmyCmd(null);
        setMode("view"); setAtkKey(null); setPick(null); setMvCmd(null); setReinCmd(null);
      });
      perfLog(`setState:done`);
    }, 0);
  }, [floaty, startMarch, setHqOpen, setHqTab]);

  // ── Screen routing ──
  if (screen==="title")   return <TitleScreen setScreen={setScreen} />;
  if (screen==="faction") return (
    <FactionScreen
      setScreen={setScreen} setFacKey={setFacKey} setFacName={setFacName}
      setPlayerName={setFacName}
      setAiFaction={setAiFaction} setAiRss={setAiRss} setAiBldgs={setAiBldgs}
      setAiBarracksPool={setAiBarracksPool} aiLastActionRef={aiLastActionRef}
      setCmds={setCmds} setColl={setColl} setTiles={setTiles}
      setTroopCounts={setTroopCounts} setUnlockedBranches={setUnlockedBranches}
      setQuarterLevels={setQuarterLevels}
    />
  );
  if (screen==="gacha")   return (
    <GachaScreen
      screen={screen} tiles={tiles} gems={gems} pull={pull}
      pullResults={pullResults} pullKey={pullKey} coll={coll}
      gearInventory={gearInventory} setGearInventory={setGearInventory}
      respectSchematics={respectSchematics}
      cmds={cmds} setCmds={setCmds}
      onSchematicUsed={(id) => setRespectSchematics(prev => prev.filter(s => s.instanceId !== id))}
      pityCounters={pityCounters}
      isFreeAvailable={isFreeAvailable}
      isHalfAvailable={isHalfAvailable}
      medallionCount={(consumables ?? []).find(c => c.typeId === "medallion")?.quantity ?? 0}
      onUseMedallion={() => {
        // Consume 1 medallion then pull
        setConsumables(prev => consumeOne(prev, "medallion"));
        pull(1); // free pull — pull() handles rewards, medallion bypasses gem cost by calling directly
      }}
      playerAlignment={playerAlignment} setScreen={setScreen}
      onOpenCommander={(uid, heroId) => {
        // uid: owned commander uid (or null for unowned), heroId: HDEFS id
        if (uid) setCmdScreenUid(uid);
        else {
          // For unowned stubs: set uid to the stub uid format
          setCmdScreenUid(`stub_${heroId}`);
        }
        setCmdScreenOpen(true);
        setScreen("game");
      }}
    />
  );

  // ── Game screen — layout lives in GameView.jsx ──
  return <GameView {...{
    ZOOM_LEVELS, abandonFort, startFortRemoval, cancelFortRemoval, aiFaction, aiHqKeys, aiHqKeysRef, aiLastActionRef,
    aiPlayerIdMapRef, assignTroops, atkKey, autoHeal, bLog, barracksPool, battles, bldgs,
    buildFortWithCost, canAfford, canAtk, cancelGuard, centerOnHQ, cmdPathLengths,
    chatChannels, chatKnownPlayerIds, chatOpen, chatProfanityFilterEnabled,
    cmdScreenOpen, cmdScreenUid, cmds, cmdsAdjToSel, cmdsForMove, cmdsOnSel, consumables,
    crewOpen, crewmatePlayerIds, crews, crossingsState, deletingSecsLeft, deletingTiles,
    demolishFort, doVoidTap, dragonEggs, dragonEggsCap, editArmyCmd, eligibleSpawnKeysRef,
    facKey, facName, floats, forts, gearInventory, gearScreenOpen, gems, getFortAtTile,
    guardedTiles, handleZoomChange, hasCmdTraining, hasGather, hasLongMarch, hasQuickGather,
    hasQuickMarch, hasRecon, healQueue, hqOpen, hqTab, keepMeta, lastRelocateAt, lastVoidTap,
    leaderboardOpen, loadLabel, loadPct, longMarchReady, mapReady, mapRendererRef,
    marchingToSel, minimapRedrawRef, mode, mvCmd, mysticOrbs, mysticOrbsCap, nowTick,
    onEnterHQ, onExpedience, onGather, onLongMarch, onPanChange, onQuickGather, onQuickMarch,
    getChatMessages, onRecon, onSweep, onTileClick, pKeys, panRef, panelOpen, pendingCrewId, performRelocation,
    pickCmd, playerAlignment, playerCrewId, playerEntries, playerHqKey, popupMode, powerPerHr,
    powerPool, protectedTiles, quarterLevels, queueHealing, queueTraining, quickMarchReady,
    recallMarch, recallPopup, recallStationary, recallToFort, recallToHQ, reinCmd, reinMarches,
    reinMarchesRef, respectSchematics, returnTroops, rss, searchOpen, selKey, selTile,
    sendChatMessage, serverConnected, setAiBarracksPool, setAiBldgs, setAiHqKeys, setAiRss, setArmySlots,
    setAtkKey, setAutoHeal, setBLog, setBarracks, setBattles, setBldgs, setChatOpen,
    setChatProfanityFilterEnabled, setCmdScreenOpen,
    setCmdScreenUid, setCmds, setCrewOpen, setCrews, setDeletingSecsLeft, setDeletingTiles,
    startChatDm, startChatGroup,
    setEditArmyCmd, setGearInventory, setGearScreenOpen, setGems, setHealQueue, setHqOpen,
    setHqTab, setLeaderboardOpen, setMode, setMvCmd, setMysticOrbs, setPendingCrewId, setPick,
    setPlayerCrewId, setPlayerHqKey, setPopupMode, setPopupPos, setPowerPool, setQuarterLevels,
    setRecallPopup, setReinCmd, setReinMarches, setRespectSchematics, setRss, setScreen,
    setSearchOpen, setSelKey, setShowBattleLog, setShowPerf, setSliderVals, setTiles,
    setTomesLevel, setTomesNodeLevels, setTomesOpen, setTomesUnspentPoints, setTrainSlider,
    setTrainingQueues, setTroopCounts, setTroopSkillLevels, setTroopSlot, setUnlockedBranches,
    setUnseenBattles, setUpgQueue, setWinner, setWorldMapOpen, setWorldMapPrompt, setWounded,
    setWoundedQueue, showBattleLog, showPerf, sliderVals, spawnWorkerRef, spawns, staminaMax,
    startGuard, startMarch, startReinforcement, startReposition, teleportTo, tileCap,
    tileScreenX, tileScreenY, tiles, tomesLevel, tomesOpen, tomesUnspentPoints, trainSlider,
    trainingQueues, trainingSpeedMult, trainingXpMult, troopCounts, troopSkillLevels,
    unlockedBranches, unseenBattles, upgQueue, upgrade, upgradeFort, useConsumable,
    voidTapCooldown, voidTapLvl, voidTapReady, winner, worldMapOpen, worldMapPrompt,
    woundedQueue, woundedTroops, zoomRef, zoomState,
  }} />;
}
