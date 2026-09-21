import { CREW_STORE_ITEMS } from "../../../../shared/constants/crew.js";
import { contributionOf } from "../../../../shared/utils/crewRules.js";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_XS } from "./crewStyles.js";

export default function CrewStore({ crew, playerId, onBuy }) {
  const balance = contributionOf(crew, playerId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(200,160,60,.1)", border: "1px solid #c8a04030", borderRadius: 5, padding: "8px 10px",
      }}>
        <span style={{ ...TEXT_XS, color: GOLD }}>Your Contribution Points</span>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#f0c040", fontWeight: 700 }}>
          🏵️ {balance.toLocaleString()}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CREW_STORE_ITEMS.map(item => {
          const afford = balance >= item.cost;
          return (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 10px", borderRadius: 5, background: "rgba(255,255,255,.03)",
              border: `1px solid ${BORDER_COL}`,
            }}>
              <span style={{ ...TEXT_XS, color: "#8a95a5", fontSize: 9 }}>{item.name}</span>
              <button onClick={() => afford && onBuy(item.id)} disabled={!afford} style={{
                ...BTN_RESET, padding: "5px 10px", borderRadius: 4,
                background: afford ? "rgba(200,160,64,.15)" : "rgba(10,14,20,.5)",
                border: `1px solid ${afford ? "#c8a04040" : "#1a2028"}`,
                color: afford ? GOLD : "#2a3a38", ...TEXT_XS,
                cursor: afford ? "pointer" : "not-allowed",
              }}>
                🏵️ {item.cost}
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center", fontSize: 7 }}>
        Earn Contribution Points by helping crewmates and taking part in crew activity.
      </div>
    </div>
  );
}
