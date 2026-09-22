import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canStartWellBuild, createWell, wellSlotsAvailable, canStationAtWell, isStructureBuilt, completeStructureBuild,
  canStartOutpostBuild, createOutpost, canSetOutpostUnits, setOutpostUnits, crewStructureTileKeys,
  neutralTrainingSources, troopPoolKeyForUnit, dayKey, outpostCommandsLeft,
} from '../shared/utils/crewStructures.js';
import { WELL_COST, OUTPOST_COST, OUTPOST_DAILY_COMMAND_LIMIT } from '../shared/constants/crew.js';
import { CMD_SIZE } from '../shared/constants/buildings.js';
import { NEUTRAL_TROOPS } from '../shared/constants/neutralTroops.js';
import { ANCIENT_TROOPS } from '../shared/constants/ancientTroops.js';
import { gatherTick, spawnDefTile, sweepTroopLosses, TICK_MS } from '../shared/utils/tactics.js';
import { TILE_RATE_BY_PL } from '../shared/utils/resourceIncome.js';
import { trainingQuote } from '../shared/utils/training.js';
import { armyEconomyReducer, initialArmyEconomy } from '../shared/utils/armyEconomy.js';
import { resolveTroopBranch, resolveTroopTier, getTierSkills } from '../shared/constants/troops.js';
import { simBattle } from '../shared/utils/battle.js';
import { generateSpawnCommander } from '../src/utils/spawnUtils.js';

const RICH = { wood: 1e9, stone: 1e9, gas: 1e9, food: 1e9 };
const TILE = { powerLevel: 10, terrain: 'grass' };
const crew = (over = {}) => ({ id: 'c1', founder: 'me', officers: ['off'], members: ['me', 'off', 'mem'], level: 50, wells: [], outpost: null, fortresses: [], ...over });
const NOW = 1_700_000_000_000;

// ── Well ──────────────────────────────────────────────────────────────────
test('Well: founder-only, level-gated, p10+ unclaimed tile, affordable', () => {
  const none = new Set();
  assert.equal(canStartWellBuild(crew(), 'me', TILE, 'k', RICH, none).ok, true);
  assert.equal(canStartWellBuild(crew(), 'off', TILE, 'k', RICH, none).ok, false, 'officers cannot');
  assert.equal(canStartWellBuild(crew({ level: 30 }), 'me', TILE, 'k', RICH, none).ok, false, 'needs level 31');
  assert.equal(canStartWellBuild(crew(), 'me', { powerLevel: 9 }, 'k', RICH, none).ok, false);
  assert.equal(canStartWellBuild(crew(), 'me', { ...TILE, owner: 'player' }, 'k', RICH, none).ok, false);
  assert.equal(canStartWellBuild(crew(), 'me', { ...TILE, isCamp: true }, 'k', RICH, none).ok, false);
  assert.equal(canStartWellBuild(crew(), 'me', TILE, 'k', RICH, new Set(['k'])).ok, false, 'occupied');
  assert.equal(canStartWellBuild(crew(), 'me', TILE, 'k', { ...WELL_COST, gas: WELL_COST.gas - 1 }, none).ok, false);
});

test('Well slots: 1 at level 31, 2 at level 40', () => {
  const one = createWell({ id: 'w1', crewId: 'c1', tileKey: 'a', now: NOW });
  assert.equal(wellSlotsAvailable(crew({ level: 31 })), 1);
  assert.equal(wellSlotsAvailable(crew({ level: 31, wells: [one] })), 0);
  assert.equal(canStartWellBuild(crew({ level: 39, wells: [one] }), 'me', TILE, 'k', RICH, new Set()).ok, false);
  assert.equal(canStartWellBuild(crew({ level: 40, wells: [one] }), 'me', TILE, 'k', RICH, new Set()).ok, true);
});

