/* Train Journey station calls. Static architecture is world scenery; every living actor is an atlas. */
(function (root) {
'use strict';
const ease = u => u*u*u*(10+u*(-15+6*u));
const integral = u => u*u*u*u*(2.5+u*(-3+u));
class Calls {
  constructor(random=Math.random) { this.random=random; this.reset(); }
  reset() { this.phase='cruise';this.age=0;this.wait=180+this.random()*180;this.stop=0;this.calls=0;this.dwell=0; }
  request(dwell) { if(this.phase!=='cruise')return false;this.wait=0;this.dwell=Number.isFinite(dwell)?Math.max(20,Math.min(40,dwell)):20+this.random()*20;return true; }
  get active() { return this.phase==='approach'||this.phase==='dwell'||this.phase==='depart'; }
  tick(dt,train,target,ready,safe) {
    if(this.phase==='cruise') {
      this.wait-=dt;
      if(this.wait<=0){this.phase='queued';this.age=0;this.dwell=this.dwell||20+this.random()*20;}
      return false;
    }
    if(this.phase==='queued') {
      if(!ready||train.skip||!safe(train.d,train.v*10))return false;
      this.phase='approach';this.age=0;this.start=train.d;this.v0=train.v;this.duration=20;
      this.stop=this.start+this.v0*this.duration*.5;this.calls++;
    }
    // Consume phase boundaries exactly (including slow/virtual frames).
    let left=dt;
    while(left>1e-10) {
      const duration=this.phase==='dwell'?this.dwell:this.duration;
      const used=Math.min(left,duration-this.age);this.age+=used;left-=used;
      const u=Math.min(1,this.age/duration);
      if(this.phase==='approach') {train.v=this.v0*(1-ease(u));train.d=this.start+this.v0*duration*(u-integral(u));}
      if(this.phase==='dwell') {train.v=0;train.d=this.stop;}
      if(this.phase==='depart') {train.v=this.v0*ease(u);train.d=this.stop+this.v0*duration*integral(u);}
      if(this.age<duration-1e-9)break;
      if(this.phase==='approach'){this.phase='dwell';this.age=0;}
      else if(this.phase==='dwell'){this.phase='depart';this.age=0;this.v0=target;this.duration=24;}
      else {this.phase='cruise';this.age=0;this.wait=180+this.random()*180;this.dwell=0;train.d+=train.v*left;break;}
    }
    return true;
  }
}
// All distances in the same route coordinates as tunnels and bridges. No teleport at normal stops.
function clearRoute(d,brake,margin,segments,length) {
  const a=d-margin,b=d+brake+margin;
  for(let loop=Math.floor(a/length);loop<=Math.floor(b/length);loop++)
    for(const s of segments)if((s.t==='tunnel'||s.t==='water')&&s.a+loop*length<b&&s.b+loop*length>a)return false;
  return true;
}
const specs={
 indian:{focus:.43,feet:.823,walkFeet:.846,front:.869,roof:[[.015,.985,.24]],lamps:[[.15,.48],[.43,.48],[.57,.48],[.85,.48]],snow:[[.02,.25,.98,.25]],vendor:.69,wait:.32},
 shinkansen:{focus:.53,feet:.748,walkFeet:.770,front:.789,roof:[[.02,.98,.19]],lamps:[[.255,.277],[.62,.277]],snow:[[.01,.176,.99,.176]],vendor:.65,wait:.32,barrier:.59},
 swiss:{focus:.50,feet:.813,walkFeet:.824,front:.830,roof:[[.085,.925,.44]],lamps:[[.365,.535],[.655,.535]],snow:[[.08,.435,.31,.435],[.31,.35,.505,.14],[.505,.14,.705,.35],[.705,.435,.925,.435]],vendor:.72,wait:.42},
 orient:{focus:.55,feet:.838,walkFeet:.866,front:.885,roof:[[.03,.975,.26]],lamps:[[.133,.428],[.52,.428],[.867,.428]],snow:[[.03,.18,.97,.18]],vendor:.73,wait:.42}
};
// The full back-fixture footprint conservatively covers walls, benches, planters and columns.
// Walk paths stay entirely in the front apron polygon; rooted actors occupy a separate rear lane.
for (const spec of Object.values(specs)) spec.geometry={
  fixtures:[{name:'back wall, benches, columns and planters',rect:[.025,.14,.975,spec.feet-.008]}],
  walkable:[[.02,spec.feet+.008],[.98,spec.feet+.008],[.98,spec.front],[.02,spec.front]]
};
specs.swiss.geometry.fixtures.push(...[[.10,.12],[.356,.372],[.649,.663],[.882,.895]].map(([x0,x1])=>({name:'chalet post',rect:[x0,.43,x1,.822]})));
function create(api) {
 const calls=new Calls(), art={skin:null,images:null,lit:null,key:'',loading:false,generation:0,bytes:0,loads:0,releases:0,error:null};
 let clock=0;
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const detach=images=>{for(const im of images){im.onload=im.onerror=null;im.removeAttribute('src');}};
 function release(){art.generation++;if(art.images||art.loading)art.releases++;if(art.images)detach(Object.values(art.images));if(art.lit)for(const c of Object.values(art.lit))c.width=c.height=1;art.images=art.lit=null;art.loading=false;art.key='';art.bytes=0;art.skin=null;}
 function load(){
  if(art.images||art.loading)return;
  const token=++art.generation,skin=api.skin();art.skin=skin;art.loading=true;art.error=null;art.loads++;
  Promise.all([skin,'life'].map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Station art missing: '+name));im.src='art/train/stations/'+name+'.webp';}))).then(images=>{
   if(token!==art.generation){detach(images);return;}art.images={plate:images[0],life:images[1]};art.loading=false;art.bytes=images.reduce((sum,im)=>sum+im.width*im.height*4,0);
  }).catch(e=>{if(token!==art.generation)return;release();art.error=e.message;calls.reset();console.warn(e.message);});
 }
 function box(){const v=api.view(),h=v.wh*.94,w=h*3,s=specs[api.skin()];return {x:v.cx-s.focus*w+(calls.stop-api.train.d)*.95,y:v.y1-h*.97,w,h,s};}
 function margin(){const v=api.view();return Math.max(v.ww*.5,v.wh*2)+120;}
 function safe(d,brake){return clearRoute(d,brake,margin(),api.segments,api.routeLength());}
 function update(dt,target){
  clock+=dt;
  if(calls.phase==='queued'||(calls.phase==='cruise'&&calls.wait<8))load();
  const handled=calls.tick(dt,api.train,target,!!art.images,safe);
  if(calls.phase==='depart'&&art.images){const b=box();if(b.x+b.w<api.view().x0-30)release();}
  if(calls.phase==='cruise'&&art.images&&calls.wait>8)release();
  return handled;
 }
 function grade(){
  if(!art.images)return;
  const E=api.env(),s=specs[api.skin()],lampColor=api.skin()==='shinkansen'?'207,225,242':'255,202,124',day=Math.round(E.day*16)/16,warm=Math.round(E.warm*8)/8,wet=Math.round(E.rain*5)/5,snow=Math.round(api.snow()*8)/8;
  const key=[day,warm,wet,snow].join(':');if(art.key===key)return;
  art.key=key;
  if(!art.lit)art.lit={plate:canvas(1440,480),life:canvas(768,640)};
  for(const name of ['plate','life']){
   const c=art.lit[name],g=c.getContext('2d'),im=art.images[name];g.clearRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);
   const tint=[.40+.55*day,.45+.49*day,.55+.38*day];tint[0]+=warm*.04;tint[2]-=warm*.10;
   g.globalCompositeOperation='multiply';g.fillStyle=`rgb(${tint.map(v=>Math.round(v*255)).join(',')})`;g.fillRect(0,0,c.width,c.height);
   g.globalCompositeOperation='destination-in';g.drawImage(im,0,0,c.width,c.height);g.globalCompositeOperation='source-atop';
   if(name==='plate'){
    for(const [x,y] of s.lamps){const X=x*c.width,Y=y*c.height,r=c.height*.29,gr=g.createRadialGradient(X,Y,0,X,Y,r);gr.addColorStop(0,`rgba(${lampColor},${.45*(1-day)})`);gr.addColorStop(1,`rgba(${lampColor},0)`);g.fillStyle=gr;g.fillRect(X-r,Y-r,2*r,2*r);}
    // Snow lies only on exposed roof ridges and the narrow outer apron, never on sheltered benches.
    if(snow){g.strokeStyle=`rgba(211,221,237,${snow*(.55+.35*day)})`;g.lineWidth=3+snow*4;g.lineCap='round';for(const [x,y,X,Y]of s.snow){g.beginPath();g.moveTo(x*c.width,y*c.height);g.lineTo(X*c.width,Y*c.height);g.stroke();}g.fillStyle=`rgba(211,221,237,${snow*.5})`;g.fillRect(0,c.height*.887,c.width,4);}
    if(wet){g.fillStyle=`rgba(97,122,139,${wet*.2})`;g.fillRect(0,c.height*.875,c.width,c.height*.04);}
   }else{g.fillStyle=`rgba(238,182,117,${(1-day)*.13})`;g.fillRect(0,0,c.width,c.height);}
   g.globalCompositeOperation='source-over';
  }
  art.bytes=(1440*480+768*640)*8;
 }
 function covered(x,y){if(!calls.active||!art.images)return false;const b=box();return b.s.roof.some(([a,z,t])=>x>b.x+a*b.w&&x<b.x+z*b.w&&y>b.y+t*b.h);}
 function groundAt(x){if(!calls.active||!art.images)return false;const b=box();return x>b.x&&x<b.x+b.w;}
 function coverFraction(){if(!calls.active||!art.images)return 0;const b=box(),v=api.view();return Math.max(0,Math.min(v.x1,b.x+b.w)-Math.max(v.x0,b.x))/v.ww;}
 function draw(g){
  if(!calls.active||!art.images)return;
  const b=box(),v=api.view();if(b.x>v.x1||b.x+b.w<v.x0)return;
  grade();const E=api.env();g.save();g.beginPath();g.rect(v.x0,v.y0,v.ww,v.wh);g.clip();
  g.drawImage(art.lit.plate,b.x,b.y,b.w,b.h);
  // Geometry: fixtures/posts end at feet-.02. Actors occupy separate open apron lanes in front.
  const actor=(row,x,base,height,frame)=>{
   const px=b.x+x*b.w,py=b.y+base*b.h,h=b.h*height,w=h*.8;
   g.fillStyle=`rgba(14,19,24,${.17+.13*E.day})`;g.beginPath();g.ellipse(px,py-1,w*.24,h*.025,0,0,Math.PI*2);g.fill();
   g.drawImage(art.lit.life,(frame%6)*128,row*160,128,160,px-w/2,py-h*154/160,w,h);
  };
  const s=b.s;
  if(api.skin()==='indian')actor(0,s.wait,s.feet,.29,Math.floor(clock*.7)%6);
  actor(2,s.vendor,s.feet,.29,[0,0,1,2,3,4,5,5,4,1][Math.floor(clock*1.2)%10]);
  // A single traversal through dwell/departure; no looping teleport or collision with the rooted vendor.
  const elapsed=calls.phase==='approach'?0:calls.phase==='dwell'?calls.age:calls.dwell+calls.age;
  const walkX=-.10+elapsed*(.11/3);
  if(walkX>.02&&walkX<.98)actor(1,walkX,s.walkFeet,.29,Math.floor(elapsed*3.8)%6);
  if(E.day>.25&&E.snow<.2)actor(3,.59,s.feet+.003,.070,[0,0,1,2,3,4,5,0][Math.floor(clock*1.6)%8]);
  if(s.barrier){ // The photographic barrier is in front: restore its exact pixels over legs.
   const im=art.lit.plate,sy=Math.round(s.barrier*im.height);
   g.drawImage(im,0,sy,im.width,im.height-sy,b.x,b.y+b.h*sy/im.height,b.w,b.h*(1-sy/im.height));
  }
  for(const [x,y]of s.lamps){const X=b.x+x*b.w,Y=b.y+y*b.h,r=b.h*.10,a=(1-E.day)*.48,lc=api.skin()==='shinkansen'?'210,230,247':'255,217,157';if(a<.01)continue;
   const gr=g.createRadialGradient(X,Y,0,X,Y,r);gr.addColorStop(0,`rgba(${lc},${a})`);gr.addColorStop(.12,`rgba(${lc},${a*.65})`);gr.addColorStop(1,'rgba(255,196,120,0)');g.fillStyle=gr;g.fillRect(X-r,Y-r,r*2,r*2);
   g.fillStyle=`rgba(255,225,170,${a})`;g.fillRect(X-1,Y-2,2,4);
  }
  if(E.fog>.01){g.globalAlpha=E.fog*.18;g.fillStyle='#bdc6cc';g.fillRect(b.x,b.y,b.w,b.h);g.globalAlpha=1;}
  g.restore();
 }
 return {calls,art,update,draw,covered,groundAt,coverFraction,safe,box,force(dwell){const ok=calls.request(dwell);if(ok)load();return ok;},reset(){release();calls.reset();},report(){return{phase:calls.phase,age:+calls.age.toFixed(3),wait:+calls.wait.toFixed(2),speed:+api.train.v.toFixed(4),distance:+api.train.d.toFixed(4),stop:calls.stop,bytes:art.bytes,loaded:!!art.images,loading:art.loading,loads:art.loads,releases:art.releases,error:art.error};}};
}
const exports={Calls,ease,integral,clearRoute,create,specs};
if(typeof module!=='undefined'&&module.exports)module.exports=exports;else root.TrainStations=exports;
})(typeof window!=='undefined'?window:globalThis);
