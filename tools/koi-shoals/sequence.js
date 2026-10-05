// Run via wkshot's pre-script. All interactions use the host's actual input bridge.
LW.advance(3);
(() => {
  const start=performance.now()/1000, original=tick;
  let sweep=null, still=false, fed=false, left=false, sweeping=false;
  const events=[];
  const sample=()=>({t:+(performance.now()/1000-start).toFixed(2),count:minnows.length,
    depth:+(minnows.reduce((a,f)=>a+f.z,0)/minnows.length).toFixed(3),
    fear:shoals.map(s=>+s.fear.toFixed(2)),pellets:pellets.map(p=>+p.bits.toFixed(3)),
    groups:shoals.map(s=>({x:Math.round(s.x),y:Math.round(s.y),radius:Math.round(Math.max(...minnows.slice(s.start,s.end).map(f=>Math.hypot(f.x-s.x,f.y-s.y))))})),events});
  tick=function() {
    const t=performance.now()/1000-start;
    if(t>=1&&!sweep) {
      sweep={x:shoals[0].x,y:shoals[0].y};
      __lw('leave');__lw('move',sweep.x-220,sweep.y);events.push('sweep starts at '+t.toFixed(2));
    }
    if(sweep&&t>1&&t<=1.2) {__lw('move',sweep.x-220+(t-1)*2200,sweep.y);sweeping=true;}
    if(t>1.25&&sweeping) {__lw('leave');sweeping=false;}
    if(t>=6&&!still) {
      __lw('leave');__lw('move',shoals[1].x+110,shoals[1].y-50);still=true;events.push('still cursor at '+t.toFixed(2));
    }
    if(t>=13&&!left) {__lw('leave');left=true;}
    if(t>=14&&!fed) {
      const s=shoals[2];let x=s.x,y=s.y;
      for(let j=0;j<80;j++) {
        const a=j*2.4,r=20+j*2;x=clamp(s.x+Math.cos(a)*r,80,W-80);y=clamp(s.y+Math.sin(a)*r,80,H-80);
        if(!fish.some(f=>hitKoi(f,x,y))&&!pads.some(p=>Math.hypot(p.x-x,p.y-y)<p.r)&&!frogHit(x,y))break;
      }
      __lw('down',x,y);__lw('up',x,y);fed=true;events.push('food at '+Math.round(x)+','+Math.round(y)+' t='+t.toFixed(2));
    }
    original();
  };
  window.__shotReport=sample;
})();
