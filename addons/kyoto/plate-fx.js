/* Shared data-driven life for addons/_template. No place names or place-specific code.
 * Paths are normalised plate coordinates; unavailable/unsafe paths disable their actors.
 * This filename is already copied by plate.py pack. */
(function(root) {
'use strict';
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const smooth = v => { v=clamp(v); return v*v*(3-2*v); };
function create(config) {
  if(config.version!==1) throw new Error('Unsupported scene-config version');
  const C=config.layers, life=config.life||{}, paths=config.paths||{};
  const plate=Kit.plate({base:'art/',plates:C.plates,masks:C.masks,focus:C.focus||[.5,.5],
    shimmer:life.water?.strength??0,sparkle:life.water?.sparkle??0,emissive:life.lights?.strength??0});
  let clock=0, breath=0, bed=null, boatSheet=null;
  // Kit reads its four standard masks; route masks use the same CPU sampling contract.
  const plateInit=plate.init;
  plate.init=k=>{
    plateInit(k);
    for(const name of ['road','walk'])if(k.assets[name+'Mask']) {
      const cv=document.createElement('canvas');cv.width=384;cv.height=240;
      const g=cv.getContext('2d');g.drawImage(k.assets[name+'Mask'],0,0,384,240);
      const data=g.getImageData(0,0,384,240).data,m=new Uint8Array(384*240);
      for(let i=0;i<m.length;i++)m[i]=data[i*4];
      plate.masks[name]={m,w:384,h:240};
    }
  };
  const routes={};
  for(const [name,points] of Object.entries(paths)) {
    if(Array.isArray(points)&&points.length>1&&points.every(p=>p.length===2&&p.every(Number.isFinite))) routes[name]=Kit.path(points);
  }
  // Fade across widget and avoid boundaries; restOK is also checked for clicks.
  function quiet(k,x,y,r=16) {
    const l=k.layout;
    let a=smooth((x-l.clearPx[0])/r)*smooth((l.clearPx[1]-x)/r);
    for(const [ax,ay,aw,ah] of l.avoidPx) {
      const dx=Math.max(ax-x,0,x-ax-aw),dy=Math.max(ay-y,0,y-ay-ah);
      a*=smooth(Math.hypot(dx,dy)/r);
    }
    return a;
  }
  const inMask=(name,x,y)=>plate.maskAt(name,x,y,0)>.88;
  function track(name,u,k) {
    const route=routes[name]; if(!route)return null;
    const [nx,ny]=route.at(clamp(u)),[x,y]=plate.toScreen(nx,ny);
    if(!inMask(name,x,y))return null;
    return {x,y,nx,ny,a:quiet(k,x,y)*smooth(u*14)*smooth((1-u)*14)};
  }
  // Render precipitation into a transparent target and mask the entire result, not
  // merely spawn positions. Long streaks and drifting flakes cannot cross a roof.
  const weather=Kit.particles({rain:!!life.weather,snow:!!life.weather,splash:true});
  const moving=Kit.sprites((b,k)=>{
    if(life.lights)for(const [nx,ny,r,p,col] of k.assets.lights?.lights||[]) {
      const [x,y]=plate.toScreen(nx,ny),a=quiet(k,x,y)*k.L.night*p;
      if(a>.01)b.glow(x,y,clamp(r*k.W*3,1,9),col,a*(.12+k.L.fog*.35),1,3);
    }
    if(life.birds&&k.L.day>.08) {
      const count=clamp(life.birds.count??5,0,12);
      for(let i=0;i<count;i++) {
        const u=(clock/140+.18+i*.013)%1, nx=-.08+u*1.16;
        const ny=(life.birds.height??.22)+Math.abs(i-(count-1)/2)*.012+Math.sin(clock*.12+i*.3)*.009;
        const [x,y]=plate.toScreen(nx,ny),s=clamp(k.W*.0022,1.5,4);
        const a=quiet(k,x,y)*k.L.day*.55*clamp(1-k.L.fog*1.4);
        if(!inMask('sky',x,y)||!inMask('sky',x-s,y-s)||!inMask('sky',x+s,y+s))continue;
        const wing=Math.sin(clock*4.7+i)*s*.6;
        b.line(x-s,y-wing,x,y,.7,[.13,.17,.2],a);
        b.line(x,y,x+s,y-wing,.7,[.13,.17,.2],a);
      }
    }
    if(life.boats&&routes.water)for(let i=0;i<(life.boats.count??2);i++) {
      const u=(clock/(life.boats.period??220)+.24+i*.43)%1,p=track('water',u,k);if(!p)continue;
      if(!boatSheet)continue;
      const s=clamp(k.W*(life.boats.size??.021),12,32),a=p.a*(.3+.7*k.L.day);
      if(!inMask('water',p.x-s*.55,p.y+2)||!inMask('water',p.x+s*.55,p.y+2))continue;
      b.line(p.x-s*.7,p.y+1,p.x+s*.7,p.y+1,1,[.72,.77,.78],a*.15,1);
      const f=boatSheet.f.boat;
      b.use(boatSheet).sprite(f,p.x,p.y,s,s*f.aspect,0,k.L.tint,a,.5,1);
    }
    if(life.traffic&&routes.road)for(let i=0;i<(life.traffic.count??5);i++) {
      const u=(clock/(life.traffic.period??90)+i*.19)%1, p=track('road',u,k),q=track('road',Math.max(0,u-.009),k);
      if(!p||!q)continue;
      const a=Math.min(p.a,q.a)*k.L.night*.7,col=i%2?[1,.25,.12]:[1,.84,.58];
      b.line(q.x,q.y,p.x,p.y,1.1,col,a,1);b.glow(p.x,p.y,2,col,a*.4,1,2);
    }
    if(life.walkers&&routes.walk)for(let i=0;i<(life.walkers.count??2);i++) {
      const u=(clock/(life.walkers.period??260)+i*.39+.12)%1,p=track('walk',u,k);if(!p)continue;
      const s=clamp(k.H*.007,3,7),a=p.a*(.25+.75*k.L.day),col=[.15,.17,.18];
      const stride=Math.sin(clock*3+i)*s*.16;
      b.glow(p.x,p.y-s,s*.13,col,a,0,2);
      b.line(p.x,p.y-s*.76,p.x,p.y-s*.32,s*.25,col,a);
      b.line(p.x,p.y-s*.34,p.x+stride,p.y,.65,col,a);
      b.line(p.x,p.y-s*.34,p.x-stride,p.y,.65,col,a);
    }
  });
  const horizon=clamp(C.horizon??.4,.12,.8);
  const sky=Kit.sky({elev:[.6,-.6*(1-horizon)/horizon],cover:null,place:(k,e,az)=>{
    // The prompt templates light sunset from the left; keep celestial highlights
    // inside the clear band as widgets move, including explicit avoid rectangles.
    const [x,y]=plate.toScreen(.5-Math.sin(az)*.45,horizon-e*.65);
    const candidates=[clamp(x,k.layout.clearPx[0]+40,k.layout.clearPx[1]-40),k.clearX(.65),k.clearX(.35),k.clearX(.5)];
    return [candidates.find(px=>k.restOK(px,y))??k.clearX(.5),y];
  }});
  const ambience={wind:life.ambience!=='off',windLevel:.012,
    build(A,k,ctx) {
      const preset=life.ambience;
      if(!preset||preset==='off')return;
      const stream=preset==='stream';
      bed=A.loop(ctx,stream?'pink':'brown',A.out,stream?.028:.04,A.filt(ctx,'lowpass',stream?1800:650));
    },
    tick(A,k,at) {if(bed)bed.gain.setTargetAtTime((life.ambience==='stream'?.025:.038)*(1+Math.sin(clock*.22)*.15)*(LW.calm?.7:1),at,.8);}
  };
  const grade=Kit.light({vignette:.08,grain:.009,glow:.12});
  const assets=life.lights&&C.lights?{lights:'art/'+C.lights}:{};
  for(const n of ['road','walk'])if(C.masks[n])assets[n+'Mask']='art/'+C.masks[n];
  if(life.boats)assets.boat='art/shared/fishing-boat.png';
  const scene=Kit.scene({assets,
    setup(k){if(k.assets.boat)boatSheet=k.sheet({boat:k.assets.boat});},
    layers:[sky,plate,moving,weather,grade],ambience,
    exposedAt:(x,y)=>inMask('exposed',x,y),
    surfaceAt:(x,y)=>!inMask('exposed',x,y)||inMask('sky',x,y)?null:inMask('water',x,y)?'water':'ground',
    onReminder(){},
    update(dt,t,k){clock+=dt*(LW.calm&&life.calm ? .4 : 1);
      // Kit starts snow at 65%; new scenes start bare, then use its accumulated weather.
      if(k.frame===1){k.snowAcc=0;k.L.snow=0;}
      plate.opt.shimmer=(life.water?.strength??0)*(1+(life.calm ? breath*.1*k.breath.fade : 0));
      grade.opt.exposure=1+(breath-.5)*.035*k.breath.fade;},
    ...(life.calm?{breathe(level,phase,k){breath=level;grade.opt.exposure=1+(level-.5)*.035*k.breath.fade;}}:{}),
    onDown(x,y,k){
      if(!life.click||!k.restOK(x,y))return;
      if(inMask('water',x,y)){k.ripples.drop(x,y,12,-.35);k.sound.plop(x,.25);}
      else if(inMask('exposed',x,y)){k.wind.puff(.25);}
    }
  });
  return {scene,plate,weather,config,report(){return {ready:scene.ready,version:config.version,
    paths:Object.keys(routes),presets:Object.keys(life).filter(n=>!!life[n]),
    particles:weather.list.length,jsMs:scene.stats.js,night:scene.L?.night,snow:scene.snowAcc,wet:scene.wetAcc,
    mirror:scene.layout?.mirror,maskCoverage:Object.fromEntries(Object.entries(plate.masks).map(([n,m])=>[n,Array.from(m.m).filter(v=>v>128).length/m.m.length]))};}};
}
root.PlatePresets={create};
})(window);
