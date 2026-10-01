'use strict';
/* wallpap — landing page script. Plain JS, no build. */

// ─── Fill these in ────────────────────────────────────────────────────────────
// Direct download of the latest release (GitHub Releases asset).
const DOWNLOAD_URL = 'https://github.com/sameeeeeeep/wallpap/releases/latest/download/wallpap.dmg';
// TODO(payments): set to the checkout URL once a provider is chosen
// (Lemon Squeezy / Paddle / Gumroad / a Stripe Payment Link). While empty,
// every "Get Pro" button opens the "Pro is launching soon" waitlist modal.
const BUY_URL = '';
// TODO(optional): an endpoint that accepts {email} as JSON POST (Formspree,
// Buttondown, a Worker…). While empty, the waitlist just says thank you and
// nothing leaves the browser.
const WAITLIST_URL = '';
// ─────────────────────────────────────────────────────────────────────────────

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => matchMedia('(max-width: 720px)').matches;
document.documentElement.classList.remove('no-js');

// ─── Scenes ──────────────────────────────────────────────────────────────────
// palette: c1 deep base, c2 mid light, c3 warm glow, accent (buttons/links tint)
const SCENES = [
  {
    id: 'koi', name: 'Koi Pond', file: 'koi.html', tier: 'free', hour: 16, poster: 'img/koi.jpg',
    desc: 'Ripples, caustics, nine koi',
    palette: ['#0a1513', '#143a33', '#4a3220', '#f0a868'],
    hints: ['Click the water to drop food', 'Press and hold — the koi nibble your fingertip', 'Tap a koi to boop it', 'Keep the cursor still — they come to see you'],
  },
  {
    id: 'bowls', name: 'Singing Bowls', file: 'bowls.html', tier: 'pro', hour: 19.2, poster: 'img/bowls.jpg',
    desc: 'Candlelit, tuned, resonant',
    palette: ['#100b08', '#3a2412', '#5c3518', '#f2c27e'],
    hints: ['Click a bowl to strike it', 'Rest on a bowl for 1.5 s, then circle to make it sing', 'Try Auto · Focus below'],
  },
  {
    id: 'cats', name: 'Cats', file: 'cats.html', tier: 'free', hour: 18.6, poster: 'img/cats.jpg',
    desc: 'Santorini, at golden hour',
    palette: ['#141a33', '#3c3d6c', '#b86a78', '#f6b98e'],
    hints: ['Click a cat — purr or meow', 'Click the terrace to toss the yarn', 'Whisk your cursor — they pounce', 'Feed them below, or fill their water bowl'],
  },
  {
    id: 'grass', name: 'Touch Grass', file: 'grass.html', tier: 'free', hour: 11, poster: 'img/grass.jpg',
    desc: 'A meadow, pandas, soaring kites',
    palette: ['#0e1a12', '#24472c', '#6f7f3a', '#d9e7a6'],
    hints: ['Brush through the meadow with your cursor', 'Click a panda — or the cub', 'Look up — black kites soar on the thermals'],
    soon: 'Touch Grass is being planted — a sunlit meadow with pandas and soaring kites.',
  },
  {
    id: 'cafe', name: 'Night Café', file: 'cafe.html', tier: 'pro', hour: 22, poster: 'img/cafe.jpg',
    desc: 'Music Mode, late and slow',
    palette: ['#160f18', '#3b2135', '#6b3a2c', '#f0b07a'],
    hints: ['Your track lands on the record sleeve', 'The mood follows your music', 'Pick “Next track” below'],
    soon: 'Night Café is brewing — a cat, a dog, and your music on the chalkboard.',
  },
];
SCENES.forEach((s) => { s.available = s.still = ['koi', 'bowls', 'cats'].includes(s.id); });
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

const state = {
  scene: 'koi', hour: 16, hourTouched: false, weather: 'clear',
  calm: false, ambient: 'off', sound: true, auto: 'off', set: 'tibetan7',
  track: 0, playing: true, windowShown: true,
};

// ─── Elements ────────────────────────────────────────────────────────────────
const screen = $('#screen'), poster = $('#poster'), soonArt = $('#soonArt');
const statusPill = $('#statusPill'), hintPill = $('#hintPill'), soundHint = $('#soundHint');
const appWindow = $('#appWindow'), showDesktopBtn = $('#showDesktop');
let frame = null, frameReady = false;

