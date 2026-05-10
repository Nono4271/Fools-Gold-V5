import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, memo } from "react";
import * as PIXI from "pixi.js";
import { COLS, ROWS, TW, TH, TOP_PAD, ISO_W, ISO_H } from "../shared/constants/geometry.js";

/* ─── Tile geometry ──────────────────────────────────────────────────────── */
function isoXY(c, r) {
  return {
    cx: (c - r) * (TW / 2) + (ROWS * TW / 2),
    cy: (c + r) * (TH / 2) + TOP_PAD,
  };
}

/* ─── Hex string → number ────────────────────────────────────────────────── */
const hc = h => parseInt(h.slice(1), 16);

/* ─── Terrain palette ────────────────────────────────────────────────────── */
const TV = {
  grass:    { base: hc('#4a6838'), lite: hc('#5a7a44'), shad: hc('#3a5428') },
  forest:   { base: hc('#2a5e2c'), lite: hc('#327034'), shad: hc('#1e4a20') },
  mountain: { base: hc('#7a6e58'), lite: hc('#948264'), shad: hc('#5e5444') },
  desert:   { base: hc('#c4a85a'), lite: hc('#d4b86a'), shad: hc('#a88e44') },
  ruin:     { base: hc('#4a4440'), lite: hc('#585050'), shad: hc('#363030') },
  shore:    { base: hc('#b09868'), lite: hc('#c0a878'), shad: hc('#907850') },
};
const TV_DEF = TV.grass;

/* ─── Resource prop colors ───────────────────────────────────────────────── */
const RC = {
  wood:  { a: 0x2a5a1e, b: 0x3a7a2a, c: 0x1a4010 },
  stone: { a: 0x7a7a8a, b: 0xa0a0b0, c: 0x4a4a5a },
  ore:   { a: 0x4a6a8a, b: 0x5a8aaa, c: 0x2a4a6a },
  gas:   { a: 0x4a8a50, b: 0x6aaa70, c: 0x2a6030 },
};

/* ─── Pan clamping ───────────────────────────────────────────────────────── */
function clampPan(x, y, zoom = 1) {
  const scaledW = ISO_W * zoom;
  const scaledH = ISO_H * zoom;
  return {
    x: Math.min(60, Math.max(-(scaledW - window.innerWidth + 60), x)),
    y: Math.min(60, Math.max(-(scaledH - (window.innerHeight - 40) + 60), y)),
  };
}

/* ─── World coords to tile key ───────────────────────────────────────────── */
function worldToKey(wx, wy, tiles) {
  const u = wx - ROWS * TW / 2;
  const v = wy - TOP_PAD;
  const cEst = Math.round((u / (TW / 2) + v / (TH / 2)) / 2);
  const rEst = Math.round((v / (TH / 2) - u / (TW / 2)) / 2);

  // Fast path: try the exact estimate first (hits ~80% of clicks without looping)
  {
    const c = cEst, r = rEst;
    if (c >= 0 && r >= 0 && c < COLS && r < ROWS) {
      const key = `${c},${r}`;
      const tile = tiles[key];
      if (tile && !tile.isKeep && !tile.isKeepPart) {
        const { cx, cy } = isoXY(c, r);
        const elev = tile.isHQ ? 14 : tile.isWin ? 10 : 4;
        const sy = cy - elev;
        if (Math.abs(wx - cx) / (TW / 2) + Math.abs(wy - (sy + TH / 2)) / (TH / 2) <= 1.08) return key;
      }
    }
  }

  // Slow path: ±2 scan for edge/elevation cases
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue; // already checked above
      const c = cEst + dc, r = rEst + dr;
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
      const key = `${c},${r}`;
      if (!tiles[key]) continue;
      const tile = tiles[key];
      if (tile.isKeep || tile.isKeepPart) continue; // keep layer handles these
      const { cx, cy } = isoXY(c, r);
      const elev = tile.isHQ ? 14 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
      const sy = cy - elev;
      if (Math.abs(wx - cx) / (TW / 2) + Math.abs(wy - (sy + TH / 2)) / (TH / 2) <= 1.08) return key;
    }
  }
  return null;
}

/* ─── Deterministic per-tile RNG ─────────────────────────────────────────── */
function tileRng(c, r) {
  let s = (((c + 1) * 73856093) ^ ((r + 1) * 19349663)) | 0;
  return () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 16) & 0x7fff) / 0x7fff; };
}

/* ─── Commander tile index ───────────────────────────────────────────────── */
function buildCByTile(cmds) {
  const m = {};
  cmds.forEach(c => { if (!c.tk) return; (m[c.tk] = m[c.tk] || []).push(c); });
  return m;
}

/* ─── Pre-compute per-tile base color (fixed-size flat array) ────────────────
   Fix #7: The old unbounded Map grew forever — one entry per unique (c,r,terrain)
   triple, never evicted. We replace it with a Uint32Array sized exactly to the
   map (COLS × ROWS). Entries start at 0 (sentinel = not yet computed).
   First access computes and stores; every subsequent access is a single array
   index. Memory is bounded and constant regardless of session length.          */
const TILE_COLOR_CACHE = new Uint32Array(COLS * ROWS); // 0 = uncomputed sentinel
function getTileBaseColor(c, r, terrain) {
  const idx = r * COLS + c;
  if (TILE_COLOR_CACHE[idx] !== 0) return TILE_COLOR_CACHE[idx];
  const v = TV[terrain] || TV_DEF;
  const rng = tileRng(c, r);
  const nudge = (rng() - 0.5) * 0.06;
  const br = (v.base >> 16) & 0xff, bg = (v.base >> 8) & 0xff, bb = v.base & 0xff;
  const col = (Math.max(0, Math.min(255, Math.round(br + br * nudge))) << 16) |
              (Math.max(0, Math.min(255, Math.round(bg + bg * nudge))) << 8)  |
               Math.max(0, Math.min(255, Math.round(bb + bb * nudge)));
  // Avoid storing 0 as a computed value (it's our sentinel).
  // Pure black (0x000000) would be stored as 1 — close enough for terrain nudges.
  TILE_COLOR_CACHE[idx] = col || 1;
  return col;
}

/* ══════════════════════════════════════════════════════════════════════════
   SINGLE-PASS DRAW FUNCTIONS
   All visible tiles drawn into ONE Graphics object per layer.
   No per-tile scene graph nodes. Camera moves = zero draw calls.
══════════════════════════════════════════════════════════════════════════ */

