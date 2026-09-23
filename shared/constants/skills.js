import { HOLYKNIGHTS_SKILLS, HOLYKNIGHTS_BRANCH_SKILL_MAP } from "./holyknights_skills.js";
import { NIGHTCREATURES_SKILLS, NIGHTCREATURES_BRANCH_SKILL_MAP } from "./nightcreatures_skills.js";
import { DRAGONS_SKILLS, DRAGONS_BRANCH_SKILL_MAP } from "./dragons_skills.js";
import { BOUNTYHUNTERS_SKILLS, BOUNTYHUNTERS_BRANCH_SKILL_MAP } from "./wizards_skills.js";
import { COLDBORNS_SKILLS, COLDBORNS_BRANCH_SKILL_MAP } from "./coldborns_skills.js";
import { ASHEN_DEAD_SKILLS, ASHEN_DEAD_BRANCH_SKILL_MAP } from "./ashen_dead_skills.js";
import { ORCS_SKILLS, ORCS_BRANCH_SKILL_MAP } from "./orcs_skills.js";
import { PIRATES_SKILLS, PIRATES_BRANCH_SKILL_MAP } from "./pirates_skills.js";

/* ─────────────────────────────────────────────────────────────────────────────
   skills.js — V5 Skill System

   Skill shape:
   {
     name, icon, tree, cls, desc,
     type: "active" | "passive",

     // Active only — fires on rounds: offset, offset+cd, offset+2cd ...
     cooldown: number    e.g. 2 → fires rounds 1,3,5,7,9 (if offset:1)
     offset:   number    first fire round (default = cooldown)
     duration: number    how many rounds the effect persists (1 = instant)

     // Damage fields:
     cmdMult:          number   commander attacks for X% of normal damage
     cmdPctDmg:        number   deal X% of enemy MAX troop HP directly
     cmdHits:          number   commander strikes N times this round
     cmdAoe:           boolean  commander normal attack hits ALL enemy units this round
     critBonus:        number   added crit chance this round
     lifesteal:        number   restore troops equal to X% of cmd damage dealt
     followUpChance:   number   after attacking, X% chance to strike again for followUpPct%
     followUpPct:      number   follow-up strike damage %

     // Buff/debuff fields:
     troopAtkMult:     number   multiply troop attack (duration rounds)
     troopDefMult:     number   multiply troop defense (duration rounds)
     dmgReduce:        number   reduce ALL incoming damage %
     troopDmgReduce:   number   reduce incoming troop damage %
     enemyAtkReduce:   number   reduce enemy ATK %
     enemyDmgReduce:   number   reduce ALL enemy damage %
     enemyDmgTakenUp:  number   enemy takes X% MORE damage (vulnerability)
     enemyMissChance:  number   enemy attacks miss X% of the time
     blockHeal:        number   block enemy healing for N rounds
     nullifySkill:     boolean  cancel enemy skill this round
     garrisonIgnore:   number   ignore X% of garrison/terrain bonus
     healPct:          number   restore X% of lost troops

     // Round-gating:
     activeRounds:     [from, to]  only active during these round numbers (inclusive)

     // Troop-role targeting (buffs apply only to matching role):
     troopRole:        "melee"|"ranged"|"mounted"|"siege"

     // Passive fields:
     passiveCmdAtk:          number
     passiveCritChance:      number
     passiveDmgReduce:       number
     passiveEnemyAtk:        number
     passiveTroopAtk:        number
     passiveTroopDef:        number
     passiveHealPerRound:    number
     passiveGarrisonIgnore:  number

     base:     number   value at level 1
     perLevel: number   added per extra level
     nextDesc: fn(lvl)  text for next-level tooltip
   }
───────────────────────────────────────────────────────────────────────────── */

// ── ATTACKER ──────────────────────────────────────────────────────────────────

