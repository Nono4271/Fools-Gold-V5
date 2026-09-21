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
