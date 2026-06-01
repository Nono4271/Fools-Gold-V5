// useAI.js — Multi-faction AI simulation
// Manages 5 AI factions simultaneously (whichever factions the player didn't pick).
// Each faction has 50 AI players, each with their own commander.
// Economy (rss/bldgs/pool) is shared per-faction. March is per-commander.

import { useCallback } from "react";
import { rssRate } from "../../shared/constants/buildings.js";
import { effectiveMarchSpd, marchStepMs } from "../../shared/utils/pathfinding.js";

export function useAI({
  aiFactionKeys,
  cmdsRef,
  tilesRef,
  aiRssMapRef,
  aiBldgsMapRef,
  aiPoolMapRef,
  aiTileKeysMapRef,
  setCmds,
  setAiRssMap,
  setAiBldgsMap,
  setAiPoolMap,
  findPathBatch,
}) {

// ── Resource tick — called every 1s ──────────────────────────────────────
const tickAiRss = useCallback(() => {
  if (!aiFactionKeys?.length) return;
  const tiles = tilesRef.current;
  for (const fk of aiFactionKeys) {
    const bldgs   = aiBldgsMapRef.current.get(fk) || {};
    const tileKeys = aiTileKeysMapRef.current.get(fk) || new Set();
    setAiRssMap(fk, p => {
      const n = { stone: p.stone + 5, wood: p.wood + 5, gas: p.ore + 5, food: p.gas + 5 };
      for (const k of tileKeys) {
        const t = tiles[k];
        if (t?.rss) {
          const b = t.rss === "stone" ? "quarry" : t.rss === "wood" ? "lumber" : t.rss === "gas" ? "forge" : "refinery";
          n[t.rss] += rssRate(bldgs[b] || 0);
        }
      }
      return {
        stone: Math.min(9990000, n.stone),
        wood:  Math.min(9990000, n.wood),
        gas: Math.min(9990000, n.ore),
        food: Math.min(9990000, n.gas),
      };
    });
  }
}, [aiFactionKeys, tilesRef, aiBldgsMapRef, aiTileKeysMapRef, setAiRssMap]);

// ── March dispatch — called when worker sends aiMarchReady ───────────────────
// Worker computed frontier + target. Main thread resolves BFS path and dispatches.
const tickAiMarch = useCallback((dispatches) => {
  if (!dispatches?.length) return;
  const now = Date.now();
  const curCmds = cmdsRef.current;

  // Filter to eligible commanders first
  const eligible = dispatches.filter(({ uid }) => {
    const cmd = curCmds.find(c => c.uid === uid);
    return cmd && !cmd.march;
  });
  if (!eligible.length) return;

  // Batch all BFS requests through the worker (off main thread)
  const requests = eligible.map(({ uid, destKey }) => {
    const cmd = curCmds.find(c => c.uid === uid);
    return { requestId: uid, from: cmd.tk, to: destKey, destKey };
  });

  const destByUid = Object.fromEntries(eligible.map(({ uid, destKey }) => [uid, destKey]));

  (findPathBatch || (() => Promise.resolve([])))(requests).then(results => {
    const updates = [];
    for (const { requestId: uid, path } of results) {
      if (!path || path.length < 2) continue;
      const cmd = cmdsRef.current.find(c => c.uid === uid);
      if (!cmd || cmd.march) continue;
      const stepMs = marchStepMs(effectiveMarchSpd(cmd.spd || 60, cmd.troopBranch));
      const destKey = destByUid[uid];
      updates.push({ uid, march: { type:"attack", path, step:0, dest:destKey, origin:cmd.tk, stepMs, lastStepTime:now } });
    }
    if (!updates.length) return;
    setCmds(p => {
      let changed = false;
      const next = p.map(c => {
        const upd = updates.find(u => u.uid === c.uid);
        if (!upd) return c;
        changed = true;
        return { ...c, march: upd.march };
      });
      return changed ? next : p;
    });
  });
}, [cmdsRef, setCmds, findPathBatch]);

// ── Economy apply — called when worker sends aiEconReady ──────────────────
// Worker computed all diffs. Main thread applies in one pass.
const tickAiEcon = useCallback((updates) => {
  if (!updates) return;
  const { cmdUpdates, poolUpdates, rssUpdates, bldgUpdates } = updates;

  if (cmdUpdates?.length) {
    setCmds(p => p.map(c => {
      const upd = cmdUpdates.find(u => u.uid === c.uid);
      if (!upd) return c;
      return { ...c, troops: upd.troops, troopBranch: upd.troopBranch };
    }));
  }
  if (poolUpdates) {
    for (const [fk, val] of Object.entries(poolUpdates)) setAiPoolMap(fk, () => val);
  }
  if (rssUpdates) {
    for (const [fk, val] of Object.entries(rssUpdates)) setAiRssMap(fk, () => val);
  }
  if (bldgUpdates) {
    for (const [fk, val] of Object.entries(bldgUpdates)) setAiBldgsMap(fk, () => val);
  }
}, [setCmds, setAiPoolMap, setAiRssMap, setAiBldgsMap]);

return { tickAiRss, tickAiMarch, tickAiEcon };
}
