// Build: 1779593291
// ── Map Generation Web Worker ─────────────────────────────────────────────────
// Communicates via postMessage:
//   incoming: { facKey }
//   outgoing: { type:'progress', pct, label }
//             { type:'done', buffers, meta, spawnKeys, aiHqMap, playerSpawn }  ← transferable, zero-copy

const COLS = 1850, ROWS = 1300;
const SIZE = COLS * ROWS;
const SIEGE_BASE = 50;

const RKEYS      = ["stone","wood","ore","gas"];
const TROOP_KEYS = ["infantry","mage","spearmen","horsemen"];

const POWER_DEFS = {
  1: { cmdLvl:1,  command:0.30  },
  2: { cmdLvl:4,  command:2.50  },
  3: { cmdLvl:6,  command:4.00  },
  4: { cmdLvl:8,  command:8.00  },
  5: { cmdLvl:10, command:10.00 },
  6: { cmdLvl:15, command:15.00 },
  7: { cmdLvl:18, command:18.00 },
  8: { cmdLvl:25, command:30.00 },
  9: { cmdLvl:28, command:35.00 },
  10:{ cmdLvl:35, command:55.00 },
  11:{ cmdLvl:40, command:65.00 },
  12:{ cmdLvl:45, command:75.00 },
  13:{ cmdLvl:50, command:90.00 },
};
const REGION_POWER = { start:1, farm:2, conflict:3, ring:4 }; // kept for keeps only

// ── Power level distribution ──────────────────────────────────────────────────
// P10–P13 use weight 1 each but are converted to 2×2 structures after the main
// tile pass — any tile that rolled P10-P13 becomes the top-left of a 2×2 block.
const POWER_WEIGHTS = [
  { pl:1,  w: 388927 },
  { pl:2,  w: 395107 },
  { pl:3,  w: 360750 },
  { pl:4,  w: 360750 },
  { pl:5,  w: 292035 },
  { pl:6,  w: 257678 },
  { pl:7,  w: 171785 },
  { pl:8,  w:  82457 },
  { pl:9,  w:  54971 },
  { pl:10, w:  15804 },
  { pl:11, w:  10307 },
  { pl:12, w:   8245 },
  { pl:13, w:   6184 },
];
// Weights sum exactly to 2,405,000 (= COLS × ROWS) so expected count = weight for each level.
const POWER_TOTAL = POWER_WEIGHTS.reduce((s, e) => s + e.w, 0);

// Fast per-tile RNG seeded from coords — deterministic, no global state
function tileRng(c, r) {
  let s = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) | 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return ((s >>> 16) & 0x7fff) / 0x7fff;
  };
}

// Pick a power level for a tile using weighted table
function rollPowerLevel(c, r) {
  const rng  = tileRng(c, r);
  const roll = rng() * POWER_TOTAL;
  let acc = 0;
  for (const { pl, w } of POWER_WEIGHTS) {
    acc += w;
    if (roll < acc) return pl;
  }
  return POWER_WEIGHTS[POWER_WEIGHTS.length - 1].pl;
}

const TERRAIN_ENC = { grass:0, forest:1, mountain:2, desert:3, river:4, ravine:5, rockymountain:6, road:7, hellfire:8 };
const TERRAIN_DEC = ["grass","forest","mountain","desert","river","ravine","rockymountain","road","hellfire"];
const RSS_ENC     = { stone:1, wood:2, ore:3, gas:4 };
const RSS_DEC     = [null,"stone","wood","ore","gas"];
const TROOP_ENC   = { infantry:1, mage:2, spearmen:3, horsemen:4 };
const TROOP_DEC   = [null,"infantry","mage","spearmen","horsemen"];
const OWNER_ENC   = { player:1, ai:2, pirates:3, orcs:4, wizards:5, dragons:6, holyknights:7, nightcreatures:8, coldborns:9, ashen_dead:10 };
const OWNER_DEC   = [null,"player","ai","pirates","orcs","wizards","dragons","holyknights","nightcreatures","coldborns","ashen_dead"];

const F_KEEP     = 1<<1;
const F_KEEPPART = 1<<2;
const F_HQ       = 1<<3;
const F_HQPART   = 1<<4;
const F_WIN      = 1<<5;
const F_DEFEATED = 1<<6;
const F_GATE     = 1<<7;  // crossing/tunnel/tollbridge gate tile (passable border)
const F_BORDER   = 1<<8;  // border terrain tile (impassable, not a gate)

