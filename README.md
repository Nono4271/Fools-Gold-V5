# Chat wiring + profanity filter — what changed from the last zip

New files:
- shared/utils/profanity.js — word-list profanity censor (pure, will run server-side later unchanged)
- tests/profanity.test.js

Edited (full files, not diffs — replace at the same paths in your repo):
- src/hooks/useChat.js — profanity toggle wired in; also fixes a crew-membership mismatch
  (the local player's crew membership is stored as their faction key, not a player id —
  see the ReadMeAI.md entry for details)
- src/components/game/ChatPanel.jsx — 🛡 profanity-filter toggle button added to the header
- src/Game.jsx — chatOpen state + useChat() call wired in, passed down to GameView
- src/GameView.jsx — renders <ChatPanel>, passes chat props to GameBar
- src/components/game/GameBar.jsx — new "💬 Chat" button, leftmost in the bottom-right icon
  row (closest to the Wizard's Tomes button)
- ReadMeAI.md — new dated entry documenting this pass

Not changed from last time: shared/constants/chat.js, shared/utils/chatRules.js,
shared/utils/aiChatter.js, tests/chatRules.test.js (still correct, no edits needed).

`npm test` — 275 pass, 0 fail. `npm run build` — clean (576 modules, up from 570 —
confirms the new/edited files are actually in the bundle now).