test('Well: build timer, and any idle crew member commander can station (no range check)', () => {
  const w = createWell({ id: 'w1', crewId: 'c1', tileKey: 'a', now: NOW });
  assert.equal(isStructureBuilt(w, NOW), false);
  const built = completeStructureBuild(w);
  assert.equal(isStructureBuilt(built, NOW), true);
  const idle = { uid: 'x', tk: 'far,away' };
  assert.equal(canStationAtWell(crew(), w, 'mem', idle, NOW).ok, false, 'not built yet');
  assert.equal(canStationAtWell(crew(), built, 'mem', idle, NOW).ok, true);
  assert.equal(canStationAtWell(crew(), built, 'stranger', idle, NOW).ok, false);
  assert.equal(canStationAtWell(crew(), built, 'mem', { ...idle, march: {} }, NOW).ok, false);
  assert.equal(canStationAtWell(crew(), built, 'mem', { ...idle, gathering: true }, NOW).ok, false);
});

test('Well gather: all 4 resources at the p11 rate (same 4x-per-tick formula as normal gathering)', () => {
  const cmd = { gathering: true, gatherTileKey: 'a', gatherStartMs: NOW, gatherTicks: 3, gatherTicksDone: 0 };
  const r = gatherTick(cmd, { powerLevel: 10 }, NOW + TICK_MS * 2 + 1, 0, true);
  const each = TILE_RATE_BY_PL[11] * 4 * 2;
  assert.deepEqual(r.rssAll, { stone: each, wood: each, gas: each, food: each });
  assert.equal(r.eggs, 2);
  // Normal tile unchanged: single resource at its own power level.
  const n = gatherTick(cmd, { powerLevel: 10, rss: 'wood' }, NOW + TICK_MS * 2 + 1, 0, false);
  assert.equal(n.rssAll, undefined);
  assert.equal(n.amount, TILE_RATE_BY_PL[10] * 4 * 2);
});

// ── Contract Outpost ──────────────────────────────────────────────────────
test('Outpost: founder-only, level 35+, one per crew', () => {
  const none = new Set();
  assert.equal(canStartOutpostBuild(crew(), 'me', TILE, 'k', RICH, none).ok, true);
  assert.equal(canStartOutpostBuild(crew(), 'off', TILE, 'k', RICH, none).ok, false);
  assert.equal(canStartOutpostBuild(crew({ level: 34 }), 'me', TILE, 'k', RICH, none).ok, false);
  const op = createOutpost({ id: 'o', crewId: 'c1', tileKey: 'b', now: NOW });
  assert.equal(canStartOutpostBuild(crew({ outpost: op }), 'me', TILE, 'k', RICH, none).ok, false);
  assert.equal(canStartOutpostBuild(crew(), 'me', TILE, 'k', { ...OUTPOST_COST, wood: 0 }, none).ok, false);
});

test('Outpost units: founder picks 1 (2 at level 50), neutrals only — Ancients excluded', () => {
  const op = createOutpost({ id: 'o', crewId: 'c1', tileKey: 'b', now: NOW });
  const [a, b, c] = NEUTRAL_TROOPS.map(u => u.key);
  assert.equal(canSetOutpostUnits(crew({ level: 35, outpost: op }), 'me', [a]).ok, true);
  assert.equal(canSetOutpostUnits(crew({ level: 35, outpost: op }), 'me', [a, b]).ok, false);
  assert.equal(canSetOutpostUnits(crew({ level: 50, outpost: op }), 'me', [a, b]).ok, true);
  assert.equal(canSetOutpostUnits(crew({ level: 50, outpost: op }), 'me', [a, b, c]).ok, false);
  assert.equal(canSetOutpostUnits(crew({ level: 50, outpost: op }), 'me', [a, a]).ok, false);
  assert.equal(canSetOutpostUnits(crew({ level: 50, outpost: op }), 'me', [ANCIENT_TROOPS[0].key]).ok, false);
  assert.equal(canSetOutpostUnits(crew({ level: 50, outpost: op }), 'off', [a]).ok, false);
  assert.deepEqual(setOutpostUnits(crew({ outpost: op }), [a]).outpost.units, [a]);
});