export const ATTACKER_SKILLS = {
  killing_instinct: {
    name:"Killing Instinct", icon:"⚔", tree:"combat", cls:"attacker",
    type:"passive",
    desc:"Commander permanently deals +8% increased damage.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% commander damage (permanent)`,
  },
  quick_strike: {
    name:"Quick Strike", icon:"⚡", tree:"combat", cls:"attacker",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Commander attacks for 140% damage every other round.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((1.4+lvl*0.15)*100)}% damage — rounds 1,3,5,7,9`,
  },
  savage_blow: {
    name:"Savage Blow", icon:"🗡", tree:"combat", cls:"attacker",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"Commander attacks for 220% damage, leaving the target vulnerable to 15% more damage for 1 round.",
    cmdMult:2.2, enemyDmgTakenUp:0.15, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`${Math.round((2.2+lvl*0.20)*100)}% damage + 15% vulnerability — rounds 3,6,9`,
  },
  execute: {
    name:"Execute", icon:"💀", tree:"combat", cls:"attacker",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Commander attacks for 300% damage on round 1, then again on round 6.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((3.0+lvl*0.25)*100)}% damage — rounds 1,6`,
  },
  double_strike: {
    name:"Double Strike", icon:"⚔", tree:"combat", cls:"attacker",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Commander attacks twice in one round, each hit dealing 120% damage.",
    cmdHits:2, cmdMult:1.2, base:1.2, perLevel:0.10,
    nextDesc:(lvl)=>`2 hits × ${Math.round((1.2+lvl*0.10)*100)}% damage — rounds 2,6,10`,
  },
  predator_eyes: {
    name:"Predator's Eyes", icon:"🦅", tree:"combat", cls:"attacker",
    type:"passive",
    desc:"Commander permanently has +6% critical hit chance.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% critical hit chance (permanent)`,
  },
  battle_frenzy: {
    name:"Battle Frenzy", icon:"🔥", tree:"combat", cls:"attacker",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Commander attacks for 115% damage with +30% critical hit chance every other round.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`115% damage + ${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
  killing_edge: {
    name:"Killing Edge", icon:"🔪", tree:"combat", cls:"attacker",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Commander strikes for 6% of the enemy's maximum troop HP as direct damage.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% of enemy max HP as direct damage — rounds 5,10`,
  },
  battle_hunger: {
    name:"Battle Hunger", icon:"⚔", tree:"combat", cls:"attacker",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Commander attacks for 130% damage, restoring troops equal to 25% of damage dealt.",
    cmdMult:1.3, lifesteal:0.25, base:0.25, perLevel:0.05,
    nextDesc:(lvl)=>`130% damage, restore troops = ${Math.round((0.25+lvl*0.05)*100)}% of damage dealt — rounds 1,4,7,10`,
  },
  flurry: {
    name:"Flurry", icon:"🌪", tree:"combat", cls:"attacker",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Commander attacks three times in rapid succession, each hit dealing 90% damage.",
    cmdHits:3, cmdMult:0.9, base:0.9, perLevel:0.08,
    nextDesc:(lvl)=>`3 hits × ${Math.round((0.9+lvl*0.08)*100)}% damage — rounds 4,8`,
  },
  deathblow: {
    name:"Deathblow", icon:"💥", tree:"combat", cls:"attacker",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"Commander deals 10% of the enemy's maximum troop HP as direct damage with +50% critical hit chance.",
    cmdPctDmg:0.10, critBonus:0.50, base:0.10, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.10+lvl*0.02)*100)}% max HP direct + 50% crit — rounds 3,8`,
  },
  relentless: {
    name:"Relentless", icon:"🗡", tree:"combat", cls:"attacker",
    type:"active", cooldown:1, offset:1, duration:1,
    desc:"Commander attacks for 108% damage every single round.",
    cmdMult:1.08, base:1.08, perLevel:0.04,
    nextDesc:(lvl)=>`Commander attacks for ${Math.round((1.08+lvl*0.04)*100)}% damage — every round`,
  },
  sweeping_strike: {
    name:"Sweeping Strike", icon:"⚔", tree:"combat", cls:"attacker",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Commander's attack strikes ALL enemy units for 80% damage this round, then follows up with a 50% chance to strike a single target for an additional 120% damage.",
    cmdAoe:true, cmdMult:0.8, followUpChance:0.50, followUpPct:1.2, base:0.8, perLevel:0.06,
    nextDesc:(lvl)=>`All enemies ${Math.round((0.8+lvl*0.06)*100)}% + 50% chance single follow-up 120% — rounds 2,6,10`,
  },
};

// ── DEFENDER ──────────────────────────────────────────────────────────────────

export const DEFENDER_SKILLS = {
  iron_will: {
    name:"Iron Will", icon:"🛡", tree:"defense", cls:"defender",
    type:"passive",
    desc:"Permanently reduces all incoming damage by 4%.",
    passiveDmgReduce:0.04, base:0.04, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.04+lvl*0.03)*100)}% all incoming damage (permanent)`,
  },
  shield_wall: {
    name:"Shield Wall", icon:"🏰", tree:"defense", cls:"defender",
    type:"active", cooldown:2, offset:1, duration:2,
    desc:"Reduces all incoming damage by 12% for 2 rounds, every other round.",
    dmgReduce:0.12, base:0.12, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.04)*100)}% all damage (2 rnd) — rounds 1,3,5,7,9`,
  },
  iron_bastion: {
    name:"Iron Bastion", icon:"⛩", tree:"defense", cls:"defender",
    type:"active", cooldown:4, offset:2, duration:3,
    desc:"Reduces incoming troop damage by 18% for 3 rounds.",
    troopDmgReduce:0.18, base:0.18, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.18+lvl*0.05)*100)}% troop damage (3 rnd) — rounds 2,6,10`,
  },
  bulwark_stance: {
    name:"Bulwark Stance", icon:"⚜", tree:"defense", cls:"defender",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Reduces all incoming damage by 40% on rounds 5 and 10.",
    dmgReduce:0.40, base:0.40, perLevel:0.08,
    nextDesc:(lvl)=>`-${Math.round((0.40+lvl*0.08)*100)}% all damage — rounds 5,10`,
  },
  intimidating_presence: {
    name:"Intimidating Presence", icon:"😤", tree:"defense", cls:"defender",
    type:"passive",
    desc:"Permanently reduces enemy attack by 5%.",
    passiveEnemyAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.05+lvl*0.03)*100)}% enemy attack (permanent)`,
  },
  demoralise: {
    name:"Demoralise", icon:"📣", tree:"defense", cls:"defender",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Reduces enemy attack by 15% for 2 rounds.",
    enemyAtkReduce:0.15, base:0.15, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.15+lvl*0.04)*100)}% enemy attack (2 rnd) — rounds 1,4,7,10`,
  },
  blinding_light: {
    name:"Blinding Light", icon:"🌟", tree:"defense", cls:"defender",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"Enemy attacks have a 20% chance to miss for 2 rounds.",
    enemyMissChance:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`${Math.round((0.20+lvl*0.05)*100)}% enemy miss chance (2 rnd) — rounds 3,7`,
  },
  terror_aura: {
    name:"Terror Aura", icon:"👻", tree:"defense", cls:"defender",
    type:"active", cooldown:5, offset:2, duration:3,
    desc:"Reduces all enemy damage by 20% for 3 rounds.",
    enemyDmgReduce:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.20+lvl*0.05)*100)}% enemy damage (3 rnd) — rounds 2,7`,
  },
  fortified_ranks: {
    name:"Fortified Ranks", icon:"🪖", tree:"defense", cls:"defender",
    type:"passive",
    desc:"Permanently increases troop defense by 6%.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop defense (permanent)`,
  },
  hold_the_line: {
    name:"Hold the Line", icon:"🚩", tree:"defense", cls:"defender",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Reduces incoming troop damage by 14% every other round.",
    troopDmgReduce:0.14, base:0.14, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.04)*100)}% troop damage — rounds 2,4,6,8,10`,
  },
  counter_intel: {
    name:"Counter Intel", icon:"🔭", tree:"defense", cls:"defender",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Anticipates and nullifies the enemy's skill on rounds 1 and 6.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 1,6`,
  },
  phantom_step: {
    name:"Phantom Step", icon:"👤", tree:"defense", cls:"defender",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"Enemy attacks have a 30% chance to miss every 3 rounds.",
    enemyMissChance:0.30, base:0.30, perLevel:0.06,
    nextDesc:(lvl)=>`${Math.round((0.30+lvl*0.06)*100)}% enemy miss chance — rounds 3,6,9`,
  },
  last_stand: {
    name:"Last Stand", icon:"🛡", tree:"defense", cls:"defender",
    type:"passive",
    desc:"From round 5 onwards, all incoming damage is reduced by an additional 15%.",
    passiveDmgReduce:0.00, base:0.00, perLevel:0.01,
    activeRounds:[5, 10],
    dmgReduce:0.15,
    nextDesc:(lvl)=>`-15% damage from round 5 onwards (+${Math.round(lvl*0.01*100)}% per level)`,
  },
};

