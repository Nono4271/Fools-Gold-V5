// ── Map Generation Web Worker ─────────────────────────────────────────────────
// Communicates via postMessage:
//   incoming: { facKey }
//   outgoing: { type:'progress', pct, label }
//             { type:'done', buffers, meta, spawnKeys, aiHqMap, playerSpawn }  ← transferable, zero-copy

const COLS = 1400, ROWS = 1000;
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
  { pl:1,  w:226400 },
  { pl:2,  w:230000 },
  { pl:3,  w:210000 },
  { pl:4,  w:210000 },
  { pl:5,  w:170000 },
  { pl:6,  w:150000 },
  { pl:7,  w:100000 },
  { pl:8,  w: 48000 },
  { pl:9,  w: 32000 },
  { pl:10, w:  9200 },
  { pl:11, w:  6000 },
  { pl:12, w:  4800 },
  { pl:13, w:  3600 },
];
// Weights sum exactly to 1,400,000 (= COLS × ROWS) so expected count = weight for each level.
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
const OWNER_ENC   = { player:1, ai:2, pirates:3, orcs:4, bountyhunters:5, dragons:6, holyknights:7, nightcreatures:8 };
const OWNER_DEC   = [null,"player","ai","pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"];

const F_KEEP     = 1<<1;
const F_KEEPPART = 1<<2;
const F_HQ       = 1<<3;
const F_HQPART   = 1<<4;
const F_WIN      = 1<<5;
const F_DEFEATED = 1<<6;
const F_GATE     = 1<<7;  // crossing/tunnel/tollbridge gate tile (passable border)
const F_BORDER   = 1<<8;  // border terrain tile (impassable, not a gate)
const F_PGGATE   = 1<<9;  // peninsula gate — only attackable by homeFaction

// ── Region list — v12 coordinates, 1400x1000 design space ────────────────────
const REGION_LIST = [
  // Holy Grail
  { key:"holyGrail",       name:"Holy Grail",          layer:"ring",     keepName:"The Holy Grail",            cx: 788, cy: 407 },
  // Pirates
  { key:"saltmere",        name:"Saltmere",            layer:"start",    keepName:"Saltmere Keep",             cx: 229, cy: 141, factions:["pirates"] },
  { key:"plunderMaw",      name:"The Plunder Maw",     layer:"farm",     keepName:"The Plunder Maw Keep",      cx: 215, cy:  42, factions:["pirates"] },
  { key:"brineHollow",     name:"Brine Hollow",        layer:"farm",     keepName:"Brine Hollow Keep",         cx: 427, cy: 141, factions:["pirates"] },
  { key:"deadAnchor",      name:"Dead Anchor",         layer:"farm",     keepName:"Dead Anchor Keep",          cx: 229, cy: 274, factions:["pirates"] },
  // Night Creatures
  { key:"shadowmere",      name:"Shadowmere",          layer:"start",    keepName:"Shadowmere Keep",           cx:1173, cy: 274, factions:["nightcreatures"] },
  { key:"theShroud",       name:"The Shroud",          layer:"farm",     keepName:"The Shroud Keep",           cx:1334, cy: 288, factions:["nightcreatures"] },
  { key:"crimsonVeil",     name:"Crimson Veil",        layer:"farm",     keepName:"Crimson Veil Keep",         cx: 975, cy: 141, factions:["nightcreatures"] },
  { key:"paleCourt",       name:"The Pale Court",      layer:"farm",     keepName:"The Pale Court Keep",       cx:1173, cy: 141, factions:["nightcreatures"] },
  { key:"duskHollow",      name:"Dusk Hollow",         layer:"farm",     keepName:"Dusk Hollow Keep",          cx: 975, cy: 274, factions:["nightcreatures"] },
  { key:"bloodfen",        name:"Bloodfen",            layer:"farm",     keepName:"Bloodfen Keep",             cx:1173, cy: 407, factions:["nightcreatures"] },
  // Dragons
  { key:"emberpeak",       name:"Emberpeak",           layer:"start",    keepName:"Emberpeak Keep",            cx: 229, cy: 407, factions:["dragons"] },
  { key:"smolderingMaw",   name:"Smoldering Maw",      layer:"farm",     keepName:"Smoldering Maw Keep",       cx:  55, cy: 437, factions:["dragons"] },
  { key:"ashcrag",         name:"Ashcrag",             layer:"farm",     keepName:"Ashcrag Keep",              cx: 460, cy: 375, factions:["dragons"] },
  { key:"cinderPass",      name:"Cinder Pass",         layer:"farm",     keepName:"Cinder Pass Keep",          cx: 390, cy: 432, factions:["dragons"] },
  { key:"scorchveil",      name:"Scorchveil",          layer:"farm",     keepName:"Scorchveil Keep",           cx: 229, cy: 540, factions:["dragons"] },
  // Orcs
  { key:"grimhold",        name:"Grimhold",            layer:"start",    keepName:"Grimhold Keep",             cx:1173, cy: 540, factions:["orcs"] },
  { key:"theWarground",    name:"The Warground",       layer:"farm",     keepName:"The Warground Keep",        cx:1334, cy: 563, factions:["orcs"] },
  { key:"warbend",         name:"Warbend",             layer:"farm",     keepName:"Warbend Keep",              cx: 975, cy: 407, factions:["orcs"] },
  { key:"bloodfield",      name:"Bloodfield",          layer:"farm",     keepName:"Bloodfield Keep",           cx: 975, cy: 540, factions:["orcs"] },
  { key:"bonepile",        name:"Bonepile",            layer:"farm",     keepName:"Bonepile Keep",             cx:1173, cy: 673, factions:["orcs"] },
  // Wizards (Bounty Hunters)
  { key:"ashenveil",       name:"Ashenveil",           layer:"start",    keepName:"Ashenveil Keep",            cx: 613, cy: 794, factions:["bountyhunters"] },
  { key:"arcaneDeep",      name:"The Arcane Deep",     layer:"farm",     keepName:"The Arcane Deep Keep",      cx: 628, cy: 910, factions:["bountyhunters"] },
  { key:"hexmire",         name:"Hexmire",             layer:"farm",     keepName:"Hexmire Keep",              cx: 427, cy: 673, factions:["bountyhunters"] },
  { key:"ruinwatch",       name:"Ruinwatch",           layer:"farm",     keepName:"Ruinwatch Keep",            cx: 613, cy: 673, factions:["bountyhunters"] },
  { key:"ashenFen",        name:"The Ashen Fen",       layer:"farm",     keepName:"The Ashen Fen Keep",        cx: 229, cy: 794, factions:["bountyhunters"] },
  { key:"cursemoor",       name:"Cursemoor",           layer:"farm",     keepName:"Cursemoor Keep",            cx: 427, cy: 794, factions:["bountyhunters"] },
  // Holy Knights
  { key:"sanctumhold",     name:"Sanctumhold",         layer:"start",    keepName:"Sanctumhold Keep",          cx: 788, cy: 794, factions:["holyknights"] },
  { key:"blessedShore",    name:"The Blessed Shore",   layer:"farm",     keepName:"The Blessed Shore Keep",    cx: 795, cy: 910, factions:["holyknights"] },
  { key:"hallowedGround",  name:"Hallowed Ground",     layer:"farm",     keepName:"Hallowed Ground Keep",      cx: 788, cy: 540, factions:["holyknights"] },
  { key:"pilgrimsRest",    name:"Pilgrim's Rest",      layer:"farm",     keepName:"Pilgrim's Rest Keep",       cx: 975, cy: 673, factions:["holyknights"] },
  { key:"sacredVale",      name:"Sacred Vale",         layer:"farm",     keepName:"Sacred Vale Keep",          cx: 975, cy: 794, factions:["holyknights"] },
  { key:"dawnmarch",       name:"Dawnmarch",           layer:"farm",     keepName:"Dawnmarch Keep",            cx:1173, cy: 794, factions:["holyknights"] },
  // Neutral / Conflict
  { key:"gallowsReach",    name:"Gallows Reach",       layer:"conflict", keepName:"Gallows Reach Keep",        cx: 613, cy: 141 },
  { key:"greyExpanse",     name:"The Grey Expanse",    layer:"conflict", keepName:"The Grey Expanse Keep",     cx: 788, cy: 141 },
  { key:"mistfall",        name:"Mistfall",            layer:"conflict", keepName:"Mistfall Keep",             cx: 460, cy: 242 },
  { key:"thornveil",       name:"Thornveil",           layer:"conflict", keepName:"Thornveil Keep",            cx: 390, cy: 308 },
  { key:"wanderingWastes", name:"Wandering Wastes",    layer:"conflict", keepName:"Wandering Wastes Keep",     cx: 613, cy: 274 },
  { key:"dreadmoor",       name:"Dreadmoor",           layer:"conflict", keepName:"Dreadmoor Keep",            cx: 788, cy: 274 },
  { key:"theHollow",       name:"The Hollow",          layer:"conflict", keepName:"The Hollow Keep",           cx: 613, cy: 407 },
  { key:"grimward",        name:"Grimward",            layer:"conflict", keepName:"Grimward Keep",             cx: 427, cy: 540 },
  { key:"shatteredPass",   name:"Shattered Pass",      layer:"conflict", keepName:"Shattered Pass Keep",       cx: 648, cy: 510 },
  { key:"sunkenRoad",      name:"Sunken Road",         layer:"conflict", keepName:"Sunken Road Keep",          cx: 580, cy: 578 },
  { key:"paleMarch",       name:"The Pale March",      layer:"conflict", keepName:"The Pale March Keep",       cx: 788, cy: 673 },
  { key:"forsakenMarch",   name:"Forsaken March",      layer:"conflict", keepName:"Forsaken March Keep",       cx: 229, cy: 673 },
];