test('crewStructureTileKeys covers fortresses, wells and outposts across crews', () => {
  const keys = crewStructureTileKeys([
    crew({ fortresses: [{ tileKey: 'f' }], wells: [{ tileKey: 'w' }], outpost: { tileKey: 'o' } }),
    crew({ id: 'c2', wells: [{ tileKey: 'w2' }] }),
  ]);
  assert.deepEqual([...keys].sort(), ['f', 'o', 'w', 'w2']);
});

test('neutralTrainingSources: owned camps (neutral or Ancient) + built Outpost picks', () => {
  const n0 = NEUTRAL_TROOPS[0].key, n1 = NEUTRAL_TROOPS[1].key, anc = ANCIENT_TROOPS[0].key;
  const tiles = {
    a: { isCamp: true, owner: 'player', campUnitKey: n0 },
    b: { isCamp: true, owner: 'player', campUnitKey: anc },
    c: { isCamp: true, owner: 'ai', campUnitKey: n1 },
  };
  const built = { ...createOutpost({ id: 'o', crewId: 'c1', tileKey: 'z', now: NOW - 1e9 }), units: [n0, n1] };
  const src = neutralTrainingSources({ tiles, ownedKeys: ['a', 'b', 'c'], crew: crew({ outpost: built }), now: NOW });
  assert.deepEqual(src[troopPoolKeyForUnit(n0)], { camp: true, outpost: true, unitKey: n0 });
  assert.deepEqual(src[troopPoolKeyForUnit(n1)], { camp: false, outpost: true, unitKey: n1 });
  assert.equal(src[troopPoolKeyForUnit(anc)].camp, true);
  assert.equal(troopPoolKeyForUnit(anc).startsWith('ancients:'), true);
  const unbuilt = createOutpost({ id: 'o', crewId: 'c1', tileKey: 'z', now: NOW });
  assert.equal(neutralTrainingSources({ tiles: {}, ownedKeys: [], crew: crew({ outpost: { ...unbuilt, units: [n1] } }), now: NOW })[troopPoolKeyForUnit(n1)], undefined);
});

// ── Neutral units through the normal troop pipeline ───────────────────────
test('neutral + Ancient branch keys resolve and quote like normal troops', () => {
  for (const u of NEUTRAL_TROOPS) {
    const ref = { faction: 'neutrals', branch: u.key, tier: 0 };
    assert.ok(resolveTroopBranch(ref), u.key);
    assert.equal(resolveTroopTier(ref).hp, u.stats.hp);
    assert.deepEqual(getTierSkills(resolveTroopBranch(ref), 0), [u.skills.a]);
    const q = trainingQuote(`neutrals:${u.key}:0`, CMD_SIZE[u.size] * 2);
    assert.ok(q && q.commands === 2, `${u.key} quote`);
  }
  // Neutral cost scales by the unit's own T1/T2/T3 bracket.
  const lo = NEUTRAL_TROOPS.find(u => u.tier === 0), hi = NEUTRAL_TROOPS.find(u => u.tier === 2 && u.size === lo.size);
  if (hi) {
    const qLo = trainingQuote(`neutrals:${lo.key}:0`, CMD_SIZE[lo.size]);
    const qHi = trainingQuote(`neutrals:${hi.key}:0`, CMD_SIZE[hi.size]);
    assert.ok(qHi.perCommandCost.food > qLo.perCommandCost.food, 'T3 neutral costs more than T1');
  }
  const anc = ANCIENT_TROOPS[0];
  assert.ok(trainingQuote(`ancients:${anc.key}:0`, CMD_SIZE[anc.size]), 'Ancient quote (capstone pricing)');
});