// ── SUPPORT ───────────────────────────────────────────────────────────────────

export const SUPPORT_SKILLS = {
  field_medic: {
    name:"Field Medic", icon:"💚", tree:"tactics", cls:"support",
    type:"passive",
    desc:"Restores 2% of lost troops each round automatically.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% of lost troops each round`,
  },
  mending_wave: {
    name:"Mending Wave", icon:"✨", tree:"tactics", cls:"support",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Restores 6% of lost troops every other round.",
    healPct:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`Restore ${Math.round((0.06+lvl*0.02)*100)}% of lost troops — rounds 2,4,6,8,10`,
  },
  rally_cry: {
    name:"Rally Cry", icon:"🚩", tree:"tactics", cls:"support",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Restores 18% of lost troops on rounds 1 and 6.",
    healPct:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Restore ${Math.round((0.18+lvl*0.04)*100)}% of lost troops — rounds 1,6`,
  },
  battle_hymn: {
    name:"Battle Hymn", icon:"🎵", tree:"tactics", cls:"support",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"Increases troop attack by 18% for 2 rounds every 3 rounds.",
    troopAtkMult:1.18, base:1.18, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.18+lvl*0.06-1)*100)}% troop attack (2 rnd) — rounds 3,6,9`,
  },
  inspiring_presence: {
    name:"Inspiring Presence", icon:"⭐", tree:"tactics", cls:"support",
    type:"passive",
    desc:"Permanently increases troop attack by 5%.",
    passiveTroopAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop attack (permanent)`,
  },
  hex_curse: {
    name:"Hex Curse", icon:"🔮", tree:"tactics", cls:"support",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"Enemy attacks have an 18% chance to miss for 2 rounds.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss chance (2 rnd) — rounds 2,6,10`,
  },
  blind_strike: {
    name:"Blind Strike", icon:"👁", tree:"tactics", cls:"support",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Reduces enemy attack by 12% for 2 rounds.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy attack (2 rnd) — rounds 1,4,7,10`,
  },
  supply_cut_support: {
    name:"Supply Cut", icon:"✂", tree:"tactics", cls:"support",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"Blocks enemy healing for 3 rounds on rounds 3 and 8.",
    blockHeal:3, base:3, perLevel:1,
    nextDesc:(lvl)=>`Block enemy healing for ${3+lvl} rounds — rounds 3,8`,
  },
  guardian_aura: {
    name:"Guardian Aura", icon:"🌿", tree:"tactics", cls:"support",
    type:"passive",
    desc:"Permanently increases troop defense by 5%.",
    passiveTroopDef:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop defense (permanent)`,
  },
  ember_shield: {
    name:"Ember Shield", icon:"🔆", tree:"tactics", cls:"support",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Increases troop defense by 15% every other round.",
    troopDefMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.15+lvl*0.05)*100-100)}% troop defense — rounds 1,3,5,7,9`,
  },
  second_wind: {
    name:"Second Wind", icon:"💨", tree:"tactics", cls:"support",
    type:"active", cooldown:5, offset:5, duration:2,
    desc:"Restores 12% of lost troops and increases troop attack by 12% for 2 rounds on rounds 5 and 10.",
    healPct:0.12, troopAtkMult:1.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Restore ${Math.round((0.12+lvl*0.03)*100)}% lost + +${Math.round((0.12+lvl*0.03)*100)}% attack (2 rnd) — rounds 5,10`,
  },
  foresight: {
    name:"Foresight", icon:"🔭", tree:"tactics", cls:"support",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Nullifies the enemy's skill on rounds 4 and 8.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 4,8`,
  },
  expose_weakness: {
    name:"Expose Weakness", icon:"🎯", tree:"tactics", cls:"support",
    type:"active", cooldown:3, offset:2, duration:2,
    desc:"Exposes the enemy, making them take 12% more damage for 2 rounds.",
    enemyDmgTakenUp:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Enemy takes ${Math.round((0.12+lvl*0.03)*100)}% more damage (2 rnd) — rounds 2,5,8`,
  },
};

// ── LEADER ────────────────────────────────────────────────────────────────────

export const LEADER_SKILLS = {
  warchief_aura: {
    name:"Warchief's Aura", icon:"📡", tree:"command", cls:"leader",
    type:"passive",
    desc:"Permanently increases troop attack by 7%.",
    passiveTroopAtk:0.07, base:0.07, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.07+lvl*0.04)*100)}% troop attack (permanent)`,
  },
  warchief_roar: {
    name:"Warchief's Roar", icon:"📣", tree:"command", cls:"leader",
    type:"active", cooldown:2, offset:2, duration:2,
    desc:"Increases troop attack by 15% for 2 rounds every other round.",
    troopAtkMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.15+lvl*0.05)*100-100)}% troop attack (2 rnd) — rounds 2,4,6,8,10`,
  },
  grand_strategy: {
    name:"Grand Strategy", icon:"🗺", tree:"command", cls:"leader",
    type:"active", cooldown:4, offset:1, duration:3,
    desc:"Increases troop attack by 20% and defense by 10% for 3 rounds.",
    troopAtkMult:1.20, troopDefMult:1.10, base:1.20, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.20+lvl*0.06)*100-100)}% attack & +10% defense (3 rnd) — rounds 1,5,9`,
  },
  forced_march: {
    name:"Forced March", icon:"💨", tree:"command", cls:"leader",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Troops surge with overwhelming force, increasing attack by 50%.",
    troopAtkMult:1.50, base:1.50, perLevel:0.10,
    nextDesc:(lvl)=>`+${Math.round((0.50+lvl*0.10)*100)}% troop attack — rounds 5,10`,
  },
  siege_mastery: {
    name:"Siege Mastery", icon:"🪨", tree:"command", cls:"leader",
    type:"passive",
    desc:"Permanently ignores 6% of garrison and terrain fortification bonuses.",
    passiveGarrisonIgnore:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`Ignore ${Math.round((0.06+lvl*0.04)*100)}% of garrison bonus (permanent)`,
  },
  supply_cut_leader: {
    name:"Supply Cut", icon:"✂", tree:"command", cls:"leader",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Repeatedly disrupts enemy supply lines, blocking their healing for 2 rounds.",
    blockHeal:2, base:2, perLevel:1,
    nextDesc:(lvl)=>`Block enemy healing for ${2+lvl} rounds — rounds 1,4,7,10`,
  },
  tactical_advance: {
    name:"Tactical Advance", icon:"♟", tree:"command", cls:"leader",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"Increases troop attack by 12% and reduces enemy damage by 10% for 2 rounds.",
    troopAtkMult:1.12, enemyDmgReduce:0.10, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.12+lvl*0.04)*100-100)}% attack, -10% enemy damage (2 rnd) — rounds 3,7`,
  },
  war_council: {
    name:"War Council", icon:"📜", tree:"command", cls:"leader",
    type:"active", cooldown:5, offset:2, duration:1,
    desc:"Nullifies the enemy's skill and increases troop attack by 18%.",
    nullifySkill:true, troopAtkMult:1.18, base:1.18, perLevel:0.05,
    nextDesc:(lvl)=>`Nullify enemy skill + +${Math.round((0.18+lvl*0.05)*100-100)}% troop attack — rounds 2,7`,
  },
  legion_discipline: {
    name:"Legion Discipline", icon:"🪖", tree:"command", cls:"leader",
    type:"passive",
    desc:"Permanently increases troop defense by 6%.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop defense (permanent)`,
  },
  shield_order: {
    name:"Shield Order", icon:"🛡", tree:"command", cls:"leader",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Orders troops to shield up, increasing troop defense by 12% every other round.",
    troopDefMult:1.12, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.12+lvl*0.04)*100-100)}% troop defense — rounds 1,3,5,7,9`,
  },
  siege_protocol: {
    name:"Siege Protocol", icon:"🏗", tree:"command", cls:"leader",
    type:"active", cooldown:3, offset:2, duration:2,
    desc:"Ignores 15% of garrison bonuses and reduces enemy attack by 10% for 2 rounds.",
    garrisonIgnore:0.15, enemyAtkReduce:0.10, base:0.15, perLevel:0.04,
    nextDesc:(lvl)=>`Ignore ${Math.round((0.15+lvl*0.04)*100)}% garrison, -10% enemy attack — rounds 2,5,8`,
  },
  war_taxes: {
    name:"War Taxes", icon:"💰", tree:"command", cls:"leader",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"Deals direct damage equal to 5% of the enemy's maximum troop HP.",
    cmdPctDmg:0.05, base:0.05, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.05+lvl*0.02)*100)}% of enemy max HP as direct damage — rounds 3,8`,
  },
  mounted_charge: {
    name:"Mounted Charge", icon:"🐴", tree:"command", cls:"leader",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Mounted units in your army deal 20% more damage for 2 rounds.",
    troopAtkMult:1.20, troopRole:"mounted", base:1.20, perLevel:0.05,
    nextDesc:(lvl)=>`Mounted units +${Math.round((0.20+lvl*0.05)*100-100)}% attack (2 rnd) — rounds 1,4,7,10`,
  },
  overwhelm: {
    name:"Overwhelm", icon:"⚡", tree:"command", cls:"leader",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"Melee units in your army deal 22% more damage for 2 rounds, and the enemy takes 8% more damage from all sources.",
    troopAtkMult:1.22, troopRole:"melee", enemyDmgTakenUp:0.08, base:1.22, perLevel:0.05,
    nextDesc:(lvl)=>`Melee units +${Math.round((0.22+lvl*0.05)*100-100)}% attack + 8% enemy vulnerability (2 rnd) — rounds 2,6,10`,
  },
};

