import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  resolveChannelsFor, canPost, createMessage, createDmChannel, createGroupChannel,
} from "../../shared/utils/chatRules.js";
import { generateAiChatter } from "../../shared/utils/aiChatter.js";
import { nyroEligible, generateNyroChatter } from "../../shared/utils/nyroChatter.js";
import { NYRO_ID, NYRO_ACCEPT_DELAY_MS } from "../../shared/constants/nyro.js";
import {
  subchannelId, parseSubchannelId, subchannelsOf, canPostInSubchannel,
  addSubchannel, removeSubchannel, moveSubchannel,
} from "../../shared/utils/subchannels.js";

// LOCAL PERSISTENCE ONLY: this hook keeps all chat state (channels, messages)
// in React state for the lifetime of the tab/session — nothing is written to
// localStorage or any other store, so it does NOT survive a page reload, and
// there is no cross-device sync. That matches the rest of this project's
// state today (see ReadMeAI.md — there is no save system yet). Revisit this
// when the game gets real persistence and again when the multiplayer server
// item lands, since messages will need to move server-side at that point.

const AI_CHATTER_INTERVAL_MS = 45_000;

// GameView.jsx's crew create/join/leave handlers store the LOCAL player's own
// membership as their faction key (e.g. "pirates"), not a player id — AI crew
// membership (shared/utils/aiCrews.js) always uses the full "ai_<faction>_<i>"
// id, so a bare faction-key entry can only ever be the local player's. Swap it
// for their real playerId so chatRules.js's `crew.members.includes(playerId)`
// works without that module (or aiCrews.js's crew-formation logic) needing to
// know about the quirk.
function normalizeCrewsForPlayer(crews, playerId, playerFacKey) {
  return (crews || []).map(c => {
    if (!playerFacKey || !(c.members || []).includes(playerFacKey)) return c;
    return {
      ...c,
      members: c.members.map(m => m === playerFacKey ? playerId : m),
      // crew.founder (the crew "leader" — shared/utils/subchannels.js gates
      // #Announcement and channel management on it) has the same quirk.
      founder: c.founder === playerFacKey ? playerId : c.founder,
    };
  });
}

