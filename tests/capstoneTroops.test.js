import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTION_TROOPS, FACTION_KEYS, resolveTroopTier, getTierSkills } from '../shared/constants/troops.js';
import { BRANCH_UNLOCK_Q, branchMaxLevel } from '../shared/constants/buildings.js';
import { capstoneTrainDiscount } from '../shared/utils/training.js';

test('every faction has exactly 1 capstone (4th) branch with a fixed single-tier unit', () => {
  for (const fKey of FACTION_KEYS) {
    const faction = FACTION_TROOPS[fKey];
    assert.equal(faction.branches.length, 4, `${fKey} should have 4 branches (3 tiered + 1 capstone)`);
    const capstoneBranches = faction.branches.filter(b => b.capstone);
    assert.equal(capstoneBranches.length, 1, `${fKey} should have exactly 1 capstone branch`);
    const cap = capstoneBranches[0];
    assert.equal(cap.tiers.length, 1, `${fKey}.${cap.key} capstone should have exactly one stat block`);
    assert.ok(cap.skills.a && cap.skills.b && cap.skills.c, `${fKey}.${cap.key} missing A/B/signature skill`);
    for (const skill of [cap.skills.a, cap.skills.b, cap.skills.c]) {
      assert.notEqual(skill.trigger, 'passive', `${fKey}.${cap.key} skills must use an active trigger`);
    }
  }
});

test('capstone unit resolves via resolveTroopTier/getTierSkills with all 3 skills', () => {
  const t = resolveTroopTier({ faction: 'pirates', branch: 'leviathan', tier: 1 });
  assert.equal(t.label, 'Abyssal Leviathan');
  const branch = FACTION_TROOPS.pirates.branches.find(b => b.key === 'leviathan');
  const skills = getTierSkills(branch, 0);
  assert.equal(skills.length, 3);
});

test('capstone branch unlocks at Quarter level 9, not before', () => {
  assert.equal(BRANCH_UNLOCK_Q[3], 9);
  assert.equal(branchMaxLevel(3, 8), 0);
  assert.equal(branchMaxLevel(3, 9), 6);
  assert.equal(branchMaxLevel(3, 10), 6);
});

test('capstoneTrainDiscount ramps 0% at level 1 to 50% at level 6, flat beyond', () => {
  assert.equal(capstoneTrainDiscount(1), 0);
  assert.equal(capstoneTrainDiscount(2), 0.10);
  assert.equal(capstoneTrainDiscount(6), 0.50);
  assert.equal(capstoneTrainDiscount(9), 0.50);
  assert.equal(capstoneTrainDiscount(0), 0);
});

test('capstone units are not all the same size', () => {
  const sizes = FACTION_KEYS.map(fKey => FACTION_TROOPS[fKey].branches.find(b => b.capstone).size);
  assert.ok(new Set(sizes).size > 1, 'expected a mix of capstone sizes, not all one size');
});
