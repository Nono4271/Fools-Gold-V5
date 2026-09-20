// ── Consumables ───────────────────────────────────────────────────────────────
// All consumable item definitions.
// Each consumable instance stored in Game state has:
//   { instanceId, typeId, quantity }
// typeId maps to CONSUMABLE_DEFS[typeId].

// Rarity color palette
export const CONS_RARITY = {
  grey:   { color: "#8a8a8a", label: "Common"    },
  green:  { color: "#40aa60", label: "Uncommon"  },
  blue:   { color: "#4488cc", label: "Rare"      },
  purple: { color: "#a855f7", label: "Epic"      },
};

// Duration helpers
const M = 60_000;
const H = 3_600_000;

// ── Speed-up types ────────────────────────────────────────────────────────────
// applies: "universal" | "building" | "healing" | "recall" | "rss"
// rssType: only for rss speed-ups — "food" | "wood" | "stone" | "gas"
// Locked decision: training and forts cannot be sped up. Building, healing
// and recall each have their own speedup type; universal speedups apply to
// all three.

const SPEEDUP_DURATIONS = [
  { mins:  5,  ms:  5*M,  label:  "5 Min",  rarity: "grey"   },
  { mins: 15,  ms: 15*M,  label: "15 Min",  rarity: "green"  },
  { mins: 30,  ms: 30*M,  label: "30 Min",  rarity: "green"  },
  { mins: 60,  ms:  1*H,  label:  "1 Hr",   rarity: "green"  },
  { mins:180,  ms:  3*H,  label:  "3 Hr",   rarity: "blue"   },
  { mins:300,  ms:  5*H,  label:  "5 Hr",   rarity: "blue"   },
  { mins:480,  ms:  8*H,  label:  "8 Hr",   rarity: "blue"   },
  { mins:720,  ms: 12*H,  label: "12 Hr",   rarity: "purple" },
  { mins:1440, ms: 24*H,  label: "24 Hr",   rarity: "purple" },
];

const BUILDING_DURATIONS = SPEEDUP_DURATIONS; // same times
const HEALING_DURATIONS  = SPEEDUP_DURATIONS;
const RECALL_DURATIONS   = SPEEDUP_DURATIONS;

const RSS_DURATIONS = [
  { mins: 30,  ms: 30*M, label: "30 Min", rarity: "grey"   },
  { mins: 60,  ms:  1*H, label:  "1 Hr",  rarity: "green"  },
  { mins:180,  ms:  3*H, label:  "3 Hr",  rarity: "blue"   },
  { mins:480,  ms:  8*H, label:  "8 Hr",  rarity: "purple" },
  { mins:720,  ms: 12*H, label: "12 Hr",  rarity: "purple" },
];

const RSS_TYPES = [
  { key: "food",  label: "Food",  icon: "🌾" },
  { key: "wood",  label: "Wood",  icon: "🪵" },
  { key: "stone", label: "Stone", icon: "🪨" },
  { key: "gas",   label: "Gas",   icon: "⚗"  },
];

// Build all defs
const DEFS = {};

// Universal speed-ups
for (const dur of SPEEDUP_DURATIONS) {
  const id = `su_univ_${dur.mins}`;
  DEFS[id] = {
    id, applies: "universal",
    label: `${dur.label} Speed Up`,
    desc: `Reduces any building upgrade, healing time or marching recall by ${dur.label}.`,
    icon: "⏩", rarity: dur.rarity, durationMs: dur.ms, durationLabel: dur.label,
  };
}

// Building speed-ups
for (const dur of BUILDING_DURATIONS) {
  const id = `su_bldg_${dur.mins}`;
  DEFS[id] = {
    id, applies: "building",
    label: `${dur.label} Building Speed Up`,
    desc: `Reduces building upgrade time by ${dur.label}.`,
    icon: "🔨", rarity: dur.rarity, durationMs: dur.ms, durationLabel: dur.label,
  };
}

// Healing speed-ups
for (const dur of HEALING_DURATIONS) {
  const id = `su_heal_${dur.mins}`;
  DEFS[id] = {
    id, applies: "healing",
    label: `${dur.label} Healing Speed Up`,
    desc: `Reduces troop healing time by ${dur.label}.`,
    icon: "💉", rarity: dur.rarity, durationMs: dur.ms, durationLabel: dur.label,
  };
}

// Recall speed-ups
for (const dur of RECALL_DURATIONS) {
  const id = `su_recall_${dur.mins}`;
  DEFS[id] = {
    id, applies: "recall",
    label: `${dur.label} Recall Speed Up`,
    desc: `Reduces a marching commander's recall time by ${dur.label}.`,
    icon: "🏳", rarity: dur.rarity, durationMs: dur.ms, durationLabel: dur.label,
  };
}

// Resource speed-ups (each rss type × each duration)
for (const rss of RSS_TYPES) {
  for (const dur of RSS_DURATIONS) {
    const id = `su_rss_${rss.key}_${dur.mins}`;
    DEFS[id] = {
      id, applies: "rss", rssType: rss.key,
      label: `${dur.label} ${rss.label} Boost`,
      desc: `Increases ${rss.label} production by +30% for ${dur.label}.`,
      icon: rss.icon, rarity: dur.rarity, durationMs: dur.ms, durationLabel: dur.label,
      rssBonus: 0.30,
    };
  }
}

// Relocation token
DEFS["relocation"] = {
  id: "relocation", applies: "relocation",
  label: "Relocation Token",
  desc: "Move your HQ to a valid 3×3 pad in a player-owned region. Cannot relocate again for 72 hours.",
  icon: "🏰", rarity: "purple", durationMs: null, durationLabel: null,
};

// Medallion (non-premium gacha currency)
DEFS["medallion"] = {
  id: "medallion", applies: "medallion",
  label: "Medallion",
  desc: "1 Medallion = 1 Summon Gate pull. Earned through gameplay.",
  icon: "🥇", rarity: "green", durationMs: null, durationLabel: null,
};

export const CONSUMABLE_DEFS = DEFS;

// Grouped for display in the bag
export const CONSUMABLE_GROUPS = [
  {
    key: "universal",
    label: "Universal Speed Ups",
    icon: "⏩",
    ids: SPEEDUP_DURATIONS.map(d => `su_univ_${d.mins}`),
  },
  {
    key: "building",
    label: "Building Speed Ups",
    icon: "🔨",
    ids: BUILDING_DURATIONS.map(d => `su_bldg_${d.mins}`),
  },
  {
    key: "healing",
    label: "Healing Speed Ups",
    icon: "💉",
    ids: HEALING_DURATIONS.map(d => `su_heal_${d.mins}`),
  },
  {
    key: "recall",
    label: "Recall Speed Ups",
    icon: "🏳",
    ids: RECALL_DURATIONS.map(d => `su_recall_${d.mins}`),
  },
  {
    key: "rss",
    label: "Resource Boosts",
    icon: "📦",
    ids: RSS_TYPES.flatMap(r => RSS_DURATIONS.map(d => `su_rss_${r.key}_${d.mins}`)),
  },
  {
    key: "other",
    label: "Other",
    icon: "🎒",
    ids: ["relocation", "medallion"],
  },
];

// Factory: create a consumable inventory entry
let _cid = 1;
export function createConsumable(typeId, qty = 1) {
  return {
    instanceId: `cons_${Date.now()}_${_cid++}`,
    typeId,
    quantity: qty,
  };
}
