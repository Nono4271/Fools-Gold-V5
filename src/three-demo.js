import * as THREE from 'three';
import './three-demo.css';

const root = document.querySelector('#three-demo') || document.querySelector('#root');
root.innerHTML = `
  <div class="demo-ui">
    <div class="top-bar">
      <div class="resource stone">STONE 200,000<small>+200/hr</small></div>
      <div class="resource wood">WOOD 200,000<small>+200/hr</small></div>
      <div class="resource gas">GAS 200,000<small>+200/hr</small></div>
      <div class="resource food">FOOD 200,000<small>+240/hr</small></div>
    </div>
    <div class="badge"><b>3D MAP TEST · V2</b><span>Drag to pan · pinch or wheel to zoom · tap land to select.</span></div>
    <div class="tile-card"><strong id="tile-name">Select land</strong><span id="tile-info">Tap an open tile to preview a march.</span></div>
    <a class="back" href="/">BACK</a>
    <div class="hint">Saltwatch · 3D preview · sample resources</div>
    <div class="controls"><button id="home">HQ</button><button id="angle">ANGLE</button><button id="march" disabled>MARCH</button></div>
  </div>`;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
root.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a211b);
scene.fog = new THREE.FogExp2(0x253028, 0.014);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 180);
let focus = new THREE.Vector3(0, 0, 2.5);
let distance = 50;
let cameraDir = new THREE.Vector3(0.62, 0.78, 0.88).normalize();
function placeCamera() { camera.position.copy(focus).addScaledVector(cameraDir, distance); camera.lookAt(focus); }
placeCamera();

scene.add(new THREE.HemisphereLight(0xaec5bf, 0x2d2418, 1.35));
const sun = new THREE.DirectionalLight(0xffddad, 3.1);
sun.position.set(-24, 40, 18); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45; sun.shadow.bias = -0.0004;
scene.add(sun);

const TILE = 3.2, GRID = 21, HALF = (GRID - 1) / 2;
const world = new THREE.Group(); scene.add(world);
const selectable = [];
const materialCache = new Map();
const mat = (color, roughness = .9, metalness = .02) => {
  const key = `${color}:${roughness}:${metalness}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return materialCache.get(key);
};
const rand = (x, z, salt = 0) => { const n = Math.sin(x * 91.7 + z * 37.3 + salt * 17.1) * 43758.5453; return n - Math.floor(n); };

function grassTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.fillStyle = '#536247'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) {
    const v = 55 + Math.floor(Math.random() * 45);
    g.fillStyle = `rgba(${v},${v + 18},${Math.max(30, v - 16)},${.05 + Math.random() * .12})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1);
  }
  for (let i = 0; i < 28; i++) { g.fillStyle = 'rgba(71,57,35,.06)'; g.beginPath(); g.arc(Math.random()*512,Math.random()*512,15+Math.random()*45,0,Math.PI*2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9,9); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const groundGeo = new THREE.PlaneGeometry(GRID*TILE + 20, GRID*TILE + 20, 48, 48);
const gp = groundGeo.attributes.position;
for (let i=0;i<gp.count;i++) { const x=gp.getX(i), y=gp.getY(i); const edge=Math.max(Math.abs(x),Math.abs(y)); const h=edge>31 ? Math.min(3,(edge-31)*.16) : 0; gp.setZ(i,h); }
groundGeo.computeVertexNormals();
const groundColors = [];
for (let i=0;i<gp.count;i++) {
  const x=gp.getX(i), z=gp.getY(i), v=.82+.12*Math.sin(x*.31)*Math.cos(z*.22)+rand(x,z,2)*.08;
  groundColors.push(v, v, v*.93);
}
groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(groundColors,3));
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors:true, map:grassTexture(), color:0xb2b98c, roughness:1 }));
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; world.add(ground);

