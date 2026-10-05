const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../scenes/koi.html'),'utf8');
const code = html.slice(html.indexOf('const shoals = []'),html.indexOf('// Geometry buffers reused per fish.'));
function pond(w=1600,h=1000,side='right') {
  const ctx=vm.createContext({});
  vm.runInContext(`
    const W=${w},H=${h},SEG=14,TAU=Math.PI*2;
    let seed=41,calmFade=0;
    const rand=(a=1,b)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const r=seed/4294967296;return b===undefined?r*a:a+r*(b-a)};
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
    const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
    const noise1=x=>Math.sin(x)*0.5;
    const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d};
    const LW={layout:{clear:${side==='left'?'[.28,1]':'[0,.72]'},avoid:[]},env:{weather:'clear'}};
    const L={night:0,sunDir:[-.6,-.8]},cur={inside:false,lastMove:0,x:0,y:0},fish=[],pellets=[];
    const vertices=[];const vtx=(...v)=>vertices.push(v);
    ${code}
    spawnShoals();
    function advance(n=300){for(let i=0;i<n;i++)updateShoals(1/30,i/30+10)}
    function mean(k){return minnows.reduce((s,f)=>s+f[k],0)/minnows.length}
  `,ctx);
  return js=>vm.runInContext(js,ctx);
}
test('shoals scale from 12 to 27 to 30 fish (bigger, fewer), with only one gold group',()=>{
  for(const [w,h,count,groups] of [[800,600,12,2],[1600,1000,27,3],[3440,1440,30,3]]) {
    const p=pond(w,h);assert.equal(p('minnows.length'),count);assert.equal(p('shoals.length'),groups);
    assert.ok(p('shoals.every(s=>s.end-s.start>=6&&s.end-s.start<=10)'));
    assert.ok(p('shoals.filter(s=>s.gold).length<=1'));
  }
});
test('live meshes bend their spines and forked tails, using existing batch modes',()=>{
  const p=pond();p('emitShoals();globalThis.before=vertices.map(v=>v.slice());vertices.length=0;advance(1);emitShoals()');
  assert.equal(p('vertices.length'),27*48);
  assert.ok(p('vertices.every(v=>v.every(Number.isFinite)&&(v[8]===3||v[8]===4))'));
  assert.ok(p('vertices.some((v,i)=>Math.abs(v[0]-before[i][0])>.01)'));
});
test('fast swept segments startle crossed schools even when both endpoints miss',()=>{
  const p=pond();p('const s=shoals[0];scareShoals(s.x-400,s.y,s.x+400,s.y)');
  assert.equal(p('shoals[0].fear'),1);
  p('advance(360)');assert.equal(p('shoals[0].fear'),0);
  assert.ok(p('minnows.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y))'));
  assert.ok(p('shoals.every(s=>minnows.slice(s.start,s.end).every(f=>Math.hypot(f.x-s.x,f.y-s.y)<180))'));
});
test('rain deepens shoals; night and calm reduce actual travel',()=>{
  const day=pond(),rain=pond(),night=pond(),calm=pond();
  rain("LW.env.weather='rain'");night('L.night=1');calm('calmFade=1');
  for(const p of [day,rain,night,calm]) p('advance(300)');
  assert.ok(rain('mean("z")')>day('mean("z")')+.18);
  assert.ok(night('shoalClock')<day('shoalClock')*.7);
  assert.ok(calm('shoalClock')<day('shoalClock')*.65);
});
test('food is nibbled in small portions and reserved for adult koi',()=>{
  const p=pond();p('const f=minnows[0];pellets.push({x:f.x,y:f.y,bits:1,eaten:false});advance(240)');
  assert.ok(p('pellets[0].bits<1&&pellets[0].bits>=.65&&!pellets[0].eaten'));
});
test('adult koi bodies shoulder minnows off food',()=>{
  const p=pond();p(`const f=minnows[0];const x=f.x,y=f.y;
    pellets.push({x,y,bits:1,eaten:false});
    fish.push({x:x+50,y,L:180,p:Array.from({length:SEG},(_,i)=>[x+50-i*180/(SEG-1),y])});
    advance(30)`);
  assert.equal(p('pellets[0].bits'),1);
});
test('left layout mirrors shoal spawn and targets avoid widget rectangles',()=>{
  const right=pond(),left=pond(1600,1000,'left');
  assert.ok(Math.abs(left('mean("x")')-right('mean("x")')-1600*.28)<.001);
  right('LW.layout.avoid=[[.25,.2,.2,.5]];advance(300)');
  assert.ok(right('shoals.every(s=>!(s.tx>400&&s.tx<720&&s.ty>200&&s.ty<700))'));
});
test('still cursor preserves personal space rather than creating a feeding swarm',()=>{
  const p=pond();p('cur.inside=true;cur.x=shoals[0].x;cur.y=shoals[0].y;advance(600)');
  assert.ok(p('minnows.every(f=>Math.hypot(f.x-cur.x,f.y-cur.y)>50)'));
});
