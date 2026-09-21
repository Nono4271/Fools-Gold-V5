import test from 'node:test';
import assert from 'node:assert/strict';
import {
  statusOf, sendRequest, receiveRequest, acceptRequest, declineRequest, confirmRequest,
  cancelRequest, removeFriend, block, unblock, listByStatus, searchCandidates,
} from '../shared/utils/relationsRules.js';

test('statusOf defaults to "none" for an unknown id or missing map', () => {
  assert.equal(statusOf({}, 'ai_orcs_1'), 'none');
  assert.equal(statusOf(undefined, 'ai_orcs_1'), 'none');
  assert.equal(statusOf({ ai_orcs_1: 'friend' }, 'ai_orcs_1'), 'friend');
});

test('sendRequest: none -> pendingOut, and does not mutate the input', () => {
  const r = {};
  const next = sendRequest(r, 'ai_orcs_1');
  assert.equal(statusOf(next, 'ai_orcs_1'), 'pendingOut');
  assert.deepEqual(r, {}); // input untouched
});

test('sendRequest is a no-op when blocked, already pendingOut, or already friends', () => {
  assert.equal(statusOf(sendRequest({ a: 'blocked' }, 'a'), 'a'), 'blocked');
  const pendingOut = { a: 'pendingOut' };
  assert.equal(sendRequest(pendingOut, 'a'), pendingOut); // same object back
  const friends = { a: 'friend' };
  assert.equal(sendRequest(friends, 'a'), friends);
});

test('sendRequest resolves a mutual case straight to friends', () => {
  const r = { a: 'pendingIn' };
  assert.equal(statusOf(sendRequest(r, 'a'), 'a'), 'friend');
});

test('receiveRequest only applies to a clean "none" relation', () => {
  assert.equal(statusOf(receiveRequest({}, 'a'), 'a'), 'pendingIn');
  const already = { a: 'friend' };
  assert.equal(receiveRequest(already, 'a'), already);
});

test('accept/decline only act on a pendingIn request, and remove or promote it', () => {
  assert.equal(statusOf(acceptRequest({ a: 'pendingIn' }, 'a'), 'a'), 'friend');
  assert.deepEqual(acceptRequest({}, 'a'), {}); // no-op: nothing pending to accept
  assert.equal('a' in declineRequest({ a: 'pendingIn' }, 'a'), false);
  const notPending = { a: 'friend' };
  assert.equal(declineRequest(notPending, 'a'), notPending);
});

test('confirmRequest (the other side accepted) only acts on pendingOut, and is how a local auto-accept resolves a sent request to friend', () => {
  assert.equal(statusOf(confirmRequest({ a: 'pendingOut' }, 'a'), 'a'), 'friend');
  const notSent = { a: 'pendingIn' };
  assert.equal(confirmRequest(notSent, 'a'), notSent);
  // sendRequest then confirmRequest, in one tick, is the local "instant accept" flow.
  assert.equal(statusOf(confirmRequest(sendRequest({}, 'a'), 'a'), 'a'), 'friend');
});

test('cancelRequest only acts on a pendingOut request', () => {
  assert.equal('a' in cancelRequest({ a: 'pendingOut' }, 'a'), false);
  const friends = { a: 'friend' };
  assert.equal(cancelRequest(friends, 'a'), friends);
});

test('removeFriend only acts on an existing friend', () => {
  assert.equal('a' in removeFriend({ a: 'friend' }, 'a'), false);
  const pending = { a: 'pendingOut' };
  assert.equal(removeFriend(pending, 'a'), pending);
});

test('block always wins, overwriting a pending request or a friend; unblock only clears a block', () => {
  assert.equal(statusOf(block({ a: 'friend' }, 'a'), 'a'), 'blocked');
  assert.equal(statusOf(block({ a: 'pendingIn' }, 'a'), 'a'), 'blocked');
  assert.equal('a' in unblock({ a: 'blocked' }, 'a'), false);
  const friends = { a: 'friend' };
  assert.equal(unblock(friends, 'a'), friends); // not blocked -> no-op
});

test('listByStatus returns matching ids, alphabetically, and handles an empty/missing map', () => {
  const r = { c: 'friend', a: 'friend', b: 'blocked' };
  assert.deepEqual(listByStatus(r, 'friend'), ['a', 'c']);
  assert.deepEqual(listByStatus(r, 'blocked'), ['b']);
  assert.deepEqual(listByStatus(r, 'pendingIn'), []);
  assert.deepEqual(listByStatus(undefined, 'friend'), []);
});

test('searchCandidates matches name or id case-insensitively, sorted, and returns everything for an empty query', () => {
  const candidates = [
    { id: 'ai_orcs_1', name: 'Warband 12' },
    { id: 'ai_pirates_2', name: 'Raider 3' },
    { id: 'ai_orcs_9', name: 'Warband 5' },
  ];
  // "Warband 12" sorts before "Warband 5" — plain string comparison, not numeric.
  assert.deepEqual(searchCandidates('warband', candidates).map(c => c.id), ['ai_orcs_1', 'ai_orcs_9']);
  assert.deepEqual(searchCandidates('PIRATES', candidates).map(c => c.id), ['ai_pirates_2']);
  assert.equal(searchCandidates('', candidates).length, 3);
  assert.deepEqual(searchCandidates('zzz', candidates), []);
});
