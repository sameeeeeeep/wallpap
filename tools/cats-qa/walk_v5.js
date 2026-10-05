// file:// Santorini: eight 1.8-second walking passes, then continuous transitions.
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const p=P.items.find(q=>q.rosterId===(window.__qaCoat||'orange'));
 for(const q of P.items)if(q!==p){q.away=q.gone=true;q.mission='qa-hidden';}
 const slope=P.stage.slope||.55,c=[590,845];
 const dirs=[[1,0,'right'],[1,1,'toward-right'],[0,1,'toward'],[-1,1,'toward-left'],[-1,0,'left'],[-1,-1,'away-left'],[0,-1,'away'],[1,-1,'away-right']];
 let time=0,label='',pass=-1,camera=c.slice(),transition=-1;
 function reset(d,length=130){
  const n=Math.hypot(d[0],d[1]);
  Object.assign(p,{x:c[0]-d[0]*length/n/2,y:c[1]-d[1]*length/n/2*slope,surf:'floor',z:0,j:null,turn:null,sequence:null,prev:null,picked:false,follow:null,path:null,goal:null,next:null,away:false,gone:false,mission:'qa',_catRest:'stand',_catTransition:null,_catMotion:null});
  p._catDir=LW.cats.direction(d[0],d[1]*slope,slope);P.state(p,'stand',1e9);
 }
 function start(i){pass=i;const d=dirs[i];reset(d);label='WALK / '+d[2]+' (cut)';const n=Math.hypot(d[0],d[1]);P.walk(p,c[0]+d[0]*65/n,c[1]+d[1]*65/n*slope,{gait:'walk',next:q=>P.state(q,'stand',1e9)});}
 function stages(i){
  transition=i;
  if(i===0){reset(dirs[0],160);p._catDir={view:'toward',face:1,octant:2};p._catRest='sit';P.state(p,'sit',1e9);label='REST (cut)';}
  if(i===1){label='REST to WALK';P.walk(p,850,845,{gait:'walk',next:q=>P.state(q,'sit',1e9)});}
  if(i===2){label='WALK to RUN';p.gait='run';}
  if(i===3){label='RUN to WALK';p.gait='walk';}
  if(i===4){label='WALK to SIT';P.state(p,'sit',1e9);}
 }
 start(0);const orig=P.step;
 P.step=(dt,now)=>{time+=dt;if(time<14.4){const i=Math.min(7,Math.floor((time+1e-6)/1.8));if(i!==pass)start(i);}else{const t=time-14.4,i=t<.7?0:t<2.1?1:t<3.1?2:t<4.1?3:4;if(i!==transition)stages(i);}orig(dt,now);camera=[p.x,p.y];};
 LW.advance(1/30,30);time=0;
 function rect(){
  if(window.__qaFull)return [0,0,1280,800];
  const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect(),[x,y]=camera;
  const q=[[x-170,y-175],[x+170,y+37.5]].map(([a,b])=>[(m.a*a+m.c*b+m.e)/cv.width*r.width,(m.b*a+m.d*b+m.f)/cv.height*r.height]);
  return [Math.min(q[0][0],q[1][0]),Math.min(q[0][1],q[1][1]),Math.max(q[0][0],q[1][0]),Math.max(q[0][1],q[1][1])];
 }
 window.__shotReport=()=>({time:+time.toFixed(4),label,pass,camera,rect:rect(),state:p.state,pose:p.spP,xy:[p.x,p.y],k:p.k,dir:p.dir,view:p._catDir?.view,phase:p._catMotion?.phase,gait:p._catMotion?.gait,turn:!!p.turn,gd:p.gd,slope,errors:__errs});
};
