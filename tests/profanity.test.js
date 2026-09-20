import test from 'node:test';
import assert from 'node:assert/strict';
import { censorText, censorWord, DEFAULT_PROFANITY_WORDS } from '../shared/utils/profanity.js';

test('censorWord masks all but the first letter', () => {
  assert.equal(censorWord('shit'), 's***');
  assert.equal(censorWord('a'), '*');
});

test('censorText masks whole-word matches, case-insensitively, and leaves everything else alone', () => {
  assert.equal(censorText('this is SHIT, not a class.'), 'this is S***, not a class.');
  assert.equal(censorText('nothing to see here'), 'nothing to see here');
  // "class" contains "ass" but not as a whole word — must not be censored.
  assert.equal(censorText('take this class'), 'take this class');
  assert.equal(censorText('you ass'), 'you a**');
});

test('censorText handles empty input and a custom/empty word list', () => {
  assert.equal(censorText(''), '');
  assert.equal(censorText(null), null);
  assert.equal(censorText('damn it', []), 'damn it');
  assert.equal(censorText('foo bar', ['foo']), 'f** bar');
});

test('DEFAULT_PROFANITY_WORDS is a non-empty flat list of lowercase words', () => {
  assert.ok(DEFAULT_PROFANITY_WORDS.length > 0);
  assert.ok(DEFAULT_PROFANITY_WORDS.every(w => typeof w === 'string' && w === w.toLowerCase()));
});
