import test from 'node:test';
import assert from 'node:assert/strict';
import { structureDefenderQueue, STRUCTURE_RULES, isStationedIn } from '../shared/utils/structureDefense.js';
import {
  findCrewStructureAt, updateCrewStructure, completeStructureBuild, createWell, createOutpost,
  structureSiege, STRUCTURE_SIEGE_MAX,
} from '../shared/utils/crewStructures.js';
import { applySiegeDamage } from '../shared/utils/crewFortress.js';

const K = '5,5';
const ai = (uid, extra = {}) => ({ uid, owner: 'ai', tk: K, troops: 100, march: null, ...extra });

test('rules: Fortress/Well allow stationing, Outpost/keep do not; only keeps have a garrison', () => {
  assert.equal(STRUCTURE_RULES.fortress.stationing, true);
  assert.equal(STRUCTURE_RULES.well.stationing, true);
  assert.equal(STRUCTURE_RULES.outpost.stationing, false);
  assert.equal(STRUCTURE_RULES.keep.stationing, false);
  assert.equal(STRUCTURE_RULES.keep.garrison, true);
  assert.equal(STRUCTURE_RULES.fortress.garrison, false);
});

test('Well: standing commanders (newest first) fight before stationed ones', () => {
  const well = { id: 'w1', tileKey: K };
  const cmds = [
    ai('st1', { stationedWellId: 'w1' }),
    ai('old', { arrivedAt: 1 }),
    ai('new', { arrivedAt: 5 }),
    ai('st2', { stationedWellId: 'w1' }),
    ai('elsewhere', { tk: '9,9' }),
    ai('marching', { march: { type: 'move' } }),
    ai('empty', { troops: 0 }),
    { uid: 'me', owner: 'player', tk: K, troops: 50 },
  ];
  const q = structureDefenderQueue({ kind: 'well', tileKey: K, cmds, structure: well, isHostile: c => c.owner === 'ai' });
  assert.deepEqual(q.map(e => `${e.phase}:${e.uid}`), ['standing:new', 'standing:old', 'stationed:st1', 'stationed:st2']);
});

test('Fortress: stationed list comes from stationedByPlayer, after standing', () => {
  const fort = { id: 'f1', tileKey: K, stationedByPlayer: { b: ['s2'], a: ['s1'] } };
  const cmds = [ai('s1'), ai('s2'), ai('walker', { arrivedAt: 3 })];
  const q = structureDefenderQueue({ kind: 'fortress', tileKey: K, cmds, structure: fort });
  assert.deepEqual(q.map(e => `${e.phase}:${e.uid}`), ['standing:walker', 'stationed:s1', 'stationed:s2']);
  assert.equal(isStationedIn('fortress', fort, cmds[0]), true);
});

test('Outpost: no stationing — a commander marked stationed there still just counts as standing', () => {
  const op = { id: 'o1', tileKey: K };
  const q = structureDefenderQueue({ kind: 'outpost', tileKey: K, cmds: [ai('x', { stationedWellId: 'o1' }), ai('y')], structure: op });
  assert.deepEqual(q.map(e => e.phase), ['standing', 'standing']);
});

test('Keep / plain tile: only standing commanders (garrison waves and siege come after, in useMarch)', () => {
  const q = structureDefenderQueue({ kind: 'keep', tileKey: K, cmds: [ai('a', { arrivedAt: 1 }), ai('b', { arrivedAt: 2 })] });
  assert.deepEqual(q.map(e => e.uid), ['b', 'a']);
  assert.equal(structureDefenderQueue({ kind: null, tileKey: K, cmds: [] }).length, 0);
});

test('Wells/Outposts get Fortress-style siege HP, filled when built; siege to 0 destroys, last hit claims', () => {
  const w = createWell({ id: 'w1', crewId: 'c', tileKey: K, now: 0 });
  assert.equal(w.siege, 0);
  const built = completeStructureBuild(w);
  assert.equal(built.siege, STRUCTURE_SIEGE_MAX);
  assert.equal(completeStructureBuild(createOutpost({ id: 'o', crewId: 'c', tileKey: K, now: 0 })).siege, STRUCTURE_SIEGE_MAX);
  // Legacy structure without siege fields still sieges from full.
  assert.deepEqual(structureSiege({ id: 'old' }), { siege: STRUCTURE_SIEGE_MAX, siegeMax: STRUCTURE_SIEGE_MAX });
  const hit = applySiegeDamage(built, 'player', STRUCTURE_SIEGE_MAX - 1);
  assert.equal(hit.destroyed, false);
  const kill = applySiegeDamage(hit.fortress, 'attackerX', 5);
  assert.equal(kill.destroyed, true);
  assert.equal(kill.lastHitBy, 'attackerX');
});

test('findCrewStructureAt / updateCrewStructure cover all three kinds', () => {
  const crew = { id: 'c', fortresses: [{ id: 'f', tileKey: '1,1' }], wells: [{ id: 'w', tileKey: '2,2' }], outpost: { id: 'o', tileKey: '3,3' } };
  assert.equal(findCrewStructureAt([crew], '1,1').kind, 'fortress');
  assert.equal(findCrewStructureAt([crew], '2,2').kind, 'well');
  assert.equal(findCrewStructureAt([crew], '3,3').kind, 'outpost');
  assert.equal(findCrewStructureAt([crew], '4,4'), null);
  assert.equal(updateCrewStructure(crew, 'well', 'w', null).wells.length, 0);
  assert.equal(updateCrewStructure(crew, 'outpost', 'o', null).outpost, null);
  assert.equal(updateCrewStructure(crew, 'fortress', 'f', { id: 'f', tileKey: '1,1', siege: 7 }).fortresses[0].siege, 7);
});
