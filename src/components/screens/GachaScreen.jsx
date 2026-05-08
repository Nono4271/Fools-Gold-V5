import { useState } from "react";
import { CSS } from "../../constants/css.js";
import { ALIGNMENT, PLAYABLE_FACTIONS, HDEFS, RC, RARITY, CLASS, PITY, PULL_COST, RESPECT_DUPE_POINTS } from "../../../shared/constants/heroes.js";
import { GEAR_RARITY, GEAR_SLOTS, STAT_BASE } from "../../../shared/constants/gear.js";

const PULL_RATES_DISPLAY = { soldier: 0.85, veteran: 0.12, champion: 0.03 };

/* ── Slot result card — renders one of the 3 items in a pull ── */
function SlotCard({ slot, index, coll }) {
  const delay = `${index * 0.08}s`;

  if (slot.type === "commander") {
    const h = slot.data;
    if (!h) return null;
    const r = RARITY[h.rarity];
    const cls = CLASS[h.cls];
    const isDupe = coll.find(x => x.id === h.id);
    return (
      <div style={{
        background: "rgba(255,255,255,.04)", border: `2px solid ${r?.color ?? "#888"}`,
        borderRadius: 7, padding: 10, textAlign: "center",
        animation: `popIn .3s ease ${delay} both`,
        boxShadow: h.rarity === "champion" ? `0 0 16px ${r.color}55` : "none",
        position: "relative", flex: 1, minWidth: 0,
      }}>
        <div style={{ fontSize: 7, color: "#4a4a5a", fontFamily: "'Cinzel',serif",
          letterSpacing: ".08em", marginBottom: 5 }}>COMMANDER</div>
        <div style={{ fontSize: 28 }}>{h.icon}</div>
        <div style={{ color: r?.color, fontSize: 7, fontFamily: "'Cinzel',serif",
          fontWeight: 700, marginTop: 3 }}>{r?.n}</div>
        <div style={{ color: "#9a9aba", fontSize: 6, fontFamily: "'Cinzel',serif", marginTop: 1 }}>
          {cls?.icon} {cls?.n}
        </div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, fontWeight: 700,
          color: "#e0d0c0", lineHeight: 1.3, marginTop: 4 }}>{h.n}</div>
        {isDupe
          ? <div style={{ marginTop: 4, fontSize: 7, color: "#f0c040",
              fontFamily: "'Crimson Pro',serif", fontStyle: "italic" }}>
              +{RESPECT_DUPE_POINTS[h.rarity]}R respect
            </div>
          : <div style={{ marginTop: 4, fontSize: 7, color: "#3daa60",
              fontFamily: "'Cinzel',serif" }}>NEW</div>
        }
      </div>
    );
  }

  if (slot.type === "gear") {
    const g = slot.data;
    if (!g) return null;
    const r = GEAR_RARITY[g.rarity];
    const s = GEAR_SLOTS[g.slot];
    return (
      <div style={{
        background: "rgba(255,255,255,.03)", border: `2px solid ${r?.color ?? "#888"}30`,
        borderRadius: 7, padding: 10, textAlign: "center",
        animation: `popIn .3s ease ${delay} both`,
        flex: 1, minWidth: 0,
      }}>
        <div style={{ fontSize: 7, color: "#4a4a5a", fontFamily: "'Cinzel',serif",
          letterSpacing: ".08em", marginBottom: 5 }}>GEAR</div>
        <div style={{ fontSize: 26 }}>{g.icon}</div>
        <div style={{ color: r?.color, fontSize: 7, fontFamily: "'Cinzel',serif",
          fontWeight: 700, marginTop: 3 }}>{r?.n}</div>
        <div style={{ color: "#6a5a3a", fontSize: 6, fontFamily: "'Cinzel',serif", marginTop: 1 }}>
          {s?.icon} {s?.n}
        </div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 8, fontWeight: 700,
          color: "#d0c0a0", lineHeight: 1.3, marginTop: 4 }}>{g.n}</div>
        <div style={{ fontSize: 7, color: "#4a4040", fontFamily: "'Cinzel',serif", marginTop: 3 }}>
          {STAT_BASE[g.primaryStat]?.icon} {STAT_BASE[g.primaryStat]?.label}
        </div>
      </div>
    );
  }

  if (slot.type === "respectSchematic") {
    const s = slot.data;
    if (!s) return null;
    const rarityColor = s.rarityColor ?? (s.rarity === "champion" ? "#f0c040" : s.rarity === "veteran" ? "#a855f7" : "#4488cc");
    return (
      <div style={{
        background: "rgba(255,255,255,.03)",
        border: `2px solid ${rarityColor}`,
        borderRadius: 7, padding: 10, textAlign: "center",
        animation: `popIn .3s ease ${delay} both`,
        boxShadow: `0 0 10px ${rarityColor}33`,
        flex: 1, minWidth: 0,
      }}>
        <div style={{ fontSize: 7, color: "#4a4a5a", fontFamily: "'Cinzel',serif",
          letterSpacing: ".08em", marginBottom: 5 }}>
          {s.isGeneric ? "GENERIC SCHEMATIC" : "SCHEMATIC"}
        </div>
        <div style={{ fontSize: 26 }}>{s.icon}</div>
        <div style={{ color: rarityColor, fontSize: 7, fontFamily: "'Cinzel',serif",
          fontWeight: 700, marginTop: 3 }}>
          {s.rarity.charAt(0).toUpperCase() + s.rarity.slice(1)}
        </div>
        {s.isGeneric ? (
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#7a6a4a",
            lineHeight: 1.3, marginTop: 4, fontStyle: "italic" }}>Generic Schematic</div>
        ) : (
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: rarityColor,
            lineHeight: 1.3, marginTop: 4, fontWeight: 700 }}>{s.commanderName}</div>
        )}
        <div style={{ fontSize: 9, color: rarityColor, fontFamily: "'Cinzel',serif",
          fontWeight: 700, marginTop: 4 }}>+{s.points} Respect</div>
        <div style={{ fontSize: 7, color: "#4a4040", fontFamily: "'Crimson Pro',serif",
          fontStyle: "italic", marginTop: 2 }}>
          {s.isGeneric ? "Apply to any commander" : `Only for ${s.commanderName}`}
        </div>
      </div>
    );
  }

  return null;
}

