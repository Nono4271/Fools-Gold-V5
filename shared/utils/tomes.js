// Pure rules for Wizard's Tomes power accumulation (moved out of useTomes.js).
export const TOMES_TICK_MS = 10_000; // power pool ticks every 10 s

// Power-pool tick. powerPerHr is the current hourly rate. elapsedMs defaults
// to one tick period so callers that don't pass it behave exactly as before
// (pph / 360 per 10 s); passing the real elapsed time credits a tick that
// fired late (backgrounded tab, locked phone) the full gap instead of losing
// it. Returns the same value when nothing is owed so setState can bail out.
export function tomesPowerTick(currentPool, powerPerHr, elapsedMs = TOMES_TICK_MS) {
  if (!(powerPerHr > 0) || !(elapsedMs > 0)) return currentPool;
  return currentPool + powerPerHr * elapsedMs / 3_600_000;
}
