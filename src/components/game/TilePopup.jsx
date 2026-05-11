import { memo, useState } from "react";
import { FACTION_TROOPS, COMMAND_COST } from "../../../shared/constants/troops.js";
import { cmdCommand } from "../../../shared/constants/buildings.js";

// Resolve troopBranch to display label + color
function tbInfo(tb) {
  if (!tb) return null;
  const f = FACTION_TROOPS[tb.faction];
  const b = f?.branches.find(b => b.key === tb.branch);
  const t = b?.tiers[tb.tier ?? 0];
  if (!b || !t) return null;
  return { label: `${b.label} 2014 ${t.label}`, color: "#c8a060", size: b.size, dmgType: b.dmgType };
}
// Normalize slots for backward compat
function normSlots(cmd) {
  if (cmd?.troopSlots && cmd.troopSlots.length > 0) return cmd.troopSlots;
  if (cmd?.troopBranch) return [{ branch: cmd.troopBranch, troops: cmd.troops ?? 0 }];
  return [];
}
// Total troops across all slots
function totalTroops(cmd) {
  return normSlots(cmd).reduce((s, sl) => s + (sl.troops || 0), 0) || cmd?.troops || 0;
}
// All faction branches flat list
function allFactionBranches(facKey) {
  const results = [];
  for (const [fk, fDef] of Object.entries(FACTION_TROOPS)) {
    for (const b of (fDef.branches || [])) {
      results.push({ faction: fk, branch: b.key, label: b.label, factionLabel: fDef.name || fk, tiers: b.tiers, size: b.size });
    }
  }
  return results;
}

import { TERR } from "../../../shared/constants/terrain.js";
import { RSS, POWER_DEFS, SIEGE_BASE, HQP, TC } from "../../../shared/constants/map.js";
import { garrisonDefCmd } from "../../../shared/utils/battle.js";

