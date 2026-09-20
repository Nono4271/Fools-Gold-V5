// src/utils/spawnUtils.js
// ─────────────────────────────────────────────────────────────────────────────
// Spawn system utilities — army generation, XP/reward tables, alignment logic
// ─────────────────────────────────────────────────────────────────────────────

import { FACTION_TROOPS }       from "../../shared/constants/troops.js";
import { getFactionAlignment }  from "../../shared/constants/factions.js";

// ── Spawn level config (from Rise to War reference table) ────────────────────
export const SPAWN_LEVELS = [6, 10, 12, 15, 20, 25, 30, 35, 40];

export const SPAWN_XP = {
   6:   864,
  10:  1520,
  12:  2712,
  15:  4860,
  20:  7920,
  25: 12000,
  30: 15840,
  35: 27440,
  40: 39840,
};

// Mystic orb reward per spawn level
export const SPAWN_ORBS = {
   6:  2,
  10:  3,
  12:  5,
  15:  8,
  20: 12,
  25: 16,
  30: 22,
  35: 30,
  40: 40,
};

// ── Troop tier by spawn level ─────────────────────────────────────────────────
// T1 = lv 6/10/12, T2 = lv 15/20/25, T3 = lv 30/35/40
export function spawnTierIdx(level) {
  if (level <= 12) return 0; // T1
  if (level <= 25) return 1; // T2
  return 2;                  // T3
}

// ── Troop pool — 9 per alignment ─────────────────────────────────────────────
// Creature spawns (fought by HUMAN players)
// Slot 1 portrait drives the on-tile visual
const CREATURE_TROOPS = {
  0: [ // T1
    { faction: "orcs",           branch: "grunts",       tier: 0 }, // Grunt
    { faction: "dragons",        branch: "dragonkin",    tier: 0 }, // Scaleblade
    { faction: "nightcreatures", branch: "vampires",     tier: 0 }, // Thrall
  ],
  1: [ // T2
    { faction: "ashen_dead",     branch: "mummies",      tier: 1 }, // Burial Guard
    { faction: "nightcreatures", branch: "werewolves",   tier: 1 }, // Howler
    { faction: "dragons",        branch: "drake_riders", tier: 1 }, // Drake Rider
  ],
  2: [ // T3
    { faction: "orcs",           branch: "trolls",       tier: 2 }, // Stone Crusher
    { faction: "ashen_dead",     branch: "death_cavalry",tier: 2 }, // Harbinger
    { faction: "nightcreatures", branch: "spiders",      tier: 2 }, // Broodmother
  ],
};

// Human spawns (fought by CREATURE players)
const HUMAN_TROOPS = {
  0: [ // T1
    { faction: "wizards",     branch: "spellblades",  tier: 0 }, // Runed Squire
    { faction: "coldborns",   branch: "raiders",      tier: 0 }, // Raider
    { faction: "holyknights", branch: "battlepriests",tier: 0 }, // Friar
  ],
  1: [ // T2
    { faction: "pirates",     branch: "gunners",      tier: 1 }, // Cannoneer (gunners T2)
    { faction: "wizards",     branch: "acolytes",     tier: 1 }, // Arcanist
    { faction: "coldborns",   branch: "bear_riders",  tier: 1 }, // Frostpaw Rider
  ],
  2: [ // T3
    { faction: "wizards",     branch: "golems",       tier: 2 }, // Void Colossus
    { faction: "holyknights", branch: "inquisitors",  tier: 2 }, // Grand Inquisitor
    { faction: "pirates",     branch: "sea_beasts",   tier: 2 }, // Kraken Spawn
  ],
};

// ── Troop slot count by spawn level ──────────────────────────────────────────
// 18 total: 6 T1 + 6 T2 + 6 T3
// Distributed across 3 slots, 2 of each tier per slot
export function buildSpawnTroopSlots(level) {
  const tierIdx   = spawnTierIdx(level);
  const alignment = level; // placeholder — actual alignment passed in
  // Returns 3 slots, each with 6 troops of the matching tier
  // Slot composition: 2× T1, 2× T2, 2× T3 — one slot per tier pair
  return [0, 1, 2].map(t => ({
    troopBranch: null, // resolved at runtime with alignment
    count: 6,
    tier: t,
  }));
}

// ── Commander name pool (pulled from existing garrison names) ─────────────────
const SPAWN_CMD_NAMES = [
  "The Forsaken", "Dread Hollow", "Ash Wanderer", "Grave Warden", "Void Shard",
  "Ruinborn",     "Pale Hunger",  "The Lurking",  "Dusk Tyrant",  "Iron Wraith",
  "Tomb Caller",  "Dust Revenant","Bone Shroud",  "The Restless", "Cinder March",
  "Hollow King",  "Blight Walker","The Unnamed",  "Cursed Veil",  "Last Breath",
];

// ── RSS reward pool ───────────────────────────────────────────────────────────
const RSS_TYPES = ["gas", "wood", "stone", "food"];