function drawAllTiles(gfx, tiles, rMin, rMax, cMin, cMax, selKey, mode, cByTile, mvCmdUid, zoom = 1) {
  gfx.clear();
  const dMin = cMin + rMin, dMax = cMax + rMax;
  for (let d = dMin; d <= dMax; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile) continue;

      const { terrain, owner, isHQ, isWin, isKeep, isKeepPart, isHQPart, isShore } = tile;

      if (isShore) {
        const { cx, cy } = isoXY(c, r);
        const mid = cy + TH / 2;
        const TOP = [cx, cy, cx+TW/2, mid, cx, cy+TH, cx-TW/2, mid];
        gfx.beginFill(0x1a3a5c); gfx.drawPolygon(TOP); gfx.endFill();
        continue;
      }

      // Keep and keepPart tiles — render as plain ground only.
      // The keep layer (buildKeepLayer) handles all visuals and interaction.
      if (isKeep || isKeepPart) {
        const { cx, cy } = isoXY(c, r);
        const mid = cy + TH / 2;
        const TOP = [cx, cy, cx+TW/2, mid, cx, cy+TH, cx-TW/2, mid];
        gfx.beginFill(getTileBaseColor(c, r, "grass")); gfx.drawPolygon(TOP); gfx.endFill();
        continue;
      }

      const key = `${c},${r}`;
      const isSel    = selKey === key;
      const isMvTgt  = mode === "selectMarchDest" && mvCmdUid && owner === "player";
      const hasCmds  = Boolean(cByTile[key]?.length);
      const elev     = (isHQ||isHQPart) ? 14 : isWin ? 10 : (isKeep||isKeepPart) ? 8 : 4;
      const { cx, cy } = isoXY(c, r);
      const sy  = cy - elev;
      const mid = sy + TH / 2;

      const TOP      = [cx, sy, cx+TW/2, mid, cx, sy+TH, cx-TW/2, mid];

      const drawAsKeep = isKeep || isKeepPart;
      const drawAsHQ   = isHQ   || isHQPart;

      if (isWin && !owner) {
        gfx.beginFill(0x2a2000);       gfx.drawPolygon(TOP); gfx.endFill();
        gfx.beginFill(0xf0c040, 0.55); gfx.drawPolygon(TOP); gfx.endFill();
        if (zoom >= 0.75) { gfx.lineStyle(2, 0xf0c040, 0.8); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
      } else {
        gfx.beginFill(getTileBaseColor(c, r, terrain)); gfx.drawPolygon(TOP); gfx.endFill();
        // Shade triangles removed — they created a visible X/cross pattern on each tile.
      }

      if (owner) {
        const ot = owner === "player" ? 0x1ea0b4 : 0xdc3c28;
        gfx.beginFill(ot, 0.18); gfx.drawPolygon(TOP); gfx.endFill();
        if (!isSel) { gfx.lineStyle(2, ot, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
      }

      if (mode === "selectMarchDest" && owner !== "player") {
        gfx.beginFill(0x000000, 0.45); gfx.drawPolygon(TOP); gfx.endFill();
      }
      if (isMvTgt) {
        gfx.beginFill(0x28dc6e, 0.22); gfx.drawPolygon(TOP); gfx.endFill();
      }
      if (hasCmds && !isSel) {
        gfx.lineStyle(2, 0xf0dc3c, 0.9); gfx.drawPolygon(TOP); gfx.lineStyle(0);
      }

      if (isSel) {
        gfx.lineStyle(2.5, 0xffffff, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0);
      }
    }
  }
}

function drawAllProps(gfx, tiles, rMin, rMax, cMin, cMax) {
  gfx.clear();
  const dMin = cMin + rMin, dMax = cMax + rMax;
  for (let d = dMin; d <= dMax; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile || tile.isHQ || tile.isWin || tile.isKeep || tile.isKeepPart || tile.isHQPart || tile.isShore) continue;
      const { cx, cy } = isoXY(c, r);
      const sy = cy - 4;
      if (tile.rss) {
        drawRssProp(gfx, tile.rss, cx, sy, c, r, tile.powerLevel || 1);
      } else if (!tile.owner) {
        drawAmbientScatter(gfx, tile, cx, sy);
      }
    }
  }
}

// iOS-only ultra-simple props: one small isometric diamond per resource tile.
// drawRssProp uses 16–38 ellipse/circle fan draws per tile (each ellipse = 54
// triangle vertices). For 200+ resource tiles that's 95k+ triangles → 6-second
// GPU-upload freeze on the rAF following the idle callback.
// A 4-vertex diamond = 2 trivial triangles (EARCUT is O(1) for n=4).
// 200 tiles → 400 triangles → <5 ms. No ellipses, no circles, no fans.
function drawAllPropsNoScatter(gfx, tiles, rMin, rMax, cMin, cMax) {
  gfx.clear();
  const hw = TW * 0.18;  // diamond half-width  (pixels, world space)
  const hh = TH * 0.18;  // diamond half-height
  const dMin = cMin + rMin, dMax = cMax + rMax;
  for (let d = dMin; d <= dMax; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile || !tile.rss || tile.isHQ || tile.isWin || tile.isKeep ||
          tile.isKeepPart || tile.isHQPart || tile.isShore) continue;
      const { cx, cy } = isoXY(c, r);
      const base = cy - 4 + TH * 0.5; // tile surface centre (sy + TH/2)
      const color = tile.rss === "wood"  ? 0x2a7a20
                  : tile.rss === "stone" ? 0x8a8a9a
                  : tile.rss === "ore"   ? 0xd4a020
                  :                        0x3a8a28; // gas
      gfx.beginFill(color, 0.90);
      // 4-vertex isometric diamond — 2 triangles, EARCUT trivial for n=4
      gfx.drawPolygon([cx, base - hh, cx + hw, base, cx, base + hh, cx - hw, base]);
      gfx.endFill();
    }
  }
}

function drawRssProp(gfx, rss, cx, sy, c, r, pl) {
  const rnd  = tileRng(c, r);
  // sy is the top of the tile face; surface center is sy + TH/2
  const base = sy + TH / 2;   // tile surface center — props sit here, grow UP (y decreases)
  const s    = TH * 0.82;     // scale relative to tile height

  if (rss === "wood") {
    // ── Pine tree cluster ─────────────────────────────────────────────────────
    const count = Math.min(3, 1 + Math.floor(pl / 2));
    const offsets = [[-0.22, 0.06, 0.80, 0.55], [0.20, 0.05, 0.65, 0.48], [0.00, -0.02, 0.90, 0.62]];
    // ground shadow
    gfx.beginFill(0x000000, 0.20); gfx.drawEllipse(cx, base + s*0.07, s*0.38, s*0.09); gfx.endFill();
    for (let i = 0; i < count; i++) {
      const [dxr, dyr, hr, wr] = offsets[i];
      const tx   = cx + dxr * s + (rnd()-0.5)*s*0.06;
      const tbase= base + dyr * s;
      const h    = s * hr;
      const hw   = s * wr * 0.5;
      // trunk
      gfx.beginFill(0x3a2010); gfx.drawRect(tx - s*0.02, tbase - h*0.12, s*0.04, h*0.14); gfx.endFill();
      // 4 canopy tiers, wide at bottom narrowing to tip
      const tiers = [[0.00,0.28,0.50],[0.22,0.48,0.38],[0.42,0.65,0.27],[0.60,0.82,0.16]];
      const dark  = [0x0e2010, 0x163014, 0x1e4018, 0x264e1c];
      const lite  = [0x1e4020, 0x2a5a28, 0x3a7030, 0x4a8838];
      tiers.forEach(([t0, t1, hwr], ti) => {
        const boty = tbase - h * t0;
        const topy = tbase - h * t1;
        const thw  = hw * hwr;
        gfx.beginFill(dark[ti]); gfx.drawPolygon([tx,topy, tx-thw,boty, tx,boty]); gfx.endFill();
        gfx.beginFill(lite[ti]); gfx.drawPolygon([tx,topy, tx,boty, tx+thw,boty]); gfx.endFill();
      });
    }

  } else if (rss === "stone") {
    // ── Chunky boulder cluster ────────────────────────────────────────────────
    gfx.beginFill(0x000000, 0.28); gfx.drawEllipse(cx, base+s*0.05, s*0.36, s*0.10); gfx.endFill();
    const boulders = [
      [-0.16, 0.04, 0.22, 0.28],
      [ 0.14, 0.02, 0.20, 0.24],
      [ 0.00,-0.03, 0.26, 0.34],
      [-0.08, 0.06, 0.14, 0.18],
    ];
    const order = [1, 3, 0, 2];
    order.forEach(i => {
      const [dxr, dyr, wr, hr] = boulders[i];
      const bx   = cx + dxr * s + (rnd()-0.5)*s*0.04;
      const by   = base + dyr * s;
      const bh   = s * hr;
      const hw   = s * wr * 0.5;
      const top  = by - bh;
      // left dark face
      gfx.beginFill(0x3a3830);
      gfx.drawPolygon([bx-hw*0.6,by, bx-hw*0.8,by-bh*0.5, bx-hw*0.2,top, bx+hw*0.1,by-bh*0.3]);
      gfx.endFill();
      // top face
      gfx.beginFill(0x7a7468);
      gfx.drawPolygon([bx-hw*0.2,top, bx+hw*0.4,top+bh*0.15, bx+hw*0.6,by-bh*0.4, bx+hw*0.1,by-bh*0.3]);
      gfx.endFill();
      // right face
      gfx.beginFill(0x585450);
      gfx.drawPolygon([bx+hw*0.1,by-bh*0.3, bx+hw*0.6,by-bh*0.4, bx+hw*0.7,by, bx-hw*0.6,by]);
      gfx.endFill();
      // highlight
      gfx.beginFill(0xb4afa5, 0.22); gfx.drawEllipse(bx+hw*0.1, top+bh*0.2, hw*0.3, bh*0.12); gfx.endFill();
    });

  } else if (rss === "ore") {
    // ── Gold nuggets half-buried ──────────────────────────────────────────────
    gfx.beginFill(0x000000, 0.25); gfx.drawEllipse(cx, base+s*0.05, s*0.38, s*0.10); gfx.endFill();
    const nuggets = [
      [-0.18, 0.03, 0.12, 0.09],
      [ 0.10, 0.02, 0.10, 0.08],
      [-0.02,-0.02, 0.14, 0.10],
      [ 0.22, 0.04, 0.09, 0.07],
      [-0.10, 0.05, 0.08, 0.06],
    ];
    const order = [1, 4, 3, 0, 2];
    order.forEach(i => {
      const [dxr, dyr, rxr, ryr] = nuggets[i];
      const nx  = cx + dxr * s + (rnd()-0.5)*s*0.03;
      const ny  = base + dyr * s;
      const rx  = s * rxr, ry = s * ryr;
      // dirt socket
      gfx.beginFill(0x1e1c14); gfx.drawEllipse(nx, ny+ry*0.5, rx*1.1, ry*0.5); gfx.endFill();
      // nugget — 3 tone approximation of radial gradient
      gfx.beginFill(0x4a2e08); gfx.drawEllipse(nx, ny, rx, ry*0.85); gfx.endFill();
      gfx.beginFill(0xc89030); gfx.drawEllipse(nx-rx*0.1, ny-ry*0.12, rx*0.75, ry*0.65); gfx.endFill();
      gfx.beginFill(0xf0d060); gfx.drawEllipse(nx-rx*0.22, ny-ry*0.28, rx*0.38, ry*0.30); gfx.endFill();
      // specular
      gfx.beginFill(0xfffce0, 0.45); gfx.drawEllipse(nx-rx*0.25, ny-ry*0.30, rx*0.28, ry*0.18); gfx.endFill();
      // ore flecks
      gfx.beginFill(0x64c8ff, 0.70); gfx.drawCircle(nx-rx*0.12, ny-ry*0.05, s*0.012); gfx.endFill();
      gfx.beginFill(0x64c8ff, 0.70); gfx.drawCircle(nx+rx*0.08, ny+ry*0.05, s*0.010); gfx.endFill();
    });

  } else {
    // ── Gas: bubbling pit with rising vapor ───────────────────────────────────
    // pit depression
    gfx.beginFill(0x080e04); gfx.drawEllipse(cx, base, s*0.28, s*0.11); gfx.endFill();
    gfx.beginFill(0x121a06); gfx.drawEllipse(cx, base, s*0.20, s*0.07); gfx.endFill();
    // rim
    gfx.lineStyle(s*0.018, 0x2a3a10, 0.8);
    gfx.drawEllipse(cx, base, s*0.28, s*0.11);
    gfx.lineStyle(0);
    // bubbles on surface
    const bubbles = [[-0.10,0.02,0.055],[0.08,-0.02,0.045],[0.01,0.04,0.050],[-0.18,0.00,0.030]];
    bubbles.forEach(([dxr,dyr,rr]) => {
      const bx = cx+dxr*s, by = base+dyr*s, br = rr*s;
      gfx.beginFill(0x3c5a0a, 0.70); gfx.drawEllipse(bx, by, br, br*0.38); gfx.endFill();
      gfx.beginFill(0xa0d232, 0.30); gfx.drawEllipse(bx-br*0.25, by-br*0.10, br*0.30, br*0.10); gfx.endFill();
    });
    // vapor puffs rising UP
    const vents = [[-0.01,0.80],[-0.12,0.55],[0.13,0.50]];
    vents.forEach(([vxr, vh], vi) => {
      const vx = cx + vxr*s;
      for (let i = 0; i < 8; i++) {
        const t   = i / 8;
        const py  = base - t * vh * s;          // UP from surface
        const px  = vx + Math.sin(t*3.5+vi*1.2)*s*0.04;
        const r   = s*0.025 + t*s*0.065;
        const a   = (1-t)*0.38;
        gfx.beginFill(0x78be28, a); gfx.drawCircle(px, py, r); gfx.endFill();
      }
    });
  }
}

