import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  resolveChannelsFor, canPost, createMessage, createDmChannel, createGroupChannel,
} from "../../shared/utils/chatRules.js";
import { generateAiChatter } from "../../shared/utils/aiChatter.js";
import { censorText } from "../../shared/utils/profanity.js";

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
    return { ...c, members: c.members.map(m => m === playerFacKey ? playerId : m) };
  });
}

export function useChat({ screen, playerId = "player", playerName, playerFacKey, crews, aiPlayerIds }) {
  const [messages, setMessages] = useState({}); // { [channelId]: Message[] }
  const [dms, setDms] = useState([]);
  const [groups, setGroups] = useState([]);
  // Word-list based, client-side today; same censorText() will run
  // server-side unchanged once the multiplayer server exists.
  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(true);
  const profanityRef = useRef(profanityFilterEnabled);
  profanityRef.current = profanityFilterEnabled;

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
  const sendMessage = useCallback((channelId, text) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return { ok: false, reason: "Unknown channel" };
    if (!canPost(playerId, channel, ctx)) return { ok: false, reason: "Not allowed to post here" };
    const cleanText = profanityFilterEnabled ? censorText(text) : text;
    const msg = createMessage({ channelId, senderId: playerId, senderName: playerName, text: cleanText, now: Date.now() });
    if (!msg) return { ok: false, reason: "Empty message" };
    appendMessage(msg);
    return { ok: true, message: msg };
  }, [channels, ctx, playerId, playerName, appendMessage, profanityFilterEnabled]);

  // ── Start (or reopen) a DM with another known player ────────────────────────
  const startDm = useCallback((otherPlayerId) => {
    if (!otherPlayerId || otherPlayerId === playerId) return null;
    const channel = createDmChannel(playerId, otherPlayerId);
    setDms(prev => prev.some(c => c.id === channel.id) ? prev : [...prev, channel]);
    return channel;
  }, [playerId]);

  // ── Start a group chat with several known players ───────────────────────────
  const startGroup = useCallback((name, participantIds) => {
    const participants = [...new Set([playerId, ...(participantIds || [])])];
    const channel = createGroupChannel(name, participants);
    setGroups(prev => [...prev, channel]);
    return channel;
  }, [playerId]);

  const getMessages = useCallback((channelId) => messages[channelId] || [], [messages]);

  // ── Occasional AI flavor chatter so World/Faction/Crew don't feel dead ──────
  useEffect(() => {
    if (screen !== "game") return;
    const tick = () => {
      const { crews, aiPlayerIds, dms, groups, playerFacKey, playerId } = latest.current;
      const normalizedCrews = normalizeCrewsForPlayer(crews, playerId, playerFacKey);
      const chattyChannels = resolveChannelsFor(playerId, {
        crews: normalizedCrews, dms, groups, factions: { [playerId]: playerFacKey },
      }).filter(c => c.type !== "dm" && c.type !== "group"); // AI doesn't join player DMs/groups
      if (!chattyChannels.length) return;
      const seedBase = Date.now();
      const chatterCtx = { crews: normalizedCrews, aiPlayerIds: aiPlayerIds || [], now: Date.now() };
      // One shot at flavor chatter per channel per tick, silently skipped when
      // no AI is eligible to speak there (e.g. an empty crew).
      chattyChannels.forEach((channel, i) => {
        const msg = generateAiChatter(channel, chatterCtx, seedBase + i);
        if (!msg) return;
        appendMessage(profanityRef.current ? { ...msg, text: censorText(msg.text) } : msg);
      });
    };
    const id = setInterval(tick, AI_CHATTER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [screen, appendMessage]);

  return {
    channels, sendMessage, startDm, startGroup, getMessages,
    profanityFilterEnabled, setProfanityFilterEnabled,
  };
}
