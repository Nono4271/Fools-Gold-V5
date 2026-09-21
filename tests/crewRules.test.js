import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crewMemberCapForLevel, crewFortressSlotsForLevel, applyCrewXp, isValidEmblem,
  CREW_PRIVACY, DEFAULT_EMBLEM, EMBLEM_SHAPES, EMBLEM_ICONS, EMBLEM_COLORS,
} from '../shared/constants/crew.js';
import {
  roleOf, canPromote, canDemote, canKick, canDisband, canManageSubchannels,
  canInviteOrAccept, canManageFortress, validateCrewCreation, createCrew,
  isSearchable, joinModeFor, addCrewXp, fortressSlotsAvailable,
  addContribution, contributionOf, spendContribution,
  canEditAnnouncement, canSetTarget, updateAnnouncement, setCrewTarget, clearCrewTarget,
} from '../shared/utils/crewRules.js';
import { CREW_LANGUAGES, DEFAULT_CREW_LANGUAGE } from '../shared/constants/crew.js';

test('crewMemberCapForLevel: +5 every 2 levels, caps at 100 by level 20', () => {
  assert.equal(crewMemberCapForLevel(1), 50);
  assert.equal(crewMemberCapForLevel(2), 55);
  assert.equal(crewMemberCapForLevel(4), 60);
  assert.equal(crewMemberCapForLevel(20), 100);
  assert.equal(crewMemberCapForLevel(50), 100);
});

test('crewFortressSlotsForLevel: 2 base, +1 at 15/30/45, caps at 5', () => {
  assert.equal(crewFortressSlotsForLevel(1), 2);
  assert.equal(crewFortressSlotsForLevel(14), 2);
  assert.equal(crewFortressSlotsForLevel(15), 3);
  assert.equal(crewFortressSlotsForLevel(30), 4);
  assert.equal(crewFortressSlotsForLevel(45), 5);
  assert.equal(crewFortressSlotsForLevel(50), 5);
});

test('applyCrewXp rolls over multiple level-ups in one call and never exceeds level 50', () => {
  const { level, xp } = applyCrewXp(1, 0, 1_000_000_000);
  assert.equal(level, 50);
  assert.equal(xp, 0);
});

test('isValidEmblem rejects anything outside the fixed catalogs', () => {
  assert.equal(isValidEmblem(DEFAULT_EMBLEM), true);
  assert.equal(isValidEmblem({ shape: 'shield', icon: 'skull', color: '#ffffff' }), false);
  assert.equal(isValidEmblem(null), false);
});

test('validateCrewCreation enforces name/abbr/description/emblem/privacy', () => {
  assert.deepEqual(validateCrewCreation({ name: 'Iron Tide', abbr: 'IRON' }), []);
  const errs = validateCrewCreation({ name: 'ab', abbr: 'TOOLONG', description: 'x'.repeat(300), emblem: {}, privacy: 'nope' });
  assert.equal(errs.length, 5);
});

test('createCrew defaults: founder is sole member, locked privacy, level 1, empty officers/fortresses', () => {
  const crew = createCrew({ id: 'crew_1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', founderId: 'player' });
  assert.deepEqual(crew.members, ['player']);
  assert.equal(crew.founder, 'player');
  assert.deepEqual(crew.officers, []);
  assert.equal(crew.privacy, CREW_PRIVACY.LOCKED);
  assert.equal(crew.level, 1);
  assert.equal(crew.cap, 50);
  assert.deepEqual(crew.fortresses, []);
  assert.equal(crew.subChannels.length, 2);
});

function crewWith(overrides) {
  return createCrew({ id: 'crew_1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', founderId: 'f', ...overrides });
}

test('roleOf / permission matrix: founder > officer > member', () => {
  let crew = crewWith({});
  crew = { ...crew, members: ['f', 'o', 'm'], officers: ['o'] };
  assert.equal(roleOf(crew, 'f'), 'founder');
  assert.equal(roleOf(crew, 'o'), 'officer');
  assert.equal(roleOf(crew, 'm'), 'member');
  assert.equal(roleOf(crew, 'nobody'), null);

  assert.equal(canPromote(crew, 'f'), true);
  assert.equal(canPromote(crew, 'o'), false);
  assert.equal(canDemote(crew, 'o'), false);
  assert.equal(canDisband(crew, 'o'), false);
  assert.equal(canManageSubchannels(crew, 'o'), false);
  assert.equal(canManageSubchannels(crew, 'f'), true);

  // Kick rules: founder kicks anyone but self/founder; officer kicks members only.
  assert.equal(canKick(crew, 'f', 'o'), true);
  assert.equal(canKick(crew, 'f', 'm'), true);
  assert.equal(canKick(crew, 'f', 'f'), false);
  assert.equal(canKick(crew, 'o', 'm'), true);
  assert.equal(canKick(crew, 'o', 'f'), false);
  assert.equal(canKick(crew, 'm', 'o'), false);

  assert.equal(canInviteOrAccept(crew, 'f'), true);
  assert.equal(canInviteOrAccept(crew, 'o'), true);
  assert.equal(canInviteOrAccept(crew, 'm'), false);

  assert.equal(canManageFortress(crew, 'o'), true);
  assert.equal(canManageFortress(crew, 'm'), false);
});

