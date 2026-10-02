'use strict';
/* wallpap — landing page script. Plain JS, no build. */

// ─── Fill these in ────────────────────────────────────────────────────────────
// Direct download of the latest release (GitHub Releases asset).
const DOWNLOAD_URL = 'https://github.com/sameeeeeeep/wallpap/releases/latest/download/wallpap.dmg';
// Dodo Payments checkout for wallpap Pro ($5 one-time; Dodo emails a license key the app
// activates). Put the LIVE-mode link in BUY_URL_LIVE. The TEST link only switches on with
// ?buytest, so the public page never hands out test checkouts (test cards = free keys).
// While neither applies, every "Get Pro" button opens the "Pro is coming soon" modal.
const BUY_URL_LIVE = 'https://checkout.dodopayments.com/buy/pdt_0NosaY1TW3DDcAxJHpWcE?quantity=1';
const BUY_URL_TEST = 'https://test.checkout.dodopayments.com/buy/pdt_0NosZuADhm7udzYpywSQq?quantity=1';
const BUY_URL = BUY_URL_LIVE || (new URLSearchParams(location.search).has('buytest') ? BUY_URL_TEST : '');
// TODO(optional): an endpoint that accepts {email} as JSON POST (Formspree,
// Buttondown, a Worker…). While empty, the waitlist just says thank you and
// nothing leaves the browser.
const WAITLIST_URL = '';
// ─────────────────────────────────────────────────────────────────────────────

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => matchMedia('(max-width: 720px)').matches;
const smooth = () => (reduceMotion ? 'auto' : 'smooth');
document.documentElement.classList.remove('no-js');

// ─── Scenes ──────────────────────────────────────────────────────────────────
// Same categories (and order) as the app's menu. Music Mode isn't a category —
// it's a feature; `music: true` marks scenes that put your track in the world.
const CATS = ['Nature', 'Cozy Rooms', 'City Nights', 'Journeys', 'Mindful'];
// palette: c1 deep base, c2 mid light, c3 warm glow, accent (buttons/links tint)
const SCENES = [
  {
    id: 'koi', name: 'Koi Pond', cat: 'Nature', tier: 'free', hour: 16, weather: 'clear',
    desc: 'Ripples, caustics, nine koi',
    palette: ['#0a1513', '#143a33', '#4a3220', '#f0a868'],
    hints: ['Click the water to drop food', 'Press and hold — the koi nibble your fingertip', 'Tap a koi to boop it', 'Keep the cursor still — they come to see you'],
  },
  {
    id: 'grass', name: 'Touch Grass', cat: 'Nature', tier: 'free', hour: 11, weather: 'clear',
    desc: 'A meadow, pandas, soaring kites',
    palette: ['#0e1a12', '#24472c', '#6f7f3a', '#d9e7a6'],
    hints: ['Brush through the meadow with your cursor', 'Click a panda — or the cub', 'Look up — black kites soar on the thermals'],
    actions: [['bamboo', '🎋 Drop some bamboo']],
  },
  {
    id: 'cats', name: 'Santorini Cats', cat: 'Nature', tier: 'free', hour: 18.6, weather: 'clear',
    desc: 'Five cats, one sunset terrace',
    palette: ['#141a33', '#3c3d6c', '#b86a78', '#f6b98e'],
    hints: ['Click a cat — purr or meow', 'Click the terrace to toss the yarn', 'Whisk your cursor — they pounce', 'Ask for a sip of water — they drink with you'],
    actions: [['feed', '🐟 Feed the cats'], ['water', 'Fill the water bowl']],
  },
  {
    id: 'cafe', name: 'Night Café', cat: 'Cozy Rooms', tier: 'pro', hour: 22, weather: 'rain', music: true,
    desc: 'A cat, a dog, a turntable, late',
    palette: ['#160f18', '#3b2135', '#6b3a2c', '#f0b07a'],
    hints: ['Click the record player to play or pause', 'Your track lands on the record sleeve', 'Click the cat for a slow blink'],
    actions: [['pet', 'Pet the cat']],
  },
  {
    id: 'cabin', name: 'Snowy Cabin', cat: 'Cozy Rooms', tier: 'pro', hour: 20, weather: 'snow', music: true,
    desc: 'A crackling fire, snow outside',
    palette: ['#120c0a', '#3a2216', '#7a3a1c', '#f4b26a'],
    hints: ['Click the fire for a crackle of sparks', 'Click the dog — or the cat on the sill', 'Click the record player to put a record on', 'Click the window for a gust of snow'],
    actions: [['pet', 'Pet the pup']],
  },
  {
    id: 'records', name: 'Record Store', cat: 'Cozy Rooms', tier: 'pro', hour: 21, weather: 'clear', music: true,
    desc: 'After hours among the crates',
    palette: ['#140d0a', '#3b2418', '#6e3a22', '#f0b47a'],
    hints: ['Click the turntable to drop the needle', 'Flip through a crate of records', 'Your album art fills the big frame', 'Pet the cat, or the pup'],
    actions: [['pet', 'Pet the cat']],
  },
  {
    id: 'speakeasy', name: 'Speakeasy', cat: 'City Nights', tier: 'pro', hour: 22, weather: 'clear', music: true,
    desc: 'A hidden 1920s jazz bar',
    palette: ['#120a0c', '#3a1418', '#6b2a22', '#e8c07a'],
    hints: ['Click the jukebox to play or pause', 'Click the marquee for the next track', 'Your album art goes up in lights', 'A ghost plays the piano on the beat'],
    actions: [['pet', 'Pet the cat']],
  },
  {
    id: 'rooftop', name: 'Rooftop', cat: 'City Nights', tier: 'pro', hour: 20.5, weather: 'clear', music: true,
    desc: 'String lights and a projector',
    palette: ['#0b1028', '#1e2a5a', '#6a4a3a', '#f6c27a'],
    hints: ['Click the boombox to play or pause', 'Click the projector for the next track', 'Your album art is projected on the wall', 'On a big beat, a far-off firework'],
    actions: [['pet', 'Pet the cat']],
  },
  {
    id: 'ramen', name: 'Ramen Alley', cat: 'City Nights', tier: 'pro', hour: 22, weather: 'rain', music: true,
    desc: 'Lanterns, rain, a vending machine',
    palette: ['#0c1018', '#1e2a3a', '#6b2e2a', '#f29a6a'],
    hints: ['Click the vending machine — a can drops', 'Click the radio to play or pause', 'Brush the noren curtain with your cursor', 'Click a cat'],
    actions: [['feed', 'Feed the cats']],
  },
  {
    id: 'train', name: 'Indian Train', cat: 'Journeys', tier: 'pro', hour: 21.5, weather: 'clear',
    desc: 'An Indian sleeper, moving through the countryside',
    palette: ['#0a1020', '#1a2c4f', '#3a4a6a', '#9fc4f0'],
    hints: ['Click the window to skip ahead to new country', 'Try rain on the glass, or a dawn arrival', 'Box breathing with the rhythm of the rails'],
  },
  {
    id: 'bowls', name: 'Singing Bowls', cat: 'Mindful', tier: 'pro', hour: 19.2, weather: 'clear',
    desc: 'Candlelit, tuned, resonant',
    palette: ['#100b08', '#3a2412', '#5c3518', '#f2c27e'],
    hints: ['Click a bowl to strike it', 'Rest on a bowl for 1.5 s, then circle to make it sing', 'Try Auto · Focus below'],
  },
];
SCENES.forEach((s) => {
  s.file = `${s.id}.html`; s.poster = `img/${s.id}.jpg`;
  s.available = true; s.still = true;
});
const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];