const invisibleMat = new THREE.MeshBasicMaterial({ visible:false });
for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) {
  const tile=new THREE.Mesh(new THREE.PlaneGeometry(TILE*.96,TILE*.96),invisibleMat);
  tile.rotation.x=-Math.PI/2; tile.position.set((c-HALF)*TILE,.12,(r-HALF)*TILE); tile.userData={c,r};
  world.add(tile); selectable.push(tile);
}

function mesh(geo, material, x=0,y=0,z=0) { const m=new THREE.Mesh(geo,material); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; return m; }
const trunkMat=mat(0x3b2919), leafMats=[mat(0x183c2b),mat(0x244b31),mat(0x31593a)];
function tree(x,z,s=1) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  g.add(mesh(new THREE.CylinderGeometry(.13*s,.2*s,1.25*s,7),trunkMat,0,.62*s,0));
  for(let i=0;i<4;i++) {
    const canopy=mesh(new THREE.ConeGeometry((.83-i*.15)*s,1.28*s,9),leafMats[i%3],Math.sin(i*2.4)*.1*s,(.95+i*.52)*s,0);
    canopy.rotation.y=rand(x,z,i)*6; g.add(canopy);
  }
  world.add(g);
}
function stoneCluster(x,z,large=false) {
  const g=new THREE.Group(); g.position.set(x,0,z); const count=large?6:3;
  for(let i=0;i<count;i++) { const s=(.38+rand(x,z,i)*.42)*(large?1.15:1); const rock=mesh(new THREE.DodecahedronGeometry(s,0),mat(i%2?0x9a9a8e:0x74766f), (rand(x,z,i+9)-.5)*1.7,s*.62,(rand(x,z,i+18)-.5)*1.2); rock.scale.y=1.2+rand(x,z,i+4)*.5; g.add(rock); }
  world.add(g);
}
function crops(x,z,large=false) {
  const g=new THREE.Group(); g.position.set(x,0,z); const rows=large?5:3;
  for(let i=0;i<rows;i++) for(let j=0;j<(large?8:6);j++) { const stalk=mesh(new THREE.CylinderGeometry(.035,.055,.48,5),mat(0xc99b38), (j-(large?3.5:2.5))*.22,.24,(i-(rows-1)/2)*.3); stalk.rotation.z=(rand(i,j,2)-.5)*.13; g.add(stalk); }
  world.add(g);
}
function gasVents(x,z,large=false) {
  const g=new THREE.Group(); g.position.set(x,0,z); const count=large?5:3;
  for(let i=0;i<count;i++) { const ox=(rand(x,z,i)-.5)*1.55, oz=(rand(x,z,i+7)-.5)*1.2; const rock=mesh(new THREE.DodecahedronGeometry(.35+rand(x,z,i+12)*.25,0),mat(0x33423d),ox,.3,oz); g.add(rock); const plume=mesh(new THREE.ConeGeometry(.18,.9+rand(x,z,i+3)*.6,7),new THREE.MeshBasicMaterial({color:0x47e4d0,transparent:true,opacity:.58}),ox,.95,oz); plume.userData.plume=i; g.add(plume); }
  world.add(g);
}

