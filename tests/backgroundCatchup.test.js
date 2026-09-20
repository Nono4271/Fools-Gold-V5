import test from 'node:test';
import assert from 'node:assert/strict';

// ── Background/offline timer catch-up (roadmap item: training, building,
// healing, forts, marches, resources should catch up after the tab/phone
// was backgrounded, not lose progress). Training, healing, building
// upgrades and forts already compared against absolute timestamps and
// needed no fix — covered by existing tests. These tests cover the pieces
// that used to add a fixed amount per timer firing (resources, egg/stamina
// regen) and the ones that used to advance only one step per call
// (reinforcement marches, commander marches). ──

import { resourceIncomeTick } from '../shared/utils/resourceIncome.js';
import { regenEggs, regenStamina, EGG_REGEN_MS, STAMINA_REGEN_MS } from '../shared/utils/tactics.js';
import { stepReinforcement } from '../shared/utils/reinforcements.js';
import { advanceMarch } from '../shared/utils/marchMotion.js';

test('resource income credits the full elapsed gap, not one fixed tick', () => {
  const empty = { stone: 0, wood: 0, gas: 0, food: 0 };
  const oneMin = resourceIncomeTick(empty, {}, {}, [], {});
  const tenMin = resourceIncomeTick(empty, {}, {}, [], {}, 10 * 60000);
  assert.ok(Math.abs(tenMin.stone - oneMin.stone * 10) < 1e-6);
});

test('egg regen catches up on the real elapsed gap instead of losing backgrounded time', () => {
  const oneTick = regenEggs(0, 20);
  const caughtUp = regenEggs(0, 20, 10 * EGG_REGEN_MS);
  assert.ok(Math.abs(caughtUp - oneTick * 10) < 1e-9);
  assert.equal(regenEggs(25, 20, 10 * EGG_REGEN_MS), 25);
});

test('stamina regen catches up whole ticks owed for the elapsed gap', () => {
  const cmd = { stamina: 10 };
  assert.equal(regenStamina(cmd, 150, STAMINA_REGEN_MS * 5).stamina, 15);
  assert.equal(regenStamina(cmd, 150, STAMINA_REGEN_MS * 500).stamina, 150); // capped at max
  assert.equal(regenStamina(cmd, 150, STAMINA_REGEN_MS - 1).stamina, 10); // partial tick owed nothing yet
});

test('reinforcement march catches up multiple steps in one call after a long pause', () => {
  const rm = { path: ['a', 'b', 'c', 'd', 'e'], step: 0, stepMs: 100, lastStepTime: 0 };
  // Paused for 350ms worth of steps -> should land on step 3, not step 1.
  const r = stepReinforcement(rm, 350);
  assert.equal(r.state, 'step');
  assert.equal(r.rm.step, 3);
  assert.equal(r.rm.lastStepTime, 300);
});

test('reinforcement march reports arrival even after skipping the final steps', () => {
  const rm = { path: ['a', 'b', 'c'], step: 0, stepMs: 100, lastStepTime: 0 };
  const r = stepReinforcement(rm, 10000);
  assert.equal(r.state, 'arrived');
});

test('advanceMarch fast-forwards a commander through several tiles after a long pause', () => {
  const path = ['0,0', '1,0', '2,0', '3,0', '4,0']; // straight line, no diagonal scaling
  // stepMs of 1000 -> marchSegmentMs applies MARCH_TIME_SCALE (0.85) -> 850ms/segment.
  const r = advanceMarch(0, 0, path, 1000, 3400); // 4 segments' worth of time
  assert.equal(r.advanced, true);
  assert.equal(r.step, 4);
  assert.equal(r.reachedEnd, true);
  assert.equal(r.lastStepTime, 3400);
});

test('advanceMarch does nothing when no step is due yet', () => {
  const path = ['0,0', '1,0'];
  const r = advanceMarch(0, 1000, path, 1000, 1500);
  assert.equal(r.advanced, false);
});
