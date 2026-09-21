import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SUBCHANNELS, defaultCrewSubchannels, defaultGroupSubchannels } from '../shared/constants/chat.js';
import { crewChannel, createGroupChannel } from '../shared/utils/chatRules.js';
import {
  subchannelId, parseSubchannelId, subchannelsOf, addSubchannel, removeSubchannel,
  moveSubchannel, canManageSubchannels, canPostInSubchannel,
} from '../shared/utils/subchannels.js';

test('subchannelId/parseSubchannelId round-trip, including ids that themselves contain underscores', () => {
  const composite = subchannelId('crew_crew_1699000000', 'announcement');
  assert.equal(composite, 'crew_crew_1699000000::announcement');
  assert.deepEqual(parseSubchannelId(composite), { parentId: 'crew_crew_1699000000', subId: 'announcement' });
  assert.equal(parseSubchannelId('crew_no_separator_here'), null);
});

test('defaults: crew gets Announcement (leaderOnly) + General, both locked; group gets General only', () => {
  const crew = defaultCrewSubchannels();
  assert.deepEqual(crew.map(s => s.id), ['announcement', 'general']);
  assert.equal(crew[0].leaderOnly, true);
  assert.equal(crew[0].locked, true);
  assert.equal(crew[1].leaderOnly, false);
  assert.equal(crew[1].locked, true);

  const group = defaultGroupSubchannels();
  assert.deepEqual(group.map(s => s.id), ['general']);
  assert.equal(group[0].locked, true);
});

test('subchannelsOf falls back to defaults for a crew/group that predates this feature', () => {
  const crew = { id: 'c1', members: ['player'], founder: 'player' }; // no subChannels field
  const channel = crewChannel(crew);
  assert.deepEqual(subchannelsOf(channel, { crews: [crew] }), defaultCrewSubchannels());

  const group = createGroupChannel('Squad', ['player', 'ai_orcs_1'], { ownerId: 'player' });
  const bareGroup = { ...group, subChannels: [] };
  assert.deepEqual(subchannelsOf(bareGroup), defaultGroupSubchannels());
});

test('subchannelsOf reads a crew\'s real (non-default) list once it has one', () => {
  const custom = [...defaultCrewSubchannels(), { id: 'strategy', name: 'Strategy', locked: false, leaderOnly: false }];
  const crew = { id: 'c1', members: ['player'], founder: 'player', subChannels: custom };
  const channel = crewChannel(crew);
  assert.deepEqual(subchannelsOf(channel, { crews: [crew] }), custom);
});

test('addSubchannel appends an unlocked, open sub-channel and is a no-op on an empty name or at the cap', () => {
  let list = defaultGroupSubchannels();
  list = addSubchannel(list, 'Strategy');
  assert.equal(list.length, 2);
  assert.deepEqual(list[1], { id: 'strategy', name: 'Strategy', locked: false, leaderOnly: false });

  assert.equal(addSubchannel(list, '   '), list); // empty name -> same array back

  // Fill to the cap, then confirm one more is rejected.
  let full = defaultGroupSubchannels();
  for (let i = 0; i < MAX_SUBCHANNELS - 1; i++) full = addSubchannel(full, `Room ${i}`);
  assert.equal(full.length, MAX_SUBCHANNELS);
  assert.equal(addSubchannel(full, 'One Too Many'), full);
});

test('addSubchannel de-dupes generated ids from similar names', () => {
  let list = addSubchannel(defaultGroupSubchannels(), 'Raid Talk');
  list = addSubchannel(list, 'Raid Talk');
  assert.deepEqual(list.map(s => s.id), ['general', 'raid_talk', 'raid_talk_2']);
});

test('removeSubchannel drops an unlocked sub-channel but protects locked ones', () => {
  let list = addSubchannel(defaultCrewSubchannels(), 'Strategy');
  assert.equal(removeSubchannel(list, 'announcement'), list); // locked -> no-op
  assert.equal(removeSubchannel(list, 'general'), list); // locked -> no-op
  const next = removeSubchannel(list, 'strategy');
  assert.deepEqual(next.map(s => s.id), ['announcement', 'general']);
  assert.equal(removeSubchannel(list, 'nope'), list); // unknown id -> no-op
});

test('moveSubchannel reorders unlocked sub-channels but keeps locked ones pinned', () => {
  let list = defaultCrewSubchannels();
  list = addSubchannel(list, 'Strategy');
  list = addSubchannel(list, 'Off Topic');
  // ['announcement'(locked), 'general'(locked), 'strategy', 'off_topic']
  assert.equal(moveSubchannel(list, 'general', -1), list); // locked -> no-op
  assert.equal(moveSubchannel(list, 'strategy', -1), list); // neighbor (general) is locked -> no-op

  const moved = moveSubchannel(list, 'strategy', 1);
  assert.deepEqual(moved.map(s => s.id), ['announcement', 'general', 'off_topic', 'strategy']);

  assert.equal(moveSubchannel(list, 'off_topic', 1), list); // out of range -> no-op
});

test('canManageSubchannels: crew founder only, group creator only', () => {
  const crew = { id: 'c1', members: ['player', 'ai_orcs_1'], founder: 'player' };
  const crewCh = crewChannel(crew);
  assert.equal(canManageSubchannels('player', crewCh, { crews: [crew] }), true);
  assert.equal(canManageSubchannels('ai_orcs_1', crewCh, { crews: [crew] }), false);

  const group = createGroupChannel('Squad', ['player', 'ai_orcs_1'], { ownerId: 'player' });
  assert.equal(canManageSubchannels('player', group), true);
  assert.equal(canManageSubchannels('ai_orcs_1', group), false);

  assert.equal(canManageSubchannels('player', { id: 'world', type: 'world' }), false);
});

test('canPostInSubchannel gates a leader-only sub-channel to the manager, but General is open to any member', () => {
  const crew = { id: 'c1', members: ['player', 'ai_orcs_1'], founder: 'player' };
  const crewCh = crewChannel(crew);
  const [announcement, general] = defaultCrewSubchannels();

  assert.equal(canPostInSubchannel('player', crewCh, announcement, { crews: [crew] }), true);
  assert.equal(canPostInSubchannel('ai_orcs_1', crewCh, announcement, { crews: [crew] }), false);
  assert.equal(canPostInSubchannel('ai_orcs_1', crewCh, general, { crews: [crew] }), true);
  // Not even a member of the crew at all -> rejected regardless of sub-channel.
  assert.equal(canPostInSubchannel('ai_pirates_9', crewCh, general, { crews: [crew] }), false);
});
