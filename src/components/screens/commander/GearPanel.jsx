import { useState } from "react";
import { GEAR_RARITY } from "../../../../shared/constants/gear.js";
import { GEAR_RARITY_COLORS } from "./factionTheme.js";

const SLOT_DEFS = { helmet:{n:"Helmet",icon:"⛑"}, armor:{n:"Armor",icon:"🛡"}, bracers:{n:"Bracers",icon:"🥊"}, accessory:{n:"Accessory",icon:"💍"} };
const STAT_ICONS = { ATK:"⚔", FOC:"✦", SPD:"💨", ARMY_ATK:"⚔🛡", ARMY_FOC:"✦🛡", ARMY_SPD:"💨🛡", ARMY_SIEGE:"🪨🛡" };
const STAT_LABELS = { ATK:"Attack", FOC:"Focus", SPD:"Speed", ARMY_ATK:"+Army ATK", ARMY_FOC:"+Army FOC", ARMY_SPD:"+Army SPD", ARMY_SIEGE:"+Army Siege" };
const PBASE = { ATK:7, FOC:7, SPD:7 };
const RARITY_MULT = { common:1, rare:1.4, epic:2.0, legendary:3.0 };

export default function GearPanel({ cmd, gearInventory, setGearInventory, setCmds, rarityColor }) {
  const [openSlot, setOpenSlot] = useState(null);
  const [previewGear, setPreviewGear] = useState(null);

  function handleEquip(piece) {
    const currentInSlot = cmd.gear?.[piece.slot];
    if (setGearInventory) setGearInventory(prev => prev.map(g => {
      if (g.instanceId === piece.instanceId) return { ...g, equippedBy: cmd.uid };
      if (currentInSlot && g.instanceId === currentInSlot) return { ...g, equippedBy: null };
      return g;
    }));
    if (setCmds) setCmds(prev => prev.map(c =>
      c.uid === cmd.uid ? { ...c, gear: { ...(c.gear ?? {}), [piece.slot]: piece.instanceId } } : c
    ));
  }

  function handleUnequip(slotKey) {
    const equippedId = cmd.gear?.[slotKey];
    if (!equippedId) return;
    if (setGearInventory) setGearInventory(prev => prev.map(g =>
      g.instanceId === equippedId ? { ...g, equippedBy: null } : g
    ));
    if (setCmds) setCmds(prev => prev.map(c =>
      c.uid === cmd.uid ? { ...c, gear: { ...(c.gear ?? {}), [slotKey]: null } } : c
    ));
  }

  const hasAnyGear = ["helmet","armor","bracers","accessory"].some(s => cmd.gear?.[s]);

  return (
    <div style={{ margin: "0 18px 4px", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 7, color: "#3a3020", fontFamily: "'Cinzel',serif", letterSpacing: ".08em" }}>GEAR</div>
        {hasAnyGear && (
          <button onClick={() => {
            if (setGearInventory) setGearInventory(prev => prev.map(g => g.equippedBy === cmd.uid ? { ...g, equippedBy: null } : g));
            if (setCmds) setCmds(prev => prev.map(c => c.uid === cmd.uid ? { ...c, gear: { helmet:null, armor:null, bracers:null, accessory:null } } : c));
          }} style={{
            padding: "2px 8px", borderRadius: 3,
            background: "rgba(180,60,60,.1)", border: "1px solid rgba(180,60,60,.3)",
            color: "#aa5050", fontFamily: "'Cinzel',serif", fontSize: 7, cursor: "pointer",
          }}>Unequip All</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {["helmet","armor","bracers","accessory"].map(slotKey => {
          const equippedId = cmd.gear?.[slotKey];
          const piece = equippedId ? (gearInventory ?? []).find(g => g.instanceId === equippedId) : null;
          const slotDef = SLOT_DEFS[slotKey];
          const rc = piece ? (GEAR_RARITY_COLORS[piece.rarity] ?? "#888") : null;
          const isOpen = openSlot === slotKey;
          const rarityMult = piece ? (RARITY_MULT[piece.rarity] ?? 1) : 1;
          const pVal = piece ? Math.round((PBASE[piece.primaryStat] ?? 7) * rarityMult * (1 + (piece.stars ?? 0) * 0.12)) : null;

          const available = (gearInventory ?? []).filter(g =>
            g.slot === slotKey && (!g.equippedBy || g.equippedBy === cmd.uid)
          ).sort((a,b) => {
            const ro = { legendary:0, epic:1, rare:2, common:3 };
            return (ro[a.rarity]??4) - (ro[b.rarity]??4);
          });

          return (
            <div key={slotKey} style={{ position: "relative" }}>
              <button
                onClick={() => {
                  if (piece) { setPreviewGear({ piece, slotKey }); setOpenSlot(null); }
                  else setOpenSlot(isOpen ? null : slotKey);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (piece) { setPreviewGear({ piece, slotKey }); setOpenSlot(null); }
                  else setOpenSlot(isOpen ? null : slotKey);
                }}
                style={{
                  width: "100%", padding: "30px 6px 24px", textAlign: "center",
                  background: piece ? `${rc}12` : isOpen ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.015)",
                  border: `1px solid ${isOpen ? (rc ?? rarityColor)+"60" : piece ? rc+"40" : "#1e1810"}`,
                  borderRadius: 5, cursor: "pointer",
                  transition: "all .15s",
                  boxShadow: piece ? `0 0 8px ${rc}20` : "none",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}>
                <div style={{ fontSize: piece ? 46 : 34, marginBottom: 8, opacity: piece ? 1 : 0.25 }}>
                  {piece ? piece.icon : slotDef.icon}
                </div>
                <div style={{ fontSize: 7, fontFamily: "'Cinzel',serif",
                  color: piece ? rc : "#2a2010",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginBottom: piece ? 3 : 0 }}>
                  {piece ? piece.n.split(" ")[0] : slotDef.n}
                </div>
                {piece && (
                  <>
                    <div style={{ fontSize: 7, color: "#6a5a40", fontFamily: "'Cinzel',serif", marginBottom: 2 }}>
                      {STAT_ICONS[piece.primaryStat]} +{pVal}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      {Array.from({length:5}).map((_,i)=>(
                        <span key={i} style={{fontSize:5, color:i<(piece.stars??0)?"#aaa":"#222"}}>★</span>
                      ))}
                    </div>
                  </>
                )}
                {!piece && (
                  <div style={{ fontSize: 6, color: "#2a2010", fontFamily: "'Cinzel',serif", marginTop: 2 }}>empty</div>
                )}
              </button>

              {isOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 5px)",
                  left: slotKey === "bracers" || slotKey === "accessory" ? "auto" : 0,
                  right: slotKey === "bracers" || slotKey === "accessory" ? 0 : "auto",
                  zIndex: 60, width: 170,
                  background: "#0d0b08", border: `1px solid ${rarityColor}35`,
                  borderRadius: 6, boxShadow: "0 6px 24px rgba(0,0,0,.8)",
                  overflow: "hidden", animation: "fadeUp .12s ease",
                }}>
                  <div style={{
                    padding: "7px 10px", borderBottom: "1px solid #1a1510",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 7, color: rarityColor, fontFamily: "'Cinzel',serif", letterSpacing: ".07em" }}>
                      {slotDef.icon} {slotDef.n.toUpperCase()}
                    </span>
                    {piece && (
                      <button onClick={(e) => { e.stopPropagation(); handleUnequip(slotKey); setOpenSlot(null); }} style={{
                        padding: "2px 6px", borderRadius: 3, fontSize: 6,
                        background: "rgba(180,60,60,.12)", border: "1px solid rgba(180,60,60,.3)",
                        color: "#aa5050", fontFamily: "'Cinzel',serif", cursor: "pointer",
                      }}>Unequip</button>
                    )}
                  </div>

                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {available.length === 0 ? (
                      <div style={{ padding: "12px 10px", fontSize: 8, color: "#3a3020",
                        fontFamily: "'Crimson Pro',serif", fontStyle: "italic", textAlign: "center" }}>
                        No {slotDef.n.toLowerCase()}s available
                      </div>
                    ) : available.map(g => {
                      const gc = GEAR_RARITY_COLORS[g.rarity] ?? "#888";
                      const isEquipped = g.instanceId === equippedId;
                      const gRarityMult = RARITY_MULT[g.rarity] ?? 1;
                      const gPval = Math.round((PBASE[g.primaryStat] ?? 7) * gRarityMult * (1 + (g.stars ?? 0) * 0.12));
                      return (
                        <div
                          key={g.instanceId}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewGear({ piece: g, slotKey });
                            setOpenSlot(null);
                          }}
                          style={{
                            padding: "8px 10px", display: "flex", alignItems: "center", gap: 8,
                            background: isEquipped ? `${gc}14` : "transparent",
                            borderBottom: "1px solid #111",
                            cursor: "pointer", transition: "background .1s",
                            borderLeft: isEquipped ? `2px solid ${gc}` : "2px solid transparent",
                          }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{g.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 8, fontFamily: "'Cinzel',serif", color: gc,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {g.n}
                            </div>
                            <div style={{ fontSize: 7, color: "#5a4a30", fontFamily: "'Cinzel',serif", marginTop: 1 }}>
                              {STAT_ICONS[g.primaryStat]} +{gPval}
                              {g.secStats?.length > 0 && (
                                <span style={{ color: "#3a3020", marginLeft: 4 }}>
                                  +{g.secStats.length} sec
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 1, marginTop: 2 }}>
                              {Array.from({length:5}).map((_,i)=>(
                                <span key={i} style={{fontSize:5, color:i<(g.stars??0)?"#aaa":"#222"}}>★</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {previewGear && (() => {
        const { piece: pg, slotKey: pgSlot } = previewGear;
        const pgRc  = GEAR_RARITY_COLORS[pg.rarity] ?? "#888";
        const pgR   = GEAR_RARITY[pg.rarity] ?? {};
        const pgSlotDef = SLOT_DEFS[pgSlot];
        const pgPVal = Math.round((PBASE[pg.primaryStat] ?? 7) * (pgR.statMult ?? 1) * (1 + (pg.stars ?? 0) * 0.12));
        const isEquipped = cmd.gear?.[pgSlot] === pg.instanceId;

        return (
          <div
            onClick={() => setPreviewGear(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,.65)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <div onClick={e => e.stopPropagation()} style={{
              width: "min(320px, 90vw)",
              background: "#0d0b08", border: `2px solid ${pgRc}40`, borderRadius: 8,
              padding: "16px 18px", boxShadow: `0 8px 40px rgba(0,0,0,.95), 0 0 20px ${pgRc}15`,
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                <div style={{ fontSize:36, flexShrink:0 }}>{pg.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700, color:"#e0d0c0" }}>{pg.n}</div>
                  <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap" }}>
                    <span style={{ padding:"1px 6px", borderRadius:3,
                      background:`${pgRc}18`, border:`1px solid ${pgRc}40`,
                      fontSize:7, color:pgRc, fontFamily:"'Cinzel',serif" }}>{pgR.n}</span>
                    <span style={{ padding:"1px 6px", borderRadius:3,
                      background:"rgba(255,255,255,.03)", border:"1px solid #2a2010",
                      fontSize:7, color:"#6a5a3a", fontFamily:"'Cinzel',serif" }}>
                      {pgSlotDef.icon} {pgSlotDef.n}
                    </span>
                  </div>
                </div>
                <button onClick={() => setPreviewGear(null)} style={{
                  background:"transparent", border:"none", color:"#6a5a4a",
                  fontSize:16, cursor:"pointer", flexShrink:0, lineHeight:1,
                }}>✕</button>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <div style={{ display:"flex", gap:3 }}>
                  {Array.from({length:5}).map((_,i) => (
                    <span key={i} style={{ fontSize:11, color:i<(pg.stars??0)?"#aaaaaa":"#2a2a2a" }}>★</span>
                  ))}
                </div>
                {(pg.goldStars??0) > 0 && <>
                  <span style={{ color:"#3a3020" }}>·</span>
                  <div style={{ display:"flex", gap:3 }}>
                    {Array.from({length:pg.goldStars}).map((_,i) => (
                      <span key={i} style={{ fontSize:11, color:"#f0c040" }}>★</span>
                    ))}
                  </div>
                </>}
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:6, padding:"7px 10px",
                background:"rgba(255,255,255,.025)", borderRadius:5 }}>
                <span style={{ fontSize:9, color:"#6a5a3a", fontFamily:"'Cinzel',serif" }}>
                  {STAT_ICONS[pg.primaryStat]} {STAT_LABELS[pg.primaryStat] ?? pg.primaryStat}
                </span>
                <span style={{ fontSize:13, color:pgRc, fontFamily:"'Cinzel',serif", fontWeight:700 }}>
                  +{pgPVal}
                </span>
              </div>

              {pg.secStats?.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:3, marginBottom:10 }}>
                  {pg.secStats.map((s, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between",
                      fontSize:9, fontFamily:"'Cinzel',serif",
                      color: s.gold ? "#f0c040" : "#4a4a3a",
                      padding:"4px 10px", background:"rgba(255,255,255,.015)", borderRadius:4 }}>
                      <span>{STAT_ICONS[s.key] ?? ""} {STAT_LABELS[s.key] ?? s.key}</span>
                      <span style={{ color: s.gold ? "#f0c040" : "#6a6a5a" }}>
                        +{typeof s.value === "number" && !Number.isInteger(s.value) ? s.value.toFixed(1) : s.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                {isEquipped ? (
                  <button
                    onClick={() => { handleUnequip(pgSlot); setPreviewGear(null); }}
                    style={{
                      flex:1, padding:"10px 0", borderRadius:5, cursor:"pointer",
                      background:"rgba(180,60,60,.12)", border:"1px solid rgba(180,60,60,.4)",
                      color:"#cc5050", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700,
                      letterSpacing:".06em",
                    }}>
                    Unequip
                  </button>
                ) : (
                  <button
                    onClick={() => { handleEquip(pg); setPreviewGear(null); }}
                    style={{
                      flex:1, padding:"10px 0", borderRadius:5, cursor:"pointer",
                      background:`linear-gradient(135deg,${pgRc}22,rgba(0,0,0,.3))`,
                      border:`1px solid ${pgRc}55`,
                      color:pgRc, fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700,
                      letterSpacing:".06em", boxShadow:`0 0 12px ${pgRc}20`,
                    }}>
                    Equip
                  </button>
                )}
                <button
                  onClick={() => setPreviewGear(null)}
                  style={{
                    padding:"10px 16px", borderRadius:5, cursor:"pointer",
                    background:"rgba(255,255,255,.03)", border:"1px solid #2a2010",
                    color:"#4a3a28", fontFamily:"'Cinzel',serif", fontSize:10,
                  }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
