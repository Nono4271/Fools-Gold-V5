import { memo } from "react";
import { FACTION_TROOPS } from "../../../shared/constants/troops.js";
function tbInfo(tb) { if (!tb) return null; const f = FACTION_TROOPS[tb.faction]; const b = f?.branches.find(b => b.key === tb.branch); const t = b?.tiers[tb.tier ?? 0]; if (!b || !t) return null; return { label: `${b.label} 2014 ${t.label}`, color: "#c8a060" }; }
import { HQP } from "../../../shared/constants/map.js";
import { cmdCommand } from "../../../shared/constants/buildings.js";
import { bfsPath, effectiveMarchSpd, marchStepMs } from "../../../shared/utils/pathfinding.js";
import { applyGearToCmd } from "../../../shared/utils/gearStats.js";

export default memo(function BottomPanel({
  mode, mvCmd, setMvCmd, reinCmd, setReinCmd,
  cmdsOnSel, barracksPool, bldgs, sliderVals, setSliderVals,
  startReinforcement, setMode, setAtkKey, setPick, setSelKey, setPopupPos,
  gearInventory, reinMarches, playerHqKey,
}) {
  const hqKey = playerHqKey || `${HQP.player.c},${HQP.player.r}`;

  const cancel = () => {
    setMode("view"); setAtkKey(null); setPick(null); setMvCmd(null); setReinCmd(null);
  };
  const cancelAndClose = () => {
    cancel(); setSelKey(null); setPopupPos(null);
  };

  return (
    <div className="panel" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9000,maxHeight:"50vh",display:"flex",flexDirection:"column",borderRadius:"10px 10px 0 0",animation:"fadeUp .18s ease",boxShadow:"0 -6px 32px rgba(0,0,0,.95)"}}>

      {/* Header */}
      <div style={{padding:"9px 14px",borderBottom:"1px solid #221e12",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"rgba(255,255,255,.025)"}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="btn" onClick={cancel}
            style={{background:"none",border:"1px solid #333",color:"#666",fontSize:10,padding:"2px 8px"}}>← Back</button>
          <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:12,color:"#c8a060"}}>
            {mode==="selectMarchDest" ? "🚶 SELECT DESTINATION" : "🔄 REINFORCE"}
          </span>
        </div>
        <button className="btn" onClick={cancelAndClose}
          style={{background:"none",border:"1px solid #2a2a2a",color:"#555",fontSize:10,padding:"2px 10px"}}>✕</button>
      </div>

      <div className="scr" style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>

        {/* ── REINFORCE ── */}
        {mode==="reinforce" && reinCmd && (() => {
          const cap     = cmdCommand(reinCmd.lvl||5, bldgs.commandcenter||0, (reinCmd.cls==="leader"&&(reinCmd.lvl||5)>=25)?500:0);
          const cur     = reinCmd.troops||0;
          // Fix: subtract troops already en route so displayed room is accurate
          const inTransit = (reinMarches||[]).filter(r => r.cmdUid === reinCmd.uid && !r.returning)
                              .reduce((s, r) => s + r.amount, 0);
          const room    = Math.max(0, cap - cur - inTransit);
          const maxAdd  = Math.min(room, barracksPool);
          const sk      = `rein_${reinCmd.uid}`;
          const sv      = Math.min(sliderVals[sk]??0, maxAdd);
          const effSpd  = effectiveMarchSpd(applyGearToCmd(reinCmd, gearInventory).spd||60, reinCmd.troopBranch);
          const stepMs  = Math.max(100, Math.floor(marchStepMs(effSpd)/2));
          const path    = bfsPath(hqKey, reinCmd.tk);
          const estSecs = path ? Math.ceil((path.length-1)*stepMs/1000) : "?";

          return (
            <div>
              {/* Commander card */}
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12,padding:"8px 10px",background:"rgba(30,60,120,.12)",border:"1px solid rgba(50,100,200,.3)",borderRadius:5}}>
                <span style={{fontSize:26}}>{reinCmd.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,color:"#e0d0c0"}}>{reinCmd.n} <span style={{color:"#f0c040",fontSize:9}}>Lv{reinCmd.lvl||5}</span></div>
                  {reinCmd.troopBranch && (() => { const _ti = tbInfo(reinCmd.troopBranch); return _ti ? (
                    <div style={{fontSize:9,color:_ti.color}}>
                      {_ti.label} · <strong style={{color:"#e0d0c0"}}>{(reinCmd.troops||0).toLocaleString()}</strong> troops
                    </div>
                  ) : null; })()}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:9,color:"#6a7a9a",fontFamily:"'Cinzel',serif"}}>Barracks</div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:12,color:barracksPool>0?"#88aaff":"#cc3030",fontWeight:700}}>{barracksPool.toLocaleString()}</div>
                </div>
              </div>

              {barracksPool > 0 ? (
                room > 0 ? (
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#6a7a9a",letterSpacing:".1em",fontFamily:"'Cinzel',serif",marginBottom:4}}>
                      <span>SEND REINFORCEMENTS</span>
                      <span style={{color:sv>0?"#88aaff":"#4a5a7a"}}>{sv.toLocaleString()} troops{sv>0?` · ~${estSecs}s`:""}</span>
                    </div>
                    <input type="range" min={0} max={maxAdd} value={sv}
                      onChange={e => setSliderVals(v=>({...v,[sk]:+e.target.value}))}
                      style={{width:"100%",accentColor:"#3366cc",marginBottom:6}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#4a4a5a",marginBottom:10}}>
                      <span>0</span>
                      <span style={{color:"#5a6a8a"}}>Max: {maxAdd.toLocaleString()}</span>
                      <span>{maxAdd.toLocaleString()}</span>
                    </div>
                    {sv > 0
                      ? <button className="btn" onClick={() => startReinforcement(reinCmd, sv)}
                          style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,rgba(30,60,120,.5),rgba(30,60,120,.2))",border:"1px solid rgba(50,100,220,.5)",color:"#88aaff",fontSize:12,fontWeight:700}}>
                          🚶 March {sv.toLocaleString()} reinforcements (~{estSecs}s)
                        </button>
                      : <div style={{fontSize:8,color:"#4a4a5a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",textAlign:"center"}}>Slide right to set reinforcement size</div>
                    }
                  </div>
                ) : (
                  <div style={{padding:"8px 10px",background:"rgba(200,80,30,.08)",border:"1px solid rgba(200,80,30,.2)",borderRadius:4,fontSize:9,color:"#cc6030",fontFamily:"'Crimson Pro',serif"}}>
                    Army at full capacity ({cap.toLocaleString()}).
                  </div>
                )
              ) : (
                <div style={{padding:"10px",background:"rgba(200,50,50,.08)",border:"1px solid rgba(200,50,50,.2)",borderRadius:4,fontSize:9,color:"#cc6060",fontFamily:"'Crimson Pro',serif",fontStyle:"italic"}}>
                  Barracks is empty. Train more troops first.
                </div>
              )}

              <button className="btn" onClick={() => { setMode("view"); setReinCmd(null); }}
                style={{marginTop:10,padding:"7px 16px",background:"none",border:"1px solid #2a2a2a",color:"#555",fontSize:10}}>← Cancel</button>
            </div>
          );
        })()}

        {/* ── SELECT MARCH DEST ── */}
        {mode==="selectMarchDest" && mvCmd && (
          <div>
            <div style={{padding:"8px 10px",background:"rgba(20,80,50,.12)",border:"1px solid rgba(40,140,80,.3)",borderRadius:5,marginBottom:10,fontSize:10,color:"#3dcc70",fontFamily:"'Crimson Pro',serif"}}>
              Tap <strong style={{color:"#f0c040"}}>{mvCmd.n}</strong>'s destination on the map.
              Tap a <strong style={{color:"#44ff88"}}>friendly tile</strong> to Move. To attack, use the Attack command on the target tile.
            </div>
            {cmdsOnSel.filter(c=>!c.march).length > 1 && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:8,color:"#8a7a6a",fontFamily:"'Cinzel',serif",letterSpacing:".1em",marginBottom:6}}>WHICH COMMANDER?</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {cmdsOnSel.filter(c=>!c.march).map(cmd => (
                    <div key={cmd.uid} onClick={() => setMvCmd(cmd)}
                      style={{background:mvCmd.uid===cmd.uid?"rgba(40,160,80,.2)":"rgba(255,255,255,.04)",border:`2px solid ${mvCmd.uid===cmd.uid?"#3daa60":"rgba(255,255,255,.08)"}`,borderRadius:7,padding:"8px 10px",cursor:"pointer",textAlign:"center",minWidth:80}}>
                      <div style={{fontSize:22}}>{cmd.icon}</div>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"#e0d0c0",fontWeight:700}}>{cmd.n}</div>
                      <div style={{fontSize:8,color:"#3daa60"}}>{(cmd.troops||0).toLocaleString()} troops</div>
                      {mvCmd.uid===cmd.uid && <div style={{fontSize:7,color:"#3daa60",marginTop:2}}>✓ SELECTED</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="btn" onClick={() => { setMode("view"); setMvCmd(null); }}
              style={{padding:"7px 16px",background:"none",border:"1px solid #2a2a2a",color:"#555",fontSize:10}}>← Cancel</button>
          </div>
        )}

      </div>
    </div>
  );
});
