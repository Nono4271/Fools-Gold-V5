# Fools Gold V5 — HUD / Skills / Faction Bonuses fix bundle (2026-09-22)

Drop these files into your project at the same paths (they overwrite the
matching files). `ReadMeAI.md` replaces your root changelog.

## What changed and why

**1. HUD resource-rate display was fake.**
`HUD.jsx` showed a hardcoded 200/200/200/2400 per-hour rate no matter what
you actually owned. It now computes the real rate from your tiles,
buildings and bonuses (new `hourlyRssRate()` in `resourceIncome.js`).

**2. Four "Coming Soon" skill passives (Orc March, Supply Specialist x2,
Scurrier) actually work now.** These are PvE (non-combat) skills, not
battle stubs — per your note, not every skill needs to deal damage. Orc
March / Scurrier now genuinely reduce march time; Supply Specialist now
genuinely boosts resources gained while gathering. Points spent on them are
no longer wasted.

**3. All 8 faction bonuses are wired in and shown on the Faction screen.**
Your 8 bonuses were randomly assigned one-per-faction and are now live:

| Faction | Bonus |
|---|---|
| Pirates | -10% Training Time |
| Nightcreatures | -10% Training Cost |
| Ashen Dead | +10% March Speed |
| Dragons | +10% Resources from Gathering |
| Holyknights | +5% Resource Production (owned tiles) |
| Wizards | +5% Damage in PvE Battles |
| Orcs | +5 Max Dragon Eggs |
| Coldborns | -10% Healing Time |

`FactionScreen.jsx`'s "Faction Bonus" box no longer says "Placeholder" —
it shows each faction's real bonus text.

## Files in this zip

- `ReadMeAI.md` — full changelog, updated roadmap and audit notes
- `shared/constants/factionBonuses.js` — **new**, the 8 bonuses + assignment
- `shared/utils/resourceIncome.js` — real HUD rate + Holyknights tile bonus
- `shared/utils/battle.js` — Wizards' PvE damage bonus
- `shared/utils/training.js` — Pirates' training-time / Nightcreatures'
  training-cost bonuses
- `shared/utils/armyEconomy.js` — Coldborns' healing-speed bonus
- `shared/utils/tactics.js` — gathering-bonus wiring
- `shared/constants/skills.js` — passive-skill aggregation (march/gather)
- `shared/constants/orcs_skills.js`, `nightcreatures_skills.js` — un-stubbed
  the 4 PvE passives
- `src/hooks/useMarch.js` — march-speed skill + faction bonus
- `src/hooks/useTacticTicks.js` — gathering-yield skill + faction bonus
- `src/hooks/useResources.js` — Holyknights tile-yield bonus feed
- `src/hooks/useTraining.js` — heal-speed bonus feed
- `src/components/game/HQMenu.jsx` — training/heal screens show real numbers
- `src/components/game/HUD.jsx` — real resource-rate display
- `src/components/screens/FactionScreen.jsx` — real bonus text, no more
  "Placeholder"
- `src/components/screens/CommanderScreen.jsx` — dropped the ⏳ "not
  implemented" gate on the 4 PvE skills (kept the UI infra for future use)
- `src/GameView.jsx`, `src/Game.jsx` — plumbing: pass all the new bonus
  values down to the components above

## Not run in this sandbox

No `node_modules` here, so `npm test`/`npm run build` weren't run — every
file above was syntax-checked individually with `esbuild` and compiles
clean. Run your normal build/test before merging, and it's worth a quick
playtest per faction to confirm the bonus values feel right.