// ─── Messaging to the live scene ─────────────────────────────────────────────
function post(type, ...args) {
  if (!frame || !frameReady || !frame.contentWindow) return;
  const origin = location.origin && location.origin !== 'null' ? location.origin : '*';
  frame.contentWindow.postMessage({ __lw: [type, ...args] }, origin);
}
function sceneLW() { try { return frame && frame.contentWindow && frame.contentWindow.LW; } catch (e) { return null; } }

function pushAll() {
  const s = sceneById(state.scene);
  post('env', { hour: state.hour, weather: state.weather });
  post('mute', 0, 0, !state.sound);
  post('calm', state.calm);
  post('ambient', { kind: state.ambient, volume: 0.35 });
  if (s.id === 'bowls') post('settings', { auto: state.auto, set: state.set });
  if (s.id === 'cafe') pushNowPlaying();
  post('focus', wantFocus());
}

// ─── Loading scenes (exactly one iframe at a time) ───────────────────────────
const DEV_VIRTUAL = new URLSearchParams(location.search).has('virtual');
const saveData = !!(navigator.connection && navigator.connection.saveData);
let liveAllowed = !saveData;

function setPalette(s) {
  const r = document.documentElement.style;
  ['--c1', '--c2', '--c3', '--accent'].forEach((k, i) => r.setProperty(k, s.palette[i]));
  document.body.dataset.scene = s.id;
}

function sceneURL(s) {
  const q = new URLSearchParams({ hour: state.hour.toFixed(2), weather: state.weather, fps: isMobile() ? '30' : '60' });
  if (state.calm) q.set('calm', '1');
  if (DEV_VIRTUAL) q.set('virtual', '1');   // dev: step the scene by hand via LW.advance()
  return `scenes/${s.file}?${q}`;
}

