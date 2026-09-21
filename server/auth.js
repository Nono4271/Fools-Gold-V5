/**
 * server/auth.js — minimal username/password accounts.
 *
 * Not a real identity provider: one JSON file per account under
 * server/data/accounts/<username>.json, salted+hashed password (scrypt),
 * no sessions/tokens — the client just gets back an accountId on success
 * and uses it directly as its playerId from then on (see
 * src/utils/playerIdentity.js). Good enough to give a player a stable
 * identity across browsers/devices; not good enough to be a real login
 * system (no email verification, no password reset, no rate limiting).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function accountFilePath(dir, username) {
  const safe = String(username).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return path.join(dir, safe + '.json');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = Buffer.from(crypto.scryptSync(password, salt, 64).toString('hex'));
  const stored = Buffer.from(hash);
  return check.length === stored.length && crypto.timingSafeEqual(check, stored);
}

export function makeAuth(accountsDir) {
  fs.mkdirSync(accountsDir, { recursive: true });

  // Roadmap item: so a login can resume the player's in-progress game
  // instead of always starting a fresh session — one small file per
  // account mapping accountId -> last sessionId it was seen on. Kept
  // separate from the account record itself (which is keyed by username,
  // not accountId) to avoid a username->accountId lookup on every GAME_INIT.
  const sessionsDir = path.join(path.dirname(accountsDir), 'account-sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  function sessionFile(accountId) {
    const safe = String(accountId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(sessionsDir, safe + '.json');
  }
  function recordSession(accountId, sessionId) {
    try { fs.writeFileSync(sessionFile(accountId), JSON.stringify({ sessionId, updatedAt: Date.now() })); }
    catch (e) { console.warn('Failed to record session for account ' + accountId + ':', e.message); }
  }
  function getLastSession(accountId) {
    try { return JSON.parse(fs.readFileSync(sessionFile(accountId), 'utf8')).sessionId || null; }
    catch { return null; }
  }

  function register(username, password) {
    if (typeof username !== 'string' || username.length < 3 || username.length > 20)
      return { error: 'Username must be 3-20 characters' };
    if (!/^[a-zA-Z0-9_-]+$/.test(username))
      return { error: 'Username may only contain letters, numbers, - and _' };
    if (typeof password !== 'string' || password.length < 6)
      return { error: 'Password must be at least 6 characters' };

    const file = accountFilePath(accountsDir, username);
    if (fs.existsSync(file)) return { error: 'Username already taken' };

    const { salt, hash } = hashPassword(password);
    const accountId = 'acct_' + crypto.randomBytes(8).toString('hex');
    fs.writeFileSync(file, JSON.stringify({ accountId, username, salt, hash, createdAt: Date.now() }));
    return { accountId, username, lastSessionId: null };
  }

  function login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string')
      return { error: 'Invalid username or password' };
    const file = accountFilePath(accountsDir, username);
    if (!fs.existsSync(file)) return { error: 'Invalid username or password' };
    let account;
    try { account = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { error: 'Invalid username or password' }; }
    if (!verifyPassword(password, account.salt, account.hash)) return { error: 'Invalid username or password' };
    return { accountId: account.accountId, username: account.username, lastSessionId: getLastSession(account.accountId) };
  }

  return { register, login, recordSession };
}
