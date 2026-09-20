// Sanity/coverage tests for the balance simulator itself — these check the
// TOOLING is correct (catalog completeness, determinism), not game balance.
// The actual "no unit is overpowered" gate is in outliers.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, loadoutsByBracket, troopsForBudget } from '../../tools/balanceSim/loadoutCatalog.js';
import { runMatchup, runOneTrial } from '../../tools/balanceSim/runner.js';
import { FACTION_TROOPS, COMMAND_COST } from '../../shared/constants/troops.js';
import { NEUTRAL_TROOPS } from '../../shared/constants/neutralTroops.js';
import { ANCIENT_TROOPS } from '../../shared/constants/ancientTroops.js';

test('catalog covers every faction branch/tier, every neutral, every Ancient', () => {
  const catalog = buildCatalog();
  const expectedFactionCount = Object.values(FACTION_TROOPS)
    .filter(f => f !== FACTION_TROOPS.neutral) // the bridge's synthetic key, if installed first
    .reduce((sum, f) => sum + f.branches.reduce((s, b) => s + (b.capstone ? 1 : b.tiers.length), 0), 0);
  const factionLoadouts = catalog.filter(l => l.kind === 'faction');
  assert.equal(factionLoadouts.length, expectedFactionCount);
  assert.equal(catalog.filter(l => l.kind === 'neutral').length, NEUTRAL_TROOPS.length);
  assert.equal(catalog.filter(l => l.kind === 'ancient').length, ANCIENT_TROOPS.length);
});

test('every catalog entry lands in exactly one of the 4 tier brackets', () => {
  const catalog = buildCatalog();
  const buckets = loadoutsByBracket(catalog);
  const total = [0, 1, 2, 3].reduce((s, k) => s + buckets[k].length, 0);
  assert.equal(total, catalog.length);
  for (const l of catalog) assert.ok(l.tierBracket >= 0 && l.tierBracket <= 3, l.label);
});

test('troopsForBudget makes small/medium/large armies command-cost-equal, not troop-count-equal', () => {
  const catalog = buildCatalog();
  const small = catalog.find(l => l.size === 'small');
  const large = catalog.find(l => l.size === 'large');
  const budget = 500;
  const smallTroops = troopsForBudget(small, budget);
  const largeTroops = troopsForBudget(large, budget);
  assert.ok(smallTroops > largeTroops, 'small-unit army should have far more troops at the same budget');
  assert.ok(Math.abs(smallTroops * COMMAND_COST.small - budget) < 1);
  assert.ok(Math.abs(largeTroops * COMMAND_COST.large - budget) < 1);
});

test('a seeded trial is fully reproducible', () => {
  const catalog = buildCatalog();
  const a = catalog.find(l => l.kind === 'faction' && !l.capstone);
  const b = catalog.find(l => l.kind === 'faction' && l !== a && !l.capstone);
  const r1 = runOneTrial(a, b, 500, 12345);
  const r2 = runOneTrial(a, b, 500, 12345);
  assert.deepEqual(r1, r2);
});

test('runMatchup produces finite, in-range aggregate stats for a faction/neutral/ancient sample', () => {
  const catalog = buildCatalog();
  const faction = catalog.find(l => l.kind === 'faction');
  const neutral = catalog.find(l => l.kind === 'neutral');
  const ancient = catalog.find(l => l.kind === 'ancient');
  for (const [a, b] of [[faction, neutral], [neutral, ancient], [ancient, faction]]) {
    const r = runMatchup(a, b, { trials: 10 });
    assert.ok(r.winRate >= 0 && r.winRate <= 1, `${a.label} vs ${b.label} winRate`);
    assert.ok(Number.isFinite(r.avgTroopsLostPct));
    assert.ok(Number.isFinite(r.avgRounds));
    assert.ok(Number.isFinite(r.avgDmgPerRound));
  }
});
