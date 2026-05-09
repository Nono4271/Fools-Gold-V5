/* ─────────────────────────────────────────────────────────────────────────────
   nightcreatures_skills.js — Night Creatures Faction Skills
   72 total: 60 reskins + 12 unique new skills
   6 commanders × 12 skills each

   Commanders:
     Countess Serava   (veteran,  attacker) [Vampire]  — 10 reskins + 2 unique
     Lord Malachar     (champion, support)  [Vampire]  — 10 reskins + 2 unique
     Fang Groth        (soldier,  attacker) [Werewolf] — 10 reskins + 2 unique
     Alpha Korrax      (champion, leader)   [Werewolf] — 10 reskins + 2 unique
     Skitter Vex       (soldier,  defender) [Spider]   — 10 reskins + 2 unique
     Widow Nyxara      (veteran,  support)  [Spider]   — 10 reskins + 2 unique
───────────────────────────────────────────────────────────────────────────── */

// ── COUNTESS SERAVA (veteran, attacker, Vampire) ──────────────────────────────

// ★ 2 Unique New Skills

export const SERAVA_UNIQUE_SKILLS = {
  serava_crimson_embrace: {
    name:"Serava's Crimson Embrace", icon:"🦇", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"The Countess strikes deep and drinks — her wounds close as her enemy's open.",
    cmdMult:2.6, lifesteal:0.45, base:2.6, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.6+lvl*0.20).toFixed(2)} dmg + heal ${Math.round((0.45)*100)}% of cmd dmg — rounds 2,6,10`,
  },
  bloodlust_ascendant: {
    name:"Bloodlust Ascendant", icon:"🩸", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"Ancient hunger sharpens with each battle. She grows stronger the longer the fight lasts.",
    passiveCmdAtk:0.10, passiveCritChance:0.08, base:0.10, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.10+lvl*0.05)*100)}% cmd ATK & +${Math.round((0.08)*100)}% crit (permanent)`,
  },
};

// 10 Reskins — same mechanics as base attacker skills

export const SERAVA_RESKIN_SKILLS = {
  serava_killing_instinct: {
    name:"Serava's Killing Instinct", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"Centuries of predation have honed her instincts to lethal perfection.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% cmd ATK (permanent)`,
  },
  vampire_quick_strike: {
    name:"Vampire's Quick Strike", icon:"⚡", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"She moves between heartbeats — faster than any mortal eye can follow.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Cmd ×${(1.4+lvl*0.15).toFixed(2)} dmg — rounds 1,3,5,7,9`,
  },
  night_savage_blow: {
    name:"Night's Savage Blow", icon:"🗡", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"A brutally elegant strike — regal form hiding vicious intent.",
    cmdMult:2.2, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.2+lvl*0.20).toFixed(2)} dmg — rounds 3,6,9`,
  },
  serava_execute: {
    name:"Serava's Execute", icon:"💀", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"She opens with absolute violence. The second strike is a courtesy.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Cmd ×${(3.0+lvl*0.25).toFixed(2)} dmg — rounds 1,6`,
  },
  serava_double_strike: {
    name:"Serava's Double Strike", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Two strikes, one breath. The Countess does not believe in mercy.",
    cmdHits:2, cmdMult:1.2, base:1.2, perLevel:0.10,
    nextDesc:(lvl)=>`2 hits ×${(1.2+lvl*0.10).toFixed(2)} — rounds 2,6,10`,
  },
  serava_predator_eyes: {
    name:"Serava's Predator Eyes", icon:"🦅", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"passive",
    desc:"Those crimson eyes see everything — every weakness, every opening.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% crit chance (permanent)`,
  },
  crimson_frenzy: {
    name:"Crimson Frenzy", icon:"🩸", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"The scent of blood ignites something ancient and unstoppable.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
  serava_killing_edge: {
    name:"Serava's Killing Edge", icon:"🔪", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"She targets the heart of an army — not its soldiers, but its will to survive.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% enemy max HP dmg — rounds 5,10`,
  },
  serava_lifesteal: {
    name:"Serava's Lifesteal", icon:"🧛", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"She takes what she needs. The enemy simply has no say in the matter.",
    cmdMult:1.3, lifesteal:0.25, base:0.25, perLevel:0.05,
    nextDesc:(lvl)=>`Heal ${Math.round((0.25+lvl*0.05)*100)}% of cmd dmg — rounds 1,4,7,10`,
  },
  vampire_flurry: {
    name:"Vampire's Flurry", icon:"🌪", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h43",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"Three strikes from three directions — wings, blade, and pure fury.",
    cmdHits:3, cmdMult:0.9, base:0.9, perLevel:0.08,
    nextDesc:(lvl)=>`3 hits ×${(0.9+lvl*0.08).toFixed(2)} — rounds 4,8`,
  },
};

