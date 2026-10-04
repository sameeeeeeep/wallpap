const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function rig(roster=['orange','golden'],extra={},scene='cats',atlas=false){
 const listeners={},LW={settings:{pets:true},virtual:true,pointer:{x:0,y:0,inside:false},focused:true,on:(k,f)=>(listeners[k]??=[]).push(f)};
 class Image{set src(v){this.srcName=v}}
 const context={LW,Image,performance:{now:()=>0},document:{createElement:()=>({width:200,height:100,getContext:()=>({drawImage(){},fillRect(){},createRadialGradient(){return {addColorStop(){}}}})})}};
 for(const file of (atlas?['pet-motion','cat-atlas','cat-motion','pets']:['pet-motion','pets']))vm.runInNewContext(fs.readFileSync(require.resolve('../scenes/'+file+'.js'),'utf8'),context);
 LW.petCycleMeasure=im=>({top:0,bot:im.height-1,cx:im.width*.5});LW.petCyclePrep=()=>true;
 const S={floor:[[[0,0],[2000,0],[2000,1000],[0,1000]]],bounds:[0,0,2000,1000],scale:[[0,1],[1000,1]],homes:[{x:300,y:600},{x:950,y:600},{x:1400,y:600}],exits:[{x:-300,y:600}],...extra};
 const pets=LW.pets.create({scene,roster,stage:()=>S});pets.initialized=true;
 const im=()=>({width:200,height:100,petK:1,petFa0:.5,petContact:{x:100,y:99,span:100}});
 for(const p of pets.items){const a=p.asset; if(a.atlas){a.img={};for(const [key,clip] of Object.entries(a.clips))clip.frames.forEach(([x,y,w,h,ax,ay],i)=>{a.img[key+'-'+(i+1)]={...im(),width:w,height:h,petFa0:ax/w,petFootPad:h-1-ay};});a.img.walk1=a.img['walk-side-1'];a.ready=true;a.cyc.has=q=>['walk','walk-f','walk-b'].includes(q);continue;}a.img={walk1:im(),sit:im(),sleep:im(),lie:im()};a.unit=p.spec.height/100;a.seq=Object.fromEntries(['jump','jump-f','jump-b','pounce','pounce-f','pounce-b','hunt','hunt-f','hunt-b','perk','turn','turn-f','turn-b'].map(k=>[k,true]));a.cyc={img:{},cyc:{walk:true,'walk-f':true,'walk-b':true},has:q=>!!a.cyc.cyc[q]};
 for(const key of ['walk','walk-f','walk-b','run','run-f','run-b','stalk','stalk-f','stalk-b']){a.cyc.cyc[key]=true;for(let i=1;i<=(key.startsWith('walk')?8:6);i++)a.img[key+'-'+i]=im();}
 for(const key of Object.keys(a.seq))for(let i=1;i<=5;i++)a.img[key+'-'+i]=im();a.ready=true;}
 pets.reset();pets.step(.01,0);return {LW,pets,S,context,emit:(k,...args)=>(listeners[k]||[]).forEach(f=>f(...args)),tick:(n=1)=>{for(let i=0;i<n;i++)pets.step(1/30,i/30)}};
}
test('one immutable seven member roster; pandas are private to grass',()=>{const {LW}=rig();assert.equal(Object.keys(LW.pets.ROSTER).length,7);assert.ok(Object.isFrozen(LW.pets.ROSTER.orange));assert.throws(()=>LW.pets.create({scene:'cafe',roster:['mei'],stage:()=>({})}));});
test('all path legs use lateral or drawn .55 headings, including steep zigzags',()=>{const {LW}=rig();for(const b of [[100,0],[100,40],[15,100],[-80,-200],[0,200]])for(const path of LW.pets.geometry.headings([0,0],b))for(let i=1;i<path.length;i++){const dx=path[i][0]-path[i-1][0],dy=path[i][1]-path[i-1][1];assert.ok(Math.abs(dy)<1e-9||Math.abs(Math.abs(dy/dx)-.55)<1e-9);}});
test('side-only panda ignores requested depth; travel always uses a drawn cycle',()=>{const {pets,tick}=rig(['bao'],{},'grass');const p=pets.items[0];delete p.asset.cyc.cyc['walk-f'];delete p.asset.cyc.cyc['walk-b'];pets.forceWalk(0,700,800);tick(200);assert.equal(p.y,600);assert.ok(p.x>300);assert.match(p.spP,/walk/);});
test('cat and dog crossing share full body avoidance without pushing or riding',()=>{const {pets,tick}=rig();pets.forceWalk(0,1200,600);pets.forceWalk(1,200,600);for(let i=0;i<1200;i++){tick();assert.equal(pets.overlaps().length,0)}assert.ok(pets.items[0].x>1100&&pets.items[1].x<300,JSON.stringify(pets.items.map(p=>({x:p.x,y:p.y,state:p.state,path:p.path}))));});
test('jump starts at the current depth scale and stays continuous into flight',()=>{const {pets,tick}=rig(['calico'],{scale:[[0,.5],[1000,1.5]]});const p=pets.items[0],k=p.k;p.k=4;pets.forceJump(0,550,700);assert.equal(p.k,k);assert.equal(pets.frame(p).key,'jump-f-1');tick();assert.equal(p.k,k);tick(10);assert.ok(Math.abs(p.k-k)<.02);assert.ok(pets.frame(p));});
test('contact shadows include mirror, padding and world-space gait shift',()=>{const {pets}=rig(['orange']);const p=pets.items[0],im=p.asset.img['walk-f-1'];p.spP='walk-f-1';p.prev=null;p.poseT=1;p.x=200;p.y=300;p.k=1;p.dir=-1;p.asset.unit=1;im.width=100;im.height=120;im.petFootPad=20;im.petContact={x:60,y:95,span:40};p._gait={shift:[-4,6]};let f=pets.frame(p).shadow;assert.equal(f.x,186);assert.equal(f.y,302);assert.equal(f.width,24);p.dir=1;f=pets.frame(p).shadow;assert.equal(f.x,206);assert.equal(f.y,302);});
test('airborne shadow interpolates landing contact and shrinks with height',()=>{const {pets}=rig(['orange']);const p=pets.items[0];p.asset.unit=1;p.spP='jump-f-3';p.prev=null;p.poseT=1;p.state='jump';p.j={key:'jump-f',dur:1,d0:300,d1:360};p.x=200;p.y=300;p.k=1;p.dir=1;p.t=.5;p.asset.img['jump-f-1'].petContact={x:95,y:99,span:40};p.asset.img['jump-f-5'].petContact={x:105,y:99,span:40};p.asset.img['jump-f-3'].petContact={x:150,y:70,span:160};p.z=0;const a=pets.frame(p).shadow;p.z=90;const b=pets.frame(p).shadow;assert.equal(a.x,200);assert.equal(a.y,300);assert.equal(b.x,a.x);assert.equal(b.y,a.y);assert.ok(b.width<a.width&&b.alpha<a.alpha);});
test('Pets off walks out and on returns stable identities without overlap',()=>{const {pets,LW,tick}=rig();const refs=[...pets.items];LW.settings.pets=false;tick(1800);assert.ok(pets.items.every(p=>p.away),JSON.stringify(pets.items.map(p=>({x:p.x,y:p.y,state:p.state,path:p.path,goal:p.goal,mission:p.mission,blocked:p.blocked}))));LW.settings.pets=true;for(let i=0;i<500;i++){tick();assert.equal(pets.overlaps().length,0)}assert.deepEqual(pets.items,refs);assert.ok(pets.items.some(p=>!p.away));});
test('jump landing clamps outside a prop footprint to the declared floor edge',()=>{const {pets}=rig(['orange'],{floor:[[[500,0],[2000,0],[2000,1000],[500,1000]]]});const p=pets.items[0];pets.forceJump(0,420,650,{from:[650,600]});assert.equal(p.j.x1,500);assert.equal(p.j.y1,650);});
test('a click or reminder cannot replace an in-flight jump with a still pose',()=>{const {pets,tick}=rig(['orange']);pets.forceJump(0,550,680);tick(12);const p=pets.items[0];assert.equal(p.state,'jump');pets.state(p,'groom',3);assert.equal(p.state,'jump');tick(60);assert.equal(p.j,null);assert.equal(p.z,0);});
test('ledge pets sort with props by supporting-floor depth, not elevated paw y',()=>{
 const {pets}=rig(['orange','golden'],{ledges:[{id:'bench',x0:0,x1:2000,y:100,depth:700,scale:1}]});
 pets.items[0].surf='bench';pets.items[0].y=100;const a=pets.frame(pets.items[0]).image,b=pets.frame(pets.items[1]).image,order=[];
 const g={save(){},restore(){},translate(){},scale(){},drawImage(im){if(im===a)order.push('ledge cat');if(im===b)order.push('floor dog')}};
 pets.draw(g,[{depth:650,draw:()=>order.push('prop')}]);assert.deepEqual(order,['floor dog','prop','ledge cat']);
});
test('crouch and landing retain their supporting depth while local pose timers reset',()=>{
 const {pets,tick}=rig(['orange']);pets.forceJump(0,550,750);const p=pets.items[0];
 tick(8);assert.equal(p.state,'jumpPrep');assert.equal(pets.frame(p).depth,600);
 for(let i=0;i<90&&p.state!=='land';i++)tick();
 assert.equal(p.state,'land');assert.equal(pets.frame(p).depth,750);
 tick(2);assert.equal(pets.frame(p).depth,750);
});
test('an exit queue yields room for the leader to turn out of a narrow aisle',()=>{
 const {pets,LW,tick}=rig(['golden','orange'],{
  floor:[[[0,920],[400,920],[400,800],[1500,800],[1500,980],[0,980]]],bounds:[0,800,1500,980],
  homes:[{x:610,y:938},{x:430,y:885}],exits:[{x:-250,y:938}]
 });
 LW.settings.pets=false;
 for(let i=0;i<3000;i++){tick();assert.equal(pets.overlaps().length,0);}
 assert.ok(pets.items.every(p=>p.away),JSON.stringify(pets.items.map(p=>({x:p.x,y:p.y,state:p.state}))));
});
test('plate masks crop the same backing pixels under a mirrored scene transform',()=>{
 const {LW,context}=rig();let args,sourceArgs;const cv={width:1000,height:600};
 const mask={getContext:()=>({beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},drawImage(...a){sourceArgs=a}})};context.document.createElement=()=>mask;
 const g={getTransform:()=>({a:-2,b:0,c:0,d:2,e:1000,f:20}),save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},setTransform(){},drawImage(...a){args=a}};
 LW.pets.plate(g,cv,[[100,50],[140,50],[140,90],[100,90]]);
 assert.deepEqual(sourceArgs,[cv,720,120,80,80,0,0,80,80]);assert.deepEqual(args,[mask,720,120]);
 assert.equal(mask.width,80);assert.equal(mask.height,80);
 sourceArgs=null;LW.pets.plate(g,cv,[[100,50],[140,50],[140,90],[100,90]]);assert.equal(sourceArgs,null);
 cv.petRevision=1;LW.pets.plate(g,cv,[[100,50],[140,50],[140,90],[100,90]]);assert.ok(sourceArgs);
});