test('privacy: searchability and join mode', () => {
  const open = crewWith({ privacy: CREW_PRIVACY.OPEN });
  const locked = crewWith({ privacy: CREW_PRIVACY.LOCKED });
  const priv = crewWith({ privacy: CREW_PRIVACY.PRIVATE });
  assert.equal(isSearchable(open), true);
  assert.equal(isSearchable(locked), true);
  assert.equal(isSearchable(priv), false);
  assert.equal(joinModeFor(open), 'instant');
  assert.equal(joinModeFor(locked), 'request');
  assert.equal(joinModeFor(priv), 'invite_only');
});

test('addCrewXp grows cap with level and never shrinks it below the current value', () => {
  let crew = crewWith({});
  crew = { ...crew, cap: 100 }; // pretend it was already bumped up somehow
  crew = addCrewXp(crew, 1); // trivial XP, shouldn't level up
  assert.equal(crew.cap, 100); // unchanged, not clamped back down to level-1's 50
});

test('fortressSlotsAvailable accounts for slots already used', () => {
  let crew = crewWith({});
  assert.equal(fortressSlotsAvailable(crew), 2);
  crew = { ...crew, fortresses: [{ id: 'ft1' }] };
  assert.equal(fortressSlotsAvailable(crew), 1);
});

test('contribution points: add/read/spend, insufficient balance returns null', () => {
  let crew = crewWith({});
  crew = addContribution(crew, 'f', 100);
  assert.equal(contributionOf(crew, 'f'), 100);
  const afterSpend = spendContribution(crew, 'f', 60);
  assert.equal(contributionOf(afterSpend, 'f'), 40);
  assert.equal(spendContribution(crew, 'f', 999), null);
});

test('EMBLEM catalogs are non-empty and DEFAULT_EMBLEM is drawn from them', () => {
  assert.ok(EMBLEM_SHAPES.length > 0 && EMBLEM_ICONS.length > 0 && EMBLEM_COLORS.length > 0);
  assert.ok(EMBLEM_SHAPES.includes(DEFAULT_EMBLEM.shape));
});

test('createCrew defaults language and validateCrewCreation rejects a bogus one', () => {
  const crew = createCrew({ id: 'c1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', founderId: 'f' });
  assert.equal(crew.language, DEFAULT_CREW_LANGUAGE);
  assert.equal(crew.target, null);
  assert.deepEqual(validateCrewCreation({ name: 'Iron Tide', abbr: 'IRON', language: 'Klingon' }), ['Invalid language selection']);
  assert.deepEqual(validateCrewCreation({ name: 'Iron Tide', abbr: 'IRON', language: CREW_LANGUAGES[1] }), []);
});

test('announcement: founder-only edit', () => {
  let crew = createCrew({ id: 'c1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', founderId: 'f' });
  crew = { ...crew, members: ['f', 'o', 'm'], officers: ['o'] };
  assert.equal(canEditAnnouncement(crew, 'f'), true);
  assert.equal(canEditAnnouncement(crew, 'o'), false);
  const updated = updateAnnouncement(crew, 'f', 'For glory and gold!');
  assert.equal(updated.description, 'For glory and gold!');
  const rejected = updateAnnouncement(crew, 'o', 'Sneaky edit');
  assert.equal(rejected.description, crew.description); // officer's edit is a no-op
});

test('rally target: founder/officer can set and clear, member cannot', () => {
  let crew = createCrew({ id: 'c1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', founderId: 'f' });
  crew = { ...crew, members: ['f', 'o', 'm'], officers: ['o'] };
  assert.equal(canSetTarget(crew, 'o'), true);
  assert.equal(canSetTarget(crew, 'm'), false);

  const withTarget = setCrewTarget(crew, 'o', { tileKey: '5,7', label: 'Rally here!' });
  assert.deepEqual(withTarget.target, { tileKey: '5,7', label: 'Rally here!', setBy: 'o', setAt: withTarget.target.setAt });

  const memberAttempt = setCrewTarget(crew, 'm', { tileKey: '1,1', label: 'nope' });
  assert.equal(memberAttempt.target, null); // no-op

  const cleared = clearCrewTarget(withTarget, 'f');
  assert.equal(cleared.target, null);
});
