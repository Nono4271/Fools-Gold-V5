// TEST MODE — pure admin rules (no React). Everything test-mode lives in
// src/testmode/; deleting that folder + the few marked mount points removes it.
import { HDEFS, applyXp, respectTotalFor, promotedStats, PROMO, RESPECT_MAX } from "../../shared/constants/heroes.js";
import { CMD_LVL_MIN, CMD_LVL_MAX, xpToNext } from "../../shared/constants/troops.js";
import { marchMsLeft } from "../../shared/utils/marchMotion.js";
import { hq3x3Keys } from "../../shared/utils/relocation.js";

// Is the test campaign button available in this build?
// On in `npm run dev`; in a deployed build only when VITE_TEST_MODE=1.
export const TEST_MODE_AVAILABLE = (() => {
  try { return !!(import.meta.env?.DEV || import.meta.env?.VITE_TEST_MODE === "1"); } catch { return false; }
})();

// Unlimited-currency targets — refilled to these the moment anything is spent.
export const TEST_TOPUP = { rss: 10_000_000, gems: 1_000_000 };

// ── Commanders ─────────────────────────────────────────────────────────────
export function newTestCommander(h, hqKey, stamina = 150, now = Date.now()) {
  return {
    ...h, uid: `t_${h.id}_${now}`, owner: "player", troops: 0, troopSlots: [], troopBranch: null,
    tk: hqKey, lvl: CMD_LVL_MIN, xp: 0, respectPoints: 0, respectLevel: 0,
    skillPoints: {}, unspentSkillPoints: 5, stamina,
    gear: { helmet: null, armor: null, bracers: null, accessory: null },
  };
}

// Every commander in the game the player doesn't own yet, any alignment.
export function missingCommanders(cmds, hqKey, stamina, now = Date.now()) {
  const owned = new Set((cmds || []).filter(c => c.owner === "player").map(c => c.id));
  return HDEFS.filter(h => !owned.has(h.id)).map(h => newTestCommander(h, hqKey, stamina, now));
}

// Set a commander's XP level (5–50). Raising uses the real XP path (stats,
// skill points, Lv20 class bonus). Lowering strips per-level stat growth and
// removes skill points — unspent first, then it refunds allocated skills.
export function adminSetLevel(cmd, target) {
  const to = Math.max(CMD_LVL_MIN, Math.min(CMD_LVL_MAX, Math.round(target)));
  const from = cmd.lvl ?? CMD_LVL_MIN;
  if (to === from) return cmd;
  if (to > from) {
    let need = -(cmd.xp ?? 0);
    for (let l = from; l < to; l++) need += xpToNext(l);
    return { ...applyXp(cmd, Math.max(1, need)), _classBonus: null };
  }
  const drop = from - to;
  const r1 = v => Math.round(v * 10) / 10;
  return {
    ...cmd, ...removeSkillPoints(cmd, drop), lvl: to, xp: 0,
    atk: r1((cmd.atk ?? 0) - (cmd.atkPerLevel ?? 0) * drop),
    foc: r1(Math.max(0, (cmd.foc ?? 0) - (cmd.focPerLevel ?? 0) * drop)),
    spd: r1((cmd.spd ?? 0) - (cmd.spdPerLevel ?? 0) * drop),
  };
}

// Remove `n` skill points: unspent ones first, then refund allocated skills.
function removeSkillPoints(cmd, n) {
  const unspent = cmd.unspentSkillPoints ?? 0;
  if (unspent >= n) return { skillPoints: cmd.skillPoints || {}, unspentSkillPoints: unspent - n };
  const allocated = Object.values(cmd.skillPoints || {}).reduce((s, v) => s + (v || 0), 0);
  return { skillPoints: {}, unspentSkillPoints: Math.max(0, unspent + allocated - n) };
}

// Promotion stat multipliers — must match RARITY_MULT in shared/constants/heroes.js
// (promotedStats multiplies atk/foc by the NEW rarity's value).
const PROMO_MULT = { veteran: 1.25, champion: 1.55 };
const RANK = { soldier: 0, veteran: 1, champion: 2 };

