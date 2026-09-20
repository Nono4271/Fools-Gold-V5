import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, memo } from "react";
import * as PIXI from "pixi.js";
import {drawCommanderIcons, clearCommanderIcons} from "./utils/commanderIcons.js";
import {marchSegmentMs} from "../shared/utils/marchMotion.js";
import {usesNewWorldVisuals, sameTerritory, resourceFootprint, selectionEdgesBesideHq, hqJoinedBorderSegments} from "./utils/worldVisuals.js";
import {softenTerritoryColor} from "./utils/hqTerrainStyle.js";
import {createResourceSpriteCache} from "./utils/resourceSprites.js";
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

const DARK_VISUAL_TERRAIN = {
  grass:0x49503a, forest:0x303c2c, mountain:0x55544e, desert:0x62583e,
  river:0x24485b, ravine:0x292725, rockymountain:0x4a4b49, road:0x514a3d,
  hellfire:0x352d29, ruin:0x45423d, shore:0x625d4e,
};

// One world-space texture matrix keeps the grass continuous across tile edges.
const GROUND_TEXTURE_MATRIX = new PIXI.Matrix(0.7,0,0,0.46,0,0);
function fillVisualGround(gfx, points, c, r, terrain, useNewVisuals, groundTexture) {
  const natural = !['river','ravine','rockymountain','hellfire','shore','road'].includes(terrain);
  if (useNewVisuals && natural && groundTexture?.baseTexture.valid) {
    const tint = terrain === 'forest' ? 0xc3cfbc : terrain === 'mountain' ? 0xd2d0c6 : 0xffffff;
    gfx.beginTextureFill({texture:groundTexture,matrix:GROUND_TEXTURE_MATRIX,color:tint});
  } else {
    gfx.beginFill(useNewVisuals ? getSpawnVisualColor(c,r,terrain) : getTileBaseColor(c,r,terrain));
  }
  gfx.drawPolygon(points);gfx.endFill();
}

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

  // Check if point is inside the 2x2 diamond for a P10+ structure.
  // N tip at (cx, cy), half-widths TW and TH*2 total height.
  function inP10Footprint(wx, wy, pc, pr) {
    const { cx, cy } = isoXY(pc, pr);
    const elev = 4;
    return Math.abs(wx - cx) / TW + Math.abs(wy - (cy - elev + TH)) / TH <= 1.0;
  }

  function inKeepFootprint(wx, wy, pc, pr) {
    // 5x5 diamond centered at (pc,pr): half-width=TW*2.5, half-height=TH*2.5
    const { cx, cy } = isoXY(pc, pr);
    const midY = cy - 4 + TH * 0.5;
    return Math.abs(wx - cx) / (TW * 2.5) + Math.abs(wy - midY) / (TH * 2.5) <= 1.0;
  }

  function inHQFootprint(wx, wy, pc, pr) {
    // pc,pr is top-left of the 3x3 — center is at pc+1, pr+1
    const { cx, cy } = isoXY(pc + 1, pr + 1);
    const midY = cy + TH;
    return Math.abs(wx - cx) / (TW * 1.5) + Math.abs(wy - midY) / (TH * 1.5) <= 1.0;
  }

  // Scan ±3 tiles around estimate, checking large footprints first
  for (let dr = -3; dr <= 3; dr++) {
    for (let dc = -3; dc <= 3; dc++) {
      const c = cEst + dc, r = rEst + dr;
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
      const key = `${c},${r}`;
      const tile = tiles[key];
      if (!tile) continue;

      const pl = tile.powerLevel ?? 0;

      if (pl >= 10 && tile.isKeep) {
        if (inP10Footprint(wx, wy, c, r)) return key;
        continue;
      }

      if (tile.isKeep && !tile.isGate && pl < 10) {
        if (inKeepFootprint(wx, wy, c, r)) return key;
        continue;
      }

      if (tile.isHQ) {
        continue; // HQ clicks handled by PIXI hit area in buildHQLayer
      }

      // HQPart tiles — route click to the primary HQ tile key
      if (tile.isHQPart) {
        if (tile.hqPrimaryKey && inTile(wx, wy, c, r, 4)) return tile.hqPrimaryKey;
        continue;
      }

      const elev = tile.isWin ? 10 : 4;
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

/* ─── Tile ownership tint colors ─────────────────────────────────────────────
   player    → green  0x22cc55  (your tiles)
   crewmate  → blue   0x2299ff  (AI in your crew — tile.ownerPlayerId in crewmatePlayerIds)
   faction   → purple 0xaa44ff  (same faction, not your crew)
   enemy     → red    0xdc3c28
   ────────────────────────────────────────────────────────────────────────── */
function ownerTint(owner, tileFaction, playerFacKey, crewPids, ownerPlayerId) {
  if (owner === "player") return 0x22cc55; // green — player owned
  if (!owner) return null;
  const isAiOwned = owner === "ai" || (owner !== "player" && owner !== null);
  // Blue: crewmate-owned tile
  const isCrew = isAiOwned && ownerPlayerId && crewPids?.has(ownerPlayerId);
  if (isCrew) return 0x2299ff;
  // Orange: same faction (keeps, gates, AI ally tiles)
  if (tileFaction && playerFacKey && tileFaction === playerFacKey) return 0xe87830;
  return 0xdc3c28; // red: enemy
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

function getSpawnVisualColor(c, r, terrain) {
  const base = DARK_VISUAL_TERRAIN[terrain] ?? DARK_VISUAL_TERRAIN.grass;
  // Broad, smooth color drift makes neighboring diamonds read as one landscape.
  const wave = Math.sin(c * 0.19 + r * 0.13) * 0.035 + Math.sin(c * 0.07 - r * 0.11) * 0.025;
  const red=(base>>16)&255, green=(base>>8)&255, blue=base&255;
  const shift = channel => Math.max(0,Math.min(255,Math.round(channel*(1+wave))));
  return (shift(red)<<16)|(shift(green)<<8)|shift(blue);
}

function drawJoinedTerritoryEdges(gfx, tiles, c, r, tile, points, color) {
  const [nx,ny, ex,ey, sx,sy, wx,wy] = points;
  const edges = [
    [`${c},${r-1}`, nx,ny,ex,ey],
    [`${c+1},${r}`, ex,ey,sx,sy],
    [`${c},${r+1}`, sx,sy,wx,wy],
    [`${c-1},${r}`, wx,wy,nx,ny],
  ];
  for (const [neighborKey,x1,y1,x2,y2] of edges) {
    if (sameTerritory(tile,tiles[neighborKey])) continue;
    gfx.lineStyle(3.4,0x11120f,0.72);gfx.moveTo(x1,y1);gfx.lineTo(x2,y2);
    gfx.lineStyle(1.65,color,0.92);gfx.moveTo(x1,y1);gfx.lineTo(x2,y2);
  }
  gfx.lineStyle(0);
}

/* ══════════════════════════════════════════════════════════════════════════
   SINGLE-PASS DRAW FUNCTIONS
   All visible tiles drawn into ONE Graphics object per layer.
   No per-tile scene graph nodes. Camera moves = zero draw calls.
══════════════════════════════════════════════════════════════════════════ */

function drawAllTiles(gfx, tiles, rMin, rMax, cMin, cMax, selKey, mode, cByTile, mvCmdUid, zoom = 1, playerFacKey = null, crewPids = null, groundTexture = null) {
  if (!window.__rangeLogged) {

    window.__rangeLogged = true;
  }
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

      const { terrain, owner, isHQ, isWin, isKeep, isKeepPart, isHQPart, isShore, isGate, crossingType, crossingAxis } = tile;



      if (isShore) {
        const { cx, cy } = isoXY(c, r);
        const mid = cy + TH / 2;
        const TOP = [cx, cy, cx+TW/2, mid, cx, cy+TH, cx-TW/2, mid];
        gfx.beginFill(0x1a3a5c); gfx.drawPolygon(TOP); gfx.endFill();
        continue;
      }

      // Keep and keepPart tiles render as plain ground. Gate tiles render with their terrain.
      // P10–P13 single-tile structures are handled in second pass below.
      // Static keeps (5x5) and HQs (3x3) are handled in their own passes.
      // isHQPart tiles render their terrain here but NOT their owner border — buildHQLayer draws that.
      if ((isKeep && !isGate) || isKeepPart || isHQ) {
        if ((tile.powerLevel ?? 0) >= 10) continue; // P10+ handled in second pass
        continue; // keeps handled in third pass, HQ center in fourth pass
      }

      // ── Gate tiles: crossing / tollbridge / tunnel — distinct visuals ──────
      if (isGate) {
        const { cx, cy } = isoXY(c, r);
        const sy  = cy - 4;
        const mid = sy + TH / 2;
        const TOP = [cx, sy, cx+TW/2, mid, cx, sy+TH, cx-TW/2, mid];
        const ct  = crossingType;
        const axis = crossingAxis;
        const key = `${c},${r}`;
        const isSel   = selKey === key;
        const hasCmds = Boolean(cByTile[key]?.length);

        // ── Path tiles: isGate but NOT isKeep — render as plain border terrain ──
        // These are the 2 passable tiles between Gate A and Gate B. They have no
        // crossingType, so without this check they'd fall through to the tunnel else.
        if (!isKeep) {
          gfx.beginFill(getTileBaseColor(c, r, terrain)); gfx.drawPolygon(TOP); gfx.endFill();
          if (owner) {
            const ot = ownerTint(owner, tile?.faction, playerFacKey, crewPids, tile?.ownerPlayerId) ?? 0xdc3c28;
            // No fill - just border
            if (!isSel) { 
              // Black backing for contrast
              gfx.lineStyle(3, 0x000000, 0.8); gfx.drawPolygon(TOP); gfx.lineStyle(0);
              // Colored border on top
              gfx.lineStyle(2, ot, 1.0); gfx.drawPolygon(TOP); gfx.lineStyle(0);
            }
          }
          if (isSel) { gfx.lineStyle(1.5, 0xf0eedb, 0.92); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
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
            // Iron chain posts (perpendicular to border)
            // For V (vertical border in data), renders as NE-SW diagonal → needs NW-SE posts
            // For H (horizontal border in data), renders as NW-SE diagonal → needs NE-SW posts
            const isVerticalGate = crossingAxis === 'V';  // INVERTED from before
            const postA = isVerticalGate 
              ? { x: cx, y: mid - sh * 0.98 }  // top
              : { x: cx - sw * 0.98, y: mid }; // left
            const postB = isVerticalGate
              ? { x: cx, y: mid + sh * 0.98 }  // bottom
              : { x: cx + sw * 0.98, y: mid - sh * 0.05 }; // right
            gfx.beginFill(0x606878, 0.9);
            gfx.drawCircle(postA.x, postA.y, TW * 0.045);
            gfx.drawCircle(postB.x, postB.y, TW * 0.045);
            gfx.endFill();
            gfx.lineStyle(1.2, 0xa0a8b0, 0.8);
            gfx.drawCircle(postA.x, postA.y, TW * 0.045);
            gfx.drawCircle(postB.x, postB.y, TW * 0.045);
            gfx.lineStyle(0);
            // Heavy dashed iron chain between posts
            gfx.lineStyle(2.2, 0x6a7888, 0.85);
            gfx.moveTo(postA.x, postA.y - TH * 0.12);
            gfx.bezierCurveTo(
              cx, mid - sh * 0.55,
              cx, mid - sh * 0.55,
              postB.x, postB.y - TH * 0.12
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
            // Stone arch pillars — perpendicular to border
            // For V (vertical border in data), renders as NE-SW diagonal → needs NW-SE pillars
            // For H (horizontal border in data), renders as NW-SE diagonal → needs NE-SW pillars
            const isVerticalGate = crossingAxis === 'V';  // INVERTED
            const pilW = TW * 0.09, pilH = TH * 0.38;
            const pilA = isVerticalGate
              ? { x: cx, y: mid - TH * 0.30 }  // top
              : { x: cx - TW * 0.15, y: mid - TH * 0.07 };  // left
            const pilB = isVerticalGate
              ? { x: cx, y: mid + TH * 0.12 }  // bottom
              : { x: cx + TW * 0.15, y: mid - TH * 0.07 };  // right
            const pilTopY = mid - TH * 0.26;
            
            // Pillar A
            gfx.beginFill(0x5a5650, 0.95);
            if (isVerticalGate) {
              gfx.drawPolygon([
                pilA.x - pilW, pilA.y, pilA.x + pilW, pilA.y,
                pilA.x + pilW, pilA.y + pilH, pilA.x - pilW, pilA.y + pilH
              ]);
            } else {
              gfx.drawPolygon([
                pilA.x - pilW, pilTopY + pilH, pilA.x - pilW, pilTopY,
                pilA.x + pilW * 0.2, pilTopY, pilA.x + pilW * 0.2, pilTopY + pilH
              ]);
            }
            gfx.endFill();
            
            // Pillar B
            gfx.beginFill(0x4a4640, 0.95);
            if (isVerticalGate) {
              gfx.drawPolygon([
                pilB.x - pilW, pilB.y, pilB.x + pilW, pilB.y,
                pilB.x + pilW, pilB.y + pilH, pilB.x - pilW, pilB.y + pilH
              ]);
            } else {
              gfx.drawPolygon([
                pilB.x - pilW * 0.2, pilTopY, pilB.x + pilW, pilTopY,
                pilB.x + pilW, pilTopY + pilH, pilB.x - pilW * 0.2, pilTopY + pilH
              ]);
            }
            gfx.endFill();
            // Lintel (beam across pillars)
            gfx.beginFill(0x6a6660, 0.9);
            if (isVerticalGate) {
              // Vertical gate: lintel connects top of both pillars horizontally
              gfx.drawPolygon([
                pilA.x - pilW, pilA.y, pilA.x + pilW, pilA.y,
                pilA.x + pilW, pilA.y + TH * 0.05, pilA.x - pilW, pilA.y + TH * 0.05
              ]);
            } else {
              // Horizontal gate: lintel connects top of pillars
              gfx.drawPolygon([
                pilA.x - pilW, pilTopY, pilB.x + pilW, pilTopY - TH * 0.02,
                pilB.x + pilW, pilTopY + TH * 0.05, pilA.x - pilW, pilTopY + TH * 0.05
              ]);
            }
            gfx.endFill();
            // Keystone — wedge at center of lintel
            gfx.beginFill(0x8a8478, 1.0);
            if (isVerticalGate) {
              gfx.drawPolygon([
                cx - TW * 0.02, pilA.y - TH * 0.02,
                cx + TW * 0.02, pilA.y - TH * 0.02,
                cx, pilA.y + TH * 0.03
              ]);
            } else {
              gfx.drawPolygon([
                cx, pilTopY - TH * 0.08,
                cx + TW * 0.06, pilTopY + TH * 0.01,
                cx - TW * 0.06, pilTopY + TH * 0.01
              ]);
            }
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
          const ot = ownerTint(owner, tile?.faction, playerFacKey, crewPids, tile?.ownerPlayerId) ?? 0xdc3c28;
          // NO FILL for owned crossings/tunnels
          if (!isSel) { gfx.lineStyle(2, ot, 1.0); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
        }
        if (mode === "selectMarchDest" && owner !== "player") {
          gfx.beginFill(0x000000, 0.45); gfx.drawPolygon(TOP); gfx.endFill();
        }
        if (isSel) {
          gfx.lineStyle(1.5, 0xf0eedb, 0.92); gfx.drawPolygon(TOP); gfx.lineStyle(0);
        }
        continue;
      }

      const key = `${c},${r}`;
      const useNewVisuals = usesNewWorldVisuals(c,r);
      const isSel    = selKey === key;
      const isMvTgt  = mode === "selectMarchDest" && mvCmdUid && owner === "player";
      const hasCmds  = Boolean(cByTile[key]?.length);
      const elev     = isWin ? 10 : 4;
      const { cx, cy } = isoXY(c, r);
      const sy  = cy - elev;
      const mid = sy + TH / 2;

      // +0.5px on the bottom vertex closes the sub-pixel gap between adjacent
      // tile rows that causes horizontal white lines on some PC WebGL drivers.
      const TOP      = [cx, sy, cx+TW/2, mid, cx, sy+TH, cx-TW/2, mid];

      const drawAsKeep = isKeep || isKeepPart;
      const drawAsHQ   = isHQ   || isHQPart;

      if (isWin && !owner) {
        gfx.beginFill(0x2a2000);       gfx.drawPolygon(TOP); gfx.endFill();
        gfx.beginFill(0xf0c040, 0.55); gfx.drawPolygon(TOP); gfx.endFill();
        if (zoom >= 0.75) { gfx.lineStyle(2, 0xf0c040, 0.8); gfx.drawPolygon(TOP); gfx.lineStyle(0); }
      } else {
        fillVisualGround(gfx,TOP,c,r,terrain,useNewVisuals,groundTexture);
        // Hellfire terrain: add a subtle red-orange lava glow tint over the dark base
        if (terrain === "hellfire") {
          const rng2 = tileRng(c + 3, r + 7);
          const glowAlpha = 0.12 + rng2() * 0.08;
          gfx.beginFill(0xcc2800, glowAlpha); gfx.drawPolygon(TOP); gfx.endFill();
        }
        // Shade triangles removed — they created a visible X/cross pattern on each tile.
      }

      if (owner) {
        const ot = ownerTint(owner, tile?.faction, playerFacKey, crewPids, tile?.ownerPlayerId) ?? 0xdc3c28;
        // Don't draw fill on HQ tiles - just the outer border (drawn in renderHQSpriteGroup)
        // Regular tiles: no fill, just 1px border
        if (!drawAsHQ) {
          // NO FILL - removed: gfx.beginFill(ot, 0.18);
        }
        // Regular tiles and gates get borders here; HQ borders drawn in renderHQSpriteGroup
        if (!isSel && !drawAsHQ) {
          if (useNewVisuals) {
            gfx.beginFill(ot,0.045);gfx.drawPolygon(TOP);gfx.endFill();
            drawJoinedTerritoryEdges(gfx,tiles,c,r,tile,TOP,ot);
          } else {
            gfx.lineStyle(2, ot, 1.0); gfx.drawPolygon(TOP); gfx.lineStyle(0);
          }
        }
      }

      if (mode === "selectMarchDest" && owner !== "player") {
        gfx.beginFill(0x000000, 0.45); gfx.drawPolygon(TOP); gfx.endFill();
      }
      if (isMvTgt) {
        gfx.beginFill(0x28dc6e, 0.22); gfx.drawPolygon(TOP); gfx.endFill();
      }

      if (isSel) {
        gfx.lineStyle(1.5, 0xf0eedb, 0.92); gfx.drawPolygon(TOP); gfx.lineStyle(0);
      }
    }
  }

  // ── Second pass: P10–P13 drawn AFTER all regular tiles at 2x visual size ────
  // P10+ is now a single tile that renders at double width/height visually.
  // Range extended by 2 so south tip of 2x diamond isn't clipped by later diagonal strips.
  for (let d = dMin; d <= dMax + 2; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile) continue;
      const pl = tile.powerLevel ?? 0;
      if (pl < 10 || !tile.isKeep || tile.isGate || tile.isWin) continue;
      // 2x2 diamond: N tip at primary tile top, covers exactly the same area as 4 tiles
      const MERGED = resourceFootprint(c,r,tile).points;
      fillVisualGround(gfx,MERGED,c,r,tile.terrain,usesNewWorldVisuals(c,r),groundTexture);
      gfx.lineStyle(0);

      // Owner tint
      const owner2 = tile.owner || null;
      if (owner2) {
        const ot = ownerTint(owner2, tile?.faction, playerFacKey, crewPids, tile?.ownerPlayerId) ?? 0xdc3c28;
        gfx.lineStyle(2, ot, 1.0);
        gfx.drawPolygon(MERGED);
        gfx.lineStyle(0);
      }
    }
  }

  // ── Third pass: static keeps drawn as single 5x5 diamond ─────────────────
  for (let d = dMin; d <= dMax + 4; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile) continue;
      const pl = tile.powerLevel ?? 0;
      if (pl >= 10 || !tile.isKeep || tile.isGate || tile.isWin) continue;
      // 5x5 diamond centered on data tile
      const { cx, cy } = isoXY(c, r);
      const elev = 4;
      const KEEP5 = [
        cx,          cy - elev - TH * 2,       // N
        cx + TW*2.5, cy - elev + TH * 0.5,    // E
        cx,          cy - elev + TH * 3,       // S
        cx - TW*2.5, cy - elev + TH * 0.5,    // W
      ];
      fillVisualGround(gfx,KEEP5,c,r,tile.terrain,usesNewWorldVisuals(c,r),groundTexture);
      gfx.lineStyle(0);
      // Owner tint
      const owner3 = tile.owner || null;
      if (owner3) {
        const ot = ownerTint(owner3, tile?.faction, playerFacKey, crewPids, tile?.ownerPlayerId) ?? 0xdc3c28;
        gfx.lineStyle(2, ot, 1.0);
        gfx.drawPolygon(KEEP5);
        gfx.lineStyle(0);
      }
    }
  }

  // ── Holy Grail pass: draw isWin tile as a gold 5x5 keep structure ──────────
  for (let d = dMin; d <= dMax + 4; d++) {
    const cLo = Math.max(cMin, d - rMax);
    const cHi = Math.min(cMax, d - rMin);
    for (let c = cLo; c <= cHi; c++) {
      const r = d - c;
      if (r < rMin || r > rMax) continue;
      const tile = tiles[`${c},${r}`];
      if (!tile?.isWin) continue;
      const { cx, cy } = isoXY(c, r);
      const elev = 10;
      const KEEP5 = [
        cx,          cy - elev - TH * 2,
        cx + TW*2.5, cy - elev + TH * 0.5,
        cx,          cy - elev + TH * 3,
        cx - TW*2.5, cy - elev + TH * 0.5,
      ];
      gfx.beginFill(0x2a2000); gfx.drawPolygon(KEEP5); gfx.endFill();
      gfx.beginFill(0xf0c040, 0.45); gfx.drawPolygon(KEEP5); gfx.endFill();
      gfx.lineStyle(2, 0xf0c040, 0.9); gfx.drawPolygon(KEEP5); gfx.lineStyle(0);
      if (tile.owner) {
        const ot = ownerTint(tile.owner, tile.faction, playerFacKey, crewPids, tile.ownerPlayerId) ?? 0xdc3c28;
        gfx.lineStyle(2.5, ot, 1.0); gfx.drawPolygon(KEEP5); gfx.lineStyle(0);
      }
    }
  }

  // ── Fourth pass: HQs are fully rendered by buildHQLayer/_buildOneHQ ─────────
  // No additional drawing needed here.
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
      if (tile.rss && usesNewWorldVisuals(c,r)) continue;
      // Gate tiles and P10-13 structures get props; static keeps do not
      const isStaticKeep = (tile.isKeep && !tile.isGate) && (tile.powerLevel ?? 0) < 10;
      const isStaticPart = tile.isKeepPart && (tile.powerLevel ?? 0) < 10;
      if (isStaticKeep || isStaticPart) continue;
      const pl = tile.powerLevel || 1;
      const { cx, cy } = isoXY(c, r);
      const sy = cy - 4;
      if (pl === 1) continue; // P1 has all resources but no individual props
      if (tile.rss) {
        if (tile.isKeep && pl >= 10) {
          // Single tile at 2x size — prop centered on the tile's visual midpoint
          const syntheticPl = 13 + (pl - 9) * 3;
          drawRssProp(gfx, tile.rss, cx, cy + TH / 2, c, r, syntheticPl);
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
                  : tile.rss === "gas"   ? 0x3ad966  // green pool, matches the new gas prop art
                  :                        0xc87830; // food
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

  } else if (rss === "gas") {
    // ── Shared wisp helper — curling green vapor rising from a point ─────────
    // wsc scales the whole wisp; each entry is two chained cubic-bezier
    // segments (mirrors the S-curl used in the approved concept mockup).
    function drawGasWisps(ox, oy, wsc) {
      const wisps = [
        { d: [-8,-14, 2,-24, -6,-34, -14,-44, -2,-50, -8,-60], w: 4, color: 0x3ad966, alpha: 0.60 },
        { d: [ 8,-14,-2,-24,  6,-34,  14,-44,  2,-50,  8,-60], w: 3, color: 0x7af08c, alpha: 0.50 },
        { d: [ 0,-16, 0,-26,  0,-40,   0,-50,  0,-58,  0,-70], w: 2, color: 0xc6ffcf, alpha: 0.55 },
      ];
      wisps.forEach(w => {
        const [c1x,c1y,c2x,c2y,ex,ey,c3x,c3y,c4x,c4y,fx,fy] = w.d;
        gfx.lineStyle(w.w*wsc, w.color, w.alpha);
        gfx.moveTo(ox, oy);
        gfx.bezierCurveTo(ox+c1x*wsc, oy+c1y*wsc, ox+c2x*wsc, oy+c2y*wsc, ox+ex*wsc, oy+ey*wsc);
        gfx.bezierCurveTo(ox+c3x*wsc, oy+c3y*wsc, ox+c4x*wsc, oy+c4y*wsc, ox+fx*wsc, oy+fy*wsc);
        gfx.lineStyle(0);
        gfx.beginFill(w.color, w.alpha*0.9); gfx.drawCircle(ox, oy, w.w*wsc*0.5); gfx.endFill();
      });
    }
    // Shared pool — a dark, faintly green-glowing pool the gas seeps out of.
    function drawGasPool(px, py, prx, pry) {
      gfx.beginFill(0x000000, 0.28); gfx.drawEllipse(px, py+pry*0.3, prx*1.25, pry*0.9); gfx.endFill();
      gfx.beginFill(0x0c1a10); gfx.drawEllipse(px, py, prx, pry); gfx.endFill();
      gfx.beginFill(0x1e8a3c, 0.22); gfx.drawEllipse(px, py, prx, pry); gfx.endFill();
    }

    if (pl >= 22) {
      // ── P12/P13: Gas Refinery ────────────────────────────────────────────
      const tierScale = pl >= 25 ? 3.5 : 2.8;
      const sc = TH * 0.45 / 88 * tierScale;
      const twoTanks = pl >= 25;
      const poolX = cx - 6*sc, poolY = base - 6*sc;
      drawGasPool(poolX, poolY, 34*sc, 13*sc);
      // storage tank(s) with glowing level windows
      function drawTank(tx, tbase, tw, th, glowColor) {
        gfx.beginFill(0x4a4a48); gfx.drawRoundedRect(tx-tw*0.5, tbase-th, tw, th, tw*0.15); gfx.endFill();
        gfx.beginFill(0x0c1a10); gfx.drawRoundedRect(tx-tw*0.3, tbase-th*0.8, tw*0.6, th*0.55, tw*0.1); gfx.endFill();
        gfx.beginFill(glowColor, 0.85); gfx.drawRect(tx-tw*0.26, tbase-th*0.42, tw*0.52, th*0.32); gfx.endFill();
        gfx.beginFill(0x3a3228); gfx.drawCircle(tx+tw*0.28, tbase-th*0.92, tw*0.14); gfx.endFill();
      }
      if (twoTanks) {
        drawTank(cx-38*sc, base-2*sc, 22*sc, 30*sc, 0x3ad966);
        drawTank(cx+34*sc, base-8*sc, 24*sc, 38*sc, 0x7af08c);
        gfx.lineStyle(3*sc, 0x3a3228, 1);
        gfx.moveTo(cx-27*sc, base-24*sc); gfx.lineTo(cx+22*sc, base-30*sc);
        gfx.lineStyle(0);
      } else {
        drawTank(cx+30*sc, base-4*sc, 24*sc, 36*sc, 0x3ad966);
        gfx.lineStyle(3*sc, 0x3a3228, 1);
        gfx.moveTo(poolX+20*sc, base-10*sc); gfx.lineTo(cx+22*sc, base-16*sc);
        gfx.lineStyle(0);
      }
      // flare stack with a big wispy plume
      const stackX = cx - 2*sc, stackTop = base - 30*sc;
      gfx.beginFill(0x3a3228); gfx.drawRect(stackX-2.5*sc, stackTop, 5*sc, 30*sc); gfx.endFill();
      drawGasWisps(stackX, stackTop, sc * 1.15);
      // ambient leak wisps around the base
      drawGasWisps(poolX-24*sc, base-4*sc, sc * 0.6);
      drawGasWisps(poolX+30*sc, base+2*sc, sc * 0.55);
    } else if (pl >= 16) {
      // ── P10/P11: Gas Well ─────────────────────────────────────────────────
      const tierScale = pl >= 19 ? 2.2 : 1.7;
      const sc = TH * 0.45 / 88 * tierScale;
      const poolX = cx - 4*sc, poolY = base - 4*sc;
      drawGasPool(poolX, poolY, 30*sc, 12*sc);
      // simple wooden collection frame straddling the pool
      gfx.lineStyle(3*sc, 0x5a4a34, 1);
      gfx.moveTo(poolX-22*sc, base+2*sc); gfx.lineTo(poolX-10*sc, base-26*sc);
      gfx.moveTo(poolX+24*sc, base+2*sc); gfx.lineTo(poolX+10*sc, base-26*sc);
      gfx.moveTo(poolX-16*sc, base-10*sc); gfx.lineTo(poolX+18*sc, base-10*sc);
      gfx.lineStyle(0);
      gfx.beginFill(0x3a3228); gfx.drawRoundedRect(poolX-8*sc, base-32*sc, 16*sc, 10*sc, 2*sc); gfx.endFill();
      // small holding tank with a glowing window
      const tx = poolX+30*sc, tbase = base+4*sc;
      gfx.beginFill(0x4a4a48); gfx.drawRoundedRect(tx-8*sc, tbase-22*sc, 16*sc, 22*sc, 2.5*sc); gfx.endFill();
      gfx.beginFill(0x3ad966, 0.8); gfx.drawRect(tx-4*sc, tbase-14*sc, 8*sc, 8*sc); gfx.endFill();
      gfx.lineStyle(2.5*sc, 0x3a3228, 1);
      gfx.moveTo(poolX+8*sc, base-24*sc); gfx.lineTo(tx, tbase-22*sc);
      gfx.lineStyle(0);
      // uncontained wisps still escaping around the rig
      drawGasWisps(poolX-20*sc, base-2*sc, sc * 0.75);
      drawGasWisps(poolX+2*sc, base-30*sc, sc * 0.55);
    } else {
      // ── P2–P9: Gas Pool ───────────────────────────────────────────────────
      const prx = s * 0.14 * sizeMult, pry = s * 0.10 * sizeMult;
      const px = cx + (rnd()-0.5)*s*0.06;
      const py = base - pry*0.3;
      drawGasPool(px, py, prx, pry);
      drawGasWisps(px, py - pry*0.3, sizeMult * 0.55);
      if (sizeMult > 0.60) {
        const prx2 = prx*0.55, pry2 = pry*0.55;
        const px2 = px + prx*1.1, py2 = py + pry*0.3;
        drawGasPool(px2, py2, prx2, pry2);
        drawGasWisps(px2, py2 - pry2*0.3, sizeMult * 0.35);
      }
    }

  } else if (rss === "food") {
    // ── Food prop: Withered Wheat (P2–P9), Plague Storehouse (P10–P11), Cursed Granary (P12–P13)
    if (pl >= 22) {
      // P12/P13: Cursed Granary — 2 or 3 conical silos
      const tierScale = pl >= 25 ? 3.5 : 2.8;
      const sc = TH * 0.45 / 88 * tierScale;
      const numSilos = pl >= 25 ? 3 : 2;
      gfx.beginFill(0x000000, 0.28); gfx.drawEllipse(cx, base, 62*sc, 13*sc); gfx.endFill();
      // Dead crop scatter
      [[-28*sc,-2*sc],[24*sc,-3*sc],[-10*sc,-1*sc]].forEach(([ox,oy]) => {
        const sx=cx+ox, sy2=base+oy;
        gfx.beginFill(0x1a1810); gfx.drawEllipse(sx, sy2-5*sc, 1.5*sc, 3.5*sc); gfx.endFill();
        gfx.beginFill(0x3a2808); gfx.drawEllipse(sx+3*sc, sy2-4*sc, 1.5*sc, 3*sc); gfx.endFill();
      });
      const siloData = numSilos === 2
        ? [{ ox:-17*sc, h:70*sc, w:13*sc }, { ox:17*sc, h:76*sc, w:13*sc }]
        : [{ ox:-30*sc, h:60*sc, w:11*sc }, { ox:0, h:78*sc, w:14*sc }, { ox:28*sc, h:62*sc, w:11*sc }];
      siloData.forEach(({ ox, h, w }) => {
        const sx = cx + ox;
        gfx.beginFill(0x0e0c08);
        gfx.drawPolygon([sx-w-4*sc, base, sx-w-2*sc, base-h, sx-w+1*sc, base-h, sx-w, base]);
        gfx.endFill();
        gfx.beginFill(0x28241a); gfx.drawRect(sx-w, base-h, w*2, h); gfx.endFill();
        gfx.beginFill(0x38342a);
        gfx.drawPolygon([sx-w, base-h, sx+w, base-h, sx+w+4*sc, base-h-5*sc, sx-w+4*sc, base-h-5*sc]);
        gfx.endFill();
        const roofH = 24*sc;
        gfx.beginFill(0x1e1608);
        gfx.drawPolygon([sx-w-2*sc, base-h, sx, base-h-roofH, sx+w+2*sc, base-h]);
        gfx.endFill();
        gfx.beginFill(0x100c04);
        gfx.drawPolygon([sx, base-h-roofH, sx+w+2*sc, base-h, sx+w, base-h]);
        gfx.endFill();
      });
      // Bone meal sacks
      [cx-32*sc, cx+26*sc].forEach(bx => {
        gfx.beginFill(0x1a1610); gfx.drawEllipse(bx, base-4*sc, 10*sc, 4*sc); gfx.endFill();
        gfx.beginFill(0x38341e); gfx.drawEllipse(bx, base-9*sc, 9*sc, 5.5*sc); gfx.endFill();
        gfx.beginFill(0x48432a); gfx.drawEllipse(bx, base-14*sc, 7.5*sc, 4.5*sc); gfx.endFill();
      });
      if (pl >= 25) {
        gfx.beginFill(0xa07810, 0.10); gfx.drawEllipse(cx, base-22*sc, 20*sc, 10*sc); gfx.endFill();
      }
    } else if (pl >= 16) {
      // P10/P11: Plague Storehouse
      const tierScale = pl >= 19 ? 2.2 : 1.7;
      const sc = TH * 0.45 / 88 * tierScale;
      const hasAnnex = pl >= 19;
      gfx.beginFill(0x000000, 0.28); gfx.drawEllipse(cx, base, 58*sc, 12*sc); gfx.endFill();
      // Dead crop scatter
      for (let i = 0; i < 5; i++) {
        const ang = (i/5)*Math.PI*2;
        const sx=cx+Math.cos(ang)*34*sc, sy2=base+Math.sin(ang)*7*sc;
        gfx.beginFill(0x1a0c04); gfx.drawEllipse(sx, sy2-6*sc, 1.5*sc, 3*sc); gfx.endFill();
      }
      // Storehouse body
      const bldgW=28*sc, bldgH=36*sc, bldgX=cx-bldgW;
      gfx.beginFill(0x0e0c08);
      gfx.drawPolygon([bldgX-4*sc, base, bldgX-2*sc, base-bldgH, bldgX+1*sc, base-bldgH, bldgX-1*sc, base]);
      gfx.endFill();
      gfx.beginFill(0x22201a); gfx.drawRect(bldgX, base-bldgH, bldgW*2, bldgH); gfx.endFill();
      gfx.beginFill(0x302e24);
      gfx.drawPolygon([bldgX, base-bldgH, bldgX+bldgW*2, base-bldgH, bldgX+bldgW*2+5*sc, base-bldgH-5*sc, bldgX+5*sc, base-bldgH-5*sc]);
      gfx.endFill();
      const roofH=16*sc;
      gfx.beginFill(0x1c1508);
      gfx.drawPolygon([bldgX-2*sc, base-bldgH, bldgX+bldgW-4*sc, base-bldgH-roofH, bldgX+bldgW*2+2*sc, base-bldgH]);
      gfx.endFill();
      // Barred windows with green glow
      [[bldgX+bldgW*0.35, base-bldgH*0.55],[bldgX+bldgW*1.4, base-bldgH*0.55]].forEach(([wx,wy]) => {
        gfx.beginFill(0x080604); gfx.drawRect(wx-5*sc, wy-5*sc, 10*sc, 10*sc); gfx.endFill();
        gfx.beginFill(0x204a10, 0.35); gfx.drawRect(wx-5*sc, wy-5*sc, 10*sc, 10*sc); gfx.endFill();
      });
      // Door with plague mark
      gfx.beginFill(0x1a1408); gfx.drawRect(cx+bldgW-6*sc, base-16*sc, 12*sc, 14*sc); gfx.endFill();
      gfx.beginFill(0xd04010, 0.8); gfx.drawCircle(cx+bldgW, base-9*sc, 3.5*sc); gfx.endFill();
      gfx.beginFill(0x080604); gfx.drawCircle(cx+bldgW, base-9*sc, 2*sc); gfx.endFill();
      // Diseased sacks
      [[-22*sc,0],[-28*sc,-6*sc]].forEach(([ox,oy]) => {
        gfx.beginFill(0x282210); gfx.drawEllipse(cx+ox, base+oy, 9*sc, 5.5*sc); gfx.endFill();
        gfx.beginFill(0x383020); gfx.drawEllipse(cx+ox, base+oy-4*sc, 7.5*sc, 4.5*sc); gfx.endFill();
        gfx.beginFill(0x204810, 0.6); gfx.drawCircle(cx+ox-3*sc, base+oy-3*sc, 2*sc); gfx.endFill();
      });
      // Smoke vent
      const ventX=bldgX+bldgW*0.9, ventY=base-bldgH-roofH*0.6;
      gfx.beginFill(0x1a1408); gfx.drawRect(ventX-3*sc, ventY-10*sc, 6*sc, 12*sc); gfx.endFill();
      for (let v=0; v<5; v++) {
        const vp=v/4, vy=ventY-12*sc-vp*18*sc, vx=ventX+Math.sin(vp*4)*3*sc;
        gfx.beginFill(0x2a3818, (1-vp)*0.4); gfx.drawCircle(vx, vy, (2.5+vp*4)*sc); gfx.endFill();
      }
      if (hasAnnex) {
        const ax=bldgX+bldgW*2, aw=16*sc, ah=24*sc;
        gfx.beginFill(0x1e1c14); gfx.drawRect(ax, base-ah, aw, ah); gfx.endFill();
        gfx.beginFill(0x28261c);
        gfx.drawPolygon([ax, base-ah, ax+aw, base-ah, ax+aw+3*sc, base-ah-4*sc, ax+3*sc, base-ah-4*sc]);
        gfx.endFill();
        gfx.beginFill(0x080604); gfx.drawRect(ax+4*sc, base-ah*0.55, 8*sc, 8*sc); gfx.endFill();
        gfx.beginFill(0x204a10, 0.3); gfx.drawRect(ax+4*sc, base-ah*0.55, 8*sc, 8*sc); gfx.endFill();
      }
    } else {
      // P2–P9: Withered wheat stalks
      const h = s * 0.95 * sizeMult;
      const spread = s * 0.45 * sizeMult;
      const count = pl <= 2 ? 3 : pl <= 4 ? 5 : pl <= 6 ? 8 : 12;
      gfx.beginFill(0x000000, 0.22);
      gfx.drawEllipse(cx, base, spread * 1.1, s * sizeMult * 0.10);
      gfx.endFill();
      for (let i = 0; i < count; i++) {
        const frac = count > 1 ? i / (count - 1) : 0.5;
        const ox = (frac - 0.5) * spread * 2;
        const lean = ox * 0.35;
        const stalkH = h * (0.72 + rnd() * 0.32);
        const stalkX = cx + ox;
        const dark = pl >= 7 ? 0x3a2810 : 0x4a3810;
        const lite  = pl >= 7 ? 0x5a3e14 : 0x6a5018;
        gfx.beginFill(dark);
        gfx.drawPolygon([stalkX, base, stalkX+lean-s*0.012, base-stalkH, stalkX+lean, base-stalkH, stalkX+s*0.016, base]);
        gfx.endFill();
        gfx.beginFill(lite);
        gfx.drawPolygon([stalkX+s*0.016, base, stalkX+lean, base-stalkH, stalkX+lean+s*0.010, base-stalkH, stalkX+s*0.024, base]);
        gfx.endFill();
        // Wheat head
        const hx=stalkX+lean, hy=base-stalkH;
        const headDroop=s*sizeMult*0.14;
        const headAngle=0.3+(frac-0.5)*0.4;
        const podColor=pl>=7?0x5a4010:0xa08828;
        const podLite=pl>=7?0x7a5818:0xc8a830;
        gfx.beginFill(dark);
        gfx.drawPolygon([hx, hy, hx+Math.sin(headAngle)*headDroop*0.5, hy+headDroop*0.5, hx+Math.sin(headAngle)*headDroop, hy+headDroop]);
        gfx.endFill();
        for (let k=0; k<3; k++) {
          const kf=k/2;
          const kx=hx+Math.sin(headAngle)*headDroop*kf, ky=hy+headDroop*kf;
          gfx.beginFill(podColor); gfx.drawEllipse(kx, ky, s*sizeMult*0.042, s*sizeMult*0.026); gfx.endFill();
          if (k<2) { gfx.beginFill(podLite, 0.7); gfx.drawEllipse(kx-s*0.006, ky-s*0.007, s*sizeMult*0.022, s*sizeMult*0.014); gfx.endFill(); }
        }
        if (pl>=6 && i%3===0) {
          gfx.beginFill(0x1a0c04);
          gfx.drawPolygon([stalkX+s*0.01, base, stalkX+lean*0.6+s*0.01, base-stalkH*0.5, stalkX+lean*0.6+s*0.018, base-stalkH*0.5, stalkX+s*0.02, base]);
          gfx.endFill();
        }
      }
      if (pl>=7) {
        gfx.beginFill(0x0e0800, 0.28);
        gfx.drawEllipse(cx, base, spread*0.6, s*sizeMult*0.05);
        gfx.endFill();
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

const HQ_SPRITES = {
  pirates:       "hq_pirates.webp",
  orcs:          "hq_orcs.webp",
  nightcreatures:"hq_nightcreatures.webp",
  holyknights:   "hq_holyknights.webp",
  dragons:       "hq_dragons.webp",
  wizards:       "hq_arcane.webp",
  coldborns:     "hq_coldborns.webp",
  ashen_dead:  "hq_ashen_dead.webp",
  player:        "hq_pirates.webp",
  ai:            "hq_orcs.webp",
};

const FORT_SPRITES = {
  1: "/forts/fort_l1.webp",
  2: "/forts/fort_l2.webp",
  3: "/forts/fort_l3.webp",
  4: "/forts/fort_l4.webp",
  5: "/forts/fort_l5.webp",
};

const _hqStateCache = new Map(); // tileKey → { faction, owner, isSelected }
const _hqKeyIndex = new Set();
export function clearHQCache() { _hqStateCache.clear(); _hqKeyIndex.clear(); }

// ── Fort sprite layer ─────────────────────────────────────────────────────────
const _fortSpriteMap = new Map(); // tileKey → PIXI.Sprite
export function clearFortCache() { _fortSpriteMap.clear(); }

function buildFortSprite(fort, PIXI, texCache, fortLayer) {
  const tileKey = fort.tileKey;
  if (_fortSpriteMap.has(tileKey)) return; // already rendered

  const [fc, fr] = tileKey.split(",").map(Number);
  const { cx, cy } = isoXY(fc, fr);
  const spriteUrl = FORT_SPRITES[fort.level] || FORT_SPRITES[1];

  const applySprite = (sp) => {
    // 1x1 tile: diamond is TW wide. Scale sprite to fit.
    const w = TW * 0.9;
    sp.width = w;
    sp.height = w;
    sp.anchor.set(0.5, 0.6);
    sp.x = cx;
    sp.y = cy + TH * 0.25; // shift to visual center of tile diamond
    sp.zOrder = cy;
    sp.__fortLevel = fort.level;
    _fortSpriteMap.set(tileKey, sp);
    fortLayer.addChild(sp);
  };

  if (texCache[spriteUrl]) {
    const sp = new PIXI.Sprite(texCache[spriteUrl]);
    applySprite(sp);
  } else {
    PIXI.Texture.fromURL(spriteUrl).then(tex => {
      texCache[spriteUrl] = tex;
      if (!fortLayer.destroyed) {
        const sp = new PIXI.Sprite(tex);
        applySprite(sp);
      }
    }).catch(() => {
      if (fortLayer.destroyed) return;
      // Fort sprite not found — render a fallback diamond
      const gfx = new PIXI.Graphics();
      gfx.beginFill(0x8a6020, 0.8);
      gfx.drawPolygon([cx, cy - TH/2, cx + TW/2, cy, cx, cy + TH/2, cx - TW/2, cy]);
      gfx.endFill();
      _fortSpriteMap.set(tileKey, gfx);
      fortLayer.addChild(gfx);
    });
  }
}

function removeFortSprite(tileKey, fortLayer) {
  const sp = _fortSpriteMap.get(tileKey);
  if (sp) {
    if (sp.parent) sp.parent.removeChild(sp);
    sp.destroy?.();
    _fortSpriteMap.delete(tileKey);
  }
}

function _buildOneHQ(tileKey, tile, selKey, onHQClick, PIXI, isPanningRef, texCache, playerName, playerFacKey, crewPids, groundTexture, tiles) {
  const [pc, pr] = tileKey.split(",").map(Number);
  const blendWithTerrain = usesNewWorldVisuals(pc,pr);
  // tileKey is the CENTER tile. Top-left of the 3×3 is one step back.
  const tlc = pc - 1, tlr = pr - 1;
  // Visual centre = middle tile of 3×3
  const { cx: bx, cy: worldCY } = isoXY(pc, pr);
  const elev = 0;

  // 3×3 outer diamond corners (for hit area + selection outline)
  // N=(tlc+1,tlr), E=(tlc+2,tlr+1), S=(tlc+1,tlr+2), W=(tlc,tlr+1)
  const nPt = isoXY(tlc + 1, tlr);
  const ePt = isoXY(tlc + 2, tlr + 1);
  const sPt = isoXY(tlc + 1, tlr + 2);
  const wPt = isoXY(tlc,     tlr + 1);

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
  const _fpN = _fp(0.75, 0.25);
  const _fpE = _fp(0.75, 0.65);
  const _fpS = _fp(0.25, 0.65);
  const _fpW = _fp(0.25, 0.25);

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

  // ── Border (draw before sprite so sprite renders on top) ──
  const borderGfx = new PIXI.Graphics();
  const borderTint = ownerTint(owner, tile?.faction, playerFacKey, crewPids, tile?.ownerPlayerId) ?? 0xdc3c28;
  
  const borderPath = [];
  borderPath.push(isoXY(tlc, tlr).cx, isoXY(tlc, tlr).cy - elev);
  borderPath.push(isoXY(tlc + 2, tlr).cx + TW/2, isoXY(tlc + 2, tlr).cy - elev + TH/2);
  borderPath.push(isoXY(tlc + 2, tlr + 2).cx, isoXY(tlc + 2, tlr + 2).cy - elev + TH);
  borderPath.push(isoXY(tlc, tlr + 2).cx - TW/2, isoXY(tlc, tlr + 2).cy - elev + TH/2);

  // Repaint only the occupied 3x3 footprint above the prop layer. Neighboring
  // props stay centered on their own tiles, while pixels that extend beneath
  // the base are naturally hidden by the HQ ground and building.
  if (blendWithTerrain) {
    const foundationGfx = new PIXI.Graphics();
    fillVisualGround(foundationGfx,borderPath,pc,pr,tile.terrain || 'grass',true,groundTexture);
    group.addChild(foundationGfx);
  }

  const borderSegments = hqJoinedBorderSegments(pc,pr,tiles);
  const drawBorderSegments = () => {
    for (const [x1,y1,x2,y2] of borderSegments) {
      borderGfx.moveTo(x1,y1);borderGfx.lineTo(x2,y2);
    }
  };
  borderGfx.lineStyle(blendWithTerrain ? 2.6 : 8, 0x151b10, blendWithTerrain ? 0.30 : 0.8);
  drawBorderSegments();
  borderGfx.lineStyle(blendWithTerrain ? 1.3 : 5, blendWithTerrain ? softenTerritoryColor(borderTint) : borderTint, blendWithTerrain ? 0.82 : 1.0);
  drawBorderSegments();
  borderGfx.lineStyle(0);
  group.__borderPts = borderPath; // used by drawSelection and HIT_POLY

  group.addChild(borderGfx);

  // ── Sprite ──
  const originalSpriteName = HQ_SPRITES[faction] || HQ_SPRITES[owner] || HQ_SPRITES.player;
  const useApprovedPirateArt = blendWithTerrain && originalSpriteName === "hq_pirates.webp";
  const spriteName = useApprovedPirateArt ? "hq_pirates_dark_v2.webp" : originalSpriteName;
  const spriteUrl  = `/hq/${spriteName}`;

  // Width covers the full 3x3 diamond left<->right extent.
  // Height = 0.75x width so towers stay visible without blocking back tiles.
  // anchor.y = 0.78 keeps the base grounded on the front tile row.
  // Source image is 2048x2048 (square) — preserve aspect ratio to avoid lean.
  // Scale so width fits the 3x3 footprint; height follows naturally.
  // Per-faction fine-tuning offsets (xOff/yOff in pixels, positive = right/down)
  // scale multiplier (default 1.0) for factions that need larger sprites
  const HQ_OFFSETS = {
    pirates:        { xOff:  0,    yOff:  0,    scale: 1.0  },
    player:         { xOff:  0,    yOff:  0,    scale: 1.0  },
    orcs:           { xOff:  0,    yOff:  0,    scale: 1.0  },
    ai:             { xOff:  0,    yOff:  0,    scale: 1.0  },
    wizards:        { xOff:  5,    yOff: -5,    scale: 1.0  },
    dragons:        { xOff:  5,    yOff:  10,   scale: 1.0  },
    holyknights:    { xOff: -5,    yOff:  10,   scale: 1.0  },
    nightcreatures: { xOff:  0,    yOff:  10,   scale: 1.0  },
    coldborns:      { xOff:  0,    yOff:  15,   scale: 1.0  },
    ashen_dead:     { xOff:  0,    yOff:  15,   scale: 1.0  },
  };
  const off = HQ_OFFSETS[faction] || { xOff: 0, yOff: 0, scale: 1.0 };

  const baseW = TW * 2.2;
  const targetW = baseW * (off.scale || 1.0);
  const targetH = targetW * 0.80;

  const spriteX = bx + off.xOff;
  // The approved square Pirate sprite uses its visible base as the ground
  // anchor. Align that base with the south point of the 3x3 footprint.
  const spriteY = useApprovedPirateArt
    ? worldCY + TH * 1.55 + off.yOff
    : sPt.cy - elev + TH * 0.60 + off.yOff;

  if (blendWithTerrain) {
    const shadow = new PIXI.Graphics();
    const groundY = worldCY - 4 + TH / 2;
    for (let i=3;i>=1;i--) {
      shadow.beginFill(0x252b1c,0.035);
      shadow.drawEllipse(bx,groundY+13,targetW*(0.43+i*0.02),TH*(0.54+i*0.05));
      shadow.endFill();
    }
    group.addChild(shadow);
  }

  const applySprite = (sp) => {
    sp.anchor.set(0.5, useApprovedPirateArt ? 0.97 : 0.905);
    sp.width  = targetW;
    // Preserve the approved sprite proportions; other factions keep their existing fit.
    sp.height = useApprovedPirateArt ? targetW * sp.texture.height / sp.texture.width : targetH;
    sp.x = spriteX;
    sp.y = spriteY;

    sp.rotation = 0;
    sp.skew.x   = 0;
    sp.skew.y   = 0;
  };

  if (texCache[spriteUrl]) {
    const sp = new PIXI.Sprite(texCache[spriteUrl]);
    applySprite(sp);
    group.addChild(sp);
  } else {
    // Load async — replace placeholder gfx once loaded
    const placeholderGfx = new PIXI.Graphics();
    const fc = ownerTint(owner, tile?.faction, playerFacKey, null, tile?.ownerPlayerId) ?? 0x888888;
    placeholderGfx.beginFill(fc, 0.3);
    placeholderGfx.drawPolygon(borderPath);
    placeholderGfx.endFill();
    group.addChild(placeholderGfx);

    PIXI.Texture.fromURL(spriteUrl).then(tex => {
      texCache[spriteUrl] = tex;
      if (group.destroyed) return;
      if (placeholderGfx.parent) placeholderGfx.parent.removeChild(placeholderGfx);
      if (!placeholderGfx.destroyed) placeholderGfx.destroy();
      if (!group.destroyed) {
        const sp = new PIXI.Sprite(tex);
        applySprite(sp);
        // Find name badge elements (pill and labelText) and insert sprite before them
        const pillIndex = group.children.findIndex(c => c instanceof PIXI.Graphics && c.x === bx && c.y === nPt.cy - 18);
        if (pillIndex > 0) {
          group.addChildAt(sp, pillIndex);
        } else {
          group.addChild(sp);
        }
      }
    }).catch(() => {
      // Sprite not found — placeholder stays, that's fine
    });
  }

  // ── Player name label above HQ ──
  if (owner === "player" && playerName) {
    // Background pill behind the name
    const labelText = new PIXI.Text(playerName, {
      fontFamily: "'Cinzel', serif",
      fontSize:   11,
      fontWeight: "700",
      fill:       0xf0c040,
      letterSpacing: 1.5,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur:  4,
      dropShadowDistance: 1,
    });
    // Position above the north tip of the HQ diamond
    labelText.anchor.set(0.5, 1);
    labelText.x = bx;
    labelText.y = nPt.cy - 18;

    // Dark pill background
    const pill = new PIXI.Graphics();
    const pw = labelText.width + 14;
    const ph = labelText.height + 6;
    pill.beginFill(0x080604, 0.78);
    pill.lineStyle(1, 0xc8a040, 0.9);
    pill.drawRoundedRect(-pw / 2, -ph, pw, ph, 4);
    pill.endFill();
    pill.x = bx;
    pill.y = nPt.cy - 18;

    group.addChild(pill);
    group.addChild(labelText);
  }

  // ── Hit area ──
  const hit = new PIXI.Graphics();
  hit.beginFill(0xffffff, 0.001);
  hit.drawPolygon(borderPath);
  hit.endFill();
  hit.hitArea     = new PIXI.Polygon(borderPath);
  hit.interactive = true;
  hit.buttonMode  = true;
  hit.cursor      = "pointer";
  hit.on("pointerdown", (e) => {
    if (isPanningRef?.current) {
      return;
    }
    e.stopPropagation();
    onHQClick(tileKey, e.data?.originalEvent || e);
  });
  group.addChild(hit);
  
  return group;
}

const _hqTexCache = {}; // shared texture cache across rebuilds

function buildHQLayer(hqCont, tiles, selKey, onHQClick, PIXI, isPanningRef, playerName, playerFacKey, crewPids, vb, allHqKeys, aiPlayerIdMap, groundTexture) {
  if (_hqKeyIndex.size === 0 || !vb) {
    if (!vb) _hqKeyIndex.clear();
    // Seed from patched tiles
    for (const [tileKey, tile] of Object.entries(tiles)) {
      if (tile?.isHQ) _hqKeyIndex.add(tileKey);
    }
    // Seed from known HQ keys (catches AI HQs never in viewport)
    if (allHqKeys) {
      for (const key of allHqKeys) _hqKeyIndex.add(key);
    }
  }

  let processedCount = 0;
  let blueCount = 0, purpleCount = 0;
  for (const tileKey of _hqKeyIndex) {
    const tile = tiles[tileKey];
    if (!tile?.isHQ) { _hqKeyIndex.delete(tileKey); continue; }
    processedCount++;

    if (vb) {
      const [tc, tr] = tileKey.split(",").map(Number);
      const isPlayerHQ = tile.owner === "player";
      if (!isPlayerHQ && (tc < vb.cMin || tc > vb.cMax || tr < vb.rMin || tr > vb.rMax)) {
        for (let i = hqCont.children.length - 1; i >= 0; i--) {
          const child = hqCont.children[i];
          if (child.__hqKey === tileKey) {
            hqCont.removeChild(child);
            child.destroy({ children: true });
            _hqStateCache.delete(tileKey);
            break;
          }
        }
        continue;
      }
    }

    const isSelected = selKey === tileKey;
    const owner      = tile.owner || null;
    const faction    = tile.faction || owner || null;
    const prev       = _hqStateCache.get(tileKey);
    const [hqC,hqR] = tileKey.split(",").map(Number);
    const blendWithTerrain = usesNewWorldVisuals(hqC,hqR);
    const borderSignature = hqJoinedBorderSegments(hqC,hqR,tiles).map(segment=>segment.join(",")).join("|");

    const curPlayerName = owner === "player" ? playerName : null;
    const ownerPlayerId = aiPlayerIdMap?.get(tileKey) || tile.ownerPlayerId || null;
    const isAiOwned = owner === "ai" || (owner !== "player" && owner !== null);
    const isCrew = !!(isAiOwned && ownerPlayerId && crewPids?.has(ownerPlayerId));
    if (prev && prev.faction === faction && prev.owner === owner && prev.isSelected === isSelected && prev.playerName === curPlayerName && prev.isCrew === isCrew && prev.blendWithTerrain === blendWithTerrain && prev.borderSignature === borderSignature) continue;

    for (let i = hqCont.children.length - 1; i >= 0; i--) {
      const child = hqCont.children[i];
      if (child.__hqKey === tileKey) {
        hqCont.removeChild(child);
        child.destroy({ children: true });
        break;
      }
    }

    const tileWithPid = ownerPlayerId && !tile.ownerPlayerId ? { ...tile, ownerPlayerId } : tile;
    hqCont.addChild(_buildOneHQ(tileKey, tileWithPid, selKey, onHQClick, PIXI, isPanningRef, _hqTexCache, playerName, playerFacKey, crewPids, groundTexture, tiles));
    _hqStateCache.set(tileKey, { faction, owner, isSelected, playerName: owner === "player" ? playerName : null, isCrew, blendWithTerrain, borderSignature });

    // Count tint changes for summary log
    if (isAiOwned && tile.faction === playerFacKey) {
      if (isCrew) blueCount++; else purpleCount++;
    }
  }
}

function drawMarchLines(gfx, cmds, reinMarches, tiles) {
  gfx.clear();
  const drawPath = (path, col) => {
    if (path.length < 2) return;
    const pts = path.map(k => {
      const [tc, tr] = k.split(",").map(Number);
      const t = tiles[k];
      const elev = t?.isWin ? 10 : 4;
      const { cx, cy } = isoXY(tc, tr);
      return { x: cx, y: cy - elev + TH / 2 };
    });
    const segments=[];
    let total=0;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],len=Math.hypot(b.x-a.x,b.y-a.y);
      segments.push({a,b,len,start:total});total+=len;
    }
    const pointAt=(distance)=>{
      const seg=segments.find(s=>distance<=s.start+s.len) || segments[segments.length-1];
      const t=Math.max(0,Math.min(1,(distance-seg.start)/seg.len));
      return {x:seg.a.x+(seg.b.x-seg.a.x)*t,y:seg.a.y+(seg.b.y-seg.a.y)*t,
        angle:Math.atan2(seg.b.y-seg.a.y,seg.b.x-seg.a.x)};
    };
    // Dotted route with a dark backing so it remains legible on every terrain.
    for(let d=0;d<=total;d+=10){
      const p=pointAt(d);
      gfx.beginFill(0x080b08,0.55);gfx.drawCircle(p.x,p.y,3.1);gfx.endFill();
      gfx.beginFill(col,0.95);gfx.drawCircle(p.x,p.y,1.75);gfx.endFill();
    }
    // Direction arrows repeat along long routes and always point to the target.
    for(let d=48;d<total-18;d+=64){
      const p=pointAt(d),cs=Math.cos(p.angle),sn=Math.sin(p.angle);
      const triangle=(size,color,alpha)=>{
        const tip=[p.x+cs*size,p.y+sn*size];
        const baseX=p.x-cs*size*.62,baseY=p.y-sn*size*.62;
        const width=size*.68;
        gfx.beginFill(color,alpha);
        gfx.drawPolygon([tip[0],tip[1],baseX-sn*width,baseY+cs*width,baseX+sn*width,baseY-cs*width]);
        gfx.endFill();
      };
      triangle(7.5,0x080b08,0.65);triangle(5.6,col,1);
    }
    const last = pts[pts.length-1];
    gfx.beginFill(col,0.18); gfx.drawCircle(last.x,last.y,8); gfx.endFill();
    gfx.beginFill(col,0.85); gfx.drawCircle(last.x,last.y,5); gfx.endFill();
    gfx.beginFill(0xffffff,0.9); gfx.drawCircle(last.x,last.y,2.5); gfx.endFill();
  };
  cmds.forEach(cmd => {
    if (!cmd.march || cmd.owner !== "player") return;
    const m = cmd.march;
    drawPath(m.path, 0x22cc55); // show the full assigned route and target
  });
  (reinMarches || []).forEach(rm => drawPath(rm.path.slice(rm.step), 0x2299ff)); // blue for reinforcements
}

export const MapRenderer = memo(forwardRef(function MapRenderer({ tiles, cmds, selKey, mode, mvCmd, reinMarchesRef, panRef: panRefProp, zoomRef: zoomRefProp, ZOOM_LEVELS, onTileClick, onPanChange, onZoomChange, playerName, playerHqKey, playerFacKey, crewmatePlayerIds, allHqKeys, aiPlayerIdMap, forts, guardedTiles, guardedTileKeys, spawns, protectedTileKeys }, ref) {

  const containerRef   = useRef(null);
  const appRef         = useRef(null);
  const worldRef       = useRef(null);

  const tileFrontRef   = useRef(null);
  const tileBackRef    = useRef(null);
  const propsFrontRef  = useRef(null);
  const propsBackRef   = useRef(null);
  const marchGfxRef    = useRef(null);
  const guardGfxRef    = useRef(null);
  const protectGfxRef  = useRef(null);
  const spawnGfxRef    = useRef(null);
  const _spawnSpriteMap = useRef(new Map());
  const cmdGfxRef      = useRef(null);
  const cmdTextContRef = useRef(null);
  const hqContRef      = useRef(null);
  const fortContRef    = useRef(null);

  const lastBoundsRef  = useRef(null);
  const redrawRef      = useRef(null);
  const cByTileRef     = useRef({});
  // uid → { fromX, fromY, toX, toY, startTime, stepMs } for smooth lerp animation
  const cmdLerpRef     = useRef(new Map());
  // Worker-computed frame positions: uid → { px, py }
  const marchPosRef    = useRef(new Map());
  // Persistent PIXI display objects for commander icons: uid → { circle, shadow, sprite/text, mask }
  const cmdSpriteRef   = useRef(new Map());
  // march.worker.js instance
  const marchWorkerRef = useRef(null);

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

  // Keep playerFacKey in a ref so drawAllTiles can read it without a re-render
  const playerFacKeyRef = useRef(playerFacKey);
  useEffect(() => { playerFacKeyRef.current = playerFacKey; }, [playerFacKey]);
  const playerHqKeyRef = useRef(playerHqKey);
  useEffect(() => {
    playerHqKeyRef.current = playerHqKey;
    lastBoundsRef.current = null;
    redrawRef.current?.markPropsDirty?.();
    redrawRef.current?.redraw?.(true);
  }, [playerHqKey]);
  const allHqKeysRef = useRef(allHqKeys || []);
  useEffect(() => { allHqKeysRef.current = allHqKeys || []; }, [allHqKeys]);
  const aiPlayerIdMapRef_ = useRef(aiPlayerIdMap || new Map());
  useEffect(() => { aiPlayerIdMapRef_.current = aiPlayerIdMap || new Map(); }, [aiPlayerIdMap]);

  // ── Fort layer sync ─────────────────────────────────────────────────────────
  const fortsRef_ = useRef(forts || []);
  useEffect(() => {
    fortsRef_.current = forts || [];
    const fortLayer = fortContRef.current;
    if (!fortLayer) return;
    const currentKeys = new Set((forts || []).map(f => f.tileKey));
    // Remove sprites for destroyed forts
    for (const [key] of _fortSpriteMap) {
      if (!currentKeys.has(key)) removeFortSprite(key, fortLayer);
    }
    // Add/update sprites for forts
    for (const fort of (forts || [])) {
      const existing = _fortSpriteMap.get(fort.tileKey);
      // If level changed, remove and re-add
      if (existing && existing.__fortLevel !== fort.level) {
        removeFortSprite(fort.tileKey, fortLayer);
      }
      if (!_fortSpriteMap.has(fort.tileKey)) {
        buildFortSprite(fort, PIXI, _hqTexCache, fortLayer);
      }
    }
  }, [forts]);

  // Keep crewmatePlayerIds in a ref for tile coloring
  const crewPidsRef = useRef(crewmatePlayerIds ?? new Set());
  useEffect(() => {
    crewPidsRef.current = crewmatePlayerIds ?? new Set();
    clearHQCache();
    redrawRef.current?.redraw?.();
    redrawRef.current?.redrawAllHQs?.();
  }, [crewmatePlayerIds]);

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
      redrawRef.current?.redrawHQs();
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
    const h = Math.max(200, el.clientHeight || window.innerHeight);
    let app;
    try {
      app = new PIXI.Application({ width:w, height:h, backgroundColor:0x080c10,
        antialias:false, resolution:Math.min(window.devicePixelRatio||1,2), autoDensity:true,
        // Prevent screen tearing on PC Chrome — forces the WebGL context to sync
        // with the display's vsync cycle. Without this, some GPU/driver combos
        // present frames mid-refresh causing horizontal tearing bands.
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch(_) {
      try { app = new PIXI.Application({ width:w, height:h, backgroundColor:0x080c10, forceCanvas:true }); }
      catch(e2) { console.warn("PixiJS init failed:", e2); return; }
    }
    app.view.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
    el.appendChild(app.view);
    appRef.current = app;
    clearHQCache();
    clearFortCache();

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

    const rssTextures       = {};   // rss string → { pl → PIXI.RenderTexture }, built lazily on first use
    const propsSpritePool   = [];   // recycled PIXI.Sprite instances
    const propsSpriteContainer = new PIXI.Container();
    const visualPropsContainer = new PIXI.Container();
    const visualPropsPool = [];
    visualPropsContainer.sortableChildren = true;
    const onVisualAssetsLoaded = () => {
      if (appRef.current !== app) return;
      lastBoundsRef.current = null;
      redrawRef.current?.markPropsDirty?.();
      redrawRef.current?.redraw?.(true);
    };
    const resourceSpriteCache = createResourceSpriteCache(app.renderer,onVisualAssetsLoaded);
    const groundTexture = PIXI.Texture.from('/props/dark-map/grass-ground.webp');
    groundTexture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    if (!groundTexture.baseTexture.valid) groundTexture.baseTexture.once('loaded',onVisualAssetsLoaded);

    // ── iOS lazy texture baking ───────────────────────────────────────────────
    // Instead of baking all 52 textures synchronously at startup (blocking the
    // main thread for ~20 s on a 3x iPhone), each (rss, pl) pair is baked on
    // first use.  The canvas appears immediately; GPU work spreads across the
    // first few seconds of gameplay as each resource type scrolls into view.
    let _iosTmpGfx = null; // created on first bake, destroyed with the scene
    function getOrBakeTex(rss, pl) {
      if (!rssTextures[rss]) rssTextures[rss] = {};
      if (rssTextures[rss][pl]) return rssTextures[rss][pl];
      // First access — bake now (one GPU flush instead of 52 upfront).
      if (!_iosTmpGfx) _iosTmpGfx = new PIXI.Graphics();
      const bakePl = pl >= 10 ? 13 + (pl - 9) * 3 : pl; // P10→16, P11→19, P12→22, P13→25
      const rt = PIXI.RenderTexture.create({
        width: TEX_W, height: TEX_H,
        resolution: app.renderer.resolution,
      });
      _iosTmpGfx.clear();
      drawRssProp(_iosTmpGfx, rss, TEX_CX, TEX_SY, 5, 3, bakePl);
      app.renderer.render(_iosTmpGfx, { renderTexture: rt });
      rssTextures[rss][pl] = rt;
      return rt;
    }

    if (isIOS) {
      propsGfx.visible = false; // Graphics layer unused on iOS
      world.addChild(propsSpriteContainer); // sits between tiles and keeps
      // No upfront baking — getOrBakeTex() handles everything lazily on first use.
    }
    world.addChild(visualPropsContainer);

    // HQ container
    const hqCont = new PIXI.Container();
    hqCont.interactiveChildren = true;
    hqCont.interactive = true;

    world.addChild(hqCont);
    hqContRef.current = hqCont;

    // Fort container — sits above tiles, below HQ
    const fortCont = new PIXI.Container();
    world.addChildAt(fortCont, world.children.indexOf(hqCont));
    fortContRef.current = fortCont;
    // Selection belongs to the ground: trees, rocks, forts and bases occlude it.
    const selGfx = new PIXI.Graphics();
    world.addChildAt(selGfx, world.children.indexOf(propsGfx));
    const guardGfx = new PIXI.Graphics(); world.addChild(guardGfx); guardGfxRef.current = guardGfx;
    const protectGfx = new PIXI.Container(); world.addChild(protectGfx); protectGfxRef.current = protectGfx;
    const spawnGfx = new PIXI.Graphics(); world.addChild(spawnGfx); spawnGfxRef.current = spawnGfx;
    const marchGfx = new PIXI.Graphics(); world.addChild(marchGfx); marchGfxRef.current = marchGfx;
    const cmdGfx = new PIXI.Graphics(); world.addChild(cmdGfx); cmdGfxRef.current = cmdGfx;
    const cmdTextCont = new PIXI.Container(); world.addChild(cmdTextCont); cmdTextContRef.current = cmdTextCont;

    function drawSelection(key) {
      selGfx.clear();
      if (!key) return;
      const [sc, sr] = key.split(",").map(Number);
      const tile = tilesRef.current[key];
      if (!tile) return;

      // P10–P13: draw white outline around the 2x visual diamond
      const pl = tile.powerLevel ?? 0;
      if (pl >= 10 && tile.isKeep) {
        const MERGED = resourceFootprint(sc,sr,tile).points;
        selGfx.lineStyle(1.6, 0xf0eedb, 0.92);
        selGfx.drawPolygon(MERGED);
        selGfx.lineStyle(0);
        return;
      }

      // Static keeps (5×5): draw outline around full footprint
      if ((tile.isKeep && !tile.isGate) && pl < 10) {
        const { cx, cy } = isoXY(sc, sr);
        const elev = 4;
        const KEEP5 = [
          cx,          cy - elev - TH * 2,       // N
          cx + TW*2.5, cy - elev + TH * 0.5,    // E
          cx,          cy - elev + TH * 3,       // S
          cx - TW*2.5, cy - elev + TH * 0.5,    // W
        ];
        selGfx.lineStyle(1.6, 0xf0eedb, 0.92);
        selGfx.drawPolygon(KEEP5);
        selGfx.lineStyle(0);
        return;
      }

      // HQ: use borderPts for correct size, draw bottom arc + 20% of side edges
      if (tile.isHQ) {
        const hqGroup = hqContRef.current?.children?.find(g => g.__hqKey === key);
        const pts = hqGroup?.__borderPts;
        if (pts && pts.length >= 8) {
          // pts = [Nx,Ny, Ex,Ey, Sx,Sy, Wx,Wy]
          const [Nx,Ny, Ex,Ey, Sx,Sy, Wx,Wy] = pts;
          const t = 0.3; // 30% of each top edge
          // NW edge start (W side, 20% toward N)
          const nwX = Wx + (Nx - Wx) * t, nwY = Wy + (Ny - Wy) * t;
          // NE edge start (E side, 20% toward N)
          const neX = Ex + (Nx - Ex) * t, neY = Ey + (Ny - Ey) * t;
          selGfx.lineStyle(1.5, 0xf0eedb, 0.92);
          selGfx.moveTo(nwX, nwY);
          selGfx.lineTo(Wx, Wy);
          selGfx.lineTo(Sx, Sy);
          selGfx.lineTo(Ex, Ey);
          selGfx.lineTo(neX, neY);
          selGfx.lineStyle(0);
        }
        return;
      }

      // Skip keep parts and HQ parts (no individual selection)
      if (tile.isKeepPart || tile.isHQPart) return;

      // Regular tiles, win tiles
      const elev = tile.isWin ? 10 : 4;
      const { cx, cy } = isoXY(sc, sr);
      const sy2 = cy - elev;
      const mid = sy2 + TH / 2;
      const hasFortOnTile = _fortsSetRef.current.has(key);
      if (hasFortOnTile) {
        // Fort tile: draw only bottom ~70% of diamond (W→S→E), sprite covers the top
        selGfx.lineStyle(1.5, 0xf0eedb, 0.92);
        selGfx.moveTo(cx - TW/2, mid);   // W
        selGfx.lineTo(cx, sy2 + TH);     // S
        selGfx.lineTo(cx + TW/2, mid);   // E
        selGfx.lineStyle(0);
      } else {
        const hw = TW / 2;
        const hh = TH / 2;
        const TOP = [[cx,mid-hh],[cx+hw,mid],[cx,mid+hh],[cx-hw,mid]];
        const visibleEdges = selectionEdgesBesideHq(sc,sr,tilesRef.current);
        selGfx.lineStyle(1.5, 0xf0eedb, 0.92);
        if (visibleEdges.every(Boolean)) {
          selGfx.drawPolygon(TOP.flat());
        } else {
          for (let i=0;i<4;i++) if (visibleEdges[i]) {
            const a=TOP[i], b=TOP[(i+1)%4];
            selGfx.moveTo(a[0],a[1]);
            selGfx.lineTo(b[0],b[1]);
          }
        }
        selGfx.lineStyle(0);
      }
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
      if (!forceSync && isPanning.current) {
        // ── FIX 2: Reschedule instead of bailing permanently ──────────────
        // Previously this early return cleared propsIdleHandle without
        // rescheduling, so props never drew if panning was active when the
        // first idle fired (e.g. right after the teleport() on map load).
        // propsDirty stays true, and we re-queue for the next idle slot.
        schedulePropsRedraw();
        return;
      }
      const pb = getViewBounds(PROPS_BUF);
      while (visualPropsContainer.children.length > 0) {
        visualPropsPool.push(visualPropsContainer.removeChildAt(0));
      }

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
              if (usesNewWorldVisuals(c,r)) continue;
              // Skip P1 (no individual props) and static keeps/keepparts
              const pl = tile.powerLevel || 1;
              if (pl === 1) continue;
              const isStaticKeep = (tile.isKeep && !tile.isGate) && pl < 10;
              const isStaticPart = tile.isKeepPart && pl < 10;
              if (isStaticKeep || isStaticPart) continue;
              const texPl = pl; // textures stored under raw pl, baked with syntheticPl for P10-P13
              // Use lazy baking on iOS; fall back to direct lookup on other platforms.
              const tex = isIOS
                ? getOrBakeTex(tile.rss, texPl)
                : (rssTextures[tile.rss]?.[texPl] ?? rssTextures[tile.rss]?.[pl] ?? rssTextures[tile.rss]?.[2]);
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

      // Approved dark-fantasy resource sprites throughout the visible world.
      if (zoomRef.current >= 0.5) {
        const tiles=tilesRef.current;
        const dMin=pb.cMin+pb.rMin,dMax=pb.cMax+pb.rMax;
        for(let d=dMin;d<=dMax;d++){
          const cLo=Math.max(pb.cMin,d-pb.rMax),cHi=Math.min(pb.cMax,d-pb.rMin);
          for(let c=cLo;c<=cHi;c++){
            const r=d-c;
            if(r<pb.rMin||r>pb.rMax||!usesNewWorldVisuals(c,r))continue;
            const tile=tiles[`${c},${r}`];
            if(!tile?.rss||tile.isHQ||tile.isHQPart||tile.isKeepPart||tile.isGate||tile.isWin||tile.isShore)continue;
            const pl=tile.powerLevel||1;
            if (pl === 1 || (tile.isKeep && pl < 10)) continue;
            const baked=resourceSpriteCache.get(tile.rss,pl);
            if(!baked)continue;
            const footprint=resourceFootprint(c,r,tile);
            const sprite=visualPropsPool.pop()??new PIXI.Sprite();
            sprite.texture=baked.texture;
            sprite.scale.set(1);
            sprite.anchor.set(baked.anchorX,baked.anchorY);
            sprite.position.set(footprint.x,footprint.y);
            sprite.zIndex=footprint.y;
            visualPropsContainer.addChild(sprite);
          }
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
        // ── FIX 2: Raise the timeout to 2000ms (was 500ms) so the idle callback
        // always fires on a busy post-load main thread. 500ms was too tight —
        // React reconciling 490k tiles + AI commander setup kept the thread busy
        // past the deadline, causing requestIdleCallback to skip silently.
        if (typeof window.requestIdleCallback === "function") {
          propsIdleHandle = window.requestIdleCallback(doProps, { timeout: 2000 });
        } else {
          propsIdleHandle = setTimeout(doProps, 100);
        }
        return;
      }
      if (typeof window.requestIdleCallback === "function") {
        propsIdleHandle = window.requestIdleCallback(doProps, { timeout: 1000 });
      } else {
        // Fallback: use a short delay so it doesn't block an active gesture
        propsIdleHandle = setTimeout(doProps, 150);
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
        selRef.current, modeRef.current, cByTile, mvCmdRef.current?.uid, z, playerFacKeyRef.current, crewPidsRef.current, groundTexture);

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

      // Rebuild HQ and keep layers so they appear as soon as the viewport moves,
      // without waiting for a tile click to trigger them.
      redrawHQs();
    }

    function renderCommanderIcons() {
      drawCommanderIcons({
        PIXI, gfx: cmdGfxRef.current, textCont: cmdTextContRef.current,
        cmds: cmdsRef.current, tiles: tilesRef.current, byTile: cByTileRef.current,
        spriteMap: cmdSpriteRef.current, posMap: marchPosRef.current,
        crewPids: crewPidsRef.current, facKey: playerFacKeyRef.current,
        aiPlayerIdMap: aiPlayerIdMapRef_.current, isoXY, TH,
      });
    }

    function redrawOverlays() {
      drawMarchLines(marchGfxRef.current, cmdsRef.current, reinRef.current, tilesRef.current);
      renderCommanderIcons();
    }

    function redrawHQs() {
      if (!hqContRef.current) return;
      const vb = getViewBounds(6);
      buildHQLayer(hqContRef.current, tilesRef.current, selRef.current, (key, e) => {
        selRef.current = key;
        selGfx.clear();
        drawSelection(key);
        lastBoundsRef.current = null;
        onTileClickRef.current(key, e);
      }, PIXI, isPanning, playerName, playerFacKeyRef.current, crewPidsRef.current, vb, allHqKeysRef.current, aiPlayerIdMapRef_.current, groundTexture);
    }

    function redrawAllHQs() {
      if (!hqContRef.current) return;
      buildHQLayer(hqContRef.current, tilesRef.current, selRef.current, (key, e) => {
        selRef.current = key;
        selGfx.clear();
        drawSelection(key);
        lastBoundsRef.current = null;
        onTileClickRef.current(key, e);
      }, PIXI, isPanning, playerName, playerFacKeyRef.current, crewPidsRef.current, null, allHqKeysRef.current, aiPlayerIdMapRef_.current, groundTexture);
    }

    redrawRef.current = {
      redraw,
      redrawOverlays,
      renderCommanderIcons,
      redrawHQs,
      redrawAllHQs,
      markPropsDirty,
      clearSel: () => { selGfx.clear(); redrawHQs(); },
      redrawSelection: (key) => { selGfx.clear(); if (key) drawSelection(key); redrawHQs(); },
      checkAndStartHellfire,
    };

    redraw(true);
    redrawOverlays();
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

    // ── March animation worker ────────────────────────────────────────────────
    // march.worker.js computes interpolated positions off the main thread.
    // Main thread ticker only moves existing PIXI objects — no recreate per frame.
    const marchWorker = new Worker(
      new URL('./workers/march.worker.js', import.meta.url)
    );
    marchWorkerRef.current = marchWorker;

    marchWorker.onmessage = ({ data }) => {
      if (data.type !== 'frame') return;
      // Update marchPosRef with latest interpolated positions
      for (const { uid, px, py } of data.positions) {
        marchPosRef.current.set(uid, { px, py });
      }
    };
    marchWorker.postMessage({ type: 'start' });

    // ── March animation ticker ────────────────────────────────────────────────
    // Moves persistent commander PIXI objects to worker-computed positions.
    // Sprites are created/destroyed only when commander list changes — not per frame.
    const marchAnimFn = () => {
      if (cmdsRef.current?.some(cmd => cmd.march)) renderCommanderIcons();
    };
    app.ticker.add(marchAnimFn);

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
            // No keepPart redirect needed for P10+ (now single tile)
            const rawTile = tilesRef.current[key];
            const selKey2 = key;
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
    const touchTarget = app.view; // app.view sits on top of el — touches land here

    // Catch any exception thrown inside the touch handlers (which would
    // otherwise silently strand isPanning.current at true forever, since
    // nothing resets it after the throw) and log it.
    const safeTS = e => { try { onTS(e); } catch (err) { console.error("[MapRenderer] touchstart handler threw:", err); } };
    const safeTM = e => { try { onTM(e); } catch (err) { console.error("[MapRenderer] touchmove handler threw:", err); isPanning.current = false; } };
    const safeTE = e => { try { onTE(e); } catch (err) { console.error("[MapRenderer] touchend handler threw:", err); isPanning.current = false; tDidDrag.current = false; } };

    touchTarget.addEventListener("touchstart",  safeTS, { passive: false });
    touchTarget.addEventListener("touchmove",   safeTM, { passive: false });
    touchTarget.addEventListener("touchend",    safeTE, { passive: true });
    touchTarget.addEventListener("touchcancel", safeTE, { passive: true });

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
        if (key) {
          const tile = tilesRef.current[key];
          // Skip if clicking HQ/keep - PIXI handlers will deal with it
          if (tile?.isHQ || tile?.isKeep) return;
          onTileClickRef.current(key, e);
        }
      }
      onPanChangeRef.current(panRef.current);
    };
    el.addEventListener("mousedown",  onMD);
    el.addEventListener("mousemove",  onMM);
    el.addEventListener("mouseup",    onMU);
    el.addEventListener("mouseleave", onMU);

    return () => {
      if (hellfireFn) app.ticker.remove(hellfireFn);
      if (marchAnimFn) app.ticker.remove(marchAnimFn);
      marchWorkerRef.current?.postMessage({ type: 'stop' });
      marchWorkerRef.current?.terminate();
      marchWorkerRef.current = null;
      redrawRef.current = null;
      if (panEndTimer.current) clearTimeout(panEndTimer.current);
      if (panNotifyTimer.current) clearTimeout(panNotifyTimer.current);
      panEndTimer.current = null;
      panNotifyTimer.current = null;
      clearCommanderIcons(cmdSpriteRef.current);
      marchPosRef.current.clear();
      clearHQCache();
      clearFortCache();
      cancelIdle();
      cancelPropsIdle();
      _iosTmpGfx?.destroy(); _iosTmpGfx = null;
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
      touchTarget.removeEventListener("touchstart",  safeTS);
      touchTarget.removeEventListener("touchmove",   safeTM);
      touchTarget.removeEventListener("touchend",    safeTE);
      touchTarget.removeEventListener("touchcancel", safeTE);
      groundTexture.baseTexture.off('loaded',onVisualAssetsLoaded);
      visualPropsPool.forEach(sprite => sprite.destroy());
      app.destroy(true, { children: true });
      resourceSpriteCache.destroy();
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

  // Spawn portraits — render troop portrait on spawn tiles
  useEffect(() => {
    const world = worldRef.current;
    const gfx   = spawnGfxRef.current;
    if (!world || !gfx) return;

    // Remove old spawn sprites
    for (const sp of _spawnSpriteMap.current.values()) {
      if (!sp.destroyed) sp.destroy();
    }
    _spawnSpriteMap.current.clear();
    gfx.clear();

    if (!spawns || !Object.keys(spawns).length) return;

    for (const [key, spawn] of Object.entries(spawns)) {
      const [sc, sr] = key.split(",").map(Number);
      const { cx, cy } = isoXY(sc, sr);
      const tileY = cy - 4 + TH * 0.5; // tile surface centre

      // Glow diamond centred on tile face
      if (!spawn.defeated) {
        const color = spawn.level <= 12 ? 0x70aa60
                    : spawn.level <= 25 ? 0xd07030
                    : 0xcc4040;
        const hw = TW / 2, hh = TH / 2;
        const pts = [cx, tileY - hh, cx + hw, tileY, cx, tileY + hh, cx - hw, tileY];
        gfx.lineStyle(2, color, 0.7);
        gfx.beginFill(color, 0.08);
        gfx.drawPolygon(pts);
        gfx.endFill();
      }

      if (!spawn.defeated) {
        const ref = spawn.slot1TroopRef;
        const tierIdx = spawn.level <= 12 ? 0 : spawn.level <= 25 ? 1 : 2;
        const spriteUrl = ref?.faction && ref?.branch
          ? `/spawns/${ref.faction}_${ref.branch}_t${(ref.tier ?? tierIdx) + 1}.webp`
          : null;
        const portraitUrl = ref?.faction && ref?.branch
          ? `/troops/${ref.faction}_${ref.branch}_t${(ref.tier ?? tierIdx) + 1}_portrait.webp`
          : null;
        const figW = TW * 0.30;
        const figH = figW * 1.6;
        const clusterOffsets = tierIdx >= 1
          ? [[-figW * 0.55, 0], [figW * 0.55, 0], [0, -figH * 0.35]]
          : [[-figW * 0.45, 0], [figW * 0.45, 0]];
        const placeSprites = (tex) => {
          if (!tex || world.destroyed) return;
          clusterOffsets.forEach(([ox, oy], i) => {
            const sp = new PIXI.Sprite(tex);
            const scale = 1 - i * 0.08;
            sp.width  = figW * scale;
            sp.height = figH * scale;
            sp.anchor.set(0.5, 1);
            sp.x = cx + ox;
            sp.y = tileY + oy;
            world.addChild(sp);
            _spawnSpriteMap.current.set(`${key}_${i}`, sp);
          });
        };
        if (spriteUrl) {
          PIXI.Texture.fromURL(spriteUrl)
            .then(tex => placeSprites(tex))
            .catch(() => { if (portraitUrl) PIXI.Texture.fromURL(portraitUrl).then(tex => placeSprites(tex)).catch(() => {}); });
        } else if (portraitUrl) {
          PIXI.Texture.fromURL(portraitUrl).then(tex => placeSprites(tex)).catch(() => {});
        }
      }
    }
  }, [spawns]);

  // Protection — centered shield and soft glow on recently captured tiles.
  useEffect(() => {
    const cont = protectGfxRef.current;
    if (!cont) return;
    // Clear previous icons
    [...cont.children].forEach(c => { cont.removeChild(c); c.destroy(); });
    if (!protectedTileKeys) return;
    const keys = protectedTileKeys.split("|").filter(k => k.length > 0);
    for (const key of keys) {
      const comma = key.indexOf(",");
      const c = +key.slice(0, comma), r = +key.slice(comma + 1);
      const tile = tilesRef.current[key];
      const { cx, cy } = isoXY(c, r);
      const elev = tile?.isWin ? 10 : 4;
      const sy = cy - elev;
      const mid = sy + TH/2;
      const diamond=[cx,sy,cx+TW/2,mid,cx,sy+TH,cx-TW/2,mid];
      const glow=new PIXI.Graphics();
      glow.beginFill(0x73c9ff,0.10);glow.drawPolygon(diamond);glow.endFill();
      glow.lineStyle(7,0x73c9ff,0.07);glow.drawPolygon(diamond);
      glow.lineStyle(3,0x73c9ff,0.16);glow.drawPolygon(diamond);
      glow.lineStyle(1.3,0xb8e8ff,0.78);glow.drawPolygon(diamond);glow.lineStyle(0);
      cont.addChild(glow);
      const badge=new PIXI.Graphics();
      badge.beginFill(0x10243a,0.72);badge.drawCircle(cx,mid,11);badge.endFill();
      badge.lineStyle(1.2,0x9bdcff,0.82);badge.drawCircle(cx,mid,11);badge.lineStyle(0);
      cont.addChild(badge);
      const txt = new PIXI.Text("🛡", { fontSize: 14, align: "center" });
      txt.anchor.set(0.5, 0.5);
      txt.x = cx;
      txt.y = mid;
      cont.addChild(txt);
    }
  }, [protectedTileKeys]);

  // Guard glow — glowing outline on guarded tile + owned/crewmate tiles in 3x3 around it
  const _guardSpriteMap = useRef(new Map()); // kept for cleanup compat, unused
  const _fortsSetRef = useRef(new Set());
  useEffect(() => {
    _fortsSetRef.current = new Set((forts || []).map(f => f.tileKey));
  }, [forts]);

  useEffect(() => {
    const world = worldRef.current;
    const gfx   = guardGfxRef.current;
    if (!world || !gfx) return;

    // Clean up any old sprites
    for (const sp of _guardSpriteMap.current.values()) {
      if (!sp.destroyed) sp.destroy();
    }
    _guardSpriteMap.current.clear();
    gfx.clear();

    const keys = guardedTileKeys ? guardedTileKeys.split("|").filter(k => k.length > 0) : [];
    if (!keys.length) return;

    const tiles = tilesRef.current;
    const GLOW_COLOR  = 0x44ff88; // bright green
    const FILL_ALPHA  = 0.10;
    const LINE_ALPHA  = 0.85;
    const LINE_WIDTH  = 2.5;
    const GLOW_WIDTH  = 6;       // outer soft glow stroke
    const GLOW_ALPHA  = 0.18;

    const drawTileGlow = (c, r) => {
      const { cx, cy } = isoXY(c, r);
      const hw = TW / 2, hh = TH / 2;
      const pts = [cx, cy - hh, cx + hw, cy, cx, cy + hh, cx - hw, cy];

      // Outer soft glow
      gfx.lineStyle(GLOW_WIDTH, GLOW_COLOR, GLOW_ALPHA);
      gfx.beginFill(0x000000, 0);
      gfx.drawPolygon(pts);
      gfx.endFill();

      // Inner fill
      gfx.lineStyle(0);
      gfx.beginFill(GLOW_COLOR, FILL_ALPHA);
      gfx.drawPolygon(pts);
      gfx.endFill();

      // Crisp outline
      gfx.lineStyle(LINE_WIDTH, GLOW_COLOR, LINE_ALPHA);
      gfx.beginFill(0x000000, 0);
      gfx.drawPolygon(pts);
      gfx.endFill();
    };

    keys.forEach(key => {
      const [gc, gr] = key.split(",").map(Number);

      // Collect tiles to glow: center + 3x3 neighbours that are owned or crewmate
      const toGlow = new Set();
      toGlow.add(key); // always glow the guarded tile itself

      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          const nc = gc + dc, nr = gr + dr;
          const nk = `${nc},${nr}`;
          const t = tiles?.[nk];
          if (!t) continue;
          const isOwned    = t.owner === "player";
          const isCrewmate = t.ownerPlayerId && crewmatePlayerIds?.has?.(t.ownerPlayerId);
          if (isOwned || isCrewmate) toGlow.add(nk);
        }
      }

      for (const tk of toGlow) {
        const [tc, tr] = tk.split(",").map(Number);
        drawTileGlow(tc, tr);
      }
    });
  }, [guardedTileKeys, tilesRef, crewmatePlayerIds]);

  useEffect(() => {
    tilesRef.current = tiles;
    lastBoundsRef.current = null;
    redrawRef.current?.markPropsDirty();
    // Sync world position from panRef whenever tiles change — critical on first
    // load since the 100ms teleport setTimeout fired before tiles were ready.
    if (worldRef.current) {
      worldRef.current.x = panRef.current.x;
      worldRef.current.y = panRef.current.y;
      worldRef.current.scale.set(zoomRef.current);
    }
    redrawRef.current?.redraw(true);
    redrawRef.current?.redrawHQs();
  }, [tiles]);

  useEffect(() => {
    const prevCmds = cmdsRef.current;
    const tiles_   = tilesRef.current;
    const worker   = marchWorkerRef.current;

    // Give the animation worker the whole route. It moves at constant speed
    // across tile centres instead of restarting an ease at every tile.
    cmds.forEach(cmd => {
      const m = cmd.march;
      if (!m?.path?.length || !(m.stepMs > 0)) return;
      const points = m.path.map(key => {
        const tile = tiles_[key];
        if (!tile) return null;
        const {cx,cy}=isoXY(tile.c,tile.r);
        return {x:cx,y:cy-(tile.isWin?10:4)};
      }).filter(Boolean);
      if (points.length !== m.path.length) return;
      const segmentDurations=m.path.slice(1).map((key,i)=>marchSegmentMs(m.path[i],key,m.stepMs));
      const elapsedBeforeStep=segmentDurations.slice(0,m.step).reduce((sum,ms)=>sum+ms,0);
      const startTime = m.startedAt ?? (m.lastStepTime - elapsedBeforeStep);
      const routeId = `${m.path.join(';')}|${startTime}|${m.stepMs}`;
      worker?.postMessage({type:'route',uid:cmd.uid,routeId,points,startTime,segmentDurations});
    });

    // Remove stopped marchers from worker
    const marchingUids = new Set(cmds.filter(c => c.march).map(c => c.uid));
    prevCmds.forEach(prev => {
      if (prev.march && !marchingUids.has(prev.uid)) {
        worker?.postMessage({ type: 'remove', uid: prev.uid });
        marchPosRef.current.delete(prev.uid);
      }
    });

    cmdsRef.current = cmds;
    cByTileRef.current = buildCByTile(cmds);
    // Route lines must update when a march begins, steps, or ends.
    if (marchGfxRef.current) drawMarchLines(marchGfxRef.current, cmds, reinRef.current, tilesRef.current);
    // The ticker owns moving icons while marching; otherwise draw them once.
    if (!cmds.some(c => c.march)) redrawRef.current?.renderCommanderIcons?.();
  }, [cmds]);

  return (
    <div
      ref={containerRef}
      style={{
        position:"absolute", inset:0, top:0,
        userSelect:"none", touchAction:"none",
        background:"#080c10", overflow:"hidden",
        cursor:"grab",
      }}
    />
  );
}));
