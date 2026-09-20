// ── Relocation Utilities ──────────────────────────────────────────────────────

// Faction start regions — fallback for forced relocation
export const FACTION_START_REGION = {
  pirates:        "frosthold",
  ashen_dead:     "duskmire",
  orcs:           "flamecrestpeak",
  holyknights:    "arcaneum",
  dragons:        "bloodrock",
  wizards:        "oathkeep",
  coldborns:      "deadmansharbor",
  nightcreatures: "bonehallow",
};

// All 9 keys in the 3x3 centered on (c,r)
export function hq3x3Keys(c, r) {
  const keys = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      keys.push(`${c + dc},${r + dr}`);
  return keys;
}

// 4-directional neighbors (no diagonals — only orthogonal adjacency matters for HQ proximity)
function neighbors4(c, r) {
  return [[c-1,r],[c+1,r],[c,r-1],[c,r+1]].map(([nc,nr]) => `${nc},${nr}`);
}

// Validate a candidate center tile key as a planned relocation pad.
// Rules (updated):
//   - All 9 tiles must be player-owned
//   - All 9 tiles must share the same regionKey
//   - All 9 tiles must be 1x1 (powerLevel 1-9, no special flags)
//   - None of the 9 tiles is adjacent to any other HQ (orthogonal only)
//   - Center is not already the player's HQ
export function validateRelocationPad(centerKey, tiles, allHqKeys, playerHqKey) {
  const comma = centerKey.indexOf(",");
  const c = +centerKey.slice(0, comma);
  const r = +centerKey.slice(comma + 1);
  const keys = hq3x3Keys(c, r);
  const centerTile = tiles[centerKey];
  if (!centerTile) return { valid: false, reason: "Tile not found" };
  const regionKey = centerTile.regionKey;

  for (const k of keys) {
    const t = tiles[k];
    if (!t) return { valid: false, reason: "Pad extends off map" };
    if (t.owner !== "player") return { valid: false, reason: "All 9 tiles must be player-owned" };
    if (t.regionKey !== regionKey) return { valid: false, reason: "All 9 tiles must be in the same region" };
    // PL 1-9 are valid (1x1 tiles); PL 10+ are keep/HQ tiles
    if (t.powerLevel > 9) return { valid: false, reason: "Pad tiles must be plain (P1-P9)" };
    if (t.isHQ || t.isHQPart || t.isKeep || t.isKeepPart || t.isGate || t.isBorder) {
      return { valid: false, reason: "Pad cannot contain special tiles" };
    }
  }

  // None of the 9 pad tiles may be orthogonally adjacent to any non-player HQ
  const otherHqKeys = new Set((allHqKeys || []).filter(k => k !== playerHqKey));
  for (const padKey of keys) {
    const pComma = padKey.indexOf(",");
    const pc = +padKey.slice(0, pComma);
    const pr = +padKey.slice(pComma + 1);
    for (const nk of neighbors4(pc, pr)) {
      if (otherHqKeys.has(nk)) return { valid: false, reason: "Pad is adjacent to another HQ" };
    }
  }

  if (keys.includes(playerHqKey)) return { valid: false, reason: "Already your HQ" };
  return { valid: true };
}

