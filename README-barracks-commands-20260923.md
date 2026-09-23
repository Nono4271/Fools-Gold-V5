# Barracks space in commands (2026-09-23)

- Barracks capacity is now measured in **commands**: 30 at Lv1 (and Lv0), 1000 at Lv20
  (`barracksCommandCapacity` in `shared/constants/buildings.js`, geometric curve between the two).
- One command = `CMD_SIZE[size]` troops: small 100, medium 50, large 4 (same unit as a commander's command cap).
  Used space = sum over troop pools of `troops / CMD_SIZE[size]`, plus troops still queued in training
  (`shared/utils/barracks.js`).
- Enforced in `armyEconomy` (training start, training delivery, healing delivery) and reinforcement returns
  (`returnToBarracksCmds`). The old troop-count `barracksCapacity()` remains only for the AI's single-number
  pool (assumes small units, 100 per command). `STARTING_TROOPS` (2000) replaces `barracksCapacity(0)` as the
  starting pool.
- `barracksCommandPool()` was display-only and has been removed.
- Sliders step one command at a time (100 / 50 / 4): training, army slot editor, and the map popup's remove slider.
- Training screens: units you own are listed first; overview cards open the train screen preselected.
