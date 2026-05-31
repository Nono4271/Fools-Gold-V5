// src/workers/spawn.worker.js
// ─────────────────────────────────────────────────────────────────────────────
// Incoming messages:
//   { type:'init',      eligibleKeys, regionCount } — place initial spawns
//   { type:'defeated',  spawnKey }                  — mark defeated, start timer
//   { type:'tick' }                                 — check respawns (every 30s)
//   { type:'checkRadius', cx, cr, radius }          — auto-reset if all defeated
//   { type:'forceSpawn',  level, eligibleKeys, cx, cr, radius } — guarantee spawn
//   { type:'get' }                                  — return current spawns
// Outgoing:
//   { type:'spawns',    spawns }
//   { type:'respawned', spawnKey, spawn }
// ─────────────────────────────────────────────────────────────────────────────

const SPAWN_LEVELS      = [6, 10, 12, 15, 20, 25, 30, 35, 40];
const RESPAWN_MS        = 30 * 60 * 1000;
const SPAWNS_PER_REGION = 100;
const SEARCH_RADIUS     = 100;

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

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
function hashKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function keyDist(key, cc, cr) {
  const comma = key.indexOf(',');
  const c = +key.slice(0, comma), r = +key.slice(comma + 1);
  return Math.sqrt((c - cc) ** 2 + (r - cr) ** 2);
}

const CREATURE_PORTRAITS = {
  0: [{ faction:"orcs",faction:"orcs",branch:"grunts",tier:0 },{ faction:"dragons",branch:"dragonkin",tier:0 },{ faction:"nightcreatures",branch:"vampires",tier:0 }],
  1: [{ faction:"ashen_dead",branch:"mummies",tier:1 },{ faction:"nightcreatures",branch:"werewolves",tier:1 },{ faction:"dragons",branch:"drake_riders",tier:1 }],
  2: [{ faction:"orcs",branch:"trolls",tier:2 },{ faction:"ashen_dead",branch:"death_cavalry",tier:2 },{ faction:"nightcreatures",branch:"spiders",tier:2 }],
};
const HUMAN_PORTRAITS = {
  0: [{ faction:"wizards",branch:"spellblades",tier:0 },{ faction:"coldborns",branch:"raiders",tier:0 },{ faction:"holyknights",branch:"battlepriests",tier:0 }],
  1: [{ faction:"pirates",branch:"gunners",tier:1 },{ faction:"wizards",branch:"acolytes",tier:1 },{ faction:"coldborns",branch:"bear_riders",tier:1 }],
  2: [{ faction:"wizards",branch:"golems",tier:2 },{ faction:"holyknights",branch:"inquisitors",tier:2 },{ faction:"pirates",branch:"sea_beasts",tier:2 }],
};

function spawnTierIdx(level) { return level <= 12 ? 0 : level <= 25 ? 1 : 2; }

function pickPortraitRef(level, rng) {
  const pool = CREATURE_PORTRAITS[spawnTierIdx(level)];
  return pool[Math.floor(rng() * pool.length)];
}

function makeSpawn(key, level) {
  const rng = seededRng(hashKey(key));
  return {
    key, level,
    defeated: false, defeatedAt: null, respawnAt: null,
    xpReward:  SPAWN_XP[level]  ?? 864,
    orbReward: SPAWN_ORBS[level] ?? 2,
    slot1TroopRef: pickPortraitRef(level, rng),
  };
}

// ── Spawn state ───────────────────────────────────────────────────────────────
const spawns = new Map();

// ── Placement using pre-built eligible key list ───────────────────────────────
function placeSpawns(eligibleKeys) {
  console.log('[SPAWN WORKER] placeSpawns called with', eligibleKeys?.length, 'keys');
  if (!eligibleKeys?.length) return;
  const rng = seededRng(eligibleKeys.length * 7919);
  const shuffled = [...eligibleKeys].sort(() => rng() - 0.5);
  const total = Math.min(SPAWNS_PER_REGION, shuffled.length);
  for (let i = 0; i < total; i++) {
    const key = shuffled[i];
    const level = SPAWN_LEVELS[i % SPAWN_LEVELS.length];
    spawns.set(key, makeSpawn(key, level));
  }
}