// ── Merged lookup ─────────────────────────────────────────────────────────────
export const ALL_SKILLS = {
  ...ATTACKER_SKILLS,
  ...DEFENDER_SKILLS,
  ...SUPPORT_SKILLS,
  ...LEADER_SKILLS,
  ...HOLYKNIGHTS_SKILLS,
  ...NIGHTCREATURES_SKILLS,
  ...DRAGONS_SKILLS,
  ...BOUNTYHUNTERS_SKILLS,
  ...COLDBORNS_SKILLS,
  ...ASHEN_DEAD_SKILLS,
  ...ORCS_SKILLS,
  ...PIRATES_SKILLS,
};

// ── Branch layout for skill tree UI ──────────────────────────────────────────
// Note: MAIN_SKILLS and SIDE_SKILLS are derived after BRANCH_SKILL_MAP is defined (see bottom of file).
// 4 branches × (1 main + 2 sides) = 12 skills per commander
import { BRANCH_SKILL_MAP } from "./branchSkillMap.js";

// ── Public helpers ────────────────────────────────────────────────────────────

// Map tree key (from heroes.js SKILL_TREES) to cls key (used in BRANCH_SKILL_MAP)
const TREE_TO_CLS = { combat:"attacker", defense:"balanced", tactics:"support", command:"leader", balanced:"balanced", strategist:"strategist" };

