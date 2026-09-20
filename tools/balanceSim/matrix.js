// ─────────────────────────────────────────────────────────────────────────────
//  matrix.js — coverage matrix generator + outlier detection.
//
//  Same-tier bracket = "apples-to-apples": every ordered pair of loadouts
//  sharing a tier bracket (T1/T2/T3/T4-and-Ancients) is run attacker vs
//  defender, both sides sized to the SAME command-point budget (see
//  `troopsForBudget` — small/medium/large armies are budget-equal, not
//  troop-count-equal). Cross-tier and mirror (self-vs-self) matchups are
//  also generated for the report, but outlier flagging only ever compares a
//  loadout against its own bracket, per the brief ("same-tier, same-budget
//  opponent").
//
//  Efficiency score: winRate(as attacker, averaged over every same-bracket
//  opponent) × (1 − avg troops lost, counted only on the trials it actually
//  won). A unit that wins often AND cheaply (few of its own troops, already
//  budget-normalized) scores high; one that never wins scores 0. This is the
//  "troops needed to win per unit of command-cost budget" the brief asks
//  for — documented explicitly because the raw metric is inherently a
//  design choice among a few reasonable readings; see the ReadMeAI entry
//  for this tool.
// ─────────────────────────────────────────────────────────────────────────────
import { buildCatalog, loadoutsByBracket, TIER_BRACKETS } from "./loadoutCatalog.js";
import { runMatchup } from "./runner.js";

export const THRESHOLDS = {
  // A same-tier, same-budget matchup this lopsided is flagged.
  winRateHigh: 0.70,
  winRateLow: 0.30,
  // Efficiency outlier: more than this many std devs from its tier's mean.
  efficiencyStdDevs: 2,
};

function mean(nums) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function stdDev(nums, avg = mean(nums)) {
  if (nums.length < 2) return 0;
  const variance = mean(nums.map(n => (n - avg) ** 2));
  return Math.sqrt(variance);
}

// Runs every ordered same-bracket pair (A attacks B, A !== B) plus every
// loadout mirrored against itself, and a handful of deliberate cross-tier
// checks (T1 capstone-adjacent sanity, lowest vs highest bracket) for the
// report — NOT used for outlier flagging, coverage only.
export function runCoverageMatrix({
  budget = 500, trials = 60, baseSeed = 1,
  includeMirror = true, includeCrossTier = true,
} = {}) {
  const catalog = buildCatalog();
  const buckets = loadoutsByBracket(catalog);

  const bracketMatchups = {}; // bracketIndex -> [] of runMatchup results
  const mirrorMatchups = [];  // every loadout vs itself
  const crossTierMatchups = []; // T1 vs T4 sanity spot-checks

  for (const bracketIdx of [0, 1, 2, 3]) {
    const members = buckets[bracketIdx];
    const results = [];
    for (const a of members) {
      for (const b of members) {
        if (a === b) continue;
        results.push(runMatchup(a, b, { budget, trials, baseSeed: baseSeed + hashPair(a, b) }));
      }
    }
    bracketMatchups[bracketIdx] = results;
  }

  if (includeMirror) {
    for (const l of catalog) {
      mirrorMatchups.push(runMatchup(l, l, { budget, trials, baseSeed: baseSeed + hashPair(l, l) }));
    }
  }

  // Cross-tier spot-check: every bracket's members vs the bracket directly
  // above (T1→T2, T2→T3, T3→T4) at the same budget — purely informational,
  // shows how power scales tier-to-tier; never used for outlier flagging
  // (that's explicitly same-tier only per the brief).
  if (includeCrossTier) {
    for (let bracketIdx = 0; bracketIdx < 3; bracketIdx++) {
      const lower = buckets[bracketIdx];
      const upper = buckets[bracketIdx + 1];
      for (const a of lower) {
        for (const b of upper) {
          crossTierMatchups.push(runMatchup(a, b, { budget, trials, baseSeed: baseSeed + hashPair(a, b) }));
        }
      }
    }
  }

  return { catalog, bracketMatchups, mirrorMatchups, crossTierMatchups, config: { budget, trials, baseSeed } };
}

function hashPair(a, b) {
  const s = `${a.label}::${b.label}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ── Outlier detection ─────────────────────────────────────────────────────
export function detectOutliers({ bracketMatchups }) {
  const matchupOutliers = [];
  const efficiencyOutliers = [];

  for (const bracketIdx of [0, 1, 2, 3]) {
    const results = bracketMatchups[bracketIdx] || [];

    // 1) Lopsided same-tier matchups.
    for (const r of results) {
      if (r.winRate > THRESHOLDS.winRateHigh || r.winRate < THRESHOLDS.winRateLow) {
        matchupOutliers.push({
          bracket: TIER_BRACKETS[bracketIdx],
          attacker: r.loadoutA,
          defender: r.loadoutB,
          winRate: r.winRate,
          reason: r.winRate > THRESHOLDS.winRateHigh
            ? `${r.loadoutA} wins ${(r.winRate * 100).toFixed(0)}% vs ${r.loadoutB} (same tier, same budget)`
            : `${r.loadoutA} wins only ${(r.winRate * 100).toFixed(0)}% vs ${r.loadoutB} (same tier, same budget)`,
        });
      }
    }

    // 2) Per-unit efficiency outliers within this bracket.
    const byAttacker = new Map();
    for (const r of results) {
      if (!byAttacker.has(r.loadoutA)) byAttacker.set(r.loadoutA, []);
      byAttacker.get(r.loadoutA).push(r);
    }
    const efficiencies = [];
    for (const [label, matchups] of byAttacker) {
      const winRate = mean(matchups.map(m => m.winRate));
      const winsWithLoss = matchups.filter(m => m.avgTroopsLostPctOnWins != null);
      const avgLostPctOnWins = winsWithLoss.length ? mean(winsWithLoss.map(m => m.avgTroopsLostPctOnWins)) : 0;
      const efficiency = winRate * (1 - avgLostPctOnWins);
      efficiencies.push({ label, winRate, avgLostPctOnWins, efficiency });
    }
    const effValues = efficiencies.map(e => e.efficiency);
    const avgEff = mean(effValues);
    const sdEff = stdDev(effValues, avgEff);
    for (const e of efficiencies) {
      const z = sdEff > 0 ? (e.efficiency - avgEff) / sdEff : 0;
      if (Math.abs(z) > THRESHOLDS.efficiencyStdDevs) {
        efficiencyOutliers.push({
          bracket: TIER_BRACKETS[bracketIdx],
          label: e.label,
          efficiency: e.efficiency,
          bracketMeanEfficiency: avgEff,
          bracketStdDevEfficiency: sdEff,
          zScore: z,
          reason: `${e.label} efficiency ${e.efficiency.toFixed(3)} is ${z.toFixed(1)} std devs from its T${bracketIdx + 1} tier mean (${avgEff.toFixed(3)})`,
        });
      }
    }
  }

  return { matchupOutliers, efficiencyOutliers };
}
