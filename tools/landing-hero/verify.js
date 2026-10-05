window.__shotPending = true;
window.__verification = { checks: [], scenes: [], maxFrames: 0 };
(async () => {
  const R = window.__verification;
  const assert = (value, label) => { if (!value) throw Error(label); R.checks.push(label); };
  const nap = ms => new Promise(r => setTimeout(r, ms));
  const until = async fn => { for (let i = 0; i < 160; i++) { if (fn()) return; await nap(100); } throw Error('Timed out waiting for live scene'); };
  const frames = () => document.querySelectorAll('iframe.scene').length;
  new MutationObserver(() => { R.maxFrames = Math.max(R.maxFrames, frames()); }).observe(document.body, { childList: true, subtree: true });
  assert(Tour.mode === 'off' && !Tour.running, 'Ghost tour is opt-in');
  for (let i = 0; i < Journey.order.length; i++) {
    const old = Journey.host.frame;
    scrollTo(0, Journey.el.offsetTop + i * Journey.stage.offsetHeight);
    Journey.update();
    await until(() => Journey.host.isLive());
    const w = Journey.host.frame.contentWindow;
    for (let j = 0; j < 45; j++) w.LW.advance(1 / 30);
    const samples = [];
    for (let j = 0; j < 90; j++) { const t = performance.now(); w.LW.advance(1 / 30); samples.push(performance.now() - t); }
    samples.sort((a,b) => a-b);
    assert(frames() === 1, `${Journey.order[i]}: one live iframe`);
    if (old && old !== Journey.host.frame) assert(!old.isConnected, `${Journey.order[i]}: previous iframe removed`);
    assert(!w.__errs.length && !w.__imageErrors.length, `${Journey.order[i]}: no JS / image errors`);
    R.scenes.push({ id: Journey.order[i], meanJS: samples.reduce((a,b)=>a+b,0)/samples.length, p95JS: samples[85], loadedImages: w.__loadedImages.length });
    if (i === 0) {
      await until(() => Journey.hint.classList.contains('visible'));
      w.dispatchEvent(new w.PointerEvent('pointermove', {clientX:350,clientY:320}));
      w.dispatchEvent(new w.PointerEvent('pointermove', {clientX:380,clientY:350}));
      assert(!Journey.hint.classList.contains('visible'), 'Water movement dismisses hint');
      const y = scrollY;
      w.dispatchEvent(new w.WheelEvent('wheel', {deltaY:80,cancelable:true}));
      await nap(150);
      assert(scrollY > y, 'Wheel over iframe scrolls parent');
      w.dispatchEvent(new w.KeyboardEvent('keydown', {key:'ArrowDown',cancelable:true}));
      await nap(1000);
      assert(Journey.index === 1, 'Arrow key inside iframe advances scene');
    }
    if (i === 1) {
      const hit = w.eval("(()=>{const p=__cats.pets.items.find(p=>p.surf==='floor'&&!p.away);const b=__cats.pets.box(p);return {x:(b[0]+b[2])/2*innerHeight/1000,y:(b[1]+b[3])/2*innerHeight/1000}})()");
      w.dispatchEvent(new w.PointerEvent('pointerdown', {clientX:hit.x,clientY:hit.y}));
      w.dispatchEvent(new w.PointerEvent('pointerup', {clientX:hit.x,clientY:hit.y}));
      assert(w.__cats.pets.items.some(p=>p.picked), 'Actual cat click selects following pet');
      assert(!Journey.hint.classList.contains('visible'), 'Cat interaction dismisses hint');
    }
    if (i === 2) {
      await until(() => Journey.hint.classList.contains('visible'));
      const point = ({x:w.__cafe.L.tt.cx*w.innerHeight/1000,y:w.__cafe.L.tt.cy*w.innerHeight/1000});
      w.dispatchEvent(new w.PointerEvent('pointerdown', {clientX:point.x,clientY:point.y}));
      w.dispatchEvent(new w.PointerEvent('pointerup', {clientX:point.x,clientY:point.y}));
      assert(Music.playing && Sound.on, 'Record-player click starts sound and music');
      assert(!Journey.hint.classList.contains('visible'), 'Record-player action dismisses hint');
      Sound.set(false);
    }
    if (i === 3) {
      await until(() => Journey.hint.classList.contains('visible'));
      await nap(5500);
      assert(!Journey.hint.classList.contains('visible'), 'Unanswered hint expires');
    }
  }
  Journey.go(Journey.order.length); await nap(200); Journey.update();
  assert(frames() === 0, 'End CTA unloads every scene');
  assert(!Music.playing, 'No offscreen music scheduler');
  assert(document.activeElement.id === 'journey-end', 'Skip moves keyboard focus to end CTA');
  for (let i=0;i<24;i++) { scrollTo(0,Journey.el.offsetTop + i % 12 * Journey.stage.offsetHeight); Journey.update(); await nap(40); }
  Journey.go(12); await nap(1200); Journey.update();
  assert(frames() === 0 && R.maxFrames === 1, 'Rapid scroll cancels loading without accumulating iframes');
  scrollTo(0,0); Journey.update(); await until(() => PG.host.isLive());
  assert(frames() === 1, 'Hero reloads after the journey');
  await PG.host.openPanel();
  await until(() => PG.host.panelFrame?.contentWindow?.document.querySelector('button'));
  assert(PG.host.panelOpen, 'Real menu-bar panel still opens');
  PG.host.closePanel();
  document.querySelector('#fsBtn').click(); await nap(1000);
  assert(PG.host.screen.classList.contains('is-fs'), 'Fullscreen playground opens');
  PG.setDrop(true);
  assert(document.querySelector('#panel').classList.contains('drop-open'), 'Fullscreen controls remain available');
  document.querySelector('.fs-exit').click(); await nap(400);
  assert(!PG.host.screen.classList.contains('is-fs'), 'Fullscreen playground exits');
  assert(!window.__errs.length, 'No top-level console errors');
  R.passed = true;
})().catch(e => { __verification.failure = String(e) + "\n" + (e.stack || ""); }).finally(() => {
  window.__shotReport = () => window.__verification;
  window.__shotPending = false;
});
