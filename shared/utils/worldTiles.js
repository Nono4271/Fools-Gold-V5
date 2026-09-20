// World tile map built from the map-generation worker's typed arrays, plus the
// start-of-game setup rules (player HQ, AI HQ order/players/commanders, crew
// founders, spawn-eligible tiles). Moved from Game.jsx; no React here.
import { HDEFS } from "../constants/heroes.js";

export const ALL_FACTIONS = ["pirates","orcs","wizards","dragons","holyknights","nightcreatures","coldborns","ashen_dead"];

// Wrap the worker's transferred ArrayBuffers.
export function decodeBuffers(buffers) {
  return {
    terrainArr:  new Uint8Array(buffers.terrain),
    ownerArr:    new Uint8Array(buffers.owner),
    rssArr:      new Uint8Array(buffers.rss),
    troopArr:    new Uint8Array(buffers.troop),
    powerArr:    new Uint8Array(buffers.power),
    regionArr:   new Uint8Array(buffers.region),
    flagArr:     new Uint16Array(buffers.flags),
    garrisonArr: new Uint32Array(buffers.garrison),
    siegeArr:    new Uint32Array(buffers.siege),
    siegeMaxArr: new Uint32Array(buffers.siegeMax),
    keepPrimArr: new Int32Array(buffers.keepPrim),
  };
}