const point=(r,x,y,inside=true)=>Object.assign(r.LW.pointer,{x,y,inside});
const tap=(r,p)=>r.pets.click(p.x,p.y-30*p.k);
test('tap toggles picks independently and uses a stationary drawn perk before following',()=>{
 const r=rig(['orange','black']),[a,b]=r.pets.items;point(r,700,600);tap(r,a);tap(r,b);
 assert.ok(a.picked&&b.picked);const start=[a.x,a.y];let perk=false;
 for(let i=0;i<40;i++){r.tick();perk||=a.spP.startsWith('perk-');assert.deepEqual([a.x,a.y],start);}
 assert.ok(perk);tap(r,a);assert.equal(a.picked,false);assert.ok(b.picked);assert.equal(a.state,'groom');
 r.tick(100);assert.ok(b.follow);
});
test('multiple followers reserve distinct arc slots and never overlap while the cursor travels',()=>{
 const r=rig(['orange','black','grey']);point(r,1100,750);for(const p of r.pets.items)tap(r,p);
 const starts=r.pets.items.map(p=>p.x);let travel=0;
 for(let i=0;i<1500;i++){point(r,1100+Math.sin(i/260)*280,650+Math.sin(i/340)*150);r.tick();assert.equal(r.pets.overlaps().length,0);}
 for(const [i,p] of r.pets.items.entries()){travel+=Math.abs(p.x-starts[i]);assert.ok(p.follow.slot);}
 assert.ok(travel>300,'followers must actually move');
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=r.pets.items[i],b=r.pets.items[j];assert.ok(!r.LW.pets.geometry.overlap(r.pets.box(a,...a.follow.slot),r.pets.box(b,...b.follow.slot),0));}
});
test('following only translates on drawn lateral or three-quarter headings, including runs and turns',()=>{
 const r=rig(['orange']),p=r.pets.items[0];point(r,1300,850);tap(r,p);let moved=0,run=false,turn=false;
 for(let i=0;i<1400;i++){if(i===600)point(r,500,150);r.tick();turn||=p.spP.startsWith('turn-');
  if(Math.hypot(p.groundVX,p.groundVY)>.01){moved++;run||=p.gait==='run';assert.ok(Math.abs(p.groundVY)<1e-6||Math.abs(Math.abs(p.groundVY/p.groundVX)-.55)<1e-6);assert.ok(!p.spP.startsWith('perk-'));}
 }assert.ok(moved>100&&run&&turn);
});
test('stationary target causes stalk, timed wiggle and exact pounce landing in all drawn views',()=>{
 for(const target of [[455,600],[455,685.25],[455,514.75]]){
  const r=rig(['orange']),p=r.pets.items[0];point(r,...target);tap(r,p);const seen=new Set();let landed=false,wiggle=0;
  for(let i=0;i<1100;i++){r.tick();seen.add(p.follow?.phase);if(p.state==='wiggle'&&!p.turn)wiggle+=1/30;if(p.lastPounce){landed=true;break;}}
  assert.ok(landed,JSON.stringify({target,x:p.x,y:p.y,phase:p.follow?.phase,state:p.state,path:p.path}));
  assert.ok(seen.has('stalk')&&seen.has('wiggle')&&seen.has('pounce'));assert.ok(wiggle>=.59&&wiggle<=1.25);
  assert.ok(Math.hypot(p.x-target[0],p.y-target[1])<2);assert.ok(p.follow.cooldown>=2.9);
 }
});
test('fast pointer chases with a run instead of launching a pounce',()=>{
 const r=rig(['orange']),p=r.pets.items[0];point(r,900,600);tap(r,p);let ran=false;
 for(let i=0;i<300;i++){point(r,900+(i%100)*5,600);r.tick();ran||=p.gait==='run'&&p.state==='move';assert.ok(!p.j?.action);}
 assert.ok(ran);
});
test('dogs play-bow and bounce through drawn hunt and pounce frames',()=>{
 const r=rig(['corgi']),p=r.pets.items[0];point(r,485,600);tap(r,p);let bow=false,bounce=false;
 for(let i=0;i<1100&&!p.lastPounce;i++){r.tick();bow||=p.spP.startsWith('hunt-');bounce||=p.spP.startsWith('pounce-');assert.notEqual(p.gait,'stalk');}
 assert.ok(bow&&bounce&&p.lastPounce);
});
test('pointer leave waits, return resumes, pause and reset clear picks',()=>{
 const r=rig(['orange']),p=r.pets.items[0];point(r,1100,600);tap(r,p);r.tick(120);point(r,1100,600,false);r.tick(40);const x=p.x;
 assert.equal(p.state,'followWait');r.tick(100);assert.equal(p.x,x);assert.ok(p.picked);
 point(r,1300,600);r.tick(120);assert.ok(p.x>x);r.emit('focus',false);assert.equal(p.picked,false);assert.equal(p.state,'sit');
 tap(r,p);r.pets.reset();assert.equal(p.picked,false);
});
test('cursor projects to floor and excludes full prop and widget footprints',()=>{
 const r=rig(['orange'],{clear:[200,1700],avoid:[[700,400,180,180]]}),p=r.pets.items[0];
 assert.deepEqual(Array.from(r.pets.project(p,400,-200)),[400,0]);
 for(const [x,y] of [[0,600],[1950,600],[780,500]]){const q=r.pets.project(p,x,y);assert.ok(q);assert.ok(q[0]>=246&&q[0]<=1654);const b=r.pets.box(p,...q);assert.ok(!r.LW.pets.geometry.overlap(b,[700,400,880,580],0));}
});
test('a picked ledge pet reaches the floor only through declared jump links',()=>{
 const r=rig(['orange'],{ledges:[{id:'shelf',x0:250,x1:650,y:300,depth:650,scale:1}],links:[[{surf:'shelf',x:550},{surf:'floor',x:700,y:600}]],homes:[{x:350,y:300,surf:'shelf'}]}),p=r.pets.items[0];
 point(r,1200,700);tap(r,p);let jumped=false;
 for(let i=0;i<1500;i++){r.tick();if(p.j&&p.j.s0==='shelf'){jumped=true;assert.equal(p.j.x0,550);assert.equal(p.j.x1,700);assert.equal(p.j.y1,600);}}
 assert.ok(jumped);assert.equal(p.surf,'floor');assert.ok(p.x>700);
});
test('moving a rested cursor cancels a wiggle; releasing in flight cannot restore a pick',()=>{
 const r=rig(['orange']),p=r.pets.items[0];point(r,455,600);tap(r,p);
 for(let i=0;i<700&&p.follow?.phase!=='wiggle';i++)r.tick();assert.equal(p.follow.phase,'wiggle');
 point(r,1300,600);r.tick(50);assert.notEqual(p.follow.phase,'wiggle');assert.ok(!p.j?.action);
 point(r,p.x+140,p.y);
 for(let i=0;i<900&&p.state!=='jump';i++)r.tick();assert.equal(p.state,'jump');
 const end=[p.j.x1,p.j.y1];tap(r,p);assert.equal(p.picked,false);point(r,1500,300);
 for(let i=0;i<80&&p.j;i++)r.tick();assert.equal(p.picked,false);assert.equal(p.follow,null);assert.deepEqual([p.x,p.y],end);
});
test('leave cancels an uncommitted turn immediately without dropping the pick',()=>{
 const r=rig(['orange']),p=r.pets.items[0];point(r,800,600);tap(r,p);assert.ok(p.turn);
 r.emit('leave');point(r,800,600,false);assert.equal(p.turn,null);assert.ok(p.picked);assert.equal(p.state,'followWait');
 r.tick(50);assert.ok(!p.j);assert.equal(p.x,300);
});
test('slow continuous pointer travel is not mistaken for a stationary prey target',()=>{
 const r=rig(['orange']),p=r.pets.items[0];point(r,455,600);tap(r,p);
 for(let i=0;i<500;i++){point(r,455+i*.4,600);r.tick();assert.ok(!['stalk','wiggle','pounce'].includes(p.follow.phase));}
});
test('picked purr uses the FX bus and never initializes audio when muted or FX-disabled',()=>{
 const r=rig(['orange']),p=r.pets.items[0];let calls=0,buses=[],levels=[];
 const gain=()=>({gain:{setValueAtTime(v){levels.push(v)},linearRampToValueAtTime(v){levels.push(v)},exponentialRampToValueAtTime(v){levels.push(v)}},connect(){},disconnect(){}});
 r.LW.audio=()=>{calls++;return {currentTime:0,createGain:gain,createOscillator:()=>({frequency:{value:0},connect(){},disconnect(){},start(){},stop(){}})}};
 r.LW.bus=k=>{buses.push(k);return {}};r.LW.muted=true;tap(r,p);tap(r,p);assert.equal(calls,0);
 r.LW.muted=false;r.LW.audioPrefs={fx:{on:false}};tap(r,p);tap(r,p);assert.equal(calls,0);
 r.LW.audioPrefs.fx.on=true;tap(r,p);assert.equal(calls,1);assert.deepEqual(buses,['fx']);assert.ok(Math.max(...levels)<=.014);
});

