/**
 * server/index.js  — Fool's Gold multiplayer server
 *
 * Step 3: Server-authoritative tile state
 * ────────────────────────────────────────
 * Architecture:
 *   • One in-memory tile map per game session (keyed by sessionId).
 *   • On GAME_INIT the client sends its full generated tile map; server stores it.
 *   • TILE_CAPTURE  → validate → apply → broadcast TILE_PATCH to all session peers.
 *   • TILE_SIEGE    → validate → apply → broadcast TILE_PATCH.
 *   • Garrison resets are timer-driven server-side; server pushes TILE_PATCH on expiry.
 *   • VIEWPORT_SUB  → client narrows patch delivery to its visible window.
 *
 * Client → Server messages:
 *   { type:"GAME_INIT",   sessionId, facKey, tiles:{[key]:Tile} }
 *   { type:"TILE_CAPTURE",sessionId, key, owner, garrison, siege, siegeMax, defCmd }
 *   { type:"TILE_SIEGE",  sessionId, key, siege, garrisonDefeated, resetAt, garrison, siegeMax }
 *   { type:"VIEWPORT_SUB",sessionId, minC, maxC, minR, maxR }
 *   { type:"PING" }
 *
 * Server → Client messages:
 *   { type:"GAME_READY",     sessionId }
 *   { type:"TILE_PATCH",     patches:{[key]:TilePatch} }
 *   { type:"SESSION_STATE",  tiles:{[key]:Tile} }
 *   { type:"PONG" }
 *   { type:"ERROR",          message }
 */

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;
const wss  = new WebSocketServer({ port: PORT });

console.log("Fool's Gold server  ws://localhost:" + PORT);

// sessions: Map<sessionId, { tiles: Map<key,Tile>, clients: Set<WS> }>
const sessions   = new Map();
// garrison reset timers: Map<"sessionId::tileKey", timeoutId>
const resetTimers = new Map();

// ─── Session helpers ──────────────────────────────────────────────────────────

function getOrCreateSession(id) {
  if (!sessions.has(id)) sessions.set(id, { tiles: new Map(), clients: new Set() });
  return sessions.get(id);
}

function applyAndBroadcast(session, patches, senderWs = null) {
  for (const [key, patch] of Object.entries(patches)) {
    const prev = session.tiles.get(key) || {};
    session.tiles.set(key, { ...prev, ...patch, k: key });
  }
  const msg = JSON.stringify({ type: 'TILE_PATCH', patches });
  for (const client of session.clients) {
    // Skip the originating client — it already applied optimistically
    if (senderWs && client._clientId === senderWs._clientId) continue;
    if (client.readyState === 1) client.send(msg);
  }
}

function sendSessionState(client, session, viewport) {
  const tiles = {};
  for (const [key, tile] of session.tiles) {
    if (viewport) {
      if (tile.c < viewport.minC || tile.c > viewport.maxC ||
          tile.r < viewport.minR || tile.r > viewport.maxR) continue;
    }
    tiles[key] = tile;
  }
  if (client.readyState === 1)
    client.send(JSON.stringify({ type: 'SESSION_STATE', tiles }));
}

function sendError(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ERROR', message }));
  console.warn('Server error to client:', message);
}

// ─── Garrison reset scheduler ─────────────────────────────────────────────────

function scheduleGarrisonReset(sessionId, tileKey, resetAt, garrison, siegeMax) {
  const tk  = sessionId + '::' + tileKey;
  if (resetTimers.has(tk)) clearTimeout(resetTimers.get(tk));

  const delay = Math.max(0, resetAt - Date.now());
  const id = setTimeout(() => {
    resetTimers.delete(tk);
    const session = sessions.get(sessionId);
    if (!session) return;
    const tile = session.tiles.get(tileKey);
    if (!tile || !tile.garrisonDefeated) return; // already recaptured

    const patch = { garrisonDefeated: false, resetAt: null, garrison, siege: siegeMax };
    applyAndBroadcast(session, { [tileKey]: patch });
    console.log('Garrison reset: ' + tileKey + ' session=' + sessionId);
  }, delay);

  resetTimers.set(tk, id);
}

// ─── Message handlers ─────────────────────────────────────────────────────────

