const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/plate-fx.js','utf8');
function runtime(life={},paths={}) {
  const calls=[], masks={sky:0,water:0,exposed:1,road:0,walk:0};let def;
  const plate={opt:{},tex:{m_exposed:{}},masks:{},init(){},maskAt:n=>masks[n]||0,toScreen:(x,y)=>[x*1000,y*625]};
  const k={ready:true,W:1000,H:625,res:1,assets:{},L:{day:1,night:1,fog:0,tint:[1,1,1]},stats:{js:0},
    layout:{clearPx:[0,720],avoidPx:[]},breath:{fade:1},restOK:(x,y)=>x<700,
    ripples:{drop:(...a)=>calls.push(['drop',...a])},sound:{plop:()=>calls.push(['plop'])},wind:{puff:()=>calls.push(['puff'])}};
  const Kit={plate:o=>(plate.opt=o,plate),path:p=>({at:u=>[p[0][0]+(p.at(-1)[0]-p[0][0])*u,p[0][1]+(p.at(-1)[1]-p[0][1])*u]}),
    particles:()=>({list:[],init(){},draw(){}}),sprites:draw=>({draw}),sky:()=>({}),light:opt=>({opt}),scene:d=>(def=d,k)};
  const context={window:{},Kit,LW:{calm:false},console,document:{}};
  vm.runInNewContext(source,context);
  const scene=context.window.PlatePresets.create({version:1,layers:{plates:{day:'day.jpg'},masks:{}},life,paths});
  return {scene,def,k,calls,masks,plate,context};
}
test('clicks ripple only on water, breeze on exposed land, and avoid widgets',()=>{
  const r=runtime({click:true,water:{strength:.3}});
  r.masks.water=1;r.def.onDown(300,400,r.k);assert.equal(r.calls[0][0],'drop');
  r.calls.length=0;r.def.onDown(900,400,r.k);assert.equal(r.calls.length,0);
  r.masks.water=0;r.def.onDown(300,400,r.k);assert.equal(r.calls[0][0],'puff');
  r.calls.length=0;r.masks.exposed=0;r.def.onDown(300,400,r.k);assert.equal(r.calls.length,0);
});
test('surface classification never splashes roofs or sky',()=>{
  const r=runtime();assert.equal(r.def.surfaceAt(0,0),'ground');
  r.masks.water=1;assert.equal(r.def.surfaceAt(0,0),'water');
  r.masks.sky=1;assert.equal(r.def.surfaceAt(0,0),null);
  r.masks.sky=0;r.masks.exposed=0;assert.equal(r.def.surfaceAt(0,0),null);
});
test('boats, traffic and walkers need their matching mask and path',()=>{
  for(const [preset,mask] of [['boats','water'],['traffic','road'],['walkers','walk']]) {
    const r=runtime({[preset]:{count:2}},{[mask]:[[.2,.6],[.6,.6]]});
    r.k.assets.boat={};r.k.sheet=()=>({f:{boat:{aspect:.6}}});r.def.setup(r.k);
    const b={line:(...a)=>r.calls.push(['line',...a]),glow:(...a)=>r.calls.push(['glow',...a]),use(){return this},sprite:(...a)=>r.calls.push(['sprite',...a])};
    r.def.layers[2].draw(b,r.k);assert.equal(r.calls.length,0);
    r.masks[mask]=1;r.def.layers[2].draw(b,r.k);assert.ok(r.calls.length>0);
    r.calls.length=0;r.k.layout.avoidPx=[[0,0,1000,625]];
    r.def.layers[2].draw(b,r.k);
    for(const c of r.calls)assert.equal(c[c[0]==='line'?7:c[0]==='sprite'?8:5],0,'avoid region must suppress actors');
  }
});
test('calm holds are stable and shared grade breathes without per-frame art',()=>{
  const r=runtime({calm:'breathing',water:{strength:.3}});
  r.def.breathe(.5,'hold',r.k);const e=r.def.layers[4].opt.exposure;
  r.def.breathe(.5,'hold',r.k);assert.equal(r.def.layers[4].opt.exposure,e);
  r.def.breathe(1,'in',r.k);assert.ok(r.def.layers[4].opt.exposure>e);
});
