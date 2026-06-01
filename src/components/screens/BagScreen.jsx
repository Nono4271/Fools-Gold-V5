import { useEffect, useState } from "react";
import { CSS } from "../../constants/css.js";
import { GEAR_RARITY, GEAR_SLOTS, STAT_BASE, STRENGTHEN_COST, canStrengthen, strengthen, canRefine, refine } from "../../../shared/constants/gear.js";
import { ALIGNMENT } from "../../../shared/constants/heroes.js";
import { CONSUMABLE_DEFS, CONSUMABLE_GROUPS, CONS_RARITY } from "../../../shared/constants/consumables.js";

const RARITY_ORDER     = { legendary: 0, epic: 1, rare: 2, common: 3 };
const CMD_RARITY_ORDER = { champion: 0, veteran: 1, soldier: 2 };

const RARITY_COLOR = {
  legendary: "#f0c040", epic: "#a855f7", rare: "#4488cc", common: "#8a8a8a",
  champion:  "#f0c040", veteran: "#a855f7", soldier: "#4488cc",
};

// ── Shared layout shell ───────────────────────────────────────────────────────
// Left: scrollable grid of cards. Right: fixed detail panel (~38% width).
function SplitLayout({ children, detail }) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      {/* Grid scroll area */}
      <div className="scr" style={{
        flex: 1, overflowY: "auto", padding: "8px 6px",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gridAutoRows: "min-content",
        gap: 6,
        alignContent: "start",
        touchAction: "pan-y", overscrollBehavior: "contain",
      }}>
        {children}
      </div>

      {/* Detail panel */}
      <div style={{
        width: "38%", flexShrink: 0,
        borderLeft: "1px solid #2a1e08",
        overflow: "hidden",
        background: "rgba(0,0,0,.25)",
        display: "flex", flexDirection: "column",
      }}>
        {detail}
      </div>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "10px 0",
      background: active ? "rgba(255,255,255,.05)" : "none",
      border: "none",
      borderBottom: active ? "2px solid #c8a060" : "2px solid transparent",
      color: active ? "#c8a060" : "#4a3a20",
      fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: ".05em",
      cursor: "pointer", touchAction: "manipulation",
    }}>{label}</button>
  );
}

// ── Star row ──────────────────────────────────────────────────────────────────
function StarRow({ count, gold = false, size = 8 }) {
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: size, color: i < count ? (gold ? "#f0c040" : "#aaaaaa") : "#2a2a2a" }}>★</span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEAR TAB
// ═══════════════════════════════════════════════════════════════════════════════
function GearPortraitCard({ piece, selected, onClick }) {
  const r = GEAR_RARITY[piece.rarity];
  return (
    <button onClick={onClick} style={{
      background: selected ? `${r.color}20` : "rgba(255,255,255,.03)",
      border: `2px solid ${selected ? r.color : r.color + "28"}`,
      borderRadius: 8, padding: "8px 6px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      cursor: "pointer", touchAction: "manipulation",
      boxShadow: selected ? `0 0 12px ${r.color}40` : "none",
      transition: "all .15s", position: "relative",
    }}>
      {/* Equipped badge */}
      {piece.equippedBy && (
        <div style={{
          position: "absolute", top: 3, right: 3,
          fontSize: 6, color: "#cc6060", fontFamily: "'Cinzel',serif",
          background: "rgba(180,60,60,.18)", border: "1px solid rgba(180,60,60,.35)",
          borderRadius: 2, padding: "1px 3px",
        }}>EQ</div>
      )}
      <div style={{ fontSize: 26 }}>{piece.icon}</div>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#e0d0c0",
        textAlign: "center", lineHeight: 1.3,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: "100%", padding: "0 2px" }}>{piece.n}</div>
      <div style={{ fontSize: 7, color: r.color, fontFamily: "'Cinzel',serif" }}>{r.n}</div>
      <StarRow count={piece.stars} />
    </button>
  );
}

