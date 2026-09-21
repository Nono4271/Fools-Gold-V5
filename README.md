# CrewHQ hotspot colors + image load time

Unzip and merge into your repo root — folders match your project structure.

## Change from the last zip
- `CrewHQ.jsx`: hotspots are now round gold "wax seal" badges with
  single-color gold icons (dove/flask/target) instead of green boxes with
  full-color emoji — no more clash against the photo.
- `public/crew/war-table-bg.jpg` and `hq-table-bg.jpg`: both re-exported
  smaller — 1672px/~380KB down to 1100px/~112KB each — to cut load time
  roughly 3x. `CrewHQ.jsx` also shows a dark gradient under the image so
  the pane looks like it's loading, not broken, while the JPG streams in.
- If it's still slow after this, that remaining time is almost certainly
  your network/streaming setup rather than the code — full explanation in
  `ReadMeAI.md` under "session 18, follow-up 2."

Tests (352/352) and the production build both pass.
