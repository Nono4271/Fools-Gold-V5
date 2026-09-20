import test from 'node:test';
import assert from 'node:assert/strict';
import { FORT_REMOVAL_MS, withFortRemoval, withoutFortRemoval, dueFortRemovals } from '../shared/utils/fortRemoval.js';

const fort = { id: 'f1', tileKey: '5,5', level: 1 };

test('removal timers are 30 min demolish / 45 min abandon, stored on the fort as an absolute deadline', () => {
  assert.equal(FORT_REMOVAL_MS.demolish, 30 * 60_000);
  assert.equal(FORT_REMOVAL_MS.abandon, 45 * 60_000);
  const f = withFortRemoval(fort, 'demolish', 1000);
  assert.deepEqual(f.removal, { mode: 'demolish', endsAt: 1000 + 30 * 60_000 });
  assert.equal(withFortRemoval(fort, 'abandon', 0).removal.endsAt, 45 * 60_000);
  assert.equal(fort.removal, undefined); // input not mutated
});

test('starting a removal cannot reset a running one or accept an unknown mode', () => {
  const running = withFortRemoval(fort, 'demolish', 1000);
  assert.equal(withFortRemoval(running, 'abandon', 999999), running);
  assert.equal(withFortRemoval(fort, 'explode', 1000), fort);
  assert.equal(withFortRemoval(null, 'demolish', 1000), null);
});

test('cancelling clears the timer and leaves other fort fields alone', () => {
  const f = withFortRemoval({ ...fort, siege: 50 }, 'abandon', 0);
  const c = withoutFortRemoval(f);
  assert.equal('removal' in c, false);
  assert.equal(c.siege, 50);
  assert.equal(withoutFortRemoval(fort), fort); // nothing running -> same object
});

test('due removals use real time, so a long background pause fires them on return', () => {
  const a = withFortRemoval({ id: 'a' }, 'demolish', 0);
  const b = withFortRemoval({ id: 'b' }, 'abandon', 0);
  const idle = { id: 'c' };
  const forts = [a, b, idle];
  assert.deepEqual(dueFortRemovals(forts, 29 * 60_000), []);
  assert.deepEqual(dueFortRemovals(forts, 30 * 60_000), [{ fortId: 'a', mode: 'demolish' }]);
  // Tab backgrounded for 2 hours: both are owed immediately.
  assert.deepEqual(dueFortRemovals(forts, 120 * 60_000), [
    { fortId: 'a', mode: 'demolish' }, { fortId: 'b', mode: 'abandon' },
  ]);
  assert.deepEqual(dueFortRemovals(null, 0), []);
});
