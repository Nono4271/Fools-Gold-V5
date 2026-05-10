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
bountyhunters:{ base:"#12101e", bdr:"#503878", dot:"#9955dd", hq:"#0e0b18" },
orcs:         { base:"#0e1e08", bdr:"#304a10", dot:"#6aa830", hq:"#081004" },
dragons:      { base:"#1e0808", bdr:"#701010", dot:"#cc3030", hq:"#140404" },
holyknights:  { base:"#1a1408", bdr:"#6a5010", dot:"#d4af37", hq:"#100c04" },
nightcreatures:{ base:"#0d0010", bdr:"#3a0848", dot:"#a030c0", hq:"#080008" },
};

// HQP fallback — actual spawn is random inside faction start region
export const HQP = { player:{ c:363, r:200 }, ai:{ c:1037, r:200 } };
export const AI_HQ_KEY = `${HQP.ai.c},${HQP.ai.r}`;

// Win tile — Holy Grail keep (cx:788, cy:407 from regions.js)
export const WIN_C = 788;
export const WIN_R = 407;
export const WIN_KEY = `${WIN_C},${WIN_R}`;

export const POWER_DEFS = {
1: { label:"1/hr",  color:"#6a9a6a", cmdLvl:1,  troops:36,  ringPower:1  },
2: { label:"10/hr", color:"#9a8a30", cmdLvl:4,  troops:300, ringPower:10 },
3: { label:"15/hr", color:"#9a5a30", cmdLvl:6,  troops:480, ringPower:15 },
4: { label:"30/hr", color:"#9a3030", cmdLvl:8,  troops:960, ringPower:30 },
};

// XP per command point consumed, by troop tier (0-indexed)
export const XP_PER_COMMAND = { 0: 4.8, 1: 7.2, 2: 10.2 };

export const SIEGE_BASE          = 50;
export const SIEGE_HQ_BASE       = 50000;
export const SIEGE_KEEP_BASE     = 5000;
export const SIEGE_RESET_MS      = 60000;
export const KEEP_GARRISON_RESET_MS = 600000;

export function hqSiegeValue(wallLvl) {
return SIEGE_HQ_BASE + (wallLvl || 0) * 10000;
}

export function tilePowerLevel(c, r) {
const cx = 788, cy = 407;
const dist = Math.max(Math.abs(c - cx), Math.abs(r - cy));
if (dist <= 80)  return 4;
if (dist <= 180) return 3;
if (dist <= 320) return 2;
return 1;
}

export function calcSiegePower(troops, troopBranch, armySiegeBonus = 0, troopTierData = null) {
  if (!troops || troops <= 0) return 0;
  const siegeRate = troopTierData ? (troopTierData.siege / troops) : 0.5;
  return Math.round(troops * siegeRate + (armySiegeBonus || 0));
}
