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

// Bottom icon row — matches the LOTR: Rise to War reference screenshot's
// row of icons along the bottom edge. Diplomacy and Boosts are NOT in this
// row — in the reference they're hotspots ON the table itself (see
// TableHotspot below), not duplicated at the bottom.
const BOTTOM_TABS = [
  { id: "records",     label: "Records",     icon: "📜" },
  { id: "structures",  label: "Structures",  icon: "🏰" },
  { id: "cooperation", label: "Cooperation", icon: "🛡️" },
  { id: "store",       label: "Store",       icon: "🏪" },
  { id: "members",     label: "Members",     icon: "👥" },
  { id: "help",        label: "Help",        icon: "🤝" },
];

/* ─────────────────────────────────────────────────────────────────────────
   CrewHQ — the full-screen "war table" for a player already in a crew.
   Layout matches the LOTR: Rise to War reference: identity/level/founder/
   language/announcement live in a fixed LEFT column; Members/Structures/
   Store/Help/Cooperation/Records sit in a row along the BOTTOM edge; the
   table itself (Diplomacy/Boosts/Target hotspots) fills the remaining
   middle-right area. Selecting a bottom-row or table hotspot swaps the
   table view for that tab's content, with a "Back to table" affordance.
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
  const [tab, setTab] = useState(null); // null = show the table; otherwise a tab id
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
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left column — identity, level, size/founder/language, announcement */}
      <div style={{
        width: 190, flexShrink: 0, borderRight: `1px solid ${BORDER_COL}`,
        padding: "16px 10px 16px", display: "flex", flexDirection: "column", gap: 22,
        overflowY: "auto",
      }} className="scr">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
          <Emblem emblem={crew.emblem} size={48} />
          <div style={{ ...TEXT_SM, color: GOLD, fontWeight: 700, fontSize: 12 }}>[{crew.abbr}] {crew.name}</div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...TEXT_XS, color: "#8a95a5" }}>Lv.{crew.level}</span>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
              <div style={{ width: `${xpPct}%`, height: "100%", background: "linear-gradient(90deg,#c8a060,#e0c080)" }} />
            </div>
          </div>
          <div style={{ ...TEXT_XS, color: "#4a5a6a", fontSize: 7, textAlign: "right", marginTop: 2 }}>
            {xpNeeded === Infinity ? "MAX" : `${crew.xp}/${xpNeeded}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>👥 {(crew.members||[]).length}/{crew.cap}</span>
          <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>👑 {crew.founder === playerId ? playerName : crew.founder}</span>
          <span style={{ ...TEXT_XS, color: "#6a7a8a", fontSize: 8 }}>🗣 {crew.language}</span>
        </div>

        {/* Announcement — founder-editable crew description */}
        <div style={{ padding: "8px 9px", borderRadius: 6, background: "rgba(200,160,60,.06)", border: `1px solid ${BORDER_COL}` }}>
          {editingAnnouncement ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea value={announcementDraft} onChange={e => setAnnouncementDraft(e.target.value.slice(0, 200))} rows={4}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4, padding: "6px 8px", color: "#c8c0b0", fontFamily: "'Crimson Pro',serif", fontSize: 10, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { onUpdateAnnouncement?.(announcementDraft); setEditingAnnouncement(false); }}
                  style={{ ...BTN_RESET, ...TEXT_XS, color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 4, padding: "4px 10px" }}>Save</button>
                <button onClick={() => { setAnnouncementDraft(crew.description || ""); setEditingAnnouncement(false); }}
                  style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", padding: "4px 10px" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ ...TEXT_XS, color: "#a0a8b0", fontStyle: "italic", fontFamily: "'Crimson Pro',serif", fontSize: 10 }}>
                {crew.description || "No announcement set."}
              </div>
              {canEditAnn && (
                <button onClick={() => setEditingAnnouncement(true)} style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", fontSize: 8, alignSelf: "flex-start" }}>✏️ Edit</button>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {isFounder ? (
          <button onClick={onDisband} style={dangerBtn()}>💥 Disband Crew</button>
        ) : (
          <button onClick={onLeave} style={dangerBtn()}>🚪 Leave Crew</button>
        )}
      </div>

      {/* Right side — table (with hotspots) or the active tab's content, plus the bottom icon row */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="scr" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, position: "relative" }}>
          {tab === null ? (
            <div style={{
              position: "relative", height: "100%", minHeight: 220, borderRadius: 8,
              background: "linear-gradient(180deg, #241a10, #120c07)",
              border: "1px solid #3a2a18", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse 60% 80% at 60% 40%, rgba(200,160,96,.10), transparent 70%)",
              }} />
              {/* Hotspots spread out across the table rather than clustered together */}
              <div style={{ position: "absolute", top: "18%", left: "42%" }}>
                <TableHotspot icon="🕊️" label="Diplomacy" onClick={() => setTab("diplomacy")} />
              </div>
              <div style={{ position: "absolute", top: "48%", left: "18%" }}>
                <TableHotspot icon="🧪" label="Boosts" onClick={() => setTab("boosts")} />
              </div>
              <div style={{ position: "absolute", top: "68%", left: "66%" }}>
                <TableHotspot icon="🎯" label={crew.target ? crew.target.label || "Target set" : "No tasks"}
                  onClick={() => canPinTarget && setSettingTarget(v => !v)} />
              </div>

              {settingTarget && canPinTarget && (
                <div style={{
                  position: "absolute", top: "68%", left: "66%", marginTop: 64, width: 220,
                  padding: "8px 10px", borderRadius: 6, background: "rgba(20,10,10,.92)", border: "1px solid #6a2a2a",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
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
            </div>
          ) : (
            <div>
              <button onClick={() => setTab(null)} style={{
                ...BTN_RESET, ...TEXT_XS, color: "#8a95a5", padding: "4px 0", marginBottom: 10,
              }}>← Back to table</button>

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
            </div>
          )}
        </div>

        {/* Bottom icon row — right-aligned so Help lands in the bottom-right corner */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px 14px", borderTop: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
          {BOTTOM_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...BTN_RESET, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2, padding: "6px 10px", borderRadius: 6,
              color: tab === t.id ? GOLD : "#8a95a5",
              background: tab === t.id ? "rgba(200,160,96,.14)" : "rgba(255,255,255,.03)",
              border: `1px solid ${tab === t.id ? GOLD : BORDER_COL}`,
            }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ ...TEXT_XS, fontSize: 7 }}>{t.label}</span>
            </button>
          ))}
        </div>
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
