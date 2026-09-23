import test from 'node:test';
import assert from 'node:assert/strict';
import { BLDG, maxAvailLevel, hqUpgradeBlocker, barracksUpgradeBlocker, trainingUpgradeBlocker, quarterMaxLevel } from '../shared/constants/buildings.js';

test('barracks and training can both leave Lv0 (no circular requirement)', () => {
  assert.equal(barracksUpgradeBlocker(1, { training: 0 }), null);
  assert.notEqual(trainingUpgradeBlocker(1, { barracks: 0, commandcenter: 0 }), null);
  assert.equal(trainingUpgradeBlocker(1, { barracks: 1, commandcenter: 0 }), null);
  assert.notEqual(barracksUpgradeBlocker(3, { training: 1 }), null); // barracks leads by at most 1
});

test('every building can reach its max level by upgrading whatever is allowed', () => {
  const b = Object.fromEntries(Object.keys(BLDG).map(k => [k, 0])); b.hq = 1; let q1 = 1;
  for (let i = 0; i < 5000; i++) {
    let moved = false;
    for (const k of Object.keys(BLDG)) {
      const lvl = b[k]; if (lvl >= BLDG[k].max || lvl >= maxAvailLevel(k, b.hq)) continue;
      const t = lvl + 1;
      const blk = k === 'hq' ? hqUpgradeBlocker(t, { barracks: b.barracks, training: b.training, commandcenter: b.commandcenter, q1Lvl: q1 })
        : k === 'barracks' ? barracksUpgradeBlocker(t, { training: b.training })
        : k === 'training' ? trainingUpgradeBlocker(t, { barracks: b.barracks, commandcenter: b.commandcenter }) : null;
      if (!blk) { b[k] = t; moved = true; }
    }
    if (q1 < quarterMaxLevel(0, b.hq)) { q1++; moved = true; }
    if (!moved) break;
  }
  const stuck = Object.keys(BLDG).filter(k => b[k] < BLDG[k].max).map(k => `${k} ${b[k]}/${BLDG[k].max}`);
  assert.deepEqual(stuck, []);
});
