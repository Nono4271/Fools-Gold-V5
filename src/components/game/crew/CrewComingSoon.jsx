import { GOLD, TEXT_SM, TEXT_XS } from "./crewStyles.js";

// Shared placeholder for the panels not designed yet this pass (Records,
// Cooperation, Diplomacy, Boosts). Kept as one component so swapping any of
// them for a real build later is a one-file change.
export default function CrewComingSoon({ icon, title, note }) {
  return (
    <div style={{ textAlign: "center", padding: "34px 0" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ ...TEXT_SM, color: GOLD }}>{title}</div>
      <div style={{ ...TEXT_XS, color: "#4a5a6a", marginTop: 6, maxWidth: 220, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        {note}
      </div>
    </div>
  );
}