test('armyEconomy train: Outpost daily command cap, resets on a new day', () => {
  const key = `neutrals:${NEUTRAL_TROOPS.find(u => u.size === 'large').key}:0`;
  const base = { ...initialArmyEconomy(), rss: RICH };
  const bld = { training: 30, barracks: 30 };
  const unlocked = { [key.split(':').slice(0, 2).join(':')]: 0 };
  const act = (state, amount, day, id) => armyEconomyReducer(state, {
    type: 'train', branchKey: key, amount, buildings: bld, unlocked, now: NOW, id,
    dailyLimit: { day, limit: OUTPOST_DAILY_COMMAND_LIMIT },
  });
  const C = CMD_SIZE.large; // amounts are troops; the cap counts commands
  let s = act(base, 60 * C, 'D1', 'a');
  assert.equal(s.contractDaily.commands, 60);
  const blocked = act(s, 41 * C, 'D1', 'b');
  assert.equal(blocked, s, 'over the 100/day cap is rejected');
  s = act(s, 40 * C, 'D1', 'c');
  assert.equal(s.contractDaily.commands, 100);
  const nextDay = act({ ...s, trainingQueues: [] }, 50 * C, 'D2', 'd');
  assert.deepEqual(nextDay.contractDaily, { day: 'D2', commands: 50 });
  assert.equal(outpostCommandsLeft(nextDay.contractDaily, NOW), OUTPOST_DAILY_COMMAND_LIMIT, 'different calendar day → full');
  assert.equal(outpostCommandsLeft({ day: dayKey(NOW), commands: 30 }, NOW), 70);
});

// ── Sweep (Spawn) fix ─────────────────────────────────────────────────────
test('Sweep: spawnDefTile gives simBattle a real defender and the fight resolves', () => {
  const spawnCmd = generateSpawnCommander(6, 'pirates', 1, () => 0.5);
  const defTile = spawnDefTile(spawnCmd, { terrain: 'forest', powerLevel: 3 });
  assert.equal(defTile.isSpawn, true);
  assert.equal(defTile.defCmd.troopSlots.length, 3);
  assert.ok(defTile.defCmd.troopSlots.every(sl => sl.branch && sl.troops > 0));
  const atk = {
    n: 'Tester', lvl: 20, atk: 200, foc: 80, spd: 80, cls: 'attacker',
    troopSlots: [{ branch: { faction: 'pirates', branch: 'swashbucklers', tier: 2 }, troops: 400 }],
  };
  const res = simBattle(atk, 400, defTile, 0);
  assert.equal(typeof res.won, 'boolean');
  assert.ok(res.report && Array.isArray(res.report.rounds));
  const { lost, wounded } = sweepTroopLosses(res, 400);
  assert.ok(lost >= 0 && lost <= 400);
  assert.equal(wounded, Math.floor(lost * 0.3));
});

test('Crew Spawn Sweeper bonus boosts Spawn fights only (deterministic RNG)', () => {
  const realRandom = Math.random;
  Math.random = () => 0.5;
  try {
    const spawnTile = spawnDefTile(generateSpawnCommander(40, 'pirates', 3, () => 0.5));
    const playerTile = { terrain: 'grass', owner: 'player', powerLevel: 5, defCmd: { ...spawnTile.defCmd, isSpawn: false } };
    const atk = {
      n: 'T', lvl: 30, atk: 300, foc: 100, spd: 80, cls: 'attacker',
      troopSlots: [{ branch: { faction: 'pirates', branch: 'swashbucklers', tier: 2 }, troops: 300 }],
    };
    const dealt = r => r.report.rounds.flatMap(x => x.actions).filter(a => a.isPlayer && a.dmg > 0).reduce((n, a) => n + a.dmg, 0);
    const boosted = { ...atk, crewSpawnDmgMult: 0.10 };
    assert.ok(dealt(simBattle(boosted, 300, spawnTile, 0)) > dealt(simBattle(atk, 300, spawnTile, 0)), 'more damage vs Spawn');
    assert.equal(dealt(simBattle(boosted, 300, playerTile, 0)), dealt(simBattle(atk, 300, playerTile, 0)), 'no effect vs a player');
  } finally { Math.random = realRandom; }
});
