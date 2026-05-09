// ── Pathfinding Web Worker ────────────────────────────────────────────────────
// Runs BFS path calculation off the main thread so tile-tap → march dispatch
// is never blocked by a 700×700 grid search.
//
// The map IMPASSABLE set is sent once after map gen, then reused for all
// subsequent path requests. Each request gets a unique requestId so the main
// thread can match responses to the pending tap/click that triggered them.
//
// Message protocol (main → worker):
//   { type: 'setImpassable', keys: string[] }          — send once after map gen
//   { type: 'findPath', requestId, from, to }          — find BFS path
//   { type: 'findPathBatch', requests: [{requestId, from, to}] } — batch (AI multi-march)
//
// Message protocol (worker → main):
//   { type: 'pathResult',      requestId, path }       — null path = unreachable
//   { type: 'pathResultBatch', results: [{requestId, path}] }

const COLS = 700;
const ROWS = 700;
const IMPASSABLE = new Set();

function isShore(c, r) {
  return c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
}

function adj(c, r) {
  return [[c-1,r],[c+1,r],[c,r-1],[c,r+1]]
    .filter(([tc, tr]) => {
      if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) return false;
      if (isShore(tc, tr)) return false;
      if (IMPASSABLE.has(`${tc},${tr}`)) return false;
      return true;
    })
    .map(([tc, tr]) => `${tc},${tr}`);
}

function bfsPath(fromKey, toKey) {
  if (fromKey === toKey) return [fromKey];
  const queue    = [[fromKey, [fromKey]]];
  const visited  = new Set([fromKey]);
  while (queue.length) {
    const [cur, path] = queue.shift();
    const [cc, cr] = cur.split(',').map(Number);
    for (const nk of adj(cc, cr)) {
      if (visited.has(nk)) continue;
      visited.add(nk);
      const newPath = [...path, nk];
      if (nk === toKey) return newPath;
      queue.push([nk, newPath]);
    }
  }
  return null;
}

self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'setImpassable') {
    IMPASSABLE.clear();
    for (const k of e.data.keys) IMPASSABLE.add(k);
    return;
  }

  if (type === 'findPath') {
    const { requestId, from, to } = e.data;
    const path = bfsPath(from, to);
    self.postMessage({ type: 'pathResult', requestId, path });
    return;
  }

  if (type === 'findPathBatch') {
    const results = e.data.requests.map(({ requestId, from, to }) => ({
      requestId,
      path: bfsPath(from, to),
    }));
    self.postMessage({ type: 'pathResultBatch', results });
  }
};
