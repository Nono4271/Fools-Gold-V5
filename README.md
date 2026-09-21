# CrewHQ table fix

Unzip and merge this into your repo root — folders match your project
structure.

## Change from the last zip
Only `CrewHQ.jsx` moved again — the Diplomacy/Boosts/Tasks hotspots are
now down on the table surface (near the map/pieces) instead of pinned
along the top edge, matching the marked-up screenshot.

## Full change list for this file
1. Table image fills the whole pane edge-to-edge (no more black gaps).
2. Diplomacy/Boosts/Tasks sit on the table surface, staggered.
3. "No tasks" renamed to "Tasks".

Tests (352/352) and the production build both pass.
