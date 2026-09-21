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
 *   { type:"GAME_INIT",   sessionId, facKey, tiles:{[key]:Tile}, viewport?:{minC,maxC,minR,maxR} }
 *   { type:"TILE_CAPTURE",sessionId, key, owner, garrison, siege, siegeMax, defCmd, msgId, attacker? }
 *   { type:"TILE_SIEGE",  sessionId, key, siege, garrisonDefeated, garrison, siegeMax, msgId, attacker? }
 *   { type:"VIEWPORT_SUB",sessionId, minC, maxC, minR, maxR }
 *   { type:"PING" }
 *
 * `msgId` (TILE_CAPTURE/TILE_SIEGE) lets the server dedupe a resent message
 * instead of re-applying it. `viewport` (GAME_INIT) lets a joining client's
 * SESSION_STATE be filtered to its starting region instead of every mutable
 * tile in the session. `resetAt`/`protectedUntil` are no longer read from
 * the client — the server computes both itself (see handleTileCapture/
 * handleTileSiege) so a client's clock skew (or tampering) can't set them.
 * `attacker` (`{ troopSlots }` or `{ troops, troopBranch }` + `armySiegeBonus`,
 * see attackerComposition() in src/hooks/useMarch.js) lets the server
 * recompute siegePower itself (shared calcSiegePower + FACTION_TROOPS) and
 * decide the real outcome via resolveSiegeOutcome, instead of trusting the
 * client's claimed owner/garrison/siege numbers. When the server disagrees,
 * it applies and broadcasts its own outcome to EVERY client, including the
 * one that sent the (wrong) optimistic update. Omitting `attacker` (an older
 * client) falls back to trusting the client's claim, same as before this.
 *
 * Server → Client messages:
 *   { type:"GAME_READY",     sessionId }
 *   { type:"TILE_PATCH",     patches:{[key]:TilePatch} }
 *   { type:"SESSION_STATE",  tiles:{[key]:Tile} }
 *   { type:"PONG" }
 *   { type:"ERROR",          message }
 */

import { WebSocketServer } from 'ws';
// Roadmap item 2/4: use the same deterministic rule the client uses (moved to
// shared/ specifically so the server could import it) so garrison-reset/
// protection timestamps are computed authoritatively here, not trusted from
// whatever the client sent (clock skew, or a malicious client just claiming
// a huge protectedUntil).
import { garrisonResetMs, resolveSiegeOutcome } from '../shared/utils/captureRules.js';
import { TILE_PROTECTION_MS } from '../shared/utils/tileTimers.js';
// Roadmap item 1: the server's own copy of troop siege values, so it can
// recompute an attacking army's siegePower from its composition instead of
// trusting the client's claimed capture/siege outcome outright. Pure data +
// pure function — safe to import into a Node server (no browser/React deps).
import { calcSiegePower } from '../shared/constants/map.js';
import { FACTION_TROOPS } from '../shared/constants/troops.js';

// Recompute siegePower server-side from an attacker's reported composition.
// `attacker` is `{ troopSlots }` (player armies) or `{ troops, troopBranch }`
// (legacy/AI-shaped commands), plus `armySiegeBonus` from gear — see
// attackerComposition() in src/hooks/useMarch.js, which builds this exact
// shape. Returns null when no composition was sent (older client), so
// callers can fall back to trusting the client's claim rather than reject it.
function computeSiegePower(attacker) {
  if (!attacker) return null;
  const bonus = attacker.armySiegeBonus || 0;
  if (Array.isArray(attacker.troopSlots) && attacker.troopSlots.length > 0) {
    return calcSiegePower(attacker.troopSlots, null, bonus, FACTION_TROOPS);
  }
  if (attacker.troops) {
    // Mirrors src/hooks/useMarch.js's cmdSiegePower exactly, including its
    // own quirk: it calls calcSiegePower(troops, cmd.troopBranch, bonus) with
    // no 4th arg, so calcSiegePower's legacy branch never actually receives
    // troopTierData and always falls back to a flat 0.5-per-troop rate —
    // troopBranch is effectively unused for siege purposes on this path.
    // The point of this server-side check is to validate against what the
    // client itself would compute, not against a "more correct" formula, so
    // that quirk is intentionally reproduced rather than fixed here — fixing
    // it would be a balance change (this legacy path is AI-commander-shaped;
    // player attacks always go through the troopSlots branch above).
    return calcSiegePower(attacker.troops, attacker.troopBranch, bonus);
  }
  return 0;
}

