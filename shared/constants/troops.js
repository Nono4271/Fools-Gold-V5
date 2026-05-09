// ─────────────────────────────────────────────────────────────────────────────
//  troops.js — Faction Troop System
//
//  Structure:
//    FACTION_TROOPS[factionKey].quarters  — quarter name
//    FACTION_TROOPS[factionKey].branches  — array of 3 branches
//      branch.key, branch.label, branch.size ("small"|"medium"|"large")
//      branch.dmgType ("physical"|"magical")
//      branch.skills  — { a: SkillDef, b: SkillDef }
//      branch.tiers   — [lv1, lv2, lv3]  each: { label, desc, dmgLo, dmgHi, def, hp, siege, spd }
//
//  Command cost by size:
//    small  = 1 command per troop
//    medium = 2 command per troop
//    large  = 25 command per troop
//
//  Damage triangle (+10% damage):
//    small  → large
//    large  → medium
//    medium → small
//    ranged units → dragons (additional +15% from Exposed Wings passive)
//
//  Tier skill assignment:
//    T1 (lv1) → Skill A only
//    T2 (lv2) → Skill B only
//    T3 (lv3) → Skill A + Skill B
//
//  Skill upgrade: each skill levels 1–10
//    procChance scales from base → max over 10 levels
//    effect magnitudes are fixed (stated in desc)
// ─────────────────────────────────────────────────────────────────────────────

// ── Damage triangle modifier ──────────────────────────────────────────────────
export function troopSizeModifier(atkSize, defSize) {
  if (!atkSize || !defSize) return 1.0;
  if (atkSize === "small"  && defSize === "large")  return 1.1;
  if (atkSize === "large"  && defSize === "medium") return 1.1;
  if (atkSize === "medium" && defSize === "small")  return 1.1;
  return 1.0;
}

// ── Command cost by size ──────────────────────────────────────────────────────
export const COMMAND_COST = { small: 1, medium: 2, large: 25 };

// ── Legacy troopModifier (kept for battle.js compatibility) ──────────────────
export function troopModifier(atkType, defType) { return 1.0; }

// ── XP helpers (unchanged) ────────────────────────────────────────────────────
export const CMD_LVL_MIN = 5;
export const CMD_LVL_MAX = 50;
export function xpToNext(lvl) {
  return Math.floor(100 * Math.pow(1.18, lvl - CMD_LVL_MIN));
}

// ── Skill proc interpolation helper ──────────────────────────────────────────
// Returns proc chance at a given skill level (1–10)
export function skillProcAtLevel(skill, level) {
  const t = (Math.min(Math.max(level, 1), 10) - 1) / 9;
  return skill.procBase + t * (skill.procMax - skill.procBase);
}

// ─────────────────────────────────────────────────────────────────────────────
//  FACTION TROOPS
// ─────────────────────────────────────────────────────────────────────────────

