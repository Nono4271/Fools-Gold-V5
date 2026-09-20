// ─────────────────────────────────────────────────────────────────────────────
//  mapRegions.js — shared mirror of the map's named region/keep list
//
//  The real, authoritative list (`REGION_LIST`) lives in
//  `src/workers/mapGen.worker.js` (a browser worker, not reachable from
//  `shared/`, which is meant to be usable by a future server too — same
//  "shared/ can't import from a browser worker" constraint already flagged
//  in the roadmap's technical-debt section). This file mirrors just the
//  fields camp placement needs (key, name, cx, cy, factions) — MUST STAY IN
//  SYNC with `REGION_LIST`/`FACTION_REGIONS` in mapGen.worker.js by hand
//  (same convention already used for `FACTION_BRANCHES_EXPORT` in
//  heroes.js, which carries an identical "must stay in sync" comment).
//
//  Adds one new derived concept for neutral-camp placement: `band` — which
//  third of the map (by row/`cy`) a region sits in. `ROWS = 1305` (from
//  mapGen.worker.js), so thirds are cy < 435 = "north" (top), 435-870 =
//  "mid" (middle), >= 870 = "south" (bottom). All 8 faction home regions
//  sit at the north/south edges; none are in the middle band — the middle
//  band is contested/neutral ground (Holy Grail + the 4 Ancient gate zones).
// ─────────────────────────────────────────────────────────────────────────────

export const MAP_ROWS = 1305;

export function regionBand(cy) {
  if (cy < 435) return "north";
  if (cy < 870) return "mid";
  return "south";
}

