// A cut between each labelled direction; continuous engine motion within each shot.
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const p=P.items.find(q=>q.rosterId===(window.__qaCoat||'orange'));
 for(const q of P.items)if(q!==p){q.away=q.gone=true;q.mission='qa-hidden';}
 const c=[590,855],slope=P.stage.slope||.55;let time=0,label='Ready',camera=c.slice(),last=-1;
 const dirs=[[1,0,'right'],[1,1,'toward-right'],[0,1,'toward'],[-1,1,'toward-left'],[-1,0,'left'],[-1,-1,'away-left'],[0,-1,'away'],[1,-1,'away-right']];
 function reset(x=c[0],y=c[1]){
  Object.assign(p,{x,y,surf:'floor',z:0,j:null,turn:null,sequence:null,prev:null,picked:false,follow:null,path:null,goal:null,next:null,away:false,gone:false,mission:'qa',_catRest:'stand',_catTransition:null,_catMotion:null});
  p._catDir=null;P.state(p,'stand',1e9);camera=[x,y];
 }
 function walk(d,gait){reset();const [x,y,name]=d,dir=LW.cats?.direction(x,y*slope,slope);p._catDir=dir;label=gait.toUpperCase()+' / '+name;
  const length=gait==='run'?210:95,n=Math.hypot(x,y);P.walk(p,c[0]+x/n*length,c[1]+y/n*length*slope,{gait,next:q=>P.state(q,'stand',1e9)});
 }
 const events=[];let t=0;
 for(const d of dirs){events.push([t,()=>walk(d,'walk')]);t+=1.25;}
 for(const d of dirs){events.push([t,()=>walk(d,'run')]);t+=.95;}
 for(const d of [dirs[0],dirs[1],dirs[2],dirs[6],dirs[7]]){events.push([t,()=>{reset();label='JUMP / '+d[2];P.jump(p,c[0]+d[0]*70,c[1]+d[1]*38,'floor',q=>P.state(q,'stand',1e9));}]);t+=1.2;}
 events.push([t,()=>{reset();label='STAND to FRONT SIT';P.state(p,'sit',1e9);}]);t+=1.4;
 events.push([t,()=>{label='SIT to LOAF';P.state(p,'loaf',1e9);}]);t+=1.4;
 events.push([t,()=>{label='LOAF to CURLED SLEEP';P.state(p,'sleep',1e9);}]);t+=1.6;
 events.push([t,()=>{label='WAKE / STRETCH';P.state(p,'groom',1e9);}]);t+=1.6;
 events.push([t,()=>{reset(487.35,729);label='JUMP onto PARAPET';P.trip(p,{x:447.35,surf:'0'},'sit');camera=[460,700];}]);t+=1.8;
 events.push([t,()=>{label='JUMP off PARAPET';P.trip(p,{x:487.35,y:729,surf:'floor'},'sit');}]);t+=1.8;
 events.push([t,()=>{reset();label='CLICK / PERK / FOLLOW / STALK / POUNCE';
  // Use the real scene input coordinates; its adapter handles side=left mirroring.
  __lw('move',760/1600*1280,855/1000*800);P.click(p.x,p.y-30*p.k);
 }]);
 if(window.__qaNight){events.splice(0,events.length,[0,()=>walk(dirs[1],'walk')],[1,()=>walk(dirs[7],'run')],[2,()=>{reset();label='NIGHT / directional jump';P.jump(p,660,893,'floor',q=>P.state(q,'sit',1e9));}],[3.2,()=>{label='NIGHT / front sit';P.state(p,'sit',1e9);}]);}
 events.shift()[1]();
 const orig=P.step;P.step=(dt,now)=>{time+=dt;while(events.length&&time>=events[0][0]-1e-6)events.shift()[1]();orig(dt,now);camera=[p.x,p.y];};
 // Render the setup before frame zero; resetting model state alone leaves the old canvas visible.
 LW.advance(1/30,30);time=0;
 function rect(){
  const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect();
  const [x,y]=camera;const q=[[x-240,y-245],[x+240,y+55]].map(([a,b])=>[(m.a*a+m.c*b+m.e)/cv.width*r.width,(m.b*a+m.d*b+m.f)/cv.height*r.height]);
  return [Math.min(q[0][0],q[1][0]),Math.min(q[0][1],q[1][1]),Math.max(q[0][0],q[1][0]),Math.max(q[0][1],q[1][1])];
 }
 window.__shotReport=()=>({time:+time.toFixed(4),label,camera,rect:rect(),state:p.state,pose:p.spP,xy:[+p.x.toFixed(2),+p.y.toFixed(2)],k:+p.k.toFixed(4),dir:p.dir,view:p._catDir?.view,phase:p._catMotion?.phase,follow:p.follow?.phase,pounce:p.lastPounce||null,jump:p.j&&{from:p.j.s0,to:p.j.s1},overlaps:P.overlaps(),errors:__errs});
};
