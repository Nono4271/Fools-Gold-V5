// ── Map Generation Web Worker ─────────────────────────────────────────────────
// Communicates via postMessage:
//   incoming: { facKey }
//   outgoing: { type:'progress', pct, label }
//             { type:'done', buffers, meta, spawnKeys }   ← transferable, zero-copy

const COLS = 1400, ROWS = 1000;
const SIZE = COLS * ROWS;
const SIEGE_BASE = 50;

const RKEYS      = ["stone","wood","ore","gas"];
const TROOP_KEYS = ["infantry","mage","spearmen","horsemen"];

const POWER_DEFS = {
  1: { cmdLvl:2,  troops:200  },
  2: { cmdLvl:6,  troops:600  },
  3: { cmdLvl:10, troops:1000 },
  4: { cmdLvl:15, troops:1500 },
};
const REGION_POWER = { start:1, farm:2, conflict:3, ring:4 };

const TERRAIN_ENC = { grass:0, forest:1, mountain:2, desert:3, river:4, ravine:5, rockymountain:6 };
const TERRAIN_DEC = ["grass","forest","mountain","desert","river","ravine","rockymountain"];
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
const KEEP_FOOTPRINT_RADIUS = 5;
const KEEP_FOOTPRINT_SET = new Set();
for (const r of REGION_LIST) {
  for (let dc=-KEEP_FOOTPRINT_RADIUS; dc<=KEEP_FOOTPRINT_RADIUS; dc++)
    for (let dr=-KEEP_FOOTPRINT_RADIUS; dr<=KEEP_FOOTPRINT_RADIUS; dr++)
      KEEP_FOOTPRINT_SET.add(`${r.cx+dc},${r.cy+dr}`);
}

const REGION_KEY_TO_IDX = {};
REGION_LIST.forEach((r,i) => { REGION_KEY_TO_IDX[r.key] = i+1; });

