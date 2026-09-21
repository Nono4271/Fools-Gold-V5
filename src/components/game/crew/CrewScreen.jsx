import { useState, useEffect, memo } from "react";
import CrewLanding from "./CrewLanding.jsx";
import CrewBrowse from "./CrewBrowse.jsx";
import CrewCreate from "./CrewCreate.jsx";
import CrewHQ from "./CrewHQ.jsx";
import { PANEL_BG, BORDER_COL, GOLD } from "./crewStyles.js";

/* ─────────────────────────────────────────────────────────────────────────
   CrewScreen — replaces the old CrewPanel.jsx. One full-screen destination:
     - not in a crew  → CrewLanding (war-table splash) → Browse / Create
     - in a crew      → CrewHQ (identity + table hotspots + tab bar)
   All the actual rules (roles, privacy, fortress, XP) live in
   shared/utils/crewRules.js and crewFortress.js — this file is wiring only.
───────────────────────────────────────────────────────────────────────── */
export default memo(function CrewScreen({
  onClose, crews, playerCrewId, pendingCrewId, playerName, facKey,
  playerGems, crewCreationCost, now,
  onCreateCrew, onJoinRequest, onLeaveCrew, onDisbandCrew,
  onPromote, onDemote, onKick,
  onRequestBuildFortress, onDemolishFortress,
  onBuyStoreItem,
  crewHallLvl, helpsUsed, onHelpMember, canHelp,
  onUpdateAnnouncement, onSetTarget, onClearTarget, onSetDiplomacy,
}) {
  const myCrew = crews.find(c => c.id === playerCrewId);
  const [view, setView] = useState(myCrew ? "hq" : "landing");

  // If the player joins/leaves/gets kicked while this screen is open, follow
  // that state rather than getting stuck on a stale view.
  useEffect(() => {
    if (myCrew && view !== "hq") setView("hq");
    if (!myCrew && view === "hq") setView("landing");
  }, [!!myCrew]); // eslint-disable-line react-hooks/exhaustive-deps

  const factionCrews = crews.filter(c => c.faction === facKey);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9500,
      background: PANEL_BG, borderRight: `1px solid ${BORDER_COL}`,
      boxShadow: "4px 0 32px rgba(0,0,0,.9)",
      display: "flex", flexDirection: "column",
      paddingLeft: "var(--sal, 0px)",
      animation: "slideInLeft .22s ease",
      pointerEvents: "auto",
    }}>
      {/* Header — omitted for CrewHQ, which has its own richer identity header */}
      {view !== "hq" && (
        <div style={{
          padding: "10px 12px", borderBottom: `1px solid ${BORDER_COL}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0, background: "rgba(255,255,255,.025)",
        }}>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, color: GOLD }}>⚓ CREW</div>
            {view === "browse" && (
              <div style={{ fontSize: 8, color: "#5a6a7a", fontFamily: "'Crimson Pro',serif", marginTop: 2 }}>
                {factionCrews.length} crew{factionCrews.length !== 1 ? "s" : ""} in your faction
              </div>
            )}
          </div>
          <CloseBtn onClick={onClose} />
        </div>
      )}
      {view === "hq" && (
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
          <CloseBtn onClick={onClose} />
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
        {view === "landing" && (
          <CrewLanding
            crewCount={factionCrews.length}
            onBrowse={() => setView("browse")}
            onCreate={() => setView("create")}
          />
        )}

        {view === "browse" && (
          <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            <button onClick={() => setView("landing")} style={{
              background: "none", border: "none", color: "#5a6a7a", fontFamily: "'Cinzel',serif",
              fontSize: 9, cursor: "pointer", padding: "4px 0", marginBottom: 8,
            }}>← Back</button>
            <CrewBrowse
              crews={crews} facKey={facKey} playerCrewId={playerCrewId} pendingCrewId={pendingCrewId}
              onJoin={onJoinRequest}
            />
          </div>
        )}

        {view === "create" && (
          <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            <CrewCreate
              playerGems={playerGems} crewCreationCost={crewCreationCost}
              onCreate={onCreateCrew}
              onCancel={() => setView("landing")}
            />
          </div>
        )}

        {view === "hq" && myCrew && (
          <CrewHQ
            crew={myCrew} crews={crews} playerId={facKey} playerName={playerName} now={now}
            onLeave={onLeaveCrew} onDisband={onDisbandCrew}
            onPromote={onPromote} onDemote={onDemote} onKick={onKick}
            onRequestBuildFortress={onRequestBuildFortress} onDemolishFortress={onDemolishFortress}
            onBuyStoreItem={onBuyStoreItem}
            crewHallLvl={crewHallLvl} helpsUsed={helpsUsed} onHelpMember={onHelpMember} canHelp={canHelp}
            onUpdateAnnouncement={onUpdateAnnouncement} onSetTarget={onSetTarget} onClearTarget={onClearTarget}
            onSetDiplomacy={onSetDiplomacy}
          />
        )}
      </div>
    </div>
  );
});

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(0,0,0,.4)", border: "1px solid #2a2a2a", color: "#777",
      fontSize: 16, minWidth: 36, minHeight: 36, display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
      touchAction: "manipulation", borderRadius: 4,
    }}>✕</button>
  );
}