function loadScene(id, { scroll = false } = {}) {
  const s = sceneById(id);
  state.scene = s.id;
  if (!state.hourTouched) { state.hour = s.hour; syncHourUI(); }
  setPalette(s);
  syncSceneUI();
  setPoster(s);
  if (frame) { frame.remove(); frame = null; frameReady = false; }
  stopHints();
  $('#stage').classList.toggle('is-soon', !s.available);
  if (!s.available) {
    soonArt.hidden = false; soonArt.dataset.scene = s.id;
    $('#soonTitle').textContent = s.name;
    $('#soonText').textContent = s.soon || 'Coming soon.';
    statusPill.style.opacity = 0; $('#playLive').hidden = true; soundHint.hidden = true;
  } else {
    soonArt.hidden = true;
    statusPill.style.opacity = '';
    if (!liveAllowed) { $('#playLive').hidden = false; }
    else createFrame(s);
  }
  if (scroll) $('#stage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
}

function setPoster(s) {
  if (!s.still) { poster.style.visibility = 'hidden'; return; }
  poster.style.visibility = '';
  poster.onerror = () => { poster.style.visibility = 'hidden'; };
  if (poster.getAttribute('src') !== s.poster) poster.src = s.poster;
}

function createFrame(s) {
  $('#playLive').hidden = true;
  const f = document.createElement('iframe');
  f.title = `${s.name} — live wallpap scene. Click and move inside it to interact.`;
  f.setAttribute('allow', 'autoplay');
  f.setAttribute('loading', 'eager');
  f.src = sceneURL(s);
  f.addEventListener('load', () => onFrameLoad(f), { once: true });
  poster.after(f);
  frame = f; frameReady = false;
}

function onFrameLoad(f) {
  if (f !== frame) return;
  frameReady = true;
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
  focusSent = null; applyFocus();
  startHints();
  if (!revealedOnce) scheduleReveal();
}

$('#playLive').addEventListener('click', () => { liveAllowed = true; loadScene(state.scene); });

// ─── Energy: pause when offscreen / tab hidden / "resting" behind the window ─
let inView = true, restDemo = false, restTimer = 0, focusSent = null;
function wantFocus() { return inView && !document.hidden && !restDemo; }
function applyFocus() {
  const f = wantFocus();
  if (frameReady && f !== focusSent) { post('focus', f); focusSent = f; }
  // Fade the live scene in over its poster only once it is actually rendering
  // (a scene paused before its first frame would otherwise show black).
  if (frameReady && (f || DEV_VIRTUAL) && !frame.classList.contains('ready')) {
    const fr = frame;
    setTimeout(() => { if (fr === frame) fr.classList.add('ready'); }, 450);
  }
  const resting = inView && restDemo;
  statusPill.classList.toggle('resting', !f);
  statusPill.querySelector('span').textContent = resting ? 'Resting · not rendering' : f ? 'Live' : 'Paused';
}
new IntersectionObserver((entries) => {
  entries.forEach((e) => { inView = e.isIntersecting && e.intersectionRatio > 0.15; });
  applyFocus();
  if (inView) startHints(); else stopHints();
}, { threshold: [0, 0.15, 0.4] }).observe($('#stage'));
document.addEventListener('visibilitychange', applyFocus);

function armRest() {
  clearTimeout(restTimer);
  if (state.windowShown) restTimer = setTimeout(() => { restDemo = true; applyFocus(); }, 5000);
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
function onSceneDown() {
  wake();
  hideHintFor(14000);
  soundHint.hidden = true;
  closeMenu();
  clearSelection();
}
screen.addEventListener('pointerenter', wake);

// ─── Show Desktop (the translucent app window) ───────────────────────────────
function setWindow(shown, arm = true) {
  state.windowShown = shown;
  appWindow.classList.toggle('away', !shown);
  showDesktopBtn.setAttribute('aria-pressed', String(!shown));
  showDesktopBtn.querySelector('span').textContent = shown ? 'Show Desktop' : 'Bring back the window';
  if (shown) { if (arm) armRest(); } else wake();
}
showDesktopBtn.addEventListener('click', () => { revealedOnce = true; clearTimeout(revealTimer); setWindow(!state.windowShown); });
let revealedOnce = false, revealTimer = 0;
function scheduleReveal() {
  revealedOnce = true;
  revealTimer = setTimeout(() => setWindow(false), reduceMotion ? 1200 : 2600);
}
setWindow(true, false);

// ─── Hints over the scene ────────────────────────────────────────────────────
let hintTimer = 0, hintIdx = 0, hintMuteUntil = 0;
function startHints() {
  stopHints();
  const s = sceneById(state.scene);
  if (!s.available || !s.hints || !inView) return;
  const tick = () => {
    if (performance.now() < hintMuteUntil || state.windowShown) { hintPill.classList.remove('show'); }
    else {
      hintPill.textContent = s.hints[hintIdx++ % s.hints.length];
      hintPill.classList.add('show');
      setTimeout(() => hintPill.classList.remove('show'), 4200);
    }
    hintTimer = setTimeout(tick, 6000);
  };
  hintTimer = setTimeout(tick, 1600);
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
    const running = ctx && ctx.state === 'running';
    soundHint.hidden = running || !needed || !state.sound;
  }, 400);
}

// ─── Scene tabs, wave menu, scene-specific panels ────────────────────────────
function badge(s) {
  if (!s.available) return '<span class="badge soon">Soon</span>';
  return s.tier === 'pro' ? '<span class="badge pro">Pro</span>' : '<span class="badge">Free</span>';
}
function renderTabs() {
  $('#sceneTabs').innerHTML = SCENES.map((s) => `
    <button class="tab" role="tab" type="button" id="tab-${s.id}" aria-selected="${s.id === state.scene}" aria-controls="stage" data-scene="${s.id}">
      <span class="tab-thumb"><span class="art art-${s.id}"></span>${s.still ? `<img src="${s.poster.replace('.jpg', '-sm.jpg')}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
      <span class="tab-text">
        <span class="tab-name">${s.name} ${badge(s)}</span>
        <span class="tab-desc">${s.desc}</span>
      </span>
    </button>`).join('');
  $('#wmScenes').innerHTML = SCENES.map((s, i) => `
    <button role="menuitemradio" type="button" aria-checked="${s.id === state.scene}" data-wm-scene="${s.id}" ${s.available ? '' : 'disabled'}>
      ${s.name}${s.available ? '' : ' — soon'} <kbd>⌘${i + 1}</kbd></button>`).join('');
}
$('#sceneTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-scene]');
  if (b) loadScene(b.dataset.scene);
});
$('#sceneTabs').addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
  const tabs = $$('.tab'), i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[n].focus(); loadScene(tabs[n].dataset.scene);
});

function syncSceneUI() {
  $$('.tab').forEach((t) => {
    const on = t.dataset.scene === state.scene;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  $$('[data-wm-scene]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.wmScene === state.scene)));
  const s = sceneById(state.scene);
  const panel = s.available ? s.id : 'soon';
  $$('#ctlScene [data-for]').forEach((p) => { p.hidden = p.dataset.for !== panel; });
  $('#sceneCtlTitle').textContent = !s.available ? `${s.name} · coming soon` : s.id === 'bowls' ? 'Singing Bowls' : s.id === 'cats' ? 'The cats' : s.id === 'cafe' ? 'Music Mode' : 'In this scene';
}

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
$('#hourNow').addEventListener('click', () => {
  const d = new Date();
  state.hour = Math.round((d.getHours() + d.getMinutes() / 60) * 4) / 4; state.hourTouched = true;
  syncHourUI(); post('env', { hour: state.hour }); wake();
});

// ─── Weather ─────────────────────────────────────────────────────────────────
$('#wxChips').innerHTML = WEATHER.map(([k, label, svg]) =>
  `<button class="chip" type="button" role="radio" aria-checked="${k === state.weather}" data-wx="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>${label}</button>`).join('');
$('#wxChips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-wx]');
  if (!b) return;
  state.weather = b.dataset.wx;
  $$('#wxChips [data-wx]').forEach((c) => c.setAttribute('aria-checked', String(c === b)));
  post('env', { weather: state.weather });
  if (state.weather === 'rain' || state.weather === 'storm') primeAudio(false);
  wake();
});
radioKeys($('#wxChips'));

