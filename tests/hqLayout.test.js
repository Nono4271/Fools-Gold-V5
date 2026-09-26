import test from 'node:test';
import assert from 'node:assert/strict';
import {HQ_ART,hqArtFor,hqFootprint,fitHqArt} from '../src/utils/hqLayout.js';
import {isoXY,TW,TH} from '../shared/constants/geometry.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('HQ diamond is exactly the union boundary of its nine occupied cells',()=>{
 const c=31,r=27,fp=hqFootprint(c,r),tl=isoXY(c-1,r-1),br=isoXY(c+1,r+1);
 near(fp.points[1],tl.cy);near(fp.points[5],br.cy+TH);
 near(fp.points[2]-fp.points[6],3*TW);near(fp.points[5]-fp.points[1],3*TH);
 near(fp.y,isoXY(c,r).cy+TH/2);
});

for(const [faction,art] of Object.entries(HQ_ART)){
 test(`${faction}: foundation fits, centres and uses the maximum proportional size`,()=>{
  const fp=hqFootprint(19,33),fit=fitHqArt(art,fp);
  near(fit.width/fit.height,art.size[0]/art.size[1]);
  const uv=art.ground.map(([x,y])=>{
   const dx=(x-fit.anchorX*art.size[0])*fit.scale;
   const dy=(y-fit.anchorY*art.size[1])*fit.scale;
   assert.ok(Math.abs(dx)/fp.halfWidth+Math.abs(dy)/fp.halfHeight<=.975+1e-8);
   return [dx/fp.halfWidth+dy/fp.halfHeight,dx/fp.halfWidth-dy/fp.halfHeight];
  });
  let extent=0;
  for(const axis of [0,1]){const values=uv.map(p=>p[axis]);near(Math.min(...values)+Math.max(...values),0);extent=Math.max(extent,Math.max(...values));}
  near(extent,.975); // Enlarging further would cross the intended inset.
  const relocated=fitHqArt(art,hqFootprint(200,100));
  near(relocated.scale,fit.scale);near(relocated.anchorY,fit.anchorY);
  for(const zoom of [.3,.8,1.5]) near(fit.width*zoom/fit.height/zoom,art.size[0]/art.size[1]);
 });
}

test('all eight factions and player/AI fallback use calibrated art',()=>{
 assert.equal(Object.keys(HQ_ART).length,8);
 assert.equal(hqArtFor('wizards','player'),HQ_ART.wizards);
 assert.equal(hqArtFor('unknown','ai'),HQ_ART.orcs);
 assert.equal(hqArtFor(null,'player'),HQ_ART.pirates);
});
