// src/workers/spawn.worker.js
// Incoming:
//   { type:'init',       eligibleKeys }         — "c,r|regionKey" entries
//   { type:'defeated',   spawnKey }              — plain "c,r" key
//   { type:'tick' }
//   { type:'checkRadius', cc, cr }
//   { type:'forceSpawn',  level, eligibleKeys, cc, cr }
//   { type:'get' }
// Outgoing:
//   { type:'spawns',    spawns }   — keys are plain "c,r"
//   { type:'respawned', spawnKey, spawn }

const SPAWN_LEVELS      = [6, 10, 12, 15, 20, 25, 30, 35, 40];
const RESPAWN_MS        = 30 * 60 * 1000;
const SPAWNS_PER_REGION = 100;
const SEARCH_RADIUS     = 100;

const SPAWN_XP   = { 6:864, 10:1520, 12:2712, 15:4860, 20:7920, 25:12000, 30:15840, 35:27440, 40:39840 };
const SPAWN_ORBS = { 6:2, 10:3, 12:5, 15:8, 20:12, 25:16, 30:22, 35:30, 40:40 };

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
function hashStr(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}
// Parse plain tile key "c,r"
function parseKey(key) {
  const comma = key.indexOf(',');
  return { c: +key.slice(0, comma), r: +key.slice(comma + 1) };
}
function keyDist(tileKey, cc, cr) {
  const { c, r } = parseKey(tileKey);
  return Math.sqrt((c - cc) ** 2 + (r - cr) ** 2);
}

const CREATURE_PORTRAITS = {
  0: [{ faction:"orcs",branch:"grunts",tier:0 },{ faction:"dragons",branch:"dragonkin",tier:0 },{ faction:"nightcreatures",branch:"vampires",tier:0 }],
  1: [{ faction:"ashen_dead",branch:"mummies",tier:1 },{ faction:"nightcreatures",branch:"werewolves",tier:1 },{ faction:"dragons",branch:"drake_riders",tier:1 }],
  2: [{ faction:"orcs",branch:"trolls",tier:2 },{ faction:"ashen_dead",branch:"death_cavalry",tier:2 },{ faction:"nightcreatures",branch:"spiders",tier:2 }],
};

function spawnTierIdx(level) { return level <= 12 ? 0 : level <= 25 ? 1 : 2; }
function pickPortraitRef(level, rng) {
  const pool = CREATURE_PORTRAITS[spawnTierIdx(level)];
  return pool[Math.floor(rng() * pool.length)];
}
function makeSpawn(tileKey, level) {
  const rng = seededRng(hashStr(tileKey));
  return {
    key: tileKey, level,
    defeated: false, defeatedAt: null, respawnAt: null,
    xpReward:  SPAWN_XP[level]  ?? 864,
    orbReward: SPAWN_ORBS[level] ?? 2,
    slot1TroopRef: pickPortraitRef(level, rng),
  };
}

// ── Spawn state — keys are plain "c,r" ───────────────────────────────────────
const spawns = new Map();

// ── Placement: 100 per region ─────────────────────────────────────────────────
function placeSpawns(eligibleKeys) {
  // eligibleKeys format: "c,r|regionKey"
  if (!eligibleKeys?.length) {
    console.log('[SPAWN WORKER] placeSpawns: no eligible keys received');
    return;
  }

  // Group by region
  const byRegion = new Map();
  for (const entry of eligibleKeys) {
    const pipe = entry.indexOf('|');
    const tileKey = pipe >= 0 ? entry.slice(0, pipe) : entry;
    const regKey  = pipe >= 0 ? entry.slice(pipe + 1) : 'unknown';
    if (!byRegion.has(regKey)) byRegion.set(regKey, []);
    byRegion.get(regKey).push(tileKey);
  }

  console.log('[SPAWN WORKER] placeSpawns: regions found:', byRegion.size,
    '| total eligible:', eligibleKeys.length);

  let totalPlaced = 0;
  for (const [regKey, keys] of byRegion) {
    const rng = seededRng(hashStr(regKey) * 7919);
    const shuffled = [...keys].sort(() => rng() - 0.5);
    const total = Math.min(SPAWNS_PER_REGION, shuffled.length);
    for (let i = 0; i < total; i++) {
      const tileKey = shuffled[i];
      const level = SPAWN_LEVELS[i % SPAWN_LEVELS.length];
      spawns.set(tileKey, makeSpawn(tileKey, level));
    }
    totalPlaced += total;
  }

  console.log('[SPAWN WORKER] Placed', totalPlaced, 'spawns across', byRegion.size, 'regions');
}

// ── Auto-reset if all in radius defeated ─────────────────────────────────────
function checkAndAutoReset(cc, cr) {
  const inRadius = [...spawns.values()].filter(sp => keyDist(sp.key, cc, cr) <= SEARCH_RADIUS);
  if (!inRadius.length) return false;
  if (!inRadius.every(sp => sp.defeated)) return false;
  inRadius.forEach(sp => { sp.defeated = false; sp.defeatedAt = null; sp.respawnAt = null; });
  self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
  return true;
}

// ── Force-spawn guarantee ─────────────────────────────────────────────────────
function forceSpawn(level, eligibleKeys, cc, cr) {
  // 1. Active spawn of that level in radius?
  const active = [...spawns.values()].find(sp => sp.level === level && !sp.defeated && keyDist(sp.key, cc, cr) <= SEARCH_RADIUS);
  if (active) return active;

  // 2. Defeated spawn of that level in radius — reset it
  const defeated = [...spawns.values()].find(sp => sp.level === level && sp.defeated && keyDist(sp.key, cc, cr) <= SEARCH_RADIUS);
  if (defeated) {
    defeated.defeated = false; defeated.defeatedAt = null; defeated.respawnAt = null;
    self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
    return defeated;
  }

  // 3. No spawn of that level in radius — place one on nearest unused eligible tile
  const keysInRadius = (eligibleKeys ?? [])
    .map(e => { const pipe = e.indexOf('|'); return pipe >= 0 ? e.slice(0, pipe) : e; })
    .filter(k => !spawns.has(k) && keyDist(k, cc, cr) <= SEARCH_RADIUS)
    .sort((a, b) => keyDist(a, cc, cr) - keyDist(b, cc, cr));

  if (keysInRadius.length) {
    const sp = makeSpawn(keysInRadius[0], level);
    spawns.set(keysInRadius[0], sp);
    self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
    return sp;
  }

  // 4. Last resort — override nearest existing spawn's level
  const nearest = [...spawns.values()]
    .filter(sp => keyDist(sp.key, cc, cr) <= SEARCH_RADIUS)
    .sort((a, b) => keyDist(a.key, cc, cr) - keyDist(b.key, cc, cr))[0];

  if (nearest) {
    nearest.level = level; nearest.defeated = false; nearest.defeatedAt = null; nearest.respawnAt = null;
    nearest.xpReward = SPAWN_XP[level] ?? 864; nearest.orbReward = SPAWN_ORBS[level] ?? 2;
    nearest.slot1TroopRef = pickPortraitRef(level, seededRng(hashStr(nearest.key)));
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
      sp.defeated = true; sp.defeatedAt = Date.now(); sp.respawnAt = Date.now() + RESPAWN_MS;
      self.postMessage({ type: 'spawns', spawns: Object.fromEntries(spawns) });
      break;
    }

    case 'tick': {
      const now = Date.now(); let changed = false;
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
