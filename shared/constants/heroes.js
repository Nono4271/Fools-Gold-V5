// ── V4 Rarity ────────────────────────────────────────────────────────────────
export const RARITY = {
  soldier:  { n: "Soldier",  color: "#4488cc", border: "#2a66aa" },
  veteran:  { n: "Veteran",  color: "#a855f7", border: "#7c22d4" },
  champion: { n: "Champion", color: "#f0c040", border: "#c89010" },
};

export const RC = (rarity) => RARITY[rarity]?.color ?? "#6b7280";

export const PROMO = {
  soldier:  { to: "veteran",  respectRequired: 7  },
  veteran:  { to: "champion", respectRequired: 12 },
  champion: { to: null,       respectRequired: null },
};

// ── V4 Classes ───────────────────────────────────────────────────────────────
export const CLASS = {
  leader:   {
    n: "Leader",   icon: "⚑",
    desc: "Masters of logistics and morale. Leaders extend command range and accelerate marches.",
    bonus: "Iron Will — At Lv25: +500 Command (troop capacity).",
    synergy: "Command tree",
    primaryTree: "command",
  },
  attacker: {
    n: "Attacker", icon: "⚔",
    desc: "Frontline destroyers built for overwhelming offensive power and rapid conquest.",
    bonus: "Bloodlust — At Lv25: +15 Attack stat.",
    synergy: "Combat tree",
    primaryTree: "combat",
  },
  support:  {
    n: "Support",  icon: "✦",
    desc: "Tactical specialists who amplify allies, heal troops, and turn the tide through cunning.",
    bonus: "Grand Strategy — At Lv25: +5 bonus skill points.",
    synergy: "Tactics tree",
    primaryTree: "tactics",
  },
  defender: {
    n: "Defender", icon: "🛡",
    desc: "Unyielding fortresses. Defenders make held tiles nearly impregnable.",
    bonus: "Bastion — At Lv25: Troops gain double HP and DEF for the first 2 rounds of each battle.",
    synergy: "Defense tree",
    primaryTree: "defense",
  },
};

// ── Class → which 3 trees they get (primary x3) + 1 random secondary ─────────
// The 4th tree per commander is seeded from their ID so it's static across runs
export const CLASS_TREES = {
  attacker: ["combat", "combat", "combat"],     // 3 combat branches + 1 random
  defender: ["defense", "defense", "defense"],  // 3 defense branches + 1 random
  leader:   ["command", "command", "command"],  // 3 command branches + 1 random
  support:  ["tactics", "tactics", "tactics"],  // 3 tactics branches + 1 random
};

// Secondary tree options per class (the 4th tree, randomized but static per commander)
export const CLASS_SECONDARY_OPTIONS = {
  attacker: ["command", "defense", "tactics"],
  defender: ["command", "combat", "tactics"],
  leader:   ["combat", "defense", "tactics"],
  support:  ["combat", "defense", "command"],
};

// Get a commander's 4 trees: 3 of their class + 1 static secondary
export function getCommanderTrees(cmd) {
  const primary = CLASS_TREES[cmd.cls] ?? ["combat","combat","combat"];
  const secondaryOptions = CLASS_SECONDARY_OPTIONS[cmd.cls] ?? ["command","defense","tactics"];
  // Use commander id as seed so it's deterministic/static
  const seed = cmd.id?.split("").reduce((a,c) => a + c.charCodeAt(0), 0) ?? 0;
  const secondary = secondaryOptions[seed % secondaryOptions.length];
  return { primary, secondary, all: [...primary, secondary] };
}

// ── V4 Respect ───────────────────────────────────────────────────────────────
export const RESPECT_MAX = 15;

export function respectCost(fromLevel) {
  return Math.round(300 * Math.pow(1.65, fromLevel));
}

export function respectTotalFor(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += respectCost(i);
  return total;
}

export const RESPECT_DUPE_POINTS = { soldier: 120, veteran: 300, champion: 800 };
export const RESPECT_SCHEMATIC_POINTS = { soldier: 100, veteran: 100, champion: 100 };
export const RESPECT_SCHEMATIC_GENERIC_POINTS = { soldier: 30, veteran: 30, champion: 30 };
export const RESPECT_OVERFLOW_POINTS = 150;

