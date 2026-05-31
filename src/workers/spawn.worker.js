// src/workers/spawn.worker.js
// ─────────────────────────────────────────────────────────────────────────────
// Spawn system worker
// Manages spawn placement, respawn timers, and state
//
// Incoming messages:
//   { type: 'init',    tiles, facKey, regionCount }  — place initial spawns
//   { type: 'defeated', spawnKey }                   — mark spawn defeated, start respawn timer
//   { type: 'tick' }                                 — check for respawns (called every 30s from Game)
//
// Outgoing messages:
//   { type: 'spawns',   spawns }                     — full spawn map { [key]: SpawnState }
//   { type: 'respawned', spawnKey, spawn }            — single spawn respawned
// ─────────────────────────────────────────────────────────────────────────────

const SPAWN_LEVELS   = [6, 10, 12, 15, 20, 25, 30, 35, 40];
const RESPAWN_MS     = 30 * 60 * 1000; // 30 minutes
const SPAWNS_PER_REGION = 50;

const SPAWN_XP = {
   6:   864,  10:  1520, 12:  2712,
  15:  4860,  20:  7920, 25: 12000,
  30: 15840,  35: 27440, 40: 39840,
};

const SPAWN_ORBS = {
   6:  2,  10:  3,  12:  5,
  15:  8,  20: 12,  25: 16,
  30: 22,  35: 30,  40: 40,
};

// Seeded RNG — deterministic per spawnKey so same tile always same level
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Spawn state ───────────────────────────────────────────────────────────────
// { key, level, defeated, defeatedAt, respawnAt, xpReward, orbReward, slot1TroopRef }
const spawns = new Map();

// Troop pool for portrait display — same as spawnUtils but self-contained in worker
const CREATURE_PORTRAITS = {
  0: [
    { faction:"orcs",           branch:"grunts",        tier:0 },
    { faction:"dragons",        branch:"dragonkin",     tier:0 },
    { faction:"nightcreatures", branch:"vampires",      tier:0 },
  ],
  1: [
    { faction:"ashen_dead",     branch:"mummies",       tier:1 },
    { faction:"nightcreatures", branch:"werewolves",    tier:1 },
    { faction:"dragons",        branch:"drake_riders",  tier:1 },
  ],
  2: [
    { faction:"orcs",           branch:"trolls",        tier:2 },
    { faction:"ashen_dead",     branch:"death_cavalry", tier:2 },
    { faction:"nightcreatures", branch:"spiders",       tier:2 },
  ],
};

const HUMAN_PORTRAITS = {
  0: [
    { faction:"wizards",     branch:"spellblades",   tier:0 },
    { faction:"coldborns",   branch:"raiders",       tier:0 },
    { faction:"holyknights", branch:"battlepriests", tier:0 },
  ],
  1: [
    { faction:"pirates",     branch:"gunners",       tier:1 },
    { faction:"wizards",     branch:"acolytes",      tier:1 },
    { faction:"coldborns",   branch:"bear_riders",   tier:1 },
  ],
  2: [
    { faction:"wizards",     branch:"golems",        tier:2 },
    { faction:"holyknights", branch:"inquisitors",   tier:2 },
    { faction:"pirates",     branch:"sea_beasts",    tier:2 },
  ],
};

function spawnTierIdx(level) {
  return level <= 12 ? 0 : level <= 25 ? 1 : 2;
}

// Pick a random portrait ref for this spawn tile
// Without knowing player faction, default to creature pool (most common)
// Will be overridden per-player at sweep time
function pickPortraitRef(level, rng) {
  const tierIdx = spawnTierIdx(level);
  const pool = CREATURE_PORTRAITS[tierIdx];
  return pool[Math.floor(rng() * pool.length)];
}

// ── Placement ─────────────────────────────────────────────────────────────────
function placeSpawns(tiles) {
  // Eligible tiles: not owned, not HQ, not fort, P3–P10
  const eligible = Object.entries(tiles).filter(([, t]) => {
    return !t.owner
      && !t.isHQ
      && !t.isFort
      && (t.powerLevel ?? 0) >= 3
      && (t.powerLevel ?? 0) <= 10;
  });

  if (!eligible.length) return;

  // Shuffle with seeded random
  const rng = seededRng(eligible.length * 7919);
  const shuffled = [...eligible].sort(() => rng() - 0.5);

  // Aim for SPAWNS_PER_REGION, spread across levels
  const total = Math.min(SPAWNS_PER_REGION, shuffled.length);

  for (let i = 0; i < total; i++) {
    const [key] = shuffled[i];
    const levelIdx = i % SPAWN_LEVELS.length;
    const level    = SPAWN_LEVELS[levelIdx];

    const spawnRng = seededRng(hashKey(key));
    spawns.set(key, {
      key,
      level,
      defeated:    false,
      defeatedAt:  null,
      respawnAt:   null,
      xpReward:    SPAWN_XP[level]  ?? 864,
      orbReward:   SPAWN_ORBS[level] ?? 2,
      slot1TroopRef: pickPortraitRef(level, spawnRng),
    });
  }
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = ({ data }) => {
  switch (data.type) {

    case 'init': {
      spawns.clear();
      placeSpawns(data.tiles ?? {});
      self.postMessage({
        type:   'spawns',
        spawns: Object.fromEntries(spawns),
      });
      break;
    }

    case 'defeated': {
      const sp = spawns.get(data.spawnKey);
      if (!sp) break;
      sp.defeated   = true;
      sp.defeatedAt = Date.now();
      sp.respawnAt  = Date.now() + RESPAWN_MS;
      self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      break;
    }

    case 'tick': {
      const now = Date.now();
      const respawned = [];
      for (const [key, sp] of spawns) {
        if (sp.defeated && sp.respawnAt && now >= sp.respawnAt) {
          sp.defeated   = false;
          sp.defeatedAt = null;
          sp.respawnAt  = null;
          respawned.push(key);
          self.postMessage({ type: 'respawned', spawnKey: key, spawn: { ...sp } });
        }
      }
      if (respawned.length) {
        self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      }
      break;
    }

    case 'get': {
      self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      break;
    }
  }
};
