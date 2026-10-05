// Eight 2-second diagonal floor passes (two per heading), then all four runs.
// Each labelled cut starts a fresh pass. Camera follows translation, never pose.
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const p=P.items.find(q=>q.rosterId===(window.__qaCoat||'orange'));
 for(const q of P.items)if(q!==p){q.away=q.gone=true;q.mission='qa-hidden';}
 const slope=P.stage.slope||.55,c=[590,845],dirs=[[1,1,'toward-right'],[-1,-1,'away-left'],[-1,1,'toward-left'],[1,-1,'away-right']];
 let time=0,label='',pass=-1,camera=c.slice();
 function start(i){
  pass=i;const run=i>=8,d=dirs[i%4],n=Math.SQRT2,length=run?160:92;
  const from=[c[0]-d[0]*length/n/2,c[1]-d[1]*length/n/2*slope];
  Object.assign(p,{x:from[0],y:from[1],surf:'floor',z:0,j:null,turn:null,sequence:null,prev:null,picked:false,follow:null,path:null,goal:null,next:null,away:false,gone:false,mission:'qa',_catRest:'stand',_catTransition:null,_catMotion:null});
  p._catDir=LW.cats.direction(d[0],d[1]*slope,slope);P.state(p,'stand',1e9);
  label=(run?'RUN':'WALK')+' / '+d[2]+' / pass '+(run?1:Math.floor(i/4)+1)+' (cut)';
  P.walk(p,c[0]+d[0]*length/n/2,c[1]+d[1]*length/n/2*slope,{gait:run?'run':'walk',next:q=>P.state(q,'stand',1e9)});
 }
 start(0);const orig=P.step;
 P.step=(dt,now)=>{time+=dt;const i=Math.min(11,time<16?Math.floor((time+1e-6)/2):8+Math.floor((time-16+1e-6)));if(i!==pass)start(i);orig(dt,now);camera=[p.x,p.y];};
 LW.advance(1/30,30);time=0;
 function rect(){
  const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect(),[x,y]=camera;
  const q=[[x-160,y-165],[x+160,y+35]].map(([a,b])=>[(m.a*a+m.c*b+m.e)/cv.width*r.width,(m.b*a+m.d*b+m.f)/cv.height*r.height]);
  return [Math.min(q[0][0],q[1][0]),Math.min(q[0][1],q[1][1]),Math.max(q[0][0],q[1][0]),Math.max(q[0][1],q[1][1])];
 }
 window.__shotReport=()=>({time:+time.toFixed(4),label,pass,camera,rect:rect(),state:p.state,pose:p.spP,xy:[+p.x.toFixed(4),+p.y.toFixed(4)],k:p.k,dir:p.dir,view:p._catDir?.view,phase:p._catMotion?.phase,gait:p._catMotion?.gait,turn:!!p.turn,gd:p.gd,slope,errors:__errs});
};