// ─── Wellbeing ───────────────────────────────────────────────────────────────
function flash(btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 900); }
$('#remindWater').addEventListener('click', (e) => { post('reminder', 'water'); primeAudio(false); flash(e.currentTarget); wake(); hideHintFor(9000); });
$('#remindStretch').addEventListener('click', (e) => { post('reminder', 'stretch'); flash(e.currentTarget); wake(); hideHintFor(9000); });
const calmToggle = $('#calmToggle');
function setCalm(on) {
  state.calm = on; calmToggle.checked = on;
  $$('[data-wm="calm"]').forEach((b) => b.setAttribute('aria-checked', String(on)));
  post('calm', on); if (on) primeAudio(false); wake();
}
calmToggle.addEventListener('change', () => setCalm(calmToggle.checked));

// ─── Sound ───────────────────────────────────────────────────────────────────
$('#ambient').addEventListener('change', (e) => {
  state.ambient = e.target.value;
  if (state.ambient !== 'off' && !state.sound) setSound(true);
  post('ambient', { kind: state.ambient, volume: 0.35 });
  primeAudio(state.ambient !== 'off');
  wake();
});
const soundToggle = $('#soundToggle');
function setSound(on) {
  state.sound = on; soundToggle.checked = on;
  $$('[data-wm="sound"]').forEach((b) => b.setAttribute('aria-checked', String(on)));
  post('mute', 0, 0, !on);
  if (on) primeAudio(state.ambient !== 'off'); else soundHint.hidden = true;
}
soundToggle.addEventListener('change', () => setSound(soundToggle.checked));

// ─── Bowls: auto mode + set ──────────────────────────────────────────────────
function segPick(group, attr, val) { $$(`#${group} [data-${attr}]`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === val))); }
$('#autoSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-auto]'); if (!b) return;
  state.auto = b.dataset.auto; segPick('autoSeg', 'auto', state.auto);
  post('settings', { auto: state.auto, set: state.set });
  primeAudio(state.auto !== 'off'); wake();
});
$('#setSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-set]'); if (!b) return;
  state.set = b.dataset.set; segPick('setSeg', 'set', state.set);
  post('settings', { auto: state.auto, set: state.set }); wake();
});
radioKeys($('#autoSeg')); radioKeys($('#setSeg'));

// ─── Cats: actions ───────────────────────────────────────────────────────────
$$('[data-action]').forEach((b) => b.addEventListener('click', () => { post('action', b.dataset.action); primeAudio(false); flash(b); wake(); hideHintFor(8000); }));

