import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../shared/constants/regions.js';
import {
  WAR_TERRITORY_DEBUFF_MULT, regionKeepTileKey, recordRegionCapture, siegeTerritoryMultiplier,
} from '../shared/utils/warRules.js';

test('regionKeepTileKey: matches a real region\'s cx,cy exactly', () => {
  const region = REGIONS.frosthold;
  assert.equal(regionKeepTileKey('frosthold'), `${region.cx},${region.cy}`);
  assert.equal(regionKeepTileKey('not_a_real_region'), null);
});

test('recordRegionCapture: sets/overwrites a region\'s owning faction, no-ops on unchanged owner', () => {
  const owners = recordRegionCapture({}, 'frosthold', 'pirates');
  assert.equal(owners.frosthold, 'pirates');

  const sameOwner = recordRegionCapture(owners, 'frosthold', 'pirates');
  assert.equal(sameOwner, owners); // identity unchanged — no-op

  const flipped = recordRegionCapture(owners, 'frosthold', 'orcs');
  assert.equal(flipped.frosthold, 'orcs');
  assert.notEqual(flipped, owners); // new object
});

test('recordRegionCapture: no-ops without a regionKey or faction', () => {
  const owners = { frosthold: 'pirates' };
  assert.equal(recordRegionCapture(owners, null, 'orcs'), owners);
  assert.equal(recordRegionCapture(owners, 'frosthold', null), owners);
});

test('siegeTerritoryMultiplier: neutral region (no owner) — no debuff', () => {
  const mult = siegeTerritoryMultiplier({
    tile: { regionKey: 'frosthold' }, regionOwners: {}, attackerFaction: 'pirates', atWar: false,
  });
  assert.equal(mult, 1);
});

test('siegeTerritoryMultiplier: your own faction\'s territory — no debuff', () => {
  const mult = siegeTerritoryMultiplier({
    tile: { regionKey: 'frosthold' }, regionOwners: { frosthold: 'pirates' },
    attackerFaction: 'pirates', atWar: false,
  });
  assert.equal(mult, 1);
});

test('siegeTerritoryMultiplier: enemy faction\'s territory, not at war — full -70% debuff', () => {
  const mult = siegeTerritoryMultiplier({
    tile: { regionKey: 'frosthold' }, regionOwners: { frosthold: 'orcs' },
    attackerFaction: 'pirates', atWar: false,
  });
  assert.equal(mult, WAR_TERRITORY_DEBUFF_MULT);
});

test('siegeTerritoryMultiplier: at war lifts the debuff even in enemy territory', () => {
  const mult = siegeTerritoryMultiplier({
    tile: { regionKey: 'frosthold' }, regionOwners: { frosthold: 'orcs' },
    attackerFaction: 'pirates', atWar: true,
  });
  assert.equal(mult, 1);
});

test('siegeTerritoryMultiplier: tile with no regionKey — no debuff', () => {
  const mult = siegeTerritoryMultiplier({
    tile: {}, regionOwners: { frosthold: 'orcs' }, attackerFaction: 'pirates', atWar: false,
  });
  assert.equal(mult, 1);
});
