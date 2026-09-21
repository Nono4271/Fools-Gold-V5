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
import { resolveApiBase } from "./apiBase.js";

const STORAGE_KEY = "foolsgold_player_id";
const SESSION_KEY = "foolsgold_session_id";

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

// ─── Session continuity ─────────────────────────────────────────────────
// The server already saves each session's tile state to disk
// (server/index.js) — this is what lets a *browser* resume it: the
// sessionId used to persist rather than being regenerated every load.
function randomSessionId() {
  return `fg-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomSessionId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return randomSessionId();
  }
}

function setSessionId(id) {
  try { localStorage.setItem(SESSION_KEY, id); } catch { /* best-effort */ }
}

// ─── Optional username/password accounts (server/auth.js) ─────────────────
// Logging in doesn't replace this file's whole scheme — it just overwrites
// the stored id with the server-issued accountId, so the same playerId
// (and everything server-side attributed to it) now follows the player to
// any browser/device they log into, instead of staying pinned to one
// browser's localStorage.
const USERNAME_KEY = "foolsgold_username";

export function getAccountUsername() {
  try { return localStorage.getItem(USERNAME_KEY); } catch { return null; }
}

function adoptAccount({ accountId, username, lastSessionId }) {
  try {
    localStorage.setItem(STORAGE_KEY, accountId);
    localStorage.setItem(USERNAME_KEY, username);
  } catch { /* best-effort — still return the id below */ }
  // If this account has a known session from a previous login (any browser),
  // resume it instead of whatever sessionId this browser already had —
  // that's what makes "log in" actually continue your progress.
  if (lastSessionId) setSessionId(lastSessionId);
  return accountId;
}

// Base URL of the game server's HTTP API (see apiBase.js). Empty = same origin.
const API_BASE = resolveApiBase({
  apiUrl: import.meta.env?.VITE_API_URL,
  wsUrl:  import.meta.env?.VITE_WS_URL,
});

async function postAuth(path, username, password) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    // Network error / CORS / mixed content (https page -> http server).
    throw new Error("Can't reach the game server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") {
    // A static host answered (404/405, or the SPA fallback returning HTML):
    // there is no game server behind /api at this address.
    throw new Error(`The account server isn't reachable from this site (HTTP ${res.status}). The game server address isn't configured.`);
  }
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (HTTP ${res.status})`);
  if (!data.accountId || !data.username) throw new Error("Unexpected response from the account server.");
  return data;
}

export async function registerAccount(username, password) {
  const data = await postAuth("/api/register", username, password);
  return adoptAccount(data);
}

export async function loginAccount(username, password) {
  const data = await postAuth("/api/login", username, password);
  return adoptAccount(data);
}
