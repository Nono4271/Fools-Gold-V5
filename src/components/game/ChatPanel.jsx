import { useState, useMemo, memo } from "react";
import { aiDisplayName } from "../../../shared/utils/aiChatter.js";

/* ─────────────────────────────────────────────────────────────────────────────
   ChatPanel — World / Faction / Crew / DM / Group chat
   • Local-only today (see src/hooks/useChat.js) — no real multiplayer server
   • World/Faction/Crew are populated with AI flavor chatter so they don't feel
     empty; DMs/Groups are player-initiated with any known player id
───────────────────────────────────────────────────────────────────────────── */

const BTN_RESET = {
  background: "none", border: "none", padding: 0, margin: 0,
  cursor: "pointer", WebkitAppearance: "none", appearance: "none",
  touchAction: "manipulation",
};

const PANEL_BG   = "rgba(5,7,11,.97)";
const BORDER_COL = "#1a2030";
const GOLD       = "#c8a060";
const TEXT_SM    = { fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: ".04em" };
const TEXT_XS    = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };

const CATEGORIES = [
  { id: "world",  label: "World",  types: ["world"] },
  { id: "faction", label: "Faction", types: ["faction"] },
  { id: "crew",   label: "Crew",   types: ["crew"] },
  { id: "dm",     label: "DMs",    types: ["dm"] },
  { id: "group",  label: "Groups", types: ["group"] },
];

function displayName(id, playerId, playerName, crews) {
  if (id === playerId) return playerName || "You";
  const ai = aiDisplayName(id);
  if (ai !== id) return ai;
  return id;
}

function channelLabel(channel, playerId, playerName) {
  if (channel.type === "world") return "🌍 World";
  if (channel.type === "faction") return `⚑ ${channel.name}`;
  if (channel.type === "crew") return `⚓ ${channel.name}`;
  if (channel.type === "dm") {
    const other = channel.participants.find(p => p !== playerId);
    return `💬 ${displayName(other, playerId, playerName)}`;
  }
  return `👥 ${channel.name}`;
}

function PickerRow({ id, label, checked, onToggle }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
      borderRadius: 4, background: checked ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
      border: `1px solid ${checked ? "#c8a06050" : "#1e2028"}`, cursor: "pointer",
    }}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(id)} />
      <span style={{ ...TEXT_XS, color: checked ? GOLD : "#6a7a8a" }}>{label}</span>
    </label>
  );
}

