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

test('real generated map: every planned camp is placed and Find Camps sees them', async () => {
  // End-to-end regression for "search shows no camps": run the real map generator,
  // decode it the way useMapInit does, then search the resulting lazy tile map.
  globalThis.self = globalThis;
  let done = null;
  globalThis.postMessage = (m) => { if (m.type === 'done') done = m; };
  await import('../src/workers/mapGen.worker.js');
  globalThis.self.onmessage({ data: { facKey: 'pirates' } });
  assert.ok(done, 'map generation finished');

  const { decodeBuffers, createTileMap } = await import('../shared/utils/worldTiles.js');
  const { planAllCamps } = await import('../shared/utils/neutralCamps.js');
  const { map } = createTileMap(decodeBuffers(done.buffers), done.meta);

  const plan = planAllCamps({ campsPerRegion: 30, campsPerZone: 20 });
  const placed = Object.keys(done.meta.campMeta);
  assert.equal(placed.length, plan.length, 'no planned camp was skipped');
  assert.ok(placed.every(k => /^\d+,\d+$/.test(k)), 'camp keys are real coordinates');

  const all = new Set(['t1', 't2', 't3', 'ancient']);
  const [c0, r0] = placed[0].split(',').map(Number);
  const near = findCamps(map, c0, r0, all);
  assert.ok(near.length > 0, 'search finds camps around a placed camp');
  assert.ok(near.every(x => map[x.key].isCamp && x.name.endsWith('Camp')));
  // Camps carry their name, 2 waves, footprint and a renderer-facing camp list.
  const first = map[placed[0]];
  assert.equal(first.isCamp, true);
  assert.ok(first.campName && first.campName.endsWith('Camp'), 'tile popup gets the camp name');
  assert.equal(first.garrisonWaves, 2);
  assert.ok(first.campW >= 1 && first.campH >= 1);
  assert.equal(map.__camps.length, plan.length);
  assert.equal(Object.keys(map).includes('__camps'), false, 'camp list does not pollute tile-store keys');
  for (const key of placed.slice(0, 50)) assert.equal(map[key].garrisonWaves, 2);
  // Camps are spread across each region, not packed around its keep.
  const regionArr = new Uint8Array(done.buffers.region);
  const byRegion = {};
  for (const key of placed) {
    const [c, r] = key.split(',').map(Number);
    (byRegion[regionArr[r * 1845 + c]] ??= []).push([c, r]);
  }
  for (const [ri, pts] of Object.entries(byRegion)) {
    const reg = done.meta.regionList[ri - 1];
    if (!reg || pts.length < 20) continue;
    const dist = pts.map(([c, r]) => Math.hypot(c - reg.cx, r - reg.cy)).sort((a, b) => a - b);
    const nn = pts.map(p => Math.min(...pts.filter(q => q !== p).map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))));
    const meanNN = nn.reduce((a, b) => a + b, 0) / nn.length;
    assert.ok(dist[dist.length >> 1] > 30, `${reg.name}: median distance from keep ${dist[dist.length >> 1].toFixed(0)}`);
    assert.ok(meanNN > 12, `${reg.name}: mean nearest-neighbour ${meanNN.toFixed(1)}`);
  }
  // Both waves have the same level and troop count; only the commander changes.
  const { garrisonWaveCount, garrisonWaveDefCmd } = await import('../shared/utils/garrisonUtils.js');
  const step = Math.max(1, Math.floor(placed.length / 60));
  for (let i = 0; i < placed.length; i += step) {
    const t = map[placed[i]];
    assert.equal(garrisonWaveCount(t), 2);
    const [w0, w1] = [0, 1].map(wi => garrisonWaveDefCmd(t, wi, 'pirates'));
    assert.equal(w1.lvl, w0.lvl, `${t.campName} level`);
    assert.equal(w1.troops, w0.troops, `${t.campName} troop count`);
    assert.deepEqual(w1.troopSlots, w0.troopSlots, `${t.campName} troop layout`);
  }
  // Ancient camps live in the gate zones (Finalhope is anchored at 769,761).
  assert.ok(findCamps(map, 769, 761, new Set(['ancient']), { radius: 300 }).length > 0);
});