export const FACTION_TROOPS = {

  // ── MARINES ─────────────────────────────────────────────────────────────────
  marines: {
    quarters: "Iron Garrison",
    branches: [
      {
        key: "regulars",
        label: "Regulars",
        size: "small",
        dmgType: "physical",
        role: "tanky",
        skills: {
          a: {
            key: "iron_wall",
            name: "Iron Wall",
            icon: "🛡",
            trigger: "round_start",
            desc: "Chance to taunt all enemies for 2 rounds, forcing attacks onto this unit.",
            procBase: 0.08, procMax: 0.80,
            effect: { type: "taunt", duration: 2 },
          },
          b: {
            key: "dig_in",
            name: "Dig In",
            icon: "⛏",
            trigger: "on_hit_received",
            desc: "On hit received, chance to reduce damage taken by 15% for 2 rounds.",
            procBase: 0.30, procMax: 0.75,
            effect: { type: "dmg_reduce", value: 0.15, duration: 2 },
          },
        },
        tiers: [
          { label: "Conscript",   desc: "Fresh recruit, disciplined but untested.",              dmgLo:  9, dmgHi: 11, def:  50, hp: 28, siege: 12, spd: 52 },
          { label: "Legionnaire", desc: "Battle-hardened line soldier.",                         dmgLo: 11, dmgHi: 14, def:  75, hp: 34, siege: 15, spd: 52 },
          { label: "Vanguard",    desc: "The tip of the spear, unbreakable and lethal.",         dmgLo: 14, dmgHi: 18, def: 100, hp: 40, siege: 18, spd: 52 },
        ],
      },
      {
        key: "ironclads",
        label: "Ironclads",
        size: "medium",
        dmgType: "physical",
        role: "tanky",
        skills: {
          a: {
            key: "shield_charge",
            name: "Shield Charge",
            icon: "🪖",
            trigger: "on_hit",
            desc: "On hit, chance to stun target for 1 round.",
            procBase: 0.15, procMax: 0.50,
            effect: { type: "stun", duration: 1 },
          },
          b: {
            key: "iron_stance",
            name: "Iron Stance",
            icon: "🔩",
            trigger: "round_start",
            desc: "On round start, chance to reduce damage received by 20% for 1 round.",
            procBase: 0.25, procMax: 0.75,
            effect: { type: "dmg_reduce", value: 0.20, duration: 1 },
          },
        },
        tiers: [
          { label: "Scout Rider",   desc: "Fast mounted patrol, light armor.",                          dmgLo: 15, dmgHi: 18, def: 28, hp:  63, siege: 13, spd:  92 },
          { label: "Iron Cavalry",  desc: "Heavily armored shock trooper on horseback.",               dmgLo: 20, dmgHi: 25, def: 38, hp:  83, siege: 15, spd: 112 },
          { label: "Dreadlancer",   desc: "Unstoppable mounted juggernaut in full plate.",             dmgLo: 25, dmgHi: 30, def: 58, hp:  98, siege: 18, spd: 122 },
        ],
      },
      {
        key: "wardens",
        label: "Wardens",
        size: "large",
        dmgType: "physical",
        role: "tanky",
        skills: {
          a: {
            key: "immovable",
            name: "Immovable",
            icon: "🗿",
            trigger: "on_hit_received",
            desc: "Stun immunity. On hit received, chance to counter attack at 50% damage.",
            procBase: 0.20, procMax: 1.00,
            effect: { type: "counter_attack", dmgMult: 0.50, stunImmune: true },
          },
          b: {
            key: "war_drum",
            name: "War Drum",
            icon: "🥁",
            trigger: "on_hit",
            desc: "On hit, chance to increase all allied troops defense by 20% for 2 rounds.",
            procBase: 0.15, procMax: 0.60,
            effect: { type: "ally_def_up", value: 0.20, duration: 2 },
          },
        },
        tiers: [
          { label: "Bulwark",   desc: "Massive shielded defender who holds the line.",                   dmgLo: 250, dmgHi: 270, def: 52, hp:  950, siege: 350, spd: 32 },
          { label: "Rampart",   desc: "An armored giant who absorbs punishment for allies.",              dmgLo: 300, dmgHi: 320, def: 62, hp: 1150, siege: 450, spd: 42 },
          { label: "Ironwall",  desc: "A living fortress — the last thing any enemy wants to see.",      dmgLo: 375, dmgHi: 395, def: 82, hp: 1550, siege: 550, spd: 52 },
        ],
      },
    ],
  },

  // ── PIRATES ─────────────────────────────────────────────────────────────────
  pirates: {
    quarters: "Plunder Yard",
    branches: [
      {
        key: "swashbucklers",
        label: "Swashbucklers",
        size: "small",
        dmgType: "physical",
        role: "glass_cannon",
        skills: {
          a: {
            key: "bladestorm",
            name: "Bladestorm",
            icon: "🌪",
            trigger: "on_hit",
            desc: "On hit, chance to attack twice in one round.",
            procBase: 0.20, procMax: 0.70,
            effect: { type: "double_attack" },
          },
          b: {
            key: "exploit_weakness",
            name: "Exploit Weakness",
            icon: "🗡",
            trigger: "on_hit",
            desc: "On hit, chance to apply 40% DEF down to target for 1 round.",
            procBase: 0.20, procMax: 0.60,
            effect: { type: "def_down", value: 0.40, duration: 1 },
          },
        },
        tiers: [
          { label: "Deckhand",  desc: "A scrappy sailor with a cutlass and nothing to lose.",           dmgLo: 17, dmgHi: 22, def:  9, hp: 18, siege:  7, spd: 69 },
          { label: "Buccaneer", desc: "Seasoned raider, scarred and dangerous.",                        dmgLo: 20, dmgHi: 25, def: 14, hp: 23, siege:  9, spd: 69 },
          { label: "Corsair",   desc: "Elite pirate duelist, feared across every port.",                dmgLo: 23, dmgHi: 28, def: 20, hp: 29, siege: 11, spd: 69 },
        ],
      },
      {
        key: "gunners",
        label: "Gunners",
        size: "medium",
        dmgType: "magical",
        role: "ranged",
        skills: {
          a: {
            key: "volatile_mix",
            name: "Volatile Mix",
            icon: "💣",
            trigger: "on_hit",
            desc: "On hit, chance to deal an extra 150% instance of damage.",
            procBase: 0.15, procMax: 0.65,
            effect: { type: "bonus_damage", value: 1.50 },
          },
          b: {
            key: "flashbang",
            name: "Flashbang",
            icon: "💥",
            trigger: "on_hit",
            desc: "On hit, chance to stun target for 1 round.",
            procBase: 0.10, procMax: 0.50,
            effect: { type: "stun", duration: 1 },
          },
        },
        tiers: [
          { label: "Powder Rat",  desc: "Reckless bomber who throws first and asks never.",             dmgLo: 20, dmgHi: 25, def: 15, hp:  50, siege:  8, spd: 108 },
          { label: "Cannoneer",   desc: "Trained artillery hand with a deadly eye.",                    dmgLo: 30, dmgHi: 38, def: 20, hp:  65, siege: 10, spd: 123 },
          { label: "Ironshot",    desc: "A walking siege battery wrapped in swagger.",                  dmgLo: 38, dmgHi: 45, def: 30, hp:  75, siege: 16, spd: 138 },
        ],
      },
      {
        key: "sea_beasts",
        label: "Sea Beasts",
        size: "large",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "crushing_grip",
            name: "Crushing Grip",
            icon: "🦀",
            trigger: "on_hit",
            desc: "On hit, chance to stun target for 1 round.",
            procBase: 0.15, procMax: 0.50,
            effect: { type: "stun", duration: 1 },
          },
          b: {
            key: "ink_cloud",
            name: "Ink Cloud",
            icon: "🦑",
            trigger: "on_hit",
            desc: "On hit, chance to apply confusion to all enemies for 1 round.",
            procBase: 0.10, procMax: 0.45,
            effect: { type: "confusion", target: "all_enemies", duration: 1 },
          },
        },
        tiers: [
          { label: "Reef Lurker",   desc: "A hulking crustacean tamed by pirate brine.",               dmgLo: 290, dmgHi: 310, def: 38, hp:  750, siege: 310, spd: 40 },
          { label: "Tide Crusher",  desc: "Massive armored beast that capsizes formations.",            dmgLo: 350, dmgHi: 370, def: 50, hp:  950, siege: 390, spd: 52 },
          { label: "Kraken Spawn",  desc: "A juvenile kraken — tentacles, chaos, devastation.",        dmgLo: 430, dmgHi: 450, def: 65, hp: 1200, siege: 490, spd: 65 },
        ],
      },
    ],
  },

  // ── WIZARDS ─────────────────────────────────────────────────────────────────
  bountyhunters: {
    quarters: "Ethereal Vault",
    branches: [
      {
        key: "acolytes",
        label: "Acolytes",
        size: "small",
        dmgType: "magical",
        role: "siege_ranged",
        skills: {
          a: {
            key: "arcane_march",
            name: "Arcane March",
            icon: "✨",
            trigger: "passive",
            desc: "Passively increases march speed by 50%.",
            procBase: 1.0, procMax: 1.0,
            effect: { type: "march_speed", value: 0.50 },
          },
          b: {
            key: "ley_line",
            name: "Ley Line",
            icon: "🔮",
            trigger: "round_start",
            desc: "On round start, chance to increase own damage by 20% for 1 round.",
            procBase: 0.20, procMax: 0.75,
            effect: { type: "self_dmg_up", value: 0.20, duration: 1 },
          },
        },
        tiers: [
          { label: "Novice",    desc: "A student of the arcane, volatile and eager.",                  dmgLo:  8, dmgHi: 13, def:  6, hp: 16, siege: 18, spd: 65 },
          { label: "Arcanist",  desc: "A focused spellcaster who bends reality with precision.",       dmgLo: 10, dmgHi: 17, def: 10, hp: 21, siege: 25, spd: 65 },
          { label: "Invoker",   desc: "A master of raw magical force, terrifying at range.",           dmgLo: 13, dmgHi: 22, def: 15, hp: 27, siege: 33, spd: 65 },
        ],
      },
      {
        key: "spellblades",
        label: "Spellblades",
        size: "medium",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "spellstrike",
            name: "Spellstrike",
            icon: "⚡",
            trigger: "on_hit",
            desc: "On hit, chance to deal an extra 120% instance of magical damage.",
            procBase: 0.20, procMax: 0.65,
            effect: { type: "bonus_damage", value: 1.20, dmgType: "magical" },
          },
          b: {
            key: "arcane_veil",
            name: "Arcane Veil",
            icon: "🌀",
            trigger: "on_hit_received",
            desc: "Confusion immunity. On hit received, chance to reduce damage taken by 15% for 1 round.",
            procBase: 0.25, procMax: 0.75,
            effect: { type: "dmg_reduce", value: 0.15, duration: 1, confusionImmune: true },
          },
        },
        tiers: [
          { label: "Runed Squire", desc: "A blade-fighter with a faint enchantment in their steel.",  dmgLo: 19, dmgHi: 23, def: 22, hp:  56, siege: 10, spd: 102 },
          { label: "Spellblade",   desc: "A warrior who channels magic through every strike.",         dmgLo: 27, dmgHi: 34, def: 32, hp:  73, siege: 14, spd: 118 },
          { label: "Hexknight",    desc: "A terrifying fusion of sorcery and swordsmanship.",         dmgLo: 34, dmgHi: 40, def: 46, hp:  85, siege: 18, spd: 132 },
        ],
      },
      {
        key: "golems",
        label: "Golems",
        size: "large",
        dmgType: "magical",
        role: "siege_ranged",
        skills: {
          a: {
            key: "arcane_suppression",
            name: "Arcane Suppression",
            icon: "🪨",
            trigger: "on_hit",
            desc: "On hit, chance to apply 35% DMG down to target for 2 rounds.",
            procBase: 0.15, procMax: 0.55,
            effect: { type: "dmg_down", value: 0.35, duration: 2 },
          },
          b: {
            key: "mana_siphon",
            name: "Mana Siphon",
            icon: "💜",
            trigger: "on_hit",
            desc: "On hit, chance to apply heal block to target for 2 rounds.",
            procBase: 0.10, procMax: 0.50,
            effect: { type: "heal_block", duration: 2 },
          },
        },
        tiers: [
          { label: "Stone Golem",    desc: "A crude magical construct, slow but nearly immovable.",   dmgLo: 330, dmgHi: 340, def: 30, hp:  600, siege: 410, spd: 44 },
          { label: "Arcane Golem",   desc: "Reinforced with spell-runes, crackling with stored energy.", dmgLo: 390, dmgHi: 400, def: 40, hp:  800, siege: 530, spd: 58 },
          { label: "Void Colossus",  desc: "An apocalyptic construct that unmakes walls and armies alike.", dmgLo: 488, dmgHi: 500, def: 60, hp: 1000, siege: 650, spd: 78 },
        ],
      },
    ],
  },

  // ── MERFOLK ─────────────────────────────────────────────────────────────────
  merfolk: {
    quarters: "Tidal Court",
    branches: [
      {
        key: "tidecallers",
        label: "Tidecallers",
        size: "small",
        dmgType: "magical",
        role: "ranged",
        skills: {
          a: {
            key: "tidal_surge",
            name: "Tidal Surge",
            icon: "🌊",
            trigger: "on_hit",
            desc: "On hit, chance to deal an extra 130% instance of damage.",
            procBase: 0.25, procMax: 0.70,
            effect: { type: "bonus_damage", value: 1.30 },
          },
          b: {
            key: "undertow",
            name: "Undertow",
            icon: "🌀",
            trigger: "on_hit",
            desc: "On hit, chance to apply 30% DEF down to target for 2 rounds.",
            procBase: 0.20, procMax: 0.60,
            effect: { type: "def_down", value: 0.30, duration: 2 },
          },
        },
        tiers: [
          { label: "Rippler",    desc: "A young merfolk who shapes currents into cutting jets.",        dmgLo: 10, dmgHi: 15, def: 20, hp: 20, siege: 10, spd: 62 },
          { label: "Wavecaster", desc: "Hurls surging torrents that knock enemies off their feet.",    dmgLo: 12, dmgHi: 19, def: 35, hp: 26, siege: 13, spd: 62 },
          { label: "Stormtide",  desc: "Commands the sea itself — walls of water as a weapon.",       dmgLo: 15, dmgHi: 24, def: 50, hp: 33, siege: 17, spd: 62 },
        ],
      },
      {
        key: "deepguard",
        label: "Deepguard",
        size: "medium",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "predators_mark",
            name: "Predator's Mark",
            icon: "🦈",
            trigger: "on_hit",
            desc: "On hit, chance to increase own offense by 20% for 2 rounds.",
            procBase: 0.30, procMax: 0.75,
            effect: { type: "self_atk_up", value: 0.20, duration: 2 },
          },
          b: {
            key: "deep_immunity",
            name: "Deep Immunity",
            icon: "🔱",
            trigger: "passive",
            desc: "Passive. Confusion immunity and stun immunity.",
            procBase: 1.0, procMax: 1.0,
            effect: { type: "immunity", immune: ["confusion", "stun"] },
          },
        },
        tiers: [
          { label: "Sharkbinder",    desc: "A merfolk rider mounted on a trained reef shark.",         dmgLo: 18, dmgHi: 22, def: 28, hp:  58, siege: 11, spd:  98 },
          { label: "Deepguard",      desc: "Elite trident cavalry on armored bull sharks.",            dmgLo: 26, dmgHi: 33, def: 38, hp:  76, siege: 15, spd: 115 },
          { label: "Abyssal Knight", desc: "A nightmare rider on a monstrous deep-sea predator.",     dmgLo: 33, dmgHi: 39, def: 51, hp:  88, siege: 19, spd: 128 },
        ],
      },
      {
        key: "leviathans",
        label: "Leviathans",
        size: "large",
        dmgType: "physical",
        role: "tanky",
        skills: {
          a: {
            key: "ancient_tide",
            name: "Ancient Tide",
            icon: "🐋",
            trigger: "round_start",
            desc: "On round start, chance to taunt all enemies for 2 rounds.",
            procBase: 0.08, procMax: 0.80,
            effect: { type: "taunt", duration: 2 },
          },
          b: {
            key: "abyssal_hide",
            name: "Abyssal Hide",
            icon: "🐚",
            trigger: "on_hit_received",
            desc: "On hit received, chance to reduce damage taken by 20% for 1 round.",
            procBase: 0.30, procMax: 0.75,
            effect: { type: "dmg_reduce", value: 0.20, duration: 1 },
          },
        },
        tiers: [
          { label: "Giantfin",   desc: "A colossal ancient fish, slow and near-indestructible.",      dmgLo: 252, dmgHi: 272, def: 54, hp: 1000, siege: 325, spd: 30 },
          { label: "Behemoth",   desc: "A deep sea titan that shakes the ground when it moves.",      dmgLo: 302, dmgHi: 322, def: 64, hp: 1200, siege: 425, spd: 40 },
          { label: "Leviathan",  desc: "The apex beast of the ocean — older than any kingdom.",      dmgLo: 377, dmgHi: 397, def: 84, hp: 1500, siege: 525, spd: 50 },
        ],
      },
    ],
  },

  // ── ORCS ────────────────────────────────────────────────────────────────────
  orcs: {
    quarters: "Grinding Grounds",
    branches: [
      {
        key: "grunts",
        label: "Grunts",
        size: "small",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "bloodlust",
            name: "Bloodlust",
            icon: "🩸",
            trigger: "on_hit_received",
            desc: "On hit received, chance to increase damage dealt by 5% per hit, max 20%.",
            procBase: 0.30, procMax: 0.75,
            effect: { type: "atk_stack", valuePerStack: 0.05, maxStacks: 4 },
          },
          b: {
            key: "battle_roar",
            name: "Battle Roar",
            icon: "📣",
            trigger: "round_start",
            desc: "On round start, chance to increase all allied troops offense by 20% for 2 rounds.",
            procBase: 0.15, procMax: 0.65,
            effect: { type: "ally_atk_up", value: 0.20, duration: 2 },
          },
        },
        tiers: [
          { label: "Grunt",     desc: "A snarling axe-swinger with zero fear and less patience.",      dmgLo: 11, dmgHi: 14, def: 20, hp: 22, siege: 14, spd: 56 },
          { label: "Marauder",  desc: "A veteran orc who collects ears as trophies.",                 dmgLo: 13, dmgHi: 17, def: 35, hp: 27, siege: 17, spd: 56 },
          { label: "Bloodaxe",  desc: "An orc warrior whose reputation clears rooms before battles.", dmgLo: 16, dmgHi: 22, def: 50, hp: 33, siege: 20, spd: 56 },
        ],
      },
      {
        key: "warg_riders",
        label: "Warg Riders",
        size: "medium",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "pack_hunter",
            name: "Pack Hunter",
            icon: "🐺",
            trigger: "on_hit",
            desc: "On hit, chance to attack twice in one round.",
            procBase: 0.20, procMax: 0.70,
            effect: { type: "double_attack" },
          },
          b: {
            key: "savage_bite",
            name: "Savage Bite",
            icon: "🦷",
            trigger: "on_hit",
            desc: "On hit, chance to apply 60% DEF down to target for 1 round.",
            procBase: 0.20, procMax: 0.60,
            effect: { type: "def_down", value: 0.60, duration: 1 },
          },
        },
        tiers: [
          { label: "Warg Pup Rider",  desc: "A young orc on a half-tamed warg — chaotic but fast.",  dmgLo: 18, dmgHi: 21, def: 25, hp:  55, siege: 11, spd: 100 },
          { label: "Warg Rider",      desc: "A seasoned wolf cavalry, brutal hit-and-run specialist.", dmgLo: 25, dmgHi: 32, def: 33, hp:  70, siege: 15, spd: 118 },
          { label: "Doomfang Rider",  desc: "Mounted on a massive alpha warg, a force of pure terror.", dmgLo: 32, dmgHi: 38, def: 48, hp:  80, siege: 19, spd: 130 },
        ],
      },
      {
        key: "trolls",
        label: "Trolls",
        size: "large",
        dmgType: "physical",
        role: "siege_tanky",
        skills: {
          a: {
            key: "lumber_haul",
            name: "Lumber Haul",
            icon: "🪵",
            trigger: "passive",
            desc: "Passively increases resources gathered by 50%.",
            procBase: 1.0, procMax: 1.0,
            effect: { type: "gather_bonus", value: 0.50 },
          },
          b: {
            key: "troll_march",
            name: "Troll March",
            icon: "🥾",
            trigger: "passive",
            desc: "Passively increases march speed by 50%.",
            procBase: 1.0, procMax: 1.0,
            effect: { type: "march_speed", value: 0.50 },
          },
        },
        tiers: [
          { label: "Cave Troll",     desc: "Dumb, enormous, and happy to smash anything in reach.",   dmgLo: 255, dmgHi: 275, def: 50, hp:  900, siege: 375, spd: 33 },
          { label: "War Troll",      desc: "Fitted with crude armor and chains, weaponized destruction.", dmgLo: 305, dmgHi: 325, def: 60, hp: 1150, siege: 475, spd: 43 },
          { label: "Stone Crusher",  desc: "An ancient troll of legendary size — walls crumble at its touch.", dmgLo: 380, dmgHi: 400, def: 70, hp: 1400, siege: 575, spd: 53 },
        ],
      },
    ],
  },

  // ── DRAGONS ─────────────────────────────────────────────────────────────────
  dragons: {
    quarters: "The Eyrie",
    // Faction-wide passives applied to ALL dragon troops
    factionPassives: [
      {
        key: "slow_to_rise",
        name: "Slow to Rise",
        icon: "🌅",
        desc: "Deal 10% reduced damage for the first 2 rounds of combat.",
        effect: { type: "dmg_reduce_early", value: 0.10, rounds: [1, 2] },
      },
      {
        key: "exposed_wings",
        name: "Exposed Wings",
        icon: "🏹",
        desc: "Take 15% bonus damage from ranged units.",
        effect: { type: "ranged_vulnerability", value: 0.15 },
      },
    ],
    branches: [
      {
        key: "dragonkin",
        label: "Dragonkin",
        size: "small",
        dmgType: "physical",
        role: "fast",
        skills: {
          a: {
            key: "predators_dive",
            name: "Predator's Dive",
            icon: "🦎",
            trigger: "on_hit",
            desc: "On hit, chance to attack twice in one round.",
            procBase: 0.20, procMax: 0.70,
            effect: { type: "double_attack" },
          },
          b: {
            key: "ember_trail",
            name: "Ember Trail",
            icon: "🔥",
            trigger: "on_hit",
            desc: "On hit, chance to deal an extra 140% instance of damage.",
            procBase: 0.25, procMax: 0.65,
            effect: { type: "bonus_damage", value: 1.40 },
          },
        },
        tiers: [
          { label: "Scaleblade", desc: "A lithe dragonkin skirmisher with fire in their veins.",      dmgLo: 16, dmgHi: 20, def: 13, hp: 24, siege: 13, spd: 72 },
          { label: "Emberclaw",  desc: "Faster and fiercer, leaving scorch marks with every pass.",   dmgLo: 20, dmgHi: 25, def: 17, hp: 32, siege: 18, spd: 72 },
          { label: "Ashfang",    desc: "A dragonkin assassin who strikes like a flame and vanishes.", dmgLo: 25, dmgHi: 32, def: 22, hp: 42, siege: 23, spd: 72 },
        ],
      },
      {
        key: "drake_riders",
        label: "Drake Riders",
        size: "medium",
        dmgType: "magical",
        role: "ranged",
        skills: {
          a: {
            key: "flame_breath",
            name: "Flame Breath",
            icon: "🐲",
            trigger: "on_hit",
            desc: "On hit, chance to apply 30% DMG down to target for 2 rounds.",
            procBase: 0.15, procMax: 0.55,
            effect: { type: "dmg_down", value: 0.30, duration: 2 },
          },
          b: {
            key: "dragonfire",
            name: "Dragonfire",
            icon: "🔥",
            trigger: "on_hit",
            desc: "On hit, chance to deal an extra 160% instance of damage. Max upgrade 70%.",
            procBase: 0.20, procMax: 0.70,
            effect: { type: "bonus_damage", value: 1.60 },
          },
        },
        tiers: [
          { label: "Drake Whelp Rider", desc: "A young rider on a juvenile drake, still learning to breathe fire.", dmgLo: 21, dmgHi: 25, def: 20, hp:  60, siege: 13, spd: 110 },
          { label: "Drake Rider",       desc: "A bonded pair — rider and drake moving as one lethal unit.",         dmgLo: 32, dmgHi: 40, def: 24, hp:  72, siege: 18, spd: 125 },
          { label: "Flamewing",         desc: "A veteran rider on a fully matured drake, dive-bombing with fire.",  dmgLo: 40, dmgHi: 45, def: 28, hp:  85, siege: 23, spd: 140 },
        ],
      },
      {
        key: "elder_dragons",
        label: "Elder Dragons",
        size: "large",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "scales_of_iron",
            name: "Scales of Iron",
            icon: "🐉",
            trigger: "on_hit_received",
            desc: "On hit received, chance to increase damage dealt by 4% per hit, max 20%.",
            procBase: 0.30, procMax: 0.75,
            effect: { type: "atk_stack", valuePerStack: 0.04, maxStacks: 5 },
          },
          b: {
            key: "draconic_roar",
            name: "Draconic Roar",
            icon: "😤",
            trigger: "round_end",
            desc: "On round end, chance to apply confusion to all enemies for 1 round.",
            procBase: 0.15, procMax: 0.50,
            effect: { type: "confusion", target: "all_enemies", duration: 1 },
          },
        },
        tiers: [
          { label: "Young Dragon",      desc: "Already massive, already dangerous, not yet fully awakened.",        dmgLo: 310, dmgHi: 330, def: 35, hp:  950, siege: 400, spd: 47 },
          { label: "Winged Destroyer",  desc: "A dragon in its prime — fire, talons, and unstoppable will.",       dmgLo: 370, dmgHi: 390, def: 48, hp: 1175, siege: 500, spd: 60 },
          { label: "Elder Dragon",      desc: "Ancient, colossal, and utterly without mercy.",                     dmgLo: 455, dmgHi: 475, def: 65, hp: 1450, siege: 600, spd: 80 },
        ],
      },
    ],
  },

  // ── HOLY KNIGHTS ─────────────────────────────────────────────────────────────
  holyknights: {
    quarters: "The Sanctum",
    factionPassives: [
      {
        key: "divine_shield",
        name: "Divine Shield",
        icon: "🛡",
        desc: "Take 10% reduced damage from all sources.",
        effect: { type: "dmg_reduce", value: 0.10 },
      },
      {
        key: "holy_bane",
        name: "Holy Bane",
        icon: "☀️",
        desc: "Deal 10% bonus damage to Night Creature troops.",
        effect: { type: "dmg_bonus_vs_faction", faction: "nightcreatures", value: 0.10 },
      },
    ],
    branches: [
      {
        key: "templars",
        label: "Templars",
        size: "small",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "holy_strike",
            name: "Holy Strike",
            icon: "⚔️",
            trigger: "on_hit",
            desc: "On hit, 20%→65% chance to deal an extra 120% instance of holy damage.",
            procBase: 0.20, procMax: 0.65,
            effect: { type: "bonus_damage", value: 1.20, dmgType: "holy" },
          },
          b: {
            key: "shield_wall",
            name: "Shield Wall",
            icon: "🛡",
            trigger: "on_hit_received",
            desc: "On hit received, 25%→75% chance to reduce damage taken by 20% for 1 round.",
            procBase: 0.25, procMax: 0.75,
            effect: { type: "dmg_reduce", value: 0.20, duration: 1 },
          },
        },
        tiers: [
          { label: "Initiate",  desc: "A newly sworn templar, shield raised and faith unbroken.",          dmgLo: 12, dmgHi: 16, def: 18, hp: 36, siege: 10, spd: 45 },
          { label: "Templar",   desc: "A battle-hardened holy warrior of iron will and blessed steel.",    dmgLo: 16, dmgHi: 20, def: 24, hp: 48, siege: 14, spd: 48 },
          { label: "Vanguard",  desc: "The foremost shield of the order — immovable, unyielding, divine.", dmgLo: 20, dmgHi: 26, def: 30, hp: 60, siege: 18, spd: 52 },
        ],
      },
      {
        key: "battlepriests",
        label: "BattlePriests",
        size: "small",
        dmgType: "magical",
        role: "support",
        skills: {
          a: {
            key: "mend",
            name: "Mend",
            icon: "✝️",
            trigger: "round_end",
            desc: "On round end, 30%→75% chance to restore 8% of max HP to allied troops.",
            procBase: 0.30, procMax: 0.75,
            effect: { type: "heal_allies", value: 0.08 },
          },
          b: {
            key: "smite",
            name: "Smite",
            icon: "☀️",
            trigger: "on_hit",
            desc: "On hit, 15%→55% chance to deal an extra 140% instance of holy damage.",
            procBase: 0.15, procMax: 0.55,
            effect: { type: "bonus_damage", value: 1.40, dmgType: "holy" },
          },
        },
        tiers: [
          { label: "Friar",       desc: "A young battle-cleric who fights and heals in equal measure.",       dmgLo: 10, dmgHi: 14, def: 12, hp: 28, siege:  8, spd: 55 },
          { label: "BattlePriest",desc: "A seasoned warrior-priest channeling holy wrath and restoration.",   dmgLo: 13, dmgHi: 18, def: 15, hp: 38, siege: 11, spd: 58 },
          { label: "High Warden", desc: "A wrathful divine champion who smites as fiercely as they heal.",    dmgLo: 17, dmgHi: 23, def: 19, hp: 48, siege: 14, spd: 62 },
        ],
      },
      {
        key: "inquisitors",
        label: "Inquisitors",
        size: "medium",
        dmgType: "physical",
        role: "fast",
        skills: {
          a: {
            key: "judgment",
            name: "Judgment",
            icon: "🌟",
            trigger: "on_hit",
            desc: "On hit, 20%→60% chance to apply 20% ATK down to target for 2 rounds.",
            procBase: 0.20, procMax: 0.60,
            effect: { type: "atk_down", value: 0.20, duration: 2 },
          },
          b: {
            key: "purge",
            name: "Purge",
            icon: "✨",
            trigger: "on_hit",
            desc: "On hit, 20%→60% chance to remove all active debuffs from allied troops and commander.",
            procBase: 0.20, procMax: 0.60,
            effect: { type: "cleanse_allies" },
          },
        },
        tiers: [
          { label: "Witch Hunter",     desc: "A relentless tracker of heretics armed with zeal and silver.",     dmgLo: 22, dmgHi: 28, def: 16, hp: 46, siege: 15, spd: 68 },
          { label: "Inquisitor",       desc: "A fearsome judge dispensing holy justice on the battlefield.",     dmgLo: 28, dmgHi: 36, def: 20, hp: 60, siege: 20, spd: 72 },
          { label: "Grand Inquisitor", desc: "The holy order's most feared champion — unbending, unstoppable.",  dmgLo: 36, dmgHi: 45, def: 26, hp: 75, siege: 26, spd: 76 },
        ],
      },
    ],
  },

  // ── NIGHT CREATURES ───────────────────────────────────────────────────────────
  nightcreatures: {
    quarters: "The Shadowfen",
    factionPassives: [
      {
        key: "creatures_of_darkness",
        name: "Creatures of Darkness",
        icon: "🌑",
        desc: "Deal 15% bonus damage during the first 3 rounds of combat.",
        effect: { type: "dmg_bonus_early", value: 0.15, rounds: [1, 2, 3] },
      },
      {
        key: "holy_weakness",
        name: "Holy Weakness",
        icon: "☀️",
        desc: "Always take 10% bonus damage from Holy Knight troops.",
        effect: { type: "dmg_vulnerability_vs_faction", faction: "holyknights", value: 0.10 },
      },
    ],
    branches: [
      {
        key: "vampires",
        label: "Vampires",
        size: "small",
        dmgType: "physical",
        role: "normal",
        skills: {
          a: {
            key: "blood_feast",
            name: "Blood Feast",
            icon: "🩸",
            trigger: "on_hit",
            desc: "On hit, 20%→65% chance to heal for 80% of damage dealt.",
            procBase: 0.20, procMax: 0.65,
            effect: { type: "lifesteal", value: 0.80 },
          },
          b: {
            key: "mesmerize",
            name: "Mesmerize",
            icon: "🌀",
            trigger: "on_hit",
            desc: "On hit, 10%→50% chance to confuse target for 1 round.",
            procBase: 0.10, procMax: 0.50,
            effect: { type: "confusion", target: "target", duration: 1 },
          },
        },
        tiers: [
          { label: "Thrall",    desc: "A newly turned vampire still mastering their dark gifts.",          dmgLo: 14, dmgHi: 18, def: 14, hp: 32, siege: 10, spd: 60 },
          { label: "Vampire",   desc: "A bloodsucker in their prime — fast, predatory, relentless.",       dmgLo: 18, dmgHi: 23, def: 18, hp: 42, siege: 14, spd: 65 },
          { label: "Nightlord", desc: "An ancient vampire of terrifying power and imperious dark grace.",   dmgLo: 23, dmgHi: 30, def: 23, hp: 54, siege: 18, spd: 70 },
        ],
      },
      {
        key: "werewolves",
        label: "Werewolves",
        size: "medium",
        dmgType: "physical",
        role: "fast",
        skills: {
          a: {
            key: "feral_lunge",
            name: "Feral Lunge",
            icon: "🐺",
            trigger: "on_hit",
            desc: "On hit, 20%→70% chance to strike twice in one round.",
            procBase: 0.20, procMax: 0.70,
            effect: { type: "double_attack" },
          },
          b: {
            key: "pack_fury",
            name: "Pack Fury",
            icon: "🌕",
            trigger: "round_start",
            desc: "On round start, 30%→75% chance to increase ATK by 5% per stack, max 4 stacks.",
            procBase: 0.30, procMax: 0.75,
            effect: { type: "atk_stack", valuePerStack: 0.05, maxStacks: 4 },
          },
        },
        tiers: [
          { label: "Pup",    desc: "A young werewolf still learning to harness the beast within.",         dmgLo: 20, dmgHi: 26, def: 16, hp: 55, siege: 12, spd: 75 },
          { label: "Howler", desc: "A seasoned werewolf hunting in packs with savage coordination.",        dmgLo: 26, dmgHi: 34, def: 21, hp: 72, siege: 16, spd: 82 },
          { label: "Alpha",  desc: "A dominant alpha — where it goes, chaos and blood follow.",             dmgLo: 33, dmgHi: 43, def: 27, hp: 90, siege: 21, spd: 90 },
        ],
      },
      {
        key: "spiders",
        label: "Spiders",
        size: "large",
        dmgType: "magical",
        role: "ranged",
        skills: {
          a: {
            key: "ensnare",
            name: "Ensnare",
            icon: "🕸",
            trigger: "on_hit",
            desc: "On hit, 15%→55% chance to reduce all enemies' SPD by 25% for 2 rounds.",
            procBase: 0.15, procMax: 0.55,
            effect: { type: "spd_down", target: "all_enemies", value: 0.25, duration: 2 },
          },
          b: {
            key: "venom_burst",
            name: "Venom Burst",
            icon: "🕷",
            trigger: "on_hit",
            desc: "On hit, 20%→60% chance to apply poison dealing 30% damage per round for 3 rounds. Cannot stack or reapply until expired.",
            procBase: 0.20, procMax: 0.60,
            effect: { type: "dot_poison", value: 0.30, duration: 3, noStack: true, noRefresh: true },
          },
        },
        tiers: [
          { label: "Spiderling",    desc: "A freshly hatched brood — small but swarming and venomous.",       dmgLo: 130, dmgHi: 150, def: 28, hp: 420, siege: 80,  spd: 55 },
          { label: "Venom Stalker", desc: "A fully grown spider that paralyses prey before devouring it.",    dmgLo: 160, dmgHi: 185, def: 38, hp: 540, siege: 110, spd: 62 },
          { label: "Broodmother",   desc: "A colossal matriarch commanding the swarm with terrifying will.",  dmgLo: 200, dmgHi: 230, def: 50, hp: 680, siege: 140, spd: 70 },
        ],
      },
    ],
  },
};