export default memo(function TilePopup({
  selKey, selTile, popupPos, popupMode, setPopupMode,
  onEnterHQ,
  cmds, cmdsOnSel, marchingToSel, canAtk,
  barracksPool, editArmyCmd, setEditArmyCmd,
  sliderVals, setSliderVals,
  deletingTiles, deletingSecsLeft, setDeletingTiles, setDeletingSecsLeft,
  setSelKey, setPopupPos,
  setAtkKey, setMode, setPick, setMvCmd, setReinCmd,
  recallMarch, recallStationary,
  setBarracks, setCmds,
  assignTroops, setTroopSlot, returnTroops,
  nowTick, playerHqKey, facKey, bldgs,
}) {
  if (!selKey || !selTile || !popupPos) return null;

  // ── HQ popup — Enter or Summon ──
  if (popupMode === "hqEnter" || popupMode === "hqSummon") {
    const closeHqPopup = () => { setSelKey(null); setPopupPos(null); setPopupMode("main"); };

    // All player commanders that are stationary (not marching) and NOT already at HQ
    const { HQP } = (typeof window !== "undefined" && window.__GAME_CONSTS__) || {};
    const playerHqKeyLocal = playerHqKey;
    const stationaryCmds = cmds.filter(c =>
      c.owner === "player" && !c.march && c.tk && c.tk !== playerHqKeyLocal
    );

    return (
      <>
      <div style={{ position:"fixed", inset:0, zIndex:499 }} onClick={closeHqPopup} />
      <div style={{
        position:"fixed", left:popupPos.x, top:popupPos.y,
        width:130, zIndex:500,
        background:"rgba(5,7,11,.97)",
        border:"1px solid #8a6020",
        borderRadius:6,
        boxShadow:"0 4px 20px rgba(0,0,0,.9), 0 0 0 1px rgba(200,160,64,.15)",
        animation:"fadeUp .15s ease",
        pointerEvents:"auto",
        overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          padding:"6px 8px 4px",
          borderBottom:"1px solid #2a1e08",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          {popupMode === "hqSummon" && (
            <button className="btn" onClick={() => setPopupMode("hqEnter")}
              style={{background:"none",border:"none",color:"#6a5a4a",fontSize:10,padding:"0 2px",cursor:"pointer",marginRight:4}}>←</button>
          )}
          <span style={{fontFamily:"'Cinzel',serif", fontSize:10, color:"#c8a060", letterSpacing:".05em", flex:1}}>
            {popupMode === "hqSummon" ? "↩ Summon Commander" : "🏰 Headquarters"}
          </span>
          <button className="btn" onClick={closeHqPopup}
            onTouchEnd={e => { e.preventDefault(); closeHqPopup(); }}
            style={{background:"none",border:"none",color:"#6a5a4a",fontSize:16,minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",margin:"-6px -4px"}}>✕</button>
        </div>

        {/* Enter / Summon buttons */}
        {popupMode === "hqEnter" && (
          <div style={{padding:"8px", display:"flex", flexDirection:"column", gap:5}}>
            <button
              onClick={() => { onEnterHQ(); setSelKey(null); setPopupPos(null); setPopupMode("main"); }}
              style={{
                width:"100%", padding:"7px 0",
                background:"linear-gradient(160deg,#3a2808,#1e1404)",
                border:"1px solid #8a6020",
                borderRadius:4,
                color:"#f0c060", fontFamily:"'Cinzel',serif", fontSize:11,
                letterSpacing:".06em", cursor:"pointer",
                boxShadow:"inset 0 1px 0 rgba(255,255,255,.08)",
              }}
            >⚔ Enter</button>
            <button
              onClick={() => setPopupMode("hqSummon")}
              style={{
                width:"100%", padding:"7px 0",
                background:"linear-gradient(160deg,#082838,#041824)",
                border:"1px solid #206880",
                borderRadius:4,
                color:"#60c0f0", fontFamily:"'Cinzel',serif", fontSize:11,
                letterSpacing:".06em", cursor:"pointer",
                boxShadow:"inset 0 1px 0 rgba(255,255,255,.08)",
              }}
            >↩ Summon</button>
          </div>
        )}

        {/* Summon commander picker */}
        {popupMode === "hqSummon" && (
          <div style={{padding:"6px 7px", maxHeight:220, overflowY:"auto"}}>
            {stationaryCmds.length === 0 ? (
              <div style={{fontSize:8, color:"#5a4a3a", fontFamily:"'Crimson Pro',serif", fontStyle:"italic", textAlign:"center", padding:"10px 0"}}>
                No commanders available to recall
              </div>
            ) : stationaryCmds.map(cmd => (
              <div key={cmd.uid}
                onClick={() => { recallStationary(cmd.uid); closeHqPopup(); }}
                style={{
                  display:"flex", alignItems:"center", gap:6, marginBottom:4,
                  padding:"4px 6px",
                  background:"rgba(96,192,240,.06)",
                  border:"1px solid rgba(96,192,240,.2)",
                  borderRadius:4, cursor:"pointer",
                }}>
                <span style={{fontSize:14}}>{cmd.icon}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"'Cinzel',serif", fontSize:8, color:"#c0e0f8", fontWeight:700,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{cmd.n}</div>
                  <div style={{fontSize:7, color:"#4a7a8a"}}>
                    Lv{cmd.lvl||5} · {totalTroops(cmd).toLocaleString()} troops
                  </div>
                </div>
                <span style={{fontSize:9, color:"#60c0f0", flexShrink:0}}>↩</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  const titleColor = selTile.owner==="player" ? TC.player.dot
    : selTile.owner==="ai" ? "#dd4422"
    : selTile.owner ? TC[selTile.owner]?.dot||"#c8a060"
    : "#a09080";

  const titleLabel = popupMode==="editArmy" ? "🔧 Edit Army"
    : popupMode==="recallPick" ? "↩ Recall Commander"
    : selTile.isWin   ? "⚜ The Holy Grail"
    : selTile.isPeninsulaGate ? `🚧 ${selTile.keepName || "Peninsula Gate"}`
    : selTile.isGate && selTile.crossingType === "crossing"   ? `🌊 ${selTile.keepName || "River Crossing"}`
    : selTile.isGate && selTile.crossingType === "tollbridge" ? `⌒ ${selTile.keepName || "Toll Bridge"}`
    : selTile.isGate && selTile.crossingType === "tunnel"     ? `⛰ ${selTile.keepName || "Tunnel Gate"}`
    : selTile.isKeep  ? `🏰 ${selTile.keepName || selTile.regionName + " Keep"}`
    : selTile.isRuin  ? "🏚 Ruin"
    : selTile.regionName ? `${TERR[selTile.terrain]?.lbl||"Tile"} · ${selTile.regionName}`
    : TERR[selTile.terrain]?.lbl||"Tile";

  const close = () => { setSelKey(null); setPopupPos(null); setPopupMode("main"); setEditArmyCmd(null); };

  return (
    <div style={{position:"fixed",left:popupPos.x,top:popupPos.y,width:180,zIndex:500,background:"rgba(5,7,11,.96)",border:"1px solid #2a2418",borderRadius:6,boxShadow:"0 4px 20px rgba(0,0,0,.85)",animation:"fadeUp .15s ease",pointerEvents:"auto"}}>

      {/* Header */}
      <div style={{padding:"5px 7px 4px",borderBottom:"1px solid #1e1810",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {popupMode!=="main" && (
            <button className="btn" onClick={() => { setPopupMode("main"); setEditArmyCmd(null); }}
              style={{background:"none",border:"none",color:"#6a5a4a",fontSize:10,padding:"0 2px"}}>←</button>
          )}
          <span style={{fontFamily:"'Cinzel',serif",fontSize:9,fontWeight:700,color:titleColor}}>{titleLabel}</span>
          {popupMode==="main" && selTile.owner==="ai" && (
            <span style={{fontSize:7,color:"#dd4422",fontFamily:"'Cinzel',serif",fontWeight:700,background:"rgba(200,50,30,.15)",padding:"1px 4px",borderRadius:3,border:"1px solid rgba(200,50,30,.35)"}}>☠ ENEMY</span>
          )}
          {popupMode==="main" && selTile.powerLevel && !selTile.isHQ && (
            <span style={{fontSize:7,color:POWER_DEFS[selTile.powerLevel]?.color,fontFamily:"'Cinzel',serif",fontWeight:700,background:`${POWER_DEFS[selTile.powerLevel]?.color}18`,padding:"1px 4px",borderRadius:3,border:`1px solid ${POWER_DEFS[selTile.powerLevel]?.color}40`}}>
              ⚡ {POWER_DEFS[selTile.powerLevel]?.label}
            </span>
          )}
          {popupMode==="main" && selTile.isPeninsulaGate && selTile.homeFaction && (
            <span style={{fontSize:7,color:"#c8a060",fontFamily:"'Cinzel',serif",fontWeight:700,background:"rgba(200,160,60,.12)",padding:"1px 4px",borderRadius:3,border:"1px solid rgba(200,160,60,.35)"}}>
              🔒 {selTile.homeFaction} only
            </span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {popupMode==="main" && (
            <span style={{fontSize:7,color:"#6a9a6a",fontFamily:"'Cinzel',serif",letterSpacing:".05em",background:"rgba(106,154,106,.1)",padding:"1px 5px",borderRadius:3,border:"1px solid rgba(106,154,106,.28)",lineHeight:"14px"}}>
              {selTile.c},{selTile.r}
            </span>
          )}
          <button className="btn" onClick={close}
            onTouchEnd={e => { e.preventDefault(); close(); }}
            style={{background:"none",border:"none",color:"#4a4040",fontSize:16,minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",margin:"-6px -4px"}}>✕</button>
        </div>
      </div>

      <div style={{padding:"5px 7px"}}>

        {/* ── MAIN MODE ── */}
        {popupMode==="main" && (<>

          {/* Resource */}
          {selTile.rss && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"3px 6px",background:"rgba(255,255,255,.03)",borderRadius:3,border:"1px solid #1e1810"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:10}}>{RSS[selTile.rss].icon}</span>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:RSS[selTile.rss].col,fontWeight:700}}>{RSS[selTile.rss].lbl}</span>
              </div>
              <span style={{fontSize:7,color:"#6a7a5a",fontFamily:"'Cinzel',serif"}}>
                +{selTile.powerLevel === 1
                  ? "60/hr (all)"
                  : `${({2:288,3:336,4:432,5:504,6:672,7:768,8:864,9:960}[selTile.powerLevel]??288)}/hr`}
              </span>
            </div>
          )}

          {/* Siege bar */}
          {!selTile.isHQ && (() => {
            const sv = selTile.siege ?? SIEGE_BASE;
            const sm = selTile.siegeMax ?? SIEGE_BASE;
            const pct = Math.round((sv/sm)*100);
            const isDefeated = selTile.garrisonDefeated;
            const resetSecs = selTile.resetAt ? Math.max(0,Math.ceil((selTile.resetAt-Date.now())/1000)) : null;
            return (
              <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(255,255,255,.03)",borderRadius:3,border:`1px solid ${isDefeated?"rgba(240,192,64,.3)":"#1e1810"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:isDefeated?"#f0c040":"#7a6a5a",fontWeight:700}}>🏰 SIEGE{isDefeated?" — GARRISON DEFEATED":""}</span>
                  <span style={{fontSize:7,color:pct>66?"#3daa60":pct>33?"#d0a030":"#cc3030",fontFamily:"'Cinzel',serif",fontWeight:700}}>{sv}/{sm}</span>
                </div>
                <div style={{height:3,background:"#181820",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>66?"#3daa60":pct>33?"#d0a030":"#cc3030",borderRadius:2,transition:"width .3s"}}/>
                </div>
                {isDefeated && resetSecs!==null && (
                  <div style={{fontSize:6,color:"#8a7040",fontFamily:"'Crimson Pro',serif",marginTop:2}}>Resets in {resetSecs}s</div>
                )}
              </div>
            );
          })()}

          {/* Enemy garrison */}
          {selTile.owner !== "player" && (selTile.defCmd || selTile.owner==="ai") && (() => {
            const isAiOwned = selTile.owner==="ai";
            const aiCmdPresent = isAiOwned && cmds.some(c => c.owner==="ai" && c.tk===selKey && !c.march);
            const dc = (isAiOwned && !aiCmdPresent) ? garrisonDefCmd(selTile, facKey) : selTile.defCmd;
            if (!dc) return null;
            const tt = tbInfo(dc.troopBranch);
            return (
              <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(200,40,40,.06)",borderRadius:3,border:"1px solid rgba(200,40,40,.2)"}}>
                <div style={{fontSize:7,color:"#8a5a4a",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:3}}>
                  {isAiOwned ? (aiCmdPresent?"ENEMY COMMANDER":"GARRISON") : "GARRISON"}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{textAlign:"center"}}><div style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#e07050",fontWeight:700}}>Lv{dc.lvl??"?"}</div><div style={{fontSize:6,color:"#5a4a40"}}>Level</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontFamily:"'Cinzel',serif",fontSize:10,color:"#e07050",fontWeight:700}}>{(dc.troops??0).toLocaleString()}</div><div style={{fontSize:6,color:"#5a4a40"}}>Troops</div></div>
                  {/* Fog of war: never show enemy commander name or troop type */}
                  {!isAiOwned && tt && <div style={{display:"flex",alignItems:"center",gap:3,marginLeft:"auto"}}><span style={{fontSize:7,color:tt.color,fontFamily:"'Cinzel',serif"}}>{tt.label}</span></div>}
                  {isAiOwned && <div style={{marginLeft:"auto",fontSize:7,color:"#5a4040",fontFamily:"'Cinzel',serif",fontStyle:"italic"}}>Enemy Commander</div>}
                </div>
              </div>
            );
          })()}

          {/* Player commanders on tile */}
          {selTile.owner==="player" && cmdsOnSel.length>0 && (
            <div style={{marginBottom:4}}>
              <div style={{fontSize:7,color:"#4a6a4a",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:3}}>COMMANDERS</div>
              {cmdsOnSel.map(cmd => {
                const tt = tbInfo(cmd.troopBranch);
                const stam = cmd.stamina ?? 200;
                const stamPct = Math.max(0, Math.min(100, (stam / 200) * 100));
                const stamColor = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
                return (
                  <div key={cmd.uid} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2,padding:"2px 4px",background:"rgba(60,170,80,.07)",borderRadius:3,border:"1px solid rgba(60,170,80,.2)"}}>
                    <span style={{fontSize:10}}>{cmd.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:"#90c870",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cmd.n}</span>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:6,color:"#f0c040",flexShrink:0}}>Lv{cmd.lvl||5}</span>
                      </div>
                      {normSlots(cmd).map((sl, i) => { const _tt = tbInfo(sl.branch); return _tt ? <div key={i} style={{fontSize:7,color:_tt.color}}>{_tt.label} ×{(sl.troops||0).toLocaleString()}</div> : null; })}
                      {/* Stamina bar */}
                      <div style={{display:"flex",alignItems:"center",gap:3,marginTop:2}}>
                        <span style={{fontSize:5,color:"#7a9a7a"}}>⚡</span>
                        <div style={{flex:1,height:3,background:"rgba(0,0,0,.4)",borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${stamPct}%`,background:stamColor,borderRadius:2,transition:"width .3s"}}/>
                        </div>
                        <span style={{fontSize:5,color:stamColor,fontFamily:"'Cinzel',serif",flexShrink:0}}>{Math.floor(stam)}</span>
                      </div>
                    </div>
                    {cmd.march && <div style={{fontSize:6,color:"#f0c040",fontFamily:"'Cinzel',serif",flexShrink:0}}>→</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Draw rematch timer */}
          {cmdsOnSel.filter(c => c.drawTimer && c.drawTile === selKey).map(cmd => {
            const secsLeft = Math.max(0, Math.ceil((cmd.drawTimer - (nowTick || Date.now())) / 1000));
            const mins = Math.floor(secsLeft / 60);
            const secs = secsLeft % 60;
            return (
              <div key={cmd.uid} style={{marginBottom:4,padding:"4px 6px",background:"rgba(192,160,0,.1)",borderRadius:3,border:"1px solid rgba(192,160,0,.4)"}}>
                <div style={{fontSize:7,color:"#c8a020",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:3}}>⚔ DRAW — REMATCH PENDING</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:10}}>{cmd.icon}</span>
                  <span style={{fontSize:7,color:"#d0b840",fontFamily:"'Cinzel',serif",flex:1}}>{cmd.n}</span>
                  <span style={{fontSize:8,color:"#e0c040",fontWeight:700,minWidth:32,textAlign:"right"}}>
                    {mins}:{secs.toString().padStart(2,"0")}
                  </span>
                  <button className="btn" onClick={() => recallStationary(cmd.uid)}
                    style={{padding:"2px 5px",fontSize:6,background:"rgba(180,60,60,.2)",border:"1px solid #cc4444",color:"#ff9090",flexShrink:0}}>
                    ↩ Recall
                  </button>
                </div>
              </div>
            );
          })}

          {/* En route */}
          {marchingToSel.length>0 && (
            <div style={{marginBottom:4,padding:"3px 6px",background:"rgba(240,192,64,.05)",borderRadius:3,border:"1px solid rgba(240,192,64,.2)"}}>
              <div style={{fontSize:7,color:"#c8a040",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:2}}>EN ROUTE</div>
              {marchingToSel.map(cmd => {
                const eta = Math.ceil((cmd.march.path.length-cmd.march.step-1)*cmd.march.stepMs/1000);
                return (
                  <div key={cmd.uid} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                    <span style={{fontSize:10}}>{cmd.icon}</span>
                    <span style={{fontSize:7,color:"#c0a860",fontFamily:"'Cinzel',serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cmd.n}</span>
                    <span style={{fontSize:6,color:cmd.march.type==="attack"?"#ff6666":"#44cc88",flexShrink:0}}>~{eta}s</span>
                    <button className="btn" onClick={() => recallMarch(cmd.uid)}
                      style={{padding:"1px 4px",fontSize:6,background:"rgba(200,60,60,.15)",border:"1px solid #cc4444",color:"#ff8888",flexShrink:0}}>↩</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap"}}>
            {selTile.owner!=="player" && canAtk && (() => {
              // Check if best available attacker has ≥20 stamina
              const candidates = cmds.filter(c => c.owner==="player" && !c.march && (c.troops||0)>0);
              const hasStam = candidates.some(c => (c.stamina ?? 200) >= 20);
              return (
                <button className="btn"
                  onClick={() => hasStam ? (setAtkKey(selKey), setMode("pickAttackCmd"), setPick(null)) : null}
                  title={hasStam ? "" : "No commanders with enough stamina (need 20⚡)"}
                  style={{flex:1,padding:"5px 3px",
                    background: hasStam
                      ? "linear-gradient(135deg,rgba(140,20,20,.6),rgba(100,10,10,.4))"
                      : "rgba(60,20,20,.3)",
                    border:`1px solid ${hasStam?"#cc2020":"#553030"}`,
                    color:hasStam?"#f0a0a0":"#7a5050",
                    fontSize:9,fontWeight:700,
                    cursor:hasStam?"pointer":"not-allowed",opacity:hasStam?1:.6}}>
                  ⚔ Attack {!hasStam && <span style={{fontSize:7}}>⚡low</span>}
                </button>
              );
            })()}
            {selTile.owner==="player" && cmdsOnSel.filter(c=>!c.march&&(c.troops||0)>0).length>0 && (() => {
              const mover = cmdsOnSel.filter(c=>!c.march&&(c.troops||0)>0)[0];
              const hasStam = (mover?.stamina ?? 200) >= 10;
              return (
                <button className="btn"
                  onClick={() => hasStam ? (setMvCmd(mover), setMode("selectMarchDest")) : null}
                  title={hasStam ? "" : "Need 10⚡ stamina to move"}
                  style={{flex:1,padding:"5px 3px",
                    background: hasStam
                      ? "linear-gradient(135deg,rgba(20,80,40,.6),rgba(10,60,30,.4))"
                      : "rgba(20,40,20,.3)",
                    border:`1px solid ${hasStam?"#2a8040":"#2a4a2a"}`,
                    color:hasStam?"#80d090":"#507050",
                    fontSize:9,fontWeight:700,
                    cursor:hasStam?"pointer":"not-allowed",opacity:hasStam?1:.6}}>
                  🚶 Move {!hasStam && <span style={{fontSize:7}}>⚡low</span>}
                </button>
              );
            })()}
            {selTile.owner==="player" && cmdsOnSel.some(c=>normSlots(c).length>0&&!c.march) && barracksPool>0 && (
              <button className="btn" onClick={() => { setReinCmd(cmdsOnSel.find(c=>normSlots(c).length>0&&!c.march)); setMode("reinforce"); }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(20,40,120,.6),rgba(10,30,100,.4))",border:"1px solid #2a40cc",color:"#80a0ff",fontSize:9,fontWeight:700}}>🔄</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.some(c=>c.march) && (
              <button className="btn" onClick={() => cmdsOnSel.filter(c=>c.march).forEach(c=>recallMarch(c.uid))}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(120,40,40,.5),rgba(100,20,20,.3))",border:"1px solid #cc4444",color:"#ff9090",fontSize:9,fontWeight:700}}>↩</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.some(c=>!c.march) && selKey !== (playerHqKey || `${HQP.player.c},${HQP.player.r}`) && (
              <button className="btn" onClick={() => {
                const idle = cmdsOnSel.filter(c=>!c.march);
                if (idle.length===1) { recallStationary(idle[0].uid); }
                else { setPopupMode("recallPick"); }
              }}
                style={{flex:1,padding:"5px 3px",background:"linear-gradient(135deg,rgba(100,60,20,.5),rgba(80,40,10,.3))",border:"1px solid #c89030",color:"#f0c040",fontSize:9,fontWeight:700}}>🏰</button>
            )}
            {selTile.owner==="player" && cmdsOnSel.some(c=>(normSlots(c).length>0||c.troopBranch)&&!c.march) && (
              <button className="btn" onClick={() => { setEditArmyCmd(cmdsOnSel.find(c=>(normSlots(c).length>0||c.troopBranch)&&!c.march)); setPopupMode("editArmy"); }}
                style={{flex:"0 0 auto",padding:"5px 7px",background:"linear-gradient(135deg,rgba(60,50,20,.5),rgba(40,30,10,.3))",border:"1px solid #7a6a30",color:"#c0a840",fontSize:11,fontWeight:700}}>🔧</button>
            )}
            {selTile.owner==="player" && !selTile.isHQ && !deletingTiles[selKey] && (
              <button className="btn" onClick={() => {
                setDeletingTiles(p=>({...p,[selKey]:Date.now()}));
                setDeletingSecsLeft(p=>({...p,[selKey]:15}));
              }}
                style={{flex:"0 0 auto",padding:"5px 7px",background:"linear-gradient(135deg,rgba(120,10,10,.6),rgba(80,0,0,.4))",border:"1px solid #cc1010",color:"#ff6060",fontSize:11,fontWeight:700}}>✕</button>
            )}
          </div>

          {/* Abandon countdown */}
          {deletingTiles[selKey] && (
            <div style={{marginTop:6,padding:"5px 6px",background:"rgba(120,10,10,.15)",border:"1px solid #cc1010",borderRadius:4}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:7,color:"#ff6060",fontWeight:700,letterSpacing:".06em"}}>🏳 ABANDONING IN {deletingSecsLeft[selKey]??15}s</span>
                <button className="btn" onClick={() => {
                  setDeletingTiles(p=>{const n={...p};delete n[selKey];return n;});
                  setDeletingSecsLeft(p=>{const n={...p};delete n[selKey];return n;});
                }}
                  style={{padding:"2px 6px",background:"rgba(40,40,40,.6)",border:"1px solid #555",color:"#ccc",fontSize:7,fontWeight:700,borderRadius:3}}>CANCEL</button>
              </div>
              <div style={{height:4,background:"rgba(0,0,0,.4)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${((deletingSecsLeft[selKey]??15)/15)*100}%`,background:"linear-gradient(90deg,#cc1010,#ff4040)",borderRadius:2,transition:"width .25s linear"}}/>
              </div>
            </div>
          )}

          {selTile.owner!=="player" && !canAtk && !selTile.isWin && (
            <div style={{fontSize:7,color:"#5a4a3a",fontFamily:"'Crimson Pro',serif",fontStyle:"italic",marginTop:3,textAlign:"center"}}>Own an adjacent tile to attack</div>
          )}
        </>)}

        {/* ── RECALL PICK ── */}
        {popupMode==="recallPick" && (
          <div>
            <div style={{fontSize:7,color:"#8a7060",fontFamily:"'Cinzel',serif",letterSpacing:".06em",marginBottom:6}}>SELECT COMMANDER TO RECALL</div>
            {cmdsOnSel.filter(c=>!c.march).map(cmd => (
              <div key={cmd.uid} onClick={() => { recallStationary(cmd.uid); setPopupMode("main"); }}
                style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,padding:"4px 6px",background:"rgba(240,192,64,.07)",border:"1px solid rgba(240,192,64,.2)",borderRadius:4,cursor:"pointer"}}>
                <span style={{fontSize:14}}>{cmd.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:8,color:"#e0d0c0",fontWeight:700}}>{cmd.n}</div>
                  <div style={{fontSize:7,color:"#7a7a5a"}}>{normSlots(cmd).length > 0 ? normSlots(cmd).map(sl => tbInfo(sl.branch)?.label + " ×" + (sl.troops||0)).join(", ") : "No troops"}</div>
                </div>
                <span style={{fontSize:8,color:"#f0c040"}}>🏰</span>
              </div>
            ))}
          </div>
        )}

        {/* ── EDIT ARMY ── Multi-slot editor ── */}
        {popupMode==="editArmy" && editArmyCmd && (() => {
          const cmd = editArmyCmd;
          const slots = normSlots(cmd);
          const commandCap = cmdCommand(cmd.lvl||5, bldgs?.commandcenter||0, (cmd.cls==="leader"&&(cmd.lvl||5)>=25)?500:0);
          const usedCmd = slots.reduce((sum, sl) => {
            const bSize = sl.branch ? (FACTION_TROOPS[sl.branch.faction]?.branches?.find(b=>b.key===sl.branch.branch)?.size??"small") : "small";
            return sum + (sl.troops||0) * (COMMAND_COST[bSize]??1);
          }, 0);
          const branches = allFactionBranches(cmd.faction);
          // 3 slot rows: show existing + one empty if < 3 slots
          const displaySlots = slots.length < 3 ? [...slots, null] : slots;
          return (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,padding:"4px 6px",background:"rgba(60,170,80,.07)",borderRadius:3,border:"1px solid rgba(60,170,80,.2)"}}>
                <span style={{fontSize:16}}>{cmd.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:8,color:"#90c870",fontWeight:700}}>{cmd.n}</div>
                  <div style={{fontSize:7,color:"#7a6a50"}}>Cmd: {usedCmd}/{commandCap}</div>
                </div>
                <button className="btn" onClick={() => { if(setTroopSlot) { normSlots(cmd).forEach((_,i) => setTroopSlot(cmd.uid, i, null, 0)); } setPopupMode("main"); setEditArmyCmd(null); }}
                  style={{padding:"2px 6px",fontSize:7,background:"rgba(180,40,40,.2)",border:"1px solid #cc4444",color:"#dd6666"}}>Clear All</button>
              </div>
              {displaySlots.map((sl, idx) => {
                const sk = `ea_${cmd.uid}_${idx}`;
                const curTroops = sl?.troops || 0;
                const sv = sliderVals[sk] ?? curTroops;
                const branchKey = sl?.branch ? `${sl.branch.faction}:${sl.branch.branch}:${sl.branch.tier??0}` : "";
                const ti = sl?.branch ? tbInfo(sl.branch) : null;
                const bSize = sl?.branch ? (FACTION_TROOPS[sl.branch.faction]?.branches?.find(b=>b.key===sl.branch.branch)?.size??"small") : "small";
                const cmdCost = COMMAND_COST[bSize]??1;
                const otherUsed = slots.reduce((sum, s2, i2) => {
                  if (i2 === idx || !s2) return sum;
                  const s2size = s2.branch ? (FACTION_TROOPS[s2.branch.faction]?.branches?.find(b=>b.key===s2.branch.branch)?.size??"small") : "small";
                  return sum + (s2.troops||0) * (COMMAND_COST[s2size]??1);
                }, 0);
                const maxSlotCmd = Math.max(0, commandCap - otherUsed);
                const maxTroops = Math.floor(maxSlotCmd / cmdCost);
                return (
                  <div key={idx} style={{marginBottom:6,padding:"5px 6px",background:sl?"rgba(255,255,255,.04)":"rgba(255,255,255,.02)",borderRadius:3,border:`1px solid ${sl?"#2a2418":"rgba(255,255,255,.06)"}`}}>
                    <div style={{fontSize:7,color:"#6a5a40",fontFamily:"'Cinzel',serif",marginBottom:3}}>SLOT {idx+1}{idx>=slots.length?" (empty)":""}</div>
                    {/* Branch selector */}
                    <select value={branchKey} onChange={e => {
                      const val = e.target.value;
                      if (!val) {
                        if (setTroopSlot) setTroopSlot(cmd.uid, idx, null, 0);
                        setEditArmyCmd(prev => {
                          const ns = normSlots(prev).filter((_,i)=>i!==idx);
                          return {...prev, troopSlots: ns, troops: ns.reduce((s,sl)=>s+(sl.troops||0),0)};
                        });
                        return;
                      }
                      const [f,b,t] = val.split(":");
                      const newBranch = { faction:f, branch:b, tier:Number(t) };
                      if (setTroopSlot) setTroopSlot(cmd.uid, idx, newBranch, curTroops||1);
                      setEditArmyCmd(prev => {
                        const ns = normSlots(prev);
                        ns[idx] = { branch: newBranch, troops: curTroops||1 };
                        return {...prev, troopSlots: ns.slice(0,3), troops: ns.reduce((s,sl)=>s+(sl.troops||0),0), troopBranch: ns[0]?.branch??null};
                      });
                      setSliderVals(v=>({...v,[sk]: curTroops||1}));
                    }}
                    style={{width:"100%",background:"rgba(0,0,0,.5)",border:"1px solid #2a2418",color:"#c0a870",fontSize:7,borderRadius:3,marginBottom:4,padding:"2px 4px"}}>
                      <option value="">— No troops —</option>
                      {branches.map(br => br.tiers.map((tr, tidx) => (
                        <option key={`${br.faction}:${br.branch}:${tidx}`} value={`${br.faction}:${br.branch}:${tidx}`}>
                          {br.factionLabel} {br.label} T{tidx+1} [{br.size}]
                        </option>
                      )))}
                    </select>
                    {sl && (
                      <>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#6a5a4a",marginBottom:2}}>
                          <span style={{color:ti?.color||"#c8a060"}}>{ti?.label||"?"}</span>
                          <span>{sv.toLocaleString()} / {maxTroops.toLocaleString()} max</span>
                        </div>
                        <input type="range" min={0} max={maxTroops} value={sv}
                          onChange={e => setSliderVals(v=>({...v,[sk]:+e.target.value}))}
                          style={{width:"100%",accentColor:ti?.color||"#c8a060",marginBottom:4}}/>
                        {sv !== curTroops && (
                          <button className="btn" onClick={() => {
                            if (setTroopSlot) setTroopSlot(cmd.uid, idx, sl.branch, sv);
                            setEditArmyCmd(prev => {
                              const ns = normSlots(prev);
                              if (sv === 0) { const filtered = ns.filter((_,i)=>i!==idx); return {...prev, troopSlots: filtered, troops: filtered.reduce((s,x)=>s+(x.troops||0),0)}; }
                              ns[idx] = { ...sl, troops: sv };
                              return {...prev, troopSlots: ns.slice(0,3), troops: ns.reduce((s,x)=>s+(x.troops||0),0)};
                            });
                            setSliderVals(v=>({...v,[sk]:undefined}));
                          }}
                          style={{width:"100%",padding:"4px",fontSize:8,background:"linear-gradient(135deg,rgba(40,100,200,.3),rgba(20,60,150,.2))",border:"1px solid #4466cc",color:"#88aaff",fontWeight:700}}>
                            {sv > curTroops ? `+${sv-curTroops}` : `Remove ${curTroops-sv}`} troops
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
});
