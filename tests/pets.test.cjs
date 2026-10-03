const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function rig(roster=['orange','golden'],extra={},scene='cats'){
 const listeners={},LW={settings:{pets:true},virtual:true,on:(k,f)=>(listeners[k]??=[]).push(f)};
 class Image{set src(v){this.srcName=v}}
 const context={LW,Image,performance:{now:()=>0},document:{createElement:()=>({width:200,height:100,getContext:()=>({drawImage(){},fillRect(){},createRadialGradient(){return {addColorStop(){}}}})})}};
 for(const file of ['pet-motion','pets'])vm.runInNewContext(fs.readFileSync(require.resolve('../scenes/'+file+'.js'),'utf8'),context);
 LW.petCycleMeasure=im=>({top:0,bot:im.height-1,cx:im.width*.5});LW.petCyclePrep=()=>true;
 const S={floor:[[[0,0],[2000,0],[2000,1000],[0,1000]]],bounds:[0,0,2000,1000],scale:[[0,1],[1000,1]],homes:[{x:300,y:600},{x:950,y:600},{x:1400,y:600}],exits:[{x:-300,y:600}],...extra};
 const pets=LW.pets.create({scene,roster,stage:()=>S});pets.initialized=true;
 const im=()=>({width:200,height:100,petK:1,petFa0:.5,petContact:{x:100,y:99,span:100}});
 for(const p of pets.items){const a=p.asset;a.img={walk1:im(),sit:im(),sleep:im(),lie:im()};a.unit=p.spec.height/100;a.seq={jump:true,'jump-f':true,'jump-b':true};a.cyc={img:{},cyc:{walk:true,'walk-f':true,'walk-b':true},has:q=>!!a.cyc.cyc[q]};
 for(const key of ['walk','walk-f','walk-b'])for(let i=1;i<=8;i++)a.img[key+'-'+i]=im();
 for(const key of ['jump','jump-f','jump-b'])for(let i=1;i<=5;i++)a.img[key+'-'+i]=im();a.ready=true;}
 pets.reset();pets.step(.01,0);return {LW,pets,S,context,tick:(n=1)=>{for(let i=0;i<n;i++)pets.step(1/30,i/30)}};
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
