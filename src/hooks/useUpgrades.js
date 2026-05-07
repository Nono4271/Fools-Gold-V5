import { useEffect } from "react";
import { barracksCapacity } from "../../shared/constants/buildings.js";

export function useUpgrades({ screen, setUpgQueue, setBldgs, setBarracks }) {
useEffect(() => {
if (screen !== "game") return;
const id = setInterval(() => {
const now = Date.now();
setUpgQueue(q => {
const done = Object.entries(q).filter(([, v]) => v.endsAt <= now);
if (!done.length) return q;
done.forEach(([type, { newLvl }]) => {
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
}, [screen, setUpgQueue, setBldgs, setBarracks]);
}
