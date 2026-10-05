// Chase around props: the cursor visits points on all sides of the bench and the terrace edges.
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const p=P.items.find(q=>q.rosterId===(window.__qaCoat||'orange'));
 for(const q of P.items)if(q!==p){q.away=q.gone=true;q.mission='qa-hidden';}
 const S=P.stage;p.surf='floor';p.z=0;const at=P.project(p,(S.bounds[0]+S.bounds[2])*.3,(S.bounds[1]+S.bounds[3])*.7)||[400,900];p.x=at[0];p.y=at[1];p.away=p.gone=false;P.state(p,'sit',1e9);
 function screen(v){const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect();return [(m.a*v[0]+m.c*v[1]+m.e)/cv.width*r.width+r.left,(m.b*v[0]+m.d*v[1]+m.f)/cv.height*r.height+r.top];}
 const input=(k,v)=>{const q=screen(v);window.__lw(k,q[0],q[1]);};
 const b=S.bounds,W=b[2]-b[0],H=b[3]-b[1];
 const pts=[[.75,.15],[.95,.5],[.75,.95],[.4,.98],[.1,.6],[.55,.05],[.85,.3],[.2,.9]].map(([u,v])=>[b[0]+u*W,b[1]+v*H]);
 let time=0,stuck=0,maxStuck=0,lastX=p.x,lastY=p.y,picked=false;
 const orig=P.step;P.step=(dt,t)=>{time+=dt;
  if(!picked&&time>.3){input('move',[p.x,p.y-30]);input('down',[p.x,p.y-30]);input('up',[p.x,p.y-30]);picked=true;}
  const k=Math.min(pts.length-1,Math.floor(time/3)),c=pts[k];if(time>.8)input('move',[c[0]+Math.sin(time*2)*8,c[1]]);
  orig(dt,t);
  const moved=Math.hypot(p.x-lastX,p.y-lastY);lastX=p.x;lastY=p.y;
  if(p.state==='move'&&moved<.05){stuck+=dt;maxStuck=Math.max(maxStuck,stuck);}else stuck=0;
 };
 function rect(){const cv=document.querySelector('canvas'),r=cv.getBoundingClientRect();return [0,0,r.width,r.height];}
 window.__shotReport=()=>({time:+time.toFixed(2),rect:rect(),state:p.state,pose:p.spP,x:Math.round(p.x),y:Math.round(p.y),maxStuck:+maxStuck.toFixed(2),target:pts[Math.min(pts.length-1,Math.floor(time/3))].map(Math.round),errors:__errs});
};
