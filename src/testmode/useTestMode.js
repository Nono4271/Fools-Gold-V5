// TEST MODE — the test campaign: admin actions, unlimited currencies, and
// local saves. Game.jsx calls this once and passes `admin` down; when
// testMode is false it does nothing and `admin` is null.
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { HDEFS } from "../../shared/constants/heroes.js";
import { POWER_DEFS } from "../../shared/constants/map.js";
import { crewMemberCapForLevel, CREW_MAX_LEVEL } from "../../shared/constants/crew.js";
import { clearHQCache } from "../MapRenderer";
import {
  TEST_TOPUP, missingCommanders, adminSetLevel, adminSetRespect,
  finishMarchPatch, finishTrainingQueue, finishHealQueue, adminRelocationCheck,
} from "./adminRules.js";
import { SAVE_VERSION, PENDING_LOAD_KEY, writeSave, readSave, listSaves, toPlain, fromPlain, tilesToSave } from "./saveStore.js";

const ARMY_KEYS = ["rss", "troopCounts", "woundedByBranch", "trainingQueues", "healQueue", "autoHeal", "contractDaily"];
const AUTOSAVE_MS = 60_000;

export function useTestMode(g) {
  const [testMode, setTestMode] = useState(false);
  const [noAdjacency, setNoAdjacency] = useState(true);
  const [lastSaveAt, setLastSaveAt] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const latest = useRef(g); latest.current = g;
  const pendingSnapRef = useRef(null);
  const grantedRef = useRef(false);
  const active = testMode && g.screen === "game" && g.mapReady;

  // Leaving to the title ends test mode (the menu turns it back on).
  useEffect(() => {
    if (g.screen === "title") { setTestMode(false); grantedRef.current = false; }
  }, [g.screen]);

  // ── Load after a page reload (loading always reloads for a clean state) ──
  useEffect(() => {
    let slot = null;
    try { slot = sessionStorage.getItem(PENDING_LOAD_KEY); sessionStorage.removeItem(PENDING_LOAD_KEY); } catch { /* private mode */ }
    if (!slot) return;
    readSave(slot).then(snap => {
      if (!snap || snap.meta?.version !== SAVE_VERSION) return;
      const s = latest.current;
      pendingSnapRef.current = snap;
      grantedRef.current = true;
      s.mapSeedRef.current = snap.meta.seed;
      s.setFacKey(snap.meta.facKey);
      s.setFacName(snap.meta.facName);
      setTestMode(true);
      s.setScreen("game");
    }).catch(err => console.warn("[TEST] load failed", err));
  }, []);

  // ── Snapshot ──
  const buildSnapshot = useCallback(() => {
    const s = latest.current;
    return {
      meta: {
        version: SAVE_VERSION, savedAt: Date.now(), seed: s.mapSeedRef.current,
        facKey: s.facKey, facName: s.facName,
        commanders: s.cmdsRef.current.filter(c => c.owner === "player").length,
        tiles: 0,
      },
      tiles: tilesToSave(s.tilesMapRef.current),
      cmds: toPlain(s.cmdsRef.current),
      playerHqKey: s.playerHqKey,
      refs: toPlain({
        aiHqKeys: s.aiHqKeysRef.current, aiRssMap: s.aiRssMapRef.current, aiBldgsMap: s.aiBldgsMapRef.current,
        aiPoolMap: s.aiPoolMapRef.current, aiTileKeysMap: s.aiTileKeysMapRef.current,
        aiPlayerIdMap: s.aiPlayerIdMapRef.current, spawnedAiHqs: s.spawnedAiHqsRef.current,
        aiGems: s.aiGemsRef.current, aiFounders: s.aiFoundersRef.current,
      }),
      army: toPlain(Object.fromEntries(ARMY_KEYS.map(k => [k, s.army[k]]))),
      forts: toPlain(s.forts),
      persist: toPlain(Object.fromEntries(Object.entries(s.persist).map(([k, [v]]) => [k, k === "battles" || k === "bLog" ? (v || []).slice(-50) : v]))),
    };
  }, []);

  const saveTo = useCallback(async (slot) => {
    try {
      const snap = buildSnapshot();
      snap.meta.tiles = Object.values(snap.tiles).filter(t => t.owner === "player").length;
      await writeSave(slot, snap);
      setLastSaveAt(Date.now());
      setSaveMsg(`Saved to ${slot === "autosave" ? "Autosave" : slot.replace("slot", "Slot ")}`);
      return { ok: true };
    } catch (err) {
      console.warn("[TEST] save failed", err);
      setSaveMsg(`Save failed: ${err?.message || err}`);
      return { ok: false };
    }
  }, [buildSnapshot]);

  const loadFrom = useCallback((slot) => {
    try { sessionStorage.setItem(PENDING_LOAD_KEY, slot); } catch { /* ignore */ }
    window.location.reload();
  }, []);

  // ── Apply a loaded snapshot once the (same-seed) world is generated ──
  useEffect(() => {
    if (!g.mapReady || !pendingSnapRef.current) return;
    const snap = pendingSnapRef.current;
    pendingSnapRef.current = null;
    const s = latest.current;
    const map = s.tilesMapRef.current;
    const pKeys = new Set(), defeated = {};
    let power = 0;
    for (const [key, saved] of Object.entries(snap.tiles || {})) {
      const base = map[key];
      if (!base) continue;
      const tile = Object.assign(Object.create(Object.getPrototypeOf(base)), saved);
      map[key] = tile;
      if (tile.owner === "player") {
        pKeys.add(key);
        if (tile.powerLevel && !tile.isHQ && !tile.isHQPart) power += POWER_DEFS[tile.powerLevel]?.ringPower ?? 0;
      }
      if (tile.resetAt) defeated[key] = { resetAt: tile.resetAt };
    }
    s.pKeysRef.current = pKeys; s.setPKeys(pKeys);
    s.powerPerHrRef.current = power; s.setPowerPerHr(power);
    s.defeatedTilesRef.current = defeated;

    const refs = fromPlain(snap.refs || {});
    s.aiHqKeysRef.current = refs.aiHqKeys || {};
    for (const [name, ref] of [["aiRssMap", s.aiRssMapRef], ["aiBldgsMap", s.aiBldgsMapRef], ["aiPoolMap", s.aiPoolMapRef],
      ["aiTileKeysMap", s.aiTileKeysMapRef], ["aiPlayerIdMap", s.aiPlayerIdMapRef], ["spawnedAiHqs", s.spawnedAiHqsRef],
      ["aiGems", s.aiGemsRef], ["aiFounders", s.aiFoundersRef]]) {
      if (refs[name] != null) ref.current = refs[name];
    }
    const aiKeys = new Set();
    for (const set of s.aiTileKeysMapRef.current.values()) for (const k of set) aiKeys.add(k);
    s.aiTileKeysRef.current = aiKeys;

    s.setCmds(fromPlain(snap.cmds || []));
    if (snap.playerHqKey) s.setPlayerHqKey(snap.playerHqKey);
    const army = fromPlain(snap.army || {});
    for (const k of ARMY_KEYS) if (k in army) s.dispatchArmy({ type: "set", key: k, value: army[k] });
    s.loadForts(fromPlain(snap.forts || []));
    const persist = fromPlain(snap.persist || {});
    for (const [k, [, set]] of Object.entries(s.persist)) if (k in persist) set(persist[k]);

    clearHQCache();
    s.setTileVersion(v => v + 1);
    setTimeout(() => {
      s.mapRendererRef.current?.forceRedrawTiles?.(s.tilesMapRef.current);
      if (snap.playerHqKey) {
        const [c, r] = snap.playerHqKey.split(",").map(Number);
        s.teleportTo(c, r);
      }
    }, 50);
    setLastSaveAt(snap.meta.savedAt);
    setSaveMsg("Save loaded");
  }, [g.mapReady]);

  // ── New test campaign: every commander, any alignment ──
  const grantAllCommanders = useCallback(() => {
    const s = latest.current;
    const hq = s.playerHqRef.current || s.playerHqKey;
    s.setCmds(prev => [...prev, ...missingCommanders(prev, hq, s.staminaMax)]);
    s.setColl(HDEFS.slice());
  }, []);
  useEffect(() => {
    if (!active || grantedRef.current || pendingSnapRef.current) return;
    grantedRef.current = true;
    grantAllCommanders();
  }, [active, grantAllCommanders]);

  // ── Unlimited gems / eggs / void orbs / resources (refilled right after any spend) ──
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const s = latest.current;
      const { rss } = s.army;
      if (["wood", "stone", "gas", "food"].some(k => (rss?.[k] ?? 0) < TEST_TOPUP.rss)) {
        s.setRss(p => ({ ...p, wood: Math.max(p.wood, TEST_TOPUP.rss), stone: Math.max(p.stone, TEST_TOPUP.rss), gas: Math.max(p.gas, TEST_TOPUP.rss), food: Math.max(p.food, TEST_TOPUP.rss) }));
      }
      if ((s.persist.gems[0] ?? 0) < TEST_TOPUP.gems) s.persist.gems[1](TEST_TOPUP.gems);
      if ((s.persist.dragonEggs[0] ?? 0) < s.dragonEggsCap) s.persist.dragonEggs[1](s.dragonEggsCap);
      if ((s.persist.mysticOrbs[0] ?? 0) < s.mysticOrbsCap) s.persist.mysticOrbs[1](s.mysticOrbsCap);
    }, 400);
    return () => clearInterval(id);
  }, [active]);

  // ── Autosave: every minute and whenever the app is hidden/closed ──
  useEffect(() => {
    if (!active) return;
    const save = () => { if (!pendingSnapRef.current) saveTo("autosave"); };
    const id = setInterval(save, AUTOSAVE_MS);
    const onHide = () => { if (document.visibilityState === "hidden") save(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", save); };
  }, [active, saveTo]);

  // ── Admin actions ──
  const admin = useMemo(() => {
    if (!testMode) return null;
    const s = () => latest.current;
    const mapCmd = (uid, fn) => s().setCmds(p => p.map(c => c.uid === uid ? fn(c) : c));
    const finishCrewBuilds = () => {
      const now = Date.now();
      const f = x => x && x.buildEndsAt && x.buildEndsAt > now ? { ...x, buildEndsAt: now } : x;
      s().setCrews(prev => prev.map(c => ({ ...c, fortresses: (c.fortresses || []).map(f), wells: (c.wells || []).map(f), outpost: f(c.outpost) })));
    };
    return {
      noAdjacency, setNoAdjacency, lastSaveAt, saveMsg,
      grantAllCommanders,
      setLevel: (uid, lvl) => mapCmd(uid, c => adminSetLevel(c, lvl)),
      setRespect: (uid, lvl) => mapCmd(uid, c => adminSetRespect(c, lvl)),
      refillStamina: uid => mapCmd(uid, c => ({ ...c, stamina: s().staminaMax })),
      finishMarch: uid => mapCmd(uid, c => c.march ? { ...c, march: finishMarchPatch(c.march) } : c),
      finishUpgrade: type => s().setUpgQueue(q => q[type] ? { ...q, [type]: { ...q[type], endsAt: Date.now() } } : q),
      finishTraining: id => s().dispatchArmy({ type: "set", key: "trainingQueues", value: qs => qs.map(q => q.id === id ? finishTrainingQueue(q) : q) }),
      finishHeal: id => s().dispatchArmy({ type: "set", key: "healQueue", value: qs => qs.map(q => q.id === id ? finishHealQueue(q) : q) }),
      finishFort: id => s().loadForts(s().forts.map(f => f.id === id && f.completesAt ? { ...f, completesAt: Date.now() } : f)),
      // Demolish/abandon timers live on fort.removal — finishing one lets useFortRemovals fire it.
      finishFortRemoval: id => s().loadForts(s().forts.map(f => f.id === id && f.removal ? { ...f, removal: { ...f.removal, endsAt: Date.now() } } : f)),
      finishCrewBuilds,
      finishAll: () => {
        const st = s(), now = Date.now();
        st.setCmds(p => p.map(c => c.owner === "player" && c.march ? { ...c, march: finishMarchPatch(c.march, now) } : c));
        st.setUpgQueue(q => Object.fromEntries(Object.entries(q).map(([k, v]) => [k, { ...v, endsAt: now }])));
        st.dispatchArmy({ type: "set", key: "trainingQueues", value: qs => qs.map(q => finishTrainingQueue(q, now)) });
        st.dispatchArmy({ type: "set", key: "healQueue", value: qs => qs.map(finishHealQueue) });
        st.loadForts(st.forts.map(f => ({ ...f,
          ...(f.completesAt ? { completesAt: now } : {}),
          ...(f.removal ? { removal: { ...f.removal, endsAt: now } } : {}) })));
        finishCrewBuilds();
      },
      relocateCheck: key => adminRelocationCheck(key, s().tilesMapRef.current, s().playerHqRef.current),
      relocateHq: key => {
        const st = s();
        const oldHq = st.playerHqRef.current;
        const check = adminRelocationCheck(key, st.tilesMapRef.current, oldHq);
        if (!check.ok) { st.floaty(`⚠ ${check.reason}`, "#cc6030", key); return check; }
        st.applyHqMoveRef.current?.(key); // also moves commanders at the old HQ
        // Drop the cached HQ artwork so the old castle disappears right away.
        clearHQCache();
        setTimeout(() => st.mapRendererRef.current?.forceRedrawTiles?.(st.tilesMapRef.current), 30);
        st.floaty("🛠 HQ relocated", "#f0c040", key);
        return { ok: true };
      },
      crewLevelOnCreate: crew => ({ ...crew, level: CREW_MAX_LEVEL, cap: crewMemberCapForLevel(CREW_MAX_LEVEL) }),
      saveTo, loadFrom, listSaves,
      // Save file export/import — moves a save between site addresses/devices
      // (browser saves belong to one exact web address).
      exportSave: () => {
        const snap = buildSnapshot();
        snap.meta.tiles = Object.values(snap.tiles).filter(t => t.owner === "player").length;
        const blob = new Blob([JSON.stringify(snap)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `foolsgold-test-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      },
      importSave: async (file) => {
        try {
          const snap = JSON.parse(await file.text());
          if (snap?.meta?.version !== SAVE_VERSION || !snap.tiles) return { ok: false, reason: "Not a Fool's Gold test save (or an older version)" };
          await writeSave("slot3", snap);
          return { ok: true };
        } catch (err) { return { ok: false, reason: String(err?.message || err) }; }
      },
      teleportTo: key => { const [c, r] = String(key).split(",").map(Number); if (Number.isFinite(c) && Number.isFinite(r)) s().teleportTo(c, r); },
    };
  }, [testMode, noAdjacency, lastSaveAt, saveMsg, grantAllCommanders, saveTo, loadFrom]);

  // Title-screen "Test Campaign" menu → new campaign or load a slot.
  const startNewTestCampaign = useCallback(() => {
    grantedRef.current = false;
    setTestMode(true);
    latest.current.setScreen("faction");
  }, []);

  return { testMode, admin, noAdjacency: testMode && noAdjacency, startNewTestCampaign, loadFrom, listSaves };
}