const PORT = process.env.PORT || 3001;
const wss  = new WebSocketServer({ port: PORT });

// Roadmap item 4: idempotency — a resent/duplicate TILE_CAPTURE or
// TILE_SIEGE (retry after a dropped ack, a double-fire, etc.) must not
// re-apply. Per-session cache of recently seen client-supplied msgIds.
// TTL cleanup keeps this from growing unbounded across a long session.
const MSG_DEDUPE_TTL_MS = 5 * 60 * 1000;
function seenRecently(session, msgId) {
  if (!msgId) return false; // no id given — can't dedupe, let it through (back-compat)
  const now = Date.now();
  for (const [id, ts] of session.seenMsgIds) {
    if (now - ts > MSG_DEDUPE_TTL_MS) session.seenMsgIds.delete(id);
  }
  if (session.seenMsgIds.has(msgId)) return true;
  session.seenMsgIds.set(msgId, now);
  return false;
}

console.log("Fool's Gold server  ws://localhost:" + PORT);

// sessions: Map<sessionId, { tiles: Map<key,Tile>, clients: Set<WS> }>
const sessions   = new Map();
// garrison reset timers: Map<"sessionId::tileKey", timeoutId>
const resetTimers = new Map();

// ─── Session helpers ──────────────────────────────────────────────────────────

function getOrCreateSession(id) {
  if (!sessions.has(id)) sessions.set(id, { tiles: new Map(), clients: new Set(), seenMsgIds: new Map() });
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

function isValidViewport(v) {
  return !!v && ['minC','maxC','minR','maxR'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]));
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
  const { sessionId, facKey, tiles: clientTiles, viewport } = msg;
  if (!sessionId) return sendError(ws, 'GAME_INIT missing sessionId');

  const session = getOrCreateSession(sessionId);
  session.clients.add(ws);
  ws._sessionId = sessionId;
  // Roadmap item 5: use the client's starting region, if it sent one, so a
  // joining client isn't handed the whole session's mutable tile set —
  // VIEWPORT_SUB narrows this further once the client starts panning.
  ws._viewport  = isValidViewport(viewport) ? viewport : null;

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
    // Subsequent client — push current state, filtered to its starting
    // viewport when it gave one (falls back to the full set, same as before,
    // if it didn't — an older client is still served correctly).
    console.log('Client joined session=' + sessionId + ' existing tiles=' + session.tiles.size +
      (ws._viewport ? ' (viewport-filtered)' : ' (full — no viewport given)'));
    sendSessionState(ws, session, ws._viewport);
  }

  ws.send(JSON.stringify({ type: 'GAME_READY', sessionId }));
}

function handleTileCapture(ws, msg) {
  const { sessionId, key, owner, garrison, siege, siegeMax, defCmd, msgId, attacker } = msg;
  const session = sessions.get(sessionId);
  if (!session) return sendError(ws, 'Unknown session');
  if (!key)     return sendError(ws, 'TILE_CAPTURE missing key');

  const tile = session.tiles.get(key);
  if (!tile)    return sendError(ws, 'Tile not found: ' + key);

  const VALID_OWNERS = new Set([
    'player','ai','pirates','bountyhunters','orcs','dragons','neutral',null
  ]);
  if (!VALID_OWNERS.has(owner)) return sendError(ws, 'Invalid owner: ' + owner);
  if (garrison != null && (typeof garrison !== 'number' || garrison < 0)) return sendError(ws, 'Invalid garrison: ' + garrison);
  if (siege != null && siegeMax != null && siege > siegeMax) return sendError(ws, 'siege cannot exceed siegeMax');

  // Idempotency: a resent/duplicate capture (retry after a dropped ack, a
  // double-fire client bug) must not be re-applied or re-broadcast.
  if (seenRecently(session, msgId)) {
    console.log('TILE_CAPTURE dup ignored msgId=' + msgId + ' key=' + key);
    return;
  }

  // Cancel pending garrison reset
  const tk = sessionId + '::' + key;
  if (resetTimers.has(tk)) { clearTimeout(resetTimers.get(tk)); resetTimers.delete(tk); }

  // Roadmap item 1: when the client reported its attacking composition,
  // recompute siegePower ourselves and let resolveSiegeOutcome (the exact
  // same rule the client used) decide the real outcome, instead of trusting
  // the client's owner/garrison/siege numbers outright. `owner`/`defCmd`
  // (who is attacking) are still taken from the client's claim — verifying
  // player identity is a separate, bigger auth item, not done here.
  const siegePower = computeSiegePower(attacker);
  let patch, captured = true;

  if (siegePower != null) {
    const outcome = resolveSiegeOutcome({ tile, siegePower, capture: { owner, defCmd: defCmd ?? null } });
    captured = outcome.captured;
    patch = outcome.patch; // the authoritative patch either way
    if (!captured) {
      console.warn('TILE_CAPTURE REJECTED (siegePower ' + siegePower + ' < tile siege) key=' + key +
        ' session=' + sessionId + ' — applying siege-damage instead, correcting sender');
    }
  } else {
    // No attacker composition sent (older client) — fall back to the
    // previous behavior of trusting the client's claimed outcome.
    patch = {
      owner,
      garrison:         garrison  ?? 0,
      siege:            siege     ?? tile.siegeMax ?? 50,
      siegeMax:         siegeMax  ?? tile.siegeMax ?? 50,
      garrisonDefeated: false,
      resetAt:          null,
      defCmd:           defCmd    ?? null,
      hasAiCommander:   false,
      // Server timestamp, not the client's: a client's Date.now() is subject
      // to clock skew (or tampering), and this is exactly the kind of
      // multiplayer-sensitive value the server should own.
      protectedUntil:   Date.now() + TILE_PROTECTION_MS,
    };
  }

  // If the server disagrees with the client's optimistic capture, the
  // sender needs the correction too — don't skip it in the broadcast.
  applyAndBroadcast(session, { [key]: patch }, captured ? ws : null);
  console.log('TILE_CAPTURE ' + key + ' owner=' + owner + ' captured=' + captured + ' session=' + sessionId);
}

