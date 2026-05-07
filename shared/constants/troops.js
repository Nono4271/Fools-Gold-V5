export const TROOP = {
  infantry: {
    label:"Infantry", icon:"🗡",  color:"#c8a060",
    desc:"Sword & shield soldiers",
    dmgType:"physical",
    hp:120, atk:85, def:90, focus:25, spd:45, siege:1.0,
    strong:["mage"],
    weak:  ["horsemen"],
  },
  mage: {
    label:"Mage",     icon:"🧙", color:"#70b870",
    desc:"Arcane spellcasters",
    dmgType:"magical",
    hp:70,  atk:40, def:45, focus:110, spd:72, siege:0.3,
    strong:["spearmen"],
    weak:  ["infantry"],
  },
  spearmen: {
    label:"Spearmen", icon:"🪃", color:"#8888e8",
    desc:"Pike & spear formation",
    dmgType:"physical",
    hp:100, atk:75, def:70, focus:15, spd:58, siege:0.8,
    strong:["horsemen"],
    weak:  ["mage"],
  },
  horsemen: {
    label:"Horsemen", icon:"🐴", color:"#d08040",
    desc:"Fast mounted cavalry",
    dmgType:"physical",
    hp:90,  atk:95, def:60, focus:20, spd:110, siege:0.5,
    strong:["infantry"],
    weak:  ["spearmen"],
  },
};

export const TROOP_KEYS = Object.keys(TROOP);

export const CMD_LVL_MIN = 5;
export const CMD_LVL_MAX = 50;

export function xpToNext(lvl) {
  return Math.floor(100 * Math.pow(1.18, lvl - CMD_LVL_MIN));
}

export function troopModifier(atkType, defType) {
  if (!atkType || !defType) return 1.0;
  if (TROOP[atkType]?.strong.includes(defType)) return 1.1;
  if (TROOP[atkType]?.weak.includes(defType))   return 0.9;
  return 1.0;
}
