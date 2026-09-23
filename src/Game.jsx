import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { unstable_batchedUpdates } from "react-dom";

// Constants
import { getFactionAlignment } from "../shared/constants/factions.js";
import { factionBonusValue } from "../shared/constants/factionBonuses.js";
import { canCommanderAct, isWounded, GUARD_STAMINA_COST, GUARD_COOLDOWN_MS, guardCooldownLeft, guardCoverageKeys, fmtMsShort } from "../shared/utils/commanderStatus.js";
import {
  crewStructureTileKeys, isStructureBuilt, completeStructureBuild,
  canStartWellBuild, createWell, removeWell, canStationAtWell,
  canStartOutpostBuild, createOutpost, canSetOutpostUnits, setOutpostUnits,
  neutralTrainingSources, dayKey, outpostCommandsLeft,
} from "../shared/utils/crewStructures.js";
import { HQP, POWER_DEFS, hqSiegeValue, FORT_LEVELS } from "../shared/constants/map.js";
import { FACTION_TROOPS } from "../shared/constants/troops.js";
import { STARTING_TROOPS, upgCost, upgDuration, maxAvailLevel, tierFromBranchLevel, upgCostQuarter, upgDurationQuarter, upgCostBranch, upgDurationBranch } from "../shared/constants/buildings.js";
import { isoXY } from "../shared/constants/geometry.js";

// Utils
import { adj, adj8, effectiveMarchSpd, marchStepMs, normaliseTroopSlots } from "../shared/utils/pathfinding.js";
import { applyGearToCmd } from "../shared/utils/gearStats.js";
import { capstoneTrainDiscount, trainingQuote } from "../shared/utils/training.js";

