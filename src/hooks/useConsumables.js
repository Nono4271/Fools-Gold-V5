import { useCallback } from "react";
import { CONSUMABLE_DEFS } from "../../shared/constants/consumables.js";
import { HQP } from "../../shared/constants/map.js";
import { consumeOne, speedUpBuildings, speedUpRecall, expediteBuilding, extendRssBoost } from "../../shared/utils/consumables.js";

// Bag item use + Expedience tactic. Rules live in shared/utils/consumables.js.
// Locked decision: training and forts cannot be sped up; building, healing
// and recall have their own speedup types, and universal speedups also
// apply to all three.
export function useConsumables({ setConsumables, setUpgQueue, setRssSpeedUps, setCmds, healQueue, dispatchArmy, floaty, playerHqRef }) {
  const onExpedience = useCallback((buildingType) => {
    setUpgQueue(q => expediteBuilding(q, buildingType, Date.now()));
  }, [setUpgQueue]);

  const useConsumable = useCallback((typeId) => {
    const def = CONSUMABLE_DEFS[typeId];
    if (!def) return;
    const at = playerHqRef.current ?? `${HQP.player.c},${HQP.player.r}`;
    const now = Date.now();

    if (def.applies === "relocation") {
      // Relocation tokens are spent from the HQ relocation flow itself (tap a
      // valid pad tile, then "RELOCATE HQ HERE") — there's no target tile
      // picked yet from the Bag, so just point the player there.
      floaty("🧭 Tap a valid relocation pad, then RELOCATE HQ HERE to use this token", "#a855f7", at);
      return;
    }

    setConsumables(prev => consumeOne(prev, typeId));

    if (def.applies === "universal" || def.applies === "building") {
      setUpgQueue(q => speedUpBuildings(q, def.durationMs, now));
    }
    if (def.applies === "universal" || def.applies === "healing") {
      if (healQueue[0]) dispatchArmy({ type: "healSpeedup", id: healQueue[0].id, duration: def.durationMs });
      floaty(`💉 ${def.label} applied!`, "#88aaff", at);
    }
    if (def.applies === "universal" || def.applies === "recall") {
      setCmds(prev => speedUpRecall(prev, def.durationMs));
      floaty(`🏳 ${def.label} applied to marching recalls!`, "#88aaff", at);
    }
    if (def.applies === "rss") {
      setRssSpeedUps(prev => extendRssBoost(prev, def.rssType, def.durationMs, now));
      floaty(`${def.icon} ${def.label} active for ${def.durationLabel}!`, "#80b040", at);
    }
    if (def.applies === "medallion") {
      // GachaScreen reads the medallion count and performs the pull.
      floaty("🥇 Medallion used!", "#f0c040", at);
    }
    if (def.applies === "building" || def.applies === "universal") {
      floaty(`🔨 ${def.label} applied!`, "#c8a060", at);
    }
  }, [setConsumables, setUpgQueue, setRssSpeedUps, setCmds, healQueue, dispatchArmy, floaty, playerHqRef]);

  return { onExpedience, useConsumable };
}
