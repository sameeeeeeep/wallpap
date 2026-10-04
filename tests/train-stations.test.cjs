const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const sandbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../scenes/train-stations.js'),'utf8'),sandbox);
const {Calls,ease,integral,clearRoute}=sandbox.module.exports;
function simulate(hz,cruise=260) {
 const c=new Calls(()=>.5),t={d:1000,v:cruise};c.request(24);c.tick(0,t,cruise,true,()=>true);
 let stopped;for(let i=0;i<68*hz;i++){c.tick(1/hz,t,cruise,true,()=>true);if(c.phase==='dwell'){stopped??=t.d;assert.equal(t.v,0);assert.equal(t.d,stopped);}}
 return {c,t,stopped};
}
test('station trajectory lands at exact same stop at 10/30/60 Hz and holds for full dwell',()=>{
 for(const speed of [220,240,260,360])for(const hz of [10,30,60]){const {c,t,stopped}=simulate(hz,speed);assert.ok(Math.abs(stopped-(1000+speed*10))<1e-6);assert.ok(Math.abs(t.d-(1000+speed*22))<1e-5);assert.ok(Math.abs(t.v-speed)<1e-6);assert.equal(c.phase,'cruise');}
});
test('velocity, acceleration and jerk meet zero at easing boundaries; integral is correct',()=>{
 assert.equal(ease(0),0);assert.equal(ease(1),1);assert.equal(integral(1),.5);
 const e=1e-5;for(const x of [0,1])assert.ok(Math.abs((ease(x+e)-ease(x-e))/(2*e))<1e-7);
 for(let x=.01;x<1;x+=.03)assert.ok(Math.abs((integral(x+e)-integral(x-e))/(2*e)-ease(x))<1e-8);
});
test('queued stops wait for decoded art and safe route; skips do not interrupt calls',()=>{
 const c=new Calls(()=>0),t={v:260,d:0};c.request();c.tick(1,t,260,false,()=>true);assert.equal(c.phase,'queued');c.tick(1,t,260,true,()=>false);assert.equal(c.phase,'queued');t.skip={};c.tick(1,t,260,true,()=>true);assert.equal(c.phase,'queued');t.skip=null;c.tick(1,t,260,true,()=>true);assert.equal(c.phase,'approach');assert.equal(c.request(),false);
});
test('safe route excludes both tunnel and water, including repeated route boundary',()=>{
 const seg=[{t:'country',a:0,b:6000},{t:'tunnel',a:6000,b:7000},{t:'water',a:7000,b:8000}];
 assert.equal(clearRoute(1000,2600,700,seg,8000),true);assert.equal(clearRoute(3500,2600,700,seg,8000),false);assert.equal(clearRoute(8200,2000,700,seg,8000),false);assert.equal(clearRoute(9000,2600,700,seg,8000),true);
});
test('schedule ranges, calm departure and boundary-crossing ticks remain finite',()=>{
 for(const random of [()=>0,()=>.99999]){const c=new Calls(random);assert.ok(c.wait>=180&&c.wait<=360);const t={v:220,d:1000};c.request();c.tick(0,t,110,true,()=>true);c.tick(20,t,110,true,()=>true);assert.equal(c.phase,'dwell');assert.ok(c.dwell>=20&&c.dwell<=40);c.tick(c.dwell+24,t,110,true,()=>true);assert.equal(c.phase,'cruise');assert.equal(t.v,110);assert.ok(Number.isFinite(t.d));}
});
test('station assets stay unloaded at cruise, release after departure, and reject stale skin loads',async()=>{
 const images=[];const ctx=new Proxy({}, {get:()=>()=>{}});
 const document={createElement:()=>({width:1,height:1,getContext:()=>ctx})};
 class Image {constructor(){this.width=1440;this.height=480;images.push(this);}set src(value){this.path=value;}}
 const box={module:{exports:{}},document,Image,console};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../scenes/train-stations.js'),'utf8'),box);
 const train={d:1000,v:260},view={x0:0,x1:500,cx:250,ww:500,wh:250,y0:0,y1:250};
 const stations=box.module.exports.create({train,skin:()=> 'indian',view:()=>view,env:()=>({}),snow:()=>0,segments:[{t:'country',a:0,b:20000}],routeLength:()=>20000});
 for(let i=0;i<100;i++)stations.update(.01,260);assert.equal(images.length,0);assert.equal(stations.report().bytes,0);
 stations.force(24);assert.equal(images.length,2);stations.reset();images.forEach(i=>i.onload());await new Promise(r=>setImmediate(r));assert.equal(stations.report().loaded,false);
 stations.force(24);images.slice(2).forEach(i=>i.onload());await new Promise(r=>setImmediate(r));assert.equal(stations.report().loaded,true);
 for(let i=0;i<2300;i++)stations.update(1/30,260);
 assert.equal(stations.report().phase,'cruise');assert.equal(stations.report().bytes,0);assert.equal(stations.report().loaded,false);assert.equal(images.length,4,'departure must not repeatedly reload art');
});
test('actor feet remain above the platform fascia and outside all fixture footprints',()=>{
 const {specs}=sandbox.module.exports;
 for(const spec of Object.values(specs)){
  assert.ok(spec.walkFeet>spec.feet&&spec.walkFeet<spec.front);
  const poly=spec.geometry.walkable;assert.ok(spec.walkFeet>=poly[0][1]&&spec.walkFeet<=poly[2][1]);
  for(let x=.02;x<=.98;x+=.005)for(const {rect:[x0,y0,x1,y1]}of spec.geometry.fixtures)assert.equal(x>x0&&x<x1&&spec.walkFeet>y0&&spec.walkFeet<y1,false);
  for(const {rect:[x0,y0,x1,y1]}of spec.geometry.fixtures)assert.equal(spec.vendor>x0&&spec.vendor<x1&&spec.feet>y0&&spec.feet<y1,false);
 }
});
