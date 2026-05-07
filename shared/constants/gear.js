/* ─────────────────────────────────────────────────────────────────────────────
   gear.js — V4 Gear System (Design Doc §5)
   4 slots: Helmet, Armor, Bracers, Accessory
   4 rarities: Common, Rare, Epic, Legendary
   Strengthening: 1-5 stars via same-rarity fodder
   Refining: gold stars via exact duplicate copies

   ── Stat philosophy ──────────────────────────────────────────────────────────
   PRIMARY stats  → ATK | FOC | SPD  (the commander's own live stats)
   SECONDARY stats → ATK, FOC, SPD  (also commander stats, smaller values)
                   + ARMY_ATK, ARMY_FOC, ARMY_SPD, ARMY_SIEGE
                     (army boosts — tiny base because they apply per-troop)

   ── Balance caps ─────────────────────────────────────────────────────────────
   • Commander stat primary  — max +30 at Legendary 5★ (base 7 × mult 2.6 × stars 1.60 ≈ 29)
   • Commander stat secondary — lower base (4) so realistic peak ~14–17
   • Army boosts             — max +5 at Legendary 5★ + refine (base 1.0 × 2.6 × 1.6 × 1.25 ≈ 5.2)
   • No stat appears twice on the same piece
───────────────────────────────────────────────────────────────────────────── */

// ── Gear rarity ───────────────────────────────────────────────────────────────
export const GEAR_RARITY = {
  common:    { n: "Common",    color: "#8a8a8a", secSlots: 1, statMult: 1.0  },
  rare:      { n: "Rare",      color: "#4488cc", secSlots: 2, statMult: 1.4  },
  epic:      { n: "Epic",      color: "#a855f7", secSlots: 3, statMult: 1.9  },
  legendary: { n: "Legendary", color: "#f0c040", secSlots: 4, statMult: 2.6  },
};

// Pull rates for gear slots
export const GEAR_PULL_RATES = {
  common:    0.85,
  rare:      0.10,
  epic:      0.04,
  legendary: 0.01,
};

// ── Gear slots ────────────────────────────────────────────────────────────────
export const GEAR_SLOTS = {
  helmet:    { n: "Helmet",    icon: "⛑",  primaryAffinity: "foc" },
  armor:     { n: "Armor",     icon: "🛡",  primaryAffinity: "spd" },
  bracers:   { n: "Bracers",   icon: "🥊",  primaryAffinity: "atk" },
  accessory: { n: "Accessory", icon: "💍",  primaryAffinity: "mixed" },
};
export const GEAR_SLOT_KEYS = Object.keys(GEAR_SLOTS);

// ── Stat definitions ──────────────────────────────────────────────────────────
//
// primary: true  → eligible to be a piece's main stat
// army: true     → this is a troop-boost stat (secondary-only)
//
// Base values are intentionally small so the full scaling chain stays sane:
//   primary  base 7  × statMult(max 2.6) × starBonus(max 1.60) ≈ +29  ✓
//   secondary base 4 × statMult(max 2.6) × starBonus(max 1.60) × refine(1.25) ≈ +21 max
//   army     base 1.0 × statMult(max 2.6) × starBonus(max 1.60) × refine(1.25) ≈ +5.2  ✓

const STAT_BASE = {
  // Primary-eligible commander stats
  ATK:        { base: 7,   label: "Attack",       icon: "⚔",   primary: true,  army: false },
  FOC:        { base: 7,   label: "Focus",         icon: "✦",   primary: true,  army: false },
  SPD:        { base: 7,   label: "Speed",         icon: "💨",  primary: true,  army: false },

  // Army boost stats (secondary only — apply to every individual troop)
  ARMY_ATK:   { base: 1.0, label: "+Army ATK",    icon: "⚔🛡",  primary: false, army: true  },
  ARMY_FOC:   { base: 1.0, label: "+Army FOC",    icon: "✦🛡",  primary: false, army: true  },
  ARMY_SPD:   { base: 1.0, label: "+Army SPD",    icon: "💨🛡", primary: false, army: true  },
  ARMY_SIEGE: { base: 1.0, label: "+Army Siege",  icon: "🪨🛡",  primary: false, army: true  },
};