const WEATHER = [
  ['clear', 'Clear', '<circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M5.6 18.4l1-1M17.4 6.6l1-1"/>'],
  ['cloudy', 'Cloudy', '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 18z"/>'],
  ['rain', 'Rain', '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3"/>'],
  ['storm', 'Storm', '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>'],
  ['snow', 'Snow', '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>'],
  ['fog', 'Fog', '<path d="M4 9h16M3 13h18M5 17h14"/>'],
];

const TRACKS = [
  { title: 'Slow Hours', artist: 'Marigold Static', album: 'Lamplight', colors: ['#f2b880', '#7a3b5c', '#1f1530'] },
  { title: 'Rain on the Window', artist: 'June Harbor', album: 'Paper Moons', colors: ['#9cc6d8', '#3b5a7a', '#141c2c'] },
  { title: 'Two Sugars', artist: 'Velvet Kettle', album: 'Back Booth', colors: ['#f6d58a', '#c2603e', '#2a1410'] },
];

const qs = new URLSearchParams(location.search);
const state = {
  scene: SCENES.some((s) => s.id === qs.get('scene')) ? qs.get('scene') : 'koi',
  hour: 16, hourTouched: false, weather: 'clear', weatherTouched: false,
  calm: false, breath: 'box', ambient: 'off', sound: false,
  buses: { fx: true, ambience: true, weather: true },
  waterEvery: 45, agentStyle: 'off',
  auto: 'off', set: 'tibetan7',
  track: 0, npOn: false, playing: false, beatSync: false,
  windowShown: false,
};
const AGENTS = [
  { id: 'c1', kind: 'claude', project: 'wallpap', state: 'working' },
  { id: 'x1', kind: 'codex', project: 'site', state: 'working' },
];

// ─── Elements ────────────────────────────────────────────────────────────────
const playground = $('#playground'), stage = $('#stage'), screen = $('#screen'), poster = $('#poster');
const statusPill = $('#statusPill'), hintPill = $('#hintPill'), soundHint = $('#soundHint');
const appWindow = $('#appWindow'), panel = $('#panel'), sheetBtn = $('#sheetBtn'), scrim = $('#scrim');
let frame = null, frameReady = false, liveStarted = false;

// ─── Messaging to the live scene ─────────────────────────────────────────────
function post(type, ...args) {
  if (!frame || !frameReady || !frame.contentWindow) return;
  const origin = location.origin && location.origin !== 'null' ? location.origin : '*';
  frame.contentWindow.postMessage({ __lw: [type, ...args] }, origin);
}
function sceneLW() { try { return frame && frame.contentWindow && frame.contentWindow.LW; } catch (e) { return null; } }
let afterLoad = [];
function whenReady(fn) { if (frameReady) fn(); else afterLoad.push(fn); }

function pushSettings() {
  const st = { breath: state.breath };
  if (state.scene === 'bowls') Object.assign(st, { auto: state.auto, set: state.set });
  post('settings', st);
  post('breath', state.breath);
}
function pushAgents() { post('agents', { style: state.agentStyle === 'off' ? 'native' : state.agentStyle, list: state.agentStyle === 'off' ? [] : AGENTS }); }
function pushAll() {
  post('env', { hour: state.hour, weather: state.weather });
  post('mute', 0, 0, !state.sound);
  post('audio', Object.fromEntries(Object.entries(state.buses).map(([k, on]) => [k, { on }])));
  pushSettings();
  post('calm', state.calm);
  post('ambient', { kind: state.ambient, volume: 0.35 });
  if (state.npOn) pushNowPlaying();
  if (state.agentStyle !== 'off') pushAgents();
  focusSent = null; applyFocus();
}