function masonryTexture() {
  const c=document.createElement('canvas'); c.width=c.height=256;
  const ctx=c.getContext('2d'); ctx.fillStyle='#333735'; ctx.fillRect(0,0,256,256);
  for(let row=0;row<8;row++) for(let col=-1;col<5;col++) {
    const v=76+Math.floor(rand(col,row,6)*30); ctx.fillStyle=`rgb(${v},${v+3},${v-2})`;
    ctx.fillRect(col*64+(row%2)*32+2,row*32+2,60,28);
  }
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  return tex;
}
function createHQ() {
  const g=new THREE.Group(), stone=new THREE.MeshStandardMaterial({map:masonryTexture(),roughness:1}), trim=mat(0x74776a), roof=mat(0x513028), timber=mat(0x3a2920), iron=mat(0x252b29,.65,.5);
  const box=(w,h,d,m,x,y,z)=>{const o=mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);g.add(o);return o;};
  box(8.4,.24,8.4,mat(0x646252),0,.12,0);
  // Courtyard walls leave a real gate opening.
  box(8.4,1.8,.48,stone,0,1.05,-3.9);
  for(const side of [-1,1]) {
    box(.48,1.8,8,stone,side*3.9,1.05,0);
    box(3.1,1.8,.48,stone,side*2.65,1.05,3.9);
    box(.66,.18,8.3,trim,side*3.9,2,0);
    for(let n=0;n<11;n++)box(.66,.45,.38,trim,side*3.9,2.3,-3.7+n*.74);
    for(let n=0;n<5;n++)box(.38,.45,.66,trim,side*(1.2+n*.65),2.3,3.9);
  }
  box(8.4,.18,.66,trim,0,2,-3.9);
  for(let n=0;n<11;n++)box(.4,.45,.66,trim,-3.7+n*.74,2.3,-3.9);
  for(const x of [-3.55,3.55])for(const z of [-3.55,3.55]) {
    box(1.35,2.9,1.35,stone,x,1.6,z);box(1.55,.2,1.55,trim,x,3.08,z);
    for(const dx of [-.55,.55])for(const dz of [-.55,.55])box(.4,.5,.4,trim,x+dx,3.4,z+dz);
    box(.23,.7,.025,iron,x,2.3,z+.685);
  }
  box(3.3,3.5,2.8,stone,-.35,2.05,-.8);
  box(3.5,.22,3,trim,-.35,3.85,-.8);
  const mainRoof=mesh(new THREE.ConeGeometry(2.65,1.35,4),roof,-.35,4.57,-.8); mainRoof.rotation.y=Math.PI/4;mainRoof.scale.z=.87;g.add(mainRoof);
  for(const side of [-1,1]) {
    box(1.25,1.6,2,timber,side*2.2,1.1,-.6);
    const r=mesh(new THREE.ConeGeometry(1.2,.85,4),roof,side*2.2,2.25,-.6);r.rotation.y=Math.PI/4;r.scale.z=1.35;g.add(r);
    // Lit windows with timber mullions, no costly point lights.
    for(let n=0;n<2;n++) {
      box(.32,.47,.04,new THREE.MeshStandardMaterial({color:0xd1a15e,emissive:0xffa343,emissiveIntensity:.6}),side*.9,2.3+n*.85,.62);
      box(.045,.5,.07,timber,side*.9,2.3+n*.85,.66);
    }
    for(let n=0;n<3;n++) {
      const barrel=mesh(new THREE.CylinderGeometry(.22,.25,.55,10),timber,side*2.8,.48,1.3+n*.58);g.add(barrel);
      const hoop=mesh(new THREE.TorusGeometry(.235,.025,4,10),iron,side*2.8,.55,1.3+n*.58);hoop.rotation.x=Math.PI/2;g.add(hoop);
    }
    box(.18,2,.18,timber,side*.8,1.2,3.95);
  }
  box(1.75,.35,.7,stone,0,2.25,3.9);
  // Short approach stays inside the 3x3 footprint.
  for(let n=0;n<4;n++)box(1.7,.10, .3,trim,0,.12,4.05+n*.16);
  const mast=mesh(new THREE.CylinderGeometry(.045,.07,2.5,7),timber,-.35,5.7,-.8);g.add(mast);
  const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#171714';ctx.fillRect(0,0,256,128);ctx.fillStyle='#ddd5b8';ctx.font='72px serif';ctx.textAlign='center';ctx.fillText('☠',122,88);
  const flag=mesh(new THREE.PlaneGeometry(1.6,.85,8,2),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c),side:THREE.DoubleSide}),.45,6.45,-.8);flag.castShadow=false;g.add(flag);
  g.userData.flag=flag;world.add(g);return g;
}
const hq=createHQ();

