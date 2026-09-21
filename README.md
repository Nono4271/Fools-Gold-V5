# CrewHQ table — real image + hotspots moved above it

Files:

- `public/crew/hq-table-bg.jpg` — your new image, saved here (served as
  `/crew/hq-table-bg.jpg`).
- `src/components/game/crew/CrewHQ.jsx` — the table area now shows this
  image as its background; Diplomacy, Boosts and the Target ("No tasks")
  hotspots moved to a row ABOVE the table instead of positioned on top of
  it. The rally-target editor panel now drops down from that row instead
  of sitting mid-table.

Drop `public/crew/hq-table-bg.jpg` into your repo at that exact path
alongside the updated `CrewHQ.jsx`.

Verified: full test suite (352/352) and production build both pass (image
confirmed copied into `dist/crew/`).
