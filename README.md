# Chat system — files

New files (drop into matching paths in your repo):
- shared/constants/chat.js
- shared/utils/chatRules.js
- shared/utils/aiChatter.js
- src/hooks/useChat.js
- src/components/game/ChatPanel.jsx
- tests/chatRules.test.js

Edited (appended a dated entry at the top):
- ReadMeAI.md

Not done: ChatPanel isn't wired into Game.jsx yet (no import, no open button, no real
crews/aiPlayerIds/playerFacKey passed in). `npm test` (271 pass) and `npm run build`
both clean after `npm install`.

Note: chat state is in-memory only (no save/reload persistence) — this was a deliberate
call since the rest of the codebase has no local persistence pattern yet. Flagged in
ReadMeAI.md as a TODO before/during the multiplayer transition.
