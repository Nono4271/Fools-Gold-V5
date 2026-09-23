import test from 'node:test';
import assert from 'node:assert/strict';
import { simBattle, commanderSkillEffect, commanderSkillIsMax } from '../shared/utils/battle.js';
import { ALL_SKILLS, MAIN_SKILLS, getActiveSkills, getPassiveBonuses } from '../shared/constants/skills.js';
import { FACTION_TROOPS } from '../shared/constants/troops.js';
import { HDEFS } from '../shared/constants/heroes.js';
import { PIRATES_SKILLS, PIRATES_BRANCH_SKILL_MAP } from '../shared/constants/pirates_skills.js';

function seeded(fn, seed = 42) { const o = Math.random; let s = seed; Math.random = () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); try { return fn(); } finally { Math.random = o; } }
const heroes = Array.isArray(HDEFS) ? HDEFS : Object.values(HDEFS);
function army(hd) {
  const slots = FACTION_TROOPS[hd.faction].branches.slice(0, 2).map(b => ({ branch: { faction: hd.faction, branch: b.key, tier: 2 }, troops: 10000 }));
  return { id: hd.id, n: hd.n, faction: hd.faction, cls: hd.cls, lvl: 50, atk: 220, foc: 220, spd: 100, troops: 20000, troopBranch: slots[0].branch, troopSlots: slots };
}
const maxLevels = cmd => Object.fromEntries(getActiveSkills({ ...cmd, skillLevels: new Proxy({}, { get: () => 1 }) }).map(s => [s.key, MAIN_SKILLS[s.key] ? 15 : 7]));
const foe = { id: 0, n: 'D', faction: 'orcs', lvl: 50, troops: 20000, atk: 220, foc: 220, spd: 100, troopBranch: { faction: 'orcs', branch: 'grunts', tier: 2 }, troopSlots: [{ branch: { faction: 'orcs', branch: 'grunts', tier: 2 }, troops: 20000 }] };
const tile = { defCmd: foe, garrison: 100, owner: 'ai' };

test('every commander with every skill maxed completes a battle with finite results', () => {
  for (const hd of heroes) {
    const cmd = army(hd);
    const r = seeded(() => simBattle({ ...cmd, skillPoints: maxLevels(cmd) }, 20000, tile, 0));
    for (const k of ['lost', 'atk', 'def', 'pct']) assert.ok(Number.isFinite(r[k]), `${hd.id} ${k}`);
  }
});

test('structured commander skills change battle results (were ignored before)', () => {
  const cmd = army(heroes.find(h => h.id === 'h9'));
  const sig = r => JSON.stringify([r.lost, r.report.defTroopsEnd, r.report.rounds.length,
    Math.round(r.report.rounds.flatMap(x => x.actions).reduce((t, x) => t + (x.isPlayer ? (x.dmg || 0) : -(x.dmg || 0)), 0))]);
  const none = seeded(() => simBattle({ ...cmd, skillPoints: {} }, 20000, tile, 0));
  const maxed = seeded(() => simBattle({ ...cmd, skillPoints: maxLevels(cmd) }, 20000, tile, 0));
  assert.notEqual(sig(none), sig(maxed));
});

test('spent points in cmd.skillPoints are what battle + passives read', () => {
  const cmd = { id: 'h14', faction: 'pirates', cls: 'support', skillPoints: { sal_treasure_hunter: 3 } };
  assert.equal(getActiveSkills(cmd).length, 1);
  assert.ok(Math.abs(getPassiveBonuses(cmd).gatheringBonus - 0.15) < 1e-9);
});

test('level scaling + max-level effect attach only at max', () => {
  const def = ALL_SKILLS.bri_captains_honor;
  assert.ok(Math.abs(commanderSkillEffect('bri_captains_honor', def, 1).value - 0.04) < 1e-9);
  assert.ok(Math.abs(commanderSkillEffect('bri_captains_honor', def, 7).value - 0.20) < 1e-9);
  assert.equal(commanderSkillIsMax('fyn_fynns_opener', 7), !MAIN_SKILLS.fyn_fynns_opener);
  const g = ALL_SKILLS.grim_grims_assault;
  assert.equal(commanderSkillEffect('grim_grims_assault', g, 14).maxLevelEffect, undefined);
  assert.equal(commanderSkillEffect('grim_grims_assault', g, 15).procChance, 0.5);
});

test('pirate skills: 6 commanders x 12, all defined, no key collisions with other factions', async () => {
  for (const [id, branches] of Object.entries(PIRATES_BRANCH_SKILL_MAP)) {
    const keys = branches.flatMap(b => [b.main, ...b.sides]);
    assert.equal(keys.length, 12, id);
    for (const k of keys) assert.ok(PIRATES_SKILLS[k], `${id} ${k}`);
  }
  const others = ['orcs', 'holyknights', 'nightcreatures', 'dragons', 'wizards', 'coldborns', 'ashen_dead'];
  for (const f of others) {
    const mod = await import(`../shared/constants/${f}_skills.js`);
    const S = Object.entries(mod).find(([n]) => n.endsWith('_SKILLS'))[1];
    const clash = Object.keys(PIRATES_SKILLS).filter(k => S[k]);
    assert.deepEqual(clash, [], `collision with ${f}`);
  }
  assert.ok(!PIRATES_SKILLS.sal_treasure_hunter.notImplemented);
});