export function respectLevelFromPoints(totalPoints) {
  let lvl = 0;
  let spent = 0;
  while (lvl < RESPECT_MAX) {
    const needed = respectCost(lvl);
    if (spent + needed > totalPoints) break;
    spent += needed;
    lvl++;
  }
  return { level: lvl, pointsIntoLevel: totalPoints - spent, pointsNeeded: respectCost(Math.min(lvl, RESPECT_MAX - 1)) };
}

export const RESPECT_GATES = {
  3:  "command",
  5:  "tactics",
  7:  "promo_sv",
  12: "promo_vc",
};

// ── V4 Skill Trees ────────────────────────────────────────────────────────────
export const SKILL_TREES = {
  combat:  { n: "Combat",  icon: "⚔",  unlocksAt: 0, desc: "Raw damage, attack buffs, offensive power"          },
  defense: { n: "Defense", icon: "🛡", unlocksAt: 0, desc: "Garrison strength, troop survival, damage reduction" },
  command: { n: "Command", icon: "📡", unlocksAt: 3, desc: "Troop capacity, march speed, logistics"              },
  tactics: { n: "Tactics", icon: "✦",  unlocksAt: 5, desc: "Special effects, debuffs, healing, siege bonuses"   },
};

// Skill naming and mechanic tables live in skills.js — re-exported here for backward compat
export { MAIN_BRANCH_NAMES, FACTION_MAIN_NAMES, getMainBranchNames, SKILL_NAMES, getSkillNames, TREE_DISPLAY_NAMES, getTreeDisplayNames, SKILL_MECHANICS, SKILLS, getBranchMechanicKey, getBranchMechanic } from "./skills.js";

// DEAD_CODE_START — kept so this marker is findable, replaced by skills.js re-export above
const _MAIN_BRANCH_NAMES_UNUSED = {
  combat:  ["Grit","Weapon Mastery","Battle Fury","Iron Resolve","Blood Rush","War Cry","Killing Blow","Unstoppable","Wrath","Supreme Might"],
  defense: ["Fortify","Shield Training","Stalwart","Iron Skin","Hold the Line","Bulwark","Impenetrable","Stone Will","Last Stand","Citadel"],
  command: ["Rally","March Discipline","Vanguard","Supply Lines","Force March","Tactical Advance","Strategic Mind","Grand March","Legion's Pride","War Council"],
  tactics: ["Cunning","Feint","Ambush","Debilitating Strike","Hex","Battle Scheme","Masterstroke","Siege Craft","Shadow Gambit","Grand Tactics"],
};
// DEAD_CODE_END

// Old SKILL_NAMES and getSkillNames removed — now in skills.js

// ── V4 Subspecies ─────────────────────────────────────────────────────────────
// Cosmetic faction-flavored rank tag. Filterable but has no gameplay effect.
// Maps loosely to rarity: soldier→tier1, veteran→tier2, champion→tier3.
export const SUBSPECIES = {
  pirates:       { tier1: "First Mate",  tier2: "Shipwright",  tier3: "Captain"   },
  marines:       { tier1: "Newbie",      tier2: "Experienced", tier3: "Admiral"   },
  bountyhunters: { tier1: "Apprentice",  tier2: "Sage",        tier3: "Warlock"   },
  merfolk:       { tier1: "Fry",         tier2: "Warden",      tier3: "Leviathan" },
  orcs:          { tier1: "Raider",      tier2: "Marauder",    tier3: "Warlord"   },
  dragons:       { tier1: "Hatchling",   tier2: "Adult",       tier3: "Elder"     },
};

const RARITY_TO_TIER = { soldier: "tier1", veteran: "tier2", champion: "tier3" };

export function getSubspecies(faction, rarity) {
  return SUBSPECIES[faction]?.[RARITY_TO_TIER[rarity]] ?? null;
}

