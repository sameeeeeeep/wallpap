// Monkey test for cat follow: the real scene, all cats from their real homes, uneven frame times with
// hitches, human-like cursor (glides, rests, wobble, fast swipes, leaving the screen), random clicks on
// cats. Run in a page opened with ?virtual=1:  await LW.monkey(seed, seconds)  -> {issues, stats}
(()=>{
LW.monkey=function(seed=1,seconds=180,probe=null){
 let s=seed>>>0||1;const rnd=()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0,(s^s>>>14)>>>0)/4294967296);
 let s2=(seed*7919)>>>0||3;const realRandom=Math.random;Math.random=()=>((s2=Math.imul(s2^s2>>>15,1|s2)+0x6D2B79F5|0,(s2^s2>>>14)>>>0)/4294967296);   // pets' own randomness, reproducible
 const probes=[],snaps=[];
 const P=window.__pets,S=P.stage,b=S.bounds,cssH=innerHeight,css=v=>[v[0]*cssH/1000,v[1]*cssH/1000];
 P.reset();P.initialized=true;for(const p of P.items){p.follow=null;p.picked=false;p.t=0;}   // identical start for every seed
 let stepMs=0,steps=0,worst=0;const realStep=P.step;P.step=(a,b2)=>{const t1=Date.now();realStep(a,b2);const d=Date.now()-t1;stepMs+=d;steps++;if(d>worst)worst=d;};
 const inp=(k,v)=>{const q=css(v);window.__lw(k,q[0],q[1]);};
 const floorPt=()=>{for(let i=0;i<40;i++){const v=[b[0]+rnd()*(b[2]-b[0]),b[1]+(.55+rnd()*.45)*(b[3]-b[1])];if(P.project(P.items[0],...v))return v;}return [(b[0]+b[2])/2,(b[1]+b[3])*.8];};
 const click=p=>{const c=[p.x,p.y-p.z-p.spec.height*p.k*.4];inp('move',c);inp('down',c);inp('up',c);};
 const rec=new Map(),issues=[];let t=0,cur=floorPt(),goal=cur,mode='rest',modeT=2,inside=true;
 const tick=dt=>{LW.advance(dt,1/dt);t+=dt;};
 inp('move',cur);
 while(t<seconds){
  modeT-=1/60;
  if(modeT<=0){const r=rnd();
   if(r<.08){const cats=P.items.filter(p=>!p.away&&!p.j);if(cats.length)click(cats[Math.floor(rnd()*cats.length)]);mode='rest';modeT=.5+rnd()*2;}
   else if(r<.12){mode='out';modeT=1+rnd()*2;window.__lw('leave',0,0);inside=false;}
   else if(r<.45){mode='glide';goal=floorPt();modeT=.8+rnd()*2.5;}
   else if(r<.6){mode='swipe';goal=floorPt();modeT=.3+rnd()*.4;}
   else if(r<.75){mode='wobble';modeT=1+rnd()*2;}
   else{mode='rest';modeT=1+rnd()*5;}
   if(mode!=='out'&&!inside){inside=true;}
  }
  const k=mode==='swipe'?.25:mode==='glide'?.06:0;
  if(k){cur=[cur[0]+(goal[0]-cur[0])*k,cur[1]+(goal[1]-cur[1])*k];inp('move',cur);}
  else if(mode==='wobble'){inp('move',[cur[0]+Math.sin(t*9)*4,cur[1]+Math.cos(t*7)*3]);}
  else if(mode==='rest'&&inside)inp('move',cur);
  const dt=rnd()<.01?.12+rnd()*.2:1/(40+rnd()*80);   // uneven frames, ~1% hitches up to 0.3 s
  tick(dt);
  if(probe&&t>=probe[0]&&t<=probe[1]){const p=P.items.find(q=>q.rosterId===probe[2]);probes.push({t:+t.toFixed(2),st:p.state,pose:p.spP,x:Math.round(p.x),y:Math.round(p.y),goal:p.goal&&[Math.round(p.goal.x),Math.round(p.goal.y)],path:p.path&&p.path.pts.slice(p.path.i).map(q=>q.map(Math.round)),chase:p.chase,phase:p.follow&&p.follow.phase,tgt:p.follow&&p.follow.target&&p.follow.target.map(Math.round),slot:p.follow&&p.follow.slot&&p.follow.slot.map(Math.round),det:p.follow&&p.follow.detour&&p.follow.detour.map(Math.round),blocked:+(p.blocked||0).toFixed(2),waited:+(p.waited||0).toFixed(2),mode});}
  for(const p of P.items){if(p.away||p.picked||p.state!=='move'||!(p.blocked>0)||snaps.length>=6||snaps.some(x=>x.cat===p.rosterId&&t-x.t<5))continue;const D=P._dbg,n=p.path&&p.path.pts[p.path.i];if(!D||!n)continue;
   const L=Math.hypot(n[0]-p.x,n[1]-p.y)||1,nx=[p.x+(n[0]-p.x)/L*3,p.y+(n[1]-p.y)/L*3];
   snaps.push({cat:p.rosterId,t:+t.toFixed(2),at:[Math.round(p.x),Math.round(p.y)],next:nx.map(Math.round),freeHere:D.freeIdle(p,p.x,p.y),freeNext:D.freeIdle(p,...nx),why:D.why&&D.why(p,...nx),flights:D.flights().map(f=>f.map(v=>typeof v==='number'?Math.round(v):v)),mybox:P.box(p,...nx).map(Math.round),others:P.items.filter(o=>o!==p&&!o.away).map(o=>[o.rosterId,o.state,o.picked,!!o.chase,P.box(o).map(Math.round)])});}
  for(const p of P.items){if(p.away)continue;const h=rec.get(p)||rec.set(p,[]).get(p);const f=p.follow;h.push([t,p.state,p.spP,p.x,p.y,!!p.picked,p.surf,mode,{goal:p.goal&&[Math.round(p.goal.x),Math.round(p.goal.y)],path:p.path&&p.path.pts.slice(p.path.i).map(q=>q.map(Math.round)),chase:p.chase,ph:f&&f.phase,slot:f&&f.slot&&f.slot.map(Math.round),tgt:f&&f.target&&f.target.map(Math.round),blk:+(p.blocked||0).toFixed(2),wt:+(p.waited||0).toFixed(2),pt:+(p.t||0).toFixed(2),mission:p.mission,turn:!!p.turn,tr:p._catTransition&&p._catTransition.key,grp:P.items.filter(o=>o.picked).length,by:p.blocked>0&&p.path&&p.path.pts[p.path.i]?(()=>{const n=p.path.pts[p.path.i],L=Math.hypot(n[0]-p.x,n[1]-p.y)||1,b=P.box(p,p.x+(n[0]-p.x)/L*4,p.y+(n[1]-p.y)/L*4);return P.items.filter(o=>o!==p&&!o.away).filter(o=>{const c=P.box(o);return !(b[2]<c[0]||b[0]>c[2]||b[3]<c[1]||b[1]>c[3]);}).map(o=>o.rosterId+':'+o.state+(o.picked?'*':'')+(o.chase?'^':'')+(o.j?'J':'')).join(' ')})():undefined}]);}
 }
 // detectors
 const view=n=>n.replace(/^(walk|run|jump)-|-\d+$/g,'');
 for(const [p,h] of rec){
  const add=(kind,i,extra)=>{const last=issues.filter(x=>x.cat===p.rosterId&&x.kind===kind).pop();if(!last||h[i][0]-last.t>1.5)issues.push({cat:p.rosterId,kind,t:+h[i][0].toFixed(2),...extra});};
  for(let i=0,j=0;i<h.length;i++){
   while(j<h.length&&h[j][0]-h[i][0]<.7)j++;if(j>=h.length)break;
   const seg=h.slice(i,j+1),moves=seg.every(e=>e[1]==='move'&&!e[8].tr&&!e[8].turn),disp=seg.reduce((a,e,k)=>k?a+Math.hypot(e[3]-seg[k-1][3],e[4]-seg[k-1][4]):0,0);
   if(moves&&disp<3)add('stuck',i,{at:[Math.round(h[i][3]),Math.round(h[i][4])],pose:h[i][2]});
   const vs=seg.filter(e=>e[1]==='move'&&!e[8].turn&&!e[8].tr).map(e=>view(e[2]));
   if(vs.length>8&&((vs.includes('away')&&vs.includes('toward'))||(vs.includes('near')&&vs.includes('far')))&&Math.hypot(h[j][3]-h[i][3],h[j][4]-h[i][4])<20&&disp<40)add('jitter',i,{views:[...new Set(vs)]});
   const ch=[];for(let q=i+1;q<=j;q++)if(seg[q-i-1][1]!==seg[q-i][1])ch.push(seg[q-i][1]);
  }
  // state loops: >=3 entries into 'move' within 3 s with < 25 px net travel
  const ent=h.filter((e,i)=>i&&e[1]==='move'&&h[i-1][1]!=='move');
  for(let i=0;i+2<ent.length;i++)if(ent[i+2][0]-ent[i][0]<3&&Math.hypot(ent[i+2][3]-ent[i][3],ent[i+2][4]-ent[i][4])<25)add('loop',h.indexOf(ent[i]),{});
  // re-sit: while not moving, a sit that had begun goes back to standing and starts again
  for(let i=1;i<h.length;i++){const a=h[i-1],c=h[i];if(a[1]===c[1]&&a[1]!=='move'&&/^sit-[3-8]$/.test(a[2])&&/^walk-/.test(c[2])&&Math.hypot(c[3]-a[3],c[4]-a[4])<2)add('resit',i,{state:c[1]});}
  // pop: a sit / lie-down animation skips frames (e.g. sit-1 straight to sit-8)
  for(let i=1;i<h.length;i++){const a=/^(sit|rest)-(\d)$/.exec(h[i-1][2]),c=/^(sit|rest)-(\d)$/.exec(h[i][2]);if(a&&c&&a[1]===c[1]&&Math.abs(a[2]-c[2])>2&&h[i][0]>.5&&h[i][0]-h[i-1][0]<.1)add('pop',i,{from:h[i-1][2],to:h[i][2]});}
  // facing flicker: A B A view sequence within 0.3 s while moving
  for(let i=2;i<h.length;i++){const a=h[i-2],m=h[i-1],c=h[i];if(a[1]==='move'&&m[1]==='move'&&c[1]==='move'&&c[0]-a[0]<.3){const va=view(a[2]),vm=view(m[2]),vc=view(c[2]);if(va===vc&&va!==vm)add('flicker',i,{views:[va,vm]});}}
 }
 Math.random=realRandom;P.step=realStep;
 for(const is of issues){const h=rec.get(P.items.find(p=>p.rosterId===is.cat));let last='';is.ctx=[];for(const e of h){if(e[0]<is.t-.3||e[0]>is.t+4)continue;const d=e[8],k=JSON.stringify([e[1],e[2].replace(/-\d+$/,''),d.goal,d.path,d.mission,d.ph,d.tr,d.turn]);if(k!==last){is.ctx.push([+e[0].toFixed(2),e[1],e[2],Math.round(e[3]),Math.round(e[4]),e[7],JSON.stringify({g:d.goal,p:d.path,m:d.mission,ph:d.ph,tr:d.tr,turn:d.turn,wt:d.wt,blk:d.blk,pk:e[5],by:d.by})]);last=k;}}is.ctx=is.ctx.slice(0,30);}
 return {snaps,perf:{avgMs:+(stepMs/steps).toFixed(3),worstMs:+worst.toFixed(1)},probes,seed,seconds,frames:[...rec.values()][0]?.length,issues,picks:[...rec.entries()].map(([p,h])=>[p.rosterId,h.filter(e=>e[5]).length])};
};
})();