function drawAmbientScatter(gfx, tile, cx, sy) {
  const { c, r, terrain } = tile;
  const rnd = tileRng(c, r);
  const cy2 = sy + TH / 2;
  const v = TV[terrain] || TV_DEF;
  if (terrain === "grass" || terrain === "forest") {
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.72, dy = (rnd()-0.5)*TH*0.55, sz = 1.5+rnd()*2.5;
      gfx.beginFill(rnd()>0.5?v.lite:v.base, 0.55); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.9,sz*0.5); gfx.endFill();
    }
  } else if (terrain === "mountain" || terrain === "ruin") {
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.68, dy = (rnd()-0.5)*TH*0.52, sz = 1.5+rnd()*2;
      gfx.beginFill(v.shad,0.5); gfx.drawEllipse(cx+dx+0.5,cy2+dy+0.5,sz*0.9,sz*0.55); gfx.endFill();
      gfx.beginFill(v.lite,0.6); gfx.drawEllipse(cx+dx,cy2+dy,sz*0.9,sz*0.55); gfx.endFill();
    }
  } else {
    const n = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const dx = (rnd()-0.5)*TW*0.74, dy = (rnd()-0.5)*TH*0.56, sz = 1+rnd()*1.5;
      gfx.beginFill(v.lite,0.35); gfx.drawEllipse(cx+dx,cy2+dy,sz*1.4,sz*0.6); gfx.endFill();
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   KEEP LAYER — one large interactive landmark per keep, above tile layer.
   Styled after RotK: a wide isometric fortress footprint with towers,
   walls, and a banner. Fully clickable as a single unit.
══════════════════════════════════════════════════════════════════════════ */

const KEEP_REGION_LIST = [
  // Holy Grail
  { key:"holyGrail",       cx: 788, cy: 407, isWin:true  },
  // Pirates
  { key:"saltmere",        cx: 229, cy: 141, isWin:false },
  { key:"plunderMaw",      cx: 215, cy:  42, isWin:false },
  { key:"brineHollow",     cx: 427, cy: 141, isWin:false },
  { key:"deadAnchor",      cx: 229, cy: 274, isWin:false },
  // Night Creatures
  { key:"shadowmere",      cx:1173, cy: 274, isWin:false },
  { key:"theShroud",       cx:1334, cy: 288, isWin:false },
  { key:"crimsonVeil",     cx: 975, cy: 141, isWin:false },
  { key:"paleCourt",       cx:1173, cy: 141, isWin:false },
  { key:"duskHollow",      cx: 975, cy: 274, isWin:false },
  { key:"bloodfen",        cx:1173, cy: 407, isWin:false },
  // Dragons
  { key:"emberpeak",       cx: 229, cy: 407, isWin:false },
  { key:"smolderingMaw",   cx:  55, cy: 437, isWin:false },
  { key:"ashcrag",         cx: 460, cy: 375, isWin:false },
  { key:"cinderPass",      cx: 390, cy: 432, isWin:false },
  { key:"scorchveil",      cx: 229, cy: 540, isWin:false },
  // Orcs
  { key:"grimhold",        cx:1173, cy: 540, isWin:false },
  { key:"theWarground",    cx:1334, cy: 563, isWin:false },
  { key:"warbend",         cx: 975, cy: 407, isWin:false },
  { key:"bloodfield",      cx: 975, cy: 540, isWin:false },
  { key:"bonepile",        cx:1173, cy: 673, isWin:false },
  // Wizards (Bounty Hunters)
  { key:"ashenveil",       cx: 613, cy: 794, isWin:false },
  { key:"arcaneDeep",      cx: 628, cy: 910, isWin:false },
  { key:"hexmire",         cx: 427, cy: 673, isWin:false },
  { key:"ruinwatch",       cx: 613, cy: 673, isWin:false },
  { key:"ashenFen",        cx: 229, cy: 794, isWin:false },
  { key:"cursemoor",       cx: 427, cy: 794, isWin:false },
  // Holy Knights
  { key:"sanctumhold",     cx: 788, cy: 794, isWin:false },
  { key:"blessedShore",    cx: 795, cy: 910, isWin:false },
  { key:"hallowedGround",  cx: 788, cy: 540, isWin:false },
  { key:"pilgrimsRest",    cx: 975, cy: 673, isWin:false },
  { key:"sacredVale",      cx: 975, cy: 794, isWin:false },
  { key:"dawnmarch",       cx:1173, cy: 794, isWin:false },
  // Neutral / Conflict
  { key:"gallowsReach",    cx: 613, cy: 141, isWin:false },
  { key:"greyExpanse",     cx: 788, cy: 141, isWin:false },
  { key:"mistfall",        cx: 460, cy: 242, isWin:false },
  { key:"thornveil",       cx: 390, cy: 308, isWin:false },
  { key:"wanderingWastes", cx: 613, cy: 274, isWin:false },
  { key:"dreadmoor",       cx: 788, cy: 274, isWin:false },
  { key:"theHollow",       cx: 613, cy: 407, isWin:false },
  { key:"grimward",        cx: 427, cy: 540, isWin:false },
  { key:"shatteredPass",   cx: 648, cy: 510, isWin:false },
  { key:"sunkenRoad",      cx: 580, cy: 578, isWin:false },
  { key:"paleMarch",       cx: 788, cy: 673, isWin:false },
  { key:"forsakenMarch",   cx: 229, cy: 673, isWin:false },
];

function drawKeepGfx(gfx, bx, by, owner, isWin, isSelected) {
  const isPlayer  = owner === "player";
  const isAi      = owner === "ai"    ;
  const fc  = isPlayer ? 0x4dcc70 : isAi ? 0xdd4422 : isWin ? 0xf0c040 : 0xc8a060;
  const fc2 = isPlayer ? 0x1a5228 : isAi ? 0x5c1008 : isWin ? 0x7a6010 : 0x6a5020;
  const wall= isPlayer ? 0x2a7a40 : isAi ? 0x882010 : isWin ? 0xb08828 : 0x8a6c30;

  gfx.clear();

  // ── Ground shadow ellipse ──
  gfx.beginFill(0x000000, 0.28);
  gfx.drawEllipse(bx, by + 6, 38, 14);
  gfx.endFill();

  // ── Base courtyard — wide isometric diamond ──
  gfx.beginFill(fc2);
  gfx.drawPolygon([
    bx,      by - 28,
    bx + 36, by - 10,
    bx,      by + 8,
    bx - 36, by - 10,
  ]);
  gfx.endFill();

  // ── Courtyard lit face (right) ──
  gfx.beginFill(fc, 0.35);
  gfx.drawPolygon([bx, by - 28, bx + 36, by - 10, bx + 36, by - 2, bx, by - 20]);
  gfx.endFill();

  // ── Outer walls — four segments tracing the diamond ──
  gfx.lineStyle(2.5, wall, 0.9);
  gfx.drawPolygon([
    bx,      by - 28,
    bx + 36, by - 10,
    bx,      by + 8,
    bx - 36, by - 10,
    bx,      by - 28,
  ]);
  gfx.lineStyle(0);

  // ── Corner towers (4 diamonds, one per corner) ──
  const towers = [
    [bx,      by - 30],   // top
    [bx + 36, by - 12],   // right
    [bx,      by + 6],    // bottom
    [bx - 36, by - 12],   // left
  ];
  for (const [tx, ty] of towers) {
    const ts = 7;
    gfx.beginFill(fc2);
    gfx.drawPolygon([tx, ty-ts, tx+ts*0.75, ty, tx, ty+ts*0.6, tx-ts*0.75, ty]);
    gfx.endFill();
    gfx.beginFill(fc, 0.5);
    gfx.drawPolygon([tx, ty-ts, tx+ts*0.75, ty, tx+ts*0.75, ty+ts*0.25, tx, ty-ts*0.35]);
    gfx.endFill();
    // Battlements
    for (let bi = -1; bi <= 1; bi++) {
      gfx.beginFill(fc);
      gfx.drawRect(tx + bi * 3.5 - 1, ty - ts - 3, 2, 3);
      gfx.endFill();
    }
  }

  // ── Central keep tower ──
  const kh = 22;
  gfx.beginFill(fc2);
  gfx.drawPolygon([bx, by-28-kh, bx+10, by-22-kh, bx, by-16-kh, bx-10, by-22-kh]);
  gfx.endFill();
  gfx.beginFill(fc, 0.55);
  gfx.drawPolygon([bx, by-28-kh, bx+10, by-22-kh, bx+10, by-14-kh, bx, by-20-kh]);
  gfx.endFill();
  // Keep battlements
  for (let bi = -2; bi <= 2; bi++) {
    gfx.beginFill(fc);
    gfx.drawRect(bx + bi * 3.5 - 1.5, by - 28 - kh - 4, 3, 4);
    gfx.endFill();
  }

  // ── Banner / flag on keep tower ──
  const flagCol = isWin ? 0xf0c040 : fc;
  gfx.lineStyle(1.2, 0x000000, 0.6);
  gfx.moveTo(bx, by - 28 - kh - 4);
  gfx.lineTo(bx, by - 28 - kh - 14);
  gfx.lineStyle(0);
  gfx.beginFill(flagCol, 0.95);
  gfx.drawPolygon([bx, by-28-kh-14, bx+9, by-28-kh-10, bx, by-28-kh-7]);
  gfx.endFill();

  // ── Holy Grail crown ring ──
  if (isWin) {
    gfx.lineStyle(2, 0xf0c040, 0.7);
    gfx.drawEllipse(bx, by - 16, 42, 16);
    gfx.lineStyle(0);
    gfx.beginFill(0xf0c040, 0.9);
    for (let pi = 0; pi < 5; pi++) {
      const a = (pi / 5) * Math.PI * 2 - Math.PI / 2;
      const px2 = bx + Math.cos(a) * 44;
      const py2 = by - 16 + Math.sin(a) * 17;
      gfx.drawPolygon([px2-3, py2-2, px2, py2-7, px2+3, py2-2]);
    }
    gfx.endFill();
  }

}

// Fix #8: Selective keep rebuild.
// Track last-rendered state per keep (owner + isSelected). Only destroy+rebuild
// a keep's container when its state actually changes. Unchanged keeps are left
// untouched. Each group is tagged with __keepKey for targeted lookup.
const _keepStateCache = new Map(); // tileKey → { owner, isSelected }

// Call this whenever the tile map is fully reset (e.g. new game) so keeps rebuild from scratch.
export function clearKeepCache() { _keepStateCache.clear(); }

function _buildOneKeep(tileKey, reg, tile, selKey, onKeepClick, PIXI) {
  const { cx: bx, cy: worldCY } = isoXY(reg.cx, reg.cy);
  const elev = 8;
  const by   = worldCY - elev - 10;
  const gy   = worldCY;
  const FOOTPRINT = [
     bx,        gy - 200,
     bx + 440,  gy +  20,
     bx,        gy + 240,
     bx - 440,  gy +  20,
  ];
  const isSelected = selKey === tileKey;
  const owner      = tile.owner || null;

  const group = new PIXI.Container();
  group.__keepKey = tileKey;

  if (isSelected) {
    const outlineGfx = new PIXI.Graphics();
    outlineGfx.lineStyle(3, 0xffffff, 0.95);
    outlineGfx.drawPolygon(FOOTPRINT);
    outlineGfx.lineStyle(1, 0xffffff, 0.25);
    outlineGfx.drawPolygon([bx, gy-193, bx+433, gy+20, bx, gy+233, bx-433, gy+20]);
    outlineGfx.lineStyle(0);
    group.addChild(outlineGfx);
  }

  const gfx = new PIXI.Graphics();
  drawKeepGfx(gfx, bx, by, owner, reg.isWin, false);
  group.addChild(gfx);

  const hit = new PIXI.Graphics();
  hit.beginFill(0xffffff, 0.001);
  hit.drawRect(bx - 440, gy - 200, 880, 440);
  hit.endFill();
  hit.hitArea     = new PIXI.Polygon(FOOTPRINT);
  hit.interactive = true;
  hit.buttonMode  = true;
  hit.cursor      = "pointer";
  hit.on("pointerdown", (e) => {
    e.stopPropagation();
    onKeepClick(tileKey, e.data?.originalEvent || e);
  });
  group.addChild(hit);
  return group;
}

function buildKeepLayer(keepCont, tiles, selKey, onKeepClick, PIXI) {
  for (const reg of KEEP_REGION_LIST) {
    const tileKey = `${reg.cx},${reg.cy}`;
    const tile    = tiles[tileKey];
    if (!tile) continue;

    const isSelected = selKey === tileKey;
    const owner      = tile.owner || null;
    const prev       = _keepStateCache.get(tileKey);

    // Nothing changed for this keep — skip it entirely
    if (prev && prev.owner === owner && prev.isSelected === isSelected) continue;

    // Remove only this keep's old group
    for (let i = keepCont.children.length - 1; i >= 0; i--) {
      const child = keepCont.children[i];
      if (child.__keepKey === tileKey) {
        keepCont.removeChild(child);
        child.destroy({ children: true });
        break;
      }
    }

    keepCont.addChild(_buildOneKeep(tileKey, reg, tile, selKey, onKeepClick, PIXI));
    _keepStateCache.set(tileKey, { owner, isSelected });
  }
}

function drawMarchLines(gfx, cmds, reinMarches, tiles) {
  gfx.clear();
  const drawPath = (path, col) => {
    if (path.length < 2) return;
    const pts = path.map(k => {
      const [tc, tr] = k.split(",").map(Number);
      const t = tiles[k];
      const elev = t?.isHQ ? 14 : t?.isWin ? 10 : t?.isKeep ? 8 : 4;
      const { cx, cy } = isoXY(tc, tr);
      return { x: cx, y: cy - elev + TH / 2 };
    });
    gfx.lineStyle(5, 0x000000, 0.32);
    gfx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(2.5, col, 0.9);
    gfx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => gfx.lineTo(p.x, p.y));
    gfx.lineStyle(0);
    const last = pts[pts.length-1];
    gfx.beginFill(col,0.18); gfx.drawCircle(last.x,last.y,8); gfx.endFill();
    gfx.beginFill(col,0.85); gfx.drawCircle(last.x,last.y,5); gfx.endFill();
    gfx.beginFill(0xffffff,0.9); gfx.drawCircle(last.x,last.y,2.5); gfx.endFill();
  };
  cmds.forEach(cmd => {
    if (!cmd.march || cmd.owner !== "player") return;
    const m = cmd.march;
    drawPath(m.path.slice(m.step), 0x4488ff);
  });
  (reinMarches || []).forEach(rm => drawPath(rm.path.slice(rm.step), 0x88aaff));
}

