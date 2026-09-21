# CrewHQ spacing pass

File changed: `src/components/game/crew/CrewHQ.jsx`

- Left column: bigger gaps between emblem/name, level bar, stats and the
  announcement panel, so the column reads as spaced-out content instead of
  everything crammed at the top with one big gap before Disband.
- Bottom icon row: right-aligned instead of centered, so Help now sits in
  the bottom-right corner.
- Table hotspots: Diplomacy, Boosts and the Target ("No tasks") widget are
  now each positioned independently, spread across different areas of the
  table (top-center, mid-left, lower-right) instead of stacked tightly
  together on one edge.

Verified: full test suite (352/352) and production build both pass.