function GearDetailPanel({ piece, inventory, cmds, setCmds, setInventory, playerAlignment }) {
  const [equipTarget, setEquipTarget] = useState(null);

  if (!piece) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 8,
      color: "#3a2a10", fontFamily: "'Cinzel',serif", fontSize: 9, padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 28, opacity: 0.3 }}>⚔</div>
      Select a piece
    </div>
  );

  const r          = GEAR_RARITY[piece.rarity];
  const slot       = GEAR_SLOTS[piece.slot];
  const sameRarityCount = inventory.filter(g => g.instanceId !== piece.instanceId && g.rarity === piece.rarity && !g.equippedBy).length;
  const dupeCount       = inventory.filter(g => g.instanceId !== piece.instanceId && g.pieceId === piece.pieceId && !g.equippedBy).length;
  const canStr     = canStrengthen(piece, sameRarityCount);
  const canRef     = canRefine(piece, dupeCount);
  const strCost    = piece.stars < 5 ? STRENGTHEN_COST[piece.stars] : null;
  const eligibleCmds = (cmds ?? []).filter(c => c.owner === "player" && (!piece.alignment || piece.alignment === playerAlignment));

  const handleStrengthen = () => {
    if (!canStr) return;
    let toConsume = STRENGTHEN_COST[piece.stars];
    setInventory(prev => {
      let consumed = 0;
      return prev
        .filter(g => {
          if (g.instanceId === piece.instanceId) return true;
          if (consumed < toConsume && g.rarity === piece.rarity && !g.equippedBy) { consumed++; return false; }
          return true;
        })
        .map(g => g.instanceId === piece.instanceId ? strengthen(g) : g);
    });
  };

  const handleEquip = (cmdUid) => {
    const currentInSlot = cmds.find(c => c.uid === cmdUid)?.gear?.[piece.slot];
    const prevOwner = piece.equippedBy;
    setInventory(prev => prev.map(g => {
      if (g.instanceId === piece.instanceId) return { ...g, equippedBy: cmdUid };
      if (currentInSlot && g.instanceId === currentInSlot) return { ...g, equippedBy: null };
      return g;
    }));
    setCmds(prev => prev.map(c => {
      if (c.uid === cmdUid) return { ...c, gear: { ...(c.gear ?? {}), [piece.slot]: piece.instanceId } };
      if (prevOwner && c.uid === prevOwner) {
        const pg = c.gear ?? {};
        if (pg[piece.slot] === piece.instanceId) return { ...c, gear: { ...pg, [piece.slot]: null } };
      }
      return c;
    }));
    setEquipTarget(null);
  };

  const handleUnequip = () => {
    const prevOwner = piece.equippedBy;
    setInventory(prev => prev.map(g => g.instanceId === piece.instanceId ? { ...g, equippedBy: null } : g));
    setCmds(prev => prev.map(c => {
      if (c.uid !== prevOwner) return c;
      return { ...c, gear: { ...(c.gear ?? {}), [piece.slot]: null } };
    }));
  };

  const ROW = ({ label, value, gold }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "3px 0", borderBottom: "1px solid #1a1408" }}>
      <span style={{ fontSize: 7, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>{label}</span>
      <span style={{ fontSize: 7, color: gold ? "#f0c040" : r.color, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: 6, height: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "6px 0", borderBottom: `1px solid ${r.color}30`, flexShrink: 0 }}>
        <div style={{ fontSize: 24 }}>{piece.icon}</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: "#e0d0c0", textAlign: "center", lineHeight: 1.3 }}>{piece.n}</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ padding: "1px 4px", borderRadius: 3, background: `${r.color}18`,
            border: `1px solid ${r.color}40`, fontSize: 6, color: r.color, fontFamily: "'Cinzel',serif" }}>{r.n}</span>
          <span style={{ padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,.03)",
            border: "1px solid #2a2010", fontSize: 6, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>
            {slot?.icon} {slot?.n}
          </span>
        </div>
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <StarRow count={piece.stars} size={7} />
          {piece.goldStars > 0 && <><span style={{ color: "#3a3020", fontSize: 7 }}>·</span><StarRow count={piece.goldStars} gold size={7} /></>}
        </div>
        {piece.equippedBy && (
          <div style={{ fontSize: 6, color: "#cc6060", fontFamily: "'Cinzel',serif" }}>
            Eq: {cmds?.find(c => c.uid === piece.equippedBy)?.n ?? "Unknown"}
          </div>
        )}
      </div>

      {/* Stats */}
      <div>
        <ROW
          label={`${STAT_BASE[piece.primaryStat]?.icon ?? ""} ${STAT_BASE[piece.primaryStat]?.label ?? piece.primaryStat}`}
          value={STAT_BASE[piece.primaryStat] ? Math.round(STAT_BASE[piece.primaryStat].base * (r.statMult ?? 1) * (1 + piece.stars * 0.12)) : "—"}
        />
        {piece.secStats?.map((s, i) => (
          <ROW key={i} label={`${STAT_BASE[s.key]?.icon ?? ""} ${STAT_BASE[s.key]?.label ?? s.key}`} value={`+${s.value}`} gold={s.gold} />
        ))}
      </div>

      {/* Equip / Unequip */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e1810", borderRadius: 5, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "3px 7px", borderBottom: "1px solid #1a1508",
          fontFamily: "'Cinzel',serif", fontSize: 6, color: "#6a5a3a", letterSpacing: ".06em" }}>EQUIP</div>
        <div style={{ padding: 6 }}>
          {piece.equippedBy ? (
            <button onClick={handleUnequip} style={{
              width: "100%", padding: "5px 0",
              background: "rgba(180,60,60,.12)", border: "1px solid rgba(180,60,60,.35)",
              color: "#cc6060", fontFamily: "'Cinzel',serif", fontSize: 7,
              borderRadius: 4, cursor: "pointer", touchAction: "manipulation",
            }}>↩ Unequip</button>
          ) : equipTarget ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {eligibleCmds.map(cmd => (
                <button key={cmd.uid} onClick={() => handleEquip(cmd.uid)} style={{
                  padding: "4px 6px", textAlign: "left",
                  background: "rgba(40,100,60,.1)", border: "1px solid rgba(40,140,80,.3)",
                  color: "#80d090", fontFamily: "'Cinzel',serif", fontSize: 7,
                  borderRadius: 4, cursor: "pointer", touchAction: "manipulation",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ fontSize: 12 }}>{cmd.icon}</span>
                  <div>
                    <div>{cmd.n}</div>
                    <div style={{ fontSize: 6, color: "#3a5a3a", marginTop: 1 }}>
                      {cmd.gear?.[piece.slot] ? "⚠ Replaces current" : "Slot empty"}
                    </div>
                  </div>
                </button>
              ))}
              <button onClick={() => setEquipTarget(null)} style={{
                padding: "3px 6px", background: "none", border: "1px solid #1e1810",
                color: "#4a3a28", fontFamily: "'Cinzel',serif", fontSize: 6,
                borderRadius: 4, cursor: "pointer", touchAction: "manipulation",
              }}>Cancel</button>
            </div>
          ) : eligibleCmds.length === 0 ? (
            <div style={{ fontSize: 6, color: "#3a3020", fontFamily: "'Crimson Pro',serif", fontStyle: "italic" }}>No eligible commanders</div>
          ) : (
            <button onClick={() => setEquipTarget(true)} style={{
              width: "100%", padding: "5px 0",
              background: "rgba(40,100,60,.12)", border: "1px solid rgba(40,140,80,.35)",
              color: "#3daa60", fontFamily: "'Cinzel',serif", fontSize: 7,
              borderRadius: 4, cursor: "pointer", touchAction: "manipulation",
            }}>⚔ Equip</button>
          )}
        </div>
      </div>

      {/* Strengthen */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e1810", borderRadius: 5, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "3px 7px", borderBottom: "1px solid #1a1508",
          fontFamily: "'Cinzel',serif", fontSize: 6, color: "#6a5a3a", letterSpacing: ".06em" }}>
          STRENGTHEN ({piece.stars}/5★)
        </div>
        <div style={{ padding: 6 }}>
          {piece.stars >= 5
            ? <div style={{ fontSize: 6, color: "#f0c040", fontFamily: "'Cinzel',serif" }}>⭐ Max stars</div>
            : <>
                <div style={{ fontSize: 6, color: "#5a4a3a", fontFamily: "'Crimson Pro',serif", marginBottom: 4 }}>
                  Cost: {strCost} × {r.n} · Have: {sameRarityCount}
                </div>
                <button onClick={handleStrengthen} disabled={!canStr} style={{
                  width: "100%", padding: "5px 0",
                  background: canStr ? `${r.color}18` : "rgba(255,255,255,.02)",
                  border: `1px solid ${canStr ? r.color + "45" : "#1e1810"}`,
                  color: canStr ? r.color : "#2a2a2a",
                  fontFamily: "'Cinzel',serif", fontSize: 7,
                  borderRadius: 4, cursor: canStr ? "pointer" : "not-allowed", touchAction: "manipulation",
                }}>★ → {piece.stars + 1} stars</button>
              </>
          }
        </div>
      </div>

      {/* Refine */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid #1e1810", borderRadius: 5, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "3px 7px", borderBottom: "1px solid #1a1508",
          fontFamily: "'Cinzel',serif", fontSize: 6, color: "#6a5a3a", letterSpacing: ".06em" }}>
          REFINE ({piece.goldStars}/{piece.secStats?.length ?? 0}✦)
        </div>
        <div style={{ padding: 6 }}>
          {piece.goldStars >= (piece.secStats?.length ?? 0)
            ? <div style={{ fontSize: 6, color: "#f0c040", fontFamily: "'Cinzel',serif" }}>✦ All refined</div>
            : <>
                <div style={{ fontSize: 6, color: "#5a4a3a", fontFamily: "'Crimson Pro',serif", marginBottom: 4 }}>
                  Cost: 1 duplicate · Have: {dupeCount}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                      padding: "3px 7px", textAlign: "left",
                      background: canRef ? "rgba(240,192,64,.08)" : "rgba(255,255,255,.015)",
                      border: `1px solid ${canRef ? "rgba(240,192,64,.3)" : "#1a1a1a"}`,
                      color: canRef ? "#f0c040" : "#2a2a2a",
                      fontFamily: "'Cinzel',serif", fontSize: 6,
                      borderRadius: 3, cursor: canRef ? "pointer" : "not-allowed", touchAction: "manipulation",
                    }}>✦ {STAT_BASE[s.key]?.label} +{s.value}</button>
                  ))}
                </div>
              </>
          }
        </div>
      </div>
    </div>
  );
}

