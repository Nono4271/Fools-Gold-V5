import { useState, useMemo, memo } from "react";
import { PLAYABLE_FACTIONS } from "../../../shared/constants/factions.js";

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
      {unlocked && <circle cx={0} cy={0} r={r*1.6}  fill={ac} opacity=".09"/>}
      {active   && <circle cx={0} cy={0} r={r*1.38} fill="none" stroke={ac} strokeWidth="1.5" opacity=".55"/>}
      <circle cx={0} cy={0} r={r}
        fill={unlocked?"#19221a":"#0d0d0d"}
        stroke={active?ac:unlocked?`${ac}bb`:"#282828"}
        strokeWidth={active?2:1.5}/>
      <circle cx={0} cy={0} r={r*.76} fill="none"
        stroke={unlocked?`${ac}50`:"#181818"} strokeWidth="1"/>
      <text x={0} y={r*.32} textAnchor="middle" style={{
        fontSize:r*.88, fontFamily:"serif", userSelect:"none",
        opacity:unlocked?1:.22,
        filter:unlocked?`drop-shadow(0 0 ${r*.2}px ${ac})`:"none",
      }}>
        {unlocked?node.icon:"🔒"}
      </text>
    </g>
  );
}

/* ── Node definitions using approved Layout A positions ── */
const CX = 350, CY = 270;

const NODES = [
  // TL
  {id:"tl",     x:175, y:164, r:22, icon:"🥚", label:"Dragon Eggs",    accent:"#e04060", desc:"Begin passively regenerating Dragon Eggs over time.",        prereqs:[]},
  {id:"tl_t",   x:88, y:89, r:19, icon:"⛏",  label:"Keen Gatherer",  accent:"#9898b0", desc:"+10% resource gathering rate from all tiles.",               prereqs:["tl"]},
  {id:"tl_b",   x:75, y:208, r:19, icon:"⚔️",  label:"Battle Rite",   accent:"#ee6644", desc:"+3% troop attack for all armies.",                           prereqs:["tl"]},
  {id:"tl_t1",  x:-6, y:26, r:17, icon:"🪨",  label:"Stone Mastery",  accent:"#9898b0", desc:"+15% stone & wood production.",                             prereqs:["tl_t"]},
  {id:"tl_b1",  x:-19, y:170, r:17, icon:"🛡",  label:"Iron Will",     accent:"#cc8844", desc:"+3% troop defence.",                                         prereqs:["tl_b"]},
  {id:"tl_b2",  x:-25, y:282, r:17, icon:"👑",  label:"Warlord's Pact",accent:"#f0c040", desc:"+5% attack & +5% defence.",                                  prereqs:["tl_b"]},
  // TR
  {id:"tr",     x:525, y:139, r:22, icon:"⚡",  label:"Swift March",    accent:"#88aaff", desc:"+5% march speed for all commanders.",                        prereqs:[]},
  {id:"tr_t",   x:615, y:58, r:19, icon:"🗺",  label:"Far Marcher",    accent:"#6688ee", desc:"+2 maximum march range.",                                    prereqs:["tr"]},
  {id:"tr_b",   x:635, y:168, r:19, icon:"🔍",  label:"Arcane Sight",   accent:"#44ccee", desc:"Reveal enemy troop counts when scouting.",                  prereqs:["tr"]},
  {id:"tr_b1",  x:728, y:108, r:17, icon:"👁",  label:"All-Seeing",     accent:"#40ddcc", desc:"Fog of war radius +2 tiles.",                               prereqs:["tr_b"]},
  {id:"tr_b2",  x:745, y:170, r:17, icon:"🔮",  label:"Omniscience",    accent:"#40aaff", desc:"No fog of war — full map awareness.",                       prereqs:["tr_b"]},
  {id:"tr_b3",  x:734, y:230, r:17, icon:"⚔️",  label:"Twin Legions",   accent:"#5577ff", desc:"Unlock a 3rd simultaneous march.",                          prereqs:["tr_b"]},
  {id:"tr_b4",  x:712, y:285, r:17, icon:"🌀",  label:"Void Attunement",accent:"#aa55ff", desc:"Void Tap cooldown reduced by 10%.",                         prereqs:["tr_b"]},
  // BL
  {id:"bl",     x:175, y:376, r:22, icon:"🛡",  label:"Fortify",        accent:"#88cc88", desc:"+500 HQ siege HP.",                                         prereqs:[]},
  {id:"bl_t",   x:88, y:308, r:19, icon:"🏰",  label:"Ancient Wards",  accent:"#c8b070", desc:"+1,000 HQ siege HP. Walls heal 10% faster.",               prereqs:["bl"]},
  {id:"bl_b",   x:75, y:451, r:19, icon:"⭐",  label:"Tactician",      accent:"#f0c040", desc:"Commanders gain +5% XP from all battles.",                  prereqs:["bl"]},
  {id:"bl_b1",  x:-19, y:401, r:17, icon:"⚡",  label:"Siege Master",   accent:"#88cc44", desc:"+10% siege power for all marching armies.",                 prereqs:["bl_b"]},
  {id:"bl_b2",  x:-25, y:508, r:17, icon:"📜",  label:"Elder's Rite",   accent:"#c8a040", desc:"All Wizard's Tomes effects increased by 15%.",              prereqs:["bl_b"]},
  // BR
  {id:"br",     x:472, y:408, r:22, icon:"🌀",  label:"Void Mastery",   accent:"#cc44ff", desc:"+5,000 Mystic Orb capacity.",                               prereqs:[]},
  {id:"br_t",   x:548, y:345, r:19, icon:"✨",  label:"Abundance Rite", accent:"#d4af37", desc:"+10% all resource production.",                             prereqs:["br"]},
  {id:"br_m",   x:562, y:432, r:19, icon:"🪵",  label:"Forest Lore",    accent:"#a07840", desc:"+15% wood & ore production.",                               prereqs:["br"]},
  {id:"br_b",   x:544, y:518, r:19, icon:"🥚",  label:"Egg Vault I",    accent:"#e04060", desc:"+5 Dragon Egg capacity.",                                   prereqs:["br"]},
  {id:"br_t1",  x:640, y:308, r:17, icon:"🌀",  label:"Void Channel",   accent:"#cc44ff", desc:"Void Tap cooldown reduced by additional 10%.",              prereqs:["br_t"]},
  {id:"br_b1",  x:635, y:526, r:17, icon:"🥚",  label:"Egg Vault II",   accent:"#e04060", desc:"+5 Dragon Egg capacity (total +10).",                       prereqs:["br_b"]},
  // Faction — right of Forest
  {id:"faction",x:675, y:432, r:19, icon:"⚔️",  label:"Faction Mastery",accent:"#f0c040", desc:"Your faction's unique passive ability.",                    prereqs:["br_m"]},
];

