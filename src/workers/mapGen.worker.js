// Build: 1779593297
// ── Map Generation Web Worker ─────────────────────────────────────────────────
// Communicates via postMessage:
//   incoming: { facKey }
//   outgoing: { type:'progress', pct, label }
//             { type:'done', buffers, meta, spawnKeys, aiHqMap, playerSpawn }  ← transferable, zero-copy

const COLS = 1845, ROWS = 1305;
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
  { key:"shadowmere", name:"Shadowmere", layer:"farm", keepName:"Shadowmere Keep", cx:102, cy:1232, factions:[] },
  { key:"icepeak", name:"Icepeak", layer:"farm", keepName:"Icepeak Keep", cx:307, cy:1232, factions:["coldborns"] },
  { key:"frosthold", name:"Frosthold", layer:"start", keepName:"Frosthold Keep", cx:512, cy:1232, factions:["coldborns"] },
  { key:"icebreak", name:"Icebreak", layer:"farm", keepName:"Icebreak Keep", cx:717, cy:1232, factions:["coldborns"] },
  { key:"drearfort", name:"Drearfort", layer:"farm", keepName:"Drearfort Keep", cx:922, cy:1232, factions:[] },
  { key:"shadowmire", name:"Shadowmire", layer:"farm", keepName:"Shadowmire Keep", cx:1127, cy:1232, factions:["nightcreatures"] },
  { key:"duskmire", name:"Duskmire", layer:"start", keepName:"Duskmire Keep", cx:1332, cy:1232, factions:["nightcreatures"] },
  { key:"shadowfen", name:"Shadowfen", layer:"farm", keepName:"Shadowfen Keep", cx:1537, cy:1232, factions:["nightcreatures"] },
  { key:"gravemist", name:"Gravemist", layer:"farm", keepName:"Gravemist Keep", cx:1742, cy:1232, factions:[] },
  { key:"flamecrestpeak", name:"Flamecrest Peak", layer:"start", keepName:"Flamecrest Peak Keep", cx:102, cy:1087, factions:["dragons"] },
  { key:"ebonvault", name:"Ebonvault", layer:"farm", keepName:"Ebonvault Keep", cx:410, cy:1087, factions:["dragons"] },
  { key:"wraithmoor", name:"Wraithmoor", layer:"farm", keepName:"Wraithmoor Keep", cx:717, cy:1087, factions:[] },
  { key:"deathmarsh", name:"Deathmarsh", layer:"farm", keepName:"Deathmarsh Keep", cx:922, cy:1087, factions:[] },
  { key:"bleakstone", name:"Bleakstone", layer:"farm", keepName:"Bleakstone Keep", cx:1127, cy:1087, factions:[] },
  { key:"fellwood", name:"Fellwood", layer:"farm", keepName:"Fellwood Keep", cx:1435, cy:1087, factions:["wizards"] },
  { key:"arcaneum", name:"Arcaneum", layer:"start", keepName:"Arcaneum Keep", cx:1742, cy:1087, factions:["wizards"] },
  { key:"cursedfen", name:"Cursedfen", layer:"farm", keepName:"Cursedfen Keep", cx:102, cy:870, factions:[] },
  { key:"rotmire", name:"Rotmire", layer:"farm", keepName:"Rotmire Keep", cx:307, cy:942, factions:[] },
  { key:"blightmoor", name:"Blightmoor", layer:"farm", keepName:"Blightmoor Keep", cx:512, cy:942, factions:[] },
  { key:"skullcrag", name:"Skullcrag", layer:"farm", keepName:"Skullcrag Keep", cx:717, cy:942, factions:[] },
  { key:"ghosthollow", name:"Ghosthollow", layer:"farm", keepName:"Ghosthollow Keep", cx:922, cy:942, factions:[] },
  { key:"doomspire", name:"Doomspire", layer:"farm", keepName:"Doomspire Keep", cx:1127, cy:942, factions:[] },
  { key:"duskwood", name:"Duskwood", layer:"farm", keepName:"Duskwood Keep", cx:1332, cy:942, factions:[] },
  { key:"gloomvale", name:"Gloomvale", layer:"farm", keepName:"Gloomvale Keep", cx:1537, cy:942, factions:[] },
  { key:"nightmarsh", name:"Nightmarsh", layer:"farm", keepName:"Nightmarsh Keep", cx:1742, cy:870, factions:[] },
  { key:"cryptwood", name:"Cryptwood", layer:"farm", keepName:"Cryptwood Keep", cx:307, cy:797, factions:[] },
  { key:"bonewood", name:"Bonewood", layer:"farm", keepName:"Bonewood Keep", cx:512, cy:797, factions:[] },
  { key:"ashenvale", name:"Ashenvale", layer:"farm", keepName:"Ashenvale Keep", cx:769, cy:761, factions:null },
  { key:"thornvale", name:"Thornvale", layer:"farm", keepName:"Thornvale Keep", cx:1076, cy:761, factions:null },
  { key:"grimstone", name:"Grimstone", layer:"farm", keepName:"Grimstone Keep", cx:1332, cy:797, factions:[] },
  { key:"darkhollow", name:"Darkhollow", layer:"farm", keepName:"Darkhollow Keep", cx:1537, cy:797, factions:[] },
  { key:"blackstone", name:"Blackstone", layer:"farm", keepName:"Blackstone Keep", cx:102, cy:652, factions:[] },
  { key:"deadwood", name:"Deadwood", layer:"farm", keepName:"Deadwood Keep", cx:307, cy:652, factions:[] },
  { key:"frostbite", name:"Frostbite", layer:"farm", keepName:"Frostbite Keep", cx:512, cy:652, factions:[] },
  { key:"holygrail", name:"Holy Grail", layer:"ring", keepName:"Holy Grail Keep", cx:922, cy:652, factions:[] },
  { key:"bloodmoor", name:"Bloodmoor", layer:"farm", keepName:"Bloodmoor Keep", cx:1332, cy:652, factions:[] },
  { key:"wargrim", name:"Wargrim", layer:"farm", keepName:"Wargrim Keep", cx:1537, cy:652, factions:[] },
  { key:"icefall", name:"Icefall", layer:"farm", keepName:"Icefall Keep", cx:1742, cy:652, factions:[] },
  { key:"steelwatch", name:"Steelwatch", layer:"farm", keepName:"Steelwatch Keep", cx:307, cy:507, factions:[] },
  { key:"ironhold", name:"Ironhold", layer:"farm", keepName:"Ironhold Keep", cx:512, cy:507, factions:[] },
  { key:"battlemarsh", name:"Battlemarsh", layer:"farm", keepName:"Battlemarsh Keep", cx:769, cy:543, factions:null },
  { key:"stormwatch", name:"Stormwatch", layer:"farm", keepName:"Stormwatch Keep", cx:1076, cy:543, factions:null },
  { key:"tidecrag", name:"Tidecrag", layer:"farm", keepName:"Tidecrag Keep", cx:1332, cy:507, factions:[] },
  { key:"warbane", name:"Warbane", layer:"farm", keepName:"Warbane Keep", cx:1537, cy:507, factions:[] },
  { key:"lightshield", name:"Lightshield", layer:"farm", keepName:"Lightshield Keep", cx:102, cy:435, factions:[] },
  { key:"emberfang", name:"Emberfang", layer:"farm", keepName:"Emberfang Keep", cx:307, cy:362, factions:[] },
  { key:"spellspire", name:"Spellspire", layer:"farm", keepName:"Spellspire Keep", cx:512, cy:362, factions:[] },
  { key:"runestone", name:"Runestone", layer:"farm", keepName:"Runestone Keep", cx:717, cy:362, factions:[] },
  { key:"skullcove", name:"Skullcove", layer:"farm", keepName:"Skullcove Keep", cx:922, cy:362, factions:[] },
  { key:"blackbrine", name:"Blackbrine", layer:"farm", keepName:"Blackbrine Keep", cx:1127, cy:362, factions:[] },
  { key:"mysticfen", name:"Mysticfen", layer:"farm", keepName:"Mysticfen Keep", cx:1332, cy:362, factions:[] },
  { key:"salthaven", name:"Salthaven", layer:"farm", keepName:"Salthaven Keep", cx:1537, cy:362, factions:[] },
  { key:"deepwater", name:"Deepwater", layer:"farm", keepName:"Deepwater Keep", cx:1742, cy:435, factions:[] },
  { key:"bloodrock", name:"Bloodrock", layer:"start", keepName:"Bloodrock Keep", cx:102, cy:217, factions:["orcs"] },
  { key:"fogmire", name:"Fogmire", layer:"farm", keepName:"Fogmire Keep", cx:410, cy:217, factions:["orcs"] },
  { key:"graveshroud", name:"Graveshroud", layer:"farm", keepName:"Graveshroud Keep", cx:717, cy:217, factions:[] },
  { key:"greywatch", name:"Greywatch", layer:"farm", keepName:"Greywatch Keep", cx:922, cy:217, factions:[] },
  { key:"voidmarsh", name:"Voidmarsh", layer:"farm", keepName:"Voidmarsh Keep", cx:1127, cy:217, factions:[] },
  { key:"stoneheart", name:"Stoneheart", layer:"farm", keepName:"Stoneheart Keep", cx:1435, cy:217, factions:["holyknights"] },
  { key:"oathkeep", name:"Oathkeep", layer:"start", keepName:"Oathkeep Keep", cx:1742, cy:217, factions:["holyknights"] },
  { key:"ashenmark", name:"Ashenmark", layer:"farm", keepName:"Ashenmark Keep", cx:102, cy:72, factions:[] },
  { key:"dreadmarsh", name:"Dreadmarsh", layer:"farm", keepName:"Dreadmarsh Keep", cx:307, cy:72, factions:[] },
  { key:"deadmansharbor", name:"Deadmans Harbor", layer:"start", keepName:"Deadmans Harbor Keep", cx:512, cy:72, factions:["pirates"] },
  { key:"ironwood", name:"Ironwood", layer:"farm", keepName:"Ironwood Keep", cx:717, cy:72, factions:[] },
  { key:"lastwatch", name:"Lastwatch", layer:"farm", keepName:"Lastwatch Keep", cx:922, cy:72, factions:[] },
  { key:"finalhope", name:"Finalhope", layer:"farm", keepName:"Finalhope Keep", cx:1127, cy:72, factions:[] },
  { key:"bonehallow", name:"Bonehallow", layer:"start", keepName:"Bonehallow Keep", cx:1332, cy:72, factions:["ashen_dead"] },
  { key:"dawngate", name:"Dawngate", layer:"farm", keepName:"Dawngate Keep", cx:1537, cy:72, factions:[] },
  { key:"twilightspire", name:"Twilightspire", layer:"farm", keepName:"Twilightspire Keep", cx:1742, cy:72, factions:[] },
];

