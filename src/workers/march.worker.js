// ── March Animation Worker ────────────────────────────────────────────────────
// Computes smooth interpolated pixel positions for marching commanders each frame.
// Keeps lerp state internally so the main thread only needs to send tile-change
// events, not a full snapshot every frame.
//
// Message protocol (main → worker):
//   { type: 'transition', uid, fromX, fromY, toX, toY, startTime, stepMs }
//     — sent when a commander moves to a new tile
//   { type: 'remove', uid }
//     — sent when a commander stops marching
//   { type: 'removeAll' }
//     — reset (e.g. on game end)
//   { type: 'start' }  /  { type: 'stop' }
//     — start/stop the frame loop
//
// Message protocol (worker → main):
//   { type: 'frame', positions: [ { uid, px, py } ] }
//     — posted every ~16ms while any commander is marching
//     — positions are interpolated pixel coords (world space)

// Map uid → { fromX, fromY, toX, toY, startTime, stepMs }
const lerpState = new Map();
let intervalId = null;
const FRAME_MS = 16; // ~60fps

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function tick() {
  if (lerpState.size === 0) return;
  const now = Date.now();
  const positions = [];
  for (const [uid, s] of lerpState) {
    const t = Math.min(1, (now - s.startTime) / s.stepMs);
    const e = easeInOutCubic(t);
    positions.push({
      uid,
      px: s.fromX + (s.toX - s.fromX) * e,
      py: s.fromY + (s.toY - s.fromY) * e,
    });
  }
  self.postMessage({ type: 'frame', positions });
}

self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'transition':
      lerpState.set(data.uid, {
        fromX: data.fromX, fromY: data.fromY,
        toX:   data.toX,   toY:   data.toY,
        startTime: data.startTime,
        stepMs: data.stepMs,
      });
      break;
    case 'remove':
      lerpState.delete(data.uid);
      break;
    case 'removeAll':
      lerpState.clear();
      break;
    case 'start':
      if (!intervalId) intervalId = setInterval(tick, FRAME_MS);
      break;
    case 'stop':
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      lerpState.clear();
      break;
  }
};