// Resolve the correct branch map for a commander — Holy Knights use per-commander maps keyed by id
function resolveBranchMap(cmdOrCls, treeOrCls) {
  const cls = TREE_TO_CLS[treeOrCls] ?? treeOrCls;
  if (cmdOrCls && typeof cmdOrCls === "object") {
    const { faction, id } = cmdOrCls;
    const factionMap = {
      holyknights:    HOLYKNIGHTS_BRANCH_SKILL_MAP,
      nightcreatures: NIGHTCREATURES_BRANCH_SKILL_MAP,
      dragons:        DRAGONS_BRANCH_SKILL_MAP,
      wizards:        BOUNTYHUNTERS_BRANCH_SKILL_MAP,
      coldborns:      COLDBORNS_BRANCH_SKILL_MAP,
      ashen_dead:     ASHEN_DEAD_BRANCH_SKILL_MAP,
      orcs:           ORCS_BRANCH_SKILL_MAP,
      pirates:        PIRATES_BRANCH_SKILL_MAP,
    }[faction];
    if (factionMap) return factionMap[id] ?? BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker;
  }
  return BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker;
}

// Returns [branch0, branch1] for a garrison defender commander — used by heroes.js
// to assign skill points without creating a circular dependency.
export function getDefCmdBranches(cmd) {
  const cls = cmd.cls ?? "attacker";
  const factionMap = {
    holyknights:    HOLYKNIGHTS_BRANCH_SKILL_MAP,
    nightcreatures: NIGHTCREATURES_BRANCH_SKILL_MAP,
    dragons:        DRAGONS_BRANCH_SKILL_MAP,
    wizards:  BOUNTYHUNTERS_BRANCH_SKILL_MAP,
    orcs:           ORCS_BRANCH_SKILL_MAP,
    pirates:        PIRATES_BRANCH_SKILL_MAP,
  }[cmd.faction];
  const branches = factionMap
    ? (factionMap[cmd.id] ?? BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker)
    : (BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker);
  // Return full branch objects { main, sides } so callers can access b0.main and b0.sides
  return [branches[0], branches[1]].filter(Boolean);
}

