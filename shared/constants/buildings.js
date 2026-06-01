export const RSS_BLDGS = new Set(["quarry", "lumber", "forge", "refinery", "storage"]);

export const BLDG = {
hq:            { n:"HQ",               icon:"🏰", max:10, desc:"Seat of power. Gates all other building upgrades. Most costly to upgrade.",    cost:{ stone:800, wood:400, gas:200 } },
quarry:        { n:"Quarry",           icon:"🪨", max:20, desc:"Produces Stone. Each level increases output by ~300/hr.",                        cost:{ stone:50,  wood:30,  gas:10  }, rss:"stone" },
lumber:        { n:"Lumber Mill",      icon:"🪵", max:20, desc:"Produces Wood. Each level increases output by ~300/hr.",                         cost:{ stone:60,  wood:20,  gas:10  }, rss:"wood"  },
forge:         { n:"Gas Forge",        icon:"⚗",  max:20, desc:"Produces Gas. Each level increases output by ~300/hr.",                          cost:{ stone:50,  wood:20,  gas:0   }, rss:"gas"   },
refinery:      { n:"Refinery",         icon:"🌾", max:20, desc:"Produces Food. Each level increases output by ~300/hr.",                          cost:{ stone:70,  wood:40,  gas:20  }, rss:"food"  },
storage:       { n:"Storage",          icon:"🏦", max:20, desc:"Increases max resource capacity for all 4 resources.",                            cost:{ stone:120, wood:60,  gas:30  } },
barracks:      { n:"Barracks",         icon:"🏕",  max:10, desc:"Stores troops. Increases max troop capacity and command pool size.",             cost:{ stone:100, wood:60,  gas:30  } },
training:      { n:"Training Grounds", icon:"⚔️",  max:10, desc:"Increases training speed and batch size. Unlocks additional queues at Lv3, Lv6, and Lv9.", cost:{ stone:80,  wood:50,  gas:20  } },
commandcenter: { n:"Command Center",   icon:"📡", max:10, desc:"Increases all commanders' command capacity. Gains +2 to +5 per level (total +35 at Lv10).",         cost:{ stone:180, wood:100, gas:60  } },
healingtent:   { n:"Healing Tent",     icon:"⛺", max:10, desc:"Heals wounded troops over time. Each level adds +5 healed per second.",           cost:{ stone:80,  wood:60,  gas:40  } },
walls:         { n:"Walls",            icon:"🛡",  max:10, desc:"Increases HQ siege HP by +10k per level.",                                       cost:{ stone:120, wood:60,  gas:0   } },
voidtap:       { n:"Void Tap",         icon:"🌀", max:10, desc:"Generates Mystic Orbs on tap. Each level increases capacity and reduces cooldown.",                          cost:{ stone:140, wood:80,  gas:80  } },
marketplace:   { n:"Marketplace",      icon:"🏪", max:10, desc:"Trade resources at a loss. Higher levels improve the exchange rate.",                   cost:{ stone:100, wood:60,  gas:30  } },
};

export function barracksCapacity(lvl) {
  if (lvl <= 0) return 2000;
  return Math.round(2000 * Math.pow(45, (lvl - 1) / 9));
}

// Max command units the barracks can hold in reserve (pool for army assignment)
// Lv1 = 20 cmd, Lv10 = 300 cmd — linear
export function barracksCommandPool(lvl) {
  const l = Math.max(0, Math.min(10, lvl || 0));
  if (l <= 0) return 0;
  return Math.round(20 + (l - 1) * (280 / 9));
}

export function trainingBatches(lvl) {
  const base = [100, 300];
  if (lvl >= 2)  base.push(500);
  if (lvl >= 4)  base.push(1000);
  if (lvl >= 6)  base.push(2000);
  if (lvl >= 8)  base.push(5000);
  if (lvl >= 10) base.push(10000);
  return base;
}

// Number of simultaneous training queues: 1 base + 1 each at Lv3, Lv6, Lv9 (max 4)
export function trainingQueueCount(lvl) {
  let count = 1;
  if (lvl >= 3) count++;
  if (lvl >= 6) count++;
  if (lvl >= 9) count++;
  return count;
}

export function maxTrainBatch(lvl) {
const batches = trainingBatches(lvl);
return batches[batches.length - 1];
}

export function trainRate(lvl) {
return Math.round(1 + lvl * 4.9);
}

export function rssRate(lvl) {
// Lv0 = 0/hr, Lv1 = 300/hr, Lv20 = 6000/hr — linear curve
if (lvl <= 0) return 0;
return Math.round(300 + (lvl - 1) * (5700 / 19));
}

// Storage building: Lv0 = 200,000 max, Lv20 = 2,000,000 max — linear
export function storageMax(lvl) {
const l = Math.max(0, Math.min(20, lvl || 0));
return Math.round(200_000 + l * (1_800_000 / 20));
}

// Marketplace trade rate: Lv1 = 40%, Lv10 = 70% — linear
export function marketplaceRate(lvl) {
  const l = Math.max(0, Math.min(10, lvl || 0));
  if (l <= 0) return 0.35; // unbuilt: slightly below L1 to show upgrade value
  return +(0.40 + (l - 1) * (0.30 / 9)).toFixed(4);
}

