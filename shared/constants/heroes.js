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
import { getDefCmdBranches } from "./skills.js";

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
  bountyhunters: { tier1: "Apprentice",  tier2: "Sage",        tier3: "Warlock"   },
  orcs:          { tier1: "Raider",      tier2: "Marauder",    tier3: "Warlord"   },
  dragons:       { tier1: "Hatchling",   tier2: "Adult",       tier3: "Elder"     },
  holyknights:   { tier1: "Templar",     tier2: "BattlePriest",tier3: "Inquisitor"},
  nightcreatures:{ tier1: "Fledgling",   tier2: "Risen",       tier3: "Ancient"   },
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
  { id:"h1",  n:"Redwake Fynn",         faction:"pirates",        rarity:"veteran",  cls:"attacker", atk:130, foc:0,   spd:88, icon:"🏴‍☠️", subspecies:"Shipwright", portrait:"/commanders/h1_redwake_fynn_portrait.PNG", bust:"/commanders/h1_redwake_fynn_bust.PNG" },
  { id:"h2",  n:"Cutlass Mora",         faction:"pirates",        rarity:"veteran",  cls:"defender", atk:105, foc:0,   spd:78, icon:"🗡",          subspecies:"Shipwright" },
  { id:"h13", n:"Admiral Brine",        faction:"pirates",        rarity:"soldier",  cls:"leader",   atk:95,  foc:0,   spd:65, icon:"⚓",          subspecies:"First Mate", portrait:"/commanders/h13_admiral_brine_portrait.PNG", bust:"/commanders/h13_admiral_brine_bust.PNG" },
  { id:"h14", n:"Saltwhisper",          faction:"pirates",        rarity:"soldier",  cls:"support",  atk:55,  foc:110, spd:72, icon:"🪝",          subspecies:"First Mate" },
  { id:"h25", n:"Ironjaw Reck",         faction:"pirates",        rarity:"champion", cls:"attacker", atk:175, foc:0,   spd:90, icon:"💀",          subspecies:"Captain"    },
  { id:"h26", n:"Navigator Seyne",      faction:"pirates",        rarity:"champion", cls:"leader",   atk:110, foc:60,  spd:80, icon:"🧭",          subspecies:"Captain"    },
  // ── Marines ── (leader, attacker, support, defender covered; extras: defender+support)





  // ── Bounty Hunters / Wizards ── (leader, attacker, support, defender covered; extras: support+attacker)
  { id:"h5",  n:"Solarius Vex",         faction:"bountyhunters",  rarity:"veteran",  cls:"support",  atk:20,  foc:180, spd:62, icon:"🔮",          subspecies:"Sage"        },
  { id:"h6",  n:"Mira Ashveil",         faction:"bountyhunters",  rarity:"veteran",  cls:"attacker", atk:120, foc:100, spd:70, icon:"✨",          subspecies:"Sage"        },
  { id:"h17", n:"Runekeeper Dov",       faction:"bountyhunters",  rarity:"soldier",  cls:"leader",   atk:75,  foc:80,  spd:58, icon:"📜",          subspecies:"Apprentice"  },
  { id:"h18", n:"Hexblade Oren",        faction:"bountyhunters",  rarity:"soldier",  cls:"defender", atk:90,  foc:60,  spd:55, icon:"🔯",          subspecies:"Apprentice"  },
  { id:"h29", n:"Archmage Thessaly",    faction:"bountyhunters",  rarity:"champion", cls:"support",  atk:40,  foc:210, spd:65, icon:"🌟",          subspecies:"Warlock"     },
  { id:"h30", n:"Spellblade Ryn",       faction:"bountyhunters",  rarity:"champion", cls:"attacker", atk:155, foc:130, spd:72, icon:"⚡",          subspecies:"Warlock"     },
  // ── MerFolk ── (leader, attacker, support, defender covered; extras: attacker+defender)





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
  { id:"h35", n:"Pyrewing Skar",        faction:"dragons",         rarity:"champion", cls:"attacker", atk:180, foc:0,   spd:78, icon:"🌋", subspecies:"Elder"     },
  { id:"h36", n:"Voidscale Nyxara",     faction:"dragons",         rarity:"champion", cls:"support",  atk:60,  foc:175, spd:82, icon:"🌑", subspecies:"Elder"     },

  { id:"h37", n:"Brother Aldric",          faction:"holyknights",     rarity:"soldier",  cls:"defender", atk:78,  foc:20,  spd:48, icon:"🛡", subspecies:"Templar"      },
  { id:"h38", n:"Commander Vayne",         faction:"holyknights",     rarity:"veteran",  cls:"leader",   atk:130, foc:30,  spd:55, icon:"⚔️", subspecies:"Templar"      },
  { id:"h39", n:"Friar Brennan",           faction:"holyknights",     rarity:"soldier",  cls:"support",  atk:40,  foc:120, spd:52, icon:"✝️", subspecies:"BattlePriest" },
  { id:"h40", n:"High Warden Seraph",      faction:"holyknights",     rarity:"champion", cls:"attacker", atk:178, foc:40,  spd:60, icon:"☀️", subspecies:"BattlePriest" },
  { id:"h41", n:"Sister Vivara",           faction:"holyknights",     rarity:"veteran",  cls:"support",  atk:45,  foc:145, spd:62, icon:"🌟", subspecies:"Inquisitor"   },
  { id:"h42", n:"Grand Inquisitor Mourne", faction:"holyknights",     rarity:"champion", cls:"attacker", atk:182, foc:20,  spd:58, icon:"🌑", subspecies:"Inquisitor"   },

  { id:"h43", n:"Countess Serava",      faction:"nightcreatures",  rarity:"veteran",  cls:"attacker", atk:150, foc:0,   spd:75, icon:"🦇", subspecies:"Vampire", portrait:"/commanders/h43_countess_serava_portrait.PNG", bust:"/commanders/h43_countess_serava_bust.PNG" },
  { id:"h44", n:"Lord Malachar",        faction:"nightcreatures",  rarity:"champion", cls:"support",  atk:65,  foc:170, spd:72, icon:"🩸", subspecies:"Vampire"      },
  { id:"h45", n:"Fang Groth",           faction:"nightcreatures",  rarity:"soldier",  cls:"attacker", atk:92,  foc:0,   spd:80, icon:"🐺", subspecies:"Werewolf", portrait:"/commanders/h45_fang_groth_portrait.PNG", bust:"/commanders/h45_fang_groth_bust.PNG" },
  { id:"h46", n:"Alpha Korrax",         faction:"nightcreatures",  rarity:"champion", cls:"leader",   atk:185, foc:0,   spd:85, icon:"🌕", subspecies:"Werewolf"     },
  { id:"h47", n:"Skitter Vex",          faction:"nightcreatures",  rarity:"soldier",  cls:"defender", atk:70,  foc:20,  spd:60, icon:"🕷", subspecies:"Spider"       },
  { id:"h48", n:"Widow Nyxara",         faction:"nightcreatures",  rarity:"veteran",  cls:"support",  atk:40,  foc:145, spd:65, icon:"🕸", subspecies:"Spider"       },
];


