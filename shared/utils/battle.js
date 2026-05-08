import { FACTION_TROOPS, troopSizeModifier, skillProcAtLevel } from “../constants/troops.js”;
import { TERR  } from “../constants/terrain.js”;
import { POWER_DEFS } from “../constants/map.js”;
import { skillFiresOnRound, getActiveSkills, getPassiveBonuses } from “../constants/skills.js”;
import { npcForPowerLevel } from “../constants/heroes.js”;

// ── Resolve troopBranch → { branchDef, tierData } ────────────────────────────
function resolveBranch(troopBranch) {
if (!troopBranch) return null;
const { faction, branch, tier = 0 } = troopBranch;
const f = FACTION_TROOPS[faction];
if (!f) return null;
const b = f.branches.find(b => b.key === branch);
if (!b) return null;
return { branchDef: b, tierData: b.tiers[tier] ?? null };
}

// ── Get troop skills for a given branch/tier including faction passives ────────
function getTierSkillsForBattle(troopBranch) {
if (!troopBranch) return [];
const { faction, branch, tier = 0 } = troopBranch;
const f = FACTION_TROOPS[faction];
if (!f) return [];
const b = f.branches.find(b => b.key === branch);
if (!b) return [];
const skills = [];
if (tier === 0) skills.push(b.skills.a);
else if (tier === 1) skills.push(b.skills.b);
else { skills.push(b.skills.a); skills.push(b.skills.b); }
if (f.factionPassives) skills.push(…f.factionPassives);
return skills;
}

// ── Check if a troop branch has a specific immunity ───────────────────────────
function hasTroopImmunity(troopBranch, immuneType) {
if (!troopBranch) return false;
const { faction, branch, tier = 0 } = troopBranch;
const f = FACTION_TROOPS[faction];
if (!f) return false;
const b = f.branches.find(b => b.key === branch);
if (!b) return false;
const skills = tier === 0 ? [b.skills.a]
: tier === 1 ? [b.skills.b]
: [b.skills.a, b.skills.b];
return skills.some(s => s?.effect?.type === “immunity” && s.effect.immune?.includes(immuneType));
}

