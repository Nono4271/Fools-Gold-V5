import { useCallback } from "react";
import { cmdCommand } from "../../shared/constants/buildings.js";
import { planTroopSlot, applyTroopSlotToPool, returnAllTroopsToPool, withTroopSlots, planArmySlots, applyPoolDelta } from "../../shared/utils/troopSlots.js";

// Commander troop-slot actions. Rules live in shared/utils/troopSlots.js.
export function useTroopSlots({ setCmds, troopCounts, setTroopCounts, commandCenterLvl }) {
  // setTroopSlot(uid, slotIndex, branch, troops) — troops===0 or branch null removes the slot.
  const setTroopSlot = useCallback((uid, slotIndex, branch, newTroops) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid === uid);
      if (!cmd) return prev;
      const commandCap = cmdCommand(cmd.lvl || 5, commandCenterLvl || 0, cmd.commandBonus ?? 0);
      // Pool is read synchronously from troopCounts: updater callbacks are not
      // guaranteed to run before the next line (the old Confirm bug).
      const plan = planTroopSlot({ cmd, slotIndex, branch, newTroops, pool: troopCounts, commandCap });
      setTroopCounts(counts => applyTroopSlotToPool(counts, plan));
      return prev.map(c => c.uid === uid ? withTroopSlots(c, plan.slots) : c);
    });
  }, [troopCounts, commandCenterLvl]); // eslint-disable-line react-hooks/exhaustive-deps

  // setArmySlots(uid, desired) — army Confirm: set all 3 slots in one step so
  // slots can't shift or double-draw from a stale pool between calls.
  const setArmySlots = useCallback((uid, desired) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid === uid);
      if (!cmd) return prev;
      const commandCap = cmdCommand(cmd.lvl || 5, commandCenterLvl || 0, cmd.commandBonus ?? 0);
      const plan = planArmySlots({ cmd, desired, pool: troopCounts, commandCap });
      setTroopCounts(counts => applyPoolDelta(counts, plan.poolDelta));
      return prev.map(c => c.uid === uid ? withTroopSlots(c, plan.slots) : c);
    });
  }, [troopCounts, commandCenterLvl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy alias: assignTroops(uid, branch, total) maps to slot 0
  const assignTroops = useCallback((uid, troopBranch, newTotal) => {
    setTroopSlot(uid, 0, troopBranch, newTotal);
  }, [setTroopSlot]);

  const returnTroops = useCallback((uid) => {
    setCmds(prev => {
      const cmd = prev.find(c => c.uid === uid);
      if (!cmd) return prev;
      setTroopCounts(counts => returnAllTroopsToPool(counts, cmd));
      return prev.map(c => c.uid === uid ? { ...c, troopSlots: [], troops: 0, troopBranch: null } : c);
    });
  }, [setTroopCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  return { setTroopSlot, setArmySlots, assignTroops, returnTroops };
}
