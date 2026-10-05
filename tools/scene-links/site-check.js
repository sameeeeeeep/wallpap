// Run by site-check.py in an off-screen WKWebView. Navigation is intercepted here only;
// production click handlers and the real launcher still run. Never opens an installed app.
window.__shotPending = true;
(async () => {
  const mode = new URLSearchParams(location.search).get('check');
  const checks = [], urls = [];
  const check = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (predicate) => { for (let i = 0; i < 60; i++) { if (predicate()) return; await delay(100); } throw Error('Timed out waiting for preview panel'); };
  // Off-screen WebKit can suspend CSS transitions at their first frame.
  const stable = document.createElement('style');
  stable.textContent = '* { transition: none !important; scroll-behavior: auto !important; }';
  document.head.append(stable);
  Tour.userActivity(); Tour.held = true;
  Desktop.launcher = WallpapLinks.createLauncher({ win: window, doc: document,
    storage: localStorage, navigate: (url) => urls.push(url),
    showFallback: (r) => Desktop.show(r), onHandled: () => {} });
  check(document.querySelectorAll('.pk-add').length === SCENES.length, 'every picker card has an action');
  check(document.querySelector('.sc-intro [data-add-scene="koi"]'), 'hero action exists');
  // All cards go to their own scene, even when another preview is selected.
  for (const scene of SCENES) {
    document.querySelector(`.pk-add[data-add-scene="${scene.id}"]`).click();
    check(urls.at(-1) === `wallpap://scene/${scene.id}`, `card ${scene.id}`);
  }
  Desktop.launcher.cancel();
  // The production catalog currently has no featured entries. Exercise gallery rendering
  // with a local fixture; do not alter the shipped catalog.
  const fetchOriginal = window.fetch;
  window.fetch = async (url, ...args) => url === 'catalog.json' ? { ok: true, json: async () => ({ scenes: [{ id: 'test-gallery', title: 'Gallery fixture', featured: true }] }) } : fetchOriginal(url, ...args);
  await renderCommunity(); window.fetch = fetchOriginal;
  document.querySelector('[data-add-scene="test-gallery"]').click();
  check(urls.at(-1) === 'wallpap://scene/test-gallery', 'gallery action uses catalog ID');
  Desktop.launcher.cancel();
  PG.select('koi');
  document.querySelector('#scenes').scrollIntoView({ behavior: 'instant', block: 'start' });
  await delay(350);
  if (mode.startsWith('fullscreen')) {
    PG.host.screen.classList.add('is-fs'); document.documentElement.classList.add('pg-fs');
    await PG.host.openPanel();
    await until(() => PG.host.panelFrame?.contentDocument.querySelector('[data-a="addToDesktop"]'));
    PG.host.panelFrame.contentDocument.querySelector('[data-a="addToDesktop"]').click();
    check(urls.at(-1) === 'wallpap://scene/koi', 'fullscreen panel action uses current scene');
    if (mode === 'fullscreen-panel') {
      Desktop.launcher.cancel();
      await PG.host.openPanel();
      await delay(450);
      check(PG.host.panelOpen && Number(getComputedStyle(PG.host.el.pop).opacity) > .9, 'preview panel is visible');
    }
  } else {
    document.querySelector('#pgAdd').click();
    check(urls.at(-1) === 'wallpap://scene/koi', 'playground action uses current scene');
    if (mode === 'button') Desktop.launcher.cancel();
  }
  if (mode.includes('sheet')) {
    await delay(1650);
    check(Desktop.sheet.open, 'fallback sheet opens after timeout');
    check(Desktop.sheet.contains(document.activeElement), 'modal receives keyboard focus');
    check(document.querySelector('#appSheetDownload').href === DOWNLOAD_URL, 'existing download URL retained');
    if (mode.startsWith('fullscreen')) check(Desktop.sheet.parentElement === PG.host.screen, 'sheet stays inside fullscreen root');
    // Exercise real close/retry handlers, including the queued native dialog close event.
    const before = urls.length;
    document.querySelector('#appSheetRetry').click();
    check(urls.length === before + 1, 'retry navigates again');
    check(!Desktop.sheet.open, 'retry closes sheet while opening app');
    await delay(1650);
    check(Desktop.sheet.open, 'retry still falls back after asynchronous close event');
  }
  if (mode === 'mobile') {
    Desktop.launcher.cancel(); Desktop.show({ id: 'koi', mac: false });
    check(document.querySelector('#appSheetRetry').hidden, 'non-Mac hides scheme retry');
    check(document.documentElement.scrollWidth <= innerWidth, 'mobile has no horizontal overflow');
  }
  window.__shotReport = () => ({ checks, urls, mode, sheet: Desktop.sheet.open, panel: { open: PG.host.panelOpen, rect: PG.host.el.pop.getBoundingClientRect().toJSON(), opacity: getComputedStyle(PG.host.el.pop).opacity }, dark: matchMedia('(prefers-color-scheme: dark)').matches });
})().catch((e) => { window.__errs.push(String(e)); }).finally(() => { window.__shotPending = false; });
