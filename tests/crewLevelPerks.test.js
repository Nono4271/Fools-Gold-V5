import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crewLevelPerks, CREW_MAX_LEVEL, CREW_FORTRESS_SLOT_LEVELS,
} from '../shared/constants/crew.js';

test('crewLevelPerks: even levels 2-20 grant a member-cap perk', () => {
  for (let lvl = 2; lvl <= 20; lvl += 2) {
    const perks = crewLevelPerks(lvl);
    assert.ok(perks.some(p => p.id === 'member_cap'), `level ${lvl} should have a member_cap perk`);
  }
});

test('crewLevelPerks: odd levels under 21 (and non-milestone levels) have no perk', () => {
  assert.deepEqual(crewLevelPerks(1), []);
  assert.deepEqual(crewLevelPerks(3), []);
  assert.deepEqual(crewLevelPerks(7), []);
  assert.deepEqual(crewLevelPerks(22), []);
});

test('crewLevelPerks: fortress-slot levels (15/30/45) grant a fortress_slot perk', () => {
  for (const lvl of CREW_FORTRESS_SLOT_LEVELS) {
    const perks = crewLevelPerks(lvl);
    assert.ok(perks.some(p => p.id === 'fortress_slot'), `level ${lvl} should have a fortress_slot perk`);
  }
});

test('crewLevelPerks: member-cap perk stops at level 20 (the cap schedule\'s own ceiling), fortress-slot levels beyond that still fire', () => {
  const perks30 = crewLevelPerks(30);
  assert.equal(perks30.length, 1);
  assert.equal(perks30[0].id, 'fortress_slot');
});

test('crewLevelPerks: every level from 1 to CREW_MAX_LEVEL resolves without throwing', () => {
  for (let lvl = 1; lvl <= CREW_MAX_LEVEL; lvl++) {
    assert.ok(Array.isArray(crewLevelPerks(lvl)));
  }
});
