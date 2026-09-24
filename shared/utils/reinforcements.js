// Pure rules for reinforcement marches (barracks troops sent to a commander in the field).
// Moved from Game.jsx.
import { troopPoolKey, branchCommandCost, withTroopSlots, MAX_TROOP_SLOTS } from "./troopSlots.js";
import { normaliseTroopSlots, effectiveMarchSpd, marchStepMs } from "./pathfinding.js";
import { poolCommands, troopsThatFit } from "./barracks.js";

// ── Single source of truth for convoy step timing ─────────────────────────────
// Both useReinforcements (actual timer) and BottomPanel (ETA display) call this
// so they can never drift apart and cause "teleporting" or stalling convoys.
export function reinforcementStepMs(cmd, gearSpd, reinSpeedMult) {
  const slots = normaliseTroopSlots(cmd);
  const spd = effectiveMarchSpd(
    gearSpd || cmd.spd || 60,
    slots.length ? slots.map(sl => sl.branch) : cmd.troopBranch
  );
  return Math.max(50, Math.floor(marchStepMs(spd) * (reinSpeedMult ?? 1) / 2));
}

// Add troops back to one barracks pool, limited by free barracks space.
export function returnToBarracks(counts, branchKey, amount, barracksCap) {
  if (!branchKey) return counts;
  const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
  const add = Math.min(amount, Math.max(0, barracksCap - total));
  return { ...counts, [branchKey]: (counts[branchKey] || 0) + add };
}

// Same, but the barracks limit is in COMMANDS (see barracks.js).
export function returnToBarracksCmds(counts, branchKey, amount, cmdCap) {
  if (!branchKey) return counts;
  const add = Math.min(amount, troopsThatFit(branchKey, cmdCap - poolCommands(counts)));
  return add > 0 ? { ...counts, [branchKey]: (counts[branchKey] || 0) + add } : counts;
}

// Pool a reinforcement draws from: the target commander's first slot type.
export function reinforcementSourceKey(cmd) {
  const slots = normaliseTroopSlots(cmd);
  const b = slots[0]?.branch ?? cmd.troopBranch;
  return b ? troopPoolKey({ ...b, tier: b.tier ?? 0 }) : null;
}

// Outbound march should turn back: commander gone/emptied, or destination lost.
export function reinforcementAborted(rm, targetCmd, destTile, hqKey) {
  if (rm.returning) return false;
  const destKey = rm.path[rm.path.length - 1];
  const cmdGone = !targetCmd || (targetCmd.troops === 0 && !targetCmd.march && targetCmd.tk !== destKey);
  const tileFlipped = destTile && destTile.owner !== "player" && destKey !== hqKey;
  return Boolean(cmdGone || tileFlipped);
}

// Advance one march, catching up every step real elapsed time allows (not
// just one) so a reinforcement convoy still arrives on schedule after the
// tab/phone was backgrounded. Returns {state:"wait"|"step"|"arrived", rm}.
export function stepReinforcement(rm, now) {
  if (now - rm.lastStepTime < rm.stepMs) return { state: "wait", rm };
  let step = rm.step, lastStepTime = rm.lastStepTime;
  while (now - lastStepTime >= rm.stepMs) {
    step += 1;
    if (step >= rm.path.length) return { state: "arrived", rm };
    lastStepTime += rm.stepMs;
  }
  return { state: "step", rm: { ...rm, step, lastStepTime } };
}

// "faction:branch:tier" -> branch object.
export function branchFromKey(key) {
  if (!key) return null;
  const [faction, branch, tier] = key.split(":");
  return { faction, branch, tier: Number(tier) || 0 };
}

// Command points a commander's slots use, by each slot's troop size.
export function commandUsed(cmd) {
  return normaliseTroopSlots(cmd).reduce((s, sl) => s + (sl.troops || 0) * branchCommandCost(sl.branch), 0);
}

// How many troops can be sent: limited by command room (after troops already
// on the way) and by that troop type in barracks. Returns {srcKey, room, available, maxAdd}.
export function reinforcementRoom({ cmd, commandCap, pool, inTransit = 0 }) {
  const srcKey = reinforcementSourceKey(cmd);
  if (!srcKey) return { srcKey, room: 0, available: 0, maxAdd: 0 };
  const cost = branchCommandCost(branchFromKey(srcKey));
  const room = Math.max(0, Math.floor((commandCap - commandUsed(cmd)) / cost + 1e-9) - inTransit);
  const available = pool[srcKey] || 0;
  return { srcKey, room, available, maxAdd: Math.max(0, Math.min(room, available)) };
}

// Merge arriving troops into the slot of their own type (or a free slot),
// limited by command room at their real size. Returns {cmd, overflow}.
export function mergeReinforcement(cmd, branchKey, amount, commandCap) {
  const branch = branchFromKey(branchKey);
  if (!branch || amount <= 0) return { cmd, overflow: Math.max(0, amount) };
  const slots = [...normaliseTroopSlots(cmd)];
  const idx = slots.findIndex(sl => sl.branch && troopPoolKey({ ...sl.branch, tier: sl.branch.tier ?? 0 }) === branchKey);
  if (idx === -1 && slots.length >= MAX_TROOP_SLOTS) return { cmd, overflow: amount };
  const room = Math.max(0, Math.floor((commandCap - commandUsed(cmd)) / branchCommandCost(branch) + 1e-9));
  const add = Math.min(amount, room);
  if (add > 0) {
    if (idx === -1) slots.push({ branch, troops: add });
    else slots[idx] = { ...slots[idx], troops: (slots[idx].troops || 0) + add };
  }
  return { cmd: add > 0 ? withTroopSlots(cmd, slots) : cmd, overflow: amount - add };
}

// ── Withdraw troops from a specific slot ─────────────────────────────────────
// Pulls `amount` troops out of slot[slotIndex], returns {cmd, withdrawn, branchKey}.
// The withdrawn troops march home as a "returning" convoy reusing the same
// reinforcement path infra in useReinforcements.
export function withdrawFromArmy(cmd, slotIndex, amount) {
  const slots = [...normaliseTroopSlots(cmd)];
  const sl = slots[slotIndex];
  if (!sl || !sl.branch || (sl.troops || 0) <= 0) {
    return { cmd, withdrawn: 0, branchKey: null };
  }
  const take = Math.max(0, Math.min(amount, sl.troops || 0));
  if (take === 0) return { cmd, withdrawn: 0, branchKey: troopPoolKey({ ...sl.branch, tier: sl.branch.tier ?? 0 }) };
  const branchKey = troopPoolKey({ ...sl.branch, tier: sl.branch.tier ?? 0 });
  slots[slotIndex] = { ...sl, troops: (sl.troops || 0) - take };
  // Remove empty slots (keeps at least one so the commander stays valid)
  const pruned = slots.filter((s, i) => i === 0 || (s.troops || 0) > 0);
  return { cmd: withTroopSlots(cmd, pruned), withdrawn: take, branchKey };
}
