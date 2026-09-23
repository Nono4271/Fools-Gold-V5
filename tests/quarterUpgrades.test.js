import test from 'node:test';
import assert from 'node:assert/strict';
import { upgCost, upgDuration, upgCostQuarter, upgDurationQuarter, upgCostBranch, upgDurationBranch, BLDG } from '../shared/constants/buildings.js';
import { FACTION_TROOPS } from '../shared/constants/troops.js';
import { getFactionAlignment } from '../shared/constants/factions.js';

const MIN = 60e3, HR = 36e5;
const tot = c => (c.wood || 0) + (c.stone || 0) + (c.gas || 0);

test('quarters: 5 min to unlock → 24 h to reach Lv10, always rising', () => {
  assert.equal(upgDurationQuarter(1), 5 * MIN);
  assert.equal(upgDurationQuarter(10), 24 * HR);
  for (let l = 2; l <= 10; l++) assert.ok(upgDurationQuarter(l) > upgDurationQuarter(l - 1), `Lv${l}`);
  for (let l = 1; l < 10; l++) assert.ok(tot(upgCostQuarter(l)) > tot(upgCostQuarter(l - 1)), `cost Lv${l + 1}`);
  assert.equal(upgCostQuarter(10), null);
});

test('branches: 10 min to unlock → 12 h to reach Lv6, always rising', () => {
  assert.equal(upgDurationBranch(1), 10 * MIN);
  assert.equal(upgDurationBranch(6), 12 * HR);
  for (let l = 2; l <= 6; l++) assert.ok(upgDurationBranch(l) > upgDurationBranch(l - 1), `Lv${l}`);
  for (let l = 1; l < 6; l++) assert.ok(tot(upgCostBranch(l)) > tot(upgCostBranch(l - 1)), `cost Lv${l + 1}`);
  assert.equal(upgCostBranch(6), null);
});

test('quarter / branch costs sit in the upper range of building upgrades of similar length', () => {
  const pts = [];
  for (const t of Object.keys(BLDG)) for (let l = 0; l < 20; l++) {
    const c = upgCost(t, l); if (!c) break;
    const d = upgDuration(t, l + 1); if (d) pts.push({ d, v: tot(c) });
  }
  const rank = (d, v) => { // share of the 8 closest-length building upgrades that cost less
    const near = [...pts].sort((a, b) => Math.abs(Math.log(a.d / d)) - Math.abs(Math.log(b.d / d))).slice(0, 8);
    return near.filter(x => x.v < v).length / near.length;
  };
  for (let l = 1; l <= 10; l++) assert.ok(rank(upgDurationQuarter(l), tot(upgCostQuarter(l - 1))) >= 0.5, `quarter Lv${l}`);
  for (let l = 1; l <= 6; l++) assert.ok(rank(upgDurationBranch(l), tot(upgCostBranch(l - 1))) >= 0.5, `branch Lv${l}`);
});

test('admin: MAX ALL maxes every building, every quarter of your alignment and every branch in them', async () => {
  const { adminMaxedBase } = await import('../src/testmode/adminRules.js');
  const { bldgs, quarterLevels, keys } = adminMaxedBase('pirates', FACTION_TROOPS, getFactionAlignment);
  for (const [k, def] of Object.entries(BLDG)) assert.equal(bldgs[k], def.max, k);
  assert.deepEqual(Object.keys(quarterLevels).sort(), ['coldborns', 'holyknights', 'pirates', 'wizards']);
  assert.ok(Object.values(quarterLevels).every(v => v === 10));
  assert.equal(bldgs.b_pirates_swashbucklers, 6);
  assert.ok(keys.has('q_wizards') && keys.has('hq'));
  assert.ok(!('b_orcs_grunts' in bldgs));
});
