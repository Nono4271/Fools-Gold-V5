import { useState, useMemo, useEffect, memo } from "react";
import { REGION_LIST } from "../../../shared/constants/regions.js";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { ISO_W, ISO_H, TW, TH, TOP_PAD, ROWS } from "../../../shared/constants/geometry.js";
import { ICON_SCALE, HIT_PAD } from "../../constants/device.js";

const FAC_COLOR = { player: "#44aaff" };
PLAYABLE_FACTIONS.forEach(f => { FAC_COLOR[f.key] = f.c; });

function keepColor(owner) {
  if (!owner) return "#b8a88a";
  if (owner === "player") return "#44aaff";
  return FAC_COLOR[owner] || "#cc8844";
}

// ── Design space: 700×700 ────────────────────────────────────────────────────
const DW = 1850, DH = 1300;

const POLYS = {
  // Holy Grail
  holyGrail:       [[701,341],[876,341],[876,474],[701,474]],
  // Pirates
  saltmere:        [[130,75],[328,75],[328,208],[130,208]],
  plunderMaw:      [[130,75],[300,75],[295,25],[255,0],[200,4],[148,22],[130,75]],
  brineHollow:     [[328,75],[526,75],[526,208],[328,208]],
  deadAnchor:      [[130,208],[328,208],[328,341],[130,341]],
  // Night Creatures
  shadowmere:      [[1074,208],[1272,208],[1272,341],[1074,341]],
  theShroud:       [[1272,222],[1348,238],[1396,275],[1400,315],[1362,340],[1325,355],[1272,345]],
  crimsonVeil:     [[876,75],[1074,75],[1074,208],[876,208]],
  paleCourt:       [[1074,75],[1272,75],[1272,208],[1074,208]],
  duskHollow:      [[876,208],[1074,208],[1074,341],[876,341]],
  bloodfen:        [[1074,341],[1272,341],[1272,474],[1074,474]],
  // Dragons
  emberpeak:       [[130,341],[328,341],[328,474],[130,474]],
  smolderingMaw:   [[130,355],[58,368],[8,418],[0,465],[38,498],[72,518],[130,508]],
  ashcrag:         [[328,341],[526,341],[526,474]],
  cinderPass:      [[328,341],[526,474],[328,474]],
  scorchveil:      [[130,474],[328,474],[328,607],[130,607]],
  // Orcs
  grimhold:        [[1074,474],[1272,474],[1272,607],[1074,607]],
  theWarground:    [[1272,488],[1348,505],[1396,558],[1400,608],[1355,635],[1318,650],[1272,638]],
  warbend:         [[876,341],[1074,341],[1074,474],[876,474]],
  bloodfield:      [[876,474],[1074,474],[1074,607],[876,607]],
  bonepile:        [[1074,607],[1272,607],[1272,740],[1074,740]],
  // Wizards (Bounty Hunters)
  ashenveil:       [[526,740],[701,740],[701,848],[526,848]],
  arcaneDeep:      [[548,848],[562,898],[590,935],[622,968],[660,972],[695,970],[706,945],[712,920],[700,848]],
  hexmire:         [[328,607],[526,607],[526,740],[328,740]],
  ruinwatch:       [[526,607],[701,607],[701,740],[526,740]],
  ashenFen:        [[130,740],[328,740],[328,848],[130,848]],
  cursemoor:       [[328,740],[526,740],[526,848],[328,848]],
  // Holy Knights
  sanctumhold:     [[701,740],[876,740],[876,848],[701,848]],
  blessedShore:    [[728,848],[740,895],[762,932],[788,968],[822,972],[852,970],[862,945],[868,920],[854,848]],
  hallowedGround:  [[701,474],[876,474],[876,607],[701,607]],
  pilgrimsRest:    [[876,607],[1074,607],[1074,740],[876,740]],
  sacredVale:      [[876,740],[1074,740],[1074,848],[876,848]],
  dawnmarch:       [[1074,740],[1272,740],[1272,848],[1074,848]],
  // Neutral / Conflict
  gallowsReach:    [[526,75],[701,75],[701,208],[526,208]],
  greyExpanse:     [[701,75],[876,75],[876,208],[701,208]],
  mistfall:        [[328,208],[526,208],[526,341]],
  thornveil:       [[328,208],[526,341],[328,341]],
  wanderingWastes: [[526,208],[701,208],[701,341],[526,341]],
  dreadmoor:       [[701,208],[876,208],[876,341],[701,341]],
  theHollow:       [[526,341],[701,341],[701,474],[526,474]],
  grimward:        [[328,474],[526,474],[526,607],[328,607]],
  shatteredPass:   [[526,474],[701,474],[701,607]],
  sunkenRoad:      [[526,474],[701,607],[526,607]],
  paleMarch:       [[701,607],[876,607],[876,740],[701,740]],
  forsakenMarch:   [[130,607],[328,607],[328,740],[130,740]],
};