// ─── Loading scenes: one iframe, only after the poster has painted ───────────
// The poster (≤150 KB JPEG) is the LCP element. The live scene (0.1–8 MB of
// code + art) loads only when the visitor interacts with the playground, or
// once the page is idle with the playground in view. Never more than one.
const DEV_VIRTUAL = qs.has('virtual');
const saveData = !!(navigator.connection && navigator.connection.saveData);

function setPalette(s) {
  document.body.dataset.scene = s.id;
}
function sceneURL(s) {
  const q = new URLSearchParams({ hour: state.hour.toFixed(2), weather: state.weather, fps: '30' });
  if (state.calm) q.set('calm', '1');
  if (DEV_VIRTUAL) q.set('virtual', '1');   // dev: step the scene by hand via LW.advance()
  return `scenes/${s.file}?${q}`;
}
function setPoster(s) {
  poster.style.visibility = s.still ? '' : 'hidden';
  poster.onerror = () => { poster.style.visibility = 'hidden'; };
  if (s.still && poster.getAttribute('src') !== s.poster) poster.src = s.poster;
}
function setPill(text, live) {
  statusPill.querySelector('span').textContent = text;
  statusPill.classList.toggle('resting', !live);
}

function loadScene(id) {
  const s = sceneById(id);
  const changed = s.id !== state.scene;
  state.scene = s.id;
  if (!state.hourTouched) { state.hour = s.hour; syncHourUI(); }
  if (!state.weatherTouched) { state.weather = s.weather; syncWeatherUI(); }
  setPalette(s); setPoster(s); syncSceneUI();
  if (changed || !frame) {
    if (frame) { frame.remove(); frame = null; frameReady = false; }
    stopHints();
    if (liveStarted && s.available) createFrame(s);
  }
  if (!liveStarted) startLive();
}

function startLive() {
  if (liveStarted) return;
  liveStarted = true;
  $('#playLive').hidden = true;
  const s = sceneById(state.scene);
  if (s.available) createFrame(s);
}

function createFrame(s) {
  performance.mark('wp:iframe-start');
  const f = document.createElement('iframe');
  f.title = `${s.name} — live wallpap scene. Click and move inside it to interact.`;
  f.setAttribute('allow', 'autoplay');
  f.src = sceneURL(s);
  f.addEventListener('load', () => onFrameLoad(f), { once: true });
  poster.after(f);
  frame = f; frameReady = false;
  setPill('Loading…', false);
}

function onFrameLoad(f) {
  if (f !== frame) return;
  frameReady = true;
  performance.mark('wp:iframe-ready');
  try {
    // Hide the scenes' developer HUD (same-origin), and listen for activity inside.
    const doc = f.contentDocument, win = f.contentWindow;
    const st = doc.createElement('style');
    st.textContent = '#hud{display:none!important}';
    doc.head.appendChild(st);
    win.addEventListener('pointerdown', onSceneDown, { passive: true });
    win.addEventListener('pointermove', onSceneActivity, { passive: true });
  } catch (e) { /* cross-origin preview: fine, postMessage still works */ }
  pushAll();
  startHints();
  if (!revealedOnce) scheduleReveal();
  const q = afterLoad; afterLoad = [];
  q.forEach((fn) => setTimeout(fn, 250));
}
$('#playLive').addEventListener('click', startLive);

// Start on intent: hovering, touching or focusing anything in the playground.
['pointerenter', 'pointerdown', 'focusin'].forEach((ev) => playground.addEventListener(ev, () => { if (!saveData) startLive(); }, { once: true, passive: true }));

// ─── Energy: pause when offscreen / tab hidden / "resting" ───────────────────
let stageVisible = true, restDemo = false, restTimer = 0, focusSent = null;
function wantFocus() { return stageVisible && !document.hidden && !restDemo; }
function applyFocus() {
  const f = wantFocus();
  if (frameReady && f !== focusSent) { post('focus', f); focusSent = f; }
  // Fade the live scene in over its poster only once it is actually rendering
  // (a scene paused before its first frame would otherwise show black).
  if (frameReady && (f || DEV_VIRTUAL) && !frame.classList.contains('ready')) {
    const fr = frame;
    setTimeout(() => { if (fr === frame) fr.classList.add('ready'); }, 400);
  }
  if (!liveStarted) setPill('Preview', false);
  else if (frameReady) setPill(stageVisible && restDemo ? 'Resting · not rendering' : f ? 'Live' : 'Paused', f);
}
document.addEventListener('visibilitychange', applyFocus);
new IntersectionObserver((entries) => {
  entries.forEach((e) => { stageVisible = e.isIntersecting && e.intersectionRatio > 0.12; });
  applyFocus();
  document.body.classList.toggle('pg-in-view', stageVisible);
  if (stageVisible) startHints(); else { stopHints(); closeMenu(); }
}, { threshold: [0, 0.12, 0.4] }).observe(screen);

function armRest() {
  clearTimeout(restTimer);
  if (state.windowShown) restTimer = setTimeout(() => { restDemo = true; applyFocus(); }, 6000);
}
function wake() {
  if (restDemo) { restDemo = false; applyFocus(); }
  armRest();
}
let lastAct = 0;
function onSceneActivity() {
  const now = performance.now();
  if (now - lastAct < 250) return;
  lastAct = now; wake();
}
function onSceneDown() { wake(); hideHintFor(14000); soundHint.hidden = true; closeMenu(); clearSelection(); }
screen.addEventListener('pointerenter', wake);