function handleTileSiege(ws, msg) {
  const { sessionId, key, siege, garrisonDefeated, garrison, siegeMax, msgId, attacker } = msg;
  const session = sessions.get(sessionId);
  if (!session) return sendError(ws, 'Unknown session');
  if (!key)     return sendError(ws, 'TILE_SIEGE missing key');

  const tile = session.tiles.get(key);
  if (!tile)    return sendError(ws, 'Tile not found: ' + key);
  if (siege != null && (typeof siege !== 'number' || siege < 0)) return sendError(ws, 'Invalid siege: ' + siege);

  if (seenRecently(session, msgId)) {
    console.log('TILE_SIEGE dup ignored msgId=' + msgId + ' key=' + key);
    return;
  }

  // Server-computed reset delay (shared/utils/captureRules.js), not the
  // client's claimed `resetAt` timestamp — same clock-skew/tamper concern
  // as protectedUntil above. `isGate` is now part of the mutable tile shape
  // (see useServerSync.js), so this correctly distinguishes a gate's 1-hour
  // reset from a regular tile's 15-min one.
  const now = Date.now();
  const nextResetAt = garrisonDefeated ? now + garrisonResetMs(tile) : null;

  // Roadmap item 1: when this siege ping came with an attacker composition
  // (the "not captured" branch of a capture-decision site, not a bare
  // defeated-waves ping), recompute the actual siege value ourselves rather
  // than trust the client's number — same reasoning as handleTileCapture.
  const siegePower = computeSiegePower(attacker);
  let resultingSiege = siege ?? tile.siege;
  if (siegePower != null) {
    const outcome = resolveSiegeOutcome({ tile, siegePower });
    if (outcome.captured) {
      // Server thinks this should actually have been a capture — correct
      // the sender by applying the capture outcome instead of the siege-chip
      // patch it optimistically sent.
      console.warn('TILE_SIEGE understated a capture (siegePower ' + siegePower +
        ' >= tile siege) key=' + key + ' session=' + sessionId + ' — correcting sender');
      const tk = sessionId + '::' + key;
      if (resetTimers.has(tk)) { clearTimeout(resetTimers.get(tk)); resetTimers.delete(tk); }
      applyAndBroadcast(session, { [key]: outcome.patch }, null);
      return;
    }
    resultingSiege = outcome.patch.siege;
  }

  const patch = {
    siege:            resultingSiege,
    garrisonDefeated: garrisonDefeated ?? tile.garrisonDefeated,
    resetAt:          nextResetAt,
  };

  applyAndBroadcast(session, { [key]: patch }, ws);

  if (garrisonDefeated && nextResetAt) {
    scheduleGarrisonReset(
      sessionId, key, nextResetAt,
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