export function getCommanderTrees(cmd) {
  const cls  = cmd?.cls ?? "attacker";
  const primary = {
    attacker:   "combat",
    leader:     "command",
    support:    "tactics",
    balanced:   "combat",    // mixed — primary tree shown as combat
    strategist: "tactics",   // tactics-heavy
  }[cls] ?? "combat";
  return { primary, secondary: primary };
}

export function getTreeDisplayNames(cmd) {
  const cls = cmd?.cls ?? "attacker";
  const names = {
    attacker:   { primary:"Combat",   secondary:"Combat"   },
    leader:     { primary:"Command",  secondary:"Command"  },
    support:    { primary:"Tactics",  secondary:"Tactics"  },
    balanced:   { primary:"Mixed",    secondary:"Mixed"    },
    strategist: { primary:"Tactics",  secondary:"Combat"   },
    defender:   { primary:"Defense",  secondary:"Defense"  }, // NPC fallback
  };
  return names[cls] ?? names.attacker;
}

// Flat siege-power bonus from skills for an army of `troops`.
export function skillSiegeBonus(cmd, troops) { return Math.round(getPassiveBonuses(cmd).siegePerTroop * (troops || 0)); }

// Spent skill levels live in `cmd.skillPoints` (CommanderScreen writes
// { [skillKey]: level }); `skillLevels` is the legacy/test name — accept both.
function cmdSkillLevels(cmd) { return cmd?.skillLevels ?? cmd?.skillPoints ?? null; }

export function getActiveSkills(cmd) {
  const lvls = cmdSkillLevels(cmd);
  if (!lvls) return [];
  const map = resolveBranchMap(cmd, cmd.cls ?? "attacker");
  const result = [];
  for (const branch of map) {
    for (const key of [branch.main, ...branch.sides]) {
      const level = lvls[key];
      if (level && level > 0) {
        const def = ALL_SKILLS[key];
        if (def) result.push({ key, def, level });
      }
    }
  }
  return result;
}

