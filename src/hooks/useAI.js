// useAI.js — Multi-faction AI simulation
// Manages 5 AI factions simultaneously (whichever factions the player didn't pick).
// Each faction has 50 AI players, each with their own commander.
// Economy (rss/bldgs/pool) is shared per-faction. March is per-commander.

import { useCallback } from "react";
import { rssRate } from "../../shared/constants/buildings.js";
import { effectiveMarchSpd, marchStepMs } from "../../shared/utils/pathfinding.js";
import { AI_STAMINA_MAX, canAffordMarch, spendMarchStamina } from "../../shared/utils/tactics.js";

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
      const n = { stone: p.stone + 5, wood: p.wood + 5, gas: p.gas + 5, food: p.food + 5 };
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
        gas: Math.min(9990000, n.gas),
        food: Math.min(9990000, n.food),
      };
    });
  }
}, [aiFactionKeys, tilesRef, aiBldgsMapRef, aiTileKeysMapRef, setAiRssMap]);

// Minimum commander level to pick a fight with a tile of a given power
// level — mirrors the defender level factionDefCmdForTile/FACTION_CMD_CONFIG
// assigns per power level (shared/constants/heroes.js: P4=lvl8 ... P13=lvl50),
// so the AI doesn't march into a garrison miles above what it can realistically
// beat just because it's the nearest frontier tile. Power levels 0-3 have no
// elite defender and are always fair game. The worker that picks destKey only
// sees a lightweight "defeated tiles" index (not full powerLevel data, to keep
// its snapshot small) — this check runs here instead, where tilesRef has the
// real tile.
const MIN_CMD_LVL_FOR_POWER = { 4:8, 5:10, 6:15, 7:18, 8:22, 9:25, 10:35, 11:40, 12:45, 13:50 };
function aiCanChallenge(cmdLvl, tile) {
  const pl = tile?.powerLevel || 0;
  const need = MIN_CMD_LVL_FOR_POWER[pl];
  return !need || (cmdLvl || 1) >= need;
}

// ── March dispatch — called when worker sends aiMarchReady ───────────────────
// Worker computed frontier + target. Main thread resolves BFS path and dispatches.
const tickAiMarch = useCallback((dispatches) => {
  if (!dispatches?.length) return;
  const now = Date.now();
  const curCmds  = cmdsRef.current;
  const curTiles = tilesRef.current;

  // Filter to eligible commanders first, and drop any dispatch that would
  // send a commander at a tile it has no business challenging (see
  // aiCanChallenge above) — it just stays idle and gets reconsidered on the
  // next march-check pass instead.
  const eligible = dispatches.filter(({ uid, destKey }) => {
    const cmd = curCmds.find(c => c.uid === uid);
    if (!cmd || cmd.march) return false;
    // Same stamina rule as the player: an attack costs 20 and is refused when
    // the commander can't pay (stamina regens +1 per 3 min, see useTacticTicks).
    if (!canAffordMarch(cmd, "attack", AI_STAMINA_MAX)) return false;
    return aiCanChallenge(cmd.lvl, curTiles?.[destKey]);
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
      if (!cmd || cmd.march || !canAffordMarch(cmd, "attack", AI_STAMINA_MAX)) continue;
      const stepMs = marchStepMs(effectiveMarchSpd(cmd.spd || 60, cmd.troopBranch));
      const destKey = destByUid[uid];
      updates.push({ uid, march: { type:"attack", path, step:0, dest:destKey, origin:cmd.tk, stepMs, startedAt:now, lastStepTime:now } });
    }
    if (!updates.length) return;
    setCmds(p => {
      let changed = false;
      const next = p.map(c => {
        const upd = updates.find(u => u.uid === c.uid);
        if (!upd) return c;
        // Re-check against the live commander: stamina may have been spent
        // while the path was being computed. Deduct on dispatch, like the player.
        if (!canAffordMarch(c, "attack", AI_STAMINA_MAX)) return c;
        changed = true;
        return { ...spendMarchStamina(c, "attack", AI_STAMINA_MAX), march: upd.march };
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
