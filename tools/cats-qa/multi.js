// Group follow QA: three cats picked through the real input path, the cursor hops between points
// and rests at each. Reports flapping (move<->wait changes), facing flip-flops and rest stillness.
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const coats=(window.__qaCoats||'orange,black,grey').split(','),cats=coats.map(c=>P.items.find(q=>q.rosterId===c));
 for(const q of P.items)if(!cats.includes(q)){q.away=q.gone=true;q.mission='qa-hidden';}
 const S=P.stage,b=S.bounds,W=b[2]-b[0],H=b[3]-b[1];
 cats.forEach((p,i)=>{const at=P.project(p,b[0]+W*(.25+.12*i),b[1]+H*(.78-.05*i))||[400+90*i,900];p.surf='floor';p.z=0;p.x=at[0];p.y=at[1];p.away=p.gone=false;p.mission=null;P.state(p,'sit',1e9);});
 function screen(v){const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect();return [(m.a*v[0]+m.c*v[1]+m.e)/cv.width*r.width+r.left,(m.b*v[0]+m.d*v[1]+m.f)/cv.height*r.height+r.top];}
 const input=(k,v)=>{const q=screen(v);window.__lw(k,q[0],q[1]);};
 const pts=[[.6,.75],[.85,.55],[.35,.9],[.5,.6],[.15,.75],[.7,.85]].map(([u,v])=>[b[0]+u*W,b[1]+v*H]);
 const SEG=6;let time=0;const stat=cats.map(()=>({flaps:0,last:null,views:[],restMoves:0,minGap:1e9,restGap:1e9,seg:-1,segFlaps:0}));
 const orig=P.step;P.step=(dt,t)=>{time+=dt;
  cats.forEach((p,i)=>{const at=.3+i*.25;if(time>=at&&time-dt<at){const c=[p.x,p.y-p.spec.height*p.k*.4];input('move',c);input('down',c);input('up',c);}});
  const k=Math.min(pts.length-1,Math.floor(time/SEG)),c=pts[k],u=time-k*SEG;
  if(time>1.2)input('move',u<1?[c[0]+Math.sin(time*3)*6,c[1]]:c);   // small wobble while arriving, then rest
  orig(dt,t);
  cats.forEach((p,i)=>{const s=stat[i],st=p.state==='move'?'move':p.state;
   if(s.seg!==k){s.flaps+=Math.max(0,s.segFlaps-2);s.segFlaps=0;s.seg=k;}if(time>2&&s.last&&s.last!==st&&(s.last==='move'||st==='move'))s.segFlaps++;s.last=st;
   s.views.push(p.spP.replace(/-\d+$/,''));
   if(time>2&&u>4&&p.state==='move'&&Math.hypot(p.groundVX||0,p.groundVY||0)>1)s.restMoves+=dt;
   cats.forEach(o=>{if(o!==p&&time>2){const g=Math.hypot(o.x-p.x,(o.y-p.y)/.55)/(P.box(p)[2]-P.box(p)[0]);s.minGap=Math.min(s.minGap,g);if(u>4)s.restGap=Math.min(s.restGap,g);}});});
 };
 const flip=v=>v.filter((x,i)=>i>1&&x===v[i-2]&&x!==v[i-1]).length;
 window.__shotReport=()=>({time:+time.toFixed(2),rect:[0,0,1280,800],cats:cats.map((p,i)=>({c:p.rosterId,st:p.state,pose:p.spP,picked:p.picked,flaps:stat[i].flaps,flips:flip(stat[i].views),restMoves:+stat[i].restMoves.toFixed(2),minGap:+stat[i].minGap.toFixed(2),restGap:+stat[i].restGap.toFixed(2),x:Math.round(p.x),y:Math.round(p.y)})),errors:__errs});
};