function GearTab({ gearInventory, setGearInventory, cmds, setCmds, playerAlignment }) {
  const [selectedId, setSelectedId] = useState(null);
  const [filterR, setFilterR]       = useState(null);
  const [filterS, setFilterS]       = useState(null);

  const sorted = [...(gearInventory ?? [])]
    .filter(g => (!filterR || g.rarity === filterR) && (!filterS || g.slot === filterS))
    .sort((a, b) => {
      const aEq = a.equippedBy != null ? 0 : 1;
      const bEq = b.equippedBy != null ? 0 : 1;
      if (aEq !== bEq) return aEq - bEq;
      const ra = RARITY_ORDER[a.rarity] ?? 9;
      const rb = RARITY_ORDER[b.rarity] ?? 9;
      if (ra !== rb) return ra - rb;
      const slotKeys = Object.keys(GEAR_SLOTS);
      const sa = slotKeys.indexOf(a.slot), sb = slotKeys.indexOf(b.slot);
      if (sa !== sb) return sa - sb;
      return ((b.stars ?? 0) + (b.goldStars ?? 0)) - ((a.stars ?? 0) + (a.goldStars ?? 0));
    });

  const selectedPiece = (gearInventory ?? []).find(g => g.instanceId === selectedId) ?? null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* Filter bar */}
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #1a1508",
        background: "rgba(0,0,0,.2)", flexShrink: 0, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        {Object.entries(GEAR_SLOTS).map(([key, s]) => {
          const on = filterS === key;
          return (
            <button key={key} onClick={() => setFilterS(on ? null : key)} style={{
              padding: "5px 8px", borderRadius: 5, cursor: "pointer", touchAction: "manipulation",
              background: on ? "rgba(200,160,64,.18)" : "rgba(255,255,255,.04)",
              border: `1px solid ${on ? "rgba(200,160,64,.55)" : "#2a2010"}`,
              color: on ? "#c8a040" : "#5a4a30",
              fontFamily: "'Cinzel',serif", fontSize: 8,
            }}>{s.icon} {s.n}</button>
          );
        })}
        <div style={{ width: 1, height: 16, background: "#2a2010", flexShrink: 0 }} />
        {Object.entries(GEAR_RARITY).reverse().map(([key, r]) => (
          <button key={key} onClick={() => setFilterR(filterR === key ? null : key)} style={{
            padding: "4px 7px", borderRadius: 4, cursor: "pointer", touchAction: "manipulation",
            background: filterR === key ? `${r.color}18` : "rgba(255,255,255,.03)",
            border: `1px solid ${filterR === key ? r.color + "55" : "#1e1810"}`,
            color: filterR === key ? r.color : "#4a3a28",
            fontFamily: "'Cinzel',serif", fontSize: 8,
          }}>{r.n}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 7, color: "#3a2e18", fontFamily: "'Cinzel',serif" }}>
          {sorted.length}pc
        </span>
      </div>

      <SplitLayout detail={
        <GearDetailPanel
          piece={selectedPiece}
          inventory={gearInventory ?? []}
          setInventory={setGearInventory}
          cmds={cmds}
          setCmds={setCmds}
          playerAlignment={playerAlignment}
        />
      }>
        {sorted.length === 0
          ? <div style={{ gridColumn: "1/-1", padding: 20, textAlign: "center",
              color: "#2a2010", fontFamily: "'Cinzel',serif", fontSize: 9, fontStyle: "italic" }}>
              No gear{filterR || filterS ? " matching filters" : " in inventory"}
            </div>
          : sorted.map(g => (
              <GearPortraitCard key={g.instanceId} piece={g}
                selected={g.instanceId === selectedId}
                onClick={() => setSelectedId(g.instanceId === selectedId ? null : g.instanceId)} />
            ))
        }
      </SplitLayout>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMATICS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SchematicCard({ sc, count, selected, onClick }) {
  const col = RARITY_COLOR[sc.rarity] ?? "#8a8a8a";
  const name = sc.isGeneric
    ? `Generic ${sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)}`
    : (sc.commanderName ?? "Schematic");
  return (
    <button onClick={onClick} style={{
      background: selected ? `${col}20` : "rgba(255,255,255,.03)",
      border: `2px solid ${selected ? col : col + "28"}`,
      borderRadius: 8, padding: "8px 6px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      cursor: "pointer", touchAction: "manipulation",
      boxShadow: selected ? `0 0 12px ${col}40` : "none",
      transition: "all .15s", position: "relative",
    }}>
      {/* Count badge */}
      <div style={{
        position: "absolute", top: 3, right: 3,
        minWidth: 16, height: 16, borderRadius: 8,
        background: `${col}30`, border: `1px solid ${col}50`,
        fontSize: 7, color: col, fontFamily: "'Cinzel',serif", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
      }}>×{count}</div>
      <div style={{ fontSize: 24 }}>{sc.icon ?? "📜"}</div>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#e0d0c0",
        textAlign: "center", lineHeight: 1.3,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: "100%", padding: "0 4px" }}>{name}</div>
      <div style={{ fontSize: 7, color: col, fontFamily: "'Cinzel',serif" }}>
        {sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)}
      </div>
      <div style={{ fontSize: 7, color: "#6a5a3a", fontFamily: "'Crimson Pro',serif" }}>+{sc.points} pts</div>
    </button>
  );
}

