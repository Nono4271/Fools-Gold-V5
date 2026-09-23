// Who defends a contested tile, and in what order (owner spec 2026-09-22).
// Pure — used by src/hooks/useFortressSiege.js (crew Fortress / Well /
// Contract Outpost) and src/hooks/useMarch.js (keeps and ordinary tiles), and
// ready for an authoritative server to call unchanged.
//
// Fight order for an attack on any tile:
//   1. STANDING commanders — anyone hostile who has MOVED onto the tile (any
//      tile, including a keep or crew structure) but is not stationed there.
//      Newest arrival first (same rule the draw-rematch loop already used).
//   2. STATIONED commanders — only structures that allow stationing
//      (Fortress, Well). Deterministic order.
//   3. STRUCTURE DEFENDERS — keeps only (their NPC garrison waves).
//   4. SIEGE — only once everything above is cleared. Siege to 0 destroys a
//      crew structure; the tile reverts to a plain tile owned by whoever
//      landed the last hit.
export const STRUCTURE_RULES = {
  fortress: { stationing: true,  garrison: false },
  well:     { stationing: true,  garrison: false },
  outpost:  { stationing: false, garrison: false },
  keep:     { stationing: false, garrison: true  },
};

export function cmdTroopCount(cmd) {
  if (cmd?.troopSlots?.length) return cmd.troopSlots.reduce((n, sl) => n + (sl.troops || 0), 0);
  return cmd?.troops || 0;
}

// Is `cmd` stationed IN this structure (as opposed to just standing on its tile)?
export function isStationedIn(kind, structure, cmd) {
  if (!structure || !cmd) return false;
  if (kind === "fortress") return Object.values(structure.stationedByPlayer || {}).some(list => (list || []).includes(cmd.uid));
  if (kind === "well") return cmd.stationedWellId === structure.id;
  return false;
}

// Ordered fight queue: [{ phase: "standing" | "stationed", uid, playerId? }].
//   kind:      "fortress" | "well" | "outpost" | "keep" | null (plain tile)
//   isHostile: (cmd) => bool — true for commanders that defend against THIS attacker.
// Only commanders with troops count. Keep garrison waves / siege are phases
// 3-4 and handled by the caller (they aren't commanders).
export function structureDefenderQueue({ kind = null, tileKey, cmds = [], structure = null, isHostile = () => true }) {
  const rules = STRUCTURE_RULES[kind] || { stationing: false };
  const alive = c => c && cmdTroopCount(c) > 0;

  const standing = cmds
    .filter(c => alive(c) && c.tk === tileKey && !c.march && isHostile(c) && !isStationedIn(kind, structure, c))
    .sort((a, b) => (b.arrivedAt ?? 0) - (a.arrivedAt ?? 0))
    .map(c => ({ phase: "standing", uid: c.uid }));

  const stationed = [];
  if (rules.stationing && structure) {
    if (kind === "fortress") {
      const byPlayer = structure.stationedByPlayer || {};
      for (const playerId of Object.keys(byPlayer).sort()) {
        for (const uid of byPlayer[playerId] || []) {
          const c = cmds.find(x => x.uid === uid);
          if (alive(c) && !c.march) stationed.push({ phase: "stationed", uid, playerId });
        }
      }
    } else if (kind === "well") {
      cmds.filter(c => alive(c) && c.stationedWellId === structure.id && c.tk === tileKey && !c.march)
        .sort((a, b) => String(a.uid).localeCompare(String(b.uid)))
        .forEach(c => stationed.push({ phase: "stationed", uid: c.uid, playerId: c.ownerPlayerId || c.owner }));
    }
  }
  return [...standing, ...stationed];
}
