const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){let time=0;const LW={};vm.runInNewContext(fs.readFileSync(require.resolve('../scenes/pet-motion.js'),'utf8'),{LW,performance:{now:()=>time}});return {LW,tick:ms=>time+=ms};}
test('gait changes finish a stand-up transition instead of restarting it',()=>{
 const {LW,tick}=load(),pet={};LW.poseState(pet,'sleep');LW.poseState(pet,'walk1');
 tick(180);const halfway=LW.poseState(pet,'walk2');assert.equal(halfway.from,'sleep');assert.equal(halfway.mix,.5);
 tick(180);const done=LW.poseState(pet,'walk1');assert.equal(done.layers.length,1);assert.equal(done.layers[0].pose,'walk1');
});
test('pose blends conserve opacity and never disappear at their midpoint',()=>{
 const {LW}=load();for(let i=0;i<=100;i++){const layers=LW.poseFrame('sleep','sit',i/100).layers;assert.ok(Math.abs(layers.reduce((n,l)=>n+l.alpha,0)-1)<1e-9);}
 assert.equal(LW.poseFrame('sleep','sit',.5).layers[0].alpha,.5);
});
test('walking frames retain animal height despite differing image dimensions',()=>{
 const {LW}=load(),walk={naturalHeight:242},next={naturalHeight:197};
 for(const [kind,height] of [['cat',78],['dog',96]]){assert.equal(LW.petUnit(kind,walk)*walk.naturalHeight,height);assert.ok(Math.abs(LW.petUnit(kind,walk)*LW.petPoseScale(kind,'walk2',walk,next)*next.naturalHeight-height)<1e-9);}
});
test('drawn transition paths play forward, reverse and chain through sit',()=>{
 const {LW}=load(),all=()=>true;
 assert.deepEqual([...LW.petPath('walk1','sit',all)],['stand-sit-1','stand-sit-2','stand-sit-3','stand-sit-4','stand-sit-5']);
 assert.deepEqual([...LW.petPath('sit','walk1',all)],['stand-sit-5','stand-sit-4','stand-sit-3','stand-sit-2','stand-sit-1']);
 assert.deepEqual([...LW.petPath('sleep','walk1',all).slice(0,4)],['sit-sleep-5','sit-sleep-4','sit-sleep-3','sit-sleep-2']);
 assert.equal(LW.petPath('sleep','walk1',all).length,9);
 assert.equal(LW.petPath('walk1','sit',q=>q!=='stand-sit'),null);
 assert.equal(LW.petPath('walk1','stretch',all),null);
});
test('in-between layout meets both end poses and mirrors the turn anchor',()=>{
 const {LW}=load(),walk={im:{naturalHeight:200},k:1,fa:.6},sit={im:{naturalHeight:220},k:.8,fa:.5};
 const sz=[[300,200],[280,210],[200,230],[170,235],[150,240]];
 const L=LW.petSeqLayout('stand-sit',sz,walk,sit);
 assert.ok(Math.abs(L[0].k*200-200)<1e-9);assert.ok(Math.abs(L[4].k*240-176)<1e-9);
 assert.equal(L[0].fa,.6);assert.equal(L[4].fa,.5);assert.equal(L[0].near,'walk1');assert.equal(L[4].near,'sit');
 const t=LW.petSeqLayout('turn',sz,walk,walk);assert.ok(Math.abs(t[4].fa-.4)<1e-9);
 const j=LW.petSeqLayout('jump',sz,{im:{naturalWidth:310,naturalHeight:200},k:1,fa:.6},walk);assert.ok(j.every(f=>Math.abs(f.k*300-310*.97)<1e-9&&f.fa===.5));
});
test('a frame carrying its own size overrides the pose scale',()=>{
 const {LW}=load();assert.equal(LW.petPoseScale('dog','stand-sit-3',{naturalHeight:200},{naturalHeight:90,petK:1.3}),1.3);
 assert.equal(LW.petPoseScale('dog','sit',{naturalHeight:200},{naturalHeight:90}),.88);
});
test('in-between playback: pose changes, turns (mirrored when facing left) and cancels',()=>{
 const {LW}=load(),T={has:()=>true},pet={},seen=[];
 assert.equal(LW.petSeqStep(pet,T,'walk1',1,0),null);
 for(let t=0;t<=.5;t+=.05)seen.push(LW.petSeqStep(pet,T,'sit',1,t));
 assert.equal(seen[0],'stand-sit-1');assert.ok(seen.includes('stand-sit-5'));assert.equal(seen[seen.length-1],null);
 assert.equal(LW.petSeqBusy(pet),false);
 LW.petSeqStep(pet,T,'walk1',1,1);assert.equal(LW.petSeqBusy(pet),true);   // standing up
 for(let t=1;t<1.5;t+=.05)LW.petSeqStep(pet,T,'walk1',1,t);
 assert.equal(LW.petSeqStep(pet,T,'walk1',-1,2),'turn-1~m');assert.equal(LW.petSeqStep(pet,T,'walk1',-1,2.25),'turn-5~m');
 assert.equal(LW.petSeqStep(pet,T,'walk1',-1,2.4),null);
 assert.equal(LW.petSeqStep(pet,T,'walk1',1,3),'turn-5');assert.equal(LW.petSeqStep(pet,T,'walk1',-1,3.05),'turn-1~m');   // reversed mid-turn: turns back
 const none={},noSheets={has:()=>false};LW.petSeqStep(none,noSheets,'walk1',1,0);
 assert.equal(LW.petSeqStep(none,noSheets,'sit',-1,1),null);assert.equal(LW.petSeqStep(none,noSheets,'walk1',1,2),null);
 assert.equal(LW.petJumpFrame('crouch',0),'jump-1');assert.equal(LW.petJumpFrame('air',.5),'jump-3');assert.equal(LW.petJumpFrame('land',0),'jump-5');
});
test('standing up while facing the other way plays the stand-up, not the turn',()=>{
 const {LW}=load(),T={has:()=>true},pet={};
 LW.petSeqStep(pet,T,'sit',1,0);
 assert.equal(LW.petSeqStep(pet,T,'walk1',-1,1),'stand-sit-5');
 for(let t=1;t<1.5;t+=.05)LW.petSeqStep(pet,T,'walk1',-1,t);
 assert.equal(LW.petSeqStep(pet,T,'walk1',-1,1.6),null);
});
test('swaps cut into drawn frames, fade quickly out of them',()=>{
 const {LW}=load(),f=n=>({petName:n}),sit={},walk={};
 assert.equal(LW.petSwap(walk,walk,true,true),'cut');assert.equal(LW.petSwap(sit,walk,false,true),'fade');
 assert.equal(LW.petSwap(walk,f('stand-sit-1'),true,false),'cut');assert.equal(LW.petSwap(f('stand-sit-4'),f('stand-sit-5')),'cut');
 assert.equal(LW.petSwap(f('stand-sit-5'),sit),'quick');assert.equal(LW.petSwap(walk,f('jump-1'),true,false),'quick');
});
test('pose state cuts into drawn frames and fades quickly out of them',()=>{
 const {LW,tick}=load(),pet={};LW.poseState(pet,'sit');tick(1000);
 let f=LW.poseState(pet,'stand-sit-5');assert.equal(f.layers.length,1);assert.equal(f.layers[0].pose,'stand-sit-5');
 tick(75);f=LW.poseState(pet,'stand-sit-4');assert.equal(f.layers.length,1);
 tick(75);f=LW.poseState(pet,'walk1');assert.equal(f.layers.length,2);tick(130);assert.equal(LW.poseState(pet,'walk1').layers.length,1);
 f=LW.poseState(pet,'jump-1');assert.equal(f.layers.length,2);
});
