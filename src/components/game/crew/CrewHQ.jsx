import { useState } from "react";
import { crewXpToNextLevel } from "../../../../shared/constants/crew.js";
import { canEditAnnouncement, canSetTarget } from "../../../../shared/utils/crewRules.js";
import { Emblem } from "./Emblem.jsx";
import CrewMembers from "./CrewMembers.jsx";
import CrewStructures from "./CrewStructures.jsx";
import CrewStore from "./CrewStore.jsx";
import CrewHelp from "./CrewHelp.jsx";
import CrewComingSoon from "./CrewComingSoon.jsx";
import { BTN_RESET, BORDER_COL, GOLD, TEXT_SM, TEXT_XS, dangerBtn } from "./crewStyles.js";

// Right-edge icon rail — matches the LOTR: Rise to War reference screenshot's
// sidebar (Records/Structures/Cooperation/Store/Members/Help stacked along
// the screen edge). Diplomacy and Boosts are NOT in this rail — in the
// reference they're hotspots ON the table itself (see TableHotspot below),
// not duplicated in the sidebar.
const RAIL_TABS = [
  { id: "members",    label: "Members",    icon: "👥" },
  { id: "structures", label: "Structures", icon: "🏰" },
  { id: "store",      label: "Store",      icon: "🏪" },
  { id: "help",       label: "Help",       icon: "🤝" },
  { id: "cooperation",label: "Cooperation",icon: "🛡️" },
  { id: "records",    label: "Records",    icon: "📜" },
];

/* ─────────────────────────────────────────────────────────────────────────
   CrewHQ — the full-screen "war table" for a player already in a crew.
   Header carries identity + level progress; a wide table hero sits beside a
   right-edge icon rail (Members/Structures/Store/Help/Cooperation/Records),
   matching the LOTR: Rise to War reference layout. Diplomacy/Boosts/Target
   are hotspots on the table itself, not rail entries. Members/Structures/
   Store/Help are functional; Diplomacy/Boosts/Cooperation/Records are
   intentionally CrewComingSoon stubs this pass — see the foundation README
   for what's designed vs. not yet.
───────────────────────────────────────────────────────────────────────── */
export default function CrewHQ({
  crew, playerId, playerName, now,
  onLeave, onDisband,
  onPromote, onDemote, onKick,
  onRequestBuildFortress, onDemolishFortress,
  onBuyStoreItem,
  crewHallLvl, helpsUsed, onHelpMember, canHelp,
  onUpdateAnnouncement, onSetTarget, onClearTarget,
}) {
  const [tab, setTab] = useState("members");
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState(crew.description || "");
  const [settingTarget, setSettingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const xpNeeded = crewXpToNextLevel(crew.level);
  const xpPct = xpNeeded === Infinity ? 100 : Math.min(100, Math.round((crew.xp / xpNeeded) * 100));
  const isFounder = crew.founder === playerId;
  const canEditAnn = canEditAnnouncement(crew, playerId);
  const canPinTarget = canSetTarget(crew, playerId);

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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>👥 {(crew.members||[]).length}/{crew.cap}</span>
            <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>👑 {crew.founder === playerId ? playerName : crew.founder}</span>
            <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>🗣 {crew.language}</span>
          </div>
        </div>
      </div>

      {/* Announcement — founder-editable crew description banner */}
      <div style={{ margin: "8px 12px 0", padding: "8px 10px", borderRadius: 6, background: "rgba(200,160,60,.06)", border: `1px solid ${BORDER_COL}` }}>
        {editingAnnouncement ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <textarea value={announcementDraft} onChange={e => setAnnouncementDraft(e.target.value.slice(0, 200))} rows={2}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4, padding: "6px 8px", color: "#c8c0b0", fontFamily: "'Crimson Pro',serif", fontSize: 11, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { onUpdateAnnouncement?.(announcementDraft); setEditingAnnouncement(false); }}
                style={{ ...BTN_RESET, ...TEXT_XS, color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 4, padding: "4px 10px" }}>Save</button>
              <button onClick={() => { setAnnouncementDraft(crew.description || ""); setEditingAnnouncement(false); }}
                style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", padding: "4px 10px" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, ...TEXT_XS, color: "#a0a8b0", fontStyle: "italic", fontFamily: "'Crimson Pro',serif", fontSize: 11 }}>
              {crew.description || "No announcement set."}
            </div>
            {canEditAnn && (
              <button onClick={() => setEditingAnnouncement(true)} style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", fontSize: 8 }}>✏️ Edit</button>
            )}
          </div>
        )}
      </div>

      {/* Table hero (hotspots) + right-edge icon rail, side by side */}
      <div style={{ display: "flex", gap: 8, margin: "10px 12px", flexShrink: 0 }}>
        <div style={{
          position: "relative", flex: 1, height: 132, borderRadius: 8,
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
          <TableHotspot icon="🎯" label={crew.target ? crew.target.label || "Target set" : "No tasks"}
            onClick={() => canPinTarget && setSettingTarget(v => !v)} />
        </div>

        {/* Right-edge icon rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 56, flexShrink: 0 }}>
          {RAIL_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...BTN_RESET, flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 6,
              color: tab === t.id ? GOLD : "#8a95a5",
              background: tab === t.id ? "rgba(200,160,96,.14)" : "rgba(255,255,255,.03)",
              border: `1px solid ${tab === t.id ? GOLD : BORDER_COL}`,
            }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ ...TEXT_XS, fontSize: 6, letterSpacing: 0 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {settingTarget && canPinTarget && (
        <div style={{ margin: "0 12px 10px", padding: "8px 10px", borderRadius: 6, background: "rgba(200,60,60,.06)", border: "1px solid #6a2a2a", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ ...TEXT_XS, color: "#c88080", letterSpacing: ".05em" }}>RALLY TARGET</div>
          <input value={targetDraft} onChange={e => setTargetDraft(e.target.value.slice(0, 40))} placeholder="e.g. Push the western fortress"
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4, padding: "6px 8px", color: "#c8c0b0", fontFamily: "'Cinzel',serif", fontSize: 10 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { onSetTarget?.(targetDraft); setSettingTarget(false); setTargetDraft(""); }}
              disabled={!targetDraft.trim()}
              style={{ ...BTN_RESET, ...TEXT_XS, color: "#ff9090", border: "1px solid #cc4040", borderRadius: 4, padding: "4px 10px", opacity: targetDraft.trim() ? 1 : .5 }}>Pin</button>
            {crew.target && (
              <button onClick={() => { onClearTarget?.(); setSettingTarget(false); }}
                style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", padding: "4px 10px" }}>Clear</button>
            )}
          </div>
        </div>
      )}

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
