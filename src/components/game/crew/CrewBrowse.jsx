import { aiDisplayName } from "../../../../shared/utils/aiChatter.js";
import { CREW_PRIVACY } from "../../../../shared/constants/crew.js";
import { isSearchable, joinModeFor } from "../../../../shared/utils/crewRules.js";
import { Emblem } from "./Emblem.jsx";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_SM, TEXT_XS } from "./crewStyles.js";

const PRIVACY_BADGE = {
  [CREW_PRIVACY.OPEN]:   { label: "OPEN",   color: "#40cc80" },
  [CREW_PRIVACY.LOCKED]: { label: "LOCKED", color: "#e0a030" },
};

function CrewCard({ crew, onJoin, pendingCrewId, playerCrewId }) {
  const isPending = crew.id === pendingCrewId;
  const isMine    = crew.id === playerCrewId;
  const isFull    = crew.members.length >= crew.cap;
  const mode      = joinModeFor(crew);
  const badge     = PRIVACY_BADGE[crew.privacy] || PRIVACY_BADGE[CREW_PRIVACY.LOCKED];
  const memberColor = crew.members.length >= crew.cap ? "#cc4040"
    : crew.members.length >= crew.cap * 0.8 ? "#e0a030" : "#40cc80";

  return (
    <div style={{
      background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER_COL}`,
      borderRadius: 6, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Emblem emblem={crew.emblem} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ ...TEXT_SM, color: GOLD, fontWeight: 700 }}>[{crew.abbr}] {crew.name}</span>
            <span style={{ ...TEXT_XS, color: badge.color, background: `${badge.color}18`,
              border: `1px solid ${badge.color}40`, borderRadius: 3, padding: "1px 5px" }}>
              {badge.label}
            </span>
          </div>
          <div style={{ ...TEXT_XS, color: "#4a5a6a", marginTop: 3 }}>Lv.{crew.level ?? 1} Crew</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...TEXT_SM, color: memberColor, fontWeight: 700 }}>{crew.members.length}/{crew.cap}</div>
          <div style={{ ...TEXT_XS, color: "#3a4a5a" }}>members</div>
        </div>
      </div>

      {crew.description && (
        <div style={{ ...TEXT_XS, color: "#5a6a7a", fontFamily: "'Crimson Pro',serif", fontSize: 9, lineHeight: 1.4 }}>
          {crew.description}
        </div>
      )}

      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {crew.members.slice(0, 6).map((m, i) => (
          <div key={i} style={{
            ...TEXT_XS, color: "#4a5a6a", background: "rgba(255,255,255,.04)",
            border: "1px solid #1e2028", borderRadius: 3, padding: "1px 5px",
          }}>{aiDisplayName(m)}</div>
        ))}
        {crew.members.length > 6 && (
          <div style={{ ...TEXT_XS, color: "#3a4050", padding: "1px 5px" }}>+{crew.members.length - 6} more</div>
        )}
      </div>

      {!isMine && !playerCrewId && (
        isPending ? (
          <div style={{ ...TEXT_XS, color: GOLD, textAlign: "center", padding: "6px 0", borderTop: `1px solid ${BORDER_COL}` }}>
            ⏳ Request Pending…
          </div>
        ) : (
          <button
            onClick={() => !isFull && onJoin(crew.id, mode)}
            disabled={isFull}
            style={{
              ...BTN_RESET, width: "100%", padding: "7px 0", marginTop: 2, borderRadius: 4,
              background: isFull ? "rgba(10,14,20,.5)" : "linear-gradient(160deg,#1a3a2a,#0e2018)",
              border: `1px solid ${isFull ? "#1a2028" : "#306050"}`,
              color: isFull ? "#2a3a38" : "#50c090", ...TEXT_XS,
              cursor: isFull ? "not-allowed" : "pointer",
            }}
          >
            {isFull ? "🔒 Full" : mode === "instant" ? "⚔️ Join Crew" : "📨 Request to Join"}
          </button>
        )
      )}
    </div>
  );
}

export default function CrewBrowse({ crews, facKey, playerCrewId, pendingCrewId, onJoin }) {
  const visible = crews.filter(c => c.faction === facKey && isSearchable(c));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#3a4a5a" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚓</div>
          <div style={{ ...TEXT_SM, color: "#4a5a6a" }}>No crews to find yet</div>
          <div style={{ ...TEXT_XS, color: "#3a4050", marginTop: 4 }}>Be the first to found one!</div>
        </div>
      ) : (
        visible.map(crew => (
          <CrewCard key={crew.id} crew={crew} onJoin={onJoin} pendingCrewId={pendingCrewId} playerCrewId={playerCrewId} />
        ))
      )}
    </div>
  );
}
