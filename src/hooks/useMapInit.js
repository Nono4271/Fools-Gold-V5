import { useEffect } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { clearHQCache } from "../MapRenderer";
import { isoXY } from "../../shared/constants/geometry.js";
import { barracksCapacity } from "../../shared/constants/buildings.js";
import { setImpassableTiles } from "../../shared/utils/pathfinding.js";
import {
  ALL_FACTIONS, decodeBuffers, createTileMap, stampPlayerHq, aiHqKeysByFaction, aiPlayerId,
  initialAiCommanders, crewFounders, FOUNDER_GEMS, primaryAiFaction, spawnEligibleKeys,
} from "../../shared/utils/worldTiles.js";

const INIT_AI_BLDGS = { hq:1, quarry:0, lumber:0, forge:0, refinery:0, barracks:0, training:0, commandcenter:0, healingtent:0, walls:0 };
const INIT_ZOOM = 1.25;

// World generation on game start (mapGen worker), world reset when leaving to
// title/faction, and the mapReady flag. Rules live in shared/utils/worldTiles.js.
export function useMapInit({
  screen, facKey, playerAlignment, tiles, tileVersion, tilesMapRef, setTiles,
  setLoadPct, setLoadLabel, setMapReady, setPlayerHqKey,
  panRef, zoomRef, setZoomState, mapRendererRef,
  aiHqKeysRef, aiRssMapRef, aiBldgsMapRef, aiPoolMapRef, aiTileKeysMapRef,
  aiPlayerIdMapRef, spawnedAiHqsRef, aiGemsRef, aiFoundersRef, pKeysRef, eligibleSpawnKeysRef,
  setCrossingsState, setKeepMeta, setAiHqKeys, setAiFactionKeys, setAiCmds, setAiCmdsVersion,
  setAiFaction, setPlayerCmds, initPathfinding, perfLog, mapSeedRef,
}) {
  // ── Generate the world when a game starts ──
  useEffect(() => {
    if (screen !== "game" || tiles.__ready) return;
    setLoadPct(0);
    setLoadLabel("Generating world...");

    const worker = new Worker(new URL("../workers/mapGen.worker.js", import.meta.url), { type: "module" });

    worker.onmessage = (e) => {
      const { type, pct, label, buffers, meta, spawnKeys, factionTileKeys } = e.data;
      if (type === "progress") {
        setLoadPct(pct);
        if (label) setLoadLabel(label);
        return;
      }
      if (type !== "done") return;
      worker.terminate();
      setLoadPct(10);
      setLoadLabel("Building world...");

      const arrays = decodeBuffers(buffers);
      const { map: rawMap, store, regionByIdx } = createTileMap(arrays, meta);
      setLoadPct(90);
      setLoadLabel("Almost there...");

      // Player HQ + initial camera on it.
      const playerSpawn = spawnKeys[facKey]?.[0] || null;
      if (stampPlayerHq(rawMap, playerSpawn, facKey)) {
        setPlayerHqKey(playerSpawn);
        const [hc, hr] = playerSpawn.split(",").map(Number);
        const { cx, cy } = isoXY(hc, hr);
        panRef.current = { x: -cx * INIT_ZOOM + window.innerWidth / 2, y: -cy * INIT_ZOOM + window.innerHeight / 2 };
        zoomRef.current = INIT_ZOOM;
        setZoomState(INIT_ZOOM);
      }

      // AI HQs per faction (nearest first). Worker already stamped their footprints.
      const aiFactions = ALL_FACTIONS.filter(f => f !== facKey);
      const newAiHqKeys = aiHqKeysByFaction(spawnKeys, facKey, playerSpawn);
      aiHqKeysRef.current = newAiHqKeys;

      // HQ primary tiles must be in the store so the HQ layer can enumerate them.
      for (const fk of ALL_FACTIONS) for (const hqKey of (spawnKeys[fk] || [])) {
        if (!(hqKey in store)) store[hqKey] = rawMap[hqKey];
      }

      // Per-faction AI economy.
      for (const aiFk of Object.keys(newAiHqKeys)) {
        aiRssMapRef.current.set(aiFk, { stone:5000, wood:5000, gas:5000, food:5000 });
        aiBldgsMapRef.current.set(aiFk, { ...INIT_AI_BLDGS });
        aiPoolMapRef.current.set(aiFk, barracksCapacity(0));
        aiTileKeysMapRef.current.set(aiFk, new Set(factionTileKeys?.[aiFk] || []));
      }

      // One AI player per HQ ("ai_pirates_3"); tag the HQ tile with its owner.
      for (const [aiFk, hqArr] of Object.entries(newAiHqKeys)) {
        hqArr.forEach((hqKey, i) => {
          const playerId = aiPlayerId(aiFk, i);
          aiPlayerIdMapRef.current.set(hqKey, playerId);
          const hqTile = store[hqKey] || rawMap[hqKey];
          if (hqTile) { hqTile.ownerPlayerId = playerId; hqTile.faction = aiFk; store[hqKey] = hqTile; }
        });
      }
      const { cmds: initialAiCmds, activeHqs } = initialAiCommanders(newAiHqKeys, facKey, Date.now());
      for (const hqKey of activeHqs) {
        spawnedAiHqsRef.current.add(hqKey);
        console.log(`[AI HQ] Active commander HQ → ${hqKey} (faction: ${facKey})`);
      }

      // Crew founders get enough gems to found one crew each.
      aiGemsRef.current.clear();
      aiFoundersRef.current.clear();
      for (const playerId of crewFounders(newAiHqKeys, facKey)) {
        aiGemsRef.current.set(playerId, FOUNDER_GEMS);
        aiFoundersRef.current.add(playerId);
      }

      // patchTile maintains the player tile index from here on.
      pKeysRef.current = new Set();

      eligibleSpawnKeysRef.current = spawnEligibleKeys(arrays, meta, regionByIdx);
      console.log('[SPAWN] Eligible keys built:', eligibleSpawnKeysRef.current.length);

      rawMap.__ready = true;
      setImpassableTiles(meta.impassKeys || []);
      initPathfinding(meta.impassKeys || []);
      perfLog(`impass: ${(meta.impassKeys || []).length} border tiles sent`);
      clearHQCache();

      // One render pass for all final state (tileVersion bump must see __ready).
      unstable_batchedUpdates(() => {
        setCrossingsState(meta.crossings || []);
        setKeepMeta(meta.keepMeta);
        setAiHqKeys(newAiHqKeys);
        setAiFactionKeys([...aiFactions, facKey]);
        setAiCmds(initialAiCmds);
        setAiCmdsVersion(v => v + 1);
        setAiFaction(primaryAiFaction(aiFactions, playerAlignment));
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
        setTiles(rawMap);
      });

      // Sync MapRenderer's world position with panRef.
      setTimeout(() => { mapRendererRef.current?.teleport(panRef.current.x, panRef.current.y); }, 0);
    };

    worker.onerror = (err) => {
      console.error("mapGen worker error:", err);
      worker.terminate();
      setLoadPct(0);
      setLoadLabel("Error generating map — please refresh");
    };

    // Same seed → same world, so saves only need the tiles that changed.
    const seed = mapSeedRef?.current ?? ((Math.random() * 2 ** 31) >>> 0);
    if (mapSeedRef) mapSeedRef.current = seed;
    worker.postMessage({ facKey, seed });
    return () => worker.terminate();
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wipe the world only for a new-game flow; overlays keep the map alive ──
  useEffect(() => {
    if (screen === "title" || screen === "faction") {
      if (mapSeedRef) mapSeedRef.current = null;
      setMapReady(false);
      setTiles({});
      setLoadPct(0);
      setLoadLabel("Generating world...");
      clearHQCache();
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map is ready once tiles are populated ──
  useEffect(() => {
    if (screen === "game" && tilesMapRef.current.__ready) setMapReady(true);
  }, [tileVersion, screen]); // eslint-disable-line react-hooks/exhaustive-deps
}