function handleGameInit(ws, msg) {
  const { sessionId, facKey, tiles: clientTiles } = msg;
  if (!sessionId) return sendError(ws, 'GAME_INIT missing sessionId');

  const session = getOrCreateSession(sessionId);
  session.clients.add(ws);
  ws._sessionId = sessionId;
  ws._viewport  = null;

  if (clientTiles && session.tiles.size === 0) {
    // First client — seed the authoritative tile map
    for (const [key, tile] of Object.entries(clientTiles)) {
      session.tiles.set(key, tile);
    }
    console.log('GAME_INIT session=' + sessionId + ' facKey=' + facKey + ' tiles=' + session.tiles.size);

    // Re-arm any garrison resets already baked into the tile data
    for (const [key, tile] of session.tiles) {
      if (tile.garrisonDefeated && tile.resetAt && tile.resetAt > Date.now()) {
        scheduleGarrisonReset(sessionId, key, tile.resetAt, tile.garrison, tile.siegeMax);
      }
    }
  } else {
    // Subsequent client — push current state
    console.log('Client joined session=' + sessionId + ' existing tiles=' + session.tiles.size);
    sendSessionState(ws, session, null);
  }

  ws.send(JSON.stringify({ type: 'GAME_READY', sessionId }));
}

function handleTileCapture(ws, msg) {
  const { sessionId, key, owner, garrison, siege, siegeMax, defCmd } = msg;
  const session = sessions.get(sessionId);
  if (!session) return sendError(ws, 'Unknown session');
  if (!key)     return sendError(ws, 'TILE_CAPTURE missing key');

  const tile = session.tiles.get(key);
  if (!tile)    return sendError(ws, 'Tile not found: ' + key);

  const VALID_OWNERS = new Set([
    'player','ai','pirates','bountyhunters','orcs','dragons','neutral',null
  ]);
  if (!VALID_OWNERS.has(owner)) return sendError(ws, 'Invalid owner: ' + owner);

  // Cancel pending garrison reset
  const tk = sessionId + '::' + key;
  if (resetTimers.has(tk)) { clearTimeout(resetTimers.get(tk)); resetTimers.delete(tk); }

  const patch = {
    owner,
    garrison:         garrison  ?? 0,
    siege:            siege     ?? tile.siegeMax ?? 50,
    siegeMax:         siegeMax  ?? tile.siegeMax ?? 50,
    garrisonDefeated: false,
    resetAt:          null,
    defCmd:           defCmd    ?? null,
    hasAiCommander:   false,
  };

  applyAndBroadcast(session, { [key]: patch }, ws);
  console.log('TILE_CAPTURE ' + key + ' owner=' + owner + ' session=' + sessionId);
}

function handleTileSiege(ws, msg) {
  const { sessionId, key, siege, garrisonDefeated, resetAt, garrison, siegeMax } = msg;
  const session = sessions.get(sessionId);
  if (!session) return sendError(ws, 'Unknown session');
  if (!key)     return sendError(ws, 'TILE_SIEGE missing key');

  const tile = session.tiles.get(key);
  if (!tile)    return sendError(ws, 'Tile not found: ' + key);

  const patch = {
    siege:            siege            ?? tile.siege,
    garrisonDefeated: garrisonDefeated ?? tile.garrisonDefeated,
    resetAt:          resetAt          ?? tile.resetAt,
  };

  applyAndBroadcast(session, { [key]: patch }, ws);

  if (garrisonDefeated && resetAt && resetAt > Date.now()) {
    scheduleGarrisonReset(
      sessionId, key, resetAt,
      garrison ?? tile.garrison,
      siegeMax ?? tile.siegeMax ?? 50,
    );
  }

  console.log('TILE_SIEGE ' + key + ' siege=' + siege + ' defeated=' + garrisonDefeated);
}

function handleViewportSub(ws, msg) {
  const { sessionId, minC, maxC, minR, maxR } = msg;
  const session = sessions.get(sessionId);
  if (!session) return;
  ws._viewport = { minC, maxC, minR, maxR };
  sendSessionState(ws, session, ws._viewport);
}

// ─── Connection ───────────────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  ws._clientId = Math.random().toString(36).slice(2); // unique per connection
  console.log('Client connected id=' + ws._clientId);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return sendError(ws, 'Invalid JSON'); }

    switch (msg.type) {
      case 'GAME_INIT':    handleGameInit(ws, msg);    break;
      case 'TILE_CAPTURE': handleTileCapture(ws, msg); break;
      case 'TILE_SIEGE':   handleTileSiege(ws, msg);   break;
      case 'VIEWPORT_SUB': handleViewportSub(ws, msg); break;
      case 'PING':         ws.send(JSON.stringify({ type: 'PONG' })); break;
      default: console.log('Unknown msg type:', msg.type);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    const sessionId = ws._sessionId;
    if (!sessionId) return;
    const session = sessions.get(sessionId);
    if (session) {
      session.clients.delete(ws);
      if (session.clients.size === 0) {
        // Clean up after 5 min grace period
        setTimeout(() => {
          if (sessions.get(sessionId)?.clients.size === 0) {
            sessions.delete(sessionId);
            console.log('Session ' + sessionId + ' cleaned up');
          }
        }, 5 * 60 * 1000);
      }
    }
  });

  ws.on('error', (err) => console.error('WS error:', err.message));
});
