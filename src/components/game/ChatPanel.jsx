import { useState, useRef, useEffect, memo } from "react";
import { aiDisplayName } from "../../../shared/utils/aiChatter.js";
import { aiFactionOf } from "../../../shared/utils/chatRules.js";
import { censorText } from "../../../shared/utils/profanity.js";
import { useTranslatedText } from "../../hooks/useTranslatedText.js";
import { useRelativeTime } from "../../hooks/useRelativeTime.js";
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

// A curated, fixed emoji set for the compose bar's picker — deliberately NOT
// the device's full native emoji set, since that varies by phone/OS and
// there's no way to guarantee every glyph renders the same everywhere. This
// list renders consistently and covers ordinary chat + the game's own
// fantasy-strategy flavor (swords, shields, crowns, etc).
const EMOJI_SET = [
  "😀", "😂", "😅", "😉", "😎", "🥳", "😭", "😡", "🤔", "👀",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✋", "🫡",
  "❤️", "🔥", "⭐", "✨", "💀", "😈", "👑", "🛡️", "⚔️", "🏹",
  "🐉", "🦅", "🏴‍☠️", "🧙", "⚓", "🏰", "💰", "💎", "🍺", "⏳",
  "✅", "❌", "❓", "❗", "🎉", "💯",
];

// Small quick-react set for the long-press message menu — player-only (no
// AI/Nyro auto-reacting, per the owner), so this stays a short fixed list
// rather than the full EMOJI_SET above.
const REACTION_SET = ["👍", "❤️", "😂", "🔥", "😮"];

const PANEL_BG   = "rgba(5,7,11,.97)";
const BORDER_COL = "#1a2030";
const GOLD       = "#c8a060";
const TEXT_SM    = { fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: ".04em" };
const TEXT_XS    = { fontFamily: "'Cinzel',serif", fontSize: 7, letterSpacing: ".04em" };
// Left column (World/Faction/Guild/Group/DM rows + sub-channels) — 1.5x
// TEXT_XS, same reasoning as TEXT_NAME below.
const TEXT_LEFT  = { fontFamily: "'Cinzel',serif", fontSize: 10.5, letterSpacing: ".04em" };
// Message sender name + "[ABBR] Name" crew tag — 1.5x TEXT_XS, and a hair
// bolder so it holds up at the bigger size.
const TEXT_NAME  = { fontFamily: "'Cinzel',serif", fontSize: 10.5, letterSpacing: ".03em", fontWeight: 600 };

// Two top-level displays, per the owner's spec: "Chats" (World/Faction/Guild,
// with groups created and listed below Guild) and "Direct" (Relations
// Management entry + DM channels). Replaces the old flat 5-tab bar. Warm
// parchment/ember scheme, sized up from the original 7px Cinzel — the small
// caps serif was hard to read at that size.
const TAB_FONT   = { fontFamily: "'Crimson Pro',serif", fontSize: 13, fontWeight: 700, letterSpacing: ".02em" };
const TAB_ACTIVE_COL   = "#f0c878";
const TAB_INACTIVE_COL = "#a89878";
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
function crewFor(id, crews) {
  return (crews || []).find(c => (c.members || []).includes(id)) || null;
}
function crewAbbrFor(id, crews) {
  return crewFor(id, crews)?.abbr || null;
}

// Best-effort faction label for the name popup's profile view — an AI id's
// shape gives it away directly (aiFactionOf); otherwise fall back to a
// shared crew's own `.faction` (covers Nyro, who has no id-shape faction of
// his own — shared/constants/nyro.js — but always shares the player's crew).
function factionLabelFor(id, crews) {
  const fk = aiFactionOf(id) || crewFor(id, crews)?.faction;
  return fk ? fk.charAt(0).toUpperCase() + fk.slice(1) : "Unknown";
}

