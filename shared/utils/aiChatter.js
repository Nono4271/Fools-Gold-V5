// Deterministic, seedable flavor chatter for AI players/crews — cheap
// templated text, NOT a live LLM call, so World/Faction/Crew chat don't sit
// empty while there's no real multiplayer server. Reuses aiPlayerId
// ("ai_<faction>_<i>", shared/utils/worldTiles.js) and crew membership
// (shared/utils/aiCrews.js) — no new AI-identity scheme.
import { CHANNEL_TYPES } from "../constants/chat.js";
import { NYRO_ID, NYRO_NAME } from "../constants/nyro.js";
import { aiFactionOf, createMessage } from "./chatRules.js";

// Same small LCG used elsewhere in this codebase for seeded, testable
// randomness (e.g. src/workers/spawn.worker.js).
export function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}
export function hashStr(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const FACTION_TITLES = {
  pirates: "Raider", wizards: "Adept", orcs: "Warband", dragons: "Wyrmkin",
  holyknights: "Paladin", nightcreatures: "Shade", coldborns: "Frostguard", ashen_dead: "Wraith",
};

// "ai_pirates_3" -> "Raider 3". Falls back to the raw id if it isn't an AI id
// — except Nyro (shared/constants/nyro.js), a named companion whose id
// deliberately doesn't fit that shape.
export function aiDisplayName(playerId) {
  if (playerId === NYRO_ID) return NYRO_NAME;
  const fk = aiFactionOf(playerId);
  if (!fk) return playerId;
  const idx = playerId.split("_").pop();
  const title = FACTION_TITLES[fk] || fk.charAt(0).toUpperCase() + fk.slice(1);
  return `${title} ${idx}`;
}

export const FACTION_LINES = {
  pirates: [
    "Winds are fair — good day for a raid.", "Anyone spot the coastline patrols moving?",
    "Cargo's secured, splitting the haul at the keep.", "Rum's low. Someone owes the crew a run to port.",
    "Scouted a soft camp two tiles east, worth a look.", "Keep your cutlass sharp, the tide's turning.",
  ],
  wizards: [
    "The ley lines are humming tonight.", "Mana pool's topped off, ready for the next rite.",
    "Anyone else seeing strange readings near the border?", "Tomes are stacking up nicely this week.",
    "The council convenes at dusk — be ready.", "Careful with that circle, it's not fully warded.",
  ],
  orcs: [
    "WAAAGH is quiet today. Too quiet.", "Warband's hungry, someone find a camp to crack.",
    "Good scrap this morning, took a fort clean.", "Sharpen up, scouts say movement to the north.",
    "Cap's calling a muster at the keep.", "Anyone else's troops itching for a fight?",
  ],
  dragons: [
    "The skies are clear for a flight tonight.", "Hoard's growing steady, good work all around.",
    "Spotted a rival wyrmkin scouting our border.", "Fire's banked, ready to march at first word.",
    "Keep the eggs guarded, don't get careless.", "Overlord wants a report by nightfall.",
  ],
  holyknights: [
    "Light holds the line, as it always has.", "Chapel's finished the blessing rite for the week.",
    "Patrol reports the eastern road is clear.", "Keep faith, reinforcements are on the way.",
    "A quiet vigil tonight, all's well.", "New recruits arrived at the keep this morning.",
  ],
  nightcreatures: [
    "The dark favors us tonight.", "Shadows moved near the old camp again.",
    "Feeding's done, back on watch.", "Something stirs past the border — stay sharp.",
    "The pack regroups at moonrise.", "Quiet hunt tonight, nothing worth reporting.",
  ],
  coldborns: [
    "Frost holds firm on the northern line.", "Ice road's clear, supplies moving well.",
    "Spotted tracks near the border, could be scouts.", "Keep warm, storm's rolling in from the west.",
    "Garrison's steady, nothing to report.", "The chill favors us — enemy troops move slower.",
  ],
  ashen_dead: [
    "The legion stirs once more.", "Ashfall's thick near the old battlefield tonight.",
    "Reinforcements rise from the west camp.", "Nothing troubles the dead for long.",
    "The march continues, as it always does.", "Old bones, new orders — muster at the keep.",
  ],
};
export const GENERIC_LINES = [
  "All quiet on this front.", "Anyone else seeing activity nearby?", "Reporting in, nothing new.",
];

const CREW_LINES = [
  "Good work out there today, {crew}.", "{crew}, form up — muster at the keep.",
  "Anyone in {crew} free to help with an upgrade?", "Nice haul this week, {crew}.",
  "Keep an eye on the border, {crew}.", "{crew} is looking strong this season.",
];

function pickFrom(pool, seed) {
  if (!pool.length) return null;
  const rng = seededRng(seed);
  return pool[Math.floor(rng() * pool.length)];
}

function chatterLine(channel, fk, crewName, seed) {
  if (channel.type === CHANNEL_TYPES.crew) {
    const line = pickFrom(CREW_LINES, seed);
    return line ? line.replace("{crew}", crewName || "the crew") : null;
  }
  return pickFrom(FACTION_LINES[fk] || GENERIC_LINES, seed);
}

// AI players eligible to speak in `channel` right now, given ctx.aiPlayerIds
// (every known AI id) and ctx.crews.
export function eligibleAiSenders(channel, ctx = {}) {
  const { aiPlayerIds = [], crews = [] } = ctx;
  switch (channel.type) {
    case CHANNEL_TYPES.world:
      return aiPlayerIds;
    case CHANNEL_TYPES.faction:
      return aiPlayerIds.filter(id => aiFactionOf(id) === channel.faction);
    case CHANNEL_TYPES.crew: {
      const crew = crews.find(c => c.id === channel.crewId);
      return (crew?.members || []).filter(id => aiFactionOf(id) != null);
    }
    default:
      return [];
  }
}

// Builds one flavor message for `channel`, or null if no AI is eligible to
// speak there (e.g. an empty crew) or the channel type doesn't get chatter
// (dm/group are player-only). `seed` makes the pick (sender + line)
// reproducible for the same channel/tick.
export function generateAiChatter(channel, ctx = {}, seed) {
  const senders = eligibleAiSenders(channel, ctx);
  if (!senders.length) return null;
  const rng = seededRng(seed);
  const sender = senders[Math.floor(rng() * senders.length)];
  const fk = aiFactionOf(sender);
  const crew = channel.type === CHANNEL_TYPES.crew
    ? (ctx.crews || []).find(c => c.id === channel.crewId) : null;
  const text = chatterLine(channel, fk, crew?.name, hashStr(sender) + (seed | 0) + 1);
  if (!text) return null;
  return createMessage({
    channelId: channel.id, senderId: sender, senderName: ctx.nameOf?.(sender) ?? aiDisplayName(sender),
    text, now: ctx.now ?? Date.now(),
  });
}
