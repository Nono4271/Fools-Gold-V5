import test from 'node:test';
import assert from 'node:assert/strict';
import {troopPoolKey, branchCommandCost, planTroopSlot, applyTroopSlotToPool, returnAllTroopsToPool, withTroopSlots, planArmySlots, applyPoolDelta} from '../shared/utils/troopSlots.js';

const swash = {faction:'pirates', branch:'swashbucklers', tier:0};
const beast = {faction:'pirates', branch:'sea_beasts', tier:0};
const kS = 'pirates:swashbucklers:0', kB = 'pirates:sea_beasts:0';
const run = (cmd, slotIndex, branch, newTroops, pool, commandCap = 5) => {
  const plan = planTroopSlot({cmd, slotIndex, branch, newTroops, pool, commandCap});
  return {plan, cmd: withTroopSlots(cmd, plan.slots), pool: applyTroopSlotToPool(pool, plan)};
};

test('pool keys and command costs', () => {
  assert.equal(troopPoolKey(swash), kS);
  assert.equal(troopPoolKey(null), null);
  assert.equal(troopPoolKey({faction:'pirates', branch:'x'}), null);
  assert.ok(branchCommandCost(beast) > branchCommandCost(swash));
});

test('new slot draws from the pool and is kept (Confirm regression)', () => {
  const r = run({uid:'a', lvl:5}, 0, swash, 100, {[kS]:300});
  assert.deepEqual(r.cmd.troopSlots, [{branch:swash, troops:100}]);
  assert.equal(r.cmd.troops, 100);
  assert.equal(r.pool[kS], 200);
});

test('draw is limited by pool and by command capacity', () => {
  assert.equal(run({uid:'a', lvl:5}, 0, swash, 100, {[kS]:40}).cmd.troops, 40);
  const cap = Math.floor(1 / branchCommandCost(swash));
  assert.equal(run({uid:'a', lvl:5}, 0, swash, 10000, {[kS]:10000}, 1).cmd.troops, cap);
});

test('lowering a slot returns the difference', () => {
  const cmd = {uid:'a', troopSlots:[{branch:swash, troops:100}]};
  const r = run(cmd, 0, swash, 30, {[kS]:0});
  assert.equal(r.cmd.troops, 30);
  assert.equal(r.pool[kS], 70);
});

test('changing branch returns old troops to their own pool', () => {
  const cmd = {uid:'a', troopSlots:[{branch:swash, troops:100}]};
  const r = run(cmd, 0, beast, 4, {[kB]:4});
  assert.equal(r.pool[kS], 100);
  assert.equal(r.pool[kB], 0);
  assert.deepEqual(r.cmd.troopSlots, [{branch:beast, troops:4}]);
  assert.equal(r.cmd.troopBranch, beast);
});

test('clearing a slot removes it and returns its troops', () => {
  const cmd = {uid:'a', troopSlots:[{branch:swash, troops:100}, {branch:beast, troops:4}]};
  const r = run(cmd, 1, null, 0, {});
  assert.deepEqual(r.cmd.troopSlots, [{branch:swash, troops:100}]);
  assert.equal(r.pool[kB], 4);
});

test('return-all empties every slot into its pool, including legacy commanders', () => {
  const cmd = {troopSlots:[{branch:swash, troops:100}, {branch:beast, troops:4}]};
  assert.deepEqual(returnAllTroopsToPool({[kS]:1}, cmd), {[kS]:101, [kB]:4});
  assert.deepEqual(returnAllTroopsToPool({}, {troopBranch:swash, troops:50}), {[kS]:50});
});

// ── Army Confirm: all slots in one step ──
const gun = {faction:'pirates', branch:'gunners', tier:0}, kG = 'pirates:gunners:0';
const army = (cmd, desired, pool, commandCap = 5) => {
  const plan = planArmySlots({cmd, desired, pool, commandCap});
  return {cmd: withTroopSlots(cmd, plan.slots), pool: applyPoolDelta(pool, plan.poolDelta), plan};
};

test('Confirm: clearing slot 1 of 3 keeps the others and returns only its troops', () => {
  const cmd = {uid:'a', troopSlots:[{branch:swash, troops:100}, {branch:gun, troops:20}, {branch:beast, troops:4}]};
  const r = army(cmd, [null, {branch:gun, troops:20}, {branch:beast, troops:4}], {});
  assert.deepEqual(r.cmd.troopSlots, [{branch:gun, troops:20}, {branch:beast, troops:4}]);
  assert.deepEqual(r.pool, {[kS]:100});
});

test('Confirm: same troop type in two slots cannot draw more than the pool', () => {
  const r = army({uid:'a'}, [{branch:swash, troops:100}, {branch:swash, troops:100}], {[kS]:100});
  assert.equal(r.cmd.troops, 100);
  assert.equal(r.pool[kS], 0);
});

test('Confirm: unchanged army is a no-op for the pool', () => {
  const cmd = {uid:'a', troopSlots:[{branch:swash, troops:100}]};
  const r = army(cmd, [{branch:swash, troops:100}, null, null], {[kS]:5});
  assert.deepEqual(r.plan.poolDelta, {});
  assert.deepEqual(r.cmd.troopSlots, cmd.troopSlots);
});

test('Confirm: raising a slot uses its own troops plus the pool, capped by command', () => {
  const cmd = {uid:'a', troopSlots:[{branch:swash, troops:50}]};
  assert.equal(army(cmd, [{branch:swash, troops:80}], {[kS]:10}).cmd.troops, 60);
  const perCmd = Math.round(1 / branchCommandCost(swash));
  assert.equal(army({uid:'a'}, [{branch:swash, troops:9999}], {[kS]:9999}, 1).cmd.troops, perCmd);
});

test('Confirm: emptying all slots returns everything', () => {
  const cmd = {uid:'a', troopSlots:[{branch:swash, troops:100}, {branch:beast, troops:4}]};
  const r = army(cmd, [null, null, null], {});
  assert.equal(r.cmd.troops, 0);
  assert.deepEqual(r.pool, {[kS]:100, [kB]:4});
});
