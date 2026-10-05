window.__shotPending = true;
(async () => {
  const n = window.__captureIndex;
  const top = Journey.el.offsetTop, h = Journey.stage.offsetHeight;
  let y;
  if (n < 18) y = 0;
  else if (n < 36) { const t=(n-18)/17; y=top*(t*t*(3-2*t)); }
  else if (n < 288) {
    const p=n-36, scene=Math.floor(p/21), local=p%21;
    const t=Math.min(1,local/6);
    y=top+Math.max(0,scene-1+t*t*(3-2*t))*h;
  } else { const t=Math.min(1,(n-288)/17); y=top+(11+t*t*(3-2*t))*h; }
  scrollTo(0,y); Journey.update();
  await new Promise(r=>setTimeout(r,35));
  const host = Live.owner;
  if(host?.wantLive && host.active) {
    for(let i=0;i<150&&!host.isLive();i++)await new Promise(r=>setTimeout(r,100));
    if(!host.isLive())throw Error('Video scene failed to load: '+host.sceneId);
    if(window.__videoScene!==host.sceneId){
      window.__videoScene=host.sceneId;
      host.frame.contentWindow.LW.advance(1/30);
    }
  }
  window.__shotReport=()=>({frame:n,scroll:scrollY,scene:host?.sceneId,frames:document.querySelectorAll('iframe.scene').length,errors:[...document.querySelectorAll('iframe.scene')].flatMap(f=>f.contentWindow.__errs||[])});
})().catch(e=>{window.__errs.push(String(e))}).finally(()=>window.__shotPending=false);