function SchematicDetailPanel({ entry }) {
  if (!entry) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 8,
      color: "#3a2a10", fontFamily: "'Cinzel',serif", fontSize: 9, padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 28, opacity: 0.3 }}>📜</div>
      Select a schematic
    </div>
  );

  const { sc, count } = entry;
  const col = RARITY_COLOR[sc.rarity] ?? "#8a8a8a";
  const name = sc.isGeneric
    ? `Generic ${sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)} Schematic`
    : `${sc.commanderName} Schematic`;

  return (
    <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: 6, height: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "6px 0", borderBottom: `1px solid ${col}30`, flexShrink: 0 }}>
        <div style={{ fontSize: 24 }}>{sc.icon ?? "📜"}</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: "#e0d0c0", textAlign: "center", lineHeight: 1.3 }}>{name}</div>
        <div style={{ padding: "1px 6px", borderRadius: 4, background: `${col}18`,
          border: `1px solid ${col}40`, fontSize: 6, color: col, fontFamily: "'Cinzel',serif" }}>
          {sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)}
        </div>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        {[
          ["Respect Pts", `+${sc.points}`, col],
          ["In Inventory", `×${count}`, "#c8a060"],
          ...(sc.commanderName ? [["Commander", sc.commanderName, "#e0d0c0"]] : []),
        ].map(([label, value, color]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 7px", background: "rgba(255,255,255,.03)", border: "1px solid #1e1810", borderRadius: 4 }}>
            <span style={{ fontSize: 7, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>{label}</span>
            <span style={{ fontSize: 7, color: color, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>{value}</span>
          </div>
        ))}
        <div style={{ padding: "6px 7px", background: "rgba(255,255,255,.02)", border: "1px solid #1e1810",
          borderRadius: 4, fontFamily: "'Crimson Pro',serif", fontSize: 8, color: "#6a5a3a",
          fontStyle: "italic", lineHeight: 1.5 }}>
          {sc.isGeneric
            ? `Any ${sc.rarity} commander. Apply from the Commander screen.`
            : `Specific to ${sc.commanderName}. Apply from the Commander screen.`}
        </div>
      </div>
    </div>
  );
}

function SchematicsTab({ schematics }) {
  const [selectedKey, setSelectedKey] = useState(null);

  if (!schematics?.length) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      color: "#4a3a20", fontFamily: "'Cinzel',serif" }}>
      <div style={{ fontSize: 36, opacity: 0.3 }}>📜</div>
      <div style={{ fontSize: 10, letterSpacing: ".05em" }}>NO SCHEMATICS</div>
      <div style={{ fontSize: 8, color: "#2a1e10", textAlign: "center", maxWidth: 200 }}>
        Pull from the Summon gate to collect commander schematics
      </div>
    </div>
  );

  // Group by key
  const grouped = new Map();
  for (const sc of schematics) {
    const key = `${sc.rarity}|${sc.commanderId ?? "generic"}|${sc.commanderName ?? ""}`;
    if (!grouped.has(key)) grouped.set(key, { sc, count: 0, key });
    grouped.get(key).count++;
  }

  const sorted = [...grouped.values()].sort((a, b) => {
    const ra = CMD_RARITY_ORDER[a.sc.rarity] ?? 9, rb = CMD_RARITY_ORDER[b.sc.rarity] ?? 9;
    if (ra !== rb) return ra - rb;
    if (b.count !== a.count) return b.count - a.count;
    return (a.sc.commanderName ?? "").localeCompare(b.sc.commanderName ?? "");
  });

  const selectedEntry = grouped.get(selectedKey) ?? null;

  return (
    <SplitLayout detail={<SchematicDetailPanel entry={selectedEntry} />}>
      {sorted.map(({ sc, count, key }) => (
        <SchematicCard key={key} sc={sc} count={count}
          selected={selectedKey === key}
          onClick={() => setSelectedKey(selectedKey === key ? null : key)} />
      ))}
    </SplitLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSUMABLES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ConsumableCard({ def, quantity, selected, onClick }) {
  const rar = CONS_RARITY[def.rarity];
  return (
    <button onClick={onClick} style={{
      background: selected ? `${rar.color}20` : "rgba(255,255,255,.03)",
      border: `2px solid ${selected ? rar.color : rar.color + "28"}`,
      borderRadius: 8, padding: "8px 6px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      cursor: "pointer", touchAction: "manipulation",
      boxShadow: selected ? `0 0 12px ${rar.color}40` : "none",
      transition: "all .15s", position: "relative",
      opacity: quantity === 0 ? 0.4 : 1,
    }}>
      {/* Quantity badge */}
      <div style={{
        position: "absolute", top: 3, right: 3,
        minWidth: 16, height: 16, borderRadius: 8,
        background: `${rar.color}30`, border: `1px solid ${rar.color}50`,
        fontSize: 7, color: rar.color, fontFamily: "'Cinzel',serif", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
      }}>×{quantity}</div>
      <div style={{ fontSize: 22 }}>{def.icon}</div>
      <div style={{
        fontFamily: "'Cinzel',serif", fontSize: 7, color: "#e0d0c0",
        textAlign: "center", lineHeight: 1.3,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        maxWidth: "100%", padding: "0 2px",
      }}>{def.label}</div>
      <div style={{ fontSize: 6, color: rar.color, fontFamily: "'Cinzel',serif" }}>{rar.label}</div>
    </button>
  );
}

function ConsumableDetailPanel({ def, quantity, onUse }) {
  if (!def) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 8,
      color: "#3a2a10", fontFamily: "'Cinzel',serif", fontSize: 9, padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 28, opacity: 0.3 }}>🎒</div>
      Select an item
    </div>
  );

  const rar = CONS_RARITY[def.rarity];
  const canUse = quantity > 0 && def.applies !== "relocation";

  return (
    <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 6, height: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "6px 0", borderBottom: `1px solid ${rar.color}30`, flexShrink: 0 }}>
        <div style={{ fontSize: 26 }}>{def.icon}</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: "#e0d0c0",
          textAlign: "center", lineHeight: 1.3 }}>{def.label}</div>
        <div style={{ padding: "1px 6px", borderRadius: 4, background: `${rar.color}18`,
          border: `1px solid ${rar.color}40`, fontSize: 6, color: rar.color, fontFamily: "'Cinzel',serif" }}>
          {rar.label}
        </div>
      </div>

      {/* Info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "4px 7px", background: "rgba(255,255,255,.03)", border: "1px solid #1e1810", borderRadius: 4 }}>
          <span style={{ fontSize: 7, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>Owned</span>
          <span style={{ fontSize: 7, color: "#c8a060", fontFamily: "'Cinzel',serif", fontWeight: 700 }}>×{quantity}</span>
        </div>
        {def.durationLabel && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 7px", background: "rgba(255,255,255,.03)", border: "1px solid #1e1810", borderRadius: 4 }}>
            <span style={{ fontSize: 7, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>Duration</span>
            <span style={{ fontSize: 7, color: rar.color, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>{def.durationLabel}</span>
          </div>
        )}
        {def.applies === "rss" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 7px", background: "rgba(255,255,255,.03)", border: "1px solid #1e1810", borderRadius: 4 }}>
            <span style={{ fontSize: 7, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>Effect</span>
            <span style={{ fontSize: 7, color: "#80b040", fontFamily: "'Cinzel',serif", fontWeight: 700 }}>+30% Production</span>
          </div>
        )}

        {/* Description */}
        <div style={{ padding: "6px 7px", background: "rgba(255,255,255,.02)", border: "1px solid #1e1810",
          borderRadius: 4, fontFamily: "'Crimson Pro',serif", fontSize: 8, color: "#6a5a3a",
          fontStyle: "italic", lineHeight: 1.5 }}>
          {def.desc}
        </div>

        {/* Use button */}
        <button
          onClick={() => canUse && onUse(def.id)}
          disabled={!canUse}
          style={{
            width: "100%", padding: "7px 0", marginTop: 4,
            background: canUse ? `${rar.color}20` : "rgba(255,255,255,.02)",
            border: `1px solid ${canUse ? rar.color + "60" : "#1e1810"}`,
            color: canUse ? rar.color : "#2a2a2a",
            fontFamily: "'Cinzel',serif", fontSize: 8, letterSpacing: ".04em",
            borderRadius: 5, cursor: canUse ? "pointer" : "not-allowed",
            touchAction: "manipulation",
          }}>
          {def.applies === "relocation" ? "🧭 Coming Soon" : `Use ${def.icon}`}
        </button>
      </div>
    </div>
  );
}

