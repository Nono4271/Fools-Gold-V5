import { memo, useMemo } from "react";
import { RKEYS, RSS, POWER_DEFS } from "../../../shared/constants/map.js";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";

/*
  HUD — landscape top bar
  ──────────────────────────────────────────────────────────────────────────────
  Trapezoid bar: left slant angles right going up, right slant mirrors it
  (wider at bottom), leaving ~16% clear on each side for minimap / buttons.

  ROW 1:  [stone][wood][ore][gas] | [FG] | [🥚 eggs][🔮 orbs][💎 gems][⚙]
  ROW 2:  [💍 power/hr — just left of FG]  [⬛ tiles — just right of FG]

  Dragon Eggs  — capacity/24 = regen/hr.  Default 20/20 → 0.83/hr
  Mystic Orbs  — regen TBD (building).    Default 1000/10000
  ──────────────────────────────────────────────────────────────────────────────
*/

const BAR_H    = 52;
const L_BOTTOM = 160;
const L_TOP    = 176;
const R_TOP    = 824;
const R_BOTTOM = 840;

/* ── Crimson Egg SVG (inline, scalable) ──────────────────────────────────── */
function EggIcon({ size = 15 }) {
  const s = size;
  const cx = s / 2, cy = s * 0.52, rx = s * 0.36, ry = s * 0.44;
  const uid = `egg${s}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <radialGradient id={`${uid}b`} cx="38%" cy="28%" r="65%">
          <stop offset="0%"   stopColor="#5a0818"/>
          <stop offset="60%"  stopColor="#2e0410"/>
          <stop offset="100%" stopColor="#1a0208"/>
        </radialGradient>
        <filter id={`${uid}f`}><feGaussianBlur stdDeviation={s * 0.06}/></filter>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx * 1.25} ry={ry * 1.15} fill="#cc1030" opacity=".15" filter={`url(#${uid}f)`}/>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}b)`}/>
      <g fill="none" strokeLinecap="round">
        <path d={`M${cx+rx*.05} ${cy-ry*.55} L${cx-rx*.1} ${cy-ry*.15} L${cx+rx*.2} ${cy+ry*.15} L${cx} ${cy+ry*.5}`}
          stroke="#ff4060" strokeWidth={s * .03} opacity=".95"/>
        <path d={`M${cx-rx*.1} ${cy-ry*.15} L${cx-rx*.35} ${cy+ry*.05}`}
          stroke="#ff3050" strokeWidth={s * .022} opacity=".8"/>
        <path d={`M${cx+rx*.2} ${cy+ry*.15} L${cx+rx*.32} ${cy+ry*.35}`}
          stroke="#ff3050" strokeWidth={s * .018} opacity=".7"/>
      </g>
      <circle cx={cx - rx * .1} cy={cy - ry * .15} r={s * .06} fill="#ff6080" opacity=".5"/>
      <ellipse cx={cx - rx * .22} cy={cy - ry * .3} rx={rx * .16} ry={ry * .09}
        fill="rgba(255,255,255,.1)" transform={`rotate(-15,${cx},${cy})`}/>
    </svg>
  );
}