// ── LORD MALACHAR (champion, support, Vampire) ────────────────────────────────

// ★ 2 Unique New Skills

export const MALACHAR_UNIQUE_SKILLS = {
  malachar_dark_communion: {
    name:"Malachar's Dark Communion", icon:"🩸", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"He shares the vampiric bond — his troops' wounds close as the enemy's strength crumbles.",
    healPct:0.14, enemyAtkReduce:0.18, base:0.14, perLevel:0.03,
    nextDesc:(lvl)=>`Heal ${Math.round((0.14+lvl*0.03)*100)}% + -${Math.round((0.18)*100)}% enemy ATK (2 rnd) — rounds 2,6,10`,
  },
  blood_dominion: {
    name:"Blood Dominion", icon:"🦇", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"Lord Malachar's mere presence suppresses the will to fight. His enemies wither. His allies endure.",
    passiveHealPerRound:0.015, passiveTroopDef:0.05, base:0.015, perLevel:0.005,
    nextDesc:(lvl)=>`Restore ${Math.round((0.015+lvl*0.005)*100)}% lost troops/round & +${Math.round((0.05)*100)}% troop DEF (permanent)`,
  },
};

// 10 Reskins — same mechanics as base support skills

export const MALACHAR_RESKIN_SKILLS = {
  malachar_dark_mending: {
    name:"Malachar's Dark Mending", icon:"💚", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"The vampiric lord channels ancient restorative power through his ranks.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% lost troops/round`,
  },
  night_mending_wave: {
    name:"Night's Mending Wave", icon:"✨", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"A pulse of dark vitality surges through the ranks every other round.",
    healPct:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`Restore ${Math.round((0.06+lvl*0.02)*100)}% lost troops — rounds 2,4,6,8,10`,
  },
  malachar_dark_rally: {
    name:"Malachar's Dark Rally", icon:"🚩", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"His command raises fallen soldiers with vampiric urgency.",
    healPct:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Restore ${Math.round((0.18+lvl*0.04)*100)}% lost troops — rounds 1,6`,
  },
  vampire_lord_hymn: {
    name:"Vampire Lord's Dirge", icon:"🎵", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"A haunting melody that fills allies with dark courage.",
    troopAtkMult:1.18, base:1.18, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.18+lvl*0.06).toFixed(2)} ATK (2 rnd) — rounds 3,6,9`,
  },
  malachar_noble_presence: {
    name:"Malachar's Noble Presence", icon:"⭐", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"His ancient lordly bearing permanently sharpens those who serve beneath him.",
    passiveTroopAtk:0.06, base:0.06, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.03)*100)}% troop ATK (permanent)`,
  },
  malachar_hex_curse: {
    name:"Malachar's Hex Curse", icon:"🔮", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"A lord's curse clouds enemy minds — their blows land wide and slow.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  vampire_blind_strike: {
    name:"Vampire's Blind Strike", icon:"👁", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"His mesmerizing gaze disorients the enemy, sapping their aggression.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  malachar_thrall_ward: {
    name:"Malachar's Thrall Ward", icon:"🌿", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"passive",
    desc:"He binds his soldiers to him — they endure wounds that would break others.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.03)*100)}% troop DEF (permanent)`,
  },
  sanguine_shield: {
    name:"Sanguine Shield", icon:"🔆", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"A rippling barrier of condensed blood-magic absorbs incoming harm.",
    troopDefMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
  malachar_supply_cut: {
    name:"Malachar's Supply Cut", icon:"✂", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h44",
    type:"active", cooldown:5, offset:3, duration:1,
    desc:"He cuts the enemy's supply lines with aristocratic precision — a war of attrition, his specialty.",
    blockHeal:3, base:3, perLevel:1,
    nextDesc:(lvl)=>`Block enemy heal ${3+lvl} rounds — rounds 3,8`,
  },
};

