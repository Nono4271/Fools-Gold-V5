export const RSS_BLDGS = new Set(["quarry", "lumber", "forge", "refinery", "storage"]);

export const BLDG = {
  hq:            { n:"HQ",               icon:"🏰", max:10, desc:"Seat of power. Increases your stronghold's siege HP and gates all other building upgrades." },
  quarry:        { n:"Quarry",           icon:"🪨", max:20, desc:"Produces Stone over time.",                                                                   rss:"stone" },
  lumber:        { n:"Lumber Mill",      icon:"🪵", max:20, desc:"Produces Wood over time.",                                                                    rss:"wood"  },
  forge:         { n:"Gas Forge",        icon:"⚗️",  max:20, desc:"Produces Gas over time.",                                                                     rss:"gas"   },
  refinery:      { n:"Refinery",         icon:"🌾", max:20, desc:"Produces Food over time.",                                                                    rss:"food"  },
  storage:       { n:"Storage",          icon:"🏦", max:20, desc:"Increases maximum capacity for all resources." },
  barracks:      { n:"Barracks",         icon:"🏕",  max:20, desc:"Increases troop capacity and command pool size." },
  training:      { n:"Training Grounds", icon:"⚔️",  max:20, desc:"Increases training speed and batch size. Unlocks additional training queues at higher levels." },
  commandcenter: { n:"Command Center",   icon:"📡", max:10, desc:"Increases command capacity for all commanders." },
  healingtent:   { n:"Healing Tent",     icon:"⛺", max:10, desc:"Heals wounded troops over time." },
  walls:         { n:"Walls",            icon:"🛡",  max:10, desc:"Increases your stronghold's siege HP." },
  voidtap:       { n:"Void Tap",         icon:"🌀", max:10, desc:"Generates Mystic Orbs on tap. Increases orb capacity and reduces cooldown between taps." },
  marketplace:   { n:"Marketplace",      icon:"🏪", max:5,  desc:"Trade resources at a loss. Higher levels improve the exchange rate." },
  crewhall:      { n:"Crew Hall",        icon:"⚓", max:5,  desc:"Allows crew members to help speed up your building upgrades." },
  shakyalliance: { n:"Shaky Alliance",   icon:"🤝", max:1,  desc:"Unlocks a quarter from the opposing alignment. Grants bonus command capacity and a hiring queue for alliance troops." },
};

// ── Faction → RSS bonus mapping ───────────────────────────────────────────────
export const FACTION_RSS_BONUS = {
  pirates:       "wood",
  wizards:       "gas",
  coldborns:     "stone",
  holyknights:   "food",
  orcs:          "stone",
  dragons:       "gas",
  nightcreatures:"wood",
  ashen_dead:    "food",
};

// Quarter RSS bonus per hour by level range
export function quarterRssBonus(qLvl) {
  if (qLvl <= 0) return 0;
  if (qLvl <= 4) return 300;
  if (qLvl <= 8) return 500;
  return 800;
}

// ── Upgrade cost lookup tables ────────────────────────────────────────────────
// Index = level being upgraded TO (1 = 0→1, 2 = 1→2, etc.)
// { w: wood, s: stone, g: gas }

const HQ_COST = [
  null,
  { w:3000,   s:5000,   g:2400  },  // 1
  { w:5200,   s:9600,   g:4600  },  // 2
  { w:12000,  s:22000,  g:10500 },  // 3
  { w:28000,  s:52000,  g:24000 },  // 4
  { w:62000,  s:115000, g:54000 },  // 5
  { w:118000, s:195000, g:105000},  // 6
  { w:140000, s:230000, g:150000},  // 7
  { w:220000, s:280000, g:195000},  // 8
  { w:450000, s:550000, g:375000},  // 9
  { w:675000, s:1000000,g:625000},  // 10
];

const BARRACKS_COST = [
  null,
  { w:500,   s:1000,  g:400  },  // 1
  { w:1200,  s:2000,  g:900  },  // 2
  { w:1800,  s:3400,  g:1400 },  // 3
  { w:3200,  s:5800,  g:2400 },  // 4
  { w:5500,  s:9800,  g:4000 },  // 5
  { w:9500,  s:17000, g:7000 },  // 6
  { w:30000, s:38000, g:24000},  // 7
  { w:39000, s:49000, g:31000},  // 8
  { w:48000, s:57000, g:37000},  // 9
  { w:54000, s:62000, g:40000},  // 10
  { w:57000, s:65000, g:42000},  // 11
  { w:61000, s:68000, g:44000},  // 12
  { w:75000, s:87000, g:56000},  // 13
  { w:92000, s:108000,g:70000},  // 14
  { w:115000,s:135000,g:87000},  // 15
  { w:140000,s:160000,g:102000}, // 16
  { w:150000,s:170000,g:110000}, // 17
  { w:190000,s:240000,g:155000}, // 18
  { w:235000,s:290000,g:200000}, // 19
  { w:275000,s:375000,g:250000}, // 20
];

