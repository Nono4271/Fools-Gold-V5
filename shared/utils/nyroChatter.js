// Nyro's own flavor chatter — deterministic/seeded, same technique as
// shared/utils/aiChatter.js (NOT a live LLM call), but kept separate from
// that module's ambient multi-AI system: Nyro is a single named companion,
// not one of many interchangeable faction AIs, and (unlike the ambient
// system) Nyro is eligible to speak in DMs/groups the player invited them
// into, and is NEVER eligible for World chat.
import { CHANNEL_TYPES } from "../constants/chat.js";
import { NYRO_ID, NYRO_NAME } from "../constants/nyro.js";
import { createMessage } from "./chatRules.js";
import { seededRng, hashStr, FACTION_LINES, GENERIC_LINES } from "./aiChatter.js";

// In Faction or crew chat, Nyro talks like the rest of that faction (reuses
// aiChatter.js's per-faction pools) — Nyro always shares the player's
// faction, so this reads naturally. In a DM or group, it's a one-on-one (or
// small-group) conversation with the player, so Nyro gets its own, more
// personal voice instead.
const NYRO_PERSONAL_LINES = [
  "Good to be fighting alongside you again.",
  "Let me know if you need a hand with anything.",
  "Keeping an eye on things — all quiet for now.",
  "Solid work out there today.",
  "Always got your back, whatever you need.",
  "Scouted around a bit, nothing to report yet.",
  "Ready when you are.",
  "Been a good run lately, hasn't it?",
];

// Is Nyro actually present in `channel` right now? ctx: { playerFacKey,
// crews } — a crew's membership lives on the crew object (shared/utils/
// subchannels.js's `findCrew` isn't used here since the caller already
// resolves the right crew/sub-channel; see src/hooks/useChat.js).
export function nyroEligible(channel, ctx = {}) {
  if (!channel) return false;
  switch (channel.type) {
    case CHANNEL_TYPES.faction:
      return !!ctx.playerFacKey && channel.faction === ctx.playerFacKey;
    case CHANNEL_TYPES.crew: {
      const crew = (ctx.crews || []).find(c => c.id === channel.crewId);
      return !!crew && (crew.members || []).includes(NYRO_ID);
    }
    case CHANNEL_TYPES.dm:
    case CHANNEL_TYPES.group:
      return (channel.participants || []).includes(NYRO_ID);
    default:
      return false; // never World
  }
}

function nyroLine(channel, ctx, seed) {
  const rng = seededRng(seed);
  if (channel.type === CHANNEL_TYPES.faction || channel.type === CHANNEL_TYPES.crew) {
    const pool = FACTION_LINES[ctx.playerFacKey] || GENERIC_LINES;
    return pool[Math.floor(rng() * pool.length)];
  }
  return NYRO_PERSONAL_LINES[Math.floor(rng() * NYRO_PERSONAL_LINES.length)];
}

// Builds one Nyro message for `channel` (its `id` should already be the
// real postable channel id — the caller resolves a crew's #General
// sub-channel first, same as the ambient system does). Returns null if
// Nyro isn't eligible for this channel or there's no line to say (never
// happens today, but mirrors generateAiChatter's null-safety).
export function generateNyroChatter(channel, ctx = {}, seed) {
  if (!nyroEligible(channel, ctx)) return null;
  const text = nyroLine(channel, ctx, hashStr(channel.id) + (seed | 0) + 1);
  if (!text) return null;
  return createMessage({
    channelId: channel.id, senderId: NYRO_ID, senderName: NYRO_NAME,
    text, now: ctx.now ?? Date.now(),
  });
}