// ── Region list — 1850×1300 design space ──────────────────────────────────────
const REGION_LIST = [
  // Holy Grail
  { key:"holyGrail",          name:"Holy Grail",              layer:"ring",     keepName:"The Holy Grail",              cx: 916, cy: 640 },
  // Coldborns Capital
  { key:"frosthold",          name:"Frosthold",               layer:"start",    keepName:"Frosthold",                   cx: 485, cy:  61, factions:["coldborns"] },
  // Nightcreatures Capital
  { key:"duskmire",           name:"Duskmire",                layer:"start",    keepName:"Duskmire",                    cx:1343, cy:  59, factions:["nightcreatures"] },
  // Dragons Capital
  { key:"flamecrestPeak",     name:"Flamecrest Peak",         layer:"start",    keepName:"Flamecrest Peak",             cx:  95, cy: 347, factions:["dragons"] },
  // Wizards Capital
  { key:"arcaneum",           name:"Arcaneum",                layer:"start",    keepName:"Arcaneum",                    cx:1777, cy: 376, factions:["wizards"] },
  // Orcs Capital
  { key:"bloodrockKeep",      name:"Bloodrock Keep",          layer:"start",    keepName:"Bloodrock Keep",              cx:  96, cy: 947, factions:["orcs"] },
  // Holyknights Capital
  { key:"oathkeep",           name:"Oathkeep",                layer:"start",    keepName:"Oathkeep",                    cx:1726, cy: 901, factions:["holyknights"] },
  // Pirates Capital
  { key:"deadmansHarbor",     name:"Deadman's Harbor",        layer:"start",    keepName:"Deadman's Harbor",            cx: 511, cy:1222, factions:["pirates"] },
  // Ashendead Capital
  { key:"bonehallow",         name:"Bonehallow",              layer:"start",    keepName:"Bonehallow",                  cx:1370, cy:1224, factions:["ashen_dead"] },
  
  { key:"dragonsFarm1",       name:"Dragons Territory 1",     layer:"farm",     keepName:"Wyrmrest",                    cx: 103, cy:  76, factions:["dragons"] },
  { key:"coldbornsFarm1",     name:"Coldborns Territory 1",   layer:"farm",     keepName:"Icebreak Spire",              cx: 304, cy:  69, factions:["coldborns"] },
  { key:"coldbornsFarm2",     name:"Coldborns Territory 2",   layer:"farm",     keepName:"Frostbite Hall",              cx: 681, cy:  88, factions:["coldborns"] },
  { key:"coldbornsFarm3",     name:"Coldborns Territory 3",   layer:"farm",     keepName:"Ravencrag",                   cx: 912, cy:  74, factions:["coldborns"] },
  { key:"nightcreaturesFarm1",name:"Nightcreatures Territory 1",layer:"farm",   keepName:"Duskfall",                    cx:1081, cy:  89, factions:["nightcreatures"] },
  { key:"nightcreaturesFarm2",name:"Nightcreatures Territory 2",layer:"farm",   keepName:"Shadowfen Halls",             cx:1538, cy:  74, factions:["nightcreatures"] },
  { key:"wizardsFarm1",       name:"Wizards Territory 1",     layer:"farm",     keepName:"Thornwatch",                  cx:1728, cy:  82, factions:["wizards"] },
  { key:"dragonsFarm2",       name:"Dragons Territory 2",     layer:"farm",     keepName:"Scorchstone",                 cx: 110, cy: 206, factions:["dragons"] },
  { key:"coldbornsFarm4",     name:"Coldborns Territory 4",   layer:"farm",     keepName:"Winterveil",                  cx: 302, cy: 206, factions:["coldborns"] },
  { key:"coldbornsFarm5",     name:"Coldborns Territory 5",   layer:"farm",     keepName:"Grimwald",                    cx: 713, cy: 246, factions:["coldborns"] },
  { key:"coldbornsFarm6",     name:"Coldborns Territory 6",   layer:"farm",     keepName:"Blackstone",                  cx: 894, cy: 220, factions:["coldborns"] },
  { key:"nightcreaturesFarm3",name:"Nightcreatures Territory 3",layer:"farm",   keepName:"Veilwatch",                   cx:1523, cy: 239, factions:["nightcreatures"] },
  { key:"wizardsFarm2",       name:"Wizards Territory 2",     layer:"farm",     keepName:"Mystic Sanctum",              cx:1759, cy: 230, factions:["wizards"] },
  { key:"coldbornsFarm7",     name:"Coldborns Territory 7",   layer:"farm",     keepName:"Shadowmere",                  cx: 650, cy: 384, factions:["coldborns"] },
  { key:"coldbornsFarm8",     name:"Coldborns Territory 8",   layer:"farm",     keepName:"Ironhold",                    cx: 886, cy: 373, factions:["coldborns"] },
  { key:"wizardsFarm3",       name:"Wizards Territory 3",     layer:"farm",     keepName:"Runehaven",                   cx:1599, cy: 389, factions:["wizards"] },
  { key:"dragonsFarm3",       name:"Dragons Territory 3",     layer:"farm",     keepName:"Emberforge",                  cx: 110, cy: 540, factions:["dragons"] },
  { key:"dragonsFarm4",       name:"Dragons Territory 4",     layer:"farm",     keepName:"Darkwater",                   cx: 454, cy: 499, factions:["dragons"] },
  { key:"coldbornsFarm9",     name:"Coldborns Territory 9",   layer:"farm",     keepName:"Stoneheart",                  cx: 726, cy: 492, factions:["coldborns"] },
  { key:"nightcreaturesFarm4",name:"Nightcreatures Territory 4",layer:"farm",   keepName:"Nightfall",                   cx: 953, cy: 498, factions:["nightcreatures"] },
  { key:"wizardsFarm4",       name:"Wizards Territory 4",     layer:"farm",     keepName:"Wolfmarch",                   cx:1489, cy: 519, factions:["wizards"] },
  { key:"wizardsFarm5",       name:"Wizards Territory 5",     layer:"farm",     keepName:"Spellscar Tower",             cx:1751, cy: 507, factions:["wizards"] },
  { key:"orcsFarm1",          name:"Orcs Territory 1",        layer:"farm",     keepName:"Drearfort",                   cx:  58, cy: 685, factions:["orcs"] },
  { key:"orcsFarm2",          name:"Orcs Territory 2",        layer:"farm",     keepName:"Ashenmark",                   cx: 337, cy: 667, factions:["orcs"] },
  { key:"dragonsFarm5",       name:"Dragons Territory 5",     layer:"farm",     keepName:"Grimstone",                   cx: 541, cy: 619, factions:["dragons"] },
  { key:"coldbornsFarm10",    name:"Coldborns Territory 10",  layer:"farm",     keepName:"Blackmoor",                   cx: 715, cy: 629, factions:["coldborns"] },
  { key:"holyknightsFarm1",   name:"Holyknights Territory 1", layer:"farm",     keepName:"Astral Hold",                 cx:1744, cy: 649, factions:["holyknights"] },
  { key:"orcsFarm3",          name:"Orcs Territory 3",        layer:"farm",     keepName:"Warblade Keep",               cx: 137, cy: 783, factions:["orcs"] },
  { key:"piratesFarm1",       name:"Pirates Territory 1",     layer:"farm",     keepName:"Dreadmarsh",                  cx: 746, cy: 793, factions:["pirates"] },
  { key:"holyknightsFarm2",   name:"Holyknights Territory 2", layer:"farm",     keepName:"Sanctuary",                   cx:1522, cy: 793, factions:["holyknights"] },
  { key:"holyknightsFarm3",   name:"Holyknights Territory 3", layer:"farm",     keepName:"Lightforge",                  cx:1776, cy: 779, factions:["holyknights"] },
  { key:"ashendeadFarm1",     name:"Ashendead Territory 1",   layer:"farm",     keepName:"Ironwood",                    cx: 968, cy: 966, factions:["ashen_dead"] },
  { key:"ashendeadFarm2",     name:"Ashendead Territory 2",   layer:"farm",     keepName:"Greywatch",                   cx:1157, cy: 916, factions:["ashen_dead"] },
  { key:"holyknightsFarm4",   name:"Holyknights Territory 4", layer:"farm",     keepName:"Valorhall",                   cx:1578, cy: 973, factions:["holyknights"] },
  { key:"orcsFarm4",          name:"Orcs Territory 4",        layer:"farm",     keepName:"Dreadstone",                  cx:  91, cy:1082, factions:["orcs"] },
  { key:"piratesFarm2",       name:"Pirates Territory 2",     layer:"farm",     keepName:"Grimport",                    cx: 268, cy:1081, factions:["pirates"] },
  { key:"piratesFarm3",       name:"Pirates Territory 3",     layer:"farm",     keepName:"Blackbrine",                  cx: 456, cy:1075, factions:["pirates"] },
  { key:"piratesFarm4",       name:"Pirates Territory 4",     layer:"farm",     keepName:"Deadtide",                    cx: 660, cy:1052, factions:["pirates"] },
  { key:"piratesFarm5",       name:"Pirates Territory 5",     layer:"farm",     keepName:"Stormbreak",                  cx: 874, cy:1105, factions:["pirates"] },
  { key:"ashendeadFarm3",     name:"Ashendead Territory 3",   layer:"farm",     keepName:"Coldmarsh",                   cx:1172, cy:1074, factions:["ashen_dead"] },
  { key:"ashendeadFarm4",     name:"Ashendead Territory 4",   layer:"farm",     keepName:"Gravemist",                   cx:1331, cy:1095, factions:["ashen_dead"] },
  { key:"ashendeadFarm5",     name:"Ashendead Territory 5",   layer:"farm",     keepName:"Bleakhold",                   cx:1544, cy:1119, factions:["ashen_dead"] },
  { key:"holyknightsFarm5",   name:"Holyknights Territory 5", layer:"farm",     keepName:"Dawnspire",                   cx:1754, cy:1062, factions:["holyknights"] },
  { key:"orcsFarm5",          name:"Orcs Territory 5",        layer:"farm",     keepName:"Warkeep",                     cx:  97, cy:1247, factions:["orcs"] },
  { key:"piratesFarm6",       name:"Pirates Territory 6",     layer:"farm",     keepName:"Ravenshore",                  cx: 285, cy:1239, factions:["pirates"] },
  { key:"piratesFarm7",       name:"Pirates Territory 7",     layer:"farm",     keepName:"Skullwater",                  cx: 701, cy:1200, factions:["pirates"] },
  { key:"ashendeadFarm6",     name:"Ashendead Territory 6",   layer:"farm",     keepName:"Shadowcrypt",                 cx: 918, cy:1195, factions:["ashen_dead"] },
  { key:"ashendeadFarm7",     name:"Ashendead Territory 7",   layer:"farm",     keepName:"Ebonvault",                   cx:1133, cy:1186, factions:["ashen_dead"] },
  { key:"ashendeadFarm8",     name:"Ashendead Territory 8",   layer:"farm",     keepName:"Bonechill",                   cx:1551, cy:1238, factions:["ashen_dead"] },
  { key:"holyknightsFarm6",   name:"Holyknights Territory 6", layer:"farm",     keepName:"Valorkeep",                   cx:1742, cy:1229, factions:["holyknights"] },
  { key:"ashendeadFarm9",     name:"Ashendead Territory 9",   layer:"farm",     keepName:"Wraithmoor",                  cx:1088, cy: 806, factions:["ashen_dead"] },
  { key:"piratesFarm8",       name:"Pirates Territory 8",     layer:"farm",     keepName:"Blackrock",                   cx: 780, cy: 878, factions:["pirates"] },
  { key:"nightcreaturesFarm5",name:"Nightcreatures Territory 5",layer:"farm",   keepName:"Duskwater",                   cx:1303, cy: 540, factions:["nightcreatures"] },
  { key:"dragonsFarm6",       name:"Dragons Territory 6",     layer:"farm",     keepName:"Bloodstone",                  cx: 320, cy: 365, factions:["dragons"] },
  { key:"coldbornsFarm11",    name:"Coldborns Territory 11",  layer:"farm",     keepName:"Snowpeak",                    cx: 479, cy: 264, factions:["coldborns"] },
  { key:"nightcreaturesFarm6",name:"Nightcreatures Territory 6",layer:"farm",   keepName:"Grimveil",                    cx:1166, cy: 242, factions:["nightcreatures"] },
  { key:"nightcreaturesFarm7",name:"Nightcreatures Territory 7",layer:"farm",   keepName:"Nightshade",                  cx:1340, cy: 258, factions:["nightcreatures"] },
  { key:"orcsFarm6",          name:"Orcs Territory 6",        layer:"farm",     keepName:"Grimblade",                   cx: 305, cy: 827, factions:["orcs"] },
  { key:"piratesFarm9",       name:"Pirates Territory 9",     layer:"farm",     keepName:"Reefbreaker",                 cx: 525, cy: 782, factions:["pirates"] },
  { key:"ashendeadFarm10",    name:"Ashendead Territory 10",  layer:"farm",     keepName:"Deathmarsh",                  cx:1374, cy: 900, factions:["ashen_dead"] },
  { key:"holyknightsFarm7",   name:"Holyknights Territory 7", layer:"farm",     keepName:"Radiance",                    cx:1485, cy: 660, factions:["holyknights"] },
];

const FACTION_REGIONS = {
  pirates:        { start:"deadmansHarbor", farm:"piratesFarm1"      },
  nightcreatures: { start:"duskmire",       farm:"nightcreaturesFarm1" },
  dragons:        { start:"flamecrestPeak", farm:"dragonsFarm1"      },
  orcs:           { start:"bloodrockKeep",  farm:"orcsFarm1"         },
  wizards:        { start:"arcaneum",       farm:"wizardsFarm1"      },
  holyknights:    { start:"oathkeep",       farm:"holyknightsFarm1"  },
  coldborns:      { start:"frosthold",      farm:"coldbornsFarm1"    },
  ashen_dead:     { start:"bonehallow",     farm:"ashendeadFarm1"    },
};

const KEEP_SET = new Set(REGION_LIST.map(r => `${r.cx},${r.cy}`));
const KEEP_FOOTPRINT_RADIUS = 2;
const KEEP_FOOTPRINT_SET = new Set();
for (const r of REGION_LIST) {
  for (let dc=-KEEP_FOOTPRINT_RADIUS; dc<=KEEP_FOOTPRINT_RADIUS; dc++)
    for (let dr=-KEEP_FOOTPRINT_RADIUS; dr<=KEEP_FOOTPRINT_RADIUS; dr++)
      KEEP_FOOTPRINT_SET.add(`${r.cx+dc},${r.cy+dr}`);
}

const REGION_KEY_TO_IDX = {};
REGION_LIST.forEach((r,i) => { REGION_KEY_TO_IDX[r.key] = i+1; });

