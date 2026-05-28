import { COLS, ROWS } from "../constants/geometry.js";
import { FACTION_TROOPS } from "../constants/troops.js";

// Helper: look up troop spd from a cmd's troopBranch descriptor { faction, branch, tier }
function resolveTroopSpd(troopBranch) {
  if (!troopBranch) return null;
  const { faction, branch, tier = 0 } = troopBranch;
  const f = FACTION_TROOPS[faction];
  if (!f) return null;
  const b = f.branches.find(b => b.key === branch);
  if (!b) return null;
  return b.tiers[tier]?.spd ?? null;
}

// ── Impassable tile set ───────────────────────────────────────────────────────
// Populated once after map generation with ocean/border-mountain tile keys.
// Using a module-level Set avoids threading tiles through every adj() call.
const IMPASSABLE = new Set();

export function setImpassableTiles(keys) {
  IMPASSABLE.clear();
  for (const k of keys) IMPASSABLE.add(k);
}

export function adj(c, r) {
  const nbrs = [[c-1,r],[c+1,r],[c,r-1],[c,r+1]];
  return nbrs
    .filter(([tc,tr]) => {
      if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) return false;
      if (IMPASSABLE.has(`${tc},${tr}`)) return false;
      return true;
    })
    .map(([tc,tr]) => `${tc},${tr}`);
}

export function bfsPath(fromKey, toKey) {
  if (fromKey === toKey) return [fromKey];
  const parent = new Map();
  const queue  = [fromKey];
  parent.set(fromKey, null);
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const [cc, cr] = cur.split(',').map(Number);
    for (const nk of adj(cc, cr)) {
      if (parent.has(nk)) continue;
      parent.set(nk, cur);
      if (nk === toKey) {
        const path = [];
        let k = nk;
        while (k !== null) { path.push(k); k = parent.get(k); }
        return path.reverse();
      }
      queue.push(nk);
    }
  }
  return null;
}

// Normalise a commander to troopSlots array (backward compat with single troopBranch)
export function normaliseTroopSlots(cmd) {
  if (cmd?.troopSlots) return cmd.troopSlots;
  if (cmd?.troopBranch) return [{ branch: cmd.troopBranch, troops: cmd.troops ?? 0 }];
  return [];
}

export function effectiveMarchSpd(cmdSpd, troopBranchOrSlots, armySpdBonus = 0) {
  // Accept either a legacy troopBranch object or a troopSlots array
  let slots = null;
  if (Array.isArray(troopBranchOrSlots)) {
    slots = troopBranchOrSlots;
  } else if (troopBranchOrSlots) {
    slots = [{ branch: troopBranchOrSlots }];
  }
  if (!slots || slots.length === 0) return (cmdSpd || 60) + armySpdBonus;
  // Use slowest troop speed across all slots.
  // Each entry may be a slot object { branch, troops } or a raw branch object { faction, branch, tier }.
  let slowest = null;
  for (const sl of slots) {
    // If sl has a .branch sub-key it's a slot; otherwise treat sl itself as the branch descriptor
    const branchDesc = (sl && typeof sl === 'object' && 'faction' in sl) ? sl : sl?.branch;
    const spd = resolveTroopSpd(branchDesc);
    if (spd != null) {
      if (slowest == null || spd < slowest) slowest = spd;
    }
  }
  if (slowest == null) return (cmdSpd || 60) + armySpdBonus;
  return Math.round(slowest * 0.80 + ((cmdSpd || 60) + armySpdBonus) * 0.20);
}

export function marchStepMs(effSpd) {
  return Math.max(200, 1400 - (effSpd || 60) * 10);
}
