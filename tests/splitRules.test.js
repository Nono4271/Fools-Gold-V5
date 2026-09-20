// Rules moved out of Game.jsx: relocation, consumables, tile timers, tactics, AI crews, reinforcements.
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

// ── Tactics & ticks (split 5, 8) ──
import {TICK_MS, EGG_COST, dragonEggCap, regenEggs, regenStamina, quickGatherReward, gatherOrder, gatherTick, trainingTick, reconReport, spawnSeed} from '../shared/utils/tactics.js';

test('eggs refill the cap over 24h; stamina +1 per tick up to max', () => {
  assert.equal(dragonEggCap({tr:3}), 23);
  let e = 0; for (let i = 0; i < 24 * 60; i++) e = regenEggs(e, 20);
  assert.ok(Math.abs(e - 20) < 1e-6);
  assert.equal(regenEggs(25, 20), 25);
  assert.equal(regenStamina({stamina:10}, 150).stamina, 11);
  const full = {stamina:150}; assert.equal(regenStamina(full, 150), full);
  const missing = {}; assert.equal(regenStamina(missing, 150), missing);
});

test('quick gather needs eggs and a P2+ resource tile', () => {
  assert.deepEqual(quickGatherReward({powerLevel:2, rss:'wood'}, 3), {rss:'wood', amount:Math.floor(240 * 3 * 1.1)});
  assert.equal(quickGatherReward({powerLevel:2, rss:'wood'}, 2), null);
  assert.equal(quickGatherReward({powerLevel:1, rss:'wood'}, 9), null);
});

test('gather ticks pay 4x hourly rate per 10 min and stop at the order length', () => {
  const cmd = {gathering:true, gatherTileKey:'k', ...gatherOrder('k', 2, false, 0)};
  assert.equal(gatherTick(cmd, {powerLevel:3, rss:'gas'}, TICK_MS - 1), null);
  const r = gatherTick(cmd, {powerLevel:3, rss:'gas'}, TICK_MS * 5);
  assert.equal(r.newTicks, 2); assert.equal(r.amount, 280 * 4 * 2); assert.equal(r.eggs, 2 * EGG_COST.gather);
  assert.deepEqual(r.patch, {gatherTicksDone:2, gathering:false});
  assert.deepEqual(gatherTick(cmd, null, 0), {stop:true});
});

test('training ticks give XP and cost 2 eggs each', () => {
  const cmd = gatherOrder('k', 3, true, 0);
  const r = trainingTick(cmd, 2, 1, TICK_MS);
  assert.equal(r.eggs, 2); assert.ok(r.xp > 0); assert.equal(r.patch.training, true);
  assert.equal(trainingTick({...cmd, trainingTicksDone:3}, 2, 1, TICK_MS * 9), null);
});

test('recon report and spawn seed', () => {
  const rep = reconReport('4,4', {powerLevel:5}, {n:'Bob', troops:9}, 7);
  assert.equal(rep.type, 'recon'); assert.equal(rep.defCmdName, 'Bob'); assert.equal(rep.defTroopsStart, 9);
  assert.equal(spawnSeed('3,4'), spawnSeed('3,4')); assert.ok(spawnSeed('3,4') >= 0);
});

// ── AI crews (split 6) ──
import {aiCrewTick, AI_CREW_COST, AI_CREW_CAP} from '../shared/utils/aiCrews.js';

test('AI founders create a crew; others join it in the same tick', () => {
  const r = aiCrewTick({crews:[], aiPlayerIds:['ai_orcs_1', 'ai_orcs_2', 'ai_orcs_3'], founders:new Set(['ai_orcs_1']), gemsOf:() => 1000, now:5});
  assert.equal(r.crews.length, 1);
  assert.deepEqual(r.crews[0].members, ['ai_orcs_1', 'ai_orcs_2', 'ai_orcs_3']);
  assert.equal(r.crews[0].name, 'Orcs Vanguard');
  assert.deepEqual(r.gems, {ai_orcs_1: 1000 - AI_CREW_COST});
});

test('two joiners to an existing crew both stay (old code lost one per tick)', () => {
  const crews = [{id:'c', faction:'orcs', members:['ai_orcs_1']}];
  const r = aiCrewTick({crews, aiPlayerIds:['ai_orcs_1', 'ai_orcs_2', 'ai_orcs_3'], founders:new Set(), gemsOf:() => 0, now:0});
  assert.deepEqual(r.crews[0].members, ['ai_orcs_1', 'ai_orcs_2', 'ai_orcs_3']);
  assert.deepEqual(crews[0].members, ['ai_orcs_1']); // input untouched
});