// ── Auto-reset: if all spawns in radius are defeated, reset them ──────────────
function checkAndAutoReset(cc, cr) {
  const inRadius = [...spawns.values()].filter(sp => keyDist(sp.key, cc, cr) <= SEARCH_RADIUS);
  if (!inRadius.length) return false;
  const allDefeated = inRadius.every(sp => sp.defeated);
  if (!allDefeated) return false;
  // Reset all in radius
  inRadius.forEach(sp => {
    sp.defeated = false;
    sp.defeatedAt = null;
    sp.respawnAt = null;
  });
  self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
  return true;
}

// ── Force-spawn: guarantee a spawn of given level in radius ──────────────────
function forceSpawn(level, eligibleKeys, cc, cr) {
  // First: check if one already exists active in radius
  const existing = [...spawns.values()].find(
    sp => sp.level === level && !sp.defeated && keyDist(sp.key, cc, cr) <= SEARCH_RADIUS
  );
  if (existing) return existing; // already there, nothing to do

  // Check if a defeated one exists — just reset it
  const defeated = [...spawns.values()].find(
    sp => sp.level === level && sp.defeated && keyDist(sp.key, cc, cr) <= SEARCH_RADIUS
  );
  if (defeated) {
    defeated.defeated = false;
    defeated.defeatedAt = null;
    defeated.respawnAt = null;
    self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
    return defeated;
  }

  // No spawn of that level in radius at all — find nearest eligible tile and place one
  const keysInRadius = (eligibleKeys || [])
    .filter(k => !spawns.has(k) && keyDist(k, cc, cr) <= SEARCH_RADIUS)
    .sort((a, b) => keyDist(a, cc, cr) - keyDist(b, cc, cr));

  if (keysInRadius.length) {
    const key = keysInRadius[0];
    const sp = makeSpawn(key, level);
    spawns.set(key, sp);
    self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
    return sp;
  }

  // Last resort: override nearest existing spawn's level
  const nearest = [...spawns.values()]
    .filter(sp => keyDist(sp.key, cc, cr) <= SEARCH_RADIUS)
    .sort((a, b) => keyDist(a.key, cc, cr) - keyDist(b.key, cc, cr))[0];

  if (nearest) {
    nearest.level = level;
    nearest.defeated = false;
    nearest.defeatedAt = null;
    nearest.respawnAt = null;
    nearest.xpReward = SPAWN_XP[level] ?? 864;
    nearest.orbReward = SPAWN_ORBS[level] ?? 2;
    nearest.slot1TroopRef = pickPortraitRef(level, seededRng(hashKey(nearest.key)));
    self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
    return nearest;
  }
  return null;
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = ({ data }) => {
  switch (data.type) {

    case 'init': {
      spawns.clear();
      placeSpawns(data.eligibleKeys ?? []);
      console.log('[SPAWN WORKER] Sending', spawns.size, 'spawns');
  self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      break;
    }

    case 'defeated': {
      const sp = spawns.get(data.spawnKey);
      if (!sp) break;
      sp.defeated = true;
      sp.defeatedAt = Date.now();
      sp.respawnAt = Date.now() + RESPAWN_MS;
      self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      break;
    }

    case 'tick': {
      const now = Date.now();
      let changed = false;
      for (const sp of spawns.values()) {
        if (sp.defeated && sp.respawnAt && now >= sp.respawnAt) {
          sp.defeated = false; sp.defeatedAt = null; sp.respawnAt = null;
          self.postMessage({ type: 'respawned', spawnKey: sp.key, spawn: { ...sp } });
          changed = true;
        }
      }
      if (changed) self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      break;
    }

    case 'checkRadius': {
      checkAndAutoReset(data.cc, data.cr);
      break;
    }

    case 'forceSpawn': {
      forceSpawn(data.level, data.eligibleKeys, data.cc, data.cr);
      break;
    }

    case 'get': {
      self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      break;
    }
  }
};
