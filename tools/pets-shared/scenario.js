// wkshot-only deterministic, continuous sequence. Scene clock is never reset.
console.error=(...a)=>{const s=a.map(e=>String(e)+' '+(e?.stack||'')).join(' ');if(!__errs.includes(s))__errs.push(s)};
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const S=P.stage,G=LW.pets.geometry,hero=P.items.find(p=>p.kind==='dog')||P.items[0],cat=P.items.find(p=>p.kind==='cat')||hero;
 let time=0,phase=-1,bad=[],traces=[];const step=P.step;
 const allowed=(x,y)=>S.floor.some(poly=>G.inside([x,y],poly));
 function hide(){for(const p of P.items){p.away=p.gone=true;p.mission='qa-hidden';p.j=null;p.path=null;p.goal=null;}}
 const points=[];for(let y=S.bounds[1]+12;y<S.bounds[3]-5;y+=20)for(let x=S.bounds[0]+130;x<S.bounds[2]-130;x+=30)if(allowed(x,y))points.push([x,y]);
 const routes=(dx,dy)=>points.filter(([x,y])=>{for(let i=0;i<=10;i++)if(!allowed(x+dx*i/10,y+dy*i/10))return false;return true;});
 const choose=(dx,dy)=>{const a=routes(dx,dy);return a[Math.floor(a.length/2)]||points[0];};
 function walk(dx,dy){hide();const a=choose(dx,dy);if(!a)throw Error('No QA floor route');P.forceWalk(hero.id,a[0]+dx,a[1]+dy,{from:a});}
 function start(n){
  phase=n;
  if(n===0){if(location.pathname.includes('rooftop')){hide();P.forceWalk(hero.id,900,948,{from:[720,948]});}else walk(180,0);}
  if(n===1)walk(120,66);
  if(n===2)walk(120,-66);
  if(n===3){hide();const a=choose(100,0);P.forceJump(hero.id,a[0]+100,a[1],{from:a});}
  if(n===4){hide();const a=choose(100,55);P.forceJump(hero.id,a[0]+100,a[1]+(hero.kind==='panda'?0:55),{from:a});}
  if(n===5){hide();const a=choose(100,-55);P.forceJump(hero.id,a[0]+100,a[1]+(hero.kind==='panda'?0:-55),{from:a});}
  if(n===6){hide();const link=S.links?.find(l=>l[0].surf==='floor'||l[1].surf==='floor');if(link){const a=link.find(x=>x.surf==='floor'),b=link.find(x=>x.surf!=='floor'),l=S.ledges.find(l=>l.id===b.surf);P.forceJump(cat.id,b.x,l.y,{from:[a.x,a.y],surf1:b.surf});}else walk(180,0);}
  if(n===7){hide();const q=P.items.find(p=>p!==hero),width=260;let a,b;
   for(const pt of routes(width,0)){const y=pt[1]+Math.max(hero.spec.height,q.spec.height)*1.6;if(allowed(pt[0],y)&&allowed(pt[0]+width,y)){a=pt;b=[pt[0]+width,y];break;}}
   if(!a){a=choose(380,0);b=[a[0]+380,a[1]];}
   P.forceWalk(hero.id,a[0]+width,a[1],{from:a});if(q)P.forceWalk(q.id,b[0]-width,b[1],{from:b});}
  if(n===8){for(const p of P.items)p.mission=null;P.reset();for(const p of P.items){p.mission='qa';P.state(p,p.id%2?'sit':'sleep',1e9);}}
 }
 P.step=(dt,t)=>{time+=dt;const n=time<4?0:time<7?1:time<10?2:time<11.5?3:time<13?4:time<14.5?5:time<16?6:time<28?7:8;if(n!==phase)start(n);step(dt,t);const o=P.overlaps();if(o.length&&bad.length<20)bad.push({time,o});};
 start(0);LW.advance(1/30);
 function screenPets(){
  const cv=document.querySelector('canvas'),g=hero.kind==='panda'?null:cv.getContext('2d'),m=g?.getTransform(),r=cv.getBoundingClientRect();
  return P.items.filter(p=>!p.away).map(p=>{const f=P.frame(p);if(!f)return null;let a=[f.x+Math.min(f.dir*f.sx*f.ox,f.dir*f.sx*(f.ox+f.w)),f.y+f.sy*f.oy],b=[a[0]+f.w*f.sx,f.y+8*p.k];
   const tr=v=>m?[(m.a*v[0]+m.c*v[1]+m.e)/cv.width*r.width,(m.b*v[0]+m.d*v[1]+m.f)/cv.height*r.height]:[(LW.layout?.side==='left'?r.width-v[0]:v[0]),v[1]];
   a=tr(a);b=tr(b);return [Math.min(a[0],b[0])-30,Math.min(a[1],b[1])-20,Math.max(a[0],b[0])+30,Math.max(a[1],b[1])+25];}).filter(Boolean);
 }
 window.__shotReport=()=>({time,phase,bad,screen:screenPets(),pets:P.items.filter(p=>!p.away).map(p=>({id:p.rosterId,x:p.x,y:p.y,k:p.k,state:p.state,frame:P.frame(p)?.key,path:p.path?.pts})),errors:__errs});
};
