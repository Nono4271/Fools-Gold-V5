import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSiegeOutcome, garrisonResetMs } from '../shared/utils/captureRules.js';
import { FORTRESS_MIN_POWER_LEVEL } from '../shared/constants/crew.js';
import { canBuildFortressOnTile } from '../shared/utils/crewFortress.js';

// A P10+ "structure" tile as mapGen actually produces it (stampP10): isKeep
// true, powerLevel >= FORTRESS_MIN_POWER_LEVEL, no owner yet, no isGate.
function p10Tile(overrides) {
  return { isKeep: true, isGate: false, powerLevel: FORTRESS_MIN_POWER_LEVEL, siege: 8000, siegeMax: 8000, garrison: 500, ...overrides };
}

test('clearing a P10+ structure leaves a bare, unclaimed tile (no owner, no keep flag)', () => {
  const tile = p10Tile();
  const { captured, patch } = resolveSiegeOutcome({ tile, siegePower: 9000, capture: { owner: 'player' } });
  assert.equal(captured, true);
  assert.equal(patch.isKeep, false);
  assert.equal(patch.owner, null);
  assert.equal(patch.ownerPlayerId, undefined);
  assert.equal(patch.faction, undefined);
  assert.equal(patch.garrison, 0);
  assert.deepEqual(patch.defeatedWaves, []);
});

test('the bare tile left behind is immediately buildable per canBuildFortressOnTile', () => {
  const tile = p10Tile();
  const { patch } = resolveSiegeOutcome({ tile, siegePower: 9000, capture: { owner: 'player' } });
  const clearedTile = { ...tile, ...patch };
  assert.equal(canBuildFortressOnTile(clearedTile).ok, true);
});

test('a partial hit on a P10+ structure just sieges it — no owner/isKeep change', () => {
  const tile = p10Tile();
  const { captured, patch } = resolveSiegeOutcome({ tile, siegePower: 100 });
  assert.equal(captured, false);
  assert.equal(patch.isKeep, undefined); // untouched — still whatever the tile already had
  assert.equal(patch.owner, undefined);
  assert.equal(patch.siege, 7900);
});

test('a named region Keep (powerLevel 4) still captures normally — owner assigned, isKeep untouched', () => {
  const tile = { isKeep: true, isGate: false, powerLevel: 4, siege: 500, siegeMax: 500, regionKey: 'oathkeep' };
  const { captured, patch } = resolveSiegeOutcome({ tile, siegePower: 999, capture: { owner: 'player', faction: 'holyknights' } });
  assert.equal(captured, true);
  assert.equal(patch.owner, 'player');
  assert.equal(patch.faction, 'holyknights');
  assert.equal('isKeep' in patch, false); // region Keeps stay Keeps forever
});

test('a Gate never gets the P10+ treatment even if it somehow carried a high powerLevel', () => {
  const tile = { isKeep: true, isGate: true, powerLevel: 12, siege: 5000, siegeMax: 5000 };
  const { captured, patch } = resolveSiegeOutcome({ tile, siegePower: 9000, capture: { owner: 'player' } });
  assert.equal(captured, true);
  assert.equal(patch.owner, 'player');
  assert.equal('isKeep' in patch, false);
});

test('garrisonResetMs is unaffected by the fix (still keyed off the pre-capture tile)', () => {
  const tile = p10Tile();
  assert.equal(garrisonResetMs(tile) > 0, true);
});