const NODE_MAP = Object.fromEntries(NODES.map(n=>[n.id,n]));

const LINES = [
  ["tl","tl_t"],["tl","tl_b"],["tl_t","tl_t1"],["tl_b","tl_b1"],["tl_b","tl_b2"],
  ["tr","tr_t"],["tr","tr_b"],["tr_b","tr_b1"],["tr_b","tr_b2"],["tr_b","tr_b3"],["tr_b","tr_b4"],
  ["bl","bl_t"],["bl","bl_b"],["bl_b","bl_b1"],["bl_b","bl_b2"],
  ["br","br_t"],["br","br_m"],["br","br_b"],["br_t","br_t1"],["br_b","br_b1"],["br_m","faction"],
];

export default memo(function WizardsTomes({ open, onClose, facKey, tomesLevel = 0 }) {
  const [tab,      setTab]      = useState("knowledge");
  const [unlocked, setUnlocked] = useState(new Set());
  const [selected, setSelected] = useState(null);

  const facDef = useMemo(()=>PLAYABLE_FACTIONS.find(f=>f.key===facKey),[facKey]);

  const getNode = id => {
    const n = NODE_MAP[id];
    if (!n) return null;
    if (id==="faction") return {...n, icon:facDef?.s??"⚔️", label:`${facDef?.n??"Faction"} Mastery`,
      desc:`${facDef?.n??"Your faction"}'s unique passive ability.`};
    return n;
  };

  const canUnlock = node => !unlocked.has(node.id) && node.prereqs.every(p=>unlocked.has(p));
  const doUnlock  = node => {
    if (!canUnlock(node)) return;
    setUnlocked(prev=>new Set([...prev,node.id]));
    setSelected(node.id);
  };

  const selNode = selected ? getNode(selected) : null;
  if (!open) return null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"#04020e",
      display:"flex",flexDirection:"column",fontFamily:"'Cinzel',serif"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 16px",flexShrink:0,
        background:"linear-gradient(180deg,#0c0818,#070510)",
        borderBottom:"1px solid rgba(200,160,64,.18)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <ScrollStackIcon size={32} glowing/>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",
              background:"linear-gradient(135deg,#f0c040,#c89030,#f0c040)",
              backgroundSize:"200% auto",WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite"}}>
              A WIZARD'S ANCIENT KNOWLEDGE
            </div>
            <div style={{fontSize:7,color:"#4a3a20",letterSpacing:".14em"}}>
              WIZARD'S TOMES · {unlocked.size} / {NODES.length} UNLOCKED
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"1px solid #2a2010",
          color:"#6a5a3a",fontSize:16,cursor:"pointer",width:28,height:28,borderRadius:4,
          display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(200,160,64,.1)",
        background:"#06040c",flexShrink:0}}>
        {[{id:"knowledge",label:"📖  KNOWLEDGE"},{id:"lore",label:"🌟  LORE"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"8px 0",
            background:tab===t.id?"rgba(200,160,64,.07)":"none",border:"none",
            borderBottom:tab===t.id?"2px solid #c8a040":"2px solid transparent",
            color:tab===t.id?"#c8a040":"#2e2010",
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
            background:"rgba(6,3,16,.98)",borderBottom:"1px solid rgba(40,20,80,.4)",
            display:"flex",alignItems:"center",gap:10}}>
            {selNode ? (
              <>
                <div style={{width:36,height:36,flexShrink:0,borderRadius:"50%",
                  background:`${selNode.accent}18`,border:`1.5px solid ${selNode.accent}44`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
                  {unlocked.has(selNode.id)?selNode.icon:"🔒"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:selNode.accent,marginBottom:2}}>{selNode.label}</div>
                  <div style={{fontSize:8.5,color:"#4a3828",fontFamily:"'Crimson Pro',serif",
                    fontStyle:"italic",lineHeight:1.4}}>{selNode.desc}</div>
                </div>
                {unlocked.has(selNode.id) ? (
                  <div style={{fontSize:8,color:selNode.accent,padding:"3px 8px",flexShrink:0,
                    border:`1px solid ${selNode.accent}40`,borderRadius:3}}>✓ ACTIVE</div>
                ) : (
                  <button onClick={()=>doUnlock(selNode)} disabled={!canUnlock(selNode)} style={{
                    padding:"5px 11px",flexShrink:0,
                    background:canUnlock(selNode)?`${selNode.accent}25`:"rgba(255,255,255,.02)",
                    border:`1px solid ${canUnlock(selNode)?selNode.accent:"#1a1408"}`,
                    color:canUnlock(selNode)?selNode.accent:"#281e08",
                    fontFamily:"'Cinzel',serif",fontSize:8,letterSpacing:".07em",
                    borderRadius:3,cursor:canUnlock(selNode)?"pointer":"not-allowed"}}>
                    {canUnlock(selNode)?"✦ UNLOCK":"LOCKED"}
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
          <div style={{flex:1,overflow:"auto",WebkitOverflowScrolling:"touch",
            display:"flex",alignItems:"stretch"}}>
            <svg viewBox="0 20 720 500"
              style={{width:"100%",height:"100%",display:"block"}}
              preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="wtbg" cx="50%" cy="50%" r="58%">
                  <stop offset="0%" stopColor="#0c0620"/>
                  <stop offset="100%" stopColor="#03020a"/>
                </radialGradient>
              </defs>
              <rect x="30" y="40" width="700" height="470" fill="url(#wtbg)"/>

              {/* Ring guides */}
              <ellipse cx={CX} cy={CY} rx={175} ry={155}
                fill="none" stroke="rgba(80,160,255,.05)" strokeWidth="1"/>
              <ellipse cx={CX} cy={CY} rx={320} ry={265}
                fill="none" stroke="rgba(80,160,255,.03)" strokeWidth="1"/>

              {/* Connection lines */}
              {LINES.map(([aid,bid])=>{
                const A=NODE_MAP[aid], B=NODE_MAP[bid];
                if(!A||!B) return null;
                const lit  = unlocked.has(aid)&&unlocked.has(bid);
                const part = unlocked.has(aid)&&!unlocked.has(bid);
                return (
                  <line key={`${aid}-${bid}`}
                    x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                    stroke={lit?"#8ab8ff88":part?"#2e2c40":"#1a1820"}
                    strokeWidth={lit?1.5:1}
                    strokeDasharray={part?"4 3":"none"}/>
                );
              })}

              {/* Centre level orb */}
              <circle cx={CX} cy={CY} r={38} fill="#06031a" stroke="rgba(80,160,255,.2)" strokeWidth="1.5"/>
              <circle cx={CX} cy={CY} r={32} fill="none"    stroke="rgba(80,160,255,.1)" strokeWidth="1"/>
              <circle cx={CX} cy={CY} r={24} fill="#10083a"/>
              <circle cx={CX} cy={CY} r={16} fill="#1e1060" opacity=".7"/>
              <text x={CX} y={CY-8} textAnchor="middle"
                style={{fontSize:6.5,fontFamily:"'Cinzel',serif",fill:"#5a5070",letterSpacing:".1em"}}>TOMES</text>
              <text x={CX} y={CY+3} textAnchor="middle"
                style={{fontSize:6,fontFamily:"'Cinzel',serif",fill:"#6a6080",letterSpacing:".06em"}}>LEVEL</text>
              <text x={CX} y={CY+22} textAnchor="middle"
                style={{fontSize:20,fontFamily:"'Cinzel Decorative',serif",fill:"#8899cc",fontWeight:700}}>
                {tomesLevel}
              </text>

              {/* Nodes */}
              {NODES.map(node=>{
                const n = getNode(node.id);
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                    <CircleNode node={n} unlocked={unlocked.has(n.id)}
                      active={selected===n.id} onClick={()=>setSelected(n.id)} r={n.r}/>
                    <text x={0} y={n.r+12} textAnchor="middle" style={{
                      fontSize:6, fontFamily:"'Cinzel',serif",
                      fill:selected===n.id?n.accent:unlocked.has(n.id)?`${n.accent}cc`:"#222018",
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
        <div style={{flex:1,overflowY:"auto",padding:"18px 16px",
          background:"linear-gradient(180deg,#06040c,#03020a)"}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:32,marginBottom:8}}>{facDef?.s??"⚑"}</div>
            <div style={{fontSize:13,color:"#c8a040",letterSpacing:".12em",marginBottom:5}}>
              {facDef?.n?.toUpperCase()??"YOUR FACTION"}
            </div>
            <div style={{fontSize:10,color:"#4a3828",fontFamily:"'Crimson Pro',serif",
              fontStyle:"italic",lineHeight:1.6}}>
              {facDef?.desc??"The origins of this faction are shrouded in legend."}
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 12px",marginBottom:14,
            background:"rgba(200,160,64,.05)",border:"1px solid rgba(200,160,64,.15)",borderRadius:5}}>
            <div style={{fontSize:8,color:"#4a3a20",letterSpacing:".1em"}}>TOMES LEVEL</div>
            <div style={{fontSize:20,color:"#c8a040",
              fontFamily:"'Cinzel Decorative',serif"}}>{tomesLevel}</div>
          </div>

          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:7.5,color:"#3a2a18",marginBottom:4}}>
              <span>MASTERY PROGRESS</span>
              <span style={{color:"#c8a040"}}>{unlocked.size} / {NODES.length}</span>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,.04)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,
                width:`${(unlocked.size/NODES.length)*100}%`,
                background:"linear-gradient(90deg,#6a4010,#f0c040)",transition:"width .4s ease"}}/>
            </div>
          </div>

          <div style={{fontSize:7.5,color:"#3a2a18",letterSpacing:".12em",marginBottom:8}}>ACTIVE TOMES</div>
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
