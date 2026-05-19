/* ─────────────────────────────────────────────────────────────────────────────
   ashen_dead_skills.js — Ashen Dead Faction Skills
   72 total: 12 unique skills per commander, no reskins
   6 commanders × 12 skills each

   Commanders:
     Malgrath the Eternal  (h55, strategist, champion, Lich)
     Lord Varak            (h56, strategist, champion, Death Knight)
     Ser Dreadmourne       (h57, balanced,   veteran,  Death Knight)
     Veyra the Hollow      (h58, attacker,   veteran,  Revenant)
     Fallen Lord Mordwyn   (h59, support,    soldier,  Lich)
     Cael the Risen        (h60, attacker,   soldier,  Revenant)

   New debuffs:
     Life Drain — Any healing received is inflicted as 50% of that amount as damage (2 rnd, no stack)
     Mummify    — 3 round escalating: SPD -25% / SPD -50% / skip turn (no stack, resets on reapply)
───────────────────────────────────────────────────────────────────────────── */

// ── MALGRATH THE ETERNAL (strategist, champion, Lich) ─────────────────────────
// ATK:40, FOC:210, SPD:65 — extreme FOC caster. Life Drain specialist,
// AoE FOC damage, vulnerability stacking, undead army buffer.

export const MALGRATH_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3,6,9) ───────────────────────────────────
  malgrath_eternal_gaze: {
    name: "Eternal Gaze", icon: "👁️", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 12% FOC DMG (FOC mod). Targets take +15% more on next FOC hit. (Rounds 3,6,9)",
    effect: { type: "aoe_focus_damage_vuln", focVuln: 0.15, modifiedBy: "foc" },
    base: 0.12, perLevel: 0.12,
    maxLevelEffect: { cmdFocBonus: 10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.12+lvl*0.12)*100)}% FOC DMG + next FOC hit +15%${lvl>=14?" | Max: FOC +10":""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  malgrath_lichs_aura: {
    name: "Lich's Aura", icon: "💜", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[CMD] FOC +2.0. (Passive)",
    effect: { type: "cmd_foc_passive", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `CMD FOC +${2.0+lvl*2.0} (permanent)`,
  },

  malgrath_void_step: {
    name: "Void Step", icon: "👣", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[Allied Units] Each round: 4% chance to evade first hit. (Passive)",
    effect: { type: "army_evasion_per_round_chance", chance: 0.04 },
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.04+lvl*0.04)*100))}% chance evade first hit (permanent)`,
  },

  // ── R0 BOTTOM — Main (3CD → rounds 4,8) ──────────────────────────────────
  malgrath_malgraths_curse: {
    name: "Malgrath's Curse", icon: "💀", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[Highest HP Enemy] 40% FOC DMG (FOC mod) + Life Drain (2 rnd) + DEF -5 permanently. (Rounds 4,8)",
    effect: { type: "focus_damage_life_drain_def_down", target: "highestHp", defDown: 5.0, modifiedBy: "foc" },
    base: 0.40, perLevel: 0.40,
    maxLevelEffect: { cmdFocBonus: 10 },
    nextDesc: (lvl) => `[Highest HP] ${Math.round((0.40+lvl*0.40)*100)}% FOC DMG + Life Drain (2 rnd) + DEF -5 permanently${lvl>=14?" | Max: FOC +10":""} — rounds 4,8`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  malgrath_eternal_hunger: {
    name: "Eternal Hunger", icon: "🩸", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[Enemies with Life Drain] FOC DMG Received +4%. (Passive)",
    effect: { type: "life_drain_enemy_foc_dmg_taken_up", value: 0.04 },
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `Life Drain enemies: FOC DMG Received +${Math.round((0.04+lvl*0.04)*100)}% (permanent)`,
  },

  malgrath_undead_mastery: {
    name: "Undead Mastery", icon: "💀", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[Allied Ashen Dead Units] DMG +1.5%. (Passive)",
    effect: { type: "faction_dmg_bonus", faction: "ashen_dead", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `[Ashen Dead Units] DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  // ── R3 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  malgrath_plague_of_the_eternal: {
    name: "Plague of the Eternal", icon: "☠️", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 8% chance each to apply Life Drain (2 rnd). (Rounds 3,6,9)",
    effect: { type: "aoe_life_drain_chance", chance: 0.08 },
    base: 0.08, perLevel: 0.04,
    maxLevelEffect: { lifeDrainEnemyDmgTakenUp: 0.05 },
    nextDesc: (lvl) => `All enemies: ${Math.min(100,Math.round((0.08+lvl*0.04)*100))}% chance Life Drain (2 rnd)${lvl>=14?" | Max: Life Drain enemies +5% DMG taken":""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  malgrath_malgraths_will: {
    name: "Malgrath's Will", icon: "🌀", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[CMD] Each round: 12% chance Confusion Immunity. (Passive)",
    effect: { type: "per_round_confusion_immune_chance", chance: 0.12 },
    base: 0.12, perLevel: 0.12,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.12+lvl*0.12)*100))}% Confusion Immunity (permanent)`,
  },

  malgrath_deaths_patience: {
    name: "Death's Patience", icon: "⏳", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[CMD] ATK +1.0 | FOC +1.0 | SPD +1.0. (Passive)",
    effect: { type: "cmd_triple_stat_passive", atkValue: 1.0, focValue: 1.0, spdValue: 1.0 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `CMD ATK +${1.0+lvl*1.0} | FOC +${1.0+lvl*1.0} | SPD +${1.0+lvl*1.0} (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  malgrath_malgraths_dominion: {
    name: "Malgrath's Dominion", icon: "👑", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[CMD] FOC +2.0 | [Allies] FOC DMG +1.5% | [Life Drain Enemies] DMG taken +5%. (Passive) Max Level: FOC +15.",
    effect: { type: "lich_dominion_passive", focUp: 2.0, allyFocDmgUp: 0.015, lifeDrainEnemyVuln: 0.05 },
    base: 2.0, perLevel: 2.0,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `CMD FOC +${2.0+lvl*2.0} | Allies FOC DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% | Life Drain enemies +5% DMG${lvl>=14?" | Max: FOC +15":""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  malgrath_void_mastery: {
    name: "Void Mastery", icon: "🔮", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "passive",
    desc: "[CMD] FOC DMG dealt +3%. (Passive)",
    effect: { type: "cmd_focus_dmg_bonus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `CMD FOC DMG +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // 3CD → rounds 4,8
  malgrath_necrotic_touch: {
    name: "Necrotic Touch", icon: "🖤", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h55",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemy Units] 18% FOC DMG (FOC mod) + 35% chance Life Drain (2 rnd). (Rounds 4,8)",
    effect: { type: "focus_damage_life_drain_chance", targets: 2, lifeDrainChance: 0.35, modifiedBy: "foc" },
    base: 0.18, perLevel: 0.18,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.18+lvl*0.18)*100)}% FOC DMG + 35% Life Drain (2 rnd) — rounds 4,8`,
  },
};

export const MALGRATH_RESKIN_SKILLS = {};

// ── LORD VARAK (strategist, champion, Death Knight) ───────────────────────────
// ATK:50, FOC:190, SPD:62 — FOC debuffer, silence specialist,
// Death Cavalry commander, Life Drain enabler.

export const VARAK_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (firesOnRounds: [2,5,8]) ────────────────────────────────
  varak_varaks_verdict: {
    name: "Varak's Verdict", icon: "⚖️", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "active", cooldown: 99, offset: 2, duration: 1,
    desc: "[Enemy CMD] Silence (1 rnd) + [All Enemies] FOC DMG Received +2%. (Rounds 2,5,8)",
    effect: { type: "silence_and_foc_vuln", silenceDuration: 1, focVuln: 0.02 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { cmdFocBonus: 15 },
    nextDesc: (lvl) => `Enemy CMD Silenced + All enemies FOC DMG Rec +${Math.round((0.02+lvl*0.02)*100)}%${lvl>=14?" | Max: FOC +15":""} — rounds 2,5,8`,
    firesOnRounds: [2, 5, 8],
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  varak_dark_presence: {
    name: "Dark Presence", icon: "🌑", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "passive",
    desc: "[Enemy Units] FOC DMG Received +2.0%. (Passive)",
    effect: { type: "vs_all_foc_dmg_taken_up", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `Enemy Units FOC DMG Received +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  varak_iron_decree: {
    name: "Iron Decree", icon: "⚔️", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "passive",
    desc: "[Allied Units] DMG Received from Human alignment -1.5%. (Passive)",
    effect: { type: "dmg_resist_vs_alignment", alignment: "humans", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `Allied Units DMG Rec from Humans -${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  // ── R0 BOTTOM — Main (3CD → rounds 4,8) ──────────────────────────────────
  varak_dread_surge: {
    name: "Dread Surge", icon: "💥", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 10% FOC DMG × 3 hits (FOC mod). (Rounds 4,8)",
    effect: { type: "aoe_focus_multi_hit", hits: 3, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { enemyFocDmgTakenUp: 0.05 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% FOC DMG × 3 hits${lvl>=14?" | Max: Enemies FOC DMG taken +5%":""} — rounds 4,8`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  varak_varaks_focus: {
    name: "Varak's Focus", icon: "🔮", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "passive",
    desc: "[CMD] FOC +2.0. (Passive)",
    effect: { type: "cmd_foc_passive", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `CMD FOC +${2.0+lvl*2.0} (permanent)`,
  },

  // 2CD → rounds 3,6,9
  varak_void_sight: {
    name: "Void Sight", icon: "👁️", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Lowest DEF Enemy] 20% FOC DMG (FOC mod). (Rounds 3,6,9)",
    effect: { type: "focus_damage_single", target: "lowestDef", modifiedBy: "foc" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `[Lowest DEF] ${Math.round((0.20+lvl*0.20)*100)}% FOC DMG (FOC mod) — rounds 3,6,9`,
  },

  // ── R3 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  varak_death_knell: {
    name: "Death Knell", icon: "🔔", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 10% FOC DMG (FOC mod) + 35% chance Confusion (1 rnd) + 25% chance Life Drain (2 rnd). (Rounds 3,6,9)",
    effect: { type: "aoe_focus_confusion_life_drain", confusionChance: 0.35, lifeDrainChance: 0.25, modifiedBy: "foc" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { cmdNormalAtkFocBonus: 1.00 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% FOC DMG + 35% Confusion + 25% Life Drain${lvl>=14?" | Max: CMD normal attacks deal FOC DMG":""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  varak_soul_hunger: {
    name: "Soul Hunger", icon: "🩸", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "passive",
    desc: "[Enemies with Life Drain] FOC DMG Received +3.0%. (Passive)",
    effect: { type: "life_drain_enemy_foc_dmg_taken_up", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `Life Drain enemies: FOC DMG Received +${Math.round((0.03+lvl*0.03)*100)}% (permanent)`,
  },

  // 3CD → rounds 4,8
  varak_void_lance: {
    name: "Void Lance", icon: "🗡️", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[Lowest DEF Enemy] 35% FOC DMG (FOC mod). (Rounds 4,8)",
    effect: { type: "focus_damage_single", target: "lowestDef", modifiedBy: "foc" },
    base: 0.35, perLevel: 0.35,
    nextDesc: (lvl) => `[Lowest DEF] ${Math.round((0.35+lvl*0.35)*100)}% FOC DMG (FOC mod) — rounds 4,8`,
  },

  // ── R5 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  varak_varaks_vanguard: {
    name: "Varak's Vanguard", icon: "🐴", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[Death Cavalry] DEF +3 | DMG +2% | [2 Enemies] 12% FOC DMG. (Rounds 3,6,9) Max: Life Drain active → Army Confusion Immune.",
    effect: { type: "death_cavalry_buff_foc_dmg", defBonus: 3, dmgBonus: 0.02, focDmg: 0.12, targets: 2, modifiedBy: "foc" },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { lifeDrainArmyConfusionImmune: true },
    nextDesc: (lvl) => `[Death Cavalry] DEF +${3+lvl*3} | DMG +${Math.round((0.02+lvl*0.02)*100)}% | [2 Units] ${Math.round((0.12+lvl*0.12)*100)}% FOC DMG${lvl>=14?" | Max: Life Drain → Army Confusion Immune":""} — rounds 3,6,9`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  varak_death_touched: {
    name: "Death Touched", icon: "💀", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "passive",
    desc: "[Enemy Units] DEF -1.5 each time Life Drain is applied. Max 3 stacks. (Passive)",
    effect: { type: "life_drain_applied_def_down", defDown: 1.5, maxStacks: 3 },
    base: 1.5, perLevel: 1.5,
    nextDesc: (lvl) => `Each Life Drain applied: enemy DEF -${1.5+lvl*1.5} (max 3 stacks) (permanent)`,
  },

  varak_the_eternal_knight: {
    name: "The Eternal Knight", icon: "⚡", tree: "tactics", cls: "strategist",
    faction: "ashen_dead", commander: "h56",
    type: "passive",
    desc: "[When Life Drain is applied] 7% chance next skill deals +30% bonus DMG. (Passive)",
    effect: { type: "life_drain_applied_next_skill_bonus", chance: 0.07, bonusDmg: 0.30 },
    base: 0.07, perLevel: 0.07,
    nextDesc: (lvl) => `On Life Drain applied: ${Math.min(100,Math.round((0.07+lvl*0.07)*100))}% chance next skill +30% DMG (permanent)`,
  },
};

export const VARAK_RESKIN_SKILLS = {};

// ── SER DREADMOURNE (balanced, veteran, Death Knight) ─────────────────────────
// ATK:110, FOC:0, SPD:68 — physical bruiser. Army buffer, stat drainer,
// Skeleton/Death Cavalry specialist, light healer.

export const DREADMOURNE_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (3CD → rounds 4,8) ─────────────────────────────────────
  dread_iron_dominion: {
    name: "Iron Dominion", icon: "⚔️", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[Skeleton & Death Cavalry] DMG +1.5% | DEF +3 | [All Enemies] DEF -2. (Rounds 4,8)",
    effect: { type: "undead_buff_enemy_def_down", dmgBonus: 0.015, defBonus: 3, enemyDefDown: 2.0 },
    base: 0.015, perLevel: 0.015,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `[Skeleton/Death Cavalry] DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% | DEF +${3+lvl*3} | Enemy DEF -${2+lvl*2}${lvl>=14?" | Max: CMD ATK +15":""} — rounds 4,8`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  dread_death_knights_charge: {
    name: "Death Knight's Charge", icon: "🐴", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "passive",
    desc: "[Allied Death Cavalry] DMG +2.0%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "death_cavalry", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Death Cavalry] DMG +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  // 2CD → rounds 3,6,9
  dread_dreadmournes_wrath: {
    name: "Dreadmourne's Wrath", icon: "💥", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 25% Physical DMG (ATK mod). (Rounds 3,6,9)",
    effect: { type: "physical_damage_single", modifiedBy: "atk" },
    base: 0.25, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((0.25+lvl*0.25)*100)}% Physical DMG (ATK mod) — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3,6,9) ────────────────────────────────
  dread_carrion_blow: {
    name: "Carrion Blow", icon: "🩸", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemies] 20% Physical DMG (ATK mod). Allied troops recover 5% HP. (Rounds 3,6,9)",
    effect: { type: "physical_damage_multi_ally_heal", targets: 2, allyHealPct: 0.05, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + Allies recover ${Math.round((0.05+lvl*0.05)*100)}% HP${lvl>=14?" | Max: ATK +15":""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  dread_unholy_strength: {
    name: "Unholy Strength", icon: "💪", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "passive",
    desc: "[Allied Units] DMG +1.0% vs Human alignment. (Passive)",
    effect: { type: "dmg_bonus_vs_alignment", alignment: "humans", value: 0.01 },
    base: 0.01, perLevel: 0.01,
    nextDesc: (lvl) => `Allied Units DMG +${Math.round((0.01+lvl*0.01)*100)}% vs Human units (permanent)`,
  },

  dread_death_knights_honor: {
    name: "Death Knight's Honor", icon: "🛡️", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "passive",
    desc: "[Allied Ashen Dead Units] Physical DMG Received -1.5%. (Passive)",
    effect: { type: "faction_phys_dmg_reduce", faction: "ashen_dead", value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `[Ashen Dead Units] Physical DMG Rec -${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  // ── R3 — Main (3CD → rounds 4,8) ─────────────────────────────────────────
  dread_dead_mans_weight: {
    name: "Dead Man's Weight", icon: "⚓", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "active", cooldown: 3, offset: 4, duration: 3,
    desc: "[All Enemies] SPD -20 (3 rnd) + 30% chance Confusion (1 rnd). (Rounds 4,8)",
    effect: { type: "aoe_spd_down_confusion_chance", spdDown: 20, spdDuration: 3, confusionChance: 0.30, confusionDuration: 1 },
    base: 20, perLevel: 2,
    maxLevelEffect: { armySpdBonus: 5 },
    nextDesc: (lvl) => `All enemies SPD -${20+lvl*2} (3 rnd) + ${Math.min(100,Math.round((0.30+lvl*0.03)*100))}% Confusion${lvl>=14?" | Max: Army SPD +5":""} — rounds 4,8`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  dread_slow_agony: {
    name: "Slow Agony", icon: "🐌", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "passive",
    desc: "[All Enemies] Each round: 5% chance Confusion (1 rnd). (Passive)",
    effect: { type: "per_round_confusion_chance_enemy", chance: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.05+lvl*0.05)*100))}% Confusion on all enemies (permanent)`,
  },

  dread_dreadmournes_resolve: {
    name: "Dreadmourne's Resolve", icon: "💎", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "passive",
    desc: "[CMD] ATK +2.0. (Passive)",
    effect: { type: "cmd_atk_passive", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `CMD ATK +${2.0+lvl*2.0} (permanent)`,
  },

  // ── R5 — Main (3CD → rounds 4,8) ─────────────────────────────────────────
  dread_bone_crusher: {
    name: "Bone Crusher", icon: "🦴", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[1 Enemy] 50% Physical DMG (ATK mod) + target cannot gain positive buffs (2 rnd). (Rounds 4,8)",
    effect: { type: "physical_damage_buff_block", blockDuration: 2, modifiedBy: "atk" },
    base: 0.50, perLevel: 0.50,
    maxLevelEffect: { cmdStunImmune: true },
    nextDesc: (lvl) => `${Math.round((0.50+lvl*0.50)*100)}% Physical DMG + no positive buffs (2 rnd)${lvl>=14?" | Max: CMD Stun Immune":""} — rounds 4,8`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  dread_grim_efficiency: {
    name: "Grim Efficiency", icon: "⚔️", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "passive",
    desc: "[CMD] Normal attacks deal +3% extra Physical DMG. (Passive)",
    effect: { type: "cmd_normal_atk_bonus", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `CMD Normal Attacks +${Math.round((0.03+lvl*0.03)*100)}% extra Physical DMG (permanent)`,
  },

  // 2CD → rounds 3,6,9
  dread_bone_splitter: {
    name: "Bone Splitter", icon: "💢", tree: "combat", cls: "balanced",
    faction: "ashen_dead", commander: "h57",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[2 Enemies] 30% Physical DMG (ATK mod) + 40% chance Slow (-25% SPD, 2 rnd). (Rounds 3,6,9)",
    effect: { type: "physical_damage_slow_chance", targets: 2, slowChance: 0.40, slowValue: 25, slowDuration: 2, modifiedBy: "atk" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.30+lvl*0.30)*100)}% Physical DMG + 40% Slow (-25% SPD, 2 rnd) — rounds 3,6,9`,
  },
};

export const DREADMOURNE_RESKIN_SKILLS = {};

// ── VEYRA THE HOLLOW (attacker, veteran, Revenant) ────────────────────────────
// ATK:130, FOC:0, SPD:72 — Coldborn hunter, poison/slow specialist,
// permanent ATK stacker, DEF shredder.

export const VEYRA_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  veyra_the_haunting: {
    name: "The Haunting", icon: "👻", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "passive",
    desc: "[CMD] When attacking: ATK +2.0 permanently. Max 8 stacks. (Passive) Max Level: ATK +15.",
    effect: { type: "cmd_atk_on_attack_permanent_stack", valuePerStack: 2.0, maxStacks: 8 },
    base: 2.0, perLevel: 2.0,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `On attack: CMD ATK +${2.0+lvl*2.0} permanently (max 8 stacks)${lvl>=14?" | Max: ATK +15":""} (permanent)`,
  },

  // ── R0 TOP — Sides (2CD → rounds 3,6,9) ──────────────────────────────────
  veyra_poison_touch: {
    name: "Poison Touch", icon: "☠️", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 20% Physical DMG (ATK mod) + Poison DoT (2 rnd). (Rounds 3,6,9)",
    effect: { type: "physical_damage_poison_dot", poisonDuration: 2, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + Poison DoT (2 rnd) — rounds 3,6,9`,
  },

  veyra_dead_weight: {
    name: "Dead Weight", icon: "⬇️", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "passive",
    desc: "[Slowed Enemies] DEF -2.0. (Passive)",
    effect: { type: "slowed_enemy_def_down", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `Slowed enemies: DEF -${2.0+lvl*2.0} (permanent)`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3,6,9) ────────────────────────────────
  veyra_revenants_fury: {
    name: "Revenant's Fury", icon: "💢", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 10% Physical DMG (ATK mod). [Coldborn Units] +20% bonus DMG. (Rounds 3,6,9)",
    effect: { type: "aoe_physical_faction_bonus", bonusFaction: "coldborns", bonusDmg: 0.20, modifiedBy: "atk" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% Physical DMG | Coldborn units +20% extra${lvl>=14?" | Max: ATK +15":""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  veyra_revenants_edge: {
    name: "Revenant's Edge", icon: "🗡️", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "passive",
    desc: "[CMD] DMG +3.0% vs Coldborn units. (Passive)",
    effect: { type: "cmd_dmg_bonus_vs_faction", faction: "coldborns", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `CMD DMG +${Math.round((0.03+lvl*0.03)*100)}% vs Coldborn units (permanent)`,
  },

  veyra_rotting_armor: {
    name: "Rotting Armor", icon: "🦠", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "passive",
    desc: "[Enemy Units] Each time Poison is applied: DEF -2 for 2 rounds. (Passive)",
    effect: { type: "poison_applied_def_down", defDown: 2.0, duration: 2 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `Each Poison applied: enemy DEF -${2.0+lvl*2.0} (2 rnd) (permanent)`,
  },

  // ── R3 — Main (2CD → rounds 3,6,9) ───────────────────────────────────────
  veyra_veyras_hunt: {
    name: "Veyra's Hunt", icon: "🎯", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy, Coldborn priority] 40% Physical DMG (ATK mod) + guaranteed Slow (-25% SPD, 2 rnd). (Rounds 3,6,9)",
    effect: { type: "physical_damage_frostbitten_slow", target: "prioritiseColdborn", slowValue: 25, slowDuration: 2, modifiedBy: "atk" },
    base: 0.40, perLevel: 0.40,
    maxLevelEffect: { slowedEnemyDefDown: 15 },
    nextDesc: (lvl) => `[Coldborn priority] ${Math.round((0.40+lvl*0.40)*100)}% Physical DMG + Slow (-25% SPD, 2 rnd)${lvl>=14?" | Max: Slowed enemies DEF -15":""} — rounds 3,6,9`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  veyra_creeping_death: {
    name: "Creeping Death", icon: "💀", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "passive",
    desc: "[All Enemies] Each round: 5% chance Poison DoT (2 rnd). (Passive)",
    effect: { type: "per_round_poison_chance_enemy", chance: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Each round: ${Math.min(100,Math.round((0.05+lvl*0.05)*100))}% chance Poison all enemies (permanent)`,
  },

  veyra_the_relentless_dead: {
    name: "The Relentless Dead", icon: "🔄", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "passive",
    desc: "[CMD] ATK +1.0 each round any enemy is Slowed. Max 5 stacks. (Passive)",
    effect: { type: "cmd_atk_per_round_slowed_active", valuePerStack: 1.0, maxStacks: 5 },
    base: 1.0, perLevel: 1.0,
    nextDesc: (lvl) => `Per Slowed round: CMD ATK +${1.0+lvl*1.0} (max 5 stacks) (permanent)`,
  },

  // ── R5 — Main (3CD → rounds 4,8) ─────────────────────────────────────────
  veyra_hollow_barrage: {
    name: "Hollow Barrage", icon: "🌊", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 6% Physical DMG × 4 hits. [Coldborn Units] +10% bonus DMG per hit. (Rounds 4,8)",
    effect: { type: "multi_hit_aoe_faction_bonus", hits: 4, bonusFaction: "coldborns", bonusDmgPerHit: 0.10, modifiedBy: "atk" },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { escalatingHitBonus: 0.10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.06+lvl*0.06)*100)}% × 4 hits | Coldborn +10% per hit${lvl>=14?" | Max: Each hit +10% more than last":""} — rounds 4,8`,
  },

  // ── R5 — Sides (2CD → rounds 3,6,9) ──────────────────────────────────────
  veyra_hollow_strike: {
    name: "Hollow Strike", icon: "⚡", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 30% Physical DMG (ATK mod) + 50% chance Slow (-25% SPD, 2 rnd). (Rounds 3,6,9)",
    effect: { type: "physical_damage_slow_chance", slowChance: 0.50, slowValue: 25, slowDuration: 2, modifiedBy: "atk" },
    base: 0.30, perLevel: 0.30,
    nextDesc: (lvl) => `${Math.round((0.30+lvl*0.30)*100)}% Physical DMG + 50% Slow (-25% SPD, 2 rnd) — rounds 3,6,9`,
  },

  // 3CD → rounds 4,8
  veyra_grave_poison: {
    name: "Grave Poison", icon: "🧪", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h58",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemies] 15% Physical DMG (ATK mod) + guaranteed Poison DoT (2 rnd). (Rounds 4,8)",
    effect: { type: "physical_damage_poison_dot", targets: 2, poisonDuration: 2, modifiedBy: "atk" },
    base: 0.15, perLevel: 0.15,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.15+lvl*0.15)*100)}% Physical DMG + guaranteed Poison DoT (2 rnd) — rounds 4,8`,
  },
};

export const VEYRA_RESKIN_SKILLS = {};

// ── FALLEN LORD MORDWYN (support, soldier, Lich) ──────────────────────────────
// ATK:20, FOC:165, SPD:60 — Skeleton/Mummy specialist healer.
// 50% heal 50% troop buffer, branch-specific boosts.

export const MORDWYN_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3,6,9) ───────────────────────────────────
  mordwyn_mordwyns_rite: {
    name: "Mordwyn's Rite", icon: "🕯️", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "active", cooldown: 2, offset: 3, duration: 2,
    desc: "[All Allied Units] Recover 10% HP + [Skeleton Units] DEF +3 for 2 rounds. (Rounds 3,6,9)",
    effect: { type: "heal_all_branch_def_up", healPct: 0.10, branch: "skeleton_legion", defBonus: 3 },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { skeletonDmgRangeMin: 2, skeletonDmgRangeMax: 4 },
    nextDesc: (lvl) => `All allies ${Math.round((0.10+lvl*0.10)*100)}% HP + [Skeleton] DEF +${3+lvl*3} (2 rnd)${lvl>=14?" | Max: Skeleton DMG +2-4":""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  mordwyn_mordwyns_touch: {
    name: "Mordwyn's Touch", icon: "💚", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[All Allied Units] Recover 5% HP each round. (Passive)",
    effect: { type: "passive_heal_per_round", healPct: 0.05 },
    base: 0.05, perLevel: 0.05,
    nextDesc: (lvl) => `Allied Units recover ${Math.round((0.05+lvl*0.05)*100)}% HP/round (permanent)`,
  },

  mordwyn_tomb_guardian: {
    name: "Tomb Guardian", icon: "🛡️", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[Allied Mummy Units] DEF +4. (Passive)",
    effect: { type: "branch_flat_def_bonus", branch: "mummies", value: 4 },
    base: 4, perLevel: 4,
    nextDesc: (lvl) => `[Mummy Units] DEF +${4+lvl*4} (permanent)`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3,6,9) ────────────────────────────────
  mordwyn_tombs_blessing: {
    name: "Tomb's Blessing", icon: "🌿", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "active", cooldown: 2, offset: 3, duration: 2,
    desc: "[All Allied Units] Recover 8% HP + [Mummy Units] DMG +3% for 2 rounds. (Rounds 3,6,9)",
    effect: { type: "heal_all_branch_dmg_up", healPct: 0.08, branch: "mummies", dmgBonus: 0.03 },
    base: 0.08, perLevel: 0.08,
    maxLevelEffect: { mummyDmgRangeMin: 2, mummyDmgRangeMax: 4 },
    nextDesc: (lvl) => `All allies ${Math.round((0.08+lvl*0.08)*100)}% HP + [Mummy] DMG +${Math.round((0.03+lvl*0.03)*100)}% (2 rnd)${lvl>=14?" | Max: Mummy DMG +2-4":""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  mordwyn_ancient_bones: {
    name: "Ancient Bones", icon: "💀", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[Allied Skeleton Units] DMG +2.0%. (Passive)",
    effect: { type: "branch_dmg_bonus", branch: "skeleton_legion", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Skeleton Units] DMG +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  mordwyn_lichs_favor: {
    name: "Lich's Favor", icon: "🔮", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[CMD] FOC +2.0. (Passive)",
    effect: { type: "cmd_foc_passive", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `CMD FOC +${2.0+lvl*2.0} (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  mordwyn_undead_resilience: {
    name: "Undead Resilience", icon: "🦴", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[Skeleton & Mummy Units] Physical DMG Received -2% | HP +5 | DEF +2. (Passive) Max Level: Army HP +10.",
    effect: { type: "multi_branch_phys_reduce_hp_def", branches: ["skeleton_legion","mummies"], physReduce: 0.02, hpBonus: 5, defBonus: 2 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { armyHpBonus: 10 },
    nextDesc: (lvl) => `[Skeleton/Mummy] Physical DMG Rec -${Math.round((0.02+lvl*0.02)*100)}% | HP +${5+lvl*5} | DEF +${2+lvl*2}${lvl>=14?" | Max: Army HP +10":""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  mordwyn_mummys_embrace: {
    name: "Mummy's Embrace", icon: "🧟", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[Allied Mummy Units] Physical DMG Received -2.0%. (Passive)",
    effect: { type: "branch_phys_dmg_reduce", branch: "mummies", value: 0.02 },
    base: 0.02, perLevel: 0.02,
    nextDesc: (lvl) => `[Mummy Units] Physical DMG Rec -${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  mordwyn_pale_ward: {
    name: "Pale Ward", icon: "🌫️", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[Allied Units] Rounds 1-2: DMG Received -4%. (Passive)",
    effect: { type: "early_round_dmg_received_down", value: 0.04, maxRound: 2 },
    base: 0.04, perLevel: 0.04,
    nextDesc: (lvl) => `Rounds 1-2: Allied Units DMG Rec -${Math.round((0.04+lvl*0.04)*100)}% (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  mordwyn_mordwyns_command: {
    name: "Mordwyn's Command", icon: "👑", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[Skeleton Units] DMG +2% | [Mummy Units] DMG Received -2% | [All Allies] Recover 5% HP each round. (Passive) Max Level: Skeleton & Mummy Healing Received +10%.",
    effect: { type: "mordwyn_command_passive", skeletonDmgUp: 0.02, mummyDmgRecDown: 0.02, healPerRound: 0.05 },
    base: 0.02, perLevel: 0.02,
    maxLevelEffect: { skeletonMummyHealingReceivedUp: 0.10 },
    nextDesc: (lvl) => `[Skeleton] DMG +${Math.round((0.02+lvl*0.02)*100)}% | [Mummy] DMG Rec -${Math.round((0.02+lvl*0.02)*100)}% | All allies ${Math.round((0.05+lvl*0.05)*100)}% HP/round${lvl>=14?" | Max: Skeleton/Mummy Healing +10%":""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  mordwyn_ancient_power: {
    name: "Ancient Power", icon: "⚡", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "passive",
    desc: "[Allied Skeleton & Mummy Units] DMG +1.5%. (Passive)",
    effect: { type: "multi_branch_dmg_bonus", branches: ["skeleton_legion","mummies"], value: 0.015 },
    base: 0.015, perLevel: 0.015,
    nextDesc: (lvl) => `[Skeleton/Mummy Units] DMG +${((0.015+lvl*0.015)*100).toFixed(1)}% (permanent)`,
  },

  // firesOnRounds: [3,7]
  mordwyn_ethereal_mending: {
    name: "Ethereal Mending", icon: "✨", tree: "tactics", cls: "support",
    faction: "ashen_dead", commander: "h59",
    type: "active", cooldown: 99, offset: 3, duration: 1,
    desc: "[All Allied Units] Recover 10% HP + cleanse 1 debuff each. (Rounds 3 and 7)",
    effect: { type: "heal_all_cleanse", healPct: 0.10, cleanse: 1 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `All allies ${Math.round((0.10+lvl*0.10)*100)}% HP + cleanse 1 debuff — rounds 3, 7`,
    firesOnRounds: [3, 7],
  },
};

export const MORDWYN_RESKIN_SKILLS = {};

// ── CAEL THE RISEN (attacker, soldier, Revenant) ──────────────────────────────
// ATK:120, FOC:0, SPD:68 — AOE physical attacker. Burn + AoE combos,
// large unit hunter, Coldborn hate, poison/slow support.

export const CAEL_UNIQUE_SKILLS = {

  // ── R0 TOP — Main (2CD → rounds 3,6,9) ───────────────────────────────────
  cael_burning_charge: {
    name: "Burning Charge", icon: "🔥", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 10% Physical DMG (ATK mod) + 40% chance Burn. [Coldborn Units] +20% bonus DMG. (Rounds 3,6,9)",
    effect: { type: "aoe_physical_burn_faction_bonus", burnChance: 0.40, bonusFaction: "coldborns", bonusDmg: 0.20, modifiedBy: "atk" },
    base: 0.10, perLevel: 0.10,
    maxLevelEffect: { atkBonus: 10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.10+lvl*0.10)*100)}% Physical DMG + 40% Burn | Coldborn +20% extra${lvl>=14?" | Max: ATK +10":""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  cael_giants_bane: {
    name: "Giant's Bane", icon: "🗡️", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "passive",
    desc: "[CMD & Army] DMG +3.0% vs Large units. (Passive)",
    effect: { type: "dmg_bonus_vs_size", size: "large", value: 0.03 },
    base: 0.03, perLevel: 0.03,
    nextDesc: (lvl) => `CMD & Army DMG +${Math.round((0.03+lvl*0.03)*100)}% vs Large units (permanent)`,
  },

  cael_caels_fury: {
    name: "Cael's Fury", icon: "😤", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "passive",
    desc: "[CMD] ATK +2.0. (Passive)",
    effect: { type: "cmd_atk_passive", value: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `CMD ATK +${2.0+lvl*2.0} (permanent)`,
  },

  // ── R0 BOTTOM — Main (2CD → rounds 3,6,9) ────────────────────────────────
  cael_risen_fury: {
    name: "Risen Fury", icon: "💢", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[All Enemies] 8% Physical DMG (ATK mod) + 25% chance Burn each. (Rounds 3,6,9)",
    effect: { type: "aoe_physical_burn_chance", burnChance: 0.25, modifiedBy: "atk" },
    base: 0.08, perLevel: 0.08,
    maxLevelEffect: { atkBonus: 10 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.08+lvl*0.08)*100)}% Physical DMG + 25% Burn${lvl>=14?" | Max: ATK +10":""} — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides (2CD → rounds 3,6,9) ───────────────────────────────
  cael_caels_poison: {
    name: "Cael's Poison", icon: "🧪", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 20% Physical DMG (ATK mod) + Poison DoT (2 rnd). (Rounds 3,6,9)",
    effect: { type: "physical_damage_poison_dot", poisonDuration: 2, modifiedBy: "atk" },
    base: 0.20, perLevel: 0.20,
    nextDesc: (lvl) => `${Math.round((0.20+lvl*0.20)*100)}% Physical DMG + Poison DoT (2 rnd) — rounds 3,6,9`,
  },

  cael_rotting_flesh: {
    name: "Rotting Flesh", icon: "🦠", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "passive",
    desc: "[Poisoned Enemies] DEF -2.0. (Passive)",
    effect: { type: "enemy_status_def_down", status: "poison", defDown: 2.0 },
    base: 2.0, perLevel: 2.0,
    nextDesc: (lvl) => `Poisoned enemies: DEF -${2.0+lvl*2.0} (permanent)`,
  },

  // ── R3 — Main (3CD → rounds 4,8) ─────────────────────────────────────────
  cael_caels_rampage: {
    name: "Cael's Rampage", icon: "💀", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 6% Physical DMG × 3 hits. [Large Units] +15% bonus DMG per hit. (Rounds 4,8)",
    effect: { type: "multi_hit_aoe_size_bonus", hits: 3, bonusSize: "large", bonusDmgPerHit: 0.15, modifiedBy: "atk" },
    base: 0.06, perLevel: 0.06,
    maxLevelEffect: { atkBonus: 15 },
    nextDesc: (lvl) => `All enemies ${Math.round((0.06+lvl*0.06)*100)}% × 3 hits | Large +15% per hit${lvl>=14?" | Max: ATK +15":""} — rounds 4,8`,
  },

  // ── R3 — Sides (2CD → rounds 3,6,9) ──────────────────────────────────────
  cael_slow_strike: {
    name: "Slow Strike", icon: "🐌", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 2, offset: 3, duration: 1,
    desc: "[1 Enemy] 25% Physical DMG (ATK mod) + 50% chance Slow (-25% SPD, 2 rnd). (Rounds 3,6,9)",
    effect: { type: "physical_damage_slow_chance", slowChance: 0.50, slowValue: 25, slowDuration: 2, modifiedBy: "atk" },
    base: 0.25, perLevel: 0.25,
    nextDesc: (lvl) => `${Math.round((0.25+lvl*0.25)*100)}% Physical DMG + 50% Slow (-25% SPD, 2 rnd) — rounds 3,6,9`,
  },

  // 3CD → rounds 4,8
  cael_poison_sweep: {
    name: "Poison Sweep", icon: "☠️", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[All Enemies] 8% Physical DMG (ATK mod) + 20% chance Poison DoT each. (Rounds 4,8)",
    effect: { type: "aoe_physical_poison_chance", poisonChance: 0.20, poisonDuration: 2, modifiedBy: "atk" },
    base: 0.08, perLevel: 0.08,
    nextDesc: (lvl) => `All enemies ${Math.round((0.08+lvl*0.08)*100)}% Physical DMG + 20% Poison — rounds 4,8`,
  },

  // ── R5 — Main (3CD → rounds 4,8) ─────────────────────────────────────────
  cael_death_from_below: {
    name: "Death from Below", icon: "👁️", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[Lowest DEF Enemy] 40% Physical DMG (ATK mod) + Burn + Slow (-25% SPD, 2 rnd). (Rounds 4,8)",
    effect: { type: "physical_damage_burn_slow_single", target: "lowestDef", slowValue: 25, slowDuration: 2, modifiedBy: "atk" },
    base: 0.40, perLevel: 0.40,
    maxLevelEffect: { burnedEnemyDmgTakenUp: 0.05 },
    nextDesc: (lvl) => `[Lowest DEF] ${Math.round((0.40+lvl*0.40)*100)}% Physical DMG + Burn + Slow (-25% SPD, 2 rnd)${lvl>=14?" | Max: Burned enemies +5% DMG taken":""} — rounds 4,8`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  cael_caels_rampage_passive: {
    name: "Cael's Rampage", icon: "⚔️", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "passive",
    desc: "[CMD] Normal attacks have 10% chance to hit all enemies. (Passive)",
    effect: { type: "cmd_normal_atk_aoe_chance", chance: 0.10 },
    base: 0.10, perLevel: 0.10,
    nextDesc: (lvl) => `CMD Normal attacks: ${Math.min(100,Math.round((0.10+lvl*0.10)*100))}% chance hit all enemies (permanent)`,
  },

  // 3CD → rounds 4,8
  cael_hollow_assault: {
    name: "Hollow Assault", icon: "💢", tree: "combat", cls: "attacker",
    faction: "ashen_dead", commander: "h60",
    type: "active", cooldown: 3, offset: 4, duration: 1,
    desc: "[2 Enemies] 18% Physical DMG (ATK mod) + 35% chance Slow (-25% SPD, 2 rnd). (Rounds 4,8)",
    effect: { type: "physical_damage_slow_chance", targets: 2, slowChance: 0.35, slowValue: 25, slowDuration: 2, modifiedBy: "atk" },
    base: 0.18, perLevel: 0.18,
    nextDesc: (lvl) => `[2 Units] ${Math.round((0.18+lvl*0.18)*100)}% Physical DMG + 35% Slow (-25% SPD, 2 rnd) — rounds 4,8`,
  },
};

export const CAEL_RESKIN_SKILLS = {};

// ── Merged export ─────────────────────────────────────────────────────────────

export const ASHEN_DEAD_SKILLS = {
  ...MALGRATH_UNIQUE_SKILLS, ...MALGRATH_RESKIN_SKILLS,
  ...VARAK_UNIQUE_SKILLS,    ...VARAK_RESKIN_SKILLS,
  ...DREADMOURNE_UNIQUE_SKILLS, ...DREADMOURNE_RESKIN_SKILLS,
  ...VEYRA_UNIQUE_SKILLS,    ...VEYRA_RESKIN_SKILLS,
  ...MORDWYN_UNIQUE_SKILLS,  ...MORDWYN_RESKIN_SKILLS,
  ...CAEL_UNIQUE_SKILLS,     ...CAEL_RESKIN_SKILLS,
};

// ── Branch layout ─────────────────────────────────────────────────────────────

export const ASHEN_DEAD_BRANCH_SKILL_MAP = {
  // Malgrath the Eternal (strategist, champion, Lich)
  h55: [
    { main: "malgrath_eternal_gaze",          sides: ["malgrath_lichs_aura",       "malgrath_void_step"]          }, // R0 top
    { main: "malgrath_malgraths_curse",       sides: ["malgrath_eternal_hunger",   "malgrath_undead_mastery"]     }, // R0 bot
    { main: "malgrath_plague_of_the_eternal", sides: ["malgrath_malgraths_will",   "malgrath_deaths_patience"]    }, // R3
    { main: "malgrath_malgraths_dominion",    sides: ["malgrath_void_mastery",     "malgrath_necrotic_touch"]     }, // R5
  ],
  // Lord Varak (strategist, champion, Death Knight)
  h56: [
    { main: "varak_varaks_verdict",   sides: ["varak_dark_presence",   "varak_iron_decree"]          }, // R0 top
    { main: "varak_dread_surge",      sides: ["varak_varaks_focus",    "varak_void_sight"]           }, // R0 bot
    { main: "varak_death_knell",      sides: ["varak_soul_hunger",     "varak_void_lance"]           }, // R3
    { main: "varak_varaks_vanguard",  sides: ["varak_death_touched",   "varak_the_eternal_knight"]   }, // R5
  ],
  // Ser Dreadmourne (balanced, veteran, Death Knight)
  h57: [
    { main: "dread_iron_dominion",       sides: ["dread_death_knights_charge",  "dread_dreadmournes_wrath"]   }, // R0 top
    { main: "dread_carrion_blow",        sides: ["dread_unholy_strength",       "dread_death_knights_honor"]  }, // R0 bot
    { main: "dread_dead_mans_weight",    sides: ["dread_slow_agony",            "dread_dreadmournes_resolve"] }, // R3
    { main: "dread_bone_crusher",        sides: ["dread_grim_efficiency",       "dread_bone_splitter"]        }, // R5
  ],
  // Veyra the Hollow (attacker, veteran, Revenant)
  h58: [
    { main: "veyra_the_haunting",      sides: ["veyra_poison_touch",      "veyra_dead_weight"]          }, // R0 top
    { main: "veyra_revenants_fury",    sides: ["veyra_revenants_edge",    "veyra_rotting_armor"]        }, // R0 bot
    { main: "veyra_veyras_hunt",       sides: ["veyra_creeping_death",    "veyra_the_relentless_dead"]  }, // R3
    { main: "veyra_hollow_barrage",    sides: ["veyra_hollow_strike",     "veyra_grave_poison"]         }, // R5
  ],
  // Fallen Lord Mordwyn (support, soldier, Lich)
  h59: [
    { main: "mordwyn_mordwyns_rite",       sides: ["mordwyn_mordwyns_touch",  "mordwyn_tomb_guardian"]     }, // R0 top
    { main: "mordwyn_tombs_blessing",      sides: ["mordwyn_ancient_bones",   "mordwyn_lichs_favor"]       }, // R0 bot
    { main: "mordwyn_undead_resilience",   sides: ["mordwyn_mummys_embrace",  "mordwyn_pale_ward"]         }, // R3
    { main: "mordwyn_mordwyns_command",    sides: ["mordwyn_ancient_power",   "mordwyn_ethereal_mending"]  }, // R5
  ],
  // Cael the Risen (attacker, soldier, Revenant)
  h60: [
    { main: "cael_burning_charge",   sides: ["cael_giants_bane",        "cael_caels_fury"]            }, // R0 top
    { main: "cael_risen_fury",       sides: ["cael_caels_poison",       "cael_rotting_flesh"]         }, // R0 bot
    { main: "cael_caels_rampage",    sides: ["cael_slow_strike",        "cael_poison_sweep"]          }, // R3
    { main: "cael_death_from_below", sides: ["cael_caels_rampage_passive","cael_hollow_assault"]      }, // R5
  ],
};
