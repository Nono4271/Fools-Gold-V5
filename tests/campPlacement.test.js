import test from 'node:test';
import assert from 'node:assert/strict';
import {
  footprintCells,
  footprintFits,
  findCampSlot,
  occupyFootprint,
} from '../shared/utils/campPlacement.js';

test('footprintCells covers every cell of a w x h rectangle', () => {
  assert.deepEqual(footprintCells(5, 5, 1, 1), [[5, 5]]);
  assert.deepEqual(footprintCells(5, 5, 1, 2).sort(), [[5, 5], [5, 6]].sort());
  assert.deepEqual(new Set(footprintCells(5, 5, 2, 2).map(String)),
    new Set([[5,5],[6,5],[5,6],[6,6]].map(String)));
});

test('footprintFits rejects out-of-bounds and occupied cells', () => {
  const occupied = new Set(['3,3']);
  assert.equal(footprintFits(occupied, 0, 0, 2, 2, 10, 10), true);
  assert.equal(footprintFits(occupied, -1, 0, 2, 2, 10, 10), false); // out of bounds
  assert.equal(footprintFits(occupied, 9, 9, 2, 2, 10, 10), false); // runs off the edge
  assert.equal(footprintFits(occupied, 2, 2, 2, 2, 10, 10), false); // overlaps 3,3
  assert.equal(footprintFits(occupied, 4, 4, 2, 2, 10, 10), true);
});

test('findCampSlot returns the anchor itself when free', () => {
  const occupied = new Set();
  const slot = findCampSlot({ occupied, cx: 50, cy: 50, w: 2, h: 2, cols: 200, rows: 200 });
  assert.deepEqual(slot, { c: 50, r: 50 });
});

test('findCampSlot searches outward when the anchor is occupied', () => {
  const occupied = new Set();
  occupyFootprint(occupied, 50, 50, 2, 2); // block the anchor's exact footprint
  const slot = findCampSlot({ occupied, cx: 50, cy: 50, w: 2, h: 2, cols: 200, rows: 200 });
  assert.ok(slot);
  assert.notDeepEqual(slot, { c: 50, r: 50 });
  assert.equal(footprintFits(occupied, slot.c, slot.r, 2, 2, 200, 200), true);
});

test('findCampSlot returns null when nothing fits within maxRadius', () => {
  // Tiny grid, fully occupied except a corner outside the search radius.
  const occupied = new Set();
  for (let c = 0; c < 5; c++) for (let r = 0; r < 5; r++) occupied.add(`${c},${r}`);
  const slot = findCampSlot({ occupied, cx: 2, cy: 2, w: 1, h: 1, cols: 5, rows: 5, maxRadius: 2 });
  assert.equal(slot, null);
});

test('occupyFootprint prevents a second camp from overlapping the first', () => {
  const occupied = new Set();
  const slot1 = findCampSlot({ occupied, cx: 10, cy: 10, w: 2, h: 2, cols: 100, rows: 100 });
  occupyFootprint(occupied, slot1.c, slot1.r, 2, 2);
  const slot2 = findCampSlot({ occupied, cx: 10, cy: 10, w: 2, h: 2, cols: 100, rows: 100 });
  assert.ok(slot2);
  const cells1 = new Set(footprintCells(slot1.c, slot1.r, 2, 2).map(String));
  const cells2 = footprintCells(slot2.c, slot2.r, 2, 2).map(String);
  for (const c of cells2) assert.ok(!cells1.has(c), 'second camp must not overlap the first');
});

test('footprintFits/findCampSlot reject cells an isBlocked callback flags, even when unoccupied', () => {
  const occupied = new Set();
  // Pretend (5,5)-(6,6) is water: isBlocked says yes even though occupied says no.
  const isWater = (c, r) => (c === 5 || c === 6) && (r === 5 || r === 6);
  assert.equal(footprintFits(occupied, 5, 5, 2, 2, 20, 20, isWater), false);
  assert.equal(footprintFits(occupied, 10, 10, 2, 2, 20, 20, isWater), true);

  const slot = findCampSlot({ occupied, cx: 5, cy: 5, w: 2, h: 2, cols: 20, rows: 20, isBlocked: isWater });
  assert.ok(slot);
  assert.notDeepEqual(slot, { c: 5, r: 5 });
  assert.equal(isWater(slot.c, slot.r), false);
});

test('placing many camps around the same anchor never overlaps', () => {
  const occupied = new Set();
  const placed = [];
  for (let i = 0; i < 30; i++) {
    const slot = findCampSlot({ occupied, cx: 100, cy: 100, w: 1, h: 2, cols: 400, rows: 400, maxRadius: 40 });
    assert.ok(slot, `camp ${i} should find a slot`);
    occupyFootprint(occupied, slot.c, slot.r, 1, 2);
    placed.push(slot);
  }
  // No two placed footprints share a cell.
  const seen = new Set();
  for (const { c, r } of placed) {
    for (const [fc, fr] of footprintCells(c, r, 1, 2)) {
      const key = `${fc},${fr}`;
      assert.ok(!seen.has(key), `cell ${key} placed twice`);
      seen.add(key);
    }
  }
});

// ── Spreading camps across a region (not clustered around the keep) ──────────
import { regionCandidates, spreadPoints } from '../shared/utils/campPlacement.js';

test('spreadPoints picks well-separated points and keeps away from the avoid point', () => {
  const cands = [];
  for (let r = 0; r < 100; r += 4) for (let c = 0; c < 100; c += 4) cands.push([c, r]);
  const pts = spreadPoints(cands, 16, [[50, 50]]);
  assert.equal(pts.length, 16);
  let minPair = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    minPair = Math.min(minPair, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  }
  assert.ok(minPair >= 20, `points at least 20 apart, got ${minPair}`);
  assert.ok(pts.every(([c, r]) => Math.hypot(c - 50, r - 50) >= 20), 'nobody hugs the avoid point');
  assert.deepEqual(spreadPoints(cands, 16, [[50, 50]]), pts); // deterministic
});

test('spreadPoints returns fewer points when there are not enough candidates', () => {
  assert.equal(spreadPoints([[1, 1], [9, 9]], 5).length, 2);
  assert.deepEqual(spreadPoints([], 3), []);
});

test('regionCandidates stays inside the region, off its borders and off blocked tiles', () => {
  // Region 1 = columns 0..99, region 2 = columns 100..199 on a 200x100 map.
  const regionAt = (c) => (c < 100 ? 1 : 2);
  const isBlocked = (c, r) => c >= 40 && c <= 60 && r >= 40 && r <= 60;
  const cands = regionCandidates({ regionIdx: 1, regionAt, isBlocked, cx: 50, cy: 50, radius: 100, step: 4, margin: 10, cols: 200, rows: 100 });
  assert.ok(cands.length > 0);
  for (const [c, r] of cands) {
    assert.ok(c < 90, `column ${c} is at least the margin away from the region border`);
    assert.ok(!isBlocked(c, r));
  }
});