function taggedName(name, abbr) {
  return abbr ? `[${abbr}] ${name}` : name;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlights "@<ownName>" (case-insensitive) inside message text — used so
// the player notices being mentioned. No AI chatter mentions anyone today
// (the flavor pools are canned lines), so in practice this mainly lights up
// when the player mentions themself or another player types it in a future
// multiplayer server, but the highlighting logic doesn't care who wrote it.
function renderWithMentions(text, ownName) {
  if (!ownName || !ownName.trim()) return text;
  const re = new RegExp(`@${escapeRegExp(ownName)}\\b`, "gi");
  const parts = text.split(re);
  if (parts.length === 1) return text;
  const matches = text.match(re);
  const out = [];
  parts.forEach((part, i) => {
    out.push(<span key={`t${i}`}>{part}</span>);
    if (matches && matches[i] != null) {
      out.push(
        <span key={`m${i}`} style={{ color: "#f0c878", fontWeight: 700, background: "rgba(200,160,96,.18)", borderRadius: 3, padding: "0 2px" }}>
          {matches[i]}
        </span>
      );
    }
  });
  return out;
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

// Nested under a crew/group row in the left column, only while that row is
// the open one — smaller than the parent rows, indented, per the owner's
// spec. Clicking a row switches the active sub-channel within this parent.
function SubchannelRows({ subChannels, activeSubId, onSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, margin: "2px 0 4px" }}>
      {subChannels.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id)} style={{
          ...BTN_RESET, padding: "5px 6px 5px 18px", borderRadius: 4, textAlign: "left",
          background: activeSubId === s.id ? "rgba(200,160,96,.12)" : "rgba(255,255,255,.02)",
          border: `1px solid ${activeSubId === s.id ? "#c8a06040" : "#1a2028"}`,
          color: activeSubId === s.id ? GOLD : "#5a6a7a",
          fontFamily: "'Cinzel',serif", fontSize: 10.5, letterSpacing: ".04em",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}># {s.name}</span>
          {s.leaderOnly && <span style={{ flexShrink: 0, marginLeft: 4 }}>🔒</span>}
        </button>
      ))}
    </div>
  );
}

const LONG_PRESS_MS = 480;

