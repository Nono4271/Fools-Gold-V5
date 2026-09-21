import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_STAMINA_MAX, STAMINA_BASE, STAMINA_REGEN_MS, MARCH_STAMINA_COST,
  marchStaminaCost, canAffordMarch, spendMarchStamina, regenStamina,
} from '../shared/utils/tactics.js';

test('AI stamina matches the player base pool and march costs (attack 20, move 10)', () => {
  assert.equal(AI_STAMINA_MAX, STAMINA_BASE);
  assert.equal(AI_STAMINA_MAX, 150);
  assert.equal(MARCH_STAMINA_COST.attack, 20);
  assert.equal(MARCH_STAMINA_COST.move, 10);
  assert.equal(marchStaminaCost('attack'), 20);
  assert.equal(marchStaminaCost('move'), 10);
  assert.equal(marchStaminaCost('recall'), 10);
});

test('a commander with no stamina field counts as full and pays on dispatch', () => {
  const fresh = { uid: 'a1' };
  assert.equal(canAffordMarch(fresh, 'attack', AI_STAMINA_MAX), true);
  const after = spendMarchStamina(fresh, 'attack', AI_STAMINA_MAX);
  assert.equal(after.stamina, 130);
  assert.equal(fresh.stamina, undefined); // input not mutated
});

test('an AI commander runs dry after 7 attacks and cannot march until it regens', () => {
  let c = { uid: 'a1' };
  let attacks = 0;
  while (canAffordMarch(c, 'attack', AI_STAMINA_MAX)) { c = spendMarchStamina(c, 'attack', AI_STAMINA_MAX); attacks++; }
  assert.equal(attacks, 7);
  assert.equal(c.stamina, 10);
  assert.equal(canAffordMarch(c, 'attack', AI_STAMINA_MAX), false);
  assert.equal(canAffordMarch(c, 'move', AI_STAMINA_MAX), true); // 10 is enough for a move
  // +1 per 3 minutes: 30 min -> +10 -> 20 = enough for one attack again
  const back = regenStamina(c, AI_STAMINA_MAX, 30 * 60_000);
  assert.equal(back.stamina, 20);
  assert.equal(canAffordMarch(back, 'attack', AI_STAMINA_MAX), true);
});

test('AI stamina regen is +20/hr, capped at max, and catches up after a long pause', () => {
  const c = { uid: 'a1', stamina: 0 };
  assert.equal(regenStamina(c, AI_STAMINA_MAX, 60 * 60_000).stamina, 20);
  assert.equal(regenStamina(c, AI_STAMINA_MAX).stamina, 1); // default = one 3 min period
  assert.equal(regenStamina(c, AI_STAMINA_MAX, 100 * 60 * 60_000).stamina, AI_STAMINA_MAX); // capped
  const full = { uid: 'a2' };
  assert.equal(regenStamina(full, AI_STAMINA_MAX, STAMINA_REGEN_MS * 5), full); // full/missing: untouched
});