/* ── Mystic Orb SVG (inline, scalable) ──────────────────────────────────── */
function OrbIcon({ size = 15 }) {
  const s = size;
  const cx = s / 2, cy = s / 2, r = s * 0.36;
  const uid = `orb${s}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <radialGradient id={`${uid}b`} cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor="#8833cc"/>
          <stop offset="50%"  stopColor="#440a88"/>
          <stop offset="100%" stopColor="#1a0440"/>
        </radialGradient>
        <radialGradient id={`${uid}g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#9944ff" stopOpacity=".5"/>
          <stop offset="100%" stopColor="#9944ff" stopOpacity="0"/>
        </radialGradient>
        <filter id={`${uid}f`}><feGaussianBlur stdDeviation={s * .07}/></filter>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.3} fill={`url(#${uid}g)`} filter={`url(#${uid}f)`}/>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}b)`}/>
      {/* Swirl arcs */}
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const a  = deg * Math.PI / 180;
        const a2 = (deg + 55) * Math.PI / 180;
        const x1 = cx + Math.cos(a)  * r * .55, y1 = cy + Math.sin(a)  * r * .55;
        const x2 = cx + Math.cos(a2) * r * .8,  y2 = cy + Math.sin(a2) * r * .8;
        const qx = cx + Math.cos(a + .6) * r * .3;
        const qy = cy + Math.sin(a + .6) * r * .3;
        return <path key={i} d={`M${x1},${y1} Q${qx},${qy} ${x2},${y2}`}
          stroke="#cc88ff" strokeWidth={s * .018} fill="none" opacity={.5 - i * .05}/>;
      })}
      {/* Star rune dots */}
      {[0, 1, 2, 3, 4].map(i => {
        const a = i * 72 * Math.PI / 180 - Math.PI / 2;
        return <circle key={i} cx={cx + Math.cos(a) * r * .35} cy={cy + Math.sin(a) * r * .35}
          r={s * .03} fill="#ffcc44" opacity=".8"/>;
      })}
      <circle cx={cx} cy={cy} r={s * .035} fill="#ffee88" opacity=".9"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#7722bb" strokeWidth={s * .02}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#cc88ff" strokeWidth={s * .008} opacity=".4"/>
      <ellipse cx={cx - r * .28} cy={cy - r * .32} rx={r * .22} ry={r * .13}
        fill="rgba(255,255,255,.18)" transform={`rotate(-25,${cx},${cy})`}/>
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.floor(n));
}

/* ── HUD ─────────────────────────────────────────────────────────────────── */
export default memo(function HUD({
  facName, facKey, pKeys, rss, gems, tiles,
  dragonEggs    = 20,
  dragonEggsCap = 20,
  tileCap       = 60,
  mysticOrbs    = 1000,
  mysticOrbsCap = 10000,
  mysticOrbRegen = 0,
}) {
  const facEmoji = useMemo(() => {
    return PLAYABLE_FACTIONS.find(f => f.key === facKey)?.s ?? "⚑";
  }, [facKey]);

  const ringPowerPerHr = useMemo(() => {
    if (!tiles) return 0;
    let total = 0;
    for (const key of pKeys) {
      const t = tiles[key];
      if (t && t.powerLevel && !t.isHQ && !t.isHQPart) total += POWER_DEFS[t.powerLevel]?.ringPower ?? 0;
    }
    return total;
  }, [tiles, pKeys]);

  // HQ 3x3 tiles (isHQ + isHQPart) are base tiles — don't count toward the cap
  const tileCount = useMemo(() => {
    if (!tiles || !pKeys) return 0;
    let n = 0;
    for (const key of pKeys) {
      const t = tiles[key];
      if (t && !t.isHQ && !t.isHQPart) n++;
    }
    return n;
  }, [tiles, pKeys]);
  const rssRate   = { stone: 200, wood: 200, ore: 200, gas: 2400 }; // TODO: wire

  // Dragon Egg regen: capacity fills in 24 hrs regardless of cap size
  const eggRegen = (dragonEggsCap / 24).toFixed(2).replace(/\.?0+$/, "");

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0,
      zIndex: 200,
      paddingTop: "env(safe-area-inset-top, 0px)",
      height: BAR_H,
      pointerEvents: "none",
    }}>

      {/* ── SVG trapezoid bar ── */}
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
            <stop offset="10%"  stopColor="#c8a04055"/>
            <stop offset="90%"  stopColor="#c8a04055"/>
            <stop offset="100%" stopColor="transparent"/>
          </linearGradient>
        </defs>
        <polygon points={`${L_BOTTOM},52 ${L_TOP},0 ${R_TOP},0 ${R_BOTTOM},52`} fill="url(#hudGrad)"/>
        <line x1={L_BOTTOM} y1="51.5" x2={R_BOTTOM} y2="51.5" stroke="url(#trimGrad)" strokeWidth="1"/>
        <line x1={L_BOTTOM} y1="52" x2={L_TOP} y2="0" stroke="#c8a04044" strokeWidth="1"/>
        <line x1={R_BOTTOM} y1="52" x2={R_TOP} y2="0" stroke="#c8a04044" strokeWidth="1"/>
      </svg>

      {/* ── Content ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: "20%", paddingRight: "17%",
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        pointerEvents: "auto",
      }}>

        {/* ══ THREE COLUMN LAYOUT — each column stacks its row1 + row2 ════════
            Left  col: RSS pills (row1) + power/hr centred beneath (row2)
            Mid   col: faction medallion only
            Right col: eggs pill (row1) + tile count centred beneath (row2),
                       then orbs, gems, settings (no sub-label)
        ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>

          {/* ── LEFT COL: RSS pills + power/hr right-aligned under gas ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:2, flex:"0 0 auto" }}>
            {/* RSS pills row */}
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              {RKEYS.map(k => (
                <div key={k} style={{
                  display:"flex", alignItems:"center", gap:2, padding:"2px 5px",
                  background:RSS[k].bg, border:`1px solid ${RSS[k].col}30`, borderRadius:3,
                  boxShadow:"inset 0 1px 0 rgba(255,255,255,.04), 0 1px 3px rgba(0,0,0,.6)",
                  whiteSpace:"nowrap",
                }}>
                  <span style={{ fontSize:10 }}>{RSS[k].icon}</span>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:RSS[k].col, lineHeight:1.15 }}>
                      {Math.floor(rss[k]).toLocaleString()}
                    </span>
                    <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:`${RSS[k].col}80`, lineHeight:1.15 }}>
                      +{rssRate[k]}/h
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Power/hr — right-aligned so it sits under the gas pill (last RSS) */}
            <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:8 }}>💍</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#d4af37", whiteSpace:"nowrap" }}>
                +{ringPowerPerHr.toLocaleString()}/hr
              </span>
            </div>
          </div>

          {/* ── MID COL: faction medallion, padded top to vertically centre in bar ── */}
          <div style={{ flexShrink:0, margin:"0 6px", paddingTop:2 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%",
              background:"radial-gradient(circle at 35% 30%, #2a2215, #0e0c09)",
              border:"1px solid #c8a04060",
              boxShadow:"0 0 10px rgba(200,160,64,.18), inset 0 1px 0 rgba(255,255,255,.08)",
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative",
            }}>
              <div style={{ position:"absolute", inset:-2, borderRadius:"50%", border:"1px solid rgba(200,160,64,.15)" }}/>
              <span style={{ fontSize:18, lineHeight:1, userSelect:"none" }}>{facEmoji}</span>
            </div>
          </div>

          {/* ── RIGHT COL: all items top-aligned so orbs/gems/settings don't drop ── */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:5, flex:"0 0 auto" }}>

            {/* Dragon Eggs + tile count beneath */}
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <div style={{
                display:"flex", alignItems:"center", gap:3, padding:"2px 6px",
                background:"rgba(140,15,35,.20)", border:"1px solid rgba(200,30,55,.28)",
                borderRadius:3, boxShadow:"inset 0 1px 0 rgba(255,255,255,.05), 0 1px 3px rgba(0,0,0,.6)",
                whiteSpace:"nowrap",
              }}>
                <EggIcon size={15}/>
                <div style={{ display:"flex", flexDirection:"column" }}>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#e04060", lineHeight:1.15 }}>
                    {dragonEggs}/{dragonEggsCap}
                  </span>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#e0406088", lineHeight:1.15 }}>
                    +{eggRegen}/hr
                  </span>
                </div>
              </div>
              {/* Tile count centred under eggs pill */}
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:2 }}>
                <span style={{ fontSize:8 }}>⬛</span>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#6a9060", whiteSpace:"nowrap" }}>
                  {tileCount}/{tileCap}
                </span>
              </div>
            </div>

            {/* Mystic Orbs — top-aligned, no sub-row so it sits flush with egg pill top */}
            <div style={{
              display:"flex", alignItems:"center", gap:3, padding:"2px 6px",
              background:"rgba(60,10,100,.22)", border:"1px solid rgba(120,40,180,.28)",
              borderRadius:3, boxShadow:"inset 0 1px 0 rgba(255,255,255,.05), 0 1px 3px rgba(0,0,0,.6)",
              whiteSpace:"nowrap",
            }}>
              <OrbIcon size={15}/>
              <div style={{ display:"flex", flexDirection:"column" }}>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#bb66ff", lineHeight:1.15 }}>
                  {fmtNum(mysticOrbs)}/{fmtNum(mysticOrbsCap)}
                </span>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#bb66ff88", lineHeight:1.15 }}>
                  {mysticOrbRegen > 0 ? `+${fmtNum(mysticOrbRegen)}/hr` : "—/hr"}
                </span>
              </div>
            </div>

            {/* Gems */}
            <div style={{
              display:"flex", alignItems:"center", gap:3, padding:"2px 6px",
              background:"rgba(240,192,64,.07)", border:"1px solid rgba(240,192,64,.22)",
              borderRadius:3, boxShadow:"inset 0 1px 0 rgba(255,255,255,.05), 0 1px 3px rgba(0,0,0,.6)",
              whiteSpace:"nowrap",
            }}>
              <span style={{ fontSize:11 }}>💎</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#f0c040" }}>
                {(gems ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Settings */}
            <button style={{
              background:"rgba(20,16,8,.6)", border:"1px solid rgba(200,160,64,.18)",
              borderRadius:4, width:24, height:24,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", padding:0, flexShrink:0,
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.05)",
              pointerEvents:"auto", touchAction:"manipulation",
            }}>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
                <circle cx="8" cy="8" r="2.2" stroke="#c8a040" strokeWidth="1.2"/>
                <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
                  stroke="#c8a04088" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
