// Pure rules for tile protection and tile abandonment timers (moved from Game.jsx).
import { POWER_DEFS, SIEGE_BASE } from "../constants/map.js";
import { npcForPowerLevel, factionDefCmdForTile } from "../constants/heroes.js";

export const TILE_PROTECTION_MS = 3 * 60 * 1000; // after capture
export const TILE_DELETE_MS = 5 * 60 * 1000;     // abandoning an owned tile

// Drop expired protections. Returns the same object when nothing expired.
export function pruneProtections(protectedTiles, now) {
  const next = {};
  let changed = false;
  for (const [k, until] of Object.entries(protectedTiles)) {
    if (until > now) next[k] = until;
    else changed = true;
  }
  return changed ? next : protectedTiles;
}

// deletingTiles: { key: startedAt }. Seconds left per tile plus the keys now finished.
export function deletionStatus(deletingTiles, now) {
  const secsLeft = {};
  const expired = [];
  for (const [key, startedAt] of Object.entries(deletingTiles)) {
    const elapsed = now - startedAt;
    secsLeft[key] = Math.max(0, Math.ceil((TILE_DELETE_MS - elapsed) / 1000));
    if (elapsed >= TILE_DELETE_MS) expired.push(key);
  }
  return { secsLeft, expired };
}

// Whole seconds left until an absolute deadline (ms timestamp), never negative.
// Countdowns compare against a deadline instead of decrementing once per
// interval firing, so a throttled/backgrounded tab still shows the true time.
export function secsUntil(deadlineMs, now) {
  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

// Patch that returns an abandoned tile to neutral with a fresh defender.
export function abandonedTilePatch(tile, key, facKey) {
  const pl = tile.powerLevel || 1;
  const pd = POWER_DEFS[pl];
  const npc = npcForPowerLevel(pl);
  const [tc, tr] = key.split(",").map(Number);
  const npcCmd = () => ({ n:npc.n, icon:npc.icon, cls:npc.cls, faction:null, rarity:'soldier', lvl:pd.cmdLvl, troops:pd.command, troopBranch:npc.troopBranch, atk:npc.atk*pd.cmdLvl, spd:npc.spd+pd.cmdLvl*2 });
  let defCmd = null;
  if (pd) {
    if (pl >= 4) {
      const fc = factionDefCmdForTile(tc, tr, facKey, pl);
      defCmd = fc ? { ...fc, troops: pd.command } : npcCmd();
    } else defCmd = npcCmd();
  }
  return { owner:null, garrison:pd?pd.command:50, siege:tile.siegeMax??SIEGE_BASE, siegeMax:tile.siegeMax??SIEGE_BASE, defeatedWaves:[], resetAt:null, defCmd };
}
