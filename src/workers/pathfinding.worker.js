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

const DIRS=[[-1,0,1],[1,0,1],[0,-1,1],[0,1,1],[-1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[1,-1,Math.SQRT2],[1,1,Math.SQRT2]];
function nbrs(c,r) {
  const out=[];
  for(const [dc,dr,cost] of DIRS){
    const tc=c+dc,tr=r+dr,key=`${tc},${tr}`;
    if(tc<0||tr<0||tc>=COLS||tr>=ROWS||IMPASSABLE.has(key)) continue;
    if(dc&&dr&&(IMPASSABLE.has(`${c+dc},${r}`)||IMPASSABLE.has(`${c},${r+dr}`))) continue;
    out.push([key,cost]);
  }
  return out;
}
function octile(a,b){
  const [ac,ar]=a.split(',').map(Number),[bc,br]=b.split(',').map(Number);
  const dx=Math.abs(ac-bc),dy=Math.abs(ar-br);
  return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy);
}
function heapPush(heap,item){heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;}
function heapPop(heap){const first=heap[0],last=heap.pop();if(!heap.length)return first;let i=0;while(true){let l=i*2+1;if(l>=heap.length)break;let r=l+1,c=r<heap.length&&heap[r][0]<heap[l][0]?r:l;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;return first;}

function bfsPath(fromKey, toKey) {
  if (fromKey === toKey) return [fromKey];
  const startH=octile(fromKey,toKey);
  const parent=new Map([[fromKey,null]]),best=new Map([[fromKey,0]]),open=[[startH+startH*1e-6,0,fromKey]];
  while(open.length){
    const [,cost,cur]=heapPop(open);
    if(cost!==best.get(cur)) continue;
    if(cur===toKey){const path=[];let k=cur;while(k!==null){path.push(k);k=parent.get(k);}return path.reverse();}
    const [cc, cr] = cur.split(',').map(Number);
    for(const [nk,moveCost] of nbrs(cc,cr)){
      const nextCost=cost+moveCost;
      if(nextCost >= (best.get(nk) ?? Infinity)) continue;
      best.set(nk,nextCost);
      parent.set(nk, cur);
      const h=octile(nk,toKey);
      heapPush(open,[nextCost+h+h*1e-6,nextCost,nk]);
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
