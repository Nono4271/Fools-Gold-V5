// Pure rules for assigning barracks troops to a commander's (max 3) troop slots.
// Extracted from Game.jsx so the future server can run the same rules.
import { FACTION_TROOPS, COMMAND_COST } from "../constants/troops.js";
import { ANCIENT_FACTIONS } from "../constants/ancientTroops.js";
import { NEUTRAL_FACTIONS } from "../constants/neutralTroops.js";
import { normaliseTroopSlots } from "./pathfinding.js";

export const MAX_TROOP_SLOTS = 3;

// "faction:branch:tier" — key of one troop type's barracks pool.
export function troopPoolKey(branch) {
  return (branch && branch.faction && branch.branch && branch.tier != null)
    ? `${branch.faction}:${branch.branch}:${branch.tier}` : null;
}

// Look up a branch def across real factions AND the Ancients (see
// ancientTroops.js) — additive fallback, same pattern used in troops.js and
// battle.js so all three places resolve an Ancient the same way.
function findBranchDef(branch) {
  if (!branch) return null;
  const f = FACTION_TROOPS[branch.faction] || ANCIENT_FACTIONS[branch.faction] || NEUTRAL_FACTIONS[branch.faction];
  return f?.branches?.find(b => b.key === branch.branch) ?? null;
}

// Command points one troop of this branch uses (small/medium/large).
export function branchCommandCost(branch) {
  const size = branch ? (findBranchDef(branch)?.size ?? "small") : "small";
  return COMMAND_COST[size] ?? 1;
}

// ── Ancients: "only one Ancient may be used in an army" ──────────────────────
// Enforces the branch's `uniqueSlot` flag (see ancientTroops.js "skill D").
// Not tied to which specific Ancient — any second Ancient in the same
// army's slots is blocked, not just a duplicate of the same one.
export function isAncientUniqueBranch(branch) {
  return !!findBranchDef(branch)?.uniqueSlot;
}

// True if any slot OTHER than `excludeIndex` already carries an Ancient.
export function armyHasOtherAncient(slots, excludeIndex = -1) {
  return slots.some((sl, idx) => idx !== excludeIndex && isAncientUniqueBranch(sl?.branch));
}

// Commander with its slot list and derived troops/troopBranch fields refreshed.
export function withTroopSlots(cmd, slots) {
  return { ...cmd, troopSlots: slots, troops: slots.reduce((s, sl) => s + (sl.troops || 0), 0), troopBranch: slots[0]?.branch ?? null };
}

// Set one slot. Returns the commander's new slot list plus the pool movement:
// returnedOld goes back to oldKey (branch swapped); drawn/returned apply to newKey.
export function planTroopSlot({ cmd, slotIndex, branch, newTroops, pool, commandCap }) {
  const existingSlots = normaliseTroopSlots(cmd);

  // Ancients: refuse to place a 2nd Ancient into a different slot. No
  // change at all — same shape as a no-op set (see `blocked` field).
  if (branch && newTroops > 0 && isAncientUniqueBranch(branch) && armyHasOtherAncient(existingSlots, slotIndex)) {
    return { slots: existingSlots, oldKey: null, returnedOld: 0, newKey: null, drawn: 0, returned: 0, blocked: "ancient_unique" };
  }

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

// Set all slots at once (army Confirm). Current troops are returned to the pool
// first, then each desired slot draws in order, limited by pool and command cap.
// desired: array of null | {branch, troops}. Returns {slots, poolDelta: {key: n}}.
export function planArmySlots({ cmd, desired, pool, commandCap }) {
  const work = { ...pool };
  const poolDelta = {};
  const move = (key, n) => { work[key] = (work[key] || 0) + n; poolDelta[key] = (poolDelta[key] || 0) + n; };
  for (const sl of normaliseTroopSlots(cmd)) {
    const key = troopPoolKey(sl.branch);
    if (key && sl.troops > 0) move(key, sl.troops);
  }
  const slots = [];
  let capLeft = commandCap;
  let ancientPlaced = false;
  const blockedKeys = [];
  for (const want of desired) {
    if (slots.length >= MAX_TROOP_SLOTS) break;
    const key = troopPoolKey(want?.branch);
    if (!key || !(want.troops > 0)) continue;
    // Ancients: only the first Ancient in `desired` order gets a slot; any
    // further Ancient is skipped entirely (not drawn from the pool).
    if (isAncientUniqueBranch(want.branch)) {
      if (ancientPlaced) { blockedKeys.push(key); continue; }
      ancientPlaced = true;
    }
    const cost = branchCommandCost(want.branch);
    const n = Math.max(0, Math.min(Math.floor(want.troops), work[key] || 0, Math.floor(capLeft / cost + 1e-9)));
    if (n <= 0) continue;
    move(key, -n);
    capLeft -= n * cost;
    slots.push({ branch: want.branch, troops: n });
  }
  for (const key of Object.keys(poolDelta)) if (poolDelta[key] === 0) delete poolDelta[key];
  return blockedKeys.length ? { slots, poolDelta, blockedKeys } : { slots, poolDelta };
}

export function applyPoolDelta(counts, poolDelta) {
  const next = { ...counts };
  for (const [key, n] of Object.entries(poolDelta)) next[key] = Math.max(0, (next[key] || 0) + n);
  return next;
}
