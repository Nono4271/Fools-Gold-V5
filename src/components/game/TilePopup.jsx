import { memo, useState, useCallback, useEffect } from "react";
import { FACTION_TROOPS } from "../../../shared/constants/troops.js";
import { RSS, POWER_DEFS, SIEGE_BASE, HQP, FORT_LEVELS } from "../../../shared/constants/map.js";
import { garrisonDefCmd } from "../../../shared/utils/garrisonUtils.js";
import { FAC } from "../../../shared/constants/factions.js";
import { isTileInRange } from "../../hooks/useForts.js";
import { getTileOwnership } from "./popup/TileInfoPanel.jsx";
import CommanderCard from "./popup/CommanderCard.jsx";
import FortPanel from "./popup/FortPanel.jsx";
import HQPopup from "./popup/HQPopup.jsx";

// Smart positioning hook — places popup on the opposite side of screen from the tile
function usePopupPosition(tileScreenX, tileScreenY, popupW, popupH) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (tileScreenX == null || tileScreenY == null) { setPos(null); return; }
    const sw = window.innerWidth, sh = window.innerHeight;
    const satTop    = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sat")  || "0") || 0;
    const sabBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sab")  || "0") || 0;
    const salLeft   = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sal")  || "0") || 0;
    const sarRight  = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sar")  || "0") || 0;
    const padding = 12;
    const hudH = satTop + 90;
    const padL = salLeft + padding;
    const padR = sarRight + padding;
    const padB = sabBottom + padding;
    const tileLeft = tileScreenX < sw / 2;
    const tileTop  = tileScreenY < sh / 2;
    let x = tileLeft
      ? sw - popupW - padR
      : padL;
    let y = tileTop
      ? sh - popupH - padB
      : hudH;
    x = Math.max(padL, Math.min(sw - popupW - padR, x));
    y = Math.max(hudH, Math.min(sh - popupH - padB, y));
    setPos({ x, y });
  }, [tileScreenX, tileScreenY, popupW, popupH]);
  return pos;
}

