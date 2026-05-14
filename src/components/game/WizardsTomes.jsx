import { useState, useMemo, memo, useCallback } from "react";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { TOMES_LEVEL_COST, TOMES_MAX_LEVEL } from "../../../shared/constants/map.js";

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD'S TOMES — A Wizard's Ancient Knowledge
   Layout: nodes radiate from centre orb. Power UI as foreignObject below orb.
   ViewBox zoomed in to make tree fill the screen.
   ═══════════════════════════════════════════════════════════════════════════ */

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

function CircleNode({ node, unlocked, active, onClick, r = 22 }) {
  const ac = node.accent ?? "#4488cc";
  return (
    <g onClick={onClick} style={{cursor:"pointer"}}>
      {unlocked && <circle cx={0} cy={0} r={r*1.6}  fill={ac} opacity=".14"/>}
      {active   && <circle cx={0} cy={0} r={r*1.38} fill="none" stroke={ac} strokeWidth="1.5" opacity=".7"/>}
      <circle cx={0} cy={0} r={r}
        fill={unlocked?"#1a1448":"#0f0c28"}
        stroke={active?ac:unlocked?`${ac}dd`:"#3d2d80"}
        strokeWidth={active?2:1.5}/>
      <circle cx={0} cy={0} r={r*.76} fill="none"
        stroke={unlocked?`${ac}55`:"#2a1f60"} strokeWidth="1"/>
      <text x={0} y={r*.32} textAnchor="middle" style={{
        fontSize:r*.88, fontFamily:"serif", userSelect:"none",
        opacity:unlocked?1:.55,
        filter:unlocked?`drop-shadow(0 0 ${r*.2}px ${ac})`:"none",
      }}>
        {unlocked?node.icon:"🔒"}
      </text>
    </g>
  );
}

/* ── Node positions: centred at CX=510, CY=290. Nodes fan outward.
      The foreignObject power panel sits at CY+55 to CY+175 (below orb).
      ViewBox is tightened from 45,30 to keep everything visible. ── */
const CX = 510, CY = 290;

