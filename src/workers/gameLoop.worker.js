import { advanceMarch } from '../../shared/utils/marchMotion.js';
import { aiTrainingTick } from '../../shared/utils/aiEconomy.js';
import { barracksCapacity } from '../../shared/constants/buildings.js';
import { AI_STAMINA_MAX, canAffordMarch } from '../../shared/utils/tactics.js';
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

// Worker-authoritative march state: persists between snapshots so stale
// snapshot step counts don't reset progress. Map of uid → { step, lastStepTime, arrived }
const workerMarchState = new Map();

// Interval handles
let ids = {};

function clearAll() {
  Object.values(ids).forEach(id => clearInterval(id));
  ids = {};
}

// ── March step: 100ms ───────────────────────────────────────────────────────
// Worker maintains its own step/lastStepTime so stale snapshots don't reset progress.
function tickMarch() {
  if (!snapshot) return;
  const { cmds } = snapshot;
  if (!cmds) return;

  const now = Date.now();
  const updates = [];

  for (const cmd of cmds) {
    if (!cmd.march) {
      workerMarchState.delete(cmd.uid);
      continue;
    }
    const m = cmd.march;
    if (!m.path || m.path.length === 0) {
      updates.push({ uid: cmd.uid, clearMarch: true });
      workerMarchState.delete(cmd.uid);
      continue;
    }

    // Use worker-authoritative state; seed from snapshot only when march is new or path changed
    let ws = workerMarchState.get(cmd.uid);
    const routeId=m.startedAt ?? m.lastStepTime;
    if (!ws || ws.pathLen !== m.path.length || ws.routeId !== routeId) {
      ws = { step: m.step, lastStepTime: m.lastStepTime, pathLen: m.path.length, routeId, arrived: m.arrived || false };
      workerMarchState.set(cmd.uid, ws);
    }

    if (ws.arrived) continue; // waiting for main thread to clear march
    // Catches all the way up (not just one step) after the worker was
    // paused/throttled — e.g. a backgrounded tab or locked phone.
    const res = advanceMarch(ws.step, ws.lastStepTime, m.path, m.stepMs, now);
    if (!res.advanced) continue;
    ws.step = res.step;
    ws.lastStepTime = res.lastStepTime;
    if (res.clear) {
      workerMarchState.delete(cmd.uid);
      updates.push({ uid:cmd.uid, tk:m.path.at(-1), clearMarch:true });
    } else if (res.reachedEnd) {
      const dest = m.path[m.path.length - 1];
      ws.arrived = true;
      if (m.type === 'attack') {
        updates.push({ uid: cmd.uid, tk: dest, marchPatch: { ...m, step: ws.step, lastStepTime:ws.lastStepTime, arrived: true } });
      } else {
        updates.push({ uid: cmd.uid, tk: dest, clearMarch: true });
        workerMarchState.delete(cmd.uid);
      }
    } else {
      updates.push({ uid: cmd.uid, tk: m.path[ws.step], marchPatch: { ...m, step: ws.step, lastStepTime: ws.lastStepTime } });
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

// ── Siege reset: client-side timer for offline play ────────────────────────
// Fires siegeReset for any tile whose resetAt has passed.
// When online, the server will also push TILE_PATCH which onSiegeReset handles —
// double-firing is safe because onSiegeReset is idempotent (clears to []).
function tickSiegeReset() {
  // Always post the heartbeat tick so HUD countdown timers stay accurate.
  self.postMessage({ type: 'tick', now: Date.now() });

  if (!snapshot) return;
  const { tiles } = snapshot;
  if (!tiles || !Object.keys(tiles).length) return;

  const now = Date.now();
  const changedKeys = [];
  for (const [k, t] of Object.entries(tiles)) {
    if (t.resetAt && now >= t.resetAt) changedKeys.push(k);
  }
  if (changedKeys.length) {
    self.postMessage({ type: 'siegeReset', changedKeys, now });
  }
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
// Runs frontier computation and candidate scoring in the worker.
// Sends aiMarchReady for each commander that should march.
const aiLastMarch = {}; // uid → timestamp
const WIN_C = 922, WIN_R = 652; // map center win tile (matches shared/constants/map.js)

function adj(c, r) {
  const out = [];
  if (c > 0)         out.push(`${c-1},${r}`);
  if (c < 1844)      out.push(`${c+1},${r}`);
  if (r > 0)         out.push(`${c},${r-1}`);
  if (r < 1304)      out.push(`${c},${r+1}`);
  return out;
}

function tickAiMarch() {
  if (!snapshot?.aiFactionKeys?.length) return;
  const { aiCmds, aiTileKeys, aiFaction, tiles, CMD_MARCH_COOLDOWN_MS: COOLDOWN = 15000 } = snapshot;
  if (!aiCmds?.length || !aiFaction) return;

  // Only process the single player-faction AI commander
  const factionCmds = aiCmds.filter(c => c.faction === aiFaction);
  if (!factionCmds.length) return;

  const now = Date.now();
  const idleArmed    = factionCmds.filter(c => !c.march && (c.troops || 0) > 0);
  const idleNoTroops = factionCmds.filter(c => !c.march && !(c.troops || 0));
  if (idleNoTroops.length) {
    idleNoTroops.forEach(c => self.postMessage({ type: 'aiMarchNoCandidate', uid: c.uid, faction: c.faction, reason: 'no troops yet — waiting for econ tick', now }));
  }
  if (!idleArmed.length) return;

  // Build frontier from owned tiles, falling back to HQ key as seed
  const ownedKeys = aiTileKeys?.[aiFaction] || [];
  const seedKeys  = ownedKeys.length
    ? ownedKeys
    : idleArmed.filter(c => c.hqKey).map(c => c.hqKey);
  if (!seedKeys.length) {
    self.postMessage({ type: 'aiMarchNoCandidate', uid: `faction:${aiFaction}`, faction: aiFaction, reason: 'no owned tiles or HQ key in snapshot', now });
    return;
  }
  const ownedSet = new Set(seedKeys);
  const frontier = new Set();
  for (const ownedKey of seedKeys) {
    const [oc, or_] = ownedKey.split(',').map(Number);
    for (const k of adj(oc, or_)) {
      if (!ownedSet.has(k)) frontier.add(k);
    }
  }
  const frontierArr = [...frontier];

  const toProcess = idleArmed.slice(0, 20);
  const dispatches = [];

  for (const cmd of toProcess) {
    // Out of stamina (same 20-per-attack rule as the player): sit this one out
    // without burning the march cooldown; it regens +1 per 3 min.
    if (!canAffordMarch(cmd, 'attack', AI_STAMINA_MAX)) continue;
    const lastMs = aiLastMarch[cmd.uid] || 0;
    if (now - lastMs < COOLDOWN) continue;

    const candidates = frontierArr;
    if (!candidates.length) {
      self.postMessage({ type: 'aiMarchNoCandidate', uid: cmd.uid, faction: cmd.faction, reason: 'no frontier tiles', now });
      continue;
    }

    const [cc, cr] = cmd.tk.split(',').map(Number);

    const scored = candidates.map(k => {
      const [tc, tr] = k.split(',').map(Number);
      const distToCmd = Math.abs(tc - cc) + Math.abs(tr - cr); // primary: nearest to commander
      return { k, score: distToCmd + Math.random() * 3 }; // tiny random to avoid ties
    });
    scored.sort((a, b) => a.score - b.score);
    const destKey = scored[0].k;

    dispatches.push({ uid: cmd.uid, destKey, faction: cmd.faction });
    aiLastMarch[cmd.uid] = now;
  }

  if (dispatches.length) {
    self.postMessage({ type: 'aiMarchReady', dispatches, now });
  }
}

// ── Inlined building helpers (no imports in worker) ──────────────────────────
const BLDG_COST = {
  hq:{stone:800,wood:400,gas:200},quarry:{stone:50,wood:30,gas:10},
  lumber:{stone:60,wood:20,gas:10},forge:{stone:50,wood:20,gas:0},
  refinery:{stone:70,wood:40,gas:20},barracks:{stone:100,wood:60,gas:30},
  training:{stone:80,wood:50,gas:20},commandcenter:{stone:180,wood:100,gas:60},
  healingtent:{stone:80,wood:60,gas:40},walls:{stone:120,wood:60,gas:0},
};
const BLDG_MAX = {hq:10,quarry:20,lumber:20,forge:20,refinery:20,barracks:10,training:10,commandcenter:10,healingtent:10,walls:10};
const RSS_BLDGS = new Set(["quarry","lumber","forge","refinery","storage"]);
// Same barracks capacity curve as the player (was a steeper /9 curve: ~7x the player's at lvl 10).
const _barrCap = barracksCapacity;
function _cmdCap(lvl)   { const CC=[0,2,4,7,10,13,17,21,25,30,35]; return (lvl||1)+(CC[Math.min(10,lvl||0)]||0); }
function _upgCost(type,lvl) { const b=BLDG_COST[type]; if(!b) return {}; const m=Math.pow(1.8,lvl); return Object.fromEntries(Object.entries(b).map(([k,v])=>[k,Math.round(v*m)])); }
function _maxLvl(type,hqLvl) { const abs=BLDG_MAX[type]||10; if(type==="hq") return abs; return Math.min(abs, RSS_BLDGS.has(type)?hqLvl*2:hqLvl); }

// ── AI economy: 5000ms ────────────────────────────────────────────────────
// Fully computed in worker — sends back diffs for main thread to apply in one pass.
const FACTION_BRANCH_KEYS = {}; // populated from first snapshot that has aiFactionKeys
// Per-faction training state kept in the worker: the queue of in-progress
// commands (finish timestamps) and the authoritative barracks pool. Only this
// tick ever changes the pool, so we don't rebuild it from the 2 s snapshot.
const aiEconLocal = {}; // { [fk]: { pool, queue: number[] } }

function tickAiEcon() {
  const { aiCmds, aiFactionKeys, aiPool, aiRss, aiBldgs, aiHqKeys } = snapshot || {};
  if (!aiFactionKeys?.length || !aiCmds) return;

  // Build per-faction branch list from snapshot (sent in aiCmds faction field)
  // We don't have FACTION_TROOPS in worker — use a simple fallback branch key per faction
  const FALLBACK_BRANCHES = {
    pirates:['swashbucklers','corsairs','privateers'],
    orcs:['grunts','marauders','warchief'],
    wizards:['apprentices','mages','archmages'],
    dragons:['drakes','wyverns','dragonlords'],
    holyknights:['paladins','crusaders','templars'],
    nightcreatures:['shades','wraiths','dreadlords'],
    coldborns:['frostguard','glacialmages','iceweavers'],
    ashen_dead:['skeletal','wraiths','liches'],
  };

  const cmdUpdates   = []; // { uid, troops, troopBranch, unspentSkillPoints, skillPoints }
  const poolUpdates  = {}; // { fk: newPool }
  const rssUpdates   = {}; // { fk: { stone, wood, gas, food } }
  const bldgUpdates  = {}; // { fk: { ...bldgs } }

  for (const fk of aiFactionKeys) {
    const local = aiEconLocal[fk] || (aiEconLocal[fk] = { pool: aiPool?.[fk] ?? _barrCap(0), queue: [] });
    const curPool  = local.pool;
    const curRss   = { ...(aiRss?.[fk]  || { stone:5000, wood:5000, gas: 5000, food: 5000 }) };
    const curBldgs = { ...(aiBldgs?.[fk] || { hq:1, barracks:0, commandcenter:0 }) };
    const hqKeyVal = aiHqKeys?.[fk];
    const hqKey    = Array.isArray(hqKeyVal) ? hqKeyVal[0] : hqKeyVal;
    const fkCmds   = aiCmds.filter(c => c.faction === fk);

    let newPool  = curPool;
    let newRss   = { ...curRss };
    let newBldgs = { ...curBldgs };

    // Troop assignment — all idle troopless commanders at their HQ per tick, at max capacity
    const idleNoTroops = fkCmds.filter(c => !c.march && !(c.troops||0) && c.tk === (c.hqKey || hqKey));
    if (fk === snapshot.aiFaction) {
      const allIdle = fkCmds.filter(c => !c.march && !(c.troops||0));
      self.postMessage({ type: 'aiMarchNoCandidate', uid: `econ:${fk}`, faction: fk,
        reason: `econ tick — pool:${newPool} idleNoTroops:${idleNoTroops.length} allTroopless:${allIdle.length} hqKey:${hqKey} cmds:[${fkCmds.map(c=>`${c.uid.slice(-6)} tk:${c.tk} hqKey:${c.hqKey}`).join(', ')}]`, now: Date.now() });
    }
    for (const cmd of idleNoTroops) {
      if (newPool <= 0) break;
      const commandSlots = _cmdCap(cmd.lvl || 5);
      const troopsPerCommand = 0.01; // small troop rate — most troops per command
      const cap = Math.floor(commandSlots / troopsPerCommand); // e.g. 18 slots / 0.01 = 1800
      const assign = Math.min(cap, newPool);
      const branches = FALLBACK_BRANCHES[fk] || ['soldiers'];
      const brKey  = branches[Math.floor(Math.random() * branches.length)];
      cmdUpdates.push({ uid: cmd.uid, troops: assign, troopBranch: { faction: fk, branch: brKey, tier: 0 } });
      newPool = Math.max(0, newPool - assign);
    }

    // Train troops — time-gated like the player's training queues (see
    // shared/utils/aiEconomy.js). Finished commands land in the pool; new ones are
    // paid for up front and only start if there is a free queue, room under the
    // barracks cap, and enough resources. No more instant refill every tick.
    {
      const t = aiTrainingTick({
        pool: newPool, rss: newRss, queue: local.queue,
        trainingLvl: curBldgs.training || 0, barracksLvl: curBldgs.barracks || 0,
        commanderCount: fkCmds.length, now: Date.now(),
      });
      newPool = t.pool; newRss = t.rss; local.queue = t.queue;
    }

    // Upgrade buildings
    const upgPriority = ["quarry","lumber","forge","barracks","hq","training","refinery","commandcenter","walls"];
    for (const bType of upgPriority) {
      const curLvl = newBldgs[bType] || 0;
      const avail  = _maxLvl(bType, newBldgs.hq || 1);
      if (curLvl >= avail) continue;
      const cost = _upgCost(bType, curLvl);
      if (!Object.entries(cost).every(([k,v]) => newRss[k] >= v)) continue;
      Object.entries(cost).forEach(([k,v]) => newRss[k] -= v);
      newBldgs[bType] = curLvl + 1;
      if (bType === "barracks") newPool = Math.min(_barrCap(newBldgs.barracks), newPool);
      break;
    }

    local.pool = newPool;
    if (newPool !== curPool)  poolUpdates[fk] = newPool;
    if (JSON.stringify(newRss)   !== JSON.stringify(curRss))   rssUpdates[fk]  = newRss;
    if (JSON.stringify(newBldgs) !== JSON.stringify(curBldgs)) bldgUpdates[fk] = newBldgs;
  }

  if (cmdUpdates.length || Object.keys(poolUpdates).length || Object.keys(rssUpdates).length || Object.keys(bldgUpdates).length) {
    self.postMessage({ type: 'aiEconReady', updates: { cmdUpdates, poolUpdates, rssUpdates, bldgUpdates }, now: Date.now() });
  }
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
      workerMarchState.clear();
      Object.keys(aiLastMarch).forEach(k => delete aiLastMarch[k]);
      Object.keys(aiEconLocal).forEach(k => delete aiEconLocal[k]);
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
