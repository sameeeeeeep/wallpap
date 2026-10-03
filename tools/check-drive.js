// Run with wkshot as its pre-shot JS, steps=0. Produces a nine-frame WebKit motion contact sheet.
(()=>{
  const d=__drive,c=document.getElementById('c'),sheet=document.createElement('canvas');
  sheet.width=1600;sheet.height=1000;const g=sheet.getContext('2d'),issues=[];
  const transition=new URLSearchParams(location.search).get('check')==='transition';
  const leg=d.goto(transition?'coast':'forest');
  if(transition)d.resetRoad((leg.e-270)*4);
  const marks=[2,6,12,18,25,33,42,54,66];let frame=0,maxTraffic=0;
  for(let f=1;f<=66*30;f++){
    LW.advance(1/30);maxTraffic=Math.max(maxTraffic,d.traffic.length);
    if(![d.pos,d.car.x,d.car.v,...d.depth.py].every(Number.isFinite))issues.push('nonfinite '+f);
    for(let j=1;j<420;j++)if(d.depth.clipY[j]>d.depth.clipY[j-1]+.01)issues.push('crest '+f+':'+j);
    if(f%30===0){
      for(const j of [2,30,83,84,120,180,292,400]){
        const z=d.depth.bz[j];
        if(d.depth.projZ(z,900)){
          const p=d.depth.PJ;
          if(Math.abs(p.x-(d.depth.px[j]+d.depth.ps[j]*900))>.1||Math.abs(p.y-d.depth.py[j])>.1)issues.push('road contact '+f+':'+j);
        }
      }
    }
    if(f===marks[frame]*30){
      const x=(frame%3)*1600/3,y=Math.floor(frame/3)*1000/3;
      g.drawImage(c,x,y,1600/3,1000/3);g.fillStyle='#000b';g.fillRect(x,y,230,24);g.fillStyle='white';g.font='13px system-ui';g.fillText(marks[frame]+'s · '+d.viewBio.a+' → '+d.viewBio.b+' '+d.viewBio.t.toFixed(2),x+8,y+17);frame++;
    }
  }
  if(d.depth.distanceFade(420000)!==0||d.depth.distanceFade(340000)!==1)issues.push('draw distance fade');
  sheet.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:99999';document.body.appendChild(sheet);
  window.__shotReport=()=>({issues:[...new Set(issues)],frames:frame,maxTraffic,transition});
})();
