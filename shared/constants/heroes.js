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

// Respect points required to unlock a commander in the recruit / shop screen
export const COMMANDER_UNLOCK_COST = { soldier: 80, veteran: 3000, champion: 9000 };

// ── V4 Classes ───────────────────────────────────────────────────────────────
export const CLASS = {
  attacker: {
    n: "Attacker", icon: "⚔",
    desc: "Frontline destroyers built for overwhelming offensive power and rapid conquest.",
    bonus: "Bloodlust — At Lv20: +25 ATK, +2 skill points, +10% physical commander damage.",
    synergy: "Combat tree",
    primaryTree: "combat",
  },
  leader: {
    n: "Leader",   icon: "⚑",
    desc: "Masters of logistics and morale. Leaders extend command range and control larger armies.",
    bonus: "Iron Will — At Lv20: +5 Command.",
    synergy: "Command tree",
    primaryTree: "command",
  },
  support:  {
    n: "Support",  icon: "✦",
    desc: "Tactical specialists who amplify allies, heal troops, and turn the tide through cunning.",
    bonus: "Grand Strategy — At Lv20: +25 FOC, +5 skill points.",
    synergy: "Tactics tree",
    primaryTree: "tactics",
  },
  balanced: {
    n: "Balanced", icon: "⚖",
    desc: "Versatile all-rounders who excel in any situation — equally dangerous attacking or defending.",
    bonus: "Adaptable — At Lv20: +25 ATK, +25 FOC, +25 SPD, +2 skill points.",
    synergy: "Mixed trees",
    primaryTree: "combat",
  },
  strategist: {
    n: "Strategist", icon: "🔮",
    desc: "Cunning commanders who weaponize focus energy, poison, and elemental forces.",
    bonus: "Dark Arts — At Lv20: +25 FOC, +2 skill points, +10% focus/poison/burn/elemental commander damage.",
    synergy: "Tactics & Combat",
    primaryTree: "tactics",
  },
};

// ── Class → which 3 trees they get (primary x3) + 1 random secondary ─────────
// The 4th tree per commander is seeded from their ID so it's static across runs
export const CLASS_TREES = {
  attacker:   ["combat",  "combat",  "combat"],    // 3 combat + 1 secondary
  leader:     ["command", "command", "command"],   // 3 command + 1 secondary
  support:    ["tactics", "tactics", "tactics"],   // 3 tactics + 1 secondary
  balanced:   ["combat",  "tactics", "command"],   // mixed primary trees
  strategist: ["tactics", "tactics", "combat"],    // tactics-heavy with combat
};

