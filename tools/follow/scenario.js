// Isolated WKWebView only: all interactions go through lw.js input, never direct pick calls.
console.error=(...a)=>{const s=a.map(e=>String(e)+' '+(e?.stack||'')).join(' ');if(!__errs.includes(s))__errs.push(s)};
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const S=P.stage,G=LW.pets.geometry,hero=P.items.find(p=>p.kind==='cat')||P.items[0],other=P.items.find(p=>p!==hero);
 const original=P.step;let time=0,phase=-1,local=0,bad=[],coverage={},startPoint,target,lastClick=false,movedTarget=false,events=[];
 const names=['lateral','toward','away','run','pounce-side','pounce-front','pounce-back','two-picked','release','leave-return-pause'];
 function screen(v){const cv=document.querySelector('canvas'),m=cv.getContext('2d').getTransform(),r=cv.getBoundingClientRect();return [(m.a*v[0]+m.c*v[1]+m.e)/cv.width*r.width+r.left,(m.b*v[0]+m.d*v[1]+m.f)/cv.height*r.height+r.top];}
 function input(kind,v){const q=screen(v);window.__lw(kind,q[0],q[1]);}
 function tap(p){input('move',[p.x,p.y-p.spec.height*p.k*.4]);input('down',[p.x,p.y-p.spec.height*p.k*.4]);events.push({time,kind:'tap',id:p.rosterId,picked:p.picked});}
 const allowed=(x,y)=>S.floor.some(poly=>G.inside([x,y],poly));
 function hide(){for(const p of P.items){p.picked=false;p.follow=null;p.turn=null;p.away=p.gone=true;p.mission='qa-hidden';p.j=null;p.path=null;p.goal=null;p.sequence=null;p.prev=null;}}
 function route(dx,dy){
  const found=[];
  for(let y=S.bounds[1]+8;y<S.bounds[3]-8;y+=16)for(let x=S.bounds[0]+130;x<S.bounds[2]-130;x+=24){
   if(!allowed(x,y))continue;let good=true;
   for(let i=0;i<=16;i++){const a=x+dx*i/16,b=y+dy*i/16,q=P.project(hero,a,b);if(!q||Math.hypot(q[0]-a,q[1]-b)>2){good=false;break;}}
   if(good)found.push([x,y]);
  }
  found.sort((a,b)=>Math.abs(a[0]-(S.bounds[0]+S.bounds[2])*.5)+Math.abs(a[1]-(S.bounds[1]+S.bounds[3])*.5)-Math.abs(b[0]-(S.bounds[0]+S.bounds[2])*.5)-Math.abs(b[1]-(S.bounds[1]+S.bounds[3])*.5));
  return found[0];
 }
 function start(n){
  phase=n;local=0;lastClick=false;movedTarget=false;coverage[n]??={name:names[n],frames:[],states:[],gaits:[],picks:[],landings:[]};
  if(n===8||n===9)return;
  hide();let slope=n===1||n===5?.55:n===2||n===6?-.55:0;
  let dx=n===3?450:n>=4&&n<=6?145:280,dy=dx*slope;
  startPoint=route(dx,dy);if(!startPoint){dx*=.65;dy=dx*slope;startPoint=route(dx,dy);}
  if(!startPoint)throw Error('No pointer QA route '+names[n]);
  P.forceWalk(hero.id,...startPoint,{from:startPoint});hero.mission='qa';hero._petDirection={view:'side',face:1};hero.lastPounce=null;
  target=[startPoint[0]+dx,startPoint[1]+dy];
  if(n===7){
   const spots=[];for(let y=S.bounds[1]+10;y<S.bounds[3];y+=20)for(let x=S.bounds[0]+100;x<S.bounds[2]-100;x+=30)if(allowed(x,y)&&P.free(other,x,y)&&Math.hypot(x-startPoint[0],y-startPoint[1])>180)spots.push([x,y]);
   spots.sort((a,b)=>Math.hypot(a[0]-target[0],a[1]-target[1])-Math.hypot(b[0]-target[0],b[1]-target[1]));
   if(!spots[0])throw Error('No second pet QA start');P.forceWalk(other.id,...spots[0],{from:spots[0]});other.mission='qa';
  }
  tap(hero);if(n===7)tap(other);input('move',startPoint);
 }
 P.step=(dt,t)=>{
  time+=dt;const n=Math.min(9,Math.floor(time/12));if(n!==phase)start(n);local=time-phase*12;
  if(phase<8&&local>.4&&!movedTarget){input('move',target);movedTarget=true;}
  if((phase===1||phase===2)&&local>1.5&&local<3){const d=(local-1.5)*160;input('move',[target[0]+d,target[1]+d*(phase===1?.55:-.55)]);}
  if(phase===3&&local>1.5&&local<4)input('move',[target[0]+(local-1.5)*160,target[1]]);
  if(phase===8&&!lastClick&&local>1){tap(hero);lastClick=true;}
  if(phase===9){
   if(local<3)window.__lw('leave');else if(local<8)input('move',target);
   else if(!lastClick){window.__lw('focus',false);lastClick=true;events.push({time,kind:'pause',picks:P.items.filter(p=>p.picked).length});}
  }
  original(dt,t);const overlap=P.overlaps();if(overlap.length&&bad.length<20)bad.push({time,overlap});
  const c=coverage[phase];for(const p of P.items.filter(p=>!p.away)){
   for(const [key,v] of [['frames',P.frame(p)?.key],['states',p.follow?.phase||p.state],['gaits',p.gait],['picks',P.items.filter(p=>p.picked).length]])if(!c[key].includes(v))c[key].push(v);
   if(p.lastPounce&&!c.landings.some(q=>q.id===p.rosterId))c.landings.push({id:p.rosterId,...p.lastPounce});
   if(p.picked&&Math.hypot(p.groundVX,p.groundVY)>.01&&Math.abs(p.groundVY)>.01&&Math.abs(Math.abs(p.groundVY/p.groundVX)-.55)>.001)bad.push({time,heading:[p.groundVX,p.groundVY]});
  }
 };
 start(0);LW.advance(1/30);
 function screenPets(){return P.items.filter(p=>!p.away).map(p=>{const f=P.frame(p);if(!f)return null;const a=screen([f.x+Math.min(f.dir*f.ox,f.dir*(f.ox+f.w)),f.y+f.oy]),b=screen([f.x+Math.max(f.dir*f.ox,f.dir*(f.ox+f.w)),f.y+10*p.k]);return [Math.min(a[0],b[0])-20,Math.min(a[1],b[1])-10,Math.max(a[0],b[0])+20,Math.max(a[1],b[1])+15];}).filter(Boolean);}
 window.__shotReport=()=>({time,phase,name:names[phase],target,bad,events,coverage,screen:screenPets(),pets:P.items.filter(p=>!p.away).map(p=>({id:p.rosterId,x:p.x,y:p.y,picked:p.picked,state:p.state,follow:p.follow,frame:P.frame(p)?.key,path:p.path?.pts})),errors:__errs});
};
