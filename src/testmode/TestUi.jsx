// TEST MODE — UI: title-screen Test Campaign menu, the in-game Admin panel,
// and the admin row inside the tile popup.
import { useEffect, useMemo, useState } from "react";
import { SAVE_SLOTS } from "./saveStore.js";
import { marchMsLeft } from "../../shared/utils/marchMotion.js";
import { fmtMsShort } from "../../shared/utils/commanderStatus.js";
import { CMD_LVL_MIN, CMD_LVL_MAX } from "../../shared/constants/troops.js";
import { RESPECT_MAX } from "../../shared/constants/heroes.js";

const F = "'Cinzel',serif";
const btn = (color = "#c8a060", extra = {}) => ({
  minHeight: 36, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: F, fontSize: 10, fontWeight: 700,
  background: `${color}22`, border: `1px solid ${color}88`, color, touchAction: "manipulation", ...extra,
});
const slotName = s => (s === "autosave" ? "Autosave" : s.replace("slot", "Slot "));
const when = t => (t ? new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

function useSaves(listSaves, bump) {
  const [saves, setSaves] = useState(null);
  useEffect(() => { let on = true; listSaves().then(s => on && setSaves(s)).catch(() => on && setSaves({})); return () => { on = false; }; }, [listSaves, bump]);
  return saves;
}

function SlotList({ saves, onLoad, onSave }) {
  const [confirm, setConfirm] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {SAVE_SLOTS.map(slot => {
        const m = saves?.[slot];
        return (
          <div key={slot} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid #3a2e1a" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F, fontSize: 12, color: "#f0d890", fontWeight: 700 }}>{slotName(slot)}</div>
              <div style={{ fontSize: 11, color: "#a89070" }}>
                {saves == null ? "…" : m ? `${m.facName || m.facKey} · ${when(m.savedAt)} · ${m.commanders} cmdrs · ${m.tiles} tiles` : "Empty"}
              </div>
            </div>
            {onSave && <button style={btn("#60a0e0")} onClick={() => onSave(slot)}>SAVE</button>}
            {m && (confirm === slot
              ? <button style={btn("#e06040")} onClick={() => onLoad(slot)}>SURE?</button>
              : <button style={btn("#60c070")} onClick={() => setConfirm(slot)}>LOAD</button>)}
          </div>
        );
      })}
    </div>
  );
}

// ── Title screen → Test Campaign ──────────────────────────────────────────
export function TestCampaignMenu({ onNew, onLoad, onBack, listSaves }) {
  const saves = useSaves(listSaves, 0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 30%, #2a1a08, #0a0502)", overflowY: "auto", padding: "calc(var(--sat, 0px) + 20px) 16px 40px", color: "#e0d0b0" }}>
      <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontFamily: F, fontSize: 20, color: "#f0c040", textAlign: "center", fontWeight: 900 }}>🛠 TEST CAMPAIGN</div>
        <div style={{ fontSize: 13, color: "#b09870", lineHeight: 1.5, textAlign: "center" }}>
          Admin tools on: every commander unlocked, no adjacency/range limits, instant-finish buttons, relocate anywhere, unlimited gems/eggs/void orbs/resources, crews start at level 50. Autosaves every minute.
        </div>
        <button style={btn("#f0c040", { minHeight: 48, fontSize: 13 })} onClick={onNew}>⚔ NEW TEST CAMPAIGN</button>
        <div style={{ fontFamily: F, fontSize: 11, color: "#8a7a5a", letterSpacing: ".1em" }}>CONTINUE</div>
        <SlotList saves={saves} onLoad={onLoad} />
        <button style={btn("#888")} onClick={onBack}>‹ BACK</button>
      </div>
    </div>
  );
}