// Hooks
import { useResources } from "./hooks/useResources.js";
import { useAI } from "./hooks/useAI.js";
import { useArmyEconomy } from "./hooks/useArmyEconomy.js";
import { useTraining } from "./hooks/useTraining.js";
import { useMarch } from "./hooks/useMarch.js";
import { useFortressSiege } from "./hooks/useFortressSiege.js";
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
import {
  FORTRESS_COST, WELL_COST, OUTPOST_COST, OUTPOST_DAILY_COMMAND_LIMIT, crewOutpostHireTimeBonus,
  crewResourceRateBonus, crewMarchSpeedBonus, crewHealSpeedBonus,
  crewXpBonus, crewGatherYieldBonus, crewPveDmgBonus, crewSpawnDmgBonus,
  crewTrainTimeBonus, crewTrainCostBonus,
} from "../shared/constants/crew.js";
import {
  canStartFortressBuild, createFortress, completeFortressBuild,
  isFortressBuilt, canDemolishFortress, removeFortress,
} from "../shared/utils/crewFortress.js";
import { diplomacyPlayerIdSets } from "../shared/utils/crewRules.js";
import { useChat } from "./hooks/useChat.js";
import { useRelations } from "./hooks/useRelations.js";
import { aiDisplayName } from "../shared/utils/aiChatter.js";
import { NYRO_ID } from "../shared/constants/nyro.js";
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
// TEST MODE (src/testmode/) — remove these 2 imports + the "TEST MODE" blocks below to strip it.
import { useTestMode } from "./testmode/useTestMode.js";
import { TEST_MODE_AVAILABLE } from "./testmode/adminRules.js";
import { TestCampaignMenu } from "./testmode/TestUi.jsx";


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
  // World seed — the map generator is deterministic for a given seed, so a
  // save only has to store the tiles that changed (see src/testmode/).
  const mapSeedRef = useRef(null);
  // Stable session ID — generated once per browser session
  const [sessionId] = useState(() => `fg-${Math.random().toString(36).slice(2,10)}`);
  const [loadPct,  setLoadPct]  = useState(0);
  const [loadLabel,setLoadLabel]= useState("Generating world...");
  const [playerHqKey, setPlayerHqKey] = useState(null);
  const {rss,setRss,troopCounts,setTroopCounts,trainingQueues,setTrainingQueues,healQueue,setHealQueue,woundedTroops,setWounded,addWounded,autoHeal,setAutoHeal,contractDaily,woundedByBranch,dispatch:dispatchArmy} = useArmyEconomy();
  const [gems,   setGems]    = useState(20000);
  const [crewOpen,      setCrewOpen]      = useState(false);
  const [chatOpen,      setChatOpen]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [playerCrewId,  setPlayerCrewId]  = useState(null);
  const [pendingCrewId, setPendingCrewId] = useState(null);
  const [crews,         setCrews]         = useState([]);
  // War territory control: { [regionKey]: factionKey } — which faction's
  // crew last captured that region's Keep. See shared/utils/warRules.js.
  const [regionOwners,  setRegionOwners]  = useState({});

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
  const [aiBarracksPool, setAiBarracksPool] = useState(STARTING_TROOPS);
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
  const aiPoolRef  = useRef(STARTING_TROOPS);

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
    const cur = aiPoolMapRef.current.get(fk) ?? STARTING_TROOPS;
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
  // Total of all values must not exceed barracksCommandCapacity(bldgs.barracks), counted in commands (shared/utils/barracks.js)

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

  // ── Crew Level perks (Woodworking/Stone Masonry/Gas Collector/Food Farmer,
  // Resource/Treasure Trove, Faster Together, Healer, Scholars, Gatherers,
  // PvE/Spawn damage, Efficient Trainer, Cost Effective) — real bonuses from
  // shared/constants/crew.js, applied to the player's own income/march
  // speed/etc the same way the faction bonuses are (real crew-wide sharing
  // lands once a server exists, per the roadmap). Declared before the
  // Tome-derived block below since several of those multipliers fold a crew
  // bonus in alongside the existing faction one.
  const myCrew = useMemo(() => crews.find(c => c.id === playerCrewId) || null, [crews, playerCrewId]);
  const crewLevel = myCrew?.level || 1;
  const crewRssBonus = useMemo(() => crewResourceRateBonus(crewLevel), [crewLevel]);
  const crewMarchBonus = crewMarchSpeedBonus(crewLevel);
  const crewHealBonus = crewHealSpeedBonus(crewLevel);
  const crewXpMult = crewXpBonus(crewLevel);
  const crewGatherBonus = crewGatherYieldBonus(crewLevel);
  const crewPveDmgMult = crewPveDmgBonus(crewLevel);
  const crewSpawnDmgMult = crewSpawnDmgBonus(crewLevel);
  const crewTrainTimeMult = crewTrainTimeBonus(crewLevel);
  const crewTrainCostMult = crewTrainCostBonus(crewLevel);

  // Crew Well / Contract Outpost derived state (shared/utils/crewStructures.js).
  const crewStructureKeys = useMemo(() => crewStructureTileKeys(crews), [crews]);
  const myWellTileKeys = useMemo(() => new Set((myCrew?.wells || []).map(w => w.tileKey)), [myCrew]);
  // Every structure tile of the player's own crew — your commanders can MOVE
  // onto these (stand there without being stationed), and you can't siege them.
  const myCrewStructureKeys = useMemo(() => crewStructureTileKeys(myCrew ? [myCrew] : []), [myCrew]);
  const outpostHireBonus = crewOutpostHireTimeBonus(crewLevel);

  // ── Tome-derived constants ────────────────────────────────────────────────
  const tomeNodeLv = (id) => tomesNodeLevels[id] ?? 0;
  const tileCap        = 60 + tomeNodeLv("tl") * 15;          // Adventurer's Trek
  tileCapRef.current   = tileCap; // keep ref in sync for patchTile callback
  const dragonEggsCap  = 20 + tomeNodeLv("tr") + factionBonusValue(facKey, "eggCap"); // Unlimited Eggs (max 30) + faction bonus
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
  // Training Specialist (Tomes) stacks with the crew "Scholars" XP bonus.
  const trainingXpMult = (1  + tomeNodeLv("bl_b1") * 0.02) * (1 + crewXpMult);
  // PVE Power — stubbed until mobs are implemented
  // const pvePowerBonus = tomeNodeLv("bl_b2") * 0.03;  // TODO: wire when mobs built
  // Col 4 — Command
  const fortMax            = 10 + tomeNodeLv("br");                  // Numerous Forts
  const hasLongMarch       = tomeNodeLv("br_t")   >= 1;             // Long March tactic
  // Marching Efficiency (Tomes) stacks with the faction "+N% March Speed" bonus, if this faction has it.
  const marchSpeedMult     = (1 - tomeNodeLv("br_t1") * 0.01) * (1 - factionBonusValue(facKey, "marchSpeed")); // reduces stepMs
  const hasQuickMarch      = tomeNodeLv("br_m")   >= 1;             // Quick March tactic
  // Troop Training (Tomes) stacks with the faction "-N% Training Time" bonus
  // and the crew "Efficient Trainer" bonus.
  const trainingSpeedMult  = (1  + tomeNodeLv("br_b")  * 0.02) * (1 + factionBonusValue(facKey, "trainTime")) * (1 + crewTrainTimeMult);
  // Faction "-N% Training Cost" bonus stacks with the crew "Cost Effective" bonus.
  const trainingCostMult   = (1  - factionBonusValue(facKey, "trainCost")) * (1 - crewTrainCostMult);
  // Faction "-N% Healing Time" bonus stacks with the crew "Healer" bonus, both as a rate multiplier.
  const healSpeedMult      = 1  / ((1 - factionBonusValue(facKey, "healSpeed")) * (1 - crewHealBonus));
  const facTileYield       = factionBonusValue(facKey, "tileYield");             // faction "+N% Resource Production" bonus (owned tile income)
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
  useResources({ screen, tilesRef, setRss, bldgs, fortsRef: _fortsRef, rssBonus, facTileYield, crewRssBonus });

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
    setAiFaction, setPlayerCmds, initPathfinding, perfLog, mapSeedRef,
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
    tilesMapRef, trainingXpMult, staminaMaxRef, floaty, crewGatherBonus, myWellTileKeys,
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
    if (!myCrew) return new Set();
    const members = new Set(myCrew.members || []);
    const ids = new Set();
    for (const [hqKey, playerId] of aiPlayerIdMapRef.current) {
      // Only match full AI player IDs (e.g. "ai_pirates_3"), not faction keys.
      // Faction key matching ("pirates") would turn ALL faction HQs blue instantly.
      if (members.has(playerId)) ids.add(playerId);
    }

    return ids;
  }, [playerCrewId, crews, myCrew]);

  // Ally/enemy tile coloring (Diplomacy) — resolves myCrew.diplomacy into
  // playerId Sets the same shape as crewmatePlayerIds, so MapRenderer's
  // ownerTint can check them the same way. Pure logic lives in
  // shared/utils/crewRules.js (diplomacyPlayerIdSets) — this just memoizes it.
  const diplomacyPlayerIds = useMemo(
    () => diplomacyPlayerIdSets(myCrew, crews),
    [myCrew, crews]
  );

  // ── AI crew ticker — rules in shared/utils/aiCrews.js ──
  useAiCrews({ screen, mapReady, setCrews, aiPlayerIdMapRef, aiFoundersRef, aiGemsRef });

  // ── Chat — World/Faction/Crew/DM/Group; rules in shared/utils/chatRules.js
  // + shared/utils/aiChatter.js. Local-only (see useChat.js), not yet persisted.
  const chatKnownPlayerIds = useMemo(() => [...aiPlayerIdMapRef.current.values()], [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nyro (shared/constants/nyro.js) isn't one of the ambient per-faction AI
  // ids and must stay out of useChat's aiPlayerIds (which drives the ambient
  // multi-AI chatter/World-chat eligibility, with no shape filter) — but he
  // still needs to show up wherever the game surfaces "known players" to add
  // as a friend or invite to a group, hence this second list.
  const chatKnownPlayerIdsWithNyro = useMemo(() => [NYRO_ID, ...chatKnownPlayerIds], [chatKnownPlayerIds]);
  const {
    channels: chatChannels, sendMessage: sendChatMessage, startDm: startChatDm,
    startGroup: startChatGroup, leaveGroup: leaveChatGroup, getMessages: getChatMessages,
    getActiveChannelMessages: getChatActiveChannelMessages,
    addGroupSubchannel, removeGroupSubchannel, moveGroupSubchannel,
    profanityFilterEnabled: chatProfanityFilterEnabled,
    setProfanityFilterEnabled: setChatProfanityFilterEnabled,
    normalizedCrews: chatNormalizedCrews,
    activeDisplay: chatActiveDisplay, setActiveDisplay: setChatActiveDisplay,
    activeChannelId: chatActiveChannelId, setActiveChannelId: setChatActiveChannelId,
    activeSubId: chatActiveSubId, setActiveSubId: setChatActiveSubId,
    mutedChannelIds: chatMutedChannelIds, toggleMute: chatToggleMute,
    reactions: chatReactions, toggleReaction: chatToggleReaction,
    typingByChannel: chatTypingByChannel,
    unreadCount: chatUnreadCount, markRead: chatMarkRead,
    unreadLeafIds: chatUnreadLeafIds, unreadTopIds: chatUnreadTopIds,
  } = useChat({
    screen, playerId: "player", playerName: facName, playerFacKey: facKey,
    crews, aiPlayerIds: chatKnownPlayerIds,
  });

  // Last couple of messages in whichever chat was last open, for the
  // closed-state mini preview (ChatPreview.jsx) — recomputed whenever chat
  // messages (or the active channel) change.
  const chatRecentMessages = getChatActiveChannelMessages(2);

  // ── Relations — friends/blacklist, reached from ChatPanel's Direct display;
  // rules in shared/utils/relationsRules.js. Local-only (see useRelations.js).
  const relationsNameOf = useCallback(
    (id) => (id === "player" ? facName : aiDisplayName(id)),
    [facName]
  );
  const {
    friends: relFriends, blocked: relBlocked, incoming: relIncoming, outgoing: relOutgoing,
    addFriend: relAddFriend, declineIncoming: relDeclineIncoming, cancelOutgoing: relCancelOutgoing,
    unfriend: relUnfriend, blockPlayer: relBlockPlayer, unblockPlayer: relUnblockPlayer,
    search: relSearch,
  } = useRelations({ playerId: "player", knownPlayerIds: chatKnownPlayerIdsWithNyro, nameOf: relationsNameOf });

  // ── Server sync — authoritative tile state ──
  const { emitTileCapture, emitTileSiege, emitFortUpdate, connected: serverConnected } = useServerSync({
    screen,
    tiles,
    mapReady,
    patchTile,
    sessionId,
  });
  const { tickAiRss, tickAiMarch, tickAiEcon } = useAI({
    aiFactionKeys,
    cmdsRef, tilesRef,
    aiRssMapRef, aiBldgsMapRef, aiPoolMapRef, aiTileKeysMapRef,
    setCmds: setAiCmds,
    setAiRssMap, setAiBldgsMap, setAiPoolMap,
    findPathBatch,
  });

  useTraining({screen,bldgs,dispatchArmy,healSpeedMult});

  useUpgrades({ screen, setUpgQueue, setBldgs, setBarracks, setQuarterLevels });

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
    const fort = forts.find(f => f.id === fortId);
    destroyFort(fortId);
    if (fort?.tileKey) floaty("🔨 Fort demolished", "#c8a060", fort.tileKey); // floaty needs a tile key
  }, [destroyFort, forts, floaty]);

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
    if (fort?.tileKey) floaty("🚪 Fort abandoned", "#8a8a8a", fort.tileKey);
  }, [destroyFort, forts, patchTile, floaty]);

  // Fires demolish/abandon when a fort's stored deadline passes.
  useFortRemovals({ screen, forts, demolishFort, abandonFort });

  // ── TEST MODE — admin tools + local saves (src/testmode/useTestMode.js) ──
  const applyHqMoveRef = useRef(null); // set after useRelocation below
  const { admin, noAdjacency: testNoAdj, startNewTestCampaign, loadFrom: testLoadFrom, listSaves: testListSaves } = useTestMode({
    screen, setScreen, mapReady, facKey, facName, setFacKey, setFacName, mapSeedRef, staminaMax, dragonEggsCap, mysticOrbsCap,
    tilesMapRef, setTileVersion, mapRendererRef, pKeysRef, setPKeys, powerPerHrRef, setPowerPerHr, aiTileKeysRef, defeatedTilesRef,
    aiHqKeysRef, aiRssMapRef, aiBldgsMapRef, aiPoolMapRef, aiTileKeysMapRef, aiPlayerIdMapRef, spawnedAiHqsRef, aiGemsRef, aiFoundersRef,
    cmdsRef, setCmds, setColl, setCrews, playerHqKey, setPlayerHqKey, playerHqRef, teleportTo, floaty,
    setRss, setUpgQueue, dispatchArmy, forts, loadForts, applyHqMoveRef,
    army: { rss, troopCounts, woundedByBranch, trainingQueues, healQueue, autoHeal, contractDaily },
    persist: {
      gems: [gems, setGems], crews: [crews, setCrews], playerCrewId: [playerCrewId, setPlayerCrewId],
      pendingCrewId: [pendingCrewId, setPendingCrewId], regionOwners: [regionOwners, setRegionOwners], coll: [coll, setColl],
      pityCounters: [pityCounters, setPityCounters], gearInventory: [gearInventory, setGearInventory],
      respectSchematics: [respectSchematics, setRespectSchematics], lastFreePull: [lastFreePull, setLastFreePull],
      dailyHalfUsed: [dailyHalfUsed, setDailyHalfUsed], bldgs: [bldgs, setBldgs], upgQueue: [upgQueue, setUpgQueue],
      aiBldgs: [aiBldgs, setAiBldgs], aiBarracksPool: [aiBarracksPool, setAiBarracksPool], aiHqKeys: [aiHqKeys, setAiHqKeys],
      quarterLevels: [quarterLevels, setQuarterLevels], troopSkillLevels: [troopSkillLevels, setTroopSkillLevels],
      mysticOrbs: [mysticOrbs, setMysticOrbs], lastVoidTap: [lastVoidTap, setLastVoidTap], tomesLevel: [tomesLevel, setTomesLevel],
      powerPool: [powerPool, setPowerPool], tomesUnspentPoints: [tomesUnspentPoints, setTomesUnspentPoints],
      tomesNodeLevels: [tomesNodeLevels, setTomesNodeLevels], dragonEggs: [dragonEggs, setDragonEggs],
      protectedTiles: [protectedTiles, setProtectedTiles], bLog: [bLog, setBLog], battles: [battles, setBattles],
      unseenBattles: [unseenBattles, setUnseenBattles], reinMarches: [reinMarches, setReinMarches],
      deletingTiles: [deletingTiles, setDeletingTiles], consumables: [consumables, setConsumables],
      lastRelocateAt: [lastRelocateAt, setLastRelocateAt], rssSpeedUps: [rssSpeedUps, setRssSpeedUps],
      longMarchReady: [longMarchReady, setLongMarchReady], quickMarchReady: [quickMarchReady, setQuickMarchReady],
    },
  });

  const fortsRef = useRef(forts);
  useEffect(() => { fortsRef.current = forts; _fortsRef.current = forts; }, [forts]);
  _fortsRef.current = forts; // sync immediately too
  fortsRef.current = forts;

  // Recall that also unstations from fort
  const recallFromFort = useCallback((cmdUid, fortId) => {
    unstationCmd(cmdUid);
    recallStationary(cmdUid);
  }, [unstationCmd]);

  // Wounded commanders (lost a battle < 10 min ago) can't take any player-
  // issued action — shared/utils/commanderStatus.js. Returns true if blocked.
  const blockIfWounded = (cmd) => {
    const act = canCommanderAct(cmd);
    if (act.ok) return false;
    floaty(`🩸 ${cmd?.n || "Commander"}: ${act.reason}`, "#cc6060", cmd?.tk);
    return true;
  };

  // ── Guard (Rise to War style) — rules in shared/utils/commanderStatus.js ──
  // A commander standing on a tile guards it and the 8 around it (owned/crew
  // tiles and your crew's Fortress/Well/Outpost tiles; not HQs or keeps). Any
  // attack landing on a guarded tile fights the most recently posted guard
  // first (useMarch.js AI-attack arrival). 10 stamina to start, free to
  // cancel, then a 3-minute cooldown before that commander can guard again.
  // Moving/marching ends the guard (no cooldown).
  const startGuard = useCallback((uid) => {
    const cmd = cmdsRef.current.find(c => c.uid===uid && c.owner==="player");
    if (!cmd || cmd.march) return;
    const act = canCommanderAct(cmd);
    if (!act.ok) { floaty(`⚠ ${act.reason}`, "#cc8030", cmd.tk); return; }
    const cd = guardCooldownLeft(cmd);
    if (cd > 0) { floaty(`⏳ Guard cooldown — ${fmtMsShort(cd)}`, "#cc8030", cmd.tk); return; }
    if ((cmd.stamina ?? staminaMax) < GUARD_STAMINA_COST) { floaty("⚡ Not enough stamina!", "#cc8030", cmd.tk); return; }
    setCmds(p => p.map(c => c.uid===uid ? { ...c, isGuarding:true, guardedAt:Date.now(), stamina:Math.max(0,(c.stamina??staminaMax)-GUARD_STAMINA_COST) } : c));
    floaty("🛡 Guarding", "#80a0ff", cmd.tk);
  }, [floaty, staminaMax]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelGuard = useCallback((uid) => {
    setCmds(p => p.map(c => c.uid===uid ? { ...c, isGuarding:false, guardedAt:null, guardCooldownUntil: Date.now() + GUARD_COOLDOWN_MS } : c));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // tileKey → guarding commanders, most recently posted first.
  const guardedTiles = useMemo(() => {
    const guarded = new Map();
    for (const cmd of playerCmds) {
      if (!cmd.isGuarding || cmd.march) continue;
      for (const key of guardCoverageKeys(cmd.tk, tiles, { crewmatePlayerIds, structureKeys: myCrewStructureKeys })) {
        if (!guarded.has(key)) guarded.set(key, []);
        guarded.get(key).push(cmd);
      }
    }
    for (const [, arr] of guarded) arr.sort((a,b) => (b.guardedAt??0) - (a.guardedAt??0));
    return guarded;
  }, [playerCmds, tiles, crewmatePlayerIds, myCrewStructureKeys]);

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
    crewPveDmgMult, crewSpawnDmgMult,
    forts,
    getAnchors,
    getFortAtTile,
    stationAtFort,
    unstationCmd,
    damageFort,
    emitFortUpdate,
    guardedTiles,
    onForcedRelocate: (...args) => onForcedRelocateRef.current?.(...args),
    crews, playerCrewId, regionOwners, setRegionOwners,
    ignoreAdjacency: testNoAdj, // TEST MODE
  });

  useFortressSiege({
    screen,
    cmds: cmdsRef.current,
    setCmds: setPlayerCmds,
    tiles, patchTile, floaty, gearInventory,
    combatXpMult, facKey, troopSkillLevels, runBattle,
    crews, setCrews, setBattles, setBLog, setUnseenBattles,
    playerHqKey: playerHqKey || playerHqRef.current || `${HQP.player.c},${HQP.player.r}`,
    playerCrewId, regionOwners,
    setAiCmds, aiHqKeys, crewmatePlayerIds,
  });

  // ── Crew Fortress: build-timer ticker — mirrors useForts.js's own
  // completesAt-polling interval, just for the crew-owned fortress list.
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      const now = Date.now();
      const due = x => x && x.buildEndsAt && now >= x.buildEndsAt;
      setCrews(prev => prev.map(crew => {
        if (!crew.fortresses?.some(due) && !crew.wells?.some(due) && !due(crew.outpost)) return crew;
        return { ...crew,
          fortresses: (crew.fortresses || []).map(f => due(f) ? completeFortressBuild(f) : f),
          wells: (crew.wells || []).map(w => due(w) ? completeStructureBuild(w) : w),
          outpost: due(crew.outpost) ? completeStructureBuild(crew.outpost) : crew.outpost,
        };
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [screen]);

  // Build a Crew Fortress on the selected (unclaimed p10+) tile.
  const buildCrewFortress = useCallback((tileKey, tile) => {
    if (!myCrew) return { ok: false, reason: "Not in a crew" };
    const check = crewStructureKeys.has(tileKey) ? { ok: false, reason: "Tile already has a structure" } : canStartFortressBuild(myCrew, facKey, tile, rss);
    if (!check.ok) { floaty(`⚠ ${check.reason}`, "#cc8030", tileKey); return check; }
    setRss(p => ({ ...p, wood: p.wood - FORTRESS_COST.wood, stone: p.stone - FORTRESS_COST.stone, gas: p.gas - FORTRESS_COST.gas }));
    const fortress = createFortress({ id: `ft_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, crewId: myCrew.id, tileKey, now: Date.now() });
    setCrews(prev => prev.map(c => c.id === myCrew.id ? { ...c, fortresses: [...(c.fortresses||[]), fortress] } : c));
    floaty("🏰 Fortress construction started!", "#f0c040", tileKey);
    return { ok: true };
  }, [myCrew, facKey, rss, floaty, crewStructureKeys]);

  // Demolish a fortress the player's crew owns on the given tile.
  const demolishCrewFortressHere = useCallback((fortress) => {
    if (!myCrew || !fortress) return;
    if (!canDemolishFortress(myCrew, facKey)) { floaty("⚠ Only the founder or an officer can demolish", "#cc8030", fortress.tileKey); return; }
    setCrews(prev => prev.map(c => c.id === myCrew.id ? removeFortress(c, fortress.id) : c));
    floaty("🏰 Fortress demolished", "#cc8030", fortress.tileKey);
  }, [myCrew, facKey, floaty]);

  // ── Crew Well + Contract Outpost (shared/utils/crewStructures.js) ─────────
  const spendCost = cost => setRss(p => { const n = { ...p }; for (const [k, v] of Object.entries(cost)) n[k] = (n[k] || 0) - v; return n; });
  const newStructId = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const updateMyCrew = fn => setCrews(prev => prev.map(c => c.id === myCrew?.id ? fn(c) : c));

  const buildCrewWell = useCallback((tileKey, tile) => {
    if (!myCrew) return { ok: false, reason: "Not in a crew" };
    const check = canStartWellBuild(myCrew, facKey, tile, tileKey, rss, crewStructureKeys);
    if (!check.ok) { floaty(`⚠ ${check.reason}`, "#cc8030", tileKey); return check; }
    spendCost(WELL_COST);
    const well = createWell({ id: newStructId("well"), crewId: myCrew.id, tileKey, now: Date.now() });
    updateMyCrew(c => ({ ...c, wells: [...(c.wells || []), well] }));
    floaty("💧 Well construction started!", "#60c0f0", tileKey);
    return { ok: true };
  }, [myCrew, facKey, rss, crewStructureKeys, floaty]); // eslint-disable-line react-hooks/exhaustive-deps

  const demolishCrewWell = useCallback((well) => {
    if (!myCrew || !well || myCrew.founder !== facKey) { floaty("⚠ Only the founder can demolish a Well", "#cc8030", well?.tileKey); return; }
    updateMyCrew(c => removeWell(c, well.id));
    // Anyone gathering there stops; stationed commanders stay put and can be recalled.
    setPlayerCmds(prev => prev.map(c => c.stationedWellId === well.id ? { ...c, stationedWellId: null, gathering: c.gatherTileKey === well.tileKey ? false : c.gathering } : c));
    floaty("💧 Well demolished", "#cc8030", well.tileKey);
  }, [myCrew, facKey, floaty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Station a commander at the crew Well — from anywhere (the Well has no range).
  const stationAtWell = useCallback((cmdUid, well) => {
    const cmd = cmdsRef.current?.find(c => c.uid === cmdUid);
    if (cmd && blockIfWounded(cmd)) return { ok: false, reason: "Commander is wounded" };
    const check = canStationAtWell(myCrew, well, facKey, cmd, Date.now());
    if (!check.ok) { floaty(`⚠ ${check.reason}`, "#cc8030", well?.tileKey); return check; }
    if (cmd.stationedFortId) unstationCmd(cmd.uid);
    setPlayerCmds(prev => prev.map(c => c.uid === cmdUid
      ? { ...c, tk: well.tileKey, stationedWellId: well.id, stationedFortId: null, stranded: false, drawTimer: null, drawTile: null, drawOrigin: null }
      : c));
    floaty(`📍 ${cmd.n} stationed at the Well`, "#60c0f0", well.tileKey);
    return { ok: true };
  }, [myCrew, facKey, floaty, unstationCmd]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildCrewOutpost = useCallback((tileKey, tile) => {
    if (!myCrew) return { ok: false, reason: "Not in a crew" };
    const check = canStartOutpostBuild(myCrew, facKey, tile, tileKey, rss, crewStructureKeys);
    if (!check.ok) { floaty(`⚠ ${check.reason}`, "#cc8030", tileKey); return check; }
    spendCost(OUTPOST_COST);
    const outpost = createOutpost({ id: newStructId("outpost"), crewId: myCrew.id, tileKey, now: Date.now() });
    updateMyCrew(c => ({ ...c, outpost }));
    floaty("📜 Contract Outpost construction started!", "#e0c080", tileKey);
    return { ok: true };
  }, [myCrew, facKey, rss, crewStructureKeys, floaty]); // eslint-disable-line react-hooks/exhaustive-deps

  const demolishCrewOutpost = useCallback(() => {
    if (!myCrew?.outpost || myCrew.founder !== facKey) { floaty("⚠ Only the founder can demolish the Outpost", "#cc8030", myCrew?.outpost?.tileKey); return; }
    const key = myCrew.outpost.tileKey;
    updateMyCrew(c => ({ ...c, outpost: null }));
    floaty("📜 Contract Outpost demolished", "#cc8030", key);
  }, [myCrew, facKey, floaty]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseOutpostUnits = useCallback((units) => {
    const check = canSetOutpostUnits(myCrew, facKey, units);
    if (!check.ok) { floaty(`⚠ ${check.reason}`, "#cc8030", myCrew?.outpost?.tileKey); return check; }
    updateMyCrew(c => setOutpostUnits(c, units));
    return { ok: true };
  }, [myCrew, facKey, floaty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch a march against a crew fortress — a distinct march.type
  // ("siegeFortress") so it's only ever picked up by useFortressSiege above,
  // never by useMarch.js's own generic "attack" arrival handler.
  const startFortressSiegeMarch = useCallback((cmd, destKey) => {
    if (!cmd || !destKey) return;
    if (myCrewStructureKeys.has(destKey)) { floaty("⚠ That's your own crew's structure", "#cc8030", destKey); return; }
    const freshCmd = cmdsRef.current?.find(c => c.uid === cmd.uid) ?? cmd;
    if (freshCmd.march) return;
    if (blockIfWounded(freshCmd)) return;
    const freshCmdTroops = normaliseTroopSlots(freshCmd).reduce((s,sl)=>s+(sl.troops||0),0) || freshCmd.troops || 0;
    if (!freshCmdTroops || freshCmdTroops < 1) { floaty("⚠ Assign troops first!", "#cc8030", freshCmd.tk); return; }
    const staminaCost = 20;
    const curStamina = freshCmd.stamina ?? staminaMax;
    if (curStamina < staminaCost) { floaty(`⚡ Not enough stamina! (${curStamina}/${staminaMax})`, "#cc8030", freshCmd.tk); return; }
    const boostedSpd = applyAllBonuses(freshCmd, gearInventory).spd || 60;
    const slots0 = normaliseTroopSlots(freshCmd);
    const baseStepMs = marchStepMs(effectiveMarchSpd(boostedSpd, slots0.length ? slots0.map(sl=>sl.branch) : freshCmd.troopBranch));
    const quickBonus = quickMarchReady ? 0.5 : 1;
    const stepMs = Math.max(50, Math.round(baseStepMs * marchSpeedMult * (1 - crewMarchBonus) * quickBonus));
    if (quickMarchReady) setQuickMarchReady(false);
    if (longMarchReady) setLongMarchReady(false);
    setMode("view"); setMvCmd(null); setSelKey(null); setPopupPos(null); setTileScreenX(null); setTileScreenY(null);
    findPath(freshCmd.tk, destKey).then(path => {
      if (!path || path.length < 2) { floaty("⚠ No path to target!", "#cc4040", freshCmd.tk); return; }
      setCmds(p => p.map(c => c.uid===freshCmd.uid ? {
        ...c,
        stamina: Math.max(0, (c.stamina ?? staminaMax) - staminaCost),
        march:{ type:"siegeFortress", path, step:0, dest:destKey, origin:freshCmd.tk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() }
      } : c));
    });
  }, [floaty, gearInventory, findPath, myCrewStructureKeys]); // eslint-disable-line react-hooks/exhaustive-deps

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
            // Any completed march means the commander left its Well (stationing
            // is set directly by stationAtWell, never by a march).
            // ...and a completed march also ends any Guard (moving isn't a cancel: no cooldown).
            const arrived = { ...cmd, tk: upd.tk, march: null, stationedWellId: null, isGuarding: false, guardedAt: null };
            // Reposition arrival — station at fort
            // (Only if the fort still exists and is built — otherwise it just stands there.)
            const destFort = cmd.march?.type === "reposition" && fortsRef.current.find(f => f.id === cmd.march.destFortId);
            if (destFort && !destFort.isBuilding) {
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
          // Merge: the worker's march snapshot only carries timing fields, so
          // replacing the march dropped dest/origin/destFortId after the first
          // step (reposition arrivals never stationed; recall lost its origin).
          // Ignore a late step from a march that's since been replaced (recall, finish…).
          if (cmd.march && upd.marchPatch?.startedAt != null && cmd.march.startedAt != null && cmd.march.startedAt !== upd.marchPatch.startedAt) return cmd;
          return { ...cmd, tk: upd.tk, march: cmd.march ? { ...cmd.march, ...upd.marchPatch } : upd.marchPatch };
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
    // adj8: attack adjacency includes diagonals, unlike movement/capture adj().
    const result = adj8(selTile.c, selTile.r).some(ak => {
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
    if (!(selAdjToPlayer || testNoAdj) || !selTile) return [];
    return playerCmds.filter(cmd =>
      cmd.owner === "player" && (normaliseTroopSlots(cmd).reduce((s,sl)=>s+(sl.troops||0),0) || cmd.troops || 0) > 0 && !cmd.march
      && !isWounded(cmd, nowTick) // wounded commanders can't lead marches
    );
  }, [selAdjToPlayer, selTile, playerCmds, nowTick, testNoAdj]);

  const cmdsForMove = useMemo(() =>
    playerCmds.filter(cmd =>
      cmd.owner === "player" && (normaliseTroopSlots(cmd).reduce((s,sl)=>s+(sl.troops||0),0) || cmd.troops || 0) > 0 && !cmd.march
      && !isWounded(cmd, nowTick)
    ),
  [playerCmds, nowTick]);

  const canAtk = !!(selTile && selTile.owner!=="player" && (selAdjToPlayer || longMarchReady || testNoAdj));

  // Batch-compute path lengths from each commander to atkKey via pathfinding worker
  useEffect(() => {
    if (!atkKey) { setCmdPathLengths(new Map()); return; }
    const cmds = (mode === "pickAttackCmd" || mode === "pickSiegeCmd") ? cmdsAdjToSel : cmdsForMove;
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
    if (blockIfWounded(freshCmd)) return;
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
    const isMyStructureTile = myCrewStructureKeys.has(destKey);
    const type = (destTile?.owner==="player" || isCrewTile || isMyStructureTile) ? "move" : "attack";
    if (type==="move" && destTile?.owner!=="player" && !isCrewTile && !isMyStructureTile) return;

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
    const stepMs = Math.max(50, Math.round(baseStepMs * marchSpeedMult * (1 - crewMarchBonus) * quickBonus));
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
  }, [floaty, gearInventory, findPath, crewmatePlayerIds, myCrewStructureKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const recallMarch = useCallback((uid) => {
    const live = cmdsRef.current.find(c => c.uid===uid);
    if (live && blockIfWounded(live)) return;
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
    if (cmd && blockIfWounded(cmd)) return;
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
    if (cmd && blockIfWounded(cmd)) return;
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
    if (cmd && blockIfWounded(cmd)) return;
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
    if (cmd && blockIfWounded(cmd)) return { ok: false, reason: "Commander is wounded" };
    if (!cmd || cmd.march) return { ok: false, reason: "Commander is marching" };
    if (cmd.stranded) return { ok: false, reason: "Commander is stranded — recall to HQ first" };
    // Check fort capacity
    const fort = getFortAtTile(fortTileKey);
    if (!fort) return { ok: false, reason: "No fort at destination" };
    if (fort.isBuilding) return { ok: false, reason: "Fort is still under construction" };
    // Moving to a fort needs an army; a commander with 0 troops can only be
    // recalled to the fort it's already stationed at (recallToFort).
    const troops = normaliseTroopSlots(cmd).reduce((s, sl) => s + (sl.troops || 0), 0) || cmd.troops || 0;
    if (troops < 1) { floaty("⚠ Needs at least 1 troop to move to a fort", "#cc8030", cmd.tk); return { ok: false, reason: "No troops" }; }
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
    gearInventory, troopSkillLevels, tilesMapRef, addWounded, crewPveDmgMult, crewSpawnDmgMult,
  });

  // Bag items + Expedience — rules in shared/utils/consumables.js
  const { onExpedience, useConsumable } = useConsumables({
    setConsumables, setUpgQueue, setRssSpeedUps, setCmds, healQueue, dispatchArmy, floaty, playerHqRef,
  });

  // ── HQ Relocation — rules in shared/utils/relocation.js ──
  const { performRelocation, onForcedRelocate, applyHqMove } = useRelocation({
    tiles, patchTile, facKey, aiHqKeys, playerHqKey, playerHqRef, setPlayerHqKey,
    cmds, consumables, setConsumables, lastRelocateAt, setLastRelocateAt, setWinner, floaty, setPlayerCmds,
  });
  onForcedRelocateRef.current = onForcedRelocate;
  applyHqMoveRef.current = applyHqMove; // TEST MODE admin relocate

  // queueTraining(branchKey, amount)
  // branchKey: "faction:branch:tier" e.g. "pirates:swashbucklers:0"
  // Multiple queues allowed (even same branchKey). Max slots = trainingQueueCount(training lvl).
  // Neutral/Ancient units this player can train right now, and the
  // unlockedBranches map extended with them (plus any already in the
  // barracks, so trained troops stay assignable if a camp is lost).
  const neutralSources = useMemo(
    () => neutralTrainingSources({ tiles, ownedKeys: pKeys, crew: myCrew, now: nowTick }),
    [tiles, pKeys, myCrew, nowTick]
  );
  const trainableUnlocked = useMemo(() => {
    const ub = { ...unlockedBranches };
    for (const bKey of [...Object.keys(neutralSources), ...Object.keys(troopCounts || {})]) {
      const [f, k] = bKey.split(":");
      if ((f === "neutrals" || f === "ancients") && k) ub[`${f}:${k}`] = 0;
    }
    return ub;
  }, [unlockedBranches, neutralSources, troopCounts]);
  const contractCommandsLeft = outpostCommandsLeft(contractDaily, nowTick);

  const queueTraining = useCallback((branchKey, amount) => {
    const [f, key] = String(branchKey).split(":");
    const branchDef = FACTION_TROOPS[f]?.branches.find(b => b.key === key);
    const costTimeDiscount = branchDef?.capstone ? capstoneTrainDiscount(bldgs[`b_${f}_${key}`]) : 0;
    const now = Date.now();
    let speedMult = trainingSpeedMult, dailyLimit = null;
    // Neutral / Ancient units: need an owned camp (no daily cap) or the crew
    // Contract Outpost (daily cap + Contract Board II hire-time bonus).
    const src = neutralSources[branchKey];
    if (f === "neutrals" || f === "ancients") {
      if (!src) { floaty("⚠ Own a camp or contract this unit at your crew's Outpost", "#cc8030", playerHqRef.current); return; }
      if (!src.camp) {
        const quote = trainingQuote(branchKey, amount, 1);
        const left = outpostCommandsLeft(contractDaily, now);
        if (quote && quote.commands > left) { floaty(`⚠ Outpost limit: ${left}/${OUTPOST_DAILY_COMMAND_LIMIT} commands left today`, "#cc8030", playerHqRef.current); return; }
        dailyLimit = { day: dayKey(now), limit: OUTPOST_DAILY_COMMAND_LIMIT };
        speedMult = trainingSpeedMult / Math.max(0.01, 1 - outpostHireBonus);
      }
    }
    dispatchArmy({type:"train",branchKey,amount,buildings:bldgs,unlocked:trainableUnlocked,speedMult,costTimeDiscount,costMult:trainingCostMult,dailyLimit,now,id:crypto.randomUUID()});
  }, [bldgs,trainableUnlocked,trainingSpeedMult,trainingCostMult,dispatchArmy,neutralSources,contractDaily,outpostHireBonus,floaty]);
  const queueHealing = useCallback(amount => {
    dispatchArmy({type:"heal",amount,buildings:bldgs,now:Date.now(),id:crypto.randomUUID(),healSpeedMult});
  }, [bldgs,dispatchArmy,healSpeedMult]);

  // Troop slot actions — rules in shared/utils/troopSlots.js
  const { setTroopSlot, setArmySlots, assignTroops, returnTroops } = useTroopSlots({
    setCmds, troopCounts, setTroopCounts, commandCenterLvl: bldgs.commandcenter,
  });

  // Quarters ("q_<faction>") and branches ("b_<faction>_<branch>") go through the same
  // timed queue as buildings. The Quarters screen passes the current level and the
  // level its gate allows (HQ gate for quarters, quarter gate for branches).
  const upgrade = useCallback((type, gate) => {
    if (gate && (type.startsWith("q_") || type.startsWith("b_"))) {
      const { lvl, ceil } = gate;
      if (lvl >= ceil || upgQueue[type]) return;
      const isQ = type.startsWith("q_");
      const c = isQ ? upgCostQuarter(lvl) : upgCostBranch(lvl);
      if (!c || !canAfford(c)) return;
      const dur = isQ ? upgDurationQuarter(lvl+1) : upgDurationBranch(lvl+1);
      setRss(p => Object.fromEntries(Object.entries(p).map(([k,v]) => [k, v-(c[k]||0)])));
      setUpgQueue(q => ({ ...q, [type]:{ endsAt:Date.now()+dur, startedAt:Date.now(), newLvl:lvl+1, dur } }));
      return;
    }
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
  if (screen==="title")   return <TitleScreen setScreen={setScreen} onTestCampaign={TEST_MODE_AVAILABLE ? () => setScreen("testmenu") : null} />;
  if (screen==="testmenu") return <TestCampaignMenu onNew={startNewTestCampaign} onLoad={testLoadFrom} onBack={() => setScreen("title")} listSaves={testListSaves} />;
  if (screen==="faction") return (
    <FactionScreen
      setScreen={setScreen} setFacKey={setFacKey} setFacName={setFacName}
      setPlayerName={setFacName}
      setAiFaction={setAiFaction} setAiRss={setAiRss} setAiBldgs={setAiBldgs}
      setAiBarracksPool={setAiBarracksPool} aiLastActionRef={aiLastActionRef}
      setCmds={setCmds} setColl={setColl} setTiles={setTiles}
      setTroopCounts={setTroopCounts} setUnlockedBranches={setUnlockedBranches}
      setQuarterLevels={setQuarterLevels} setBldgs={setBldgs}
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
    chatChannels, chatKnownPlayerIds: chatKnownPlayerIdsWithNyro, chatOpen, chatProfanityFilterEnabled, chatNormalizedCrews,
    chatRecentMessages, addGroupSubchannel, removeGroupSubchannel, moveGroupSubchannel, leaveChatGroup,
    chatActiveDisplay, setChatActiveDisplay, chatActiveChannelId, setChatActiveChannelId,
    chatActiveSubId, setChatActiveSubId,
    chatMutedChannelIds, chatToggleMute, chatReactions, chatToggleReaction, chatTypingByChannel,
    chatUnreadCount, chatMarkRead, chatUnreadLeafIds, chatUnreadTopIds,
    relFriends, relBlocked, relIncoming, relOutgoing, relAddFriend, relDeclineIncoming,
    relCancelOutgoing, relUnfriend, relBlockPlayer, relUnblockPlayer, relSearch, relationsNameOf,
    cmdScreenOpen, cmdScreenUid, cmds, cmdsAdjToSel, cmdsForMove, cmdsOnSel, consumables,
    crewOpen, crewmatePlayerIds, diplomacyPlayerIds, crews, myCrew, buildCrewFortress, demolishCrewFortressHere,
    buildCrewWell, demolishCrewWell, stationAtWell, buildCrewOutpost, demolishCrewOutpost, chooseOutpostUnits,
    crewStructureKeys, myCrewStructureKeys, trainableUnlocked, neutralSources, contractCommandsLeft,
    startFortressSiegeMarch, crossingsState, deletingSecsLeft, deletingTiles,
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
    reinMarchesRef, respectSchematics, returnTroops, rss, rssBonus, facTileYield, crewRssBonus, searchOpen, selKey, selTile,
    sendChatMessage, serverConnected, setAiBarracksPool, setAiBldgs, setAiHqKeys, setAiRss, setArmySlots,
    setAtkKey, setAutoHeal, setBLog, setBarracks, setBattles, setBldgs, setChatOpen,
    setChatProfanityFilterEnabled, setCmdScreenOpen,
    setCmdScreenUid, setCmds, setConsumables, setCrewOpen, setCrews, setDeletingSecsLeft, setDeletingTiles,
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
    trainingQueues, trainingSpeedMult, trainingCostMult, healSpeedMult, trainingXpMult, troopCounts, troopSkillLevels,
    unlockedBranches, unseenBattles, upgQueue, upgrade, upgradeFort, useConsumable,
    voidTapCooldown, voidTapLvl, voidTapReady, winner, worldMapOpen, worldMapPrompt,
    woundedQueue, woundedTroops, zoomRef, zoomState,
    admin, // TEST MODE (null outside the test campaign)
  }} />;
}