// ── NPC (non-playable) Generic Commanders ────────────────────────────────────
// Used as garrison defenders on AI tiles. Not in gacha pool.
// Stats are ~50% of average soldier-rarity playable commanders.
// Power level mapping: P1 → Skirmisher, P2 → Raider, P3/P4 → Outlaw
export const NPC_COMMANDERS = {
  skirmisher: { id:"npc1", n:"Skirmisher", icon:"⚔",  faction:null, rarity:"soldier", cls:"attacker", atk:45, foc:0,  spd:35, troopBranch:{ faction:"pirates",  branch:"cutthroats",   tier:0 } },
  raider:     { id:"npc2", n:"Raider",     icon:"🗡",  faction:null, rarity:"soldier", cls:"attacker", atk:50, foc:0,  spd:38, troopBranch:{ faction:"orcs",     branch:"grunts",     tier:0 } },
  outlaw:     { id:"npc3", n:"Outlaw",     icon:"💀",  faction:null, rarity:"soldier", cls:"attacker", atk:55, foc:10, spd:40, troopBranch:{ faction:"pirates",   branch:"swashbucklers", tier:0 } },
};

export function npcForPowerLevel(pl) {
  if (pl <= 1) return NPC_COMMANDERS.skirmisher;
  if (pl === 2) return NPC_COMMANDERS.raider;
  return NPC_COMMANDERS.outlaw;
}

