import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEUTRAL_TAGS,
  NEUTRAL_TROOPS,
  NEUTRAL_TROOP_KEYS,
  resolveNeutralUnit,
  getNeutralTierSkills,
} from '../shared/constants/neutralTroops.js';
import { procTroopSkills, getNeutralSlotForBattle } from '../shared/utils/battle.js';

test('exactly 15 neutral units, all keys unique', () => {
  assert.equal(NEUTRAL_TROOPS.length, 15);
  assert.equal(new Set(NEUTRAL_TROOP_KEYS).size, 15);
});

test('every unit resolves with correct tier/size/tags/stats via resolveNeutralUnit', () => {
  for (const u of NEUTRAL_TROOPS) {
    const resolved = resolveNeutralUnit(u.key);
    assert.ok(resolved, `${u.key} should resolve`);
    assert.equal(resolved.size, u.size);
    assert.equal(resolved.tier, u.tier);
    assert.deepEqual(resolved.tags, u.tags);
    assert.ok(resolved.stats && typeof resolved.stats.hp === 'number');
  }
  assert.equal(resolveNeutralUnit('does_not_exist'), null);
});

test('roster split: 3 Beastfolk, 2 Stoneborn, 2 Sandrunner, 8 renegades (one per existing faction)', () => {
  const byRace = {};
  for (const u of NEUTRAL_TROOPS) byRace[u.race] = (byRace[u.race] || 0) + 1;
  assert.equal(byRace['Beastfolk'], 3);
  assert.equal(byRace['Stoneborn'], 2);
  assert.equal(byRace['Sandrunner'], 2);
  assert.equal(byRace['Renegade'], 8);

  const renegadeFactions = NEUTRAL_TROOPS.filter(u => u.race === 'Renegade').map(u => u.faction).sort();
  assert.deepEqual(renegadeFactions, ['ashen_dead', 'coldborns', 'dragons', 'holyknights', 'nightcreatures', 'orcs', 'pirates', 'wizards'].sort());
});

test('tag vocabulary includes all 7 required tags, and every unit only uses declared tags', () => {
  for (const t of ['beast', 'pack', 'construct', 'armored', 'raider', 'swarm', 'renegade']) {
    assert.ok(NEUTRAL_TAGS.includes(t), `NEUTRAL_TAGS missing "${t}"`);
  }
  for (const u of NEUTRAL_TROOPS) {
    for (const t of u.tags) assert.ok(NEUTRAL_TAGS.includes(t), `${u.key} uses undeclared tag "${t}"`);
  }
});

test('tag assignment matches design: beastfolk=beast(+pack on broodmother), stoneborn=construct(+armored), sandrunner=raider(+pack on scavenger chief), renegades=renegade', () => {
  const byKey = Object.fromEntries(NEUTRAL_TROOPS.map(u => [u.key, u]));
  assert.deepEqual(byKey.wolf_rider.tags, ['beast']);
  assert.deepEqual(byKey.bear_shaman.tags, ['beast']);
  assert.deepEqual(byKey.swarmwing_broodmother.tags, ['beast', 'pack']);
  assert.ok(byKey.rubble_warden.tags.includes('construct') && byKey.rubble_warden.tags.includes('armored'));
  assert.ok(byKey.ruin_colossus.tags.includes('construct') && byKey.ruin_colossus.tags.includes('armored'));
  assert.deepEqual(byKey.dune_raider.tags, ['raider']);
  assert.deepEqual(byKey.scavenger_chief.tags, ['raider', 'pack']);
  for (const u of NEUTRAL_TROOPS.filter(u => u.race === 'Renegade')) {
    assert.ok(u.tags.includes('renegade'), `${u.key} missing renegade tag`);
  }
});

test('at most 2 T1 units across the whole 15-unit roster', () => {
  const t1Count = NEUTRAL_TROOPS.filter(u => u.tier === 0).length;
  assert.ok(t1Count <= 2, `expected at most 2 T1 units, got ${t1Count}`);
});

const SYNERGY_KEYS = ['bear_shaman', 'swarmwing_broodmother', 'rubble_warden', 'ruin_colossus', 'scavenger_chief'];
const SYNERGY_EFFECT_TYPES = new Set([
  'tag_shield_ally', 'tag_buff_allies_tag', 'tag_intercept_for_tag', 'tag_full_shield_ally', 'tag_heal_ally_on_hit',
]);