// ── Admin row inside the tile popup ───────────────────────────────────────
export function AdminTileActions({ admin, selKey }) {
  const [msg, setMsg] = useState(null);
  if (!admin || !selKey) return null;
  const check = admin.relocateCheck(selKey);
  return (
    <div style={{ flexBasis: "100%", display: "flex", flexDirection: "column", gap: 4, marginTop: 4, padding: 6, borderRadius: 6, border: "1px dashed #a07030", background: "rgba(160,112,48,.08)" }}>
      <button style={btn(check.ok ? "#f0c040" : "#777", { opacity: check.ok ? 1 : 0.6 })}
        onClick={() => { const r = admin.relocateHq(selKey); setMsg(r.ok ? "HQ moved" : r.reason); }}>
        🛠 RELOCATE HQ HERE
      </button>
      {(msg || !check.ok) && <div style={{ fontSize: 10, color: "#c0a070", textAlign: "center" }}>{msg || check.reason}</div>}
    </div>
  );
}

// ── In-game Admin panel ───────────────────────────────────────────────────
function Stepper({ value, min, max, onSet }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = v => { const n = Math.max(min, Math.min(max, Math.round(Number(v)))); if (Number.isFinite(n)) onSet(n); else setDraft(String(value)); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button style={btn("#c8a060", { minWidth: 36, padding: 0 })} onClick={() => commit(value - 1)}>−</button>
      <input value={draft} inputMode="numeric" onChange={e => setDraft(e.target.value)} onBlur={e => commit(e.target.value)}
        onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
        style={{ width: 44, height: 36, textAlign: "center", background: "#0e0c08", border: "1px solid #5a4a2a", borderRadius: 6, color: "#f0e0c0", fontSize: 14 }} />
      <button style={btn("#c8a060", { minWidth: 36, padding: 0 })} onClick={() => commit(value + 1)}>+</button>
      <button style={btn("#f0c040", { padding: "0 8px" })} onClick={() => commit(max)}>MAX</button>
    </div>
  );
}

