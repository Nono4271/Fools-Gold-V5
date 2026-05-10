// regions.js — layout from HTML world map (1400×1000 design space)
// HTML grid cols: 130,328,526,701,876,1074,1272  rows: 75,208,341,474,607,740,848
// Cell centres: col cx=229,427,613,788,975,1173  row cy=141,274,407,540,673,794

export const REGIONS = {

  // ── Holy Grail (ring) ────────────────────────────────────────────────────
  holyGrail:       { key:'holyGrail',       name:'Holy Grail',          layer:'ring',     keepName:'The Holy Grail',            cx:788, cy:407, factions:null },

  // ── Pirates ──────────────────────────────────────────────────────────────
  saltmere:        { key:'saltmere',        name:'Saltmere',            layer:'start',    keepName:'Saltmere Keep',             cx:229, cy:141, factions:['pirates'] },
  plunderMaw:      { key:'plunderMaw',      name:'The Plunder Maw',     layer:'farm',     keepName:'The Plunder Maw Keep',      cx:215, cy:42,  factions:['pirates'] },
  brineHollow:     { key:'brineHollow',     name:'Brine Hollow',        layer:'farm',     keepName:'Brine Hollow Keep',         cx:427, cy:141, factions:['pirates'] },
  deadAnchor:      { key:'deadAnchor',      name:'Dead Anchor',         layer:'farm',     keepName:'Dead Anchor Keep',          cx:229, cy:274, factions:['pirates'] },

  // ── Night Creatures ───────────────────────────────────────────────────────
  shadowmere:      { key:'shadowmere',      name:'Shadowmere',          layer:'start',    keepName:'Shadowmere Keep',           cx:1173,cy:274, factions:['nightcreatures'] },
  theShroud:       { key:'theShroud',       name:'The Shroud',          layer:'farm',     keepName:'The Shroud Keep',           cx:1334,cy:288, factions:['nightcreatures'] },
  crimsonVeil:     { key:'crimsonVeil',     name:'Crimson Veil',        layer:'farm',     keepName:'Crimson Veil Keep',         cx:975, cy:141, factions:['nightcreatures'] },
  paleCourt:       { key:'paleCourt',       name:'The Pale Court',      layer:'farm',     keepName:'The Pale Court Keep',       cx:1173,cy:141, factions:['nightcreatures'] },
  duskHollow:      { key:'duskHollow',      name:'Dusk Hollow',         layer:'farm',     keepName:'Dusk Hollow Keep',          cx:975, cy:274, factions:['nightcreatures'] },
  bloodfen:        { key:'bloodfen',        name:'Bloodfen',            layer:'farm',     keepName:'Bloodfen Keep',             cx:1173,cy:407, factions:['nightcreatures'] },

  // ── Dragons ───────────────────────────────────────────────────────────────
  emberpeak:       { key:'emberpeak',       name:'Emberpeak',           layer:'start',    keepName:'Emberpeak Keep',            cx:229, cy:407, factions:['dragons'] },
  smolderingMaw:   { key:'smolderingMaw',   name:'Smoldering Maw',      layer:'farm',     keepName:'Smoldering Maw Keep',       cx:55,  cy:437, factions:['dragons'] },
  ashcrag:         { key:'ashcrag',         name:'Ashcrag',             layer:'farm',     keepName:'Ashcrag Keep',              cx:460, cy:375, factions:['dragons'] },
  cinderPass:      { key:'cinderPass',      name:'Cinder Pass',         layer:'farm',     keepName:'Cinder Pass Keep',          cx:390, cy:432, factions:['dragons'] },
  scorchveil:      { key:'scorchveil',      name:'Scorchveil',          layer:'farm',     keepName:'Scorchveil Keep',           cx:229, cy:540, factions:['dragons'] },

  // ── Orcs ──────────────────────────────────────────────────────────────────
  grimhold:        { key:'grimhold',        name:'Grimhold',            layer:'start',    keepName:'Grimhold Keep',             cx:1173,cy:540, factions:['orcs'] },
  theWarground:    { key:'theWarground',    name:'The Warground',       layer:'farm',     keepName:'The Warground Keep',        cx:1334,cy:563, factions:['orcs'] },
  warbend:         { key:'warbend',         name:'Warbend',             layer:'farm',     keepName:'Warbend Keep',              cx:975, cy:407, factions:['orcs'] },
  bloodfield:      { key:'bloodfield',      name:'Bloodfield',          layer:'farm',     keepName:'Bloodfield Keep',           cx:975, cy:540, factions:['orcs'] },
  bonepile:        { key:'bonepile',        name:'Bonepile',            layer:'farm',     keepName:'Bonepile Keep',             cx:1173,cy:673, factions:['orcs'] },

  // ── Wizards (Bounty Hunters) ──────────────────────────────────────────────
  ashenveil:       { key:'ashenveil',       name:'Ashenveil',           layer:'start',    keepName:'Ashenveil Keep',            cx:613, cy:794, factions:['bountyhunters'] },
  arcaneDeep:      { key:'arcaneDeep',      name:'The Arcane Deep',     layer:'farm',     keepName:'The Arcane Deep Keep',      cx:628, cy:910, factions:['bountyhunters'] },
  hexmire:         { key:'hexmire',         name:'Hexmire',             layer:'farm',     keepName:'Hexmire Keep',              cx:427, cy:673, factions:['bountyhunters'] },
  ruinwatch:       { key:'ruinwatch',       name:'Ruinwatch',           layer:'farm',     keepName:'Ruinwatch Keep',            cx:613, cy:673, factions:['bountyhunters'] },
  ashenFen:        { key:'ashenFen',        name:'The Ashen Fen',       layer:'farm',     keepName:'The Ashen Fen Keep',        cx:229, cy:794, factions:['bountyhunters'] },
  cursemoor:       { key:'cursemoor',       name:'Cursemoor',           layer:'farm',     keepName:'Cursemoor Keep',            cx:427, cy:794, factions:['bountyhunters'] },

  // ── Holy Knights ─────────────────────────────────────────────────────────
  sanctumhold:     { key:'sanctumhold',     name:'Sanctumhold',         layer:'start',    keepName:'Sanctumhold Keep',          cx:788, cy:794, factions:['holyknights'] },
  blessedShore:    { key:'blessedShore',    name:'The Blessed Shore',   layer:'farm',     keepName:'The Blessed Shore Keep',    cx:795, cy:910, factions:['holyknights'] },
  hallowedGround:  { key:'hallowedGround',  name:'Hallowed Ground',     layer:'farm',     keepName:'Hallowed Ground Keep',      cx:788, cy:540, factions:['holyknights'] },
  pilgrimsRest:    { key:'pilgrimsRest',    name:"Pilgrim's Rest",      layer:'farm',     keepName:"Pilgrim's Rest Keep",       cx:975, cy:673, factions:['holyknights'] },
  sacredVale:      { key:'sacredVale',      name:'Sacred Vale',         layer:'farm',     keepName:'Sacred Vale Keep',          cx:975, cy:794, factions:['holyknights'] },
  dawnmarch:       { key:'dawnmarch',       name:'Dawnmarch',           layer:'farm',     keepName:'Dawnmarch Keep',            cx:1173,cy:794, factions:['holyknights'] },

  // ── Neutral / Conflict ────────────────────────────────────────────────────
  gallowsReach:    { key:'gallowsReach',    name:'Gallows Reach',       layer:'conflict', keepName:'Gallows Reach Keep',        cx:613, cy:141, factions:null },
  greyExpanse:     { key:'greyExpanse',     name:'The Grey Expanse',    layer:'conflict', keepName:'The Grey Expanse Keep',     cx:788, cy:141, factions:null },
  mistfall:        { key:'mistfall',        name:'Mistfall',            layer:'conflict', keepName:'Mistfall Keep',             cx:460, cy:242, factions:null },
  thornveil:       { key:'thornveil',       name:'Thornveil',           layer:'conflict', keepName:'Thornveil Keep',            cx:390, cy:308, factions:null },
  wanderingWastes: { key:'wanderingWastes', name:'Wandering Wastes',    layer:'conflict', keepName:'Wandering Wastes Keep',     cx:613, cy:274, factions:null },
  dreadmoor:       { key:'dreadmoor',       name:'Dreadmoor',           layer:'conflict', keepName:'Dreadmoor Keep',            cx:788, cy:274, factions:null },
  theHollow:       { key:'theHollow',       name:'The Hollow',          layer:'conflict', keepName:'The Hollow Keep',           cx:613, cy:407, factions:null },
  grimward:        { key:'grimward',        name:'Grimward',            layer:'conflict', keepName:'Grimward Keep',             cx:427, cy:540, factions:null },
  shatteredPass:   { key:'shatteredPass',   name:'Shattered Pass',      layer:'conflict', keepName:'Shattered Pass Keep',       cx:648, cy:510, factions:null },
  sunkenRoad:      { key:'sunkenRoad',      name:'Sunken Road',         layer:'conflict', keepName:'Sunken Road Keep',          cx:580, cy:578, factions:null },
  paleMarch:       { key:'paleMarch',       name:'The Pale March',      layer:'conflict', keepName:'The Pale March Keep',       cx:788, cy:673, factions:null },
  forsakenMarch:   { key:'forsakenMarch',   name:'Forsaken March',      layer:'conflict', keepName:'Forsaken March Keep',       cx:229, cy:673, factions:null },
};

