import test from 'node:test';
import assert from 'node:assert/strict';
import { FORTRESS_COST, FORTRESS_MIN_POWER_LEVEL, FORTRESS_COMMANDER_SLOTS_PER_MEMBER } from '../shared/constants/crew.js';
import { createCrew } from '../shared/utils/crewRules.js';
import {
  canBuildFortressOnTile, canAffordFortress, canStartFortressBuild,
  createFortress, isFortressBuilt, completeFortressBuild,
  commanderSlotCapFor, stationedCount, canStationCommander, stationCommander,
  unstationCommander, isClearToSiege, applySiegeDamage, removeFortress,
  canDemolishFortress, nextDefender,
} from '../shared/utils/crewFortress.js';

function crewWith(overrides) {
  return { ...createCrew({ id: 'c1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', founderId: 'f' }), ...overrides };
}

test('canBuildFortressOnTile: needs p10+, no camp, unclaimed, no existing structure', () => {
  assert.equal(canBuildFortressOnTile(null).ok, false);
  assert.equal(canBuildFortressOnTile({ powerLevel: 9 }).ok, false);
  assert.equal(canBuildFortressOnTile({ powerLevel: FORTRESS_MIN_POWER_LEVEL, isCamp: true }).ok, false);
  assert.equal(canBuildFortressOnTile({ powerLevel: FORTRESS_MIN_POWER_LEVEL, owner: 'someone' }).ok, false);
  assert.equal(canBuildFortressOnTile({ powerLevel: FORTRESS_MIN_POWER_LEVEL, fort: {} }).ok, false);
  assert.equal(canBuildFortressOnTile({ powerLevel: FORTRESS_MIN_POWER_LEVEL }).ok, true);
});

test('canAffordFortress checks all three resources against FORTRESS_COST', () => {
  assert.equal(canAffordFortress({ wood: 0, stone: 0, gas: 0 }), false);
  assert.equal(canAffordFortress({ wood: FORTRESS_COST.wood - 1, stone: FORTRESS_COST.stone, gas: FORTRESS_COST.gas }), false);
  assert.equal(canAffordFortress(FORTRESS_COST), true);
});

test('canStartFortressBuild: role, slots, tile and resources all gate it', () => {
  const crew = crewWith({ members: ['f', 'm'], officers: [] });
  const tile = { powerLevel: 10 };
  assert.equal(canStartFortressBuild(crew, 'm', tile, FORTRESS_COST).ok, false); // member can't build
  assert.equal(canStartFortressBuild(crew, 'f', tile, { wood: 0, stone: 0, gas: 0 }).ok, false); // can't afford
  assert.equal(canStartFortressBuild(crew, 'f', tile, FORTRESS_COST).ok, true);

  const fullCrew = { ...crew, fortresses: [{ id: 'a' }, { id: 'b' }] }; // 2/2 slots used at level 1
  assert.equal(canStartFortressBuild(fullCrew, 'f', tile, FORTRESS_COST).ok, false);
});

test('fortress build lifecycle: not built until buildEndsAt passes, then completeFortressBuild fills siege', () => {
  const now = 1_000_000;
  const fortress = createFortress({ id: 'ft1', crewId: 'c1', tileKey: '5,5', now, siegeMax: 1000 });
  assert.equal(isFortressBuilt(fortress, now), false);
  assert.equal(isFortressBuilt(fortress, now + 3 * 60 * 60_000 - 1), false);
  assert.equal(isFortressBuilt(fortress, now + 3 * 60 * 60_000), true);

  const built = completeFortressBuild(fortress);
  assert.equal(built.buildEndsAt, undefined);
  assert.equal(built.siege, 1000);
});

test('stationing: per-member cap, crew-wide cap, and unstation', () => {
  const crew = crewWith({ members: ['f', 'm'] }); // 2 members * 2 slots = 4 total cap
  assert.equal(commanderSlotCapFor(crew), 4);
  let fortress = createFortress({ id: 'ft1', crewId: 'c1', tileKey: '5,5', now: 0 });

  assert.equal(canStationCommander(crew, fortress, 'f').ok, true);
  fortress = stationCommander(fortress, 'f', 'cmd1');
  fortress = stationCommander(fortress, 'f', 'cmd2');
  assert.equal(stationedCount(fortress), 2);
  // f already has 2 (the per-member max)
  assert.equal(canStationCommander(crew, fortress, 'f').ok, false);
  // m can still station
  assert.equal(canStationCommander(crew, fortress, 'm').ok, true);
  fortress = stationCommander(fortress, 'm', 'cmd3');
  fortress = stationCommander(fortress, 'm', 'cmd4');
  // crew-wide cap (4) now hit
  assert.equal(stationedCount(fortress), 4);

  fortress = unstationCommander(fortress, 'f', 'cmd1');
  assert.equal(stationedCount(fortress), 3);
  assert.deepEqual(fortress.stationedByPlayer.f, ['cmd2']);
});

test('siege: fortress must be clear of stationed armies before it can be sieged, and 0 HP destroys it with last-hit attribution', () => {
  let fortress = createFortress({ id: 'ft1', crewId: 'c1', tileKey: '5,5', now: 0, siegeMax: 100 });
  fortress = completeFortressBuild(fortress);
  fortress = stationCommander(fortress, 'f', 'cmd1');
  assert.equal(isClearToSiege(fortress), false);

  fortress = unstationCommander(fortress, 'f', 'cmd1');
  assert.equal(isClearToSiege(fortress), true);

  let result = applySiegeDamage(fortress, 'attacker1', 40);
  assert.equal(result.destroyed, false);
  assert.equal(result.fortress.siege, 60);

  result = applySiegeDamage(result.fortress, 'attacker2', 100);
  assert.equal(result.destroyed, true);
  assert.equal(result.lastHitBy, 'attacker2');
  assert.equal(result.fortress.siege, 0);
});

test('removeFortress drops it from the crew list; canDemolishFortress matches canManageFortress', () => {
  let crew = crewWith({ officers: ['o'] });
  crew = { ...crew, fortresses: [{ id: 'ft1' }, { id: 'ft2' }] };
  crew = removeFortress(crew, 'ft1');
  assert.deepEqual(crew.fortresses.map(f => f.id), ['ft2']);
  assert.equal(canDemolishFortress(crew, 'f'), true);
  assert.equal(canDemolishFortress(crew, 'o'), true);
  assert.equal(canDemolishFortress(crew, 'someone_else'), false);
});

test('nextDefender: deterministic order, null once clear', () => {
  let fortress = createFortress({ id: 'ft1', crewId: 'c1', tileKey: '5,5', now: 0 });
  assert.equal(nextDefender(fortress), null);

  fortress = stationCommander(fortress, 'ai_pirates_2', 'cmdA');
  fortress = stationCommander(fortress, 'ai_pirates_1', 'cmdB');
  // 'ai_pirates_1' sorts before 'ai_pirates_2'
  assert.deepEqual(nextDefender(fortress), { playerId: 'ai_pirates_1', commanderUid: 'cmdB' });

  fortress = unstationCommander(fortress, 'ai_pirates_1', 'cmdB');
  assert.deepEqual(nextDefender(fortress), { playerId: 'ai_pirates_2', commanderUid: 'cmdA' });

  fortress = unstationCommander(fortress, 'ai_pirates_2', 'cmdA');
  assert.equal(nextDefender(fortress), null);
});
