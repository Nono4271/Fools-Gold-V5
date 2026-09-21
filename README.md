# Crew UI polish round — what changed

Drop each file at the matching path in your repo (same filename, same folder):

| File in this zip | Goes to |
|---|---|
| `crew.js` | `shared/constants/crew.js` |
| `Emblem.jsx` | `src/components/game/crew/Emblem.jsx` |
| `CrewCreate.jsx` | `src/components/game/crew/CrewCreate.jsx` |
| `crewRules.test.js` | `tests/crewRules.test.js` |
| `ReadMeAI.md` | `ReadMeAI.md` (root) |

## Summary of changes since the last zip

1. **Emblems can now be recolored in two parts.** Icons used to be emoji,
   which can't be recolored — now they're 24 original hand-drawn icons
   (up from 12), and you pick a background color and an icon color
   separately. 12 of the 24 icons tie to a faction (dragon, cross,
   snowflake, moon, bat, orb, hammer, reaper, trident, etc.) so factions
   have a recognizable option; the rest are general-purpose.
   - `shared/constants/crew.js`: `EMBLEM_ICONS` expanded to 24 IDs;
     emblem shape is now `{shape, icon, color, iconColor}`.
   - `Emblem.jsx`: icons rendered as inline SVG instead of emoji;
     `EmblemPicker` now has separate background-color and icon-color rows.

2. **Create-crew page:** Abbreviation now comes before Name.

3. **Default crew privacy is now Open** (was Locked) — new crews are
   joinable instantly unless the founder changes it.

Tests (352/352) and the production build both pass with these changes.
Full details are logged in `ReadMeAI.md` under "session 17."

## Change from the last zip

Only `ReadMeAI.md` changed — added a TODO note under the emblem section
flagging that ChatGPT (which has image generation) could be used to make a
nicer real icon set for the 24 emblem icons later, since this session's
tools can't generate images. No code changed.