export function maxAvailLevel(type, hqLvl) {
const absMax = BLDG[type].max;
if (type === "hq") return absMax;
const avail = RSS_BLDGS.has(type) ? hqLvl * 2 : hqLvl;
return Math.min(absMax, avail);
}

export function upgCost(type, lvl) {
const b = BLDG[type].cost;
const m = Math.pow(1.8, lvl);
return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v * m)]));
}

export function upgDuration(type, newLevel) {
if (type === "hq") return newLevel * 60000;
const isMilitary = ["barracks","training","commandcenter","walls","healingtent"].includes(type);
return newLevel * (isMilitary ? 30000 : 20000);
}

// Command Center bonus per level (cumulative): +2,+2,+3,+3,+3,+4,+4,+4,+5,+5 = +35 at Lv10
const CC_BONUS_BY_LVL = [0, 2, 4, 7, 10, 13, 17, 21, 25, 30, 35];
export function ccBonus(ccLvl) {
  return CC_BONUS_BY_LVL[Math.min(10, Math.max(0, ccLvl || 0))];
}

// Command: level × 1 + CC bonus + optional leader bonus (always whole numbers for players)
// Small units cost 0.01 cmd (100/cmd), medium 0.02 (50/cmd), large 0.25 (4/cmd)
// Max: Lv50 = 50, + CC Lv10 = 85, + leader = 90
export function cmdCommand(lvl, ccLvl, leaderBonus = 0) {
  return (lvl || 1) + ccBonus(ccLvl) + leaderBonus;
}

// Quarter level gates — indexed by HQ level (0-10)
const Q1_MAX = [0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10]; // 1:1 with HQ
const Q2_MAX = [0,  0,  0,  0,  1,  3,  5,  6,  7,  8, 10]; // unlocks HQ4, hits 8 at HQ9
const Q3_MAX = [0,  0,  0,  0,  0,  0,  1,  3,  5,  7, 10];
const Q4_MAX = [0,  0,  0,  0,  0,  0,  0,  1,  3,  6, 10]; // unlocks HQ7, max at HQ10

export function quarterMaxLevel(slot, hqLvl) {
  const h = Math.min(10, Math.max(0, hqLvl || 1));
  if (slot === 0) return Q1_MAX[h];
  if (slot === 1) return Q2_MAX[h];
  if (slot === 2) return Q3_MAX[h];
  if (slot === 3) return Q4_MAX[h];
  return 0;
}

export function quarterUpgCost(currentLvl) {
  const base = { stone: 200, wood: 100, gas: 50 };
  const m = Math.pow(2.0, currentLvl);
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * m)]));
}

// Branch level gates — indexed by quarter level (0-10)
// B1 unlocks at Q1, hits Lv5 at Q7, max Lv6 at Q9
// B2 unlocks at Q2, hits Lv5 at Q8, max Lv6 at Q10
// B3 unlocks at Q5, hits Lv5 at Q9, max Lv6 at Q10
const B1_MAX = [0, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const B2_MAX = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5, 6];
const B3_MAX = [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6];

// Quarter level at which each branch (0-indexed) unlocks
export const BRANCH_UNLOCK_Q = [1, 2, 5];

export function branchMaxLevel(branchIdx, quarterLvl) {
  const q = Math.min(10, Math.max(0, quarterLvl || 0));
  if (branchIdx === 0) return B1_MAX[q];
  if (branchIdx === 1) return B2_MAX[q];
  if (branchIdx === 2) return B3_MAX[q];
  return 0;
}

// Which troop tier (0-indexed) a branch level unlocks
// Lv1-2 → T1 (tier 0), Lv3-4 → T2 (tier 1), Lv5-6 → T3 (tier 2)
export function tierFromBranchLevel(bLvl) {
  if (bLvl <= 0) return -1;
  return Math.min(2, Math.floor((bLvl - 1) / 2));
}

// ── Void Tap helpers ──────────────────────────────────────────────────────────

// Max orb capacity: 10,000 at Lv1, 100,000 at Lv10 — exponential curve
export function voidTapCapacity(lvl) {
  const l = Math.max(1, Math.min(10, lvl || 1));
  // Slow early, faster later: use power curve
  // Lv1=10k, Lv5≈28k, Lv10=100k
  return Math.round(10_000 * Math.pow(10, (l - 1) / 9));
}

// Cooldown in ms: Lv1=10hr, Lv10=2hr — slow early, drops fast later
// Uses inverse power: fast improvement at high levels
export function voidTapCooldownMs(lvl) {
  const l = Math.max(1, Math.min(10, lvl || 1));
  const maxHr = 10, minHr = 2;
  // t=0 at Lv1, t=1 at Lv10. Curve: slow start, fast end → use t^2.5
  const t = (l - 1) / 9;
  const hours = maxHr - (maxHr - minHr) * Math.pow(t, 0.4);
  return Math.round(hours * 3_600_000);
}

// Yield per tap: sum of all quarter levels × 500
export function voidTapYield(quarterLevels) {
  if (!quarterLevels) return 0;
  const total = Object.values(quarterLevels).reduce((s, v) => s + (v || 0), 0);
  return total * 500;
}

// Formatted cooldown string e.g. "6h 30m"
export function fmtCooldown(ms) {
  if (ms <= 0) return "Ready";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}