// Biome seeds scaled for 1400x1000
const BIOME_SEEDS = (() => {
  let s = 0xdeadbeef|0;
  const rng = () => { s=(Math.imul(s,1664525)+1013904223)|0; return((s>>>0)/0xffffffff); };
  const seeds = [];
  [["grass",80],["forest",60],["mountain",55],["desert",55]].forEach(([t,n]) => {
    for (let i=0;i<n;i++) {
      let c,r;
      do { c=Math.floor(rng()*1400); r=Math.floor(rng()*1000); } while (Math.max(c,r)<50 && t!=="grass");
      seeds.push({c,r,t});
    }
  });
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
  {axis:'H',bCoord:208,gCoord:229, type:'crossing',   id:'h229_208'},
  {axis:'H',bCoord:208,gCoord:427, type:'crossing',   id:'h427_208'},
  {axis:'H',bCoord:208,gCoord:613, type:'tollbridge', id:'h613_208'},
  {axis:'H',bCoord:208,gCoord:788, type:'crossing',   id:'h788_208'},
  {axis:'H',bCoord:208,gCoord:975, type:'crossing',   id:'h975_208'},
  {axis:'H',bCoord:208,gCoord:1173,type:'tunnel',     id:'h1173_208'},
  {axis:'H',bCoord:341,gCoord:613, type:'tollbridge', id:'h613_341'},
  {axis:'H',bCoord:341,gCoord:788, type:'tollbridge', id:'h788_341'},
  {axis:'H',bCoord:341,gCoord:975, type:'tunnel',     id:'h975_341'},
  {axis:'H',bCoord:474,gCoord:229, type:'tunnel',     id:'h229_474'},
  {axis:'H',bCoord:474,gCoord:427, type:'tunnel',     id:'h427_474'},
  {axis:'H',bCoord:474,gCoord:613, type:'tollbridge', id:'h613_474'},
  {axis:'H',bCoord:474,gCoord:788, type:'tollbridge', id:'h788_474'},
  {axis:'H',bCoord:474,gCoord:975, type:'tunnel',     id:'h975_474'},
  {axis:'H',bCoord:474,gCoord:1173,type:'tunnel',     id:'h1173_474'},
  {axis:'H',bCoord:607,gCoord:229, type:'tunnel',     id:'h229_607'},
  {axis:'H',bCoord:607,gCoord:613, type:'tollbridge', id:'h613_607'},
  {axis:'H',bCoord:607,gCoord:788, type:'tollbridge', id:'h788_607'},
  {axis:'H',bCoord:607,gCoord:1173,type:'tunnel',     id:'h1173_607'},
  {axis:'H',bCoord:740,gCoord:427, type:'crossing',   id:'h427_740'},
  {axis:'H',bCoord:740,gCoord:613, type:'tollbridge', id:'h613_740'},
  {axis:'H',bCoord:740,gCoord:788, type:'crossing',   id:'h788_740'},
  {axis:'H',bCoord:740,gCoord:975, type:'crossing',   id:'h975_740'},
  // ── VERTICAL borders (x-strips) ──
  {axis:'V',bCoord:328,gCoord:141, type:'tunnel',     id:'v328_141'},
  {axis:'V',bCoord:328,gCoord:274, type:'tunnel',     id:'v328_274'},
  {axis:'V',bCoord:328,gCoord:407, type:'tunnel',     id:'v328_407'},
  {axis:'V',bCoord:328,gCoord:540, type:'tunnel',     id:'v328_540'},
  {axis:'V',bCoord:328,gCoord:794, type:'tunnel',     id:'v328_794'},
  {axis:'V',bCoord:526,gCoord:141, type:'crossing',   id:'v526_141'},
  {axis:'V',bCoord:526,gCoord:274, type:'crossing',   id:'v526_274'},
  {axis:'V',bCoord:526,gCoord:407, type:'crossing',   id:'v526_407'},
  {axis:'V',bCoord:526,gCoord:673, type:'crossing',   id:'v526_673'},
  {axis:'V',bCoord:526,gCoord:794, type:'crossing',   id:'v526_794'},
  {axis:'V',bCoord:701,gCoord:141, type:'tollbridge', id:'v701_141'},
  {axis:'V',bCoord:701,gCoord:274, type:'tollbridge', id:'v701_274'},
  {axis:'V',bCoord:701,gCoord:407, type:'tollbridge', id:'v701_407'},
  {axis:'V',bCoord:701,gCoord:540, type:'tollbridge', id:'v701_540'},
  {axis:'V',bCoord:876,gCoord:141, type:'tollbridge', id:'v876_141'},
  {axis:'V',bCoord:876,gCoord:274, type:'tollbridge', id:'v876_274'},
  {axis:'V',bCoord:876,gCoord:407, type:'tollbridge', id:'v876_407'},
  {axis:'V',bCoord:876,gCoord:540, type:'tollbridge', id:'v876_540'},
  {axis:'V',bCoord:876,gCoord:794, type:'tollbridge', id:'v876_794'},
  {axis:'V',bCoord:1074,gCoord:141,type:'tunnel',     id:'v1074_141'},
  {axis:'V',bCoord:1074,gCoord:274,type:'tunnel',     id:'v1074_274'},
  {axis:'V',bCoord:1074,gCoord:407,type:'tunnel',     id:'v1074_407'},
  {axis:'V',bCoord:1074,gCoord:540,type:'tunnel',     id:'v1074_540'},
  {axis:'V',bCoord:1074,gCoord:794,type:'tunnel',     id:'v1074_794'},
];

// Terrain type per crossing type
function crossingTerrain(type) {
  if (type === 'crossing')   return TERRAIN_ENC.river;
  if (type === 'tollbridge') return TERRAIN_ENC.ravine;
  return TERRAIN_ENC.rockymountain; // tunnel
}

// Build set of all gate tiles and border tiles for a crossing
// ── Border width ─────────────────────────────────────────────────────────────
const BORDER_W = 3; // tiles wide/tall for each border strip
const BORDER_HALF = Math.floor(BORDER_W / 2); // = 1

// For a 3-tile border centered on the grid boundary:
//   offset -1, 0, +1 from the boundary coordinate
// Gate A = 1 tile thick × 4 tall, hugging region A side (offset -1 for V, -1 for H)
// Gate B = 1 tile thick × 4 tall, hugging region B side (offset +1 for V, +1 for H)
// Path   = 1 tile wide through center (offset 0), at the gate center coord

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
    // Horizontal border: strip of rows bCoord-1, bCoord, bCoord+1
    // Runs full width MAP_X0..MAP_X1
    for (let offset = -BORDER_HALF; offset <= BORDER_HALF; offset++) {
      const y = bCoord + offset;
      if (y < MAP_Y0 || y > MAP_Y1) continue;
      for (let x = MAP_X0; x <= MAP_X1; x++) {
        // Check if this x is within any gate window on this border
        let isGateA = false, isGateB = false, isPath = false;
        for (const gw of gateWindows) {
          const gx = gw.gCoord;
          // Gate A: offset=-1, x in [gx-1, gx+2] (4 tiles wide)
          if (offset === -BORDER_HALF && x >= gx-1 && x <= gx+2) { isGateA = true; break; }
          // Gate B: offset=+1, x in [gx-1, gx+2] (4 tiles wide)
          if (offset === +BORDER_HALF && x >= gx-1 && x <= gx+2) { isGateB = true; break; }
          // Path: offset=0 (center), x === gx (1 tile wide)
          if (offset === 0 && x === gx) { isPath = true; break; }
        }
        if      (isGateA) { const gw = gateWindows.find(g=>{ const gx=g.gCoord; return x>=gx-1&&x<=gx+2; }); gateA.push({x,y,id:gw.id+'_A',type:gw.type}); }
        else if (isGateB) { const gw = gateWindows.find(g=>{ const gx=g.gCoord; return x>=gx-1&&x<=gx+2; }); gateB.push({x,y,id:gw.id+'_B',type:gw.type}); }
        else if (isPath)  pathTiles.push({x,y});
        else              impassable.push({x,y});
      }
    }
  } else {
    // Vertical border: strip of cols bCoord-1, bCoord, bCoord+1
    // Runs full height MAP_Y0..MAP_Y1
    for (let offset = -BORDER_HALF; offset <= BORDER_HALF; offset++) {
      const x = bCoord + offset;
      if (x < MAP_X0 || x > MAP_X1) continue;
      for (let y = MAP_Y0; y <= MAP_Y1; y++) {
        let isGateA = false, isGateB = false, isPath = false;
        for (const gw of gateWindows) {
          const gy = gw.gCoord;
          if (offset === -BORDER_HALF && y >= gy-1 && y <= gy+2) { isGateA = true; break; }
          if (offset === +BORDER_HALF && y >= gy-1 && y <= gy+2) { isGateB = true; break; }
          if (offset === 0 && y === gy) { isPath = true; break; }
        }
        if      (isGateA) { const gw = gateWindows.find(g=>{ const gy=g.gCoord; return y>=gy-1&&y<=gy+2; }); gateA.push({x,y,id:gw.id+'_A',type:gw.type}); }
        else if (isGateB) { const gw = gateWindows.find(g=>{ const gy=g.gCoord; return y>=gy-1&&y<=gy+2; }); gateB.push({x,y,id:gw.id+'_B',type:gw.type}); }
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

function randomSpawn(regionKey, usedKeys) {
  const reg=REGION_LIST.find(r=>r.key===regionKey);
  if (!reg) return null;
  for (let attempt=0;attempt<200;attempt++) {
    const c=reg.cx+Math.floor((Math.random()-0.5)*70);
    const r=reg.cy+Math.floor((Math.random()-0.5)*70);
    if (c<1||c>=COLS-1||r<1||r>=ROWS-1) continue;
    const k=`${c},${r}`;
    if (KEEP_FOOTPRINT_SET.has(k)||usedKeys.has(k)) continue;
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
      const pl      = reg ? (REGION_POWER[reg.layer]??1) : 1;
      const pd      = POWER_DEFS[pl];
      const rssKey  = RKEYS[Math.floor(Math.random()*4)];
      const trpKey  = TROOP_KEYS[Math.floor(Math.random()*4)];

      terrainArr[idx]  = TERRAIN_ENC[TERRAIN_NAMES[TERRAIN_MAP[idx]]] ?? 0;
      rssArr[idx]      = RSS_ENC[rssKey] ?? 0;
      troopArr[idx]    = TROOP_ENC[trpKey] ?? 0;
      powerArr[idx]    = pl;
      regionArr[idx]   = regIdx;
      garrisonArr[idx] = pd.troops;
      siegeArr[idx]    = SIEGE_BASE;
      siegeMaxArr[idx] = SIEGE_BASE;
    }

    if (r % PROGRESS_INTERVAL === 0) {
      postMessage({ type:"progress", pct: 20+Math.round((r/ROWS)*60), label:"Packing tiles..." });
    }
  }

  postMessage({ type:"progress", pct:82, label:"Placing keeps..." });

  const KEEP_CMD_LVL=20, KEEP_TROOPS=2000, KEEP_SIEGE=5000, KEEP_RADIUS=5;
  const keepMeta = {};

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

    // Paint path tiles — passable, same terrain visually
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

  postMessage({ type:"progress", pct:92, label:"Finding spawn points..." });

  const spawnKeys={}, usedKeys=new Set();
  for (const fk of ["pirates","orcs","bountyhunters","dragons","holyknights","nightcreatures"]) {
    const startRegion=FACTION_REGIONS[fk]?.start;
    if (!startRegion) continue;
    const key=randomSpawn(startRegion,usedKeys);
    if (key){spawnKeys[fk]=key;usedKeys.add(key);}
  }

  postMessage({ type:"progress", pct:98, label:"Finishing up..." });

  const transferables = [
    terrainArr.buffer, ownerArr.buffer, rssArr.buffer, troopArr.buffer,
    powerArr.buffer, regionArr.buffer, flagArr.buffer,
    garrisonArr.buffer, siegeArr.buffer, siegeMaxArr.buffer, keepPrimArr.buffer,
  ];

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
  }, transferables);
};
