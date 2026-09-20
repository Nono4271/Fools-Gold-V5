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
