# Chat: real scroll fix + unreachable picker buttons — what changed from the last zip

Edited (full files — replace at the same paths):
- src/main.tsx — root cause of "still not scrollable": a document-level touchstart
  handler (built for iOS pull-to-refresh blocking) prevents touch-scroll gestures
  everywhere except an allowlist of classes. Added "chat-scroll" to that allowlist.
- src/components/game/ChatPanel.jsx — tagged the channel list, message list, and
  DM/group picker list with "chat-scroll" (so the main.tsx fix actually applies to
  them) plus the missing `min-height: 0` on the picker list (same flex fix as last
  time). Also: DM/group picker's Cancel/Start buttons are now pinned in their own
  footer row below the scrollable player list, instead of living at the bottom of
  the same scrollable area where they could be unreachable — same pattern as the
  message compose bar.
- ReadMeAI.md — two new dated entries

Not changed from last time: everything else (shared/*, src/hooks/useChat.js,
src/Game.jsx, src/GameView.jsx, src/components/game/GameBar.jsx, tests/*).

`npm test` — 275 pass, 0 fail. `npm run build` — clean.

Note: CrewPanel.jsx (and possibly other panels) use the same bare ".scr" class
without a matching main.tsx allowlist entry, so they likely have the identical
touch-scroll bug on mobile. Flagged in ReadMeAI.md as a follow-up, not fixed here
since it's outside the chat system.