// ── Proc troop skills on a given trigger ──────────────────────────────────────
// defTroopBranch: the branch RECEIVING the effect (for immunity checks)
function procTroopSkills(troopSkills, trigger, skillLevels, rs, roundLog, actorLabel, defTroopBranch) {
for (const skill of troopSkills) {
if (!skill || skill.trigger !== trigger || skill.trigger === “passive”) continue;
const lvl  = skillLevels?.[skill.key] ?? 1;
const proc = skillProcAtLevel(skill, lvl);
if (Math.random() >= proc) continue;
const eff = skill.effect;

```
switch (eff.type) {
  case "taunt":
    rs.enemyTargetsTaunted = true;
    break;
  case "stun":
    if (hasTroopImmunity(defTroopBranch, "stun"))
      roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name} — immune!`, dmg:0, isTroopSkill:true });
    else
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.duration || 1);
    break;
  case "confusion":
    if (hasTroopImmunity(defTroopBranch, "confusion"))
      roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name} — immune!`, dmg:0, isTroopSkill:true });
    else
      rs.enemyConfused = Math.max(rs.enemyConfused || 0, eff.duration || 1);
    break;
  case "heal_block":    rs.blockHeal         = Math.max(rs.blockHeal, eff.duration || 1); break;
  case "def_down":      rs.enemyDefDown       = Math.max(rs.enemyDefDown || 0, eff.value || 0.30); break;
  case "dmg_down":      rs.enemyDmgReduce     = Math.min(0.80, (rs.enemyDmgReduce || 0) + (eff.value || 0.30)); break;
  case "dmg_reduce":    rs.dmgReduce          = Math.min(0.85, rs.dmgReduce + (eff.value || 0.15)); break;
  case "double_attack": rs.troopDoubleAtk     = true; break;
  case "bonus_damage":  rs.troopBonusDmgMult  = (rs.troopBonusDmgMult || 0) + (eff.value || 1.0); break;
  case "self_dmg_up":
  case "self_atk_up":
  case "ally_atk_up":   rs.troopAtkMult      *= (1 + (eff.value || 0.20)); break;
  case "ally_def_up":   rs.troopDefMult       *= (1 + (eff.value || 0.20)); break;
  case "atk_stack":     rs.troopAtkMult       *= (1 + (eff.valuePerStack || 0.04)); break;
  case "counter_attack":rs.troopCounterAtk    = true; break;
  case "immunity":      break;
  default: break;
}
roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name}`, dmg:0, isTroopSkill:true });
```

}
}

// ── Dragon early-round damage penalty ────────────────────────────────────────
function dragonEarlyPenalty(troopBranch, round) {
if (!troopBranch) return 1.0;
const f = FACTION_TROOPS[troopBranch.faction];
if (!f?.factionPassives) return 1.0;
return (f.factionPassives.some(p => p.key === “slow_to_rise”) && round <= 2) ? 0.90 : 1.0;
}

// ── Ranged vulnerability vs dragons ──────────────────────────────────────────
function rangedVulnerability(defTroopBranch, atkBranchDef) {
if (!defTroopBranch || !atkBranchDef) return 1.0;
const f = FACTION_TROOPS[defTroopBranch.faction];
if (!f?.factionPassives) return 1.0;
const hasExposed = f.factionPassives.some(p => p.key === “exposed_wings”);
if (!hasExposed) return 1.0;
return (atkBranchDef.role === “ranged” || atkBranchDef.role === “siege_ranged”) ? 1.15 : 1.0;
}

export function garrisonDefCmd(tile) {
const plvl = tile.powerLevel || 1;
const pd   = POWER_DEFS[plvl] || POWER_DEFS[1];
const npc  = npcForPowerLevel(plvl);
return {
lvl:         pd.cmdLvl,
troops:      tile.garrisonTroops || pd.troops,
troopBranch: npc.troopBranch || null,
atk:         npc.atk * pd.cmdLvl,
spd:         npc.spd + pd.cmdLvl * 2,
n:           npc.n,
icon:        npc.icon,
cls:         npc.cls,
faction:     null,
rarity:      “soldier”,
};
}

export function resolvedDefTile(tile) {
if (tile.owner === “ai” && !tile.hasAiCommander)
return { …tile, defCmd: garrisonDefCmd(tile) };
return tile;
}

// ── Hero skill: instant effects ───────────────────────────────────────────────
function applyInstantEffects(skills, round, rs) {
for (const { def, level } of skills) {
if (!skillFiresOnRound(def, round)) continue;
if (def.duration && def.duration > 1) continue;
const lv = level - 1;
const v  = def.base + (def.perLevel ?? 0) * lv;
rs.skillFiredNames.push(def.name);
if (def.nullifySkill)    rs.enemyNullified  = true;
if (def.blockHeal)       rs.blockHeal       = Math.max(rs.blockHeal, Math.round(def.blockHeal + lv * (def.perLevel ?? 0)));
if (def.cmdMult)         rs.cmdMult        *= v;
if (def.cmdHits)         rs.cmdHits         = Math.max(rs.cmdHits, def.cmdHits);
if (def.critBonus)       rs.critChance     += v;
if (def.cmdPctDmg)       rs.cmdPctDmg      += v;
if (def.lifesteal)       rs.lifesteal      += v;
if (def.healPct)         rs.healPct        += v;
if (def.troopAtkMult)    rs.troopAtkMult   *= v;
if (def.troopDefMult)    rs.troopDefMult   *= v;
if (def.dmgReduce)       rs.dmgReduce       = Math.min(0.85, rs.dmgReduce      + v);
if (def.troopDmgReduce)  rs.troopDmgReduce  = Math.min(0.85, rs.troopDmgReduce + v);
if (def.enemyAtkReduce)  rs.enemyAtkReduce  = Math.min(0.80, rs.enemyAtkReduce + v);
if (def.enemyDmgReduce)  rs.enemyDmgReduce  = Math.min(0.80, rs.enemyDmgReduce + v);
if (def.enemyMissChance) rs.enemyMissChance = Math.min(0.80, rs.enemyMissChance+ v);
if (def.garrisonIgnore)  rs.garrisonIgnore += v;
}
}

// ── Hero skill: duration effects ──────────────────────────────────────────────
function applyDurationEffects(skills, round, durationBuffs, rs) {
for (const { key, def, level } of skills) {
if (!skillFiresOnRound(def, round)) continue;
if (!def.duration || def.duration <= 1) continue;
const lv    = level - 1;
const entry = { endsAt: round + def.duration - 1 };
const v     = def.base + (def.perLevel ?? 0) * lv;
if (def.troopAtkMult)    entry.troopAtkMult    = v;
if (def.troopDefMult)    entry.troopDefMult    = v;
if (def.healPct)         entry.healPct         = v;
if (def.dmgReduce)       entry.dmgReduce       = v;
if (def.troopDmgReduce)  entry.troopDmgReduce  = v;
if (def.enemyAtkReduce)  entry.enemyAtkReduce  = v;
if (def.enemyDmgReduce)  entry.enemyDmgReduce  = v;
if (def.enemyMissChance) entry.enemyMissChance = v;
if (def.garrisonIgnore)  entry.garrisonIgnore  = v;
durationBuffs.set(`${key}@${round}`, entry);
rs.skillFiredNames.push(def.name);
}
let durationTroopAtkMult = 1, durationTroopDefMult = 1;
for (const [id, e] of durationBuffs) {
if (e.endsAt < round) { durationBuffs.delete(id); continue; }
if (e.troopAtkMult)    durationTroopAtkMult  = Math.max(durationTroopAtkMult, e.troopAtkMult);
if (e.troopDefMult)    durationTroopDefMult  = Math.max(durationTroopDefMult, e.troopDefMult);
if (e.healPct)         rs.healPct           += e.healPct;
if (e.dmgReduce)       rs.dmgReduce          = Math.min(0.85, rs.dmgReduce      + e.dmgReduce);
if (e.troopDmgReduce)  rs.troopDmgReduce     = Math.min(0.85, rs.troopDmgReduce + e.troopDmgReduce);
if (e.enemyAtkReduce)  rs.enemyAtkReduce     = Math.min(0.80, rs.enemyAtkReduce + e.enemyAtkReduce);
if (e.enemyDmgReduce)  rs.enemyDmgReduce     = Math.min(0.80, rs.enemyDmgReduce + e.enemyDmgReduce);
if (e.enemyMissChance) rs.enemyMissChance    = Math.min(0.80, rs.enemyMissChance+ e.enemyMissChance);
if (e.garrisonIgnore)  rs.garrisonIgnore    += e.garrisonIgnore;
}
if (durationTroopAtkMult > 1) rs.troopAtkMult *= durationTroopAtkMult;
if (durationTroopDefMult > 1) rs.troopDefMult *= durationTroopDefMult;
}

// ── Core troop damage calc ────────────────────────────────────────────────────
// Fix 3: Attacker troop damage scales off totalArmyCommand (total command capacity of the army)
// rather than commander level. NPC/defender troops still use lvlMult for balanced scaling.
// totalArmyCommand = attackerTroops x COMMAND_COST[size]; normalised so 500 cmd = 1.0 baseline.
function calcTroopDmg(branchDef, tierData, troopDef, defMult, count, lvlMult, terrMult, atkMult, ignoreDef, isAtk, extraMult, round, troopBranch, armyAtkMult, armyFocMult, totalArmyCommand) {
if (!tierData) return 0;
const dmgType = branchDef?.dmgType ?? “physical”;
const roll    = tierData.dmgLo + Math.random() * (tierData.dmgHi - tierData.dmgLo);
// Fix 2: resistance divisor = 60 (was 80) so higher DEF troops have a bigger damage gap
const resist  = dmgType === “magical” || ignoreDef
? 1.0
: Math.max(0, 1 - (troopDef * defMult) / ((troopDef * defMult) + 60));
const armyMult   = isAtk ? (dmgType === “magical” ? (armyFocMult||1) : (armyAtkMult||1)) : 1;
const earlyMult  = dragonEarlyPenalty(troopBranch, round);
// Fix 3: attacker uses army command scale; defender/NPC uses lvlMult as before
const scaleMult  = (isAtk && totalArmyCommand != null)
? Math.sqrt(Math.max(1, totalArmyCommand) / 500)
: lvlMult;
const raw        = Math.max(1, Math.ceil(count)) * roll * scaleMult * terrMult * armyMult * (atkMult||1) * earlyMult * (extraMult||1);
return Math.max(1, Math.round(raw * resist));
}

// ── Main simulation ───────────────────────────────────────────────────────────
export function simBattle(cmd, attackerTroops, defTile, wallLvl) {
const terrDef = TERR[defTile.terrain]?.def || 0;
const fort    = defTile.isHQ ? (wallLvl || 0) * 10 : 0;
const dc      = defTile.defCmd;

const atkRes = resolveBranch(cmd.troopBranch);
const atkBranchDef = atkRes?.branchDef ?? null;
const atkTierData  = atkRes?.tierData   ?? null;

const defRes = resolveBranch(dc?.troopBranch ?? null);
const defBranchDef = defRes?.branchDef ?? null;
const defTierData  = defRes?.tierData   ?? null;

const atkSize  = atkBranchDef?.size ?? null;
const defSize  = defBranchDef?.size ?? null;
const mod      = troopSizeModifier(atkSize, defSize);
const defMod   = troopSizeModifier(defSize, atkSize);
const modLabel = mod === 1.1 ? “⚔ STRONG” : mod === 0.9 ? “🛡 WEAK” : “◆ NEUTRAL”;

const atkTroopSkills = getTierSkillsForBattle(cmd.troopBranch);
const defTroopSkills = getTierSkillsForBattle(dc?.troopBranch ?? null);
const atkSkillLevels = cmd.troopSkillLevels || {};
const defSkillLevels = dc?.troopSkillLevels || {};

const gb          = cmd.gearBonuses || {};
const armyAtkMult = 1 + (gb.armyAtk || 0) / 100;
const armyFocMult = 1 + (gb.armyFoc || 0) / 100;

const passives      = getPassiveBonuses(cmd);
const atkHeroSkills = getActiveSkills(cmd);
const durationBuffs = new Map();

const atkLvl    = cmd.lvl || 5;
const defLvl    = dc ? dc.lvl  : 2;
const defTroops = dc ? dc.troops : (defTile.garrison || defTile.garrisonTroops || 30);
const defCmdSpd = dc ? (dc.spd || 40) : 40;

const defTerrBonusBase = 1 + fort / 100;

const atkTroopHpPer = atkTierData?.hp  ?? 25;
const defTroopHpPer = defTierData?.hp  ?? 25;
const atkTroopSpd   = atkTierData?.spd ?? 50;
const defTroopSpd   = defTierData?.spd ?? 50;
const atkTroopDef   = atkTierData?.def ?? 20;
const defTroopDef   = defTierData?.def ?? 20;

// Fix 3: Total army command = troops x command cost per troop size. Baseline 500 = scale 1.0.
// Small troops cost 1 cmd, medium cost 2, large cost 25 (from COMMAND_COST in troops.js).
const atkTroopSize      = atkBranchDef?.size ?? “small”;
const atkCmdCost        = atkTroopSize === “large” ? 25 : atkTroopSize === “medium” ? 2 : 1;
const totalArmyCommand  = attackerTroops * atkCmdCost;

// Scale commander damage so it contributes ~65% of total output vs troops’ ~35%.
// Derived from: cmdDmg = (65/35) × troopDmg, where troopDmg ≈ troops × avgTierDmg/round.
const avgAtkTroopDmg  = atkTierData ? (atkTierData.dmgLo + atkTierData.dmgHi) / 2 : 50;
const troopDmgEstimate = attackerTroops * avgAtkTroopDmg;
// Fix 1: Commander damage uses both atk and foc — physical dmg scales off atk, magical/focus off foc.
// Scale factor is derived from the combined stat so both matter regardless of dmgType.
const cmdAtkStat      = cmd.atk || 150;
const cmdFocStat      = cmd.foc || 0;
const combinedCmdStat = cmdAtkStat + cmdFocStat * 0.5; // foc is secondary unless troop does focus dmg
const CMD_ATK_SCALE   = Math.max(8, troopDmgEstimate * (65 / 35) / Math.max(combinedCmdStat, 1));
const atkCmdAtkBase   = cmdAtkStat * CMD_ATK_SCALE * passives.cmdAtkMult;
const atkCmdFocBase   = cmdFocStat * CMD_ATK_SCALE * passives.cmdAtkMult;
const atkCmdAtk       = atkCmdAtkBase; // used for physical-type troop commanders
const atkCmdFoc       = atkCmdFocBase; // used for focus/magical-type troop commanders
const atkCmdSpd     = cmd.spd || 60;
const defCmdAtkStat   = dc ? (dc.atk || 80) : 80;
const defCmdFocStat   = dc ? (dc.foc || 0) : 0;
const defCmdAtk     = (defCmdAtkStat + defCmdFocStat * 0.5) * CMD_ATK_SCALE;

const bastionActive = (cmd.cls === “defender”) && ((cmd.lvl ?? 5) >= 25);
const bastionHpMult = bastionActive ? 2 : 1;

let atkTroopHp     = attackerTroops * atkTroopHpPer * bastionHpMult;
let defTroopHp     = defTroops      * defTroopHpPer;
const atkHpMax     = atkTroopHp;
let totalAtkLostHp = 0;
let blockHealRounds= 0;

const atkLvlMult = Math.pow(1.20, atkLvl - 5);
const defLvlMult = Math.pow(1.20, Math.max(0, defLvl - 2));

const report = {
atkName:cmd.n, atkIcon:cmd.icon||“⚔”, atkLvl,
atkTroopBranch: cmd.troopBranch || null,
atkTroopsStart:attackerTroops, defTroopsStart:defTroops, defLvl,
defCmdName: dc?.n ?? `Garrison Lv${defLvl}`, defCmdIcon: dc?.icon ?? “🛡”,
defCmdStats: dc ? { atk:dc.atk||0, foc:dc.foc||0, spd:dc.spd||0, gearArmyAtk:0, gearArmyFoc:0, gearArmySpd:0, gearArmySiege:0 } : null,
defCmdCls: dc?.cls ?? null,
terrain:defTile.terrain, modLabel,
defPowerLevel:defTile.powerLevel || 1,
defTroopBranch: dc?.troopBranch || null,
rounds:[], atkTroopsEnd:attackerTroops, defTroopsEnd:defTroops, won:false, xpGain:0,
bastionActive,
atkTroopsWounded: 0,
atkCmdStats: { atk:cmd.atk||150, foc:cmd.foc||0, spd:cmd.spd||60, gearArmyAtk:gb.armyAtk||0, gearArmyFoc:gb.armyFoc||0, gearArmySpd:gb.armySpd||0, gearArmySiege:gb.armySiege||0 },
cmdCls: cmd.cls||null, cmdFaction: cmd.faction||null, cmdSubspecies: cmd.subspecies||null,
};

// ── Phase 0: pre-battle log ───────────────────────────────────────────────
const phase0 = { round:0, isPreBattle:true, actions:[] };
phase0.actions.push({ actor:“SYSTEM”, action:`⚔ Battle begins — ${defTile.terrain}${defTile.isHQ?" (HQ)":""} · ${modLabel}`, dmg:0, isPhase0:true });
phase0.actions.push({ actor:“SYSTEM”, action:`${cmd.n} (${attackerTroops.toLocaleString()} troops) vs ${report.defCmdName} (${defTroops.toLocaleString()} troops)`, dmg:0, isPhase0:true });

atkTroopSkills.filter(s => s?.trigger === “passive”).forEach(s => {
phase0.actions.push({ actor:“Troops”, action:`${s.icon} ${s.name} (passive): ${s.desc}`, dmg:0, isSkill:true, isPhase0:true });
});

for (const { def, level } of getActiveSkills(cmd)) {
if (def.type !== “passive”) continue;
const lv = level - 1; const v = def.base + (def.perLevel ?? 0) * lv;
let et = “”;
if (def.passiveCmdAtk)          et = `+${Math.round(v*100)}% Commander ATK`;
else if (def.passiveCritChance)  et = `+${Math.round(v*100)}% Critical Hit Chance`;
else if (def.passiveDmgReduce)   et = `-${Math.round(v*100)}% Incoming Damage`;
else if (def.passiveEnemyAtk)    et = `-${Math.round(v*100)}% Enemy ATK`;
else if (def.passiveTroopAtk)    et = `+${Math.round(v*100)}% Troop ATK`;
else if (def.passiveTroopDef)    et = `+${Math.round(v*100)}% Troop DEF`;
else if (def.passiveHealPerRound) et = `+${Math.round(v*100)}% Troops Restored/Round`;
else if (def.passiveGarrisonIgnore) et = `Ignore ${Math.round(v*100)}% Garrison Bonus`;
if (et) phase0.actions.push({ actor:cmd.n, action:`${cmd.n} — ${def.icon??"✦"} ${def.name}: ${et}`, dmg:0, isSkill:true, isPhase0:true });
}

if (bastionActive) phase0.actions.push({ actor:cmd.n, action:`Passive: 🛡 Bastion — double HP & DEF (rounds 1-2)`, dmg:0, isSkill:true, isPhase0:true });

const gb2 = cmd.gearBonuses || {};
if (gb2.armyAtk  > 0) phase0.actions.push({ actor:“Gear”, action:`Gear: +${gb2.armyAtk}% Army ATK`,       dmg:0, isPhase0:true, isGear:true });
if (gb2.armyFoc  > 0) phase0.actions.push({ actor:“Gear”, action:`Gear: +${gb2.armyFoc}% Army Focus DMG`, dmg:0, isPhase0:true, isGear:true });
if (gb2.armySpd  > 0) phase0.actions.push({ actor:“Gear”, action:`Gear: +${gb2.armySpd} Army SPD`,        dmg:0, isPhase0:true, isGear:true });
if (gb2.armySiege> 0) phase0.actions.push({ actor:“Gear”, action:`Gear: +${gb2.armySiege} Siege Power`,   dmg:0, isPhase0:true, isGear:true });
report.rounds.push(phase0);

// ── Combat rounds ─────────────────────────────────────────────────────────
for (let round = 1; round <= 10; round++) {
const roundLog = { round, actions:[] };
if (atkTroopHp <= 0 && defTroopHp <= 0) break;
if (atkTroopHp <= 0) { roundLog.actions.push({ actor:“SYSTEM”, action:“Attackers routed!”, dmg:0 }); report.rounds.push(roundLog); break; }
if (defTroopHp <= 0) { roundLog.actions.push({ actor:“SYSTEM”, action:“Defenders defeated!”, dmg:0 }); report.rounds.push(roundLog); break; }

```
if (bastionActive && round === 1) roundLog.actions.push({ actor:cmd.n, action:"🛡 BASTION — double HP & DEF (rounds 1-2)", dmg:0, isSkill:true });
const bastionDefMult = (bastionActive && round <= 2) ? 2 : 1;

