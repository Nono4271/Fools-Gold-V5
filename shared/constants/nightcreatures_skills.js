/* ─────────────────────────────────────────────────────────────────────────────
   nightcreatures_skills.js — Creatures of the Night Faction Skills
   72 total: 60 reskins + 12 unique skills
   6 commanders × 12 skills each

   Commanders:
     Countess Serava       (veteran,  strategist) [Vampire]  — 10 reskins + 2 unique
     Lord Malachar         (champion, strategist) [Vampire]  — 10 reskins + 2 unique
     Fang Groth            (soldier,  balanced)   [Werewolf] — 10 reskins + 2 unique
     Alpha Korrax          (champion, leader)     [Werewolf] — 10 reskins + 2 unique
     Skitter Vex           (soldier,  support)    [Spider]   — 10 reskins + 2 unique
     Thaelor the Silkbound (veteran,  attacker)   [Spider]   — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── COUNTESS SERAVA (veteran, strategist, Vampire) ────────────────────────────
// High FOC via strategist bonus. Aggressive focus damage dealer with lifesteal,
// venom, silence and self-sustaining mechanics. Fights forward, feeds on kills.

export const SERAVA_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  // Round 1 + 2CD → rounds 1, 4, 7, 10
  serava_crimson_embrace: {
    name:"Crimson Embrace", icon:"🦇", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"[Round 1] [2 Enemy Units] 24% Focus Damage (modified by FOC) | [Creature of the Night Units] heal 40% HP. (Rounds 1, 4, 7, 10)",
    effect:{ type:"focus_damage_heal_creatures", targets:2, healPct:0.40, modifiedBy:"foc" },
    base:0.24, perLevel:0.2257,
    maxLevelEffect:{ bonusHealPct:0.15 },
    nextDesc:(lvl) => `[2 Enemy Units] ${Math.round((0.24+lvl*0.2257)*100)}% Focus DMG (FOC mod) | Creatures heal ${lvl >= 14 ? "55" : "40"}% HP — rounds 1,4,7,10`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  ser_countess_seduction: {
    name:"A Countess's Seduction", icon:"💋", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"[All Enemy Units] Damage Dealt -1.0% | [All Allied Units] Damage Dealt +1.0%. (Passive)",
    effect:{ type:"dual_dmg_shift", enemyDmgDown:0.01, allyDmgUp:0.01 },
    base:0.01, perLevel:0.01,
    nextDesc:(lvl) => `Enemy DMG -${Math.round((0.01+lvl*0.01)*100)}% | Allied DMG +${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  ser_siren_song: {
    name:"Siren Song", icon:"🎵", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Enemy Commander] 6% chance to inflict Silence for 1 round — skill is skipped but fires next round. (Rounds 3, 6, 9)",
    effect:{ type:"silence", target:"enemyCommander", chance:0.06 },
    base:0.06, perLevel:0.06,
    nextDesc:(lvl) => `${Math.round((0.06+lvl*0.06)*100)}% chance to Silence enemy commander (1 rnd) — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  ser_brawler: {
    name:"Brawler", icon:"👊", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"[Commander] Normal Attacks deal an additional 5.0% Focus Damage. (Passive)",
    effect:{ type:"focus_damage", value:0.05 },
    base:0.05, perLevel:0.05,
    maxLevelEffect:{ focusBonus:15 },
    nextDesc:(lvl) => `Normal Attacks +${Math.round((0.05+lvl*0.05)*100*10)/10}% Focus DMG${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  ser_fight_with_me: {
    name:"Fight With Me", icon:"⚔️", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"[Allied Melee Units] 5.0% chance to attack for maximum damage. (Passive)",
    effect:{ type:"melee_max_dmg_chance", chance:0.05 },
    base:0.05, perLevel:0.05,
    nextDesc:(lvl) => `Allied Melee Units ${Math.round((0.05+lvl*0.05)*100)}% chance to deal max damage (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  ser_overpower: {
    name:"Overpower", icon:"💥", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Enemy Unit with lowest DEF] 20% Focus Damage + 30% Focus Damage follow-up after 1 round. (Rounds 3, 6, 9)",
    effect:{ type:"focus_damage_delayed", target:"lowestDef", initialDmg:0.20, delayedDmg:0.30, delayRounds:1 },
    base:0.20, perLevel:0.10,
    nextDesc:(lvl) => {
      const init = Math.round((0.20+lvl*0.10)*100);
      const follow = Math.round((0.30+lvl*0.15)*100);
      return `[Lowest DEF Unit] ${init}% Focus DMG + ${follow}% follow-up next round — rounds 3,6,9`;
    },
  },

  // ── R3 — Main (shared with Malachar) ──────────────────────────────────────
  // mal_compulsion referenced directly in branch map

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // mal_vampires_thrall referenced directly in branch map

  ser_hk_eradicator: {
    name:"Holy Knight Eradicator", icon:"🔥", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"[2 Friendly Units] DMG +0.5% against Holy Knight units. (Passive)",
    effect:{ type:"dmg_bonus_vs_faction", faction:"holyknights", value:0.005 },
    base:0.005, perLevel:0.005,
    nextDesc:(lvl) => `Friendly units DMG +${Math.round((0.005+lvl*0.005)*100*10)/10}% vs Holy Knights (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // Round 2 + 1CD → rounds 2, 4, 6, 8, 10
  ser_assassins_blade: {
    name:"Assassin's Blade", icon:"🗡️", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:1, offset:2, duration:1,
    desc:"[Round 2] [2 Enemy Units, prioritises Ranged] 30% Focus Damage (modified by SPD) | 5% chance to apply Venom. (Rounds 2, 4, 6, 8, 10)",
    effect:{ type:"focus_damage_venom", targets:2, prioritise:"ranged", venomChance:0.05, modifiedBy:"spd" },
    base:0.30, perLevel:0.30,
    maxLevelEffect:{ spdBonus:15 },
    nextDesc:(lvl) => `[2 Units, Ranged first] ${Math.round((0.30+lvl*0.30)*100)}% Focus DMG (SPD mod) + ${Math.round((0.05+lvl*0.05)*100)}% Venom chance${lvl >= 14 ? " | Max: SPD +15" : ""} — rounds 2,4,6,8,10`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  ser_thrill_of_the_hunt: {
    name:"Thrill of the Hunt", icon:"🏹", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"[Commander] Skill damage +2.0%. (Passive)",
    effect:{ type:"skill_dmg_bonus", value:0.02 },
    base:0.02, perLevel:0.02,
    nextDesc:(lvl) => `All active skill damage +${Math.round((0.02+lvl*0.02)*100*10)/10}% (permanent)`,
  },

  ser_did_you_want_more: {
    name:"Did You Want More", icon:"😈", tree:"combat", cls:"strategist",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"[Commander] 5% chance per round (rounds 1–5) to gain a follow-up normal attack. Follow-up does not trigger secondary effects. (Passive)",
    effect:{ type:"followup_normal_attack", chance:0.05, maxRound:5 },
    base:0.05, perLevel:0.05,
    nextDesc:(lvl) => `${Math.round((0.05+lvl*0.05)*100)}% chance for follow-up normal attack (rounds 1–5, no secondary effects)`,
  },
};

export const SERAVA_RESKIN_SKILLS = {};

// ── LORD MALACHAR (champion, strategist, Vampire) ─────────────────────────────
// High FOC (170) — true focus strategist. Debuffer/vulnerability specialist.
// Blood dominion theme: enemies weaken, allies endure. Commander focus attacks.

export const MALACHAR_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  // 2CD → fires rounds 3, 6, 9
  mal_compulsion: {
    name:"Compulsion", icon:"🌀", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Enemy Commander] Inflicts Confusion and Focus -3.0 for 1 round. (Rounds 3, 6, 9)",
    // effect: confusion + focus drain on enemy commander
    effect:{ type:"confusion_focus_down", value:3.0, duration:1 },
    base:3.0, perLevel:3.0,
    // Max level effect (lv15): ATK and SPD -25 added on top
    maxLevelEffect:{ atkDown:25, spdDown:25 },
    nextDesc:(lvl) => `[Enemy Commander] Confusion + Focus -${3.0 + lvl * 3.0} for 1 round${lvl >= 14 ? " | Max: ATK & SPD -25" : ""} — rounds 3,6,9`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → fires rounds 3, 6, 9
  mal_vampires_thrall: {
    name:"Vampire's Thrall", icon:"🦇", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Against 2 Enemy Units] Inflicts Confusion and DMG +2% for 1 round. (Rounds 3, 6, 9)",
    effect:{ type:"confusion_dmg_up", targets:2, dmgUp:0.02, duration:1 },
    base:0.02, perLevel:0.02,
    nextDesc:(lvl) => `[2 Enemy Units] Confusion + DMG +${Math.round((0.02 + lvl * 0.02)*100)}% (1 rnd) — rounds 3,6,9`,
  },

  mal_ruthless_extinction: {
    name:"Ruthless Extinction", icon:"☠️", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"[2 Friendly Units] DMG +0.5% against Human units. (Passive)",
    effect:{ type:"dmg_bonus_vs_faction", faction:"humans", value:0.005 },
    base:0.005, perLevel:0.005,
    nextDesc:(lvl) => `Friendly units DMG +${Math.round((0.005 + lvl * 0.005)*100*10)/10}% vs Humans (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  mal_war_general: {
    name:"War General", icon:"⚔️", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"[Commander] Focus +1.0 | [Allied Melee Units] Damage Dealt +1.0%. (Passive)",
    effect:{ type:"war_general", focusBonus:1.0, meleeDmgUp:0.01 },
    base:1.0, perLevel:1.0,
    // Max level effect (lv15): Focus +10 additional
    maxLevelEffect:{ bonusFocus:10 },
    nextDesc:(lvl) => `FOC +${1.0 + lvl * 1.0} | Allied Melee DMG +${Math.round((0.01 + lvl * 0.01)*100)}%${lvl >= 14 ? " | Max: FOC +10 bonus" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // Round 1 + 1CD → rounds 1, 3, 5, 7, 9
  mal_surprise_attack: {
    name:"Surprise Attack", icon:"💨", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:1, offset:1, duration:1,
    desc:"[Round 1] [2 Enemy Units] 15% Focus Damage (modified by SPD) | 35% chance to Stun for 1 round. (Rounds 1, 3, 5, 7, 9)",
    effect:{ type:"focus_damage_stun", targets:2, stunChance:0.35, duration:1, modifiedBy:"spd" },
    base:0.15, perLevel:0.135,
    nextDesc:(lvl) => `[2 Enemy Units] ${Math.round((0.15 + lvl * 0.135)*100)}% Focus DMG (SPD mod) + 35% Stun — rounds 1,3,5,7,9`,
  },

  // 1CD → rounds 2, 4, 6, 8, 10
  mal_blood_transfusion: {
    name:"Blood Transfusion", icon:"🩸", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:1, offset:2, duration:1,
    desc:"[1 Allied Unit] Recovers 25% HP. (Rounds 2, 4, 6, 8, 10)",
    healPct:0.25, base:0.25, perLevel:0.25,
    nextDesc:(lvl) => `[1 Allied Unit] Recover ${Math.round((0.25 + lvl * 0.25)*100)}% HP — rounds 2,4,6,8,10`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  // Round 2 + 2CD → rounds 2, 5, 8
  mal_invisible_enemy: {
    name:"Invisible Enemy", icon:"🌑", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"[Round 2] 20% Focus Damage on 1 Enemy Unit (modified by FOC) | [2 Friendly Night Creature Units] gain Invisibility (30% evade) for 1 round. (Rounds 2, 5, 8)",
    effect:{ type:"focus_damage_invisibility", focusDmg:0.20, invisUnits:2, evadeChance:0.30, modifiedBy:"foc" },
    base:0.20, perLevel:0.1867,
    // Max level effect (lv15): stun immunity while invisible
    maxLevelEffect:{ stunImmunityWhileInvis:true },
    nextDesc:(lvl) => `${Math.round((0.20 + lvl * 0.1867)*100)}% Focus DMG (FOC mod) + 2 units Invisible (30% evade)${lvl >= 14 ? " | Max: Stun Immunity while Invisible" : ""} — rounds 2,5,8`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  mal_double_tap: {
    name:"Double Tap", icon:"👁", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"[Commander] Normal Attacks deal an additional 3.0% Focus Damage. (Passive)",
    effect:{ type:"focus_damage", value:0.03 },
    base:0.03, perLevel:0.03,
    nextDesc:(lvl) => `Normal Attacks deal +${Math.round((0.03 + lvl * 0.03)*100*10)/10}% Focus Damage (permanent)`,
  },

  mal_protect_my_children: {
    name:"Protect My Children", icon:"🛡", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"[Allied Vampire Units] Defence +1.5. (Passive)",
    effect:{ type:"troop_def_bonus_vs_branch", branch:"vampires", value:1.5 },
    base:1.5, perLevel:1.5,
    nextDesc:(lvl) => `[Vampire Units] DEF +${1.5 + lvl * 1.5} (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  mal_lords_experience: {
    name:"Lord's Experience", icon:"👑", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"Base Stats from Gear +2.0%. (Passive)",
    effect:{ type:"gear_stat_bonus", value:0.02 },
    base:0.02, perLevel:0.02,
    // Max level effect (lv15): Speed +10
    maxLevelEffect:{ spdBonus:10 },
    nextDesc:(lvl) => `Gear Base Stats +${Math.round((0.02 + lvl * 0.02)*100)}%${lvl >= 14 ? " | Max: SPD +10" : ""} (permanent)`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  mal_vampire_assassins: {
    name:"Vampire Assassins", icon:"🗡", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"[Enemy Ranged Units] Damage Received +2.0%. (Passive)",
    effect:{ type:"vs_ranged_dmg_up", value:0.02 },
    base:0.02, perLevel:0.02,
    nextDesc:(lvl) => `Enemy Ranged Units take +${Math.round((0.02 + lvl * 0.02)*100)}% more damage (permanent)`,
  },

  mal_night_terror: {
    name:"Night Terror", icon:"🌙", tree:"tactics", cls:"strategist",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"[Night Creature Units] At Night: all stats +1.0% | At Day: all stats -20.0%. Max 7/7: +7.0% / -6.0%. (Passive)",
    effect:{ type:"day_night_conditional", nightBonus:0.01, dayPenalty:0.20 },
    base:0.01, perLevel:0.01,
    // Day penalty reduces as skill levels: starts -20% and improves to -6% at 7/7
    // dayPenaltyAtLevel = 0.20 - (lvl * 0.02333)
    nextDesc:(lvl) => {
      const night = Math.round((0.01 + lvl * 0.01)*100);
      const day   = Math.round((0.20 - lvl * 0.02333)*100*10)/10;
      return `Night: all stats +${night}% | Day: all stats -${day}% (permanent)`;
    },
  },
};

export const MALACHAR_RESKIN_SKILLS = {};


// ── FANG GROTH (soldier, balanced, Werewolf) ──────────────────────────────────
// ATK:92, FOC:0, SPD:80 — scrappy pack brawler. Early-game utility + mounted
// specialist. Shares R3 with Korrax (Wolf's Rage / Moonlight / Moon's Blessing).

export const GROTH_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  groth_lifeline: {
    name:"Lifeline of the Pack", icon:"🐾", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"[Army] March Speed +1.0%. (Non-Combat Passive)",
    effect:{ type:"march_speed_bonus", value:0.01 },
    base:0.01, perLevel:0.01,
    maxLevelEffect:{ werewolfCombatSpd:10 },
    nextDesc:(lvl) => `March Speed +${Math.round((0.01+lvl*0.01)*100)}%${lvl >= 14 ? " | Max: [Werewolf Units] SPD +10 in combat" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  groth_supply_specialist: {
    name:"Supply Specialist", icon:"🎒", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    notImplemented:true,
    desc:"[Gathering] +5.0% extra resources from gathering. (Non-Combat Passive — Coming Soon)",
    effect:{ type:"gathering_bonus", value:0.05 },
    base:0.05, perLevel:0.05,
    nextDesc:(lvl) => `Gathering Resources +${Math.round((0.05+lvl*0.05)*100)}% (permanent)`,
  },

  groth_fastest: {
    name:"Fastest in the Pack", icon:"💨", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"[Commander] SPD +1.0. (Passive)",
    effect:{ type:"cmd_stat_bonus", spdPerLevel:1.0 },
    base:1.0, perLevel:1.0,
    nextDesc:(lvl) => `[Commander] SPD +${1.0+lvl*1.0} (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  groth_mounted_specialist: {
    name:"Mounted Specialist", icon:"🐺", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"[Mounted Units] Damage +0.6% upon inflicting damage (modified by SPD), up to 3 stacks. (Passive)",
    effect:{ type:"mounted_atk_stack_spd", valuePerStack:0.006, maxStacks:3, modifiedBy:"spd" },
    base:0.006, perLevel:0.006,
    maxLevelEffect:{ mountedHpBonus:15 },
    nextDesc:(lvl) => `[Mounted] DMG +${((0.006+lvl*0.006)*100).toFixed(1)}% per stack (SPD mod, 3 stacks max)${lvl >= 14 ? " | Max: Mounted Units HP +15" : ""} (permanent)`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // Round 3 only — single trigger, no cooldown repeat
  groth_frontline_medic: {
    name:"Frontline Medic", icon:"🩹", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:99, offset:3, duration:1,
    desc:"[Mounted Units] Heals 50% HP. Triggers Round 3 only.",
    effect:{ type:"heal_branch", branch:"mounted", healPct:0.50 },
    base:0.50, perLevel:0.50,
    nextDesc:(lvl) => `[Mounted Units] Heal ${Math.round((0.50+lvl*0.50)*100)}% HP — Round 3 only`,
  },

  groth_mounted_armor: {
    name:"Mounted Armor", icon:"🛡️", tree:"command", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"[Mounted Units] Damage Received -2.5%. (Passive)",
    effect:{ type:"branch_dmg_reduce", branch:"mounted", value:0.025 },
    base:0.025, perLevel:0.025,
    nextDesc:(lvl) => `[Mounted Units] DMG Received -${((0.025+lvl*0.025)*100).toFixed(1)}% (permanent)`,
  },

  // ── R3 — Shared with Korrax ───────────────────────────────────────────────
  // kor_wolfs_rage, kor_moonlight, kor_moons_blessing referenced in branch map

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // Round 1 + 2CD → rounds 1, 4, 7, 10
  groth_fangs_assault: {
    name:"Fang's Assault", icon:"⚔️", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"[Round 1] [1 Enemy Unit] 40% Physical Damage (modified by ATK) | 70% chance to inflict Bleed. (Rounds 1, 4, 7, 10)",
    effect:{ type:"physical_damage_bleed", target:"single", bleedChance:0.70, bleedDmg:0.30, bleedDuration:2, modifiedBy:"atk" },
    base:0.40, perLevel:0.3714,
    maxLevelEffect:{ bleedSpreadChance:0.35 },
    nextDesc:(lvl) => {
      const dmg = Math.round((0.40+lvl*0.3714)*100);
      return `${dmg}% Physical DMG (ATK mod) + 70% Bleed${lvl >= 14 ? " | Max: 35% chance to spread Bleed to random enemy" : ""} — rounds 1,4,7,10`;
    },
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  groth_fangs_ambush: {
    name:"Fang's Ambush", icon:"🌑", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[2 Enemy Units] 40% Physical Damage (modified by SPD) | 40% chance to Stun for 1 round. (Rounds 3, 6, 9)",
    effect:{ type:"physical_damage_stun", targets:2, stunChance:0.40, modifiedBy:"spd" },
    base:0.40, perLevel:0.40,
    nextDesc:(lvl) => `[2 Units] ${Math.round((0.40+lvl*0.40)*100)}% Physical DMG (SPD mod) + 40% Stun — rounds 3,6,9`,
  },

  groth_protect_troops: {
    name:"Protect the Troops", icon:"🐗", tree:"combat", cls:"balanced",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"[Mounted Units] 14% chance to gain Madness Immunity. (Passive)",
    effect:{ type:"branch_madness_immunity_chance", branch:"mounted", chance:0.14 },
    base:0.14, perLevel:0.14,
    nextDesc:(lvl) => `[Mounted Units] ${Math.round((0.14+lvl*0.14)*100)}% chance for Madness Immunity (permanent)`,
  },
};

export const GROTH_RESKIN_SKILLS = {};


// ── ALPHA KORRAX (champion, leader, Werewolf) ─────────────────────────────────
// ATK:185, FOC:0, SPD:85 — dominant pack alpha. Speed-modified mounted buffs,
// bleed, multi-hit charge, night bonuses. The pack's strength flows through him.

export const KORRAX_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  kor_pack_leader: {
    name:"Pack Leader", icon:"🐺", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"[Mounted Units] Damage Dealt +1.0% | Damage Received -1.0% (both modified by SPD). (Passive)",
    effect:{ type:"mounted_spd_modified_dmg", dmgUp:0.01, dmgDown:0.01 },
    base:0.01, perLevel:0.01,
    maxLevelEffect:{ werewolfBonusDmg:0.10 },
    nextDesc:(lvl) => `[Mounted] DMG +${Math.round((0.01+lvl*0.01)*100)}% / DMG Received -${Math.round((0.01+lvl*0.01)*100)}% (SPD mod)${lvl >= 14 ? " | Max: Werewolf Units +10% DMG" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // Round 2 + 2CD → rounds 2, 5, 8
  kor_commanders_howl: {
    name:"Commander's Howl", icon:"🌕", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"[Round 2] [2 Enemy Units] 7% chance to inflict Stun for 1 round. (Rounds 2, 5, 8)",
    effect:{ type:"stun_chance", targets:2, chance:0.07 },
    base:0.07, perLevel:0.0643,
    nextDesc:(lvl) => `[2 Enemy Units] ${Math.round((0.07+lvl*0.0643)*100)}% chance to Stun (1 rnd) — rounds 2,5,8`,
  },

  kor_pack_protection: {
    name:"Pack Protection", icon:"🛡️", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"[Werewolf Units] Defence +2.0. (Passive)",
    effect:{ type:"troop_def_bonus_vs_branch", branch:"werewolves", value:2.0 },
    base:2.0, perLevel:2.0,
    nextDesc:(lvl) => `[Werewolf Units] DEF +${2.0 + lvl * 2.0} (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  kor_wolfs_rage: {
    name:"Wolf's Rage", icon:"⚔️", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Enemy Unit with highest DEF] 15% Physical Damage (modified by ATK) | 60% chance to inflict Bleed | DEF -1.0 for 2 rounds. (Rounds 3, 6, 9)",
    effect:{ type:"physical_damage_bleed", target:"highestDef", bleedChance:0.60, defDown:1.0, bleedDmg:0.30, bleedDuration:2, modifiedBy:"atk" },
    base:0.15, perLevel:0.15,
    maxLevelEffect:{ bleedPreventsEvasion:true },
    nextDesc:(lvl) => {
      const dmg = Math.round((0.15+lvl*0.15)*100);
      const def = (1.0+lvl*1.0).toFixed(1);
      return `[Highest DEF Unit] ${dmg}% Physical DMG (ATK mod) + 60% Bleed + DEF -${def}${lvl >= 14 ? " | Max: Bleed prevents evasion" : ""} — rounds 3,6,9`;
    },
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  kor_moonlight: {
    name:"Moonlight", icon:"🌙", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:3, offset:4, duration:1,
    desc:"[2 Creature of the Night Units] Heals 30% HP | [Mounted Units] Heal an additional 75% HP. (Rounds 4, 8)",
    effect:{ type:"heal_creatures_mounted_bonus", healPct:0.30, mountedBonus:0.75, targets:2 },
    base:0.30, perLevel:0.30,
    nextDesc:(lvl) => {
      const base = Math.round((0.30+lvl*0.30)*100);
      return `[2 Creature Units] ${base}% HP | [Mounted] +75% additional (${base+75}% total) — rounds 4,8`;
    },
  },

  kor_moons_blessing: {
    name:"Moon's Blessing", icon:"✨", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"[Werewolf Units] At Night: 10.0% chance to deal maximum damage. (Passive)",
    effect:{ type:"night_max_dmg_chance", branch:"werewolves", chance:0.10 },
    base:0.10, perLevel:0.10,
    nextDesc:(lvl) => `[Werewolf Units] Night: ${Math.round((0.10+lvl*0.10)*100)}% chance for max damage (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  kor_power_of_alpha: {
    name:"Power of an Alpha", icon:"👑", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"[Commander] ATK +1.0 | SPD +1.0 | +10 ATK bonus if army is all Mounted units. (Passive)",
    effect:{ type:"cmd_stat_bonus", atkPerLevel:1.0, spdPerLevel:1.0, allMountedAtkBonus:10 },
    base:1.0, perLevel:1.0,
    maxLevelEffect:{ madnessImmunity:true },
    nextDesc:(lvl) => `ATK +${1.0+lvl*1.0} | SPD +${1.0+lvl*1.0} | All-Mounted army: +10 ATK${lvl >= 14 ? " | Max: Madness Immunity" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // Round 3 + 1CD → rounds 3, 5, 7, 9
  kor_packs_connection: {
    name:"Pack's Connection", icon:"🔗", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:1, offset:3, duration:1,
    desc:"[Round 3] [Werewolf Units] 8% chance to evade the first hit this round. (Rounds 3, 5, 7, 9)",
    effect:{ type:"branch_evasion_first_hit", branch:"werewolves", chance:0.08 },
    base:0.08, perLevel:0.08,
    nextDesc:(lvl) => `[Werewolf Units] ${Math.round((0.08+lvl*0.08)*100)}% chance to evade first hit — rounds 3,5,7,9`,
  },

  kor_leaders_rage: {
    name:"Leader's Rage", icon:"😤", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"[Commander] Whenever a Werewolf Unit receives damage, next attack deals +10.0% damage. Resets after each attack. (Passive)",
    effect:{ type:"reactive_cmd_dmg_on_ally_hit", branch:"werewolves", bonus:0.10 },
    base:0.10, perLevel:0.10,
    nextDesc:(lvl) => `Next CMD attack +${Math.round((0.10+lvl*0.10)*100)}% DMG when Werewolf takes damage (resets on attack)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // Round 3 + 2CD → rounds 3, 6, 9
  kor_packs_charge: {
    name:"Pack's Charge", icon:"💨", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Round 3] [Enemy Unit with lowest DEF] Performs 1 attack dealing 20–40% damage (modified by SPD). (Rounds 3, 6, 9)",
    effect:{ type:"multi_hit_lowest_def", hitsBase:1, dmgLo:0.20, dmgHi:0.40, modifiedBy:"spd" },
    base:1, perLevel:1,
    maxLevelEffect:{ nightDmgLo:0.30, nightDmgHi:0.50 },
    nextDesc:(lvl) => {
      const hits = 1 + lvl;
      return `[Lowest DEF Unit] ${hits} hit${hits>1?"s":""} × 20–40% DMG (SPD mod)${lvl >= 14 ? " | Night: 30–50% per hit" : ""} — rounds 3,6,9`;
    },
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  kor_leaders_protection: {
    name:"Leader's Protection", icon:"🪖", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"[All Allied Units] First 3 instances of damage received -2.0%. (Passive)",
    effect:{ type:"first_hits_dmg_reduce", instances:3, reduction:0.02 },
    base:0.02, perLevel:0.02,
    nextDesc:(lvl) => `[All Allied Units] First 3 hits: DMG received -${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  kor_thick_skin: {
    name:"Thick Skin", icon:"🐗", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"[Mounted Units] Focus and Poison Damage received -1.0%. (Passive)",
    effect:{ type:"dmg_type_resist", branch:"mounted", focusResist:0.01, poisonResist:0.01 },
    base:0.01, perLevel:0.01,
    nextDesc:(lvl) => `[Mounted Units] Focus & Poison DMG received -${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },
};

export const KORRAX_RESKIN_SKILLS = {};


// ── SKITTER VEX (soldier, support, Spider) ────────────────────────────────────
// ATK:70, FOC:20, SPD:60 — spider support tactician. Heals, debuffs, poisons,
// and buffs the whole COTN faction simultaneously. Best in mixed spider armies.

export const SKITTER_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  skit_heal_my_children: {
    name:"Heal My Children", icon:"🕸️", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"[After Commander deals damage] [2 Allied Units] 4% chance to heal 5% HP. (Passive)",
    effect:{ type:"post_attack_proc_heal", targets:2, chance:0.04, healPct:0.05 },
    base:0.04, perLevel:0.04,
    maxLevelEffect:{ focusBonus:15 },
    nextDesc:(lvl) => `Post-attack: ${Math.round((0.04+lvl*0.04)*100)}% chance to heal 2 allies for ${Math.round((0.05+lvl*0.05)*100)}% HP${lvl >= 14 ? " | Max: FOC +15" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skit_jumping_spiders: {
    name:"Jumping Spiders", icon:"🕷️", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[Spider Units] 10% chance to evade the next instance of damage this round. (Rounds 3, 6, 9)",
    effect:{ type:"branch_evasion_first_hit", branch:"spiders", chance:0.10 },
    base:0.10, perLevel:0.10,
    nextDesc:(lvl) => `[Spider Units] ${Math.round((0.10+lvl*0.10)*100)}% chance to evade next hit — rounds 3,6,9`,
  },

  skit_spider_bite: {
    name:"Spider Bite", icon:"🩸", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[All Enemy Units] 9% Focus Damage | 60% chance to apply Venom per unit. (Rounds 3, 6, 9)",
    effect:{ type:"aoe_focus_venom", venomChance:0.60 },
    base:0.09, perLevel:0.09,
    nextDesc:(lvl) => `All enemies ${Math.round((0.09+lvl*0.09)*100)}% Focus DMG + 60% Venom each — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skit_hidden_in_webs: {
    name:"Hidden in the Webs", icon:"🌑", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[1 Enemy Unit] 20% Focus Damage | Applies Poison (20% damage/round for 2 rounds). (Rounds 3, 6, 9)",
    effect:{ type:"focus_damage_poison", poisonDmg:0.20, poisonDuration:2 },
    base:0.20, perLevel:0.20,
    nextDesc:(lvl) => `${Math.round((0.20+lvl*0.20)*100)}% Focus DMG + Poison 20%/rnd (2 rnd) — rounds 3,6,9`,
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  skit_power_in_numbers: {
    name:"Power In Numbers", icon:"💪", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"[If all units are Spiders] [Spider Units] All stats +1.0%. (Passive)",
    effect:{ type:"all_spider_army_bonus", value:0.01 },
    base:0.01, perLevel:0.01,
    nextDesc:(lvl) => `[All-Spider army] Spider Units: all stats +${Math.round((0.01+lvl*0.01)*100)}% (permanent)`,
  },

  skit_scurrier: {
    name:"Scurrier", icon:"💨", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    notImplemented:true,
    desc:"[Army] March Speed +2%. (Non-Combat Passive — Coming Soon)",
    effect:{ type:"march_speed_bonus", value:0.02 },
    base:0.02, perLevel:0.02,
    nextDesc:(lvl) => `March Speed +${Math.round((0.02+lvl*0.02)*100)}% (permanent)`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  skit_spiders_web: {
    name:"Spider's Web", icon:"🕸️", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"[First 4 Rounds] [All Enemies] SPD -2.0 (modified by SPD). (Passive)",
    effect:{ type:"enemy_spd_down_early", value:2.0, maxRound:4, modifiedBy:"spd" },
    base:2.0, perLevel:2.0,
    maxLevelEffect:{ cmdSpdBonus:10 },
    nextDesc:(lvl) => `[Rounds 1–4] All enemies SPD -${2.0+lvl*2.0} (SPD mod)${lvl >= 14 ? " | Max: CMD SPD +10" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  skit_vexing_attack: {
    name:"Vexing Attack", icon:"⚡", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"[All Allied Units] First 3 rounds: 8% chance to gain a follow-up attack. (Passive)",
    effect:{ type:"ally_followup_chance_early", chance:0.08, maxRound:3 },
    base:0.08, perLevel:0.08,
    nextDesc:(lvl) => `[Rounds 1–3] All allies ${Math.round((0.08+lvl*0.08)*100)}% chance for follow-up attack (permanent)`,
  },

  // 3CD → rounds 4, 8
  skit_creature_power: {
    name:"Creature Power", icon:"🌕", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:3, offset:4, duration:1,
    desc:"[Spider Units] 10% chance to evade | [Vampire Units] 10% chance for max damage | [Werewolf Units] 10% chance for SPD +10. All proc independently. (Rounds 4, 8)",
    effect:{ type:"cotn_multi_branch_buff",
      spider:{ type:"evasion", chance:0.10 },
      vampire:{ type:"max_damage", chance:0.10 },
      werewolf:{ type:"spd_bonus", chance:0.10, value:10 }
    },
    base:0.10, perLevel:0.10,
    nextDesc:(lvl) => {
      const pct = Math.round((0.10+lvl*0.10)*100);
      return `Spider ${pct}% evade | Vampire ${pct}% max DMG | Werewolf ${pct}% SPD+10 — rounds 4,8`;
    },
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // Round 1 + 2CD → rounds 1, 4, 7, 10
  skit_spider_queen: {
    name:"Spider Queen", icon:"👑", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"[Round 1] [1 Enemy Unit] 12% Focus Damage | [Spider Units] gain +2% damage (stacks up to 4×). (Rounds 1, 4, 7, 10)",
    effect:{ type:"focus_damage_spider_stack", spiderDmgPerStack:0.02, maxStacks:4 },
    base:0.12, perLevel:0.12,
    maxLevelEffect:{ spiderStunImmunity:true },
    nextDesc:(lvl) => `${Math.round((0.12+lvl*0.12)*100)}% Focus DMG + Spider Units +2% DMG stack (max 4×/+8%)${lvl >= 14 ? " | Max: Spider Units Stun Immune" : ""} — rounds 1,4,7,10`,
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  skit_trapped: {
    name:"Trapped", icon:"🪤", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:3, duration:2,
    desc:"[2 Enemy Units] Damage Received +2% | 10% chance to Stun each round while active. (Rounds 3, 6, 9)",
    effect:{ type:"vulnerability_stun_chance", targets:2, vulnValue:0.02, stunChance:0.10, duration:2 },
    base:0.02, perLevel:0.02,
    nextDesc:(lvl) => `[2 Units] DMG Received +${Math.round((0.02+lvl*0.02)*100)}% + 10% Stun/rnd (2 rnd) — rounds 3,6,9`,
  },

  // 2CD → rounds 3, 6, 9
  skit_resilience: {
    name:"Skitter's Resilience", icon:"💚", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[2 Allied Units] Recover 12% HP | 70% chance to remove 1 random debuff per unit. (Rounds 3, 6, 9)",
    effect:{ type:"heal_cleanse", targets:2, healPct:0.12, cleanseChance:0.70 },
    base:0.12, perLevel:0.12,
    nextDesc:(lvl) => `[2 Allied Units] ${Math.round((0.12+lvl*0.12)*100)}% HP + 70% cleanse 1 debuff — rounds 3,6,9`,
  },
};

export const SKITTER_RESKIN_SKILLS = {};


// ── THAELOR THE SILKBOUND (veteran, attacker, Spider) ─────────────────────────
// ATK:40, FOC:145, SPD:65 — silk assassin, patient and precise. High physical
// damage output through stacking debuffs, self-buff skills, and multi-hit bursts.

export const THAELOR_UNIQUE_SKILLS = {

  // ── R0 TOP — Main ─────────────────────────────────────────────────────────
  tha_spider_assassin: {
    name:"Spider Assassin", icon:"🕷️", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"[Commander] Normal Attack Damage +2%. (Passive)",
    effect:{ type:"cmd_normal_atk_bonus", value:0.02 },
    base:0.02, perLevel:0.02,
    maxLevelEffect:{ atkBonus:15 },
    nextDesc:(lvl) => `Normal Attack DMG +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R0 TOP — Sides ────────────────────────────────────────────────────────
  tha_exerted_pressure: {
    name:"Exerted Pressure", icon:"👊", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"[Commander] Normal Attacks deal an additional 10% Physical Damage. (Passive)",
    effect:{ type:"cmd_normal_atk_bonus", value:0.10 },
    base:0.10, perLevel:0.10,
    nextDesc:(lvl) => `Normal Attacks +${Math.round((0.10+lvl*0.10)*100)}% extra Physical Damage (permanent)`,
  },

  tha_weak_spot: {
    name:"Weak Spot", icon:"🎯", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"[After Commander attacks] Target takes +1.5% more damage (modified by ATK) for 2 rounds. Stacks up to 2 times independently. (Passive)",
    effect:{ type:"post_attack_vulnerability", value:0.015, duration:2, maxStacks:2, modifiedBy:"atk" },
    base:0.015, perLevel:0.015,
    nextDesc:(lvl) => `Post-attack: Target DMG Received +${((0.015+lvl*0.015)*100).toFixed(1)}% (ATK mod, 2 rnd, 2 independent stacks) (permanent)`,
  },

  // ── R0 BOTTOM — Main ──────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  tha_all_out_assault: {
    name:"All Out Assault", icon:"⚔️", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"Deals 15% / 17% / 19% Physical Damage three times — each hit targets a different unit. (Rounds 3, 6, 9)",
    effect:{ type:"multi_hit_escalating", hits:[0.15,0.17,0.19], differentTargets:true },
    base:0.15, perLevel:0.15,
    maxLevelEffect:{ atkBonus:15 },
    nextDesc:(lvl) => {
      const h1 = Math.round((0.15+lvl*0.15)*100);
      const h2 = Math.round((0.17+lvl*0.17)*100);
      const h3 = Math.round((0.19+lvl*0.19)*100);
      return `3 hits on different targets: ${h1}% / ${h2}% / ${h3}% Physical DMG${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`;
    },
  },

  // ── R0 BOTTOM — Sides ─────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  tha_brutal_strike: {
    name:"Brutal Strike", icon:"💥", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:3, offset:4, duration:1,
    desc:"[1 Enemy Unit, prioritises Melee] 27% Physical Damage | 50% chance for additional 27% Physical Damage. (Rounds 4, 8)",
    effect:{ type:"physical_damage_followup", target:"prioritiseMelee", initialDmg:0.27, followupDmg:0.27, followupChance:0.50 },
    base:0.27, perLevel:0.2471,
    nextDesc:(lvl) => {
      const dmg = Math.round((0.27+lvl*0.2471)*100);
      return `[Melee priority] ${dmg}% + 50% chance ${dmg}% follow-up Physical DMG — rounds 4,8`;
    },
  },

  // Round 1 + 2CD → rounds 1, 4, 7, 10
  tha_surprise_assault: {
    name:"Surprise Assault", icon:"🌑", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"[Round 1] [All Enemy Units] 30% Physical Damage | 35% chance to Stun each target for 1 round. (Rounds 1, 4, 7, 10)",
    effect:{ type:"aoe_physical_stun", stunChance:0.35 },
    base:0.30, perLevel:0.30,
    nextDesc:(lvl) => `All enemies ${Math.round((0.30+lvl*0.30)*100)}% Physical DMG + 35% Stun each — rounds 1,4,7,10`,
  },

  // ── R3 — Main ─────────────────────────────────────────────────────────────
  tha_ancestral_knowledge: {
    name:"Ancestral Knowledge", icon:"📖", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"[Commander] Skill Damage +2.0% in combat. (Passive)",
    effect:{ type:"skill_dmg_bonus", value:0.02 },
    base:0.02, perLevel:0.02,
    maxLevelEffect:{ atkBonus:15 },
    nextDesc:(lvl) => `All active skill damage +${Math.round((0.02+lvl*0.02)*100)}%${lvl >= 14 ? " | Max: ATK +15" : ""} (permanent)`,
  },

  // ── R3 — Sides ────────────────────────────────────────────────────────────
  // 3CD → rounds 4, 8
  tha_spiders_gambit: {
    name:"Spider's Gambit", icon:"🎲", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:3, offset:4, duration:1,
    desc:"[1 Enemy Unit] 100% Physical Damage | [Self] Next damage dealt -40%. (Rounds 4, 8)",
    effect:{ type:"physical_damage_self_debuff", dmg:1.00, selfDebuff:0.40, debuffDuration:"next_hit" },
    base:1.00, perLevel:1.00,
    nextDesc:(lvl) => `${Math.round((1.00+lvl*1.00)*100)}% Physical DMG | Self: Next DMG -40% — rounds 4,8`,
  },

  tha_eight_eyes: {
    name:"Eight Eyes", icon:"👁️", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"[Commander and Allied Units] 10% chance to gain Confusion Immunity for first 4 rounds. (Passive)",
    effect:{ type:"confusion_immunity_chance", chance:0.10, rounds:4 },
    base:0.10, perLevel:0.0667,
    nextDesc:(lvl) => `${Math.round((0.10+lvl*0.0667)*100)}% chance for Confusion Immunity (first 4 rounds) (permanent)`,
  },

  // ── R5 — Main ─────────────────────────────────────────────────────────────
  // 2CD → rounds 3, 6, 9
  tha_beast_hunter: {
    name:"Beast Hunter", icon:"🗡️", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[1 Enemy Unit] 30% Physical Damage | [1 Random Large Enemy Unit] Additional 20% Physical Damage. (Rounds 3, 6, 9)",
    effect:{ type:"physical_damage_large_bonus", primaryDmg:0.30, largeBonusDmg:0.20 },
    base:0.30, perLevel:0.30,
    maxLevelEffect:{ atkBonus:15 },
    nextDesc:(lvl) => {
      const p = Math.round((0.30+lvl*0.30)*100);
      const b = Math.round((0.20+lvl*0.20)*100);
      return `${p}% Physical DMG + ${b}% bonus vs Large unit${lvl >= 14 ? " | Max: ATK +15" : ""} — rounds 3,6,9`;
    },
  },

  // ── R5 — Sides ────────────────────────────────────────────────────────────
  tha_many_trades: {
    name:"Many Trades", icon:"🃏", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"[Commander] First 4 skills activated each battle deal +5% extra damage. (Passive)",
    effect:{ type:"first_skills_dmg_bonus", instances:4, bonus:0.05 },
    base:0.05, perLevel:0.05,
    nextDesc:(lvl) => `First 4 skills: +${Math.round((0.05+lvl*0.05)*100)}% extra damage (permanent)`,
  },

  // 2CD → rounds 3, 6, 9
  tha_constant_pressure: {
    name:"Constant Pressure", icon:"🔩", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:3, duration:1,
    desc:"[2 Enemy Units] 20% Physical Damage (modified by ATK) | Apply Heal Block for 1 round. (Rounds 3, 6, 9)",
    effect:{ type:"physical_damage_heal_block", targets:2, healBlockDuration:1, modifiedBy:"atk" },
    base:0.20, perLevel:0.20,
    nextDesc:(lvl) => `[2 Units] ${Math.round((0.20+lvl*0.20)*100)}% Physical DMG (ATK mod) + Heal Block 1 rnd — rounds 3,6,9`,
  },
};

export const THAELOR_RESKIN_SKILLS = {};


// ── Merged export ─────────────────────────────────────────────────────────────

export const NIGHTCREATURES_SKILLS = {
  ...SERAVA_UNIQUE_SKILLS,
  ...SERAVA_RESKIN_SKILLS,
  ...MALACHAR_UNIQUE_SKILLS,
  ...MALACHAR_RESKIN_SKILLS,
  ...GROTH_UNIQUE_SKILLS,
  ...GROTH_RESKIN_SKILLS,
  ...KORRAX_UNIQUE_SKILLS,
  ...KORRAX_RESKIN_SKILLS,
  ...SKITTER_UNIQUE_SKILLS,
  ...SKITTER_RESKIN_SKILLS,
  ...THAELOR_UNIQUE_SKILLS,
  ...THAELOR_RESKIN_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const NIGHTCREATURES_BRANCH_SKILL_MAP = {
  // Countess Serava (strategist, Vampire) — blood curse debuffer + drain striker
  h43: [
    { main:"serava_crimson_embrace", sides:["ser_countess_seduction", "ser_siren_song"]       }, // R0 top
    { main:"ser_brawler",            sides:["ser_fight_with_me",      "ser_overpower"]         }, // R0 bottom
    { main:"mal_compulsion",         sides:["mal_vampires_thrall",    "ser_hk_eradicator"]    }, // R3 (shared Compulsion/Thrall)
    { main:"ser_assassins_blade",    sides:["ser_thrill_of_the_hunt", "ser_did_you_want_more"] }, // R5
  ],
  // Lord Malachar (strategist, Vampire) — vulnerability stacker + army debuffer
  h44: [
    { main:"mal_compulsion",       sides:["mal_vampires_thrall",    "mal_ruthless_extinction"] }, // R0 top
    { main:"mal_war_general",      sides:["mal_surprise_attack",    "mal_blood_transfusion"]  }, // R0 bottom
    { main:"mal_invisible_enemy",  sides:["mal_double_tap",         "mal_protect_my_children"]}, // R3
    { main:"mal_lords_experience", sides:["mal_vampire_assassins",  "mal_night_terror"]       }, // R5
  ],
  // Fang Groth (balanced, Werewolf) — pack brawler, combat + defense + troop buff
  h45: [
    { main:"groth_lifeline",          sides:["groth_supply_specialist", "groth_fastest"]         }, // R0 top
    { main:"groth_mounted_specialist",sides:["groth_frontline_medic",   "groth_mounted_armor"]   }, // R0 bottom
    { main:"kor_wolfs_rage",          sides:["kor_moonlight",           "kor_moons_blessing"]    }, // R3 shared
    { main:"groth_fangs_assault",     sides:["groth_fangs_ambush",      "groth_protect_troops"]  }, // R5
  ],
  // Alpha Korrax (leader, Werewolf) — army commander, pack surge, garrison breaker
  h46: [
    { main:"kor_pack_leader",     sides:["kor_commanders_howl",    "kor_pack_protection"]  }, // R0 top
    { main:"kor_wolfs_rage",      sides:["kor_moonlight",          "kor_moons_blessing"]   }, // R0 bottom
    { main:"kor_power_of_alpha",  sides:["kor_packs_connection",   "kor_leaders_rage"]     }, // R3
    { main:"kor_packs_charge",    sides:["kor_leaders_protection", "kor_thick_skin"]       }, // R5
  ],
  // Skitter Vex (support, Spider) — web trapper, team healer, debuffer
  h47: [
    { main:"skit_heal_my_children", sides:["skit_jumping_spiders",  "skit_spider_bite"]      }, // R0 top
    { main:"skit_hidden_in_webs",   sides:["skit_power_in_numbers", "skit_scurrier"]          }, // R0 bottom
    { main:"skit_spiders_web",      sides:["skit_vexing_attack",    "skit_creature_power"]    }, // R3
    { main:"skit_spider_queen",     sides:["skit_trapped",          "skit_resilience"]        }, // R5
  ],
  // Thaelor the Silkbound (attacker, Spider) — ambush assassin, venom striker
  h48: [
    { main:"tha_spider_assassin",    sides:["tha_exerted_pressure",   "tha_weak_spot"]          }, // R0 top
    { main:"tha_all_out_assault",    sides:["tha_brutal_strike",      "tha_surprise_assault"]   }, // R0 bottom
    { main:"tha_ancestral_knowledge",sides:["tha_spiders_gambit",     "tha_eight_eyes"]         }, // R3
    { main:"tha_beast_hunter",       sides:["tha_many_trades",        "tha_constant_pressure"]  }, // R5
  ],
};
