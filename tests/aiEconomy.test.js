import test from 'node:test';
import assert from 'node:assert/strict';
import { aiTrainingTick, AI_TRAIN_COMMAND, aiTrainingSlots } from '../shared/utils/aiEconomy.js';
import { barracksCapacity } from '../shared/constants/buildings.js';

const RICH = { stone: 0, wood: 1e9, gas: 1e9, food: 1e9 };
const MIN = 60_000;
const tick = (s, over = {}) => aiTrainingTick({ trainingLvl: 0, barracksLvl: 0, commanderCount: 1, ...s, ...over });

test('a training command costs the player tier-0 small price and lands only after its time', () => {
  const t0 = 1_000_000;
  const a = tick({ pool: 0, rss: RICH, queue: [], now: t0 });
  assert.equal(a.started, 1);
  assert.equal(a.pool, 0, 'nothing is delivered on the tick that starts training');
  assert.equal(RICH.wood - a.rss.wood, AI_TRAIN_COMMAND.cost.wood);
  assert.equal(RICH.gas - a.rss.gas, AI_TRAIN_COMMAND.cost.gas);
  assert.equal(RICH.food - a.rss.food, AI_TRAIN_COMMAND.cost.food);
  // Just before it finishes: still nothing. After: exactly one command (100 troops).
  const early = tick({ pool: a.pool, rss: a.rss, queue: a.queue, now: t0 + AI_TRAIN_COMMAND.ms - 1 });
  assert.equal(early.delivered, 0);
  const done = tick({ pool: early.pool, rss: early.rss, queue: early.queue, now: t0 + AI_TRAIN_COMMAND.ms });
  assert.equal(done.delivered, AI_TRAIN_COMMAND.size);
  assert.equal(done.pool, AI_TRAIN_COMMAND.size);
});

test('the barracks can no longer be refilled every tick (regression: +500 troops per 5s)', () => {
  let s = { pool: 0, rss: RICH, queue: [] };
  let now = 0;
  const ticks = (60 * 60) / 5; // one hour of 5s economy ticks
  for (let i = 0; i < ticks; i++) {
    const r = tick({ ...s, now });
    s = { pool: r.pool, rss: r.rss, queue: r.queue };
    now += 5000;
  }
  // 1 commander, training lvl 0 => 1 queue: at most 5 commands (500 troops) in an hour.
  assert.ok(s.pool <= 500, `pool after 1h was ${s.pool}`);
  assert.ok(s.pool > 0, 'but it does train');
});

test('never queues past free slots, the barracks cap, or what the faction can afford', () => {
  // Slots: 3 commanders x 1 queue (training lvl 0)
  assert.equal(aiTrainingSlots(0, 3), 3);
  const slots = tick({ pool: 0, rss: RICH, queue: [], now: 0, commanderCount: 3 });
  assert.equal(slots.started, 3);
  // Cap: pool + in-training + new command must fit (lvl-0 barracks = 2000)
  const cap = barracksCapacity(0);
  const full = tick({ pool: cap - 100, rss: RICH, queue: [], now: 0, commanderCount: 10 });
  assert.equal(full.started, 1, 'only one more command fits');
  const atCap = tick({ pool: cap, rss: RICH, queue: [], now: 0, commanderCount: 10 });
  assert.equal(atCap.started, 0);
  // Money: 1 command's worth of food short -> nothing starts, nothing is charged
  const poor = { stone: 0, wood: 1e9, gas: 1e9, food: AI_TRAIN_COMMAND.cost.food - 1 };
  const broke = tick({ pool: 0, rss: poor, queue: [], now: 0, commanderCount: 10 });
  assert.equal(broke.started, 0);
  assert.deepEqual(broke.rss, poor);
});

test('more training levels and more commanders mean more parallel queues, like the player', () => {
  assert.equal(aiTrainingSlots(0, 1), 1);
  assert.equal(aiTrainingSlots(5, 1), 2);   // trainingQueueCount: 2 queues at lvl 5
  assert.equal(aiTrainingSlots(16, 1), 4);  // 4 queues at lvl 16
  assert.equal(aiTrainingSlots(5, 10), 20);
  assert.equal(aiTrainingSlots(0, 0), 1);   // never zero
});

test('a late tick (throttled/backgrounded worker) delivers everything that finished meanwhile', () => {
  const t0 = 5_000_000;
  const a = tick({ pool: 0, rss: RICH, queue: [], now: t0, commanderCount: 4 }); // 4 queued
  assert.equal(a.queue.length, 4);
  const late = tick({ pool: a.pool, rss: a.rss, queue: a.queue, now: t0 + 60 * MIN, commanderCount: 4 });
  assert.equal(late.delivered, 4 * AI_TRAIN_COMMAND.size);
  assert.equal(late.pool, 4 * AI_TRAIN_COMMAND.size);
});

// ── Troop hand-out cap ───────────────────────────────────────────────────────
import { aiTroopCap, AI_TROOP_COMMAND_COST, rssSpent, applyRssSpent } from '../shared/utils/aiEconomy.js';
import { cmdCommand } from '../shared/constants/buildings.js';
import { COMMAND_COST } from '../shared/constants/troops.js';

test('AI troop hand-out cap uses the player rule: (level + command-centre bonus) points at 0.01 per small troop', () => {
  assert.equal(AI_TROOP_COMMAND_COST, COMMAND_COST.small, 'pinned to the real small-troop command cost');
  assert.equal(aiTroopCap(5, 0), 500);      // was 1,800
  assert.equal(aiTroopCap(1, 0), 100);
  assert.equal(aiTroopCap(50, 0), 5000);
  // A faction's command centre raises the cap exactly like the player's
  for (const [lvl, cc] of [[5, 3], [20, 10], [30, 5]]) {
    assert.equal(aiTroopCap(lvl, cc), Math.round(cmdCommand(lvl, cc, 0) * 100));
  }
  assert.ok(aiTroopCap(5, 10) > aiTroopCap(5, 0));
  assert.equal(aiTroopCap(undefined, undefined), 100); // level defaults to 1
});

test('a lvl-5 AI commander can no longer swallow 1,800 troops from the pool in one go', () => {
  assert.ok(aiTroopCap(5, 0) < 1800);
  // 2,000-troop starting pool now spreads over four lvl-5 commanders
  assert.equal(Math.floor(2000 / aiTroopCap(5, 0)), 4);
});

// ── Resource spending as a delta ─────────────────────────────────────────────
test('rssSpent reports only what was spent and applyRssSpent subtracts it from the LIVE totals', () => {
  const snapshot = { stone: 5000, wood: 5000, gas: 5000, food: 5000 };
  const afterSpend = { stone: 5000, wood: 4100, gas: 4300, food: 3600 };
  const spent = rssSpent(snapshot, afterSpend);
  assert.deepEqual(spent, { wood: 900, gas: 700, food: 1400 });
  // Income credited between the snapshot and now is kept
  const live = { stone: 5010, wood: 5020, gas: 5030, food: 5040 };
  assert.deepEqual(applyRssSpent(live, spent), { stone: 5010, wood: 4120, gas: 4330, food: 3640 });
  // Never negative
  assert.equal(applyRssSpent({ wood: 100 }, { wood: 900 }).wood, 0);
  assert.deepEqual(rssSpent(snapshot, snapshot), {});
});
