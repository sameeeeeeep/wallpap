window.__shotPending = true;
(async () => {
  const target = new URLSearchParams(location.search).get('capture') || 'hero';
  const index = { koi: 0, cats: 1, cafe: 2 }[target];
  if (index !== undefined) scrollTo(0, Journey.el.offsetTop + index * Journey.stage.offsetHeight);
  else if (target === 'end') scrollTo(0, document.querySelector('#journey-end').offsetTop);
  Journey.update();
  await new Promise(r => setTimeout(r, 600));
  const host = target === 'hero' ? PG.host : Journey.host;
  for (let i = 0; i < 100 && host.wantLive && !host.isLive(); i++) await new Promise(r => setTimeout(r, 100));
  const w = host.frame?.contentWindow;
  if (w?.LW) {
    for (let i = 0; i < 30; i++) w.LW.advance(1 / 30);
  }
  // Start the real hint timer after stepping the virtual scene; synchronous GPU work
  // can consume its wall-clock lifetime in an offscreen capture. Behavior is tested separately.
  if (index !== undefined) { Journey.seen.delete(Journey.host.sceneId); Journey.queueHint(); }
  await new Promise(r => setTimeout(r, 1900));
  window.__shotReport = () => ({
    target, index: Journey.index, active: Journey.active, still: Journey.still(),
    frames: document.querySelectorAll('iframe.scene').length,
    live: host.isLive(), hint: Journey.hint.classList.contains('visible'),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    ghost: Tour.running, errors: [...document.querySelectorAll('iframe')].flatMap(f => f.contentWindow.__errs || []),
    imageErrors: [...document.querySelectorAll('iframe')].flatMap(f => f.contentWindow.__imageErrors || []),
  });
  window.__shotPending = false;
})();
