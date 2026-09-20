// Pure rules for dragon-egg tactics, gather/training ticks, egg regen and stamina regen
// (moved from Game.jsx).
import { XP_PER_COMMAND } from "../constants/map.js";
import { TILE_RATE_BY_PL } from "./resourceIncome.js";

export const TICK_MS = 10 * 60 * 1000;       // gather/training act every 10 minutes
export const EGG_COST = { quickGather: 3, gather: 1, training: 2, longMarch: 10, quickMarch: 5 };
export const SWEEP_STAMINA = 10;
export const STAMINA_BASE = 150;
export const STAMINA_REGEN_MS = 3 * 60 * 1000; // +1 stamina every 3 min (= 20/hr)
export const STAMINA_PER_REGEN = 1;
export const EGG_REGEN_MS = 60 * 1000;          // eggs refill the full cap in 24h, ticked each minute

// Command budget per tile power, used for training XP.
const POWER_COMMAND = { 1:0.3,2:2.5,3:4,4:8,5:10,6:15,7:18,8:30,9:35,10:55,11:65,12:75,13:90 };

const tileRate = pl => TILE_RATE_BY_PL[pl] ?? 240;

export function dragonEggCap(tomeLevels) { return 20 + (tomeLevels?.tr ?? 0); }

// Egg-regen tick. elapsedMs defaults to one regen period so callers that
// don't pass it (existing per-minute loops) behave exactly as before;
// passing the real elapsed time credits a late-firing tick the full gap
// instead of losing whatever time the interval was paused/throttled for.
export function regenEggs(eggs, cap, elapsedMs = EGG_REGEN_MS) {
  if (eggs >= cap) return eggs;
  return Math.min(cap, eggs + cap * elapsedMs / (24 * 60 * 60 * 1000));
}

// Stamina-regen tick for one commander (missing stamina counts as full).
// Same elapsedMs catch-up pattern as regenEggs.
export function regenStamina(cmd, max, elapsedMs = STAMINA_REGEN_MS) {
  const cur = cmd.stamina ?? max;
  if (cur >= max) return cmd;
  const gained = Math.floor(elapsedMs / STAMINA_REGEN_MS) * STAMINA_PER_REGEN;
  if (gained <= 0) return cmd;
  return { ...cmd, stamina: Math.min(max, cur + gained) };
}

// Quick Gather: instant 3 hours of the tile's rate +10%. Null if not allowed.
export function quickGatherReward(tile, eggs) {
  if (eggs < EGG_COST.quickGather) return null;
  const pl = tile?.powerLevel ?? 0;
  if (pl < 2 || !tile?.rss) return null;
  return { rss: tile.rss, amount: Math.floor(tileRate(pl) * 3 * 1.1) };
}

// Commander fields that start a gather or training order.
export function gatherOrder(tileKey, ticks, isTraining, now) {
  return {
    gathering: !isTraining, training: isTraining, gatherTileKey: tileKey,
    gatherTicks: ticks, gatherTicksDone: 0, gatherStartMs: now,
    trainingTicks: isTraining ? ticks : undefined,
    trainingStartMs: isTraining ? now : undefined,
    trainingTicksDone: isTraining ? 0 : undefined,
  };
}

// Whole 10-minute ticks owed since start, capped at the order length.
function ticksOwed(startMs, total, done, now) {
  const due = Math.min(total ?? 1, Math.floor((now - (startMs ?? now)) / TICK_MS));
  return due > done ? due - done : 0;
}

// Gather tick. Returns null (nothing due), {stop:true} (tile gone) or the result.
export function gatherTick(cmd, tile, now) {
  if (!cmd.gathering || !cmd.gatherTileKey) return null;
  if (!tile) return { stop: true };
  const done = cmd.gatherTicksDone ?? 0;
  const newTicks = ticksOwed(cmd.gatherStartMs, cmd.gatherTicks, done, now);
  if (!newTicks) return null;
  const nextDone = done + newTicks;
  return {
    newTicks, eggs: newTicks * EGG_COST.gather,
    rss: tile.rss || null, amount: Math.floor(tileRate(tile.powerLevel ?? 2) * 4 * newTicks),
    patch: { gatherTicksDone: nextDone, gathering: nextDone < (cmd.gatherTicks ?? 1) },
  };
}

// Training tick. Returns null (nothing due) or the XP / egg result.
export function trainingTick(cmd, tilePl, xpMult, now) {
  if (!cmd.training) return null;
  const done = cmd.trainingTicksDone ?? 0;
  const newTicks = ticksOwed(cmd.trainingStartMs, cmd.trainingTicks, done, now);
  if (!newTicks) return null;
  const xpPerTick = Math.round((POWER_COMMAND[tilePl] ?? 0.3) * (XP_PER_COMMAND[2] ?? 850) * 0.25);
  const nextDone = done + newTicks;
  return {
    newTicks, eggs: newTicks * EGG_COST.training, xp: Math.round(xpPerTick * xpMult * newTicks),
    patch: { trainingTicksDone: nextDone, training: nextDone < (cmd.trainingTicks ?? 1) },
  };
}

// Recon report entry for the battle log.
export function reconReport(tileKey, tile, garrison, now) {
  return {
    type: "recon", timestamp: now, tileKey,
    tileName: tile.regionName ?? tileKey, powerLevel: tile.powerLevel ?? 1,
    defCmdName: garrison?.n ?? "Garrison", defCmdIcon: garrison?.icon ?? "⚔",
    defLvl: garrison?.lvl ?? 1, defCmdCls: garrison?.cmdCls ?? null,
    defCmdStats: garrison?.stats ?? null, defSkillsSnapshot: garrison?.skills ?? [],
    defTroopBranch: garrison?.troopBranch ?? null,
    defTroopsStart: garrison?.troops ?? 0, defTroopsEnd: garrison?.troops ?? 0,
    defBust: null, atkName: null, atkIcon: null, won: null,
  };
}

// Stable seed for a spawn's commander.
export function spawnSeed(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}
