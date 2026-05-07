import { useEffect, useRef, useMemo } from "react";
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
  return [x, y - sz, x + sz * 0.85, y + sz * 0.55, x - sz * 0.85, y + sz * 0.55];
}

export default function Minimap({ tiles, pKeys, panSt, zoom }) {
  const canvasRef = useRef(null);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const s = MM_SIZE * dpr;
    if (canvas.width !== s) { canvas.width = s; canvas.height = s; }
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, MM_SIZE, MM_SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(MM_CX, MM_CY, MM_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = "#0d1f33";
    ctx.fill();

    // Player tiles
    ctx.fillStyle = "rgba(61,170,96,0.8)";
    for (const key of (pKeys || [])) {
      const t = tiles[key];
      if (!t || t.isShore) continue;
      const dc = t.c - vc, dr = t.r - vr;
      if (dc * dc + dr * dr > VIEW_RADIUS * VIEW_RADIUS) continue;
      const { x, y } = tileToMM(t.c, t.r, vc, vr);
      ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }

    // Keeps
    const r2 = (VIEW_RADIUS * 1.15) ** 2;
    for (const reg of REGION_LIST) {
      const dc = reg.cx - vc, dr = reg.cy - vr;
      if (dc * dc + dr * dr > r2) continue;
      const t = tiles[`${reg.cx},${reg.cy}`];
      const owner = t?.owner || null;
      const color = !owner ? "#ffffff" : owner === "player" ? "#44aaff" : "#ff4444";
      const { x, y } = tileToMM(reg.cx, reg.cy, vc, vr);
      const sz = reg.layer === "ring" ? 6 : 4.5;
      const pts = keepTri(x, y, sz);
      const shPts = keepTri(x + 0.6, y + 0.6, sz);

      // Shadow
      ctx.beginPath();
      ctx.moveTo(shPts[0], shPts[1]);
      ctx.lineTo(shPts[2], shPts[3]);
      ctx.lineTo(shPts[4], shPts[5]);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      // Triangle
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      ctx.lineTo(pts[2], pts[3]);
      ctx.lineTo(pts[4], pts[5]);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (reg.layer === "ring") {
        ctx.strokeStyle = "#f0c040";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }

    ctx.restore();

    // Crosshair
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(MM_CX - 4, MM_CY); ctx.lineTo(MM_CX + 4, MM_CY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(MM_CX, MM_CY - 4); ctx.lineTo(MM_CX, MM_CY + 4); ctx.stroke();

    // Border rings
    ctx.beginPath(); ctx.arc(MM_CX, MM_CY, MM_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "#3a3020"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(MM_CX, MM_CY, MM_RADIUS - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200,160,64,0.3)"; ctx.lineWidth = 0.5; ctx.stroke();

    // Reset transform for next draw
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [tiles, pKeys, vc, vr]);

  return (
    <div style={{
      position: "fixed", top: 52, left: 8, zIndex: 180,
      width: MM_SIZE, height: MM_SIZE,
      pointerEvents: "none",
    }}>
      <canvas ref={canvasRef}
        style={{ width: MM_SIZE, height: MM_SIZE, borderRadius: "50%" }}
      />
    </div>
  );
}
