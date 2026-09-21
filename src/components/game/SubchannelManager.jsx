import { useState, memo } from "react";
import { MAX_SUBCHANNELS } from "../../../shared/constants/chat.js";

/* ─────────────────────────────────────────────────────────────────────────────
   SubchannelManager — the popover behind ChatPanel's gear icon (crew tab for
   the crew's founder, group tab for whoever started that group). Two tabs:
   Add (name a new sub-channel) and Manage (reorder/delete — #Announcement/
   #General are locked and never show delete/move controls). Rules live in
   shared/utils/subchannels.js; this is just the UI over onAdd/onRemove/onMove.
───────────────────────────────────────────────────────────────────────────── */

const BTN_RESET = {
  background: "none", border: "none", padding: 0, margin: 0,
  cursor: "pointer", WebkitAppearance: "none", appearance: "none",
  touchAction: "manipulation",
};

const BORDER_COL = "#1a2030";
const GOLD       = "#c8a060";
const TEXT_SM    = { fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: ".04em" };
const TEXT_XS    = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };

const TABS = [
  { id: "add",    label: "Add" },
  { id: "manage", label: "Manage" },
];

export default memo(function SubchannelManager({ onClose, subChannels = [], onAdd, onRemove, onMove }) {
  const [tab, setTab]   = useState(subChannels.length >= MAX_SUBCHANNELS ? "manage" : "add");
  const [name, setName] = useState("");
  const atCap = subChannels.length >= MAX_SUBCHANNELS;

  function submitAdd() {
    const trimmed = name.trim();
    if (!trimmed || atCap) return;
    onAdd(trimmed);
    setName("");
    setTab("manage");
  }

  return (
    <div style={{
      position: "absolute", top: 44, right: 8, zIndex: 20, width: 200,
      background: "rgba(8,10,15,.98)", border: `1px solid ${BORDER_COL}`, borderRadius: 6,
      boxShadow: "0 4px 20px rgba(0,0,0,.7)", overflow: "hidden",
    }}>
      <div style={{
        padding: "7px 10px", borderBottom: `1px solid ${BORDER_COL}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ ...TEXT_SM, color: GOLD, fontSize: 9 }}>Channels</div>
        <button onClick={onClose} style={{ ...BTN_RESET, color: "#6a7a8a", fontSize: 12 }}>✕</button>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER_COL}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...BTN_RESET, flex: 1, padding: "7px 0", ...TEXT_XS,
            color: tab === t.id ? GOLD : "#4a5a6a",
            borderBottom: tab === t.id ? `2px solid ${GOLD}` : "2px solid transparent",
            background: tab === t.id ? "rgba(200,160,96,.06)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
        {tab === "add" ? (
          atCap ? (
            <div style={{ ...TEXT_XS, color: "#5a6a7a", textAlign: "center", padding: "6px 0" }}>
              Max {MAX_SUBCHANNELS} channels reached.
            </div>
          ) : (
            <>
              <input
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitAdd(); }}
                placeholder="Channel name" maxLength={24} autoFocus
                style={{
                  background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4,
                  padding: "7px 9px", color: "#c8c0b0", fontFamily: "'Cinzel',serif", fontSize: 10, outline: "none",
                }}
              />
              <button onClick={submitAdd} disabled={!name.trim()} style={{
                ...BTN_RESET, padding: "7px 0", borderRadius: 4, textAlign: "center",
                background: "linear-gradient(160deg,#1a3a2a,#0e2018)", border: "1px solid #306050",
                color: "#50c090", ...TEXT_XS, opacity: name.trim() ? 1 : .4,
              }}>+ Add Channel</button>
            </>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {subChannels.map((s, i) => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 8px", borderRadius: 4,
                background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER_COL}`,
              }}>
                <span style={{ ...TEXT_XS, color: s.locked ? "#8a9aaa" : "#c8c0b0", fontSize: 9 }}>
                  # {s.name}{s.locked ? " 🔒" : ""}
                </span>
                {!s.locked && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => onMove(s.id, -1)} disabled={i === 0} style={{
                      ...BTN_RESET, color: i === 0 ? "#2a3040" : "#8a9aaa", fontSize: 11,
                    }}>▲</button>
                    <button onClick={() => onMove(s.id, 1)} disabled={i === subChannels.length - 1} style={{
                      ...BTN_RESET, color: i === subChannels.length - 1 ? "#2a3040" : "#8a9aaa", fontSize: 11,
                    }}>▼</button>
                    <button onClick={() => onRemove(s.id)} style={{
                      ...BTN_RESET, color: "#cc6060", fontSize: 11,
                    }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