function scalePts(pts, sx, sy) {
  return pts.map(([x, y]) => `${(x * sx).toFixed(1)},${(y * sy).toFixed(1)}`).join(" ");
}

function centroid(pts) {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
}


export default memo(function WorldMap({ tiles, onClose, onTeleport, panRef, zoom, crossings }) {
  const [selected, setSelected] = useState(null);
  const [clickPos, setClickPos] = useState(null); // { x, y } in screen px
  const [dotPos, setDotPos] = useState(() => panRef?.current || { x: 4, y: 4 });

  useEffect(() => {
    const id = setInterval(() => {
      if (panRef?.current) setDotPos({ ...panRef.current });
    }, 100);
    return () => clearInterval(id);
  }, [panRef]);

  const [screenSize, setScreenSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth  : 390,
    h: typeof window !== "undefined" ? window.innerHeight : 844,
  }));
  useEffect(() => {
    const onResize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const screenW = screenSize.w;
  const screenH = screenSize.h;

  const keeps = useMemo(() => {
    return REGION_LIST.map(reg => {
      const t = tiles[`${reg.cx},${reg.cy}`];
      const defaultOwner = (reg.layer === 'start' || reg.layer === 'peninsula')
        ? (reg.factions?.[0] || null) : null;
      return { ...reg,
        owner:          t?.owner ?? defaultOwner,
        garrison:       t?.garrison || 0,
        garrisonTroops: t?.garrisonTroops || 0,
        garrisonWaves:  t?.garrisonWaves ?? 20,
        defeatedWaves:  t?.defeatedWaves ?? [],
        siege:          t?.siege    || 0,
        siegeMax:       t?.siegeMax || 0,
        defCmd:         t?.defCmd   || null,
      };
    });
  }, [tiles]);

  // Build gate list from crossings prop
  const gates = useMemo(() => {
    if (!crossings) return [];
    const result = [];
    for (const cr of crossings) {
      const gx = cr.axis === 'H' ? cr.gCoord : cr.bCoord;
      const gy = cr.axis === 'H' ? cr.bCoord : cr.gCoord;
      // Gate A position in WorldMap design space
      const axA = cr.axis === 'H' ? gx      : cr.bCoord - 2;
      const ayA = cr.axis === 'H' ? cr.bCoord - 2 : gy;
      // Gate B position
      const axB = cr.axis === 'H' ? gx      : cr.bCoord + 2;
      const ayB = cr.axis === 'H' ? cr.bCoord + 2 : gy;
      const typeIcon = cr.type === 'crossing' ? '🌊' : cr.type === 'tollbridge' ? '⌒' : '⛰';
      const t = tiles[`${axA},${ayA}`];
      result.push({
        key: cr.id + '_A', id: cr.id, side: 'A', type: cr.type,
        cx: axA, cy: ayA, icon: typeIcon,
        owner:    t?.owner    || null,
        garrison: t?.garrison || 0,
        siege:    t?.siege    || 0,
        siegeMax: t?.siegeMax || 0,
        name: `${cr.type === 'crossing' ? 'Crossing' : cr.type === 'tollbridge' ? 'Toll Bridge' : 'Tunnel'} Gate A`,
      });
      const t2 = tiles[`${axB},${ayB}`];
      result.push({
        key: cr.id + '_B', id: cr.id, side: 'B', type: cr.type,
        cx: axB, cy: ayB, icon: typeIcon,
        owner:    t2?.owner    || null,
        garrison: t2?.garrison || 0,
        siege:    t2?.siege    || 0,
        siegeMax: t2?.siegeMax || 0,
        name: `${cr.type === 'crossing' ? 'Crossing' : cr.type === 'tollbridge' ? 'Toll Bridge' : 'Tunnel'} Gate B`,
      });
    }
    return result;
  }, [crossings, tiles]);

  const allClickable = useMemo(() => [...keeps, ...gates], [keeps, gates]);
  const selectedItem = selected ? allClickable.find(k => k.key === selected) : null;

  const sx = 1, sy = 1;
  const iconMult = ICON_SCALE;

  // Handle tap on SVG — convert client coords to viewBox coords and hit-test polygons
  const handleSvgClick = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    // Use changedTouches for touch events, otherwise clientX/Y
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const svgX = ((clientX - rect.left) / rect.width)  * DW;
    const svgY = ((clientY - rect.top)  / rect.height) * DH;

    // Point-in-polygon test
    function pointInPoly(px, py, poly) {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    }

    // ── Gate hit-test FIRST — larger radius, always wins over keep polys ──
    const GATE_HIT_R = 22;
    for (const gate of gates) {
      const dx = svgX - gate.cx, dy = svgY - gate.cy;
      if (dx*dx + dy*dy < GATE_HIT_R*GATE_HIT_R) {
        const isToggleOff = selected === gate.key;
        setSelected(isToggleOff ? null : gate.key);
        setClickPos(isToggleOff ? null : { x: clientX, y: clientY });
        return;
      }
    }

    // ── Region polygon hit-test — skip if near any gate ──
    const GATE_EXCLUSION_R = 28;
    const nearGate = gates.some(gate => {
      const dx = svgX - gate.cx, dy = svgY - gate.cy;
      return dx*dx + dy*dy < GATE_EXCLUSION_R*GATE_EXCLUSION_R;
    });
    if (!nearGate) {
      for (const [key, poly] of Object.entries(POLYS)) {
        if (pointInPoly(svgX, svgY, poly)) {
          const isToggleOff = selected === key;
          setSelected(isToggleOff ? null : key);
          setClickPos(isToggleOff ? null : { x: clientX, y: clientY });
          return;
        }
      }
    }
    setSelected(null);
    setClickPos(null);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#080c10",
      display: "flex", flexDirection: "column",
      height: "100dvh",
      overflow: "hidden",
      fontFamily: "'Cinzel',serif",
    }}>
      <style>{`
        @keyframes holyPulse { 0%,100%{opacity:.3} 50%{opacity:.6} }
      `}</style>

      {/* Top bar */}
      <div style={{
        flexShrink: 0, height: 46,
        background: "rgba(0,0,0,0.85)",
        borderBottom: "1px solid rgba(200,160,64,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        zIndex: 10,
      }}>
        {/* Back arrow — explicit large hit area */}
        <div
          onClick={onClose}
          onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
          style={{
            position: "absolute", left: 0, top: 0,
            width: 60, height: 46,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <span style={{ fontSize: 24, color: "#c8a060", lineHeight: 1 }}>‹</span>
        </div>
        <span style={{ color: "#c8a060", fontSize: 15, fontFamily: "'Cinzel',serif", letterSpacing: ".14em" }}>
          WORLD MAP
        </span>
      </div>

      {/* Map area — fills remaining height, SVG letterboxed to fit entirely on screen */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${DW} ${DH}`}
          preserveAspectRatio="none"
          style={{
            display: "block", width: "100%", height: "100%",
            cursor: "pointer",
            pointerEvents: "all",
          }}
          onClick={handleSvgClick}
          onTouchEnd={handleSvgClick}
        >
          <defs>
            <filter id="wm-drop">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.9)"/>
            </filter>
            <radialGradient id="wm-vig" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)"/>
            </radialGradient>
          </defs>

          {/* Base */}
          <rect width={DW} height={DH} fill="#0a1418"/>

          {/* ── Region polygons ── */}
          {Object.entries(POLYS).map(([key, poly]) => {
            const reg = keeps.find(k => k.key === key);
            if (!reg) return null;

            const isSel  = selected === key;
            const owned  = reg.owner;
            const facCol = owned ? (owned === "player" ? "#44aaff" : (FAC_COLOR[owned] || "#cc8844")) : null;
            const isHG   = key === "holyGrail";

            return (
              <g key={key} style={{ pointerEvents: "none" }}>
                <polygon points={scalePts(poly, sx, sy)}
                  fill={isHG ? "rgba(240,192,64,0.08)" : facCol ? facCol : "#1e1e1e"}
                  opacity={isHG ? 1 : facCol ? 0.35 : 0.7}
                  clipPath={isHG ? "url(#hg-clip)" : undefined}/>
                {isSel && <polygon points={scalePts(poly, sx, sy)} fill="white" opacity={0.07}/>}
                {!isHG && (
                  <polygon points={scalePts(poly, sx, sy)} fill="none"
                    stroke={facCol || "#3a3228"}
                    strokeWidth={isSel ? 2 : 0.8}
                    strokeOpacity={facCol ? 0.7 : 0.45}/>
                )}
              </g>
            );
          })}

          {/* Holy Grail glow */}
          {(() => {
            const poly = POLYS["holyGrail"];
            if (!poly) return null;
            const [cx, cy] = centroid(poly);
            return (
              <>
                <defs>
                  <clipPath id="hg-clip">
                    <polygon points={scalePts(poly, sx, sy)}/>
                  </clipPath>
                </defs>
                <circle cx={cx * sx} cy={cy * sy} r={38 * sx}
                  fill="rgba(240,192,64,0.1)"
                  clipPath="url(#hg-clip)"
                  style={{ animation: "holyPulse 2.5s ease-in-out infinite", pointerEvents: "none" }}/>
              </>
            );
          })()}

          {/* Vignette */}
          <rect width={DW} height={DH} fill="url(#wm-vig)" style={{ pointerEvents: "none" }}/>

          {/* ── Player viewport dot ── */}
          {dotPos && zoom && (() => {
            const worldX = (screenW / 2 - dotPos.x) / zoom;
            const worldY = (screenH / 2 - dotPos.y) / zoom;
            const u = worldX - ROWS * TW / 2;
            const v = worldY - TOP_PAD;
            const tileC = (u / (TW / 2) + v / (TH / 2)) / 2;
            const tileR = (v / (TH / 2) - u / (TW / 2)) / 2;
            const dotX = tileC * sx;
            const dotY = tileR * sy;
            if (dotX < 0 || dotX > DW || dotY < 0 || dotY > DH) return null;
            return (
              <g style={{ pointerEvents: "none" }}>
                <circle cx={dotX} cy={dotY} r={6 * sx} fill="rgba(68,170,255,0.18)" stroke="#44aaff" strokeWidth={1.2}/>
                <circle cx={dotX} cy={dotY} r={2.5 * sx} fill="#44aaff" opacity={0.95}/>
              </g>
            );
          })()}

          {/* ── Region labels ── */}
          {keeps.map(reg => {
            if (reg.key === "holyGrail") return null;
            const poly = POLYS[reg.key];
            if (!poly) return null;
            const owned = reg.owner;
            const col = owned
              ? (owned === "player" ? "#88ccff" : (FAC_COLOR[owned] || "#ddaa66"))
              : "rgba(160,140,100,0.45)";
            const fs = Math.max(6, Math.min(9, 7.5 * sx));
            if (reg.cy * sy > DH - 20) return null;
            return (
              <text key={`lbl_${reg.key}`}
                x={reg.cx * sx} y={reg.cy * sy + 3}
                textAnchor="middle" fontSize={fs}
                fill={col} fontFamily="'Cinzel',serif"
                letterSpacing=".02em"
                style={{ pointerEvents: "none", userSelect: "none" }}>
                {reg.name.replace("The ", "").replace(" Keep", "").replace("Shattered ", "Sh. ")}
              </text>
            );
          })}

          {/* ── Keep icons ── */}
          {keeps.map(reg => {
            const poly = POLYS[reg.key];
            if (!poly) return null;
            const cx = reg.cx * sx, cy = reg.cy * sy;
            if (cy > DH - 15) return null;
            const owned  = reg.owner;
            const col    = keepColor(owned);
            const isHG   = reg.key === "holyGrail";
            const sz     = (isHG ? 14 * sx : reg.layer === "conflict" ? 11 * sx : 10 * sx) * iconMult;
            const isSel  = selected === reg.key;
            const by     = cy - sz * 1.2;

            if (isHG) return (
              <g key={`icon_${reg.key}`} style={{ pointerEvents: "none" }}>
                {isSel && <circle cx={cx} cy={cy} r={sz * 2.5} fill="none" stroke="#f0c040" strokeWidth={1.5} opacity={0.7}/>}
                <circle cx={cx} cy={cy} r={sz * 1.8} fill="rgba(240,192,64,0.12)" stroke="#f0c040" strokeWidth={0.8} opacity={0.7}/>
                <path d={`M${cx-sz*.5},${cy-sz*.5} L${cx+sz*.5},${cy-sz*.5} L${cx+sz*.35},${cy+sz*.15} L${cx-sz*.35},${cy+sz*.15}Z`}
                  fill="#f0c040" opacity={0.9}/>
                <path d={`M${cx-sz*.2},${cy+sz*.15} L${cx+sz*.2},${cy+sz*.15} L${cx+sz*.1},${cy+sz*.5} L${cx-sz*.1},${cy+sz*.5}Z`}
                  fill="#c8a020" opacity={0.9}/>
                <text x={cx} y={cy + sz * 1.5} textAnchor="middle" fontSize={Math.max(5.5, sz * .85)}
                  fill="rgba(240,192,64,0.85)" fontFamily="'Cinzel',serif" letterSpacing=".06em"
                  style={{ pointerEvents: "none" }}>Holy Grail</text>
              </g>
            );

            return (
              <g key={`icon_${reg.key}`} style={{ pointerEvents: "none" }}>
                {owned && <circle cx={cx} cy={by} r={sz * 1.6} fill={col} opacity={0.15}/>}
                {isSel && <circle cx={cx} cy={by} r={sz * 2.1} fill="none" stroke={col} strokeWidth={1.4} opacity={0.8}/>}
                <rect x={cx - sz * .58} y={by} width={sz * 1.16} height={sz} rx={1}
                  fill={col} opacity={owned ? 0.92 : 0.45}/>
                {[-0.4, -0.13, 0.13, 0.4].map((dx, i) => (
                  <rect key={i} x={cx + dx * sz * 2 - sz * .13} y={by - sz * .48} width={sz * .24} height={sz * .52} rx={1}
                    fill={col} opacity={owned ? 0.92 : 0.45}/>
                ))}
                <path d={`M${cx-sz*.2},${by+sz} L${cx-sz*.2},${by+sz*.5} Q${cx},${by+sz*.28} ${cx+sz*.2},${by+sz*.5} L${cx+sz*.2},${by+sz}Z`}
                  fill={owned ? "rgba(0,0,0,0.55)" : "#111"}/>
                {owned && <>
                  <line x1={cx} y1={by - sz * .48} x2={cx} y2={by - sz * 1.4} stroke={col} strokeWidth={1.3}/>
                  <polygon points={`${cx},${by-sz*1.4} ${cx+sz*.5},${by-sz*1.18} ${cx},${by-sz*.95}`}
                    fill={col} opacity={0.95}/>
                </>}
              </g>
            );
          })}

          {/* ── Crossing / Gate icons ── */}
          {gates.map(gate => {
            const cx = gate.cx * sx, cy = gate.cy * sy;
            if (cx < 0 || cx > DW || cy < 0 || cy > DH) return null;
            const owned = gate.owner;
            const col   = owned ? (owned === "player" ? "#44aaff" : (FAC_COLOR[owned] || "#cc8844")) : "#484858";
            const isSel = selected === gate.key;
            const sz    = 7 * iconMult;
            // Color by type
            const typeCol = gate.type === 'crossing' ? '#4ab8d8'
                          : gate.type === 'tollbridge' ? '#c8a030' : '#6a6a8a';

            return (
              <g key={`gate_${gate.key}`} style={{ pointerEvents: "none" }}>
                {isSel && <circle cx={cx} cy={cy} r={sz*2.2} fill="none" stroke={typeCol} strokeWidth={1.5} opacity={0.8}/>}
                {/* Gate background */}
                <rect x={cx-sz*.9} y={cy-sz*.6} width={sz*1.8} height={sz*1.2} rx={2}
                  fill="#0a0e18" stroke={typeCol} strokeWidth={1} opacity={0.9}/>
                {/* Type icon */}
                {gate.type === 'crossing' && <>
                  <path d={`M${cx-sz*.7},${cy-sz*.1} Q${cx-sz*.35},${cy-sz*.4} ${cx},${cy-sz*.1} Q${cx+sz*.35},${cy+sz*.2} ${cx+sz*.7},${cy-sz*.1}`}
                    fill="none" stroke={typeCol} strokeWidth={1.2} strokeLinecap="round"/>
                  <path d={`M${cx-sz*.7},${cy+sz*.3} Q${cx-sz*.35},${cy} ${cx},${cy+sz*.3} Q${cx+sz*.35},${cy+sz*.6} ${cx+sz*.7},${cy+sz*.3}`}
                    fill="none" stroke={typeCol} strokeWidth={1.2} strokeLinecap="round"/>
                </>}
                {gate.type === 'tollbridge' && <>
                  <path d={`M${cx-sz*.7},${cy+sz*.4} L${cx-sz*.7},${cy} Q${cx},${cy-sz*.7} ${cx+sz*.7},${cy} L${cx+sz*.7},${cy+sz*.4}`}
                    fill="none" stroke={typeCol} strokeWidth={1.2}/>
                </>}
                {gate.type === 'tunnel' && <>
                  <ellipse cx={cx} cy={cy+sz*.1} rx={sz*.65} ry={sz*.45} fill="#050810" stroke={typeCol} strokeWidth={1.2}/>
                  <ellipse cx={cx} cy={cy+sz*.1} rx={sz*.3} ry={sz*.2} fill="#020204" stroke="#3a3a5a" strokeWidth={0.8}/>
                </>}
                {/* Side label */}
                <text x={cx} y={cy-sz*.75} textAnchor="middle" fontSize={5}
                  fill={typeCol} fontFamily="monospace" opacity={0.8}>{gate.side}</text>
              </g>
            );
          })}

        </svg>

        {/* ── Floating popup — anchored near click, flips left/right based on screen edge ── */}
        {selectedItem && clickPos && (() => {
          const POPUP_W = 220;
          const POPUP_MAX_H = 280;
          const PAD = 32;
          const flipLeft = clickPos.x > screenW * 0.55;
          const popupLeft = flipLeft
            ? Math.max(8, clickPos.x - POPUP_W - PAD)
            : Math.min(screenW - POPUP_W - 8, clickPos.x + PAD);
          const popupTop = Math.min(
            Math.max(8, clickPos.y - 40),
            screenH - POPUP_MAX_H - 8
          );

          const si = selectedItem;
          const ownerCol = si.owner
            ? (si.owner === "player" ? "#44aaff" : (FAC_COLOR[si.owner] || "#cc8844"))
            : "#7a6a50";
          const wavesTotal    = si.garrisonWaves ?? (si.type ? 2 : 20);
          const wavesDefeated = si.defeatedWaves?.length ?? 0;
          const wavesLeft     = Math.max(0, wavesTotal - wavesDefeated);
          const siegePct      = si.siegeMax > 0 ? Math.round((si.siege / si.siegeMax) * 100) : 0;
          const defLvl        = si.defCmd?.lvl ?? 20;
          const isGate        = !!si.type;
          const typeCol       = si.type === "crossing" ? "#4ab8d8"
                              : si.type === "tollbridge" ? "#c8a030"
                              : si.type === "tunnel" ? "#8a8aaa" : null;

          return (
            <div
              style={{
                position: "absolute",
                left: popupLeft, top: popupTop,
                width: POPUP_W,
                background: "rgba(6,8,14,0.97)",
                border: "1px solid rgba(200,160,64,0.25)",
                borderRadius: 8,
                boxShadow: "0 4px 24px rgba(0,0,0,0.8)",
                zIndex: 20,
                fontFamily: "'Cinzel',serif",
                overflow: "hidden",
                pointerEvents: "all",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: "10px 12px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: `linear-gradient(160deg, ${ownerCol}12, transparent)`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e8dcc8", lineHeight: 1.2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {si.keepName || si.name || si.key}
                    </div>
                    <div style={{ fontSize: 8, color: ownerCol, marginTop: 3, letterSpacing: ".04em" }}>
                      {!si.owner ? "Unoccupied"
                        : si.owner === "player" ? "Your Faction" : "Enemy Controlled"}
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setClickPos(null); }} style={{
                    background: "none", border: "none", color: "#4a4030",
                    fontSize: 14, cursor: "pointer", padding: "0 0 0 8px", flexShrink: 0,
                    WebkitTapHighlightColor: "transparent",
                  }}>✕</button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "10px 12px" }}>

                {/* Gate type badge */}
                {isGate && (
                  <div style={{
                    marginBottom: 8, padding: "3px 7px", borderRadius: 3, display: "inline-block",
                    background: `${typeCol}18`, border: `1px solid ${typeCol}50`,
                    fontSize: 8, color: typeCol,
                  }}>
                    {si.type === "crossing" ? "🌊 River Crossing"
                     : si.type === "tollbridge" ? "⌒ Toll Bridge" : "⛰ Tunnel Gate"}
                    {" · Gate "}{si.side}
                  </div>
                )}

                {/* Siege bar */}
                {si.siegeMax > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 7, color: "#6a5a3a", letterSpacing: ".06em" }}>SIEGE</span>
                      <span style={{ fontSize: 7, color: "#cc4040", fontWeight: 700 }}>
                        {si.siege.toLocaleString()}/{si.siegeMax.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "#0a0c10", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3, transition: "width .3s",
                        width: `${siegePct}%`,
                        background: siegePct > 60 ? "linear-gradient(90deg,#3a8830,#4db840)"
                                  : siegePct > 25 ? "linear-gradient(90deg,#8a7010,#c8a820)"
                                  : "linear-gradient(90deg,#882020,#dd3030)",
                      }}/>
                    </div>
                  </div>
                )}

                {/* Garrison waves — shown for all (gates have 2, keeps have 20) */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 7, color: "#6a5a3a", letterSpacing: ".06em" }}>GARRISON</span>
                    <span style={{ fontSize: 7, color: "#c8a060" }}>{wavesLeft}/{wavesTotal} waves left</span>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    {Array.from({ length: wavesTotal }).map((_, i) => (
                      <div key={i} style={{
                        width: Math.max(6, Math.min(10, (POPUP_W - 40) / wavesTotal - 2)),
                        height: 6, borderRadius: 2,
                        background: i < wavesDefeated ? "#2a1a1a" : ownerCol,
                        opacity: i < wavesDefeated ? 0.3 : 0.85,
                      }}/>
                    ))}
                  </div>
                </div>

                {/* Defender level */}
                <div style={{
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c8a060" }}>Lv{defLvl}</div>
                  <div style={{ fontSize: 6, color: "#4a3a28", letterSpacing: ".06em", marginTop: 1 }}>WAVE DEFENDER LEVEL</div>
                </div>
              </div>

              {/* Footer — Go button */}
              <div style={{ padding: "0 12px 10px" }}>
                <button
                  onClick={() => { onClose(); requestAnimationFrame(() => onTeleport(si.cx, si.cy)); }}
                  style={{
                    width: "100%", padding: "8px 0",
                    background: "linear-gradient(160deg,#2a1e08,#100c02)",
                    border: "1px solid #8a6020", borderRadius: 5,
                    color: "#f0c060", fontFamily: "'Cinzel',serif",
                    fontSize: 10, letterSpacing: ".08em", cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}>
                  GO →
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
});