function border(points,color=0x38d982) { const pts=points.map(([x,z])=>new THREE.Vector3(x,.17,z)); pts.push(pts[0]); const geo=new THREE.BufferGeometry().setFromPoints(pts); const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9})); world.add(line); return line; }
// One joined outline for HQ and two adjacent sample holdings.
border([[-4.8,-4.8],[4.8,-4.8],[4.8,1.6],[8,1.6],[8,8],[4.8,8],[4.8,4.8],[-4.8,4.8]],0x91bb79);

const occupied=new Set(); for(let r=9;r<=11;r++)for(let c=9;c<=11;c++)occupied.add(`${c},${r}`);
const tileResources=new Map();
const resourceTypes=['wood','stone','food','gas'];
for(let r=1;r<GRID-1;r++) for(let c=1;c<GRID-1;c++) {
  if(occupied.has(`${c},${r}`) || rand(c,r,55)>.47) continue;
  const x=(c-HALF)*TILE,z=(r-HALF)*TILE,type=resourceTypes[Math.floor(rand(c,r,6)*4)],large=rand(c,r,3)>.72;
  tileResources.set(`${c},${r}`, {type,large});
  if(type==='wood') { const n=large?7:3; for(let i=0;i<n;i++)tree(x+(rand(c,r,i)-.5)*2,z+(rand(c,r,i+20)-.5)*1.7,.62+rand(c,r,i+30)*.3); }
  else if(type==='stone')stoneCluster(x,z,large); else if(type==='food')crops(x,z,large); else gasVents(x,z,large);
}

// Static props share GPU batches; one draw per geometry/material combination.
world.updateMatrixWorld(true);
const batches=new Map(), staticMeshes=[];
world.traverse(o=>{if(o.isMesh && o!==ground && !selectable.includes(o) && !o.userData.plume && o.userData.plume!==0 && o!==hq.userData.flag) staticMeshes.push(o);});
for(const o of staticMeshes) {
  const key=o.geometry.type+JSON.stringify(o.geometry.parameters)+o.material.uuid;
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
}
for(const objects of batches.values()) {
  if(objects.length<3)continue;
  const batch=new THREE.InstancedMesh(objects[0].geometry,objects[0].material,objects.length);
  objects.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});
  batch.castShadow=batch.receiveShadow=true;world.add(batch);
}
const plumes=[];world.traverse(o=>{if(o.userData.plume!==undefined)plumes.push(o);});

