/**
 * useServerSync.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the WebSocket connection to the Fool's Gold server and keeps the
 * client tile map in sync with the server-authoritative state.
 *
 * Responsibilities
 *   • Connect to ws://localhost:3001 when screen === "game".
 *   • On map ready, send GAME_INIT with the full tile map to seed the server.
 *   • Expose emitTileCapture / emitTileSiege helpers that:
 *       1. Apply the patch locally (optimistic update via patchTile).
 *       2. Send the event to the server.
 *       Server will broadcast TILE_PATCH back; we skip re-applying our own echo.
 *   • On incoming TILE_PATCH, apply server patches via patchTile so all clients
 *     see consistent state.
 *   • Reconnect with exponential back-off on disconnect.
 *
 * Usage (in Game.jsx):
 *   const { emitTileCapture, emitTileSiege, connected } = useServerSync({
 *     screen, tiles, mapReady, patchTile, sessionId,
 *   });
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = 'ws://localhost:3001';
const MAX_BACKOFF = 30_000; // 30 s

export function useServerSync({ screen, tiles, mapReady, patchTile, sessionId }) {
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
  const emitTileCapture = useCallback((key, patch) => {
    safeSend({
      type: 'TILE_CAPTURE',
      sessionId,
      key,
      ...patch,
    });
  }, [safeSend, sessionId]);

  /**
   * Call when siege damage is applied (garrison defeated, siege reduced).
   * Optimistic: caller already called patchTile; this syncs the server.
   */
  const emitTileSiege = useCallback((key, patch) => {
    safeSend({
      type: 'TILE_SIEGE',
      sessionId,
      key,
      ...patch,
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
            tiles, // full tile map — server stores as authoritative state
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
    ws.send(JSON.stringify({ type: 'GAME_INIT', sessionId, tiles }));
    console.log('[ServerSync] GAME_INIT sent — tiles:', Object.keys(tiles).length);
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return { emitTileCapture, emitTileSiege, connected };
}
