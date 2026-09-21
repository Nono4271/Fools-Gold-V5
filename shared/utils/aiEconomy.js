// Pure rules for the AI barracks pool (troops trained per faction).
//
// Before: every 5 s economy tick instantly added up to 500 troops for a flat
// 500 wood / 500 gas / 1000 food whenever the pool was below its cap, so a
// faction's barracks refilled constantly. Now the AI trains the way the player
// does: troops come in commands (100 for a small branch), each command is paid
// for when training STARTS, takes real time, and only lands in the pool when it
// finishes. A faction can run at most `trainingQueueCount(training level)`
// commands at once per AI commander, and never trains past its barracks cap
// (pool + troops still in training + this command <= capacity).
//
// Prices/time are the player's tier-0 small-branch quote (shared/utils/training.js
// BASE_COST[0], SMALL_MINUTES[0]); the worker has no FACTION_TROOPS so it can't
// quote a specific branch.
import { barracksCapacity, trainingQueueCount, CMD_SIZE, cmdCommand } from "../constants/buildings.js";

export const AI_TRAIN_COMMAND = Object.freeze({
  size: CMD_SIZE.small,
  ms: 12 * 60 * 1000,
  cost: Object.freeze({ wood: 900, gas: 700, food: 1400 }),
});

// Concurrent training slots for a faction: the player's queue count for the
// training building level, once per AI commander (each AI commander stands in
// for a player).
export function aiTrainingSlots(trainingLvl, commanderCount) {
  return trainingQueueCount(trainingLvl || 0) * Math.max(1, commanderCount || 0);
}

// One economy pass. `queue` is the list of finish timestamps (ms) of commands
// currently in training. Returns { pool, rss, queue, delivered, started }.
// Real timestamps mean a throttled/backgrounded worker still delivers everything
// that finished while it was away.
export function aiTrainingTick({ pool, rss, queue = [], trainingLvl = 0, barracksLvl = 0, commanderCount = 1, now }) {
  const { size, ms, cost } = AI_TRAIN_COMMAND;

  // 1) Deliver finished commands.
  const remaining = queue.filter(t => t > now);
  const delivered = (queue.length - remaining.length) * size;
  let nextPool = pool + delivered;

  // 2) Start new commands while there is a free slot, room, and money.
  const cap = barracksCapacity(barracksLvl);
  const slots = aiTrainingSlots(trainingLvl, commanderCount);
  let nextRss = rss;
  let started = 0;
  while (
    remaining.length < slots &&
    nextPool + (remaining.length + 1) * size <= cap &&
    Object.entries(cost).every(([k, v]) => (nextRss[k] ?? 0) >= v)
  ) {
    nextRss = { ...nextRss };
    for (const [k, v] of Object.entries(cost)) nextRss[k] -= v;
    remaining.push(now + ms);
    started++;
  }
  return { pool: nextPool, rss: nextRss, queue: remaining, delivered, started };
}

// ── Troop hand-out cap ───────────────────────────────────────────────────────
// How many troops one AI commander may be handed. Same rule as the player: a
// commander has cmdCommand(level, command-centre level) command points and every
// troop of a small branch costs COMMAND_COST.small (0.01) of them, so a lvl-5
// commander with no command centre holds 500 troops. (The worker used to index the
// command-centre bonus table by the COMMANDER's level - 18 points, i.e. 1,800
// troops, for a lvl-5 commander - and ignored the faction's real command centre.)
// AI troops are a single small-branch stack; the worker can't import COMMAND_COST
// without pulling in all troop data, so tests/aiEconomy.test.js pins this value.
export const AI_TROOP_COMMAND_COST = 0.01;
export function aiTroopCap(cmdLvl, commandCenterLvl = 0) {
  return Math.floor(cmdCommand(cmdLvl || 1, commandCenterLvl || 0, 0) / AI_TROOP_COMMAND_COST + 1e-9);
}

// ── Resource spending as a delta ────────────────────────────────────────────
// The economy pass decides from a snapshot of the faction's resources. It used to
// send back the absolute post-spend amounts, which overwrote whatever income had
// been credited since the snapshot. It now sends only what was spent, and the
// main thread subtracts that from the live amounts.
const RSS_KEYS = ["stone", "wood", "gas", "food"];
export function rssSpent(before, after) {
  const out = {};
  for (const k of RSS_KEYS) {
    const d = (before?.[k] ?? 0) - (after?.[k] ?? 0);
    if (d > 0) out[k] = d;
  }
  return out;
}
export function applyRssSpent(current, spent) {
  const next = { ...current };
  for (const k of RSS_KEYS) if (spent?.[k] > 0) next[k] = Math.max(0, (next[k] ?? 0) - spent[k]);
  return next;
}
