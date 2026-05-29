// fortRange.worker.js
// Calculates which tiles are in range of player's HQ + forts.
// Runs off main thread to avoid jank during range checks.

const FORT_RANGE_RADIUS = 100;

// Chebyshev distance — works well for isometric grid
function inRange(ac, ar, bc, br, radius) {
  return Math.abs(ac - bc) <= radius && Math.abs(ar - br) <= radius;
}

// Returns Set of "c,r" keys within range of any anchor (HQ or fort)
function computeInRange(anchors) {
  const inRangeSet = new Set();
  for (const { c, r } of anchors) {
    const minC = c - FORT_RANGE_RADIUS;
    const maxC = c + FORT_RANGE_RADIUS;
    const minR = r - FORT_RANGE_RADIUS;
    const maxR = r + FORT_RANGE_RADIUS;
    for (let tc = minC; tc <= maxC; tc++) {
      for (let tr = minR; tr <= maxR; tr++) {
        if (inRange(c, r, tc, tr, FORT_RANGE_RADIUS)) {
          inRangeSet.add(`${tc},${tr}`);
        }
      }
    }
  }
  return inRangeSet;
}

self.onmessage = ({ data }) => {
  const { type, anchors, id } = data;
  if (type === "computeRange") {
    const inRangeSet = computeInRange(anchors);
    self.postMessage({ type: "rangeResult", inRange: [...inRangeSet], id });
  }
  // Single tile check — fast path for march validation
  if (type === "checkTile") {
    const { tc, tr, anchors: anch } = data;
    const ok = anch.some(({ c, r }) => inRange(c, r, tc, tr, FORT_RANGE_RADIUS));
    self.postMessage({ type: "checkResult", ok, tc, tr, id });
  }
};