const TRAINING_COST = [
  null,
  { w:300,   s:800,   g:200  },  // 1
  { w:900,   s:1700,  g:750  },  // 2
  { w:2200,  s:4200,  g:1800 },  // 3
  { w:5000,  s:9500,  g:4000 },  // 4
  { w:10000, s:19000, g:8000 },  // 5
  { w:18000, s:24000, g:15000},  // 6
  { w:23000, s:30000, g:19000},  // 7
  { w:26000, s:34000, g:21500},  // 8
  { w:28000, s:37000, g:23000},  // 9
  { w:30000, s:40000, g:25000},  // 10
  { w:16000, s:27000, g:21000},  // 11
  { w:29000, s:49000, g:38000},  // 12
  { w:42000, s:70000, g:54000},  // 13
  { w:58000, s:100000,g:75000},  // 14
  { w:76000, s:132000,g:99000},  // 15
  { w:90000, s:155000,g:117000}, // 16
  { w:100000,s:170000,g:130000}, // 17
  { w:145000,s:210000,g:155000}, // 18
  { w:180000,s:243000,g:167000}, // 19
  { w:220000,s:275000,g:180000}, // 20
];

// Resource buildings: two non-zero values are always equal.
// Key: [rssA, rssB] where the building's own rss is 0.
// Stored as a single value — apply to correct pair per building.
// wood=0 buildings (quarry/stone, forge/gas): s+g equal
// stone=0 buildings (lumber/wood): w+g equal
// gas=0 buildings: w+s equal
// food building (refinery): split total by 3

const TRIBUTE_VALS = [
  null,
  300,    // 1
  600,    // 2
  1100,   // 3
  1800,   // 4
  2700,   // 5
  4000,   // 6
  6400,   // 7
  7200,   // 8  (extrapolated between 6400 and 8000)
  8000,   // 9
  10000,  // 10
  15000,  // 11
  17000,  // 12
  19000,  // 13 (extrapolated)
  21000,  // 14
  26000,  // 15
  33000,  // 16
  39000,  // 17
  52000,  // 18 (extrapolated)
  61000,  // 19 (extrapolated)
  70000,  // 20
];

// Which two resources are non-zero per building
const TRIBUTE_PAIRS = {
  quarry: ["wood","gas"],   // stone=0
  lumber: ["stone","gas"],  // wood=0
  forge:  ["wood","stone"], // gas=0
  refinery: ["wood","stone","gas"], // all three, split evenly
};

function tributeCost(type, lvl) {
  const v = TRIBUTE_VALS[lvl];
  if (!v) return null;
  if (type === "refinery") {
    const each = Math.round(v / 3);
    const rem  = v - each * 2;
    return { wood: each, stone: each, gas: rem };
  }
  const [a, b] = TRIBUTE_PAIRS[type];
  const cost = { wood:0, stone:0, gas:0 };
  cost[a] = v;
  cost[b] = v;
  return cost;
}

const STORAGE_COST = [
  null,
  { w:500,   s:900,   g:300  },  // 1
  { w:800,   s:1500,  g:550  },  // 2
  { w:1300,  s:2400,  g:1000 },  // 3
  { w:1800,  s:3300,  g:1350 },  // 4
  { w:2200,  s:3900,  g:1600 },  // 5
  { w:2500,  s:4500,  g:1800 },  // 6
  { w:3800,  s:7000,  g:2800 },  // 7
  { w:5200,  s:9500,  g:3800 },  // 8
  { w:6500,  s:12000, g:4800 },  // 9
  { w:7700,  s:13000, g:5400 },  // 10
  { w:9000,  s:14000, g:6000 },  // 11
  { w:13000, s:20000, g:8800 },  // 12
  { w:17500, s:27000, g:12000},  // 13
  { w:22000, s:34000, g:15000},  // 14
  { w:44000, s:68000, g:30000},  // 15
  { w:78000, s:120000,g:55000},  // 16
  { w:120000,s:185000,g:85000},  // 17
  { w:175000,s:270000,g:125000}, // 18
  { w:230000,s:370000,g:185000}, // 19
  { w:300000,s:500000,g:260000}, // 20
];

