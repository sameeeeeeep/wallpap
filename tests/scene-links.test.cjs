const test = require('node:test'), assert = require('node:assert/strict');
const cp = require('node:child_process'), fs = require('node:fs');
const links = { exports: {} };
new Function('module', fs.readFileSync('site/add-to-desktop.js', 'utf8'))(links);
const { validID, sceneURL, isMac, createLauncher } = links.exports;

test('native scene URL parser rejects malformed and hostile links', { skip: process.platform !== 'darwin', timeout: 45000 }, () => {
  fs.mkdirSync('.build', { recursive: true });
  cp.execFileSync('swiftc', ['-o', '.build/scene-link-checks', 'host/SceneLink.swift', 'tools/scene-links/checks.swift'], { timeout: 35000 });
  assert.match(cp.execFileSync('.build/scene-link-checks', { encoding: 'utf8' }), /Scene link checks:.*PASS/);
});
test('site only creates strictly formatted scene and look links', () => {
  for (const id of ['koi', 'sky-kites', 'a'.repeat(40)]) assert.ok(validID(id));
  for (const id of ['', '../koi', 'a/b', 'Koi', 'café', 'a_b', '-koi', 'koi-', 'a--b', 'koi\n', 'a'.repeat(41), null]) {
    assert.equal(validID(id), false); assert.throws(() => sceneURL(id));
  }
  assert.equal(sceneURL('train', 'swiss'), 'wallpap://scene/train?look=swiss');
  assert.throws(() => sceneURL('train', 'swiss&url=file:///tmp/x'));
});
function harness(nav = { platform: 'MacIntel', userAgent: 'Macintosh', maxTouchPoints: 0 }, denied = false) {
  const win = new EventTarget(), doc = new EventTarget();
  win.navigator = nav; doc.hidden = false;
  const memory = new Map(), timers = new Map(), urls = [], sheets = [], handled = [];
  let n = 0;
  const storage = Object.fromEntries(['getItem', 'setItem', 'removeItem'].map((method) => [method, (k, v) => {
    if (denied) throw Error('Storage denied');
    return method === 'getItem' ? memory.get(k) : method === 'setItem' ? memory.set(k, v) : memory.delete(k);
  }]));
  const launcher = createLauncher({ win, doc, storage, navigate: (url) => urls.push(url), showFallback: (r) => sheets.push(r),
    onHandled: (r) => handled.push(r), setTimer: (fn, ms) => { assert.equal(ms, 1500); timers.set(++n, fn); return n; }, clearTimer: (id) => timers.delete(id) });
  return { win, doc, memory, urls, sheets, handled, launcher, timers,
    timeout: () => { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } } };
}
test('no handler: direct scheme then fallback after 1.5 seconds, retry preserves scene', () => {
  const h = harness(); h.launcher.open('train', 'swiss');
  assert.deepEqual(h.urls, ['wallpap://scene/train?look=swiss']); assert.equal(h.sheets.length, 0);
  h.timeout(); assert.deepEqual(h.sheets[0], { id: 'train', look: 'swiss', mac: true, known: false });
  h.launcher.open(h.sheets[0].id, h.sheets[0].look); assert.equal(h.urls.length, 2);
  h.win.dispatchEvent(new Event('blur')); h.timeout(); assert.equal(h.sheets.length, 1);
});
for (const event of ['blur', 'hidden']) test(`app handled (${event}): remember and suppress fallback`, () => {
  const h = harness(); h.launcher.open('koi');
  if (event === 'blur') h.win.dispatchEvent(new Event('blur'));
  else { h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange')); }
  h.timeout(); assert.equal(h.sheets.length, 0); assert.equal(h.handled.length, 1); assert.ok(h.launcher.remembered());
  h.doc.hidden = false; h.launcher.open('cats'); assert.equal(h.urls[1], 'wallpap://scene/cats');
  h.timeout(); assert.equal(h.sheets[0].known, true); assert.equal(h.launcher.remembered(), false);
});
test('visible visibilitychange is not success; late blur does not remember', () => {
  const h = harness(); h.launcher.open('koi'); h.doc.dispatchEvent(new Event('visibilitychange')); h.timeout();
  h.win.dispatchEvent(new Event('blur')); assert.equal(h.sheets.length, 1); assert.equal(h.launcher.remembered(), false);
});
test('rapid clicks cancel previous timers and callbacks', () => {
  const h = harness(); h.launcher.open('koi'); h.launcher.open('cats'); h.timeout();
  assert.equal(h.sheets.length, 1); assert.equal(h.sheets[0].id, 'cats');
  h.launcher.open('grass'); h.launcher.cancel(); h.timeout(); assert.equal(h.sheets.length, 1);
});
test('blocked localStorage does not break opening or fallback', () => {
  const h = harness(undefined, true); h.launcher.open('koi'); h.win.dispatchEvent(new Event('blur')); h.timeout();
  assert.equal(h.handled.length, 1); h.launcher.open('cats'); h.timeout(); assert.equal(h.sheets.length, 1);
});
for (const nav of [
  { platform: 'Win32' }, { platform: 'Linux', userAgent: 'Android' }, { platform: 'iPhone' },
  { platform: 'MacIntel', userAgent: 'Macintosh', maxTouchPoints: 5 },
]) test(`non-Mac (${JSON.stringify(nav)}): never opens the scheme`, () => {
  assert.equal(isMac(nav), false); const h = harness(nav); h.launcher.open('koi');
  assert.equal(h.urls.length, 0); assert.equal(h.sheets[0].mac, false); assert.equal(h.timers.size, 0);
});

test('focused fullscreen panel iframe also detects app handoff', () => {
  const h = harness(), frame = new EventTarget();
  h.doc.activeElement = { tagName: 'IFRAME', contentWindow: frame };
  h.launcher.open('koi'); frame.dispatchEvent(new Event('blur')); h.timeout();
  assert.equal(h.handled.length, 1); assert.equal(h.sheets.length, 0); assert.ok(h.launcher.remembered());
  frame.dispatchEvent(new Event('blur')); assert.equal(h.handled.length, 1);
});
test('synchronous navigation failure shows the fallback and cleans up listeners', () => {
  const win = new EventTarget(), doc = new EventTarget(), sheets = [], timers = new Map();
  win.navigator = { platform: 'MacIntel' };
  const launcher = createLauncher({ win, doc, storage: {}, navigate: () => { throw Error('Blocked'); },
    showFallback: (r) => sheets.push(r), setTimer: (fn) => { timers.set(1, fn); return 1; }, clearTimer: (id) => timers.delete(id) });
  launcher.open('koi'); assert.equal(sheets.length, 1); assert.equal(timers.size, 0);
  win.dispatchEvent(new Event('blur')); assert.equal(launcher.remembered(), false);
});
