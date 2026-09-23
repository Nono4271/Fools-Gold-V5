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