// ── V4 Commander Definitions ─────────────────────────────────────────────────
// Each faction has 6 commanders: 2 soldiers, 2 veterans, 2 champions.
// Each faction has at least 1 of each class (leader, attacker, support, defender).
// The extra 2 slots are static-random (seeded at design time).
export const HDEFS = [
  // ── Pirates ── (leader, attacker, support, defender covered; extras: attacker+leader)
  { id:"h1",  n:"Redwake Fynn",         faction:"pirates",        rarity:"veteran",  cls:"attacker", atk:130, foc:0,   spd:88, icon:"🏴‍☠️", subspecies:"Shipwright" },
  { id:"h2",  n:"Cutlass Mora",         faction:"pirates",        rarity:"veteran",  cls:"defender", atk:105, foc:0,   spd:78, icon:"🗡",          subspecies:"Shipwright" },
  { id:"h13", n:"Admiral Brine",        faction:"pirates",        rarity:"soldier",  cls:"leader",   atk:95,  foc:0,   spd:65, icon:"⚓",          subspecies:"First Mate" },
  { id:"h14", n:"Saltwhisper",          faction:"pirates",        rarity:"soldier",  cls:"support",  atk:55,  foc:110, spd:72, icon:"🪝",          subspecies:"First Mate" },
  { id:"h25", n:"Ironjaw Reck",         faction:"pirates",        rarity:"champion", cls:"attacker", atk:175, foc:0,   spd:90, icon:"💀",          subspecies:"Captain"    },
  { id:"h26", n:"Navigator Seyne",      faction:"pirates",        rarity:"champion", cls:"leader",   atk:110, foc:60,  spd:80, icon:"🧭",          subspecies:"Captain"    },
  // ── Marines ── (leader, attacker, support, defender covered; extras: defender+support)
  { id:"h3",  n:"Lieutenant Stonewall", faction:"marines",        rarity:"veteran",  cls:"defender", atk:115, foc:0,   spd:60, icon:"⚓",          subspecies:"Experienced" },
  { id:"h4",  n:"Sergeant Vael",        faction:"marines",        rarity:"veteran",  cls:"attacker", atk:120, foc:0,   spd:72, icon:"🪖",          subspecies:"Experienced" },
  { id:"h15", n:"Ensign Merrow",        faction:"marines",        rarity:"soldier",  cls:"leader",   atk:88,  foc:0,   spd:62, icon:"🛡",          subspecies:"Newbie"      },
  { id:"h16", n:"Field Medic Asha",     faction:"marines",        rarity:"soldier",  cls:"support",  atk:40,  foc:90,  spd:68, icon:"⛑",          subspecies:"Newbie"      },
  { id:"h27", n:"Bulwark Trane",        faction:"marines",        rarity:"champion", cls:"defender", atk:130, foc:0,   spd:62, icon:"🏰",          subspecies:"Admiral"     },
  { id:"h28", n:"Tactician Orel",       faction:"marines",        rarity:"champion", cls:"support",  atk:70,  foc:160, spd:74, icon:"📋",          subspecies:"Admiral"     },
  // ── Bounty Hunters / Wizards ── (leader, attacker, support, defender covered; extras: support+attacker)
  { id:"h5",  n:"Solarius Vex",         faction:"bountyhunters",  rarity:"veteran",  cls:"support",  atk:20,  foc:180, spd:62, icon:"🔮",          subspecies:"Sage"        },
  { id:"h6",  n:"Mira Ashveil",         faction:"bountyhunters",  rarity:"veteran",  cls:"attacker", atk:120, foc:100, spd:70, icon:"✨",          subspecies:"Sage"        },
  { id:"h17", n:"Runekeeper Dov",       faction:"bountyhunters",  rarity:"soldier",  cls:"leader",   atk:75,  foc:80,  spd:58, icon:"📜",          subspecies:"Apprentice"  },
  { id:"h18", n:"Hexblade Oren",        faction:"bountyhunters",  rarity:"soldier",  cls:"defender", atk:90,  foc:60,  spd:55, icon:"🔯",          subspecies:"Apprentice"  },
  { id:"h29", n:"Archmage Thessaly",    faction:"bountyhunters",  rarity:"champion", cls:"support",  atk:40,  foc:210, spd:65, icon:"🌟",          subspecies:"Warlock"     },
  { id:"h30", n:"Spellblade Ryn",       faction:"bountyhunters",  rarity:"champion", cls:"attacker", atk:155, foc:130, spd:72, icon:"⚡",          subspecies:"Warlock"     },
  // ── MerFolk ── (leader, attacker, support, defender covered; extras: attacker+defender)
  { id:"h7",  n:"Tidalborn Cael",       faction:"merfolk",        rarity:"veteran",  cls:"attacker", atk:135, foc:0,   spd:78, icon:"🌊",          subspecies:"Warden"      },
  { id:"h8",  n:"Coralspine Nyra",      faction:"merfolk",        rarity:"veteran",  cls:"support",  atk:60,  foc:120, spd:68, icon:"🐚",          subspecies:"Warden"      },
  { id:"h19", n:"Riptide Kael",         faction:"merfolk",        rarity:"soldier",  cls:"defender", atk:85,  foc:0,   spd:55, icon:"🪸",          subspecies:"Fry"         },
  { id:"h20", n:"Deepwarden Syla",      faction:"merfolk",        rarity:"soldier",  cls:"leader",   atk:70,  foc:0,   spd:62, icon:"🐠",          subspecies:"Fry"         },
  { id:"h31", n:"Abyssal Thren",        faction:"merfolk",        rarity:"champion", cls:"attacker", atk:165, foc:0,   spd:80, icon:"🦑",          subspecies:"Leviathan"   },
  { id:"h32", n:"Tidecaller Mara",      faction:"merfolk",        rarity:"champion", cls:"defender", atk:120, foc:40,  spd:58, icon:"🧜",          subspecies:"Leviathan"   },
  // ── Orcs ── (leader, attacker, support, defender covered; extras: attacker+defender)
  { id:"h9",  n:"Grimtusk",             faction:"orcs",           rarity:"veteran",  cls:"attacker", atk:155, foc:0,   spd:60, icon:"⚔️",         subspecies:"Marauder"    },
  { id:"h10", n:"Ashgrip",              faction:"orcs",           rarity:"veteran",  cls:"defender", atk:115, foc:0,   spd:65, icon:"🪓",          subspecies:"Marauder"    },
  { id:"h21", n:"Warcroak",             faction:"orcs",           rarity:"soldier",  cls:"leader",   atk:80,  foc:0,   spd:58, icon:"🥁",          subspecies:"Raider"      },
  { id:"h22", n:"Shaman Grix",          faction:"orcs",           rarity:"soldier",  cls:"support",  atk:30,  foc:100, spd:60, icon:"💀",          subspecies:"Raider"      },
  { id:"h33", n:"Warlord Korgath",      faction:"orcs",           rarity:"champion", cls:"attacker", atk:185, foc:0,   spd:62, icon:"🗡",          subspecies:"Warlord"     },
  { id:"h34", n:"Ironhide Bruk",        faction:"orcs",           rarity:"champion", cls:"defender", atk:140, foc:0,   spd:55, icon:"🦴",          subspecies:"Warlord"     },
  // ── Dragons ── (leader, attacker, support, defender covered; extras: attacker+support)
  { id:"h11", n:"Emberclaw",            faction:"dragons",        rarity:"veteran",  cls:"attacker", atk:155, foc:0,   spd:75, icon:"🐉",          subspecies:"Adult"       },
  { id:"h12", n:"Scaleveil Dusk",       faction:"dragons",        rarity:"veteran",  cls:"support",  atk:50,  foc:140, spd:80, icon:"🔥",          subspecies:"Adult"       },
  { id:"h23", n:"Ashen Kraul",          faction:"dragons",        rarity:"soldier",  cls:"leader",   atk:78,  foc:0,   spd:68, icon:"🦎",          subspecies:"Hatchling"   },
  { id:"h24", n:"Cinderfang",           faction:"dragons",        rarity:"soldier",  cls:"defender", atk:100, foc:0,   spd:58, icon:"🪨",          subspecies:"Hatchling"   },
  { id:"h35", n:"Pyrewing Skar",        faction:"dragons",        rarity:"champion", cls:"attacker", atk:180, foc:0,   spd:78, icon:"🌋",          subspecies:"Elder"       },
  { id:"h36", n:"Voidscale Nyxara",     faction:"dragons",        rarity:"champion", cls:"support",  atk:60,  foc:175, spd:82, icon:"🌑",          subspecies:"Elder"       },
];


