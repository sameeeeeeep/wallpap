// Hybrid-cat FOLLOW QA through the real input path (__lw move/down), one cat on stage.
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const coat=window.__qaCoat||'orange',p=P.items.find(q=>q.rosterId===coat);
 for(const q of P.items)if(q!==p){q.away=q.gone=true;q.mission='qa-hidden';}
 const S=P.stage,c=[(S.bounds[0]+S.bounds[2])*.45,(S.bounds[1]+S.bounds[3])*.62];
 const at=P.project(p,...c)||c;p.surf='floor';p.z=0;p.x=at[0];p.y=at[1];p.away=p.gone=false;p.mission=null;P.state(p,'sit',1e9);
 function screen(v){const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect();return [(m.a*v[0]+m.c*v[1]+m.e)/cv.width*r.width+r.left,(m.b*v[0]+m.d*v[1]+m.f)/cv.height*r.height+r.top];}
 const input=(k,v)=>{const q=screen(v);window.__lw(k,q[0],q[1]);};
 let time=0,cur=[at[0]+40,at[1]-20],firstMove=null,picked=null;const gaps=[];
 const path=t=>{ // 0-1 tap; 1-6 slow circle near; 6-7 jump far right; 7-11 hold far; 11-14 rest (pounce); 14-17 sweep left fast; 17-20 rest; 20 tap release
  if(t<6){const a=(t-1)*.9;return [at[0]+130*Math.cos(a),at[1]+55*Math.sin(a)];}
  if(t<11)return [at[0]+330,at[1]+30];
  if(t<14)return [at[0]+330,at[1]+30];
  if(t<17)return [at[0]+330-(t-14)/3*620,at[1]+10];
  return [at[0]-290,at[1]+10];};
 const orig=P.step;P.step=(dt,t2)=>{time+=dt;
  if(time>.5&&picked==null){input('move',[p.x,p.y-p.spec.height*p.k*.4]);input('down',[p.x,p.y-p.spec.height*p.k*.4]);input('up',[p.x,p.y-p.spec.height*p.k*.4]);picked=time;}
  if(time>1&&time<20){cur=path(time);input('move',cur);}
  if(time>=20&&time<20.1&&p.picked){input('move',[p.x,p.y-p.spec.height*p.k*.4]);input('down',[p.x,p.y-p.spec.height*p.k*.4]);input('up',[p.x,p.y-p.spec.height*p.k*.4]);}
  orig(dt,t2);
  if(picked!=null&&firstMove==null&&p.state==='move'&&!p.rigTurning)firstMove=time-picked;
  if(time>1)gaps.push(Math.hypot(cur[0]-p.x,cur[1]-p.y)/(p.spec.height*p.k));
 };
 function rect(){const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect();
  const pts=[[at[0]-420,at[1]-260],[at[0]+460,at[1]+120]];
  const q=pts.map(([x,y])=>[(m.a*x+m.c*y+m.e)/cv.width*r.width,(m.b*x+m.d*y+m.f)/cv.height*r.height]);return [Math.min(q[0][0],q[1][0]),Math.min(q[0][1],q[1][1]),Math.max(q[0][0],q[1][0]),Math.max(q[0][1],q[1][1])];}
 window.__shotReport=()=>({time:+time.toFixed(2),rect:rect(),state:p.state+(p.picked?'*':''),pose:p.spP,gait:p.gait,mg:p._catMotion&&p._catMotion.gait,leap:p.follow&&+(p.follow.leap||0).toFixed(2),body:Math.round(P.box(p)[2]-P.box(p)[0]),gap:+(gaps.at(-1)||0).toFixed(1),firstMove,phase:p.follow?.phase,errors:__errs});
};
