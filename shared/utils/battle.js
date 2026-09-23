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
  if (typeof spec === "function") return spec;
  const list = Array.isArray(spec) ? spec : [spec];
  return sl => list.some(s => s === "mounted" ? sl.branchDef?.role === "mounted"
    : (s === "humans" || s === "creatures") ? getFactionAlignment(sl.branch?.faction) === s
    : (sl.branch?.branch === s || sl.branch?.faction === s));
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
function addPoison(rs, ctx, pct, rounds, o = {}) {
  rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg || 0, pct); // status: enemy is poisoned this round
  if (ctx?.isCommander) {
    rs.venomConverted = true; // per-unit DoT below replaces the legacy frontline venom
    addSkillHit(rs, ctx, 0, { n: o.n ?? 1, prio: o.prio || null, random: !!o.random, ti: o.ti, label: o.label || "Poison", dot: { kind: "venom", pct, rounds: rounds || 1 } });
  } else if (ctx?.cs && rounds > 1) ctx.cs.poisons.push({ pct, until: ctx.round + rounds - 1 });
}
// Bleed DoT for commander skills: rides on the skill's own hit (same targets) — call after addSkillHit
function attachBleed(rs, ctx, pct, rounds) {
  rs.bleedApplied = true; rs.pendingBleedDmg = pct; rs.bleedRoundsLeft = rounds; // status flags
  if (!ctx?.isCommander) return;
  rs.bleedConverted = true;
  const h = (rs.skillHits || [])[rs.skillHits.length - 1];
  if (h) h.dot = { kind: "bleed", pct, rounds };
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

// Drunk: enemy units miss more (30% × share of enemy units drunk). Lasts this round and the next.
function markDrunk(rs, ctx, share = 1, miss = 0.30) {
  rs.drunkApplied = true; rs.drunkAppliedNow = true;
  rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance || 0) + miss * share);
  if (ctx?.cs) { ctx.cs.drunkFrom = ctx.round; ctx.cs.drunkUntil = ctx.round + 1; ctx.cs.drunkMiss = Math.max(ctx.cs.drunkMiss || 0, miss * share); }
}
// Burn DAMAGE (FOC-based skill damage) — tracked so "Burn DMG +X%" passives can scale it.
function addBurnDmg(rs, amt, ctx, o = {}) {
  rs.burnDmgInstances = (rs.burnDmgInstances || 0) + 1;
  if (ctx?.isCommander) { addSkillHit(rs, ctx, amt, { ...o, stat: "foc", kind: o.kind === "normalExtra" ? "normalExtra" : "burn", isBurn: true }); return; }
  rs.focusDmgBonus = (rs.focusDmgBonus || 0) + amt;
  rs.burnSkillDmg = (rs.burnSkillDmg || 0) + amt;
}

// ── Per-unit skill hits ───────────────────────────────────────────────────────
// Commander skill damage is queued as hits (rs.skillHits) and resolved in commanderAct
// against individual enemy units: `n` separate units (or "all"), picked by priority, each
// hit using that unit's own DEF/size and "vs X" bonuses. Troop-skill calls (no ctx) keep
// the old single multiplier.
function addSkillHit(rs, ctx, pct, o = {}) {
  if (!pct && !o.dot) return;
  if (ctx?.isCommander) {
    (rs.skillHits || (rs.skillHits = [])).push({
      pct, stat: o.stat || "atk", n: o.n ?? 1, prio: o.prio || null, random: !!o.random,
      kind: o.kind || "skill", fromActive: o.fromActive ?? (ctx.phase === "active"),
      bonusIf: o.bonusIf || null, onlyIf: o.onlyIf || null, label: o.label || null, isBurn: !!o.isBurn,
      dot: o.dot || null, useStat: o.useStat || null, nth: o.nth ?? null, ti: o.ti ?? null, requiresNormal: !!o.requiresNormal, onKillBonus: o.onKillBonus || 0,
    });
  } else if (o.stat === "foc") rs.focusDmgBonus = (rs.focusDmgBonus || 0) + pct;
  else rs.cmdMult *= (1 + pct);
}
const targetsOf = eff => eff.targets === "all" ? "all" : (typeof eff.targets === "number" ? eff.targets : 1);
const prioOf    = eff => eff.prioritise || (eff.target && eff.target !== "single" ? eff.target : null);
// Faction key or alignment ("humans"/"creatures") → unit match object
const matchFor  = who => (who === "humans" || who === "creatures") ? { alignment: who } : { faction: who };
// "+X% DMG vs <faction/alignment> units" — checked per unit hit. who: "cmd" | "troops" | "skill" | "all"
function addVsTarget(rs, who, faction, value) {
  if (!faction) return;
  (rs.vsTarget || (rs.vsTarget = [])).push({ who, match: matchFor(faction), value });
}

// ── Per-unit statuses (commander skills) ──────────────────────────────────────
// Stun/Confuse land on specific enemy units (rs.stunnedUnits / rs.confusedUnits, enemy slot indexes)
// or on the enemy commander (rs.enemyCmdStunned / rs.enemyCmdConfused). Troop skills keep the legacy
// army-wide counters (rs.enemyStunned / rs.enemyConfused). Each unit rolls its own chance.
function stunUnits(rs, ctx, n, prio, chance, o = {}) {
  if (!ctx?.isCommander) { if (Math.random() < chance) rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1); return; }
  let hit = 0;
  for (const ti of ctx.pickEnemy(n, prio, !!o.random, o.onlyIf)) if (Math.random() < chance) { (rs.stunnedUnits || (rs.stunnedUnits = new Set())).add(ti); hit++; }
  return hit;
}
function confuseUnits(rs, ctx, n, prio, chance, o = {}) {
  if (!ctx?.isCommander) { if (Math.random() < chance) rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1); return; }
  let hit = 0;
  for (const ti of ctx.pickEnemy(n, prio, !!o.random, o.onlyIf)) if (Math.random() < chance) { (rs.confusedUnits || (rs.confusedUnits = new Set())).add(ti); hit++; }
  return hit;
}
function stunEnemyCmd(rs, ctx) { if (ctx?.isCommander) rs.enemyCmdStunned = true; else rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1); }
function confuseEnemyCmd(rs, ctx) { if (ctx?.isCommander) rs.enemyCmdConfused = true; else rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1); }
// Own-slot helpers: index list of own living slots matching a branch spec
const ownIdx = (ctx, spec) => ctx?.ownSlotIdx ? ctx.ownSlotIdx(skillSlotPred(spec)) : [];
function setSlot(rs, field, i, v, combine = "mul") {
  const o = rs[field] || (rs[field] = {});
  o[i] = combine === "mul" ? (o[i] ?? 1) * v : combine === "max" ? Math.max(o[i] || 0, v) : (o[i] || 0) + v;
}