// Build round state
const rs = {
  cmdMult:1, cmdHits:1, critChance:passives.critChance,
  cmdPctDmg:0, lifesteal:0, healPct:passives.healPerRound,
  blockHeal:0, enemyNullified:false,
  troopAtkMult:passives.troopAtkMult, troopDefMult:passives.troopDefMult,
  dmgReduce:passives.dmgReduce, troopDmgReduce:0,
  enemyAtkReduce:passives.enemyAtkReduce, enemyDmgReduce:0, enemyMissChance:0,
  garrisonIgnore:passives.garrisonIgnore,
  skillFiredNames:[],
  // Troop skill state
  troopDoubleAtk:false, troopBonusDmgMult:0, troopCounterAtk:false,
  enemyStunned:0, enemyConfused:0, enemyDefDown:0, enemyTargetsTaunted:false,
};

applyDurationEffects(atkHeroSkills, round, durationBuffs, rs);
applyInstantEffects(atkHeroSkills, round, rs);

// round_start troop skills — attacker applies to enemy, pass defTroopBranch for immunity
procTroopSkills(atkTroopSkills, "round_start", atkSkillLevels, rs, roundLog, "Troops", dc?.troopBranch ?? null);

// Log hero skills
const uniqNames = [...new Set(rs.skillFiredNames)];
uniqNames.forEach(name => {
  const fs  = atkHeroSkills.find(s => s.def?.name === name);
  const def = fs?.def;
  const lv  = (fs?.level ?? 1) - 1;
  const v   = def ? (def.base + (def.perLevel ?? 0) * lv) : 0;
  const dur = def?.duration ?? 1;
  const se  = {};
  if (def) {
    if (def.troopAtkMult)         { se.type="buff";   se.stat="Troop ATK";          se.value=`×${v.toFixed(2)}`; se.pct=Math.round((v-1)*100); se.dur=dur; }
    else if (def.troopDefMult)    { se.type="buff";   se.stat="Troop DEF";          se.value=`×${v.toFixed(2)}`; se.pct=Math.round((v-1)*100); se.dur=dur; }
    else if (def.dmgReduce)       { se.type="buff";   se.stat="Incoming Damage";    se.value=`-${Math.round(v*100)}%`; se.dur=dur; }
    else if (def.troopDmgReduce)  { se.type="buff";   se.stat="Troop Damage Taken"; se.value=`-${Math.round(v*100)}%`; se.dur=dur; }
    else if (def.enemyAtkReduce)  { se.type="debuff"; se.stat="Enemy ATK";          se.value=`-${Math.round(v*100)}%`; se.dur=dur; }
    else if (def.enemyDmgReduce)  { se.type="debuff"; se.stat="Enemy Damage";       se.value=`-${Math.round(v*100)}%`; se.dur=dur; }
    else if (def.enemyMissChance) { se.type="debuff"; se.stat="Enemy Hit Chance";   se.value=`-${Math.round(v*100)}%`; se.dur=dur; }
    else if (def.blockHeal)       { se.type="debuff"; se.stat="enemy healing";      se.value="blocked"; se.rounds=Math.round(v); se.dur=1; }
    else if (def.nullifySkill)    { se.type="nullify"; se.dur=1; }
    else if (def.garrisonIgnore)  { se.type="buff";   se.stat="Garrison Bonus";     se.value=`ignored ${Math.round(v*100)}%`; se.dur=dur; }
    else if (def.healPct)         { se.type="heal";   se.pct=Math.round(v*100); se.dur=dur; }
    else if (def.cmdMult || def.cmdHits || def.critBonus) {
      se.type="damageBuff";
      if (def.cmdMult)   se.cmdMult  = v.toFixed(2);
      if (def.cmdHits)   se.cmdHits  = def.cmdHits;
      if (def.critBonus) se.critBonus= Math.round(v*100);
    }
  }
  roundLog.actions.push({ actor:cmd.n, action:name, skillIcon:def?.icon??"✨", dmg:0, isSkill:true, skillEffect:se });
});