// Full secondary pool — no stat ever appears twice on the same piece
const SEC_STAT_POOL = [
  "ATK", "FOC", "SPD",
  "ARMY_ATK", "ARMY_FOC", "ARMY_SPD", "ARMY_SIEGE",
];

// ── Gear piece definitions ────────────────────────────────────────────────────
// primaryStat must be ATK | FOC | SPD only.
// Flavour naming still reflects the slot fantasy; stat choice reflects piece identity.
export const GEAR_PIECES = [
  // ── Helmets  (themed toward FOC — commander mental/tactical stat) ──
  { id:"g1",  n:"Iron Skullcap",      slot:"helmet",    alignment:null,        primaryStat:"ATK", rarity:"common",    icon:"⛑" },
  { id:"g2",  n:"Warlord's Helm",     slot:"helmet",    alignment:"creatures", primaryStat:"ATK", rarity:"rare",      icon:"🪖" },
  { id:"g3",  n:"Admiral's Tricorne", slot:"helmet",    alignment:"humans",    primaryStat:"FOC", rarity:"rare",      icon:"🎩" },
  { id:"g4",  n:"Dragonscale Crest",  slot:"helmet",    alignment:"creatures", primaryStat:"FOC", rarity:"epic",      icon:"🐉" },
  { id:"g5",  n:"Arcane Circlet",     slot:"helmet",    alignment:"humans",    primaryStat:"FOC", rarity:"epic",      icon:"💫" },
  { id:"g6",  n:"Crown of Dominion",  slot:"helmet",    alignment:null,        primaryStat:"FOC", rarity:"legendary", icon:"👑" },

  // ── Armor  (themed toward SPD — mobility/reaction) ──
  { id:"g7",  n:"Leather Vest",       slot:"armor",     alignment:null,        primaryStat:"SPD", rarity:"common",    icon:"🛡" },
  { id:"g8",  n:"Corsair Coat",       slot:"armor",     alignment:"humans",    primaryStat:"SPD", rarity:"rare",      icon:"🧥" },
  { id:"g9",  n:"Boneplate Mail",     slot:"armor",     alignment:"creatures", primaryStat:"ATK", rarity:"rare",      icon:"💀" },
  { id:"g10", n:"Ember Aegis",        slot:"armor",     alignment:"creatures", primaryStat:"ATK", rarity:"epic",      icon:"🔥" },
  { id:"g11", n:"Tidal Breastplate",  slot:"armor",     alignment:"humans",    primaryStat:"SPD", rarity:"epic",      icon:"🌊" },
  { id:"g12", n:"Mantle of the Deep", slot:"armor",     alignment:null,        primaryStat:"SPD", rarity:"legendary", icon:"⚜" },

  // ── Bracers  (themed toward ATK — raw striking power) ──
  { id:"g13", n:"Crude Gauntlets",    slot:"bracers",   alignment:null,        primaryStat:"ATK", rarity:"common",    icon:"🥊" },
  { id:"g14", n:"Duelist's Wraps",    slot:"bracers",   alignment:"humans",    primaryStat:"ATK", rarity:"rare",      icon:"⚔" },
  { id:"g15", n:"Tuskbound Grips",    slot:"bracers",   alignment:"creatures", primaryStat:"ATK", rarity:"rare",      icon:"🪓" },
  { id:"g16", n:"Arcane Channels",    slot:"bracers",   alignment:"humans",    primaryStat:"FOC", rarity:"epic",      icon:"✨" },
  { id:"g17", n:"Siege Fists",        slot:"bracers",   alignment:"creatures", primaryStat:"ATK", rarity:"epic",      icon:"💥" },
  { id:"g18", n:"Conqueror's Vambraces",slot:"bracers", alignment:null,        primaryStat:"ATK", rarity:"legendary", icon:"🏆" },

  // ── Accessories  (mixed — SPD or FOC utility) ──
  { id:"g19", n:"Copper Amulet",      slot:"accessory", alignment:null,        primaryStat:"SPD", rarity:"common",    icon:"💍" },
  { id:"g20", n:"Navigator's Compass",slot:"accessory", alignment:"humans",    primaryStat:"SPD", rarity:"rare",      icon:"🧭" },
  { id:"g21", n:"Shaman's Totem",     slot:"accessory", alignment:"creatures", primaryStat:"FOC", rarity:"rare",      icon:"🪬" },
  { id:"g22", n:"Warchief's Standard",slot:"accessory", alignment:"creatures", primaryStat:"ATK", rarity:"epic",      icon:"🏴" },
  { id:"g23", n:"Admiral's Signet",   slot:"accessory", alignment:"humans",    primaryStat:"FOC", rarity:"epic",      icon:"🔑" },
  { id:"g24", n:"Relic of Ages",      slot:"accessory", alignment:null,        primaryStat:"SPD", rarity:"legendary", icon:"⚱" },
];

