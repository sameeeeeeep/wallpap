/* Shared scale and pose composition for illustrated scene pets. */
(() => {
  'use strict';
  const clamp=t=>Math.max(0,Math.min(1,t));
  const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  const name=p=>typeof p==='string'?p:((p&&p.src||'').split('/').pop()||'').replace(/\.png.*$/,'');
  const walking=p=>/^walk[12]$/.test(name(p));
  LW.petUnit=(kind,walk)=>(kind==='dog'?96:78)/(walk.naturalHeight||walk.height);
  LW.petPoseScale=(kind,pose,walk,im)=>{
    if(im&&im.petK)return im.petK;   // a drawn in-between frame carries its own size (LW.petSeqPrep)
    const n=name(pose);
    if(walking(n)&&walk&&im)return (walk.naturalHeight||walk.height)/(im.naturalHeight||im.height);
    return (kind==='dog'?{sit:.88,sleep:.88,lie:.94,'belly-up':.9,'play-bow':.96}:{sit:.8,loaf:.88,sleep:.72,stretch:.92})[n]||1;
  };
  LW.poseFrame=(from,to,progress)=>{
    const t=clamp(Number.isFinite(progress)?progress:1),u=ease(t);
    return {pose:to,sx:1,sy:1,from,mix:u,layers:!from||from===to||t>=1?[{pose:to,alpha:1}]:[{pose:from,alpha:1-u},{pose:to,alpha:u}]};
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
    if(walkA&&walkB||sa&&sb)return 'cut';
    if(sb)return b.petName.startsWith('jump-')?'quick':'cut';
    return sa?'quick':'fade';
  };
  // jump frames for a hop's phases: 'crouch' → 1, 'air' (u 0…1) → 2-4, 'land' → 5
  LW.petJumpFrame=(ph,u)=>'jump-'+(ph==='crouch'?1:ph==='land'?5:u<.36?2:u<.64?3:4);
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
