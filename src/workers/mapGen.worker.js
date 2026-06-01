// Build: 1779593297
// ── Map Generation Web Worker ─────────────────────────────────────────────────
// Communicates via postMessage:
//   incoming: { facKey }
//   outgoing: { type:'progress', pct, label }
//             { type:'done', buffers, meta, spawnKeys, aiHqMap, playerSpawn }  ← transferable, zero-copy

const COLS = 1845, ROWS = 1305;
const SIZE = COLS * ROWS;
const SIEGE_BASE = 50;

const RKEYS      = ["stone","wood","gas","food"];
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
  { pl:1,  w: 388952 }, // +25 for new map size
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
// P10–P13 weights are divided by 4 vs original since each is now a single tile (was 2×2).
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
const RSS_ENC     = { stone:1, wood:2, gas: 3, food: 4 };
const RSS_DEC     = [null,"stone","wood","gas","food"];
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
const F_GATE     = 1<<7;  // crossing/tunnel gate tile (passable border)
const F_BORDER   = 1<<8;  // border terrain tile (impassable, not a gate)

// ── Region list — 1850×1300 design space ──────────────────────────────────────
const REGION_LIST = [
  { key:"shadowmere", name:"Skullcove", layer:"farm", keepName:"Skullcove Keep", cx:102, cy:1232, factions:[] },
  { key:"icepeak", name:"Salthaven", layer:"farm", keepName:"Salthaven Keep", cx:307, cy:1232, factions:["pirates"] },
  { key:"frosthold", name:"Deadmans Harbor", layer:"start", keepName:"Deadmans Harbor Keep", cx:512, cy:1232, factions:["pirates"] },
  { key:"icebreak", name:"Blackbrine", layer:"farm", keepName:"Blackbrine Keep", cx:717, cy:1232, factions:["pirates"] },
  { key:"drearfort", name:"Drearfort", layer:"farm", keepName:"Drearfort Keep", cx:922, cy:1232, factions:[] },
  { key:"shadowmire", name:"Wraithmoor", layer:"farm", keepName:"Wraithmoor Keep", cx:1127, cy:1232, factions:["ashen_dead"] },
  { key:"duskmire", name:"Bonehallow", layer:"start", keepName:"Bonehallow Keep", cx:1332, cy:1232, factions:["ashen_dead"] },
  { key:"shadowfen", name:"Ghosthollow", layer:"farm", keepName:"Ghosthollow Keep", cx:1537, cy:1232, factions:["ashen_dead"] },
  { key:"gravemist", name:"Gravemist", layer:"farm", keepName:"Gravemist Keep", cx:1742, cy:1232, factions:[] },
  { key:"flamecrestpeak", name:"Bloodrock", layer:"start", keepName:"Bloodrock Keep", cx:102, cy:1087, factions:["orcs"] },
  { key:"ebonvault", name:"Battlemarsh", layer:"farm", keepName:"Battlemarsh Keep", cx:410, cy:1087, factions:["orcs"] },
  { key:"wraithmoor", name:"Nightmarsh", layer:"farm", keepName:"Nightmarsh Keep", cx:717, cy:1087, factions:[] },
  { key:"deathmarsh", name:"Deathmarsh", layer:"farm", keepName:"Deathmarsh Keep", cx:922, cy:1087, factions:[] },
  { key:"bleakstone", name:"Bleakstone", layer:"farm", keepName:"Bleakstone Keep", cx:1127, cy:1087, factions:[] },
  { key:"fellwood", name:"Steelwatch", layer:"farm", keepName:"Steelwatch Keep", cx:1435, cy:1087, factions:["holyknights"] },
  { key:"arcaneum", name:"Oathkeep", layer:"start", keepName:"Oathkeep Keep", cx:1742, cy:1087, factions:["holyknights"] },
  { key:"cursedfen", name:"Wargrim", layer:"farm", keepName:"Wargrim Keep", cx:102, cy:870, factions:["orcs"] },
  { key:"rotmire", name:"Warbane", layer:"farm", keepName:"Warbane Keep", cx:307, cy:942, factions:[] },
  { key:"blightmoor", name:"Blightmoor", layer:"farm", keepName:"Blightmoor Keep", cx:512, cy:942, factions:[] },
  { key:"skullcrag", name:"Skullcrag", layer:"farm", keepName:"Skullcrag Keep", cx:717, cy:942, factions:[] },
  { key:"ghosthollow", name:"Fellwood", layer:"farm", keepName:"Fellwood Keep", cx:922, cy:942, factions:[] },
  { key:"doomspire", name:"Doomspire", layer:"farm", keepName:"Doomspire Keep", cx:1127, cy:942, factions:[] },
  { key:"duskwood", name:"Duskwood", layer:"farm", keepName:"Duskwood Keep", cx:1332, cy:942, factions:[] },
  { key:"gloomvale", name:"Stoneheart", layer:"farm", keepName:"Stoneheart Keep", cx:1537, cy:942, factions:[] },
  { key:"nightmarsh", name:"Lightshield", layer:"farm", keepName:"Lightshield Keep", cx:1742, cy:870, factions:["holyknights"] },
  { key:"cryptwood", name:"Cryptwood", layer:"farm", keepName:"Cryptwood Keep", cx:307, cy:797, factions:[] },
  { key:"bonewood", name:"Bonewood", layer:"farm", keepName:"Bonewood Keep", cx:512, cy:797, factions:[] },
  { key:"ashenvale", name:"Finalhope", layer:"farm", keepName:"Finalhope Keep", cx:769, cy:761, factions:[] },
  { key:"thornvale", name:"Lastwatch", layer:"farm", keepName:"Lastwatch Keep", cx:1076, cy:761, factions:[] },
  { key:"grimstone", name:"Grimstone", layer:"farm", keepName:"Grimstone Keep", cx:1332, cy:797, factions:[] },
  { key:"darkhollow", name:"Darkhollow", layer:"farm", keepName:"Darkhollow Keep", cx:1537, cy:797, factions:[] },
  { key:"blackstone", name:"Blackstone", layer:"farm", keepName:"Blackstone Keep", cx:102, cy:652, factions:[] },
  { key:"deadwood", name:"Deadwood", layer:"farm", keepName:"Deadwood Keep", cx:307, cy:652, factions:[] },
  { key:"frostbite", name:"Frostbite", layer:"farm", keepName:"Frostbite Keep", cx:512, cy:652, factions:[] },
  { key:"holygrail", name:"Holy Grail", layer:"ring", keepName:"Holy Grail Keep", cx:922, cy:652, factions:[] },
  { key:"bloodmoor", name:"Bloodmoor", layer:"farm", keepName:"Bloodmoor Keep", cx:1332, cy:652, factions:[] },
  { key:"wargrim", name:"Cursedfen", layer:"farm", keepName:"Cursedfen Keep", cx:1537, cy:652, factions:[] },
  { key:"icefall", name:"Ashenmark", layer:"farm", keepName:"Ashenmark Keep", cx:1742, cy:652, factions:[] },
  { key:"steelwatch", name:"Gloomvale", layer:"farm", keepName:"Gloomvale Keep", cx:307, cy:507, factions:[] },
  { key:"ironhold", name:"Ironhold", layer:"farm", keepName:"Ironhold Keep", cx:512, cy:507, factions:[] },
  { key:"battlemarsh", name:"Dawngate", layer:"farm", keepName:"Dawngate Keep", cx:769, cy:543, factions:[] },
  { key:"stormwatch", name:"Twilightspire", layer:"farm", keepName:"Twilightspire Keep", cx:1076, cy:543, factions:[] },
  { key:"tidecrag", name:"Tidecrag", layer:"farm", keepName:"Tidecrag Keep", cx:1332, cy:507, factions:[] },
  { key:"warbane", name:"Stormwatch", layer:"farm", keepName:"Stormwatch Keep", cx:1537, cy:507, factions:[] },
  { key:"lightshield", name:"Ebonvault", layer:"farm", keepName:"Ebonvault Keep", cx:102, cy:435, factions:["dragons"] },
  { key:"emberfang", name:"Emberfang", layer:"farm", keepName:"Emberfang Keep", cx:307, cy:362, factions:[] },
  { key:"spellspire", name:"Thornvale", layer:"farm", keepName:"Thornvale Keep", cx:512, cy:362, factions:[] },
  { key:"runestone", name:"Rotmire", layer:"farm", keepName:"Rotmire Keep", cx:717, cy:362, factions:[] },
  { key:"skullcove", name:"Dreadmarsh", layer:"farm", keepName:"Dreadmarsh Keep", cx:922, cy:362, factions:[] },
  { key:"blackbrine", name:"Ironwood", layer:"farm", keepName:"Ironwood Keep", cx:1127, cy:362, factions:[] },
  { key:"mysticfen", name:"Deepwater", layer:"farm", keepName:"Deepwater Keep", cx:1332, cy:362, factions:[] },
  { key:"salthaven", name:"Runestone", layer:"farm", keepName:"Runestone Keep", cx:1537, cy:362, factions:[] },
  { key:"deepwater", name:"Spellspire", layer:"farm", keepName:"Spellspire Keep", cx:1742, cy:435, factions:["wizards"] },
  { key:"bloodrock", name:"Flamecrest Peak", layer:"start", keepName:"Flamecrest Peak Keep", cx:102, cy:217, factions:["dragons"] },
  { key:"fogmire", name:"Fogmire", layer:"farm", keepName:"Fogmire Keep", cx:410, cy:217, factions:["dragons"] },
  { key:"graveshroud", name:"Graveshroud", layer:"farm", keepName:"Graveshroud Keep", cx:717, cy:217, factions:[] },
  { key:"greywatch", name:"Greywatch", layer:"farm", keepName:"Greywatch Keep", cx:922, cy:217, factions:[] },
  { key:"voidmarsh", name:"Voidmarsh", layer:"farm", keepName:"Voidmarsh Keep", cx:1127, cy:217, factions:[] },
  { key:"stoneheart", name:"Mysticfen", layer:"farm", keepName:"Mysticfen Keep", cx:1435, cy:217, factions:["wizards"] },
  { key:"oathkeep", name:"Arcaneum", layer:"start", keepName:"Arcaneum Keep", cx:1742, cy:217, factions:["wizards"] },
  { key:"ashenmark", name:"Icefall", layer:"farm", keepName:"Icefall Keep", cx:102, cy:72, factions:[] },
  { key:"dreadmarsh", name:"Icepeak", layer:"farm", keepName:"Icepeak Keep", cx:307, cy:72, factions:["coldborns"] },
  { key:"deadmansharbor", name:"Frosthold", layer:"start", keepName:"Frosthold Keep", cx:512, cy:72, factions:["coldborns"] },
  { key:"ironwood", name:"Icebreak", layer:"farm", keepName:"Icebreak Keep", cx:717, cy:72, factions:["coldborns"] },
  { key:"lastwatch", name:"Ashenvale", layer:"farm", keepName:"Ashenvale Keep", cx:922, cy:72, factions:[] },
  { key:"finalhope", name:"Shadowmere", layer:"farm", keepName:"Shadowmere Keep", cx:1127, cy:72, factions:["nightcreatures"] },
  { key:"bonehallow", name:"Duskmire", layer:"start", keepName:"Duskmire Keep", cx:1332, cy:72, factions:["nightcreatures"] },
  { key:"dawngate", name:"Shadowfen", layer:"farm", keepName:"Shadowfen Keep", cx:1537, cy:72, factions:["nightcreatures"] },
  { key:"twilightspire", name:"Shadowmire", layer:"farm", keepName:"Shadowmire Keep", cx:1742, cy:72, factions:[] },
];

