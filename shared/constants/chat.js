// Chat constants: channel types, message shape, limits. Pure data — no framework,
// no storage. src/hooks/useChat.js wires this into local React state.

export const CHANNEL_TYPES = {
  world:  "world",   // everyone
  faction:"faction",  // same tile.faction / player faction field
  crew:   "crew",     // crew.members.includes(playerId)
  dm:     "dm",       // exactly 2 participants
  group:  "group",    // 3+ participants
};

export const MESSAGE_MAX_LEN = 280;

// Minimum gap between two messages from the same sender, in the same channel,
// in ms. 0 = no rate limit. Kept generous since this is a local single-player
// sandbox today; a real server can tighten it later without changing the shape.
export const POST_COOLDOWN_MS = 800;

// message: { id, channelId, senderId, senderName, text, ts }
export function isMessageShape(m) {
  return !!m && typeof m.id === "string" && typeof m.channelId === "string"
    && typeof m.senderId === "string" && typeof m.senderName === "string"
    && typeof m.text === "string" && typeof m.ts === "number";
}

// channel: { id, type, name, faction?, crewId?, participants? }
export function isChannelShape(c) {
  return !!c && typeof c.id === "string" && typeof CHANNEL_TYPES[c.type] === "string";
}

// ── Sub-channels — nested channels inside crew and group chat ONLY (world/
// faction/dm stay flat). Rules live in shared/utils/subchannels.js; this
// file just holds the shared shape/limit/defaults, same split as the rest
// of chat (constants here, rules in utils/).
//
// subchannel: { id, name, locked, leaderOnly }
//   locked     — #Announcement/#General: can't be deleted or reordered.
//   leaderOnly — only the crew's founder (crew.founder) or a group's
//                creator (channel.ownerId) may post; read-only for everyone
//                else. Used for #Announcement today. There's no officer
//                rank yet — extend the leader-only check in
//                subchannels.js (not this flag) if/when one gets added.
export const MAX_SUBCHANNELS = 5;

export function defaultCrewSubchannels() {
  return [
    { id: "announcement", name: "Announcement", locked: true, leaderOnly: true },
    { id: "general", name: "General", locked: true, leaderOnly: false },
  ];
}

export function defaultGroupSubchannels() {
  return [{ id: "general", name: "General", locked: true, leaderOnly: false }];
}

export function isSubchannelShape(s) {
  return !!s && typeof s.id === "string" && typeof s.name === "string"
    && typeof s.locked === "boolean" && typeof s.leaderOnly === "boolean";
}
