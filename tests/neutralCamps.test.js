import test from 'node:test';
import assert from 'node:assert/strict';
import { NEUTRAL_TROOPS } from '../shared/constants/neutralTroops.js';
import { ANCIENT_TROOPS } from '../shared/constants/ancientTroops.js';
import { REGIONS_BY_BAND, ANCIENT_ZONE_NAMES } from '../shared/constants/mapRegions.js';
import {
  CAMP_FOOTPRINTS,
  campFootprint,
  campPowerLevel,
  campSiegeMax,
  campName,
  campDefenders,
  buildCampTemplate,
  neutralUnitsForBand,
  planCampsForBand,
  planAllNeutralCamps,
  planAncientZoneCamps,
  planAllCamps,
  ANCIENT_ZONE_ASSIGNMENT,
} from '../shared/utils/neutralCamps.js';

test('footprint by size: small 1x1, medium 1x2, large 2x2', () => {
  assert.deepEqual(campFootprint('small'), { w: 1, h: 1 });
  assert.deepEqual(campFootprint('medium'), { w: 1, h: 2 });
  assert.deepEqual(campFootprint('large'), { w: 2, h: 2 });
  assert.deepEqual(campFootprint('unknown'), { w: 1, h: 1 }); // safe fallback
});

test('every neutral and Ancient unit maps to a footprint matching its size', () => {
  for (const u of [...NEUTRAL_TROOPS, ...ANCIENT_TROOPS]) {
    const fp = campFootprint(u.size);
    if (u.size === 'small') assert.deepEqual(fp, { w: 1, h: 1 });
    if (u.size === 'medium') assert.deepEqual(fp, { w: 1, h: 2 });
    if (u.size === 'large') assert.deepEqual(fp, { w: 2, h: 2 });
  }
});

test('power level by tier: T1~P7, T2~P9, T3~P11, Ancients~P13', () => {
  const t1 = NEUTRAL_TROOPS.find(u => u.tier === 0);
  const t2 = NEUTRAL_TROOPS.find(u => u.tier === 1);
  const t3 = NEUTRAL_TROOPS.find(u => u.tier === 2);
  assert.equal(campPowerLevel(t1), 7);
  assert.equal(campPowerLevel(t2), 9);
  assert.equal(campPowerLevel(t3), 11);
  for (const a of ANCIENT_TROOPS) assert.equal(campPowerLevel(a, { isAncient: true }), 13);
});

test('siege HP scales by tier across the 100k-500k range', () => {
  const t1 = NEUTRAL_TROOPS.find(u => u.tier === 0);
  const t2 = NEUTRAL_TROOPS.find(u => u.tier === 1);
  const t3 = NEUTRAL_TROOPS.find(u => u.tier === 2);
  assert.equal(campSiegeMax(t1), 100000);
  assert.ok(campSiegeMax(t2) > campSiegeMax(t1) && campSiegeMax(t2) < campSiegeMax(t3));
  assert.ok(campSiegeMax(t3) < 500000);
  for (const a of ANCIENT_TROOPS) assert.equal(campSiegeMax(a, { isAncient: true }), 500000);
});

test('camp naming: "{unit label} Camp"', () => {
  for (const u of NEUTRAL_TROOPS) assert.equal(campName(u), `${u.label} Camp`);
  for (const a of ANCIENT_TROOPS) assert.equal(campName(a), `${a.label} Camp`);
});

test('every camp has exactly 2 defenders, strength matching the comparable power level', () => {
  for (const u of NEUTRAL_TROOPS) {
    const defs = campDefenders(u);
    assert.equal(defs.length, 2);
    for (const d of defs) {
      assert.equal(d.powerLevel, campPowerLevel(u));
      assert.deepEqual(d.troopBranch, { neutralKey: u.key });
    }
  }
  for (const a of ANCIENT_TROOPS) {
    const defs = campDefenders(a, { isAncient: true });
    assert.equal(defs.length, 2);
    for (const d of defs) {
      assert.equal(d.powerLevel, 13);
      assert.deepEqual(d.troopBranch, { faction: 'ancients', branch: a.key, tier: 0 });
    }
  }
});

test('buildCampTemplate assembles name/footprint/siege/defenders consistently', () => {
  const u = NEUTRAL_TROOPS[0];
  const t = buildCampTemplate(u);
  assert.equal(t.name, campName(u));
  assert.deepEqual(t.footprint, campFootprint(u.size));
  assert.equal(t.siege, campSiegeMax(u));
  assert.equal(t.siegeMax, campSiegeMax(u));
  assert.equal(t.defenders.length, 2);
});

test('neutralUnitsForBand matches the 5/5/5 corrected region split', () => {
  for (const band of ['north', 'mid', 'south']) {
    assert.equal(neutralUnitsForBand(band).length, 5);
  }
});

test('planCampsForBand places ~campsPerRegion camps in every named sub-region of that band', () => {
  const plan = planCampsForBand('north', { campsPerRegion: 30 });
  const regionCount = REGIONS_BY_BAND.north.length;
  assert.ok(regionCount > 0);
  assert.equal(plan.length, regionCount * 30);
  // every planned camp's unit actually belongs to this band
  const northKeys = new Set(neutralUnitsForBand('north').map(u => u.key));
  for (const entry of plan) assert.ok(northKeys.has(entry.unit));
  // deterministic: re-running produces the identical plan
  const plan2 = planCampsForBand('north', { campsPerRegion: 30 });
  assert.deepEqual(plan, plan2);
});

test('planAllNeutralCamps covers all 3 bands', () => {
  const plan = planAllNeutralCamps({ campsPerRegion: 5 }); // small N for a fast test
  const bands = new Set(plan.map(p => p.band));
  assert.deepEqual([...bands].sort(), ['mid', 'north', 'south']);
});

test('planAncientZoneCamps: 4 zones, 1 assigned Ancient each, 20 camps per zone', () => {
  const plan = planAncientZoneCamps({ campsPerZone: 20 });
  assert.equal(plan.length, 4 * 20);
  for (const zoneName of ANCIENT_ZONE_NAMES) {
    const zoneEntries = plan.filter(p => p.regionName === zoneName);
    assert.equal(zoneEntries.length, 20);
    const units = new Set(zoneEntries.map(e => e.unit));
    assert.equal(units.size, 1); // exactly one Ancient per zone
    assert.equal([...units][0], ANCIENT_ZONE_ASSIGNMENT[zoneName]);
  }
  // all 4 Ancients used, each exactly once across the 4 zones
  const allAssigned = Object.values(ANCIENT_ZONE_ASSIGNMENT);
  assert.equal(new Set(allAssigned).size, 4);
});

test('planAllCamps combines neutral + Ancient plans', () => {
  const plan = planAllCamps({ campsPerRegion: 2, campsPerZone: 2 });
  assert.ok(plan.some(p => p.template.isAncient));
  assert.ok(plan.some(p => !p.template.isAncient));
});

test('every planned camp carries a finite in-bounds anchor (cx, cy) for mapGen placement', () => {
  // Regression: entries without cx/cy made findCampSlot return {c: undefined, r: undefined},
  // so no camp was ever stamped onto the map.
  const plan = planAllCamps({ campsPerRegion: 30, campsPerZone: 20 });
  assert.ok(plan.length > 0);
  for (const e of plan) {
    assert.ok(Number.isInteger(e.cx) && e.cx >= 0 && e.cx < 1845, `${e.regionKey} cx`);
    assert.ok(Number.isInteger(e.cy) && e.cy >= 0 && e.cy < 1305, `${e.regionKey} cy`);
  }
});
