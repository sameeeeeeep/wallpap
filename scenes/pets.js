/* Shared illustrated pets, built on pet-motion.js. Load after lw.js + pet-motion.js;
 * painted cats also load cat-atlas.js + cat-motion.js before this script.
 *
 * const pets = LW.pets.create({scene:'cafe', roster:['grey','golden'], stage:()=>STAGE});
 * pets.step(dt, seconds); pets.draw(ctx); pets.click(x,y); pets.toy(x,y);
 * pets.reset() after a layout change. pets.items is stable (never sort it in place).
 * pointer:()=>({x,y,inside?}) supplies scene-world cursor coordinates for FOLLOW.
 * click toggles picks; leave waits, focus pause/reset clears picks. Motion uses drawn
 * cycles/turns; no selection overlay or procedural animal animation.
 * Optional scene interactions: pets.trip(p, spot, restPose), pets.state(p, pose, seconds).
 * pets.walk(p, x, y, {gait,next}) still enforces stage geometry and mutual clearance.
 * pets.draw(ctx, extraOccluders) sorts pets + props together by ground depth.
 * For a GPU scene: pets.frame(p) gives its tinted image/quad/shadow; draw in depth order.
 *
 * STAGE uses the scene's own world units:
 * {floor:[polygon,...], scale:[[depth,scale],...],
 *  ledges:[{id,x0,x1,y,depth,scale}], links:[[{surf,x,y?},{surf,x,y?},kind?]],
 *  spots:[{id,x,y,surf?,kind?:'bed'|'sun'|'shelter'|'food'|'water',species?}],
 *  homes:[{x,y,surf?,state?,dir?}], exits:[{x,y}],
 *  occluders:[{depth,draw(ctx)}], light(x,y):[r,g,b], night:0..1, wet:boolean,
 *  clear:[x0,x1], avoid:[[x,y,w,h]], bounds:[x0,y0,x1,y1], slope?:.55}
 * Optional count limits visible members; supplies:{food,water} holds bowl levels 0..1.
 * A ledge's y is its paw baseline; depth is its supporting floor, used for scale/sorting.
 * Links are the ONLY legal jumps between surfaces ('floor' is the default surface).
 * Floor polygons are a union; every path segment is sampled inside them. All travel is
 * along a drawn floor heading (cats have all eight); animals lacking a complete directional cycle stay
 * strictly lateral. Species share reservations and predictive personal-space checks.
 * Settings pets=false/0/'false'/'0' walk everyone to exits; re-enable returns them.
 * Pandas mei/bao/cub are private to scene:'grass', outside the common seven-pet roster.
 * No procedural animal fallback: missing walk sheets hold the animal at rest.
 */
