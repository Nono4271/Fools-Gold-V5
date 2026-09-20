// Double-tap detection for map tiles. A second tap on the same tile counts when
// it lands within `maxMs` of the first but not within `minMs` (the renderer can
// report one physical tap through more than one hit target a few ms apart).
export const DOUBLE_TAP_MAX_MS = 400;
export const DOUBLE_TAP_MIN_MS = 60;

export function isDoubleTap(last, key, now, { maxMs = DOUBLE_TAP_MAX_MS, minMs = DOUBLE_TAP_MIN_MS } = {}) {
  if (!last || last.k == null || last.k !== key) return false;
  const gap = now - last.t;
  return gap >= minMs && gap <= maxMs;
}