export const REGION_LIST = Object.values(REGIONS);

// ── Polygons (1400×1000 HTML design space) ───────────────────────────────────
// Grid col boundaries: 130,328,526,701,876,1074,1272
// Grid row boundaries: 75,208,341,474,607,740,848
// Peninsulas are paths from the HTML exactly.
// Cut B (row1 col1): top-right tri = mistfall, bottom-left tri = thornveil
// Cut C (row2 col1): top-right tri = ashcrag,  bottom-left tri = cinderPass

export const POLYS = {
  // ── Holy Grail ─────────────────────────────────────────────────────────────
  holyGrail:       [[701,341],[876,341],[876,474],[701,474]],

  // ── Pirates ────────────────────────────────────────────────────────────────
  saltmere:        [[130,75],[328,75],[328,208],[130,208]],
  plunderMaw:      [[130,75],[300,75],[295,25],[255,0],[200,4],[148,22],[130,75]],
  brineHollow:     [[328,75],[526,75],[526,208],[328,208]],
  deadAnchor:      [[130,208],[328,208],[328,341],[130,341]],

  // ── Night Creatures ────────────────────────────────────────────────────────
  shadowmere:      [[1074,208],[1272,208],[1272,341],[1074,341]],
  theShroud:       [[1272,222],[1348,238],[1396,275],[1400,315],[1362,340],[1325,355],[1272,345]],
  crimsonVeil:     [[876,75],[1074,75],[1074,208],[876,208]],
  paleCourt:       [[1074,75],[1272,75],[1272,208],[1074,208]],
  duskHollow:      [[876,208],[1074,208],[1074,341],[876,341]],
  bloodfen:        [[1074,341],[1272,341],[1272,474],[1074,474]],

  // ── Dragons ────────────────────────────────────────────────────────────────
  emberpeak:       [[130,341],[328,341],[328,474],[130,474]],
  smolderingMaw:   [[130,355],[58,368],[8,418],[0,465],[38,498],[72,518],[130,508]],
  ashcrag:         [[328,341],[526,341],[526,474]],
  cinderPass:      [[328,341],[526,474],[328,474]],
  scorchveil:      [[130,474],[328,474],[328,607],[130,607]],

  // ── Orcs ───────────────────────────────────────────────────────────────────
  grimhold:        [[1074,474],[1272,474],[1272,607],[1074,607]],
  theWarground:    [[1272,488],[1348,505],[1396,558],[1400,608],[1355,635],[1318,650],[1272,638]],
  warbend:         [[876,341],[1074,341],[1074,474],[876,474]],
  bloodfield:      [[876,474],[1074,474],[1074,607],[876,607]],
  bonepile:        [[1074,607],[1272,607],[1272,740],[1074,740]],

  // ── Wizards (Bounty Hunters) ───────────────────────────────────────────────
  ashenveil:       [[526,740],[701,740],[701,848],[526,848]],
  arcaneDeep:      [[548,848],[562,898],[590,935],[622,968],[660,972],[695,970],[706,945],[712,920],[700,848]],
  hexmire:         [[328,607],[526,607],[526,740],[328,740]],
  ruinwatch:       [[526,607],[701,607],[701,740],[526,740]],
  ashenFen:        [[130,740],[328,740],[328,848],[130,848]],
  cursemoor:       [[328,740],[526,740],[526,848],[328,848]],

  // ── Holy Knights ──────────────────────────────────────────────────────────
  sanctumhold:     [[701,740],[876,740],[876,848],[701,848]],
  blessedShore:    [[728,848],[740,895],[762,932],[788,968],[822,972],[852,970],[862,945],[868,920],[854,848]],
  hallowedGround:  [[701,474],[876,474],[876,607],[701,607]],
  pilgrimsRest:    [[876,607],[1074,607],[1074,740],[876,740]],
  sacredVale:      [[876,740],[1074,740],[1074,848],[876,848]],
  dawnmarch:       [[1074,740],[1272,740],[1272,848],[1074,848]],

  // ── Neutral / Conflict ─────────────────────────────────────────────────────
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
  pirates:        { start: 'saltmere',   farm: 'brineHollow'   },
  nightcreatures: { start: 'shadowmere', farm: 'crimsonVeil'   },
  dragons:        { start: 'emberpeak',  farm: 'scorchveil'    },
  orcs:           { start: 'grimhold',   farm: 'bloodfield'    },
  bountyhunters:  { start: 'ashenveil',  farm: 'ruinwatch'     },
  holyknights:    { start: 'sanctumhold',farm: 'pilgrimsRest'  },
};

export const REGION_POWER = { start: 1, farm: 2, conflict: 3, ring: 4 };
