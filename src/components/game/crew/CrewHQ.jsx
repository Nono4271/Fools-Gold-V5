import { useState } from "react";
import { crewXpToNextLevel } from "../../../../shared/constants/crew.js";
import { Emblem } from "./Emblem.jsx";
import CrewMembers from "./CrewMembers.jsx";
import CrewStructures from "./CrewStructures.jsx";
import CrewStore from "./CrewStore.jsx";
import CrewHelp from "./CrewHelp.jsx";
import CrewComingSoon from "./CrewComingSoon.jsx";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_SM, TEXT_XS, dangerBtn } from "./crewStyles.js";

const TABS = [
  { id: "members",    label: "Members",    icon: "👥" },
  { id: "structures", label: "Structures", icon: "🏰" },
  { id: "store",      label: "Store",      icon: "🏪" },
  { id: "help",       label: "Help",       icon: "🤝" },
  { id: "diplomacy",  label: "Diplomacy",  icon: "🕊️" },
  { id: "boosts",     label: "Boosts",     icon: "🧪" },
  { id: "cooperation",label: "Cooperation",icon: "🛡️" },
  { id: "records",    label: "Records",    icon: "📜" },
];

/* ─────────────────────────────────────────────────────────────────────────
   CrewHQ — the full-screen "war table" for a player already in a crew.
   Header carries identity + level progress; a table hero area exposes the
   two headline hotspots (Diplomacy, Boosts); every tab lives in a scrolling
   pill bar underneath, matching ChatPanel's tab-bar convention. Members/
   Structures/Store/Help are functional; Diplomacy/Boosts/Cooperation/
   Records are intentionally CrewComingSoon stubs this pass — see the
   foundation README for what's designed vs. not yet.
───────────────────────────────────────────────────────────────────────── */
export default function CrewHQ({
  crew, playerId, playerName, now,
  onLeave, onDisband,
  onPromote, onDemote, onKick,
  onRequestBuildFortress, onDemolishFortress,
  onBuyStoreItem,
  crewHallLvl, helpsUsed, onHelpMember, canHelp,
}) {
  const [tab, setTab] = useState("members");
  const xpNeeded = crewXpToNextLevel(crew.level);
  const xpPct = xpNeeded === Infinity ? 100 : Math.min(100, Math.round((crew.xp / xpNeeded) * 100));
  const isFounder = crew.founder === playerId;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Identity header */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER_COL}`, display: "flex", gap: 10, alignItems: "center" }}>
        <Emblem emblem={crew.emblem} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TEXT_SM, color: GOLD, fontWeight: 700, fontSize: 13 }}>[{crew.abbr}] {crew.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{ ...TEXT_XS, color: "#8a95a5" }}>Lv.{crew.level}</span>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
              <div style={{ width: `${xpPct}%`, height: "100%", background: "linear-gradient(90deg,#c8a060,#e0c080)" }} />
            </div>
            <span style={{ ...TEXT_XS, color: "#4a5a6a", fontSize: 7 }}>
              {xpNeeded === Infinity ? "MAX" : `${crew.xp}/${xpNeeded}`}
            </span>
          </div>
        </div>
      </div>

      {/* Table hero — the two headline hotspots */}
      <div style={{
        position: "relative", height: 92, flexShrink: 0, margin: "10px 12px", borderRadius: 8,
        background: "linear-gradient(180deg, #241a10, #120c07)",
        border: "1px solid #3a2a18", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "space-evenly",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(200,160,96,.08), transparent 70%)",
        }} />
        <TableHotspot icon="🕊️" label="Diplomacy" onClick={() => setTab("diplomacy")} />
        <TableHotspot icon="🧪" label="Boosts" onClick={() => setTab("boosts")} />
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 12px 8px", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...BTN_RESET, flexShrink: 0, padding: "6px 10px", borderRadius: 14,
            ...TEXT_XS, fontSize: 8,
            color: tab === t.id ? GOLD : "#5a6a7a",
            background: tab === t.id ? "rgba(200,160,96,.12)" : "rgba(255,255,255,.03)",
            border: `1px solid ${tab === t.id ? GOLD : BORDER_COL}`,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "0 12px 14px" }}>
        {tab === "members" && (
          <CrewMembers crew={crew} playerId={playerId} playerName={playerName}
            onPromote={onPromote} onDemote={onDemote} onKick={onKick} />
        )}
        {tab === "structures" && (
          <CrewStructures crew={crew} playerId={playerId} now={now}
            onRequestBuildFortress={onRequestBuildFortress} onDemolishFortress={onDemolishFortress} />
        )}
        {tab === "store" && <CrewStore crew={crew} playerId={playerId} onBuy={onBuyStoreItem} />}
        {tab === "help" && (
          <CrewHelp crewHallLvl={crewHallLvl} helpsUsed={helpsUsed} onHelpMember={onHelpMember} canHelp={canHelp} />
        )}
        {tab === "diplomacy" && (
          <CrewComingSoon icon="🕊️" title="Diplomacy"
            note="Ally/Neutral/War standing with other crews — cosmetic for now, no real teeth until real multiplayer exists." />
        )}
        {tab === "boosts" && (
          <CrewComingSoon icon="🧪" title="Boosts"
            note="Crew-wide temporary buffs, funded by the Store — coming in a follow-up pass." />
        )}
        {tab === "cooperation" && (
          <CrewComingSoon icon="🛡️" title="Cooperation"
            note="Coordinated crew actions — coming in a follow-up pass." />
        )}
        {tab === "records" && (
          <CrewComingSoon icon="📜" title="Records"
            note="A log of crew events — fortresses built/lost, members joined, promotions — coming in a follow-up pass." />
        )}

        {tab === "members" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {isFounder ? (
              <button onClick={onDisband} style={dangerBtn()}>💥 Disband Crew</button>
            ) : (
              <button onClick={onLeave} style={dangerBtn()}>🚪 Leave Crew</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TableHotspot({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...BTN_RESET, position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 3, padding: "6px 12px", borderRadius: 6,
      background: "rgba(40,160,80,.1)", border: "1px solid #40aa6040",
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ ...TEXT_XS, color: "#a0d0b0", fontSize: 7 }}>{label}</span>
    </button>
  );
}