function CommandersTab({ admin, cmds }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const mine = useMemo(() => cmds.filter(c => c.owner === "player" && (!q || c.n?.toLowerCase().includes(q.toLowerCase()))), [cmds, q]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Search commanders" value={q} onChange={e => setQ(e.target.value)}
          style={{ flex: 1, height: 36, padding: "0 10px", background: "#0e0c08", border: "1px solid #5a4a2a", borderRadius: 6, color: "#f0e0c0", fontSize: 14 }} />
        <button style={btn("#60c070")} onClick={admin.grantAllCommanders}>+ ALL</button>
      </div>
      {mine.map(c => (
        <div key={c.uid} style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid #3a2e1a" }}>
          <button onClick={() => setOpen(open === c.uid ? null : c.uid)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit" }}>
            {c.bust ? <img src={c.bust} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>{c.icon}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F, fontSize: 12, color: "#f0d890", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.n}</div>
              <div style={{ fontSize: 11, color: "#a89070" }}>{c.faction} · {c.rarity} · Lv {c.lvl} · Respect {c.respectLevel ?? 0}{c.march ? " · marching" : ""}</div>
            </div>
            <span style={{ color: "#8a7a5a" }}>{open === c.uid ? "▾" : "▸"}</span>
          </button>
          {open === c.uid && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontFamily: F, fontSize: 11, color: "#c0a878" }}>LEVEL</span>
                <Stepper value={c.lvl ?? CMD_LVL_MIN} min={CMD_LVL_MIN} max={CMD_LVL_MAX} onSet={v => admin.setLevel(c.uid, v)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontFamily: F, fontSize: 11, color: "#c0a878" }}>RESPECT</span>
                <Stepper value={c.respectLevel ?? 0} min={0} max={RESPECT_MAX} onSet={v => admin.setRespect(c.uid, v)} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button style={btn("#60a0e0")} onClick={() => admin.refillStamina(c.uid)}>⚡ STAMINA</button>
                {c.march && <button style={btn("#f0c040")} onClick={() => admin.finishMarch(c.uid)}>⚡ ARRIVE NOW</button>}
                {c.march?.dest && <button style={btn("#c8a060")} onClick={() => admin.teleportTo(c.march.dest)}>GO TO {c.march.dest}</button>}
                {!c.march && c.tk && <button style={btn("#c8a060")} onClick={() => admin.teleportTo(c.tk)}>GO TO {c.tk}</button>}
              </div>
              <div style={{ fontSize: 10, color: "#8a7a5a" }}>Lowering a level removes skill points (unspent first, then refunds skills).</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ label, sub, onFinish }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid #3a2e1a" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F, fontSize: 11, color: "#f0d890" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#a89070" }}>{sub}</div>}
      </div>
      <button style={btn("#f0c040")} onClick={onFinish}>⚡ FINISH</button>
    </div>
  );
}

function TimersTab({ admin, cmds, upgQueue, trainingQueues, healQueue, forts, crews }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const now = Date.now();
  const marching = cmds.filter(c => c.owner === "player" && c.march);
  const ups = Object.entries(upgQueue || {});
  const fortsBusy = (forts || []).filter(f => f.completesAt && f.completesAt > now);
  const fortsRemoving = (forts || []).filter(f => f.removal?.endsAt > now);
  const crewBusy = (crews || []).flatMap(c => [...(c.fortresses || []), ...(c.wells || []), ...(c.outpost ? [c.outpost] : [])]).filter(x => x.buildEndsAt && x.buildEndsAt > now);
  const empty = !marching.length && !ups.length && !trainingQueues?.length && !healQueue?.length && !fortsBusy.length && !fortsRemoving.length && !crewBusy.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button style={btn("#f0c040", { minHeight: 44 })} onClick={admin.finishAll}>⚡ FINISH EVERYTHING</button>
      <button style={btn("#60c080", { minHeight: 44 })} onClick={admin.maxAllBuildings}>🏰 MAX ALL BUILDINGS &amp; QUARTERS</button>
      {empty && <div style={{ fontSize: 12, color: "#8a7a5a", textAlign: "center", padding: 12 }}>Nothing in progress.</div>}
      {marching.map(c => <Row key={c.uid} label={`🥾 ${c.n}`} sub={`→ ${c.march.dest} · ${fmtMsShort(marchMsLeft(c.march, now))}`} onFinish={() => admin.finishMarch(c.uid)} />)}
      {ups.map(([type, u]) => <Row key={type} label={`🏗 ${type} → Lv ${u.newLvl}`} sub={fmtMsShort(Math.max(0, u.endsAt - now))} onFinish={() => admin.finishUpgrade(type)} />)}
      {(trainingQueues || []).map(q => <Row key={q.id} label={`⚔ Training ${q.branchKey}`} sub={`${(q.remaining || 0).toLocaleString()} troops left (needs barracks space)`} onFinish={() => admin.finishTraining(q.id)} />)}
      {(healQueue || []).map(q => <Row key={q.id} label="✚ Healing" sub={`${(q.remaining || 0).toLocaleString()} troops left`} onFinish={() => admin.finishHeal(q.id)} />)}
      {fortsBusy.map(f => <Row key={f.id} label={`🏯 Fort ${f.tileKey} · ${f.isUpgrading ? `upgrade → Lv ${f.pendingLevel}` : "construction"}`} sub={fmtMsShort(f.completesAt - now)} onFinish={() => admin.finishFort(f.id)} />)}
      {fortsRemoving.map(f => <Row key={`rm_${f.id}`} label={`🏯 Fort ${f.tileKey} · ${f.removal.mode === "abandon" ? "abandon" : "demolish"}`} sub={fmtMsShort(f.removal.endsAt - now)} onFinish={() => admin.finishFortRemoval(f.id)} />)}
      {crewBusy.map(x => <Row key={x.id} label={`🏰 Crew structure ${x.tileKey}`} sub={fmtMsShort(x.buildEndsAt - now)} onFinish={admin.finishCrewBuilds} />)}
    </div>
  );
}