const FACTION_REGIONS = {
  pirates:        { start:"saltmere",    farm:"brineHollow"   },
  nightcreatures: { start:"shadowmere",  farm:"crimsonVeil"   },
  dragons:        { start:"emberpeak",   farm:"scorchveil"    },
  orcs:           { start:"grimhold",    farm:"bloodfield"    },
  bountyhunters:  { start:"ashenveil",   farm:"ruinwatch"     },
  holyknights:    { start:"sanctumhold", farm:"pilgrimsRest"  },
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
const GATE_GARRISON = 2100;
const GATE_SIEGE    = 200000;
const GATE_CMD_LVL  = 20;

const CROSSINGS = [
  // ── HORIZONTAL borders (y-strips) ──
  {axis:'H',bCoord:115,gCoord:1314, type:'crossing', id:'h1314_115'},
  {axis:'H',bCoord:129,gCoord:484, type:'crossing', id:'h484_129'},
  {axis:'H',bCoord:136,gCoord:313, type:'crossing', id:'h313_136'},
  {axis:'H',bCoord:146,gCoord:1782, type:'crossing', id:'h1782_146'},
  {axis:'H',bCoord:149,gCoord:900, type:'crossing', id:'h900_149'},
  {axis:'H',bCoord:149,gCoord:1530, type:'crossing', id:'h1530_149'},
  {axis:'H',bCoord:153,gCoord:68, type:'crossing', id:'h68_153'},
  {axis:'H',bCoord:171,gCoord:693, type:'crossing', id:'h693_171'},
  {axis:'H',bCoord:268,gCoord:158, type:'crossing', id:'h158_268'},
  {axis:'H',bCoord:278,gCoord:305, type:'crossing', id:'h305_278'},
  {axis:'H',bCoord:296,gCoord:900, type:'tollbridge', id:'h900_296'},
  {axis:'H',bCoord:308,gCoord:1561, type:'crossing', id:'h1561_308'},
  {axis:'H',bCoord:309,gCoord:1789, type:'crossing', id:'h1789_309'},
  {axis:'H',bCoord:318,gCoord:687, type:'tollbridge', id:'h687_318'},
  {axis:'H',bCoord:427,gCoord:479, type:'crossing', id:'h479_427'},
  {axis:'H',bCoord:432,gCoord:1312, type:'crossing', id:'h1312_432'},
  {axis:'H',bCoord:432,gCoord:1428, type:'crossing', id:'h1428_432'},
  {axis:'H',bCoord:437,gCoord:1140, type:'tollbridge', id:'h1140_437'},
  {axis:'H',bCoord:437,gCoord:1763, type:'crossing', id:'h1763_437'},
  {axis:'H',bCoord:439,gCoord:922, type:'tollbridge', id:'h922_439'},
  {axis:'H',bCoord:445,gCoord:677, type:'tollbridge', id:'h677_445'},
  {axis:'H',bCoord:448,gCoord:54, type:'crossing', id:'h54_448'},
  {axis:'H',bCoord:468,gCoord:1546, type:'crossing', id:'h1546_468'},
  {axis:'H',bCoord:547,gCoord:509, type:'crossing', id:'h509_547'},
  {axis:'H',bCoord:552,gCoord:722, type:'tollbridge', id:'h722_552'},
  {axis:'H',bCoord:566,gCoord:925, type:'tunnel', id:'h925_566'},
  {axis:'H',bCoord:571,gCoord:1307, type:'tollbridge', id:'h1307_571'},
  {axis:'H',bCoord:571,gCoord:1786, type:'crossing', id:'h1786_571'},
  {axis:'H',bCoord:576,gCoord:293, type:'crossing', id:'h293_576'},
  {axis:'H',bCoord:579,gCoord:394, type:'crossing', id:'h394_579'},
  {axis:'H',bCoord:587,gCoord:1136, type:'tollbridge', id:'h1136_587'},
  {axis:'H',bCoord:587,gCoord:1517, type:'crossing', id:'h1517_587'},
  {axis:'H',bCoord:598,gCoord:57, type:'crossing', id:'h57_598'},
  {axis:'H',bCoord:660,gCoord:184, type:'crossing', id:'h184_660'},
  {axis:'H',bCoord:706,gCoord:537, type:'tollbridge', id:'h537_706'},
  {axis:'H',bCoord:706,gCoord:724, type:'tollbridge', id:'h724_706'},
  {axis:'H',bCoord:715,gCoord:1519, type:'crossing', id:'h1519_715'},
  {axis:'H',bCoord:716,gCoord:1334, type:'crossing', id:'h1334_716'},
  {axis:'H',bCoord:717,gCoord:634, type:'tollbridge', id:'h634_717'},
  {axis:'H',bCoord:719,gCoord:916, type:'tunnel', id:'h916_719'},
  {axis:'H',bCoord:723,gCoord:1756, type:'crossing', id:'h1756_723'},
  {axis:'H',bCoord:740,gCoord:91, type:'crossing', id:'h91_740'},
  {axis:'H',bCoord:744,gCoord:1212, type:'tollbridge', id:'h1212_744'},
  {axis:'H',bCoord:748,gCoord:310, type:'crossing', id:'h310_748'},
  {axis:'H',bCoord:812,gCoord:1727, type:'crossing', id:'h1727_812'},
  {axis:'H',bCoord:844,gCoord:1108, type:'tollbridge', id:'h1108_844'},
  {axis:'H',bCoord:849,gCoord:1430, type:'crossing', id:'h1430_849'},
  {axis:'H',bCoord:862,gCoord:100, type:'crossing', id:'h100_862'},
  {axis:'H',bCoord:878,gCoord:780, type:'tollbridge', id:'h780_878'},
  {axis:'H',bCoord:880,gCoord:1029, type:'tollbridge', id:'h1029_880'},
  {axis:'H',bCoord:881,gCoord:912, type:'tollbridge', id:'h912_881'},
  {axis:'H',bCoord:885,gCoord:1547, type:'crossing', id:'h1547_885'},
  {axis:'H',bCoord:990,gCoord:1173, type:'crossing', id:'h1173_990'},
  {axis:'H',bCoord:995,gCoord:716, type:'crossing', id:'h716_995'},
  {axis:'H',bCoord:998,gCoord:474, type:'crossing', id:'h474_998'},
  {axis:'H',bCoord:1000,gCoord:1738, type:'crossing', id:'h1738_1000'},
  {axis:'H',bCoord:1006,gCoord:296, type:'crossing', id:'h296_1006'},
  {axis:'H',bCoord:1022,gCoord:1362, type:'crossing', id:'h1362_1022'},
  {axis:'H',bCoord:1028,gCoord:1456, type:'crossing', id:'h1456_1028'},
  {axis:'H',bCoord:1032,gCoord:928, type:'tollbridge', id:'h928_1032'},
  {axis:'H',bCoord:1035,gCoord:154, type:'crossing', id:'h154_1035'},
  {axis:'H',bCoord:1044,gCoord:1561, type:'crossing', id:'h1561_1044'},
  {axis:'H',bCoord:1079,gCoord:1022, type:'crossing', id:'h1022_1079'},
  {axis:'H',bCoord:1125,gCoord:535, type:'crossing', id:'h535_1125'},
  {axis:'H',bCoord:1134,gCoord:685, type:'crossing', id:'h685_1134'},
  {axis:'H',bCoord:1148,gCoord:302, type:'crossing', id:'h302_1148'},
  {axis:'H',bCoord:1150,gCoord:909, type:'crossing', id:'h909_1150'},
  {axis:'H',bCoord:1151,gCoord:1141, type:'crossing', id:'h1141_1151'},
  {axis:'H',bCoord:1152,gCoord:63, type:'crossing', id:'h63_1152'},
  {axis:'H',bCoord:1166,gCoord:1788, type:'crossing', id:'h1788_1166'},
  {axis:'H',bCoord:1173,gCoord:1563, type:'crossing', id:'h1563_1173'},
  {axis:'H',bCoord:1182,gCoord:1294, type:'crossing', id:'h1294_1182'},
  // ── VERTICAL borders (x-strips) ──
  {axis:'V',bCoord:190,gCoord:520, type:'crossing', id:'v520_190'},
  {axis:'V',bCoord:199,gCoord:960, type:'crossing', id:'v960_199'},
  {axis:'V',bCoord:199,gCoord:1118, type:'crossing', id:'v1118_199'},
  {axis:'V',bCoord:200,gCoord:1244, type:'crossing', id:'v1244_200'},
  {axis:'V',bCoord:206,gCoord:42, type:'crossing', id:'v42_206'},
  {axis:'V',bCoord:207,gCoord:796, type:'crossing', id:'v796_207'},
  {axis:'V',bCoord:208,gCoord:207, type:'crossing', id:'v207_208'},
  {axis:'V',bCoord:209,gCoord:137, type:'crossing', id:'v137_209'},
  {axis:'V',bCoord:209,gCoord:1074, type:'crossing', id:'v1074_209'},
  {axis:'V',bCoord:210,gCoord:631, type:'crossing', id:'v631_210'},
  {axis:'V',bCoord:210,gCoord:682, type:'crossing', id:'v682_210'},
  {axis:'V',bCoord:211,gCoord:339, type:'crossing', id:'v339_211'},
  {axis:'V',bCoord:214,gCoord:278, type:'crossing', id:'v278_214'},
  {axis:'V',bCoord:217,gCoord:1036, type:'crossing', id:'v1036_217'},
  {axis:'V',bCoord:358,gCoord:488, type:'crossing', id:'v488_358'},
  {axis:'V',bCoord:382,gCoord:886, type:'crossing', id:'v886_382'},
  {axis:'V',bCoord:384,gCoord:26, type:'crossing', id:'v26_384'},
  {axis:'V',bCoord:392,gCoord:1082, type:'crossing', id:'v1082_392'},
  {axis:'V',bCoord:399,gCoord:1246, type:'crossing', id:'v1246_399'},
  {axis:'V',bCoord:400,gCoord:344, type:'crossing', id:'v344_400'},
  {axis:'V',bCoord:402,gCoord:209, type:'crossing', id:'v209_402'},
  {axis:'V',bCoord:430,gCoord:752, type:'crossing', id:'v752_430'},
  {axis:'V',bCoord:444,gCoord:653, type:'crossing', id:'v653_444'},
  {axis:'V',bCoord:569,gCoord:357, type:'crossing', id:'v357_569'},
  {axis:'V',bCoord:569,gCoord:463, type:'tollbridge', id:'v463_569'},
  {axis:'V',bCoord:579,gCoord:60, type:'crossing', id:'v60_579'},
  {axis:'V',bCoord:580,gCoord:1056, type:'crossing', id:'v1056_580'},
  {axis:'V',bCoord:582,gCoord:165, type:'crossing', id:'v165_582'},
  {axis:'V',bCoord:595,gCoord:1164, type:'crossing', id:'v1164_595'},
  {axis:'V',bCoord:597,gCoord:246, type:'crossing', id:'v246_597'},
  {axis:'V',bCoord:604,gCoord:976, type:'crossing', id:'v976_604'},
  {axis:'V',bCoord:605,gCoord:522, type:'tollbridge', id:'v522_605'},
  {axis:'V',bCoord:624,gCoord:625, type:'tollbridge', id:'v625_624'},
  {axis:'V',bCoord:640,gCoord:909, type:'tollbridge', id:'v909_640'},
  {axis:'V',bCoord:650,gCoord:807, type:'tollbridge', id:'v807_650'},
  {axis:'V',bCoord:777,gCoord:370, type:'tollbridge', id:'v370_777'},
  {axis:'V',bCoord:791,gCoord:1109, type:'crossing', id:'v1109_791'},
  {axis:'V',bCoord:792,gCoord:325, type:'tollbridge', id:'v325_792'},
  {axis:'V',bCoord:795,gCoord:125, type:'crossing', id:'v125_795'},
  {axis:'V',bCoord:799,gCoord:54, type:'crossing', id:'v54_799'},
  {axis:'V',bCoord:799,gCoord:216, type:'crossing', id:'v216_799'},
  {axis:'V',bCoord:803,gCoord:1188, type:'crossing', id:'v1188_803'},
  {axis:'V',bCoord:806,gCoord:441, type:'tollbridge', id:'v441_806'},
  {axis:'V',bCoord:815,gCoord:621, type:'tunnel', id:'v621_815'},
  {axis:'V',bCoord:820,gCoord:1272, type:'crossing', id:'v1272_820'},
  {axis:'V',bCoord:822,gCoord:701, type:'tunnel', id:'v701_822'},
  {axis:'V',bCoord:827,gCoord:1016, type:'tollbridge', id:'v1016_827'},
  {axis:'V',bCoord:830,gCoord:549, type:'tunnel', id:'v549_830'},
  {axis:'V',bCoord:835,gCoord:516, type:'tunnel', id:'v516_835'},
  {axis:'V',bCoord:1000,gCoord:340, type:'tollbridge', id:'v340_1000'},
  {axis:'V',bCoord:1003,gCoord:793, type:'tunnel', id:'v793_1003'},
  {axis:'V',bCoord:1006,gCoord:212, type:'crossing', id:'v212_1006'},
  {axis:'V',bCoord:1011,gCoord:61, type:'crossing', id:'v61_1011'},
  {axis:'V',bCoord:1013,gCoord:268, type:'tollbridge', id:'v268_1013'},
  {axis:'V',bCoord:1021,gCoord:675, type:'tunnel', id:'v675_1021'},
  {axis:'V',bCoord:1022,gCoord:412, type:'tollbridge', id:'v412_1022'},
  {axis:'V',bCoord:1028,gCoord:1233, type:'crossing', id:'v1233_1028'},
  {axis:'V',bCoord:1034,gCoord:510, type:'tunnel', id:'v510_1034'},
  {axis:'V',bCoord:1037,gCoord:609, type:'tunnel', id:'v609_1037'},
  {axis:'V',bCoord:1047,gCoord:1086, type:'crossing', id:'v1086_1047'},
  {axis:'V',bCoord:1055,gCoord:942, type:'tollbridge', id:'v942_1055'},
  {axis:'V',bCoord:1056,gCoord:1038, type:'crossing', id:'v1038_1056'},
  {axis:'V',bCoord:1118,gCoord:132, type:'crossing', id:'v132_1118'},
  {axis:'V',bCoord:1203,gCoord:11, type:'crossing', id:'v11_1203'},
  {axis:'V',bCoord:1222,gCoord:858, type:'tollbridge', id:'v858_1222'},
  {axis:'V',bCoord:1230,gCoord:71, type:'crossing', id:'v71_1230'},
  {axis:'V',bCoord:1237,gCoord:1244, type:'crossing', id:'v1244_1237'},
  {axis:'V',bCoord:1244,gCoord:206, type:'crossing', id:'v206_1244'},
  {axis:'V',bCoord:1250,gCoord:651, type:'tollbridge', id:'v651_1250'},
  {axis:'V',bCoord:1259,gCoord:1099, type:'crossing', id:'v1099_1259'},
  {axis:'V',bCoord:1274,gCoord:988, type:'crossing', id:'v988_1274'},
  {axis:'V',bCoord:1394,gCoord:502, type:'crossing', id:'v502_1394'},
  {axis:'V',bCoord:1424,gCoord:225, type:'crossing', id:'v225_1424'},
  {axis:'V',bCoord:1436,gCoord:1073, type:'crossing', id:'v1073_1436'},
  {axis:'V',bCoord:1453,gCoord:34, type:'crossing', id:'v34_1453'},
  {axis:'V',bCoord:1464,gCoord:1150, type:'crossing', id:'v1150_1464'},
  {axis:'V',bCoord:1465,gCoord:389, type:'crossing', id:'v389_1465'},
  {axis:'V',bCoord:1482,gCoord:956, type:'crossing', id:'v956_1482'},
  {axis:'V',bCoord:1482,gCoord:1226, type:'crossing', id:'v1226_1482'},
  {axis:'V',bCoord:1622,gCoord:80, type:'crossing', id:'v80_1622'},
  {axis:'V',bCoord:1630,gCoord:174, type:'crossing', id:'v174_1630'},
  {axis:'V',bCoord:1635,gCoord:812, type:'crossing', id:'v812_1635'},
  {axis:'V',bCoord:1635,gCoord:917, type:'crossing', id:'v917_1635'},
  {axis:'V',bCoord:1641,gCoord:538, type:'crossing', id:'v538_1641'},
  {axis:'V',bCoord:1641,gCoord:1253, type:'crossing', id:'v1253_1641'},
  {axis:'V',bCoord:1645,gCoord:221, type:'crossing', id:'v221_1645'},
  {axis:'V',bCoord:1648,gCoord:638, type:'crossing', id:'v638_1648'},
  {axis:'V',bCoord:1648,gCoord:730, type:'crossing', id:'v730_1648'},
  {axis:'V',bCoord:1649,gCoord:556, type:'crossing', id:'v556_1649'},
  {axis:'V',bCoord:1652,gCoord:1140, type:'crossing', id:'v1140_1652'},
  {axis:'V',bCoord:1656,gCoord:756, type:'crossing', id:'v756_1656'},
  {axis:'V',bCoord:1660,gCoord:1100, type:'crossing', id:'v1100_1660'},
  {axis:'V',bCoord:1665,gCoord:481, type:'crossing', id:'v481_1665'},
  {axis:'V',bCoord:1668,gCoord:1051, type:'crossing', id:'v1051_1668'},
  {axis:'V',bCoord:1673,gCoord:285, type:'crossing', id:'v285_1673'},
  {axis:'V',bCoord:1696,gCoord:372, type:'crossing', id:'v372_1696'},
];
  {axis:'H',bCoord:878,gCoord:1027, type:'tollbridge', id:'h1027_878'},
  {axis:'H',bCoord:878,gCoord:1569, type:'crossing', id:'h1569_878'},
  {axis:'H',bCoord:879,gCoord:939, type:'tollbridge', id:'h939_879'},
  {axis:'H',bCoord:881,gCoord:752, type:'tollbridge', id:'h752_881'},
  {axis:'H',bCoord:981,gCoord:376, type:'crossing', id:'h376_981'},
  {axis:'H',bCoord:991,gCoord:1170, type:'crossing', id:'h1170_991'},
  {axis:'H',bCoord:1000,gCoord:487, type:'crossing', id:'h487_1000'},
  {axis:'H',bCoord:1004,gCoord:728, type:'crossing', id:'h728_1004'},
  {axis:'H',bCoord:1006,gCoord:294, type:'crossing', id:'h294_1006'},
  {axis:'H',bCoord:1007,gCoord:1720, type:'crossing', id:'h1720_1007'},
  {axis:'H',bCoord:1016,gCoord:1343, type:'crossing', id:'h1343_1016'},
  {axis:'H',bCoord:1033,gCoord:1450, type:'crossing', id:'h1450_1033'},
  {axis:'H',bCoord:1039,gCoord:174, type:'crossing', id:'h174_1039'},
  {axis:'H',bCoord:1044,gCoord:946, type:'crossing', id:'h946_1044'},
  {axis:'H',bCoord:1052,gCoord:1583, type:'crossing', id:'h1583_1052'},
  {axis:'H',bCoord:1078,gCoord:1027, type:'crossing', id:'h1027_1078'},
  {axis:'H',bCoord:1132,gCoord:522, type:'crossing', id:'h522_1132'},
  {axis:'H',bCoord:1140,gCoord:707, type:'crossing', id:'h707_1140'},
  {axis:'H',bCoord:1146,gCoord:100, type:'crossing', id:'h100_1146'},
  {axis:'H',bCoord:1151,gCoord:309, type:'crossing', id:'h309_1151'},
  {axis:'H',bCoord:1161,gCoord:1158, type:'crossing', id:'h1158_1161'},
  {axis:'H',bCoord:1163,gCoord:1778, type:'crossing', id:'h1778_1163'},
  {axis:'H',bCoord:1168,gCoord:884, type:'crossing', id:'h884_1168'},
  {axis:'H',bCoord:1176,gCoord:1544, type:'crossing', id:'h1544_1176'},
  {axis:'H',bCoord:1191,gCoord:1274, type:'crossing', id:'h1274_1191'},
  // ── VERTICAL borders (x-strips) ──
  {axis:'V',bCoord:185,gCoord:508, type:'crossing', id:'v508_185'},
  {axis:'V',bCoord:196,gCoord:1122, type:'crossing', id:'v1122_196'},
  {axis:'V',bCoord:196,gCoord:1205, type:'crossing', id:'v1205_196'},
  {axis:'V',bCoord:204,gCoord:976, type:'crossing', id:'v976_204'},
  {axis:'V',bCoord:207,gCoord:202, type:'crossing', id:'v202_207'},
  {axis:'V',bCoord:208,gCoord:70, type:'crossing', id:'v70_208'},
  {axis:'V',bCoord:208,gCoord:634, type:'crossing', id:'v634_208'},
  {axis:'V',bCoord:208,gCoord:1083, type:'crossing', id:'v1083_208'},
  {axis:'V',bCoord:210,gCoord:136, type:'crossing', id:'v136_210'},
  {axis:'V',bCoord:211,gCoord:776, type:'crossing', id:'v776_211'},
  {axis:'V',bCoord:212,gCoord:335, type:'crossing', id:'v335_212'},
  {axis:'V',bCoord:214,gCoord:278, type:'crossing', id:'v278_214'},
  {axis:'V',bCoord:214,gCoord:688, type:'crossing', id:'v688_214'},
  {axis:'V',bCoord:218,gCoord:1035, type:'crossing', id:'v1035_218'},
  {axis:'V',bCoord:357,gCoord:491, type:'crossing', id:'v491_357'},
  {axis:'V',bCoord:381,gCoord:928, type:'crossing', id:'v928_381'},
  {axis:'V',bCoord:388,gCoord:38, type:'crossing', id:'v38_388'},
  {axis:'V',bCoord:393,gCoord:1088, type:'crossing', id:'v1088_393'},
  {axis:'V',bCoord:399,gCoord:1247, type:'crossing', id:'v1247_399'},
  {axis:'V',bCoord:400,gCoord:334, type:'crossing', id:'v334_400'},
  {axis:'V',bCoord:402,gCoord:218, type:'crossing', id:'v218_402'},
  {axis:'V',bCoord:407,gCoord:1192, type:'crossing', id:'v1192_407'},
  {axis:'V',bCoord:409,gCoord:140, type:'crossing', id:'v140_409'},
  {axis:'V',bCoord:428,gCoord:754, type:'crossing', id:'v754_428'},
  {axis:'V',bCoord:447,gCoord:666, type:'crossing', id:'v666_447'},
  {axis:'V',bCoord:569,gCoord:464, type:'tollbridge', id:'v464_569'},
  {axis:'V',bCoord:571,gCoord:346, type:'crossing', id:'v346_571'},
  {axis:'V',bCoord:574,gCoord:150, type:'crossing', id:'v150_574'},
  {axis:'V',bCoord:581,gCoord:1070, type:'crossing', id:'v1070_581'},
  {axis:'V',bCoord:582,gCoord:50, type:'crossing', id:'v50_582'},
  {axis:'V',bCoord:582,gCoord:492, type:'tollbridge', id:'v492_582'},
  {axis:'V',bCoord:586,gCoord:1100, type:'crossing', id:'v1100_586'},
  {axis:'V',bCoord:595,gCoord:1159, type:'crossing', id:'v1159_595'},
  {axis:'V',bCoord:597,gCoord:248, type:'crossing', id:'v248_597'},
  {axis:'V',bCoord:600,gCoord:517, type:'tollbridge', id:'v517_600'},
  {axis:'V',bCoord:601,gCoord:981, type:'crossing', id:'v981_601'},
  {axis:'V',bCoord:624,gCoord:654, type:'tollbridge', id:'v654_624'},
  {axis:'V',bCoord:643,gCoord:906, type:'tollbridge', id:'v906_643'},
  {axis:'V',bCoord:649,gCoord:788, type:'tollbridge', id:'v788_649'},
  {axis:'V',bCoord:777,gCoord:365, type:'tollbridge', id:'v365_777'},
  {axis:'V',bCoord:790,gCoord:1121, type:'crossing', id:'v1121_790'},
  {axis:'V',bCoord:796,gCoord:123, type:'crossing', id:'v123_796'},
  {axis:'V',bCoord:798,gCoord:318, type:'tollbridge', id:'v318_798'},
  {axis:'V',bCoord:799,gCoord:1182, type:'crossing', id:'v1182_799'},
  {axis:'V',bCoord:800,gCoord:73, type:'crossing', id:'v73_800'},
  {axis:'V',bCoord:803,gCoord:241, type:'crossing', id:'v241_803'},
  {axis:'V',bCoord:811,gCoord:448, type:'tollbridge', id:'v448_811'},
  {axis:'V',bCoord:815,gCoord:622, type:'tunnel', id:'v622_815'},
  {axis:'V',bCoord:820,gCoord:1267, type:'crossing', id:'v1267_820'},
  {axis:'V',bCoord:825,gCoord:1018, type:'tollbridge', id:'v1018_825'},
  {axis:'V',bCoord:826,gCoord:706, type:'tunnel', id:'v706_826'},
  {axis:'V',bCoord:829,gCoord:549, type:'tunnel', id:'v549_829'},
  {axis:'V',bCoord:835,gCoord:521, type:'tunnel', id:'v521_835'},
  {axis:'V',bCoord:1000,gCoord:353, type:'tollbridge', id:'v353_1000'},
  {axis:'V',bCoord:1002,gCoord:205, type:'crossing', id:'v205_1002'},
  {axis:'V',bCoord:1002,gCoord:784, type:'tunnel', id:'v784_1002'},
  {axis:'V',bCoord:1006,gCoord:91, type:'crossing', id:'v91_1006'},
  {axis:'V',bCoord:1009,gCoord:274, type:'tollbridge', id:'v274_1009'},
  {axis:'V',bCoord:1016,gCoord:682, type:'tunnel', id:'v682_1016'},
  {axis:'V',bCoord:1018,gCoord:408, type:'tollbridge', id:'v408_1018'},
  {axis:'V',bCoord:1031,gCoord:1216, type:'crossing', id:'v1216_1031'},
  {axis:'V',bCoord:1034,gCoord:506, type:'tunnel', id:'v506_1034'},
  {axis:'V',bCoord:1034,gCoord:605, type:'tunnel', id:'v605_1034'},
  {axis:'V',bCoord:1048,gCoord:1088, type:'crossing', id:'v1088_1048'},
  {axis:'V',bCoord:1058,gCoord:952, type:'tollbridge', id:'v952_1058'},
  {axis:'V',bCoord:1059,gCoord:1031, type:'crossing', id:'v1031_1059'},
  {axis:'V',bCoord:1127,gCoord:123, type:'crossing', id:'v123_1127'},
  {axis:'V',bCoord:1204,gCoord:15, type:'crossing', id:'v15_1204'},
  {axis:'V',bCoord:1219,gCoord:854, type:'tollbridge', id:'v854_1219'},
  {axis:'V',bCoord:1235,gCoord:81, type:'crossing', id:'v81_1235'},
  {axis:'V',bCoord:1237,gCoord:1244, type:'crossing', id:'v1244_1237'},
  {axis:'V',bCoord:1244,gCoord:205, type:'crossing', id:'v205_1244'},
  {axis:'V',bCoord:1249,gCoord:646, type:'tollbridge', id:'v646_1249'},
  {axis:'V',bCoord:1258,gCoord:1100, type:'crossing', id:'v1100_1258'},
  {axis:'V',bCoord:1273,gCoord:986, type:'crossing', id:'v986_1273'},
  {axis:'V',bCoord:1394,gCoord:502, type:'crossing', id:'v502_1394'},
  {axis:'V',bCoord:1426,gCoord:220, type:'crossing', id:'v220_1426'},
  {axis:'V',bCoord:1436,gCoord:1074, type:'crossing', id:'v1074_1436'},
  {axis:'V',bCoord:1452,gCoord:49, type:'crossing', id:'v49_1452'},
  {axis:'V',bCoord:1452,gCoord:145, type:'crossing', id:'v145_1452'},
  {axis:'V',bCoord:1457,gCoord:1140, type:'crossing', id:'v1140_1457'},
  {axis:'V',bCoord:1466,gCoord:386, type:'crossing', id:'v386_1466'},
  {axis:'V',bCoord:1483,gCoord:952, type:'crossing', id:'v952_1483'},
  {axis:'V',bCoord:1485,gCoord:1212, type:'crossing', id:'v1212_1485'},
  {axis:'V',bCoord:1621,gCoord:85, type:'crossing', id:'v85_1621'},
  {axis:'V',bCoord:1625,gCoord:898, type:'crossing', id:'v898_1625'},
  {axis:'V',bCoord:1631,gCoord:821, type:'crossing', id:'v821_1631'},
  {axis:'V',bCoord:1634,gCoord:178, type:'crossing', id:'v178_1634'},
  {axis:'V',bCoord:1640,gCoord:1221, type:'crossing', id:'v1221_1640'},
  {axis:'V',bCoord:1641,gCoord:538, type:'crossing', id:'v538_1641'},
  {axis:'V',bCoord:1645,gCoord:218, type:'crossing', id:'v218_1645'},
  {axis:'V',bCoord:1646,gCoord:727, type:'crossing', id:'v727_1646'},
  {axis:'V',bCoord:1647,gCoord:644, type:'crossing', id:'v644_1647'},
  {axis:'V',bCoord:1648,gCoord:554, type:'crossing', id:'v554_1648'},
  {axis:'V',bCoord:1648,gCoord:1146, type:'crossing', id:'v1146_1648'},
  {axis:'V',bCoord:1656,gCoord:756, type:'crossing', id:'v756_1656'},
  {axis:'V',bCoord:1660,gCoord:1104, type:'crossing', id:'v1104_1660'},
  {axis:'V',bCoord:1668,gCoord:474, type:'crossing', id:'v474_1668'},
  {axis:'V',bCoord:1672,gCoord:1043, type:'crossing', id:'v1043_1672'},
  {axis:'V',bCoord:1677,gCoord:290, type:'crossing', id:'v290_1677'},
  {axis:'V',bCoord:1695,gCoord:385, type:'crossing', id:'v385_1695'},
];
  {axis:'H',bCoord:1149,gCoord:83, type:'crossing', id:'h83_1149'},
  {axis:'H',bCoord:1162,gCoord:1775, type:'crossing', id:'h1775_1162'},
  {axis:'H',bCoord:1163,gCoord:335, type:'crossing', id:'h335_1163'},
  {axis:'H',bCoord:1164,gCoord:1164, type:'crossing', id:'h1164_1164'},
  {axis:'H',bCoord:1170,gCoord:1581, type:'crossing', id:'h1581_1170'},
  // ── VERTICAL borders (x-strips) ──
  {axis:'V',bCoord:186,gCoord:511, type:'crossing', id:'v511_186'},
  {axis:'V',bCoord:195,gCoord:1194, type:'crossing', id:'v1194_195'},
  {axis:'V',bCoord:196,gCoord:1121, type:'crossing', id:'v1121_196'},
  {axis:'V',bCoord:206,gCoord:637, type:'crossing', id:'v637_206'},
  {axis:'V',bCoord:207,gCoord:678, type:'crossing', id:'v678_207'},
  {axis:'V',bCoord:208,gCoord:70, type:'crossing', id:'v70_208'},
  {axis:'V',bCoord:208,gCoord:216, type:'crossing', id:'v216_208'},
  {axis:'V',bCoord:210,gCoord:136, type:'crossing', id:'v136_210'},
  {axis:'V',bCoord:210,gCoord:1068, type:'crossing', id:'v1068_210'},
  {axis:'V',bCoord:213,gCoord:276, type:'crossing', id:'v276_213'},
  {axis:'V',bCoord:219,gCoord:1034, type:'crossing', id:'v1034_219'},
  {axis:'V',bCoord:392,gCoord:1082, type:'crossing', id:'v1082_392'},
  {axis:'V',bCoord:403,gCoord:191, type:'crossing', id:'v191_403'},
  {axis:'V',bCoord:408,gCoord:142, type:'crossing', id:'v142_408'},
  {axis:'V',bCoord:408,gCoord:1191, type:'crossing', id:'v1191_408'},
  {axis:'V',bCoord:445,gCoord:660, type:'crossing', id:'v660_445'},
  {axis:'V',bCoord:570,gCoord:464, type:'tollbridge', id:'v464_570'},
  {axis:'V',bCoord:574,gCoord:151, type:'crossing', id:'v151_574'},
  {axis:'V',bCoord:581,gCoord:1069, type:'crossing', id:'v1069_581'},
  {axis:'V',bCoord:582,gCoord:493, type:'tollbridge', id:'v493_582'},
  {axis:'V',bCoord:597,gCoord:246, type:'crossing', id:'v246_597'},
  {axis:'V',bCoord:599,gCoord:984, type:'crossing', id:'v984_599'},
  {axis:'V',bCoord:605,gCoord:522, type:'tollbridge', id:'v522_605'},
  {axis:'V',bCoord:624,gCoord:634, type:'tollbridge', id:'v634_624'},
  {axis:'V',bCoord:650,gCoord:818, type:'tollbridge', id:'v818_650'},
  {axis:'V',bCoord:777,gCoord:365, type:'tollbridge', id:'v365_777'},
  {axis:'V',bCoord:790,gCoord:1121, type:'crossing', id:'v1121_790'},
  {axis:'V',bCoord:794,gCoord:127, type:'crossing', id:'v127_794'},
  {axis:'V',bCoord:797,gCoord:319, type:'tollbridge', id:'v319_797'},
  {axis:'V',bCoord:798,gCoord:43, type:'crossing', id:'v43_798'},
  {axis:'V',bCoord:801,gCoord:232, type:'crossing', id:'v232_801'},
  {axis:'V',bCoord:805,gCoord:438, type:'tollbridge', id:'v438_805'},
  {axis:'V',bCoord:806,gCoord:1192, type:'crossing', id:'v1192_806'},
  {axis:'V',bCoord:816,gCoord:613, type:'tunnel', id:'v613_816'},
  {axis:'V',bCoord:820,gCoord:1262, type:'crossing', id:'v1262_820'},
  {axis:'V',bCoord:823,gCoord:703, type:'tunnel', id:'v703_823'},
  {axis:'V',bCoord:828,gCoord:1014, type:'tollbridge', id:'v1014_828'},
  {axis:'V',bCoord:830,gCoord:548, type:'tunnel', id:'v548_830'},
  {axis:'V',bCoord:835,gCoord:523, type:'tunnel', id:'v523_835'},
  {axis:'V',bCoord:999,gCoord:328, type:'tollbridge', id:'v328_999'},
  {axis:'V',bCoord:1005,gCoord:800, type:'tunnel', id:'v800_1005'},
  {axis:'V',bCoord:1006,gCoord:212, type:'crossing', id:'v212_1006'},
  {axis:'V',bCoord:1007,gCoord:86, type:'crossing', id:'v86_1007'},
  {axis:'V',bCoord:1026,gCoord:417, type:'tollbridge', id:'v417_1026'},
  {axis:'V',bCoord:1033,gCoord:1207, type:'crossing', id:'v1207_1033'},
  {axis:'V',bCoord:1034,gCoord:502, type:'tunnel', id:'v502_1034'},
  {axis:'V',bCoord:1040,gCoord:613, type:'tunnel', id:'v613_1040'},
  {axis:'V',bCoord:1049,gCoord:1089, type:'crossing', id:'v1089_1049'},
  {axis:'V',bCoord:1051,gCoord:928, type:'tollbridge', id:'v928_1051'},
  {axis:'V',bCoord:1051,gCoord:1051, type:'crossing', id:'v1051_1051'},
  {axis:'V',bCoord:1097,gCoord:155, type:'crossing', id:'v155_1097'},
  {axis:'V',bCoord:1205,gCoord:23, type:'crossing', id:'v23_1205'},
  {axis:'V',bCoord:1231,gCoord:74, type:'crossing', id:'v74_1231'},
  {axis:'V',bCoord:1255,gCoord:1118, type:'crossing', id:'v1118_1255'},
  {axis:'V',bCoord:1256,gCoord:666, type:'tollbridge', id:'v666_1256'},
  {axis:'V',bCoord:1273,gCoord:987, type:'crossing', id:'v987_1273'},
  {axis:'V',bCoord:1393,gCoord:508, type:'crossing', id:'v508_1393'},
  {axis:'V',bCoord:1436,gCoord:1066, type:'crossing', id:'v1066_1436'},
  {axis:'V',bCoord:1452,gCoord:145, type:'crossing', id:'v145_1452'},
  {axis:'V',bCoord:1464,gCoord:391, type:'crossing', id:'v391_1464'},
  {axis:'V',bCoord:1483,gCoord:954, type:'crossing', id:'v954_1483'},
  {axis:'V',bCoord:1621,gCoord:94, type:'crossing', id:'v94_1621'},
  {axis:'V',bCoord:1634,gCoord:179, type:'crossing', id:'v179_1634'},
  {axis:'V',bCoord:1641,gCoord:538, type:'crossing', id:'v538_1641'},
  {axis:'V',bCoord:1641,gCoord:1249, type:'crossing', id:'v1249_1641'},
  {axis:'V',bCoord:1645,gCoord:228, type:'crossing', id:'v228_1645'},
  {axis:'V',bCoord:1648,gCoord:731, type:'crossing', id:'v731_1648'},
  {axis:'V',bCoord:1650,gCoord:557, type:'crossing', id:'v557_1650'},
  {axis:'V',bCoord:1650,gCoord:617, type:'crossing', id:'v617_1650'},
  {axis:'V',bCoord:1653,gCoord:1139, type:'crossing', id:'v1139_1653'},
  {axis:'V',bCoord:1656,gCoord:760, type:'crossing', id:'v760_1656'},
  {axis:'V',bCoord:1660,gCoord:1100, type:'crossing', id:'v1100_1660'},
  {axis:'V',bCoord:1667,gCoord:1054, type:'crossing', id:'v1054_1667'},
  {axis:'V',bCoord:1671,gCoord:469, type:'crossing', id:'v469_1671'},
  {axis:'V',bCoord:1679,gCoord:293, type:'crossing', id:'v293_1679'},
];
  {axis:'H',bCoord:1147,gCoord:1136, type:'crossing', id:'h1136_1147'},
  {axis:'H',bCoord:1149,gCoord:82, type:'crossing', id:'h82_1149'},
  {axis:'H',bCoord:1162,gCoord:1776, type:'crossing', id:'h1776_1162'},
  {axis:'H',bCoord:1168,gCoord:1586, type:'crossing', id:'h1586_1168'},
  // ── VERTICAL borders (x-strips) ──
  {axis:'V',bCoord:179,gCoord:494, type:'crossing', id:'v494_179'},
  {axis:'V',bCoord:196,gCoord:1207, type:'crossing', id:'v1207_196'},
  {axis:'V',bCoord:198,gCoord:1119, type:'crossing', id:'v1119_198'},
  {axis:'V',bCoord:206,gCoord:638, type:'crossing', id:'v638_206'},
  {axis:'V',bCoord:208,gCoord:70, type:'crossing', id:'v70_208'},
  {axis:'V',bCoord:208,gCoord:224, type:'crossing', id:'v224_208'},
  {axis:'V',bCoord:210,gCoord:136, type:'crossing', id:'v136_210'},
  {axis:'V',bCoord:210,gCoord:682, type:'crossing', id:'v682_210'},
  {axis:'V',bCoord:210,gCoord:1068, type:'crossing', id:'v1068_210'},
  {axis:'V',bCoord:214,gCoord:278, type:'crossing', id:'v278_214'},
  {axis:'V',bCoord:218,gCoord:1036, type:'crossing', id:'v1036_218'},
  {axis:'V',bCoord:388,gCoord:1061, type:'crossing', id:'v1061_388'},
  {axis:'V',bCoord:404,gCoord:189, type:'crossing', id:'v189_404'},
  {axis:'V',bCoord:407,gCoord:1192, type:'crossing', id:'v1192_407'},
  {axis:'V',bCoord:408,gCoord:142, type:'crossing', id:'v142_408'},
  {axis:'V',bCoord:443,gCoord:650, type:'crossing', id:'v650_443'},
  {axis:'V',bCoord:572,gCoord:470, type:'tollbridge', id:'v470_572'},
  {axis:'V',bCoord:574,gCoord:151, type:'crossing', id:'v151_574'},
  {axis:'V',bCoord:579,gCoord:1046, type:'crossing', id:'v1046_579'},
  {axis:'V',bCoord:596,gCoord:254, type:'crossing', id:'v254_596'},
  {axis:'V',bCoord:597,gCoord:512, type:'tollbridge', id:'v512_597'},
  {axis:'V',bCoord:610,gCoord:968, type:'crossing', id:'v968_610'},
  {axis:'V',bCoord:624,gCoord:641, type:'tollbridge', id:'v641_624'},
  {axis:'V',bCoord:650,gCoord:823, type:'tollbridge', id:'v823_650'},
  {axis:'V',bCoord:777,gCoord:365, type:'tollbridge', id:'v365_777'},
  {axis:'V',bCoord:790,gCoord:1122, type:'crossing', id:'v1122_790'},
  {axis:'V',bCoord:794,gCoord:127, type:'crossing', id:'v127_794'},
  {axis:'V',bCoord:795,gCoord:322, type:'tollbridge', id:'v322_795'},
  {axis:'V',bCoord:797,gCoord:198, type:'crossing', id:'v198_797'},
  {axis:'V',bCoord:798,gCoord:43, type:'crossing', id:'v43_798'},
  {axis:'V',bCoord:804,gCoord:437, type:'tollbridge', id:'v437_804'},
  {axis:'V',bCoord:804,gCoord:1189, type:'crossing', id:'v1189_804'},
  {axis:'V',bCoord:819,gCoord:598, type:'tunnel', id:'v598_819'},
  {axis:'V',bCoord:820,gCoord:1022, type:'tollbridge', id:'v1022_820'},
  {axis:'V',bCoord:820,gCoord:1251, type:'crossing', id:'v1251_820'},
  {axis:'V',bCoord:824,gCoord:704, type:'tunnel', id:'v704_824'},
  {axis:'V',bCoord:830,gCoord:549, type:'tunnel', id:'v549_830'},
  {axis:'V',bCoord:835,gCoord:514, type:'tunnel', id:'v514_835'},
  {axis:'V',bCoord:999,gCoord:334, type:'tollbridge', id:'v334_999'},
  {axis:'V',bCoord:1002,gCoord:787, type:'tunnel', id:'v787_1002'},
  {axis:'V',bCoord:1006,gCoord:212, type:'crossing', id:'v212_1006'},
  {axis:'V',bCoord:1007,gCoord:86, type:'crossing', id:'v86_1007'},
  {axis:'V',bCoord:1026,gCoord:417, type:'tollbridge', id:'v417_1026'},
  {axis:'V',bCoord:1034,gCoord:505, type:'tunnel', id:'v505_1034'},
  {axis:'V',bCoord:1038,gCoord:609, type:'tunnel', id:'v609_1038'},
  {axis:'V',bCoord:1038,gCoord:1178, type:'crossing', id:'v1178_1038'},
  {axis:'V',bCoord:1048,gCoord:1088, type:'crossing', id:'v1088_1048'},
  {axis:'V',bCoord:1059,gCoord:957, type:'tollbridge', id:'v957_1059'},
  {axis:'V',bCoord:1060,gCoord:1027, type:'crossing', id:'v1027_1060'},
  {axis:'V',bCoord:1097,gCoord:155, type:'crossing', id:'v155_1097'},
  {axis:'V',bCoord:1205,gCoord:23, type:'crossing', id:'v23_1205'},
  {axis:'V',bCoord:1231,gCoord:74, type:'crossing', id:'v74_1231'},
  {axis:'V',bCoord:1251,gCoord:653, type:'tollbridge', id:'v653_1251'},
  {axis:'V',bCoord:1261,gCoord:1089, type:'crossing', id:'v1089_1261'},
  {axis:'V',bCoord:1275,gCoord:990, type:'crossing', id:'v990_1275'},
  {axis:'V',bCoord:1394,gCoord:492, type:'crossing', id:'v492_1394'},
  {axis:'V',bCoord:1436,gCoord:1068, type:'crossing', id:'v1068_1436'},
  {axis:'V',bCoord:1464,gCoord:393, type:'crossing', id:'v393_1464'},
  {axis:'V',bCoord:1479,gCoord:976, type:'crossing', id:'v976_1479'},
  {axis:'V',bCoord:1621,gCoord:94, type:'crossing', id:'v94_1621'},
  {axis:'V',bCoord:1629,gCoord:172, type:'crossing', id:'v172_1629'},
  {axis:'V',bCoord:1640,gCoord:537, type:'crossing', id:'v537_1640'},
  {axis:'V',bCoord:1640,gCoord:1210, type:'crossing', id:'v1210_1640'},
  {axis:'V',bCoord:1645,gCoord:222, type:'crossing', id:'v222_1645'},
  {axis:'V',bCoord:1648,gCoord:730, type:'crossing', id:'v730_1648'},
  {axis:'V',bCoord:1649,gCoord:626, type:'crossing', id:'v626_1649'},
  {axis:'V',bCoord:1650,gCoord:557, type:'crossing', id:'v557_1650'},
  {axis:'V',bCoord:1652,gCoord:1140, type:'crossing', id:'v1140_1652'},
  {axis:'V',bCoord:1656,gCoord:759, type:'crossing', id:'v759_1656'},
  {axis:'V',bCoord:1659,gCoord:1095, type:'crossing', id:'v1095_1659'},
  {axis:'V',bCoord:1665,gCoord:275, type:'crossing', id:'v275_1665'},
  {axis:'V',bCoord:1673,gCoord:466, type:'crossing', id:'v466_1673'},
  {axis:'V',bCoord:1673,gCoord:1041, type:'crossing', id:'v1041_1673'},
];

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

