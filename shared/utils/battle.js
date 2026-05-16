import { FACTION_TROOPS, COMMAND_COST, troopSizeModifier, skillProcAtLevel } from "../constants/troops.js";
import { TERR  } from "../constants/terrain.js";
import { POWER_DEFS, XP_PER_COMMAND } from "../constants/map.js";
import { skillFiresOnRound, getActiveSkills, getPassiveBonuses } from "../constants/skills.js";
import { npcForPowerLevel, factionDefCmdForTile, FACTION_BRANCHES_EXPORT } from "../constants/heroes.js";

// ── Normalize a commander to troopSlots array (backward compat) ──────────────
function normaliseTroopSlots(cmd) {
  if (cmd?.troopSlots && cmd.troopSlots.length > 0) return cmd.troopSlots;
  if (cmd?.troopBranch) return [{ branch: cmd.troopBranch, troops: cmd.troops ?? 0 }];
  return [];
}

// ── Total troops across all slots ─────────────────────────────────────────────
function totalSlotTroops(slots) {
  return slots.reduce((s, sl) => s + (sl.troops || 0), 0);
}

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
if (f.factionPassives) skills.push(...f.factionPassives);
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
return skills.some(s => s?.effect?.type === "immunity" && s.effect.immune?.includes(immuneType));
}

