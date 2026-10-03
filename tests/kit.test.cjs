// Pure parts of scenes/kit.js: palette, steering, rope, noise. (GL parts are verified in the browser.)
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),window={};
vm.runInNewContext(fs.readFileSync(require.resolve('../scenes/kit.js'),'utf8'),{window,Math,Float32Array,performance:{now:()=>0}});
const Kit=window.Kit;
test('palette: day is bright, night is dark and moonlit, golden peaks at sunset',()=>{
 const day=Kit.palette({hour:12,weather:'clear',intensity:.7,wind:.3}),night=Kit.palette({hour:23,weather:'clear',intensity:.7,wind:.3}),dusk=Kit.palette({hour:18,weather:'clear',intensity:.7,wind:.3});
 assert.ok(day.amb>.9&&night.amb<.4);assert.ok(day.day>.95&&night.night>.95);
 assert.ok(dusk.golden>.8&&day.golden<.05);
 assert.ok(night.light[2]>night.light[0],'moonlight is cool');
});
test('palette: weather dims, wets, snows and covers the sky',()=>{
 const clear=Kit.palette({hour:12,weather:'clear'}),rain=Kit.palette({hour:12,weather:'rain',intensity:.8}),snow=Kit.palette({hour:12,weather:'snow',intensity:.8});
 assert.ok(rain.amb<clear.amb&&rain.wet>.9&&rain.cloud>.9);assert.ok(snow.snow>.9&&snow.wet===0);
 for(const w of ['clear','cloudy','rain','storm','snow','fog'])for(const h of [0,5,6.3,9,12,17.6,18.3,19.6,22]){const p=Kit.palette({hour:h,weather:w});for(const v of [...p.light,...p.zenith,...p.horizon,p.amb,...p.sunDir])assert.ok(Number.isFinite(v),`${w}@${h}`);}
});
test('palette: shadows are long at low sun and point away from it',()=>{
 const morning=Kit.palette({hour:7.2}),noon=Kit.palette({hour:12.3});
 assert.ok(Math.hypot(...morning.sunDir)>Math.hypot(...noon.sunDir));
 assert.ok(morning.sunDir[0]<0,'morning sun is in the east, so shadows fall west (screen x grows east)');
});
test('steer: seek/flee/bounds/calmZone push the right way',()=>{
 const a={x:100,y:100,ang:0,seed:1};
 assert.ok(Kit.steer.seek(a,200,100)[0]>0);assert.ok(Kit.steer.flee(a,120,100,50)[0]<0);
 const far=Kit.steer.flee(a,500,100,50);assert.ok(far[0]===0&&far[1]===0);
 assert.ok(Kit.steer.bounds({x:5,y:100},1000,800,60)[0]>0);
 assert.ok(Kit.steer.calmZone({x:950,y:100},1000)[0]<0);assert.equal(Kit.steer.calmZone({x:300,y:100},1000)[0],0);
 assert.equal(Kit.steer.okToRest(800,1000),false);
 const b={x:0,y:0,vx:0,vy:0};for(let i=0;i<60;i++)Kit.steer.move(b,1,0,1/30,100,6);assert.ok(b.x>20&&Math.abs(b.y)<1e-9);
});
test('rope: pinned rope keeps its segment length and sags under gravity',()=>{
 const r=Kit.rope(20,10,0,0);
 for(let i=0;i<240;i++)r.step(1/60,{pinA:[0,0],pinB:[150,0],gravity:400});
 let len=0;for(let i=0;i<19;i++){const [x0,y0]=r.pt(i),[x1,y1]=r.pt(i+1);len+=Math.hypot(x1-x0,y1-y0);}
 assert.ok(Math.abs(len-190)<8,'length ≈ 190, got '+len);assert.ok(r.pt(10)[1]>30,'sags');
});
test('noise is deterministic and bounded',()=>{
 for(let i=0;i<200;i++){const v=Kit.math.noise1(i*.37),w=Kit.math.noise2(i*.31,i*.17);assert.ok(v>=-1&&v<=1&&w>=-1&&w<=1);}
 assert.equal(Kit.math.noise1(3.3),Kit.math.noise1(3.3));
});
test('path: arc-length parameterisation, ends, heading',()=>{
 const p=Kit.path([[0,0],[100,0],[100,100]]);
 assert.equal(p.length,200);
 const m=p.at(0.5);assert.ok(Math.abs(m[0]-100)<1e-9&&Math.abs(m[1])<1e-9);
 const q=p.at(0.75);assert.ok(Math.abs(q[0]-100)<1e-9&&Math.abs(q[1]-50)<1e-9&&Math.abs(q[2]-Math.PI/2)<1e-9);
 const e=p.at(2);assert.ok(e[0]===100&&e[1]===100,'clamped');
 const c=Kit.path([[0,0],[10,0],[10,10],[0,10]],true);assert.equal(c.length,40);const w=c.at(1.25);assert.ok(Math.abs(w[0]-10)<1e-9&&Math.abs(w[1])<1e-9,'closed paths wrap');
});
test('steer: layout-aware clear band (widgets left or right)',()=>{
 const right={W:1000,layout:{clearPx:[0,720]}},left={W:1000,layout:{clearPx:[280,1000]}};
 assert.ok(Kit.steer.calmZone({x:900},right)[0]<0);assert.equal(Kit.steer.calmZone({x:500},right)[0],0);
 assert.ok(Kit.steer.calmZone({x:100},left)[0]>0);assert.equal(Kit.steer.calmZone({x:900},left)[0],0);
 assert.equal(Kit.steer.okToRest(100,left),false);assert.equal(Kit.steer.okToRest(600,left),true);
});
test('moon phase modulates night exposure without losing storm shadow detail',()=>{
 const at=(fraction)=>Kit.palette({hour:2,weather:'storm',intensity:1,astronomy:{sun:{altitude:-1,azimuth:0},moon:{altitude:.5,azimuth:1,fraction,phase:.5}}});
 const dark=at(0),full=at(1);
 assert.ok(dark.amb>=.285,'new moon storm remains legible');
 assert.ok(full.amb>dark.amb,'moon phase affects illumination');
 assert.ok(dark.horizon[2]>dark.zenith[2],'graded night sky');
});