function drawCmdIcons(gfx, textCont, cmds, tiles) {
  gfx.clear();
  if (textCont) {
    const toDestroy = [...textCont.children];
    toDestroy.forEach(c => { textCont.removeChild(c); c.destroy(); });
  }
  const byTile = buildCByTile(cmds);
  for (const [key, tileCmds] of Object.entries(byTile)) {
    const tile = tiles[key];
    if (!tile) continue;
    const { cx, cy } = isoXY(tile.c, tile.r);
    const elev = tile.isHQ ? 14 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
    const sy = cy - elev;
    const playerG = tileCmds.filter(c => c.owner === "player");
    const aiG = tileCmds.filter(c => c.owner !== "player");
    const groups = [];
    if (playerG.length) groups.push({ cmds: playerG, col: 0xf0dc3c });
    if (aiG.length)     groups.push({ cmds: aiG,     col: 0xdd3322 });
    groups.forEach(({ cmds: grp, col }, gi) => {
      const ey = sy + TH * 0.72 - gi * 6;
      gfx.beginFill(col, 0.13); gfx.lineStyle(1.4, col, 1); gfx.drawEllipse(cx,ey,15,5); gfx.lineStyle(0); gfx.endFill();
      const visible = grp.slice(0, 3);
      const spacing = visible.length > 1 ? 14 : 0;
      visible.forEach((cmd, i) => {
        const dx = (i - (visible.length-1)/2) * spacing;
        gfx.beginFill(0x000000,0.45); gfx.drawCircle(cx+dx+1,ey-10,9); gfx.endFill();
        gfx.beginFill(col,0.9);       gfx.drawCircle(cx+dx,  ey-11,9); gfx.endFill();
        gfx.beginFill(0x000000,0.55); gfx.drawCircle(cx+dx,  ey-11,7); gfx.endFill();
        if (textCont && cmd.icon) {
          const txt = new PIXI.Text(cmd.icon, { fontSize: 10, align: "center" });
          txt.anchor.set(0.5, 0.5); txt.x = cx+dx; txt.y = ey-11;
          textCont.addChild(txt);
        }
      });
      if (grp.length > 3) { gfx.beginFill(col,0.7); gfx.drawCircle(cx+14,ey-8,5); gfx.endFill(); }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MAP RENDERER COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export const MapRenderer = memo(forwardRef(function MapRenderer({ tiles, cmds, selKey, mode, mvCmd, reinMarchesRef, panRef: panRefProp, zoomRef: zoomRefProp, ZOOM_LEVELS, onTileClick, onPanChange, onZoomChange }, ref) {
  const containerRef   = useRef(null);
  const appRef         = useRef(null);
  const worldRef       = useRef(null);

  const tileFrontRef   = useRef(null);
  const tileBackRef    = useRef(null);
  const propsFrontRef  = useRef(null);
  const propsBackRef   = useRef(null);
  const marchGfxRef    = useRef(null);
  const cmdGfxRef      = useRef(null);
  const cmdTextContRef = useRef(null);
  const keepContRef    = useRef(null);

  const lastBoundsRef  = useRef(null);
  const redrawRef      = useRef(null);
  const cByTileRef     = useRef({});

  // Use the refs passed from Game directly — no prop-to-ref sync needed,
  // and no reactive prop changes that would re-render MapRenderer.
  const panRef   = panRefProp  || useRef({ x:4, y:4 });   // eslint-disable-line react-hooks/rules-of-hooks
  const zoomRef  = zoomRefProp || useRef(1.25);            // eslint-disable-line react-hooks/rules-of-hooks
  const tilesRef = useRef(tiles);
  const cmdsRef  = useRef(cmds);
  const fallbackReinRef = useRef([]);
  const reinRef = reinMarchesRef || fallbackReinRef;
  const selRef   = useRef(selKey);
  const modeRef  = useRef(mode);
  const mvCmdRef = useRef(mvCmd);
  const ZOOM_REF = useRef(ZOOM_LEVELS);

  const onTileClickRef  = useRef(onTileClick);
  const onPanChangeRef  = useRef(onPanChange);
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => { selRef.current = selKey; }, [selKey]);
  useEffect(() => { modeRef.current  = mode; },        [mode]);
  useEffect(() => { mvCmdRef.current = mvCmd; },       [mvCmd]);
  useEffect(() => { onTileClickRef.current  = onTileClick; },  [onTileClick]);
  useEffect(() => { onPanChangeRef.current  = onPanChange; },  [onPanChange]);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);
  useEffect(() => { ZOOM_REF.current = ZOOM_LEVELS; }, [ZOOM_LEVELS]);

  useImperativeHandle(ref, () => ({
    teleport(px, py) {
      panRef.current = { x: px, y: py };
      if (worldRef.current) {
        worldRef.current.x = px;
        worldRef.current.y = py;
        worldRef.current.scale.set(zoomRef.current);
      }
      lastBoundsRef.current = null;
      redrawRef.current?.redraw(true);
    },
    redrawOverlays() {
      redrawRef.current?.redrawOverlays();
    },
    // Called immediately from patchTile so tile color updates without waiting
    // for the React effect chain (tiles prop → useEffect → redraw).
    forceRedrawTiles(newTiles) {
      tilesRef.current = newTiles;
      lastBoundsRef.current = null;
      redrawRef.current?.markPropsDirty();
      redrawRef.current?.redraw(true);
      redrawRef.current?.redrawKeeps();
    },
  }), []);

  const tDragFrom      = useRef({ x: 0, y: 0 });
  const tDidDrag       = useRef(false);
  const pinchDist0     = useRef(null);
  const pinchZoom0     = useRef(zoomRef.current);
  const isPanning      = useRef(false);
  const panEndTimer    = useRef(null);
  const panNotifyTimer = useRef(null);

  /* ── INIT PIXI ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = Math.max(200, el.clientWidth  || window.innerWidth);
    const h = Math.max(200, el.clientHeight || (window.innerHeight - 38));
    let app;
    try {
      app = new PIXI.Application({ width:w, height:h, backgroundColor:0x080c10,
        antialias:false, resolution:Math.min(window.devicePixelRatio||1,2), autoDensity:true });
    } catch(_) {
      try { app = new PIXI.Application({ width:w, height:h, backgroundColor:0x080c10, forceCanvas:true }); }
      catch(e2) { console.warn("PixiJS init failed:", e2); return; }
    }
    app.view.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
    el.appendChild(app.view);
    appRef.current = app;

    // Detect iOS early — needed for both props-sprite setup and phase-2 skip.
    // iOS 16+ has requestIdleCallback so we can't use its presence as a proxy.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const world = new PIXI.Container();
    app.stage.addChild(world);
    worldRef.current = world;
    world.x = panRef.current.x;
    world.y = panRef.current.y;
    world.scale.set(zoomRef.current);

    const tileGfx  = new PIXI.Graphics(); world.addChild(tileGfx);
    tileFrontRef.current = tileGfx; tileBackRef.current = tileGfx;
    const propsGfx = new PIXI.Graphics(); world.addChild(propsGfx);
    propsFrontRef.current = propsGfx; propsBackRef.current = propsGfx;

    // ── iOS sprite-based props ────────────────────────────────────────────────
    // Pre-render each resource type ONCE to a RenderTexture at startup.
    // EARCUT / fan-tessellation runs exactly once per resource type here.
    // After that, every props update just repositions Sprite instances
    // (textured quads = 2 trivial triangles, zero tessellation ever again).
    // Textures are in world-pixel space; zoom is handled by the world container.
    const TEX_W      = TW;                       // 80 px
    const TEX_H      = Math.round(TH * 2);       // 106 px
    const TEX_BASE_Y = Math.round(TEX_H * 0.72); // ~76 px — tile surface centre in texture
    const TEX_SY     = TEX_BASE_Y - TH / 2;      // sy arg = top-of-tile-face in texture
    const TEX_CX     = TEX_W / 2;                // 40 px

    const rssTextures       = {};   // rss string → PIXI.RenderTexture
    const propsSpritePool   = [];   // recycled PIXI.Sprite instances
    const propsSpriteContainer = new PIXI.Container();

    if (isIOS) {
      propsGfx.visible = false; // Graphics layer unused on iOS
      world.addChild(propsSpriteContainer); // sits between tiles and keeps
      const tmpGfx = new PIXI.Graphics();
      for (const rss of ["wood", "stone", "ore", "gas"]) {
        // Use fixed seed (c=5, r=3) and pl=4 so all tiles share one high-detail
        // texture per resource type — tiny visual compromise, massive perf gain.
        const rt = PIXI.RenderTexture.create({
          width: TEX_W, height: TEX_H,
          resolution: app.renderer.resolution,
        });
        tmpGfx.clear();
        drawRssProp(tmpGfx, rss, TEX_CX, TEX_SY, 5, 3, 4);
        app.renderer.render(tmpGfx, { renderTexture: rt });
        rssTextures[rss] = rt;
      }
      tmpGfx.destroy();
    }

    const keepCont = new PIXI.Container(); 
    keepCont.interactiveChildren = true;
    world.addChild(keepCont); keepContRef.current = keepCont;
    const selGfx = new PIXI.Graphics(); world.addChild(selGfx);
    const marchGfx = new PIXI.Graphics(); world.addChild(marchGfx); marchGfxRef.current = marchGfx;
    const cmdGfx = new PIXI.Graphics(); world.addChild(cmdGfx); cmdGfxRef.current = cmdGfx;
    const cmdTextCont = new PIXI.Container(); world.addChild(cmdTextCont); cmdTextContRef.current = cmdTextCont;

    function drawSelection(key) {
      selGfx.clear();
      if (!key) return;
      const [sc, sr] = key.split(",").map(Number);
      const tile = tilesRef.current[key];
      if (!tile || tile.isKeep || tile.isKeepPart) return; // keep layer handles its own selection
      const elev = (tile.isHQ||tile.isHQPart) ? 14 : tile.isWin ? 10 : (tile.isKeep||tile.isKeepPart) ? 8 : 4;
      const { cx, cy } = isoXY(sc, sr);
      const sy2 = cy - elev;
      const mid = sy2 + TH / 2;
      const TOP = [cx, sy2, cx+TW/2, mid, cx, sy2+TH, cx-TW/2, mid];
      selGfx.lineStyle(2.5, 0xffffff, 0.9);
      selGfx.drawPolygon(TOP);
      selGfx.lineStyle(0);
    }

    function getViewBounds(buf = 4) {
      const pan = panRef.current, zoom = zoomRef.current;
      const vw = window.innerWidth, vh = window.innerHeight;
      const wxL = (-pan.x)/zoom, wxR = (-pan.x+vw)/zoom;
      const wyT = (-pan.y)/zoom, wyB = (-pan.y+vh)/zoom;
      const toC = (wx,wy) => ((wx-ROWS*TW/2)/(TW/2)+(wy-TOP_PAD)/(TH/2))/2;
      const toR = (wx,wy) => ((wy-TOP_PAD)/(TH/2)-(wx-ROWS*TW/2)/(TW/2))/2;
      const cs = [toC(wxL,wyT),toC(wxR,wyT),toC(wxL,wyB),toC(wxR,wyB)];
      const rs = [toR(wxL,wyT),toR(wxR,wyT),toR(wxL,wyB),toR(wxR,wyB)];
      return {
        rMin: Math.max(0,       Math.floor(Math.min(...rs))-buf),
        rMax: Math.min(ROWS-1,  Math.ceil( Math.max(...rs))+buf),
        cMin: Math.max(0,       Math.floor(Math.min(...cs))-buf),
        cMax: Math.min(COLS-1,  Math.ceil( Math.max(...cs))+buf),
      };
    }

    // Props dirty flag — set true on first draw and whenever tile state changes.
    // Props are now drawn asynchronously (idle-deferred) to avoid blocking rAF.
    let propsDirty = true; // true on first draw and whenever tiles change
    const markPropsDirty = () => { propsDirty = true; };

    // ── Props are expensive: each tile spawns 5-40 complex polygon draw calls
    // (pine tree tiers, boulder faces, ore nuggets, gas vents, ambient scatter).
    // Pixi EARCUT-tessellates ALL of them inside renderer.render() on the next rAF
    // after a Graphics.clear()+redraw. On iOS this blocks the main thread for 1-3s.
    //
    // Key insight: props live in *world space*. During/after a pan, the world
    // container moves but props are still correct — no need to clear+redraw them.
    // We only need to redraw props when tile *state* changes (propsDirty) or when
    // the viewport has panned so far that new tiles are visible outside the last
    // rendered prop buffer.
    //
    // Strategy:
    //  - propsBoundsRef tracks the last bounds used for props (with a large buf=10)
    //  - drawPhase always redraws the TILES layer (fast: convex quads, trivial EARCUT)
    //  - drawPhase redraws props ONLY when propsDirty OR viewport exits propsBoundsRef
    //  - When props need redrawing, defer it to requestIdleCallback (no timeout) so
    //    it only runs when the browser is truly idle — never blocking input.

    const propsBoundsRef = { current: null };
    let propsIdleHandle  = null;
    const PROPS_BUF = 10; // pre-render 10 tiles beyond viewport for props

    const cancelPropsIdle = () => {
      if (propsIdleHandle !== null) {
        (window.cancelIdleCallback || clearTimeout)(propsIdleHandle);
        propsIdleHandle = null;
      }
    };

    const doProps = (forceSync = false) => {
      propsIdleHandle = null;
      if (!forceSync && isPanning.current) return; // skip if user started panning again
      const pb = getViewBounds(PROPS_BUF);

      if (isIOS) {
        // ── Sprite path (iOS) ────────────────────────────────────────────
        // Return all active sprites to the pool, then reposition from pool.
        // No tessellation: sprites are textured quads (2 triangles each).
        while (propsSpriteContainer.children.length > 0) {
          propsSpritePool.push(propsSpriteContainer.removeChildAt(0));
        }
        if (zoomRef.current >= 0.5) {
          const tiles    = tilesRef.current;
          const anchorY  = TEX_BASE_Y / TEX_H;
          const dMin = pb.cMin + pb.rMin, dMax = pb.cMax + pb.rMax;
          for (let d = dMin; d <= dMax; d++) {
            const cLo = Math.max(pb.cMin, d - pb.rMax);
            const cHi = Math.min(pb.cMax, d - pb.rMin);
            for (let c = cLo; c <= cHi; c++) {
              const r = d - c;
              if (r < pb.rMin || r > pb.rMax) continue;
              const tile = tiles[`${c},${r}`];
              if (!tile || !tile.rss || tile.isHQ || tile.isWin || tile.isKeep ||
                  tile.isKeepPart || tile.isHQPart || tile.isShore) continue;
              const tex = rssTextures[tile.rss];
              if (!tex) continue;
              const { cx, cy } = isoXY(c, r);
              const sp = propsSpritePool.pop() ?? new PIXI.Sprite();
              sp.texture  = tex;
              sp.anchor.set(0.5, anchorY); // anchor at base (tile surface centre)
              sp.x = cx;
              sp.y = cy - 4 + TH * 0.5;   // world "base" coordinate
              propsSpriteContainer.addChild(sp);
            }
          }
        }
      } else {
        // ── Graphics path (desktop) ──────────────────────────────────────
        const pg = propsFrontRef.current;
        pg.clear();
        if (zoomRef.current >= 0.5) {
          drawAllProps(pg, tilesRef.current, pb.rMin, pb.rMax, pb.cMin, pb.cMax);
        }
      }

      propsBoundsRef.current = pb;
      propsDirty = false;
      window._perfLog?.("props:drawn");
    };

    let firstPropsDraw = true;
    const schedulePropsRedraw = () => {
      cancelPropsIdle();
      if (firstPropsDraw) {
        firstPropsDraw = false;
        doProps(true); // draw synchronously on very first render
        return;
      }
      if (typeof window.requestIdleCallback === "function") {
        propsIdleHandle = window.requestIdleCallback(doProps);
      } else {
        // Fallback: use a long delay so it can't block an active gesture
        propsIdleHandle = setTimeout(doProps, 800);
      }
    };

    let idleHandle = null;
    const cancelIdle = () => {
      if (idleHandle !== null) {
        (window.cancelIdleCallback || clearTimeout)(idleHandle);
        idleHandle = null;
      }
    };

    function drawPhase(buf, force) {
      const b = getViewBounds(buf);
      const last = lastBoundsRef.current;
      const boundsChanged = !last ||
        b.rMin!==last.rMin || b.rMax!==last.rMax ||
        b.cMin!==last.cMin || b.cMax!==last.cMax;

      if (!force && !boundsChanged) return;
      lastBoundsRef.current = b;

      const curTiles = tilesRef.current;
      const cByTile  = cByTileRef.current;
      const z = zoomRef.current;

      // ── Tiles layer: always redraw (fast — convex quads, trivial tessellation)
      const tg = tileFrontRef.current;
      tg.clear();
      drawAllTiles(tg, curTiles, b.rMin, b.rMax, b.cMin, b.cMax,
        selRef.current, modeRef.current, cByTile, mvCmdRef.current?.uid, z);

      // ── Props layer: only redraw when state changed OR viewport moved outside
      // the previously rendered props buffer. Never block synchronously — always
      // defer to idle so the rAF that follows pan-end stays cheap.
      if (propsDirty) {
        // Tile state changed → props must update. Schedule for next idle.
        schedulePropsRedraw();
      } else if (z >= 0.5) {
        // Pan only: check if viewport has moved outside the last props buffer.
        const pb = propsBoundsRef.current;
        const vb = getViewBounds(0); // exact viewport, no margin
        const outside = !pb ||
          vb.rMin < pb.rMin || vb.rMax > pb.rMax ||
          vb.cMin < pb.cMin || vb.cMax > pb.cMax;
        if (outside) schedulePropsRedraw(); // still deferred, never synchronous
      }
    }

    function redraw(force = false) {
      cancelIdle();
      // Phase 1: draw visible area + 6-tile border. Fast on all devices.
      drawPhase(6, force);

      // Phase 2: extend to a 12-tile pre-render border so nearby tiles slide
      // into view during fast pans without stalling. Only run on desktop where
      // requestIdleCallback is available AND the hardware can finish the draw
      // in < 50ms. On iOS the same draw takes 2+ seconds and blocks all touch
      // input for that entire duration — so we skip it entirely on iOS.
      if (!isIOS && typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(() => {
          idleHandle = null;
          if (isPanning.current) return;
          drawPhase(12, true);
        }, { timeout: 600 });
      }
    }

    function redrawOverlays() {
      drawMarchLines(marchGfxRef.current, cmdsRef.current, reinRef.current, tilesRef.current);
      drawCmdIcons(cmdGfxRef.current, cmdTextContRef.current, cmdsRef.current, tilesRef.current);
    }

    function redrawKeeps() {
      if (!keepContRef.current) return;
      buildKeepLayer(keepContRef.current, tilesRef.current, selRef.current, (key, e) => {
        selRef.current = key;
        selGfx.clear();
        drawSelection(key);
        lastBoundsRef.current = null;
        onTileClickRef.current(key, e);
      }, PIXI);
    }

    redrawRef.current = {
      redraw,
      redrawOverlays,
      redrawKeeps,
      markPropsDirty,
      clearSel: () => { selGfx.clear(); redrawKeeps(); },
      redrawSelection: (key) => { selGfx.clear(); if (key) drawSelection(key); redrawKeeps(); },
    };

    redraw(true);
    redrawOverlays();
    redrawKeeps();

    // No ticker-based redraw — all redraws are event-driven:
    // tiles change, zoom, pan end, mode change, cmd update.
    // This eliminates 60fps getViewBounds() calls during idle/pan.

    const ro = new ResizeObserver(() => {
      if (appRef.current) {
        appRef.current.renderer.resize(el.clientWidth, el.clientHeight);
        lastBoundsRef.current = null;
        redraw(true);
      }
    });
    ro.observe(el);

    function applyZoom(newZoom) {
      const oldZoom = zoomRef.current;
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      const oldPan = panRef.current;
      const np = clampPan(
        cx - (cx - oldPan.x) * (newZoom / oldZoom),
        cy - (cy - oldPan.y) * (newZoom / oldZoom),
        newZoom
      );
      zoomRef.current = newZoom;
      panRef.current  = np;
      world.x = np.x;
      world.y = np.y;
      lastBoundsRef.current = null;
      redraw(true);
      world.scale.set(newZoom);
      onZoomChangeRef.current(newZoom);
      onPanChangeRef.current(np);
    }

    const onWheel = e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const levels = ZOOM_REF.current;
      const idx = levels.indexOf(zoomRef.current);
      const ni = Math.max(0, Math.min(levels.length-1, idx+delta));
      if (levels[ni] !== zoomRef.current) applyZoom(levels[ni]);
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    const onTS = e => {
      if (isUITarget(e)) return;
      // Cancel any pending idle draws immediately on touch so they cannot
      // block the main thread while the user is trying to interact.
      cancelIdle();
      cancelPropsIdle();
      // Call preventDefault on touchstart for canvas touches.
      // This is the ONLY reliable way to block iOS Safari's pull-to-refresh and
      // swipe-back-navigation gestures — iOS decides at touchstart time whether to
      // claim the gesture, before any touchmove fires. The old concern about a 300ms
      // delay from non-passive touchstart was for click-delay on links; it does not
      // apply here since we use touch events directly and have no click handlers on
      // the canvas element.
      e.preventDefault();
      if (e.touches.length === 1) {
        tDragFrom.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        tDidDrag.current = false;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist0.current = Math.sqrt(dx*dx+dy*dy);
        pinchZoom0.current = zoomRef.current;
      }
    };
    const onTM = e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - tDragFrom.current.x;
        const dy = e.touches[0].clientY - tDragFrom.current.y;
        if (Math.abs(dx)+Math.abs(dy) > 8) {
          tDidDrag.current = true;
          isPanning.current = true;
        }
        tDragFrom.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (tDidDrag.current) {
          const np = clampPan(panRef.current.x+dx, panRef.current.y+dy, zoomRef.current);
          panRef.current = np;
          // Move the container instantly — no Graphics redraw during drag so input
          // stays at 60fps. The enlarged getViewBounds buffer (18 tiles) means
          // off-screen tiles are already rendered and slide into view smoothly.
          world.x = np.x; world.y = np.y;
          // Throttle parent notification: fire at most every 100ms during pan
          // to avoid triggering React re-renders on every touchmove frame.
          if (!panNotifyTimer.current) {
            panNotifyTimer.current = setTimeout(() => {
              panNotifyTimer.current = null;
              onPanChangeRef.current(panRef.current);
            }, 100);
          }
        }
      } else if (e.touches.length === 2 && pinchDist0.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const levels = ZOOM_REF.current;
        const rz = Math.min(levels[levels.length-1], Math.max(levels[0], pinchZoom0.current*(dist/pinchDist0.current)));
        const nz = levels.reduce((a,b) => Math.abs(b-rz)<Math.abs(a-rz)?b:a);
        if (nz !== zoomRef.current) applyZoom(nz);
      }
    };
    const onTE = e => {
      if (e.touches.length < 2) pinchDist0.current = null;
      if (e.touches.length === 0) {
        if (!tDidDrag.current) {
          const t = e.changedTouches[0];
          const rect = el.getBoundingClientRect();
          const wx = (t.clientX-rect.left-panRef.current.x)/zoomRef.current;
          const wy = (t.clientY-rect.top -panRef.current.y)/zoomRef.current;
          const key = worldToKey(wx, wy, tilesRef.current);
          if (key) {
            selGfx.clear();
            selRef.current = key;
            drawSelection(key);
            lastBoundsRef.current = null;
            onTileClickRef.current(key, e);
          }
        }
        const wasDrag = tDidDrag.current; // capture before reset
        isPanning.current = false;
        tDidDrag.current = false;
        // Clear any in-flight throttle timers
        if (panNotifyTimer.current) {
          clearTimeout(panNotifyTimer.current);
          panNotifyTimer.current = null;
        }
        if (panEndTimer.current) {
          clearTimeout(panEndTimer.current);
          panEndTimer.current = null;
        }
        const lockedPan = { ...panRef.current };
        world.x = lockedPan.x;
        world.y = lockedPan.y;
        // On a pure tap (no drag), skip the pan-end redraw entirely.
        // drawSelection already ran synchronously above, and the pan position
        // hasn't changed — there's nothing new to render.
        if (wasDrag) {
          // Redraw at final pan position after a drag.
          // IMPORTANT: Do NOT use requestAnimationFrame or setTimeout here.
          // On iOS Safari, both rAF and macrotask timers (setTimeout) are throttled
          // behind the gesture/scroll resolution pipeline — even with touchAction:none —
          // causing delays of 1-2+ seconds visible as red entries in the PERF overlay.
          // queueMicrotask() runs in the same microtask checkpoint as the touchend
          // handler itself, before iOS can hand control back to its gesture scheduler,
          // so it fires in <1ms regardless of iOS scroll state.
          const _panT0 = performance.now();
          queueMicrotask(() => {
            const _panDelay = performance.now() - _panT0;
            window._perfLog?.(`panEnd→µtask:+${Math.round(_panDelay)}ms`);
            lastBoundsRef.current = null;
            redrawRef.current?.redraw(true);
            const _t2 = performance.now();
            window._perfLog?.(`pixi:redraw:+${Math.round(_t2 - _panT0 - _panDelay)}ms`);
            onPanChangeRef.current(lockedPan);
            window._perfLog?.(`react:panNotify`);
          });
        } else {
          // Tap with no drag — just notify pan (position unchanged, no redraw needed)
          onPanChangeRef.current(lockedPan);
        }
      }
    };
    el.addEventListener("touchstart",  onTS, { passive: false }); // non-passive: preventDefault blocks iOS pull-to-refresh & swipe-back
    el.addEventListener("touchmove",   onTM, { passive: false }); // non-passive: prevents native scroll during pan
    el.addEventListener("touchend",    onTE, { passive: true });   // passive: no preventDefault needed on touchend
    el.addEventListener("touchcancel", onTE, { passive: true });   // passive: same

    // Returns true if the event started inside a React UI panel layered above
    // the Pixi canvas. We check composedPath() for any element that has a
    // data-ui-panel attribute OR a z-index higher than the canvas container.
    const isUITarget = e => {
      const path = e.composedPath ? e.composedPath() : [];
      for (const node of path) {
        if (node === el) break; // reached canvas container — stop
        if (node.dataset?.uiPanel) return true;
        const z = node.style?.zIndex ? parseInt(node.style.zIndex, 10) : 0;
        if (z >= 100) return true;
      }
      return false;
    };

    let mDrag = false, mMoved = false, mFrom = { x:0, y:0 };
    const onMD = e => {
      if (e.button !== 0) return;
      if (isUITarget(e)) return;
      if (panEndTimer.current) { clearTimeout(panEndTimer.current); panEndTimer.current = null; }
      mDrag = true; mMoved = false;
      mFrom = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    const onMM = e => {
      if (!mDrag) return;
      const dx = e.clientX - mFrom.x;
      const dy = e.clientY - mFrom.y;
      if (Math.abs(dx)+Math.abs(dy) > 4) mMoved = true;
      mFrom = { x: e.clientX, y: e.clientY };
      if (mMoved) {
        isPanning.current = true;
        const np = clampPan(panRef.current.x+dx, panRef.current.y+dy, zoomRef.current);
        panRef.current = np;
        world.x = np.x; world.y = np.y;
        // Throttle React notification — mirrors touch handler, prevents 60fps setState
        if (!panNotifyTimer.current) {
          panNotifyTimer.current = setTimeout(() => {
            panNotifyTimer.current = null;
            onPanChangeRef.current(panRef.current);
          }, 100);
        }
      }
    };
    const onMU = e => {
      if (e.button !== 0 && e.type !== "mouseleave") return;
      const wasMoved = mMoved;
      mDrag = false; mMoved = false;
      if (isPanning.current) {
        isPanning.current = false;
        // Flush any in-flight notify throttle
        if (panNotifyTimer.current) {
          clearTimeout(panNotifyTimer.current);
          panNotifyTimer.current = null;
        }
        // Debounce edge-tile redraw — if user starts another pan immediately
        // we skip the redraw entirely until they actually stop.
        if (panEndTimer.current) clearTimeout(panEndTimer.current);
        panEndTimer.current = setTimeout(() => {
          panEndTimer.current = null;
          lastBoundsRef.current = null;
          redrawRef.current?.redraw(true);
        }, 80);
      }
      if (!wasMoved && e.type !== "mouseleave") {
        const rect = el.getBoundingClientRect();
        const wx = (e.clientX-rect.left-panRef.current.x)/zoomRef.current;
        const wy = (e.clientY-rect.top -panRef.current.y)/zoomRef.current;
        const key = worldToKey(wx, wy, tilesRef.current);
        if (key) onTileClickRef.current(key, e);
      }
      onPanChangeRef.current(panRef.current);
    };
    el.addEventListener("mousedown",  onMD);
    el.addEventListener("mousemove",  onMM);
    el.addEventListener("mouseup",    onMU);
    el.addEventListener("mouseleave", onMU);

    return () => {
      cancelIdle();
      cancelPropsIdle();
      Object.values(rssTextures).forEach(rt => rt.destroy(true));
      ro.disconnect();
      el.removeEventListener("wheel",      onWheel);
      el.removeEventListener("mousedown",  onMD);
      el.removeEventListener("mousemove",  onMM);
      el.removeEventListener("mouseup",    onMU);
      el.removeEventListener("mouseleave", onMU);
      el.removeEventListener("touchstart",  onTS);
      el.removeEventListener("touchmove",   onTM);
      el.removeEventListener("touchend",    onTE);
      el.removeEventListener("touchcancel", onTE);
      app.destroy(true);
      appRef.current = null; worldRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!selKey) {
      redrawRef.current?.clearSel?.();
    } else {
      redrawRef.current?.redrawSelection?.(selKey);
    }
  }, [selKey]);

  useEffect(() => {
    lastBoundsRef.current = null;
    if (panEndTimer.current) { clearTimeout(panEndTimer.current); panEndTimer.current = null; }
    redrawRef.current?.redrawOverlays();
  }, [mode, mvCmd]);

  useEffect(() => {
    tilesRef.current = tiles;
    lastBoundsRef.current = null;
    redrawRef.current?.markPropsDirty(); // Fix #9: tiles changed → props need repaint
    redrawRef.current?.redraw(true);
    redrawRef.current?.redrawKeeps();
  }, [tiles]);

  useEffect(() => {
    cmdsRef.current = cmds;
    cByTileRef.current = buildCByTile(cmds); // rebuild cache once on change, not on every draw
    redrawRef.current?.redrawOverlays();
  }, [cmds]);

  return (
    <div
      ref={containerRef}
      style={{
        position:"absolute", inset:0, top:38,
        userSelect:"none", touchAction:"none",
        background:"#080c10", overflow:"hidden",
        cursor:"grab",
      }}
    />
  );
}));