// ── NPC (non-playable) Generic Commanders ────────────────────────────────────
// Used as garrison defenders on AI tiles. Not in gacha pool.
// Stats are ~50% of average soldier-rarity playable commanders.
// Power level mapping: P1 → Skirmisher, P2 → Raider, P3/P4 → Outlaw
export const NPC_COMMANDERS = {
  skirmisher: { id:"npc1", n:"Skirmisher", icon:"⚔",  faction:null, rarity:"soldier", cls:"attacker", atk:45, foc:0,  spd:35, troopType:"infantry" },
  raider:     { id:"npc2", n:"Raider",     icon:"🗡",  faction:null, rarity:"soldier", cls:"attacker", atk:50, foc:0,  spd:38, troopType:"spearmen" },
  outlaw:     { id:"npc3", n:"Outlaw",     icon:"💀",  faction:null, rarity:"soldier", cls:"attacker", atk:55, foc:10, spd:40, troopType:"horsemen" },
};

export function npcForPowerLevel(pl) {
  if (pl <= 1) return NPC_COMMANDERS.skirmisher;
  if (pl === 2) return NPC_COMMANDERS.raider;
  return NPC_COMMANDERS.outlaw;
}

// ── Pull rates & pity ─────────────────────────────────────────────────────────
export const PULL_RATES = { soldier: 0.80, veteran: 0.17, champion: 0.03 };
export const PITY       = { soldier: 20,   veteran: 100,  champion: 300  };
export const PULL_COST  = { x1: 160, x10: 1400 };

