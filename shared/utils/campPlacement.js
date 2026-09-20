// ─────────────────────────────────────────────────────────────────────────────
//  campPlacement.js — pure grid-search for camp footprints
//
//  Extracted as its own pure, dependency-free module (no typed-array/worker
//  coupling) specifically so it can be unit-tested in isolation. The actual
//  live map generator (`src/workers/mapGen.worker.js`) calls
//  `findCampSlot`/`footprintCells` with its REAL occupied-tile set and
//  bounds — this file has no idea about terrain, keeps, borders, etc., it
//  only knows "which (c,r) cells are already taken" and "find me a free
//  w×h rectangle near (cx,cy)".
//
//  Search strategy: expanding square rings outward from the anchor point
//  (same idea as the existing keep-footprint/spawn placement code, just
//  generalized to non-1x1 and non-square footprints), checking every
//  candidate top-left corner in each ring before moving further out. Stops
//  and returns null once `maxRadius` is exceeded (caller decides what to do
//  with an unplaceable camp — e.g. widen the radius, skip it, or fall back
//  to a smaller footprint).
// ─────────────────────────────────────────────────────────────────────────────

// All (c,r) cells covered by a w×h footprint whose top-left corner is (c,r).
export function footprintCells(c, r, w, h) {
  const cells = [];
  for (let dc = 0; dc < w; dc++) {
    for (let dr = 0; dr < h; dr++) {
      cells.push([c + dc, r + dr]);
    }
  }
  return cells;
}

function cellKey(c, r) {
  return `${c},${r}`;
}

// True if every cell of a w×h footprint at (c,r) is in-bounds and free.
// `isBlocked(c, r)` is an optional extra rejection check beyond the
// `occupied` Set — e.g. the live map generator passes one that checks
// terrain (water/mountain/road) and structure flags (HQ/gate/border) that
// aren't practical to pre-load into a Set for a multi-million-tile map.
export function footprintFits(occupied, c, r, w, h, cols, rows, isBlocked) {
  if (c < 0 || r < 0 || c + w > cols || r + h > rows) return false;
  for (const [fc, fr] of footprintCells(c, r, w, h)) {
    if (occupied.has(cellKey(fc, fr))) return false;
    if (isBlocked && isBlocked(fc, fr)) return false;
  }
  return true;
}

// Find a free w×h slot near (cx,cy), searching expanding rings outward.
// Returns { c, r } (top-left corner) or null if nothing fits within
// maxRadius. Deterministic: for a fixed occupied set/isBlocked and inputs,
// always returns the same slot (rings are scanned in a fixed row-major
// order). `isBlocked(c, r)` — see footprintFits above.
export function findCampSlot({ occupied, cx, cy, w, h, cols, rows, maxRadius = 60, isBlocked }) {
  // radius 0: try the anchor cell itself first
  if (footprintFits(occupied, cx, cy, w, h, cols, rows, isBlocked)) return { c: cx, r: cy };

  for (let radius = 1; radius <= maxRadius; radius++) {
    const c0 = cx - radius, c1 = cx + radius;
    const r0 = cy - radius, r1 = cy + radius;
    // Scan the ring's perimeter: top row, bottom row, then left/right columns
    // (excluding corners already covered by top/bottom) — fixed order keeps
    // results deterministic and biases toward the anchor's cardinal sides.
    const candidates = [];
    for (let c = c0; c <= c1; c++) candidates.push([c, r0], [c, r1]);
    for (let r = r0 + 1; r < r1; r++) candidates.push([c0, r], [c1, r]);
    for (const [c, r] of candidates) {
      if (footprintFits(occupied, c, r, w, h, cols, rows, isBlocked)) return { c, r };
    }
  }
  return null;
}

// Mark a footprint's cells as occupied in-place (caller's Set), so
// subsequent findCampSlot calls in the same placement pass don't overlap.
export function occupyFootprint(occupied, c, r, w, h) {
  for (const [fc, fr] of footprintCells(c, r, w, h)) occupied.add(cellKey(fc, fr));
}
