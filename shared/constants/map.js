export const RSS = {
stone: { lbl:"Stone", icon:"🪨", col:"#9898b0", bg:"rgba(100,100,130,.2)" },
wood:  { lbl:"Wood",  icon:"🪵", col:"#a07840", bg:"rgba(130,90,40,.2)"  },
ore:   { lbl:"Ore",   icon:"⛏",  col:"#4a90c0", bg:"rgba(40,100,160,.2)" },
gas:   { lbl:"Gas",   icon:"⚗",  col:"#80b040", bg:"rgba(80,150,40,.2)"  },
};
export const RKEYS = Object.keys(RSS);

export const TC = {
neutral:      { base:"#252830", bdr:"#353840", dot:"#555560" },
player:       { base:"#163020", bdr:"#266838", dot:"#3daa60", hq:"#0c4018" },
ai:           { base:"#280808", bdr:"#702020", dot:"#dd3322", hq:"#3c0606" },
pirates:      { base:"#2a1a08", bdr:"#6a3a10", dot:"#d4832a", hq:"#3a1a04" },
marines:      { base:"#0a1830", bdr:"#1a4080", dot:"#4488cc", hq:"#081020" },
bountyhunters:{ base:"#12101e", bdr:"#503878", dot:"#9955dd", hq:"#0e0b18" },
merfolk:      { base:"#081a28", bdr:"#105a78", dot:"#30b8c8", hq:"#041018" },
orcs:         { base:"#0e1e08", bdr:"#304a10", dot:"#6aa830", hq:"#081004" },
dragons:      { base:"#1e0808", bdr:"#701010", dot:"#cc3030", hq:"#140404" },
};

// HQP is now dynamic — player/AI HQs are placed randomly inside their faction's starting region.
// This object is kept for backwards compat but should not be used for spawn positioning.
// Actual HQ keys are passed at game start via genMap().
export const HQP = { player:{ c:87, r:254 }, ai:{ c:613, r:254 } };
export const AI_HQ_KEY = `${HQP.ai.c},${HQP.ai.r}`;

// The Holy Grail — center of 700x700 map
export const WIN_C = 350;
export const WIN_R = 350;
export const WIN_KEY = `${WIN_C},${WIN_R}`;

export const POWER_DEFS = {
1: { label:"I",   color:"#6a9a6a", cmdLvl:2,  troops:200,  xpReward:30  },
2: { label:"II",  color:"#9a8a30", cmdLvl:6,  troops:600,  xpReward:80  },
3: { label:"III", color:"#9a5a30", cmdLvl:10, troops:1000, xpReward:180 },
4: { label:"IV",  color:"#9a3030", cmdLvl:15, troops:1500, xpReward:350 },
};

export const SIEGE_BASE          = 50;
export const SIEGE_HQ_BASE       = 50000;
export const SIEGE_KEEP_BASE     = 5000;   // keep tiles
export const SIEGE_RESET_MS      = 60000;  // regular tiles
export const KEEP_GARRISON_RESET_MS = 600000; // keeps: 10 min garrison revival

export function hqSiegeValue(wallLvl) {
return SIEGE_HQ_BASE + (wallLvl || 0) * 10000;
}

// tilePowerLevel is now driven by region layer — see regions.js
// This fallback uses distance from center for tiles not in any region
export function tilePowerLevel(c, r) {
const cx = 350, cy = 350;
const dist = Math.max(Math.abs(c - cx), Math.abs(r - cy));
if (dist <= 60)  return 4;
if (dist <= 120) return 3;
if (dist <= 220) return 2;
return 1;
}

export function calcSiegePower(troops, troopType, armySiegeBonus = 0) {
if (!troops || troops <= 0) return 0;
const SIEGE_RATES = {
infantry: 1.0,
mage:     0.3,
spearmen: 0.8,
horsemen: 0.5,
};
const siegeRate = SIEGE_RATES[troopType] || 0;
return Math.round(troops * siegeRate + armySiegeBonus);
}