// ── FANG GROTH (soldier, attacker, Werewolf) ──────────────────────────────────

// ★ 2 Unique New Skills

export const GROTH_UNIQUE_SKILLS = {
  groth_feral_charge: {
    name:"Groth's Feral Charge", icon:"🐺", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"He hits like a boulder wrapped in muscle and rage — and keeps coming.",
    cmdMult:2.0, troopAtkMult:1.20, base:2.0, perLevel:0.15,
    nextDesc:(lvl)=>`Cmd ×${(2.0+lvl*0.15).toFixed(2)} dmg + Troops ×${(1.20).toFixed(2)} ATK — rounds 1,4,7,10`,
  },
  pack_fury: {
    name:"Pack Fury", icon:"🌕", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"Groth fights with the pack — permanently raising both his strike and his troop's ferocity.",
    passiveCmdAtk:0.07, passiveTroopAtk:0.04, base:0.07, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.07+lvl*0.03)*100)}% cmd ATK & +${Math.round((0.04)*100)}% troop ATK (permanent)`,
  },
};

// 10 Reskins — same mechanics as base attacker skills

export const GROTH_RESKIN_SKILLS = {
  groth_killing_instinct: {
    name:"Groth's Killing Instinct", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"Born a predator, sharpened by every kill — his attack grows without limit.",
    passiveCmdAtk:0.08, base:0.08, perLevel:0.06,
    nextDesc:(lvl)=>`+${Math.round((0.08+lvl*0.06)*100)}% cmd ATK (permanent)`,
  },
  wolf_quick_strike: {
    name:"Wolf's Quick Strike", icon:"⚡", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"Four legs are faster than two. He's already there before they see him coming.",
    cmdMult:1.4, base:1.4, perLevel:0.15,
    nextDesc:(lvl)=>`Cmd ×${(1.4+lvl*0.15).toFixed(2)} dmg — rounds 1,3,5,7,9`,
  },
  feral_savage_blow: {
    name:"Feral Savage Blow", icon:"🗡", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"A blow born of wild fury — not technique, but sheer devastating force.",
    cmdMult:2.2, base:2.2, perLevel:0.20,
    nextDesc:(lvl)=>`Cmd ×${(2.2+lvl*0.20).toFixed(2)} dmg — rounds 3,6,9`,
  },
  groth_execute: {
    name:"Groth's Execute", icon:"💀", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"He goes for the throat — every time, without hesitation.",
    cmdMult:3.0, base:3.0, perLevel:0.25,
    nextDesc:(lvl)=>`Cmd ×${(3.0+lvl*0.25).toFixed(2)} dmg — rounds 1,6`,
  },
  groth_double_strike: {
    name:"Groth's Double Strike", icon:"⚔", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:4, offset:2, duration:1,
    desc:"Claws and jaws — both at once. Neither misses.",
    cmdHits:2, cmdMult:1.2, base:1.2, perLevel:0.10,
    nextDesc:(lvl)=>`2 hits ×${(1.2+lvl*0.10).toFixed(2)} — rounds 2,6,10`,
  },
  groth_predator_eyes: {
    name:"Groth's Predator Eyes", icon:"🦅", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"passive",
    desc:"Yellow eyes lock on a target. That target does not get away.",
    passiveCritChance:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% crit chance (permanent)`,
  },
  howling_frenzy: {
    name:"Howling Frenzy", icon:"🩸", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"A howl splits the battlefield — and something animal takes over.",
    critBonus:0.30, cmdMult:1.15, base:0.30, perLevel:0.05,
    nextDesc:(lvl)=>`+${Math.round((0.30+lvl*0.05)*100)}% crit — rounds 2,4,6,8,10`,
  },
  groth_killing_edge: {
    name:"Groth's Killing Edge", icon:"🔪", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"He tears through the heart of an enemy force — not just soldiers, but morale.",
    cmdPctDmg:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`${Math.round((0.06+lvl*0.02)*100)}% enemy max HP dmg — rounds 5,10`,
  },
  groth_lifesteal: {
    name:"Groth's Lifesteal", icon:"🧛", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"He feeds. His pack survives. It's the oldest law there is.",
    cmdMult:1.3, lifesteal:0.25, base:0.25, perLevel:0.05,
    nextDesc:(lvl)=>`Heal ${Math.round((0.25+lvl*0.05)*100)}% of cmd dmg — rounds 1,4,7,10`,
  },
  wolf_flurry: {
    name:"Wolf's Flurry", icon:"🌪", tree:"combat", cls:"attacker",
    faction:"nightcreatures", commander:"h45",
    type:"active", cooldown:4, offset:4, duration:1,
    desc:"He hits so fast the enemy can't track the blows — claws, shoulder, jaw.",
    cmdHits:3, cmdMult:0.9, base:0.9, perLevel:0.08,
    nextDesc:(lvl)=>`3 hits ×${(0.9+lvl*0.08).toFixed(2)} — rounds 4,8`,
  },
};

