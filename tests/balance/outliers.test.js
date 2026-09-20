// The actual "no commander/unit is overpowered" gate.
//
// Deterministic (seeded — see runner.js), and deliberately scoped to the
// EFFICIENCY-outlier metric rather than raw same-tier matchup win rate: a
// full run of the coverage matrix (see `npm run balance-report`) shows that,
// at command-cost-normalized troop counts, ~90%+ of individual 1-branch-vs-
// 1-branch same-tier matchups clear the 70%/30% win-rate bar — that bar is
// real and reported (see reports/report.md), but it doesn't discriminate at
// this game's current scale, so it isn't used as a pass/fail condition here.
// Per-unit efficiency (win rate averaged across EVERY same-tier opponent,
// weighted by how cheaply it wins) is the meaningful, discriminating signal,
// and is what this gate enforces.
//
// Uses a smaller trial count than `npm run balance-report`'s default (still
// seeded/deterministic) to keep this fast enough for a normal test run;
// skips mirror/cross-tier matchups entirely since neither feeds the gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCoverageMatrix, detectOutliers, THRESHOLDS } from '../../tools/balanceSim/matrix.js';

const MATRIX_OPTS = { trials: 40, budget: 500, baseSeed: 1, includeMirror: false, includeCrossTier: false };

test('no faction branch, neutral unit, or Ancient is a same-tier efficiency outlier', () => {
  const matrix = runCoverageMatrix(MATRIX_OPTS);
  const { efficiencyOutliers } = detectOutliers(matrix);

  if (efficiencyOutliers.length > 0) {
    const detail = efficiencyOutliers.map(o => `  - [${o.bracket}] ${o.reason}`).join('\n');
    assert.fail(
      `${efficiencyOutliers.length} unit(s) are >${THRESHOLDS.efficiencyStdDevs} std devs from their tier's mean efficiency ` +
      `(same-tier, command-cost-normalized budget of ${MATRIX_OPTS.budget}, ${MATRIX_OPTS.trials} seeded trials/matchup):\n${detail}\n` +
      `See tools/balanceSim/ (run \`npm run balance-report\` for full detail) and the dated ReadMeAI.md entry for this tool.`
    );
  }
});

test('every catalog entry wins at least once against its own tier bracket (nothing is a dead unit)', () => {
  const matrix = runCoverageMatrix(MATRIX_OPTS);
  const deadUnits = [];
  for (const bracketResults of Object.values(matrix.bracketMatchups)) {
    const byAttacker = new Map();
    for (const r of bracketResults) {
      if (!byAttacker.has(r.loadoutA)) byAttacker.set(r.loadoutA, []);
      byAttacker.get(r.loadoutA).push(r.winRate);
    }
    for (const [label, rates] of byAttacker) {
      if (rates.every(rate => rate === 0)) deadUnits.push(label);
    }
  }
  assert.deepEqual(deadUnits, [], `Unit(s) that never win a single trial against ANY same-tier opponent: ${deadUnits.join(', ')}`);
});
