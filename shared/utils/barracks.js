// Barracks space is counted in commands, not raw troops.
// One command = CMD_SIZE[size] troops (small 100 / medium 50 / large 4), the
// same unit a commander's command cap uses.
import { FACTION_TROOPS } from "../constants/troops.js";
import { ANCIENT_FACTIONS } from "../constants/ancientTroops.js";
import { NEUTRAL_FACTIONS } from "../constants/neutralTroops.js";
import { CMD_SIZE } from "../constants/buildings.js";

// "faction:branch:tier" -> "small" | "medium" | "large" (unknown -> small)
export function branchKeySize(key) {
  const [f, b] = String(key || "").split(":");
  const fd = FACTION_TROOPS[f] || ANCIENT_FACTIONS[f] || NEUTRAL_FACTIONS[f];
  return fd?.branches?.find(x => x.key === b)?.size ?? "small";
}
export const troopsPerCommand = key => CMD_SIZE[branchKeySize(key)] ?? CMD_SIZE.small;
export const commandsFor = (key, troops) => (troops || 0) / troopsPerCommand(key);
export const poolCommands = counts =>
  Object.entries(counts || {}).reduce((s, [k, n]) => s + commandsFor(k, n), 0);
// Troops still queued in training also reserve barracks space.
export const queuedCommands = queues =>
  (queues || []).reduce((s, q) => s + (q.remaining || 0) / (q.commandSize || CMD_SIZE.small), 0);
// Whole troops of `key` that fit in `freeCommands` of space.
export const troopsThatFit = (key, freeCommands) =>
  Math.max(0, Math.floor(Math.max(0, freeCommands) * troopsPerCommand(key) + 1e-9));