// ─── Show Desktop (the translucent app window) ───────────────────────────────
function setWindow(shown, arm = true) {
  state.windowShown = shown;
  appWindow.classList.toggle('away', !shown);
  $('#qDesktop').setAttribute('aria-pressed', String(shown));
  $('#qDesktopSub').textContent = shown ? 'window open' : 'desktop shown';
  if (shown) { if (arm) armRest(); } else wake();
}
let revealedOnce = true, revealTimer = 0;
function scheduleReveal() {
  revealedOnce = true;
  revealTimer = setTimeout(() => setWindow(false), reduceMotion ? 1200 : 2600);
}
setWindow(false, false);

// ─── Hints over the scene ────────────────────────────────────────────────────
let hintTimer = 0, hintIdx = 0, hintMuteUntil = 0;
function startHints() {
  stopHints();
  const s = sceneById(state.scene);
  if (!frameReady || !s.hints || !stageVisible) return;
  const tick = () => {
    if (performance.now() < hintMuteUntil || state.windowShown || !waveMenu.hidden) hintPill.classList.remove('show');
    else {
      hintPill.textContent = s.hints[hintIdx++ % s.hints.length];
      hintPill.classList.add('show');
      setTimeout(() => hintPill.classList.remove('show'), 4200);
    }
    hintTimer = setTimeout(tick, 7000);
  };
  hintTimer = setTimeout(tick, 2200);
}
function stopHints() { clearTimeout(hintTimer); hintPill.classList.remove('show'); }
function hideHintFor(ms) { hintMuteUntil = performance.now() + ms; hintPill.classList.remove('show'); }

// ─── Audio: needs a gesture; try to start it from the parent's click ─────────
function primeAudio(needed) {
  const LW = sceneLW();
  if (!LW) return;
  try { LW.audio(); } catch (e) {}
  setTimeout(() => {
    const ctx = LW._ctx;
    soundHint.hidden = (ctx && ctx.state === 'running') || !needed || !state.sound;
  }, 400);
}

// ─── Scene bar (dock-style, grouped by category) ─────────────────────────────
function badge(s) { return s.tier === 'pro' ? '<span class="badge pro">Pro</span>' : '<span class="badge">Free</span>'; }
function renderSceneBar() {
  $('#sceneBar').innerHTML = CATS.map((c) => `
    <div class="sb-group" role="group" aria-label="${c}">
      <p class="sb-label" aria-hidden="true">${c}</p>
      <div class="sb-tiles">${SCENES.filter((s) => s.cat === c).map((s) => `
        <button class="sb-tile" type="button" data-scene="${s.id}" aria-pressed="${s.id === state.scene}" aria-label="${s.name} (${c}, ${s.tier === 'pro' ? 'Pro' : 'Free'})"${s.available ? '' : ' disabled'}>
          <span class="sb-thumb"><img src="img/${s.id}-xs.jpg" alt="" width="256" height="160" loading="lazy" decoding="async">${s.tier === 'pro' ? '<span class="sb-pro" aria-hidden="true">Pro</span>' : ''}</span>
          <span class="sb-name">${s.name}</span>
        </button>`).join('')}
      </div>
    </div>`).join('');
}
$('#sceneBar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-scene]');
  if (b) { loadScene(b.dataset.scene); b.scrollIntoView({ behavior: smooth(), block: 'nearest', inline: 'nearest' }); }
});

function syncSceneUI() {
  const s = sceneById(state.scene);
  $$('#sceneBar [data-scene]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.scene === state.scene)));
  $('#pName').textContent = s.name;
  $('#pBadge').innerHTML = badge(s);
  $('#pCat').textContent = `${s.cat}${s.music ? ' · music controls' : ''}`;
  $('#sceneTips').innerHTML = (s.hints || []).slice(0, 3).map((h) => `<li>${h}</li>`).join('');
  $$('#panel [data-for]').forEach((p) => { p.hidden = p.dataset.for !== s.id; });
  $('#sceneActions').innerHTML = (s.actions || []).map(([a, label]) => `<button class="btn btn-small btn-soft" type="button" data-action="${a}">${label}</button>`).join('');
  renderMenu();
}
$('#sceneActions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  whenReady(() => post('action', b.dataset.action)); primeAudio(false); flash(b); wake(); hideHintFor(8000);
});

// ─── Time of day ─────────────────────────────────────────────────────────────
const hourInput = $('#hour'), hourOut = $('#hourOut');
function fmtHour(h, upper) {
  const H = Math.floor(h) % 24, M = Math.round((h - Math.floor(h)) * 60) % 60;
  const ap = H < 12 ? 'am' : 'pm', h12 = H % 12 || 12;
  return `${h12}:${String(M).padStart(2, '0')} ${upper ? ap.toUpperCase() : ap}`;
}
function phase(h) {
  if (h < 5 || h >= 21) return 'night';
  if (h < 7.5) return 'dawn';
  if (h < 17) return 'day';
  if (h < 19.6) return 'golden hour';
  return 'dusk';
}
function syncHourUI() {
  hourInput.value = state.hour;
  hourOut.textContent = fmtHour(state.hour);
  hourInput.setAttribute('aria-valuetext', `${fmtHour(state.hour)}, ${phase(state.hour)}`);
  const day = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  $('#mbClock').textContent = `${day} ${fmtHour(state.hour, true)}`;
}
let envRaf = 0;
hourInput.addEventListener('input', () => {
  state.hour = +hourInput.value; state.hourTouched = true; syncHourUI();
  cancelAnimationFrame(envRaf);
  envRaf = requestAnimationFrame(() => post('env', { hour: state.hour }));
  wake();
});

