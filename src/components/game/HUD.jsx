import { memo, useMemo } from "react";
import { RKEYS, RSS, POWER_DEFS } from "../../../shared/constants/map.js";

/*
  HUD — landscape top bar
  ──────────────────────────────────────────────────────────────────────────────
  Two-row layout inside a taller bar (52px). Slant is shallow (≈12px horizontal
  over 52px height) so it sits well past the minimap in landscape.

  ROW 1 (top):   [RSS pills] ... [Faction medallion] ... [🔴 orb | 🟡 coin | 💎 gems | ⚙]
  ROW 2 (bottom): [💍 power/hr — left-aligned under RSS]  [⬛ tile count — right-aligned under currencies]

  Minimap (104px circle) sits at top:4 left:6, zIndex 180 — HUD leaves that
  corner clear. Content starts at ~130px from left edge.
  ──────────────────────────────────────────────────────────────────────────────
*/

const BAR_H          = 52;   // px — tall enough for two content rows
const CONTENT_START  = 130;  // px from left — clears minimap (104) + gap + slant

export default memo(function HUD({ facName, pKeys, rss, gems, tiles }) {

  const ringPowerPerHr = useMemo(() => {
    if (!tiles) return 0;
    let total = 0;
    for (const key of pKeys) {
      const t = tiles[key];
      if (t && t.powerLevel) total += POWER_DEFS[t.powerLevel]?.ringPower ?? 0;
    }
    return total;
  }, [tiles, pKeys]);

  const tileCount = pKeys?.size ?? 0;

  // TODO: wire real per-hour rates from game tick state
  const rssRate = { stone: 200, wood: 200, ore: 200, gas: 2400 };

  const pillBase = {
    display: "flex", alignItems: "center", gap: 3,
    padding: "2px 7px",
    borderRadius: 3,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 1px 3px rgba(0,0,0,.6)",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 200,
      paddingTop: "env(safe-area-inset-top, 0px)",
      height: BAR_H,
      pointerEvents: "none",
    }}>

      {/* ── SVG bar shape ─────────────────────────────────────────────────────
          Landscape screen ~700-900px wide. Minimap circle is 104px at left:6.
          Slant: bottom-left corner at x=118, top-left at x=130 → only 12px
          horizontal over 52px height = very shallow angle, clears all RSS.
          viewBox 1000 units wide maps to 100% screen width.
          In landscape 700px wide: 118/1000*700 = 82.6px from left edge for
          the bottom corner — the minimap ends at 6+104=110px, so bar clears it.
      ──────────────────────────────────────────────────────────────────────── -->*/}
      <svg
        style={{ position:"absolute", inset:0, width:"100%", height:BAR_H, pointerEvents:"none" }}
        preserveAspectRatio="none"
        viewBox="0 0 1000 52"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hudGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1e180a" stopOpacity="0.98"/>
            <stop offset="100%" stopColor="#0d0b06" stopOpacity="0.97"/>
          </linearGradient>
          <linearGradient id="trimGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="transparent"/>
            <stop offset="12%"  stopColor="#c8a04055"/>
            <stop offset="88%"  stopColor="#c8a04055"/>
            <stop offset="100%" stopColor="transparent"/>
          </linearGradient>
        </defs>
        {/* Shallow slant: bottom corner x=155, top corner x=172 → 17px over 52px */}
        <polygon points="155,52 172,0 1000,0 1000,52" fill="url(#hudGrad)"/>
        <line x1="155" y1="51.5" x2="1000" y2="51.5" stroke="url(#trimGrad)" strokeWidth="1"/>
        <line x1="155" y1="52"   x2="172"  y2="0"    stroke="#c8a04040"       strokeWidth="1"/>
      </svg>

      {/* ── Content wrapper ── */}
      <div style={{
        position: "absolute", inset: 0,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: CONTENT_START,
        paddingRight: 8,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 3,
        pointerEvents: "auto",
      }}>

        {/* ═══ ROW 1 ══════════════════════════════════════════════════════════ */}
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>

          {/* LEFT — RSS pills */}
          <div style={{ display:"flex", alignItems:"center", gap:4, flex:"0 0 auto" }}>
            {RKEYS.map(k => (
              <div key={k} style={{
                display:"flex", alignItems:"center", gap:2,
                padding:"2px 5px",
                background: RSS[k].bg,
                border:`1px solid ${RSS[k].col}30`,
                borderRadius:3,
                boxShadow:"inset 0 1px 0 rgba(255,255,255,.04), 0 1px 3px rgba(0,0,0,.6)",
                whiteSpace:"nowrap",
              }}>
                <span style={{ fontSize:10 }}>{RSS[k].icon}</span>
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:RSS[k].col, lineHeight:1.1 }}>
                    {Math.floor(rss[k]).toLocaleString()}
                  </span>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:`${RSS[k].col}80`, lineHeight:1.1 }}>
                    +{rssRate[k]}/h
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* CENTRE — faction medallion */}
          <div style={{ flex:"1 1 auto", display:"flex", justifyContent:"center" }}>
            <div style={{
              width:36, height:36, borderRadius:"50%",
              background:"radial-gradient(circle at 35% 30%, #2a2215, #0e0c09)",
              border:"1px solid #c8a04060",
              boxShadow:"0 0 10px rgba(200,160,64,.18), inset 0 1px 0 rgba(255,255,255,.08)",
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, position:"relative",
            }}>
              <div style={{ position:"absolute", inset:-2, borderRadius:"50%", border:"1px solid rgba(200,160,64,.15)" }}/>
              <span style={{
                fontFamily:"'Cinzel Decorative',serif", fontSize:10,
                background:"linear-gradient(135deg,#f0c040,#c89030,#f0c040)",
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                animation:"shimmer 3s linear infinite",
                userSelect:"none",
              }}>FG</span>
            </div>
          </div>

          {/* RIGHT — red orb | gold coin | gems | settings */}
          <div style={{ display:"flex", alignItems:"center", gap:5, flex:"0 0 auto" }}>

            {/* Red orb placeholder */}
            <div style={{ ...pillBase, background:"rgba(160,25,25,.20)", border:"1px solid rgba(200,55,55,.28)" }}>
              <div style={{
                width:14, height:14, borderRadius:"50%",
                background:"radial-gradient(circle at 35% 30%, #ff6060, #880808)",
                border:"1px solid #cc303088",
                boxShadow:"0 0 5px rgba(200,40,40,.5)",
                flexShrink:0,
              }}/>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#e05050" }}>20</span>
            </div>

            {/* Gold coin placeholder */}
            <div style={{ ...pillBase, background:"rgba(140,105,15,.20)", border:"1px solid rgba(200,155,35,.28)" }}>
              <div style={{
                width:14, height:14, borderRadius:"50%",
                background:"radial-gradient(circle at 35% 30%, #ffd040, #7a5508)",
                border:"1px solid #c8901040",
                boxShadow:"0 0 5px rgba(200,160,40,.4)",
                flexShrink:0,
              }}/>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#d4a020" }}>1.0m</span>
            </div>

            {/* Gems */}
            <div style={{ ...pillBase, background:"rgba(240,192,64,.07)", border:"1px solid rgba(240,192,64,.22)" }}>
              <span style={{ fontSize:11 }}>💎</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#f0c040" }}>
                {(gems ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Settings */}
            <button style={{
              background:"rgba(20,16,8,.6)",
              border:"1px solid rgba(200,160,64,.18)",
              borderRadius:4,
              width:24, height:24,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", padding:0, flexShrink:0,
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.05)",
              pointerEvents:"auto",
              touchAction:"manipulation",
            }}>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="2.2" stroke="#c8a040" strokeWidth="1.2"/>
                <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
                  stroke="#c8a04088" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ═══ ROW 2 ══════════════════════════════════════════════════════════ */}
        <div style={{ display:"flex", alignItems:"center" }}>

          {/* Power/hr — left-aligned, sits below RSS block */}
          <div style={{
            display:"flex", alignItems:"center", gap:3,
            flex:"0 0 auto",
          }}>
            <span style={{ fontSize:8 }}>💍</span>
            <span style={{
              fontFamily:"'Cinzel',serif", fontSize:7, color:"#d4af37",
              whiteSpace:"nowrap",
            }}>
              +{ringPowerPerHr.toLocaleString()}/hr
            </span>
          </div>

          {/* Spacer */}
          <div style={{ flex:"1 1 auto" }}/>

          {/* Tile count — right-aligned, sits below currencies */}
          <div style={{
            display:"flex", alignItems:"center", gap:3,
            flex:"0 0 auto",
          }}>
            <span style={{ fontSize:8 }}>⬛</span>
            <span style={{
              fontFamily:"'Cinzel',serif", fontSize:7, color:"#6a9060",
              whiteSpace:"nowrap",
            }}>
              {tileCount}/31
            </span>
          </div>
        </div>

      </div>
    </div>
  );
});
