/**
 * useServerSync.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the WebSocket connection to the Fool's Gold server and keeps the
 * client tile map in sync with the server-authoritative state.
 *
 * Responsibilities
 *   • Connect to ws://localhost:3001 when screen === "game".
 *   • On map ready, send GAME_INIT with only mutable tile state (owned/HQ/keep/defeated).
 *   • Expose emitTileCapture / emitTileSiege helpers that:
 *       1. Apply the patch locally (optimistic update via patchTile).
 *       2. Send the event to the server.
 *       Server will broadcast TILE_PATCH back; we skip re-applying our own echo.
 *   • On incoming TILE_PATCH, apply server patches via patchTile so all clients
 *     see consistent state.
 *   • Reconnect with exponential back-off on disconnect.
 *   • Send a stable per-browser `playerId` on GAME_INIT so the server can
 *     bind captures to this connection's own identity (playerIdentity.js).
 *   • Poll pan/zoom (when `panRef`/`zoomRef` are passed) and send VIEWPORT_SUB
 *     as the player moves, so a long session's view of the map stays fresh
 *     beyond its starting region.
 *
 * Usage (in Game.jsx):
 *   const { emitTileCapture, emitTileSiege, connected } = useServerSync({
 *     screen, tiles, mapReady, patchTile, sessionId, playerId, panRef, zoomRef,
 *   });
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { viewBoundsCR } from '../../shared/constants/geometry.js';

// In dev: Vite proxies /ws → ws://localhost:3001 (see vite.config.ts)
// In prod: set VITE_WS_URL env var to your deployed server, e.g. wss://yourdomain.com
const WS_URL = import.meta.env.VITE_WS_URL ||
  (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
const MAX_BACKOFF = 30_000; // 30 s


/**
 * Extract only the mutable subset of tile state that the server needs to track.
 * Terrain, biome, region, geometry etc. are deterministically generated client-side
 * from the same seed, so we never need to send them. This keeps GAME_INIT under ~50KB
 * instead of ~200MB for a 700×700 map.
 *
 * Only tiles that differ from "neutral, unowned, full garrison" are included.
 */
function extractMutableState(tiles) {
  const mutable = {};
  for (const [key, t] of Object.entries(tiles)) {
    if (key === '__ready') continue;
    // Skip tiles that are in their default neutral state
    const isDefault = !t.owner && !(t.defeatedWaves?.length) && !t.isHQ && !t.isHQPart &&
                      !t.isKeep && !t.isGate && !t.isWin && !t.hasAiCommander;
    if (isDefault) continue;
    // Store only the fields the server actually uses for authoritative state
    mutable[key] = {
      c: t.c, r: t.r, k: key,
      owner:            t.owner            ?? null,
      garrison:         t.garrison         ?? 0,
      siege:            t.siege            ?? t.siegeMax ?? 50,
      siegeMax:         t.siegeMax         ?? 50,
      garrisonWaves:    t.garrisonWaves    ?? 1,
      defeatedWaves:    t.defeatedWaves    ?? [],
      resetAt:          t.resetAt          ?? null,
      isHQ:             t.isHQ             ?? false,
      isHQPart:         t.isHQPart         ?? false,
      isKeep:           t.isKeep           ?? false,
      // Added so the server's garrisonResetMs (shared/utils/captureRules.js)
      // can tell a gate's 1-hour reset from a regular tile's 15-min one —
      // this field was missing entirely before, so the server always fell
      // through to the 15-min default for gates (see ReadMeAI).
      isGate:           t.isGate           ?? false,
      isWin:            t.isWin            ?? false,
      hasAiCommander:   t.hasAiCommander   ?? false,
      defCmd:           t.defCmd           ?? null,
      powerLevel:       t.powerLevel       ?? 1,
    };
  }
  return mutable;
}

