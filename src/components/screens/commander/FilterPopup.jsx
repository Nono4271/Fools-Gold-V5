import { useState } from "react";
import { CLASS, ALIGNMENT, SUBSPECIES } from "../../../../shared/constants/heroes.js";

export default function FilterPopup({ filterClass, setFilterClass, filterAlignment, setFilterAlignment, filterSubspecies, setFilterSubspecies, sortBy, setSortBy, onClose }) {
  const [draftClass,      setDraftClass]      = useState(filterClass);
  const [draftAlignment,  setDraftAlignment]  = useState(filterAlignment);
  const [draftSubspecies, setDraftSubspecies] = useState(filterSubspecies);
  const [draftSort,       setDraftSort]       = useState(sortBy);

  function apply() {
    setFilterClass(draftClass);
    setFilterAlignment(draftAlignment);
    setFilterSubspecies(draftSubspecies);
    setSortBy(draftSort);
    onClose();
  }

  function clearAll() {
    setDraftClass(null);
    setDraftAlignment(null);
    setDraftSubspecies(null);
    setDraftSort("rarity");
  }

  const activeCount = [draftClass, draftAlignment, draftSubspecies].filter(Boolean).length;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
        letterSpacing: ".1em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );

  const CheckBox = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "7px 11px", borderRadius: 5,
      background: active ? "rgba(240,192,64,.12)" : "rgba(255,255,255,.03)",
      border: `1px solid ${active ? "rgba(240,192,64,.45)" : "#2a2010"}`,
      color: active ? "#f0c040" : "#5a4a30",
      fontFamily: "'Cinzel',serif", fontSize: 9, cursor: "pointer",
      transition: "all .12s", whiteSpace: "nowrap",
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: 2, flexShrink: 0,
        border: `1px solid ${active ? "#f0c040" : "#3a2a18"}`,
        background: active ? "#f0c04030" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, color: "#f0c040",
      }}>{active ? "✓" : ""}</div>
      {label}
    </button>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 800,
      background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 700, margin: "0 auto",
        background: "#0d0b08", borderRadius: "12px 12px 0 0",
        border: "1px solid #2a2010", borderBottom: "none",
        padding: "16px 16px 0", animation: "fadeUp .18s ease",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, color: "#e0d0b0" }}>
            Filter & Sort
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {activeCount > 0 && (
              <button onClick={clearAll} style={{
                padding: "4px 10px", borderRadius: 4,
                background: "rgba(200,80,50,.1)", border: "1px solid rgba(200,80,50,.3)",
                color: "#c85030", fontFamily: "'Cinzel',serif", fontSize: 8, cursor: "pointer",
              }}>Clear All</button>
            )}
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,.04)", border: "1px solid #2a2010",
              color: "#6a5a30", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingBottom: 8 }}>
          <Section title="ALIGNMENT">
            {Object.entries(ALIGNMENT).map(([key, aln]) => (
              <CheckBox key={key} label={`${aln.icon} ${aln.n}`}
                active={draftAlignment === key}
                onClick={() => setDraftAlignment(draftAlignment === key ? null : key)} />
            ))}
          </Section>

          <Section title="CLASS">
            {Object.entries(CLASS).map(([key, cls]) => (
              <CheckBox key={key} label={`${cls.icon} ${cls.n}`}
                active={draftClass === key}
                onClick={() => setDraftClass(draftClass === key ? null : key)} />
            ))}
          </Section>

          <Section title="RARITY">
            {[["soldier","Soldier"],["veteran","Veteran"],["champion","Champion"]].map(([key,label]) => (
              <CheckBox key={key} label={label}
                active={draftSubspecies === key}
                onClick={() => setDraftSubspecies(draftSubspecies === key ? null : key)} />
            ))}
          </Section>

          <Section title="SUBSPECIES">
            {Object.entries(SUBSPECIES).flatMap(([, tiers]) =>
              Object.values(tiers).map(label => label)
            ).filter((label, idx, arr) => arr.indexOf(label) === idx).map(label => (
              <CheckBox key={label} label={label}
                active={draftSubspecies === label}
                onClick={() => setDraftSubspecies(draftSubspecies === label ? null : label)} />
            ))}
          </Section>

          <Section title="SORT BY">
            {[["rarity","⭐ Rarity"],["level","🔺 Level"],["respect","⚜ Respect"]].map(([key,label]) => (
              <CheckBox key={key} label={label}
                active={draftSort === key}
                onClick={() => setDraftSort(key)} />
            ))}
          </Section>
        </div>

        <div style={{ padding: "12px 0 20px", flexShrink: 0 }}>
          <button onClick={apply} style={{
            width: "100%", padding: "13px 0", borderRadius: 6, cursor: "pointer",
            background: "linear-gradient(135deg,rgba(240,192,64,.2),rgba(240,192,64,.08))",
            border: "1px solid rgba(240,192,64,.5)",
            fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700,
            color: "#f0c040", letterSpacing: ".06em",
          }}>
            Apply{activeCount > 0 ? ` (${activeCount} active)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
