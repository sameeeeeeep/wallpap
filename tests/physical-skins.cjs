const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../scenes/physical-skins.js'),'utf8'),context);
const {rosetteAt,pendulumAngle}=context.PhysicalSkins;
test('rational harmonograph orbits close, including the rotary drop pendulum',()=>{
 for(const [p,q] of [[1,1],[3,2],[4,3],[5,4],[6,5],[45,32]])for(const spin of [-1,1])for(const R3 of [0,.12]){
  const period=12,s={A:.9,f1:2*Math.PI*q/period,f2:2*Math.PI*p/period,p:[.37,1.25],k1:1.4,k2:1.3,spin,R3,f3:2*Math.PI*(p+q)/period};
  const a=rosetteAt(0,s),b=rosetteAt(period,s);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-12,`${p}:${q} orbit did not close`);
  for(let i=0;i<100;i++)assert.ok(rosetteAt(i*period/100,s).every(Number.isFinite));
 }
});
test('all fifteen pendulums revive at the phrase period without staying synchronized',()=>{
 for(let i=0;i<15;i++)assert.ok(Math.abs(pendulumAngle(i,0,.4)-pendulumAngle(i,1,.4))<1e-12);
 const spread=Array.from({length:15},(_,i)=>pendulumAngle(i,.137,.4));
 assert.ok(Math.max(...spread)-Math.min(...spread)>.6);
});
