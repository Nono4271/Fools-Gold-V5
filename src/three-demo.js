import * as THREE from 'three';
import './three-demo.css';

const root = document.querySelector('#three-demo');
root.innerHTML = `
  <div class="demo-ui">
    <div class="top-bar">
      <div class="resource stone">STONE 200,000<small>+200/hr</small></div>
      <div class="resource wood">WOOD 200,000<small>+200/hr</small></div>
      <div class="resource gas">GAS 200,000<small>+200/hr</small></div>
      <div class="resource food">FOOD 200,000<small>+240/hr</small></div>
    </div>
    <div class="badge"><b>3D MAP TEST</b><span>Drag to pan · pinch or wheel to zoom · tap land to select.</span></div>
    <div class="tile-card"><strong id="tile-name">Select land</strong><span id="tile-info">Tap an open tile to preview a march.</span></div>
    <a class="back" href="/">BACK</a>
    <div class="hint">Procedural test art — judging camera, depth and movement only</div>
    <div class="controls"><button id="home">HQ</button><button id="march" disabled>MARCH</button></div>
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
const cameraDir = new THREE.Vector3(0.62, 0.78, 0.88).normalize();
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
const mat = (color, roughness = .9, metalness = .02) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
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
for (let i=0;i<gp.count;i++) { const x=gp.getX(i), y=gp.getY(i); const edge=Math.max(Math.abs(x),Math.abs(y)); const h=edge>31 ? Math.min(3,(edge-31)*.16) : Math.sin(x*.22)*Math.cos(y*.19)*.08; gp.setZ(i,h); }
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map:grassTexture(), color:0x91a171, roughness:1 }));
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
  for(let i=0;i<3;i++) g.add(mesh(new THREE.ConeGeometry((.72-i*.12)*s,1.35*s,8),leafMats[i],0,(1.15+i*.55)*s,0));
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

function createHQ() {
  const g=new THREE.Group(); const stone=mat(0x4b514d), dark=mat(0x303633), roof=mat(0x682f26), wood=mat(0x422d1d);
  const base=mesh(new THREE.CylinderGeometry(4.2,4.65,1.5,12),stone,0,.75,0); g.add(base);
  const wall=mesh(new THREE.CylinderGeometry(3.55,3.8,1.45,12,1,true),dark,0,1.72,0); g.add(wall);
  const keep=mesh(new THREE.BoxGeometry(3.4,2.7,2.7),stone,0,3.05,.1); g.add(keep);
  const roofMain=mesh(new THREE.ConeGeometry(2.55,1.35,4),roof,0,4.9,.1); roofMain.rotation.y=Math.PI/4; g.add(roofMain);
  for(let i=0;i<6;i++) { const a=i/6*Math.PI*2; const x=Math.sin(a)*3.45,z=Math.cos(a)*3.45; g.add(mesh(new THREE.CylinderGeometry(.72,.82,2.65,8),stone,x,2.05,z)); const rf=mesh(new THREE.ConeGeometry(1.02,1.15,8),roof,x,3.85,z); g.add(rf); }
  const gate=mesh(new THREE.BoxGeometry(1.35,1.65,.38),wood,0,1.05,4.3); g.add(gate);
  const mast=mesh(new THREE.CylinderGeometry(.045,.07,3.2,7),wood,0,6.25,0); g.add(mast);
  const flagCanvas=document.createElement('canvas'); flagCanvas.width=256;flagCanvas.height=128;const f=flagCanvas.getContext('2d');f.fillStyle='#171714';f.fillRect(0,0,256,128);f.fillStyle='#e7dfc5';f.font='72px serif';f.textAlign='center';f.fillText('☠',122,88);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.15),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(flagCanvas),side:THREE.DoubleSide})); flag.position.set(1.2,7.25,0); g.add(flag);
  g.position.y=.08; world.add(g); return g;
}
const hq=createHQ();

function border(points,color=0x38d982) { const pts=points.map(([x,z])=>new THREE.Vector3(x,.17,z)); pts.push(pts[0]); const geo=new THREE.BufferGeometry().setFromPoints(pts); const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9})); world.add(line); return line; }
border([[-5.2,-5.2],[5.2,-5.2],[5.2,5.2],[-5.2,5.2]]);

const occupied=new Set(); for(let r=8;r<=12;r++)for(let c=8;c<=12;c++)occupied.add(`${c},${r}`);
const resourceTypes=['wood','stone','food','gas'];
for(let r=1;r<GRID-1;r++) for(let c=1;c<GRID-1;c++) {
  if(occupied.has(`${c},${r}`) || rand(c,r,55)>.47) continue;
  const x=(c-HALF)*TILE,z=(r-HALF)*TILE,type=resourceTypes[Math.floor(rand(c,r,6)*4)],large=rand(c,r,3)>.72;
  if(type==='wood') { const n=large?7:3; for(let i=0;i<n;i++)tree(x+(rand(c,r,i)-.5)*2,z+(rand(c,r,i+20)-.5)*1.7,.62+rand(c,r,i+30)*.3); }
  else if(type==='stone')stoneCluster(x,z,large); else if(type==='food')crops(x,z,large); else gasVents(x,z,large);
}

function cylinderBetween(a,b,r,material) { const d=new THREE.Vector3().subVectors(b,a), mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5); const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),7),material,mid.x,mid.y,mid.z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()); return m; }
function createCommander() {
  const g=new THREE.Group(); const skin=mat(0x8a4f35), coat=mat(0x243b43), red=mat(0x7d2922), boot=mat(0x191716);
  const body=mesh(new THREE.CylinderGeometry(.34,.48,1.25,8),coat,0,1.72,0); g.add(body); g.add(mesh(new THREE.SphereGeometry(.29,12,8),skin,0,2.55,0));
  const hat=mesh(new THREE.ConeGeometry(.62,.35,3),red,0,2.9,0);hat.rotation.y=Math.PI/2;g.add(hat);
  const limbs=[];
  for(const side of [-1,1]) { const arm=new THREE.Group();arm.position.set(side*.37,2.12,0);arm.add(cylinderBetween(new THREE.Vector3(),new THREE.Vector3(0,-.9,0),.105,skin));g.add(arm); const leg=new THREE.Group();leg.position.set(side*.19,1.15,0);leg.add(cylinderBetween(new THREE.Vector3(),new THREE.Vector3(0,-1.05,0),.14,boot));g.add(leg);limbs.push({arm,leg,side}); }
  g.userData.limbs=limbs; g.scale.setScalar(.9); g.position.set(5.8,.12,4.8); world.add(g); return g;
}
const commander=createCommander(); let destination=null, marching=false, marchStart=0, marchFrom=new THREE.Vector3(), marchDuration=0;
let pathGroup=null;
function showPath(from,to) {
  if(pathGroup) world.remove(pathGroup); pathGroup=new THREE.Group(); const dir=new THREE.Vector3().subVectors(to,from),len=dir.length(),unit=dir.clone().normalize();
  for(let d=.8;d<len-.8;d+=1.05) { const p=from.clone().addScaledVector(unit,d); const dash=mesh(new THREE.BoxGeometry(.13,.045,.55),new THREE.MeshBasicMaterial({color:0x6fffe4}),p.x,.24,p.z);dash.rotation.y=Math.atan2(unit.x,unit.z);pathGroup.add(dash); }
  const arrow=mesh(new THREE.ConeGeometry(.38,.9,3),new THREE.MeshBasicMaterial({color:0x6fffe4}),to.x,.25,to.z);arrow.rotation.x=Math.PI/2;arrow.rotation.z=-Math.atan2(unit.z,unit.x)-Math.PI/2;pathGroup.add(arrow);world.add(pathGroup);
}

const selectMat=new THREE.MeshBasicMaterial({color:0x7cf8e5,transparent:true,opacity:.24,side:THREE.DoubleSide});
const selectFill=new THREE.Mesh(new THREE.PlaneGeometry(TILE*.92,TILE*.92),selectMat);selectFill.rotation.x=-Math.PI/2;selectFill.position.y=.2;selectFill.visible=false;world.add(selectFill);
const selectEdge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(TILE*.92,TILE*.92)),new THREE.LineBasicMaterial({color:0xb7fff4}));selectEdge.rotation.x=-Math.PI/2;selectEdge.position.y=.22;selectEdge.visible=false;world.add(selectEdge);

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function pick(clientX,clientY) { pointer.x=clientX/innerWidth*2-1;pointer.y=-(clientY/innerHeight)*2+1;raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(selectable,false)[0]?.object||null; }
function selectTile(tile) {
  const {c,r}=tile.userData,x=(c-HALF)*TILE,z=(r-HALF)*TILE; selectFill.position.set(x,.2,z);selectEdge.position.set(x,.22,z);selectFill.visible=selectEdge.visible=true; destination=new THREE.Vector3(x,.12,z);showPath(commander.position,destination);
  document.querySelector('#tile-name').textContent=`LAND ${c}, ${r}`;document.querySelector('#tile-info').textContent=occupied.has(`${c},${r}`)?'HQ grounds — choose open land.':'Open terrain · tap MARCH to test movement.';document.querySelector('#march').disabled=occupied.has(`${c},${r}`);
}

let down=null,last=null,dragged=false,pinchStart=0,pinchDistance=distance;
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);down={x:e.clientX,y:e.clientY};last={x:e.clientX,y:e.clientY};dragged=false;});
canvas.addEventListener('pointermove',e=>{if(!last)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)dragged=true;if(dragged){const k=distance*.0016;focus.x-=dx*k;focus.z-=dy*k;placeCamera();}last={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',e=>{if(!dragged){const t=pick(e.clientX,e.clientY);if(t)selectTile(t);}down=last=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.025,24,70);placeCamera();},{passive:false});
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){pinchStart=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);pinchDistance=distance;}},{passive:true});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStart){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);distance=THREE.MathUtils.clamp(pinchDistance*(pinchStart/d),24,70);placeCamera();}},{passive:true});

document.querySelector('#home').onclick=()=>{focus.set(0,0,2.5);distance=50;placeCamera();};
document.querySelector('#march').onclick=()=>{if(!destination)return;marchFrom.copy(commander.position);marchStart=performance.now();marchDuration=Math.max(1200,marchFrom.distanceTo(destination)*210);marching=true;document.querySelector('#march').disabled=true;};

const clock=new THREE.Clock();
function animate(now) {
  requestAnimationFrame(animate); const t=clock.getElapsedTime();
  world.traverse(o=>{if(o.userData.plume!==undefined){o.scale.y=.82+Math.sin(t*2.3+o.userData.plume)*.18;o.material.opacity=.42+Math.sin(t*1.7+o.userData.plume)*.1;}});
  if(marching){const p=Math.min(1,(now-marchStart)/marchDuration),ease=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;commander.position.lerpVectors(marchFrom,destination,ease);const dir=new THREE.Vector3().subVectors(destination,marchFrom);commander.rotation.y=Math.atan2(dir.x,dir.z);const step=Math.sin(p*Math.PI*2*Math.max(2,marchDuration/620));commander.userData.limbs.forEach(({arm,leg,side})=>{leg.rotation.x=step*.65*side;arm.rotation.x=-step*.55*side;});if(p>=1){marching=false;commander.userData.limbs.forEach(({arm,leg})=>{arm.rotation.x=leg.rotation.x=0;});document.querySelector('#tile-info').textContent='Commander arrived and is standing on the destination.';}}
  selectMat.opacity=.18+Math.sin(t*3)*.07;renderer.render(scene,camera);
}
requestAnimationFrame(animate);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
