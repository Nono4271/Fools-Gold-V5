// ─────────────────────────────────────────────────────────────────────────────
//  playerIdentity.js — a stable per-browser player id, persisted in
//  localStorage. NOT real authentication (no login, no server-side secret) —
//  this is the minimal identity binding needed so the multiplayer server can
//  tell "this connection" from "some other connection" and attribute a
//  capture to the connection that actually made it (see server/index.js's
//  ws._playerId), rather than trusting whatever the client claims. A real
//  account system would replace this; this is scoped to close the
//  "client can claim to be anyone" gap for now, not to build auth.
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "foolsgold_player_id";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getOrCreatePlayerId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private browsing, storage disabled, etc.) —
    // degrade gracefully to a session-only id rather than crash. It just
    // won't survive a reload, same as before this change existed.
    return randomId();
  }
}