// ── Faction commander garrison for tier 4–7 tiles ────────────────────────────
// Returns a defCmd object drawn from a veteran or soldier HDEF of the alignment
// opposite to the player's chosen faction. Selection is deterministic per tile
// coordinate (c, r) so it never changes between sessions.
// R0 = respect level 0.
// Skill points and troop tier vary by power level per spec:
//   pl 4 → lvl 8,  3sp, all t1
//   pl 5 → lvl 10, 5sp, all t1
//   pl 6 → lvl 15, 5sp, half t1 half t2
//   pl 7 → lvl 18, 5sp, half t1 half t2
// The commander AND their troops come from the same opposite-alignment faction.
// First-main and second-main skill keys by class (BRANCH_SKILL_MAP in skills.js):
//   attacker → "killing_instinct" / "quick_strike"
//   defender → "iron_will"       / "shield_wall"
//   support  → "field_medic"     / "mending_wave"
//   leader   → "warchief_aura"   / "warchief_roar"
const FACTION_CMD_FIRST_SKILL = {
  attacker: "killing_instinct",
  defender: "iron_will",
  support:  "field_medic",
  leader:   "warchief_aura",
};
const FACTION_CMD_SECOND_SKILL = {
  attacker: "quick_strike",
  defender: "shield_wall",
  support:  "mending_wave",
  leader:   "warchief_roar",
};

// Branch keys per faction — must stay in sync with FACTION_TROOPS in troops.js
export const FACTION_BRANCHES_EXPORT = {
  pirates:        ["swashbucklers", "gunners",       "sea_beasts"   ],
  bountyhunters:  ["spellblades",   "acolytes",      "golems"       ],
  orcs:           ["grunts",        "warg_riders",   "trolls"       ],
  dragons:        ["dragonkin",     "drake_riders",  "elder_dragons"],
  holyknights:    ["templars",      "battlepriests", "inquisitors"  ],
  nightcreatures: ["vampires",      "werewolves",    "spiders"      ],
};
const FACTION_BRANCHES = FACTION_BRANCHES_EXPORT;

// Per power-level garrison commander config
const FACTION_CMD_CONFIG = {
  4: { lvl:8,  troopTierFn: ()     => 0,          skillLayout: { b0m:2, b0s:1,            b1m:0, b1s:0            } },
  5: { lvl:10, troopTierFn: ()     => 0,          skillLayout: { b0m:2, b0s:1,            b1m:2, b1s:0            } },
  6: { lvl:15, troopTierFn: (seed) => (seed & 1), skillLayout: { b0m:2, b0s:1,            b1m:2, b1s:0            } },
  7: { lvl:18, troopTierFn: (seed) => (seed & 1), skillLayout: { b0m:2, b0s:1,            b1m:2, b1s:0            } },
  8: { lvl:22, troopTierFn: (seed) => (seed & 1), skillLayout: { b0m:2, b0s:1, b0s2:1,   b1m:2, b1s:1, b1s2:1   } },
  9: { lvl:25, troopTierFn: (seed) => 1,          skillLayout: { b0m:3, b0s:1, b0s2:1,   b1m:2, b1s:1            } },
  // P10–P13: rarityForWave(waveIndex) determines rarity per wave
  // Skill point totals: P10=10, P11=10, P12=12, P13=15
  10:{ lvl:35, troopTierFn: () => 1, respect:1,
       rarityPool: (wi) => wi === 0 ? ["soldier"] : ["veteran"],
       skillLayout: { b0m:4, b0s:2, b0s2:1,   b1m:2, b1s:1            } },  // 10 pts
  11:{ lvl:40, troopTierFn: () => 2, respect:2,
       rarityPool: (wi) => wi === 0 ? ["veteran"] : ["champion"],
       skillLayout: { b0m:4, b0s:2, b0s2:1,   b1m:2, b1s:1            } },  // 10 pts
  12:{ lvl:45, troopTierFn: () => 2, respect:3,
       rarityPool: (wi) => wi === 0 ? ["veteran"] : ["champion"],
       skillLayout: { b0m:5, b0s:2, b0s2:1,   b1m:2, b1s:1, b1s2:1   } },  // 12 pts
  13:{ lvl:50, troopTierFn: () => 2, respect:3,
       rarityPool: (wi) => wi === 0 ? ["veteran"] : ["champion"],
       skillLayout: { b0m:6, b0s:3, b0s2:2,   b1m:2, b1s:1, b1s2:1   } },  // 15 pts
};

