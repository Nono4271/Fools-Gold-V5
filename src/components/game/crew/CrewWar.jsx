import { useState } from "react";
import { crewWarPhase, canDeclareWar, canCancelWar } from "../../../../shared/utils/crewRules.js";
import { BORDER_COL, GOLD, TEXT_SM, TEXT_XS, TEXT_BODY, primaryBtn, dangerBtn, BTN_RESET } from "./crewStyles.js";

/* ─────────────────────────────────────────────────────────────────────────
   CrewWar — bottom-menu tab. Declaring war is crew-wide, not aimed at one
   opponent: once active it lifts the enemy-territory siege debuff (see
   shared/utils/warRules.js) for every member, against every enemy crew's
   territory, everywhere on the map, for the whole 24h window.
───────────────────────────────────────────────────────────────────────── */

function fmtCountdown(ms) {
  if (ms <= 0) return "0m";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

const PHASE_COPY = {
  peace:    { label: "At Peace",    color: "#8a95a5" },
  declared: { label: "War Declared", color: "#e0a050" },
  active:   { label: "At War",      color: "#cc4040" },
  cooldown: { label: "Cooldown",    color: "#5a7a9a" },
};

export default function CrewWar({ crew, playerId, now, onDeclareWar, onCancelWar }) {
  const [confirming, setConfirming] = useState(false);
  const phase = crewWarPhase(crew, now ?? Date.now());
  const copy = PHASE_COPY[phase];
  const canDeclare = canDeclareWar(crew, playerId);
  const canCancel = canCancelWar(crew, playerId);
  const war = crew?.war;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ ...TEXT_SM, color: GOLD, fontWeight: 700, fontSize: 11 }}>⚔ War</span>
        <span style={{ ...TEXT_XS, color: copy.color, fontSize: 8 }}>{copy.label}</span>
      </div>

      <div style={{
        ...TEXT_BODY, color: "#8a95a5", lineHeight: 1.5, padding: "10px 12px",
        borderRadius: 6, background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER_COL}`,
      }}>
        A crew-wide declaration, not aimed at one enemy — while active, every
        member's siege armies lose the -70% enemy-territory debuff, against
        every enemy crew's land at once. Declaring locks in a 6h wait before
        war starts, runs for 24h, then a 24h cooldown before the crew can
        declare again.
      </div>

      {phase === "peace" && (
        <>
          {!confirming ? (
            <button onClick={() => canDeclare && setConfirming(true)} disabled={!canDeclare}
              style={dangerBtn()}>
              Declare War
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ ...TEXT_XS, color: "#e0a050", textAlign: "center" }}>
                Starts in 6h, runs 24h, then a 24h cooldown. Sure?
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { onDeclareWar?.(); setConfirming(false); }} style={dangerBtn()}>
                  Confirm
                </button>
                <button onClick={() => setConfirming(false)} style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", padding: "9px 14px" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!canDeclare && (
            <div style={{ ...TEXT_XS, color: "#5a6a7a", textAlign: "center" }}>
              Only the founder or an officer can declare war.
            </div>
          )}
        </>
      )}

      {phase === "declared" && war && (
        <>
          <div style={{ ...TEXT_XS, color: "#e0a050", textAlign: "center" }}>
            War starts in {fmtCountdown(war.startsAt - (now ?? Date.now()))}
          </div>
          {canCancel && (
            <button onClick={() => onCancelWar?.()} style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", padding: "9px 0", textAlign: "center", border: `1px solid ${BORDER_COL}`, borderRadius: 4 }}>
              Cancel Declaration
            </button>
          )}
        </>
      )}

      {phase === "active" && war && (
        <div style={{ ...TEXT_XS, color: "#cc4040", textAlign: "center" }}>
          At war — debuff lifted. Ends in {fmtCountdown(war.endsAt - (now ?? Date.now()))}
        </div>
      )}

      {phase === "cooldown" && war && (
        <div style={{ ...TEXT_XS, color: "#5a7a9a", textAlign: "center" }}>
          Cooldown — can declare again in {fmtCountdown(war.cooldownEndsAt - (now ?? Date.now()))}
        </div>
      )}
    </div>
  );
}