// Proxy tile map: tiles["c,r"] is computed on demand from the typed arrays;
// patched/special tiles live in the returned store and are returned directly.
// Object.keys/entries only see the store (never all ~1.4M tiles).
export function createTileMap(arrays, meta) {
  const { terrainArr, ownerArr, rssArr, powerArr, regionArr, flagArr, garrisonArr, siegeArr, siegeMaxArr, keepPrimArr } = arrays;
  const {
    COLS: C, ROWS: R, regionList, keepMeta,
    TERRAIN_DEC, RSS_DEC, OWNER_DEC,
    F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_WIN, F_GATE, F_BORDER,
    F_CAMP, F_CAMPPART, campMeta,
  } = meta;

  // One shared prototype for the garrisonDefeated getter (no per-tile getters).
  const TileProto = {
    get garrisonDefeated() {
      return (this.defeatedWaves?.length ?? 0) >= (this.garrisonWaves ?? 1)
        && (this.garrisonWaves ?? 1) > 0;
    },
  };

  const regionByIdx = {};
  regionList.forEach((reg, i) => { regionByIdx[i + 1] = reg; });
  const keepPrimKeyCache = {}; // flat index -> "c,r"
  const store = {};

  const makeTile = (c, r) => {
    const idx = r * C + c;
    const flags = flagArr[idx];
    const k = `${c},${r}`;
    const reg = regionByIdx[regionArr[idx]] || null;
    const isKeep = !!(flags & F_KEEP);
    const isKeepPart = !!(flags & F_KEEPPART);
    const isHQ = !!(flags & F_HQ);
    const isHQPart = !!(flags & F_HQPART);
    const isCamp = !!(flags & F_CAMP);
    const isCampPart = !!(flags & F_CAMPPART);

    let keepPrimaryKey = null;
    if (isKeepPart || isHQPart || isCampPart) {
      const pi = keepPrimArr[idx];
      if (!keepPrimKeyCache[pi]) keepPrimKeyCache[pi] = `${pi % C},${Math.floor(pi / C)}`;
      keepPrimaryKey = keepPrimKeyCache[pi];
    }

    const km = (isKeep && keepMeta[k]) ? keepMeta[k] : null;
    const cm = (isCamp && campMeta?.[k]) ? campMeta[k] : null;
    const owner = OWNER_DEC[ownerArr[idx]] || null;
    // HQ faction for border colouring ("player" placeholder for the player's own HQ).
    let faction = null;
    if (isHQ || isHQPart) {
      if (ALL_FACTIONS.includes(owner)) faction = owner;
      else if (owner === "player") faction = "player";
    }

    const tile = Object.create(TileProto);
    tile.c = c; tile.r = r; tile.k = k;
    tile.terrain = TERRAIN_DEC[terrainArr[idx]] || "grass";
    tile.rss = RSS_DEC[rssArr[idx]] || null;
    tile.troopBranch = null;
    tile.powerLevel = powerArr[idx];
    tile.regionKey = reg?.key || null;
    tile.regionName = reg?.name || null;
    tile.keepName = km?.keepName || (isKeepPart && reg ? reg.keepName : null);
    tile.owner = owner;
    tile.garrison = garrisonArr[idx] / 100;
    tile.garrisonTroops = garrisonArr[idx] / 100;
    tile.hasAiCommander = false;
    tile.siege = siegeArr[idx];
    tile.siegeMax = siegeMaxArr[idx];
    tile.garrisonWaves = km?.garrisonWaves ?? cm?.garrisonWaves ?? 1;
    tile.defeatedWaves = [];
    tile.resetAt = null;
    tile.isKeep = isKeep;
    tile.isKeepPart = isKeepPart;
    tile.isHQ = isHQ;
    tile.isHQPart = isHQPart;
    tile.isCamp = isCamp;
    tile.isCampPart = isCampPart;
    tile.campName = cm?.campName ?? null;
    tile.campUnitKey = cm?.campUnitKey ?? null;
    tile.campFaction = cm?.campFaction ?? null;
    tile.isWin = !!(flags & F_WIN);
    tile.isGate = !!(flags & F_GATE);
    tile.isBorder = !!(flags & F_BORDER);
    tile.homeFaction = km?.homeFaction || null;
    tile.crossingType = km?.type || null;
    tile.crossingAxis = km?.axis || null;
    tile.keepPrimaryKey = keepPrimaryKey;
    tile.defCmd = km?.defCmd || null;
    tile.faction = faction;
    return tile;
  };

  const map = new Proxy(store, {
    get(s, key) {
      if (key in s) return s[key];
      if (typeof key !== "string" || key === "__ready") return s[key];
      const comma = key.indexOf(",");
      if (comma < 1) return undefined;
      const c = +key.slice(0, comma);
      const r = +key.slice(comma + 1);
      if (isNaN(c) || isNaN(r) || c < 0 || r < 0 || c >= C || r >= R) return undefined;
      return makeTile(c, r);
    },
    set(s, key, value) { s[key] = value; return true; },
    has(s, key) {
      if (typeof key === "string" && key.indexOf(",") > 0) return true;
      return key in s;
    },
    ownKeys(s) { return Reflect.ownKeys(s); },
    getOwnPropertyDescriptor(s, key) {
      if (key in s) return Object.getOwnPropertyDescriptor(s, key);
      return undefined;
    },
  });
  return { map, store, regionByIdx };
}

const copyTile = (tile, patch) => Object.assign(Object.create(Object.getPrototypeOf(tile)), tile, patch);

// Mark the player's 3x3 spawn HQ as player-owned (the worker already stamped the rest).
export function stampPlayerHq(map, playerSpawn, facKey) {
  if (!playerSpawn || !map[playerSpawn]) return false;
  map[playerSpawn] = copyTile(map[playerSpawn], { owner: "player", faction: facKey, defCmd: null, defeatedWaves: [], resetAt: null });
  const [hc, hr] = playerSpawn.split(",").map(Number);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const k = `${hc + dc},${hr + dr}`;
      if (map[k]) map[k] = copyTile(map[k], { owner: "player" });
    }
  }
  return true;
}

