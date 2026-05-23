import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { MapRenderer, clearKeepCache, clearHQCache } from "./MapRenderer";

// Constants
import { CSS } from "./constants/css.js";
import { getFactionAlignment } from "../shared/constants/factions.js";
import { npcForPowerLevel, factionDefCmdForTile } from "../shared/constants/heroes.js";
import { HQP, POWER_DEFS, SIEGE_BASE, hqSiegeValue } from "../shared/constants/map.js";
import { FACTION_TROOPS, COMMAND_COST } from "../shared/constants/troops.js";
import { barracksCapacity, cmdCommand, upgCost, upgDuration, maxAvailLevel, trainingQueueCount, tierFromBranchLevel } from "../shared/constants/buildings.js";
import { isoXY } from "../shared/constants/geometry.js";

// Utils
import { adj, effectiveMarchSpd, marchStepMs, setImpassableTiles, normaliseTroopSlots } from "../shared/utils/pathfinding.js";
import { applyGearToCmd } from "../shared/utils/gearStats.js";

// Hooks
import { useResources } from "./hooks/useResources.js";
import { useAI } from "./hooks/useAI.js";
import { useTraining } from "./hooks/useTraining.js";
import { useMarch } from "./hooks/useMarch.js";
import { useUpgrades } from "./hooks/useUpgrades.js";
import { useGameLoop } from "./hooks/useGameLoop.js";
import { usePathfinding } from "./hooks/usePathfinding.js";
import { useServerSync } from "./hooks/useServerSync.js";
import { useBattle } from "./hooks/useBattle.js";
import { useGacha } from "./hooks/useGacha.js";
import { useTomes } from "./hooks/useTomes.js";
import { useVoidTap } from "./hooks/useVoidTap.js";

// Screens
import TitleScreen from "./components/screens/TitleScreen.jsx";
import FactionScreen from "./components/screens/FactionScreen.jsx";
import GachaScreen from "./components/screens/GachaScreen.jsx";

