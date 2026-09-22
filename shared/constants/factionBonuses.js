// Per-faction gameplay bonus — one real, "vanilla" perk per faction, owner-
// specified (2026-09-22) and randomly assigned one-to-one across the 8
// factions. Deliberately modest: no faction is strictly better than another,
// each just leans a little toward a different part of the game.
//
// `value` is a fraction (0.10 = 10%) for every percentage-based bonus, and a
// flat amount for eggCap. `kind` says how a consumer should apply it:
//   - "reduceTime"  → multiply a duration by (1 - value)
//   - "reduceCost"  → multiply a cost by (1 - value)
//   - "addRate"     → multiply a speed/rate/yield by (1 + value)
//   - "addFlat"     → add value directly (eggCap)
export const FACTION_BONUSES = {
  pirates:        { key: "trainTime",   kind: "reduceTime", value: 0.10, label: "-10% Training Time" },
  nightcreatures:  { key: "trainCost",   kind: "reduceCost", value: 0.10, label: "-10% Training Cost" },
  ashen_dead:      { key: "marchSpeed",  kind: "addRate",    value: 0.10, label: "+10% March Speed" },
  dragons:         { key: "gatherYield", kind: "addRate",    value: 0.10, label: "+10% Resources from Gathering" },
  holyknights:     { key: "tileYield",   kind: "addRate",    value: 0.05, label: "+5% Resource Production" },
  wizards:  { key: "pveDmg",      kind: "addRate",    value: 0.05, label: "+5% Damage in PvE Battles" },
  orcs:            { key: "eggCap",      kind: "addFlat",    value: 5,    label: "+5 Max Dragon Eggs" },
  coldborns:       { key: "healSpeed",   kind: "reduceTime", value: 0.10, label: "-10% Healing Time" },
};

export function factionBonus(facKey) {
  return FACTION_BONUSES[facKey] ?? null;
}

// Returns the bonus's `value` if this faction's bonus matches `bonusKey`,
// else the given neutral default (0 for percentages, 0 for eggCap).
export function factionBonusValue(facKey, bonusKey, neutral = 0) {
  const b = FACTION_BONUSES[facKey];
  return (b && b.key === bonusKey) ? b.value : neutral;
}
