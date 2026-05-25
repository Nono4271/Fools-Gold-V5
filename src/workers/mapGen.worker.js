// Build: 1779593297
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
  { key:"blackmoor", name:"Blackmoor", layer:"farm", keepName:"Blackmoor Keep", cx: 769, cy: 540, factions:[] },
  { key:"ravencrag", name:"Ravencrag", layer:"farm", keepName:"Ravencrag Keep", cx:1076, cy: 540, factions:[] },
  { key:"grimwald", name:"Grimwald", layer:"farm", keepName:"Grimwald Keep", cx:1076, cy: 756, factions:[] },
  { key:"darkwater", name:"Darkwater", layer:"farm", keepName:"Darkwater Keep", cx: 769, cy: 756, factions:[] },
  { key:"stoneheart", name:"Stoneheart", layer:"farm", keepName:"Stoneheart Keep", cx: 410, cy: 216, factions:[] },
  { key:"ashenmark", name:"Ashenmark", layer:"farm", keepName:"Ashenmark Keep", cx:1435, cy: 216, factions:[] },
  { key:"dreadmarsh", name:"Dreadmarsh", layer:"farm", keepName:"Dreadmarsh Keep", cx: 410, cy:1080, factions:[] },
  { key:"ironwood", name:"Ironwood", layer:"farm", keepName:"Ironwood Keep", cx:1435, cy:1080, factions:[] },
  { key:"emberfang", name:"Emberfang", layer:"farm", keepName:"Flamecrest Peak Keep", cx: 103, cy: 432, factions:["dragons"] },
  { key:"spellspire", name:"Spellspire", layer:"farm", keepName:"Arcaneum Keep", cx:1743, cy: 432, factions:["wizards"] },
  { key:"warbane", name:"Warbane", layer:"farm", keepName:"Bloodrock Keep", cx: 103, cy: 864, factions:["orcs"] },
  { key:"lightshield", name:"Lightshield", layer:"farm", keepName:"Oathkeep Keep", cx:1743, cy: 864, factions:["holyknights"] },
  { key:"shadowmere", name:"Shadowmere", layer:"farm", keepName:"Shadowmere Keep", cx: 103, cy:  72, factions:[] },
  { key:"icepeak", name:"Icepeak", layer:"farm", keepName:"Icepeak Keep", cx: 308, cy:  72, factions:["coldborns"] },
  // Frosthold - Coldborns Capital
  { key:"frosthold", name:"Frosthold", layer:"start", keepName:"Frosthold Keep", cx: 513, cy:  72, factions:["coldborns"] },
  { key:"icebreak", name:"Icebreak", layer:"farm", keepName:"Icebreak Keep", cx: 718, cy:  72, factions:["coldborns"] },
  { key:"drearfort", name:"Drearfort", layer:"farm", keepName:"Drearfort Keep", cx: 923, cy:  72, factions:[] },
  { key:"shadowmire", name:"Shadowmire", layer:"farm", keepName:"Shadowmire Keep", cx:1128, cy:  72, factions:["nightcreatures"] },
  // Duskmire - Nightcreatures Capital
  { key:"duskmire", name:"Duskmire", layer:"start", keepName:"Duskmire Keep", cx:1333, cy:  72, factions:["nightcreatures"] },
  { key:"shadowfen", name:"Shadowfen", layer:"farm", keepName:"Shadowfen Keep", cx:1538, cy:  72, factions:["nightcreatures"] },
  { key:"gravemist", name:"Gravemist", layer:"farm", keepName:"Gravemist Keep", cx:1743, cy:  72, factions:[] },
  // Flamecrest Peak - Dragons Capital
  { key:"flamecrestpeak", name:"Flamecrest Peak", layer:"start", keepName:"Flamecrest Peak Keep", cx: 103, cy: 216, factions:["dragons"] },
  { key:"ebonvault", name:"Ebonvault", layer:"farm", keepName:"Ebonvault Keep", cx: 718, cy: 216, factions:[] },
  { key:"wraithmoor", name:"Wraithmoor", layer:"farm", keepName:"Wraithmoor Keep", cx: 923, cy: 216, factions:[] },
  { key:"deathmarsh", name:"Deathmarsh", layer:"farm", keepName:"Deathmarsh Keep", cx:1128, cy: 216, factions:[] },
  // Arcaneum - Wizards Capital
  { key:"arcaneum", name:"Arcaneum", layer:"start", keepName:"Arcaneum Keep", cx:1743, cy: 216, factions:["wizards"] },
  { key:"bleakstone", name:"Bleakstone", layer:"farm", keepName:"Bleakstone Keep", cx: 308, cy: 360, factions:[] },
  { key:"fellwood", name:"Fellwood", layer:"farm", keepName:"Fellwood Keep", cx: 513, cy: 360, factions:[] },
  { key:"cursedfen", name:"Cursedfen", layer:"farm", keepName:"Cursedfen Keep", cx: 718, cy: 360, factions:[] },
  { key:"rotmire", name:"Rotmire", layer:"farm", keepName:"Rotmire Keep", cx: 923, cy: 360, factions:[] },
  { key:"blightmoor", name:"Blightmoor", layer:"farm", keepName:"Blightmoor Keep", cx:1128, cy: 360, factions:[] },
  { key:"skullcrag", name:"Skullcrag", layer:"farm", keepName:"Skullcrag Keep", cx:1333, cy: 360, factions:[] },
  { key:"ghosthollow", name:"Ghosthollow", layer:"farm", keepName:"Ghosthollow Keep", cx:1538, cy: 360, factions:[] },
  { key:"doomspire", name:"Doomspire", layer:"farm", keepName:"Doomspire Keep", cx: 308, cy: 504, factions:[] },
  { key:"duskwood", name:"Duskwood", layer:"farm", keepName:"Duskwood Keep", cx: 513, cy: 504, factions:[] },
  { key:"gloomvale", name:"Gloomvale", layer:"farm", keepName:"Gloomvale Keep", cx:1333, cy: 504, factions:[] },
  { key:"nightmarsh", name:"Nightmarsh", layer:"farm", keepName:"Nightmarsh Keep", cx:1538, cy: 504, factions:[] },
  { key:"cryptwood", name:"Cryptwood", layer:"farm", keepName:"Cryptwood Keep", cx: 103, cy: 648, factions:[] },
  { key:"bonewood", name:"Bonewood", layer:"farm", keepName:"Bonewood Keep", cx: 308, cy: 648, factions:[] },
  { key:"ashenvale", name:"Ashenvale", layer:"farm", keepName:"Ashenvale Keep", cx: 513, cy: 648, factions:[] },
  { key:"holyGrail", name:"Holy Grail", layer:"ring", keepName:"The Holy Grail", cx: 923, cy: 648, factions:[] },
  { key:"grimstone", name:"Grimstone", layer:"farm", keepName:"Grimstone Keep", cx:1333, cy: 648, factions:[] },
  { key:"darkhollow", name:"Darkhollow", layer:"farm", keepName:"Darkhollow Keep", cx:1538, cy: 648, factions:[] },
  { key:"blackstone", name:"Blackstone", layer:"farm", keepName:"Blackstone Keep", cx:1743, cy: 648, factions:[] },
  { key:"deadwood", name:"Deadwood", layer:"farm", keepName:"Deadwood Keep", cx: 308, cy: 792, factions:[] },
  { key:"frostbite", name:"Frostbite", layer:"farm", keepName:"Frostbite Keep", cx: 513, cy: 792, factions:[] },
  { key:"icefall", name:"Icefall", layer:"farm", keepName:"Icefall Keep", cx:1333, cy: 792, factions:[] },
  { key:"thornvale", name:"Thornvale", layer:"farm", keepName:"Thornvale Keep", cx:1538, cy: 792, factions:[] },
  { key:"bloodmoor", name:"Bloodmoor", layer:"farm", keepName:"Bloodmoor Keep", cx: 308, cy: 936, factions:[] },
  { key:"wargrim", name:"Wargrim", layer:"farm", keepName:"Wargrim Keep", cx: 513, cy: 936, factions:[] },
  { key:"steelwatch", name:"Steelwatch", layer:"farm", keepName:"Steelwatch Keep", cx: 718, cy: 936, factions:[] },
  { key:"ironhold", name:"Ironhold", layer:"farm", keepName:"Ironhold Keep", cx: 923, cy: 936, factions:[] },
  { key:"battlemarsh", name:"Battlemarsh", layer:"farm", keepName:"Battlemarsh Keep", cx:1128, cy: 936, factions:[] },
  { key:"stormwatch", name:"Stormwatch", layer:"farm", keepName:"Stormwatch Keep", cx:1333, cy: 936, factions:[] },
  { key:"tidecrag", name:"Tidecrag", layer:"farm", keepName:"Tidecrag Keep", cx:1538, cy: 936, factions:[] },
  // Bloodrock Keep - Orcs Capital
  { key:"bloodrock", name:"Bloodrock Keep", layer:"start", keepName:"Bloodrock Keep", cx: 103, cy:1080, factions:["orcs"] },
  { key:"salthaven", name:"Salthaven", layer:"farm", keepName:"Salthaven Keep", cx: 718, cy:1080, factions:[] },
  { key:"deepwater", name:"Deepwater", layer:"farm", keepName:"Deepwater Keep", cx: 923, cy:1080, factions:[] },
  { key:"fogmire", name:"Fogmire", layer:"farm", keepName:"Fogmire Keep", cx:1128, cy:1080, factions:[] },
  // Oathkeep - Holyknights Capital
  { key:"oathkeep", name:"Oathkeep", layer:"start", keepName:"Oathkeep Keep", cx:1743, cy:1080, factions:["holyknights"] },
  { key:"runestone", name:"Runestone", layer:"farm", keepName:"Runestone Keep", cx: 103, cy:1224, factions:[] },
  { key:"skullcove", name:"Skullcove", layer:"farm", keepName:"Deadmans Harbor Keep", cx: 308, cy:1224, factions:["pirates"] },
  // Deadman's Harbor - Pirates Capital
  { key:"deadmansharbor", name:"Deadmans Harbor", layer:"start", keepName:"Deadmans Harbor Keep", cx: 513, cy:1224, factions:["pirates"] },
  { key:"blackbrine", name:"Blackbrine", layer:"farm", keepName:"Blackbrine Keep", cx: 718, cy:1224, factions:["pirates"] },
  { key:"mysticfen", name:"Mysticfen", layer:"farm", keepName:"Mysticfen Keep", cx: 923, cy:1224, factions:[] },
  { key:"graveshroud", name:"Graveshroud", layer:"farm", keepName:"Bonehallow Keep", cx:1128, cy:1224, factions:["ashen_dead"] },
  // Bonehallow - Ashen Dead Capital
  { key:"bonehallow", name:"Bonehallow", layer:"start", keepName:"Bonehallow Keep", cx:1333, cy:1224, factions:["ashen_dead"] },
  { key:"greywatch", name:"Greywatch", layer:"farm", keepName:"Greywatch Keep", cx:1538, cy:1224, factions:["ashen_dead"] },
  { key:"voidmarsh", name:"Voidmarsh", layer:"farm", keepName:"Voidmarsh Keep", cx:1743, cy:1224, factions:[] },
];

