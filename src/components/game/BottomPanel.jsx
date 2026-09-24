import { memo } from "react";
import { FACTION_TROOPS } from "../../../shared/constants/troops.js";
function tbInfo(tb) { if (!tb) return null; const f = TROOP_FACTIONS[tb.faction]; const b = f?.branches.find(b => b.key === tb.branch); const t = b?.tiers[tb.tier ?? 0]; if (!b || !t) return null; return { label: `${b.label} — ${t.label}`, color: "#c8a060" }; }
import { HQP } from "../../../shared/constants/map.js";
import { cmdCommand } from "../../../shared/constants/buildings.js";
import { bfsPath } from "../../../shared/utils/pathfinding.js";
import { applyGearToCmd } from "../../../shared/utils/gearStats.js";
import { reinforcementRoom, reinforcementStepMs } from "../../../shared/utils/reinforcements.js";
import { TROOP_FACTIONS } from "../../../shared/constants/allTroops.js";

export default memo(function BottomPanel({
  mode, mvCmd, setMvCmd, reinCmd, setReinCmd,
  cmdsOnSel, barracksPool, troopCounts, bldgs, sliderVals, setSliderVals,
  startReinforcement, startWithdrawal, reinSpeedMult, setMode, setAtkKey, setPick, setSelKey, setPopupPos,
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
    <div className="panel" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9000,maxHeight:mode==="reinforce"?"75vh":"50vh",display:"flex",flexDirection:"column",borderRadius:"10px 10px 0 0",animation:"fadeUp .18s ease",boxShadow:"0 -6px 32px rgba(0,0,0,.95)",paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>

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

      <div className="scr" style={{flex:1,overflowY:"auto",padding:"10px 14px",paddingBottom: mode==="reinforce" ? 70 : 10}}>

        {/* ── REINFORCE / WITHDRAW ── */}
        {mode==="reinforce" && reinCmd && (() => {
          const cap       = cmdCommand(reinCmd.lvl||5, bldgs.commandcenter||0, reinCmd.commandBonus??0);
          const inTransit = (reinMarches||[]).filter(r => r.cmdUid === reinCmd.uid && !r.returning)
                              .reduce((s, r) => s + r.amount, 0);
          const { room, available, maxAdd } = reinforcementRoom({ cmd: reinCmd, commandCap: cap, pool: troopCounts || {}, inTransit });
          const sk        = `rein_${reinCmd.uid}`;
          const sv        = Math.min(sliderVals[sk]??0, maxAdd);
          // Use shared formula — matches the actual timer in useReinforcements.
          const stepMs    = reinforcementStepMs(reinCmd, applyGearToCmd(reinCmd, gearInventory).spd, reinSpeedMult);
          const path      = bfsPath(hqKey, reinCmd.tk);
          const estSecs   = path ? Math.ceil((path.length-1)*stepMs/1000) : "?";

          // Slots for the withdraw section
          const slots = reinCmd.troopSlots?.length
            ? reinCmd.troopSlots
            : (reinCmd.troopBranch ? [{ branch: reinCmd.troopBranch, troops: reinCmd.troops||0 }] : []);
          const selSlotKey  = `wdslot_${reinCmd.uid}`;
          const wdSlotIdx   = sliderVals[selSlotKey] ?? 0;
          const wdSlot      = slots[wdSlotIdx] || slots[0];
          const wdMax       = wdSlot?.troops || 0;
          const wdKey       = `wd_${reinCmd.uid}`;
          const wdAmt       = Math.min(sliderVals[wdKey]??0, wdMax);

          const Slider = ({ value, max, skKey, color="#4080ff" }) => {
            const pct = max > 0 ? value / max : 0;
            return (
              <div
                style={{width:"100%",height:36,display:"flex",alignItems:"center",marginBottom:6,cursor:"pointer",touchAction:"none",userSelect:"none"}}
                onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const rect=e.currentTarget.getBoundingClientRect(); setSliderVals(v=>({...v,[skKey]:Math.round(Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*max)})); }}
                onPointerMove={e => { e.preventDefault(); if(!(e.buttons>0||e.pressure>0))return; const rect=e.currentTarget.getBoundingClientRect(); setSliderVals(v=>({...v,[skKey]:Math.round(Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*max)})); }}
              >
                <div style={{position:"relative",width:"100%",height:8,background:"rgba(255,255,255,.1)",borderRadius:4,overflow:"visible"}}>
                  <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct*100}%`,background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:4,pointerEvents:"none"}}/>
                  <div style={{position:"absolute",top:"50%",left:`${pct*100}%`,transform:"translate(-50%,-50%)",width:22,height:22,background:color,border:"3px solid #fff",borderRadius:"50%",boxShadow:"0 2px 8px rgba(0,0,0,.5)",pointerEvents:"none"}}/>
                </div>
              </div>
            );
          };

          return (
            <div>
              {/* Commander card */}
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10,padding:"8px 10px",background:"rgba(30,60,120,.12)",border:"1px solid rgba(50,100,200,.3)",borderRadius:5}}>
                {reinCmd.bust ? <img src={reinCmd.bust} alt={reinCmd.n} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/> : <span style={{fontSize:26}}>{reinCmd.icon}</span>}
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,color:"#e0d0c0"}}>{reinCmd.n} <span style={{color:"#f0c040",fontSize:9}}>Lv{reinCmd.lvl||5}</span></div>
                  {slots.map((sl, i) => { const _ti = tbInfo(sl.branch); return _ti ? (
                    <div key={i} style={{fontSize:9,color:_ti.color}}>{_ti.label} · <strong style={{color:"#e0d0c0"}}>{(sl.troops||0).toLocaleString()}</strong></div>
                  ) : null; })}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:9,color:"#6a7a9a",fontFamily:"'Cinzel',serif"}}>Barracks</div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:12,color:available>0?"#88aaff":"#cc3030",fontWeight:700}}>{available.toLocaleString()}</div>
                </div>
              </div>

              {/* ── SEND SECTION ── */}
              <div style={{fontSize:8,color:"#4a8aff",fontFamily:"'Cinzel',serif",letterSpacing:".12em",marginBottom:6}}>▶ SEND REINFORCEMENTS</div>
              {available > 0 ? (
                room > 0 ? (
                  <div style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#6a7a9a",marginBottom:4}}>
                      <span>Troops to send</span>
                      <span style={{color:sv>0?"#88aaff":"#4a5a7a"}}>{sv.toLocaleString()}{sv>0?` · ~${estSecs}s`:""}</span>
                    </div>
                    <Slider value={sv} max={maxAdd} skKey={sk} color="#4080ff"/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#4a4a5a",marginBottom:4}}>
                      <span>0</span><span style={{color:"#5a6a8a"}}>Max: {maxAdd.toLocaleString()}</span><span>{maxAdd.toLocaleString()}</span>
                    </div>
                    {sv===0 && <div style={{fontSize:8,color:"#4a4a5a",fontStyle:"italic",textAlign:"center"}}>Slide right to set amount</div>}
                  </div>
                ) : (
                  <div style={{padding:"8px 10px",background:"rgba(200,80,30,.08)",border:"1px solid rgba(200,80,30,.2)",borderRadius:4,fontSize:9,color:"#cc6030",fontFamily:"'Crimson Pro',serif",marginBottom:14}}>
                    Army at full capacity ({cap.toLocaleString()}).
                  </div>
                )
              ) : (
                <div style={{padding:"8px 10px",background:"rgba(200,50,50,.08)",border:"1px solid rgba(200,50,50,.2)",borderRadius:4,fontSize:9,color:"#cc6060",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",marginBottom:14}}>
                  Barracks is empty — train more troops first.
                </div>
              )}

              {/* ── WITHDRAW SECTION ── */}
              {slots.length > 0 && wdMax > 0 && (
                <div style={{borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:10,marginBottom:10}}>
                  <div style={{fontSize:8,color:"#cc7030",fontFamily:"'Cinzel',serif",letterSpacing:".12em",marginBottom:6}}>◀ WITHDRAW TROOPS</div>
                  {/* Slot picker — only show when multiple slots */}
                  {slots.length > 1 && (
                    <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                      {slots.map((sl, i) => {
                        const _ti = tbInfo(sl.branch);
                        return (
                          <div key={i}
                            onClick={() => setSliderVals(v=>({...v,[selSlotKey]:i,[wdKey]:0}))}
                            style={{padding:"5px 10px",borderRadius:4,border:`1px solid ${wdSlotIdx===i?"#cc7030":"rgba(255,255,255,.1)"}`,background:wdSlotIdx===i?"rgba(200,80,30,.15)":"rgba(255,255,255,.04)",cursor:"pointer",fontSize:9,color:wdSlotIdx===i?"#e8a060":"#8a8a9a"}}>
                            Slot {i+1}{_ti ? `: ${(sl.troops||0).toLocaleString()}` : ""}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#6a7a9a",marginBottom:4}}>
                    <span>Troops to withdraw</span>
                    <span style={{color:wdAmt>0?"#e8a060":"#4a5a7a"}}>{wdAmt.toLocaleString()}{wdAmt>0?` · ~${estSecs}s back`:""}</span>
                  </div>
                  <Slider value={wdAmt} max={wdMax} skKey={wdKey} color="#cc7030"/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#4a4a5a"}}>
                    <span>0</span><span style={{color:"#5a6a8a"}}>Max: {wdMax.toLocaleString()}</span><span>{wdMax.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button className="btn" onClick={() => { setMode("view"); setReinCmd(null); }}
                style={{marginTop:8,padding:"7px 16px",background:"none",border:"1px solid #2a2a2a",color:"#555",fontSize:10}}>← Cancel</button>
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
                      {cmd.bust
                        ? <img src={cmd.bust} alt={cmd.n} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",margin:"0 auto"}} />
                        : <div style={{fontSize:22}}>{cmd.icon}</div>
                      }
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"#e0d0c0",fontWeight:700}}>{cmd.n}</div>
                      <div style={{fontSize:8,color:"#3daa60"}}>{((cmd.troopSlots?.reduce((s,sl)=>s+(sl.troops||0),0)) || cmd.troops||0).toLocaleString()} troops</div>
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
      {/* Sticky confirm buttons — send OR withdraw, whichever has a value */}
      {mode==="reinforce" && reinCmd && (() => {
        const sk2   = `rein_${reinCmd.uid}`;
        const sv2   = sliderVals[sk2] ?? 0;
        const wdKey2 = `wd_${reinCmd.uid}`;
        const wdAmt2 = sliderVals[wdKey2] ?? 0;
        const wdSlotKey2 = `wdslot_${reinCmd.uid}`;
        const wdIdx2 = sliderVals[wdSlotKey2] ?? 0;
        if (sv2 <= 0 && wdAmt2 <= 0) return null;
        return (
          <div style={{padding:"10px 14px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 10px)",borderTop:"1px solid rgba(255,255,255,.06)",flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
            {sv2 > 0 && (
              <button onClick={() => startReinforcement(reinCmd, sv2)}
                style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,rgba(30,60,120,.7),rgba(30,60,120,.4))",border:"1px solid rgba(50,100,220,.6)",borderRadius:6,color:"#88aaff",fontSize:12,fontWeight:700,fontFamily:"'Cinzel',serif"}}>
                🚶 Send {sv2.toLocaleString()} reinforcements
              </button>
            )}
            {wdAmt2 > 0 && (
              <button onClick={() => { startWithdrawal(reinCmd, wdIdx2, wdAmt2); setSliderVals(v=>({...v,[wdKey2]:0})); }}
                style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,rgba(120,60,20,.7),rgba(120,60,20,.4))",border:"1px solid rgba(200,100,40,.6)",borderRadius:6,color:"#e8a060",fontSize:12,fontWeight:700,fontFamily:"'Cinzel',serif"}}>
                ↩ Withdraw {wdAmt2.toLocaleString()} troops
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
});