export default memo(function TilePopup({
  selKey, selTile, tileScreenX, tileScreenY,
  popupMode, setPopupMode,
  onEnterHQ,
  cmds, cmdsOnSel, marchingToSel, canAtk, crewmatePlayerIds,
  startGuard, cancelGuard, guardedTiles,
  barracksPool, editArmyCmd, setEditArmyCmd,
  sliderVals, setSliderVals,
  deletingTiles, deletingSecsLeft, setDeletingTiles, setDeletingSecsLeft,
  setSelKey,
  setAtkKey, setMode, setPick, setMvCmd, setReinCmd,
  recallMarch, recallStationary,
  setBarracks, setCmds, setTroopSlot,
  startMarch,
  nowTick, playerHqKey, facKey, facName,
  forts, buildFort, upgradeFort, getFortAtTile, startReposition,
  setCmdScreenOpen, setCmdScreenUid,
}) {
  if (!selKey || !selTile) return null;

  const ownership = getTileOwnership(selTile, facKey, crewmatePlayerIds);
  const fort = getFortAtTile?.(selKey);
  const isHqTile = selKey === playerHqKey;

  const onCmdScreenOpen = useCallback((uid) => {
    setCmdScreenUid?.(uid);
    setCmdScreenOpen?.(true);
  }, [setCmdScreenOpen, setCmdScreenUid]);

  const checkRange = useCallback((cmd) => {
    if (!cmd || !forts || !playerHqKey) return true;
    const sf = cmd.stationedFortId ? forts.find(f => f.id === cmd.stationedFortId) : null;
    const stationKey = sf ? sf.tileKey : playerHqKey;
    const [sc, sr] = stationKey.split(",").map(Number);
    return isTileInRange(selKey, [{ c: sc, r: sr }]);
  }, [selKey, forts, playerHqKey]);

  // HQ popup
  if (popupMode === "hqEnter" || popupMode === "hqSummon") {
    const pos = usePopupPosition(tileScreenX, tileScreenY, 200, 220);
    if (!pos) return null;
    return (
      <div style={{ position:"fixed", left:pos.x, top:pos.y, zIndex:500, pointerEvents:"auto" }}>
        <HQPopup
          selTile={selTile} playerHqKey={playerHqKey} facName={facName} facKey={facKey} facDisplayName={FAC[facKey]?.n}
          cmds={cmds} recallStationary={recallStationary}
          onEnterHQ={() => { onEnterHQ(); setSelKey(null); setPopupMode("main"); }}
          popupMode={popupMode} setPopupMode={setPopupMode}
        />
      </div>
    );
  }

  // Recall pick
  if (popupMode === "recallPick") {
    const pos = usePopupPosition(tileScreenX, tileScreenY, 200, 280);
    if (!pos) return null;
    return (
      <div style={{ position:"fixed", left:pos.x, top:pos.y, zIndex:500, pointerEvents:"auto", width:200, background:"rgba(5,7,11,.97)", border:"1px solid #3a6a3a", borderRadius:8, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,.9)" }}>
        <div style={{ padding:"8px 10px", borderBottom:"1px solid #1e2a1e", display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={() => setPopupMode("main")} style={{ background:"none", border:"none", color:"#6a8a6a", fontSize:14, cursor:"pointer", padding:0 }}>←</button>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:10, color:"#90c870", fontWeight:700 }}>Select Commander to Recall</span>
        </div>
        <div style={{ padding:"6px 8px", maxHeight:220, overflowY:"auto", scrollbarWidth:"none" }}>
          {cmdsOnSel.filter(c => !c.march).map(cmd => (
            <div key={cmd.uid} onClick={() => { recallStationary(cmd.uid); setPopupMode("main"); }}
              style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, padding:"5px 7px", background:"rgba(240,192,64,.07)", border:"1px solid rgba(240,192,64,.2)", borderRadius:4, cursor:"pointer" }}>
              <span style={{ fontSize:16 }}>{cmd.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:8, color:"#e0d0c0", fontWeight:700 }}>{cmd.n}</div>
                <div style={{ fontSize:7, color:"#7a7a5a" }}>Lv{cmd.lvl||5} · {(cmd.troops||0).toLocaleString()} troops</div>
              </div>
              <span style={{ fontSize:10, color:"#f0c040" }}>🏰</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Reposition pick
  if (popupMode === "repositionPick") {
    const pos = usePopupPosition(tileScreenX, tileScreenY, 200, 280);
    if (!pos) return null;
    const idleCmds = cmds.filter(c => c.owner==="player" && !c.march && c.tk !== selKey && !c.stranded);
    return (
      <div style={{ position:"fixed", left:pos.x, top:pos.y, zIndex:500, pointerEvents:"auto", width:200, background:"rgba(5,7,11,.97)", border:"1px solid #3a5a6a", borderRadius:8, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,.9)" }}>
        <div style={{ padding:"8px 10px", borderBottom:"1px solid #1e2a2e", display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={() => setPopupMode("main")} style={{ background:"none", border:"none", color:"#6a8a8a", fontSize:14, cursor:"pointer", padding:0 }}>←</button>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:10, color:"#60a0e0", fontWeight:700 }}>Station at Fort Lv{fort?.level}</span>
        </div>
        <div style={{ padding:"6px 8px", maxHeight:220, overflowY:"auto", scrollbarWidth:"none" }}>
          {idleCmds.length === 0 ? (
            <div style={{ fontSize:8, color:"#5a4a3a", fontFamily:"'Crimson Pro',serif", fontStyle:"italic", textAlign:"center", padding:"12px 0" }}>No idle commanders</div>
          ) : idleCmds.map(cmd => (
            <div key={cmd.uid} onClick={() => { startReposition?.(cmd.uid, selKey, fort?.id); setPopupMode("main"); }}
              style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, padding:"5px 7px", background:"rgba(32,96,160,.07)", border:"1px solid rgba(32,96,160,.25)", borderRadius:4, cursor:"pointer" }}>
              <span style={{ fontSize:16 }}>{cmd.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:8, color:"#80b0e0", fontWeight:700 }}>{cmd.n}</div>
                <div style={{ fontSize:7, color:"#4a7a8a" }}>Lv{cmd.lvl||5} · {(cmd.troops||0).toLocaleString()} troops</div>
              </div>
              <span style={{ fontSize:10, color:"#60a0e0" }}>📍</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Edit army
  if (popupMode === "editArmy" && editArmyCmd) {
    const pos = usePopupPosition(tileScreenX, tileScreenY, 220, 380);
    if (!pos) return null;
    const cmd = editArmyCmd;
    const slots = cmd.troopSlots?.length > 0 ? cmd.troopSlots : (cmd.troopBranch ? [{ branch:cmd.troopBranch, troops:cmd.troops||0 }] : []);
    const displaySlots = slots.length < 3 ? [...slots, { branch:null, troops:0 }] : slots;
    const allBranches = Object.entries(FACTION_TROOPS).flatMap(([fk, fd]) =>
      fd.branches.flatMap(b => b.tiers.map((t, ti2) => ({
        label:`${b.label} — ${t.label} (${fd.name})`,
        value:JSON.stringify({ faction:fk, branch:b.key, tier:ti2 }),
      })))
    );
    return (
      <div style={{ position:"fixed", left:pos.x, top:pos.y, zIndex:500, pointerEvents:"auto", width:220, background:"rgba(5,7,11,.97)", border:"1px solid #3a3a2a", borderRadius:8, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,.9)" }}>
        <div style={{ padding:"8px 10px", borderBottom:"1px solid #2a2a1a", display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={() => { setPopupMode("main"); setEditArmyCmd(null); }} style={{ background:"none", border:"none", color:"#8a8a6a", fontSize:14, cursor:"pointer", padding:0 }}>←</button>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:10, color:"#c0a840", fontWeight:700 }}>🔧 Edit Army — {cmd.n}</span>
        </div>
        <div style={{ padding:"8px", maxHeight:360, overflowY:"auto", scrollbarWidth:"none" }}>
          {displaySlots.map((sl, si) => {
            const isNew = si >= slots.length;
            const sk = `ea_${cmd.uid}_${si}`;
            const cur = sl.troops||0;
            const sv = sliderVals[sk] ?? cur;
            const toRemove = cur - sv;
            return (
              <div key={si} style={{ marginBottom:8, padding:"6px 7px", background:"rgba(255,255,255,.02)", borderRadius:5, border:`1px solid ${isNew?"rgba(100,120,80,.2)":"rgba(80,120,60,.3)"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#8a9a7a", letterSpacing:".06em" }}>{isNew?"＋ ADD SLOT":`SLOT ${si+1}`}</span>
                  {!isNew && <button onClick={() => { if(setTroopSlot) setTroopSlot(cmd.uid,si,null,0); setEditArmyCmd(p=>{const ns=(p.troopSlots||[]).filter((_,i)=>i!==si);return{...p,troopSlots:ns,troops:ns.reduce((s,x)=>s+(x.troops||0),0),troopBranch:ns[0]?.branch??null};}); setSliderVals(v=>({...v,[sk]:undefined})); }} style={{ padding:"1px 5px", fontSize:6, background:"rgba(180,40,40,.15)", border:"1px solid #aa3333", color:"#ff8888" }}>✕ Remove</button>}
                </div>
                <select value={sl.branch?JSON.stringify(sl.branch):""} onChange={e=>{ const branch=e.target.value?JSON.parse(e.target.value):null; if(setTroopSlot) setTroopSlot(cmd.uid,si,branch,branch?Math.max(1,cur):0); setEditArmyCmd(p=>{const ns=[...(p.troopSlots||[])];while(ns.length<=si)ns.push({branch:null,troops:0});ns[si]={branch,troops:branch?Math.max(1,cur):0};const filtered=ns.filter(x=>(x.troops||0)>0||x.branch).slice(0,3);return{...p,troopSlots:filtered,troopBranch:filtered[0]?.branch??null,troops:filtered.reduce((s,x)=>s+(x.troops||0),0)};}); setSliderVals(v=>({...v,[sk]:undefined})); }} style={{ width:"100%", marginBottom:4, fontSize:7, background:"#0d0f14", color:"#c0a060", border:"1px solid #3a2e18", borderRadius:3, padding:"2px 4px" }}>
                  <option value="">— Select troop type —</option>
                  {allBranches.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
                {sl.branch && !isNew && (<>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:6, color:"#6a5a4a", fontFamily:"'Cinzel',serif", marginBottom:2 }}>
                    <span>TROOPS</span>
                    <span style={{ color:toRemove>0?"#cc5050":"#3daa60" }}>{sv.toLocaleString()}{toRemove>0&&<span style={{ color:"#cc5050", marginLeft:3 }}>(-{toRemove})</span>}</span>
                  </div>
                  <input type="range" min={0} max={cur} value={sv} onChange={e=>setSliderVals(v=>({...v,[sk]:+e.target.value}))} style={{ width:"100%", accentColor:"#cc5050", marginBottom:4 }}/>
                  {toRemove>0&&<button onClick={() => { if(setTroopSlot) setTroopSlot(cmd.uid,si,sl.branch,sv); setEditArmyCmd(p=>{const ns=[...(p.troopSlots||[])];ns[si]={...ns[si],troops:sv};const filtered=ns.filter(x=>(x.troops||0)>0||x.branch).slice(0,3);return{...p,troopSlots:filtered,troops:filtered.reduce((s,x)=>s+(x.troops||0),0)};}); setSliderVals(v=>({...v,[sk]:undefined})); }} style={{ width:"100%", padding:"4px", background:"linear-gradient(135deg,rgba(150,40,40,.4),rgba(150,40,40,.15))", border:"1px solid #cc4444", color:"#dd6666", fontSize:8, fontWeight:700 }}>Remove {toRemove.toLocaleString()} troops</button>}
                </>)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main popup ──────────────────────────────────────────────────────────────
  const POPUP_W = 210;
  const pos = usePopupPosition(tileScreenX, tileScreenY, POPUP_W, 400);
  if (!pos) return null;

  const isAiOwned = selTile.owner === "ai";
  const isNeutral = !selTile.owner;
  const liveAiCmd = isAiOwned ? cmds.find(c => c.owner==="ai" && c.tk===selKey && !c.march) : null;
  const garrisonCmd = (isAiOwned||isNeutral) ? garrisonDefCmd(selTile, facKey) : selTile.defCmd;
  const totalWaves = selTile.garrisonWaves ?? ((selTile.powerLevel>=10||selTile.isGate||selTile.isKeep)?2:1);
  const defeatedWaves = selTile.defeatedWaves?.length ?? 0;

  const attackCandidates = cmds.filter(c => c.owner==="player" && !c.march && (c.troops||0)>0);
  const bestAtkCmd = attackCandidates.find(c => (c.stamina??200)>=20);
  const hasAtkStam = !!bestAtkCmd;
  const atkInRange = checkRange(bestAtkCmd);
  const canAtkNow = hasAtkStam && atkInRange && canAtk;

  const bestMvCmd = attackCandidates.find(c => (c.stamina??200)>=10);
  const hasMvStam = !!bestMvCmd;
  const mvInRange = checkRange(bestMvCmd);
  const canMoveNow = hasMvStam && mvInRange;

  const idleCmdsOnSel = cmdsOnSel.filter(c => !c.march);
  const marchingCmdsOnSel = cmdsOnSel.filter(c => c.march);

  const borderColor = ownership==="player"?"#3a6a3a":ownership==="crew"?"#204080":ownership==="ally"?"#602080":"#802020";

  // Commander card goes on the OPPOSITE side from the tile info popup
  const sw = window.innerWidth, sh = window.innerHeight;
  const tileLeft = tileScreenX != null && tileScreenX < sw / 2;
  const CMD_W = 210;
  const satL = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sal") || "0") || 0;
  const satR = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sar") || "0") || 0;
  const satB = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sab") || "0") || 0;
  const cmdPad = 12;
  const cmdX = tileLeft ? satL + cmdPad : sw - CMD_W - satR - cmdPad;
  const cmdY = Math.max(90, Math.min(sh - 320 - satB, (tileScreenY ?? sh / 2) - 100));

  return (
    <>
    <div style={{ position:"fixed", left:pos.x, top:pos.y, width:POPUP_W, zIndex:500, pointerEvents:"auto", display:"flex", flexDirection:"column", gap:6, maxHeight:"80vh", overflowY:"auto", scrollbarWidth:"none", animation:"fadeUp .15s ease" }}>

      {/* Tile info card */}
      <div style={{ position:"relative", background:"rgba(5,7,11,.97)", border:`1px solid ${borderColor}`, borderRadius:8, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,.9)" }}>

        {/* Header */}
        <div style={{ padding:"8px 10px 6px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, fontWeight:700, color:ownership==="player"?"#c8f0c8":ownership==="crew"?"#80c0ff":ownership==="ally"?"#c080ff":ownership==="enemy"?"#ff8080":"#c8a060", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {selTile.isWin?"⚜ The Holy Grail":selTile.isGate&&selTile.crossingType==="crossing"?`🌊 ${selTile.keepName||"River Crossing"}`:selTile.isGate&&selTile.crossingType==="tunnel"?`⛰ ${selTile.keepName||"Tunnel Gate"}`:selTile.isKeep?`🏰 ${selTile.keepName||selTile.regionName+" Keep"}`:selTile.isRuin?"🏚 Ruin":selTile.regionName||"Tile"}
            </div>
            <div style={{ fontSize:7, color:"#5a5a6a", marginTop:1 }}>
              {selTile.c},{selTile.r}
              {selTile.powerLevel&&!selTile.isHQ&&<span style={{ marginLeft:5, color:POWER_DEFS[selTile.powerLevel]?.color }}>⚡ {POWER_DEFS[selTile.powerLevel]?.label}</span>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, marginLeft:6 }}>
            {ownership!=="player"&&ownership!=="neutral"&&(
              <div style={{ fontSize:7, fontFamily:"'Cinzel',serif", fontWeight:700, letterSpacing:".05em", padding:"2px 6px", borderRadius:4, background:ownership==="crew"?"rgba(20,80,200,.25)":ownership==="ally"?"rgba(120,20,200,.25)":"rgba(200,20,20,.25)", border:`1px solid ${ownership==="crew"?"#2060cc":ownership==="ally"?"#8020cc":"#cc2020"}`, color:ownership==="crew"?"#60a0ff":ownership==="ally"?"#c060ff":"#ff6060" }}>
                {ownership==="crew"?"CREW":ownership==="ally"?"ALLY":"ENEMY"}
              </div>
            )}
          </div>
        </div>

        {/* Resource */}
        {selTile.rss&&(
          <div style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            {selTile.powerLevel===1 ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 12px" }}>
                {Object.entries(RSS).map(([key,r])=>(
                  <div key={key} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:16 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:r.col, fontWeight:700 }}>{r.lbl}</div>
                      <div style={{ fontSize:8, color:"#7a8a6a" }}>+50/hr</div>
                    </div>
                  </div>
                ))}
              </div>
            ):(
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:18 }}>{RSS[selTile.rss].icon}</span>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:10, color:RSS[selTile.rss].col, fontWeight:700 }}>{RSS[selTile.rss].lbl}</span>
                </div>
                <span style={{ fontSize:10, color:"#7a8a6a" }}>+{({2:240,3:280,4:360,5:420,6:560,7:640,8:720,9:800,10:1000,11:1200,12:1400,13:1600}[selTile.powerLevel]??240)}/hr</span>
              </div>
            )}
          </div>
        )}

        {/* Siege bar */}
        {!selTile.isHQ&&(()=>{
          const sv=selTile.siege??SIEGE_BASE, sm=selTile.siegeMax??SIEGE_BASE;
          const pct=Math.round((sv/sm)*100);
          const totalW=selTile.garrisonWaves??1, defCount=selTile.defeatedWaves?.length??0;
          const barColor=pct>66?"#3daa60":pct>33?"#d0a030":"#cc3030";
          const resetSecs=selTile.resetAt?Math.max(0,Math.ceil((selTile.resetAt-Date.now())/1000)):null;
          return (
            <div style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:"#6a6a7a", letterSpacing:".04em" }}>🛡 SIEGE{defCount>0?` · WAVE ${defCount}/${totalW}`:""}</span>
                <span style={{ fontSize:10, color:barColor, fontWeight:700 }}>{sv}/{sm}</span>
              </div>
              <div style={{ height:7, background:"#0e1018", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:3, transition:"width .3s" }}/>
              </div>
              {totalW>1&&<div style={{ display:"flex", gap:2, marginTop:3 }}>{Array.from({length:totalW}).map((_,i)=><div key={i} style={{ flex:1, height:3, borderRadius:1, background:i<defCount?"#f0c040":"#2a2020", border:i<defCount?"none":"1px solid #3a2a20" }}/>)}</div>}
              {resetSecs!==null&&defCount>0&&<div style={{ fontSize:6, color:"#8a7040", marginTop:2 }}>Resets in {resetSecs}s</div>}
            </div>
          );
        })()}

        {/* Fort panel */}
        {fort&&ownership==="player"&&(
          <div style={{ padding:"6px 10px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <FortPanel fort={fort} selTile={selTile} selKey={selKey} cmds={cmds} upgradeFort={upgradeFort} startReposition={startReposition} setPopupMode={setPopupMode}/>
          </div>
        )}

        {/* En route */}
        {marchingToSel.length>0&&(
          <div style={{ padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <div style={{ fontSize:7, color:"#c8a040", fontFamily:"'Cinzel',serif", letterSpacing:".05em", marginBottom:3 }}>EN ROUTE</div>
            {marchingToSel.map(cmd=>{
              const eta=Math.ceil((cmd.march.path.length-cmd.march.step-1)*cmd.march.stepMs/1000);
              return <div key={cmd.uid} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                <span style={{ fontSize:12 }}>{cmd.icon}</span>
                <span style={{ fontSize:7, color:"#c0a860", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cmd.n}</span>
                <span style={{ fontSize:6, color:cmd.march.type==="attack"?"#ff6666":"#44cc88", flexShrink:0 }}>~{eta}s</span>
                <button onClick={()=>recallMarch(cmd.uid)} style={{ padding:"1px 5px", fontSize:6, background:"rgba(200,60,60,.15)", border:"1px solid #cc4444", color:"#ff8888", flexShrink:0 }}>↩</button>
              </div>;
            })}
          </div>
        )}

        {/* Draw rematch */}
        {cmdsOnSel.filter(c=>c.drawTimer&&c.drawTile===selKey).map(cmd=>{
          const secsLeft=Math.max(0,Math.ceil((cmd.drawTimer-(nowTick||Date.now()))/1000));
          return <div key={cmd.uid} style={{ padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,.04)", background:"rgba(192,160,0,.06)" }}>
            <div style={{ fontSize:7, color:"#c8a020", fontFamily:"'Cinzel',serif", marginBottom:2 }}>⚔ DRAW — REMATCH PENDING</div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:12 }}>{cmd.icon}</span>
              <span style={{ fontSize:7, color:"#d0b840", flex:1 }}>{cmd.n}</span>
              <span style={{ fontSize:8, color:"#e0c040", fontWeight:700 }}>{Math.floor(secsLeft/60)}:{(secsLeft%60).toString().padStart(2,"0")}</span>
              <button onClick={()=>recallStationary(cmd.uid)} style={{ padding:"2px 5px", fontSize:6, background:"rgba(180,60,60,.2)", border:"1px solid #cc4444", color:"#ff9090" }}>↩</button>
            </div>
          </div>;
        })}

        {/* Abandon countdown */}
        {deletingTiles[selKey]&&(
          <div style={{ padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,.04)", background:"rgba(120,10,10,.1)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:7, color:"#ff6060", fontWeight:700 }}>🏳 ABANDONING IN {deletingSecsLeft[selKey]??15}s</span>
              <button onClick={()=>{ setDeletingTiles(p=>{const n={...p};delete n[selKey];return n;}); setDeletingSecsLeft(p=>{const n={...p};delete n[selKey];return n;}); }} style={{ padding:"2px 6px", background:"rgba(40,40,40,.6)", border:"1px solid #555", color:"#ccc", fontSize:7, fontWeight:700, borderRadius:3 }}>CANCEL</button>
            </div>
            <div style={{ height:4, background:"rgba(0,0,0,.4)", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${((deletingSecsLeft[selKey]??15)/15)*100}%`, background:"linear-gradient(90deg,#cc1010,#ff4040)", borderRadius:2, transition:"width .25s linear" }}/>
            </div>
          </div>
        )}

        {/* Garrison row — compact, like siege bar */}
        {(ownership==="enemy"||isNeutral)&&(liveAiCmd||garrisonCmd)&&(()=>{
          const ec=liveAiCmd||garrisonCmd;
          const wavesLeft=Math.max(0,totalWaves-defeatedWaves);
          return (
            <div style={{ padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,.04)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:11 }}>⚔</span>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:8, color:"#cc4040", fontWeight:700, letterSpacing:".04em" }}>
                  {liveAiCmd ? (liveAiCmd.n||"ENEMY") : "GARRISON"}
                </span>
              </div>
              <span style={{ fontSize:7, color:"#9a6060", fontFamily:"'Cinzel',serif" }}>
                Lv{ec?.lvl??"?"} · {wavesLeft}/{totalWaves} waves
              </span>
            </div>
          );
        })()}
        {/* Delete X — small, top-right corner of popup */}
        {ownership==="player"&&!selTile.isHQ&&!deletingTiles[selKey]&&(
          <button onClick={()=>{ setDeletingTiles(p=>({...p,[selKey]:Date.now()})); setDeletingSecsLeft(p=>({...p,[selKey]:15})); }}
            style={{ position:"absolute", top:6, right:6, width:18, height:18, background:"rgba(120,10,10,.7)", border:"1px solid #cc1010", borderRadius:"50%", color:"#ff6060", fontSize:9, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, zIndex:10 }}>✕</button>
        )}
        {/* Action buttons */}
        <div style={{ padding:"6px 10px 8px", display:"flex", gap:5 }}>
          {/* Attack */}
          {(ownership==="enemy"||isNeutral)&&canAtk&&(
            <button onClick={()=>canAtkNow?(setAtkKey(selKey),setMode("pickAttackCmd"),setPick(null)):null}
              style={{ flex:1, padding:"6px 0", background:canAtkNow?"linear-gradient(160deg,#6a0808,#3a0404)":"rgba(60,20,20,.3)", border:`1px solid ${canAtkNow?"#cc2020":"#553030"}`, borderRadius:5, color:canAtkNow?"#ff8080":"#7a5050", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, letterSpacing:".05em", cursor:canAtkNow?"pointer":"not-allowed", opacity:canAtkNow?1:.6 }}>
              ATTACK
            </button>
          )}
          {/* Move — owned */}
          {ownership==="player"&&!isHqTile&&(
            <button onClick={()=>canMoveNow?(setAtkKey(selKey),setMode("pickMoveCmd"),setPick(null)):null}
              style={{ flex:1, padding:"6px 0", background:canMoveNow?"linear-gradient(160deg,#083a18,#041e0a)":"rgba(20,40,20,.3)", border:`1px solid ${canMoveNow?"#2a8040":"#2a4a2a"}`, borderRadius:5, color:canMoveNow?"#80d090":"#507050", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, letterSpacing:".05em", cursor:canMoveNow?"pointer":"not-allowed", opacity:canMoveNow?1:.6 }}>
              MOVE
            </button>
          )}
          {/* Move — crew */}
          {ownership==="crew"&&canAtk&&(
            <button onClick={()=>canMoveNow?(setAtkKey(selKey),setMode("pickMoveCmd"),setPick(null)):null}
              style={{ flex:1, padding:"6px 0", background:canMoveNow?"linear-gradient(160deg,#082038,#041020)":"rgba(20,30,50,.3)", border:`1px solid ${canMoveNow?"#2060a0":"#204060"}`, borderRadius:5, color:canMoveNow?"#60a0e0":"#405060", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, letterSpacing:".05em", cursor:canMoveNow?"pointer":"not-allowed", opacity:canMoveNow?1:.6 }}>
              MOVE
            </button>
          )}
          {/* Build Fort */}
          {ownership==="player"&&!selTile.isHQ&&(selTile.powerLevel||1)<=9&&!fort&&(
            <button onClick={()=>buildFort?.(selKey,selTile)}
              style={{ flex:1, padding:"6px 0", background:"linear-gradient(160deg,#3a2808,#1e1004)", border:"1px solid #a07020", borderRadius:5, color:"#f0c060", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, letterSpacing:".05em", cursor:"pointer" }}>
              BUILD FORT
            </button>
          )}
          {/* Notes */}
          {ownership==="crew"&&<div style={{ fontSize:7, color:"#2299ff", fontFamily:"'Crimson Pro',serif", fontStyle:"italic", textAlign:"center" }}>🤝 Crew territory — you can move here freely</div>}
          {(ownership==="enemy"||isNeutral)&&!canAtk&&!selTile.isWin&&<div style={{ fontSize:7, color:"#5a4a3a", fontFamily:"'Crimson Pro',serif", fontStyle:"italic", textAlign:"center" }}>Own an adjacent tile to attack</div>}
        </div>
      </div>

    </div>

    {/* Commander cards — fixed on OPPOSITE side from tile info popup */}
    {(()=>{
      const cards=[];
      cmdsOnSel.forEach(cmd=>cards.push(
        <CommanderCard key={cmd.uid} cmd={cmd} ownership="player" onCmdScreenOpen={onCmdScreenOpen} recallMarch={recallMarch} recallStationary={recallStationary} setReinCmd={setReinCmd} setMode={setMode} barracksPool={barracksPool} playerHqKey={playerHqKey} startGuard={startGuard} cancelGuard={cancelGuard}/>
      ));
      if(ownership==="crew"||ownership==="ally"){
        cmds.filter(c=>c.owner!=="player"&&c.tk===selKey&&!c.march).forEach(cmd=>cards.push(
          <CommanderCard key={cmd.uid} cmd={cmd} ownership={ownership} onCmdScreenOpen={onCmdScreenOpen} playerHqKey={playerHqKey}/>
        ));
      }
      if(!cards.length) return null;
      return (
        <div style={{ position:"fixed", left:cmdX, top:cmdY, width:CMD_W, zIndex:500, pointerEvents:"auto", display:"flex", flexDirection:"column", gap:6, maxHeight:"70vh", overflowY:"auto", scrollbarWidth:"none", animation:"fadeUp .15s ease", background:"rgba(5,7,11,.97)", border:"1px solid #2a3a2a", borderRadius:8, padding:6, boxShadow:"0 8px 32px rgba(0,0,0,.9)" }}>
          {cards}
        </div>
      );
    })()}
    </>
  );
});