const FACTION_REGIONS = {
  coldborns      : { start:"deadmansharbor" },
  nightcreatures : { start:"bonehallow"     },
  dragons        : { start:"bloodrock"      },
  wizards        : { start:"oathkeep"       },
  orcs           : { start:"flamecrestpeak" },
  pirates        : { start:"frosthold"      },
  ashen_dead     : { start:"duskmire"       },
  holyknights    : { start:"arcaneum"       },
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
const REGION_IDX_TO_KEY = {};
REGION_LIST.forEach((r,i) => { REGION_IDX_TO_KEY[i+1] = r.key; });

// Pre-built per-region HQ candidate lists (populated during map gen at pct:96)
const REGION_CANDIDATES = {};

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

// ── Border crossings — auto-generated from polygon edges ─────────────────────
// Each entry: { axis:'H'|'V', bCoord, gCoord, type:'crossing'|'tunnel', id }
// H = horizontal border (strip of rows at bCoord y, gate centered at gCoord x)
// V = vertical border   (strip of cols at bCoord x, gate centered at gCoord y)

// Terrain type per crossing type — V borders use river, H borders use rockymountain
function crossingTerrain(type) {
  if (type === 'crossing') return TERRAIN_ENC.river;
  return TERRAIN_ENC.rockymountain; // tunnel
}

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


// Place gates directly at crossing coordinates
function buildBordersFromCrossings(REGION_MAP, CROSSINGS) {
  const gateA = [], gateB = [], pathTiles = [], impassable = [];
  const BORDER_WIDTH = 2; // 4 tiles total (2 on each side of boundary)
  
  // Extract all vertical and horizontal borders from CROSSINGS
  // Each crossing defines a border line with gates
  const verticalBorders = new Map(); // x -> [{yStart, yEnd, gates: Set}]
  const horizontalBorders = new Map(); // y -> [{xStart, xEnd, gates: Set}]
  
  for (const crossing of CROSSINGS) {
    const { axis, bCoord, gCoord } = crossing;
    
    if (axis === 'V') {
      // Vertical border at x = bCoord
      if (!verticalBorders.has(bCoord)) {
        verticalBorders.set(bCoord, []);
      }
      // Gate at y = gCoord (4 tiles: gCoord-2 to gCoord+1)
      verticalBorders.get(bCoord).push({
        gateY: gCoord,
        gateStart: gCoord - 2,
        gateEnd: gCoord + 1
      });
    } else if (axis === 'H') {
      // Horizontal border at y = bCoord
      if (!horizontalBorders.has(bCoord)) {
        horizontalBorders.set(bCoord, []);
      }
      // Gate at x = gCoord (4 tiles: gCoord-2 to gCoord+1)
      horizontalBorders.get(bCoord).push({
        gateX: gCoord,
        gateStart: gCoord - 2,
        gateEnd: gCoord + 1
      });
    }
  }
  
  // Draw vertical borders (4 tiles wide: -2, -1, +1, +2 from center line)
  for (const [x, gates] of verticalBorders) {
    const gateYSet = new Set();
    gates.forEach(g => {
      // For vertical borders, gate crosses at a single y-coordinate (gateY)
      // The 4 gate tiles span in the x-direction at this y
      gateYSet.add(g.gateY);
    });
    
    // Draw border on 4 tiles: offsets -2, -1, 0, +1 from centerline
    for (let dx = -BORDER_WIDTH; dx < BORDER_WIDTH; dx++) {
      const bx = x + dx;
      if (bx < 0 || bx >= COLS) continue;
      
      for (let y = 0; y < ROWS; y++) {
        // Skip double-height region interior borders
        if (bx >= 408 && bx <= 411 && y >= 1015 && y <= 1160) {
          continue; // Ebonvault
        }
        if (bx >= 408 && bx <= 411 && y >= 145 && y <= 290) {
          continue; // Fogmire
        }
        if (bx >= 1433 && bx <= 1436 && y >= 145 && y <= 290) {
          continue; // Stoneheart
        }
        if (bx >= 1433 && bx <= 1436 && y >= 1015 && y <= 1160) {
          continue; // Fellwood
        }
        // Skip L-shaped region interior borders
        if (bx >= 818 && bx <= 821 && y >= 439 && y <= 579) {
          continue; // Battlemarsh vertical interior
        }
        if (bx >= 1023 && bx <= 1026 && y >= 439 && y <= 579) {
          continue; // Stormwatch vertical interior
        }
        if (bx >= 818 && bx <= 821 && y >= 729 && y <= 869) {
          continue; // Ashenvale vertical interior
        }
        if (bx >= 1023 && bx <= 1026 && y >= 729 && y <= 869) {
          continue; // Thornvale vertical interior
        }
        // Skip L-shaped map-wide vertical border
        if (bx >= 921 && bx <= 924 && y >= 0 && y <= 434) {
          continue; // Map-wide L-shape vertical
        }
        if (bx >= 921 && bx <= 924 && y >= 874 && y <= 1305) {
          continue; // Map-wide L-shape vertical
        }
        // Skip Holy Grail interior vertical borders
        if (bx >= 921 && bx <= 924 && y >= 584 && y <= 649) {
          continue; // Holy Grail interior
        }
        if (bx >= 921 && bx <= 924 && y >= 655 && y <= 724) {
          continue; // Holy Grail interior
        }
        
        if (gateYSet.has(y)) {
          // This y-coordinate has a gate crossing
          // Paths are at x-1 and x (offsets -1, 0); Gates at x-2 and x+1
          const isPath = (bx === x - 1 || bx === x);
          if (isPath) {
            // Path tile - passable, add perpendicular borders
            pathTiles.push({ x: bx, y });
            
            // Add borders on perpendicular sides of path tiles
            for (let pdy = -BORDER_WIDTH; pdy < BORDER_WIDTH; pdy++) {
              if (pdy === 0) continue;
              const pby = y + pdy;
              if (pby >= 0 && pby < ROWS && !gateYSet.has(pby)) {
                impassable.push({ x: bx, y: pby });
              }
            }
          }
          // For gate structures (x-2 and x+1), skip entirely - handled later
        } else {
          // Border tile - impassable
          impassable.push({ x: bx, y });
        }
      }
    }
  }
  
  // Draw horizontal borders (4 tiles wide: -2, -1, +1, +2 from center line)
  for (const [y, gates] of horizontalBorders) {
    const gateXSet = new Set();
    gates.forEach(g => {
      // For horizontal borders, gate crosses at a single x-coordinate (gateX)
      // The 4 gate tiles span in the y-direction at this x
      gateXSet.add(g.gateX);
    });
    
    // Draw border on 4 tiles: offsets -2, -1, 0, +1 from centerline
    for (let dy = -BORDER_WIDTH; dy < BORDER_WIDTH; dy++) {
      const by = y + dy;
      if (by < 0 || by >= ROWS) continue;
      
      for (let x = 0; x < COLS; x++) {
        // Skip double-width region interior borders
        if (by >= 435 && by <= 438 && x >= 0 && x <= 205) {
          continue; // Lightshield
        }
        if (by >= 435 && by <= 438 && x >= 1640 && x <= 1845) {
          continue; // Deepwater
        }
        if (by >= 870 && by <= 873 && x >= 0 && x <= 205) {
          continue; // Cursedfen
        }
        if (by >= 870 && by <= 873 && x >= 1640 && x <= 1845) {
          continue; // Nightmarsh
        }
        // Skip L-shaped region interior borders
        if (by >= 580 && by <= 583 && x >= 617 && x <= 817) {
          continue; // Battlemarsh horizontal interior
        }
        if (by >= 580 && by <= 583 && x >= 1027 && x <= 1227) {
          continue; // Stormwatch horizontal interior
        }
        if (by >= 725 && by <= 728 && x >= 617 && x <= 817) {
          continue; // Ashenvale horizontal interior
        }
        if (by >= 725 && by <= 728 && x >= 1027 && x <= 1227) {
          continue; // Thornvale horizontal interior
        }
        // Skip L-shaped map-wide horizontal border
        if (by >= 652 && by <= 655 && x >= 0 && x <= 612) {
          continue; // Map-wide L-shape horizontal
        }
        if (by >= 652 && by <= 655 && x >= 1232 && x <= 1845) {
          continue; // Map-wide L-shape horizontal
        }
        // Skip Holy Grail interior horizontal borders
        if (by >= 652 && by <= 655 && x >= 822 && x <= 919) {
          continue; // Holy Grail interior
        }
        if (by >= 652 && by <= 655 && x >= 925 && x <= 1022) {
          continue; // Holy Grail interior
        }
        if (by === 655 && x >= 920 && x <= 924) {
          continue; // Holy Grail interior single-row gap
        }
        
        if (gateXSet.has(x)) {
          // This x-coordinate has a gate crossing
          // Paths are at y-1 and y (offsets -1, 0); Gates at y-2 and y+1
          const isPath = (by === y - 1 || by === y);
          if (isPath) {
            // Path tile - passable, add perpendicular borders
            pathTiles.push({ x, y: by });
            
            // Add borders on perpendicular sides of path tiles
            for (let pdx = -BORDER_WIDTH; pdx < BORDER_WIDTH; pdx++) {
              if (pdx === 0) continue;
              const pbx = x + pdx;
              if (pbx >= 0 && pbx < COLS && !gateXSet.has(pbx)) {
                impassable.push({ x: pbx, y: by });
              }
            }
          }
          // For gate structures (y-2 and y+1), skip entirely - handled later
        } else {
          // Border tile - impassable
          impassable.push({ x, y: by });
        }
      }
    }
  }
  
  // Build gate structures at crossing positions
  for (const crossing of CROSSINGS) {
    const { axis, bCoord, gCoord, type, id } = crossing;
    
    if (axis === 'H') {
      // Horizontal border at y = bCoord (spans vertically), gate spans vertically
      gateA.push({ x: gCoord, y: bCoord - 2, id: id+'_A', type, axis });
      gateB.push({ x: gCoord, y: bCoord + 1, id: id+'_B', type, axis });
    } else {
      // Vertical border at x = bCoord (spans horizontally), gate spans horizontally  
      gateA.push({ x: bCoord - 2, y: gCoord, id: id+'_A', type, axis });
      gateB.push({ x: bCoord + 1, y: gCoord, id: id+'_B', type, axis });
    }
  }
  
  return { impassable, gateA, gateB, pathTiles };
}

// ── Generate Voronoi polygons for all 69 regions ─────────────────────────────
// Uses perpendicular bisector clipping to create exact Voronoi cells
// ── Generate Voronoi polygons for all 69 regions ─────────────────────────────
const POLYS = {
  arcaneum: [[1640,1015], [1845,1015], [1845,1160], [1640,1160]],
  ashenmark: [[0,0], [205,0], [205,145], [0,145]],
  ashenvale: [[615,870], [615,652], [820,652], [820,725], [923,725], [923,870]],
  battlemarsh: [[615,652], [615,435], [923,435], [923,580], [820,580], [820,652]],
  blackbrine: [[1025,290], [1230,290], [1230,435], [1025,435]],
  blackstone: [[0,580], [205,580], [205,725], [0,725]],
  bleakstone: [[1025,1015], [1230,1015], [1230,1160], [1025,1160]],
  blightmoor: [[410,870], [615,870], [615,1015], [410,1015]],
  bloodmoor: [[1230,580], [1435,580], [1435,725], [1230,725]],
  bloodrock: [[0,145], [205,145], [205,290], [0,290]],
  bonehallow: [[1230,0], [1435,0], [1435,145], [1230,145]],
  bonewood: [[410,725], [615,725], [615,870], [410,870]],
  cryptwood: [[205,725], [410,725], [410,870], [205,870]],
  cursedfen: [[0,725], [205,725], [205,1015], [0,1015]],
  darkhollow: [[1435,725], [1640,725], [1640,870], [1435,870]],
  dawngate: [[1435,0], [1640,0], [1640,145], [1435,145]],
  deadmansharbor: [[410,0], [615,0], [615,145], [410,145]],
  deadwood: [[205,580], [410,580], [410,725], [205,725]],
  deathmarsh: [[820,1015], [1025,1015], [1025,1160], [820,1160]],
  deepwater: [[1640,290], [1845,290], [1845,580], [1640,580]],
  doomspire: [[1025,870], [1230,870], [1230,1015], [1025,1015]],
  dreadmarsh: [[205,0], [410,0], [410,145], [205,145]],
  drearfort: [[820,1160], [1025,1160], [1025,1305], [820,1305]],
  duskmire: [[1230,1160], [1435,1160], [1435,1305], [1230,1305]],
  duskwood: [[1230,870], [1435,870], [1435,1015], [1230,1015]],
  ebonvault: [[205,1015], [615,1015], [615,1160], [205,1160]],
  emberfang: [[205,290], [410,290], [410,435], [205,435]],
  fellwood: [[1230,1015], [1640,1015], [1640,1160], [1230,1160]],
  finalhope: [[1025,0], [1230,0], [1230,145], [1025,145]],
  flamecrestpeak: [[0,1015], [205,1015], [205,1160], [0,1160]],
  fogmire: [[205,145], [615,145], [615,290], [205,290]],
  frostbite: [[410,580], [615,580], [615,725], [410,725]],
  frosthold: [[410,1160], [615,1160], [615,1305], [410,1305]],
  ghosthollow: [[820,870], [1025,870], [1025,1015], [820,1015]],
  gloomvale: [[1435,870], [1640,870], [1640,1015], [1435,1015]],
  gravemist: [[1640,1160], [1845,1160], [1845,1305], [1640,1305]],
  graveshroud: [[615,145], [820,145], [820,290], [615,290]],
  greywatch: [[820,145], [1025,145], [1025,290], [820,290]],
  grimstone: [[1230,725], [1435,725], [1435,870], [1230,870]],
  holygrail: [[820,580], [1025,580], [1025,725], [820,725]],
  icebreak: [[615,1160], [820,1160], [820,1305], [615,1305]],
  icefall: [[1640,580], [1845,580], [1845,725], [1640,725]],
  icepeak: [[205,1160], [410,1160], [410,1305], [205,1305]],
  ironhold: [[410,435], [615,435], [615,580], [410,580]],
  ironwood: [[615,0], [820,0], [820,145], [615,145]],
  lastwatch: [[820,0], [1025,0], [1025,145], [820,145]],
  lightshield: [[0,290], [205,290], [205,580], [0,580]],
  mysticfen: [[1230,290], [1435,290], [1435,435], [1230,435]],
  nightmarsh: [[1640,725], [1845,725], [1845,1015], [1640,1015]],
  oathkeep: [[1640,145], [1845,145], [1845,290], [1640,290]],
  rotmire: [[205,870], [410,870], [410,1015], [205,1015]],
  runestone: [[615,290], [820,290], [820,435], [615,435]],
  salthaven: [[1435,290], [1640,290], [1640,435], [1435,435]],
  shadowfen: [[1435,1160], [1640,1160], [1640,1305], [1435,1305]],
  shadowmere: [[0,1160], [205,1160], [205,1305], [0,1305]],
  shadowmire: [[1025,1160], [1230,1160], [1230,1305], [1025,1305]],
  skullcove: [[820,290], [1025,290], [1025,435], [820,435]],
  skullcrag: [[615,870], [820,870], [820,1015], [615,1015]],
  spellspire: [[410,290], [615,290], [615,435], [410,435]],
  steelwatch: [[205,435], [410,435], [410,580], [205,580]],
  stoneheart: [[1230,145], [1640,145], [1640,290], [1230,290]],
  stormwatch: [[923,580], [923,435], [1230,435], [1230,652], [1025,652], [1025,580]],
  thornvale: [[923,725], [923,870], [1230,870], [1230,652], [1025,652], [1025,725]],
  tidecrag: [[1230,435], [1435,435], [1435,580], [1230,580]],
  twilightspire: [[1640,0], [1845,0], [1845,145], [1640,145]],
  voidmarsh: [[1025,145], [1230,145], [1230,290], [1025,290]],
  warbane: [[1435,435], [1640,435], [1640,580], [1435,580]],
  wargrim: [[1435,580], [1640,580], [1640,725], [1435,725]],
  wraithmoor: [[615,1015], [820,1015], [820,1160], [615,1160]],
};

// ── Gate crossings (auto-generated from polygon edges) ───────────────────────
// Total gates: 130
const CROSSINGS = [
  // Row 1 vertical gates (y=1213)
  { axis:"V", bCoord:  205, gCoord: 1213, start: 1211, end: 1215, type:"tunnel", id:"gate_1" },
  { axis:"V", bCoord:  410, gCoord: 1213, start: 1211, end: 1215, type:"crossing", id:"gate_2" },
  { axis:"V", bCoord:  615, gCoord: 1213, start: 1211, end: 1215, type:"crossing", id:"gate_3" },
  { axis:"V", bCoord:  820, gCoord: 1213, start: 1211, end: 1215, type:"tunnel", id:"gate_4" },
  { axis:"V", bCoord: 1025, gCoord: 1213, start: 1211, end: 1215, type:"crossing", id:"gate_5" },
  { axis:"V", bCoord: 1230, gCoord: 1213, start: 1211, end: 1215, type:"crossing", id:"gate_6" },
  { axis:"V", bCoord: 1435, gCoord: 1213, start: 1211, end: 1215, type:"tunnel", id:"gate_7" },
  { axis:"V", bCoord: 1640, gCoord: 1213, start: 1211, end: 1215, type:"crossing", id:"gate_8" },
  // Row 2 vertical gates (y=1078)
  { axis:"V", bCoord:  205, gCoord: 1078, start: 1076, end: 1080, type:"crossing", id:"gate_9" },
  { axis:"V", bCoord:  615, gCoord: 1078, start: 1076, end: 1080, type:"tunnel", id:"gate_10" },
  { axis:"V", bCoord:  820, gCoord: 1078, start: 1076, end: 1080, type:"crossing", id:"gate_11" },
  { axis:"V", bCoord: 1025, gCoord: 1078, start: 1076, end: 1080, type:"crossing", id:"gate_12" },
  { axis:"V", bCoord: 1230, gCoord: 1078, start: 1076, end: 1080, type:"tunnel", id:"gate_13" },
  { axis:"V", bCoord: 1640, gCoord: 1078, start: 1076, end: 1080, type:"crossing", id:"gate_14" },
  // Row 3 vertical gates (y=942)
  { axis:"V", bCoord:  205, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_15" },
  { axis:"V", bCoord:  410, gCoord:  942, start:  940, end:  944, type:"tunnel", id:"gate_16" },
  { axis:"V", bCoord:  615, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_17" },
  { axis:"V", bCoord:  820, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_18" },
  { axis:"V", bCoord: 1025, gCoord:  942, start:  940, end:  944, type:"tunnel", id:"gate_19" },
  { axis:"V", bCoord: 1230, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_20" },
  { axis:"V", bCoord: 1435, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_21" },
  { axis:"V", bCoord: 1640, gCoord:  942, start:  940, end:  944, type:"tunnel", id:"gate_22" },
  // Row 4 vertical gates (y=797)
  { axis:"V", bCoord:  205, gCoord:  797, start:  795, end:  799, type:"crossing", id:"gate_23" },
  { axis:"V", bCoord:  410, gCoord:  797, start:  795, end:  799, type:"crossing", id:"gate_24" },
  { axis:"V", bCoord: 1435, gCoord:  797, start:  795, end:  799, type:"tunnel", id:"gate_25" },
  { axis:"V", bCoord: 1640, gCoord:  797, start:  795, end:  799, type:"crossing", id:"gate_26" },
  // Row 5 vertical gates (y=652)
  { axis:"V", bCoord:  205, gCoord:  652, start:  650, end:  654, type:"crossing", id:"gate_27" },
  { axis:"V", bCoord:  410, gCoord:  652, start:  650, end:  654, type:"tunnel", id:"gate_28" },
  { axis:"V", bCoord: 1435, gCoord:  652, start:  650, end:  654, type:"crossing", id:"gate_29" },
  { axis:"V", bCoord: 1640, gCoord:  652, start:  650, end:  654, type:"crossing", id:"gate_30" },
  // Row 6 vertical gates (y=507)
  { axis:"V", bCoord:  205, gCoord:  507, start:  505, end:  509, type:"tunnel", id:"gate_31" },
  { axis:"V", bCoord:  410, gCoord:  507, start:  505, end:  509, type:"crossing", id:"gate_32" },
  { axis:"V", bCoord: 1435, gCoord:  507, start:  505, end:  509, type:"crossing", id:"gate_33" },
  { axis:"V", bCoord: 1640, gCoord:  507, start:  505, end:  509, type:"tunnel", id:"gate_34" },
  // Row 7 vertical gates (y=362)
  { axis:"V", bCoord:  205, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_35" },
  { axis:"V", bCoord:  410, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_36" },
  { axis:"V", bCoord:  615, gCoord:  362, start:  360, end:  364, type:"tunnel", id:"gate_37" },
  { axis:"V", bCoord:  820, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_38" },
  { axis:"V", bCoord: 1025, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_39" },
  { axis:"V", bCoord: 1230, gCoord:  362, start:  360, end:  364, type:"tunnel", id:"gate_40" },
  { axis:"V", bCoord: 1435, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_41" },
  { axis:"V", bCoord: 1640, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_42" },
  // Row 8 vertical gates (y=217)
  { axis:"V", bCoord:  205, gCoord:  217, start:  215, end:  219, type:"tunnel", id:"gate_43" },
  { axis:"V", bCoord:  615, gCoord:  217, start:  215, end:  219, type:"crossing", id:"gate_44" },
  { axis:"V", bCoord:  820, gCoord:  217, start:  215, end:  219, type:"crossing", id:"gate_45" },
  { axis:"V", bCoord: 1025, gCoord:  217, start:  215, end:  219, type:"tunnel", id:"gate_46" },
  { axis:"V", bCoord: 1230, gCoord:  217, start:  215, end:  219, type:"crossing", id:"gate_47" },
  { axis:"V", bCoord: 1640, gCoord:  217, start:  215, end:  219, type:"crossing", id:"gate_48" },
  // Row 9 vertical gates (y=72)
  { axis:"V", bCoord:  205, gCoord:   72, start:   70, end:   74, type:"tunnel", id:"gate_49" },
  { axis:"V", bCoord:  410, gCoord:   72, start:   70, end:   74, type:"crossing", id:"gate_50" },
  { axis:"V", bCoord:  615, gCoord:   72, start:   70, end:   74, type:"crossing", id:"gate_51" },
  { axis:"V", bCoord:  820, gCoord:   72, start:   70, end:   74, type:"tunnel", id:"gate_52" },
  { axis:"V", bCoord: 1025, gCoord:   72, start:   70, end:   74, type:"crossing", id:"gate_53" },
  { axis:"V", bCoord: 1230, gCoord:   72, start:   70, end:   74, type:"crossing", id:"gate_54" },
  { axis:"V", bCoord: 1435, gCoord:   72, start:   70, end:   74, type:"tunnel", id:"gate_55" },
  { axis:"V", bCoord: 1640, gCoord:   72, start:   70, end:   74, type:"crossing", id:"gate_56" },
  // Horizontal gates (unchanged)
  { axis:"H", bCoord: 1162, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_57" },
  { axis:"H", bCoord: 1162, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_58" },
  { axis:"H", bCoord: 1162, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_59" },
  { axis:"H", bCoord: 1162, gCoord:  717, start:  715, end:  719, type:"crossing", id:"gate_60" },
  { axis:"H", bCoord: 1162, gCoord:  922, start:  920, end:  924, type:"tunnel", id:"gate_61" },
  { axis:"H", bCoord: 1162, gCoord: 1127, start: 1125, end: 1129, type:"tunnel", id:"gate_62" },
  { axis:"H", bCoord: 1162, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_63" },
  { axis:"H", bCoord: 1162, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_64" },
  { axis:"H", bCoord: 1162, gCoord: 1742, start: 1740, end: 1744, type:"tunnel", id:"gate_65" },
  { axis:"H", bCoord: 1017, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_66" },
  { axis:"H", bCoord: 1017, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_67" },
  { axis:"H", bCoord: 1017, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_68" },
  { axis:"H", bCoord: 1017, gCoord:  717, start:  715, end:  719, type:"crossing", id:"gate_69" },
  { axis:"H", bCoord: 1017, gCoord:  922, start:  920, end:  924, type:"tunnel", id:"gate_70" },
  { axis:"H", bCoord: 1017, gCoord: 1127, start: 1125, end: 1129, type:"tunnel", id:"gate_71" },
  { axis:"H", bCoord: 1017, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_72" },
  { axis:"H", bCoord: 1017, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_73" },
  { axis:"H", bCoord: 1017, gCoord: 1742, start: 1740, end: 1744, type:"tunnel", id:"gate_74" },
  { axis:"H", bCoord:  872, gCoord:  307, start:  305, end:  309, type:"crossing", id:"gate_75" },
  { axis:"H", bCoord:  872, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_76" },
  { axis:"H", bCoord:  872, gCoord:  675, start:  673, end:  677, type:"tunnel", id:"gate_77" },
  { axis:"H", bCoord:  872, gCoord: 1170, start: 1168, end: 1172, type:"crossing", id:"gate_78" },
  { axis:"H", bCoord:  872, gCoord: 1332, start: 1330, end: 1334, type:"tunnel", id:"gate_79" },
  { axis:"H", bCoord:  872, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_80" },
  { axis:"H", bCoord:  727, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_81" },
  { axis:"H", bCoord:  727, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_82" },
  { axis:"H", bCoord:  727, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_83" },
  { axis:"H", bCoord:  727, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_84" },
  { axis:"H", bCoord:  727, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_85" },
  { axis:"H", bCoord:  727, gCoord: 1742, start: 1740, end: 1744, type:"tunnel", id:"gate_86" },
  { axis:"H", bCoord:  582, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_87" },
  { axis:"H", bCoord:  582, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_88" },
  { axis:"H", bCoord:  582, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_89" },
  { axis:"H", bCoord:  582, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_90" },
  { axis:"H", bCoord:  582, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_91" },
  { axis:"H", bCoord:  582, gCoord: 1742, start: 1740, end: 1744, type:"tunnel", id:"gate_92" },
  { axis:"H", bCoord:  437, gCoord:  307, start:  305, end:  309, type:"crossing", id:"gate_93" },
  { axis:"H", bCoord:  437, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_94" },
  { axis:"H", bCoord:  437, gCoord: 1332, start: 1330, end: 1334, type:"tunnel", id:"gate_95" },
  { axis:"H", bCoord:  437, gCoord: 1537, start: 1535, end: 1539, type:"crossing", id:"gate_96" },
  { axis:"H", bCoord:  292, gCoord:  102, start:  100, end:  104, type:"tunnel", id:"gate_97" },
  { axis:"H", bCoord:  292, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_98" },
  { axis:"H", bCoord:  292, gCoord:  512, start:  510, end:  514, type:"crossing", id:"gate_99" },
  { axis:"H", bCoord:  292, gCoord:  717, start:  715, end:  719, type:"tunnel", id:"gate_100" },
  { axis:"H", bCoord:  292, gCoord:  922, start:  920, end:  924, type:"tunnel", id:"gate_101" },
  { axis:"H", bCoord:  292, gCoord: 1127, start: 1125, end: 1129, type:"crossing", id:"gate_102" },
  { axis:"H", bCoord:  292, gCoord: 1332, start: 1330, end: 1334, type:"tunnel", id:"gate_103" },
  { axis:"H", bCoord:  292, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_104" },
  { axis:"H", bCoord:  292, gCoord: 1742, start: 1740, end: 1744, type:"crossing", id:"gate_105" },
  { axis:"H", bCoord:  147, gCoord:  102, start:  100, end:  104, type:"tunnel", id:"gate_106" },
  { axis:"H", bCoord:  147, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_107" },
  { axis:"H", bCoord:  147, gCoord:  512, start:  510, end:  514, type:"crossing", id:"gate_108" },
  { axis:"H", bCoord:  147, gCoord:  717, start:  715, end:  719, type:"tunnel", id:"gate_109" },
  { axis:"H", bCoord:  147, gCoord:  922, start:  920, end:  924, type:"tunnel", id:"gate_110" },
  { axis:"H", bCoord:  147, gCoord: 1127, start: 1125, end: 1129, type:"crossing", id:"gate_111" },
  { axis:"H", bCoord:  147, gCoord: 1332, start: 1330, end: 1334, type:"tunnel", id:"gate_112" },
  { axis:"H", bCoord:  147, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_113" },
  { axis:"H", bCoord:  147, gCoord: 1742, start: 1740, end: 1744, type:"crossing", id:"gate_114" },
  // L-shape vertical gates
  { axis:"V", bCoord:  615, gCoord:  810, start:  808, end:  812, type:"tunnel", id:"gate_115" },
  { axis:"V", bCoord: 1230, gCoord:  810, start:  808, end:  812, type:"crossing", id:"gate_116" },
  { axis:"V", bCoord: 1230, gCoord:  810, start:  808, end:  812, type:"crossing", id:"gate_117" },
  { axis:"V", bCoord:  615, gCoord:  543, start:  541, end:  545, type:"tunnel", id:"gate_118" },
  { axis:"V", bCoord:  923, gCoord:  798, start:  796, end:  800, type:"crossing", id:"gate_119" },
  { axis:"V", bCoord:  923, gCoord:  798, start:  796, end:  800, type:"crossing", id:"gate_120" },
  // L-shape horizontal gates
  { axis:"H", bCoord:  872, gCoord:  675, start:  673, end:  677, type:"tunnel", id:"gate_121" },
  { axis:"H", bCoord:  872, gCoord: 1170, start: 1168, end: 1172, type:"tunnel", id:"gate_122" },
  { axis:"H", bCoord:  437, gCoord: 1170, start: 1168, end: 1172, type:"crossing", id:"gate_123" },
  { axis:"H", bCoord:  437, gCoord:  675, start:  673, end:  677, type:"tunnel", id:"gate_124" },
  { axis:"H", bCoord:  727, gCoord:  870, start:  868, end:  872, type:"tunnel", id:"gate_125" },
  { axis:"H", bCoord:  727, gCoord:  975, start:  973, end:  977, type:"crossing", id:"gate_126" },
  { axis:"H", bCoord:  582, gCoord:  870, start:  868, end:  872, type:"tunnel", id:"gate_127" },
  { axis:"H", bCoord:  582, gCoord:  975, start:  973, end:  977, type:"tunnel", id:"gate_128" },
  { axis:"H", bCoord:  654, gCoord:  718, start:  716, end:  720, type:"crossing", id:"gate_129" },
  { axis:"H", bCoord:  654, gCoord: 1127, start: 1125, end: 1129, type:"tunnel", id:"gate_130" },
  // Missing gates
  { axis:"V", bCoord:  923, gCoord:  530, start:  528, end:  532, type:"crossing", id:"gate_battlemarsh_stormwatch" },
  { axis:"V", bCoord: 1230, gCoord:  528, start:  526, end:  530, type:"tunnel", id:"gate_stormwatch_tidecrag" },
];


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
  // For each existing HQ top-left (ec, er), its 3x3 footprint spans ec..ec+2, er..er+2.
  // A new 3x3 HQ at (c,r) spans c..c+2, r..r+2.
  // They conflict (overlap or touch) if the footprints are within 1 tile of each other:
  //   c+2+1 >= ec  &&  ec+2+1 >= c  →  ec ranges from c-3 to c+3
  //   r+2+1 >= er  &&  er+2+1 >= r  →  er ranges from r-3 to r+3
  for (let dr = -3; dr <= 3; dr++) {
    for (let dc = -3; dc <= 3; dc++) {
      if (usedKeys.has(`${c+dc},${r+dr}`)) return true;
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
  const candidates = REGION_CANDIDATES[regionKey];
  if (!candidates || candidates.length === 0) return null;
  // Draw first unused, non-adjacent candidate
  for (let i = 0; i < candidates.length; i++) {
    const k = candidates[i];
    if (usedKeys.has(k)) continue;
    const [c, r] = k.split(",").map(Number);
    if (isAdjacentToHQ(c, r, usedKeys)) continue;
    // Ensure full 3x3 footprint + 2-tile buffer fits within map bounds
    if (c < 2 || r < 2 || c + 4 >= COLS || r + 4 >= ROWS) continue;
    // Re-check flags since HQs stamped earlier may have changed nearby tiles
    const fl = flagArr[r*COLS+c];
    if (fl & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) continue;
    let ok = true;
    for (let dr = 0; dr < 3 && ok; dr++) {
      for (let dc = 0; dc < 3 && ok; dc++) {
        if (dc === 0 && dr === 0) continue;
        const ti = (r+dr)*COLS+(c+dc);
        if (flagArr[ti] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) { ok=false; }
      }
    }
    if (!ok) continue;
    if (!hasValidResourceNeighbors(c, r, powerArr)) continue;
    candidates.splice(i, 1); // remove so it won't be picked again
    return k;
  }
  return null;
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
      // P2 (10/hr)  — gas, food only
      // P3 (15/hr)  — wood, stone only
      // P4 (30/hr)  — gas, food only
      // P5 (40/hr)  — wood, stone only
      // P6 (60/hr)  — gas, food only
      // P7 (90/hr)  — wood, stone only
      // P8 (130/hr) — gas, food only
      // P9 (150/hr) — wood, stone only
      // P10-P13     — all 4 resources
      const RSS_POOL = {
        1:  ["stone","wood","gas","food"],
        2:  ["gas","food"],
        3:  ["wood","stone"],
        4:  ["gas","food"],
        5:  ["wood","stone"],
        6:  ["gas","food"],
        7:  ["wood","stone"],
        8:  ["gas","food"],
        9:  ["wood","stone"],
        10: ["stone","wood","gas","food"],
        11: ["stone","wood","gas","food"],
        12: ["stone","wood","gas","food"],
        13: ["stone","wood","gas","food"],
      };
      const pool   = RSS_POOL[pl] || ["stone","wood","gas","food"];
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

  postMessage({ type:"progress", pct:82, label:"Pre-computing roads..." });

  // ── Pre-compute road tile set so P10+ keeps don't land on roads ──────────────
  // Roads are stamped later (pct 94) but segments are static, so we can walk them now.
  const ROAD_TILE_SET = new Set();
  {
    const addRoadTile = (c, r) => { if (c>=0&&r>=0&&c<COLS&&r<ROWS) ROAD_TILE_SET.add(r*COLS+c); };
    const ROAD_SEGS_EARLY = [
[102,72,102,145],
      [102,72,203,72],
      [102,217,102,148],
      [102,217,102,290],
      [102,217,203,217],
      [102,435,102,293],
      [102,435,102,580],
      [102,435,203,362],
      [102,435,203,507],
      [102,652,102,583],
      [102,652,102,725],
      [102,652,203,652],
      [102,870,102,728],
      [102,870,102,1015],
      [102,870,203,797],
      [102,870,203,942],
      [102,1087,102,1018],
      [102,1087,102,1160],
      [102,1087,203,1078],
      [102,1232,102,1163],
      [102,1232,203,1213],
      [307,72,206,72],
      [307,72,307,145],
      [307,72,408,72],
      [307,362,206,362],
      [307,362,307,293],
      [307,362,307,435],
      [307,362,408,362],
      [307,507,206,507],
      [307,507,307,438],
      [307,507,307,580],
      [307,507,408,507],
      [307,652,206,652],
      [307,652,307,583],
      [307,652,307,725],
      [307,652,408,652],
      [307,797,206,797],
      [307,797,307,728],
      [307,797,307,870],
      [307,797,408,797],
      [307,942,206,942],
      [307,942,307,873],
      [307,942,307,1015],
      [307,942,408,942],
      [307,1232,206,1213],
      [307,1232,307,1163],
      [307,1232,408,1213],
      [410,217,206,217],
      [410,217,307,148],
      [410,217,307,290],
      [410,217,512,148],
      [410,217,512,290],
      [410,217,613,217],
      [410,1087,206,1078],
      [410,1087,307,1018],
      [410,1087,307,1160],
      [410,1087,512,1018],
      [410,1087,512,1160],
      [410,1087,613,1078],
      [512,72,411,72],
      [512,72,512,145],
      [512,72,613,72],
      [512,362,411,362],
      [512,362,512,293],
      [512,362,512,435],
      [512,362,613,362],
      [512,507,411,507],
      [512,507,512,438],
      [512,507,512,580],
      [512,507,613,543],
      [512,652,411,652],
      [512,652,512,583],
      [512,652,512,725],
      [512,797,411,797],
      [512,797,512,728],
      [512,797,512,870],
      [512,797,613,810],
      [512,942,411,942],
      [512,942,512,873],
      [512,942,512,1015],
      [512,942,613,942],
      [512,1232,411,1213],
      [512,1232,512,1163],
      [512,1232,613,1213],
      [717,72,616,72],
      [717,72,717,145],
      [717,72,818,72],
      [717,217,616,217],
      [717,217,717,148],
      [717,217,717,290],
      [717,217,818,217],
      [717,362,616,362],
      [717,362,675,435],
      [717,362,717,293],
      [717,362,818,362],
      [717,942,616,942],
      [717,942,675,873],
      [717,942,717,1015],
      [717,942,818,942],
      [717,1087,616,1078],
      [717,1087,717,1018],
      [717,1087,717,1160],
      [717,1087,818,1078],
      [717,1232,616,1213],
      [717,1232,717,1163],
      [717,1232,818,1213],
      [769,543,616,543],
      [769,543,675,438],
      [769,543,718,652],
      [769,543,870,580],
      [769,761,616,810],
      [769,761,675,870],
      [769,761,718,655],
      [769,761,870,728],
      [922,72,821,72],
      [922,72,922,145],
      [922,72,1023,72],
      [922,217,821,217],
      [922,217,922,148],
      [922,217,922,290],
      [922,217,1023,217],
      [922,362,821,362],
      [922,362,922,293],
      [922,362,1023,362],
      [922,652,870,583],
      [922,652,870,725],
      [922,652,975,583],
      [922,652,975,725],
      [922,942,821,942],
      [922,942,921,798],
      [922,942,922,1015],
      [922,942,1023,942],
      [922,1087,821,1078],
      [922,1087,922,1018],
      [922,1087,922,1160],
      [922,1087,1023,1078],
      [922,1232,821,1213],
      [922,1232,922,1163],
      [922,1232,1023,1213],
      [1076,543,975,580],
      [1076,543,1127,652],
      [1076,543,1170,438],
      [1076,761,924,798],
      [1076,761,975,728],
      [1076,761,1127,655],
      [1076,761,1170,870],
      [1076,761,1228,810],
      [1127,72,1026,72],
      [1127,72,1127,145],
      [1127,72,1228,72],
      [1127,217,1026,217],
      [1127,217,1127,148],
      [1127,217,1127,290],
      [1127,217,1228,217],
      [1127,362,1026,362],
      [1127,362,1127,293],
      [1127,362,1170,435],
      [1127,362,1228,362],
      [1127,942,1026,942],
      [1127,942,1127,1015],
      [1127,942,1170,873],
      [1127,942,1228,942],
      [1127,1087,1026,1078],
      [1127,1087,1127,1018],
      [1127,1087,1127,1160],
      [1127,1087,1228,1078],
      [1127,1232,1026,1213],
      [1127,1232,1127,1163],
      [1127,1232,1228,1213],
      [1332,72,1231,72],
      [1332,72,1332,145],
      [1332,72,1433,72],
      [1332,362,1231,362],
      [1332,362,1332,293],
      [1332,362,1332,435],
      [1332,362,1433,362],
      [1332,507,1332,438],
      [1332,507,1332,580],
      [1332,507,1433,507],
      [1332,652,1332,583],
      [1332,652,1332,725],
      [1332,652,1433,652],
      [1332,797,1231,810],
      [1332,797,1332,728],
      [1332,797,1332,870],
      [1332,797,1433,797],
      [1332,942,1231,942],
      [1332,942,1332,873],
      [1332,942,1332,1015],
      [1332,942,1433,942],
      [1332,1232,1231,1213],
      [1332,1232,1332,1163],
      [1332,1232,1433,1213],
      [1435,217,1231,217],
      [1435,217,1332,148],
      [1435,217,1332,290],
      [1435,217,1537,148],
      [1435,217,1537,290],
      [1435,217,1638,217],
      [1435,1087,1231,1078],
      [1435,1087,1332,1018],
      [1435,1087,1332,1160],
      [1435,1087,1537,1018],
      [1435,1087,1537,1160],
      [1435,1087,1638,1078],
      [1537,72,1436,72],
      [1537,72,1537,145],
      [1537,72,1638,72],
      [1537,362,1436,362],
      [1537,362,1537,293],
      [1537,362,1537,435],
      [1537,362,1638,362],
      [1537,507,1436,507],
      [1537,507,1537,438],
      [1537,507,1537,580],
      [1537,507,1638,507],
      [1537,652,1436,652],
      [1537,652,1537,583],
      [1537,652,1537,725],
      [1537,652,1638,652],
      [1537,797,1436,797],
      [1537,797,1537,728],
      [1537,797,1537,870],
      [1537,797,1638,797],
      [1537,942,1436,942],
      [1537,942,1537,873],
      [1537,942,1537,1015],
      [1537,942,1638,942],
      [1537,1232,1436,1213],
      [1537,1232,1537,1163],
      [1537,1232,1638,1213],
      [1742,72,1641,72],
      [1742,72,1742,145],
      [1742,217,1641,217],
      [1742,217,1742,148],
      [1742,217,1742,290],
      [1742,435,1641,362],
      [1742,435,1641,507],
      [1742,435,1742,293],
      [1742,435,1742,580],
      [1742,652,1641,652],
      [1742,652,1742,583],
      [1742,652,1742,725],
      [1742,870,1641,797],
      [1742,870,1641,942],
      [1742,870,1742,728],
      [1742,870,1742,1015],
      [1742,1087,1641,1078],
      [1742,1087,1742,1018],
      [1742,1087,1742,1160],
      [1742,1232,1641,1213],
      [1742,1232,1742,1163],
    ];
    for (const [c1,r1,c2,r2] of ROAD_SEGS_EARLY) {
      const dc = c2>c1?1:c2<c1?-1:0;
      const dr = r2>r1?1:r2<r1?-1:0;
      for (let c=c1; c!==c2; c+=dc) addRoadTile(c,r1);
      if (dr!==0) for (let r=r1; r!==r2+dr; r+=dr) addRoadTile(c2,r);
      else addRoadTile(c2,r1);
    }

  }

  // Gate and Keep constants (needed for border painting below)
  const KEEP_CMD_LVL=20, KEEP_TROOPS=2000, KEEP_SIEGE=5000, KEEP_RADIUS=2;
  const GATE_CMD_LVL=20, GATE_GARRISON=2000, GATE_SIEGE=10000; // 20 command @ 0.01 per small troop

  postMessage({ type:"progress", pct:83, label:"Painting borders..." });

  // ── Paint border segments + place crossing gate structures ─────────────
  // MUST happen before P10+ placement so F_BORDER flags are set!
  const gateMeta  = {};
  const impassKeys = [];

  // Use CROSSINGS to find borders, then locate actual positions in REGION_MAP
  const { impassable, gateA, gateB, pathTiles } = buildBordersFromCrossings(REGION_MAP, CROSSINGS);

  // Paint impassable border tiles
  // Vertical borders (axis V) = river; horizontal borders (axis H) = rockymountain
  const verticalBorderXSet = new Set(CROSSINGS.filter(c => c.axis === 'V').map(c => c.bCoord));
  for (const {x, y} of impassable) {
    const idx = y*COLS+x;
    if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
    const isVertical = [...verticalBorderXSet].some(bx => x >= bx - 2 && x <= bx + 1);
    terrainArr[idx]  = isVertical ? TERRAIN_ENC.river : TERRAIN_ENC.rockymountain;
    flagArr[idx]     = (flagArr[idx] & ~F_GATE) | F_BORDER;
    rssArr[idx]      = 0;
    garrisonArr[idx] = 0;
    impassKeys.push(`${x},${y}`);
  }

  // Paint path tiles — passable, match border terrain
  for (const {x, y} of pathTiles) {
    const idx = y*COLS+x;
    if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
    const isVertical = [...verticalBorderXSet].some(bx => x >= bx - 2 && x <= bx + 1);
    terrainArr[idx]  = isVertical ? TERRAIN_ENC.river : TERRAIN_ENC.rockymountain;
    flagArr[idx]     = (flagArr[idx] & ~F_BORDER) | F_GATE;
    rssArr[idx]      = 0;
    garrisonArr[idx] = 0;
  }

  // Place Gate A structures
  for (const {x, y, id, type, axis} of gateA) {
    const idx = y*COLS+x;
    if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
    terrainArr[idx]  = axis === 'V' ? TERRAIN_ENC.river : TERRAIN_ENC.rockymountain;
    flagArr[idx]     = (flagArr[idx] & ~F_BORDER) | F_GATE | F_KEEP;
    garrisonArr[idx] = GATE_GARRISON;
    siegeArr[idx]    = GATE_SIEGE;
    siegeMaxArr[idx] = GATE_SIEGE;
    rssArr[idx]      = 0;
    const typeName   = axis === 'V' ? 'Crossing' : 'Tunnel';
    const resolvedType = axis === 'V' ? 'crossing' : 'tunnel';
    gateMeta[`${x},${y}`] = {
      keepName: `${typeName} Gate A`,
      garrisonWaves: 2,
      garrison: GATE_GARRISON,
      garrisonTroops: 20, // 20 command budget
      cx: x, cy: y, side: 'A', type: resolvedType, axis,
      defCmd: {
        n: `${typeName} Gate A Defender`,
        icon: axis === 'V' ? '🌊' : '🪨',
        cls:'defender', faction:null, rarity:'veteran',
        lvl: GATE_CMD_LVL, troops: GATE_GARRISON,
        atk: 120*GATE_CMD_LVL, spd: 40+GATE_CMD_LVL*2,
      },
    };
  }

  // Place Gate B structures
  for (const {x, y, id, type, axis} of gateB) {
    const idx = y*COLS+x;
    if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
    terrainArr[idx]  = axis === 'V' ? TERRAIN_ENC.river : TERRAIN_ENC.rockymountain;
    flagArr[idx]     = (flagArr[idx] & ~F_BORDER) | F_GATE | F_KEEP;
    garrisonArr[idx] = GATE_GARRISON;
    siegeArr[idx]    = GATE_SIEGE;
    siegeMaxArr[idx] = GATE_SIEGE;
    rssArr[idx]      = 0;
    const typeName   = axis === 'V' ? 'Crossing' : 'Tunnel';
    const resolvedType = axis === 'V' ? 'crossing' : 'tunnel';
    gateMeta[`${x},${y}`] = {
      keepName: `${typeName} Gate B`,
      garrisonWaves: 2,
      garrison: GATE_GARRISON,
      garrisonTroops: 20, // 20 command budget
      cx: x, cy: y, side: 'B', type: resolvedType, axis,
      defCmd: {
        n: `${typeName} Gate B Defender`,
        icon: axis === 'V' ? '🌊' : '🪨',
        cls:'defender', faction:null, rarity:'veteran',
        lvl: GATE_CMD_LVL, troops: GATE_GARRISON,
        atk: 120*GATE_CMD_LVL, spd: 40+GATE_CMD_LVL*2,
      },
    };
  }

  // Place path tiles between gates
  for (const crossing of CROSSINGS) {
    const { axis, bCoord, gCoord } = crossing;
    
    if (axis === 'V') {
      // Vertical border: paths at (bCoord-1, gCoord) and (bCoord, gCoord)
      for (const dx of [-1, 0]) {
        const px = bCoord + dx;
        const py = gCoord;
        const idx = py * COLS + px;
        terrainArr[idx] = TERRAIN_ENC.road;
        flagArr[idx] = (flagArr[idx] & ~F_BORDER) | F_GATE;  // F_GATE but not F_KEEP
        garrisonArr[idx] = 0;
        rssArr[idx] = 0;
      }
    } else {
      // Horizontal border: paths at (gCoord, bCoord-1) and (gCoord, bCoord)
      for (const dy of [-1, 0]) {
        const px = gCoord;
        const py = bCoord + dy;
        const idx = py * COLS + px;
        terrainArr[idx] = TERRAIN_ENC.road;
        flagArr[idx] = (flagArr[idx] & ~F_BORDER) | F_GATE;  // F_GATE but not F_KEEP
        garrisonArr[idx] = 0;
        rssArr[idx] = 0;
      }
    }
  }

  postMessage({ type:"progress", pct:85, label:"Placing keeps..." });

  const P10_SIEGE = { 10:8000, 11:10000, 12:14000, 13:20000 };
  const keepMeta = {};

  // Merge gate metadata from border painting (happened earlier)
  Object.assign(keepMeta, gateMeta);

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

// ── Dynamic Road Generation ──────────────────────────────────────────────────
// Replace the hardcoded ROAD_SEGMENTS array with this dynamic generation
// This runs AFTER gates are placed and gateMeta is populated

{
  postMessage({ type:"progress", pct:94, label:"Building road network..." });
  
  // Collect all gates and their positions
  const gatesPerRegion = {}; // regionKey -> array of gate positions
  
  // For Gate A: check the "inward" neighbor (toward region A)
  // For Gate B: check the "outward" neighbor (toward region B)
  const getGateARegion = (x, y, axis) => {
    // Gate A is at offset -2 from center
    // For vertical borders: check LEFT (x-1)
    // For horizontal borders: check TOP (y-1)
    const [nx, ny] = axis === 'V' ? [x - 1, y] : [x, y - 1];
    
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return null;
    const idx = ny * COLS + nx;
    const regionID = REGION_MAP[idx];
    return (regionID && regionID > 0) ? REGION_IDX_TO_KEY[regionID] : null;
  };
  
  const getGateBRegion = (x, y, axis) => {
    // Gate B is at offset +1 from center
    // For vertical borders: check RIGHT (x+1)
    // For horizontal borders: check BOTTOM (y+1)
    const [nx, ny] = axis === 'V' ? [x + 1, y] : [x, y + 1];
    
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return null;
    const idx = ny * COLS + nx;
    const regionID = REGION_MAP[idx];
    return (regionID && regionID > 0) ? REGION_IDX_TO_KEY[regionID] : null;
  };
  
  // Add Gate A structures to their regions
  for (const gate of gateA) {
    const regionKey = getGateARegion(gate.x, gate.y, gate.axis);
    if (!regionKey) continue;
    
    if (!gatesPerRegion[regionKey]) {
      gatesPerRegion[regionKey] = [];
    }
    gatesPerRegion[regionKey].push({ x: gate.x, y: gate.y });
  }
  
  // Add Gate B structures to their regions
  for (const gate of gateB) {
    const regionKey = getGateBRegion(gate.x, gate.y, gate.axis);
    if (!regionKey) continue;
    
    if (!gatesPerRegion[regionKey]) {
      gatesPerRegion[regionKey] = [];
    }
    gatesPerRegion[regionKey].push({ x: gate.x, y: gate.y });
  }
  
  // Generate road segments from each keep to all gates in that region
  const ROAD_SEGMENTS = [];
  
  for (const region of REGION_LIST) {
    const regionKey = region.key;
    const keepX = region.cx;
    const keepY = region.cy;
    
    const gates = gatesPerRegion[regionKey] || [];
    
    // Create road from keep to each gate
    for (const gate of gates) {
      // Manhattan routing: horizontal first, then vertical
      ROAD_SEGMENTS.push([keepX, keepY, gate.x, gate.y]);
    }
  }
  

  // ── Rebuild ROAD_TILE_SET from actual dynamic segments ────────────────────
  ROAD_TILE_SET.clear();
  for (const [c1, r1, c2, r2] of ROAD_SEGMENTS) {
    const dc = c2>c1?1:c2<c1?-1:0;
    const dr = r2>r1?1:r2<r1?-1:0;
    for (let c=c1; c!==c2; c+=dc) { if (c>=0&&r1>=0&&c<COLS&&r1<ROWS) ROAD_TILE_SET.add(r1*COLS+c); }
    if (dr!==0) { for (let r=r1; r!==r2+dr; r+=dr) { if (c2>=0&&r>=0&&c2<COLS&&r<ROWS) ROAD_TILE_SET.add(r*COLS+c2); } }
    else { if (c2>=0&&r1>=0&&c2<COLS&&r1<ROWS) ROAD_TILE_SET.add(r1*COLS+c2); }
  }

  // Stamp roads into the map
  const stampRoad = (c, r) => {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    const idx = r * COLS + c;
    const fl  = flagArr[idx];
    if (fl & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) return;
    terrainArr[idx]  = TERRAIN_ENC.hellfire;  // Use hellfire terrain for roads
    if (powerArr[idx] !== 1) {
      powerArr[idx]    = 1;
      garrisonArr[idx] = Math.round(POWER_DEFS[1].command * 100); // 0.30 * 100 = 30
    }
  };
  
  // Carve each segment: horizontal leg first, then vertical
  for (const [c1, r1, c2, r2] of ROAD_SEGMENTS) {
    const dc = c2 > c1 ? 1 : c2 < c1 ? -1 : 0;
    const dr = r2 > r1 ? 1 : r2 < r1 ? -1 : 0;
    
    // Horizontal leg
    for (let c = c1; c !== c2; c += dc) {
      stampRoad(c, r1);
    }
    
    // Vertical leg
    if (dr !== 0) {
      for (let r = r1; r !== r2 + dr; r += dr) {
        stampRoad(c2, r);
      }
    } else {
      stampRoad(c2, r1);
    }
  }
}

  postMessage({ type:"progress", pct:96, label:"Finding spawn points..." });

  // ── Pre-build candidate tile lists for the 24 HQ spawn regions only ─────────
  const HQ_SPAWN_REGIONS = REGION_LIST.filter(r => r.factions && r.factions.length > 0);
  for (const reg of HQ_SPAWN_REGIONS) {
    const candidates = [];
    const regID = REGION_KEY_TO_IDX[reg.key];
    for (let idx = 0; idx < SIZE; idx++) {
      if (REGION_MAP[idx] !== regID) continue;
      const c = idx % COLS, r = Math.floor(idx / COLS);
      if (c < 1 || c >= COLS-2 || r < 1 || r >= ROWS-2) continue;
      if (KEEP_FOOTPRINT_SET.has(`${c},${r}`)) continue;
      if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) continue;
      const t0 = terrainArr[idx];
      if (t0 === TERRAIN_ENC.road || t0 === TERRAIN_ENC.hellfire || t0 === TERRAIN_ENC.river || t0 === TERRAIN_ENC.rockymountain) continue;
      let ok = true;
      for (let dr = 0; dr < 3 && ok; dr++) {
        for (let dc = 0; dc < 3 && ok; dc++) {
          if (dc === 0 && dr === 0) continue;
          const ti = (r+dr)*COLS+(c+dc);
          if (ti >= SIZE) { ok=false; break; }
          if (flagArr[ti] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) { ok=false; break; }
          const t1 = terrainArr[ti];
          if (t1 === TERRAIN_ENC.road || t1 === TERRAIN_ENC.hellfire || t1 === TERRAIN_ENC.river || t1 === TERRAIN_ENC.rockymountain) { ok=false; break; }
        }
      }
      if (!ok) continue;
      if (!hasValidResourceNeighbors(c, r, powerArr)) continue;
      candidates.push(`${c},${r}`);
    }
    // Shuffle so placements are random
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    REGION_CANDIDATES[reg.key] = candidates;
  }

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
    // key is the top-left of the 3x3 — center is at (hc+1, hr+1)
    const [hc, hr] = key.split(",").map(Number);
    const cc = hc + 1, cr = hr + 1; // true center
    const centerIdx = cr*COLS + cc;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const fc = cc+dc, fr = cr+dr;
        if (fc < 0 || fr < 0 || fc >= COLS || fr >= ROWS) continue;
        const idx = fr*COLS + fc;
        const isCenter = dc === 0 && dr === 0;
        flagArr[idx] = (flagArr[idx] & ~(F_KEEP|F_KEEPPART|F_WIN)) | (isCenter ? F_HQ : F_HQPART);
        ownerArr[idx] = ownerCode;
        if (!isCenter) keepPrimArr[idx] = centerIdx;
        terrainArr[idx] = TERRAIN_ENC.desert;
        rssArr[idx] = 0;
        if (isCenter) {
          garrisonArr[idx] = 0;
          siegeArr[idx]    = HQ_SIEGE;
          siegeMaxArr[idx] = HQ_SIEGE;
        } else {
          garrisonArr[idx] = 0;
          siegeArr[idx]    = 0;
          siegeMaxArr[idx] = 0;
        }
      }
    }
    // Return the center key so spawnKeys records the correct tile
    return `${cc},${cr}`;
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
        const centerKey = stampHQFootprint(key, ownerCode);
        keys.push(centerKey);
        usedKeys.add(key);
        usedKeys.add(centerKey);
      }
    }
    spawnKeys[fk] = keys; // array of up to 50 keys
  }

  // ── P10–P13: place AFTER HQs stamped so F_HQ|F_HQPART flags are set ────────
  {
    const HQ_REGION_KEYS = new Set();
    for (const fk of ["pirates","orcs","wizards","dragons","holyknights","nightcreatures","coldborns","ashen_dead"]) {
      const regs = REGION_LIST.filter(r => r.factions && r.factions.includes(fk));
      for (const reg of regs) HQ_REGION_KEYS.add(reg.key);
    }

    const isP10Valid = (c, r) => {
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
      const idx = r*COLS+c;
      if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_GATE|F_BORDER|F_HQ|F_HQPART)) return false;
      if (KEEP_FOOTPRINT_SET.has(`${c},${r}`)) return false;
      if (ROAD_TILE_SET.has(idx)) return false;
      const t = terrainArr[idx];
      if (t === TERRAIN_ENC.river || t === TERRAIN_ENC.rockymountain || t === TERRAIN_ENC.hellfire || t === TERRAIN_ENC.road) return false;
      // Check all 8 surrounding tiles for HQ proximity
      for (const [dc, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nc = c+dc, nr = r+dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        if (flagArr[nr*COLS+nc] & (F_HQ|F_HQPART)) return false;
      }
      // Check 3 SE covered neighbors
      for (const [dc, dr] of [[1,0],[0,1],[1,1]]) {
        const nc = c+dc, nr = r+dr;
        if (nc >= COLS || nr >= ROWS) return false;
        const ni = nr*COLS+nc;
        if (flagArr[ni] & (F_KEEP|F_KEEPPART|F_GATE|F_BORDER|F_HQ|F_HQPART)) {
          if (flagArr[ni] & (F_HQ|F_HQPART)) console.error(`[isP10Valid] ${c},${r} SE neighbor ${nc},${nr} is HQ but primary passed!`);
          return false;
        }
        if (ROAD_TILE_SET.has(ni)) return false;
        const nt = terrainArr[ni];
        if (nt === TERRAIN_ENC.river || nt === TERRAIN_ENC.rockymountain || nt === TERRAIN_ENC.hellfire || nt === TERRAIN_ENC.road) return false;
        if (KEEP_FOOTPRINT_SET.has(`${nc},${nr}`)) return false;
      }
      return true;
    };

    const stampP10 = (c, r, pl) => {
      const idx = r*COLS+c;
      const siege2 = P10_SIEGE[pl] ?? 8000;
      flagArr[idx]     = (flagArr[idx] & ~(F_KEEPPART|F_HQ|F_HQPART)) | F_KEEP;
      garrisonArr[idx] = Math.round(POWER_DEFS[pl].command * 100);
      siegeArr[idx]    = siege2;
      siegeMaxArr[idx] = siege2;
      for (const [dc, dr] of [[1,0],[0,1],[1,1]]) {
        const nc = c+dc, nr = r+dr;
        if (nc < COLS && nr < ROWS) {
          const ni = nr*COLS+nc;
          if (flagArr[ni] & (F_HQ|F_HQPART)) continue; // never overwrite HQ tiles
          rssArr[ni] = 0;
          if (powerArr[ni] >= 10) powerArr[ni] = 9;
          flagArr[ni] = (flagArr[ni] & ~(F_KEEP|F_WIN)) | F_KEEPPART;
        }
      }
      keepMeta[`${c},${r}`] = { keepName:`P${pl} Structure`, garrisonWaves:2, cx:c, cy:r };
      // Verify no covered neighbor is an HQ tile
      for (const [dc, dr] of [[1,0],[0,1],[1,1]]) {
        const nc=c+dc, nr=r+dr;
        if (nc < COLS && nr < ROWS) {
          const ni=nr*COLS+nc;
          if (flagArr[ni] & (F_HQ|F_HQPART)) console.error(`[P10+ BUG] ${c},${r} covered neighbor ${nc},${nr} is HQ tile!`);
        }
      }
    };

    const relocPool = [];
    let p10Total = 0, p10Placed = 0, p10Relocated = 0, p10Demoted = 0;
    const deferred = [];

    for (let r2 = 0; r2 < ROWS; r2++) {
      for (let c2 = 0; c2 < COLS; c2++) {
        const idx2 = r2*COLS+c2;
        const pl2  = powerArr[idx2];
        if (pl2 < 10) continue;
        p10Total++;
        const regIdx = REGION_MAP[idx2];
        const regKey = regIdx ? REGION_IDX_TO_KEY[regIdx] : null;
        const inSpawnRegion = regKey && HQ_REGION_KEYS.has(regKey);
        if (isP10Valid(c2, r2)) {
          if (inSpawnRegion) { stampP10(c2, r2, pl2); p10Placed++; }
          else { relocPool.push([c2, r2, pl2]); }
        } else {
          if (inSpawnRegion) { deferred.push([c2, r2, pl2, regKey]); }
          else { powerArr[idx2] = 9; p10Demoted++; }
        }
      }
    }

    for (const [c2, r2, pl2, regKey] of deferred) {
      if (powerArr[r2*COLS+c2] < 10) continue;
      const reg = REGION_LIST.find(r => r.key === regKey);
      let placed = false;
      if (reg) {
        const searchR = 15;
        for (let dr = -searchR; dr <= searchR && !placed; dr++) {
          for (let dc = -searchR; dc <= searchR && !placed; dc++) {
            const nc = reg.cx+dc, nr = reg.cy+dr;
            if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
            const ni = nr*COLS+nc;
            if (powerArr[ni] < 10) continue;
            const nRegIdx = REGION_MAP[ni];
            if ((nRegIdx ? REGION_IDX_TO_KEY[nRegIdx] : null) !== regKey) continue;
            if (!isP10Valid(nc, nr)) continue;
            stampP10(nc, nr, powerArr[ni]);
            powerArr[r2*COLS+c2] = 9;
            p10Placed++; p10Relocated++; placed = true;
          }
        }
      }
      if (!placed) {
        while (relocPool.length > 0 && !placed) {
          const [rc, rr, rpl] = relocPool.shift();
          if (powerArr[rr*COLS+rc] < 10 || !isP10Valid(rc, rr)) continue;
          stampP10(rc, rr, rpl);
          powerArr[r2*COLS+c2] = 9;
          p10Placed++; p10Relocated++; placed = true;
        }
        if (!placed) { powerArr[r2*COLS+c2] = 9; p10Demoted++; }
      }
    }

    for (const [rc, rr, rpl] of relocPool) {
      if (powerArr[rr*COLS+rc] < 10) continue;
      if (!isP10Valid(rc, rr)) { powerArr[rr*COLS+rc] = 9; p10Demoted++; continue; }
      stampP10(rc, rr, rpl); p10Placed++;
    }

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
