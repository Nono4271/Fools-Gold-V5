import test from 'node:test';
import assert from 'node:assert/strict';
import {
  missingCommanders, adminSetLevel, adminSetRespect, finishMarchPatch,
  finishTrainingQueue, adminRelocationCheck,
} from '../src/testmode/adminRules.js';
import { toPlain, fromPlain, tilesToSave } from '../src/testmode/saveStore.js';
import { HDEFS, respectTotalFor } from '../shared/constants/heroes.js';
import { marchMsLeft, advanceMarch } from '../shared/utils/marchMotion.js';

const base = () => ({ ...HDEFS.find(h => h.rarity === 'soldier'), uid: 'u1', owner: 'player', lvl: 5, xp: 0, respectLevel: 0, respectPoints: 0, skillPoints: {}, unspentSkillPoints: 5 });

test('grant all: every HDEF not already owned, any alignment', () => {
  const owned = [{ ...HDEFS[0], owner: 'player', uid: 'x' }];
  const add = missingCommanders(owned, '10,10', 150, 1);
  assert.equal(add.length, HDEFS.length - 1);
  assert.ok(add.every(c => c.owner === 'player' && c.tk === '10,10' && c.lvl === 5));
  assert.equal(new Set(add.map(c => c.uid)).size, add.length);
});

test('set level up uses real XP growth; down strips growth and skill points', () => {
  const c = base();
  const up = adminSetLevel(c, 30);
  assert.equal(up.lvl, 30);
  assert.equal(up.unspentSkillPoints, 5 + 25 + ({ attacker: 2, support: 5, balanced: 2, strategist: 2 }[c.cls] || 0));
  assert.ok(up.atk > c.atk);
  const down = adminSetLevel({ ...up, skillPoints: { a: 10 }, unspentSkillPoints: 3 }, 25);
  assert.equal(down.lvl, 25);
  assert.deepEqual(down.skillPoints, {});          // refunded because unspent < 5 levels removed
  assert.equal(down.unspentSkillPoints, 3 + 10 - 5);
  assert.equal(adminSetLevel(c, 999).lvl, 50);
  assert.equal(adminSetLevel(c, 1).lvl, 5);
});

test('set respect: promotions at 7 and 12 and undone when lowered', () => {
  const r12 = adminSetRespect(base(), 12);
  assert.equal(r12.respectLevel, 12);
  assert.equal(r12.rarity, 'champion');
  assert.equal(r12.respectPoints, respectTotalFor(12, 'champion'));
  assert.equal(r12.unspentSkillPoints, 5 + 12);
  const r5 = adminSetRespect(r12, 5);
  assert.equal(r5.respectLevel, 5);
  assert.equal(r5.rarity, 'soldier');                 // both promotions undone
  assert.ok(Math.abs(r5.atk - base().atk) <= 2);      // stats back (rounding)
  assert.equal(r5.unspentSkillPoints, 5 + 5);         // 7 respect points removed
  assert.equal(adminSetRespect(r12, 8).rarity, 'veteran');
  const nativeChamp = { ...HDEFS.find(h => h.rarity === 'champion'), respectLevel: 13, unspentSkillPoints: 20, skillPoints: {} };
  assert.equal(adminSetRespect(nativeChamp, 0).rarity, 'champion'); // never below natural rarity
  assert.equal(adminSetRespect(base(), 99).respectLevel, 15);
});

test('finish march: every remaining step becomes due at once', () => {
  const now = 100_000;
  const m = { path: ['0,0', '1,0', '2,0', '3,0'], step: 0, stepMs: 5000, startedAt: now, lastStepTime: now };
  const f = finishMarchPatch(m, now);
  assert.equal(marchMsLeft(f, now), 0);
  assert.notEqual(f.startedAt, m.startedAt); // new route id so the worker reseeds
  const res = advanceMarch(f.step, f.lastStepTime, f.path, f.stepMs, now);
  assert.equal(res.reachedEnd, true);
});

test('finish training: all commands due now', () => {
  const q = finishTrainingQueue({ remaining: 3000, commandSize: 500, commandMs: 10_000, nextAt: 999_999 }, 50_000);
  assert.ok(1 + Math.floor((50_000 - q.nextAt) / q.commandMs) >= 6);
});

test('admin relocation refuses map-breaking pads only', () => {
  const tiles = {};
  for (let c = 0; c < 10; c++) for (let r = 0; r < 10; r++) tiles[`${c},${r}`] = { c, r, terrain: 'grass', owner: null };
  assert.equal(adminRelocationCheck('5,5', tiles, '1,1').ok, true);          // unowned, any region: fine
  assert.equal(adminRelocationCheck('0,5', tiles, '1,1').ok, false);         // off map
  tiles['6,6'] = { ...tiles['6,6'], isKeep: true };
  assert.equal(adminRelocationCheck('5,5', tiles, '1,1').ok, false);
  tiles['6,6'] = { ...tiles['6,6'], isKeep: false, isHQPart: true };
  assert.equal(adminRelocationCheck('5,5', tiles, '1,1').ok, false);         // someone else's HQ
  assert.equal(adminRelocationCheck('5,5', tiles, '6,6').ok, true);          // overlapping own HQ is fine
  tiles['4,4'] = { ...tiles['4,4'], terrain: 'river' };
  assert.equal(adminRelocationCheck('5,5', tiles, '6,6').ok, false);
});

test('save helpers: Maps/Sets survive, only stored tiles saved, prototype fields dropped', () => {
  const v = fromPlain(toPlain({ m: new Map([['a', new Set(['x', 'y'])]]), fn: () => 1, n: 2 }));
  assert.ok(v.m instanceof Map && v.m.get('a') instanceof Set && v.m.get('a').has('y'));
  assert.equal(v.fn, undefined);
  const proto = { get garrisonDefeated() { return true; } };
  const t = Object.assign(Object.create(proto), { owner: 'player', c: 1, r: 2 });
  const out = tilesToSave({ '1,2': t, __ready: true });
  assert.deepEqual(Object.keys(out), ['1,2']);
  assert.equal('garrisonDefeated' in out['1,2'], false);
});