// Secondary tree options per class (the 4th tree, randomized but static per commander)
export const CLASS_SECONDARY_OPTIONS = {
  attacker:   ["command", "tactics", "defense"],
  leader:     ["combat",  "defense", "tactics"],
  support:    ["combat",  "defense", "command"],
  balanced:   ["defense", "combat",  "tactics"],
  strategist: ["combat",  "command", "defense"],
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

// Per-rarity level cost tables  (index = fromLevel, value = pts to reach next level)
export const RESPECT_LEVEL_COSTS = {
  soldier:  [200, 280, 400, 520, 640, 900, 1160, 1480, 1900, 2440, 3420, 4380, 5600, 7160, 9160],
  veteran:  [300, 500, 800, 1100, 1400, 2000, 2600, 3400, 4400, 5700, 8100, 10550, 13700, 17800, 23150],
  champion: [900, 1200, 1800, 2400, 3000, 3900, 4800, 6600, 8400, 10800, 14900, 19100, 24400, 31200, 39900],
};

// Schematic point values per rarity
export const RESPECT_SCHEMATIC_POINTS         = { soldier: 40,  veteran: 100, champion: 300 };
export const RESPECT_SCHEMATIC_GENERIC_POINTS = { soldier: 20,  veteran: 50,  champion: 150 };
export const RESPECT_DUPE_POINTS              = { soldier: 120, veteran: 300, champion: 800 };
export const RESPECT_OVERFLOW_POINTS          = 150;

// Cost to advance from respectLevel → respectLevel+1 for a given rarity
export function respectCost(fromLevel, rarity = "soldier") {
  const table = RESPECT_LEVEL_COSTS[rarity] ?? RESPECT_LEVEL_COSTS.soldier;
  const idx = Math.max(0, Math.min(fromLevel, table.length - 1));
  return table[idx];
}

// Total points required to reach a given level from zero
export function respectTotalFor(level, rarity = "soldier") {
  const table = RESPECT_LEVEL_COSTS[rarity] ?? RESPECT_LEVEL_COSTS.soldier;
  let total = 0;
  for (let i = 0; i < Math.min(level, table.length); i++) total += table[i];
  return total;
}

// Derive level + progress from raw accumulated points
export function respectLevelFromPoints(totalPoints, rarity = "soldier") {
  const table = RESPECT_LEVEL_COSTS[rarity] ?? RESPECT_LEVEL_COSTS.soldier;
  let lvl = 0, spent = 0;
  while (lvl < RESPECT_MAX && lvl < table.length) {
    if (spent + table[lvl] > totalPoints) break;
    spent += table[lvl];
    lvl++;
  }
  const pointsNeeded = lvl < table.length ? table[lvl] : table[table.length - 1];
  return { level: lvl, pointsIntoLevel: totalPoints - spent, pointsNeeded };
}

// Respect level gates: unlock skill trees and promo eligibility
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
  { id:"h1",  n:"Redwake Fynn",         faction:"pirates",        rarity:"veteran",  cls:"attacker", atk:130, foc:0,   spd:88, icon:"🏴‍☠️", subspecies:"Shipwright", portrait:"/commanders/h1_redwake_fynn_portrait.webp", bust:"/commanders/h1_redwake_fynn_bust.webp" },
  { id:"h2",  n:"Pirate Cook Samuel",   faction:"pirates",        rarity:"veteran",  cls:"balanced", atk:105, foc:0,   spd:78, icon:"🍳",          subspecies:"Shipwright", portrait:"/commanders/h2_pirate_cook_samuel_portrait.webp", bust:"/commanders/h2_pirate_cook_samuel_bust.webp" },
  { id:"h13", n:"Admiral Brine",        faction:"pirates",        rarity:"soldier",  cls:"leader",   atk:95,  foc:0,   spd:65, icon:"⚓",          subspecies:"First Mate",  portrait:"/commanders/h13_admiral_brine_portrait.webp",    bust:"/commanders/h13_admiral_brine_bust.webp" },
  { id:"h14", n:"Saltwhisper",          faction:"pirates",        rarity:"soldier",  cls:"support",  atk:55,  foc:110, spd:72, icon:"🪝",          subspecies:"First Mate",  portrait:"/commanders/h14_saltwhisper_portrait.webp",         bust:"/commanders/h14_saltwhisper_bust.webp" },
  { id:"h25", n:"Ironjaw Reck",         faction:"pirates",        rarity:"champion", cls:"attacker", atk:175, foc:0,   spd:90, icon:"💀",          subspecies:"Captain",    portrait:"/commanders/h25_ironjaw_reck_portrait.webp",     bust:"/commanders/h25_ironjaw_reck_bust.webp" },
  { id:"h26", n:"Navigator Seyne",      faction:"pirates",        rarity:"champion", cls:"strategist",   atk:110, foc:60,  spd:80, icon:"🧭",          subspecies:"Captain",    portrait:"/commanders/h26_navigator_seyne_portrait.webp",  bust:"/commanders/h26_navigator_seyne_bust.webp" },
  // ── Marines ── (leader, attacker, support, defender covered; extras: defender+support)





  // ── Bounty Hunters / Wizards ── (leader, attacker, support, defender covered; extras: support+attacker)
  { id:"h5",  n:"Solarius Vex",         faction:"bountyhunters",  rarity:"veteran",  cls:"support",  atk:20,  foc:180, spd:62, icon:"🔮",          subspecies:"Sage", portrait:"/commanders/h5_solarius_vex_portrait.webp", bust:"/commanders/h5_solarius_vex_bust.webp" },
  { id:"h6",  n:"Mira Ashveil",         faction:"bountyhunters",  rarity:"veteran",  cls:"attacker", atk:120, foc:100, spd:70, icon:"✨",          subspecies:"Sage",       portrait:"/commanders/h6_mira_ashveil_portrait.webp",         bust:"/commanders/h6_mira_ashveil_bust.webp" },
  { id:"h17", n:"Runekeeper Dov",       faction:"bountyhunters",  rarity:"soldier",  cls:"leader",   atk:75,  foc:80,  spd:58, icon:"📜",          subspecies:"Apprentice", portrait:"/commanders/h17_runekeeper_dov_portrait.webp", bust:"/commanders/h17_runekeeper_dov_bust.webp" },
  { id:"h18", n:"Hexblade Oren",        faction:"bountyhunters",  rarity:"soldier",  cls:"balanced", atk:90,  foc:60,  spd:55, icon:"🔯",          subspecies:"Apprentice", portrait:"/commanders/h18_hexblade_oren_portrait.webp",       bust:"/commanders/h18_hexblade_oren_bust.webp" },
  { id:"h29", n:"Archmage Theon",       faction:"bountyhunters",  rarity:"champion", cls:"support",  atk:40,  foc:210, spd:65, icon:"🌟",          subspecies:"Warlock",    portrait:"/commanders/h29_archmage_theon_portrait.webp",   bust:"/commanders/h29_archmage_theon_bust.webp" },
  { id:"h30", n:"Spellblade Ryn",       faction:"bountyhunters",  rarity:"champion", cls:"strategist", atk:155, foc:130, spd:72, icon:"⚡",          subspecies:"Warlock",    portrait:"/commanders/h30_spellblade_ryn_portrait.webp",   bust:"/commanders/h30_spellblade_ryn_bust.webp" },
  // ── MerFolk ── (leader, attacker, support, defender covered; extras: attacker+defender)





  // ── Orcs ── (leader, attacker, support, defender covered; extras: attacker+defender)
  { id:"h9",  n:"Grimtusk",             faction:"orcs",           rarity:"veteran",  cls:"attacker", atk:155, foc:0,   spd:60, icon:"⚔️",         subspecies:"Marauder", portrait:"/commanders/h9_grimtusk_portrait.webp", bust:"/commanders/h9_grimtusk_bust.webp" },
  { id:"h10", n:"Ashgrip",              faction:"orcs",           rarity:"veteran",  cls:"balanced", atk:115, foc:0,   spd:65, icon:"🪓",          subspecies:"Marauder",   portrait:"/commanders/h10_ashgrip_portrait.webp",             bust:"/commanders/h10_ashgrip_bust.webp" },
  { id:"h21", n:"Warcroak",             faction:"orcs",           rarity:"soldier",  cls:"leader",   atk:80,  foc:0,   spd:58, icon:"🥁",          subspecies:"Raider", portrait:"/commanders/h21_warcroak_portrait.webp", bust:"/commanders/h21_warcroak_bust.webp" },
  { id:"h22", n:"Shaman Grix",          faction:"orcs",           rarity:"soldier",  cls:"strategist",  atk:30,  foc:100, spd:60, icon:"💀",          subspecies:"Raider",     portrait:"/commanders/h22_shaman_grix_portrait.webp",         bust:"/commanders/h22_shaman_grix_bust.webp" },
  { id:"h33", n:"Warlord Korgath",      faction:"orcs",           rarity:"champion", cls:"attacker", atk:185, foc:0,   spd:62, icon:"🗡",          subspecies:"Warlord",    portrait:"/commanders/h33_warlord_korgath_portrait.webp",  bust:"/commanders/h33_warlord_korgath_bust.webp" },
  { id:"h34", n:"Ironhide Bruk",        faction:"orcs",           rarity:"champion", cls:"support", atk:140, foc:0,   spd:55, icon:"🦴",          subspecies:"Warlord",    portrait:"/commanders/h34_ironhide_bruk_portrait.webp",    bust:"/commanders/h34_ironhide_bruk_bust.webp" },
  // ── Dragons ── (leader, attacker, support, defender covered; extras: attacker+support)
  { id:"h11", n:"Emberclaw",            faction:"dragons",        rarity:"veteran",  cls:"balanced", atk:155, foc:0,   spd:75, icon:"🐉",          subspecies:"Adult", portrait:"/commanders/h11_emberclaw_portrait.webp", bust:"/commanders/h11_emberclaw_bust.webp" },
  { id:"h12", n:"Scaleveil Dusk",       faction:"dragons",        rarity:"veteran",  cls:"support",  atk:50,  foc:140, spd:80, icon:"🔥",          subspecies:"Adult",      portrait:"/commanders/h12_scaleveil_dusk_portrait.webp",       bust:"/commanders/h12_scaleveil_dusk_bust.webp" },
  { id:"h23", n:"Ashen Kraul",          faction:"dragons",        rarity:"soldier",  cls:"leader",   atk:78,  foc:0,   spd:68, icon:"🦎",          subspecies:"Hatchling", portrait:"/commanders/h23_ashen_kraul_portrait.webp", bust:"/commanders/h23_ashen_kraul_bust.webp" },
  { id:"h24", n:"Cinderfang",           faction:"dragons",        rarity:"soldier",  cls:"balanced", atk:100, foc:0,   spd:58, icon:"🪨",          subspecies:"Hatchling",  portrait:"/commanders/h24_cinderfang_portrait.webp",           bust:"/commanders/h24_cinderfang_bust.webp" },
  { id:"h35", n:"Pyrewing Skar",        faction:"dragons",         rarity:"champion", cls:"attacker", atk:180, foc:0,   spd:78, icon:"🌋", subspecies:"Elder",    portrait:"/commanders/h35_pyrewing_skar_portrait.webp",    bust:"/commanders/h35_pyrewing_skar_bust.webp" },
  { id:"h36", n:"Voidscale Nyxara",     faction:"dragons",         rarity:"champion", cls:"strategist",  atk:60,  foc:175, spd:82, icon:"🌑", subspecies:"Elder",    portrait:"/commanders/h36_voidscale_nyxara_portrait.webp", bust:"/commanders/h36_voidscale_nyxara_bust.webp" },

  { id:"h37", n:"Brother Aldric",          faction:"holyknights",     rarity:"soldier",  cls:"balanced", atk:78,  foc:20,  spd:48, icon:"🛡", subspecies:"Templar", portrait:"/commanders/h37_brother_aldric_portrait.webp", bust:"/commanders/h37_brother_aldric_bust.webp" },
  { id:"h38", n:"Commander Vayne",         faction:"holyknights",     rarity:"veteran",  cls:"leader",   atk:130, foc:30,  spd:55, icon:"⚔️", subspecies:"Templar", portrait:"/commanders/h38_commander_vayne_portrait.webp", bust:"/commanders/h38_commander_vayne_bust.webp" },
  { id:"h39", n:"Friar Brennan",           faction:"holyknights",     rarity:"soldier",  cls:"support",  atk:40,  foc:120, spd:52, icon:"✝️", subspecies:"BattlePriest", portrait:"/commanders/h39_friar_brennan_portrait.webp",         bust:"/commanders/h39_friar_brennan_bust.webp" },
  { id:"h40", n:"High Warden Seraph",      faction:"holyknights",     rarity:"champion", cls:"attacker", atk:178, foc:40,  spd:60, icon:"☀️", subspecies:"BattlePriest", portrait:"/commanders/h40_high_warden_seraph_portrait.webp",    bust:"/commanders/h40_high_warden_seraph_bust.webp" },
  { id:"h41", n:"Maniacal Priest Dante",    faction:"holyknights",     rarity:"veteran",  cls:"leader",  atk:45,  foc:145, spd:62, icon:"🌟", subspecies:"Inquisitor",   portrait:"/commanders/h41_maniacal_priest_dante_portrait.webp", bust:"/commanders/h41_maniacal_priest_dante_bust.webp" },
  { id:"h42", n:"Grand Inquisitor Mourne", faction:"holyknights",     rarity:"champion", cls:"strategist", atk:182, foc:20,  spd:58, icon:"🌑", subspecies:"Inquisitor",   portrait:"/commanders/h42_grand_inquistor_mourne_portrait.webp", bust:"/commanders/h42_grand_inquistor_mourne_bust.webp" },

  { id:"h43", n:"Countess Serava",      faction:"nightcreatures",  rarity:"veteran",  cls:"strategist", atk:150, foc:0,   spd:75, icon:"🦇", subspecies:"Vampire",      portrait:"/commanders/h43_countess_serava_portrait.webp",  bust:"/commanders/h43_countess_serava_bust.webp" },
  { id:"h44", n:"Lord Malachar",        faction:"nightcreatures",  rarity:"champion", cls:"strategist",  atk:65,  foc:170, spd:72, icon:"🩸", subspecies:"Vampire",      portrait:"/commanders/h44_lord_malachar_portrait.webp",          bust:"/commanders/h44_lord_malachar_bust.webp" },
  { id:"h45", n:"Fang Groth",           faction:"nightcreatures",  rarity:"soldier",  cls:"balanced", atk:92,  foc:0,   spd:80, icon:"🐺", subspecies:"Werewolf",     portrait:"/commanders/h45_fang_groth_portrait.webp",       bust:"/commanders/h45_fang_groth_bust.webp" },
  { id:"h46", n:"Alpha Korrax",         faction:"nightcreatures",  rarity:"champion", cls:"leader",   atk:185, foc:0,   spd:85, icon:"🌕", subspecies:"Werewolf",     portrait:"/commanders/h46_alpha_korrax_portrait.webp",           bust:"/commanders/h46_alpha_korrax_bust.webp" },
  { id:"h47", n:"Skitter Vex",          faction:"nightcreatures",  rarity:"soldier",  cls:"support", atk:70,  foc:20,  spd:60, icon:"🕷", subspecies:"Spider",       portrait:"/commanders/h47_skitter_vex_portrait.webp",          bust:"/commanders/h47_skitter_vex_bust.webp" },
  { id:"h48", n:"Thaelor the Silkbound", faction:"nightcreatures",  rarity:"veteran",  cls:"attacker",  atk:40,  foc:145, spd:65, icon:"🕸", subspecies:"Spider",       portrait:"/commanders/h48_thaelor_the_silkbound_portrait.webp", bust:"/commanders/h48_thaelor_the_silkbound_bust.webp" },
];