// ── Proc troop skills on a given trigger ──────────────────────────────────────
// defTroopBranch: the branch RECEIVING the effect (for immunity checks)
function procTroopSkills(troopSkills, trigger, skillLevels, rs, roundLog, actorLabel, defTroopBranch) {
for (const skill of troopSkills) {
if (!skill || skill.trigger !== trigger || skill.trigger === "passive") continue;
const lvl  = skillLevels?.[skill.key] ?? 1;
const proc = skillProcAtLevel(skill, lvl);
if (Math.random() >= proc) continue;
const eff = skill.effect;

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
  // New mechanics
  case "invisibility":
    rs.invisibleUnits = Math.max(rs.invisibleUnits, eff.units || 2);
    if (eff.stunImmune) rs.invisStunImmune = true;
    break;
  case "focus_damage":
    rs.focusDmgBonus += eff.value || 0;
    break;
  case "confusion_focus_down":
    rs.enemyFocusDown = Math.max(rs.enemyFocusDown, eff.value || 0);
    rs.enemyConfused  = Math.max(rs.enemyConfused || 0, eff.duration || 1);
    break;
  case "vs_ranged_dmg_up":
    rs.vsRangedDmgUp += eff.value || 0;
    break;
  case "gear_stat_bonus":
    rs.gearStatBonus += eff.value || 0;
    break;
  case "spd_bonus":
    rs.cmdSpdBonus += eff.value || 0;
    break;
  case "day_night_conditional": {
    const utcHour = new Date().getUTCHours();
    const isNight = utcHour < 6 || utcHour >= 18;
    rs.nightBuff = isNight;
    if (isNight) {
      rs.troopAtkMult *= (1 + (eff.nightBonus || 0));
      rs.troopDefMult *= (1 + (eff.nightBonus || 0));
    } else {
      rs.troopAtkMult *= (1 - (eff.dayPenalty || 0));
      rs.troopDefMult *= (1 - (eff.dayPenalty || 0));
    }
    break;
  }
  // Serava mechanics
  case "silence":
    if (Math.random() < (eff.chance || 0.06)) {
      rs.enemySilenced = true;
      roundLog.actions.push({ actor:actorLabel, action:`🎵 ${skill.name} — Enemy commander silenced! Skill delayed.`, dmg:0, isTroopSkill:true });
    }
    break;
  case "focus_damage_venom":
    rs.focusDmgBonus += eff.value || 0;
    if (Math.random() < (eff.venomChance || 0.05)) {
      rs.venomApplied = true;
      roundLog.actions.push({ actor:actorLabel, action:`🐍 Venom applied — SPD -20%, focus damage next round`, dmg:0, isTroopSkill:true });
    }
    break;
  case "focus_damage_delayed":
    rs.focusDmgBonus += eff.initialDmg || 0;
    rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, eff.delayedDmg || 0);
    break;
  case "dual_dmg_shift":
    rs.allyDmgBonus  += eff.allyDmgUp   || 0;
    rs.enemyDmgDown  += eff.enemyDmgDown || 0;
    break;
  case "skill_dmg_bonus":
    rs.skillDmgBonus += eff.value || 0;
    break;
  case "followup_normal_attack":
    if (round <= (eff.maxRound || 5)) rs.followupChance += eff.chance || 0;
    break;
  case "melee_max_dmg_chance":
    rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + (eff.chance || 0));
    break;
  case "focus_damage_heal_creatures":
    rs.focusDmgBonus += eff.value || 0;
    rs.healPct       += eff.healPct || 0;
    break;
  // Korrax mechanics
  case "physical_damage_bleed":
    rs.bleedApplied = Math.random() < (eff.bleedChance || 0.60);
    rs.pendingBleedDmg = eff.bleedDmg || 0.30;
    rs.bleedRoundsLeft = eff.bleedDuration || 2;
    if (eff.bleedPreventsEvasion) rs.bleedPreventsEvasion = true;
    break;
  case "multi_hit_lowest_def":
    rs.multiHitCount  = eff.hitsBase || 1;
    rs.multiHitDmgLo  = eff.dmgLo || 0.20;
    rs.multiHitDmgHi  = eff.dmgHi || 0.40;
    break;
  case "reactive_cmd_dmg_on_ally_hit":
    rs.leaderRageBonus = eff.bonus || 0.10;
    break;
  case "first_hits_dmg_reduce":
    rs.firstHitProtection  = eff.reduction || 0.02;
    rs.firstHitsRemaining  = eff.instances || 3;
    break;
  case "branch_evasion_first_hit":
    rs.branchEvasionChance = eff.chance || 0.08;
    break;
  case "stun_chance":
    if (Math.random() < (eff.chance || 0.07)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
      roundLog.actions.push({ actor:actorLabel, action:`🌕 ${skill.name} — Enemy stunned!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "heal_creatures_mounted_bonus":
    rs.healPct += eff.healPct || 0.30;
    // mounted bonus applied separately in heal section
    rs.mountedHealBonus = eff.mountedBonus || 0.75;
    break;
  case "night_max_dmg_chance":
    rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + (eff.chance || 0.10));
    break;
  case "dmg_type_resist":
    rs.focusPoisonResist += eff.focusResist || 0.01;
    break;
  case "mounted_spd_modified_dmg":
    rs.mountedSpdDmgUp   = (eff.dmgUp  || 0.01);
    rs.mountedSpdDmgDown = (eff.dmgDown || 0.01);
    break;
  // Groth mechanics
  case "mounted_atk_stack_spd":
    // Stacks build during combat via on_hit; flagged here as passive config
    rs.mountedAtkStackBonus = eff.valuePerStack || 0.006;
    break;
  case "heal_branch":
    rs.healPct += eff.healPct || 0;
    break;
  case "branch_dmg_reduce":
    rs.troopDmgReduce += eff.value || 0;
    break;
  case "branch_madness_immunity_chance":
    if (Math.random() < (eff.chance || 0.14)) rs.branchMadnessImmune = true;
    break;
  case "physical_damage_stun":
    rs.focusDmgBonus += eff.value || 0;
    if (Math.random() < (eff.stunChance || 0.40)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
      roundLog.actions.push({ actor:actorLabel, action:`🌑 ${skill.name} — Enemy stunned!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "march_speed_bonus":
    rs.marchSpeedBonus += eff.value || 0;
    break;
}
roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name}`, dmg:0, isTroopSkill:true });

}
}

// ── Dragon early-round damage penalty ────────────────────────────────────────
function dragonEarlyPenalty(troopBranch, round) {
if (!troopBranch) return 1.0;
const f = FACTION_TROOPS[troopBranch.faction];
if (!f?.factionPassives) return 1.0;
return (f.factionPassives.some(p => p.key === "slow_to_rise") && round <= 2) ? 0.90 : 1.0;
}

// ── Ranged vulnerability vs dragons ──────────────────────────────────────────
function rangedVulnerability(defTroopBranch, atkBranchDef) {
if (!defTroopBranch || !atkBranchDef) return 1.0;
const f = FACTION_TROOPS[defTroopBranch.faction];
if (!f?.factionPassives) return 1.0;
const hasExposed = f.factionPassives.some(p => p.key === "exposed_wings");
if (!hasExposed) return 1.0;
return (atkBranchDef.role === "ranged" || atkBranchDef.role === "siege_ranged") ? 1.15 : 1.0;
}

// ── Shared troop-slot builder ─────────────────────────────────────────────────
// `tierSplit` is an array of { tier, budget } entries — each spends its budget
// at the given tier index (0=T1, 1=T2, 2=T3). Slots within each tier group are
// seeded by `seed` offset by the group index. Respects COMMAND_COST.
function buildTroopSlots(faction, tierSplit, seed) {
  const factionBranches = FACTION_BRANCHES_EXPORT[faction];
  if (!factionBranches || !factionBranches.length) return [];
  const fTroops = FACTION_TROOPS[faction];
  if (!fTroops) return [];

  const allSlots = [];

  tierSplit.forEach(({ tier, budget }, groupIdx) => {
    if (budget <= 0) return;
    const groupSeed = (seed + groupIdx * 1000003) >>> 0;
    const numSlots  = 1 + (groupSeed % 3); // 1–3 slots per tier group
    let remaining   = budget;

    for (let i = 0; i < numSlots && remaining > 0; i++) {
      const branchKey = factionBranches[(groupSeed + i * 7) % factionBranches.length];
      const branchDef = fTroops.branches?.find(b => b.key === branchKey);
      const cost      = COMMAND_COST[branchDef?.size || "small"] || 1;

      if (remaining < cost) break;

      let share;
      if (i === numSlots - 1) {
        share = remaining;
      } else {
        const frac      = 0.3 + 0.4 * (((groupSeed >> (i * 4)) & 0xf) / 15);
        const raw       = Math.round(remaining * frac);
        const slotsLeft = numSlots - i - 1;
        share = Math.min(raw, remaining - slotsLeft * cost);
        share = Math.max(cost, share);
      }

      const troops = Math.floor(share / cost);
      if (troops <= 0) continue;
      allSlots.push({ branch: { faction, branch: branchKey, tier }, troops });
      remaining -= troops * cost;
    }
  });

  return allSlots;
}

// Returns the tier split for a given power level.
// P1–P5:  all T1 (index 0)
// P6–P9:  50% T1 / 50% T2 (indices 0 and 1)
// P10:    50% T2 / 50% T3 (indices 1 and 2)
// P11–P13: all T3 (index 2)
function tierSplitForPowerLevel(plvl, budget) {
  if (plvl >= 11) {
    return [{ tier: 2, budget }];
  }
  if (plvl === 10) {
    const half = Math.floor(budget / 2);
    return [
      { tier: 1, budget: half },
      { tier: 2, budget: budget - half },
    ];
  }
  if (plvl >= 6) {
    const half = Math.floor(budget / 2);
    return [
      { tier: 0, budget: half },
      { tier: 1, budget: budget - half },
    ];
  }
  return [{ tier: 0, budget }];
}

export function garrisonDefCmd(tile, playerFaction) {
const plvl   = tile.powerLevel || 1;
const pd     = POWER_DEFS[plvl] || POWER_DEFS[1];
const budget = tile.garrisonTroops || pd.command;

// P4+ tiles: named faction commander from opposite alignment, with multi-slot army
if (plvl >= 4 && playerFaction) {
  const fc = factionDefCmdForTile(tile.c ?? 0, tile.r ?? 0, playerFaction, plvl);
  if (fc) {
    const seed  = (((( tile.c ?? 0) + 1) * 73856093) ^ (((tile.r ?? 0) + 1) * 19349663)) >>> 0;
    const split = tierSplitForPowerLevel(plvl, budget);
    const slots = buildTroopSlots(fc.faction, split, seed);
    const totalTroops = slots.reduce((s, sl) => s + sl.troops, 0);
    return {
      ...fc,
      troops:      totalTroops,
      commandBudget: budget,
      troopSlots:  slots.length > 0 ? slots : undefined,
      troopBranch: slots[0]?.branch ?? fc.troopBranch,
    };
  }
}

// P1–P3: NPC commander with single branch (no faction to draw from)
const npc          = npcForPowerLevel(plvl);
const npcBranch    = npc.troopBranch;
const npcBranchDef = npcBranch
  ? FACTION_TROOPS?.[npcBranch.faction]?.branches?.find(b => b.key === npcBranch.branch)
  : null;
const npcCost   = COMMAND_COST[npcBranchDef?.size || "small"] || COMMAND_COST.small;
const npcTroops = Math.max(1, Math.floor(budget / npcCost));
return {
  lvl:           pd.cmdLvl,
  troops:        npcTroops,
  commandBudget: budget,
  troopBranch:   npcBranch || null,
  atk:           npc.atk * pd.cmdLvl,
  spd:           npc.spd + pd.cmdLvl * 2,
  n:             npc.n,
  icon:          npc.icon,
  cls:           npc.cls,
  faction:       null,
  rarity:        "soldier",
};
}

export function resolvedDefTile(tile, playerFaction) {
if (tile.owner === "ai" && !tile.hasAiCommander)
return { ...tile, defCmd: garrisonDefCmd(tile, playerFaction) };
return tile;
}

// ── Multi-wave garrison helpers ───────────────────────────────────────────────

// Returns total garrison wave count for a tile.
export function garrisonWaveCount(tile) {
  if (tile?.garrisonWaves != null) return tile.garrisonWaves;
  if (tile?.isGate || tile?.isKeep) return 2; // safe fallback
  if ((tile?.powerLevel ?? 0) >= 10) return 2; // P10-P13 have 2 garrison waves
  return 1;
}

// Builds a wave defender commander with troopSlots allocated from the command budget.
// Wave index seeds a distinct commander/branch selection via Knuth multiplicative hash.
// Always draws from the opposite alignment to the player faction (veteran/soldier only).
export function garrisonWaveDefCmd(tile, waveIndex, playerFaction) {
  const c      = tile.c ?? tile.cx ?? 0;
  const r      = tile.r ?? tile.cy ?? 0;
  const budget = tile.garrisonTroops || tile.garrison || 2100;

  // Per-wave seed: incorporate wave index so each wave gets a distinct commander
  const baseSeed = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) >>> 0;
  const waveSeed = (baseSeed ^ (waveIndex * 2654435761)) >>> 0;

  // Offset tile coords per wave so factionDefCmdForTile picks a different commander
  const waveC      = (c + waveIndex * 997) | 0;
  const waveR      = (r + waveIndex * 1009) | 0;
  const powerLevel = tile.powerLevel || 1;
  // P1–P3: use NPC path (same as garrisonDefCmd) — no faction commander available
  if (powerLevel < 4) return garrisonDefCmd(tile, playerFaction);
  const baseCmd    = factionDefCmdForTile(waveC, waveR, playerFaction, powerLevel, waveIndex);
  if (!baseCmd) return garrisonDefCmd(tile, playerFaction);

  const split = tierSplitForPowerLevel(powerLevel, budget);
  const slots = buildTroopSlots(baseCmd.faction, split, waveSeed);
  const totalTroops = slots.reduce((s, sl) => s + sl.troops, 0);

  return {
    ...baseCmd,
    troops:        totalTroops,
    commandBudget: budget,
    troopSlots:    slots.length > 0 ? slots : undefined,
    troopBranch:   slots[0]?.branch ?? baseCmd.troopBranch,
  };
}
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
const dmgType = branchDef?.dmgType ?? "physical";
const roll    = tierData.dmgLo + Math.random() * (tierData.dmgHi - tierData.dmgLo);
// Fix 2: resistance divisor = 60 (was 80) so higher DEF troops have a bigger damage gap
const resist  = dmgType === "magical" || ignoreDef
? 1.0
: Math.max(0, 1 - (troopDef * defMult) / ((troopDef * defMult) + 60));
const armyMult   = isAtk ? (dmgType === "magical" ? (armyFocMult||1) : (armyAtkMult||1)) : 1;
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

// ── Multi-slot attacker setup ─────────────────────────────────────────────
const atkSlots = normaliseTroopSlots(cmd);
// Total troops across all slots (authoritative — overrides passed attackerTroops
// when using troopSlots; legacy callers pass attackerTroops directly).
const totalAtkTroops = atkSlots.length > 0
  ? totalSlotTroops(atkSlots)
  : (attackerTroops || 0);

// Primary slot (fastest, or first) for legacy fields still used in report/log
const primarySlot    = atkSlots.length > 0 ? atkSlots[0] : null;
const atkRes         = resolveBranch(primarySlot?.branch ?? cmd.troopBranch ?? null);
const atkBranchDef   = atkRes?.branchDef ?? null;
const atkTierData    = atkRes?.tierData   ?? null;

// Per-slot resolved data
const atkSlotResolved = atkSlots.map(sl => {
  const res = resolveBranch(sl.branch);
  return {
    branch:    sl.branch,
    troops:    sl.troops || 0,
    branchDef: res?.branchDef ?? null,
    tierData:  res?.tierData  ?? null,
    skills:    getTierSkillsForBattle(sl.branch),
    hpPer:     res?.tierData?.hp  ?? 25,
    spd:       res?.tierData?.spd ?? 50,
    def:       res?.tierData?.def ?? 20,
  };
});

const defRes = resolveBranch(dc?.troopBranch ?? null);
const defBranchDef = defRes?.branchDef ?? null;
const defTierData  = defRes?.tierData   ?? null;

// ── Multi-slot defender setup (mirrors attacker) ──────────────────────────
// Normalise defender to slots: use dc.troopSlots if present, else single troopBranch.
const defSlots = (dc?.troopSlots && dc.troopSlots.length > 0)
  ? dc.troopSlots
  : (dc?.troopBranch ? [{ branch: dc.troopBranch, troops: dc?.troops ?? 30 }] : []);
const defSlotResolved = defSlots.map(sl => {
  const res = resolveBranch(sl.branch);
  return {
    branch:    sl.branch,
    troops:    sl.troops || 0,
    branchDef: res?.branchDef ?? null,
    tierData:  res?.tierData  ?? null,
    skills:    getTierSkillsForBattle(sl.branch),
    hpPer:     res?.tierData?.hp  ?? 25,
    spd:       res?.tierData?.spd ?? 50,
    def:       res?.tierData?.def ?? 20,
  };
});
// Primary defender slot for legacy single-branch fields
const primaryDefSlot = defSlotResolved[0] ?? null;
// Override defBranchDef/defTierData from primary slot if we have slots
const _defBranchDef = primaryDefSlot?.branchDef ?? defBranchDef;
const _defTierData  = primaryDefSlot?.tierData  ?? defTierData;

const atkSize  = atkBranchDef?.size ?? null;
const defSize  = _defBranchDef?.size ?? null;
const mod      = troopSizeModifier(atkSize, defSize);
const defMod   = troopSizeModifier(defSize, atkSize);
const modLabel = mod === 1.1 ? "⚔ STRONG" : mod === 0.9 ? "🛡 WEAK" : "◆ NEUTRAL";

const atkTroopSkills = atkSlotResolved[0]?.skills ?? getTierSkillsForBattle(cmd.troopBranch);
const defTroopSkills = primaryDefSlot?.skills ?? getTierSkillsForBattle(dc?.troopBranch ?? null);
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
// Use actual unit count from slots when available; dc.troops is the raw command budget
// which overstates real unit count for medium (×2) and large (×25) branches.
const defTroops = dc
  ? (dc.troopSlots?.length > 0
      ? totalSlotTroops(dc.troopSlots)
      : dc.troops ?? 0)
  : (defTile.garrison || defTile.garrisonTroops || 30);
const defCmdSpd = dc ? (dc.spd || 40) : 40;

const defTerrBonusBase = 1 + fort / 100;

// For display/rounding purposes use primary-slot stats; per-slot HP tracked separately
const atkTroopHpPer = atkTierData?.hp  ?? 25;
const defTroopHpPer = _defTierData?.hp  ?? 25;
// atkTroopSpd unused (per-slot spd is in atkSlotResolved); keep for compat
const atkTroopSpd   = atkTierData?.spd ?? 50;
const defTroopSpd   = primaryDefSlot?.spd ?? (_defTierData?.spd ?? 50);
const atkTroopDef   = atkTierData?.def ?? 20;
const defTroopDef   = _defTierData?.def ?? 20;

// Fix 3: Total army command = sum of (troops × cmd cost) across all slots.
// Small=1, medium=2, large=25. Baseline 500 = scale 1.0.
const totalArmyCommand = atkSlotResolved.length > 0
  ? atkSlotResolved.reduce((sum, sl) => {
      const size = sl.branchDef?.size ?? "small";
      const cost = size === "large" ? 25 : size === "medium" ? 2 : 1;
      return sum + (sl.troops || 0) * cost;
    }, 0)
  : (() => {
      const sz = atkBranchDef?.size ?? "small";
      return (sz === "large" ? 25 : sz === "medium" ? 2 : 1) * totalAtkTroops;
    })();

// Scale commander damage so it contributes ~65% of total output vs troops' ~35%.
// Derived from: cmdDmg = (65/35) × troopDmg, where troopDmg ≈ troops × avgTierDmg/round.
const avgAtkTroopDmg  = atkTierData ? (atkTierData.dmgLo + atkTierData.dmgHi) / 2 : 50;
const troopDmgEstimate = totalAtkTroops * avgAtkTroopDmg;
// Fix 1: Commander damage uses both atk and foc — physical dmg scales off atk, magical/focus off foc.
// Scale factor is derived from the combined stat so both matter regardless of dmgType.
const cmdAtkStat      = cmd.atk || 150;
const cmdFocStat      = cmd.foc || 0;
const combinedCmdStat = cmdAtkStat + cmdFocStat * 0.5; // foc is secondary unless troop does focus dmg
const CMD_ATK_SCALE   = Math.max(8, troopDmgEstimate * (65 / 35) / Math.max(combinedCmdStat, 1));
const atkCmdAtkBase   = cmdAtkStat * CMD_ATK_SCALE * passives.cmdAtkMult;
const atkCmdFocBase   = cmdFocStat * CMD_ATK_SCALE * passives.cmdAtkMult;
const attackerPhysMult  = attackerBonus   ? 1.10 : 1.0;
const strategistFocMult = strategistBonus ? 1.10 : 1.0;
const atkCmdAtk         = atkCmdAtkBase * attackerPhysMult;  // physical cmd dmg
const atkCmdFoc         = atkCmdFocBase * strategistFocMult; // focus/elemental cmd dmg
const atkCmdSpd     = cmd.spd || 60;
const defCmdAtkStat   = dc ? (dc.atk || 80) : 80;
const defCmdFocStat   = dc ? (dc.foc || 0) : 0;
const defCmdAtk     = (defCmdAtkStat + defCmdFocStat * 0.5) * CMD_ATK_SCALE;

// Class bonuses — unlock at Lv20
const cmdRespectLevel = cmd.respectLevel ?? cmd.lvl ?? 5;
const bastionActive   = (cmd.cls === "balanced")   && (cmdRespectLevel >= 20); // balanced gets bastion
const attackerBonus   = (cmd.cls === "attacker")   && (cmdRespectLevel >= 20); // +10% physical cmd dmg
const strategistBonus = (cmd.cls === "strategist") && (cmdRespectLevel >= 20); // +10% focus/elemental cmd dmg
const bastionHpMult = bastionActive ? 2 : 1;

let atkTroopHp     = totalAtkTroops * atkTroopHpPer * bastionHpMult;
let defTroopHp     = defTroops      * defTroopHpPer;
const atkHpMax     = atkTroopHp;
// Per-slot HP tracking for loss distribution
let atkSlotHp = atkSlotResolved.map(sl => sl.troops * sl.hpPer * bastionHpMult);
// Defender per-slot HP — distribute defTroops proportionally by slot troop count
const defTotalSlotTroops = defSlotResolved.reduce((s, sl) => s + sl.troops, 0);
let defSlotHp = defSlotResolved.length > 0
  ? defSlotResolved.map(sl => {
      const frac = defTotalSlotTroops > 0 ? sl.troops / defTotalSlotTroops : 1 / defSlotResolved.length;
      return defTroops * frac * sl.hpPer;
    })
  : [defTroopHp];
let totalAtkLostHp = 0;
let blockHealRounds= 0;
let prevRoundVenomDmg = 0; // venom delayed focus damage carries over round to round
let bleedDmgPerRound  = 0; // bleed physical damage per round
let bleedRoundsActive = 0; // rounds of bleed remaining

const atkLvlMult = Math.pow(1.20, atkLvl - 5);
const defLvlMult = Math.pow(1.20, Math.max(0, defLvl - 2));

const report = {
atkName:cmd.n, atkIcon:cmd.icon||"⚔", atkLvl,
atkTroopBranch: primarySlot?.branch ?? cmd.troopBranch ?? null,
atkTroopSlots: atkSlotResolved.map(sl => ({ branch: sl.branch, troops: sl.troops })),
atkTroopsStart:totalAtkTroops, defTroopsStart:defTroops, defLvl,
defCmdName: dc?.n ?? `Garrison Lv${defLvl}`, defCmdIcon: dc?.icon ?? "🛡",
defCmdStats: dc ? { atk:dc.atk||0, foc:dc.foc||0, spd:dc.spd||0, gearArmyAtk:0, gearArmyFoc:0, gearArmySpd:0, gearArmySiege:0 } : null,
defCmdCls: dc?.cls ?? null,
defSkillsSnapshot: dc ? getActiveSkills(dc).map(({ key, def, level }) => ({ key, level, name: def.name, icon: def.icon, type: def.type, desc: def.desc, cooldown: def.cooldown, tree: def.tree })) : [],
terrain:defTile.terrain, modLabel,
defPowerLevel:defTile.powerLevel || 1,
tileName: defTile.isKeep
  ? (defTile.keepName || defTile.regionName + " Keep")
  : defTile.isGate
    ? (defTile.keepName || "Gate")
    : (defTile.powerLevel && defTile.powerLevel > 1)
      ? `${POWER_DEFS[defTile.powerLevel]?.ringPower ?? defTile.powerLevel} Power Land (${POWER_DEFS[defTile.powerLevel]?.label ?? ""})`
      : defTile.powerLevel === 1 ? "1 Power Land (1/hr)"
      : (defTile.regionName || defTile.terrain || "Unknown"),
defTroopBranch: primaryDefSlot?.branch ?? dc?.troopBranch ?? null,
defTroopSlots: defSlotResolved.map(sl => ({ branch: sl.branch, troops: sl.troops })),
rounds:[], atkTroopsEnd:totalAtkTroops, defTroopsEnd:defTroops, won:false, xpGain:0,
bastionActive,
atkTroopsWounded: 0,
atkCmdStats: { atk:cmd.atk||150, foc:cmd.foc||0, spd:cmd.spd||60, gearArmyAtk:gb.armyAtk||0, gearArmyFoc:gb.armyFoc||0, gearArmySpd:gb.armySpd||0, gearArmySiege:gb.armySiege||0 },
cmdCls: cmd.cls||null, cmdFaction: cmd.faction||null, cmdSubspecies: cmd.subspecies||null,
atkBust: cmd.bust||null, atkPortrait: cmd.portrait||null,
defBust: dc?.bust||null, defPortrait: dc?.portrait||null,
};

// ── Phase 0: pre-battle log ───────────────────────────────────────────────
const phase0 = { round:0, isPreBattle:true, actions:[] };
phase0.actions.push({ actor:"SYSTEM", action:`⚔ Battle begins — ${report.tileName}${defTile.isHQ?" (HQ)":""} · ${modLabel}`, dmg:0, isPhase0:true });
phase0.actions.push({ actor:"SYSTEM", action:`${cmd.n} (${totalAtkTroops.toLocaleString()} troops) vs ${report.defCmdName} (${defTroops.toLocaleString()} troops)`, dmg:0, isPhase0:true });

atkSlotResolved.forEach(sl => {
  sl.skills.filter(s => s?.trigger === "passive").forEach(s => {
    const lbl = sl.branchDef?.label || "Troops";
    phase0.actions.push({ actor:lbl, action:`${s.icon} ${s.name} (passive): ${s.desc}`, dmg:0, isSkill:true, isPhase0:true });
  });
});

for (const { def, level } of getActiveSkills(cmd)) {
if (def.type !== "passive") continue;
const lv = level - 1; const v = def.base + (def.perLevel ?? 0) * lv;
let et = "";
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

if (bastionActive)   phase0.actions.push({ actor:cmd.n, action:`Passive: ⚖ Balanced — double HP & DEF (rounds 1-2)`, dmg:0, isSkill:true, isPhase0:true });
if (attackerBonus)   phase0.actions.push({ actor:cmd.n, action:`Passive: ⚔ Attacker — +10% physical commander damage`, dmg:0, isSkill:true, isPhase0:true });
if (strategistBonus) phase0.actions.push({ actor:cmd.n, action:`Passive: 🔮 Strategist — +10% focus/elemental commander damage`, dmg:0, isSkill:true, isPhase0:true });

const gb2 = cmd.gearBonuses || {};
if (gb2.armyAtk  > 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armyAtk}% Army ATK`,       dmg:0, isPhase0:true, isGear:true });
if (gb2.armyFoc  > 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armyFoc}% Army Focus DMG`, dmg:0, isPhase0:true, isGear:true });
if (gb2.armySpd  > 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armySpd} Army SPD`,        dmg:0, isPhase0:true, isGear:true });
if (gb2.armySiege> 0) phase0.actions.push({ actor:"Gear", action:`Gear: +${gb2.armySiege} Siege Power`,   dmg:0, isPhase0:true, isGear:true });
report.rounds.push(phase0);

