// World setup rules moved out of Game.jsx (split 9).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createTileMap, stampPlayerHq, aiHqKeysByFaction, initialAiCommanders, crewFounders, primaryAiFaction, spawnEligibleKeys, ALL_FACTIONS} from '../shared/utils/worldTiles.js';

// 4x4 world: owner 1 = "player"-less faction code, flags bit 1 = HQ.
const C = 4, R = 4, N = C * R;
const meta = {
  COLS:C, ROWS:R, regionList:[{key:'reg', name:'Region', keepName:'Keep'}], keepMeta:{},
  TERRAIN_DEC:['grass','hill'], RSS_DEC:[null,'wood'], OWNER_DEC:[null,'orcs'],
  F_KEEP:1, F_KEEPPART:2, F_HQ:4, F_HQPART:8, F_WIN:16, F_GATE:32, F_BORDER:64,
};
const arrays = () => ({
  terrainArr:new Uint8Array(N), ownerArr:new Uint8Array(N), rssArr:new Uint8Array(N).fill(1),
  troopArr:new Uint8Array(N), powerArr:new Uint8Array(N).fill(5), regionArr:new Uint8Array(N).fill(1),
  flagArr:new Uint16Array(N), garrisonArr:new Uint32Array(N).fill(250), siegeArr:new Uint32Array(N).fill(9),
  siegeMaxArr:new Uint32Array(N).fill(9), keepPrimArr:new Int32Array(N),
});

test('tile map computes tiles on demand and only enumerates stored tiles', () => {
  const a = arrays(); a.ownerArr[5] = 1; a.flagArr[5] = 4; // 1,1 = orcs HQ
  const {map, store} = createTileMap(a, meta);
  const t = map['1,1'];
  assert.equal(t.owner, 'orcs'); assert.equal(t.faction, 'orcs'); assert.equal(t.isHQ, true);
  assert.equal(t.garrison, 2.5); assert.equal(t.rss, 'wood'); assert.equal(t.regionKey, 'reg');
  assert.equal(t.garrisonDefeated, false);
  assert.equal(map['9,9'], undefined);
  assert.deepEqual(Object.keys(map), []);
  map['0,0'] = {x:1}; assert.deepEqual(Object.keys(map), ['0,0']); assert.equal(store['0,0'].x, 1);
});

test('player HQ stamp owns all 9 tiles', () => {
  const {map} = createTileMap(arrays(), meta);
  assert.equal(stampPlayerHq(map, '1,1', 'pirates'), true);
  assert.equal(map['1,1'].faction, 'pirates');
  for (const k of ['0,0','2,2','0,2']) assert.equal(map[k].owner, 'player');
  assert.equal(map['3,3'].owner, null);
  assert.equal(stampPlayerHq(map, null, 'pirates'), false);
});

test('AI HQs: every other faction plus own-faction AIs, nearest first', () => {
  const spawn = {pirates:['10,10','50,50','11,11'], orcs:['90,90','12,10']};
  const hq = aiHqKeysByFaction(spawn, 'pirates', '10,10');
  assert.deepEqual(Object.keys(hq), [...ALL_FACTIONS.filter(f => f !== 'pirates'), 'pirates']);
  assert.deepEqual(hq.orcs, ['12,10','90,90']);
  assert.deepEqual(hq.pirates, ['11,11','50,50']);
  const {cmds, activeHqs} = initialAiCommanders(hq, 'pirates', 1);
  assert.deepEqual(activeHqs, ['11,11','50,50']);
  assert.ok(cmds.every(c => c.owner === 'ai' && c.faction === 'pirates'));
  assert.equal(cmds[0].ownerPlayerId, 'ai_pirates_0');
});

test('crew founders, primary AI faction and spawn-eligible tiles', () => {
  const ids = crewFounders({orcs:['a','b','c','d','e','f'], pirates:['g','h','i','j']}, 'pirates');
  assert.deepEqual(ids, ['ai_orcs_0','ai_orcs_2','ai_orcs_4','ai_pirates_0','ai_pirates_2']);
  assert.equal(primaryAiFaction(['pirates','orcs'], 'humans'), 'orcs');
  assert.equal(primaryAiFaction(['orcs','wizards'], 'creatures'), 'wizards');
  const a = arrays(); a.flagArr[0] = 32; a.ownerArr[1] = 1; a.powerArr[2] = 2; a.powerArr[3] = 11;
  const keys = spawnEligibleKeys(a, meta, {1:{key:'reg'}});
  assert.equal(keys.length, N - 4);
  assert.equal(keys[0], '0,1|reg');
});