// ── Stat value helpers ────────────────────────────────────────────────────────
export function gearStatValue(statKey, rarityKey, stars = 0) {
  const base = STAT_BASE[statKey]?.base ?? 7;
  const mult = GEAR_RARITY[rarityKey]?.statMult ?? 1;
  const starBonus = 1 + stars * 0.12; // +12% per star (max ×1.60 at 5★)
  const raw = base * mult * starBonus;
  // Army stats shown as decimals (e.g. 3.2); commander stats as integers
  return STAT_BASE[statKey]?.army ? +raw.toFixed(1) : Math.round(raw);
}

// Roll random secondary stats for a piece — no stat duplicates, primary stat excluded
function rollSecStats(rarityKey, primaryStat) {
  const count = GEAR_RARITY[rarityKey]?.secSlots ?? 1;
  // Exclude the primary stat so it can't appear twice
  const pool = SEC_STAT_POOL.filter(k => k !== primaryStat);
  const stats = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const key = pool.splice(idx, 1)[0];
    // Secondary commander stats use base 4 (lower than primary base 7)
    const secBase = STAT_BASE[key]?.army ? STAT_BASE[key].base : 4;
    const mult = GEAR_RARITY[rarityKey]?.statMult ?? 1;
    // Roll 30–55% of full value for some variance
    const rollFrac = 0.30 + Math.random() * 0.25;
    const raw = secBase * mult * rollFrac;
    const value = STAT_BASE[key]?.army ? +raw.toFixed(1) : Math.round(raw);
    stats.push({ key, value });
  }
  return stats;
}