// ── Combat rounds ─────────────────────────────────────────────────────────
for (let round = 1; round <= 10; round++) {
const roundLog = { round, actions:[] };
if (atkTroopHp <= 0 && defTroopHp <= 0) break;
if (atkTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Attackers routed!", dmg:0 }); report.rounds.push(roundLog); break; }
if (defTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Defenders defeated!", dmg:0 }); report.rounds.push(roundLog); break; }

if (bastionActive && round === 1) roundLog.actions.push({ actor:cmd.n, action:"⚖ BALANCED — double HP & DEF (rounds 1-2)", dmg:0, isSkill:true });
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
  // New mechanics
  invisibleUnits:0,          // friendly units with 30% evade this round
  invisStunImmune:false,     // max-level Invisible Enemy: stun immunity while invisible
  focusDmgBonus:0,           // extra focus damage on commander attack (modified by FOC)
  enemyFocusDown:0,          // enemy FOC stat reduction for 1 round (Compulsion)
  cmdSpdBonus:0,             // speed bonus (Lord's Experience max level)
  gearStatBonus:0,           // % bonus to gear-derived base stats (Lord's Experience)
  vsRangedDmgUp:0,           // enemy ranged units take X% more damage (Vampire Assassins)
  nightBuff:false,           // Night Terror: true = night, false = day
  // Serava mechanics
  enemySilenced:false,       // Siren Song: enemy commander skill delayed 1 round
  venomApplied:false,        // Assassin's Blade: venom on target (SPD -20%, delayed focus dmg)
  skillDmgBonus:0,           // Thrill of the Hunt: % bonus to all active skill damage
  followupChance:0,          // Did You Want More: chance for follow-up normal attack (rounds 1-5)
  pendingVenomDmg:0,         // carry-over venom focus damage to apply next round
  allyDmgBonus:0,            // A Countess's Seduction: allied DMG up
  enemyDmgDown:0,            // A Countess's Seduction: enemy DMG down
  // Korrax mechanics
  bleedApplied:false,        // Wolf's Rage: bleed on target (30% DMG/round for 2 rounds)
  bleedPreventsEvasion:false,// Max level Wolf's Rage: bleed targets cannot evade
  pendingBleedDmg:0,         // carry-over bleed damage
  bleedRoundsLeft:0,         // rounds of bleed remaining
  leaderRageBonus:0,         // Leader's Rage: next CMD attack bonus
  firstHitProtection:0,      // Leader's Protection: % reduction on first 3 hits
  firstHitsRemaining:3,      // Leader's Protection: hits remaining
  branchEvasionChance:0,     // Pack's Connection: werewolf unit first-hit evasion
  multiHitCount:0,           // Pack's Charge: number of hits to perform
  multiHitDmgLo:0.20,        // Pack's Charge: damage range low
  multiHitDmgHi:0.40,        // Pack's Charge: damage range high
  focusPoisonResist:0,       // Thick Skin: focus + poison resistance for mounted
  // Groth mechanics
  mountedAtkStack:0,         // Mounted Specialist: current stack count
  mountedAtkStackBonus:0,    // Mounted Specialist: bonus per stack (SPD modified)
  branchMadnessImmune:false, // Protect the Troops: madness immunity chance for mounted
  marchSpeedBonus:0,         // Lifeline of the Pack: non-combat march speed
};

applyDurationEffects(atkHeroSkills, round, durationBuffs, rs);
applyInstantEffects(atkHeroSkills, round, rs);

// ── Venom tick — apply carried-over focus damage from previous round ──────
if (prevRoundVenomDmg > 0) {
  const venomHit = Math.max(1, Math.round(cmdFocStat * prevRoundVenomDmg));
  const prevDef  = defTroopHp;
  defTroopHp     = Math.max(0, defTroopHp - venomHit);
  roundLog.actions.push({ actor:cmd.n, action:`🐍 Venom — ${Math.round(prevRoundVenomDmg*100)}% focus damage`, dmg:venomHit,
    defKilled:Math.max(0, Math.round((prevDef-defTroopHp)/(defTroopHpPer||1))), isSkill:true });
}
prevRoundVenomDmg = rs.pendingVenomDmg; // carry forward for next round

// ── Bleed tick — apply carry-over bleed damage ────────────────────────────
if (bleedRoundsActive > 0 && bleedDmgPerRound > 0) {
  const bleedHit = Math.max(1, Math.round(cmdAtkStat * bleedDmgPerRound));
  const prevDef  = defTroopHp;
  defTroopHp     = Math.max(0, defTroopHp - bleedHit);
  roundLog.actions.push({ actor:cmd.n, action:`🩸 Bleed — ${Math.round(bleedDmgPerRound*100)}% physical damage`, dmg:bleedHit,
    defKilled:Math.max(0, Math.round((prevDef-defTroopHp)/(defTroopHpPer||1))), isSkill:true });
  bleedRoundsActive--;
}
if (rs.bleedApplied) {
  bleedDmgPerRound  = rs.pendingBleedDmg;
  bleedRoundsActive = rs.bleedRoundsLeft;
}

// round_start troop skills — all atk slots apply to enemy
for (const sl of atkSlotResolved) {
  procTroopSkills(sl.skills, "round_start", atkSkillLevels, rs, roundLog, sl.branchDef?.label||"Troops", dc?.troopBranch ?? null);
}

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
  // Distribute healed HP across slots proportionally by their max HP
  let healLeft = restored;
  for (let si = 0; si < atkSlotHp.length && healLeft > 0; si++) {
    const sl = atkSlotResolved[si];
    const slMax = sl.troops * sl.hpPer * bastionHpMult;
    const portion = Math.min(healLeft, Math.max(0, slMax - atkSlotHp[si]));
    atkSlotHp[si] = Math.min(slMax, atkSlotHp[si] + portion);
    healLeft -= portion;
  }
  atkTroopHp     = Math.min(atkHpMax, atkTroopHp + restored - healLeft);
  totalAtkLostHp = Math.max(0, totalAtkLostHp - (restored - healLeft));
  const troopsBack = Math.round((restored - healLeft) / atkTroopHpPer);
  if (troopsBack > 0) roundLog.actions.push({ actor:cmd.n, action:`💚 ${troopsBack} troops restored`, dmg:-troopsBack, isSkill:true, isHeal:true, troopsBack, atkRemaining:Math.round(atkTroopHp/atkTroopHpPer) });
}

// % HP nuke
if (rs.cmdPctDmg > 0 && defTroopHp > 0) {
  const isCrit = Math.random() < rs.critChance;
  const dmg    = Math.max(1, Math.round(defTroops * defTroopHpPer * rs.cmdPctDmg * (isCrit?1.5:1.0)));
  defTroopHp   = Math.max(0, defTroopHp - dmg);
  roundLog.actions.push({ actor:cmd.n, action:`💀 % HP strike${isCrit?" (CRIT!)":""}`, dmg, isPlayer:true, isSkill:true });
}

// Build speed-ordered list: atk cmd + one entry per atk slot + def cmd + one entry per def slot
const order = [
  { id:"atkCmd",   spd:atkCmdSpd,   side:"atk" },
  ...atkSlotResolved.map((sl, idx) => ({ id:`atkSlot_${idx}`, slotIdx:idx, spd:sl.spd, side:"atk" })),
  { id:"defCmd",   spd:defCmdSpd,   side:"def" },
  ...defSlotResolved.map((sl, idx) => ({ id:`defSlot_${idx}`, slotIdx:idx, spd:sl.spd, side:"def" })),
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

  // ── Attacker slot ─────────────────────────────────────────────────────
  } else if (ent.id?.startsWith("atkSlot_")) {
    const slotIdx = ent.slotIdx;
    const sl      = atkSlotResolved[slotIdx];
    if (!sl || !sl.tierData || atkSlotHp[slotIdx] <= 0 || defTroopHp <= 0) continue;

    // on_hit troop skills from this slot — pass primary defTroopBranch for immunity
    procTroopSkills(sl.skills, "on_hit", atkSkillLevels, rs, roundLog, sl.branchDef?.label||"Troops", primaryDefSlot?.branch ?? dc?.troopBranch ?? null);

    const count    = Math.ceil(atkSlotHp[slotIdx] / sl.hpPer);
    const vulnMult = rangedVulnerability(primaryDefSlot?.branch ?? dc?.troopBranch ?? null, sl.branchDef);
    const defDown  = 1 - (rs.enemyDefDown || 0);
    const hits     = rs.troopDoubleAtk ? 2 : 1;
    const slotLabel = sl.branchDef?.label || `Slot ${slotIdx+1}`;

    for (let hi = 0; hi < hits; hi++) {
      if (defTroopHp <= 0) break;
      let dmg = calcTroopDmg(sl.branchDef, sl.tierData, defTroopDef, defDown, count, atkLvlMult, 1, rs.troopAtkMult, false, true, vulnMult * mod, round, sl.branch, armyAtkMult, armyFocMult, totalArmyCommand);
      if (rs.troopBonusDmgMult > 0) {
        const bonus = Math.round(dmg * rs.troopBonusDmgMult);
        dmg += bonus;
        roundLog.actions.push({ actor:slotLabel, action:`💥 Bonus strike +${bonus} dmg`, dmg:bonus, isPlayer:true, isTroopSkill:true });
      }
      // Distribute attacker damage proportionally across alive def slots
      let dmgLeft2 = dmg;
      const prevDefTotal2 = defTroopHp;
      const defSlotHpAlive = defSlotHp.reduce((s,h) => s+h, 0);
      if (defSlotHpAlive > 0) {
        for (let di = 0; di < defSlotHp.length && dmgLeft2 > 0; di++) {
          if (defSlotHp[di] <= 0) continue;
          const frac = defSlotHp[di] / defSlotHpAlive;
          const portion = Math.min(defSlotHp[di], Math.round(dmgLeft2 * frac));
          defSlotHp[di] = Math.max(0, defSlotHp[di] - portion);
          dmgLeft2 -= portion;
        }
      }
      defTroopHp = Math.max(0, defSlotHp.reduce((s,h) => s+h, 0));
      roundLog.actions.push({ actor:slotLabel, action:`${slotLabel} attack${hits>1?` (hit ${hi+1}/2)`:""}`, dmg, defKilled:Math.max(0,Math.round((prevDefTotal2-defTroopHp)/defTroopHpPer)), defRemaining:Math.max(0,Math.round(defTroopHp/defTroopHpPer)), isPlayer:true });
    }

    // Counter attack — use primary def slot for counter stats
    if (rs.troopCounterAtk && defTroopHp > 0) {
      const cCount = Math.ceil(defTroopHp / defTroopHpPer);
      const cDmg   = calcTroopDmg(_defBranchDef, _defTierData, sl.def, bastionDefMult * rs.troopDefMult, cCount, defLvlMult, roundTerrBonus, 1, false, false, defMod, round, primaryDefSlot?.branch ?? dc?.troopBranch, 1, 1);
      const cFinal = Math.max(1, Math.round(cDmg * 0.50 * (1 - rs.enemyDmgReduce) * (1 - rs.dmgReduce)));
      const prevSlotHp = atkSlotHp[slotIdx];
      atkSlotHp[slotIdx] = Math.max(0, atkSlotHp[slotIdx] - cFinal);
      const hpLost = prevSlotHp - atkSlotHp[slotIdx];
      atkTroopHp = Math.max(0, atkTroopHp - hpLost);
      totalAtkLostHp += hpLost;
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
    if (rs.enemySilenced) {
      rs.enemySilenced = false; // consumed — skill fires next round naturally
      roundLog.actions.push({ actor:"Enemy Cmd", action:"🎵 Enemy commander silenced — skill delayed!", dmg:0 });
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
        // distribute self-damage across def slots
        let sdLeft = selfDmg;
        const defSHA = defSlotHp.reduce((s,h)=>s+h,0);
        if (defSHA > 0) { for (let di=0;di<defSlotHp.length&&sdLeft>0;di++) { if(defSlotHp[di]<=0)continue; const p=Math.min(defSlotHp[di],Math.round(sdLeft*(defSlotHp[di]/defSHA))); defSlotHp[di]=Math.max(0,defSlotHp[di]-p); sdLeft-=p; } }
        defTroopHp = Math.max(0, defSlotHp.reduce((s,h)=>s+h,0));
        const killed = Math.max(0, Math.round((prevDef - defTroopHp) / defTroopHpPer));
        roundLog.actions.push({ actor:"Enemy Cmd", action:`😵 Confused! Attacks own troops — ${killed} friendly casualties`, dmg:selfDmg, isPlayer:false, isConfused:true });
        continue;
      }
      // 50% chance they act normally despite confusion
    }
    if (rs.enemyTargetsTaunted) {
      roundLog.actions.push({ actor:"Enemy Cmd", action:"🎯 Taunted — forced to attack!", dmg:0 });
    }
    if (Math.random() < rs.enemyMissChance) { roundLog.actions.push({ actor:"Enemy Cmd", action:"Enemy commander missed!", dmg:0 }); continue; }
    if (rs.invisibleUnits > 0 && Math.random() < 0.30) { roundLog.actions.push({ actor:"Enemy Cmd", action:"🌑 Attack evaded — target invisible!", dmg:0 }); continue; }
    const atkRes3  = atkTroopDef * bastionDefMult * rs.troopDefMult;
    const red3     = Math.max(0, 1 - atkRes3/(atkRes3+60));
    const eMod     = (1 - rs.enemyAtkReduce) * (1 - rs.enemyDmgReduce) * (1 - rs.dmgReduce);
    const raw3     = defCmdAtk * roundTerrBonus * (0.85+Math.random()*0.30) * eMod * defMod;
    const dmg      = Math.max(1, Math.round(raw3 * red3));
    const prevAtk  = atkTroopHp;
    atkTroopHp     = Math.max(0, atkTroopHp - dmg);
    totalAtkLostHp += (prevAtk - atkTroopHp);
    roundLog.actions.push({ actor:"Enemy Cmd", action:`${report.defCmdIcon} Enemy commander strikes`, dmg, atkKilled:Math.max(0,Math.round((prevAtk-atkTroopHp)/atkTroopHpPer)), atkRemaining:Math.max(0,Math.round(atkTroopHp/atkTroopHpPer)), isPlayer:false });

  // ── Defender slot ─────────────────────────────────────────────────────
  } else if (ent.id?.startsWith("defSlot_")) {
    const dSlotIdx = ent.slotIdx;
    const dsl = defSlotResolved[dSlotIdx];
    if (!dsl || !dsl.tierData || defSlotHp[dSlotIdx] <= 0 || atkTroopHp <= 0) continue;
    if (rs.enemyNullified) continue;
    if (rs.enemyStunned > 0) continue;
    if (rs.enemyConfused > 0) {
      rs.enemyConfused--;
      if (Math.random() < 0.5) {
        const selfDmg = calcTroopDmg(dsl.branchDef, dsl.tierData, dsl.def, 1, Math.ceil(defSlotHp[dSlotIdx]/dsl.hpPer), defLvlMult, 1, 1, false, false, 1, round, dsl.branch, 1, 1);
        const prevSlot = defSlotHp[dSlotIdx];
        defSlotHp[dSlotIdx] = Math.max(0, defSlotHp[dSlotIdx] - selfDmg);
        defTroopHp = Math.max(0, defSlotHp.reduce((s,h)=>s+h,0));
        const killed = Math.max(0, Math.round((prevSlot - defSlotHp[dSlotIdx]) / dsl.hpPer));
        roundLog.actions.push({ actor:"Defenders", action:`😵 Confused! ${dsl.branchDef?.label||"Defenders"} attack own ranks — ${killed} casualties`, dmg:selfDmg, isPlayer:false, isConfused:true });
        continue;
      }
    }
    if (Math.random() < rs.enemyMissChance) { roundLog.actions.push({ actor:"Defenders", action:"Enemy troops missed!", dmg:0 }); continue; }

    // on_hit troop skills — this def slot targeting attacker
    procTroopSkills(dsl.skills, "on_hit", defSkillLevels, rs, roundLog, dsl.branchDef?.label||"Defenders", primarySlot?.branch ?? cmd.troopBranch ?? null);

    const eMod2     = (1 - rs.enemyDmgReduce) * (1 - rs.troopDmgReduce) * (1 - rs.dmgReduce);
    const dCount    = Math.ceil(defSlotHp[dSlotIdx] / dsl.hpPer);
    const dVulnMult = rangedVulnerability(primarySlot?.branch ?? cmd.troopBranch ?? null, dsl.branchDef);
    const dSlotMod  = troopSizeModifier(dsl.branchDef?.size ?? null, atkSize);
    const dmgD      = Math.max(1, Math.round(
      calcTroopDmg(dsl.branchDef, dsl.tierData, atkTroopDef, bastionDefMult * rs.troopDefMult, dCount, defLvlMult, roundTerrBonus, 1, false, false, dVulnMult * dSlotMod, round, dsl.branch, 1, 1) * eMod2
    ));
    // Distribute this slot's damage proportionally across alive atk slots
    const prevAtkTotal2 = atkTroopHp;
    let dmgLeft3 = dmgD;
    const atkSlotHpAlive2 = atkSlotHp.reduce((s,h)=>s+h,0);
    if (atkSlotHpAlive2 > 0) {
      for (let si=0;si<atkSlotHp.length&&dmgLeft3>0;si++) {
        if (atkSlotHp[si]<=0) continue;
        const frac = atkSlotHp[si]/atkSlotHpAlive2;
        const portion = Math.min(atkSlotHp[si], Math.round(dmgLeft3*frac));
        atkSlotHp[si] = Math.max(0, atkSlotHp[si]-portion);
        dmgLeft3 -= portion;
      }
    }
    const newAtkTotalHp2 = atkSlotHp.reduce((s,h)=>s+h,0);
    atkTroopHp     = newAtkTotalHp2;
    totalAtkLostHp += (prevAtkTotal2 - newAtkTotalHp2);

    // on_hit_received — attacker's primary slot reacts
    procTroopSkills(atkSlotResolved[0]?.skills ?? atkTroopSkills, "on_hit_received", atkSkillLevels, rs, roundLog, "Troops", dsl.branch ?? null);

    const dLabel = dsl.branchDef?.label || `Defenders ${dSlotIdx+1}`;
    roundLog.actions.push({ actor:"Defenders", action:`${dLabel} attack`, dmg:dmgD, atkKilled:Math.max(0,Math.round((prevAtkTotal2-atkTroopHp)/atkTroopHpPer)), atkRemaining:Math.max(0,Math.round(atkTroopHp/atkTroopHpPer)), isPlayer:false });
  }
}