/* ── Pull results: shows all pulls, each as a row of 3 slots ── */
function PullResults({ pullResults, coll }) {
  if (!pullResults?.length) return null;
  // Show the most recent pull group at top (last n pulls)
  // For x10, show all 10 rows collapsed with most recent on top
  const [expanded, setExpanded] = useState(true);
  const latest = pullResults[0];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8 }}>
        <div style={{ fontSize: 8, color: "#7a6a8a", letterSpacing: ".1em",
          fontFamily: "'Cinzel',serif" }}>
          SUMMONED — {pullResults.length} pull{pullResults.length !== 1 ? "s" : ""} · 3 items each
        </div>
        {pullResults.length > 1 && (
          <button onClick={() => setExpanded(e => !e)} style={{
            background: "none", border: "1px solid #2a2010", color: "#5a4a3a",
            fontFamily: "'Cinzel',serif", fontSize: 7, padding: "2px 7px",
            borderRadius: 3, cursor: "pointer",
          }}>{expanded ? "Collapse" : "Expand all"}</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(expanded ? pullResults : [latest]).map((pr, pi) => (
          <div key={pr.id} style={{
            background: "rgba(255,255,255,.015)", border: "1px solid #1a1810",
            borderRadius: 6, padding: "8px 10px",
          }}>
            <div style={{ fontSize: 7, color: "#3a2e18", fontFamily: "'Cinzel',serif",
              marginBottom: 6, letterSpacing: ".06em" }}>
              PULL {pullResults.length - pi} — 3 ITEMS
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {pr.slots.map((slot, si) => (
                <SlotCard key={si} slot={slot} index={si} coll={coll} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Schematic inventory strip ── */
function SchematicStrip({ schematics, cmds, setCmds, onSchematicUsed }) {
  const [applying, setApplying] = useState(null); // schematic instanceId being applied

  if (!schematics?.length) return null;

  const handleApply = (schematic, targetCmd) => {
    if (!targetCmd) return;
    // Add respect to the target commander
    setCmds(prev => prev.map(c => {
      if (c.uid !== targetCmd.uid) return c;
      const pts = schematic.points;
      const newRespectPoints = (c.respectPoints ?? 0) + pts;
      return { ...c, respectPoints: newRespectPoints };
    }));
    onSchematicUsed(schematic.instanceId);
    setApplying(null);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 8, color: "#7a6a5a", letterSpacing: ".1em",
        fontFamily: "'Cinzel',serif", marginBottom: 7 }}>
        RESPECT SCHEMATICS ({schematics.length})
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {schematics.map(s => {
          const rarityColor = s.rarityColor ?? (s.rarity === "champion" ? "#f0c040" : s.rarity === "veteran" ? "#a855f7" : "#4488cc");
          const isOpen = applying === s.instanceId;
          // For specific schematics, only the target commander is valid
          const eligibleCmds = s.isGeneric
            ? (cmds ?? []).filter(c => c.owner === "player")
            : (cmds ?? []).filter(c => c.owner === "player" && c.id === s.commanderId);
          return (
            <div key={s.instanceId} style={{
              background: "rgba(255,255,255,.03)",
              border: `1px solid ${rarityColor}`,
              borderRadius: 5, padding: "6px 10px",
              boxShadow: `0 0 6px ${rarityColor}22`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: rarityColor, fontFamily: "'Cinzel',serif",
                    fontWeight: 700 }}>+{s.points} Respect</div>
                  <div style={{ fontSize: 7, color: "#6a5a3a", fontFamily: "'Cinzel',serif" }}>
                    {s.isGeneric
                      ? `Generic ${s.rarity.charAt(0).toUpperCase() + s.rarity.slice(1)}`
                      : s.commanderName}
                  </div>
                </div>
                <button onClick={() => setApplying(isOpen ? null : s.instanceId)} style={{
                  padding: "3px 8px", borderRadius: 3,
                  background: `${rarityColor}20`, border: `1px solid ${rarityColor}60`,
                  color: rarityColor, fontFamily: "'Cinzel',serif", fontSize: 7, cursor: "pointer",
                }}>Apply</button>
              </div>
              {isOpen && (
                <div style={{ marginTop: 7, borderTop: `1px solid ${rarityColor}30`, paddingTop: 7 }}>
                  {eligibleCmds.length === 0 ? (
                    <div style={{ fontSize: 7, color: "#5a4040", fontFamily: "'Cinzel',serif",
                      fontStyle: "italic" }}>
                      {s.isGeneric ? "No commanders available" : `${s.commanderName} not in roster`}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {eligibleCmds.map(c => (
                        <button key={c.uid} onClick={() => handleApply(s, c)} style={{
                          padding: "4px 8px", borderRadius: 3,
                          background: `${rarityColor}15`, border: `1px solid ${rarityColor}50`,
                          color: "#c0b090", fontFamily: "'Cinzel',serif", fontSize: 7,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <span style={{ fontSize: 12 }}>{c.icon}</span>
                          <span>{c.n}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main screen ── */
export default function GachaScreen({
  screen, tiles, gems, pull,
  pullResults, coll, gearInventory, respectSchematics,
  cmds, setCmds, onSchematicUsed,
  pityCounters, isFreeAvailable, isHalfAvailable, playerAlignment, setScreen,
}) {
  const aln = ALIGNMENT[playerAlignment];
  const [activeTab, setActiveTab] = useState("summon"); // "summon" | "gear" | "collection"

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0c10",
      display: "flex", flexDirection: "column", overflow: "hidden", touchAction: "pan-y" }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{
        padding: "10px 14px 0",
        background: "linear-gradient(180deg,rgba(12,9,4,1),rgba(10,8,3,.97))",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setScreen("game")}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "rgba(255,255,255,.04)", border: "1px solid #2a2010",
                color: "#8a7050", fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>←</button>
            <h2 style={{
              fontFamily: "'Cinzel Decorative',serif", fontSize: "clamp(12px,4vw,18px)",
              background: "linear-gradient(135deg,#bb88ee,#8840cc,#bb88ee)",
              backgroundSize: "200% auto", WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite",
            }}>✦ SUMMONS</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ padding: "3px 10px", background: "rgba(240,192,64,.08)",
              border: "1px solid rgba(240,192,64,.22)", borderRadius: 3,
              color: "#f0c040", fontFamily: "'Cinzel',serif", fontSize: 10 }}>
              💎 {gems}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1a1810" }}>
          {[["summon","✦ Summon"],["collection","📜 Collection"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: "8px 14px", background: "none",
              borderBottom: activeTab === id ? "2px solid #9940cc" : "2px solid transparent",
              color: activeTab === id ? "#bb88ee" : "#4a3a5a",
              fontFamily: "'Cinzel',serif", fontSize: 9, cursor: "pointer",
              letterSpacing: ".04em", transition: "color .15s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "14px 14px", touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}>

        {/* ── SUMMON TAB ── */}
        {activeTab === "summon" && (
          <>
            {/* Alignment badge + rates */}
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 8, color: "#6a5a7a", letterSpacing: ".08em",
                  fontFamily: "'Crimson Pro',serif" }}>
                  {(PULL_RATES_DISPLAY.champion * 100).toFixed(0)}% Champion ·
                  {(PULL_RATES_DISPLAY.veteran * 100).toFixed(0)}% Veteran ·
                  {(PULL_RATES_DISPLAY.soldier * 100).toFixed(0)}% Soldier
                </p>
                <p style={{ fontSize: 7, color: "#4a3a5a", fontFamily: "'Crimson Pro',serif", marginTop: 2 }}>
                  Each pull: 1 commander/respect · 1 gear · 1 open slot
                </p>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", background: `${aln.color}15`,
                border: `1px solid ${aln.color}40`, borderRadius: 3 }}>
                <span style={{ fontSize: 10 }}>{aln.icon}</span>
                <span style={{ fontSize: 7, color: aln.color, fontFamily: "'Cinzel',serif" }}>
                  {aln.n} pool
                </span>
              </div>
            </div>

            {/* Pity bars */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, padding: "8px 10px",
              background: "rgba(255,255,255,.02)", border: "1px solid #1a1a22", borderRadius: 6 }}>
              {[
                { rarity: "soldier",  label: "Soldier",  pityAt: PITY.soldier,  color: "#4488cc" },
                { rarity: "veteran",  label: "Veteran",  pityAt: PITY.veteran,  color: "#a855f7" },
                { rarity: "champion", label: "Champion", pityAt: PITY.champion, color: "#f0c040" },
              ].map(({ rarity, label, pityAt, color }) => {
                const count = pityCounters?.[rarity] ?? 0;
                const pct = Math.min(100, Math.round((count / pityAt) * 100));
                return (
                  <div key={rarity} style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 7, color, fontFamily: "'Cinzel',serif" }}>{label}</span>
                      <span style={{ fontSize: 7, color: "#4a4a5a", fontFamily: "'Cinzel',serif" }}>
                        {count}/{pityAt}
                      </span>
                    </div>
                    <div style={{ height: 3, background: "#181820", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color,
                        borderRadius: 2, transition: "width .3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pull buttons */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(() => {
                const singleFree = isFreeAvailable;
                const singleColor = singleFree ? "#3daa60" : "#9940cc";
                const singleAffordable = singleFree || gems >= (isHalfAvailable ? 200 : 400);
                const singleLabel = singleFree ? "💚 FREE" : isHalfAvailable ? "💎 200" : "💎 400";
                return (<>
                  <button className="btn" onClick={() => pull(1)} disabled={!singleAffordable}
                    style={{
                      flex: 1, minWidth: 120, padding: "11px 8px",
                      background: singleAffordable
                        ? singleFree
                          ? "linear-gradient(135deg,rgba(40,140,80,.35),rgba(40,140,80,.12))"
                          : "linear-gradient(135deg,rgba(120,50,150,.3),rgba(120,50,150,.1))"
                        : "rgba(255,255,255,.02)",
                      border: `1px solid ${singleAffordable ? singleColor : "#181818"}`,
                      color: singleAffordable ? (singleFree ? "#3daa60" : "#bb88ee") : "#2a2a2a",
                      textAlign: "center", fontSize: 12, position: "relative",
                    }}>
                    {singleFree && (
                      <div style={{
                        position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                        fontSize: 7, color: "#3daa60", fontFamily: "'Cinzel',serif",
                        background: "#0a0c10", padding: "1px 6px",
                        border: "1px solid #3daa6040", borderRadius: 8, whiteSpace: "nowrap",
                      }}>DAILY FREE</div>
                    )}
                    <div style={{ fontSize: 14, marginBottom: 2 }}>✦</div>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>x1 Summon</div>
                    <div style={{ fontSize: 8, color: singleColor, marginTop: 2 }}>{singleLabel}</div>
                    {isHalfAvailable && !singleFree && (
                      <div style={{ fontSize: 7, color: "#5a4a6a", marginTop: 1 }}>Daily discount</div>
                    )}
                  </button>

                  <button className="btn" onClick={() => pull(10)} disabled={gems < 4000}
                    style={{
                      flex: 1, minWidth: 120, padding: "11px 8px",
                      background: gems >= 4000
                        ? "linear-gradient(135deg,rgba(120,50,150,.3),rgba(120,50,150,.1))"
                        : "rgba(255,255,255,.02)",
                      border: `1px solid ${gems >= 4000 ? "#9940cc" : "#181818"}`,
                      color: gems >= 4000 ? "#bb88ee" : "#2a2a2a",
                      textAlign: "center", fontSize: 12,
                    }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>✦✦✦</div>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>x10 Summon</div>
                    <div style={{ fontSize: 8, color: "#9940cc", marginTop: 2 }}>💎 4,000</div>
                  </button>
                </>);
              })()}
            </div>

            {/* Pull results */}
            <PullResults pullResults={pullResults} coll={coll} />

            {/* Respect schematics */}
            <SchematicStrip schematics={respectSchematics} cmds={cmds} setCmds={setCmds} onSchematicUsed={onSchematicUsed} />
          </>
        )}

        {/* ── COLLECTION TAB ── */}
        {activeTab === "collection" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>{aln.icon}</span>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: aln.color,
                letterSpacing: ".1em" }}>{aln.n.toUpperCase()} COLLECTION</span>
              <span style={{ fontSize: 8, color: "#5a4a3a", fontFamily: "'Cinzel',serif", marginLeft: "auto" }}>
                {HDEFS.filter(h => aln.factions.includes(h.faction)).filter(h => coll.find(x => x.id === h.id)).length}/
                {HDEFS.filter(h => aln.factions.includes(h.faction)).length}
              </span>
            </div>
            {PLAYABLE_FACTIONS.filter(f => aln.factions.includes(f.key)).map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, color: f.c, fontFamily: "'Cinzel',serif",
                  letterSpacing: ".08em", marginBottom: 5 }}>{f.s} {f.n}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(84px,1fr))", gap: 5 }}>
                  {HDEFS.filter(h => h.faction === f.key).map(h => {
                    const owned = coll.find(x => x.id === h.id);
                    const r = RARITY[h.rarity];
                    const cls = CLASS[h.cls];
                    return (
                      <div key={h.id} style={{
                        background: "rgba(255,255,255,.02)",
                        border: `1px solid ${owned ? r.color + "70" : "#131318"}`,
                        borderRadius: 5, padding: 6, textAlign: "center",
                        opacity: owned ? 1 : 0.28, filter: owned ? "none" : "grayscale(1)",
                      }}>
                        <div style={{ fontSize: 20 }}>{owned ? h.icon : "❓"}</div>
                        <div style={{ color: r.color, fontSize: 6, fontFamily: "'Cinzel',serif",
                          fontWeight: 700, marginTop: 1 }}>{r.n}</div>
                        <div style={{ color: "#8a8aaa", fontSize: 6, fontFamily: "'Cinzel',serif",
                          marginTop: 1 }}>{cls?.icon} {cls?.n}</div>
                        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7,
                          color: "#c0b090", lineHeight: 1.3, marginTop: 2 }}>
                          {owned ? h.n : "???"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