test('exactly 5 units have tag-synergy skills; the other 10 have normal skills', () => {
  const synergyUnits = NEUTRAL_TROOPS.filter(u =>
    getNeutralTierSkills(u.key).some(s => SYNERGY_EFFECT_TYPES.has(s.effect?.type))
  );
  assert.equal(synergyUnits.length, 5);
  assert.deepEqual(synergyUnits.map(u => u.key).sort(), [...SYNERGY_KEYS].sort());

  const normalUnits = NEUTRAL_TROOPS.filter(u => !SYNERGY_KEYS.includes(u.key));
  assert.equal(normalUnits.length, 10);
  for (const u of normalUnits) {
    const skills = getNeutralTierSkills(u.key);
    assert.ok(skills.length >= 1, `${u.key} should have at least one skill`);
    for (const s of skills) assert.ok(!SYNERGY_EFFECT_TYPES.has(s.effect?.type), `${u.key} should not have a synergy effect`);
  }
});

// ── Battle-engine tag-synergy proc tests ──────────────────────────────────
function baseRs() {
  return { dmgReduce: 0, troopAtkMult: 1, lifesteal: 0 };
}

function forceProc(fn) {
  const orig = Math.random;
  Math.random = () => 0; // always below any procBase/procMax threshold
  try { return fn(); } finally { Math.random = orig; }
}

test('tag_shield_ally (Bear Shaman) fires and reduces dmgReduce when a beast ally is present, not otherwise', () => {
  const unit = resolveNeutralUnit('bear_shaman');
  const skill = unit.skills.a;
  const self = getNeutralSlotForBattle('bear_shaman', 50);

  // No beast ally present (alone) — should not fire
  const rs1 = baseRs();
  forceProc(() => procTroopSkills([skill], 'round_start', {}, rs1, { actions: [] }, 'Bear Shaman', null, 1, [self], self));
  assert.equal(rs1.dmgReduce, 0, 'should not fire without an eligible beast ally');

  // Wolf Rider (beast) present as an ally — should fire
  const ally = getNeutralSlotForBattle('wolf_rider', 100);
  const rs2 = baseRs();
  forceProc(() => procTroopSkills([skill], 'round_start', {}, rs2, { actions: [] }, 'Bear Shaman', null, 1, [self, ally], self));
  assert.ok(rs2.dmgReduce > 0, 'should fire and reduce damage taken with an eligible beast ally present');
});

test('tag_buff_allies_tag (Broodmother) buffs troopAtkMult only with another beast ally present', () => {
  const unit = resolveNeutralUnit('swarmwing_broodmother');
  const skill = unit.skills.a;
  const self = getNeutralSlotForBattle('swarmwing_broodmother', 5);

  const rs1 = baseRs();
  forceProc(() => procTroopSkills([skill], 'round_start', {}, rs1, { actions: [] }, 'Broodmother', null, 1, [self], self));
  assert.equal(rs1.troopAtkMult, 1, 'should not fire without another beast ally');

  const ally = getNeutralSlotForBattle('bear_shaman', 40);
  const rs2 = baseRs();
  forceProc(() => procTroopSkills([skill], 'round_start', {}, rs2, { actions: [] }, 'Broodmother', null, 1, [self, ally], self));
  assert.ok(rs2.troopAtkMult > 1, 'should buff troopAtkMult with a beast ally present');
});

test('tag_intercept_for_tag (Rubble Warden) reduces dmgReduce only with another construct ally present', () => {
  const unit = resolveNeutralUnit('rubble_warden');
  const skill = unit.skills.a;
  const self = getNeutralSlotForBattle('rubble_warden', 30);

  const rs1 = baseRs();
  forceProc(() => procTroopSkills([skill], 'on_hit_received', {}, rs1, { actions: [] }, 'Rubble Warden', null, 1, [self], self));
  assert.equal(rs1.dmgReduce, 0, 'should not fire without another construct ally');

  const ally = getNeutralSlotForBattle('ruin_colossus', 2);
  const rs2 = baseRs();
  forceProc(() => procTroopSkills([skill], 'on_hit_received', {}, rs2, { actions: [] }, 'Rubble Warden', null, 1, [self, ally], self));
  assert.ok(rs2.dmgReduce > 0, 'should fire with a construct ally present');
});

test('tag_full_shield_ally (Ruin Colossus) grants a strong dmgReduce only with another construct ally present', () => {
  const unit = resolveNeutralUnit('ruin_colossus');
  const skill = unit.skills.a;
  const self = getNeutralSlotForBattle('ruin_colossus', 2);

  const rs1 = baseRs();
  forceProc(() => procTroopSkills([skill], 'round_start', {}, rs1, { actions: [] }, 'Ruin Colossus', null, 1, [self], self));
  assert.equal(rs1.dmgReduce, 0, 'should not fire without another construct ally');

  const ally = getNeutralSlotForBattle('rubble_warden', 30);
  const rs2 = baseRs();
  forceProc(() => procTroopSkills([skill], 'round_start', {}, rs2, { actions: [] }, 'Ruin Colossus', null, 1, [self, ally], self));
  assert.ok(rs2.dmgReduce >= 0.5, 'should grant a strong (near-full) shield with a construct ally present');
});