// Biome seeds scaled for 1400x1000
// ── Terrain clusters ──────────────────────────────────────────────────────────
// The map is divided into 16 macro-regions, each assigned a dominant biome.
// Multiple seeds per region produce organic cluster shapes via Voronoi BFS.
// Biome assignments are hand-tuned so adjacent regions feel distinct.
const BIOME_CLUSTERS = [
  // [cx, cy, terrain, numSeeds, spreadRadius]
  { cx:229,  cy:141,  t:"forest",   n:12, r:100 },  // pirates NW
  { cx:427,  cy:141,  t:"mountain", n:10, r:90  },  // pirates E / conflict NW
  { cx:613,  cy:141,  t:"grass",    n:12, r:100 },  // conflict N centre-W
  { cx:788,  cy:141,  t:"desert",   n:10, r:90  },  // conflict N centre-E
  { cx:975,  cy:141,  t:"mountain", n:10, r:90  },  // nightcreatures SW
  { cx:1173, cy:141,  t:"forest",   n:12, r:100 },  // nightcreatures N
  { cx:229,  cy:340,  t:"mountain", n:10, r:90  },  // pirates S / dragons N
  { cx:580,  cy:275,  t:"desert",   n:10, r:90  },  // conflict mid-W
  { cx:788,  cy:275,  t:"grass",    n:12, r:100 },  // holy-grail / conflict mid-E
  { cx:1074, cy:340,  t:"desert",   n:10, r:90  },  // nightcreatures S / orcs N
  { cx:229,  cy:520,  t:"forest",   n:12, r:100 },  // dragons / scorchveil
  { cx:450,  cy:430,  t:"mountain", n:10, r:90  },  // dragons E / conflict SW
  { cx:788,  cy:474,  t:"grass",    n:12, r:100 },  // holyknights N / centre
  { cx:1074, cy:520,  t:"forest",   n:10, r:90  },  // orcs S / grimhold
  { cx:430,  cy:720,  t:"desert",   n:12, r:100 },  // bountyhunters W
  { cx:900,  cy:720,  t:"mountain", n:12, r:100 },  // holyknights S / sacredVale
];

const BIOME_SEEDS = (() => {
  let s = 0xdeadbeef|0;
  const rng = () => { s=(Math.imul(s,1664525)+1013904223)|0; return((s>>>0)/0xffffffff); };
  const seeds = [];
  for (const { cx, cy, t, n, r } of BIOME_CLUSTERS) {
    for (let i = 0; i < n; i++) {
      const angle = rng() * Math.PI * 2;
      const dist  = rng() * r;
      const c   = Math.round(cx + Math.cos(angle) * dist);
      const row = Math.round(cy + Math.sin(angle) * dist);
      if (c >= 0 && c < 1400 && row >= 0 && row < 1000) seeds.push({ c, r: row, t });
    }
  }
  return seeds;
})();
const TERRAIN_NAMES = ["grass","forest","mountain","desert","river","ravine","rockymountain"];

// ── Border crossings — active gates between regions ───────────────────────────
// Each entry: { axis:'H'|'V', bCoord, gCoord, type:'crossing'|'tunnel'|'tollbridge', id }
// H = horizontal border (strip of rows at bCoord y, gate centered at gCoord x)
// V = vertical border   (strip of cols at bCoord x, gate centered at gCoord y)
// Border terrain: H→river, V→rockymountain, tollbridge→ravine on either axis

// Build CROSSINGS array by detecting shared polygon edges between regions
const CROSSINGS = (() => {
  const HOLY_GRAIL = { cx: 916, cy: 640 }; // from holyGrail region
  const crossings = [];

  // Helper: calculate Euclidean distance from Holy Grail
  function distFromGrail(x, y) {
    return Math.sqrt((x - HOLY_GRAIL.cx) ** 2 + (y - HOLY_GRAIL.cy) ** 2);
  }

  // Helper: determine gate type based on distance (divide map into thirds)
  // Max distance ≈ 1000, so: 0-333 = tollbridge, 333-667 = tunnel, 667+ = crossing
  function gateTypeForDistance(dist) {
    if (dist < 333) return 'tollbridge';
    if (dist < 667) return 'tunnel';
    return 'crossing';
  }

  // Helper: find shared edges between two polygons
  // Returns array of { axis:'H'|'V', coord, start, end } for each shared edge
  function findSharedEdges(polyA, polyB) {
    const edges = [];
    
    // Check each edge of polyA against each edge of polyB
    for (let i = 0; i < polyA.length; i++) {
      const [ax1, ay1] = polyA[i];
      const [ax2, ay2] = polyA[(i + 1) % polyA.length];
      
      for (let j = 0; j < polyB.length; j++) {
        const [bx1, by1] = polyB[j];
        const [bx2, by2] = polyB[(j + 1) % polyB.length];
        
        // Check for horizontal edge overlap (same y, overlapping x ranges)
        if (ay1 === ay2 && by1 === by2 && ay1 === by1) {
          const aMinX = Math.min(ax1, ax2), aMaxX = Math.max(ax1, ax2);
          const bMinX = Math.min(bx1, bx2), bMaxX = Math.max(bx1, bx2);
          const overlapStart = Math.max(aMinX, bMinX);
          const overlapEnd = Math.min(aMaxX, bMaxX);
          
          if (overlapStart < overlapEnd) {
            edges.push({ axis: 'H', coord: ay1, start: overlapStart, end: overlapEnd });
          }
        }
        
        // Check for vertical edge overlap (same x, overlapping y ranges)
        if (ax1 === ax2 && bx1 === bx2 && ax1 === bx1) {
          const aMinY = Math.min(ay1, ay2), aMaxY = Math.max(ay1, ay2);
          const bMinY = Math.min(by1, by2), bMaxY = Math.max(by1, by2);
          const overlapStart = Math.max(aMinY, bMinY);
          const overlapEnd = Math.min(aMaxY, bMaxY);
          
          if (overlapStart < overlapEnd) {
            edges.push({ axis: 'V', coord: ax1, start: overlapStart, end: overlapEnd });
          }
        }
      }
    }
    
    return edges;
  }

  // Find all neighboring region pairs
  const regionKeys = Object.keys(POLYS);
  const processed = new Set();
  
  for (let i = 0; i < regionKeys.length; i++) {
    for (let j = i + 1; j < regionKeys.length; j++) {
      const keyA = regionKeys[i];
      const keyB = regionKeys[j];
      const pairKey = [keyA, keyB].sort().join('|');
      
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);
      
      const polyA = POLYS[keyA];
      const polyB = POLYS[keyB];
      const sharedEdges = findSharedEdges(polyA, polyB);
      
      // For each shared edge, create a crossing
      for (const edge of sharedEdges) {
        const edgeLength = edge.end - edge.start;
        const middleThirdStart = edge.start + edgeLength / 3;
        const middleThirdEnd = edge.end - edgeLength / 3;
        
        // Random gate position in middle third
        const seed = ((edge.coord * 73856093) ^ (Math.floor((edge.start + edge.end) / 2) * 19349663)) >>> 0;
        const rng = (seed >>> 16) / 0x7fff;
        const gCoord = Math.floor(middleThirdStart + rng * (middleThirdEnd - middleThirdStart));
        
        // Gate type based on distance from Holy Grail
        const centerX = edge.axis === 'H' ? gCoord : edge.coord;
        const centerY = edge.axis === 'H' ? edge.coord : gCoord;
        const dist = distFromGrail(centerX, centerY);
        const type = gateTypeForDistance(dist);
        
        crossings.push({
          axis: edge.axis,
          bCoord: edge.coord,
          gCoord: gCoord,
          type: type,
          id: `${edge.axis.toLowerCase()}${gCoord}_${edge.coord}`,
        });
      }
    }
  }
  
  return crossings;
})();

// Terrain type per crossing type
function crossingTerrain(type) {
  if (type === 'crossing')   return TERRAIN_ENC.river;
  if (type === 'tollbridge') return TERRAIN_ENC.ravine;
  return TERRAIN_ENC.rockymountain; // tunnel
}

// Build set of all gate tiles and border tiles for a crossing
// ── Border width ─────────────────────────────────────────────────────────────
const BORDER_W = 4; // tiles wide/tall for each border strip
const BORDER_HALF = Math.floor(BORDER_W / 2); // = 2

// For a 4-tile border: offsets -2, -1, 0, +1 from the boundary coordinate
// Gate A = 1 tile at offset -2 (hugging region A), x/y === gate center coord
// Path   = 2 tiles at offsets -1 and 0, x/y === gate center coord
// Gate B = 1 tile at offset +1 (hugging region B), x/y === gate center coord

// Map region bounds — only paint inside the actual region mass
const MAP_X0 = 130, MAP_X1 = 1272;
const MAP_Y0 =  75, MAP_Y1 =  848;

// Group crossings by border line so we can paint the full strip once per border
function groupCrossingsByBorder(crossings) {
  const map = {};
  for (const c of crossings) {
    const key = c.axis + c.bCoord;
    if (!map[key]) map[key] = { axis: c.axis, bCoord: c.bCoord, crossings: [] };
    map[key].crossings.push(c);
  }
  return Object.values(map);
}

// Returns terrain type for a border
function borderTerrain(axis, bCoord, crossings) {
  // Use the type of the first crossing on this border for the terrain flavor
  const c = crossings[0];
  if (!c) return TERRAIN_ENC.river;
  return crossingTerrain(c.type);
}