(() => {
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const screenOccluders=new Map();
const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const enabled=()=>![false,0,'0','false'].includes(LW.settings.pets);
const ROSTER=Object.freeze(Object.fromEntries([
 ...['orange','black','grey','calico','siamese'].map(id=>[id,Object.freeze({id,set:'cats/'+id,kind:'cat',height:78,
 poses:['walk1','walk2','sit','sleep','loaf','stretch'],sleep:'sleep',sit:'sit'})]),
 ...['golden','corgi'].map(id=>[id,Object.freeze({id,set:'dogs/'+id,kind:'dog',height:96,
 poses:['walk1','walk2','sit',...(id==='golden'?['lie','belly-up']:['sleep','play-bow'])],sleep:id==='golden'?'lie':'sleep',sit:'sit'})])
]));
const PANDAS=Object.fromEntries(['mei','bao','cub'].map(id=>[id,{id,set:'pandas/'+id,kind:'panda',height:id==='cub'?90:120,
 poses:['walk1','walk2',...(id==='mei'?['sit-eat','back-sleep']:id==='bao'?['sit-leaf','roll']:['back-sleep','tumble'])],
 sit:id==='mei'?'sit-eat':id==='bao'?'sit-leaf':'tumble',sleep:id==='bao'?'roll':'back-sleep'}]));
const cycle=p=>/^(walk|run|stalk)-(?:[fb]-)?\d/.test(p);
const family=p=>cycle(p)||p==='walk2'||p.startsWith('turn-')?'walk1':/^(jump|pounce)-/.test(p)?'jump':p.startsWith('hunt-')?'hunt':p.startsWith('perk-')?'sit':p;
function defringe(im) {
  try {
    const w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const id = g.getImageData(0, 0, w, h), a = id.data;
    for (let i = 0; i < a.length; i += 4) {
      const al = a[i + 3];
      if (al === 255 || al === 0) continue;
      const t = al / 255, k = 0.3 + 0.7 * t * t;
      a[i] *= k; a[i + 1] *= k; a[i + 2] *= k;
      a[i + 3] = al < 36 ? 0 : (al - 36) * (255 / 219);
    }
    g.putImageData(id, 0, 0);
    return cv;
  } catch (e) { return im; }   // e.g. a file:// origin that taints the canvas: use the raw art
}
function sprContact(im) {
  if(im.petContact)return im.petContact;
  const m=LW.petCycleMeasure(im),g=im.getContext&&im.getContext('2d');
  if(!g)return {x:m.cx,y:m.bot,span:im.width*.5};
  const a=g.getImageData(0,0,im.width,im.height).data,pts=[];
  for(let x=0;x<im.width;x++)for(let y=m.bot;y>=m.bot-(m.bot-m.top)*.12;y--){
    if(a[(y*im.width+x)*4+3]>127){pts.push([x,y]);break;}
  }
  if(!pts.length)return {x:m.cx,y:m.bot,span:im.width*.5};
  return im.petContact={x:pts.reduce((a,p)=>a+p[0],0)/pts.length,y:pts.reduce((a,p)=>a+p[1],0)/pts.length,span:pts[pts.length-1][0]-pts[0][0]};
}
function asset(spec) {
 if(spec.kind==='cat'&&LW.cats){const atlas=LW.cats.load(spec);if(atlas)return atlas;}
 const s={spec,img:{},seq:{},seqRaw:{},ready:false};
 for(const p of spec.poses){const im=new Image();im.onload=()=>{if(im.naturalWidth)s.img[p]=defringe(im)};im.src=LW.petArtPath('art/sprites/',spec.set,p)}
 s.cyc=LW.petCycleLoad('art/sprites/',spec.set);
 for(const q of [...(LW.PET_SEQ_HAS[spec.set]||[]),...Object.keys(LW.PET_JUMP_LAYOUT[spec.set]||{}),...Object.keys(LW.PET_FOLLOW_LAYOUT?.[spec.set]||{})]){
  const ims=[];let n=0;
  for(let i=1;i<=5;i++){const im=new Image();im.onload=()=>{if(im.naturalWidth&&++n===5)s.seqRaw[q]=ims};im.src=LW.petArtPath('art/sprites/',spec.set,'t/'+q+'-'+i);ims.push(im)}
 }
 return s;
}
function prep(s){
 if(s.atlas)return s.ready;
 const w=s.img.walk1;if(!w)return false;
 if(!s.unit){s.unit=s.spec.height/w.height;s.ref=LW.petCycleMeasure(w);}
 if(!s.cyclesPrepared){LW.petCyclePrep(s.cyc,{im:w,k:1,fa:.555},defringe);Object.assign(s.img,s.cyc.img);s.cyclesPrepared=s.cyc.ready;}
 const ends={walk1:'walk1',sit:s.spec.sit,sleep:s.spec.sleep};
 for(const q in s.seqRaw){
  const ims=s.seqRaw[q],end=q==='stand-sit'?['walk1','sit']:q==='sit-sleep'?['sit','sleep']:['walk1','walk1'];
  if(!end.every(e=>s.img[ends[e]]))continue;
  const E=end.map(e=>{const p=ends[e],im=s.img[p];return {im,k:LW.petPoseScale(s.spec.kind,p,w,im),fa:e==='walk1'?.555:.5}});
  const geom=(LW.PET_JUMP_LAYOUT[s.spec.set]||{})[q]||(LW.PET_FOLLOW_LAYOUT?.[s.spec.set]||{})[q];
  const layouts=geom?ims.map((im,i)=>{const k=(s.ref.bot-s.ref.top+1)/geom.height;return {k,fa:(geom.centers[i]+(.555*w.width-s.ref.cx)/k)/im.width}}):LW.petSeqLayout(q,ims.map(im=>[im.width,im.height]),...E);
  ims.forEach((im,i)=>{const d=defringe(im),l=layouts[i];d.petK=l.k;d.petFa=d.petFa0=l.fa;d.petFootPad=geom?geom.pad:0;d.petName=q+'-'+(i+1);s.img[d.petName]=d});
  s.seq[q]=true;delete s.seqRaw[q];
 }
 s.ready=true;return true;
}
function tint(p,im,key,m){
 let t=p.tint[key];
 if(t&&t.m.every((v,i)=>Math.abs(v-m[i])<.035))return t.cv;
 if(!t)t=p.tint[key]={cv:document.createElement('canvas')};
 const cv=t.cv;if(cv.width!==im.width||cv.height!==im.height){cv.width=im.width;cv.height=im.height;}
 const g=cv.getContext('2d');g.globalCompositeOperation='copy';g.drawImage(im,0,0);
 g.globalCompositeOperation='multiply';g.fillStyle=`rgb(${m.map(v=>Math.round(clamp(v)*255)).join(',')})`;g.fillRect(0,0,cv.width,cv.height);
 g.globalCompositeOperation='destination-in';g.drawImage(im,0,0);g.globalCompositeOperation='source-over';t.m=m.slice();return cv;
}
function inside(pt,poly){
 let c=false;const [x,y]=pt;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j],cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
  if(Math.abs(cross)<1e-6&&x>=Math.min(a[0],b[0])-1e-6&&x<=Math.max(a[0],b[0])+1e-6&&y>=Math.min(a[1],b[1])-1e-6&&y<=Math.max(a[1],b[1])+1e-6)return true;
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;
 }return c;
}
function scaleAt(depth,map){
 if(typeof map==='function')return map(depth);
 map=map||[[0,1],[1000,1]];
 for(let i=1;i<map.length;i++)if(depth<=map[i][0])return lerp(map[i-1][1],map[i][1],clamp((depth-map[i-1][0])/(map[i][0]-map[i-1][0])));
 return map[map.length-1][1];
}
// Same heading decomposition as Santorini, including shallow trips (no depth drift in side art).
function headings(a,b,slope=.55,directional=true,eight=false){
 const dx=b[0]-a[0],dy=b[1]-a[1];
 if(!directional||Math.abs(dy)<1e-5)return [[a,[b[0],a[1]]]];
 const run=Math.abs(dy)/slope,sx=Math.sign(dx)||1;
 if(eight){const x=sx*Math.min(Math.abs(dx),run),y=Math.sign(dy)*Math.min(Math.abs(dy),Math.abs(dx)*slope);return [[a,[a[0]+x,a[1]+y],b],[a,[b[0]-x,b[1]-y],b]];}
 if(run<=Math.abs(dx))return [[a,[a[0]+sx*run,b[1]],b],[a,[b[0]-sx*run,a[1]],b]];
 return [1,-1].map(s=>{const k=(run+s*dx)/2;return [a,[a[0]+s*k,a[1]+Math.sign(dy)*k*slope],b]});
}
const length=pts=>pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]),0);
function overlap(a,b,gap=8){return a[0]<b[2]+gap&&a[2]+gap>b[0]&&a[1]<b[3]+gap&&a[3]+gap>b[1]}
function create({scene,roster,stage,pointer=()=>LW.pointer}){
 let S=null,T=0,was=enabled(),clock=0,screenMap=null;
 const cursor={x:0,y:0,inside:false,speed:0,still:0,heading:[1,0],seen:false};
 function panelBoxes(){if(!screenMap)return [];const {m,rect,sx,sy}=screenMap;return [...screenOccluders.values()].map(r=>{const a=m.transformPoint({x:(r[0]-rect.x)*sx,y:(r[1]-rect.y)*sy}),b=m.transformPoint({x:(r[0]+r[2]-rect.x)*sx,y:(r[1]+r[3]-rect.y)*sy});return [Math.min(a.x,b.x),Math.min(a.y,b.y),Math.max(a.x,b.x),Math.max(a.y,b.y)];});}
 function panelClear(b){return !panelBoxes().some(r=>overlap(b,r,10));}
 const wanted=p=>!(LW.virtual&&p.mission==='qa-hidden')&&enabled()&&p.id<(S.count??items.length);
 const items=roster.map((r,i)=>{
  const opt=typeof r==='string'?{id:r}:r,spec=ROSTER[opt.id]||(scene==='grass'&&PANDAS[opt.id]);
  if(!spec)throw Error('Unknown pet '+opt.id+' in '+scene);
  return {id:i,rosterId:opt.id,kind:spec.kind,spec,asset:asset(spec),x:0,y:0,z:0,k:1,surf:'floor',state:'sit',t:0,dur:rand(3,8),dir:1,
   gd:0,gait:'walk',groundVX:0,groundVY:0,tint:{},light:[1,1,1],hunger:rand(.1,.4),thirst:rand(.1,.4),lazy:[.2,.7,.4,.1,.5][i%5],
   path:null,route:[],goal:null,j:null,spP:spec.sit,spFam:'sit',poseT:1,prev:null,sequence:null,away:!was,gone:!was,
   scale:opt.scale||1,mission:null,head:[0,0],headW:[0,0],happyT:0,awake:0,blocked:0,opt};
 });
 const ledge=id=>(S.ledges||[]).find(l=>l.id===id);
 const depth=p=>p.j?(p.state==='jumpPrep'?p.j.d0:p.state==='land'?p.j.d1:lerp(p.j.d0,p.j.d1,clamp(p.t/p.j.dur))):p.surf==='floor'?p.y:(ledge(p.surf)?.depth??p.y);
 const size=(p,y=p.y,surf=p.surf)=>p.scale*(surf==='floor'?scaleAt(y,S.scale):(ledge(surf)?.scale??scaleAt(ledge(surf)?.depth??y,S.scale)));
 function box(p,x=p.x,y=p.y,z=p.z,k=size(p,y)){
  const a=p.asset,w=a.img.walk1,wide=w?w.width*a.unit:p.spec.height*1.8;
  // Full-body clearance includes the head of the foreground pet. No cat riding a dog's back.
  const h=p.spec.height*k*1.15,half=wide*k*.57;
  return [x-half,y-z-h,x+half,y-z+4*k];
 }
 function flightBoxes(p,j){
  return Array.from({length:13},(_,i)=>{const u=i/12;return box(p,lerp(j.x0,j.x1,u),lerp(j.y0,j.y1,u),Math.sin(Math.PI*u)*j.h,lerp(j.k0,j.k1,u))});
 }
 function free(p,x,y,surf=p.surf,reserve=true){
  const b=box(p,x,y,0,size(p,y,surf));
  return items.every(o=>o===p||o.away||(!overlap(b,box(o))&&
   (!o.j||!flightBoxes(o,o.j).some(q=>overlap(b,q)))&&
   (!reserve||!o.goal||!overlap(b,box(o,o.goal.x,o.goal.y,0,size(o,o.goal.y,o.goal.surf))))));
 }
 // Walking cats go round cats that are resting, but pass cats that are themselves on the move (following
 // you, or walking the other way): one passes in front of the other, as real cats do in a narrow spot.
 function freeIdle(p,x,y){const b=box(p,x,y,0,size(p,y,p.surf));return items.every(o=>o===p||o.away||o.chase||o.picked||(o.state==='move'&&!p.mission&&!o.mission)||(!overlap(b,box(o))&&(!o.j||!flightBoxes(o,o.j).some(q=>overlap(b,q)))));}
 function flightClear(p,j){return flightBoxes(p,j).every(b=>panelClear(b)&&items.every(o=>o===p||o.away||(!overlap(b,box(o))&&(!o.j||!flightBoxes(o,o.j).some(q=>overlap(b,q))))));}
 function allowed(p,x,y,surf=p.surf,exit=false){
  if(!panelClear(box(p,x,y))&&panelClear(box(p)))return false;
  if(surf!=='floor'){const l=ledge(surf);return !!l&&x>=l.x0-1e-5&&x<=l.x1+1e-5&&Math.abs(y-l.y)<1;}
  if(exit&&!directions(p))return true;
  if(exit){const e=(S.exits||[]).find(e=>Math.abs(y-e.y)<1);if(e)return true;}
  return (S.floor||[]).some(poly=>inside([x,y],poly));
 }
 function clearRest(p,x,y){
  const [a,b]=S.clear||[-Infinity,Infinity];
  return panelClear(box(p,x,y))&&x>=a+p.spec.height*p.k*.6&&x<=b-p.spec.height*p.k*.6&&!(S.avoid||[]).some(r=>overlap(box(p,x,y),[r[0],r[1],r[0]+r[2],r[1]+r[3]],0));
 }
 function directions(p){return p.asset.cyc.has('walk-f')&&p.asset.cyc.has('walk-b')}
 function validPath(p,pts,exit=false,avoidPets=true){
  // A followed cat already standing in a keep-clear strip may walk out of it, never further in.
  let escaping=p.picked&&!exit&&!clearRest(p,...pts[0]);
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4));   // 4 px: never step over a floor notch
   for(let j=1;j<=n;j++){const x=lerp(a[0],b[0],j/n),y=lerp(a[1],b[1],j/n),rest=!p.picked||exit||clearRest(p,x,y);if(rest)escaping=false;
    if(!allowed(p,x,y,p.surf,exit)||(!rest&&!escaping)||(avoidPets&&!free(p,x,y,p.surf,false)))return false;}
  }return true;
 }
 function plan(p,x,y,exit=false,ignorePets=false){
  const valid=pts=>validPath(p,pts,exit,!ignorePets);
  if(p.surf!=='floor'||!directions(p))y=p.y;
  const a=[p.x,p.y],b=[x,y],slope=S.slope||.55;
  let candidates=headings(a,b,slope,directions(p),!!p.asset.atlas);
  let best=candidates.filter(q=>valid(q)).sort((a,b)=>length(a)-length(b))[0];
  if(!best&&p.surf==='floor'&&directions(p)){
   // Route around pets/props using visibility candidates; every edge still uses drawn headings.
   const bounds=S.bounds||[0,0,1600,1000],ys=[bounds[1]+10,bounds[3]-10];
   for(const r of panelBoxes()){ys.push(r[1]-20,r[3]+p.spec.height*size(p)*1.4+20);}
   if(p.picked)for(const r of S.avoid||[]){ys.push(r[1]-p.spec.height*p.k*.2-18,r[1]+r[3]+p.spec.height*p.k*1.3+18);}
   for(const o of items)if(o!==p&&!o.away){const b=box(o),h=p.spec.height*size(p);ys.push(b[1]-18,b[3]+h*1.3+18)}
   for(const yy of ys)for(const xx of [a[0],b[0],(a[0]+b[0])/2]){
    const m=[xx,clamp(yy,bounds[1],bounds[3])];
    for(const q of headings(a,m,slope,true,!!p.asset.atlas))if(valid(q))for(const r of headings(m,b,slope,true,!!p.asset.atlas)){
     const v=[...q,...r.slice(1)];if(valid(v)&&(!best||length(v)<length(best)))best=v;
    }
   }
  }
  // No way round the other cats: an idle cat simply doesn't go (it would only walk into them and stall).
  // Cats leaving, entering or following still take the direct route and wait their turn on it.
  const idle=!p.picked&&!['leave','enter','qa'].includes(p.mission);
  return best?{pts:best.filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>.01),i:1}:ignorePets||idle?null:plan(p,x,y,exit,true);
 }
 function state(p,name,dur=rand(4,10)){
  if(p.away&&name!=='away')return;
  if(p.j&&!['jumpPrep','jump','land'].includes(name))return;
  p.state=name;p.t=0;p.dur=dur;if(name!=='move')p.path=null;
 }
 function nearest(p,x,y){
  if(!directions(p))y=p.y;
  if(allowed(p,x,y)&&clearRest(p,x,y)&&free(p,x,y))return [x,y];
  const b=S.bounds||[0,0,1600,1000];
  let best=null,d=Infinity;
  for(let yy=directions(p)?b[1]:p.y;yy<= (directions(p)?b[3]:p.y);yy+=30)for(let xx=b[0];xx<=b[2];xx+=35){
   const dd=Math.hypot(xx-x,yy-y);if(dd<d&&allowed(p,xx,yy)&&clearRest(p,xx,yy)&&free(p,xx,yy)){best=[xx,yy];d=dd;}
  }return best;
 }
 function walk(p,x,y,{gait=null,next=null,exit=false}={}){
  if(p.away||p.j)return false;
  if(!directions(p)||p.surf!=='floor')y=p.y;
  p.goal={x,y,surf:p.surf};p.path=plan(p,x,y,exit);p.exitPath=exit;p.next=next;p.gait=gait||(p.asset.atlas&&Math.hypot(x-p.x,(y-p.y)/(S.slope||.55))>p.spec.height*p.k*3?'run':'walk');p.waited=0;
  // No route right now (another cat or a prop in the way): an idle cat just stays where it is,
  // instead of getting up and standing frozen for seconds. Exits, entries and following still wait.
  if(!p.path&&!exit&&!p.picked&&!['leave','enter','qa'].includes(p.mission)){p.goal=null;p.next=null;return false;}
  state(p,'move',1e9);pose(p,0);p.blocked=0;return !!p.path;
 }
 // A landing declared just outside a floor edge is clamped to that physical edge.
 // This also keeps a resize from stranding a pet inside a chair/stair footprint.
 function floorPoint(x,y){
  if((S.floor||[]).some(poly=>inside([x,y],poly)))return [x,y];let best=null,d=Infinity;
  for(const poly of S.floor||[])for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],u=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));
   const q=[a[0]+u*dx,a[1]+u*dy],dd=Math.hypot(x-q[0],y-q[1]);if(dd<d){best=q;d=dd;}
  }return best;
 }
 function jump(p,x,y,surf,next,action=null){
  if(surf==='floor'){const q=floorPoint(x,y);if(!q)return false;[x,y]=q;}else{const l=ledge(surf);if(!l)return false;x=clamp(x,l.x0,l.x1);y=l.y;}
  if(p.away||!free(p,x,y,surf))return false;
  const d0=depth(p),d1=surf==='floor'?y:ledge(surf).depth;
  const dir=p.asset.atlas?LW.cats.direction(x-p.x,d1-d0,S.slope||.55,p._catDir):LW.petJumpDirection(p,x-p.x,d1-d0),key=p.asset.atlas?'jump-'+dir.view:action?(action+(dir.view==='side'?'':'-'+dir.view)):LW.petJumpKey(dir.view,q=>p.asset.seq[q]);
  if(action&&!p.asset.atlas&&!p.asset.seq[key])return false;
  if(!key||p.asset.atlas&&!p.asset.clips[key])return false;
  // A missing depth jump cannot glide: take the lateral jump only when depth is unchanged.
  if(dir.view!=='side'&&key==='jump'&&Math.abs(d1-d0)>1)return false;
  p.j={x0:p.x,y0:p.y,x1:x,y1:y,s0:p.surf,s1:surf,d0,d1,k0:size(p),k1:size(p,y,surf),view:dir.view,key,action,
   dur:.36+Math.abs(y-p.y)*.0007+Math.abs(x-p.x)*.00055,h:(action?22:34)+Math.max(0,p.y-y)*.32,next,catDir:p.asset.atlas?dir:null};
  if(!flightClear(p,p.j)){p.j=null;return false;}
  p.dir=dir.face;if(p.asset.atlas){p._catDir=dir;p._catTransition=null;}p.goal={x,y,surf};p.sequence=null;p.prev=null;LW.petJumpLand(p);state(p,'jumpPrep',.34);pose(p,0);return true;
 }
 function trip(p,target,rest='sit'){
  if(p.away)return false;
  const dest={surf:'floor',...target};if(dest.surf!=='floor'&&!ledge(dest.surf))return false;
  dest.y=dest.surf==='floor'?dest.y:ledge(dest.surf).y;
  if(!allowed(p,dest.x,dest.y,dest.surf)||!free(p,dest.x,dest.y,dest.surf))return false;
  const finish=q=>{q.goal=null;q.route=[];state(q,rest,rand(10,35));};
  if(p.surf===dest.surf)return walk(p,dest.x,dest.y,{next:finish});
  const links=(S.links||[]).filter(l=>!l[2]||l[2]===p.kind),queue=[[p.surf,[]]],seen=new Set([p.surf]);let route;
  while(queue.length){const [s,path]=queue.shift();if(s===dest.surf){route=path;break;}
   for(const l of links){const ab=l[0].surf===s?[l[0],l[1]]:l[1].surf===s?[l[1],l[0]]:null;
    if(ab&&!seen.has(ab[1].surf)){seen.add(ab[1].surf);queue.push([ab[1].surf,[...path,ab]])}}
  }
  if(!route)return false;
  function leg(q){
   const ab=route.shift();if(!ab)return walk(q,dest.x,dest.y,{next:finish});
   const [a,b]=ab,ay=a.surf==='floor'?a.y:ledge(a.surf).y,by=b.surf==='floor'?b.y:ledge(b.surf).y;
   const start=a.surf==='floor'?floorPoint(a.x,ay):[a.x,ay];
   walk(q,...start,{next:r=>{
    const launch=()=>{if(!jump(r,b.x,by,b.surf,leg)){r.goal=null;state(r,'sit',2)}};
    if(r.picked){const d1=b.surf==='floor'?by:ledge(b.surf).depth,dir=r.asset.atlas?LW.cats.direction(b.x-r.x,d1-depth(r),S.slope||.55,r._catDir):LW.petJumpDirection({dir:r.dir},b.x-r.x,d1-depth(r));turnTo(r,dir.view,dir.face,launch);}
    else launch();
   }});
  }leg(p);return true;
 }
 function leave(p){
  if(p.away)return;if(wanted(p)){p.mission=null;return think(p);}p.mission='leave';p.goal=null;
  if(p.j)return;
  const e=(S.exits||[])[p.id%(S.exits||[]).length];if(!e){p.away=p.gone=true;return;}
  const gone=q=>{q.away=q.gone=true;q.mission=null;q.goal=null;state(q,'away',1e9)};
  if(p.surf!=='floor'){
   const links=(S.links||[]).filter(l=>l[0].surf===p.surf||l[1].surf===p.surf);
   const l=links.find(l=>l[0].surf==='floor'||l[1].surf==='floor')||links[0];
   if(l){const b=l[l[0].surf===p.surf?1:0];if(jump(p,b.x,b.surf==='floor'?b.y:ledge(b.surf).y,b.surf,leave))return;}
   state(p,'sit',1);return;
  }
  // Side-only pandas leave along their existing lane into the grove, never change depth.
  const y=directions(p)?e.y:p.y;
  if(Math.abs(p.y-y)>1){
   const xs=[];for(let x=S.bounds[0]+5;x<S.bounds[2];x+=10)if(allowed(p,x,y,'floor'))xs.push(x);
   const forward=Math.sign(e.x-p.x)||1,ideal=p.x+forward*Math.abs(y-p.y)/(S.slope||.55);
   xs.sort((a,b)=>Math.abs(a-ideal)-Math.abs(b-ideal));let x=xs[0];
   for(const q of xs)if(plan(p,q,y)){x=q;break;}
   if(x!=null)walk(p,x,y,{next:leave});else state(p,'sit',1);return;
  }
  walk(p,e.x,y,{next:gone,exit:true});
 }
 function yieldExit(p){
  if(p.mission!=='leave'||p.waited<3||p.surf!=='floor')return false;
  const e=(S.exits||[])[p.id%(S.exits||[]).length];if(!e)return false;
  const ahead=items.some(o=>o!==p&&!o.away&&o.mission==='leave'&&Math.abs(e.x-o.x)<Math.abs(e.x-p.x)&&Math.abs(o.x-p.x)<400);
  if(!ahead)return false;
  const x=p.x-Math.sign(e.x-p.x)*120;
  if(!validPath(p,[[p.x,p.y],[x,p.y]]))return false;
  return walk(p,x,p.y,{next:leave});
 }
 function think(p){
  if(p.picked){p.goal=null;state(p,'followWait',1e9);return;}
  if(p.mission==='enter')return;
  p.goal=null;if(!wanted(p))return leave(p);if(p.mission==='qa')return state(p,'stand',1e9);
  const spots=(S.spots||[]).filter(s=>(directions(p)||s.surf||Math.abs(s.y-p.y)<1)&&(!s.species||s.species===p.kind)&&clearRest(p,s.x,s.y??ledge(s.surf)?.y));
  if(S.wet){const safe=spots.filter(s=>s.kind==='shelter');for(const sp of safe)if(trip(p,sp,'shelter'))return;}
  if(LW.calm){const beds=spots.filter(s=>s.kind==='bed'||s.kind==='shelter');for(const sp of beds)if(trip(p,sp,'sleep'))return;return state(p,'sleep',rand(25,60));}
  for(const kind of ['food','water'])if((kind==='food'?p.hunger:p.thirst)>.6){
   const sp=spots.find(s=>s.kind===kind&&(!S.supplies||S.supplies[kind]>.01));if(sp&&trip(p,sp,kind==='food'?'eat':'drink'))return;
  }
  const sl=clamp(p.lazy*.2+p.awake/500+(S.night||0)*.2),r=Math.random();
  // Idle cats don't wander: they rest where they are and only get up to eat, drink, or move to a
  // proper napping spot (bed, sun patch, shelter) once in a while.
  const naps=spots.filter(s=>['bed','sun','shelter'].includes(s.kind));
  const onSpot=naps.some(s=>Math.hypot(s.x-p.x,(s.y??p.y)-p.y)<p.spec.height*p.k*.8);
  if(!onSpot&&naps.length&&r<.18+sl*.3){const sp=pick(naps);if(trip(p,sp,sp.kind==='shelter'?'shelter':'sleep'))return;}
  state(p,pick(['sit','loaf','loaf','groom',...(sl>.3?['sleep','sleep','sleep']:['sit'])]),rand(20,sl>.3?90:45));
 }
 // FOLLOW owns intent; the existing path/jump engine still owns every position.
 function samplePointer(dt){
  const q=pointer?.();const on=!!q&&(q.inside??LW.pointer?.inside??false)&&LW.focused!==false;
  if(!on||!Number.isFinite(q.x)||!Number.isFinite(q.y)){cursor.inside=false;cursor.speed=0;cursor.still=0;return;}
  const dx=q.x-cursor.x,dy=q.y-cursor.y,d=cursor.seen?Math.hypot(dx,dy):0;
  cursor.speed=lerp(cursor.speed,d/Math.max(dt,1/120),1-Math.exp(-dt*12));
  if(!cursor.seen||Math.hypot(q.x-cursor.restX,q.y-cursor.restY)>2){cursor.still=0;cursor.restX=q.x;cursor.restY=q.y;}else cursor.still+=dt;
  if(d>1)cursor.heading=[dx/d,dy/d];
  Object.assign(cursor,{x:q.x,y:q.y,inside:true,seen:true});
 }
 function project(p,x,y,reserve=false){
  if(!directions(p))y=p.y;
  const ok=(x,y)=>allowed(p,x,y,'floor')&&clearRest(p,x,y)&&(!reserve||free(p,x,y,'floor'));
  if(ok(x,y))return [x,y];
  let best=null,dd=Infinity;
  const test=(xx,yy)=>{const d=(xx-x)**2+(yy-y)**2;if(d<dd&&ok(xx,yy)){best=[xx,yy];dd=d;}};
  const q=floorPoint(x,y);if(q)test(...q);
  const b=S.bounds||[0,0,1600,1000],margin=p.spec.height*p.k*.6,clear=S.clear||[b[0],b[2]];
  const xx=clamp(x,clear[0]+margin,clear[1]-margin);test(xx,y);const edge=floorPoint(xx,y);if(edge)test(...edge);
  for(const poly of S.floor||[])for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],u=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));test(a[0]+u*dx,a[1]+u*dy);
  }
  // Include expanded prop edges, then refine the fallback lattice to a scene pixel.
  const body=box(p,0,0,0,p.k);
  for(const [rx,ry,rw,rh] of S.avoid||[]){
   const xs=[rx-body[2]-1,rx+rw-body[0]+1],ys=[ry-body[3]-1,ry+rh-body[1]+1];
   for(const xx of xs)test(xx,y);for(const yy of ys)test(x,yy);for(const xx of xs)for(const yy of ys)test(xx,yy);
  }
  for(let yy=directions(p)?b[1]:p.y;yy<=(directions(p)?b[3]:p.y);yy+=30)for(let xx=b[0];xx<=b[2];xx+=35)test(xx,yy);
  if(best)for(const step of [10,3,1]){const c=best.slice();for(let dy=directions(p)?-3:0;dy<=(directions(p)?3:0);dy++)for(let dx=-3;dx<=3;dx++)test(c[0]+dx*step,c[1]+dy*step);}
  return best;
 }
 // Route around props for a chasing cat: A* over a grid of walkable floor points (the floor polygons,
 // panels and keep-clear areas this cat may use), then pulled tight so it walks the fewest straight legs.
 // Shortest way round a floor corner (stairs notch, terrace edge): a visibility graph over points just
 // inside each floor-polygon corner. Tried before the coarse grid, which cannot hug corners.
 const cornerCache=new Map();
 function cornerRoute(p,tx,ty){
  const d=Math.max(10,Math.round(p.spec.height*p.k*.12/4)*4);
  const key=[p.rosterId||p.id,d,JSON.stringify(S.floor||[]).length,JSON.stringify(S.clear||[]),JSON.stringify(panelBoxes())].join('|');
  let C=cornerCache.get(key);
  if(!C){const pts=[];for(const poly of S.floor||[])for(const v of poly)for(const [ox,oy] of [[d,d],[-d,d],[d,-d],[-d,-d]]){const x=v[0]+ox,y=v[1]+oy*.6;if(allowed(p,x,y,'floor')&&clearRest(p,x,y))pts.push([x,y]);}
   C={pts,edge:new Map()};if(cornerCache.size>24)cornerCache.clear();cornerCache.set(key,C);}
  const pts=C.pts;if(!pts.length||pts.length>80)return null;
  const all=[[p.x,p.y],...pts,[tx,ty]],n=all.length,dist=new Array(n).fill(Infinity),from=new Array(n).fill(-1),done=new Array(n).fill(false);dist[0]=0;
  // Corner-to-corner visibility never changes for this stage and size: cached. Only the legs to the cat and the target are checked per call.
  const ok=(a,b)=>{if(a===0||b===n-1||a===n-1||b===0)return validPath(p,[all[a],all[b]],false,false);const k=a<b?a*512+b:b*512+a;let v=C.edge.get(k);if(v===undefined){v=validPath(p,[all[a],all[b]],false,false);C.edge.set(k,v);}return v;};
  for(;;){let u=-1;for(let i=0;i<n;i++)if(!done[i]&&dist[i]<Infinity&&(u<0||dist[i]<dist[u]))u=i;if(u<0||u===n-1)break;done[u]=true;
   for(let v=1;v<n;v++)if(!done[v]){const c=dist[u]+Math.hypot(all[v][0]-all[u][0],all[v][1]-all[u][1]);if(c<dist[v]&&ok(u,v)){dist[v]=c;from[v]=u;}}}
  if(from[n-1]<0)return null;const route=[];for(let i=n-1;i>0;i=from[i])route.unshift(all[i]);
  return {pts:[[p.x,p.y],...route],i:1};
 }
 const gridCache=new Map();
 function routeAround(p,tx,ty){
  const b=S.bounds||[0,0,1600,1000],step=Math.max(24,Math.round(p.spec.height*p.k*.45/8)*8);
  // The walkable grid (and which neighbours connect) depends only on the stage and the cat's size: cached.
  const key=[p.rosterId||p.id,step,b.join(),JSON.stringify(S.floor||[]).length,JSON.stringify(S.clear||[]),JSON.stringify(panelBoxes())].join('|');
  let G=gridCache.get(key);
  if(!G){
   const nodes=[],at=new Map();
   for(let y=b[1]+step*.5,r=0;y<b[3];y+=step*.55,r++)for(let x=b[0]+step*.5,c=0;x<b[2];x+=step,c++)if(allowed(p,x,y,'floor')&&clearRest(p,x,y)){at.set(r*4096+c,nodes.length);nodes.push({x,y,r,c,nb:null});}
   const walk=(a,c)=>{for(const u of [.25,.5,.75]){const x=lerp(a.x,c.x,u),y=lerp(a.y,c.y,u);if(!allowed(p,x,y,'floor')||!clearRest(p,x,y))return false;}return true;};
   for(const n of nodes){n.nb=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const j=at.get((n.r+dr)*4096+n.c+dc);if(j!=null&&walk(n,nodes[j]))n.nb.push(j);}}
   G={nodes};if(gridCache.size>24)gridCache.clear();gridCache.set(key,G);
  }
  const nodes=G.nodes;if(!nodes.length)return null;
  const ok=(a,c)=>validPath(p,[a,c],false,false);
  const near=(x,y)=>nodes.map((n,i)=>[Math.hypot(n.x-x,n.y-y),i]).sort((u,v)=>u[0]-v[0]).slice(0,8).filter(([,i])=>ok([x,y],[nodes[i].x,nodes[i].y])).map(([,i])=>i);
  const starts=near(p.x,p.y),goals=new Set(near(tx,ty));if(!starts.length||!goals.size)return null;
  // A* with a binary heap.
  const g=new Map(),from=new Map(),heap=[],h=i=>Math.hypot(nodes[i].x-tx,nodes[i].y-ty);
  const push=(i,f)=>{heap.push([f,i]);let k=heap.length-1;while(k){const q=(k-1)>>1;if(heap[q][0]<=heap[k][0])break;[heap[q],heap[k]]=[heap[k],heap[q]];k=q;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m;}}return top;};
  for(const i of starts){const c=Math.hypot(nodes[i].x-p.x,nodes[i].y-p.y);g.set(i,c);push(i,c+h(i));}
  let end=null,guard=0;const done=new Set();
  while(heap.length&&guard++<6000){
   const [,cur]=pop();if(done.has(cur))continue;done.add(cur);
   if(goals.has(cur)){end=cur;break;}const n=nodes[cur];
   for(const j of n.nb){const m=nodes[j],cost=g.get(cur)+Math.hypot(m.x-n.x,m.y-n.y);if(cost<(g.get(j)??Infinity)){g.set(j,cost);from.set(j,cur);push(j,cost+h(j));}}
  }
  if(end==null)return null;
  const chain=[];for(let i=end;i!=null;i=from.get(i))chain.unshift([nodes[i].x,nodes[i].y]);
  // Pull the route tight: from each corner, go as far along the chain as is visible in a straight line.
  const raw=[[p.x,p.y],...chain,[tx,ty]],pts=[raw[0]];
  for(let i=0;i<raw.length-1;){let j=i+1;while(j+1<raw.length&&ok(raw[i],raw[j+1]))j++;pts.push(raw[j]);i=j;}
  return {pts,i:1};
 }
 function halt(p,name='followWait',seconds=1e9){
  p.chase=false;p.path=null;p.goal=null;p.next=null;p.turn=null;p.sequence=null;p.prev=null;state(p,name,seconds);
 }
 function turnTo(p,view,face,next){
  if(p.asset.atlas){const v={f:'near',b:'far'}[view]||view,octant=v==='toward'?2:v==='away'?6:v==='near'?(face<0?3:1):v==='far'?(face<0?5:7):face<0?4:0;return LW.cats.startTurn(p,{view:v,face,octant},next);}
  const old=p._petDirection||{view:'side',face:p.dir},steps=[];
  const add=(key,rev,dir)=>{if(p.asset.seq[key])for(let i=0;i<5;i++)steps.push({name:key+'-'+(rev?5-i:i+1),dir});};
  if(old.view!==view||old.face!==face){
   if(old.view!=='side')add('turn-'+old.view,true,old.face);
   if(old.face!==face)add('turn',false,old.face);
   if(view!=='side')add('turn-'+view,false,face);
  }
  if(!steps.length){p.dir=face;p._petDirection={view,face};if(next)next();return false;}
  p.turn={steps,t:0,view,face,next};p.sequence=null;p.prev=null;return true;
 }
 function purr(){
  if(LW.muted||LW.audioPrefs?.fx?.on===false||LW.audioPrefs?.fx?.vol===0||!LW.audio||!LW.bus)return;
  const ctx=LW.audio(),bus=LW.bus('fx');if(!ctx||!bus)return;
  const o=ctx.createOscillator(),g=ctx.createGain(),mod=ctx.createOscillator(),mg=ctx.createGain(),t=ctx.currentTime;
  o.type='triangle';o.frequency.value=92;mod.frequency.value=24;mg.gain.setValueAtTime(.008,t);mg.gain.linearRampToValueAtTime(0,t+.47);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.014,t+.07);g.gain.exponentialRampToValueAtTime(.0001,t+.48);
  mod.connect(mg);mg.connect(g.gain);o.connect(g);g.connect(bus);o.start(t);mod.start(t);o.stop(t+.5);mod.stop(t+.5);
  o.onended=()=>{o.disconnect();mod.disconnect();mg.disconnect();g.disconnect();};
 }
 function release(p){
  p.picked=false;p.follow=null;p.mission=null;
  if(p.j){p.j.next=q=>halt(q,'groom',2.5);return;}
  halt(p,'groom',2.5);
 }
 function pickPet(p){
  if(p.picked){release(p);return;}
  p.picked=true;p.follow={phase:'picked',cooldown:1.8,repath:0};p.mission='follow';p.happyT=0;p.awake=0;
  const begin=()=>{halt(p,'picked',p.asset.atlas?1e9:1.05);turnTo(p,p.asset.atlas?'toward':directions(p)?'f':'side',p.dir);};
  if(p.j)p.j.next=()=>{if(p.picked)begin();};else begin();
  purr();
 }
 function clearPicks(){for(const p of items)if(p.picked){release(p);if(!p.j)halt(p,'sit',2);}}
 const bodyLength=p=>{const b=box(p);return (b[2]-b[0])*.9;};
 function fanTarget(p,q){
  const group=items.filter(o=>o.picked&&!o.away),i=group.indexOf(p),n=group.length;
  const radius=Math.max(...group.map(bodyLength),bodyLength(p))*(n>1?1.4+.3*(n-2):.8);
  const angle=Math.atan2(-cursor.heading[1],-cursor.heading[0])+(n>1?(i/(n-1)-.5)*2.4:0);
  return project(p,q[0]+Math.cos(angle)*radius,q[1]+Math.sin(angle)*radius,true);
 }
 // Group follow for cats: one shared fan of slots around the cursor. The fan faces the side the cats
 // are on and turns slowly; slot order is fixed when the group forms, so cats never swap or cross.
 const fan={a:null,t:-1,ids:''};
 function catSlot(p,q,group){
  const n=group.length,slope=S.slope||.55,body=Math.max(...group.map(bodyLength));
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),bearing=o=>Math.atan2((o.y-q[1])/slope,o.x-q[0]);
  const ids=group.map(o=>o.id).sort().join(),f=p.follow;
  // A slot holds until the cursor really moves: no re-picking (and no jumping between two nearest
  // free spots around a prop) while the cursor rests.
  if(f.slot&&f.slotIds===ids&&Math.hypot(q[0]-f.slotAt[0],q[1]-f.slotAt[1])<body*.35)return f.slot;
  if(fan.t!==clock){
   let mx=0,my=0;for(const o of group){mx+=Math.cos(bearing(o));my+=Math.sin(bearing(o));}
   if(fan.a==null||fan.ids!==ids)fan.a=Math.atan2(my,mx);
   else if(Math.hypot(mx,my)>.3*n)fan.a+=wrap(Math.atan2(my,mx)-fan.a)*Math.min(1,(clock-fan.t)*1.5);
   fan.t=clock;
  }
  if(fan.ids!==ids){fan.ids=ids;fan.order=group.slice().sort((a,b)=>wrap(bearing(a)-fan.a)-wrap(bearing(b)-fan.a)).map(o=>o.id);}
  const R=body*(.8+.2*(n-1)),gap=2*Math.asin(Math.min(1,body*1.1/(2*R))),span=Math.min(2*Math.PI*(n-1)/n,gap*(n-1));
  const a=fan.a+(fan.order.indexOf(p.id)/(n-1)-.5)*span;
  f.slot=project(p,q[0]+Math.cos(a)*R,q[1]+Math.sin(a)*R*slope);f.slotAt=q.slice();f.slotIds=ids;
  return f.slot;
 }
 function finishHunt(p){
  if(!p.picked||!p.follow)return;
  p.follow.phase='wiggle';halt(p,'wiggle',.6+(p.id%3)*.25);p.follow.wiggleFor=p.dur;
  const q=p.follow.prey,dir=p.asset.atlas?LW.cats.direction(q[0]-p.x,q[1]-p.y,S.slope||.55,p._catDir):LW.petJumpDirection({dir:p.dir},q[0]-p.x,q[1]-p.y);p.follow.view=dir.view;turnTo(p,dir.view,dir.face);
 }
 function beginHunt(p,q){
  const f=p.follow,range=bodyLength(p)*.72,slope=S.slope||.55;
  // Choose a takeoff on a drawn ray (eight for cats, six for legacy directional pets).
  const dirs=[[1,0],[-1,0],...(p.asset.atlas?[[0,1],[0,-1]]:[]),...[1,-1].flatMap(x=>[1,-1].map(y=>[x/Math.hypot(1,slope),y*slope/Math.hypot(1,slope)]))];
  const candidates=dirs.map(([x,y])=>[q[0]-x*range,q[1]-y*range]).filter(a=>allowed(p,...a)&&clearRest(p,...a)&&free(p,...a)&&validPath(p,[a,q]));
  candidates.sort((a,b)=>Math.hypot(a[0]-p.x,a[1]-p.y)-Math.hypot(b[0]-p.x,b[1]-p.y));
  for(const a of candidates){
   const route=plan(p,...a);if(!route)continue;
   f.phase='stalk';f.prey=q.slice();
   // Close in at a run or trot; only the last body length is the low creep.
   const d=Math.hypot(a[0]-p.x,a[1]-p.y),b=bodyLength(p);
   walk(p,...a,{gait:p.kind!=='cat'?'walk':d>b*.9?'run':d>b*.5?'walk':'stalk',next:()=>finishHunt(p)});return true;
  }return false;
 }
 // A followed cat on a ledge hops straight down: the clear landing nearest the cursor, within a leap.
 // If every spot below is taken (another cat sitting there) it just waits on the ledge, standing.
 function hopDown(p,q){
  const l=ledge(p.surf);if(!l)return false;const body=bodyLength(p),c=[];
  for(let dy=body*.4;dy<=body*2.4;dy+=body*.25)for(let dx=-1.6;dx<=1.6;dx+=.4){
   const pt=floorPoint(p.x+dx*body,l.y+dy);if(pt&&allowed(p,...pt,'floor')&&clearRest(p,...pt)&&free(p,...pt,'floor')&&Math.hypot(pt[0]-p.x,pt[1]-l.y)<body*2.6)c.push(pt);
  }
  c.sort((a,b)=>Math.hypot(a[0]-q[0],a[1]-q[1])-Math.hypot(b[0]-q[0],b[1]-q[1]));
  for(const pt of c)if(jump(p,...pt,'floor',r=>{r.chase=false;halt(r,'followWait',1e9);}))return true;
  return false;
 }
 function followStep(p,dt){
  const f=p.follow;if(!p.picked||!f)return;
  f.sitOK=!cursor.inside||cursor.still>.9;   // sit down only once the cursor has really stopped
  f.cooldown=Math.max(0,f.cooldown-dt);f.repath-=dt;
  if(p.j||p.turn)return;
  if(!cursor.inside){if(p.state!=='followWait')halt(p);f.phase='wait';return;}
  if(f.phase==='picked'){
   if(p.state==='picked'&&(p.t<1.05||p.asset.atlas&&(p._catTransition||(p._catActionTime||0)<.8)))return;
   f.phase='follow';halt(p);f.repath=0;
  }
  const q=project(p,cursor.x,cursor.y);if(!q){halt(p);return;}f.target=q;
  if(f.phase==='recover'&&p.t<.8)return;
  if(f.phase==='stalk'||f.phase==='wiggle'){
   if(cursor.speed>45||Math.hypot(q[0]-f.prey[0],q[1]-f.prey[1])>8){f.phase='follow';halt(p);f.repath=0;}
   else if(f.phase==='wiggle'&&p.t>=f.wiggleFor){
    if(free(p,...f.prey,'floor')&&validPath(p,[[p.x,p.y],f.prey])&&jump(p,...f.prey,'floor',r=>{
     r.lastPounce={target:f.prey.slice(),land:[r.x,r.y]};if(!r.picked)return halt(r,'sit',2);
     r.follow.phase='recover';r.follow.cooldown=3;halt(r,'followLook',.8);
    },'pounce')){f.phase='pounce';f.cooldown=3;}
    else{f.phase='follow';f.cooldown=1;halt(p);}
   }
   if(f.phase==='stalk'||f.phase==='wiggle'||p.j)return;
  }
  if(p.surf!=='floor'){
   if(p.asset.atlas){if(f.repath<=0){f.repath=.4;if(!hopDown(p,q)&&p.state!=='followWait')halt(p);}return;}
   if(p.state!=='move'&&f.repath<=0){const dest=project(p,...q,true);if(dest)trip(p,{x:dest[0],y:dest[1],surf:'floor'},'followWait');f.repath=1;}
   return;
  }
  const distance=Math.hypot(q[0]-p.x,q[1]-p.y),body=bodyLength(p);
  const busy=items.some(o=>o!==p&&o.picked&&['stalk','wiggle','pounce'].includes(o.follow?.phase));
  const group=items.filter(o=>o.picked&&!o.away&&o.asset.atlas);
  if(p.asset.seq.pounce&&!busy&&f.cooldown===0&&cursor.still>.7&&cursor.speed<20&&distance<body*2.5&&free(p,...q,'floor')&&!p.asset.atlas){
   if(beginHunt(p,q))return;
  }
  if(!p.asset.atlas){
  if(f.repath>0)return;f.repath=.2;
   const dest=fanTarget(p,q);if(!dest){halt(p);return;}
   f.slot=dest;
   if(Math.hypot(dest[0]-p.x,dest[1]-p.y)<12*p.k){if(p.state==='move')halt(p);return;}
   const gait=distance>body*1.2||cursor.speed>80*p.k?'run':'walk';
   // Keep a committed leg until the destination moves enough to require another route.
   if(p.state==='move'&&p.goal&&Math.hypot(dest[0]-p.goal.x,dest[1]-p.goal.y)<18){p.gait=gait;return;}
   f.phase='follow';walk(p,...dest,{gait,next:r=>halt(r)});
  return;}
  // Direct chase, like the classic desktop cats: head straight for the cursor every frame at a steady
  // pace, facing the way it goes. No route planner, no turn animations, no slots — nothing to stall on.
  // Alone: stop just short of the cursor. In a group: each cat walks to its own slot in the fan.
  let tx,ty,gap,stopR,startR;
  if(group.length>1){const slot=catSlot(p,q,group)||q;[tx,ty]=slot;gap=Math.hypot(tx-p.x,ty-p.y);stopR=body*.15;startR=body*.5;}
  else{stopR=body*.45;startR=body*.7;gap=distance;}
  if(gap<(p.state==='move'?stopR:startR)){if(p.state==='move'){p.path=null;p.goal=null;p.chase=false;state(p,'followWait',1e9);}return;}
  if(group.length<2){tx=q[0]-(q[0]-p.x)/distance*stopR*.8;ty=q[1]-(q[1]-p.y)/distance*stopR*.8;if(!allowed(p,tx,ty,'floor')||!clearRest(p,tx,ty)){tx=q[0];ty=q[1];}}
  if(f.noRoute>0){f.noRoute-=dt;return;}
  const ux=(tx-p.x)/Math.hypot(tx-p.x,ty-p.y),uy=(ty-p.y)/Math.hypot(tx-p.x,ty-p.y),run=Math.hypot(tx-p.x,ty-p.y);
  // Gait with hysteresis: start running past 1.3 bodies, keep running down to 0.9 — no walk/run flicker.
  const gait=(p.gait==='run'&&p.state==='move'?run>body*.6:run>body*1.1)||cursor.speed>120*p.k&&run>body*.6?'run':'walk';
  f.leap=(f.leap||0)-dt;
  if(gait==='run'&&run>body*2&&f.leap<=0&&Math.random()<dt*1.2){
   const reach=Math.min(run-body*.6,body*1.3),lx=p.x+ux*reach,ly=p.y+uy*reach;
   if(allowed(p,lx,ly)&&jump(p,lx,ly,'floor',r=>{r.chase=false;halt(r,'followWait',1e9);})){f.leap=1.2;return;}
  }
  f.phase='follow';p.gait=gait;p.chase=true;p.goal={x:tx,y:ty,surf:'floor'};p.next=r=>{r.chase=false;halt(r,'followWait',1e9);};
  if(p.state!=='move'){state(p,'move',1e9);p.waited=0;p.blocked=0;f.detour=null;}
  // Clear line of sight: straight at the cursor. Something in the way (bench, plant, wall): route
  // around it with the planner, keeping that route until the cursor moves on or it is used up.
  f.nav=(f.nav||0)-dt;
  // Line of sight is re-checked ten times a second (or when the target jumps), not every frame.
  f.los=f.los||{t:0,ok:false,x:0,y:0};f.los.t-=dt;
  if(f.los.t<=0||Math.hypot(tx-f.los.x,ty-f.los.y)>body*.25){f.los={t:.1,ok:validPath(p,[[p.x,p.y],[tx,ty]],false,false),x:tx,y:ty};}
  if(f.los.ok){p.path={pts:[[p.x,p.y],[tx,ty]],i:1};f.detour=null;}
  else if(!f.detour||!p.path||p.path.i>=p.path.pts.length||(f.nav<=0&&Math.hypot(f.detour[0]-tx,f.detour[1]-ty)>body*.6)){
   f.nav=.4;const route=cornerRoute(p,tx,ty)||routeAround(p,tx,ty)||plan(p,tx,ty,false,true);
   if(route){p.path=route;f.detour=[tx,ty];}
   else{const near=project(p,tx,ty);if(near&&validPath(p,[[p.x,p.y],near],false,false)){p.path={pts:[[p.x,p.y],near],i:1};f.detour=near;}}
  }
  // No way there at all right now: stand calmly and look again shortly, never freeze mid-stride.
  if(!p.path||p.path.i>=p.path.pts.length){p.path=null;p.goal=null;p.chase=false;f.detour=null;f.noRoute=.5;state(p,'followWait',1e9);}
 }
 function pose(p,dt){
  const s=p.asset;if(!prep(s))return;
  const moving=p.state==='move',st=p.state;
  if(s.atlas){LW.cats.pose(p,dt);p.k=p.j?lerp(p.j.k0,p.j.k1,st==='jumpPrep'?0:st==='land'?1:clamp(p.t/p.j.dur)):size(p);p.light=S.light?S.light(p.x,p.y):[1-(S.night||0)*.45,1-(S.night||0)*.42,1-(S.night||0)*.32];p.head=p.headW=[p.x+p.dir*25*p.k,p.y-p.z-p.spec.height*p.k*.75];return;}
  const gf=moving||st==='stand'?LW.petGait(p,s.cyc,p.gd,p.spec.height,p.gait,{dt,vx:p.groundVX,vy:p.groundVY}):null;
  if(moving&&p._petDirection)p.dir=p._petDirection.face;
  let name=gf||'walk1';
  if(st==='jumpPrep'||st==='jump'||st==='land')name=p.j.key+'-'+(st==='jumpPrep'?1:st==='land'?5:p.t/p.j.dur<.36?2:p.t/p.j.dur<.64?3:4);
  else if(st==='picked')name=s.seq.perk?'perk-'+Math.min(5,1+Math.floor(p.t/.09)):p.spec.sit;
  else if(st==='wiggle')name='hunt'+(p.follow.view==='side'?'':'-'+p.follow.view)+'-'+(1+Math.floor(p.t/.12)%5);
  else if(st==='followWait'||st==='followLook')name=p.spec.sit;
  else if(['sit','groom','watch'].includes(st))name=p.spec.sit;
  else if(['sleep','shelter'].includes(st))name=p.spec.sleep;
  else if(st==='loaf')name=s.img.loaf?'loaf':p.spec.sleep;
  if(p.turn){const f=p.turn.steps[Math.min(p.turn.steps.length-1,Math.floor(p.turn.t/.065))];name=f.name;p.dir=f.dir;}
  const fam=family(name)===p.spec.sit?'sit':family(name)===p.spec.sleep?'sleep':family(name);
  if(fam!==p.spFam){
   const path=LW.petPath(p.spFam,fam,q=>s.seq[q]);p.sequence=path?{names:path,t:0}:null;
   p.prev=path?null:p.spP;p.poseT=0;p.spFam=fam;
  }
  if(p.sequence){p.sequence.t+=dt;const i=Math.floor(p.sequence.t/.075);if(i<p.sequence.names.length)name=p.sequence.names[i];else p.sequence=null;}
  if(p.turn||['picked','wiggle'].includes(st)){p.sequence=null;p.prev=null;}
  p.poseT+=dt;
  // Jumps cut into their registered crouch; never show an old larger side pose at takeoff.
  if(fam==='jump')p.prev=null;
  p.spP=s.img[name]?name:'walk1';
  p.k=size(p);if(p.j)p.k=lerp(p.j.k0,p.j.k1,st==='jumpPrep'?0:st==='land'?1:clamp(p.t/p.j.dur));
  p.light=S.light?S.light(p.x,p.y):[1-(S.night||0)*.45,1-(S.night||0)*.42,1-(S.night||0)*.32];
  p.head=p.headW=[p.x+p.dir*25*p.k,p.y-p.z-p.spec.height*p.k*.75];
 }
 function stepOne(p,dt){
  if(p.away)return;
  if(p.turn){
   p.groundVX=p.groundVY=0;p.turn.t+=dt;
   if(p.turn.t>=p.turn.steps.length*.065){const turn=p.turn;p.turn=null;p.dir=turn.face;p._petDirection={view:turn.view,face:turn.face};if(p.asset.atlas){p._catDir={view:turn.view,face:turn.face,octant:turn.octant};if(p._catMotion)p._catMotion.phase=0;}LW.petJumpLand(p);if(turn.next)turn.next();}
   pose(p,dt);return;
  }
  p.t+=dt;p.awake+=dt;p.happyT=Math.max(0,p.happyT-dt);p.groundVX=p.groundVY=0;
  followStep(p,dt);
  if(p.state==='jumpPrep'){
   if(p.t>=p.dur){if(free(p,p.j.x1,p.j.y1,p.j.s1)&&flightClear(p,p.j)){state(p,'jump',p.j.dur)}else{p.j=null;p.goal=null;state(p,'sit',1)}}
  }else if(p.state==='jump'){
   const j=p.j,u=clamp(p.t/j.dur);p.x=lerp(j.x0,j.x1,u);p.y=lerp(j.y0,j.y1,u);p.z=Math.sin(Math.PI*u)*j.h;
   if(u>=1){p.surf=j.s1;p.z=0;LW.petJumpLand(p);state(p,'land',.18)}
  }else if(p.state==='land'){
   if(p.t>=p.dur){const next=p.j.next;p.j=null;p.goal=null;if(p.mission==='leave')leave(p);else if(next)next(p);else think(p)}
  }else if(p.state==='move'){
   if(!p.asset.cyc.has('walk')){pose(p,dt);return;}
   if(p.sequence||(p.prev&&p.poseT<.24)){pose(p,dt);return;}
   if(!p.path){p.waited+=dt;if(yieldExit(p)){pose(p,dt);return;}if((p.waited>5||!p.picked&&!['leave','enter','qa'].includes(p.mission))&&!['leave','enter','qa'].includes(p.mission)){p.goal=null;state(p,'sit',p.picked?2:rand(6,20));pose(p,dt);return;}p.blocked+=dt;if(p.blocked>.8){p.path=plan(p,p.goal.x,p.goal.y,p.exitPath);p.blocked=0}pose(p,dt);return;}
   const path=p.path,to=path.pts[path.i];
   if(!to){const next=p.next;p.path=null;p.goal=null;state(p,'stand',.4);if(next)next(p);else think(p);pose(p,dt);return;}
   const dx=to[0]-p.x,dy=to[1]-p.y,dist=Math.hypot(dx,dy);
   if(p.asset.atlas&&dist>.01){const dir=LW.cats.direction(dx,dy,S.slope||.55,p._catDir);if(p.chase){p._catDir=dir;p.dir=dir.face;}else if(LW.cats.startTurn(p,dir)){pose(p,dt);return;}}
   if(!p.asset.atlas&&p.picked&&dist>.01){const view=Math.abs(dy)<.01?'side':dy>0?'f':'b',face=Math.sign(dx)||p.dir;
    if(turnTo(p,view,face)){pose(p,dt);return;}}
   const speed=(p.gait==='stalk'?32:p.gait==='run'?175:['leave','enter'].includes(p.mission)?70:48)*p.k*(LW.calm?.6:1);
   const floorDistance=p.asset.atlas?Math.hypot(dx,dy/(S.slope||.55)):dist;
   const d=Math.min(dist,speed*dt*(floorDistance?dist/floorDistance:1));let x=p.x+(dist?dx/dist*d:0),y=p.y+(dist?dy/dist*d:0);
   const chaseOk=(x,y)=>allowed(p,x,y)&&(clearRest(p,x,y)||!clearRest(p,p.x,p.y));
   // A chasing cat that meets an edge or corner slides along it instead of freezing in place.
   if(p.chase&&!chaseOk(x,y)){if(chaseOk(x,p.y))y=p.y;else if(chaseOk(p.x,y))x=p.x;}
   // An idle cat already overlapping another may always step away; it never stands frozen in place.
   if(p.chase?chaseOk(x,y):freeIdle(p,x,y)||!freeIdle(p,p.x,p.y)){
    p.groundVX=(x-p.x)/dt;p.groundVY=(y-p.y)/dt;p.gd+=(p.asset.atlas?Math.hypot(x-p.x,(y-p.y)/(S.slope||.55)):d)/Math.max(.1,p.k);p.x=x;p.y=y;p.blocked=0;
    if(dist<=d+.01){path.i++;LW.petJumpLand(p);}
   }else{p.waited+=dt;if(yieldExit(p)){pose(p,dt);return;}if(p.waited>(p.picked?5:1.5)&&!['enter','leave','qa'].includes(p.mission)){p.goal=null;p.path=null;state(p,'sit',rand(6,20));pose(p,dt);return;}p.blocked+=dt;if(p.blocked>(!p.picked&&!['leave','enter','qa'].includes(p.mission)?.3:.6)){p.path=plan(p,p.goal.x,p.goal.y,p.exitPath);p.blocked=0}}   // idle: no way round, it sits (above) instead of standing frozen
  }else{
   if(p.state==='eat'){p.hunger=Math.max(0,p.hunger-dt*.04);if(S.supplies)S.supplies.food=Math.max(0,S.supplies.food-dt*.005);}else p.hunger=Math.min(1,p.hunger+dt/2400);
   if(p.state==='drink'){p.thirst=Math.max(0,p.thirst-dt*.06);if(S.supplies)S.supplies.water=Math.max(0,S.supplies.water-dt*.003);}else p.thirst=Math.min(1,p.thirst+dt/1500);
   if(p.state==='sleep')p.awake=Math.max(0,p.awake-dt*4);
   if(p.t>=p.dur)think(p);
  }
  pose(p,dt);
 }
 function reset(){
  S=stage();items.forEach((p,i)=>{
   const h=(S.homes||[])[i]||{x:S.bounds[0]+(i+1)*150,y:S.bounds[3]-15};
   p.surf=h.surf||'floor';p.x=h.x;p.y=h.y??ledge(p.surf)?.y;p.z=0;p.k=size(p);p.dir=h.dir||1;p.j=null;p.goal=null;p.path=null;p.sequence=null;
   p.picked=false;p.follow=null;p.chase=false;p.next=null;p.turn=null;p.mission=null;p.away=p.gone=!wanted(p);p.state=p.away?'away':h.state||'sit';p.t=0;p.dur=rand(4,16);p.prev=null;p.spFam=null;p._catDir=null;p._catRest=null;p._catTransition=null;p._catMotion=null;
  });
  items.forEach(p=>{if(p.surf==='floor'&&!p.away&&!free(p,p.x,p.y)){const q=nearest(p,p.x,p.y);if(q)[p.x,p.y]=q;}});
 }
 function step(dt,t){
  S=stage();T=t;clock+=dt;samplePointer(dt);
  for(const p of items){
   if(!wanted(p)&&!p.away&&p.mission!=='leave'){if(p.picked)release(p);leave(p);}
   if(wanted(p)&&!p.away&&p.mission==='leave'&&!p.j){p.mission=null;think(p);}
   if(wanted(p)&&p.away&&clock>(p.returnAt||0)){
    const h=S.homes[p.id],e=S.exits?.[0];if(!e)continue;
    const y=directions(p)?e.y:h.y,desired=S.bounds[0]+(p.id+1)/(items.length+1)*(S.bounds[2]-S.bounds[0])*.65;
    const xs=[];for(let x=S.bounds[0]+25;x<S.bounds[2]-25;x+=25)if(allowed(p,x,y,'floor')&&free(p,x,y,'floor'))xs.push(x);
    xs.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired));
    if(xs.length&&free(p,e.x,y,'floor')){
     p.away=p.gone=false;p.mission='enter';p.surf='floor';p.x=e.x;p.y=y;p.z=0;p.j=null;
     walk(p,xs[0],y,{exit:true,next:q=>{q.mission=null;think(q)}});
    }else p.returnAt=clock+.6;
   }
  }
  // Fixed small movement steps prevent tunnelling when virtual time advances or frames stall.
  if(!api.initialized&&items.every(p=>p.asset.ready)){api.initialized=true;reset();}
  const n=Math.max(1,Math.ceil(dt/(1/30)));for(let i=0;i<n;i++)for(const p of items)stepOne(p,dt/n);
 }
 function frame(p){
  const s=p.asset;if(p.away||!s.ready)return null;
  const f=LW.poseFrame(p.prev,p.spP,p.poseT/.24),key=s.img[f.pose]?f.pose:p.spP,im=s.img[key];if(!im)return null;
  const sc=p.k*s.unit*LW.petPoseScale(p.kind,key,s.img.walk1,im),anchor=(im.petFa0??(key==='walk1'||key==='walk2'?.555:.5))*im.width;
  const foot=im.height-1-(im.petFootPad||0),shift=cycle(key)&&p._gait?.shift||[0,0],sh=shift.map(v=>v*p.k);
  const breathing=!s.atlas&&['sleep','loaf','shelter','sit'].includes(p.state)?1+.012*Math.sin(T*1.7+p.id*1.3):1;
  const sx=f.sx,sy=f.sy*breathing;
  let contact=sprContact(im);
  if(p.state==='jump'){
   const a=sprContact(s.img[p.j.key+'-1']),b=sprContact(s.img[p.j.key+(s.atlas?'-8':'-5')]),u=clamp(p.t/p.j.dur);
   contact={x:lerp(a.x,b.x,u),y:foot,span:lerp(a.span,b.span,u)};
  }
  const width=Math.max(12*p.k,contact.span*sc*.6)*(1-clamp(p.z/400,0,.35));
  return {image:tint(p,im,key,p.light),key,x:p.x+sh[0],y:p.y-p.z+sh[1],dir:p.dir,sx,sy,
   ox:-anchor*sc,oy:-foot*sc,w:im.width*sc,h:im.height*sc,depth:depth(p),
   shadow:{x:p.x+sh[0]+p.dir*(contact.x-anchor)*sc*sx,y:p.y+sh[1]+(contact.y-foot)*sc*sy,width,height:width*.2+3*p.k,alpha:(p.picked?.27:.32)*(1-clamp(p.z/220,0,.7))}};
 }
 let shadow;
 function drawOne(g,p){
  const f=frame(p);if(!f)return;
  if(!shadow){shadow=document.createElement('canvas');shadow.width=shadow.height=64;const c=shadow.getContext('2d'),a=c.createRadialGradient(32,32,0,32,32,32);a.addColorStop(0,'rgba(24,19,24,.9)');a.addColorStop(.5,'rgba(24,19,24,.5)');a.addColorStop(1,'rgba(24,19,24,0)');c.fillStyle=a;c.fillRect(0,0,64,64)}
  g.save();const b=f.shadow;g.globalAlpha=b.alpha;g.drawImage(shadow,b.x-b.width,b.y-b.height,b.width*2,b.height*2);g.globalAlpha=1;
  g.translate(f.x,f.y);g.scale(f.dir*f.sx,f.sy);g.drawImage(f.image,f.ox,f.oy,f.w,f.h);g.restore();
 }
 function draw(g,extra=[]){
  const rect=g.canvas?.getBoundingClientRect?.();if(rect?.width&&rect.height)screenMap={m:g.getTransform().inverse(),rect,sx:g.canvas.width/rect.width,sy:g.canvas.height/rect.height};
  if(screenOccluders.size)g.save();if(screenOccluders.size){g.beginPath();g.rect(-100000,-100000,200000,200000);for(const r of panelBoxes())g.rect(r[0],r[1],r[2]-r[0],r[3]-r[1]);g.clip("evenodd");}
  const entries=[...items.filter(p=>!p.away).map(p=>({depth:depth(p),draw:()=>drawOne(g,p)})),...(S.occluders||[]),...extra];
  entries.sort((a,b)=>a.depth-b.depth);for(const e of entries)e.draw(g);if(screenOccluders.size)g.restore();
 }
 // Clicks land on the cat whose painted pixels are under the pointer (front-most first). The collision
 // boxes are loose and overlap between neighbours, so testing them alone picks the wrong cat.
 function hitPixels(p,x,y){
  const f=frame(p);if(!f)return 0;
  const lx=(x-f.x)/(f.dir*f.sx)-f.ox,ly=(y-f.y)/f.sy-f.oy;
  if(lx<-6||ly<-6||lx>f.w+6||ly>f.h+6)return 0;
  const im=p.asset.img[f.key];
  try{
   const g=im&&im.getContext&&im.getContext('2d',{willReadFrequently:true});if(!g)return 1;
   const px=Math.round(lx/f.w*im.width),py=Math.round(ly/f.h*im.height),r=Math.max(2,Math.round(6/f.w*im.width));
   if(g.getImageData(px,py,1,1).data[3]>40)return 3;   // exactly on this cat
   const d=g.getImageData(Math.max(0,px-r),Math.max(0,py-r),2*r+1,2*r+1).data;
   for(let i=3;i<d.length;i+=4)if(d[i]>40)return 2;return 0;   // a few pixels off its outline
  }catch(e){return 1;}
 }
 function click(x,y){
  const live=items.filter(p=>!p.away),front=(a,b)=>depth(b)-depth(a),hits=live.map(p=>[p,hitPixels(p,x,y)]);
  let p=null;for(const k of [3,2,1]){p=hits.filter(h=>h[1]===k).map(h=>h[0]).sort(front)[0];if(p)break;}
  // Near miss (between the legs, just off an ear): the cat whose body centre is closest, within its box.
  if(!p){const b=live.filter(p=>{const r=box(p);return x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3];});
   p=b.sort((a,c)=>Math.hypot(a.x-x,a.y-a.z-a.spec.height*a.k*.45-y)-Math.hypot(c.x-x,c.y-c.z-c.spec.height*c.k*.45-y))[0];}
  if(p){pickPet(p);return p;}return null;
 }
 function toy(x,y){if(items.some(p=>p.picked))return;const p=items.filter(p=>!p.away&&!p.j&&p.surf==='floor').sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(!p)return;const q=nearest(p,x,y);if(q)walk(p,...q,{gait:'run',next:r=>state(r,'sniff',3)});}
 function forceWalk(id,x,y,opt={}){if(!LW.virtual)throw Error('QA requires virtual=1');const p=items[id];if(opt.from){[p.x,p.y]=opt.from;p.surf=opt.surf||'floor';p.z=0;p.j=null;p.gd=0;p._gait=null;p._petDirection=null;p.sequence=null;p.prev=null;p.spFam='walk1';p.spP='walk1'}p.away=p.gone=false;p.mission='qa';walk(p,x,y,{gait:opt.gait||'walk',next:q=>state(q,'stand',1e9)});return p;}
 function forceJump(id,x,y,opt={}){if(!LW.virtual)throw Error('QA requires virtual=1');const p=items[id];if(opt.from)[p.x,p.y]=opt.from;p.surf=opt.surf0||'floor';p.away=p.gone=false;p.mission='qa';p.k=size(p);jump(p,x,y,opt.surf1||'floor',q=>opt.walk?walk(q,...opt.walk,{next:r=>state(r,'stand',1e9)}):state(q,'stand',1e9));return p;}
 const api={panelBoxes,items,reset,step,draw,drawOne,frame,click,toy,walk,trip,jump,state,forceWalk,forceJump,box,free,project,
  get stage(){return S},get ready(){return items.every(p=>p.asset.ready)},get roster(){return ROSTER},
  overlaps:()=>items.flatMap((p,i)=>items.slice(i+1).filter(q=>!p.away&&!q.away&&overlap(box(p),box(q),0)).map(q=>[p.rosterId,q.rosterId]))};
 LW.on('focus',on=>{if(!on)clearPicks();});
 LW.on('pause',()=>clearPicks());
 LW.on('leave',()=>{cursor.inside=false;for(const p of items)if(p.picked&&!p.j){halt(p);p.follow.phase='wait';}});
 LW.on('action',a=>{if(a==='toy'&&S)toy((S.bounds[0]+S.bounds[2])/2,(S.bounds[1]+S.bounds[3])/2);if(a==='feed'||a==='water')items.forEach(p=>{if(a==='feed')p.hunger=.9;else p.thirst=.9;if(!p.away&&!p.j)think(p)})});
 LW.on('calm',on=>{if(on&&S)items.forEach(p=>{if(!p.away&&!p.j){p.goal=null;think(p)}})});
 LW.on('env',()=>{if(S){S=stage();if(S.wet)items.forEach(p=>{if(!p.away&&!p.j)think(p)})}});
 LW.on('reminder',r=>{if(!enabled())return;if(r.kind==='water')items.forEach(p=>p.thirst=.9);if(r.kind==='stretch')items.forEach(p=>{if(!p.away&&!p.j)state(p,'groom',3)})});
 return api;
}
// Re-use an already lit scene plate inside a prop silhouette, retaining the caller's
// world transform for its mask (works with mirrored / letterboxed scene canvases).
// Increment sourceCanvas.petRevision after repainting it; masks are baked once per revision.
const plateMasks=new WeakMap();
function plate(g,cv,poly){
 const m=g.getTransform(),pts=poly.map(([x,y])=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]);
 const x=Math.max(0,Math.floor(Math.min(...pts.map(p=>p[0])))),y=Math.max(0,Math.floor(Math.min(...pts.map(p=>p[1]))));
 const w=Math.min(cv.width,Math.ceil(Math.max(...pts.map(p=>p[0]))))-x,h=Math.min(cv.height,Math.ceil(Math.max(...pts.map(p=>p[1]))))-y;
 if(w<=0||h<=0)return;
 let cache=plateMasks.get(cv);const version=cv.petRevision||0;
 if(!cache||cache.version!==version||cache.width!==cv.width||cache.height!==cv.height){cache={version,width:cv.width,height:cv.height,images:new Map()};plateMasks.set(cv,cache);}
 const key=pts.flat().join(',');let im=cache.images.get(key);
 if(!im){im=document.createElement('canvas');im.width=w;im.height=h;const q=im.getContext('2d');
  q.beginPath();pts.forEach(([a,b],i)=>i?q.lineTo(a-x,b-y):q.moveTo(a-x,b-y));q.closePath();q.clip();
  q.drawImage(cv,x,y,w,h,0,0,w,h);cache.images.set(key,im);
 }
 g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(im,x,y);g.restore();
}
LW.pets={ROSTER,create,plate,setScreenOccluder(id,rect){if(rect)screenOccluders.set(id,rect);else screenOccluders.delete(id);},geometry:{inside,headings,scaleAt,overlap}};
})();
