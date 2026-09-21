// Nyro — a named AI companion, distinct from the ambient per-faction AI
// roster (shared/utils/worldTiles.js's aiPlayerId "ai_<faction>_<i>" ids).
// Nyro has no map/tile/HQ presence at all — purely a social-layer
// companion: always in the player's faction and crew, addable as a friend,
// invitable to group chats, and able to speak in those places. Nyro's id
// deliberately doesn't match "ai_<faction>_<i>" (aiFactionOf(NYRO_ID) is
// null) so the ambient multi-AI chatter/crew-formation systems
// (shared/utils/aiChatter.js, shared/utils/aiCrews.js) never pick Nyro up
// by accident — see shared/utils/nyroChatter.js for Nyro's own chatter.
export const NYRO_ID = "ai_nyro";
export const NYRO_NAME = "Nyro";

// How long Nyro takes to accept a friend request or a group-chat invite —
// a real (if short) pending window rather than an instant auto-accept, so
// it reads as someone actually responding. A little jitter is added by the
// caller so it doesn't feel mechanical.
export const NYRO_ACCEPT_DELAY_MS = 3500;
