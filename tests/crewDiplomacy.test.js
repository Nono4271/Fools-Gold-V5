import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrew } from '../shared/utils/crewRules.js';
import {
  canSetDiplomacy, setDiplomacyStatus, diplomacyStatusOf,
  flaggedDiplomacyCrews, diplomacyPlayerIdSets,
} from '../shared/utils/crewRules.js';

function makeCrew(id, founderId, extra = {}) {
  return createCrew({ id, name: `Crew ${id}`, abbr: id.slice(0, 4).toUpperCase(), founderId, faction: 'pirates', ...extra });
}

test('createCrew: starts with an empty diplomacy map', () => {
  const c = makeCrew('crewA', 'founderA');
  assert.deepEqual(c.diplomacy, {});
});

test('canSetDiplomacy: founder/officer only, not plain members', () => {
  const c = { ...makeCrew('crewA', 'founderA'), officers: ['officerA'], members: ['founderA', 'officerA', 'memberA'] };
  assert.equal(canSetDiplomacy(c, 'founderA'), true);
  assert.equal(canSetDiplomacy(c, 'officerA'), true);
  assert.equal(canSetDiplomacy(c, 'memberA'), false);
  assert.equal(canSetDiplomacy(c, 'stranger'), false);
});

test('setDiplomacyStatus: founder/officer can set ally/enemy; member cannot', () => {
  const c = makeCrew('crewA', 'founderA');
  const allied = setDiplomacyStatus(c, 'founderA', 'crewB', 'ally');
  assert.equal(diplomacyStatusOf(allied, 'crewB'), 'ally');

  const rejected = setDiplomacyStatus(c, 'someMember', 'crewB', 'ally');
  assert.equal(rejected, c); // unchanged — no permission
  assert.equal(diplomacyStatusOf(rejected, 'crewB'), 'neutral');
});

test('setDiplomacyStatus: setting neutral (or an invalid status) clears the entry', () => {
  const c = makeCrew('crewA', 'founderA');
  const allied = setDiplomacyStatus(c, 'founderA', 'crewB', 'ally');
  const backToNeutral = setDiplomacyStatus(allied, 'founderA', 'crewB', 'neutral');
  assert.equal(diplomacyStatusOf(backToNeutral, 'crewB'), 'neutral');
  assert.equal(Object.prototype.hasOwnProperty.call(backToNeutral.diplomacy, 'crewB'), false);

  const enemy = setDiplomacyStatus(c, 'founderA', 'crewB', 'enemy');
  const garbage = setDiplomacyStatus(enemy, 'founderA', 'crewB', 'not_a_real_status');
  assert.equal(diplomacyStatusOf(garbage, 'crewB'), 'neutral');
});

test('setDiplomacyStatus: cannot target itself, no-ops with no targetCrewId', () => {
  const c = makeCrew('crewA', 'founderA');
  assert.equal(setDiplomacyStatus(c, 'founderA', 'crewA', 'ally'), c);
  assert.equal(setDiplomacyStatus(c, 'founderA', null, 'ally'), c);
});

test('diplomacy is one-way: crew A allying crew B does not touch crew B', () => {
  const a = makeCrew('crewA', 'founderA');
  const b = makeCrew('crewB', 'founderB');
  const aAllied = setDiplomacyStatus(a, 'founderA', 'crewB', 'ally');
  assert.equal(diplomacyStatusOf(aAllied, 'crewB'), 'ally');
  assert.equal(diplomacyStatusOf(b, 'crewA'), 'neutral'); // untouched, separate object
});

test('flaggedDiplomacyCrews: only resolves entries that match a real crew in the list', () => {
  const a = { ...makeCrew('crewA', 'founderA'), diplomacy: { crewB: 'ally', crewC: 'enemy', ghost: 'ally' } };
  const b = makeCrew('crewB', 'founderB');
  const cCrew = makeCrew('crewC', 'founderC');
  const resolved = flaggedDiplomacyCrews(a, [a, b, cCrew]);
  assert.equal(resolved.length, 2);
  assert.ok(resolved.some(r => r.crew.id === 'crewB' && r.status === 'ally'));
  assert.ok(resolved.some(r => r.crew.id === 'crewC' && r.status === 'enemy'));
});

test('diplomacyPlayerIdSets: builds ally/enemy playerId Sets from flagged crews\' members', () => {
  const b = { ...makeCrew('crewB', 'founderB'), members: ['founderB', 'ai_pirates_1', 'ai_pirates_2'] };
  const cCrew = { ...makeCrew('crewC', 'founderC'), members: ['founderC', 'ai_orcs_3'] };
  const a = { ...makeCrew('crewA', 'founderA'), diplomacy: { crewB: 'ally', crewC: 'enemy' } };

  const { allyIds, enemyIds } = diplomacyPlayerIdSets(a, [a, b, cCrew]);
  assert.equal(allyIds.has('founderB'), true);
  assert.equal(allyIds.has('ai_pirates_1'), true);
  assert.equal(allyIds.has('ai_pirates_2'), true);
  assert.equal(enemyIds.has('founderC'), true);
  assert.equal(enemyIds.has('ai_orcs_3'), true);
  assert.equal(allyIds.has('founderC'), false);
  assert.equal(enemyIds.has('founderB'), false);
});

test('diplomacyPlayerIdSets: no crew / no diplomacy entries -> empty Sets, no throw', () => {
  assert.deepEqual([...diplomacyPlayerIdSets(null, []).allyIds], []);
  const a = makeCrew('crewA', 'founderA');
  const { allyIds, enemyIds } = diplomacyPlayerIdSets(a, [a]);
  assert.equal(allyIds.size, 0);
  assert.equal(enemyIds.size, 0);
});