export function getPassiveBonuses(cmd) {
  const bonuses = {
    cmdAtkMult:1, critChance:0, dmgReduce:0, enemyAtkReduce:0,
    troopAtkMult:1, troopDefMult:1, healPerRound:0, garrisonIgnore:0,
    // Non-combat, world-map passives (march speed / gathering yield) — these
    // skills have no passiveXxx flag; they're picked up below by effect.type
    // instead, since they act outside battle resolution.
    marchSpeedBonus:0, gatheringBonus:0,
    siegePerTroop:0, // Orc Explosives etc.: "[Army] Siege +N" = +N siege per troop (feeds calcSiegePower's bonus)
  };
  const lvls = cmdSkillLevels(cmd);
  if (!lvls) return bonuses;
  const map = resolveBranchMap(cmd, cmd.cls ?? "attacker");
  for (const branch of map) {
    for (const key of [branch.main, ...branch.sides]) {
      const level = lvls[key];
      if (!level || level < 1) continue;
      const def = ALL_SKILLS[key];
      // Max-level world-map bonus (e.g. Know Your Enemy "March Speed +15%") — any skill type.
      if (def?.maxLevelEffect?.marchSpeedBonus && level >= (_mainKeys.has(key) ? 15 : 7)) bonuses.marchSpeedBonus += def.maxLevelEffect.marchSpeedBonus;
      if (!def || def.type !== "passive") continue;
      const lv = level - 1;
      const v  = def.base + (def.perLevel ?? 0) * lv;
      if (def.passiveCmdAtk)          bonuses.cmdAtkMult     *= (1 + v);
      if (def.passiveCritChance)       bonuses.critChance     += v;
      if (def.passiveDmgReduce)        bonuses.dmgReduce      += v;
      if (def.passiveEnemyAtk)         bonuses.enemyAtkReduce += v;
      if (def.passiveTroopAtk)         bonuses.troopAtkMult   *= (1 + v);
      if (def.passiveTroopDef)         bonuses.troopDefMult   *= (1 + v);
      if (def.passiveHealPerRound)     bonuses.healPerRound   += v;
      if (def.passiveGarrisonIgnore)   bonuses.garrisonIgnore += v;
      if (def.effect?.type === "march_speed_bonus") bonuses.marchSpeedBonus += v;
      if (def.effect?.type === "gathering_bonus")   bonuses.gatheringBonus  += v;
      if (def.effect?.type === "army_siege_bonus")  bonuses.siegePerTroop   += v;
    }
  }
  return bonuses;
}

export function skillProcAtLevel(skillDef, level) {
  if (!skillDef) return 0;
  const { procBase = 1, procMax = 1 } = skillDef;
  if (procBase === procMax) return procBase;
  const t = Math.min(1, (level - 1) / 9);
  return procBase + (procMax - procBase) * t;
}

export function skillFiresOnRound(def, round) {
  if (!def || def.type !== "active") return false;
  if (def.firesOnRounds) return def.firesOnRounds.includes(round);
  const cd  = def.cooldown ?? 1;
  const off = def.offset   ?? (cd + 1); // default: starts on cooldown, fires round cd+1
  if (round < off) return false;
  if (cd === 0) return true; // fires every round
  return (round - off) % (cd + 1) === 0;
}

// Returns the main skill key for branch b of a given commander (or class fallback).
// Used by AI to decide which skill to level up next.
export function getBranchMainSkill(cls, branchIndex, cmd) {
  const map = cmd ? resolveBranchMap(cmd, cls) : (BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker);
  const key = map[branchIndex]?.main ?? null;
  if (!key) return null;
  const def = ALL_SKILLS[key] ?? {};
  return { key, ...def };
}

// Returns the side skill objects (array) for branch b of a given commander (or class fallback).
export function getBranchSideSkills(cls, branchIndex, cmd) {
  const map = cmd ? resolveBranchMap(cmd, cls) : (BRANCH_SKILL_MAP[cls] ?? BRANCH_SKILL_MAP.attacker);
  const keys = map[branchIndex]?.sides ?? [];
  return keys.map(key => ({ key, ...(ALL_SKILLS[key] ?? {}) }));
}

// ── MAIN_SKILLS / SIDE_SKILLS ─────────────────────────────────────────────────
// Derived from BRANCH_SKILL_MAP so CommanderScreen can distinguish main skills
// (max level 10) from side skills (max level 5) and look up their definitions.
const _mainKeys = new Set();
const _sideKeys = new Set();
for (const branches of Object.values(BRANCH_SKILL_MAP)) {
  for (const branch of branches) {
    if (branch.main) _mainKeys.add(branch.main);
    for (const s of (branch.sides ?? [])) _sideKeys.add(s);
  }
}
// Also sweep faction-specific maps
for (const map of [HOLYKNIGHTS_BRANCH_SKILL_MAP, NIGHTCREATURES_BRANCH_SKILL_MAP, DRAGONS_BRANCH_SKILL_MAP, BOUNTYHUNTERS_BRANCH_SKILL_MAP, COLDBORNS_BRANCH_SKILL_MAP, ASHEN_DEAD_BRANCH_SKILL_MAP, ORCS_BRANCH_SKILL_MAP, PIRATES_BRANCH_SKILL_MAP]) {
  for (const branches of Object.values(map)) {
    for (const branch of branches) {
      if (branch.main) _mainKeys.add(branch.main);
      for (const s of (branch.sides ?? [])) _sideKeys.add(s);
    }
  }
}
export const MAIN_SKILLS = Object.fromEntries([..._mainKeys].filter(k => ALL_SKILLS[k]).map(k => [k, ALL_SKILLS[k]]));
export const SIDE_SKILLS = Object.fromEntries([..._sideKeys].filter(k => ALL_SKILLS[k]).map(k => [k, ALL_SKILLS[k]]));

