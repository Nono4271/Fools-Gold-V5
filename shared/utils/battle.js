import { FACTION_TROOPS, COMMAND_COST, troopSizeModifier, skillProcAtLevel } from "../constants/troops.js";
import { TERR  } from "../constants/terrain.js";
import { POWER_DEFS, XP_PER_COMMAND } from "../constants/map.js";
import { skillFiresOnRound, getActiveSkills, getPassiveBonuses, MAIN_SKILLS } from "../constants/skills.js";
import { getFactionAlignment } from "../constants/factions.js";
import { npcForPowerLevel, factionDefCmdForTile, FACTION_BRANCHES_EXPORT } from "../constants/heroes.js";
import { resolveNeutralUnit, getNeutralTierSkills } from "../constants/neutralTroops.js";
import { ANCIENT_FACTIONS } from "../constants/ancientTroops.js";
import { NEUTRAL_FACTIONS } from "../constants/neutralTroops.js";
import { factionBonusValue } from "../constants/factionBonuses.js";

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
const f = FACTION_TROOPS[faction] || ANCIENT_FACTIONS[faction] || NEUTRAL_FACTIONS[faction];
if (!f) return null;
const b = f.branches.find(b => b.key === branch);
if (!b) return null;
return { branchDef: b, tierData: b.tiers[tier] ?? null };
}

// ── Get troop skills for a given branch/tier ─────────────────────────────────
function getTierSkillsForBattle(troopBranch) {
if (!troopBranch) return [];
const { faction, branch, tier = 0 } = troopBranch;
const f = FACTION_TROOPS[faction] || ANCIENT_FACTIONS[faction] || NEUTRAL_FACTIONS[faction];
if (!f) return [];
const b = f.branches.find(b => b.key === branch);
if (!b) return [];
const skills = [];
if (b.capstone) { skills.push(b.skills.a); skills.push(b.skills.b); skills.push(b.skills.c); }
else if (tier === 0) skills.push(b.skills.a);
else if (tier === 1) skills.push(b.skills.b);
else { skills.push(b.skills.a); skills.push(b.skills.b); }
return skills;
}

// ── Resolve a neutral unit into the same slot shape battle resolution uses
//    for faction troops (see `atkSlotResolved`/`defSlotResolved` in
//    `simBattle`). Purely additive — nothing in `simBattle` calls this yet,
//    since live map placement/garrison spawning for neutral units is not
//    wired up (data + battle-engine support only, see ReadMeAI). Future
//    integration can push the result of this straight into an
//    `atkSlotResolved`/`defSlotResolved`-style array.
export function getNeutralSlotForBattle(neutralKey, troops) {
  const unit = resolveNeutralUnit(neutralKey);
  if (!unit) return null;
  return {
    branch:    { neutral: neutralKey },
    troops:    troops || 0,
    branchDef: { key: unit.key, label: unit.label, size: unit.size, dmgType: unit.dmgType, role: unit.role, tags: unit.tags || [] },
    tierData:  unit.stats,
    skills:    getNeutralTierSkills(neutralKey),
    hpPer:     unit.stats?.hp  ?? 25,
    spd:       unit.stats?.spd ?? 50,
    def:       unit.stats?.def ?? 20,
  };
}

// ── Check if a troop branch has a specific immunity ───────────────────────────
function hasTroopImmunity(troopBranch, immuneType) {
if (!troopBranch) return false;
const { faction, branch, tier = 0 } = troopBranch;
const f = FACTION_TROOPS[faction] || ANCIENT_FACTIONS[faction] || NEUTRAL_FACTIONS[faction];
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
// alliedSlots: (optional, additive) the resolved slot array for the SAME side
//   as `troopSkills`'s owner (e.g. `atkSlotResolved` or `defSlotResolved`) —
//   only used by tag-synergy effect types below to check "is there another
//   allied unit sharing tag X". Existing callers/effects are unaffected when
//   this is omitted.
// actingSlot: (optional, additive) the specific slot object currently firing
//   its skills, so tag-synergy checks can exclude "itself" as a valid target.
export function procTroopSkills(troopSkills, trigger, skillLevels, rs, roundLog, actorLabel, defTroopBranch, round, alliedSlots, actingSlot) {
for (const skill of troopSkills) {
if (!skill || skill.trigger !== trigger || skill.trigger === "passive") continue;
const lvl  = skillLevels?.[skill.key] ?? 1;
const proc = skillProcAtLevel(skill, lvl);
if (Math.random() >= proc) continue;
const eff = skill.effect;

// Round restriction: only fire on specific rounds if roundsOnly is set
if (eff.roundsOnly && !eff.roundsOnly.includes(round)) continue;

applySkillEffect(skill, eff, rs, roundLog, actorLabel, defTroopBranch, round, alliedSlots, actingSlot, skillLevels, false);
}
}

// ── Commander-skill helpers ───────────────────────────────────────────────────
// `ctx` is only passed for commander skills (see applyCommanderSkillEffects);
// troop skills call applySkillEffect without it and keep their old behavior.
// A branch spec is a branch key, a faction key, "mounted" (role), or an array.
function skillSlotPred(spec) {
  if (!spec) return () => true;
  const list = Array.isArray(spec) ? spec : [spec];
  return sl => list.some(s => s === "mounted" ? sl.branchDef?.role === "mounted" : (sl.branch?.branch === s || sl.branch?.faction === s));
}
// Share of the attacking army's troops that match `spec` (0–1).
function armyShare(ctx, spec) {
  const slots = ctx?.atkSlots || [];
  const tot = slots.reduce((s, sl) => s + (sl.troops || 0), 0);
  if (!tot) return 0;
  const p = skillSlotPred(spec);
  return slots.filter(p).reduce((s, sl) => s + (sl.troops || 0), 0) / tot;
}
// Average unit stat of matching slots ("def" | "hpPer" | "dmgAvg"), used to turn flat +N stats into multipliers.
function armyAvg(ctx, spec, field, dflt) {
  const m = (ctx?.atkSlots || []).filter(skillSlotPred(spec));
  if (!m.length) return dflt;
  const val = sl => field === "dmgAvg" ? ((sl.tierData?.dmgLo ?? dflt) + (sl.tierData?.dmgHi ?? dflt)) / 2 : (sl[field] || dflt);
  return m.reduce((s, sl) => s + val(sl), 0) / m.length || dflt;
}
function armyAll(ctx, spec) { const s = ctx?.atkSlots || []; return s.length > 0 && s.every(skillSlotPred(spec)); }
// Enemy army contains a faction ("pirates") or is of an alignment ("humans" / "creatures").
function enemyIs(ctx, who) { return !!who && !!(ctx?.defFactions?.has(who) || ctx?.defAlignment === who); }
// Burn = the enemy deals -X% damage this round (consumed in the defender damage paths).
function applyBurn(rs, penalty) {
  rs.burnApplied = true;
  rs.burnDmgPenalty  = Math.max(rs.burnDmgPenalty  || 0, penalty || 0.20);
  rs.enemyBurnPenalty = Math.max(rs.enemyBurnPenalty || 0, penalty || 0.20); // separate field: defender troop skills also write burnApplied
}
// Poison DoT: pendingVenomDmg ticks next round; multi-round poisons are re-armed each round from ctx.cs.
function addPoison(rs, ctx, pct, rounds) {
  rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg || 0, pct);
  if (ctx?.cs && rounds > 1) ctx.cs.poisons.push({ pct, until: ctx.round + rounds - 1 });
}
// Timed/persistent effect re-applied each round from `from` to `until` (a key replaces an older one).
function setBuff(ctx, key, from, until, apply) {
  if (!ctx?.cs || until < from) return;
  if (key) ctx.cs.buffs = ctx.cs.buffs.filter(b => b.key !== key);
  ctx.cs.buffs.push({ key, from, until, apply });
}
// A debuff landing on our own commander: may be cleansed (Can't Stop Me), and arms Retaliation.
function debuffCommander(ctx, roundLog, actor, label, apply) {
  const cs = ctx?.cs;
  if (cs?.cleanseChance > 0 && Math.random() < cs.cleanseChance) {
    roundLog.actions.push({ actor, action: `✨ ${label || "Debuff"} — self-debuff cleansed!`, dmg: 0, isTroopSkill: true });
    return;
  }
  apply();
  if (cs?.retaliationBonus > 0) cs.pendingSkillBonus = cs.retaliationBonus;
}