export function useChat({ screen, playerId = "player", playerName, playerFacKey, crews, aiPlayerIds }) {
  const [messages, setMessages] = useState({}); // { [channelId]: Message[] }
  const [dms, setDms] = useState([]);
  const [groups, setGroups] = useState([]);
  // Display-time only: messages are always stored with their raw text, and
  // shared/utils/profanity.js's censorText() is applied by the UI (see
  // ChatPanel.jsx) when this is on — so toggling it also reveals/re-masks
  // every earlier message, not just new ones. Word-list based, client-side
  // today; the same censorText() will run server-side unchanged once the
  // multiplayer server exists.
  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(true);
  // Which channel/sub-channel/display-tab ChatPanel.jsx has open — lifted up
  // here (rather than local useState in ChatPanel) so it survives the panel
  // unmounting on close: reopening chat lands back on whichever chat was
  // open before, per the owner's spec. Defaults to World.
  const [activeDisplay, setActiveDisplay] = useState("chats");
  const [activeChannelId, setActiveChannelId] = useState("world");
  const [activeSubId, setActiveSubId] = useState(null);
  // Per-(leaf) channel "last viewed" timestamp, for the unread badge on the
  // closed-state preview (ChatPreview.jsx). Starts empty — since chat state
  // itself resets every session (see the LOCAL PERSISTENCE ONLY note above),
  // "unread" effectively means "posted since this session started and not
  // yet viewed", which is the correct behavior given there's no history to
  // have already read.
  const [lastReadAt, setLastReadAt] = useState({});
  // Top-level channel ids (world/faction_.../crew_.../dm_.../group_...) the
  // player has muted — excluded from the unread badge and the closed-state
  // preview, but AI/Nyro chatter still posts there same as ever (mute only
  // affects notification, not simulation).
  const [mutedChannelIds, setMutedChannelIds] = useState(() => new Set());
  // messageId -> { [emoji]: playerId[] } — player-only reactions (no AI
  // auto-reacting, per the owner), so in practice each emoji's array is
  // just [] or [playerId], but this shape is ready for real multiplayer.
  const [reactions, setReactions] = useState({});
  // Leaf channel id -> { name, until } — a transient "X is typing…" shown
  // just before the ambient/Nyro chatter tick actually posts a message
  // (see the tick below). Cleared automatically once that message lands.
  const [typingByChannel, setTypingByChannel] = useState({});

  const latest = useRef({ crews, aiPlayerIds, dms, groups, playerFacKey, playerId });
  latest.current = { crews, aiPlayerIds, dms, groups, playerFacKey, playerId };

  const ctx = useMemo(() => ({
    crews: normalizeCrewsForPlayer(crews, playerId, playerFacKey),
    dms, groups, factions: { [playerId]: playerFacKey },
  }), [crews, dms, groups, playerId, playerFacKey]);

  const channels = useMemo(() => resolveChannelsFor(playerId, ctx), [playerId, ctx]);

  const appendMessage = useCallback((msg) => {
    if (!msg) return;
    setMessages(prev => ({ ...prev, [msg.channelId]: [...(prev[msg.channelId] || []), msg] }));
  }, []);

  // ── Post a message as the local player ──────────────────────────────────────
  // World/faction/dm post straight to their (flat) channel id. Crew/group
  // channels are containers only, once sub-channels exist — a message
  // targets a composite "<parentId>::<subId>" id (shared/utils/subchannels.js)
  // instead, gated by canPostInSubchannel (container membership + a
  // leader-only sub-channel's own check, e.g. #Announcement).
  // `replyTo` (optional) is a small snapshot — { id, senderName, text } — of
  // the message being replied to, taken by ChatPanel.jsx at reply time and
  // stamped straight onto the new message. A snapshot rather than just an id
  // keeps the quote showing correctly even if the original is ever removed,
  // and needs no separate lookup at render time.
  const sendMessage = useCallback((channelId, text, { replyTo } = {}) => {
    const parsed = parseSubchannelId(channelId);
    if (parsed) {
      const parentChannel = channels.find(c => c.id === parsed.parentId);
      if (!parentChannel) return { ok: false, reason: "Unknown channel" };
      const sub = subchannelsOf(parentChannel, ctx).find(s => s.id === parsed.subId);
      if (!sub) return { ok: false, reason: "Unknown channel" };
      if (!canPostInSubchannel(playerId, parentChannel, sub, ctx)) {
        return { ok: false, reason: "Not allowed to post here" };
      }
      const msg = createMessage({ channelId, senderId: playerId, senderName: playerName, text, now: Date.now() });
      if (!msg) return { ok: false, reason: "Empty message" };
      appendMessage(replyTo ? { ...msg, replyTo } : msg);
      return { ok: true, message: msg };
    }
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return { ok: false, reason: "Unknown channel" };
    if (!canPost(playerId, channel, ctx)) return { ok: false, reason: "Not allowed to post here" };
    const msg = createMessage({ channelId, senderId: playerId, senderName: playerName, text, now: Date.now() });
    if (!msg) return { ok: false, reason: "Empty message" };
    appendMessage(replyTo ? { ...msg, replyTo } : msg);
    return { ok: true, message: msg };
  }, [channels, ctx, playerId, playerName, appendMessage]);

  // ── Start (or reopen) a DM with another known player ────────────────────────
  const startDm = useCallback((otherPlayerId) => {
    if (!otherPlayerId || otherPlayerId === playerId) return null;
    const channel = createDmChannel(playerId, otherPlayerId);
    setDms(prev => prev.some(c => c.id === channel.id) ? prev : [...prev, channel]);
    return channel;
  }, [playerId]);

  // ── Start a group chat with several known players ───────────────────────────
  // The starter becomes the group's owner — the only one who can later
  // add/manage its sub-channels (createGroupChannel seeds it with #General).
  // Nyro (shared/constants/nyro.js) is a special case: left out of the
  // initial participant list and added a short, jittered delay later, so
  // joining the group reads as Nyro actually accepting the invite rather
  // than being instantly added like every other AI id.
  const startGroup = useCallback((name, participantIds) => {
    const invitedNyro = (participantIds || []).includes(NYRO_ID);
    const initialIds = invitedNyro ? participantIds.filter(id => id !== NYRO_ID) : participantIds;
    const participants = [...new Set([playerId, ...(initialIds || [])])];
    const channel = createGroupChannel(name, participants, { ownerId: playerId });
    setGroups(prev => [...prev, channel]);
    if (invitedNyro) {
      const jitter = Math.floor(Math.random() * 1500);
      setTimeout(() => {
        setGroups(prev => prev.map(g => (
          g.id === channel.id && !g.participants.includes(NYRO_ID)
            ? { ...g, participants: [...g.participants, NYRO_ID] }
            : g
        )));
      }, NYRO_ACCEPT_DELAY_MS + jitter);
    }
    return channel;
  }, [playerId]);

  // ── Group sub-channel add/remove/reorder — gated to the group's owner by
  // ChatPanel.jsx before it ever calls these (see subchannels.js's
  // canManageSubchannels), same trust boundary as sendMessage above. Crews
  // manage theirs through GameView.jsx's manageCrewSubchannels instead,
  // since crew data lives outside this hook.
  const addGroupSubchannel = useCallback((groupId, name) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, subChannels: addSubchannel(g.subChannels, name) } : g));
  }, []);
  const removeGroupSubchannel = useCallback((groupId, subId) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, subChannels: removeSubchannel(g.subChannels, subId) } : g));
  }, []);
  const moveGroupSubchannel = useCallback((groupId, subId, direction) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, subChannels: moveSubchannel(g.subChannels, subId, direction) } : g));
  }, []);

  // Removing the player from a group's own participants list is enough —
  // resolveChannelsFor (shared/utils/chatRules.js) only returns a group to
  // players still in its `participants`, so it drops off their channel list
  // on its own. There's no equivalent for World/Faction (can't leave those)
  // or crews (already handled by GameView.jsx's onLeaveCrew, which owns
  // crew data) or DMs (nothing to "leave" — just stop replying).
  const leaveGroup = useCallback((groupId) => {
    setGroups(prev => prev.map(g => (
      g.id === groupId ? { ...g, participants: g.participants.filter(p => p !== playerId) } : g
    )));
  }, [playerId]);

  const getMessages = useCallback((channelId) => messages[channelId] || [], [messages]);

  // ── Mute — per top-level channel (world/faction/crew/dm/group), not per
  // sub-channel, to keep the mute control to one icon per left-column row.
  const toggleMute = useCallback((channelId) => {
    setMutedChannelIds(prev => {
      const next = new Set(prev);
      next.has(channelId) ? next.delete(channelId) : next.add(channelId);
      return next;
    });
  }, []);

  // ── Reactions — player-only (see the `reactions` state comment above):
  // tapping an emoji on a message toggles the player's own reaction on it.
  const toggleReaction = useCallback((messageId, emoji) => {
    setReactions(prev => {
      const forMsg = prev[messageId] || {};
      const ids = forMsg[emoji] || [];
      const nextIds = ids.includes(playerId) ? ids.filter(id => id !== playerId) : [...ids, playerId];
      const nextForMsg = { ...forMsg, [emoji]: nextIds };
      if (nextIds.length === 0) delete nextForMsg[emoji];
      return { ...prev, [messageId]: nextForMsg };
    });
  }, [playerId]);

  // ── Unread — every leaf (postable) channel id the player currently sees,
  // including each crew/group's own sub-channels. Shared by the unread
  // count below and by getRecentMessages/getActiveChannelMessages above.
  const leafChannelIds = useMemo(() => {
    const ids = new Set();
    for (const c of channels) {
      ids.add(c.id);
      if (c.type === "crew" || c.type === "group") {
        for (const sub of subchannelsOf(c, ctx)) ids.add(subchannelId(c.id, sub.id));
      }
    }
    return ids;
  }, [channels, ctx]);

  // A leaf id's own top-level/container id, for mute checks (mute is
  // per-container, unread is tracked per-leaf).
  const topIdFor = useCallback((leafId) => parseSubchannelId(leafId)?.parentId ?? leafId, []);

  const markRead = useCallback((channelId) => {
    if (!channelId) return;
    setLastReadAt(prev => ({ ...prev, [channelId]: Date.now() }));
  }, []);

  const unreadCount = useMemo(() => {
    let total = 0;
    for (const id of leafChannelIds) {
      if (mutedChannelIds.has(topIdFor(id))) continue;
      const since = lastReadAt[id] || 0;
      const msgs = messages[id];
      if (!msgs) continue;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].ts <= since) break; // messages are appended in order, so this is the first read one
        total++;
      }
    }
    return total;
  }, [leafChannelIds, mutedChannelIds, topIdFor, lastReadAt, messages]);

  // Most recent messages across every channel the player sees (including
  // every crew/group's sub-channels), newest last — for the closed-state
  // mini preview (ChatPreview.jsx) shown even while the chat panel itself
  // is closed.
  const getRecentMessages = useCallback((n = 2) => {
    const all = Object.entries(messages)
      .filter(([channelId]) => leafChannelIds.has(channelId))
      .flatMap(([, msgs]) => msgs);
    all.sort((a, b) => a.ts - b.ts);
    return all.slice(-n);
  }, [messages, leafChannelIds]);

  // Most recent messages in whichever channel/sub-channel is currently
  // "active" (see activeChannelId/activeSubId above) — for the closed-state
  // mini preview (ChatPreview.jsx), which the owner wants to mirror whatever
  // chat was open/last viewed, not just whatever channel happened to get a
  // message most recently. Mirrors ChatPanel.jsx's own #General-fallback
  // logic for crew/group so the preview always matches what reopening chat
  // would show.
  const getActiveChannelMessages = useCallback((n = 2) => {
    const channel = channels.find(c => c.id === activeChannelId);
    if (!channel) return [];
    let msgChannelId = channel.id;
    if (channel.type === "crew" || channel.type === "group") {
      const subs = subchannelsOf(channel, ctx);
      const sub = subs.find(s => s.id === activeSubId) || subs.find(s => s.id === "general") || subs[0];
      if (!sub) return [];
      msgChannelId = subchannelId(channel.id, sub.id);
    }
    return (messages[msgChannelId] || []).slice(-n);
  }, [channels, ctx, activeChannelId, activeSubId, messages]);

  // ── Occasional AI flavor chatter so World/Faction/Crew don't feel dead ──────
  // Each line now shows a brief "X is typing…" (typingByChannel) before it
  // actually lands, instead of appearing instantly — scheduleTypingThenSend
  // below handles the delay for both the ambient roster and Nyro.
  useEffect(() => {
    if (screen !== "game") return;
    const timeouts = [];
    const scheduleTypingThenSend = (channelId, name, msg) => {
      const delay = 1000 + Math.floor(Math.random() * 900);
      setTypingByChannel(prev => ({ ...prev, [channelId]: { name, until: Date.now() + delay } }));
      const t = setTimeout(() => {
        appendMessage(msg);
        setTypingByChannel(prev => {
          if (prev[channelId]?.name !== name) return prev; // something else is now typing there — leave it
          const next = { ...prev };
          delete next[channelId];
          return next;
        });
      }, delay);
      timeouts.push(t);
    };
    const tick = () => {
      const { crews, aiPlayerIds, dms, groups, playerFacKey, playerId } = latest.current;
      const normalizedCrews = normalizeCrewsForPlayer(crews, playerId, playerFacKey);
      const allChannels = resolveChannelsFor(playerId, {
        crews: normalizedCrews, dms, groups, factions: { [playerId]: playerFacKey },
      });
      const chattyChannels = allChannels.filter(c => c.type !== "dm" && c.type !== "group"); // ambient AI doesn't join player DMs/groups
      const seedBase = Date.now();
      const chatterCtx = { crews: normalizedCrews, aiPlayerIds: aiPlayerIds || [], now: Date.now() };
      // One shot at flavor chatter per channel per tick, silently skipped when
      // no AI is eligible to speak there (e.g. an empty crew). A crew's
      // chatter always lands in its #General sub-channel — AI never posts to
      // a leader-only #Announcement, and there's no "AI officer" concept.
      chattyChannels.forEach((channel, i) => {
        const msg = generateAiChatter(channel, chatterCtx, seedBase + i);
        if (!msg) return;
        if (channel.type === "crew") {
          const subs = subchannelsOf(channel, { crews: normalizedCrews });
          const general = subs.find(s => s.id === "general") || subs[0];
          if (!general) return;
          const leafId = subchannelId(channel.id, general.id);
          scheduleTypingThenSend(leafId, msg.senderName, { ...msg, channelId: leafId });
        } else {
          scheduleTypingThenSend(channel.id, msg.senderName, msg);
        }
      });

      // Nyro's own chatter — separate from the ambient roster above (see
      // shared/utils/nyroChatter.js), since Nyro is eligible in Faction/crew
      // chat AND in any DM/group the player has invited them into (the
      // ambient system above never touches DMs/groups). Never World.
      const nyroCtx = { crews: normalizedCrews, playerFacKey, now: Date.now() };
      allChannels.forEach((channel, i) => {
        if (!nyroEligible(channel, nyroCtx)) return;
        const msg = generateNyroChatter(channel, nyroCtx, seedBase + i + 1000);
        if (!msg) return;
        if (channel.type === "crew") {
          const subs = subchannelsOf(channel, { crews: normalizedCrews });
          const general = subs.find(s => s.id === "general") || subs[0];
          if (!general) return;
          const leafId = subchannelId(channel.id, general.id);
          scheduleTypingThenSend(leafId, msg.senderName, { ...msg, channelId: leafId });
        } else {
          scheduleTypingThenSend(channel.id, msg.senderName, msg);
        }
      });
    };
    const id = setInterval(tick, AI_CHATTER_INTERVAL_MS);
    return () => { clearInterval(id); timeouts.forEach(clearTimeout); };
  }, [screen, appendMessage]);

  return {
    channels, sendMessage, startDm, startGroup, leaveGroup, getMessages, getRecentMessages, getActiveChannelMessages,
    addGroupSubchannel, removeGroupSubchannel, moveGroupSubchannel,
    profanityFilterEnabled, setProfanityFilterEnabled,
    activeDisplay, setActiveDisplay, activeChannelId, setActiveChannelId, activeSubId, setActiveSubId,
    mutedChannelIds, toggleMute, reactions, toggleReaction, typingByChannel,
    unreadCount, markRead,
    // Local player's membership normalized to their playerId (see
    // normalizeCrewsForPlayer above) — ChatPanel.jsx needs this, not the raw
    // `crews` prop, to correctly tag "player" messages with their crew abbr.
    normalizedCrews: ctx.crews,
  };
}