if (rs.blockHeal > 0) blockHealRounds = Math.max(blockHealRounds, rs.blockHeal);
const healBlocked = blockHealRounds > 0;
if (blockHealRounds > 0) blockHealRounds--;

const gi = Math.min(0.90, rs.garrisonIgnore);
const roundTerrBonus = 1 + fort*(1-gi) / 100;

// Heal
if (rs.healPct > 0 && totalAtkLostHp > 0 && !healBlocked) {
  const restored   = Math.min(totalAtkLostHp, Math.round(totalAtkLostHp * rs.healPct));
  atkTroopHp       = Math.min(atkHpMax, atkTroopHp + restored);
  totalAtkLostHp   = Math.max(0, totalAtkLostHp - restored);
  const troopsBack = Math.round(restored / atkTroopHpPer);
  if (troopsBack > 0) roundLog.actions.push({ actor:cmd.n, action:`💚 ${troopsBack} troops restored`, dmg:-troopsBack, isSkill:true, isHeal:true, troopsBack, atkRemaining:Math.round(atkTroopHp/atkTroopHpPer) });
}

// % HP nuke
if (rs.cmdPctDmg > 0 && defTroopHp > 0) {
  const isCrit = Math.random() < rs.critChance;
  const dmg    = Math.max(1, Math.round(defTroops * defTroopHpPer * rs.cmdPctDmg * (isCrit?1.5:1.0)));
  defTroopHp   = Math.max(0, defTroopHp - dmg);
  roundLog.actions.push({ actor:cmd.n, action:`💀 % HP strike${isCrit?" (CRIT!)":""}`, dmg, isPlayer:true, isSkill:true });
}