// ─── Weather ─────────────────────────────────────────────────────────────────
$('#wxChips').innerHTML = WEATHER.map(([k, label, svg]) =>
  `<button class="chip" type="button" role="radio" aria-checked="${k === state.weather}" data-wx="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>${label}</button>`).join('');
function syncWeatherUI() { $$('#wxChips [data-wx]').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.wx === state.weather))); }
function setWeather(w) {
  state.weather = w; state.weatherTouched = true; syncWeatherUI(); renderMenu();
  post('env', { weather: w });
  if (w === 'rain' || w === 'storm') primeAudio(false);
  wake();
}
$('#wxChips').addEventListener('click', (e) => { const b = e.target.closest('[data-wx]'); if (b) setWeather(b.dataset.wx); });
radioKeys($('#wxChips'));

// ─── Features (shared by the panel, the 〰 menu and the “Try it” buttons) ────
function flash(btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 900); }
function remind(kind) { whenReady(() => post('reminder', kind)); primeAudio(false); hideHintFor(9000); wake(); }
function setCalm(on) {
  state.calm = on;
  $('#qBreathe').setAttribute('aria-pressed', String(on));
  pushSettings(); post('calm', on);
  if (on) primeAudio(false);
  renderMenu(); wake();
}
function setBreath(p) {
  state.breath = p;
  $('#qBreathe small').textContent = { box: 'box 4·4·4·4', calm: 'calm 4·6', 478: 'relax 4·7·8' }[p];
  pushSettings();
  if (state.calm) { post('calm', false); post('calm', true); }
  renderMenu();
}
function setSound(on) {
  state.sound = on;
  $('#qSound').setAttribute('aria-pressed', String(on)); $('#qSoundSub').textContent = on ? 'on' : 'muted';
  post('mute', 0, 0, !on);
  if (on) primeAudio(true); else soundHint.hidden = true;
  renderMenu();
}
function setBus(bus, on) {
  state.buses[bus] = on;
  if (on && !state.sound) setSound(true);
  post('audio', { [bus]: { on } }); primeAudio(on); renderMenu(); wake();
}
function setAmbient(kind) {
  state.ambient = kind;
  if (kind !== 'off' && !state.sound) setSound(true);
  post('ambient', { kind, volume: 0.35 }); primeAudio(kind !== 'off'); renderMenu(); wake();
}
function setAgents(style) { state.agentStyle = style; pushAgents(); renderMenu(); wake(); }
function setRest() { setWindow(true, false); clearTimeout(restTimer); restDemo = true; applyFocus(); }

$('#qBreathe').addEventListener('click', () => { if (!state.calm) setBreath('box'); setCalm(!state.calm); });
$('#qWater').addEventListener('click', (e) => { remind('water'); flash(e.currentTarget); });
$('#qSound').addEventListener('click', () => setSound(!state.sound));
$('#qDesktop').addEventListener('click', () => { revealedOnce = true; clearTimeout(revealTimer); setWindow(!state.windowShown); });

// ─── Bowls: auto mode + set ──────────────────────────────────────────────────
function segPick(group, attr, val) { $$(`#${group} [data-${attr}]`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === val))); }
$('#autoSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-auto]'); if (!b) return;
  state.auto = b.dataset.auto; segPick('autoSeg', 'auto', state.auto);
  pushSettings(); primeAudio(state.auto !== 'off'); wake();
});
$('#setSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-set]'); if (!b) return;
  state.set = b.dataset.set; segPick('setSeg', 'set', state.set);
  pushSettings(); wake();
});
radioKeys($('#autoSeg')); radioKeys($('#setSeg'));

// ─── Music Mode: a demo "now playing" with generated cover art ───────────────
const artCache = {};
function coverArt(t, size = 300) {
  if (artCache[t.title]) return artCache[t.title];
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), [a, b, d] = t.colors;
  const bg = g.createLinearGradient(0, 0, 0, size); bg.addColorStop(0, a); bg.addColorStop(0.55, b); bg.addColorStop(1, d);
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  g.globalAlpha = 0.9; g.fillStyle = '#fff3e2';
  g.beginPath(); g.arc(size * 0.62, size * 0.42, size * 0.16, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {                       // soft hills / waves
    g.fillStyle = `rgba(10,6,14,${0.18 + i * 0.1})`;
    g.beginPath(); g.moveTo(0, size);
    for (let x = 0; x <= size; x += 8) g.lineTo(x, size * (0.58 + i * 0.07) + Math.sin(x / (30 + i * 9) + i * 1.7) * size * 0.03);
    g.lineTo(size, size); g.fill();
  }
  g.fillStyle = 'rgba(255,245,230,.9)'; g.font = `italic ${size * 0.075}px "Instrument Serif", Georgia, serif`;
  g.fillText(t.album, size * 0.07, size * 0.13);
  return (artCache[t.title] = c.toDataURL('image/jpeg', 0.85));
}
function pushNowPlaying() {
  const t = TRACKS[state.track];
  post('nowplaying', state.npOn ? { title: t.title, artist: t.artist, album: t.album, artwork: coverArt(t), playing: state.playing, app: 'Music' } : null);
}
function setMusic(on) {
  state.npOn = on; state.playing = on;
  // Music Mode lives in the rooms with a player — hop to the Record Store if needed.
  if (on && !sceneById(state.scene).music) loadScene('records');
  pushNowPlaying(); syncBeat(); renderMenu(); wake();
  if (on) { hintPill.textContent = `♪ ${TRACKS[state.track].title} — demo track`; hintPill.classList.add('show'); setTimeout(() => hintPill.classList.remove('show'), 4000); }
}
function nextTrack() { state.track = (state.track + 1) % TRACKS.length; state.playing = true; pushNowPlaying(); renderMenu(); }
let beatTimer = 0, beatN = 0;
function syncBeat() {
  clearInterval(beatTimer);
  if (!(state.beatSync && state.npOn && state.playing)) return;
  beatTimer = setInterval(() => {     // a steady ~118 bpm "live" analysis feed
    const on = beatN++ % 2 === 0;
    post('beat', on ? { l: 0.8, b: 0.95, m: 0.6, h: 0.4, k: 1 } : { l: 0.35, b: 0.25, m: 0.35, h: 0.25, k: 0 });
  }, 254);
}