test('tag_heal_ally_on_hit (Scavenger Chief) sets lifesteal only with another raider ally present', () => {
  const unit = resolveNeutralUnit('scavenger_chief');
  const skill = unit.skills.a;
  const self = getNeutralSlotForBattle('scavenger_chief', 20);

  const rs1 = baseRs();
  forceProc(() => procTroopSkills([skill], 'on_hit', {}, rs1, { actions: [] }, 'Scavenger Chief', null, 1, [self], self));
  assert.equal(rs1.lifesteal, 0, 'should not fire without another raider ally');

  const ally = getNeutralSlotForBattle('dune_raider', 60);
  const rs2 = baseRs();
  forceProc(() => procTroopSkills([skill], 'on_hit', {}, rs2, { actions: [] }, 'Scavenger Chief', null, 1, [self, ally], self));
  assert.ok(rs2.lifesteal > 0, 'should heal (set lifesteal) with a raider ally present');
});

test('a non-synergy normal skill (Wolf Rider) fires independent of alliedSlots', () => {
  const unit = resolveNeutralUnit('wolf_rider');
  const skill = unit.skills.a;
  const rs = { ...baseRs(), troopDoubleAtk: false };
  forceProc(() => procTroopSkills([skill], 'on_hit', {}, rs, { actions: [] }, 'Wolf Rider', null, 1));
  assert.equal(rs.troopDoubleAtk, true);
});

// ── Stat-scaling ratio consistency ────────────────────────────────────────
test('stat scaling: within each race, dmg/hp/siege drop steeply small<medium<large; DEF drops less steeply; SPD rises as size shrinks', () => {
  const beastfolk = ['wolf_rider', 'bear_shaman', 'swarmwing_broodmother'].map(k => resolveNeutralUnit(k));
  const [small, medium, large] = beastfolk;
  assert.equal(small.size, 'small');
  assert.equal(medium.size, 'medium');
  assert.equal(large.size, 'large');

  // dmg/hp/siege: large >> medium > small
  for (const stat of ['hp', 'siege']) {
    assert.ok(large.stats[stat] > medium.stats[stat] * 3, `${stat}: large should dwarf medium`);
    assert.ok(medium.stats[stat] >= small.stats[stat], `${stat}: medium should be >= small`);
  }
  assert.ok(large.stats.dmgHi > medium.stats.dmgHi * 3);
  assert.ok(medium.stats.dmgHi >= small.stats.dmgHi);

  // DEF drops off less steeply than HP (ratio medium/large should be higher for DEF than for HP)
  const defRatio = medium.stats.def / large.stats.def;
  const hpRatio  = medium.stats.hp  / large.stats.hp;
  assert.ok(defRatio > hpRatio, 'DEF should drop off less steeply than HP going large -> medium');

  // SPD rises as size shrinks
  assert.ok(small.stats.spd >= medium.stats.spd);
  assert.ok(medium.stats.spd >= large.stats.spd);
});

test('command-cost convention: units keep small/medium/large sizes only (no invented size)', () => {
  for (const u of NEUTRAL_TROOPS) {
    assert.ok(['small', 'medium', 'large'].includes(u.size), `${u.key} has invalid size "${u.size}"`);
  }
});

// ── Region distribution ───────────────────────────────────────────────────
test('region distribution is roughly balanced (5/5/5 across south/mid/north)', () => {
  const byRegion = { south: 0, mid: 0, north: 0 };
  for (const u of NEUTRAL_TROOPS) {
    assert.ok(['south', 'mid', 'north'].includes(u.region), `${u.key} has invalid region "${u.region}"`);
    byRegion[u.region]++;
  }
  assert.equal(byRegion.south + byRegion.mid + byRegion.north, 15);
  for (const region of ['south', 'mid', 'north']) {
    assert.ok(byRegion[region] >= 4 && byRegion[region] <= 6, `${region} has ${byRegion[region]} units, expected ~5`);
  }
});

test('getNeutralSlotForBattle mirrors the atkSlotResolved/defSlotResolved shape', () => {
  const slot = getNeutralSlotForBattle('wolf_rider', 100);
  assert.equal(slot.troops, 100);
  assert.equal(slot.branchDef.size, 'small');
  assert.deepEqual(slot.branchDef.tags, ['beast']);
  assert.ok(slot.tierData && typeof slot.tierData.hp === 'number');
  assert.ok(Array.isArray(slot.skills) && slot.skills.length >= 1);
  assert.equal(slot.hpPer, slot.tierData.hp);
  assert.equal(getNeutralSlotForBattle('not_a_unit', 10), null);
});
