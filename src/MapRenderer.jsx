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
  grass:        { base: hc('#4a6838'), lite: hc('#5a7a44'), shad: hc('#3a5428') },
  forest:       { base: hc('#2a5e2c'), lite: hc('#327034'), shad: hc('#1e4a20') },
  mountain:     { base: hc('#7a6e58'), lite: hc('#948264'), shad: hc('#5e5444') },
  desert:       { base: hc('#c4a85a'), lite: hc('#d4b86a'), shad: hc('#a88e44') },
  ruin:         { base: hc('#4a4440'), lite: hc('#585050'), shad: hc('#363030') },
  shore:        { base: hc('#b09868'), lite: hc('#c0a878'), shad: hc('#907850') },
  road:         { base: hc('#7a6a50'), lite: hc('#8a7a60'), shad: hc('#5a4e38') },
  hellfire:     { base: hc('#1e0800'), lite: hc('#320e04'), shad: hc('#0e0400') },
  // Border terrain
  river:        { base: hc('#0e2e58'), lite: hc('#1a4a80'), shad: hc('#081a38') },
  ravine:       { base: hc('#2a1a0c'), lite: hc('#3c2610'), shad: hc('#180e06') },
  rockymountain:{ base: hc('#3a3630'), lite: hc('#4e4a42'), shad: hc('#1e1c18') },
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

  // Check if point is inside a single iso-diamond tile
  function inTile(wx, wy, c, r, elev) {
    const { cx, cy } = isoXY(c, r);
    const sy = cy - elev;
    return Math.abs(wx - cx) / (TW / 2) + Math.abs(wy - (sy + TH / 2)) / (TH / 2) <= 1.08;
  }

  // Check if point is inside the full 2×2 outer diamond for a P10+ structure.
  // The 2×2 diamond center is at (cx, cy+TH), half-widths are TW and TH.
  function inP10Footprint(wx, wy, pc, pr) {
    const { cx, cy } = isoXY(pc, pr);
    return Math.abs(wx - cx) / TW + Math.abs(wy - (cy + TH)) / TH <= 1.05;
  }

  // Scan ±2 tiles around estimate, checking P10+ footprints first
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const c = cEst + dc, r = rEst + dr;
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
      const key = `${c},${r}`;
      const tile = tiles[key];
      if (!tile) continue;

      const pl = tile.powerLevel ?? 0;
      const isStaticKeep = tile.isKeep && !tile.isGate && pl < 10;
      const isStaticPart = tile.isKeepPart && pl < 10;
      if (isStaticKeep || isStaticPart) continue;

      if (pl >= 10 && (tile.isKeep || tile.isKeepPart)) {
        // Use full 2×2 footprint hitbox; always return the primary key
        const primKey = tile.isKeepPart ? tile.keepPrimaryKey : key;
        const [pc, pr2] = (primKey || key).split(",").map(Number);
        if (inP10Footprint(wx, wy, pc, pr2)) return primKey || key;
        continue;
      }

      const elev = tile.isHQ ? 0 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
      if (inTile(wx, wy, c, r, elev)) return key;
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

      const { terrain, owner, isHQ, isWin, isKeep, isKeepPart, isHQPart, isShore, isGate, crossingType } = tile;

      if (isShore) {
        const { cx, cy } = isoXY(c, r);
        const mid = cy + TH / 2;
        const TOP = [cx, cy, cx+TW/2, mid, cx, cy+TH, cx-TW/2, mid];
        gfx.beginFill(0x1a3a5c); gfx.drawPolygon(TOP); gfx.endFill();
        continue;
      }

      // Keep and keepPart tiles — render as plain ground only.
      // The keep layer (buildKeepLayer) handles all visuals and interaction.
      // Exception: gate tiles (crossings/tunnels/toll bridges) have isKeep=true but
      // are NOT in KEEP_REGION_LIST — render them with their actual terrain color.
      // P10–P13 dynamic structures are also handled here with selection outline.
      if ((isKeep && !isGate) || isKeepPart) {
        const pl10 = (tile.powerLevel ?? 0) >= 10;
        if (pl10) {
          // P10–P13: skip all 4 cells in the main pass — drawn in second pass below
          continue;
        } else {
          const { cx, cy } = isoXY(c, r);
          const mid = cy + TH / 2;
          const TOP = [cx, cy, cx+TW/2, mid, cx, cy+TH, cx-TW/2, mid];
          const baseColor = getTileBaseColor(c, r, terrain || "grass");
          // Outer ring of the 5×5 keep region (|dc|==2 or |dr|==2): apply 2.2 px
          // overdraw stroke to cover black border seams from neighbouring tiles.
          const primKey = tile.isKeep ? `${c},${r}` : tile.keepPrimaryKey;
          if (primKey) {
            const [pc, pr] = primKey.split(",").map(Number);
            const isOuter = Math.abs(c - pc) === 2 || Math.abs(r - pr) === 2;
            if (isOuter) {
              const OD = 2.8;
              gfx.lineStyle(OD * 2, baseColor, 1);
              gfx.beginFill(baseColor); gfx.drawPolygon(TOP); gfx.endFill();
              gfx.lineStyle(0);
              continue;
            }
          }
          gfx.beginFill(baseColor); gfx.drawPolygon(TOP); gfx.endFill();
        }
        continue;
      }

      // ── Gate tiles: crossing / tollbridge / tunnel — distinct visuals ──────
      if (isGate) {
        const { cx, cy } = isoXY(c, r);
        const sy  = cy - 4;
        const mid = sy + TH / 2;
        const TOP = [cx, sy, cx+TW/2, mid, cx, sy+TH, cx-TW/2, mid];
        const ct  = crossingType;
        const key = `${c},${r}`;
        const isSel   = selKey === key;
        const hasCmds = Boolean(cByTile[key]?.length);

        // ── Path tiles: isGate but NOT isKeep — render as plain border terrain ──
        // These are the 2 passable tiles between Gate A and Gate B. They have no
        // crossingType, so without this check they'd fall through to the tunnel else.
        if (!isKeep) {
          gfx.beginFill(getTileBaseColor(c, r, terrain)); gfx.drawPolygon(TOP); gfx.endFill();
          if (owner) {
            const ot = owner === "player" ? 0x1ea0b4 : 0xdc3c28;
            gfx.beginFill(ot, 0.18); gfx.drawPolygon(TOP); gfx.endFill();
            if (!isSel) { gfx.lineStyle(2, ot, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
          }
          if (hasCmds && !isSel) { gfx.lineStyle(2, 0xf0dc3c, 0.9); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
          if (isSel) { gfx.lineStyle(2.5, 0xffffff, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
          continue;
        }

        if (ct === "crossing") {
          // ── River Crossing Option B: Stone Arches ──
          // Dark deep-water base with radial glow
          gfx.beginFill(0x081828); gfx.drawPolygon(TOP); gfx.endFill();
          // Radial water glow in centre
          gfx.beginFill(0x1a6aaa, 0.28); gfx.drawPolygon(TOP); gfx.endFill();
          if (zoom >= 0.6) {
            // Raised stone landing platform (inner diamond, inset from edges)
            const sw = TW * 0.32, sh = TH * 0.30;
            const px = cx, py = mid - sh * 0.15;
            // Platform top face
            gfx.beginFill(0x505860, 0.95);
            gfx.drawPolygon([px, py - sh, px + sw, py, px, py + sh, px - sw, py]);
            gfx.endFill();
            // Bevel highlight on top-right face
            gfx.beginFill(0x8a9098, 0.5);
            gfx.drawPolygon([px, py - sh, px + sw, py, px + sw * 0.88, py + sh * 0.08, px, py - sh * 0.85]);
            gfx.endFill();
            // Cobblestone lines across platform
            if (zoom >= 0.75) {
              gfx.lineStyle(0.7, 0x3a4048, 0.65);
              gfx.moveTo(px - sw * 0.45, py - sh * 0.30); gfx.lineTo(px + sw * 0.55, py + sh * 0.18);
              gfx.moveTo(px - sw * 0.75, py + sh * 0.05); gfx.lineTo(px + sw * 0.75, py + sh * 0.10);
              gfx.lineStyle(0);
            }
            // Iron chain posts (circles at left & right platform tips)
            const postL = { x: cx - sw * 0.98, y: mid };
            const postR = { x: cx + sw * 0.98, y: mid - sh * 0.05 };
            gfx.beginFill(0x606878, 0.9);
            gfx.drawCircle(postL.x, postL.y, TW * 0.045);
            gfx.drawCircle(postR.x, postR.y, TW * 0.045);
            gfx.endFill();
            gfx.lineStyle(1.2, 0xa0a8b0, 0.8);
            gfx.drawCircle(postL.x, postL.y, TW * 0.045);
            gfx.drawCircle(postR.x, postR.y, TW * 0.045);
            gfx.lineStyle(0);
            // Heavy dashed iron chain between posts
            gfx.lineStyle(2.2, 0x6a7888, 0.85);
            gfx.moveTo(postL.x, postL.y - TH * 0.12);
            gfx.bezierCurveTo(
              cx, mid - sh * 0.55,
              cx, mid - sh * 0.55,
              postR.x, postR.y - TH * 0.12
            );
            gfx.lineStyle(0);
            // Water sparkles in corners
            if (zoom >= 0.9) {
              [[0.18, 0.72], [0.78, 0.62], [0.50, 0.85]].forEach(([fx, fy]) => {
                gfx.beginFill(0x4aaad0, 0.45);
                gfx.drawCircle(cx - TW/2 + fx * TW, sy + fy * TH, 1.2);
                gfx.endFill();
              });
            }
          }
          // Outline — steel blue
          gfx.lineStyle(2, 0x4a8ab0, 0.8); gfx.drawPolygon(TOP); gfx.lineStyle(0);

        } else if (ct === "tollbridge") {
          // ── Toll Bridge Option A: Timber Trestle ──
          // Deep near-black ravine base
          gfx.beginFill(0x1a100a); gfx.drawPolygon(TOP); gfx.endFill();
          // Ravine crack shadow at bottom
          gfx.lineStyle(1.5, 0x080402, 0.85);
          gfx.moveTo(cx, mid + TH * 0.18); gfx.lineTo(cx - TW * 0.22, mid + TH * 0.40);
          gfx.moveTo(cx, mid + TH * 0.18); gfx.lineTo(cx + TW * 0.18, mid + TH * 0.38);
          gfx.lineStyle(0);
          if (zoom >= 0.6) {
            // Timber bridge deck — warm amber planks
            const bw = TW * 0.28, bh = TH * 0.30;
            const bpy = mid - bh * 0.12;
            gfx.beginFill(0x9a7048, 0.95);
            gfx.drawPolygon([cx, bpy - bh, cx + bw, bpy, cx, bpy + bh, cx - bw, bpy]);
            gfx.endFill();
            // Plank grain lines
            if (zoom >= 0.75) {
              gfx.lineStyle(1.1, 0x4a2e10, 0.65);
              gfx.moveTo(cx - bw * 0.55, bpy - bh * 0.35); gfx.lineTo(cx + bw * 0.55, bpy + bh * 0.22);
              gfx.moveTo(cx - bw * 0.80, bpy + bh * 0.02); gfx.lineTo(cx + bw * 0.80, bpy + bh * 0.05);
              gfx.moveTo(cx - bw * 0.55, bpy + bh * 0.32); gfx.lineTo(cx + bw * 0.55, bpy - bh * 0.22);
              gfx.lineStyle(0);
            }
            // Side railing posts (left & right uprights)
            const railY0 = bpy - bh * 0.52, railY1 = bpy + bh * 0.08;
            gfx.lineStyle(2.2, 0xa07040, 0.92);
            gfx.moveTo(cx - bw * 0.98, bpy); gfx.lineTo(cx - bw * 0.98, railY0);
            gfx.moveTo(cx + bw * 0.98, bpy - bh * 0.05); gfx.lineTo(cx + bw * 0.98, railY0 - TH * 0.04);
            gfx.lineStyle(0);
            // Top horizontal rail
            gfx.lineStyle(1.6, 0xa07040, 0.88);
            gfx.moveTo(cx - bw * 0.98, railY0); gfx.lineTo(cx + bw * 0.98, railY0 - TH * 0.04);
            gfx.lineStyle(0);
            // X-brace crosses on each post
            if (zoom >= 0.75) {
              gfx.lineStyle(1.0, 0x7a5030, 0.72);
              // left X
              gfx.moveTo(cx - bw * 0.98, railY0); gfx.lineTo(cx - bw * 0.72, bpy);
              gfx.moveTo(cx - bw * 0.72, railY0); gfx.lineTo(cx - bw * 0.98, bpy);
              // right X
              gfx.moveTo(cx + bw * 0.98, railY0 - TH * 0.04); gfx.lineTo(cx + bw * 0.72, bpy - bh * 0.05);
              gfx.moveTo(cx + bw * 0.72, railY0 - TH * 0.04); gfx.lineTo(cx + bw * 0.98, bpy - bh * 0.05);
              gfx.lineStyle(0);
            }
            // Toll lantern — small glowing box above deck centre
            if (zoom >= 0.85) {
              const lx = cx, ly = bpy - bh - TH * 0.08;
              gfx.beginFill(0xd09030, 0.92);
              gfx.drawRect(lx - TW * 0.04, ly, TW * 0.08, TH * 0.12);
              gfx.endFill();
              // lantern roof triangle
              gfx.beginFill(0xa06820, 1.0);
              gfx.drawPolygon([lx, ly - TH * 0.05, lx + TW * 0.045, ly, lx - TW * 0.045, ly]);
              gfx.endFill();
              // glow halo
              gfx.beginFill(0xf0c040, 0.22);
              gfx.drawEllipse(lx, ly + TH * 0.03, TW * 0.10, TH * 0.07);
              gfx.endFill();
            }
          }
          // Outline — warm amber
          gfx.lineStyle(2, 0xb07828, 0.88); gfx.drawPolygon(TOP); gfx.lineStyle(0);

        } else {
          // ── Mountain Tunnel Option A: Stone Portal ──
          // Craggy rock base — dark granite
          gfx.beginFill(0x3a3630); gfx.drawPolygon(TOP); gfx.endFill();
          // Top-right bevel highlight
          gfx.beginFill(0x4a4640, 0.42); gfx.drawPolygon(TOP); gfx.endFill();
          if (zoom >= 0.6) {
            // Jagged rock shards (3 small angular shapes scattered on face)
            gfx.beginFill(0x2a2824, 0.72);
            gfx.drawPolygon([cx - TW * 0.38, mid + TH * 0.04, cx - TW * 0.22, mid - TH * 0.17, cx - TW * 0.30, mid + TH * 0.20]);
            gfx.drawPolygon([cx + TW * 0.28, mid - TH * 0.22, cx + TW * 0.38, mid - TH * 0.36, cx + TW * 0.34, mid - TH * 0.08]);
            gfx.drawPolygon([cx - TW * 0.05, sy + TH * 0.04, cx + TW * 0.06, sy, cx + TH * 0.02, sy + TH * 0.18]);
            gfx.endFill();
            // Stone arch pillars — left & right columns
            const pilW = TW * 0.09, pilH = TH * 0.38;
            const pilLx = cx - TW * 0.15, pilRx = cx + TW * 0.15;
            const pilTopY = mid - TH * 0.26;
            gfx.beginFill(0x5a5650, 0.95);
            gfx.drawPolygon([
              pilLx - pilW, pilTopY + pilH, pilLx - pilW, pilTopY,
              pilLx + pilW * 0.2, pilTopY, pilLx + pilW * 0.2, pilTopY + pilH
            ]);
            gfx.endFill();
            gfx.beginFill(0x4a4640, 0.95);
            gfx.drawPolygon([
              pilRx - pilW * 0.2, pilTopY, pilRx + pilW, pilTopY,
              pilRx + pilW, pilTopY + pilH, pilRx - pilW * 0.2, pilTopY + pilH
            ]);
            gfx.endFill();
            // Lintel (horizontal beam across top of arch)
            gfx.beginFill(0x6a6660, 0.9);
            gfx.drawPolygon([
              pilLx - pilW, pilTopY, pilRx + pilW, pilTopY - TH * 0.02,
              pilRx + pilW, pilTopY + TH * 0.05, pilLx - pilW, pilTopY + TH * 0.05
            ]);
            gfx.endFill();
            // Keystone — wedge at top-centre of lintel
            gfx.beginFill(0x8a8478, 1.0);
            gfx.drawPolygon([
              cx, pilTopY - TH * 0.08,
              cx + TW * 0.06, pilTopY + TH * 0.01,
              cx - TW * 0.06, pilTopY + TH * 0.01
            ]);
            gfx.endFill();
            // Dark tunnel mouth — oval opening between pillars
            const mw = TW * 0.19, mh = TH * 0.20;
            const mcy = mid - TH * 0.04;
            gfx.beginFill(0x050404, 0.96);
            gfx.drawEllipse(cx, mcy, mw, mh);
            gfx.endFill();
            // Deeper darkness inside
            gfx.beginFill(0x020101, 0.92);
            gfx.drawEllipse(cx, mcy, mw * 0.82, mh * 0.82);
            gfx.endFill();
            // Faint ember/torch glow deep inside tunnel
            if (zoom >= 0.85) {
              gfx.beginFill(0xc86020, 0.10);
              gfx.drawEllipse(cx, mcy, mw * 0.42, mh * 0.42);
              gfx.endFill();
            }
            // Stone arch rim around the mouth
            gfx.lineStyle(2, 0x6a6258, 0.88);
            gfx.arc(cx, mcy + mh * 0.12, mw * 1.02, Math.PI, 0, false);
            gfx.lineStyle(0);
          }
          // Outline — cool slate
          gfx.lineStyle(2, 0x706a60, 0.88); gfx.drawPolygon(TOP); gfx.lineStyle(0);
        }

        // Owner tint (same as regular tiles)
        if (owner) {
          const ot = owner === "player" ? 0x1ea0b4 : 0xdc3c28;
          gfx.beginFill(ot, 0.18); gfx.drawPolygon(TOP); gfx.endFill();
          if (!isSel) { gfx.lineStyle(2, ot, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
        }
        if (mode === "selectMarchDest" && owner !== "player") {
          gfx.beginFill(0x000000, 0.45); gfx.drawPolygon(TOP); gfx.endFill();
        }
        if (hasCmds && !isSel) {
          gfx.lineStyle(2, 0xf0dc3c, 0.9); gfx.drawPolygon(TOP); gfx.lineStyle(0);
        }
        if (isSel) {
          gfx.lineStyle(2.5, 0xffffff, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0);
        }
        continue;
      }

      const key = `${c},${r}`;
      const isSel    = selKey === key;
      const isMvTgt  = mode === "selectMarchDest" && mvCmdUid && owner === "player";
      const hasCmds  = Boolean(cByTile[key]?.length);
      const elev     = (isHQ||isHQPart) ? 0 : isWin ? 10 : (isKeep && !isGate) ? 8 : 4;
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
        // Hellfire terrain: add a subtle red-orange lava glow tint over the dark base
        if (terrain === "hellfire") {
          const rng2 = tileRng(c + 3, r + 7);
          const glowAlpha = 0.12 + rng2() * 0.08;
          gfx.beginFill(0xcc2800, glowAlpha); gfx.drawPolygon(TOP); gfx.endFill();
        }
        // Shade triangles removed — they created a visible X/cross pattern on each tile.
      }

      if (owner) {
        const ot = owner === "player" ? 0x1ea0b4 : 0xdc3c28;
        gfx.beginFill(ot, 0.18); gfx.drawPolygon(TOP); gfx.endFill();
        // For HQ tiles: only stroke the outer edges of the 3×3 footprint,
        // not interior tile borders which show through under the sprite.
        if (!isSel && !drawAsHQ) {
          gfx.lineStyle(2, ot, 0.95); gfx.drawPolygon(TOP); gfx.lineStyle(0);
        } else if (!isSel && drawAsHQ) {
          // Determine which edges of this tile are on the outer boundary of the 3×3.
          // Primary tile key stored on isHQPart tiles as keepPrimaryKey (reused for HQ).
          const hqPrimKey = isHQ ? key : tile.hqPrimaryKey;
          if (hqPrimKey) {
            const [hpc, hpr] = hqPrimKey.split(",").map(Number);
            const dc = c - hpc, dr = r - hpr; // 0..2, 0..2
            // Draw only the outer-facing edges as line segments
            const pts = [[cx,sy],[cx+TW/2,mid],[cx,sy+TH],[cx-TW/2,mid]];
            // NE edge (top-right): outer if dc===2
            // SE edge (bottom-right): outer if dr===2
            // SW edge (bottom-left): outer if dc===0
            // NW edge (top-left): outer if dr===0
            const edges = [
              { p0:0, p1:1, outer: dc===2 }, // NE
              { p0:1, p1:2, outer: dr===2 }, // SE
              { p0:2, p1:3, outer: dc===0 }, // SW
              { p0:3, p1:0, outer: dr===0 }, // NW
            ];
            gfx.lineStyle(2, ot, 0.95);
            for (const e of edges) {
              if (!e.outer) continue;
              gfx.moveTo(pts[e.p0][0], pts[e.p0][1]);
              gfx.lineTo(pts[e.p1][0], pts[e.p1][1]);
            }
            gfx.lineStyle(0);
          }
        }
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

  // ── Second pass: P10–P13 merged diamonds drawn AFTER all regular tiles ────
  // This ensures the merged ground fill always sits on top and never gets
  // clipped by adjacent tiles rendered in later diagonal strips.
  for (let d = dMin; d <= dMax; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile) continue;
      const pl = tile.powerLevel ?? 0;
      if (pl < 10 || !tile.isKeep || tile.isGate) continue;
      // Primary cell only — draw merged 2×2 diamond covering all 4 cells
      const { cx, cy } = isoXY(c, r);
      // Use the tile's actual terrain so the P10+ footprint blends with its cluster
      const baseColor = getTileBaseColor(c, r, tile.terrain || "grass");
      // Overdraw by 4px on every edge to fully cover neighbor tile stroke artifacts,
      // but skip overdraw on sides adjacent to an HQ tile (any part of 3x3) to avoid painting over it.
      const isHQTile = (key) => { const t = tiles[key]; return t?.isHQ || t?.isHQPart; };
      const hqN = isHQTile(`${c},${r-1}`)   || isHQTile(`${c+1},${r-1}`) || isHQTile(`${c+2},${r-1}`);
      const hqE = isHQTile(`${c+2},${r}`)   || isHQTile(`${c+2},${r+1}`) || isHQTile(`${c+2},${r+2}`);
      const hqS = isHQTile(`${c},${r+2}`)   || isHQTile(`${c+1},${r+2}`) || isHQTile(`${c+2},${r+2}`);
      const hqW = isHQTile(`${c-1},${r}`)   || isHQTile(`${c-1},${r+1}`) || isHQTile(`${c-1},${r+2}`);
      const OD = 2.2;
      const odN = hqN ? 0 : OD;
      const odE = hqE ? 0 : OD;
      const odS = hqS ? 0 : OD;
      const odW = hqW ? 0 : OD;
      const MERGED = [
        cx,           cy - odN,          // N
        cx + TW + odE, cy + TH,          // E
        cx,           cy + TH * 2 + odS, // S
        cx - TW - odW, cy + TH,          // W
      ];
      // Stroke the outline with the fill color so neighbor edges are painted over
      gfx.lineStyle(OD * 2, baseColor, 1);
      gfx.beginFill(baseColor); gfx.drawPolygon(MERGED); gfx.endFill();
      gfx.lineStyle(0);

      // Owner tint over the full footprint
      const owner2 = tile.owner || null;
      if (owner2) {
        const ot = owner2 === "player" ? 0x1ea0b4 : 0xdc3c28;
        gfx.lineStyle(OD * 2, ot, 0.18);
        gfx.beginFill(ot, 0.18); gfx.drawPolygon(MERGED); gfx.endFill();
        gfx.lineStyle(0);
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
      if (!tile || tile.isHQ || tile.isWin || tile.isHQPart || tile.isShore) continue;
      // Gate tiles and P10-13 structures get props; static keeps do not
      const isStaticKeep = (tile.isKeep && !tile.isGate) && (tile.powerLevel ?? 0) < 10;
      const isStaticPart = tile.isKeepPart && (tile.powerLevel ?? 0) < 10;
      if (isStaticKeep || isStaticPart) continue;
      // P10–P13 keepPart: skip — primary handles the single unified prop
      const pl = tile.powerLevel || 1;
      if (tile.isKeepPart && pl >= 10) continue;
      const { cx, cy } = isoXY(c, r);
      const sy = cy - 4;
      if (pl === 1) continue; // P1 has all resources but no individual props
      if (tile.rss) {
        if (tile.isKeep && pl >= 10) {
          // Draw one giant prop centered on the 2×2 footprint midpoint.
          // Each tier gets a distinct size well above the P9 ceiling (sizeMult tops
          // out at pl=13). Synthetic pl: P10→16, P11→19, P12→22, P13→25.
          // The 2×2 diamond's visual centre is TH below the primary tile centre,
          // so shift sy down by TH so the prop base sits inside the merged footprint.
          const syntheticPl = 13 + (pl - 9) * 3;
          const midCy = cy + TH / 2;
          drawRssProp(gfx, tile.rss, cx, midCy + TH / 2, c, r, syntheticPl);
        } else {
          drawRssProp(gfx, tile.rss, cx, sy, c, r, pl);
        }
      } else if (!tile.owner) {
        drawAmbientScatter(gfx, tile, cx, sy, pl);
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
      if (!tile || !tile.rss || tile.isHQ || tile.isWin || (tile.isKeep && !tile.isGate) ||
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
  const base = sy + TH / 2;
  const s    = TH * 0.82;

  // Size only — one prop per tile, gets bigger with power level.
  // P2=0.18×, P7=0.72×, P13=1.80×; synthetic pl>13 (P10–P13 keeps) grows beyond that.
  const t        = (pl - 1) / 12;
  const sizeMult = 0.18 + t * 1.62;

  if (rss === "wood") {
    if (pl >= 22) {
      // ── P12/P13: Ancient Grove ────────────────────────────────────────────
      const tierScale = pl >= 25 ? 3.5 : 2.8;
      const sc = TH * 0.45 / 88 * tierScale;
      const numTrees = pl >= 25 ? 4 : 2;
      // ground shadow
      gfx.beginFill(0x000000, 0.22); gfx.drawEllipse(cx, base, 58*sc, 12*sc); gfx.endFill();
      // root ground patches
      [[cx-20*sc,base,28*sc,5*sc],[cx+16*sc,base-2*sc,20*sc,4*sc]].forEach(([rx,ry,rw,rh]) => {
        gfx.beginFill(0x2a1808); gfx.drawEllipse(rx,ry,rw,rh); gfx.endFill();
      });
      // helper: draw one ancient tree
      function drawAncient(tx, tbase2, lean, scale2) {
        const th = 88*scale2, tw2 = 11*scale2;
        // root buttresses
        [[-1,0.4],[-0.5,0.6],[0.6,0.5],[1,0.35]].forEach(([dx,sz]) => {
          gfx.beginFill(0x2a1808);
          gfx.drawPolygon([tx,tbase2-th*0.15, tx+dx*tw2*3,tbase2, tx+dx*tw2*2.5,tbase2, tx+tw2*0.3,tbase2-th*0.18]);
          gfx.endFill();
        });
        // trunk
        gfx.beginFill(0x1e1408);
        gfx.drawPolygon([tx-tw2*0.5,tbase2, tx-tw2*0.3+lean*14*scale2,tbase2-th*0.75, tx+tw2*0.3+lean*14*scale2,tbase2-th*0.75, tx+tw2*0.5,tbase2]);
        gfx.endFill();
        gfx.beginFill(0x3a2818);
        gfx.drawPolygon([tx+tw2*0.05,tbase2, tx+tw2*0.05+lean*14*scale2,tbase2-th*0.75, tx+tw2*0.3+lean*14*scale2,tbase2-th*0.75, tx+tw2*0.5,tbase2]);
        gfx.endFill();
        // canopy blobs
        const ccx = tx+lean*14*scale2, ccy = tbase2-th*0.82;
        [[0,0,27*scale2,21*scale2,0x1a3a14],[-17*scale2,-7*scale2,19*scale2,17*scale2,0x162e10],[15*scale2,-4*scale2,21*scale2,16*scale2,0x203818],[0,-17*scale2,17*scale2,14*scale2,0x1e3416]].forEach(([dx,dy,bw,bh,col]) => {
          gfx.beginFill(col); gfx.drawEllipse(ccx+dx, ccy+dy, bw, bh); gfx.endFill();
        });
        // canopy highlight
        gfx.beginFill(0x3c7820, 0.28); gfx.drawEllipse(ccx-6*scale2, ccy-9*scale2, 9*scale2, 7*scale2); gfx.endFill();
        // hanging moss
        for (let mi = 0; mi < 5; mi++) {
          const mx2 = ccx + (mi-2)*8*scale2;
          gfx.lineStyle(0.9*scale2, 0x284a14, 0.45);
          gfx.moveTo(mx2, ccy+7*scale2); gfx.lineTo(mx2-1, ccy+(16+mi*4)*scale2);
          gfx.lineStyle(0);
        }
        // fireflies
        if (pl >= 25) {
          [[ccx-8*scale2,ccy-4*scale2],[ccx+10*scale2,ccy-12*scale2],[ccx+2*scale2,ccy+4*scale2]].forEach(([fx,fy]) => {
            gfx.beginFill(0x78dc3c, 0.55); gfx.drawCircle(fx, fy, 1.5*scale2); gfx.endFill();
            gfx.beginFill(0x78dc3c, 0.14); gfx.drawCircle(fx, fy, 4*scale2); gfx.endFill();
          });
        }
      }
      const treeScale = sc * 0.85;
      if (numTrees === 2) {
        drawAncient(cx-24*sc, base, -0.2, treeScale);
        drawAncient(cx+24*sc, base, 0.25, treeScale*0.92);
      } else {
        // P13: 4 trees — back pair smaller, front pair larger
        drawAncient(cx-38*sc, base-4*sc, -0.15, treeScale*0.78);
        drawAncient(cx+36*sc, base-4*sc, 0.18, treeScale*0.74);
        drawAncient(cx-20*sc, base, -0.22, treeScale);
        drawAncient(cx+20*sc, base, 0.28, treeScale*0.94);
      }
    } else if (pl >= 16) {
      // ── P10/P11: Lumber camp ──────────────────────────────────────────────
      const tierScale = pl >= 19 ? 2.2 : 1.7;
      const sc = TH * 0.45 / 88 * tierScale;
      const numTrees = pl >= 19 ? 5 : 3;
      // ground shadow
      gfx.beginFill(0x000000, 0.20); gfx.drawEllipse(cx, base, 60*sc, 12*sc); gfx.endFill();
      // helper: pine tree
      function drawPine(tx, tbase2, scale2) {
        const h2 = 62*scale2, hw2 = 18*scale2;
        gfx.beginFill(0x000000, 0.12); gfx.drawEllipse(tx,tbase2,11*scale2,3.5*scale2); gfx.endFill();
        gfx.beginFill(0x3a2010); gfx.drawRect(tx-2*scale2,tbase2-h2*0.12,4*scale2,h2*0.14); gfx.endFill();
        const tiers2=[[0,0.28,1],[0.22,0.50,0.75],[0.44,0.68,0.52],[0.62,0.84,0.32]];
        const darks=[0x0e2010,0x163014,0x1e4018,0x264e1c];
        const lites=[0x1e4020,0x2a5a28,0x3a7030,0x4a8838];
        tiers2.forEach(([t0,t1,hwr],ti) => {
          const by2=tbase2-h2*t0,ty2=tbase2-h2*t1,thw2=hw2*hwr;
          gfx.beginFill(darks[ti]); gfx.drawPolygon([tx,ty2, tx-thw2,by2, tx,by2]); gfx.endFill();
          gfx.beginFill(lites[ti]); gfx.drawPolygon([tx,ty2, tx,by2, tx+thw2,by2]); gfx.endFill();
        });
      }
      const tsc = sc * 0.88;
      if (numTrees === 3) {
        drawPine(cx-36*sc, base, tsc*0.80);
        drawPine(cx+36*sc, base, tsc*0.76);
        drawPine(cx,       base-8*sc, tsc);
      } else {
        // P11: 5 trees
        drawPine(cx-50*sc, base, tsc*0.68);
        drawPine(cx-26*sc, base, tsc*0.80);
        drawPine(cx,       base-8*sc, tsc);
        drawPine(cx+26*sc, base, tsc*0.78);
        drawPine(cx+48*sc, base, tsc*0.70);
      }
      // stump
      gfx.beginFill(0x3a2010); gfx.drawPolygon([cx-10*sc,base, cx-8*sc,base-14*sc, cx+8*sc,base-14*sc, cx+10*sc,base]); gfx.endFill();
      gfx.beginFill(0x5a3820); gfx.drawEllipse(cx,base-14*sc,8*sc,4*sc); gfx.endFill();
      gfx.lineStyle(0.6*sc, 0x7a5030, 1); gfx.drawEllipse(cx,base-14*sc,5*sc,2.5*sc); gfx.lineStyle(0);
      // axe handle
      gfx.lineStyle(2*sc, 0x6a4020, 1); gfx.moveTo(cx+2*sc,base-14*sc); gfx.lineTo(cx+14*sc,base-30*sc); gfx.lineStyle(0);
      // axe head
      gfx.beginFill(0x8a8a9a); gfx.drawPolygon([cx+12*sc,base-32*sc, cx+18*sc,base-28*sc, cx+16*sc,base-22*sc, cx+10*sc,base-26*sc]); gfx.endFill();
      gfx.beginFill(0xb0b0c0); gfx.drawPolygon([cx+12*sc,base-32*sc, cx+14*sc,base-30*sc, cx+12*sc,base-24*sc, cx+10*sc,base-26*sc]); gfx.endFill();
      // log pile
      const lx=cx-22*sc, ly=base-4*sc;
      gfx.beginFill(0x4a2c14); gfx.drawEllipse(lx,ly,8*sc,4*sc); gfx.endFill();
      gfx.beginFill(0x3a2010); gfx.drawRect(lx-8*sc,ly-7*sc,16*sc,7*sc); gfx.endFill();
      gfx.beginFill(0x5a3820); gfx.drawEllipse(lx,ly-7*sc,8*sc,4*sc); gfx.endFill();
      gfx.beginFill(0x3a2010); gfx.drawRect(lx-6*sc,ly-12*sc,12*sc,5*sc); gfx.endFill();
      gfx.beginFill(0x5a3820); gfx.drawEllipse(lx,ly-12*sc,6*sc,3*sc); gfx.endFill();
    } else {
      // ── P2–P9: original single pine ───────────────────────────────────────
      const h  = s * 0.80 * sizeMult;
      const hw = s * 0.55 * sizeMult * 0.5;
      const tx = cx + (rnd()-0.5)*s*0.08;
      const tbase = base + 0.04 * s * sizeMult;
      gfx.beginFill(0x000000, 0.18); gfx.drawEllipse(tx, tbase, s*sizeMult*0.28, s*sizeMult*0.08); gfx.endFill();
      gfx.beginFill(0x3a2010); gfx.drawRect(tx - s*0.018, tbase - h*0.12, s*0.036, h*0.14); gfx.endFill();
      const tiers = [[0.00,0.28,0.50],[0.22,0.48,0.38],[0.42,0.65,0.27],[0.60,0.82,0.16]];
      const dark  = [0x0e2010, 0x163014, 0x1e4018, 0x264e1c];
      const lite  = [0x1e4020, 0x2a5a28, 0x3a7030, 0x4a8838];
      tiers.forEach(([t0, t1, hwr], ti) => {
        const boty = tbase - h * t0, topy = tbase - h * t1, thw = hw * hwr;
        gfx.beginFill(dark[ti]); gfx.drawPolygon([tx,topy, tx-thw,boty, tx,boty]); gfx.endFill();
        gfx.beginFill(lite[ti]); gfx.drawPolygon([tx,topy, tx,boty, tx+thw,boty]); gfx.endFill();
      });
    }

  } else if (rss === "stone") {
    if (pl >= 22) {
      // ── P12/P13: Megalith circle ──────────────────────────────────────────
      const tierScale = pl >= 25 ? 3.5 : 2.8;
      const sc = TH * 0.45 / 88 * tierScale;
      const numSlabs = pl >= 25 ? 5 : 3; // P13=5 slabs+lintel, P12=3+lintel
      // ground shadow
      gfx.beginFill(0x000000, 0.30); gfx.drawEllipse(cx, base, sc*58, sc*14); gfx.endFill();
      // ground rubble scatter
      [[cx-28*sc,base-2*sc,10*sc,4*sc],[cx+24*sc,base-3*sc,9*sc,4*sc],[cx-10*sc,base-1*sc,7*sc,3*sc]].forEach(([rx,ry,rw,rh]) => {
        gfx.beginFill(0x2a2820); gfx.drawEllipse(rx,ry,rw,rh); gfx.endFill();
      });
      // helper: draw one upright slab
      function drawSlab(sx, sh, sw, lean) {
        const slabBase = base;
        const lx = lean * 0.04;
        // shadow face
        gfx.beginFill(0x1e1c18); gfx.drawPolygon([sx-sw*0.5-3*sc,slabBase, sx-sw*0.5-1*sc,slabBase-sh, sx-sw*0.5+2*sc,slabBase-sh, sx-sw*0.5,slabBase]); gfx.endFill();
        // front face
        gfx.beginFill(0x4a4840); gfx.drawRect(sx-sw*0.5+lx*sh, slabBase-sh, sw, sh); gfx.endFill();
        // top face
        gfx.beginFill(0x6a6858); gfx.drawPolygon([sx-sw*0.5+lx*sh,slabBase-sh, sx+sw*0.5+lx*sh,slabBase-sh, sx+sw*0.5+lx*sh+3*sc,slabBase-sh-4*sc, sx-sw*0.5+lx*sh+3*sc,slabBase-sh-4*sc]); gfx.endFill();
        // highlight strip
        gfx.beginFill(0xa09888, 0.15); gfx.drawRect(sx-sw*0.5+lx*sh, slabBase-sh, sw*0.25, sh); gfx.endFill();
        // crack
        gfx.lineStyle(0.8*sc, 0x2a2820, 1); gfx.moveTo(sx-sw*0.1+lx*sh*0.5, slabBase-sh*0.3); gfx.lineTo(sx+sw*0.15+lx*sh*0.7, slabBase-sh*0.7); gfx.lineStyle(0);
        // moss
        gfx.beginFill(0x285014, 0.30); gfx.drawRect(sx-sw*0.5+lx*sh, slabBase-sh+2*sc, sw*0.3, 2*sc); gfx.endFill();
      }
      const slabH = 88*sc, slabW = 16*sc;
      // back centre slab
      drawSlab(cx, slabH*0.62, slabW*0.85, -0.04);
      if (numSlabs >= 5) {
        // extra flanking slabs for P13
        drawSlab(cx-44*sc, slabH*0.50, slabW*0.75, 0.06);
        drawSlab(cx+42*sc, slabH*0.48, slabW*0.72, -0.05);
      }
      // main left/right uprights
      drawSlab(cx-22*sc, slabH, slabW, 0.03);
      drawSlab(cx+22*sc, slabH*0.94, slabW*0.95, -0.02);
      // lintel
      const lintY = base - slabH*0.93, lintW = 56*sc, lintH2 = 10*sc;
      gfx.beginFill(0x2a2820); gfx.drawPolygon([cx-lintW*0.5-4*sc,lintY+lintH2, cx-lintW*0.5-2*sc,lintY, cx+lintW*0.5+2*sc,lintY, cx+lintW*0.5,lintY+lintH2]); gfx.endFill();
      gfx.beginFill(0x504e44); gfx.drawRect(cx-lintW*0.5, lintY, lintW, lintH2); gfx.endFill();
      gfx.beginFill(0x6a6858); gfx.drawPolygon([cx-lintW*0.5,lintY, cx+lintW*0.5,lintY, cx+lintW*0.5+3*sc,lintY-5*sc, cx-lintW*0.5+3*sc,lintY-5*sc]); gfx.endFill();
      gfx.beginFill(0xa09888, 0.12); gfx.drawRect(cx-lintW*0.5, lintY, lintW*0.3, lintH2); gfx.endFill();
      // P13: add atmospheric glow between uprights
      if (pl >= 25) {
        gfx.beginFill(0x4080c0, 0.06); gfx.drawEllipse(cx, lintY+lintH2*2, 18*sc, 22*sc); gfx.endFill();
        gfx.beginFill(0x6080ff, 0.04); gfx.drawEllipse(cx, lintY, 28*sc, 30*sc); gfx.endFill();
      }
    } else if (pl >= 16) {
      // ── P10/P11: Crusher wheel ────────────────────────────────────────────
      const tierScale = pl >= 19 ? 2.2 : 1.7;
      const sc = TH * 0.45 / 88 * tierScale;
      const wr = (pl >= 19 ? 46 : 38) * sc; // P11 bigger wheel
      const wx = cx + 10*sc, wy = base - wr - 4*sc;
      // ground shadow
      gfx.beginFill(0x000000, 0.28); gfx.drawEllipse(cx, base, 60*sc, 13*sc); gfx.endFill();
      // stone dust on ground
      gfx.beginFill(0xa09888, 0.10); gfx.drawEllipse(cx+5*sc, base, 28*sc, 7*sc); gfx.endFill();
      // boulder pile (left)
      [[cx-28*sc,base-18*sc,18*sc,11*sc],[cx-42*sc,base-10*sc,14*sc,8*sc],[cx-18*sc,base-10*sc,12*sc,7*sc],[cx-35*sc,base-28*sc,13*sc,8*sc]].forEach(([bx,by,bw,bh]) => {
        gfx.beginFill(0x2a2820); gfx.drawEllipse(bx,by,bw,bh); gfx.endFill();
        gfx.beginFill(0x4a4840); gfx.drawEllipse(bx-bw*0.1,by-bh*0.3,bw*0.7,bh*0.55); gfx.endFill();
        gfx.beginFill(0x6a6858); gfx.drawEllipse(bx-bw*0.2,by-bh*0.45,bw*0.35,bh*0.28); gfx.endFill();
      });
      // P11: extra small boulder pile on right
      if (pl >= 19) {
        [[cx+32*sc,base-12*sc,12*sc,7*sc],[cx+42*sc,base-6*sc,9*sc,5*sc]].forEach(([bx,by,bw,bh]) => {
          gfx.beginFill(0x2a2820); gfx.drawEllipse(bx,by,bw,bh); gfx.endFill();
          gfx.beginFill(0x4a4840); gfx.drawEllipse(bx-bw*0.1,by-bh*0.3,bw*0.7,bh*0.55); gfx.endFill();
        });
      }
      // wheel shadow
      gfx.beginFill(0x000000, 0.22); gfx.drawEllipse(wx+4*sc, base, wr*0.35, wr*0.1); gfx.endFill();
      // wheel outer ring
      gfx.beginFill(0x1e1c18); gfx.drawCircle(wx, wy, wr); gfx.endFill();
      // wheel face
      gfx.beginFill(0x3a3830); gfx.drawCircle(wx, wy, wr-3*sc); gfx.endFill();
      // radial segments
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        gfx.lineStyle(1.5*sc, 0x2a2820, 1);
        gfx.moveTo(wx + Math.cos(ang)*10*sc, wy + Math.sin(ang)*10*sc);
        gfx.lineTo(wx + Math.cos(ang)*(wr-4*sc), wy + Math.sin(ang)*(wr-4*sc));
        gfx.lineStyle(0);
      }
      // highlight
      gfx.beginFill(0x8c8778, 0.20); gfx.drawCircle(wx-wr*0.25, wy-wr*0.3, wr*0.45); gfx.endFill();
      // centre hole
      gfx.beginFill(0x0e0c08); gfx.drawCircle(wx, wy, 8*sc); gfx.endFill();
      gfx.beginFill(0x1e1c14); gfx.drawCircle(wx, wy, 5*sc); gfx.endFill();
      // axle post
      gfx.beginFill(0x3a2c18); gfx.drawRect(wx-3*sc, wy-wr-6*sc, 6*sc, 14*sc); gfx.endFill();
      gfx.beginFill(0x5a4428); gfx.drawRect(wx-1*sc, wy-wr-6*sc, 2*sc, 14*sc); gfx.endFill();
      // cracks
      gfx.lineStyle(1.2*sc, 0x141210, 1);
      gfx.moveTo(wx+wr*0.1, wy-wr*0.2); gfx.lineTo(wx+wr*0.4, wy+wr*0.1);
      gfx.moveTo(wx-wr*0.3, wy+wr*0.2); gfx.lineTo(wx-wr*0.1, wy+wr*0.45);
      gfx.lineStyle(0);
      // P11: second smaller wheel leaning behind
      if (pl >= 19) {
        const wr2 = wr * 0.62, wx2 = cx - 14*sc, wy2 = base - wr2 - 2*sc;
        gfx.beginFill(0x161412); gfx.drawCircle(wx2, wy2, wr2); gfx.endFill();
        gfx.beginFill(0x2a2826); gfx.drawCircle(wx2, wy2, wr2-2*sc); gfx.endFill();
        gfx.beginFill(0x0e0c08); gfx.drawCircle(wx2, wy2, 5*sc); gfx.endFill();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          gfx.lineStyle(1*sc, 0x1e1c18, 1);
          gfx.moveTo(wx2+Math.cos(ang)*7*sc, wy2+Math.sin(ang)*7*sc);
          gfx.lineTo(wx2+Math.cos(ang)*(wr2-3*sc), wy2+Math.sin(ang)*(wr2-3*sc));
          gfx.lineStyle(0);
        }
      }
    } else {
      // ── P2–P9: original boulder cluster ──────────────────────────────────
      const bh = s * 0.34 * sizeMult;
      const hw = s * 0.22 * sizeMult * 0.5;
      const bx = cx + (rnd()-0.5)*s*0.06;
      const by = base - bh * 0.1;
      const top = by - bh;
      gfx.beginFill(0x000000, 0.22); gfx.drawEllipse(bx, by, s*sizeMult*0.30, s*sizeMult*0.10); gfx.endFill();
      gfx.beginFill(0x3a3830); gfx.drawPolygon([bx-hw*0.6,by, bx-hw*0.8,by-bh*0.5, bx-hw*0.2,top, bx+hw*0.1,by-bh*0.3]); gfx.endFill();
      gfx.beginFill(0x7a7468); gfx.drawPolygon([bx-hw*0.2,top, bx+hw*0.4,top+bh*0.15, bx+hw*0.6,by-bh*0.4, bx+hw*0.1,by-bh*0.3]); gfx.endFill();
      gfx.beginFill(0x585450); gfx.drawPolygon([bx+hw*0.1,by-bh*0.3, bx+hw*0.6,by-bh*0.4, bx+hw*0.7,by, bx-hw*0.6,by]); gfx.endFill();
      gfx.beginFill(0xb4afa5, 0.28); gfx.drawEllipse(bx+hw*0.1, top+bh*0.2, hw*0.3, bh*0.12); gfx.endFill();
      if (sizeMult > 0.55) {
        const bx2 = bx + s*0.18*sizeMult, by2 = by - s*0.02*sizeMult;
        const bh2 = bh*0.55, hw2 = hw*0.55, top2 = by2-bh2;
        gfx.beginFill(0x323028); gfx.drawPolygon([bx2-hw2*0.6,by2, bx2-hw2*0.7,by2-bh2*0.5, bx2-hw2*0.1,top2, bx2+hw2*0.2,by2-bh2*0.3]); gfx.endFill();
        gfx.beginFill(0x686460); gfx.drawPolygon([bx2-hw2*0.1,top2, bx2+hw2*0.5,top2+bh2*0.15, bx2+hw2*0.65,by2-bh2*0.4, bx2+hw2*0.2,by2-bh2*0.3]); gfx.endFill();
        gfx.beginFill(0x504c48); gfx.drawPolygon([bx2+hw2*0.2,by2-bh2*0.3, bx2+hw2*0.65,by2-bh2*0.4, bx2+hw2*0.7,by2, bx2-hw2*0.6,by2]); gfx.endFill();
      }
    }

  } else if (rss === "ore") {
    if (pl >= 22) {
      // ── P12/P13: Mine shaft ───────────────────────────────────────────────
      const tierScale = pl >= 25 ? 3.5 : 2.8;
      const sc = TH * 0.45 / 88 * tierScale;
      const numShafts = pl >= 25 ? 2 : 1;
      // ground shadow
      gfx.beginFill(0x000000, 0.28); gfx.drawEllipse(cx, base, 62*sc, 13*sc); gfx.endFill();
      function drawShaft(sx, sbase) {
        const ew=44*sc, eh=50*sc, ex=sx-ew*0.5-4*sc, ey=sbase-eh-8*sc;
        gfx.beginFill(0x1a1810); gfx.drawRect(ex-4*sc, ey-4*sc, ew+8*sc, eh+4*sc); gfx.endFill();
        gfx.beginFill(0x4a3018); gfx.drawRect(ex-2*sc, ey, 6*sc, eh); gfx.endFill();
        gfx.beginFill(0x5a3820); gfx.drawRect(ex-2*sc, ey, 3*sc, eh); gfx.endFill();
        gfx.beginFill(0x4a3018); gfx.drawRect(ex+ew-4*sc, ey, 6*sc, eh); gfx.endFill();
        gfx.beginFill(0x5a3820); gfx.drawRect(ex+ew-4*sc, ey, 3*sc, eh); gfx.endFill();
        gfx.beginFill(0x3a2410); gfx.drawRect(ex-4*sc, ey-8*sc, ew+8*sc, 10*sc); gfx.endFill();
        gfx.beginFill(0x5a3820); gfx.drawRect(ex-4*sc, ey-8*sc, ew+8*sc, 4*sc); gfx.endFill();
        gfx.beginFill(0x080604); gfx.drawRect(ex+2*sc, ey+2*sc, ew-4*sc, eh-2*sc); gfx.endFill();
        gfx.beginFill(0x180e06, 0.9); gfx.drawRect(ex+2*sc, ey+2*sc, ew-4*sc, eh-2*sc); gfx.endFill();
        gfx.beginFill(0xb47828, 0.08); gfx.drawEllipse(sx, ey+eh*0.3, 12*sc, 8*sc); gfx.endFill();
        gfx.lineStyle(2*sc, 0x3a2410, 1);
        gfx.moveTo(ex+2*sc, ey+eh*0.4); gfx.lineTo(ex+ew-4*sc, ey+eh*0.5); gfx.lineStyle(0);
        // cart
        const cartx=sx+20*sc, carty=sbase-14*sc;
        gfx.beginFill(0x3a2010); gfx.drawCircle(cartx-8*sc, carty+4*sc, 5*sc); gfx.endFill();
        gfx.beginFill(0x5a3828); gfx.drawCircle(cartx-8*sc, carty+4*sc, 3*sc); gfx.endFill();
        gfx.beginFill(0x3a2010); gfx.drawCircle(cartx+8*sc, carty+4*sc, 5*sc); gfx.endFill();
        gfx.beginFill(0x5a3828); gfx.drawCircle(cartx+8*sc, carty+4*sc, 3*sc); gfx.endFill();
        gfx.beginFill(0x2a1e0c); gfx.drawRect(cartx-14*sc, carty-10*sc, 28*sc, 14*sc); gfx.endFill();
        gfx.beginFill(0x3a2c14); gfx.drawRect(cartx-14*sc, carty-10*sc, 3*sc, 14*sc); gfx.endFill();
        gfx.beginFill(0x3a2c14); gfx.drawRect(cartx+11*sc, carty-10*sc, 3*sc, 14*sc); gfx.endFill();
        gfx.beginFill(0x3a2c14); gfx.drawRect(cartx-14*sc, carty-10*sc, 28*sc, 3*sc); gfx.endFill();
        [0,1,2,3,4,5].forEach(i => {
          const ox=cartx-10*sc+(i%3)*7*sc, oy=carty-14*sc-Math.floor(i/3)*4*sc;
          gfx.beginFill(0x1e1c14); gfx.drawEllipse(ox,oy+2*sc,4*sc,2*sc); gfx.endFill();
          gfx.beginFill(i%2===0?0xc89030:0xf0c040); gfx.drawEllipse(ox,oy,4*sc,2.5*sc); gfx.endFill();
          gfx.beginFill(0xf8e080); gfx.drawEllipse(ox-1*sc,oy-0.8*sc,1.5*sc,1*sc); gfx.endFill();
        });
        // rails
        gfx.lineStyle(1.5*sc, 0x3a3020, 1);
        gfx.moveTo(ex+4*sc, sbase+2*sc); gfx.lineTo(cartx+20*sc, sbase+2*sc);
        gfx.moveTo(ex+4*sc, sbase+6*sc); gfx.lineTo(cartx+20*sc, sbase+6*sc);
        for (let ri=0;ri<5;ri++){const rx2=ex+8*sc+ri*18*sc; gfx.moveTo(rx2,sbase); gfx.lineTo(rx2,sbase+8*sc);}
        gfx.lineStyle(0);
      }
      if (numShafts === 1) {
        drawShaft(cx-4*sc, base);
      } else {
        // P13: two shafts side by side, second offset and smaller
        drawShaft(cx-18*sc, base);
        drawShaft(cx+22*sc, base);
      }
    } else if (pl >= 16) {
      // ── P10/P11: Smelter ──────────────────────────────────────────────────
      const tierScale = pl >= 19 ? 2.2 : 1.7;
      const sc = TH * 0.45 / 88 * tierScale;
      const numFurnaces = pl >= 19 ? 2 : 1;
      // ground shadow
      gfx.beginFill(0x000000, 0.28); gfx.drawEllipse(cx, base, 60*sc, 13*sc); gfx.endFill();
      // ash/slag
      gfx.beginFill(0x281e14, 0.60); gfx.drawEllipse(cx+5*sc, base, 28*sc, 7*sc); gfx.endFill();
      function drawFurnace(fx2, fbase) {
        const fw=36*sc, fh=52*sc, flx=fx2-fw*0.5, fly=fbase-fh-8*sc;
        // shadow
        gfx.beginFill(0x1a1610); gfx.drawPolygon([flx,fly+fh, flx-6*sc,fly+fh+4*sc, flx-6*sc,fly+8*sc, flx,fly]); gfx.endFill();
        // body
        gfx.beginFill(0x2e2820); gfx.drawRect(flx,fly,fw,fh); gfx.endFill();
        // block seams
        gfx.lineStyle(1*sc, 0x1e1810, 1);
        gfx.moveTo(flx,fly+fh*0.33); gfx.lineTo(flx+fw,fly+fh*0.33);
        gfx.moveTo(flx,fly+fh*0.66); gfx.lineTo(flx+fw,fly+fh*0.66);
        gfx.moveTo(flx+fw*0.5,fly); gfx.lineTo(flx+fw*0.5,fly+fh);
        gfx.lineStyle(0);
        // top
        gfx.beginFill(0x3e3830); gfx.drawRect(flx,fly-6*sc,fw,6*sc); gfx.endFill();
        gfx.beginFill(0x504840); gfx.drawPolygon([flx,fly-6*sc, flx+fw,fly-6*sc, flx+fw+4*sc,fly-10*sc, flx+4*sc,fly-10*sc]); gfx.endFill();
        // fire mouth
        const mw=20*sc, mh=16*sc, mx2=flx+fw*0.5-mw*0.5, my2=fly+fh-mh-4*sc;
        gfx.beginFill(0x0a0604); gfx.drawRect(mx2,my2,mw,mh); gfx.endFill();
        gfx.beginFill(0xff5000, 0.15); gfx.drawEllipse(mx2+mw*0.5,my2+mh*0.5,mw*0.9,mh*0.9); gfx.endFill();
        gfx.beginFill(0xff8c00, 0.25); gfx.drawEllipse(mx2+mw*0.5,my2+mh*0.5,mw*0.6,mh*0.6); gfx.endFill();
        gfx.beginFill(0xffb400, 0.35); gfx.drawEllipse(mx2+mw*0.5,my2+mh*0.5,mw*0.35,mh*0.35); gfx.endFill();
        gfx.beginFill(0xffe064, 0.80); gfx.drawCircle(mx2+mw*0.5, my2+mh*0.5, 2*sc); gfx.endFill();
        // chimney
        gfx.beginFill(0x1e1810); gfx.drawRect(fx2-4*sc, fly-22*sc, 8*sc, 18*sc); gfx.endFill();
        gfx.beginFill(0x2e2820); gfx.drawRect(fx2-2*sc, fly-22*sc, 4*sc, 18*sc); gfx.endFill();
        // smoke
        for (let si=0; si<5; si++) {
          const sp=si/4; const sy2=fly-22*sc-sp*18*sc; const ssx=fx2+Math.sin(sp*3)*4*sc;
          gfx.beginFill(0x3c3228, (1-sp)*0.28); gfx.drawCircle(ssx,sy2,(3+sp*4)*sc); gfx.endFill();
        }
        // glow on ground
        gfx.beginFill(0xff6400, 0.07); gfx.drawEllipse(fx2, fbase-2*sc, 18*sc, 5*sc); gfx.endFill();
        // ingot mould beside
        const ix=fx2+20*sc, iy=fbase-10*sc;
        gfx.beginFill(0x1e1c14); gfx.drawRect(ix-10*sc,iy-4*sc,20*sc,8*sc); gfx.endFill();
        [[ix-6*sc,iy-2*sc,0xc89030],[ix+2*sc,iy-3*sc,0xd4a020]].forEach(([ingx,ingy,col]) => {
          gfx.beginFill(0x1a1810); gfx.drawRect(ingx-4*sc,ingy,8*sc,4*sc); gfx.endFill();
          gfx.beginFill(col); gfx.drawRect(ingx-4*sc,ingy-3*sc,8*sc,4*sc); gfx.endFill();
          gfx.beginFill(0xf0d060); gfx.drawRect(ingx-4*sc,ingy-3*sc,3*sc,2*sc); gfx.endFill();
        });
      }
      if (numFurnaces === 1) {
        drawFurnace(cx-6*sc, base);
      } else {
        // P11: two furnaces
        drawFurnace(cx-22*sc, base);
        drawFurnace(cx+18*sc, base);
      }
    } else {
      // ── P2–P9: original nugget ────────────────────────────────────────────
      const rx = s * 0.14 * sizeMult, ry = s * 0.10 * sizeMult;
      const nx = cx + (rnd()-0.5)*s*0.06;
      const ny = base - ry*0.3;
      gfx.beginFill(0x000000, 0.20); gfx.drawEllipse(nx, ny+ry*0.6, rx*1.2, ry*0.45); gfx.endFill();
      gfx.beginFill(0x1e1c14); gfx.drawEllipse(nx, ny+ry*0.5, rx*1.1, ry*0.5); gfx.endFill();
      gfx.beginFill(0x4a2e08); gfx.drawEllipse(nx, ny, rx, ry*0.85); gfx.endFill();
      gfx.beginFill(0xc89030); gfx.drawEllipse(nx-rx*0.1, ny-ry*0.12, rx*0.75, ry*0.65); gfx.endFill();
      gfx.beginFill(0xf0d060); gfx.drawEllipse(nx-rx*0.22, ny-ry*0.28, rx*0.38, ry*0.30); gfx.endFill();
      gfx.beginFill(0xfffce0, 0.45); gfx.drawEllipse(nx-rx*0.25, ny-ry*0.30, nx*0.28, ry*0.18); gfx.endFill();
      gfx.beginFill(0x64c8ff, 0.70); gfx.drawCircle(nx-rx*0.12, ny-ry*0.05, s*sizeMult*0.012); gfx.endFill();
      gfx.beginFill(0x64c8ff, 0.70); gfx.drawCircle(nx+rx*0.08, ny+ry*0.05, s*sizeMult*0.010); gfx.endFill();
      if (sizeMult > 0.60) {
        const rx2 = rx*0.52, ry2 = ry*0.52;
        const nx2 = nx + rx*0.9, ny2 = ny + ry*0.3;
        gfx.beginFill(0x1e1c14); gfx.drawEllipse(nx2, ny2+ry2*0.5, rx2*1.1, ry2*0.5); gfx.endFill();
        gfx.beginFill(0x4a2e08); gfx.drawEllipse(nx2, ny2, rx2, ry2*0.85); gfx.endFill();
        gfx.beginFill(0xc89030); gfx.drawEllipse(nx2-rx2*0.1, ny2-ry2*0.12, rx2*0.75, ry2*0.65); gfx.endFill();
      }
    }

  } else {
    if (pl >= 22) {
      // ── P12/P13: Collector Dome ───────────────────────────────────────────
      const tierScale = pl >= 25 ? 3.5 : 2.8;
      const sc = TH * 0.45 / 88 * tierScale;
      // gas pit
      gfx.beginFill(0x080e04); gfx.drawEllipse(cx,base-2*sc,28*sc,10*sc); gfx.endFill();
      gfx.beginFill(0x121a06); gfx.drawEllipse(cx,base-2*sc,18*sc,7*sc); gfx.endFill();
      gfx.lineStyle(0.8*sc, 0x2a3a10, 1); gfx.drawEllipse(cx,base-2*sc,28*sc,10*sc); gfx.lineStyle(0);
      // bubbles in pit
      [[-0.10,0.02,0.055],[0.08,-0.02,0.045],[0.01,0.04,0.050]].forEach(([dxr,dyr,rr]) => {
        gfx.beginFill(0x3c5a0a, 0.70); gfx.drawEllipse(cx+dxr*45*sc,base-2*sc+dyr*45*sc,rr*45*sc,(rr*45*sc)*0.38); gfx.endFill();
      });
      // pipes running outward
      [[-45*sc,0],[45*sc,0],[0,-20*sc]].forEach(([dx,dy]) => {
        const ang = Math.atan2(dy,dx), len = Math.sqrt(dx*dx+dy*dy);
        gfx.beginFill(0x1e2010);
        const cos=Math.cos(ang), sin2=Math.sin(ang);
        gfx.drawRect(cx+cos*18*sc+sin2*(-2*sc), base-12*sc+sin2*18*sc+cos*(-2*sc), (len-18*sc)*cos-(4*sc)*sin2, (len-18*sc)*sin2+(4*sc)*cos);
        gfx.endFill();
        // vent at end
        const ex2=cx+dx, ey2=base-12*sc+dy;
        for (let vi=0;vi<5;vi++){
          const vp=vi/5;
          gfx.beginFill(0x64b432, (1-vp)*0.40); gfx.drawCircle(ex2+Math.sin(vp*3)*2*sc, ey2-vp*14*sc, (2+vp*4)*sc); gfx.endFill();
        }
      });
      // dome shadow + dome: base sits ON the ground surface
      const dr=38*sc, dbase=base;  // dome base grounded at tile surface
      gfx.beginFill(0x000000, 0.18); gfx.drawEllipse(cx+4*sc, dbase+2*sc, dr*0.8, dr*0.2); gfx.endFill();
      // dome main arc — symmetric half-ellipse arching upward
      gfx.beginFill(0x2a3018);
      for (let ai=0; ai<=16; ai++) {
        const ang1=(ai/16)*Math.PI, ang2=((ai+1)/16)*Math.PI;
        gfx.drawPolygon([cx,dbase, cx+Math.cos(ang1)*dr,dbase-Math.sin(ang1)*dr*0.85, cx+Math.cos(ang2)*dr,dbase-Math.sin(ang2)*dr*0.85]);
      }
      gfx.endFill();
      // dome highlight
      gfx.beginFill(0x4a6828, 0.20); gfx.drawEllipse(cx+dr*0.25,dbase-dr*0.32,dr*0.4,dr*0.35); gfx.endFill();
      // base ring sitting on ground
      gfx.beginFill(0x1e2414); gfx.drawRect(cx-dr,dbase-2*sc,dr*2,5*sc); gfx.endFill();
      gfx.beginFill(0x2e3420); gfx.drawRect(cx-dr,dbase-2*sc,dr*2,2*sc); gfx.endFill();
      // stone seam lines on dome
      gfx.lineStyle(1*sc, 0x1a2010, 0.7);
      [0.25,0.50,0.75].forEach(p => {
        const dy2=-(p)*dr*0.85; const dw=Math.sqrt(Math.max(0,dr*dr-(dy2*dy2/0.72)))*0.92;
        gfx.moveTo(cx-dw,dbase+dy2); gfx.lineTo(cx+dw,dbase+dy2);
      });
      gfx.lineStyle(0);
      // bolts around base
      for (let bi=0;bi<8;bi++){
        const ang=(bi/8)*Math.PI;
        gfx.beginFill(0x3a3c28); gfx.drawCircle(cx+Math.cos(ang)*dr,dbase-Math.sin(ang)*4*sc,1.5*sc); gfx.endFill();
      }
      // central vent stack
      gfx.beginFill(0x1e2010); gfx.drawRect(cx-4*sc,dbase-dr-8*sc,8*sc,dr*0.5); gfx.endFill();
      gfx.beginFill(0x2a2c18); gfx.drawRect(cx-2*sc,dbase-dr-8*sc,3*sc,dr*0.5); gfx.endFill();
      gfx.beginFill(0x3a3c28); gfx.drawRect(cx-6*sc,dbase-dr-12*sc,12*sc,6*sc); gfx.endFill();
      // vent gas
      for (let vi=0;vi<10;vi++){
        const vp=vi/10; const vy=dbase-dr-12*sc-vp*28*sc; const vx=cx+Math.sin(vp*4)*5*sc;
        gfx.beginFill(0x64be3c,(1-vp)*0.48); gfx.drawCircle(vx,vy,(3+vp*7)*sc); gfx.endFill();
      }
      // pressure gauge
      gfx.beginFill(0x1a2010); gfx.drawCircle(cx+dr*0.75,dbase-dr*0.35,6*sc); gfx.endFill();
      gfx.beginFill(0x2a3418); gfx.drawCircle(cx+dr*0.75,dbase-dr*0.35,4.5*sc); gfx.endFill();
      gfx.lineStyle(1*sc,0x6aaa70,1); gfx.moveTo(cx+dr*0.75,dbase-dr*0.35); gfx.lineTo(cx+dr*0.75+3*sc,dbase-dr*0.35-3*sc); gfx.lineStyle(0);
      // P13: glowing cracks + extra pressure effects
      if (pl >= 25) {
        // glowing crack lines on dome surface
        gfx.lineStyle(1.5*sc, 0x78dc28, 0.45);
        gfx.moveTo(cx-dr*0.35,dbase-dr*0.4); gfx.lineTo(cx-dr*0.18,dbase-dr*0.7);
        gfx.moveTo(cx+dr*0.2,dbase-dr*0.25); gfx.lineTo(cx+dr*0.38,dbase-dr*0.55);
        gfx.lineStyle(0);
        // extra gas leak around base
        [cx-dr*0.55,cx-dr*0.2,cx+dr*0.3,cx+dr*0.6].forEach((lx,li) => {
          for (let vi=0;vi<6;vi++){
            const vp=vi/6;
            gfx.beginFill(0x78dc28,(1-vp)*0.30); gfx.drawCircle(lx+Math.sin(vp*3)*2*sc, dbase-vp*18*sc, (1.5+vp*3)*sc); gfx.endFill();
          }
        });
        // extra side pressure gauge
        gfx.beginFill(0x1a2010); gfx.drawCircle(cx-dr*0.52,dbase-dr*0.28,5*sc); gfx.endFill();
        gfx.beginFill(0x3a4820); gfx.drawCircle(cx-dr*0.52,dbase-dr*0.28,3.5*sc); gfx.endFill();
        gfx.lineStyle(1*sc,0xa0e040,1); gfx.moveTo(cx-dr*0.52,dbase-dr*0.28); gfx.lineTo(cx-dr*0.52-3*sc,dbase-dr*0.28-2*sc); gfx.lineStyle(0);
        // ground mist glow
        gfx.beginFill(0x50a020, 0.10); gfx.drawEllipse(cx,base,45*sc,10*sc); gfx.endFill();
      }
    } else if (pl >= 16) {
      // ── P10/P11: Venting rig ──────────────────────────────────────────────
      const tierScale = pl >= 19 ? 2.2 : 1.7;
      const sc = TH * 0.45 / 88 * tierScale;
      const numStacks = pl >= 19 ? 6 : 3;
      // gas pit
      gfx.beginFill(0x080e04); gfx.drawEllipse(cx,base-2*sc,32*sc,12*sc); gfx.endFill();
      gfx.beginFill(0x121a06); gfx.drawEllipse(cx,base-2*sc,22*sc,8*sc); gfx.endFill();
      gfx.lineStyle(1*sc,0x2a3a10,0.8); gfx.drawEllipse(cx,base-2*sc,32*sc,12*sc); gfx.lineStyle(0);
      [[-0.10,0.02,0.055],[0.08,-0.02,0.045],[0.01,0.04,0.050]].forEach(([dxr,dyr,rr]) => {
        gfx.beginFill(0x3c5a0a,0.70); gfx.drawEllipse(cx+dxr*45*sc,base-2*sc+dyr*45*sc,rr*45*sc,(rr*45*sc)*0.38); gfx.endFill();
      });
      const postH=68*sc;
      const posts = numStacks===3 ? [cx-22*sc,cx,cx+22*sc] : [cx-34*sc,cx-14*sc,cx+6*sc,cx+26*sc];
      posts.forEach(px => {
        gfx.beginFill(0x2a2820); gfx.drawRect(px-3*sc,base-postH,6*sc,postH); gfx.endFill();
        gfx.beginFill(0x3a3830); gfx.drawRect(px-1*sc,base-postH,2*sc,postH); gfx.endFill();
      });
      [0.3,0.6,0.85].forEach(p => {
        const py=base-postH*p, spanX=posts[posts.length-1]-posts[0];
        gfx.beginFill(0x242220); gfx.drawRect(posts[0]-3*sc,py-2*sc,spanX+6*sc,4*sc); gfx.endFill();
        gfx.beginFill(0x343230); gfx.drawRect(posts[0]-3*sc,py-1*sc,spanX+6*sc,1*sc); gfx.endFill();
      });
      // diagonal braces
      gfx.lineStyle(2*sc,0x2a2820,1);
      gfx.moveTo(posts[0],base-postH*0.3); gfx.lineTo(posts[Math.floor(posts.length/2)],base-postH*0.6);
      gfx.moveTo(posts[posts.length-1],base-postH*0.3); gfx.lineTo(posts[Math.floor(posts.length/2)],base-postH*0.6);
      gfx.lineStyle(0);
      const vents = numStacks===3
        ? [{x:cx-16*sc,h:48*sc,w:5*sc},{x:cx,h:58*sc,w:6*sc},{x:cx+16*sc,h:44*sc,w:5*sc}]
        : [{x:cx-28*sc,h:42*sc,w:4*sc},{x:cx-10*sc,h:52*sc,w:5*sc},{x:cx+4*sc,h:58*sc,w:6*sc},{x:cx+20*sc,h:46*sc,w:5*sc},{x:cx-22*sc,h:36*sc,w:4*sc},{x:cx+30*sc,h:38*sc,w:4*sc}];
      vents.forEach(v => {
        gfx.beginFill(0x1e2010); gfx.drawRect(v.x-v.w*0.5,base-v.h-4*sc,v.w,v.h); gfx.endFill();
        gfx.beginFill(0x2a2c18); gfx.drawRect(v.x-v.w*0.5,base-v.h-4*sc,v.w*0.4,v.h); gfx.endFill();
        gfx.beginFill(0x3a3c28); gfx.drawRect(v.x-v.w*0.5-2*sc,base-v.h-8*sc,v.w+4*sc,5*sc); gfx.endFill();
        for (let vi=0;vi<10;vi++){
          const vp=vi/10; const vy=base-v.h-8*sc-vp*30*sc; const vx=v.x+Math.sin(vp*4)*4*sc;
          gfx.beginFill(0x64b432,(1-vp)*0.45); gfx.drawCircle(vx,vy,(3+vp*8)*sc); gfx.endFill();
        }
        // bolts
        [0.3,0.6,0.8].forEach(p => {
          gfx.beginFill(0x3a3830); gfx.drawCircle(v.x-v.w*0.5-1*sc,base-v.h*p,1.5*sc); gfx.endFill();
          gfx.beginFill(0x3a3830); gfx.drawCircle(v.x+v.w*0.5+1*sc,base-v.h*p,1.5*sc); gfx.endFill();
        });
      });
      // pressure gauge on main stack
      const mainStack = vents[Math.floor(vents.length/2)];
      gfx.beginFill(0x1e2010); gfx.drawCircle(mainStack.x+6*sc,base-32*sc,5*sc); gfx.endFill();
      gfx.beginFill(0x3a4020); gfx.drawCircle(mainStack.x+6*sc,base-32*sc,3.5*sc); gfx.endFill();
      gfx.lineStyle(1*sc,0x6aaa70,1); gfx.moveTo(mainStack.x+6*sc,base-32*sc); gfx.lineTo(mainStack.x+8*sc,base-34*sc); gfx.lineStyle(0);
    } else {
      // ── P2–P9: original gas pit ───────────────────────────────────────────
      const sm = sizeMult;
      gfx.beginFill(0x080e04); gfx.drawEllipse(cx, base, s*sm*0.28, s*sm*0.11); gfx.endFill();
      gfx.beginFill(0x121a06); gfx.drawEllipse(cx, base, s*sm*0.20, s*sm*0.07); gfx.endFill();
      gfx.lineStyle(s*sm*0.018, 0x2a3a10, 0.8); gfx.drawEllipse(cx, base, s*sm*0.28, s*sm*0.11); gfx.lineStyle(0);
      const bub = [[-0.10,0.02,0.055],[0.08,-0.02,0.045],[0.01,0.04,0.050]];
      bub.forEach(([dxr,dyr,rr]) => {
        const bx=cx+dxr*s*sm, by=base+dyr*s*sm, br=rr*s*sm;
        gfx.beginFill(0x3c5a0a, 0.70); gfx.drawEllipse(bx, by, br, br*0.38); gfx.endFill();
      });
      const vh = 0.40 + t * 0.60;
      for (let i = 0; i < 8; i++) {
        const tp = i / 8;
        const py = base - tp * vh * s * sm;
        const px = cx + Math.sin(tp*3.5)*s*0.04;
        const rr = s*sm*0.025 + tp*s*sm*0.065;
        gfx.beginFill(0x78be28, (1-tp)*0.38); gfx.drawCircle(px, py, rr); gfx.endFill();
      }
    }
  }
}

function drawAmbientScatter(gfx, tile, cx, sy, pl = 1) {
  const { c, r, terrain } = tile;
  const rnd = tileRng(c, r);
  const cy2 = sy + TH / 2;
  const v = TV[terrain] || TV_DEF;

  // Size only — fixed count, prop just gets bigger with power level.
  const t    = Math.min(1, (pl - 1) / 12);
  const sm   = 0.35 + t * 0.85;  // P2=0.42×, P7=0.79×, P13=1.20×

  if (terrain === "river") {
    const w  = TW * (0.14 + t * 0.22);
    const dx = (rnd()-0.5) * TW * 0.2;
    const dy = (rnd()-0.5) * TH * 0.3;
    gfx.beginFill(hc('#2a6aaa'), 0.40 + t*0.15); gfx.drawEllipse(cx+dx, cy2+dy, w, TH*0.06); gfx.endFill();
    gfx.beginFill(0xb8e0ff, 0.18); gfx.drawEllipse(cx+dx-w*0.1, cy2+dy-TH*0.015, w*0.55, TH*0.025); gfx.endFill();
  } else if (terrain === "ravine") {
    const len = TW * (0.08 + t * 0.18);
    const angle = rnd() * Math.PI * 2;
    const x1 = cx + Math.cos(angle)*len*0.15, y1 = cy2+Math.sin(angle)*len*0.08;
    const x2 = cx + Math.cos(angle)*len,       y2 = cy2+Math.sin(angle)*len*0.5;
    gfx.lineStyle(0.8 + t*1.2, 0x080402, 0.70); gfx.moveTo(x1,y1); gfx.lineTo(x2,y2); gfx.lineStyle(0);
    gfx.beginFill(0x0a0604, 0.55); gfx.drawEllipse(cx, cy2, TW*(0.05+t*0.08), TH*(0.025+t*0.045)); gfx.endFill();
  } else if (terrain === "rockymountain") {
    const h  = TH * (0.22 + t * 0.55);
    const hw = TW * (0.04 + t * 0.08);
    const bx = cx + (rnd()-0.5)*TW*0.15, by = cy2 + (rnd()-0.5)*TH*0.12;
    gfx.beginFill(0x000000, 0.22); gfx.drawEllipse(bx, by+TH*0.04, TW*(0.12+t*0.18), TH*(0.05+t*0.06)); gfx.endFill();
    gfx.beginFill(0x1a1814); gfx.drawPolygon([bx, by-h, bx-hw, by, bx+hw*0.1, by]); gfx.endFill();
    gfx.beginFill(0x2e2a24); gfx.drawPolygon([bx, by-h, bx+hw*0.1, by, bx+hw*0.9, by-h*0.35]); gfx.endFill();
    gfx.beginFill(0xdde0e8, 0.50); gfx.drawPolygon([bx, by-h, bx-hw*0.35, by-h*0.72, bx+hw*0.45, by-h*0.68]); gfx.endFill();
  } else if (terrain === "hellfire") {
    // 6 straight cracks radiating from a central origin point (ref image style)
    // Dark scorched ground overlay at origin
    gfx.beginFill(0x0a0300, 0.65);
    gfx.drawEllipse(cx, cy2, TW * 0.12, TH * 0.07);
    gfx.endFill();
    // Small bright origin glow
    gfx.beginFill(0xff6600, 0.55 + t * 0.20);
    gfx.drawEllipse(cx, cy2, TW * 0.06, TH * 0.035);
    gfx.endFill();

    // 6 cracks evenly spaced radiating outward — angles spread across the isometric face
    // Base angles: 0, 60, 120, 180, 240, 300 degrees mapped to iso perspective (x squished)
    const crackBaseAngles = [0, Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3];
    const crackBaseLen = TW * (0.22 + t * 0.14);
    for (let i = 0; i < 6; i++) {
      const ang = crackBaseAngles[i];
      // vary length slightly per crack using stable per-crack rng
      const lenFactor = 0.75 + tileRng(c + i, r + i)() * 0.50;
      const cLen = crackBaseLen * lenFactor;
      // Isometric perspective: squash y axis
      const ex = cx + Math.cos(ang) * cLen;
      const ey = cy2 + Math.sin(ang) * cLen * 0.38;
      // Dark border
      gfx.lineStyle(2.6 + t * 1.2, 0x080100, 0.92);
      gfx.moveTo(cx, cy2); gfx.lineTo(ex, ey);
      gfx.lineStyle(0);
      // Orange lava glow
      gfx.lineStyle(1.3 + t * 0.7, 0xff5500, 0.85);
      gfx.moveTo(cx, cy2); gfx.lineTo(ex, ey);
      gfx.lineStyle(0);
      // Bright white-yellow core
      gfx.lineStyle(0.5, 0xffdd60, 0.70);
      gfx.moveTo(cx, cy2); gfx.lineTo(cx + Math.cos(ang) * cLen * 0.55, cy2 + Math.sin(ang) * cLen * 0.38 * 0.55);
      gfx.lineStyle(0);
    }
    // Ember dots near crack tips
    const emberCount = 3 + Math.floor(t * 2);
    for (let e = 0; e < emberCount; e++) {
      const ex = cx + (tileRng(c + e, r)() - 0.5) * TW * 0.42;
      const ey = cy2 + (tileRng(c, r + e + 1)() - 0.5) * TH * 0.26;
      const er = 0.7 + t * 0.5;
      const alpha = 0.50 + tileRng(c + e, r + e)() * 0.35;
      gfx.beginFill(0xff8820, alpha); gfx.drawCircle(ex, ey, er); gfx.endFill();
    }
  } else if (terrain === "grass" || terrain === "forest") {
    const sz = (1.2 + t * 2.8) * (0.6 + rnd()*0.8);
    gfx.beginFill(rnd()>0.5?v.lite:v.base, 0.50); gfx.drawEllipse(cx+(rnd()-0.5)*TW*0.3, cy2+(rnd()-0.5)*TH*0.25, sz*0.9, sz*0.5); gfx.endFill();
  } else if (terrain === "mountain" || terrain === "ruin") {
    const sz = (1.0 + t * 2.5) * (0.6 + rnd()*0.8);
    gfx.beginFill(v.shad, 0.45); gfx.drawEllipse(cx+(rnd()-0.5)*TW*0.28+0.5, cy2+(rnd()-0.5)*TH*0.22+0.5, sz*0.9, sz*0.55); gfx.endFill();
    gfx.beginFill(v.lite, 0.55); gfx.drawEllipse(cx+(rnd()-0.5)*TW*0.28, cy2+(rnd()-0.5)*TH*0.22, sz*0.9, sz*0.55); gfx.endFill();
  } else {
    const sz = (0.8 + t * 2.0) * (0.6 + rnd()*0.8);
    gfx.beginFill(v.lite, 0.30); gfx.drawEllipse(cx+(rnd()-0.5)*TW*0.30, cy2+(rnd()-0.5)*TH*0.24, sz*1.4, sz*0.6); gfx.endFill();
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
  // 2.2 px overdraw stroke (same as P10+ tiles) to cover black border seams
  // from neighbouring tiles that bleed through beneath the keep sprite.
  const OD = 2.2;
  gfx.lineStyle(OD * 2, fc2, 1);
  gfx.beginFill(fc2);
  gfx.drawPolygon([
    bx,      by - 28,
    bx + 36, by - 10,
    bx,      by + 8,
    bx - 36, by - 10,
  ]);
  gfx.endFill();
  gfx.lineStyle(0);

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

// ── HQ Sprite Layer ───────────────────────────────────────────────────────────
// Each player/AI HQ renders as a faction-specific sprite centered on the 3×3
// footprint. The primary tile is the top-left corner (isHQ===true); the other
// 8 cells are isHQPart===true. We track the primary tile key only.
//
// Faction → sprite filename mapping. Files live in /public/hq/
const HQ_SPRITES = {
  pirates:       "hq_pirates.webp",
  orcs:          "hq_orcs.webp",
  nightcreatures:"hq_nightcreatures.webp",
  holyknights:   "hq_holyknights.webp",
  dragons:       "hq_dragons.webp",
  bountyhunters: "hq_arcane.webp",
  player:        "hq_pirates.webp",
  ai:            "hq_orcs.webp",
};

const _hqStateCache = new Map(); // tileKey → { faction, owner, isSelected }
export function clearHQCache() { _hqStateCache.clear(); }

// 3×3 footprint: primary tile is top-left (c,r); parts go to (c+2,r+2)
// The visual centre of a 3×3 in isometric space is the centre tile (c+1,r+1).
// isoXY gives us the diamond centre of any tile; the 3×3 centre is at (c+1,r+1).
// We size the sprite to cover the full 3×3 diamond footprint.
function _buildOneHQ(tileKey, tile, selKey, onHQClick, PIXI, isPanningRef, texCache) {
  const [pc, pr] = tileKey.split(",").map(Number);
  // Visual centre = middle tile of 3×3
  const { cx: bx, cy: worldCY } = isoXY(pc + 1, pr + 1);
  const elev = 0;

  // 3×3 outer diamond corners (for hit area + selection outline)
  // N=(pc+1,pr), E=(pc+2,pr+1), S=(pc+1,pr+2), W=(pc,pr+1) — all shifted by elev
  const nPt = isoXY(pc + 1, pr);
  const ePt = isoXY(pc + 2, pr + 1);
  const sPt = isoXY(pc + 1, pr + 2);
  const wPt = isoXY(pc,     pr + 1);

  // Sprite-aligned footprint — corners map to the 3x3 iso diamond.
  // rotation=0 so no trig needed; fractions derived from sprite dims + anchor.
  const _sW  = TW * 3.0;
  const _sH  = _sW * 0.80;
  const _aY  = 0.905;
  const _sx  = bx;
  const _sy  = sPt.cy - elev + TH * 0.95;
  const _fp  = (fx, fy) => ({
    x: _sx + (fx - 0.5) * _sW,
    y: _sy + (fy - _aY) * _sH,
  });
  const _fpN = _fp(0.6667, 0.3146);
  const _fpE = _fp(0.6667, 0.5907);
  const _fpS = _fp(0.3333, 0.5907);
  const _fpW = _fp(0.3333, 0.3146);

  const FOOTPRINT = [
    _fpN.x, _fpN.y,
    _fpE.x, _fpE.y,
    _fpS.x, _fpS.y,
    _fpW.x, _fpW.y,
  ];

  const isSelected = selKey === tileKey;
  const owner      = tile.owner || null;
  const faction    = tile.faction || owner || "player";

  const group = new PIXI.Container();
  group.__hqKey = tileKey;

  // ── Sprite ──
  const spriteName = HQ_SPRITES[faction] || HQ_SPRITES[owner] || HQ_SPRITES.player;
  const spriteUrl  = `/hq/${spriteName}`;

  // Width covers the full 3x3 diamond left<->right extent.
  // Height = 0.75x width so towers stay visible without blocking back tiles.
  // anchor.y = 0.78 keeps the base grounded on the front tile row.
  // Source image is 2048x2048 (square) — preserve aspect ratio to avoid lean.
  // Scale so width fits the 3x3 footprint; height follows naturally.
  // Per-faction fine-tuning offsets (xOff/yOff in pixels, positive = right/down)
  const HQ_OFFSETS = {
    pirates:        { xOff:  0,    yOff:  0    },
    player:         { xOff:  0,    yOff:  0    },
    orcs:           { xOff:  0,    yOff:  0    },
    ai:             { xOff:  0,    yOff:  0    },
    bountyhunters:  { xOff:  5,    yOff: -5    },
    dragons:        { xOff:  5,    yOff:  10   },
    holyknights:    { xOff: -5,    yOff:  10   },
    nightcreatures: { xOff:  0,    yOff:  10   },
  };
  const off = HQ_OFFSETS[faction] || { xOff: 0, yOff: 0 };

  const targetW = TW * 2.2;
  const targetH = targetW * 0.80;

  const spriteX = bx + off.xOff;
  const spriteY = sPt.cy - elev + TH * 0.60 + off.yOff;

  // ── Ownership outline — double-sprite technique ──
  // A second copy of the sprite, tinted to the owner color, scaled up by a
  // small uniform margin and rendered beneath the main sprite.  Because it
  // uses the same texture alpha the outline follows every contour of the art.
  const ownerColor   = owner === "player" ? 0x1ea0b4 : 0xdc3c28;
  const outlineScale = isSelected ? 1.055 : 1.032; // larger ring when selected
  const outlineAlpha = isSelected ? 0.95  : 0.60;

  const applyOutlineSprite = (sp) => {
    sp.anchor.set(0.5, 0.905);
    sp.width  = targetW  * outlineScale;
    sp.height = targetH  * outlineScale;
    sp.x = spriteX;
    sp.y = spriteY;
    sp.tint  = ownerColor;
    sp.alpha = outlineAlpha;
  };

  const applySprite = (sp) => {
    sp.anchor.set(0.5, 0.905);
    sp.width  = targetW;
    sp.height = targetH;
    sp.x = spriteX;
    sp.y = spriteY;
  };

  if (texCache[spriteUrl]) {
    if (owner) {
      const ol = new PIXI.Sprite(texCache[spriteUrl]);
      applyOutlineSprite(ol);
      group.addChild(ol);
    }
    const sp = new PIXI.Sprite(texCache[spriteUrl]);
    applySprite(sp);
    group.addChild(sp);
  } else {
    // Load async — replace placeholder gfx once loaded
    const placeholderGfx = new PIXI.Graphics();
    const fc = owner === "player" ? 0x1ea0b4 : owner === "ai" ? 0xdc3c28 : 0x888888;
    placeholderGfx.beginFill(fc, 0.3);
    placeholderGfx.drawPolygon(FOOTPRINT);
    placeholderGfx.endFill();
    group.addChild(placeholderGfx);

    PIXI.Texture.fromURL(spriteUrl).then(tex => {
      texCache[spriteUrl] = tex;
      if (placeholderGfx.parent) placeholderGfx.parent.removeChild(placeholderGfx);
      placeholderGfx.destroy();
      if (!group.destroyed) {
        if (owner) {
          const ol = new PIXI.Sprite(tex);
          applyOutlineSprite(ol);
          group.addChildAt(ol, 0);
        }
        const sp = new PIXI.Sprite(tex);
        applySprite(sp);
        group.addChild(sp);
      }
    }).catch(() => {
      // Sprite not found — placeholder stays, that's fine
    });
  }

  // ── Hit area ──
  const hit = new PIXI.Graphics();
  hit.beginFill(0xffffff, 0.001);
  hit.drawPolygon(FOOTPRINT);
  hit.endFill();
  hit.hitArea     = new PIXI.Polygon(FOOTPRINT);
  hit.interactive = true;
  hit.buttonMode  = true;
  hit.cursor      = "pointer";
  hit.on("pointerdown", (e) => {
    if (isPanningRef?.current) return;
    e.stopPropagation();
    onHQClick(tileKey, e.data?.originalEvent || e);
  });
  group.addChild(hit);
  return group;
}

const _hqTexCache = {}; // shared texture cache across rebuilds

function buildHQLayer(hqCont, tiles, selKey, onHQClick, PIXI, isPanningRef) {
  // Find all primary HQ tiles (isHQ === true, not isHQPart)
  for (const [tileKey, tile] of Object.entries(tiles)) {
    if (!tile?.isHQ) continue;

    const isSelected = selKey === tileKey;
    const owner      = tile.owner || null;
    const faction    = tile.faction || owner || null;
    const prev       = _hqStateCache.get(tileKey);

    if (prev && prev.faction === faction && prev.owner === owner && prev.isSelected === isSelected) continue;

    // Remove old group for this HQ
    for (let i = hqCont.children.length - 1; i >= 0; i--) {
      const child = hqCont.children[i];
      if (child.__hqKey === tileKey) {
        hqCont.removeChild(child);
        child.destroy({ children: true });
        break;
      }
    }

    hqCont.addChild(_buildOneHQ(tileKey, tile, selKey, onHQClick, PIXI, isPanningRef, _hqTexCache));
    _hqStateCache.set(tileKey, { faction, owner, isSelected });
  }
}

function _buildOneKeep(tileKey, reg, tile, selKey, onKeepClick, PIXI, isPanningRef) {
  const { cx: bx, cy: worldCY } = isoXY(reg.cx, reg.cy);
  const elev = 8;
  const by   = worldCY + 26.5 - elev - 10;  // centered on 5×5 footprint midpoint (gy+26.5)
  const gy   = worldCY;
  const FOOTPRINT = [
     bx,        gy - 100,
     bx + 220,  gy +  20,
     bx,        gy + 120,
     bx - 220,  gy +  20,
  ];
  const isSelected = selKey === tileKey;
  const owner      = tile.owner || null;

  const group = new PIXI.Container();
  group.__keepKey = tileKey;

  if (isSelected) {
    // Outline traces the full 5×5 tile footprint (KEEP_RADIUS=2).
    // From center (bx, gy): N=(0,-106), E=(+200,+26.5), S=(0,+159), W=(-200,+26.5)
    const KEEP_OUTLINE = [
      bx,        gy - 106,
      bx + 200,  gy +  26.5,
      bx,        gy + 159,
      bx - 200,  gy +  26.5,
    ];
    const outlineGfx = new PIXI.Graphics();
    outlineGfx.lineStyle(3, 0xffffff, 0.95);
    outlineGfx.drawPolygon(KEEP_OUTLINE);
    outlineGfx.lineStyle(0);
    group.addChild(outlineGfx);
  }

  const gfx = new PIXI.Graphics();
  drawKeepGfx(gfx, bx, by, owner, reg.isWin, false);
  group.addChild(gfx);

  const hit = new PIXI.Graphics();
  hit.beginFill(0xffffff, 0.001);
  hit.drawRect(bx - 220, gy - 100, 440, 220);
  hit.endFill();
  hit.hitArea     = new PIXI.Polygon(FOOTPRINT);
  hit.interactive = true;
  hit.buttonMode  = true;
  hit.cursor      = "pointer";
  hit.on("pointerdown", (e) => {
    // Do not fire a keep click if the user is panning — the finger touching the
    // keep's hit area during a pan gesture should not open a popup.
    if (isPanningRef?.current) return;
    e.stopPropagation();
    onKeepClick(tileKey, e.data?.originalEvent || e);
  });
  group.addChild(hit);
  return group;
}

function buildKeepLayer(keepCont, tiles, selKey, onKeepClick, PIXI, isPanningRef) {
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

    keepCont.addChild(_buildOneKeep(tileKey, reg, tile, selKey, onKeepClick, PIXI, isPanningRef));
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
      const elev = t?.isHQ ? 0 : t?.isWin ? 10 : t?.isKeep ? 8 : 4;
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
    const elev = tile.isHQ ? 0 : tile.isWin ? 10 : tile.isKeep ? 8 : 4;
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
        if (textCont) {
          if (cmd.bust) {
            const tex = PIXI.Texture.from(cmd.bust);
            const sprite = new PIXI.Sprite(tex);
            sprite.width = 14; sprite.height = 14;
            sprite.anchor.set(0.5, 0.5); sprite.x = cx+dx; sprite.y = ey-11;
            const mask = new PIXI.Graphics();
            mask.beginFill(0xffffff); mask.drawCircle(cx+dx, ey-11, 7); mask.endFill();
            sprite.mask = mask;
            textCont.addChild(mask);
            textCont.addChild(sprite);
          } else if (cmd.icon) {
            const txt = new PIXI.Text(cmd.icon, { fontSize: 10, align: "center" });
            txt.anchor.set(0.5, 0.5); txt.x = cx+dx; txt.y = ey-11;
            textCont.addChild(txt);
          }
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
  const hqContRef      = useRef(null);

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
      redrawRef.current?.redrawHQs();
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
    const TEX_W      = Math.round(TW * 2.0);     // 160 px — wide enough for P13 ore carts
    const TEX_H      = Math.round(TH * 3.5);     // 186 px — tall enough for P13 props
    const TEX_BASE_Y = Math.round(TEX_H * 0.82); // ~153 px — tile surface centre in texture
    const TEX_SY     = TEX_BASE_Y - TH / 2;      // sy arg = top-of-tile-face in texture
    const TEX_CX     = TEX_W / 2;                // 80 px

    const rssTextures       = {};   // rss string → PIXI.RenderTexture
    const propsSpritePool   = [];   // recycled PIXI.Sprite instances
    const propsSpriteContainer = new PIXI.Container();

    if (isIOS) {
      propsGfx.visible = false; // Graphics layer unused on iOS
      world.addChild(propsSpriteContainer); // sits between tiles and keeps
      const tmpGfx = new PIXI.Graphics();
      // Bake one texture per (rss, powerLevel) pair so size scaling works on iOS.
      // P1 tiles have no props so skip pl=1. 52 textures total (4 rss × 13 pl).
      // P10–P13 are baked with syntheticPl (16/19/22/25) to hit the new prop art branches.
      for (const rss of ["wood", "stone", "ore", "gas"]) {
        rssTextures[rss] = {}; // keyed by pl
        for (let pl = 2; pl <= 13; pl++) {
          const bakePl = pl >= 10 ? 13 + (pl - 9) * 3 : pl; // P10→16, P11→19, P12→22, P13→25
          const rt = PIXI.RenderTexture.create({
            width: TEX_W, height: TEX_H,
            resolution: app.renderer.resolution,
          });
          tmpGfx.clear();
          drawRssProp(tmpGfx, rss, TEX_CX, TEX_SY, 5, 3, bakePl);
          app.renderer.render(tmpGfx, { renderTexture: rt });
          rssTextures[rss][pl] = rt;
        }
      }
      tmpGfx.destroy();
    }

    const keepCont = new PIXI.Container(); 
    keepCont.interactiveChildren = true;
    world.addChild(keepCont); keepContRef.current = keepCont;

    // HQ container sits BELOW keepCont so keeps that are south of the HQ
    // render on top. We insert it just before keepCont in the display list.
    const hqCont = new PIXI.Container();
    hqCont.interactiveChildren = true;
    world.addChildAt(hqCont, world.children.indexOf(keepCont));
    hqContRef.current = hqCont;
    const selGfx = new PIXI.Graphics(); world.addChild(selGfx);
    const marchGfx = new PIXI.Graphics(); world.addChild(marchGfx); marchGfxRef.current = marchGfx;
    const cmdGfx = new PIXI.Graphics(); world.addChild(cmdGfx); cmdGfxRef.current = cmdGfx;
    const cmdTextCont = new PIXI.Container(); world.addChild(cmdTextCont); cmdTextContRef.current = cmdTextCont;

    function drawSelection(key) {
      selGfx.clear();
      if (!key) return;
      const [sc, sr] = key.split(",").map(Number);
      const tile = tilesRef.current[key];
      if (!tile) return;

      // P10–P13 primary or part: draw white outline around full 2×2 footprint (outer border only)
      const pl = tile.powerLevel ?? 0;
      if (pl >= 10 && (tile.isKeep || tile.isKeepPart)) {
        // Resolve to primary
        const primKey   = tile.isKeepPart ? tile.keepPrimaryKey : key;
        const [pc, pr]  = (primKey || key).split(",").map(Number);
        const { cx, cy } = isoXY(pc, pr);
        // Single outer diamond encompassing all 4 cells — no internal lines
        const MERGED = [
          cx,        cy,            // N
          cx + TW,   cy + TH,       // E
          cx,        cy + TH * 2,   // S
          cx - TW,   cy + TH,       // W
        ];
        selGfx.lineStyle(3, 0xffffff, 0.95);
        selGfx.drawPolygon(MERGED);
        selGfx.lineStyle(0);
        return;
      }

      // Static keeps handled by keep layer; gates/regular tiles handled here
      if ((tile.isKeep && !tile.isGate) || tile.isKeepPart) return;
      const elev = (tile.isHQ||tile.isHQPart) ? 0 : tile.isWin ? 10 : (tile.isKeep||tile.isKeepPart) ? 8 : 4;
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
              if (!tile || !tile.rss || tile.isHQ || tile.isWin || tile.isHQPart || tile.isShore) continue;
              // Skip P1 (no individual props) and static keeps/keepparts
              const pl = tile.powerLevel || 1;
              if (pl === 1) continue;
              const isStaticKeep = (tile.isKeep && !tile.isGate) && pl < 10;
              const isStaticPart = tile.isKeepPart && pl < 10;
              if (isStaticKeep || isStaticPart) continue;
              // P10–P13 keepPart: skip — primary draws the single unified sprite
              if (tile.isKeepPart && pl >= 10) continue;
              const texPl = pl; // textures stored under raw pl, baked with syntheticPl for P10-P13
              const texMap = rssTextures[tile.rss];
              const tex = texMap?.[texPl] ?? texMap?.[pl] ?? texMap?.[2];
              if (!tex) continue;
              const { cx, cy } = isoXY(c, r);
              const sp = propsSpritePool.pop() ?? new PIXI.Sprite();
              sp.texture  = tex;
              sp.anchor.set(0.5, anchorY);
              // P10–P13 primary: center sprite on the 2×2 footprint midpoint
              if (tile.isKeep && pl >= 10) {
                sp.x = cx;
                sp.y = cy - 4 + TH;
              } else {
                sp.x = cx;
                sp.y = cy - 4 + TH * 0.5;
              }
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
        // Defer even the first draw — running synchronously here blocks the main
        // thread for 2+ seconds on iOS when called right after map gen dumps tiles.
        if (typeof window.requestIdleCallback === "function") {
          propsIdleHandle = window.requestIdleCallback(doProps);
        } else {
          propsIdleHandle = setTimeout(doProps, 100);
        }
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
      }, PIXI, isPanning);
    }

    function redrawHQs() {
      if (!hqContRef.current) return;
      buildHQLayer(hqContRef.current, tilesRef.current, selRef.current, (key, e) => {
        selRef.current = key;
        selGfx.clear();
        drawSelection(key);
        lastBoundsRef.current = null;
        onTileClickRef.current(key, e);
      }, PIXI, isPanning);
    }

    redrawRef.current = {
      redraw,
      redrawOverlays,
      redrawKeeps,
      redrawHQs,
      markPropsDirty,
      clearSel: () => { selGfx.clear(); redrawKeeps(); redrawHQs(); },
      redrawSelection: (key) => { selGfx.clear(); if (key) drawSelection(key); redrawKeeps(); redrawHQs(); },
      checkAndStartHellfire,
    };

    redraw(true);
    redrawOverlays();
    redrawKeeps();
    redrawHQs();

    // ── Hellfire animation ticker ─────────────────────────────────────────────
    // Dedicated Graphics layer above tileGfx. Runs every frame via app.ticker.
    // Uses tilesRef directly (always current). Correct diagonal iteration.
    const hellfireGfx = new PIXI.Graphics();
    world.addChild(hellfireGfx);

    // Pre-compute stable per-tile flame positions so they don't shift each frame
    const hellfireFlameCache = new Map();
    function getHellfireFlames(c, r) {
      const key = `${c},${r}`;
      if (hellfireFlameCache.has(key)) return hellfireFlameCache.get(key);
      // Deterministic RNG seeded per tile
      let s = (c * 2654435761 ^ r * 2246822519) >>> 0;
      const rng = () => { s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0; return (s >>> 0) / 0xffffffff; };
      // 1–2 small flames per tile — fewer is more convincing
      const count = 1 + Math.floor(rng() * 2);
      const flames = [];
      for (let i = 0; i < count; i++) {
        flames.push({
          ox: (rng() - 0.5) * TW * 0.40,   // offset from tile centre
          oy: (rng() - 0.5) * TH * 0.20,
          phase: rng() * Math.PI * 2,
          speed: 2.5 + rng() * 2.0,         // moderate flicker speed
          maxH: TH * (0.28 + rng() * 0.18), // short: 15–25px tall
          wid:  TW * (0.12 + rng() * 0.08), // wide base: 10–16px
        });
      }
      // 1–2 crack glow segments (positions along the static crack drawn at tile render)
      const cracks = [];
      // 6 radiating cracks matching static geometry
      const baseAngles = [0, Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3];
      for (let i = 0; i < 6; i++) {
        const lenFactor = 0.75 + rng() * 0.50;
        cracks.push({
          angle: baseAngles[i],
          len: TW * (0.22 + 0.07) * lenFactor, // matches crackBaseLen at t=0.5
          phase: rng() * Math.PI * 2,
          speed: 1.8 + rng() * 2.0,
        });
      }
      const data = { flames, cracks };
      hellfireFlameCache.set(key, data);
      return data;
    }

    const hellfireFn = () => {
      const t = performance.now() / 1000;
      const curTiles = tilesRef.current;
      hellfireGfx.clear();
      if (!curTiles) return;

      const b    = getViewBounds(2);
      const dMin = b.cMin + b.rMin;
      const dMax = b.cMax + b.rMax;

      for (let d = dMin; d <= dMax; d++) {
        const cLo = Math.max(b.cMin, d - b.rMax);
        const cHi = Math.min(b.cMax, d - b.rMin);
        for (let c = cLo; c <= cHi; c++) {
          const r = d - c;
          if (r < b.rMin || r > b.rMax) continue;
          const tile = curTiles[`${c},${r}`];
          if (!tile || tile.terrain !== "hellfire") continue;

          const { cx, cy } = isoXY(c, r);
          // Centre of tile top face
          const tcx = cx;
          const tcy = cy + TH * 0.5;

          const { flames, cracks } = getHellfireFlames(c, r);

          // ── 1. Crack glow pulses — lines radiating from tile center ──────────
          for (const ck of cracks) {
            const glow = 0.5 + 0.5 * Math.sin(t * ck.speed + ck.phase);
            // All cracks originate from tile center
            const ex = tcx + Math.cos(ck.angle) * ck.len;
            const ey = tcy + Math.sin(ck.angle) * ck.len * 0.38;
            // Outer glow line
            hellfireGfx.lineStyle(2.0, 0xff4400, 0.25 + glow * 0.35);
            hellfireGfx.moveTo(tcx, tcy);
            hellfireGfx.lineTo(ex, ey);
            // Core lava line
            hellfireGfx.lineStyle(1.2, 0xff6010, 0.50 + glow * 0.40);
            hellfireGfx.moveTo(tcx, tcy);
            hellfireGfx.lineTo(ex, ey);
            // Hot inner core (inner 55%)
            hellfireGfx.lineStyle(0.5, 0xffcc40, 0.35 + glow * 0.55);
            hellfireGfx.moveTo(tcx, tcy);
            hellfireGfx.lineTo(tcx + Math.cos(ck.angle) * ck.len * 0.55, tcy + Math.sin(ck.angle) * ck.len * 0.38 * 0.55);
            hellfireGfx.lineStyle(0);
            // Small origin pulse
            hellfireGfx.beginFill(0xff8800, 0.10 + glow * 0.18);
            hellfireGfx.drawCircle(tcx, tcy, 2.5 + glow * 1.5);
            hellfireGfx.endFill();
          }

          // Flame jets removed — only crack glow pulses remain.
        }
      }
    };

    app.ticker.add(hellfireFn);
    app.ticker.start();

    // checkAndStartHellfire kept as no-op for backward compat with tiles useEffect
    function checkAndStartHellfire() {}

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
            // Resolve P10-13 keepPart to primary so drawSelection outlines all 4 cells
            const rawTile = tilesRef.current[key];
            const selKey2 = (rawTile?.isKeepPart && (rawTile?.powerLevel ?? 0) >= 10 && rawTile?.keepPrimaryKey)
              ? rawTile.keepPrimaryKey : key;
            selGfx.clear();
            selRef.current = selKey2;
            drawSelection(selKey2);
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
      if (hellfireFn) app.ticker.remove(hellfireFn);
      cancelIdle();
      cancelPropsIdle();
      Object.values(rssTextures).forEach(texMap => {
        if (texMap && typeof texMap === 'object') {
          Object.values(texMap).forEach(rt => rt?.destroy?.(true));
        }
      });
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
    redrawRef.current?.redrawHQs();
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
