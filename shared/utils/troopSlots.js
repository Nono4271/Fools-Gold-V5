// Pure rules for assigning barracks troops to a commander's (max 3) troop slots.
// Extracted from Game.jsx so the future server can run the same rules.
import { FACTION_TROOPS, COMMAND_COST } from "../constants/troops.js";
import { normaliseTroopSlots } from "./pathfinding.js";

export const MAX_TROOP_SLOTS = 3;

// "faction:branch:tier" — key of one troop type's barracks pool.
export function troopPoolKey(branch) {
  return (branch && branch.faction && branch.branch && branch.tier != null)
    ? `${branch.faction}:${branch.branch}:${branch.tier}` : null;
}

// Command points one troop of this branch uses (small/medium/large).
export function branchCommandCost(branch) {
  const size = branch
    ? (FACTION_TROOPS[branch.faction]?.branches?.find(b => b.key === branch.branch)?.size ?? "small")
    : "small";
  return COMMAND_COST[size] ?? 1;
}

// Commander with its slot list and derived troops/troopBranch fields refreshed.
export function withTroopSlots(cmd, slots) {
  return { ...cmd, troopSlots: slots, troops: slots.reduce((s, sl) => s + (sl.troops || 0), 0), troopBranch: slots[0]?.branch ?? null };
}

// Set one slot. Returns the commander's new slot list plus the pool movement:
// returnedOld goes back to oldKey (branch swapped); drawn/returned apply to newKey.
export function planTroopSlot({ cmd, slotIndex, branch, newTroops, pool, commandCap }) {
  const existingSlots = normaliseTroopSlots(cmd);
  const newSlots = [...existingSlots];

  const otherUsed = newSlots.reduce((sum, sl, idx) =>
    idx === slotIndex ? sum : sum + (sl.troops || 0) * branchCommandCost(sl.branch), 0);
  const remainingCap = Math.max(0, commandCap - otherUsed);
  const maxByCmd = Math.floor(remainingCap / branchCommandCost(branch));

  const oldSlot = existingSlots[slotIndex];
  const oldTroops = oldSlot?.troops || 0;
  const oldKey = troopPoolKey(oldSlot?.branch);
  const newKey = troopPoolKey(branch);
  const branchChanged = oldKey !== newKey;
  const returnedOld = branchChanged ? oldTroops : 0;
  const curInSlot = branchChanged ? 0 : oldTroops;

  const availInPool = pool[newKey] || 0;
  const capped = Math.min(newTroops, maxByCmd);
  const delta = capped - curInSlot;
  const drawn = delta > 0 ? Math.min(delta, availInPool) : 0;
  const returned = delta < 0 ? Math.min(-delta, curInSlot) : 0;
  const final = curInSlot + drawn - returned;

  let slots;
  if (final === 0 || !branch) {
    slots = newSlots.filter((_, i) => i !== slotIndex);
  } else {
    newSlots[slotIndex] = { branch, troops: final };
    slots = newSlots.filter(Boolean).slice(0, MAX_TROOP_SLOTS);
  }
  return { slots, oldKey: branchChanged ? oldKey : null, returnedOld, newKey, drawn, returned };
}

// Apply a planTroopSlot result to the barracks pool.
export function applyTroopSlotToPool(counts, plan) {
  const next = { ...counts };
  if (plan.oldKey && plan.returnedOld > 0) next[plan.oldKey] = (next[plan.oldKey] || 0) + plan.returnedOld;
  if (plan.newKey) next[plan.newKey] = Math.max(0, (next[plan.newKey] || 0) - plan.drawn + plan.returned);
  return next;
}

// Return every troop a commander carries to its own pool.
export function returnAllTroopsToPool(counts, cmd) {
  const next = { ...counts };
  const slots = normaliseTroopSlots(cmd);
  for (const sl of slots) {
    const k = troopPoolKey(sl.branch);
    if (k && sl.troops > 0) next[k] = (next[k] || 0) + sl.troops;
  }
  if (!slots.length && cmd.troops > 0) {
    const k = troopPoolKey(cmd.troopBranch);
    if (k) next[k] = (next[k] || 0) + cmd.troops;
  }
  return next;
}
