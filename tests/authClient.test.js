import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser stubs (playerIdentity.js only needs localStorage + fetch).
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};
const { registerAccount, loginAccount, getAccountUsername } = await import('../src/utils/playerIdentity.js');

const respond = (status, body, { json = true } = {}) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => { if (!json) throw new SyntaxError('not json'); return body; },
});

test('a static host answering 405/404 (no game server behind /api) gives a clear message, not "Request failed"', async () => {
  globalThis.fetch = respond(405, '<html>Method Not Allowed</html>', { json: false });
  await assert.rejects(() => registerAccount('someuser', 'secret1'), /isn't reachable from this site \(HTTP 405\)/);
});

test('an SPA fallback returning HTML with 200 is also detected as "no server"', async () => {
  globalThis.fetch = respond(200, '<!doctype html>', { json: false });
  await assert.rejects(() => loginAccount('someuser', 'secret1'), /isn't reachable from this site \(HTTP 200\)/);
});

test('a network failure (offline, CORS, mixed content) says the server can\'t be reached', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(() => registerAccount('someuser', 'secret1'), /Can't reach the game server/);
});

test('server validation errors pass through unchanged', async () => {
  globalThis.fetch = respond(400, { error: 'Username already taken' });
  await assert.rejects(() => registerAccount('someuser', 'secret1'), /Username already taken/);
  globalThis.fetch = respond(500, { error: 'Account server error — try again later' });
  await assert.rejects(() => registerAccount('someuser', 'secret1'), /Account server error/);
});

test('a good response stores the account and returns its id', async () => {
  globalThis.fetch = respond(200, { accountId: 'acct_abc', username: 'someuser', lastSessionId: 'fg-123' });
  const id = await registerAccount('someuser', 'secret1');
  assert.equal(id, 'acct_abc');
  assert.equal(getAccountUsername(), 'someuser');
  assert.equal(store.foolsgold_player_id, 'acct_abc');
  assert.equal(store.foolsgold_session_id, 'fg-123');
});