const CC_COST = [
  null,
  { w:14000, s:20000, g:13000},  // 1
  { w:21000, s:30000, g:20000},  // 2
  { w:30000, s:42000, g:27000},  // 3
  { w:41000, s:58000, g:38000},  // 4
  { w:55000, s:78000, g:51000},  // 5
  { w:96000, s:138000,g:88000},  // 6
  { w:150000,s:220000,g:130000}, // 7
  { w:210000,s:300000,g:190000}, // 8
  { w:280000,s:400000,g:260000}, // 9
  { w:450000,s:650000,g:420000}, // 10
];

const HT_COST = [
  null,
  { w:250,   s:450,   g:175  },  // 1
  { w:750,   s:1200,  g:500  },  // 2
  { w:3500,  s:5500,  g:3000 },  // 3
  { w:9000,  s:13000, g:7200 },  // 4
  { w:20000, s:28000, g:16000},  // 5
  { w:32000, s:46000, g:26000},  // 6
  { w:50000, s:72000, g:40000},  // 7
  { w:66000, s:99000, g:49000},  // 8
  { w:85000, s:130000,g:60000},  // 9
  { w:127000,s:185000,g:90000},  // 10
];

const WALLS_COST = [
  null,
  { w:150,   s:300,   g:100  },  // 1
  { w:400,   s:800,   g:300  },  // 2
  { w:1200,  s:2400,  g:900  },  // 3
  { w:3200,  s:6500,  g:2400 },  // 4
  { w:7000,  s:14000, g:6000 },  // 5
  { w:12000, s:24000, g:10500},  // 6
  { w:20000, s:40000, g:18000},  // 7
  { w:34000, s:68000, g:29000},  // 8
  { w:52000, s:104000,g:45000},  // 9
  { w:85000, s:170000,g:75000},  // 10
];

const VOIDTAP_COST = [
  null,
  { w:300,   s:600,   g:200  },  // 1
  { w:800,   s:1600,  g:600  },  // 2
  { w:3000,  s:6000,  g:2600 },  // 3
  { w:7000,  s:14000, g:6000 },  // 4
  { w:14000, s:28000, g:12000},  // 5
  { w:24000, s:48000, g:21000},  // 6
  { w:40000, s:80000, g:36000},  // 7
  { w:68000, s:136000,g:60000},  // 8
  { w:104000,s:208000,g:90000},  // 9
  { w:170000,s:340000,g:150000}, // 10
];

const MARKET_COST = [
  null,
  { w:5000,  s:6500,  g:4000 },  // 1
  { w:9000,  s:13000, g:7000 },  // 2
  { w:16000, s:23000, g:12000},  // 3
  { w:40000, s:55000, g:32000},  // 4
  { w:75000, s:100000,g:56000},  // 5
];

// Crew Hall mirrors Walls Lv0-5
const CREWHALL_COST = [
  null,
  { w:150,   s:300,   g:100  },  // 1
  { w:400,   s:800,   g:300  },  // 2
  { w:1200,  s:2400,  g:900  },  // 3
  { w:3200,  s:6500,  g:2400 },  // 4
  { w:7000,  s:14000, g:6000 },  // 5
];

const SHAKYALLIANCE_COST = [
  null,
  { w:500000, s:500000, g:500000 }, // 1
];

const QUARTER_COST = [
  null,
  { w:1000,  s:2500,  g:800  },  // 1
  { w:2000,  s:4000,  g:1600 },  // 2
  { w:3300,  s:6500,  g:2600 },  // 3
  { w:4800,  s:9500,  g:3800 },  // 4
  { w:7200,  s:14000, g:6000 },  // 5
  { w:8300,  s:17000, g:6500 },  // 6
  { w:14000, s:29000, g:12000},  // 7
  { w:32000, s:66000, g:28000},  // 8
  { w:80000, s:160000,g:65000},  // 9
  { w:175000,s:375000,g:150000}, // 10
];

const BRANCH_COST = [
  null,
  { w:2500,  s:5500,  g:3000 },  // 1
  { w:6000,  s:13500, g:7400 },  // 2
  { w:42000, s:77000, g:35000},  // 3
  { w:48000, s:89000, g:40000},  // 4
  { w:55000, s:100000,g:45000},  // 5
  { w:90000, s:160000,g:70000},  // 6
];

// ── Upgrade duration lookup tables (ms) ───────────────────────────────────────
// Index = level being upgraded TO