export function useServerSync({ screen, tiles, mapReady, patchTile, sessionId, initialViewport, playerId, panRef, zoomRef }) {
  const lastViewportRef = useRef(null); // last {minC,maxC,minR,maxR} sent via VIEWPORT_SUB
  const wsRef          = useRef(null);
  const [connected, setConnected] = useState(false);
  const backoffRef     = useRef(500);
  const reconnTimerRef = useRef(null);
  const sentInitRef    = useRef(false);   // prevent double-init per connection
  const pendingRef     = useRef([]);      // messages queued before connection

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const safeSend = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    // Queue for when connection is ready
    pendingRef.current.push(msg);
    return false;
  }, []);

  const flushPending = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const msgs = pendingRef.current.splice(0);
    for (const msg of msgs) ws.send(JSON.stringify(msg));
  }, []);

  // ── Public emitters ──────────────────────────────────────────────────────────

  /**
   * Call when a tile is captured (owner changes).
   * Optimistic: patchTile fires immediately; server echo is ignored.
   */
  const emitTileCapture = useCallback((key, patch, attacker) => {
    safeSend({
      type: 'TILE_CAPTURE',
      sessionId,
      key,
      // Roadmap item 4: lets the server dedupe a resent/duplicate message
      // (dropped ack, double-fire) instead of re-applying it.
      msgId: `${sessionId}:${key}:cap:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      // Roadmap item 1: the troop composition behind this claim's siegePower,
      // so the server can recompute it itself (shared calcSiegePower) instead
      // of trusting owner/garrison/siege verbatim. Optional — an older client
      // omitting this still works, just without server-side verification.
      attacker,
      ...patch,
    });
  }, [safeSend, sessionId]);

  /**
   * Call when siege damage is applied (garrison defeated, siege reduced).
   * Optimistic: caller already called patchTile; this syncs the server.
   */
  const emitTileSiege = useCallback((key, patch, attacker) => {
    safeSend({
      type: 'TILE_SIEGE',
      sessionId,
      key,
      msgId: `${sessionId}:${key}:siege:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      attacker,
      ...patch,
    });
  }, [safeSend, sessionId]);

  /**
   * Call when a fort is built, upgraded, destroyed, or sieged.
   */
  const emitFortUpdate = useCallback((payload) => {
    safeSend({
      type: 'FORT_UPDATE',
      sessionId,
      ...payload,
    });
  }, [safeSend, sessionId]);

  // ── Connection management ────────────────────────────────────────────────────

  useEffect(() => {
    if (screen !== 'game') return;

    let destroyed = false;

    function connect() {
      if (destroyed) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      sentInitRef.current = false;

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        console.log('[ServerSync] Connected');
        setConnected(true);
        backoffRef.current = 500; // reset back-off
        flushPending();

        // Send GAME_INIT if map is already ready
        if (mapReady && tiles && !sentInitRef.current) {
          sentInitRef.current = true;
          ws.send(JSON.stringify({
            type: 'GAME_INIT',
            sessionId,
            tiles: extractMutableState(tiles), // mutable subset only — ~50KB not ~200MB
            // Roadmap item 5: a joining client only needs its starting region,
            // not every mutable tile in the world — see server/index.js's
            // handleGameInit, which uses this to filter SESSION_STATE.
            viewport: initialViewport,
            // Roadmap item: lets the server bind captures to this connection's
            // own identity instead of trusting the client's claimed owner —
            // see src/utils/playerIdentity.js and server/index.js's ws._playerId.
            playerId,
          }));
        } else {
          // Map not ready yet; GAME_INIT will fire from the mapReady effect below
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      };

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }

        switch (msg.type) {
          case 'GAME_READY':
            console.log('[ServerSync] Server acknowledged session:', msg.sessionId);
            break;

          case 'TILE_PATCH':
            // Server pushed authoritative patches — apply to local tile map
            if (msg.patches) {
              for (const [key, patch] of Object.entries(msg.patches)) {
                patchTile(key, patch);
              }
            }
            break;

          case 'SESSION_STATE':
            // Received bulk tile state (secondary client joining) — apply all
            if (msg.tiles) {
              for (const [key, tile] of Object.entries(msg.tiles)) {
                patchTile(key, tile);
              }
            }
            break;

          case 'ERROR':
            console.warn('[ServerSync] Server error:', msg.message);
            break;

          case 'PONG':
            break;

          default:
            console.log('[ServerSync] Unknown msg:', msg.type);
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        setConnected(false);
        console.log('[ServerSync] Disconnected — reconnecting in', backoffRef.current, 'ms');
        reconnTimerRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
          connect();
        }, backoffRef.current);
      };

      ws.onerror = (err) => {
        console.warn('[ServerSync] WS error', err);
        ws.close();
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send GAME_INIT once map is ready ─────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !tiles || sentInitRef.current) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    sentInitRef.current = true;
    const mutableTiles = extractMutableState(tiles);
    ws.send(JSON.stringify({ type: "GAME_INIT", sessionId, tiles: mutableTiles, viewport: initialViewport, playerId }));
    console.log('[ServerSync] GAME_INIT sent — tiles:', Object.keys(tiles).length);
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Track the player's pan/zoom and send VIEWPORT_SUB as they move ──────────
  // Roadmap item 3: the server already supported filtering a joining client's
  // SESSION_STATE by viewport (VIEWPORT_SUB), but nothing sent updates as the
  // player panned around after joining — so a long session only ever caught
  // up on its *starting* region. Polled + throttled rather than wired to
  // every pan event: panning fires on every pointer-move frame, and a tile
  // region doesn't need sub-second freshness the way rendering does.
  // Scope note: this only re-requests a snapshot for the newly visible area
  // (what VIEWPORT_SUB already did) — it does NOT filter the ongoing
  // TILE_PATCH broadcast, which still goes to every client regardless of
  // their viewport. Filtering live patches by viewport is a bigger change
  // (risk of a client missing an update to a tile it cares about for reasons
  // beyond "currently on screen" — minimap, leaderboard, etc.) and is left
  // for a follow-up, not done here.
  useEffect(() => {
    if (!panRef || !zoomRef) return; // caller didn't wire pan/zoom tracking

    const VIEWPORT_POLL_MS = 3000;
    const MOVE_THRESHOLD = 20; // tiles — ignore tiny pans/jitter

    function meaningfullyMoved(prev, next) {
      if (!prev) return true;
      return Math.abs(next.minC - prev.minC) >= MOVE_THRESHOLD ||
             Math.abs(next.minR - prev.minR) >= MOVE_THRESHOLD;
    }

    const interval = setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!panRef.current || !zoomRef.current) return;

      const bounds = viewBoundsCR(panRef.current, zoomRef.current, window.innerWidth, window.innerHeight, 10);
      if (!meaningfullyMoved(lastViewportRef.current, bounds)) return;

      lastViewportRef.current = bounds;
      safeSend({ type: 'VIEWPORT_SUB', sessionId, ...bounds });
    }, VIEWPORT_POLL_MS);

    return () => clearInterval(interval);
  }, [panRef, zoomRef, safeSend, sessionId]);

  return { emitTileCapture, emitTileSiege, emitFortUpdate, connected };
}
