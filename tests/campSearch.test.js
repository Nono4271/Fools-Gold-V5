import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMP_TIERS, campTierForPowerLevel, findCamps } from '../shared/utils/campSearch.js';

const camp = (name, pl, extra = {}) => ({ isCamp: true, campName: name, powerLevel: pl, ...extra });
function mapOf(entries) { return Object.fromEntries(entries); }

test('camp tiers map to the camp power levels (T1/T2/T3 = P7/P9/P11, Ancient = P13)', () => {
  assert.deepEqual(CAMP_TIERS.map(t => t.powerLevel), [7, 9, 11, 13]);
  assert.equal(campTierForPowerLevel(13).key, 'ancient');
  assert.equal(campTierForPowerLevel(8), null);
});

test('findCamps returns only selected tiers, nearest first, with names', () => {
  const tiles = mapOf([
    ['10,10', camp('Wolf Rider Camp', 7)],
    ['12,10', camp('Ogre Camp', 9)],
    ['20,10', camp('Nameless Colossus Camp', 13)],
    ['11,10', camp('Yeti Camp', 7)],
  ]);
  const t1 = findCamps(tiles, 10, 10, new Set(['t1']));
  assert.deepEqual(t1.map(r => r.name), ['Wolf Rider Camp', 'Yeti Camp']);
  assert.equal(t1[0].dist, 0);
  const both = findCamps(tiles, 10, 10, new Set(['t2', 'ancient']));
  assert.deepEqual(both.map(r => r.name), ['Ogre Camp', 'Nameless Colossus Camp']);
});

test('findCamps ignores plain tiles of the same power, footprint parts, and out-of-radius camps', () => {
  const tiles = mapOf([
    ['10,10', { powerLevel: 7 }],                              // ordinary P7 tile
    ['11,10', { isCampPart: true, powerLevel: 7 }],            // non-primary footprint tile
    ['10,11', camp('Far Camp', 7)],                             // in range
    ['10,300', camp('Too Far Camp', 7)],                        // out of range
  ]);
  const r = findCamps(tiles, 10, 10, new Set(['t1']), { radius: 100 });
  assert.deepEqual(r.map(x => x.name), ['Far Camp']);
});

test('findCamps handles empty selection, missing map, near-origin bounds, and the result limit', () => {
  const tiles = mapOf(Array.from({ length: 30 }, (_, i) => [`${i + 1},0`, camp(`C${i}`, 11)]));
  assert.deepEqual(findCamps(tiles, 0, 0, new Set()), []);
  assert.deepEqual(findCamps(null, 0, 0, new Set(['t3'])), []);
  assert.equal(findCamps(tiles, 0, 0, new Set(['t3'])).length, 20);          // default limit
  assert.equal(findCamps(tiles, 0, 0, new Set(['t3']), { limit: 5 }).length, 5);
});