// ─── Café: a demo "now playing" with generated cover art ─────────────────────
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
  const img = g.getImageData(0, 0, size, size), px = img.data;   // a little grain
  for (let i = 0; i < px.length; i += 4) { const n = (Math.random() - 0.5) * 16; px[i] += n; px[i + 1] += n; px[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(255,245,230,.9)'; g.font = `italic ${size * 0.075}px "Instrument Serif", Georgia, serif`;
  g.fillText(t.album, size * 0.07, size * 0.13);
  return (artCache[t.title] = c.toDataURL('image/jpeg', 0.85));
}
function renderTrack() {
  const t = TRACKS[state.track];
  $('#npTitle').textContent = t.title; $('#npArtist').textContent = `${t.artist} — ${t.album}`;
  const cv = $('#npArt'), g = cv.getContext('2d'), im = new Image();
  im.onload = () => g.drawImage(im, 0, 0, cv.width, cv.height); im.src = coverArt(t);
  const tg = $('#npToggle'); tg.textContent = state.playing ? 'Pause' : 'Play'; tg.setAttribute('aria-pressed', String(state.playing));
}
function pushNowPlaying() {
  const t = TRACKS[state.track];
  post('nowplaying', { title: t.title, artist: t.artist, album: t.album, artwork: coverArt(t), playing: state.playing, app: 'Music' });
}
$('#npToggle').addEventListener('click', () => { state.playing = !state.playing; renderTrack(); pushNowPlaying(); wake(); });
$('#npNext').addEventListener('click', () => { state.track = (state.track + 1) % TRACKS.length; state.playing = true; renderTrack(); pushNowPlaying(); wake(); });

// ─── The menu-bar wave menu inside the mockup ────────────────────────────────
const waveBtn = $('#waveBtn'), waveMenu = $('#waveMenu');
function openMenu() {
  waveMenu.hidden = false; waveBtn.setAttribute('aria-expanded', 'true'); $('#wmNote').hidden = true;
  const first = waveMenu.querySelector('button:not(:disabled)'); if (first) first.focus();
}
function closeMenu() { if (waveMenu.hidden) return; waveMenu.hidden = true; waveBtn.setAttribute('aria-expanded', 'false'); }
waveBtn.addEventListener('click', (e) => { e.stopPropagation(); waveMenu.hidden ? openMenu() : closeMenu(); });
waveMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.wmScene) { loadScene(b.dataset.wmScene); closeMenu(); return; }
  const k = b.dataset.wm;
  if (k === 'calm') setCalm(!state.calm);
  if (k === 'water') post('reminder', 'water');
  if (k === 'sound') setSound(!state.sound);
  if (k === 'quit') { $('#wmNote').hidden = false; return; }
  closeMenu();
});
waveMenu.addEventListener('keydown', (e) => {
  const items = $$('button:not(:disabled)', waveMenu), i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { closeMenu(); waveBtn.focus(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
});
document.addEventListener('click', closeMenu);

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

// ─── Gallery ─────────────────────────────────────────────────────────────────
const GALLERY = [
  { scene: 'cats', img: 'img/cats.jpg', title: 'Cats on the terrace', text: 'Five cats, one Santorini sunset. They nap, groom, and chase your cursor.', env: { hour: 18.6, weather: 'clear' }, wide: true },
  { scene: 'koi', img: 'img/koi.jpg', title: 'Koi Pond', text: 'Real ripples and caustics. Drop food; hold still and they nibble.', env: { hour: 16, weather: 'clear' }, wide: true },
  { scene: 'bowls', img: 'img/bowls-sm.jpg', title: 'Singing Bowls', text: 'Strike them, or circle a rim until it sings.', env: { hour: 19.2, weather: 'clear' } },
  { scene: 'koi', img: 'img/koi-night-sm.jpg', title: 'Summer night', text: 'Fireflies drift over dark water.', env: { hour: 21.5, weather: 'clear' } },
  { scene: 'cats', img: 'img/cats-rain-sm.jpg', title: 'A rainy afternoon', text: 'Everyone sheltering under the awning.', env: { hour: 12, weather: 'rain' } },
  { scene: 'bowls', img: 'img/bowls-crystal-sm.jpg', title: 'Crystal, in the rain', text: 'Swap to the crystal set for a brighter ring.', env: { hour: 22, weather: 'rain' }, set: 'crystal' },
  { scene: 'koi', img: 'img/koi-rain-sm.jpg', title: 'Rain on the pond', text: 'Rings everywhere. The koi don’t mind.', env: { hour: 11, weather: 'rain' } },
  { scene: 'cats', img: 'img/cats-night-sm.jpg', title: 'Moonlit terrace', text: 'Lanterns on, one cat still up.', env: { hour: 21.5, weather: 'clear' } },
  { scene: 'grass', img: 'img/grass.jpg', title: 'Touch Grass', text: 'A sunlit meadow. Pandas munching bamboo, black kites soaring overhead.', env: { hour: 11, weather: 'clear' }, wide: true },
  { scene: 'cafe', img: 'img/cafe.jpg', title: 'Night Café', text: 'Music Mode: your song on the sleeve, the mood in the room.', env: { hour: 22, weather: 'rain' }, wide: true },
];
function renderGallery() {
  $('#galGrid').innerHTML = GALLERY.map((g, i) => {
    const s = sceneById(g.scene);
    return `<button class="gal-item${g.wide ? ' wide' : ''}" type="button" data-gal="${i}" aria-label="${g.title} — open ${s.name}${s.available ? ' live above' : ' (coming soon)'}">
      <span class="art art-${s.id}" style="position:absolute;inset:0"></span>
      ${s.still ? `<img src="${g.img}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" style="position:relative">` : '<span style="display:block;aspect-ratio:16/10"></span>'}
      <span class="gal-cap"><span class="gal-title">${g.title}</span><span class="gal-text">${g.text}</span>${s.available ? '' : '<span class="badge soon">Soon</span>'}</span>
    </button>`;
  }).join('');
}
$('#galGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-gal]'); if (!b) return;
  const g = GALLERY[+b.dataset.gal];
  state.hour = g.env.hour; state.hourTouched = true; state.weather = g.env.weather;
  if (g.set) { state.set = g.set; segPick('setSeg', 'set', g.set); }
  syncHourUI();
  $$('#wxChips [data-wx]').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.wx === state.weather)));
  if (g.scene === state.scene && frameReady) { pushAll(); $('#stage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); }
  else loadScene(g.scene, { scroll: true });
});