// ── Backward-compat exports expected by heroes.js re-export ──────────────────

// Display names for the 4 branch slots of each generic tree
export const MAIN_BRANCH_NAMES = {
  combat:  ["Killing Instinct","Quick Strike","Savage Blow","Execute"],
  defense: ["Iron Will","Shield Wall","Iron Bastion","Bulwark Stance"],
  command: ["Warchief's Aura","Warchief's Roar","Grand Strategy","Forced March"],
  tactics: ["Field Medic","Mending Wave","Rally Cry","Battle Hymn"],
};

// Per-faction overrides — maps faction id → array of 4 branch display names
export const FACTION_MAIN_NAMES = {
  holyknights:    {},
  nightcreatures: {},
  dragons:        {},
  wizards:  {},
  coldborns:      {},
  "ashen_dead":   {},
  orcs:           {},
  pirates:        {},
};

// Returns the 4 main branch display names for a given commander
export function getMainBranchNames(cmd) {
  const cls = cmd?.cls ?? "attacker";
  const tree = { attacker:"combat", defender:"defense", leader:"command", support:"tactics", balanced:"combat", strategist:"tactics" }[cls] ?? "combat";
  if (cmd?.faction && FACTION_MAIN_NAMES[cmd.faction]?.[cmd.id]) {
    return FACTION_MAIN_NAMES[cmd.faction][cmd.id];
  }
  return MAIN_BRANCH_NAMES[tree] ?? MAIN_BRANCH_NAMES.combat;
}

// Flat key→display-name map for every skill
export const SKILL_NAMES = Object.fromEntries(
  Object.entries(ALL_SKILLS).map(([k, v]) => [k, v.name ?? k])
);

// Returns skill display name for a given key (with optional commander context)
export function getSkillNames(cmd) {
  return SKILL_NAMES;
}

// Alias — heroes.js re-exports this as TREE_DISPLAY_NAMES
export const TREE_DISPLAY_NAMES = {
  attacker:   { primary:"Combat",   secondary:"Combat"   },
  leader:     { primary:"Command",  secondary:"Command"  },
  support:    { primary:"Tactics",  secondary:"Tactics"  },
  balanced:   { primary:"Mixed",    secondary:"Mixed"    },
  strategist: { primary:"Tactics",  secondary:"Combat"   },
  defender:   { primary:"Defense",  secondary:"Defense"  },
};

// Full skill definitions — alias for ALL_SKILLS
export const SKILLS = ALL_SKILLS;

// Per-skill mechanic metadata — maps skill key to its primary mechanic field and base value
export const SKILL_MECHANICS = Object.fromEntries(
  Object.entries(ALL_SKILLS).map(([k, def]) => {
    const fields = ["cmdMult","cmdPctDmg","healPct","troopAtkMult","troopDefMult","dmgReduce",
      "troopDmgReduce","enemyDmgReduce","enemyAtkReduce","enemyMissChance","enemyDmgTakenUp",
      "nullifySkill","blockHeal","lifesteal","critBonus","garrisonIgnore","cmdAoe","cmdHits",
      "passiveCmdAtk","passiveCritChance","passiveDmgReduce","passiveEnemyAtk",
      "passiveTroopAtk","passiveTroopDef","passiveHealPerRound","passiveGarrisonIgnore"];
    const key = fields.find(f => def[f] !== undefined) ?? null;
    return [k, { key, value: key ? def[key] : null, type: def.type ?? "active" }];
  })
);

// Returns the mechanic key (e.g. "cmdMult", "healPct") that drives a branch's main skill
export function getBranchMechanicKey(cls, branchIndex, cmd) {
  const key = getBranchMainSkill(cls, branchIndex, cmd);
  if (!key) return null;
  const def = ALL_SKILLS[key];
  if (!def) return null;
  const fields = ["cmdMult","cmdPctDmg","healPct","troopAtkMult","troopDefMult","dmgReduce","enemyDmgReduce","enemyAtkReduce","nullifySkill","passiveCmdAtk","passiveCritChance","passiveDmgReduce","passiveTroopAtk","passiveTroopDef","passiveHealPerRound"];
  return fields.find(f => def[f] !== undefined) ?? null;
}

// Returns the mechanic value (at base level) for a branch's main skill
export function getBranchMechanic(cls, branchIndex, cmd) {
  const key = getBranchMechanicKey(cls, branchIndex, cmd);
  if (!key) return null;
  const skillKey = getBranchMainSkill(cls, branchIndex, cmd);
  return ALL_SKILLS[skillKey]?.[key] ?? null;
}