function randomSpawn(regionKey, usedKeys, flagArr, terrainArr) {
  const reg=REGION_LIST.find(r=>r.key===regionKey);
  if (!reg) return null;
  for (let attempt=0;attempt<200;attempt++) {
    const c=reg.cx+Math.floor((Math.random()-0.5)*70);
    const r=reg.cy+Math.floor((Math.random()-0.5)*70);
    if (c<1||c>=COLS-2||r<1||r>=ROWS-2) continue; // 3x3 HQ needs 2-tile margin
    const k=`${c},${r}`;
    if (KEEP_FOOTPRINT_SET.has(k)||usedKeys.has(k)) continue;
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
    bountyhunters:  { n:"Ashenveil Ranger",        icon:"🏹"  },
    dragons:        { n:"Emberpeak Drake",         icon:"🔥"  },
    holyknights:    { n:"Sanctumhold Inquisitor",  icon:"✝️"  },
    nightcreatures: { n:"Shadowmere Nightlord",    icon:"🌑"  },
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

  // ── Peninsula borders + faction-locked gates ──────────────────────────────────
  // Each peninsula keep is physically separated from the rest of the map by a
  // 2-tile-wide impassable border. A single gate tile sits in that border;
  // it is flagged F_PGGATE and carries homeFaction — only that faction can attack it.
  //
  // Border format: { tiles: [[c,r],...], gateTile: [c,r], faction, keepName }
  // Border tiles that aren't the gate become F_BORDER (ravine terrain).
  // The gate tile becomes F_GATE|F_PGGATE|F_KEEP with the homeFaction baked in.
  //
  // Peninsulas and their gate positions (hand-placed to sit on the road path):
  const PENINSULA_BORDERS = [
    {
      // PlunderMaw (pirates) — connects via col ~229, above row 75
      // Border: horizontal strip at row 75-76, gate at col 229
      faction: "pirates",
      keepName: "Plunder Maw Gate",
      border: [[215,75],[216,75],[217,75],[218,75],[219,75],[220,75],[221,75],[222,75],[223,75],[224,75],[225,75],[226,75],[227,75],[228,75],[230,75],[231,75],[232,75],[233,75],[234,75],[235,75],
               [215,76],[216,76],[217,76],[218,76],[219,76],[220,76],[221,76],[222,76],[223,76],[224,76],[225,76],[226,76],[227,76],[228,76],[230,76],[231,76],[232,76],[233,76],[234,76],[235,76]],
      gate: [229,75],
    },
    {
      // SmolderingMaw (dragons) — connects via row ~437, west of col 130
      // Border: vertical strip at col 129-130, gate at row 437
      faction: "dragons",
      keepName: "Smoldering Maw Gate",
      border: [[129,355],[129,356],[129,357],[129,358],[129,359],[129,360],[129,361],[129,362],[129,363],[129,364],[129,365],[129,366],[129,367],[129,368],[129,369],[129,370],[129,371],[129,372],[129,373],[129,374],[129,375],[129,376],[129,377],[129,378],[129,379],[129,380],[129,381],[129,382],[129,383],[129,384],[129,385],[129,386],[129,387],[129,388],[129,389],[129,390],[129,391],[129,392],[129,393],[129,394],[129,395],[129,396],[129,397],[129,398],[129,399],[129,400],[129,401],[129,402],[129,403],[129,404],[129,405],[129,406],[129,408],[129,409],[129,410],[129,411],[129,412],[129,413],[129,414],[129,415],[129,416],[129,417],[129,418],[129,419],[129,420],[129,421],[129,422],[129,423],[129,424],[129,425],[129,426],[129,427],[129,428],[129,429],[129,430],[129,431],[129,432],[129,433],[129,434],[129,435],[129,436],[129,438],[129,439],[129,440],[129,441],[129,442],[129,443],[129,444],[129,445],[129,446],[129,447],[129,448],[129,449],[129,450],[129,451],[129,452],[129,453],[129,454],[129,455],[129,456],[129,457],[129,458],[129,459],[129,460],[129,461],[129,462],[129,463],[129,464],[129,465],[129,466],[129,467],[129,468],[129,469],[129,470],[129,471],[129,472],[129,473],[129,474],[129,475],[129,476],[129,477],[129,478],[129,479],[129,480],[129,481],[129,482],[129,483],[129,484],[129,485],[129,486],[129,487],[129,488],[129,489],[129,490],[129,491],[129,492],[129,493],[129,494],[129,495],[129,496],[129,497],[129,498],[129,499],[129,500],[129,501],[129,502],[129,503],[129,504],[129,505],[129,506],[129,507],[129,508],
               [130,355],[130,356],[130,357],[130,358],[130,359],[130,360],[130,361],[130,362],[130,363],[130,364],[130,365],[130,366],[130,367],[130,368],[130,369],[130,370],[130,371],[130,372],[130,373],[130,374],[130,375],[130,376],[130,377],[130,378],[130,379],[130,380],[130,381],[130,382],[130,383],[130,384],[130,385],[130,386],[130,387],[130,388],[130,389],[130,390],[130,391],[130,392],[130,393],[130,394],[130,395],[130,396],[130,397],[130,398],[130,399],[130,400],[130,401],[130,402],[130,403],[130,404],[130,405],[130,406],[130,408],[130,409],[130,410],[130,411],[130,412],[130,413],[130,414],[130,415],[130,416],[130,417],[130,418],[130,419],[130,420],[130,421],[130,422],[130,423],[130,424],[130,425],[130,426],[130,427],[130,428],[130,429],[130,430],[130,431],[130,432],[130,433],[130,434],[130,435],[130,436],[130,438],[130,439],[130,440],[130,441],[130,442],[130,443],[130,444],[130,445],[130,446],[130,447],[130,448],[130,449],[130,450],[130,451],[130,452],[130,453],[130,454],[130,455],[130,456],[130,457],[130,458],[130,459],[130,460],[130,461],[130,462],[130,463],[130,464],[130,465],[130,466],[130,467],[130,468],[130,469],[130,470],[130,471],[130,472],[130,473],[130,474],[130,475],[130,476],[130,477],[130,478],[130,479],[130,480],[130,481],[130,482],[130,483],[130,484],[130,485],[130,486],[130,487],[130,488],[130,489],[130,490],[130,491],[130,492],[130,493],[130,494],[130,495],[130,496],[130,497],[130,498],[130,499],[130,500],[130,501],[130,502],[130,503],[130,504],[130,505],[130,506],[130,507],[130,508]],
      gate: [129,437],
    },
    {
      // TheShroud (nightcreatures) — connects via col ~1272, around row 288
      faction: "nightcreatures",
      keepName: "The Shroud Gate",
      border: [[1272,222],[1272,223],[1272,224],[1272,225],[1272,226],[1272,227],[1272,228],[1272,229],[1272,230],[1272,231],[1272,232],[1272,233],[1272,234],[1272,235],[1272,236],[1272,237],[1272,238],[1272,239],[1272,240],[1272,241],[1272,242],[1272,243],[1272,244],[1272,245],[1272,246],[1272,247],[1272,248],[1272,249],[1272,250],[1272,251],[1272,252],[1272,253],[1272,254],[1272,255],[1272,256],[1272,257],[1272,258],[1272,259],[1272,260],[1272,261],[1272,262],[1272,263],[1272,264],[1272,265],[1272,266],[1272,267],[1272,268],[1272,269],[1272,270],[1272,271],[1272,272],[1272,273],[1272,274],[1272,275],[1272,276],[1272,277],[1272,278],[1272,279],[1272,280],[1272,281],[1272,282],[1272,283],[1272,284],[1272,285],[1272,286],[1272,287],[1272,289],[1272,290],[1272,291],[1272,292],[1272,293],[1272,294],[1272,295],[1272,296],[1272,297],[1272,298],[1272,299],[1272,300],[1272,301],[1272,302],[1272,303],[1272,304],[1272,305],[1272,306],[1272,307],[1272,308],[1272,309],[1272,310],[1272,311],[1272,312],[1272,313],[1272,314],[1272,315],[1272,316],[1272,317],[1272,318],[1272,319],[1272,320],[1272,321],[1272,322],[1272,323],[1272,324],[1272,325],[1272,326],[1272,327],[1272,328],[1272,329],[1272,330],[1272,331],[1272,332],[1272,333],[1272,334],[1272,335],[1272,336],[1272,337],[1272,338],[1272,339],[1272,340],[1272,341],[1272,342],[1272,343],[1272,344],[1272,345],
               [1273,222],[1273,223],[1273,224],[1273,225],[1273,226],[1273,227],[1273,228],[1273,229],[1273,230],[1273,231],[1273,232],[1273,233],[1273,234],[1273,235],[1273,236],[1273,237],[1273,238],[1273,239],[1273,240],[1273,241],[1273,242],[1273,243],[1273,244],[1273,245],[1273,246],[1273,247],[1273,248],[1273,249],[1273,250],[1273,251],[1273,252],[1273,253],[1273,254],[1273,255],[1273,256],[1273,257],[1273,258],[1273,259],[1273,260],[1273,261],[1273,262],[1273,263],[1273,264],[1273,265],[1273,266],[1273,267],[1273,268],[1273,269],[1273,270],[1273,271],[1273,272],[1273,273],[1273,274],[1273,275],[1273,276],[1273,277],[1273,278],[1273,279],[1273,280],[1273,281],[1273,282],[1273,283],[1273,284],[1273,285],[1273,286],[1273,287],[1273,289],[1273,290],[1273,291],[1273,292],[1273,293],[1273,294],[1273,295],[1273,296],[1273,297],[1273,298],[1273,299],[1273,300],[1273,301],[1273,302],[1273,303],[1273,304],[1273,305],[1273,306],[1273,307],[1273,308],[1273,309],[1273,310],[1273,311],[1273,312],[1273,313],[1273,314],[1273,315],[1273,316],[1273,317],[1273,318],[1273,319],[1273,320],[1273,321],[1273,322],[1273,323],[1273,324],[1273,325],[1273,326],[1273,327],[1273,328],[1273,329],[1273,330],[1273,331],[1273,332],[1273,333],[1273,334],[1273,335],[1273,336],[1273,337],[1273,338],[1273,339],[1273,340],[1273,341],[1273,342],[1273,343],[1273,344],[1273,345]],
      gate: [1272,288],
    },
    {
      // TheWarground (orcs) — connects via col ~1272, around row 563
      faction: "orcs",
      keepName: "The Warground Gate",
      border: [[1272,488],[1272,489],[1272,490],[1272,491],[1272,492],[1272,493],[1272,494],[1272,495],[1272,496],[1272,497],[1272,498],[1272,499],[1272,500],[1272,501],[1272,502],[1272,503],[1272,504],[1272,505],[1272,506],[1272,507],[1272,508],[1272,509],[1272,510],[1272,511],[1272,512],[1272,513],[1272,514],[1272,515],[1272,516],[1272,517],[1272,518],[1272,519],[1272,520],[1272,521],[1272,522],[1272,523],[1272,524],[1272,525],[1272,526],[1272,527],[1272,528],[1272,529],[1272,530],[1272,531],[1272,532],[1272,533],[1272,534],[1272,535],[1272,536],[1272,537],[1272,538],[1272,539],[1272,540],[1272,541],[1272,542],[1272,543],[1272,544],[1272,545],[1272,546],[1272,547],[1272,548],[1272,549],[1272,550],[1272,551],[1272,552],[1272,553],[1272,554],[1272,555],[1272,556],[1272,557],[1272,558],[1272,559],[1272,560],[1272,561],[1272,562],[1272,564],[1272,565],[1272,566],[1272,567],[1272,568],[1272,569],[1272,570],[1272,571],[1272,572],[1272,573],[1272,574],[1272,575],[1272,576],[1272,577],[1272,578],[1272,579],[1272,580],[1272,581],[1272,582],[1272,583],[1272,584],[1272,585],[1272,586],[1272,587],[1272,588],[1272,589],[1272,590],[1272,591],[1272,592],[1272,593],[1272,594],[1272,595],[1272,596],[1272,597],[1272,598],[1272,599],[1272,600],[1272,601],[1272,602],[1272,603],[1272,604],[1272,605],[1272,606],[1272,607],[1272,608],[1272,609],[1272,610],[1272,611],[1272,612],[1272,613],[1272,614],[1272,615],[1272,616],[1272,617],[1272,618],[1272,619],[1272,620],[1272,621],[1272,622],[1272,623],[1272,624],[1272,625],[1272,626],[1272,627],[1272,628],[1272,629],[1272,630],[1272,631],[1272,632],[1272,633],[1272,634],[1272,635],[1272,636],[1272,637],[1272,638],
               [1273,488],[1273,489],[1273,490],[1273,491],[1273,492],[1273,493],[1273,494],[1273,495],[1273,496],[1273,497],[1273,498],[1273,499],[1273,500],[1273,501],[1273,502],[1273,503],[1273,504],[1273,505],[1273,506],[1273,507],[1273,508],[1273,509],[1273,510],[1273,511],[1273,512],[1273,513],[1273,514],[1273,515],[1273,516],[1273,517],[1273,518],[1273,519],[1273,520],[1273,521],[1273,522],[1273,523],[1273,524],[1273,525],[1273,526],[1273,527],[1273,528],[1273,529],[1273,530],[1273,531],[1273,532],[1273,533],[1273,534],[1273,535],[1273,536],[1273,537],[1273,538],[1273,539],[1273,540],[1273,541],[1273,542],[1273,543],[1273,544],[1273,545],[1273,546],[1273,547],[1273,548],[1273,549],[1273,550],[1273,551],[1273,552],[1273,553],[1273,554],[1273,555],[1273,556],[1273,557],[1273,558],[1273,559],[1273,560],[1273,561],[1273,562],[1273,564],[1273,565],[1273,566],[1273,567],[1273,568],[1273,569],[1273,570],[1273,571],[1273,572],[1273,573],[1273,574],[1273,575],[1273,576],[1273,577],[1273,578],[1273,579],[1273,580],[1273,581],[1273,582],[1273,583],[1273,584],[1273,585],[1273,586],[1273,587],[1273,588],[1273,589],[1273,590],[1273,591],[1273,592],[1273,593],[1273,594],[1273,595],[1273,596],[1273,597],[1273,598],[1273,599],[1273,600],[1273,601],[1273,602],[1273,603],[1273,604],[1273,605],[1273,606],[1273,607],[1273,608],[1273,609],[1273,610],[1273,611],[1273,612],[1273,613],[1273,614],[1273,615],[1273,616],[1273,617],[1273,618],[1273,619],[1273,620],[1273,621],[1273,622],[1273,623],[1273,624],[1273,625],[1273,626],[1273,627],[1273,628],[1273,629],[1273,630],[1273,631],[1273,632],[1273,633],[1273,634],[1273,635],[1273,636],[1273,637],[1273,638]],
      gate: [1272,563],
    },
    {
      // ArcaneDeep (bountyhunters) — connects via row ~848, around col 628
      faction: "bountyhunters",
      keepName: "Arcane Deep Gate",
      border: [[548,848],[549,848],[550,848],[551,848],[552,848],[553,848],[554,848],[555,848],[556,848],[557,848],[558,848],[559,848],[560,848],[561,848],[562,848],[563,848],[564,848],[565,848],[566,848],[567,848],[568,848],[569,848],[570,848],[571,848],[572,848],[573,848],[574,848],[575,848],[576,848],[577,848],[578,848],[579,848],[580,848],[581,848],[582,848],[583,848],[584,848],[585,848],[586,848],[587,848],[588,848],[589,848],[590,848],[591,848],[592,848],[593,848],[594,848],[595,848],[596,848],[597,848],[598,848],[599,848],[600,848],[601,848],[602,848],[603,848],[604,848],[605,848],[606,848],[607,848],[608,848],[609,848],[610,848],[611,848],[612,848],[613,848],[614,848],[615,848],[616,848],[617,848],[618,848],[619,848],[620,848],[621,848],[622,848],[623,848],[624,848],[625,848],[626,848],[627,848],[629,848],[630,848],[631,848],[632,848],[633,848],[634,848],[635,848],[636,848],[637,848],[638,848],[639,848],[640,848],[641,848],[642,848],[643,848],[644,848],[645,848],[646,848],[647,848],[648,848],[649,848],[650,848],[651,848],[652,848],[653,848],[654,848],[655,848],[656,848],[657,848],[658,848],[659,848],[660,848],[661,848],[662,848],[663,848],[664,848],[665,848],[666,848],[667,848],[668,848],[669,848],[670,848],[671,848],[672,848],[673,848],[674,848],[675,848],[676,848],[677,848],[678,848],[679,848],[680,848],[681,848],[682,848],[683,848],[684,848],[685,848],[686,848],[687,848],[688,848],[689,848],[690,848],[691,848],[692,848],[693,848],[694,848],[695,848],[696,848],[697,848],[698,848],[699,848],[700,848],
               [548,849],[549,849],[550,849],[551,849],[552,849],[553,849],[554,849],[555,849],[556,849],[557,849],[558,849],[559,849],[560,849],[561,849],[562,849],[563,849],[564,849],[565,849],[566,849],[567,849],[568,849],[569,849],[570,849],[571,849],[572,849],[573,849],[574,849],[575,849],[576,849],[577,849],[578,849],[579,849],[580,849],[581,849],[582,849],[583,849],[584,849],[585,849],[586,849],[587,849],[588,849],[589,849],[590,849],[591,849],[592,849],[593,849],[594,849],[595,849],[596,849],[597,849],[598,849],[599,849],[600,849],[601,849],[602,849],[603,849],[604,849],[605,849],[606,849],[607,849],[608,849],[609,849],[610,849],[611,849],[612,849],[613,849],[614,849],[615,849],[616,849],[617,849],[618,849],[619,849],[620,849],[621,849],[622,849],[623,849],[624,849],[625,849],[626,849],[627,849],[629,849],[630,849],[631,849],[632,849],[633,849],[634,849],[635,849],[636,849],[637,849],[638,849],[639,849],[640,849],[641,849],[642,849],[643,849],[644,849],[645,849],[646,849],[647,849],[648,849],[649,849],[650,849],[651,849],[652,849],[653,849],[654,849],[655,849],[656,849],[657,849],[658,849],[659,849],[660,849],[661,849],[662,849],[663,849],[664,849],[665,849],[666,849],[667,849],[668,849],[669,849],[670,849],[671,849],[672,849],[673,849],[674,849],[675,849],[676,849],[677,849],[678,849],[679,849],[680,849],[681,849],[682,849],[683,849],[684,849],[685,849],[686,849],[687,849],[688,849],[689,849],[690,849],[691,849],[692,849],[693,849],[694,849],[695,849],[696,849],[697,849],[698,849],[699,849],[700,849]],
      gate: [628,848],
    },
    {
      // BlessedShore (holyknights) — connects via row ~848, around col 795
      faction: "holyknights",
      keepName: "Blessed Shore Gate",
      border: [[728,848],[729,848],[730,848],[731,848],[732,848],[733,848],[734,848],[735,848],[736,848],[737,848],[738,848],[739,848],[740,848],[741,848],[742,848],[743,848],[744,848],[745,848],[746,848],[747,848],[748,848],[749,848],[750,848],[751,848],[752,848],[753,848],[754,848],[755,848],[756,848],[757,848],[758,848],[759,848],[760,848],[761,848],[762,848],[763,848],[764,848],[765,848],[766,848],[767,848],[768,848],[769,848],[770,848],[771,848],[772,848],[773,848],[774,848],[775,848],[776,848],[777,848],[778,848],[779,848],[780,848],[781,848],[782,848],[783,848],[784,848],[785,848],[786,848],[787,848],[788,848],[789,848],[790,848],[791,848],[792,848],[793,848],[794,848],[796,848],[797,848],[798,848],[799,848],[800,848],[801,848],[802,848],[803,848],[804,848],[805,848],[806,848],[807,848],[808,848],[809,848],[810,848],[811,848],[812,848],[813,848],[814,848],[815,848],[816,848],[817,848],[818,848],[819,848],[820,848],[821,848],[822,848],[823,848],[824,848],[825,848],[826,848],[827,848],[828,848],[829,848],[830,848],[831,848],[832,848],[833,848],[834,848],[835,848],[836,848],[837,848],[838,848],[839,848],[840,848],[841,848],[842,848],[843,848],[844,848],[845,848],[846,848],[847,848],[848,848],[849,848],[850,848],[851,848],[852,848],[853,848],[854,848],
               [728,849],[729,849],[730,849],[731,849],[732,849],[733,849],[734,849],[735,849],[736,849],[737,849],[738,849],[739,849],[740,849],[741,849],[742,849],[743,849],[744,849],[745,849],[746,849],[747,849],[748,849],[749,849],[750,849],[751,849],[752,849],[753,849],[754,849],[755,849],[756,849],[757,849],[758,849],[759,849],[760,849],[761,849],[762,849],[763,849],[764,849],[765,849],[766,849],[767,849],[768,849],[769,849],[770,849],[771,849],[772,849],[773,849],[774,849],[775,849],[776,849],[777,849],[778,849],[779,849],[780,849],[781,849],[782,849],[783,849],[784,849],[785,849],[786,849],[787,849],[788,849],[789,849],[790,849],[791,849],[792,849],[793,849],[794,849],[796,849],[797,849],[798,849],[799,849],[800,849],[801,849],[802,849],[803,849],[804,849],[805,849],[806,849],[807,849],[808,849],[809,849],[810,849],[811,849],[812,849],[813,849],[814,849],[815,849],[816,849],[817,849],[818,849],[819,849],[820,849],[821,849],[822,849],[823,849],[824,849],[825,849],[826,849],[827,849],[828,849],[829,849],[830,849],[831,849],[832,849],[833,849],[834,849],[835,849],[836,849],[837,849],[838,849],[839,849],[840,849],[841,849],[842,849],[843,849],[844,849],[845,849],[846,849],[847,849],[848,849],[849,849],[850,849],[851,849],[852,849],[853,849],[854,849]],
      gate: [795,848],
    },
  ];

  for (const pb of PENINSULA_BORDERS) {
    // Paint border tiles as impassable ravine
    for (const [c, r] of pb.border) {
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
      const idx = r * COLS + c;
      if (flagArr[idx] & (F_KEEP|F_KEEPPART|F_HQ|F_HQPART)) continue;
      terrainArr[idx]  = TERRAIN_ENC.ravine;
      flagArr[idx]     = (flagArr[idx] & ~F_GATE) | F_BORDER;
      rssArr[idx]      = 0;
      garrisonArr[idx] = 0;
    }
    // Paint gate tile
    const [gc, gr] = pb.gate;
    if (gc >= 0 && gr >= 0 && gc < COLS && gr < ROWS) {
      const gidx = gr * COLS + gc;
      terrainArr[gidx]  = TERRAIN_ENC.ravine;
      flagArr[gidx]     = (flagArr[gidx] & ~F_BORDER) | F_GATE | F_KEEP | F_PGGATE;
      garrisonArr[gidx] = GATE_GARRISON;
      siegeArr[gidx]    = GATE_SIEGE;
      siegeMaxArr[gidx] = GATE_SIEGE;
      rssArr[gidx]      = 0;
      keepMeta[`${gc},${gr}`] = {
        keepName:    pb.keepName,
        garrisonWaves: 2,
        homeFaction: pb.faction,
        cx: gc, cy: gr,
        isPeninsulaGate: true,
        defCmd: {
          n:    pb.keepName + " Defender",
          icon: "🚧",
          cls: "defender", faction: pb.faction, rarity: "veteran",
          lvl: GATE_CMD_LVL, troops: GATE_GARRISON,
          atk: 120 * GATE_CMD_LVL, spd: 40 + GATE_CMD_LVL * 2,
        },
      };
    }
  }


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
  for (const fk of ["pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"]) {
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
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const idx = (hr+dr)*COLS + (hc+dc);
        if (idx < 0 || idx >= SIZE) continue;
        const isCenter = dc === 0 && dr === 0;
        // Flags
        flagArr[idx] = (flagArr[idx] & ~(F_KEEP|F_KEEPPART|F_WIN)) | (isCenter ? F_HQ : F_HQPART);
        // Ownership
        ownerArr[idx] = ownerCode;
        // Terrain — HQ footprint is always grass, no resources
        terrainArr[idx] = TERRAIN_ENC.grass;
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
  for (const fk of ["pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"]) {
    const regions = FACTION_ALL_REGIONS[fk];
    if (!regions || !regions.length) continue;
    const ownerCode = OWNER_ENC[fk];
    const keys = [];
    for (let i = 0; i < 50; i++) {
      const reg = regions[i % regions.length];
      const key = randomSpawn(reg.key, usedKeys, flagArr, terrainArr);
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
  for (const fk of ["pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"]) {
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
  const allFactions = ["pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"];
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
      F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_WIN, F_DEFEATED, F_GATE, F_BORDER, F_PGGATE,
    },
    spawnKeys,
    aiHqMap,
    factionTileKeys,   // pre-built per-faction tile key arrays — eliminates O(1.4M) scans on main thread
    playerTileKeys,    // player-owned keys at worker time (empty at gen, populated after HQ placement)
    playerSpawn: (spawnKeys[facKey] || [])[0] || null, // player uses first key of their faction
  }, transferables);
};
