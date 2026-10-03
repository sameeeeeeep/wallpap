/* Shared illustrated pets, built on pet-motion.js. Load after lw.js + pet-motion.js.
 *
 * const pets = LW.pets.create({scene:'cafe', roster:['grey','golden'], stage:()=>STAGE});
 * pets.step(dt, seconds); pets.draw(ctx); pets.click(x,y); pets.toy(x,y);
 * pets.reset() after a layout change. pets.items is stable (never sort it in place).
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
 * lateral or the art's 3/4 heading; animals lacking a complete directional cycle stay
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
 poses:['walk1','walk2','sit','sleep',...(['orange','black'].includes(id)?['loaf','stretch']:[])],sleep:'sleep',sit:'sit'})]),
 ...['golden','corgi'].map(id=>[id,Object.freeze({id,set:'dogs/'+id,kind:'dog',height:96,
 poses:['walk1','walk2','sit',...(id==='golden'?['lie','belly-up']:['sleep','play-bow'])],sleep:id==='golden'?'lie':'sleep',sit:'sit'})])
]));
const PANDAS=Object.fromEntries(['mei','bao','cub'].map(id=>[id,{id,set:'pandas/'+id,kind:'panda',height:id==='cub'?90:120,
 poses:['walk1','walk2',...(id==='mei'?['sit-eat','back-sleep']:id==='bao'?['sit-leaf','roll']:['back-sleep','tumble'])],
 sit:id==='mei'?'sit-eat':id==='bao'?'sit-leaf':'tumble',sleep:id==='bao'?'roll':'back-sleep'}]));
const cycle=p=>/^(walk|run)-(?:[fb]-)?\d/.test(p);
const family=p=>cycle(p)||p==='walk2'?'walk1':p.startsWith('jump-')?'jump':p;
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
 const s={spec,img:{},seq:{},seqRaw:{},ready:false};
 for(const p of spec.poses){const im=new Image();im.onload=()=>{if(im.naturalWidth)s.img[p]=defringe(im)};im.src='art/sprites/'+spec.set+'/'+p+'.png'}
 s.cyc=LW.petCycleLoad('art/sprites/',spec.set);
 for(const q of [...(LW.PET_SEQ_HAS[spec.set]||[]),...Object.keys(LW.PET_JUMP_LAYOUT[spec.set]||{})]){
  const ims=[];let n=0;
  for(let i=1;i<=5;i++){const im=new Image();im.onload=()=>{if(im.naturalWidth&&++n===5)s.seqRaw[q]=ims};im.src='art/sprites/'+spec.set+'/t/'+q+'-'+i+'.png';ims.push(im)}
 }
 return s;
}
function prep(s){
 const w=s.img.walk1;if(!w)return false;
 if(!s.unit){s.unit=s.spec.height/w.height;s.ref=LW.petCycleMeasure(w);}
 if(!s.cyclesPrepared){LW.petCyclePrep(s.cyc,{im:w,k:1,fa:.555},defringe);Object.assign(s.img,s.cyc.img);s.cyclesPrepared=s.cyc.ready;}
 const ends={walk1:'walk1',sit:s.spec.sit,sleep:s.spec.sleep};
 for(const q in s.seqRaw){
  const ims=s.seqRaw[q],end=q==='stand-sit'?['walk1','sit']:q==='sit-sleep'?['sit','sleep']:['walk1','walk1'];
  if(!end.every(e=>s.img[ends[e]]))continue;
  const E=end.map(e=>{const p=ends[e],im=s.img[p];return {im,k:LW.petPoseScale(s.spec.kind,p,w,im),fa:e==='walk1'?.555:.5}});
  const geom=(LW.PET_JUMP_LAYOUT[s.spec.set]||{})[q];
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
function headings(a,b,slope=.55,directional=true){
 const dx=b[0]-a[0],dy=b[1]-a[1];
 if(!directional||Math.abs(dy)<1e-5)return [[a,[b[0],a[1]]]];
 const run=Math.abs(dy)/slope,sx=Math.sign(dx)||1;
 if(run<=Math.abs(dx))return [[a,[a[0]+sx*run,b[1]],b],[a,[b[0]-sx*run,a[1]],b]];
 return [1,-1].map(s=>{const k=(run+s*dx)/2;return [a,[a[0]+s*k,a[1]+Math.sign(dy)*k*slope],b]});
}
const length=pts=>pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]),0);
function overlap(a,b,gap=8){return a[0]<b[2]+gap&&a[2]+gap>b[0]&&a[1]<b[3]+gap&&a[3]+gap>b[1]}
function create({scene,roster,stage}){
 let S=null,T=0,was=enabled(),clock=0,screenMap=null;
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
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/12));
   for(let j=1;j<=n;j++){const x=lerp(a[0],b[0],j/n),y=lerp(a[1],b[1],j/n);if(!allowed(p,x,y,p.surf,exit)||(avoidPets&&!free(p,x,y,p.surf,false)))return false;}
  }return true;
 }
 function plan(p,x,y,exit=false,ignorePets=false){
  const valid=pts=>validPath(p,pts,exit,!ignorePets);
  if(p.surf!=='floor'||!directions(p))y=p.y;
  const a=[p.x,p.y],b=[x,y],slope=S.slope||.55;
  let candidates=headings(a,b,slope,directions(p));
  let best=candidates.filter(q=>valid(q)).sort((a,b)=>length(a)-length(b))[0];
  if(!best&&p.surf==='floor'&&directions(p)){
   // Route around pets/props using visibility candidates; every edge still uses drawn headings.
   const bounds=S.bounds||[0,0,1600,1000],ys=[bounds[1]+10,bounds[3]-10];
   for(const r of panelBoxes()){ys.push(r[1]-20,r[3]+p.spec.height*size(p)*1.4+20);}
   for(const o of items)if(o!==p&&!o.away){const b=box(o),h=p.spec.height*size(p);ys.push(b[1]-18,b[3]+h*1.3+18)}
   for(const yy of ys)for(const xx of [a[0],b[0],(a[0]+b[0])/2]){
    const m=[xx,clamp(yy,bounds[1],bounds[3])];
    for(const q of headings(a,m,slope,true))if(valid(q))for(const r of headings(m,b,slope,true)){
     const v=[...q,...r.slice(1)];if(valid(v)&&(!best||length(v)<length(best)))best=v;
    }
   }
  }
  return best?{pts:best.filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>.01),i:1}:ignorePets?null:plan(p,x,y,exit,true);
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
 function walk(p,x,y,{gait='walk',next=null,exit=false}={}){
  if(p.away||p.j)return false;
  if(!directions(p)||p.surf!=='floor')y=p.y;
  p.goal={x,y,surf:p.surf};p.path=plan(p,x,y,exit);p.exitPath=exit;p.next=next;p.gait=gait;p.waited=0;
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
 function jump(p,x,y,surf,next){
  if(surf==='floor'){const q=floorPoint(x,y);if(!q)return false;[x,y]=q;}else{const l=ledge(surf);if(!l)return false;x=clamp(x,l.x0,l.x1);y=l.y;}
  if(p.away||!free(p,x,y,surf))return false;
  const d0=depth(p),d1=surf==='floor'?y:ledge(surf).depth;
  const dir=LW.petJumpDirection(p,x-p.x,d1-d0),key=LW.petJumpKey(dir.view,q=>p.asset.seq[q]);
  if(!key)return false;
  // A missing depth jump cannot glide: take the lateral jump only when depth is unchanged.
  if(dir.view!=='side'&&key==='jump'&&Math.abs(d1-d0)>1)return false;
  p.j={x0:p.x,y0:p.y,x1:x,y1:y,s0:p.surf,s1:surf,d0,d1,k0:size(p),k1:size(p,y,surf),view:dir.view,key,
   dur:.36+Math.abs(y-p.y)*.0007+Math.abs(x-p.x)*.00055,h:34+Math.max(0,p.y-y)*.32,next};
  if(!flightClear(p,p.j)){p.j=null;return false;}
  p.dir=dir.face;p.goal={x,y,surf};p.sequence=null;p.prev=null;LW.petJumpLand(p);state(p,'jumpPrep',.34);pose(p,0);return true;
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
   walk(q,...start,{next:r=>{if(!jump(r,b.x,by,b.surf,leg)){r.goal=null;state(r,'sit',2)}}});
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
  if(p.mission==='enter')return;
  p.goal=null;if(!wanted(p))return leave(p);if(p.mission==='qa')return state(p,'stand',1e9);
  const spots=(S.spots||[]).filter(s=>(directions(p)||s.surf||Math.abs(s.y-p.y)<1)&&(!s.species||s.species===p.kind)&&clearRest(p,s.x,s.y??ledge(s.surf)?.y));
  if(S.wet){const safe=spots.filter(s=>s.kind==='shelter');for(const sp of safe)if(trip(p,sp,'shelter'))return;}
  if(LW.calm){const beds=spots.filter(s=>s.kind==='bed'||s.kind==='shelter');for(const sp of beds)if(trip(p,sp,'sleep'))return;return state(p,'sleep',rand(25,60));}
  for(const kind of ['food','water'])if((kind==='food'?p.hunger:p.thirst)>.6){
   const sp=spots.find(s=>s.kind===kind&&(!S.supplies||S.supplies[kind]>.01));if(sp&&trip(p,sp,kind==='food'?'eat':'drink'))return;
  }
  const sl=clamp(p.lazy*.2+p.awake/500+(S.night||0)*.2),r=Math.random();
  if(r<.45){const b=S.bounds,pt=nearest(p,rand(b[0]+20,b[2]-20),rand(b[1],b[3]));if(pt&&walk(p,...pt,{gait:r<.035?'run':'walk'}))return;}
  if(r<.72&&spots.length){const sp=pick(spots);if(trip(p,sp,sp.kind==='bed'||sp.kind==='sun'?'sleep':'loaf'))return;}
  if(r>.96){const o=items.find(o=>o!==p&&!o.away);if(o&&p.surf===o.surf){const x=o.x+(p.x<o.x?-1:1)*(p.spec.height*p.k+o.spec.height*o.k)*1.1;if(walk(p,x,o.y,{next:q=>state(q,'sniff',3)}))return;}}
  state(p,pick(['sit','sit','loaf','groom',...(sl>.35?['sleep','sleep']:['stand'])]),rand(5,sl>.35?30:12));
 }
 function pose(p,dt){
  const s=p.asset;if(!prep(s))return;
  const moving=p.state==='move',st=p.state;
  const gf=moving||st==='stand'?LW.petGait(p,s.cyc,p.gd,p.spec.height,p.gait,{dt,vx:p.groundVX,vy:p.groundVY}):null;
  if(moving&&p._petDirection)p.dir=p._petDirection.face;
  let name=gf||'walk1';
  if(st==='jumpPrep'||st==='jump'||st==='land')name=p.j.key+'-'+(st==='jumpPrep'?1:st==='land'?5:p.t/p.j.dur<.36?2:p.t/p.j.dur<.64?3:4);
  else if(['sit','groom','watch'].includes(st))name=p.spec.sit;
  else if(['sleep','shelter'].includes(st))name=p.spec.sleep;
  else if(st==='loaf')name=s.img.loaf?'loaf':p.spec.sleep;
  const fam=family(name)===p.spec.sit?'sit':family(name)===p.spec.sleep?'sleep':family(name);
  if(fam!==p.spFam){
   const path=LW.petPath(p.spFam,fam,q=>s.seq[q]);p.sequence=path?{names:path,t:0}:null;
   p.prev=path?null:p.spP;p.poseT=0;p.spFam=fam;
  }
  if(p.sequence){p.sequence.t+=dt;const i=Math.floor(p.sequence.t/.075);if(i<p.sequence.names.length)name=p.sequence.names[i];else p.sequence=null;}
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
  p.t+=dt;p.awake+=dt;p.happyT=Math.max(0,p.happyT-dt);p.groundVX=p.groundVY=0;
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
   if(!p.path){p.waited+=dt;if(yieldExit(p)){pose(p,dt);return;}if(p.waited>5&&!['leave','enter','qa'].includes(p.mission)){p.goal=null;state(p,'sit',2);pose(p,dt);return;}p.blocked+=dt;if(p.blocked>.8){p.path=plan(p,p.goal.x,p.goal.y,p.exitPath);p.blocked=0}pose(p,dt);return;}
   const path=p.path,to=path.pts[path.i];
   if(!to){const next=p.next;p.path=null;p.goal=null;state(p,'stand',.4);if(next)next(p);else think(p);pose(p,dt);return;}
   const dx=to[0]-p.x,dy=to[1]-p.y,dist=Math.hypot(dx,dy),speed=(p.gait==='run'?175:['leave','enter'].includes(p.mission)?70:48)*p.k*(LW.calm?.6:1);
   const d=Math.min(dist,speed*dt),x=p.x+(dist?dx/dist*d:0),y=p.y+(dist?dy/dist*d:0);
   if(free(p,x,y,p.surf,false)){
    p.groundVX=(x-p.x)/dt;p.groundVY=(y-p.y)/dt;p.gd+=d/Math.max(.1,p.k);p.x=x;p.y=y;p.blocked=0;
    if(dist<=d+.01){path.i++;LW.petJumpLand(p);}
   }else{p.waited+=dt;if(yieldExit(p)){pose(p,dt);return;}if(p.waited>5&&!['enter','leave','qa'].includes(p.mission)){p.goal=null;state(p,'sit',1);pose(p,dt);return;}p.blocked+=dt;if(p.blocked>.6){p.path=plan(p,p.goal.x,p.goal.y,p.exitPath);p.blocked=0}}
  }else{
   if(p.state==='eat'){p.hunger=Math.max(0,p.hunger-dt*.04);if(S.supplies)S.supplies.food=Math.max(0,S.supplies.food-dt*.005);}else p.hunger=Math.min(1,p.hunger+dt/18000);
   if(p.state==='drink'){p.thirst=Math.max(0,p.thirst-dt*.06);if(S.supplies)S.supplies.water=Math.max(0,S.supplies.water-dt*.003);}else p.thirst=Math.min(1,p.thirst+dt/10800);
   if(p.state==='sleep')p.awake=Math.max(0,p.awake-dt*4);
   if(p.t>=p.dur)think(p);
  }
  pose(p,dt);
 }
 function reset(){
  S=stage();items.forEach((p,i)=>{
   const h=(S.homes||[])[i]||{x:S.bounds[0]+(i+1)*150,y:S.bounds[3]-15};
   p.surf=h.surf||'floor';p.x=h.x;p.y=h.y??ledge(p.surf)?.y;p.z=0;p.k=size(p);p.dir=h.dir||1;p.j=null;p.goal=null;p.path=null;p.sequence=null;
   p.mission=null;p.away=p.gone=!wanted(p);p.state=p.away?'away':h.state||'sit';p.t=0;p.dur=rand(4,16);p.prev=null;p.spFam=null;
  });
  items.forEach(p=>{if(p.surf==='floor'&&!p.away&&!free(p,p.x,p.y)){const q=nearest(p,p.x,p.y);if(q)[p.x,p.y]=q;}});
 }
 function step(dt,t){
  S=stage();T=t;clock+=dt;
  for(const p of items){
   if(!wanted(p)&&!p.away&&p.mission!=='leave')leave(p);
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
  const breathing=['sleep','loaf','shelter','sit'].includes(p.state)?1+.012*Math.sin(T*1.7+p.id*1.3):1;
  const sx=f.sx,sy=f.sy*breathing;
  let contact=sprContact(im);
  if(p.state==='jump'){
   const a=sprContact(s.img[p.j.key+'-1']),b=sprContact(s.img[p.j.key+'-5']),u=clamp(p.t/p.j.dur);
   contact={x:lerp(a.x,b.x,u),y:foot,span:lerp(a.span,b.span,u)};
  }
  const width=Math.max(12*p.k,contact.span*sc*.6)*(1-clamp(p.z/400,0,.35));
  return {image:tint(p,im,key,p.light),key,x:p.x+sh[0],y:p.y-p.z+sh[1],dir:p.dir,sx,sy,
   ox:-anchor*sc,oy:-foot*sc,w:im.width*sc,h:im.height*sc,depth:depth(p),
   shadow:{x:p.x+sh[0]+p.dir*(contact.x-anchor)*sc*sx,y:p.y+sh[1]+(contact.y-foot)*sc*sy,width,height:width*.2+3*p.k,alpha:.32*(1-clamp(p.z/220,0,.7))}};
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
 function click(x,y){const p=items.filter(p=>!p.away&&inside([x,y],[[box(p)[0],box(p)[1]],[box(p)[2],box(p)[1]],[box(p)[2],box(p)[3]],[box(p)[0],box(p)[3]]])).sort((a,b)=>depth(b)-depth(a))[0];
  if(p){p.happyT=3;p.awake=0;if(!p.j){p.goal=null;state(p,'groom',3)}return p;}return null;
 }
 function toy(x,y){const p=items.filter(p=>!p.away&&!p.j&&p.surf==='floor').sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(!p)return;const q=nearest(p,x,y);if(q)walk(p,...q,{gait:'run',next:r=>state(r,'sniff',3)});}
 function forceWalk(id,x,y,opt={}){if(!LW.virtual)throw Error('QA requires virtual=1');const p=items[id];if(opt.from){[p.x,p.y]=opt.from;p.surf=opt.surf||'floor';p.z=0;p.j=null;p.gd=0;p._gait=null;p._petDirection=null;p.sequence=null;p.prev=null;p.spFam='walk1';p.spP='walk1'}p.away=p.gone=false;p.mission='qa';walk(p,x,y,{gait:opt.gait||'walk',next:q=>state(q,'stand',1e9)});return p;}
 function forceJump(id,x,y,opt={}){if(!LW.virtual)throw Error('QA requires virtual=1');const p=items[id];if(opt.from)[p.x,p.y]=opt.from;p.surf=opt.surf0||'floor';p.away=p.gone=false;p.mission='qa';p.k=size(p);jump(p,x,y,opt.surf1||'floor',q=>opt.walk?walk(q,...opt.walk,{next:r=>state(r,'stand',1e9)}):state(q,'stand',1e9));return p;}
 const api={panelBoxes,items,reset,step,draw,drawOne,frame,click,toy,walk,trip,jump,state,forceWalk,forceJump,box,free,
  get stage(){return S},get ready(){return items.every(p=>p.asset.ready)},get roster(){return ROSTER},
  overlaps:()=>items.flatMap((p,i)=>items.slice(i+1).filter(q=>!p.away&&!q.away&&overlap(box(p),box(q),0)).map(q=>[p.rosterId,q.rosterId]))};
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