// ── Orcs (Phase 2) ────────────────────────────────────────────────────────────
function orcBattle(id, skillPoints, foeFaction = 'holyknights', foeBranch = 'templars', seed = 5) {
  const slots = ['grunts', 'warg_riders'].map(b => ({ branch: { faction: 'orcs', branch: b, tier: 2 }, troops: 10000 }));
  const cmd = { id, n: id, faction: 'orcs', cls: 'attacker', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 20000, troopBranch: slots[0].branch, troopSlots: slots, skillPoints };
  const fb = { faction: foeFaction, branch: foeBranch, tier: 2 };
  const def = { id: 0, n: 'D', faction: foeFaction, lvl: 50, atk: 220, foc: 220, spd: 100, troops: 20000, troopBranch: fb, troopSlots: [{ branch: fb, troops: 20000 }] };
  return seeded(() => simBattle(cmd, 20000, { defCmd: def, garrison: 100, owner: 'ai' }, 0), seed);
}
const dealt = r => r.report.rounds.flatMap(x => x.actions).reduce((t, x) => t + (x.isPlayer ? (x.dmg || 0) : 0), 0);
// Stronger over 10 seeds = fewer total troops lost (ties: fewer total rounds)
const strongerOver = (id, sp) => {
  let lw = 0, lo = 0, rw = 0, ro = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const w = orcBattle(id, sp, 'holyknights', 'templars', seed), o = orcBattle(id, {}, 'holyknights', 'templars', seed);
    lw += w.lost; lo += o.lost; rw += w.report.rounds.length; ro += o.report.rounds.length;
  }
  return lw < lo || (lw === lo && rw < ro);
};

test('orcs: Brutal Strike adds damage (used to overwrite commander damage down to 27%)', () => {
  assert.ok(strongerOver('h33', { kor_brutal_strike: 15 }));
});

test('orcs: faction-conditional skills only apply vs that faction', () => {
  const sig = r => JSON.stringify([r.lost, dealt(r)]);
  assert.equal(sig(orcBattle('h9', { grim_pirate_filth: 7 })), sig(orcBattle('h9', {})));             // vs Holy Knights: no effect
  assert.notEqual(sig(orcBattle('h9', { grim_pirate_filth: 7 }, 'pirates', 'swashbucklers')),
                  sig(orcBattle('h9', {}, 'pirates', 'swashbucklers')));                               // vs Pirates: applies
});

test("orcs: Warlord's Touch vulnerability stacks persist across rounds", () => {
  assert.ok(strongerOver('h33', { kor_warlords_touch: 7 }));
});

test('orcs: Lifeline of the Tribe max-level bonus is Orc combat SPD (typo fix)', () => {
  assert.deepEqual(ALL_SKILLS.war_lifeline_of_tribe.maxLevelEffect, { orcCombatSpd: 10 });
});

test('orcs: Orc Explosives adds siege per troop', async () => {
  const { skillSiegeBonus } = await import('../shared/constants/skills.js');
  assert.equal(skillSiegeBonus({ id: 'h22', faction: 'orcs', cls: 'support', skillPoints: { gri_orc_explosives: 1 } }, 1000), 2000);
});

test("orcs: Leader's Plans = +N DEF/HP per 4 Command advantage (Command = troops × cost)", () => {
  const run = (atkTroops, defTroops, sp) => {
    const b = { faction: 'orcs', branch: 'grunts', tier: 2 }, fb = { faction: 'holyknights', branch: 'templars', tier: 2 };
    const cmd = { id: 'h21', n: 'W', faction: 'orcs', cls: 'leader', lvl: 50, atk: 220, foc: 220, spd: 100, troops: atkTroops, troopBranch: b, troopSlots: [{ branch: b, troops: atkTroops }], skillPoints: sp };
    const def = { id: 0, n: 'D', faction: 'holyknights', lvl: 50, atk: 220, foc: 220, spd: 100, troops: defTroops, troopBranch: fb, troopSlots: [{ branch: fb, troops: defTroops }] };
    const r = seeded(() => simBattle(cmd, atkTroops, { defCmd: def, garrison: 100, owner: 'ai' }, 0), 9);
    return r.report.rounds.flatMap(x => x.actions).reduce((t, x) => t + (!x.isPlayer && x.dmg > 0 ? x.dmg : 0), 0);
  };
  // 80 vs 55 command (small units, 0.01 each): skill reduces damage taken
  assert.ok(run(8000, 5500, { war_leaders_plans: 7 }) < run(8000, 5500, {}));
  // 80 vs 78: under one 4-command step → no effect
  assert.equal(run(8000, 7800, { war_leaders_plans: 7 }), run(8000, 7800, {}));
});

