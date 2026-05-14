import { useState, useMemo, memo, useCallback } from "react";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";
import { TOMES_LEVEL_COST, TOMES_MAX_LEVEL } from "../../../shared/constants/map.js";

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD'S TOMES — A Wizard's Ancient Knowledge
   Layout A: 4 quadrants, centre level orb, faction node right of Forest
   25 nodes total
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

/* ── Node definitions using approved Layout A positions ── */
const CX = 510, CY = 315;

const NODES = [
  // TL quadrant — fans upper-left corner
  {id:"tl",     x:330, y:195, r:22, icon:"🥚", label:"Dragon Eggs",    accent:"#e04060", desc:"Begin passively regenerating Dragon Eggs over time.",       prereqs:[]},
  {id:"tl_t",   x:195, y:108, r:19, icon:"⛏",  label:"Keen Gatherer",  accent:"#9898b0", desc:"+10% resource gathering rate from all tiles.",              prereqs:["tl"]},
  {id:"tl_b",   x:182, y:240, r:19, icon:"⚔️",  label:"Battle Rite",   accent:"#ee6644", desc:"+3% troop attack for all armies.",                          prereqs:["tl"]},
  {id:"tl_t1",  x:82,  y:62,  r:17, icon:"🪨",  label:"Stone Mastery",  accent:"#9898b0", desc:"+15% stone & wood production.",                            prereqs:["tl_t"]},
  {id:"tl_b1",  x:78,  y:210, r:17, icon:"🛡",  label:"Iron Will",     accent:"#cc8844", desc:"+3% troop defence.",                                        prereqs:["tl_b"]},
  {id:"tl_b2",  x:72,  y:308, r:17, icon:"👑",  label:"Warlord's Pact",accent:"#f0c040", desc:"+5% attack & +5% defence.",                                 prereqs:["tl_b"]},
  // TR quadrant — fans upper-right corner
  {id:"tr",     x:692, y:158, r:22, icon:"⚡",  label:"Swift March",    accent:"#88aaff", desc:"+5% march speed for all commanders.",                       prereqs:[]},
  {id:"tr_t",   x:828, y:68,  r:19, icon:"🗺",  label:"Far Marcher",    accent:"#6688ee", desc:"+2 maximum march range.",                                   prereqs:["tr"]},
  {id:"tr_b",   x:848, y:192, r:19, icon:"🔍",  label:"Arcane Sight",   accent:"#44ccee", desc:"Reveal enemy troop counts when scouting.",                 prereqs:["tr"]},
  {id:"tr_b1",  x:938, y:98,  r:17, icon:"👁",  label:"All-Seeing",     accent:"#40ddcc", desc:"Fog of war radius +2 tiles.",                              prereqs:["tr_b"]},
  {id:"tr_b2",  x:952, y:182, r:17, icon:"🔮",  label:"Omniscience",    accent:"#40aaff", desc:"No fog of war — full map awareness.",                      prereqs:["tr_b"]},
  {id:"tr_b3",  x:942, y:265, r:17, icon:"⚔️",  label:"Twin Legions",   accent:"#5577ff", desc:"Unlock a 3rd simultaneous march.",                         prereqs:["tr_b"]},
  {id:"tr_b4",  x:915, y:338, r:17, icon:"🌀",  label:"Void Attunement",accent:"#aa55ff", desc:"Void Tap cooldown reduced by 10%.",                        prereqs:["tr_b"]},
  // BL quadrant — fans lower-left corner
  {id:"bl",     x:330, y:438, r:22, icon:"🛡",  label:"Fortify",        accent:"#88cc88", desc:"+500 HQ siege HP.",                                        prereqs:[]},
  {id:"bl_t",   x:190, y:368, r:19, icon:"🏰",  label:"Ancient Wards",  accent:"#c8b070", desc:"+1,000 HQ siege HP. Walls heal 10% faster.",              prereqs:["bl"]},
  {id:"bl_b",   x:178, y:510, r:19, icon:"⭐",  label:"Tactician",      accent:"#f0c040", desc:"Commanders gain +5% XP from all battles.",                 prereqs:["bl"]},
  {id:"bl_b1",  x:75,  y:472, r:17, icon:"⚡",  label:"Siege Master",   accent:"#88cc44", desc:"+10% siege power for all marching armies.",                prereqs:["bl_b"]},
  {id:"bl_b2",  x:70,  y:558, r:17, icon:"📜",  label:"Elder's Rite",   accent:"#c8a040", desc:"All Wizard's Tomes effects increased by 15%.",             prereqs:["bl_b"]},
  // BR quadrant — fans lower-right corner
  {id:"br",     x:672, y:468, r:22, icon:"🌀",  label:"Void Mastery",   accent:"#cc44ff", desc:"+5,000 Mystic Orb capacity.",                              prereqs:[]},
  {id:"br_t",   x:800, y:392, r:19, icon:"✨",  label:"Abundance Rite", accent:"#d4af37", desc:"+10% all resource production.",                            prereqs:["br"]},
  {id:"br_m",   x:818, y:488, r:19, icon:"🪵",  label:"Forest Lore",    accent:"#a07840", desc:"+15% wood & ore production.",                              prereqs:["br"]},
  {id:"br_b",   x:792, y:572, r:19, icon:"🥚",  label:"Egg Vault I",    accent:"#e04060", desc:"+5 Dragon Egg capacity.",                                  prereqs:["br"]},
  {id:"br_t1",  x:935, y:368, r:17, icon:"🌀",  label:"Void Channel",   accent:"#cc44ff", desc:"Void Tap cooldown reduced by additional 10%.",             prereqs:["br_t"]},
  {id:"br_b1",  x:925, y:572, r:17, icon:"🥚",  label:"Egg Vault II",   accent:"#e04060", desc:"+5 Dragon Egg capacity (total +10).",                      prereqs:["br_b"]},
  // Faction — right of Forest
  {id:"faction",x:958, y:488, r:19, icon:"⚔️",  label:"Faction Mastery",accent:"#f0c040", desc:"Your faction's unique passive ability.",                   prereqs:["br_m"]},
];
const NODE_MAP = Object.fromEntries(NODES.map(n=>[n.id,n]));

