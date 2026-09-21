import test from 'node:test';
import assert from 'node:assert/strict';
import { NYRO_ID, NYRO_NAME } from '../shared/constants/nyro.js';
import { crewChannel, factionChannel, createDmChannel, createGroupChannel } from '../shared/utils/chatRules.js';
import { nyroEligible, generateNyroChatter } from '../shared/utils/nyroChatter.js';

test('nyroEligible: faction chat only when it matches the player\'s faction', () => {
  const ch = factionChannel('pirates');
  assert.equal(nyroEligible(ch, { playerFacKey: 'pirates' }), true);
  assert.equal(nyroEligible(ch, { playerFacKey: 'orcs' }), false);
  assert.equal(nyroEligible(ch, {}), false);
});

test('nyroEligible: crew chat only when Nyro is actually a member of that crew', () => {
  const crew = { id: 'c1', members: ['player', NYRO_ID] };
  const ch = crewChannel(crew);
  assert.equal(nyroEligible(ch, { crews: [crew] }), true);

  const crewWithout = { id: 'c2', members: ['player'] };
  assert.equal(nyroEligible(crewChannel(crewWithout), { crews: [crewWithout] }), false);
});

test('nyroEligible: dm/group only when Nyro is a participant; World never', () => {
  const dmWith = createDmChannel('player', NYRO_ID);
  assert.equal(nyroEligible(dmWith, {}), true);
  const dmWithout = createDmChannel('player', 'ai_orcs_1');
  assert.equal(nyroEligible(dmWithout, {}), false);

  const groupWith = createGroupChannel('Squad', ['player', NYRO_ID], { ownerId: 'player' });
  assert.equal(nyroEligible(groupWith, {}), true);
  const groupWithout = createGroupChannel('Squad', ['player', 'ai_orcs_1'], { ownerId: 'player' });
  assert.equal(nyroEligible(groupWithout, {}), false);

  assert.equal(nyroEligible({ id: 'world', type: 'world' }, {}), false);
});

test('generateNyroChatter returns null when Nyro isn\'t eligible for the channel', () => {
  const ch = factionChannel('pirates');
  assert.equal(generateNyroChatter(ch, { playerFacKey: 'orcs' }, 1), null);
});

test('generateNyroChatter builds a message from Nyro with a faction-flavored line in faction/crew chat', () => {
  const ch = factionChannel('orcs');
  const msg = generateNyroChatter(ch, { playerFacKey: 'orcs', now: 1000 }, 42);
  assert.ok(msg);
  assert.equal(msg.senderId, NYRO_ID);
  assert.equal(msg.senderName, NYRO_NAME);
  assert.equal(msg.channelId, ch.id);
  assert.equal(typeof msg.text, 'string');
  assert.ok(msg.text.length > 0);
});

test('generateNyroChatter uses the personal line pool (not faction lines) in a DM', () => {
  const dm = createDmChannel('player', NYRO_ID);
  const msg = generateNyroChatter(dm, { playerFacKey: 'pirates', now: 1000 }, 7);
  assert.ok(msg);
  // Personal lines never mention faction-specific flavor words like "cutlass"/"WAAAGH".
  assert.equal(/cutlass|WAAAGH|ley lines/i.test(msg.text), false);
});

test('generateNyroChatter is deterministic for the same channel id + seed', () => {
  const ch = factionChannel('dragons');
  const a = generateNyroChatter(ch, { playerFacKey: 'dragons', now: 5000 }, 99);
  const b = generateNyroChatter(ch, { playerFacKey: 'dragons', now: 5000 }, 99);
  assert.equal(a.text, b.text);
});
