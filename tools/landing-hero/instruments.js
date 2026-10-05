window.__shotPending=true;window.__instrumentChecks=[];
(async()=>{
 for(const id of ['speakeasy','bowls']){
  Sound.set(false);
  scrollTo(0,Journey.el.offsetTop+Journey.order.indexOf(id)*Journey.stage.offsetHeight);Journey.update();
  for(let i=0;i<150&&!Journey.host.isLive();i++)await new Promise(r=>setTimeout(r,100));
  const w=Journey.host.frame.contentWindow;
  w.LW.advance(1/30);
  let unlockedBeforeScene=false;
  w.LW.on('down',()=>{unlockedBeforeScene=Sound.on&&!w.LW.muted});
  w.dispatchEvent(new w.PointerEvent('pointerdown',{clientX:innerWidth*.5,clientY:innerHeight*.6}));
  if(!unlockedBeforeScene)throw Error(id+' sound did not unlock before input');
  __instrumentChecks.push(id+': sound unlocked before scene input');
 }
})().catch(e=>window.__errs.push(String(e))).finally(()=>{window.__shotReport=()=>({checks:__instrumentChecks});window.__shotPending=false});
