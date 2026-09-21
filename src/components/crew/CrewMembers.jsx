import { aiDisplayName } from "../../../../shared/utils/aiChatter.js";
import { roleOf, canPromote, canDemote, canKick } from "../../../../shared/utils/crewRules.js";
import { CREW_ROLES, CREW_MAX_OFFICERS } from "../../../../shared/constants/crew.js";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_XS } from "./crewStyles.js";

const ROLE_BADGE = {
  [CREW_ROLES.FOUNDER]: { label: "⚓ FOUNDER", color: GOLD },
  [CREW_ROLES.OFFICER]: { label: "★ OFFICER", color: "#5aa0d0" },
};

export default function CrewMembers({ crew, playerId, playerName, onPromote, onDemote, onKick }) {
  const officerCount = (crew.officers || []).length;
  const myRole = roleOf(crew, playerId);

  const ordered = [...crew.members].sort((a, b) => {
    const rank = m => (m === crew.founder ? 0 : (crew.officers || []).includes(m) ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ ...TEXT_XS, color: "#4a5a6a", letterSpacing: ".06em" }}>
        MEMBERS ({crew.members.length}/{crew.cap}) · OFFICERS ({officerCount}/{CREW_MAX_OFFICERS})
      </div>
      {ordered.map(m => {
        const isMe = m === playerId || m === playerName;
        const role = roleOf(crew, m);
        const badge = ROLE_BADGE[role];
        const label = isMe ? (playerName || "You") : aiDisplayName(m);
        return (
          <div key={m} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 9px", borderRadius: 4,
            background: isMe ? "rgba(40,160,80,.1)" : "rgba(255,255,255,.025)",
            border: `1px solid ${isMe ? "#40aa6030" : BORDER_COL}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ ...TEXT_XS, color: isMe ? "#40cc80" : "#8a95a5", fontSize: 9 }}>{label}</span>
              {badge && (
                <span style={{ ...TEXT_XS, color: badge.color, background: `${badge.color}18`,
                  border: `1px solid ${badge.color}40`, borderRadius: 3, padding: "1px 5px" }}>
                  {badge.label}
                </span>
              )}
            </div>
            {!isMe && (
              <div style={{ display: "flex", gap: 4 }}>
                {role === CREW_ROLES.MEMBER && canPromote(crew, playerId) && officerCount < CREW_MAX_OFFICERS && (
                  <ActionBtn label="Promote" color="#5aa0d0" onClick={() => onPromote(m)} />
                )}
                {role === CREW_ROLES.OFFICER && canDemote(crew, playerId) && (
                  <ActionBtn label="Demote" color="#8a95a5" onClick={() => onDemote(m)} />
                )}
                {canKick(crew, playerId, m) && (
                  <ActionBtn label="Kick" color="#cc4040" onClick={() => onKick(m)} />
                )}
              </div>
            )}
          </div>
        );
      })}
      {myRole === CREW_ROLES.MEMBER && (
        <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center", marginTop: 4 }}>
          Only the founder and officers can manage members.
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...BTN_RESET, padding: "3px 7px", borderRadius: 3,
      background: `${color}15`, border: `1px solid ${color}40`,
      color, fontFamily: "'Cinzel',serif", fontSize: 7,
    }}>{label}</button>
  );
}
