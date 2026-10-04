// lw.js idle governor: a paused scene registers no timer wakeups and no running audio, unless something
// explicitly keeps it alive (LW.keepAlive, the global soundscape); resume continues where it left off.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'scenes', 'lw.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function load() {
  class Param { constructor(v) { this.value = v; } setTargetAtTime(v) { this.value = v; } setValueAtTime(v) { this.value = v; } exponentialRampToValueAtTime() {} }
  class AudioNode { connect(t) { return t; } disconnect() {} }
  class Node extends AudioNode {
    constructor(ctx) { super(); this.context = ctx; this.gain = new Param(1); this.frequency = new Param(0); this.Q = new Param(0); }
    start() {} stop() {}
  }
  const contexts = [];
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = new Node(this); this.calls = []; contexts.push(this); }
    createGain() { return new Node(this); }
    createBiquadFilter() { return new Node(this); }
    createOscillator() { return new Node(this); }
    createBufferSource() { return new Node(this); }
    createBuffer(ch, n) { const d = [...Array(ch)].map(() => new Float32Array(n)); return { getChannelData: (i) => d[i] }; }
    resume() { this.calls.push('resume'); this.state = 'running'; return Promise.resolve(); }
    suspend() { this.calls.push('suspend'); this.state = 'suspended'; return Promise.resolve(); }
  }
  const el = () => ({ style: {}, dataset: {}, classList: { toggle() {} }, appendChild() {}, append() {}, addEventListener() {}, remove() {} });
  class HTMLCanvasElement { getContext() { return null; } }
  const w = {
    console, Promise, Math, Date, JSON, Object, Array, Map, Set, Float32Array, URL, URLSearchParams, Number, String,
    // unref'd so the scene's own forever-timers never keep the test process alive
    setInterval: (...a) => setInterval(...a).unref(), clearInterval,
    setTimeout: (...a) => setTimeout(...a).unref(), clearTimeout,
    performance: { now: () => performance.now() },
    location: { search: '?host=1', href: 'file:///scenes/koi.html?host=1', pathname: '/scenes/koi.html' },
    document: {
      currentScript: { src: 'file:///scenes/lw.js' }, readyState: 'complete', visibilityState: 'visible',
      head: el(), body: el(), documentElement: el(), createElement: el, addEventListener() {}, querySelectorAll: () => [],
    },
    addEventListener() {}, getComputedStyle: () => ({}), innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
    requestAnimationFrame: (cb) => setTimeout(() => cb(performance.now()), 16).unref(),
    webkit: { messageHandlers: { lw: { postMessage() {} } } },
    AudioContext, AudioNode, HTMLCanvasElement,
  };
  w.window = w; w.self = w; w.top = w;
  vm.createContext(w);
  vm.runInContext(SRC, w);
  return { w, LW: w.LW, contexts };
}

test('scene intervals stop while paused and re-arm on resume', async () => {
  const { w } = load();
  let n = 0;
  const id = w.setInterval(() => n++, 10);
  await wait(60); assert.ok(n >= 3, 'fires while live');
  w.__lw('focus', false);
  const atPause = n; await wait(80);
  assert.strictEqual(n, atPause, 'no wakeups while paused');
  w.__lw('focus', true);
  await wait(60); assert.ok(n > atPause + 2, 'fires again after resume');
  w.clearInterval(id); const stopped = n; await wait(40);
  assert.strictEqual(n, stopped, 'clearInterval still works on governed ids');
});

test('clearInterval while paused keeps the interval from coming back', async () => {
  const { w } = load();
  let n = 0;
  const id = w.setInterval(() => n++, 10);
  w.__lw('focus', false); w.clearInterval(id); w.__lw('focus', true);
  await wait(50); assert.strictEqual(n, 0);
});

test('paused scene audio fades out and suspends; LW.audio() does not wake it; resume restores', async () => {
  const { w, LW } = load();
  const ctx = LW.audio(); const bus = LW.bus('ambience');
  assert.strictEqual(ctx.state, 'running');
  w.__lw('focus', false);
  assert.strictEqual(bus.gain.value, 0, 'scene bus faded to silence');
  await wait(520);
  assert.strictEqual(ctx.state, 'suspended');
  LW.audio(); await wait(5);
  assert.strictEqual(ctx.state, 'suspended', 'a scene calling LW.audio() while paused does not resume it');
  w.__lw('focus', true); await wait(5);
  assert.strictEqual(ctx.state, 'running');
  assert.strictEqual(bus.gain.value, 1, 'bus back at its volume');
});

test('a quick pause/resume never suspends', async () => {
  const { w, LW } = load();
  const ctx = LW.audio();
  w.__lw('focus', false); await wait(100); w.__lw('focus', true); await wait(500);
  assert.ok(!ctx.calls.includes('suspend'));
});

test('LW.keepAlive (bowls auto-play) keeps timers and audio going while paused', async () => {
  const { w, LW } = load();
  const ctx = LW.audio(); LW.keepAlive = true;
  let n = 0; w.setInterval(() => n++, 10);
  w.__lw('focus', false); await wait(500);
  assert.ok(n > 5, 'timers keep running');
  assert.strictEqual(ctx.state, 'running');
  assert.strictEqual(LW.bus('fx').gain.value, 1);
  LW.keepAlive = false; await wait(520);
  assert.strictEqual(ctx.state, 'suspended', 'turning keep-alive off while paused idles the page');
  const k = n; await wait(50); assert.strictEqual(n, k);
});

test('the global soundscape keeps sounding while paused; scene buses go quiet', async () => {
  const { w, LW } = load();
  w.__lw('ambient', { kind: 'brown', volume: 0.35 });
  const ctx = LW._ctx, fx = LW.bus('fx');
  w.__lw('focus', false); await wait(520);
  assert.strictEqual(ctx.state, 'running');
  assert.strictEqual(fx.gain.value, 0);
  w.__lw('ambient', { kind: 'off', volume: 0.35 }); await wait(520);
  assert.strictEqual(ctx.state, 'suspended', 'soundscape off while paused → idle');
  w.__lw('focus', true); await wait(5);
  assert.strictEqual(ctx.state, 'running');
});

test('mute still suspends and unmute resumes', async () => {
  const { w, LW } = load();
  const ctx = LW.audio();
  w.__lw('mute', 0, 0, true); await wait(10);
  assert.strictEqual(ctx.state, 'suspended');
  w.__lw('mute', 0, 0, false); await wait(5);
  assert.strictEqual(ctx.state, 'running');
});
