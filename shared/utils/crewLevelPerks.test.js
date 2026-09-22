import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crewLevelPerks, CREW_MAX_LEVEL, CREW_FORTRESS_SLOT_LEVELS,
  CREW_LEVEL_RESOURCE_PERKS, CREW_LEVEL_HEAL_PERKS, CREW_LEVEL_XP_PERKS,
  CREW_LEVEL_GATHER_PERKS, CREW_LEVEL_PVE_DMG_PERKS, CREW_LEVEL_SPAWN_DMG_PERKS,
  CREW_LEVEL_TRAIN_TIME_PERKS, CREW_LEVEL_TRAIN_COST_PERKS, CREW_LEVEL_STRUCTURE_PERKS,
  crewResourceRateBonus, crewMarchSpeedBonus, crewHealSpeedBonus, crewXpBonus,
  crewGatherYieldBonus, crewPveDmgBonus, crewSpawnDmgBonus, crewTrainTimeBonus, crewTrainCostBonus,
  crewWellSlotsForLevel, crewOutpostUnlocked, crewOutpostUnitSlots, crewOutpostHireTimeBonus,
} from '../shared/constants/crew.js';

test('crewLevelPerks: even levels 2-20 grant a member-cap perk', () => {
  for (let lvl = 2; lvl <= 20; lvl += 2) {
    const perks = crewLevelPerks(lvl);
    assert.ok(perks.some(p => p.id === 'member_cap'), `level ${lvl} should have a member_cap perk`);
  }
});

test('crewLevelPerks: level 1 (default) has no perk — every level 2-50 now has at least one', () => {
  assert.deepEqual(crewLevelPerks(1), []);
  for (let lvl = 2; lvl <= CREW_MAX_LEVEL; lvl++) {
    assert.ok(crewLevelPerks(lvl).length > 0, `level ${lvl} should have at least one perk`);
  }
});

test('crewLevelPerks: every defined perk level grants a perk with the matching id', () => {
  const allPerkArrays = [
    ...CREW_LEVEL_RESOURCE_PERKS, ...CREW_LEVEL_HEAL_PERKS, ...CREW_LEVEL_XP_PERKS,
    ...CREW_LEVEL_GATHER_PERKS, ...CREW_LEVEL_PVE_DMG_PERKS, ...CREW_LEVEL_SPAWN_DMG_PERKS,
    ...CREW_LEVEL_TRAIN_TIME_PERKS, ...CREW_LEVEL_TRAIN_COST_PERKS, ...CREW_LEVEL_STRUCTURE_PERKS,
  ];
  for (const p of allPerkArrays) {
    const perks = crewLevelPerks(p.level);
    assert.ok(perks.some(perk => perk.id === p.id), `level ${p.level} should have a ${p.id} perk`);
  }
});

test('structure slot helpers follow the Level-tab schedule (Well 31/40, Outpost 35, 2nd unit 50, hire time 42)', () => {
  assert.equal(crewWellSlotsForLevel(30), 0);
  assert.equal(crewWellSlotsForLevel(31), 1);
  assert.equal(crewWellSlotsForLevel(40), 2);
  assert.equal(crewOutpostUnlocked(34), false);
  assert.equal(crewOutpostUnlocked(35), true);
  assert.equal(crewOutpostUnitSlots(35), 1);
  assert.equal(crewOutpostUnitSlots(49), 1);
  assert.equal(crewOutpostUnitSlots(50), 2);
  assert.equal(crewOutpostHireTimeBonus(41), 0);
  assert.equal(crewOutpostHireTimeBonus(42), 0.10);
});

