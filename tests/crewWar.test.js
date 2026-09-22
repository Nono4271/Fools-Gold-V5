import test from 'node:test';
import assert from 'node:assert/strict';
import { WAR_DECLARE_TO_START_MS, WAR_DURATION_MS, WAR_COOLDOWN_MS } from '../shared/constants/crew.js';
import {
  createCrew, canDeclareWar, canCancelWar, crewWarPhase, isWarActive, declareWar, cancelWar,
} from '../shared/utils/crewRules.js';

function crewWith(overrides) {
  return { ...createCrew({ id: 'c1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', founderId: 'f' }), ...overrides };
}

test('createCrew: war starts null (peace)', () => {
  const crew = crewWith({});
  assert.equal(crew.war, null);
  assert.equal(crewWarPhase(crew), 'peace');
});

test('canDeclareWar/canCancelWar: founder or officer only', () => {
  const crew = crewWith({ members: ['f', 'o', 'm'], officers: ['o'] });
  assert.equal(canDeclareWar(crew, 'f'), true);
  assert.equal(canDeclareWar(crew, 'o'), true);
  assert.equal(canDeclareWar(crew, 'm'), false);
  assert.equal(canCancelWar(crew, 'f'), true);
  assert.equal(canCancelWar(crew, 'm'), false);
});

test('declareWar: no-op for a non-founder/officer', () => {
  const crew = crewWith({ members: ['f', 'm'] });
  const result = declareWar(crew, 'm', 1000);
  assert.equal(result, crew); // unchanged
  assert.equal(result.war, null);
});

test('declareWar: sets startsAt/endsAt/cooldownEndsAt from the declare timestamp', () => {
  const crew = crewWith({});
  const now = 1_000_000;
  const result = declareWar(crew, 'f', now);
  assert.equal(result.war.declaredAt, now);
  assert.equal(result.war.declaredBy, 'f');
  assert.equal(result.war.startsAt, now + WAR_DECLARE_TO_START_MS);
  assert.equal(result.war.endsAt, now + WAR_DECLARE_TO_START_MS + WAR_DURATION_MS);
  assert.equal(result.war.cooldownEndsAt, now + WAR_DECLARE_TO_START_MS + WAR_DURATION_MS + WAR_COOLDOWN_MS);
});

test('declareWar: no-op if not currently at peace (already declared/active/cooldown)', () => {
  const now = 1_000_000;
  const declared = declareWar(crewWith({}), 'f', now);
  const redeclared = declareWar(declared, 'f', now + 1000);
  assert.equal(redeclared, declared); // unchanged — still the original declaration
});

test('crewWarPhase walks declared -> active -> cooldown -> peace over time', () => {
  const now = 1_000_000;
  const crew = declareWar(crewWith({}), 'f', now);
  assert.equal(crewWarPhase(crew, now), 'declared');
  assert.equal(crewWarPhase(crew, crew.war.startsAt - 1), 'declared');
  assert.equal(crewWarPhase(crew, crew.war.startsAt), 'active');
  assert.equal(isWarActive(crew, crew.war.startsAt), true);
  assert.equal(crewWarPhase(crew, crew.war.endsAt - 1), 'active');
  assert.equal(crewWarPhase(crew, crew.war.endsAt), 'cooldown');
  assert.equal(isWarActive(crew, crew.war.endsAt), false);
  assert.equal(crewWarPhase(crew, crew.war.cooldownEndsAt - 1), 'cooldown');
  assert.equal(crewWarPhase(crew, crew.war.cooldownEndsAt), 'peace');
});

test('cancelWar: only works during the "declared" window, and only for founder/officer', () => {
  const now = 1_000_000;
  const crew = declareWar(crewWith({ members: ['f', 'm'] }), 'f', now);

  // Member can't cancel
  assert.equal(cancelWar(crew, 'm', now + 1), crew);

  // Founder can cancel while still "declared"
  const cancelled = cancelWar(crew, 'f', now + 1);
  assert.equal(cancelled.war, null);
  assert.equal(crewWarPhase(cancelled, now + 1), 'peace');

  // Once active, cancelWar is a no-op
  const activeCrew = { ...crew }; // still same war object
  const attemptAfterActive = cancelWar(activeCrew, 'f', crew.war.startsAt);
  assert.equal(attemptAfterActive, activeCrew); // unchanged, still active
});

test('declareWar is available again once a full declared->active->cooldown cycle passes', () => {
  const now = 1_000_000;
  const crew = declareWar(crewWith({}), 'f', now);
  const afterCooldown = crew.war.cooldownEndsAt;
  assert.equal(crewWarPhase(crew, afterCooldown), 'peace');
  const redeclared = declareWar(crew, 'f', afterCooldown);
  assert.notEqual(redeclared, crew);
  assert.equal(redeclared.war.declaredAt, afterCooldown);
});