const FACTION_REGIONS = {
  ashen_dead     : { start:"bonehallow", farm:"graveshroud" },
  coldborns      : { start:"frosthold", farm:"icepeak" },
  dragons        : { start:"flamecrestpeak", farm:"emberfang" },
  holyknights    : { start:"oathkeep", farm:"lightshield" },
  nightcreatures : { start:"duskmire", farm:"shadowmire" },
  orcs           : { start:"bloodrock", farm:"warbane" },
  pirates        : { start:"deadmansharbor", farm:"skullcove" },
  wizards        : { start:"arcaneum", farm:"spellspire" },
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

// CROSSINGS array - populated after POLYS definition below
let CROSSINGS = [];

// Terrain type per crossing type
function crossingTerrain(type) {
  if (type === 'crossing')   return TERRAIN_ENC.river;
  if (type === 'tollbridge') return TERRAIN_ENC.ravine;
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


// Use CROSSINGS to identify borders, then find actual positions in REGION_MAP
function buildBordersFromCrossings(REGION_MAP, CROSSINGS) {
  const impassable = [], gateA = [], gateB = [], pathTiles = [];
  
  for (const crossing of CROSSINGS) {
    const { axis, bCoord, gCoord, start, end, type, id } = crossing;
    
    // Find actual border tiles in REGION_MAP near the theoretical border
    const searchRadius = 10;
    const borderTiles = [];
    
    if (axis === 'H') {
      // Horizontal border - search around y = bCoord
      const yMin = Math.max(MAP_Y0, bCoord - searchRadius);
      const yMax = Math.min(MAP_Y1, bCoord + searchRadius);
      const xMin = Math.max(MAP_X0, Math.floor(start));
      const xMax = Math.min(MAP_X1, Math.ceil(end));
      
      for (let y = yMin; y <= yMax; y++) {
        for (let x = xMin; x <= xMax; x++) {
          const idx = y * COLS + x;
          const reg = REGION_MAP[idx];
          if (!reg) continue;
          
          // Check if this tile borders a different region
          const rightIdx = idx + 1;
          const downIdx = idx + COLS;
          const rightReg = (x < COLS - 1) ? REGION_MAP[rightIdx] : 0;
          const downReg = (y < ROWS - 1) ? REGION_MAP[downIdx] : 0;
          
          if ((rightReg && rightReg !== reg) || (downReg && downReg !== reg)) {
            borderTiles.push({x, y, regionID: reg});
          }
        }
      }
    } else {
      // Vertical border - search around x = bCoord
      const xMin = Math.max(MAP_X0, bCoord - searchRadius);
      const xMax = Math.min(MAP_X1, bCoord + searchRadius);
      const yMin = Math.max(MAP_Y0, Math.floor(start));
      const yMax = Math.min(MAP_Y1, Math.ceil(end));
      
      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          const idx = y * COLS + x;
          const reg = REGION_MAP[idx];
          if (!reg) continue;
          
          const rightIdx = idx + 1;
          const downIdx = idx + COLS;
          const rightReg = (x < COLS - 1) ? REGION_MAP[rightIdx] : 0;
          const downReg = (y < ROWS - 1) ? REGION_MAP[downIdx] : 0;
          
          if ((rightReg && rightReg !== reg) || (downReg && downReg !== reg)) {
            borderTiles.push({x, y, regionID: reg});
          }
        }
      }
    }
    
    if (borderTiles.length === 0) continue;
    
    // Find middle of border segment for gate
    const midIdx = Math.floor(borderTiles.length / 2);
    const gateTile = borderTiles[midIdx];
    
    // Find the two regions
    const regions = [...new Set(borderTiles.map(t => t.regionID))];
    if (regions.length !== 2) continue;
    
    const [regA, regB] = regions;
    
    // Place gates at the middle position
    const tilesA = borderTiles.filter(t => t.regionID === regA);
    const tilesB = borderTiles.filter(t => t.regionID === regB);
    
    // Find gate positions closest to the middle
    const gateA_tile = tilesA.reduce((closest, t) => {
      const distA = Math.abs(t.x - gateTile.x) + Math.abs(t.y - gateTile.y);
      const distClosest = Math.abs(closest.x - gateTile.x) + Math.abs(closest.y - gateTile.y);
      return distA < distClosest ? t : closest;
    }, tilesA[0]);
    
    const gateB_tile = tilesB.reduce((closest, t) => {
      const distB = Math.abs(t.x - gateTile.x) + Math.abs(t.y - gateTile.y);
      const distClosest = Math.abs(closest.x - gateTile.x) + Math.abs(closest.y - gateTile.y);
      return distB < distClosest ? t : closest;
    }, tilesB[0]);
    
    if (gateA_tile) {
      gateA.push({
        x: gateA_tile.x, 
        y: gateA_tile.y, 
        id: id+'_A', 
        type: type
      });
    }
    
    if (gateB_tile) {
      gateB.push({
        x: gateB_tile.x, 
        y: gateB_tile.y, 
        id: id+'_B', 
        type: type
      });
    }
    
    // Mark all other border tiles as impassable
    for (const tile of borderTiles) {
      const isGateA = gateA_tile && tile.x === gateA_tile.x && tile.y === gateA_tile.y;
      const isGateB = gateB_tile && tile.x === gateB_tile.x && tile.y === gateB_tile.y;
      
      if (!isGateA && !isGateB) {
        impassable.push({x: tile.x, y: tile.y});
      }
    }
  }
  
  return { impassable, gateA, gateB, pathTiles };
}