export function factionDefCmdForTile(c, r, playerFaction, powerLevel, waveIndex = 0) {
  const pl = powerLevel || 4;

  // Inline alignment data to avoid circular dep issues
  const ALIGN = {
    humans:   ["pirates","bountyhunters","holyknights"],
    creatures:["orcs","dragons","nightcreatures"],
  };
  const playerAlign = ALIGN.humans.includes(playerFaction) ? "humans" : "creatures";
  const oppFactions = playerAlign === "humans" ? ALIGN.creatures : ALIGN.humans;

  const cfg = FACTION_CMD_CONFIG[pl] || FACTION_CMD_CONFIG[4];

  // P10+: rarityPool(waveIndex) returns exact rarity list for this wave
  // P4-P9: always veteran + soldier pool
  const allowedRarities = cfg.rarityPool
    ? cfg.rarityPool(waveIndex)
    : ["veteran", "soldier"];

  const pool = HDEFS.filter(h =>
    oppFactions.includes(h.faction) &&
    allowedRarities.includes(h.rarity)
  );
  if (!pool.length) return null;

  // Deterministic seed from tile coords
  const seed = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) >>> 0;
  const src  = pool[seed % pool.length];

  const troopTier = cfg.troopTierFn(seed);

  // Pick a branch from the commander's own faction (deterministic, different hash)
  const factionBranches = FACTION_BRANCHES[src.faction] || FACTION_BRANCHES.pirates;
  const branchSeed = (((c + 3) * 19349663) ^ ((r + 7) * 73856093)) >>> 0;
  const branch     = factionBranches[branchSeed % factionBranches.length];
  const troopBranch = { faction: src.faction, branch, tier: troopTier };

  // Build skill points from layout
  const layout = cfg.skillLayout;
  const [b0, b1] = getDefCmdBranches(src);

  const sideSeed0 = (seed >> 4) & 1;
  const sideSeed1 = (seed >> 6) & 1;

  const skillPoints = {};
  if (layout.b0m) skillPoints[b0.main]                              = layout.b0m;
  if (layout.b0s && b0.sides.length > 0)
    skillPoints[b0.sides[sideSeed0 % b0.sides.length]]              = layout.b0s;
  if (layout.b0s2 && b0.sides.length > 1)
    skillPoints[b0.sides[(sideSeed0 + 1) % b0.sides.length]]        = layout.b0s2;
  if (layout.b1m) skillPoints[b1.main]                              = layout.b1m;
  if (layout.b1s && b1.sides.length > 0)
    skillPoints[b1.sides[sideSeed1 % b1.sides.length]]              = layout.b1s;
  if (layout.b1s2 && b1.sides.length > 1)
    skillPoints[b1.sides[(sideSeed1 + 1) % b1.sides.length]]        = layout.b1s2;

  return {
    id:              src.id,
    n:               src.n,
    icon:            src.icon,
    cls:             src.cls,
    faction:         src.faction,
    rarity:          src.rarity,
    lvl:             cfg.lvl,
    atk:             src.atk,
    foc:             src.foc  || 0,
    spd:             src.spd,
    respect:         cfg.respect ?? 0,
    skillPoints,
    troopBranch,
    isFactionGarrison: true,
  };
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
