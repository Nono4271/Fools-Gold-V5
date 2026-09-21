import test from 'node:test';
import assert from 'node:assert/strict';
import { aiResourceIncomeTick, resourceIncomeTick, TILE_RATE_BY_PL } from '../shared/utils/resourceIncome.js';
import { rssRate, storageMax } from '../shared/constants/buildings.js';

const HOUR = 3_600_000;
const zero = { stone: 0, wood: 0, gas: 0, food: 0 };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);

test('with no tiles or buildings an AI faction earns the player base: 200 of each resource per HOUR', () => {
  const r = aiResourceIncomeTick(zero, {}, [], {}, HOUR);
  for (const k of ['stone', 'wood', 'gas', 'food']) near(r[k], 200, k);
  // ...not 200 per second, and not the old +5 per second
  const oneSecond = aiResourceIncomeTick(zero, {}, [], {}, 1000);
  near(oneSecond.wood, 200 / 3600, 'one second');
});

test('AI tile income uses the same hourly power-level rates as the player', () => {
  const tiles = {
    '1,1': { rss: 'wood', powerLevel: 9 },   // 800/h wood
    '2,2': { rss: 'gas',  powerLevel: 5 },   // 420/h gas
    '3,3': { rss: 'food', powerLevel: 1 },   // power 1: +50/h of EVERY resource
    '4,4': { rss: null,   powerLevel: 9 },   // not a resource tile: nothing
  };
  const r = aiResourceIncomeTick(zero, tiles, Object.keys(tiles), {}, HOUR);
  near(r.wood, 200 + TILE_RATE_BY_PL[9] + 50, 'wood');
  near(r.gas,  200 + TILE_RATE_BY_PL[5] + 50, 'gas');
  near(r.food, 200 + 50, 'food');
  near(r.stone, 200 + 50, 'stone');
  // Only the faction's own keys count
  const only = aiResourceIncomeTick(zero, tiles, ['1,1'], {}, HOUR);
  near(only.wood, 200 + 800, 'own tile only');
  near(only.gas, 200, 'other faction tile ignored');
});

test('AI income matches the player tick for identical holdings (same rules, same numbers)', () => {
  const bldgs = { quarry: 3, lumber: 5, forge: 0, refinery: 10 };
  const aiTiles = { a: { rss: 'wood', powerLevel: 7 }, b: { rss: 'food', powerLevel: 3 } };
  const playerTiles = { a: { ...aiTiles.a, owner: 'player' }, b: { ...aiTiles.b, owner: 'player' } };
  const ai = aiResourceIncomeTick(zero, aiTiles, ['a', 'b'], bldgs, 10 * 60_000);
  const pl = resourceIncomeTick(zero, playerTiles, bldgs, [], {}, 10 * 60_000);
  assert.deepEqual(ai, pl);
  near(ai.food, (200 + rssRate(10) + TILE_RATE_BY_PL[3]) * (10 / 60), 'food formula');
});

test('elapsed-time scaling: 3600 one-second ticks equal one hour, and a late tick credits the whole gap', () => {
  const tiles = { a: { rss: 'wood', powerLevel: 9 } };
  let s = zero;
  for (let i = 0; i < 3600; i++) s = aiResourceIncomeTick(s, tiles, ['a'], {}, 1000);
  const hour = aiResourceIncomeTick(zero, tiles, ['a'], {}, HOUR);
  near(s.wood, hour.wood, 'wood');
  near(s.stone, hour.stone, 'stone');
  // backgrounded for 30 minutes then one tick: nothing lost
  const late = aiResourceIncomeTick(zero, tiles, ['a'], {}, 30 * 60_000);
  near(late.wood, hour.wood / 2, 'late tick');
});

test('AI income stops at the same storage cap as the player and is a no-op with no elapsed time', () => {
  const cap = storageMax(0);
  const near_cap = { stone: cap - 1, wood: cap, gas: cap, food: cap };
  const r = aiResourceIncomeTick(near_cap, {}, [], {}, HOUR);
  assert.deepEqual(r, { stone: cap, wood: cap, gas: cap, food: cap });
  assert.equal(aiResourceIncomeTick(zero, {}, [], {}, 0), zero);
  assert.equal(aiResourceIncomeTick(zero, {}, [], {}, -5), zero);
  assert.equal(aiResourceIncomeTick(zero, null, null, {}, 1000).wood > 0, true); // tolerates missing tiles
});
