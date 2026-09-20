# Chat: auto-scroll, scrollable history, un-censorable toggle — what changed from the last zip

Edited (full files — replace at the same paths):
- src/components/game/ChatPanel.jsx — fixed a flexbox `min-height` bug that stopped the
  message list from scrolling; added auto-scroll-to-bottom on new messages/channel switch;
  profanity filter now applied at render time (per message) instead of at send time
- src/hooks/useChat.js — messages are now always stored with raw (uncensored) text so
  toggling the filter can reveal/re-mask history, not just new messages
- ReadMeAI.md — new dated entry

Not changed from last time: everything else (shared/constants/chat.js, shared/utils/chatRules.js,
shared/utils/aiChatter.js, shared/utils/profanity.js, src/Game.jsx, src/GameView.jsx,
src/components/game/GameBar.jsx, tests/*).

`npm test` — 275 pass, 0 fail. `npm run build` — clean.