// ── ALPHA KORRAX (champion, leader, Werewolf) ─────────────────────────────────

// ★ 2 Unique New Skills

export const KORRAX_UNIQUE_SKILLS = {
  korrax_alpha_call: {
    name:"Korrax's Alpha Call", icon:"🌕", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"The Alpha howls. Every creature on the field moves faster, hits harder, fears nothing.",
    troopAtkMult:1.22, enemyAtkReduce:0.14, base:1.22, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.22+lvl*0.06).toFixed(2)} ATK & -${Math.round((0.14)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  moon_tide_charge: {
    name:"Moon-Tide Charge", icon:"🐺", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"Under the full moon the pack becomes a tide — unstoppable, consuming, absolute.",
    troopAtkMult:1.60, garrisonIgnore:0.20, base:1.60, perLevel:0.10,
    nextDesc:(lvl)=>`Troops ×${(1.60+lvl*0.10).toFixed(2)} ATK & ignore ${Math.round((0.20)*100)}% garrison — rounds 5,10`,
  },
};

// 10 Reskins — same mechanics as base leader skills

export const KORRAX_RESKIN_SKILLS = {
  korrax_alpha_aura: {
    name:"Korrax's Alpha Aura", icon:"📡", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"The Alpha doesn't ask for loyalty. He radiates it — permanently sharpening those who run with him.",
    passiveTroopAtk:0.07, base:0.07, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.07+lvl*0.04)*100)}% troop ATK (permanent)`,
  },
  pack_roar: {
    name:"Pack Roar", icon:"📣", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:2, offset:2, duration:2,
    desc:"A pack howl that shakes the ground and ignites every ally's fighting spirit.",
    troopAtkMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} ATK (2 rnd) — rounds 2,4,6,8,10`,
  },
  feral_grand_strategy: {
    name:"Feral Grand Strategy", icon:"🗺", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:4, offset:1, duration:3,
    desc:"The pack doesn't read maps. Korrax just knows where the weak point is.",
    troopAtkMult:1.20, troopDefMult:1.10, base:1.20, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.20+lvl*0.06).toFixed(2)} ATK & ×1.10 DEF (3 rnd) — rounds 1,5,9`,
  },
  korrax_forced_march: {
    name:"Korrax's Forced March", icon:"💨", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:5, offset:5, duration:1,
    desc:"He doesn't march. He runs — and the pack runs with him at devastating speed.",
    troopAtkMult:1.50, base:1.50, perLevel:0.10,
    nextDesc:(lvl)=>`Troops ×${(1.50+lvl*0.10).toFixed(2)} ATK — rounds 5,10`,
  },
  wolf_siege_mastery: {
    name:"Wolf's Siege Mastery", icon:"🪨", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"Walls mean nothing to a pack. Korrax finds the gap every time.",
    passiveGarrisonIgnore:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`Ignore ${Math.round((0.06+lvl*0.04)*100)}% garrison bonus (permanent)`,
  },
  korrax_supply_cut: {
    name:"Korrax's Supply Cut", icon:"✂", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:3, offset:1, duration:1,
    desc:"Disrupts the enemy's reinforcements — cut off the stragglers and the rest collapse.",
    blockHeal:2, base:2, perLevel:1,
    nextDesc:(lvl)=>`Block enemy heal ${2+lvl} rounds — rounds 1,4,7,10`,
  },
  alpha_advance: {
    name:"Alpha Advance", icon:"♟", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"He surges forward with the pack — every step gaining momentum.",
    troopAtkMult:1.12, enemyDmgReduce:0.10, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`Troops ×${(1.12+lvl*0.04).toFixed(2)} + -10% enemy dmg (2 rnd) — rounds 3,7`,
  },
  korrax_war_council: {
    name:"Korrax's War Council", icon:"📜", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:5, offset:2, duration:1,
    desc:"He silences an enemy commander mid-strike and surges his pack forward.",
    nullifySkill:true, troopAtkMult:1.18, base:1.18, perLevel:0.05,
    nextDesc:(lvl)=>`Nullify enemy + Troops ×${(1.18+lvl*0.05).toFixed(2)} ATK — rounds 2,7`,
  },
  night_legion_discipline: {
    name:"Night Legion Discipline", icon:"🪖", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"passive",
    desc:"The pack never breaks. Korrax's authority keeps them fighting through wounds that would end lesser soldiers.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop DEF (permanent)`,
  },
  korrax_shield_order: {
    name:"Korrax's Shield Order", icon:"🛡", tree:"command", cls:"leader",
    faction:"nightcreatures", commander:"h46",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"A bark of command and the pack tightens — protecting their flanks every other round.",
    troopDefMult:1.12, base:1.12, perLevel:0.04,
    nextDesc:(lvl)=>`Troops ×${(1.12+lvl*0.04).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
};

// ── SKITTER VEX (soldier, defender, Spider) ───────────────────────────────────

// ★ 2 Unique New Skills

export const SKITTER_UNIQUE_SKILLS = {
  skitter_web_trap: {
    name:"Skitter's Web Trap", icon:"🕷", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"He strings the battlefield with silken wire — the enemy stumbles in, and finds they cannot leave.",
    dmgReduce:0.12, enemyAtkReduce:0.14, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% dmg & -${Math.round((0.14)*100)}% enemy ATK (2 rnd) — rounds 2,6,10`,
  },
  exoskeleton_stance: {
    name:"Exoskeleton Stance", icon:"🛡", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"Skitter's chitinous shell shrugs off blows that would shatter iron. He doesn't flinch. He doesn't break.",
    passiveTroopDef:0.05, passiveDmgReduce:0.02, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop DEF & -${Math.round((0.02+lvl*0.01)*100)}% dmg (permanent)`,
  },
};

// 10 Reskins — same mechanics as base defender skills

export const SKITTER_RESKIN_SKILLS = {
  skitter_iron_carapace: {
    name:"Skitter's Iron Carapace", icon:"🛡", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"He absorbs what would kill others. The carapace holds.",
    passiveDmgReduce:0.04, base:0.04, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.04+lvl*0.03)*100)}% incoming dmg (permanent)`,
  },
  web_shield_wall: {
    name:"Web Shield Wall", icon:"🏰", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:1, duration:2,
    desc:"Layered webbing absorbs incoming blows every other round — sticky, resilient, suffocating.",
    dmgReduce:0.12, base:0.12, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.04)*100)}% all dmg (2 rnd) — rounds 1,3,5,7,9`,
  },
  spider_bastion: {
    name:"Spider's Bastion", icon:"⛩", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:4, offset:2, duration:3,
    desc:"He anchors his position with webs, making the front line almost impossible to break.",
    troopDmgReduce:0.18, base:0.18, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.18+lvl*0.05)*100)}% troop dmg (3 rnd) — rounds 2,6,10`,
  },
  hold_the_silk_line: {
    name:"Hold the Silk Line", icon:"🚩", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"Orders troops to brace behind silken barricades every other round.",
    troopDmgReduce:0.14, base:0.14, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.14+lvl*0.04)*100)}% troop dmg — rounds 2,4,6,8,10`,
  },
  skitter_venom_rebuke: {
    name:"Skitter's Venom Rebuke", icon:"📣", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"A spray of venom weakens enemy muscle and slows their strikes.",
    enemyAtkReduce:0.15, base:0.15, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.15+lvl*0.04)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  skitter_fortified_web: {
    name:"Skitter's Fortified Web", icon:"🪖", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"passive",
    desc:"Web reinforcement hardens every troop position permanently.",
    passiveTroopDef:0.06, base:0.06, perLevel:0.04,
    nextDesc:(lvl)=>`+${Math.round((0.06+lvl*0.04)*100)}% troop DEF (permanent)`,
  },
  venom_fog: {
    name:"Venom Fog", icon:"🌟", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:4, offset:3, duration:2,
    desc:"A cloud of paralytic mist floods the field — enemies swing blindly.",
    enemyMissChance:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`${Math.round((0.20+lvl*0.05)*100)}% miss (2 rnd) — rounds 3,7`,
  },
  skitter_terror_aura: {
    name:"Skitter's Terror Aura", icon:"👻", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:5, offset:2, duration:3,
    desc:"He skitters forward and the enemy line recoils — something primal takes hold.",
    enemyDmgReduce:0.20, base:0.20, perLevel:0.05,
    nextDesc:(lvl)=>`-${Math.round((0.20+lvl*0.05)*100)}% enemy dmg (3 rnd) — rounds 2,7`,
  },
  silk_counter_intel: {
    name:"Silk Counter-Intel", icon:"🔭", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Vibrations through the web alert Skitter before the enemy moves — he nullifies their skill entirely.",
    nullifySkill:true, base:1, perLevel:0,
    nextDesc:()=>`Nullify enemy skill — rounds 1,6`,
  },
  spider_phantom_step: {
    name:"Spider's Phantom Step", icon:"👤", tree:"defense", cls:"defender",
    faction:"nightcreatures", commander:"h47",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"Eight legs, zero sound — the enemy swings and finds only air.",
    enemyMissChance:0.30, base:0.30, perLevel:0.06,
    nextDesc:(lvl)=>`${Math.round((0.30+lvl*0.06)*100)}% enemy miss — rounds 3,6,9`,
  },
};

// ── WIDOW NYXARA (veteran, support, Spider) ───────────────────────────────────

// ★ 2 Unique New Skills

export const NYXARA_UNIQUE_SKILLS = {
  nyxara_widow_snare: {
    name:"Nyxara's Widow Snare", icon:"🕸", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"She doesn't fight armies. She traps them — binding their strength and sealing their wounds against them.",
    enemyAtkReduce:0.16, blockHeal:3, base:0.16, perLevel:0.04,
    nextDesc:(lvl)=>`-${Math.round((0.16+lvl*0.04)*100)}% enemy ATK & block heal 3 rnd (2 rnd) — rounds 2,6,10`,
  },
  venom_kiss: {
    name:"Venom Kiss", icon:"🕷", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:3, offset:3, duration:1,
    desc:"A touch that heals allies and silences enemies. The widow gives. The widow takes.",
    healPct:0.18, nullifySkill:true, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Heal ${Math.round((0.18+lvl*0.04)*100)}% lost troops & nullify enemy skill — rounds 3,6,9`,
  },
};

