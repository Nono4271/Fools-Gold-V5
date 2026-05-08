import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { flushSync, unstable_batchedUpdates } from "react-dom";
import { MapRenderer, clearKeepCache } from "./MapRenderer";

// Constants
import { CSS } from "./constants/css.js";
import { ALIGNMENT, getFactionAlignment, PLAYABLE_FACTIONS } from "../shared/constants/factions.js";
import { HDEFS, RC, RARITY, CLASS, rollGacha, addRespect, RESPECT_DUPE_POINTS, RESPECT_OVERFLOW_POINTS, RESPECT_MAX, npcForPowerLevel } from "../shared/constants/heroes.js";
import { rollFullPull, rollGearSchematic, createRespectSchematic, GEAR_RARITY, GEAR_SLOTS, rollFullPullCmdRarity } from "../shared/constants/gear.js";
import { HQP, AI_HQ_KEY, WIN_KEY, RKEYS, RSS, POWER_DEFS, SIEGE_BASE, SIEGE_KEEP_BASE, calcSiegePower, hqSiegeValue } from "../shared/constants/map.js";
import { FACTION_TROOPS, COMMAND_COST, CMD_LVL_MAX, xpToNext } from "../shared/constants/troops.js";
import { barracksCapacity, cmdCommand, upgCost, upgDuration, maxAvailLevel, trainRate, maxTrainBatch, tierFromBranchLevel } from "../shared/constants/buildings.js";
import { isoXY, TW, TH, ISO_W, ISO_H } from "../shared/constants/geometry.js";
import { FACTION_REGIONS, REGION_LIST } from "../shared/constants/regions.js";

// Utils
import { bfsPath, adj, effectiveMarchSpd, marchStepMs, setImpassableTiles } from "../shared/utils/pathfinding.js";
import { applyGearToCmd } from "../shared/utils/gearStats.js";
import { garrisonDefCmd } from "../shared/utils/battle.js";

// Hooks
import { useResources } from "./hooks/useResources.js";
import { useAI } from "./hooks/useAI.js";
import { useTraining } from "./hooks/useTraining.js";
import { useMarch } from "./hooks/useMarch.js";
import { useUpgrades } from "./hooks/useUpgrades.js";
import { useGameLoop } from "./hooks/useGameLoop.js";
import { usePathfinding } from "./hooks/usePathfinding.js";
import { useServerSync } from "./hooks/useServerSync.js";

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
import GameBar from "./components/game/GameBar.jsx";
import CommanderScreen from "./components/screens/CommanderScreen.jsx";
import GearScreen from "./components/screens/GearScreen.jsx";

// Backwards-compat shims
const SC = RC;
const SS = (rarity) => RARITY[rarity]?.n ?? String(rarity);