const HQ_DUR = [
  0,
  5000,        // 1  (5s)
  300000,      // 2  (5m)
  4200000,     // 3  (1h 10m)
  13200000,    // 4  (3h 40m)
  26400000,    // 5  (7h 20m)
  43200000,    // 6  (12h)
  64800000,    // 7  (18h)
  86400000,    // 8  (24h)
  129600000,   // 9  (36h... wait that's wrong — 24h listed, fixing)
  129600000,   // 10 (36h)
];
// Correcting: 8→9 is 24hr, 9→10 is 36hr
HQ_DUR[9]  = 86400000;   // 24h
HQ_DUR[10] = 129600000;  // 36h

const BARRACKS_DUR = [
  0,
  5000,        // 1  (5s)
  180000,      // 2  (3m)
  300000,      // 3  (5m)
  480000,      // 4  (8m)
  900000,      // 5  (15m)
  2700000,     // 6  (45m)
  7200000,     // 7  (2h)
  9000000,     // 8  (2h 30m)
  11400000,    // 9  (3h 10m)
  13800000,    // 10 (3h 50m)
  16200000,    // 11 (4h 30m)
  18600000,    // 12 (5h 10m)
  21000000,    // 13 (5h 50m — extrapolated between 12 and 16)
  25800000,    // 14 (7h 10m)
  30600000,    // 15 (8h 30m)
  55500000,    // 16 (15h 25m — extrapolated)
  66300000,    // 17 (18h 25m)
  72600000,    // 18 (20h 10m)
  80400000,    // 19 (22h 20m)
  86400000,    // 20 (24h)
];

const TRAINING_DUR = [
  0,
  5000,        // 1  (5s)
  150000,      // 2  (2m 30s)
  480000,      // 3  (8m — extrapolated)
  1800000,     // 4  (30m — extrapolated)
  3000000,     // 5  (50m — extrapolated)
  3600000,     // 6  (1h)
  4800000,     // 7  (1h 20m — extrapolated)
  6600000,     // 8  (1h 50m — extrapolated)
  8400000,     // 9  (2h 20m — extrapolated)
  9000000,     // 10 (2h 30m — extrapolated)
  9900000,     // 11 (2h 45m)
  12600000,    // 12 (3h 30m — extrapolated)
  16200000,    // 13 (4h 30m — extrapolated)
  48000000,    // 14 (13h 20m)
  57600000,    // 15 (16h — extrapolated)
  62700000,    // 16 (17h 25m)
  63000000,    // 17 (17h 30m — extrapolated, must exceed 16)
  72000000,    // 18 (20h — extrapolated)
  78000000,    // 19 (21h 40m — extrapolated)
  78000000,    // 20 (21h 40m)
];
TRAINING_DUR[19] = 75600000; // 21h
TRAINING_DUR[20] = 78000000; // 21h 40m

const TRIBUTE_DUR = [
  0,
  5000,        // 1  (5s)
  15000,       // 2  (15s)
  60000,       // 3  (1m)
  300000,      // 4  (5m)
  300000,      // 5  (5m)
  900000,      // 6  (15m)
  1500000,     // 7  (25m)
  3000000,     // 8  (extrapolated between 7 and 9)
  3900000,     // 9  (1h 5m)
  5400000,     // 10 (1h 30m)
  7200000,     // 11 (2h)
  9000000,     // 12 (2h 30m)
  13200000,    // 13 (3h 40m — extrapolated)
  16800000,    // 14 (4h 40m)
  19200000,    // 15 (5h 20m)
  20400000,    // 16 (5h 40m)
  23400000,    // 17 (6h 30m)
  27600000,    // 18 (7h 40m — extrapolated)
  32400000,    // 19 (9h — extrapolated)
  36000000,    // 20 (10h)
];

const STORAGE_DUR = [
  0,
  5000,        // 1  (5s)
  120000,      // 2  (2m — extrapolated)
  900000,      // 3  (15m)
  1800000,     // 4  (30m — extrapolated)
  2400000,     // 5  (40m — extrapolated)
  2100000,     // 6  (35m)
  4200000,     // 7  (1h 10m — extrapolated)
  5400000,     // 8  (1h 30m — extrapolated)
  6300000,     // 9  (1h 45m)
  7800000,     // 10 (2h 10m)
  9000000,     // 11 (2h 30m — extrapolated)
  12600000,    // 12 (3h 30m — extrapolated)
  14400000,    // 13 (4h)
  19200000,    // 14 (5h 20m — extrapolated)
  22800000,    // 15 (6h 20m)
  28800000,    // 16 (8h — extrapolated... wait, given is 6h 20m)
  32400000,    // 17 (9h — extrapolated)
  36000000,    // 18 (10h — extrapolated)
  39600000,    // 19 (11h — extrapolated)
  43200000,    // 20 (12h)
];
STORAGE_DUR[6] = 2100000; // fixing to be > level 5

