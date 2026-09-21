# Fix: crash on AI typing indicator

`ChatPanel.jsx`'s typing-indicator line was rendering the raw
`typingByChannel[msgChannelId]` object (`{ name, until }`) instead of its
`.name` field, which React refuses to render directly as a child ("Objects
are not valid as a React child" / minified error #31). This crashed the
chat panel as soon as any AI player started "typing".

Fixed by rendering `typingByChannel[msgChannelId].name` instead of the
whole object. One-line change in `src/components/game/ChatPanel.jsx`.

Verified: full test suite (npm test, 304/304) passes.