// ─── The 〰 menu: mirrors the real app's menu-bar menu ───────────────────────
const waveBtn = $('#waveBtn'), waveMenu = $('#waveMenu');
let menuSub = null, menuActs = [];
const KEYS = { koi: '⌘1', grass: '⌘2', cats: '⌘3', cafe: '⌘4', bowls: '⌘5' };
const radio = (label, on, act, extra = {}) => ({ label, role: 'menuitemradio', checked: on, act, ...extra });
const check = (label, on, act, extra = {}) => ({ label, role: 'menuitemcheckbox', checked: on, act, ...extra });
function menuModel() {
  const cur = sceneById(state.scene);
  return [
    { title: 'wallpap' },
    { label: 'Unlock Pro — $5 one-time…', act: () => { closeMenu(); openModal(); } },
    'sep',
    ...CATS.map((c) => ({
      key: `cat:${c}`, label: cur.cat === c ? `${c} — ${cur.name}` : c, mark: cur.cat === c,
      sub: SCENES.filter((s) => s.cat === c).map((s) => radio(s.name, s.id === state.scene, () => loadScene(s.id), { pro: s.tier === 'pro', kbd: KEYS[s.id], close: true })),
    })),
    'sep',
    check('Calm · Breathe', state.calm, () => setCalm(!state.calm), { kbd: '⌘B', pro: true }),
    { key: 'breath', label: 'Breathing Pattern', indent: true, sub: [
      radio('Box — in · hold · out · hold (4-4-4-4)', state.breath === 'box', () => setBreath('box')),
      radio('Calm — in 4 · out 6', state.breath === 'calm', () => setBreath('calm')),
      radio('Relax — 4-7-8', state.breath === '478', () => setBreath('478')),
    ] },
    { key: 'weather', label: 'Weather', sub: [
      { label: 'Live — your local weather (in the app)', disabled: true, pro: true },
      'sep',
      ...WEATHER.map(([k, l]) => radio(l, state.weather === k, () => setWeather(k))),
    ] },
    { key: 'water', label: 'Water Reminder', pro: true, sub: [
      ...[0, 30, 45, 60, 90].map((m) => radio(m ? `Every ${m} min` : 'Off', state.waterEvery === m, () => { state.waterEvery = m; renderMenu(); })),
      'sep',
      { label: 'Remind Me Now', act: () => remind('water') },
      { label: 'Stretch Now', act: () => remind('stretch') },
    ] },
    { key: 'sounds', label: 'Sounds', sub: [
      check('Interaction Sounds', state.buses.fx, () => setBus('fx', !state.buses.fx)),
      check('Scene Ambience', state.buses.ambience, () => setBus('ambience', !state.buses.ambience)),
      check('Weather Sounds', state.buses.weather, () => setBus('weather', !state.buses.weather)),
    ] },
    { key: 'soundscape', label: 'Soundscape', pro: true, sub: [
      radio('Off', state.ambient === 'off', () => setAmbient('off')),
      'sep',
      ...[['white', 'White Noise'], ['pink', 'Pink Noise'], ['brown', 'Brown Noise'], ['rain', 'Rain'], ['ocean', 'Ocean'], ['fire', 'Fireplace'], ['stream', 'Stream']]
        .map(([k, l]) => radio(l, state.ambient === k, () => setAmbient(k))),
    ] },
    { key: 'agents', label: 'AI Companions', pro: true, sub: [
      radio('Off', state.agentStyle === 'off', () => setAgents('off')),
      radio('In the Scene', state.agentStyle === 'native', () => setAgents('native')),
      radio('As Characters (Clawd & Codex)', state.agentStyle === 'characters', () => setAgents('characters')),
    ] },
    check('Music Mode (Music / Spotify)', state.npOn, () => setMusic(!state.npOn), { pro: true }),
    ...(state.npOn ? [
      { label: `♪ ${TRACKS[state.track].title} — next track`, indent: true, act: nextTrack },
      check('Beat Sync — react to the music', state.beatSync, () => { state.beatSync = !state.beatSync; syncBeat(); renderMenu(); }, { indent: true }),
    ] : []),
    'sep',
    { label: 'Quit wallpap', kbd: '⌘Q', act: () => { $('#wmNote').hidden = false; }, keep: true },
  ];
}
function renderItem(it) {
  if (it === 'sep') return '<hr>';
  if (it.title) return `<div class="wm-title">${it.title}</div>`;
  const i = menuActs.push(it) - 1;
  const role = it.sub ? 'menuitem' : it.role || 'menuitem';
  const aria = it.sub ? ` aria-haspopup="menu" aria-expanded="${menuSub === it.key}"` : it.checked !== undefined ? ` aria-checked="${it.checked}"` : '';
  const cls = [it.indent && 'ind', it.mark && 'mark', it.sub && 'has-sub'].filter(Boolean).join(' ');
  const right = it.sub ? '<span class="wm-arrow" aria-hidden="true">›</span>' : it.kbd ? `<kbd>${it.kbd}</kbd>` : '';
  const btn = `<button role="${role}" type="button" data-mi="${i}"${aria}${cls ? ` class="${cls}"` : ''}${it.disabled ? ' disabled' : ''}><span class="wm-l">${it.label}${it.pro ? ' <span class="wm-pro">Pro</span>' : ''}</span>${right}</button>`;
  if (!it.sub || menuSub !== it.key) return btn;
  return `${btn}<div class="wm-sub" role="menu" aria-label="${it.label}">${it.sub.map(renderItem).join('')}</div>`;
}
function renderMenu() {
  if (waveMenu.hidden) return;
  const focused = document.activeElement && waveMenu.contains(document.activeElement) ? document.activeElement.dataset.mi : null;
  menuActs = [];
  waveMenu.innerHTML = menuModel().map(renderItem).join('') + '<p class="wm-note" id="wmNote" hidden>Quitting gives you back your normal wallpaper — wallpap never changes it.</p>';
  if (focused != null) { const b = waveMenu.querySelector(`[data-mi="${focused}"]`); if (b) b.focus({ preventScroll: true }); }
}
function openMenu(sub = null) {
  startLive();
  menuSub = sub; waveMenu.hidden = false; waveBtn.setAttribute('aria-expanded', 'true');
  $('#menuTip').classList.remove('show'); waveBtn.classList.remove('pulse');
  renderMenu(); stopHints();
  const target = (sub && waveMenu.querySelector('[aria-expanded="true"]')) || waveMenu.querySelector('button:not(:disabled)');
  if (target) { target.focus({ preventScroll: true }); if (sub) target.scrollIntoView({ block: 'nearest' }); }
}
function closeMenu() { if (waveMenu.hidden) return; waveMenu.hidden = true; waveBtn.setAttribute('aria-expanded', 'false'); startHints(); }
waveBtn.addEventListener('click', (e) => { e.stopPropagation(); waveMenu.hidden ? openMenu() : closeMenu(); });
waveMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  const b = e.target.closest('[data-mi]'); if (!b || b.disabled) return;
  const it = menuActs[+b.dataset.mi];
  if (it.sub) { menuSub = menuSub === it.key ? null : it.key; renderMenu(); return; }
  if (it.act) it.act();
  // Checkboxes/radios leave the menu open so you can compare; actions close it.
  if (it.close || (!it.role && !it.keep)) closeMenu(); else renderMenu();
});
waveMenu.addEventListener('keydown', (e) => {
  const items = $$('button:not(:disabled)', waveMenu), i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { closeMenu(); waveBtn.focus(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
  else if (e.key === 'ArrowRight' && document.activeElement.classList.contains('has-sub') && document.activeElement.getAttribute('aria-expanded') === 'false') { e.preventDefault(); document.activeElement.click(); }
  else if (e.key === 'ArrowLeft' && menuSub) { e.preventDefault(); menuSub = null; renderMenu(); }
});
document.addEventListener('click', (e) => { if (!e.target.closest('#waveMenu, #waveBtn')) closeMenu(); });

// Desktop icons: single-click selection, like Finder.
function clearSelection() { $$('.desk-icons button').forEach((b) => b.classList.remove('sel')); }
$$('.desk-icons button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); clearSelection(); b.classList.add('sel'); }));
document.addEventListener('click', (e) => { if (!e.target.closest('.desk-icons')) clearSelection(); });

// Arrow-key support for radio groups built from buttons.
function radioKeys(group) {
  group.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = $$('[role="radio"]', group), i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    n.focus(); n.click();
  });
}

// ─── Mobile: controls live in a bottom sheet ─────────────────────────────────
function setSheet(open) {
  panel.classList.toggle('open', open); scrim.hidden = !open;
  sheetBtn.setAttribute('aria-expanded', String(open));
  if (open) { startLive(); $('#panelClose').focus({ preventScroll: true }); }
}
sheetBtn.addEventListener('click', () => setSheet(!panel.classList.contains('open')));
$('#panelClose').addEventListener('click', () => setSheet(false));
scrim.addEventListener('click', () => setSheet(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) setSheet(false); });

