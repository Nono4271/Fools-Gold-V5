import test from 'node:test';
import assert from 'node:assert/strict';
import { isDoubleTap, DOUBLE_TAP_MAX_MS, DOUBLE_TAP_MIN_MS } from '../shared/utils/doubleTap.js';

test('second tap on the same tile within the window is a double tap', () => {
  assert.equal(isDoubleTap({ k: '5,5', t: 1000 }, '5,5', 1000 + 200), true);
  assert.equal(isDoubleTap({ k: '5,5', t: 1000 }, '5,5', 1000 + DOUBLE_TAP_MAX_MS), true);
});

test('slow taps, different tiles and no previous tap are not double taps', () => {
  assert.equal(isDoubleTap({ k: '5,5', t: 1000 }, '5,5', 1000 + DOUBLE_TAP_MAX_MS + 1), false);
  assert.equal(isDoubleTap({ k: '5,5', t: 1000 }, '6,5', 1100), false);
  assert.equal(isDoubleTap({ k: null, t: 0 }, '5,5', 100), false);
  assert.equal(isDoubleTap(null, '5,5', 100), false);
});

test('the same physical tap reported twice a few ms apart is not a double tap', () => {
  assert.equal(isDoubleTap({ k: '5,5', t: 1000 }, '5,5', 1000 + DOUBLE_TAP_MIN_MS - 1), false);
  assert.equal(isDoubleTap({ k: '5,5', t: 1000 }, '5,5', 1000), false);
});