// round_end troop skills (all atk slots)
for (const sl of atkSlotResolved) {
  procTroopSkills(sl.skills, "round_end", atkSkillLevels, rs, roundLog, sl.branchDef?.label||"Troops", primaryDefSlot?.branch ?? dc?.troopBranch ?? null);
}
// round_end for all def slots
for (const dsl of defSlotResolved) {
  procTroopSkills(dsl.skills, "round_end", defSkillLevels, rs, roundLog, dsl.branchDef?.label||"Defenders", primarySlot?.branch ?? cmd.troopBranch ?? null);
}
report.rounds.push(roundLog);

}

const won      = defTroopHp <= 0 && atkTroopHp > 0;
const isDraw   = atkTroopHp > 0  && defTroopHp > 0;
const defTroopsLeft   = Math.max(0, Math.round(defTroopHp / defTroopHpPer));
const atkLostHpActual = atkHpMax - Math.max(0, atkTroopHp);
const troopHpDiv      = atkTroopHpPer * bastionHpMult;
const lostFromHp      = Math.round(atkLostHpActual / troopHpDiv);
const finalAtkLost    = won
? Math.min(totalAtkTroops - 1, Math.max(1, lostFromHp))
: Math.min(totalAtkTroops, Math.max(0, lostFromHp));

