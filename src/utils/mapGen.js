// mapGen.js — generation logic moved to src/workers/mapGen.worker.js
// This file retains the helper exports still used by MapRenderer and other modules.

import { TW, TH } from "../../shared/constants/geometry.js";

export function tileRng(c, r) {
  let s = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) | 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return ((s >>> 16) & 0x7fff) / 0x7fff;
  };
}

export function diamondPos(rnd, marginA = 0.85) {
  const a = rnd() - 0.5, b = rnd() - 0.5;
  return { dx: (a + b) * (TW / 2) * marginA, dy: (a - b) * (TH / 2) * marginA };
}

// genMap is no longer called directly — Game.jsx uses the worker instead.
// Kept as a no-op export so any stray imports don't break.
export function genMap() {
  console.warn("genMap() called directly — use the mapGen worker instead");
  return {};
}