// One message row. Pulled out of the message-list `.map()` so it can call
// hooks (useTranslatedText, useRelativeTime) per-message without breaking
// the rules of hooks — a variable-length `.map()` can't call hooks directly
// inline. Long-press (or right-click on desktop) opens the message menu
// (React/Reply/Copy — see MessageMenu below).
function MessageBubble({
  m, mine, crews, profanityFilterEnabled, translateEnabled, ownName,
  reactionSummary, onReact, onNameClick, onLongPress,
}) {
  const filtered = profanityFilterEnabled ? censorText(m.text) : m.text;
  const text = useTranslatedText(filtered, translateEnabled);
  const relTime = useRelativeTime(m.ts);
  const pressTimer = useRef(null);

  function startPress() {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => onLongPress(m), LONG_PRESS_MS);
  }
  function cancelPress() {
    clearTimeout(pressTimer.current);
  }

  const reactionEntries = Object.entries(reactionSummary || {}).filter(([, ids]) => ids.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
        <div
          onClick={onNameClick}
          style={{
            ...TEXT_NAME, color: mine ? "#40cc80" : "#6a8aa0",
            cursor: mine ? "default" : "pointer",
            textDecoration: mine ? "none" : "underline", textDecorationColor: "transparent",
          }}
        >
          {taggedName(mine ? "You" : m.senderName, crewAbbrFor(m.senderId, crews))}
        </div>
        <span style={{ ...TEXT_XS, fontSize: 8, color: "#4a5a6a" }}>{relTime}</span>
      </div>

      {m.replyTo && (
        <div style={{
          maxWidth: "85%", padding: "3px 8px", marginBottom: 2, borderRadius: 4,
          borderLeft: "2px solid #c8a06060", background: "rgba(255,255,255,.03)",
          ...TEXT_XS, fontSize: 9, color: "#7a8a9a", overflow: "hidden",
        }}>
          ↩ <span style={{ color: "#9aa8b8" }}>{m.replyTo.senderName}:</span> {m.replyTo.text}
        </div>
      )}

      <div
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={e => { e.preventDefault(); onLongPress(m); }}
        style={{
          maxWidth: "85%", padding: "6px 9px", borderRadius: 6,
          background: mine ? "rgba(40,160,80,.12)" : "rgba(255,255,255,.04)",
          border: `1px solid ${mine ? "#40aa6040" : "#1e2028"}`,
          color: "#c8c0b0", fontSize: 16, fontFamily: "'Crimson Pro',serif", lineHeight: 1.4,
          wordBreak: "break-word", userSelect: "none", touchAction: "manipulation", cursor: "pointer",
        }}
      >{renderWithMentions(text, ownName)}</div>

      {reactionEntries.length > 0 && (
        <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
          {reactionEntries.map(([emoji, ids]) => (
            <button key={emoji} onClick={() => onReact(m.id, emoji)} style={{
              ...BTN_RESET, padding: "1px 6px", borderRadius: 10, fontSize: 11,
              background: "rgba(200,160,96,.12)", border: "1px solid #c8a06040",
              display: "flex", alignItems: "center", gap: 3,
            }}>
              <span>{emoji}</span>
              <span style={{ ...TEXT_XS, fontSize: 8, color: GOLD }}>{ids.length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Left-column row (World/Faction/Guild/Group/DM) — the button itself opens
// the channel; a separate small bell button beside it (not nested — a
// <button> can't contain another <button>) toggles mute for that top-level
// channel. Shared by every row kind below to avoid repeating this markup.
function ChannelRow({ label, active, muted, onOpen, onToggleMute }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 3 }}>
      <button onClick={onOpen} style={{
        ...BTN_RESET, flex: 1, minWidth: 0, padding: "7px 6px", borderRadius: 4, textAlign: "left",
        background: active ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
        border: `1px solid ${active ? "#c8a06050" : "#1e2028"}`,
        color: active ? GOLD : "#6a7a8a", ...TEXT_LEFT, opacity: muted ? .55 : 1,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{label}</button>
      <button
        onClick={e => { e.stopPropagation(); onToggleMute(); }}
        title={muted ? "Unmute" : "Mute"}
        style={{
          ...BTN_RESET, width: 22, flexShrink: 0, borderRadius: 4,
          background: "rgba(255,255,255,.03)", border: "1px solid #1e2028",
          color: muted ? "#4a5a6a" : "#8a9aaa", fontSize: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >{muted ? "🔕" : "🔔"}</button>
    </div>
  );
}

// Long-press (or right-click) popup on a message — React / Reply / Copy.
function MessageMenu({ message, view, onReact, onReply, onCopy, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9700, background: "rgba(0,0,0,.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 240, background: PANEL_BG, border: `1px solid ${BORDER_COL}`,
        borderRadius: 8, padding: 14, boxShadow: "0 8px 30px rgba(0,0,0,.7)",
      }}>
        {view === "react" ? (
          <>
            <div style={{ ...TEXT_SM, fontSize: 11, color: GOLD, marginBottom: 10, textAlign: "center" }}>React</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              {REACTION_SET.map(e => (
                <button key={e} onClick={() => onReact(e)} style={{
                  ...BTN_RESET, fontSize: 22, padding: 4, borderRadius: 6,
                }}>{e}</button>
              ))}
            </div>
            <NameMenuBtn onClick={onClose}>Cancel</NameMenuBtn>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <NameMenuBtn tone="gold" onClick={() => onReact(null)}>😀 React</NameMenuBtn>
            <NameMenuBtn onClick={onReply}>↩ Reply</NameMenuBtn>
            <NameMenuBtn onClick={onCopy}>📋 Copy</NameMenuBtn>
            <NameMenuBtn onClick={onClose}>Cancel</NameMenuBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function NameMenuBtn({ onClick, tone = "neutral", children }) {
  const palette = {
    neutral: { bg: "rgba(255,255,255,.04)", border: "#2a3040", color: "#c8c0b0" },
    good:    { bg: "rgba(40,160,80,.15)",   border: "#40aa6050", color: "#40cc80" },
    bad:     { bg: "rgba(160,40,40,.15)",   border: "#602020",  color: "#cc6060" },
    gold:    { bg: "rgba(200,160,96,.12)",  border: "#c8a06050", color: GOLD },
  }[tone];
  return (
    <button onClick={onClick} style={{
      ...BTN_RESET, padding: "9px 0", borderRadius: 4, textAlign: "center",
      ...TEXT_SM, fontSize: 11,
      background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color,
    }}>{children}</button>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ ...TEXT_XS, fontSize: 9, color: "#5a6a7a" }}>{label}</span>
      <span style={{ ...TEXT_SM, fontSize: 11, color: "#c8c0b0", textAlign: "right" }}>{value}</span>
    </div>
  );
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
  // Lifted up into useChat.js (rather than local state here) so the open
  // channel/sub-channel/display-tab survives the panel closing and
  // reopening — see useChat.js. Defaults to World if nothing was passed.
  activeDisplay = "chats", setActiveDisplay, activeChannelId = "world", setActiveChannelId,
  activeSubId = null, setActiveSubId,
  // Round 6 additions — unread tracking, mute, reactions, typing indicators,
  // reply-to, and leaving a group — all implemented in useChat.js.
  mutedChannelIds, toggleMute, reactions, toggleReaction, typingByChannel,
  markRead, leaveGroup,
}) {
  const display = activeDisplay, setDisplay = setActiveDisplay;
  const selectedId = activeChannelId, setSelected = setActiveChannelId;
  const selectedSubId = activeSubId, setSelectedSub = setActiveSubId;
  const [subManagerOpen, setSubManagerOpen] = useState(false);
  const [draft, setDraft]         = useState("");
  const [picking, setPicking]     = useState(false); // group-creation picker
  const [pickSel, setPickSel]     = useState([]);
  const [groupName, setGroupName] = useState("");
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Clicking a sender's name in the message list opens a small popup —
  // "menu" (Add/Remove Friend, Block/Unblock, View Profile) or "profile"
  // (a lightweight read-only card: name, crew, faction, relation status —
  // there's no dedicated profile screen elsewhere in the game yet).
  const [nameMenuId, setNameMenuId] = useState(null);
  const [nameMenuView, setNameMenuView] = useState("menu");
  // "Aa" header button — translates message text into the device's own
  // language (src/hooks/useTranslatedText.js / src/utils/translate.js).
  const [translateEnabled, setTranslateEnabled] = useState(false);
  // Long-press message menu (React / Reply / Copy) — see MessageMenu above.
  const [messageMenu, setMessageMenu] = useState(null); // { message } | null
  // Reply-to draft — a small dismissible preview strip above the compose bar;
  // cleared on send or on the "×" button.
  const [replyTo, setReplyTo] = useState(null); // { id, senderName, text } | null
  // "@partial" mention autocomplete dropdown above the compose bar.
  const [mentionOpen, setMentionOpen] = useState(false);
  // Scroll-lock / jump-to-latest — only auto-scroll while the reader is
  // already at the bottom; otherwise surface a "New messages" pill.
  const [atBottom, setAtBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  // In-channel text search — 🔍 toggle reveals a filter input.
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");

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
  // Defaults to #General — opening Guild/a Group always lands there, per the
  // owner's spec, rather than a separate "pick a channel" step.
  const activeSub = isSubbed
    ? (subChannels.find(s => s.id === selectedSubId)
      || subChannels.find(s => s.id === "general")
      || subChannels[0] || null)
    : null;
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
    if (!el) return;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      setHasNewBelow(true);
    }
  }, [msgs.length, msgChannelId]);

  // Switching channels always lands back at the bottom, unread-message pill
  // cleared, regardless of where the previous channel was scrolled to.
  useEffect(() => {
    const el = msgListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setAtBottom(true);
    setHasNewBelow(false);
  }, [msgChannelId]);

  function handleMsgListScroll() {
    const el = msgListRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAtBottom(nearBottom);
    if (nearBottom) setHasNewBelow(false);
  }

  function scrollToLatest() {
    const el = msgListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setAtBottom(true);
    setHasNewBelow(false);
  }

  // Viewing a channel clears its unread badge.
  useEffect(() => {
    if (msgChannelId) markRead?.(msgChannelId);
  }, [msgChannelId, msgs, markRead]);

  const visibleMsgs = msgSearchQuery.trim()
    ? msgs.filter(m => m.text?.toLowerCase().includes(msgSearchQuery.trim().toLowerCase()))
    : msgs;

  // "@partial" trailing token in the compose draft, for the mention
  // autocomplete dropdown.
  const mentionMatch = draft.match(/@(\w*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1] : null;
  const mentionCandidates = mentionQuery != null
    ? otherKnownIds
      .map(id => resolveName(id))
      .filter(name => name && name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
      .slice(0, 5)
    : [];
  const mentionDropdownOpen = mentionOpen && mentionCandidates.length > 0;

  function pickMention(name) {
    setDraft(prev => prev.replace(/@(\w*)$/, `@${name} `));
    setMentionOpen(false);
  }

  function switchDisplay(id) {
    setDisplay(id); setSelected(null); setSelectedSub(null);
    setPicking(false); setRelationsOpen(false); setSubManagerOpen(false); setEmojiOpen(false);
    setReplyTo(null); setMsgSearchOpen(false); setMsgSearchQuery("");
  }

  function openChannel(id) {
    setSelected(id); setSelectedSub(null); setRelationsOpen(false); setSubManagerOpen(false); setEmojiOpen(false);
    setReplyTo(null); setMsgSearchOpen(false); setMsgSearchQuery("");
  }

  function handleSend() {
    if (!msgChannelId || !canPostHere || !draft.trim()) return;
    sendMessage(msgChannelId, draft, { replyTo });
    setDraft("");
    setReplyTo(null);
    setMentionOpen(false);
  }

  function insertEmoji(e) {
    setDraft(prev => (prev.length + e.length > 280 ? prev : prev + e));
  }

  function openNameMenu(id) {
    if (!id || id === playerId) return; // no self-actions on your own name
    setNameMenuId(id); setNameMenuView("menu");
  }
  function closeNameMenu() { setNameMenuId(null); }

  function openMessageMenu(m) { setMessageMenu({ message: m }); }
  function closeMessageMenu() { setMessageMenu(null); }

  function handleLeaveGroup() {
    if (!active || active.type !== "group") return;
    leaveGroup?.(active.id);
    setSelected("world"); setSelectedSub(null);
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
            onClick={() => setTranslateEnabled(v => !v)}
            title={translateEnabled ? "Translate: on" : "Translate messages to your language"}
            style={{
              ...BTN_RESET, minWidth: 36, minHeight: 36, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: translateEnabled ? "rgba(200,160,96,.15)" : "rgba(255,255,255,.03)",
              border: `1px solid ${translateEnabled ? "#c8a06050" : "#2a2a2a"}`,
              color: translateEnabled ? GOLD : "#8a9aaa", fontSize: 13, fontWeight: 700,
              fontFamily: "'Crimson Pro',serif",
            }}
          >Aa</button>
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
            ...BTN_RESET, flex: 1, padding: "11px 0", ...TAB_FONT,
            color: display === d.id ? TAB_ACTIVE_COL : TAB_INACTIVE_COL,
            borderBottom: display === d.id ? `3px solid ${TAB_ACTIVE_COL}` : "3px solid transparent",
            background: display === d.id ? "rgba(232,160,64,.12)" : "rgba(255,255,255,.02)",
          }}>{d.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Channel list */}
        <div className="scr chat-scroll" style={{
          width: 160, flexShrink: 0, minHeight: 0, overflowY: "auto", borderRight: `1px solid ${BORDER_COL}`,
          padding: 6, display: "flex", flexDirection: "column", gap: 4,
        }}>
          {display === "chats" && (
            <>
              {worldCh.map(ch => (
                <ChannelRow key={ch.id}
                  label={channelLabel(ch, playerId, playerName)}
                  active={!relationsOpen && active?.id === ch.id}
                  muted={!!mutedChannelIds?.has?.(ch.id)}
                  onOpen={() => openChannel(ch.id)}
                  onToggleMute={() => toggleMute?.(ch.id)}
                />
              ))}
              {factionCh.map(ch => (
                <ChannelRow key={ch.id}
                  label={channelLabel(ch, playerId, playerName)}
                  active={active?.id === ch.id}
                  muted={!!mutedChannelIds?.has?.(ch.id)}
                  onOpen={() => openChannel(ch.id)}
                  onToggleMute={() => toggleMute?.(ch.id)}
                />
              ))}
              {crewCh.length === 0 && (
                <div style={{ ...TEXT_LEFT, color: "#3a4050", padding: "10px 4px" }}>No guild yet</div>
              )}
              {crewCh.map(ch => (
                <div key={ch.id}>
                  <ChannelRow
                    label={channelLabel(ch, playerId, playerName)}
                    active={active?.id === ch.id}
                    muted={!!mutedChannelIds?.has?.(ch.id)}
                    onOpen={() => openChannel(ch.id)}
                    onToggleMute={() => toggleMute?.(ch.id)}
                  />
                  {active?.id === ch.id && (
                    <SubchannelRows
                      subChannels={subchannelsOf(ch, { crews })}
                      activeSubId={activeSub?.id}
                      onSelect={setSelectedSub}
                    />
                  )}
                </div>
              ))}
              <button onClick={() => { setPicking(true); setPickSel([]); setGroupName(""); setSelected(null); }} style={{
                ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                background: "rgba(200,160,64,.12)", border: "1px solid #c8a06040",
                color: GOLD, ...TEXT_LEFT,
              }}>+ New Group</button>
              {groupCh.map(ch => (
                <div key={ch.id}>
                  <ChannelRow
                    label={channelLabel(ch, playerId, playerName)}
                    active={active?.id === ch.id}
                    muted={!!mutedChannelIds?.has?.(ch.id)}
                    onOpen={() => openChannel(ch.id)}
                    onToggleMute={() => toggleMute?.(ch.id)}
                  />
                  {active?.id === ch.id && (
                    <SubchannelRows
                      subChannels={subchannelsOf(ch, { crews })}
                      activeSubId={activeSub?.id}
                      onSelect={setSelectedSub}
                    />
                  )}
                </div>
              ))}
            </>
          )}
          {display === "direct" && (
            <>
              <button onClick={() => { setRelationsOpen(true); setSelected(null); }} style={{
                ...BTN_RESET, padding: "7px 6px", borderRadius: 4, textAlign: "left",
                background: relationsOpen ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
                border: `1px solid ${relationsOpen ? "#c8a06050" : "#1e2028"}`,
                color: relationsOpen ? GOLD : "#6a7a8a", ...TEXT_LEFT,
              }}>⚙ Relations</button>
              {dmCh.length === 0 && (
                <div style={{ ...TEXT_LEFT, color: "#3a4050", padding: "10px 4px" }}>No DMs yet</div>
              )}
              {dmCh.map(ch => (
                <ChannelRow key={ch.id}
                  label={channelLabel(ch, playerId, playerName)}
                  active={!relationsOpen && active?.id === ch.id}
                  muted={!!mutedChannelIds?.has?.(ch.id)}
                  onOpen={() => openChannel(ch.id)}
                  onToggleMute={() => toggleMute?.(ch.id)}
                />
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
          ) : (
            <>
              {(isSubbed && activeSub || active.type === "group") && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "7px 10px",
                  borderBottom: `1px solid ${BORDER_COL}`, flexShrink: 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    {isSubbed && activeSub && (
                      <>
                        <span style={{ ...TEXT_XS, color: GOLD }}># {activeSub.name}</span>
                        {activeSub.leaderOnly && <span style={{ fontSize: 9 }}>🔒</span>}
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => { setMsgSearchOpen(v => !v); if (msgSearchOpen) setMsgSearchQuery(""); }}
                      title="Search this channel"
                      style={{
                        ...BTN_RESET, width: 22, height: 22, borderRadius: 4,
                        background: msgSearchOpen ? "rgba(200,160,96,.15)" : "rgba(255,255,255,.03)",
                        border: `1px solid ${msgSearchOpen ? "#c8a06050" : "#1e2028"}`,
                        color: msgSearchOpen ? GOLD : "#8a9aaa", fontSize: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >🔍</button>
                    {active.type === "group" && (
                      <button onClick={handleLeaveGroup} style={{
                        ...BTN_RESET, padding: "3px 7px", borderRadius: 4,
                        background: "rgba(160,40,40,.12)", border: "1px solid #602020",
                        color: "#cc6060", ...TEXT_XS, whiteSpace: "nowrap",
                      }}>Leave Group</button>
                    )}
                  </div>
                </div>
              )}
              {msgSearchOpen && (
                <div style={{ padding: "6px 10px", borderBottom: `1px solid ${BORDER_COL}`, flexShrink: 0 }}>
                  <input
                    autoFocus
                    value={msgSearchQuery} onChange={e => setMsgSearchQuery(e.target.value)}
                    placeholder="Search messages…"
                    style={{
                      width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid #2a3040",
                      borderRadius: 4, padding: "6px 8px", color: "#c8c0b0",
                      fontFamily: "'Crimson Pro',serif", fontSize: 11, outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              )}
              <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
                <div ref={msgListRef} onScroll={handleMsgListScroll} className="scr chat-scroll" style={{ height: "100%", minHeight: 0, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, boxSizing: "border-box" }}>
                  {visibleMsgs.length === 0 && (
                    <div style={{ ...TEXT_XS, color: "#3a4050", textAlign: "center", padding: "20px 0" }}>
                      {msgSearchQuery.trim() ? "No matches." : "No messages yet."}
                    </div>
                  )}
                  {visibleMsgs.map(m => (
                    <MessageBubble
                      key={m.id} m={m} mine={m.senderId === playerId} crews={crews}
                      profanityFilterEnabled={profanityFilterEnabled}
                      translateEnabled={translateEnabled}
                      ownName={playerName}
                      reactionSummary={reactions?.[m.id]}
                      onReact={(id, emoji) => toggleReaction?.(id, emoji)}
                      onNameClick={() => openNameMenu(m.senderId)}
                      onLongPress={() => openMessageMenu(m)}
                    />
                  ))}
                </div>
                {hasNewBelow && (
                  <button onClick={scrollToLatest} style={{
                    ...BTN_RESET, position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)",
                    padding: "5px 12px", borderRadius: 12, background: "rgba(200,160,96,.9)",
                    border: "1px solid #c8a060", color: "#1a1006", ...TEXT_XS, fontWeight: 700,
                    boxShadow: "0 2px 10px rgba(0,0,0,.5)",
                  }}>↓ New messages</button>
                )}
              </div>
              {typingByChannel?.[msgChannelId] && (
                <div style={{ padding: "3px 12px", flexShrink: 0, ...TEXT_XS, fontSize: 9, color: "#6a7a8a", fontStyle: "italic" }}>
                  {typingByChannel[msgChannelId]} is typing…
                </div>
              )}
              {replyTo && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                  borderTop: `1px solid ${BORDER_COL}`, background: "rgba(255,255,255,.02)", flexShrink: 0,
                }}>
                  <div style={{ flex: 1, minWidth: 0, ...TEXT_XS, fontSize: 9, color: "#7a8a9a", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    ↩ Replying to <span style={{ color: GOLD }}>{replyTo.senderName}</span>: {replyTo.text}
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{
                    ...BTN_RESET, flexShrink: 0, color: "#8a9aaa", fontSize: 13, padding: "0 4px",
                  }}>×</button>
                </div>
              )}
              {canPostHere ? (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {mentionDropdownOpen && (
                    <div style={{
                      position: "absolute", left: 10, right: 10, bottom: "100%", marginBottom: 6,
                      background: PANEL_BG, border: `1px solid ${BORDER_COL}`, borderRadius: 6,
                      padding: 4, boxShadow: "0 -4px 18px rgba(0,0,0,.6)",
                      display: "flex", flexDirection: "column", gap: 2,
                    }}>
                      {mentionCandidates.map(name => (
                        <button key={name} onClick={() => pickMention(name)} style={{
                          ...BTN_RESET, padding: "6px 8px", borderRadius: 4, textAlign: "left",
                          ...TEXT_XS, color: "#c8c0b0",
                        }}>@{name}</button>
                      ))}
                    </div>
                  )}
                  {emojiOpen && (
                    <div className="scr chat-scroll" style={{
                      position: "absolute", left: 10, right: 10, bottom: "100%", marginBottom: 6,
                      maxHeight: 150, overflowY: "auto",
                      background: PANEL_BG, border: `1px solid ${BORDER_COL}`, borderRadius: 6,
                      padding: 8, boxShadow: "0 -4px 18px rgba(0,0,0,.6)",
                      display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2,
                    }}>
                      {EMOJI_SET.map(e => (
                        <button key={e} onClick={() => insertEmoji(e)} style={{
                          ...BTN_RESET, fontSize: 17, padding: "5px 0", borderRadius: 4,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{e}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: `1px solid ${BORDER_COL}` }}>
                    <button
                      onClick={() => setEmojiOpen(v => !v)}
                      title="Emoji"
                      style={{
                        ...BTN_RESET, minWidth: 36, borderRadius: 4,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: emojiOpen ? "rgba(200,160,96,.15)" : "rgba(255,255,255,.05)",
                        border: `1px solid ${emojiOpen ? "#c8a06050" : "#2a3040"}`, fontSize: 15,
                      }}
                    >🙂</button>
                    <input
                      value={draft}
                      onChange={e => { setDraft(e.target.value); setMentionOpen(/@(\w*)$/.test(e.target.value)); }}
                      onFocus={() => setEmojiOpen(false)}
                      onKeyDown={e => { if (e.key === "Enter") handleSend(); else if (e.key === "Escape") setMentionOpen(false); }}
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

      {/* Name popup — tap a sender's name in the message list to open this.
          "menu" offers Add/Remove Friend, Block/Unblock, View Profile;
          "profile" is a lightweight read-only card (no dedicated profile
          screen exists elsewhere in the game yet). */}
      {nameMenuId && (
        <div
          onClick={closeNameMenu}
          style={{
            position: "fixed", inset: 0, zIndex: 9700,
            background: "rgba(0,0,0,.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 240, background: PANEL_BG, border: `1px solid ${BORDER_COL}`,
            borderRadius: 8, padding: 14, boxShadow: "0 8px 30px rgba(0,0,0,.7)",
          }}>
            {nameMenuView === "menu" ? (
              <>
                <div style={{ ...TEXT_NAME, fontSize: 13, color: GOLD, marginBottom: 10, textAlign: "center" }}>
                  {taggedName(resolveName(nameMenuId), crewAbbrFor(nameMenuId, crews))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <NameMenuBtn tone="gold" onClick={() => setNameMenuView("profile")}>👤 View Profile</NameMenuBtn>
                  {blocked.includes(nameMenuId) ? (
                    <NameMenuBtn tone="good" onClick={() => { unblockPlayer(nameMenuId); closeNameMenu(); }}>✅ Unblock</NameMenuBtn>
                  ) : (
                    <>
                      {friends.includes(nameMenuId) ? (
                        <NameMenuBtn onClick={() => { unfriend(nameMenuId); closeNameMenu(); }}>✖ Remove Friend</NameMenuBtn>
                      ) : (
                        <NameMenuBtn tone="good" onClick={() => { addFriend(nameMenuId); closeNameMenu(); }}>🤝 Add Friend</NameMenuBtn>
                      )}
                      <NameMenuBtn tone="bad" onClick={() => { blockPlayer(nameMenuId); closeNameMenu(); }}>🚫 Block</NameMenuBtn>
                    </>
                  )}
                  <NameMenuBtn onClick={closeNameMenu}>Cancel</NameMenuBtn>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setNameMenuView("menu")} style={{
                    ...BTN_RESET, color: "#8a9aaa", fontSize: 16, padding: "0 4px",
                  }}>‹</button>
                  <div style={{ ...TEXT_SM, fontSize: 12, color: GOLD }}>Profile</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  <ProfileRow label="Name" value={resolveName(nameMenuId)} />
                  <ProfileRow label="Crew" value={
                    crewFor(nameMenuId, crews)
                      ? `[${crewFor(nameMenuId, crews).abbr}] ${crewFor(nameMenuId, crews).name}`
                      : "No crew"
                  } />
                  <ProfileRow label="Faction" value={factionLabelFor(nameMenuId, crews)} />
                  <ProfileRow label="Status" value={
                    blocked.includes(nameMenuId) ? "Blocked" : friends.includes(nameMenuId) ? "Friend" : "Not connected"
                  } />
                </div>
                <NameMenuBtn onClick={closeNameMenu}>Close</NameMenuBtn>
              </>
            )}
          </div>
        </div>
      )}

      {/* Long-press (or right-click) message menu — React / Reply / Copy. */}
      {messageMenu && (
        <MessageMenu
          message={messageMenu.message}
          view={messageMenu.view || "menu"}
          onReact={(emoji) => {
            if (emoji == null) { setMessageMenu(m => m ? { ...m, view: "react" } : m); return; }
            toggleReaction?.(messageMenu.message.id, emoji);
            closeMessageMenu();
          }}
          onReply={() => {
            setReplyTo({ id: messageMenu.message.id, senderName: messageMenu.message.senderName, text: messageMenu.message.text });
            closeMessageMenu();
          }}
          onCopy={() => {
            navigator.clipboard?.writeText(messageMenu.message.text);
            closeMessageMenu();
          }}
          onClose={closeMessageMenu}
        />
      )}
    </div>
  );
});
