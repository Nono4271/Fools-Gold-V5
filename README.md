# Crew landing background — real image wired in

Files:

- `public/crew/war-table-bg.jpg` — your image, saved here (this is a
  static asset folder, served as-is at `/crew/war-table-bg.jpg`).
- `src/components/game/crew/CrewLanding.jsx` — `CREW_BG_URL` now points at
  it; added a soft dark radial panel behind the title/text/buttons so
  they stay legible against the busy scene (the image itself is untouched,
  this is just an overlay in front of it).

Drop `public/crew/war-table-bg.jpg` into your repo at that exact path
alongside the updated `CrewLanding.jsx` and it'll show immediately — no
other wiring needed.

Verified: full test suite (352/352) and production build both pass (the
image gets copied into `dist/crew/` by the build, confirmed).
