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

const COLS = 1845;
const ROWS = 1305;
const IMPASSABLE = new Set();

function adj(c, r) {
  return [[c-1,r],[c+1,r],[c,r-1],[c,r+1]]
    .filter(([tc, tr]) => {
      if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) return false;
      if (IMPASSABLE.has(`${tc},${tr}`)) return false;
      return true;
    })
    .map(([tc, tr]) => `${tc},${tr}`);
}

function bfsPath(fromKey, toKey) {
  if (fromKey === toKey) return [fromKey];
  const parent  = new Map();
  const queue   = [fromKey];
  parent.set(fromKey, null);
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const [cc, cr] = cur.split(',').map(Number);
    for (const nk of adj(cc, cr)) {
      if (parent.has(nk)) continue;
      parent.set(nk, cur);
      if (nk === toKey) {
        const path = [];
        let k = nk;
        while (k !== null) { path.push(k); k = parent.get(k); }
        return path.reverse();
      }
      queue.push(nk);
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