const CC_DUR = [
  0,
  5400000,     // 1  (1h 30m — extrapolated)
  8700000,     // 2  (2h 25m)
  11400000,    // 3  (3h 10m)
  14400000,    // 4  (4h — extrapolated)
  16200000,    // 5  (4h 30m)
  25200000,    // 6  (7h — extrapolated)
  29400000,    // 7  (8h 10m)
  45000000,    // 8  (12h 30m — extrapolated)
  64800000,    // 9  (18h)
  86400000,    // 10 (24h)
];

const HT_DUR = [
  0,
  5000,        // 1  (5s)
  180000,      // 2  (3m)
  2700000,     // 3  (45m — extrapolated)
  7200000,     // 4  (2h — extrapolated)
  8400000,     // 5  (2h 20m)
  12600000,    // 6  (3h 30m — extrapolated)
  16200000,    // 7  (4h 30m)
  21600000,    // 8  (6h — extrapolated)
  22800000,    // 9  (6h 20m)
  28800000,    // 10 (8h)
];

const WALLS_DUR = [
  0,
  5000,        // 1  (5s)
  30000,       // 2  (30s)
  1200000,     // 3  (20m — extrapolated)
  3000000,     // 4  (50m — extrapolated)
  3600000,     // 5  (1h)
  7200000,     // 6  (2h — extrapolated)
  10800000,    // 7  (3h)
  18000000,    // 8  (5h — extrapolated)
  21600000,    // 9  (6h)
  28800000,    // 10 (8h)
];

const VOIDTAP_DUR = [
  0,
  5000,        // 1  (5s)
  120000,      // 2  (2m)
  3600000,     // 3  (1h — extrapolated)
  7200000,     // 4  (2h — extrapolated)
  10800000,    // 5  (3h)
  18000000,    // 6  (5h — extrapolated)
  21600000,    // 7  (6h)
  30600000,    // 8  (8h 30m — extrapolated)
  34800000,    // 9  (9h 40m)
  43200000,    // 10 (12h)
];

const MARKET_DUR = [
  0,
  3600000,     // 1  (1h)
  7200000,     // 2  (2h)
  10800000,    // 3  (3h)
  21600000,    // 4  (6h)
  28800000,    // 5  (8h)
];

const CREWHALL_DUR = [
  0,
  5000,        // 1  (5s)
  30000,       // 2  (30s)
  1200000,     // 3  (20m)
  3000000,     // 4  (50m)
  3600000,     // 5  (1h)
];

const SHAKYALLIANCE_DUR = [
  0,
  36000000,    // 1  (10h)
];

const QUARTER_DUR = [
  0,
  5000,        // 1  (5s)
  10000,       // 2  (10s)
  180000,      // 3  (3m)
  1200000,     // 4  (20m)
  3600000,     // 5  (1h)
  7500000,     // 6  (2h 5m)
  16200000,    // 7  (4h 30m)
  24600000,    // 8  (6h 50m)
  33300000,    // 9  (9h 15m)
  43200000,    // 10 (12h)
];

const BRANCH_DUR = [
  0,
  900000,      // 1  (15m)
  2100000,     // 2  (35m)
  11400000,    // 3  (3h 10m)
  19800000,    // 4  (5h 30m)
  28800000,    // 5  (8h)
  37800000,    // 6  (10h 30m)
];

// ── Public cost/duration accessors ────────────────────────────────────────────

export function upgCost(type, currentLvl) {
  const toLvl = currentLvl + 1;
  switch (type) {
    case "hq":           return HQ_COST[toLvl]           ? _fmt(HQ_COST[toLvl])           : null;
    case "barracks":     return BARRACKS_COST[toLvl]     ? _fmt(BARRACKS_COST[toLvl])     : null;
    case "training":     return TRAINING_COST[toLvl]     ? _fmt(TRAINING_COST[toLvl])     : null;
    case "quarry":
    case "lumber":
    case "forge":
    case "refinery":     return tributeCost(type, toLvl);
    case "storage":      return STORAGE_COST[toLvl]      ? _fmt(STORAGE_COST[toLvl])      : null;
    case "commandcenter":return CC_COST[toLvl]           ? _fmt(CC_COST[toLvl])           : null;
    case "healingtent":  return HT_COST[toLvl]           ? _fmt(HT_COST[toLvl])           : null;
    case "walls":        return WALLS_COST[toLvl]        ? _fmt(WALLS_COST[toLvl])        : null;
    case "voidtap":      return VOIDTAP_COST[toLvl]      ? _fmt(VOIDTAP_COST[toLvl])      : null;
    case "marketplace":  return MARKET_COST[toLvl]       ? _fmt(MARKET_COST[toLvl])       : null;
    case "crewhall":     return CREWHALL_COST[toLvl]     ? _fmt(CREWHALL_COST[toLvl])     : null;
    case "shakyalliance":return SHAKYALLIANCE_COST[toLvl]? _fmt(SHAKYALLIANCE_COST[toLvl]): null;
    default:             return null;
  }
}