// Mirror of REGION_LIST from mapGen.worker.js — key, name, cx, cy, factions
// only (layer/keepName omitted, not needed for camp placement).
export const REGION_LIST = [
  { key:"shadowmere", name:"Skullcove", cx:102, cy:1232, factions:[] },
  { key:"icepeak", name:"Salthaven", cx:307, cy:1232, factions:["pirates"] },
  { key:"frosthold", name:"Deadmans Harbor", cx:512, cy:1232, factions:["pirates"] },
  { key:"icebreak", name:"Blackbrine", cx:717, cy:1232, factions:["pirates"] },
  { key:"drearfort", name:"Drearfort", cx:922, cy:1232, factions:[] },
  { key:"shadowmire", name:"Wraithmoor", cx:1127, cy:1232, factions:["ashen_dead"] },
  { key:"duskmire", name:"Bonehallow", cx:1332, cy:1232, factions:["ashen_dead"] },
  { key:"shadowfen", name:"Ghosthollow", cx:1537, cy:1232, factions:["ashen_dead"] },
  { key:"gravemist", name:"Gravemist", cx:1742, cy:1232, factions:[] },
  { key:"flamecrestpeak", name:"Bloodrock", cx:102, cy:1087, factions:["orcs"] },
  { key:"ebonvault", name:"Battlemarsh", cx:410, cy:1087, factions:["orcs"] },
  { key:"wraithmoor", name:"Nightmarsh", cx:717, cy:1087, factions:[] },
  { key:"deathmarsh", name:"Deathmarsh", cx:922, cy:1087, factions:[] },
  { key:"bleakstone", name:"Bleakstone", cx:1127, cy:1087, factions:[] },
  { key:"fellwood", name:"Steelwatch", cx:1435, cy:1087, factions:["holyknights"] },
  { key:"arcaneum", name:"Oathkeep", cx:1742, cy:1087, factions:["holyknights"] },
  { key:"cursedfen", name:"Wargrim", cx:102, cy:870, factions:["orcs"] },
  { key:"rotmire", name:"Warbane", cx:307, cy:942, factions:[] },
  { key:"blightmoor", name:"Blightmoor", cx:512, cy:942, factions:[] },
  { key:"skullcrag", name:"Skullcrag", cx:717, cy:942, factions:[] },
  { key:"ghosthollow", name:"Fellwood", cx:922, cy:942, factions:[] },
  { key:"doomspire", name:"Doomspire", cx:1127, cy:942, factions:[] },
  { key:"duskwood", name:"Duskwood", cx:1332, cy:942, factions:[] },
  { key:"gloomvale", name:"Stoneheart", cx:1537, cy:942, factions:[] },
  { key:"nightmarsh", name:"Lightshield", cx:1742, cy:870, factions:["holyknights"] },
  { key:"cryptwood", name:"Cryptwood", cx:307, cy:797, factions:[] },
  { key:"bonewood", name:"Bonewood", cx:512, cy:797, factions:[] },
  { key:"ashenvale", name:"Finalhope", cx:769, cy:761, factions:[] },
  { key:"thornvale", name:"Lastwatch", cx:1076, cy:761, factions:[] },
  { key:"grimstone", name:"Grimstone", cx:1332, cy:797, factions:[] },
  { key:"darkhollow", name:"Darkhollow", cx:1537, cy:797, factions:[] },
  { key:"blackstone", name:"Blackstone", cx:102, cy:652, factions:[] },
  { key:"deadwood", name:"Deadwood", cx:307, cy:652, factions:[] },
  { key:"frostbite", name:"Frostbite", cx:512, cy:652, factions:[] },
  { key:"holygrail", name:"Holy Grail", cx:922, cy:652, factions:[] },
  { key:"bloodmoor", name:"Bloodmoor", cx:1332, cy:652, factions:[] },
  { key:"wargrim", name:"Cursedfen", cx:1537, cy:652, factions:[] },
  { key:"icefall", name:"Ashenmark", cx:1742, cy:652, factions:[] },
  { key:"steelwatch", name:"Gloomvale", cx:307, cy:507, factions:[] },
  { key:"ironhold", name:"Ironhold", cx:512, cy:507, factions:[] },
  { key:"battlemarsh", name:"Dawngate", cx:769, cy:543, factions:[] },
  { key:"stormwatch", name:"Twilightspire", cx:1076, cy:543, factions:[] },
  { key:"tidecrag", name:"Tidecrag", cx:1332, cy:507, factions:[] },
  { key:"warbane", name:"Stormwatch", cx:1537, cy:507, factions:[] },
  { key:"lightshield", name:"Ebonvault", cx:102, cy:435, factions:["dragons"] },
  { key:"emberfang", name:"Emberfang", cx:307, cy:362, factions:[] },
  { key:"spellspire", name:"Thornvale", cx:512, cy:362, factions:[] },
  { key:"runestone", name:"Rotmire", cx:717, cy:362, factions:[] },
  { key:"skullcove", name:"Dreadmarsh", cx:922, cy:362, factions:[] },
  { key:"blackbrine", name:"Ironwood", cx:1127, cy:362, factions:[] },
  { key:"mysticfen", name:"Deepwater", cx:1332, cy:362, factions:[] },
  { key:"salthaven", name:"Runestone", cx:1537, cy:362, factions:[] },
  { key:"deepwater", name:"Spellspire", cx:1742, cy:435, factions:["wizards"] },
  { key:"bloodrock", name:"Flamecrest Peak", cx:102, cy:217, factions:["dragons"] },
  { key:"fogmire", name:"Fogmire", cx:410, cy:217, factions:["dragons"] },
  { key:"graveshroud", name:"Graveshroud", cx:717, cy:217, factions:[] },
  { key:"greywatch", name:"Greywatch", cx:922, cy:217, factions:[] },
  { key:"voidmarsh", name:"Voidmarsh", cx:1127, cy:217, factions:[] },
  { key:"stoneheart", name:"Mysticfen", cx:1435, cy:217, factions:["wizards"] },
  { key:"oathkeep", name:"Arcaneum", cx:1742, cy:217, factions:["wizards"] },
  { key:"ashenmark", name:"Icefall", cx:102, cy:72, factions:[] },
  { key:"dreadmarsh", name:"Icepeak", cx:307, cy:72, factions:["coldborns"] },
  { key:"deadmansharbor", name:"Frosthold", cx:512, cy:72, factions:["coldborns"] },
  { key:"ironwood", name:"Icebreak", cx:717, cy:72, factions:["coldborns"] },
  { key:"lastwatch", name:"Ashenvale", cx:922, cy:72, factions:[] },
  { key:"finalhope", name:"Shadowmere", cx:1127, cy:72, factions:["nightcreatures"] },
  { key:"bonehallow", name:"Duskmire", cx:1332, cy:72, factions:["nightcreatures"] },
  { key:"dawngate", name:"Shadowfen", cx:1537, cy:72, factions:["nightcreatures"] },
  { key:"twilightspire", name:"Shadowmire", cx:1742, cy:72, factions:[] },
].map(r => ({ ...r, band: regionBand(r.cy) }));

export const REGION_BY_KEY = new Map(REGION_LIST.map(r => [r.key, r]));

export const REGIONS_BY_BAND = { north: [], mid: [], south: [] };
for (const r of REGION_LIST) REGIONS_BY_BAND[r.band].push(r);

// The 4 Ancient gate zones, matched by NAME (their `key` fields are quirky
// leftovers of the region list's key/name mismatch — see the raw data above,
// e.g. the region named "Dawngate" has key "battlemarsh" — so this table
// looks them up by `name`, not `key`).
export const ANCIENT_ZONE_NAMES = ["Dawngate", "Twilightspire", "Lastwatch", "Finalhope"];

export function findRegionByName(name) {
  return REGION_LIST.find(r => r.name === name) ?? null;
}