export default function RiseToWar() {
  // ── Screens ──
  const [screen,  setScreen]  = useState("title");
  const [facKey,  setFacKey]  = useState("pirates");
  const [facName, setFacName] = useState("Pirates");
  const playerAlignment = getFactionAlignment(facKey);

  // ── Tiles — stored in a mutable ref to avoid 490k React reconciliation ──
  const [tileVersion, setTileVersion] = useState(0);
  const tilesMapRef = useRef({});
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

  // Player and AI tile key indexes — maintained in patchTile on ownership changes
  // so useAI and Minimap never scan all 490k tiles.
  const pKeysRef = useRef(new Set());
  const [pKeys, setPKeys] = useState(() => new Set());
  const aiTileKeysRef = useRef(new Set());

  const patchTile = useCallback((key, patch) => {
    const t = tilesMapRef.current[key];
    if (!t) return;
    // Create a new root object so useMemo returns a new reference,
    // which triggers MapRenderer's useEffect([tiles]) and redraws immediately.
    tilesMapRef.current = { ...tilesMapRef.current, [key]: { ...t, ...patch } };
    const updated = tilesMapRef.current[key];
    // Keep defeatedTilesRef in sync
    if ('garrisonDefeated' in patch || 'resetAt' in patch) {
      if (updated.garrisonDefeated && updated.resetAt) {
        defeatedTilesRef.current[key] = { garrisonDefeated: true, resetAt: updated.resetAt };
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
      // Keep AI tile index in sync
      const newAiSet = new Set(aiTileKeysRef.current);
      if (patch.owner === "ai") newAiSet.add(key);
      else newAiSet.delete(key);
      aiTileKeysRef.current = newAiSet;
      // Ownership changed — redraw PIXI canvas immediately rather than waiting
      // for the React effect chain (setTileVersion → render → useEffect → redraw).
      // This eliminates the 1-2 frame delay where the tile shows its old colour.
      mapRendererRef.current?.forceRedrawTiles(tilesMapRef.current);
    }
    setTileVersion(v => v + 1);
  }, []);

  const [mapReady, setMapReady] = useState(false);
  // Stable session ID — generated once per browser session
  const [sessionId] = useState(() => `fg-${Math.random().toString(36).slice(2,10)}`);
  const [loadPct,  setLoadPct]  = useState(0);
  const [loadLabel,setLoadLabel]= useState("Generating world...");
  const [playerHqKey, setPlayerHqKey] = useState(null);
  const [rss,    setRss]     = useState({ stone:300, wood:300, ore:300, gas:300 });
  const [gems,   setGems]    = useState(4400);

  const [playerCmds, setPlayerCmds] = useState([]);
  const aiCmdsRef = useRef([]);
  const cmdsRef = useRef([]);
  useEffect(() => { cmdsRef.current = [...playerCmds, ...aiCmdsRef.current]; }, [playerCmds]);

  const setAiCmds = useCallback((updater) => {
    aiCmdsRef.current = typeof updater === "function" ? updater(aiCmdsRef.current) : updater;
    // Re-derive from cmdsRef (player portion) rather than stale playerCmds closure.
    const curPlayer = cmdsRef.current.filter(c => c.owner === "player");
    cmdsRef.current = [...curPlayer, ...aiCmdsRef.current];
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

  const cmds = playerCmds;
  const [coll,   setColl]    = useState([]);
  const [pityCounters,   setPityCounters]   = useState({ soldier:0, veteran:0, champion:0 });
  const [gearInventory,       setGearInventory]       = useState([]);
  const [respectSchematics,   setRespectSchematics]   = useState([]);
  const [pullResults,         setPullResults]         = useState([]);
  const [lastFreePull,   setLastFreePull]   = useState(null);
  const [dailyHalfUsed, setDailyHalfUsed]  = useState(false);
  const [bldgs,  setBldgs]   = useState({ hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 });
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
  const playerHqRef = useRef(null);

  useEffect(() => { aiBldgsRef.current = aiBldgs;        }, [aiBldgs]);
  useEffect(() => { aiPoolRef.current  = aiBarracksPool; }, [aiBarracksPool]);
  useEffect(() => { playerHqRef.current = playerHqKey;   }, [playerHqKey]);

  // ── Bug 3 fix: reset dailyHalfUsed at 00:00 UTC ──
  useEffect(() => {
    const scheduleReset = () => {
      const now = new Date();
      const msUntilMidnightUTC = (
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
        - Date.now()
      );
      const t = setTimeout(() => {
        setDailyHalfUsed(false);
        scheduleReset();
      }, msUntilMidnightUTC);
      return t;
    };
    const t = scheduleReset();
    return () => clearTimeout(t);
  }, []);

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
    Object.values(tilesMapRef.current).filter(t => t.isHQ && t.owner === "ai").forEach(tile => {
      const newSiege = Math.min(tile.siege ?? newAiSiegeMax, newAiSiegeMax);
      patchTile(tile.k, { siegeMax: newAiSiegeMax, siege: newSiege });
    });
  }, [aiBldgs.walls, mapReady]);

  const [barracksPool,   setBarracks]      = useState(barracksCapacity(0));
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
  const [woundedTroops,  setWounded]       = useState(0);
  const [woundedQueue,   setWoundedQueue]  = useState(0);
  const [trainingQueue,  setTrainingQueue] = useState(null);
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

    worker.onmessage = (e) => {
      const { type, pct, label, buffers, meta, spawnKeys } = e.data;

      if (type === "progress") {
        setLoadPct(pct);
        if (label) setLoadLabel(label);
        return;
      }

      if (type === "done") {
        worker.terminate();
        setLoadPct(100);
        setLoadLabel("Building world...");

        // ── Reconstruct tile map from zero-copy typed arrays ──────────────
        // Workers transfer ArrayBuffers — wrap them back into typed arrays.
        const terrainArr  = new Uint8Array(buffers.terrain);
        const ownerArr    = new Uint8Array(buffers.owner);
        const rssArr      = new Uint8Array(buffers.rss);
        const troopArr    = new Uint8Array(buffers.troop);
        const powerArr    = new Uint8Array(buffers.power);
        const regionArr   = new Uint8Array(buffers.region);
        const flagArr     = new Uint8Array(buffers.flags);
        const garrisonArr = new Uint32Array(buffers.garrison);
        const siegeArr    = new Uint32Array(buffers.siege);
        const siegeMaxArr = new Uint32Array(buffers.siegeMax);
        const keepPrimArr = new Int32Array(buffers.keepPrim);

        const {
          COLS: C, ROWS: R,
          regionList, keepMeta,
          TERRAIN_DEC, RSS_DEC, TROOP_DEC, OWNER_DEC,
          F_SHORE, F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_WIN, F_DEFEATED,
        } = meta;

        // Build region lookup by index
        const regionByIdx = {};
        regionList.forEach((reg, i) => { regionByIdx[i+1] = reg; });

        // Build keepPrimaryKey lookup: flat index → "cx,cy" string
        const keepPrimKeyCache = {};

        const rawMap = {};
        for (let r=0; r<R; r++) {
          for (let c=0; c<C; c++) {
            const idx   = r*C+c;
            const flags = flagArr[idx];
            const k     = `${c},${r}`;
            const reg   = regionByIdx[regionArr[idx]] || null;

            const isShore   = !!(flags & F_SHORE);
            const isKeep    = !!(flags & F_KEEP);
            const isKeepPart= !!(flags & F_KEEPPART);
            const isHQ      = !!(flags & F_HQ);
            const isHQPart  = !!(flags & F_HQPART);
            const isWin     = !!(flags & F_WIN);

            const owner = OWNER_DEC[ownerArr[idx]] || null;

            let keepPrimaryKey = null;
            if (isKeepPart) {
              const pi = keepPrimArr[idx];
              if (!keepPrimKeyCache[pi]) {
                const pc = pi % C, pr = Math.floor(pi / C);
                keepPrimKeyCache[pi] = `${pc},${pr}`;
              }
              keepPrimaryKey = keepPrimKeyCache[pi];
            }

            const km = (isKeep && keepMeta[k]) ? keepMeta[k] : null;

            rawMap[k] = {
              c, r, k,
              terrain:    isShore ? "shore" : TERRAIN_DEC[terrainArr[idx]] || "grass",
              rss:        RSS_DEC[rssArr[idx]] || null,
              troopBranch: null, // assigned per-commander, not per-tile
              powerLevel: powerArr[idx],
              regionKey:  reg?.key   || null,
              regionName: reg?.name  || null,
              keepName:   km?.keepName || (isKeepPart && reg ? reg.keepName : null),
              owner,
              garrison:   garrisonArr[idx],
              garrisonTroops: garrisonArr[idx],
              hasAiCommander: false,
              siege:      siegeArr[idx],
              siegeMax:   siegeMaxArr[idx],
              garrisonDefeated: !!(flags & F_DEFEATED),
              resetAt:    null,
              isShore, isKeep, isKeepPart, isHQ, isHQPart, isWin,
              keepPrimaryKey,
              defCmd:     km?.defCmd || null,
            };
          }
        }

        setLoadLabel("Almost there...");

        // Place player HQ
        const playerSpawn = spawnKeys[facKey];
        if (playerSpawn && rawMap[playerSpawn]) {
          rawMap[playerSpawn] = {
            ...rawMap[playerSpawn],
            owner: "player", isHQ: true, garrison: 0,
            terrain: "grass", rss: null, defCmd: null,
            siege: hqSiegeValue(0), siegeMax: hqSiegeValue(0),
            garrisonDefeated: false, resetAt: null,
          };
          const [hc, hr] = playerSpawn.split(",").map(Number);
          [[1,0],[0,1],[1,1]].forEach(([dc,dr]) => {
            const fk = `${hc+dc},${hr+dr}`;
            if (rawMap[fk] && !rawMap[fk].isShore) {
              rawMap[fk] = { ...rawMap[fk], isHQPart: true, hqPrimaryKey: playerSpawn,
                terrain: "grass", rss: null, owner: "player" };
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

        // Place AI HQs
        const allFactions = ["pirates","merfolk","marines","orcs","bountyhunters","dragons"];
        const aiFactions  = allFactions.filter(f => f !== facKey);
        const newAiHqKeys = {};
        aiFactions.forEach(aiFk => {
          const spawn = spawnKeys[aiFk];
          if (spawn && rawMap[spawn]) {
            rawMap[spawn] = {
              ...rawMap[spawn],
              owner: "ai", isHQ: true, garrison: 0,
              terrain: "grass", rss: null, defCmd: null,
              siege: hqSiegeValue(0), siegeMax: hqSiegeValue(0),
              garrisonDefeated: false, resetAt: null,
            };
            const [ahc, ahr] = spawn.split(",").map(Number);
            [[1,0],[0,1],[1,1]].forEach(([dc,dr]) => {
              const fk = `${ahc+dc},${ahr+dr}`;
              if (rawMap[fk] && !rawMap[fk].isShore) {
                rawMap[fk] = { ...rawMap[fk], isHQPart: true, hqPrimaryKey: spawn,
                  terrain: "grass", rss: null, owner: "ai" };
              }
            });
            newAiHqKeys[aiFk] = spawn;
          }
        });
        setAiHqKeys(newAiHqKeys);

        const oppAlign   = playerAlignment === "humans" ? "creatures" : "humans";
        const primaryAiFk = aiFactions.find(f =>
          (oppAlign === "humans"
            ? ["pirates","marines","bountyhunters"]
            : ["merfolk","orcs","dragons"]).includes(f)
        ) || aiFactions[0];
        setAiFaction(primaryAiFk);

        setPlayerCmds(prev => prev.map(cmd => {
          if (cmd.owner === "player") {
            const spawn = spawnKeys[facKey];
            return spawn ? { ...cmd, tk: spawn } : cmd;
          }
          if (cmd.owner === "ai" && cmd.faction) {
            const spawn = spawnKeys[cmd.faction];
            return spawn ? { ...cmd, tk: spawn } : cmd;
          }
          return cmd;
        }));

        rawMap.__ready = true;
        const impassableKeys = Object.values(rawMap)
          .filter(t => t.isShore)
          .map(t => t.k);
        setImpassableTiles(impassableKeys);
        initPathfinding(impassableKeys);
        clearKeepCache();
        setTiles(rawMap);
        setTimeout(() => {
          mapRendererRef.current?.teleport(panRef.current.x, panRef.current.y);
        }, 100);
      }
    };

    worker.onerror = (err) => {
      console.error("mapGen worker error:", err);
      worker.terminate();
      setLoadLabel("Error generating map — please refresh");
    };

    worker.postMessage({ facKey });

    return () => worker.terminate();
  }, [screen]);

  // ── Reset mapReady when leaving game ──
  useEffect(() => {
    if (screen !== "game") {
      setMapReady(false);
      clearKeepCache();
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

  // ── Hooks ──
  useResources({ screen, tilesRef, setRss });

  const { initPathfinding, findPath, findPathBatch } = usePathfinding();


  // ── Server sync — authoritative tile state ──
  const { emitTileCapture, emitTileSiege, connected: serverConnected } = useServerSync({
    screen,
    tiles,
    mapReady,
    patchTile,
    sessionId,
  });
  const { tickAiRss, tickAiMarch, tickAiEcon } = useAI({
    screen, aiFaction,
    cmdsRef, tilesRef, aiRssRef, aiBldgsRef, aiPoolRef, aiLastActionRef,
    aiTileKeysRef,
    setCmds: setAiCmds,
    setAiRss, setAiBldgs, setAiBarracksPool,
  });

  useTraining({ screen, bldgs, setTrainingQueue, setBarracks, setWounded, woundedQueue, setWoundedQueue });

  useUpgrades({ screen, setUpgQueue, setBldgs, setBarracks });

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
          tilesMapRef.current[k] = { ...tile, siege: tile.siegeMax, garrisonDefeated: false, resetAt: null };
          delete defeatedTilesRef.current[k]; // keep index in sync
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
                  setBarracks(pool => {
                    const cap   = barracksCapacity(bldgs.barracks || 0);
                    const space = Math.max(0, cap - pool);
                    return pool + Math.min(capturedRm.amount, space);
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
              setBarracks(pool => {
                const cap   = barracksCapacity(bldgs.barracks || 0);
                const space = Math.max(0, cap - pool);
                return pool + Math.min(rm.amount, space);
              });
              floaty(`🏰 ${rm.amount} reinforcements returned to barracks`, "#88aaff", hqKey);
            } else {
              setPlayerCmds(cmds => cmds.map(c => {
                if (c.uid !== rm.cmdUid) return c;
                const cap       = cmdCommand(c.lvl||5, bldgs.commandcenter||0, (c.cls==="leader"&&(c.lvl||5)>=25)?500:0);
                const newTroops = Math.min(cap, (c.troops||0) + rm.amount);
                const overflow  = ((c.troops||0) + rm.amount) - newTroops;
                if (overflow > 0) {
                  setBarracks(pool => {
                    const bCap  = barracksCapacity(bldgs.barracks || 0);
                    const space = Math.max(0, bCap - pool);
                    return pool + Math.min(overflow, space);
                  });
                  floaty(`↩ ${overflow} troops returned (cmd full)`, "#88aaff", rm.path[rm.path.length-1]);
                }
                return { ...c, troops: newTroops };
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
          patchTile(key, { owner:null, garrison:pd?pd.troops:50, siege:t.siegeMax??SIEGE_BASE, siegeMax:t.siegeMax??SIEGE_BASE, garrisonDefeated:false, resetAt:null, defCmd:pd?{n:npc2.n,icon:npc2.icon,cls:npc2.cls,faction:null,rarity:'soldier',lvl:pd.cmdLvl,troops:pd.troops,troopBranch:npc2.troopBranch,atk:npc2.atk*pd.cmdLvl,spd:npc2.spd+pd.cmdLvl*2}:null });
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

  useEffect(() => {
    if (!tilesMapRef.current.__ready) return;
    const newSet = new Set(Object.keys(tilesMapRef.current).filter(k => tilesMapRef.current[k]?.owner === "player"));
    pKeysRef.current = newSet;
    setPKeys(newSet);
    // Build AI index at map-ready time too
    const aiSet = new Set(Object.keys(tilesMapRef.current).filter(k => tilesMapRef.current[k]?.owner === "ai"));
    aiTileKeysRef.current = aiSet;
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
      cmd.owner === "player" && (cmd.troops||0) > 0 && !cmd.march
    );
  }, [selAdjToPlayer, selTile, playerCmds]);

  const canAtk = !!(selTile && selTile.owner!=="player" && selAdjToPlayer);

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
    if (!cmd || !destKey || cmd.march) return;
    if (!cmd.troops || cmd.troops < 1) { floaty("⚠ Assign troops first!", "#cc8030", cmd.tk); return; }
    const destTile = tilesMapRef.current[destKey];
    const type = destTile?.owner==="player" ? "move" : "attack";
    if (type==="move" && destTile?.owner!=="player") return;
    const boostedSpd = applyGearToCmd(cmd, gearInventory).spd || 60;
    const stepMs = marchStepMs(effectiveMarchSpd(boostedSpd, cmd.troopBranch));
    setMode("view"); setMvCmd(null); setSelKey(null); setPopupPos(null);
    findPath(cmd.tk, destKey).then(path => {
      if (!path || path.length < 2) return;
      setCmds(p => p.map(c => c.uid===cmd.uid ? { ...c, march:{ type, path, step:0, dest:destKey, origin:cmd.tk, stepMs, lastStepTime:Date.now() } } : c));
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
    const stepMs = marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, cmd.troopBranch));
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
    const stepMs = Math.max(100, Math.floor(marchStepMs(effectiveMarchSpd(applyGearToCmd(cmd, gearInventory).spd||60, cmd.troopBranch))/2));
    setMode("view"); setReinCmd(null);
    setSliderVals(v => ({ ...v, [`rein_${cmd.uid}`]:undefined }));
    findPath(hqKey, cmd.tk).then(path => {
      if (!path || path.length < 2) return;
      setReinMarches(prev => {
        if (prev.some(r => r.cmdUid === cmd.uid && !r.returning)) return prev;
        setBarracks(pool => Math.max(0, pool - amount));
        return [...prev, { uid:`rein_${Date.now()}`, cmdUid:cmd.uid, amount, path, step:0, stepMs, lastStepTime:Date.now() }];
      });
    });
  }, [gearInventory, findPath]);

  const canAfford = useCallback(c => Object.entries(c).every(([k,v]) => (rss[k]||0)>=v), [rss]);

  const queueTraining = useCallback((amount) => {
    if (trainingQueue) return;
    const cap = barracksCapacity(bldgs.barracks||0);
    if (barracksPool + amount > cap) return;
    const cost = { stone:amount*2, wood:amount*2, ore:amount, gas:Math.floor(amount*0.5) };
    if (!canAfford(cost)) return;
    setRss(p => ({ stone:p.stone-cost.stone, wood:p.wood-cost.wood, ore:p.ore-cost.ore, gas:p.gas-cost.gas }));
    setTrainingQueue({ amount, remaining:amount, total:amount, cost });
  }, [canAfford, bldgs.barracks, barracksPool, trainingQueue]);

  const assignTroops = useCallback((uid, troopBranch, newTotal) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd) return prev;
      const commandCap = cmdCommand(cmd.lvl||5, bldgs.commandcenter||0, (cmd.cls==="leader"&&(cmd.lvl||5)>=25)?500:0);
      // Command cost per troop varies by size: small=1, medium=2, large=25
      const branchSize = troopBranch
        ? (FACTION_TROOPS[troopBranch.faction]?.branches?.find(b => b.key === troopBranch.branch)?.size ?? "small")
        : "small";
      const cmdCost = COMMAND_COST[branchSize] ?? 1;
      // Max troops this commander can field given command cap and cost-per-troop
      const maxByCommand = Math.floor(commandCap / cmdCost);
      const branchChanged = JSON.stringify(cmd.troopBranch) !== JSON.stringify(troopBranch);
      const oldTroops    = branchChanged ? 0 : (cmd.troops||0);
      const oldReturning = branchChanged ? (cmd.troops||0) : 0;
      const capped       = Math.min(newTotal, maxByCommand);
      const canDraw      = barracksPool + oldReturning;
      const delta        = capped - oldTroops;
      const finalTotal   = delta > 0 ? oldTroops + Math.min(delta, canDraw) : capped;
      setBarracks(pool => {
        const poolAfterReturn = pool + oldReturning;
        const drawn    = Math.max(0, finalTotal - oldTroops);
        const returned = Math.max(0, oldTroops  - finalTotal);
        return poolAfterReturn - drawn + returned;
      });
      return prev.map(c => c.uid===uid ? { ...c, troopBranch, troops:finalTotal } : c);
    });
  }, [barracksPool, bldgs.commandcenter]);

  const returnTroops = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid===uid);
      if (!cmd || !cmd.troops) return prev;
      setBarracks(pool => pool + (cmd.troops||0));
      return prev.map(c => c.uid===uid ? { ...c, troops:0, troopBranch:null } : c);
    });
  }, []);

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

  const todayUTC = () => new Date().toISOString().slice(0, 10);
  const isFreeAvailable  = lastFreePull !== todayUTC();
  const isHalfAvailable  = !isFreeAvailable && !dailyHalfUsed;

  const pullCost = (n) => {
    if (n === 10) return 4000;
    if (isFreeAvailable)  return 0;
    if (isHalfAvailable)  return 200;
    return 400;
  };

  const pull = useCallback((n) => {
    const cost = pullCost(n);
    if (cost > 0 && gems < cost) return;

    if (cost > 0) setGems(g => g - cost);
    if (isFreeAvailable && n === 1)      setLastFreePull(todayUTC());
    else if (isHalfAvailable && n === 1) setDailyHalfUsed(true);

    const alignFactions    = ALIGNMENT[playerAlignment]?.factions;
    const playerAlignKey   = playerAlignment;
    const hqk              = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
    const newPity          = { ...pityCounters };
    const newGear          = [];
    const newSchematics    = [];
    const allPullResults   = [];

    const commanderPool = HDEFS.filter(h => alignFactions && alignFactions.includes(h.faction));

    for (let p = 0; p < n; p++) {
      const { slot1, slot2, slot3 } = rollFullPull(alignFactions, playerAlignKey, newPity, commanderPool);
      const slots = [slot1, slot2, slot3];

      const pullRow = { id: `pr_${Date.now()}_${p}`, slots: [] };

      slots.forEach(slot => {
        if (slot.type === "commander") {
          const forcedRarity = rollFullPullCmdRarity();
          const biasedCounters = { ...newPity };
          if (forcedRarity === "champion") biasedCounters.champion = 300;
          else if (forcedRarity === "veteran") biasedCounters.veteran = 100;
          else biasedCounters.soldier = 20;
          const [cmdResult] = rollGacha(1, alignFactions, biasedCounters);
          newPity[forcedRarity] = 0;
          pullRow.slots.push({ type: "commander", data: cmdResult });
        } else if (slot.type === "respectSchematic") {
          newSchematics.push(slot);
          pullRow.slots.push({ type: "respectSchematic", data: slot });
        } else {
          newGear.push(slot);
          pullRow.slots.push({ type: "gear", data: slot });
        }
      });

      allPullResults.push(pullRow);
    }

    setPityCounters(newPity);
    setPullResults(allPullResults);

    if (newGear.length) setGearInventory(prev => [...prev, ...newGear]);

    const cmdResults = allPullResults
      .flatMap(pr => pr.slots)
      .filter(s => s.type === "commander")
      .map(s => s.data);

    const processedSchematics = newSchematics.map(s => {
      if (s.isGeneric) return s;
      return s;
    });
    if (processedSchematics.length) setRespectSchematics(prev => [...prev, ...processedSchematics]);

    if (cmdResults.length) {
      setCmds(prev => {
        const nx = [...prev];
        const overflowSchematics = [];
        cmdResults.forEach(h => {
          const existing = nx.find(x => x.id === h.id && x.owner === "player");
          if (!existing) {
            nx.push({ ...h, uid:h.uid, troops:0, troopBranch:null, tk:hqk, owner:"player", lvl:5, xp:0,
              respectPoints:0, respectLevel:0, skillPoints:{}, unspentSkillPoints:5,
              gear:{ helmet:null, armor:null, bracers:null, accessory:null } });
          } else {
            const points = existing.respectLevel >= RESPECT_MAX
              ? RESPECT_OVERFLOW_POINTS
              : RESPECT_DUPE_POINTS[h.rarity] ?? 120;
            const idx = nx.indexOf(existing);
            const updated = addRespect(existing, points);
            if (updated._justPromoted) floaty(`⬆ ${existing.n} → ${updated.rarity}!`, "#f0c040", hqk);
            nx[idx] = { ...updated, _justPromoted: null };
          }
        });
        if (processedSchematics.length) {
          const converted = processedSchematics.map(s => {
            if (s.isGeneric || !s.commanderId) return null;
            const ownerCmd = nx.find(x => x.id === s.commanderId && x.owner === "player");
            if (ownerCmd && ownerCmd.respectLevel >= RESPECT_MAX) {
              return { ...s, isGeneric: true, commanderId: null, commanderName: null,
                points: 30, n: `Generic ${s.rarity.charAt(0).toUpperCase() + s.rarity.slice(1)} Schematic` };
            }
            return null;
          }).filter(Boolean);
          if (converted.length) {
            setRespectSchematics(prev => {
              const ids = new Set(converted.map(c => c.instanceId));
              return [...prev.filter(x => !ids.has(x.instanceId)), ...converted];
            });
          }
        }
        return nx;
      });
      setColl(prev => {
        const nx = [...prev];
        cmdResults.forEach(h => { if (!nx.find(x => x.id === h.id)) nx.push(h); });
        return nx;
      });
    }
  }, [gems, playerAlignment, pityCounters, isFreeAvailable, isHalfAvailable]);

  // ── Tile click ──
  const onTileClick = useCallback((k, e) => {
    perfLog(`tap:${k}`);
    if (e?.stopPropagation) e.stopPropagation();
    const tile = tilesRef.current[k];
    if (!tile) return;
    if (tile.isShore) return;

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
      setAiFaction={setAiFaction} setAiRss={setAiRss} setAiBldgs={setAiBldgs}
      setAiBarracksPool={setAiBarracksPool} aiLastActionRef={aiLastActionRef}
      setCmds={setCmds} setColl={setColl} setTiles={setTiles}
      setBarracks={setBarracks} setUnlockedBranches={setUnlockedBranches}
      setQuarterLevels={setQuarterLevels}
    />
  );
  if (screen==="gacha")   return (
    <GachaScreen
      screen={screen} tiles={tiles} gems={gems} pull={pull}
      pullResults={pullResults} coll={coll}
      gearInventory={gearInventory} setGearInventory={setGearInventory}
      respectSchematics={respectSchematics}
      cmds={cmds} setCmds={setCmds}
      onSchematicUsed={(id) => setRespectSchematics(prev => prev.filter(s => s.instanceId !== id))}
      pityCounters={pityCounters}
      isFreeAvailable={isFreeAvailable}
      isHalfAvailable={isHalfAvailable}
      playerAlignment={playerAlignment} setScreen={setScreen}
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

      <HUD facName={facName} pKeys={pKeys} rss={rss} gems={gems} />

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
        bldgs={bldgs} setBldgs={setBldgs} barracksPool={barracksPool} setBarracks={setBarracks}
        woundedTroops={woundedTroops} woundedQueue={woundedQueue} trainingQueue={trainingQueue}
        trainSlider={trainSlider} setTrainSlider={setTrainSlider}
        upgQueue={upgQueue} sliderVals={sliderVals} setSliderVals={setSliderVals}
        bLog={bLog} upgrade={upgrade} canAfford={canAfford}
        assignTroops={assignTroops} returnTroops={returnTroops} queueTraining={queueTraining}
        recallMarch={recallMarch} setScreen={setScreen}
        gearInventory={gearInventory}
        playerHqKey={playerHqKey}
        facKey={facKey}
        unlockedBranches={unlockedBranches} setUnlockedBranches={setUnlockedBranches}
        quarterLevels={quarterLevels} setQuarterLevels={setQuarterLevels}
      />

      {winner && (
        <WinScreen
          winner={winner} aiFaction={aiFaction}
          setWinner={setWinner} setTiles={setTiles} setCmds={setCmds}
          setMode={setMode} setSelKey={setSelKey} setUpgQueue={setUpgQueue}
          setBldgs={setBldgs} setBarracks={setBarracks}
          setAiRss={setAiRss} setAiBldgs={setAiBldgs} setAiBarracksPool={setAiBarracksPool}
          aiLastActionRef={aiLastActionRef} setScreen={setScreen}
          setWounded={setWounded} setWoundedQueue={setWoundedQueue}
          setRss={setRss} setReinMarches={setReinMarches}
          setTrainingQueue={setTrainingQueue} setBLog={setBLog}
          setBattles={setBattles} setUnseenBattles={setUnseenBattles}
          setDeletingTiles={setDeletingTiles} setDeletingSecsLeft={setDeletingSecsLeft}
          setPlayerHqKey={setPlayerHqKey} setAiHqKeys={setAiHqKeys}
        />
      )}

      <Minimap tiles={tiles} pKeys={pKeys} panRef={panRef} zoomRef={zoomRef} redrawRef={minimapRedrawRef} />

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
          onClose={() => setWorldMapOpen(false)}
          onTeleport={teleportTo}
          panRef={panRef}
          zoom={zoomState}
        />
      )}

      <GameBar
        cmds={cmds}
        facName={facName}
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
        hidden={worldMapOpen || hqOpen}
        showPerf={showPerf}
        setShowPerf={setShowPerf}
      />

      {showPerf && <PerfOverlay />}

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

function PerfOverlay() {
  const [logs, setLogs] = useState([]);
  const [visible, setVisible] = useState(true);
  _perfSetLog = setLogs;

  return (
    <div style={{
      position:"fixed", top:100, left:8, zIndex:99999, width:260,
      background:"rgba(0,0,0,.92)", border:"1px solid #555",
      borderRadius:6, padding:"6px 8px",
      fontSize:10, fontFamily:"monospace", color:"#ccc",
      pointerEvents:"auto",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
        <span style={{color:"#f0c040",fontWeight:700,fontSize:11}}>⏱ PERF</span>
        <span onTouchEnd={e=>{e.stopPropagation();window._perfLogs=[];setLogs([]);}}
          style={{color:"#aaa",padding:"2px 8px",background:"#333",borderRadius:3}}>CLR</span>
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
  );
}