// Build the full set of tiles for one border line (all crossings on it)
function buildBorderLine(axis, bCoord, crossingsOnBorder) {
  const impassable = [], gateA = [], gateB = [], pathTiles = [];

  // Build gate windows for every crossing on this border
  const gateWindows = crossingsOnBorder.map(c => {
    const g = c.axis === 'H' ? c.gCoord : c.gCoord; // gate center on non-border axis
    return {
      gCoord: c.gCoord,
      type: c.type,
      id: c.id,
      gateAOffset: -BORDER_HALF, // gate A hugs region A
      gateBOffset: +BORDER_HALF, // gate B hugs region B
    };
  });

  if (axis === 'H') {
    // Horizontal border: strip of rows bCoord-2, bCoord-1, bCoord, bCoord+1
    // Runs full width MAP_X0..MAP_X1
    for (let offset = -BORDER_HALF; offset < BORDER_HALF; offset++) {
      const y = bCoord + offset;
      if (y < MAP_Y0 || y > MAP_Y1) continue;
      for (let x = MAP_X0; x <= MAP_X1; x++) {
        // Check if this x is the gate center coord on this border
        let isGateA = false, isGateB = false, isPath = false;
        for (const gw of gateWindows) {
          const gx = gw.gCoord;
          // Gate A: offset=-2 (outermost region A row), x === gx (1 tile)
          if (offset === -BORDER_HALF && x === gx) { isGateA = true; break; }
          // Gate B: offset=+1 (outermost region B row), x === gx (1 tile)
          if (offset === BORDER_HALF - 1 && x === gx) { isGateB = true; break; }
          // Path: offsets -1 and 0 (two center rows), x === gx (1 tile each)
          if ((offset === -BORDER_HALF + 1 || offset === 0) && x === gx) { isPath = true; break; }
        }
        if      (isGateA) { const gw = gateWindows.find(g => x === g.gCoord); gateA.push({x,y,id:gw.id+'_A',type:gw.type}); }
        else if (isGateB) { const gw = gateWindows.find(g => x === g.gCoord); gateB.push({x,y,id:gw.id+'_B',type:gw.type}); }
        else if (isPath)  pathTiles.push({x,y});
        else              impassable.push({x,y});
      }
    }
  } else {
    // Vertical border: strip of cols bCoord-2, bCoord-1, bCoord, bCoord+1
    // Runs full height MAP_Y0..MAP_Y1
    for (let offset = -BORDER_HALF; offset < BORDER_HALF; offset++) {
      const x = bCoord + offset;
      if (x < MAP_X0 || x > MAP_X1) continue;
      for (let y = MAP_Y0; y <= MAP_Y1; y++) {
        let isGateA = false, isGateB = false, isPath = false;
        for (const gw of gateWindows) {
          const gy = gw.gCoord;
          // Gate A: offset=-2 (outermost region A col), y === gy (1 tile)
          if (offset === -BORDER_HALF && y === gy) { isGateA = true; break; }
          // Gate B: offset=+1 (outermost region B col), y === gy (1 tile)
          if (offset === BORDER_HALF - 1 && y === gy) { isGateB = true; break; }
          // Path: offsets -1 and 0 (two center cols), y === gy (1 tile each)
          if ((offset === -BORDER_HALF + 1 || offset === 0) && y === gy) { isPath = true; break; }
        }
        if      (isGateA) { const gw = gateWindows.find(g => y === g.gCoord); gateA.push({x,y,id:gw.id+'_A',type:gw.type}); }
        else if (isGateB) { const gw = gateWindows.find(g => y === g.gCoord); gateB.push({x,y,id:gw.id+'_B',type:gw.type}); }
        else if (isPath)  pathTiles.push({x,y});
        else              impassable.push({x,y});
      }
    }
  }
  return { impassable, gateA, gateB, pathTiles };
}

const POLYS = {
  // Holy Grail
  holyGrail:       [[701,341],[876,341],[876,474],[701,474]],
  // Pirates
  saltmere:        [[130,75],[328,75],[328,208],[130,208]],
  plunderMaw:      [[130,75],[300,75],[295,25],[255,0],[200,4],[148,22],[130,75]],
  brineHollow:     [[328,75],[526,75],[526,208],[328,208]],
  deadAnchor:      [[130,208],[328,208],[328,341],[130,341]],
  // Night Creatures
  shadowmere:      [[1074,208],[1272,208],[1272,341],[1074,341]],
  theShroud:       [[1272,222],[1348,238],[1396,275],[1400,315],[1362,340],[1325,355],[1272,345]],
  crimsonVeil:     [[876,75],[1074,75],[1074,208],[876,208]],
  paleCourt:       [[1074,75],[1272,75],[1272,208],[1074,208]],
  duskHollow:      [[876,208],[1074,208],[1074,341],[876,341]],
  bloodfen:        [[1074,341],[1272,341],[1272,474],[1074,474]],
  // Dragons
  emberpeak:       [[130,341],[328,341],[328,474],[130,474]],
  smolderingMaw:   [[130,355],[58,368],[8,418],[0,465],[38,498],[72,518],[130,508]],
  ashcrag:         [[328,341],[526,341],[526,474]],
  cinderPass:      [[328,341],[526,474],[328,474]],
  scorchveil:      [[130,474],[328,474],[328,607],[130,607]],
  // Orcs
  grimhold:        [[1074,474],[1272,474],[1272,607],[1074,607]],
  theWarground:    [[1272,488],[1348,505],[1396,558],[1400,608],[1355,635],[1318,650],[1272,638]],
  warbend:         [[876,341],[1074,341],[1074,474],[876,474]],
  bloodfield:      [[876,474],[1074,474],[1074,607],[876,607]],
  bonepile:        [[1074,607],[1272,607],[1272,740],[1074,740]],
  // Wizards (Bounty Hunters)
  ashenveil:       [[526,740],[701,740],[701,848],[526,848]],
  arcaneDeep:      [[548,848],[562,898],[590,935],[622,968],[660,972],[695,970],[706,945],[712,920],[700,848]],
  hexmire:         [[328,607],[526,607],[526,740],[328,740]],
  ruinwatch:       [[526,607],[701,607],[701,740],[526,740]],
  ashenFen:        [[130,740],[328,740],[328,848],[130,848]],
  cursemoor:       [[328,740],[526,740],[526,848],[328,848]],
  // Holy Knights
  sanctumhold:     [[701,740],[876,740],[876,848],[701,848]],
  blessedShore:    [[728,848],[740,895],[762,932],[788,968],[822,972],[852,970],[862,945],[868,920],[854,848]],
  hallowedGround:  [[701,474],[876,474],[876,607],[701,607]],
  pilgrimsRest:    [[876,607],[1074,607],[1074,740],[876,740]],
  sacredVale:      [[876,740],[1074,740],[1074,848],[876,848]],
  dawnmarch:       [[1074,740],[1272,740],[1272,848],[1074,848]],
  // Neutral / Conflict
  gallowsReach:    [[526,75],[701,75],[701,208],[526,208]],
  greyExpanse:     [[701,75],[876,75],[876,208],[701,208]],
  mistfall:        [[328,208],[526,208],[526,341]],
  thornveil:       [[328,208],[526,341],[328,341]],
  wanderingWastes: [[526,208],[701,208],[701,341],[526,341]],
  dreadmoor:       [[701,208],[876,208],[876,341],[701,341]],
  theHollow:       [[526,341],[701,341],[701,474],[526,474]],
  grimward:        [[328,474],[526,474],[526,607],[328,607]],
  shatteredPass:   [[526,474],[701,474],[701,607]],
  sunkenRoad:      [[526,474],[701,607],[526,607]],
  paleMarch:       [[701,607],[876,607],[876,740],[701,740]],
  forsakenMarch:   [[130,607],[328,607],[328,740],[130,740]],
};

function buildLookups() {
  const TERRAIN_MAP = new Uint8Array(SIZE);
  const REGION_MAP  = new Uint8Array(SIZE);

  // Voronoi terrain via BFS flood-fill
  {
    TERRAIN_MAP.fill(255);
    const queue = new Int32Array(SIZE * 3);
    let head = 0, tail = 0;
    for (let i=0;i<BIOME_SEEDS.length;i++) {
      const sd = BIOME_SEEDS[i];
      const idx = sd.r*COLS+sd.c;
      if (TERRAIN_MAP[idx]===255) {
        const ti = TERRAIN_NAMES.indexOf(sd.t);
        TERRAIN_MAP[idx] = ti<0?0:ti;
        queue[tail*3]=sd.c; queue[tail*3+1]=sd.r; queue[tail*3+2]=ti; tail++;
      }
    }
    const DC = [-1,1,0,0], DR = [0,0,-1,1];
    while (head<tail) {
      const c=queue[head*3], r=queue[head*3+1], t=queue[head*3+2]; head++;
      for (let d=0;d<4;d++) {
        const nc=c+DC[d], nr=r+DR[d];
        if (nc<0||nr<0||nc>=COLS||nr>=ROWS) continue;
        const ni=nr*COLS+nc;
        if (TERRAIN_MAP[ni]===255) { TERRAIN_MAP[ni]=t; queue[tail*3]=nc; queue[tail*3+1]=nr; queue[tail*3+2]=t; tail++; }
      }
    }
  }

  // Region assignment via scanline polygon fill
  {
    const polyEntries = Object.entries(POLYS);
    for (const [key, poly] of polyEntries) {
      const regIdx = REGION_KEY_TO_IDX[key];
      if (!regIdx) continue;
      let rMin=Infinity, rMax=-Infinity;
      for (const [,py] of poly) { if(py<rMin)rMin=py; if(py>rMax)rMax=py; }
      rMin=Math.max(0,Math.floor(rMin)); rMax=Math.min(ROWS-1,Math.ceil(rMax));
      for (let r=rMin;r<=rMax;r++) {
        const xs=[];
        for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
          const [xi,yi]=poly[i],[xj,yj]=poly[j];
          if ((yi<=r&&yj>r)||(yj<=r&&yi>r)) {
            xs.push(xi+(r-yi)*(xj-xi)/(yj-yi));
          }
        }
        xs.sort((a,b)=>a-b);
        for (let k=0;k<xs.length-1;k+=2) {
          const cStart=Math.max(0,Math.ceil(xs[k]));
          const cEnd  =Math.min(COLS-1,Math.floor(xs[k+1]));
          for (let c=cStart;c<=cEnd;c++) REGION_MAP[r*COLS+c]=regIdx;
        }
      }
    }
    // Fallback: tiles not covered by any polygon → nearest centroid
    const regionCentroids=REGION_LIST.map(reg=>({idx:REGION_KEY_TO_IDX[reg.key],cx:reg.cx,cy:reg.cy}));
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      if (REGION_MAP[r*COLS+c]===0) {
        let bestD=Infinity,bestIdx=0;
        for (const rc of regionCentroids) {
          const d=(c-rc.cx)**2+(r-rc.cy)**2;
          if (d<bestD){bestD=d;bestIdx=rc.idx;}
        }
        REGION_MAP[r*COLS+c]=bestIdx;
      }
    }
  }

  return {TERRAIN_MAP,REGION_MAP};
}

// Check if position overlaps or is adjacent to any existing HQ (needs 1-tile gap)
function isAdjacentToHQ(c, r, usedKeys) {
  // Check a 5x5 area centered on the proposed HQ's top-left corner
  // This ensures the 3x3 HQ footprint + 1-tile gap on all sides
  for (let dr = -1; dr <= 4; dr++) {
    for (let dc = -1; dc <= 4; dc++) {
      const checkKey = `${c+dc},${r+dr}`;
      if (usedKeys.has(checkKey)) return true;
    }
  }
  return false;
}