// 10 Reskins — same mechanics as base support skills

export const NYXARA_RESKIN_SKILLS = {
  nyxara_silk_mending: {
    name:"Nyxara's Silk Mending", icon:"💚", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"Her threads bind wounds closed as fast as they open.",
    passiveHealPerRound:0.02, base:0.02, perLevel:0.01,
    nextDesc:(lvl)=>`Restore ${Math.round((0.02+lvl*0.01)*100)}% lost troops/round`,
  },
  widow_mending_wave: {
    name:"Widow's Mending Wave", icon:"✨", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:2, duration:1,
    desc:"A pulse of silken restoration flows through the ranks every other round.",
    healPct:0.06, base:0.06, perLevel:0.02,
    nextDesc:(lvl)=>`Restore ${Math.round((0.06+lvl*0.02)*100)}% lost troops — rounds 2,4,6,8,10`,
  },
  nyxara_dark_rally: {
    name:"Nyxara's Dark Rally", icon:"🚩", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:5, offset:1, duration:1,
    desc:"Her whisper cuts through the chaos — fallen soldiers rise, compelled by something ancient.",
    healPct:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`Restore ${Math.round((0.18+lvl*0.04)*100)}% lost troops — rounds 1,6`,
  },
  widow_dirge: {
    name:"Widow's Dirge", icon:"🎵", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:3, offset:3, duration:2,
    desc:"A haunting melody — beautiful and terrible, driving allies forward with desperate strength.",
    troopAtkMult:1.18, base:1.18, perLevel:0.06,
    nextDesc:(lvl)=>`Troops ×${(1.18+lvl*0.06).toFixed(2)} ATK (2 rnd) — rounds 3,6,9`,
  },
  nyxara_weaver_presence: {
    name:"Nyxara's Weaver Presence", icon:"⭐", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"Her presence is quietly terrifying — and quietly inspiring. Troops fight harder because of it.",
    passiveTroopAtk:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop ATK (permanent)`,
  },
  nyxara_venom_curse: {
    name:"Nyxara's Venom Curse", icon:"🔮", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:4, offset:2, duration:2,
    desc:"A neurotoxin curse blurs enemy vision and numbs their striking arm.",
    enemyMissChance:0.18, base:0.18, perLevel:0.04,
    nextDesc:(lvl)=>`${Math.round((0.18+lvl*0.04)*100)}% enemy miss (2 rnd) — rounds 2,6,10`,
  },
  silk_blind_strike: {
    name:"Silk Blind Strike", icon:"👁", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:3, offset:1, duration:2,
    desc:"Web-strands snap across enemy eyes — their strikes lose all precision.",
    enemyAtkReduce:0.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`-${Math.round((0.12+lvl*0.03)*100)}% enemy ATK (2 rnd) — rounds 1,4,7,10`,
  },
  nyxara_guardian_silk: {
    name:"Nyxara's Guardian Silk", icon:"🌿", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"passive",
    desc:"Thin threads of silk weave through her troops' armor — permanently reinforcing their resistance.",
    passiveTroopDef:0.05, base:0.05, perLevel:0.03,
    nextDesc:(lvl)=>`+${Math.round((0.05+lvl*0.03)*100)}% troop DEF (permanent)`,
  },
  web_ember_shield: {
    name:"Web Ember Shield", icon:"🔆", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:2, offset:1, duration:1,
    desc:"A flash of woven silk deflects incoming harm every other round.",
    troopDefMult:1.15, base:1.15, perLevel:0.05,
    nextDesc:(lvl)=>`Troops ×${(1.15+lvl*0.05).toFixed(2)} DEF — rounds 1,3,5,7,9`,
  },
  nyxara_second_wind: {
    name:"Nyxara's Second Wind", icon:"💨", tree:"tactics", cls:"support",
    faction:"nightcreatures", commander:"h48",
    type:"active", cooldown:5, offset:5, duration:2,
    desc:"She threads new life through her soldiers at the last moment — restored and razor-sharp.",
    healPct:0.12, troopAtkMult:1.12, base:0.12, perLevel:0.03,
    nextDesc:(lvl)=>`Heal ${Math.round((0.12+lvl*0.03)*100)}% + ×${(1.12+lvl*0.03).toFixed(2)} ATK — rounds 5,10`,
  },
};

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
  ...NYXARA_UNIQUE_SKILLS,
  ...NYXARA_RESKIN_SKILLS,
};

// ── Branch layout — 4 branches × (1 main + 2 sides) per commander ─────────────

export const NIGHTCREATURES_BRANCH_SKILL_MAP = {
  // Countess Serava (attacker, Vampire)
  h43: [
    { main:"bloodlust_ascendant",    sides:["serava_killing_instinct", "serava_predator_eyes"]  },
    { main:"vampire_quick_strike",   sides:["crimson_frenzy",          "vampire_flurry"]        },
    { main:"serava_crimson_embrace", sides:["night_savage_blow",       "serava_killing_edge"]   },
    { main:"serava_execute",         sides:["serava_double_strike",    "serava_lifesteal"]      },
  ],
  // Lord Malachar (support, Vampire)
  h44: [
    { main:"malachar_dark_communion",sides:["malachar_dark_mending",   "malachar_thrall_ward"]  },
    { main:"blood_dominion",         sides:["vampire_blind_strike",    "sanguine_shield"]       },
    { main:"malachar_dark_rally",    sides:["malachar_supply_cut",     "vampire_lord_hymn"]     },
    { main:"night_mending_wave",     sides:["malachar_noble_presence", "malachar_hex_curse"]    },
  ],
  // Fang Groth (attacker, Werewolf)
  h45: [
    { main:"pack_fury",              sides:["groth_killing_instinct",  "groth_predator_eyes"]   },
    { main:"wolf_quick_strike",      sides:["howling_frenzy",          "wolf_flurry"]           },
    { main:"groth_feral_charge",     sides:["feral_savage_blow",       "groth_killing_edge"]    },
    { main:"groth_execute",          sides:["groth_double_strike",     "groth_lifesteal"]       },
  ],
  // Alpha Korrax (leader, Werewolf)
  h46: [
    { main:"korrax_alpha_call",      sides:["korrax_alpha_aura",       "night_legion_discipline"]},
    { main:"pack_roar",              sides:["alpha_advance",           "korrax_shield_order"]   },
    { main:"feral_grand_strategy",   sides:["korrax_war_council",      "korrax_supply_cut"]     },
    { main:"moon_tide_charge",       sides:["wolf_siege_mastery",      "korrax_forced_march"]   },
  ],
  // Skitter Vex (defender, Spider)
  h47: [
    { main:"skitter_web_trap",       sides:["exoskeleton_stance",      "skitter_iron_carapace"] },
    { main:"web_shield_wall",        sides:["venom_fog",               "hold_the_silk_line"]    },
    { main:"spider_bastion",         sides:["skitter_terror_aura",     "silk_counter_intel"]    },
    { main:"spider_phantom_step",    sides:["skitter_venom_rebuke",    "skitter_fortified_web"] },
  ],
  // Widow Nyxara (support, Spider)
  h48: [
    { main:"nyxara_widow_snare",     sides:["nyxara_silk_mending",     "nyxara_guardian_silk"]  },
    { main:"venom_kiss",             sides:["silk_blind_strike",       "web_ember_shield"]      },
    { main:"nyxara_dark_rally",      sides:["nyxara_second_wind",      "widow_dirge"]           },
    { main:"widow_mending_wave",     sides:["nyxara_weaver_presence",  "nyxara_venom_curse"]    },
  ],
};
