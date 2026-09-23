import { useState, useCallback, useEffect, useRef } from "react";
import { FORT_LEVELS, FORT_MAX_LEVEL, FORT_RANGE_RADIUS, FORT_SIEGE_RESET_MS } from "../../shared/constants/map.js";
import { withFortRemoval, withoutFortRemoval } from "../../shared/utils/fortRemoval.js";
import { bfsPath, marchStepMs } from "../../shared/utils/pathfinding.js";

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
    if (fort.isBuilding) continue; // a fort is offline (no range) until built
    const [c, r] = fort.tileKey.split(",").map(Number);
    anchors.push({ c, r, type: "fort", key: fort.tileKey, fortId: fort.id });
  }
  return anchors;
}

export function useForts({ playerHqKey, cmds, setCmds, emitFortUpdate, fortMax = 10 }) {
  // forts: array of { id, tileKey, level, stationedCmdUids, siege, siegeMax, resetAt }
  const [forts, setForts] = useState([]);
  // Kept in sync during render (not in an effect) so lookups like
  // getFortAtTile never return the previous state right after a change.
  const fortsRef = useRef(forts);
  fortsRef.current = forts;

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

    // A fort is offline until it's built — nobody is stationed at build time.
    const autoStationedUids = [];

    const buildMs = levelDef.buildMs ?? 7200000;
    const newFort = {
      id,
      tileKey,
      level: 1,
      stationedCmdUids: autoStationedUids,
      siege: levelDef.siege,
      siegeMax: levelDef.siege,
      resetAt: null,
      builtAt: Date.now(),
      isBuilding: true,
      completesAt: Date.now() + buildMs,
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
      // One timer at a time — upgrading mid-build used to overwrite the build
      // timer and leave the fort stuck half-built/half-upgraded.
      if (f.isBuilding || f.isUpgrading) return f;
      const nextLevel = f.level + 1;
      const levelDef = FORT_LEVELS[nextLevel - 1];
      const upgradeMs = levelDef.upgradeMs ?? 4500000;
      const upgraded = {
        ...f,
        isUpgrading: true,
        completesAt: Date.now() + upgradeMs,
        pendingLevel: nextLevel,
      };
      emitFortUpdate?.({ action: "upgrade", fort: upgraded });
      return upgraded;
    }));
  }, [emitFortUpdate]);

  // ── Demolish/abandon timer (deadline stored on the fort, survives the popup) ─
  // The fort is actually removed by useFortRemovals when the deadline passes.
  const startFortRemoval = useCallback((fortId, mode) => {
    const f = fortsRef.current.find(x => x.id === fortId);
    const now = Date.now();
    const started = withFortRemoval(f, mode, now);
    if (!f || started === f) return; // unknown fort/mode, or already running
    setForts(prev => prev.map(x => x.id === fortId ? withFortRemoval(x, mode, now) : x));
    emitFortUpdate?.({ action: "removal", fort: started });
  }, [emitFortUpdate]);

  const cancelFortRemoval = useCallback((fortId) => {
    setForts(prev => prev.map(x => x.id === fortId ? withoutFortRemoval(x) : x));
    emitFortUpdate?.({ action: "removalCancel", fortId });
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
        // Physically at fort — auto recall to HQ. (The march used to have no
        // path, which the game loop treats as "arrived nowhere" — the
        // commander's tile became undefined and it vanished from the map.)
        const path = hqKey ? bfsPath(fort.tileKey, hqKey) : null;
        if (!path || path.length < 2) return { ...c, stationedFortId: null, stranded: true };
        const now = Date.now();
        return { ...c, stationedFortId: null, stranded: false,
          march: { type: "recall", dest: hqKey, origin: fort.tileKey,
            path, step: 0, stepMs: marchStepMs(60), startedAt: now, lastStepTime: now } };
      }));
    }

    setForts(prev => prev.filter(f => f.id !== fortId));
    emitFortUpdate?.({ action: "destroy", fortId });
  }, [playerHqKey, setCmds, emitFortUpdate]);

  // ── Station commander at fort ────────────────────────────────────────────────
  const stationAtFort = useCallback((cmdUid, fortId) => {
    const fort = fortsRef.current.find(f => f.id === fortId);
    if (!fort) return { ok: false, reason: "Fort not found" };
    if (fort.isBuilding) return { ok: false, reason: "Fort is still under construction" };
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

  // ── Complete build/upgrade when timer expires ────────────────────────────────
  // When a fort finishes BUILDING it comes online and auto-stations the
  // player's commanders standing on its tile (up to capacity).
  const cmdsLatestRef = useRef(cmds);
  cmdsLatestRef.current = cmds;
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const stationNow = {}; // fortId -> [uid]
      for (const f of fortsRef.current) {
        if (!(f.isBuilding && f.completesAt && now >= f.completesAt)) continue;
        const cap = FORT_LEVELS[(f.level || 1) - 1]?.capacity ?? 2;
        const free = Math.max(0, cap - (f.stationedCmdUids?.length || 0));
        const uids = (cmdsLatestRef.current || [])
          .filter(c => c.owner === "player" && c.tk === f.tileKey && !c.march && !c.stationedFortId && !c.stationedWellId)
          .slice(0, free).map(c => c.uid);
        if (uids.length) stationNow[f.id] = uids;
      }
      const stationed = new Map(Object.entries(stationNow).flatMap(([fid, uids]) => uids.map(u => [u, fid])));
      if (stationed.size) setCmds(prev => prev.map(c => stationed.has(c.uid) ? { ...c, stationedFortId: stationed.get(c.uid), stranded: false } : c));
      setForts(prev => {
        let changed = false;
        const next = prev.map(f => {
          if (f.completesAt && now >= f.completesAt) {
            changed = true;
            if (f.isBuilding) {
              const add = (stationNow[f.id] || []).filter(u => !f.stationedCmdUids.includes(u));
              return { ...f, isBuilding: false, completesAt: null, stationedCmdUids: [...f.stationedCmdUids, ...add] };
            }
            if (f.isUpgrading && f.pendingLevel) {
              const levelDef = FORT_LEVELS[f.pendingLevel - 1];
              return {
                ...f,
                level: f.pendingLevel,
                pendingLevel: null,
                isUpgrading: false,
                completesAt: null,
                siegeMax: levelDef.siege,
                siege: Math.min(f.siege, levelDef.siege),
              };
            }
          }
          return f;
        });
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(id);
  }, [setCmds]);

  return {
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
  };
}