const order = [
  { id:"atkCmd",   spd:atkCmdSpd,   side:"atk" },
  { id:"atkTroop", spd:atkTroopSpd, side:"atk" },
  { id:"defCmd",   spd:defCmdSpd,   side:"def" },
  { id:"defTroop", spd:defTroopSpd, side:"def" },
].sort((a,b) => b.spd - a.spd || (a.side==="atk" ? -1 : 1));

for (const ent of order) {
  if (atkTroopHp <= 0 || defTroopHp <= 0) break;

  // ── Attacker commander ────────────────────────────────────────────────
  if (ent.id === "atkCmd") {
    if (defTroopHp <= 0) continue;
    for (let h = 0; h < rs.cmdHits; h++) {
      const isCrit       = Math.random() < rs.critChance;
      // Focus commanders (magical dmgType troops) bypass physical defense and use foc stat
      const troopDmgType = atkBranchDef?.dmgType ?? "physical";
      const usesFoc      = troopDmgType === "magical" || (cmdFocStat > cmdAtkStat);
      const effectiveDef = defTroopDef * (1 - (rs.enemyDefDown || 0));
      const red          = usesFoc ? 1.0 : Math.max(0, 1 - effectiveDef/(effectiveDef+60));
      const cmdDmgBase   = usesFoc ? atkCmdFoc : atkCmdAtk;
      const raw          = cmdDmgBase * rs.cmdMult * (isCrit?1.5:1.0) * (0.85+Math.random()*0.30) * (usesFoc ? armyFocMult : armyAtkMult);
      const dmg          = Math.max(1, Math.round(raw * red));
      const prevDef      = defTroopHp;
      if (rs.lifesteal > 0 && !healBlocked) {
        const gain = Math.round(dmg * rs.lifesteal);
        atkTroopHp     = Math.min(atkHpMax, atkTroopHp + gain);
        totalAtkLostHp = Math.max(0, totalAtkLostHp - gain);
        const t = Math.round(gain / atkTroopHpPer);
        if (t > 0) roundLog.actions.push({ actor:cmd.n, action:`🧛 Lifesteal +${t} troops`, dmg:-t, isSkill:true, isHeal:true });
      }
      defTroopHp = Math.max(0, defTroopHp - dmg);
      roundLog.actions.push({ actor:cmd.n, action:`${cmd.n} strikes${isCrit?" (CRIT!)":""}`, dmg, defKilled:Math.max(0,Math.round((prevDef-defTroopHp)/defTroopHpPer)), defRemaining:Math.max(0,Math.round(defTroopHp/defTroopHpPer)), isPlayer:true });
    }

  // ── Attacker troops ───────────────────────────────────────────────────
  } else if (ent.id === "atkTroop") {
    if (!atkTierData || atkTroopHp <= 0 || defTroopHp <= 0) continue;

    // on_hit troop skills — targeting enemy so pass defTroopBranch for immunity
    procTroopSkills(atkTroopSkills, "on_hit", atkSkillLevels, rs, roundLog, "Troops", dc?.troopBranch ?? null);

    const count    = Math.ceil(atkTroopHp / atkTroopHpPer);
    const vulnMult = rangedVulnerability(dc?.troopBranch ?? null, atkBranchDef);
    const defDown  = 1 - (rs.enemyDefDown || 0);
    const hits     = rs.troopDoubleAtk ? 2 : 1;

    for (let hi = 0; hi < hits; hi++) {
      if (defTroopHp <= 0) break;
      let dmg = calcTroopDmg(atkBranchDef, atkTierData, defTroopDef, defDown, count, atkLvlMult, 1, rs.troopAtkMult, false, true, vulnMult * mod, round, cmd.troopBranch, armyAtkMult, armyFocMult, totalArmyCommand);
      if (rs.troopBonusDmgMult > 0) {
        const bonus = Math.round(dmg * rs.troopBonusDmgMult);
        dmg += bonus;
        roundLog.actions.push({ actor:"Troops", action:`💥 Bonus strike +${bonus} dmg`, dmg:bonus, isPlayer:true, isTroopSkill:true });
      }
      const prevDef = defTroopHp;
      defTroopHp = Math.max(0, defTroopHp - dmg);
      roundLog.actions.push({ actor:"Troops", action:`${atkBranchDef?.label||"Troops"} attack${hits>1?` (hit ${hi+1}/2)`:""}`, dmg, defKilled:Math.max(0,Math.round((prevDef-defTroopHp)/defTroopHpPer)), defRemaining:Math.max(0,Math.round(defTroopHp/defTroopHpPer)), isPlayer:true });
    }

    // Counter attack
    if (rs.troopCounterAtk && defTroopHp > 0) {
      const cCount = Math.ceil(defTroopHp / defTroopHpPer);
      const cDmg   = calcTroopDmg(defBranchDef, defTierData, atkTroopDef, bastionDefMult * rs.troopDefMult, cCount, defLvlMult, roundTerrBonus, 1, false, false, defMod, round, dc?.troopBranch, 1, 1);
      const cFinal = Math.max(1, Math.round(cDmg * 0.50 * (1 - rs.enemyDmgReduce) * (1 - rs.dmgReduce)));
      const prevAtk= atkTroopHp;
      atkTroopHp   = Math.max(0, atkTroopHp - cFinal);
      totalAtkLostHp += (prevAtk - atkTroopHp);
      roundLog.actions.push({ actor:"Defenders", action:`⚡ Counter attack!`, dmg:cFinal, isPlayer:false, isTroopSkill:true });
    }

  // ── Defender commander ────────────────────────────────────────────────
  } else if (ent.id === "defCmd") {
    if (rs.enemyNullified || atkTroopHp <= 0) continue;
    if (rs.enemyStunned > 0) {
      rs.enemyStunned--;
      roundLog.actions.push({ actor:"Enemy Cmd", action:"⚡ Enemy commander is stunned!", dmg:0 });
      continue;
    }
    if (rs.enemyConfused > 0) {
      rs.enemyConfused--;
      if (Math.random() < 0.5) {
        // Confused — attacks own troops
        const atkRes2  = defTroopDef * bastionDefMult;
        const red2     = Math.max(0, 1 - atkRes2/(atkRes2+60));
        const raw2     = defCmdAtk * (0.85+Math.random()*0.30) * 0.8;
        const selfDmg  = Math.max(1, Math.round(raw2 * red2));
        const prevDef  = defTroopHp;
        defTroopHp     = Math.max(0, defTroopHp - selfDmg);
        const killed   = Math.max(0, Math.round((prevDef - defTroopHp) / defTroopHpPer));
        roundLog.actions.push({ actor:"Enemy Cmd", action:`😵 Confused! Attacks own troops — ${killed} friendly casualties`, dmg:selfDmg, isPlayer:false, isConfused:true });
        continue;
      }
      // 50% chance they act normally despite confusion
    }
    if (rs.enemyTargetsTaunted) {
      // Taunted — attacks taunting unit, which means they still hit attacker troops (no redirect needed at the top level, but log it)
      roundLog.actions.push({ actor:"Enemy Cmd", action:"🎯 Taunted — forced to attack!", dmg:0 });
    }
    if (Math.random() < rs.enemyMissChance) { roundLog.actions.push({ actor:"Enemy Cmd", action:"Enemy commander missed!", dmg:0 }); continue; }
    const atkRes3  = atkTroopDef * bastionDefMult * rs.troopDefMult;
    const red3     = Math.max(0, 1 - atkRes3/(atkRes3+60));
    const eMod     = (1 - rs.enemyAtkReduce) * (1 - rs.enemyDmgReduce) * (1 - rs.dmgReduce);
    const raw3     = defCmdAtk * roundTerrBonus * (0.85+Math.random()*0.30) * eMod * defMod;
    const dmg      = Math.max(1, Math.round(raw3 * red3));
    const prevAtk  = atkTroopHp;
    atkTroopHp     = Math.max(0, atkTroopHp - dmg);
    totalAtkLostHp += (prevAtk - atkTroopHp);
    roundLog.actions.push({ actor:"Enemy Cmd", action:`${report.defCmdIcon} Enemy commander strikes`, dmg, atkKilled:Math.max(0,Math.round((prevAtk-atkTroopHp)/atkTroopHpPer)), atkRemaining:Math.max(0,Math.round(atkTroopHp/atkTroopHpPer)), isPlayer:false });

  // ── Defender troops ───────────────────────────────────────────────────
  } else if (ent.id === "defTroop") {
    if (rs.enemyNullified || !defTierData || defTroopHp <= 0 || atkTroopHp <= 0) continue;
    if (rs.enemyStunned > 0) continue; // already decremented above
    if (rs.enemyConfused > 0) {
      rs.enemyConfused--;
      if (Math.random() < 0.5) {
        // Confused troops attack own side
        const selfDmg = calcTroopDmg(defBranchDef, defTierData, defTroopDef, 1, Math.ceil(defTroopHp/defTroopHpPer), defLvlMult, 1, 1, false, false, 1, round, dc?.troopBranch, 1, 1);
        const prevDef = defTroopHp;
        defTroopHp    = Math.max(0, defTroopHp - selfDmg);
        const killed  = Math.max(0, Math.round((prevDef - defTroopHp) / defTroopHpPer));
        roundLog.actions.push({ actor:"Defenders", action:`😵 Confused! ${defBranchDef?.label||"Defenders"} attack own ranks — ${killed} casualties`, dmg:selfDmg, isPlayer:false, isConfused:true });
        continue;
      }
    }
    if (Math.random() < rs.enemyMissChance) { roundLog.actions.push({ actor:"Defenders", action:"Enemy troops missed!", dmg:0 }); continue; }

    // on_hit troop skills — defenders targeting attacker, pass atkTroopBranch for immunity
    procTroopSkills(defTroopSkills, "on_hit", defSkillLevels, rs, roundLog, "Defenders", cmd.troopBranch ?? null);

    const eMod     = (1 - rs.enemyDmgReduce) * (1 - rs.troopDmgReduce) * (1 - rs.dmgReduce);
    const count    = Math.ceil(defTroopHp / defTroopHpPer);
    const vulnMult = rangedVulnerability(cmd.troopBranch ?? null, defBranchDef);
    const dmg      = Math.max(1, Math.round(
      calcTroopDmg(defBranchDef, defTierData, atkTroopDef, bastionDefMult * rs.troopDefMult, count, defLvlMult, roundTerrBonus, 1, false, false, vulnMult * defMod, round, dc?.troopBranch, 1, 1) * eMod
    ));
    const prevAtk  = atkTroopHp;
    atkTroopHp     = Math.max(0, atkTroopHp - dmg);
    totalAtkLostHp += (prevAtk - atkTroopHp);

    // on_hit_received — attacker's troops react to being hit
    procTroopSkills(atkTroopSkills, "on_hit_received", atkSkillLevels, rs, roundLog, "Troops", dc?.troopBranch ?? null);

    roundLog.actions.push({ actor:"Defenders", action:`${defBranchDef?.label||"Defenders"} attack`, dmg, atkKilled:Math.max(0,Math.round((prevAtk-atkTroopHp)/atkTroopHpPer)), atkRemaining:Math.max(0,Math.round(atkTroopHp/atkTroopHpPer)), isPlayer:false });
  }
}