const FACTION_REGIONS = {
  ashen_dead     : { start:"bonehallow", farm:"dawngate" },
  coldborns      : { start:"frosthold", farm:"icepeak" },
  dragons        : { start:"flamecrestpeak", farm:"ebonvault" },
  holyknights    : { start:"oathkeep", farm:"stoneheart" },
  nightcreatures : { start:"duskmire", farm:"shadowmire" },
  orcs           : { start:"bloodrock", farm:"fogmire" },
  pirates        : { start:"deadmansharbor", farm:"ironwood" },
  wizards        : { start:"arcaneum", farm:"fellwood" },
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
// Each entry: { axis:'H'|'V', bCoord, gCoord, type:'crossing'|'tunnel'|'tollbridge', id }
// H = horizontal border (strip of rows at bCoord y, gate centered at gCoord x)
// V = vertical border   (strip of cols at bCoord x, gate centered at gCoord y)

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
      for (let y = g.gateStart; y <= g.gateEnd; y++) {
        gateYSet.add(y);
      }
    });
    
    // Draw border on both sides of the line
    for (let dx = -BORDER_WIDTH; dx <= BORDER_WIDTH; dx++) {
      if (dx === 0) continue; // Skip the exact boundary line
      const bx = x + dx;
      if (bx < 0 || bx >= COLS) continue;
      
      for (let y = 0; y < ROWS; y++) {
        if (gateYSet.has(y)) {
          // Gate/path tile - passable but add perpendicular borders
          pathTiles.push({ x: bx, y });
          
          // Add borders on perpendicular sides of path tiles (only the 2 middle path tiles)
          gates.forEach(g => {
            if (y === g.gateStart + 1 || y === g.gateStart + 2) { // Path tiles only
              for (let pdy = -BORDER_WIDTH; pdy <= BORDER_WIDTH; pdy++) {
                if (pdy === 0) continue;
                const pby = y + pdy;
                if (pby >= 0 && pby < ROWS && !gateYSet.has(pby)) {
                  impassable.push({ x: bx, y: pby });
                }
              }
            }
          });
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
      for (let x = g.gateStart; x <= g.gateEnd; x++) {
        gateXSet.add(x);
      }
    });
    
    // Draw border on both sides of the line
    for (let dy = -BORDER_WIDTH; dy <= BORDER_WIDTH; dy++) {
      if (dy === 0) continue; // Skip the exact boundary line
      const by = y + dy;
      if (by < 0 || by >= ROWS) continue;
      
      for (let x = 0; x < COLS; x++) {
        if (gateXSet.has(x)) {
          // Gate/path tile - passable but add perpendicular borders
          pathTiles.push({ x, y: by });
          
          // Add borders on perpendicular sides of path tiles (only the 2 middle path tiles)
          gates.forEach(g => {
            if (x === g.gateStart + 1 || x === g.gateStart + 2) { // Path tiles only
              for (let pdx = -BORDER_WIDTH; pdx <= BORDER_WIDTH; pdx++) {
                if (pdx === 0) continue;
                const pbx = x + pdx;
                if (pbx >= 0 && pbx < COLS && !gateXSet.has(pbx)) {
                  impassable.push({ x: pbx, y: by });
                }
              }
            }
          });
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
  { axis:"V", bCoord:  410, gCoord: 1213, start: 1211, end: 1215, type:"tollbridge", id:"gate_2" },
  { axis:"V", bCoord:  615, gCoord: 1213, start: 1211, end: 1215, type:"crossing", id:"gate_3" },
  { axis:"V", bCoord:  820, gCoord: 1213, start: 1211, end: 1215, type:"tunnel", id:"gate_4" },
  { axis:"V", bCoord: 1025, gCoord: 1213, start: 1211, end: 1215, type:"tollbridge", id:"gate_5" },
  { axis:"V", bCoord: 1230, gCoord: 1213, start: 1211, end: 1215, type:"crossing", id:"gate_6" },
  { axis:"V", bCoord: 1435, gCoord: 1213, start: 1211, end: 1215, type:"tunnel", id:"gate_7" },
  { axis:"V", bCoord: 1640, gCoord: 1213, start: 1211, end: 1215, type:"tollbridge", id:"gate_8" },
  // Row 2 vertical gates (y=1078)
  { axis:"V", bCoord:  205, gCoord: 1078, start: 1076, end: 1080, type:"crossing", id:"gate_9" },
  { axis:"V", bCoord:  615, gCoord: 1078, start: 1076, end: 1080, type:"tunnel", id:"gate_10" },
  { axis:"V", bCoord:  820, gCoord: 1078, start: 1076, end: 1080, type:"tollbridge", id:"gate_11" },
  { axis:"V", bCoord: 1025, gCoord: 1078, start: 1076, end: 1080, type:"crossing", id:"gate_12" },
  { axis:"V", bCoord: 1230, gCoord: 1078, start: 1076, end: 1080, type:"tunnel", id:"gate_13" },
  { axis:"V", bCoord: 1640, gCoord: 1078, start: 1076, end: 1080, type:"tollbridge", id:"gate_14" },
  // Row 3 vertical gates (y=942)
  { axis:"V", bCoord:  205, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_15" },
  { axis:"V", bCoord:  410, gCoord:  942, start:  940, end:  944, type:"tunnel", id:"gate_16" },
  { axis:"V", bCoord:  615, gCoord:  942, start:  940, end:  944, type:"tollbridge", id:"gate_17" },
  { axis:"V", bCoord:  820, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_18" },
  { axis:"V", bCoord: 1025, gCoord:  942, start:  940, end:  944, type:"tunnel", id:"gate_19" },
  { axis:"V", bCoord: 1230, gCoord:  942, start:  940, end:  944, type:"tollbridge", id:"gate_20" },
  { axis:"V", bCoord: 1435, gCoord:  942, start:  940, end:  944, type:"crossing", id:"gate_21" },
  { axis:"V", bCoord: 1640, gCoord:  942, start:  940, end:  944, type:"tunnel", id:"gate_22" },
  // Row 4 vertical gates (y=797)
  { axis:"V", bCoord:  205, gCoord:  797, start:  795, end:  799, type:"tollbridge", id:"gate_23" },
  { axis:"V", bCoord:  410, gCoord:  797, start:  795, end:  799, type:"crossing", id:"gate_24" },
  { axis:"V", bCoord: 1435, gCoord:  797, start:  795, end:  799, type:"tunnel", id:"gate_25" },
  { axis:"V", bCoord: 1640, gCoord:  797, start:  795, end:  799, type:"tollbridge", id:"gate_26" },
  // Row 5 vertical gates (y=652)
  { axis:"V", bCoord:  205, gCoord:  652, start:  650, end:  654, type:"crossing", id:"gate_27" },
  { axis:"V", bCoord:  410, gCoord:  652, start:  650, end:  654, type:"tunnel", id:"gate_28" },
  { axis:"V", bCoord: 1435, gCoord:  652, start:  650, end:  654, type:"tollbridge", id:"gate_29" },
  { axis:"V", bCoord: 1640, gCoord:  652, start:  650, end:  654, type:"crossing", id:"gate_30" },
  // Row 6 vertical gates (y=507)
  { axis:"V", bCoord:  205, gCoord:  507, start:  505, end:  509, type:"tunnel", id:"gate_31" },
  { axis:"V", bCoord:  410, gCoord:  507, start:  505, end:  509, type:"tollbridge", id:"gate_32" },
  { axis:"V", bCoord: 1435, gCoord:  507, start:  505, end:  509, type:"crossing", id:"gate_33" },
  { axis:"V", bCoord: 1640, gCoord:  507, start:  505, end:  509, type:"tunnel", id:"gate_34" },
  // Row 7 vertical gates (y=362)
  { axis:"V", bCoord:  205, gCoord:  362, start:  360, end:  364, type:"tollbridge", id:"gate_35" },
  { axis:"V", bCoord:  410, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_36" },
  { axis:"V", bCoord:  615, gCoord:  362, start:  360, end:  364, type:"tunnel", id:"gate_37" },
  { axis:"V", bCoord:  820, gCoord:  362, start:  360, end:  364, type:"tollbridge", id:"gate_38" },
  { axis:"V", bCoord: 1025, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_39" },
  { axis:"V", bCoord: 1230, gCoord:  362, start:  360, end:  364, type:"tunnel", id:"gate_40" },
  { axis:"V", bCoord: 1435, gCoord:  362, start:  360, end:  364, type:"tollbridge", id:"gate_41" },
  { axis:"V", bCoord: 1640, gCoord:  362, start:  360, end:  364, type:"crossing", id:"gate_42" },
  // Row 8 vertical gates (y=217)
  { axis:"V", bCoord:  205, gCoord:  217, start:  215, end:  219, type:"tunnel", id:"gate_43" },
  { axis:"V", bCoord:  615, gCoord:  217, start:  215, end:  219, type:"tollbridge", id:"gate_44" },
  { axis:"V", bCoord:  820, gCoord:  217, start:  215, end:  219, type:"crossing", id:"gate_45" },
  { axis:"V", bCoord: 1025, gCoord:  217, start:  215, end:  219, type:"tunnel", id:"gate_46" },
  { axis:"V", bCoord: 1230, gCoord:  217, start:  215, end:  219, type:"tollbridge", id:"gate_47" },
  { axis:"V", bCoord: 1640, gCoord:  217, start:  215, end:  219, type:"crossing", id:"gate_48" },
  // Row 9 vertical gates (y=72)
  { axis:"V", bCoord:  205, gCoord:   72, start:   70, end:   74, type:"tunnel", id:"gate_49" },
  { axis:"V", bCoord:  410, gCoord:   72, start:   70, end:   74, type:"tollbridge", id:"gate_50" },
  { axis:"V", bCoord:  615, gCoord:   72, start:   70, end:   74, type:"crossing", id:"gate_51" },
  { axis:"V", bCoord:  820, gCoord:   72, start:   70, end:   74, type:"tunnel", id:"gate_52" },
  { axis:"V", bCoord: 1025, gCoord:   72, start:   70, end:   74, type:"tollbridge", id:"gate_53" },
  { axis:"V", bCoord: 1230, gCoord:   72, start:   70, end:   74, type:"crossing", id:"gate_54" },
  { axis:"V", bCoord: 1435, gCoord:   72, start:   70, end:   74, type:"tunnel", id:"gate_55" },
  { axis:"V", bCoord: 1640, gCoord:   72, start:   70, end:   74, type:"tollbridge", id:"gate_56" },
  // Horizontal gates (unchanged)
  { axis:"H", bCoord: 1162, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_57" },
  { axis:"H", bCoord: 1162, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_58" },
  { axis:"H", bCoord: 1162, gCoord:  512, start:  510, end:  514, type:"tollbridge", id:"gate_59" },
  { axis:"H", bCoord: 1162, gCoord:  717, start:  715, end:  719, type:"crossing", id:"gate_60" },
  { axis:"H", bCoord: 1162, gCoord:  922, start:  920, end:  924, type:"tunnel", id:"gate_61" },
  { axis:"H", bCoord: 1162, gCoord: 1127, start: 1125, end: 1129, type:"tollbridge", id:"gate_62" },
  { axis:"H", bCoord: 1162, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_63" },
  { axis:"H", bCoord: 1162, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_64" },
  { axis:"H", bCoord: 1162, gCoord: 1742, start: 1740, end: 1744, type:"tollbridge", id:"gate_65" },
  { axis:"H", bCoord: 1017, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_66" },
  { axis:"H", bCoord: 1017, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_67" },
  { axis:"H", bCoord: 1017, gCoord:  512, start:  510, end:  514, type:"tollbridge", id:"gate_68" },
  { axis:"H", bCoord: 1017, gCoord:  717, start:  715, end:  719, type:"crossing", id:"gate_69" },
  { axis:"H", bCoord: 1017, gCoord:  922, start:  920, end:  924, type:"tunnel", id:"gate_70" },
  { axis:"H", bCoord: 1017, gCoord: 1127, start: 1125, end: 1129, type:"tollbridge", id:"gate_71" },
  { axis:"H", bCoord: 1017, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_72" },
  { axis:"H", bCoord: 1017, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_73" },
  { axis:"H", bCoord: 1017, gCoord: 1742, start: 1740, end: 1744, type:"tollbridge", id:"gate_74" },
  { axis:"H", bCoord:  872, gCoord:  307, start:  305, end:  309, type:"crossing", id:"gate_75" },
  { axis:"H", bCoord:  872, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_76" },
  { axis:"H", bCoord:  872, gCoord:  675, start:  673, end:  677, type:"tollbridge", id:"gate_77" },
  { axis:"H", bCoord:  872, gCoord: 1170, start: 1168, end: 1172, type:"crossing", id:"gate_78" },
  { axis:"H", bCoord:  872, gCoord: 1332, start: 1330, end: 1334, type:"tunnel", id:"gate_79" },
  { axis:"H", bCoord:  872, gCoord: 1537, start: 1535, end: 1539, type:"tollbridge", id:"gate_80" },
  { axis:"H", bCoord:  727, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_81" },
  { axis:"H", bCoord:  727, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_82" },
  { axis:"H", bCoord:  727, gCoord:  512, start:  510, end:  514, type:"tollbridge", id:"gate_83" },
  { axis:"H", bCoord:  727, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_84" },
  { axis:"H", bCoord:  727, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_85" },
  { axis:"H", bCoord:  727, gCoord: 1742, start: 1740, end: 1744, type:"tollbridge", id:"gate_86" },
  { axis:"H", bCoord:  582, gCoord:  102, start:  100, end:  104, type:"crossing", id:"gate_87" },
  { axis:"H", bCoord:  582, gCoord:  307, start:  305, end:  309, type:"tunnel", id:"gate_88" },
  { axis:"H", bCoord:  582, gCoord:  512, start:  510, end:  514, type:"tollbridge", id:"gate_89" },
  { axis:"H", bCoord:  582, gCoord: 1332, start: 1330, end: 1334, type:"crossing", id:"gate_90" },
  { axis:"H", bCoord:  582, gCoord: 1537, start: 1535, end: 1539, type:"tunnel", id:"gate_91" },
  { axis:"H", bCoord:  582, gCoord: 1742, start: 1740, end: 1744, type:"tollbridge", id:"gate_92" },
  { axis:"H", bCoord:  437, gCoord:  307, start:  305, end:  309, type:"crossing", id:"gate_93" },
  { axis:"H", bCoord:  437, gCoord:  512, start:  510, end:  514, type:"tunnel", id:"gate_94" },
  { axis:"H", bCoord:  437, gCoord: 1332, start: 1330, end: 1334, type:"tollbridge", id:"gate_95" },
  { axis:"H", bCoord:  437, gCoord: 1537, start: 1535, end: 1539, type:"crossing", id:"gate_96" },
  { axis:"H", bCoord:  292, gCoord:  102, start:  100, end:  104, type:"tunnel", id:"gate_97" },
  { axis:"H", bCoord:  292, gCoord:  307, start:  305, end:  309, type:"tollbridge", id:"gate_98" },
  { axis:"H", bCoord:  292, gCoord:  512, start:  510, end:  514, type:"crossing", id:"gate_99" },
  { axis:"H", bCoord:  292, gCoord:  717, start:  715, end:  719, type:"tunnel", id:"gate_100" },
  { axis:"H", bCoord:  292, gCoord:  922, start:  920, end:  924, type:"tollbridge", id:"gate_101" },
  { axis:"H", bCoord:  292, gCoord: 1127, start: 1125, end: 1129, type:"crossing", id:"gate_102" },
  { axis:"H", bCoord:  292, gCoord: 1332, start: 1330, end: 1334, type:"tunnel", id:"gate_103" },
  { axis:"H", bCoord:  292, gCoord: 1537, start: 1535, end: 1539, type:"tollbridge", id:"gate_104" },
  { axis:"H", bCoord:  292, gCoord: 1742, start: 1740, end: 1744, type:"crossing", id:"gate_105" },
  { axis:"H", bCoord:  147, gCoord:  102, start:  100, end:  104, type:"tunnel", id:"gate_106" },
  { axis:"H", bCoord:  147, gCoord:  307, start:  305, end:  309, type:"tollbridge", id:"gate_107" },
  { axis:"H", bCoord:  147, gCoord:  512, start:  510, end:  514, type:"crossing", id:"gate_108" },
  { axis:"H", bCoord:  147, gCoord:  717, start:  715, end:  719, type:"tunnel", id:"gate_109" },
  { axis:"H", bCoord:  147, gCoord:  922, start:  920, end:  924, type:"tollbridge", id:"gate_110" },
  { axis:"H", bCoord:  147, gCoord: 1127, start: 1125, end: 1129, type:"crossing", id:"gate_111" },
  { axis:"H", bCoord:  147, gCoord: 1332, start: 1330, end: 1334, type:"tunnel", id:"gate_112" },
  { axis:"H", bCoord:  147, gCoord: 1537, start: 1535, end: 1539, type:"tollbridge", id:"gate_113" },
  { axis:"H", bCoord:  147, gCoord: 1742, start: 1740, end: 1744, type:"crossing", id:"gate_114" },
  // L-shape vertical gates
  { axis:"V", bCoord:  615, gCoord:  810, start:  808, end:  812, type:"tunnel", id:"gate_115" },
  { axis:"V", bCoord: 1230, gCoord:  810, start:  808, end:  812, type:"tollbridge", id:"gate_116" },
  { axis:"V", bCoord: 1230, gCoord:  810, start:  808, end:  812, type:"crossing", id:"gate_117" },
  { axis:"V", bCoord:  615, gCoord:  543, start:  541, end:  545, type:"tunnel", id:"gate_118" },
  { axis:"V", bCoord:  923, gCoord:  798, start:  796, end:  800, type:"tollbridge", id:"gate_119" },
  { axis:"V", bCoord:  923, gCoord:  798, start:  796, end:  800, type:"crossing", id:"gate_120" },
  // L-shape horizontal gates
  { axis:"H", bCoord:  872, gCoord:  675, start:  673, end:  677, type:"tunnel", id:"gate_121" },
  { axis:"H", bCoord:  872, gCoord: 1170, start: 1168, end: 1172, type:"tollbridge", id:"gate_122" },
  { axis:"H", bCoord:  437, gCoord: 1170, start: 1168, end: 1172, type:"crossing", id:"gate_123" },
  { axis:"H", bCoord:  437, gCoord:  675, start:  673, end:  677, type:"tunnel", id:"gate_124" },
  { axis:"H", bCoord:  727, gCoord:  870, start:  868, end:  872, type:"tollbridge", id:"gate_125" },
  { axis:"H", bCoord:  727, gCoord:  975, start:  973, end:  977, type:"crossing", id:"gate_126" },
  { axis:"H", bCoord:  582, gCoord:  870, start:  868, end:  872, type:"tunnel", id:"gate_127" },
  { axis:"H", bCoord:  582, gCoord:  975, start:  973, end:  977, type:"tollbridge", id:"gate_128" },
  { axis:"H", bCoord:  654, gCoord:  718, start:  716, end:  720, type:"crossing", id:"gate_129" },
  { axis:"H", bCoord:  654, gCoord: 1127, start: 1125, end: 1129, type:"tunnel", id:"gate_130" },
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

  postMessage({ type:"progress", pct:82, label:"Pre-computing roads..." });

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
  for (const {x, y, id, type, axis} of gateA) {
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
      cx: x, cy: y, side: 'A', type, axis,
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
  for (const {x, y, id, type, axis} of gateB) {
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
      cx: x, cy: y, side: 'B', type, axis,
      defCmd: {
        n: `${typeName} Gate B Defender`,
        icon: type==='crossing'?'🌊':type==='tollbridge'?'⌒':'🪨',
        cls:'defender', faction:null, rarity:'veteran',
        lvl: GATE_CMD_LVL, troops: GATE_GARRISON,
        atk: 120*GATE_CMD_LVL, spd: 40+GATE_CMD_LVL*2,
      },
    };
  }

  postMessage({ type:"progress", pct:85, label:"Placing keeps..." });

  // ── P10–P13: stamp 2×2 structures ────────────────────────────────────────────
  // Each tile that rolled P10-P13 becomes the top-left of a 2×2 footprint.
  // Primary (top-left): F_KEEP. Other 3 cells: F_KEEPPART pointing to primary.
  // Skip if any of the 4 cells is already occupied by a keep/HQ/gate/border.
  const P10_SIEGE = { 10:8000, 11:10000, 12:14000, 13:20000 };
  const keepMeta = {};

  // Merge gate metadata from border painting (happened earlier)
  Object.assign(keepMeta, gateMeta);

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
  
  // Parse gate metadata to find which gates belong to which regions
  for (const key in gateMeta) {
    const gate = gateMeta[key];
    const [x, y] = key.split(',').map(Number);
    
    // Find which region this gate belongs to by checking REGION_MAP
    const idx = y * COLS + x;
    const regionID = REGION_MAP[idx];
    if (!regionID) continue;
    
    const regionKey = REGION_IDX_TO_KEY[regionID];
    if (!regionKey) continue;
    
    if (!gatesPerRegion[regionKey]) {
      gatesPerRegion[regionKey] = [];
    }
    gatesPerRegion[regionKey].push({ x, y });
  }
  
  // Also collect gate positions from gateA and gateB arrays
  for (const gate of gateA) {
    const idx = gate.y * COLS + gate.x;
    const regionID = REGION_MAP[idx];
    if (!regionID) continue;
    
    const regionKey = REGION_IDX_TO_KEY[regionID];
    if (!regionKey) continue;
    
    if (!gatesPerRegion[regionKey]) {
      gatesPerRegion[regionKey] = [];
    }
    gatesPerRegion[regionKey].push({ x: gate.x, y: gate.y });
  }
  
  for (const gate of gateB) {
    const idx = gate.y * COLS + gate.x;
    const regionID = REGION_MAP[idx];
    if (!regionID) continue;
    
    const regionKey = REGION_IDX_TO_KEY[regionID];
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
  
  console.log(`[MapGen] Generated ${ROAD_SEGMENTS.length} road segments`);
  console.log(`[MapGen] Regions with gates:`, Object.keys(gatesPerRegion).length);
  
  // Stamp roads into the map
  const stampRoad = (c, r) => {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    const idx = r * COLS + c;
    const fl  = flagArr[idx];
    if (fl & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART|F_GATE|F_BORDER)) return;
    terrainArr[idx]  = TERRAIN_ENC.road;  // Use road terrain, not hellfire
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