// ── Convenience lookups ───────────────────────────────────────────────────────

export const FACTION_KEYS = Object.keys(FACTION_TROOPS);

// Resolve a { faction, branch, tier } ref to a branch object
export function resolveTroopBranch(troopRef) {
  if (!troopRef?.faction || !troopRef?.branch) return null;
  const faction = FACTION_TROOPS[troopRef.faction];
  if (!faction) return null;
  return faction.branches.find(b => b.key === troopRef.branch) ?? null;
}

// Resolve a { faction, branch, tier } ref to a tier stat object
export function resolveTroopTier(troopRef) {
  const branch = resolveTroopBranch(troopRef);
  if (!branch) return null;
  const idx = (troopRef?.tier ?? 1) - 1;
  return branch.tiers[Math.min(idx, 2)] ?? null;
}

// Get skills for a tier (0=lv1, 1=lv2, 2=lv3)
export function getTierSkills(branch, tierIndex) {
  if (tierIndex === 0) return [branch.skills.a];
  if (tierIndex === 1) return [branch.skills.b];
  return [branch.skills.a, branch.skills.b];
}

// All unique troop labels flattened (for UI lists etc.)
export function getAllTroopLabels() {
  const labels = [];
  for (const faction of Object.values(FACTION_TROOPS)) {
    for (const branch of faction.branches) {
      for (const tier of branch.tiers) {
        labels.push(tier.label);
      }
    }
  }
  return labels;
}

// Legacy TROOP_KEYS shim so any existing code that imports TROOP_KEYS doesn't break
export const TROOP_KEYS = FACTION_KEYS;