// ── Generate Voronoi polygons for all 70 regions ─────────────────────────────
// Uses perpendicular bisector clipping to create exact Voronoi cells
// ── Generate Voronoi polygons for all 70 regions ─────────────────────────────
const POLYS = {
  arcaneum: [[1640, 144], [1845, 144], [1845, 288], [1640, 288]],
  ashenmark: [[1230, 144], [1435, 144], [1640, 144], [1640, 288], [1435, 288], [1230, 288]],
  ashenvale: [[410, 576], [615, 576], [615, 720], [410, 720]],
  battlemarsh: [[1025, 864], [1230, 864], [1230, 1008], [1025, 1008]],
  blackbrine: [[615, 1152], [820, 1152], [820, 1296], [615, 1296]],
  blackmoor: [[615, 432], [820, 432], [922.5, 432], [922.5, 576], [820, 576], [615, 576]],
  blackstone: [[1640, 576], [1845, 576], [1845, 720], [1640, 720]],
  bleakstone: [[205, 288], [410, 288], [410, 432], [205, 432]],
  blightmoor: [[1025, 288], [1230, 288], [1230, 432], [1025, 432]],
  bloodmoor: [[205, 864], [410, 864], [410, 1008], [205, 1008]],
  bloodrock: [[0, 1008], [205, 1008], [205, 1152], [0, 1152]],
  bonehallow: [[1230, 1152], [1435, 1152], [1435, 1296], [1230, 1296]],
  bonewood: [[205, 576], [410, 576], [410, 720], [205, 720]],
  cryptwood: [[0, 576], [205, 576], [205, 720], [0, 720]],
  cursedfen: [[615, 288], [820, 288], [820, 432], [615, 432]],
  darkhollow: [[1435, 576], [1640, 576], [1640, 720], [1435, 720]],
  darkwater: [[820, 648], [1025, 648], [1230, 648], [1230, 864], [1025, 864], [820, 864]],
  deadmansharbor: [[410, 1152], [615, 1152], [615, 1296], [410, 1296]],
  deadwood: [[205, 720], [410, 720], [410, 864], [205, 864]],
  deathmarsh: [[1025, 144], [1230, 144], [1230, 288], [1025, 288]],
  deepwater: [[820, 1008], [1025, 1008], [1025, 1152], [820, 1152]],
  doomspire: [[205, 432], [410, 432], [410, 576], [205, 576]],
  drearfort: [[820, 0], [1025, 0], [1025, 144], [820, 144]],
  dreadmarsh: [[205, 1008], [410, 1008], [410, 1152], [205, 1152]],
  duskmire: [[1230, 0], [1435, 0], [1435, 144], [1230, 144]],
  duskwood: [[410, 432], [615, 432], [615, 576], [410, 576]],
  ebonvault: [[615, 144], [820, 144], [820, 288], [615, 288]],
  emberfang: [[0, 288], [205, 288], [205, 432], [0, 432]],
  fellwood: [[410, 288], [615, 288], [615, 432], [410, 432]],
  flamecrestpeak: [[0, 144], [205, 144], [205, 288], [0, 288]],
  fogmire: [[1025, 1008], [1230, 1008], [1230, 1152], [1025, 1152]],
  frostbite: [[410, 720], [615, 720], [615, 864], [410, 864]],
  frosthold: [[410, 0], [615, 0], [615, 144], [410, 144]],
  ghosthollow: [[1435, 288], [1640, 288], [1640, 432], [1435, 432]],
  gloomvale: [[1230, 432], [1435, 432], [1435, 576], [1230, 576]],
  gravemist: [[1640, 0], [1845, 0], [1845, 144], [1640, 144]],
  graveshroud: [[1025, 1152], [1230, 1152], [1230, 1296], [1025, 1296]],
  greywatch: [[1435, 1152], [1640, 1152], [1640, 1296], [1435, 1296]],
  grimstone: [[1230, 576], [1435, 576], [1435, 720], [1230, 720]],
  grimwald: [[1230, 648], [1435, 648], [1435, 864], [1230, 864]],
  holyGrail: [[820, 576], [1025, 576], [1025, 720], [820, 720]],
  icebreak: [[615, 0], [820, 0], [820, 144], [615, 144]],
  icefall: [[1230, 720], [1435, 720], [1435, 864], [1230, 864]],
  icepeak: [[205, 0], [410, 0], [410, 144], [205, 144]],
  ironhold: [[820, 864], [1025, 864], [1025, 1008], [820, 1008]],
  ironwood: [[1230, 1008], [1435, 1008], [1640, 1008], [1640, 1152], [1435, 1152], [1230, 1152]],
  lightshield: [[1640, 720], [1845, 720], [1845, 864], [1640, 864]],
  mysticfen: [[820, 1152], [1025, 1152], [1025, 1296], [820, 1296]],
  nightmarsh: [[1435, 432], [1640, 432], [1640, 576], [1435, 576]],
  oathkeep: [[1640, 1008], [1845, 1008], [1845, 1152], [1640, 1152]],
  ravencrag: [[922.5, 432], [1127.5, 432], [1230, 432], [1230, 648], [1127.5, 648], [922.5, 648]],
  rotmire: [[820, 288], [1025, 288], [1025, 432], [820, 432]],
  runestone: [[0, 1152], [205, 1152], [205, 1296], [0, 1296]],
  salthaven: [[615, 1008], [820, 1008], [820, 1152], [615, 1152]],
  shadowfen: [[1435, 0], [1640, 0], [1640, 144], [1435, 144]],
  shadowmere: [[0, 0], [205, 0], [205, 144], [0, 144]],
  shadowmire: [[1025, 0], [1230, 0], [1230, 144], [1025, 144]],
  skullcove: [[205, 1152], [410, 1152], [410, 1296], [205, 1296]],
  skullcrag: [[1230, 288], [1435, 288], [1435, 432], [1230, 432]],
  spellspire: [[1640, 288], [1845, 288], [1845, 432], [1640, 432]],
  steelwatch: [[615, 864], [820, 864], [820, 1008], [615, 1008]],
  stoneheart: [[205, 144], [410, 144], [615, 144], [615, 288], [410, 288], [205, 288]],
  stormwatch: [[1230, 864], [1435, 864], [1435, 1008], [1230, 1008]],
  thornvale: [[1435, 720], [1640, 720], [1640, 864], [1435, 864]],
  tidecrag: [[1435, 864], [1640, 864], [1640, 1008], [1435, 1008]],
  voidmarsh: [[1640, 1152], [1845, 1152], [1845, 1296], [1640, 1296]],
  warbane: [[0, 864], [205, 864], [205, 1008], [0, 1008]],
  wargrim: [[410, 864], [615, 864], [615, 1008], [410, 1008]],
  wraithmoor: [[820, 144], [1025, 144], [1025, 288], [820, 288]],
};

