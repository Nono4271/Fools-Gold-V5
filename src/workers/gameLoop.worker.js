// ── Game Loop Web Worker ──────────────────────────────────────────────────────
// Offloads all setInterval logic from the main thread so React renders never
// block touch events, map pans, or tile taps.
//
// Handles:
//   • March step ticking (100ms) — moves commanders along their paths
//   • Draw rematch timer (1000ms) — checks expired draw timers
//   • Siege reset timer (1000ms) — resets defeated garrisons
//   • Reinforcement march ticking (100ms) — moves rein convoys
//   • AI resource tick (1000ms) — AI passive income
//   • AI march decision tick (3000ms) — AI strategic movement decisions
//   • AI economy tick (5000ms) — AI training / upgrading
//
// The worker runs the TIMING logic only. All state reads come from snapshots
// posted by the main thread; all mutations are sent back as typed messages for
// the main thread to apply.
//
// Message protocol (main → worker):
//   { type: 'init' }                — start all ticks
//   { type: 'pause' }              — clear all intervals (game not active)
//   { type: 'resume' }             — restart intervals
//   { type: 'snapshot', data: {    — full state snapshot, sent whenever relevant state changes
//       cmds, tiles, aiRss, aiBldgs, aiPool, aiLastAction,
//       bldgs, screen, hqKey, aiHqKeys, aiFaction,
//       reinMarches, nowTick,
//   }}
//
// Message protocol (worker → main):
//   { type: 'marchStep',    cmds: [...] }        — updated cmd positions
//   { type: 'drawTick' }                         — trigger draw-timer check (main has full state)
//   { type: 'siegeReset',   changedKeys: [...] } — keys whose garrison should reset
//   { type: 'reinStep',     marches: [...] }     — updated rein convoy positions
//   { type: 'aiRssTick',    delta: {...} }        — add to AI resources
//   { type: 'aiMarchReady', cmd, path, target }  — AI commander should be dispatched
//   { type: 'aiEconTick' }                       — trigger AI economy pass (main applies)
//   { type: 'tick',         now: Number }        — heartbeat, drives nowTick in main
//
// The worker does NOT run simBattle, pathfinding, or skill logic — those are
// too expensive / import-heavy to inline here. Instead the worker fires small
// typed messages; the main thread runs the real logic in response.

// ── Internal state ──────────────────────────────────────────────────────────
let snapshot = null; // most recent snapshot from main thread
let paused   = false;

// Interval handles
let ids = {};

function clearAll() {
  Object.values(ids).forEach(id => clearInterval(id));
  ids = {};
}

// ── March step: 100ms ───────────────────────────────────────────────────────
// Move commanders along their march path one step at a time.
// Returns the minimal diff so the main thread can do a targeted setCmds.
function tickMarch() {
  if (!snapshot) return;
  const { cmds } = snapshot;
  if (!cmds) return;

  const now = Date.now();
  const updates = []; // { uid, tk, marchPatch }

  for (const cmd of cmds) {
    if (!cmd.march) continue;
    const m = cmd.march;
    if (!m.path || m.path.length === 0) {
      updates.push({ uid: cmd.uid, clearMarch: true });
      continue;
    }
    if (now - m.lastStepTime < m.stepMs) continue;

    const nextStep = m.step + 1;
    if (nextStep >= m.path.length) {
      // Arrived — let main thread handle arrival logic (battle, capture, etc.)
      const dest = m.path[m.path.length - 1];
      if (m.type === 'attack') {
        updates.push({ uid: cmd.uid, tk: dest, marchPatch: { ...m, step: nextStep, arrived: true } });
      } else {
        updates.push({ uid: cmd.uid, tk: dest, clearMarch: true });
      }
    } else {
      updates.push({
        uid: cmd.uid,
        tk: m.path[nextStep],
        marchPatch: { ...m, step: nextStep, lastStepTime: now },
      });
    }
  }

  if (updates.length) {
    self.postMessage({ type: 'marchStep', updates, now });
  }
}

