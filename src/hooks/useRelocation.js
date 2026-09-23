import { useCallback } from "react";
import { consumeOne } from "../../shared/utils/consumables.js";
import { allHqKeyList, checkPlannedRelocation, findForcedRelocationPad, hqMovePatches } from "../../shared/utils/relocation.js";

// HQ relocation actions. Rules live in shared/utils/relocation.js.
export function useRelocation({
  tiles, patchTile, facKey, aiHqKeys, playerHqKey, playerHqRef, setPlayerHqKey,
  cmds, consumables, setConsumables, lastRelocateAt, setLastRelocateAt, setWinner, floaty, setPlayerCmds,
}) {
  // Old HQ tiles revert to neutral plain; new 3x3 becomes the HQ.
  // Commanders sitting at the old HQ move with it (they used to be left on
  // the old, now-neutral tile).
  const applyHqMove = useCallback((newCenterKey) => {
    const oldCenterKey = playerHqRef.current;
    for (const [k, patch] of hqMovePatches(oldCenterKey, newCenterKey, tiles, facKey)) patchTile(k, patch);
    setPlayerHqKey(newCenterKey);
    if (oldCenterKey && setPlayerCmds) {
      setPlayerCmds(prev => prev.map(c => c.owner === "player" && !c.march && c.tk === oldCenterKey ? { ...c, tk: newCenterKey } : c));
    }
  }, [playerHqRef, patchTile, facKey, tiles, setPlayerHqKey, setPlayerCmds]);

  // Planned relocation — costs 1 token, 72hr cooldown, all commanders must be home.
  const performRelocation = useCallback((newCenterKey) => {
    const check = checkPlannedRelocation({
      centerKey: newCenterKey, tiles, aiHqKeys, playerHqKey, lastRelocateAt, cmds, consumables, now: Date.now(),
    });
    if (!check.ok) { floaty(check.reason, "#cc6030", newCenterKey); return; }
    setConsumables(prev => consumeOne(prev, "relocation"));
    applyHqMove(newCenterKey);
    setLastRelocateAt(Date.now());
    floaty("🏰 HQ Relocated!", "#f0c040", newCenterKey);
  }, [tiles, aiHqKeys, playerHqKey, lastRelocateAt, cmds, consumables, setConsumables, applyHqMove, setLastRelocateAt, floaty]);

  // Forced relocation — player HQ captured (no token, no cooldown).
  const onForcedRelocate = useCallback(() => {
    const newCenter = findForcedRelocationPad(tiles, allHqKeyList(aiHqKeys, playerHqKey), playerHqKey, facKey);
    if (!newCenter) { setWinner("ai"); return; }
    applyHqMove(newCenter);
    floaty("🏰 HQ Forced Relocation!", "#cc4444", newCenter);
  }, [tiles, aiHqKeys, playerHqKey, facKey, applyHqMove, setWinner, floaty]);

  return { applyHqMove, performRelocation, onForcedRelocate };
}
