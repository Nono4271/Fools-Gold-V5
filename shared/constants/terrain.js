export const TERR_VIS = {
  grass:   { top:"#3a4e2e", topL:"#4a6038", lWall:"#242e1c", rWall:"#1c2416", elev:4 },
  forest:  { top:"#1e4a22", topL:"#2a6030", lWall:"#0e2810", rWall:"#0a200c", elev:4 },
  mountain:{ top:"#6a5c48", topL:"#8a7860", lWall:"#3a3028", rWall:"#2c2420", elev:4 },
  desert:  { top:"#8a7840", topL:"#a09050", lWall:"#5a4c28", rWall:"#443a20", elev:4 },
  ruin:    { top:"#3a3430", topL:"#504846", lWall:"#1e1c1a", rWall:"#181614", elev:4 },
  shore:   { top:"#b09060", topL:"#c8a870", lWall:"#7a6040", rWall:"#5a4830", elev:4 },
};

export const TERR = {
  grass:   { lbl:"Grassland", icon:"",   def:0,  w:40 },
  forest:  { lbl:"Forest",    icon:"🌲", def:15, w:25 },
  mountain:{ lbl:"Mountain",  icon:"⛰",  def:25, w:20 },
  desert:  { lbl:"Desert",    icon:"🏜",  def:0,  w:15 },
  ruin:    { lbl:"Ruin",      icon:"🏚",  def:20, w:0  },
  shore:   { lbl:"Shoreline", icon:"🏖",  def:0,  w:0  },
};

export const BIOME_SEEDS = (() => {
  let s = 0xdeadbeef|0;
  const rng = () => { s=(Math.imul(s,1664525)+1013904223)|0; return((s>>>0)/0xffffffff); };
  const seeds = [];
  const biomes = [
    { t:"grass",    n:60 },
    { t:"forest",   n:45 },
    { t:"mountain", n:40 },
    { t:"desert",   n:40 },
  ];
  biomes.forEach(({ t, n }) => {
    for (let i = 0; i < n; i++) {
      let c, r;
      do {
        c = Math.floor(rng() * 700);
        r = Math.floor(rng() * 700);
      } while (Math.max(c, r) < 50 && t !== "grass");
      seeds.push({ c, r, t });
    }
  });
  return seeds;
})();

export function clusteredTerrain(c, r) {
  let best = null, bestDist = Infinity;
  for (const s of BIOME_SEEDS) {
    const d = (c - s.c) ** 2 + (r - s.r) ** 2;
    if (d < bestDist) { bestDist = d; best = s.t; }
  }
  return best || "grass";
}

export function tileRng(c, r) {
  let s = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) | 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return ((s >>> 16) & 0x7fff) / 0x7fff;
  };
}

export function diamondPos(rnd, marginA = 0.85) {
  const a = rnd() - 0.5, b = rnd() - 0.5;
  return { dx: (a + b) * 36 * marginA, dy: (a - b) * 18 * marginA };
}