test('AI crews respect the cap and return the same array when nothing changes', () => {
  const full = [{id:'c', faction:'orcs', members:Array.from({length:AI_CREW_CAP}, (_, i) => `ai_orcs_${i}`)}];
  const r = aiCrewTick({crews:full, aiPlayerIds:['ai_orcs_99'], founders:new Set(), gemsOf:() => 0, now:0});
  assert.equal(r.crews, full);
});

// ── Reinforcements (split 7) ──
import {returnToBarracks, reinforcementSourceKey, reinforcementAborted, stepReinforcement, mergeReinforcement, reinforcementRoom, branchFromKey, commandUsed} from '../shared/utils/reinforcements.js';

test('returning reinforcements respect barracks space', () => {
  assert.deepEqual(returnToBarracks({a:90}, 'a', 50, 100), {a:100});
  assert.deepEqual(returnToBarracks({a:1}, null, 50, 100), {a:1});
});

test('reinforcement source, abort and stepping', () => {
  assert.equal(reinforcementSourceKey({troopSlots:[{branch:{faction:'pirates', branch:'gunners'}}]}), 'pirates:gunners:0');
  const rm = {path:['h', 'm', 'd'], step:0, stepMs:100, lastStepTime:0};
  assert.equal(reinforcementAborted(rm, null, null, 'h'), true);
  assert.equal(reinforcementAborted(rm, {troops:5}, {owner:'player'}, 'h'), false);
  assert.equal(reinforcementAborted(rm, {troops:5}, {owner:'ai'}, 'h'), true);
  assert.equal(reinforcementAborted({...rm, returning:true}, null, null, 'h'), false);
  assert.equal(stepReinforcement(rm, 50).state, 'wait');
  assert.equal(stepReinforcement(rm, 100).rm.step, 1);
  assert.equal(stepReinforcement({...rm, step:2}, 100).state, 'arrived');
});

const sw = {faction:'pirates', branch:'swashbucklers', tier:0}, gn = {faction:'pirates', branch:'gunners', tier:0}, bs = {faction:'pirates', branch:'sea_beasts', tier:0};
const K = b => `${b.faction}:${b.branch}:${b.tier}`;

test('arriving troops join their own slot, capped at their real command size', () => {
  // cap 5: 300 small (3.0) + 50 medium (1.0) used -> 1.0 left -> 50 more medium
  const cmd = {troopSlots:[{branch:sw, troops:300}, {branch:gn, troops:50}]};
  const r = mergeReinforcement(cmd, K(gn), 80, 5);
  assert.deepEqual(r.cmd.troopSlots, [{branch:sw, troops:300}, {branch:gn, troops:100}]);
  assert.equal(r.cmd.troops, 400); assert.equal(r.overflow, 30);
});

test('arriving troops of a new type take a free slot; no free slot means all overflow', () => {
  const r = mergeReinforcement({troopSlots:[{branch:sw, troops:100}]}, K(bs), 4, 5);
  assert.deepEqual(r.cmd.troopSlots[1], {branch:bs, troops:4}); assert.equal(r.overflow, 0);
  const full = {troopSlots:[{branch:sw, troops:1}, {branch:gn, troops:1}, {branch:{...bs, tier:1}, troops:1}]};
  assert.deepEqual(mergeReinforcement(full, K(bs), 4, 5), {cmd:full, overflow:4});
});

test('send limit uses real size, troops en route and that type in barracks', () => {
  const cmd = {troopSlots:[{branch:gn, troops:100}]}; // 2.0 of 5 used -> room for 150 medium
  assert.deepEqual(reinforcementRoom({cmd, commandCap:5, pool:{[K(gn)]:1000}}), {srcKey:K(gn), room:150, available:1000, maxAdd:150});
  assert.equal(reinforcementRoom({cmd, commandCap:5, pool:{[K(gn)]:1000}, inTransit:100}).maxAdd, 50);
  assert.equal(reinforcementRoom({cmd, commandCap:5, pool:{[K(sw)]:1000}}).maxAdd, 0);
  assert.equal(branchFromKey('pirates:gunners:2').tier, 2);
  assert.equal(commandUsed(cmd), 2);
});
