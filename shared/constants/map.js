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
1: { label:"1/hr",   color:"#6a9a6a", cmdLvl:1,  command:36,   ringPower:1   },
2: { label:"10/hr",  color:"#9a8a30", cmdLvl:4,  command:300,  ringPower:10  },
3: { label:"15/hr",  color:"#9a5a30", cmdLvl:6,  command:480,  ringPower:15  },
4: { label:"30/hr",  color:"#9a3030", cmdLvl:8,  command:960,  ringPower:30  },
5: { label:"40/hr",  color:"#7a3090", cmdLvl:10, command:1200, ringPower:40  },
6: { label:"60/hr",  color:"#4a30a0", cmdLvl:15, command:1800, ringPower:60  },
7: { label:"90/hr",  color:"#2030b0", cmdLvl:18, command:2160, ringPower:90  },
8: { label:"130/hr", color:"#1040c0", cmdLvl:25, command:3600, ringPower:130 },
9: { label:"150/hr", color:"#0858d0", cmdLvl:28, command:4200, ringPower:150 },
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
if (dist <= 25)  return 7;
if (dist <= 45)  return 6;
if (dist <= 60)  return 5;
if (dist <= 80)  return 4;
if (dist <= 180) return 3;
if (dist <= 320) return 2;
return 1;
}

// calcSiegePower — multi-slot or legacy single-branch.
// Multi-slot: calcSiegePower(troopSlots[], null, armySiegeBonus, FACTION_TROOPS)
// Legacy:     calcSiegePower(troops, troopBranch, armySiegeBonus, troopTierData)
export function calcSiegePower(troopsOrSlots, troopBranchOrNull, armySiegeBonus = 0, tierDataOrFactionTroops = null) {
  if (Array.isArray(troopsOrSlots)) {
    const slots = troopsOrSlots;
    const FT    = tierDataOrFactionTroops; // caller passes FACTION_TROOPS here
    if (!slots.length) return 0;
    let total = 0;
    for (const sl of slots) {
      if (!sl.troops || sl.troops <= 0) continue;
      const b  = sl.branch;
      const f  = FT?.[b?.faction];
      const br = f?.branches?.find(x => x.key === b?.branch);
      const td = br?.tiers?.[b?.tier ?? 0];
      const siegeRate = td ? (td.siege / Math.max(1, sl.troops)) : 0.5;
      total += Math.round(sl.troops * siegeRate);
    }
    return total + (armySiegeBonus || 0);
  }
  // Legacy: single troops count
  const troops = troopsOrSlots;
  const troopTierData = tierDataOrFactionTroops;
  if (!troops || troops <= 0) return 0;
  const siegeRate = troopTierData ? (troopTierData.siege / troops) : 0.5;
  return Math.round(troops * siegeRate + (armySiegeBonus || 0));
}
