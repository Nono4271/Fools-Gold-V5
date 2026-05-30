import { useState, useCallback, useEffect, useRef } from "react";
import { FORT_LEVELS, FORT_MAX_LEVEL, FORT_RANGE_RADIUS, FORT_SIEGE_RESET_MS } from "../../shared/constants/map.js";

// Chebyshev distance check
function inRange(ac, ar, bc, br) {
  return Math.abs(ac - bc) <= FORT_RANGE_RADIUS && Math.abs(ar - br) <= FORT_RANGE_RADIUS;
}

// Check if a tile key is within range of any anchor (HQ + forts)
export function isTileInRange(tileKey, anchors) {
  if (!tileKey || !anchors?.length) return false;
  const [tc, tr] = tileKey.split(",").map(Number);
  return anchors.some(({ c, r }) => inRange(c, r, tc, tr));
}

// Build anchor list from HQ key + forts
export function buildAnchors(playerHqKey, forts) {
  const anchors = [];
  if (playerHqKey) {
    const [c, r] = playerHqKey.split(",").map(Number);
    anchors.push({ c, r, type: "hq", key: playerHqKey });
  }
  for (const fort of (forts || [])) {
    const [c, r] = fort.tileKey.split(",").map(Number);
    anchors.push({ c, r, type: "fort", key: fort.tileKey, fortId: fort.id });
  }
  return anchors;
}

