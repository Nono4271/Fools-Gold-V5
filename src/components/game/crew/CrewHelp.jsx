import { crewHallStats } from "../../../../shared/constants/buildings.js";
import { CREW_HELP_CONTRIBUTION } from "../../../../shared/constants/crew.js";
import { BTN_RESET, GOLD, TEXT_XS, primaryBtn } from "./crewStyles.js";

// crewHallLvl comes from the player's own HQ buildings (shared/constants/
// buildings.js's crewhall entry) — passed in rather than looked up here so
// this stays a pure presentation component.
export default function CrewHelp({ crewHallLvl, helpsUsed, onHelpMember, canHelp }) {
  const stats = crewHallStats(crewHallLvl || 1);
  const used = helpsUsed || 0;
  const atCap = used >= stats.maxHelps;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        background: "rgba(200,160,96,.06)", border: "1px solid #c8a06030", borderRadius: 6, padding: "10px 12px",
      }}>
        <div style={{ ...TEXT_XS, color: "#8a6a30", letterSpacing: ".06em", marginBottom: 6 }}>CREW HELP</div>
        <div style={{ ...TEXT_XS, color: "#5a4a30", fontSize: 9, lineHeight: 1.5, marginBottom: 8 }}>
          Ask your crew to speed up your current building upgrade. Crew Hall Lv{crewHallLvl || 1}
          removes {(stats.pct * 100).toFixed(1)}% of a build's remaining time (min {Math.round(stats.flatMs / 60000)}m),
          up to {stats.maxHelps} helps per upgrade.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ ...TEXT_XS, color: "#4a5a6a" }}>Helps used</span>
          <span style={{ ...TEXT_XS, color: atCap ? "#cc6060" : GOLD }}>{used}/{stats.maxHelps}</span>
        </div>
      </div>

      <button onClick={onHelpMember} disabled={!canHelp || atCap} style={primaryBtn(!canHelp || atCap)}>
        🤝 {atCap ? "Max Helps Reached" : !canHelp ? "No Active Upgrade" : "Request Help"}
      </button>
      <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center", fontSize: 7 }}>
        Crewmates who help earn {CREW_HELP_CONTRIBUTION} Contribution Points each.
      </div>
    </div>
  );
}
