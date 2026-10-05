/* Shared scale and pose composition for illustrated scene pets. */
(() => {
  'use strict';
  // PNG exceptions did not meet the release size/quality gate. See art/sprites/formats.json.
  const PET_ART_PNG=new Set([]);
  LW.petArtPath=(base,set,name)=>base+set+'/'+name+(PET_ART_PNG.has(set+'/'+name)?'.png':'.webp');
  const clamp=t=>Math.max(0,Math.min(1,t));
  const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  const name=p=>typeof p==='string'?p:((p&&p.src||'').split('/').pop()||'').replace(/\.(?:png|webp).*$/,'');
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
  // Drawn in-between frames (art/sprites/<kind>/<name>/t/<seq>-1..5.webp). Returns the
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
  // Which animals have sheets (art/sprites/<set>/t/<seq>-1..5.webp). Update when a sheet ships.
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
        im.src=LW.petArtPath(base,set,'t/'+q+'-'+i);ims.push(im);
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
  // ---- drawn gait cycles: art/sprites/<set>/cycle/walk-1..8.webp, run-1..6.webp ------------
  // One full stride each (walk: R contact, down, passing, up, L contact, down, passing, up;
  // run: one gallop/trot stride), facing right, frame 1 ≈ walk1. The frame shown is chosen
  // by DISTANCE travelled (LW.petGaitFrame), so planted paws stay put on the ground.
  LW.PET_CYCLE_N={walk:8,run:6,stalk:6};
  // Which sets have which cycles (update when a sheet ships; a missing one keeps walk1/walk2).
  LW.PET_CYCLE_HAS={'cats/orange':['walk','run'],'cats/black':['walk','run'],'cats/grey':['walk','run'],'cats/calico':['walk','run'],'cats/siamese':['walk','run'],
    'dogs/golden':['walk','run'],'dogs/corgi':['walk','run'],'pandas/mei':['walk'],'pandas/bao':['walk'],'pandas/cub':['walk']};
  // Optional views, independent of the side cycles. Add any species here when art ships.
  LW.PET_DIRECTION_HAS=Object.fromEntries(['orange','black','grey','calico','siamese'].map(c=>
    ['cats/'+c,{f:['walk'],b:['walk']} ]));
  for(const id of ['golden','corgi'])LW.PET_DIRECTION_HAS['dogs/'+id]={f:['walk'],b:['walk']};
  for(const set of Object.keys(LW.PET_DIRECTION_HAS)){const gs=['walk','run'];if(set.startsWith('cats/')){gs.push('stalk');LW.PET_CYCLE_HAS[set].push('stalk');}LW.PET_DIRECTION_HAS[set]={f:gs,b:gs};}
  // Generated by art-src/cycles/plant-directions.py: art padding is not animal height.
  LW.PET_DIRECTION_LAYOUT={"cats/orange":{"walk-f":{"height":155.0,"pad":93,"stride":0.5,"centers":[103.48377581120944,97.0381679389313,94.21141222016496,97.92992676431425,101.99591381872214,100.97142368240931,106.24480076202572,102.01033591731266]},"walk-b":{"height":164.0,"pad":99,"stride":0.5,"centers":[92.7365845959596,90.47813559322034,90.75560859188545,88.92016034741941,92.68284257279157,93.87553648068669,96.38554871423398,91.42447872520766]},"walk":{"height":149.0,"pad":90,"stride":0.82,"centers":[130.6277615673197,132.70582745748652,132.20562427317898,132.13137378845343,132.69081922389316,132.93820879703233,138.102153784219,142.76825870646766]},"run":{"height":140.5,"pad":85,"stride":1.6,"centers":[163.65860812372233,163.79342723004694,178.700159172304,170.6028838659392,158.74886664148093,153.95230372984832]},"run-f":{"height":154.0,"pad":93,"stride":0.95,"centers":[116.38539445628997,132.41496201052016,133.34612294094015,126.3703972868217,123.8923802946593,123.39019867549669]},"run-b":{"height":175.5,"pad":106,"stride":0.95,"centers":[105.42877585534019,117.70942662779397,121.00310692093421,106.64108461445346,114.18305382001535,105.26787284834778]},"stalk":{"height":130.76923076923077,"pad":62,"stride":0.27299999999999996,"centers":[131.9975265531791,122.64258938869665,123.90725806451613,116.81028794241152,123.11570709893796,124.59335589049523]},"stalk-f":{"height":173.07692307692307,"pad":81,"stride":0.27299999999999996,"centers":[131.7354186586532,142.01569476390205,135.88089297439265,137.21399466067163,144.59242298084928,148.78850935741394]},"stalk-b":{"height":203.2051282051282,"pad":96,"stride":0.27299999999999996,"centers":[112.27347278345614,116.97741793346552,114.00450346420324,115.41285023067402,116.15047328908715,111.17296918767506]}},"cats/black":{"walk-f":{"height":155.5,"pad":94,"stride":0.5,"centers":[106.35849339735894,102.29781044250498,99.4187923797223,101.39426924923964,105.94830630919891,102.02879581151832,107.84574546527061,106.56786620875019]},"walk-b":{"height":170.0,"pad":102,"stride":0.5,"centers":[95.42442124375852,93.42690427377386,93.96268318477111,93.34832152756391,94.4030580075662,95.27689399905496,98.29970984809694,94.36200317965024]},"walk":{"height":151.5,"pad":91,"stride":0.78,"centers":[127.88760625459125,133.6251923274182,131.21890119342007,130.37425847457627,132.69942013705852,131.22550675675674,137.16496306041898,141.81514015001974]},"run":{"height":144.5,"pad":87,"stride":1.7,"centers":[160.7222512632863,158.6223841554559,177.91096901131334,167.19717081678132,155.80633905205002,154.61911344576538]},"run-f":{"height":157.0,"pad":95,"stride":0.95,"centers":[114.23916428756813,132.36631139944393,134.71208073612348,126.80429678328247,124.27211351413206,125.30252100840336]},"run-b":{"height":176.5,"pad":106,"stride":0.95,"centers":[107.4538053533983,119.49082858950031,121.40122414520894,107.50303171641791,115.06150583244963,104.75708802773308]},"stalk":{"height":133.33333333333334,"pad":63,"stride":0.27299999999999996,"centers":[132.58343949044587,122.67531150391191,124.31671888350897,117.59609859367912,124.60535207460468,124.20491924729589]},"stalk-f":{"height":172.43589743589743,"pad":81,"stride":0.27299999999999996,"centers":[131.9946857977946,140.72412409735225,135.304110301769,135.42373113854595,142.57439446366783,148.21540839989694]},"stalk-b":{"height":205.1282051282051,"pad":96,"stride":0.27299999999999996,"centers":[112.98002754820936,116.13536878966951,114.60192544497929,116.06776715899218,116.47155704843428,111.35880022637238]}},"cats/grey":{"walk-f":{"height":157.0,"pad":95,"stride":0.5,"centers":[106.28557099871041,102.21119827718813,99.99498353973978,99.86108013382189,101.7325327510917,103.22825730226452,108.11030413073082,106.36416704086214]},"walk-b":{"height":167.0,"pad":101,"stride":0.5,"centers":[94.16253529965485,90.06876323936777,90.89993706733794,89.60530652603823,92.0407971128197,92.8943192637258,96.06617266930898,92.57427385892116]},"walk":{"height":152.5,"pad":92,"stride":0.84,"centers":[131.73931755302797,134.04929504991253,133.23873312564902,133.36201903185767,133.05041493775934,132.60105666632134,137.24248176641024,139.69609775325188]},"run":{"height":143.0,"pad":86,"stride":1.6,"centers":[161.9180724976209,166.45426997245178,180.88564616118265,171.1071394437542,157.9046979865772,153.2194128787879]},"run-f":{"height":155.0,"pad":93,"stride":0.95,"centers":[116.1501312335958,131.26386144368243,133.81183064758284,126.36319729533929,123.88193964524304,124.96536682088566]},"run-b":{"height":178.0,"pad":107,"stride":0.95,"centers":[107.59680891477777,116.50773333333333,121.28475359882316,106.4303497332543,115.07263102170461,104.72280308688076]},"stalk":{"height":132.69230769230768,"pad":63,"stride":0.27299999999999996,"centers":[132.45645183838948,122.79170850667049,123.59285714285714,116.86952498457742,123.02040533037201,123.58142940831868]},"stalk-f":{"height":173.7179487179487,"pad":82,"stride":0.27299999999999996,"centers":[130.95948264484625,141.22417023554604,135.4517686986033,136.55834927575842,144.1576540220608,147.37556796053485]},"stalk-b":{"height":205.76923076923077,"pad":97,"stride":0.27299999999999996,"centers":[112.38300080728867,116.33431436668847,113.93395475730362,114.64316000892659,115.64867781975175,110.40285003392897]}},"cats/calico":{"walk-f":{"height":158.5,"pad":96,"stride":0.5,"centers":[102.095952023988,100.65635632539437,97.59325729620933,99.45205479452055,102.2481426448737,100.43280405958421,108.02216932004166,106.00933172787478]},"walk-b":{"height":167.0,"pad":101,"stride":0.5,"centers":[99.87061331584125,99.99851067350653,96.30177608626705,96.1328437917223,98.16443691786621,96.81919567421426,98.74419468697752,97.02404978136562]},"walk":{"height":148.0,"pad":89,"stride":0.9,"centers":[140.42402116402116,136.29306370494552,132.27055561480216,132.49748138414367,134.56805423154327,135.0732596803604,136.69804691536632,138.61111680853247]},"run":{"height":145.0,"pad":87,"stride":1.6,"centers":[148.96331138287866,151.37220187220188,167.09307404326123,161.46962162162163,157.04946466809423,166.28449061417896]},"run-f":{"height":152.0,"pad":92,"stride":0.95,"centers":[118.77011184476486,133.2917119073471,135.49229017903343,129.67533895199708,126.1223801493616,127.48978472507885]},"run-b":{"height":177.0,"pad":107,"stride":0.95,"centers":[106.52459452273331,120.54378546789808,125.30818221070811,109.68547998070429,117.51775310541937,106.28021694214875]},"stalk":{"height":128.84615384615384,"pad":61,"stride":0.27299999999999996,"centers":[136.4508148148148,126.90657662003538,126.44964301989974,119.77621586686055,125.75337787676318,126.25007854225574]},"stalk-f":{"height":173.07692307692307,"pad":81,"stride":0.27299999999999996,"centers":[131.6755668858178,141.0968052877995,136.0286396181384,138.24616884926164,144.8079080201907,149.4272642885559]},"stalk-b":{"height":204.48717948717947,"pad":96,"stride":0.27299999999999996,"centers":[113.7064891447763,116.63216414488767,116.61578581363004,116.50766801984663,117.56721894807072,112.30339321357286]}},"cats/siamese":{"walk-f":{"height":156.0,"pad":94,"stride":0.5,"centers":[102.95381406436233,98.34497615017695,94.94970563498738,94.72010008340284,101.82288026485195,97.49552137907723,104.3836784409257,103.54946704698995]},"walk-b":{"height":167.0,"pad":101,"stride":0.5,"centers":[91.06686930091185,90.69279326670174,92.94123589829938,91.55105456980247,94.86731937879811,93.53961237674261,97.1419451746151,93.34987080103359]},"walk":{"height":153.0,"pad":92,"stride":0.87,"centers":[134.63408772281193,140.53031480761757,137.62039861704292,138.68540829986614,137.53452453058753,129.97864467702718,134.0335591133005,144.24443580522887]},"run":{"height":144.5,"pad":87,"stride":1.6,"centers":[181.52093789209536,174.61361397223467,183.9212541013489,166.31906180193596,160.22026662019692,143.98025009924572]},"run-f":{"height":154.5,"pad":93,"stride":0.95,"centers":[118.22485442032821,133.29638666201927,134.30778551953952,127.43941958887545,127.06225680933852,125.50468152446261]},"run-b":{"height":176.0,"pad":106,"stride":0.95,"centers":[106.66623628147191,119.14905805883001,120.66862042765658,107.42013763129302,115.6835891381346,105.99696010132996]},"stalk":{"height":132.05128205128204,"pad":62,"stride":0.27299999999999996,"centers":[133.1484135107472,122.77527587235312,124.85370680468868,118.96275430359937,124.66870273414776,125.61322059953882]},"stalk-f":{"height":172.43589743589743,"pad":81,"stride":0.27299999999999996,"centers":[131.96997441766527,142.5491138892705,135.99365582870738,137.3821322384256,145.62300232208716,148.7160301376981]},"stalk-b":{"height":203.2051282051282,"pad":96,"stride":0.27299999999999996,"centers":[112.93562485235059,117.04704197422056,114.82362403768815,115.04263652641002,116.24561790320803,111.74066009626404]}},"dogs/golden":{"walk-f":{"height":180.0,"pad":108,"stride":0.5,"centers":[84.34279403644395,84.95566006046356,86.83895427795383,93.44292237442923,90.53548463919981,83.76005961251863,95.70100159344412,92.95977267662136]},"walk-b":{"height":182.0,"pad":110,"stride":0.5,"centers":[81.10902769154353,80.46323710831483,81.00075805432722,86.66025262660843,83.7617643287601,82.71610431343468,82.34606144898217,81.71190388623269]},"walk":{"height":172.0,"pad":104,"stride":0.81,"centers":[93.57952069716775,92.92886473429952,92.20006930807439,93.52256605325383,94.15023321401453,96.15553393860787,97.82683005482103,104.87674136886736]},"run":{"height":186.0,"pad":112,"stride":1.6,"centers":[131.972787542399,118.37058719176868,121.94335889191194,125.12476866132018,126.40844960025082,129.4134346881787]},"run-f":{"height":184.5,"pad":111,"stride":0.95,"centers":[118.82422037422037,125.16089133208992,126.98138823952526,125.38275862068966,130.461511268228,128.79968762202265]},"run-b":{"height":190.0,"pad":114,"stride":0.95,"centers":[101.42202660798239,109.73426509545995,113.47101649617547,107.94720584105589,113.14868105515588,107.96668004817343]}},"dogs/corgi":{"walk-f":{"height":143.0,"pad":86,"stride":0.5,"centers":[98.41836492890995,89.69352428393525,85.41369236631526,83.2982478255389,79.5387980954832,81.88073278584966,84.18197323537129,77.71859799713877]},"walk-b":{"height":187.5,"pad":113,"stride":0.5,"centers":[76.03604060913706,96.13080399945213,82.75223880597015,75.60231712245722,94.12630296466766,76.75140562248995,81.4638839951213,93.20446194225721]},"walk":{"height":181.5,"pad":109,"stride":0.81,"centers":[140.3621766280107,137.45533464015682,138.31790452212647,133.4539685459395,139.15500759403199,127.96388700126201,136.39689475641504,131.61282705204496]},"run":{"height":171.0,"pad":103,"stride":1.5,"centers":[155.58400664502,157.2240842710079,164.4086528461485,159.84893067317353,160.45391304347825,147.78853407090773]},"run-f":{"height":159.5,"pad":96,"stride":0.95,"centers":[108.04167440133655,104.43501409332916,107.46643002028398,99.8658548757361,107.6370568429392,80.57667025218119]},"run-b":{"height":178.5,"pad":108,"stride":0.95,"centers":[98.92189166765438,91.39633368140156,95.35449962458436,91.6961819658814,90.68713481355572,87.63435045706193]}}};
  LW.PET_FOLLOW_LAYOUT={"cats/orange":{"hunt":{"height":148.0,"pad":12,"centers":[136.55412946428572,138.3768257059396,140.25795783381562,140.73658536585367,140.30922194047778]},"pounce":{"height":148.0,"pad":12,"centers":[152.1080189923503,156.0393638170974,144.14102250489236,152.5079104477612,157.5523643748187]},"hunt-f":{"height":169.33333333333334,"pad":12,"centers":[112.8097798689296,121.32669445731048,111.17772549019608,113.71105691056911,118.52745739369944]},"pounce-f":{"height":169.33333333333334,"pad":12,"centers":[142.36410336239103,142.53361291142457,162.51756280550188,150.6219154443486,139.27391613361763]},"hunt-b":{"height":196.0,"pad":12,"centers":[125.62363272223078,127.95079278294149,128.13281907433378,115.10696517412936,123.29758676789588]},"pounce-b":{"height":196.0,"pad":12,"centers":[122.68714011516315,132.3305965495739,138.63192831065385,132.72005294506948,127.72620859182956]},"perk":{"height":186.0,"pad":12,"centers":[126.55664298163293,129.2582190007766,126.16357440363498,126.2518998380466,123.14809873248832]},"turn-f":{"height":186.0,"pad":12,"centers":[153.03222058709628,161.19217926186292,155.10743069701533,151.19756119756119,142.02128856794522]},"turn-b":{"height":186.0,"pad":12,"centers":[159.68957345971563,164.06590007930214,155.5959483716557,130.4649575802287,127.51433562840407]},"loaf-stretch":{"height":186.0,"pad":12,"centers":[133.84220816561242,143.0593528816987,181.99924134660978,153.62226724965342,165.57225853304286]}},"cats/black":{"hunt":{"height":150.66666666666666,"pad":12,"centers":[135.5889689578714,137.3218328105823,139.91837837837838,137.65529247910865,138.97500332402606]},"pounce":{"height":150.66666666666666,"pad":12,"centers":[148.64989888776543,155.20876421923475,145.37283064033514,149.3999414434197,155.34079954635666]},"hunt-f":{"height":173.33333333333334,"pad":12,"centers":[115.97028086218158,122.27483927527761,110.078125,115.19162319729979,121.93178763440861]},"pounce-f":{"height":173.33333333333334,"pad":12,"centers":[141.95359235275978,143.01878230177738,162.68116268589455,148.99690553745927,139.0768512341561]},"hunt-b":{"height":198.66666666666666,"pad":12,"centers":[126.01408868456177,130.34467180441138,131.3258584442887,117.66586059743955,126.42482194671591]},"pounce-b":{"height":198.66666666666666,"pad":12,"centers":[125.12674825174825,133.66906700062617,138.1333107955826,133.6311685418291,128.38387582532144]},"perk":{"height":187.0,"pad":12,"centers":[129.3690351337179,132.1179157920731,129.122717674823,130.20753075680378,125.65381568523898]},"turn-f":{"height":187.0,"pad":12,"centers":[151.1675800849093,159.1460396039604,154.85488058151608,150.276222861627,142.81573632023503]},"turn-b":{"height":187.0,"pad":12,"centers":[158.2192889561271,163.42174836729876,155.6989622182585,133.11492838942098,130.2746043998456]},"loaf-stretch":{"height":187.0,"pad":12,"centers":[136.92015082621714,146.2131636508252,184.6003740065451,156.52949684884803,163.47957791974733]}},"cats/grey":{"hunt":{"height":149.33333333333334,"pad":12,"centers":[135.78512282638695,138.06337359207492,140.44564166321314,140.05838509316771,140.1165871754107]},"pounce":{"height":149.33333333333334,"pad":12,"centers":[150.20648890056484,157.87261663286003,143.6340275240531,150.12423178226516,157.43497757847533]},"hunt-f":{"height":170.66666666666666,"pad":12,"centers":[113.5542662116041,122.37840276733344,111.15930177700896,113.45629965947786,118.61513327601031]},"pounce-f":{"height":170.66666666666666,"pad":12,"centers":[140.65926152903324,141.55742687096367,161.72495831017233,151.55973108084814,138.28465804066542]},"hunt-b":{"height":197.33333333333334,"pad":12,"centers":[125.41044888154931,128.30558524853018,129.4116988525049,115.20760743321719,124.26109487111347]},"pounce-b":{"height":197.33333333333334,"pad":12,"centers":[124.00964445084209,132.01269674711438,138.41999103541013,131.46884272997033,127.87930055637561]},"perk":{"height":188.0,"pad":12,"centers":[125.93574350178123,129.0410025706941,126.13694544550765,127.19244157135753,122.84630926724138]},"turn-f":{"height":188.0,"pad":12,"centers":[153.21475054229936,159.58255033557046,153.68950863213811,150.140716374269,142.01418575673344]},"turn-b":{"height":188.0,"pad":12,"centers":[159.40916248031792,163.3744176865377,156.15104517869185,129.864050004596,127.31804534630915]},"loaf-stretch":{"height":188.0,"pad":12,"centers":[135.2124072825354,143.7283231285799,182.31623612794928,152.80875600640684,163.52865641323274]}},"cats/calico":{"hunt":{"height":149.33333333333334,"pad":12,"centers":[138.24731032555542,137.77901516167987,139.98546551487726,141.52337733773376,140.8628120893561]},"pounce":{"height":149.33333333333334,"pad":12,"centers":[152.63788998872323,156.78403261870315,147.62905014167796,150.9123095309232,157.54929170280428]},"hunt-f":{"height":170.66666666666666,"pad":12,"centers":[115.65606595995288,122.24307133121309,111.3430783817952,112.46583549222798,119.94729706829351]},"pounce-f":{"height":170.66666666666666,"pad":12,"centers":[143.1104436229205,143.168722693395,161.4865470852018,151.464458939622,139.40602460755196]},"hunt-b":{"height":196.0,"pad":12,"centers":[125.39126464769441,127.66240753194351,127.3654800737484,115.66833800324436,122.71791407727642]},"pounce-b":{"height":196.0,"pad":12,"centers":[123.56345926800472,132.01037256562233,137.89461832920512,133.09849235171123,127.95706892495883]},"perk":{"height":187.0,"pad":12,"centers":[127.99227902023429,130.8985618900873,128.75476250952502,128.31835863972896,124.33369565217392]},"turn-f":{"height":187.0,"pad":12,"centers":[153.8588325652842,161.91843495389023,156.55177993527508,152.06828073993472,141.19992409146977]},"turn-b":{"height":187.0,"pad":12,"centers":[159.13191714544905,163.68688069758224,155.73949650585163,131.62732691425953,127.7314015618578]},"loaf-stretch":{"height":187.0,"pad":12,"centers":[133.53318360471644,144.61926046322634,182.09751234333459,154.45429596791217,165.31937211178757]}},"cats/siamese":{"hunt":{"height":152.0,"pad":12,"centers":[142.75982715361025,143.93875884594448,143.646408839779,144.9776192474472,145.11024762908323]},"pounce":{"height":152.0,"pad":12,"centers":[151.13874697499327,160.57871544932567,149.33827128687363,157.7412045319022,157.3648687214612]},"hunt-f":{"height":172.0,"pad":12,"centers":[117.37208104395604,123.5069018404908,108.12532894736842,113.92372322899506,121.42481336651262]},"pounce-f":{"height":172.0,"pad":12,"centers":[143.20166805671394,149.579637485538,164.98401341531581,153.2250814891062,141.37347196852608]},"hunt-b":{"height":201.33333333333334,"pad":12,"centers":[128.13039029381667,132.0124708784432,132.15215882271275,118.72906403940887,127.89196081062944]},"pounce-b":{"height":201.33333333333334,"pad":12,"centers":[131.5892338943703,137.12523076923077,140.6475780646585,137.60036932435366,132.99066293183938]},"perk":{"height":185.0,"pad":12,"centers":[137.7283423842772,140.21521287642784,139.54152531725092,138.36010726599415,132.5708474576271]},"turn-f":{"height":185.0,"pad":12,"centers":[151.77793317793316,161.5581318042051,155.32107146133382,151.16000738211682,143.90666794038975]},"turn-b":{"height":185.0,"pad":12,"centers":[158.4547938966067,171.4044416142641,161.33266602837497,134.0048120573815,133.1030341340076]},"loaf-stretch":{"height":185.0,"pad":12,"centers":[138.21398114901257,147.66771808772793,185.06385415672426,158.2799752142931,166.53971457402335]}},"dogs/golden":{"hunt":{"height":196.0,"pad":12,"centers":[130.65534430790632,163.222,158.98545327592225,132.70840027541885,133.19974845643725]},"pounce":{"height":196.0,"pad":12,"centers":[143.0828740354745,168.74039568721867,163.46388046286933,147.01802919011735,147.04338989940047]},"hunt-f":{"height":225.33333333333334,"pad":12,"centers":[136.74272824409354,130.06155484558042,132.69057837727365,128.84318206551313,133.59712607509965]},"pounce-f":{"height":225.33333333333334,"pad":12,"centers":[138.4988061870653,151.20178149427377,166.1039534062831,138.7143692157818,142.1200157526829]},"hunt-b":{"height":220.0,"pad":12,"centers":[125.90018926187868,127.21748562750841,128.07550510310352,123.3740748572637,120.24514614892256]},"pounce-b":{"height":220.0,"pad":12,"centers":[140.19007760048828,150.07833494335645,174.0672960089728,143.8681156750783,141.21790540540542]},"perk":{"height":173.0,"pad":12,"centers":[148.00502982805006,146.67164366373902,149.88909157241883,148.45740181268883,132.41260028935946]},"turn-f":{"height":173.0,"pad":12,"centers":[151.95091648132527,157.2879302832244,151.52869565217392,136.92408178720183,140.75913483663138]},"turn-b":{"height":173.0,"pad":12,"centers":[147.2135746606335,133.8992347905144,130.39712528710083,123.50476336816226,113.22079388517328]},"loaf-stretch":{"height":173.0,"pad":12,"centers":[153.03040700425936,151.6556161200965,133.21685640837313,131.07113253012048,163.84718100890208]}},"dogs/corgi":{"hunt":{"height":184.0,"pad":12,"centers":[103.37025895893278,110.77063106796116,112.6667115902965,109.93659591726376,103.27400026928774]},"pounce":{"height":184.0,"pad":12,"centers":[120.41843159702347,133.30619278406033,154.52143638714813,127.29189750692521,113.84115256741781]},"hunt-f":{"height":198.66666666666666,"pad":12,"centers":[90.71669924602067,90.57435679954764,94.60984540276648,97.61108795331388,92.68620928620929]},"pounce-f":{"height":198.66666666666666,"pad":12,"centers":[113.44255117737546,118.76330088295224,146.94290214609174,115.36177912678029,107.61018786127168]},"hunt-b":{"height":198.66666666666666,"pad":12,"centers":[108.36519549052531,111.37076735688186,106.76925108968432,103.40620782726046,107.5576829859428]},"pounce-b":{"height":198.66666666666666,"pad":12,"centers":[117.28212900096993,123.6552514168576,130.3514156040631,122.79635434807848,111.80004826837215]},"perk":{"height":194.0,"pad":12,"centers":[162.24904845180538,166.1423015556442,168.85726898175398,162.50297680147813,126.2845545598313]},"turn-f":{"height":194.0,"pad":12,"centers":[156.14653858893672,154.89792284866468,143.16842617030144,125.94940451051609,95.935258290097]},"turn-b":{"height":194.0,"pad":12,"centers":[159.80688969857567,132.77213079098095,116.33814044495978,101.71756850502949,83.16955313234979]},"loaf-stretch":{"height":194.0,"pad":12,"centers":[139.74290250280166,151.0122478386167,114.81549753941113,106.16587800051622,147.6203320863687]}}};
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
  // The golden's hunt / pounce / perk / front-and-back turn / stretch sheets were drawn as a grown,
  // feathered golden; everything else of hers (stand, walk and run cycles, sit, sleep, side turn, jumps) is a
  // puppy. Mixed in, she flipped between puppy and adult mid-walk. Those sheets stay unused until redrawn as
  // the puppy: turns switch view directly, pick-up shows the sit, and she doesn't stalk-and-pounce.
  for(const q of ['hunt','hunt-f','hunt-b','pounce','pounce-f','pounce-b','perk','turn-f','turn-b','loaf-stretch'])delete LW.PET_FOLLOW_LAYOUT['dogs/golden'][q];
  LW.PET_JUMP_LAYOUT={"cats/orange":{"jump-f":{"height":155.0,"pad":12,"centers":[170.57457109777917,173.59784560143626,194.83838245373545,172.59157835505954,203.09241228806445]},"jump-b":{"height":164.0,"pad":12,"centers":[122.04708413001912,128.39442691903258,146.14274164570608,126.85637740244613,138.2732375392905]},"jump":{"height":149.0,"pad":12,"centers":[163.8935024530334,180.69558373414955,195.85111443925646,201.95147140477513,163.40395061728395]}},"cats/black":{"jump-f":{"height":155.5,"pad":12,"centers":[171.31271406331084,174.14332185227707,198.51091732126216,174.97160912171444,200.40788476118271]},"jump-b":{"height":170.0,"pad":12,"centers":[127.63834208223972,131.43774391377067,150.98299101412067,129.0837912087912,142.8035140562249]},"jump":{"height":151.5,"pad":12,"centers":[162.83163028332558,179.21231696813092,192.62180289751387,200.8171582976807,161.43771339381524]}},"cats/grey":{"jump-f":{"height":157.0,"pad":12,"centers":[178.3828474778629,178.17566250974278,192.01196723409703,178.61214179949482,207.2665328985871]},"jump-b":{"height":167.0,"pad":12,"centers":[122.35260718424102,127.95828670261471,146.49433007676203,126.53006912442396,136.6961012995668]},"jump":{"height":152.5,"pad":12,"centers":[172.3285495179667,186.03589743589743,154.46522518931846,148.38218423124508,156.15394736842106]}},"cats/calico":{"jump-f":{"height":158.5,"pad":12,"centers":[180.14702570838807,182.16324189005945,198.55810261620522,181.12249346120313,214.6834489761381]},"jump-b":{"height":167.0,"pad":12,"centers":[124.94068592905802,128.83951427633738,149.33947206875385,128.37185635746872,141.7896790013375]},"jump":{"height":148.0,"pad":12,"centers":[155.1791953414505,161.5341160619767,175.9673098751419,182.04444215302124,166.18549033070144]}},"cats/siamese":{"jump-f":{"height":156.0,"pad":12,"centers":[175.26905876235048,179.614608801956,200.850688740048,178.61879918648864,207.95902331868874]},"jump-b":{"height":167.0,"pad":12,"centers":[126.64281690140845,133.4123127160968,146.37944078947368,128.7769958467928,142.84369730185497]},"jump":{"height":153.0,"pad":12,"centers":[179.40132970686008,201.1244710345834,211.5317099483702,232.44774294944557,170.17958515283843]}},"dogs/golden":{"jump-f":{"height":180.0,"pad":12,"centers":[103.67798824297844,122.2264483627204,157.96500495212942,118.22014260249554,116.38224596499204]},"jump-b":{"height":182.0,"pad":12,"centers":[105.1054297540784,110.99225710649131,143.28191791185927,113.50757174626708,112.55571343990528]},"jump":{"height":172.0,"pad":12,"centers":[116.55812492145282,117.13736263736264,155.65268948655256,131.29662354054906,119.74765520321571]}},"dogs/corgi":{"jump-f":{"height":143.0,"pad":12,"centers":[95.84020291693088,137.28179775280898,157.46636191133345,138.18986254295532,105.33767587285044]},"jump-b":{"height":187.5,"pad":12,"centers":[114.57469108561341,126.53815190759538,149.92033578893268,119.05539797908172,112.39289191820838]},"jump":{"height":181.5,"pad":12,"centers":[138.77988648456898,169.11815725863784,200.83171521035598,182.72758673626035,146.22746890073623]}}};
  // Ground covered by one full cycle, in walking heights (the drawn walk1 height); tuned per
  // set by eye against the planted paw (docs/scene-polish.md). Defaults for unknown sets.
  // (walk = stance sweep of the drawn paws ÷ .6 duty, art-src/cycles/stride.py; run ≈ 1.6)
  LW.PET_STRIDE={'cats/orange':{walk:.82,run:1.6},'cats/black':{walk:.78,run:1.7},'cats/grey':{walk:.84,run:1.6},'cats/calico':{walk:.9,run:1.6},
    'cats/siamese':{walk:.87,run:1.6},'dogs/golden':{walk:.81,run:1.6},'dogs/corgi':{walk:.81,run:1.5},'pandas/mei':{walk:.86},'pandas/bao':{walk:.81},'pandas/cub':{walk:.7}};
  const STRIDE_DEF={walk:.85,run:1.6,stalk:.273};
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
        im.src=LW.petArtPath(base,set,'cycle/'+g+'-'+i);ims.push(im);
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
