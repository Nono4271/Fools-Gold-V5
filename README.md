# Fools Gold V5: Crew levels 28-50, Well, Contract Outpost, Sweep fix (2026-09-22)

Copy these files into your project at the same paths; they replace the existing files. Three files are new: `shared/constants/allTroops.js`, `shared/utils/crewStructures.js` and `src/components/game/popup/CrewStructurePanel.jsx`. `ReadMeAI.md` replaces your changelog.

## Changes since the last zip (crew-rewards)

**1. Crew levels 28-50 are wired in.** Every level from 2 to 50 now has at least one real perk.
- Healer I/II: -5% / -10% recovery time
- Woodworking, Stone Masonry, Gas Collector and Food Farmer IV: +1250/hr each
- Scholars I/II: +5% / +10% training XP
- Gatherers I/II: +5% / +10% gathering
- Faster Together II: +7.5% march speed
- Treasure Trove II: +2000/hr of all four resources
- Spawn Sweeper: +10% damage vs Spawns
- PvE: +10% damage vs PvE tiles
- Efficient Trainer: -5% training time
- Cost Effective: -10% training cost

Tiers of the same perk add together.

**2. Well (crew level 31, a 2nd at level 40).**
- Only the founder can build it, on an unclaimed p10+ tile.
- Any crew member can **Station** an idle commander there from anywhere (no range limit), then **Gather**.
- Gathering at a Well gives all 4 resources, each at the p11 tile rate.

**3. Contract Outpost (crew level 35).**
- Only the founder can build it, on a p10+ tile, one per crew.
- The founder picks 1 neutral unit (2 at level 50). Ancients can't be picked.
- The whole crew can then train that unit, up to **100 training commands per player per day**.
- Contract Board II (level 42): -10% training time for units trained through the Outpost.

**4. Neutral and Ancient units can now be trained.**
- If you own a camp, you can train that camp's unit with no daily limit.
- Trained units appear in HQ → Training and in army slots, and fight like any other troop.

**5. Sweep (Spawns) is fixed.** Sweeping a Spawn now runs a real battle: troop losses, wounded, XP, orbs and resources all apply. Before, it only spent stamina.

## Numbers I had to pick (easy to change in `shared/constants/crew.js`)

- Well and Outpost build cost and time are the same as a Fortress: 3h, 150k wood, 250k stone and 175k gas.
- Neutral training cost and time use the existing troop formula, priced by the unit's own tier (T1/T2/T3). Ancients use the capstone price.
- The daily limit resets at local midnight.

## Files

- **shared/constants:** `crew.js`, `neutralTroops.js`, `troops.js`, `allTroops.js` (new)
- **shared/utils:** `crewStructures.js` (new), `armyEconomy.js`, `battle.js`, `tactics.js`, `training.js`, `pathfinding.js`, `troopSlots.js`
- **src:** `Game.jsx`, `GameView.jsx`
- **src/hooks:** `useTactics.js` (Sweep fix), `useTacticTicks.js`, `useMarch.js`, `useFortressSiege.js`
- **src/components/game:** `TilePopup.jsx`, `HQMenu.jsx`, `CommanderPicker.jsx`, `BottomPanel.jsx`, `BattleLog.jsx`
- **src/components/game/popup:** `CommanderCard.jsx`, `CrewStructurePanel.jsx` (new)
- **tests:** `crewStructures.test.js` (new), `crewLevelPerks.test.js`
- `ReadMeAI.md`

## Checked

- `npm test`: 402/402 tests pass.
- `npm run build`: succeeds.
- The new Well/Outpost panel was rendered in every state (build buttons, under construction, built, the Outpost screen, another crew's Well, crew level too low) without errors.
- **Not yet played in a live browser.** Worth building a Well and an Outpost with a crew set to level 50 to check the feel.
- Wells and Outposts don't have a map icon yet (Fortresses don't either). They only show in the tile popup.
