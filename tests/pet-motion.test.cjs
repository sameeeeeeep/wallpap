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
test('pose changes never dissolve two silhouettes: one opaque layer, tuck then cut at the midpoint',()=>{
 const {LW}=load();for(let i=0;i<=100;i++){const layers=LW.poseFrame('sleep','sit',i/100).layers;assert.equal(layers.length,1);assert.equal(layers[0].alpha,1);}
 assert.equal(LW.poseFrame('sleep','sit',.4).layers[0].pose,'sleep');assert.equal(LW.poseFrame('sleep','sit',.6).layers[0].pose,'sit');
 assert.ok(LW.poseFrame('sleep','sit',.5).sy<1);
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
test('pose state cuts into and out of drawn frames with a single layer',()=>{
 const {LW,tick}=load(),pet={};LW.poseState(pet,'sit');tick(1000);
 let f=LW.poseState(pet,'stand-sit-5');assert.equal(f.layers.length,1);assert.equal(f.layers[0].pose,'stand-sit-5');
 tick(75);f=LW.poseState(pet,'stand-sit-4');assert.equal(f.layers.length,1);
 tick(75);f=LW.poseState(pet,'walk1');assert.equal(f.layers.length,1);tick(130);assert.equal(LW.poseState(pet,'walk1').layers.length,1);
 f=LW.poseState(pet,'jump-1');assert.equal(f.layers.length,1);
});
test('gait cycle phase advances with distance travelled, not with time',()=>{
 const {LW,tick}=load(),pet={},seen=[];
 for(let d=0;d<=100;d+=12.5){seen.push(LW.petGaitFrame(pet,d,100,'walk'));tick(1000);}   // one stride = 100 units
 assert.deepEqual(seen,['walk-1','walk-2','walk-3','walk-4','walk-5','walk-6','walk-7','walk-8','walk-1']);
 const slow={},fast={};
 for(let i=0;i<=10;i++)LW.petGaitFrame(slow,i*2.5,100,'walk');   // 25 units in 10 small steps
 LW.petGaitFrame(fast,0,100,'walk');assert.equal(LW.petGaitFrame(fast,25,100,'walk'),'walk-3');   // …or one big one
 assert.ok(Math.abs(slow._gait.ph-fast._gait.ph)<1e-9);
 const held={};LW.petGaitFrame(held,0,100,'walk');LW.petGaitFrame(held,30,100,'walk');
 for(let i=0;i<5;i++){tick(500);assert.equal(LW.petGaitFrame(held,30,100,'walk',{}),'walk-5');}   // time alone settles, never cycles on
 assert.equal(LW.petGaitFrame(held,-10,100,'walk'),'walk-8');   // walking back the other way still steps forward
});
test('a stopped pet settles on the nearest contact frame instead of freezing mid-stride',()=>{
 const {LW}=load(),at=(d,gait='walk')=>{const p={};for(let x=0;x<d;x+=10)LW.petGaitFrame(p,x,100,gait);LW.petGaitFrame(p,d,100,gait);return p;};
 let p=at(30);assert.equal(LW.petGaitFrame(p,30,100,'walk'),'walk-5');assert.equal(p._gait.settled,true);   // past passing → next contact
 p=at(52);assert.equal(LW.petGaitFrame(p,52,100,'walk'),'walk-5');   // just past contact → back onto it
 p=at(80);assert.equal(LW.petGaitFrame(p,80,100,'walk'),'walk-1');assert.equal(p._gait.ph,0);
 p=at(40,'run');assert.equal(LW.petGaitFrame(p,40,100,'run'),'run-1');
 p=at(30);const steps=[];for(let i=0;i<20;i++)steps.push(LW.petGaitFrame(p,30,100,'walk',{dt:1/30}));   // eased over a few frames
 assert.equal(steps[0],'walk-3');assert.ok(steps.includes('walk-4'));assert.equal(steps[steps.length-1],'walk-5');
 assert.ok(steps.every((f,i)=>!i||+f.slice(5)>=+steps[i-1].slice(5)));   // only ever forward
});
test('walk and run hand over at the matching phase',()=>{
 const {LW}=load(),p={};
 LW.petGaitFrame(p,0,100,'walk');LW.petGaitFrame(p,25,100,'walk');   // a quarter cycle: mid first step
 const e=1e-7;   // keep it moving (a stopped pet would settle instead)
 assert.equal(LW.petGaitFrame(p,25+e,100,'run'),'run-4');assert.ok(Math.abs(p._gait.ph-.5)<1e-6);   // half-way through the gallop stride
 assert.equal(LW.petGaitFrame(p,25+2*e,100,'walk'),'walk-3');assert.ok(Math.abs(p._gait.ph-.25)<1e-6);   // and back exactly
 const q={};for(let x=0;x<=75;x+=25)LW.petGaitFrame(q,x,100,'walk');
 LW.petGaitFrame(q,75+e,100,'run');assert.equal(LW.petGaitFrame(q,75+2*e,100,'walk'),'walk-7');   // the second step keeps its side
 for(let ph=0;ph<1;ph+=.05){const r={};for(let x=0;x<ph*100;x+=10)LW.petGaitFrame(r,x,100,'walk');LW.petGaitFrame(r,ph*100,100,'walk');const a=r._gait.ph;LW.petGaitFrame(r,ph*100+e,100,'run');
  const b=r._gait.ph,dv=Math.abs(b-(a%.5)*2);assert.ok(Math.min(dv,1-dv)<1e-5);}   // (on the loop)
});
test('cycle layout: one size for the loop, walking height, torso-pinned anchor',()=>{
 const {LW}=load(),ref={w:400,h:240,top:0,bot:239,cx:180,k:1,fa:.5};
 const ms=[0,1,2,3,4,5,6,7].map(i=>({w:300+(i%2)*40,h:200,top:0,bot:199-(i===3?6:0),cx:140+(i%2)*40}));
 const L=LW.petCycleLayout(ms,ref);
 assert.ok(L.every(f=>f.k===L[0].k));assert.ok(Math.abs(L[0].k*200-240)<1e-9);
 // the anchor keeps the same distance from the torso as walk1's (20 px at walk1's scale)
 const off=(.5*400-180)/L[0].k;
 L.forEach((f,i)=>{const px=f.fa*ms[i].w-off;assert.ok(px>=140-1e-9&&px<=180+1e-9);});
 assert.ok(Math.abs((L[0].fa*ms[0].w-off)-(L[1].fa*ms[1].w-off))<40);   // smoothed: less than the raw 40 px swing
 const fn=LW.petCycleLayout(ms.map(m=>({...m,cx:150})),ref);fn.forEach((f,i)=>assert.ok(Math.abs(f.fa*ms[i].w-(150+off))<1e-9));
});
test('cycle frames are gait cuts, sized by their own petK',()=>{
 const {LW,tick}=load(),c=n=>({petName:n,petCycle:'walk',petK:1.1});
 assert.equal(LW.petSwap(c('walk-2'),c('walk-3')),'cut');assert.equal(LW.petSwap({},c('walk-1'),true,false),'cut');
 assert.equal(LW.petSwap(c('walk-5'),{},false,true),'cut');assert.equal(LW.petSwap(c('walk-5'),c('stand-sit-1')),'cut');
 assert.equal(LW.petPoseScale('cat','walk-3',{naturalHeight:200},c('walk-3')),1.1);
 const pet={};LW.poseState(pet,'walk1');tick(1000);LW.poseState(pet,'walk-2');assert.equal(LW.poseState(pet,'walk-3').layers.length,1);
});
test('petGait: stride from the set, plain walk1 once standing on frame 1, run falls back to the walk',()=>{
 const {LW}=load(),C={set:'cats/x',cyc:{walk:true},has:g=>g==='walk'},p={};
 LW.PET_STRIDE['cats/x']={walk:2};
 assert.equal(LW.petGait(p,C,0,50,'walk'),'walk1');   // standing, never walked
 assert.equal(LW.petGait(p,C,25,50,'walk'),'walk-3');   // stride 2 × 50
 assert.equal(LW.petGait(p,C,25,50,'walk'),'walk-5');   // stopped → settles on the other contact
 LW.petGait(p,C,50,50,'walk');
 assert.equal(LW.petGait(p,C,75,50,'walk'),'walk-1');assert.equal(LW.petGait(p,C,75,50,'walk'),'walk1');   // walk-1 then the plain walk1
 assert.equal(LW.petGait({},C,10,50,'run'),'walk1');   // first call only seeds the distance
 assert.equal(LW.petGait({},null,10,50),null);assert.equal(LW.petGait({},{set:'x',cyc:{},has:()=>false},10,50),null);   // no cycle: the scene's own swap
});
// ---- paw planting ------------------------------------------------------------------------
// A synthetic treadmill cycle (what art-src/cycles/plant.py makes of the drawn strips): frame k
// shows the paw at body-relative x0 − k·step while it is on the ground (stance frames 0…4).
function plantRig(LW,{n=8,H=100,sw=.8}={}){
 LW.PET_STRIDE['cats/rig']={walk:sw};
 const img={};for(let i=1;i<=n;i++)img['walk-'+i]={petFa0:.5,petFa:.5,petW0:200,petCycle:'walk'};
 return {set:'cats/rig',cyc:{walk:true},has:g=>g==='walk',img,plant:{walk:{n,H}}};
}
// Walk a pet at constant speed; for two paws (planted during frames from…from+4, sliding back one
// step per frame relative to the body as the planted art does) collect their world x per stance.
function stances(LW,C,{plant=true}={}){
 const H=100,n=8,step=C.plant.walk.n&&.8*H/n,pet={},dt=1/60,speed=62;let D=0;
 LW.petGait(pet,C,0,H,'walk',{dt,plant});
 const open={},done=[];
 for(let t=0;t<6;t+=dt){
  D+=speed*dt;const f=LW.petGait(pet,C,D,H,'walk',{dt,plant});
  const k=/^walk-/.test(f)?+f.slice(5)-1:0,im=C.img['walk-'+(k+1)];
  const sprite=D+(plant?(.5-im.petFa)*200:0);   // the drawn anchor shift, in world units (forward +)
  for(const from of [0,4]){
   const j=(k-from+n)%n;
   if(j>4||(open[from]&&j<open[from].j)){if(open[from])done.push(open[from].xs);open[from]=null;}
   if(j<=4){(open[from]||(open[from]={xs:[]})).xs.push(sprite+30-j*step);open[from].j=j;}
  }
 }
 return done.filter(xs=>xs.length>=20).map(xs=>Math.max(...xs)-Math.min(...xs));
}
test('planted paw keeps its world x within ±1 px over a stance (hold still, step at cuts)',()=>{
 const {LW}=load(),C=plantRig(LW),sl=stances(LW,C);
 assert.ok(sl.length>=4);sl.forEach(d=>assert.ok(d<=1,'paw slid '+d.toFixed(2)+' px'));
 const {LW:L2}=load(),glide=stances(L2,plantRig(L2),{plant:false});   // control: a gliding sprite drags it
 assert.ok(glide.length&&glide.every(d=>d>8));   // …by about a step per frame
});
test('paw planting preserves the average speed and stays within a step of the pet',()=>{
 const {LW}=load(),H=100,n=8,sw=.8,C=plantRig(LW,{n,H,sw}),pet={},dt=1/60,step=sw*H/n;let D=0,first=null,last=null;
 LW.petGait(pet,C,0,H,'walk',{dt});
 for(let i=0;i<600;i++){D+=(40+30*Math.sin(i/40))*dt;const f=LW.petGait(pet,C,D,H,'walk',{dt});
  const off=LW.petGaitShift(pet,H);assert.ok(off<=1e-9&&off>-step-1e-9,'offset '+off);
  assert.ok(Math.abs((.5-C.img[f].petFa)*200-off)<1e-9);   // the frame's anchor carries the same shift
  const x=D+off;if(first===null)first=x;last=x;}
 assert.ok(Math.abs((last-first)-D)<step+1e-6);   // net travel = the pet's (to within the last hold)
 // stopping: settles on a contact, then the shift eases back to 0 and the plain walk1 shows
 let f;for(let i=0;i<120;i++)f=LW.petGait(pet,C,D,H,'walk',{dt});
 assert.equal(LW.petGaitShift(pet,H),0);assert.ok(f==='walk1'||f==='walk-5');
 const q={};LW.petGait(q,C,0,H,'walk',{plant:false});LW.petGait(q,C,10,H,'walk',{plant:false});assert.equal(LW.petGaitShift(q,H),0);
});
test('even plant steps sum to the stride; the offset is periodic and steps only at cuts',()=>{
 const {LW}=load(),X=LW.petPlantSteps(8,80);assert.equal(X.length,9);assert.equal(X[8],80);X.forEach((x,i)=>assert.ok(Math.abs(x-i*10)<1e-9));
 const U=LW.petPlantSteps(4,40,[1,3,1,3]);assert.equal(JSON.stringify(U.map(v=>+v.toFixed(6))),'[0,5,20,25,40]');
 assert.equal(LW.petPlantOffset(X,0,8),0);assert.ok(Math.abs(LW.petPlantOffset(X,.06,8)+4.8)<1e-9);   // held: falls behind
 assert.ok(Math.abs(LW.petPlantOffset(X,.125,8))<1e-9);   // stepped at the cut
});
test('installed cycles plant their paws (plant.py QA reports)',()=>{
 const dir=require('node:path').join(__dirname,'../art-src/cycles/plant');if(!fs.existsSync(dir))return;
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){const r=JSON.parse(fs.readFileSync(dir+'/'+f,'utf8'));
  assert.ok(r.overlap_after[0]>=r.overlap_before[0],f);if(/walk/.test(f))assert.ok(r.overlap_after[0]>=.75,f+' '+r.overlap_after[0]);}
});

test('direction selection uses hysteresis, contact phases and signed ground velocity',()=>{
 const {LW}=load(),p={dir:1};
 assert.equal(LW.petDirection(p,10,0,0).view,'side');
 assert.equal(LW.petDirection(p,10,12,.25).view,'side'); // raised paw: defer
 assert.equal(LW.petDirection(p,10,12,.5).view,'f');
 assert.equal(LW.petDirection(p,10,2.3,.5).view,'f'); // inside dead band (10–16°)
 assert.equal(LW.petDirection(p,10,1.5,0).view,'side');
 assert.equal(LW.petDirection(p,-10,-20,.25).face,1);
 assert.equal(LW.petDirection(p,-10,-20,.5).view,'b');
 assert.equal(p._petDirection.face,-1);
 assert.equal(LW.petDirection(p,0,20,0).view,'f');
 assert.equal(p._petDirection.face,-1); // pure vertical retains nearest facing
 assert.equal(LW.petDirection(p,0,0,0).view,'f');
});
function directionRig(LW){
 const C=plantRig(LW),old=C.has;
 for(const view of ['f','b']){
  C.cyc['walk-'+view]=true;C.plant['walk-'+view]={n:8,H:100};
  for(let i=1;i<=8;i++)C.img[`walk-${view}-${i}`]={petFa0:.5,petFa:.5,petW0:200,petCycle:'walk-'+view};
 }
 C.has=g=>!!C.cyc[g];return C;
}
test('diagonal gait keeps distance phase, chooses the same contact index, and plants both axes',()=>{
 const {LW}=load(),C=directionRig(LW),p={dir:1};
 LW.petGait(p,C,0,100,'walk',{vx:1,vy:0});
 assert.equal(LW.petGait(p,C,20,100,'walk',{vx:1,vy:1}),'walk-3');
 assert.equal(LW.petGait(p,C,40,100,'walk',{vx:1,vy:1}),'walk-f-5');
 assert.equal(p._gait.ph,.5);
 LW.petGait(p,C,44,100,'walk',{vx:1,vy:1});
 assert.ok(Math.abs(p._gait.shift[0]+4/Math.sqrt(2))<1e-9);
 assert.ok(Math.abs(p._gait.shift[1]+4/Math.sqrt(2))<1e-9);
 assert.equal(C.img['walk-f-5'].petFa,.5); // vector consumers must not also apply horizontal planting
 // Fallback run advances the walk by distance, not time (same stance length).
 const r={};LW.petGait(r,C,0,100,'run',{vx:0,vy:-1});
 assert.equal(LW.petGait(r,C,20,100,'run',{vx:0,vy:-1}),'walk-b-3');
 assert.equal(r._gait.shift[0],0);
});
test('a missing directional cycle falls back to a complete side loop without resetting phase',()=>{
 const {LW}=load(),C=plantRig(LW),p={};
 LW.petGait(p,C,0,100,'walk',{vx:1,vy:2});
 assert.equal(LW.petGait(p,C,20,100,'walk',{vx:1,vy:2}),'walk-3');
 C.cyc['walk-f']=true;C.has=g=>!!C.cyc[g]; // hot availability keeps phase
 assert.equal(LW.petGait(p,C,30,100,'walk',{vx:1,vy:2}),'walk-f-4');
 assert.equal(p._gait.ph,.375);
});
test('directional loading is atomic: one failed frame disables only that view',()=>{
 const LW={},images=[];
 class Image{constructor(){this.naturalWidth=100;images.push(this);}set src(v){this.url=v;}}
 vm.runInNewContext(fs.readFileSync(require.resolve('../scenes/pet-motion.js'),'utf8'),{LW,Image});
 let done=0;const C=LW.petCycleLoad('art/sprites/','cats/orange',()=>done++);
 assert.equal(images.length,30);
 for(const im of images){if(im.url.endsWith('walk-f-4.png'))im.onerror();else im.onload();}
 assert.equal(done,1);assert.equal(C.left,0);assert.equal(C.raw['walk-f'],undefined);
 assert.equal(C.raw.walk.length,8);assert.equal(C.raw['walk-b'].length,8);assert.equal(C.raw.run.length,6);
 assert.ok(!LW.PET_DIRECTION_HAS['dogs/corgi']);
});
test('all cat directional assets contain eight nonempty PNG frames',()=>{
 for(const coat of ['orange','black','grey','calico','siamese'])for(const view of ['f','b'])for(let i=1;i<=8;i++){
  const b=fs.readFileSync(require.resolve(`../scenes/art/sprites/cats/${coat}/cycle/walk-${view}-${i}.png`));
  assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');assert.ok(b.readUInt32BE(16)>50);assert.ok(b.readUInt32BE(20)>50);
 }
});
test('directional padding never changes the animal scale or foot baseline',()=>{
 const {LW}=load(),geom=LW.PET_DIRECTION_LAYOUT['cats/orange']['walk-f'];
 LW.petCycleMeasure=im=>({w:im.width,h:im.height,top:0,bot:im.height-1,cx:im.width*.5});
 const ims=Array.from({length:8},()=>({width:240+2*geom.pad,height:206+2*geom.pad}));
 const C={set:'cats/orange',raw:{'walk-f':ims},img:{},cyc:{},left:0};
 assert.equal(LW.petCyclePrep(C,{im:{width:300,height:200},k:1,fa:.5}),true);
 for(const im of Object.values(C.img)){
  assert.ok(Math.abs(im.petK*geom.height-200)<1e-9);
  assert.equal(im.petFootPad,geom.pad);
 }
});
test('2D planted treadmill holds world contact for front, back, left and vertical movement',()=>{
 const {LW}=load();
 for(const [vx,vy] of [[1,1],[1,-1],[-1,1],[0,1]]){
  const C=directionRig(LW),p={dir:Math.sign(vx)||1},len=Math.hypot(vx,vy),v=[vx/len,vy/len],H=100;
  LW.petGait(p,C,0,H,'walk',{vx,vy});let previous=null;
  for(let distance=.5;distance<39;distance+=.5){
   LW.petGait(p,C,distance,H,'walk',{vx,vy});
   const k=Math.floor(p._gait.ph*8+1e-6),step=80/8;
   const paw=v.map((axis,j)=>distance*axis+p._gait.shift[j]-k*step*axis);
   if(previous)for(let j=0;j<2;j++)assert.ok(Math.abs(paw[j]-previous[j])<1e-8);
   previous=paw;
  }
 }
});
test('directional art registration and runtime geometry remain synchronized',()=>{
 const {LW}=load(),layout=JSON.parse(fs.readFileSync(require.resolve('../art-src/cycles/directions-layout.json'),'utf8'));
 assert.equal(JSON.stringify(LW.PET_DIRECTION_LAYOUT),JSON.stringify(layout));
 const reports=JSON.parse(fs.readFileSync(require.resolve('../art-src/cycles/directions-plant-qa.json'),'utf8'));
 assert.equal(Object.keys(reports).length,10);
 for(const r of Object.values(reports))assert.ok(r.max_contact_slip_px<1,'registered contact drift '+r.max_contact_slip_px);
});

test('jump direction shares walk hysteresis, mirrors by ground vx and retains pure-depth facing',()=>{
 const {LW}=load();
 for(const [vx,vy,view,face] of [[100,0,'side',1],[-100,0,'side',-1],[35,80,'f',1],[-35,80,'f',-1],[35,-80,'b',1],[-35,-80,'b',-1]]){
  const p={dir:-1},w={dir:-1};const jump=LW.petJumpDirection(p,vx,vy),walk=LW.petDirection(w,vx,vy,0,'walk');
  assert.equal(jump.view,view);assert.equal(jump.face,face);assert.deepEqual(jump,walk);
  LW.petDirection(p,-vx,-vy,0,'walk');assert.equal(jump.view,view); // takeoff snapshot stays frozen
 }
 const p={dir:-1};assert.equal(LW.petJumpDirection(p,0,100).face,-1);assert.equal(LW.petJumpDirection(p,0,-100).view,'b');
 assert.equal(LW.petJumpDirection(p,100,70).view,'f'); // depth → depth through hysteresis
});
test('missing jump view falls back to side; landing starts the matching walk at planted contact',()=>{
 const {LW}=load(),p={dir:-1,gd:17,_gait:{ph:.73,off:-.4,shift:[-10,4]}};
 LW.petJumpDirection(p,-40,-80);
 assert.equal(LW.petJumpKey('b',q=>q==='jump'),'jump');
 assert.equal(LW.petJumpKey('b',q=>q==='jump-b'||q==='jump'),'jump-b');
 assert.equal(LW.petJumpKey('f',()=>false),null);
 LW.petJumpLand(p);assert.equal(p._gait.ph,0);assert.equal(p._gait.d,17);assert.equal(p._gait.off,0);
 assert.deepEqual([...p._gait.shift],[0,0]);
 const C=directionRig(LW);assert.equal(LW.petGait(p,C,17,78,'walk',{vx:0,vy:0}),'walk-b-1');
 assert.equal(p._petDirection.face,-1);
});
test('all fifty jump frames share walk geometry and the runtime registry matches the cut manifest',()=>{
 const {LW}=load(),layout=JSON.parse(fs.readFileSync(require.resolve('../art-src/cycles/jumps-layout.json'),'utf8'));
 assert.deepEqual(JSON.parse(JSON.stringify(LW.PET_JUMP_LAYOUT)),layout);
 for(const [coat,views] of Object.entries(layout))for(const [name,geom] of Object.entries(views)){
  assert.equal(geom.height,LW.PET_DIRECTION_LAYOUT[coat][name.replace('jump','walk')].height);
  assert.equal(geom.centers.length,5);
  let h;
  for(let i=1;i<=5;i++){
   const png=fs.readFileSync(require.resolve(`../scenes/art/sprites/${coat}/t/${name}-${i}.png`));
   assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.ok(png.length>1000);
   const w=png.readUInt32BE(16),height=png.readUInt32BE(20);h??=height;assert.equal(height,h);
   assert.ok(geom.centers[i-1]>geom.pad&&geom.centers[i-1]<w-geom.pad);
  }
 }
});

function shadowRig(){
 const {LW}=load();const scene=fs.readFileSync(require.resolve('../scenes/cats.html'),'utf8');
 const src=scene.slice(scene.indexOf('function sprContact('),scene.indexOf('// soft contact shadow, stamped'));
 const ctx={LW,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),sprK:()=>1,sprAnchor:()=>50,isCyc:p=>p.startsWith('walk-')};
 vm.runInNewContext(src+';this.shadow=spriteShadow',ctx);
 const im=(x,y,span)=>({width:100,height:120,petFootPad:20,petContact:{x,y,span}});
 const s={px:1,img:{'walk-f-1':im(60,95,40),'jump-f-1':im(55,99,40),'jump-f-3':im(90,99,90),'jump-f-5':im(65,99,40)},ok:{'walk-f-1':true,'jump-f-1':true,'jump-f-3':true,'jump-f-5':true}};
 const c={x:200,y:300,k:1,dir:-1,sx:-1,spP:'walk-f-1',spFadeT:1,sv:{ox:0,oy:0,sx:1,sy:1,rot:0},_gait:{shift:[-4,6]}};
 return {shadow:ctx.shadow,s,c};
}
test('contact shadow tracks measured paws including padding, mirroring and world-space gait shift',()=>{
 const {shadow,s,c}=shadowRig();let f=shadow(c,s);
 assert.equal(f.x,186);assert.equal(f.y,302);assert.equal(f.width,24);
 c.sx=c.dir=1;f=shadow(c,s);assert.equal(f.x,206);assert.equal(f.y,302); // vector shift is not mirrored twice
 c.k=2;f=shadow(c,s);assert.equal(f.x,212);assert.equal(f.y,304);
});
test('airborne shadow follows body path instead of jumping between tucked and reaching paws',()=>{
 const {shadow,s,c}=shadowRig();c.state='jump';c.spP='jump-f-3';c.j={key:'jump-f',dur:1};c.sx=c.dir=1;
 for(const t of [0,.25,.5,.75,1]){
  c.t=t;c.x=200+80*t;c.y=300+60*t;const f=shadow(c,s);
  assert.equal(f.x,205+90*t);assert.equal(f.y,c.y);assert.equal(f.width,24);
 }
});
