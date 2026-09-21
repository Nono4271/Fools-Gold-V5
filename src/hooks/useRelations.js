import { useState, useCallback, useMemo } from "react";
import {
  sendRequest, confirmRequest, declineRequest, cancelRequest, removeFriend,
  block, unblock, listByStatus, searchCandidates,
} from "../../shared/utils/relationsRules.js";

// LOCAL PERSISTENCE ONLY, same as useChat.js — relations live in memory for
// the tab's lifetime and don't survive a reload. See useChat.js for why (no
// save/load pattern exists anywhere in this codebase yet).
//
// `knownPlayerIds` + `nameOf` are how this hook finds who's addable — same
// AI id list (shared/utils/worldTiles.js aiPlayerId) the chat DM/group
// pickers already use, no new identity scheme.
export function useRelations({ playerId = "player", knownPlayerIds, nameOf }) {
  const [relations, setRelations] = useState({});

  const candidates = useMemo(() => (
    (knownPlayerIds || [])
      .filter(id => id !== playerId)
      .map(id => ({ id, name: nameOf ? nameOf(id) : id }))
  ), [knownPlayerIds, playerId, nameOf]);

  const friends = useMemo(() => listByStatus(relations, "friend"), [relations]);
  const blocked = useMemo(() => listByStatus(relations, "blocked"), [relations]);
  // Always empty today — nothing local can originate an incoming request
  // (there's no other real player). Kept so the "Request" tab, and a real
  // server later, both have somewhere for it to show up.
  const incoming = useMemo(() => listByStatus(relations, "pendingIn"), [relations]);
  const outgoing = useMemo(() => listByStatus(relations, "pendingOut"), [relations]);

  // Sends a request and resolves it to a friend in the same tick — auto-
  // accepted for local play, same pattern as CrewPanel's crew-join request
  // (there's no other real player who could actually decline it).
  const addFriend = useCallback((id) => {
    setRelations(prev => confirmRequest(sendRequest(prev, id), id));
  }, []);

  const declineIncoming = useCallback((id) => setRelations(prev => declineRequest(prev, id)), []);
  const cancelOutgoing = useCallback((id) => setRelations(prev => cancelRequest(prev, id)), []);
  const unfriend = useCallback((id) => setRelations(prev => removeFriend(prev, id)), []);
  const blockPlayer = useCallback((id) => setRelations(prev => block(prev, id)), []);
  const unblockPlayer = useCallback((id) => setRelations(prev => unblock(prev, id)), []);

  const search = useCallback((query) => searchCandidates(query, candidates), [candidates]);

  return {
    relations, friends, blocked, incoming, outgoing, candidates,
    addFriend, declineIncoming, cancelOutgoing, unfriend, blockPlayer, unblockPlayer, search,
  };
}