const NODES = [
  // TL quadrant
  {id:"tl",     x:330, y:178, r:22, icon:"🥚", label:"Dragon Eggs",    accent:"#e04060", desc:"Begin passively regenerating Dragon Eggs over time.",       prereqs:[]},
  {id:"tl_t",   x:195, y: 92, r:19, icon:"⛏",  label:"Keen Gatherer",  accent:"#9898b0", desc:"+10% resource gathering rate from all tiles.",              prereqs:["tl"]},
  {id:"tl_b",   x:182, y:222, r:19, icon:"⚔️",  label:"Battle Rite",   accent:"#ee6644", desc:"+3% troop attack for all armies.",                          prereqs:["tl"]},
  {id:"tl_t1",  x: 82, y: 46, r:17, icon:"🪨",  label:"Stone Mastery",  accent:"#9898b0", desc:"+15% stone & wood production.",                            prereqs:["tl_t"]},
  {id:"tl_b1",  x: 78, y:194, r:17, icon:"🛡",  label:"Iron Will",     accent:"#cc8844", desc:"+3% troop defence.",                                        prereqs:["tl_b"]},
  {id:"tl_b2",  x: 72, y:292, r:17, icon:"👑",  label:"Warlord's Pact",accent:"#f0c040", desc:"+5% attack & +5% defence.",                                 prereqs:["tl_b"]},
  // TR quadrant
  {id:"tr",     x:692, y:140, r:22, icon:"⚡",  label:"Swift March",    accent:"#88aaff", desc:"+5% march speed for all commanders.",                       prereqs:[]},
  {id:"tr_t",   x:828, y: 52, r:19, icon:"🗺",  label:"Far Marcher",    accent:"#6688ee", desc:"+2 maximum march range.",                                   prereqs:["tr"]},
  {id:"tr_b",   x:848, y:175, r:19, icon:"🔍",  label:"Arcane Sight",   accent:"#44ccee", desc:"Reveal enemy troop counts when scouting.",                 prereqs:["tr"]},
  {id:"tr_b1",  x:938, y: 82, r:17, icon:"👁",  label:"All-Seeing",     accent:"#40ddcc", desc:"Fog of war radius +2 tiles.",                              prereqs:["tr_b"]},
  {id:"tr_b2",  x:952, y:165, r:17, icon:"🔮",  label:"Omniscience",    accent:"#40aaff", desc:"No fog of war — full map awareness.",                      prereqs:["tr_b"]},
  {id:"tr_b3",  x:942, y:248, r:17, icon:"⚔️",  label:"Twin Legions",   accent:"#5577ff", desc:"Unlock a 3rd simultaneous march.",                         prereqs:["tr_b"]},
  {id:"tr_b4",  x:915, y:322, r:17, icon:"🌀",  label:"Void Attunement",accent:"#aa55ff", desc:"Void Tap cooldown reduced by 10%.",                        prereqs:["tr_b"]},
  // BL quadrant
  {id:"bl",     x:330, y:420, r:22, icon:"🛡",  label:"Fortify",        accent:"#88cc88", desc:"+500 HQ siege HP.",                                        prereqs:[]},
  {id:"bl_t",   x:190, y:350, r:19, icon:"🏰",  label:"Ancient Wards",  accent:"#c8b070", desc:"+1,000 HQ siege HP. Walls heal 10% faster.",              prereqs:["bl"]},
  {id:"bl_b",   x:178, y:492, r:19, icon:"⭐",  label:"Tactician",      accent:"#f0c040", desc:"Commanders gain +5% XP from all battles.",                 prereqs:["bl"]},
  {id:"bl_b1",  x: 75, y:454, r:17, icon:"⚡",  label:"Siege Master",   accent:"#88cc44", desc:"+10% siege power for all marching armies.",                prereqs:["bl_b"]},
  {id:"bl_b2",  x: 70, y:540, r:17, icon:"📜",  label:"Elder's Rite",   accent:"#c8a040", desc:"All Wizard's Tomes effects increased by 15%.",             prereqs:["bl_b"]},
  // BR quadrant
  {id:"br",     x:672, y:450, r:22, icon:"🌀",  label:"Void Mastery",   accent:"#cc44ff", desc:"+5,000 Mystic Orb capacity.",                              prereqs:[]},
  {id:"br_t",   x:800, y:375, r:19, icon:"✨",  label:"Abundance Rite", accent:"#d4af37", desc:"+10% all resource production.",                            prereqs:["br"]},
  {id:"br_m",   x:818, y:470, r:19, icon:"🪵",  label:"Forest Lore",    accent:"#a07840", desc:"+15% wood & ore production.",                              prereqs:["br"]},
  {id:"br_b",   x:792, y:554, r:19, icon:"🥚",  label:"Egg Vault I",    accent:"#e04060", desc:"+5 Dragon Egg capacity.",                                  prereqs:["br"]},
  {id:"br_t1",  x:935, y:350, r:17, icon:"🌀",  label:"Void Channel",   accent:"#cc44ff", desc:"Void Tap cooldown reduced by additional 10%.",             prereqs:["br_t"]},
  {id:"br_b1",  x:925, y:554, r:17, icon:"🥚",  label:"Egg Vault II",   accent:"#e04060", desc:"+5 Dragon Egg capacity (total +10).",                      prereqs:["br_b"]},
  // Faction
  {id:"faction",x:958, y:470, r:19, icon:"⚔️",  label:"Faction Mastery",accent:"#f0c040", desc:"Your faction's unique passive ability.",                   prereqs:["br_m"]},
];
const NODE_MAP = Object.fromEntries(NODES.map(n=>[n.id,n]));

const LINES = [
  ["tl","tl_t"],["tl","tl_b"],["tl_t","tl_t1"],["tl_b","tl_b1"],["tl_b","tl_b2"],
  ["tr","tr_t"],["tr","tr_b"],["tr_b","tr_b1"],["tr_b","tr_b2"],["tr_b","tr_b3"],["tr_b","tr_b4"],
  ["bl","bl_t"],["bl","bl_b"],["bl_b","bl_b1"],["bl_b","bl_b2"],
  ["br","br_t"],["br","br_m"],["br","br_b"],["br_t","br_t1"],["br_b","br_b1"],["br_m","faction"],
];

