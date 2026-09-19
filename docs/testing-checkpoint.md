# Core fixes checkpoint — 2026-09-19

Local branch: codex/core-fixes-20260919. No merge, remote branch update, or deployment.

## Changes

- Repair battle initialization and confusion crashes without changing class unlocks.
- Correct gas/food income and reread tile ownership, forts, and bonuses each minute.
- Share training prices/times between the menu and payment. Use troop size, not tier, for command size. Charge no stone.
- Deliver complete commands on deadlines. Preserve finished troops if barracks are full.
- Reserve wounded troops when healing starts; return them to their original troop pools. Manual healing is default, with an automatic toggle using the same food price.
- Credit healing speedup time instead of deleting wounded troops. Training queues are unaffected by healing speedups.
- Repair missing menu/import variables and duplicate troop removal when scrapping.

## Verification

98 automated tests: 72 roster battle cases, ordinary/confusion battles, spawn import, resource income, training/healing conservation and payments, plus two menu render checks. Production build and configured TypeScript check pass. The TypeScript configuration does not check the JavaScript game files.

Browser playtesting remains blocked by an earlier browser access denial. Menu rendering tests do not verify clicks, phone layout, or live Cloudflare behavior.

## Still open

- Offline/save/cross-device persistence and server authority are not implemented by this change. Training/healing deadlines catch delayed ticks only while session state exists.
- Full battle balance and multi-stage army/slot state still need testing. Wounded allocation follows existing proportional slot-loss behavior, not a new battle casualty design.
- Universal speedup targeting/consumption, construction/recall items, relocation, fort restrictions, and tile-deletion/protection remain separate work.
- Existing healing price (0.2 food per troop, rounded up) and rate are preserved; this is not a new healing balance proposal.
- The full roadmap, T4/neutral roster, Chapters, Crew, chat, and mobile polish remain unfinished.

See training-values.md for all 72 training quotes before bonuses.