test('Play screen occluder maps through mirrored canvas transforms and blocks new crossings',()=>{
 const {LW,pets,tick}=rig(['orange']);let mirrored=false;
 const g={canvas:{width:2000,height:1000,getBoundingClientRect:()=>({x:0,y:0,width:2000,height:1000})},getTransform:()=>({inverse:()=>({transformPoint:({x,y})=>({x:mirrored?2000-x:x,y})})}),save(){},restore(){},translate(){},scale(){},drawImage(){},beginPath(){},rect(){},clip(){}};
 LW.pets.setScreenOccluder('play',[600,300,500,600]);pets.draw(g);
 assert.deepEqual(JSON.parse(JSON.stringify(pets.panelBoxes())),[[600,300,1100,900]]);
 pets.forceWalk(0,1500,600,{from:[300,600]});
 for(let i=0;i<600;i++){tick();assert.ok(!LW.pets.geometry.overlap(pets.box(pets.items[0]),[600,300,1100,900],0));}
 mirrored=true;pets.draw(g);assert.deepEqual(JSON.parse(JSON.stringify(pets.panelBoxes())),[[900,300,1400,900]]);
 LW.pets.setScreenOccluder('play',null);assert.equal(pets.panelBoxes().length,0);
});


test('atlas cats travel on all eight projected headings including direct toward and away',()=>{
 const r=rig(['orange'],{},'cats',true),p=r.pets.items[0];
 for(const [dx,dy,view,face] of [[200,0,'side',1],[160,88,'near',1],[0,160,'toward',1],[-160,88,'near',-1],[-200,0,'side',-1],[-160,-88,'far',-1],[0,-160,'away',1],[160,-88,'far',1]]){
  Object.assign(p,{j:null,turn:null,sequence:null,_catTransition:null,_catRest:'stand',_catDir:null,_catMotion:null});
  r.pets.forceWalk(0,700+dx,500+dy,{from:[700,500]});let travel=0;
  for(let i=0;i<360&&p.state==='move';i++){r.tick();if(Math.hypot(p.groundVX,p.groundVY)>.01){travel++;assert.equal(p._catDir.view,view);assert.equal(p.dir,face);assert.match(p.spP,/^walk-/);}}
  assert.ok(travel>0);assert.ok(Math.hypot(p.x-700-dx,p.y-500-dy)<.1);
 }
});
test('atlas sleep/loaf transitions hold feet until awake and preserve front-facing sit',()=>{
 const r=rig(['orange'],{},'cats',true),p=r.pets.items[0];r.pets.state(p,'sleep',100);r.tick(90);assert.equal(p.spP,'rest-8');
 r.pets.walk(p,600,600);const x=p.x;r.tick(10);assert.equal(p.x,x);r.tick(100);assert.ok(p.x>x);r.pets.state(p,'sit',100);r.tick(40);assert.equal(p.spP,'sit-8');assert.equal(p.dir,1);
 r.pets.state(p,'loaf',100);r.tick(30);assert.equal(p.spP,'rest-5');r.pets.state(p,'sleep',100);r.tick();assert.equal(p.spP,'rest-5');r.tick(30);assert.equal(p.spP,'rest-8');
});
test('atlas jumps use five complete views and mirrored facings with no legacy fallback',()=>{
 const r=rig(['orange'],{},'cats',true),p=r.pets.items[0];
 for(const [dx,dy,view] of [[80,0,'side'],[70,38.5,'near'],[0,70,'toward'],[0,-70,'away'],[70,-38.5,'far']]){
  p.j=null;p.x=600;p.y=600;p.surf='floor';p._catTransition=null;p.sequence=null;
  assert.ok(r.pets.jump(p,600+dx,600+dy,'floor',q=>r.pets.state(q,'stand',100)));
  assert.equal(p.j.key,'jump-'+view);const poses=new Set();for(let i=0;i<50;i++){r.tick();poses.add(p.spP);}
  assert.ok([...poses].some(x=>x==='jump-'+view+'-4'));assert.ok([...poses].some(x=>x==='jump-'+view+'-8'));assert.equal(p.j,null);
 }
});
test('atlas loader shares image frames between scene instances without sharing pet phase',()=>{
 const r=rig(['orange','orange'],{},'cats',true),[a,b]=r.pets.items;assert.equal(a.asset,b.asset);assert.notEqual(a.tint,b.tint);
 r.pets.forceWalk(0,600,600);r.tick(60);assert.notEqual(a._catMotion,b._catMotion);
});