// Game components
import HUD from "./components/game/HUD.jsx";
import TilePopup from "./components/game/TilePopup.jsx";
import HQMenu from "./components/game/HQMenu.jsx";
import WorldMap from "./components/game/WorldMap.jsx";
import BattleLog from "./components/game/BattleLog.jsx";
import CommanderPicker from "./components/game/CommanderPicker.jsx";
import BottomPanel from "./components/game/BottomPanel.jsx";
import WinScreen from "./components/game/WinScreen.jsx";
import Minimap from "./components/game/Minimap.jsx";
import WizardsTomes, { ScrollStackIcon } from "./components/game/WizardsTomes.jsx";
import GameBar from "./components/game/GameBar.jsx";
import CommanderScreen from "./components/screens/CommanderScreen.jsx";
import GearScreen from "./components/screens/GearScreen.jsx";

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
      if (patch.owner === "player") newSet.add(key);
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
  const [rss,    setRss]     = useState({ stone:200_000, wood:200_000, ore:200_000, gas:200_000 });
  const [gems,   setGems]    = useState(20000);

  const [playerCmds, setPlayerCmds] = useState([]);
  const aiCmdsRef = useRef([]);
  const cmdsRef = useRef([]);
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
  } = useGacha({ playerAlignment, gems, setGems, playerHqRef, setCmds, setColl, floatyRef });

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
  const aiRssRef   = useRef({ stone:300, wood:300, ore:300, gas:300 });
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
  const aiRssMapRef      = useRef(new Map()); // Map<fk, {stone,wood,ore,gas}>
  const aiBldgsMapRef    = useRef(new Map()); // Map<fk, bldgsObj>
  const aiPoolMapRef     = useRef(new Map()); // Map<fk, number>
  const aiTileKeysMapRef = useRef(new Map()); // Map<fk, Set<tileKey>>
  const aiLastMarchMapRef= useRef(new Map()); // Map<fk, Map<cmdUid, timestamp>>
  const aiHqKeysRef      = useRef({});        // { [fk]: hqTileKey }
  const [aiFactionKeys,  setAiFactionKeys]   = useState([]);

  // Updater helpers — write to map ref, no setState
  const setAiRssMap = useCallback((fk, updater) => {
    const cur = aiRssMapRef.current.get(fk) || { stone:300, wood:300, ore:300, gas:300 };
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
  const [troopCounts, setTroopCounts] = useState({});

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
  const [woundedTroops,  setWounded]       = useState(0);
  const [woundedQueue,   setWoundedQueue]  = useState(0);
  const [trainingQueues, setTrainingQueues] = useState([]);  // array of { id, branchKey, remaining, total }
  const [trainSlider,    setTrainSlider]   = useState(100);

  const [bLog,          setBLog]          = useState([]);
  const [battles,       setBattles]       = useState([]);
  const [unseenBattles, setUnseenBattles] = useState(0);
  const [showBattleLog, setShowBattleLog] = useState(false);

  const [mode,       setMode]      = useState("view");
  const [selKey,     setSelKey]    = useState(null);
  const [popupPos,   setPopupPos]  = useState(null);
  const [popupMode,  setPopupMode] = useState("main");
  const [editArmyCmd, setEditArmyCmd] = useState(null);
  const [atkKey,     setAtkKey]    = useState(null);
  const [mvCmd,      setMvCmd]     = useState(null);
  const [pickCmd,    setPick]      = useState(null);
  const [reinCmd,    setReinCmd]   = useState(null);
  const [reinMarches, setReinMarches] = useState([]);
  const reinMarchesRef = useRef([]);
  useEffect(() => { reinMarchesRef.current = reinMarches; }, [reinMarches]);
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
  const panNotifyTimerRef = useRef(null);
  const onPanChange = useCallback(np => {
    panRef.current = np;
    // Redraw minimap directly via ref — no setState, no Game re-render.
    // Throttle to 100ms so we don't overdraw during fast pans.
    if (!panNotifyTimerRef.current) {
      panNotifyTimerRef.current = setTimeout(() => {
        panNotifyTimerRef.current = null;
        minimapRedrawRef.current?.();
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

  // ── Hooks ──
  useResources({ screen, tilesRef, setRss, bldgs });

  // ── Stamina regen: +20/hr = +1 per 3 minutes ─────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const STAMINA_MAX   = 200;
    const REGEN_PER_HR  = 20;
    const INTERVAL_MS   = 3 * 60 * 1000; // 3 minutes = 1 regen tick
    const REGEN_PER_TICK = REGEN_PER_HR / (60 / 3); // = 1 per tick
    const id = setInterval(() => {
      setPlayerCmds(prev => prev.map(c => {
        const cur = c.stamina ?? STAMINA_MAX;
        if (cur >= STAMINA_MAX) return c;
        return { ...c, stamina: Math.min(STAMINA_MAX, cur + REGEN_PER_TICK) };
      }));
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [screen]);

  const { initPathfinding, findPath, findPathBatch } = usePathfinding();
  const { runBattle } = useBattle();

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { mvCmdRef.current = mvCmd; }, [mvCmd]);

  const handleZoomChange = useCallback((newZoom) => {
    if (newZoom < ZOOM_LEVELS[0]) { setWorldMapPrompt(true); return; }
    zoomRef.current = newZoom;
    notifyDisplayPanZoom();
  }, [notifyDisplayPanZoom]);

  // ── Init map on game start via Web Worker ──
  useEffect(() => {
    if (screen !== "game" || tiles.__ready) return;

    setLoadPct(0);
    setLoadLabel("Generating world...");

    const worker = new Worker(
      new URL("./workers/mapGen.worker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = async (e) => {
      const { type, pct, label, buffers, meta, spawnKeys, factionTileKeys } = e.data;

      if (type === "progress") {
        setLoadPct(pct);
        if (label) setLoadLabel(label);
        return;
      }

      if (type === "done") {
        worker.terminate();
        setLoadPct(10);
        setLoadLabel("Building world...");

        // ── Reconstruct tile map from zero-copy typed arrays ──────────────
        // Workers transfer ArrayBuffers — wrap them back into typed arrays.
        const terrainArr  = new Uint8Array(buffers.terrain);
        const ownerArr    = new Uint8Array(buffers.owner);
        const rssArr      = new Uint8Array(buffers.rss);
        const troopArr    = new Uint8Array(buffers.troop);
        const powerArr    = new Uint8Array(buffers.power);
        const regionArr   = new Uint8Array(buffers.region);
        const flagArr     = new Uint16Array(buffers.flags);
        const garrisonArr = new Uint32Array(buffers.garrison);
        const siegeArr    = new Uint32Array(buffers.siege);
        const siegeMaxArr = new Uint32Array(buffers.siegeMax);
        const keepPrimArr = new Int32Array(buffers.keepPrim);

        const {
          COLS: C, ROWS: R,
          regionList, keepMeta, crossings, impassKeys,
          TERRAIN_DEC, RSS_DEC, TROOP_DEC, OWNER_DEC,
          F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_WIN, F_DEFEATED, F_GATE, F_BORDER, F_PGGATE,
        } = meta;
        const SIZE = C * R;

        // ── FIX 1a: Shared prototype for garrisonDefeated getter ─────────
        // Previously each of the 490k tile objects got its own inline getter,
        // creating 490k unique hidden classes and a proportional GC/OOM risk.
        // One prototype shared across all tiles eliminates that allocation spike.
        const TileProto = {
          get garrisonDefeated() {
            return (this.defeatedWaves?.length ?? 0) >= (this.garrisonWaves ?? 1)
              && (this.garrisonWaves ?? 1) > 0;
          },
        };

        // Build region lookup by index
        const regionByIdx = {};
        regionList.forEach((reg, i) => { regionByIdx[i+1] = reg; });

        // Build keepPrimaryKey lookup: flat index → "cx,cy" string
        const keepPrimKeyCache = {};

        // ── Proxy-based tile map — zero reconstruction time ───────────────────
        // Previously: 1.4M Object.create calls = 11-15s on the main thread.
        // Now: a Proxy intercepts tiles[key] and computes the tile on-demand
        // from the typed arrays. Zero upfront work. Tiles that get mutated
        // (via patchTile, HQ placement, etc.) are stored in the backing store
        // and returned directly, bypassing the Proxy computation.
        //
        // keepPrimKeyCache is still used for keepPart → primaryKey lookups.

        const _tileStore = {}; // backing store for patched/special tiles

        const makeTile = (c, r) => {
          const idx   = r * C + c;
          const flags = flagArr[idx];
          const k     = `${c},${r}`;
          const reg   = regionByIdx[regionArr[idx]] || null;

          const isKeep    = !!(flags & F_KEEP);
          const isKeepPart= !!(flags & F_KEEPPART);
          const isHQ      = !!(flags & F_HQ);
          const isHQPart  = !!(flags & F_HQPART);
          const isWin     = !!(flags & F_WIN);
          const isGate    = !!(flags & F_GATE);
          const isBorder  = !!(flags & F_BORDER);
          const isPGGate  = !!(flags & F_PGGATE);

          let keepPrimaryKey = null;
          if (isKeepPart || isHQPart) {
            const pi = keepPrimArr[idx];
            if (!keepPrimKeyCache[pi]) {
              const pc = pi % C, pr = Math.floor(pi / C);
              keepPrimKeyCache[pi] = `${pc},${pr}`;
            }
            keepPrimaryKey = keepPrimKeyCache[pi];
          }

          const km = (isKeep && keepMeta[k]) ? keepMeta[k] : null;
          const owner = OWNER_DEC[ownerArr[idx]] || null;

          const tile = Object.create(TileProto);
          tile.c = c; tile.r = r; tile.k = k;
          tile.terrain    = TERRAIN_DEC[terrainArr[idx]] || "grass";
          tile.rss        = RSS_DEC[rssArr[idx]] || null;
          tile.troopBranch = null;
          tile.powerLevel = powerArr[idx];
          tile.regionKey  = reg?.key   || null;
          tile.regionName = reg?.name  || null;
          tile.keepName   = km?.keepName || (isKeepPart && reg ? reg.keepName : null);
          tile.owner      = owner;
          tile.garrison   = garrisonArr[idx] / 100;
          tile.garrisonTroops = garrisonArr[idx] / 100;
          tile.hasAiCommander = false;
          tile.siege      = siegeArr[idx];
          tile.siegeMax   = siegeMaxArr[idx];
          tile.garrisonWaves  = km?.garrisonWaves ?? 1;
          tile.defeatedWaves  = [];
          tile.resetAt    = null;
          tile.isKeep     = isKeep;
          tile.isKeepPart = isKeepPart;
          tile.isHQ       = isHQ;
          tile.isHQPart   = isHQPart;
          tile.isWin      = isWin;
          tile.isGate     = isGate;
          tile.isBorder   = isBorder;
          tile.isPeninsulaGate = isPGGate;
          tile.homeFaction     = km?.homeFaction || null;
          tile.crossingType    = km?.type || null;
          tile.keepPrimaryKey  = keepPrimaryKey;
          tile.defCmd          = km?.defCmd || null;
          
          // AI HQ tiles need faction for border coloring
          if ((isHQ || isHQPart) && owner === "ai") {
            // Derive faction from HQ owner - assumes 8 AI factions at indices 1-8
            const ownerIdx = ownerArr[idx];
            if (ownerIdx > 0 && ownerIdx <= 8) {
              const factionKeys = ["rome", "gaul", "carthage", "pirates", "egypt", "hispania", "greece", "germania"];
              tile.faction = factionKeys[ownerIdx - 1];
              console.log('AI HQ tile', k, 'ownerIdx:', ownerIdx, 'faction:', tile.faction);
            }
          } else {
            tile.faction = null;
          }
          
          return tile;
        };

        const rawMap = new Proxy(_tileStore, {
          get(store, key) {
            // Fast path: special/patched tiles stored directly
            if (key in store) return store[key];
            // Symbol, __ready, and non-coord keys go to store directly
            if (typeof key !== "string" || key === "__ready") return store[key];
            // Parse "c,r" coordinate keys
            const comma = key.indexOf(",");
            if (comma < 1) return undefined;
            const c = +key.slice(0, comma);
            const r = +key.slice(comma + 1);
            if (isNaN(c) || isNaN(r) || c < 0 || r < 0 || c >= C || r >= R) return undefined;
            return makeTile(c, r);
          },
          set(store, key, value) {
            store[key] = value;
            return true;
          },
          has(store, key) {
            if (typeof key === "string" && key.indexOf(",") > 0) return true;
            return key in store;
          },
          // ownKeys only returns patched/special tiles — prevents Object.entries/keys
          // from enumerating all 1.4M tiles. Code that needs full iteration must use
          // the typed arrays directly or the factionTileKeys index.
          ownKeys(store) {
            return Reflect.ownKeys(store);
          },
          getOwnPropertyDescriptor(store, key) {
            if (key in store) return Object.getOwnPropertyDescriptor(store, key);
            return undefined;
          },
        });

        setLoadPct(90);
        setLoadLabel("Almost there...");

        // Player HQ — worker already stamped this tile as F_HQ in flagArr and set
        // terrain/garrison/siege in the typed arrays. We just need to override the
        // owner from the faction code to "player" for the first spawn tile.
        // The 8 surrounding part tiles also need owner="player".
        const playerSpawn = spawnKeys[facKey]?.[0] || null;
        if (playerSpawn && rawMap[playerSpawn]) {
          // Override ownership only — all other data already correct from worker
          rawMap[playerSpawn] = Object.assign(Object.create(Object.getPrototypeOf(rawMap[playerSpawn])),
            rawMap[playerSpawn], { owner: "player", faction: facKey, defCmd: null, defeatedWaves: [], resetAt: null });
          const [hc, hr] = playerSpawn.split(",").map(Number);
          [[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]].forEach(([dc,dr]) => {
            const fk = `${hc+dc},${hr+dr}`;
            if (rawMap[fk]) {
              const existing = rawMap[fk];
              rawMap[fk] = Object.assign(Object.create(Object.getPrototypeOf(existing)),
                existing, { owner: "player" });
            }
          });
          setPlayerHqKey(playerSpawn);
          const { cx, cy } = isoXY(hc, hr);
          const initZoom = 1.25;
          const px = -cx * initZoom + window.innerWidth / 2;
          const py = -cy * initZoom + window.innerHeight / 2;
          panRef.current = { x: px, y: py };
          zoomRef.current = initZoom;
          setZoomState(initZoom);
        }

        // Place AI HQs — each of the 50 AI players gets their own 3x3 HQ
        const allFactions = ["pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"];
        const aiFactions  = allFactions.filter(f => f !== facKey);
        // newAiHqKeys: { [fk]: string[] } — all HQ primary keys per faction.
        // HQ footprints are already fully stamped into the typed arrays by the worker
        // (flags, ownership, terrain, garrison, siege) — no rawMap mutation needed here.
        const newAiHqKeys = {};
        aiFactions.forEach(aiFk => {
          newAiHqKeys[aiFk] = spawnKeys[aiFk] || [];
        });

        aiHqKeysRef.current = newAiHqKeys;

        // ── Pre-populate _tileStore with all HQ primary tiles ─────────────────
        // The Proxy computes tiles on-demand but Object.entries(tiles) in buildHQLayer
        // only sees _tileStore entries. HQ tiles must be in _tileStore so the
        // _hqKeyIndex gets populated on first redrawHQs() call.
        // We only store the primary (isHQ===true) tile, not the 8 part tiles —
        // buildHQLayer only iterates primary HQ tiles.
        const allSpawnKeys = [];
        allFactions.forEach(fk => { if (spawnKeys[fk]) allSpawnKeys.push(...spawnKeys[fk]); });
        allSpawnKeys.forEach(hqKey => {
          if (!(hqKey in _tileStore)) {
            _tileStore[hqKey] = rawMap[hqKey]; // triggers makeTile, stores result
          }
        });

        // ── Initialize per-faction AI Maps ────────────────────────────────
        const INIT_BLDGS_VAL = { hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 };
        // factionTileKeys was pre-built by the worker scanning ownerArr in one pass —
        // no O(1.4M) rawMap scan needed here. Convert arrays to Sets for O(1) lookup.
        aiFactions.forEach(aiFk => {
          aiRssMapRef.current.set(aiFk, { stone:5000, wood:5000, ore:5000, gas:5000 });
          aiBldgsMapRef.current.set(aiFk, { ...INIT_BLDGS_VAL });
          aiPoolMapRef.current.set(aiFk, barracksCapacity(0));
          aiTileKeysMapRef.current.set(aiFk, new Set(factionTileKeys?.[aiFk] || []));
          aiLastMarchMapRef.current.set(aiFk, new Map());
        });

        // ── Seed one commander per AI player, each at their own HQ ────────
        const AI_CMD_NAMES = [
          "Ravenport","Stormfist","Greymantle","Ironveil","Ashcroft","Duskblade",
          "Thornwall","Coppergrin","Sablewind","Flintmoor","Emberpeak","Coldforge",
          "Dreadmaw","Nighthollow","Scaleback","Cindervane","Mudthorn","Brakespear",
          "Rimeclaw","Brinewatch","Hellgrip","Saltmere","Vexhorn","Ashgallow",
          "Gryphonspire","Stonemarrow","Bonecrest","Ironridge","Darkfen","Runehelm",
          "Voidmere","Scorchvale","Grimtide","Ashroot","Ravenprow","Dustmantle",
          "Wolfmark","Slagmire","Blackthorn","Stonecrow","Flamewick","Dreadhollow",
          "Moltenspire","Blightmere","Grimstock","Veinhollow","Ironscale","Cragmaw",
          "Stormcrow","Saltveil",
        ];
        const ICONS_BY_FACTION = {
          pirates:"🏴‍☠️", orcs:"⚔️", dragons:"🐉", nightcreatures:"🦇",
          bountyhunters:"🔮", holyknights:"⚔",
        };
        const initialAiCmds = [];
        aiFactions.forEach(aiFk => {
          const hqArr    = newAiHqKeys[aiFk] || [];
          if (!hqArr.length) return;
          const branches = FACTION_TROOPS[aiFk]?.branches || [];
          // One starting commander per faction placed at their first HQ.
          // Additional commanders are earned via gameplay, not pre-spawned.
          // Previously this created one commander per HQ spawn (up to 50 × 5 factions
          // = 250 commanders) which saturated the main thread on map load and
          // starved the props idle callback for 10-15 seconds.
          const hqKey  = hqArr[0];
          const branch = branches[0];
          const tBranch = { faction: aiFk, branch: branch?.key || "swashbucklers", tier: 0 };
          initialAiCmds.push({
            uid:    `ai_${aiFk}_0_${Date.now()}`,
            id:     `ai_${aiFk}_0`,
            owner:  "ai",
            faction: aiFk,
            n:      AI_CMD_NAMES[aiFactions.indexOf(aiFk) % AI_CMD_NAMES.length],
            icon:   ICONS_BY_FACTION[aiFk] || "⚔",
            tk:     hqKey,
            hqKey:  hqKey,
            troops: 200,
            troopBranch: tBranch,
            troopSlots: [],
            march:  null,
            lvl: 5, xp: 0,
            atk: 80 + Math.floor(Math.random() * 40),
            foc: 20, spd: 60 + Math.floor(Math.random() * 30),
            cls: ["attacker","leader","support","balanced"][aiFactions.indexOf(aiFk) % 4],
            rarity: "soldier",
            skillPoints: {}, unspentSkillPoints: 0,
            gear: { helmet:null, armor:null, bracers:null, accessory:null },
          });
        });
        const oppAlign   = playerAlignment === "humans" ? "creatures" : "humans";
        const primaryAiFk = aiFactions.find(f =>
          (oppAlign === "humans"
            ? ["pirates","bountyhunters","holyknights"]
            : ["orcs","dragons","nightcreatures"]).includes(f)
        ) || aiFactions[0];

        // pKeysRef: player owns no tiles at this point — their HQ is placed in the
        // block above (setPlayerHqKey). patchTile maintains pKeysRef incrementally
        // from here on. powerPerHrRef starts at 0 (player has no ring tiles yet).
        pKeysRef.current = new Set();

        rawMap.__ready = true;
        setImpassableTiles(impassKeys || []);
        initPathfinding(impassKeys || []);
        perfLog(`impass: ${(impassKeys||[]).length} border tiles sent`);
        clearKeepCache();
        clearHQCache();

        // ── FIX 3: Batch all final setState calls so they flush in one React
        // render pass. Without this, each call triggers its own render; the
        // tileVersion bump from setTiles may arrive before __ready is true on
        // tilesMapRef in the mapReady effect, leaving the loading screen up.
        unstable_batchedUpdates(() => {
          setCrossingsState(crossings || []);
          setAiHqKeys(newAiHqKeys);
          setAiFactionKeys(aiFactions);
          setAiCmds(initialAiCmds);
          setAiCmdsVersion(v => v + 1);
          setAiFaction(primaryAiFk);
          setPlayerCmds(prev => prev.map(cmd => {
            if (cmd.owner === "player") {
              const spawn = (spawnKeys[facKey] || [])[0];
              return spawn ? { ...cmd, tk: spawn } : cmd;
            }
            if (cmd.owner === "ai" && cmd.faction) {
              const spawn = (spawnKeys[cmd.faction] || [])[0];
              return spawn ? { ...cmd, tk: spawn } : cmd;
            }
            return cmd;
          }));
          setTiles(rawMap); // tileVersion bumps here, inside the batch
        });

        // Trigger a teleport so MapRenderer's world position syncs with panRef.
        // The tiles useEffect in MapRenderer also syncs world position now,
        // but this ensures it happens even if tiles was already set.
        setTimeout(() => {
          mapRendererRef.current?.teleport(panRef.current.x, panRef.current.y);
        }, 0);
      }
    };

    worker.onerror = (err) => {
      console.error("mapGen worker error:", err);
      worker.terminate();
      // ── FIX: Reset state so user can retry by refreshing or re-navigating.
      // Previously only setLoadLabel was called, leaving loadPct at whatever
      // value it reached — the loading screen stayed up with no way to recover.
      setLoadPct(0);
      setLoadLabel("Error generating map — please refresh");
    };

    worker.postMessage({ facKey });

    return () => worker.terminate();
  }, [screen]);

  // ── Reset mapReady when leaving game ──
  // Only wipe tiles when navigating to a new-game flow (title/faction).
  // Overlay screens (gacha, commander, gear) keep the map alive so
  // returning to "game" doesn't trigger a full world regeneration.
  useEffect(() => {
    if (screen === "title" || screen === "faction") {
      setMapReady(false);
      clearKeepCache();
      clearHQCache();
      setTiles({});
      setLoadPct(0);
      setLoadLabel("Generating world...");
    }
  }, [screen]);

  // ── Mark map ready once tiles are populated ──
  useEffect(() => {
    if (screen === "game" && tilesMapRef.current.__ready) {
      setMapReady(true);
    }
  }, [tileVersion, screen]);

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


  // ── Server sync — authoritative tile state ──
  const { emitTileCapture, emitTileSiege, connected: serverConnected } = useServerSync({
    screen,
    tiles,
    mapReady,
    patchTile,
    sessionId,
  });
  const { tickAiRss, tickAiMarch, tickAiEcon } = useAI({
    screen,
    aiFactionKeys,
    cmdsRef, tilesRef,
    aiRssMapRef, aiBldgsMapRef, aiPoolMapRef, aiTileKeysMapRef, aiLastMarchMapRef,
    aiHqKeysRef,
    setCmds: setAiCmds,
    setAiRssMap, setAiBldgsMap, setAiPoolMap,
  });

  useTraining({ screen, bldgs, setTrainingQueues, setTroopCounts, setBarracks, setWounded, woundedQueue, setWoundedQueue });

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

  useMarch({
    screen, tiles, tileVersion, bldgs,
    cmds: cmdsRef.current,
    setCmds: setPlayerCmds,
    setAiCmds,
    setTiles, patchTile, setWounded, setBarracks,
    setBattles, setBLog, setWinner, setUnseenBattles,
    tilesRef, floaty, gearInventory,
    playerHqKey: playerHqKey || playerHqRef.current || `${HQP.player.c},${HQP.player.r}`,
    aiHqKeys,
    emitTileCapture, emitTileSiege,
    gatePartners,
    facKey,
    troopSkillLevels,
    runBattle,
  });

  useGameLoop({
    screen,
    cmds,
    tiles,
    reinMarches,
    aiFaction,
    defeatedTilesRef,
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
          if (upd.clearMarch) return { ...cmd, tk: upd.tk, march: null };
          return { ...cmd, tk: upd.tk, march: upd.marchPatch };
        });
        return changed ? next : prev;
      });
    },
    onAiRssTick:    tickAiRss,
    onAiMarchCheck: tickAiMarch,
    onAiEconTick:   tickAiEcon,
    onTick: (now) => {
      // Only update nowTick every 5s — it's only used for draw-timer countdown display
      // This eliminates 4 out of 5 full Game re-renders from the 1s heartbeat
      setNowTick(prev => (now - prev >= 5000) ? now : prev);
    },
  });

  // ── Reinforcement march tick ──
  useEffect(() => {
    if (screen !== "game") return;
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const id = setInterval(() => {
      const now = Date.now();
      setReinMarches(prev => {
        if (!prev.length) return prev;
        const next = [];
        prev.forEach(rm => {
          if (!rm.path || rm.path.length === 0) return;
          if (!rm.returning) {
            const targetCmd  = cmdsRef.current.find(c => c.uid === rm.cmdUid && c.owner === "player");
            const destKey    = rm.path[rm.path.length - 1];
            const destTile   = tilesRef.current[destKey];
            const cmdGone    = !targetCmd || (targetCmd.troops === 0 && !targetCmd.march && targetCmd.tk !== destKey);
            const tileFlipped = destTile && destTile.owner !== "player" && destKey !== hqKey;
            if (cmdGone || tileFlipped) {
              // Fix #6: offload BFS to the pathfinding worker instead of blocking
              // the main thread. Fire async, apply result in a follow-up state update.
              const currentPos = rm.path[Math.min(rm.step, rm.path.length - 1)] ?? hqKey;
              const capturedRm = { ...rm };
              findPath(currentPos, hqKey).then(returnPath => {
                if (returnPath && returnPath.length >= 2) {
                  setReinMarches(cur => cur.map(r =>
                    r.uid === capturedRm.uid
                      ? { ...r, returning: true, path: returnPath, step: 0, lastStepTime: Date.now() }
                      : r
                  ));
                } else {
                  setReinMarches(cur => cur.filter(r => r.uid !== capturedRm.uid));
                  setTroopCounts(counts => {
                    if (!capturedRm.branchKey) return counts;
                    const cap   = barracksCapacity(bldgs.barracks || 0);
                    const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
                    const space = Math.max(0, cap - total);
                    const add   = Math.min(capturedRm.amount, space);
                    return { ...counts, [capturedRm.branchKey]: (counts[capturedRm.branchKey] || 0) + add };
                  });
                }
              });
              floaty(`⚠ Reinforcements redirected to base`, "#cc8030", currentPos);
              // Drop from next — the async handler above will re-insert with updated path
              return;
            }
          }

          const elapsed = now - rm.lastStepTime;
          if (elapsed < rm.stepMs) { next.push(rm); return; }
          const nextStep = rm.step + 1;
          if (nextStep >= rm.path.length) {
            if (rm.returning) {
              setTroopCounts(counts => {
                if (!rm.branchKey) return counts;
                const cap   = barracksCapacity(bldgs.barracks || 0);
                const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
                const space = Math.max(0, cap - total);
                const add   = Math.min(rm.amount, space);
                return { ...counts, [rm.branchKey]: (counts[rm.branchKey] || 0) + add };
              });
              floaty(`🏰 ${rm.amount} reinforcements returned to barracks`, "#88aaff", hqKey);
            } else {
              setPlayerCmds(cmds => cmds.map(c => {
                if (c.uid !== rm.cmdUid) return c;
                const cap       = cmdCommand(c.lvl||5, bldgs.commandcenter||0, c.commandBonus??0);
                const newTroops = Math.min(cap, (c.troops||0) + rm.amount);
                const overflow  = ((c.troops||0) + rm.amount) - newTroops;
                if (overflow > 0) {
                  setTroopCounts(counts => {
                    if (!rm.branchKey) return counts;
                    const bCap  = barracksCapacity(bldgs.barracks || 0);
                    const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
                    const space = Math.max(0, bCap - total);
                    const add   = Math.min(overflow, space);
                    return { ...counts, [rm.branchKey]: (counts[rm.branchKey] || 0) + add };
                  });
                  floaty(`↩ ${overflow} troops returned (cmd full)`, "#88aaff", rm.path[rm.path.length-1]);
                }
                return { ...c, troops: newTroops, troopSlots: (() => {
                  if (!c.troopSlots || c.troopSlots.length === 0) return c.troopSlots;
                  const added = newTroops - (c.troops || 0);
                  if (added <= 0) return c.troopSlots;
                  // Distribute added troops proportionally by slot count
                  const totalSlotTroops = c.troopSlots.reduce((s, sl) => s + (sl.troops || 0), 0);
                  let remaining = added;
                  return c.troopSlots.map((sl, i) => {
                    const frac = totalSlotTroops > 0 ? (sl.troops || 0) / totalSlotTroops : 1 / c.troopSlots.length;
                    const share = i === c.troopSlots.length - 1
                      ? remaining
                      : Math.round(added * frac);
                    remaining -= share;
                    return { ...sl, troops: (sl.troops || 0) + share };
                  });
                })() };
              }));
              floaty(`+${rm.amount} reinforcements arrived!`, "#88aaff", rm.path[rm.path.length-1]);
            }
          } else {
            next.push({ ...rm, step: nextStep, lastStepTime: now });
          }
        });
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [screen, floaty, bldgs.barracks, bldgs.commandcenter, findPath]);

  // ── Tile deletion countdown ──
  useEffect(() => {
    if (Object.keys(deletingTiles).length===0) return;
    const id = setInterval(() => {
      const now = Date.now();
      const expired = [];
      const newSecs = {};
      Object.entries(deletingTiles).forEach(([key, startedAt]) => {
        const elapsed = now - startedAt;
        newSecs[key] = Math.max(0, Math.ceil((15000-elapsed)/1000));
        if (elapsed >= 15000) expired.push(key);
      });
      setDeletingSecsLeft(newSecs);
      if (expired.length > 0) {
        expired.forEach(key => {
          const t = tilesMapRef.current[key];
          if (!t || t.owner !== "player") return;
          const pl = t.powerLevel || 1;
          const pd = POWER_DEFS[pl];
          const npc2 = npcForPowerLevel(pl);
          const [tc, tr] = key.split(",").map(Number);
          const resetDefCmd = pd
            ? (pl >= 4
                ? (() => {
                    const fc = factionDefCmdForTile(tc, tr, facKey, pl);
                    if (!fc) return { n:npc2.n, icon:npc2.icon, cls:npc2.cls, faction:null, rarity:'soldier', lvl:pd.cmdLvl, troops:pd.command, troopBranch:npc2.troopBranch, atk:npc2.atk*pd.cmdLvl, spd:npc2.spd+pd.cmdLvl*2 };
                    return { ...fc, troops: pd.command };
                  })()
                : { n:npc2.n, icon:npc2.icon, cls:npc2.cls, faction:null, rarity:'soldier', lvl:pd.cmdLvl, troops:pd.command, troopBranch:npc2.troopBranch, atk:npc2.atk*pd.cmdLvl, spd:npc2.spd+pd.cmdLvl*2 })
            : null;
          patchTile(key, { owner:null, garrison:pd?pd.command:50, siege:t.siegeMax??SIEGE_BASE, siegeMax:t.siegeMax??SIEGE_BASE, defeatedWaves:[], resetAt:null, defCmd:resetDefCmd });
        });
        const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
        // Fix #6: offload retreat BFS to worker. Collect all affected cmds,
        // fire one findPathBatch call, then apply results in a single state update.
        const retreatCmds = cmdsRef.current.filter(cmd =>
          expired.includes(cmd.tk) && cmd.tk !== hqKey && !cmd.march
        );
        if (retreatCmds.length > 0) {
          const batchReqs = retreatCmds.map(cmd => ({ requestId: cmd.uid, from: cmd.tk, to: hqKey }));
          findPathBatch(batchReqs).then(results => {
            const pathByUid = Object.fromEntries(results.map(r => [r.requestId, r.path]));
            setPlayerCmds(prev => prev.map(cmd => {
              if (!expired.includes(cmd.tk) || cmd.tk === hqKey) return cmd;
              if (cmd.march) return cmd;
              const retreatPath = pathByUid[cmd.uid];
              const stepMs = marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, null));
              if (retreatPath && retreatPath.length >= 2) {
                return { ...cmd, march:{ type:"move", path:retreatPath, step:0, dest:hqKey, origin:cmd.tk, stepMs, lastStepTime:Date.now() } };
              }
              return { ...cmd, tk:hqKey };
            }));
          });
        }
        expired.forEach(key => floaty("🏳 Tile abandoned", "#a08060", key));
        setDeletingTiles(prev => { const n={...prev}; expired.forEach(k=>delete n[k]); return n; });
        setDeletingSecsLeft(prev => { const n={...prev}; expired.forEach(k=>delete n[k]); return n; });
      }
    }, 250);
    return () => clearInterval(id);
  }, [deletingTiles, floaty, findPathBatch, gearInventory]);

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
    return adj(selTile.c, selTile.r).some(ak => tiles[ak]?.owner==="player");
  }, [selTile, tileVersion]);

  const cmdsAdjToSel = useMemo(() => {
    if (!selAdjToPlayer || !selTile) return [];
    return playerCmds.filter(cmd =>
      cmd.owner === "player" && (normaliseTroopSlots(cmd).reduce((s,sl)=>s+(sl.troops||0),0) || cmd.troops || 0) > 0 && !cmd.march
    );
  }, [selAdjToPlayer, selTile, playerCmds]);

  const canAtk = !!(selTile && selTile.owner!=="player" && selAdjToPlayer &&
    // Peninsula gates can only be attacked by their home faction
    (!selTile.isPeninsulaGate || !selTile.homeFaction || selTile.homeFaction === facKey));

  const marchingToSel = useMemo(() =>
    selKey ? playerCmds.filter(c => c.march?.dest===selKey) : [],
  [selKey, playerCmds]);

  const onEnterHQ = useCallback(() => {
    unstable_batchedUpdates(() => {
      setHqOpen(true); setHqTab("hub"); setSelKey(null); setPopupPos(null);
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
    const type = destTile?.owner==="player" ? "move" : "attack";
    if (type==="move" && destTile?.owner!=="player") return;
    // Stamina check: moves cost 10, attacks cost 20
    const staminaCost = type === "attack" ? 20 : 10;
    const curStamina = freshCmd.stamina ?? 200;
    if (curStamina < staminaCost) {
      floaty(`⚡ Not enough stamina! (${curStamina}/200)`, "#cc8030", freshCmd.tk);
      return;
    }
    // Peninsula gates can only be attacked by their home faction
    if (type==="attack" && destTile?.isPeninsulaGate && destTile?.homeFaction && destTile.homeFaction !== facKey) {
      floaty("⚠ Only " + destTile.homeFaction + " can attack this gate!", "#cc8030", freshCmd.tk);
      return;
    }
    const boostedSpd = applyGearToCmd(freshCmd, gearInventory).spd || 60;
    const slots0 = normaliseTroopSlots(freshCmd);
    const stepMs = marchStepMs(effectiveMarchSpd(boostedSpd, slots0.length ? slots0.map(sl=>sl.branch) : freshCmd.troopBranch));
    setMode("view"); setMvCmd(null); setSelKey(null); setPopupPos(null);
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
        stamina: Math.max(0, (c.stamina ?? 200) - staminaCost),
        march:{ type, path, step:0, dest:destKey, origin:freshCmd.tk, stepMs, lastStepTime:Date.now() }
      } : c));
    });
  }, [floaty, gearInventory, findPath]);

  const recallMarch = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd?.march) return prev;
      const m = cmd.march;
      const reversePath = [...m.path.slice(0, m.step+1)].reverse();
      if (reversePath.length < 2) return prev.map(c => c.uid===uid ? { ...c, march:null } : c);
      return prev.map(c => c.uid===uid ? { ...c, march:{ type:"move", path:reversePath, step:0, dest:m.origin, origin:cmd.tk, stepMs:m.stepMs, lastStepTime:Date.now() } } : c);
    });
  }, []);

  const recallStationary = useCallback((uid) => {
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const cmd = cmdsRef.current.find(c => c.uid===uid && c.owner==="player");
    if (!cmd || cmd.march || cmd.tk===hqKey) return;
    const _rSlots = normaliseTroopSlots(cmd);
    const stepMs = marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, _rSlots.length ? _rSlots.map(sl=>sl.branch) : cmd.troopBranch));
    findPath(cmd.tk, hqKey).then(path => {
      if (!path || path.length < 2) return;
      setCmds(prev => prev.map(c => c.uid===uid ? { ...c,
        drawTimer:null, drawTile:null, drawOrigin:null,
        march:{ type:"move", path, step:0, dest:hqKey, origin:cmd.tk, stepMs, lastStepTime:Date.now() }
      } : c));
    });
  }, [gearInventory, findPath]);

  const startReinforcement = useCallback((cmd, amount) => {
    if (!cmd || amount <= 0) return;
    const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const _rSlots2 = normaliseTroopSlots(cmd);
    const stepMs = Math.max(100, Math.floor(marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, _rSlots2.length ? _rSlots2.map(sl=>sl.branch) : cmd.troopBranch))/2));
    setMode("view"); setReinCmd(null);
    setSliderVals(v => ({ ...v, [`rein_${cmd.uid}`]:undefined }));
    findPath(hqKey, cmd.tk).then(path => {
      if (!path || path.length < 2) return;
      setReinMarches(prev => {
        if (prev.some(r => r.cmdUid === cmd.uid && !r.returning)) return prev;
        // Determine which troop type pool to draw from.
        // Use the first slot of the destination commander as the source type.
        const slots = normaliseTroopSlots(cmd);
        const srcBranch = slots[0]?.branch ?? cmd.troopBranch;
        const srcKey = srcBranch ? `${srcBranch.faction}:${srcBranch.branch}:${srcBranch.tier ?? 0}` : null;
        setTroopCounts(counts => {
          if (!srcKey) return counts;
          return { ...counts, [srcKey]: Math.max(0, (counts[srcKey] || 0) - amount) };
        });
        return [...prev, { uid:`rein_${Date.now()}`, cmdUid:cmd.uid, amount, branchKey:srcKey, path, step:0, stepMs, lastStepTime:Date.now() }];
      });
    });
  }, [gearInventory, findPath]);

  const canAfford = useCallback(c => Object.entries(c).every(([k,v]) => (rss[k]||0)>=v), [rss]);

  // queueTraining(branchKey, amount)
  // branchKey: "faction:branch:tier" e.g. "pirates:swashbucklers:0"
  // Multiple queues allowed (even same branchKey). Max slots = trainingQueueCount(training lvl).
  const queueTraining = useCallback((branchKey, amount) => {
    const maxQueues = trainingQueueCount(bldgs.training || 0);
    if (trainingQueues.length >= maxQueues) return;  // all slots full
    const cap = barracksCapacity(bldgs.barracks || 0);
    if (barracksPool + amount > cap) return;
    const cost = { stone:amount*2, wood:amount*2, ore:amount, gas:Math.floor(amount*0.5) };
    if (!canAfford(cost)) return;
    setRss(p => ({ stone:p.stone-cost.stone, wood:p.wood-cost.wood, ore:p.ore-cost.ore, gas:p.gas-cost.gas }));
    const newQueue = { id: `q_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, branchKey, remaining: amount, total: amount };
    setTrainingQueues(prev => [...prev, newQueue]);
  }, [canAfford, bldgs.barracks, bldgs.training, barracksPool, trainingQueues]);

  // bKey: "faction:branch:tier" — unique key for one troop type pool
  const bKey = (b) => (b && b.faction && b.branch && b.tier != null)
    ? `${b.faction}:${b.branch}:${b.tier}` : null;

  // setTroopSlot(uid, slotIndex, branch, troops) — set one slot on a commander.
  // slotIndex: 0-2. If troops===0 or branch null, remove the slot. Max 3 slots.
  // Draws from / returns to the per-troop-type pool in troopCounts.
  const setTroopSlot = useCallback((uid, slotIndex, branch, newTroops) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd) return prev;
      const commandCap = cmdCommand(cmd.lvl||5, bldgs.commandcenter||0, cmd.commandBonus??0);

      const existingSlots = normaliseTroopSlots(cmd);
      const newSlots = [...existingSlots];

      // Command used by OTHER slots
      const otherUsed = newSlots.reduce((sum, sl, idx) => {
        if (idx === slotIndex) return sum;
        const bSize = sl.branch ? (FACTION_TROOPS[sl.branch.faction]?.branches?.find(b => b.key===sl.branch.branch)?.size ?? "small") : "small";
        return sum + (sl.troops || 0) * (COMMAND_COST[bSize] ?? 1);
      }, 0);
      const remainingCap = Math.max(0, commandCap - otherUsed);
      const branchSize = branch ? (FACTION_TROOPS[branch.faction]?.branches?.find(b => b.key===branch.branch)?.size ?? "small") : "small";
      const cmdCost    = COMMAND_COST[branchSize] ?? 1;
      const maxByCmd   = Math.floor(remainingCap / cmdCost);

      const oldSlot       = existingSlots[slotIndex];
      const oldTroops     = oldSlot?.troops || 0;
      const oldKey        = bKey(oldSlot?.branch);
      const newKey        = bKey(branch);
      const branchChanged = oldKey !== newKey;

      // Troops in old slot return to old pool if branch changed
      const returningOld = branchChanged ? oldTroops : 0;
      const curInSlot    = branchChanged ? 0 : oldTroops;

      // All pool accounting happens inside the setTroopCounts updater so it
      // always reads the latest counts (avoids stale-closure overflow bugs).
      // We capture `final` via a ref so setCmds can use it synchronously after.
      let finalTroops = curInSlot; // default: no change
      setTroopCounts(counts => {
        const next = { ...counts };
        // Return old-branch troops first (so they're available if same pool)
        if (branchChanged && oldKey && returningOld > 0)
          next[oldKey] = (next[oldKey] || 0) + returningOld;
        // Now compute draw from fresh counts
        const availInPool = next[newKey] || 0;
        const capped      = Math.min(newTroops, maxByCmd);
        const delta       = capped - curInSlot;
        const drawn       = delta > 0 ? Math.min(delta, availInPool) : 0;
        const returned    = delta < 0 ? Math.min(-delta, curInSlot) : 0;
        finalTroops       = curInSlot + drawn - returned;
        if (newKey)
          next[newKey] = Math.max(0, availInPool - drawn + returned);
        return next;
      });

      const final = finalTroops;

      if (final === 0 || !branch) {
        const filtered = newSlots.filter((_, i) => i !== slotIndex);
        return prev.map(c => c.uid===uid ? { ...c, troopSlots: filtered, troops: filtered.reduce((s,sl)=>s+(sl.troops||0),0), troopBranch: filtered[0]?.branch ?? null } : c);
      }
      newSlots[slotIndex] = { branch, troops: final };
      const trimmed = newSlots.filter(Boolean).slice(0, 3);
      return prev.map(c => c.uid===uid ? { ...c, troopSlots: trimmed, troops: trimmed.reduce((s,sl)=>s+(sl.troops||0),0), troopBranch: trimmed[0]?.branch ?? null } : c);
    });
  }, [troopCounts, bldgs.commandcenter]);

  // Legacy alias: assignTroops(uid, branch, total) maps to slot 0
  const assignTroops = useCallback((uid, troopBranch, newTotal) => {
    setTroopSlot(uid, 0, troopBranch, newTotal);
  }, [setTroopSlot]);

  const returnTroops = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd) return prev;
      const slots = normaliseTroopSlots(cmd);
      setTroopCounts(counts => {
        const next = { ...counts };
        // Return each slot's troops to its own per-type pool
        for (const sl of slots) {
          const k = bKey(sl.branch);
          if (k && sl.troops > 0) next[k] = (next[k] || 0) + sl.troops;
        }
        // Fallback: legacy cmd.troops with no slots
        if (!slots.length && cmd.troops > 0) {
          const k = bKey(cmd.troopBranch);
          if (k) next[k] = (next[k] || 0) + cmd.troops;
        }
        return next;
      });
      return prev.map(c => c.uid===uid ? { ...c, troopSlots:[], troops:0, troopBranch:null } : c);
    });
  }, [setTroopCounts]);

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
    if (tile.isKeepPart && tile.keepPrimaryKey) {
      const primaryTile = tilesRef.current[tile.keepPrimaryKey];
      if (primaryTile) { k = tile.keepPrimaryKey; tile = primaryTile; }
    }

    const mode = modeRef.current;
    const mvCmd = mvCmdRef.current;

    if (mode==="selectMarchDest" && mvCmd) {
      if (k===mvCmd.tk) { setMode("view"); setMvCmd(null); return; }
      if (tile.owner!=="player") { floaty("⚠ Can only move to owned tiles", "#cc8030", k); return; }
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
          setSelKey(k); setPopupPos({ x: px, y: py }); setPopupMode("hqEnter");
          setMode("view"); setAtkKey(null); setPick(null); setMvCmd(null); setReinCmd(null);
        });
      }, 0);
      return;
    }

    const zoom = zoomRef.current;
    const elev = tile.isHQ ? 14 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
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
        setSelKey(k); setPopupPos({ x:px, y:py }); setPopupMode("main"); setEditArmyCmd(null);
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

  // ── Game screen ──
  return (
    <div style={{
      width:"100vw", height:"100vh", position:"relative", overflow:"hidden",
      background:"#0e1014", userSelect:"none",
      touchAction:"none",
      // Phone optimizations: eliminate tap delay and visual tap flash
      WebkitTapHighlightColor:"transparent",
      WebkitTouchCallout:"none",
      WebkitUserSelect:"none",
      // Prevent overscroll bounce on iOS
      overscrollBehavior:"none",
    }}>
      <style>{CSS}
        {`
          * { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
          canvas { touch-action: none !important; }
          button, .btn { touch-action: manipulation; cursor: pointer; }
          [style*="position: fixed"], [style*="position:fixed"] { touch-action: auto; }
          .scr, [style*="overflow-y: auto"], [style*="overflowY: auto"] { touch-action: pan-y !important; }
          .scr * { touch-action: pan-y; }
          .scr button, .scr .btn, .scr input[type="range"] { touch-action: manipulation !important; }
          .gear-picker-list { touch-action: pan-y !important; }
          .gear-picker-list * { touch-action: pan-y; }
          .gear-picker-list button, .gear-picker-list .btn { touch-action: manipulation !important; }
        `}
      </style>

      {/* ── Loading overlay ── */}
      {!mapReady && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#080704",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 18,
        }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
          `}</style>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid #2a2010",
            borderTop: "3px solid #f0c040",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{
            fontFamily: "'Cinzel Decorative',serif", fontSize: 15,
            background: "linear-gradient(135deg,#f0c040,#c03030,#f0c040)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
            letterSpacing: ".15em",
          }}>FOOLS GOLD</div>
          <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              width: "100%", height: 4,
              background: "#1a1508", borderRadius: 2,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${loadPct}%`,
                background: "linear-gradient(90deg,#8a4020,#f0c040)",
                borderRadius: 2,
                transition: "width .4s ease",
              }} />
            </div>
            <div style={{
              fontFamily: "'Cinzel',serif", fontSize: 9,
              color: "#6a5030", letterSpacing: ".12em",
              textAlign: "center",
              animation: "pulse 1.6s ease-in-out infinite",
            }}>{loadLabel}</div>
          </div>
        </div>
      )}

      <HUD facName={facName} facKey={facKey} pKeys={pKeys} rss={rss} gems={gems} tiles={tiles}
        mysticOrbs={mysticOrbs} mysticOrbsCap={mysticOrbsCap} voidTapReady={voidTapReady} />

      {/* Server connection indicator */}
      <div style={{
        position:"fixed", top:8, right:8, zIndex:9999,
        display:"flex", alignItems:"center", gap:5,
        background:"rgba(0,0,0,0.55)", borderRadius:6,
        padding:"3px 8px", fontSize:11, color: serverConnected ? "#4ddd88" : "#dd6644",
        border: serverConnected ? "1px solid #2a7a50" : "1px solid #7a3322",
        pointerEvents:"none",
      }}>
        <span style={{width:7,height:7,borderRadius:"50%",display:"inline-block",
          background: serverConnected ? "#4ddd88" : "#dd6644",
          boxShadow: serverConnected ? "0 0 6px #4ddd88" : "none"}} />
        {serverConnected ? "Server" : "Offline"}
      </div>

      <MapRenderer
        ref={mapRendererRef}
        tiles={tiles} cmds={cmds} selKey={selKey} mode={mode} mvCmd={mvCmd}
        reinMarchesRef={reinMarchesRef}
        panRef={panRef} zoomRef={zoomRef} ZOOM_LEVELS={ZOOM_LEVELS}
        onTileClick={onTileClick}
        onPanChange={onPanChange}
        onZoomChange={handleZoomChange}
        playerHqKey={playerHqKey}
        playerFacKey={facKey}
        playerName={facName}
      />

      {/* Zoom controls removed — use pinch / mouse wheel */}

      {/* Floaties */}
      {floats.map(f => (
        <div key={f.id} style={{position:"fixed",left:f.x,top:f.y,zIndex:600,pointerEvents:"none",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:12,color:f.col,animation:"floatUp 1.8s ease forwards",textShadow:"0 1px 6px rgba(0,0,0,.9)",whiteSpace:"nowrap"}}>
          {f.txt}
        </div>
      ))}

      <TilePopup
        selKey={selKey} selTile={selTile} popupPos={popupPos}
        popupMode={popupMode} setPopupMode={setPopupMode}
        onEnterHQ={onEnterHQ}
        cmds={cmds} cmdsOnSel={cmdsOnSel} marchingToSel={marchingToSel} canAtk={canAtk}
        barracksPool={barracksPool} editArmyCmd={editArmyCmd} setEditArmyCmd={setEditArmyCmd}
        sliderVals={sliderVals} setSliderVals={setSliderVals}
        deletingTiles={deletingTiles} deletingSecsLeft={deletingSecsLeft}
        setDeletingTiles={setDeletingTiles} setDeletingSecsLeft={setDeletingSecsLeft}
        setSelKey={setSelKey} setPopupPos={setPopupPos}
        setAtkKey={setAtkKey} setMode={setMode} setPick={setPick}
        setMvCmd={setMvCmd} setReinCmd={setReinCmd}
        recallMarch={recallMarch} recallStationary={recallStationary}
        setBarracks={setBarracks} setCmds={setCmds}
        nowTick={nowTick}
        playerHqKey={playerHqKey}
        facKey={facKey}
      />

      {showBattleLog && (
        <BattleLog
          battles={battles} bLog={bLog} unseenBattles={unseenBattles}
          onClose={() => setShowBattleLog(false)}
        />
      )}

      {mode==="pickAttackCmd" && (
        <CommanderPicker
          atkKey={atkKey} tiles={tiles} cmdsAdjToSel={cmdsAdjToSel}
          pickCmd={pickCmd} setPick={setPick}
          setMode={setMode} setAtkKey={setAtkKey}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          startMarch={startMarch}
        />
      )}

      {panelOpen && (
        <BottomPanel
          mode={mode} mvCmd={mvCmd} setMvCmd={setMvCmd}
          reinCmd={reinCmd} setReinCmd={setReinCmd}
          cmdsOnSel={cmdsOnSel} barracksPool={barracksPool}
          bldgs={bldgs} sliderVals={sliderVals} setSliderVals={setSliderVals}
          startReinforcement={startReinforcement}
          setMode={setMode} setAtkKey={setAtkKey} setPick={setPick}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          gearInventory={gearInventory}
          reinMarches={reinMarches}
          playerHqKey={playerHqKey}
        />
      )}

      <HQMenu
        hqOpen={hqOpen} setHqOpen={setHqOpen} hqTab={hqTab} setHqTab={setHqTab}
        cmds={cmds} setCmds={setCmds} tiles={tiles} rss={rss} setRss={setRss} gems={gems} pKeys={pKeys}
        bldgs={bldgs} setBldgs={setBldgs} barracksPool={barracksPool} troopCounts={troopCounts} setTroopCounts={setTroopCounts}
        woundedTroops={woundedTroops} woundedQueue={woundedQueue} trainingQueues={trainingQueues}
        trainSlider={trainSlider} setTrainSlider={setTrainSlider} setTrainingQueues={setTrainingQueues}
        upgQueue={upgQueue} sliderVals={sliderVals} setSliderVals={setSliderVals}
        bLog={bLog} upgrade={upgrade} canAfford={canAfford}
        assignTroops={assignTroops} setTroopSlot={setTroopSlot} returnTroops={returnTroops} queueTraining={queueTraining}
        recallMarch={recallMarch} setScreen={setScreen}
        gearInventory={gearInventory}
        playerHqKey={playerHqKey}
        facKey={facKey}
        unlockedBranches={unlockedBranches} setUnlockedBranches={setUnlockedBranches}
        quarterLevels={quarterLevels} setQuarterLevels={setQuarterLevels}
        mysticOrbs={mysticOrbs} mysticOrbsCap={mysticOrbsCap}
        voidTapLvl={voidTapLvl} voidTapReady={voidTapReady}
        lastVoidTap={lastVoidTap} voidTapCooldown={voidTapCooldown}
        doVoidTap={doVoidTap}
        troopSkillLevels={troopSkillLevels} setTroopSkillLevels={setTroopSkillLevels}
        setMysticOrbs={setMysticOrbs}
      />

      {winner && (
        <WinScreen
          winner={winner} aiFaction={aiFaction}
          setWinner={setWinner} setTiles={setTiles} setCmds={setCmds}
          setMode={setMode} setSelKey={setSelKey} setUpgQueue={setUpgQueue}
          setBldgs={setBldgs} setTroopCounts={setTroopCounts}
          setAiRss={setAiRss} setAiBldgs={setAiBldgs} setAiBarracksPool={setAiBarracksPool}
          aiLastActionRef={aiLastActionRef} setScreen={setScreen}
          setWounded={setWounded} setWoundedQueue={setWoundedQueue}
          setRss={setRss} setReinMarches={setReinMarches}
          setTrainingQueues={setTrainingQueues} setBLog={setBLog}
          setBattles={setBattles} setUnseenBattles={setUnseenBattles}
          setDeletingTiles={setDeletingTiles} setDeletingSecsLeft={setDeletingSecsLeft}
          setPlayerHqKey={setPlayerHqKey} setAiHqKeys={setAiHqKeys}
        />
      )}

      <Minimap tiles={tiles} pKeys={pKeys} panRef={panRef} zoomRef={zoomRef} redrawRef={minimapRedrawRef} />

      {/* Wizard's Tomes trigger — bottom-left below minimap */}
      {!tomesOpen && !hqOpen && !cmdScreenOpen && !gearScreenOpen && (
        <button onClick={()=>setTomesOpen(true)} style={{
          position:"fixed", left:8, bottom:90, zIndex:300,
          background:"radial-gradient(circle at 35% 30%, #1a1030, #08060e)",
          border:"1px solid rgba(200,160,64,.25)", borderRadius:"50%",
          width:52, height:52,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", padding:0,
          boxShadow:"0 0 14px rgba(80,40,120,.4), inset 0 1px 0 rgba(255,255,255,.06)",
          touchAction:"manipulation",
        }}>
          <ScrollStackIcon size={38}/>
        </button>
      )}

      {tomesOpen && (
        <WizardsTomes
          open={tomesOpen}
          onClose={()=>setTomesOpen(false)}
          facKey={facKey}
          tomesLevel={tomesLevel}
          setTomesLevel={setTomesLevel}
          powerPool={powerPool}
          setPowerPool={setPowerPool}
          powerPerHr={powerPerHr}
          tomesUnspentPoints={tomesUnspentPoints}
          setTomesUnspentPoints={setTomesUnspentPoints}
        />
      )}

      {gearScreenOpen && (
        <GearScreen
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          cmds={cmds}
          setCmds={setCmds}
          playerAlignment={playerAlignment}
          onClose={() => setGearScreenOpen(false)}
        />
      )}

      {cmdScreenOpen && (
        <CommanderScreen
          cmds={cmds}
          setCmds={setCmds}
          bldgs={bldgs}
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          respectSchematics={respectSchematics}
          onSchematicUsed={(id) => setRespectSchematics(prev => prev.filter(s => s.instanceId !== id))}
          initialUid={cmdScreenUid}
          gems={gems}
          setGems={setGems}
          onClose={() => { setCmdScreenOpen(false); setCmdScreenUid(null); }}
        />
      )}

      {worldMapPrompt && (
        <div style={{
          position:"fixed", inset:0, zIndex:700,
          background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={() => setWorldMapPrompt(false)}>
          <div style={{
            background:"rgba(5,7,11,0.98)",
            border:"1px solid #8a6020",
            borderRadius:8,
            padding:"20px 24px",
            width:220,
            textAlign:"center",
            boxShadow:"0 8px 40px rgba(0,0,0,0.8)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:"#c8a060",marginBottom:8}}>
              🗺 World Map
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"#6a5a4a",marginBottom:16,lineHeight:1.6}}>
              You're at maximum zoom out.<br/>Open the world map?
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={() => { setWorldMapPrompt(false); setWorldMapOpen(true); }}
                style={{
                  padding:"8px 16px",
                  background:"linear-gradient(160deg,#2a1e08,#120e04)",
                  border:"1px solid #8a6020", borderRadius:4,
                  color:"#f0c060", fontFamily:"'Cinzel',serif",
                  fontSize:10, cursor:"pointer",
                }}>Open Map</button>
              <button onClick={() => setWorldMapPrompt(false)}
                style={{
                  padding:"8px 16px",
                  background:"none",
                  border:"1px solid #2a2418", borderRadius:4,
                  color:"#6a5a4a", fontFamily:"'Cinzel',serif",
                  fontSize:10, cursor:"pointer",
                }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {worldMapOpen && (
        <WorldMap
          tiles={tiles}
          crossings={crossingsState}
          onClose={() => setWorldMapOpen(false)}
          onTeleport={teleportTo}
          panRef={panRef}
          zoom={zoomState}
        />
      )}

      <GameBar
        cmds={cmds}
        facName={facName}
        tiles={tiles}
        unseenBattles={unseenBattles}
        setHqOpen={setHqOpen} setHqTab={setHqTab}
        onCenterHQ={centerOnHQ}
        onWorldMap={() => setWorldMapOpen(true)}
        setScreen={setScreen}
        setShowBattleLog={setShowBattleLog}
        setUnseenBattles={setUnseenBattles}
        setCmdScreenOpen={setCmdScreenOpen}
        setCmdScreenUid={setCmdScreenUid}
        setGearScreenOpen={setGearScreenOpen}
        gearInventoryCount={gearInventory.length}
        playerHqKey={playerHqKey}
        hidden={worldMapOpen || hqOpen || cmdScreenOpen || gearScreenOpen || showBattleLog || tomesOpen}
        showPerf={showPerf}
        setShowPerf={setShowPerf}
        panRef={panRef}
        zoomRef={zoomRef}
        mapRendererRef={mapRendererRef}
        voidTapReady={voidTapReady}
      />

      {showPerf && <PerfOverlay open={showPerf} onToggle={() => setShowPerf(v => !v)} />}

    </div>
  );
}

// ── On-screen performance logger — tap to clear, shows last 12 events ─────────
let _perfSetLog = null;
window._perfLog = function(label) {
  const now = performance.now();
  window._perfLogs = window._perfLogs || [];
  const dt = window._perfLogs.length ? Math.round(now - window._perfLogs[window._perfLogs.length-1].t) : 0;
  window._perfLogs = [...window._perfLogs.slice(-11), { label, t: now, dt }];
  _perfSetLog?.(window._perfLogs);
};
function perfLog(label) { window._perfLog(label); }

function PerfOverlay({ open, onToggle }) {
  const [logs, setLogs] = useState([]);
  _perfSetLog = setLogs;

  if (!open) return null;

  return (
    <div style={{
      position:"fixed", top:8, right:8, zIndex:99999,
      fontFamily:"monospace", pointerEvents:"auto",
    }}>
      <div style={{
          width:260,
          background:"rgba(0,0,0,.92)", border:"1px solid #555",
          borderRadius:6, padding:"6px 8px",
          fontSize:10, color:"#ccc",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
            <span style={{color:"#f0c040",fontWeight:700,fontSize:11}}>⏱ PERF LOG</span>
            <span
              onTouchEnd={e=>{e.stopPropagation();window._perfLogs=[];setLogs([]);}}
              onClick={e=>{e.stopPropagation();window._perfLogs=[];setLogs([]);}}
              style={{color:"#aaa",padding:"2px 8px",background:"#333",borderRadius:3,cursor:"pointer"}}>CLR</span>
          </div>
          {logs.length === 0
            ? <div style={{color:"#666",fontSize:9}}>tap a tile or pan to record...</div>
            : logs.map((l,i) => (
              <div key={i} style={{
                display:"flex",justifyContent:"space-between",
                borderBottom:"1px solid #222",padding:"2px 0",
                color: l.dt > 100 ? "#ff5050" : l.dt > 33 ? "#f0c040" : "#66dd66"
              }}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{l.label}</span>
                <span style={{marginLeft:8,flexShrink:0,fontWeight:700}}>+{l.dt}ms</span>
              </div>
            ))
          }
          <div style={{fontSize:8,color:"#555",marginTop:3}}>🔴&gt;100ms 🟡&gt;33ms 🟢fast</div>
        </div>
    </div>
  );
}
