import { useState, memo } from "react";
import { GEAR_RARITY, GEAR_SLOTS, STAT_BASE, STRENGTHEN_COST, canStrengthen, strengthen, canRefine, refine } from "../../../shared/constants/gear.js";
import { ALIGNMENT } from "../../../shared/constants/heroes.js";

/* ─────────────────────────────────────────────────────────────────────────────
   GearInventory — full gear management panel
   Used inside HQMenu (gear tab) and accessible from CommanderScreen slot taps.
   Props:
     inventory       — array of gear instances
     setInventory    — setter
     cmds            — player commanders (for equip)
     setCmds         — setter
     playerAlignment — "humans"|"creatures"
     onEquip(instanceId, cmdUid, slot) — optional callback override
     filterSlot      — if set, only show that slot (for commander slot tap)
     onClose         — if set, show a close button
───────────────────────────────────────────────────────────────────────────── */

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };

function StarRow({ count, gold = false }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{
          fontSize: 8,
          color: i < count ? (gold ? "#f0c040" : "#aaaaaa") : "#2a2a2a",
        }}>★</span>
      ))}
    </div>
  );
}

function GearCard({ piece, selected, onClick, compact }) {
  const r = GEAR_RARITY[piece.rarity];
  const slot = GEAR_SLOTS[piece.slot];
  if (compact) {
    return (
      <button onClick={onClick} style={{
        width: "100%", textAlign: "left",
        background: selected ? `${r.color}18` : "rgba(255,255,255,.025)",
        border: `1px solid ${selected ? r.color : r.color + "30"}`,
        borderRadius: 5, padding: "6px 8px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 7,
        boxShadow: selected ? `0 0 8px ${r.color}30` : "none",
        transition: "all .15s",
        touchAction: "manipulation",
      }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>{piece.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, fontWeight: 700,
            color: "#e0d0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {piece.n}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: 7, color: r.color, fontFamily: "'Cinzel',serif" }}>{r.n}</span>
            <span style={{ fontSize: 7, color: "#3a3020" }}>·</span>
            <span style={{ fontSize: 7, color: "#6a5a3a" }}>{slot?.icon} {slot?.n}</span>
          </div>
          <StarRow count={piece.stars} />
        </div>
        {piece.equippedBy && (
          <div style={{ fontSize: 7, color: "#aa4444", fontFamily: "'Cinzel',serif",
            padding: "1px 4px", border: "1px solid #aa444440", borderRadius: 2 }}>EQ</div>
        )}
      </button>
    );
  }
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left",
      background: selected ? `${r.color}15` : "rgba(255,255,255,.02)",
      border: `2px solid ${selected ? r.color : r.color + "25"}`,
      borderRadius: 7, padding: 10, cursor: "pointer",
      boxShadow: selected ? `0 0 12px ${r.color}35` : "none",
      transition: "all .15s", position: "relative",
      touchAction: "manipulation",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 28 }}>{piece.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, fontWeight: 700, color: "#e0d0c0" }}>
            {piece.n}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ padding: "1px 5px", borderRadius: 3,
              background: `${r.color}18`, border: `1px solid ${r.color}40`,
              fontSize: 7, color: r.color, fontFamily: "'Cinzel',serif" }}>{r.n}</span>
            <span style={{ padding: "1px 5px", borderRadius: 3,
              background: "rgba(255,255,255,.03)", border: "1px solid #2a2010",
              fontSize: 7, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>
              {slot?.icon} {slot?.n}
            </span>
            {piece.alignment && (
              <span style={{ padding: "1px 5px", borderRadius: 3,
                background: "rgba(255,255,255,.03)", border: "1px solid #2a2010",
                fontSize: 7, color: "#5a6a4a", fontFamily: "'Cinzel',serif" }}>
                {ALIGNMENT[piece.alignment]?.icon} {ALIGNMENT[piece.alignment]?.n}
              </span>
            )}
          </div>
        </div>
        {piece.equippedBy && (
          <div style={{ padding: "2px 5px", borderRadius: 3, background: "rgba(180,60,60,.15)",
            border: "1px solid rgba(180,60,60,.4)", fontSize: 7, color: "#cc6060",
            fontFamily: "'Cinzel',serif", flexShrink: 0 }}>Equipped</div>
        )}
      </div>

      {/* Stars */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <StarRow count={piece.stars} />
        {piece.goldStars > 0 && <><span style={{ color: "#3a3020", fontSize: 8 }}>·</span><StarRow count={piece.goldStars} gold /></>}
      </div>

      {/* Primary stat */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5,
        padding: "5px 8px", background: "rgba(255,255,255,.025)", borderRadius: 4 }}>
        <span style={{ fontSize: 8, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>
          {STAT_BASE[piece.primaryStat]?.icon} {STAT_BASE[piece.primaryStat]?.label}
        </span>
        <span style={{ fontSize: 9, color: r.color, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>
          {STAT_BASE[piece.primaryStat] ? Math.round(STAT_BASE[piece.primaryStat].base * (GEAR_RARITY[piece.rarity]?.statMult ?? 1) * (1 + piece.stars * 0.12)) : "—"}
        </span>
      </div>

      {/* Secondary stats */}
      {piece.secStats?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {piece.secStats.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between",
              fontSize: 8, fontFamily: "'Cinzel',serif",
              color: s.gold ? "#f0c040" : "#4a4a3a" }}>
              <span>{STAT_BASE[s.key]?.icon} {STAT_BASE[s.key]?.label}</span>
              <span style={{ color: s.gold ? "#f0c040" : "#6a6a5a" }}>+{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ── Gear detail / action panel ────────────────────────────────────────────────
function GearDetail({ piece, inventory, cmds, setCmds, setInventory, playerAlignment }) {
  const [equipTarget, setEquipTarget] = useState(null);
  if (!piece) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      color: "#2a2010", fontFamily: "'Cinzel',serif", fontSize: 11, fontStyle: "italic" }}>
      Select a gear piece
    </div>
  );

  const r = GEAR_RARITY[piece.rarity];
  const slot = GEAR_SLOTS[piece.slot];

  // Count same-rarity pieces (excluding this one and equipped ones) for strengthen
  const sameRarityCount = inventory.filter(g =>
    g.instanceId !== piece.instanceId && g.rarity === piece.rarity && !g.equippedBy
  ).length;

  // Count exact duplicates for refine
  const dupeCount = inventory.filter(g =>
    g.instanceId !== piece.instanceId && g.pieceId === piece.pieceId && !g.equippedBy
  ).length;

  const canStr  = canStrengthen(piece, sameRarityCount);
  const canRef  = canRefine(piece, dupeCount);
  const strCost = piece.stars < 5 ? STRENGTHEN_COST[piece.stars] : null;

  // Eligible commanders for equip (same alignment or null)
  const eligibleCmds = cmds.filter(c =>
    c.owner === "player" &&
    (!piece.alignment || piece.alignment === playerAlignment)
  );

  const handleStrengthen = () => {
    if (!canStr) return;
    // Consume sameRarityCount pieces from inventory (take the first strCost unequipped same-rarity)
    let toConsume = STRENGTHEN_COST[piece.stars];
    setInventory(prev => {
      let consumed = 0;
      return prev
        .filter(g => {
          if (g.instanceId === piece.instanceId) return true; // keep selected
          if (consumed < toConsume && g.rarity === piece.rarity && !g.equippedBy) {
            consumed++;
            return false; // remove
          }
          return true;
        })
        .map(g => g.instanceId === piece.instanceId ? strengthen(g) : g);
    });
  };

  const handleEquip = (cmdUid) => {
    const cmd = cmds.find(c => c.uid === cmdUid);
    if (!cmd) return;
    const currentInSlot = cmd.gear?.[piece.slot];
    const prevOwner = piece.equippedBy; // commander who currently has this piece
    setInventory(prev => prev.map(g => {
      if (g.instanceId === piece.instanceId) return { ...g, equippedBy: cmdUid };
      if (currentInSlot && g.instanceId === currentInSlot) return { ...g, equippedBy: null }; // unequip old
      return g;
    }));
    setCmds(prev => prev.map(c => {
      if (c.uid === cmdUid) return { ...c, gear: { ...(c.gear ?? {}), [piece.slot]: piece.instanceId } };
      // Fix: also clear the slot on the previous owner so they don't retain ghost stat bonuses
      if (prevOwner && c.uid === prevOwner) {
        const prevGear = c.gear ?? {};
        if (prevGear[piece.slot] === piece.instanceId) {
          return { ...c, gear: { ...prevGear, [piece.slot]: null } };
        }
      }
      return c;
    }));
    setEquipTarget(null);
  };

  const handleUnequip = () => {
    if (!piece.equippedBy) return;
    const prevOwner = piece.equippedBy;
    setInventory(prev => prev.map(g =>
      g.instanceId === piece.instanceId ? { ...g, equippedBy: null } : g
    ));
    setCmds(prev => prev.map(c => {
      if (c.uid !== prevOwner) return c;
      return { ...c, gear: { ...(c.gear ?? {}), [piece.slot]: null } };
    }));
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, touchAction: "pan-y", overscrollBehavior: "contain" }}>
      <GearCard piece={piece} selected={false} onClick={() => {}} />

      {/* Equip / Unequip */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e1810", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ padding: "7px 10px", borderBottom: "1px solid #1a1508",
          fontFamily: "'Cinzel',serif", fontSize: 8, color: "#6a5a3a", letterSpacing: ".08em" }}>
          EQUIP TO COMMANDER
        </div>
        {piece.equippedBy ? (
          <div style={{ padding: 10 }}>
            <div style={{ fontSize: 8, color: "#cc6060", fontFamily: "'Cinzel',serif", marginBottom: 6 }}>
              Currently equipped by: {cmds.find(c => c.uid === piece.equippedBy)?.n ?? "Unknown"}
            </div>
            <button onClick={handleUnequip} style={{
              width: "100%", padding: "7px 0",
              background: "rgba(180,60,60,.12)", border: "1px solid rgba(180,60,60,.35)",
              color: "#cc6060", fontFamily: "'Cinzel',serif", fontSize: 9,
              borderRadius: 4, cursor: "pointer",
            }}>↩ Unequip</button>
          </div>
        ) : equipTarget ? (
          <div style={{ padding: 10 }}>
            <div style={{ fontSize: 8, color: "#5a5a3a", fontFamily: "'Cinzel',serif", marginBottom: 6 }}>
              Choose commander:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {eligibleCmds.map(cmd => (
                <button key={cmd.uid} onClick={() => handleEquip(cmd.uid)} style={{
                  padding: "6px 10px", textAlign: "left",
                  background: "rgba(40,100,60,.1)", border: "1px solid rgba(40,140,80,.3)",
                  color: "#80d090", fontFamily: "'Cinzel',serif", fontSize: 9,
                  borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>{cmd.icon}</span>
                  <div>
                    <div>{cmd.n}</div>
                    <div style={{ fontSize: 7, color: "#3a5a3a", marginTop: 1 }}>
                      {cmd.gear?.[piece.slot] ? "⚠ Will replace current" : "Slot empty"}
                    </div>
                  </div>
                </button>
              ))}
              <button onClick={() => setEquipTarget(null)} style={{
                padding: "5px 10px", background: "none", border: "1px solid #1e1810",
                color: "#4a3a28", fontFamily: "'Cinzel',serif", fontSize: 8,
                borderRadius: 4, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 10 }}>
            {eligibleCmds.length === 0
              ? <div style={{ fontSize: 8, color: "#3a3020", fontFamily: "'Crimson Pro',serif", fontStyle: "italic" }}>No eligible commanders</div>
              : <button onClick={() => setEquipTarget(true)} style={{
                  width: "100%", padding: "7px 0",
                  background: "rgba(40,100,60,.12)", border: "1px solid rgba(40,140,80,.35)",
                  color: "#3daa60", fontFamily: "'Cinzel',serif", fontSize: 9,
                  borderRadius: 4, cursor: "pointer",
                }}>⚔ Equip to Commander</button>
            }
          </div>
        )}
      </div>

      {/* Strengthen */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e1810", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ padding: "7px 10px", borderBottom: "1px solid #1a1508",
          fontFamily: "'Cinzel',serif", fontSize: 8, color: "#6a5a3a", letterSpacing: ".08em" }}>
          STRENGTHEN (STARS {piece.stars}/5)
        </div>
        <div style={{ padding: 10 }}>
          {piece.stars >= 5
            ? <div style={{ fontSize: 8, color: "#f0c040", fontFamily: "'Cinzel',serif" }}>⭐ Max stars reached</div>
            : <>
                <div style={{ fontSize: 8, color: "#5a4a3a", fontFamily: "'Crimson Pro',serif", marginBottom: 6 }}>
                  Cost: {strCost} × {r.n} gear pieces · You have: {sameRarityCount} available
                </div>
                <button onClick={handleStrengthen} disabled={!canStr} style={{
                  width: "100%", padding: "7px 0",
                  background: canStr ? `${r.color}18` : "rgba(255,255,255,.02)",
                  border: `1px solid ${canStr ? r.color + "45" : "#1e1810"}`,
                  color: canStr ? r.color : "#2a2a2a",
                  fontFamily: "'Cinzel',serif", fontSize: 9,
                  borderRadius: 4, cursor: canStr ? "pointer" : "not-allowed",
                }}>★ Strengthen → {piece.stars + 1} stars</button>
              </>
          }
        </div>
      </div>

      {/* Refine */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e1810", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ padding: "7px 10px", borderBottom: "1px solid #1a1508",
          fontFamily: "'Cinzel',serif", fontSize: 8, color: "#6a5a3a", letterSpacing: ".08em" }}>
          REFINE (GOLD STARS {piece.goldStars}/{piece.secStats?.length ?? 0})
        </div>
        <div style={{ padding: 10 }}>
          {piece.goldStars >= (piece.secStats?.length ?? 0)
            ? <div style={{ fontSize: 8, color: "#f0c040", fontFamily: "'Cinzel',serif" }}>⭐ All secondary stats refined</div>
            : <>
                <div style={{ fontSize: 8, color: "#5a4a3a", fontFamily: "'Crimson Pro',serif", marginBottom: 6 }}>
                  Cost: 1 exact duplicate · You have: {dupeCount}
                  <br />Choose a secondary stat to boost:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {piece.secStats?.map((s, i) => !s.gold && (
                    <button key={i} onClick={() => canRef && setInventory(prev => {
                      let consumed = false;
                      return prev
                        .filter(g => {
                          if (!consumed && g.pieceId === piece.pieceId && g.instanceId !== piece.instanceId && !g.equippedBy) { consumed = true; return false; }
                          return true;
                        })
                        .map(g => g.instanceId === piece.instanceId ? refine(g, i) : g);
                    })} disabled={!canRef} style={{
                      padding: "5px 10px", textAlign: "left",
                      background: canRef ? "rgba(240,192,64,.08)" : "rgba(255,255,255,.015)",
                      border: `1px solid ${canRef ? "rgba(240,192,64,.3)" : "#1a1a1a"}`,
                      color: canRef ? "#f0c040" : "#2a2a2a",
                      fontFamily: "'Cinzel',serif", fontSize: 8,
                      borderRadius: 3, cursor: canRef ? "pointer" : "not-allowed",
                    }}>
                      ✦ {STAT_BASE[s.key]?.label} +{s.value} → refine
                    </button>
                  ))}
                </div>
              </>
          }
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default memo(function GearInventory({ inventory, setInventory, cmds, setCmds, playerAlignment, filterSlot, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const [filterR, setFilterR]       = useState(null);
  const [filterS, setFilterS]       = useState(filterSlot ?? null);

  const sorted = [...inventory]
    .filter(g => (!filterR || g.rarity === filterR) && (!filterS || g.slot === filterS))
    .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 4) - (RARITY_ORDER[b.rarity] ?? 4));

  const selectedPiece = inventory.find(g => g.instanceId === selectedId) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Filter bar */}
      <div style={{
        padding: "10px 12px", borderBottom: "1px solid #1a1508",
        background: "rgba(0,0,0,.2)", flexShrink: 0,
      }}>
        {onClose && (
          <button onClick={onClose} style={{
            background: "none", border: "1px solid #2a2010", color: "#6a5040",
            fontFamily: "'Cinzel',serif", fontSize: 10, padding: "4px 10px",
            borderRadius: 4, cursor: "pointer", marginBottom: 10, display: "block",
          }}>← Back</button>
        )}
        {/* Slot filter buttons — large, full-row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 8 }}>
          {Object.entries(GEAR_SLOTS).map(([key, s]) => {
            const active = filterS === key;
            return (
              <button key={key} onClick={() => setFilterS(active ? null : key)} style={{
                padding: "10px 6px", borderRadius: 7, textAlign: "center",
                background: active ? "rgba(200,160,64,.18)" : "rgba(255,255,255,.04)",
                border: `1px solid ${active ? "rgba(200,160,64,.55)" : "#2a2010"}`,
                color: active ? "#c8a040" : "#5a4a30",
                fontFamily: "'Cinzel',serif", cursor: "pointer",
                boxShadow: active ? "0 0 10px rgba(200,160,64,.15)" : "none",
                transition: "all .15s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: ".04em" }}>{s.n}</div>
              </button>
            );
          })}
        </div>
        {/* Rarity + count row */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {Object.entries(GEAR_RARITY).reverse().map(([key, r]) => (
            <button key={key} onClick={() => setFilterR(filterR === key ? null : key)} style={{
              padding: "5px 12px", borderRadius: 5,
              background: filterR === key ? `${r.color}18` : "rgba(255,255,255,.03)",
              border: `1px solid ${filterR === key ? r.color + "55" : "#1e1810"}`,
              color: filterR === key ? r.color : "#4a3a28",
              fontFamily: "'Cinzel',serif", fontSize: 9, cursor: "pointer", whiteSpace: "nowrap",
              fontWeight: filterR === key ? 700 : 400,
              transition: "all .15s",
            }}>{r.n}</button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 8, color: "#3a2e18",
            fontFamily: "'Cinzel',serif" }}>{sorted.length} pieces</span>
        </div>
      </div>

      {/* Split: list left, detail right */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* List */}
        <div style={{
          width: "45%", overflowY: "auto", borderRight: "1px solid #1a1508",
          padding: "8px", display: "flex", flexDirection: "column", gap: 5,
          scrollbarWidth: "thin", touchAction: "pan-y", overscrollBehavior: "contain",
        }}>
          {sorted.length === 0
            ? <div style={{ padding: 16, textAlign: "center", color: "#2a2010",
                fontFamily: "'Cinzel',serif", fontSize: 9, fontStyle: "italic" }}>
                No gear{filterR || filterS ? " matching filters" : " in inventory"}
              </div>
            : sorted.map(g => (
                <GearCard key={g.instanceId} piece={g}
                  selected={g.instanceId === selectedId}
                  onClick={() => setSelectedId(g.instanceId)}
                  compact />
              ))
          }
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflowY: "auto", touchAction: "pan-y", overscrollBehavior: "contain" }}>
          <GearDetail
            piece={selectedPiece}
            inventory={inventory}
            setInventory={setInventory}
            cmds={cmds}
            setCmds={setCmds}
            playerAlignment={playerAlignment}
          />
        </div>
      </div>
    </div>
  );
});