test('crewResourceRateBonus: accumulates flat +N/hr per resource as levels unlock, 4 tiers deep', () => {
  assert.deepEqual(crewResourceRateBonus(1), { stone: 0, wood: 0, gas: 0, food: 0 });
  assert.equal(crewResourceRateBonus(3).wood, 500);
  assert.equal(crewResourceRateBonus(13).wood, 1250); // tier 1 (500) + tier 2 (750)
  assert.equal(crewResourceRateBonus(22).wood, 2250); // + tier 3 (1000)
  // + tier 4 (1250) + Resource Trove I (level 27, +1200, already landed by 29)
  assert.equal(crewResourceRateBonus(29).wood, 3500 + 1200);
  // By level 39, every resource has all 4 tiers landed (wood by 29, stone by
  // 32, gas by 33, food by 34) — each is 500+750+1000+1250 = 3500 — plus
  // Resource Trove I (27, +1200) and Treasure Trove II (39, +2000) on top.
  const at39 = crewResourceRateBonus(39);
  assert.equal(at39.wood, 3500 + 1200 + 2000);
  assert.equal(at39.stone, 3500 + 1200 + 2000);
  assert.equal(at39.gas, 3500 + 1200 + 2000);
  assert.equal(at39.food, 3500 + 1200 + 2000);
});

test('crewMarchSpeedBonus: 0 before 25, 0.05 at tier 1, 0.125 once tier 2 (38) lands', () => {
  assert.equal(crewMarchSpeedBonus(24), 0);
  assert.equal(crewMarchSpeedBonus(25), 0.05);
  assert.equal(crewMarchSpeedBonus(37), 0.05);
  assert.equal(crewMarchSpeedBonus(38), 0.125);
  assert.equal(crewMarchSpeedBonus(50), 0.125);
});

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ~${expected}`);

test('crewHealSpeedBonus: 0 before 28, 0.05 at tier 1, 0.15 once tier 2 (41) lands', () => {
  assert.equal(crewHealSpeedBonus(27), 0);
  assert.equal(crewHealSpeedBonus(28), 0.05);
  near(crewHealSpeedBonus(41), 0.15);
});

test('crewXpBonus/crewGatherYieldBonus: 0 before tier 1, cumulative once tier 2 lands', () => {
  assert.equal(crewXpBonus(35), 0);
  assert.equal(crewXpBonus(36), 0.05);
  near(crewXpBonus(47), 0.15);
  assert.equal(crewGatherYieldBonus(36), 0);
  assert.equal(crewGatherYieldBonus(37), 0.05);
  near(crewGatherYieldBonus(46), 0.15);
});

test('crewPveDmgBonus/crewSpawnDmgBonus/crewTrainTimeBonus/crewTrainCostBonus: single-tier perks', () => {
  assert.equal(crewPveDmgBonus(43), 0);
  assert.equal(crewPveDmgBonus(44), 0.10);
  assert.equal(crewSpawnDmgBonus(42), 0);
  assert.equal(crewSpawnDmgBonus(43), 0.10);
  assert.equal(crewTrainTimeBonus(47), 0);
  assert.equal(crewTrainTimeBonus(48), 0.05);
  assert.equal(crewTrainCostBonus(48), 0);
  assert.equal(crewTrainCostBonus(49), 0.10);
});

test('crewLevelPerks: fortress-slot levels (5/15/30/45) grant a fortress_slot perk', () => {
  for (const lvl of CREW_FORTRESS_SLOT_LEVELS) {
    const perks = crewLevelPerks(lvl);
    assert.ok(perks.some(p => p.id === 'fortress_slot'), `level ${lvl} should have a fortress_slot perk`);
  }
});

test('crewLevelPerks: member-cap perk stops at level 20, fortress-slot levels beyond that still fire', () => {
  const perks30 = crewLevelPerks(30);
  assert.equal(perks30.length, 1);
  assert.equal(perks30[0].id, 'fortress_slot');
});

test('crewLevelPerks: every level from 1 to CREW_MAX_LEVEL resolves without throwing', () => {
  for (let lvl = 1; lvl <= CREW_MAX_LEVEL; lvl++) {
    assert.ok(Array.isArray(crewLevelPerks(lvl)));
  }
});
