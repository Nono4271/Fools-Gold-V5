// Pure sub-channel rules — nested channels inside crew and group chat ONLY
// (world/faction/dm stay flat, per the owner's spec). A crew starts with two
// locked sub-channels (#Announcement, leader-only to post; #General, open to
// all members); a group starts with one (#General, also open to all). Only
// the crew's founder (crew.founder) or a group's creator (channel.ownerId)
// can add/remove/reorder sub-channels, and #Announcement/#General can never
// be deleted or moved. Max MAX_SUBCHANNELS (5) sub-channels total.
//
// A sub-channel's actual message-store key is its "composite id" —
// `${parentChannelId}::${subId}` (subchannelId/parseSubchannelId below). The
// bare parent channel id (crew_/group_...) still identifies the container
// for membership checks (canPost) but is never itself a postable channel
// once sub-channels exist — see src/hooks/useChat.js's sendMessage.
import { MAX_SUBCHANNELS, defaultCrewSubchannels, defaultGroupSubchannels } from "../constants/chat.js";
import { canPost, findCrew } from "./chatRules.js";

export function subchannelId(parentId, subId) {
  return `${parentId}::${subId}`;
}

export function parseSubchannelId(compositeId) {
  const i = typeof compositeId === "string" ? compositeId.indexOf("::") : -1;
  if (i < 0) return null;
  return { parentId: compositeId.slice(0, i), subId: compositeId.slice(i + 2) };
}

// The sub-channels a container channel currently has — defaults applied for
// a crew/group that predates this feature. ctx: { crews } — a crew's
// sub-channels live on the crew object; a group's live on the group channel
// object itself (it IS the object resolveChannelsFor hands back).
export function subchannelsOf(parentChannel, ctx = {}) {
  if (!parentChannel) return [];
  if (parentChannel.type === "crew") {
    const crew = findCrew(parentChannel, ctx);
    const list = crew?.subChannels;
    return list && list.length ? list : defaultCrewSubchannels();
  }
  if (parentChannel.type === "group") {
    const list = parentChannel.subChannels;
    return list && list.length ? list : defaultGroupSubchannels();
  }
  return [];
}

function slugify(name, existingIds) {
  const base = (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "sub";
  let id = base, n = 2;
  while (existingIds.includes(id)) id = `${base}_${n++}`;
  return id;
}

// Appends a new, unlocked, open-to-everyone sub-channel. No-op — same array
// back — on an empty name or once the cap is hit.
export function addSubchannel(subChannels, name) {
  const list = subChannels || [];
  const trimmed = (name || "").trim().slice(0, 24);
  if (!trimmed || list.length >= MAX_SUBCHANNELS) return list;
  const id = slugify(trimmed, list.map(s => s.id));
  return [...list, { id, name: trimmed, locked: false, leaderOnly: false }];
}

// No-op if `id` doesn't exist or is locked (#Announcement/#General).
export function removeSubchannel(subChannels, id) {
  const list = subChannels || [];
  const target = list.find(s => s.id === id);
  if (!target || target.locked) return list;
  return list.filter(s => s.id !== id);
}

// Swaps `id` with its neighbor one slot over (`direction`: -1 up, +1 down).
// No-op if `id` is locked, out of range, or the neighbor slot is locked —
// locked sub-channels stay pinned in place, so nothing can move past them.
export function moveSubchannel(subChannels, id, direction) {
  const list = subChannels || [];
  const idx = list.findIndex(s => s.id === id);
  if (idx < 0 || list[idx].locked) return list;
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= list.length || list[swapIdx].locked) return list;
  const next = [...list];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  return next;
}

// Crew: only the founder. Group: only whoever started it.
export function canManageSubchannels(playerId, parentChannel, ctx = {}) {
  if (!playerId || !parentChannel) return false;
  if (parentChannel.type === "crew") {
    const crew = findCrew(parentChannel, ctx);
    return !!crew && crew.founder === playerId;
  }
  if (parentChannel.type === "group") {
    return !!parentChannel.ownerId && parentChannel.ownerId === playerId;
  }
  return false;
}

// Must be a member/participant of the parent AND, for a leader-only
// sub-channel (#Announcement today), able to manage it. Everyone who can
// see the parent can still READ a leader-only sub-channel — only posting is
// gated.
export function canPostInSubchannel(playerId, parentChannel, subchannel, ctx = {}) {
  if (!canPost(playerId, parentChannel, ctx)) return false;
  if (!subchannel) return false;
  if (!subchannel.leaderOnly) return true;
  return canManageSubchannels(playerId, parentChannel, ctx);
}
