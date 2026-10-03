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
  for(const id of ['golden','corgi'])LW.PET_DIRECTION_HAS['dogs/'+id]={f:['walk'],b:['walk']};
  // Generated by art-src/cycles/plant-directions.py: art padding is not animal height.
  LW.PET_DIRECTION_LAYOUT={"cats/orange":{"walk-f":{"height":155.0,"pad":93,"stride":0.5,"centers":[103.48377581120944,97.0381679389313,94.21141222016496,97.92992676431425,101.99591381872214,100.97142368240931,106.24480076202572,102.01033591731266]},"walk-b":{"height":164.0,"pad":99,"stride":0.5,"centers":[92.7365845959596,90.47813559322034,90.75560859188545,88.92016034741941,92.68284257279157,93.87553648068669,96.38554871423398,91.42447872520766]},"walk":{"height":149.0,"pad":90,"stride":0.82,"centers":[130.6277615673197,132.70582745748652,132.20562427317898,132.13137378845343,132.69081922389316,132.93820879703233,138.102153784219,142.76825870646766]},"run":{"height":140.5,"pad":85,"stride":1.6,"centers":[163.65860812372233,163.79342723004694,178.700159172304,170.6028838659392,158.74886664148093,153.95230372984832]}},"cats/black":{"walk-f":{"height":155.5,"pad":94,"stride":0.5,"centers":[106.35849339735894,102.29781044250498,99.4187923797223,101.39426924923964,105.94830630919891,102.02879581151832,107.84574546527061,106.56786620875019]},"walk-b":{"height":170.0,"pad":102,"stride":0.5,"centers":[95.42442124375852,93.42690427377386,93.96268318477111,93.34832152756391,94.4030580075662,95.27689399905496,98.29970984809694,94.36200317965024]},"walk":{"height":151.5,"pad":91,"stride":0.78,"centers":[127.88760625459125,133.6251923274182,131.21890119342007,130.37425847457627,132.69942013705852,131.22550675675674,137.16496306041898,141.81514015001974]},"run":{"height":144.5,"pad":87,"stride":1.7,"centers":[160.7222512632863,158.6223841554559,177.91096901131334,167.19717081678132,155.80633905205002,154.61911344576538]}},"cats/grey":{"walk-f":{"height":157.0,"pad":95,"stride":0.5,"centers":[106.28557099871041,102.21119827718813,99.99498353973978,99.86108013382189,101.7325327510917,103.22825730226452,108.11030413073082,106.36416704086214]},"walk-b":{"height":167.0,"pad":101,"stride":0.5,"centers":[94.16253529965485,90.06876323936777,90.89993706733794,89.60530652603823,92.0407971128197,92.8943192637258,96.06617266930898,92.57427385892116]},"walk":{"height":152.5,"pad":92,"stride":0.84,"centers":[131.73931755302797,134.04929504991253,133.23873312564902,133.36201903185767,133.05041493775934,132.60105666632134,137.24248176641024,139.69609775325188]},"run":{"height":143.0,"pad":86,"stride":1.6,"centers":[161.9180724976209,166.45426997245178,180.88564616118265,171.1071394437542,157.9046979865772,153.2194128787879]}},"cats/calico":{"walk-f":{"height":158.5,"pad":96,"stride":0.5,"centers":[102.095952023988,100.65635632539437,97.59325729620933,99.45205479452055,102.2481426448737,100.43280405958421,108.02216932004166,106.00933172787478]},"walk-b":{"height":167.0,"pad":101,"stride":0.5,"centers":[99.87061331584125,99.99851067350653,96.30177608626705,96.1328437917223,98.16443691786621,96.81919567421426,98.74419468697752,97.02404978136562]},"walk":{"height":148.0,"pad":89,"stride":0.9,"centers":[140.42402116402116,136.29306370494552,132.27055561480216,132.49748138414367,134.56805423154327,135.0732596803604,136.69804691536632,138.61111680853247]},"run":{"height":145.0,"pad":87,"stride":1.6,"centers":[148.96331138287866,151.37220187220188,167.09307404326123,161.46962162162163,157.04946466809423,166.28449061417896]}},"cats/siamese":{"walk-f":{"height":156.0,"pad":94,"stride":0.5,"centers":[102.95381406436233,98.34497615017695,94.94970563498738,94.72010008340284,101.82288026485195,97.49552137907723,104.3836784409257,103.54946704698995]},"walk-b":{"height":167.0,"pad":101,"stride":0.5,"centers":[91.06686930091185,90.69279326670174,92.94123589829938,91.55105456980247,94.86731937879811,93.53961237674261,97.1419451746151,93.34987080103359]},"walk":{"height":153.0,"pad":92,"stride":0.87,"centers":[134.63408772281193,140.53031480761757,137.62039861704292,138.68540829986614,137.53452453058753,129.97864467702718,134.0335591133005,144.24443580522887]},"run":{"height":144.5,"pad":87,"stride":1.6,"centers":[181.52093789209536,174.61361397223467,183.9212541013489,166.31906180193596,160.22026662019692,143.98025009924572]}},"dogs/golden":{"walk-f":{"height":180.0,"pad":108,"stride":0.5,"centers":[84.34279403644395,84.95566006046356,86.83895427795383,93.44292237442923,90.53548463919981,83.76005961251863,95.70100159344412,92.95977267662136]},"walk-b":{"height":182.0,"pad":110,"stride":0.5,"centers":[81.10902769154353,80.46323710831483,81.00075805432722,86.66025262660843,83.7617643287601,82.71610431343468,82.34606144898217,81.71190388623269]},"walk":{"height":172.0,"pad":104,"stride":0.81,"centers":[93.57952069716775,92.92886473429952,92.20006930807439,93.52256605325383,94.15023321401453,96.15553393860787,97.82683005482103,104.87674136886736]},"run":{"height":186.0,"pad":112,"stride":1.6,"centers":[131.972787542399,118.37058719176868,121.94335889191194,125.12476866132018,126.40844960025082,129.4134346881787]}},"dogs/corgi":{"walk-f":{"height":143.0,"pad":86,"stride":0.5,"centers":[98.41836492890995,89.69352428393525,85.41369236631526,83.2982478255389,79.5387980954832,81.88073278584966,84.18197323537129,77.71859799713877]},"walk-b":{"height":187.5,"pad":113,"stride":0.5,"centers":[76.03604060913706,96.13080399945213,82.75223880597015,75.60231712245722,94.12630296466766,76.75140562248995,81.4638839951213,93.20446194225721]},"walk":{"height":181.5,"pad":109,"stride":0.81,"centers":[140.3621766280107,137.45533464015682,138.31790452212647,133.4539685459395,139.15500759403199,127.96388700126201,136.39689475641504,131.61282705204496]},"run":{"height":171.0,"pad":103,"stride":1.5,"centers":[155.58400664502,157.2240842710079,164.4086528461485,159.84893067317353,160.45391304347825,147.78853407090773]}}};
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
  LW.PET_JUMP_LAYOUT={"cats/orange":{"jump-f":{"height":155.0,"pad":12,"centers":[170.57457109777917,173.59784560143626,194.83838245373545,172.59157835505954,203.09241228806445]},"jump-b":{"height":164.0,"pad":12,"centers":[122.04708413001912,128.39442691903258,146.14274164570608,126.85637740244613,138.2732375392905]},"jump":{"height":149.0,"pad":12,"centers":[163.8935024530334,180.69558373414955,195.85111443925646,201.95147140477513,163.40395061728395]}},"cats/black":{"jump-f":{"height":155.5,"pad":12,"centers":[171.31271406331084,174.14332185227707,198.51091732126216,174.97160912171444,200.40788476118271]},"jump-b":{"height":170.0,"pad":12,"centers":[127.63834208223972,131.43774391377067,150.98299101412067,129.0837912087912,142.8035140562249]},"jump":{"height":151.5,"pad":12,"centers":[162.83163028332558,179.21231696813092,192.62180289751387,200.8171582976807,161.43771339381524]}},"cats/grey":{"jump-f":{"height":157.0,"pad":12,"centers":[178.3828474778629,178.17566250974278,192.01196723409703,178.61214179949482,207.2665328985871]},"jump-b":{"height":167.0,"pad":12,"centers":[122.35260718424102,127.95828670261471,146.49433007676203,126.53006912442396,136.6961012995668]},"jump":{"height":152.5,"pad":12,"centers":[172.3285495179667,186.03589743589743,154.46522518931846,148.38218423124508,156.15394736842106]}},"cats/calico":{"jump-f":{"height":158.5,"pad":12,"centers":[180.14702570838807,182.16324189005945,198.55810261620522,181.12249346120313,214.6834489761381]},"jump-b":{"height":167.0,"pad":12,"centers":[124.94068592905802,128.83951427633738,149.33947206875385,128.37185635746872,141.7896790013375]},"jump":{"height":148.0,"pad":12,"centers":[155.1791953414505,161.5341160619767,175.9673098751419,182.04444215302124,166.18549033070144]}},"cats/siamese":{"jump-f":{"height":156.0,"pad":12,"centers":[175.26905876235048,179.614608801956,200.850688740048,178.61879918648864,207.95902331868874]},"jump-b":{"height":167.0,"pad":12,"centers":[126.64281690140845,133.4123127160968,146.37944078947368,128.7769958467928,142.84369730185497]},"jump":{"height":153.0,"pad":12,"centers":[179.40132970686008,201.1244710345834,211.5317099483702,232.44774294944557,170.17958515283843]}},"dogs/golden":{"jump-f":{"height":180.0,"pad":12,"centers":[103.67798824297844,122.2264483627204,157.96500495212942,118.22014260249554,116.38224596499204]},"jump-b":{"height":182.0,"pad":12,"centers":[105.1054297540784,110.99225710649131,143.28191791185927,113.50757174626708,112.55571343990528]},"jump":{"height":172.0,"pad":12,"centers":[116.55812492145282,117.13736263736264,155.65268948655256,131.29662354054906,119.74765520321571]}},"dogs/corgi":{"jump-f":{"height":143.0,"pad":12,"centers":[95.84020291693088,137.28179775280898,157.46636191133345,138.18986254295532,105.33767587285044]},"jump-b":{"height":187.5,"pad":12,"centers":[114.57469108561341,126.53815190759538,149.92033578893268,119.05539797908172,112.39289191820838]},"jump":{"height":181.5,"pad":12,"centers":[138.77988648456898,169.11815725863784,200.83171521035598,182.72758673626035,146.22746890073623]}}};
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