function cylinderBetween(a,b,r,material) { const d=new THREE.Vector3().subVectors(b,a), mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5); const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),7),material,mid.x,mid.y,mid.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()); return m; }
function createCommander() {
  const g=new THREE.Group(); const skin=mat(0x8a4f35), coat=mat(0x243b43), red=mat(0x7d2922), boot=mat(0x191716);
  const body=mesh(new THREE.CylinderGeometry(.34,.48,1.25,8),coat,0,1.72,0); g.add(body); g.add(mesh(new THREE.SphereGeometry(.29,12,8),skin,0,2.55,0));
  const hat=mesh(new THREE.ConeGeometry(.62,.35,3),red,0,2.9,0);hat.rotation.y=Math.PI/2;g.add(hat);
  const limbs=[];
  for(const side of [-1,1]) { const arm=new THREE.Group();arm.position.set(side*.37,2.12,0);arm.add(cylinderBetween(new THREE.Vector3(),new THREE.Vector3(0,-.9,0),.105,skin));g.add(arm); const leg=new THREE.Group();leg.position.set(side*.19,1.15,0);leg.add(cylinderBetween(new THREE.Vector3(),new THREE.Vector3(0,-1.05,0),.14,boot));g.add(leg);limbs.push({arm,leg,side}); }
  g.add(mesh(new THREE.CylinderGeometry(.39,.41,.13,10),mat(0x533825),0,1.35,0));
  g.add(mesh(new THREE.BoxGeometry(.14,.13,.07),mat(0xbf9a4a,.5,.6),0,1.35,.41));
  for(const {leg,arm,side} of limbs) {
    leg.add(mesh(new THREE.BoxGeometry(.25,.19,.43),boot,0,-1.01,.1));
    arm.add(mesh(new THREE.SphereGeometry(.19,8,6),coat,0,-.12,0));
  }
  g.userData.limbs=limbs; g.scale.setScalar(.65); g.position.set(5.8,.12,4.8); world.add(g); return g;
}
const commander=createCommander(); let selected=null, destination=null, marching=false, marchStart=0, marchFrom=new THREE.Vector3(), marchDuration=0;
let pathGroup=null;
function showPath(from,to) {
  if(pathGroup) { pathGroup.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});world.remove(pathGroup); } pathGroup=new THREE.Group(); const dir=new THREE.Vector3().subVectors(to,from),len=dir.length(),unit=dir.clone().normalize();
  for(let d=.8;d<len-.8;d+=1.05) { const p=from.clone().addScaledVector(unit,d); const dash=mesh(new THREE.BoxGeometry(.13,.045,.55),new THREE.MeshBasicMaterial({color:0x6fffe4}),p.x,.24,p.z);dash.rotation.y=Math.atan2(unit.x,unit.z);pathGroup.add(dash); }
  const arrow=mesh(new THREE.ConeGeometry(.38,.9,3),new THREE.MeshBasicMaterial({color:0x6fffe4}),to.x,.25,to.z);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),unit);pathGroup.add(arrow);world.add(pathGroup);
}

const selectMat=new THREE.MeshBasicMaterial({color:0x7cf8e5,transparent:true,opacity:.24,side:THREE.DoubleSide});
const selectFill=new THREE.Mesh(new THREE.PlaneGeometry(TILE*.92,TILE*.92),selectMat);selectFill.rotation.x=-Math.PI/2;selectFill.position.y=.2;selectFill.visible=false;world.add(selectFill);
const selectEdge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(TILE*.92,TILE*.92)),new THREE.LineBasicMaterial({color:0xb7fff4}));selectEdge.rotation.x=-Math.PI/2;selectEdge.position.y=.22;selectEdge.visible=false;world.add(selectEdge);

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const pickPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function groundPoint(clientX,clientY) {
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);
  camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
  return raycaster.ray.intersectPlane(pickPlane,new THREE.Vector3());
}
function pick(x,y) {
  const hit=groundPoint(x,y);if(!hit)return null;
  const c=Math.round(hit.x/TILE)+HALF,r=Math.round(hit.z/TILE)+HALF;
  return c>=0&&r>=0&&c<GRID&&r<GRID?{c,r}:null;
}
const marchButton=document.querySelector('#march');
function selectTile(tile) {
  if(marching)return;
  const {c,r}=tile,x=(c-HALF)*TILE,z=(r-HALF)*TILE;
  selected=tile;selectFill.position.set(x,.2,z);selectEdge.position.set(x,.22,z);selectFill.visible=selectEdge.visible=true;
  const blocked=occupied.has(`${c},${r}`), rss=tileResources.get(`${c},${r}`);
  document.querySelector('#tile-name').textContent=blocked?'PIRATE HQ':`${rss?rss.type.toUpperCase():'GRASSLAND'} · ${c}, ${r}`;
  document.querySelector('#tile-info').textContent=blocked?'Tap land beyond the HQ border.':`${rss?(rss.large?'Large resource site':'Resource cluster'):'Open terrain'} · ready to march`;
  marchButton.disabled=blocked;
  if(!blocked)showPath(commander.position,new THREE.Vector3(x,.12,z));
  else if(pathGroup)pathGroup.visible=false;
}
// One pointer system handles taps, drag, pinch and cancellation on phones.
const pointers=new Map();let dragged=false,gesture=false;
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
  if(pointers.size===1){dragged=false;gesture=false;}else {gesture=true;dragged=true;}
});
canvas.addEventListener('pointermove',e=>{
  const old=pointers.get(e.pointerId);if(!old)return;
  const next={...old,x:e.clientX,y:e.clientY};
  if(pointers.size===2){
    const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];
    const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(next.x-other.x,next.y-other.y);
    if(after>10){distance=THREE.MathUtils.clamp(distance*before/after,24,70);placeCamera();}
  }else if(!gesture){
    if(Math.hypot(next.x-old.startX,next.y-old.startY)>10)dragged=true;
    if(dragged){const a=groundPoint(old.x,old.y),b=groundPoint(next.x,next.y);if(a&&b){focus.add(a.sub(b));focus.x=THREE.MathUtils.clamp(focus.x,-24,24);focus.z=THREE.MathUtils.clamp(focus.z,-24,24);placeCamera();}}
  }
  pointers.set(e.pointerId,next);
});
canvas.addEventListener('pointerup',e=>{
  if(pointers.has(e.pointerId)&&!dragged&&!gesture){const tile=pick(e.clientX,e.clientY);if(tile)selectTile(tile);}
  pointers.delete(e.pointerId);
});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=true;});
canvas.addEventListener('lostpointercapture',e=>pointers.delete(e.pointerId));
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.025,24,70);placeCamera();},{passive:false});
document.querySelector('#home').onclick=()=>{focus.set(0,0,2.5);distance=50;placeCamera();};
let highAngle=false;
document.querySelector('#angle').onclick=()=>{highAngle=!highAngle;cameraDir.set(.62,highAngle?1.18:.78,.88).normalize();placeCamera();};
marchButton.onclick=()=>{
  if(!selected||marching||occupied.has(`${selected.c},${selected.r}`))return;
  destination=new THREE.Vector3((selected.c-HALF)*TILE,.12,(selected.r-HALF)*TILE);
  marchFrom.copy(commander.position);marchStart=performance.now();marchDuration=Math.max(300,marchFrom.distanceTo(destination)*210);marching=true;marchButton.disabled=true;
  document.querySelector('#tile-info').textContent='Marching…';showPath(marchFrom,destination);
};
// Start with a valid destination so the demo is immediately testable.
selectTile({c:13,r:12});