// ── Build CROSSINGS array by detecting shared polygon edges ──────────────────
CROSSINGS = [
  { axis:"V", bCoord: 923, gCoord: 684, type:"crossing", id:"gate_1_2" },
  { axis:"H", bCoord: 648, gCoord: 692, type:"tunnel", id:"gate_1_4" },
  { axis:"H", bCoord: 432, gCoord: 718, type:"tunnel", id:"gate_1_29" },
  { axis:"H", bCoord: 432, gCoord: 871, type:"crossing", id:"gate_1_30" },
  { axis:"V", bCoord: 615, gCoord: 504, type:"crossing", id:"gate_1_35" },
  { axis:"V", bCoord: 615, gCoord: 612, type:"tollbridge", id:"gate_1_40" },
  { axis:"H", bCoord: 576, gCoord: 871, type:"crossing", id:"gate_1_41" },
  { axis:"H", bCoord: 648, gCoord:1128, type:"tunnel", id:"gate_2_3" },
  { axis:"H", bCoord: 432, gCoord: 974, type:"crossing", id:"gate_2_30" },
  { axis:"H", bCoord: 432, gCoord:1128, type:"tollbridge", id:"gate_2_31" },
  { axis:"V", bCoord:1230, gCoord: 504, type:"tollbridge", id:"gate_2_36" },
  { axis:"V", bCoord:1230, gCoord: 612, type:"tollbridge", id:"gate_2_41" },
  { axis:"V", bCoord: 923, gCoord: 792, type:"tunnel", id:"gate_3_4" },
  { axis:"V", bCoord:1230, gCoord: 684, type:"tunnel", id:"gate_3_41" },
  { axis:"V", bCoord:1230, gCoord: 792, type:"tunnel", id:"gate_3_46" },
  { axis:"H", bCoord: 864, gCoord: 974, type:"tunnel", id:"gate_3_51" },
  { axis:"H", bCoord: 864, gCoord:1128, type:"crossing", id:"gate_3_52" },
  { axis:"V", bCoord: 615, gCoord: 684, type:"crossing", id:"gate_4_40" },
  { axis:"H", bCoord: 720, gCoord: 871, type:"tunnel", id:"gate_4_41" },
  { axis:"V", bCoord: 615, gCoord: 792, type:"crossing", id:"gate_4_45" },
  { axis:"H", bCoord: 864, gCoord: 718, type:"tunnel", id:"gate_4_50" },
  { axis:"H", bCoord: 864, gCoord: 871, type:"tunnel", id:"gate_4_51" },
  { axis:"H", bCoord: 144, gCoord: 308, type:"crossing", id:"gate_5_14" },
  { axis:"H", bCoord: 144, gCoord: 513, type:"tunnel", id:"gate_5_15" },
  { axis:"V", bCoord: 205, gCoord: 216, type:"crossing", id:"gate_5_22" },
  { axis:"V", bCoord: 615, gCoord: 216, type:"tunnel", id:"gate_5_23" },
  { axis:"H", bCoord: 288, gCoord: 308, type:"tollbridge", id:"gate_5_27" },
  { axis:"H", bCoord: 288, gCoord: 513, type:"tollbridge", id:"gate_5_28" },
  { axis:"H", bCoord: 144, gCoord:1333, type:"tollbridge", id:"gate_6_19" },
  { axis:"H", bCoord: 144, gCoord:1538, type:"crossing", id:"gate_6_20" },
  { axis:"V", bCoord:1230, gCoord: 216, type:"crossing", id:"gate_6_25" },
  { axis:"V", bCoord:1640, gCoord: 216, type:"crossing", id:"gate_6_26" },
  { axis:"H", bCoord: 288, gCoord:1333, type:"crossing", id:"gate_6_32" },
  { axis:"H", bCoord: 288, gCoord:1538, type:"crossing", id:"gate_6_33" },
  { axis:"H", bCoord:1152, gCoord: 308, type:"crossing", id:"gate_7_61" },
  { axis:"H", bCoord:1152, gCoord: 513, type:"tunnel", id:"gate_7_62" },
  { axis:"V", bCoord: 205, gCoord:1080, type:"crossing", id:"gate_7_55" },
  { axis:"V", bCoord: 615, gCoord:1080, type:"tollbridge", id:"gate_7_56" },
  { axis:"H", bCoord:1008, gCoord: 308, type:"tollbridge", id:"gate_7_49" },
  { axis:"H", bCoord:1008, gCoord: 513, type:"tunnel", id:"gate_7_50" },
  { axis:"H", bCoord:1152, gCoord:1333, type:"crossing", id:"gate_8_66" },
  { axis:"H", bCoord:1152, gCoord:1538, type:"crossing", id:"gate_8_67" },
  { axis:"V", bCoord:1230, gCoord:1080, type:"crossing", id:"gate_8_58" },
  { axis:"V", bCoord:1640, gCoord:1080, type:"crossing", id:"gate_8_59" },
  { axis:"H", bCoord:1008, gCoord:1333, type:"crossing", id:"gate_8_53" },
  { axis:"H", bCoord:1008, gCoord:1538, type:"crossing", id:"gate_8_54" },
  { axis:"V", bCoord: 205, gCoord: 360, type:"tunnel", id:"gate_9_22" },
  { axis:"H", bCoord: 288, gCoord: 103, type:"crossing", id:"gate_9_13" },
  { axis:"H", bCoord: 144, gCoord: 103, type:"crossing", id:"gate_9_27" },
  { axis:"V", bCoord:1640, gCoord: 360, type:"crossing", id:"gate_10_26" },
  { axis:"H", bCoord: 288, gCoord:1743, type:"crossing", id:"gate_10_21" },
  { axis:"H", bCoord: 144, gCoord:1743, type:"tunnel", id:"gate_10_32" },
  { axis:"V", bCoord: 205, gCoord: 792, type:"crossing", id:"gate_11_55" },
  { axis:"H", bCoord: 864, gCoord: 103, type:"crossing", id:"gate_11_48" },
  { axis:"H", bCoord:1008, gCoord: 103, type:"crossing", id:"gate_11_42" },
  { axis:"V", bCoord:1640, gCoord: 792, type:"tunnel", id:"gate_12_59" },
  { axis:"H", bCoord: 864, gCoord:1743, type:"crossing", id:"gate_12_47" },
  { axis:"H", bCoord:1008, gCoord:1743, type:"tunnel", id:"gate_12_43" },
  { axis:"V", bCoord: 103, gCoord:  72, type:"crossing", id:"gate_13_22" },
  { axis:"H", bCoord: 144, gCoord: 103, type:"crossing", id:"gate_13_27" },
  { axis:"V", bCoord: 205, gCoord:  72, type:"tollbridge", id:"gate_13_14" },
  { axis:"V", bCoord: 410, gCoord:  72, type:"crossing", id:"gate_14_15" },
  { axis:"H", bCoord: 144, gCoord: 308, type:"crossing", id:"gate_14_27" },
  { axis:"V", bCoord: 615, gCoord:  72, type:"tunnel", id:"gate_15_16" },
  { axis:"H", bCoord: 144, gCoord: 513, type:"tunnel", id:"gate_15_28" },
  { axis:"V", bCoord: 820, gCoord:  72, type:"tunnel", id:"gate_16_17" },
  { axis:"H", bCoord: 144, gCoord: 718, type:"crossing", id:"gate_16_23" },
  { axis:"V", bCoord:1025, gCoord:  72, type:"crossing", id:"gate_17_18" },
  { axis:"H", bCoord: 144, gCoord: 923, type:"crossing", id:"gate_17_24" },
  { axis:"V", bCoord:1230, gCoord:  72, type:"tunnel", id:"gate_18_19" },
  { axis:"H", bCoord: 144, gCoord:1128, type:"tunnel", id:"gate_18_24" },
  { axis:"V", bCoord:1435, gCoord:  72, type:"tunnel", id:"gate_19_20" },
  { axis:"H", bCoord: 144, gCoord:1333, type:"tollbridge", id:"gate_19_32" },
  { axis:"V", bCoord:1640, gCoord:  72, type:"crossing", id:"gate_20_21" },
  { axis:"H", bCoord: 144, gCoord:1538, type:"crossing", id:"gate_20_33" },
  { axis:"H", bCoord: 144, gCoord:1743, type:"tunnel", id:"gate_21_32" },
  { axis:"V", bCoord: 103, gCoord: 216, type:"crossing", id:"gate_22_27" },
  { axis:"V", bCoord: 820, gCoord: 216, type:"tollbridge", id:"gate_23_24" },
  { axis:"H", bCoord: 288, gCoord: 718, type:"crossing", id:"gate_23_28" },
  { axis:"V", bCoord:1025, gCoord: 216, type:"crossing", id:"gate_24_25" },
  { axis:"H", bCoord: 288, gCoord: 923, type:"tunnel", id:"gate_24_29" },
  { axis:"V", bCoord:1230, gCoord: 216, type:"crossing", id:"gate_25_32" },
  { axis:"H", bCoord: 288, gCoord:1128, type:"crossing", id:"gate_25_31" },
  { axis:"H", bCoord: 288, gCoord:1743, type:"crossing", id:"gate_26_33" },
  { axis:"V", bCoord: 103, gCoord: 360, type:"tunnel", id:"gate_27_34" },
  { axis:"V", bCoord: 410, gCoord: 288, type:"crossing", id:"gate_27_28" },
  { axis:"V", bCoord: 615, gCoord: 288, type:"tunnel", id:"gate_28_29" },
  { axis:"V", bCoord: 820, gCoord: 288, type:"crossing", id:"gate_29_30" },
  { axis:"V", bCoord:1025, gCoord: 288, type:"crossing", id:"gate_30_31" },
  { axis:"V", bCoord:1230, gCoord: 288, type:"tunnel", id:"gate_31_32" },
  { axis:"V", bCoord:1435, gCoord: 288, type:"tunnel", id:"gate_32_33" },
  { axis:"H", bCoord: 432, gCoord: 308, type:"tollbridge", id:"gate_34_35" },
  { axis:"V", bCoord: 205, gCoord: 504, type:"crossing", id:"gate_34_39" },
  { axis:"V", bCoord: 410, gCoord: 432, type:"crossing", id:"gate_35_36" },
  { axis:"V", bCoord:1025, gCoord: 432, type:"crossing", id:"gate_36_37" },
  { axis:"H", bCoord: 432, gCoord:1128, type:"tollbridge", id:"gate_36_41" },
  { axis:"V", bCoord:1230, gCoord: 432, type:"tunnel", id:"gate_37_38" },
  { axis:"H", bCoord: 432, gCoord:1333, type:"crossing", id:"gate_37_41" },
  { axis:"V", bCoord:1435, gCoord: 432, type:"crossing", id:"gate_38_41" },
  { axis:"H", bCoord: 576, gCoord: 308, type:"tunnel", id:"gate_39_40" },
  { axis:"V", bCoord: 205, gCoord: 648, type:"tunnel", id:"gate_39_44" },
  { axis:"V", bCoord: 410, gCoord: 576, type:"crossing", id:"gate_40_45" },
  { axis:"V", bCoord:1025, gCoord: 576, type:"crossing", id:"gate_41_42" },
  { axis:"H", bCoord: 720, gCoord:1333, type:"crossing", id:"gate_41_46" },
  { axis:"V", bCoord:1230, gCoord: 720, type:"tollbridge", id:"gate_42_43" },
  { axis:"V", bCoord:1435, gCoord: 576, type:"crossing", id:"gate_42_46" },
  { axis:"V", bCoord:1640, gCoord: 576, type:"crossing", id:"gate_43_47" },
  { axis:"H", bCoord: 720, gCoord: 308, type:"tunnel", id:"gate_44_45" },
  { axis:"V", bCoord: 205, gCoord: 792, type:"crossing", id:"gate_44_48" },
  { axis:"V", bCoord: 410, gCoord: 720, type:"crossing", id:"gate_45_50" },
  { axis:"V", bCoord:1230, gCoord: 864, type:"crossing", id:"gate_46_51" },
  { axis:"V", bCoord:1435, gCoord: 720, type:"tunnel", id:"gate_46_47" },
  { axis:"V", bCoord:1640, gCoord: 720, type:"tunnel", id:"gate_47_43" },
  { axis:"H", bCoord: 864, gCoord: 308, type:"tollbridge", id:"gate_48_49" },
  { axis:"V", bCoord: 205, gCoord: 936, type:"tunnel", id:"gate_48_55" },
  { axis:"V", bCoord: 410, gCoord: 864, type:"tunnel", id:"gate_49_50" },
  { axis:"H", bCoord:1008, gCoord: 615, type:"crossing", id:"gate_50_56" },
  { axis:"V", bCoord: 615, gCoord: 864, type:"crossing", id:"gate_50_51" },
  { axis:"V", bCoord: 820, gCoord: 864, type:"crossing", id:"gate_51_57" },
  { axis:"V", bCoord:1025, gCoord: 936, type:"crossing", id:"gate_51_52" },
  { axis:"V", bCoord:1230, gCoord: 936, type:"crossing", id:"gate_52_53" },
  { axis:"H", bCoord:1008, gCoord:1128, type:"tollbridge", id:"gate_52_58" },
  { axis:"V", bCoord:1435, gCoord: 936, type:"tollbridge", id:"gate_53_54" },
  { axis:"H", bCoord:1152, gCoord: 103, type:"tollbridge", id:"gate_55_60" },
  { axis:"V", bCoord: 820, gCoord:1080, type:"tunnel", id:"gate_56_57" },
  { axis:"H", bCoord:1152, gCoord: 718, type:"tunnel", id:"gate_56_63" },
  { axis:"V", bCoord:1025, gCoord:1080, type:"crossing", id:"gate_57_58" },
  { axis:"H", bCoord:1152, gCoord: 923, type:"tunnel", id:"gate_57_64" },
  { axis:"H", bCoord:1152, gCoord:1128, type:"tunnel", id:"gate_58_65" },
  { axis:"H", bCoord:1152, gCoord:1743, type:"tunnel", id:"gate_59_68" },
  { axis:"V", bCoord: 205, gCoord:1224, type:"tollbridge", id:"gate_60_61" },
  { axis:"V", bCoord: 410, gCoord:1224, type:"tunnel", id:"gate_61_62" },
  { axis:"V", bCoord: 615, gCoord:1224, type:"crossing", id:"gate_62_63" },
  { axis:"V", bCoord: 820, gCoord:1224, type:"crossing", id:"gate_63_64" },
  { axis:"V", bCoord:1025, gCoord:1224, type:"tunnel", id:"gate_64_65" },
  { axis:"V", bCoord:1230, gCoord:1224, type:"tunnel", id:"gate_65_66" },
  { axis:"V", bCoord:1435, gCoord:1224, type:"tollbridge", id:"gate_66_67" },
  { axis:"V", bCoord:1640, gCoord:1224, type:"tollbridge", id:"gate_67_68" },
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

  // ── Paint border segments + place crossing gate structures ─────────────
  const gateMeta  = {};
  const impassKeys = [];

  // Use CROSSINGS to find borders, then locate actual positions in REGION_MAP
  const { impassable, gateA, gateB, pathTiles } = buildBordersFromCrossings(REGION_MAP, CROSSINGS);

  console.log(`[MapGen] CROSSINGS count: ${CROSSINGS.length}`);
  console.log(`[MapGen] Border tiles - impassable: ${impassable.length}, gateA: ${gateA.length}, gateB: ${gateB.length}, path: ${pathTiles.length}`);
  if (CROSSINGS.length > 0) {
    console.log(`[MapGen] Sample crossing:`, CROSSINGS[0]);
  }

  // Paint impassable border tiles
  for (const {x, y} of impassable) {
    const idx = y*COLS+x;
    if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
    // Use river for all borders for now (can be enhanced per-crossing later)
    terrainArr[idx]  = TERRAIN_ENC.river;
    flagArr[idx]     = (flagArr[idx] & ~F_GATE) | F_BORDER;
    rssArr[idx]      = 0;
    garrisonArr[idx] = 0;
    impassKeys.push(`${x},${y}`);
  }

  // Paint path tiles — passable, use border terrain
  for (const {x, y} of pathTiles) {
    const idx = y*COLS+x;
    if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
    terrainArr[idx]  = TERRAIN_ENC.river;
    flagArr[idx]     = (flagArr[idx] & ~F_BORDER) | F_GATE;
    rssArr[idx]      = 0;
    garrisonArr[idx] = 0;
  }

  // Place Gate A structures
  for (const {x, y, id, type} of gateA) {
    const idx = y*COLS+x;
    if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
    terrainArr[idx]  = TERRAIN_ENC.river;
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
    terrainArr[idx]  = TERRAIN_ENC.river;
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