export function upgCostQuarter(currentLvl) {
  const toLvl = currentLvl + 1;
  return QUARTER_COST[toLvl] ? _fmt(QUARTER_COST[toLvl]) : null;
}

export function upgCostBranch(currentLvl) {
  const toLvl = currentLvl + 1;
  return BRANCH_COST[toLvl] ? _fmt(BRANCH_COST[toLvl]) : null;
}

function _fmt(c) {
  return { wood: c.w, stone: c.s, gas: c.g };
}

export function upgDuration(type, newLevel) {
  switch (type) {
    case "hq":           return HQ_DUR[newLevel]           || 0;
    case "barracks":     return BARRACKS_DUR[newLevel]     || 0;
    case "training":     return TRAINING_DUR[newLevel]     || 0;
    case "quarry":
    case "lumber":
    case "forge":
    case "refinery":     return TRIBUTE_DUR[newLevel]      || 0;
    case "storage":      return STORAGE_DUR[newLevel]      || 0;
    case "commandcenter":return CC_DUR[newLevel]           || 0;
    case "healingtent":  return HT_DUR[newLevel]           || 0;
    case "walls":        return WALLS_DUR[newLevel]        || 0;
    case "voidtap":      return VOIDTAP_DUR[newLevel]      || 0;
    case "marketplace":  return MARKET_DUR[newLevel]       || 0;
    case "crewhall":     return CREWHALL_DUR[newLevel]     || 0;
    case "shakyalliance":return SHAKYALLIANCE_DUR[newLevel]|| 0;
    default:             return 0;
  }
}

export function upgDurationQuarter(newLevel) { return QUARTER_DUR[newLevel] || 0; }
export function upgDurationBranch(newLevel)  { return BRANCH_DUR[newLevel]  || 0; }

// ── Siege HP ──────────────────────────────────────────────────────────────────

// HQ siege HP: Lv1=50k, Lv10=500k (linear +50k/level)
export function hqSiegeHP(lvl) {
  return Math.max(0, (lvl || 0)) * 50000;
}

// Walls siege HP: +10k per level, max +100k at Lv10
export function wallsSiegeHP(lvl) {
  return Math.max(0, (lvl || 0)) * 10000;
}

// ── Gate functions ────────────────────────────────────────────────────────────

// Forward gate: max level another building can reach given HQ level
export function maxAvailLevel(type, hqLvl) {
  const absMax = BLDG[type]?.max || 10;
  if (type === "hq") return absMax;

  // Crew Hall has its own HQ gate
  if (type === "crewhall") {
    const CH_GATE = [0,0,1,2,3,5,6,7,8,9,10]; // index = hqLvl, value = max crewhall lvl allowed... 
    // Actually: 0→1 at HQ2, 1→2 at HQ3, 2→3 at HQ5, 3→4 at HQ6, 4→5 at HQ8
    const CH_HQ_REQ = [0, 2, 3, 5, 6, 8]; // index = crewhall target level
    // Return max crewhall level achievable at this HQ level
    let max = 0;
    for (let i = 1; i <= absMax; i++) {
      if (hqLvl >= CH_HQ_REQ[i]) max = i; else break;
    }
    return max;
  }

  if (type === "shakyalliance") return hqLvl >= 9 ? 1 : 0;

  const avail = RSS_BLDGS.has(type) || type === "barracks" || type === "training"
    ? hqLvl * 2
    : hqLvl;
  return Math.min(absMax, avail);
}