test('atlas follow keeps picked perk, stalk, wiggle and precise directional pounce for every coat',()=>{
 for(const coat of ['orange','black','grey','calico','siamese']){
  const r=rig([coat],{},'cats',true),p=r.pets.items[0];assert.ok(p.asset.atlas,coat+' must use atlas');point(r,455,600);tap(r,p);
  const seen=new Set();for(let i=0;i<1000&&!p.lastPounce;i++){r.tick();seen.add(p.follow?.phase);}
  assert.ok(p.lastPounce,coat+': '+JSON.stringify({state:p.state,follow:p.follow,x:p.x}));assert.ok(seen.has('stalk')&&seen.has('wiggle')&&seen.has('pounce'));assert.ok(Math.hypot(p.x-455,p.y-600)<.01);
  point(r,455,600,false);r.emit('leave');const x=p.x;r.tick(40);assert.equal(p.x,x);r.emit('pause');assert.equal(p.picked,false);
 }
});
test('atlas cats leave/return, take shelter and eat through the public API',()=>{
 const r=rig(['orange'],{spots:[{id:'shelter',x:500,y:600,kind:'shelter'},{id:'food',x:800,y:600,kind:'food'}],supplies:{food:1,water:1}},'cats',true),p=r.pets.items[0];
 r.LW.settings.pets=false;r.tick(1200);assert.ok(p.away);r.LW.settings.pets=true;r.tick(400);assert.ok(!p.away);
 r.S.wet=true;r.emit('env');let sheltered=false;for(let i=0;i<800;i++){r.tick();sheltered||=['shelter','sleep'].includes(p.state);}assert.ok(sheltered);
 r.S.wet=false;p.hunger=.9;r.emit('action','feed');r.tick(800);assert.ok(r.S.supplies.food<1);assert.ok(p.hunger<.9);
});
test('atlas paths retain per-step ledge links, landing scale, occlusion and Pets off during flight',()=>{
 const r=rig(['orange'],{ledges:[{id:'bench',x0:500,x1:900,y:300,depth:700,scale:1.2}],links:[[{surf:'floor',x:500,y:600},{surf:'bench',x:600}]],scale:[[0,.8],[1000,1.4]]},'cats',true),p=r.pets.items[0];
 assert.ok(r.pets.trip(p,{surf:'bench',x:700},'sit'));let seen=false;
 for(let i=0;i<700;i++){r.tick();if(p.j){seen=true;assert.equal(p.j.x0,500);assert.equal(p.j.x1,600);assert.ok(p.k>=1.16&&p.k<=1.21);}}
 assert.ok(seen);assert.equal(p.surf,'bench');assert.equal(r.pets.frame(p).depth,700);
 r.LW.settings.pets=false;r.tick(1800);assert.ok(p.away);
});