// Share of the army whose slots match an arbitrary predicate (0–1).
function armySharePred(ctx, pred) {
  const slots = ctx?.atkSlots || [];
  const tot = slots.reduce((s, sl) => s + (sl.troops || 0), 0);
  return tot ? slots.filter(pred).reduce((s, sl) => s + (sl.troops || 0), 0) / tot : 0;
}
// Own units matching a role ("ranged", "melee" …) → slot indexes
const ownRoleIdx = (ctx, role) => ctx?.ownSlotIdx ? ctx.ownSlotIdx(sl => sl.branchDef?.role === role) : [];
// Branch spec "all"/"army" = every unit
const brSpec = b => (b === "all" || b === "army") ? null : b;
// ── Per-unit Burn / Blind / Slow (commander skills) ──────────────────────────
// Burn: that enemy unit deals -X% damage this round. Blind: its next attack misses. Slow: -N SPD this round.
// Each unit rolls its own chance. Troop skills keep the army-wide versions.
function burnUnits(rs, ctx, n, prio, chance, penalty = 0.20, o = {}) {
  if (!ctx?.isCommander) { if (Math.random() < chance) applyBurn(rs, penalty); return 0; }
  const list = o.list || ctx.pickEnemy(n, prio, !!o.random, o.onlyIf);
  let hit = 0;
  for (const ti of list) if (Math.random() < chance) {
    const m = rs.burnedUnits || (rs.burnedUnits = new Map());
    m.set(ti, Math.max(m.get(ti) || 0, penalty)); hit++;
  }
  if (hit) { rs.burnApplied = true; rs.burnDmgPenalty = Math.max(rs.burnDmgPenalty || 0, penalty); }
  return hit;
}
function blindUnits(rs, ctx, list) {
  for (const ti of list) (rs.blindedUnits || (rs.blindedUnits = new Set())).add(ti);
  if (list.length) rs.blindApplied = true;
}
function slowUnits(rs, ctx, list, value) {
  for (const ti of list) setSlot(rs, "unitSpdDown", ti, value, "max");
  if (list.length) { rs.slowApplied = true; rs.slowValue = Math.max(rs.slowValue || 0, value); }
}
// Flat +N DEF / HP on own units matching spec → army DEF multiplier (share-weighted), as elsewhere
function flatDefHp(rs, ctx, spec, def, hp) {
  const share = armyShare(ctx, spec);
  if (share <= 0) return;
  rs.troopDefMult *= 1 + ((def || 0) / armyAvg(ctx, spec, "def", 20) + (hp || 0) / armyAvg(ctx, spec, "hpPer", 25)) * share;
}
// Enemy units currently under one of OUR statuses (commander path): "poison" | "bleed" | "burn" | "slow" | "stun"
function enemyUnitsWith(rs, ctx, status) {
  switch (status) {
    case "poison": case "venom": return ctx?.dotUnits ? ctx.dotUnits("venom") : [];
    case "bleed": return ctx?.dotUnits ? ctx.dotUnits("bleed") : [];
    case "burn":  return [...(rs.burnedUnits?.keys() || [])];
    case "slow":  return Object.keys(rs.unitSpdDown || {}).map(Number);
    case "stun":  return [...(rs.stunnedUnits || [])];
    case "frostbite": return frozenUnits(ctx);
    default: return null; // unknown → caller keeps its army-wide fallback
  }
}
// Life Drain (commander skills): per enemy unit, lasts N rounds (ctx.cs.lifeDrain: ti → last round).
// While drained, healing that unit receives is lost and 50% of it is dealt to the unit instead (heal step).
function drainUnits(rs, ctx, list, rounds = 2) {
  if (!ctx?.isCommander) { rs.lifeDrainApplied = true; rs.lifeDrainRoundsLeft = Math.max(rs.lifeDrainRoundsLeft || 0, rounds); return list?.length || 1; }
  const m = ctx.cs.lifeDrain || (ctx.cs.lifeDrain = new Map()), apps = ctx.cs.drainApps || (ctx.cs.drainApps = {});
  for (const ti of list) { m.set(ti, Math.max(m.get(ti) || 0, ctx.round + rounds - 1)); apps[ti] = (apps[ti] || 0) + 1; }
  if (list.length) { rs.lifeDrainApplied = true; ctx.cs.drainAppliedNow = (ctx.cs.drainAppliedNow || 0) + list.length; }
  return list.length;
}
const drainedUnits = (ctx) => ctx?.cs?.lifeDrain ? [...ctx.cs.lifeDrain].filter(([, until]) => until >= ctx.round).map(([ti]) => ti) : [];
// Units of an own-branch list → slot indexes
const ownBranches = (ctx, list) => ownIdx(ctx, Array.isArray(list) ? list : [list]);
// % Slow on units (default 25% of the unit's SPD) for N rounds
function pctSlow(rs, ctx, list, pct, rounds, round) {
  const slow = r => { for (const ti of list) setSlot(r, "unitSpdDown", ti, Math.round((ctx.defSlotSpd(ti) || 60) * pct), "max"); if (list.length) r.slowApplied = true; };
  slow(rs); if (rounds > 1) setBuff(ctx, null, round + 1, round + rounds - 1, slow);
}
// Frostbite (commander skills): per enemy unit, 2 rounds (ctx.cs.frostbite: ti → last round).
// A frostbitten unit deals -40% damage (slotAct) and loses SPD from Permafrost-type skills.
function freezeUnits(rs, ctx, list, rounds = 2) {
  if (!ctx?.isCommander) { if (list?.length ?? 1) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft || 0, rounds); } return list?.length || 1; }
  const m = ctx.cs.frostbite || (ctx.cs.frostbite = new Map()), apps = ctx.cs.frostApps || (ctx.cs.frostApps = []);
  for (const ti of list) { m.set(ti, Math.max(m.get(ti) || 0, ctx.round + rounds - 1)); apps.push({ ti, round: ctx.round }); }
  if (list.length) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft || 0, 1); }
  return list.length;
}
const frozenUnits = (ctx) => ctx?.cs?.frostbite ? [...ctx.cs.frostbite].filter(([, until]) => until >= ctx.round).map(([ti]) => ti) : [];
// Each unit of the list rolls the chance → frostbitten units
const rollFreeze = (rs, ctx, list, chance, rounds = 2) => freezeUnits(rs, ctx, (list || []).filter(() => Math.random() < chance), rounds);
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
    // Normal attacks deal an additional X% Focus Damage (on the normal attack's target)
    if (ctx?.isCommander) addSkillHit(rs, ctx, eff.value || 0, { n: 1, stat: "foc", kind: "normalExtra", fromActive: false, label: skill?.name });
    else rs.focusDmgBonus += eff.value || 0;
    break;
  case "confusion_focus_down":
    rs.enemyFocusDown = Math.max(rs.enemyFocusDown, eff.value || 0);
    if (ctx?.isCommander) { // [Enemy Commander] Confusion + FOC -N (1 round)
      confuseEnemyCmd(rs, ctx);
      rs.enemyCmdFocFlatDown = (rs.enemyCmdFocFlatDown || 0) + (eff.value || 0);
    } else rs.enemyConfused = Math.max(rs.enemyConfused || 0, eff.duration || 1);
    break;
  case "vs_ranged_dmg_up":
    rs.vsRangedDmgUp += eff.value || 0;
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { role: "ranged" }, value: eff.value || 0 });
    break;
  case "gear_stat_bonus":
    // Base stats from gear +X% → the gear part of ATK/FOC/SPD
    rs.gearStatBonus += eff.value || 0;
    if (ctx?.ownGear) {
      rs.cmdAtkFlat  = (rs.cmdAtkFlat  || 0) + (ctx.ownGear.atk || 0) * (eff.value || 0);
      rs.cmdFocFlat  = (rs.cmdFocFlat  || 0) + (ctx.ownGear.foc || 0) * (eff.value || 0);
      rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + (ctx.ownGear.spd || 0) * (eff.value || 0);
    }
    break;
  case "spd_bonus":
    rs.cmdSpdBonus += eff.value || 0;
    break;
  case "day_night_conditional":
  { // [Night Creature units] Night: all stats +X% | Day: all stats -Y% (Y shrinks with level: 20% → 6% at 7/7)
    const night = ctx?.isCommander ? ctx.isNight : (() => { const h = new Date().getUTCHours(); return h < 6 || h >= 18; })();
    rs.nightBuff = night;
    const m = eff._lvlMul || 1, share = ctx?.isCommander ? armyShare(ctx, "nightcreatures") : 1;
    const v = night ? (eff.value ?? eff.nightBonus ?? 0) : -Math.max(0.06, (eff.dayPenalty || 0.20) - (m - 1) * (0.14 / 6));
    rs.troopAtkMult *= 1 + v * share;
    rs.troopDefMult *= 1 + v * share;
    break; }
  // Serava mechanics
  case "silence":
    if (Math.random() < (eff.value ?? eff.chance ?? 0.06)) {
      rs.enemySilenced = true;
      roundLog.actions.push({ actor:actorLabel, action:`🎵 ${skill.name} — Enemy commander silenced! Skill delayed.`, dmg:0, isTroopSkill:true });
    }
    break;
  case "focus_damage_venom":
    // [2 units, Ranged first] X% Focus DMG (SPD mod) | chance Venom on each unit hit
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0, { n: targetsOf(eff), stat: "foc", useStat: "spd", prio: prioOf(eff), label: skill?.name,
        dot: { kind: "venom", pct: 0.20, rounds: 1, chance: (eff.venomChance || 0.05) * (eff._lvlMul || 1) } });
      rs.venomConverted = true;
    } else {
      rs.focusDmgBonus += eff.value || 0;
      if (Math.random() < (eff.venomChance || 0.05)) rs.venomApplied = true;
    }
    break;
  case "focus_damage_delayed":
  { const init = eff.value ?? eff.initialDmg ?? 0.20, fu = (eff.delayedDmg || 0.30) * (eff._lvlMul || 1), prio = prioOf(eff);
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, init, { n: 1, stat: "foc", prio, label: skill?.name });
      setBuff(ctx, null, round + (eff.delayRounds || 1), round + (eff.delayRounds || 1), (r) => addSkillHit(r, ctx, fu, { n: 1, stat: "foc", prio, fromActive: true, label: `${skill?.name||"Overpower"} follow-up` }));
    } else { rs.focusDmgBonus += init; rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, fu); }
    break; }
  case "dual_dmg_shift":
    rs.allyDmgBonus += eff.value ?? eff.allyDmgUp ?? 0;
    rs.enemyDmgDown += (eff.enemyDmgDown || 0) * (eff._lvlMul || 1);
    if (ctx?.isCommander) {
      rs.enemyDmgReduce = Math.min(0.80, (rs.enemyDmgReduce || 0) + (eff.enemyDmgDown || 0) * (eff._lvlMul || 1));
      rs.troopAtkMult *= 1 + (eff.value ?? eff.allyDmgUp ?? 0);
      rs.cmdMult      *= 1 + (eff.value ?? eff.allyDmgUp ?? 0);
    }
    break;
  case "skill_dmg_bonus":
    rs.skillDmgBonus += eff.value || 0;
    break;
  case "followup_normal_attack":
    if (round <= (eff.maxRound || 5)) {
      rs.followupChance += eff.value ?? eff.chance ?? 0;
      if (ctx?.isCommander && Math.random() < (eff.value ?? eff.chance ?? 0)) rs.extraNormalAttacks = (rs.extraNormalAttacks || 0) + 1;
    }
    break;
  case "melee_max_dmg_chance":
    rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + (eff.value ?? eff.chance ?? 0));
    if (ctx?.isCommander) for (const i of ownIdx(ctx, null).filter(i => ctx.atkSlots[i]?.branchDef?.role === "melee")) setSlot(rs, "slotMaxDmgChance", i, eff.value ?? eff.chance ?? 0, "add");
    break;
  case "focus_damage_heal_creatures":
    addSkillHit(rs, ctx, eff.value || 0, { n: targetsOf(eff), stat: "foc", label: skill?.name });
    rs.healPct += ((eff.healPct || 0) + (eff.bonusHealPct || 0)) * (ctx?.isCommander ? armyShare(ctx, "nightcreatures") : 1); // Creature of the Night units
    break;
  // Korrax mechanics
  case "physical_damage_bleed":
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
      if (Math.random() < (eff.bleedChance ?? 0.60)) attachBleed(rs, ctx, eff.bleedDmg || 0.30, eff.bleedDuration || 2); // on the units hit
      if (eff.burnChance) burnUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.burnChance, eff.burnDmgPenalty || 0.20); // each unit hit rolls Burn
      if (eff.defDown) { // Wolf's Rage: that unit DEF -N for 2 rounds
        const dd = eff.defDown * (eff._lvlMul || 1);
        for (const ti of ctx.pickEnemy(targetsOf(eff), prioOf(eff))) {
          setSlot(rs, "unitDefFlatDown", ti, dd, "add");
          setBuff(ctx, null, round + 1, round + 1, r => setSlot(r, "unitDefFlatDown", ti, dd, "add"));
        }
      }
    } else {
      rs.bleedApplied = Math.random() < (eff.bleedChance ?? 0.60);
      rs.pendingBleedDmg = eff.bleedDmg || 0.30;
      rs.bleedRoundsLeft = eff.bleedDuration || 2;
      if (eff.burnChance && Math.random() < eff.burnChance) applyBurn(rs, eff.burnDmgPenalty || 0.20);
    }
    if (eff.bleedPreventsEvasion) rs.bleedPreventsEvasion = true;
    break;
  case "multi_hit_lowest_def":
  { // [Lowest DEF unit] N hits × lo–hi% (SPD mod); N = skill value; night max level: higher range
    const n = Math.max(1, Math.round(eff.value ?? eff.hitsBase ?? 1));
    const night = !!ctx?.isNight && eff.nightDmgLo != null;
    const lo = night ? eff.nightDmgLo : (eff.dmgLo || 0.20), hi = night ? eff.nightDmgHi : (eff.dmgHi || 0.40);
    rs.multiHitCount = n; rs.multiHitDmgLo = lo; rs.multiHitDmgHi = hi;
    for (let i = 0; i < n; i++) addSkillHit(rs, ctx, lo + Math.random() * (hi - lo), { n: 1, prio: "lowestDef", useStat: "spd", label: skill?.name });
    break; }
  case "reactive_cmd_dmg_on_ally_hit":
    // Whenever a unit of the branch takes damage, the commander's next attack +X% (set up for damageSlot)
    rs.leaderRageBonus = eff.value ?? eff.bonus ?? 0.10;
    if (ctx?.isCommander) rs.leaderRage = { branch: eff.branch || "werewolves", bonus: eff.value ?? eff.bonus ?? 0.10 };
    break;
  case "first_hits_dmg_reduce":
    // First N instances of damage received this battle -X% (applied in damageSlot)
    rs.firstHitProtection = eff.value ?? eff.reduction ?? 0.02;
    rs.firstHitsRemaining = eff.instances || 3;
    break;
  case "branch_evasion_first_hit":
    if (ctx?.isCommander) { // each unit of the branch rolls; success = it evades the next hit it takes this round
      for (const i of ownIdx(ctx, eff.branch)) if (Math.random() < (eff.value ?? eff.chance ?? 0.08)) (rs.slotEvadeNext || (rs.slotEvadeNext = new Set())).add(i);
    } else rs.branchEvasionChance = eff.chance || 0.08;
    break;
  case "stun_chance":
  { const n = targetsOf(eff), c = eff.value ?? eff.chance ?? 0.07;
    const hit = stunUnits(rs, ctx, n, prioOf(eff), c);
    if (hit || (!ctx?.isCommander && rs.enemyStunned)) roundLog.actions.push({ actor:actorLabel, action:`🌕 ${skill.name} — ${ctx?.isCommander ? `${hit} enemy unit${hit>1?"s":""}` : "Enemy"} stunned!`, dmg:0, isTroopSkill:true });
    break; }
  case "heal_creatures_mounted_bonus":
  { // [2 Creature units] heal X% | Mounted units +Y% more
    const frac = ctx?.isCommander ? Math.min(1, (eff.targets || 2) / Math.max(1, ctx.atkSlots?.length || 1)) : 1;
    rs.healPct += (eff.value ?? eff.healPct ?? 0.30) * frac + (ctx?.isCommander ? (eff.mountedBonus || 0.75) * frac * armyShare(ctx, "mounted") : 0);
    rs.mountedHealBonus = eff.mountedBonus || 0.75;
    break; }
  case "night_max_dmg_chance":
    rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + (eff.value ?? eff.chance ?? 0.10));
    if (ctx?.isCommander && ctx.isNight) for (const i of ownIdx(ctx, eff.branch || "werewolves")) setSlot(rs, "slotMaxDmgChance", i, eff.value ?? eff.chance ?? 0.10, "add");
    break;
  case "dmg_type_resist":
    // [Branch units] Focus & Poison damage received -X%
    rs.focusPoisonResist += eff.value ?? eff.focusResist ?? 0.01;
    if (ctx?.isCommander) for (const i of ownIdx(ctx, eff.branch || "mounted")) setSlot(rs, "slotFocusResist", i, eff.value ?? eff.focusResist ?? 0.01, "add");
    break;
  case "mounted_spd_modified_dmg":
    // [Mounted units] DMG dealt +X% | DMG received -X%
    rs.mountedSpdDmgUp = eff.value ?? eff.dmgUp ?? 0.01; rs.mountedSpdDmgDown = (eff.dmgDown || 0.01) * (eff._lvlMul || 1);
    if (ctx?.isCommander) for (const i of ownIdx(ctx, "mounted")) {
      setSlot(rs, "slotAtkMult", i, 1 + (eff.value ?? eff.dmgUp ?? 0.01));
      setSlot(rs, "slotDmgTakenMult", i, 1 - (eff.dmgDown || 0.01) * (eff._lvlMul || 1));
    }
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
  { // [2 units] X% Physical DMG (SPD mod) + chance to Stun each (was adding FOCUS damage)
    const n = targetsOf(eff);
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0, { n, useStat: "spd", prio: prioOf(eff), label: skill?.name });
      const hit = stunUnits(rs, ctx, n, prioOf(eff), eff.stunChance || 0.40);
      if (hit) roundLog.actions.push({ actor:actorLabel, action:`🌑 ${skill.name} — ${hit} enemy unit${hit>1?"s":""} stunned!`, dmg:0, isTroopSkill:true });
    } else {
      rs.focusDmgBonus += eff.value || 0;
      if (Math.random() < (eff.stunChance || 0.40)) rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
    }
    break; }
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
    // All enemies X% Focus DMG | 60% Venom per unit
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0, { n: "all", stat: "foc", label: skill?.name, dot: { kind: "venom", pct: 0.20, rounds: 1, chance: eff.venomChance || 0.60 } });
      rs.venomConverted = true; rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg || 0, 0.20);
    } else { rs.focusDmgBonus += eff.value || 0; rs.aoeVenomChance = eff.venomChance || 0.60; }
    break;
  case "focus_damage_poison":
    // 1 unit X% Focus DMG + Poison (Y%/round, N rounds) on that unit
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0, { n: 1, stat: "foc", label: skill?.name, dot: { kind: "venom", pct: eff.poisonDmg || 0.20, rounds: eff.poisonDuration || 2 } });
      rs.venomConverted = true; rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg || 0, eff.poisonDmg || 0.20);
    } else { rs.focusDmgBonus += eff.value || 0; rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, eff.poisonDmg || 0.20); }
    break;
  case "all_spider_army_bonus":
    rs.allSpiderBonus += eff.value || 0;
    if (ctx?.isCommander && armyAll(ctx, "spiders")) { rs.troopAtkMult *= 1 + (eff.value || 0); rs.troopDefMult *= 1 + (eff.value || 0); }
    break;
  case "enemy_spd_down_early":
    if (round <= (eff.maxRound || 4)) {
      rs.enemySpdDownEarly += eff.value || 2.0;
      if (ctx?.isCommander) rs.enemySpdFlatDown = (rs.enemySpdFlatDown || 0) + (eff.value || 2.0);
    }
    break;
  case "ally_followup_chance_early":
    if (round <= (eff.maxRound || 3)) {
      rs.allyFollowupEarly += eff.value ?? eff.chance ?? 0.08;
      if (ctx?.isCommander) rs.troopAtkMult *= 1 + (eff.value ?? eff.chance ?? 0.08); // expected extra attack
    }
    break;
  case "cotn_multi_branch_buff":
    // Spider units: chance to evade | Vampire units: chance for max damage | Werewolf units: chance SPD +10 (each unit rolls)
    rs.cotnMultiBranchBuff = { spider: eff.spider, vampire: eff.vampire, werewolf: eff.werewolf };
    if (ctx?.isCommander) {
      const c = eff.value ?? 0.10;
      for (const i of ownIdx(ctx, "spiders"))    if (Math.random() < c) setSlot(rs, "slotEvadeChance", i, 1, "max"); // evades this round
      for (const i of ownIdx(ctx, "vampires"))   if (Math.random() < c) setSlot(rs, "slotMaxDmgChance", i, 1, "max");
      for (const i of ownIdx(ctx, "werewolves")) if (Math.random() < c) { rs.slotSpdBonus = rs.slotSpdBonus || []; rs.slotSpdBonus[i] = (rs.slotSpdBonus[i] || 0) + (eff.werewolf?.value || 10); }
    }
    break;
  case "focus_damage_spider_stack":
    // 1 unit X% Focus DMG | Spider units +2% DMG per stack (max 4, whole battle)
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0, { n: 1, stat: "foc", label: skill?.name });
      const key = `spiderStack:${skill?.name}`, per = eff.spiderDmgPerStack || 0.02;
      const stacks = ctx.cs.stacks[key] = Math.min(eff.maxStacks || 4, (ctx.cs.stacks[key] || 0) + 1);
      setBuff(ctx, key, round, 99, (r) => { for (const i of ownIdx(ctx, "spiders")) setSlot(r, "slotAtkMult", i, 1 + stacks * per); });
      for (const i of ownIdx(ctx, "spiders")) setSlot(rs, "slotAtkMult", i, 1 + stacks * per);
      if (eff.spiderStunImmunity) rs.invisStunImmune = true;
    } else { rs.focusDmgBonus += eff.value || 0; rs.spiderDmgStacks = Math.min((rs.spiderDmgStacks || 0) + 1, eff.maxStacks || 4); }
    break;
  case "vulnerability_stun_chance":
  { // [2 enemy units] DMG received +X% | 10% chance to Stun each round while active (N rounds)
    const v = eff.value ?? eff.vulnValue ?? 0.02, c = eff.stunChance || 0.10, dur = eff.duration || 2;
    rs.vulnerabilityStunChance = c;
    if (ctx?.isCommander) {
      const tg = ctx.pickEnemy(targetsOf(eff), prioOf(eff));
      const apply = (r) => { for (const ti of tg) { setSlot(r, "unitVuln", ti, v, "add"); if (Math.random() < c) (r.stunnedUnits || (r.stunnedUnits = new Set())).add(ti); } };
      apply(rs);
      setBuff(ctx, null, round + 1, round + dur - 1, apply);
    } else {
      rs.enemyDmgTakenUp += v;
      if (Math.random() < c) rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
    }
    break; }
  case "heal_cleanse":
    // [2 allied units] heal X% | chance to cleanse a debuff (this round's debuffs on those units may be shrugged off)
  { const frac = ctx?.isCommander ? Math.min(1, (eff.targets || 2) / Math.max(1, ctx.atkSlots?.length || 1)) : 1;
    rs.healPct    += (eff.value ?? eff.healPct ?? 0.12) * frac;
    rs.healCleanse = { cleanseChance: eff.cleanseChance || 0.70, targets: eff.targets || 2 };
    if (ctx?.isCommander) rs.debuffResistChance = (rs.debuffResistChance || 0) + (eff.cleanseChance || 0.70) * frac;
    break; }
  // Mourne mechanics
  case "enemy_dmg_down_early_foc":
    if (round <= (eff.maxRound || 4)) { // [All enemies] DMG dealt -X% (first N rounds)
      rs.enemyDmgDownEarlyFoc += eff.value || 0.01;
      rs.enemyDmgReduce = Math.min(0.80, (rs.enemyDmgReduce || 0) + (eff.value || 0.01));
    }
    break;
  case "post_attack_focus_dmg":
    rs.postAtkFocusDmgOne = { chance: eff.chance || 0.50, value: eff.value || 0.10 };
    if (Math.random() < (eff.chance || 0.50)) // after the commander's normal attack: 1 enemy unit
      addSkillHit(rs, ctx, eff.value || 0.10, { n: 1, stat: "foc", kind: "normalExtra", requiresNormal: true, fromActive: false, label: skill?.name });
    break;
  case "focus_damage_stun_guaranteed":
    addSkillHit(rs, ctx, eff.value || 0.15, { n: 1, prio: prioOf(eff), stat: "foc", label: skill?.name });
    rs.focusStunGuaranteed = true;
    if (stunUnits(rs, ctx, 1, prioOf(eff), 1) || !ctx?.isCommander)
      roundLog.actions.push({ actor:actorLabel, action:`⚡ ${skill?.name || "Got Ya"} — Enemy unit stunned!`, dmg:0, isTroopSkill:true });
    break;
  case "faction_def_bonus":
    rs.factionDefBonus += eff.value || 0;
    if (ctx?.isCommander) { // [Faction / alignment units] DEF +N (flat)
      const g = eff.faction || eff.factions || ctx.ownFaction;
      rs.troopDefMult *= 1 + ((eff.value || 0) / armyAvg(ctx, g, "def", 20)) * armyShare(ctx, g);
    }
    break;
  case "dual_instance_buff_foc":
  { // [All allied units] first N instances: DMG received -X% (first N hits taken) | DMG dealt +X% (first N rounds)
    const n = eff.extendToInstances || eff.instances || 3, v = eff.value ?? eff.dmgReduce ?? 0.008;
    rs.dualInstanceBuff = { instances: n, dmgReduce: v, dmgUp: v };
    if (ctx?.isCommander) {
      rs.firstHitProtection = Math.max(rs.firstHitProtection || 0, v);
      rs.firstHitsRemaining = Math.max(rs.firstHitsRemaining || 0, n);
      if (round <= n) { rs.troopAtkMult *= 1 + v; rs.cmdMult *= 1 + v; }
    } else rs.dualInstancesLeft = n;
    break; }
  case "inquisitor_rally":
  { const m = eff._lvlMul || 1, fu = eff.value ?? eff.followupChance ?? 0.05;
    rs.inquisitorRally = { followupChance: fu, stunImmuneChance: (eff.stunImmuneChance || 0.07) * m, maxRound: eff.maxRound || 5 };
    if (ctx?.isCommander) {
      const idx = ownIdx(ctx, eff.branch || "inquisitors"), cs = ctx.cs;
      const imm = cs.stacks.rallyImmune || (cs.stacks.rallyImmune = []);
      if (round <= (eff.maxRound || 5)) for (const i of idx) {
        setSlot(rs, "slotAtkMult", i, 1 + fu);  // follow-up attack chance (expected extra attack)
        if (!imm.includes(i) && Math.random() < (eff.stunImmuneChance || 0.07) * m) {
          imm.push(i);
          roundLog.actions.push({ actor: actorLabel, action: `🛡️ ${skill?.name} — ${ctx.atkSlots?.[i]?.branchDef?.label || "Inquisitors"} gain permanent Stun Immunity!`, dmg: 0, isTroopSkill: true });
        }
      }
      for (const i of imm) (rs.slotStunImmune || (rs.slotStunImmune = new Set())).add(i);
    }
    break; }
  case "branch_heal_then_block":
  { const heal = Math.min(1, eff.value ?? eff.healPct ?? 0.50);
    rs.branchHealThenBlock = { branch: eff.branch, permanentHealBlock: eff.permanentHealBlock };
    if (ctx?.isCommander) {
      const share = armyShare(ctx, eff.branch || "inquisitors");
      rs.healPct += heal * share;
      // those units can't recover HP for the rest of the fight → own heals reduced by their share
      if (eff.permanentHealBlock !== false && share > 0) setBuff(ctx, `healCut:${skill?.name}`, round + 1, 10, r => { r.healCut = Math.min(1, (r.healCut || 0) + share); });
    } else rs.healPct += heal;
    break; }
  case "cmd_normal_atk_aoe_focus":
    rs.postAtkFocusDmgAll += eff.value || 0.06;
    // normal attacks also deal X% Focus to ALL enemy units
    addSkillHit(rs, ctx, eff.value || 0.06, { n: "all", stat: "foc", kind: "normalExtra", requiresNormal: true, fromActive: false, label: skill?.name });
    break;
  case "vs_all_dmg_up":
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.03);
    break;
  case "dmg_type_resist_all":
    // Focus damage received -X% (consumed where the enemy deals focus/magical damage)
    rs.dmgTypeResistAll += eff.value ?? eff.focusResist ?? 0.03;
    rs.focusDmgResist = (rs.focusDmgResist || 0) + (eff.value ?? eff.focusResist ?? 0.03);
    break;
  case "per_round_cleanse_chance":
    rs.perRoundCleanseChance += eff.value ?? eff.chance ?? 0.06;
    if (ctx?.isCommander) rs.debuffResistChance = (rs.debuffResistChance || 0) + (eff.value ?? eff.chance ?? 0.06); // debuffs landing this round may be cleansed
    break;
  // Seraph mechanics
  case "physical_damage_faction_bonus":
  { // X% Physical DMG to 1 unit | +Y% to 1 unit of the bonus faction (Y scales with level)
    const fac = eff.bonusFaction || "nightcreatures", bonus = (eff.bonusDmg || 0.20) * (eff._lvlMul || 1);
    rs.physDmgFactionBonus = { bonusDmg: eff.bonusDmg || 0.20, bonusFaction: fac };
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value ?? eff.primaryDmg ?? 0.30, { n: 1, label: skill?.name });
      addSkillHit(rs, ctx, bonus, { n: 1, prio: `faction:${fac}`, onlyIf: { faction: fac }, label: `${skill?.name} (${fac})` });
    } else rs.cmdMult = (rs.cmdMult || 1) * (1 + (eff.value ?? eff.primaryDmg ?? 0.30) + bonus);
    break; }
  case "physical_damage_faction_heal":
  { const m = eff._lvlMul || 1;
    addSkillHit(rs, ctx, eff.value || 0.30, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    rs.factionHealPct    = (eff.healPct || 0.10) * m;
    rs.meleeBonusHealPct = eff.maxLevelEffect?.meleeBonusHeal || 0;
    if (ctx?.isCommander) {
      const fac = eff.healFaction || "holyknights", isFac = skillSlotPred(fac);
      rs.healPct += rs.factionHealPct * (armyShare(ctx, fac) + rs.meleeBonusHealPct * armySharePred(ctx, sl => isFac(sl) && sl.branchDef?.role === "melee"));
    }
    break; }
  case "aoe_physical_atk_mod":
    rs.aoePhysAtkMod += eff.value || 0.20;
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.20, { n: "all", prio: prioOf(eff), label: skill?.name }); // every enemy unit
    break;
  case "reactive_cleanse_or_def_stack":
    rs.divinePrayerCleanse = eff.value ?? eff.cleanseChance ?? 0.03;
    if (ctx?.isCommander) { // commander debuffed → cleanse chance; failed cleanse → [All allied units] DEF +N (stacks, battle-long)
      rs.divinePrayer = { chance: eff.value ?? eff.cleanseChance ?? 0.03, max: eff.maxStacks || 3 };
      const st = ctx.cs.prayerStacks || 0;
      rs.divinePrayerDefStacks = st;
      if (st > 0) rs.troopDefMult *= 1 + (st * (eff.defBonus || 15)) / armyAvg(ctx, null, "def", 20);
    }
    break;
  case "stun_immunity_chance_early":
    if (ctx?.cs) { // one roll per battle; success = commander + army stun immune for the first N rounds
      const key = `stunImmEarly:${skill?.name}`;
      if (ctx.cs.stacks[key] == null) {
        ctx.cs.stacks[key] = Math.random() < (eff.value ?? eff.chance ?? 0.10);
        if (ctx.cs.stacks[key]) roundLog.actions.push({ actor: actorLabel, action: `🛡️ ${skill?.name} — Stun Immunity (rounds 1-${eff.maxRound || 4})!`, dmg: 0, isTroopSkill: true });
      }
      if (ctx.cs.stacks[key] && round <= (eff.maxRound || 4)) { rs.cmdStunImmune = true; rs.unitStunImmuneAll = true; }
    } else if (round <= (eff.maxRound || 4) && Math.random() < (eff.chance || 0.10)) rs.invisStunImmune = true;
    break;
  case "physical_damage_stun_guaranteed":
    addSkillHit(rs, ctx, eff.value || 0.15, { n: 1, prio: prioOf(eff), label: skill?.name });
    if (stunUnits(rs, ctx, 1, prioOf(eff), 1) || !ctx?.isCommander)
      roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill?.name} — Enemy unit stunned!`, dmg: 0, isTroopSkill: true });
    break;
  // Dante mechanics
  case "double_edge_dmg":
  { const up = eff.value ?? eff.dmgUp ?? 0.02, rec = (eff.dmgReceivedUp || 0.01) * (eff._lvlMul || 1);
    rs.doubleEdgeDmgUp    += up;
    rs.doubleEdgeDmgRecUp += rec;
    rs.troopAtkMult       *= 1 + up;
    rs.dmgReduce          -= rec; // penalty: allied units take more damage
    break; }
  case "double_edge_faction":
  { const up = eff.value ?? eff.dmgUp ?? 0.02, rec = (eff.dmgReceivedUp || 0.01) * (eff._lvlMul || 1);
    rs.doubleEdgeDmgUp    += up;
    rs.doubleEdgeDmgRecUp += rec;
    if (ctx?.isCommander) { // [Own-faction units] DMG +X% vs <faction> | DMG received +Y% from listed factions
      const share = armyShare(ctx, ctx.ownFaction);
      addVsTarget(rs, "troops", eff.dmgUpVs || "nightcreatures", up * share);
      for (const f of (eff.dmgReceivedUpFrom || [])) (rs.resistFrom || (rs.resistFrom = [])).push({ match: matchFor(f), value: -rec * share });
    }
    break; }
  case "chaos_confusion":
  { // level scales both chances (owner: high risk, high reward)
    const m = eff._lvlMul || 1, ally = Math.min(1, eff.value ?? eff.allyChance ?? 0.07), foe = Math.min(1, (eff.enemyChance || 0.10) * m);
    rs.chaosConfusionAlly  = ally;
    rs.chaosConfusionEnemy = foe;
    if (ctx?.isCommander) { // each unit rolls: own units may be confused, enemy units may be confused
      let own = 0;
      for (const i of ownIdx(ctx, null)) if (Math.random() < ally) { (rs.selfConfusedUnits || (rs.selfConfusedUnits = new Set())).add(i); own++; }
      const hit = confuseUnits(rs, ctx, "all", null, foe) || 0;
      if (hit || own) roundLog.actions.push({ actor: actorLabel, action: `🔥 ${skill?.name} — ${hit} enemy unit${hit !== 1 ? "s" : ""} confused${own ? `, ${own} allied unit${own > 1 ? "s" : ""} confused` : ""}!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < foe) {
      rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1);
      roundLog.actions.push({ actor: actorLabel, action: `🔥 Whatever It Takes — Enemy confused!`, dmg: 0, isTroopSkill: true });
    }
    break; }
  case "enemy_cmd_atk_drain":
    rs.enemyCmdAtkDrain = Math.max(0, (eff.value ?? eff.initialDrain ?? 7) - ((round - 1) * (eff.decayPerRound || 10)));
    if (ctx?.isCommander) rs.enemyCmdAtkFlatDown = (rs.enemyCmdAtkFlatDown || 0) + rs.enemyCmdAtkDrain;
    break;
  case "unit_evasion_first_hits":
    rs.unitEvasionFirstHits = { chance: eff.value ?? eff.chance ?? 0.04, maxHits: eff.maxHits || 4 };
    if (ctx?.isCommander) rs.firstHitsEvade = { chance: eff.value ?? eff.chance ?? 0.04, max: eff.maxHits || 4 }; // each unit, its first N hits taken
    break;
  case "poison_damage_heal_block":
    addPoison(rs, ctx, eff.value ?? eff.poisonDmg ?? 0.30, 1, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    rs.blockHeal = Math.max(rs.blockHeal || 0, eff.healBlockDuration || 2); // blocks the OTHER side's heals
    break;
  case "branch_max_dmg_chance":
    if (ctx?.isCommander) for (const i of ownIdx(ctx, eff.branch)) setSlot(rs, "slotMaxDmgChance", i, eff.value ?? eff.chance ?? 0.08, "add");
    else rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + (eff.chance || 0.08));
    break;
  case "branch_focus_resist":
    if (ctx?.isCommander) for (const i of ownIdx(ctx, eff.branch)) setSlot(rs, "slotFocusResist", i, eff.value || 0.01, "add");
    else rs.focusPoisonResist += eff.value || 0.01;
    break;
  case "heal_faction":
    // [N <faction/alignment> allied units] heal X% (share of the army those N units make up)
    rs.healPct += (eff.value ?? eff.healPct ?? 0.17) * (ctx?.isCommander
      ? Math.min(armyShare(ctx, eff.faction), (eff.targets || 2) / Math.max(1, ctx.atkSlots?.length || 1)) : 1);
    break;
  // Brennan mechanics
  case "heal_def_buff":
  { const n = ctx?.isCommander ? Math.max(1, ctx.atkSlots?.length || 1) : 1, frac = Math.min(1, (eff.targets || 2) / n);
    rs.healPct     += (eff.value ?? eff.healPct ?? 0.12) * frac;
    rs.healDefBuff  = { targets: eff.targets || 2, defBonus: eff.defBonus || 0.15, defDuration: eff.defDuration || 2 };
    if (ctx?.isCommander) {
      const up = (eff.defBonus || 0.15) * frac;
      rs.troopDefMult *= 1 + up;
      setBuff(ctx, null, round + 1, round + (eff.defDuration || 2) - 1, r => { r.troopDefMult *= 1 + up; });
    }
    break; }
  case "on_hit_heal_chance":
  { const m = eff._lvlMul || 1, c = eff.guaranteedHeal ? 1 : (eff.value ?? eff.chance ?? 0.40);
    rs.onHitHealChance = { targets: eff.targets || 2, chance: c, healPct: (eff.healPct || 0.04) * m, guaranteed: !!eff.guaranteedHeal };
    if (ctx?.isCommander && round > 1) { // each of N allied units that took hits last round rolls to recover HP
      const n = Math.max(1, ctx.atkSlots?.length || 1), t = Math.min(eff.targets || 2, n);
      let procs = 0;
      for (let k = 0; k < t; k++) if (Math.random() < c) procs++;
      rs.healPct += (eff.healPct || 0.04) * m * procs / n;
    }
    break; }
  case "heal_cleanse_all":
    rs.healPct       += eff.value ?? eff.healPct ?? 0.10;
    rs.healCleansAll  = { cleanseChance: eff.cleanseChance || 0.08 };
    // Cleanse: this round each enemy debuff on our units has a chance to be removed (rolled where debuffs land)
    rs.debuffResistChance = (rs.debuffResistChance || 0) + (eff.cleanseChance || 0.08) * (eff._lvlMul || 1);
    break;
  case "heal_double_chance":
  { const h = eff.value ?? eff.healPct ?? 0.08, twice = Math.random() < (eff.doubleChance || 0.50);
    rs.healDoubleChance = { branch: eff.branch || "holyknights", healPct: h, doubleChance: eff.doubleChance || 0.50 };
    rs.healPct += h * (twice ? 2 : 1) * (ctx?.isCommander ? armyShare(ctx, eff.branch || "holyknights") : 1);
    if (twice) roundLog.actions.push({ actor: actorLabel, action: `💚 ${skill?.name} — activates a second time!`, dmg: 0, isTroopSkill: true });
    break; }
  case "decaying_dmg_reduce":
    if (ctx?.isCommander) { // each allied unit: DMG received -X%, decaying per hit that unit takes
      rs.decayRed = { v: eff.value || 0.06, f: eff.decayFraction ?? 0.25, max: eff.maxHits || 4 };
      rs.decayingDmgReduce = eff.value || 0.06;
    } else {
      rs.decayingDmgReduce = eff.value || 0.06;
      rs.decayFraction     = eff.decayFraction || 0.25;
      rs.hitsUntilDecayGone = eff.maxHits || 4;
      rs.dmgReduce         += rs.decayingDmgReduce;
    }
    break;
  case "role_dmg_bonus":
    rs.roleDmgBonus += eff.value || 0.03;
    if (ctx?.isCommander) for (const i of ownRoleIdx(ctx, eff.role)) setSlot(rs, "slotAtkMult", i, 1 + (eff.value || 0.03));
    else rs.troopAtkMult *= (1 + (eff.value || 0.03));
    break;
  case "role_dmg_bonus_vs_faction":
    rs.roleDmgBonusVsFaction = { role: eff.role, bonusFaction: eff.bonusFaction, value: eff.value || 0.02 };
    if (ctx?.isCommander) addVsTarget(rs, "troops", eff.bonusFaction, (eff.value || 0.02) * armySharePred(ctx, sl => sl.branchDef?.role === eff.role));
    break;
  case "heal_all":
    rs.healPct += eff.value ?? eff.healPct ?? 0.50;
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
  { const c = Math.min(1, eff.value ?? eff.chance ?? 0.07), b = eff.bonusDmg || 0.50;
    rs.onHitBonusDmg = { chance: c, bonusDmg: b };
    if (ctx?.isCommander) {
      rs.troopAtkMult *= 1 + c * b; // army: expected extra damage per hit
      if (Math.random() < c) addSkillHit(rs, ctx, b, { n: 1, kind: "normalExtra", requiresNormal: true, fromActive: false, label: skill?.name });
    }
    break; }
  case "per_round_def_stack":
    if (ctx?.isCommander) { // [Faction units] once per round: chance to gain DEF +N (battle-long stacks)
      const key = `defStack:${skill?.name}`, cur = ctx.cs.stacks[key] || 0;
      if (cur < (eff.maxStacks || 10) && Math.random() < (eff.value ?? eff.chance ?? 0.09)) ctx.cs.stacks[key] = cur + 1;
      const st = ctx.cs.stacks[key] || 0, g = eff.faction || ctx.ownFaction;
      rs.perRoundDefStack = { current: st };
      if (st > 0) rs.troopDefMult *= 1 + (st * (eff.defPerStack || 5) / armyAvg(ctx, g, "def", 20)) * armyShare(ctx, g);
    } else {
      if (!rs.perRoundDefStack) rs.perRoundDefStack = { faction: eff.faction, chance: eff.chance, defPerStack: eff.defPerStack, maxStacks: eff.maxStacks, current: 0 };
      if (rs.perRoundDefStack.current < rs.perRoundDefStack.maxStacks && Math.random() < rs.perRoundDefStack.chance) {
        rs.perRoundDefStack.current++;
        rs.troopDefMult *= (1 + (rs.perRoundDefStack.defPerStack / 100));
      }
    }
    break;
  case "physical_damage_and_heal":
    addSkillHit(rs, ctx, eff.value ?? eff.enemyDmg ?? 0.12, { n: 1, label: skill?.name });
    rs.physDmgAndHeal  = { allyHeal: eff.allyHeal || 0.13 };
    if (ctx?.isCommander) rs.healPct += (eff.allyHeal || 0.13) * (eff._lvlMul || 1) / Math.max(1, ctx.atkSlots?.length || 1); // 1 allied unit
    break;
  case "dmg_resist_vs_faction":
    rs.dmgResistVsFaction += eff.value || 0.01;
    if (ctx?.isCommander) (rs.resistFrom || (rs.resistFrom = [])).push({ match: matchFor(eff.faction), value: eff.value || 0.01 }); // damage FROM those units
    else rs.dmgReduce += eff.value || 0.01;
    break;
  case "enemy_dmg_down_early_atk":
    if (round <= (eff.maxRound || 4)) {
      rs.enemyDmgDown += eff.value || 0.007;
      rs.enemyDmgReduce = Math.min(0.80, (rs.enemyDmgReduce || 0) + (eff.value || 0.007));
    }
    break;
  case "branch_dmg_bonus":
    rs.branchDmgBonus += eff.value || 0.03;
    rs.troopAtkMult   *= (1 + (eff.value || 0.03) * (ctx?.isCommander ? armyShare(ctx, eff.branch) : 1)); // troop skills unchanged
    break;
  case "physical_damage_multi":
    addSkillHit(rs, ctx, eff.value || 0.12, { n: targetsOf(eff), prio: eff.prioritise || null, label: skill?.name, isBurn: eff.damageType === "burn",
      bonusIf: eff.bonusDmg ? { match: eff.prioritise ? { role: eff.prioritise } : {}, mult: eff.bonusDmg } : null });
    break;
  case "physical_damage_single":
    addSkillHit(rs, ctx, eff.value || 0.60, { n: 1, prio: prioOf(eff), label: skill?.name });
    break;
  // Aldric mechanics
  case "hk_triple_stat_bonus":
  { // [Own-faction units] DMG +x% | DEF +N | SPD +N (N scales with level)
    const m = eff._lvlMul || 1, dmgUp = eff.value ?? eff.dmgUp ?? 0.006;
    const def = (eff.defBonus || 6) * m, spd = (eff.spdBonus || 6) * m;
    rs.hkTripleStatBonus = { dmgUp, defBonus: def, spdBonus: spd };
    if (ctx?.isCommander) {
      const g = ctx.ownFaction, share = armyShare(ctx, g);
      rs.troopAtkMult *= 1 + dmgUp * share;
      rs.troopDefMult *= 1 + (def / armyAvg(ctx, g, "def", 20)) * share;
      rs.slotSpdBonus = rs.slotSpdBonus || [];
      (ctx.atkSlots || []).forEach((sl, i) => { if (sl.branch?.faction === g) rs.slotSpdBonus[i] = (rs.slotSpdBonus[i] || 0) + spd; });
    } else rs.troopAtkMult *= (1 + dmgUp);
    break; }
  case "per_round_stun_immune_chance":
    if (Math.random() < (eff.value ?? eff.chance ?? 0.05)) { // commander only, this round
      if (ctx?.isCommander) rs.cmdStunImmune = true; else rs.invisStunImmune = true;
      roundLog.actions.push({ actor: actorLabel, action: `🧱 ${skill?.name || "Stoic Hero"} — Stun Immunity this round!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "branch_heal_per_round":
    rs.healPct += (eff.value ?? eff.healPct ?? 0.05) * (ctx?.isCommander ? armyShare(ctx, eff.branch) : 1);
    break;
  case "day_max_dmg_chance":
    rs.dayMaxDmgChance = eff.value ?? eff.chance ?? 0.04;
    if (ctx?.isCommander) { if (!ctx.isNight) for (const i of ownIdx(ctx, eff.branch)) setSlot(rs, "slotMaxDmgChance", i, rs.dayMaxDmgChance, "add"); }
    else rs.meleeMaxDmgChance = Math.min(1, (rs.meleeMaxDmgChance || 0) + rs.dayMaxDmgChance);
    break;
  case "self_sacrifice_for_army":
    if (ctx?.isCommander) { // commander FOC & SPD halved | [Faction units] HP and DEF +N — rest of the battle
      const n = eff.value ?? eff.armyDefBonus ?? 3, g = eff.branch || ctx.ownFaction, share = armyShare(ctx, g);
      const foc = (ctx.cmdFocStat || 0) / 2, spd = (ctx.atkCmdSpd || 0) / 2;
      const up = (n / armyAvg(ctx, g, "def", 20) + n / armyAvg(ctx, g, "hpPer", 25)) * share;
      const apply = r => { r.cmdFocFlat = (r.cmdFocFlat || 0) - foc; r.cmdSpdBonus = (r.cmdSpdBonus || 0) - spd; r.troopDefMult *= 1 + up; r.selfSacrificeActive = true; };
      apply(rs);
      setBuff(ctx, `sacrifice:${skill?.name}`, round + 1, 10, apply);
      roundLog.actions.push({ actor: actorLabel, action: `⚖️ ${skill?.name} — commander FOC & SPD halved, army HP/DEF +${n}!`, dmg: 0, isTroopSkill: true });
    } else if (!rs.selfSacrificeActive && round === 4) rs.selfSacrificeActive = true;
    break;
  case "day_night_faction_split":
  { const night = ctx?.isNight ?? (() => { const h = new Date().getUTCHours(); return h < 6 || h >= 18; })();
    const vs = eff.dayBonusVsFaction || "nightcreatures", nightRes = eff.value ?? eff.nightResist ?? 0.015;
    const dayBonus = eff.maxLevelEffect?.dayDmgBonus || 0;
    rs.dayNightFactionSplit = { isNight: night, nightResist: nightRes, dayBonus };
    if (ctx?.isCommander) { // [Faction units] night: DMG received from <vs> -X% | day (max): DMG dealt to <vs> +Y%
      const share = armyShare(ctx, eff.branch || ctx.ownFaction);
      if (night) (rs.resistFrom || (rs.resistFrom = [])).push({ match: matchFor(vs), value: nightRes * share });
      else if (dayBonus) addVsTarget(rs, "troops", vs, dayBonus * share);
    } else if (night) rs.dmgReduce += nightRes;
    break; }
  case "reactive_cmd_atk_stack":
    rs.reactCmdAtkStack = { atkPerStack: eff.value ?? eff.atkPerStack ?? 1, maxStacks: eff.maxStacks || 6 };
    if (ctx?.cs) { // +N commander ATK per hit the army has taken (battle-long, max stacks)
      const st = Math.min(eff.maxStacks || 6, ctx.cs.hitsTaken || 0);
      rs.reactCmdAtkStack.current = st;
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + st * (eff.value ?? eff.atkPerStack ?? 1);
    }
    break;
  // Korgath mechanics
  case "cmd_normal_atk_aoe_physical":
    rs.cmdAoePhysical += eff.value || 0.06;
    rs.cmdAoe = true;
    if (ctx?.isCommander) { // normal attack also hits EVERY enemy unit for X% (+ Sweeping Strike: chance +Y% on 1 random unit)
      addSkillHit(rs, ctx, eff.value || 0.06, { n: "all", kind: "normalExtra", requiresNormal: true, fromActive: false, label: skill?.name });
      if (eff.followupChance && Math.random() < eff.followupChance)
        addSkillHit(rs, ctx, (eff.value || 0.06) * (eff.followupBonus || 0.5), { n: 1, random: true, kind: "normalExtra", requiresNormal: true, fromActive: false, label: `${skill?.name} bonus` });
    }
    break;
  case "multi_hit_random_def_down":
  { const hits = eff.hits || 5, per = eff.value ?? eff.dmgPct ?? 0.08, dd = eff.defDown || 0.10, max = eff.maxDefStacks || 5;
    rs.multiHitRandomDefDown = { hits, dmgPct: per, defDown: dd, maxStacks: max };
    if (ctx?.isCommander) for (let i = 0; i < hits; i++) addSkillHit(rs, ctx, per, { n: 1, random: true, label: skill?.name });
    else rs.cmdMult *= (1 + hits * per);
    if (ctx?.cs) { // DEF-down stacks persist for the rest of the battle
      const key = `defDown:${skill?.name}`;
      const stacks = ctx.cs.stacks[key] = Math.min(max, (ctx.cs.stacks[key] || 0) + hits);
      setBuff(ctx, key, round, 99, r => { r.enemyDefDown = (r.enemyDefDown || 0) + stacks * dd; });
      rs.enemyDefDown = (rs.enemyDefDown || 0) + stacks * dd;
    } else rs.enemyDefDown = Math.min((rs.enemyDefDown||0) + dd, max * dd);
    break; }
  case "on_skill_stun_chance":
  { const tries = ctx?.isCommander ? (ctx.activesFired || 0) : 1; // one roll per skill activation
    let hit = 0;
    for (let i = 0; i < tries; i++) hit += stunUnits(rs, ctx, 1, null, eff.value ?? eff.chance ?? 0.05, { random: true }) || 0;
    if (hit) roundLog.actions.push({ actor: actorLabel, action: `👁️ ${skill?.name||"Killer's Aura"} — ${hit} enemy unit${hit>1?"s":""} stunned!`, dmg: 0, isTroopSkill: true });
    break; }
  case "cmd_dmg_bonus_vs_stunned":
    rs.cmdDmgBonusVsStunned += eff.value || 0.04;
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "cmd", match: { stunned: true }, value: eff.value || 0.04 });
    else if (rs.enemyStunned > 0) rs.cmdMult *= (1 + (eff.value || 0.04));
    break;
  case "attacking_stance_bonus":
    if (ctx?.isCommander && ctx.isAttacking === false) break; // "While Attacking" only
    rs.attackingStanceDmg += eff.value ?? eff.cmdDmgUp ?? 0.02;
    rs.cmdMult            *= (1 + (eff.value ?? eff.cmdDmgUp ?? 0.02));
    // "Army DEF +N" is flat DEF (was applied as N%)
    rs.troopDefMult       *= 1 + ((eff.armyDefUp || 2.0) * (eff._lvlMul || 1)) / (ctx?.isCommander ? armyAvg(ctx, null, "def", 20) : 100);
    break;
  case "skill_dmg_vs_faction":
    rs.skillDmgVsFaction = { faction: eff.faction || "humans", value: eff.value || 0.02 };
    if (ctx?.isCommander) addVsTarget(rs, "skill", eff.faction || "humans", eff.value || 0.02);
    else rs.skillDmgBonus += eff.value || 0.02;
    break;
  case "physical_damage_heal_block":
    addSkillHit(rs, ctx, eff.value || 0.20, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    rs.blockHeal = Math.max(rs.blockHeal || 0, eff.healBlockDuration || 1); // blocks the OTHER side's heals
    break;
  // Bruk mechanics
  case "multi_branch_def_bonus":
  { const flat = (eff.value ?? eff.defBonus ?? 2.0) + (ctx?.isCommander && ctx.isAttacking === false ? (eff.defendingBonus || 1.0) * (eff._lvlMul || 1) : 0);
    rs.multiBranchDefBonus = { branches: eff.branches, defBonus: flat, defendingBonus: eff.defendingBonus || 1.0 };
    rs.troopDefMult *= ctx?.isCommander
      ? 1 + (flat / armyAvg(ctx, eff.branches, "def", 20)) * armyShare(ctx, eff.branches)
      : 1 + (eff.defBonus || 2.0) / 100;
    break; }
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
    addSkillHit(rs, ctx, eff.value || 0.20, { n: 1, label: skill?.name });
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
      stunEnemyCmd(rs, ctx);
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
    addPoison(rs, ctx, (eff.value ?? eff.poisonDmg ?? 0.03) * (eff.poisonStacks || 2), eff.poisonDuration || 3, { n: targetsOf(eff), label: skill?.name });
    rs.enemyDefDown    = Math.min((rs.enemyDefDown || 0) + (eff.defDown || 0.10), 0.50);
    break;
  case "focus_dmg_vs_poisoned":
    rs.focusDmgVsPoisoned += eff.value || 0.10;
    if (rs.dualPoisonDotStacks > 0 || ctx?.poisonActive || (rs.pendingVenomDmg || 0) > 0)
      addSkillHit(rs, ctx, eff.value || 0.10, { n: "all", stat: "foc", label: skill?.name }); // all poisoned units
    break;
  case "poison_tick_ally_heal":
    rs.poisonTickAllyHeal = { triggerRound: eff.triggerRound || 7, healPct: eff.value ?? eff.healPct ?? 0.20 };
    if (round === (eff.triggerRound || 7) && (ctx?.poisonActive || rs.dualPoisonDotStacks > 0 || (rs.pendingVenomDmg || 0) > 0)) {
      rs.healPct += eff.value ?? eff.healPct ?? 0.20;
      roundLog.actions.push({ actor: actorLabel, action: `💚 ${skill?.name||"You Hurt, We Win"} — All allies heal ${Math.round((eff.value ?? eff.healPct ?? 0.20)*100)}% HP!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "burn_damage_apply":
    addBurnDmg(rs, eff.value || 0.17, ctx, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    { const hit = burnUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.burnChance ?? 0.60, eff.burnDmgPenalty || 0.20); // each unit hit rolls
      if (hit || (!ctx?.isCommander && rs.burnApplied)) roundLog.actions.push({ actor: actorLabel, action: `🔥 Burn applied — enemy DMG -${Math.round((eff.burnDmgPenalty||0.20)*100)}% (1 rnd)`, dmg: 0, isTroopSkill: true }); }
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
    addSkillHit(rs, ctx, pd, { n: 1, stat: "foc", label: `${skill?.name||"Surprise"} (poison)` });
    addBurnDmg(rs, bd, ctx, { n: 1, label: `${skill?.name||"Surprise"} (burn)` });
    if (Math.random() < (eff.poisonChance || 0.40)) addPoison(rs, ctx, pd, 1, { n: 1, label: skill?.name });
    burnUnits(rs, ctx, 1, null, eff.burnChance || 0.40, 0.20); // the unit hit rolls Burn
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
    addSkillHit(rs, ctx, eff.value || 0.12, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    if (Math.random() < (eff.procChance || 0.30)) {
      const up = eff.selfDmgUp || 0.10, dur = eff.selfDmgDuration || 2;
      rs.cmdMult *= (1 + up);
      setBuff(ctx, null, round + 1, round + dur - 1, r => { r.cmdMult *= (1 + up); });
      roundLog.actions.push({ actor: actorLabel, action: `⚔️ ${skill?.name||"Assault"} — CMD DMG +${Math.round(up*100)}% (${dur} rnd)!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "physical_damage_ranged_bonus":
  { // 1 unit, Ranged first; vs a Ranged unit: chance for +X% of the skill's damage (+ max: Burn chance)
    const vsRanged = !!ctx?.defRoles?.has("ranged");
    const bonus = Math.random() < (eff.rangedBonusChance ?? 0.50) ? (eff.rangedBonusDmg ?? 1.0) : 0;
    if (ctx?.isCommander) addSkillHit(rs, ctx, eff.value || 0.15, { n: 1, prio: "ranged", label: skill?.name, bonusIf: bonus ? { match: { role: "ranged" }, mult: bonus } : null });
    else rs.cmdMult *= (1 + (eff.value || 0.15) * (vsRanged ? 1 + bonus : 1));
    if (vsRanged && eff.burnChanceOnRanged) burnUnits(rs, ctx, 1, "ranged", eff.burnChanceOnRanged, 0.20, { onlyIf: ctx?.isCommander ? { role: "ranged" } : null }); // max: the Ranged unit hit rolls Burn
    break; }
  case "reactive_skill_dmg_on_debuff":
    // Commander: configured in applyCommanderSkillEffects (cs.retaliationBonus), triggered by debuffCommander()
    if (!ctx?.isCommander) rs.reactiveSkillDmgOnDebuff = eff.bonus || 0.05;
    break;
  case "attacking_defending_split":
  { const up = eff.value ?? eff.attackDmgUp ?? 0.015, down = (eff.defendDmgDown || 0.01) * (eff._lvlMul || 1);
    rs.attackingDefendingSplit = { attackDmgUp: up, defendDmgDown: down };
    rs.cmdMult *= ctx?.isCommander && ctx.isAttacking === false ? (1 - down) : (1 + up);
    break; }
  case "reactive_cleanse_chance":
    // Commander: reactive part configured in applyCommanderSkillEffects (cs.cleanseChance); when it fires as an
    // active (Cauterize) it also gives this round's incoming debuffs a cleanse chance
    if (!ctx?.isCommander) rs.reactiveCleanseChance += eff.chance || 0.05;
    else if (ctx.phase === "active") rs.debuffResistChance = (rs.debuffResistChance || 0) + (eff.value ?? eff.chance ?? 0.05);
    break;
  case "cmd_dmg_bonus_vs_faction":
    rs.cmdDmgVsFaction = { faction: eff.faction || "pirates", value: eff.value || 0.02 };
    if (ctx?.isCommander) addVsTarget(rs, "cmd", eff.faction || "pirates", eff.value || 0.02);
    else rs.cmdMult *= (1 + (eff.value || 0.02));
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
    addSkillHit(rs, ctx, hit, { n: targetsOf(eff), label: skill?.name });
    break; }
  case "dmg_bonus_vs_size":
    rs.dmgBonusVsSize += eff.value || 0.01;
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { size: eff.size || "large" }, value: eff.value || 0.01 });
    else { rs.troopAtkMult *= (1 + (eff.value || 0.01)); rs.cmdMult *= (1 + (eff.value || 0.01)); } // troop skills: unchanged
    break;
  case "physical_damage_multi_prioritise":
    addSkillHit(rs, ctx, eff.value || 0.40, { n: eff.targets || 2, prio: eff.prioritise || "large", label: skill?.name });
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
    addSkillHit(rs, ctx, eff.value || 0.20, { n: "all", label: skill?.name });
    burnUnits(rs, ctx, "all", null, eff.burnChance || 0.30, 0.20); // each unit rolls Burn
    if (Math.random() < (eff.poisonChance|| 0.30)) addPoison(rs, ctx, 0.20, 1, { n: "all", label: skill?.name });
    if (Math.random() < (eff.bleedChance || 0.30)) {
      if (ctx?.isCommander) { addSkillHit(rs, ctx, 0, { n: "all", label: skill?.name, dot: { kind: "bleed", pct: 0.30, rounds: 2 } }); rs.bleedConverted = true; }
      rs.bleedApplied = true; rs.pendingBleedDmg = 0.30; rs.bleedRoundsLeft = 2;
    }
    if (eff.stunChance) stunUnits(rs, ctx, "all", null, eff.stunChance); // each unit rolls
    break;
  // ── Reck mechanics ────────────────────────────────────────────────────────
  case "aoe_physical_drunk":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.06, { n: "all", label: skill?.name });
    if (Math.random() < (eff.drunkChance || 0.60)) {
      if (ctx?.isCommander) markDrunk(rs, ctx, 1, eff.drunkMissChance || 0.30);
      else { rs.drunkApplied = true; rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance || 0) + (eff.drunkMissChance || 0.30)); }
      roundLog.actions.push({ actor:actorLabel, action:`🛢️ Drunk applied — 30% miss, no evade!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "aoe_physical_bonus_vs_drunk":
  { rs.cmdAoe = true;
    const hit = (eff.value || 0.07) * (rs.drunkApplied ? 1 + (eff.bonusDmgIfDrunk || 1.40) : 1); // bonus on this skill only
    addSkillHit(rs, ctx, hit, { n: "all", label: skill?.name });
    break; }
  case "dmg_bonus_vs_faction_all":
    rs.dmgBonusVsFactionAll += eff.value || 0.01;
    if (ctx?.isCommander) addVsTarget(rs, "all", eff.faction, eff.value || 0.01);
    else { rs.cmdMult *= (1 + (eff.value || 0.01)); rs.troopAtkMult *= (1 + (eff.value || 0.01)); }
    break;
  case "multi_hit_random_faction_heal":
    if (ctx?.isCommander) for (let i = 0; i < (eff.hits || 2); i++) addSkillHit(rs, ctx, eff.value ?? eff.dmgPct ?? 0.11, { n: 1, random: true, label: skill?.name });
    else rs.cmdMult *= (1 + (eff.value ?? eff.dmgPct ?? 0.11) * (eff.hits || 2));
    rs.healPct += (eff.healPct || 0.60) * (ctx?.isCommander ? armyShare(ctx, eff.healFaction || ctx.ownFaction) : 1);
    break;
  case "physical_damage_heal_block_chance":
    addSkillHit(rs, ctx, eff.value || 0.14, { n: targetsOf(eff), label: skill?.name });
    if (Math.random() < (eff.healBlockChance || 0.70)) rs.blockHeal = Math.max(rs.blockHeal || 0, eff.healBlockDuration || 2);
    break;
  case "per_round_confusion_immune_chance":
    rs.perRoundConfusionImmune += eff.value ?? eff.chance ?? 0.03;
    if (Math.random() < (eff.value ?? eff.chance ?? 0.03)) {
      if (ctx?.isCommander && /Stun Immun/.test(skill?.desc || "")) { // Coldborn versions: commander Stun Immunity
        rs.cmdStunImmune = true;
        roundLog.actions.push({ actor:actorLabel, action:`🛡️ ${skill?.name} — Stun Immune this round!`, dmg:0, isTroopSkill:true });
        break;
      }
      rs.cmdConfusionImmune = true;  // commander
      rs.atkConfusionImmune = true;  // and troops
      rs.invisStunImmune = true;
      roundLog.actions.push({ actor:actorLabel, action:`🌊 ${skill?.name||"Resilience"} — Confusion Immune this round!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "all_faction_skill_dmg_bonus":
    rs.allFactionSkillDmg = { faction: eff.faction || "pirates", value: eff.value || 0.03 };
    if (!ctx?.isCommander || armyAll(ctx, eff.faction || "pirates")) rs.skillDmgBonus += eff.value || 0.03;
    break;
  case "confusion_vs_alignment":
  { const list = Array.isArray(eff.alignment) ? eff.alignment : [eff.alignment];
    const c = eff.value ?? eff.chance ?? 0.10;
    rs.confusionVsAlignment = { alignment: eff.alignment, chance: c };
    let hit = 0;
    if (ctx?.isCommander) for (const f of list) hit += confuseUnits(rs, ctx, "all", null, c, { onlyIf: matchFor(f) }) || 0; // each matching unit rolls
    else if (Math.random() < c) { rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1); hit = 1; }
    if (hit) roundLog.actions.push({ actor:actorLabel, action:`💨 ${skill?.name||"Smokescreen"} — ${hit} enemy unit${hit>1?"s":""} confused!`, dmg:0, isTroopSkill:true });
    break; }
  case "cmd_atk_per_faction_slot":
    rs.cmdAtkPerFactionSlot = { faction: eff.faction || "pirates", atkPerSlot: eff.value ?? eff.atkPerSlot ?? 0.5, maxSlots: eff.maxSlots || 3 };
    if (ctx?.isCommander) {
      const n = Math.min(eff.maxSlots || 3, (ctx.atkSlots || []).filter(sl => sl.branch?.faction === (eff.faction || "pirates")).length);
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + n * (eff.value ?? eff.atkPerSlot ?? 0.5);
    }
    break;
  case "physical_damage_stun_chance":
    addSkillHit(rs, ctx, eff.value || 0.15, { n: 1, prio: prioOf(eff), label: skill?.name });
    if (stunUnits(rs, ctx, 1, prioOf(eff), eff.stunChance || 0.55) || (!ctx?.isCommander && rs.enemyStunned))
      roundLog.actions.push({ actor:actorLabel, action:`🃏 ${skill?.name||"Stun"} — Enemy unit stunned!`, dmg:0, isTroopSkill:true });
    break;
  // ── Seyne mechanics ───────────────────────────────────────────────────────
  case "aoe_def_down":
  { const v = eff.value || 1.0;
    rs.aoeDefDown += v;
    rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + v, 50);
    if ((eff.duration || 2) > 1) setBuff(ctx, null, round + 1, round + (eff.duration || 2) - 1, r => { r.enemyDefFlatDown = Math.min((r.enemyDefFlatDown||0) + v, 50); });
    break; }
  case "dmg_bonus_vs_debuffed":
    rs.dmgBonusVsDebuffed += eff.value || 0.02;
    if (rs.enemyDefDown > 0 || rs.enemyDefFlatDown > 0) {
      if (ctx?.isCommander) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.02); // "Damage Received +X%"
      else rs.troopAtkMult *= (1 + (eff.value || 0.02));
    }
    break;
  case "faction_dmg_bonus":
    rs.factionDmgBonus += eff.value || 0.01;
    rs.troopAtkMult    *= (1 + (eff.value || 0.01) * (ctx?.isCommander ? armyShare(ctx, eff.faction || ctx.ownFaction) : 1));
    break;
  case "faction_followup_per_round":
    rs.factionFollowupPerRound += eff.value ?? eff.chance ?? 0.03;
    if (ctx?.isCommander) {
      const share = armyShare(ctx, eff.faction || ctx.ownFaction);
      if (share > 0 && Math.random() < (eff.value ?? eff.chance ?? 0.03)) {
        rs.troopAtkMult *= 1 + share; // those units get a follow-up attack this round
        roundLog.actions.push({ actor:actorLabel, action:`🔁 ${skill?.name} — follow-up attack!`, dmg:0, isTroopSkill:true });
      }
    }
    break;
  case "drunk_chance_multi":
    rs.drunkChanceMulti += eff.value ?? eff.drunkChance ?? 0.10;
    if (Math.random() < (eff.value ?? eff.drunkChance ?? 0.10)) {
      if (ctx?.isCommander) markDrunk(rs, ctx, Math.min(1, (eff.targets || 2) / Math.max(1, ctx.defSlotCount || 1)));
      else { rs.drunkApplied = true; rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance||0) + 0.30); }
      roundLog.actions.push({ actor:actorLabel, action:`🍺 ${skill?.name||"Beers On Me"} — Drunk applied!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "on_drunk_apply_venom":
    rs.onDrunkApplyVenom += eff.value ?? eff.chance ?? 0.06;
    if (rs.drunkAppliedNow && Math.random() < (eff.value ?? eff.chance ?? 0.06)) {
      addPoison(rs, ctx, 0.20, 1, { n: "all", label: skill?.name }); // the drunk enemies
      roundLog.actions.push({ actor:actorLabel, action:`🧪 ${skill?.name||"Poison the Drink"} — Venom applied!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "cmd_stun_or_confuse_by_faction":
  { rs.cmdStunOrConfuse = { humanChance: eff.value ?? eff.humanChance ?? 0.04, creatureChance: eff.value ?? eff.creatureChance ?? 0.04 };
    const align = ctx?.enemyCmdAlignment ?? ctx?.defAlignment;
    if (align === "humans" && Math.random() < (eff.value ?? eff.humanChance ?? 0.04)) {
      stunEnemyCmd(rs, ctx);
      roundLog.actions.push({ actor:actorLabel, action:`📋 ${skill?.name} — Enemy CMD stunned!`, dmg:0, isTroopSkill:true });
    } else if (align === "creatures" && Math.random() < (eff.value ?? eff.creatureChance ?? 0.04)) {
      confuseEnemyCmd(rs, ctx);
      roundLog.actions.push({ actor:actorLabel, action:`📋 ${skill?.name} — Enemy CMD confused!`, dmg:0, isTroopSkill:true });
    }
    break; }
  case "dmg_bonus_vs_role":
    rs.dmgBonusVsRole += eff.value || 0.01;
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { role: eff.role || "mounted" }, value: eff.value || 0.01 });
    else { rs.troopAtkMult *= (1 + (eff.value || 0.01)); rs.cmdMult *= (1 + (eff.value || 0.01)); }
    break;
  case "size_type_conditional_debuff":
  { const c = eff.value ?? eff.chance ?? 0.04;
    rs.sizeTypeDebuff = { largeHpDown: eff.largeHpDown||0.10, mountedSpdDown: eff.mountedSpdDown||0.10, smallDmgDown: eff.smallDmgDown||0.10, chance: c };
    if (ctx?.isCommander) {
      const tot = (ctx.defSlots || []).reduce((s, d) => s + (d.troops || 0), 0) || 1;
      const shareOf = pred => (ctx.defSlots || []).filter(pred).reduce((s, d) => s + (d.troops || 0), 0) / tot;
      const large = shareOf(d => d.branchDef?.size === "large"), mounted = (ctx.defSlots || []).filter(d => d.branchDef?.role === "mounted");
      const small = shareOf(d => d.branchDef?.size === "small");
      if (large > 0 && Math.random() < c) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.largeHpDown || 0.10) * large;
      if (mounted.length && Math.random() < c) rs.enemySpdFlatDown = (rs.enemySpdFlatDown || 0) + (eff.mountedSpdDown || 0.10) * (mounted.reduce((s, d) => s + (d.spd || 0), 0) / mounted.length);
      if (small > 0 && Math.random() < c) rs.enemyDmgReduce = Math.min(0.80, (rs.enemyDmgReduce || 0) + (eff.smallDmgDown || 0.10) * small);
    }
    break; }
  case "cmd_followup_vs_alignment":
  { const list = Array.isArray(eff.alignment) ? eff.alignment : [eff.alignment];
    rs.cmdFollowupVsAlignment += eff.value ?? eff.chance ?? 0.07;
    if (ctx?.isCommander && list.some(a => enemyIs(ctx, a)) && Math.random() < (eff.value ?? eff.chance ?? 0.07)) rs.extraNormalAttacks = (rs.extraNormalAttacks || 0) + 1;
    break; }
  // ── Samuel mechanics ──────────────────────────────────────────────────────
  case "dmg_bonus_vs_alignment":
  { const list = Array.isArray(eff.alignment) ? eff.alignment : [eff.alignment];
    rs.dmgBonusVsAlignment += eff.value || 0.01;
    if (ctx?.isCommander) for (const a of list) addVsTarget(rs, "all", a, eff.value || 0.01);
    else { rs.troopAtkMult *= (1 + (eff.value || 0.01)); rs.cmdMult *= (1 + (eff.value || 0.01)); }
    break; }
  case "per_round_blind_chance":
    // Each enemy unit: X% chance to be Blinded (next attack misses) → X% miss chance on enemy actions this round
    rs.perRoundBlindChance += eff.value ?? eff.chance ?? 0.09;
    if (ctx?.isCommander) rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance || 0) + (eff.value ?? eff.chance ?? 0.09));
    else if (Math.random() < rs.perRoundBlindChance) rs.blindApplied = true;
    break;
  case "on_enemy_attack_burn_chance":
    // Enemy units that attack us may Burn themselves (rolled in commanderAct/slotAct of the attacker)
    rs.onEnemyAttackBurnChance += eff.value ?? eff.chance ?? 0.015;
    break;
  case "multi_hit_different_targets_burn":
  { const hits = eff.hits || 3;
    addBurnDmg(rs, eff.value ?? eff.dmgPct ?? 0.10, ctx, { n: hits, label: skill?.name }); // 3 DIFFERENT units
    if (eff.burnChancePerHit) { // max: each unit hit rolls Burn
      if (ctx?.isCommander) burnUnits(rs, ctx, hits, null, eff.burnChancePerHit, 0.20);
      else for (let i = 0; i < hits; i++) if (Math.random() < eff.burnChancePerHit) applyBurn(rs, 0.20);
    }
    break; }
  case "cmd_burn_dmg_bonus":
    rs.cmdBurnDmgBonus += eff.value || 0.03; // scales this round's burn damage (applied in applyCommanderSkillEffects)
    if (!ctx?.isCommander) rs.cmdMult *= (1 + (eff.value || 0.03));
    break;
  case "dmg_bonus_vs_burn":
    rs.dmgBonusVsBurn += eff.value || 0.03;
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "troops", match: { burned: true }, value: eff.value || 0.03 }); // per burning unit hit
    else if (rs.burnApplied) rs.troopAtkMult *= (1 + (eff.value || 0.03));
    break;
  case "aoe_burn_guaranteed":
    rs.cmdAoe = true;
    addBurnDmg(rs, eff.value || 0.20, ctx, { n: "all", label: skill?.name });
    if (ctx?.isCommander) { // every enemy unit Burned | max: burned units DEF -N
      burnUnits(rs, ctx, "all", null, eff.burnChance ?? 1, eff.burnDmgPenalty || 0.20);
      if (eff.maxLevelEffect?.burnedEnemyDefDown) for (const ti of rs.burnedUnits?.keys() || []) setSlot(rs, "unitDefFlatDown", ti, eff.maxLevelEffect.burnedEnemyDefDown, "add");
    } else applyBurn(rs, eff.burnDmgPenalty || 0.20);
    roundLog.actions.push({ actor:actorLabel, action:`🌡️ ${skill?.name||"Hot Sauce"} — All enemies Burned!`, dmg:0, isTroopSkill:true });
    break;
  case "followup_vs_burn":
    rs.followupVsBurn += eff.value ?? eff.chance ?? 0.06;
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "troops", match: { burned: true }, value: eff.value ?? eff.chance ?? 0.06 }); // follow-up chance vs a burning unit (expected extra attack)
    break;
  case "cmd_normal_atk_burn":
    if (ctx?.isCommander) {
      addBurnDmg(rs, eff.value || 0.03, ctx, { n: 1, kind: "normalExtra", fromActive: false, label: skill?.name }); // on the normal attack's target
      if (eff.burnDmgReceivedUp) rs.cmdBurnDmgBonus += eff.burnDmgReceivedUp * Math.min(1, (eff.targets || 2) / Math.max(1, ctx.defSlotCount || 1));
    } else { rs.cmdBurnDmgBonus += eff.value || 0.03; rs.cmdMult *= (1 + (eff.value || 0.03)); }
    break;
  case "on_burn_dmg_ally_def_stack":
    if (ctx?.cs) { // +DEF (flat) to allied pirate units per burn-damage instance, persistent, max N
      const key = `burnDef:${skill?.name}`;
      const stacks = ctx.cs.stacks[key] = Math.min(eff.maxStacks || 6, (ctx.cs.stacks[key] || 0) + (rs.burnDmgInstances || 0));
      if (stacks > 0) rs.troopDefMult *= 1 + (stacks * (eff.value ?? eff.defPerStack ?? 1) / armyAvg(ctx, eff.branch, "def", 20)) * armyShare(ctx, eff.branch);
    } else {
      if (!rs.onBurnDmgAllyDefStack) rs.onBurnDmgAllyDefStack = { branch: eff.branch, defPerStack: eff.defPerStack||1.0, maxStacks: eff.maxStacks||6, current:0 };
      if (rs.burnApplied && rs.onBurnDmgAllyDefStack.current < rs.onBurnDmgAllyDefStack.maxStacks) {
        rs.onBurnDmgAllyDefStack.current++;
        rs.troopDefMult *= (1 + (rs.onBurnDmgAllyDefStack.defPerStack / 100));
      }
    }
    break;
  case "conditional_round_start_heal":
    rs.conditionalRoundHeal = { condition: eff.condition, healPct: eff.value ?? eff.healPct ?? 0.08 };
    if (rs.burnApplied || (ctx?.cs && ctx.cs.lastBurnRound === round - 1)) rs.healPct += eff.value ?? eff.healPct ?? 0.08;
    break;
  // ── Fynn mechanics ────────────────────────────────────────────────────────
  case "physical_damage_multi_heal_all":
    addSkillHit(rs, ctx, eff.value || 0.15, { n: targetsOf(eff), label: skill?.name });
    rs.healPct += eff.healPct || 0.50;
    break;
  case "cmd_bonus_attack_chance":
    rs.cmdBonusAttackChance += eff.value ?? eff.chance ?? 0.10;
    if (ctx?.isCommander && Math.random() < (eff.value ?? eff.chance ?? 0.10)) {
      rs.extraNormalAttacks = (rs.extraNormalAttacks || 0) + 1;
      roundLog.actions.push({ actor: actorLabel, action: `⚔️ ${skill?.name} — extra normal attack!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "attacking_stance_cmd_bonus":
    if (!ctx?.isCommander || ctx.isAttacking !== false) rs.cmdMult *= (1 + (eff.value || 0.01)); // "While Attacking"
    break;
  // Brine mechanics
  case "early_round_pursuit_chance":
    if (round <= (eff.maxRound || 4) && Math.random() < (eff.value ?? eff.chance ?? 0.15)) {
      rs.pursuitActive = true;               // troops: attacks cannot miss / be evaded
      if (eff.cmdGainsPursuit) rs.cmdPursuit = true;
      roundLog.actions.push({ actor: actorLabel, action: `🌫️ Pursuit — Attacks cannot be avoided!`, dmg: 0, isTroopSkill: true });
    }
    rs.earlyRoundPursuitChance += eff.value ?? eff.chance ?? 0.15;
    break;
  case "self_confuse_army_dmg_up":
  { const up = eff.value ?? eff.armyDmgUp ?? 0.20; // level-scaled when fired as a commander skill
    rs.selfConfuseArmyDmg = { selfConfusion: eff.selfConfusion || 1, armyDmgUp: up };
    rs.troopAtkMult *= (1 + up);
    if (ctx?.isCommander) debuffCommander(ctx, roundLog, actorLabel, skill?.name, () => { rs.selfConfused = true; });
    roundLog.actions.push({ actor: actorLabel, action: `🕯️ ${skill?.name||"Captain's Honor"} — commander confused, troops +${Math.round(up*100)}% DMG!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "enemy_faction_vulnerability":
    rs.enemyFactionVuln = { faction: eff.faction || "orcs", value: eff.value || 0.025 };
    if (ctx?.isCommander) addVsTarget(rs, "all", eff.faction || "orcs", eff.value || 0.025);
    else rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.025);
    break;
  case "multi_hit_random_faction_buff":
  { let hits = eff.hits || 5;
    if (eff.bonusHitVsOrc && enemyIs(ctx, "orcs")) hits += 1; // max level
    if (ctx?.isCommander) for (let i = 0; i < hits; i++) addSkillHit(rs, ctx, eff.value ?? eff.dmgPct ?? 0.08, { n: 1, random: true, label: skill?.name });
    else rs.cmdMult *= (1 + (eff.value ?? eff.dmgPct ?? 0.08) * hits);
    rs.troopAtkMult *= (1 + (eff.allyDmgUp || 0.05) * (ctx?.isCommander ? armyShare(ctx, eff.allyFaction || ctx.ownFaction) : 1));
    rs.multiHitRandomFactionBuff = { hits, bonusHitVsOrc: eff.bonusHitVsOrc || false };
    break; }
  // Saltwhisper mechanics
  case "heal_received_bonus":
    rs.healReceivedBonus += eff.value || 0.02; // applied at heal time (all heal sources)
    if (!ctx?.isCommander) rs.healPct *= (1 + (eff.value || 0.02));
    break;
  case "sequential_immunity_then_aoe":
  { // Fire round: commander cannot be debuffed | next round: all enemies X% Focus DMG + chance Drunk
    const dmg = eff.value ?? eff.focusDmg ?? 0.30, dc = eff.drunkChance || 0.70;
    rs.sequentialImmunityAoe = { focusDmg: dmg, drunkChance: dc };
    if (ctx?.isCommander) {
      rs.cmdDebuffImmune = true;
      roundLog.actions.push({ actor: actorLabel, action: `🥃 ${skill?.name} — commander cannot be debuffed this round`, dmg: 0, isTroopSkill: true });
      setBuff(ctx, null, round + 1, round + 1, (r, log, who) => {
        addSkillHit(r, ctx, dmg, { n: "all", stat: "foc", fromActive: true, label: skill?.name }); r.cmdAoe = true;
        if (Math.random() < dc) { markDrunk(r, ctx, 1); log?.actions.push({ actor: who, action: `🥃 ${skill?.name} — All enemies Drunk!`, dmg: 0, isTroopSkill: true }); }
      });
    } else {
      rs.focusDmgBonus += dmg; rs.cmdAoe = true;
      if (Math.random() < dc) { rs.drunkApplied = true; rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance || 0) + 0.30); }
    }
    break; }
  case "army_evasion_two_hits":
    rs.armyEvasionTwoHits += eff.value ?? eff.chance ?? 0.08;
    if (ctx?.isCommander && Math.random() < (eff.value ?? eff.chance ?? 0.08)) {
      rs.evadeHits = Math.max(rs.evadeHits || 0, eff.hitCount || 2); // next N enemy hits this round are evaded
      roundLog.actions.push({ actor: actorLabel, action: `🌫️ ${skill?.name} — army will evade the next ${eff.hitCount || 2} hits`, dmg: 0, isTroopSkill: true });
    }
    break;
  // Skar mechanics
  case "aoe_physical_slow":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.12, { n: "all", label: skill?.name });
    if (ctx?.isCommander) { // each unit rolls Slow (-N SPD this round)
      const list = ctx.pickEnemy("all").filter(() => Math.random() < (eff.slowChance || 0.50));
      slowUnits(rs, ctx, list, eff.slowValue || 20);
      if (list.length) roundLog.actions.push({ actor: actorLabel, action: `🌋 ${skill?.name} — ${list.length} enemy unit${list.length > 1 ? "s" : ""} Slowed (-${eff.slowValue || 20} SPD)!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < (eff.slowChance || 0.50)) { rs.slowApplied = true; rs.slowValue = eff.slowValue || 20; }
    break;
  case "burn_apply_only":
  { const hit = burnUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.value ?? eff.burnChance ?? 0.10, eff.burnDmgPenalty || 0.20);
    if (hit || (!ctx?.isCommander && rs.burnApplied)) roundLog.actions.push({ actor: actorLabel, action: `🔥 ${skill?.name} — Burn applied!`, dmg: 0, isTroopSkill: true });
    break; }
  case "cmd_dmg_bonus_vs_burn":
    rs.cmdDmgVsBurn += eff.value || 0.03;
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "cmd", match: { burned: true }, value: eff.value || 0.03 }); // per burning unit
    else if (rs.burnApplied) rs.cmdMult *= (1 + (eff.value || 0.03));
    break;
  case "branch_first_hits_dmg_reduce":
    rs.branchFirstHitsDmgReduce = { branch: eff.branch || "dragons", reduction: eff.value ?? eff.reduction ?? 0.015, instances: eff.instances || 4 };
    if (ctx?.isCommander) rs.firstHitsRed = { v: eff.value ?? eff.reduction ?? 0.015, n: eff.instances || 4, idx: new Set(ownIdx(ctx, brSpec(eff.branch || "dragons"))) }; // each unit's first N hits
    else rs.dmgReduce += eff.reduction || 0.015;
    break;
  case "branch_battle_start_immunity":
    rs.branchBattleStartImmune = { branch: eff.branch || "dragons", immunity: eff.immunity || ["poison","venom"], chance: eff.value ?? eff.chance ?? 0.07 };
    if (ctx?.cs) { // each unit of the branch rolls once at battle start
      const key = `startImm:${skill?.name}`;
      if (!ctx.cs.stacks[key]) {
        ctx.cs.stacks[key] = ownIdx(ctx, brSpec(eff.branch || "dragons")).filter(() => Math.random() < (eff.value ?? eff.chance ?? 0.07));
        if (ctx.cs.stacks[key].length) roundLog.actions.push({ actor: actorLabel, action: `🦎 ${skill?.name} — ${ctx.cs.stacks[key].length} unit${ctx.cs.stacks[key].length > 1 ? "s" : ""} Poison/Venom immune!`, dmg: 0, isTroopSkill: true });
      }
      for (const i of ctx.cs.stacks[key]) (rs.slotVenomImmune || (rs.slotVenomImmune = new Set())).add(i);
    }
    break;
  case "dragon_supremacy_bonus":
  { const v = eff.value ?? 1;
    rs.dragonSupremacyBonus = { cmdFoc: v, cmdSpd: v, dragonDef: v, dragonSpd: v };
    if (ctx?.isCommander) { // commander FOC +N, SPD +N | Dragon units DEF +N, SPD +N
      rs.cmdFocFlat = (rs.cmdFocFlat || 0) + v;
      rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + v;
      flatDefHp(rs, ctx, "dragons", v, 0);
      rs.slotSpdBonus = rs.slotSpdBonus || [];
      for (const i of ownIdx(ctx, "dragons")) rs.slotSpdBonus[i] = (rs.slotSpdBonus[i] || 0) + v;
    } else rs.troopDefMult *= (1 + v / 100);
    break; }
  case "thorns_physical":
    rs.thornsPhysical += eff.value || 0.01;
    if (ctx?.isCommander) rs.thorns = { v: eff.value || 0.01, idx: new Set(ownIdx(ctx, brSpec(eff.branch || "dragons"))) }; // enemy units hitting these with physical damage take X%
    break;
  case "physical_damage_multi_melee_bonus":
    addSkillHit(rs, ctx, eff.value || 0.20, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name,
      bonusIf: { match: { role: "melee" }, mult: eff.meleeBonusDmg || 0.50 } }); // melee units take +50%
    break;
  case "burn_damage_atk_mod":
    addSkillHit(rs, ctx, eff.value || 0.40, { n: targetsOf(eff), prio: prioOf(eff), isBurn: true, kind: "burn", label: skill?.name }); // Burn damage (ATK)
    { const hit = burnUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.burnChance ?? 0.50, eff.burnDmgPenalty || 0.20);
      if (hit || (!ctx?.isCommander && rs.burnApplied)) roundLog.actions.push({ actor: actorLabel, action: `🌋 ${skill?.name} — Burn applied!`, dmg: 0, isTroopSkill: true }); }
    if (ctx?.isCommander && eff.enemyBurnDmgReceivedUp) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { burned: true }, value: eff.enemyBurnDmgReceivedUp });
    break;
  // Nyxara mechanics
  case "branch_on_hit_followup":
  { const c = Math.min(1, eff.value ?? eff.chance ?? 0.04), b = eff.bonusDmg || 0.50;
    rs.branchOnHitFollowup = { branch: eff.branch || "dragons", chance: c, bonusDmg: b };
    if (ctx?.isCommander) for (const i of ownIdx(ctx, brSpec(eff.branch || "dragons"))) setSlot(rs, "slotAtkMult", i, 1 + c * b); // expected extra damage per hit
    break; }
  case "focus_damage_single":
    addSkillHit(rs, ctx, eff.value || 0.60, { n: 1, prio: prioOf(eff), stat: "foc", label: skill?.name });
    if (eff.frostbiteChance) { // the unit hit rolls Frostbite
      if (ctx?.isCommander) rollFreeze(rs, ctx, ctx.pickEnemy(1, prioOf(eff)), eff.frostbiteChance);
      else if (Math.random() < eff.frostbiteChance) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft || 0, 2); }
    }
    break;
  case "dual_cmd_foc_shift":
  { const v = eff.value ?? eff.selfFocUp ?? 1;
    rs.dualCmdFocShift = { selfFocUp: v, enemyFocDown: v };
    if (ctx?.isCommander) { rs.cmdFocFlat = (rs.cmdFocFlat || 0) + v; rs.enemyCmdFocFlatDown = (rs.enemyCmdFocFlatDown || 0) + v; }
    break; }
  case "heal_alignment_dragon_bonus":
  { const heal = eff.value ?? eff.healPct ?? 0.30, bonus = eff.dragonBonus || 0.75;
    rs.healAlignmentDragonBonus = { dragonBonus: bonus };
    if (ctx?.isCommander) { // [N creature units] heal X% | Dragon units among them +Y%
      const n = Math.max(1, ctx.atkSlots?.length || 1), frac = Math.min(1, (eff.targets || 2) / n);
      rs.healPct += heal * Math.min(frac, armyShare(ctx, eff.alignment || "creatures")) + bonus * Math.min(frac, armyShare(ctx, "dragons"));
    } else rs.healPct += heal;
    break; }
  case "focus_damage_stun_chance":
    addSkillHit(rs, ctx, eff.value || 0.15, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    { const hit = stunUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.stunChance || 0.50); // each unit hit rolls
      if (hit || (!ctx?.isCommander && rs.enemyStunned)) roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill?.name} — ${ctx?.isCommander ? `${hit} enemy unit${hit > 1 ? "s" : ""}` : "Enemy"} stunned!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "cmd_stun_atk_drain":
  { const v = eff.value ?? eff.atkDrain ?? 1;
    stunEnemyCmd(rs, ctx);
    rs.cmdStunAtkDrain = { atkDrain: v, drainDuration: eff.drainDuration || 2 };
    if (ctx?.isCommander) { // enemy commander ATK -N this round and next
      rs.enemyCmdAtkFlatDown = (rs.enemyCmdAtkFlatDown || 0) + v;
      setBuff(ctx, null, round + 1, round + (eff.drainDuration || 2) - 1, r => { r.enemyCmdAtkFlatDown = (r.enemyCmdAtkFlatDown || 0) + v; });
    }
    roundLog.actions.push({ actor: actorLabel, action: `🌀 ${skill?.name} — Enemy CMD stunned + ATK -${v}!`, dmg: 0, isTroopSkill: true });
    break; }
  case "cmd_normal_atk_bonus_focus":
    rs.focusDmgBonus += eff.value || 0.03;
    break;
  // Emberclaw mechanics
  case "conditional_cmd_atk_while_burn":
    rs.conditionalCmdAtkWhileBurn += eff.value || 2.0;
    if (ctx?.isCommander) { if (rs.burnApplied || (rs.burnedUnits?.size || 0) > 0 || ctx.cs.lastBurnRound === round) rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + (eff.value || 2.0); }
    else if (rs.burnApplied) rs.cmdMult *= (1 + (eff.value || 2.0) / 100);
    break;
  case "multi_hit_random_burn_chance":
  { const hits = eff.hits || 5, pct = eff.value ?? eff.dmgPct ?? 0.08, bc = eff.burnChance || 0.20;
    rs.multiHitRandomBurnChance = { hits, burnChance: bc };
    if (ctx?.isCommander) { // N hits on random enemy units; each hit rolls Burn on the unit it hit
      const list = ctx.pickEnemy(hits, null, true);
      if (eff.bonusHitVsWizard) list.push(...ctx.pickEnemy(1, null, false, { faction: "wizards" }));
      for (const ti of list) addSkillHit(rs, ctx, pct, { ti, label: skill?.name });
      burnUnits(rs, ctx, 0, null, bc, eff.burnDmgPenalty || 0.20, { list });
    } else {
      rs.cmdMult *= (1 + pct * hits);
      for (let i = 0; i < hits; i++) if (Math.random() < bc) applyBurn(rs, 0.20);
    }
    break; }
  case "cmd_normal_atk_aoe_burn":
    rs.cmdNormalAtkAoeBurn += eff.value || 0.06;
    if (ctx?.isCommander) { // normal attacks also deal X% Burn damage (ATK) to every enemy unit
      addSkillHit(rs, ctx, eff.value || 0.06, { n: "all", kind: "normalExtra", requiresNormal: true, isBurn: true, fromActive: false, label: skill?.name });
      if (eff.normalAtkBurnChance) burnUnits(rs, ctx, "all", null, eff.normalAtkBurnChance, 0.20);
    } else { rs.cmdAoe = true; rs.cmdMult *= (1 + (eff.value || 0.06)); }
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
    if (ctx?.isCommander) { // each enemy unit rolls Frostbite
      const n = rollFreeze(rs, ctx, ctx.pickEnemy("all"), eff.value ?? eff.chance ?? 0.015);
      if (n) roundLog.actions.push({ actor: actorLabel, action: `❄️ ${skill?.name} — ${n} unit${n > 1 ? "s" : ""} Frostbitten!`, dmg: 0, isTroopSkill: true });
    } else {
      rs.perRoundFrostbiteAoeChance = (rs.perRoundFrostbiteAoeChance || 0) + (eff.chance || 0.015);
      if (Math.random() < rs.perRoundFrostbiteAoeChance) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2); }
    }
    break;
  // ── Bjorn mechanics ───────────────────────────────────────────────────────
  case "physical_damage_frostbite_chance":
    if (eff.dmgPct !== 0) addSkillHit(rs, ctx, eff.value || eff.dmgPct || 0.30, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    { const n = ctx?.isCommander ? rollFreeze(rs, ctx, ctx.pickEnemy(targetsOf(eff), prioOf(eff)), eff.frostbiteChance ?? 0.50) // each unit hit rolls Frostbite
        : (Math.random() < (eff.frostbiteChance ?? 0.50) ? freezeUnits(rs, ctx, null) : 0);
      if (n) roundLog.actions.push({ actor: actorLabel, action: `🧊 ${skill?.name||"Strike"} — Frostbite on ${ctx?.isCommander ? `${n} unit${n > 1 ? "s" : ""}` : "enemy"} (DMG -40%, 2 rnd)`, dmg: 0, isTroopSkill: true }); }
    break;
  case "aoe_physical_frostbite_chance":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.10, { n: "all", label: skill?.name });
    { const n = ctx?.isCommander ? rollFreeze(rs, ctx, ctx.pickEnemy("all"), eff.frostbiteChance || 0.25) // each unit rolls
        : (Math.random() < (eff.frostbiteChance || 0.25) ? freezeUnits(rs, ctx, null) : 0);
      if (n) roundLog.actions.push({ actor: actorLabel, action: `🩸 ${skill?.name} — Frostbite on ${ctx?.isCommander ? `${n} unit${n > 1 ? "s" : ""}` : "enemies"}!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "cmd_atk_per_frostbite_round":
    // CMD ATK bonus each round Frostbite is active (Cold Fury)
    rs.cmdAtkPerFrostbiteRound = (rs.cmdAtkPerFrostbiteRound || 0) + (eff.value || 2.0);
    if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.cmdMult *= (1 + (eff.value || 2.0) / 100);
    }
    break;
  case "physical_shatter_frostbite":
    if (ctx?.isCommander) { // a frostbitten unit: full hit, Frostbite removed, DEF -N (2 rnd); none frostbitten → half damage on 1 unit
      const ti = frozenUnits(ctx)[0];
      if (ti != null) {
        const dd = eff.defDown || 5;
        addSkillHit(rs, ctx, eff.value || 0.60, { ti, label: skill?.name });
        ctx.cs.frostbite.delete(ti);
        setSlot(rs, "unitDefFlatDown", ti, dd, "add");
        setBuff(ctx, null, round + 1, round + (eff.defDownDuration || 2) - 1, r => setSlot(r, "unitDefFlatDown", ti, dd, "add"));
        roundLog.actions.push({ actor: actorLabel, action: `💥 ${skill?.name} — Frostbite shattered! DEF -${dd} (${eff.defDownDuration || 2} rnd)`, dmg: 0, isTroopSkill: true });
      } else addSkillHit(rs, ctx, (eff.value || 0.60) * 0.5, { n: 1, label: skill?.name });
    } else if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
      rs.cmdMult *= (1 + (eff.value || 0.60)); rs.frostbiteApplied = false; rs.frostbiteRoundsLeft = 0;
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 5), 50);
    } else rs.cmdMult *= (1 + (eff.value || 0.60) * 0.50);
    break;
  case "multi_hit_random_atk_stack":
    rs.cmdAoe = true;
    if (ctx?.isCommander) { // N hits on random units; commander ATK +N per unique unit hit (this round) | max: frostbitten units take +X% skill DMG
      const pct = eff.value ?? eff.dmgPct ?? 0.04, list = ctx.pickEnemy(eff.hits || 6, null, true);
      for (const ti of list) addSkillHit(rs, ctx, pct, { ti, label: skill?.name });
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + new Set(list).size * (eff.atkPerUniqueHit || 10);
      if (eff.maxLevelEffect?.frostbittenSkillDmgTakenUp) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "skill", match: { frostbitten: true }, value: eff.maxLevelEffect.frostbittenSkillDmgTakenUp });
    } else {
      rs.cmdMult *= (1 + (eff.dmgPct || 0.08) * (eff.hits || 4));
      rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + Math.min(eff.hits || 4, 3) * (eff.atkPerUniqueHit || 5);
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
    rs.frostbittenEnemySpdDown = (rs.frostbittenEnemySpdDown || 0) + (eff.value || 5);
    if (ctx?.isCommander) rs.frostSpdDown = (rs.frostSpdDown || 0) + (eff.value || 5); // frostbitten enemy units lose SPD (turn order)
    else if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) { rs.slowApplied = true; rs.slowValue = (rs.slowValue || 0) + (eff.value || 5); }
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
    if (ctx?.isCommander) { // +X% army DMG per round an enemy unit is frostbitten (battle-long, max stacks)
      const key = `frostFury:${skill?.name}`, st = ctx.cs.stacks[key] || { n: 0, last: 0 };
      if (frozenUnits(ctx).length && st.last !== round && st.n < (eff.maxStacks || 5)) { st.n++; st.last = round; }
      ctx.cs.stacks[key] = st;
      rs.troopAtkMult *= 1 + st.n * (eff.value ?? eff.valuePerStack ?? 0.015);
    } else if (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) rs.troopAtkMult *= (1 + (eff.valuePerStack || 0.015));
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
    if (round <= (eff.maxRound || 2)) {
      rs.followupChance = (rs.followupChance || 0) + (eff.value ?? eff.chance ?? 0.06);
      if (ctx?.isCommander) rs.troopAtkMult *= 1 + (eff.value ?? eff.chance ?? 0.06); // expected extra attack
    }
    if (ctx?.cs && eff.oncePerBattleEvasionChance && round === 1) // max: each allied unit rolls to evade its next hit (once per battle)
      for (const i of ownIdx(ctx, null)) if (Math.random() < eff.oncePerBattleEvasionChance) (rs.slotEvadeNext || (rs.slotEvadeNext = new Set())).add(i);
    break;
  case "army_followup_per_round":
    rs.armyFollowupPerRound = (rs.armyFollowupPerRound || 0) + (eff.value ?? eff.chance ?? 0.02);
    if (ctx?.isCommander) { // allied units: extra-attack chance (expected) | max: commander normal attacks +40% Focus damage
      rs.troopAtkMult *= 1 + (eff.value ?? eff.chance ?? 0.02);
      if (eff.cmdNormalAtkFocBonus) addSkillHit(rs, ctx, eff.cmdNormalAtkFocBonus, { n: 1, stat: "foc", kind: "normalExtra", requiresNormal: true, fromActive: false, label: skill?.name });
    } else rs.followupChance = (rs.followupChance || 0) + rs.armyFollowupPerRound;
    break;
  case "focus_damage_frostbite_chance":
    addSkillHit(rs, ctx, eff.value || 0.15, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    { const n = ctx?.isCommander ? rollFreeze(rs, ctx, ctx.pickEnemy(targetsOf(eff), prioOf(eff)), eff.frostbiteChance ?? 0.25) // each unit hit rolls
        : (Math.random() < (eff.frostbiteChance ?? 0.25) ? freezeUnits(rs, ctx, null) : 0);
      if (n) roundLog.actions.push({ actor: actorLabel, action: `🧊 ${skill?.name||"Ice"} — Frostbite on ${ctx?.isCommander ? `${n} unit${n > 1 ? "s" : ""}` : "enemy"}!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "focus_damage_frostbite_guaranteed":
    // FOC DMG with guaranteed Frostbite (Bitter Cold)
    rs.focusDmgBonus       += eff.value || 0.20;
    rs.frostbiteApplied     = true;
    rs.frostbiteRoundsLeft  = Math.max(rs.frostbiteRoundsLeft, rs.frostbiteDuration || 2);
    roundLog.actions.push({ actor: actorLabel, action: `🌨️ Bitter Cold — Frostbite guaranteed!`, dmg: 0, isTroopSkill: true });
    break;
  case "early_round_dmg_stun_immune":
    if (round <= (eff.maxRound || 3)) { // allied units: DMG +X% + stun immune | max: burn immune
      rs.troopAtkMult *= (1 + (eff.value ?? eff.dmgUp ?? 0.02));
      if (ctx?.isCommander) {
        rs.unitStunImmuneAll = true;
        if (eff.earlyRoundBurnImmune) for (const i of ownIdx(ctx, null)) (rs.slotBurnImmune || (rs.slotBurnImmune = new Set())).add(i);
      } else { rs.cmdMult *= (1 + (eff.dmgUp || 0.02)); rs.invisStunImmune = true; }
      if (eff.maxLevelEffect?.earlyRoundBurnImmune) rs.earlyRoundBurnImmune = true;
    }
    break;
  case "heal_all_army_dmg_up":
    rs.healPct += eff.value ?? eff.healPct ?? 0.08;
    { const up = r => { r.troopAtkMult *= (1 + (eff.dmgUp || 0.01)); if (!ctx?.isCommander) r.cmdMult *= (1 + (eff.dmgUp || 0.01)); }; // army DMG +X% for N rounds
      up(rs); if (ctx?.isCommander) setBuff(ctx, null, round + 1, round + (eff.dmgDuration || 2) - 1, up); }
    break;
  case "heal_all_cleanse":
    rs.healPct += eff.value ?? eff.healPct ?? 0.10;
    rs.healCleanse = { cleanseChance: 1.0, cleanseCount: eff.cleanse ?? eff.cleanseCount ?? 1 };
    if (ctx?.isCommander) rs.cleanseUnits = Math.max(rs.cleanseUnits || 0, eff.cleanse ?? eff.cleanseCount ?? 1); // each allied unit: remove N debuffs (after both sides' skills)
    break;
  case "heal_all_cleanse_chance":
    rs.healPct += eff.value ?? eff.healPct ?? 0.12;
    rs.perRoundCleanseChance = (rs.perRoundCleanseChance || 0) + (eff.cleanseChance || 0.40);
    if (ctx?.isCommander) { // each allied unit: X% chance to shed 1 debuff | max: healing received +Y%
      rs.cleanseUnits = Math.max(rs.cleanseUnits || 0, 1); rs.cleanseChance = Math.max(rs.cleanseChance || 0, eff.cleanseChance || 0.40);
      if (eff.allyHealingReceivedUp) rs.healReceivedBonus = (rs.healReceivedBonus || 0) + eff.allyHealingReceivedUp;
    } else if (eff.maxLevelEffect?.healingReceivedUp) rs.healingReceivedUp = (rs.healingReceivedUp||0) + eff.maxLevelEffect.healingReceivedUp;
    break;
  case "aoe_focus_frostbite_chance":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.10, { n: "all", stat: "foc", label: skill?.name });
    { const n = ctx?.isCommander ? rollFreeze(rs, ctx, ctx.pickEnemy("all"), eff.frostbiteChance || 0.35) // each unit rolls
        : (Math.random() < (eff.frostbiteChance || 0.35) ? freezeUnits(rs, ctx, null) : 0);
      if (n) roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill?.name} — Frostbite on ${ctx?.isCommander ? `${n} unit${n > 1 ? "s" : ""}` : "enemies"}!`, dmg: 0, isTroopSkill: true }); }
    break;
  // ── Halvard mechanics ─────────────────────────────────────────────────────
  case "aoe_enemy_buff_strip_frostbite":
    rs.enemyBuffStripped = true; // enemy army loses its positive stat buffs this round
    if (ctx?.isCommander) { // each unit rolls Frostbite | max: enemy units DEF -10
      const n = rollFreeze(rs, ctx, ctx.pickEnemy("all"), eff.frostbiteChance || 0.20);
      if (eff.strippedEnemyDefDown) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.strippedEnemyDefDown, 50);
      roundLog.actions.push({ actor: actorLabel, action: `🌪️ ${skill?.name} — Enemy buffs stripped${n ? ` + ${n} Frostbitten` : ""}!`, dmg: 0, isTroopSkill: true });
    } else {
      if (eff.maxLevelEffect?.strippedEnemyDefDown) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.maxLevelEffect.strippedEnemyDefDown, 50);
      if (Math.random() < (eff.frostbiteChance || 0.20)) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, 2); }
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
    rs.cmdAoe = true;
    if (ctx?.isCommander) { // N Focus hits on every unit; each hit rolls Frostbite on that unit
      const hits = eff.hits || 3, c = eff.frostbiteChancePerHit ?? eff.frostbiteChance ?? 0.25;
      for (let k = 0; k < hits; k++) addSkillHit(rs, ctx, eff.value ?? eff.dmgPct ?? 0.08, { n: "all", stat: "foc", label: skill?.name });
      const n = rollFreeze(rs, ctx, ctx.pickEnemy("all"), 1 - Math.pow(1 - c, hits));
      if (n) roundLog.actions.push({ actor: actorLabel, action: `🌨️ ${skill?.name} — ${n} unit${n > 1 ? "s" : ""} Frostbitten!`, dmg: 0, isTroopSkill: true });
    } else {
      rs.focusDmgBonus += (eff.dmgPct || 0.08) * (eff.hits || 3);
      for (let h = 0; h < (eff.hits || 3); h++) if (Math.random() < (eff.frostbiteChance || 0.25)) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, 2); }
    }
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
    if (ctx?.isCommander) { rs.cmdFocFlat = (rs.cmdFocFlat || 0) + (eff.value ?? eff.focValue ?? 1); rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + (eff.value ?? eff.spdValue ?? 1); } // flat FOC / SPD
    else { rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus || 0) + (eff.focValue || 1.0); rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + (eff.spdValue || 1.0); }
    break;
  // ── Knut mechanics ────────────────────────────────────────────────────────
  case "early_round_dmg_up_enemy_def_down":
    if (round <= (eff.maxRound || 2)) { // allied units DMG +X% | enemies DEF -N
      rs.troopAtkMult *= (1 + (eff.value ?? eff.dmgUp ?? 0.03));
      if (!ctx?.isCommander) rs.cmdMult *= (1 + (eff.dmgUp || 0.03));
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.enemyDefDown||2), 50);
    }
    break;
  case "early_round_dmg_def_up":
    if (round <= (eff.maxRound || 2)) { // allied units DMG +X% | DEF +X% | max: army confusion immune
      rs.troopAtkMult *= (1 + (eff.value ?? eff.dmgUp ?? 0.04));
      rs.troopDefMult *= (1 + (eff.value ?? eff.defUp ?? 0.04));
      if (!ctx?.isCommander) rs.cmdMult *= (1 + (eff.dmgUp || 0.04));
      if (eff.maxLevelEffect?.earlyRoundConfusionImmune) { if (ctx?.isCommander) rs.atkConfusionImmune = true; else rs.invisStunImmune = true; }
    }
    break;
  case "dmg_resist_vs_alignment":
    if (ctx?.isCommander && (eff.alignment === "humans" || eff.alignment === "creatures")) // damage FROM those units only
      (rs.resistFrom || (rs.resistFrom = [])).push({ match: { alignment: eff.alignment }, value: eff.value || 0.015 });
    else if (ctx?.isCommander && eff.alignment === "all_coldborn") // [Allied Coldborn units] DMG taken -X%
      for (const i of ownIdx(ctx, "coldborns")) setSlot(rs, "slotDmgTakenMult", i, 1 - (eff.value || 0.015));
    else rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.015));
    break;
  case "dmg_resist_vs_alignment_branch":
    // Shieldwall / Völva's Shield / Ice Wall: DMG resist vs alignment or faction
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.015));
    break;
    // Coldborn Brotherhood: branch units resist creature alignment
    rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.02));
    break;
  case "branch_flat_hp_bonus":
    rs.branchFlatHpBonus = { branch: eff.branch || "bear_riders", value: eff.value || 8 };
    if (ctx?.isCommander) flatDefHp(rs, ctx, brSpec(eff.branch || "bear_riders"), 0, eff.value || 8); // [Branch units] HP +N (flat)
    break;
  case "physical_damage_perm_def_down":
    addSkillHit(rs, ctx, eff.value || 0.40, { n: 1, prio: prioOf(eff), label: skill?.name });
    if (ctx?.isCommander) { // that unit: DEF -N for the rest of the battle | max: Frostbite (1 rnd)
      const list = ctx.pickEnemy(1, prioOf(eff)), dd = eff.defDown || 3;
      const apply = r => { for (const ti of list) setSlot(r, "unitDefFlatDown", ti, dd, "add"); };
      apply(rs); setBuff(ctx, null, round + 1, 10, apply);
      if (eff.applyFrostbite) freezeUnits(rs, ctx, list, eff.frostbiteDuration || 1);
    } else {
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||3.0), 50);
      if (eff.maxLevelEffect?.applyFrostbite) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft, 1); }
    }
    roundLog.actions.push({ actor: actorLabel, action: `💥 ${skill?.name} — Enemy DEF -${eff.defDown||3} permanently!`, dmg: 0, isTroopSkill: true });
    break;
  // ── Frostbite mechanics ───────────────────────────────────────────────────
  // Frostbite: DMG dealt -40% for 2 rounds
  case "physical_damage_frostbitten_slow":
    addSkillHit(rs, ctx, eff.value || 0.25, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    if (ctx?.isCommander) { // Coldborn version: only if Frostbite is up; Ashen version: guaranteed Slow | max: slowed units DEF -N
      const needFrost = skill?.faction === "coldborns";
      if (!needFrost || rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0) {
        const list = ctx.pickEnemy(targetsOf(eff), prioOf(eff));
        pctSlow(rs, ctx, list, (eff.slowValue || 25) / 100, eff.slowDuration || 2, round);
        roundLog.actions.push({ actor: actorLabel, action: `🧱 ${skill?.name} — ${list.length} unit${list.length > 1 ? "s" : ""} Slowed (-${eff.slowValue||25}% SPD, ${eff.slowDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
      }
      if (eff.maxLevelEffect?.slowedEnemyDefDown) for (const ti of Object.keys(rs.unitSpdDown || {}).map(Number)) setSlot(rs, "unitDefFlatDown", ti, eff.maxLevelEffect.slowedEnemyDefDown, "add");
    } else if (rs.frostbiteApplied) { rs.slowApplied = true; rs.slowValue = eff.slowValue || 25; }
    break;
  case "cmd_dmg_bonus_vs_frostbitten":
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: /^\[CMD &/.test(skill?.desc || "") ? "all" : "cmd", match: { frostbitten: true }, value: eff.value || 0.03 }); // per frostbitten unit
    else if (rs.frostbiteApplied) { rs.cmdMult *= (1 + (eff.value || 0.03)); rs.troopAtkMult *= (1 + (eff.value || 0.03)); }
    break;
  case "cmd_atk_per_round_frostbite_active":
    if (ctx?.isCommander) { if (frozenUnits(ctx).length) rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + (eff.value || 2.0); } // this round, while any enemy unit is frostbitten
    else if (rs.frostbiteApplied) { rs.coldFuryAtkBonus = (rs.coldFuryAtkBonus || 0) + (eff.value || 2.0); rs.cmdMult *= (1 + (eff.value || 2.0) / 100); }
    break;
  case "per_round_atk_stack_spd_lose":
    if (ctx?.isCommander) { // each round: commander ATK +N and SPD -2 (both permanent, so N × round) | max: enemy units DEF -10
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + (eff.value ?? eff.atkPerRound ?? 3) * round;
      rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) - (eff.spdLostPerRound || 2) * round;
      if (eff.maxLevelEffect?.enemyDefDown) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.maxLevelEffect.enemyDefDown, 50);
    } else {
      rs.berserkerRushAtkGain = (rs.berserkerRushAtkGain || 0) + (eff.atkPerRound || 3.0);
      rs.cmdMult *= (1 + (rs.berserkerRushAtkGain / 100));
      if (eff.maxLevelEffect?.enemyDefDown) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + eff.maxLevelEffect.enemyDefDown, 50);
    }
    break;
  case "cmd_atk_stack_on_troop_hit":
    if (ctx?.cs) { // CMD ATK +X% per hit our troops took last round (max stacks)
      const now = ctx.cs.hitsTaken || 0, key = `warScars:${skill?.name}`, prev = ctx.cs.stacks[key] ?? 0;
      ctx.cs.stacks[key] = now;
      rs.cmdMult *= 1 + (eff.value ?? eff.valuePerStack ?? 0.01) * Math.min(eff.maxStacks || 5, now - prev);
    } else {
      rs.warScarsStacksThisRound = (rs.warScarsStacksThisRound || 0) + 1;
      if (rs.warScarsStacksThisRound <= (eff.maxStacks || 5)) rs.cmdMult *= (1 + (eff.valuePerStack || 0.01));
    }
    break;
  case "no_unit_lost_dmg_stun_immune":
    if (ctx?.cs) { // while none of our units has died: CMD DMG +X% + stun immune (max: army DMG taken -Y%); lost for good once one dies
      if (ctx.ownSlotIdx(() => true).length < (ctx.atkSlots || []).length) ctx.cs.throneLost = true;
      if (!ctx.cs.throneLost) {
        rs.cmdMult *= (1 + (eff.value ?? eff.dmgBonus ?? 0.03));
        rs.cmdStunImmune = true;
        if (eff.armyDmgReceiveDown) rs.dmgReduce = Math.min(0.85, rs.dmgReduce + eff.armyDmgReceiveDown);
      }
    } else if (!rs.unitLostThisBattle) { rs.cmdMult *= (1 + (eff.dmgBonus || 0.03)); rs.invisStunImmune = true; }
    break;
  case "frostbite_applied_def_down":
    if (ctx?.isCommander) { // each Frostbite applied: that unit DEF -N for 2 rounds
      for (const a of (ctx.cs.frostApps || [])) if (a.round >= round - (eff.duration || 2) + 1) setSlot(rs, "unitDefFlatDown", a.ti, eff.value ?? eff.defDown ?? 1, "add");
    } else if (rs.frostbiteApplied) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 1.0), 50);
    break;
  case "frostbitten_enemy_foc_dmg_taken_up":
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", foc: true, match: { frostbitten: true }, value: eff.value || 0.05 }); // frostbitten units: Focus DMG taken +X%
    else if (rs.frostbiteApplied) { rs.focusDmgBonus += eff.value || 0.05; rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.05); }
    break;
  case "per_round_frostbite_multi_chance":
    if (ctx?.isCommander) { // each round: N enemy units each roll Frostbite
      const n = rollFreeze(rs, ctx, ctx.pickEnemy(targetsOf(eff), null, true), eff.value ?? eff.chance ?? 0.07);
      if (n) roundLog.actions.push({ actor: actorLabel, action: `❄️ ${skill?.name} — ${n} unit${n > 1 ? "s" : ""} Frostbitten!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < (eff.chance || 0.07)) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = 2; }
    break;
  case "on_hit_frostbite_chance":
    // Raider troop skill — on-hit frostbite proc
    if (Math.random() < (eff.chance || 0.035)) {
      rs.frostbiteApplied   = true;
      rs.frostbiteRoundsLeft = 2;
    }
    break;
  case "vs_all_dmg_up_frostbite_chance":
    rs.cmdAoe = true;
    rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value ?? eff.dmgTakenUp ?? 0.02); // all enemies take +X% this round
    if (ctx?.isCommander) { // each unit rolls Frostbite | max: frostbitten units SPD -10
      const n = rollFreeze(rs, ctx, ctx.pickEnemy("all"), eff.frostbiteChance || 0.20);
      if (eff.frostbitenSpdDown) rs.frostSpdDown = (rs.frostSpdDown || 0) + eff.frostbitenSpdDown;
      if (n) roundLog.actions.push({ actor: actorLabel, action: `🔮 ${skill?.name} — ${n} unit${n > 1 ? "s" : ""} Frostbitten!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < (eff.frostbiteChance || 0.20)) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = 2; }
    break;
  case "focus_burn_dual_frostbite_burn_chance":
    if (ctx?.isCommander) { // N units: X% Focus + X% Burn damage; each rolls Frostbite or Burn | max: CMD confusion immune early rounds
      const v = eff.value || 0.15, list = ctx.pickEnemy(targetsOf(eff), prioOf(eff));
      addSkillHit(rs, ctx, v, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
      addBurnDmg(rs, v, ctx, { n: targetsOf(eff), prio: prioOf(eff), label: `${skill?.name} (burn)` });
      const frost = [], burn = [];
      for (const ti of list) if (Math.random() < (eff.frostbiteOrBurnChance || 0.50)) (Math.random() < 0.5 ? frost : burn).push(ti);
      freezeUnits(rs, ctx, frost); burnUnits(rs, ctx, 0, null, 1, 0.20, { list: burn });
      if (eff.earlyRoundConfusionImmune && round <= (eff.maxRound || 3)) rs.cmdConfusionImmune = true;
    } else {
      rs.focusDmgBonus += (eff.value || 0.15) * 2;
      if (Math.random() < (eff.frostbiteOrBurnChance || 0.50)) { if (Math.random() < 0.50) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = 2; } else applyBurn(rs, 0.20); }
    }
    break;
  case "early_round_dmg_followup_chance":
    if (round <= (eff.maxRound || 3)) { // allied units: DMG +X% and 10% extra-attack chance (expected)
      rs.troopAtkMult *= (1 + (eff.value ?? eff.dmgUp ?? 0.04)) * (1 + (eff.followupChance || 0.10));
      rs.factionFollowupPerRound = (rs.factionFollowupPerRound || 0) + (eff.followupChance || 0.10);
    }
    break;
  case "faction_dmg_resist_vs_alignment":
    if (ctx?.isCommander) (rs.resistFrom || (rs.resistFrom = [])).push({ match: { alignment: eff.alignment || "creatures" }, value: (eff.value || 0.02) * armyShare(ctx, eff.faction || ctx.ownFaction) }); // [Faction units] DMG from <alignment> -X%
    else rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.02));
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
    addSkillHit(rs, ctx, eff.value || 0.40, { n: 1, prio: prioOf(eff), stat: "foc", label: skill?.name });
    if (ctx?.isCommander) { // that unit: Life Drain (2 rnd) + DEF -N for the rest of the battle
      const list = ctx.pickEnemy(1, prioOf(eff)), dd = eff.defDown || 5;
      drainUnits(rs, ctx, list, 2);
      const apply = r => { for (const ti of list) setSlot(r, "unitDefFlatDown", ti, dd, "add"); };
      apply(rs); setBuff(ctx, null, round + 1, 10, apply);
    } else { rs.lifeDrainApplied = true; rs.lifeDrainRoundsLeft = 2; rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||5.0), 50); }
    roundLog.actions.push({ actor: actorLabel, action: `💀 ${skill?.name} — Life Drain (2 rnd) + DEF -${eff.defDown||5} permanently!`, dmg: 0, isTroopSkill: true });
    break;
  case "aoe_life_drain_chance":
  { const c = eff.value ?? eff.chance ?? 0.08;
    if (ctx?.isCommander) { // each enemy unit rolls Life Drain (2 rnd) | max: drained units take +X%
      const n = drainUnits(rs, ctx, ctx.pickEnemy("all").filter(() => Math.random() < c), 2);
      if (eff.lifeDrainEnemyDmgTakenUp) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { drained: true }, value: eff.lifeDrainEnemyDmgTakenUp });
      if (n) roundLog.actions.push({ actor: actorLabel, action: `☠️ ${skill?.name} — ${n} enemy unit${n > 1 ? "s" : ""} Life Drained!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < c) {
      rs.lifeDrainApplied = true; rs.lifeDrainRoundsLeft = 2;
      if (eff.maxLevelEffect?.lifeDrainEnemyDmgTakenUp) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + eff.maxLevelEffect.lifeDrainEnemyDmgTakenUp;
    }
    break; }
  case "focus_damage_life_drain_chance":
    addSkillHit(rs, ctx, eff.value || 0.18, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    { const c = eff.lifeDrainChance || 0.35;
      const n = ctx?.isCommander ? drainUnits(rs, ctx, ctx.pickEnemy(targetsOf(eff), prioOf(eff)).filter(() => Math.random() < c), 2) // each unit hit rolls
        : (Math.random() < c ? drainUnits(rs, ctx, null, 2) : 0);
      if (n) roundLog.actions.push({ actor: actorLabel, action: `🖤 ${skill?.name} — Life Drain applied!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "life_drain_enemy_foc_dmg_taken_up":
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", foc: true, match: { drained: true }, value: eff.value || 0.04 }); // drained units: Focus DMG taken +X%
    else if (rs.lifeDrainApplied) { rs.focusDmgBonus += eff.value || 0.04; rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + (eff.value||0.04); }
    break;
  case "lich_dominion_passive":
    if (ctx?.isCommander) { // CMD FOC +N | allies' Focus damage +X% | drained units take +Y%
      rs.cmdFocFlat = (rs.cmdFocFlat || 0) + (eff.value ?? eff.focUp ?? 2);
      rs.cmdFocDmgUp = (rs.cmdFocDmgUp || 0) + (eff.allyFocDmgUp || 0.015);
      for (const i of ctx.ownSlotIdx(sl => sl.branchDef?.dmgType === "magical")) setSlot(rs, "slotAtkMult", i, 1 + (eff.allyFocDmgUp || 0.015));
      (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { drained: true }, value: eff.lifeDrainEnemyVuln || 0.05 });
    } else {
      rs.focusDmgBonus += eff.allyFocDmgUp || 0.015; rs.troopAtkMult *= (1 + (eff.allyFocDmgUp||0.015));
      if (rs.lifeDrainApplied) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + (eff.lifeDrainEnemyVuln||0.05);
    }
    break;
  case "aoe_focus_damage_vuln":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.12, { n: "all", stat: "foc", label: skill?.name });
    rs.focusVulnOnTarget = (rs.focusVulnOnTarget||0) + (eff.focVuln||0.15);
    if (ctx?.isCommander) for (const ti of ctx.pickEnemy("all")) (ctx.cs.focVuln || (ctx.cs.focVuln = new Map())).set(ti, { v: eff.focVuln || 0.15, round }); // next Focus hit taken +X%
    break;
  case "silence_and_foc_vuln":
    if (ctx?.isCommander) { // enemy commander Silenced (1 rnd) | all enemy units Focus DMG taken +X% this round
      rs.enemySilenced = true;
      (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", foc: true, match: {}, value: eff.value ?? eff.focVuln ?? 0.02 });
      if (eff.maxLevelEffect?.cmdFocBonus) rs.cmdFocFlat = (rs.cmdFocFlat || 0) + eff.maxLevelEffect.cmdFocBonus;
    } else {
      rs.enemySilenced = true;
      rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + (eff.focVuln||0.02);
    }
    roundLog.actions.push({ actor: actorLabel, action: `⚖️ ${skill?.name} — Enemy CMD Silenced + Focus vulnerability!`, dmg: 0, isTroopSkill: true });
    break;
  case "vs_all_foc_dmg_taken_up":
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", foc: true, match: {}, value: eff.value || 0.02 }); // Focus damage only
    else rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + (eff.value||0.02);
    break;
  case "aoe_focus_multi_hit":
    rs.cmdAoe = true;
    for (let k = 0; k < (eff.hits || 3); k++) addSkillHit(rs, ctx, eff.value || 0.10, { n: "all", stat: "foc", label: skill?.name }); // N hits on every unit
    if (ctx?.isCommander && eff.enemyFocDmgTakenUp) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", foc: true, match: {}, value: eff.enemyFocDmgTakenUp });
    else if (eff.maxLevelEffect?.enemyFocDmgTakenUp) rs.enemyFocDmgTakenUp = (rs.enemyFocDmgTakenUp||0) + eff.maxLevelEffect.enemyFocDmgTakenUp;
    break;
  case "aoe_focus_confusion_life_drain":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.10, { n: "all", stat: "foc", label: skill?.name });
    if (ctx?.isCommander) { // each unit rolls Confusion and Life Drain | max: commander normal attacks deal Focus damage
      const cf = confuseUnits(rs, ctx, "all", null, eff.confusionChance || 0.35) || 0;
      const dr = drainUnits(rs, ctx, ctx.pickEnemy("all").filter(() => Math.random() < (eff.lifeDrainChance || 0.25)), 2);
      if (cf || dr) roundLog.actions.push({ actor: actorLabel, action: `🔔 ${skill?.name} — ${cf} confused, ${dr} Life Drained!`, dmg: 0, isTroopSkill: true });
      if (eff.cmdNormalAtkFocBonus) rs.cmdNormalUsesFoc = true;
    } else {
      if (Math.random() < (eff.confusionChance||0.35)) rs.enemyConfused = Math.max(rs.enemyConfused||0, 1);
      if (Math.random() < (eff.lifeDrainChance||0.25)) { rs.lifeDrainApplied=true; rs.lifeDrainRoundsLeft=2; }
    }
    break;
  case "life_drain_applied_def_down":
    if (ctx?.isCommander) { // each enemy unit: DEF -N per Life Drain applied to it (max stacks)
      for (const [ti, n] of Object.entries(ctx.cs.drainApps || {})) setSlot(rs, "unitDefFlatDown", +ti, Math.min(n, eff.maxStacks || 3) * (eff.value ?? eff.defDown ?? 1.5), "add");
    } else if (rs.lifeDrainApplied) {
      const ldStacks = rs.deathTouchedStacks || 0;
      if (ldStacks < (eff.maxStacks||3)) { rs.deathTouchedStacks = ldStacks+1; rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||1.5), 50); }
    }
    break;
  case "life_drain_applied_next_skill_bonus":
    if (ctx?.isCommander) { // each Life Drain applied this round: X% chance the next skill deals +30%
      const n = ctx.cs.drainAppliedNow || 0;
      for (let k = 0; k < n; k++) if (Math.random() < (eff.value ?? eff.chance ?? 0.07)) {
        ctx.cs.pendingSkillBonus = Math.max(ctx.cs.pendingSkillBonus || 0, eff.bonusDmg || 0.30);
        roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill?.name} — Next skill +${Math.round((eff.bonusDmg||0.30)*100)}%!`, dmg: 0, isTroopSkill: true });
        break;
      }
    } else if (rs.lifeDrainApplied && Math.random() < (eff.chance||0.07)) { rs.lifeDrainNextSkillBonus = true; rs.lifeDrainNextSkillBonusPct = eff.bonusDmg || 0.30; }
    break;
  case "death_cavalry_buff_foc_dmg":
    if (ctx?.isCommander) { // [Death Cavalry] DEF +3 | DMG +X% (this round) | [2 enemy units] Focus damage
      const idx = ownIdx(ctx, "death_cavalry"), v = eff.value ?? eff.dmgBonus ?? 0.02;
      for (const i of idx) setSlot(rs, "slotAtkMult", i, 1 + v);
      flatDefHp(rs, ctx, "death_cavalry", eff.defBonus || 3, 0);
      addSkillHit(rs, ctx, eff.focDmg || 0.12, { n: eff.targets || 2, stat: "foc", label: skill?.name });
      if (eff.lifeDrainArmyConfusionImmune && drainedUnits(ctx).length) rs.atkConfusionImmune = true;
    } else {
      rs.troopDefMult *= (1 + (eff.defBonus||3)/100); rs.troopAtkMult *= (1 + (eff.dmgBonus||0.02)); rs.focusDmgBonus += eff.focDmg || 0.12;
    }
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
    if (ctx?.isCommander) { // [Skeleton & Death Cavalry] DMG +X% | DEF +3 | [All enemies] DEF -2 (this round) | max: CMD ATK +15
      const br = ["skeleton_legion", "death_cavalry"], v = eff.value ?? eff.dmgBonus ?? 0.015;
      for (const i of ownBranches(ctx, br)) setSlot(rs, "slotAtkMult", i, 1 + v);
      flatDefHp(rs, ctx, br, eff.defBonus || 3, 0);
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.enemyDefDown||2.0), 50);
      if (eff.maxLevelEffect?.atkBonus) rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + eff.maxLevelEffect.atkBonus;
    } else {
      rs.troopAtkMult *= (1+(eff.dmgBonus||0.015)); rs.troopDefMult *= (1+(eff.defBonus||3)/100);
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.enemyDefDown||2.0), 50);
      if (eff.maxLevelEffect?.atkBonus) rs.cmdMult *= (1+eff.maxLevelEffect.atkBonus/100);
    }
    break;
  case "faction_phys_dmg_reduce":
    if (ctx?.isCommander) for (const i of ownIdx(ctx, eff.faction || ctx.ownFaction)) setSlot(rs, "slotPhysResist", i, eff.value || 0.015, "add"); // physical hits on those units
    else rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value||0.015));
    break;
  case "physical_damage_multi_ally_heal":
    addSkillHit(rs, ctx, eff.value || 0.20, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    rs.healPct += eff.allyHealPct || 0.05; // allied troops recover X%
    break;
  case "aoe_spd_down_confusion_chance":
    if (ctx?.isCommander) { // all enemy units SPD -N (3 rnd) + each rolls Confusion | max: allied units SPD +5
      const list = ctx.pickEnemy("all"), sd = eff.value ?? eff.spdDown ?? 20, dur = eff.spdDuration || 3;
      const slow = r => { for (const ti of list) setSlot(r, "unitSpdDown", ti, sd, "max"); r.slowApplied = true; };
      slow(rs); setBuff(ctx, null, round + 1, round + dur - 1, slow);
      const cf = confuseUnits(rs, ctx, "all", null, eff.confusionChance || 0.30) || 0;
      if (eff.armySpdBonus) { rs.slotSpdBonus = rs.slotSpdBonus || []; for (const i of ownIdx(ctx, null)) rs.slotSpdBonus[i] = (rs.slotSpdBonus[i] || 0) + eff.armySpdBonus; }
      roundLog.actions.push({ actor: actorLabel, action: `⚓ ${skill?.name} — Enemy SPD -${sd} (${dur} rnd)${cf ? `, ${cf} confused` : ""}!`, dmg: 0, isTroopSkill: true });
    } else {
      if (Math.random() < (eff.confusionChance||0.30)) rs.enemyConfused = Math.max(rs.enemyConfused||0, eff.confusionDuration||1);
      if (eff.maxLevelEffect?.armySpdBonus) rs.cmdSpdBonus = (rs.cmdSpdBonus||0) + eff.maxLevelEffect.armySpdBonus;
    }
    break;
  case "per_round_confusion_chance_enemy":
    { const hit = confuseUnits(rs, ctx, "all", null, eff.value ?? eff.chance ?? 0.05); // each enemy unit rolls
      if (hit || (!ctx?.isCommander && rs.enemyConfused)) roundLog.actions.push({ actor: actorLabel, action: `🐌 ${skill?.name} — ${ctx?.isCommander ? `${hit} enemy unit${hit > 1 ? "s" : ""}` : "Enemy"} confused!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "cmd_atk_passive":
    if (ctx?.isCommander) rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + (eff.value || 2.0); // commander ATK +N (flat)
    else rs.cmdMult *= (1+(eff.value||2.0)/100);
    break;
  case "physical_damage_buff_block":
    addSkillHit(rs, ctx, eff.value || 0.50, { n: 1, prio: prioOf(eff), label: skill?.name });
    if (ctx?.isCommander) { // that unit can't have positive buffs (this round + next)
      const list = ctx.pickEnemy(1, prioOf(eff)), add = r => { for (const ti of list) (r.buffBlockUnits || (r.buffBlockUnits = new Set())).add(ti); };
      add(rs); setBuff(ctx, null, round + 1, round + (eff.blockDuration || 2) - 1, add);
    } else rs.enemyBuffStripped = true;
    roundLog.actions.push({ actor: actorLabel, action:`🦴 ${skill?.name} — No positive buffs (${eff.blockDuration||2} rnd)!`, dmg:0, isTroopSkill:true });
    break;
  case "cmd_atk_on_attack_permanent_stack":
    if (ctx?.isCommander) { // +N commander ATK per round the commander has attacked (battle-long, max stacks)
      const st = Math.min(eff.maxStacks || 8, ctx.cs.normalAttacks || 0);
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + st * (eff.value ?? eff.valuePerStack ?? 2);
    } else { const hs=rs.hauntingStacks||0; if (hs<(eff.maxStacks||8)) { rs.hauntingStacks=hs+1; rs.cmdMult*=(1+(eff.valuePerStack||2.0)/100); } }
    break;
  case "aoe_physical_faction_bonus":
    rs.cmdAoe = true;
    if (ctx?.isCommander) addSkillHit(rs, ctx, eff.value || 0.10, { n: "all", label: skill?.name,
      bonusIf: { match: { faction: eff.bonusFaction || "coldborns" }, mult: (eff.bonusDmg || 0.20) / (eff.value || 0.10) } }); // bonus faction units: +Y% more
    else { rs.cmdMult *= (1+(eff.value||0.10)); if (defFaction===(eff.bonusFaction||"coldborns")) rs.cmdMult *= (1+(eff.bonusDmg||0.20)); }
    break;
  case "slowed_enemy_def_down":
    if (ctx?.isCommander) for (const ti of Object.keys(rs.unitSpdDown || {}).map(Number)) setSlot(rs, "unitDefFlatDown", ti, eff.value || 2.0, "add"); // slowed units only
    else if (rs.slowApplied) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.value||2.0), 50);
    break;
  case "cmd_atk_per_round_slowed_active":
    if (ctx?.isCommander) { // +N commander ATK for each round an enemy unit is Slowed (battle-long, max stacks)
      const key = `relentless:${skill?.name}`, st = ctx.cs.stacks[key] || { n: 0, last: 0 };
      if (Object.keys(rs.unitSpdDown || {}).length && st.last !== round && st.n < (eff.maxStacks || 5)) { st.n++; st.last = round; }
      ctx.cs.stacks[key] = st;
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + st.n * (eff.value ?? eff.valuePerStack ?? 1);
    } else if (rs.slowApplied) { const rds=rs.relentlessDeadStacks||0; if (rds<(eff.maxStacks||5)) { rs.relentlessDeadStacks=rds+1; rs.cmdMult*=(1+(eff.valuePerStack||1.0)/100); } }
    break;
  case "multi_hit_aoe_faction_bonus":
    rs.cmdAoe = true;
    if (ctx?.isCommander) { // N hits on every unit; bonus-faction units +Y% per hit | max: each hit +10% more than the last
      for (let k = 0; k < (eff.hits || 4); k++) {
        const pct = (eff.value || 0.06) * Math.pow(1 + (eff.escalatingHitBonus || 0), k);
        addSkillHit(rs, ctx, pct, { n: "all", label: skill?.name, bonusIf: { match: { faction: eff.bonusFaction || "coldborns" }, mult: (eff.bonusDmgPerHit || 0.10) / pct } });
      }
    } else { let tot=0; for (let i=0;i<(eff.hits||4);i++) { let h=eff.value||0.06; if (eff.maxLevelEffect?.escalatingHitBonus) h*=Math.pow(1+eff.maxLevelEffect.escalatingHitBonus,i); if (defFaction===(eff.bonusFaction||"coldborns")) h+=(eff.bonusDmgPerHit||0.10); tot+=h; } rs.cmdMult*=(1+tot); }
    break;
  case "multi_hit_aoe_size_bonus":
    rs.cmdAoe = true;
    if (ctx?.isCommander) for (let k = 0; k < (eff.hits || 3); k++) // N hits on every unit; units of the size +Y% per hit
      addSkillHit(rs, ctx, eff.value || 0.06, { n: "all", label: skill?.name, bonusIf: { match: { size: eff.bonusSize || "large" }, mult: (eff.bonusDmgPerHit || 0.15) / (eff.value || 0.06) } });
    else rs.cmdMult *= (1+(eff.value||0.06)*(eff.hits||3));
    break;
  case "aoe_physical_burn_faction_bonus":
    rs.cmdAoe = true;
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0.10, { n: "all", label: skill?.name, bonusIf: { match: { faction: eff.bonusFaction || "coldborns" }, mult: (eff.bonusDmg || 0.20) / (eff.value || 0.10) } });
      const hit = burnUnits(rs, ctx, "all", null, eff.burnChance || 0.40, 0.20); // each unit rolls Burn
      if (hit) roundLog.actions.push({ actor: actorLabel, action:`🔥 ${skill?.name} — ${hit} unit${hit > 1 ? "s" : ""} Burned!`, dmg:0, isTroopSkill:true });
    } else {
      rs.cmdMult *= (1+(eff.value||0.10)); if (defFaction===(eff.bonusFaction||"coldborns")) rs.cmdMult *= (1+(eff.bonusDmg||0.20));
      if (Math.random() < (eff.burnChance||0.40)) applyBurn(rs, 0.20);
    }
    break;
  case "aoe_physical_burn_chance":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.08, { n: "all", label: skill?.name });
    { const hit = burnUnits(rs, ctx, "all", null, eff.burnChance || 0.25, 0.20); // each unit rolls Burn
      if (hit || (!ctx?.isCommander && rs.burnApplied)) roundLog.actions.push({ actor: actorLabel, action:`💢 ${skill?.name} — Burn!`, dmg:0, isTroopSkill:true }); }
    break;
  case "physical_damage_poison_dot":
    addSkillHit(rs, ctx, eff.value || 0.20, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    addPoison(rs, ctx, eff.poisonDotPct || 0.10, eff.poisonDuration || 2, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name }); // on the units hit
    break;
  case "aoe_physical_poison_chance":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.08, { n: "all", label: skill?.name });
    if (ctx?.isCommander) { // each unit rolls a Poison DoT
      const list = ctx.pickEnemy("all").filter(() => Math.random() < (eff.poisonChance || 0.20));
      for (const ti of list) addPoison(rs, ctx, 0.10, eff.poisonDuration || 2, { n: 1, ti, label: skill?.name });
    } else if (Math.random() < (eff.poisonChance||0.20)) rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, 0.10);
    break;
  case "physical_damage_burn_slow_single":
    addSkillHit(rs, ctx, eff.value || 0.40, { n: 1, prio: prioOf(eff), label: skill?.name });
    if (ctx?.isCommander) { // that unit: Burn + Slow (-25% SPD, 2 rnd) | max: burned units take +X%
      const list = ctx.pickEnemy(1, prioOf(eff));
      burnUnits(rs, ctx, 0, null, 1, 0.20, { list });
      pctSlow(rs, ctx, list, (eff.slowValue || 25) / 100, eff.slowDuration || 2, round);
      if (eff.burnedEnemyDmgTakenUp) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { burned: true }, value: eff.burnedEnemyDmgTakenUp });
    } else {
      applyBurn(rs, 0.20); rs.slowApplied = true; rs.slowValue = eff.slowValue || 25;
      if (eff.maxLevelEffect?.burnedEnemyDmgTakenUp) rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp||0) + eff.maxLevelEffect.burnedEnemyDmgTakenUp;
    }
    roundLog.actions.push({ actor: actorLabel, action:`👁️ ${skill?.name} — Burn + Slow!`, dmg:0, isTroopSkill:true });
    break;
  case "cmd_normal_atk_aoe_chance":
    if (Math.random() < (eff.value ?? eff.chance ?? 0.10)) { // this round's normal attack hits every enemy unit
      if (ctx?.isCommander) rs.normalHitsAll = true; else rs.cmdAoe = true;
      roundLog.actions.push({ actor: actorLabel, action:`⚔️ ${skill?.name} — Normal attack hits all!`, dmg:0, isTroopSkill:true });
    }
    break;
  case "per_round_poison_chance_enemy":
    if (ctx?.isCommander) { // each enemy unit rolls a Poison DoT (2 rnd)
      const list = ctx.pickEnemy("all").filter(() => Math.random() < (eff.value ?? eff.chance ?? 0.05));
      for (const ti of list) addPoison(rs, ctx, 0.10, 2, { n: 1, ti, label: skill?.name });
      if (list.length) roundLog.actions.push({ actor: actorLabel, action:`💀 ${skill?.name} — ${list.length} unit${list.length > 1 ? "s" : ""} Poisoned!`, dmg:0, isTroopSkill:true });
    } else if (Math.random() < (eff.chance||0.05)) rs.pendingVenomDmg = Math.max(rs.pendingVenomDmg, 0.10);
    break;
  case "heal_all_branch_def_up":
    rs.healPct += eff.value ?? eff.healPct ?? 0.10;
    if (ctx?.isCommander) { // [Branch units] DEF +N (flat) this round and next
      const up = r => flatDefHp(r, ctx, eff.branch || "skeleton_legion", eff.defBonus || 3, 0);
      up(rs); setBuff(ctx, null, round + 1, round + 1, up);
    } else rs.troopDefMult *= (1+(eff.defBonus||3)/100);
    break;
  case "heal_all_branch_dmg_up":
    rs.healPct += eff.value ?? eff.healPct ?? 0.08;
    if (ctx?.isCommander) { // [Branch units] DMG +X% this round and next
      const idx = ownIdx(ctx, eff.branch || "mummies"), up = r => { for (const i of idx) setSlot(r, "slotAtkMult", i, 1 + (eff.dmgBonus || 0.03)); };
      up(rs); setBuff(ctx, null, round + 1, round + 1, up);
    } else rs.troopAtkMult *= (1+(eff.dmgBonus||0.03));
    break;
  case "multi_branch_phys_reduce_hp_def":
    if (ctx?.isCommander) { // [Branches] physical DMG taken -X% | HP +N | DEF +N (flat)
      for (const i of ownBranches(ctx, eff.branches || ["skeleton_legion", "mummies"])) setSlot(rs, "slotPhysResist", i, eff.value ?? eff.physReduce ?? 0.02, "add");
      flatDefHp(rs, ctx, eff.branches || ["skeleton_legion", "mummies"], eff.defBonus || 2, eff.hpBonus || 5);
    } else { rs.dmgReduce = Math.min(0.85, rs.dmgReduce+(eff.physReduce||0.02)); rs.troopDefMult *= (1+(eff.defBonus||2)/100); }
    break;
  case "multi_branch_dmg_bonus":
    if (ctx?.isCommander) for (const i of ownBranches(ctx, eff.branches || [])) setSlot(rs, "slotAtkMult", i, 1 + (eff.value || 0.015)); // those branches only
    else rs.troopAtkMult *= (1+(eff.value||0.015));
    break;
  case "mordwyn_command_passive":
    if (ctx?.isCommander) { // [Skeletons] DMG +X% | [Mummies] DMG taken -X% | [All] heal Y% per round
      const v = eff.value ?? eff.skeletonDmgUp ?? 0.02;
      for (const i of ownIdx(ctx, "skeleton_legion")) setSlot(rs, "slotAtkMult", i, 1 + v);
      for (const i of ownIdx(ctx, "mummies")) setSlot(rs, "slotDmgTakenMult", i, 1 - (eff.value ?? eff.mummyDmgRecDown ?? 0.02));
    } else { rs.troopAtkMult *= (1+(eff.skeletonDmgUp||0.02)); rs.dmgReduce = Math.min(0.85, rs.dmgReduce+(eff.mummyDmgRecDown||0.02)); }
    rs.healPct += eff.healPerRound || 0.05;
    break;
  case "early_round_dmg_received_down":
    if (round <= (eff.maxRound||2)) rs.dmgReduce = Math.min(0.85, rs.dmgReduce+(eff.value||0.04));
    break;
  case "cmd_triple_stat_passive":
  { const v = eff.value ?? eff.atkValue ?? 1;
    if (ctx?.isCommander) { rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + v; rs.cmdFocFlat = (rs.cmdFocFlat || 0) + v; rs.cmdSpdBonus = (rs.cmdSpdBonus || 0) + v; } // flat ATK / FOC / SPD
    else { rs.cmdMult *= (1+(eff.atkValue||1.0)/100); rs.cmdSpdBonus = (rs.cmdSpdBonus||0)+(eff.spdValue||1.0); }
    break; }
  case "physical_damage_slow_chance":
    addSkillHit(rs, ctx, eff.value || 0.30, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    if (ctx?.isCommander) { // each unit hit rolls Slow (-X% SPD, N rounds)
      const list = ctx.pickEnemy(targetsOf(eff), prioOf(eff)).filter(() => Math.random() < (eff.slowChance || 0.40));
      pctSlow(rs, ctx, list, (eff.slowValue || 25) / 100, eff.slowDuration || 2, round);
      if (list.length) roundLog.actions.push({ actor: actorLabel, action: `💢 ${skill?.name} — ${list.length} unit${list.length > 1 ? "s" : ""} Slowed (-${eff.slowValue||25}% SPD, ${eff.slowDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < (eff.slowChance || 0.40)) { rs.slowApplied = true; rs.slowValue = eff.slowValue || 25; }
    break;
  case "poison_applied_def_down":
    if (ctx?.isCommander) for (const ti of ctx.dotUnits("venom")) setSlot(rs, "unitDefFlatDown", ti, eff.value ?? eff.defDown ?? 2, "add"); // poisoned units (Poison lasts ~2 rounds)
    else if (rs.pendingVenomDmg > 0) rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown||2.0), 50);
    break;
  case "cmd_stat_bonus":
    // CMD SPD (+ ATK, + ATK if all-Mounted) passive (Fastest in the Pack/Tribe, Power of Alpha)
    rs.cmdSpdBonus += eff.value ?? eff.spdPerLevel ?? 1.0;
    if (ctx?.isCommander && eff.atkPerLevel) {
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + (eff.value ?? eff.atkPerLevel);
      if (eff.allMountedAtkBonus && armyAll(ctx, "mounted")) rs.cmdAtkFlat += eff.allMountedAtkBonus;
    }
    break;
  case "confusion_dmg_up":
  { // Confuse 2 enemy units (each rolls… guaranteed here) + our DMG +X% (1 rnd)
    const up = eff.value ?? eff.dmgUp ?? 0.02;
    if (ctx?.isCommander) confuseUnits(rs, ctx, targetsOf(eff), prioOf(eff), 1);
    else rs.enemyConfused = Math.max(rs.enemyConfused || 0, eff.duration || 1);
    rs.troopAtkMult *= (1 + up);
    rs.cmdMult      *= (1 + up);
    roundLog.actions.push({ actor: actorLabel, action: `🦇 ${skill?.name||"Vampire's Thrall"} — ${targetsOf(eff)} enemy units Confused + DMG +${Math.round(up*100)}%!`, dmg: 0, isTroopSkill: true });
    break; }
  case "debuff_chance_reduction":
    // Reduce chance of debuffs landing on the commander (Around the Block) — rolled in commanderAct
    rs.debuffChanceReduction = (rs.debuffChanceReduction || 0) + (eff.value || 0.07);
    break;
  case "dmg_bonus_vs_faction":
    // [2 Friendly Units] DMG +X% vs <faction/alignment> units → per unit hit; "2 units" = share of the army
    rs.dmgBonusVsFactionAll += eff.value || 0.01;
    if (ctx?.isCommander) addVsTarget(rs, "all", eff.faction, (eff.value || 0.01) * Math.min(1, 2 / Math.max(1, ctx.atkSlots?.length || 1)));
    else { rs.troopAtkMult *= (1 + (eff.value || 0.01)); rs.cmdMult *= (1 + (eff.value || 0.01)); }
    break;
  case "focus_damage_invisibility":
    // 1 enemy unit X% Focus DMG | 2 friendly Night Creature units Invisible (30% evade) this round
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value ?? eff.focusDmg ?? 0.20, { n: 1, stat: "foc", label: skill?.name });
      const inv = ownIdx(ctx, "nightcreatures").slice(0, eff.invisUnits || 2);
      rs.invisibleSlots = new Set([...(rs.invisibleSlots || []), ...inv]); rs.invisEvade = eff.evadeChance || 0.30;
      if (eff.stunImmunityWhileInvis) rs.invisStunImmune = true;
    } else { rs.focusDmgBonus += eff.focusDmg || 0.20; rs.invisibleUnits = Math.max(rs.invisibleUnits, eff.invisUnits || 2); }
    roundLog.actions.push({ actor: actorLabel, action: `🌑 ${skill?.name||"Invisible Enemy"} — ${eff.invisUnits||2} units Invisible (${Math.round((eff.evadeChance||0.30)*100)}% evade)!`, dmg: 0, isTroopSkill: true });
    break;
  case "focus_damage_stun":
  { // [2 Enemy Units] X% Focus DMG (SPD mod) + chance to Stun each
    const n = targetsOf(eff);
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0.15, { n, stat: "foc", useStat: "spd", label: skill?.name });
      const hit = stunUnits(rs, ctx, n, prioOf(eff), eff.stunChance || 0.35);
      if (hit) roundLog.actions.push({ actor: actorLabel, action: `💨 ${skill?.name} — ${hit} enemy unit${hit>1?"s":""} Stunned!`, dmg: 0, isTroopSkill: true });
    } else {
      const spdScale = Math.max(1, (atkCmdSpd || 60) / 60);
      rs.focusDmgBonus += (eff.value || 0.15) * spdScale;
      if (Math.random() < (eff.stunChance || 0.35)) rs.enemyStunned = Math.max(rs.enemyStunned || 0, eff.duration || 1);
    }
    break; }
  case "troop_def_bonus_vs_branch":
    // [Branch units] DEF +N (flat)
    rs.branchFlatDefBonus = { branch: eff.branch, value: eff.value || 1.5 };
    rs.troopDefMult *= ctx?.isCommander
      ? 1 + ((eff.value || 1.5) / armyAvg(ctx, eff.branch, "def", 20)) * armyShare(ctx, eff.branch)
      : 1 + (eff.value || 1.5) / 100;
    break;
  case "war_general":
    // Commander FOC +N | allied Melee units DMG +X%
    if (ctx?.isCommander) {
      rs.cmdFocFlat = (rs.cmdFocFlat || 0) + (eff.value ?? eff.focusBonus ?? 1);
      for (const i of ownIdx(ctx, null).filter(i => ctx.atkSlots[i]?.branchDef?.role === "melee")) setSlot(rs, "slotAtkMult", i, 1 + (eff.meleeDmgUp || 0.01) * (eff._lvlMul || 1));
    } else { rs.focusDmgBonus += (eff.focusBonus || 1.0) / 100; rs.troopAtkMult *= (1 + (eff.meleeDmgUp || 0.01)); }
    break;
  case "cmd_foc_passive":
    rs.cmdFocPassiveBonus = (rs.cmdFocPassiveBonus || 0) + (eff.value || 2.0);
    if (ctx?.isCommander) rs.cmdFocFlat = (rs.cmdFocFlat || 0) + (eff.value || 2.0); // commander FOC +N
    break;
  case "multi_confusion_def_down":
    if (ctx?.isCommander) { // [N units] Confusion (guaranteed) + DEF -N on those units this round
      const dd = eff.value ?? eff.defDown ?? 1, list = ctx.pickEnemy(targetsOf(eff), prioOf(eff));
      confuseUnits(rs, ctx, targetsOf(eff), prioOf(eff), 1);
      for (const ti of list) setSlot(rs, "unitDefFlatDown", ti, dd, "add");
      roundLog.actions.push({ actor: actorLabel, action: `🌀 ${skill?.name} — ${list.length} unit${list.length > 1 ? "s" : ""} Confused + DEF -${dd}!`, dmg: 0, isTroopSkill: true });
    } else {
      rs.enemyConfused = Math.max(rs.enemyConfused || 0, eff.confusionDuration || 1);
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 1.0), 50);
    }
    break;
  case "aoe_focus_stun_chance":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.15, { n: "all", stat: "foc", label: skill?.name });
    { const hit = stunUnits(rs, ctx, "all", null, eff.stunChance || 0.35); // each unit rolls
      if (hit || (!ctx?.isCommander && rs.enemyStunned)) roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill?.name} — ${ctx?.isCommander ? `${hit} enemy unit${hit > 1 ? "s" : ""}` : "Enemies"} stunned!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "foc_threshold_bonuses":
  { // FOC-gated army bonuses (checked against the commander's FOC this round)
    const curFoc = (ctx?.cmdFocStat ?? cmdFocStat) + (rs.cmdFocFlat || 0) + (eff.maxLevelEffect?.cmdFocBonus || 0);
    const val = eff.value || 0.01;
    if (curFoc >= (eff.tier1Foc || 210)) { rs.troopAtkMult *= (1 + val); if (!ctx?.isCommander) rs.cmdMult *= (1 + val); }
    if (curFoc >= (eff.tier2Foc || 240)) rs.dmgReduce = Math.min(0.85, rs.dmgReduce + val);
    if (curFoc >= (eff.tier3Foc || 275)) { if (ctx?.isCommander) rs.unitStunImmuneAll = true; else rs.invisStunImmune = true; }
    break; }
  case "focus_damage_slow_chance":
    addSkillHit(rs, ctx, eff.value || 0.10, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    if (ctx?.isCommander) { // each unit hit rolls Slow (-X% SPD, N rounds) | max: slowed units take +Y%
      const list = ctx.pickEnemy(targetsOf(eff), prioOf(eff)).filter(() => Math.random() < (eff.slowChance || 0.60));
      const pct = (eff.slowValue || 25) / 100, dur = eff.slowDuration || 2;
      const slow = r => { for (const ti of list) setSlot(r, "unitSpdDown", ti, Math.round((ctx.defSlotSpd(ti) || 60) * pct), "max"); if (list.length) r.slowApplied = true; };
      slow(rs); setBuff(ctx, null, round + 1, round + dur - 1, slow);
      if (eff.maxLevelEffect?.slowedDmgTakenUp) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { slowed: true }, value: eff.maxLevelEffect.slowedDmgTakenUp });
      if (list.length) roundLog.actions.push({ actor: actorLabel, action: `⏳ ${skill?.name} — ${list.length} enemy unit${list.length > 1 ? "s" : ""} Slowed (-${eff.slowValue || 25}% SPD, ${dur} rnd)!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < (eff.slowChance || 0.60)) { rs.slowApplied = true; rs.slowValue = eff.slowValue || 25; }
    break;
  case "cmd_confusion_slowed_dmg_bonus":
    rs.dmgVsSlowed = (rs.dmgVsSlowed || 0) + (eff.value ?? eff.dmgVsSlowed ?? 0.01);
    if (ctx?.isCommander) { // enemy commander Confused | allies DMG +X% vs slowed units (rest of the battle)
      confuseEnemyCmd(rs, ctx);
      const v = eff.value ?? eff.dmgVsSlowed ?? 0.01, add = r => (r.vsTarget || (r.vsTarget = [])).push({ who: "all", match: { slowed: true }, value: v });
      add(rs); setBuff(ctx, `vsSlowed:${skill?.name}`, round + 1, 10, add);
    } else {
      rs.enemyConfused = Math.max(rs.enemyConfused || 0, 1);
      if (rs.slowApplied) rs.troopAtkMult *= (1 + (eff.dmgVsSlowed || 0.01));
    }
    roundLog.actions.push({ actor: actorLabel, action: `🧠 ${skill?.name} — Enemy CMD Confused!`, dmg: 0, isTroopSkill: true });
    break;
  case "burn_dmg_received_reduce":
    rs.burnDmgReceiveReduce = (rs.burnDmgReceiveReduce || 0) + (eff.value || 0.07);
    if (ctx?.isCommander) rs.burnDmgResist = Math.min(0.9, (rs.burnDmgResist || 0) + (eff.value || 0.07)); // Burn-type hits on our units
    else rs.dmgReduce = Math.min(0.85, rs.dmgReduce + (eff.value || 0.07) * 0.5);
    break;
  case "escalating_enemy_dmg_taken":
    if (ctx?.isCommander) rs.escalate = { v: eff.value ?? eff.valuePerInstance ?? 0.015, n: eff.instances || 5 }; // each enemy unit: +X% per hit it has taken (first N)
    else {
      if (!rs.escalatingEnemyDmgTaken) rs.escalatingEnemyDmgTaken = { instances: eff.instances || 5, valuePerInstance: eff.valuePerInstance || 0.015, applied: 0 };
      if (rs.escalatingEnemyDmgTaken.applied < rs.escalatingEnemyDmgTaken.instances) {
        rs.escalatingEnemyDmgTaken.applied++;
        rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + rs.escalatingEnemyDmgTaken.valuePerInstance;
      }
    }
    break;
  case "army_evasion_per_round_chance":
    rs.armyEvasionPerRoundChance = (rs.armyEvasionPerRoundChance || 0) + (eff.value ?? eff.chance ?? 0.02);
    if (ctx?.isCommander) { // each allied unit rolls: success = it evades the first hit it takes this round
      for (const i of ownIdx(ctx, null)) if (Math.random() < (eff.value ?? eff.chance ?? 0.02)) (rs.slotEvadeNext || (rs.slotEvadeNext = new Set())).add(i);
    } else if (Math.random() < rs.armyEvasionPerRoundChance) rs.invisibleUnits = Math.max(rs.invisibleUnits, 2);
    break;
  // ── Ryn mechanics ─────────────────────────────────────────────────────────
  case "aoe_burn_damage_chance":
    rs.cmdAoe = true;
    addBurnDmg(rs, eff.value || 0.10, ctx, { n: "all", label: skill?.name });
    { const hit = burnUnits(rs, ctx, "all", null, eff.burnChance || 0.40, 0.20); // each unit rolls Burn
      if (hit || (!ctx?.isCommander && rs.burnApplied)) roundLog.actions.push({ actor: actorLabel, action: `🔥 ${skill?.name} — ${ctx?.isCommander ? `${hit} enemy unit${hit > 1 ? "s" : ""}` : "Enemies"} Burned!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "branch_dmg_bonus_vs_status":
    rs.branchDmgBonusVsStatus = { branch: eff.branch, status: eff.status, value: eff.value || 0.02 };
    if (ctx?.isCommander) { // [Branch units] DMG +X% vs units with the status (share of the army those units make up)
      const key = { burn: "burned", poison: "poisoned", slow: "slowed", stun: "stunned" }[eff.status];
      if (key) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "troops", match: { [key]: true }, value: (eff.value || 0.02) * armyShare(ctx, brSpec(eff.branch)) });
    } else {
      if (rs.burnApplied && eff.status === "burn") rs.troopAtkMult *= (1 + (eff.value || 0.02));
      if (rs.pendingVenomDmg > 0 && eff.status === "poison") rs.troopAtkMult *= (1 + (eff.value || 0.02));
    }
    break;
  case "focus_poison_highest_def":
    addSkillHit(rs, ctx, eff.value || 0.20, { n: 1, prio: "highestDef", stat: "foc", label: skill?.name });
    if (Math.random() < (eff.poisonChance || 0.45)) { // Poison DoT on that unit
      addPoison(rs, ctx, eff.poisonDotPct || 0.10, eff.poisonDuration || 2, { n: 1, prio: "highestDef", label: skill?.name });
      roundLog.actions.push({ actor: actorLabel, action: `☠️ ${skill?.name} — Poison DoT applied!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "enemy_status_def_down":
  { rs.enemyStatusDefDown = { status: eff.status || "poison", defDown: eff.value ?? eff.defDown ?? 2.0 };
    const list = ctx?.isCommander ? enemyUnitsWith(rs, ctx, eff.status || "poison") : null;
    if (list) for (const ti of list) setSlot(rs, "unitDefFlatDown", ti, eff.value ?? eff.defDown ?? 2.0, "add"); // those units only
    else if ((eff.status === "poison" && rs.pendingVenomDmg > 0) || (eff.status === "burn" && rs.burnApplied) || (eff.status === "frostbite" && (rs.frostbiteApplied || rs.frostbiteRoundsLeft > 0)))
      rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.value ?? eff.defDown ?? 2.0), 50);
    break; }
  case "focus_damage_multi_stun":
    addSkillHit(rs, ctx, eff.value || 0.20, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    { const hit = stunUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.stunChance || 0.30); // each unit hit rolls
      if (hit || (!ctx?.isCommander && rs.enemyStunned)) roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill?.name} — ${ctx?.isCommander ? `${hit} enemy unit${hit > 1 ? "s" : ""}` : "Enemy"} stunned!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "aoe_focus_strip_debuffs":
    rs.cmdAoe = true; rs.gameOverActive = true;
    if (ctx?.isCommander) { // every enemy unit: X% Focus + 100% per debuff we strip from THAT unit
      const b = eff.bonusPerDebuff || 1.00;
      let total = 0;
      for (const ti of ctx.pickEnemy("all")) {
        let n = 0;
        for (const set of [rs.stunnedUnits, rs.confusedUnits, rs.blindedUnits]) if (set?.delete(ti)) n++;
        if (rs.burnedUnits?.delete(ti)) n++;
        for (const f of ["unitDefFlatDown", "unitSpdDown"]) if (rs[f]?.[ti]) { delete rs[f][ti]; n++; }
        n += ctx.clearDots(ti);
        total += n;
        addSkillHit(rs, ctx, (eff.value || 0.10) + n * b, { ti, stat: "foc", label: skill?.name, onKillBonus: eff.onKillNextSkillBonus || 0 });
      }
      if (total) roundLog.actions.push({ actor: actorLabel, action: `💥 ${skill?.name} — ${total} debuff${total > 1 ? "s" : ""} stripped → +${Math.round(b * 100)}% Focus DMG each!`, dmg: 0, isTroopSkill: true });
    } else {
      rs.focusDmgBonus += eff.value || 0.10;
      let debuffCount = 0;
      if (rs.burnApplied)        { debuffCount++; rs.burnApplied = false; rs.burnDmgPenalty = 0; rs.enemyAtkReduce = Math.max(0, rs.enemyAtkReduce - 0.20); }
      if (rs.pendingVenomDmg>0)  { debuffCount++; rs.pendingVenomDmg = 0; }
      if (rs.enemyStunned>0)     { debuffCount++; rs.enemyStunned = 0; }
      if (rs.enemyConfused>0)    { debuffCount++; rs.enemyConfused = 0; }
      if (debuffCount > 0) rs.focusDmgBonus += debuffCount * (eff.bonusPerDebuff || 1.00);
    }
    break;
  case "multi_flat_def_down":
    if (ctx?.isCommander) { // [N units] DEF -N this round (owner: 1 round)
      const dd = eff.value ?? eff.defDown ?? 5, list = ctx.pickEnemy(targetsOf(eff), prioOf(eff));
      for (const ti of list) setSlot(rs, "unitDefFlatDown", ti, dd, "add");
      roundLog.actions.push({ actor: actorLabel, action: `😤 ${skill?.name} — ${list.length} unit${list.length > 1 ? "s" : ""} DEF -${dd}!`, dmg: 0, isTroopSkill: true });
    } else rs.enemyDefFlatDown = Math.min((rs.enemyDefFlatDown||0) + (eff.defDown || 5.0), 50);
    break;
  // ── Vex mechanics ─────────────────────────────────────────────────────────
  case "focus_damage_multi_vuln":
    addSkillHit(rs, ctx, eff.value || 0.12, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    rs.focusVulnOnTarget = (rs.focusVulnOnTarget || 0) + (eff.focVuln || 0.10);
    if (ctx?.isCommander) for (const ti of ctx.pickEnemy(targetsOf(eff), prioOf(eff))) (ctx.cs.focVuln || (ctx.cs.focVuln = new Map())).set(ti, { v: eff.focVuln || 0.10, round }); // their next Focus hit taken +X%
    break;
  case "branch_followup_early_rounds":
    if (round <= (eff.maxRound || 3)) {
      rs.factionFollowupPerRound = (rs.factionFollowupPerRound || 0) + (eff.value ?? eff.chance ?? 0.09);
      if (ctx?.isCommander) for (const i of ownIdx(ctx, brSpec(eff.branch))) setSlot(rs, "slotAtkMult", i, 1 + (eff.value ?? eff.chance ?? 0.09)); // expected extra attack
    }
    break;
  case "aoe_focus_min_dmg_chance":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.06, { n: "all", stat: "foc", label: skill?.name });
    if (ctx?.isCommander) { // each unit rolls: deals minimum damage next round
      const list = ctx.pickEnemy("all").filter(() => Math.random() < (eff.minDmgChance ?? 0.40));
      if (list.length) {
        setBuff(ctx, null, round + 1, round + 1, r => { for (const ti of list) (r.minDmgUnits || (r.minDmgUnits = new Set())).add(ti); });
        roundLog.actions.push({ actor: actorLabel, action: `🌪️ ${skill?.name} — ${list.length} enemy unit${list.length > 1 ? "s" : ""} deal minimum damage next round!`, dmg: 0, isTroopSkill: true });
      }
    } else if (Math.random() < (eff.minDmgChance ?? 0.40)) rs.enemyForcedMinDmg = true;
    break;
  case "focus_burn_damage_single":
    addBurnDmg(rs, eff.value || 0.30, ctx, { n: 1, prio: prioOf(eff), label: skill?.name });
    { const hit = burnUnits(rs, ctx, 1, prioOf(eff), eff.burnChance || 0.35, 0.20);
      if (hit || (!ctx?.isCommander && rs.burnApplied)) roundLog.actions.push({ actor: actorLabel, action: `🏹 ${skill?.name} — Burn applied!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "cmd_focus_dmg_bonus":
    if (ctx?.isCommander) rs.cmdFocDmgUp = (rs.cmdFocDmgUp || 0) + (eff.value || 0.02); // commander Focus damage +X%
    else { rs.focusDmgBonus += eff.value || 0.02; rs.cmdMult *= (1 + (eff.value || 0.02)); }
    break;
  case "focus_damage_poison_dot":
    addSkillHit(rs, ctx, eff.value || 0.10, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    addPoison(rs, ctx, eff.poisonDotPct || 0.10, eff.poisonDuration || 2, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    break;
  case "focus_damage_heal_block":
    addSkillHit(rs, ctx, eff.value || 0.10, { n: targetsOf(eff), prio: prioOf(eff), stat: "foc", label: skill?.name });
    rs.blockHeal = Math.max(rs.blockHeal || 0, eff.healBlockDuration || 2);
    break;
  case "enemy_alignment_vulnerability":
    rs.enemyAlignmentVuln = { alignment: eff.alignment || "creatures", value: eff.value || 0.04 };
    if (ctx?.isCommander) addVsTarget(rs, "all", eff.alignment || "creatures", eff.value || 0.04); // those units take +X%
    else rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.04);
    break;
  case "branch_dual_stat_passive":
  { const v = eff.value ?? eff.dmgUp ?? 0.01, d = eff.value ?? eff.dmgReceiveDown ?? 0.01;
    rs.branchDualStatPassive = { branch: eff.branch || "golems", dmgUp: v, dmgReceiveDown: d };
    if (ctx?.isCommander) { // [Branch units] DMG +X% | DMG received -X% | max: Burn/Poison immune
      for (const i of ownIdx(ctx, brSpec(eff.branch || "golems"))) {
        setSlot(rs, "slotAtkMult", i, 1 + v);
        setSlot(rs, "slotDmgTakenMult", i, 1 - d);
        if (eff.golemBurnPoisonImmune) {
          (rs.slotVenomImmune || (rs.slotVenomImmune = new Set())).add(i);
          (rs.slotBurnImmune || (rs.slotBurnImmune = new Set())).add(i);
        }
      }
    } else { rs.troopAtkMult *= (1 + v); rs.dmgReduce = Math.min(0.85, rs.dmgReduce + d); }
    if (eff.maxLevelEffect?.golemBurnPoisonImmune) rs.golemBurnPoisonImmune = true;
    break; }
  // ── Mira mechanics ────────────────────────────────────────────────────────
  case "enemy_role_vulnerability":
    rs.enemyRoleVuln = { role: eff.role || "melee", value: eff.value || 0.03 };
    if (ctx?.isCommander) (rs.vsTarget || (rs.vsTarget = [])).push({ who: "all", match: { role: eff.role || "melee" }, value: eff.value || 0.03 }); // those units take +X%
    else rs.enemyDmgTakenUp = (rs.enemyDmgTakenUp || 0) + (eff.value || 0.03);
    break;
  case "physical_damage_multi_faction_bonus":
    rs.physDmgMultiFactionBonus = { prioritise: eff.prioritise || "dragons", bonusFaction: eff.bonusFaction || "dragons", bonusDmg: eff.bonusDmg || 0.60 };
    if (ctx?.isCommander) addSkillHit(rs, ctx, eff.value || 0.20, { n: targetsOf(eff), prio: eff.prioritise || "dragons", label: skill?.name,
      bonusIf: { match: { faction: eff.bonusFaction || "dragons" }, mult: eff.bonusDmg || 0.60 } }); // bonus-faction units take +Y%
    else {
      rs.cmdMult *= (1 + (eff.value || 0.20));
      if (primaryDefSlot?.branch?.faction === (eff.bonusFaction || "dragons")) rs.cmdMult *= (1 + (eff.bonusDmg || 0.60));
    }
    break;
  case "late_round_skill_dmg_bonus":
    if (round >= (eff.minRound || 5)) {
      rs.skillDmgBonus += eff.value || 0.03;
      if (eff.maxLevelEffect?.lateRoundConfusionImmune) { if (ctx?.isCommander) rs.cmdConfusionImmune = true; else rs.invisStunImmune = true; }
    }
    break;
  case "early_round_def_up_dmg_down":
    if (round <= (eff.maxRound || 3)) {
      rs.troopDefMult *= (1 + (eff.value ?? eff.defUp ?? 0.09));
      rs.troopAtkMult *= Math.max(0, 1 - (eff.dmgDown ?? 0.09)); // DMG down doesn't scale with level (owner)
    }
    break;
  case "atk_threshold_bonuses":
  { // ATK-gated commander bonuses (checked against the commander's ATK this round)
    const curAtk = (ctx?.cmdAtkStat ?? cmdAtkStat) + (rs.cmdAtkFlat || 0) + (eff.maxLevelEffect?.atkBonus || 0);
    if (curAtk >= (eff.tier1Atk || 200)) { rs.ignoreDefPct = (rs.ignoreDefPct || 0) + (eff.value ?? eff.tier1DefIgnore ?? 0.01); if (ctx?.isCommander) rs.normalIgnoreDef = Math.min(0.9, (rs.normalIgnoreDef || 0) + (eff.value ?? eff.tier1DefIgnore ?? 0.01)); }
    if (curAtk >= (eff.tier2Atk || 225)) {
      rs.cmdBonusAttackChance += (eff.tier2SecondAtkChance || 0.03);
      if (ctx?.isCommander && Math.random() < (eff.tier2SecondAtkChance || 0.03)) rs.extraNormalAttacks = (rs.extraNormalAttacks || 0) + 1;
    }
    if (curAtk >= (eff.tier3Atk || 250) && Math.random() < (eff.tier3UnblockChance || 0.06)) { if (ctx?.isCommander) rs.cmdPursuit = true; else rs.pursuitActive = true; }
    break; }
  case "all_small_army_cmd_bonus":
    if (ctx?.isCommander ? armyAll(ctx, sl => sl.branchDef?.size === "small") : (atkSlotResolved.length > 0 && atkSlotResolved.every(sl => sl.branchDef?.size === "small"))) {
      if (ctx?.isCommander) { rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + (eff.value ?? eff.atkValue ?? 1); rs.cmdSpdBonus += eff.value ?? eff.spdValue ?? 1; } // flat CMD ATK / SPD
      else { rs.cmdMult *= (1 + (eff.atkValue || 1.0) / 100); rs.cmdSpdBonus += eff.spdValue || 1.0; }
    }
    break;
  // ── Dov mechanics ─────────────────────────────────────────────────────────
  case "neutral_tile_troop_loss_reduce":
    if ((ctx?.isAttacking ?? true) && (!defTile?.owner || defTile?.owner === "neutral" || defTile?.owner === "ai")) {
      rs.troopLossReduce = (rs.troopLossReduce || 0) + (eff.value || 0.03); // applied to the attacker's final losses
    }
    break;
  case "reinforcement_time_reduce":
    // Non-combat: reduce reinforcement time
    rs.reinforcementTimeReduce = (rs.reinforcementTimeReduce || 0) + (eff.value || 0.07);
    break;
  case "keep_battle_dmg_bonus":
    if (defTile?.isKeep || defTile?.isGate) {
      rs.troopAtkMult *= (1 + (eff.value || 0.01));
      rs.cmdMult      *= (1 + (eff.value || 0.01));
      if (eff.maxLevelEffect?.keepStunImmune) { if (ctx?.isCommander) rs.cmdStunImmune = true; else rs.invisStunImmune = true; }
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
  case "physical_damage_spd_mod":
    if (ctx?.isCommander) addSkillHit(rs, ctx, eff.value || 0.20, { n: targetsOf(eff), prio: prioOf(eff), useStat: "spd", label: skill?.name }); // SPD-scaled
    else rs.cmdMult *= (1 + (eff.value || 0.20)) * Math.max(1, (atkCmdSpd || 60) / 60);
    break;
  case "physical_damage_cmd_spd_boost":
    addSkillHit(rs, ctx, eff.value || 0.25, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    { const up = (eff.spdBoostPct || 1.00) * (atkCmdSpd || 60); // commander SPD +X% for N rounds
      rs.cmdSpdBonus += up;
      if (ctx?.isCommander) setBuff(ctx, null, round + 1, round + (eff.spdDuration || 2) - 1, r => { r.cmdSpdBonus = (r.cmdSpdBonus || 0) + up; }); }
    roundLog.actions.push({ actor: actorLabel, action: `⚡ ${skill?.name} — CMD SPD +${Math.round((eff.spdBoostPct||1.00)*100)}% (${eff.spdDuration||2} rnd)!`, dmg: 0, isTroopSkill: true });
    break;
  case "heal_two_units_dragon_bonus":
  { // [N allied units] heal X% | units of the bonus branch among them heal +Y% more
    const heal = eff.value ?? eff.healPct ?? 0.05, bonus = eff.bonusBranchHealPct ?? eff.dragonBonusPct ?? 0.25, br = eff.bonusBranch || "dragons";
    rs.healTwoUnitsDragonBonus = { dragonBonusPct: bonus };
    if (ctx?.isCommander) {
      const n = Math.max(1, ctx.atkSlots?.length || 1), frac = (eff.targets || 2) > 0 ? Math.min(1, (eff.targets || 2) / n) : 1;
      rs.healPct += heal * frac + bonus * Math.min(frac, armyShare(ctx, br));
    } else rs.healPct += heal;
    break; }
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
  { const c = eff.value ?? eff.chance ?? 0.03;
    rs.aoeBlindOrBurnChance = { chance: c, duration: eff.duration || 1 };
    if (ctx?.isCommander) { // each enemy unit rolls; a hit is Blind or Burn (50/50)
      const blind = [], burn = [];
      for (const ti of ctx.pickEnemy("all")) if (Math.random() < c) (Math.random() < 0.5 ? blind : burn).push(ti);
      blindUnits(rs, ctx, blind);
      burnUnits(rs, ctx, 0, null, 1, 0.20, { list: burn });
      if (blind.length || burn.length) roundLog.actions.push({ actor: actorLabel, action: `🌑 ${skill?.name} — ${blind.length} blinded, ${burn.length} burned!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < c) {
      if (Math.random() < 0.50) rs.blindApplied = true; else applyBurn(rs, 0.20);
    }
    break; }
  case "branch_flat_def_bonus":
    // [Branch units] DEF +N (flat)
    rs.branchFlatDefBonus = { branch: eff.branch || "dragons", value: eff.value || 3 };
    if (ctx?.isCommander) flatDefHp(rs, ctx, brSpec(eff.branch || "dragons"), eff.value || 3, 0);
    else rs.troopDefMult *= (1 + (eff.value || 3) / 100);
    break;
  case "branch_dmg_bonus_vs_alignment":
    rs.branchDmgBonusVsAlignment = { branch: eff.branch || "dragons", alignment: eff.alignment || "humans", value: eff.value || 0.01 };
    if (ctx?.isCommander) addVsTarget(rs, "troops", eff.alignment || "humans", (eff.value || 0.01) * armyShare(ctx, brSpec(eff.branch || "dragons")));
    else rs.troopAtkMult *= (1 + (eff.value || 0.01));
    break;
  case "cmd_foc_up_atk_down_passive":
  { const v = eff.value ?? eff.focPerLevel ?? 1;
    rs.cmdFocUpAtkDown = { focPerLevel: v, atkDownPerLevel: v };
    if (ctx?.isCommander) { // commander FOC +N, ATK -N | max: Dragon units confusion immune
      rs.cmdFocFlat = (rs.cmdFocFlat || 0) + v;
      rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) - v;
      if (eff.dragonConfusionImmunity) for (const i of ownIdx(ctx, "dragons")) (rs.slotConfusionImmune || (rs.slotConfusionImmune = new Set())).add(i);
    }
    if (eff.maxLevelEffect?.dragonConfusionImmunity) rs.dragonConfusionImmune = true;
    break; }
  case "branch_dmg_up_duration":
    rs.branchDmgUpDuration = { branch: eff.branch || "dragons", value: eff.value || 0.03 };
    if (ctx?.isCommander) { // [Branch units] DMG +X% this round and next
      const v = eff.value || 0.03, idx = ownIdx(ctx, brSpec(eff.branch || "dragons"));
      for (const i of idx) setSlot(rs, "slotAtkMult", i, 1 + v);
      setBuff(ctx, null, round + 1, round + (eff.duration || 2) - 1, r => { for (const i of idx) setSlot(r, "slotAtkMult", i, 1 + v); });
    } else rs.troopAtkMult *= (1 + (eff.value || 0.03));
    break;
  case "aoe_focus_damage_foc_mod":
    rs.cmdAoe = true;
    addSkillHit(rs, ctx, eff.value || 0.80, { n: "all", stat: "foc", label: skill?.name }); // every enemy unit
    break;
  // ── Kraul mechanics ───────────────────────────────────────────────────────
  case "dual_branch_stat_bonus":
  { const m = eff._lvlMul || 1, v1 = eff.value ?? eff.branch1Value ?? 2, v2 = (eff.branch2Value || 0.01) * m;
    rs.dualBranchStatBonus = { branch1: eff.branch1, branch1Stat: eff.branch1Stat, branch1Value: v1, branch2: eff.branch2, branch2Stat: eff.branch2Stat, branch2Value: v2 };
    if (ctx?.isCommander) { // two branches, each its own stat
      for (const [b, st, v] of [[eff.branch1, eff.branch1Stat, v1], [eff.branch2, eff.branch2Stat, v2]]) {
        if (st === "def") flatDefHp(rs, ctx, b, v, 0);
        else if (st === "hp") flatDefHp(rs, ctx, b, 0, v);
        else if (st === "dmg") for (const i of ownIdx(ctx, b)) setSlot(rs, "slotAtkMult", i, 1 + v);
      }
    } else {
      if (eff.branch1Stat === "def") rs.troopDefMult *= (1 + v1 / 100);
      if (eff.branch2Stat === "dmg") rs.troopAtkMult *= (1 + v2);
    }
    break; }
  case "on_attack_bonus_dmg_chance":
  { const c = Math.min(1, eff.value ?? eff.chance ?? 0.05), b = eff.bonusDmg || 0.40;
    rs.onAttackBonusDmgChance = { chance: c, bonusDmg: b };
    if (ctx?.isCommander) rs.troopAtkMult *= 1 + c * b; // allied units: expected extra damage per attack
    break; }
  case "branch_phys_dmg_reduce":
    rs.branchPhysDmgReduce = { branch: eff.branch || "dragons", value: eff.value || 0.01 };
    if (ctx?.isCommander) for (const i of ownIdx(ctx, brSpec(eff.branch || "dragons"))) setSlot(rs, "slotPhysResist", i, eff.value || 0.01, "add"); // physical hits on those units
    else rs.dmgReduce += eff.value || 0.01;
    break;
  case "all_dragon_army_cmd_atk":
    rs.allDragonArmyCmdAtk = { value: eff.value || 2.0 };
    if (ctx?.isCommander ? armyAll(ctx, "dragons") : (atkSlotResolved.length > 0 && atkSlotResolved.every(sl => sl.branch?.faction === "dragons"))) {
      if (ctx?.isCommander) rs.cmdAtkFlat = (rs.cmdAtkFlat || 0) + (eff.value || 2.0); // CMD ATK +N (flat)
      else rs.cmdMult *= (1 + (eff.value || 2.0) / 100);
    }
    break;
  case "aoe_physical_stun_chance":
    rs.cmdAoe  = true;
    addSkillHit(rs, ctx, eff.value || 0.40, { n: "all", label: skill?.name });
    { const hit = stunUnits(rs, ctx, "all", null, eff.stunChance || 0.40); // each unit rolls
      if (hit || (!ctx?.isCommander && rs.enemyStunned)) roundLog.actions.push({ actor: actorLabel, action: `💥 ${skill?.name} — ${ctx?.isCommander ? `${hit} enemy unit${hit > 1 ? "s" : ""}` : "Enemy"} stunned!`, dmg: 0, isTroopSkill: true }); }
    break;
  // ── Cinderfang mechanics ──────────────────────────────────────────────────
  case "physical_damage_multi_burn_chance":
    addSkillHit(rs, ctx, eff.value || 0.10, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    { const hit = burnUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.burnChance ?? 0.35, eff.burnDmgPenalty || 0.20);
      if (hit || (!ctx?.isCommander && rs.burnApplied)) roundLog.actions.push({ actor: actorLabel, action: `🔥 ${skill?.name} — Burn applied!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "branch_flat_hp_def_bonus":
  { const v = eff.value ?? eff.defValue ?? 1;
    rs.branchFlatHpDefBonus = { branch: eff.branch || "dragons", hpValue: v, defValue: v };
    if (ctx?.isCommander) flatDefHp(rs, ctx, brSpec(eff.branch || "dragons"), v, v); // [Branch units] HP +N | DEF +N
    else rs.troopDefMult *= (1 + v / 100);
    break; }
  case "physical_damage_confusion_chance":
    addSkillHit(rs, ctx, eff.value || 0.40, { n: targetsOf(eff), prio: prioOf(eff), label: skill?.name });
    { const hit = confuseUnits(rs, ctx, targetsOf(eff), prioOf(eff), eff.confusionChance || 0.45); // the unit hit rolls
      if (hit || (!ctx?.isCommander && rs.enemyConfused)) roundLog.actions.push({ actor: actorLabel, action: `😤 ${skill?.name} — Enemy unit confused!`, dmg: 0, isTroopSkill: true }); }
    break;
  case "aoe_enemy_buff_strip_chance":
    if (Math.random() < (eff.value ?? eff.chance ?? 0.04)) { // enemy army loses its positive stat buffs this round
      rs.enemyBuffStripped = true;
      roundLog.actions.push({ actor: actorLabel, action: `🌬️ ${skill?.name} — All enemy buffs stripped!`, dmg: 0, isTroopSkill: true });
    }
    break;
  case "branch_heal_on_debuff":
    // [Branch units] heal X% when a debuff lands on them (max once per round) — resolved after both sides' skills
    rs.branchHealOnDebuff = { branch: eff.branch || "dragons", healPct: eff.value ?? eff.healPct ?? 0.06, maxPerRound: eff.maxPerRound || 1, usedThisRound: 0 };
    break;
  case "burst_then_penalty":
    if (round <= (eff.earlyRounds || 2)) {
      rs.cmdMult      *= (1 + (eff.value ?? eff.earlyBonus ?? 0.14));
      rs.troopAtkMult *= (1 + (eff.value ?? eff.earlyBonus ?? 0.14));
    } else if ((eff.penaltyRounds||[3,4,5]).includes(round)) {
      rs.cmdMult      *= (1 - (eff.penaltyValue || 0.50));
      rs.troopAtkMult *= (1 - (eff.penaltyValue || 0.50));
    }
    break;
  case "physical_damage_delayed_followup":
  { const init = eff.value ?? eff.initialDmg ?? 0.20, fu = (eff.followupDmg || 0.30) * (eff._lvlMul || 1), prio = prioOf(eff);
    addSkillHit(rs, ctx, init, { n: 1, prio, label: skill?.name });
    rs.pendingFollowupDmg = fu;
    setBuff(ctx, null, round + 1, round + 1, (r) => addSkillHit(r, ctx, fu, { n: 1, prio, fromActive: true, label: `${skill?.name||"Overpower"} follow-up` }));
    break; }
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
    // 3 hits, each on a DIFFERENT unit: 15% / 17% / 19% (scale with level)
  { const hits = eff.hits || [0.15, 0.17, 0.19], m = eff._lvlMul || 1;
    if (ctx?.isCommander) hits.forEach((p, k) => addSkillHit(rs, ctx, p * m, { nth: k, label: skill?.name }));
    else rs.multiHitEscalating = hits;
    break; }
  case "physical_damage_followup":
  { // was `rs.cmdMult = 0.27` (overwrote commander damage down to 27%)
    addSkillHit(rs, ctx, eff.value ?? eff.initialDmg ?? 0.27, { n: 1, prio: prioOf(eff), label: skill?.name });
    if (Math.random() < (eff.followupChance || 0.50)) addSkillHit(rs, ctx, (eff.followupDmg || 0.27) * (eff._lvlMul || 1), { n: 1, prio: prioOf(eff), label: `${skill?.name||"Strike"} follow-up` });
    break; }
  case "aoe_physical_stun":
    rs.cmdAoe = true;
    if (ctx?.isCommander) {
      addSkillHit(rs, ctx, eff.value || 0.30, { n: "all", label: skill?.name });
      const hit = stunUnits(rs, ctx, "all", null, eff.stunChance || 0.35); // each unit rolls
      if (hit) roundLog.actions.push({ actor: actorLabel, action: `💥 ${skill?.name} — ${hit} enemy unit${hit>1?"s":""} stunned!`, dmg: 0, isTroopSkill: true });
    } else if (Math.random() < (eff.stunChance || 0.35)) rs.enemyStunned = Math.max(rs.enemyStunned || 0, 1);
    break;
  case "physical_damage_self_debuff":
    // was `rs.cmdMult = 1.00` (overwrote). Self debuff hits the commander's NEXT damage.
    addSkillHit(rs, ctx, eff.value ?? eff.dmg ?? 1.00, { n: 1, prio: prioOf(eff), label: skill?.name });
    debuffCommander(ctx, roundLog, actorLabel, skill?.name, () => {
      if (ctx?.cs) ctx.cs.nextDmgPenalty = Math.max(ctx.cs.nextDmgPenalty || 0, eff.selfDebuff || 0.40);
      else rs.selfDebuffNextHit = eff.selfDebuff || 0.40;
    });
    break;
  case "confusion_immunity_chance":
    // Commander + army: chance (rolled once per battle) for Confusion Immunity in the first N rounds (was clearing the ENEMY's confusion)
    if (ctx?.cs) {
      const key = `confImm:${skill?.name}`;
      if (ctx.cs.stacks[key] === undefined) ctx.cs.stacks[key] = Math.random() < (eff.value ?? eff.chance ?? 0.10);
      if (ctx.cs.stacks[key] && round <= (eff.rounds || 4)) { rs.cmdConfusionImmune = true; rs.atkConfusionImmune = true; }
    } else if (Math.random() < (eff.chance || 0.10)) rs.enemyConfused = 0;
    break;
  case "physical_damage_large_bonus":
    addSkillHit(rs, ctx, eff.value ?? eff.primaryDmg ?? 0.30, { n: 1, prio: "large", label: skill?.name,
      bonusIf: { match: { size: "large" }, mult: eff.largeBonusDmg || 0.20 } });
    break;
  case "first_skills_dmg_bonus":
    if (ctx?.cs) { // first N commander skill activations of the battle get +X% (scales this round's skill damage)
      const key = `firstN:${skill?.name}`;
      const left = ctx.cs.stacks[key] ?? (eff.instances || 4);
      const fired = ctx.activesFired || 0, n = Math.min(left, fired);
      if (n > 0) rs.skillDmgBonus += (eff.value ?? eff.bonus ?? 0.05) * n / fired;
      ctx.cs.stacks[key] = left - n;
    } else if (rs.firstSkillsRemaining > 0) {
      rs.firstSkillsBonus = eff.bonus || 0.05;
      rs.firstSkillsRemaining--;
    }
    break;
  case "cmd_normal_atk_bonus":
    if (ctx?.isCommander) rs.normalAtkBonus = (rs.normalAtkBonus || 0) + (eff.value || 0); // normal attacks only
    else rs.cmdMult = (rs.cmdMult || 1) + (eff.value || 0);
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
const MLE_HANDLER_OWNED = new Set(["undead_buff_enemy_def_down:atkBonus", "silence_and_foc_vuln:cmdFocBonus", "aoe_burn_guaranteed:burnedEnemyDefDown", "physical_damage_frostbitten_slow:slowedEnemyDefDown", "multi_hit_random_atk_stack:frostbittenSkillDmgTakenUp"]);
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
    case "debuffed":    return (rs.enemyStunned || 0) > 0 || (rs.enemyConfused || 0) > 0 || !!rs.enemyCmdStunned || !!rs.enemyCmdConfused
                          || (rs.stunnedUnits?.size || 0) > 0 || (rs.confusedUnits?.size || 0) > 0 || (rs.enemyDefDown || 0) > 0 || (rs.enemyDefFlatDown || 0) > 0
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
    if (k === "bleedSpreadChance") {
      const bl = (rs.skillHits || []).filter(h => h.dot?.kind === "bleed");
      if (bl.length) bl.forEach(h => { h.dot.spread = v; });
      else if (rs.bleedApplied) rs.pendingBleedDmg = (rs.pendingBleedDmg || 0) * (1 + v);
      continue;
    }
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
  cs.round = round; cs.drainAppliedNow = 0;
  if (cs.frostbite && [...cs.frostbite.values()].some(u => u >= round)) { rs.frostbiteApplied = true; rs.frostbiteRoundsLeft = Math.max(rs.frostbiteRoundsLeft || 0, 1); } // status for conditional skills
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
  for (const b of cs.buffs) if (b.from <= round) b.apply(rs, roundLog, actorLabel);
  // Drunk lasts the round it lands and the next one
  if (cs.drunkUntil >= round && cs.drunkFrom < round) {
    rs.drunkApplied = true;
    rs.enemyMissChance = Math.min(0.80, (rs.enemyMissChance || 0) + (cs.drunkMiss || 0.30));
  }
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
  ctx.phase = "active";
  for (const x of list) {
    if (x.def.type !== "active" || !skillFiresOnRound(x.def, round)) continue;
    applySkillEffect(x.def, x.eff, rs, roundLog, actorLabel, ctx.defTroopBranch, round, ctx.atkSlots, null, null, true, ctx);
    fired++; ran.push(x);
  }
  const cmA = rs.cmdMult, fdA = rs.focusDmgBonus || 0;
  ctx.activesFired = fired;
  ctx.phase = "passive";
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
      if (A > 1) rs.cmdMult *= (1 + (A - 1) * (1 + b)) / A;       // legacy (unconverted handlers)
      if (fdA > fd0) rs.focusDmgBonus += (fdA - fd0) * b;
      for (const h of (rs.skillHits || [])) if (h.fromActive) h.pct *= 1 + b; // per-unit skill hits
    }
  } else if (carriedBonus) cs.pendingSkillBonus = Math.max(cs.pendingSkillBonus, carriedBonus);
  // Generic max-level bonuses run after every handler so status conditions set this round count
  for (const { eff, def } of ran) if (eff.maxLevelEffect) applyMaxLevelBonuses(eff.maxLevelEffect, def.effect.type, rs, ctx);
  // "Burn DMG +X%" passives scale this round's burn damage
  if ((rs.burnSkillDmg || 0) > 0 && (rs.cmdBurnDmgBonus || 0) > 0) rs.focusDmgBonus += rs.burnSkillDmg * rs.cmdBurnDmgBonus;
  if ((rs.cmdBurnDmgBonus || 0) > 0) for (const h of (rs.skillHits || [])) if (h.isBurn) h.pct *= 1 + rs.cmdBurnDmgBonus;
  if (rs.burnApplied) cs.lastBurnRound = round;
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
  dots: [], // per-unit DoTs this side applied to enemy units: { ti, kind: "venom"|"bleed", pct, rounds, start }
  cs: newCommanderSkillState(), rs: null, ...o,
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
// Clear the Air: remove side T's positive stat buffs for this round (debuffs it suffers are kept)
const stripBuffs = (T) => {
  const r = T.rs;
  r.cmdMult = Math.min(r.cmdMult, T.pveMult); r.troopAtkMult = Math.min(r.troopAtkMult, T.pveMult);
  r.troopDefMult = Math.min(r.troopDefMult, 1); r.dmgReduce = Math.min(r.dmgReduce, 0); r.troopDmgReduce = Math.min(r.troopDmgReduce, 0);
  for (const k of ["cmdAtkFlat", "cmdFocFlat", "cmdSpdBonus"]) r[k] = Math.min(r[k] || 0, 0);
  r.normalAtkBonus = 0; r.enemyDmgTakenUp = 0; r.focusDmgResist = 0; r.firstHitProtection = 0; r.decayRed = null; r.firstHitsRed = null;
  r.vsTarget = []; r.resistFrom = (r.resistFrom || []).filter(v => v.value < 0);
  for (const k of ["slotPhysResist", "slotFocusResist", "slotEvadeChance", "slotMaxDmgChance"]) r[k] = {};
  for (const [k, cap] of [["slotAtkMult", 1]]) if (r[k]) for (const i in r[k]) r[k][i] = Math.min(r[k][i], cap);
  if (r.slotDmgTakenMult) for (const i in r.slotDmgTakenMult) r.slotDmgTakenMult[i] = Math.max(r.slotDmgTakenMult[i], 1);
  if (r.slotSpdBonus) for (const i in r.slotSpdBonus) r.slotSpdBonus[i] = Math.min(r.slotSpdBonus[i] || 0, 0);
};
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
// ── Targeting (normal attacks: one unit, frontline first; skills: n units by priority) ──
const ROLE_ORDER = { melee: 0, mounted: 1, ranged: 2, siege: 2 };
const unitsIn = (T, i) => (T.slotHp[i] || 0) / (T.slots[i]?.hpPer || T.hpPer || 1);
const aliveOf = T => T.slotHp.map((h, i) => (h > 0 ? i : -1)).filter(i => i >= 0);
const frontlineOf = T => aliveOf(T).sort((a, b) =>
  (ROLE_ORDER[T.slots[a]?.branchDef?.role] ?? 0) - (ROLE_ORDER[T.slots[b]?.branchDef?.role] ?? 0) || unitsIn(T, b) - unitsIn(T, a));
const unitMatches = (T, i, m) => {
  if (!m) return true;
  const sl = T.slots[i], bd = sl?.branchDef, fac = sl?.branch?.faction ?? T.cmdObj?.faction;
  if (m.faction && fac !== m.faction) return false;
  if (m.alignment && getFactionAlignment(fac) !== m.alignment) return false;
  if (m.role && bd?.role !== m.role) return false;
  if (m.size && bd?.size !== m.size) return false;
  if (m.branch && sl?.branch?.branch !== m.branch) return false;
  return true;
};
// Priority key from skill data ("lowestDef", "prioritiseRanged", "large", "faction:orcs" …) → sort rank (lower first)
const prioRank = (T, i, prio) => {
  if (!prio) return 0;
  const p = String(prio).replace(/^prioritise/i, "").toLowerCase(), sl = T.slots[i], bd = sl?.branchDef;
  if (p === "lowestdef")  return (sl?.def ?? T.primaryDef);
  if (p === "highestdef") return -(sl?.def ?? T.primaryDef);
  if (p === "highestdmg") return -((sl?.tierData?.dmgHi) ?? 0);
  if (p === "highesthp")  return -(T.slotHp[i] || 0);
  if (p.startsWith("faction:")) return sl?.branch?.faction === p.slice(8) ? 0 : 1;
  if (["ranged","melee","mounted","siege"].includes(p)) return bd?.role === p ? 0 : 1;
  if (["large","medium","small"].includes(p)) return bd?.size === p ? 0 : 1;
  if (["pirates","orcs","wizards","holyknights","nightcreatures","dragons","coldborns","ashen_dead"].some(f => f.replace(/s$/, "") === p.replace(/s$/, ""))) return sl?.branch?.faction?.startsWith(p.replace(/s$/, "")) ? 0 : 1; // "prioritiseWizard" too
  return 0; // unknown / "bleed" etc. → frontline order
};
// n: number | "all". random: independent random picks (repeats allowed). onlyIf: only units matching.
const pickTargets = (T, n = 1, prio = null, random = false, onlyIf = null) => {
  let alive = frontlineOf(T).filter(i => unitMatches(T, i, onlyIf));
  if (!alive.length) return [];
  if (n === "all") return alive;
  if (random) return Array.from({ length: n }, () => alive[Math.floor(Math.random() * alive.length)]);
  if (prio) alive = alive.map((i, k) => [i, k]).sort((a, b) => prioRank(T, a[0], prio) - prioRank(T, b[0], prio) || a[1] - b[1]).map(x => x[0]);
  return alive.slice(0, n);
};
const unitLabel = (T, i) => (i == null ? "" : `→ ${T.slots[i]?.branchDef?.label || (T.isPlayer ? "troops" : "defenders")}`);
// Effective DEF of target unit i when S hits it (its own DEF × its side's DEF buffs, minus S's DEF-down debuffs)
const targetDefOf = (S, T, i, round) => Math.max(0,
  (T.slots[i]?.def ?? T.primaryDef) * (T.rs.troopDefMult || 1) * bastionDefOf(T, round) * (1 - Math.min(0.9, S.rs.enemyDefDown || 0))
  - (S.rs.enemyDefFlatDown || 0) - (S.rs.unitDefFlatDown?.[i] || 0));
// "+X% vs <faction/role/size>" bonuses of S that match the unit being hit. who: "cmd" | "troops" | "skill"
const vsMult = (S, T, i, who, isFoc = false) => (S.rs.vsTarget || []).reduce((m, v) => {
  if (!(v.who === "all" || v.who === who || (who === "skill" && v.who === "cmd"))) return m;
  if (v.foc && !isFoc) return m; // "Focus DMG taken +X%" entries
  const ok = v.match?.stunned ? (S.rs.stunnedUnits?.has(i) || (S.rs.enemyStunned || 0) > 0)
    : v.match?.burned ? (S.rs.burnedUnits?.has(i) || (S.rs.enemyBurnPenalty || 0) > 0)
    : v.match?.slowed ? (S.rs.unitSpdDown?.[i] || 0) > 0
    : v.match?.poisoned ? S.dots.some(d => d.kind === "venom" && d.ti === i)
    : v.match?.drained ? (S.cs.lifeDrain?.get(i) || 0) >= (S.cs.round || 0)
    : v.match?.frostbitten ? (S.cs.frostbite?.get(i) || 0) >= (S.cs.round || 0) : unitMatches(T, i, v.match);
  return ok ? m * (1 + v.value) : m;
}, 1) * (1 + (S.rs.unitVuln?.[i] || 0)) * (T.rs.slotDmgTakenMult?.[i] ?? 1)
  // The People's Hero: the unit's DMG received -X%, decaying per hit it has taken
  * (T.rs.decayRed ? 1 - T.rs.decayRed.v * Math.max(0, 1 - T.rs.decayRed.f * Math.min(T.cs.unitHits?.[i] || 0, T.rs.decayRed.max)) : 1)
  // Elder Dragon: the unit's first N hits -X%
  * (T.rs.firstHitsRed?.idx.has(i) && (T.cs.unitHits?.[i] || 0) < T.rs.firstHitsRed.n ? 1 - T.rs.firstHitsRed.v : 1)
  // Wise Wizard: the unit takes +X% per hit it has taken (first N)
  * (S.rs.escalate ? 1 + S.rs.escalate.v * Math.min(T.cs.unitHits?.[i] || 0, S.rs.escalate.n) : 1);
// "Damage received from <faction> units -X%" of the target side, vs the attacking unit (slot or commander)
const resistMult = (T, S, attackerSlot) => (T.rs.resistFrom || []).reduce((m, v) => {
  const fac = attackerSlot?.branch?.faction ?? S.cmdObj?.faction;
  const ok = (!v.match.faction || v.match.faction === fac) && (!v.match.alignment || getFactionAlignment(fac) === v.match.alignment);
  return ok ? m * (1 - v.value) : m;
}, 1);
// Evasion of the side being hit: Fog of War (next N hits), Shaman's Defense (share chance on next hit)
const evadesHit = (er) => {
  if (er.evadeHits > 0) { er.evadeHits--; return true; }
  if (er.atkEvadeNextHit > 0) { const ev = Math.random() < er.atkEvadeNextHit; er.atkEvadeNextHit = 0; return ev; }
  return false;
};
// Evasion of target unit ti when S hits it: army-wide (above) + that unit's own (next-hit evade, % evade, invisible).
// Bleeding units can't evade if S has Bleed-prevents-evasion.
const targetEvades = (S, T, ti) => {
  const er = T.rs;
  if (S.rs.bleedPreventsEvasion && S.dots.some(d => d.kind === "bleed" && d.ti === ti)) return false;
  if (evadesHit(er)) return true;
  if (er.slotEvadeNext?.has(ti)) { er.slotEvadeNext.delete(ti); return true; }
  if ((er.slotEvadeChance?.[ti] || 0) > 0 && Math.random() < er.slotEvadeChance[ti]) return true;
  if (er.invisibleSlots?.has(ti) && Math.random() < (er.invisEvade || 0.30)) return true;
  if (er.firstHitsEvade && (T.cs.unitHits?.[ti] || 0) < er.firstHitsEvade.max && Math.random() < er.firstHitsEvade.chance) return true; // Commander In Arms
  return false;
};
// Damage one unit; overkill spills to the next unit in frontline order. Returns HP removed.
const damageSlot = (T, i, amount, round) => {
  const before = hpOf(T);
  if (before <= 0 || amount <= 0) return 0;
  // Leader's Protection: first N damage instances this battle -X%
  if ((T.rs?.firstHitProtection || 0) > 0 && (T.cs.firstHitsTaken || 0) < (T.rs.firstHitsRemaining || 0)) {
    amount = Math.round(amount * (1 - T.rs.firstHitProtection)); T.cs.firstHitsTaken = (T.cs.firstHitsTaken || 0) + 1;
  }
  // Leader's Rage: when a unit of the branch takes damage, the commander's next attack gets +X%
  if (T.rs?.leaderRage && T.slots[i]?.branch?.branch === T.rs.leaderRage.branch) T.cs.rageReady = T.rs.leaderRage.bonus;
  // Per-unit hit counters (The People's Hero decay, Commander In Arms, Promise Land)
  const uh = T.cs.unitHits || (T.cs.unitHits = {});
  uh[i] = (uh[i] || 0) + 1; T.cs.hitsTaken = (T.cs.hitsTaken || 0) + 1;
  let left = amount;
  const order = [i, ...frontlineOf(T).filter(k => k !== i)];
  for (const k of order) { if (left <= 0) break; const p = Math.min(T.slotHp[k], left); T.slotHp[k] -= p; left -= p; }
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
  defHpPer: T.hpPer, defTile, atkCmdSpd: S.spd, cmdAtkStat: S.atkStat, cmdFocStat: S.focStat, bleedRoundsActive: S.dots.some(d => d.kind === "bleed" && d.start <= round && T.slotHp[d.ti] > 0) ? 1 : 0,
  cs: S.cs, venomTicking: S.dots.some(d => d.kind === "venom" && d.start <= round && T.slotHp[d.ti] > 0), atkCommand: S.command, defCommand: T.command,
  pickEnemy: (n, prio, random, onlyIf) => pickTargets(T, n, prio, random, onlyIf),
  ownSlotIdx: (pred) => S.slots.map((sl, i) => (S.slotHp[i] > 0 && pred(sl) ? i : -1)).filter(i => i >= 0),
  ownGear: S.cmdObj?.gearBonuses || null,
  isNight: defTile?.isNight ?? (() => { const h = new Date().getUTCHours(); return h < 6 || h >= 18; })(),
  isAttacking: S === A, enemyCmdAlignment: getFactionAlignment(T.cmdObj?.faction ?? T.slots[0]?.branch?.faction),
  atkCmdReal: realCommandOf(S), defCmdReal: realCommandOf(T),
  defFactions: new Set([...T.slots.map(d => d.branch?.faction), T.cmdObj?.faction].filter(Boolean)),
  defRoles: new Set(T.slots.map(d => d.branchDef?.role).filter(Boolean)),
  defSizes: new Set(T.slots.map(d => d.branchDef?.size).filter(Boolean)),
  defSlotCount: T.slots.filter((d, i) => (T.slotHp[i] || 0) > 0).length || 1,
  defSlotSpd: (ti) => T.slots[ti]?.spd ?? T.primaryBranchDef?.spd ?? 60,
  // Enemy units carrying one of OUR DoTs (kind: "venom" | "bleed"); clearDots strips them from a unit (returns count)
  dotUnits: (kind) => [...new Set(S.dots.filter(d => d.kind === kind && T.slotHp[d.ti] > 0).map(d => d.ti))],
  clearDots: (ti) => { const n = S.dots.filter(d => d.ti === ti).length; S.dots = S.dots.filter(d => d.ti !== ti); return n; },
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
  // Incoming debuffs: debuff-immune this round, or resisted (Around the Block, Cleanse)
  const resists = () => {
    if (r.cmdDebuffImmune || Math.random() < (r.debuffChanceReduction || 0) + (r.debuffResistChance || 0)) return true;
    if (r.divinePrayer) { // Divine Prayer: cleanse chance; a failed cleanse stacks army DEF (next rounds)
      if (Math.random() < r.divinePrayer.chance) return true;
      S.cs.prayerStacks = Math.min(r.divinePrayer.max, (S.cs.prayerStacks || 0) + 1);
    }
    return false;
  };
  const resisted = (what) => roundLog.actions.push({ actor:who, action:`🛡️ ${S.isPlayer ? S.name : "Enemy commander"} resists ${what}!`, dmg:0, isPlayer:S.isPlayer });
  if (er.enemyStunned > 0 || er.enemyCmdStunned) {
    if (er.enemyCmdStunned) er.enemyCmdStunned = false; else er.enemyStunned--;
    if (r.cmdStunImmune || resists()) resisted("stun");
    else { roundLog.actions.push({ actor:who, action: S.isPlayer ? `⚡ ${S.name} is stunned!` : "⚡ Enemy commander is stunned!", dmg:0, isPlayer:S.isPlayer }); return; }
  }
  if (er.enemySilenced) {
    er.enemySilenced = false;
    if (resists()) resisted("silence");
    else { roundLog.actions.push({ actor:who, action: S.isPlayer ? `🎵 ${S.name} silenced — skill delayed!` : "🎵 Enemy commander silenced — skill delayed!", dmg:0, isPlayer:S.isPlayer }); return; }
  }
  let confused = false;
  if (er.enemyConfused > 0 || er.enemyCmdConfused) {
    if (er.enemyCmdConfused) er.enemyCmdConfused = false; else er.enemyConfused--;
    if (!r.cmdConfusionImmune && !resists()) confused = true;
  }
  if (r.selfConfused && !r.cmdConfusionImmune) confused = true; // Captain's Honor
  if (confused) {
    if (Math.random() < 0.5) {
      const own = frontlineOf(S)[0];
      const selfDmg = Math.max(1, Math.round(calcCmdNormalDmg(S.atkStat, S.command, 0) * 0.8
        * Math.max(0, 1 + defReduction((S.slots[own]?.def ?? S.primaryDef) * (r.troopDefMult || 1) * bastionDefOf(S, round)))));
      const lost = damageSlot(S, own, selfDmg, round);
      roundLog.actions.push({ actor:who, action:`😵 Confused! Attacks own troops — ${Math.max(0, Math.round(lost / S.hpPer))} friendly casualties`, dmg:selfDmg, isPlayer:!S.isPlayer, isConfused:true });
      return;
    }
  }
  if (er.enemyTargetsTaunted) roundLog.actions.push({ actor:who, action: S.isPlayer ? "🎯 Taunted — forced to attack!" : "🎯 Taunted — forced to attack!", dmg:0, isPlayer:S.isPlayer });
  // Miss / evade only stop the normal attack; skill hits roll evasion per hit below
  let normalOk = true;
  if (!r.cmdPursuit) { // Pursuit: attacks cannot miss or be evaded
    if (Math.random() < (er.enemyMissChance || 0)) { roundLog.actions.push({ actor:who, action: S.isPlayer ? `${S.name} missed!` : "Enemy commander missed!", dmg:0, isPlayer:S.isPlayer }); normalOk = false; }
    else if (er.invisibleUnits > 0 && Math.random() < 0.30) { roundLog.actions.push({ actor:who, action:"🌑 Attack evaded — target invisible!", dmg:0, isPlayer:S.isPlayer }); normalOk = false; }
  }
  // Soup's Hot etc.: attacking this side can Burn the attacker (its damage -20% this round)
  if ((er.onEnemyAttackBurnChance || 0) > 0 && Math.random() < er.onEnemyAttackBurnChance) {
    er.cmdBurned = 0.20; er.burnApplied = true; // only the attacking commander is Burned
    roundLog.actions.push({ actor:who, action:`🔥 ${S.isPlayer ? S.name : "Enemy commander"} is Burned attacking!`, dmg:0, isPlayer:!S.isPlayer, isTroopSkill:true });
  }

  // Own damage mods up; target's damage-received / our-ATK-down mods down
  const common = (r.enemyDmgTakenUp || 0) - (er.enemyAtkReduce || 0) - (er.enemyDmgReduce || 0) - (er.dmgReduce || 0) - (er.enemyBurnPenalty || 0) - (er.cmdBurned || 0);
  const physModSum = (r.cmdMult - 1) + S.classPhys + S.scaling + common;
  const focModSum  = (r.cmdMult - 1) + S.classFoc  + S.scaling + common - (er.focusDmgResist || 0) + (r.cmdFocDmgUp || 0);
  // A Wizard's Power: that unit's next Focus hit taken +X% (marked on an earlier round)
  const focVulnOf = (ti) => { const e = S.cs.focVuln?.get(ti); if (!e || e.round >= round) return 0; S.cs.focVuln.delete(ti); return e.v; };
  const atkR = S.atkStat + (r.cmdAtkFlat || 0) - (er.enemyCmdAtkFlatDown || 0);
  const focR = Math.max(1, S.focStat + (r.cmdFocFlat || 0) - (er.enemyCmdFocFlatDown || 0));
  const usesFoc = (S.primaryBranchDef?.dmgType === "magical") || (focR > atkR) || !!r.cmdNormalUsesFoc; // Death Knell max
  const critMul = () => (Math.random() < (r.critChance || 0) ? 1.5 : 1.0);
  let dealtTotal = 0;
  // 1) Normal attack(s) → ONE target, frontline first
  const normals = normalOk ? 1 + (r.extraNormalAttacks || 0) : (r.extraNormalAttacks || 0);
  const { eligibleRounds: fuRounds, chance: fuChance } = followupStats(r.followupSources || []);
  const followupExpected = round * fuRounds * fuChance;
  if (normalOk) S.cs.normalAttacks = (S.cs.normalAttacks || 0) + 1; // The Haunting
  for (let k = 0; k < normals && hpOf(T) > 0; k++) {
   // Cael's Rampage: this normal attack hits every enemy unit
   for (const ti of (k === 0 && r.normalHitsAll) ? frontlineOf(T) : [pickTargets(T, 1)[0]]) {
    if (ti == null || T.slotHp[ti] <= 0) continue;
    if (!r.cmdPursuit && targetEvades(S, T, ti)) { roundLog.actions.push({ actor:who, action:`💨 Attack evaded ${unitLabel(T, ti)}!`, dmg:0, isPlayer:S.isPlayer }); continue; }
    let nb = 1 + (r.normalAtkBonus || 0);
    if (k === 0 && S.cs.rageReady) { nb *= 1 + S.cs.rageReady; S.cs.rageReady = 0; } // Leader's Rage
    const base = usesFoc
      ? calcCmdFocusSkillDmg(focR, S.command, 1.0 + (r.focusDmgBonus || 0), focModSum)
      : calcCmdNormalDmg(Math.max(1, atkR), S.command, physModSum);
    const defMult = usesFoc ? (1 - (er.slotFocusResist?.[ti] || 0)) * (1 + focVulnOf(ti))
      : Math.max(0, 1 + defReduction(targetDefOf(S, T, ti, round) * (1 - (r.normalIgnoreDef || 0)))) * (1 - (er.slotPhysResist?.[ti] || 0));
    const crit = critMul();
    const dmg = Math.max(1, Math.round(base * nb * (1 + (k === 0 ? followupExpected : 0)) * defMult * crit * S.terrMult
      * vsMult(S, T, ti, "cmd", usesFoc) * resistMult(T, S, null)));
    const lost = damageSlot(T, ti, dmg, round);
    dealtTotal += dmg;
    roundLog.actions.push({ actor:who,
      action: S.isPlayer ? `${S.name} strikes ${unitLabel(T, ti)}${crit > 1 ? " (CRIT!)" : ""}${k > 0 ? " (extra attack)" : ""}` : `${report.defCmdIcon} Enemy commander strikes ${unitLabel(T, ti)}${crit > 1 ? " (CRIT!)" : ""}`,
      dmg, ...hitFields(S, T, lost) });
   }
  }
  // Legacy focus-skill damage (factions not yet converted to per-unit hits) on a physical commander:
  // its own FOC-scaled hit on one unit (a FOC commander already adds it to the normal attack above)
  const hitsNow = [...(r.skillHits || [])];
  if (!usesFoc && (r.focusDmgBonus || 0) > 0) hitsNow.push({ pct: r.focusDmgBonus, stat: "foc", n: 1, kind: "skill", label: "Focus skills" });
  // 2) Skill hits → n separate units (or every unit), each with that unit's own DEF / size / bonuses
  for (const h of hitsNow) {
    if (hpOf(T) <= 0) break;
    if (h.requiresNormal && !normalOk) continue; // "after the commander attacks" extras need the normal attack
    const targets = h.ti != null ? (T.slotHp[h.ti] > 0 ? [h.ti] : pickTargets(T, 1)) : h.nth != null ? pickTargets(T, h.nth + 1, h.prio, false, h.onlyIf).slice(h.nth, h.nth + 1) : pickTargets(T, h.n, h.prio, h.random, h.onlyIf);
    let sum = 0, lostSum = 0, crits = 0, evaded = 0;
    for (const ti of targets) {
      if (T.slotHp[ti] <= 0) continue;
      if (!r.cmdPursuit && targetEvades(S, T, ti)) { evaded++; continue; }
      if (h.dot && (!h.dot.chance || Math.random() < h.dot.chance)) { // DoT lands on this unit (ticks from next round)
        S.dots.push({ ti, kind: h.dot.kind, pct: h.dot.pct, rounds: h.dot.rounds || 1, start: round + 1 });
        if (h.dot.spread && Math.random() < h.dot.spread) { // Bleed spread (max level): same DoT on another living unit
          const others = aliveOf(T).filter(k => k !== ti);
          if (others.length) S.dots.push({ ti: others[Math.floor(Math.random() * others.length)], kind: h.dot.kind, pct: h.dot.pct, rounds: h.dot.rounds || 1, start: round + 1 });
        }
      }
      if (!(h.pct > 0)) continue;
      const pct = h.pct * (h.bonusIf && unitMatches(T, ti, h.bonusIf.match) ? 1 + h.bonusIf.mult : 1);
      const spdR = S.spd + (r.cmdSpdBonus || 0);       // "(modified by SPD)" skills use SPD as their stat
      const base = h.stat === "foc"
        ? calcCmdFocusSkillDmg(h.useStat === "spd" ? spdR : focR, S.command, pct, focModSum - (er.slotFocusResist?.[ti] || 0))
        : calcCmdPhysicalSkillDmg(Math.max(1, h.useStat === "spd" ? spdR : atkR), S.command, pct, physModSum);
      const defMult = (h.stat === "foc" ? 1 + focVulnOf(ti) : Math.max(0, 1 + defReduction(targetDefOf(S, T, ti, round))) * (1 - (er.slotPhysResist?.[ti] || 0)))
        * (h.isBurn ? 1 - (er.burnDmgResist || 0) : 1); // Tidal Wave
      const crit = critMul(); if (crit > 1) crits++;
      const dmg = Math.max(1, Math.round(base * defMult * crit * S.terrMult
        * vsMult(S, T, ti, h.kind === "normalExtra" ? "cmd" : "skill", h.stat === "foc") * resistMult(T, S, null)));
      lostSum += damageSlot(T, ti, dmg, round);
      sum += dmg;
      if (h.onKillBonus && T.slotHp[ti] <= 0) { // Game Over max: a kill → next skill activation +X%
        S.cs.pendingSkillBonus = Math.max(S.cs.pendingSkillBonus || 0, h.onKillBonus);
        roundLog.actions.push({ actor:who, action:`💀 ${h.label || "Skill"} — kill! Next skill DMG +${Math.round(h.onKillBonus * 100)}%`, dmg:0, isSkill:true, isPlayer:S.isPlayer });
      }
    }
    dealtTotal += sum;
    if (!(h.pct > 0) && h.dot && targets.length) roundLog.actions.push({ actor:who, action:`${h.dot.kind === "venom" ? "🐍" : "🩸"} ${h.label || "DoT"} ${targets.length > 1 ? `→ ${targets.length} units` : unitLabel(T, targets[0])} (${h.dot.kind})`, dmg:0, isSkill:true, isPlayer:S.isPlayer });
    if (sum > 0 || evaded) roundLog.actions.push({ actor:who,
      action: `${h.kind === "burn" ? "🔥" : "✨"} ${h.label || "Skill"} ${targets.length > 1 ? `→ ${targets.length} units` : unitLabel(T, targets[0])}${crits ? ` (${crits} CRIT)` : ""}${evaded ? ` (${evaded} evaded)` : ""}`,
      dmg: sum, ...hitFields(S, T, lostSum), isSkill: true });
  }
  if (r.lifesteal > 0 && S.blockHealRounds <= 0 && dealtTotal > 0) {
    const gain = healSideHp(S, Math.round(dealtTotal * r.lifesteal));
    S.dmgPool = Math.max(0, S.dmgPool - gain);
    const t = Math.round(gain / S.hpPer);
    if (t > 0) roundLog.actions.push({ actor:who, action:`🧛 Lifesteal +${t} troops`, dmg:-t, isSkill:true, isHeal:true, isPlayer:S.isPlayer });
  }
};

// Troop slot action
const slotAct = (S, idx, T, round, roundLog) => {
  const r = S.rs, er = T.rs, sl = S.slots[idx];
  if (!sl || !sl.tierData || S.slotHp[idx] <= 0 || hpOf(T) <= 0) return;
  const label = S.isPlayer ? (sl.branchDef?.label || `Slot ${idx+1}`) : "Defenders";
  const unitName = sl.branchDef?.label || (S.isPlayer ? `Slot ${idx+1}` : `Defenders ${idx+1}`);
  if (er.enemyNullified) return;
  const resists = () => Math.random() < (r.debuffResistChance || 0);
  const stunnedHere = er.enemyStunned > 0 || er.stunnedUnits?.has(idx);
  const stunImmune = r.unitStunImmuneAll || r.earlyRoundStunImmune || r.slotStunImmune?.has(idx) || (r.invisStunImmune && r.invisibleSlots?.has(idx));
  if (stunnedHere && !stunImmune && !resists()) return;
  const confusedHere = er.enemyConfused > 0 || er.confusedUnits?.has(idx) || r.selfConfusedUnits?.has(idx);
  if (confusedHere) {
    if (r.selfConfusedUnits?.has(idx)) r.selfConfusedUnits.delete(idx); // own skill (Whatever It Takes)
    else if (er.confusedUnits?.has(idx)) er.confusedUnits.delete(idx); else er.enemyConfused--;
    if (!r.atkConfusionImmune && !r.slotConfusionImmune?.has(idx) && !resists() && Math.random() < 0.5) {
      const selfDmg = calcTroopDmg(sl.branchDef, sl.tierData, sl.def, 0, S.command, 1, 0, false, 1, [], round);
      const prev = S.slotHp[idx];
      S.slotHp[idx] = Math.max(0, S.slotHp[idx] - selfDmg);
      S.lostHp += prev - S.slotHp[idx]; S.dmgPool += prev - S.slotHp[idx];
      roundLog.actions.push({ actor:label, action:`😵 Confused! ${unitName} attack own ranks — ${Math.max(0, Math.round((prev - S.slotHp[idx]) / sl.hpPer))} casualties`, dmg:selfDmg, isPlayer:!S.isPlayer, isConfused:true });
      return;
    }
  }
  if (!r.pursuitActive) { // Pursuit: attacks cannot miss or be evaded
    if (er.blindedUnits?.has(idx)) { er.blindedUnits.delete(idx); roundLog.actions.push({ actor:label, action:`🌑 ${unitName} is Blinded — missed!`, dmg:0, isPlayer:S.isPlayer }); return; }
    if (Math.random() < (er.enemyMissChance || 0)) { roundLog.actions.push({ actor:label, action: S.isPlayer ? `${unitName} missed!` : "Enemy troops missed!", dmg:0, isPlayer:S.isPlayer }); return; }
  }
  if ((er.onEnemyAttackBurnChance || 0) > 0 && Math.random() < er.onEnemyAttackBurnChance) {
    const bm = er.burnedUnits || (er.burnedUnits = new Map()); // only the attacking unit is Burned
    bm.set(idx, Math.max(bm.get(idx) || 0, 0.20)); er.burnApplied = true;
    roundLog.actions.push({ actor:label, action:`🔥 ${unitName} Burned while attacking!`, dmg:0, isPlayer:!S.isPlayer, isTroopSkill:true });
  }

  // on_hit troop skills of the acting slot → its own side's state
  const logFrom = roundLog.actions.length;
  procTroopSkills(sl.skills, "on_hit", S.skillLevels, r, roundLog, sl.branchDef?.label || label, T.slots[0]?.branch ?? T.cmdObj?.troopBranch ?? null, round, S.slots, sl);
  tagSide(roundLog, logFrom, S);

  const hits = r.troopDoubleAtk ? 2 : 1;
  const rangedReduce = (sl.branchDef?.role === "ranged" && er.rangedDmgReduce > 0) ? er.rangedDmgReduce : 0;
  let ti = null;
  for (let hi = 0; hi < hits; hi++) {
    if (hpOf(T) <= 0) break;
    ti = pickTargets(T, 1)[0];          // one target unit, frontline first
    if (ti == null) break;
    if (!r.pursuitActive && targetEvades(S, T, ti)) { roundLog.actions.push({ actor:label, action:`💨 Attack evaded ${unitLabel(T, ti)}!`, dmg:0, isPlayer:S.isPlayer }); continue; }
    const sizeMod = troopSizeModifier(sl.branchDef?.size ?? null, T.slots[ti]?.branchDef?.size ?? T.primaryBranchDef?.size ?? null);
    const modSum = (r.troopAtkMult - 1) + (r.enemyDmgTakenUp || 0)
      - (er.enemyAtkReduce || 0) - (er.enemyDmgReduce || 0) - (er.troopDmgReduce || 0) - (er.dmgReduce || 0) - rangedReduce - (er.enemyBurnPenalty || 0)
      - (sl.branchDef?.dmgType === "magical" ? (er.focusDmgResist || 0) : 0);
    const tDef = targetDefOf(S, T, ti, round);
    let dmg = calcTroopDmg(sl.branchDef, sl.tierData, tDef, 0, S.command, S.terrMult,
      modSum, false, sizeMod, r.followupSources || [], round) * vsMult(S, T, ti, "troops", sl.branchDef?.dmgType === "magical") * resistMult(T, S, sl)
      * (r.slotAtkMult?.[idx] ?? 1) * (r.slotBurnImmune?.has(idx) ? 1 : 1 - (er.burnedUnits?.get(idx) || 0))   // this unit Burned: DMG dealt -X%
      * ((er.minDmgUnits?.has(idx) && sl.tierData) ? sl.tierData.dmgLo / ((sl.tierData.dmgLo + sl.tierData.dmgHi) / 2) : 1) // Powerful Suppression
      * ((T.cs.frostbite?.get(idx) || 0) >= round ? 1 - (er.frostbiteDmgPenalty ?? 0.40) : 1) // Frostbite: this unit deals -40%
      * (sl.branchDef?.dmgType === "magical" ? 1 - (er.slotFocusResist?.[ti] || 0) : 1 - (er.slotPhysResist?.[ti] || 0))
      * (((r.slotMaxDmgChance?.[idx] || 0) > 0 && Math.random() < r.slotMaxDmgChance[idx] && sl.tierData)   // "max damage" proc
          ? sl.tierData.dmgHi / ((sl.tierData.dmgLo + sl.tierData.dmgHi) / 2) : 1);
    if (r.troopBonusDmgMult > 0) {
      const bonus = Math.round(dmg * r.troopBonusDmgMult);
      dmg += bonus;
      roundLog.actions.push({ actor:label, action:`💥 Bonus strike +${bonus} dmg`, dmg:bonus, isPlayer:S.isPlayer, isTroopSkill:true });
      // One on_hit proc buffs exactly one hit (procs roll once per round, not per hit)
      r.troopBonusDmgMult = 0;
    }
    dmg = Math.max(1, Math.round(dmg));
    const lost = damageSlot(T, ti, dmg, round);
    roundLog.actions.push({ actor:label, action:`${unitName} attack${ti != null ? ` ${unitLabel(T, ti)}` : ""}${hits>1?` (hit ${hi+1}/2)`:""}`, dmg, ...hitFields(S, T, lost) });
    // Tough Skin: physical hits on those units reflect X% back to the attacking unit
    if (er.thorns?.idx.has(ti) && sl.branchDef?.dmgType !== "magical" && S.slotHp[idx] > 0) {
      const back = Math.max(1, Math.round(dmg * er.thorns.v)), prev = S.slotHp[idx];
      S.slotHp[idx] = Math.max(0, prev - back);
      S.lostHp += prev - S.slotHp[idx]; S.dmgPool += prev - S.slotHp[idx]; S.dmgRound = round;
      roundLog.actions.push({ actor: T.isPlayer ? "Troops" : "Defenders", action:`🦎 Tough Skin — ${unitName} takes ${back} damage`, dmg:back, isPlayer:T.isPlayer, isTroopSkill:true });
    }
  }

  // on_hit_received — the unit that was hit reacts (into the target's own state)
  const hitSlot = T.slots[ti ?? 0];
  if (hitSlot) {
    const from2 = roundLog.actions.length;
    procTroopSkills(hitSlot.skills, "on_hit_received", T.skillLevels, er, roundLog, T.isPlayer ? (hitSlot.branchDef?.label || "Troops") : "Defenders", sl.branch ?? null, round, T.slots, hitSlot);
    tagSide(roundLog, from2, T);
  }

  // Counter attack — the TARGET's counter skill hits back at 50% (was triggered by the attacker's own skill)
  if (er.troopCounterAtk && hpOf(T) > 0 && S.slotHp[idx] > 0 && hitSlot?.tierData && T.slotHp[ti ?? 0] > 0) {
    const ts = hitSlot;
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
// Clear the Air: the other side loses its positive stat buffs this round
for (const S of [A, D]) if (S.rs.enemyBuffStripped) stripBuffs(other(S));
// Bone Crusher: those enemy units lose their own per-unit buffs
for (const S of [A, D]) {
  const r = other(S).rs;
  for (const i of S.rs.buffBlockUnits || []) {
    if (r.slotAtkMult?.[i] > 1) r.slotAtkMult[i] = 1;
    if (r.slotDmgTakenMult?.[i] < 1) r.slotDmgTakenMult[i] = 1;
    if (r.slotSpdBonus?.[i] > 0) r.slotSpdBonus[i] = 0;
    for (const f of ["slotPhysResist", "slotFocusResist", "slotEvadeChance", "slotMaxDmgChance"]) if (r[f]) delete r[f][i];
    r.slotEvadeNext?.delete(i); r.slotStunImmune?.delete(i); r.slotConfusionImmune?.delete(i);
  }
}
// Ethereal Mending / Winter's Warmth: each allied unit sheds N debuffs the other side put on it
for (const S of [A, D]) {
  const n = S.rs.cleanseUnits || 0, T = other(S), er = T.rs;
  if (!n) continue;
  er.enemyStunned = 0; er.enemyConfused = 0;
  S.slots.forEach((sl, i) => {
    if ((S.rs.cleanseChance || 0) > 0 && Math.random() >= S.rs.cleanseChance) return; // Völva's Blessing: X% per unit
    let left = n;
    for (const set of [er.stunnedUnits, er.confusedUnits, er.blindedUnits, er.minDmgUnits]) if (left > 0 && set?.delete(i)) left--;
    if (left > 0 && er.burnedUnits?.delete(i)) left--;
    for (const f of ["unitDefFlatDown", "unitSpdDown"]) if (left > 0 && er[f]?.[i]) { delete er[f][i]; left--; }
    if (left > 0) { const k = T.dots.findIndex(d => d.ti === i); if (k >= 0) { T.dots.splice(k, 1); left--; } }
    if (left > 0 && T.cs.lifeDrain?.has(i)) { T.cs.lifeDrain.delete(i); left--; }
    if (left > 0 && T.cs.frostbite?.has(i)) { T.cs.frostbite.delete(i); left--; }
  });
}
// You Get a Heal!: units of the branch that a debuff landed on this round heal X% (once per round)
for (const S of [A, D]) {
  const h = S.rs.branchHealOnDebuff, er = other(S).rs;
  if (!h || !S.slots.length) continue;
  const all = (er.enemyStunned || 0) > 0 || (er.enemyConfused || 0) > 0 || (er.enemyBurnPenalty || 0) > 0 || (er.enemyDefDown || 0) > 0 || (er.enemyDefFlatDown || 0) > 0 || (er.enemySpdFlatDown || 0) > 0;
  const hit = new Set([...(er.stunnedUnits || []), ...(er.confusedUnits || []), ...(er.burnedUnits?.keys() || []), ...(er.blindedUnits || []),
    ...Object.keys(er.unitDefFlatDown || {}).map(Number), ...Object.keys(er.unitSpdDown || {}).map(Number), ...other(S).dots.filter(d => d.start <= round + 1).map(d => d.ti)]);
  const pred = skillSlotPred(h.branch), tot = S.slots.reduce((t, sl) => t + (sl.troops || 0), 0) || 1;
  const share = S.slots.reduce((t, sl, i) => t + (pred(sl) && S.slotHp[i] > 0 && (all || hit.has(i)) ? (sl.troops || 0) : 0), 0) / tot;
  if (share > 0) S.rs.healPct += h.healPct * share;
}

// 2) DoT ticks — each DoT damages the unit it was applied to (venom = applier's FOC, bleed = applier's ATK)
for (const S of [A, D]) {
  const T = other(S), agg = new Map();
  for (const d of S.dots) {
    if (d.start > round) continue;
    if ((T.slotHp[d.ti] || 0) <= 0) { d.rounds = 0; continue; }
    if (d.kind === "venom" && T.rs.slotVenomImmune?.has(d.ti)) { d.rounds--; continue; } // Dragon Scales
    const dmg = Math.max(1, Math.round((d.kind === "venom" ? S.focStat * (1 - (T.rs.slotFocusResist?.[d.ti] || 0)) : S.atkStat) * d.pct));
    const prev = T.slotHp[d.ti];
    T.slotHp[d.ti] = Math.max(0, prev - dmg);
    const lost = prev - T.slotHp[d.ti];
    T.lostHp += lost; T.dmgPool += lost; if (lost > 0) T.dmgRound = round;
    const k = `${d.kind}:${d.ti}`, a = agg.get(k) || { kind: d.kind, ti: d.ti, dmg: 0, lost: 0, n: 0 };
    a.dmg += dmg; a.lost += lost; a.n++; agg.set(k, a);
    d.rounds--;
  }
  S.dots = S.dots.filter(d => d.rounds > 0 && (T.slotHp[d.ti] || 0) > 0);
  for (const a of agg.values()) roundLog.actions.push({ actor:S.name,
    action:`${a.kind === "venom" ? "🐍 Venom" : "🩸 Bleed"} ${unitLabel(T, a.ti)}${a.n > 1 ? ` (${a.n} stacks)` : ""}`,
    dmg:a.dmg, ...hitFields(S, T, a.lost), isSkill:true });
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
  // Life Drain: the share of healing that would go to drained units is lost, and 50% of it hits them instead
  const drained = [...(other(S).cs.lifeDrain || [])].filter(([i, until]) => until >= round && S.slotHp[i] > 0).map(([i]) => i);
  const missing = S.slotHp.map((h, i) => Math.max(0, (S.slotMax[i] || 0) - h)), missTot = missing.reduce((t, x) => t + x, 0);
  const drainFrac = drained.length && missTot > 0 ? drained.reduce((t, i) => t + missing[i], 0) / missTot : 0;
  const drainHit = (amt) => {
    if (!(drainFrac > 0) || amt <= 0) return amt;
    const lostHeal = amt * drainFrac;
    let hurt = 0;
    for (const i of drained) { const d = Math.round(lostHeal * 0.5 * missing[i] / Math.max(1, drained.reduce((t, k) => t + missing[k], 0))); const p = Math.min(S.slotHp[i], d); S.slotHp[i] -= p; hurt += p; }
    S.lostHp += hurt; S.dmgPool += hurt;
    if (hurt > 0) roundLog.actions.push({ actor: other(S).name, action: `🩸 Life Drain — healing turned to damage`, dmg: hurt, ...hitFields(other(S), S, hurt), isSkill: true });
    return amt - lostHeal;
  };
  if (S.rs.healPct > 0 && S.lostHp > 0) {
    const restored = healSideHp(S, Math.round(drainHit(S.lostHp * S.rs.healPct * (1 + (S.rs.healReceivedBonus || 0)) * (1 - (S.rs.healCut || 0)))));
    const troopsBack = Math.round(restored / hpDiv);
    if (troopsBack > 0) roundLog.actions.push({ actor:S.name, action:`💚 ${troopsBack} troops restored (passive)`, dmg:-troopsBack, isSkill:true, isHeal:true, troopsBack,
      ...(S.isPlayer ? { atkRemaining:Math.round(hpOf(S)/hpDiv) } : { isPlayer:false, defRemaining:Math.round(hpOf(S)/hpDiv) }) });
  }
  if (S.rs.skillHealCoeff > 0) {
    const healAmt = calcCmdHeal(S.command, S.rs.skillHealCoeff, S.rs.recoveryModSum || 0, S.dmgPool, round, S.dmgRound);
    const done = healSideHp(S, Math.max(0, Math.round(drainHit(healAmt * (1 + (S.rs.healReceivedBonus || 0)) * (1 - (S.rs.healCut || 0))))));
    S.dmgPool = Math.max(0, S.dmgPool - done);
    const troopsBack2 = Math.round(done / hpDiv);
    if (troopsBack2 > 0) roundLog.actions.push({ actor:S.name, action:`💚 ${troopsBack2} troops healed (skill)`, dmg:-troopsBack2, isSkill:true, isHeal:true, troopsBack:troopsBack2,
      ...(S.isPlayer ? { atkRemaining:Math.round(hpOf(S)/hpDiv) } : { isPlayer:false, defRemaining:Math.round(hpOf(S)/hpDiv) }) });
  }
}

// 8) % max-HP strikes → one unit (frontline first), X% of that unit's max HP
for (const S of [A, D]) {
  const T = other(S);
  if (S.rs.cmdPctDmg > 0 && hpOf(T) > 0) {
    const ti = frontlineOf(T)[0];
    const isCrit = Math.random() < S.rs.critChance;
    const dmg    = Math.max(1, Math.round((T.slotMax[ti] || 0) * S.rs.cmdPctDmg * (isCrit ? 1.5 : 1.0)));
    const lost   = damageSlot(T, ti, dmg, round);
    roundLog.actions.push({ actor:S.name, action:`💀 % HP strike ${unitLabel(T, ti)}${isCrit?" (CRIT!)":""}`, dmg, ...hitFields(S, T, lost), isSkill:true });
  }
}

// 9) Speed order: both commanders + every slot. Own SPD buffs up, enemy SPD-down debuffs down.
const order = [];
for (const S of [A, D]) {
  const T = other(S);
  order.push({ side:S, cmd:true, spd:S.spd + (S.rs.cmdSpdBonus || 0) - (T.rs.enemySpdFlatDown || 0) });
  S.slots.forEach((sl, idx) => order.push({ side:S, slotIdx:idx, spd:sl.spd + (S.rs.slotSpdBonus?.[idx] || 0) - (T.rs.enemySpdFlatDown || 0) - (T.rs.unitSpdDown?.[idx] || 0)
    - ((T.cs.frostbite?.get(idx) || 0) >= round ? (T.rs.frostSpdDown || 0) : 0) })); // Permafrost / The Long Winter
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

// Legacy DoT flags (troop skills / factions not converted yet) → a DoT on the enemy's frontline unit, ticking next round
for (const S of [A, D]) {
  const T = other(S), ti = frontlineOf(T)[0];
  if (ti == null) continue;
  if ((S.rs.pendingVenomDmg || 0) > 0 && !S.rs.venomConverted) S.dots.push({ ti, kind: "venom", pct: S.rs.pendingVenomDmg, rounds: 1, start: round + 1 });
  if (S.rs.bleedApplied && !S.rs.bleedConverted) S.dots.push({ ti, kind: "bleed", pct: S.rs.pendingBleedDmg || 0.30, rounds: S.rs.bleedRoundsLeft || 2, start: round + 1 });
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
// Troops per slot from that slot's own HP per troop (mixed armies: a Golem has far more HP than a Spellblade)
const defTroopsLeft   = D.slots.length
  ? Math.max(0, D.slots.reduce((t, sl, i) => t + Math.max(0, D.slotHp[i]) / ((sl.hpPer || defTroopHpPer) * (D.bastion ? 2 : 1)), 0) | 0)
  : Math.max(0, Math.round(defTroopHp / defTroopHpPer));
const atkSlotLost     = A.slots.map((sl, i) => Math.max(0, (A.slotMax[i] - Math.max(0, A.slotHp[i])) / ((sl.hpPer || atkTroopHpPer) * bastionHpMult)));
const lostFromHp      = Math.round(atkSlotLost.reduce((t, x) => t + x, 0) * (1 - Math.min(0.5, A.rs?.troopLossReduce || 0))); // Tiler: fewer losses on unowned land
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
  const sumLost = atkSlotLost.reduce((t, x) => t + x, 0);
  const lost = Math.min(sl.troops, Math.round(sumLost > 0 ? (atkSlotLost[idx] || 0) * finalAtkLost / sumLost : sl.troops * atkLostFraction)); // each slot's own losses
  return Math.max(0, sl.troops - lost);
});
report.defTroopsEnd  = defTroopsLeft;
report.xpGain        = xpGain;
report.pct           = pct;
report.atkTroopsWounded = Math.floor(finalAtkLost * 0.30);
report.totalAtkTroops = totalAtkTroops;

return { won, isDraw, lost:finalAtkLost, atk:Math.round(atkPow), def:Math.round(defPow), pct, mod, modLabel, xpGain, report };
}