// ── Two-sided battle (PvP parity) ─────────────────────────────────────────────
function pvpArmy(id, maxed) {
  const hd = heroes.find(h => h.id === id);
  const slots = FACTION_TROOPS[hd.faction].branches.slice(0, 2).map(b => ({ branch: { faction: hd.faction, branch: b.key, tier: 2 }, troops: 4000 }));
  const c = { id, n: hd.n, faction: hd.faction, cls: hd.cls, rarity: hd.rarity, lvl: 40, respectLevel: 10, atk: 220, foc: 220, spd: 100, troops: 8000, troopBranch: slots[0].branch, troopSlots: slots, skillPoints: {} };
  if (maxed) c.skillPoints = maxLevels(c);
  return c;
}
const pvp = (a, d, seed) => seeded(() => simBattle(a, a.troops, { owner: 'player', terrain: 'grass', defCmd: { ...d } }, 0), seed);

test('PvP parity: identical armies — attacker has no built-in edge', () => {
  let atkWins = 0, n = 0;
  for (const id of ['h9', 'h1', 'h44', 'h37']) for (const maxed of [false, true]) {
    const x = pvpArmy(id, maxed);
    for (let s = 1; s <= 20; s++) { if (pvp(x, x, s).won) atkWins++; n++; }
  }
  const rate = atkWins / n;
  assert.ok(rate > 0.35 && rate < 0.65, `attacker win rate ${rate}`);
});

test("PvP parity: the defending commander's skills apply", () => {
  const atk = pvpArmy('h9', false);
  let lostVsPlain = 0, lostVsSkilled = 0;
  for (let s = 1; s <= 10; s++) {
    lostVsPlain   += pvp(atk, pvpArmy('h33', false), s).lost;
    lostVsSkilled += pvp(atk, pvpArmy('h33', true), s).lost;
  }
  assert.ok(lostVsSkilled > lostVsPlain);
});

test('defender actions are logged as enemy actions', () => {
  const r = pvp(pvpArmy('h9', true), pvpArmy('h33', true), 3);
  const acts = r.report.rounds.flatMap(x => x.actions);
  assert.ok(acts.some(a => a.actor === 'Enemy Cmd' && a.isPlayer === false && a.dmg > 0));
  assert.ok(acts.some(a => a.isSkill && a.isPlayer === false));   // defender's commander skills fire
});

// ── Pirates (Phase 2) ─────────────────────────────────────────────────────────
function pirBattle(id, skillPoints, seed, defCmd) {
  const slots = ['swashbucklers', 'gunners'].map(b => ({ branch: { faction: 'pirates', branch: b, tier: 2 }, troops: 10000 }));
  const cmd = { id, n: id, faction: 'pirates', cls: 'attacker', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 20000, troopBranch: slots[0].branch, troopSlots: slots, skillPoints };
  const fb = { faction: 'holyknights', branch: 'templars', tier: 2 };
  const def = defCmd || { id: 0, n: 'D', faction: 'holyknights', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 20000, troopBranch: fb, troopSlots: [{ branch: fb, troops: 20000 }] };
  return seeded(() => simBattle(cmd, 20000, { defCmd: def, garrison: 100, owner: 'ai' }, 0), seed);
}
const lostOver = (id, sp, n = 10) => { let t = 0; for (let s = 1; s <= n; s++) t += pirBattle(id, sp, s).lost; return t; };

test('pirates: Hot Sauce burn damage + Burn helps (was cutting our own damage)', () => {
  assert.ok(lostOver('h2', { sam_hot_sauce: 15 }) < lostOver('h2', {}));
});

test("pirates: Whiskey Barrel's Drunk lasts into the next round (enemy misses in round 4 after a round-3 Drunk)", () => {
  const misses = sp => { let n = 0; for (let s = 1; s <= 20; s++) n += (pirBattle('h25', sp, s).report.rounds.find(r => r.round === 4)?.actions || [])
    .filter(a => /missed/.test(a.action) && a.isPlayer === false).length; return n; };
  assert.ok(misses({ reck_whiskey_barrel: 15 }) > misses({}));
});

test("pirates: Captain's Honor confuses Brine (self-debuff) and Around the Block resists enemy stuns", () => {
  let selfConfused = 0;
  for (let s = 1; s <= 20; s++) selfConfused += pirBattle('h13', { bri_captains_honor: 7 }, s).report.rounds.flatMap(x => x.actions)
    .filter(a => a.isConfused && a.isPlayer === false && /own troops/.test(a.action)).length;
  assert.ok(selfConfused > 0);
  const bruk = pvpArmy('h34', true);
  let resisted = 0;
  for (let s = 1; s <= 20; s++) resisted += pirBattle('h1', { fyn_around_the_block: 7 }, s, { ...bruk }).report.rounds.flatMap(x => x.actions)
    .filter(a => /resists/.test(a.action)).length;
  assert.ok(resisted > 0);
});