// ── Create a gear instance ────────────────────────────────────────────────────
export function createGearInstance(pieceId, overrideRarity) {
  const def = GEAR_PIECES.find(p => p.id === pieceId);
  if (!def) return null;
  const rarity = overrideRarity ?? def.rarity;
  return {
    instanceId: `gi_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    pieceId:    def.id,
    n:          def.n,
    slot:       def.slot,
    alignment:  def.alignment,
    primaryStat:def.primaryStat,
    rarity,
    icon:       def.icon,
    stars:      0,        // silver stars 0-5 (strengthening)
    goldStars:  0,        // gold stars (refining)
    secStats:   rollSecStats(rarity, def.primaryStat),
    equippedBy: null,     // commander uid or null
  };
}

// ── Roll a gear schematic from gacha ─────────────────────────────────────────
export function rollGearSchematic(playerAlignment) {
  const r = Math.random();
  let rarity;
  if      (r < GEAR_PULL_RATES.legendary) rarity = "legendary";
  else if (r < GEAR_PULL_RATES.legendary + GEAR_PULL_RATES.epic) rarity = "epic";
  else if (r < GEAR_PULL_RATES.legendary + GEAR_PULL_RATES.epic + GEAR_PULL_RATES.rare) rarity = "rare";
  else rarity = "common";

  const pool = GEAR_PIECES.filter(p =>
    p.rarity === rarity &&
    (p.alignment === null || p.alignment === playerAlignment)
  );
  const fallback = GEAR_PIECES.filter(p => p.rarity === rarity);
  const src = pool.length ? pool : fallback;
  const def = src[Math.floor(Math.random() * src.length)];
  return createGearInstance(def.id);
}

// ── Strengthening ────────────────────────────────────────────────────────────
export const STRENGTHEN_COST = [2, 3, 4, 5, 6];
export function canStrengthen(piece, inventoryCount) {
  if (piece.stars >= 5) return false;
  return inventoryCount >= STRENGTHEN_COST[piece.stars];
}
export function strengthen(piece) {
  if (piece.stars >= 5) return piece;
  return { ...piece, stars: piece.stars + 1 };
}

// ── Refining ─────────────────────────────────────────────────────────────────
// Each refine boosts one secondary stat by ×1.25 and marks it gold
export function canRefine(piece, duplicateCount) {
  return piece.goldStars < piece.secStats.length && duplicateCount >= 1;
}
export function refine(piece, secStatIndex) {
  if (piece.goldStars >= piece.secStats.length) return piece;
  const newSecStats = piece.secStats.map((s, i) => {
    if (i !== secStatIndex) return s;
    const refined = s.value * 1.25;
    const value = STAT_BASE[s.key]?.army ? +refined.toFixed(1) : Math.round(refined);
    return { ...s, value, gold: true };
  });
  return { ...piece, goldStars: piece.goldStars + 1, secStats: newSecStats };
}

// ── Respect schematic item ────────────────────────────────────────────────────
export function createRespectSchematic(rarity = "soldier", commander = null) {
  const isSpecific = commander !== null;
  const PTS = isSpecific
    ? { soldier: 100, veteran: 100, champion: 100 }
    : { soldier: 30,  veteran: 30,  champion: 30  };

  const rarityColor = rarity === "champion" ? "#f0c040" : rarity === "veteran" ? "#a855f7" : "#4488cc";

  return {
    instanceId: `rs_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    type:        "respectSchematic",
    rarity,
    points:      PTS[rarity] ?? 100,
    icon:        rarity === "champion" ? "🏆" : rarity === "veteran" ? "⭐" : "📜",
    commanderId:   isSpecific ? commander.id   : null,
    commanderName: isSpecific ? commander.n    : null,
    isGeneric:     !isSpecific,
    rarityColor,
    n: isSpecific
      ? `${commander.n}'s Schematic`
      : `Generic ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Schematic`,
  };
}

// ── Roll a full 3-slot pull ───────────────────────────────────────────────────
export function rollFullPull(alignFactions, playerAlignment, pityCounters, commanderPool = []) {
  function pickSchematicTarget(scRarity) {
    const pool = commanderPool.filter(h => h.rarity === scRarity);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const slot1IsCmd = Math.random() < 0.02;
  let slot1;
  if (slot1IsCmd) {
    slot1 = { type: "commander" };
  } else {
    const r = Math.random();
    const scRarity = r < 0.02 ? "champion" : r < 0.10 ? "veteran" : "soldier";
    slot1 = createRespectSchematic(scRarity, pickSchematicTarget(scRarity));
  }

  const slot2 = rollGearSchematic(playerAlignment);

  const s3r = Math.random();
  let slot3;
  if (s3r < 0.01) {
    slot3 = { type: "commander" };
  } else if (s3r < 0.16) {
    const r = Math.random();
    const scRarity = r < 0.02 ? "champion" : r < 0.10 ? "veteran" : "soldier";
    slot3 = createRespectSchematic(scRarity, pickSchematicTarget(scRarity));
  } else {
    slot3 = rollGearSchematic(playerAlignment);
  }

  return { slot1, slot2, slot3 };
}

// ── Commander rarity within a full-pull slot ─────────────────────────────────
export const FULL_PULL_CMD_RATES = { soldier: 0.50, veteran: 0.35, champion: 0.15 };

export function rollFullPullCmdRarity() {
  const r = Math.random();
  if (r < FULL_PULL_CMD_RATES.champion) return "champion";
  if (r < FULL_PULL_CMD_RATES.champion + FULL_PULL_CMD_RATES.veteran) return "veteran";
  return "soldier";
}

// Re-export STAT_BASE for display use in other components
export { STAT_BASE };
