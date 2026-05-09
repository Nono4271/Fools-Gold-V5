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

const TERRAIN_ENC = { grass:0, forest:1, mountain:2, desert:3 };
const TERRAIN_DEC = ["grass","forest","mountain","desert"];
const RSS_ENC     = { stone:1, wood:2, ore:3, gas:4 };
const RSS_DEC     = [null,"stone","wood","ore","gas"];
const TROOP_ENC   = { infantry:1, mage:2, spearmen:3, horsemen:4 };
const TROOP_DEC   = [null,"infantry","mage","spearmen","horsemen"];
const OWNER_ENC   = { player:1, ai:2, pirates:3, merfolk:4, marines:5, orcs:6, bountyhunters:7, dragons:8, holyknights:9, nightcreatures:10 };
const OWNER_DEC   = [null,"player","ai","pirates","merfolk","marines","orcs","bountyhunters","dragons","holyknights","nightcreatures"];

const F_KEEP     = 1<<1;
const F_KEEPPART = 1<<2;
const F_HQ       = 1<<3;
const F_HQPART   = 1<<4;
const F_WIN      = 1<<5;
const F_DEFEATED = 1<<6;

// ── Region list — v12 coordinates, 1400x1000 design space ────────────────────
const REGION_LIST = [
  { key:"holyGrail",         name:"The Holy Grail",          layer:"ring",     keepName:"The Holy Grail",              cx: 700, cy: 500 },
  { key:"shatteredShallows", name:"The Shattered Shallows",  layer:"conflict", keepName:"The Shattered Shallows Keep", cx: 689, cy: 280 },
  { key:"bloodmarch",        name:"Bloodmarch",              layer:"conflict", keepName:"Bloodmarch Keep",             cx: 929, cy: 500 },
  { key:"ashenRift",         name:"The Ashen Rift",          layer:"conflict", keepName:"The Ashen Rift Keep",         cx: 453, cy: 500 },
  { key:"brinefields",       name:"Brinefields",             layer:"farm",     keepName:"Brinefields Keep",            cx: 480, cy: 260 },
  { key:"coralfen",          name:"Coralfen",                layer:"farm",     keepName:"Coralfen Keep",               cx: 920, cy: 260 },
  { key:"stormwatch",        name:"Stormwatch",              layer:"farm",     keepName:"Stormwatch Keep",             cx:1020, cy: 295 },
  { key:"boneridge",         name:"Boneridge",               layer:"farm",     keepName:"Boneridge Keep",              cx:1020, cy: 710 },
  { key:"runemarks",         name:"Runemarks",               layer:"farm",     keepName:"Runemarks Keep",              cx: 380, cy: 710 },
  { key:"cinderplain",       name:"Cinderplain",             layer:"farm",     keepName:"Cinderplain Keep",            cx: 380, cy: 295 },
  { key:"saltmere",          name:"Saltmere",                layer:"start",    keepName:"Saltmere Keep",               cx: 200, cy: 100, factions:["pirates"]        },
  { key:"tidesreach",        name:"Tidesreach",              layer:"start",    keepName:"Tidesreach Keep",             cx:1200, cy: 100, factions:["merfolk"]         },
  { key:"ironhaven",         name:"Ironhaven",               layer:"start",    keepName:"Ironhaven Keep",              cx:1280, cy: 360, factions:["marines"]         },
  { key:"grimhold",          name:"Grimhold",                layer:"start",    keepName:"Grimhold Keep",               cx:1280, cy: 650, factions:["orcs"]            },
  { key:"ashenveil",         name:"Ashenveil",               layer:"start",    keepName:"Ashenveil Keep",              cx: 120, cy: 650, factions:["bountyhunters"]   },
  { key:"emberpeak",         name:"Emberpeak",               layer:"start",    keepName:"Emberpeak Keep",              cx: 120, cy: 360, factions:["dragons"]         },
  { key:"sanctumhold",       name:"Sanctumhold",             layer:"start",    keepName:"Sanctumhold Keep",            cx: 220, cy: 920, factions:["holyknights"]     },
  { key:"pilgrimfields",     name:"Pilgrimfields",           layer:"farm",     keepName:"Pilgrimfields Keep",          cx: 460, cy: 830, factions:["holyknights"]     },
  { key:"shadowmere",        name:"Shadowmere",              layer:"start",    keepName:"Shadowmere Keep",             cx:1180, cy: 920, factions:["nightcreatures"]  },
  { key:"darkfen",           name:"Darkfen",                 layer:"farm",     keepName:"Darkfen Keep",                cx: 940, cy: 830, factions:["nightcreatures"]  },
];

const FACTION_REGIONS = {
  pirates:        { start:"saltmere",    farm:"brinefields"   },
  merfolk:        { start:"tidesreach",  farm:"coralfen"      },
  marines:        { start:"ironhaven",   farm:"stormwatch"    },
  orcs:           { start:"grimhold",    farm:"boneridge"     },
  bountyhunters:  { start:"ashenveil",   farm:"runemarks"     },
  dragons:        { start:"emberpeak",   farm:"cinderplain"   },
  holyknights:    { start:"sanctumhold", farm:"pilgrimfields" },
  nightcreatures: { start:"shadowmere",  farm:"darkfen"       },
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
const TERRAIN_NAMES = ["grass","forest","mountain","desert"];

const POLYS = {
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
  const flagArr     = new Uint8Array(SIZE);
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
        troopBranch:{ faction:"marines", branch:"wardens", tier:2 }, lvl:KEEP_CMD_LVL, troops:KEEP_TROOPS,
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
    merfolk:        { n:"Tidesreach Warden",       icon:"🌊"  },
    marines:        { n:"Ironhaven Commander",     icon:"⚔"   },
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

  postMessage({ type:"progress", pct:92, label:"Finding spawn points..." });

  const spawnKeys={}, usedKeys=new Set();
  for (const fk of ["pirates","merfolk","marines","orcs","bountyhunters","dragons","holyknights","nightcreatures"]) {
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
      TERRAIN_DEC, RSS_DEC, TROOP_DEC, OWNER_DEC,
      F_KEEP, F_KEEPPART, F_HQ, F_HQPART, F_WIN, F_DEFEATED,
    },
    spawnKeys,
  }, transferables);
};