// Random between 1–4 RSS types, amounts scale with level
export function rollSpawnRssRewards(level, rng = Math.random) {
  const count    = Math.floor(rng() * 4) + 1; // 1–4 types
  const baseAmt  = Math.round(level * 80 + rng() * level * 40);
  const shuffled = [...RSS_TYPES].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map(rss => ({
    rss,
    amount: Math.round(baseAmt * (0.8 + rng() * 0.4)),
  }));
}

// Rare drop — 15% base chance, scales slightly with level
export function rollRareDrop(level, rng = Math.random) {
  const chance = 0.15 + (level / 40) * 0.10; // 15%–25%
  if (rng() > chance) return null;
  // TODO: expand with actual item pool when item system is built
  return { type: "mystic_shard", label: "Mystic Shard", icon: "💎" };
}

// ── Spawn commander generation ────────────────────────────────────────────────
// playerFacKey = the attacking player's faction → determines enemy alignment
export function generateSpawnCommander(level, playerFacKey, spawnId, rng = Math.random) {
  const playerAlignment = getFactionAlignment(playerFacKey);
  // Spawn uses opposite alignment troops
  const spawnAlignment  = playerAlignment === "humans" ? "creatures" : "humans";
  const pool            = spawnAlignment === "creatures" ? CREATURE_TROOPS : HUMAN_TROOPS;
  const tierIdx         = spawnTierIdx(level);

  // Pick one troop from each tier for the 3 slots, weighted toward spawn tier
  const slot1TroopRef = pool[tierIdx][Math.floor(rng() * pool[tierIdx].length)];
  const slot2TroopRef = pool[Math.max(0, tierIdx - 1)][Math.floor(rng() * pool[Math.max(0, tierIdx - 1)].length)];
  const slot3TroopRef = pool[Math.min(2, tierIdx + 1)][Math.floor(rng() * pool[Math.min(2, tierIdx + 1)].length)];

  // Stats scale with level — base commander stats
  const atk = Math.round(10 + level * 1.8);
  const foc = Math.round(8  + level * 1.2);
  const spd = Math.round(55 + level * 0.5);

  const name = SPAWN_CMD_NAMES[spawnId % SPAWN_CMD_NAMES.length];

  // Troop counts: 6 per slot = 18 total
  const mkSlot = (ref, count) => ({
    troopBranch: ref,
    troops:      count,
    maxTroops:   count,
  });

  return {
    uid:        `spawn_${spawnId}`,
    n:          name,
    icon:       "💀",
    isSpawn:    true,
    lvl:        Math.max(1, Math.round(level / 4)),
    xp:         0,
    atk, foc, spd,
    stamina:    150,
    isGuarding: false,
    march:      null,

    // Slot 1 drives the on-tile portrait
    slot1TroopRef,  // kept on spawn state for MapRenderer portrait path
    troopBranch: slot1TroopRef,
    troops:      6,
    maxTroops:   6,

    // All 3 slots (18 total troops)
    slots: [
      mkSlot(slot1TroopRef, 6),
      mkSlot(slot2TroopRef, 6),
      mkSlot(slot3TroopRef, 6),
    ],

    // Rewards attached at generation time
    xpReward:    SPAWN_XP[level]  ?? 864,
    orbReward:   SPAWN_ORBS[level] ?? 2,
  };
}

// ── Portrait path for tile display (slot 1 troop) ────────────────────────────
export function spawnTilePortraitPath(cmd) {
  const ref = cmd?.troopBranch;
  if (!ref?.faction || !ref?.branch) return null;
  return `/troops/${ref.faction}_${ref.branch}_t${(ref.tier ?? 0) + 1}_portrait.webp`;
}

// ── Spawn name/color by level ─────────────────────────────────────────────────
export function spawnDisplayName(level) {
  if (level <= 6)  return "Wandering Pack";
  if (level <= 12) return "Marauder Band";
  if (level <= 20) return "War Host";
  if (level <= 30) return "Dread Legion";
  return "Ancient Terror";
}

export function spawnAccentColor(level) {
  if (level <= 6)  return "#70aa60";
  if (level <= 12) return "#c0a040";
  if (level <= 20) return "#d07030";
  if (level <= 30) return "#cc4040";
  return "#a030c0";
}

// ── Respawn timer ─────────────────────────────────────────────────────────────
export const SPAWN_RESPAWN_MS = 30 * 60 * 1000; // 30 minutes

// ── Sweep eligibility ─────────────────────────────────────────────────────────
export function canSweepSpawn({ spawn, cmd, isTileInRange, spawnKey }) {
  if (!spawn || spawn.defeated)   return { ok: false, reason: "Spawn not active" };
  if (!cmd)                        return { ok: false, reason: "No commander selected" };
  if (cmd.march)                   return { ok: false, reason: "Commander is marching" };
  if (cmd.gathering || cmd.training) return { ok: false, reason: "Commander is busy" };
  if ((cmd.stamina ?? 150) < 10)  return { ok: false, reason: "Insufficient stamina" };
  if (!isTileInRange)              return { ok: false, reason: "Out of march range" };
  return { ok: true };
}