function ConsumablesTab({ consumables, onUseConsumable }) {
  const [selectedId, setSelectedId] = useState(null);

  // Build a flat list of all defined consumables with quantities (even 0)
  // Only show types the player has at least 1 of
  const qtyMap = {};
  for (const c of (consumables ?? [])) {
    qtyMap[c.typeId] = (qtyMap[c.typeId] ?? 0) + c.quantity;
  }

  // Build display list: only types with qty > 0, ordered by group then duration
  const items = CONSUMABLE_GROUPS.flatMap(group =>
    group.ids
      .filter(id => (qtyMap[id] ?? 0) > 0)
      .map(id => ({ def: CONSUMABLE_DEFS[id], quantity: qtyMap[id] ?? 0 }))
  );

  const selectedDef = selectedId ? CONSUMABLE_DEFS[selectedId] : null;
  const selectedQty = selectedId ? (qtyMap[selectedId] ?? 0) : 0;

  if (!items.length) return (
    <SplitLayout detail={
      <div style={{ height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        color: "#3a2a10", fontFamily: "'Cinzel',serif", fontSize: 9, padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 28, opacity: 0.3 }}>🧪</div>
        No items
      </div>
    }>
      <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, padding: 30,
        color: "#4a3a20", fontFamily: "'Cinzel',serif" }}>
        <div style={{ fontSize: 36, opacity: 0.3 }}>🧪</div>
        <div style={{ fontSize: 10, letterSpacing: ".05em" }}>NO CONSUMABLES</div>
        <div style={{ fontSize: 8, color: "#2a1e10", textAlign: "center", maxWidth: 180 }}>
          Speed ups, boosts, and tokens will appear here
        </div>
      </div>
    </SplitLayout>
  );

  return (
    <SplitLayout detail={
      <ConsumableDetailPanel
        def={selectedDef}
        quantity={selectedQty}
        onUse={(id) => { onUseConsumable?.(id); }}
      />
    }>
      {items.map(({ def, quantity }) => (
        <ConsumableCard
          key={def.id}
          def={def}
          quantity={quantity}
          selected={selectedId === def.id}
          onClick={() => setSelectedId(selectedId === def.id ? null : def.id)}
        />
      ))}
    </SplitLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAG SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function BagScreen({
  gearInventory, setGearInventory,
  cmds, setCmds,
  playerAlignment,
  respectSchematics,
  consumables,
  onUseConsumable,
  onClose,
}) {
  const [tab, setTab] = useState("gear");

  useEffect(() => {
    document.documentElement.classList.add("gacha-open");
    return () => document.documentElement.classList.remove("gacha-open");
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9200,
      background: "#080704",
      display: "flex", flexDirection: "column",
      paddingLeft: "var(--sal, 0px)",
      height: "100dvh", overflow: "hidden",
    }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", paddingTop: "calc(var(--sat) + 12px)",
        background: "linear-gradient(180deg,rgba(20,15,5,1),rgba(10,8,3,.97))",
        borderBottom: "1px solid #2a1e08", flexShrink: 0, position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,#8a6020 20%,#f0c04066 50%,#8a6020 80%,transparent)" }} />
        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", border: "1px solid #2e2010",
          color: "#8a7050", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, touchAction: "manipulation",
        }}>←</button>
        <div style={{
          fontFamily: "'Cinzel Decorative',serif", fontSize: 13,
          background: "linear-gradient(135deg,#c8a040,#8a6020aa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: ".04em",
        }}>🎒 Bag</div>
        <div style={{ marginLeft: "auto", fontFamily: "'Cinzel',serif", fontSize: 8, color: "#4a3a20" }}>
          {tab === "gear" ? `${gearInventory?.length ?? 0} pieces` :
           tab === "schematics" ? `${respectSchematics?.length ?? 0} schematics` :
           tab === "consumables" ? `${(consumables ?? []).reduce((s, c) => s + c.quantity, 0)} items` : ""}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid #2a1e08", background: "rgba(0,0,0,.3)" }}>
        <Tab label="⚔ GEAR"         active={tab === "gear"}         onClick={() => setTab("gear")} />
        <Tab label="📜 SCHEMATICS"  active={tab === "schematics"}   onClick={() => setTab("schematics")} />
        <Tab label="🧪 CONSUMABLES" active={tab === "consumables"}  onClick={() => setTab("consumables")} />
      </div>

      {/* Content */}
      {tab === "gear" && (
        <GearTab
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          cmds={cmds}
          setCmds={setCmds}
          playerAlignment={playerAlignment}
        />
      )}
      {tab === "schematics" && <SchematicsTab schematics={respectSchematics} />}
      {tab === "consumables" && <ConsumablesTab consumables={consumables} onUseConsumable={onUseConsumable} />}
    </div>
  );
}
