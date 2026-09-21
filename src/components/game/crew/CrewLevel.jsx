import {
  CREW_MAX_LEVEL, crewXpToNextLevel, crewLevelPerks,
} from "../../../../shared/constants/crew.js";
import { BORDER_COL, GOLD, TEXT_SM, TEXT_XS } from "./crewStyles.js";

/* ─────────────────────────────────────────────────────────────────────────
   CrewLevel — replaces the old Boosts table hotspot. Shows the crew's
   current level/XP progress and every level-up perk from 1 to
   CREW_MAX_LEVEL. Real perks come from shared/constants/crew.js's
   crewLevelPerks (member cap, fortress slots — the schedules the rest of
   the game already runs on); any level with nothing defined yet shows a
   placeholder row instead of being skipped, so the full climb always has
   something to look at.
───────────────────────────────────────────────────────────────────────── */

function LevelRow({ level, perks, status }) {
  const isCurrent = status === "current";
  const isReached = status === "reached" || isCurrent;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
      borderRadius: 6, background: isCurrent ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
      border: `1px solid ${isCurrent ? GOLD : BORDER_COL}`,
      opacity: isReached ? 1 : 0.55,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isCurrent ? "rgba(200,160,96,.2)" : "rgba(255,255,255,.04)",
        border: `1px solid ${isCurrent ? GOLD : "#2a3040"}`,
        ...TEXT_XS, color: isCurrent ? GOLD : "#6a7a8a", fontWeight: 700, fontSize: 9,
      }}>{level}</div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {perks.length === 0 ? (
          <span style={{ ...TEXT_XS, color: "#3a4a5a", fontStyle: "italic" }}>Placeholder — perk TBD</span>
        ) : (
          perks.map(p => (
            <span key={p.id} style={{
              ...TEXT_XS, color: isReached ? "#c8c0b0" : "#5a6a7a",
              background: "rgba(255,255,255,.04)", border: "1px solid #1e2028",
              borderRadius: 4, padding: "3px 7px", display: "flex", alignItems: "center", gap: 4,
            }}>
              <span>{p.icon}</span><span>{p.label} {p.detail}</span>
            </span>
          ))
        )}
      </div>

      {isReached && <span style={{ color: "#40cc80", fontSize: 12, flexShrink: 0 }}>✓</span>}
    </div>
  );
}

export default function CrewLevel({ crew }) {
  const level = crew?.level || 1;
  const xpNeeded = crewXpToNextLevel(level);
  const xpPct = xpNeeded === Infinity ? 100 : Math.min(100, Math.round(((crew?.xp || 0) / xpNeeded) * 100));

  const rows = [];
  for (let lvl = 1; lvl <= CREW_MAX_LEVEL; lvl++) {
    rows.push({
      level: lvl,
      perks: crewLevelPerks(lvl),
      status: lvl < level ? "reached" : lvl === level ? "current" : "locked",
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ ...TEXT_SM, color: GOLD, fontWeight: 700, fontSize: 11 }}>Level {level}</span>
          <span style={{ ...TEXT_XS, color: "#4a5a6a" }}>
            {xpNeeded === Infinity ? "MAX LEVEL" : `${crew?.xp || 0}/${xpNeeded} XP`}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden", marginTop: 6 }}>
          <div style={{ width: `${xpPct}%`, height: "100%", background: "linear-gradient(90deg,#c8a060,#e0c080)" }} />
        </div>
      </div>

      {rows.map(r => <LevelRow key={r.level} {...r} />)}
    </div>
  );
}