// Check if HQ location has sufficient resource neighbors for spawn
// Requires: at least 2 tiles with 1/hr (power level 1) and 1 tile with 10/hr+ (power level 10+)
// Only checks 12 adjacent tiles (no corners, no HQ tiles)
function hasValidResourceNeighbors(c, r, powerArr) {
  let count1hr = 0;
  let count10hrPlus = 0;
  
  // Top edge: (c, r-1), (c+1, r-1), (c+2, r-1)
  for (let dc = 0; dc <= 2; dc++) {
    const idx = (r-1)*COLS+(c+dc);
    if (idx >= 0 && idx < SIZE) {
      const pl = powerArr[idx];
      if (pl === 1) count1hr++;
      if (pl >= 10) count10hrPlus++;
    }
  }
  
  // Bottom edge: (c, r+3), (c+1, r+3), (c+2, r+3)
  for (let dc = 0; dc <= 2; dc++) {
    const idx = (r+3)*COLS+(c+dc);
    if (idx >= 0 && idx < SIZE) {
      const pl = powerArr[idx];
      if (pl === 1) count1hr++;
      if (pl >= 10) count10hrPlus++;
    }
  }
  
  // Left edge: (c-1, r), (c-1, r+1), (c-1, r+2)
  for (let dr = 0; dr <= 2; dr++) {
    const idx = (r+dr)*COLS+(c-1);
    if (idx >= 0 && idx < SIZE) {
      const pl = powerArr[idx];
      if (pl === 1) count1hr++;
      if (pl >= 10) count10hrPlus++;
    }
  }
  
  // Right edge: (c+3, r), (c+3, r+1), (c+3, r+2)
  for (let dr = 0; dr <= 2; dr++) {
    const idx = (r+dr)*COLS+(c+3);
    if (idx >= 0 && idx < SIZE) {
      const pl = powerArr[idx];
      if (pl === 1) count1hr++;
      if (pl >= 10) count10hrPlus++;
    }
  }
  
  return count1hr >= 2 && count10hrPlus >= 1;
}

function randomSpawn(regionKey, usedKeys, flagArr, terrainArr, powerArr) {
  const reg=REGION_LIST.find(r=>r.key===regionKey);
  if (!reg) return null;
  for (let attempt=0;attempt<200;attempt++) {
    const c=reg.cx+Math.floor((Math.random()-0.5)*70);
    const r=reg.cy+Math.floor((Math.random()-0.5)*70);
    if (c<1||c>=COLS-2||r<1||r>=ROWS-2) continue; // 3x3 HQ needs 2-tile margin
    const k=`${c},${r}`;
    if (KEEP_FOOTPRINT_SET.has(k)||usedKeys.has(k)) continue;
    
    // SAFETY NET 2: Check HQ is not adjacent to another HQ (1-tile gap required)
    if (isAdjacentToHQ(c, r, usedKeys)) continue;
    
    // Also skip any dynamically placed P10-13 structure or its parts
    const fl = flagArr[r*COLS+c];
    if (fl & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) continue;
    // Don't spawn HQ on a road tile
    const t0 = terrainArr[r*COLS+c];
    if (t0 === TERRAIN_ENC.road || t0 === TERRAIN_ENC.hellfire) continue;
    // Ensure 3x3 HQ footprint cells are all clear and road-free
    let footClear = true;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        if (dc === 0 && dr === 0) continue; // top-left (already checked above)
        const ti = (r+dr)*COLS+(c+dc);
        if (ti < 0 || ti >= flagArr.length) { footClear=false; break; }
        const fl2 = flagArr[ti];
        if (fl2 & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) { footClear=false; break; }
        const t1 = terrainArr[ti];
        if (t1 === TERRAIN_ENC.road || t1 === TERRAIN_ENC.hellfire) { footClear=false; break; }
      }
      if (!footClear) break;
    }
    if (!footClear) continue;
    
    // SAFETY NET 1: Check HQ has valid resource neighbors (only for spawn)
    if (!hasValidResourceNeighbors(c, r, powerArr)) continue;
    
    return k;
  }
  return `${reg.cx+5},${reg.cy+5}`;
}