// Effect resolver shared by troop skills (procTroopSkills) and commander
// skills (applyCommanderSkillEffects). `quiet` skips the generic log line.
function applySkillEffect(skill, eff, rs, roundLog, actorLabel, defTroopBranch, round, alliedSlots, actingSlot, skillLevels, quiet, ctx) {
// Battle-scope values some case blocks reference (were free variables here).
const defFaction = ctx?.defFaction ?? defTroopBranch?.faction;
const primaryDefSlot = ctx?.primaryDefSlot ?? null;
const atkSlotResolved = ctx?.atkSlots ?? alliedSlots ?? [];
const defSlotResolved = ctx?.defSlots ?? [];
const defTile = ctx?.defTile ?? null;
const atkCmdSpd = ctx?.atkCmdSpd ?? 60;
const cmdAtkStat = ctx?.cmdAtkStat ?? 150;
const cmdFocStat = ctx?.cmdFocStat ?? 0;
const bleedRoundsActive = ctx?.bleedRoundsActive ?? 0;
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
  case "lifesteal":     rs.lifesteal          = (rs.lifesteal || 0) + (eff.value || 0.50); break;
  case "immunity":      break;
  // ── Neutral-unit tag synergy effects ──────────────────────────────────
  // Active abilities that trigger between allied units sharing a tag (NOT a
  // passive blanket stat bonus): each one requires another allied slot
  // (from `alliedSlots`, same side as the acting unit, excluding itself)
  // whose `branchDef.tags` includes the target tag. If no such ally exists,
  // the ability simply has no target and does nothing this proc — no `rs`
  // change, no log line. See `shared/constants/neutralTroops.js` for which
  // of the 15 neutral units use these.
  case "tag_shield_ally": {
    // Bear Shaman — shields a random other beast-tagged ally by reducing
    // this side's incoming damage for the round. Reuses the existing
    // `dmg_reduce` field/cap rather than tracking a specific target slot's
    // HP separately.
    const tag = eff.tag || "beast";
    const hasAlly = (alliedSlots || []).some(s => s && s !== actingSlot && (s.troops || 0) > 0 && s.branchDef?.tags?.includes(tag));
    if (!hasAlly) break;
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.25));
    roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name} — shields a ${tag} ally!`, dmg:0, isTroopSkill:true });
    break;
  }
  case "tag_buff_allies_tag": {
    // Swarmwing Broodmother — buffs the attack of all beast-tagged allies.
    // Reuses `rs.troopAtkMult` (already side-wide) rather than a per-slot
    // buff table, gated on at least one other beast-tagged ally existing.
    const tag = eff.tag || "beast";
    const hasAlly = (alliedSlots || []).some(s => s && s !== actingSlot && (s.troops || 0) > 0 && s.branchDef?.tags?.includes(tag));
    if (!hasAlly) break;
    rs.troopAtkMult *= (1 + (eff.value || 0.20));
    roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name} — buffs all ${tag}-tagged allies!`, dmg:0, isTroopSkill:true });
    break;
  }
  case "tag_intercept_for_tag": {
    // Rubble Warden — intercepts a hit meant for another construct-tagged
    // ally, mitigating it with its own high DEF (approximated as a
    // dmg_reduce application, same pattern as other mitigation skills).
    const tag = eff.tag || "construct";
    const hasAlly = (alliedSlots || []).some(s => s && s !== actingSlot && (s.troops || 0) > 0 && s.branchDef?.tags?.includes(tag));
    if (!hasAlly) break;
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.20));
    roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name} — intercepts a hit for a ${tag} ally!`, dmg:0, isTroopSkill:true });
    break;
  }
  case "tag_full_shield_ally": {
    // Ruin Colossus — grants a construct-tagged ally a shield absorbing
    // nearly all of its next hit. See file-header note above the switch:
    // approximated via the existing 85%-capped `dmg_reduce` field (a "full"
    // always-zero-damage flag would need new plumbing at every hit
    // resolution call site, which is out of scope for this additive change).
    const tag = eff.tag || "construct";
    const hasAlly = (alliedSlots || []).some(s => s && s !== actingSlot && (s.troops || 0) > 0 && s.branchDef?.tags?.includes(tag));
    if (!hasAlly) break;
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.85));
    roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name} — full shield on a ${tag} ally!`, dmg:0, isTroopSkill:true });
    break;
  }
  case "tag_heal_ally_on_hit": {
    // Scavenger Chief — on landing a hit, heals a raider-tagged ally for a
    // % of the damage just dealt. Reuses the existing `rs.lifesteal`
    // pipeline (already consumed at commander-attack resolution) gated on
    // an eligible raider-tagged ally being present.
    const tag = eff.tag || "raider";
    const hasAlly = (alliedSlots || []).some(s => s && s !== actingSlot && (s.troops || 0) > 0 && s.branchDef?.tags?.includes(tag));
    if (!hasAlly) break;
    rs.lifesteal = (rs.lifesteal || 0) + (eff.value || 0.30);
    roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name} — heals a ${tag} ally!`, dmg:0, isTroopSkill:true });
    break;
  }
  // Troop passive damage reductions (applied as dmgReduce)
  case "focus_dmg_reduce":
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.02));
    break;
  case "ranged_dmg_reduce":
    rs.rangedDmgReduce = (rs.rangedDmgReduce || 0) + (eff.value || 0.03);
    break;
  // hp_stack: round_start HP stacking buff (Troll Tank)
  case "hp_stack":
    { const stacks = rs.hpStackStacks || 0;
      if (stacks < (eff.maxStacks || 5)) {
        rs.hpStackStacks = stacks + 1;
        rs.troopHpStackBonus = (rs.troopHpStackBonus || 0) + (eff.valuePerStack || 0.02);
      }
    }
    break;
  // heal_allies: round_end HP restore to allied troops (BattlePriests Mend)
  case "heal_allies":
    rs.healPct += (eff.value || 0.08);
    break;
  // self_siege_up: round_start siege stat increase (Acolyte Ley Line)
  case "self_siege_up": {
    const lvl2 = skillLevels?.["ley_line"] ?? 1;
    rs.armySiegeBonus = (rs.armySiegeBonus || 0) + Math.min(eff.maxValue || 10, (eff.valuePerLevel || 1) * lvl2);
    break;
  }
  // burn_apply: pure burn application, no damage (Drake Rider Flame Breath)
  case "burn_apply":
    rs.burnApplied    = true;
    rs.burnDmgPenalty = 0.20;
    rs.enemyAtkReduce += 0.20;
    roundLog.actions.push({ actor: actorLabel, action: `🔥 Flame Breath — Burn applied! Enemy DMG -20% (1 rnd)`, dmg: 0, isTroopSkill: true });
    break;
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
    if (ctx?.isCommander) rs.cmdMult *= (1 + (eff.value || 0)); // the skill's own "X% Physical Damage"
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
    if (ctx?.isCommander) {
      // Chance the branch evades; the next enemy hit this round is skipped if it lands on that branch
      if (Math.random() < (eff.value ?? eff.chance ?? 0.08)) rs.atkEvadeNextHit = Math.max(rs.atkEvadeNextHit || 0, armyShare(ctx, eff.branch));
    } else rs.branchEvasionChance = eff.chance || 0.08;
    break;
  case "stun_chance":
    if (Math.random() < (eff.value ?? eff.chance ?? 0.07)) {
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
    rs.mountedAtkStackBonus = eff.value ?? eff.valuePerStack ?? 0.006;
    if (ctx?.isCommander) { // +1 stack each round mounted units deal damage, up to max
      const stacks = Math.min(eff.maxStacks || 3, round), share = armyShare(ctx, "mounted");
      if (share > 0) rs.troopAtkMult *= 1 + stacks * (eff.value ?? eff.valuePerStack ?? 0.006) * share;
    }
    break;
  case "heal_branch":
    rs.healPct += (eff.value ?? eff.healPct ?? 0) * (ctx?.isCommander ? armyShare(ctx, eff.branch) : 1);
    break;
  case "branch_dmg_reduce":
    rs.troopDmgReduce += (eff.value || 0) * (ctx?.isCommander ? armyShare(ctx, eff.branch) : 1);
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
  // Skitter mechanics
  case "post_attack_proc_heal":
    rs.postAtkProcHeal = { chance: eff.chance || 0.04, healPct: eff.healPct || 0.05, targets: eff.targets || 2 };
    if (ctx?.isCommander) {
      const m = eff._lvlMul || 1; // chance and heal both scale with level
      if (Math.random() < (eff.chance || 0.04) * m) rs.healPct += (eff.healPct || 0.05) * m * Math.min(1, (eff.targets || 2) / Math.max(1, ctx.atkSlots?.length || 1));
    }
    break;
  case "aoe_focus_venom":
    rs.focusDmgBonus  += eff.value || 0;
    rs.aoeVenomChance  = eff.venomChance || 0.60;
    break;
  case "focus_damage_poison":
    rs.focusDmgBonus  += eff.value || 0;
    rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, eff.poisonDmg || 0.20);
    break;
  case "all_spider_army_bonus":
    rs.allSpiderBonus += eff.value || 0;
    break;
  case "enemy_spd_down_early":
    if (round <= (eff.maxRound || 4)) rs.enemySpdDownEarly += eff.value || 2.0;
    break;
  case "ally_followup_chance_early":
    if (round <= (eff.maxRound || 3)) {
      rs.allyFollowupEarly += eff.value ?? eff.chance ?? 0.08;
      if (ctx?.isCommander) rs.troopAtkMult *= 1 + (eff.value ?? eff.chance ?? 0.08); // expected extra attack
    }
    break;
  case "cotn_multi_branch_buff":
    rs.cotnMultiBranchBuff = { spider: eff.spider, vampire: eff.vampire, werewolf: eff.werewolf };
    break;
  case "focus_damage_spider_stack":
    rs.focusDmgBonus += eff.value || 0;
    rs.spiderDmgStacks = Math.min((rs.spiderDmgStacks || 0) + 1, eff.maxStacks || 4);
    break;
  case "vulnerability_stun_chance":
    rs.enemyDmgTakenUp       += eff.vulnValue || 0.02;
    rs.vulnerabilityStunChance = eff.stunChance || 0.10;
    if (Math.random() < rs.vulnerabilityStunChance) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
      roundLog.actions.push({ actor:actorLabel, action:`🪤 Trapped — Enemy stunned!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "heal_cleanse":
    rs.healPct    += eff.healPct || 0.12;
    rs.healCleanse = { cleanseChance: eff.cleanseChance || 0.70, targets: eff.targets || 2 };
    break;
  // Mourne mechanics
  case "enemy_dmg_down_early_foc":
    if (round <= (eff.maxRound || 4)) rs.enemyDmgDownEarlyFoc += eff.value || 0.01;
    break;
  case "post_attack_focus_dmg":
    rs.postAtkFocusDmgOne = { chance: eff.chance || 0.50, value: eff.value || 0.10 };
    break;
  case "focus_damage_stun_guaranteed":
    rs.focusDmgBonus += eff.value || 0;
    rs.focusStunGuaranteed = true;
    rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
    roundLog.actions.push({ actor:actorLabel, action:`⚡ Got Ya — Enemy stunned!`, dmg:0, isTroopSkill:true });
    break;
  case "faction_def_bonus":
    rs.factionDefBonus += eff.value || 0;
    break;
  case "dual_instance_buff_foc":
    rs.dualInstanceBuff   = { instances: eff.instances || 3, dmgReduce: eff.dmgReduce || 0.008, dmgUp: eff.dmgUp || 0.008 };
    rs.dualInstancesLeft  = eff.instances || 3;
    break;
  case "inquisitor_rally":
    rs.inquisitorRally = { followupChance: eff.followupChance || 0.05, stunImmuneChance: eff.stunImmuneChance || 0.07, maxRound: eff.maxRound || 5 };
    break;
  case "branch_heal_then_block":
    rs.healPct += eff.healPct || 0.50;
    rs.branchHealThenBlock = { branch: eff.branch, permanentHealBlock: eff.permanentHealBlock };
    break;
  case "cmd_normal_atk_aoe_focus":
    rs.postAtkFocusDmgAll += eff.value || 0.06;
    break;
  case "vs_all_dmg_up":
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.03);
    break;
  case "dmg_type_resist_all":
    rs.dmgTypeResistAll += eff.focusResist || 0.03;
    break;
  case "per_round_cleanse_chance":
    rs.perRoundCleanseChance += eff.chance || 0.06;
    break;
  // Seraph mechanics
  case "physical_damage_faction_bonus":
    rs.cmdMult = (rs.cmdMult || 1) * (1 + (eff.primaryDmg || 0.30));
    rs.physDmgFactionBonus = { bonusDmg: eff.bonusDmg || 0.20, bonusFaction: eff.bonusFaction || "nightcreatures" };
    break;
  case "physical_damage_faction_heal":
    rs.cmdMult = (rs.cmdMult || 1) * (1 + (eff.value || 0.30));
    rs.factionHealPct    = eff.healPct || 0.10;
    rs.meleeBonusHealPct = eff.meleeBonusHeal || 0.75;
    break;
  case "aoe_physical_atk_mod":
    rs.aoePhysAtkMod += eff.value || 0.20;
    rs.cmdAoe = true;
    break;
  case "reactive_cleanse_or_def_stack":
    rs.divinePrayerCleanse = eff.cleanseChance || 0.03;
    // Applied reactively when debuff lands — handled in debuff application logic
    break;
  case "stun_immunity_chance_early":
    if (round <= (eff.maxRound || 4) && Math.random() < (eff.chance || 0.10)) {
      rs.invisStunImmune = true; // reuse existing stun immunity flag
      roundLog.actions.push({ actor: actorLabel, action: `🛡️ ${skill.name} — Stun Immunity gained!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "physical_damage_stun_guaranteed":
    rs.focusDmgBonus += eff.value || 0.15;
    rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
    roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill.name} — Enemy stunned!`, dmg: 0, isTroopSkill: true });
    break;
  // Dante mechanics
  case "double_edge_dmg":
    rs.doubleEdgeDmgUp    += eff.dmgUp || 0.02;
    rs.doubleEdgeDmgRecUp += eff.dmgReceivedUp || 0.01;
    rs.troopAtkMult       *= (1 + (eff.dmgUp || 0.02));
    rs.dmgReduce          -= (eff.dmgReceivedUp || 0.01); // penalty: less damage reduction
    break;
  case "double_edge_faction":
    // Applied during damage calculation per unit faction check
    rs.doubleEdgeDmgUp    += eff.dmgUp || 0.02;
    rs.doubleEdgeDmgRecUp += eff.dmgReceivedUp || 0.01;
    break;
  case "chaos_confusion":
    rs.chaosConfusionAlly  = eff.allyChance  || 0.07;
    rs.chaosConfusionEnemy = eff.enemyChance || 0.10;
    // Apply enemy confusion
    if (Math.random() < rs.chaosConfusionEnemy) {
      rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1);
      roundLog.actions.push({ actor: actorLabel, action: `🔥 Whatever It Takes — Enemy confused!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "enemy_cmd_atk_drain":
    rs.enemyCmdAtkDrain = Math.max(0, (eff.initialDrain || 7) - ((round - 1) * (eff.decayPerRound || 10)));
    break;
  case "unit_evasion_first_hits":
    rs.unitEvasionFirstHits = { chance: eff.chance || 0.04, maxHits: eff.maxHits || 4 };
    break;
  case "poison_damage_heal_block":
    rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, eff.poisonDmg || 0.30);
    rs.blockHeal       = Math.max(rs.blockHeal, eff.healBlockDuration || 2);
    break;
  case "branch_max_dmg_chance":
    rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + (eff.chance || 0.08));
    break;
  case "branch_focus_resist":
    rs.focusPoisonResist += eff.value || 0.01;
    break;
  case "heal_faction":
    rs.healPct += eff.healPct || 0.17;
    break;
  // Brennan mechanics
  case "heal_def_buff":
    rs.healPct     += eff.healPct || 0.12;
    rs.healDefBuff  = { targets: eff.targets || 2, defBonus: eff.defBonus || 0.15, defDuration: eff.defDuration || 2 };
    break;
  case "on_hit_heal_chance":
    rs.onHitHealChance = { targets: eff.targets || 2, chance: eff.chance || 0.40, healPct: eff.healPct || 0.04, guaranteed: eff.guaranteed || false };
    break;
  case "heal_cleanse_all":
    rs.healPct       += eff.healPct || 0.10;
    rs.healCleansAll  = { cleanseChance: eff.cleanseChance || 0.08 };
    break;
  case "heal_double_chance":
    rs.healPct         += eff.healPct || 0.08;
    rs.healDoubleChance = { branch: eff.branch || "holyknights", healPct: eff.healPct || 0.08, doubleChance: eff.doubleChance || 0.50 };
    break;
  case "decaying_dmg_reduce":
    rs.decayingDmgReduce = eff.value || 0.06;
    rs.decayFraction     = eff.decayFraction || 0.25;
    rs.hitsUntilDecayGone = eff.maxHits || 4;
    rs.dmgReduce         += rs.decayingDmgReduce;
    break;
  case "role_dmg_bonus":
    rs.roleDmgBonus += eff.value || 0.03;
    rs.troopAtkMult *= (1 + (eff.value || 0.03));
    break;
  case "role_dmg_bonus_vs_faction":
    rs.roleDmgBonusVsFaction = { role: eff.role, bonusFaction: eff.bonusFaction, value: eff.value || 0.02 };
    break;
  case "heal_all":
    rs.healPct += eff.healPct || 0.50;
    break;
  // Vayne mechanics
  case "early_round_dmg_up":
    if (round <= (eff.maxRound || 2)) {
      rs.earlyRoundDmgUp += eff.value || 0.03;
      rs.troopAtkMult    *= (1 + (eff.value || 0.03));
      if (eff.stunImmunityWhileActive) rs.earlyRoundStunImmune = true;
    }
    break;
  case "early_round_dmg_up_all":
    if (round <= (eff.maxRound || 2)) {
      rs.earlyRoundDmgUp += eff.value || 0.014;
      rs.troopAtkMult    *= (1 + (eff.value || 0.014));
      rs.cmdMult         *= (1 + (eff.value || 0.014));
    }
    break;
  case "on_hit_bonus_dmg":
    rs.onHitBonusDmg = { chance: eff.chance || 0.07, bonusDmg: eff.bonusDmg || 0.50 };
    break;
  case "per_round_def_stack":
    if (!rs.perRoundDefStack) rs.perRoundDefStack = { faction: eff.faction, chance: eff.chance, defPerStack: eff.defPerStack, maxStacks: eff.maxStacks, current: 0 };
    if (rs.perRoundDefStack.current < rs.perRoundDefStack.maxStacks && Math.random() < rs.perRoundDefStack.chance) {
      rs.perRoundDefStack.current++;
      rs.troopDefMult *= (1 + (rs.perRoundDefStack.defPerStack / 100));
    }
    break;
  case "physical_damage_and_heal":
    rs.cmdMult        *= (1 + (eff.value ?? eff.enemyDmg ?? 0.12));
    rs.physDmgAndHeal  = { allyHeal: eff.allyHeal || 0.13 };
    if (ctx?.isCommander) rs.healPct += (eff.allyHeal || 0.13) * (eff._lvlMul || 1) / Math.max(1, ctx.atkSlots?.length || 1); // 1 allied unit
    break;
  case "dmg_resist_vs_faction":
    rs.dmgResistVsFaction += eff.value || 0.01;
    if (!ctx?.isCommander || enemyIs(ctx, eff.faction)) rs.dmgReduce += eff.value || 0.01;
    break;
  case "enemy_dmg_down_early_atk":
    if (round <= (eff.maxRound || 4)) rs.enemyDmgDown += eff.value || 0.007;
    break;
  case "branch_dmg_bonus":
    rs.branchDmgBonus += eff.value || 0.03;
    rs.troopAtkMult   *= (1 + (eff.value || 0.03) * (ctx?.isCommander ? armyShare(ctx, eff.branch) : 1)); // troop skills unchanged
    break;
  case "physical_damage_multi":
    rs.cmdMult *= (1 + (eff.value || 0.12));
    if (eff.bonusDmg && (!eff.prioritise || ctx?.defRoles?.has(eff.prioritise))) rs.cmdMult *= (1 + eff.bonusDmg); // max-level bonus vs prioritised role
    break;
  case "physical_damage_single":
    rs.cmdMult *= (1 + (eff.value || 0.60));
    break;
  // Aldric mechanics
  case "hk_triple_stat_bonus":
    rs.hkTripleStatBonus = { dmgUp: eff.dmgUp || 0.006, defBonus: eff.defBonus || 6, spdBonus: eff.spdBonus || 6 };
    rs.troopAtkMult *= (1 + (eff.dmgUp || 0.006));
    break;
  case "per_round_stun_immune_chance":
    if (Math.random() < (eff.chance || 0.05)) {
      rs.invisStunImmune = true;
      roundLog.actions.push({ actor: actorLabel, action: `🧱 Stoic Hero — Stun Immunity gained this round!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "branch_heal_per_round":
    rs.healPct += eff.healPct || 0.05;
    break;
  case "day_max_dmg_chance":
    rs.dayMaxDmgChance = eff.chance || 0.04;
    rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + rs.dayMaxDmgChance);
    break;
  case "self_sacrifice_for_army":
    if (!rs.selfSacrificeActive && round === 4) {
      rs.selfSacrificeActive = true;
      // Halve commander FOC and SPD — flagged for stat application
      roundLog.actions.push({ actor: actorLabel, action: `⚖️ Warrior's Burden — Aldric sacrifices FOC & SPD for his troops!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "day_night_faction_split": {
    const utcHour = new Date().getUTCHours();
    const isNight = utcHour < 6 || utcHour >= 18;
    rs.dayNightFactionSplit = { isNight, nightResist: eff.nightResist || 0.015, dayBonus: eff.dayBonus || 0.10 };
    if (isNight) rs.dmgReduce += eff.nightResist || 0.015;
    break;
  }
  case "reactive_cmd_atk_stack":
    if (!rs.reactCmdAtkStack) rs.reactCmdAtkStack = { atkPerStack: eff.atkPerStack || 1.0, maxStacks: eff.maxStacks || 6, current: 0 };
    break;
  // Korgath mechanics
  case "cmd_normal_atk_aoe_physical":
    rs.cmdAoePhysical += eff.value || 0.06;
    rs.cmdAoe = true;
    // Normal attack also hits every enemy unit for X% → X% per enemy unit on the pooled enemy HP
    if (ctx?.isCommander) rs.cmdMult *= (1 + (eff.value || 0.06) * Math.max(1, ctx.defSlotCount || 1));
    break;
  case "multi_hit_random_def_down":
  { const hits = eff.hits || 5, per = eff.value ?? eff.dmgPct ?? 0.08, dd = eff.defDown || 0.10, max = eff.maxDefStacks || 5;
    rs.multiHitRandomDefDown = { hits, dmgPct: per, defDown: dd, maxStacks: max };
    rs.cmdMult *= (1 + hits * per);
    if (ctx?.cs) { // DEF-down stacks persist for the rest of the battle
      const key = `defDown:${skill?.name}`;
      const stacks = ctx.cs.stacks[key] = Math.min(max, (ctx.cs.stacks[key] || 0) + hits);
      setBuff(ctx, key, round, 99, r => { r.enemyDefDown = (r.enemyDefDown || 0) + stacks * dd; });
      rs.enemyDefDown = (rs.enemyDefDown || 0) + stacks * dd;
    } else rs.enemyDefDown = Math.min((rs.enemyDefDown||0) + dd, max * dd);
    break; }
  case "on_skill_stun_chance":
  { const tries = ctx?.isCommander ? (ctx.activesFired || 0) : 1; // one roll per skill activation
    for (let i = 0; i < tries; i++) if (Math.random() < (eff.value ?? eff.chance ?? 0.05)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
      roundLog.actions.push({ actor: actorLabel, action: `👁️ ${skill?.name||"Killer's Aura"} — Enemy unit stunned!`, dmg: 0, isTroopSkill: true });
      break;
    }
    break; }
  case "cmd_dmg_bonus_vs_stunned":
    if (rs.enemyStunned > 0) rs.cmdMult *= (1 + (eff.value || 0.04));
    rs.cmdDmgBonusVsStunned += eff.value || 0.04;
    break;
  case "attacking_stance_bonus":
    rs.attackingStanceDmg += eff.value ?? eff.cmdDmgUp ?? 0.02;
    rs.cmdMult            *= (1 + (eff.value ?? eff.cmdDmgUp ?? 0.02));
    // "Army DEF +N" is flat DEF (was applied as N%)
    rs.troopDefMult       *= 1 + ((eff.armyDefUp || 2.0) * (eff._lvlMul || 1)) / (ctx?.isCommander ? armyAvg(ctx, null, "def", 20) : 100);
    break;
  case "skill_dmg_vs_faction":
    rs.skillDmgVsFaction = { faction: eff.faction || "humans", value: eff.value || 0.02 };
    if (!ctx?.isCommander || enemyIs(ctx, eff.faction || "humans")) rs.skillDmgBonus += eff.value || 0.02;
    break;
  case "physical_damage_heal_block":
    rs.cmdMult   *= (1 + (eff.value || 0.20));
    rs.blockHeal = Math.max(rs.blockHeal || 0, eff.healBlockDuration || 1); // blocks the OTHER side's heals
    break;
  // Bruk mechanics
  case "multi_branch_def_bonus":
    rs.multiBranchDefBonus = { branches: eff.branches, defBonus: eff.value ?? eff.defBonus ?? 2.0, defendingBonus: eff.defendingBonus || 1.0 };
    // Flat DEF on the listed branches (defending bonus n/a: battle sim is the attacker)
    rs.troopDefMult *= ctx?.isCommander
      ? 1 + ((eff.value ?? eff.defBonus ?? 2.0) / armyAvg(ctx, eff.branches, "def", 20)) * armyShare(ctx, eff.branches)
      : 1 + (eff.defBonus || 2.0) / 100;
    break;
  case "multi_branch_dmg_reduce":
    rs.dmgReduce += (eff.value || 0.02) * (ctx?.isCommander ? armyShare(ctx, eff.branches) : 1);
    break;
  case "dmg_bonus_vs_status":
    rs.dmgBonusVsBleed += eff.value || 0.10;
    if (bleedRoundsActive > 0 || rs.bleedApplied) rs.troopAtkMult *= (1 + (eff.value || 0.10) * (ctx?.isCommander ? armyShare(ctx, eff.branches) : 1));
    break;
  case "branch_followup_chance":
    rs.branchFollowupChance = { branch: eff.branch, chance: eff.value ?? eff.chance ?? 0.07, followupDmg: eff.followupDmg || 0.30 };
    if (ctx?.isCommander) {
      const share = armyShare(ctx, eff.branch);
      if (share > 0 && Math.random() < (eff.value ?? eff.chance ?? 0.07)) rs.troopAtkMult *= 1 + (eff.followupDmg || 0.30) * share;
    }
    break;
  case "physical_damage_focus_fire":
    rs.cmdMult  *= (1 + (eff.value || 0.20));
    rs.focusFire = { duration: eff.focusFireDuration || 1 };
    break;
  case "on_hit_bleed_heal":
    rs.onHitBleedHeal += eff.value ?? eff.healPct ?? 0.05;
    if (ctx?.isCommander && (bleedRoundsActive > 0 || rs.bleedApplied)) rs.healPct += eff.value ?? eff.healPct ?? 0.05;
    break;
  case "faction_dual_stat_bonus":
  { const share = ctx?.isCommander ? armyShare(ctx, eff.faction || ctx.ownFaction) : 1;
    const up = eff.value ?? eff.dmgUp ?? 0.01, down = (eff.dmgReceivedDown || 0.005) * (eff._lvlMul || 1);
    rs.factionDualStatBonus = { dmgUp: up, dmgReceivedDown: down };
    rs.troopAtkMult *= (1 + up * share);
    rs.dmgReduce    += down * share;
    break; }
  case "flat_troop_def_bonus":
    rs.flatTroopDefBonus += eff.value || 4;
    rs.troopDefMult      *= 1 + (eff.value || 4) / (ctx?.isCommander ? armyAvg(ctx, null, "def", 20) : 100); // flat DEF
    break;
  case "cmd_stun_chance":
    if (Math.random() < (eff.value ?? eff.chance ?? 0.09)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
      roundLog.actions.push({ actor: actorLabel, action: `💥 ${skill?.name||"Ground Shake"} — Enemy commander stunned!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "branch_def_spd_tradeoff":
    rs.trollDefSpdTradeoff = { defBonus: eff.value ?? eff.defBonus ?? 0.03, spdPenalty: eff.spdPenalty || 0.90 };
    if (ctx?.isCommander) {
      rs.troopDefMult *= 1 + (eff.value ?? eff.defBonus ?? 0.03) * armyShare(ctx, eff.branch);
      rs.slotSpdBonus = rs.slotSpdBonus || [];
      (ctx.atkSlots || []).forEach((sl, i) => { if (sl.branch?.branch === eff.branch) rs.slotSpdBonus[i] = (rs.slotSpdBonus[i] || 0) - (sl.spd || 0) * (eff.spdPenalty || 0.90); });
    } else rs.troopDefMult *= (1 + (eff.defBonus || 0.03));
    break;
  // Grix mechanics
  case "dual_poison_dot_def_down":
    rs.dualPoisonDotStacks += eff.poisonStacks || 2;
    addPoison(rs, ctx, (eff.value ?? eff.poisonDmg ?? 0.03) * (eff.poisonStacks || 2), eff.poisonDuration || 3);
    rs.enemyDefDown    = Math.min((rs.enemyDefDown || 0) + (eff.defDown || 0.10), 0.50);
    break;
  case "focus_dmg_vs_poisoned":
    rs.focusDmgVsPoisoned += eff.value || 0.10;
    if (rs.dualPoisonDotStacks > 0 || ctx?.poisonActive || (rs.pendingVenomDmg || 0) > 0) rs.focusDmgBonus += eff.value || 0.10;
    break;
  case "poison_tick_ally_heal":
    rs.poisonTickAllyHeal = { triggerRound: eff.triggerRound || 7, healPct: eff.value ?? eff.healPct ?? 0.20 };
    if (round === (eff.triggerRound || 7) && (ctx?.poisonActive || rs.dualPoisonDotStacks > 0 || (rs.pendingVenomDmg || 0) > 0)) {
      rs.healPct += eff.value ?? eff.healPct ?? 0.20;
      roundLog.actions.push({ actor: actorLabel, action: `💚 ${skill?.name||"You Hurt, We Win"} — All allies heal ${Math.round((eff.value ?? eff.healPct ?? 0.20)*100)}% HP!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "burn_damage_apply":
    rs.focusDmgBonus += eff.value || 0.17;
    if (Math.random() < (eff.burnChance || 0.60)) {
      applyBurn(rs, eff.burnDmgPenalty || 0.20); // Burn = enemy DMG dealt -X% this round (was also cutting OUR damage via enemyAtkReduce)
      roundLog.actions.push({ actor: actorLabel, action: `🔥 Burn applied — enemy DMG -${Math.round((eff.burnDmgPenalty||0.20)*100)}% (1 rnd)`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "heal_highest_def_self_debuff":
  { const n = ctx?.isCommander ? Math.max(1, ctx.atkSlots?.length || 1) : 1; // one allied unit
    rs.healPct += (eff.value ?? eff.healPct ?? 0.20) / n;
    rs.healHighestDefDebuff = { dmgPenalty: eff.dmgPenalty || 0.10, duration: eff.penaltyDuration || 1 };
    if (ctx?.isCommander) rs.troopAtkMult *= 1 - (eff.dmgPenalty || 0.10) / n;
    break; }
  case "random_army_effect":
    if (Math.random() < (eff.value ?? eff.chance ?? 0.08)) {
      const effects = eff.effects || ["dmg_up","dmg_received_up","confusion_immune","confusion"];
      const chosen  = effects[Math.floor(Math.random() * effects.length)];
      if      (chosen === "dmg_up")           { rs.troopAtkMult *= 1.10; roundLog.actions.push({ actor: actorLabel, action: `🎲 ${skill?.name} — Army DMG +10%!`, dmg: 0, isTroopSkill: true }); }
      else if (chosen === "dmg_received_up")  { rs.dmgReduce    -= 0.05; roundLog.actions.push({ actor: actorLabel, action: `🎲 ${skill?.name} — Army DMG Received +5%!`, dmg: 0, isTroopSkill: true }); }
      else if (chosen === "confusion_immune") { rs.atkConfusionImmune = true; rs.invisStunImmune = true; roundLog.actions.push({ actor: actorLabel, action: `🎲 ${skill?.name} — Army Confusion Immune!`, dmg: 0, isTroopSkill: true }); }
      else if (chosen === "confusion") {
        // Confused army: like confused enemies, only ~50% of it acts normally this round
        if (!rs.atkConfusionImmune) rs.troopAtkMult *= 0.5;
        roundLog.actions.push({ actor: actorLabel, action: `🎲 ${skill?.name} — Army Confused!${rs.atkConfusionImmune ? " (immune)" : ""}`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  case "dual_type_damage_apply":
  { const m = eff._lvlMul || 1, pd = (eff.poisonDmg || 0.20) * m, bd = (eff.burnDmg || 0.20) * m;
    rs.focusDmgBonus += pd + bd;
    if (Math.random() < (eff.poisonChance || 0.40)) addPoison(rs, ctx, pd, 1);
    if (Math.random() < (eff.burnChance  || 0.40)) applyBurn(rs, 0.20);
    rs.dualTypeDmgApply = { allyDefPerDebuff: eff.allyDefPerDebuff || 15, allyDefTargets: eff.allyDefTargets || 2 };
    if (ctx?.isCommander && eff.allyDefPerDebuff) { // max level: allies +DEF per enemy debuff
      const debuffs = [(rs.pendingVenomDmg||0) > 0 || ctx.poisonActive, rs.burnApplied, rs.bleedApplied || bleedRoundsActive > 0,
        (rs.enemyStunned||0) > 0, (rs.enemyConfused||0) > 0, (rs.enemyDefDown||0) > 0 || (rs.enemyDefFlatDown||0) > 0].filter(Boolean).length;
      if (debuffs) rs.troopDefMult *= 1 + (eff.allyDefPerDebuff * debuffs / armyAvg(ctx, null, "def", 20)) * Math.min(1, (eff.allyDefTargets || 2) / Math.max(1, ctx.atkSlots?.length || 1));
    }
    break; }
  case "army_siege_bonus":
    rs.armySiegeBonus += eff.value || 2;
    break;
  // Grimtusk mechanics
  case "physical_damage_self_dmg_up":
    rs.cmdMult *= (1 + (eff.value || 0.12));
    if (Math.random() < (eff.procChance || 0.30)) {
      const up = eff.selfDmgUp || 0.10, dur = eff.selfDmgDuration || 2;
      rs.cmdMult *= (1 + up);
      setBuff(ctx, null, round + 1, round + dur - 1, r => { r.cmdMult *= (1 + up); });
      roundLog.actions.push({ actor: actorLabel, action: `⚔️ ${skill?.name||"Assault"} — CMD DMG +${Math.round(up*100)}% (${dur} rnd)!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "physical_damage_ranged_bonus":
  { // Ranged priority: vs a Ranged enemy, chance for +X% of the skill's damage
    const vsRanged = !!ctx?.defRoles?.has("ranged");
    let hit = eff.value || 0.15;
    if (vsRanged && Math.random() < (eff.rangedBonusChance ?? 0.50)) hit *= 1 + (eff.rangedBonusDmg ?? 1.0);
    rs.cmdMult *= (1 + hit);
    if (vsRanged && eff.burnChanceOnRanged && Math.random() < eff.burnChanceOnRanged) applyBurn(rs, 0.20);
    break; }
  case "reactive_skill_dmg_on_debuff":
    // Commander: configured in applyCommanderSkillEffects (cs.retaliationBonus), triggered by debuffCommander()
    if (!ctx?.isCommander) rs.reactiveSkillDmgOnDebuff = eff.bonus || 0.05;
    break;
  case "attacking_defending_split":
    rs.attackingDefendingSplit = { attackDmgUp: eff.value ?? eff.attackDmgUp ?? 0.015, defendDmgDown: (eff.defendDmgDown || 0.01) * (eff._lvlMul || 1) };
    rs.cmdMult *= (1 + (eff.value ?? eff.attackDmgUp ?? 0.015)); // battle sim is always the attacker
    break;
  case "reactive_cleanse_chance":
    // Commander: configured in applyCommanderSkillEffects (cs.cleanseChance), rolled by debuffCommander()
    if (!ctx?.isCommander) rs.reactiveCleanseChance += eff.chance || 0.05;
    break;
  case "cmd_dmg_bonus_vs_faction":
    rs.cmdDmgVsFaction = { faction: eff.faction || "pirates", value: eff.value || 0.02 };
    if (!ctx?.isCommander || enemyIs(ctx, eff.faction || "pirates")) rs.cmdMult *= (1 + (eff.value || 0.02));
    break;
  case "per_skill_army_def_stack":
  { // +DEF (flat) to the branch per commander skill activation, persists all battle
    const cs = ctx?.cs, per = eff.value ?? eff.defPerStack ?? 0.5, max = eff.maxStacks || 15;
    const key = `defStack:${skill?.name}`;
    const stacks = cs ? (cs.stacks[key] = Math.min(max, (cs.stacks[key] || 0) + (ctx.activesFired || 0))) : 1;
    if (stacks > 0) rs.troopDefMult *= 1 + (stacks * per / armyAvg(ctx, eff.branch, "def", 20)) * (ctx ? armyShare(ctx, eff.branch) : 1);
    break; }
  // Ashgrip mechanics
  case "reactive_branch_dmg_range_stack":
  { // Branch units gain a DMG +min-max stack each round they were hit (from round 2), max N
    const stacks = Math.min(eff.maxStacks || 4, Math.max(0, round - 1));
    const share = ctx ? armyShare(ctx, eff.branch) : 0;
    if (stacks > 0 && share > 0) {
      const add = stacks * ((eff.value ?? eff.dmgMin ?? 2) + (eff.dmgMax ?? 3)) / 2;
      rs.troopAtkMult *= 1 + (add / armyAvg(ctx, eff.branch, "dmgAvg", 22)) * share;
    }
    break; }
  case "all_branch_army_bonus":
    if (!ctx?.isCommander || armyAll(ctx, eff.branch)) {
      rs.troopAtkMult *= (1 + (eff.value || 0.01));
      rs.troopDefMult *= (1 + (eff.value || 0.01));
    }
    break;
  case "all_branch_cmd_stats":
    if (ctx?.isCommander && armyAll(ctx, eff.branch)) {
      const v = eff.value ?? eff.atkPerLevel ?? 1;
      rs.cmdAtkFlat  = (rs.cmdAtkFlat  || 0) + v;
      rs.cmdFocFlat  = (rs.cmdFocFlat  || 0) + v;
      rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + v;
    }
    break;
  case "mounted_on_hit_followup":
  { // Mounted units: chance per round for an extra hit at X% damage (+ max: chance DEF down on it)
    const share = ctx ? armyShare(ctx, "mounted") : 0;
    if (share > 0 && Math.random() < (eff.value ?? eff.chance ?? 0.06)) {
      rs.troopAtkMult *= 1 + (eff.followupDmg || 0.40) * share;
      roundLog.actions.push({ actor: actorLabel, action: `🐺 ${skill?.name||"Mounted Fury"} — mounted follow-up +${Math.round((eff.followupDmg||0.40)*100)}%!`, dmg: 0, isTroopSkill: true });
      if (eff.followupDefDownChance && Math.random() < eff.followupDefDownChance) rs.enemyDefDown = (rs.enemyDefDown || 0) + (eff.followupDefDown || 0.10);
    }
    break; }
  case "physical_damage_mounted_composition":
  { let hit = eff.value || 0.20;
    if (ctx?.isCommander) {
      if (armyAll(ctx, "warg_riders")) hit *= 1 + (eff.allWargBonus || 0.60);
      else if (armyAll(ctx, "mounted")) hit *= 1 + (eff.allMountedBonus || 0.30);
    }
    rs.cmdMult *= (1 + hit);
    break; }
  case "dmg_bonus_vs_size":
    rs.dmgBonusVsSize += eff.value || 0.01;
    if (!ctx?.isCommander || ctx.defSizes?.has(eff.size || "large")) { // troop skills: unconditional (unchanged)
      rs.troopAtkMult   *= (1 + (eff.value || 0.01));
      rs.cmdMult        *= (1 + (eff.value || 0.01));
    }
    break;
  case "physical_damage_multi_prioritise":
    rs.cmdMult *= (1 + (eff.value || 0.40));
    rs.physDmgMultiPrioritise = { targets: eff.targets || 2, prioritise: eff.prioritise || "large" };
    break;
  // Warcroak mechanics
  case "command_differential_bonus": {
    // +N DEF and +N HP (flat, per unit) for every `commandStep` (4) Command more than the enemy.
    // Command = troops × COMMAND_COST (57 command = 5,700 small troops), both sides alive this round.
    // Owner example: 80 vs 55 command at max (N=7) → floor(25/4)=6 steps → +42 DEF / +42 HP.
    const per = eff.value ?? eff.defPerCommand ?? 1.0;
    const hpPer = (eff.hpPerCommand ?? 1.0) * (eff._lvlMul || 1);
    rs.commandDifferentialBonus = { defPerCommand: per, hpPerCommand: hpPer };
    if (ctx?.isCommander) {
      const steps = Math.floor(Math.max(0, (ctx.atkCmdReal || 0) - (ctx.defCmdReal || 0)) / (eff.commandStep || 4));
      if (steps > 0) {
        rs.troopDefMult *= 1 + (steps * per) / armyAvg(ctx, null, "def", 20) + (steps * hpPer) / armyAvg(ctx, null, "hpPer", 25);
        rs.commandDifferentialBonus.steps = steps;
      }
    }
    break; }
  case "faction_dmg_bonus_conditional":
  { let v = eff.value || 0.01;
    if (enemyIs(ctx, eff.conditionalFaction)) v += (eff.conditionalBonus || 0.01) * (eff._lvlMul || 1);
    rs.troopAtkMult *= 1 + v * (ctx?.isCommander ? armyShare(ctx, ctx.ownFaction) : 1);
    break; }
  case "aoe_multi_status":
    rs.cmdAoe = true;
    rs.cmdMult *= (1 + (eff.value || 0.20));
    if (Math.random() < (eff.burnChance  || 0.30)) applyBurn(rs, 0.20);
    if (Math.random() < (eff.poisonChance|| 0.30)) addPoison(rs, ctx, 0.20, 1);
    if (Math.random() < (eff.bleedChance || 0.30)) { rs.bleedApplied = true; rs.pendingBleedDmg = 0.30; rs.bleedRoundsLeft = 2; }
    if (eff.stunChance && Math.random() < eff.stunChance) { rs.enemyStunned = Math.max(rs.enemyStunned||0, 1); }
    break;
  // ── Reck mechanics ────────────────────────────────────────────────────────
  case "aoe_physical_drunk":
    rs.cmdAoe = true;
    rs.cmdMult *= (1 + (eff.value || 0.06));
    if (Math.random() < (eff.drunkChance || 0.60)) {
      rs.drunkApplied = true;
      rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance || 0) + (eff.drunkMissChance || 0.30));
      roundLog.actions.push({ actor:actorLabel, action:`🛢️ Drunk applied — 30% miss, no evade!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "aoe_physical_bonus_vs_drunk":
    rs.cmdAoe  = true;
    rs.cmdMult *= (1 + (eff.value || 0.07));
    if (rs.drunkApplied) rs.cmdMult *= (1 + (eff.bonusDmgIfDrunk || 1.40));
    break;
  case "dmg_bonus_vs_faction_all":
    rs.dmgBonusVsFactionAll += eff.value || 0.01;
    rs.cmdMult      *= (1 + (eff.value || 0.01));
    rs.troopAtkMult *= (1 + (eff.value || 0.01));
    break;
  case "multi_hit_random_faction_heal":
    rs.cmdMult *= (1 + (eff.dmgPct || 0.11));
    rs.healPct += eff.healPct || 0.60;
    break;
  case "physical_damage_heal_block_chance":
    rs.cmdMult *= (1 + (eff.value || 0.14));
    if (Math.random() < (eff.healBlockChance || 0.70)) rs.blockHeal = Math.max(rs.blockHeal || 0, eff.healBlockDuration || 2);
    break;
  case "per_round_confusion_immune_chance":
    rs.perRoundConfusionImmune += eff.chance || 0.03;
    if (Math.random() < rs.perRoundConfusionImmune) {
      rs.invisStunImmune = true;
      roundLog.actions.push({ actor:actorLabel, action:`🌊 Sea Earned Resilience — Confusion Immune!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "all_faction_skill_dmg_bonus":
    rs.allFactionSkillDmg = { faction: eff.faction || "pirates", value: eff.value || 0.03 };
    rs.skillDmgBonus += eff.value || 0.03;
    break;
  case "confusion_vs_alignment":
    rs.confusionVsAlignment = { alignment: eff.alignment, chance: eff.chance || 0.10 };
    if (Math.random() < (eff.chance || 0.10)) {
      rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1);
      roundLog.actions.push({ actor:actorLabel, action:`💨 Smokescreen — Creature units confused!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "cmd_atk_per_faction_slot":
    rs.cmdAtkPerFactionSlot = { faction: eff.faction || "pirates", atkPerSlot: eff.atkPerSlot || 0.5, maxSlots: eff.maxSlots || 3 };
    break;
  case "physical_damage_stun_chance":
    rs.cmdMult *= (1 + (eff.value || 0.15));
    if (Math.random() < (eff.stunChance || 0.55)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
      roundLog.actions.push({ actor:actorLabel, action:`🃏 Pirate's Trick — Enemy stunned!`, dmg:0, isTroopSkill:true });
    }
    break;
  // ── Seyne mechanics ───────────────────────────────────────────────────────
  case "aoe_def_down":
    rs.aoeDefDown     += eff.value || 1.0;
    rs.enemyDefFlatDown    = Math.min((rs.enemyDefFlatDown||0) + (eff.value||1.0), 50);
    break;
  case "dmg_bonus_vs_debuffed":
    rs.dmgBonusVsDebuffed += eff.value || 0.02;
    if (rs.enemyDefDown > 0 || rs.enemyDefFlatDown > 0) rs.troopAtkMult *= (1 + (eff.value || 0.02));
    break;
  case "faction_dmg_bonus":
    rs.factionDmgBonus += eff.value || 0.01;
    rs.troopAtkMult    *= (1 + (eff.value || 0.01));
    break;
  case "faction_followup_per_round":
    rs.factionFollowupPerRound += eff.chance || 0.03;
    break;
  case "drunk_chance_multi":
    rs.drunkChanceMulti += eff.drunkChance || 0.10;
    if (Math.random() < rs.drunkChanceMulti) {
      rs.drunkApplied    = true;
      rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance||0) + 0.30);
      roundLog.actions.push({ actor:actorLabel, action:`🍺 Beers On Me — Drunk applied!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "on_drunk_apply_venom":
    rs.onDrunkApplyVenom += eff.chance || 0.06;
    if (rs.drunkApplied && Math.random() < rs.onDrunkApplyVenom) {
      rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, 0.20);
      roundLog.actions.push({ actor:actorLabel, action:`🧪 Poison the Drink — Venom applied!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "cmd_stun_or_confuse_by_faction":
    rs.cmdStunOrConfuse = { humanChance: eff.humanChance || 0.04, creatureChance: eff.creatureChance || 0.04 };
    if (Math.random() < (eff.humanChance || 0.04)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
      roundLog.actions.push({ actor:actorLabel, action:`📋 Know Your Enemy — Enemy CMD stunned!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "dmg_bonus_vs_role":
    rs.dmgBonusVsRole += eff.value || 0.01;
    rs.troopAtkMult   *= (1 + (eff.value || 0.01));
    rs.cmdMult        *= (1 + (eff.value || 0.01));
    break;
  case "size_type_conditional_debuff":
    rs.sizeTypeDebuff = { largeHpDown: eff.largeHpDown||0.10, mountedSpdDown: eff.mountedSpdDown||0.10, smallDmgDown: eff.smallDmgDown||0.10, chance: eff.chance||0.04 };
    break;
  case "cmd_followup_vs_alignment":
    rs.cmdFollowupVsAlignment += eff.chance || 0.07;
    break;
  // ── Samuel mechanics ──────────────────────────────────────────────────────
  case "dmg_bonus_vs_alignment":
    rs.dmgBonusVsAlignment += eff.value || 0.01;
    rs.troopAtkMult *= (1 + (eff.value || 0.01));
    rs.cmdMult      *= (1 + (eff.value || 0.01));
    break;
  case "per_round_blind_chance":
    rs.perRoundBlindChance += eff.chance || 0.09;
    if (Math.random() < rs.perRoundBlindChance) {
      rs.blindApplied = true;
      roundLog.actions.push({ actor:actorLabel, action:`🌶️ Spice Attack — Enemy Blinded!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "on_enemy_attack_burn_chance":
    rs.onEnemyAttackBurnChance += eff.chance || 0.015;
    break;
  case "multi_hit_different_targets_burn":
    rs.cmdMult *= (1 + (eff.dmgPct || 0.10) * (eff.hits || 3));
    if (eff.burnChancePerHit) {
      for (let i = 0; i < (eff.hits || 3); i++) {
        if (Math.random() < eff.burnChancePerHit) { rs.burnApplied = true; rs.burnDmgPenalty = 0.20; }
      }
    }
    break;
  case "cmd_burn_dmg_bonus":
    rs.cmdBurnDmgBonus += eff.value || 0.03;
    rs.cmdMult         *= (1 + (eff.value || 0.03));
    break;
  case "dmg_bonus_vs_burn":
    rs.dmgBonusVsBurn += eff.value || 0.03;
    if (rs.burnApplied) rs.troopAtkMult *= (1 + (eff.value || 0.03));
    break;
  case "aoe_burn_guaranteed":
    rs.cmdAoe      = true;
    rs.cmdMult    *= (1 + (eff.value || 0.20));
    rs.burnApplied = true;
    rs.burnDmgPenalty = eff.burnDmgPenalty || 0.20;
    rs.enemyAtkReduce += rs.burnDmgPenalty;
    roundLog.actions.push({ actor:actorLabel, action:`🌡️ Hot Sauce — All enemies Burned!`, dmg:0, isTroopSkill:true });
    break;
  case "followup_vs_burn":
    rs.followupVsBurn += eff.chance || 0.06;
    break;
  case "cmd_normal_atk_burn":
    rs.cmdBurnDmgBonus += eff.value || 0.03;
    rs.cmdMult         *= (1 + (eff.value || 0.03));
    break;
  case "on_burn_dmg_ally_def_stack":
    if (!rs.onBurnDmgAllyDefStack) rs.onBurnDmgAllyDefStack = { branch: eff.branch, defPerStack: eff.defPerStack||1.0, maxStacks: eff.maxStacks||6, current:0 };
    if (rs.burnApplied && rs.onBurnDmgAllyDefStack.current < rs.onBurnDmgAllyDefStack.maxStacks) {
      rs.onBurnDmgAllyDefStack.current++;
      rs.troopDefMult *= (1 + (rs.onBurnDmgAllyDefStack.defPerStack / 100));
    }
    break;
  case "conditional_round_start_heal":
    rs.conditionalRoundHeal = { condition: eff.condition, healPct: eff.healPct || 0.08 };
    if (rs.burnApplied) rs.healPct += eff.healPct || 0.08;
    break;
  // ── Fynn mechanics ────────────────────────────────────────────────────────
  case "physical_damage_multi_heal_all":
    rs.cmdMult *= (1 + (eff.value || 0.15));
    rs.healPct += eff.healPct || 0.50;
    break;
  case "cmd_bonus_attack_chance":
    rs.cmdBonusAttackChance += eff.chance || 0.10;
    break;
  case "attacking_stance_cmd_bonus":
    rs.cmdMult *= (1 + (eff.value || 0.01));
    break;
  // Brine mechanics
  case "early_round_pursuit_chance":
    if (round <= (eff.maxRound || 4) && Math.random() < (eff.chance || 0.15)) {
      rs.pursuitActive = true;
      roundLog.actions.push({ actor: actorLabel, action: `🌫️ Pursuit — Attacks cannot be avoided!`, dmg: 0, isTroopSkill: true });
    }
    rs.earlyRoundPursuitChance += eff.chance || 0.15;
    break;
  case "self_confuse_army_dmg_up":
  { const up = eff.value ?? eff.armyDmgUp ?? 0.20; // level-scaled when fired as a commander skill
    rs.selfConfuseArmyDmg = { selfConfusion: eff.selfConfusion || 1, armyDmgUp: up };
    rs.troopAtkMult *= (1 + up);
    roundLog.actions.push({ actor: actorLabel, action: `🕯️ Captain's Honor — Brine confused, troops +${Math.round(up*100)}% DMG!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "enemy_faction_vulnerability":
    rs.enemyFactionVuln = { faction: eff.faction || "orcs", value: eff.value || 0.025 };
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.025);
    break;
  case "multi_hit_random_faction_buff":
    rs.cmdMult *= (1 + (eff.dmgPct || 0.08) * (eff.hits || 5));
    rs.troopAtkMult *= (1 + (eff.allyDmgUp || 0.05));
    rs.multiHitRandomFactionBuff = { hits: eff.hits || 5, bonusHitVsOrc: eff.bonusHitVsOrc || false };
    break;
  // Saltwhisper mechanics
  case "heal_received_bonus":
    rs.healReceivedBonus += eff.value || 0.02;
    rs.healPct *= (1 + (eff.value || 0.02));
    break;
  case "sequential_immunity_then_aoe":
    rs.sequentialImmunityAoe = { immunityRound: eff.immunityRound || 0, attackRound: eff.attackRound || 1, focusDmg: eff.focusDmg || 0.30, drunkChance: eff.drunkChance || 0.70 };
    // Phase determined by which round within the 2-round duration we're in
    // Round 4 = immunity, Round 5 = attack
    rs.focusDmgBonus += eff.focusDmg || 0.30;
    rs.cmdAoe = true;
    if (Math.random() < (eff.drunkChance || 0.70)) {
      rs.drunkApplied = true;
      rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance || 0) + 0.30);
      roundLog.actions.push({ actor: actorLabel, action: `🥃 Shadow's Drunken Warrior — All enemies Drunk!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "army_evasion_two_hits":
    rs.armyEvasionTwoHits += eff.chance || 0.08;
    // 2-hit evasion window — tracked separately from single-hit evasion
    break;
  // Skar mechanics
  case "aoe_physical_slow":
    rs.cmdAoe = true;
    rs.cmdMult *= (1 + (eff.value || 0.12));
    if (Math.random() < (eff.slowChance || 0.50)) {
      rs.slowApplied = true;
      rs.slowValue   = eff.slowValue || 20;
      roundLog.actions.push({ actor: actorLabel, action: `🌋 Earthquake — Enemy Slowed (-${eff.slowValue||20} SPD)!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "burn_apply_only":
    if (Math.random() < (eff.burnChance || 0.10)) {
      rs.burnApplied    = true;
      rs.burnDmgPenalty = eff.burnDmgPenalty || 0.20;
      rs.enemyAtkReduce += rs.burnDmgPenalty;
      roundLog.actions.push({ actor: actorLabel, action: `🔥 Dragon Fire — Burn applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "cmd_dmg_bonus_vs_burn":
    rs.cmdDmgVsBurn += eff.value || 0.03;
    if (rs.burnApplied) rs.cmdMult *= (1 + (eff.value || 0.03));
    break;
  case "branch_first_hits_dmg_reduce":
    rs.branchFirstHitsDmgReduce = { branch: eff.branch || "dragons", reduction: eff.reduction || 0.015, instances: eff.instances || 4 };
    rs.dmgReduce += eff.reduction || 0.015;
    break;
  case "branch_battle_start_immunity":
    rs.branchBattleStartImmune = { branch: eff.branch || "dragons", immunity: eff.immunity || ["poison","venom"], chance: eff.chance || 0.07 };
    if (Math.random() < (eff.chance || 0.07)) {
      roundLog.actions.push({ actor: actorLabel, action: `🦎 Dragon Scales — Poison/Venom Immunity!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "dragon_supremacy_bonus":
    rs.dragonSupremacyBonus = { cmdAtkPerLevel: eff.cmdAtkPerLevel||1.0, cmdSpdPerLevel: eff.cmdSpdPerLevel||1.0 };
    rs.troopDefMult *= (1 + (eff.dragonDefPerLevel||1.0) / 100);
    break;
  case "thorns_physical":
    rs.thornsPhysical += eff.value || 0.01;
    break;
  case "physical_damage_multi_melee_bonus":
    rs.cmdMult *= (1 + (eff.value || 0.20));
    // Melee bonus applied during target selection
    break;
  case "burn_damage_atk_mod":
    rs.cmdMult *= (1 + (eff.value || 0.40));
    if (Math.random() < (eff.burnChance || 0.50)) {
      rs.burnApplied    = true;
      rs.burnDmgPenalty = eff.burnDmgPenalty || 0.20;
      rs.enemyAtkReduce += rs.burnDmgPenalty;
      roundLog.actions.push({ actor: actorLabel, action: `🌋 Dragon Inferno — Burn applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  // Nyxara mechanics
  case "branch_on_hit_followup":
    rs.branchOnHitFollowup = { branch: eff.branch || "dragons", chance: eff.chance || 0.04, bonusDmg: eff.bonusDmg || 0.50 };
    break;
  case "focus_damage_single":
    rs.focusDmgBonus += eff.value || 0.60;
    break;
  case "dual_cmd_foc_shift":
    rs.dualCmdFocShift = { selfFocUp: eff.selfFocUp || 1.0, enemyFocDown: eff.enemyFocDown || 1.0 };
    // Applied to commander stats; enemy FOC tracked as debuff
    break;
  case "heal_alignment_dragon_bonus":
    rs.healPct += eff.healPct || 0.30;
    rs.healAlignmentDragonBonus = { dragonBonus: eff.dragonBonus || 0.75 };
    break;
  case "focus_damage_stun_chance":
    rs.focusDmgBonus += eff.value || 0.15;
    if (Math.random() < (eff.stunChance || 0.50)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
      roundLog.actions.push({ actor: actorLabel, action: `⚡ Lightning Storm — Enemy stunned!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "cmd_stun_atk_drain":
    rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
    rs.cmdStunAtkDrain = { atkDrain: eff.atkDrain || 1.0, drainDuration: eff.drainDuration || 2 };
    roundLog.actions.push({ actor: actorLabel, action: `🌀 Mind over Matter — Enemy CMD stunned + ATK -${eff.atkDrain||1}!`, dmg: 0, isTroopSkill: true });
    break;
  case "cmd_normal_atk_bonus_focus":
    rs.focusDmgBonus += eff.value || 0.03;
    break;
  // Emberclaw mechanics
  case "conditional_cmd_atk_while_burn":
    rs.conditionalCmdAtkWhileBurn += eff.value || 2.0;
    if (rs.burnApplied) rs.cmdMult *= (1 + (eff.value || 2.0) / 100);
    break;
  case "multi_hit_random_burn_chance":
    rs.cmdMult *= (1 + (eff.dmgPct || 0.08) * (eff.hits || 5));
    rs.multiHitRandomBurnChance = { hits: eff.hits || 5, burnChance: eff.burnChance || 0.20 };
    for (let i = 0; i < (eff.hits || 5); i++) {
      if (Math.random() < (eff.burnChance || 0.20)) {
        rs.burnApplied    = true;
        rs.burnDmgPenalty = 0.20;
        rs.enemyAtkReduce += 0.20;
      }
    }
    break;
  case "cmd_normal_atk_aoe_burn":
    rs.cmdNormalAtkAoeBurn += eff.value || 0.06;
    rs.cmdAoe = true;
    rs.cmdMult *= (1 + (eff.value || 0.06));
    break;
  // ── Frostbite application helpers ─────────────────────────────────────────
  case "on_hit_frostbite_chance":
    // Raider troop skill — per-hit Frostbite chance. Was dead code: this only
    // ever set rs.onHitFrostbiteChance, which nothing else in the file reads —
    // the chance was never rolled and Frostbite was never applied. Fixed to
    // actually roll + apply, mirroring the sibling case right below
    // (per_round_frostbite_aoe_chance) which already did this correctly.
    rs.onHitFrostbiteChance = (rs.onHitFrostbiteChance || 0) + (eff.chance || 0.035);
    if (Math.random() < rs.onHitFrostbiteChance) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `${skill.icon} ${skill.name} — Frostbite applied! Enemy DMG -40% for 2 rnd`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "per_round_frostbite_aoe_chance":
    // Frostbite Carol / Frost Destruction — each round chance to Frostbite all enemies
    rs.perRoundFrostbiteAoeChance = (rs.perRoundFrostbiteAoeChance || 0) + (eff.chance || 0.015);
    if (Math.random() < rs.perRoundFrostbiteAoeChance) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `❄️ Frost — All enemies Frostbitten! DMG dealt -40% for 2 rnd`, dmg: 0, isTroopSkill: true });
    }
    break;
  // ── Bjorn mechanics ───────────────────────────────────────────────────────
  case "physical_damage_frostbite_chance":
    // Physical DMG + Frostbite chance (Icevein's Strike, Winter's Edge, Winter's Frost)
    rs.cmdMult *= (1 + (eff.value || eff.dmgPct || 0.30));
    if (eff.dmgPct === 0) break; // Winter's Frost — Frostbite only, no DMG
    if (Math.random() < (eff.frostbiteChance || 0.50)) {
      rs.frostbiteApplied    = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `🧊 ${skill?.name||"Strike"} — Frostbite applied! Enemy DMG -40% (2 rnd)`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "aoe_physical_frostbite_chance":
    // AoE physical DMG + Frostbite chance (Blood on Ice, Frost Cleave)
    rs.cmdAoe  = true;
    rs.cmdMult *= (1 + (eff.value || 0.10));
    if (Math.random() < (eff.frostbiteChance || 0.25)) {
      rs.frostbiteApplied    = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `🩸 ${skill?.name||"Blood on Ice"} — All enemies hit + Frostbite!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "cmd_atk_per_frostbite_round":
    // CMD ATK bonus each round Frostbite is active (Cold Fury)
    rs.cmdAtkPerFrostbiteRound = (rs.cmdAtkPerFrostbiteRound || 0) + (eff.value || 2.0);
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.cmdMult *= (1 + (eff.value || 2.0) / 100);
    }
    break;
  case "physical_shatter_frostbite":
    // Physical DMG vs Frostbitten target, strips Frostbite, applies DEF down (Shatter)
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.cmdMult             *= (1 + (eff.value || 0.60));
      rs.frostbiteApplied     = false;
      rs.frostbiteRoundsLeft  = 0;
      rs.enemyDefFlatDown         = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 5), 50);
      roundLog.actions.push({ actor: actorLabel, action: `💥 Shatter — Frostbite stripped! Enemy DEF -${eff.defDown||5} (${eff.defDuration||2} rnd)`, dmg: 0, isTroopSkill: true });
    } else {
      rs.cmdMult *= (1 + (eff.value || 0.60) * 0.50); // half damage vs non-frozen target
    }
    break;
  case "multi_hit_random_atk_stack":
    // Already handled for Hexblade — reuse for Howling Blizzard with Frostbite bonus
    rs.cmdAoe  = true;
    rs.cmdMult *= (1 + (eff.dmgPct || 0.08) * (eff.hits || 4));
    {
      const uniqueHits = Math.min(eff.hits || 4, 3);
      rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + uniqueHits * (eff.atkPerUniqueHit || 5);
    }
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.troopAtkMult *= (1 + (eff.maxLevelEffect?.frostbittenSkillDmgUp || rs.frostbittenSkillDmgUp || 0));
    }
    break;
  case "per_round_atk_up_spd_down_stack":
    // Berserker's Rush — every round CMD ATK stacks permanently
    if (!rs.perRoundAtkUpSpdDownStack) {
      rs.perRoundAtkUpSpdDownStack = { atkUp: eff.atkUp || 3.0, spdDown: eff.spdDown || 2.0, rounds: 0 };
    }
    rs.perRoundAtkUpSpdDownStack.rounds++;
    rs.cmdMult *= (1 + (rs.perRoundAtkUpSpdDownStack.atkUp * rs.perRoundAtkUpSpdDownStack.rounds) / 100);
    // Max level: Enemy DEF -10
    if (eff.maxLevelEffect?.enemyFlatDefDown) {
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.maxLevelEffect.enemyFlatDefDown, 50);
    }
    break;
  case "post_atk_stun_immune_chance":
    // After normal attack: chance Stun Immune next round (Raider's Will)
    rs.postAtkStunImmuneChance = (rs.postAtkStunImmuneChance || 0) + (eff.chance || 0.30);
    break;
  case "cmd_atk_on_troop_damage_round_stack":
    // CMD ATK/DMG stacks per troop damage received this round (War Scars / Unmoved)
    rs.warScarsCmdAtkStacks = Math.min((rs.warScarsCmdAtkStacks || 0) + 1, eff.maxStacks || 5);
    rs.cmdMult *= (1 + (eff.valuePerStack || 0.01) * rs.warScarsCmdAtkStacks);
    if (eff.firstHitStunImmune) rs.invisStunImmune = true;
    break;
  case "cmd_dmg_vs_frostbitten":
    // CMD/Army DMG bonus vs Frostbitten enemies (Frozen Prey, Frostbitten Foes, Calculated Cruelty)
    rs.cmdDmgVsFrostbitten = (rs.cmdDmgVsFrostbitten || 0) + (eff.value || 0.03);
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.cmdMult      *= (1 + (eff.value || 0.03));
      rs.troopAtkMult *= (1 + (eff.value || 0.03));
    }
    break;
  case "frostbitten_enemy_def_down":
    // Passive DEF down on Frostbitten enemies (Dead Weight)
    rs.frostbittenEnemyDefDown = (rs.frostbittenEnemyDefDown || 0) + (eff.value || 2.0);
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.value||2.0), 50);
    }
    break;
  case "frostbitten_enemy_spd_down":
    // SPD penalty on Frostbitten enemies (Permafrost, The Long Winter)
    rs.frostbittenEnemySpdDown = (rs.frostbittenEnemySpdDown || 0) + (eff.value || 5);
    // Applied to enemy SPD in combat calculation
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.slowApplied = true;
      rs.slowValue   = (rs.slowValue || 0) + (eff.value || 5);
    }
    break;
  case "physical_damage_frostbite_guaranteed":
    // Physical DMG with guaranteed Frostbite (Glacial Strike)
    rs.cmdMult             *= (1 + (eff.value || 0.35));
    rs.frostbiteApplied     = true;
    rs.frostbiteRoundsLeft  = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
    roundLog.actions.push({ actor: actorLabel, action: `🧊 Glacial Strike — Frostbite guaranteed!`, dmg: 0, isTroopSkill: true });
    break;
  case "no_unit_lost_cmd_bonus":
    // Frozen Throne: bonus while no allied unit has been killed
    if (rs.noUnitLostActive !== false) {
      rs.cmdMult        *= (1 + (eff.dmgUp || 0.03));
      rs.invisStunImmune = eff.stunImmune ?? true;
      if (eff.maxLevelEffect?.armyDmgReceivedDown) rs.dmgReduce = Math.min(0.85, rs.dmgReduce + eff.maxLevelEffect.armyDmgReceivedDown);
    }
    break;
  // ── Leif / Eira mechanics ─────────────────────────────────────────────────
  case "aoe_enemy_vuln_frostbite":
    // Skald's Curse: enemy vuln up + Frostbite chance
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.vulnValue || 0.02);
    if (Math.random() < (eff.frostbiteChance || 0.20)) {
      rs.frostbiteApplied    = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `🌑 Skald's Curse — Frostbite applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "frostbite_active_army_dmg_stack":
    // Frost Fury: Army DMG stacks per Frostbite-active round
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      if (!rs.frostbiteActiveArmyDmgStack) rs.frostbiteActiveArmyDmgStack = { valuePerStack: eff.valuePerStack||0.015, maxStacks: eff.maxStacks||5, current: 0 };
      if (rs.frostbiteActiveArmyDmgStack.current < rs.frostbiteActiveArmyDmgStack.maxStacks) {
        rs.frostbiteActiveArmyDmgStack.current++;
        rs.troopAtkMult *= (1 + rs.frostbiteActiveArmyDmgStack.valuePerStack);
        rs.cmdMult      *= (1 + rs.frostbiteActiveArmyDmgStack.valuePerStack);
      }
    }
    break;
  case "early_round_dmg_followup":
    // Frost Chant: early rounds DMG + follow-up chance
    if (round <= (eff.maxRound || 3)) {
      rs.troopAtkMult *= (1 + (eff.dmgUp || 0.04));
      rs.cmdMult      *= (1 + (eff.dmgUp || 0.04));
      rs.followupChance = (rs.followupChance || 0) + (eff.followupChance || 0.10);
    }
    break;
  case "early_round_followup_chance":
    // Song of Courage / Thane's Charge: follow-up chance early rounds
    if (round <= (eff.maxRound || 2)) {
      rs.followupChance = (rs.followupChance || 0) + (eff.chance || 0.06);
      if (eff.maxLevelEffect?.armyEvasionNextHit) rs.armyEvasionPerRoundChance = (rs.armyEvasionPerRoundChance || 0) + eff.maxLevelEffect.armyEvasionNextHit;
    }
    break;
  case "army_followup_per_round":
    // War Drums / Völva's Sight: follow-up chance every round
    rs.armyFollowupPerRound = (rs.armyFollowupPerRound || 0) + (eff.chance || 0.02);
    rs.followupChance       = (rs.followupChance || 0) + rs.armyFollowupPerRound;
    if (eff.maxLevelEffect?.cmdNormalAtkFocDmg) rs.cmdNormalAtkFocDmg = (rs.cmdNormalAtkFocDmg||0) + eff.maxLevelEffect.cmdNormalAtkFocDmg;
    break;
  case "focus_damage_frostbite_chance":
    // FOC DMG + Frostbite chance (Frozen Verse, Cold Snap Strike, Frost Tactics)
    rs.focusDmgBonus += eff.value || 0.15;
    if (Math.random() < (eff.frostbiteChance || 0.25)) {
      rs.frostbiteApplied    = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `🧊 ${skill?.name||"Ice"} — Frostbite applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "focus_damage_frostbite_guaranteed":
    // FOC DMG with guaranteed Frostbite (Bitter Cold)
    rs.focusDmgBonus       += eff.value || 0.20;
    rs.frostbiteApplied     = true;
    rs.frostbiteRoundsLeft  = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
    roundLog.actions.push({ actor: actorLabel, action: `🌨️ Bitter Cold — Frostbite guaranteed!`, dmg: 0, isTroopSkill: true });
    break;
  case "early_round_dmg_stun_immune":
    // Seer's Vision: early DMG + Stun Immune
    if (round <= (eff.maxRound || 3)) {
      rs.troopAtkMult  *= (1 + (eff.dmgUp || 0.02));
      rs.cmdMult       *= (1 + (eff.dmgUp || 0.02));
      rs.invisStunImmune = true;
      if (eff.maxLevelEffect?.earlyRoundBurnImmune) rs.earlyRoundBurnImmune = true;
    }
    break;
  case "heal_all_army_dmg_up":
    // Ancient Rite: heal all + Army DMG up
    rs.healPct      += eff.healPct || 0.08;
    rs.troopAtkMult *= (1 + (eff.dmgUp || 0.01));
    rs.cmdMult      *= (1 + (eff.dmgUp || 0.01));
    break;
  case "heal_all_cleanse":
    // Winter's Warmth: heal all + cleanse
    rs.healPct    += eff.healPct || 0.10;
    rs.healCleanse = { cleanseChance: 1.0, cleanseCount: eff.cleanseCount || 1 };
    break;
  case "heal_all_cleanse_chance":
    // Völva's Blessing: heal all + cleanse chance
    rs.healPct           += eff.healPct || 0.12;
    rs.perRoundCleanseChance = (rs.perRoundCleanseChance || 0) + (eff.cleanseChance || 0.40);
    if (eff.maxLevelEffect?.healingReceivedUp) rs.healingReceivedUp = (rs.healingReceivedUp||0) + eff.maxLevelEffect.healingReceivedUp;
    break;
  case "aoe_focus_frostbite_chance":
    // Völva's Wrath: AoE FOC + Frostbite chance
    rs.cmdAoe       = true;
    rs.focusDmgBonus += eff.value || 0.10;
    if (Math.random() < (eff.frostbiteChance || 0.35)) {
      rs.frostbiteApplied    = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `⚡ Völva's Wrath — All enemies Frostbitten!`, dmg: 0, isTroopSkill: true });
    }
    break;
  // ── Halvard mechanics ─────────────────────────────────────────────────────
  case "aoe_enemy_buff_strip_frostbite":
    // Blizzard Command: strip all enemy buffs + Frostbite chance
    rs.enemyBuffStripped = true;
    {
      let stripped = 0;
      if (rs.burnApplied)       { stripped++; } // strip self to check... actually we strip enemy-side buffs
      // Strip positive enemy stat buffs
      rs.troopAtkMult = Math.min(rs.troopAtkMult, 1.0); // can't strip atk mult that went above baseline
      if (eff.maxLevelEffect?.strippedEnemyDefDown) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.maxLevelEffect.strippedEnemyDefDown, 50);
    }
    if (Math.random() < (eff.frostbiteChance || 0.20)) {
      rs.frostbiteApplied    = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      roundLog.actions.push({ actor: actorLabel, action: `🌪️ Blizzard Command — Buffs stripped + Frostbite!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "frostbitten_enemy_foc_vuln":
    // Cold Logic: Frostbitten enemies take more FOC DMG
    rs.frostbittenEnemyFocVuln = (rs.frostbittenEnemyFocVuln || 0) + (eff.value || 0.05);
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.focusDmgBonus += (eff.value || 0.05);
    }
    break;
  case "frostbite_apply_enemy_def_down":
    // Shattered Defenses: DEF down each time Frostbite is applied
    rs.frostbiteApplyDefDown = { defDown: eff.defDown || 1.0, duration: eff.duration || 2 };
    if (rs.frostbiteApplied) {
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||1.0), 50);
    }
    break;
  case "aoe_focus_multi_hit_frostbite":
    // Winter Storm: AoE multi-hit FOC + Frostbite per hit
    rs.cmdAoe = true;
    rs.focusDmgBonus += (eff.dmgPct || 0.08) * (eff.hits || 3);
    for (let h = 0; h < (eff.hits || 3); h++) {
      if (Math.random() < (eff.frostbiteChance || 0.25)) {
        rs.frostbiteApplied    = true;
        rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
      }
    }
    if (rs.frostbiteApplied) roundLog.actions.push({ actor: actorLabel, action: `🌨️ Winter Storm — All enemies hit + Frostbite!`, dmg: 0, isTroopSkill: true });
    break;
  case "focus_burn_dual_status_chance":
    // Frost and Fire: FOC + Burn DMG + 50% Frostbite or Burn
    rs.focusDmgBonus += eff.value || 0.15;
    rs.focusDmgBonus += eff.burnDmg || 0.15;
    if (Math.random() < (eff.statusChance || 0.50)) {
      if (Math.random() < 0.50) {
        rs.frostbiteApplied    = true;
        rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
        roundLog.actions.push({ actor: actorLabel, action: `🔥❄️ Frost and Fire — Frostbite!`, dmg: 0, isTroopSkill: true });
      } else {
        rs.burnApplied    = true;
        rs.burnDmgPenalty = 0.20;
        rs.enemyAtkReduce += 0.20;
        roundLog.actions.push({ actor: actorLabel, action: `🔥❄️ Frost and Fire — Burn!`, dmg: 0, isTroopSkill: true });
      }
    }
    if (eff.maxLevelEffect?.cmdConfusionImmuneEarlyRounds && round <= eff.maxLevelEffect.cmdConfusionImmuneEarlyRounds) {
      rs.invisStunImmune = true;
    }
    break;
  case "cmd_foc_spd_passive":
    // Cold Calculation: CMD FOC + SPD bonus
    rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus || 0) + (eff.focValue || 1.0);
    rs.cmdSpdBonus        = (rs.cmdSpdBonus || 0) + (eff.spdValue || 1.0);
    break;
  // ── Knut mechanics ────────────────────────────────────────────────────────
  case "early_round_dmg_up_enemy_def_down":
    // Ironmarch's Roar: early DMG up + enemy DEF down
    if (round <= (eff.maxRound || 2)) {
      rs.troopAtkMult *= (1 + (eff.dmgUp || 0.03));
      rs.cmdMult      *= (1 + (eff.dmgUp || 0.03));
      rs.enemyDefFlatDown  = Math.min((rs.enemyDefFlatDown||0) + (eff.enemyDefDown||2), 50);
      if (eff.maxLevelEffect?.marchSpeedBonus) rs.marchSpeedBonus = (rs.marchSpeedBonus||0) + eff.maxLevelEffect.marchSpeedBonus;
    }
    break;
  case "early_round_dmg_def_up":
    // Rally the Clan: early DMG + DEF up
    if (round <= (eff.maxRound || 2)) {
      rs.troopAtkMult *= (1 + (eff.dmgUp || 0.04));
      rs.cmdMult      *= (1 + (eff.dmgUp || 0.04));
      rs.troopDefMult *= (1 + (eff.defUp || 0.04));
      if (eff.maxLevelEffect?.earlyRoundConfusionImmune) rs.invisStunImmune = true;
    }
    break;
  case "dmg_resist_vs_alignment":
  case "dmg_resist_vs_alignment_branch":
    // Shieldwall / Völva's Shield / Ice Wall: DMG resist vs alignment or faction
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.015));
    break;
    // Coldborn Brotherhood: branch units resist creature alignment
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.02));
    break;
  case "branch_flat_hp_bonus":
    // Bear's Endurance: flat HP bonus to a branch
    rs.branchFlatHpBonus = { branch: eff.branch || "bear_riders", value: eff.value || 8 };
    break;
  case "physical_damage_perm_def_down":
    // Shield Splitter: physical DMG + permanent DEF down on target
    rs.cmdMult     *= (1 + (eff.value || 0.40));
    rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||3.0), 50);
    if (eff.maxLevelEffect?.frostbiteOnHit) {
      rs.frostbiteApplied    = true;
      rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, eff.maxLevelEffect.frostbiteDuration || 1);
    }
    roundLog.actions.push({ actor: actorLabel, action: `💥 Shield Splitter — Enemy DEF -${eff.defDown||3} permanently!`, dmg: 0, isTroopSkill: true });
    break;
  // ── Frostbite mechanics ───────────────────────────────────────────────────
  // Frostbite: DMG dealt -40% for 2 rounds
  case "physical_damage_frostbite_chance":
    rs.cmdMult *= (1 + (eff.value || eff.base || 0.30));
    if (Math.random() < (eff.frostbiteChance || 0.50)) {
      rs.frostbiteApplied = true;
      rs.frostbiteRoundsLeft = 2;
      roundLog.actions.push({ actor: actorLabel, action: `🧊 Frostbite applied — Enemy DMG -40% for 2 rounds!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "aoe_physical_frostbite_chance":
    rs.cmdAoe = true;
    rs.cmdMult *= (1 + (eff.value || 0.10));
    if (Math.random() < (eff.frostbiteChance || 0.25)) {
      rs.frostbiteApplied = true;
      rs.frostbiteRoundsLeft = 2;
      roundLog.actions.push({ actor: actorLabel, action: `🧊 AoE Frostbite — All enemies DMG -40% for 2 rounds!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "physical_shatter_frostbite":
    // Shatter: heavy hit on frostbitten target, removes frostbite, applies DEF down
    if (rs.frostbiteApplied) {
      rs.cmdMult *= (1 + (eff.value || 0.60)) * 1.25; // bonus vs frostbitten
      rs.frostbiteApplied = false;
      rs.frostbiteRoundsLeft = 0;
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 5.0), 50);
      roundLog.actions.push({ actor: actorLabel, action: `💥 Shatter — Frostbite removed + DEF -${eff.defDown||5} (${eff.defDownDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
    } else {
      rs.cmdMult *= (1 + (eff.value || 0.60));
    }
    break;
  case "physical_damage_frostbitten_slow":
    // The Wall: physical hit, slows frostbitten targets
    rs.cmdMult *= (1 + (eff.value || 0.25));
    if (rs.frostbiteApplied) {
      rs.slowApplied = true;
      rs.slowValue = eff.slowValue || 25;
      roundLog.actions.push({ actor: actorLabel, action: `🧱 The Wall — Frostbitten target Slowed (-${eff.slowValue||25}% SPD, ${eff.slowDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "physical_damage_perm_def_down":
    // Shield Splitter: permanent DEF reduction, optionally applies frostbite at max level
    rs.cmdMult *= (1 + (eff.value || 0.40));
    rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 3.0), 50);
    if (eff.maxLevelEffect?.applyFrostbite) {
      rs.frostbiteApplied = true;
      rs.frostbiteRoundsLeft = eff.maxLevelEffect.frostbiteDuration || 1;
      roundLog.actions.push({ actor: actorLabel, action: `⚔️ Shield Splitter — DEF -${eff.defDown||3} permanently + Frostbite applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "cmd_dmg_bonus_vs_frostbitten":
    // Frozen Prey / Frostbitten Foes / Calculated Cruelty
    if (rs.frostbiteApplied) {
      rs.cmdMult      *= (1 + (eff.value || 0.03));
      rs.troopAtkMult *= (1 + (eff.value || 0.03));
    }
    break;
  case "cmd_atk_per_round_frostbite_active":
    // Cold Fury: CMD ATK bonus each round frostbite is active
    if (rs.frostbiteApplied) {
      rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus || 0); // reuse existing field
      rs.coldFuryAtkBonus   = (rs.coldFuryAtkBonus || 0) + (eff.value || 2.0);
      rs.cmdMult            *= (1 + (eff.value || 2.0) / 100);
    }
    break;
  case "per_round_atk_stack_spd_lose":
    // Berserker's Rush: every round ATK permanently grows, SPD permanently drops
    rs.berserkerRushAtkGain = (rs.berserkerRushAtkGain || 0) + (eff.atkPerRound || 3.0);
    rs.berserkerRushSpdLoss = (rs.berserkerRushSpdLoss || 0) + (eff.spdLostPerRound || 2.0);
    rs.cmdMult *= (1 + (rs.berserkerRushAtkGain / 100));
    if (eff.maxLevelEffect?.enemyDefDown) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.maxLevelEffect.enemyDefDown, 50);
    roundLog.actions.push({ actor: actorLabel, action: `😤 Berserker's Rush — ATK +${eff.atkPerRound||3} (total +${rs.berserkerRushAtkGain}) | SPD -${eff.spdLostPerRound||2} (total -${rs.berserkerRushSpdLoss})`, dmg: 0, isTroopSkill: true });
    break;
  case "cmd_atk_stack_on_troop_hit":
    // War Scars: CMD ATK buff when troops take damage (tracked per round)
    rs.warScarsStacksThisRound = (rs.warScarsStacksThisRound || 0) + 1;
    if (rs.warScarsStacksThisRound <= (eff.maxStacks || 5)) {
      rs.cmdMult *= (1 + (eff.valuePerStack || 0.01));
    }
    break;
  case "no_unit_lost_dmg_stun_immune":
    // Frozen Throne: bonus if no units killed yet
    if (!rs.unitLostThisBattle) {
      rs.cmdMult         *= (1 + (eff.dmgBonus || 0.03));
      rs.invisStunImmune  = true;
      if (eff.maxLevelEffect?.armyDmgReceiveDown) rs.dmgReduce = Math.min(0.85, rs.dmgReduce + eff.maxLevelEffect.armyDmgReceiveDown);
    }
    break;
  case "frostbitten_enemy_spd_down":
    // Permafrost / The Long Winter: extra SPD penalty on frostbitten enemies
    rs.frostbitenSpdDown = (rs.frostbitenSpdDown || 0) + (eff.value || 5);
    break;
  case "frostbite_applied_def_down":
    // Shattered Defenses: DEF down each time frostbite is applied
    if (rs.frostbiteApplied) {
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 1.0), 50);
    }
    break;
  case "frostbitten_enemy_foc_dmg_taken_up":
    // Cold Logic: frostbitten enemies take more FOC DMG
    if (rs.frostbiteApplied) {
      rs.focusDmgBonus += eff.value || 0.05;
      rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.05);
    }
    break;
  case "per_round_frostbite_aoe_chance":
    // Frostbite Carol / Frost Destruction / Tide of Ice
    if (Math.random() < (eff.chance || 0.06)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
      roundLog.actions.push({ actor: actorLabel, action: `❄️ Frostbite AoE — All enemies Frostbitten!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "per_round_frostbite_multi_chance":
    // Winter's Frost: frostbite chance on multiple specific targets per round
    if (Math.random() < (eff.chance || 0.07)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
      roundLog.actions.push({ actor: actorLabel, action: `❄️ Winter's Frost — Frostbite applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "on_hit_frostbite_chance":
    // Raider troop skill — on-hit frostbite proc
    if (Math.random() < (eff.chance || 0.035)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
    }
    break;
  case "vs_all_dmg_up_frostbite_chance":
    // Skald's Curse: all enemies DMG received up + frostbite chance
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.dmgTakenUp || 0.02);
    rs.cmdAoe = true;
    if (Math.random() < (eff.frostbiteChance || 0.20)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
      if (eff.maxLevelEffect?.frostbitenSpdDown) rs.frostbitenSpdDown = (rs.frostbitenSpdDown||0) + eff.maxLevelEffect.frostbitenSpdDown;
      roundLog.actions.push({ actor: actorLabel, action: `🔮 Skald's Curse — Frostbite + DMG Received up!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "focus_damage_frostbite_chance":
    // FOC damage + frostbite chance (Ice Lance variant, Frozen Verse, Bitter Cold, Cold Snap Strike)
    rs.focusDmgBonus += eff.value || 0.20;
    if (Math.random() < (eff.frostbiteChance || 0.40)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
      roundLog.actions.push({ actor: actorLabel, action: `🧊 Focus Frostbite — applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "aoe_focus_frostbite_chance":
    // Völva's Wrath: AoE FOC hit + frostbite
    rs.cmdAoe = true;
    rs.focusDmgBonus += eff.value || 0.10;
    if (Math.random() < (eff.frostbiteChance || 0.35)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
      roundLog.actions.push({ actor: actorLabel, action: `⚡ Völva's Wrath — AoE FOC + Frostbite!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "aoe_enemy_buff_strip_frostbite":
    // Blizzard Command: strip buffs + frostbite
    rs.enemyBuffStripped = true;
    if (rs.burnApplied)       { rs.burnApplied=false; rs.burnDmgPenalty=0; rs.enemyAtkReduce=Math.max(0,rs.enemyAtkReduce-0.20); }
    if (rs.pendingVenomDmg>0) { rs.pendingVenomDmg=0; }
    if (rs.enemyStunned>0)    { rs.enemyStunned=0; }
    if (rs.enemyConfused>0)   { rs.enemyConfused=0; }
    if (rs.blindApplied)      { rs.blindApplied=false; }
    if (rs.slowApplied)       { rs.slowApplied=false; rs.slowValue=0; }
    roundLog.actions.push({ actor: actorLabel, action: `🌨️ Blizzard Command — All enemy buffs stripped!`, dmg: 0, isTroopSkill: true });
    if (Math.random() < (eff.frostbiteChance || 0.20)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
      if (eff.maxLevelEffect?.strippedEnemyDefDown) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.maxLevelEffect.strippedEnemyDefDown, 50);
      roundLog.actions.push({ actor: actorLabel, action: `🧊 Blizzard Command — Frostbite applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "aoe_focus_multi_hit_frostbite":
    // Winter Storm: multi-hit FOC AoE + frostbite per hit
    rs.cmdAoe = true;
    rs.focusDmgBonus += (eff.value || 0.08) * (eff.hits || 3);
    for (let i = 0; i < (eff.hits || 3); i++) {
      if (Math.random() < (eff.frostbiteChancePerHit || 0.25)) {
        rs.frostbiteApplied   = true;
        rs.frostbiteRoundsLeft = 2;
      }
    }
    if (rs.frostbiteApplied) roundLog.actions.push({ actor: actorLabel, action: `🌪️ Winter Storm — Multi-hit FOC + Frostbite!`, dmg: 0, isTroopSkill: true });
    break;
  case "focus_burn_dual_frostbite_burn_chance":
    // Frost and Fire: FOC + Burn DMG, 50% Frostbite or Burn
    rs.focusDmgBonus += (eff.value || 0.15) * 2; // FOC + Burn components
    if (Math.random() < (eff.frostbiteOrBurnChance || 0.50)) {
      if (Math.random() < 0.50) {
        rs.frostbiteApplied   = true;
        rs.frostbiteRoundsLeft = 2;
        roundLog.actions.push({ actor: actorLabel, action: `🔥❄️ Frost and Fire — Frostbite applied!`, dmg: 0, isTroopSkill: true });
      } else {
        rs.burnApplied    = true;
        rs.burnDmgPenalty = 0.20;
        rs.enemyAtkReduce += 0.20;
        roundLog.actions.push({ actor: actorLabel, action: `🔥❄️ Frost and Fire — Burn applied!`, dmg: 0, isTroopSkill: true });
      }
    }
    if (eff.maxLevelEffect?.earlyRoundConfusionImmune && round <= (eff.maxLevelEffect.maxRound || 3)) {
      rs.invisStunImmune = true;
    }
    break;
  case "frostbite_active_army_dmg_stack":
    // Frost Fury: army DMG up each round frostbite is active
    if (rs.frostbiteApplied) {
      rs.frostFuryStacks = Math.min((rs.frostFuryStacks || 0) + 1, eff.maxStacks || 5);
      rs.troopAtkMult   *= (1 + (eff.valuePerStack || 0.015) * rs.frostFuryStacks);
    }
    break;
  case "army_followup_per_round":
    // War Drums / Völva's Sight: per-round follow-up chance for army
    rs.factionFollowupPerRound = (rs.factionFollowupPerRound || 0) + (eff.chance || 0.02);
    break;
  case "early_round_dmg_followup_chance":
    // Frost Chant: early rounds DMG up + followup chance
    if (round <= (eff.maxRound || 3)) {
      rs.troopAtkMult *= (1 + (eff.dmgUp || 0.04));
      rs.factionFollowupPerRound = (rs.factionFollowupPerRound || 0) + (eff.followupChance || 0.10);
    }
    break;
  case "early_round_followup_chance":
    // Song of Courage / Thane's Charge: early rounds follow-up
    if (round <= (eff.maxRound || 2)) {
      rs.factionFollowupPerRound = (rs.factionFollowupPerRound || 0) + (eff.chance || 0.06);
    }
    break;
  case "early_round_dmg_stun_immune":
    // Seer's Vision: early rounds DMG up + stun immune
    if (round <= (eff.maxRound || 3)) {
      rs.troopAtkMult    *= (1 + (eff.dmgUp || 0.02));
      rs.invisStunImmune  = true;
      if (eff.maxLevelEffect?.earlyRoundBurnImmune) rs.earlyRoundBurnImmune = true;
    }
    break;
  case "heal_all_army_dmg_up":
    // Ancient Rite: heal + army DMG up
    rs.healPct    += eff.healPct || 0.08;
    rs.troopAtkMult *= (1 + (eff.dmgUp || 0.01));
    break;
  case "heal_all_cleanse":
    // Winter's Warmth: heal all + cleanse
    rs.healPct    += eff.healPct || 0.10;
    rs.pendingVenomDmg = 0;
    rs.burnApplied     = false;
    rs.enemyAtkReduce  = Math.max(0, rs.enemyAtkReduce - 0.20);
    roundLog.actions.push({ actor: actorLabel, action: `🌡️ Winter's Warmth — Healed + debuff cleansed!`, dmg: 0, isTroopSkill: true });
    break;
  case "heal_all_cleanse_chance":
    // Völva's Blessing: heal all + chance to cleanse
    rs.healPct += eff.healPct || 0.12;
    if (Math.random() < (eff.cleanseChance || 0.40)) {
      rs.pendingVenomDmg = 0;
      rs.burnApplied     = false;
      roundLog.actions.push({ actor: actorLabel, action: `✨ Völva's Blessing — Healed + debuff cleansed!`, dmg: 0, isTroopSkill: true });
    }
    if (eff.maxLevelEffect?.allyHealingReceivedUp) rs.allyHealingReceivedUp = (rs.allyHealingReceivedUp||0) + eff.maxLevelEffect.allyHealingReceivedUp;
    break;
  case "early_round_dmg_up_enemy_def_down":
    // Ironmarch's Roar: allied DMG up + enemy DEF down in early rounds
    if (round <= (eff.maxRound || 2)) {
      rs.troopAtkMult *= (1 + (eff.dmgUp || 0.03));
      rs.cmdMult      *= (1 + (eff.dmgUp || 0.03));
      rs.enemyDefFlatDown  = Math.min((rs.enemyDefFlatDown||0) + (eff.enemyDefDown||2.0), 50);
    }
    if (eff.maxLevelEffect?.marchSpeedBonus) rs.marchSpeedBonus = (rs.marchSpeedBonus||0) + eff.maxLevelEffect.marchSpeedBonus;
    break;
  case "early_round_dmg_def_up":
    // Rally the Clan: DMG + DEF up early rounds + optional confusion immune
    if (round <= (eff.maxRound || 2)) {
      rs.troopAtkMult *= (1 + (eff.dmgUp || 0.04));
      rs.troopDefMult *= (1 + (eff.defUp || 0.04));
      if (eff.maxLevelEffect?.earlyRoundConfusionImmune) rs.invisStunImmune = true;
    }
    break;
  case "branch_flat_hp_bonus":
    // Bear's Endurance: flat HP bonus to a branch
    rs.branchFlatHpBonus = { branch: eff.branch || "bear_riders", value: eff.value || 8 };
    break;
  case "faction_dmg_resist_vs_alignment":
    // Coldborn Brotherhood: faction-specific DMG resist vs alignment
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.02));
    break;
  case "cmd_foc_spd_passive":
    // Cold Calculation: CMD FOC + SPD bonus
    rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus || 0) + (eff.focValue || 1.0);
    rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + (eff.spdValue || 1.0);
    break;
  case "passive_heal_per_round":
    // Winter's Song / Cold Mending / Heals for Days: passive per-round heal
    rs.healPct += eff.healPct || 0.05;
    break;
  case "aoe_normal_atk":
    // Bear Rider Charge: normal attack hits all enemies at reduced %
    rs.cmdAoe   = true;
    rs.cmdMult *= (eff.value || 0.50);
    break;

  // ── Life Drain mechanics ──────────────────────────────────────────────────
  // Life Drain: healing received → 50% of that amount as damage (2 rnd, no stack)
  case "focus_damage_life_drain_def_down":
    rs.focusDmgBonus += eff.value || 0.40;
    rs.lifeDrainApplied    = true;
    rs.lifeDrainRoundsLeft = 2;
    rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||5.0), 50);
    roundLog.actions.push({ actor: actorLabel, action: `💀 Malgrath's Curse — FOC DMG + Life Drain (2 rnd) + DEF -${eff.defDown||5} permanently!`, dmg: 0, isTroopSkill: true });
    break;
  case "aoe_life_drain_chance":
    if (Math.random() < (eff.chance || 0.08)) {
      rs.lifeDrainApplied    = true;
      rs.lifeDrainRoundsLeft = 2;
      if (eff.maxLevelEffect?.lifeDrainEnemyDmgTakenUp) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + eff.maxLevelEffect.lifeDrainEnemyDmgTakenUp;
      roundLog.actions.push({ actor: actorLabel, action: `☠️ Plague of the Eternal — Life Drain applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "focus_damage_life_drain_chance":
    rs.focusDmgBonus += eff.value || 0.18;
    if (Math.random() < (eff.lifeDrainChance || 0.35)) {
      rs.lifeDrainApplied    = true;
      rs.lifeDrainRoundsLeft = 2;
      roundLog.actions.push({ actor: actorLabel, action: `🖤 Necrotic Touch — Life Drain applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "life_drain_enemy_foc_dmg_taken_up":
    if (rs.lifeDrainApplied) {
      rs.focusDmgBonus   += eff.value || 0.04;
      rs.enemyDmgTakenUp  = (rs.enemyDmgTakenUp||0) + (eff.value||0.04);
    }
    break;
  case "lich_dominion_passive":
    rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus||0) + (eff.focUp||2.0);
    rs.focusDmgBonus      += eff.allyFocDmgUp || 0.015;
    rs.troopAtkMult       *= (1 + (eff.allyFocDmgUp||0.015));
    if (rs.lifeDrainApplied) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + (eff.lifeDrainEnemyVuln||0.05);
    break;
  case "aoe_focus_damage_vuln":
    rs.cmdAoe        = true;
    rs.focusDmgBonus += eff.value || 0.12;
    rs.focusVulnOnTarget = (rs.focusVulnOnTarget||0) + (eff.focVuln||0.15);
    break;
  case "silence_and_foc_vuln":
    rs.enemyConfused   = Math.max(rs.enemyConfused||0, eff.silenceDuration||1);
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + (eff.focVuln||0.02);
    if (eff.maxLevelEffect?.cmdFocBonus) rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus||0) + eff.maxLevelEffect.cmdFocBonus;
    roundLog.actions.push({ actor: actorLabel, action: `⚖️ Varak's Verdict — Enemy CMD Silenced + FOC vuln!`, dmg: 0, isTroopSkill: true });
    break;
  case "vs_all_foc_dmg_taken_up":
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + (eff.value||0.02);
    break;
  case "aoe_focus_multi_hit":
    rs.cmdAoe        = true;
    rs.focusDmgBonus += (eff.value||0.10) * (eff.hits||3);
    if (eff.maxLevelEffect?.enemyFocDmgTakenUp) rs.enemyFocDmgTakenUp = (rs.enemyFocDmgTakenUp||0) + eff.maxLevelEffect.enemyFocDmgTakenUp;
    break;
  case "aoe_focus_confusion_life_drain":
    rs.cmdAoe = true;
    rs.focusDmgBonus += eff.value || 0.10;
    if (Math.random() < (eff.confusionChance||0.35)) { rs.enemyConfused = Math.max(rs.enemyConfused||0, 1); roundLog.actions.push({ actor: actorLabel, action: `🔔 Death Knell — Confused!`, dmg:0, isTroopSkill:true }); }
    if (Math.random() < (eff.lifeDrainChance||0.25)) { rs.lifeDrainApplied=true; rs.lifeDrainRoundsLeft=2; roundLog.actions.push({ actor: actorLabel, action: `🔔 Death Knell — Life Drain!`, dmg:0, isTroopSkill:true }); }
    if (eff.maxLevelEffect?.cmdNormalAtkFocBonus) rs.cmdNormalAtkFocBonus = (rs.cmdNormalAtkFocBonus||0) + eff.maxLevelEffect.cmdNormalAtkFocBonus;
    break;
  case "life_drain_applied_def_down":
    if (rs.lifeDrainApplied) {
      const ldStacks = rs.deathTouchedStacks || 0;
      if (ldStacks < (eff.maxStacks||3)) { rs.deathTouchedStacks = ldStacks+1; rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||1.5), 50); }
    }
    break;
  case "life_drain_applied_next_skill_bonus":
    if (rs.lifeDrainApplied && Math.random() < (eff.chance||0.07)) {
      rs.lifeDrainNextSkillBonus    = true;
      rs.lifeDrainNextSkillBonusPct = eff.bonusDmg || 0.30;
      roundLog.actions.push({ actor: actorLabel, action: `⚡ The Eternal Knight — Next skill +${Math.round((eff.bonusDmg||0.30)*100)}%!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "death_cavalry_buff_foc_dmg":
    rs.troopDefMult *= (1 + (eff.defBonus||3)/100);
    rs.troopAtkMult *= (1 + (eff.dmgBonus||0.02));
    rs.focusDmgBonus += eff.focDmg || 0.12;
    if (rs.lifeDrainApplied && eff.maxLevelEffect?.lifeDrainArmyConfusionImmune) { rs.invisStunImmune=true; roundLog.actions.push({ actor: actorLabel, action: `🐴 Varak's Vanguard — Confusion Immune!`, dmg:0, isTroopSkill:true }); }
    break;
  // ── Mummify mechanics ─────────────────────────────────────────────────────
  case "on_hit_mummify_chance":
    if (Math.random() < (eff.chance||0.04)) {
      rs.mummifyApplied = true;
      rs.mummifyRound   = rs.mummifyApplied ? 1 : (rs.mummifyRound||0); // reapply resets
      roundLog.actions.push({ actor: actorLabel, action: `🧟 Mummify applied! (Rnd ${rs.mummifyRound}: SPD -${rs.mummifyRound===1?25:50}%)`, dmg:0, isTroopSkill:true });
    }
    break;
  // ── Ashen Dead troop skill handlers ───────────────────────────────────────
  case "ignore_def_pct":
    rs.ignoreDefPct = (rs.ignoreDefPct||0) + (eff.value||0.07);
    break;
  case "dmg_reduce_vs_size":
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value||0.01));
    break;
  case "atk_stack_on_hit_received":
    { const cbs = rs.calmBeforeStormStacks||0; if (cbs < (eff.maxStacks||5)) { rs.calmBeforeStormStacks=cbs+1; rs.troopAtkMult*=(1+(eff.valuePerStack||0.01)); } }
    break;
  // ── Shared Ashen Dead commander handlers ─────────────────────────────────
  case "undead_buff_enemy_def_down":
    rs.troopAtkMult *= (1+(eff.dmgBonus||0.015));
    rs.troopDefMult *= (1+(eff.defBonus||3)/100);
    rs.enemyDefFlatDown  = Math.min((rs.enemyDefFlatDown||0) + (eff.enemyDefDown||2.0), 50);
    if (eff.maxLevelEffect?.atkBonus) rs.cmdMult *= (1+eff.maxLevelEffect.atkBonus/100);
    break;
  case "faction_phys_dmg_reduce":
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value||0.015));
    break;
  case "physical_damage_multi_ally_heal":
    rs.cmdMult  *= (1+(eff.value||0.20));
    rs.healPct  += eff.allyHealPct || 0.05;
    break;
  case "aoe_spd_down_confusion_chance":
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + 0.05;
    if (Math.random() < (eff.confusionChance||0.30)) { rs.enemyConfused=Math.max(rs.enemyConfused||0,eff.confusionDuration||1); roundLog.actions.push({ actor: actorLabel, action:`⚓ Dead Man's Weight — Confused!`, dmg:0, isTroopSkill:true }); }
    if (eff.maxLevelEffect?.armySpdBonus) rs.cmdSpdBonus = (rs.cmdSpdBonus||0)+eff.maxLevelEffect.armySpdBonus;
    break;
  case "per_round_confusion_chance_enemy":
    if (Math.random() < (eff.chance||0.05)) { rs.enemyConfused=Math.max(rs.enemyConfused||0,1); roundLog.actions.push({ actor: actorLabel, action:`🐌 Slow Agony — Confused!`, dmg:0, isTroopSkill:true }); }
    break;
  case "cmd_atk_passive":
    rs.cmdMult *= (1+(eff.value||2.0)/100);
    break;
  case "physical_damage_buff_block":
    rs.cmdMult          *= (1+(eff.value||0.50));
    rs.enemyBuffStripped = true;
    if (eff.maxLevelEffect?.cmdStunImmune) rs.invisStunImmune=true;
    roundLog.actions.push({ actor: actorLabel, action:`🦴 Bone Crusher — No positive buffs (${eff.blockDuration||2} rnd)!`, dmg:0, isTroopSkill:true });
    break;
  case "cmd_atk_on_attack_permanent_stack":
    { const hs=rs.hauntingStacks||0; if (hs<(eff.maxStacks||8)) { rs.hauntingStacks=hs+1; rs.cmdMult*=(1+(eff.valuePerStack||2.0)/100); } }
    break;
  case "aoe_physical_faction_bonus":
    rs.cmdAoe = true; rs.cmdMult *= (1+(eff.value||0.10));
    if (defFaction===(eff.bonusFaction||"coldborns")) rs.cmdMult *= (1+(eff.bonusDmg||0.20));
    break;
  case "slowed_enemy_def_down":
    if (rs.slowApplied) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.value||2.0), 50);
    break;
  case "cmd_atk_per_round_slowed_active":
    if (rs.slowApplied) { const rds=rs.relentlessDeadStacks||0; if (rds<(eff.maxStacks||5)) { rs.relentlessDeadStacks=rds+1; rs.cmdMult*=(1+(eff.valuePerStack||1.0)/100); } }
    break;
  case "multi_hit_aoe_faction_bonus":
    rs.cmdAoe = true;
    { let tot=0; for (let i=0;i<(eff.hits||4);i++) { let h=eff.value||0.06; if (eff.maxLevelEffect?.escalatingHitBonus) h*=Math.pow(1+eff.maxLevelEffect.escalatingHitBonus,i); if (defFaction===(eff.bonusFaction||"coldborns")) h+=(eff.bonusDmgPerHit||0.10); tot+=h; } rs.cmdMult*=(1+tot); }
    break;
  case "multi_hit_aoe_size_bonus":
    rs.cmdAoe = true; rs.cmdMult *= (1+(eff.value||0.06)*(eff.hits||3));
    break;
  case "aoe_physical_burn_faction_bonus":
    rs.cmdAoe = true; rs.cmdMult *= (1+(eff.value||0.10));
    if (defFaction===(eff.bonusFaction||"coldborns")) rs.cmdMult *= (1+(eff.bonusDmg||0.20));
    if (Math.random() < (eff.burnChance||0.40)) { rs.burnApplied=true; rs.burnDmgPenalty=0.20; rs.enemyAtkReduce+=0.20; roundLog.actions.push({ actor: actorLabel, action:`🔥 Burning Charge — Burn!`, dmg:0, isTroopSkill:true }); }
    break;
  case "aoe_physical_burn_chance":
    rs.cmdAoe = true; rs.cmdMult *= (1+(eff.value||0.08));
    if (Math.random() < (eff.burnChance||0.25)) { rs.burnApplied=true; rs.burnDmgPenalty=0.20; rs.enemyAtkReduce+=0.20; roundLog.actions.push({ actor: actorLabel, action:`💢 Risen Fury — Burn!`, dmg:0, isTroopSkill:true }); }
    break;
  case "physical_damage_poison_dot":
    rs.cmdMult        *= (1+(eff.value||0.20));
    rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, 0.10);
    roundLog.actions.push({ actor: actorLabel, action:`☠️ Poison applied!`, dmg:0, isTroopSkill:true });
    break;
  case "aoe_physical_poison_chance":
    rs.cmdAoe = true; rs.cmdMult *= (1+(eff.value||0.08));
    if (Math.random() < (eff.poisonChance||0.20)) { rs.pendingVenomDmg=Math.max(rs.pendingVenomDmg,0.10); roundLog.actions.push({ actor: actorLabel, action:`☠️ Poison Sweep — Poison!`, dmg:0, isTroopSkill:true }); }
    break;
  case "physical_damage_burn_slow_single":
    rs.cmdMult *= (1+(eff.value||0.40));
    rs.burnApplied=true; rs.burnDmgPenalty=0.20; rs.enemyAtkReduce+=0.20;
    rs.slowApplied=true; rs.slowValue=eff.slowValue||25;
    if (eff.maxLevelEffect?.burnedEnemyDmgTakenUp) rs.enemyDmgTakenUp=(rs.enemyDmgTakenUp||0)+eff.maxLevelEffect.burnedEnemyDmgTakenUp;
    roundLog.actions.push({ actor: actorLabel, action:`👁️ Death from Below — Burn + Slow!`, dmg:0, isTroopSkill:true });
    break;
  case "cmd_normal_atk_aoe_chance":
    if (Math.random() < (eff.chance||0.10)) { rs.cmdAoe=true; roundLog.actions.push({ actor: actorLabel, action:`⚔️ Cael's Rampage — Hits all!`, dmg:0, isTroopSkill:true }); }
    break;
  case "per_round_poison_chance_enemy":
    if (Math.random() < (eff.chance||0.05)) { rs.pendingVenomDmg=Math.max(rs.pendingVenomDmg,0.10); roundLog.actions.push({ actor: actorLabel, action:`💀 Creeping Death — Poison!`, dmg:0, isTroopSkill:true }); }
    break;
  case "heal_all_branch_def_up":
    rs.healPct += eff.healPct||0.10; rs.troopDefMult *= (1+(eff.defBonus||3)/100);
    break;
  case "heal_all_branch_dmg_up":
    rs.healPct += eff.healPct||0.08; rs.troopAtkMult *= (1+(eff.dmgBonus||0.03));
    break;
  case "multi_branch_phys_reduce_hp_def":
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce+(eff.physReduce||0.02));
    rs.troopDefMult *= (1+(eff.defBonus||2)/100);
    break;
  case "multi_branch_dmg_bonus":
    rs.troopAtkMult *= (1+(eff.value||0.015));
    break;
  case "mordwyn_command_passive":
    rs.troopAtkMult *= (1+(eff.skeletonDmgUp||0.02));
    rs.dmgReduce     = Math.min(0.85, rs.dmgReduce+(eff.mummyDmgRecDown||0.02));
    rs.healPct      += eff.healPerRound||0.05;
    break;
  case "early_round_dmg_received_down":
    if (round <= (eff.maxRound||2)) rs.dmgReduce = Math.min(0.85, rs.dmgReduce+(eff.value||0.04));
    break;
  case "cmd_triple_stat_passive":
    rs.cmdMult          *= (1+(eff.atkValue||1.0)/100);
    rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus||0)+(eff.focValue||1.0);
    rs.cmdSpdBonus        = (rs.cmdSpdBonus||0)+(eff.spdValue||1.0);
    break;
  case "faction_dmg_bonus":
    rs.troopAtkMult *= (1+(eff.value||0.015));
    rs.cmdMult      *= (1+(eff.value||0.015));
    break;
  case "physical_damage_slow_chance":
    // Bone Splitter / Hollow Strike / Hollow Assault: physical + slow chance
    rs.cmdMult *= (1 + (eff.value || 0.30));
    if (Math.random() < (eff.slowChance || 0.40)) {
      rs.slowApplied = true;
      rs.slowValue   = eff.slowValue || 25;
      roundLog.actions.push({ actor: actorLabel, action: `💢 Slow applied (-${eff.slowValue||25}% SPD, ${eff.slowDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "poison_applied_def_down":
    // Rotting Armor / Veyra: DEF down when Poison is applied
    if (rs.pendingVenomDmg > 0) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||2.0), 50);
    break;

  case "cmd_stat_bonus":
    // CMD SPD bonus passive (Fastest in the Pack, Fastest in the Tribe, Power of Alpha)
    rs.cmdSpdBonus += eff.value ?? eff.spdPerLevel ?? 1.0;
    break;
  case "confusion_dmg_up":
    // Confuse targets + DMG up for duration (Vampire's Thrall)
    rs.enemyConfused = Math.max(rs.enemyConfused || 0, eff.duration || 1);
    rs.troopAtkMult *= (1 + (eff.dmgUp || 0.02));
    rs.cmdMult      *= (1 + (eff.dmgUp || 0.02));
    roundLog.actions.push({ actor: actorLabel, action: `🦇 Vampire's Thrall — Enemies Confused + DMG +${Math.round((eff.dmgUp||0.02)*100)}%!`, dmg: 0, isTroopSkill: true });
    break;
  case "debuff_chance_reduction":
    // Reduce chance of debuffs landing on commander (Around the Block)
    rs.debuffChanceReduction = (rs.debuffChanceReduction || 0) + (eff.value || 0.07);
    break;
  case "dmg_bonus_vs_faction":
    // Allied units deal bonus DMG vs specific faction (Anything Goes, HK Eradicator, Ruthless Extinction)
    rs.dmgBonusVsFactionAll += eff.value || 0.01;
    rs.troopAtkMult *= (1 + (eff.value || 0.01));
    rs.cmdMult      *= (1 + (eff.value || 0.01));
    break;
  case "focus_damage_invisibility":
    // Focus DMG + grant friendly units invisibility (Invisible Enemy / Lord Malachar)
    rs.focusDmgBonus  += eff.focusDmg || 0.20;
    rs.invisibleUnits  = Math.max(rs.invisibleUnits, eff.invisUnits || 2);
    roundLog.actions.push({ actor: actorLabel, action: `🌑 Invisible Enemy — Focus hit + ${eff.invisUnits||2} units Invisible (${Math.round((eff.evadeChance||0.30)*100)}% evade)!`, dmg: 0, isTroopSkill: true });
    break;
  case "focus_damage_stun":
    // Focus DMG + stun chance, SPD-modified (Surprise Attack)
    {
      const spdScale = Math.max(1, (atkCmdSpd || 60) / 60);
      rs.focusDmgBonus += (eff.value || 0.15) * spdScale;
      if (Math.random() < (eff.stunChance || 0.35)) {
        rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.duration || 1);
        roundLog.actions.push({ actor: actorLabel, action: `💨 Surprise Attack — Enemy Stunned!`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  case "troop_def_bonus_vs_branch":
    // Flat DEF bonus to a specific branch (Protect My Children, Pack Protection)
    rs.branchFlatDefBonus = { branch: eff.branch, value: eff.value || 1.5 };
    rs.troopDefMult *= (1 + (eff.value || 1.5) / 100);
    break;
  case "war_general":
    // CMD FOC bonus + melee troop DMG up (War General)
    rs.focusDmgBonus  += (eff.focusBonus || 1.0) / 100;
    rs.troopAtkMult   *= (1 + (eff.meleeDmgUp || 0.01));
    break;
  case "cmd_foc_passive":
    // Pure FOC bonus passive — applied pre-battle to commander stat
    rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus || 0) + (eff.value || 2.0);
    break;
  case "multi_confusion_def_down":
    // [N targets] Confusion + flat DEF down (Riddle Me This)
    rs.enemyConfused = Math.max(rs.enemyConfused || 0, eff.confusionDuration || 1);
    rs.enemyDefFlatDown  = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 1.0), 50);
    roundLog.actions.push({ actor: actorLabel, action: `🌀 Riddle Me This — ${eff.targets||2} units Confused + DEF -${eff.defDown||1}!`, dmg: 0, isTroopSkill: true });
    break;
  case "aoe_focus_stun_chance":
    // AoE focus DMG + stun chance (Shock Wave)
    rs.cmdAoe       = true;
    rs.focusDmgBonus += eff.value || 0.15;
    if (Math.random() < (eff.stunChance || 0.35)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
      roundLog.actions.push({ actor: actorLabel, action: `⚡ Shock Wave — All enemies hit + Stunned!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "foc_threshold_bonuses":
    // FOC-gated passive bonuses (Mage's Secret Knowledge)
    // Checks current FOC stat after all pre-battle bonuses applied
    {
      const curFoc = cmdFocStat; // use resolved FOC from battle setup
      const val = eff.value || 0.01;
      if (curFoc >= (eff.tier1Foc || 210)) {
        rs.troopAtkMult *= (1 + val);
        rs.cmdMult      *= (1 + val);
      }
      if (curFoc >= (eff.tier2Foc || 240)) {
        rs.dmgReduce = Math.min(0.85, rs.dmgReduce + val);
      }
      if (curFoc >= (eff.tier3Foc || 275)) {
        rs.invisStunImmune = true;
        roundLog.actions.push({ actor: actorLabel, action: `📖 Mage's Secret Knowledge — Stun Immune (FOC≥275)!`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  case "focus_damage_slow_chance":
    // Focus DMG + chance to Slow target (Hourglass)
    rs.focusDmgBonus += eff.value || 0.10;
    if (Math.random() < (eff.slowChance || 0.60)) {
      rs.slowApplied = true;
      rs.slowValue   = eff.slowValue || 25;
      roundLog.actions.push({ actor: actorLabel, action: `⏳ Hourglass — Enemy Slowed (-${eff.slowValue||25}% SPD, ${eff.slowDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
      if (eff.maxLevelEffect?.slowedDmgTakenUp) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + eff.maxLevelEffect.slowedDmgTakenUp;
    }
    break;
  case "cmd_confusion_slowed_dmg_bonus":
    // Enemy CMD Confused + allied DMG vs slowed targets up (Mind Games)
    rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1);
    rs.dmgVsSlowed   = (rs.dmgVsSlowed || 0) + (eff.dmgVsSlowed || 0.01);
    if (rs.slowApplied) rs.troopAtkMult *= (1 + (eff.dmgVsSlowed || 0.01));
    roundLog.actions.push({ actor: actorLabel, action: `🧠 Mind Games — Enemy CMD Confused + DMG vs Slowed +${Math.round((eff.dmgVsSlowed||0.01)*100)}%!`, dmg: 0, isTroopSkill: true });
    break;
  case "burn_dmg_received_reduce":
    // Reduce Burn DMG received by army (Tidal Wave)
    rs.burnDmgReceiveReduce = (rs.burnDmgReceiveReduce || 0) + (eff.value || 0.07);
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.07) * 0.5); // partial combat representation
    break;
  case "escalating_enemy_dmg_taken":
    // First N hits cause stacking enemy DMG received increase (Wise Wizard)
    if (!rs.escalatingEnemyDmgTaken) rs.escalatingEnemyDmgTaken = { instances: eff.instances || 5, valuePerInstance: eff.valuePerInstance || 0.015, applied: 0 };
    if (rs.escalatingEnemyDmgTaken.applied < rs.escalatingEnemyDmgTaken.instances) {
      rs.escalatingEnemyDmgTaken.applied++;
      rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + rs.escalatingEnemyDmgTaken.valuePerInstance;
    }
    break;
  case "army_evasion_per_round_chance":
    // Each round: chance for allied units to evade first hit (Teleport)
    rs.armyEvasionPerRoundChance = (rs.armyEvasionPerRoundChance || 0) + (eff.chance || 0.02);
    if (Math.random() < rs.armyEvasionPerRoundChance) {
      rs.invisibleUnits = Math.max(rs.invisibleUnits, 2);
      roundLog.actions.push({ actor: actorLabel, action: `✨ Teleport — Units evade first hit!`, dmg: 0, isTroopSkill: true });
    }
    break;
  // ── Ryn mechanics ─────────────────────────────────────────────────────────
  case "aoe_burn_damage_chance":
    // AoE burn DMG (FOC mod) + burn application chance (Blade of Fire)
    rs.cmdAoe       = true;
    rs.focusDmgBonus += eff.value || 0.10;
    if (Math.random() < (eff.burnChance || 0.40)) {
      rs.burnApplied    = true;
      rs.burnDmgPenalty = 0.20;
      rs.enemyAtkReduce += 0.20;
      roundLog.actions.push({ actor: actorLabel, action: `🔥 Blade of Fire — All enemies hit + Burned!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "branch_dmg_bonus_vs_status":
    // Branch units deal bonus DMG vs enemies with a specific status (Feel the Burn)
    rs.branchDmgBonusVsStatus = { branch: eff.branch, status: eff.status, value: eff.value || 0.02 };
    if (rs.burnApplied && eff.status === "burn") rs.troopAtkMult *= (1 + (eff.value || 0.02));
    if (rs.pendingVenomDmg > 0 && eff.status === "poison") rs.troopAtkMult *= (1 + (eff.value || 0.02));
    break;
  case "focus_poison_highest_def":
    // Focus/Poison DMG vs highest DEF target + Poison DoT chance (Poisoned Blade)
    rs.focusDmgBonus += eff.value || 0.20;
    if (Math.random() < (eff.poisonChance || 0.45)) {
      rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, 0.10);
      roundLog.actions.push({ actor: actorLabel, action: `☠️ Poisoned Blade — Poison DoT applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "enemy_status_def_down":
    // Passive DEF down on enemies with a status (A Bad Time)
    rs.enemyStatusDefDown = { status: eff.status || "poison", defDown: eff.defDown || 2.0 };
    if ((eff.status === "poison" && rs.pendingVenomDmg > 0) || (eff.status === "burn" && rs.burnApplied)) {
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 2.0), 50);
    }
    break;
  case "focus_damage_multi_stun":
    // Multi-target focus DMG + stun chance (Lightning Blade)
    rs.focusDmgBonus += eff.value || 0.20;
    if (Math.random() < (eff.stunChance || 0.30)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
      roundLog.actions.push({ actor: actorLabel, action: `⚡ Lightning Blade — Enemy stunned!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "aoe_focus_strip_debuffs":
    // AoE focus DMG + strip debuffs + bonus DMG per debuff stripped (Game Over)
    {
      rs.cmdAoe       = true;
      rs.focusDmgBonus += eff.value || 0.10;
      // Count and strip active debuffs from enemy
      let debuffCount = 0;
      if (rs.burnApplied)        { debuffCount++; rs.burnApplied = false; rs.burnDmgPenalty = 0; rs.enemyAtkReduce = Math.max(0, rs.enemyAtkReduce - 0.20); }
      if (rs.pendingVenomDmg>0)  { debuffCount++; rs.pendingVenomDmg = 0; }
      if (rs.enemyStunned>0)     { debuffCount++; rs.enemyStunned = 0; }
      if (rs.enemyConfused>0)    { debuffCount++; rs.enemyConfused = 0; }
      if (rs.blindApplied)       { debuffCount++; rs.blindApplied = false; }
      if (rs.slowApplied)        { debuffCount++; rs.slowApplied = false; rs.slowValue = 0; }
      if (debuffCount > 0) {
        rs.focusDmgBonus += debuffCount * (eff.bonusPerDebuff || 1.00);
        roundLog.actions.push({ actor: actorLabel, action: `💥 Game Over — ${debuffCount} debuffs stripped → +${Math.round(debuffCount*(eff.bonusPerDebuff||1.00)*100)}% bonus Focus DMG!`, dmg: 0, isTroopSkill: true });
      }
      rs.gameOverActive = true;
    }
    break;
  case "multi_flat_def_down":
    // Flat DEF reduction on multiple targets (Still Standing?)
    rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 5.0), 50);
    roundLog.actions.push({ actor: actorLabel, action: `😤 Still Standing? — ${eff.targets||2} units DEF -${eff.defDown||5}!`, dmg: 0, isTroopSkill: true });
    break;
  // ── Vex mechanics ─────────────────────────────────────────────────────────
  case "focus_damage_multi_vuln":
    // Focus DMG + next focus hit on target deals more (A Wizard's Power)
    rs.focusDmgBonus += eff.value || 0.12;
    rs.focusVulnOnTarget = (rs.focusVulnOnTarget || 0) + (eff.focVuln || 0.10);
    break;
  case "branch_followup_early_rounds":
    // Branch units get follow-up chance in first N rounds (Wizard Onslaught)
    if (round <= (eff.maxRound || 3)) {
      rs.factionFollowupPerRound = (rs.factionFollowupPerRound || 0) + (eff.chance || 0.09);
    }
    break;
  case "aoe_focus_min_dmg_chance":
    // AoE focus DMG + chance for targets to deal min damage next round (Powerful Suppression)
    rs.cmdAoe       = true;
    rs.focusDmgBonus += eff.value || 0.06;
    {
      const mChance = eff.maxLevelEffect?.minDmgChance ?? eff.minDmgChance ?? 0.40;
      if (Math.random() < mChance) {
        rs.enemyForcedMinDmg = true;
        roundLog.actions.push({ actor: actorLabel, action: `🌪️ Powerful Suppression — Enemies deal minimum damage next round!`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  case "focus_burn_damage_single":
    // Single-target focus burn DMG (Flaming Arrow — Dragon priority)
    rs.focusDmgBonus += eff.value || 0.30;
    if (Math.random() < (eff.burnChance || 0.35)) {
      rs.burnApplied    = true;
      rs.burnDmgPenalty = 0.20;
      rs.enemyAtkReduce += 0.20;
      roundLog.actions.push({ actor: actorLabel, action: `🏹 Flaming Arrow — Burn applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "cmd_focus_dmg_bonus":
    // Passive CMD focus DMG bonus (Meditation)
    rs.focusDmgBonus += eff.value || 0.02;
    rs.cmdMult        *= (1 + (eff.value || 0.02));
    break;
  case "focus_damage_poison_dot":
    // Focus DMG + Poison DoT (Poison Arrow)
    rs.focusDmgBonus   += eff.value || 0.10;
    rs.pendingVenomDmg  = Math.max(rs.pendingVenomDmg, eff.poisonDotPct || 0.10);
    roundLog.actions.push({ actor: actorLabel, action: `☠️ Poison Arrow — Poison DoT applied!`, dmg: 0, isTroopSkill: true });
    break;
  case "focus_damage_heal_block":
    // Focus DMG + heal block (Not So Fast)
    rs.focusDmgBonus += eff.value || 0.10;
    rs.blockHeal       = Math.max(rs.blockHeal || 0, eff.healBlockDuration || 2);
    break;
  case "enemy_alignment_vulnerability":
    // Enemy units of a specific alignment take more DMG (Destroy All Creatures)
    rs.enemyAlignmentVuln = { alignment: eff.alignment || "creatures", value: eff.value || 0.04 };
    rs.enemyDmgTakenUp    = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.04);
    break;
  case "branch_dual_stat_passive":
    // Branch DMG up + DMG received down (Bound to Me)
    rs.branchDualStatPassive = { branch: eff.branch || "golems", dmgUp: eff.dmgUp || 0.01, dmgReceiveDown: eff.dmgReceiveDown || 0.01 };
    rs.troopAtkMult *= (1 + (eff.dmgUp || 0.01));
    rs.dmgReduce     = Math.min(0.85, rs.dmgReduce + (eff.dmgReceiveDown || 0.01));
    if (eff.maxLevelEffect?.golemBurnPoisonImmune) {
      rs.golemBurnPoisonImmune = true;
      roundLog.actions.push({ actor: actorLabel, action: `⛓️ Bound to Me — Golems immune to Burn and Poison!`, dmg: 0, isTroopSkill: true });
    }
    break;
  // ── Mira mechanics ────────────────────────────────────────────────────────
  case "enemy_role_vulnerability":
    // Enemy units of specific role take more DMG (Front Line Combat)
    rs.enemyRoleVuln = { role: eff.role || "melee", value: eff.value || 0.03 };
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.03);
    break;
  case "physical_damage_multi_faction_bonus":
    // Multi-target physical DMG with bonus vs specific faction (Many Trophies)
    rs.cmdMult *= (1 + (eff.value || 0.20));
    rs.physDmgMultiFactionBonus = { prioritise: eff.prioritise || "dragons", bonusFaction: eff.bonusFaction || "dragons", bonusDmg: eff.bonusDmg || 0.60 };
    // Check if primary def slot is dragon faction for bonus
    {
      const defFaction = primaryDefSlot?.branch?.faction;
      if (defFaction === (eff.bonusFaction || "dragons")) rs.cmdMult *= (1 + (eff.bonusDmg || 0.60));
    }
    break;
  case "late_round_skill_dmg_bonus":
    // Skills deal bonus DMG in late rounds (Plenty of Stamina)
    if (round >= (eff.minRound || 5)) {
      rs.skillDmgBonus += eff.value || 0.03;
      if (eff.maxLevelEffect?.lateRoundConfusionImmune) {
        rs.invisStunImmune = true; // reuse confusion immune flag
      }
    }
    break;
  case "early_round_def_up_dmg_down":
    // Early rounds: DEF up but DMG down (Testing the Water)
    if (round <= (eff.maxRound || 3)) {
      rs.troopDefMult *= (1 + (eff.defUp || 0.09));
      rs.troopAtkMult *= (1 - (eff.dmgDown || 0.09));
    }
    break;
  case "atk_threshold_bonuses":
    // ATK-gated passive bonuses (Hit the Gym)
    {
      const curAtk = cmdAtkStat;
      if (curAtk >= (eff.tier1Atk || 200)) rs.ignoreDefPct = (rs.ignoreDefPct || 0) + (eff.tier1DefIgnore || 0.01);
      if (curAtk >= (eff.tier2Atk || 225)) rs.cmdBonusAttackChance += (eff.tier2SecondAtkChance || 0.03);
      if (curAtk >= (eff.tier3Atk || 250)) rs.pursuitActive = Math.random() < (eff.tier3UnblockChance || 0.06);
    }
    break;
  case "all_small_army_cmd_bonus":
    // All-small army: CMD ATK + SPD bonus (Small and Quick)
    {
      const allSmall = atkSlotResolved.length > 0 && atkSlotResolved.every(sl => sl.branchDef?.size === "small");
      if (allSmall) {
        rs.cmdMult    *= (1 + (eff.atkValue || 1.0) / 100);
        rs.cmdSpdBonus += eff.spdValue || 1.0;
        roundLog.actions.push({ actor: actorLabel, action: `🏃 Small and Quick — All-small army: CMD ATK & SPD bonus!`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  // ── Dov mechanics ─────────────────────────────────────────────────────────
  case "neutral_tile_troop_loss_reduce":
    // Reduce troop losses when attacking unowned tiles (Tiler)
    if (defTile?.owner === "neutral" || defTile?.owner === "ai") {
      rs.troopLossReduce = (rs.troopLossReduce || 0) + (eff.value || 0.03);
      roundLog.actions.push({ actor: actorLabel, action: `🗺️ Tiler — Unowned tile: Troop Losses -${Math.round((eff.value||0.03)*100)}%!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "reinforcement_time_reduce":
    // Non-combat: reduce reinforcement time
    rs.reinforcementTimeReduce = (rs.reinforcementTimeReduce || 0) + (eff.value || 0.07);
    break;
  case "keep_battle_dmg_bonus":
    // DMG bonus when fighting Keep armies (Keep Taker)
    if (defTile?.isKeep || defTile?.isGate) {
      rs.troopAtkMult *= (1 + (eff.value || 0.01));
      rs.cmdMult      *= (1 + (eff.value || 0.01));
      if (eff.maxLevelEffect?.keepStunImmune) rs.invisStunImmune = true;
      roundLog.actions.push({ actor: actorLabel, action: `🏯 Keep Taker — Keep battle: DMG +${Math.round((eff.value||0.01)*100)}%${eff.maxLevelEffect?.keepStunImmune ? " + Stun Immune!" : ""}`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "combat_xp_bonus":
    // Non-combat: XP from combat bonus (Fighter)
    rs.combatXpBonus = (rs.combatXpBonus || 0) + (eff.value || 0.015);
    break;
  case "mock_battle_xp_bonus":
    // Non-combat: XP from mock battles bonus (Trainer)
    rs.mockBattleXpBonus = (rs.mockBattleXpBonus || 0) + (eff.value || 0.03);
    break;
  case "reposition_speed_bonus":
    // Non-combat: reposition speed bonus (Mover)
    rs.repositionSpeedBonus = (rs.repositionSpeedBonus || 0) + (eff.value || 0.07);
    break;
  // ── Oren mechanics ────────────────────────────────────────────────────────
  case "multi_hit_random_atk_stack":
    // Multi-hit random targets, ATK stacks per unique unit hit (Hexblade)
    {
      rs.cmdMult *= (1 + (eff.dmgPct || 0.04) * (eff.hits || 6));
      rs.multiHitRandomAtkStack = { hits: eff.hits || 6, dmgPct: eff.dmgPct || 0.04, atkPerUniqueHit: eff.atkPerUniqueHit || 10 };
      // Award ATK bonus for each unique unit hit (assume 2-3 units hit on average)
      const uniqueHits = Math.min(eff.hits || 6, defSlotResolved.length || 1);
      rs.cmdSpdBonus += uniqueHits * (eff.atkPerUniqueHit || 10); // stored; actual ATK gain is pre-battle
      roundLog.actions.push({ actor: actorLabel, action: `🔯 Hexblade — ${eff.hits||6} hits + ATK +${uniqueHits * (eff.atkPerUniqueHit||10)}!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "physical_damage_spd_mod":
    // Physical DMG modified by SPD stat (Blinding Speed)
    {
      const spdScale = Math.max(1, (atkCmdSpd || 60) / 60);
      rs.cmdMult *= (1 + (eff.value || 0.20)) * spdScale;
    }
    break;
  case "physical_damage_cmd_spd_boost":
    // Physical DMG + CMD SPD boost for N rounds (Lieutenant of Spellblades)
    rs.cmdMult     *= (1 + (eff.value || 0.25));
    rs.cmdSpdBonus += (eff.spdBoostPct || 1.00) * (atkCmdSpd || 60); // +100% SPD = double current SPD
    roundLog.actions.push({ actor: actorLabel, action: `⚡ Lieutenant of Spellblades — ${eff.targets||2} enemies hit + CMD SPD +${Math.round((eff.spdBoostPct||1.00)*100)}% (${eff.spdDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
    break;
  case "heal_two_units_dragon_bonus":
    // Heal 2 allied units; dragon units get extra healPct on top
    rs.healPct += eff.healPct || 0.05;
    rs.healTwoUnitsDragonBonus = { dragonBonusPct: eff.dragonBonusPct || 0.25 };
    break;
  case "neutral_tile_dmg_bonus":
    // Battle-context: tile.owner === 'neutral' grants DMG bonus (and at max level DMG received down)
    if (defTile?.owner === "neutral" || defTile?.owner === "ai") {
      rs.cmdMult      *= (1 + (eff.value || 0.01));
      rs.troopAtkMult *= (1 + (eff.value || 0.01));
      if (eff.maxLevelEffect?.neutralDmgReceivedDown) rs.dmgReduce += eff.maxLevelEffect.neutralDmgReceivedDown;
      roundLog.actions.push({ actor: actorLabel, action: `🏹 Hunter — Unowned tile: DMG +${Math.round((eff.value||0.01)*100)}%!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "gathering_bonus":
    // Non-combat world-map bonus — no battle effect
    rs.gatheringBonus = (rs.gatheringBonus || 0) + (eff.value || 0.05);
    break;
  case "aoe_blind_or_burn_chance":
    // Each enemy unit independently rolls — apply one status to all that proc
    rs.aoeBlindOrBurnChance = { chance: eff.chance || 0.03, duration: eff.duration || 1 };
    if (Math.random() < (eff.chance || 0.03)) {
      if (Math.random() < 0.50) {
        rs.blindApplied = true;
        roundLog.actions.push({ actor: actorLabel, action: `🌑 Smoke and Fire — Enemy Blinded!`, dmg: 0, isTroopSkill: true });
      } else {
        rs.burnApplied    = true;
        rs.burnDmgPenalty = 0.20;
        rs.enemyAtkReduce += 0.20;
        roundLog.actions.push({ actor: actorLabel, action: `🌑 Smoke and Fire — Enemy Burned!`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  case "branch_flat_def_bonus":
    // Flat DEF bonus to a specific branch (Dragon Garrison, Me Little Army Big)
    rs.branchFlatDefBonus = { branch: eff.branch || "dragons", value: eff.value || 3 };
    rs.troopDefMult *= (1 + (eff.value || 3) / 100);
    break;
  case "branch_dmg_bonus_vs_alignment":
    // Dragon units deal bonus DMG vs a specific alignment (The Superior Race)
    rs.branchDmgBonusVsAlignment = { branch: eff.branch || "dragons", alignment: eff.alignment || "humans", value: eff.value || 0.01 };
    rs.troopAtkMult *= (1 + (eff.value || 0.01));
    break;
  case "cmd_foc_up_atk_down_passive":
    // Pre-battle stat shift: FOC up, ATK down. At max level: Dragon Units Confusion Immune.
    rs.cmdFocUpAtkDown = { focPerLevel: eff.focPerLevel || 1.0, atkDownPerLevel: eff.atkDownPerLevel || 1.0 };
    // Confusion immunity for dragon units at max level — applied as branch immunity
    if (eff.maxLevelEffect?.dragonConfusionImmunity) {
      rs.dragonConfusionImmune = true;
      roundLog.actions.push({ actor: actorLabel, action: `🌙 To Become an Elder — Dragon Units: Confusion Immune!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "branch_dmg_up_duration":
    // Dragon units DMG up for N rounds (Locked In)
    rs.branchDmgUpDuration = { branch: eff.branch || "dragons", value: eff.value || 0.03 };
    rs.troopAtkMult *= (1 + (eff.value || 0.03));
    break;
  case "aoe_focus_damage_foc_mod":
    // AoE focus damage modified by FOC stat (Dusk's Blast)
    rs.cmdAoe       = true;
    rs.focusDmgBonus += eff.value || 0.80;
    roundLog.actions.push({ actor: actorLabel, action: `💥 Dusk's Blast — All enemies hit!`, dmg: 0, isTroopSkill: true });
    break;
  // ── Kraul mechanics ───────────────────────────────────────────────────────
  case "dual_branch_stat_bonus":
    // Two different branches each get a different stat bonus (I'll Work With It)
    rs.dualBranchStatBonus = {
      branch1: eff.branch1, branch1Stat: eff.branch1Stat, branch1Value: eff.branch1Value || 2.0,
      branch2: eff.branch2, branch2Stat: eff.branch2Stat, branch2Value: eff.branch2Value || 0.01,
    };
    if (eff.branch1Stat === "def") rs.troopDefMult *= (1 + (eff.branch1Value || 2.0) / 100);
    if (eff.branch2Stat === "dmg") rs.troopAtkMult *= (1 + (eff.branch2Value || 0.01));
    break;
  case "on_attack_bonus_dmg_chance":
    // On attack: chance for flat bonus damage (Fire Fight)
    rs.onAttackBonusDmgChance = { chance: eff.chance || 0.05, bonusDmg: eff.bonusDmg || 0.40 };
    break;
  case "branch_phys_dmg_reduce":
    // Physical damage received reduction for a branch (Tough Scales)
    rs.branchPhysDmgReduce = { branch: eff.branch || "dragons", value: eff.value || 0.01 };
    rs.dmgReduce += eff.value || 0.01;
    break;
  case "all_dragon_army_cmd_atk":
    // If all allied units are dragons: CMD ATK bonus (Future King)
    rs.allDragonArmyCmdAtk = { value: eff.value || 2.0 };
    // Check if all troop slots are dragon faction — apply if so
    {
      const allDragon = atkSlotResolved.length > 0 && atkSlotResolved.every(sl => sl.branch?.faction === "dragons");
      if (allDragon) {
        rs.cmdMult *= (1 + (eff.value || 2.0) / 100);
        roundLog.actions.push({ actor: actorLabel, action: `👑 Future King — All-Dragon army: CMD ATK +${eff.value||2}!`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  case "aoe_physical_stun_chance":
    // AoE physical + stun chance (Kraul on the Prowl)
    rs.cmdAoe  = true;
    rs.cmdMult *= (1 + (eff.value || 0.40));
    if (Math.random() < (eff.stunChance || 0.40)) {
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.stunDuration || 1);
      roundLog.actions.push({ actor: actorLabel, action: `💥 Kraul on the Prowl — All enemies hit + Stunned!`, dmg: 0, isTroopSkill: true });
    }
    break;
  // ── Cinderfang mechanics ──────────────────────────────────────────────────
  case "physical_damage_multi_burn_chance":
    // Multi-target physical + burn chance (I Can Help)
    rs.cmdMult *= (1 + (eff.value || 0.10));
    {
      const burnChance = eff.maxLevelEffect?.burnChance ?? eff.burnChance ?? 0.35;
      if (Math.random() < burnChance) {
        rs.burnApplied    = true;
        rs.burnDmgPenalty = eff.burnDmgPenalty || 0.20;
        rs.enemyAtkReduce += rs.burnDmgPenalty;
        roundLog.actions.push({ actor: actorLabel, action: `🔥 I Can Help — Burn applied!`, dmg: 0, isTroopSkill: true });
      }
    }
    break;
  case "branch_flat_hp_def_bonus":
    // Flat HP and DEF bonus to a branch (Me Little, Army Big)
    rs.branchFlatHpDefBonus = { branch: eff.branch || "dragons", hpValue: eff.hpValue || 1, defValue: eff.defValue || 1 };
    rs.troopDefMult *= (1 + (eff.defValue || 1) / 100);
    break;
  case "physical_damage_confusion_chance":
    // Physical damage + confusion chance (Don't Underestimate Me)
    rs.cmdMult *= (1 + (eff.value || 0.40));
    if (Math.random() < (eff.confusionChance || 0.45)) {
      rs.enemyConfused = Math.max(rs.enemyConfused || 0, eff.confusionDuration || 1);
      roundLog.actions.push({ actor: actorLabel, action: `😤 Don't Underestimate Me — Enemy Confused!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "aoe_enemy_buff_strip_chance":
    // Chance to strip all positive buffs from enemy army (Clear the Air)
    if (Math.random() < (eff.chance || 0.04)) {
      rs.enemyBuffStripped = true;
      // Reset key enemy positive buffs
      rs.enemyDmgTakenUp  = Math.max(0, rs.enemyDmgTakenUp);  // can't strip vulnerability as it's an enemy debuff
      roundLog.actions.push({ actor: actorLabel, action: `🌬️ Clear the Air — All enemy buffs stripped!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "branch_heal_on_debuff":
    // Dragon units heal on receiving a debuff (You Get a Heal!)
    rs.branchHealOnDebuff = { branch: eff.branch || "dragons", healPct: eff.healPct || 0.06, maxPerRound: eff.maxPerRound || 1, usedThisRound: 0 };
    break;
    rs.debuffChanceReduction += eff.value || 0.07;
    break;
  case "burst_then_penalty":
    if (round <= (eff.earlyRounds || 2)) {
      rs.cmdMult      *= (1 + (eff.earlyBonus || 0.14));
      rs.troopAtkMult *= (1 + (eff.earlyBonus || 0.14));
    } else if ((eff.penaltyRounds||[3,4,5]).includes(round)) {
      rs.cmdMult      *= (1 - (eff.penaltyValue || 0.50));
      rs.troopAtkMult *= (1 - (eff.penaltyValue || 0.50));
    }
    break;
  case "physical_damage_delayed_followup":
    rs.cmdMult *= (1 + (eff.initialDmg || 0.20));
    // Follow-up queued for next round — flagged
    rs.pendingFollowupDmg = eff.followupDmg || 0.30;
    break;
  case "post_attack_vulnerability":
  { // After each commander attack the target takes +X% DMG for N rounds; up to M independent stacks
    const cs = ctx?.cs, v = eff.value || 0.015;
    if (cs) {
      const key = `vuln:${skill?.name}`;
      const live = (cs.stacks[key] || []).filter(u => u >= round);
      live.push(round + (eff.duration || 2) - 1);
      cs.stacks[key] = live.slice(-(eff.maxStacks || 2));
      rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + v * cs.stacks[key].length;
    } else rs.weakSpotStacks.push({ value: v, roundsLeft: eff.duration || 2 });
    break; }
  case "multi_hit_escalating":
    rs.multiHitEscalating = eff.hits || [0.15, 0.17, 0.19];
    break;
  case "physical_damage_followup":
  { // was `rs.cmdMult = 0.27` (overwrote commander damage down to 27%)
    let hit = eff.value ?? eff.initialDmg ?? 0.27;
    if (Math.random() < (eff.followupChance || 0.50)) hit += (eff.followupDmg || 0.27) * (eff._lvlMul || 1);
    rs.cmdMult *= (1 + hit);
    break; }
  case "aoe_physical_stun":
    rs.cmdAoe = true;
    if (Math.random() < (eff.stunChance || 0.35))
      rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
    break;
  case "physical_damage_self_debuff":
    // was `rs.cmdMult = 1.00` (overwrote). Self debuff hits the commander's NEXT damage.
    rs.cmdMult *= (1 + (eff.value ?? eff.dmg ?? 1.00));
    debuffCommander(ctx, roundLog, actorLabel, skill?.name, () => {
      if (ctx?.cs) ctx.cs.nextDmgPenalty = Math.max(ctx.cs.nextDmgPenalty || 0, eff.selfDebuff || 0.40);
      else rs.selfDebuffNextHit = eff.selfDebuff || 0.40;
    });
    break;
  case "confusion_immunity_chance":
    if (Math.random() < (eff.chance || 0.10))
      rs.enemyConfused = 0; // clear any confusion immediately
    break;
  case "physical_damage_large_bonus":
    // was `rs.cmdMult = 0.30` (overwrote commander damage)
    rs.cmdMult *= (1 + (eff.value ?? eff.primaryDmg ?? 0.30));
    if (ctx?.defSizes?.has("large")) rs.cmdMult *= (1 + (eff.largeBonusDmg || 0.20));
    break;
  case "first_skills_dmg_bonus":
    if (rs.firstSkillsRemaining > 0) {
      rs.firstSkillsBonus = eff.bonus || 0.05;
      rs.firstSkillsRemaining--;
    }
    break;
  case "cmd_normal_atk_bonus":
    rs.cmdMult = (rs.cmdMult || 1) + (eff.value || 0);
    break;
}
if (!quiet) roundLog.actions.push({ actor:actorLabel, action:`${skill.icon} ${skill.name}`, dmg:0, isTroopSkill:true });
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

// ── Hero skill: structured `effect` skills (per-faction *_skills.js) ──────────
// Faction skill files describe skills with `effect:{type,...}` + base/perLevel
// + maxLevelEffect instead of the flat fields above. Route them through the
// same effect resolver the troop skills use. Actives run on their fire rounds,
// passives every round (rs is rebuilt each round). `effect.value` is replaced
// by the level-scaled base+perLevel value; at max level (main 15 / side 7) the
// skill's maxLevelEffect is attached (and its keys override effect params).
const CMD_MAIN_MAX_LVL = 15, CMD_SIDE_MAX_LVL = 7;
const MLE_STAT_KEYS = {
  atkBonus:"cmdAtkFlat", focusBonus:"cmdFocFlat", cmdFocBonus:"cmdFocFlat", bonusFocus:"cmdFocFlat", bonusFocUp:"cmdFocFlat",
  spdBonus:"cmdSpdBonus", cmdSpdBonus:"cmdSpdBonus", atkDown:"enemyCmdAtkFlatDown", spdDown:"enemySpdFlatDown",
};
// Keys whose own case block already reads eff.maxLevelEffect.<key> (don't double-apply).
const MLE_HANDLER_OWNED = new Set(["undead_buff_enemy_def_down:atkBonus", "silence_and_foc_vuln:cmdFocBonus"]);
const MLE_UNIT_RE = /^(pirate|orc|hk|holyKnight|dragon|coldbornc|warg|werewolf|skeletonMummy|skeleton|mummy|spider|mounted|army|)(?:Troop)?(HpBonus|DefBonus|CombatSpd|BonusDmg|DmgRangeMin|DmgRangeMax|DmgStatMin|DmgStatMax|DmgRangeBonus|HealingReceivedUp)$/i;
const MLE_GROUPS = {
  pirate:{ faction:"pirates" }, orc:{ faction:"orcs" }, hk:{ faction:"holyknights" }, holyknight:{ faction:"holyknights" },
  dragon:{ faction:"dragons" }, coldbornc:{ faction:"coldborns" },
  warg:{ branches:["warg_riders"] }, werewolf:{ branches:["werewolves"] }, skeleton:{ branches:["skeleton_legion"] },
  mummy:{ branches:["mummies"] }, skeletonmummy:{ branches:["skeleton_legion","mummies"] }, spider:{ branches:["spiders"] },
  mounted:{ role:"mounted" }, army:{},
};
// Conditional "vs <status> enemy" max bonuses → extra damage dealt while that status is on the enemy.
const MLE_COND_DMG = {
  drunkDmgBonus:"drunk", debuffedTakeMoreDmg:"debuffed", poisonedTakeMoreDmg:"poisoned",
  armyDmgVsBleedOrBurn:"bleedOrBurn", frostbittenSkillDmgTakenUp:"frostbitten",
};
const MLE_COND_DEF = { burnedEnemyDefDown:"burned", slowedEnemyDefDown:"slowed", drunkEnemyDefDown:"drunk", creatureEnemyDefDown:"creature" };

function enemyHasStatus(rs, status, ctx) {
  switch (status) {
    case "drunk":       return !!rs.drunkApplied;
    case "poisoned":    return (rs.pendingVenomDmg || 0) > 0 || !!rs.venomApplied;
    case "burned":      return !!rs.burnApplied;
    case "slowed":      return !!rs.slowApplied;
    case "frostbitten": return !!rs.frostbiteApplied || (rs.frostbiteRoundsLeft || 0) > 0;
    case "bleedOrBurn": return !!rs.bleedApplied || !!rs.burnApplied;
    case "creature":    return ctx.defAlignment === "creatures";
    case "debuffed":    return (rs.enemyStunned || 0) > 0 || (rs.enemyConfused || 0) > 0 || (rs.enemyDefDown || 0) > 0 || (rs.enemyDefFlatDown || 0) > 0
                          || ["drunk","poisoned","burned","slowed","frostbitten","bleedOrBurn"].some(s => enemyHasStatus(rs, s, ctx));
    default: return false;
  }
}

function slotMatches(sl, group, ownFaction) {
  const g = MLE_GROUPS[group.toLowerCase()] ?? (group === "" ? { faction: ownFaction } : null);
  if (!g) return false;
  if (g.faction) return sl.branch?.faction === g.faction;
  if (g.branches) return g.branches.includes(sl.branch?.branch);
  if (g.role) return sl.branchDef?.role === g.role;
  return true;
}

function applyMaxLevelBonuses(mle, effType, rs, ctx) {
  const slots = ctx.atkSlots || [];
  const totalTroops = slots.reduce((s, sl) => s + (sl.troops || 0), 0) || 1;
  const ranges = {};
  for (const [k, v] of Object.entries(mle)) {
    if (typeof v !== "number" || MLE_HANDLER_OWNED.has(`${effType}:${k}`)) continue;
    if (MLE_STAT_KEYS[k]) { rs[MLE_STAT_KEYS[k]] = (rs[MLE_STAT_KEYS[k]] || 0) + v; continue; }
    if (MLE_COND_DMG[k]) { if (enemyHasStatus(rs, MLE_COND_DMG[k], ctx)) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + v; continue; }
    if (MLE_COND_DEF[k]) { if (enemyHasStatus(rs, MLE_COND_DEF[k], ctx)) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown || 0) + v, 50); continue; }
    if (k === "drunkEnemyHpDown") { if (rs.drunkApplied) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + v / (ctx.defHpPer || 25); continue; }
    if (k === "bleedSpreadChance") { if (rs.bleedApplied) rs.pendingBleedDmg = (rs.pendingBleedDmg || 0) * (1 + v); continue; }
    const m = k.match(MLE_UNIT_RE);
    if (!m) continue;
    const [, group, stat] = m;
    const matched = slots.filter(sl => slotMatches(sl, group, ctx.ownFaction));
    const share = matched.reduce((s, sl) => s + (sl.troops || 0), 0) / totalTroops;
    if (!matched.length || share <= 0) continue;
    const avg = f => matched.reduce((s, sl) => s + f(sl), 0) / matched.length;
    if (stat === "HpBonus")        rs.troopDefMult *= 1 + (v >= 1 ? v / avg(sl => sl.hpPer || 25) : v) * share;
    else if (stat === "DefBonus")  rs.troopDefMult *= 1 + (v >= 1 ? v / avg(sl => sl.def || 20) : v) * share;
    else if (stat === "BonusDmg")  rs.troopAtkMult *= 1 + v * share;
    else if (stat === "HealingReceivedUp") rs.healPct *= 1 + v * share;
    else if (stat === "CombatSpd") {
      rs.slotSpdBonus = rs.slotSpdBonus || [];
      slots.forEach((sl, i) => { if (matched.includes(sl)) rs.slotSpdBonus[i] = (rs.slotSpdBonus[i] || 0) + v; });
    } else {
      // DMG range / DMG stat +lo–hi on matching units → average added to unit damage
      const r = ranges[group] || (ranges[group] = { lo:0, hi:0, matched, share });
      if (/Min$/.test(stat)) r.lo += v; else if (/Max$/.test(stat)) r.hi += v; else { r.lo += v; r.hi += v; }
    }
  }
  for (const r of Object.values(ranges)) {
    const baseDmg = r.matched.reduce((s, sl) => s + ((sl.tierData?.dmgLo ?? 20) + (sl.tierData?.dmgHi ?? 25)) / 2, 0) / r.matched.length;
    rs.troopAtkMult *= 1 + ((r.lo + r.hi) / 2 / (baseDmg || 20)) * r.share;
  }
}

export function commanderSkillIsMax(key, level) {
  return level >= (MAIN_SKILLS[key] ? CMD_MAIN_MAX_LVL : CMD_SIDE_MAX_LVL);
}

// Builds the effect object a structured commander skill resolves with at `level`.
export function commanderSkillEffect(key, def, level) {
  const eff = { ...def.effect };
  if (def.base != null) eff.value = def.base + (def.perLevel ?? 0) * (level - 1);
  // Level multiplier vs Lv1 — for secondary numbers the description scales with level too
  eff._lvlMul = def.base ? eff.value / def.base : 1;
  if (def.maxLevelEffect && commanderSkillIsMax(key, level)) {
    for (const [k, v] of Object.entries(def.maxLevelEffect)) {
      if (!MLE_STAT_KEYS[k] && !MLE_UNIT_RE.test(k) && !MLE_COND_DMG[k] && !MLE_COND_DEF[k]) eff[k] = v;
    }
    eff.maxLevelEffect = def.maxLevelEffect;
  }
  return eff;
}

function newCommanderSkillState() {
  return { buffs: [], poisons: [], stacks: {}, pendingSkillBonus: 0, firstSkillDone: false, nextDmgPenalty: 0,
           cleanseChance: 0, retaliationBonus: 0, firstSkillBonus: 0 };
}

function applyCommanderSkillEffects(skills, round, rs, roundLog, actorLabel, ctx) {
  const cs = ctx.cs || (ctx.cs = newCommanderSkillState());
  ctx.isCommander = true;
  ctx.round = round;
  const list = [];
  for (const { key, def, level } of skills) {
    if (!def?.effect?.type || def.notImplemented) continue;
    list.push({ key, def, eff: commanderSkillEffect(key, def, level) });
  }
  // Reactive passives (fire on events, not per round)
  cs.cleanseChance = 0; cs.retaliationBonus = 0; cs.firstSkillBonus = 0;
  for (const { def, eff } of list) {
    if (def.effect.type === "reactive_cleanse_chance")     cs.cleanseChance += eff.value ?? eff.chance ?? 0.05;
    if (def.effect.type === "reactive_skill_dmg_on_debuff") cs.retaliationBonus = Math.max(cs.retaliationBonus, eff.value ?? eff.bonus ?? 0.05);
    if (eff.maxLevelEffect?.firstSkillDmgBonus)             cs.firstSkillBonus += eff.maxLevelEffect.firstSkillDmgBonus;
  }
  // Effects carried over from earlier rounds (timed buffs, DoTs, stacks, self-debuffs)
  cs.buffs = cs.buffs.filter(b => b.until >= round);
  for (const b of cs.buffs) if (b.from <= round) b.apply(rs);
  cs.poisons = cs.poisons.filter(p => p.until >= round);
  const poison = cs.poisons.reduce((t, p) => t + p.pct, 0);
  if (poison > 0) rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg || 0, poison);
  ctx.poisonActive = poison > 0 || !!ctx.venomTicking;
  if (cs.nextDmgPenalty > 0) {
    rs.cmdMult *= 1 - cs.nextDmgPenalty;
    roundLog.actions.push({ actor: actorLabel, action: `🔻 Self-debuff — commander DMG -${Math.round(cs.nextDmgPenalty*100)}% this round`, dmg: 0, isTroopSkill: true });
    cs.nextDmgPenalty = 0;
  }
  // Actives first (their stuns/bleeds/poisons are visible to conditional passives), then passives
  const carriedBonus = cs.pendingSkillBonus; cs.pendingSkillBonus = 0;
  const cm0 = rs.cmdMult, fd0 = rs.focusDmgBonus || 0;
  let fired = 0;
  const ran = [];
  for (const x of list) {
    if (x.def.type !== "active" || !skillFiresOnRound(x.def, round)) continue;
    applySkillEffect(x.def, x.eff, rs, roundLog, actorLabel, ctx.defTroopBranch, round, ctx.atkSlots, null, null, true, ctx);
    fired++; ran.push(x);
  }
  const cmA = rs.cmdMult, fdA = rs.focusDmgBonus || 0;
  ctx.activesFired = fired;
  for (const x of list) {
    if (x.def.type !== "passive") continue;
    applySkillEffect(x.def, x.eff, rs, roundLog, actorLabel, ctx.defTroopBranch, round, ctx.atkSlots, null, null, true, ctx);
    ran.push(x);
  }
  // "Skill damage +X%" (Grim's Focus, Human Scum, Retaliation, first-skill max bonus) scales only this round's active-skill damage
  if (fired > 0) {
    let b = (rs.skillDmgBonus || 0) + carriedBonus;
    if (!cs.firstSkillDone) { b += cs.firstSkillBonus; cs.firstSkillDone = true; }
    if (b) {
      const A = cm0 > 0 ? cmA / cm0 : 1;
      if (A > 1) rs.cmdMult *= (1 + (A - 1) * (1 + b)) / A;
      if (fdA > fd0) rs.focusDmgBonus += (fdA - fd0) * b;
    }
  } else if (carriedBonus) cs.pendingSkillBonus = Math.max(cs.pendingSkillBonus, carriedBonus);
  // Generic max-level bonuses run after every handler so status conditions set this round count
  for (const { eff, def } of ran) if (eff.maxLevelEffect) applyMaxLevelBonuses(eff.maxLevelEffect, def.effect.type, rs, ctx);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Core battle formulas (adapted from Theo Harkes / FireHeart)  ─────────────
// ══════════════════════════════════════════════════════════════════════════════

// Army Command Factor: 25 × Command ÷ (75 + Command)
function armyCommandFactor(command) {
  return 25 * command / (75 + command);
}

// Effective Command: Command × 50 ÷ 3 ÷ (75 + Command)
function effectiveCommand(command) {
  return command * 50 / 3 / (75 + command);
}

// Effective Units: EffectiveCommand × UnitsPerCommand
// unitsPerCommand: small=100, medium=50, large=4
function effectiveUnits(command, unitsPerCommand) {
  return effectiveCommand(command) * unitsPerCommand;
}

// Damage Coefficient: max(0.10, 1 + sum of relevant damage modifiers)
// modifiers: positive values increase damage, negative reduce it
function damageCoeff(modifierSum) {
  return Math.max(0.10, 1 + modifierSum);
}

// Physical Defence Reduction: -0.9 × Defence ÷ (120 + Defence)
// Returns a multiplier (e.g. -0.375 for def=100, meaning damage × 0.625)
function defReduction(def) {
  if (!def || def <= 0) return 0;
  return -0.9 * def / (120 + def);
}

// Recovery Coefficient: 1 + sum of recovery modifiers
function recoveryCoeff(modifierSum) {
  return Math.max(0, 1 + modifierSum);
}

// Scaling skill bonus per 100 Might/Focus by rarity
// soldier: 3–5%, veteran: 6–8%, champion: 9–11%
// Uses commander id hash for consistent per-commander variation within range
function scalingBonus(rarity, stat, cmdId) {
  const seed = (cmdId || 0) * 2654435761 >>> 0;
  const frac = (seed % 100) / 100; // 0.0–0.99 stable per commander
  let lo, hi;
  if (rarity === "champion") { lo = 0.09; hi = 0.11; }
  else if (rarity === "veteran") { lo = 0.06; hi = 0.08; }
  else { lo = 0.03; hi = 0.05; } // soldier / default
  const pctPer100 = lo + frac * (hi - lo);
  return (stat / 100) * pctPer100;
}

// Heal decay table: index = rounds ago damage was dealt
// Same round = index 0 (95%), 1 round ago = index 1 (82.7%), etc.
const HEAL_DECAY = [0.950, 0.827, 0.719, 0.626, 0.544, 0.473, 0.412, 0.358, 0.312, 0.271];

// Weighted average follow-up chance from multiple sources
// sources: [{ chance, eligibleRounds }, ...]
function followupStats(sources) {
  if (!sources || sources.length === 0) return { eligibleRounds: 0, chance: 0 };
  const totalRounds = sources.reduce((s, src) => s + (src.eligibleRounds || 0), 0);
  if (totalRounds === 0) return { eligibleRounds: 0, chance: 0 };
  const weightedChance = sources.reduce((s, src) => s + (src.chance || 0) * (src.eligibleRounds || 0), 0) / totalRounds;
  return { eligibleRounds: totalRounds, chance: weightedChance };
}

// ── Unit damage (troops) ──────────────────────────────────────────────────────
// Formula: DamageCoeff × ATK × EffectiveUnits × (totalRounds × followupEligibleRounds × followupChance)
// ATK for troops = their base dmg stat from tierData
// Defence reduction applied as multiplier
function calcTroopDmg(branchDef, tierData, enemyDef, defDownPct, command, terrMult, dmgModSum, ignoreDef, extraMult, followupSources, totalRounds) {
  if (!tierData) return 0;
  const dmgType    = branchDef?.dmgType ?? "physical";
  const atk        = tierData.dmgLo + Math.random() * (tierData.dmgHi - tierData.dmgLo);
  const size       = branchDef?.size ?? "small";
  const upc        = size === "large" ? 4 : size === "medium" ? 50 : 100;
  const effUnits   = effectiveUnits(command, upc);
  const dc         = damageCoeff(dmgModSum || 0);
  const effectiveDef = (ignoreDef || dmgType === "magical") ? 0 : enemyDef * (1 - (defDownPct || 0));
  const defMult    = 1 + defReduction(effectiveDef);
  const { eligibleRounds, chance } = followupStats(followupSources || []);
  const followupTerm = eligibleRounds * chance;
  const raw = dc * atk * effUnits * (totalRounds + followupTerm);
  return Math.max(1, Math.round(raw * terrMult * (extraMult || 1) * defMult));
}

// ── Commander normal attack ───────────────────────────────────────────────────
// Formula: DamageCoeff × Might × (4 + ArmyCommandFactor)
// Follow-up: both hits calculated then summed (handled at call site)
function calcCmdNormalDmg(might, command, dmgModSum) {
  const dc  = damageCoeff(dmgModSum || 0);
  const acf = armyCommandFactor(command);
  return Math.max(1, Math.round(dc * might * (4 + acf)));
}

// ── Physical skill damage ─────────────────────────────────────────────────────
// Formula: DamageCoeff × AttackCoeff × Might × (2 + ArmyCommandFactor)
// attackCoeff = skill% ÷ 100; scalingBonus added to attackCoeff for scaling skills
function calcCmdPhysicalSkillDmg(might, command, attackCoeff, dmgModSum) {
  const dc  = damageCoeff(dmgModSum || 0);
  const acf = armyCommandFactor(command);
  return Math.max(1, Math.round(dc * attackCoeff * might * (2 + acf)));
}

// ── Elemental / focus skill damage ────────────────────────────────────────────
// Formula: DamageCoeff × (2 × Focus + AttackCoeff × 100 × ArmyCommandFactor)
function calcCmdFocusSkillDmg(focus, command, attackCoeff, dmgModSum) {
  const dc  = damageCoeff(dmgModSum || 0);
  const acf = armyCommandFactor(command);
  return Math.max(1, Math.round(dc * (2 * focus + attackCoeff * 100 * acf)));
}

// ── Commander heal ────────────────────────────────────────────────────────────
// Formula: RecoveryCoeff × HealCoeff × 300 × ArmyCommandFactor
// healCoeff = heal% in coefficient form (200% → 2.0)
// Capped by heal decay against totalDamageTaken pool
function calcCmdHeal(command, healCoeff, recoveryModSum, totalDamageTaken, currentRound, damageRound) {
  const rc      = recoveryCoeff(recoveryModSum || 0);
  const acf     = armyCommandFactor(command);
  const raw     = rc * healCoeff * 300 * acf;
  // Decay cap: index = how many rounds ago damage was dealt
  const ago     = Math.max(0, Math.min(9, currentRound - (damageRound || currentRound)));
  const decayCap = totalDamageTaken * (HEAL_DECAY[ago] ?? HEAL_DECAY[9]);
  return Math.min(raw, decayCap);
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

// PvE damage bonuses. `cmd.crewPveDmgMult` / `cmd.crewSpawnDmgMult` ride
// along on the commander object the same way `cmd.faction` does (set on
// boostedCmd in useMarch.js / useTactics.js) since simBattle has no other way
// to see crew state.
//   - Faction "+N% Damage in PvE Battles" (e.g. wizards): any non-player
//     fight — neutral/AI tiles AND Spawn sweeps.
//   - Crew "PvE" perk: neutral/AI TILES only.
//   - Crew "Spawn Sweeper" perk: Spawn armies only (generateSpawnCommander()
//     sets `isSpawn: true`; onSweep's synthetic defTile carries it too).
// Never applies against another player.
const isPveBattle   = defTile?.owner === "neutral" || defTile?.owner === "ai";
const isSpawnFight  = !!(dc?.isSpawn || defTile?.isSpawn);
const facPveDmgMult = (isPveBattle || isSpawnFight)
  ? (1 + factionBonusValue(cmd.faction, "pveDmg") + (isPveBattle ? (cmd.crewPveDmgMult || 0) : 0))
  : 1;
const facSpawnDmgMult = isSpawnFight ? (1 + (cmd.crewSpawnDmgMult || 0)) : 1;

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

// Class bonuses — unlock at Lv20
const cmdRespectLevel = cmd.respectLevel ?? cmd.lvl ?? 5;
const bastionActive   = (cmd.cls === "balanced")   && (cmdRespectLevel >= 20);
const attackerBonus   = (cmd.cls === "attacker")   && (cmdRespectLevel >= 20);
const strategistBonus = (cmd.cls === "strategist") && (cmdRespectLevel >= 20);
const bastionHpMult   = bastionActive ? 2 : 1;

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
const cmdSkillState = newCommanderSkillState(); // commander-skill state that persists across rounds
let prevRoundVenomDmg = 0; // venom delayed focus damage carries over round to round
let bleedDmgPerRound  = 0; // bleed physical damage per round
let bleedRoundsActive = 0; // rounds of bleed remaining
// Heal decay tracking
let totalDamageTakenPool = 0; // running total of HP lost — used for skill heal decay cap
let damageFirstTakenRound = 1; // round when most recent damage pool started accumulating

const cmdAtkStat = cmd.atk || 150;
const cmdFocStat = cmd.foc || 0;
const atkCmdSpd  = cmd.spd || 60;
const defCmdSpd2 = dc ? (dc.spd || 40) : 40;

// Scaling attack bonus for this commander (consistent per cmd, varies by rarity)
const cmdScalingBonus = scalingBonus(cmd.rarity || "soldier", cmdAtkStat + cmdFocStat * 0.5, cmd.id || 0);

// Defender cmd stats for its normal attack formula
const defCmdMight = dc ? (dc.atk || 80) : 80;
const defCmdFoc   = dc ? (dc.foc || 0)  : 0;
// PvE garrisons carry a tuned `commandBudget` and Spawns use `troops`; a player commander
// defending (PvP) uses the same army-command formula as the attacker so both sides are measured alike.
const defCommand  = dc
  ? (dc.commandBudget || ((defSlotResolved.length > 0 && !isPveBattle && !isSpawnFight)
      ? defSlotResolved.reduce((sum, sl) => {
          const size = sl.branchDef?.size ?? "small";
          return sum + (sl.troops || 0) * (size === "large" ? 25 : size === "medium" ? 2 : 1);
        }, 0)
      : (dc.troops || 30)))
  : 30;
const atkCommand  = totalArmyCommand;

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

// ── Combat rounds (two-sided) ─────────────────────────────────────────────
// Both armies run through the same code: each side has its own per-round
// state (`S.rs`), its own commander skills, troop skills, heals, DoTs and
// statuses. A side's "enemy*" fields (stun, miss, DEF down, ATK down …) act
// on the OTHER side. Turn order = speed (ties: attacker first).
// Before this, only the attacker had skills/heals/statuses, and every troop
// skill (both sides) wrote into the attacker's state — so a defender's
// "bonus damage" or "DEF down" helped the attacker.
const defPassives   = dc ? getPassiveBonuses(dc) : getPassiveBonuses(null);
const defHeroSkills = dc ? getActiveSkills(dc) : [];
const defRespect    = dc ? (dc.respectLevel ?? dc.lvl ?? 1) : 1;
const defBastion    = !!dc && dc.cls === "balanced" && defRespect >= 20;
if (defBastion) {
  defSlotHp = defSlotHp.map(h => h * 2);
  defTroopHp = defSlotHp.reduce((s, h) => s + h, 0);
}
const makeSide = (o) => ({
  lostHp: 0, dmgPool: 0, dmgRound: 1, blockHealRounds: 0,
  venomNext: 0, bleedPer: 0, bleedRounds: 0, cs: newCommanderSkillState(), rs: null, ...o,
});
const A = makeSide({
  key: "atk", isPlayer: true, name: cmd.n, cmdActor: cmd.n, troopActor: null, cmdObj: cmd,
  slots: atkSlotResolved, slotHp: atkSlotHp, slotMax: atkSlotResolved.map(sl => sl.troops * sl.hpPer * bastionHpMult),
  passives, heroSkills: atkHeroSkills, durationBuffs, skillLevels: atkSkillLevels,
  atkStat: cmdAtkStat, focStat: cmdFocStat, spd: atkCmdSpd, command: atkCommand,
  classPhys: attackerBonus ? 0.10 : 0, classFoc: strategistBonus ? 0.10 : 0, scaling: cmdScalingBonus,
  bastion: bastionActive, pveMult: facPveDmgMult * facSpawnDmgMult,
  primaryBranchDef: atkBranchDef, primaryTier: atkTierData, primaryDef: atkTroopDef, hpPer: atkTroopHpPer,
  terrMult: 1,
});
const D = makeSide({
  key: "def", isPlayer: false, name: dc?.n || "Defenders", cmdActor: "Enemy Cmd", troopActor: "Defenders", cmdObj: dc,
  slots: defSlotResolved, slotHp: defSlotHp,
  slotMax: defSlotResolved.length ? defSlotHp.slice() : [defTroopHp],
  passives: defPassives, heroSkills: defHeroSkills, durationBuffs: new Map(), skillLevels: defSkillLevels,
  atkStat: defCmdMight, focStat: defCmdFoc, spd: defCmdSpd, command: defCommand,
  classPhys: (!!dc && dc.cls === "attacker" && defRespect >= 20) ? 0.10 : 0,
  classFoc:  (!!dc && dc.cls === "strategist" && defRespect >= 20) ? 0.10 : 0,
  scaling: dc ? scalingBonus(dc.rarity || "soldier", defCmdMight + defCmdFoc * 0.5, dc.id || 0) : 0,
  bastion: defBastion, pveMult: 1,
  primaryBranchDef: _defBranchDef, primaryTier: _defTierData, primaryDef: defTroopDef, hpPer: defTroopHpPer,
  terrMult: 1, // set per round (walls / fort, reduced by attacker garrisonIgnore)
});
const other  = S => (S === A ? D : A);
const hpOf   = S => Math.max(0, S.slotHp.reduce((s, h) => s + h, 0));
const bastionDefOf = (S, round) => (S.bastion && round <= 2) ? 2 : 1;
const realCommandOf = S => S.slots.length
  ? S.slots.reduce((t, sl, i) => t + Math.max(0, (S.slotHp[i] || 0) / (sl.hpPer || 1)) * (COMMAND_COST[sl.branchDef?.size || "small"] || 0.01), 0)
  : (S.cmdObj?.commandBudget || 0);
// Damage `amount` HP to side T, spread over its living slots by HP share. Returns HP actually removed.
const damageSide = (T, amount, round) => {
  const before = hpOf(T);
  if (before <= 0 || amount <= 0) return 0;
  let left = amount;
  for (let i = 0; i < T.slotHp.length && left > 0; i++) {
    if (T.slotHp[i] <= 0) continue;
    const portion = Math.min(T.slotHp[i], Math.round(amount * (T.slotHp[i] / before)));
    T.slotHp[i] -= portion; left -= portion;
  }
  for (let i = 0; i < T.slotHp.length && left > 0; i++) { const p = Math.min(T.slotHp[i], left); T.slotHp[i] -= p; left -= p; }
  const lost = before - hpOf(T);
  T.lostHp += lost; T.dmgPool += lost; if (lost > 0) T.dmgRound = round;
  return lost;
};
// Restore up to `amount` lost HP to side T (capped per slot at its max). Returns HP restored.
const healSideHp = (T, amount) => {
  let left = Math.min(amount, T.lostHp);
  for (let i = 0; i < T.slotHp.length && left > 0; i++) {
    const p = Math.min(left, Math.max(0, (T.slotMax[i] || 0) - T.slotHp[i]));
    T.slotHp[i] += p; left -= p;
  }
  const done = Math.min(amount, T.lostHp) - left;
  T.lostHp = Math.max(0, T.lostHp - done);
  return done;
};
// Kill/remaining fields the battle log expects, from the point of view of who dealt the damage
const hitFields = (S, T, lost) => S.isPlayer
  ? { defKilled: Math.max(0, Math.round(lost / T.hpPer)), defRemaining: Math.max(0, Math.round(hpOf(T) / T.hpPer)), isPlayer: true }
  : { atkKilled: Math.max(0, Math.round(lost / T.hpPer)), atkRemaining: Math.max(0, Math.round(hpOf(T) / T.hpPer)), isPlayer: false };
// Tag log lines a side pushed without an owner (skill handlers don't know which side they run for)
const tagSide = (roundLog, from, S) => { for (let i = from; i < roundLog.actions.length; i++) if (roundLog.actions[i].isPlayer === undefined) roundLog.actions[i].isPlayer = S.isPlayer; };
const makeRoundState = (P, pveMult) => ({
  cmdMult:pveMult, cmdHits:1, critChance:P.critChance,
  cmdPctDmg:0, lifesteal:0, healPct:P.healPerRound,
  skillHealCoeff:0,          // coefficient for skill heals (subject to decay cap)
  recoveryModSum:0,          // sum of recovery modifiers for skill heals
  blockHeal:0, enemyNullified:false,
  troopAtkMult:P.troopAtkMult * pveMult, troopDefMult:P.troopDefMult,
  dmgReduce:P.dmgReduce, troopDmgReduce:0,
  enemyAtkReduce:P.enemyAtkReduce, enemyDmgReduce:0, enemyMissChance:0,
  garrisonIgnore:P.garrisonIgnore,
  skillFiredNames:[],
  // Troop skill state
  troopDoubleAtk:false, troopBonusDmgMult:0, troopCounterAtk:false,
  enemyStunned:0, enemyConfused:0, enemyDefDown:0, enemyDefFlatDown:0, enemyTargetsTaunted:false,
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
  followupSources:[],        // [{ chance, eligibleRounds }] — sources of follow-up attacks
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
  // Thaelor mechanics
  weakSpotStacks:[],         // Weak Spot: [{value, roundsLeft}, ...] independent stacks
  selfDebuffNextHit:0,       // Spider's Gambit: next damage dealt -40%
  confusionImmuneChance:0,   // Eight Eyes: chance for confusion immunity first 4 rounds
  firstSkillsBonus:0,        // Many Trades: bonus on first 4 skills
  firstSkillsRemaining:4,    // Many Trades: skills remaining with bonus
  multiHitEscalating:null,   // All Out Assault: escalating hit ratios
  // Skitter mechanics
  spiderDmgStacks:0,         // Spider Queen: damage stacks on spider units
  postAtkProcHeal:null,      // Heal My Children: { chance, healPct, targets }
  aoeVenomChance:0,          // Spider Bite: venom chance on AoE focus hit
  allSpiderBonus:0,          // Power In Numbers: all-spider army stat bonus
  enemySpdDownEarly:0,       // Spider's Web: SPD reduction first 4 rounds
  allyFollowupEarly:0,       // Vexing Attack: ally follow-up chance first 3 rounds
  cotnMultiBranchBuff:null,  // Creature Power: { spider, vampire, werewolf } procs
  vulnerabilityStunChance:0, // Trapped: stun chance per round while vulnerable
  healCleanse:null,          // Skitter's Resilience: { healPct, cleanseChance, targets }
  // Mourne mechanics
  enemyDmgDownEarlyFoc:0,    // Will of an Inquisitor: FOC-modified enemy DMG down early rounds
  postAtkFocusDmgAll:0,      // Mourne's Special: AoE focus on every normal attack
  postAtkFocusDmgOne:null,   // The Wise: { chance, value } post-attack single focus
  focusStunGuaranteed:false, // Got Ya: guaranteed stun on focus hit
  factionDefBonus:0,         // Protect the Weak: flat DEF for human faction units
  dualInstanceBuff:null,     // Inquisitor's Domain: { instances, dmgReduce, dmgUp, modifiedBy }
  dualInstancesLeft:0,       // Inquisitor's Domain: remaining instances
  inquisitorRally:null,      // Rally the Inquisitors: { followupChance, stunImmuneChance, maxRound }
  branchHealThenBlock:null,  // Last Hope: { branch, healPct, permanentHealBlock }
  perRoundCleanseChance:0,   // Cleansing Faith: once per round cleanse chance
  vsAllDmgUp:0,              // Battle Tactics: all enemy damage received up
  dmgTypeResistAll:0,        // Inquisitor's Protection: focus+poison resist all allies
  // Seraph mechanics
  divinePrayerCleanse:0,     // Divine Prayer: cleanse chance when commander debuffed
  divinePrayerDefStacks:0,   // Divine Prayer: current DEF stacks on failed cleanse (max 3)
  factionHealPct:0,          // Blessed Judgement: heal for faction allies
  meleeBonusHealPct:0,       // Blessed Judgement: extra heal for melee units
  stunImmuneChanceEarly:0,   // Heaven's Protection: stun immunity chance first 4 rounds
  physDmgFactionBonus:null,  // Heaven's Hunter: { bonusDmg, bonusFaction }
  aoePhysAtkMod:0,           // Smite: AoE physical damage ATK-modified
  // Dante mechanics
  doubleEdgeDmgUp:0,         // Mad Ruler: allied DMG up + DMG received up
  doubleEdgeDmgRecUp:0,      // Mad Ruler: the penalty side
  chaosConfusionAlly:0,      // Whatever It Takes: ally confusion chance
  chaosConfusionEnemy:0,     // Whatever It Takes: enemy confusion chance
  enemyCmdAtkDrain:0,        // Power Drain: current ATK drain on enemy commander
  unitEvasionFirstHits:null, // Commander In Arms: { chance, maxHits } per-unit evasion
  poisonDmgHealBlock:null,   // Maniac's Poison: { targets, poisonDmg, healBlockDuration }
  // Brennan mechanics
  decayingDmgReduce:0,       // The People's Hero: current remaining damage reduction
  decayFraction:0.25,        // The People's Hero: decay rate per hit (0.25 or 0.20 at max)
  hitsUntilDecayGone:4,      // The People's Hero: hits remaining before protection gone
  onHitHealChance:null,      // Patch You Up: { targets, chance, healPct, guaranteed }
  healDefBuff:null,          // Friar's Blessing: { targets, healPct, defBonus, defDuration }
  healDoubleChance:null,     // HK Protector: { branch, healPct, doubleChance }
  healCleansAll:null,        // Cleanse: { healPct, cleanseChance } army-wide
  roleDmgBonus:0,            // Ranged Combat: ranged unit DMG bonus
  roleDmgBonusVsFaction:null,// Target Practice: { role, bonusFaction, value }
  // Vayne mechanics
  earlyRoundDmgUp:0,         // Commander Guidance / Horn: DMG up first N rounds
  earlyRoundStunImmune:false,// Commander Guidance max: stun immune while buff active
  onHitBonusDmg:null,        // Find the Opening: { chance, bonusDmg }
  perRoundDefStack:null,     // Defense in Numbers: { faction, chance, defPerStack, maxStacks, current }
  physDmgAndHeal:null,       // Protected by Faith: { enemyDmg, allyHeal }
  dmgResistVsFaction:0,      // Experienced Army: DMG resist vs specific faction
  enemyDmgDownEarlyAtk:0,   // Will of the Templar: ATK-modified enemy DMG down
  branchDmgBonus:0,          // Silent Authority: branch-specific DMG bonus
  // Aldric mechanics
  hkTripleStatBonus:null,    // Veteran's Presence: { dmgUp, defBonus, spdBonus }
  perRoundStunImmuneChance:0,// Stoic Hero: per-round stun immunity chance
  branchHealPerRound:0,      // Strong in My Faith: HK units heal per round
  dayMaxDmgChance:0,         // Power of Sun: day-only max damage chance
  selfSacrificeActive:false, // Warrior's Burden: flag when triggered
  dayNightFactionSplit:null, // Here We Go Again: { nightResist, dayBonus, faction }
  reactCmdAtkStack:null,     // Promise Land: { atkPerStack, maxStacks, current }
  // Korgath mechanics
  multiHitRandomDefDown:null,// Korgath's Brutality: { hits, dmgPct, defDown, maxStacks }
  onSkillStunChance:0,       // Killer's Aura: chance to stun on skill activation
  cmdDmgBonusVsStunned:0,    // Killer's Eye: bonus DMG vs stunned targets
  attackingStanceDmg:0,      // Lead the Charge: CMD DMG up while attacking
  attackingStanceDef:0,      // Lead the Charge: army DEF up while attacking
  skillDmgVsFaction:null,    // Human Scum: { faction, value }
  cmdAoePhysical:0,          // Korgath's Surprise: AoE physical on normal attacks
  // Bruk mechanics
  multiBranchDefBonus:null,  // Leader of the Tribe: { branches, defBonus, defendingBonus }
  dmgBonusVsBleed:0,         // Capitalize!: bonus DMG vs bleeding targets
  branchFollowupChance:null, // Try Again Boys: { branch, chance, followupDmg }
  focusFire:null,            // Coordinated Assault: { target, duration }
  onHitBleedHeal:0,          // Blood Magic: heal on hit vs bleeding target
  factionDualStatBonus:null, // Mastermind: { dmgUp, dmgReceivedDown }
  flatTroopDefBonus:0,       // Iron Dense: flat DEF on all troops
  cmdStunChance:0,           // Ground Shake: stun enemy commander chance
  trollDefSpdTradeoff:null,  // Troll Master: { defBonus, spdPenalty }
  // Grix mechanics
  burnApplied:false,         // Burn status: DMG dealt -20% for 1 round
  burnDmgPenalty:0,          // Burn penalty on enemy
  dualPoisonDotStacks:0,     // Voodoo: stacking poison DoTs
  focusDmgVsPoisoned:0,      // Poison Specialist: focus DMG vs poisoned targets
  poisonTickAllyHeal:null,   // You Hurt We Win: { triggerRound, healPct }
  randomArmyEffect:null,     // Shaman Shenanigans: { chance, effects }
  dualTypeDmgApply:null,     // Shaman's Final Surprise: { poisonDmg, burnDmg, etc }
  armySiegeBonus:0,          // Orc Explosives: siege stat bonus
  healHighestDefDebuff:null, // Sacrificial Healing: { healPct, dmgPenalty }
  // Grimtusk mechanics
  selfDmgUpOnSkill:0,        // Grim's Assault: commander DMG up on proc
  selfDmgUpRoundsLeft:0,     // Grim's Assault: rounds remaining on self buff
  reactiveSkillDmgOnDebuff:0,// Grim's Retaliation: next skill DMG bonus when debuffed
  reactiveSkillDmgPending:false, // Grim's Retaliation: buff is active
  attackingDefendingSplit:null,  // I Charge: { attackDmgUp, defendDmgDown }
  reactiveCleanseChance:0,   // Can't Stop Me: cleanse chance on debuff
  cmdDmgVsFaction:null,      // Pirate Filth: { faction, value }
  perSkillArmyDefStack:null, // Hold the Line: { branch, defPerStack, maxStacks, current }
  aoeMultiStatus:null,       // Master of None: { burnChance, poisonChance, bleedChance }
  // Ashgrip mechanics
  reactiveBranchDmgStack:null, // Warg Rider: { branch, dmgMin, dmgMax, maxStacks, current }
  allBranchArmyBonus:null,   // Me and My Dogs: all-branch army stat bonus
  allBranchCmdStats:null,    // Power from Friends: all-branch CMD stat bonus
  mountedOnHitFollowup:null, // Mounted Fury: { chance, followupDmg, defDownChance }
  mountedComposition:null,   // Mounted Strike: { allMountedBonus, allWargBonus }
  dmgBonusVsSize:0,          // Giant Slayer: bonus DMG vs large units
  physDmgMultiPrioritise:null,// Ash's Planned Assault: { targets, prioritise }
  // Warcroak mechanics
  commandDifferentialBonus:null, // Leader's Plans: { defPerCommand, hpPerCommand }
  factionDmgBonusConditional:null, // Orcs Rise: { value, conditionalFaction, conditionalBonus }
  // Reck mechanics
  drunkApplied:false,        // Drunk: 30% miss, cannot evade
  drunkDmgBonus:0,           // King of the Sea max: bonus vs drunk
  cmdAtkPerFactionSlot:null, // Pirate Captain: { faction, atkPerSlot, maxSlots }
  allFactionSkillDmg:null,   // King of the Sea: { faction, value }
  confusionVsAlignment:null, // Smokescreen: { alignment[], chance }
  perRoundConfusionImmune:0, // Sea Earned Resilience
  dmgBonusVsFactionAll:0,    // Enemy of the Orcs
  // Seyne mechanics
  aoeDefDown:0,              // Chart the Course: flat DEF down all enemies
  dmgBonusVsDebuffed:0,      // Exploiting Weakness
  factionFollowupPerRound:0, // Sea Shanty
  drunkChanceMulti:0,        // Beers On Me
  onDrunkApplyVenom:0,       // Poison the Drink
  cmdStunOrConfuse:null,     // Know Your Enemy
  dmgBonusVsRole:0,          // Mounted Slayer
  sizeTypeDebuff:null,       // Right Tool
  cmdFollowupVsAlignment:0,  // Creature Hunter
  factionDmgBonus:0,         // Gather My Crew
  // Samuel mechanics
  blindApplied:false,        // Blind: guaranteed miss next attack
  perRoundBlindChance:0,     // Spice Attack
  onEnemyAttackBurnChance:0, // Soup's Hot
  cmdBurnDmgBonus:0,         // Used to the Heat
  dmgBonusVsBurn:0,          // Cook's Barrage
  followupVsBurn:0,          // Keeping the Heat Up
  onBurnDmgAllyDefStack:null,// Pirate Cook: { branch, defPerStack, maxStacks, current }
  conditionalRoundHeal:null, // Chef's Kiss: { condition, healPct }
  dmgBonusVsAlignment:0,     // Creature Sorbet
  // Fynn mechanics
  burstThenPenalty:null,     // Pirate's Roar: { earlyBonus, earlyRounds, penaltyValue, penaltyRounds }
  debuffChanceReduction:0,   // Around the Block
  cmdBonusAttackChance:0,    // Pirate Vet
  // Brine mechanics
  pursuitActive:false,       // Pursuit status: attacks cannot be avoided
  selfConfuseArmyDmg:null,   // Captain's Honor: { selfConfusion, armyDmgUp }
  earlyRoundPursuitChance:0, // Seeing Through the Fog: pursuit chance first N rounds
  enemyFactionVuln:null,     // Orc Rivalry: { faction, value }
  multiHitRandomFactionBuff:null, // Cannon Volley: { hits, dmgPct, allyFaction, allyDmgUp }
  // Saltwhisper mechanics
  healReceivedBonus:0,       // Steady Hands: incoming heal amplifier
  sequentialImmunityAoe:null,// Shadow's Drunken Warrior: { immunityRound, attackRound }
  armyEvasionTwoHits:0,      // Fog of War: evasion chance for next 2 hits
  // Skar mechanics
  slowApplied:false,         // Slow status: -20 SPD for 1 round
  slowValue:0,               // Slow: flat SPD reduction amount
  burnApplyOnly:null,        // Dragon Fire: pure burn application, no damage
  cmdDmgVsBurn:0,            // Charred: CMD bonus vs burning targets
  armyDmgVsBleedOrBurn:0,   // Dragon Claw max: army bonus vs bleed/burn targets
  branchFirstHitsDmgReduce:null, // Elder Dragon: { branch, reduction, instances }
  branchBattleStartImmune:null,  // Dragon Scales: { branch, immunity[], chance }
  dragonSupremacyBonus:null, // Dragon Supremacy: split cmd/dragon stats
  thornsPhysical:0,          // Tough Skin: reflect damage on physical hits vs dragons
  // Nyxara mechanics
  dualCmdFocShift:null,      // My Will vs Yours: { selfFocUp, enemyFocDown }
  healAlignmentDragonBonus:null, // Dragon's Song: { healPct, dragonBonus, targets }
  branchOnHitFollowup:null,  // Dragon Dance: { branch, chance, bonusDmg }
  focusDmgStunChance:0,      // Lightning Storm: focus + stun chance
  cmdStunAtkDrain:null,      // Mind over Matter: { stunDuration, atkDrain, drainDuration }
  // Emberclaw mechanics
  conditionalCmdAtkWhileBurn:0, // Flame Dancer: CMD ATK bonus while any enemy burns
  multiHitRandomBurnChance:null, // Fire Volley: { hits, dmgPct, burnChance }
  cmdNormalAtkAoeBurn:0,     // Ember's Entertainment: AoE burn on normal attacks
  // Scaleveil mechanics
  healTwoUnitsDragonBonus:null,  // Back Line Healer: { dragonBonusPct }  gatheringBonus:0,              // Gatherer: non-combat gathering yield bonus
  aoeBlindOrBurnChance:null,     // Smoke and Fire: { chance, duration }
  branchFlatDefBonus:null,       // Dragon Garrison: { branch, value }
  branchDmgBonusVsAlignment:null,// The Superior Race: { branch, alignment, value }
  cmdFocUpAtkDown:null,          // To Become an Elder: pre-battle FOC/ATK shift
  dragonConfusionImmune:false,   // To Become an Elder max: Dragon Units confusion immune
  branchDmgUpDuration:null,      // Locked In: { branch, value }
  // Kraul mechanics
  dualBranchStatBonus:null,      // I'll Work With It: { branch1, branch1Stat, branch1Value, branch2... }
  onAttackBonusDmgChance:null,   // Fire Fight: { chance, bonusDmg }
  branchPhysDmgReduce:null,      // Tough Scales: { branch, value }
  allDragonArmyCmdAtk:null,      // Future King: { value }
  // Cinderfang mechanics
  branchFlatHpDefBonus:null,     // Me Little, Army Big: { branch, hpValue, defValue }
  enemyBuffStripped:false,       // Clear the Air: all enemy positive buffs stripped
  branchHealOnDebuff:null,       // You Get a Heal!: { branch, healPct, maxPerRound, usedThisRound }
  // Ashen Dead / Life Drain / Mummify mechanics
  lifeDrainApplied:false,        // Life Drain: healing received → 50% of that as damage (2 rnd)
  lifeDrainRoundsLeft:0,         // Rounds remaining on Life Drain
  mummifyApplied:false,          // Mummify active on enemy
  mummifyRound:0,                // Current Mummify escalation round (1=SPD-25%, 2=SPD-50%, 3=skip)
  lifeDrainNextSkillBonus:false, // The Eternal Knight: next skill +30% if Life Drain proc'd
  lifeDrainNextSkillBonusPct:0,  // The Eternal Knight: bonus %
  enemyFocDmgTakenUp:0,         // Dread Surge max: enemy FOC DMG taken up
  cmdNormalAtkFocBonus:0,        // Death Knell max: CMD normal attacks deal FOC DMG
  undead_army_buff_applied:false,// Iron Dominion: Skeleton/Death Cavalry buff tracking
  frostbiteApplied:false,        // Frostbite active on enemy — DMG dealt -40% for 2 rounds
  frostbiteRoundsLeft:0,         // Rounds remaining on Frostbite
  coldFuryAtkBonus:0,            // Cold Fury: CMD ATK per-round Frostbite bonus
  berserkerRushAtkGain:0,        // Berserker's Rush: cumulative ATK gained
  berserkerRushSpdLoss:0,        // Berserker's Rush: cumulative SPD lost
  warScarsStacksThisRound:0,     // War Scars: stacks this round
  frostFuryStacks:0,             // Frost Fury: army DMG stacks while Frostbite active
  frostbitenSpdDown:0,           // Permafrost / The Long Winter: extra SPD penalty
  unitLostThisBattle:false,      // Frozen Throne: tracks if any unit has been lost
  allyHealingReceivedUp:0,       // Völva's Blessing max: allied healing received bonus
  marchSpeedBonus:0,             // Ironmarch's Roar max / Pather: march speed bonus
  earlyRoundBurnImmune:false,    // Seer's Vision max: burn immune rounds 1-3
  dmgVsSlowed:0,                 // Mind Games: allied DMG bonus vs slowed targets
  burnDmgReceiveReduce:0,        // Tidal Wave: reduce burn DMG received
  escalatingEnemyDmgTaken:null, // Wise Wizard: { instances, valuePerInstance, applied }
  armyEvasionPerRoundChance:0,   // Teleport: per-round ally evasion chance
  focVulnOnTarget:0,             // A Wizard's Power: next FOC hit on target +X%
  enemyForcedMinDmg:false,       // Powerful Suppression: enemy deals min damage next round
  gameOverActive:false,          // Game Over: flag for post-kill bonus
  // Ryn mechanics
  branchDmgBonusVsStatus:null,   // Feel the Burn: { branch, status, value }
  enemyStatusDefDown:null,       // A Bad Time: { status, defDown }
  // Vex mechanics
  branchFollowupEarlyRounds:null,// Wizard Onslaught: { branch, chance, maxRound }
  enemyAlignmentVuln:null,       // Destroy All Creatures: { alignment, value }
  branchDualStatPassive:null,    // Bound to Me: { branch, dmgUp, dmgReceiveDown }
  golemBurnPoisonImmune:false,   // Bound to Me max: Golems immune to burn/poison
  focusVulnOnTarget:0,           // A Wizard's Power: next focus hit bonus
  // Mira mechanics
  enemyRoleVuln:null,            // Front Line Combat: { role, value }
  physDmgMultiFactionBonus:null, // Many Trophies: { prioritise, bonusFaction, bonusDmg }
  ignoreDefPct:0,                // Hit the Gym tier1: ignore % of enemy DEF
  lateRoundSkillBonus:0,         // Plenty of Stamina: bonus skill DMG rounds 5-10
  // Dov mechanics
  troopLossReduce:0,             // Tiler: troop loss reduction on unowned tiles
  reinforcementTimeReduce:0,     // Reinforcer: non-combat reinforcement time
  keepBattleDmgBonus:0,          // Keep Taker: DMG bonus vs Keep armies
  combatXpBonus:0,               // Fighter: non-combat XP from combat
  mockBattleXpBonus:0,           // Trainer: non-combat XP from mock battles
  repositionSpeedBonus:0,        // Mover: non-combat reposition speed
  // Oren mechanics
  multiHitRandomAtkStack:null,   // Hexblade: { hits, dmgPct, atkPerUniqueHit }
  physDmgSpdMod:0,               // Blinding Speed: SPD-modified physical DMG
  physDmgCmdSpdBoost:null,       // Lieutenant of Spellblades: { targets, spdBoostPct, spdDuration }
  // ── Frostbite status ──────────────────────────────────────────────────────
  frostbiteApplied:false,        // Frostbite active on enemy this round
  frostbiteRoundsLeft:0,         // Rounds of Frostbite remaining
  frostbiteDmgPenalty:0.40,      // Frostbite: enemy DMG dealt -40%
  frostbiteDuration:2,           // Default Frostbite duration in rounds
  // ── Coldborns mechanics ───────────────────────────────────────────────────
  cmdAtkPerFrostbiteRound:0,     // Cold Fury: CMD ATK bonus each Frostbite round
  frostbittenSkillDmgUp:0,       // Howling Blizzard max: Frostbitten +10% skill DMG
  perRoundAtkUpSpdDownStack:null,// Berserker's Rush: { atkUp, spdDown, rounds }
  warScarsCmdAtkStacks:0,        // War Scars: current CMD ATK stacks this round
  warScarsMaxStacks:5,           // War Scars: max stacks per round
  cmdDmgVsFrostbitten:0,         // Frozen Prey / Calculated Cruelty: CMD DMG vs Frostbitten
  physShatterFrostbite:null,     // Shatter: { defDown, defDuration } — strip Frostbite + DEF down
  physPermDefDown:0,             // Shield Splitter: permanent DEF reduction on target
  noUnitLostBonus:null,          // Frozen Throne: { dmgUp, stunImmune } — lost if any unit dies
  noUnitLostActive:true,         // Frozen Throne: flag, set false once a unit dies
  frostbittenEnemyDefDown:0,     // Dead Weight / Shattered Defenses: DEF down on Frostbitten
  frostbittenEnemySpdDown:0,     // Permafrost / The Long Winter: SPD down on Frostbitten
  frostbittenEnemyFocVuln:0,     // Cold Logic: FOC DMG vuln on Frostbitten
  frostbiteApplyDefDown:null,    // Shattered Defenses: { defDown, duration } on each Frostbite apply
  aoeEnemyVulnFrostbite:null,    // Skald's Curse: { vulnValue, frostbiteChance }
  earlyRoundDmgStunImmune:null,  // Seer's Vision: { dmgUp, maxRound }
  earlyRoundBurnImmune:false,    // Seer's Vision max: burn immune early rounds
  healAllCleanse:null,           // Winter's Warmth: { healPct, cleanseCount }
  healAllCleanseChance:null,     // Völva's Blessing: { healPct, cleanseChance }
  healingReceivedUp:0,           // Völva's Blessing max: healing received bonus
  aoeEnemyBuffStripFrostbite:null,// Blizzard Command: { frostbiteChance }
  strippedEnemyDefDown:0,        // Blizzard Command max: stripped enemies DEF -10
  focusBurnDualStatus:null,      // Frost and Fire: { burnDmg, statusChance }
  cmdConfusionImmuneEarlyRounds:0,// Frost and Fire max: CMD confusion immune rounds 1-N
  cmdFocSpdPassive:null,         // Cold Calculation: { focValue, spdValue }
  coldbornHpBonus:0,             // Northern Conquest max: Coldborn HP +10
  earlyRoundDmgDefUp:null,       // Rally the Clan: { dmgUp, defUp, maxRound }
  earlyRoundConfusionImmune:false,// Rally the Clan max: confusion immune early rounds
  earlyRoundDmgUpEnemyDefDown:null,// Ironmarch's Roar: { dmgUp, enemyDefDown, maxRound }
  dmgResistVsAlignmentBranch:null,// Coldborn Brotherhood: { branch, alignment, value }
  branchFlatHpBonus:null,        // Bear's Endurance: { branch, value }
  frostbiteActiveArmyDmgStack:null,// Frost Fury: { valuePerStack, maxStacks, current }
  earlyRoundDmgFollowup:null,    // Frost Chant: { dmgUp, followupChance, maxRound }
  earlyRoundFollowupChance:null, // Song of Courage / Thane's Charge: { chance, maxRound }
  armyFollowupPerRound:0,        // War Drums / Völva's Sight: per-round follow-up chance
  cmdNormalAtkFocDmg:0,          // War Drums max: CMD normal atk adds FOC DMG
  focusDamageFrostbiteChance:null,// Frozen Verse / Cold Snap Strike: { frostbiteChance }
  focusDamageFrostbiteGuaranteed:false,// Bitter Cold: guaranteed Frostbite on FOC hit
  aoeFocusFrostbiteChance:null,  // Völva's Wrath: { frostbiteChance }
  aoeFocusMultiHitFrostbite:null,// Winter Storm: { hits, dmgPct, frostbiteChance }
  aoePhysFrostbiteChance:null,   // Blood on Ice / Frost Cleave: { frostbiteChance }
  physFrostbiteGuaranteed:false, // Glacial Strike: guaranteed Frostbite on physical hit
  onHitFrostbiteChance:0,        // Icevein's Strike: per-hit Frostbite chance
  perRoundFrostbiteAoeChance:0,  // Frostbite Carol / Frost Destruction: AoE Frostbite per round
  // New troop skill state
  rangedDmgReduce:0,             // Are Those Toothpicks: damage reduce vs ranged units
  hpStackStacks:0,               // Tank: current HP stack count
  troopHpStackBonus:0,           // Tank: cumulative HP bonus (applied to troopDefMult as proxy)
});
const skillCtx = (S, T, round) => ({
  atkSlots: S.slots, defSlots: T.slots, primaryDefSlot: T.slots[0] ?? null,
  defTroopBranch: T.slots[0]?.branch ?? T.cmdObj?.troopBranch ?? null,
  defFaction: T.slots[0]?.branch?.faction ?? T.cmdObj?.faction,
  defAlignment: getFactionAlignment(T.slots[0]?.branch?.faction ?? T.cmdObj?.faction), ownFaction: S.cmdObj?.faction,
  defHpPer: T.hpPer, defTile, atkCmdSpd: S.spd, cmdAtkStat: S.atkStat, cmdFocStat: S.focStat, bleedRoundsActive: S.bleedRounds,
  cs: S.cs, venomTicking: S.venomNext > 0, atkCommand: S.command, defCommand: T.command,
  atkCmdReal: realCommandOf(S), defCmdReal: realCommandOf(T),
  defFactions: new Set([...T.slots.map(d => d.branch?.faction), T.cmdObj?.faction].filter(Boolean)),
  defRoles: new Set(T.slots.map(d => d.branchDef?.role).filter(Boolean)),
  defSizes: new Set(T.slots.map(d => d.branchDef?.size).filter(Boolean)),
  defSlotCount: T.slots.filter((d, i) => (T.slotHp[i] || 0) > 0).length || 1,
});

// Hero-skill log lines (flat-format skills carry their numbers)
const logHeroSkills = (S, roundLog) => {
  const uniqNames = [...new Set(S.rs.skillFiredNames)];
  uniqNames.forEach(name => {
    const fs  = S.heroSkills.find(s => s.def?.name === name);
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
    roundLog.actions.push({ actor:S.name, action:name, skillIcon:def?.icon??"✨", dmg:0, isSkill:true, skillEffect:se, ...(S.isPlayer ? {} : { isPlayer:false }) });
  });
};

// Commander action (normal attack + this round's skill multipliers)
const commanderAct = (S, T, round, roundLog) => {
  const r = S.rs, er = T.rs;
  if (hpOf(S) <= 0 || hpOf(T) <= 0) return;
  const who = S.isPlayer ? S.cmdActor : "Enemy Cmd";
  if (er.enemyNullified) return;
  if (er.enemyStunned > 0) { er.enemyStunned--; roundLog.actions.push({ actor:who, action: S.isPlayer ? `⚡ ${S.name} is stunned!` : "⚡ Enemy commander is stunned!", dmg:0, isPlayer:S.isPlayer }); return; }
  if (er.enemySilenced) { er.enemySilenced = false; roundLog.actions.push({ actor:who, action: S.isPlayer ? `🎵 ${S.name} silenced — skill delayed!` : "🎵 Enemy commander silenced — skill delayed!", dmg:0, isPlayer:S.isPlayer }); return; }
  if (er.enemyConfused > 0) {
    er.enemyConfused--;
    if (!r.atkConfusionImmune && Math.random() < 0.5) {
      const selfDmg = Math.max(1, Math.round(calcCmdNormalDmg(S.atkStat, S.command, 0) * 0.8
        * Math.max(0, 1 + defReduction(S.primaryDef * (r.troopDefMult || 1) * bastionDefOf(S, round)))));
      const lost = damageSide(S, selfDmg, round);
      roundLog.actions.push({ actor:who, action:`😵 Confused! Attacks own troops — ${Math.max(0, Math.round(lost / S.hpPer))} friendly casualties`, dmg:selfDmg, isPlayer:!S.isPlayer, isConfused:true });
      return;
    }
  }
  if (er.enemyTargetsTaunted) roundLog.actions.push({ actor:who, action: S.isPlayer ? "🎯 Taunted — forced to attack!" : "🎯 Taunted — forced to attack!", dmg:0, isPlayer:S.isPlayer });
  if (Math.random() < (er.enemyMissChance || 0)) { roundLog.actions.push({ actor:who, action: S.isPlayer ? `${S.name} missed!` : "Enemy commander missed!", dmg:0, isPlayer:S.isPlayer }); return; }
  if (er.atkEvadeNextHit > 0) { const ev = Math.random() < er.atkEvadeNextHit; er.atkEvadeNextHit = 0; if (ev) { roundLog.actions.push({ actor:who, action:"💨 Attack evaded!", dmg:0, isPlayer:S.isPlayer }); return; } }
  if (er.invisibleUnits > 0 && Math.random() < 0.30) { roundLog.actions.push({ actor:who, action:"🌑 Attack evaded — target invisible!", dmg:0, isPlayer:S.isPlayer }); return; }

  // Own damage mods up; target's damage-received / our-ATK-down mods down
  const common = (r.enemyDmgTakenUp || 0) - (er.enemyAtkReduce || 0) - (er.enemyDmgReduce || 0) - (er.dmgReduce || 0) - (er.enemyBurnPenalty || 0);
  const physModSum = (r.cmdMult - 1) + S.classPhys + S.scaling + common;
  const focModSum  = (r.cmdMult - 1) + S.classFoc  + S.scaling + common;
  const atkR = S.atkStat + (r.cmdAtkFlat || 0) - (er.enemyCmdAtkFlatDown || 0);
  const focR = S.focStat + (r.cmdFocFlat || 0);
  const usesFoc = (S.primaryBranchDef?.dmgType === "magical") || (focR > atkR);
  const hit = () => usesFoc
    ? calcCmdFocusSkillDmg(focR, S.command, 1.0 + (r.focusDmgBonus || 0), focModSum)
    : calcCmdNormalDmg(Math.max(1, atkR), S.command, physModSum);
  const hit1 = hit();
  const { eligibleRounds: fuRounds, chance: fuChance } = followupStats(r.followupSources || []);
  const followupExpected = round * fuRounds * fuChance;
  const hit2 = followupExpected > 0 ? hit() : 0;
  const tDef   = T.primaryDef * (er.troopDefMult || 1) * bastionDefOf(T, round);
  const effDef = Math.max(0, tDef * (1 - Math.min(0.9, r.enemyDefDown || 0)) - (r.enemyDefFlatDown || 0));
  const defMult  = usesFoc ? 1.0 : Math.max(0, 1 + defReduction(effDef));
  const isCrit   = Math.random() < (r.critChance || 0);
  const totalDmg = Math.max(1, Math.round((hit1 + hit2 * followupExpected) * defMult * (isCrit ? 1.5 : 1.0) * S.terrMult));
  if (r.lifesteal > 0 && S.blockHealRounds <= 0) {
    const gain = healSideHp(S, Math.round(totalDmg * r.lifesteal));
    S.dmgPool = Math.max(0, S.dmgPool - gain);
    const t = Math.round(gain / S.hpPer);
    if (t > 0) roundLog.actions.push({ actor:who, action:`🧛 Lifesteal +${t} troops`, dmg:-t, isSkill:true, isHeal:true, isPlayer:S.isPlayer });
  }
  const lost = damageSide(T, totalDmg, round);
  roundLog.actions.push({ actor:who,
    action: S.isPlayer ? `${S.name} strikes${isCrit?" (CRIT!)":""}${hit2>0?" + follow-up":""}` : `${report.defCmdIcon} Enemy commander strikes${isCrit?" (CRIT!)":""}`,
    dmg:totalDmg, ...hitFields(S, T, lost) });
};

// Troop slot action
const slotAct = (S, idx, T, round, roundLog) => {
  const r = S.rs, er = T.rs, sl = S.slots[idx];
  if (!sl || !sl.tierData || S.slotHp[idx] <= 0 || hpOf(T) <= 0) return;
  const label = S.isPlayer ? (sl.branchDef?.label || `Slot ${idx+1}`) : "Defenders";
  const unitName = sl.branchDef?.label || (S.isPlayer ? `Slot ${idx+1}` : `Defenders ${idx+1}`);
  if (er.enemyNullified) return;
  if (er.enemyStunned > 0) return;
  if (er.enemyConfused > 0) {
    er.enemyConfused--;
    if (!r.atkConfusionImmune && Math.random() < 0.5) {
      const selfDmg = calcTroopDmg(sl.branchDef, sl.tierData, sl.def, 0, S.command, 1, 0, false, 1, [], round);
      const prev = S.slotHp[idx];
      S.slotHp[idx] = Math.max(0, S.slotHp[idx] - selfDmg);
      S.lostHp += prev - S.slotHp[idx]; S.dmgPool += prev - S.slotHp[idx];
      roundLog.actions.push({ actor:label, action:`😵 Confused! ${unitName} attack own ranks — ${Math.max(0, Math.round((prev - S.slotHp[idx]) / sl.hpPer))} casualties`, dmg:selfDmg, isPlayer:!S.isPlayer, isConfused:true });
      return;
    }
  }
  if (Math.random() < (er.enemyMissChance || 0)) { roundLog.actions.push({ actor:label, action: S.isPlayer ? `${unitName} missed!` : "Enemy troops missed!", dmg:0, isPlayer:S.isPlayer }); return; }
  if (er.atkEvadeNextHit > 0) { const ev = Math.random() < er.atkEvadeNextHit; er.atkEvadeNextHit = 0; if (ev) { roundLog.actions.push({ actor:label, action:"💨 Attack evaded!", dmg:0, isPlayer:S.isPlayer }); return; } }

  // on_hit troop skills of the acting slot → its own side's state
  const logFrom = roundLog.actions.length;
  procTroopSkills(sl.skills, "on_hit", S.skillLevels, r, roundLog, sl.branchDef?.label || label, T.slots[0]?.branch ?? T.cmdObj?.troopBranch ?? null, round, S.slots, sl);
  tagSide(roundLog, logFrom, S);

  const hits = r.troopDoubleAtk ? 2 : 1;
  const rangedReduce = (sl.branchDef?.role === "ranged" && er.rangedDmgReduce > 0) ? er.rangedDmgReduce : 0;
  const sizeMod = troopSizeModifier(sl.branchDef?.size ?? null, T.primaryBranchDef?.size ?? null);
  for (let hi = 0; hi < hits; hi++) {
    if (hpOf(T) <= 0) break;
    const modSum = (r.troopAtkMult - 1) + (r.enemyDmgTakenUp || 0)
      - (er.enemyAtkReduce || 0) - (er.enemyDmgReduce || 0) - (er.troopDmgReduce || 0) - (er.dmgReduce || 0) - rangedReduce - (er.enemyBurnPenalty || 0);
    const tDef = Math.max(0, T.primaryDef * (er.troopDefMult || 1) * bastionDefOf(T, round) - (r.enemyDefFlatDown || 0));
    let dmg = calcTroopDmg(sl.branchDef, sl.tierData, tDef, Math.min(0.9, r.enemyDefDown || 0), S.command, S.terrMult,
      modSum, false, sizeMod, r.followupSources || [], round);
    if (r.troopBonusDmgMult > 0) {
      const bonus = Math.round(dmg * r.troopBonusDmgMult);
      dmg += bonus;
      roundLog.actions.push({ actor:label, action:`💥 Bonus strike +${bonus} dmg`, dmg:bonus, isPlayer:S.isPlayer, isTroopSkill:true });
      // One on_hit proc buffs exactly one hit (procs roll once per round, not per hit)
      r.troopBonusDmgMult = 0;
    }
    dmg = Math.max(1, Math.round(dmg));
    const lost = damageSide(T, dmg, round);
    roundLog.actions.push({ actor:label, action:`${unitName} attack${hits>1?` (hit ${hi+1}/2)`:""}`, dmg, ...hitFields(S, T, lost) });
  }

  // on_hit_received — the target's primary slot reacts (into the target's own state)
  if (T.slots[0]) {
    const from2 = roundLog.actions.length;
    procTroopSkills(T.slots[0].skills, "on_hit_received", T.skillLevels, er, roundLog, T.isPlayer ? (T.slots[0].branchDef?.label || "Troops") : "Defenders", sl.branch ?? null, round, T.slots, T.slots[0]);
    tagSide(roundLog, from2, T);
  }

  // Counter attack — the TARGET's counter skill hits back at 50% (was triggered by the attacker's own skill)
  if (er.troopCounterAtk && hpOf(T) > 0 && S.slotHp[idx] > 0 && T.slots[0]?.tierData) {
    const ts = T.slots[0];
    const cDmg = calcTroopDmg(ts.branchDef, ts.tierData, sl.def * (r.troopDefMult || 1) * bastionDefOf(S, round), 0, T.command, T.terrMult,
      -(r.enemyAtkReduce || 0) - (r.enemyDmgReduce || 0) - (r.dmgReduce || 0) - (r.troopDmgReduce || 0), false,
      troopSizeModifier(ts.branchDef?.size ?? null, sl.branchDef?.size ?? null), [], round);
    const cFinal = Math.max(1, Math.round(cDmg * 0.50));
    const prev = S.slotHp[idx];
    S.slotHp[idx] = Math.max(0, S.slotHp[idx] - cFinal);
    S.lostHp += prev - S.slotHp[idx]; S.dmgPool += prev - S.slotHp[idx]; S.dmgRound = round;
    roundLog.actions.push({ actor: T.isPlayer ? (ts.branchDef?.label || "Troops") : "Defenders", action:`⚡ Counter attack!`, dmg:cFinal, isPlayer:T.isPlayer, isTroopSkill:true });
  }
};

for (let round = 1; round <= 10; round++) {
const roundLog = { round, actions:[] };
atkTroopHp = hpOf(A); defTroopHp = hpOf(D);
if (atkTroopHp <= 0 && defTroopHp <= 0) break;
if (atkTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Attackers routed!", dmg:0 }); report.rounds.push(roundLog); break; }
if (defTroopHp <= 0) { roundLog.actions.push({ actor:"SYSTEM", action:"Defenders defeated!", dmg:0 }); report.rounds.push(roundLog); break; }

if (A.bastion && round === 1) roundLog.actions.push({ actor:cmd.n, action:"⚖ BALANCED — double HP & DEF (rounds 1-2)", dmg:0, isSkill:true });
if (D.bastion && round === 1) roundLog.actions.push({ actor:D.name, action:"⚖ BALANCED — double HP & DEF (rounds 1-2)", dmg:0, isSkill:true, isPlayer:false });

// 1) Per-side round state + commander skills
A.rs = makeRoundState(A.passives, A.pveMult);
D.rs = makeRoundState(D.passives, D.pveMult);
const rs = A.rs; // legacy name for the round-end ticks below
for (const S of [A, D]) {
  const T = other(S), from = roundLog.actions.length;
  applyDurationEffects(S.heroSkills, round, S.durationBuffs, S.rs);
  applyInstantEffects(S.heroSkills, round, S.rs);
  applyCommanderSkillEffects(S.heroSkills, round, S.rs, roundLog, S.name, skillCtx(S, T, round));
  tagSide(roundLog, from, S);
}

// 2) DoT ticks (venom = FOC, bleed = ATK of the side that applied it)
for (const S of [A, D]) {
  const T = other(S);
  if (S.venomNext > 0 && hpOf(T) > 0) {
    const venomHit = Math.max(1, Math.round(S.focStat * S.venomNext));
    const lost = damageSide(T, venomHit, round);
    roundLog.actions.push({ actor:S.name, action:`🐍 Venom — ${Math.round(S.venomNext*100)}% focus damage`, dmg:venomHit, ...hitFields(S, T, lost), isSkill:true });
  }
  S.venomNext = S.rs.pendingVenomDmg || 0;
  if (S.bleedRounds > 0 && S.bleedPer > 0 && hpOf(T) > 0) {
    const bleedHit = Math.max(1, Math.round(S.atkStat * S.bleedPer));
    const lost = damageSide(T, bleedHit, round);
    roundLog.actions.push({ actor:S.name, action:`🩸 Bleed — ${Math.round(S.bleedPer*100)}% physical damage`, dmg:bleedHit, ...hitFields(S, T, lost), isSkill:true });
    S.bleedRounds--;
  }
  if (S.rs.bleedApplied) { S.bleedPer = S.rs.pendingBleedDmg; S.bleedRounds = S.rs.bleedRoundsLeft; }
}

// 3) round_start troop skills (each side into its own state)
for (const S of [A, D]) {
  const T = other(S);
  for (const sl of S.slots) {
    const from = roundLog.actions.length;
    procTroopSkills(sl.skills, "round_start", S.skillLevels, S.rs, roundLog, S.isPlayer ? (sl.branchDef?.label || "Troops") : "Defenders", T.slots[0]?.branch ?? T.cmdObj?.troopBranch ?? null, round, S.slots, sl);
    tagSide(roundLog, from, S);
  }
}

// 4) Hero-skill log
logHeroSkills(A, roundLog);
logHeroSkills(D, roundLog);

// 5) Heal block: a side's blockHeal blocks the OTHER side's healing
for (const S of [A, D]) {
  const T = other(S);
  if ((T.rs.blockHeal || 0) > 0) S.blockHealRounds = Math.max(S.blockHealRounds, T.rs.blockHeal);
  S.healBlockedNow = S.blockHealRounds > 0;
  if (S.blockHealRounds > 0) S.blockHealRounds--;
}

// 6) Walls / fort bonus for the defender (attacker garrisonIgnore reduces it)
const gi = Math.min(0.90, A.rs.garrisonIgnore || 0);
const roundTerrBonus = 1 + fort*(1-gi) / 100;
D.terrMult = roundTerrBonus;

// 7) Heals (passive healPct: share of lost HP; skill heal: commander heal formula with decay cap)
for (const S of [A, D]) {
  if (S.healBlockedNow) continue;
  const hpDiv = S.hpPer;
  if (S.rs.healPct > 0 && S.lostHp > 0) {
    const restored = healSideHp(S, Math.round(S.lostHp * S.rs.healPct));
    const troopsBack = Math.round(restored / hpDiv);
    if (troopsBack > 0) roundLog.actions.push({ actor:S.name, action:`💚 ${troopsBack} troops restored (passive)`, dmg:-troopsBack, isSkill:true, isHeal:true, troopsBack,
      ...(S.isPlayer ? { atkRemaining:Math.round(hpOf(S)/hpDiv) } : { isPlayer:false, defRemaining:Math.round(hpOf(S)/hpDiv) }) });
  }
  if (S.rs.skillHealCoeff > 0) {
    const healAmt = calcCmdHeal(S.command, S.rs.skillHealCoeff, S.rs.recoveryModSum || 0, S.dmgPool, round, S.dmgRound);
    const done = healSideHp(S, Math.max(0, Math.round(healAmt)));
    S.dmgPool = Math.max(0, S.dmgPool - done);
    const troopsBack2 = Math.round(done / hpDiv);
    if (troopsBack2 > 0) roundLog.actions.push({ actor:S.name, action:`💚 ${troopsBack2} troops healed (skill)`, dmg:-troopsBack2, isSkill:true, isHeal:true, troopsBack:troopsBack2,
      ...(S.isPlayer ? { atkRemaining:Math.round(hpOf(S)/hpDiv) } : { isPlayer:false, defRemaining:Math.round(hpOf(S)/hpDiv) }) });
  }
}

// 8) % max-HP nukes
for (const S of [A, D]) {
  const T = other(S);
  if (S.rs.cmdPctDmg > 0 && hpOf(T) > 0) {
    const isCrit = Math.random() < S.rs.critChance;
    const maxHp  = T.slotMax.reduce((s, h) => s + h, 0);
    const dmg    = Math.max(1, Math.round(maxHp * S.rs.cmdPctDmg * (isCrit ? 1.5 : 1.0)));
    const lost   = damageSide(T, dmg, round);
    roundLog.actions.push({ actor:S.name, action:`💀 % HP strike${isCrit?" (CRIT!)":""}`, dmg, ...hitFields(S, T, lost), isSkill:true });
  }
}

// 9) Speed order: both commanders + every slot. Own SPD buffs up, enemy SPD-down debuffs down.
const order = [];
for (const S of [A, D]) {
  const T = other(S);
  order.push({ side:S, cmd:true, spd:S.spd + (S.rs.cmdSpdBonus || 0) - (T.rs.enemySpdFlatDown || 0) });
  S.slots.forEach((sl, idx) => order.push({ side:S, slotIdx:idx, spd:sl.spd + (S.rs.slotSpdBonus?.[idx] || 0) - (T.rs.enemySpdFlatDown || 0) }));
}
// Speed ties: one coin flip per round decides which side's tied units go first (no built-in attacker edge)
const tieFirst = Math.random() < 0.5 ? A : D;
order.sort((a, b) => b.spd - a.spd || (a.side === b.side ? 0 : (a.side === tieFirst ? -1 : 1)));

for (const ent of order) {
  if (hpOf(A) <= 0 || hpOf(D) <= 0) break;
  const S = ent.side, T = other(S);
  if (ent.cmd) commanderAct(S, T, round, roundLog);
  else slotAct(S, ent.slotIdx, T, round, roundLog);
}

// 10) round_end troop skills (both sides)
for (const S of [A, D]) {
  const T = other(S);
  for (const sl of S.slots) {
    const from = roundLog.actions.length;
    procTroopSkills(sl.skills, "round_end", S.skillLevels, S.rs, roundLog, S.isPlayer ? (sl.branchDef?.label || "Troops") : "Defenders", T.slots[0]?.branch ?? T.cmdObj?.troopBranch ?? null, round, S.slots, sl);
    tagSide(roundLog, from, S);
  }
}

atkTroopHp = hpOf(A); defTroopHp = hpOf(D);
totalAtkLostHp = A.lostHp;

// ── Life Drain tick ───────────────────────────────────────────────────────────
if (rs.lifeDrainApplied) {
  rs.lifeDrainRoundsLeft--;
  if (rs.lifeDrainRoundsLeft <= 0) {
    rs.lifeDrainApplied = false; rs.lifeDrainRoundsLeft = 0;
    roundLog.actions.push({ actor:"Battlefield", action:`🩸 Life Drain wore off.`, dmg:0, isTroopSkill:true });
  }
}
// ── Mummify escalation ────────────────────────────────────────────────────────
if (rs.mummifyApplied) {
  rs.mummifyRound++;
  if (rs.mummifyRound > 3) {
    rs.mummifyApplied=false; rs.mummifyRound=0;
    roundLog.actions.push({ actor:"Battlefield", action:`🧟 Mummify wore off.`, dmg:0, isTroopSkill:true });
  } else {
    const spdPen = rs.mummifyRound===1?25:50;
    roundLog.actions.push({ actor:"Battlefield", action:`🧟 Mummify Rnd ${rs.mummifyRound}: Enemy SPD -${spdPen}%${rs.mummifyRound===3?" (skip next round)":""}`, dmg:0, isTroopSkill:true });
  }
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