const LINES = [
  ["tl","tl_t"],["tl","tl_b"],["tl_t","tl_t1"],["tl_b","tl_b1"],["tl_b","tl_b2"],
  ["tr","tr_t"],["tr","tr_b"],["tr_b","tr_b1"],["tr_b","tr_b2"],["tr_b","tr_b3"],["tr_b","tr_b4"],
  ["bl","bl_t"],["bl","bl_b"],["bl_b","bl_b1"],["bl_b","bl_b2"],
  ["br","br_t"],["br","br_m"],["br","br_b"],["br_t","br_t1"],["br_b","br_b1"],["br_m","faction"],
];

export default memo(function WizardsTomes({ open, onClose, facKey, tomesLevel = 0, setTomesLevel, powerPool = 0, setPowerPool, powerPerHr = 0, tomesUnspentPoints = 0, setTomesUnspentPoints }) {
  const [tab,      setTab]      = useState("knowledge");
  const [unlocked, setUnlocked] = useState(new Set());
  const [selected, setSelected] = useState(null);

  const facDef = useMemo(()=>PLAYABLE_FACTIONS.find(f=>f.key===facKey),[facKey]);

  // ── Power / level-up helpers ─────────────────────────────────────────────
  const atMaxLevel = tomesLevel >= TOMES_MAX_LEVEL;
  const costToNext = atMaxLevel ? Infinity : (TOMES_LEVEL_COST[tomesLevel] ?? Infinity);
  // How many levels can we buy right now with pooled power?
  const levelsAvailable = useCallback(() => {
    if (atMaxLevel) return 0;
    let pool = powerPool;
    let lvl  = tomesLevel;
    let count = 0;
    while (lvl < TOMES_MAX_LEVEL) {
      const cost = TOMES_LEVEL_COST[lvl];
      if (cost == null || pool < cost) break;
      pool -= cost;
      lvl++;
      count++;
    }
    return count;
  }, [powerPool, tomesLevel, atMaxLevel]);

  const canLevelUp = !atMaxLevel && powerPool >= costToNext;
  const levelsBuyable = levelsAvailable();

  const doLevelUp = useCallback(() => {
    if (!canLevelUp) return;
    let pool = powerPool;
    let lvl  = tomesLevel;
    let gained = 0;
    while (lvl < TOMES_MAX_LEVEL) {
      const cost = TOMES_LEVEL_COST[lvl];
      if (cost == null || pool < cost) break;
      pool -= cost;
      lvl++;
      gained++;
    }
    setPowerPool(pool);
    setTomesLevel(lvl);
    setTomesUnspentPoints(prev => prev + gained);
  }, [canLevelUp, powerPool, tomesLevel, setPowerPool, setTomesLevel, setTomesUnspentPoints]);

  const fmtNum = n => {
    if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+"M";
    if (n >= 1_000)     return (n/1_000).toFixed(1)+"K";
    return Math.floor(n).toLocaleString();
  };
  const poolDisplay   = Math.floor(powerPool);
  const progressPct   = atMaxLevel ? 100 : Math.min(100, (powerPool / costToNext) * 100);

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

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"#080818",
      display:"flex",flexDirection:"column",fontFamily:"'Cinzel',serif"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 16px",flexShrink:0,
        background:"linear-gradient(180deg,#0c0c22,#080816)",
        borderBottom:"1px solid rgba(140,100,255,.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <ScrollStackIcon size={32} glowing/>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",
              background:"linear-gradient(135deg,#d0c0ff,#9966ff,#d0c0ff)",
              backgroundSize:"200% auto",WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite"}}>
              A WIZARD'S ANCIENT KNOWLEDGE
            </div>
            <div style={{fontSize:7,color:"#4a3a20",letterSpacing:".14em"}}>
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
            flex:1,padding:"8px 0",
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

          {/* Detail panel */}
          <div style={{flexShrink:0,height:52,padding:"5px 14px",
            background:"rgba(6,4,20,.98)",borderBottom:"1px solid rgba(120,80,255,.2)",
            display:"flex",alignItems:"center",gap:10}}>
            {selNode ? (
              <>
                <div style={{width:36,height:36,flexShrink:0,borderRadius:"50%",
                  background:`${selNode.accent}18`,border:`1.5px solid ${selNode.accent}44`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
                  {unlocked.has(selNode.id)?selNode.icon:"🔒"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:"#e8e0ff",marginBottom:2}}>{selNode.label}</div>
                  <div style={{fontSize:8.5,color:"#7060aa",fontFamily:"'Crimson Pro',serif",
                    fontStyle:"italic",lineHeight:1.4}}>{selNode.desc}</div>
                </div>
                {unlocked.has(selNode.id) ? (
                  <div style={{fontSize:8,color:"#c0a8ff",padding:"3px 8px",flexShrink:0,
                    border:"1px solid rgba(150,100,255,.4)",borderRadius:3}}>✓ ACTIVE</div>
                ) : (
                  <button onClick={()=>doUnlock(selNode)} disabled={!canUnlock(selNode)} style={{
                    padding:"5px 11px",flexShrink:0,
                    background:canUnlock(selNode)?"rgba(120,60,255,.25)":"rgba(255,255,255,.02)",
                    border:`1px solid ${canUnlock(selNode)?"#9966ff":"#1a1440"}`,
                    color:canUnlock(selNode)?"#e8e0ff":"#2a1866",
                    fontFamily:"'Cinzel',serif",fontSize:8,letterSpacing:".07em",
                    borderRadius:3,cursor:canUnlock(selNode)?"pointer":"not-allowed"}}>
                    {canUnlock(selNode) ? "✦ UNLOCK (1 pt)"
                      : !unlocked.has(selNode.id) && selNode.prereqs.every(p=>unlocked.has(p)) && tomesUnspentPoints === 0
                      ? "NO POINTS" : "LOCKED"}
                  </button>
                )}
              </>
            ) : (
              <div style={{fontSize:9,color:"#1c1408",fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>
                Select a node to inspect it.
              </div>
            )}
          </div>

          {/* SVG tree */}
          <div style={{flex:1,overflow:"hidden",position:"relative",
            display:"flex",flexDirection:"column",alignItems:"stretch"}}>

            {/* ── Power strip: HTML overlay so text is readable on all screen sizes ── */}
            <div style={{flexShrink:0,padding:"6px 16px",
              background:"rgba(8,6,24,.95)",borderBottom:"1px solid rgba(120,80,255,.2)",
              display:"flex",alignItems:"center",gap:12}}>

              {/* Left: pool / cost + progress bar */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"baseline",marginBottom:4}}>
                  <span style={{fontSize:9,fontFamily:"'Cinzel',serif",
                    color:"#7755aa",letterSpacing:".1em"}}>POWER</span>
                  <span style={{fontSize:9,fontFamily:"'Cinzel',serif",
                    color:powerPerHr>0?"#8866cc":"#3a2a50"}}>
                    {powerPerHr>0?`+${powerPerHr.toLocaleString()}/hr`:"no power"}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{height:6,borderRadius:3,background:"rgba(100,60,255,.15)",
                  border:"1px solid rgba(120,80,255,.2)",overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",borderRadius:3,
                    background:canLevelUp
                      ?"linear-gradient(90deg,#7733ff,#aa55ff)"
                      :"rgba(120,80,255,.45)",
                    width:`${progressPct}%`,transition:"width .4s ease"}}/>
                </div>
                {/* Pool / cost numbers */}
                <div style={{fontSize:10,fontFamily:"'Cinzel',serif",
                  color:canLevelUp?"#c0a8ff":"#6655aa",letterSpacing:".02em"}}>
                  {atMaxLevel
                    ? <span style={{color:"#d0c0ff"}}>✦ MAX LEVEL</span>
                    : <>{poolDisplay.toLocaleString()} <span style={{color:"#3a2a60"}}>/</span> {costToNext.toLocaleString()}</>
                  }
                </div>
                {!atMaxLevel && !canLevelUp && (
                  <div style={{fontSize:8,color:"#3a2a50",fontFamily:"'Cinzel',serif",marginTop:2}}>
                    {Math.max(0,costToNext-poolDisplay).toLocaleString()} more needed
                  </div>
                )}
              </div>

              {/* Right: level display + upgrade button */}
              <div style={{flexShrink:0,textAlign:"center"}}>
                <div style={{fontSize:8,color:"#5540aa",fontFamily:"'Cinzel',serif",
                  letterSpacing:".1em",marginBottom:2}}>TOMES LV</div>
                <div style={{fontSize:22,fontFamily:"'Cinzel Decorative',serif",
                  color:"#d0c0ff",fontWeight:700,lineHeight:1,marginBottom:4}}>
                  {tomesLevel}
                </div>
                {canLevelUp && (
                  <button onClick={doLevelUp} style={{
                    padding:"5px 12px",borderRadius:4,cursor:"pointer",
                    background:"linear-gradient(135deg,rgba(120,60,255,.5),rgba(80,30,200,.3))",
                    border:"1px solid #aa77ff",
                    color:"#e8d8ff",fontFamily:"'Cinzel',serif",
                    fontSize:9,fontWeight:700,letterSpacing:".05em",
                    whiteSpace:"nowrap"}}>
                    {levelsBuyable>1
                      ? `▲ → LV ${tomesLevel+levelsBuyable} (+${levelsBuyable} pts)`
                      : "▲ LEVEL UP"}
                  </button>
                )}
                {tomesUnspentPoints>0 && (
                  <div style={{fontSize:9,color:"#ff8844",marginTop:3,
                    fontFamily:"'Cinzel',serif",fontWeight:700}}>
                    {tomesUnspentPoints} pt{tomesUnspentPoints!==1?"s":""} to spend
                  </div>
                )}
              </div>
            </div>

            {/* SVG canvas */}
            <div style={{flex:1,overflow:"hidden",display:"flex",alignItems:"stretch"}}>
            <svg viewBox="45 45 975 645"
              style={{width:"100%",height:"100%",display:"block"}}
              preserveAspectRatio="xMidYMid meet">
              <defs>
              </defs>

              {/* Ring guides */}
              <ellipse cx={CX} cy={CY} rx={195} ry={172}
                fill="none" stroke="rgba(140,100,255,.25)" strokeWidth="1"/>
              <ellipse cx={CX} cy={CY} rx={420} ry={295}
                fill="none" stroke="rgba(140,100,255,.15)" strokeWidth="1"/>

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

              {/* Centre level orb — now just the orb, no power text below */}
              <circle cx={CX} cy={CY} r={38} fill="#080820" stroke="rgba(140,100,255,.5)" strokeWidth="1.5"/>
              <circle cx={CX} cy={CY} r={32} fill="none"    stroke="rgba(140,100,255,.15)" strokeWidth="1"/>
              <circle cx={CX} cy={CY} r={24} fill="#14103a"/>
              <circle cx={CX} cy={CY} r={16} fill="#1e1850" opacity=".7"/>
              <text x={CX} y={CY-6} textAnchor="middle"
                style={{fontSize:7,fontFamily:"'Cinzel',serif",fill:"#b0a0ee",letterSpacing:".1em"}}>TOMES</text>
              <text x={CX} y={CY+5} textAnchor="middle"
                style={{fontSize:6,fontFamily:"'Cinzel',serif",fill:"#9080cc",letterSpacing:".06em"}}>LEVEL</text>
              <text x={CX} y={CY+24} textAnchor="middle"
                style={{fontSize:22,fontFamily:"'Cinzel Decorative',serif",fill:"#d0c0ff",fontWeight:700}}>
                {tomesLevel}
              </text>
              {/* Unspent points badge */}
              {tomesUnspentPoints > 0 && (
                <g>
                  <circle cx={CX+32} cy={CY-32} r={11} fill="#cc4400" stroke="#ff6622" strokeWidth="1.5"/>
                  <text x={CX+32} y={CY-28} textAnchor="middle"
                    style={{fontSize:9,fontFamily:"'Cinzel',serif",fill:"#fff",fontWeight:700}}>
                    {tomesUnspentPoints}
                  </text>
                </g>
              )}

              {/* Nodes */}
              {NODES.map(node=>{
                const n = getNode(node.id);
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                    <CircleNode node={n} unlocked={unlocked.has(n.id)}
                      active={selected===n.id} onClick={()=>setSelected(n.id)} r={n.r}/>
                    <text x={0} y={n.r+12} textAnchor="middle" style={{
                      fontSize:6, fontFamily:"'Cinzel',serif",
                      fill:selected===n.id?"#ffffff":unlocked.has(n.id)?`${n.accent}ee`:"#5544aa",
                      letterSpacing:".03em"}}>
                      {n.label.length>13?n.label.slice(0,12)+"…":n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            </div>{/* end SVG canvas div */}
          </div>{/* end SVG tree column */}
        </div>
      )}

      {/* LORE TAB */}
      {tab==="lore" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 16px",
          background:"linear-gradient(180deg,#0c0c20,#060610)"}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:32,marginBottom:8}}>{facDef?.s??"⚑"}</div>
            <div style={{fontSize:13,color:"#e8e0ff",letterSpacing:".12em",marginBottom:5}}>
              {facDef?.n?.toUpperCase()??"YOUR FACTION"}
            </div>
            <div style={{fontSize:10,color:"#6655aa",fontFamily:"'Crimson Pro',serif",
              fontStyle:"italic",lineHeight:1.6}}>
              {facDef?.desc??"The origins of this faction are shrouded in legend."}
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 12px",marginBottom:14,
            background:"rgba(100,60,255,.08)",border:"1px solid rgba(120,80,255,.25)",borderRadius:5}}>
            <div>
              <div style={{fontSize:8,color:"#4a3a20",letterSpacing:".1em"}}>TOMES LEVEL</div>
              {!atMaxLevel && (
                <div style={{fontSize:7,color:"#5540aa",marginTop:2}}>
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

          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:7.5,color:"#5540aa",marginBottom:4}}>
              <span>MASTERY PROGRESS</span>
              <span style={{color:"#c0a8ff"}}>{unlocked.size} / {NODES.length}</span>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,.04)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,
                width:`${(unlocked.size/NODES.length)*100}%`,
                background:"linear-gradient(90deg,#330088,#9966ff)",transition:"width .4s ease"}}/>
            </div>
          </div>

          <div style={{fontSize:7.5,color:"#5540aa",letterSpacing:".12em",marginBottom:8}}>ACTIVE TOMES</div>
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
