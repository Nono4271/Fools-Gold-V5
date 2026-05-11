import { useState } from "react";
import { applyGearToCmd } from "../../../../shared/utils/gearStats.js";
import {
  RARITY, CLASS, PROMO,
  PLAYABLE_FACTIONS,
  getSubspecies, getFactionAlignment, ALIGNMENT,
  addRespect, RESPECT_MAX,
} from "../../../../shared/constants/heroes.js";
import { CMD_LVL_MAX, xpToNext } from "../../../../shared/constants/troops.js";
import { cmdCommand } from "../../../../shared/constants/buildings.js";
import { getRespectInfo } from "./factionTheme.js";
import GearPanel from "./GearPanel.jsx";
import SkillTreeOverlay from "./SkillTreeOverlay.jsx";

export default function CommanderDetail({ cmd, bldgs, gearInventory, setGearInventory, respectSchematics, setCmds, onSchematicUsed, gems, setGems }) {
  const [showSkills, setShowSkills] = useState(false);
  const [showSchematics, setShowSchematics] = useState(false);
  const [showClassPopup, setShowClassPopup] = useState(null);
  const r = RARITY[cmd.rarity] ?? RARITY.soldier;
  const cls = CLASS[cmd.cls];
  const faction = PLAYABLE_FACTIONS.find(f => f.key === cmd.faction);
  const { rLvl, intoLvl, cost, pct } = getRespectInfo(cmd);
  const promoInfo = PROMO[cmd.rarity];
  const lvl = cmd.lvl ?? 5;
  const xpNeeded = lvl < CMD_LVL_MAX ? xpToNext(lvl) : null;
  const xpPct = xpNeeded ? Math.min(100, Math.round(((cmd.xp ?? 0) / xpNeeded) * 100)) : 100;
  const cmdCap = cmdCommand(lvl, bldgs?.commandcenter ?? 0, (cmd.cls==="leader"&&lvl>=25)?500:0);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
      {showSkills && <SkillTreeOverlay cmd={cmd} setCmds={setCmds} gems={gems} setGems={setGems} onClose={() => setShowSkills(false)} />}

      {/* ── Name + identity ── */}
      <div style={{
        padding: "16px 18px 12px",
        background: `linear-gradient(160deg, ${r.color}0c 0%, transparent 55%)`,
        borderBottom: "1px solid #1c1610",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 16,
              color: "#ede0c8", letterSpacing: ".01em", lineHeight: 1.1,
            }}>{cmd.n}</div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7, position: "relative" }}>
              {cls && (
                <>
                  <div
                    onClick={() => setShowClassPopup(showClassPopup === "class" ? null : "class")}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 9px",
                      background: showClassPopup === "class" ? `${r.color}18` : "rgba(255,255,255,.04)",
                      border: `1px solid ${r.color}${showClassPopup === "class" ? "70" : "45"}`,
                      borderRadius: 3, cursor: "pointer",
                    }}>
                    <span style={{ fontSize: 13 }}>{cls.icon}</span>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, fontWeight: 700,
                      color: r.color, letterSpacing: ".06em" }}>{cls.n}</span>
                    <span style={{ fontSize: 7, color: r.color, opacity: 0.6 }}>ⓘ</span>
                  </div>
                  {showClassPopup === "class" && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
                      width: 220, padding: "10px 12px",
                      background: "#0e0c09", border: `1px solid ${r.color}40`,
                      borderRadius: 6, boxShadow: `0 4px 20px rgba(0,0,0,.7)`,
                      animation: "fadeUp .12s ease",
                    }}>
                      <div style={{ fontSize: 7, color: r.color, fontFamily: "'Cinzel',serif",
                        letterSpacing: ".08em", marginBottom: 4 }}>
                        {cls.icon} {cls.n.toUpperCase()} CLASS
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
                        color: "#7a6a50", lineHeight: 1.5, marginBottom: 8 }}>{cls.desc}</div>
                      <div style={{ fontSize: 7, color: lvl >= 25 ? "#f0c040" : "#5a4a2a",
                        fontFamily: "'Cinzel',serif", letterSpacing: ".08em", marginBottom: 4 }}>
                        ⭐ LV25 BONUS{lvl >= 25 ? " — ACTIVE" : ` — unlocks at Lv25`}
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "'Crimson Pro',serif",
                        color: lvl >= 25 ? "#c0a070" : "#3a3020", lineHeight: 1.5 }}>{cls.bonus}</div>
                    </div>
                  )}
                </>
              )}
              {faction && (
                <div style={{ display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 3,
                  background: `${faction.c}12`, border: `1px solid ${faction.c}35` }}>
                  <span style={{ fontSize: 11 }}>{faction.s}</span>
                  <span style={{ fontSize: 8, color: faction.c, fontFamily: "'Cinzel',serif" }}>{faction.n}</span>
                </div>
              )}
              <div style={{
                padding: "3px 8px", borderRadius: 3,
                background: `${r.color}12`, border: `1px solid ${r.color}45`,
                fontSize: 8, color: r.color, fontFamily: "'Cinzel',serif", fontWeight: 700,
              }}>{r.n}</div>

              {(() => {
                const sub = getSubspecies(cmd.faction, cmd.rarity);
                if (!sub) return null;
                return (
                  <div style={{
                    padding: "3px 8px", borderRadius: 3,
                    background: "rgba(255,255,255,.04)", border: "1px solid #2a2010",
                    fontSize: 8, color: "#8a7a50", fontFamily: "'Cinzel',serif",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ fontSize: 9 }}>◈</span>{sub}
                  </div>
                );
              })()}

              {(() => {
                const alnKey = getFactionAlignment(cmd.faction);
                const aln = ALIGNMENT[alnKey];
                if (!aln) return null;
                return (
                  <div style={{
                    padding: "3px 8px", borderRadius: 3,
                    background: "rgba(255,255,255,.03)", border: "1px solid #241c10",
                    fontSize: 8, color: "#5a4a30", fontFamily: "'Cinzel',serif",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ fontSize: 10 }}>{aln.icon}</span>{aln.n}
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{
            width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
            background: `radial-gradient(circle at 38% 32%, ${r.color}22, #0c0a07)`,
            border: `2px solid ${r.color}55`,
            boxShadow: `0 0 20px ${r.color}28`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34,
          }}>{cmd.icon}</div>
        </div>

        {/* Respect bar */}
        {(() => {
          const nextPromo = promoInfo?.respectRequired;
          const atPromoThreshold = nextPromo && rLvl >= nextPromo - 1 && rLvl < nextPromo;
          const barGlows = atPromoThreshold || pct >= 90;
          return (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15 }}>⚜</span>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 15, fontWeight: 700,
                    color: r.color }}>R{rLvl}</span>
                  {promoInfo?.to && rLvl < promoInfo.respectRequired && (
                    <span style={{ fontSize: 7, color: "#3a3228", fontFamily: "'Cinzel',serif" }}>
                      → {RARITY[promoInfo.to]?.n} at R{promoInfo.respectRequired}
                    </span>
                  )}
                  {rLvl < RESPECT_MAX && (
                    <button onClick={() => setShowSchematics(s => !s)} style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: showSchematics ? `${r.color}30` : "rgba(255,255,255,.05)",
                      border: `1px solid ${r.color}50`,
                      color: r.color, fontSize: 13, lineHeight: 1,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, flexShrink: 0,
                      boxShadow: (respectSchematics?.length > 0) ? `0 0 6px ${r.color}50` : "none",
                    }}>+</button>
                  )}
                </div>
                <span style={{ fontSize: 8, color: "#4a3a28", fontFamily: "'Cinzel',serif" }}>
                  {rLvl < RESPECT_MAX ? `${intoLvl} / ${cost} pts` : "Max Respect"}
                </span>
              </div>

              {showSchematics && (
                <div style={{
                  marginBottom: 8, padding: "8px 10px",
                  background: "rgba(0,0,0,.4)", border: `1px solid ${r.color}28`,
                  borderRadius: 6, animation: "fadeUp .15s ease",
                }}>
                  {!respectSchematics?.length ? (
                    <div style={{ fontSize: 8, color: "#3a2e18", fontFamily: "'Crimson Pro',serif",
                      fontStyle: "italic" }}>No schematics in inventory</div>
                  ) : (() => {
                    const applicable = respectSchematics.filter(sc =>
                      sc.isGeneric || !sc.commanderId || sc.commanderId === cmd.id
                    );
                    if (!applicable.length) return (
                      <div style={{ fontSize: 8, color: "#3a2e18", fontFamily: "'Crimson Pro',serif",
                        fontStyle: "italic" }}>No schematics for this commander</div>
                    );
                    return (
                      <>
                        <div style={{ fontSize: 7, color: "#5a4a2a", fontFamily: "'Cinzel',serif",
                          letterSpacing: ".06em", marginBottom: 6 }}>
                          APPLY SCHEMATIC — {applicable.length} available
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {applicable.map(sc => {
                            const scColor = sc.rarity === "champion" ? "#f0c040" : sc.rarity === "veteran" ? "#a855f7" : "#4488cc";
                            return (
                              <button key={sc.instanceId} onClick={() => {
                                setCmds(prev => prev.map(c => {
                                  if (c.uid !== cmd.uid) return c;
                                  const updated = addRespect(c, sc.points);
                                  return { ...updated, _justPromoted: null };
                                }));
                                if (onSchematicUsed) onSchematicUsed(sc.instanceId);
                                setShowSchematics(false);
                              }} style={{
                                padding: "6px 10px", textAlign: "left",
                                background: `${scColor}10`, border: `1px solid ${scColor}35`,
                                borderRadius: 4, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 8,
                              }}>
                                <span style={{ fontSize: 16 }}>{sc.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9,
                                    color: scColor, fontWeight: 700 }}>+{sc.points} Respect pts</div>
                                  <div style={{ fontSize: 7, color: "#4a3a28",
                                    fontFamily: "'Cinzel',serif" }}>
                                    {sc.rarity.charAt(0).toUpperCase() + sc.rarity.slice(1)} Schematic
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div style={{
                height: 6, background: "#0c0905", borderRadius: 3,
                border: `1px solid ${barGlows ? r.color + "50" : "#241c0e"}`,
                overflow: "hidden", position: "relative",
                boxShadow: barGlows ? `0 0 10px ${r.color}40` : "none",
                transition: "box-shadow .3s",
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg, ${r.color}88, ${r.color})`,
                  borderRadius: 3, transition: "width .4s ease",
                  boxShadow: `0 0 8px ${r.color}55`,
                  animation: barGlows ? "pulse 1.8s ease-in-out infinite" : "none",
                }} />
                {[25, 50, 75].map(p => (
                  <div key={p} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`,
                    width: 1, background: "rgba(0,0,0,.5)" }} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* XP bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: "#6a6040" }}>
              Lv.{lvl} / Lv.{CMD_LVL_MAX}
            </span>
            {xpNeeded && (
              <span style={{ fontSize: 8, color: "#3a3020", fontFamily: "'Cinzel',serif" }}>
                {cmd.xp ?? 0} / {xpNeeded} XP
              </span>
            )}
          </div>
          <div style={{ height: 3, background: "#0c0905", borderRadius: 2,
            border: "1px solid #1c1408", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${xpPct}%`,
              background: "linear-gradient(90deg,#8a6020,#f0c040)",
              borderRadius: 2, transition: "width .4s" }} />
          </div>
        </div>
      </div>

      <div style={{ height: 44, flexShrink: 0 }} />

      {/* ── 4-stat row ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        borderBottom: "1px solid #1a1510", background: "#090805", flexShrink: 0,
        position: "relative",
      }}>
        {(() => {
          const bc = applyGearToCmd(cmd, gearInventory);
          const GROWTH = {
            attacker: { ATK: 1.5, FOC: 0.2, SPD: 0.6 },
            defender: { ATK: 0.7, FOC: 1.1, SPD: 0.3 },
            support:  { ATK: 0.2, FOC: 1.3, SPD: 0.8 },
            leader:   { ATK: 0.8, FOC: 0.8, SPD: 0.8 },
          };
          const growth = GROWTH[cmd.cls] ?? GROWTH.leader;
          return [
            { icon: "⚔",  label: "ATK", val: Math.round(bc.atk ?? 0), color: "#e08050", growth: growth.ATK },
            { icon: "✦",  label: "FOC", val: Math.round(bc.foc ?? 0), color: "#aa66ff", growth: growth.FOC },
            { icon: "💨", label: "SPD", val: Math.round(bc.spd ?? 0), color: "#40a8e0", growth: growth.SPD },
            { icon: "📡", label: "CMD", val: cmdCap,                   color: "#60c0a0", growth: null },
          ];
        })().map(({ icon, label, val, color, growth }) => (
          <div key={label}
            onClick={() => growth != null && setShowClassPopup(showClassPopup === `stat_${label}` ? null : `stat_${label}`)}
            style={{
              padding: "8px 0", textAlign: "center",
              borderRight: "1px solid #161210",
              cursor: growth != null ? "pointer" : "default",
              position: "relative",
              background: showClassPopup === `stat_${label}` ? "rgba(255,255,255,.04)" : "transparent",
            }}>
            <div style={{ fontSize: 14, marginBottom: 3 }}>{icon}</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 6, color: "#3a3020", fontFamily: "'Cinzel',serif",
              letterSpacing: ".07em", marginTop: 3 }}>{label}{growth != null && <span style={{ color: "#3a3020" }}> ▴</span>}</div>

            {showClassPopup === `stat_${label}` && growth != null && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: "#12100a", border: "1px solid #f0c04044", borderRadius: 5,
                padding: "8px 12px", zIndex: 50, whiteSpace: "nowrap",
                boxShadow: "0 4px 20px rgba(0,0,0,.8)",
              }}>
                <div style={{ fontSize: 7, color: "#6a5a38", fontFamily: "'Cinzel',serif", letterSpacing: ".08em", marginBottom: 4 }}>
                  {label} GROWTH
                </div>
                <div style={{ fontSize: 11, color: color, fontFamily: "'Cinzel',serif", fontWeight: 700 }}>
                  +{growth} per level
                </div>
                <div style={{ fontSize: 7, color: "#4a3a28", marginTop: 3, fontFamily: "'Crimson Pro',serif" }}>
                  ({cmd.cls} class)
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Stamina ── */}
      {(() => {
        const stam = cmd.stamina ?? 200;
        const sc = stam >= 100 ? "#4ac870" : stam >= 40 ? "#f0c040" : "#cc4040";
        return (
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #161210" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 7, color: "#8a7a60", letterSpacing: ".08em" }}>⚡ STAMINA</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 9, color: sc, fontWeight: 700 }}>{Math.floor(stam)} / 200</div>
            </div>
            <div style={{ height: 5, background: "rgba(0,0,0,.5)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(stam / 200) * 100}%`, background: sc, borderRadius: 3, transition: "width .3s" }}/>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 6, color: "#6a5a40", fontFamily: "'Cinzel',serif" }}>
              <span>Move: 10⚡ · Attack: 20⚡</span>
              <span>Regen: +20/hr</span>
            </div>
          </div>
        );
      })()}

      {/* ── March status ── */}
      {cmd.march && (() => {
        const eta = Math.ceil((cmd.march.path.length - cmd.march.step - 1) * cmd.march.stepMs / 1000);
        const atk = cmd.march.type === "attack";
        return (
          <div style={{
            margin: "10px 18px 0", padding: "8px 12px", flexShrink: 0,
            background: atk ? "rgba(200,30,30,.08)" : "rgba(40,140,80,.08)",
            border: `1px solid ${atk ? "#cc303038" : "#3daa6038"}`, borderRadius: 5,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{atk ? "⚔" : "🚶"}</span>
            <div>
              <div style={{ fontSize: 9, fontFamily: "'Cinzel',serif", fontWeight: 700,
                color: atk ? "#e06060" : "#60c880" }}>
                {atk ? "Attacking" : "Marching"} · ~{eta}s
              </div>
              <div style={{ fontSize: 7, color: "#3a3028", fontFamily: "'Cinzel',serif", marginTop: 1 }}>
                → {cmd.march.dest}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ height: 16, flexShrink: 0 }} />

      <GearPanel
        cmd={cmd}
        gearInventory={gearInventory}
        setGearInventory={setGearInventory}
        setCmds={setCmds}
        rarityColor={r.color}
      />

      <div style={{ height: 16, flexShrink: 0 }} />
      <div style={{ padding: "12px 18px 28px", flexShrink: 0 }}>
        <button onClick={() => setShowSkills(true)} style={{
          width: "100%", padding: "13px 0",
          background: `linear-gradient(135deg, ${r.color}18, rgba(0,0,0,.4))`,
          border: `1px solid ${r.color}48`,
          borderRadius: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: `0 0 16px ${r.color}12, inset 0 1px 0 rgba(255,255,255,.04)`,
          transition: "all .15s", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg,transparent,${r.color}55,transparent)`,
          }} />
          <span style={{ fontSize: 20 }}>✦</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700,
              color: r.color, letterSpacing: ".06em" }}>SKILL TREES</div>
            <div style={{ fontSize: 8, color: "#4a3a28", fontFamily: "'Cinzel',serif", marginTop: 2 }}>
              {(cmd.unspentSkillPoints ?? 0) > 0
                ? `${cmd.unspentSkillPoints} point${cmd.unspentSkillPoints !== 1 ? "s" : ""} to spend`
                : "View & assign skill points"}
            </div>
          </div>
          {(cmd.unspentSkillPoints ?? 0) > 0 && (
            <div style={{
              marginLeft: "auto",
              width: 22, height: 22, borderRadius: "50%",
              background: "linear-gradient(135deg,#dd3030,#991010)",
              fontSize: 10, color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{cmd.unspentSkillPoints}</div>
          )}
        </button>
      </div>

      <div style={{
        height: 40, flexShrink: 0,
        background: "linear-gradient(180deg, transparent, #080704 90%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