// Reverse gate: can HQ upgrade to targetLvl given current building levels?
// Returns null if ok, or a string describing what's blocking.
export function hqUpgradeBlocker(targetLvl, { barracks, training, commandcenter, q1Lvl }) {
  const bar = barracks || 0;
  const tr  = training || 0;
  const cc  = commandcenter || 0;
  const q1  = q1Lvl || 0;

  const reqBT = targetLvl * 2;
  if (bar < reqBT) return `Barracks must be Lv${reqBT}`;
  if (tr  < reqBT) return `Training Grounds must be Lv${reqBT}`;

  if (targetLvl >= 4) {
    if (q1 < 3)  return `Faction Quarter must be Lv3`;
    if (cc < 2)  return `Command Center must be Lv2`;
  }
  if (targetLvl >= 7) {
    if (q1 < 6)  return `Faction Quarter must be Lv6`;
    if (cc < 5)  return `Command Center must be Lv5`;
  }
  if (targetLvl >= 10) {
    if (q1 < 8)  return `Faction Quarter must be Lv8`;
    if (cc < 7)  return `Command Center must be Lv7`;
  }
  return null;
}

// Barracks ↔ Training 1:1 mutual gate
export function barracksUpgradeBlocker(targetLvl, { training }) {
  const tr = training || 0;
  if (tr < targetLvl) return `Training Grounds must be Lv${targetLvl}`;
  return null;
}

export function trainingUpgradeBlocker(targetLvl, { barracks, commandcenter }) {
  const bar = barracks || 0;
  const cc  = commandcenter || 0;
  if (bar < targetLvl) return `Barracks must be Lv${targetLvl}`;
  // Training → CC gate: every 4 training levels needs 1 CC level
  const ccReq = Math.floor(targetLvl / 4);
  if (ccReq > 0 && cc < ccReq) return `Command Center must be Lv${ccReq}`;
  return null;
}

// ── Quarter / Branch gates ────────────────────────────────────────────────────

const Q1_MAX = [0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10];
const Q2_MAX = [0,  0,  0,  0,  1,  3,  5,  6,  7,  8, 10];
const Q3_MAX = [0,  0,  0,  0,  0,  0,  1,  3,  5,  7, 10];
const Q4_MAX = [0,  0,  0,  0,  0,  0,  0,  1,  3,  6, 10];

export function quarterMaxLevel(slot, hqLvl) {
  const h = Math.min(10, Math.max(0, hqLvl || 1));
  if (slot === 0) return Q1_MAX[h];
  if (slot === 1) return Q2_MAX[h];
  if (slot === 2) return Q3_MAX[h];
  if (slot === 3) return Q4_MAX[h];
  // Slot 4 = Shaky Alliance quarter: can't reach Lv10 until HQ Lv10
  if (slot === 4) return h >= 10 ? 10 : Math.min(9, h);
  return 0;
}

const B1_MAX = [0, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const B2_MAX = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5, 6];
const B3_MAX = [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6];
const B4_MAX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 6];

export const BRANCH_UNLOCK_Q = [1, 2, 5, 9];

export function branchMaxLevel(branchIdx, quarterLvl) {
  const q = Math.min(10, Math.max(0, quarterLvl || 0));
  if (branchIdx === 0) return B1_MAX[q];
  if (branchIdx === 1) return B2_MAX[q];
  if (branchIdx === 2) return B3_MAX[q];
  if (branchIdx === 3) return B4_MAX[q];
  return 0;
}

export function tierFromBranchLevel(bLvl) {
  if (bLvl <= 0) return -1;
  return Math.min(2, Math.floor((bLvl - 1) / 2));
}

// ── Barracks helpers ──────────────────────────────────────────────────────────

export function barracksCapacity(lvl) {
  if (lvl <= 0) return 2000;
  return Math.round(2000 * Math.pow(45, (lvl - 1) / 19));
}

export function barracksCommandPool(lvl) {
  const l = Math.max(0, Math.min(20, lvl || 0));
  if (l <= 0) return 0;
  return Math.round(20 + (l - 1) * (280 / 19));
}

// ── Training helpers ──────────────────────────────────────────────────────────

export function trainingBatches(lvl) {
  const base = [100, 300];
  if (lvl >= 2)  base.push(500);
  if (lvl >= 4)  base.push(1000);
  if (lvl >= 6)  base.push(2000);
  if (lvl >= 8)  base.push(5000);
  if (lvl >= 10) base.push(10000);
  return base;
}

// Queue unlocks at Lv5, 11, 16 (instead of 3, 6, 9)
export function trainingQueueCount(lvl) {
  let count = 1;
  if (lvl >= 5)  count++;
  if (lvl >= 11) count++;
  if (lvl >= 16) count++;
  return count;
}

export function maxTrainBatch(lvl) {
  const batches = trainingBatches(lvl);
  return batches[batches.length - 1];
}

export function trainRate(lvl) {
  return Math.max(1, Math.round(1.5 + lvl * 0.45));
}