export function rollGacha(n, alignFactions, pityCounters = { soldier:0, veteran:0, champion:0 }) {
  const results = [];
  for (let i = 0; i < n; i++) {
    pityCounters.soldier++;
    pityCounters.veteran++;
    pityCounters.champion++;

    let rarity;
    if (pityCounters.champion >= PITY.champion) { rarity = "champion"; pityCounters.champion = 0; }
    else if (pityCounters.veteran >= PITY.veteran) { rarity = "veteran"; pityCounters.veteran = 0; }
    else if (pityCounters.soldier >= PITY.soldier) { rarity = "soldier"; pityCounters.soldier = 0; }
    else {
      const r = Math.random();
      if (r < PULL_RATES.champion) { rarity = "champion"; pityCounters.champion = 0; }
      else if (r < PULL_RATES.champion + PULL_RATES.veteran) { rarity = "veteran"; pityCounters.veteran = 0; }
      else { rarity = "soldier"; pityCounters.soldier = 0; }
    }

    const pool = HDEFS.filter(h => h.rarity === rarity && (alignFactions ? alignFactions.includes(h.faction) : true));
    const src  = pool.length ? pool : HDEFS.filter(h => h.rarity === rarity);
    const picked = src[Math.floor(Math.random() * src.length)];
    results.push({ ...picked, uid: `g${Date.now()}${i}` });
  }
  return results;
}

// ── Stat bumps on promotion ───────────────────────────────────────────────────
const RARITY_MULT = { soldier: 1.0, veteran: 1.25, champion: 1.55 };

export function promotedStats(cmd, toRarity) {
  const m = RARITY_MULT[toRarity];
  return {
    atk: Math.round(cmd.atk * m),
    foc: cmd.foc > 0 ? Math.round(cmd.foc * m) : 0,
  };
}

export function addRespect(cmd, points) {
  const prevLevel = cmd.respectLevel ?? 0;
  const newTotal  = (cmd.respectPoints ?? 0) + points;
  const info      = respectLevelFromPoints(newTotal);
  const levelsGained = Math.max(0, info.level - prevLevel);

  let rarity   = cmd.rarity;
  let statBump = {};
  let promoted = false;

  if (rarity === "soldier" && info.level >= PROMO.soldier.respectRequired) {
    rarity = "veteran";
    statBump = promotedStats(cmd, "veteran");
    promoted = true;
  } else if (rarity === "veteran" && info.level >= PROMO.veteran.respectRequired) {
    rarity = "champion";
    statBump = promotedStats(cmd, "champion");
    promoted = true;
  }

  const newSkillPoints = (cmd.unspentSkillPoints ?? 0) + levelsGained;

  // Support Lv25 Grand Strategy: grant +5 bonus skill points the first time they hit Lv25
  const supportBonus = (cmd.cls === "support" && prevLevel < 25 && info.level >= 25) ? 5 : 0;

  return {
    ...cmd,
    ...statBump,
    rarity,
    respectPoints:      newTotal,
    respectLevel:       info.level,
    unspentSkillPoints: newSkillPoints + supportBonus,
    _justPromoted:      promoted ? rarity : null,
  };
}

// ── Backwards-compat shims ────────────────────────────────────────────────────
export const SC = RC;
export const SS = (rarity) => RARITY[rarity]?.n ?? String(rarity);

export { ALIGNMENT, PLAYABLE_FACTIONS, getFactionAlignment, AI_FACTIONS } from "./factions.js";
// TREE_DISPLAY_NAMES and getTreeDisplayNames are re-exported above from skills.js
