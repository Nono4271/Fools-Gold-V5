import { useState } from "react";
import { CSS } from "../../../constants/css.js";
import { RARITY, CLASS, ALIGNMENT, SUBSPECIES } from "../../../../shared/constants/heroes.js";
import { RARITY_ORDER } from "./factionTheme.js";
import RosterPortrait from "./RosterPortrait.jsx";
import CommanderDetail from "./CommanderDetail.jsx";
import FilterPopup from "./FilterPopup.jsx";

export default function CommanderScreen({ cmds, bldgs, gearInventory, setGearInventory, respectSchematics, setCmds, onSchematicUsed, onClose, initialUid, gems, setGems }) {
  const [filterClass,      setFilterClass]      = useState(null);
  const [filterAlignment,  setFilterAlignment]  = useState(null);
  const [filterSubspecies, setFilterSubspecies] = useState(null);
  const [sortBy,           setSortBy]           = useState("rarity");
  const [showFilter,       setShowFilter]       = useState(false);

  const allPlayer = cmds.filter(c => c.owner === "player");
  const activeFilterCount = [filterClass, filterAlignment, filterSubspecies].filter(Boolean).length;

  const filtered = allPlayer.filter(c => {
    if (filterClass && c.cls !== filterClass) return false;
    if (filterAlignment) {
      const aln = ALIGNMENT[filterAlignment];
      if (!aln?.factions.includes(c.faction)) return false;
    }
    if (filterSubspecies) {
      const rarityKeys = ["soldier","veteran","champion"];
      if (rarityKeys.includes(filterSubspecies)) {
        if (c.rarity !== filterSubspecies) return false;
      } else {
        if (c.subspecies !== filterSubspecies) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "rarity")  return (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3);
    if (sortBy === "level")   return (b.lvl ?? 5) - (a.lvl ?? 5);
    if (sortBy === "respect") return (b.respectLevel ?? 0) - (a.respectLevel ?? 0);
    return 0;
  });

  const [selectedUid, setSelectedUid] = useState(initialUid ?? filtered[0]?.uid ?? null);
  const selectedCmd = filtered.find(c => c.uid === selectedUid) ?? filtered[0] ?? null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 700,
      background: "#080704",
      display: "flex", flexDirection: "column",
    }}>
      <style>{CSS}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: "linear-gradient(180deg,rgba(20,15,5,1),rgba(10,8,3,.97))",
        borderBottom: "1px solid #2a1e08",
        flexShrink: 0, position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,#8a6020 20%,#f0c04066 50%,#8a6020 80%,transparent)",
        }} />

        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(255,255,255,.04)", border: "1px solid #2e2010",
          color: "#8a7050", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>←</button>

        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 13,
          background: "linear-gradient(135deg,#f0c040,#c8902888)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: ".04em" }}>Commander</div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        padding: "7px 14px",
        borderBottom: "1px solid #161208",
        background: "rgba(0,0,0,.25)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <button onClick={() => setShowFilter(true)} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", borderRadius: 6,
          background: activeFilterCount > 0 ? "rgba(240,192,64,.1)" : "rgba(255,255,255,.03)",
          border: `1px solid ${activeFilterCount > 0 ? "rgba(240,192,64,.4)" : "#2a2010"}`,
          color: activeFilterCount > 0 ? "#f0c040" : "#5a4a30",
          fontFamily: "'Cinzel',serif", fontSize: 10, cursor: "pointer",
          transition: "all .15s",
        }}>
          <span style={{ fontSize: 15 }}>⚙</span>
          <span>Filter & Sort</span>
          {activeFilterCount > 0 && (
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              background: "linear-gradient(135deg,#f0c040,#c07020)",
              color: "#0a0804", fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{activeFilterCount}</span>
          )}
        </button>

        <div style={{ flex: 1, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {filterAlignment && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
              background: "rgba(240,192,64,.08)", border: "1px solid rgba(240,192,64,.3)",
              borderRadius: 12, fontSize: 8, color: "#c0a030", fontFamily: "'Cinzel',serif" }}>
              {ALIGNMENT[filterAlignment]?.icon} {ALIGNMENT[filterAlignment]?.n}
              <span onClick={() => setFilterAlignment(null)} style={{ cursor: "pointer", opacity: .7, marginLeft: 2 }}>✕</span>
            </div>
          )}
          {filterClass && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
              background: "rgba(240,192,64,.08)", border: "1px solid rgba(240,192,64,.3)",
              borderRadius: 12, fontSize: 8, color: "#c0a030", fontFamily: "'Cinzel',serif" }}>
              {CLASS[filterClass]?.icon} {CLASS[filterClass]?.n}
              <span onClick={() => setFilterClass(null)} style={{ cursor: "pointer", opacity: .7, marginLeft: 2 }}>✕</span>
            </div>
          )}
          {filterSubspecies && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
              background: "rgba(240,192,64,.08)", border: "1px solid rgba(240,192,64,.3)",
              borderRadius: 12, fontSize: 8, color: "#c0a030", fontFamily: "'Cinzel',serif" }}>
              {filterSubspecies}
              <span onClick={() => setFilterSubspecies(null)} style={{ cursor: "pointer", opacity: .7, marginLeft: 2 }}>✕</span>
            </div>
          )}
        </div>

        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 8, color: "#3a2e18", flexShrink: 0 }}>
          {filtered.length} / {allPlayer.length}
        </span>
      </div>

      {showFilter && (
        <FilterPopup
          filterClass={filterClass} setFilterClass={setFilterClass}
          filterAlignment={filterAlignment} setFilterAlignment={setFilterAlignment}
          filterSubspecies={filterSubspecies} setFilterSubspecies={setFilterSubspecies}
          sortBy={sortBy} setSortBy={setSortBy}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{
          width: 76, flexShrink: 0,
          overflowY: "auto", overflowX: "hidden",
          borderRight: "1px solid #1e1508",
          background: "rgba(0,0,0,.3)",
          scrollbarWidth: "none",
          display: "flex", flexDirection: "column",
          paddingTop: 6, paddingBottom: 12,
        }}>
          {filtered.map(cmd => (
            <RosterPortrait
              key={cmd.uid}
              cmd={cmd}
              selected={cmd.uid === selectedUid}
              onClick={() => setSelectedUid(cmd.uid)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "20px 8px", textAlign: "center", color: "#2a2010",
              fontFamily: "'Cinzel',serif", fontSize: 8, fontStyle: "italic" }}>
              No matches
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", minWidth: 0, position: "relative", WebkitOverflowScrolling: "touch" }}>
          {selectedCmd
            ? <CommanderDetail cmd={selectedCmd} bldgs={bldgs} gearInventory={gearInventory} setGearInventory={setGearInventory} respectSchematics={respectSchematics} setCmds={setCmds} onSchematicUsed={onSchematicUsed} gems={gems} setGems={setGems} />
            : (
              <div style={{ height: "100%", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#2a2020", fontFamily: "'Cinzel',serif", fontSize: 11, fontStyle: "italic" }}>
                Select a commander
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
