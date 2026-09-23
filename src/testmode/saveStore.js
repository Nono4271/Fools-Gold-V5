// TEST MODE — local save slots in IndexedDB (localStorage is too small for a
// world save). One autosave + 3 manual slots. Also the pure (de)serialisers.

export const SAVE_SLOTS = ["autosave", "slot1", "slot2", "slot3"];
export const SAVE_VERSION = 1;
export const PENDING_LOAD_KEY = "fg_test_pending_load"; // sessionStorage: slot to load after reload

const DB = "fg-testmode", STORE = "saves";
function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(out?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  }));
}
// Each save is stored twice: the full snapshot under its slot, and just its
// small `meta` under "meta:<slot>" so the slot list opens instantly.
export const writeSave = (slot, data) => tx("readwrite", s => { s.put(data, slot); return s.put(data.meta, `meta:${slot}`); });
export const readSave = slot => tx("readonly", s => s.get(slot));
export const deleteSave = slot => tx("readwrite", s => { s.delete(slot); return s.delete(`meta:${slot}`); });
// { slot: meta|null } for the slot pickers.
export async function listSaves() {
  const metas = await tx("readonly", s => {
    const req = { result: {} };
    for (const slot of SAVE_SLOTS) { const g = s.get(`meta:${slot}`); g.onsuccess = () => { req.result[slot] = g.result || null; }; }
    return req;
  });
  return metas || {};
}

// ── Pure helpers (tested in tests/testMode.test.js) ─────────────────────────
// JSON-safe deep copy: Maps → {__map:[…]}, Sets → {__set:[…]}, functions dropped.
export function toPlain(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => {
    if (v instanceof Map) return { __map: [...v.entries()] };
    if (v instanceof Set) return { __set: [...v] };
    return v;
  }));
}
export function fromPlain(value) {
  return JSON.parse(JSON.stringify(value), (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (Array.isArray(v.__map)) return new Map(v.__map);
      if (Array.isArray(v.__set)) return new Set(v.__set);
    }
    return v;
  });
}

// Only tiles that differ from the generated world live in the tile store
// (the rest are rebuilt from the map seed), so that's all a save needs.
export function tilesToSave(tileStore) {
  const out = {};
  for (const key of Object.keys(tileStore || {})) {
    if (key === "__ready" || key.indexOf(",") < 1) continue;
    const t = tileStore[key];
    if (t && typeof t === "object") out[key] = { ...t };
  }
  return out;
}