// ── NPC (non-playable) Generic Commanders ────────────────────────────────────
// Used as garrison defenders on AI tiles. Not in gacha pool.
// Stats are ~50% of average soldier-rarity playable commanders.
// Power level mapping: P1 → Skirmisher, P2 → Raider, P3/P4 → Outlaw
export const NPC_COMMANDERS = {
  skirmisher: { id:"npc1", n:"Skirmisher", icon:"⚔",  faction:null, rarity:"soldier", cls:"attacker", atk:45, foc:0,  spd:35, troopBranch:{ faction:"pirates",  branch:"swashbucklers", tier:0 } },
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
  balanced:   "iron_will",
  strategist: "field_medic",
  support:  "field_medic",
  leader:   "warchief_aura",
};
const FACTION_CMD_SECOND_SKILL = {
  attacker: "quick_strike",
  balanced:   "shield_wall",
  strategist: "mending_wave",
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
  const info      = respectLevelFromPoints(newTotal, cmd.rarity);
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

  // Class Lv20 bonuses (granted once when crossing level 20)
  const crossedLv20 = prevLevel < 20 && info.level >= 20;
  let classBonusAtk = 0, classBonusFoc = 0, classBonusSpd = 0, classBonusCmd = 0, classBonusSkillPts = 0;
  if (crossedLv20) {
    if (cmd.cls === "attacker")   { classBonusAtk = 25; classBonusSkillPts = 2; }
    if (cmd.cls === "leader")     { classBonusCmd = 5; }
    if (cmd.cls === "support")    { classBonusFoc = 25; classBonusSkillPts = 5; }
    if (cmd.cls === "balanced")   { classBonusAtk = 25; classBonusFoc = 25; classBonusSpd = 25; classBonusSkillPts = 2; }
    if (cmd.cls === "strategist") { classBonusFoc = 25; classBonusSkillPts = 2; }
  }
  const supportBonus = classBonusSkillPts; // renamed for compat

  return {
    ...cmd,
    ...statBump,
    rarity,
    respectPoints:      newTotal,
    respectLevel:       info.level,
    atk:                (cmd.atk  || 0) + classBonusAtk,
    foc:                (cmd.foc  || 0) + classBonusFoc,
    spd:                (cmd.spd  || 0) + classBonusSpd,
    commandBonus:       (cmd.commandBonus || 0) + classBonusCmd,
    unspentSkillPoints: newSkillPoints + supportBonus,
    _justPromoted:      promoted ? rarity : null,
    _classBonus:        crossedLv20 ? cmd.cls : null,
  };
}

// ── Backwards-compat shims ────────────────────────────────────────────────────
export const SC = RC;
export const SS = (rarity) => RARITY[rarity]?.n ?? String(rarity);

export { ALIGNMENT, PLAYABLE_FACTIONS, getFactionAlignment, AI_FACTIONS } from "./factions.js";
// TREE_DISPLAY_NAMES and getTreeDisplayNames are re-exported above from skills.js