// round_end troop skills
procTroopSkills(atkTroopSkills, "round_end", atkSkillLevels, rs, roundLog, "Troops", dc?.troopBranch ?? null);
procTroopSkills(defTroopSkills, "round_end", defSkillLevels, rs, roundLog, "Defenders", cmd.troopBranch ?? null);
report.rounds.push(roundLog);
```

}

const won      = defTroopHp <= 0 && atkTroopHp > 0;
const isDraw   = atkTroopHp > 0  && defTroopHp > 0;
const defTroopsLeft   = Math.max(0, Math.round(defTroopHp / defTroopHpPer));
const atkLostHpActual = atkHpMax - Math.max(0, atkTroopHp);
const troopHpDiv      = atkTroopHpPer * bastionHpMult;
const lostFromHp      = Math.round(atkLostHpActual / troopHpDiv);
const finalAtkLost    = won
? Math.min(attackerTroops - 1, Math.max(1, lostFromHp))
: Math.min(attackerTroops, Math.max(0, lostFromHp));

const fullXp = POWER_DEFS[defTile.powerLevel || 1]?.xpReward || 30;
const defKilledFraction = Math.max(0, Math.min(1, (defTroops - defTroopsLeft) / Math.max(1, defTroops)));
const xpGain = won ? fullXp : isDraw ? Math.max(1, Math.round(fullXp * defKilledFraction)) : 0;
// Fix 4: Win-chance % now uses the same stats that actually drive combat:
//   - Attacker: total army command capacity (not raw troop count) + level as a multiplier
//   - Defender: raw troops + level + terrain bonus
//   - Sigmoid sharpness = 2.5 (was 3.5) so a 3-level / 3x troop advantage actually shows >90%
//   - Commander atk/foc contribution folded in so stat-heavy commanders show correctly
const cmdStatBonus  = 1 + (cmdAtkStat + cmdFocStat) / 2000; // small boost from cmd stats
const atkPow     = totalArmyCommand * Math.pow(1.15, atkLvl - 1) * mod * cmdStatBonus;
const defPow     = defTroops        * Math.pow(1.15, Math.max(0, defLvl - 1)) * defTerrBonusBase;
const powerRatio = atkPow / Math.max(1, defPow);
const pct        = Math.round(Math.min(99, Math.max(1, 100 / (1 + Math.pow(Math.max(0.00001, 1/powerRatio), 2.5)))));

report.won           = won;
report.isDraw        = isDraw;
report.atkTroopsEnd  = Math.max(0, attackerTroops - finalAtkLost);
report.defTroopsEnd  = defTroopsLeft;
report.xpGain        = xpGain;
report.pct           = pct;
report.atkTroopsWounded = Math.floor(finalAtkLost * 0.30);

return { won, isDraw, lost:finalAtkLost, atk:Math.round(atkPow), def:Math.round(defPow), pct, mod, modLabel, xpGain, report };
}
