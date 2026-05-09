// Updated regions — v13 Nova-style peninsula layout
// 1400 x 1000 design space
// Structure: central core (x~300..1100, y~150..850) + 8 faction peninsulas radiating outward
export const REGIONS = {
  holyGrail:         { key:'holyGrail',         name:'The Holy Grail',          layer:'ring',     keepName:'The Holy Grail',              cx: 700, cy: 500, factions: null },
  shatteredShallows: { key:'shatteredShallows',  name:'The Shattered Shallows',  layer:'conflict', keepName:'The Shattered Shallows Keep',  cx: 689, cy: 280, factions: ['pirates','merfolk'] },
  ashenRift:         { key:'ashenRift',          name:'The Ashen Rift',          layer:'conflict', keepName:'The Ashen Rift Keep',          cx: 453, cy: 500, factions: ['bountyhunters','dragons'] },
  bloodmarch:        { key:'bloodmarch',         name:'Bloodmarch',              layer:'conflict', keepName:'Bloodmarch Keep',              cx: 929, cy: 500, factions: ['marines','orcs'] },
  brinefields:       { key:'brinefields',        name:'Brinefields',             layer:'farm',     keepName:'Brinefields Keep',             cx: 480, cy: 260, factions: ['pirates'] },
  coralfen:          { key:'coralfen',           name:'Coralfen',                layer:'farm',     keepName:'Coralfen Keep',                cx: 920, cy: 260, factions: ['merfolk'] },
  cinderplain:       { key:'cinderplain',        name:'Cinderplain',             layer:'farm',     keepName:'Cinderplain Keep',             cx: 380, cy: 295, factions: ['dragons'] },
  stormwatch:        { key:'stormwatch',         name:'Stormwatch',              layer:'farm',     keepName:'Stormwatch Keep',              cx:1020, cy: 295, factions: ['marines'] },
  runemarks:         { key:'runemarks',          name:'Runemarks',               layer:'farm',     keepName:'Runemarks Keep',               cx: 380, cy: 710, factions: ['bountyhunters'] },
  boneridge:         { key:'boneridge',          name:'Boneridge',               layer:'farm',     keepName:'Boneridge Keep',               cx:1020, cy: 710, factions: ['orcs'] },
  pilgrimfields:     { key:'pilgrimfields',      name:'Pilgrimfields',           layer:'farm',     keepName:'Pilgrimfields Keep',           cx: 460, cy: 830, factions: ['holyknights'] },
  darkfen:           { key:'darkfen',            name:'Darkfen',                 layer:'farm',     keepName:'Darkfen Keep',                 cx: 940, cy: 830, factions: ['nightcreatures'] },
  saltmere:          { key:'saltmere',           name:'Saltmere',                layer:'start',    keepName:'Saltmere Keep',                cx: 200, cy: 100, factions: ['pirates'] },
  tidesreach:        { key:'tidesreach',         name:'Tidesreach',              layer:'start',    keepName:'Tidesreach Keep',              cx:1200, cy: 100, factions: ['merfolk'] },
  emberpeak:         { key:'emberpeak',          name:'Emberpeak',               layer:'start',    keepName:'Emberpeak Keep',               cx: 120, cy: 360, factions: ['dragons'] },
  ironhaven:         { key:'ironhaven',          name:'Ironhaven',               layer:'start',    keepName:'Ironhaven Keep',               cx:1280, cy: 360, factions: ['marines'] },
  ashenveil:         { key:'ashenveil',          name:'Ashenveil',               layer:'start',    keepName:'Ashenveil Keep',               cx: 120, cy: 650, factions: ['bountyhunters'] },
  grimhold:          { key:'grimhold',           name:'Grimhold',                layer:'start',    keepName:'Grimhold Keep',                cx:1280, cy: 650, factions: ['orcs'] },
  sanctumhold:       { key:'sanctumhold',        name:'Sanctumhold',             layer:'start',    keepName:'Sanctumhold Keep',             cx: 220, cy: 920, factions: ['holyknights'] },
  shadowmere:        { key:'shadowmere',         name:'Shadowmere',              layer:'start',    keepName:'Shadowmere Keep',              cx:1180, cy: 920, factions: ['nightcreatures'] },
};

export const REGION_LIST = Object.values(REGIONS);

export const POLYS = {
  // ── Faction peninsulas ─────────────────────────────────────────────────────
  saltmere:          [[0,0],[550,0],[550,50],[580,150],[300,150],[180,260],[0,260]],
  tidesreach:        [[850,0],[1400,0],[1400,260],[1220,260],[1100,150],[820,150],[850,50]],
  emberpeak:         [[0,200],[300,200],[300,510],[170,510],[0,510]],
  ironhaven:         [[1100,200],[1400,200],[1400,510],[1230,510],[1100,510]],
  ashenveil:         [[0,490],[170,490],[300,490],[300,810],[0,810]],
  grimhold:          [[1100,490],[1230,490],[1400,490],[1400,810],[1100,810]],
  sanctumhold:       [[0,790],[300,790],[300,850],[620,850],[620,1000],[0,1000]],
  shadowmere:        [[780,850],[1100,850],[1100,790],[1400,790],[1400,1000],[780,1000]],
  // ── Farm regions ──────────────────────────────────────────────────────────
  brinefields:       [[300,150],[580,150],[580,390],[460,390],[300,350]],
  coralfen:          [[820,150],[1100,150],[1100,350],[940,390],[820,390]],
  cinderplain:       [[300,200],[460,200],[460,390],[300,390]],
  stormwatch:        [[940,200],[1100,200],[1100,390],[940,390]],
  runemarks:         [[300,610],[460,610],[460,810],[300,810]],
  boneridge:         [[940,610],[1100,610],[1100,810],[940,810]],
  pilgrimfields:     [[300,810],[620,810],[620,850],[300,850]],
  darkfen:           [[780,810],[1100,810],[1100,850],[780,850]],
  // ── Conflict + Ring ────────────────────────────────────────────────────────
  shatteredShallows: [[460,150],[840,150],[1100,350],[940,390],[820,390],[700,350],[580,390],[460,390],[300,350]],
  ashenRift:         [[300,390],[460,390],[580,390],[620,610],[460,610],[300,610]],
  bloodmarch:        [[820,390],[940,390],[1100,390],[1100,610],[940,610],[780,610],[820,390]],
  holyGrail:         [[580,390],[820,390],[780,610],[620,610]],
};

export function tileRegion(c, r) {
  for (const [key, poly] of Object.entries(POLYS)) {
    if (pointInPoly(c, r, poly)) return REGION_LIST.find(rg => rg.key === key);
  }
  return null;
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

export const KEEP_KEYS = new Set(REGION_LIST.map(r => `${r.cx},${r.cy}`));

export const FACTION_REGIONS = {
  pirates:        { start:'saltmere',    farm:'brinefields'   },
  merfolk:        { start:'tidesreach',  farm:'coralfen'      },
  marines:        { start:'ironhaven',   farm:'stormwatch'    },
  orcs:           { start:'grimhold',    farm:'boneridge'     },
  bountyhunters:  { start:'ashenveil',   farm:'runemarks'     },
  dragons:        { start:'emberpeak',   farm:'cinderplain'   },
  holyknights:    { start:'sanctumhold', farm:'pilgrimfields' },
  nightcreatures: { start:'shadowmere',  farm:'darkfen'       },
};
export const REGION_POWER = { start:1, farm:2, conflict:3, ring:4 };
