# /shared — Server/Client Shared Game Logic

All files here are **pure JavaScript with zero browser dependencies**.
No `window`, no `document`, no DOM, no React.

They can be safely imported by:
- The browser client (`src/`)
- The Node.js game server (future)
- Web workers (`src/workers/`)

## Contents

### constants/
Pure data definitions. No side effects, no browser APIs.

| File | Contents |
|------|----------|
| `geometry.js` | Grid dimensions (COLS, ROWS, TW, TH), isometric coordinate math |
| `troops.js` | Troop types, XP table, CMD level cap |
| `terrain.js` | Terrain types and properties |
| `map.js` | Map constants, power levels, siege values |
| `buildings.js` | Building definitions, costs, capacities |
| `factions.js` | Faction definitions |
| `heroes.js` | Commander definitions, NPC generation |
| `skills.js` | Skill definitions and evaluation logic |
| `gear.js` | Gear definitions, rarity, stats, crafting |
| `regions.js` | World region data |

### utils/
Stateless pure functions. Input in → result out, no global state.

| File | Contents |
|------|----------|
| `battle.js` | Combat simulation (`simBattle`, `garrisonDefCmd`) |
| `pathfinding.js` | BFS pathfinding, adjacency, march speed |
| `gearStats.js` | Gear stat resolution for commanders |

## NOT in /shared (browser-only, stays in src/)
- `constants/device.js` — uses `window`, `navigator`
- `constants/css.js` — CSS string for browser injection
- `utils/mapGen.js` — currently client-only map generation
