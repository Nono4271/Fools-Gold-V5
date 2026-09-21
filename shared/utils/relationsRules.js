// Pure relations rules — friend requests and the blacklist, from the local
// viewer's point of view (today that's always the single real player; see
// shared/utils/chatRules.js for the same one-real-player assumption). A real
// server can adopt these exact status transitions later with zero rewrite.
//
// `relations` is a flat map: { [otherPlayerId]: RELATION_STATUS value }.
// Every function is pure — takes a relations map, returns a new one (or the
// same object when nothing changed, so callers can skip a re-render/write).
import { RELATION_STATUS } from "../constants/relations.js";

export function statusOf(relations, id) {
  return relations?.[id] || RELATION_STATUS.none;
}

function withStatus(relations, id, status) {
  return { ...relations, [id]: status };
}

function withoutId(relations, id) {
  if (!relations || !(id in relations)) return relations || {};
  const { [id]: _omit, ...rest } = relations; // eslint-disable-line no-unused-vars
  return rest;
}

// Viewer sends a request to `id`. A mutual case — `id` already has a pending
// request in to the viewer — resolves straight to friends, same as any real
// request system. No-ops if blocked, already pending out, or already friends.
export function sendRequest(relations, id) {
  const s = statusOf(relations, id);
  if (s === RELATION_STATUS.blocked || s === RELATION_STATUS.pendingOut || s === RELATION_STATUS.friend) return relations || {};
  if (s === RELATION_STATUS.pendingIn) return withStatus(relations, id, RELATION_STATUS.friend);
  return withStatus(relations, id, RELATION_STATUS.pendingOut);
}

// An incoming request arrives from `id` (kept for a real server / testing —
// nothing in this local sandbox originates one today, since there's no other
// real player to send one). No-op unless the relation is currently "none".
export function receiveRequest(relations, id) {
  const s = statusOf(relations, id);
  if (s !== RELATION_STATUS.none) return relations || {};
  return withStatus(relations, id, RELATION_STATUS.pendingIn);
}

export function acceptRequest(relations, id) {
  return statusOf(relations, id) === RELATION_STATUS.pendingIn
    ? withStatus(relations, id, RELATION_STATUS.friend) : (relations || {});
}

// The request the viewer sent was accepted by the other side. pendingOut ->
// friend. (Distinct from acceptRequest, which is the viewer accepting an
// incoming one.) Used to simulate an AI auto-accepting — see useRelations.js.
export function confirmRequest(relations, id) {
  return statusOf(relations, id) === RELATION_STATUS.pendingOut
    ? withStatus(relations, id, RELATION_STATUS.friend) : (relations || {});
}

export function declineRequest(relations, id) {
  return statusOf(relations, id) === RELATION_STATUS.pendingIn ? withoutId(relations, id) : (relations || {});
}

export function cancelRequest(relations, id) {
  return statusOf(relations, id) === RELATION_STATUS.pendingOut ? withoutId(relations, id) : (relations || {});
}

export function removeFriend(relations, id) {
  return statusOf(relations, id) === RELATION_STATUS.friend ? withoutId(relations, id) : (relations || {});
}

// Blocking always wins — overwrites a pending request or an existing friend.
export function block(relations, id) {
  return withStatus(relations, id, RELATION_STATUS.blocked);
}

export function unblock(relations, id) {
  return statusOf(relations, id) === RELATION_STATUS.blocked ? withoutId(relations, id) : (relations || {});
}

// ids at a given status, alphabetical for a stable, testable order.
export function listByStatus(relations, status) {
  return Object.entries(relations || {})
    .filter(([, s]) => s === status)
    .map(([id]) => id)
    .sort();
}

// Case-insensitive substring match on name or id, for the "Add" search box.
// `candidates`: [{ id, name }]. Returns the matching candidates, name-sorted.
export function searchCandidates(query, candidates) {
  const q = (query || "").trim().toLowerCase();
  const pool = candidates || [];
  const matches = q
    ? pool.filter(c => c.name?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q))
    : pool;
  return [...matches].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
}
