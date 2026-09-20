import { useEffect, useRef } from "react";
import { applyXp } from "./useMarch.js";
import { regenEggs, regenStamina, gatherTick, trainingTick, EGG_REGEN_MS, STAMINA_REGEN_MS } from "../../shared/utils/tactics.js";

// Timed ticks: dragon-egg regen, training/gather orders, stamina regen.
// Rules live in shared/utils/tactics.js.
// Note: gather/training-order ticks already catch up on their own (they
// compare against gatherStartMs/trainingStartMs, not a fixed per-call
// amount), so those two loops below are unchanged. Egg and stamina regen
// used to add a fixed amount per interval firing, so a backgrounded tab
// silently lost that regen — both now use real elapsed time and also
// catch up immediately when the tab regains focus.
export function useTacticTicks({
  screen, dragonEggsCap, setDragonEggs, setCmds, setPlayerCmds, setRss,
  tilesMapRef, trainingXpMult, staminaMaxRef, floaty,
}) {
  const dragonEggsCapRef = useRef(dragonEggsCap);
  useEffect(() => { dragonEggsCapRef.current = dragonEggsCap; }, [dragonEggsCap]);

  // Dragon eggs refill the full cap over 24h.
  const eggLastTickRef = useRef(Date.now());
  useEffect(() => {
    if (screen !== "game") return;
    eggLastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const elapsed = now - eggLastTickRef.current;
      eggLastTickRef.current = now;
      setDragonEggs(e => regenEggs(e, dragonEggsCapRef.current, elapsed));
    };
    const id = setInterval(tick, EGG_REGEN_MS);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Training order: 2 eggs + XP per 10 min.
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      setCmds(prev => prev.map(cmd => {
        const tilePl = tilesMapRef.current?.[cmd.gatherTileKey]?.powerLevel ?? 1;
        const r = trainingTick(cmd, tilePl, trainingXpMult, Date.now());
        if (!r) return cmd;
        setDragonEggs(e => Math.max(0, e - r.eggs));
        // applyXp handles level-ups, stat growth, skill points
        const xpResult = applyXp(cmd, r.xp, (msg, color, tk) => floaty(msg, color, tk));
        return { ...cmd, ...xpResult, ...r.patch };
      }));
    }, 10_000);
    return () => clearInterval(id);
  }, [screen, setCmds, setDragonEggs, trainingXpMult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gather order: 1 egg + 4x tile income per 10 min.
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      setCmds(prev => prev.map(cmd => {
        const r = gatherTick(cmd, tilesMapRef.current?.[cmd.gatherTileKey], Date.now());
        if (!r) return cmd;
        if (r.stop) return { ...cmd, gathering: false };
        if (r.rss) setRss(p => ({ ...p, [r.rss]: p[r.rss] + r.amount }));
        setDragonEggs(e => Math.max(0, e - r.eggs));
        return { ...cmd, ...r.patch };
      }));
    }, 10_000);
    return () => clearInterval(id);
  }, [screen, setCmds, setRss, setDragonEggs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stamina: +1 every 3 min up to the current max.
  const staminaLastTickRef = useRef(Date.now());
  useEffect(() => {
    if (screen !== "game") return;
    staminaLastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const elapsed = now - staminaLastTickRef.current;
      staminaLastTickRef.current = now;
      setPlayerCmds(prev => prev.map(c => regenStamina(c, staminaMaxRef.current, elapsed)));
    };
    const id = setInterval(tick, STAMINA_REGEN_MS);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps
}