// The foreignObject power panel lives in SVG space below the orb.
// It spans from (CX-130, CY+48) with width 260, height 130.
const FO_X = CX - 130, FO_Y = CY + 48, FO_W = 260, FO_H = 130;

export default memo(function WizardsTomes({ open, onClose, facKey, tomesLevel = 0, setTomesLevel, powerPool = 0, setPowerPool, powerPerHr = 0, tomesUnspentPoints = 0, setTomesUnspentPoints }) {
  const [tab,      setTab]      = useState("knowledge");
  const [unlocked, setUnlocked] = useState(new Set());
  const [selected, setSelected] = useState(null);

  const facDef = useMemo(()=>PLAYABLE_FACTIONS.find(f=>f.key===facKey),[facKey]);

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

  const canLevelUp   = !atMaxLevel && powerPool >= costToNext;
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
    if (id==="faction") return {...n, icon:facDef?.s??"⚔️", label:`${facDef?.n??"Faction"} Mastery`,
      desc:`${facDef?.n??"Your faction"}'s unique passive ability.`};
    return n;
  };

  const canUnlock = node => !unlocked.has(node.id) && node.prereqs.every(p=>unlocked.has(p)) && tomesUnspentPoints > 0;
  const doUnlock  = node => {
    if (!canUnlock(node)) return;
    setUnlocked(prev=>new Set([...prev,node.id]));
    setTomesUnspentPoints(prev => Math.max(0, prev - 1));
    setSelected(node.id);
  };

  const selNode = selected ? getNode(selected) : null;
  if (!open) return null;

  // ViewBox: tightened to zoom tree in. Node extremes: x≈55–968, y≈30–580.
  // We want some breathing room + room for the power panel below orb (CY+48 to CY+178 = 290+178=468).
  // So viewBox y-bottom needs to reach ~590. Use: "40 22 940 590"
  const VB = "40 22 940 590";

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"#080818",
      display:"flex",flexDirection:"column",fontFamily:"'Cinzel',serif"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 14px",flexShrink:0,
        background:"linear-gradient(180deg,#0c0c22,#080816)",
        borderBottom:"1px solid rgba(140,100,255,.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <ScrollStackIcon size={28} glowing/>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",
              background:"linear-gradient(135deg,#d0c0ff,#9966ff,#d0c0ff)",
              backgroundSize:"200% auto",WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent"}}>
              A WIZARD'S ANCIENT KNOWLEDGE
            </div>
            <div style={{fontSize:7,color:"#4a3a70",letterSpacing:".12em"}}>
              WIZARD'S TOMES · {unlocked.size} / {NODES.length} UNLOCKED
              {tomesUnspentPoints > 0 && (
                <span style={{color:"#ff8844",marginLeft:6}}>· {tomesUnspentPoints} PT{tomesUnspentPoints!==1?"S":""} TO SPEND</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"1px solid #331166",
          color:"#9966ff",fontSize:16,cursor:"pointer",width:28,height:28,borderRadius:4,
          display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(120,80,255,.2)",
        background:"#0c0c1e",flexShrink:0}}>
        {[{id:"knowledge",label:"📖  KNOWLEDGE"},{id:"lore",label:"🌟  LORE"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"7px 0",
            background:tab===t.id?"rgba(200,160,64,.07)":"none",border:"none",
            borderBottom:tab===t.id?"2px solid #9966ff":"2px solid transparent",
            color:tab===t.id?"#c0a8ff":"#2a1866",
            fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:".1em",cursor:"pointer"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* KNOWLEDGE TAB */}
      {tab==="knowledge" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Node detail panel */}
          <div style={{flexShrink:0,minHeight:50,padding:"5px 12px",
            background:"rgba(6,4,20,.98)",borderBottom:"1px solid rgba(120,80,255,.2)",
            display:"flex",alignItems:"center",gap:10}}>
            {selNode ? (
              <>
                <div style={{width:34,height:34,flexShrink:0,borderRadius:"50%",
                  background:`${selNode.accent}18`,border:`1.5px solid ${selNode.accent}44`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                  {unlocked.has(selNode.id)?selNode.icon:"🔒"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:"#e8e0ff",marginBottom:1}}>{selNode.label}</div>
                  <div style={{fontSize:8,color:"#7060aa",fontFamily:"'Crimson Pro',serif",
                    fontStyle:"italic",lineHeight:1.4}}>{selNode.desc}</div>
                </div>
                {unlocked.has(selNode.id) ? (
                  <div style={{fontSize:8,color:"#c0a8ff",padding:"3px 8px",flexShrink:0,
                    border:"1px solid rgba(150,100,255,.4)",borderRadius:3}}>✓ ACTIVE</div>
                ) : (
                  <button onClick={()=>doUnlock(selNode)} disabled={!canUnlock(selNode)} style={{
                    padding:"5px 10px",flexShrink:0,
                    background:canUnlock(selNode)?"rgba(120,60,255,.25)":"rgba(255,255,255,.02)",
                    border:`1px solid ${canUnlock(selNode)?"#9966ff":"#1a1440"}`,
                    color:canUnlock(selNode)?"#e8e0ff":"#2a1866",
                    fontFamily:"'Cinzel',serif",fontSize:8,letterSpacing:".07em",
                    borderRadius:3,cursor:canUnlock(selNode)?"pointer":"not-allowed"}}>
                    {canUnlock(selNode) ? "✦ UNLOCK (1 pt)"
                      : !unlocked.has(selNode.id) && selNode.prereqs.every(p=>unlocked.has(p)) && tomesUnspentPoints===0
                      ? "NO POINTS" : "LOCKED"}
                  </button>
                )}
              </>
            ) : (
              <div style={{fontSize:9,color:"#2a1a40",fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>
                Tap a node to inspect it.
              </div>
            )}
          </div>

          {/* SVG — fills remaining space, tree + power panel all in one coordinate space */}
          <div style={{flex:1,overflow:"hidden",display:"flex"}}>
            <svg viewBox={VB}
              style={{width:"100%",height:"100%",display:"block"}}
              preserveAspectRatio="xMidYMid meet">

              {/* Ring guides */}
              <ellipse cx={CX} cy={CY} rx={185} ry={160}
                fill="none" stroke="rgba(140,100,255,.2)" strokeWidth="1"/>
              <ellipse cx={CX} cy={CY} rx={405} ry={280}
                fill="none" stroke="rgba(140,100,255,.1)" strokeWidth="1"/>

              {/* Connection lines */}
              {LINES.map(([aid,bid])=>{
                const A=NODE_MAP[aid], B=NODE_MAP[bid];
                if(!A||!B) return null;
                const lit  = unlocked.has(aid)&&unlocked.has(bid);
                const part = unlocked.has(aid)&&!unlocked.has(bid);
                return (
                  <line key={`${aid}-${bid}`}
                    x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                    stroke={lit?"#9977ffaa":part?"#4433aa":"#2a1f60"}
                    strokeWidth={lit?2:1.5}
                    strokeDasharray={part?"4 3":"none"}/>
                );
              })}

              {/* ── Centre orb ── */}
              {/* Outer glow */}
              <circle cx={CX} cy={CY} r={52} fill="#9966ff" opacity=".06"/>
              <circle cx={CX} cy={CY} r={44} fill="#080820" stroke="rgba(140,100,255,.6)" strokeWidth="2"/>
              <circle cx={CX} cy={CY} r={38} fill="none"    stroke="rgba(140,100,255,.2)" strokeWidth="1"/>
              <circle cx={CX} cy={CY} r={30} fill="#14103a"/>
              <circle cx={CX} cy={CY} r={20} fill="#1e1850" opacity=".8"/>
              {/* Orb text */}
              <text x={CX} y={CY-10} textAnchor="middle"
                style={{fontSize:8,fontFamily:"'Cinzel',serif",fill:"#b0a0ee",letterSpacing:".1em"}}>TOMES</text>
              <text x={CX} y={CY+1} textAnchor="middle"
                style={{fontSize:7,fontFamily:"'Cinzel',serif",fill:"#9080cc",letterSpacing:".06em"}}>LEVEL</text>
              <text x={CX} y={CY+26} textAnchor="middle"
                style={{fontSize:26,fontFamily:"'Cinzel Decorative',serif",fill:"#d0c0ff",fontWeight:700}}>
                {tomesLevel}
              </text>

              {/* Unspent points badge on orb */}
              {tomesUnspentPoints > 0 && (
                <g>
                  <circle cx={CX+38} cy={CY-38} r={13} fill="#cc4400" stroke="#ff6622" strokeWidth="1.5"/>
                  <text x={CX+38} y={CY-33} textAnchor="middle"
                    style={{fontSize:11,fontFamily:"'Cinzel',serif",fill:"#fff",fontWeight:700}}>
                    {tomesUnspentPoints}
                  </text>
                </g>
              )}

              {/* ── Power panel as foreignObject below orb ── */}
              <foreignObject x={FO_X} y={FO_Y} width={FO_W} height={FO_H}>
                <div xmlns="http://www.w3.org/1999/xhtml"
                  style={{width:"100%",height:"100%",boxSizing:"border-box",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:0,
                    padding:"0 4px"}}>

                  {atMaxLevel ? (
                    <div style={{fontSize:13,color:"#d0c0ff",fontFamily:"'Cinzel',serif",
                      fontWeight:700,letterSpacing:".1em",marginTop:8}}>✦ MAX LEVEL ✦</div>
                  ) : (<>
                    {/* Power rate */}
                    <div style={{fontSize:10,color:powerPerHr>0?"#9977cc":"#3a2a50",
                      fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:5}}>
                      {powerPerHr>0?`+${powerPerHr.toLocaleString()}/hr`:"no power — capture tiles"}
                    </div>

                    {/* Progress bar */}
                    <div style={{width:"100%",height:8,borderRadius:4,
                      background:"rgba(80,40,180,.25)",border:"1px solid rgba(120,80,255,.3)",
                      overflow:"hidden",marginBottom:4}}>
                      <div style={{height:"100%",borderRadius:4,
                        background:canLevelUp
                          ?"linear-gradient(90deg,#6622dd,#aa44ff,#cc88ff)"
                          :"rgba(100,60,220,.5)",
                        width:`${progressPct}%`,
                        transition:"width .5s ease",
                        boxShadow:canLevelUp?"0 0 6px #aa55ff":undefined}}/>
                    </div>

                    {/* Pool / cost */}
                    <div style={{fontSize:11,color:canLevelUp?"#c8b0ff":"#6655aa",
                      fontFamily:"'Cinzel',serif",letterSpacing:".02em",marginBottom:2}}>
                      {poolDisplay.toLocaleString()}
                      <span style={{color:"#3a2860",margin:"0 4px"}}>/</span>
                      {costToNext.toLocaleString()}
                    </div>
                    {!canLevelUp && (
                      <div style={{fontSize:9,color:"#3a2860",fontFamily:"'Cinzel',serif",marginBottom:4}}>
                        {Math.max(0,costToNext-poolDisplay).toLocaleString()} more needed
                      </div>
                    )}

                    {/* Upgrade button */}
                    {canLevelUp && (
                      <button
                        onClick={doLevelUp}
                        style={{marginTop:4,width:"100%",padding:"8px 0",
                          borderRadius:6,cursor:"pointer",border:"1.5px solid #aa66ff",
                          background:"linear-gradient(135deg,rgba(130,50,255,.7),rgba(80,20,180,.5))",
                          color:"#f0e8ff",fontFamily:"'Cinzel',serif",
                          fontSize:12,fontWeight:700,letterSpacing:".08em",
                          boxShadow:"0 0 12px rgba(160,80,255,.4)",
                          WebkitTapHighlightColor:"transparent"}}>
                        {levelsBuyable > 1
                          ? `▲ LV ${tomesLevel} → ${tomesLevel+levelsBuyable}  (+${levelsBuyable} pts)`
                          : "▲ LEVEL UP"}
                      </button>
                    )}
                    {canLevelUp && levelsBuyable > 1 && (
                      <div style={{fontSize:9,color:"#9966ff",fontFamily:"'Cinzel',serif",marginTop:3}}>
                        Gain +{levelsBuyable} upgrade points
                      </div>
                    )}
                  </>)}
                </div>
              </foreignObject>

              {/* Nodes */}
              {NODES.map(node=>{
                const n = getNode(node.id);
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                    <CircleNode node={n} unlocked={unlocked.has(n.id)}
                      active={selected===n.id} onClick={()=>setSelected(n.id)} r={n.r}/>
                    <text x={0} y={n.r+11} textAnchor="middle" style={{
                      fontSize:6.5, fontFamily:"'Cinzel',serif",
                      fill:selected===n.id?"#ffffff":unlocked.has(n.id)?`${n.accent}ee`:"#5544aa",
                      letterSpacing:".03em"}}>
                      {n.label.length>13?n.label.slice(0,12)+"…":n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* LORE TAB */}
      {tab==="lore" && (
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px",
          background:"linear-gradient(180deg,#0c0c20,#060610)"}}>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:30,marginBottom:6}}>{facDef?.s??"⚑"}</div>
            <div style={{fontSize:12,color:"#e8e0ff",letterSpacing:".12em",marginBottom:4}}>
              {facDef?.n?.toUpperCase()??"YOUR FACTION"}
            </div>
            <div style={{fontSize:9,color:"#6655aa",fontFamily:"'Crimson Pro',serif",
              fontStyle:"italic",lineHeight:1.6}}>
              {facDef?.desc??"The origins of this faction are shrouded in legend."}
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 12px",marginBottom:14,
            background:"rgba(100,60,255,.08)",border:"1px solid rgba(120,80,255,.25)",borderRadius:5}}>
            <div>
              <div style={{fontSize:8,color:"#4a3a70",letterSpacing:".1em"}}>TOMES LEVEL</div>
              {!atMaxLevel && (
                <div style={{fontSize:8,color:"#5540aa",marginTop:2}}>
                  {poolDisplay.toLocaleString()} / {costToNext.toLocaleString()} power
                  {powerPerHr > 0 && <span style={{color:"#6655aa"}}> · +{powerPerHr.toLocaleString()}/hr</span>}
                </div>
              )}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:20,color:"#d0c0ff",fontFamily:"'Cinzel Decorative',serif"}}>{tomesLevel}</div>
              {tomesUnspentPoints > 0 && (
                <div style={{fontSize:8,color:"#ff8844"}}>{tomesUnspentPoints} pts to spend</div>
              )}
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:8,color:"#5540aa",marginBottom:4}}>
              <span>MASTERY PROGRESS</span>
              <span style={{color:"#c0a8ff"}}>{unlocked.size} / {NODES.length}</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,.04)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,
                width:`${(unlocked.size/NODES.length)*100}%`,
                background:"linear-gradient(90deg,#330088,#9966ff)",transition:"width .4s ease"}}/>
            </div>
          </div>

          <div style={{fontSize:8,color:"#5540aa",letterSpacing:".12em",marginBottom:8}}>ACTIVE TOMES</div>
          {unlocked.size===0 ? (
            <div style={{fontSize:9,color:"#1e1408",fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>
              No tomes unlocked yet. Study the Knowledge tree.
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {NODES.filter(n=>unlocked.has(n.id)).map(n=>{
                const d=getNode(n.id);
                return (
                  <div key={n.id} style={{display:"flex",alignItems:"center",gap:8,
                    padding:"5px 9px",background:`${n.accent}0c`,
                    border:`1px solid ${n.accent}20`,borderRadius:4}}>
                    <span style={{fontSize:14,flexShrink:0}}>{d.icon}</span>
                    <div>
                      <div style={{fontSize:9,color:n.accent}}>{d.label}</div>
                      <div style={{fontSize:8,color:"#4a3828",fontFamily:"'Crimson Pro',serif",
                        fontStyle:"italic"}}>{n.desc}</div>
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