export function useForts({ playerHqKey, cmds, setCmds, emitFortUpdate, fortMax = 10 }) {
  // forts: array of { id, tileKey, level, stationedCmdUids, siege, siegeMax, resetAt }
  const [forts, setForts] = useState([]);
  const fortsRef = useRef(forts);
  useEffect(() => { fortsRef.current = forts; }, [forts]);

  // ── Build fort ──────────────────────────────────────────────────────────────
  const buildFort = useCallback((tileKey, tile) => {
    if (!tileKey || !tile) return { ok: false, reason: "No tile" };
    if (tile.owner !== "player") return { ok: false, reason: "Not your tile" };
    if (tile.isHQ) return { ok: false, reason: "Cannot build on HQ" };
    if ((tile.powerLevel || 1) >= 10) return { ok: false, reason: "Cannot build on P10+ tiles" };
    if (fortsRef.current.some(f => f.tileKey === tileKey)) return { ok: false, reason: "Fort already exists here" };
    if (fortsRef.current.length >= fortMax) return { ok: false, reason: `Fort limit reached (${fortMax})` };

    const id = `fort_${tileKey}_${Date.now()}`;
    const levelDef = FORT_LEVELS[0];

    // Auto-station commanders already standing on this tile (up to capacity)
    const cmdsOnTile = (cmds || []).filter(c =>
      c.owner === "player" && c.tk === tileKey && !c.march && !c.stationedFortId
    ).slice(0, levelDef.capacity);
    const autoStationedUids = cmdsOnTile.map(c => c.uid);

    const newFort = {
      id,
      tileKey,
      level: 1,
      stationedCmdUids: autoStationedUids,
      siege: levelDef.siege,
      siegeMax: levelDef.siege,
      resetAt: null,
      builtAt: Date.now(),
    };

    setForts(prev => [...prev, newFort]);

    // Update commanders with stationedFortId
    if (autoStationedUids.length > 0) {
      setCmds(prev => prev.map(c =>
        autoStationedUids.includes(c.uid) ? { ...c, stationedFortId: id, stranded: false } : c
      ));
    }

    emitFortUpdate?.({ action: "build", fort: newFort });
    return { ok: true, fort: newFort };
  }, [emitFortUpdate, cmds, setCmds]);

  // ── Upgrade fort ────────────────────────────────────────────────────────────
  const upgradeFort = useCallback((fortId) => {
    setForts(prev => prev.map(f => {
      if (f.id !== fortId) return f;
      if (f.level >= FORT_MAX_LEVEL) return f;
      const nextLevel = f.level + 1;
      const levelDef = FORT_LEVELS[nextLevel - 1];
      const upgraded = {
        ...f,
        level: nextLevel,
        siegeMax: levelDef.siege,
        siege: Math.min(f.siege, levelDef.siege),
      };
      emitFortUpdate?.({ action: "upgrade", fort: upgraded });
      return upgraded;
    }));
  }, [emitFortUpdate]);

  // ── Destroy fort ────────────────────────────────────────────────────────────
  const destroyFort = useCallback((fortId, { autoRecallCmds = true } = {}) => {
    const fort = fortsRef.current.find(f => f.id === fortId);
    if (!fort) return;

    // Auto-recall commanders physically AT the fort tile
    if (autoRecallCmds && fort.stationedCmdUids.length > 0) {
      const hqKey = playerHqKey;
      setCmds(prev => prev.map(c => {
        if (!fort.stationedCmdUids.includes(c.uid)) return c;
        if (c.tk !== fort.tileKey) {
          // Stranded — mark as stranded, only recall available
          return { ...c, stationedFortId: null, stranded: true };
        }
        // Physically at fort — auto recall to HQ
        return { ...c, stationedFortId: null, stranded: false,
          march: { type: "recall", dest: hqKey, origin: fort.tileKey,
            path: null, step: 0, stepMs: null, lastStepTime: Date.now() } };
      }));
    }

    setForts(prev => prev.filter(f => f.id !== fortId));
    emitFortUpdate?.({ action: "destroy", fortId });
  }, [playerHqKey, setCmds, emitFortUpdate]);

  // ── Station commander at fort ────────────────────────────────────────────────
  const stationAtFort = useCallback((cmdUid, fortId) => {
    const fort = fortsRef.current.find(f => f.id === fortId);
    if (!fort) return { ok: false, reason: "Fort not found" };
    const levelDef = FORT_LEVELS[fort.level - 1];
    if (fort.stationedCmdUids.length >= levelDef.capacity) {
      return { ok: false, reason: `Fort full (max ${levelDef.capacity} at level ${fort.level})` };
    }
    if (fort.stationedCmdUids.includes(cmdUid)) return { ok: true }; // already stationed

    // Unstation from previous fort if any
    setForts(prev => prev.map(f => {
      if (f.id === fortId) {
        return { ...f, stationedCmdUids: [...f.stationedCmdUids, cmdUid] };
      }
      // Remove from any other fort
      if (f.stationedCmdUids.includes(cmdUid)) {
        return { ...f, stationedCmdUids: f.stationedCmdUids.filter(u => u !== cmdUid) };
      }
      return f;
    }));

    setCmds(prev => prev.map(c =>
      c.uid === cmdUid ? { ...c, stationedFortId: fortId, stranded: false } : c
    ));

    emitFortUpdate?.({ action: "station", fortId, cmdUid });
    return { ok: true };
  }, [setCmds, emitFortUpdate]);

  // ── Unstation commander (e.g. on recall to HQ) ──────────────────────────────
  const unstationCmd = useCallback((cmdUid) => {
    setForts(prev => prev.map(f => ({
      ...f,
      stationedCmdUids: f.stationedCmdUids.filter(u => u !== cmdUid),
    })));
    setCmds(prev => prev.map(c =>
      c.uid === cmdUid ? { ...c, stationedFortId: null, stranded: false } : c
    ));
  }, [setCmds]);

  // ── Fort siege damage (when enemy attacks a fort) ───────────────────────────
  const damageFort = useCallback((fortId, siegeDamage) => {
    setForts(prev => prev.map(f => {
      if (f.id !== fortId) return f;
      const newSiege = Math.max(0, f.siege - siegeDamage);
      const updated = { ...f, siege: newSiege, resetAt: Date.now() + FORT_SIEGE_RESET_MS };
      emitFortUpdate?.({ action: "siege", fort: updated });
      return updated;
    }));
  }, [emitFortUpdate]);

  // ── Fort siege reset timer ───────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setForts(prev => prev.map(f => {
        if (!f.resetAt || now < f.resetAt || f.siege >= f.siegeMax) return f;
        return { ...f, siege: f.siegeMax, resetAt: null };
      }));
    }, 10000); // check every 10s
    return () => clearInterval(id);
  }, []);

  // ── Get fort at tile ─────────────────────────────────────────────────────────
  const getFortAtTile = useCallback((tileKey) => {
    return fortsRef.current.find(f => f.tileKey === tileKey) || null;
  }, []);

  // ── Get stationed fort for a commander ──────────────────────────────────────
  const getStationedFort = useCallback((cmdUid) => {
    return fortsRef.current.find(f => f.stationedCmdUids.includes(cmdUid)) || null;
  }, []);

  // ── Get anchors (HQ + all forts) for range calculation ──────────────────────
  const getAnchors = useCallback(() => {
    return buildAnchors(playerHqKey, fortsRef.current);
  }, [playerHqKey]);

  // ── Load forts from server sync ──────────────────────────────────────────────
  const loadForts = useCallback((serverForts) => {
    if (Array.isArray(serverForts)) setForts(serverForts);
  }, []);

  return {
    forts,
    buildFort,
    upgradeFort,
    destroyFort,
    stationAtFort,
    unstationCmd,
    damageFort,
    getFortAtTile,
    getStationedFort,
    getAnchors,
    loadForts,
  };
}
