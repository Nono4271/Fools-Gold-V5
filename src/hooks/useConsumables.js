import { useCallback } from "react";
import { CONSUMABLE_DEFS } from "../../shared/constants/consumables.js";
import { HQP } from "../../shared/constants/map.js";
import { consumeOne, restoreOne, speedUpBuildings, expediteBuilding, extendRssBoost } from "../../shared/utils/consumables.js";

// Bag item use + Expedience tactic. Rules live in shared/utils/consumables.js.
export function useConsumables({ setConsumables, setUpgQueue, setRssSpeedUps, healQueue, dispatchArmy, floaty, playerHqRef }) {
  const onExpedience = useCallback((buildingType) => {
    setUpgQueue(q => expediteBuilding(q, buildingType, Date.now()));
  }, [setUpgQueue]);

  const useConsumable = useCallback((typeId) => {
    const def = CONSUMABLE_DEFS[typeId];
    if (!def) return;
    const at = playerHqRef.current ?? `${HQP.player.c},${HQP.player.r}`;
    const now = Date.now();

    setConsumables(prev => consumeOne(prev, typeId));

    if (def.applies === "universal" || def.applies === "building") {
      setUpgQueue(q => speedUpBuildings(q, def.durationMs, now));
    }
    if (def.applies === "universal" || def.applies === "healing") {
      if (healQueue[0]) dispatchArmy({ type: "healSpeedup", id: healQueue[0].id, duration: def.durationMs });
      floaty(`💉 ${def.label} applied!`, "#88aaff", at);
    }
    if (def.applies === "rss") {
      setRssSpeedUps(prev => extendRssBoost(prev, def.rssType, def.durationMs, now));
      floaty(`${def.icon} ${def.label} active for ${def.durationLabel}!`, "#80b040", at);
    }
    if (def.applies === "medallion") {
      // GachaScreen reads the medallion count and performs the pull.
      floaty("🥇 Medallion used!", "#f0c040", at);
    }
    if (def.applies === "relocation") {
      floaty("🧭 Relocation coming soon!", "#a855f7", at);
      setConsumables(prev => restoreOne(prev, typeId, now)); // not actually used
    }
    if (def.applies === "building" || def.applies === "universal") {
      floaty(`🔨 ${def.label} applied!`, "#c8a060", at);
    }
  }, [setConsumables, setUpgQueue, setRssSpeedUps, healQueue, dispatchArmy, floaty, playerHqRef]);

  return { onExpedience, useConsumable };
}
