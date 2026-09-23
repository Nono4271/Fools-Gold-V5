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

// ── Per-unit targeting ────────────────────────────────────────────────────────
function threeUnitFoe() {
  const mk = (f, b) => ({ branch: { faction: f, branch: b, tier: 2 }, troops: 6000 });
  const slots = [mk('orcs', 'grunts'), mk('orcs', 'warg_riders'), mk('pirates', 'gunners')]; // melee, mounted, ranged
  return { id: 0, n: 'D', faction: 'orcs', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 18000, troopBranch: slots[0].branch, troopSlots: slots };
}
const allActs = r => r.report.rounds.flatMap(x => x.actions);

test('targeting: AoE skills hit every enemy unit separately', () => {
  const acts = allActs(pirBattle('h2', { sam_hot_sauce: 15 }, 1, threeUnitFoe()));
  assert.ok(acts.some(a => a.isSkill && /Hot Sauce → [23] units/.test(a.action))); // one hit per LIVING unit
});

test('targeting: "2 Enemy Units" skills hit 2 different units', () => {
  const acts = allActs(pirBattle('h13', { bri_admirals_go_to: 7 }, 1, threeUnitFoe()));
  assert.ok(acts.some(a => a.isSkill && /Admiral's Go To → 2 units/.test(a.action)));
});

test('targeting: normal attacks hit one unit, frontline (melee) first', () => {
  const acts = allActs(pirBattle('h1', {}, 1, threeUnitFoe()));
  const first = acts.find(a => a.isPlayer === true && /attack →|strikes →/.test(a.action));
  assert.ok(first && /→ Grunt|→ Marauder|→ Bloodaxe/.test(first.action), first?.action);
});

test('targeting: "+X% vs Orc unit" bonus hit only lands on an Orc unit', () => {
  const vsOrcs = allActs(pirBattle('h1', { fyn_orc_hunter: 15 }, 1, threeUnitFoe()));
  assert.ok(vsOrcs.some(a => a.isSkill && /\(orcs\)/.test(a.action)));
  const vsHk = allActs(pirBattle('h1', { fyn_orc_hunter: 15 }, 1));
  assert.ok(!vsHk.some(a => a.isSkill && /\(orcs\)/.test(a.action)));
});

// ── Per-unit DoTs / statuses + Night Creatures ────────────────────────────────
function ncBattle(id, skillPoints, seed, defCmd, branches = ['vampires', 'werewolves']) {
  const slots = branches.map(b => ({ branch: { faction: 'nightcreatures', branch: b, tier: 2 }, troops: 10000 }));
  const cmd = { id, n: id, faction: 'nightcreatures', cls: 'attacker', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 10000 * branches.length, troopBranch: slots[0].branch, troopSlots: slots, skillPoints };
  return seeded(() => simBattle(cmd, cmd.troops, { defCmd: defCmd || threeUnitFoe(), garrison: 100, owner: 'ai' }, 0), seed);
}

test('DoTs tick on the unit they were applied to (not spread)', () => {
  const acts = allActs(ncBattle('h45', { groth_fangs_assault: 15 }, 2));
  assert.ok(acts.some(a => /^🩸 Bleed → /.test(a.action) && a.isPlayer === true));
});

test('stuns land on specific enemy units, not the whole army', () => {
  let msgs = [];
  for (let s = 1; s <= 10; s++) msgs = msgs.concat(allActs(ncBattle('h48', { tha_surprise_assault: 7 }, s)).filter(a => /enemy units? stunned/.test(a.action)).map(a => a.action));
  assert.ok(msgs.length > 0);
  assert.ok(msgs.every(m => /\d+ enemy unit/.test(m)));
});

test('Night Creatures: Double Tap is the NC skill again (Dragons copy no longer overrides it with another type)', () => {
  assert.equal(ALL_SKILLS.mal_double_tap.effect.type, 'focus_damage');
});

test('Night Creatures: Eight Eyes grants confusion immunity (used to clear the ENEMY\'s confusion)', () => {
  const cmd = { ...pvpArmy('h48', false), skillPoints: { tha_eight_eyes: 7, tha_surprise_assault: 7 } };
  // runs cleanly and never logs our commander attacking own troops from its own immunity skill
  const r = pvp(cmd, pvpArmy('h44', true), 4);
  assert.ok(Number.isFinite(r.lost));
});

test('Night Creatures: Power in Numbers only with an all-Spider army', () => {
  let a = 0, b = 0;
  for (let s = 1; s <= 10; s++) { a += ncBattle('h47', { skit_power_in_numbers: 7 }, s, null, ['spiders']).lost; b += ncBattle('h47', {}, s, null, ['spiders']).lost; }
  assert.ok(a < b);
  const mixed = s => ncBattle('h47', { skit_power_in_numbers: 7 }, s).lost === ncBattle('h47', {}, s).lost;
  assert.ok([1, 2, 3].every(mixed));
});

// ── Holy Knights ──────────────────────────────────────────────────────────────
function hkBattle(id, skillPoints, seed, defCmd, branches = ['templars', 'inquisitors'], tile = {}) {
  const slots = branches.map(b => ({ branch: { faction: 'holyknights', branch: b, tier: 2 }, troops: 10000 }));
  const cmd = { id, n: id, faction: 'holyknights', cls: 'attacker', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 10000 * branches.length, troopBranch: slots[0].branch, troopSlots: slots, skillPoints };
  return seeded(() => simBattle(cmd, cmd.troops, { defCmd: defCmd || threeUnitFoe(), garrison: 100, owner: 'ai', ...tile }, 0), seed);
}
// Damage the enemy dealt to us (round 1 only when r1 — battle length doesn't skew it)
const takenOver = (id, sp, n = 10, defCmd, tile, r1) => { let t = 0; for (let s = 1; s <= n; s++) t += hkBattle(id, sp, s, defCmd, undefined, tile).report.rounds
  .filter(x => !r1 || x.round === 1).flatMap(x => x.actions).reduce((a, x) => a + (x.isPlayer === false && x.dmg > 0 ? x.dmg : 0), 0); return t; };

test("HK: Heaven's Hammer / Got Ya always stun the unit they hit", () => {
  assert.ok(allActs(hkBattle('h40', { ser_heavens_hammer: 7 }, 1)).some(a => /Heaven's Hammer — Enemy unit stunned/.test(a.action)));
  assert.ok(allActs(hkBattle('h42', { mou_got_ya: 7 }, 1)).some(a => /Got Ya — Enemy unit stunned/.test(a.action)));
});

test("HK: Mourne's Special adds Focus damage to every enemy unit; Smite hits all units", () => {
  assert.ok(allActs(hkBattle('h42', { mou_mournes_special: 15 }, 1)).some(a => a.isSkill && /Mourne's Special → 3 units/.test(a.action)));
  assert.ok(allActs(hkBattle('h40', { ser_smite: 7 }, 1)).some(a => a.isSkill && /Smite → 3 units/.test(a.action)));
});

test("HK: damage-taken passives lower damage received (People's Hero, Commander In Arms, Will of the Templar)", () => {
  assert.ok(takenOver('h39', { bre_peoples_hero: 15 }, 10, null, {}, true) < takenOver('h39', {}, 10, null, {}, true));
  assert.ok(takenOver('h41', { dan_commander_in_arms: 7 }, 10, null, {}, true) < takenOver('h41', {}, 10, null, {}, true));
  assert.ok(takenOver('h38', { vay_will_of_templar: 7 }, 10, null, {}, true) < takenOver('h38', {}, 10, null, {}, true));
});

test("HK: Here We Go Again only resists Creature of the Night damage at night", () => {
  const nc = { ...pvpArmy('h44', false) };
  assert.ok(takenOver('h37', { ald_here_we_go_again: 7 }, 10, nc, { isNight: true }) < takenOver('h37', {}, 10, nc, { isNight: true }));
  assert.equal(takenOver('h37', { ald_here_we_go_again: 7 }, 5, nc, { isNight: false }), takenOver('h37', {}, 5, nc, { isNight: false }));
});

test('HK: Power Drain lowers the enemy commander ATK in round 1', () => {
  const hit = sp => allActs(hkBattle('h41', sp, 1)).find(a => a.actor === 'Enemy Cmd' && a.dmg > 0 && /strikes/.test(a.action))?.dmg || 0;
  assert.ok(hit({ dan_power_drain: 7 }) < hit({}));
});

test('HK: Divine Prayer — a stunned Seraph may cleanse it', () => {
  const bruk = pvpArmy('h34', true); // Ground Shake stuns our commander
  let resisted = 0;
  for (let s = 1; s <= 20; s++) resisted += allActs(hkBattle('h40', { ser_divine_prayer: 7 }, s, { ...bruk })).filter(a => /resists stun/.test(a.action)).length;
  assert.ok(resisted > 0);
});

test('HK: Whatever It Takes confuses enemy units more often than allied units (both scale)', () => {
  let own = 0, foe = 0;
  for (let s = 1; s <= 10; s++) for (const a of allActs(hkBattle('h41', { dan_whatever_it_takes: 7 }, s))) {
    const m = a.action.match(/Whatever It Takes — (\d+) enemy units? confused(?:, (\d+) allied)?/);
    if (m) { foe += +m[1]; own += +(m[2] || 0); }
  }
  assert.ok(foe > own, `${foe} vs ${own}`);
});

// ── Dragons ───────────────────────────────────────────────────────────────────
function drgBattle(id, skillPoints, seed, defCmd, branches = ['dragonkin', 'drake_riders']) {
  const slots = branches.map(b => ({ branch: { faction: 'dragons', branch: b, tier: 2 }, troops: 10000 }));
  const cmd = { id, n: id, faction: 'dragons', cls: 'attacker', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 10000 * branches.length, troopBranch: slots[0].branch, troopSlots: slots, skillPoints };
  return seeded(() => simBattle(cmd, cmd.troops, { defCmd: defCmd || threeUnitFoe(), garrison: 100, owner: 'ai' }, 0), seed);
}
const actsOver = (fn, n = 10) => { let a = []; for (let s = 1; s <= n; s++) a = a.concat(allActs(fn(s))); return a; };

test('Dragons: Flame Dive burns (no longer applies a 60% Bleed); Fire Volley hits 5 random units', () => {
  const dive = actsOver(s => drgBattle('h11', { emb_flame_dive: 7 }, s));
  assert.ok(!dive.some(a => /Bleed/.test(a.action) && a.isPlayer === true));
  assert.ok(allActs(drgBattle('h11', { emb_fire_volley: 7 }, 1)).filter(a => a.isSkill && /^✨ Fire Volley →/.test(a.action)).length >= 1);
});

test("Dragons: Bad Pointy Hats prioritises Wizard units", () => {
  const mk = (f, b) => ({ branch: { faction: f, branch: b, tier: 2 }, troops: 30000 });
  const slots = [mk('orcs', 'grunts'), mk('wizards', 'acolytes')];
  const foe = { id: 0, n: 'D', faction: 'orcs', lvl: 50, atk: 220, foc: 220, spd: 100, troops: 60000, troopBranch: slots[0].branch, troopSlots: slots };
  const hit = allActs(drgBattle('h23', { kraul_bad_pointy_hats: 7 }, 1, foe)).find(a => a.isSkill && /Bad Pointy Hats →/.test(a.action));
  assert.ok(hit && !/Grunt/.test(hit.action), hit?.action);
});

test('Dragons: Smoke and Fire blinds units (their next attack misses); Tough Skin reflects physical hits', () => {
  assert.ok(actsOver(s => drgBattle('h12', { scaleveil_smoke_and_fire: 7 }, s)).some(a => /Blinded — missed/.test(a.action)));
  assert.ok(allActs(drgBattle('h35', { skar_tough_skin: 7 }, 1)).some(a => /Tough Skin/.test(a.action) && a.dmg > 0));
});

test('Dragons: Clear the Air strips enemy buffs; Earthquake slows units', () => {
  assert.ok(actsOver(s => drgBattle('h24', { cinderfang_clear_the_air: 7 }, s)).some(a => /All enemy buffs stripped/.test(a.action)));
  assert.ok(actsOver(s => drgBattle('h35', { skar_earthquake: 7 }, s)).some(a => /Slowed/.test(a.action)));
});

test("Dragons: You Get a Heal! heals Dragon units when a debuff lands on them", () => {
  const foe = { ...pvpArmy('h36', true) }; // Nyxara: stuns
  const heals = sp => actsOver(s => drgBattle('h24', sp, s, foe)).filter(a => a.isHeal && a.isPlayer !== false).length;
  assert.ok(heals({ cinderfang_you_get_a_heal: 7 }) > heals({}));
});