// XP = Σ per def slot: troops × commandCost × xpRateForTier
// This correctly handles mixed-tier, mixed-size armies.
const fullXp = defSlotResolved.length > 0
  ? defSlotResolved.reduce((sum, dsl) => {
      const cost    = COMMAND_COST[dsl.branchDef?.size || "small"] || 1;
      const tierIdx = dsl.branch?.tier ?? 0;
      const rate    = XP_PER_COMMAND[tierIdx] ?? XP_PER_COMMAND[0];
      return sum + Math.round(dsl.troops * cost * rate);
    }, 0)
  : Math.round(defTroops * (XP_PER_COMMAND[primaryDefSlot?.branch?.tier ?? dc?.troopBranch?.tier ?? 0] ?? XP_PER_COMMAND[0]));
const defTroopsKilled = Math.max(0, defTroops - defTroopsLeft);
// Update per-slot troops proportionally based on final losses
const atkLostFraction = totalAtkTroops > 0 ? finalAtkLost / totalAtkTroops : 0;
const defKilledFraction = Math.max(0, Math.min(1, defTroopsKilled / Math.max(1, defTroops)));
const xpGain = won ? fullXp : isDraw ? Math.max(1, Math.round(fullXp * defKilledFraction)) : 0;
// Fix 4: Win-chance % now uses the same stats that actually drive combat:
//   - Attacker: total army command capacity (not raw troop count) + level as a multiplier
//   - Defender: raw troops + level + terrain bonus
//   - Sigmoid sharpness = 2.5 (was 3.5) so a 3-level / 3x troop advantage actually shows >90%
//   - Commander atk/foc contribution folded in so stat-heavy commanders show correctly
const cmdStatBonus  = 1 + (cmdAtkStat + cmdFocStat) / 2000;
const atkPow     = Math.max(1, totalArmyCommand) * Math.pow(1.15, atkLvl - 1) * mod * cmdStatBonus;
const defPow     = defTroops        * Math.pow(1.15, Math.max(0, defLvl - 1)) * defTerrBonusBase;
const powerRatio = atkPow / Math.max(1, defPow);
const pct        = Math.round(Math.min(99, Math.max(1, 100 / (1 + Math.pow(Math.max(0.00001, 1/powerRatio), 2.5)))));

report.won           = won;
report.isDraw        = isDraw;
report.atkTroopsEnd  = Math.max(0, totalAtkTroops - finalAtkLost);
// Track per-slot troop counts after battle (proportional losses)
report.atkSlotTroopsEnd = atkSlotResolved.map((sl, idx) => {
  const lost = Math.min(sl.troops, Math.round(sl.troops * atkLostFraction));
  return Math.max(0, sl.troops - lost);
});
report.defTroopsEnd  = defTroopsLeft;
report.xpGain        = xpGain;
report.pct           = pct;
report.atkTroopsWounded = Math.floor(finalAtkLost * 0.30);
report.totalAtkTroops = totalAtkTroops;

return { won, isDraw, lost:finalAtkLost, atk:Math.round(atkPow), def:Math.round(defPow), pct, mod, modLabel, xpGain, report };
}
