import { useState, useMemo, memo, useCallback } from "react";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { TOMES_LEVEL_COST, TOMES_MAX_LEVEL } from "../../../shared/constants/map.js";

export function ScrollStackIcon({ size = 44, glowing = false }) {
  const s = size, cx = s/2, cy = s*.52, id = `ss${s}${glowing?"g":""}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{overflow:"visible",flexShrink:0}}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0e8c8"/><stop offset="100%" stopColor="#d4c498"/>
        </linearGradient>
        <filter id={`${id}f`}><feGaussianBlur stdDeviation={s*.07}/></filter>
      </defs>
      <ellipse cx={cx} cy={cy} rx={s*.32} ry={s*.26}
        fill={glowing?"#40ddcc":"#20ddcc"} opacity={glowing?.28:.12} filter={`url(#${id}f)`}/>
      <g transform={`rotate(22,${cx},${cy})`}>
        <rect x={cx-s*.22} y={cy-s*.35} width={s*.44} height={s*.55} rx={s*.025}
          fill="#c4b880" stroke="#8a7830" strokeWidth={s*.014}/>
        <ellipse cx={cx} cy={cy-s*.35} rx={s*.22} ry={s*.044} fill="#b4a870"/>
        <ellipse cx={cx} cy={cy+s*.2}  rx={s*.22} ry={s*.044} fill="#a89860"/>
      </g>
      <g transform={`rotate(-18,${cx},${cy})`}>
        <rect x={cx-s*.21} y={cy-s*.33} width={s*.42} height={s*.52} rx={s*.025}
          fill="#d4c888" stroke="#9a8838" strokeWidth={s*.014}/>
        <ellipse cx={cx} cy={cy-s*.33} rx={s*.21} ry={s*.042} fill="#c4b878"/>
        <ellipse cx={cx} cy={cy+s*.19} rx={s*.21} ry={s*.042} fill="#b4a868"/>
      </g>
      <rect x={cx-s*.2} y={cy-s*.34} width={s*.4} height={s*.52} rx={s*.025}
        fill={`url(#${id}p)`} stroke="#8a7828" strokeWidth={s*.017}/>
      <ellipse cx={cx} cy={cy-s*.34} rx={s*.2} ry={s*.04} fill="#e4d8a8"/>
      <ellipse cx={cx} cy={cy+s*.18} rx={s*.2} ry={s*.04} fill="#c8bc88"/>
      {[-s*.18,-s*.1,-s*.02,s*.06,s*.14].map((dy,i)=>(
        <line key={i} x1={cx-s*.14} y1={cy+dy} x2={cx+s*.14} y2={cy+dy}
          stroke={glowing?"#60eedd":"#40aa98"} strokeWidth={s*.011} opacity={.55-i*.06}/>
      ))}
      <circle cx={cx} cy={cy-s*.06} r={s*.052} fill="none"
        stroke={glowing?"#40ffee":"#20ddcc"} strokeWidth={s*.017} opacity={glowing?.88:.65}/>
      <text x={cx} y={cy-s*.02} textAnchor="middle"
        style={{fontSize:s*.1,fontFamily:"serif",fill:glowing?"#60ffee":"#20ddcc",opacity:.8}}>✦</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4-COLUMN TREE LAYOUT
   Each column has: header label → root node at top → angled branches down
   → leaves at staggered depths.

   SVG coordinate space: 1000 wide × 820 tall
   4 columns each 250px wide, columns separated by thin dividers.
   Col centres: 125, 375, 625, 875

   Column lock levels: Col1=Lv1, Col2=Lv10, Col3=Lv30, Col4=Lv50
   ═══════════════════════════════════════════════════════════════════════════ */

// Node radius constants
const R_ROOT = 26;
const R_MID  = 20;
const R_LEAF = 16;

// Column definitions: each branch is { id, x (relative to col centre), y, r, icon, label, accent, desc, prereqs }
// All x/y are absolute SVG coords.

const COL_W   = 250;  // each column width
const COL_CXS = [125, 375, 625, 875]; // column centres

// ── COLUMN 1: Gathering (Lv1) ── accent #e07040 ───────────────────────────
// Root at top centre. Two branches: left (Keen→Stone) and right (Battle→Iron+Warlord)
// Branch L drops at angle to col_cx-55, branch R drops to col_cx+55
// Varied depths: Stone is shallow, Warlord is deepest

const C1x = COL_CXS[0];
const C2x = COL_CXS[1];
const C3x = COL_CXS[2];
const C4x = COL_CXS[3];

// Y positions — each column shares the same Y band so labels line up loosely
const Y_ROOT  = 80;
const Y_MID_L = 220;   // left-branch mid
const Y_MID_R = 240;   // right-branch mid (slightly lower for variety)
const Y_LEAF  = 360;   // first leaf row
const Y_LEAF2 = 480;   // second leaf row (deeper leaves)

const TREE_NODES = [
  // ── COL 1: GATHERING (Lv1) accent:#e07040 ──
  { id:"tl",    col:0, x:C1x,      y:Y_ROOT,  r:R_ROOT, icon:"🥚", label:"Dragon Eggs",    accent:"#e07040", desc:"Begin passively regenerating Dragon Eggs over time.", prereqs:[], unlockLv:1 },
  { id:"tl_t",  col:0, x:C1x-52,  y:Y_MID_L, r:R_MID,  icon:"⛏",  label:"Keen Gatherer",  accent:"#9898b0", desc:"+10% resource gathering rate from all tiles.",          prereqs:["tl"], unlockLv:1 },
  { id:"tl_t1", col:0, x:C1x-68,  y:Y_LEAF,  r:R_LEAF, icon:"🪨",  label:"Stone Mastery",  accent:"#9898b0", desc:"+15% stone & wood production.",                         prereqs:["tl_t"], unlockLv:1 },
  { id:"tl_b",  col:0, x:C1x+52,  y:Y_MID_R, r:R_MID,  icon:"⚔️",  label:"Battle Rite",   accent:"#ee6644", desc:"+3% troop attack for all armies.",                       prereqs:["tl"], unlockLv:1 },
  { id:"tl_b1", col:0, x:C1x+22,  y:Y_LEAF,  r:R_LEAF, icon:"🛡",  label:"Iron Will",     accent:"#cc8844", desc:"+3% troop defence.",                                      prereqs:["tl_b"], unlockLv:1 },
  { id:"tl_b2", col:0, x:C1x+72,  y:Y_LEAF2, r:R_LEAF, icon:"👑",  label:"Warlord's Pact",accent:"#f0c040", desc:"+5% attack & +5% defence.",                              prereqs:["tl_b"], unlockLv:1 },

  // ── COL 2: MARCHING (Lv10) accent:#5588ff ──
  // Root → Far Marcher (left mid), → Arcane Sight (right mid) → 4 leaves fan out from Arcane Sight
  // tr_b4 hangs below tr_b3 (rightmost leaf chain)
  { id:"tr",    col:1, x:C2x,      y:Y_ROOT,  r:R_ROOT, icon:"⚡",  label:"Swift March",    accent:"#5588ff", desc:"+5% march speed for all commanders.",                    prereqs:[], unlockLv:10 },
  { id:"tr_t",  col:1, x:C2x-58,  y:Y_MID_L, r:R_MID,  icon:"🗺",  label:"Far Marcher",    accent:"#6688ee", desc:"+2 maximum march range.",                                prereqs:["tr"], unlockLv:10 },
  { id:"tr_b",  col:1, x:C2x+30,  y:Y_MID_R, r:R_MID,  icon:"🔍",  label:"Arcane Sight",   accent:"#44ccee", desc:"Reveal enemy troop counts when scouting.",               prereqs:["tr"], unlockLv:10 },
  { id:"tr_b1", col:1, x:C2x-30,  y:Y_LEAF,  r:R_LEAF, icon:"👁",  label:"All-Seeing",     accent:"#40ddcc", desc:"Fog of war radius +2 tiles.",                            prereqs:["tr_b"], unlockLv:10 },
  { id:"tr_b2", col:1, x:C2x+10,  y:Y_LEAF,  r:R_LEAF, icon:"🔮",  label:"Omniscience",    accent:"#40aaff", desc:"No fog of war — full map awareness.",                    prereqs:["tr_b"], unlockLv:10 },
  { id:"tr_b3", col:1, x:C2x+52,  y:Y_LEAF,  r:R_LEAF, icon:"⚔️",  label:"Twin Legions",   accent:"#5577ff", desc:"Unlock a 3rd simultaneous march.",                       prereqs:["tr_b"], unlockLv:10 },
  { id:"tr_b4", col:1, x:C2x+90,  y:Y_LEAF,  r:R_LEAF, icon:"🌀",  label:"Void Attunement",accent:"#aa55ff", desc:"Void Tap cooldown reduced by 10%.",                      prereqs:["tr_b"], unlockLv:10 },

  // ── COL 3: DEFENSE (Lv30) accent:#44cc88 ──
  { id:"bl",    col:2, x:C3x,      y:Y_ROOT,  r:R_ROOT, icon:"🛡",  label:"Fortify",        accent:"#44cc88", desc:"+500 HQ siege HP.",                                      prereqs:[], unlockLv:30 },
  { id:"bl_t",  col:2, x:C3x-52,  y:Y_MID_L, r:R_MID,  icon:"🏰",  label:"Ancient Wards",  accent:"#c8b070", desc:"+1,000 HQ siege HP. Walls heal 10% faster.",            prereqs:["bl"], unlockLv:30 },
  { id:"bl_b",  col:2, x:C3x+52,  y:Y_MID_R, r:R_MID,  icon:"⭐",  label:"Tactician",      accent:"#f0c040", desc:"Commanders gain +5% XP from all battles.",               prereqs:["bl"], unlockLv:30 },
  { id:"bl_b1", col:2, x:C3x+20,  y:Y_LEAF,  r:R_LEAF, icon:"⚡",  label:"Siege Master",   accent:"#88cc44", desc:"+10% siege power for all marching armies.",               prereqs:["bl_b"], unlockLv:30 },
  { id:"bl_b2", col:2, x:C3x+72,  y:Y_LEAF2, r:R_LEAF, icon:"📜",  label:"Elder's Rite",   accent:"#c8a040", desc:"All Wizard's Tomes effects increased by 15%.",           prereqs:["bl_b"], unlockLv:30 },

  // ── COL 4: ARCANE (Lv50) accent:#cc44ff ──
  // Root → Abundance (left chain) → Forest (centre) → Egg Vault (right chain)
  { id:"br",    col:3, x:C4x,      y:Y_ROOT,  r:R_ROOT, icon:"🌀",  label:"Void Mastery",   accent:"#cc44ff", desc:"+5,000 Mystic Orb capacity.",                            prereqs:[], unlockLv:50 },
  { id:"br_t",  col:3, x:C4x-70,  y:Y_MID_L, r:R_MID,  icon:"✨",  label:"Abundance Rite", accent:"#d4af37", desc:"+10% all resource production.",                           prereqs:["br"], unlockLv:50 },
  { id:"br_t1", col:3, x:C4x-70,  y:Y_LEAF,  r:R_LEAF, icon:"🌀",  label:"Void Channel",   accent:"#cc44ff", desc:"Void Tap cooldown reduced by additional 10%.",           prereqs:["br_t"], unlockLv:50 },
  { id:"br_m",  col:3, x:C4x,      y:Y_MID_R, r:R_MID,  icon:"🪵",  label:"Forest Lore",    accent:"#a07840", desc:"+15% wood & ore production.",                            prereqs:["br"], unlockLv:50 },
  { id:"faction",col:3,x:C4x,      y:Y_LEAF,  r:R_MID,  icon:"⚔️",  label:"Faction Mastery",accent:"#f0c040", desc:"Your faction's unique passive ability.",                 prereqs:["br_m"], unlockLv:50 },
  { id:"br_b",  col:3, x:C4x+68,  y:Y_MID_L, r:R_MID,  icon:"🥚",  label:"Egg Vault I",    accent:"#e04060", desc:"+5 Dragon Egg capacity.",                                prereqs:["br"], unlockLv:50 },
  { id:"br_b1", col:3, x:C4x+68,  y:Y_LEAF,  r:R_LEAF, icon:"🥚",  label:"Egg Vault II",   accent:"#e04060", desc:"+5 Dragon Egg capacity (total +10).",                    prereqs:["br_b"], unlockLv:50 },
];

const NODE_MAP = Object.fromEntries(TREE_NODES.map(n => [n.id, n]));

// All edges — [parent, child]
const EDGES = [
  ["tl","tl_t"], ["tl","tl_b"],
  ["tl_t","tl_t1"],
  ["tl_b","tl_b1"], ["tl_b","tl_b2"],

  ["tr","tr_t"], ["tr","tr_b"],
  ["tr_b","tr_b1"], ["tr_b","tr_b2"], ["tr_b","tr_b3"], ["tr_b","tr_b4"],

  ["bl","bl_t"], ["bl","bl_b"],
  ["bl_b","bl_b1"], ["bl_b","bl_b2"],

  ["br","br_t"], ["br","br_m"], ["br","br_b"],
  ["br_t","br_t1"],
  ["br_m","faction"],
  ["br_b","br_b1"],
];

// Column metadata
const COL_META = [
  { label:"GATHERING", unlockLv:1,  accent:"#e07040", locked:"✦ LV 1" },
  { label:"MARCHING",  unlockLv:10, accent:"#5588ff", locked:"🔒 LV 10" },
  { label:"DEFENSE",   unlockLv:30, accent:"#44cc88", locked:"🔒 LV 30" },
  { label:"ARCANE",    unlockLv:50, accent:"#cc44ff", locked:"🔒 LV 50" },
];

// SVG dimensions
const SVG_W = 1000;
const SVG_H = 620;

// Power panel: centred in SVG below the col dividers, compact strip at bottom
const PP_Y = 545, PP_H = 70;

function NodeShape({ node, unlocked, active, onClick, colAccent }) {
  const ac = unlocked ? node.accent : colAccent + "55";
  const r  = node.r;
  const isRoot = r === R_ROOT;
  return (
    <g onClick={onClick} style={{cursor:"pointer"}} transform={`translate(${node.x},${node.y})`}>
      {/* tap target — transparent, larger than visual */}
      <circle cx={0} cy={0} r={r+12} fill="transparent"/>
      {/* glow ring when unlocked */}
      {unlocked && <circle cx={0} cy={0} r={r+8} fill={node.accent} opacity=".12"/>}
      {/* active ring */}
      {active && <circle cx={0} cy={0} r={r+5} fill="none" stroke={node.accent} strokeWidth="1.5" opacity=".8"/>}
      {/* outer ring (root only) */}
      {isRoot && <circle cx={0} cy={0} r={r+4} fill="none" stroke={`${colAccent}44`} strokeWidth="1"/>}
      {/* main circle */}
      <circle cx={0} cy={0} r={r}
        fill={unlocked ? "#1a1448" : "#0d0b22"}
        stroke={active ? node.accent : unlocked ? `${node.accent}cc` : `${colAccent}44`}
        strokeWidth={active ? 2 : isRoot ? 2 : 1.5}/>
      {/* inner ring */}
      <circle cx={0} cy={0} r={r*.72} fill="none"
        stroke={unlocked ? `${node.accent}44` : `${colAccent}22`} strokeWidth="1"/>
      {/* icon */}
      <text x={0} y={r*.32} textAnchor="middle" style={{
        fontSize: r * .9, fontFamily:"serif", userSelect:"none",
        opacity: unlocked ? 1 : .4,
        filter: unlocked ? `drop-shadow(0 0 ${r*.18}px ${node.accent})` : "none",
      }}>
        {unlocked ? node.icon : "🔒"}
      </text>
      {/* label below */}
      <text x={0} y={r+13} textAnchor="middle" style={{
        fontSize: 7.5, fontFamily:"'Cinzel',serif",
        fill: active ? "#fff" : unlocked ? `${node.accent}ee` : `${colAccent}55`,
        letterSpacing:".03em",
      }}>
        {node.label.length > 13 ? node.label.slice(0,12)+"…" : node.label}
      </text>
    </g>
  );
}

export default memo(function WizardsTomes({
  open, onClose, facKey,
  tomesLevel = 0, setTomesLevel,
  powerPool = 0, setPowerPool,
  powerPerHr = 0,
  tomesUnspentPoints = 0, setTomesUnspentPoints,
}) {
  const [tab,      setTab]      = useState("knowledge");
  const [unlocked, setUnlocked] = useState(new Set());
  const [selected, setSelected] = useState(null);

  const facDef = useMemo(() => PLAYABLE_FACTIONS.find(f => f.key === facKey), [facKey]);

  const atMaxLevel  = tomesLevel >= TOMES_MAX_LEVEL;
  const costToNext  = atMaxLevel ? Infinity : (TOMES_LEVEL_COST[tomesLevel] ?? Infinity);
  const poolDisplay = Math.floor(powerPool);
  const progressPct = atMaxLevel ? 100 : Math.min(100, (powerPool / costToNext) * 100);

  const levelsAvailable = useCallback(() => {
    if (atMaxLevel) return 0;
    let pool = powerPool, lvl = tomesLevel, count = 0;
    while (lvl < TOMES_MAX_LEVEL) {
      const cost = TOMES_LEVEL_COST[lvl];
      if (cost == null || pool < cost) break;
      pool -= cost; lvl++; count++;
    }
    return count;
  }, [powerPool, tomesLevel, atMaxLevel]);

  const canLevelUp    = !atMaxLevel && powerPool >= costToNext;
  const levelsBuyable = levelsAvailable();

  const doLevelUp = useCallback(() => {
    if (!canLevelUp) return;
    let pool = powerPool, lvl = tomesLevel, gained = 0;
    while (lvl < TOMES_MAX_LEVEL) {
      const cost = TOMES_LEVEL_COST[lvl];
      if (cost == null || pool < cost) break;
      pool -= cost; lvl++; gained++;
    }
    setPowerPool(pool);
    setTomesLevel(lvl);
    setTomesUnspentPoints(prev => prev + gained);
  }, [canLevelUp, powerPool, tomesLevel, setPowerPool, setTomesLevel, setTomesUnspentPoints]);

  const getNode = id => {
    const n = NODE_MAP[id];
    if (!n) return null;
    if (id === "faction") return {
      ...n,
      icon:  facDef?.s  ?? "⚔️",
      label: `${facDef?.n ?? "Faction"} Mastery`,
      desc:  `${facDef?.n ?? "Your faction"}'s unique passive ability.`,
    };
    return n;
  };

  // Whether a column is gated by tomes level
  const colOpen = (col) => tomesLevel >= COL_META[col].unlockLv;

  // canUnlock: node prereqs met, have points, col open, not already unlocked
  const canUnlock = node => {
    if (unlocked.has(node.id)) return false;
    if (tomesUnspentPoints <= 0) return false;
    if (!colOpen(node.col)) return false;
    return node.prereqs.every(p => unlocked.has(p));
  };

  const doUnlock = node => {
    if (!canUnlock(node)) return;
    setUnlocked(prev => new Set([...prev, node.id]));
    setTomesUnspentPoints(prev => Math.max(0, prev - 1));
    setSelected(node.id);
  };

  const selNode = selected ? getNode(selected) : null;
  if (!open) return null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500, background:"#080818",
      display:"flex", flexDirection:"column", fontFamily:"'Cinzel',serif",
    }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"8px 14px", flexShrink:0,
        background:"linear-gradient(180deg,#0c0c22,#080816)",
        borderBottom:"1px solid rgba(140,100,255,.25)",
      }}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <ScrollStackIcon size={28} glowing/>
          <div>
            <div style={{
              fontSize:11, fontWeight:700, letterSpacing:".1em",
              background:"linear-gradient(135deg,#d0c0ff,#9966ff,#d0c0ff)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>A WIZARD'S ANCIENT KNOWLEDGE</div>
            <div style={{fontSize:7, color:"#4a3a70", letterSpacing:".12em"}}>
              WIZARD'S TOMES · {unlocked.size} / {TREE_NODES.length} UNLOCKED
              {tomesUnspentPoints > 0 && (
                <span style={{color:"#ff8844", marginLeft:6}}>
                  · {tomesUnspentPoints} PT{tomesUnspentPoints !== 1 ? "S" : ""} TO SPEND
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background:"none", border:"1px solid #331166", color:"#9966ff",
          fontSize:16, cursor:"pointer", width:28, height:28, borderRadius:4,
          display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif",
        }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex", borderBottom:"1px solid rgba(120,80,255,.2)", background:"#0c0c1e", flexShrink:0}}>
        {[{id:"knowledge",label:"📖  KNOWLEDGE"},{id:"lore",label:"🌟  LORE"}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:"7px 0", background:tab===t.id?"rgba(200,160,64,.07)":"none",
            border:"none", borderBottom:tab===t.id?"2px solid #9966ff":"2px solid transparent",
            color:tab===t.id?"#c0a8ff":"#2a1866",
            fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:".1em", cursor:"pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {/* KNOWLEDGE TAB */}
      {tab === "knowledge" && (
        <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>

          {/* Detail panel */}
          <div style={{
            flexShrink:0, minHeight:52, padding:"5px 12px",
            background:"rgba(6,4,20,.98)", borderBottom:"1px solid rgba(120,80,255,.2)",
            display:"flex", alignItems:"center", gap:10,
          }}>
            {selNode ? (
              <>
                <div style={{
                  width:34, height:34, flexShrink:0, borderRadius:"50%",
                  background:`${selNode.accent}18`, border:`1.5px solid ${selNode.accent}44`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
                }}>
                  {unlocked.has(selNode.id) ? selNode.icon : "🔒"}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:10, color:"#e8e0ff", marginBottom:1}}>{selNode.label}</div>
                  <div style={{
                    fontSize:8, color:"#7060aa", fontFamily:"'Crimson Pro',serif",
                    fontStyle:"italic", lineHeight:1.4,
                  }}>{selNode.desc}</div>
                </div>
                {unlocked.has(selNode.id) ? (
                  <div style={{
                    fontSize:8, color:"#c0a8ff", padding:"3px 8px", flexShrink:0,
                    border:"1px solid rgba(150,100,255,.4)", borderRadius:3,
                  }}>✓ ACTIVE</div>
                ) : (
                  <button
                    onClick={() => doUnlock(selNode)}
                    disabled={!canUnlock(selNode)}
                    style={{
                      padding:"6px 12px", flexShrink:0,
                      background: canUnlock(selNode) ? "rgba(120,60,255,.3)" : "rgba(255,255,255,.02)",
                      border:`1.5px solid ${canUnlock(selNode) ? "#9966ff" : "#1a1440"}`,
                      color: canUnlock(selNode) ? "#e8e0ff" : "#2a1866",
                      fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:".07em",
                      borderRadius:4, cursor: canUnlock(selNode) ? "pointer" : "not-allowed",
                      WebkitTapHighlightColor:"transparent",
                    }}>
                    {canUnlock(selNode)
                      ? "✦ UNLOCK (1 pt)"
                      : !colOpen(selNode.col)
                        ? `🔒 NEED LV ${COL_META[selNode.col].unlockLv}`
                        : tomesUnspentPoints === 0
                          ? "NO POINTS"
                          : "LOCKED"}
                  </button>
                )}
              </>
            ) : (
              <div style={{fontSize:9, color:"#2a1a40", fontFamily:"'Crimson Pro',serif", fontStyle:"italic"}}>
                Tap a node to inspect it.
              </div>
            )}
          </div>

          {/* SVG Tree — 4 columns */}
          <div style={{flex:1, overflow:"hidden", display:"flex", position:"relative"}}>
            {/* HTML Level Up button overlaid on top of SVG — reliable click target */}
            {canLevelUp && (
              <button
                onClick={doLevelUp}
                style={{
                  position:"absolute", bottom:8, right:8,
                  zIndex:10,
                  padding:"10px 22px",
                  background:"rgba(110,40,220,.75)",
                  border:"1.5px solid #aa66ff",
                  borderRadius:6,
                  color:"#f0e8ff",
                  fontFamily:"'Cinzel',serif",
                  fontSize:12,
                  fontWeight:700,
                  letterSpacing:".06em",
                  cursor:"pointer",
                  boxShadow:"0 0 16px rgba(150,80,255,.5)",
                  WebkitTapHighlightColor:"transparent",
                  touchAction:"manipulation",
                  minWidth:160,
                }}
              >
                {levelsBuyable > 1
                  ? `▲ LV ${tomesLevel} → ${tomesLevel + levelsBuyable}`
                  : "▲ LEVEL UP"}
                {levelsBuyable > 1 && (
                  <div style={{fontSize:9, color:"#cc99ff", marginTop:2}}>
                    Gain +{levelsBuyable} upgrade points
                  </div>
                )}
              </button>
            )}
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{width:"100%", height:"100%", display:"block"}}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="pp_bar_fill" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6622dd"/>
                  <stop offset="100%" stopColor="#cc88ff"/>
                </linearGradient>
              </defs>

              {/* Column dividers */}
              {[250,500,750].map(x => (
                <line key={x} x1={x} y1={20} x2={x} y2={SVG_H-10}
                  stroke="rgba(120,80,255,.12)" strokeWidth="1"/>
              ))}

              {/* Column headers: label + lock badge */}
              {COL_META.map((cm, ci) => {
                const cx = COL_CXS[ci];
                const open = colOpen(ci);
                return (
                  <g key={ci}>
                    <text x={cx} y={22} textAnchor="middle" style={{
                      fontSize:8, fontFamily:"'Cinzel',serif",
                      fill: open ? cm.accent : `${cm.accent}44`,
                      letterSpacing:".16em",
                    }}>{cm.label}</text>
                    {/* lock/unlock badge */}
                    <rect x={cx-28} y={27} width={56} height={14} rx={3}
                      fill={open ? `${cm.accent}22` : "rgba(255,255,255,.03)"}
                      stroke={open ? `${cm.accent}66` : "rgba(255,255,255,.06)"}/>
                    <text x={cx} y={37} textAnchor="middle" style={{
                      fontSize:7, fontFamily:"'Cinzel',serif",
                      fill: open ? cm.accent : `${cm.accent}44`,
                    }}>{open ? "✦ OPEN" : cm.locked}</text>
                  </g>
                );
              })}

              {/* Edges */}
              {EDGES.map(([aid, bid]) => {
                const A = NODE_MAP[aid], B = getNode ? NODE_MAP[bid] : null;
                const Bn = NODE_MAP[bid];
                if (!A || !Bn) return null;
                const lit  = unlocked.has(aid) && unlocked.has(bid);
                const part = unlocked.has(aid) && !unlocked.has(bid);
                const col  = A.col;
                const ac   = COL_META[col]?.accent ?? "#9966ff";
                return (
                  <line key={`${aid}-${bid}`}
                    x1={A.x} y1={A.y} x2={Bn.x} y2={Bn.y}
                    stroke={lit ? `${ac}cc` : part ? `${ac}55` : `${ac}22`}
                    strokeWidth={lit ? 2 : 1.5}
                    strokeDasharray={part ? "5 3" : "none"}
                    strokeLinecap="round"/>
                );
              })}

              {/* Nodes */}
              {TREE_NODES.map(node => {
                const n     = getNode(node.id);
                const ac    = COL_META[node.col]?.accent ?? "#9966ff";
                const colOk = colOpen(node.col);
                return (
                  <NodeShape
                    key={n.id}
                    node={n}
                    unlocked={unlocked.has(n.id)}
                    active={selected === n.id}
                    colAccent={colOk ? ac : `${ac}44`}
                    onClick={() => setSelected(n.id)}
                  />
                );
              })}

              {/* ── Power strip at bottom of SVG ── */}
              {/* background */}
              <rect x={0} y={PP_Y-8} width={SVG_W} height={PP_H+16}
                fill="rgba(8,6,24,.92)" stroke="rgba(120,80,255,.18)" strokeWidth="1"/>

              {/* Tomes level */}
              <text x={46} y={PP_Y+10} textAnchor="middle" style={{
                fontSize:22, fontFamily:"'Cinzel Decorative',serif", fill:"#d0c0ff", fontWeight:700,
              }}>{tomesLevel}</text>
              <text x={46} y={PP_Y+22} textAnchor="middle" style={{
                fontSize:6.5, fontFamily:"'Cinzel',serif", fill:"#6650aa", letterSpacing:".1em",
              }}>TOMES LV</text>
              {tomesUnspentPoints > 0 && (
                <>
                  <circle cx={68} cy={PP_Y-4} r={10} fill="#cc4400" stroke="#ff6622" strokeWidth="1.5"/>
                  <text x={68} y={PP_Y} textAnchor="middle" style={{
                    fontSize:9, fontFamily:"'Cinzel',serif", fill:"#fff", fontWeight:700,
                  }}>{tomesUnspentPoints}</text>
                </>
              )}

              {/* Divider */}
              <line x1={90} y1={PP_Y-4} x2={90} y2={PP_Y+PP_H-4} stroke="rgba(120,80,255,.2)" strokeWidth="1"/>

              {atMaxLevel ? (
                <text x={SVG_W/2} y={PP_Y+20} textAnchor="middle" style={{
                  fontSize:13, fontFamily:"'Cinzel',serif", fill:"#d0c0ff", fontWeight:700,
                }}>✦ MAX LEVEL ✦</text>
              ) : (
                <>
                  {/* /hr */}
                  <text x={108} y={PP_Y+8} style={{
                    fontSize:9.5, fontFamily:"'Cinzel',serif",
                    fill: powerPerHr > 0 ? "#9977cc" : "#3a2a50",
                  }}>
                    {powerPerHr > 0 ? `+${powerPerHr.toLocaleString()}/hr` : "no power — capture tiles"}
                  </text>

                  {/* progress bar bg */}
                  <rect x={108} y={PP_Y+13} width={560} height={9} rx={4}
                    fill="rgba(80,40,180,.25)" stroke="rgba(120,80,255,.3)" strokeWidth="1"/>
                  {/* progress bar fill */}
                  {progressPct > 0 && (
                    <rect x={108} y={PP_Y+13} width={Math.min(560, 560*progressPct/100)} height={9} rx={4}
                      fill={canLevelUp ? "url(#pp_bar_fill)" : "rgba(100,60,220,.55)"}
                      style={{filter: canLevelUp ? "drop-shadow(0 0 4px #aa55ff)" : "none"}}/>
                  )}

                  {/* pool / cost */}
                  <text x={108} y={PP_Y+36} style={{
                    fontSize:9.5, fontFamily:"'Cinzel',serif",
                    fill: canLevelUp ? "#c8b0ff" : "#5544aa",
                  }}>
                    {poolDisplay.toLocaleString()}
                    <tspan fill="#2a1a50" dx="4">/</tspan>
                    <tspan dx="4">{costToNext.toLocaleString()}</tspan>
                    {!canLevelUp && (
                      <tspan fill="#3a2860" fontSize="8.5" dx="8">
                        ({Math.max(0, costToNext-poolDisplay).toLocaleString()} more)
                      </tspan>
                    )}
                  </text>

                  {/* Level up button — only shown when ready */}
                  {canLevelUp && (
                    <g style={{pointerEvents:"none"}}>
                      <rect x={682} y={PP_Y+2} width={300} height={44} rx={6}
                        fill="rgba(110,40,220,.55)" stroke="#aa66ff" strokeWidth="1.5"/>
                      <rect x={682} y={PP_Y+2} width={300} height={44} rx={6}
                        fill="none" stroke="#cc99ff" strokeWidth=".5" opacity=".5"/>
                      <text x={832} y={PP_Y+20} textAnchor="middle" style={{
                        fontSize:11, fontFamily:"'Cinzel',serif", fill:"#f0e8ff",
                        fontWeight:700, letterSpacing:".06em",
                      }}>
                        {levelsBuyable > 1
                          ? `▲ LV ${tomesLevel} → ${tomesLevel+levelsBuyable}`
                          : "▲ LEVEL UP"}
                      </text>
                      {levelsBuyable > 1 && (
                        <text x={832} y={PP_Y+36} textAnchor="middle" style={{
                          fontSize:9, fontFamily:"'Cinzel',serif", fill:"#9966ff",
                        }}>
                          Gain +{levelsBuyable} upgrade points
                        </text>
                      )}
                    </g>
                  )}
                </>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* LORE TAB */}
      {tab === "lore" && (
        <div style={{flex:1, overflowY:"auto", padding:"16px", background:"linear-gradient(180deg,#0c0c20,#060610)"}}>
          <div style={{textAlign:"center", marginBottom:16}}>
            <div style={{fontSize:28, marginBottom:6}}>{facDef?.s ?? "⚑"}</div>
            <div style={{fontSize:12, color:"#e8e0ff", letterSpacing:".12em", marginBottom:4}}>
              {facDef?.n?.toUpperCase() ?? "YOUR FACTION"}
            </div>
            <div style={{fontSize:9, color:"#6655aa", fontFamily:"'Crimson Pro',serif", fontStyle:"italic", lineHeight:1.6}}>
              {facDef?.desc ?? "The origins of this faction are shrouded in legend."}
            </div>
          </div>

          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"8px 12px", marginBottom:14,
            background:"rgba(100,60,255,.08)", border:"1px solid rgba(120,80,255,.25)", borderRadius:5,
          }}>
            <div>
              <div style={{fontSize:8, color:"#4a3a70", letterSpacing:".1em"}}>TOMES LEVEL</div>
              {!atMaxLevel && (
                <div style={{fontSize:8, color:"#5540aa", marginTop:2}}>
                  {poolDisplay.toLocaleString()} / {costToNext.toLocaleString()} power
                  {powerPerHr > 0 && <span style={{color:"#6655aa"}}> · +{powerPerHr.toLocaleString()}/hr</span>}
                </div>
              )}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:20, color:"#d0c0ff", fontFamily:"'Cinzel Decorative',serif"}}>{tomesLevel}</div>
              {tomesUnspentPoints > 0 && (
                <div style={{fontSize:8, color:"#ff8844"}}>{tomesUnspentPoints} pts to spend</div>
              )}
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:8, color:"#5540aa", marginBottom:4}}>
              <span>MASTERY PROGRESS</span>
              <span style={{color:"#c0a8ff"}}>{unlocked.size} / {TREE_NODES.length}</span>
            </div>
            <div style={{height:5, background:"rgba(255,255,255,.04)", borderRadius:2, overflow:"hidden"}}>
              <div style={{height:"100%", borderRadius:2,
                width:`${(unlocked.size/TREE_NODES.length)*100}%`,
                background:"linear-gradient(90deg,#330088,#9966ff)", transition:"width .4s ease"}}/>
            </div>
          </div>

          <div style={{fontSize:8, color:"#5540aa", letterSpacing:".12em", marginBottom:8}}>ACTIVE TOMES</div>
          {unlocked.size === 0 ? (
            <div style={{fontSize:9, color:"#1e1408", fontFamily:"'Crimson Pro',serif", fontStyle:"italic"}}>
              No tomes unlocked yet. Study the Knowledge tree.
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:5}}>
              {TREE_NODES.filter(n => unlocked.has(n.id)).map(n => {
                const d = getNode(n.id);
                return (
                  <div key={n.id} style={{
                    display:"flex", alignItems:"center", gap:8, padding:"5px 9px",
                    background:`${n.accent}0c`, border:`1px solid ${n.accent}20`, borderRadius:4,
                  }}>
                    <span style={{fontSize:14, flexShrink:0}}>{d.icon}</span>
                    <div>
                      <div style={{fontSize:9, color:n.accent}}>{d.label}</div>
                      <div style={{fontSize:8, color:"#4a3828", fontFamily:"'Crimson Pro',serif", fontStyle:"italic"}}>{n.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
