# Crew screen fixes — landing polish + LOTR-style layout

Files changed:

- `src/components/game/crew/CrewLanding.jsx` — removed the stray CSS "table
  silhouette" rectangle that was rendering as a visible brown box behind the
  buttons; "Found a Crew" renamed to "Create a Crew". The background is
  still a CSS gradient scene, not a painted image — see note below.
- `src/components/game/crew/CrewCreate.jsx` — "Found Crew" button renamed
  to "Create Crew" to match.
- `src/components/game/crew/CrewHQ.jsx` — reworked the layout to match the
  LOTR: Rise to War reference: Members/Structures/Store/Help/Cooperation/
  Records now sit in a vertical icon rail on the right edge next to a wider
  table hero, instead of a horizontal pill-tab row underneath it. Diplomacy
  and Boosts stay as hotspots on the table itself (not duplicated in the
  rail), matching the reference.

## About the background image

I don't have an image-generation tool in this environment, so I can't
produce the actual painted "people gathering around a war table" art
myself — that's the same ChatGPT-art-queue pipeline the rest of the game's
art comes from (per ReadMeAI's "Approved graphics/map backlog" section).

Two ways to get the real image in:
1. Generate it yourself and attach it here — I'll drop it in as
   `public/crew/war-table-bg.jpg` and flip `CREW_BG_URL` in
   `CrewLanding.jsx` to use it.
2. Say the word and I'll build a richer hand-drawn SVG scene (silhouetted
   figures around a table, parchment, candlelight) instead of a flat
   gradient — not a photo, but no art-queue dependency.

Verified: full test suite (352/352) and production build both pass.
