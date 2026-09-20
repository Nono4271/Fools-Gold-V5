import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canPost, createMessage, createDmChannel, createGroupChannel, resolveChannelsFor,
  worldChannel, factionChannel, crewChannel, factionOf, aiFactionOf,
} from '../shared/utils/chatRules.js';

const crew = { id: 'crew1', name: 'Iron Tide', abbr: 'IRON', faction: 'pirates', members: ['player', 'ai_pirates_2'] };
const ctxPlayer = { crews: [crew], factions: { player: 'pirates' } };

test('aiFactionOf reads the faction out of an AI id, incl. underscore faction keys', () => {
  assert.equal(aiFactionOf('ai_pirates_3'), 'pirates');
  assert.equal(aiFactionOf('ai_ashen_dead_0'), 'ashen_dead');
  assert.equal(aiFactionOf('player'), null);
  assert.equal(aiFactionOf(null), null);
});

test('factionOf prefers ctx.factions for a real player and falls back to the AI id scheme', () => {
  assert.equal(factionOf('player', ctxPlayer), 'pirates');
  assert.equal(factionOf('ai_orcs_1', ctxPlayer), 'orcs');
  assert.equal(factionOf('ai_orcs_1', {}), 'orcs');
  assert.equal(factionOf('player', {}), null);
});

test('canPost: world channel allows anyone with a player id', () => {
  const w = worldChannel();
  assert.equal(canPost('player', w, ctxPlayer), true);
  assert.equal(canPost('ai_orcs_1', w, ctxPlayer), true);
  assert.equal(canPost(null, w, ctxPlayer), false);
});

test('canPost: faction channel requires the same faction', () => {
  const pirates = factionChannel('pirates');
  assert.equal(canPost('player', pirates, ctxPlayer), true);
  assert.equal(canPost('ai_pirates_5', pirates, ctxPlayer), true);
  // Rejected: wrong faction.
  assert.equal(canPost('ai_orcs_1', pirates, ctxPlayer), false);
});

test('canPost: crew channel requires current crew membership', () => {
  const ch = crewChannel(crew);
  assert.equal(canPost('player', ch, ctxPlayer), true);
  assert.equal(canPost('ai_pirates_2', ch, ctxPlayer), true);
  // Rejected: not in the crew.
  assert.equal(canPost('ai_pirates_9', ch, ctxPlayer), false);
  // Unknown crewId -> nobody can post.
  assert.equal(canPost('player', { id: 'crew_x', type: 'crew', crewId: 'nope' }, ctxPlayer), false);
});

test('canPost: dm/group channels require being a listed participant', () => {
  const dm = createDmChannel('player', 'ai_orcs_1');
  assert.equal(canPost('player', dm, ctxPlayer), true);
  assert.equal(canPost('ai_orcs_1', dm, ctxPlayer), true);
  // Rejected: not a participant.
  assert.equal(canPost('ai_orcs_2', dm, ctxPlayer), false);

  const group = createGroupChannel('Raid Squad', ['player', 'ai_orcs_1', 'ai_orcs_2']);
  assert.equal(canPost('ai_orcs_2', group, ctxPlayer), true);
  assert.equal(canPost('ai_orcs_3', group, ctxPlayer), false);
});

test('canPost rejects an unknown channel type and missing playerId/channel', () => {
  assert.equal(canPost('player', { id: 'x', type: 'smoke_signal' }, ctxPlayer), false);
  assert.equal(canPost('player', null, ctxPlayer), false);
  assert.equal(canPost(null, worldChannel(), ctxPlayer), false);
});

test('createDmChannel is order-independent and deterministic', () => {
  const a = createDmChannel('player', 'ai_orcs_1');
  const b = createDmChannel('ai_orcs_1', 'player');
  assert.equal(a.id, b.id);
  assert.deepEqual(a.participants, ['ai_orcs_1', 'player']);
  assert.equal(a.type, 'dm');
});

test('createGroupChannel dedupes participants and falls back to a default name', () => {
  const g = createGroupChannel('  ', ['player', 'ai_orcs_1', 'player']);
  assert.equal(g.name, 'Group');
  assert.deepEqual(g.participants, ['player', 'ai_orcs_1']);
  assert.equal(g.type, 'group');
  const named = createGroupChannel(' Raid Squad ', ['player', 'ai_orcs_1']);
  assert.equal(named.name, 'Raid Squad');
});

test('createMessage trims/clips text and rejects empty text', () => {
  const m = createMessage({ channelId: 'world', senderId: 'player', senderName: 'You', text: '  hi  ', now: 1000 });
  assert.equal(m.text, 'hi');
  assert.equal(m.channelId, 'world');
  assert.equal(m.ts, 1000);
  assert.equal(createMessage({ channelId: 'world', senderId: 'player', senderName: 'You', text: '   ', now: 1000 }), null);
  const long = createMessage({ channelId: 'world', senderId: 'player', senderName: 'You', text: 'x'.repeat(400), now: 1000 });
  assert.equal(long.text.length, 280);
});

test('createMessage enforces canPost when a channel/ctx is supplied', () => {
  const ch = factionChannel('pirates');
  const ok = createMessage({ channelId: ch.id, senderId: 'player', senderName: 'You', text: 'hi', now: 1000, channel: ch, ctx: ctxPlayer });
  assert.ok(ok);
  const blocked = createMessage({ channelId: ch.id, senderId: 'ai_orcs_1', senderName: 'Warband', text: 'hi', now: 1000, channel: ch, ctx: ctxPlayer });
  assert.equal(blocked, null);
});

test('resolveChannelsFor returns world + faction + every crew the player is in + every dm/group they participate in', () => {
  const dm = createDmChannel('player', 'ai_orcs_1');
  const otherDm = createDmChannel('ai_pirates_2', 'ai_orcs_1'); // player not a participant
  const group = createGroupChannel('Squad', ['player', 'ai_pirates_2']);
  const otherCrew = { id: 'crew2', name: 'Sea Ghosts', abbr: 'GHST', faction: 'pirates', members: ['ai_pirates_9'] };

  const channels = resolveChannelsFor('player', {
    crews: [crew, otherCrew], factions: { player: 'pirates' }, dms: [dm, otherDm], groups: [group],
  });

  assert.deepEqual(channels.map(c => c.id).sort(), ['crew_crew1', 'faction_pirates', dm.id, group.id, 'world'].sort());
  assert.equal(channels.find(c => c.type === 'world').id, 'world');
  assert.equal(channels.find(c => c.type === 'faction').faction, 'pirates');
});

test('resolveChannelsFor skips the faction tab when the faction cannot be resolved, and returns just world for an unknown AI-less id', () => {
  const channels = resolveChannelsFor('player', {});
  assert.deepEqual(channels.map(c => c.type), ['world']);
});

test('resolveChannelsFor works for an AI player using its own id-derived faction', () => {
  const channels = resolveChannelsFor('ai_orcs_4', { crews: [crew] });
  assert.deepEqual(channels.map(c => c.id).sort(), ['faction_orcs', 'world'].sort());
});