// ─── “Try it ↑”: back to the playground, feature switched on ─────────────────
const TRY = {
  water: () => remind('water'),
  calm: () => { setBreath('box'); setCalm(true); },
  audio: () => { setSound(true); openMenu('sounds'); },
  music: () => setMusic(true),
  weather: () => { setWeather(state.weather === 'rain' ? 'snow' : 'rain'); },
  agents: () => setAgents('native'),
  rest: () => setRest(),
};
$$('[data-try]').forEach((b) => b.addEventListener('click', () => {
  const fn = TRY[b.dataset.try]; if (!fn) return;
  startLive();
  stage.scrollIntoView({ behavior: smooth(), block: 'center' });
  // Let the scroll land (the scene resumes rendering when it is back in view).
  setTimeout(() => whenReady(fn), reduceMotion ? 50 : 650);
}));

// ─── Gallery ─────────────────────────────────────────────────────────────────
const GALLERY = [
  {scene:'train',img:'train',title:'Indian Train',text:'Blue berths. Chai by the window. Fields passing outside.',env:{hour:21,weather:'clear'}},
  {scene:'cats',img:'cats',title:'Santorini Cats',text:'Five cats with a terrace to themselves.',env:{hour:18.6,weather:'clear'}},
  {scene:'cafe',img:'cafe',title:'Night Café',text:'Rain on the glass and a record on the turntable.',env:{hour:22,weather:'rain'}},
  {scene:'grass',img:'grass',title:'Touch Grass',text:'A bamboo grove, two pandas and their cub.',env:{hour:11,weather:'clear'}},
  {scene:'cabin',img:'cabin',title:'Snowy Cabin',text:'A fireplace and fresh snow outside.',env:{hour:20,weather:'snow'}},
  {scene:'bowls',img:'bowls',title:'Singing Bowls',text:'Strike a bowl or circle its rim to make it sing.',env:{hour:19.2,weather:'clear'}}
];
function renderGallery() {
  $('#galGrid').innerHTML = GALLERY.map((g, i) => {
    const s = sceneById(g.scene);
    const set = `img/${g.img}-sm.jpg 720w, img/${g.img}.jpg 1440w`;
    const sizes = '(max-width: 720px) 100vw, 600px';
    return `<button class="gal-item${g.wide ? ' wide' : ''}" type="button" data-gal="${i}" aria-label="${g.title} — open ${s.name} in the playground">
      <img src="img/${g.img}-sm.jpg" srcset="${set}" sizes="${sizes}" alt="" loading="lazy" decoding="async" width="720" height="450" onerror="this.style.visibility='hidden'">
      <span class="gal-cap"><span class="gal-title">${g.title}</span><span class="gal-text">${g.text}</span>${badge(s)}</span>
    </button>`;
  }).join('');
}
$('#galGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-gal]'); if (!b) return;
  const g = GALLERY[+b.dataset.gal];
  state.hour = g.env.hour; state.hourTouched = true; state.weather = g.env.weather; state.weatherTouched = true;
  if (g.set) { state.set = g.set; segPick('setSeg', 'set', g.set); }
  syncHourUI(); syncWeatherUI();
  stage.scrollIntoView({ behavior: smooth(), block: 'center' });
  if (g.scene === state.scene && frameReady) pushAll(); else loadScene(g.scene);
  if (g.music) whenReady(() => setMusic(true));
});

