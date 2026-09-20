// Rules moved out of Game.jsx: relocation, consumables, tile timers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RELOCATION_COOLDOWN_MS, allHqKeyList, checkPlannedRelocation, hqMovePatches} from '../shared/utils/relocation.js';
import {consumeOne, restoreOne, speedUpBuildings, expediteBuilding, extendRssBoost, withRssBoosts, RSS_BOOST_BONUS} from '../shared/utils/consumables.js';
import {TILE_PROTECTION_MS, TILE_DELETE_MS, pruneProtections, deletionStatus, abandonedTilePatch} from '../shared/utils/tileTimers.js';

// ── Relocation ──
// 3x3 player-owned 1x1 pad in one region, centred on 10,10; old HQ at 20,20.
const pad = () => { const t = {}; for (let c = 8; c <= 12; c++) for (let r = 8; r <= 12; r++) t[`${c},${r}`] = {c, r, owner:'player', regionKey:'a', powerLevel:1}; return t; };
const base = {centerKey:'10,10', aiHqKeys:{}, playerHqKey:'20,20', lastRelocateAt:null, cmds:[], consumables:[{typeId:'relocation', quantity:1}], now:RELOCATION_COOLDOWN_MS * 2};

test('hq key list merges AI and player HQs', () => {
  assert.deepEqual(allHqKeyList({orcs:['1,1'], wizards:['2,2']}, '3,3'), ['1,1', '2,2', '3,3']);
  assert.deepEqual(allHqKeyList({}, null), []);
});

test('planned relocation passes on a valid pad', () => {
  assert.deepEqual(checkPlannedRelocation({...base, tiles:pad()}), {ok:true});
});

test('planned relocation checks cooldown, marching and tokens in order', () => {
  const tiles = pad();
  const cd = checkPlannedRelocation({...base, tiles, lastRelocateAt:base.now - 1000});
  assert.equal(cd.ok, false); assert.match(cd.reason, /Cannot relocate for 72h/);
  const m = checkPlannedRelocation({...base, tiles, cmds:[{owner:'player', march:{}}]});
  assert.match(m.reason, /Recall all commanders/);
  assert.match(checkPlannedRelocation({...base, tiles, consumables:[]}).reason, /No Relocation Tokens/);
  assert.equal(checkPlannedRelocation({...base, tiles:{}}).ok, false);
});

test('HQ move reverts the old 3x3 and stamps the new one', () => {
  const p = hqMovePatches('20,20', '10,10', {'10,10':{siegeMax:900}}, 'pirates');
  assert.equal(p.length, 18);
  const byKey = Object.fromEntries(p);
  assert.equal(byKey['20,20'].owner, null);
  assert.equal(byKey['10,10'].isHQ, true);
  assert.equal(byKey['10,10'].siegeMax, 900);
  assert.equal(byKey['11,11'].isHQPart, true);
  assert.equal(byKey['11,11'].faction, 'pirates');
  // overlapping move: shared tiles are only stamped, never reverted
  assert.equal(hqMovePatches('10,10', '11,10', {}, 'pirates').length, 12);
});

// ── Consumables ──
test('consume and restore items', () => {
  const bag = [{typeId:'a', quantity:2}, {typeId:'b', quantity:1}];
  assert.deepEqual(consumeOne(bag, 'a'), [{typeId:'a', quantity:1}, {typeId:'b', quantity:1}]);
  assert.deepEqual(consumeOne(bag, 'b'), [{typeId:'a', quantity:2}]);
  assert.equal(consumeOne(bag, 'missing'), bag);
  assert.deepEqual(restoreOne([], 'b', 5), [{instanceId:'cons_restore_5', typeId:'b', quantity:1}]);
  assert.equal(restoreOne(bag, 'a', 5)[0].quantity, 3);
});

test('building speedups and expedience', () => {
  const q = {hq:{endsAt:10_000}, forge:{endsAt:1_000}};
  assert.deepEqual(speedUpBuildings(q, 4_000, 2_000), {hq:{endsAt:6_000}, forge:{endsAt:1_000}});
  assert.equal(speedUpBuildings(q, 99_000, 2_000).hq.endsAt, 2_000);
  const far = {hq:{endsAt:10 * 60_000}};
  assert.equal(expediteBuilding(far, 'hq', 0), far);
  assert.equal(expediteBuilding({hq:{endsAt:60_000}}, 'hq', 0).hq.endsAt, 0);
  assert.equal(expediteBuilding({}, 'hq', 0).hq, undefined);
});

test('resource boosts start, extend and apply only while active', () => {
  let b = extendRssBoost({}, 'food', 1000, 0);
  assert.equal(b.food, 1000);
  b = extendRssBoost(b, 'food', 1000, 500);
  assert.equal(b.food, 2000);
  assert.equal(withRssBoosts({food:0.1}, b, 1500).food, 0.1 + RSS_BOOST_BONUS);
  assert.equal(withRssBoosts({food:0.1}, b, 2000).food, 0.1);
});

// ── Tile timers ──
test('protection lasts three minutes and prunes when expired', () => {
  assert.equal(TILE_PROTECTION_MS, 180_000);
  const p = {a:100, b:200};
  assert.equal(pruneProtections(p, 50), p);
  assert.deepEqual(pruneProtections(p, 150), {b:200});
});

test('abandoning a tile takes five minutes', () => {
  assert.equal(TILE_DELETE_MS, 300_000);
  assert.deepEqual(deletionStatus({a:0}, 1000), {secsLeft:{a:299}, expired:[]});
  assert.deepEqual(deletionStatus({a:0}, 300_000), {secsLeft:{a:0}, expired:['a']});
});

test('abandoned tile goes neutral with a fresh defender', () => {
  const low = abandonedTilePatch({powerLevel:2, siegeMax:77}, '5,5', 'pirates');
  assert.equal(low.owner, null);
  assert.equal(low.siege, 77);
  assert.ok(low.defCmd && low.garrison > 0);
  assert.ok(abandonedTilePatch({powerLevel:6}, '5,5', 'pirates').defCmd);
});
