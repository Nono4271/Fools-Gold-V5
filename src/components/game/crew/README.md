# CrewHQ layout rework — matches the reference screenshot's arrangement

File changed: `src/components/game/crew/CrewHQ.jsx` (full rewrite of the
layout, same functionality/props).

- **Left column (fixed width):** emblem, crew tag/name, level+XP bar, crew
  size/founder/language, and the editable announcement panel, with
  Leave/Disband pinned to the bottom.
- **Bottom row:** Members, Structures, Store, Help, Cooperation, Records —
  clicking one swaps the table view for that tab's content, with a "←
  Back to table" link to return.
- **Middle-right of the table:** Diplomacy, Boosts, and the Target ("No
  tasks") hotspots, stacked vertically where the reference has them.

Only this one file changed — everything else (data model, handlers,
Structures/Store/Help functionality) is untouched.

Verified: full test suite (352/352) and production build both pass.
