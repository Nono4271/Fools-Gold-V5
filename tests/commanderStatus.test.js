import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WOUNDED_MS, isWounded, woundedMsLeft, woundedPatch, canCommanderAct,
  GUARD_COOLDOWN_MS, guardCooldownLeft, guardCoverageKeys,
} from '../shared/utils/commanderStatus.js';

test('wounded lasts 10 minutes and blocks every action', () => {
  const now = 1_000_000;
  const c = { uid: 'a', ...woundedPatch(now) };
  assert.equal(WOUNDED_MS, 600_000);
  assert.equal(isWounded(c, now + 1), true);
  assert.equal(woundedMsLeft(c, now), WOUNDED_MS);
  assert.equal(canCommanderAct(c, now + 60_000).ok, false);
  assert.match(canCommanderAct(c, now + 60_000).reason, /Wounded/);
  assert.equal(canCommanderAct(c, now + WOUNDED_MS).ok, true);
  assert.equal(canCommanderAct({ uid: 'b' }, now).ok, true);
  assert.equal(canCommanderAct(null).ok, false);
});

test('guard cancel cooldown is 3 minutes', () => {
  const now = 5000;
  const c = { guardCooldownUntil: now + GUARD_COOLDOWN_MS };
  assert.equal(guardCooldownLeft(c, now), GUARD_COOLDOWN_MS);
  assert.equal(guardCooldownLeft(c, now + GUARD_COOLDOWN_MS), 0);
  assert.equal(guardCooldownLeft({}, now), 0);
});

test('guard covers 3x3: mine, crewmate, my crew structures only', () => {
  const tiles = {
    '4,4': { owner: 'player' },                       // mine
    '5,4': { owner: 'ai', ownerPlayerId: 'crewmate' }, // crew
    '6,4': { owner: null },                           // neutral
    '4,5': { owner: 'ai', ownerPlayerId: 'ally' },     // diplomacy ally
    '5,5': { owner: 'player' },                       // center
    '6,5': { owner: 'ai', ownerPlayerId: 'samefac' },  // same faction, not crew
    '4,6': { owner: null },                           // my crew structure
    '5,6': { owner: 'player', isKeep: true },         // keep excluded
    '6,6': { owner: 'player', isHQPart: true },       // HQ excluded
    '7,7': { owner: 'player' },                       // out of range
  };
  const keys = guardCoverageKeys('5,5', tiles, {
    crewmatePlayerIds: new Set(['crewmate']),
    structureKeys: new Set(['4,6']),
  });
  assert.deepEqual(keys.sort(), ['4,4', '4,6', '5,4', '5,5'].sort());
  assert.deepEqual(guardCoverageKeys(null, tiles), []);
});
