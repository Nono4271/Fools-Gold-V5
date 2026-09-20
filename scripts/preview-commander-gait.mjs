// Builds the approved separate-limb motion into production sprite atlases.
// Reuses transparent idle artwork; no new generated poses or mirrored strides.
import {createRequire} from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {footStep, kneePosition, limbMatrix, bootMatrix, armTip, WALK_CYCLE_MS, WALK_FRAMES} from '../src/utils/commanderGait.js';

const out = new URL('../docs/walk-preview/', import.meta.url);
await mkdir(out, {recursive:true});
const rigs = [
  {id:'h1',name:'Redwake Fynn',
    torso:[[109,0],[190,0],[198,73],[180,97],[194,169],[162,187],[120,178],[109,151],[107,91],[92,74]],
    arms:[{pivot:[106,81],tip:[89,155],poly:[[94,69],[113,82],[112,117],[105,163],[79,174],[65,151],[73,110],[82,86]]},
      {pivot:[187,83],tip:[202,143],poly:[[184,67],[205,86],[219,123],[220,153],[197,163],[184,137],[178,107]]}],
    legs:[{hip:[128,169],knee:[120,205],foot:[114,234],rest:[133,235],
      thigh:[[109,157],[147,166],[141,210],[107,217],[94,195]],shin:[[106,196],[140,201],[139,239],[128,253],[91,254],[91,226]]},
      {hip:[162,163],knee:[173,190],foot:[182,213],rest:[157,224],
      thigh:[[147,153],[182,155],[191,195],[168,212],[143,190]],shin:[[164,183],[195,186],[215,214],[207,231],[179,232],[151,212]]}]},
  {id:'h13',name:'Admiral Brine',
    torso:[[99,0],[204,0],[200,57],[184,70],[185,116],[199,198],[179,217],[129,201],[107,183],[123,117],[119,75],[94,60]],
    arms:[{pivot:[111,80],tip:[104,149],poly:[[91,66],[116,74],[120,110],[116,162],[97,171],[81,151],[82,107]]},
      {pivot:[188,80],tip:[199,139],poly:[[180,66],[200,72],[207,104],[212,139],[201,158],[184,152],[182,121]]}],
    legs:[{hip:[132,183],knee:[121,216],foot:[117,243],rest:[133,243],
      thigh:[[119,173],[147,179],[145,219],[110,224],[105,203]],shin:[[108,207],[140,211],[139,244],[124,256],[95,255],[99,233]]},
      {hip:[162,179],knee:[174,208],foot:[179,231],rest:[155,234],
      thigh:[[144,174],[179,172],[187,213],[157,220]],shin:[[157,202],[184,201],[204,224],[204,242],[175,243],[155,230]]}]}
];
const backs = [
  {torso:[[110,0],[172,0],[179,37],[169,92],[178,157],[142,169],[119,165],[97,169],[98,117],[102,88],[89,65]],
    arms:[{pivot:[92,69],tip:[87,128],poly:[[81,61],[102,71],[101,108],[99,133],[83,145],[74,128],[70,99]]},
      {pivot:[175,88],tip:[192,148],poly:[[165,68],[191,79],[198,107],[211,137],[207,161],[187,168],[175,139],[166,111]]}],
    legs:[{hip:[119,153],knee:[109,191],foot:[108,224],rest:[125,230],thigh:[[100,145],[139,149],[132,187],[122,204],[93,199],[91,180]],shin:[[95,186],[126,188],[130,218],[119,240],[91,240],[91,216]]},
      {hip:[155,153],knee:[160,190],foot:[167,225],rest:[151,239],thigh:[[132,146],[174,150],[181,185],[174,205],[143,205],[137,182]],shin:[[144,189],[176,188],[181,210],[199,218],[196,234],[169,241],[143,235]]}]},
  {torso:[[116,0],[181,0],[181,49],[170,75],[173,117],[194,190],[191,195],[155,196],[120,190],[99,178],[107,145],[119,116],[115,83],[109,57]],
    arms:[{pivot:[112,76],tip:[107,127],poly:[[104,63],[119,66],[124,100],[117,130],[108,143],[96,131],[94,107],[100,85]]},
      {pivot:[173,79],tip:[190,139],poly:[[166,60],[184,69],[190,103],[201,129],[199,148],[185,154],[176,135],[164,108]]}],
    legs:[{hip:[128,181],knee:[126,213],foot:[121,237],rest:[132,238],thigh:[[114,171],[140,178],[141,211],[133,222],[110,219]],shin:[[112,207],[136,209],[135,235],[129,250],[106,249],[105,234]]},
      {hip:[165,182],knee:[165,214],foot:[175,239],rest:[157,247],thigh:[[151,179],[180,181],[181,216],[156,224]],shin:[[155,211],[180,211],[179,229],[198,238],[198,249],[163,252],[154,239]]}]}
];
for(let i=0;i<2;i++) rigs.push({...backs[i],id:rigs[i].id,name:rigs[i].name,back:true});
for (const rig of rigs) {
  const image = await sharp(await readFile(new URL(`../public/commanders/map/${rig.id}-walk-v2.png`,import.meta.url)))
    .extract({left:0,top:rig.back?512:0,width:256,height:256}).png().toBuffer();
  rig.href = 'data:image/png;base64,' + image.toString('base64');
}
function character(rig, now, prefix) {
  let defs='',body='',index=0;
  const part=(poly,matrix=[1,0,0,1,0,0])=>{
    const id=prefix+'p'+index++;
    defs+=`<clipPath id="${id}"><polygon points="${poly.map(p=>p.join(',')).join(' ')}"/></clipPath>`;
    return `<g transform="matrix(${matrix.join(' ')})"><image width="256" height="256" href="${rig.href}" clip-path="url(#${id})"/></g>`;
  };
  // Far arm and both legs behind the coat/apron, near arm in front.
  const arm=(i)=>{
    const a=rig.arms[i],s=footStep(now,i);
    const tip=armTip(a.pivot,a.tip,s.stride);
    return part(a.poly,limbMatrix(a.pivot,a.tip,a.pivot,tip));
  };
  body+=arm(rig.back?0:1);
  for (const i of [1,0]) {
    const l=rig.legs[i],s=footStep(now,i);
    const foot=[l.rest[0]+s.stride*18,l.rest[1]+s.stride*(rig.back?-7:7)-s.lift];
    const upper=Math.hypot(l.knee[0]-l.hip[0],l.knee[1]-l.hip[1]);
    const ankle=[l.foot[0],l.foot[1]-12];
    const targetAnkle=[foot[0],foot[1]-12];
    const lower=Math.hypot(ankle[0]-l.knee[0],ankle[1]-l.knee[1]);
    const knee=kneePosition(l.hip,targetAnkle,upper,lower,1);
    body+=part(l.thigh,limbMatrix(l.hip,l.knee,l.hip,knee));
    // Split at the ankle with a small overlap to hide the joint. The boot
    // translates with its foot target but never rotates with the calf.
    body+=part(clipAtY(l.shin,ankle[1]+3,true),limbMatrix(l.knee,ankle,knee,targetAnkle));
    body+=part(clipAtY(l.shin,ankle[1]-3,false),bootMatrix(l.foot,foot));
  }
  body+=part(rig.torso)+arm(rig.back?1:0);
  return `<defs>${defs}</defs>${body}`;
}
function clipAtY(poly,y,above) {
  const result=[];
  for(let i=0;i<poly.length;i++) {
    const a=poly[i],b=poly[(i+1)%poly.length];
    const inside=p=>above?p[1]<=y:p[1]>=y;
    if(inside(a)) result.push(a);
    if(inside(a)!==inside(b)) {
      const t=(y-a[1])/(b[1]-a[1]);
      result.push([a[0]+t*(b[0]-a[0]),y]);
    }
  }
  return result;
}
if(process.argv.includes('--bake')) {
  // Padded 112px cells keep feet inside the frame and the sheet under 4096px.
  // One standing cell followed by 32 walking cells in each row.
  const cell=112,columns=WALK_FRAMES+1;
  for(let i=0;i<2;i++) {
    const parts=[];
    for(let row=0;row<4;row++) for(let col=0;col<columns;col++) {
      const rig=rigs[i+(row>=2?2:0)];
      const pose=col===0?`<image width="256" height="256" href="${rig.href}"/>`:character(rig,(col-1)*WALK_CYCLE_MS/WALK_FRAMES,`r${row}c${col}`);
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${cell}" viewBox="-16 -16 288 288"><g transform="${row%2?'translate(256 0) scale(-1 1)':''}">${pose}</g></svg>`;
      parts.push({input:await sharp(Buffer.from(svg)).png().toBuffer(),left:col*cell,top:row*cell});
    }
    await sharp({create:{width:cell*columns,height:cell*4,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
      .composite(parts).png().toFile(new URL(`../public/commanders/map/${rigs[i].id}-walk-v3.png`,import.meta.url).pathname);
  }
}
for(let frame=0;frame<32;frame++) {
  const now=frame*1100/32;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="700">
  <rect width="640" height="700" fill="#303b2c"/>
  <path d="M0 329H640" stroke="#738264" opacity=".35"/>
  <g fill="#e2d8b8" font-family="sans-serif" text-anchor="middle"><text x="166" y="35">Redwake Fynn</text><text x="474" y="35">Admiral Brine</text><text x="320" y="380" font-size="13">Rig motion proof • enlarged for inspection • not deployed</text></g>
  ${rigs.map((r,i)=>`<g transform="translate(${38+(i%2)*308} ${80+Math.floor(i/2)*310})"><ellipse cx="144" cy="246" rx="45" ry="10" fill="#131b10" opacity=".5"/>${character(r,now,'r'+i)}</g>`).join('')}
  </svg>`;
  await writeFile(new URL(`frame-${String(frame).padStart(2,'0')}.png`,out),await sharp(Buffer.from(svg)).png().toBuffer());
}
await writeFile(new URL('README.md',out),'# Commander gait proof\n\nExperimental separate-limb animation using existing idle artwork. Not deployed. Needs visual approval; reverse directions and in-game integration remain pending.\n');
console.log('Created 32 motion-proof frames in docs/walk-preview/');