const TRAIN_SECS = [
  [60,  120, 180],
  [90,  180, 270],
  [132, 216, 330],
];
export const CMD_SIZE = { small: 100, medium: 50, large: 4 };

export function cmdSizeLabel(sv) {
  if (sv % CMD_SIZE.large === 0 && sv <= CMD_SIZE.large * 4)   return "large";
  if (sv % CMD_SIZE.medium === 0 && sv <= CMD_SIZE.medium * 4) return "medium";
  return "small";
}

export function trainBatchSecs(tierIdx, sv, sizeLabel, speedMult = 1) {
  const t    = Math.min(2, Math.max(0, tierIdx || 0));
  const lbl  = (sizeLabel === "large" || sizeLabel === "medium") ? sizeLabel : "small";
  const size = lbl === "large" ? 2 : lbl === "medium" ? 1 : 0;
  const cmdUnits = CMD_SIZE[lbl];
  const cmdCount = Math.max(1, Math.round(sv / cmdUnits));
  const secsPerCmd = TRAIN_SECS[t][size];
  return Math.max(30, Math.round(cmdCount * secsPerCmd / (speedMult || 1)));
}

// ── Resource rate ─────────────────────────────────────────────────────────────

export function rssRate(lvl) {
  if (lvl <= 0) return 0;
  return Math.round(300 + (lvl - 1) * (5700 / 19));
}

// ── Storage ───────────────────────────────────────────────────────────────────

export function storageMax(lvl) {
  const l = Math.max(0, Math.min(20, lvl || 0));
  return Math.round(200_000 + l * (1_800_000 / 20));
}

// ── Marketplace ───────────────────────────────────────────────────────────────

// Lv1=40%, Lv5=80% — linear +10% per level
export function marketplaceRate(lvl) {
  const l = Math.max(0, Math.min(5, lvl || 0));
  if (l <= 0) return 0.35;
  return +(0.40 + (l - 1) * (0.40 / 4)).toFixed(4);
}

// ── Command Center ────────────────────────────────────────────────────────────

const CC_BONUS_BY_LVL = [0, 2, 4, 7, 10, 13, 17, 21, 25, 30, 35];

export function ccBonus(ccLvl) {
  return CC_BONUS_BY_LVL[Math.min(10, Math.max(0, ccLvl || 0))];
}

export function cmdCommand(lvl, ccLvl, leaderBonus = 0) {
  return (lvl || 1) + ccBonus(ccLvl) + leaderBonus;
}

// ── Void Tap ──────────────────────────────────────────────────────────────────

export function voidTapCapacity(lvl) {
  const l = Math.max(1, Math.min(10, lvl || 1));
  return Math.round(10_000 * Math.pow(10, (l - 1) / 9));
}

export function voidTapCooldownMs(lvl) {
  const l = Math.max(1, Math.min(10, lvl || 1));
  const maxHr = 10, minHr = 2;
  const t = (l - 1) / 9;
  const hours = maxHr - (maxHr - minHr) * Math.pow(t, 0.4);
  return Math.round(hours * 3_600_000);
}

export function voidTapYield(quarterLevels) {
  if (!quarterLevels) return 0;
  const total = Object.values(quarterLevels).reduce((s, v) => s + (v || 0), 0);
  return total * 500;
}

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

// ── Crew Hall ─────────────────────────────────────────────────────────────────

const CREW_HALL_STATS = [
  null,
  { maxHelps: 5, pct: 0.002, flatMs: 300000  },  // Lv1: 0.2%, 5min
  { maxHelps: 6, pct: 0.004, flatMs: 660000  },  // Lv2: 0.4%, 11min
  { maxHelps: 7, pct: 0.006, flatMs: 1020000 },  // Lv3: 0.6%, 17min
  { maxHelps: 8, pct: 0.008, flatMs: 1380000 },  // Lv4: 0.8%, 23min
  { maxHelps: 9, pct: 0.010, flatMs: 1800000 },  // Lv5: 1.0%, 30min
];

export function crewHallStats(lvl) {
  const l = Math.max(1, Math.min(5, lvl || 1));
  return CREW_HALL_STATS[l];
}

// How much time one help removes given total build duration and crew hall level
export function crewHelpAmount(buildDurationMs, crewHallLvl) {
  const stats = crewHallStats(crewHallLvl);
  return Math.max(stats.pct * buildDurationMs, stats.flatMs);
}

// ── Shaky Alliance ────────────────────────────────────────────────────────────

export const SHAKY_ALLIANCE_BONUS = {
  command: 100,
  hiringQueues: 1,
};
