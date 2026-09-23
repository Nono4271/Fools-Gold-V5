import { useEffect } from "react";
import { barracksCapacity } from "../../shared/constants/buildings.js";

export function useUpgrades({ screen, setUpgQueue, setBldgs, setBarracks, setQuarterLevels }) {
useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
const now = Date.now();
setUpgQueue(q => {
const done = Object.entries(q).filter(([, v]) => v.endsAt <= now);
if (!done.length) return q;
done.forEach(([type, { newLvl }]) => {
// Quarter upgrades ("q_<faction>") land in quarterLevels; branch upgrades ("b_<faction>_<branch>")
// are bldgs keys like any building (unlockedBranches follows bldgs).
if (type.startsWith("q_")) { if (setQuarterLevels) setQuarterLevels(p => ({ ...p, [type.slice(2)]: Math.max(p[type.slice(2)] || 0, newLvl) })); return; }
setBldgs(p => {
const next = { ...p, [type]: newLvl };
if (type === "barracks") setBarracks(pool => Math.min(pool, barracksCapacity(newLvl)));
return next;
});
});
return Object.fromEntries(Object.entries(q).filter(([, v]) => v.endsAt > now));
});
}, 500);
return () => clearInterval(id);
}, [screen, setUpgQueue, setBldgs, setBarracks, setQuarterLevels]);
}