self.onmessage = function(e) {
  const { facKey } = e.data;

  postMessage({ type:"progress", pct:5,  label:"Building terrain..." });
  const { TERRAIN_MAP, REGION_MAP } = buildLookups();
  postMessage({ type:"progress", pct:20, label:"Packing tiles..." });

  const terrainArr  = new Uint8Array(SIZE);
  const ownerArr    = new Uint8Array(SIZE);
  const rssArr      = new Uint8Array(SIZE);
  const troopArr    = new Uint8Array(SIZE);
  const powerArr    = new Uint8Array(SIZE);
  const regionArr   = new Uint8Array(SIZE);
  const flagArr     = new Uint16Array(SIZE);
  const garrisonArr = new Uint32Array(SIZE);
  const siegeArr    = new Uint32Array(SIZE);
  const siegeMaxArr = new Uint32Array(SIZE);
  const keepPrimArr = new Int32Array(SIZE).fill(-1);

  const PROGRESS_INTERVAL = 50;

  for (let r=0;r<ROWS;r++) {
    for (let c=0;c<COLS;c++) {
      const idx=r*COLS+c;

      const regIdx  = REGION_MAP[idx];
      const reg     = regIdx ? REGION_LIST[regIdx-1] : null;
      const pl      = rollPowerLevel(c, r);
      const pd      = POWER_DEFS[pl];
      const trpKey  = TROOP_KEYS[Math.floor(Math.random()*4)];

      // RSS pool per power level:
      // P1 (1/hr)   — all 4 resources (shown as "all" in UI, no individual props)
      // P2 (10/hr)  — ore, gas only
      // P3 (15/hr)  — wood, stone only
      // P4 (30/hr)  — ore, gas only
      // P5 (40/hr)  — wood, stone only
      // P6 (60/hr)  — ore, gas only
      // P7 (90/hr)  — wood, stone only
      // P8 (130/hr) — ore, gas only
      // P9 (150/hr) — wood, stone only
      // P10-P13     — all 4 resources
      const RSS_POOL = {
        1:  ["stone","wood","ore","gas"],
        2:  ["ore","gas"],
        3:  ["wood","stone"],
        4:  ["ore","gas"],
        5:  ["wood","stone"],
        6:  ["ore","gas"],
        7:  ["wood","stone"],
        8:  ["ore","gas"],
        9:  ["wood","stone"],
        10: ["stone","wood","ore","gas"],
        11: ["stone","wood","ore","gas"],
        12: ["stone","wood","ore","gas"],
        13: ["stone","wood","ore","gas"],
      };
      const pool   = RSS_POOL[pl] || ["stone","wood","ore","gas"];
      const rssKey = pool[Math.floor(Math.random() * pool.length)];

      terrainArr[idx]  = TERRAIN_ENC[TERRAIN_NAMES[TERRAIN_MAP[idx]]] ?? 0;
      rssArr[idx]      = RSS_ENC[rssKey] ?? 0;
      troopArr[idx]    = TROOP_ENC[trpKey] ?? 0;
      powerArr[idx]    = pl;
      regionArr[idx]   = regIdx;
      garrisonArr[idx] = Math.round(pd.command * 100); // stored ×100, divide on read
      siegeArr[idx]    = SIEGE_BASE;
      siegeMaxArr[idx] = SIEGE_BASE;
    }

    if (r % PROGRESS_INTERVAL === 0) {
      postMessage({ type:"progress", pct: 20+Math.round((r/ROWS)*60), label:"Packing tiles..." });
    }
  }

  postMessage({ type:"progress", pct:82, label:"Placing keeps..." });

  // ── Pre-compute road tile set so P10+ keeps don't land on roads ──────────────
  // Roads are stamped later (pct 94) but segments are static, so we can walk them now.
  const ROAD_TILE_SET = new Set();
  {
    const addRoadTile = (c, r) => { if (c>=0&&r>=0&&c<COLS&&r<ROWS) ROAD_TILE_SET.add(r*COLS+c); };
    const ROAD_SEGS_EARLY = [
      [229,207,229,141],[229,209,229,274],[427,207,427,141],[427,209,460,242],
      [613,207,613,141],[613,209,613,274],[788,207,788,141],[788,209,788,274],
      [975,207,975,141],[975,209,975,274],[1173,207,1173,141],[1173,209,1173,274],
      [613,340,613,274],[613,342,613,407],[788,340,788,274],[788,342,788,407],
      [975,340,975,274],[975,342,975,407],
      [229,473,229,407],[229,475,229,540],[427,473,427,540],[427,475,427,540],
      [613,473,613,407],[613,475,613,407],[788,473,788,407],[788,475,788,540],
      [975,473,975,407],[975,475,975,540],[1173,473,1173,407],[1173,475,1173,540],
      [229,606,229,540],[229,608,229,673],[613,606,580,578],[613,608,580,578],
      [788,606,788,540],[788,608,788,673],[1173,606,1173,540],[1173,608,1173,673],
      [427,739,427,794],[427,741,427,794],[613,739,613,673],[613,741,613,794],
      [788,739,788,673],[788,741,788,794],[975,739,975,673],[975,741,975,794],
      [327,141,229,141],[329,141,427,141],[327,274,229,274],[329,274,390,308],
      [327,407,390,432],[329,407,390,432],[327,540,229,540],[329,540,427,540],
      [327,794,229,794],[329,794,427,794],
      [525,141,427,141],[527,141,613,141],[525,274,460,242],[527,274,613,274],
      [525,407,460,375],[527,407,613,407],[525,673,427,673],[527,673,613,673],
      [525,794,427,794],[527,794,613,794],
      [700,141,613,141],[702,141,788,141],[700,274,613,274],[702,274,788,274],
      [700,407,613,407],[702,407,788,407],[700,540,648,510],[702,540,648,510],
      [875,141,788,141],[877,141,975,141],[875,274,788,274],[877,274,975,274],
      [875,407,788,407],[877,407,975,407],[875,540,788,540],[877,540,975,540],
      [875,794,788,794],[877,794,975,794],
      [1073,141,975,141],[1075,141,1173,141],[1073,274,975,274],[1075,274,1173,274],
      [1073,407,975,407],[1075,407,1173,407],[1073,540,975,540],[1075,540,1173,540],
      [1073,794,975,794],[1075,794,1173,794],
      [215,42,229,141],[55,437,229,407],[1334,288,1173,274],[1334,563,1173,540],
      [628,910,613,794],[795,910,788,794],
      [390,308,460,242],[390,432,460,375],[648,510,580,578],
      [427,673,427,794],[613,673,613,794],[975,673,975,794],
    ];
    for (const [c1,r1,c2,r2] of ROAD_SEGS_EARLY) {
      const dc = c2>c1?1:c2<c1?-1:0;
      const dr = r2>r1?1:r2<r1?-1:0;
      for (let c=c1; c!==c2; c+=dc) addRoadTile(c,r1);
      if (dr!==0) for (let r=r1; r!==r2+dr; r+=dr) addRoadTile(c2,r);
      else addRoadTile(c2,r1);
    }
  }

  // ── P10–P13: stamp 2×2 structures ────────────────────────────────────────────
  // Each tile that rolled P10-P13 becomes the top-left of a 2×2 footprint.
  // Primary (top-left): F_KEEP. Other 3 cells: F_KEEPPART pointing to primary.
  // Skip if any of the 4 cells is already occupied by a keep/HQ/gate/border.
  const P10_SIEGE = { 10:8000, 11:10000, 12:14000, 13:20000 };
  const keepMeta = {};

  for (let r2 = 0; r2 < ROWS - 1; r2++) {
    for (let c2 = 0; c2 < COLS - 1; c2++) {
      const idx2 = r2 * COLS + c2;
      const pl2  = powerArr[idx2];
      if (pl2 < 10) continue;

      // All 4 cells must be clear of flags AND outside static keep footprints AND not on roads
      const cells = [[c2,r2],[c2+1,r2],[c2,r2+1],[c2+1,r2+1]];
      let blocked = false;
      for (const [tc, tr] of cells) {
        const ti = tr * COLS + tc;
        if (flagArr[ti] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) { blocked = true; break; }
        if (KEEP_FOOTPRINT_SET.has(`${tc},${tr}`)) { blocked = true; break; }
        if (ROAD_TILE_SET.has(ti)) { blocked = true; break; }
      }
      if (blocked) { powerArr[idx2] = 9; continue; }

      const siege2 = P10_SIEGE[pl2] ?? 8000;

      // Primary tile — preserve natural terrain and rss for prop rendering
      flagArr[idx2]     = (flagArr[idx2] & ~(F_KEEPPART|F_HQ|F_HQPART)) | F_KEEP;
      garrisonArr[idx2] = Math.round(POWER_DEFS[pl2].command * 100); // stored ×100, divide on read
      siegeArr[idx2]    = siege2;
      siegeMaxArr[idx2] = siege2;

      // 3 KEEPPART tiles — preserve natural terrain, copy primary's rss so all 4 cells share the same prop type
      const primaryRss = rssArr[idx2];
      for (const [tc, tr] of [[c2+1,r2],[c2,r2+1],[c2+1,r2+1]]) {
        const ti = tr * COLS + tc;
        powerArr[ti]    = pl2;
        regionArr[ti]   = regionArr[idx2];
        flagArr[ti]     = (flagArr[ti] & ~(F_KEEP|F_HQ|F_HQPART|F_WIN)) | F_KEEPPART;
        keepPrimArr[ti] = idx2;
        rssArr[ti]      = primaryRss;
      }

      keepMeta[`${c2},${r2}`] = {
        keepName:      `P${pl2} Structure`,
        garrisonWaves: 2,
        cx: c2, cy: r2,
      };
    }
  }

  const KEEP_CMD_LVL=20, KEEP_TROOPS=2000, KEEP_SIEGE=5000, KEEP_RADIUS=2;
  const GATE_CMD_LVL=20, GATE_GARRISON=2000, GATE_SIEGE=10000; // 20 command @ 0.01 per small troop

  for (const reg of REGION_LIST) {
    const idx = reg.cy*COLS + reg.cx;
    if (flagArr[idx] & (F_HQ | F_HQPART)) continue;

    terrainArr[idx]  = TERRAIN_ENC.grass;
    rssArr[idx]      = 0;
    powerArr[idx]    = 4;
    regionArr[idx]   = REGION_KEY_TO_IDX[reg.key];
    garrisonArr[idx] = KEEP_TROOPS;
    siegeArr[idx]    = KEEP_SIEGE;
    siegeMaxArr[idx] = KEEP_SIEGE;
    flagArr[idx]     = (flagArr[idx] & ~(F_KEEPPART|F_HQ|F_HQPART)) | F_KEEP;
    if (reg.layer==="ring") flagArr[idx] |= F_WIN;

    keepMeta[`${reg.cx},${reg.cy}`] = {
      keepName: reg.keepName,
      garrisonWaves: 20,
      defCmd: {
        n:reg.keepName, icon:"🏰", cls:"defender", faction:null, rarity:"veteran",
        lvl:KEEP_CMD_LVL, troops:KEEP_TROOPS,
        atk:120*KEEP_CMD_LVL, spd:40+KEEP_CMD_LVL*2,
      },
    };

    for (let dc=-KEEP_RADIUS; dc<=KEEP_RADIUS; dc++) {
      for (let dr=-KEEP_RADIUS; dr<=KEEP_RADIUS; dr++) {
        if (dc===0&&dr===0) continue;
        const fc=reg.cx+dc, fr=reg.cy+dr;
        if (fc<0||fr<0||fc>=COLS||fr>=ROWS) continue;
        const fi=fr*COLS+fc;
        terrainArr[fi]  = TERRAIN_ENC.grass;
        rssArr[fi]      = 0;
        regionArr[fi]   = REGION_KEY_TO_IDX[reg.key];
        flagArr[fi]     = (flagArr[fi]&~(F_KEEP|F_HQ|F_HQPART|F_WIN))|F_KEEPPART;
        keepPrimArr[fi] = reg.cy*COLS+reg.cx;
      }
    }
  }

  // Pre-own starter keeps
  const STARTER_CMDS = {
    pirates:        { n:"Saltmere Captain",       icon:"⚓"  },
    orcs:           { n:"Grimhold Warchief",       icon:"💀"  },
    wizards:  { n:"Wizard Apprentice",        icon:"🧙"  },
    dragons:        { n:"Emberpeak Drake",         icon:"🔥"  },
    holyknights:    { n:"Sanctumhold Inquisitor",  icon:"✝️"  },
    nightcreatures: { n:"Shadowmere Nightlord",    icon:"🌑"  },
    coldborns:      { n:"Frosthold Warden",        icon:"❄️"  },
    ashen_dead:     { n:"Bonehallow Lich",         icon:"💀"  },
  };
  for (const [fk, regions] of Object.entries(FACTION_REGIONS)) {
    const startReg = REGION_LIST.find(r=>r.key===regions.start);
    if (!startReg) continue;
    const idx = startReg.cy*COLS+startReg.cx;
    ownerArr[idx] = OWNER_ENC[fk];
    const sc = STARTER_CMDS[fk];
    const meta = keepMeta[`${startReg.cx},${startReg.cy}`];
    if (meta && sc) {
      meta.defCmd = { ...meta.defCmd, ...sc, cls:"defender", rarity:"veteran", faction:fk };
    }
    for (let dc=-KEEP_RADIUS; dc<=KEEP_RADIUS; dc++) {
      for (let dr=-KEEP_RADIUS; dr<=KEEP_RADIUS; dr++) {
        if (dc===0&&dr===0) continue;
        const fc=startReg.cx+dc, fr=startReg.cy+dr;
        if (fc<0||fr<0||fc>=COLS||fr>=ROWS) continue;
        const fi=fr*COLS+fc;
        if ((flagArr[fi]&F_KEEPPART)&&keepPrimArr[fi]===idx) ownerArr[fi]=OWNER_ENC[fk];
      }
    }
  }

  postMessage({ type:"progress", pct:88, label:"Painting borders..." });

  // ── Paint full border strips + place crossing gate structures ─────────────
  const gateMeta  = {};
  const impassKeys = [];

  for (const bl of groupCrossingsByBorder(CROSSINGS)) {
    const terrEnc = borderTerrain(bl.axis, bl.bCoord, bl.crossings);
    const { impassable, gateA, gateB, pathTiles } = buildBorderLine(bl.axis, bl.bCoord, bl.crossings);

    // Paint impassable border tiles
    for (const {x, y} of impassable) {
      const idx = y*COLS+x;
      if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
      terrainArr[idx]  = terrEnc;
      flagArr[idx]     = (flagArr[idx] & ~F_GATE) | F_BORDER;
      rssArr[idx]      = 0;
      garrisonArr[idx] = 0;
      impassKeys.push(`${x},${y}`);
    }

    // Paint path tiles — passable, use border terrain so they visually match
    // the surrounding border strip (river/ravine/rockymountain)
    for (const {x, y} of pathTiles) {
      const idx = y*COLS+x;
      if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
      terrainArr[idx]  = terrEnc;
      flagArr[idx]     = (flagArr[idx] & ~F_BORDER) | F_GATE;
      rssArr[idx]      = 0;
      garrisonArr[idx] = 0;
    }

    // Place Gate A structures
    for (const {x, y, id, type} of gateA) {
      const idx = y*COLS+x;
      if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
      terrainArr[idx]  = terrEnc;
      flagArr[idx]     = (flagArr[idx] & ~F_BORDER) | F_GATE | F_KEEP;
      garrisonArr[idx] = GATE_GARRISON;
      siegeArr[idx]    = GATE_SIEGE;
      siegeMaxArr[idx] = GATE_SIEGE;
      rssArr[idx]      = 0;
      const typeName   = type==='crossing'?'Crossing':type==='tollbridge'?'Toll Bridge':'Tunnel';
      gateMeta[`${x},${y}`] = {
        keepName: `${typeName} Gate A`,
        garrisonWaves: 2,
        garrison: GATE_GARRISON,
        garrisonTroops: 20, // 20 command budget
        cx: x, cy: y, side: 'A', type,
        defCmd: {
          n: `${typeName} Gate A Defender`,
          icon: type==='crossing'?'🌊':type==='tollbridge'?'⌒':'🪨',
          cls:'defender', faction:null, rarity:'veteran',
          lvl: GATE_CMD_LVL, troops: GATE_GARRISON,
          atk: 120*GATE_CMD_LVL, spd: 40+GATE_CMD_LVL*2,
        },
      };
    }

    // Place Gate B structures
    for (const {x, y, id, type} of gateB) {
      const idx = y*COLS+x;
      if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
      terrainArr[idx]  = terrEnc;
      flagArr[idx]     = (flagArr[idx] & ~F_BORDER) | F_GATE | F_KEEP;
      garrisonArr[idx] = GATE_GARRISON;
      siegeArr[idx]    = GATE_SIEGE;
      siegeMaxArr[idx] = GATE_SIEGE;
      rssArr[idx]      = 0;
      const typeName   = type==='crossing'?'Crossing':type==='tollbridge'?'Toll Bridge':'Tunnel';
      gateMeta[`${x},${y}`] = {
        keepName: `${typeName} Gate B`,
        garrisonWaves: 2,
        garrison: GATE_GARRISON,
        garrisonTroops: 20, // 20 command budget
        cx: x, cy: y, side: 'B', type,
        defCmd: {
          n: `${typeName} Gate B Defender`,
          icon: type==='crossing'?'🌊':type==='tollbridge'?'⌒':'🪨',
          cls:'defender', faction:null, rarity:'veteran',
          lvl: GATE_CMD_LVL, troops: GATE_GARRISON,
          atk: 120*GATE_CMD_LVL, spd: 40+GATE_CMD_LVL*2,
        },
      };
    }
  }

  // Merge gateMeta into keepMeta
  Object.assign(keepMeta, gateMeta);

  // ── Anti-lockout pass ──────────────────────────────────────────────────────────
  // For every faction start keep, guarantee at least 2 of the 4 orthogonal
  // neighbours are P1. This ensures players can always move out of spawn.
  postMessage({ type:"progress", pct:92, label:"Anti-lockout pass..." });
  {
    const FACTION_STARTS = Object.values(FACTION_REGIONS).map(fr => {
      const reg = REGION_LIST.find(r => r.key === fr.start);
      return reg ? { cx: reg.cx, cy: reg.cy } : null;
    }).filter(Boolean);

    for (const { cx, cy } of FACTION_STARTS) {
      // Check tiles adjacent to keep centre (skip the keep tile itself and its parts)
      const neighbours = [
        { c: cx,   r: cy-1 },
        { c: cx,   r: cy+1 },
        { c: cx-1, r: cy   },
        { c: cx+1, r: cy   },
        { c: cx-1, r: cy-1 },
        { c: cx+1, r: cy-1 },
        { c: cx-1, r: cy+1 },
        { c: cx+1, r: cy+1 },
      ].filter(({ c, r }) =>
        c >= 0 && r >= 0 && c < COLS && r < ROWS &&
        !(flagArr[r*COLS+c] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER))
      );

      const p1Count = neighbours.filter(({ c, r }) => powerArr[r*COLS+c] === 1).length;
      if (p1Count >= 2) continue; // already safe

      // Force the closest non-special neighbours to P1 until we have 2
      let forced = p1Count;
      for (const { c, r } of neighbours) {
        if (forced >= 2) break;
        const idx = r*COLS+c;
        if (powerArr[idx] !== 1) {
          powerArr[idx]    = 1;
          garrisonArr[idx] = Math.round(POWER_DEFS[1].command * 100); // stored ×100
          forced++;
        }
      }
    }
  }

  // ── Pass 2: Static road network ──────────────────────────────────────────────
  // All keep and gate coords are fixed so roads are fixed.
  // Rule: every gate tile roads to its nearest keep. Peninsula keeps with no
  // gates road to their parent keep. Manhattan walk: horizontal then vertical.
  postMessage({ type:"progress", pct:94, label:"Building road network..." });
  {
    const ROAD_SEGMENTS = [

      // ══ H border row 208 ══
      [229,207,  229,141],  // h229_208 A → saltmere
      [229,209,  229,274],  // h229_208 B → deadAnchor
      [427,207,  427,141],  // h427_208 A → brineHollow
      [427,209,  460,242],  // h427_208 B → mistfall
      [613,207,  613,141],  // h613_208 A → gallowsReach
      [613,209,  613,274],  // h613_208 B → wanderingWastes
      [788,207,  788,141],  // h788_208 A → greyExpanse
      [788,209,  788,274],  // h788_208 B → dreadmoor
      [975,207,  975,141],  // h975_208 A → crimsonVeil
      [975,209,  975,274],  // h975_208 B → duskHollow
      [1173,207, 1173,141], // h1173_208 A → paleCourt
      [1173,209, 1173,274], // h1173_208 B → shadowmere

      // ══ H border row 341 ══
      [613,340,  613,274],  // h613_341 A → wanderingWastes
      [613,342,  613,407],  // h613_341 B → theHollow
      [788,340,  788,274],  // h788_341 A → dreadmoor
      [788,342,  788,407],  // h788_341 B → holyGrail
      [975,340,  975,274],  // h975_341 A → duskHollow
      [975,342,  975,407],  // h975_341 B → warbend

      // ══ H border row 474 ══
      [229,473,  229,407],  // h229_474 A → emberpeak
      [229,475,  229,540],  // h229_474 B → scorchveil
      [427,473,  427,540],  // h427_474 A → grimward
      [427,475,  427,540],  // h427_474 B → grimward
      [613,473,  613,407],  // h613_474 A → theHollow
      [613,475,  613,407],  // h613_474 B → theHollow
      [788,473,  788,407],  // h788_474 A → holyGrail
      [788,475,  788,540],  // h788_474 B → hallowedGround
      [975,473,  975,407],  // h975_474 A → warbend
      [975,475,  975,540],  // h975_474 B → bloodfield
      [1173,473, 1173,407], // h1173_474 A → bloodfen
      [1173,475, 1173,540], // h1173_474 B → grimhold

      // ══ H border row 607 ══
      [229,606,  229,540],  // h229_607 A → scorchveil
      [229,608,  229,673],  // h229_607 B → forsakenMarch
      [613,606,  580,578],  // h613_607 A → sunkenRoad
      [613,608,  580,578],  // h613_607 B → sunkenRoad
      [788,606,  788,540],  // h788_607 A → hallowedGround
      [788,608,  788,673],  // h788_607 B → paleMarch
      [1173,606, 1173,540], // h1173_607 A → grimhold
      [1173,608, 1173,673], // h1173_607 B → bonepile

      // ══ H border row 740 ══
      [427,739,  427,794],  // h427_740 A → cursemoor
      [427,741,  427,794],  // h427_740 B → cursemoor
      [613,739,  613,673],  // h613_740 A → ruinwatch
      [613,741,  613,794],  // h613_740 B → ashenveil
      [788,739,  788,673],  // h788_740 A → paleMarch
      [788,741,  788,794],  // h788_740 B → sanctumhold
      [975,739,  975,673],  // h975_740 A → pilgrimsRest
      [975,741,  975,794],  // h975_740 B → sacredVale

      // ══ V border col 328 ══
      [327,141,  229,141],  // v328_141 A → saltmere
      [329,141,  427,141],  // v328_141 B → brineHollow
      [327,274,  229,274],  // v328_274 A → deadAnchor
      [329,274,  390,308],  // v328_274 B → thornveil
      [327,407,  390,432],  // v328_407 A → cinderPass
      [329,407,  390,432],  // v328_407 B → cinderPass
      [327,540,  229,540],  // v328_540 A → scorchveil
      [329,540,  427,540],  // v328_540 B → grimward
      [327,794,  229,794],  // v328_794 A → ashenFen
      [329,794,  427,794],  // v328_794 B → cursemoor

      // ══ V border col 526 ══
      [525,141,  427,141],  // v526_141 A → brineHollow
      [527,141,  613,141],  // v526_141 B → gallowsReach
      [525,274,  460,242],  // v526_274 A → mistfall
      [527,274,  613,274],  // v526_274 B → wanderingWastes
      [525,407,  460,375],  // v526_407 A → ashcrag
      [527,407,  613,407],  // v526_407 B → theHollow
      [525,673,  427,673],  // v526_673 A → hexmire
      [527,673,  613,673],  // v526_673 B → ruinwatch
      [525,794,  427,794],  // v526_794 A → cursemoor
      [527,794,  613,794],  // v526_794 B → ashenveil

      // ══ V border col 701 ══
      [700,141,  613,141],  // v701_141 A → gallowsReach
      [702,141,  788,141],  // v701_141 B → greyExpanse
      [700,274,  613,274],  // v701_274 A → wanderingWastes
      [702,274,  788,274],  // v701_274 B → dreadmoor
      [700,407,  613,407],  // v701_407 A → theHollow
      [702,407,  788,407],  // v701_407 B → holyGrail
      [700,540,  648,510],  // v701_540 A → shatteredPass
      [702,540,  648,510],  // v701_540 B → shatteredPass

      // ══ V border col 876 ══
      [875,141,  788,141],  // v876_141 A → greyExpanse
      [877,141,  975,141],  // v876_141 B → crimsonVeil
      [875,274,  788,274],  // v876_274 A → dreadmoor
      [877,274,  975,274],  // v876_274 B → duskHollow
      [875,407,  788,407],  // v876_407 A → holyGrail
      [877,407,  975,407],  // v876_407 B → warbend
      [875,540,  788,540],  // v876_540 A → hallowedGround
      [877,540,  975,540],  // v876_540 B → bloodfield
      [875,794,  788,794],  // v876_794 A → sanctumhold
      [877,794,  975,794],  // v876_794 B → sacredVale

      // ══ V border col 1074 ══
      [1073,141, 975,141],  // v1074_141 A → crimsonVeil
      [1075,141, 1173,141], // v1074_141 B → paleCourt
      [1073,274, 975,274],  // v1074_274 A → duskHollow
      [1075,274, 1173,274], // v1074_274 B → shadowmere
      [1073,407, 975,407],  // v1074_407 A → warbend
      [1075,407, 1173,407], // v1074_407 B → bloodfen
      [1073,540, 975,540],  // v1074_540 A → bloodfield
      [1075,540, 1173,540], // v1074_540 B → grimhold
      [1073,794, 975,794],  // v1074_794 A → sacredVale
      [1075,794, 1173,794], // v1074_794 B → dawnmarch

      // ══ Peninsula keeps — no gates, road to parent keep ══
      [215,42,   229,141],  // plunderMaw → saltmere
      [55,437,   229,407],  // smolderingMaw → emberpeak
      [1334,288, 1173,274], // theShroud → shadowmere
      [1334,563, 1173,540], // theWarground → grimhold
      [628,910,  613,794],  // arcaneDeep → ashenveil
      [795,910,  788,794],  // blessedShore → sanctumhold

      // ══ Same-region keep pairs needing internal connection ══
      [390,308,  460,242],  // thornveil ↔ mistfall
      [390,432,  460,375],  // cinderPass ↔ ashcrag
      [648,510,  580,578],  // shatteredPass ↔ sunkenRoad
      [427,673,  427,794],  // hexmire ↔ cursemoor
      [613,673,  613,794],  // ruinwatch ↔ ashenveil
      [975,673,  975,794],  // pilgrimsRest ↔ sacredVale
    ];

    const stampRoad = (c, r) => {
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      const idx = r * COLS + c;
      const fl  = flagArr[idx];
      if (fl & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) return;
      terrainArr[idx]  = TERRAIN_ENC.hellfire;
      if (powerArr[idx] !== 1) {
        powerArr[idx]    = 1;
        garrisonArr[idx] = Math.round(POWER_DEFS[1].command * 100); // stored ×100
      }
    };

    // Carve each segment: horizontal leg first, then vertical
    for (const [c1, r1, c2, r2] of ROAD_SEGMENTS) {
      const dc = c2 > c1 ? 1 : c2 < c1 ? -1 : 0;
      const dr = r2 > r1 ? 1 : r2 < r1 ? -1 : 0;
      for (let c = c1; c !== c2; c += dc) stampRoad(c, r1);
      if (dr !== 0) for (let r = r1; r !== r2 + dr; r += dr) stampRoad(c2, r);
      else stampRoad(c2, r1);
    }
  }

  postMessage({ type:"progress", pct:96, label:"Finding spawn points..." });

  // Build per-faction region lists so we can spread 50 HQs across all home regions
  const FACTION_ALL_REGIONS = {};
  for (const fk of ["pirates","orcs","wizards","dragons","holyknights","nightcreatures","coldborns","ashen_dead"]) {
    FACTION_ALL_REGIONS[fk] = REGION_LIST.filter(r => r.factions && r.factions.includes(fk));
  }

  // Stamp a placed HQ's 3x3 footprint into ALL typed arrays so the main thread
  // receives complete HQ tiles — no post-reconstruction rawMap mutations needed.
  // Previously the worker only wrote flagArr, leaving ownership/terrain/garrison/siege
  // for the main thread's placeHQFootprint() to patch after 1.4M tile reconstruction.
  // With 50 HQs × 5 factions × 9 tiles = 2,250 Object.create+spread calls on the
  // main thread, this blocked the props idle callback for 10-15 seconds.
  const HQ_SIEGE = Math.round(50 * 100); // hqSiegeValue(0) × 100, stored ×100
  function stampHQFootprint(key, ownerCode) {
    const [hc, hr] = key.split(",").map(Number);
    const centerIdx = hr*COLS + hc;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const idx = (hr+dr)*COLS + (hc+dc);
        if (idx < 0 || idx >= SIZE) continue;
        const isCenter = dc === 0 && dr === 0;
        // Flags
        flagArr[idx] = (flagArr[idx] & ~(F_KEEP|F_KEEPPART|F_WIN)) | (isCenter ? F_HQ : F_HQPART);
        // Ownership
        ownerArr[idx] = ownerCode;
        // Keep primary key for border rendering
        if (!isCenter) keepPrimArr[idx] = centerIdx;
        // Terrain — HQ footprint uses desert for better border visibility
        terrainArr[idx] = TERRAIN_ENC.desert;
        rssArr[idx]     = 0;
        // Garrison/siege — center tile gets full siege value, parts get 0
        if (isCenter) {
          garrisonArr[idx] = 0; // HQs start with no garrison troops
          siegeArr[idx]    = HQ_SIEGE;
          siegeMaxArr[idx] = HQ_SIEGE;
        } else {
          garrisonArr[idx] = 0;
          siegeArr[idx]    = 0;
          siegeMaxArr[idx] = 0;
        }
      }
    }
  }

  const spawnKeys={}, usedKeys=new Set();
  // Place 50 HQs per faction, round-robin across that faction's home regions
  for (const fk of ["pirates","orcs","wizards","dragons","holyknights","nightcreatures","coldborns","ashen_dead"]) {
    const regions = FACTION_ALL_REGIONS[fk];
    if (!regions || !regions.length) continue;
    const ownerCode = OWNER_ENC[fk];
    const keys = [];
    for (let i = 0; i < 50; i++) {
      const reg = regions[i % regions.length];
      const key = randomSpawn(reg.key, usedKeys, flagArr, terrainArr, powerArr);
      if (key) {
        keys.push(key);
        usedKeys.add(key);
        stampHQFootprint(key, ownerCode); // writes flags + owner + terrain + garrison + siege
      }
    }
    spawnKeys[fk] = keys; // array of up to 50 keys
  }

  postMessage({ type:"progress", pct:98, label:"Finishing up..." });

  // ── Pre-build per-faction tile key lists ──────────────────────────────────
  // Scanning ownerArr here (worker thread, no jank) saves the main thread from
  // two separate O(1.4M) passes over rawMap after reconstruction:
  //   - one to build aiTileKeysMapRef per faction
  //   - one to build pKeysRef + powerPerHrRef for the player
  // ownerArr now includes HQ footprint tiles (stamped above in stampHQFootprint),
  // so factionTileKeys will correctly include all faction-owned tiles including HQs.
  const POWER_DEFS_RING = {
    1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0,
    10:10, 11:15, 12:20, 13:30,
  };
  const factionTileKeys = {};
  for (const fk of ["pirates","orcs","wizards","dragons","holyknights","nightcreatures","coldborns","ashen_dead"]) {
    factionTileKeys[fk] = [];
  }
  const playerTileKeys = [];
  let   playerPowerPerHr = 0;

  const F_HQ_OR_PART = F_HQ | F_HQPART;
  for (let idx = 0; idx < SIZE; idx++) {
    const ownerCode = ownerArr[idx];
    if (ownerCode === 0) continue; // unowned — most tiles
    const c = idx % COLS, r = Math.floor(idx / COLS);
    const key = `${c},${r}`;
    if (ownerCode === 1) {
      // player — HQ tiles placed after this loop, so none here yet. Kept for safety.
      playerTileKeys.push(key);
    } else {
      // faction-owned (code 3–8)
      const fk = OWNER_DEC[ownerCode];
      if (fk && factionTileKeys[fk]) {
        factionTileKeys[fk].push(key);
        // player power from faction tiles is 0 at start — only player tiles matter
      }
    }
  }
  // Note: playerPowerPerHr stays 0 here — player owns no tiles at game start
  // (their HQ is placed by the main thread after reconstruction). The main thread
  // seeds powerPerHrRef from pKeysRef after the first ownership change.

  // Send typed arrays as zero-copy transferables (32 MB total, no structured clone cost).
  // Main thread reconstructs tile objects — but does so in async chunks to stay responsive.
  const transferables = [
    terrainArr.buffer, ownerArr.buffer, rssArr.buffer, troopArr.buffer,
    powerArr.buffer, regionArr.buffer, flagArr.buffer,
    garrisonArr.buffer, siegeArr.buffer, siegeMaxArr.buffer, keepPrimArr.buffer,
  ];

  // Determine AI factions for the main thread
  const allFactions = ["pirates","orcs","wizards","dragons","holyknights","nightcreatures","coldborns","ashen_dead"];
  const aiFactions  = allFactions.filter(f => f !== facKey);
  const aiHqMap     = {};
  aiFactions.forEach(aiFk => { aiHqMap[aiFk] = spawnKeys[aiFk] || []; });

  postMessage({
    type: "done",
    buffers: {
      terrain:  terrainArr.buffer,
      owner:    ownerArr.buffer,
      rss:      rssArr.buffer,
      troop:    troopArr.buffer,
      power:    powerArr.buffer,
      region:   regionArr.buffer,
      flags:    flagArr.buffer,
      garrison: garrisonArr.buffer,
      siege:    siegeArr.buffer,
      siegeMax: siegeMaxArr.buffer,
      keepPrim: keepPrimArr.buffer,
    },
    meta: {
      COLS, ROWS,
      regionList: REGION_LIST,
      keepMeta,
      crossings: CROSSINGS,
      impassKeys,
      TERRAIN_DEC, RSS_DEC, TROOP_DEC, OWNER_DEC,
      F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_WIN, F_DEFEATED, F_GATE, F_BORDER,
    },
    spawnKeys,
    aiHqMap,
    factionTileKeys,   // pre-built per-faction tile key arrays — eliminates O(1.4M) scans on main thread
    playerTileKeys,    // player-owned keys at worker time (empty at gen, populated after HQ placement)
    playerSpawn: (spawnKeys[facKey] || [])[0] || null, // player uses first key of their faction
  }, transferables);
};