function MapTab({ admin, selKey }) {
  const [to, setTo] = useState("");
  const check = selKey ? admin.relocateCheck(selKey) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid #3a2e1a", cursor: "pointer" }}>
        <input type="checkbox" checked={admin.noAdjacency} onChange={e => admin.setNoAdjacency(e.target.checked)} style={{ width: 24, height: 24 }} />
        <span style={{ fontSize: 13 }}>Ignore adjacency &amp; range for attacks</span>
      </label>
      <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid #3a2e1a", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontFamily: F, fontSize: 11, color: "#c0a878" }}>RELOCATE HQ</div>
        <div style={{ fontSize: 12, color: "#a89070" }}>{selKey ? `Selected tile ${selKey}${check?.ok ? "" : ` — ${check?.reason}`}` : "Tap a tile on the map first (or use the 🛠 button in its popup)."}</div>
        <button style={btn(check?.ok ? "#f0c040" : "#777")} disabled={!check?.ok} onClick={() => admin.relocateHq(selKey)}>🛠 RELOCATE HQ TO {selKey || "…"}</button>
      </div>
      <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid #3a2e1a", display: "flex", gap: 6 }}>
        <input placeholder="col,row  e.g. 250,1198" value={to} onChange={e => setTo(e.target.value.replace(/\s/g, ""))}
          style={{ flex: 1, height: 36, padding: "0 10px", background: "#0e0c08", border: "1px solid #5a4a2a", borderRadius: 6, color: "#f0e0c0", fontSize: 14 }} />
        <button style={btn("#60a0e0")} onClick={() => admin.teleportTo(to)}>GO</button>
      </div>
    </div>
  );
}

function SavesTab({ admin }) {
  const [bump, setBump] = useState(0);
  const [msg, setMsg] = useState(null);
  const saves = useSaves(admin.listSaves, bump);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#a89070" }}>
        Autosaves every minute and when the app is closed. Last save: {when(admin.lastSaveAt)}{admin.saveMsg ? ` · ${admin.saveMsg}` : ""}
      </div>
      <SlotList saves={saves} onSave={async slot => { await admin.saveTo(slot); setBump(b => b + 1); }} onLoad={admin.loadFrom} />
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn("#c8a060", { flex: 1 })} onClick={admin.exportSave}>📤 EXPORT FILE</button>
        <label style={{ ...btn("#c8a060", { flex: 1 }), display: "flex", alignItems: "center", justifyContent: "center" }}>
          📥 IMPORT → SLOT 3
          <input type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const r = await admin.importSave(f); setMsg(r.ok ? "Imported into Slot 3 — tap LOAD" : r.reason); setBump(b => b + 1); }} />
        </label>
      </div>
      {msg && <div style={{ fontSize: 12, color: "#f0d890" }}>{msg}</div>}
      <div style={{ fontSize: 11, color: "#8a7a5a", lineHeight: 1.5 }}>
        Saves belong to this exact web address in this browser. Always open the game from the same link (your branch link, not a one-off deployment link) or they won't show up.
        Export a file to move a save to another link or device. Loading reloads the page. Wild spawns aren't saved (new ones appear).
      </div>
    </div>
  );
}

export function AdminPanel({ admin, cmds, selKey, upgQueue, trainingQueues, healQueue, forts, crews, hidden }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("cmds");
  if (!admin) return null;
  return (
    <>
      {!hidden && !open && (
        <button onClick={() => setOpen(true)} style={{ ...btn("#f0c040", { background: "rgba(20,14,6,.92)" }), position: "fixed", right: 8, top: "calc(var(--sat, 0px) + 96px)", zIndex: 400 }}>
          🛠 ADMIN
        </button>
      )}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.6)" }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "min(440px, 100vw)", background: "#140f08", borderLeft: "1px solid #5a4a2a", display: "flex", flexDirection: "column", paddingTop: "var(--sat, 0px)", color: "#e0d0b0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #3a2e1a" }}>
              <div style={{ flex: 1, fontFamily: F, fontSize: 14, color: "#f0c040", fontWeight: 900 }}>🛠 ADMIN · TEST</div>
              <button aria-label="Close" style={btn("#bbb", { minWidth: 40 })} onClick={() => setOpen(false)}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 4, padding: "8px 8px 0" }}>
              {[["cmds", "Commanders"], ["timers", "Timers"], ["map", "Map"], ["saves", "Saves"]].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={btn(tab === k ? "#f0c040" : "#8a7a5a", { flex: 1, padding: "6px 2px", fontSize: 10 })}>{l}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 10, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
              {tab === "cmds" && <CommandersTab admin={admin} cmds={cmds} />}
              {tab === "timers" && <TimersTab admin={admin} cmds={cmds} upgQueue={upgQueue} trainingQueues={trainingQueues} healQueue={healQueue} forts={forts} crews={crews} />}
              {tab === "map" && <MapTab admin={admin} selKey={selKey} />}
              {tab === "saves" && <SavesTab admin={admin} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
