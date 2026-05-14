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
1: { label:"1/hr",   color:"#6a9a6a", cmdLvl:1,  command:0.30,  ringPower:1   },
2: { label:"10/hr",  color:"#9a8a30", cmdLvl:4,  command:2.50,  ringPower:10  },
3: { label:"15/hr",  color:"#9a5a30", cmdLvl:6,  command:4.00,  ringPower:15  },
4: { label:"30/hr",  color:"#9a3030", cmdLvl:8,  command:8.00,  ringPower:30  },
5: { label:"40/hr",  color:"#7a3090", cmdLvl:10, command:10.00, ringPower:40  },
6: { label:"60/hr",  color:"#4a30a0", cmdLvl:15, command:15.00, ringPower:60  },
7: { label:"90/hr",  color:"#2030b0", cmdLvl:18, command:18.00, ringPower:90  },
8: { label:"130/hr", color:"#1040c0", cmdLvl:25, command:30.00, ringPower:130 },
9: { label:"150/hr", color:"#0858d0", cmdLvl:28, command:35.00, ringPower:150 },
10:{ label:"200/hr", color:"#7010e0", cmdLvl:35, command:55.00, ringPower:200 },
11:{ label:"230/hr", color:"#9010c0", cmdLvl:40, command:65.00, ringPower:230 },
12:{ label:"260/hr", color:"#b010a0", cmdLvl:45, command:75.00, ringPower:260 },
13:{ label:"300/hr", color:"#d01080", cmdLvl:50, command:90.00, ringPower:300 },
};

// XP per command point consumed, by troop tier (0-indexed)
export const XP_PER_COMMAND = { 0: 4.8, 1: 7.2, 2: 10.2 };

export const SIEGE_BASE          = 50;
export const SIEGE_HQ_BASE       = 50000;
export const SIEGE_KEEP_BASE     = 5000;
export const SIEGE_RESET_MS         = 900000;   // 15 min — regular tiles
export const KEEP_GARRISON_RESET_MS = 3600000;  // 1 hr  — keeps
export const GATE_GARRISON_RESET_MS = 3600000;  // 1 hr  — crossings/tunnels/toll bridges

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
      // td.siege is a per-troop siege value — multiply directly by troop count
      const siegeRate = td ? td.siege : 0.5;
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

// ── Wizard's Tomes level-up power costs ──────────────────────────────────────
// Index n = power needed to go from level n → level n+1
// 126 entries → supports levels 0–125
// Lv0→1 costs 1 (tutorial hook). Targets: Lv10 ~day 2-3, Lv30 ~day 7, Lv50 ~day 14.
// Cost to go from level N → N+1 (index = current level, 0-indexed, 125 entries for levels 0–124).
// Lv0→1 costs 1 (tutorial hook).
// Calibrated to: Lv10 ≈ day 1 (12hrs @ 2k/hr), Lv30 ≈ day 8, Lv50 ≈ day 14,
//   Lv80 ≈ day 21, Lv100 ≈ day 28, Lv120 ≈ day 35, Lv125 ≈ day 38 (40-day season).
// Power rates: day1 2k/hr (12hr), days2-4 5k/hr, days5-8 8k/hr,
//   days9-14 12.5k/hr, days15-21 18.5k/hr, days22-28 23.5k/hr, days29+ 26.5k/hr.
export const TOMES_LEVEL_COST = [
  1, 400, 700, 1100, 1600, 2200, 2900, 3700, 4700, 6599,
  38000, 39579, 41158, 42737, 44316, 45895, 47474, 49053, 50632, 52211,
  53789, 55368, 56947, 58526, 60105, 61684, 63263, 64842, 66421, 68000,
  80000, 81053, 82105, 83158, 84211, 85263, 86316, 87368, 88421, 89474,
  90526, 91579, 92632, 93684, 94737, 95789, 96842, 97895, 98947, 100000,
  92000, 92793, 93586, 94379, 95172, 95966, 96759, 97552, 98345, 99138,
  99931, 100724, 101517, 102310, 103103, 103897, 104690, 105483, 106276, 107069,
  107862, 108655, 109448, 110241, 111034, 111828, 112621, 113414, 114207, 115000,
  180000, 181842, 183684, 185526, 187368, 189211, 191053, 192895, 194737, 196579,
  198421, 200263, 202105, 203947, 205789, 207632, 209474, 211316, 213158, 215000,
  214000, 214947, 215895, 216842, 217789, 218737, 219684, 220632, 221579, 222526,
  223474, 224421, 225368, 226316, 227263, 228211, 229158, 230105, 231053, 232000,
  360000, 375000, 388000, 395000, 390000,
];
export const TOMES_MAX_LEVEL = 125;