// ─── Download / Buy / Waitlist ───────────────────────────────────────────────
$$('[data-download]').forEach((a) => { a.href = DOWNLOAD_URL; });
const modal = $('#proModal');
function openModal(kind, sceneName) {
  $('#proAsk').hidden = false; $('#proThanks').hidden = true; $('#proErr').hidden = true;
  if (kind === 'scene') {
    $('#proModalTitle').innerHTML = `${sceneName} is <em>almost here.</em>`;
    $('#proModalText').textContent = 'Leave your email and we’ll send a single note when it lands. Nothing else, ever.';
  } else {
    $('#proModalTitle').innerHTML = 'Pro is launching <em>soon.</em>';
    $('#proModalText').textContent = 'Leave your email and we’ll send a single note the day it’s ready. Nothing else, ever.';
  }
  if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
  setTimeout(() => $('#proEmail').focus(), 60);
}
$$('[data-buy]').forEach((b) => b.addEventListener('click', () => {
  if (BUY_URL) { location.href = BUY_URL; return; }
  openModal('pro');
}));
$$('[data-notify]').forEach((b) => b.addEventListener('click', () => openModal('scene', sceneById(state.scene).name)));
$('#proForm').addEventListener('submit', (e) => {
  if (!e.submitter || e.submitter.value !== 'join') return;     // close buttons just close
  e.preventDefault();
  const input = $('#proEmail'), email = input.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $('#proErr').hidden = false; input.focus(); return; }
  if (WAITLIST_URL) {
    fetch(WAITLIST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, source: 'wallpap.live' }) }).catch(() => {});
  }
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
  // build-site.sh writes scenes/manifest.json, so scenes still in progress
  // (grass / cafe) appear automatically once they've been copied in.
  try {
    const m = await (await fetch('scenes/manifest.json', { cache: 'no-cache' })).json();
    SCENES.forEach((s) => { s.available = m.scenes.includes(s.id); s.still = (m.stills || []).includes(s.id); });
  } catch (e) { /* file:// or offline: keep the defaults */ }
}
renderTabs(); renderGallery(); renderTrack(); syncHourUI(); syncSceneUI(); setPalette(sceneById(state.scene));
const boot = () => checkAvailability().then(() => {
  renderTabs(); renderGallery(); syncSceneUI();
  $$('[data-soon]').forEach((el) => { el.hidden = sceneById(el.dataset.soon).available; });
  loadScene(state.scene);
  setTimeout(() => waveBtn.classList.add('pulse'), 3500);
});
if (document.readyState === 'complete') boot();
else addEventListener('load', () => ('requestIdleCallback' in window ? requestIdleCallback(boot, { timeout: 900 }) : setTimeout(boot, 200)));
