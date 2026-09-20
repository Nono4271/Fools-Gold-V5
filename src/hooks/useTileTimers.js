import { useCallback, useEffect } from "react";
import { HQP } from "../../shared/constants/map.js";
import { effectiveMarchSpd, marchStepMs } from "../../shared/utils/pathfinding.js";
import { TILE_PROTECTION_MS, pruneProtections, deletionStatus, abandonedTilePatch } from "../../shared/utils/tileTimers.js";

// Tile protection expiry + tile abandonment countdown. Rules live in shared/utils/tileTimers.js.
export function useTileTimers({
  setProtectedTiles, deletingTiles, setDeletingTiles, setDeletingSecsLeft,
  tilesMapRef, patchTile, facKey, playerHqRef, cmdsRef, setPlayerCmds,
  findPathBatch, applyAllBonuses, gearInventory, floaty,
}) {
  // Expire protections every 5s.
  useEffect(() => {
    const id = setInterval(() => setProtectedTiles(prev => pruneProtections(prev, Date.now())), 5000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const registerProtection = useCallback((tileKey) => {
    setProtectedTiles(prev => ({ ...prev, [tileKey]: Date.now() + TILE_PROTECTION_MS }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Abandonment countdown: finished tiles go neutral, commanders there walk home.
  useEffect(() => {
    if (Object.keys(deletingTiles).length === 0) return;
    const id = setInterval(() => {
      const { secsLeft, expired } = deletionStatus(deletingTiles, Date.now());
      setDeletingSecsLeft(secsLeft);
      if (!expired.length) return;
      for (const key of expired) {
        const t = tilesMapRef.current[key];
        if (t && t.owner === "player") patchTile(key, abandonedTilePatch(t, key, facKey));
      }
      const hqKey = playerHqRef.current || `${HQP.player.c},${HQP.player.r}`;
      // One batched pathfinding request for every commander on an abandoned tile.
      const retreatCmds = cmdsRef.current.filter(cmd => expired.includes(cmd.tk) && cmd.tk !== hqKey && !cmd.march);
      if (retreatCmds.length > 0) {
        findPathBatch(retreatCmds.map(cmd => ({ requestId: cmd.uid, from: cmd.tk, to: hqKey }))).then(results => {
          const pathByUid = Object.fromEntries(results.map(r => [r.requestId, r.path]));
          setPlayerCmds(prev => prev.map(cmd => {
            if (!expired.includes(cmd.tk) || cmd.tk === hqKey || cmd.march) return cmd;
            const retreatPath = pathByUid[cmd.uid];
            const stepMs = marchStepMs(effectiveMarchSpd(applyAllBonuses(cmd, gearInventory).spd || 60, null));
            if (retreatPath && retreatPath.length >= 2) {
              return { ...cmd, march: { type:"move", path:retreatPath, step:0, dest:hqKey, origin:cmd.tk, stepMs, startedAt:Date.now(), lastStepTime:Date.now() } };
            }
            return { ...cmd, tk: hqKey };
          }));
        });
      }
      expired.forEach(key => floaty("🏳 Tile abandoned", "#a08060", key));
      setDeletingTiles(prev => { const n = { ...prev }; expired.forEach(k => delete n[k]); return n; });
      setDeletingSecsLeft(prev => { const n = { ...prev }; expired.forEach(k => delete n[k]); return n; });
    }, 250);
    return () => clearInterval(id);
  }, [deletingTiles, floaty, findPathBatch, gearInventory]); // eslint-disable-line react-hooks/exhaustive-deps

  return { registerProtection };
}