// Set respect level (0–15). Raising grants 1 skill point per level and applies
// promotions (soldier→veteran at 7, veteran→champion at 12) with their stat
// bumps. Lowering reverses all of that: skill points are removed and
// promotions are undone (never below the commander's natural rarity).
export function adminSetRespect(cmd, target) {
  const to = Math.max(0, Math.min(RESPECT_MAX, Math.round(target)));
  const from = cmd.respectLevel ?? 0;
  if (to === from) return cmd;
  let out = { ...cmd };
  if (to > from) {
    for (const r of ["soldier", "veteran"]) {
      if (out.rarity === r && to >= PROMO[r].respectRequired) out = { ...out, ...promotedStats(out, PROMO[r].to), rarity: PROMO[r].to };
    }
    out.unspentSkillPoints = (out.unspentSkillPoints ?? 0) + (to - from);
  } else {
    const natural = RANK[HDEFS.find(h => h.id === cmd.id)?.rarity] ?? 0;
    const demote = (fromR, toR) => {
      const m = PROMO_MULT[fromR];
      out = { ...out, rarity: toR, atk: Math.round((out.atk ?? 0) / m), foc: out.foc > 0 ? Math.round(out.foc / m) : 0 };
    };
    if (out.rarity === "champion" && to < PROMO.veteran.respectRequired && natural < RANK.champion) demote("champion", "veteran");
    if (out.rarity === "veteran" && to < PROMO.soldier.respectRequired && natural < RANK.veteran) demote("veteran", "soldier");
    out = { ...out, ...removeSkillPoints(out, from - to) };
  }
  return { ...out, respectLevel: to, respectPoints: respectTotalFor(to, out.rarity), _justPromoted: null };
}

// ── Timers ─────────────────────────────────────────────────────────────────
// Shift a march's clock so every remaining step is already due. The game
// loop then walks it to the end on its next tick and the normal arrival
// (battle, capture, station…) runs exactly as if the time had passed.
export function finishMarchPatch(march, now = Date.now()) {
  if (!march?.path?.length) return march;
  const left = marchMsLeft(march, now) + 1;
  return { ...march, startedAt: (march.startedAt ?? now) - left, lastStepTime: (march.lastStepTime ?? now) - left };
}

export function finishTrainingQueue(q, now = Date.now()) {
  const commandsLeft = Math.ceil((q.remaining || 0) / (q.commandSize || 1));
  return { ...q, nextAt: now - commandsLeft * (q.commandMs || 0) - 1 };
}

export function finishHealQueue(q) {
  const rate = Math.max(1, Math.floor((q.rate || 1)));
  return { ...q, creditMs: (q.remaining || 0) * 1000 / rate + 1000 };
}

// ── HQ relocation (bypasses ownership/region/cooldown/token/march rules) ──
// Still refuses pads that would break the map: off-map, keeps/gates/borders/
// camps/win tiles, another player's HQ, or impassable terrain.
const BAD_TERRAIN = new Set(["road", "hellfire", "river", "rockymountain"]);
export function adminRelocationCheck(centerKey, tiles, playerHqKey) {
  if (!centerKey) return { ok: false, reason: "Select a tile first" };
  if (centerKey === playerHqKey) return { ok: false, reason: "Already your HQ" };
  const [c, r] = centerKey.split(",").map(Number);
  const own = new Set(playerHqKey ? hq3x3Keys(...playerHqKey.split(",").map(Number)) : []);
  for (const k of hq3x3Keys(c, r)) {
    const t = tiles[k];
    if (!t) return { ok: false, reason: "Pad extends off the map" };
    if (t.isKeep || t.isKeepPart || t.isGate || t.isBorder || t.isCamp || t.isCampPart || t.isWin) return { ok: false, reason: "Pad overlaps a keep/gate/camp" };
    if ((t.isHQ || t.isHQPart) && !own.has(k)) return { ok: false, reason: "Pad overlaps another HQ" };
    if (BAD_TERRAIN.has(t.terrain)) return { ok: false, reason: `Pad has ${t.terrain} terrain` };
  }
  return { ok: true };
}
