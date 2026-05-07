import { useMemo } from "react";
import { COLS, ROWS, TW, TH } from "../../../shared/constants/geometry.js";
import { REGION_LIST } from "../../../shared/constants/regions.js";

const MM_SIZE    = 104;
const MM_RADIUS  = 48;
const MM_CX      = 52;
const MM_CY      = 52;
const VIEW_RADIUS = 80;

function tileToMM(tc, tr, vc, vr) {
  return {
    x: MM_CX + ((tc - vc) / VIEW_RADIUS) * MM_RADIUS,
    y: MM_CY + ((tr - vr) / VIEW_RADIUS) * MM_RADIUS,
  };
}

function keepTri(x, y, sz) {
  return `${x},${y - sz} ${x + sz * 0.85},${y + sz * 0.55} ${x - sz * 0.85},${y + sz * 0.55}`;
}

export default function Minimap({ tiles, pKeys, panSt, zoom }) {
  const { vc, vr } = useMemo(() => {
    const worldCX = (-panSt.x + window.innerWidth  / 2) / zoom;
    const worldCY = (-panSt.y + window.innerHeight / 2) / zoom;
    const u = worldCX - ROWS * TW / 2;
    const v = worldCY - 60;
    return {
      vc: Math.max(0, Math.min(COLS - 1, Math.round((u / (TW / 2) + v / (TH / 2)) / 2))),
      vr: Math.max(0, Math.min(ROWS - 1, Math.round((v / (TH / 2) - u / (TW / 2)) / 2))),
    };
  }, [panSt, zoom]);

  const playerTiles = useMemo(() => {
    const out = [];
    // Use pKeys (pre-built Set of player tile keys) instead of scanning
    // all 490,000 tiles — O(player tiles) instead of O(map size).
    for (const key of (pKeys || [])) {
      const t = tiles[key];
      if (!t || t.isShore) continue;
      const dc = t.c - vc, dr = t.r - vr;
      if (dc * dc + dr * dr <= VIEW_RADIUS * VIEW_RADIUS) out.push(t);
    }
    return out;
  }, [tiles, pKeys, vc, vr]);

  const nearbyKeeps = useMemo(() => {
    return REGION_LIST.filter(reg => {
      const dc = reg.cx - vc, dr = reg.cy - vr;
      return dc * dc + dr * dr <= (VIEW_RADIUS * 1.15) ** 2;
    }).map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      const owner = t?.owner || null;
      return {
        ...reg,
        color: !owner ? "#ffffff" : owner === "player" ? "#44aaff" : "#ff4444",
      };
    });
  }, [tiles, vc, vr]);

  return (
    <div style={{
      position: "fixed", top: 52, left: 8, zIndex: 180,
      width: MM_SIZE, height: MM_SIZE,
      pointerEvents: "none",
    }}>
      <svg width={MM_SIZE} height={MM_SIZE}>
        <defs>
          <clipPath id="mmclip">
            <circle cx={MM_CX} cy={MM_CY} r={MM_RADIUS}/>
          </clipPath>
        </defs>

        <circle cx={MM_CX} cy={MM_CY} r={MM_RADIUS} fill="#0d1f33"/>

        <g clipPath="url(#mmclip)">
          {playerTiles.map(t => {
            const { x, y } = tileToMM(t.c, t.r, vc, vr);
            return (
              <rect key={`${t.c},${t.r}`}
                x={x - 0.9} y={y - 0.9} width={1.8} height={1.8}
                fill="#3daa60" opacity={0.8}/>
            );
          })}

          {nearbyKeeps.map(reg => {
            const { x, y } = tileToMM(reg.cx, reg.cy, vc, vr);
            const sz = reg.layer === "ring" ? 6 : 4.5;
            return (
              <g key={reg.key}>
                <polygon points={keepTri(x + 0.6, y + 0.6, sz)} fill="rgba(0,0,0,0.45)"/>
                <polygon points={keepTri(x, y, sz)} fill={reg.color} opacity={0.95}/>
                {reg.layer === "ring" && (
                  <polygon points={keepTri(x, y, sz)}
                    fill="none" stroke="#f0c040" strokeWidth={0.9}/>
                )}
              </g>
            );
          })}
        </g>

        <line x1={MM_CX - 4} y1={MM_CY} x2={MM_CX + 4} y2={MM_CY}
          stroke="rgba(255,255,255,0.5)" strokeWidth={0.8}/>
        <line x1={MM_CX} y1={MM_CY - 4} x2={MM_CX} y2={MM_CY + 4}
          stroke="rgba(255,255,255,0.5)" strokeWidth={0.8}/>

        <circle cx={MM_CX} cy={MM_CY} r={MM_RADIUS}
          fill="none" stroke="#3a3020" strokeWidth={1.5}/>
        <circle cx={MM_CX} cy={MM_CY} r={MM_RADIUS - 0.5}
          fill="none" stroke="rgba(200,160,64,0.3)" strokeWidth={0.5}/>
      </svg>
    </div>
  );
}
