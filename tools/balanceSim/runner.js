// ─────────────────────────────────────────────────────────────────────────────
//  runner.js — pure simulation runner. Given two loadouts, runs N SEEDED
//  trials through the real, unmodified `simBattle` and returns aggregate
//  stats. No live randomness: every trial's Math.random is swapped for a
//  deterministic LCG for the duration of that one simBattle call, so a
//  failing test in tests/balance/*.test.js reproduces exactly, every time.
//
//  Same seeded-RNG-swap pattern `tests/battle.test.js` already uses
//  (`seeded(fn)`), just parameterized per trial so a whole run of N trials
//  is deterministic as a sequence, not just each call in isolation.
// ─────────────────────────────────────────────────────────────────────────────
import { simBattle } from "../../shared/utils/battle.js";
import { COMMAND_COST } from "../../shared/constants/troops.js";
import { troopsForBudget } from "./loadoutCatalog.js";
import { buildCommander } from "./commanderFactory.js";

// Mulberry32-style LCG — deterministic, fast, no external dependency.
function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function withSeededRandom(seed, fn) {
  const old = Math.random;
  Math.random = makeRng(seed);
  try {
    return fn();
  } finally {
    Math.random = old;
  }
}

// Neutral terrain (0 def bonus), no HQ/fort/wall — isolates troop-vs-troop
// balance from terrain/siege modifiers, which are a separate system.
function neutralDefTile(defCmd, garrison) {
  return { terrain: "grass", isHQ: false, isKeep: false, isGate: false, garrison, defCmd };
}

// Run one seeded trial: `loadoutA` attacks `loadoutB`, both sized to `budget`
// command points via COMMAND_COST. Returns the raw simBattle result.
export function runOneTrial(loadoutA, loadoutB, budget, seed) {
  const troopsA = troopsForBudget(loadoutA, budget);
  const troopsB = troopsForBudget(loadoutB, budget);
  const cmdA = buildCommander(loadoutA, troopsA);
  const cmdB = buildCommander(loadoutB, troopsB);
  const defTile = neutralDefTile(cmdB, troopsB);
  return withSeededRandom(seed, () => simBattle(cmdA, troopsA, defTile, 0));
}

// Run `trials` seeded battles of loadoutA (attacker) vs loadoutB (defender)
// at a fixed command-point budget, and aggregate the results.
export function runMatchup(loadoutA, loadoutB, { budget = 500, trials = 60, baseSeed = 1 } = {}) {
  let wins = 0;
  let draws = 0;
  let totalLostPct = 0;
  let totalLostPctOnWins = 0;
  let totalRounds = 0;
  let totalDmgPerRound = 0;
  const troopsA = troopsForBudget(loadoutA, budget);

  for (let i = 0; i < trials; i++) {
    const seed = (baseSeed * 2654435761 + i * 40503) >>> 0;
    const r = runOneTrial(loadoutA, loadoutB, budget, seed);
    const lostPct = troopsA > 0 ? r.lost / troopsA : 0;
    if (r.won) { wins++; totalLostPctOnWins += lostPct; }
    else if (r.isDraw) draws++;
    totalLostPct += lostPct;
    // Real combat rounds fought, excluding the phase-0 pre-battle log entry.
    const roundsFought = Math.max(1, r.report.rounds.length - 1);
    totalRounds += roundsFought;
    // "Damage" proxied as defender troops killed (report doesn't expose raw
    // HP outside battle.js's own closure) — same unit the rest of the
    // codebase already treats damage/outcomes in (troop counts drive xp/pct).
    const defTroopsStart = r.report.defTroopsStart;
    const defTroopsEnd = r.report.defTroopsEnd;
    totalDmgPerRound += (defTroopsStart - defTroopsEnd) / roundsFought;
  }

  return {
    loadoutA: loadoutA.label,
    loadoutB: loadoutB.label,
    trials,
    budget,
    troopsA,
    winRate: wins / trials,
    drawRate: draws / trials,
    lossRate: (trials - wins - draws) / trials,
    avgTroopsLostPct: totalLostPct / trials,
    // Only defined over the trials that were actually won; null when the
    // loadout never won (its efficiency score is 0 regardless — see matrix.js).
    avgTroopsLostPctOnWins: wins > 0 ? totalLostPctOnWins / wins : null,
    avgRounds: totalRounds / trials,
    avgDmgPerRound: totalDmgPerRound / trials,
  };
}

export { COMMAND_COST };