test('atlas wake-up and picked transitions play complete stretch/perk sheets before following',()=>{
 const r=rig(['orange'],{},'cats',true),p=r.pets.items[0];r.pets.state(p,'sleep',100);r.tick(70);
 r.pets.state(p,'groom',100);let seen=new Set();for(let i=0;i<80;i++){r.tick();seen.add(p.spP);}for(let i=1;i<=8;i++)assert.ok(seen.has('stretch-'+i),'stretch '+i);
 r.pets.forceWalk(0,1300,600);r.tick(90);point(r,700,600);tap(r,p);seen=new Set();for(let i=0;i<120;i++){r.tick();seen.add(p.spP);}for(let i=1;i<=8;i++)assert.ok(seen.has('perk-'+i),'perk '+i);
});
test('atlas running contact frames share the ground instead of inheriting source sheet row drift',()=>{
 const r=rig(['orange'],{},'cats',true),p=r.pets.items[0];for(const [key,clip] of Object.entries(p.asset.clips))if(key.startsWith('run-')){
  for(const i of [0,3,4,7])assert.equal(clip.frames[i][5],clip.frames[i][3]-1,key+' contact '+i);
  for(const i of [1,2,5,6])assert.ok(clip.frames[i][5]>clip.frames[i][3]-1,key+' suspension '+i);
 }
});
