/* Painted cats: compact whole-cycle atlases, explicit registration, eight floor headings.
 * Metadata is a script (cat-atlas.js), never fetch(): WKWebView file:// safe.
 * All deformation is authored into the art. Runtime only places, mirrors and lights frames.
 */
(() => {
'use strict';
const cache=new Map(),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const views=['side','near','toward','near','side','far','away','far'];
function direction(vx,vy,slope=.55,last={view:'side',face:1,octant:0}){
 if(Math.hypot(vx,vy)<1e-7)return {...last};
 const octant=(Math.round(Math.atan2(vy/slope,vx)/(Math.PI/4))+8)%8;
 return {view:views[octant],face:octant>2&&octant<6?-1:1,octant};
}
function load(spec){
 if(cache.has(spec.set))return cache.get(spec.set);
 const data=LW.CAT_ATLAS?.[spec.id];if(!data)return null;
 const s={spec,atlas:true,img:{},seq:{pounce:true},ready:false,clips:data.clips,unit:data.unit,cyc:{has:()=>false}};
 cache.set(spec.set,s);let left=Object.keys(data.clips).length,bad=false;
 for(const [key,clip] of Object.entries(data.clips)){
  const im=new Image();im.onload=()=>{
   clip.frames.forEach(([x,y,w,h,ax,ay],i)=>{
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);
    cv.petK=1;cv.petFa0=ax/w;cv.petFootPad=h-1-ay;cv.petContact={x:ax,y:ay,span:clip.span||w*.5};cv.petName=key+'-'+(i+1);
    s.img[cv.petName]=cv;
   });
   if(--left===0&&!bad){s.ready=true;s.img.walk1=s.img['walk-side-1'];s.cyc.has=q=>q==='walk'||q==='walk-f'||q==='walk-b';}
  };im.onerror=()=>{bad=true;console.error('Cat atlas failed: '+clip.src)};im.src=clip.src;
 }
 return s;
}
function startTurn(p,dir,next){
 const old=p._catDir||{view:'toward',face:1,octant:2};
 if(old.octant===dir.octant){if(next)next();return false;}
 let delta=(dir.octant-old.octant+8)%8;if(delta>4)delta-=8;
 const steps=[];
 const phase=p._catMotion?.phase||0,index=Math.floor(phase*8);
 if(p.state==='move'&&index%4!==0){const end=index<4?4:8;for(let i=index+1;i<=end;i++)steps.push({name:'walk-'+old.view+'-'+(i%8+1),dir:old.face});}
 for(let i=1;i<=Math.abs(delta);i++){
  const octant=(old.octant+Math.sign(delta)*i+8)%8;
  steps.push({name:'walk-'+views[octant]+'-1',dir:octant>2&&octant<6?-1:1});
 }
 p.turn={steps,t:0,view:dir.view,face:dir.face,octant:dir.octant,next};p._catDir=dir;p.sequence=null;p.prev=null;return true;
}
function pose(p,dt){
 const s=p.asset;if(!s.ready)return;
 if(p.turn){const f=p.turn.steps[Math.min(p.turn.steps.length-1,Math.floor(p.turn.t/.065))];p.spP=f.name;p.dir=f.dir;p.prev=null;p.poseT=1;return;}
 const st=p.state;let dir=p._catDir||(p._catDir={view:'toward',face:1,octant:2});
 let key='walk-'+dir.view,idx=0;
 const motion=p._catMotion||(p._catMotion={distance:p.gd,phase:0,gait:'walk'});
 if(st==='move'||st==='stand'){
  const requested=st==='stand'?'walk':p.gait==='run'?'run':'walk';
  const contact=Math.floor(motion.phase*8)%4===0;if(requested!==motion.gait&&contact)motion.gait=requested;
  const gait=st==='stand'?'walk':motion.gait;key=gait+'-'+dir.view;
  const dd=Math.max(0,p.gd-motion.distance);motion.distance=p.gd;
  if(dd>0&&dd<40)motion.phase=(motion.phase+dd/(s.clips[key].stride||60))%1;
  if(st==='stand')motion.phase=0;
  idx=Math.floor(motion.phase*8)%8;motion.gait=gait;
 }else if(p.j){
  dir=p.j.catDir||dir;key='jump-'+dir.view;
  idx=st==='jumpPrep'?Math.min(2,Math.floor(p.t/p.dur*3)):st==='land'?Math.min(7,5+Math.floor(p.t/p.dur*3)):3+Math.min(1,Math.floor(p.t/p.j.dur*2));
 }else if(st==='wiggle'){
  key='jump-'+dir.view;idx=Math.floor(p.t/.12)%2?6:1;
 }else{
  const fam=['sleep','shelter'].includes(st)?'sleep':st==='loaf'?'loaf':st==='groom'?'stretch':st==='picked'?'perk':'sit';
  if(p._catRest!==fam){
   const from=p._catRest||'stand';
   if(from==='stand'&&dir.octant!==2)startTurn(p,{view:'toward',face:1,octant:2});
   const sequence=from==='sleep'&&fam!=='sleep'?{key:'rest',indices:[7,6,5,4,3,2,1,0]}:
    fam==='sleep'?{key:from==='stand'?'sit':'rest',indices:from==='loaf'?[4,5,6,7]:[0,1,2,3,4,5,6,7],restAfter:from==='stand'}:
    fam==='loaf'?{key:from==='stand'?'sit':'rest',indices:from==='stand'?[0,1,2,3,4,5,6,7]:[0,1,2,3,4],restAfter:from==='stand',loaf:true}:
    from==='stand'?{key:'sit',indices:[0,1,2,3,4,5,6,7]}:null;
   p._catTransition=sequence?{...sequence,t:0}:null;p._catRest=fam;p._catActionTime=0;
  }
  key=fam==='sleep'||fam==='loaf'?'rest':fam==='perk'?'perk':fam==='stretch'?'stretch':'sit';
  if(!s.clips[key])key='sit';
  if(!p._catTransition)p._catActionTime=(p._catActionTime||0)+dt;
  idx=fam==='sleep'?7:fam==='loaf'?4:['perk','stretch'].includes(fam)?Math.min(7,Math.floor((p._catActionTime||0)/.1)):7;
  p.dir=1;
 }
 if((st==='move'||st==='stand')&&p._catRest&&p._catRest!=='stand'){
  const asleep=p._catRest==='sleep'||p._catRest==='loaf';
  p._catTransition={key:asleep?'rest':'sit',indices:p._catRest==='loaf'?[4,3,2,1,0]:[7,6,5,4,3,2,1,0],t:0,standAfter:asleep};p._catRest='stand';
 }
 if(p._catTransition){
  const tr=p._catTransition;tr.t+=dt;const i=Math.floor(tr.t/.085);
  if(i<tr.indices.length){key=tr.key;idx=tr.indices[i];p.dir=1;p.sequence={cat:true};}
  else if(tr.restAfter){p._catTransition={key:'rest',indices:tr.loaf?[0,1,2,3,4]:[0,1,2,3,4,5,6,7],t:0};}
  else if(tr.standAfter){p._catTransition={key:'sit',indices:[7,6,5,4,3,2,1,0],t:0};}
  else{p._catTransition=null;p.sequence=null;}
 }
 if(p.turn){const f=p.turn.steps[Math.min(p.turn.steps.length-1,Math.floor(p.turn.t/.065))];p.spP=f.name;p.dir=f.dir;}
 else{p.spP=key+'-'+(idx+1);if(['move','stand','jumpPrep','jump','land','wiggle'].includes(st)&&!p._catTransition)p.dir=dir.face;}
 p.prev=null;p.poseT=1;
}
LW.cats={load,direction,startTurn,pose,views};
})();