// ── Draw rematch: 1000ms ───────────────────────────────────────────────────
// Just signals the main thread — it owns all the battle logic.
function tickDraw() {
  if (!snapshot) return;
  const { cmds } = snapshot;
  if (!cmds) return;
  const now = Date.now();
  const expired = cmds.filter(c =>
    c.owner === 'player' && c.drawTimer && !c.march && now >= c.drawTimer
  );
  if (expired.length) {
    self.postMessage({ type: 'drawTick', expiredUids: expired.map(c => c.uid), now });
  }
}

// ── Siege reset: 1000ms ────────────────────────────────────────────────────
function tickSiegeReset() {
  if (!snapshot) return;
  const { tiles } = snapshot;
  if (!tiles) return;
  const now = Date.now();
  const changedKeys = [];
  for (const [k, tile] of Object.entries(tiles)) {
    if (tile.garrisonDefeated && tile.resetAt && now >= tile.resetAt) {
      changedKeys.push(k);
    }
  }
  if (changedKeys.length) {
    self.postMessage({ type: 'siegeReset', changedKeys, now });
  }
  // Always post nowTick so HUD timers update
  self.postMessage({ type: 'tick', now });
}

// ── Reinforcement march: 100ms ─────────────────────────────────────────────
function tickRein() {
  if (!snapshot) return;
  const { reinMarches } = snapshot;
  if (!reinMarches || !reinMarches.length) return;

  const now = Date.now();
  const updates = []; // { idx, nextStep, arrived, returning, redirected }

  reinMarches.forEach((rm, idx) => {
    if (!rm.path || rm.path.length === 0) return;
    const elapsed = now - rm.lastStepTime;
    if (elapsed < rm.stepMs) return;
    const nextStep = rm.step + 1;
    if (nextStep >= rm.path.length) {
      updates.push({ idx, arrived: true, returning: rm.returning });
    } else {
      updates.push({ idx, nextStep, lastStepTime: now });
    }
  });

  if (updates.length) {
    self.postMessage({ type: 'reinStep', updates, now });
  }
}

// ── AI resource tick: 1000ms ───────────────────────────────────────────────
// Sends a signal — main thread knows owned tiles and building levels.
function tickAiRss() {
  if (!snapshot?.aiFaction) return;
  self.postMessage({ type: 'aiRssTick', now: Date.now() });
}

// ── AI march decision: 3000ms ──────────────────────────────────────────────
// Just tells main thread to run its AI march logic (it owns pathfinding).
function tickAiMarch() {
  if (!snapshot?.aiFaction) return;
  self.postMessage({ type: 'aiMarchCheck', now: Date.now() });
}

// ── AI economy: 5000ms ────────────────────────────────────────────────────
function tickAiEcon() {
  if (!snapshot?.aiFaction) return;
  self.postMessage({ type: 'aiEconTick', now: Date.now() });
}

// ── Start all intervals ────────────────────────────────────────────────────
function startAll() {
  clearAll();
  ids.march      = setInterval(tickMarch,       100);
  ids.rein       = setInterval(tickRein,        100);
  ids.draw       = setInterval(tickDraw,       1000);
  ids.siege      = setInterval(tickSiegeReset, 1000);
  ids.aiRss      = setInterval(tickAiRss,      1000);
  ids.aiMarch    = setInterval(tickAiMarch,    3000);
  ids.aiEcon     = setInterval(tickAiEcon,     5000);
}

// ── Message handler ──────────────────────────────────────────────────────
self.onmessage = (e) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      paused = false;
      startAll();
      break;

    case 'pause':
      paused = true;
      clearAll();
      break;

    case 'resume':
      if (paused) {
        paused = false;
        startAll();
      }
      break;

    case 'snapshot':
      snapshot = data;
      // If screen went away from 'game', pause ourselves
      if (data.screen && data.screen !== 'game') {
        if (!paused) { paused = true; clearAll(); }
      } else if (paused && data.screen === 'game') {
        paused = false;
        startAll();
      }
      break;

    default:
      break;
  }
};