export default memo(function ChatPanel({
  onClose, playerId = "player", playerName, channels, sendMessage, startDm, startGroup,
  getMessages, knownPlayerIds = [], crews = [],
}) {
  const [category, setCategory]   = useState("world");
  const [selectedId, setSelected] = useState(null);
  const [draft, setDraft]         = useState("");
  const [picking, setPicking]     = useState(null); // "dm" | "group" | null
  const [pickSel, setPickSel]     = useState([]);
  const [groupName, setGroupName] = useState("");

  const byCategory = useMemo(() => {
    const out = {};
    for (const cat of CATEGORIES) out[cat.id] = channels.filter(c => cat.types.includes(c.type));
    return out;
  }, [channels]);

  const list = byCategory[category] || [];
  const active = list.find(c => c.id === selectedId) || list[0] || null;
  const msgs = active ? getMessages(active.id) : [];

  const otherKnownIds = knownPlayerIds.filter(id => id !== playerId);

  function openChannel(id) { setSelected(id); }

  function handleSend() {
    if (!active || !draft.trim()) return;
    sendMessage(active.id, draft);
    setDraft("");
  }

  function togglePick(id) {
    setPickSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function confirmPicker() {
    if (picking === "dm" && pickSel[0]) {
      const ch = startDm(pickSel[0]);
      if (ch) { setCategory("dm"); setSelected(ch.id); }
    } else if (picking === "group" && pickSel.length >= 2) {
      const ch = startGroup(groupName, pickSel);
      if (ch) { setCategory("group"); setSelected(ch.id); }
    }
    setPicking(null); setPickSel([]); setGroupName("");
  }

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
      {/* Header */}
      <div style={{
        padding: "10px 12px", borderBottom: `1px solid ${BORDER_COL}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0, background: "rgba(255,255,255,.025)",
      }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, color: GOLD }}>
          💬 CHAT
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid #2a2a2a", color: "#777",
          fontSize: 16, minWidth: 36, minHeight: 36, display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer",
          touchAction: "manipulation", borderRadius: 4,
        }}>✕</button>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => { setCategory(cat.id); setSelected(null); setPicking(null); }} style={{
            ...BTN_RESET, flex: 1, padding: "9px 0", ...TEXT_XS,
            color: category === cat.id ? GOLD : "#4a5a6a",
            borderBottom: category === cat.id ? `2px solid ${GOLD}` : "2px solid transparent",
            background: category === cat.id ? "rgba(200,160,96,.06)" : "none",
          }}>{cat.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Channel list */}
        <div className="scr" style={{
          width: 128, flexShrink: 0, overflowY: "auto", borderRight: `1px solid ${BORDER_COL}`,
          padding: 6, display: "flex", flexDirection: "column", gap: 4,
        }}>
          {(category === "dm" || category === "group") && (
            <button onClick={() => { setPicking(category); setPickSel([]); setGroupName(""); }} style={{
              ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
              background: "rgba(200,160,64,.12)", border: "1px solid #c8a06040",
              color: GOLD, ...TEXT_XS,
            }}>+ New {category === "dm" ? "DM" : "Group"}</button>
          )}
          {list.length === 0 && !picking && (
            <div style={{ ...TEXT_XS, color: "#3a4050", padding: "10px 4px" }}>
              {category === "faction" || category === "crew" ? "None yet" : "Nothing here"}
            </div>
          )}
          {list.map(ch => (
            <button key={ch.id} onClick={() => openChannel(ch.id)} style={{
              ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
              background: active?.id === ch.id ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
              border: `1px solid ${active?.id === ch.id ? "#c8a06050" : "#1e2028"}`,
              color: active?.id === ch.id ? GOLD : "#6a7a8a", ...TEXT_XS,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{channelLabel(ch, playerId, playerName)}</button>
          ))}
        </div>

        {/* Message view / picker */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {picking ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ ...TEXT_SM, color: GOLD }}>
                {picking === "dm" ? "Start a DM" : "Start a Group"}
              </div>
              {picking === "group" && (
                <input
                  value={groupName} onChange={e => setGroupName(e.target.value)}
                  placeholder="Group name" maxLength={24}
                  style={{
                    background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4,
                    padding: "7px 9px", color: "#c8c0b0", fontFamily: "'Cinzel',serif", fontSize: 10, outline: "none",
                  }}
                />
              )}
              <div style={{ ...TEXT_XS, color: "#5a6a7a" }}>
                {picking === "dm" ? "Pick a player" : "Pick two or more players"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {otherKnownIds.map(id => (
                  <PickerRow key={id} id={id} label={displayName(id, playerId, playerName, crews)}
                    checked={picking === "dm" ? pickSel[0] === id : pickSel.includes(id)}
                    onToggle={pid => picking === "dm" ? setPickSel([pid]) : togglePick(pid)} />
                ))}
                {otherKnownIds.length === 0 && (
                  <div style={{ ...TEXT_XS, color: "#3a4050" }}>No other players known yet.</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => { setPicking(null); setPickSel([]); }} style={{
                  ...BTN_RESET, flex: 1, padding: "8px 0", borderRadius: 4,
                  background: "rgba(255,255,255,.04)", border: "1px solid #2a3040", color: "#8a9aaa", ...TEXT_XS,
                }}>Cancel</button>
                <button
                  onClick={confirmPicker}
                  disabled={picking === "dm" ? !pickSel[0] : pickSel.length < 2}
                  style={{
                    ...BTN_RESET, flex: 1, padding: "8px 0", borderRadius: 4,
                    background: "linear-gradient(160deg,#1a3a2a,#0e2018)", border: "1px solid #306050",
                    color: "#50c090", ...TEXT_XS,
                    opacity: (picking === "dm" ? !pickSel[0] : pickSel.length < 2) ? .4 : 1,
                  }}
                >Start</button>
              </div>
            </div>
          ) : !active ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ ...TEXT_XS, color: "#3a4050" }}>Select a channel</div>
            </div>
          ) : (
            <>
              <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {msgs.length === 0 && (
                  <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center", padding: "20px 0" }}>
                    No messages yet.
                  </div>
                )}
                {msgs.map(m => {
                  const mine = m.senderId === playerId;
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                      <div style={{ ...TEXT_XS, color: mine ? "#40cc80" : "#6a8aa0", marginBottom: 2 }}>
                        {mine ? "You" : m.senderName}
                      </div>
                      <div style={{
                        maxWidth: "85%", padding: "6px 9px", borderRadius: 6,
                        background: mine ? "rgba(40,160,80,.12)" : "rgba(255,255,255,.04)",
                        border: `1px solid ${mine ? "#40aa6040" : "#1e2028"}`,
                        color: "#c8c0b0", fontSize: 10.5, fontFamily: "'Crimson Pro',serif", lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}>{m.text}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: `1px solid ${BORDER_COL}` }}>
                <input
                  value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                  placeholder="Message…" maxLength={280}
                  style={{
                    flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid #2a3040",
                    borderRadius: 4, padding: "8px 10px", color: "#c8c0b0",
                    fontFamily: "'Crimson Pro',serif", fontSize: 11, outline: "none",
                  }}
                />
                <button onClick={handleSend} disabled={!draft.trim()} style={{
                  ...BTN_RESET, padding: "0 14px", borderRadius: 4,
                  background: "linear-gradient(160deg,#1a3a2a,#0e2018)", border: "1px solid #306050",
                  color: "#50c090", ...TEXT_XS, opacity: draft.trim() ? 1 : .4,
                }}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
