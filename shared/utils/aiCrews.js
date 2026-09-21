// Pure rules for AI players founding and joining crews (moved from Game.jsx).
import { defaultCrewSubchannels } from "../constants/chat.js";

export const AI_CREW_COST = 500; // gems to found a crew
export const AI_CREW_CAP = 100;

// One crew tick. aiPlayerIds: e.g. ["ai_pirates_3", ...]. founders: Set of ids that
// may found a crew. gemsOf(id) returns an AI's gems.
// Returns {crews, gems: {playerId: newGems}}; crews is the same array when nothing changed.
export function aiCrewTick({ crews, aiPlayerIds, founders, gemsOf, now }) {
  const byId = new Map(crews.map(c => [c.id, c]));
  const order = crews.map(c => c.id);
  const inCrew = new Set();
  for (const crew of crews) for (const m of (crew.members || [])) inCrew.add(m);
  const gems = {};
  let changed = false;

  for (const playerId of aiPlayerIds) {
    if (inCrew.has(playerId)) continue;
    const fk = playerId.split("_")[1];

    // Founders create a crew if they can afford it.
    if (founders.has(playerId)) {
      const have = gemsOf(playerId) ?? 0;
      if (have >= AI_CREW_COST) {
        const sameFaction = order.filter(id => byId.get(id).faction === fk).length;
        const crew = {
          id: `crew_ai_${playerId}_${now}`,
          name: `${fk.charAt(0).toUpperCase() + fk.slice(1)} ${["Vanguard","Legion","Order"][sameFaction] || "Band"}`,
          abbr: fk.slice(0, 4).toUpperCase(), faction: fk, members: [playerId], cap: AI_CREW_CAP,
          founder: playerId, subChannels: defaultCrewSubchannels(),
        };
        byId.set(crew.id, crew); order.push(crew.id);
        gems[playerId] = have - AI_CREW_COST;
        inCrew.add(playerId); changed = true;
        continue;
      }
    }

    // Everyone else joins the first same-faction crew with space (latest version of it).
    const targetId = order.find(id => { const c = byId.get(id); return c.faction === fk && (c.members || []).length < AI_CREW_CAP; });
    if (targetId) {
      const target = byId.get(targetId);
      byId.set(targetId, { ...target, members: [...(target.members || []), playerId] });
      inCrew.add(playerId); changed = true;
    }
  }
  return { crews: changed ? order.map(id => byId.get(id)) : crews, gems };
}
