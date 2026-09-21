// Pure chat rules: who can post where, how channels/messages are built, and
// which channels a player currently sees. No storage, no React — a real
// server can adopt these exact functions later with zero rewrite.
//
// aiPlayerId format (shared/utils/worldTiles.js) is "ai_<faction>_<i>" and is
// the only player-identity scheme that exists today, so an AI's faction is
// read straight off its id. The real (local) player has no such id shape, so
// its faction comes from ctx.factions (a { [playerId]: factionKey } map) —
// today that's just { player: <the local player's facKey> }.
import { CHANNEL_TYPES, MESSAGE_MAX_LEN, defaultGroupSubchannels } from "../constants/chat.js";

// "ai_pirates_3" -> "pirates"; "ai_ashen_dead_0" -> "ashen_dead" (faction keys
// can contain an underscore, so everything between the leading "ai_" and the
// trailing index is the faction). null for a non-AI id.
export function aiFactionOf(playerId) {
  if (typeof playerId !== "string" || !playerId.startsWith("ai_")) return null;
  const parts = playerId.split("_");
  if (parts.length < 3) return null;
  return parts.slice(1, -1).join("_");
}

// A player's faction key, or null if it can't be resolved.
export function factionOf(playerId, ctx = {}) {
  if (ctx.factions && Object.prototype.hasOwnProperty.call(ctx.factions, playerId)) {
    return ctx.factions[playerId];
  }
  return aiFactionOf(playerId);
}

function titleCase(fk) {
  return (fk || "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function worldChannel() {
  return { id: "world", type: CHANNEL_TYPES.world, name: "World" };
}

export function factionChannel(fk) {
  return { id: `faction_${fk}`, type: CHANNEL_TYPES.faction, name: titleCase(fk), faction: fk };
}

export function crewChannel(crew) {
  return { id: `crew_${crew.id}`, type: CHANNEL_TYPES.crew, name: `[${crew.abbr}] ${crew.name}`, crewId: crew.id };
}

// Deterministic id, so the same two players always land in the same DM.
export function createDmChannel(a, b) {
  const participants = [a, b].sort();
  return { id: `dm_${participants.join("__")}`, type: CHANNEL_TYPES.dm, participants };
}

// `ownerId` is whoever started the group — the only one allowed to add or
// manage its sub-channels later (shared/utils/subchannels.js). Seeded with
// one sub-channel, #General (unlocked custom ones can be added up to
// MAX_SUBCHANNELS — see subchannels.js).
export function createGroupChannel(name, participantIds, { id, now, ownerId } = {}) {
  const participants = [...new Set(participantIds || [])];
  return {
    id: id ?? `group_${now ?? Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: CHANNEL_TYPES.group,
    name: (name || "").trim() || "Group",
    participants,
    ownerId: ownerId ?? null,
    subChannels: defaultGroupSubchannels(),
  };
}

// Exported for shared/utils/subchannels.js (crew sub-channel rules need the
// same "which crew does this channel belong to" lookup canPost uses below).
export function findCrew(channel, ctx) {
  if (channel.crew) return channel.crew; // pre-resolved, e.g. by the caller
  return (ctx?.crews || []).find(c => c.id === channel.crewId) || null;
}

// Can `playerId` post into `channel`? world = anyone; faction = same faction
// as the channel; crew = a current member of that crew; dm/group = a
// participant. Unknown channel types are always rejected.
export function canPost(playerId, channel, ctx = {}) {
  if (!playerId || !channel) return false;
  switch (channel.type) {
    case CHANNEL_TYPES.world:
      return true;
    case CHANNEL_TYPES.faction:
      return !!channel.faction && factionOf(playerId, ctx) === channel.faction;
    case CHANNEL_TYPES.crew: {
      const crew = findCrew(channel, ctx);
      return !!crew && (crew.members || []).includes(playerId);
    }
    case CHANNEL_TYPES.dm:
    case CHANNEL_TYPES.group:
      return Array.isArray(channel.participants) && channel.participants.includes(playerId);
    default:
      return false;
  }
}

// Builds a message, trimming/clipping text. Returns null for empty text (or a
// canPost failure, if a channel/ctx is supplied) so callers can no-op on it.
export function createMessage({ channelId, senderId, senderName, text, now, id, channel, ctx }) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;
  if (channel && !canPost(senderId, channel, ctx)) return null;
  return {
    id: id ?? `msg_${now}_${Math.random().toString(36).slice(2, 8)}`,
    channelId,
    senderId,
    senderName,
    text: trimmed.length > MESSAGE_MAX_LEN ? trimmed.slice(0, MESSAGE_MAX_LEN) : trimmed,
    ts: now,
  };
}

// Every channel `playerId` currently sees: their world tab, their faction tab
// (if resolvable), every crew they're a member of, and every DM/group they're
// a participant in. ctx: { crews, factions, dms, groups }.
export function resolveChannelsFor(playerId, ctx = {}) {
  const { crews = [], dms = [], groups = [] } = ctx;
  const channels = [worldChannel()];
  const fk = factionOf(playerId, ctx);
  if (fk) channels.push(factionChannel(fk));
  for (const crew of crews) {
    if ((crew.members || []).includes(playerId)) channels.push(crewChannel(crew));
  }
  for (const ch of dms) if (ch.participants?.includes(playerId)) channels.push(ch);
  for (const ch of groups) if (ch.participants?.includes(playerId)) channels.push(ch);
  return channels;
}
