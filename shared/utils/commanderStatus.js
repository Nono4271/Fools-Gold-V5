// Commander status rules (owner spec 2026-09-22). Pure.
//
// WOUNDED: a player-owned commander that loses a battle is Wounded for
// WOUNDED_MS. While wounded it can't do anything: no marches of any kind
// (attack/move/siege/reinforce/recall/reposition), no gathering, no
// commander training, no sweeps, no guarding, no stationing. The automatic
// retreat that follows a defeat is still allowed (that's the game moving the
// army home, not a player order).
//
// GUARD cooldown also lives here so every "can this commander act?" check
// reads one place.
export const WOUNDED_MS = 10 * 60 * 1000;

export function isWounded(cmd, now = Date.now()) {
  return !!cmd?.woundedUntil && now < cmd.woundedUntil;
}

export function woundedMsLeft(cmd, now = Date.now()) {
  return isWounded(cmd, now) ? cmd.woundedUntil - now : 0;
}

// Patch to apply to a commander that just lost.
export function woundedPatch(now = Date.now()) {
  return { woundedUntil: now + WOUNDED_MS };
}

export function fmtMsShort(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

// Single gate for every player-issued commander action.
export function canCommanderAct(cmd, now = Date.now()) {
  if (!cmd) return { ok: false, reason: "No commander" };
  if (isWounded(cmd, now)) return { ok: false, reason: `Wounded — ${fmtMsShort(woundedMsLeft(cmd, now))} left` };
  return { ok: true, reason: null };
}

// ── Guard ────────────────────────────────────────────────────────────────
export const GUARD_STAMINA_COST = 10;
export const GUARD_COOLDOWN_MS = 3 * 60 * 1000; // after a manual cancel

export function guardCooldownLeft(cmd, now = Date.now()) {
  return cmd?.guardCooldownUntil && now < cmd.guardCooldownUntil ? cmd.guardCooldownUntil - now : 0;
}

// Tiles a commander standing on `tk` guards: its own tile + the 8 around it,
// limited to tiles the player owns, crewmate-owned tiles, and the player's
// crew structure tiles (Fortress/Well/Outpost — those tiles are unowned).
// Never HQs or keeps.
export function guardCoverageKeys(tk, tiles, { crewmatePlayerIds = null, structureKeys = null } = {}) {
  if (!tk) return [];
  const [cc, cr] = tk.split(",").map(Number);
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const key = `${cc + dc},${cr + dr}`;
      const tile = tiles?.[key];
      if (!tile) continue;
      if (tile.isHQ || tile.isHQPart || tile.isKeep || tile.isKeepPart) continue;
      const mine = tile.owner === "player";
      const crew = !!(tile.ownerPlayerId && crewmatePlayerIds?.has?.(tile.ownerPlayerId));
      const structure = !!structureKeys?.has?.(key);
      if (mine || crew || structure) out.push(key);
    }
  }
  return out;
}
