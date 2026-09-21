# Crew screens: scroll fix + Diplomacy info icon

## Scroll fix (Diplomacy list + crew creation screen)
Same bug as the earlier chat touch-scroll fix: `src/main.tsx` blocks touch-
drag scrolling everywhere except a small class allowlist. The Crew screens'
scrollable regions used a bare `.scr` class, not on that list, so touch
scrolling was blocked (mouse wheel still worked, which is why it wasn't
caught before). Fixed by adding a `"crew-scroll"` class to the allowlist
and tagging the 4 scrollable containers with it:
- `src/main.tsx` — new allowlist entry.
- `src/components/game/crew/CrewHQ.jsx` — left identity column + main
  tab/table content area (where the Diplomacy list renders).
- `src/components/game/crew/CrewScreen.jsx` — Browse + Create ("guild
  creation") views; also added a missing `minHeight: 0` so those panes
  actually clip/scroll instead of growing to fit all content.

## Diplomacy flavor text → info icon
`src/components/game/crew/CrewDiplomacy.jsx` — added a small "Diplomacy"
header with a round "i" button; the "cosmetic only, one-way..." note now
only shows when toggled on, instead of always sitting at the top of the list.

## Verified
Full test suite: 361/361 pass. `npm run build` clean. Touch-scroll itself
needs an on-device check — the pure-function test suite can't assert that.
