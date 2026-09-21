import { useState, useRef, useEffect, memo } from "react";
import { aiDisplayName } from "../../../shared/utils/aiChatter.js";
import { censorText } from "../../../shared/utils/profanity.js";
import {
  subchannelsOf, subchannelId, canManageSubchannels, canPostInSubchannel,
} from "../../../shared/utils/subchannels.js";
import RelationsPanel from "./RelationsPanel.jsx";
import SubchannelManager from "./SubchannelManager.jsx";

/* ─────────────────────────────────────────────────────────────────────────────
   ChatPanel — World / Faction / Crew / DM / Group chat
   • Local-only today (see src/hooks/useChat.js) — no real multiplayer server
   • World/Faction/Crew are populated with AI flavor chatter so they don't feel
     empty; DMs/Groups are player-initiated with any known player id
   • Every scrollable region here needs BOTH "scr" (the site's overflow/
     touch-action styling, css.js) AND "chat-scroll" (src/main.tsx's global
     touchstart handler blocks touch-scrolling everywhere by default, for
     iOS pull-to-refresh, and only lets it through inside an allowlisted
     class — "chat-scroll" is chat's entry in that allowlist, alongside
     .roster-scroll/.battle-popup/.gear-picker-list/.find-tiles-popup)
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

// Two top-level displays, per the owner's spec: "Chats" (World/Faction/Guild,
// with groups created and listed below Guild) and "Direct" (Relations
// Management entry + DM channels). Replaces the old flat 5-tab bar.
const DISPLAYS = [
  { id: "chats",  label: "Chats" },
  { id: "direct", label: "Direct" },
];

function displayName(id, playerId, playerName, crews) {
  if (id === playerId) return playerName || "You";
  const ai = aiDisplayName(id);
  if (ai !== id) return ai;
  return id;
}

// The crew (if any) `id` belongs to, for the "[ABBR] Name" message tag —
// crews already carry a 4-char `abbr` (see CrewPanel.jsx/aiCrews.js).
function crewAbbrFor(id, crews) {
  const crew = (crews || []).find(c => (c.members || []).includes(id));
  return crew ? crew.abbr : null;
}

function taggedName(name, abbr) {
  return abbr ? `[${abbr}] ${name}` : name;
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
  profanityFilterEnabled = true, setProfanityFilterEnabled,
  // Relations (friends/blacklist) — rules in shared/utils/relationsRules.js,
  // wired in via src/hooks/useRelations.js. Surfaced here as the "Direct"
  // display's "Relations Management" entry.
  nameOf, friends = [], blocked = [], incoming = [], outgoing = [],
  addFriend, declineIncoming, cancelOutgoing, unfriend, blockPlayer, unblockPlayer, search,
  // Sub-channels (crew + group only) — rules in shared/utils/subchannels.js.
  // Crew sub-channels live on the crew object itself (GameView.jsx owns
  // `crews`), so adding/removing/reordering them goes through a callback;
  // group sub-channels live in useChat.js's own `groups` state, so those get
  // direct mutators.
  onManageCrewSubchannels, addGroupSubchannel, removeGroupSubchannel, moveGroupSubchannel,
}) {
  const [display, setDisplay]     = useState("chats"); // "chats" | "direct"
  const [selectedId, setSelected] = useState(null);
  const [selectedSubId, setSelectedSub] = useState(null);
  const [subManagerOpen, setSubManagerOpen] = useState(false);
  const [draft, setDraft]         = useState("");
  const [picking, setPicking]     = useState(false); // group-creation picker
  const [pickSel, setPickSel]     = useState([]);
  const [groupName, setGroupName] = useState("");
  const [relationsOpen, setRelationsOpen] = useState(false);

  const worldCh  = channels.filter(c => c.type === "world");
  const factionCh = channels.filter(c => c.type === "faction");
  const crewCh   = channels.filter(c => c.type === "crew");
  const groupCh  = channels.filter(c => c.type === "group");
  const dmCh     = channels.filter(c => c.type === "dm");

  const list = display === "chats" ? [...worldCh, ...factionCh, ...crewCh, ...groupCh] : dmCh;
  const active = list.find(c => c.id === selectedId) || null;

  // Crew/group channels are containers — you post into one of their
  // sub-channels (#Announcement/#General, or a custom one), never the
  // container itself. World/Faction/DM stay flat, unaffected.
  const isSubbed = !!active && (active.type === "crew" || active.type === "group");
  const subChannels = isSubbed ? subchannelsOf(active, { crews }) : [];
  const activeSub = isSubbed ? (subChannels.find(s => s.id === selectedSubId) || null) : null;
  const msgChannelId = isSubbed ? (activeSub ? subchannelId(active.id, activeSub.id) : null) : active?.id;
  const msgs = msgChannelId ? getMessages(msgChannelId) : [];
  const canManage = isSubbed && canManageSubchannels(playerId, active, { crews });
  const canPostHere = activeSub ? canPostInSubchannel(playerId, active, activeSub, { crews }) : true;

  const otherKnownIds = knownPlayerIds.filter(id => id !== playerId);
  const resolveName = nameOf || (id => displayName(id, playerId, playerName, crews));

  // Auto-scroll to the newest message on load, channel switch, or new arrival.
  // Messages themselves are stored uncensored (see useChat.js) — the filter
  // only affects display, so toggling it re-reveals prior messages too.
  const msgListRef = useRef(null);
  useEffect(() => {
    const el = msgListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, msgChannelId]);

  function switchDisplay(id) {
    setDisplay(id); setSelected(null); setSelectedSub(null);
    setPicking(false); setRelationsOpen(false); setSubManagerOpen(false);
  }

  function openChannel(id) {
    setSelected(id); setSelectedSub(null); setRelationsOpen(false); setSubManagerOpen(false);
  }

  function handleSend() {
    if (!msgChannelId || !canPostHere || !draft.trim()) return;
    sendMessage(msgChannelId, draft);
    setDraft("");
  }

  function handleAddSub(name) {
    if (active.type === "crew") onManageCrewSubchannels?.(active.crewId, { type: "add", name });
    else addGroupSubchannel?.(active.id, name);
  }
  function handleRemoveSub(id) {
    if (active.type === "crew") onManageCrewSubchannels?.(active.crewId, { type: "remove", id });
    else removeGroupSubchannel?.(active.id, id);
    if (selectedSubId === id) setSelectedSub(null);
  }
  function handleMoveSub(id, direction) {
    if (active.type === "crew") onManageCrewSubchannels?.(active.crewId, { type: "move", id, direction });
    else moveGroupSubchannel?.(active.id, id, direction);
  }

  function togglePick(id) {
    setPickSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function confirmPicker() {
    if (pickSel.length >= 2) {
      const ch = startGroup(groupName, pickSel);
      if (ch) { setDisplay("chats"); setSelected(ch.id); }
    }
    setPicking(false); setPickSel([]); setGroupName("");
  }

  // Relations panel's "Message" action on a friend — starts (or reopens) a
  // DM and drops straight into it, closing Relations.
  function handleMessageFriend(id) {
    const ch = startDm(id);
    if (ch) { setRelationsOpen(false); setSelected(ch.id); }
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canManage && (
            <button
              onClick={() => setSubManagerOpen(v => !v)}
              title="Add or manage channels"
              style={{
                ...BTN_RESET, minWidth: 36, minHeight: 36, borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: subManagerOpen ? "rgba(200,160,96,.15)" : "rgba(255,255,255,.03)",
                border: `1px solid ${subManagerOpen ? "#c8a06050" : "#2a2a2a"}`,
                color: subManagerOpen ? GOLD : "#8a9aaa", fontSize: 15,
              }}
            >⚙</button>
          )}
          <button
            onClick={() => setProfanityFilterEnabled?.(v => !v)}
            title={profanityFilterEnabled ? "Profanity filter: on" : "Profanity filter: off"}
            style={{
              ...BTN_RESET, minWidth: 36, minHeight: 36, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: profanityFilterEnabled ? "rgba(40,160,80,.12)" : "rgba(255,255,255,.03)",
              border: `1px solid ${profanityFilterEnabled ? "#40aa6050" : "#2a2a2a"}`,
              color: profanityFilterEnabled ? "#40cc80" : "#777", fontSize: 15,
            }}
          >🛡</button>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid #2a2a2a", color: "#777",
            fontSize: 16, minWidth: 36, minHeight: 36, display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
            touchAction: "manipulation", borderRadius: 4,
          }}>✕</button>
        </div>
      </div>

      {subManagerOpen && canManage && (
        <SubchannelManager
          subChannels={subChannels}
          onAdd={handleAddSub}
          onRemove={handleRemoveSub}
          onMove={handleMoveSub}
          onClose={() => setSubManagerOpen(false)}
        />
      )}

      {/* Display toggle — "Chats" (World/Faction/Guild/Groups) vs "Direct"
          (Relations Management + DMs) */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
        {DISPLAYS.map(d => (
          <button key={d.id} onClick={() => switchDisplay(d.id)} style={{
            ...BTN_RESET, flex: 1, padding: "9px 0", ...TEXT_XS,
            color: display === d.id ? GOLD : "#4a5a6a",
            borderBottom: display === d.id ? `2px solid ${GOLD}` : "2px solid transparent",
            background: display === d.id ? "rgba(200,160,96,.06)" : "none",
          }}>{d.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Channel list */}
        <div className="scr chat-scroll" style={{
          width: 128, flexShrink: 0, minHeight: 0, overflowY: "auto", borderRight: `1px solid ${BORDER_COL}`,
          padding: 6, display: "flex", flexDirection: "column", gap: 4,
        }}>
          {display === "chats" && (
            <>
              {worldCh.map(ch => (
                <button key={ch.id} onClick={() => openChannel(ch.id)} style={{
                  ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                  background: !relationsOpen && active?.id === ch.id ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${!relationsOpen && active?.id === ch.id ? "#c8a06050" : "#1e2028"}`,
                  color: !relationsOpen && active?.id === ch.id ? GOLD : "#6a7a8a", ...TEXT_XS,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{channelLabel(ch, playerId, playerName)}</button>
              ))}
              {factionCh.map(ch => (
                <button key={ch.id} onClick={() => openChannel(ch.id)} style={{
                  ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                  background: active?.id === ch.id ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${active?.id === ch.id ? "#c8a06050" : "#1e2028"}`,
                  color: active?.id === ch.id ? GOLD : "#6a7a8a", ...TEXT_XS,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{channelLabel(ch, playerId, playerName)}</button>
              ))}
              {crewCh.length === 0 && (
                <div style={{ ...TEXT_XS, color: "#3a4050", padding: "10px 4px" }}>No guild yet</div>
              )}
              {crewCh.map(ch => (
                <button key={ch.id} onClick={() => openChannel(ch.id)} style={{
                  ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                  background: active?.id === ch.id ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${active?.id === ch.id ? "#c8a06050" : "#1e2028"}`,
                  color: active?.id === ch.id ? GOLD : "#6a7a8a", ...TEXT_XS,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{channelLabel(ch, playerId, playerName)}</button>
              ))}
              <button onClick={() => { setPicking(true); setPickSel([]); setGroupName(""); setSelected(null); }} style={{
                ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                background: "rgba(200,160,64,.12)", border: "1px solid #c8a06040",
                color: GOLD, ...TEXT_XS,
              }}>+ New Group</button>
              {groupCh.map(ch => (
                <button key={ch.id} onClick={() => openChannel(ch.id)} style={{
                  ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                  background: active?.id === ch.id ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${active?.id === ch.id ? "#c8a06050" : "#1e2028"}`,
                  color: active?.id === ch.id ? GOLD : "#6a7a8a", ...TEXT_XS,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{channelLabel(ch, playerId, playerName)}</button>
              ))}
            </>
          )}
          {display === "direct" && (
            <>
              <button onClick={() => { setRelationsOpen(true); setSelected(null); }} style={{
                ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                background: relationsOpen ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
                border: `1px solid ${relationsOpen ? "#c8a06050" : "#1e2028"}`,
                color: relationsOpen ? GOLD : "#6a7a8a", ...TEXT_XS,
              }}>⚙ Relations</button>
              {dmCh.length === 0 && (
                <div style={{ ...TEXT_XS, color: "#3a4050", padding: "10px 4px" }}>No DMs yet</div>
              )}
              {dmCh.map(ch => (
                <button key={ch.id} onClick={() => openChannel(ch.id)} style={{
                  ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                  background: !relationsOpen && active?.id === ch.id ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${!relationsOpen && active?.id === ch.id ? "#c8a06050" : "#1e2028"}`,
                  color: !relationsOpen && active?.id === ch.id ? GOLD : "#6a7a8a", ...TEXT_XS,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{channelLabel(ch, playerId, playerName)}</button>
              ))}
            </>
          )}
        </div>

        {/* Message view / group picker / relations */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          {relationsOpen ? (
            <RelationsPanel
              onBack={() => setRelationsOpen(false)}
              nameOf={resolveName}
              friends={friends} blocked={blocked} incoming={incoming} outgoing={outgoing}
              addFriend={addFriend} declineIncoming={declineIncoming} cancelOutgoing={cancelOutgoing}
              unfriend={unfriend} blockPlayer={blockPlayer} unblockPlayer={unblockPlayer}
              search={search} onMessage={handleMessageFriend}
            />
          ) : picking ? (
            <>
              {/* Scrollable rows; Cancel/Start are pinned in a footer below,
                  outside the scroll area, so they're always reachable even
                  with a long player list or a short viewport — same pattern
                  as the message view's compose bar. */}
              <div className="scr chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ ...TEXT_SM, color: GOLD }}>Start a Group</div>
                <input
                  value={groupName} onChange={e => setGroupName(e.target.value)}
                  placeholder="Group name" maxLength={24}
                  style={{
                    background: "rgba(255,255,255,.05)", border: "1px solid #2a3040", borderRadius: 4,
                    padding: "7px 9px", color: "#c8c0b0", fontFamily: "'Cinzel',serif", fontSize: 10, outline: "none",
                  }}
                />
                <div style={{ ...TEXT_XS, color: "#5a6a7a" }}>Pick two or more players</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {otherKnownIds.map(id => (
                    <PickerRow key={id} id={id} label={displayName(id, playerId, playerName, crews)}
                      checked={pickSel.includes(id)}
                      onToggle={togglePick} />
                  ))}
                  {otherKnownIds.length === 0 && (
                    <div style={{ ...TEXT_XS, color: "#3a4050" }}>No other players known yet.</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderTop: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
                <button onClick={() => { setPicking(false); setPickSel([]); }} style={{
                  ...BTN_RESET, flex: 1, padding: "8px 0", borderRadius: 4,
                  background: "rgba(255,255,255,.04)", border: "1px solid #2a3040", color: "#8a9aaa", ...TEXT_XS,
                }}>Cancel</button>
                <button
                  onClick={confirmPicker}
                  disabled={pickSel.length < 2}
                  style={{
                    ...BTN_RESET, flex: 1, padding: "8px 0", borderRadius: 4,
                    background: "linear-gradient(160deg,#1a3a2a,#0e2018)", border: "1px solid #306050",
                    color: "#50c090", ...TEXT_XS,
                    opacity: pickSel.length < 2 ? .4 : 1,
                  }}
                >Start</button>
              </div>
            </>
          ) : !active ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ ...TEXT_XS, color: "#3a4050" }}>Select a channel</div>
            </div>
          ) : isSubbed && !activeSub ? (
            <div className="scr chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ ...TEXT_SM, color: GOLD, marginBottom: 2 }}>{channelLabel(active, playerId, playerName)}</div>
              {subChannels.map(s => (
                <button key={s.id} onClick={() => setSelectedSub(s.id)} style={{
                  ...BTN_RESET, padding: "9px 10px", borderRadius: 4, textAlign: "left",
                  background: "rgba(255,255,255,.03)", border: `1px solid #1e2028`,
                  color: "#c8c0b0", ...TEXT_XS, fontSize: 9,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span># {s.name}</span>
                  {s.leaderOnly && <span style={{ fontSize: 9 }}>🔒</span>}
                </button>
              ))}
            </div>
          ) : (
            <>
              {isSubbed && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
                  borderBottom: `1px solid ${BORDER_COL}`, flexShrink: 0,
                }}>
                  <button onClick={() => setSelectedSub(null)} style={{ ...BTN_RESET, color: "#8a9aaa", fontSize: 14, padding: "2px 4px" }}>‹</button>
                  <span style={{ ...TEXT_XS, color: GOLD }}># {activeSub.name}</span>
                </div>
              )}
              <div ref={msgListRef} className="scr chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {msgs.length === 0 && (
                  <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center", padding: "20px 0" }}>
                    No messages yet.
                  </div>
                )}
                {msgs.map(m => {
                  const mine = m.senderId === playerId;
                  const text = profanityFilterEnabled ? censorText(m.text) : m.text;
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                      <div style={{ ...TEXT_XS, color: mine ? "#40cc80" : "#6a8aa0", marginBottom: 2 }}>
                        {taggedName(mine ? "You" : m.senderName, crewAbbrFor(m.senderId, crews))}
                      </div>
                      <div style={{
                        maxWidth: "85%", padding: "6px 9px", borderRadius: 6,
                        background: mine ? "rgba(40,160,80,.12)" : "rgba(255,255,255,.04)",
                        border: `1px solid ${mine ? "#40aa6040" : "#1e2028"}`,
                        color: "#c8c0b0", fontSize: 10.5, fontFamily: "'Crimson Pro',serif", lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}>{text}</div>
                    </div>
                  );
                })}
              </div>
              {canPostHere ? (
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
              ) : (
                <div style={{
                  padding: "9px 12px", borderTop: `1px solid ${BORDER_COL}`, textAlign: "center",
                  ...TEXT_XS, color: "#5a6a7a", flexShrink: 0,
                }}>🔒 Only the leader can post here</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
