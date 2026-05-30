// src/utils/recon.js
// ─────────────────────────────────────────────────────────────────────────────
// STUB: Recon tactic — scouts an unowned tile's garrison army.
// Free (no egg cost). Only works on AI/neutral garrison, not player armies.
// Result is pushed to the battle log as a { type:"recon" } entry.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a recon battle-log entry from a tile + garrison cmd.
 * Call this inside your onRecon handler, then push to setBattles.
 *
 * @param {string} tileKey
 * @param {object} tile        - selTile
 * @param {object} garrisonCmd - the garrison defender cmd object
 * @returns {object}           - battle log entry shaped for BattleLog
 */
export function buildReconEntry(tileKey, tile, garrisonCmd) {
  return {
    type:          "recon",           // flag for BattleLog to render differently
    timestamp:     Date.now(),
    tileKey,
    tileName:      tile.regionName ?? tileKey,
    powerLevel:    tile.powerLevel ?? 1,

    // Defender side only — same fields BattleLog already reads
    defCmdName:    garrisonCmd?.n        ?? "Garrison",
    defCmdIcon:    garrisonCmd?.icon     ?? "⚔",
    defLvl:        garrisonCmd?.lvl      ?? 1,
    defCmdCls:     garrisonCmd?.cmdCls   ?? null,
    defCmdStats:   garrisonCmd?.stats    ?? null,
    defSkillsSnapshot: garrisonCmd?.skills ?? [],
    defTroopBranch:garrisonCmd?.troopBranch ?? null,
    defTroopsStart:garrisonCmd?.troops   ?? 0,
    defTroopsEnd:  garrisonCmd?.troops   ?? 0, // garrison doesn't lose troops from recon
    defBust:       garrisonCmd?.bust     ?? null,

    // Attacker side intentionally empty — recon shows defender only
    atkName:  null,
    atkIcon:  null,
    won:      null,
  };
}
