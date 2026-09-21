import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBase } from '../src/utils/apiBase.js';

test('an explicit API url wins and loses trailing slashes', () => {
  assert.equal(resolveApiBase({ apiUrl: 'https://api.example.com/', wsUrl: 'wss://other.example.com' }), 'https://api.example.com');
  assert.equal(resolveApiBase({ apiUrl: '  https://api.example.com///  ' }), 'https://api.example.com');
});

test('without an API url it derives the http(s) origin from the websocket url', () => {
  assert.equal(resolveApiBase({ wsUrl: 'wss://game.example.com' }), 'https://game.example.com');
  assert.equal(resolveApiBase({ wsUrl: 'wss://game.example.com/ws' }), 'https://game.example.com');
  assert.equal(resolveApiBase({ wsUrl: 'ws://localhost:3001' }), 'http://localhost:3001');
  assert.equal(resolveApiBase({ wsUrl: 'https://game.example.com:8443/x' }), 'https://game.example.com:8443');
});

test('with nothing usable it falls back to same-origin (dev proxy)', () => {
  assert.equal(resolveApiBase(), '');
  assert.equal(resolveApiBase({}), '');
  assert.equal(resolveApiBase({ apiUrl: '', wsUrl: '' }), '');
  assert.equal(resolveApiBase({ wsUrl: 'not a url' }), '');
  assert.equal(resolveApiBase({ apiUrl: undefined, wsUrl: null }), '');
});