// { faction: hqKey[] } for every AI player, each list sorted nearest-first to the
// player. Index 0 of the player's own faction is the player, so it is skipped.
export function aiHqKeysByFaction(spawnKeys, facKey, playerSpawn) {
  const [pc, pr] = (playerSpawn || "0,0").split(",").map(Number);
  const dist = k => { const [c, r] = k.split(",").map(Number); return Math.abs(c - pc) + Math.abs(r - pr); };
  const out = {};
  for (const fk of ALL_FACTIONS.filter(f => f !== facKey)) out[fk] = spawnKeys[fk] || [];
  if (spawnKeys[facKey]?.length > 1) out[facKey] = spawnKeys[facKey].slice(1);
  for (const fk of Object.keys(out)) out[fk] = [...out[fk]].sort((a, b) => dist(a) - dist(b));
  return out;
}

export const aiPlayerId = (fk, i) => `ai_${fk}_${i}`;

// Starting commanders (soldier + veteran) for the 10 nearest AI HQs of the player's faction.
export const ACTIVE_AI_HQS = 10;
export function initialAiCommanders(aiHqKeys, facKey, now) {
  const starters = [
    HDEFS.find(h => h.faction === facKey && h.rarity === "soldier"),
    HDEFS.find(h => h.faction === facKey && h.rarity === "veteran"),
  ].filter(Boolean);
  const cmds = [];
  const activeHqs = (aiHqKeys[facKey] || []).slice(0, ACTIVE_AI_HQS);
  activeHqs.forEach((hqKey, i) => {
    const playerId = aiPlayerId(facKey, i);
    starters.forEach((h, si) => cmds.push({
      ...h,
      uid: `${playerId}_cmd${si}_${now}`, id: `${playerId}_cmd${si}`,
      owner: "ai", faction: facKey, ownerPlayerId: playerId,
      tk: hqKey, hqKey,
      troops: 0, troopBranch: null, troopSlots: [],
      march: null, lvl: 5, xp: 0,
      respectPoints: 0, respectLevel: 0,
      skillPoints: {}, unspentSkillPoints: 5,
      gear: { helmet:null, armor:null, bracers:null, accessory:null },
    }));
  });
  return { cmds, activeHqs };
}

// Crew founders: 3 evenly spaced AI players per faction (2 in the player's faction).
export const FOUNDER_GEMS = 1000;
export function crewFounders(aiHqKeys, facKey) {
  const out = [];
  for (const [fk, hqArr] of Object.entries(aiHqKeys)) {
    const count = fk === facKey ? 2 : 3;
    const step = Math.max(1, Math.floor(hqArr.length / count));
    for (let f = 0; f < count; f++) {
      const idx = f * step;
      if (idx >= hqArr.length) break;
      out.push(aiPlayerId(fk, idx));
    }
  }
  return out;
}

// Main opposing AI faction: first AI faction of the other alignment.
export function primaryAiFaction(aiFactions, playerAlignment) {
  const opp = playerAlignment === "humans"
    ? ["orcs","dragons","nightcreatures"]
    : ["pirates","wizards","holyknights"];
  return aiFactions.find(f => opp.includes(f)) || aiFactions[0];
}

// Unowned P3–P10 tiles with no special flags, as "c,r|regionKey" (spawn worker input).
export function spawnEligibleKeys(arrays, meta, regionByIdx) {
  const { ownerArr, powerArr, regionArr, flagArr } = arrays;
  const { COLS: C, ROWS: R, OWNER_DEC, F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_GATE, F_BORDER, F_CAMP, F_CAMPPART } = meta;
  const blocked = F_HQ | F_HQPART | F_KEEP | F_KEEPPART | F_GATE | F_BORDER | (F_CAMP||0) | (F_CAMPPART||0);
  const keys = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const idx = r * C + c;
      if (flagArr[idx] & blocked) continue;
      const pl = powerArr[idx];
      if (pl < 3 || pl > 10 || OWNER_DEC[ownerArr[idx]]) continue;
      keys.push(`${c},${r}|${regionByIdx[regionArr[idx]]?.key ?? 'unknown'}`);
    }
  }
  return keys;
}
