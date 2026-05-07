export const RSS_BLDGS = new Set(["quarry", "lumber", "forge", "refinery"]);

export const BLDG = {
hq:            { n:"HQ",               icon:"🏰", max:10, desc:"Seat of power. Gates all other building upgrades. Most costly to upgrade.",    cost:{ stone:800, wood:600, ore:400, gas:300 } },
quarry:        { n:"Quarry",           icon:"🪨", max:20, desc:"Produces Stone. Lv1=+50/s, Lv20=+5000/s.",                                     cost:{ stone:50,  wood:30,  ore:10,  gas:0  }, rss:"stone" },
lumber:        { n:"Lumber Mill",      icon:"🪵", max:20, desc:"Produces Wood. Lv1=+50/s, Lv20=+5000/s.",                                      cost:{ stone:30,  wood:50,  ore:10,  gas:0  }, rss:"wood"  },
forge:         { n:"Ore Forge",        icon:"⛏",  max:20, desc:"Produces Ore. Lv1=+50/s, Lv20=+5000/s.",                                       cost:{ stone:40,  wood:20,  ore:0,   gas:0  }, rss:"ore"   },
refinery:      { n:"Refinery",         icon:"⚗",  max:20, desc:"Produces Gas. Lv1=+50/s, Lv20=+5000/s.",                                       cost:{ stone:60,  wood:40,  ore:30,  gas:0  }, rss:"gas"   },
barracks:      { n:"Barracks",         icon:"🏕",  max:10, desc:"Increases max troop capacity. Lv1=2k, Lv10=90k.",                              cost:{ stone:80,  wood:80,  ore:40,  gas:20 } },
training:      { n:"Training Grounds", icon:"⚔️",  max:10, desc:"Increases max training batch size. Always trainable even at Lv0.",             cost:{ stone:60,  wood:60,  ore:30,  gas:10 } },
commandcenter: { n:"Command Center",   icon:"📡", max:10, desc:"+300 Command to all commanders per level.",                                      cost:{ stone:150, wood:120, ore:80,  gas:60 } },
healingtent:   { n:"Healing Tent",     icon:"⛺", max:10, desc:"Heals wounded troops. +5/s per level.",                                         cost:{ stone:60,  wood:80,  ore:60,  gas:0  } },
walls:         { n:"Walls",            icon:"🛡",  max:10, desc:"Increases HQ siege HP. Lv1=+10k, Lv10=+100k.",                                cost:{ stone:100, wood:60,  ore:0,   gas:0  } },
};

export function barracksCapacity(lvl) {
if (lvl <= 0) return 2000;
return Math.round(2000 * Math.pow(45, (lvl - 1) / 9));
}

export function trainingBatches(lvl) {
const base = [100, 300];
if (lvl >= 2)  base.push(500);
if (lvl >= 4)  base.push(1000);
if (lvl >= 6)  base.push(2000);
if (lvl >= 8)  base.push(5000);
if (lvl >= 10) base.push(10000);
return base;
}

export function maxTrainBatch(lvl) {
const batches = trainingBatches(lvl);
return batches[batches.length - 1];
}

export function trainRate(lvl) {
return Math.round(1 + lvl * 4.9);
}

export function rssRate(lvl) {
// Lv1 = 50/s, Lv20 = 5000/s — exponential curve
if (lvl <= 0) return 0;
return Math.round(50 * Math.pow(100, (lvl - 1) / 19));
}

export function maxAvailLevel(type, hqLvl) {
const absMax = BLDG[type].max;
if (type === "hq") return absMax;
const avail = RSS_BLDGS.has(type) ? hqLvl * 2 : hqLvl;
return Math.min(absMax, avail);
}

export function upgCost(type, lvl) {
const b = BLDG[type].cost;
const m = Math.pow(1.8, lvl);
return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v * m)]));
}

export function upgDuration(type, newLevel) {
if (type === "hq") return newLevel * 60000;
const isMilitary = ["barracks","training","commandcenter","walls","healingtent"].includes(type);
return newLevel * (isMilitary ? 30000 : 20000);
}

export function cmdCommand(lvl, ccLvl, leaderBonus = 0) {
return (lvl || 5) * 120 + (ccLvl || 0) * 300 + leaderBonus;
}
