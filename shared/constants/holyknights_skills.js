/* ─────────────────────────────────────────────────────────────────────────────
   holyknights_skills.js — Holy Knights Faction Skills
   72 total: 60 reskins + 12 unique new skills
   6 commanders × 12 skills each

   Commanders:
     Brother Aldric          (soldier,   defender) — 10 reskins + 2 unique
     Commander Vayne         (veteran,   leader)   — 10 reskins + 2 unique
     Friar Brennan           (soldier,   support)  — 10 reskins + 2 unique
     High Warden Seraph      (champion,  attacker) — 10 reskins + 2 unique
     Sister Vivara           (veteran,   support)  — 10 reskins + 2 unique
     Grand Inquisitor Mourne (champion,  attacker) — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── BROTHER ALDRIC (soldier, defender) ───────────────────────────────────────

// ★ 2 Unique New Skills

export const ALDRIC_UNIQUE_SKILLS = {
  aldric_last_stand: {
    name:"Aldric's Last Stand", icon:"🛡", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"Aldric braces, reducing damage taken and restoring fallen troops.",
    dmgReduce:0.14, healPct:0.06, base:0.14, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.03)*100)}% dmg + heal ${Math.round((0.06+lvl*0.03)*100)}% (2 rnd) — rounds 2,6,10`,
  },
  templar_oath: {
    name:"Templar's Oath", icon:"✝️", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"passive",
    desc:"A sworn defender — permanently hardens troops and reduces incoming damage.",
    passiveTroopDef:0.05, passiveDmgReduce:0.02, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop DEF & -${Math.round((0.02+lvl*0.01)*100)}% dmg (permanent)`,
  },
};

// 10 Reskins — same mechanics as base defender skills

export const ALDRIC_RESKIN_SKILLS = {
  aldric_iron_will: {
    name:"Aldric's Iron Will", icon:"🛡", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"passive",
    desc:"Permanently reduces all incoming damage.",
    passiveDmgReduce:0.04, base:0.04, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.04+lvl*0.03)*100)}% incoming dmg (permanent)`,
  },
  templar_shield_wall: {
    name:"Templar's Shield Wall", icon:"🏰", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:2, offset:1, duration:2,
    desc:"Raises a holy shield wall every other round for 2 rounds.",
    dmgReduce:0.12, base:0.12, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.04)*100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  templar_bastion: {
    name:"Templar's Bastion", icon:"⛩", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:4, offset:2, duration:3,
    desc:"Reinforces troop defenses for 3 rounds.",
    troopDmgReduce:0.18, base:0.18, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.18+lvl*0.05)*100)}% troop dmg (3 rnd) — rounds 2,6,10`,
  },
  hold_the_sacred_line: {
    name:"Hold the Sacred Line", icon:"🚩", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Orders troops to brace every other round.",
    troopDmgReduce:0.14, base:0.14, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.04)*100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  templar_rebuke: {
    name:"Templar's Rebuke", icon:"📣", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Weakens enemy attacks for 2 rounds.",
    enemyAtkReduce:0.15, base:0.15, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.15+lvl*0.04)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  aldric_fortified_ranks: {
    name:"Aldric's Fortified Ranks", icon:"🪖", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"passive",
    desc:"Permanently hardens troop defenses.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop DEF (permanent)`,
  },
  blinding_radiance: {
    name:"Blinding Radiance", icon:"🌟", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"A burst of holy light blinds enemy attackers.",
    enemyMissChance:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`${Math.round((0.20+lvl*0.05)*100)}% miss (2 rnd) — rounds 3,7`,
  },
  aldric_wrath_aura: {
    name:"Aldric's Wrath Aura", icon:"👻", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:5, offset:2, duration:3,
    desc:"Radiates divine fear, reducing all enemy damage for 3 rounds.",
    enemyDmgReduce:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.20+lvl*0.05)*100)}% enemy dmg (3 rnd) — rounds 2,7`,
  },
  divine_anticipation: {
    name:"Divine Anticipation", icon:"🔭", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Anticipates and nullifies the enemy's skill through holy foresight.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 1,6`,
  },
  templar_ghost_step: {
    name:"Templar's Ghost Step", icon:"👤", tree:"defense", cls:"defender",
    faction:"holyknights", commander:"h37",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"Sidesteps attacks with eerie, faith-guided precision every 3 rounds.",
    enemyMissChance:0.30, base:0.30, perLevel:0.06,
    nextDesc:(lvl)=>`${Math.round((0.30+lvl*0.06)*100)}% enemy miss — rounds 3,6,9`,
  },
};

// ── COMMANDER VAYNE (veteran, leader) ─────────────────────────────────────────

// ★ 2 Unique New Skills

export const VAYNE_UNIQUE_SKILLS = {
  vayne_edict: {
    name:"Vayne's Edict", icon:"⚔️", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"A commanding decree that surges troop attack and weakens enemy retaliation.",
    troopAtkMult:1.18, enemyAtkReduce:0.12, base:1.18, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.18+lvl*0.05).toFixed(2)} ATK & -${Math.round((0.12)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  crusader_advance: {
    name:"Crusader's Advance", icon:"📜", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"The holy order marches as one — unstoppable, ignoring fortifications.",
    troopAtkMult:1.55, garrisonIgnore:0.18, base:1.55, perLevel:0.10,
    nextDesc:(lvl)=>`Troops ×${(1.55+lvl*0.10).toFixed(2)} ATK & ignore ${Math.round((0.18)*100)}% garrison — rounds 5,10`,
  },
};

// 10 Reskins — same mechanics as base leader skills

export const VAYNE_RESKIN_SKILLS = {
  vayne_command_aura: {
    name:"Vayne's Command Aura", icon:"📡", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"passive",
    desc:"Troops permanently fight with greater ferocity under Vayne's banner.",
    passiveTroopAtk:0.07, base:0.07, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.07+lvl*0.04)*100)}% troop ATK (permanent)`,
  },
  templar_roar: {
    name:"Templar's Roar", icon:"📣", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:2, offset:2, duration:2,
    desc:"A battle cry that boosts troop attack every other round.",
    troopAtkMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  grand_holy_strategy: {
    name:"Grand Holy Strategy", icon:"🗺", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:4, offset:1, duration:3,
    desc:"Tactical holy plan buffs attack and defense.",
    troopAtkMult:1.20, troopDefMult:1.10, base:1.20, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.20+lvl*0.06).toFixed(2)} ATK & ×1.10 DEF (3 rnd) — rounds 1,5,9`,
  },
  vayne_forced_march: {
    name:"Vayne's Forced March", icon:"💨", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Troops surge with overwhelming holy force.",
    troopAtkMult:1.50, base:1.50, perLevel:0.10,
    nextDesc:(lvl)=>`Troops ×${(1.50+lvl*0.10).toFixed(2)} ATK — rounds 5,10`,
  },
  holy_siege_mastery: {
    name:"Holy Siege Mastery", icon:"🪨", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"passive",
    desc:"Permanently ignores a portion of garrison fortifications through divine conviction.",
    passiveGarrisonIgnore:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`Ignore ${Math.round((0.06+lvl*0.04)*100)}% garrison bonus (permanent)`,
  },
  vayne_supply_cut: {
    name:"Vayne's Supply Cut", icon:"✂", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Repeatedly disrupts enemy supply lines.",
    blockHeal:2, base:2, perLevel:1,
    nextDesc:(lvl)=>`Block enemy heal ${2+lvl} rounds — rounds 1,4,7,10`,
  },
  templar_advance: {
    name:"Templar's Advance", icon:"♟", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"Boosts troop attack and weakens enemy damage.",
    troopAtkMult:1.12, enemyDmgReduce:0.10, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`Troops ×${(1.12+lvl*0.04).toFixed(2)} + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  vayne_war_council: {
    name:"Vayne's War Council", icon:"📜", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:5, offset:2, duration:1,
    desc:"Nullifies the enemy and surges troop attack.",
    nullifySkill:true, troopAtkMult:1.18, base:1.18, perLevel:0.05,
    nextDesc:(lvl)=>`Nullify enemy + Troops ×${(1.18+lvl*0.05).toFixed(2)} ATK — rounds 2,7`,
  },
  holy_legion_discipline: {
    name:"Holy Legion Discipline", icon:"🪖", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"passive",
    desc:"Permanently hardens troop defenses through holy discipline.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop DEF (permanent)`,
  },
  vayne_shield_order: {
    name:"Vayne's Shield Order", icon:"🛡", tree:"command", cls:"leader",
    faction:"holyknights", commander:"h38",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Orders troops to shield up every other round.",
    troopDefMult:1.12, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`Troops ×${(1.12+lvl*0.04).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
};

// ── FRIAR BRENNAN (soldier, support) ─────────────────────────────────────────

// ★ 2 Unique New Skills

export const BRENNAN_UNIQUE_SKILLS = {
  brennan_blessing: {
    name:"Brennan's Blessing", icon:"✝️", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"A holy blessing that heals troops and bolsters their defenses.",
    healPct:0.10, troopDefMult:1.10, base:0.10, perLevel:0.02,
    nextDesc:(lvl)=>`Heal ${Math.round((0.10+lvl*0.02)*100)}% + Troops ×${(1.10).toFixed(2)} DEF (2 rnd) — rounds 3,6,9`,
  },
  friar_resolve: {
    name:"Friar's Resolve", icon:"🌟", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"passive",
    desc:"Quiet, unwavering faith — continuously restores troops and hardens their resolve.",
    passiveHealPerRound:0.015, passiveTroopDef:0.03, base:0.015, perLevel:0.005,
    nextDesc:(lvl)=>`Restore ${Math.round((0.015+lvl*0.005)*100)}% lost troops/round & +${Math.round((0.03)*100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — same mechanics as base support skills

export const BRENNAN_RESKIN_SKILLS = {
  brennan_field_medic: {
    name:"Brennan's Field Medic", icon:"💚", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"passive",
    desc:"Continuously restores fallen troops each round.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% lost troops/round`,
  },
  holy_mending_wave: {
    name:"Holy Mending Wave", icon:"✨", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"A surge of holy healing every other round.",
    healPct:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`Restore ${Math.round((0.06+lvl*0.02)*100)}% lost troops — rounds 2,4,6,8,10`,
  },
  brennan_rally_cry: {
    name:"Brennan's Rally Cry", icon:"🚩", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Pulls fallen soldiers back to their feet with a holy cry.",
    healPct:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Restore ${Math.round((0.18+lvl*0.04)*100)}% lost troops — rounds 1,6`,
  },
  battle_priest_hymn: {
    name:"Battle Priest's Hymn", icon:"🎵", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"An inspiring battle hymn boosts troop attack for 2 rounds.",
    troopAtkMult:1.18, base:1.18, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.18+lvl*0.06).toFixed(2)} ATK (2 rnd) — rounds 3,6,9`,
  },
  friar_inspiration: {
    name:"Friar's Inspiration", icon:"⭐", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"passive",
    desc:"Permanently inspires troops to fight harder through holy devotion.",
    passiveTroopAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop ATK (permanent)`,
  },
  holy_hex: {
    name:"Holy Hex", icon:"🔮", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"A divine curse causes enemy attacks to falter.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  brennan_blind_strike: {
    name:"Brennan's Blind Strike", icon:"👁", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Disorients the enemy, reducing their attack.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  friar_supply_cut: {
    name:"Friar's Supply Cut", icon:"✂", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"Cuts enemy supply lines, blocking their healing.",
    blockHeal:3, base:3, perLevel:1,
    nextDesc:(lvl)=>`Block enemy heal ${3+lvl} rounds — rounds 3,8`,
  },
  brennan_guardian_aura: {
    name:"Brennan's Guardian Aura", icon:"🌿", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"passive",
    desc:"Permanently bolsters troop resilience through holy protection.",
    passiveTroopDef:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop DEF (permanent)`,
  },
  sacred_ember_shield: {
    name:"Sacred Ember Shield", icon:"🔆", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h39",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"A sacred protective shield every other round.",
    troopDefMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
};

// ── HIGH WARDEN SERAPH (champion, attacker) ───────────────────────────────────

// ★ 2 Unique New Skills

export const SERAPH_UNIQUE_SKILLS = {
  seraph_judgment: {
    name:"Seraph's Judgment", icon:"☀️", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"A devastating strike of divine judgment, amplified by holy fury.",
    cmdMult:2.8, critBonus:0.40, base:2.8, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.8+lvl*0.20).toFixed(2)} dmg + 40% crit — rounds 2,6,10`,
  },
  warden_ascendant: {
    name:"Warden Ascendant", icon:"☀️", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"passive",
    desc:"At full strength, Seraph transcends — permanently amplifying her attack and critical chance.",
    passiveCmdAtk:0.10, passiveCritChance:0.08, base:0.10, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.10+lvl*0.05)*100)}% cmd ATK & +${Math.round((0.08)*100)}% crit (permanent)`,
  },
};

// 10 Reskins — same mechanics as base attacker skills

export const SERAPH_RESKIN_SKILLS = {
  seraph_killing_instinct: {
    name:"Seraph's Killing Instinct", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"passive",
    desc:"Permanently increases commander attack power.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% cmd ATK (permanent)`,
  },
  warden_quick_strike: {
    name:"Warden's Quick Strike", icon:"⚡", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"The Warden strikes with divine speed every other round.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Cmd ×${(1.4+lvl*0.15).toFixed(2)} dmg — rounds 1,3,5,7,9`,
  },
  divine_savage_blow: {
    name:"Divine Savage Blow", icon:"🗡", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"A heavy holy strike every 3 rounds.",
    cmdMult:2.2, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.2+lvl*0.20).toFixed(2)} dmg — rounds 3,6,9`,
  },
  warden_execute: {
    name:"Warden's Execute", icon:"💀", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"A devastating holy opener, then again mid-fight.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Cmd ×${(3.0+lvl*0.25).toFixed(2)} dmg — rounds 1,6`,
  },
  seraph_double_strike: {
    name:"Seraph's Double Strike", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Seraph strikes twice with divine precision.",
    cmdHits:2, cmdMult:1.2, base:1.2, perLevel:0.10,
    nextDesc:(lvl)=>`2 hits ×${(1.2+lvl*0.10).toFixed(2)} — rounds 2,6,10`,
  },
  warden_predator_eyes: {
    name:"Warden's Predator Eyes", icon:"🦅", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"passive",
    desc:"Permanently increases critical hit chance.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% crit chance (permanent)`,
  },
  holy_frenzy: {
    name:"Holy Frenzy", icon:"🩸", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Enters a righteous battle frenzy every other round.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
  warden_killing_edge: {
    name:"Warden's Killing Edge", icon:"🔪", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Deals damage equal to a % of enemy max troop HP.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% enemy max HP dmg — rounds 5,10`,
  },
  seraph_lifesteal: {
    name:"Seraph's Lifesteal", icon:"🧛", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Seraph draws strength from the enemy, healing her troops.",
    cmdMult:1.3, lifesteal:0.25, base:0.25, perLevel:0.05,
    nextDesc:(lvl)=>`Heal ${Math.round((0.25+lvl*0.05)*100)}% of cmd dmg — rounds 1,4,7,10`,
  },
  divine_flurry: {
    name:"Divine Flurry", icon:"🌪", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h40",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Three rapid divine strikes in one burst.",
    cmdHits:3, cmdMult:0.9, base:0.9, perLevel:0.08,
    nextDesc:(lvl)=>`3 hits ×${(0.9+lvl*0.08).toFixed(2)} — rounds 4,8`,
  },
};

// ── SISTER VIVARA (veteran, support) ─────────────────────────────────────────

// ★ 2 Unique New Skills

export const VIVARA_UNIQUE_SKILLS = {
  vivara_inquisition: {
    name:"Vivara's Inquisition", icon:"🌑", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"She doesn't ask questions. The enemy's strength crumbles and their healing fails.",
    enemyAtkReduce:0.16, blockHeal:3, base:0.16, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.16+lvl*0.04)*100)}% enemy ATK & block heal 3 rnd (2 rnd) — rounds 2,6,10`,
  },
  light_of_mercy: {
    name:"Light of Mercy", icon:"🌟", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"She offers mercy once. The enemy rarely expects it to hurt.",
    healPct:0.18, nullifySkill:true, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Heal ${Math.round((0.18+lvl*0.04)*100)}% lost troops & nullify enemy skill — rounds 3,6,9`,
  },
};

// 10 Reskins — same mechanics as base support skills

export const VIVARA_RESKIN_SKILLS = {
  vivara_mending_touch: {
    name:"Vivara's Mending Touch", icon:"💚", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"passive",
    desc:"Continuously restores fallen troops each round.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% lost troops/round`,
  },
  inquisitor_mending_wave: {
    name:"Inquisitor's Mending Wave", icon:"✨", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"A surge of inquisitor healing every other round.",
    healPct:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`Restore ${Math.round((0.06+lvl*0.02)*100)}% lost troops — rounds 2,4,6,8,10`,
  },
  vivara_rally_cry: {
    name:"Vivara's Rally Cry", icon:"🚩", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Vivara pulls fallen soldiers back with an inquisitor's authority.",
    healPct:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Restore ${Math.round((0.18+lvl*0.04)*100)}% lost troops — rounds 1,6`,
  },
  inquisitor_hymn: {
    name:"Inquisitor's Hymn", icon:"🎵", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"A cold, commanding hymn that drives troops to fight harder.",
    troopAtkMult:1.18, base:1.18, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.18+lvl*0.06).toFixed(2)} ATK (2 rnd) — rounds 3,6,9`,
  },
  vivara_inspiring_presence: {
    name:"Vivara's Inspiring Presence", icon:"⭐", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"passive",
    desc:"Permanently inspires troops through Vivara's quiet authority.",
    passiveTroopAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop ATK (permanent)`,
  },
  vivara_hex_curse: {
    name:"Vivara's Hex Curse", icon:"🔮", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"An inquisitor's hex causes enemy attacks to falter.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  inquisitor_blind_strike: {
    name:"Inquisitor's Blind Strike", icon:"👁", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Disorients the enemy through inquisitor cunning.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  vivara_guardian_aura: {
    name:"Vivara's Guardian Aura", icon:"🌿", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"passive",
    desc:"Permanently bolsters troop resilience through inquisitor discipline.",
    passiveTroopDef:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop DEF (permanent)`,
  },
  inquisitor_ember_shield: {
    name:"Inquisitor's Ember Shield", icon:"🔆", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"An inquisitor's protective ward every other round.",
    troopDefMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
  vivara_second_wind: {
    name:"Vivara's Second Wind", icon:"💨", tree:"tactics", cls:"support",
    faction:"holyknights", commander:"h41",
    type:"active", cooldown:5, offset:5, duration:2,
    desc:"Restores troops and surges their attack for 2 rounds.",
    healPct:0.12, troopAtkMult:1.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Heal ${Math.round((0.12+lvl*0.03)*100)}% + ×${(1.12+lvl*0.03).toFixed(2)} ATK — rounds 5,10`,
  },
};

// ── GRAND INQUISITOR MOURNE (champion, attacker) ──────────────────────────────

// ★ 2 Unique New Skills (strongest in the faction)

export const MOURNE_UNIQUE_SKILLS = {
  mourne_sentence: {
    name:"Mourne's Sentence", icon:"🌑", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"The trial ended before it began. Deals massive % HP damage with brutal crit.",
    cmdPctDmg:0.12, critBonus:0.50, base:0.12, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.12+lvl*0.02)*100)}% enemy max HP + 50% crit — rounds 1,6`,
  },
  inquisitor_purge: {
    name:"Inquisitor's Purge", icon:"🌑", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"He doesn't defeat armies. He dismantles them — striking hard, blocking healing, breaking morale.",
    cmdMult:2.5, blockHeal:3, enemyAtkReduce:0.15, base:2.5, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.5+lvl*0.20).toFixed(2)} + block heal 3 rnd + -15% enemy ATK — rounds 3,6,9`,
  },
};

// 10 Reskins — same mechanics as base attacker skills

export const MOURNE_RESKIN_SKILLS = {
  mourne_killing_instinct: {
    name:"Mourne's Killing Instinct", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"passive",
    desc:"Permanently increases commander attack power.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% cmd ATK (permanent)`,
  },
  mourne_quick_strike: {
    name:"Mourne's Quick Strike", icon:"⚡", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Mourne strikes with inquisitor speed every other round.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Cmd ×${(1.4+lvl*0.15).toFixed(2)} dmg — rounds 1,3,5,7,9`,
  },
  inquisitor_savage_blow: {
    name:"Inquisitor's Savage Blow", icon:"🗡", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"A punishing inquisitor strike every 3 rounds.",
    cmdMult:2.2, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.2+lvl*0.20).toFixed(2)} dmg — rounds 3,6,9`,
  },
  mourne_execute: {
    name:"Mourne's Execute", icon:"💀", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"A devastating inquisitor opener, then again mid-fight.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Cmd ×${(3.0+lvl*0.25).toFixed(2)} dmg — rounds 1,6`,
  },
  inquisitor_double_strike: {
    name:"Inquisitor's Double Strike", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Mourne strikes twice with cold precision.",
    cmdHits:2, cmdMult:1.2, base:1.2, perLevel:0.10,
    nextDesc:(lvl)=>`2 hits ×${(1.2+lvl*0.10).toFixed(2)} — rounds 2,6,10`,
  },
  mourne_predator_eyes: {
    name:"Mourne's Predator Eyes", icon:"🦅", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"passive",
    desc:"Permanently increases critical hit chance.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% crit chance (permanent)`,
  },
  inquisitor_frenzy: {
    name:"Inquisitor's Frenzy", icon:"🩸", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Mourne enters a cold, methodical battle frenzy every other round.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
  mourne_killing_edge: {
    name:"Mourne's Killing Edge", icon:"🔪", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Deals damage equal to a % of enemy max troop HP.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% enemy max HP dmg — rounds 5,10`,
  },
  mourne_lifedrain: {
    name:"Mourne's Lifedrain", icon:"🧛", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Mourne drains the life from his enemies to sustain his forces.",
    cmdMult:1.3, lifesteal:0.25, base:0.25, perLevel:0.05,
    nextDesc:(lvl)=>`Heal ${Math.round((0.25+lvl*0.05)*100)}% of cmd dmg — rounds 1,4,7,10`,
  },
  mourne_relentless: {
    name:"Mourne's Relentless", icon:"🔥", tree:"combat", cls:"attacker",
    faction:"holyknights", commander:"h42",
    type:"active", cooldown:1, offset:1, duration:1,
    desc:"A relentless inquisitor strike every single round.",
    cmdMult:1.08, base:1.08, perLevel:0.04,
    nextDesc:(lvl)=>`Cmd ×${(1.08+lvl*0.04).toFixed(2)} dmg — every round`,
  },
};

// ── Merged export ─────────────────────────────────────────────────────────────

export const HOLYKNIGHTS_SKILLS = {
  ...ALDRIC_UNIQUE_SKILLS,
  ...ALDRIC_RESKIN_SKILLS,
  ...VAYNE_UNIQUE_SKILLS,
  ...VAYNE_RESKIN_SKILLS,
  ...BRENNAN_UNIQUE_SKILLS,
  ...BRENNAN_RESKIN_SKILLS,
  ...SERAPH_UNIQUE_SKILLS,
  ...SERAPH_RESKIN_SKILLS,
  ...VIVARA_UNIQUE_SKILLS,
  ...VIVARA_RESKIN_SKILLS,
  ...MOURNE_UNIQUE_SKILLS,
  ...MOURNE_RESKIN_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const HOLYKNIGHTS_BRANCH_SKILL_MAP = {
  // Brother Aldric (defender)
  h37: [
    { main:"aldric_last_stand",      sides:["templar_oath",          "aldric_iron_will"]       },
    { main:"templar_shield_wall",    sides:["blinding_radiance",     "hold_the_sacred_line"]   },
    { main:"templar_bastion",        sides:["aldric_wrath_aura",     "divine_anticipation"]    },
    { main:"templar_ghost_step",     sides:["templar_rebuke",        "aldric_fortified_ranks"] },
  ],
  // Commander Vayne (leader)
  h38: [
    { main:"vayne_edict",            sides:["vayne_command_aura",    "holy_legion_discipline"] },
    { main:"templar_roar",           sides:["templar_advance",       "vayne_shield_order"]     },
    { main:"grand_holy_strategy",    sides:["vayne_war_council",     "vayne_supply_cut"]       },
    { main:"crusader_advance",       sides:["holy_siege_mastery",    "vayne_forced_march"]     },
  ],
  // Friar Brennan (support)
  h39: [
    { main:"brennan_blessing",       sides:["friar_resolve",         "brennan_field_medic"]    },
    { main:"holy_mending_wave",      sides:["brennan_blind_strike",  "sacred_ember_shield"]    },
    { main:"brennan_rally_cry",      sides:["friar_supply_cut",      "brennan_blind_strike"]   },
    { main:"brennan_guardian_aura",  sides:["friar_inspiration",     "holy_hex"]               },
  ],
  // High Warden Seraph (attacker)
  h40: [
    { main:"warden_ascendant",       sides:["seraph_killing_instinct","warden_predator_eyes"]  },
    { main:"warden_quick_strike",    sides:["holy_frenzy",           "divine_flurry"]          },
    { main:"seraph_judgment",        sides:["divine_savage_blow",    "warden_killing_edge"]    },
    { main:"warden_execute",         sides:["seraph_double_strike",  "seraph_lifesteal"]       },
  ],
  // Sister Vivara (support)
  h41: [
    { main:"vivara_inquisition",     sides:["vivara_mending_touch",  "vivara_guardian_aura"]   },
    { main:"light_of_mercy",         sides:["inquisitor_blind_strike","inquisitor_ember_shield"]},
    { main:"vivara_rally_cry",       sides:["vivara_second_wind",    "inquisitor_hymn"]        },
    { main:"inquisitor_mending_wave",sides:["vivara_inspiring_presence","vivara_hex_curse"]    },
  ],
  // Grand Inquisitor Mourne (attacker)
  h42: [
    { main:"mourne_sentence",        sides:["mourne_killing_instinct","mourne_predator_eyes"]  },
    { main:"inquisitor_purge",       sides:["inquisitor_frenzy",     "mourne_quick_strike"]    },
    { main:"mourne_execute",         sides:["inquisitor_savage_blow", "mourne_killing_edge"]   },
    { main:"inquisitor_double_strike",sides:["mourne_lifedrain",     "mourne_relentless"]      },
  ],
};
