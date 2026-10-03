/* Shared scale and pose composition for illustrated scene pets. */
(() => {
  'use strict';
  const clamp=t=>Math.max(0,Math.min(1,t));
  const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  const name=p=>typeof p==='string'?p:((p&&p.src||'').split('/').pop()||'').replace(/\.png.*$/,'');
  // walk1/walk2 and the drawn gait-cycle frames (walk-1..8, run-1..6): swapped as hard cuts
  const walking=p=>/^(walk[12]|walk-(?:[fb]-)?\d+|run-(?:[fb]-)?\d+)$/.test(name(p));
  LW.petUnit=(kind,walk)=>(kind==='dog'?96:78)/(walk.naturalHeight||walk.height);
  LW.petPoseScale=(kind,pose,walk,im)=>{
    if(im&&im.petK)return im.petK;   // a drawn in-between frame carries its own size (LW.petSeqPrep)
    const n=name(pose);
    if(walking(n)&&walk&&im)return (walk.naturalHeight||walk.height)/(im.naturalHeight||im.height);
    return (kind==='dog'?{sit:.88,sleep:.88,lie:.94,'belly-up':.9,'play-bow':.96}:{sit:.8,loaf:.88,sleep:.72,stretch:.92})[n]||1;
  };
  LW.poseFrame=(from,to,progress)=>{
    const t=clamp(Number.isFinite(progress)?progress:1),u=ease(t);
    // Never dissolve two animal silhouettes (a ghosted double cat): the old pose tucks, cuts to the new
    // one at the lowest point, and settles — one layer at a time.
    if(!from||from===to||t>=1)return {pose:to,sx:1,sy:1,from,mix:1,layers:[{pose:to,alpha:1}]};
    const tuck=Math.pow(Math.sin(Math.PI*t),2),p=t<.5?from:to;
    return {pose:p,sx:1+.025*tuck,sy:1-.085*tuck,from,mix:u,layers:[{pose:p,alpha:1}]};
  };
  // drawn in-between frame names (see LW.petSeqPrep): played as hard cuts, not crossfades
  const drawn=p=>/^(stand-sit|sit-sleep|turn|jump)-\d/.test(name(p));
  LW.poseState=(owner,target,duration=.36)=>{
    const now=performance.now()/1000;
    const s=owner._illustratedPose||(owner._illustratedPose={from:target,to:target,at:now-duration,d:duration});
    if(target!==s.to){
      // Advancing the gait must not restart an unfinished stand-up transition.
      if(walking(target)&&walking(s.to))s.to=target;
      // into a drawn sheet (its first frame is the pose it leaves) or frame to frame: cut
      else if(drawn(target)&&(drawn(s.to)||!/^jump-/.test(name(target)))){s.from=s.to=target;s.at=now-1;s.d=duration;}
      else {const u=clamp((now-s.at)/(s.d||duration));s.from=u<.5?s.from:s.to;s.to=target;s.at=now;s.d=drawn(s.from)||drawn(target)?.12:duration;}
    }
    return LW.poseFrame(s.from,s.to,(now-s.at)/(s.d||duration));
  };
  // Drawn in-between frames (art/sprites/<kind>/<name>/t/<seq>-1..5.png). Returns the
  // frame names to play for a pose-family change, or null → fall back to the crossfade.
  // Sheets: stand-sit (walk→sit), sit-sleep (sit→lying→curled; frame 3 ≈ loaf).
  const PATHS={'walk1>sit':[['stand-sit',1,5]],'sit>sleep':[['sit-sleep',1,5]],'walk1>sleep':[['stand-sit',1,5],['sit-sleep',2,5]],
    'sit>loaf':[['sit-sleep',1,3]],'loaf>sleep':[['sit-sleep',3,5]],'walk1>loaf':[['stand-sit',1,5],['sit-sleep',2,3]]};
  LW.petPath=(from,to,has)=>{
    let p=PATHS[from+'>'+to],rev=false;
    if(!p&&(p=PATHS[to+'>'+from]))rev=true;
    if(!p||!p.every(([q])=>has(q)))return null;
    const out=[];
    for(const [q,a,b] of p)for(let i=a;i<=b;i++)out.push(q+'-'+i);
    return rev?out.reverse():out;
  };
  // ---- drawn in-between frames: shared loader, layout and player -------------------
  // Which animals have sheets (art/sprites/<set>/t/<seq>-1..5.png). Update when a sheet ships.
  const ALL=['stand-sit','sit-sleep','turn','jump'];
  LW.PET_SEQ_HAS={'cats/orange':ALL,'cats/black':ALL,'cats/grey':ALL,'cats/calico':ALL,'cats/siamese':ALL,'dogs/golden':ALL,'dogs/corgi':ALL,'pandas/mei':ALL,'pandas/bao':ALL,'pandas/cub':ALL};
  // The pose family each sheet starts and ends on (the scene maps its own poses onto these).
  const SEQ_END={'stand-sit':['walk1','sit'],'sit-sleep':['sit','sleep'],turn:['walk1','walk1'],jump:['walk1','walk1']};
  // Load a set's sheets (base = 'art/sprites/', set = 'dogs/corgi'). A sheet counts once all
  // five frames load; done() fires when every listed sheet has loaded or failed.
  LW.petSeqLoad=(base,set,done)=>{
    const qs=LW.PET_SEQ_HAS[set]||[],T={raw:{},img:{},seq:{},has:q=>!!T.seq[q],left:qs.length,ready:!qs.length};
    const fin=()=>{if(--T.left===0&&done)done(T);};
    if(!T.left&&done)setTimeout(()=>done(T),0);
    for(const q of qs){
      const ims=[];let n=0,bad=false;
      for(let i=1;i<=5;i++){
        const im=new Image();
        im.onload=()=>{if(bad)return;if(!(im.naturalWidth>0)){bad=true;fin();return;}if(++n===5){T.raw[q]=ims;fin();}};
        im.onerror=()=>{if(!bad){bad=true;fin();}};
        im.src=base+set+'/t/'+q+'-'+i+'.png';ims.push(im);
      }
    }
    return T;
  };
  const dims=im=>[im.naturalWidth||im.width,im.naturalHeight||im.height];
  // Lay the loaded sheets out against the poses they join, interpolating per frame a size
  // factor (petK, used by LW.petPoseScale like a pose scale) and a foot-anchor x as a
  // fraction of width (petFa), so frame 1 and 5 meet the existing poses exactly.
  //   end(fam) → {im, k, fa} for 'walk1' | 'sit' | 'sleep' (k = that pose's petPoseScale), or null
  //   prep(im) → the drawable for a frame (e.g. a de-fringed canvas); opt.mirror=false skips the
  //   mirrored turn copies ('turn-N~m', for scenes that can flip UVs instead).
  // Call every frame (cheap once done); returns true once every loaded sheet is laid out.
  LW.petSeqPrep=(T,end,prep=im=>im,opt={})=>{
    if(T.ready)return true;
    for(const q of ['stand-sit','sit-sleep','turn','jump']){
      const ims=T.raw[q];if(!ims)continue;
      const [a,b]=SEQ_END[q],A=end(a),B=end(b);if(!A||!B)continue;
      const L=LW.petSeqLayout(q,ims.map(dims),A,B);
      delete T.raw[q];
      ims.forEach((im,i)=>{
        const p=q+'-'+(i+1),d=prep(im);d.petK=L[i].k;d.petFa=L[i].fa;d.petNear=L[i].near;d.petName=p;T.img[p]=d;
        if(q==='turn'&&opt.mirror!==false&&typeof document!=='undefined'){
          const [w,h]=dims(d),cv=document.createElement('canvas');cv.width=w;cv.height=h;
          const g=cv.getContext('2d');g.scale(-1,1);g.drawImage(d,-w,0);
          cv.naturalWidth=w;cv.naturalHeight=h;cv.petK=d.petK;cv.petFa=1-d.petFa;cv.petNear=d.petNear;cv.petName=p+'~m';T.img[p+'~m']=cv;
        }
      });
      T.seq[q]=true;
    }
    if(T.left<=0&&!Object.keys(T.raw).length)T.ready=true;
    return T.ready;
  };
  // The pure layout maths (tested): frame sizes [[w,h]…], endpoints {im,k,fa}. The jump has
  // no resting pose to measure, so its crouch (frame 1) is as long as the walking body.
  LW.petSeqLayout=(q,sz,A,B)=>{
    const n=sz.length,H=E=>dims(E.im)[1]*E.k;
    let k0=H(A)/sz[0][1],k1=H(B)/sz[n-1][1];
    if(q==='jump')k0=k1=dims(A.im)[0]*A.k*.97/sz[0][0];
    const a0=q==='jump'?.5:A.fa,a1=q==='turn'?1-A.fa:q==='jump'?.5:B.fa;
    return sz.map((_,i)=>{const u=i/(n-1);return {k:k0+(k1-k0)*u,fa:a0+(a1-a0)*u,near:u<.5?SEQ_END[q][0]:SEQ_END[q][1]};});
  };
  // Playback, once per frame (update or draw), with the pet's pose family ('walk1', 'sit',
  // 'sleep', 'loaf', or anything else — those just crossfade), its facing (±1) and the
  // scene clock in seconds. Returns the frame to show instead of the pose, or null.
  // Turning while on its feet plays the turn sheet — mirrored copies when the pet now faces
  // left, so the scene's own flip shows them the right way round; reversing mid-turn cancels.
  // A family change plays LW.petPath (stand↔sit↔sleep, chained, reversed as needed).
  LW.petSeqStep=(o,T,fam,face,now,opt={})=>{
    const s=o._petSeq||(o._petSeq={fam,face,run:null});
    let r=s.run;
    if(r&&r.turn&&r.face!==face)r=s.run=null;
    if(r&&(now-r.t0)/r.step>=r.names.length)r=s.run=null;
    if(!r&&T){
      if(face!==s.face&&fam==='walk1'&&s.fam==='walk1'&&T.has('turn')){
        const n=face<0?[1,2,3,4,5]:[5,4,3,2,1];
        r=s.run={names:n.map(i=>'turn-'+i+(face<0?'~m':'')),t0:now,step:opt.turnStep||.06,turn:true,face,end:'walk1'};
      }else if(fam!==s.fam){
        const p=LW.petPath(s.fam,fam,T.has);
        if(p)r=s.run={names:p,t0:now,step:opt.step||.075,turn:false,end:fam};
      }
    }
    s.face=face;   // a facing change mid pose-change is just adopted (no turn afterwards)
    s.fam=r?r.end:fam;
    if(!r)return null;
    return r.names[Math.max(0,Math.min(r.names.length-1,Math.floor((now-r.t0)/r.step)))];
  };
  // true while a pose change (not a turn) is still playing — scenes hold travel until it ends
  LW.petSeqBusy=o=>!!(o._petSeq&&o._petSeq.run&&!o._petSeq.run.turn);
  // How to swap from image a to b: 'cut' (gait frames, drawn frame to frame, or into a sheet,
  // whose first frame is the pose it leaves), 'quick' (a short fade: out of a sheet, or into
  // the jump crouch) or 'fade' (the ordinary pose crossfade).
  LW.petSwap=(a,b,walkA,walkB)=>{
    const sa=!!(a&&a.petName),sb=!!(b&&b.petName);
    // a gait-cycle frame is a walking pose: cycle ↔ cycle / walk1 / walk2 are gait cuts
    walkA=walkA||!!(a&&a.petCycle);walkB=walkB||!!(b&&b.petCycle);
    if(walkA&&walkB||sa&&sb)return 'cut';
    if(sb)return b.petName.startsWith('jump-')?'quick':'cut';
    return sa?'quick':'fade';
  };
  // jump frames for a hop's phases: 'crouch' → 1, 'air' (u 0…1) → 2-4, 'land' → 5
  LW.petJumpFrame=(ph,u)=>'jump-'+(ph==='crouch'?1:ph==='land'?5:u<.36?2:u<.64?3:4);
  // ---- drawn gait cycles: art/sprites/<set>/cycle/walk-1..8.png, run-1..6.png ------------
  // One full stride each (walk: R contact, down, passing, up, L contact, down, passing, up;
  // run: one gallop/trot stride), facing right, frame 1 ≈ walk1. The frame shown is chosen
  // by DISTANCE travelled (LW.petGaitFrame), so planted paws stay put on the ground.
  LW.PET_CYCLE_N={walk:8,run:6};
  // Which sets have which cycles (update when a sheet ships; a missing one keeps walk1/walk2).
  LW.PET_CYCLE_HAS={'cats/orange':['walk','run'],'cats/black':['walk','run'],'cats/grey':['walk','run'],'cats/calico':['walk','run'],'cats/siamese':['walk','run'],
    'dogs/golden':['walk','run'],'dogs/corgi':['walk','run'],'pandas/mei':['walk'],'pandas/bao':['walk'],'pandas/cub':['walk']};
  // Optional views, independent of the side cycles. Add any species here when art ships.
  LW.PET_DIRECTION_HAS=Object.fromEntries(['orange','black','grey','calico','siamese'].map(c=>
    ['cats/'+c,{f:['walk'],b:['walk']} ]));
  // Generated by art-src/cycles/plant-directions.py: art padding is not animal height.
  LW.PET_DIRECTION_LAYOUT={"cats/orange":{"walk-f":{"height":203.5,"pad":74,"stride":0.5,"centers":[125.855231,133.446875,131.859575,125.900473,126.321337,127.546542,125.544051,128.403358]},"walk-b":{"height":249.0,"pad":90,"stride":0.5,"centers":[140.281837,136.162555,137.295273,135.323423,141.12212,137.07505,143.165849,135.076982]}},"cats/black":{"walk-f":{"height":219.5,"pad":80,"stride":0.5,"centers":[122.23372,122.017213,122.860252,114.504711,115.824623,122.666147,122.399561,117.73905]},"walk-b":{"height":243.5,"pad":88,"stride":0.5,"centers":[135.731625,135.098235,141.850652,142.953653,134.6482,138.820491,138.92437,141.732737]}},"cats/grey":{"walk-f":{"height":202.5,"pad":73,"stride":0.5,"centers":[126.667122,122.027385,125.632306,124.534542,130.943286,128.77372,124.074392,129.195017]},"walk-b":{"height":250.0,"pad":90,"stride":0.5,"centers":[134.869918,127.853738,132.898743,131.934896,130.632925,128.589657,130.472567,127.599807]}},"cats/calico":{"walk-f":{"height":240.5,"pad":87,"stride":0.5,"centers":[123.996021,124.578636,130.65482,126.805326,122.764138,126.293375,128.357197,121.722124]},"walk-b":{"height":247.5,"pad":90,"stride":0.5,"centers":[130.647401,136.668769,134.945338,129.120771,134.593448,137.357612,124.78126,132.391053]}},"cats/siamese":{"walk-f":{"height":201.5,"pad":73,"stride":0.5,"centers":[125.84418,128.110951,125.237609,127.240657,126.870534,125.911495,126.218813,124.577288]},"walk-b":{"height":227.0,"pad":82,"stride":0.5,"centers":[130.246487,128.036265,129.648686,126.848674,129.806656,129.022704,125.342184,120.559482]}}};
  const cycleKey=(g,d)=>g+(d&&d!=='side'?'-'+d:'');
  // Enter depth views above 16 degrees, leave below 10. Vertical travel retains the last horizontal
  // facing. Commit orientation only on a contact frame, retaining the gait phase.
  LW.petDirection=(o,vx,vy,phase=0,gait='walk')=>{
    const s=o._petDirection||(o._petDirection={view:'side',face:o.dir||1});
    if(Math.hypot(vx,vy)<1e-6)return s;
    const angle=Math.atan2(Math.abs(vy),Math.abs(vx))*180/Math.PI;
    // screen angle of a ground-plane heading; depth is foreshortened on screen, so a modest slope already
    // means the animal is walking well toward/away from the camera
    const view=angle>(s.view==='side'?16:10)?(vy>0?'f':'b'):'side';
    const face=Math.abs(vx)>1e-4?Math.sign(vx):s.face;
    const n=LW.PET_CYCLE_N[gait]||8,k=Math.floor(phase*n+1e-6)%n;
    if(k===0||(gait==='walk'&&k===4)){s.view=view;s.face=face;}
    return s;
  };
  // Jumps use the walk classifier at takeoff, then lock orientation until landing.
  // vy is ground-plane depth, excluding the height of a supporting ledge.
  LW.petJumpDirection=(o,vx,vy)=>({...LW.petDirection(o,vx,vy,0,'walk')});
  LW.petJumpKey=(view,has)=>view!=='side'&&has('jump-'+view)?'jump-'+view:has('jump')?'jump':null;
  LW.petJumpLand=(o)=>{
    o._gait={ph:0,g:'walk',d:o.gd||0,side:0,settled:true,off:0,offH:0,shift:[0,0]};
  };
  LW.PET_JUMP_LAYOUT={"cats/orange":{"jump-f":{"height":203.5,"pad":12,"centers":[146.1119,144.6556,159.9629,160.294,161.6175]},"jump-b":{"height":249.0,"pad":12,"centers":[190.4704,193.8911,195.8649,175.7818,187.4711]}},"cats/black":{"jump-f":{"height":219.5,"pad":12,"centers":[184.7742,175.7275,181.8646,190.7146,176.4315]},"jump-b":{"height":243.5,"pad":12,"centers":[182.1016,177.7433,174.5016,179.3497,189.2808]}},"cats/grey":{"jump-f":{"height":202.5,"pad":12,"centers":[162.6967,158.9668,195.6693,174.8666,167.8528]},"jump-b":{"height":250.0,"pad":12,"centers":[189.4919,169.0443,172.4323,195.7374,188.1707]}},"cats/calico":{"jump-f":{"height":240.5,"pad":12,"centers":[183.8124,187.0324,211.232,210.2821,190.4226]},"jump-b":{"height":247.5,"pad":12,"centers":[152.3353,157.2481,167.6326,164.6159,157.6567]}},"cats/siamese":{"jump-f":{"height":201.5,"pad":12,"centers":[156.2092,177.2506,177.9185,158.9953,163.0716]},"jump-b":{"height":227.0,"pad":12,"centers":[158.8757,152.5016,169.6575,161.0279,161.0683]}}};
  // Ground covered by one full cycle, in walking heights (the drawn walk1 height); tuned per
  // set by eye against the planted paw (docs/scene-polish.md). Defaults for unknown sets.
  // (walk = stance sweep of the drawn paws ÷ .6 duty, art-src/cycles/stride.py; run ≈ 1.6)
  LW.PET_STRIDE={'cats/orange':{walk:.82,run:1.6},'cats/black':{walk:.78,run:1.7},'cats/grey':{walk:.84,run:1.6},'cats/calico':{walk:.9,run:1.6},
    'cats/siamese':{walk:.87,run:1.6},'dogs/golden':{walk:.81,run:1.6},'dogs/corgi':{walk:.81,run:1.5},'pandas/mei':{walk:.86},'pandas/bao':{walk:.81},'pandas/cub':{walk:.7}};
  const STRIDE_DEF={walk:.85,run:1.6};
  // Load a set's cycles (base = 'art/sprites/', set = 'cats/orange'). A cycle counts once all
  // of its frames load; done(C) fires when every listed cycle has loaded or failed.
  LW.petCycleLoad=(base,set,done)=>{
    const gs=[...(LW.PET_CYCLE_HAS[set]||[])];
    for(const [d,gaits] of Object.entries(LW.PET_DIRECTION_HAS[set]||{}))for(const g of gaits)gs.push(cycleKey(g,d));
    const C={set,raw:{},img:{},cyc:{},has:g=>!!C.cyc[g],left:gs.length,ready:!gs.length};
    const fin=()=>{if(--C.left===0&&done)done(C);};
    if(!C.left&&done)setTimeout(()=>done(C),0);
    for(const g of gs){
      const N=LW.PET_CYCLE_N[g.split('-')[0]],ims=[];let n=0,bad=false;
      for(let i=1;i<=N;i++){
        const im=new Image();
        im.onload=()=>{if(bad)return;if(!(im.naturalWidth>0)){bad=true;fin();return;}if(++n===N){C.raw[g]=ims;fin();}};
        im.onerror=()=>{if(!bad){bad=true;fin();}};
        im.src=base+set+'/cycle/'+g+'-'+i+'.png';ims.push(im);
      }
    }
    return C;
  };
  // Alpha measurements of one image (browser only): size, opaque top/bottom rows and the
  // x-centroid of the torso band (30–65 % of the opaque height — below the ears, above
  // the swinging legs; the thin tail barely moves it). Used to pin the body in place.
  LW.petCycleMeasure=im=>{
    const [w,h]=dims(im),cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
    let a;try{a=g.getImageData(0,0,w,h).data;}catch(e){return {w,h,cx:w/2,top:0,bot:h-1};}
    let top=h,bot=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(a[(y*w+x)*4+3]>127){if(y<top)top=y;bot=y;break;}
    if(bot<0)return {w,h,cx:w/2,top:0,bot:h-1};
    const y0=Math.round(top+(bot-top)*.3),y1=Math.round(top+(bot-top)*.65);let sx=0,n=0;
    for(let y=y0;y<=y1;y++)for(let x=0;x<w;x++)if(a[(y*w+x)*4+3]>127){sx+=x;n++;}
    return {w,h,cx:n?sx/n:w/2,top,bot};
  };
  // ---- paw planting --------------------------------------------------------------------
  // A sprite that glides with the pet drags its grounded paws along the floor. Instead the
  // sprite holds still in the world while a cycle frame shows and steps forward at each
  // frame change; the installed cycle frames are drawn so that their grounded paws slide
  // back by exactly that step relative to the body (art-src/cycles/plant.py detects each
  // frame's grounded paws, hind/fore, and bends the legs about the hip to plant them; QA in
  // art-src/cycles/plant/*.json). So a paw stays put in the world for its whole stance and
  // the body walks over it, handing off to the next paw at its contact frame. Net travel per
  // cycle = the stride, so the average speed is the pet's own.
  // Cumulative body position at the start of each frame (X[0] = 0 … X[n] = S) for a stride
  // of S. m = optional per-cut steps (null / missing = even); scaled to sum to S.
  LW.petPlantSteps=(n,S,m)=>{
    const d=[];let t=0;
    for(let i=0;i<n;i++){const v=m&&m[i]>0?m[i]:1;d.push(v);t+=v;}
    const X=[0];for(let i=0;i<n;i++)X.push(X[i]+d[i]*S/t);
    X[n]=S;return X;
  };
  // Sprite offset along the travel direction (image px, + = ahead of the pet's own position)
  // at cycle phase ph ∈ [0,1): the frame holds still in the world while the pet's position
  // runs on, then steps at the next cut. 0 at phase 0 (= walk1); within (−1 step, 0] when even.
  LW.petPlantOffset=(X,ph,n)=>{
    const S=X[n],k=Math.floor(ph*n+1e-6)%n;
    return X[k]-ph*S;
  };
  // The pure layout maths (tested). ms = per-frame measures, ref = walk1's {w,h,cx,k,fa}
  // (k = its pose scale, fa = the scene's anchor for it as a fraction of width).
  //  · one size for the whole cycle (no scale pops): the median frame is as tall as walk1;
  //  · the anchor sits at the same torso point as walk1's anchor, from each frame's torso
  //    centroid smoothed round the loop, so the body does not jitter frame to frame.
  LW.petCycleLayout=(ms,ref)=>{
    const n=ms.length,hs=ms.map(m=>m.bot-m.top+1).sort((a,b)=>a-b),med=hs[n>>1];
    const k=(ref.bot-ref.top+1)*ref.k/med,off=(ref.fa*ref.w-ref.cx)*ref.k/k;
    let c=ms.map(m=>m.cx);
    for(let pass=0;pass<2;pass++)c=c.map((v,i)=>(c[(i+n-1)%n]+2*v+c[(i+1)%n])/4);
    return ms.map((m,i)=>({k,fa:(c[i]+off)/m.w}));
  };
  // Lay the loaded cycles out against walk1 (ref = {im, k, fa}); prep(im) → drawable (e.g. a
  // de-fringed canvas). Frames get petK / petFa / petName / petCycle and land in C.img.
  // Call every frame (cheap once done); returns true once every loaded cycle is laid out.
  LW.petCyclePrep=(C,ref,prep=im=>im)=>{
    if(!C||C.ready)return !!C;
    if(!ref||!ref.im)return false;
    for(const g in C.raw){
      const ims=C.raw[g];delete C.raw[g];
      const R=Object.assign(LW.petCycleMeasure(ref.im),{k:ref.k||1,fa:ref.fa==null?.5:ref.fa});
      const geometry=(LW.PET_DIRECTION_LAYOUT[C.set]||{})[g];
      const ms=ims.map(LW.petCycleMeasure);
      if(geometry)ms.forEach((m,i)=>{m.top=geometry.pad;m.bot=geometry.pad+geometry.height-1;if(geometry.centers)m.cx=geometry.centers[i]+geometry.pad;});
      const L=LW.petCycleLayout(ms,R);
      // petFa0 = the torso-pinned anchor; petFa is re-set per pet by LW.petGait (paw planting)
      ims.forEach((im,i)=>{const p=g+'-'+(i+1),d=prep(im);d.petK=L[i].k;d.petFa=d.petFa0=L[i].fa;d.petW0=dims(im)[0];d.petName=p;d.petCycle=g;d.petNear='walk1';d.petFootPad=geometry?geometry.pad:0;C.img[p]=d;});
      C.plant=C.plant||{};C.plant[g]={n:ims.length,H:ms.map(m=>m.bot-m.top+1).sort((a,b)=>a-b)[ims.length>>1]};
      C.cyc[g]=true;
    }
    if(C.left<=0&&!Object.keys(C.raw).length)C.ready=true;
    return C.ready;
  };
  // Phase of a cycle from distance (tested). o = the pet (state in o._gait), dist = its
  // running distance travelled (any units, never reset), stride = distance one full cycle
  // covers in those units, gait 'walk' | 'run'. Returns the frame name ('walk-3').
  //  · moving: the phase advances by distance ÷ stride, so the paws stay planted;
  //  · stopped (dist unchanged): it settles on the nearest contact frame (walk-1 / walk-5,
  //    run-1) — stepping forward through the frames at opt.settle cycles/s when opt.dt is
  //    given, otherwise at once — instead of freezing mid-stride; o._gait.settled says so;
  //  · walk ↔ run keeps the stride's progress: half a walk cycle (one step) maps onto a whole
  //    run cycle, so the legs carry on from where they were.
  LW.petGaitFrame=(o,dist,stride,gait='walk',opt={})=>{
    const N=LW.PET_CYCLE_N[gait]||8,s=o._gait||(o._gait={ph:0,g:gait,d:dist,side:0,settled:true});
    let dd=Math.abs(dist-s.d);s.d=dist;
    if(!(dd<stride*.5))dd=0;   // a teleport / reset counter is not a stride
    if(gait!==s.g){
      if(s.g==='walk'&&gait==='run'){s.side=s.ph>=.5?.5:0;s.ph=(s.ph-s.side)*2;}
      else if(s.g==='run'&&gait==='walk')s.ph=s.side+s.ph*.5;
      s.g=gait;
    }
    const step=1/N,cs=gait==='walk'?[0,.5,1]:[0,1];
    s.moving=dd>1e-9;
    if(s.moving){s.ph=(s.ph+dd/stride)%1;s.settled=false;}
    else if(!s.settled){
      // the nearest contact; the one just behind only when less than half a frame back
      let t=cs.find(c=>c>=s.ph-1e-9);const back=cs.filter(c=>c<=s.ph+1e-9).pop();
      if(s.ph-back<step*.5)t=back;
      if(opt.dt>0&&t>s.ph)s.ph=Math.min(t,s.ph+opt.dt*(opt.settle||2.2));else s.ph=t;
      if(Math.abs(s.ph-t)<1e-9){s.ph=t%1;s.settled=true;}
    }
    return gait+'-'+(Math.floor(s.ph*N+1e-6)%N+1);
  };
  // Scene helper: the cycle frame for a pet on its feet, or null (→ keep the scene's own
  // walk1/walk2). C = LW.petCycleLoad result (laid out), dist = distance in the units where
  // walk1 is h tall, gait 'walk' | 'run' (a run without a run sheet strides out the walk).
  // Once a stopped pet has settled on frame 1 it returns 'walk1' (the scene's own standing pose,
  // which frame 1 matches); null only when the set has no cycle at all.
  // Paw planting (on by default; opt.plant === false turns it off): o._gait.off is the
  // sprite's offset along its travel in walking heights (+ = ahead), LW.petGaitShift(o, h)
  // the same in scene units. Scenes that read the returned frame's im.petFa when they draw
  // get it for free: petFa is re-set to petFa0 − offset / width for this pet on every call
  // (each pet owns its set's frames). Scenes that cache anchors use petFa0 + LW.petGaitShift.
  // opt.vx/vy opts into directional views and 2D planting: draw using the owner's
  // _gait.shift [x,y] in local scene units; the image anchor stays at petFa0.
  // Directional sheets use the same contact indices and retain phase on a turn.
  LW.petGait=(o,C,dist,h,gait='walk',opt={})=>{
    if(!C||!C.cyc)return null;
    const vector=Number.isFinite(opt.vx)&&Number.isFinite(opt.vy);
    const choose=view=>{
      if(view!=='side'&&C.has(cycleKey(gait,view)))return {g:gait,key:cycleKey(gait,view)};
      if(view!=='side'&&C.has(cycleKey('walk',view)))return {g:'walk',key:cycleKey('walk',view)};
      const g=C.has(gait)?gait:C.has('walk')?'walk':null;
      return {g,key:g};
    };
    let view=vector&&o._petDirection?o._petDirection.view:'side';
    let {g,key}=choose(view);if(!g)return null;
    const st=LW.PET_STRIDE[C.set]||{};
    const strideFor=g=>{
      const key=cycleKey(g,view),geometry=C.has(key)&&(LW.PET_DIRECTION_LAYOUT[C.set]||{})[key];
      return (geometry&&geometry.stride||st[g]||STRIDE_DEF[g])*(g===gait||vector?1:1.3);
    };
    LW.petGaitFrame(o,dist,strideFor(g)*h,g,opt);
    const s=o._gait;
    const direction=vector?LW.petDirection(o,opt.vx,opt.vy,s.ph,g):null;
    if(direction){
      view=direction.view;
      const next=choose(view);
      if(next.g!==g){
        if(g==='run'){s.ph=s.side+s.ph*.5;}else{s.side=s.ph>=.5?.5:0;s.ph=(s.ph-s.side)*2;}
        g=s.g=next.g;
      }
      key=next.key;
    }
    const sw=strideFor(g),N=LW.PET_CYCLE_N[g],f=key+'-'+(Math.floor(s.ph*N+1e-6)%N+1),P=C.plant&&C.plant[key];
    let off=0;
    if(P&&opt.plant!==false){
      const S=sw*P.H,X=P.X&&P.S===S?P.X:(P.S=S,P.X=LW.petPlantSteps(P.n,S));
      const target=LW.petPlantOffset(X,s.ph,P.n)/P.H;   // walking heights
      // moving: hold-and-step; settling onto a contact without travelling: the feet shuffle in
      // place (offset held); settled: ease back onto the pet's own position (0 at a contact)
      if(s.off==null||s.moving)s.off=target;
      else if(s.settled){const r=opt.dt>0?Math.min(1,opt.dt*10):1;s.off+=(target-s.off)*r;if(Math.abs(target-s.off)<.004)s.off=target;}
      off=s.off;
      const im=C.img[f];if(im&&im.petFa0!=null)im.petFa=im.petFa0-(vector?0:off)*P.H/(im.petW0||im.naturalWidth||im.width);
    }else s.off=0;
    s.offH=off;
    if(vector){
      const len=Math.hypot(opt.vx,opt.vy);
      if(len>1e-6)s.vector=[opt.vx/len,opt.vy/len];
      s.shift=(s.vector||[direction.face,0]).map(v=>v*off*h);
    }
    return view==='side'&&s.settled&&s.ph===0&&Math.abs(off)<.004?'walk1':f;
  };
  LW.petGaitShift=(o,h)=>(o&&o._gait&&o._gait.offH||0)*h;
  // Premultiplied blending on a small isolated canvas: ordinary source-over
  // fades darken the overlapping fur and expose the background through it.
  // All frames share the animal's ground anchor and follow its live position.
  LW.petComposite=(g,owner,frames)=>{
    const fs=frames.filter(f=>f.image&&f.alpha>.001);
    if(!fs.length)return;
    if(fs.length===1&&fs[0].alpha>.999){const f=fs[0];g.drawImage(f.image,f.x,f.y,f.w,f.h);return;}
    const x=Math.floor(Math.min(...fs.map(f=>f.x)))-2,y=Math.floor(Math.min(...fs.map(f=>f.y)))-2;
    const w=Math.ceil(Math.max(...fs.map(f=>f.x+f.w))-x)+2,h=Math.ceil(Math.max(...fs.map(f=>f.y+f.h))-y)+2;
    const c=owner._poseCanvas||(owner._poseCanvas=document.createElement('canvas'));
    const resolution=2,cw=Math.ceil(w*resolution),ch=Math.ceil(h*resolution);
    if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
    const b=c.getContext('2d');b.setTransform(resolution,0,0,resolution,-x*resolution,-y*resolution);b.clearRect(x,y,w,h);
    b.globalCompositeOperation='lighter';
    for(const f of fs){b.globalAlpha=f.alpha;b.drawImage(f.image,f.x,f.y,f.w,f.h);}
    b.globalAlpha=1;b.globalCompositeOperation='source-over';g.drawImage(c,x,y,w,h);
  };
})();