// ─── Download / Buy / Waitlist ───────────────────────────────────────────────
const dlToast = $('#dlToast');
let toastTimer = 0;
$$('[data-download]').forEach((a) => {
  a.href = DOWNLOAD_URL;
  a.addEventListener('click', () => {
    clearTimeout(toastTimer);
    setTimeout(() => { dlToast.hidden = false; }, 500);
    toastTimer = setTimeout(() => { dlToast.hidden = true; }, 20000);
  });
});
$('#dlToastX').addEventListener('click', () => { dlToast.hidden = true; clearTimeout(toastTimer); });

const modal = $('#proModal');
function openModal() {
  $('#proAsk').hidden = false; $('#proThanks').hidden = true; $('#proErr').hidden = true;
  if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
  $('#proAsk .email-row').hidden = !WAITLIST_URL;
  setTimeout(() => (WAITLIST_URL ? $('#proEmail') : $('#proAsk .release-link a')).focus(), 60);
}
if (BUY_URL) {   // checkout is open: drop the "not available yet" wording
  $$('[data-buy]').forEach((b) => { b.textContent = 'Get Pro — $5'; });
  $$('.soon-note').forEach((n) => { n.textContent = 'One-time $5. Your license key arrives by email.'; });
}
$$('[data-buy]').forEach((b) => b.addEventListener('click', () => {
  if (BUY_URL) { location.href = BUY_URL; return; }
  openModal();
}));
$('#proForm').addEventListener('submit', async (e) => {
  if (!e.submitter || e.submitter.value !== 'join') return;     // close buttons just close
  e.preventDefault();
  const input = $('#proEmail'), email = input.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $('#proErr').hidden = false; input.focus(); return; }
  if (!WAITLIST_URL) return;
  const submit=$('#proSubmit');submit.disabled=true;
  try {
    const response=await fetch(WAITLIST_URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email,source:'wallpap.live'})});
    if(!response.ok)throw new Error('Request failed');
  }catch(e){$('#proErr').textContent='Couldn’t save your email. Please try again.';$('#proErr').hidden=false;submit.disabled=false;return;}
  submit.disabled=false;
  input.value = '';
  $('#proAsk').hidden = true; $('#proThanks').hidden = false;
  $('#proThanks .btn').focus();
});

// ─── Reveal on scroll ────────────────────────────────────────────────────────
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach((el) => io.observe(el));
$('#year').textContent = new Date().getFullYear();

// ─── Boot ────────────────────────────────────────────────────────────────────
async function checkAvailability() {
  // build-site.sh writes scenes/manifest.json: which scenes shipped, which have stills.
  try {
    const m = await (await fetch('scenes/manifest.json', { cache: 'no-cache' })).json();
    SCENES.forEach((s) => { s.available = m.scenes.includes(s.id); s.still = (m.stills || []).includes(s.id); });
  } catch (e) { /* file:// or offline: keep the defaults */ }
}
{
  const s = sceneById(state.scene);
  state.hour = s.hour; state.weather = s.weather;
  renderSceneBar(); renderGallery(); syncHourUI(); syncWeatherUI(); setPalette(s); setPoster(s); syncSceneUI(); applyFocus();
}
const idle = (fn, t) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, 200));
const boot = () => checkAvailability().then(() => {
  renderSceneBar();
  if (saveData) { $('#playLive').hidden = false; return; }
  // Nobody touched it yet: go live once the page is idle, if the playground is on screen.
  idle(() => { if (stageVisible && !liveStarted) startLive(); }, 1500);

});
if (document.readyState === 'complete') boot();
else addEventListener('load', () => idle(boot, 600));
// Scene comes back into view later and was never started: start it then.
new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && document.readyState === 'complete' && !saveData) idle(() => { if (stageVisible) startLive(); }, 1500); }, { threshold: 0.3 }).observe(screen);