const clock=new THREE.Clock();
function animate(now) {
  requestAnimationFrame(animate); const t=clock.getElapsedTime();
  plumes.forEach(o=>{if(o.userData.plume!==undefined){o.scale.y=.82+Math.sin(t*2.3+o.userData.plume)*.18;o.material.opacity=.42+Math.sin(t*1.7+o.userData.plume)*.1;}});
  if(marching){const p=Math.min(1,(now-marchStart)/marchDuration),ease=p;commander.position.lerpVectors(marchFrom,destination,ease);const dir=new THREE.Vector3().subVectors(destination,marchFrom);commander.rotation.y=Math.atan2(dir.x,dir.z);const step=Math.sin(p*Math.PI*2*Math.max(2,marchDuration/620));commander.userData.limbs.forEach(({arm,leg,side})=>{leg.rotation.x=step*.65*side;arm.rotation.x=-step*.55*side;});if(p>=1){marching=false;commander.userData.limbs.forEach(({arm,leg})=>{arm.rotation.x=leg.rotation.x=0;});document.querySelector('#tile-info').textContent='Arrived · tap another tile to march again.';if(pathGroup)pathGroup.visible=false;}}
  const flag=hq.userData.flag,verts=flag.geometry.attributes.position;
  for(let i=0;i<verts.count;i++)verts.setZ(i,Math.sin(t*2.8+verts.getX(i)*4)*.07*(verts.getX(i)+.8));
  verts.needsUpdate=true;
  selectMat.opacity=.18+Math.sin(t*3)*.07;renderer.render(scene,camera);
}
requestAnimationFrame(animate);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
