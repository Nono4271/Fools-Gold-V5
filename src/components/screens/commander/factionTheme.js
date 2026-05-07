import { respectCost, RESPECT_MAX } from "../../../../shared/constants/heroes.js";

export const RARITY_ORDER = { champion: 0, veteran: 1, soldier: 2 };

export const GEAR_RARITY_COLORS = { common: "#8a8a8a", rare: "#4488cc", epic: "#a855f7", legendary: "#f0c040" };

export const FACTION_THEME = {
  pirates:       { color: "#d4832a", accent: "#ffc060" },
  marines:       { color: "#4488cc", accent: "#80c0ff" },
  bountyhunters: { color: "#9955dd", accent: "#cc88ff" },
  merfolk:       { color: "#30b8c8", accent: "#70eef5" },
  orcs:          { color: "#6aa830", accent: "#aaff66" },
  dragons:       { color: "#cc3030", accent: "#ff8855" },
};

export function getRespectInfo(cmd) {
  const rLvl = cmd.respectLevel ?? 0;
  const rPts = cmd.respectPoints ?? 0;
  let spent = 0;
  for (let i = 0; i < rLvl; i++) spent += respectCost(i);
  const intoLvl = rPts - spent;
  const cost = respectCost(Math.min(rLvl, RESPECT_MAX - 1));
  const pct = rLvl >= RESPECT_MAX ? 100 : Math.min(100, Math.round((intoLvl / cost) * 100));
  return { rLvl, intoLvl, cost, pct };
}