// Find a forced relocation center.
// Priority:
//   1. Any valid 3x3 pad in player-owned tiles (any region)
//   2. If none, find any 3x3 of player-owned tiles in the faction's capital region
//      (ignore HQ adjacency requirement for forced relocation)
//   3. If still none, return null (true game over)
export function findForcedRelocationPad(tiles, allHqKeys, playerHqKey, facKey) {
  // Gather all player-owned tiles grouped by region
  const byRegion = {};
  for (const [k, t] of Object.entries(tiles)) {
    if (t.owner !== "player") continue;
    if (t.isHQ || t.isHQPart || t.isKeep || t.isKeepPart || t.isGate || t.isBorder) continue;
    if (t.powerLevel > 9) continue;
    if (!t.regionKey) continue;
    if (!byRegion[t.regionKey]) byRegion[t.regionKey] = [];
    byRegion[t.regionKey].push(k);
  }

  // Try all owned regions for a clean valid pad
  const candidates = Object.values(byRegion).flat();
  shuffle(candidates);
  for (const centerKey of candidates) {
    const result = validateRelocationPad(centerKey, tiles, allHqKeys, playerHqKey);
    if (result.valid) return centerKey;
  }

  // Fallback: faction capital region — ignore HQ adjacency, just need 3x3 player-owned P1-P9
  const capitalRegion = FACTION_START_REGION[facKey];
  const capitalCandidates = (byRegion[capitalRegion] || []);
  shuffle(capitalCandidates);
  for (const centerKey of capitalCandidates) {
    const comma = centerKey.indexOf(",");
    const c = +centerKey.slice(0, comma);
    const r = +centerKey.slice(comma + 1);
    const keys = hq3x3Keys(c, r);
    const allValid = keys.every(k => {
      const t = tiles[k];
      return t && t.owner === "player" && t.powerLevel <= 9 &&
        !t.isHQ && !t.isHQPart && !t.isKeep && !t.isKeepPart && !t.isGate && !t.isBorder &&
        t.regionKey === capitalRegion;
    });
    if (allValid) return centerKey;
  }

  return null;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Planned / forced relocation rules (moved from Game.jsx) ──────────────────
export const RELOCATION_COOLDOWN_MS = 72 * 60 * 60 * 1000;

export function allHqKeyList(aiHqKeys, playerHqKey) {
  return Object.values(aiHqKeys || {}).flat().concat(playerHqKey ? [playerHqKey] : []);
}

// Checks run in the order the player sees them. Returns {ok:true} or {ok:false, reason}.
export function checkPlannedRelocation({ centerKey, tiles, aiHqKeys, playerHqKey, lastRelocateAt, cmds, consumables, now }) {
  const pad = validateRelocationPad(centerKey, tiles, allHqKeyList(aiHqKeys, playerHqKey), playerHqKey);
  if (!pad.valid) return { ok: false, reason: `⚠ ${pad.reason}` };
  if (lastRelocateAt && now - lastRelocateAt < RELOCATION_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((RELOCATION_COOLDOWN_MS - (now - lastRelocateAt)) / 3_600_000);
    return { ok: false, reason: `⏳ Cannot relocate for ${hoursLeft}h` };
  }
  if (cmds.some(c => c.owner === "player" && c.march)) return { ok: false, reason: "⚠ Recall all commanders before relocating" };
  const token = consumables.find(c => c.typeId === "relocation");
  if (!token || token.quantity <= 0) return { ok: false, reason: "⚠ No Relocation Tokens" };
  return { ok: true };
}

// Tile patches for moving the player HQ: old 3x3 reverts to neutral plain, new 3x3 is stamped.
export function hqMovePatches(oldCenterKey, newCenterKey, tiles, facKey) {
  const [nc, nr] = newCenterKey.split(",").map(Number);
  const newKeys = new Set(hq3x3Keys(nc, nr));
  const patches = [];
  if (oldCenterKey) {
    const [oc, or_] = oldCenterKey.split(",").map(Number);
    for (const k of hq3x3Keys(oc, or_)) {
      if (newKeys.has(k)) continue;
      patches.push([k, {
        isHQ: false, isHQPart: false, owner: null, faction: null,
        garrison: 0, garrisonTroops: 0, siege: 50, siegeMax: 50,
        defeatedWaves: [], resetAt: null, defCmd: null, hasAiCommander: false,
      }]);
    }
  }
  for (const k of newKeys) {
    const isCenter = k === newCenterKey;
    const existing = tiles[k];
    patches.push([k, {
      isHQ: isCenter, isHQPart: !isCenter, owner: "player", faction: facKey, garrison: 0,
      siege: existing?.siegeMax ?? 300, siegeMax: existing?.siegeMax ?? 300,
      defeatedWaves: [], resetAt: null, defCmd: null, hasAiCommander: false,
    }]);
  }
  return patches;
}
