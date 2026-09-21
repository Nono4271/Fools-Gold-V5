import {
  FORTRESS_COST, FORTRESS_MIN_POWER_LEVEL, FORTRESS_BUILD_MS,
} from "../../../../shared/constants/crew.js";
import { canManageFortress, fortressSlotsAvailable } from "../../../../shared/utils/crewRules.js";
import { isFortressBuilt, stationedCount, commanderSlotCapFor, canDemolishFortress } from "../../../../shared/utils/crewFortress.js";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_XS, primaryBtn, dangerBtn } from "./crewStyles.js";

/* ─────────────────────────────────────────────────────────────────────────
   CrewStructures — lists the crew's fortresses (built + under construction)
   and lets a founder/officer request a new one. Actual tile selection on
   the world map is the caller's job (`onRequestBuildFortress`) — this panel
   only enforces/reflects the role + slot-count + cost gates, same split as
   the rest of shared/utils/crewFortress.js.
───────────────────────────────────────────────────────────────────────── */
export default function CrewStructures({ crew, playerId, now, onRequestBuildFortress, onDemolishFortress }) {
  const canManage = canManageFortress(crew, playerId);
  const slotsFree = fortressSlotsAvailable(crew);
  const fortresses = crew.fortresses || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        background: "rgba(200,160,96,.06)", border: "1px solid #c8a06030", borderRadius: 6, padding: "10px 12px",
      }}>
        <div style={{ ...TEXT_XS, color: "#8a6a30", letterSpacing: ".06em", marginBottom: 6 }}>CREW FORTRESS</div>
        <div style={{ ...TEXT_XS, color: "#5a4a30", fontSize: 9, lineHeight: 1.5 }}>
          Any member can station 2 commanders. It has no defenders of its own —
          an attacker must clear every stationed army before they can siege it down.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
          <Stat label="SLOTS" value={`${fortresses.length}/${fortresses.length + slotsFree}`} />
          <Stat label="COST" value={`🪵${(FORTRESS_COST.wood/1000)}k 🪨${(FORTRESS_COST.stone/1000)}k ⛽${(FORTRESS_COST.gas/1000)}k`} />
          <Stat label="BUILD" value={`${FORTRESS_BUILD_MS / 3_600_000}h`} />
        </div>
      </div>

      {fortresses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#3a4a5a" }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🏰</div>
          <div style={{ ...TEXT_XS, color: "#4a5a6a" }}>No fortresses built yet</div>
        </div>
      ) : (
        fortresses.map(f => {
          const built = isFortressBuilt(f, now);
          const cap = commanderSlotCapFor(crew);
          return (
            <div key={f.id} style={{
              background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER_COL}`,
              borderRadius: 6, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ ...TEXT_XS, color: GOLD, fontSize: 9 }}>🏰 Fortress · {f.tileKey}</span>
                {built ? (
                  <span style={{ ...TEXT_XS, color: "#40cc80", fontSize: 8 }}>
                    Siege {f.siege?.toLocaleString()}/{f.siegeMax?.toLocaleString()}
                  </span>
                ) : (
                  <span style={{ ...TEXT_XS, color: "#e0a030", fontSize: 8 }}>🔨 Under construction</span>
                )}
              </div>
              {built && (
                <div style={{ ...TEXT_XS, color: "#4a5a6a", fontSize: 8 }}>
                  {stationedCount(f)}/{cap} commanders stationed
                </div>
              )}
              {canManage && canDemolishFortress(crew, playerId) && (
                <button onClick={() => onDemolishFortress(f.id)} style={{ ...dangerBtn(), padding: "6px 0" }}>
                  Demolish
                </button>
              )}
            </div>
          );
        })
      )}

      {canManage ? (
        slotsFree > 0 ? (
          <button onClick={onRequestBuildFortress} style={primaryBtn(false)}>
            + Build a Fortress ({slotsFree} slot{slotsFree !== 1 ? "s" : ""} free)
          </button>
        ) : (
          <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center" }}>
            All fortress slots used — level up the crew to unlock more.
          </div>
        )
      ) : (
        <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center" }}>
          Only the founder or an officer can build or demolish a fortress.
        </div>
      )}
      <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center", fontSize: 7 }}>
        Must be built on an unclaimed power level {FORTRESS_MIN_POWER_LEVEL}+ tile (not a camp).
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ ...TEXT_XS, color: "#3a5a4a", fontSize: 7 }}>{label}</div>
      <div style={{ ...TEXT_XS, color: GOLD, fontSize: 9 }}>{value}</div>
    </div>
  );
}
