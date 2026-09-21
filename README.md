# CrewHQ table fix — what changed

Drop each file at the matching path in your repo (same filename, same folder):

| File in this zip | Goes to |
|---|---|
| `CrewHQ.jsx` | `src/components/game/crew/CrewHQ.jsx` |
| `ReadMeAI.md` | `ReadMeAI.md` (root) |

## Change from the last zip

Only `CrewHQ.jsx` and `ReadMeAI.md` changed (nothing from the emblem/privacy
zip is touched again here).

1. **Table image now fills the whole pane.** It was shrinking to a fixed
   height and leaving black gaps above/below because it sat in a flex box
   inside a scrolling container (flex-grow doesn't work there). It's now
   `position: absolute; inset: 0` so it always fills edge-to-edge.
2. **Diplomacy/Boosts/Tasks now float directly on the table image**, near
   the top edge, each at a slightly different height — staggered like
   pieces on a map, not lined up in one straight row.
3. **"No tasks" renamed to "Tasks"** (still shows the actual target label
   once one is pinned).

Tests (352/352) and the production build both pass.
