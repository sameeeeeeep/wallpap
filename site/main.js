'use strict';
/* wallpap — landing page script. Plain JS, no build.
   Pieces: SceneHost (a Mac screen with one live scene iframe) · Live (only one scene renders at a
   time) · Music (original demo tracks synthesised with WebAudio + beat analysis, fed to the scene
   exactly like the Mac app feeds it) · the real menu-bar panel (scenes/menu.html) · Playground (the
   hero: headline, live scene, picker, controls; fullscreen with the controls dropping from the menu
   bar's wave) · Tour (an opt-in ghost cursor walkthrough) · Try (the feature tiles
   under the hero run their demo in the hero scene). */

// ─── Links ───────────────────────────────────────────────────────────────────
const DOWNLOAD_URL = 'https://github.com/sameeeeeeep/wallpap/releases/latest/download/wallpap.dmg';
// Dodo Payments checkout for wallpap Pro ($5 one-time; Dodo emails a license key the app
// activates). The TEST link only switches on with ?buytest (test cards = free keys).
const BUY_URL_LIVE = 'https://checkout.dodopayments.com/buy/pdt_0NosaY1TW3DDcAxJHpWcE?quantity=1';
const BUY_URL_TEST = 'https://test.checkout.dodopayments.com/buy/pdt_0NosZuADhm7udzYpywSQq?quantity=1';
const qs = new URLSearchParams(location.search);
const BUY_URL = qs.has('buytest') ? BUY_URL_TEST : BUY_URL_LIVE;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const motionMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = motionMQ.matches;
motionMQ.addEventListener('change', (e) => { reduceMotion = e.matches; });
const phoneMQ = matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)');
const phoneClass = () => document.documentElement.classList.toggle('phone-preview', phoneMQ.matches);
phoneMQ.addEventListener('change', phoneClass);
phoneClass();
const saveData = !!(navigator.connection && navigator.connection.saveData);
const smooth = () => (reduceMotion ? 'auto' : 'smooth');
const idle = (fn, t) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, 300));
document.documentElement.classList.remove('no-js');

// Cancellable scripted runs (tour steps).
const ABORT = Symbol('abort');
function newRun() {
  const r = {
    cancelled: false,
    cancel() { r.cancelled = true; },
    check() { if (r.cancelled) throw ABORT; },
    async sleep(ms) {
      const end = performance.now() + ms;
      while (performance.now() < end) { r.check(); await wait(Math.min(120, end - performance.now())); }
      r.check();
    },
  };
  return r;
}

// ─── Scenes ──────────────────────────────────────────────────────────────────
// Same categories (and order) as the app's menu-bar panel.
const CATS = ['Nature', 'Cozy Rooms', 'City Nights', 'Journeys', 'Mindful', 'Music'];
const SCENES = [
  { id: 'koi', name: 'Koi Pond', cat: 'Nature', hour: 16, weather: 'clear', glow: '46 104 92',
    title: 'Feed the fish on your desktop.', pitch: 'Click the water and nine koi come for the food. Hold still and they come to see you.',
    tips: ['Click the water to drop food', 'Press and hold — the koi nibble your fingertip', 'Tap a koi to boop it'] },
  { id: 'grass', name: 'Touch Grass', cat: 'Nature', hour: 11, weather: 'clear', glow: '86 120 60',
    title: 'Touch grass without leaving your desk.', pitch: 'Brush through a bamboo meadow and drop bamboo for two pandas and their cub.',
    tips: ['Brush through the meadow with your cursor', 'Click a panda — or the cub', 'Look up: kites ride the thermals'], actions: [['bamboo', 'Drop some bamboo']] },
  { id: 'cats', name: 'Santorini Cats', cat: 'Nature', hour: 18.6, weather: 'clear', glow: '184 106 120',
    title: 'Five cats. One sunset terrace.', pitch: 'Toss them a toy, fill the water bowl, and get a slow blink back.',
    tips: ['Click a cat — purr or meow', 'Click the terrace to toss the yarn', 'Whisk your cursor and they pounce'], actions: [['feed', 'Feed the cats'], ['water', 'Fill the water bowl'], ['toy', 'Toss a toy']] },
  { id: 'cafe', name: 'Corner Café', cat: 'Cozy Rooms', hour: 22, weather: 'rain', music: true, glow: '150 84 60',
    title: 'A table by the window, on a rainy night.', pitch: 'A cat, a dog and a turntable that plays whatever you’re playing.',
    tips: ['Click the record player to play or pause', 'Your track lands on the record sleeve', 'Click the cat for a slow blink'], actions: [['pet', 'Pet the cat']] },
  { id: 'cabin', name: 'Snowy Cabin', cat: 'Cozy Rooms', hour: 20, weather: 'snow', music: true, glow: '170 90 40',
    title: 'Snow outside. A fire inside.', pitch: 'Click the fire for a crackle of sparks, put a record on, and pet the pup.',
    tips: ['Click the fire for sparks', 'Click the dog — or the cat on the sill', 'Click the window for a gust of snow'], actions: [['pet', 'Pet the pup']] },
  { id: 'records', name: 'Record Store', cat: 'Cozy Rooms', hour: 21, weather: 'clear', music: true, glow: '160 92 52',
    title: 'Your album, in the big frame.', pitch: 'After hours among the crates. Drop the needle and whatever you’re playing fills the shop.',
    tips: ['Click the turntable to drop the needle', 'Your album art fills the big frame', 'Pet the cat, or the pup'], actions: [['pet', 'Pet the cat']] },
  { id: 'speakeasy', name: 'Speakeasy', cat: 'City Nights', hour: 22, weather: 'clear', music: true, glow: '150 60 50',
    title: 'Your playlist, in a 1920s jazz bar.', pitch: 'Your album art goes up in lights, and a ghost plays the piano on the beat.',
    tips: ['Click the piano keys to play a note', 'Your music gives the piano its rhythm', 'Click a cat to make a friend'], actions: [['pet', 'Pet the cat']] },
  { id: 'rooftop', name: 'Rooftop', cat: 'City Nights', hour: 20.5, weather: 'clear', music: true, glow: '80 80 140',
    title: 'String lights, and your music on the projector.', pitch: 'Album art on the wall, and a far-off firework on the big beats.',
    tips: ['Click the boombox to play or pause', 'Click the projector for the next track', 'On a big beat, a far-off firework'], actions: [['pet', 'Pet the cat']] },
  { id: 'ramen', name: 'Ramen Alley', cat: 'City Nights', hour: 22, weather: 'rain', music: true, glow: '150 70 70',
    title: 'Rain, lanterns and a vending machine.', pitch: 'Buy a can, brush the noren curtain and feed the alley cats — with your music on the radio.',
    tips: ['Click the vending machine — a can drops', 'Click the radio to play or pause', 'Brush the noren curtain'], actions: [['feed', 'Feed the cats']] },
  { id: 'train', name: 'Train Journey', cat: 'Journeys', hour: 21.5, weather: 'clear', music: true, glow: '60 90 150',
    title: 'Watch the countryside go by.', pitch: 'An overnight sleeper through fields and stations. Click the window to skip ahead.',
    tips: ['Click the window to skip ahead', 'Try rain on the glass, or a dawn arrival', 'Breathe with the rhythm of the rails'] },
  { id: 'bowls', name: 'Singing Bowls', cat: 'Mindful', hour: 19.2, weather: 'clear', glow: '170 110 50',
    title: 'Strike a bowl. Let it sing.', pitch: 'Tuned singing bowls by candlelight. Strike one, or circle its rim until it sings.',
    tips: ['Click a bowl to strike it', 'Rest on a bowl, then circle to make it sing', 'Calm mode breathes with the candles'] },
  { id: 'cymatics', name: 'Cymatics', cat: 'Music', hour: 19, weather: 'clear', music: true, glow: '120 110 100',
    title: 'See your music in sand.', pitch: 'A vibrating plate where sand forms a new figure for every track — and jumps on the beat.',
    tips: ['Each track draws its own figure', 'Skip a track and the sand flows to the next', 'Sand jumps on the kick'] },
];
const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];
const WEATHER = [
  ['clear', 'Clear', '<circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M5.6 18.4l1-1M17.4 6.6l1-1"/>'],
  ['cloudy', 'Cloudy', '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 18z"/>'],
  ['rain', 'Rain', '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3"/>'],
  ['storm', 'Storm', '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.3 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>'],
  ['snow', 'Snow', '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>'],
  ['fog', 'Fog', '<path d="M4 9h16M3 13h18M5 17h14"/>'],
];
const WX_WIDGET = { clear: [22, 'Sunny', 'Clear'], cloudy: [18, 'Cloudy', 'Cloudy'], rain: [14, 'Rain', 'Rain'], storm: [13, 'Thunderstorms', 'Thunderstorms'], snow: [-2, 'Snow', 'Snow'], fog: [11, 'Fog', 'Fog'] };
const VIEW_HOURS = { sunrise: 6.4, day: 12, sunset: 18.6, evening: 20.5, night: 23 };
const AGENTS = [{ id: 'c1', kind: 'claude', project: 'wallpap', state: 'working' }, { id: 'x1', kind: 'codex', project: 'site', state: 'working' }];
const localHour = () => { const d = new Date(); return d.getHours() + Math.floor(d.getMinutes() / 15) / 4; };
function fmtHour(h, upper) {
  const H = Math.floor(h) % 24, M = Math.round((h - Math.floor(h)) * 60) % 60;
  const ap = H < 12 ? 'am' : 'pm';
  return `${H % 12 || 12}:${String(M).padStart(2, '0')} ${upper ? ap.toUpperCase() : ap}`;
}
const isNight = (h) => h < 6 || h >= 20;

// ─── Add to desktop ─────────────────────────────────────────────────────────
const Desktop = {
  pending: null,
  init() {
    this.sheet = $('#appSheet');
    this.launcher = WallpapLinks.createLauncher({ win: window, doc: document,
      storage: { getItem: (k) => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v), removeItem: (k) => localStorage.removeItem(k) },
      navigate: (url) => { location.href = url; },
      showFallback: (request) => this.show(request),
      onHandled: () => { if (this.sheet.open) this.sheet.close(); },
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-add-scene]');
      if (b) this.open(b.dataset.addScene);
    });
    $('#appSheetRetry').addEventListener('click', () => {
      const request = this.pending;
      this.sheet.close();
      if (request) this.open(request.id, request.look);
    });
    $('#appSheetClose').addEventListener('click', () => this.sheet.close());
    this.sheet.addEventListener('click', (e) => {
      const r = this.sheet.getBoundingClientRect();
      if (e.target === this.sheet && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) this.sheet.close();
    });
  },
  open(id, look) {
    Tour.userActivity();
    this.launcher.open(id, look);
  },
  show(request) {
    this.pending = request;
    const name = sceneById(request.id).id === request.id ? sceneById(request.id).name : request.id;
    $('#appSheetTitle').textContent = request.mac ? 'Get wallpap for Mac' : 'wallpap is a Mac app';
    $('#appSheetDetail').textContent = request.mac
      ? `Install wallpap, then come back to add ${name}. If it’s already open, use a version that supports Add to desktop.`
      : 'Visit wallpap.live on your Mac to download the app and add this scene to your desktop.';
    $('#appSheetRetry').hidden = !request.mac;
    // A modal in the fullscreen element remains visible in Safari as well as overlay mode.
    const parent = document.fullscreenElement || document.webkitFullscreenElement || $('.screen.is-fs') || document.body;
    if (this.sheet.parentElement !== parent) parent.append(this.sheet);
    if (!this.sheet.open) this.sheet.showModal();
  },
};

// ─── Demo music: five original tracks, synthesised in the browser ─────────────
// Chords are MIDI voicings (one per bar unless `per` says otherwise); `bass` = roots.
const TRACKS = [
  { title: 'Paper Lanterns', artist: 'Mira Sol', album: 'Night Market', app: 'Spotify', bpm: 82, swing: 0.2, style: 'lofi', bars: 16, seed: 11, art: 'lanterns',
    chords: [[53, 57, 60, 64], [53, 59, 64, 69], [52, 55, 59, 62], [52, 55, 57, 60]], bass: [38, 43, 36, 45] },
  { title: 'Slow Hours', artist: 'Marigold Static', album: 'Lamplight', app: 'Music', bpm: 72, swing: 0.16, style: 'lofi', bars: 16, seed: 23, art: 'sun',
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59], [46, 50, 53, 57], [52, 55, 57, 60], [50, 53, 55, 58], [48, 53, 55, 58]], bass: [41, 40, 38, 36, 34, 33, 31, 36] },
  { title: 'Rain on the Window', artist: 'June Harbor', album: 'Paper Moons', app: 'Music', bpm: 86, swing: 0.14, style: 'rain', bars: 16, seed: 37, art: 'rain',
    chords: [[55, 59, 60, 64], [55, 57, 60, 64], [53, 57, 60, 64], [56, 59, 62, 65]], bass: [45, 41, 38, 40] },
  { title: 'Two Sugars', artist: 'Velvet Kettle', album: 'Back Booth', app: 'Spotify', bpm: 112, swing: 0.32, style: 'jazz', bars: 16, seed: 41, art: 'cup',
    chords: [[53, 57, 60, 64], [53, 57, 60, 62], [53, 55, 58, 62], [52, 55, 58, 60]], bass: [41, 38, 43, 36] },
  { title: 'Low Tide', artist: 'Ostra', album: 'Shoreline', app: 'Music', bpm: 66, swing: 0.1, style: 'ambient', bars: 16, seed: 53, art: 'tide', per: 2,
    chords: [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 53, 57, 59, 64], [43, 50, 55, 57, 62]], bass: [36, 33, 29, 31] },
];
// Drum patterns: 16 steps per bar, values = velocity.
const PAT = {
  lofi: { k: [1, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0.85, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0.16], h: [0.6, 0, 0.32, 0, 0.55, 0, 0.32, 0, 0.6, 0, 0.32, 0, 0.55, 0, 0.4, 0.22], hat: 'hat', snare: 'snare' },
  rain: { k: [1, 0, 0, 0, 0, 0, 0.45, 0, 0, 0, 0.9, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0], h: [0.4, 0.18, 0.3, 0.18, 0.4, 0.18, 0.3, 0.18, 0.4, 0.18, 0.3, 0.18, 0.4, 0.18, 0.3, 0.24], hat: 'hat', snare: 'snare' },
  jazz: { k: [0.45, 0, 0, 0, 0, 0, 0, 0, 0.35, 0, 0, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0], h: [0.8, 0, 0, 0, 0.7, 0, 0, 0.5, 0.8, 0, 0, 0, 0.7, 0, 0, 0.5], hat: 'ride', snare: 'brush' },
  ambient: { k: [0.55, 0, 0, 0, 0, 0, 0, 0, 0.38, 0, 0, 0, 0, 0, 0, 0], s: [], h: [0.24, 0.1, 0.17, 0.1, 0.24, 0.1, 0.17, 0.1, 0.24, 0.1, 0.17, 0.1, 0.24, 0.1, 0.17, 0.12], hat: 'shaker', snare: null },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Procedural cover art (data URL), one per track, in the site's calm palette.
const artCache = {};
function artFor(t, size = 320) {
  if (artCache[t.title]) return artCache[t.title];
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), S = size, R = mulberry(t.seed);
  const grad = (stops, x0 = 0, y0 = 0, x1 = 0, y1 = S) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; };
  if (t.art === 'lanterns') {
    g.fillStyle = grad(['#2c1b33', '#1a1124', '#100a16']); g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,220,180,.25)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-10, S * 0.2); g.quadraticCurveTo(S * 0.5, S * 0.38, S + 10, S * 0.18); g.stroke();
    [[0.24, 0.36, 0.11], [0.52, 0.45, 0.14], [0.8, 0.33, 0.1]].forEach(([x, y, r]) => {
      const cx = S * x, cy = S * y, rr = S * r;
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, rr * 2.6); glow.addColorStop(0, 'rgba(255,170,90,.42)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
      g.fillStyle = glow; g.fillRect(cx - rr * 3, cy - rr * 3, rr * 6, rr * 6);
      const body = g.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.1, cx, cy, rr * 1.1); body.addColorStop(0, '#ffd9a0'); body.addColorStop(0.55, '#e8774a'); body.addColorStop(1, '#9c3530');
      g.fillStyle = body; g.beginPath(); g.ellipse(cx, cy, rr * 0.86, rr, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a2028'; g.fillRect(cx - rr * 0.35, cy - rr * 1.08, rr * 0.7, rr * 0.16); g.fillRect(cx - rr * 0.35, cy + rr * 0.92, rr * 0.7, rr * 0.16);
    });
  } else if (t.art === 'sun') {
    g.fillStyle = grad(['#f4c08c', '#c8707a', '#3a2346']); g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,243,226,.92)'; g.beginPath(); g.arc(S * 0.62, S * 0.42, S * 0.15, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(28,14,34,${0.16 + i * 0.12})`; g.beginPath(); g.moveTo(0, S);
      for (let x = 0; x <= S; x += 6) g.lineTo(x, S * (0.56 + i * 0.07) + Math.sin(x / (28 + i * 9) + i * 1.7) * S * 0.028);
      g.lineTo(S, S); g.fill();
    }
  } else if (t.art === 'rain') {
    g.fillStyle = grad(['#a9cbd9', '#4c6c8a', '#18202f']); g.fillRect(0, 0, S, S);
    const lamp = g.createRadialGradient(S * 0.3, S * 0.62, 0, S * 0.3, S * 0.62, S * 0.4); lamp.addColorStop(0, 'rgba(255,196,130,.55)'); lamp.addColorStop(1, 'rgba(255,196,130,0)');
    g.fillStyle = lamp; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(220,235,245,.35)';
    for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S, l = 6 + R() * 18; g.lineWidth = 0.6 + R(); g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.12, y + l); g.stroke(); }
    g.fillStyle = 'rgba(235,245,250,.5)';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(R() * S, R() * S, 1 + R() * 2.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(16,22,32,.9)'; g.fillRect(S * 0.5 - 3, 0, 6, S); g.fillRect(0, S * 0.48 - 3, S, 6);
  } else if (t.art === 'cup') {
    g.fillStyle = grad(['#f3d48f', '#e2a65a'], 0, 0, S, S); g.fillRect(0, 0, S, S);
    const cx = S * 0.55, cy = S * 0.5;
    g.fillStyle = 'rgba(120,60,20,.18)'; g.beginPath(); g.arc(cx + 8, cy + 10, S * 0.32, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f8efdc'; g.beginPath(); g.arc(cx, cy, S * 0.32, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(cx, cy, S * 0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5b341f'; g.beginPath(); g.arc(cx, cy, S * 0.165, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(214,160,110,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, S * 0.11, 0.4, 5.2); g.stroke();
    g.fillStyle = '#fffaf0'; g.fillRect(S * 0.12, S * 0.66, S * 0.08, S * 0.08); g.fillRect(S * 0.2, S * 0.72, S * 0.08, S * 0.08);
  } else {
    g.fillStyle = grad(['#d9e8e2', '#8fbcb8', '#2f5f6b', '#1b3940']); g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,250,236,.9)'; g.beginPath(); g.arc(S * 0.5, S * 0.4, S * 0.09, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(255,250,236,${0.42 - i * 0.04})`; const w = S * (0.16 - i * 0.012); g.fillRect(S * 0.5 - w / 2, S * (0.56 + i * 0.035), w, 2); }
    g.fillStyle = 'rgba(20,46,52,.35)'; for (let i = 0; i < 4; i++) g.fillRect(0, S * (0.53 + i * 0.12), S, 1.2);
  }
  g.fillStyle = 'rgba(255,248,236,.92)'; g.font = `italic ${Math.round(S * 0.085)}px Georgia, "Times New Roman", serif`; g.fillText(t.album, S * 0.07, S * 0.9);
  g.fillStyle = 'rgba(255,248,236,.7)'; g.font = `600 ${Math.round(S * 0.034)}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  if ('letterSpacing' in g) g.letterSpacing = '2px';
  g.fillText(t.artist.toUpperCase(), S * 0.07, S * 0.1);
  return (artCache[t.title] = c.toDataURL('image/jpeg', 0.86));
}

const Music = (() => {
  let ctx = null, mix, master, analyser, verbIn, rhodesIn, drums, crackleGain, noiseBuf, tbuf, fbuf;
  let idx = 0, playing = false, step = 0, nextT = 0, loopT0 = 0, schedTimer = 0, frameTimer = 0;
  const subs = new Set(), vis = [], env = { b: 0, m: 0, h: 0 };
  let kick = 0;
  const A = { peak: [1e-4, 1e-4, 1e-4, 1e-4], sm: [0, 0, 0, 0], bassAvg: 0, last: 0 };
  const M = {
    userPaused: false,
    get track() { return TRACKS[idx]; },
    get playing() { return playing; },
    get index() { return idx; },
    on(fn) { subs.add(fn); return () => subs.delete(fn); },
    nowPlaying() { const t = TRACKS[idx]; return { title: t.title, artist: t.artist, album: t.album, artwork: artFor(t), playing, app: t.app }; },
    progress() { const t = TRACKS[idx], len = t.bars * 16 * stepDur(); const el = playing ? (clock() - loopT0) : step * stepDur(); return { el: ((el % len) + len) % len, len }; },
    play, pause, next, toggle() { if (playing) { M.userPaused = true; pause(); } else { M.userPaused = false; play(); } },
    unmute, mute,
  };
  const emit = (type, data) => subs.forEach((fn) => fn(type, data));
  const clock = () => (ctx ? ctx.currentTime : performance.now() / 1000);
  const stepDur = () => 60 / TRACKS[idx].bpm / 4;

  function play() {
    if (playing) return;
    playing = true;
    nextT = clock() + 0.06; loopT0 = nextT - step * stepDur();
    schedTimer = setInterval(schedule, 25); frameTimer = setInterval(frame, 50);
    schedule();
    if (ctx && master && ctx.state === 'running') master.gain.setTargetAtTime(M.muted ? 0 : 0.72, ctx.currentTime, 0.15);
    emit('state');
  }
  function pause() {
    if (!playing) return;
    playing = false; clearInterval(schedTimer); clearInterval(frameTimer); vis.length = 0;
    // resume from the next bar: keeps the groove intact
    step = (Math.ceil(step / 16) * 16) % (TRACKS[idx].bars * 16);
    if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    emit('state');
  }
  function next(d = 1) {
    idx = (idx + d + TRACKS.length) % TRACKS.length; step = 0;
    if (playing) { nextT = clock() + 0.1; loopT0 = nextT; vis.length = 0; }
    if (crackleGain) crackleGain.gain.value = TRACKS[idx].style === 'ambient' ? 0.006 : 0.02;
    emit('track'); emit('state');
  }
  function schedule() {
    const t = TRACKS[idx], n = t.bars * 16, ahead = clock() + 0.15;
    while (nextT < ahead) {
      const s = step % n;
      if (s === 0) loopT0 = nextT;
      const sw = s % 2 ? t.swing * stepDur() : 0;
      playStep(t, s, nextT + sw);
      nextT += stepDur(); step = (step + 1) % n;
    }
  }
  function playStep(t, s, at) {
    const bar = Math.floor(s / 16), i = s % 16, P = PAT[t.style], per = t.per || 1;
    const ci = Math.floor(bar / per) % t.chords.length, chord = t.chords[ci], root = t.bass[ci];
    const nroot = t.bass[(ci + 1) % t.bass.length], bd = stepDur() * 16, R = mulberry(t.seed * 977 + bar * 31 + i);
    if (P.k[i]) hit('kick', at, P.k[i]);
    if (P.snare && P.s[i]) hit(P.snare, at, P.s[i]);
    if (P.h[i]) hit(P.hat, at, P.h[i] * (0.8 + R() * 0.35));
    // harmony + bass
    if (t.style === 'ambient') {
      if (i === 0 && bar % per === 0) { voice('pad', at, chord, bd * per * 0.98, 0.9); note('bass', at, root, bd * per * 0.9, 0.6); }
    } else if (t.style === 'jazz') {
      if (i === 0 || i === 6 || (i === 11 && R() < 0.5)) voice('rhodes', at, chord, bd * (i === 0 ? 0.22 : 0.16), i === 0 ? 0.8 : 0.62);
      if (i % 4 === 0) {                                             // walking bass, quarter notes
        const q = i / 4, walk = [root, root + (R() < 0.5 ? 4 : 3), root + 7, nroot + (R() < 0.5 ? 1 : -1)];
        note('bass', at, walk[q], bd * 0.24, 0.85);
      }
    } else {
      if (i === 0) voice('rhodes', at, chord, bd * 0.92, 0.85);
      if (i === 10 && t.style === 'lofi') voice('rhodes', at, chord.slice(-2), bd * 0.3, 0.5);
      if (i === 8 && t.style === 'rain') voice('rhodes', at, chord, bd * 0.45, 0.6, 0.025);
      if (i === 0) note('bass', at, root, bd * 0.55, 0.9);
      if (i === 10) note('bass', at, root + (t.style === 'rain' ? 7 : 12), bd * 0.18, 0.7);
      if (i === 14 && R() < 0.5) note('bass', at, nroot - 1, bd * 0.1, 0.55);
    }
    // a soft bell motif
    if (t.style !== 'jazz' && [2, 7, 11, 14].includes(i) && R() < (t.style === 'ambient' ? 0.28 : 0.34)) {
      note('bell', at, chord[Math.floor(R() * chord.length)] + (t.style === 'ambient' ? 24 : 12), 1.4, 0.7);
    }
  }
  function hit(kind, at, v) {
    vis.push({ t: at, kind, v });
    if (!ctx) return;
    if (kind === 'kick') synthKick(at, v);
    else if (kind === 'snare') synthNoise(at, v, 'bandpass', 1800, 0.9, 0.36, 0.004, 0.15, 0.12, 190);
    else if (kind === 'brush') synthNoise(at, v, 'bandpass', 3200, 0.6, 0.14, 0.02, 0.2, 0.15);
    else if (kind === 'hat') synthNoise(at, v, 'highpass', 7600, 0.7, 0.11, 0.002, 0.045, 0);
    else if (kind === 'ride') synthNoise(at, v, 'bandpass', 7800, 1.6, 0.07, 0.002, 0.3, 0.05);
    else if (kind === 'shaker') synthNoise(at, v, 'bandpass', 6200, 1, 0.06, 0.012, 0.07, 0.04);
  }
  function voice(kind, at, chord, dur, v, strum = 0) { vis.push({ t: at, kind: 'chord', v }); chord.forEach((m, j) => note(kind, at + j * strum, m, dur, v)); }
  function note(kind, at, m, dur, v) {
    if (kind === 'bass') vis.push({ t: at, kind: 'bass', v });
    if (!ctx) return;
    const f = mtof(m);
    if (kind === 'rhodes') {
      const g = ctx.createGain(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), g2 = ctx.createGain(), g3 = ctx.createGain();
      o1.frequency.value = f; o2.frequency.value = f * 2.002; o3.frequency.value = f * 7.03;
      g2.gain.value = 0.2; g3.gain.setValueAtTime(0.16, at); g3.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
      const pk = 0.085 * v;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(pk, at + 0.008); g.gain.setTargetAtTime(pk * 0.32, at + 0.01, 0.7); g.gain.setTargetAtTime(0, at + dur, 0.22);
      o1.connect(g); o2.connect(g2).connect(g); o3.connect(g3).connect(g); g.connect(rhodesIn);
      [o1, o2, o3].forEach((o) => { o.start(at); o.stop(at + dur + 1.4); });
    } else if (kind === 'pad') {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 950; lp.Q.value = 0.4;
      const pk = 0.03 * v;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(pk, at + 1.6); g.gain.setTargetAtTime(0, at + dur, 0.9);
      [-7, 7].forEach((c) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; o.connect(lp); o.start(at); o.stop(at + dur + 4); });
      lp.connect(g); g.connect(mix); g.connect(verbIn);
    } else if (kind === 'bass') {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(), o = ctx.createOscillator(), o2 = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 0.7;
      const pk = 0.32 * v;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(pk, at + 0.012); g.gain.setTargetAtTime(pk * 0.6, at + 0.03, 0.25); g.gain.setTargetAtTime(0, at + dur, 0.06);
      o.connect(lp); o2.connect(lp); lp.connect(g).connect(mix);
      o.start(at); o2.start(at); o.stop(at + dur + 0.6); o2.stop(at + dur + 0.6);
    } else if (kind === 'bell') {
      const g = ctx.createGain(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o.frequency.value = f; o2.frequency.value = f * 2.76; g2.gain.value = 0.18;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.045 * v, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); o2.connect(g2).connect(g); g.connect(mix); g.connect(verbIn);
      o.start(at); o2.start(at); o.stop(at + dur + 0.1); o2.stop(at + dur + 0.1);
    }
  }
  function synthKick(at, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(43, at + 0.13);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.9 * v, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
    o.connect(g).connect(drums); o.start(at); o.stop(at + 0.45);
  }
  function synthNoise(at, v, type, freq, q, level, att, dec, verb, tone) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(level * v, at + att); g.gain.exponentialRampToValueAtTime(0.0001, at + att + dec);
    src.connect(f).connect(g).connect(drums); if (verb) { const s = ctx.createGain(); s.gain.value = verb; g.connect(s).connect(verbIn); }
    src.start(at, Math.random() * 0.5); src.stop(at + att + dec + 0.05);
    if (tone) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = tone;
      og.gain.setValueAtTime(0.0001, at); og.gain.exponentialRampToValueAtTime(0.12 * v, at + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      o.connect(og).connect(drums); o.start(at); o.stop(at + 0.1);
    }
  }
  // The audio graph is only built on the first "Play with sound" (a user gesture).
  function initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const before = clock();
    try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { return false; }
    const shift = ctx.currentTime - before;                          // move the running timeline onto the audio clock
    nextT += shift; loopT0 += shift; vis.forEach((e) => { e.t += shift; });
    const sr = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, sr, sr); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    mix = ctx.createGain(); mix.gain.value = 0.9;
    const tape = ctx.createBiquadFilter(); tape.type = 'lowpass'; tape.frequency.value = 7400; tape.Q.value = 0.3;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.35;
    master = ctx.createGain(); master.gain.value = 0;
    mix.connect(tape).connect(comp).connect(master).connect(ctx.destination); comp.connect(analyser);
    // reverb: generated impulse
    const ir = ctx.createBuffer(2, Math.floor(sr * 2.6), sr);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
    const conv = ctx.createConvolver(); conv.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.3;
    verbIn = ctx.createGain(); verbIn.connect(conv).connect(wet).connect(tape);
    // rhodes bus: warm lowpass + slow tremolo
    rhodesIn = ctx.createGain(); const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 2400; const trem = ctx.createGain(); trem.gain.value = 0.9;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 4.2; lfoG.gain.value = 0.1; lfo.connect(lfoG).connect(trem.gain); lfo.start();
    rhodesIn.connect(rlp).connect(trem).connect(mix); const rs = ctx.createGain(); rs.gain.value = 0.28; trem.connect(rs).connect(verbIn);
    drums = ctx.createGain(); drums.gain.value = 0.85; drums.connect(mix);
    // vinyl crackle bed
    const cb = ctx.createBuffer(1, sr * 3, sr); { const d = cb.getChannelData(0); for (let i = 0; i < d.length; i++) { d[i] = (Math.random() * 2 - 1) * 0.04; if (Math.random() < 0.0004) d[i] = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6); } }
    const cs = ctx.createBufferSource(); cs.buffer = cb; cs.loop = true; const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 1400;
    crackleGain = ctx.createGain(); crackleGain.gain.value = TRACKS[idx].style === 'ambient' ? 0.006 : 0.02; cs.connect(chp).connect(crackleGain).connect(mix); cs.start();
    tbuf = new Float32Array(analyser.fftSize); fbuf = new Float32Array(analyser.frequencyBinCount);
    return true;
  }
  function unmute() {
    if (!ctx && !initAudio()) return false;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    M.muted = false;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(playing ? 0.72 : 0, ctx.currentTime, 0.3);
    return true;
  }
  function mute() { M.muted = true; if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }
  M.muted = true;

  // ~20 Hz "beat sync" frames: {l, b, m, h, k} — the same shape the Mac app sends.
  function frame() {
    const n = clock();
    while (vis.length && vis[0].t <= n) {
      const e = vis.shift();
      if (e.kind === 'kick') { env.b = Math.max(env.b, 0.55 + 0.45 * e.v); kick = Math.max(kick, e.v); }
      else if (e.kind === 'bass') env.b = Math.max(env.b, 0.35 + 0.3 * e.v);
      else if (e.kind === 'snare' || e.kind === 'brush') env.m = Math.max(env.m, 0.45 + 0.4 * e.v);
      else if (e.kind === 'chord') env.m = Math.max(env.m, 0.6 * e.v + 0.2);
      else env.h = Math.max(env.h, 0.3 + 0.6 * e.v);
    }
    let f;
    if (ctx && ctx.state === 'running') f = analyse();
    else f = { l: 0.22 + 0.32 * (env.b * 0.5 + env.m * 0.3 + env.h * 0.2), b: env.b, m: env.m, h: env.h, k: kick ? Math.min(1, 0.45 + 0.5 * kick) : 0 };
    kick = 0; env.b *= 0.72; env.m *= 0.86; env.h *= 0.6;
    emit('frame', f);
  }
  // A port of the app's BeatSync (vDSP) to an AnalyserNode: band levels with slow auto-gain,
  // and a beat when the bass jumps clearly above its recent average.
  function analyse() {
    analyser.getFloatTimeDomainData(tbuf); analyser.getFloatFrequencyData(fbuf);
    let rms = 0; for (let i = 0; i < tbuf.length; i++) rms += tbuf[i] * tbuf[i]; rms = Math.sqrt(rms / tbuf.length);
    const hz = ctx.sampleRate / analyser.fftSize;
    const band = (a, b) => { const i0 = Math.max(1, Math.round(a / hz)), i1 = Math.min(fbuf.length - 1, Math.round(b / hz)); let s = 0; for (let i = i0; i <= i1; i++) s += Math.pow(10, fbuf[i] / 20); return s / (i1 - i0 + 1); };
    const raw = [rms, band(47, 190), band(190, 1900), band(1900, 9400)], out = [];
    for (let i = 0; i < 4; i++) {
      A.peak[i] = Math.max(A.peak[i] * 0.998, raw[i], 1e-4);
      const v = Math.min(1, raw[i] / A.peak[i]);
      A.sm[i] += (v - A.sm[i]) * (v > A.sm[i] ? 0.5 : 0.12); out[i] = A.sm[i];
    }
    const now = performance.now() / 1000, bass = raw[1] / A.peak[1];
    let beat = 0;
    if (bass > A.bassAvg * 1.45 && bass > 0.25 && now - A.last > 0.28 && raw[0] > 1e-3) { beat = Math.min(1, (bass - A.bassAvg) * 2.2); A.last = now; }
    A.bassAvg += (bass - A.bassAvg) * 0.1;
    return { l: out[0], b: out[1], m: out[2], h: out[3], k: beat };
  }
  return M;
})();

// ─── Sound (global): one switch for the music and the scene's own sounds ─────
const Sound = {
  on: false,
  set(on) {
    this.on = on;
    if (on) {
      Music.unmute();
      const h = Live.owner;
      if (h && h.music && !Music.playing) { Music.userPaused = false; syncMusic(); }
    } else Music.mute();
    HOSTS.forEach((h) => { h.post('mute', 0, 0, !on); if (on) h.primeAudio(); else h.soundHint(false); });
    $$('[data-sound-toggle], .mp-snd').forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      const l = b.querySelector('span'); if (l) l.textContent = on ? 'Sound on' : 'Play with sound';
      if (b.classList.contains('mp-snd')) b.setAttribute('aria-label', on ? 'Mute' : 'Play with sound');
    });
    HOSTS.forEach((h) => h.renderPanel());
  },
  toggle() { this.set(!this.on); },
};
document.addEventListener('click', (e) => { if (e.target.closest('[data-sound-toggle]')) Sound.toggle(); });

// ─── SVG bits for the Mac desktop ────────────────────────────────────────────
const APPLE = '<svg class="apple" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg>';
const WAVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 13c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/></svg>';
const WIFI = '<svg class="mb-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18.5l2.2-2.6a3.4 3.4 0 0 0-4.4 0zM5.6 11.6a9.4 9.4 0 0 1 12.8 0l-1.6 1.9a6.9 6.9 0 0 0-9.6 0zM2.4 7.9a14 14 0 0 1 19.2 0l-1.6 1.9a11.5 11.5 0 0 0-16 0z" fill="currentColor"/></svg>';
const BATT = '<svg class="mb-ico batt" viewBox="0 0 30 14" aria-hidden="true"><rect x=".75" y=".75" width="25" height="12.5" rx="3.5" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.5"/><rect x="3" y="3" width="17" height="8" rx="1.6" fill="currentColor"/><rect x="27" y="4.5" width="2" height="5" rx="1" fill="currentColor" fill-opacity=".6"/></svg>';
const CURSOR = '<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M2 2v24.5l6.2-6 4.1 9.4 4.2-1.8-4-9.3h8.7z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const ICO = {
  prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9.5 12z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l10.5-7z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
  snd: '<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z"/><path class="sw-on" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
};
const WX_ICON = { clear: WEATHER[0][2], cloudy: WEATHER[1][2], rain: WEATHER[2][2], storm: WEATHER[3][2], snow: WEATHER[4][2], fog: WEATHER[5][2], moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>' };
function chromeHTML(o) {
  return `<div class="menubar">
  <div class="mb-left" aria-hidden="true">${APPLE}<b>Finder</b><span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span></div>
  <div class="mb-right">
    <button class="desktop-add" type="button">Add to desktop</button>
    <button class="wave-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Open the wallpap menu-bar panel">${WAVE}</button>
    ${WIFI}${BATT}<span class="clock" aria-hidden="true">Fri 4:00 PM</span>
  </div>
</div>
<div class="widgets" aria-hidden="true">
  <div class="wg wg-wx"><div><div class="wg-city">Lisbon</div><div class="wg-temp">22°</div></div><div class="wg-cond"><svg class="wg-ic" viewBox="0 0 24 24">${WX_ICON.clear}</svg><span class="wg-c">Sunny</span><span>H:24° L:16°</span></div></div>
  <div class="wg wg-cal"><div><div class="wg-day">FRIDAY</div><div class="wg-date">3</div></div><div class="wg-ev">No more events today</div></div>
</div>
<ul class="desk-icons" aria-hidden="true">
  <li><span class="di di-folder"></span><span class="di-label">Projects</span></li>
  <li><span class="di di-doc"></span><span class="di-label">notes.md</span></li>
  <li><span class="di di-img"></span><span class="di-label">Screenshot</span></li>
</ul>
<div class="app-window away" aria-hidden="true">
  <div class="aw-bar"><i></i><i></i><i></i><span>notes.md</span></div>
  <div class="aw-body"><p class="aw-h">Today</p><p><i class="cb"></i>Finish the onboarding copy</p><p><i class="cb"></i>Review Maya’s designs</p><p><i class="cb on"></i>Inbox to zero <span>(ish)</span></p></div>
</div>
<div class="mplayer away" role="group" aria-label="Now playing (demo music)">
  <div class="mp-art"></div>
  <div class="mp-meta"><span class="mp-app"><i></i><span class="mp-appname">Spotify</span></span><span class="mp-title">—</span><span class="mp-artist">—</span></div>
  <div class="mp-bar"><span class="mp-cur">0:00</span><span class="mp-track"><i></i></span><span class="mp-len">0:00</span></div>
  <div class="mp-ctl"><button type="button" class="mp-prev" aria-label="Previous track">${ICO.prev}</button><button type="button" class="mp-pp" aria-label="Pause">${ICO.pause}</button><button type="button" class="mp-next" aria-label="Next track">${ICO.next}</button><button type="button" class="mp-snd" aria-pressed="false" aria-label="Play with sound">${ICO.snd}</button></div>
</div>
<div class="rcard away" role="status">
  <div class="rc-top"><span class="rc-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4h10l-1.3 15.2a2 2 0 0 1-2 1.8h-3.4a2 2 0 0 1-2-1.8z"/><path d="M7.6 10h8.8"/></svg></span><span class="rc-t"><b>A sip of water?</b><span>Small sips, all day.</span></span></div>
  <div class="rc-acts"><button type="button" class="main" data-rc>Done</button><button type="button" data-rc>Snooze 10 min</button></div>
</div>
<div class="panel-pop away" role="dialog" aria-label="wallpap menu-bar panel (preview)"></div>
<div class="panel-note" hidden></div>
${o.interactive ? '<div class="status-pill"><i></i><span>Preview</span></div>' : ''}`;
}

// ─── The real menu-bar panel (scenes/menu.html) ──────────────────────────────
// Loaded once as text and embedded via srcdoc, with a tiny shim standing in for the app's
// WKWebView bridge, so its buttons talk to this page instead of the Mac app.
let panelSrc = null;
async function getPanelSrc() {
  if (!panelSrc) {
    const r = await fetch('scenes/menu.html');
    if (!r.ok) throw new Error('menu.html missing');
    panelSrc = (await r.text()).replace('<head>', '<head><base href="scenes/"><script>window.webkit={messageHandlers:{panel:{postMessage:function(m){try{parent.__wpPanel(window.frameElement,m)}catch(e){}}}}};<\/script>');
  }
  return panelSrc;
}
window.__wpPanel = (frameEl, m) => { const h = HOSTS.find((x) => x.panelFrame === frameEl); if (h) h.onPanel(m); };

// ─── SceneHost: one Mac screen, at most one live scene ───────────────────────
const HOSTS = [];
class SceneHost {
  constructor(screen, o) {
    this.screen = screen; this.name = o.name; this.interactive = !!o.interactive;
    this.sceneId = o.scene || 'koi';
    const s = sceneById(this.sceneId);
    this.env = { hour: s.hour, weather: s.weather };
    this.calm = false; this.breath = 'box'; this.music = false; this.paused = false;
    this.soundscape = 'off'; this.water = 45; this.energy = 'away';
    this.pst = { precise: false, avoidIcons: true, login: true, fps: 30, away: 120, layoutMode: 'auto', breathEvery: 0, overApps: true, companions: 'off', ssVol: 0.35, audio: { fx: true, ambience: true, weather: true } };
    this.frame = null; this.ready = false; this.active = false; this.ratio = 0; this.wantLive = !!o.wantLive;
    this.subs = new Set(); this.waiters = []; this.switchTok = 0; this.w = screen.clientWidth || 800;
    this.poster = $('.poster', screen);
    screen.insertAdjacentHTML('beforeend', chromeHTML(o));
    const q = (c) => $(c, screen);
    this.el = { clock: q('.clock'), wave: q('.wave-btn'), wgTemp: q('.wg-temp'), wgCond: q('.wg-c'), wgIc: q('.wg-ic'), wgDay: q('.wg-day'), wgDate: q('.wg-date'),
      win: q('.app-window'), player: q('.mplayer'), art: q('.mp-art'), app: q('.mp-appname'), title: q('.mp-title'), artist: q('.mp-artist'), cur: q('.mp-cur'), len: q('.mp-len'), bar: q('.mp-track i'),
      prev: q('.mp-prev'), pp: q('.mp-pp'), next: q('.mp-next'), snd: q('.mp-snd'), card: q('.rcard'), pop: q('.panel-pop'), note: q('.panel-note'), pill: q('.status-pill') };
    const d = new Date();
    this.el.wgDay.textContent = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    this.el.wgDate.textContent = d.getDate();
    this.el.prev.addEventListener('click', () => { Music.next(-1); this.emit('user'); });
    this.el.next.addEventListener('click', () => { Music.next(1); this.emit('user'); });
    this.el.pp.addEventListener('click', () => { Music.toggle(); this.emit('user'); });
    this.el.snd.addEventListener('click', () => Sound.toggle());
    $$('[data-rc]', this.el.card).forEach((b) => b.addEventListener('click', () => this.hideCard()));
    q('.desktop-add')?.addEventListener('click', (e) => { e.stopPropagation(); Desktop.open(this.sceneId); });
    this.el.wave.addEventListener('click', (e) => { e.stopPropagation(); if (this.onWave && this.onWave(e)) return; this.panelOpen ? this.closePanel() : this.openPanel(); });
    document.addEventListener('click', (e) => { if (this.panelOpen && !e.target.closest('.panel-pop, .wave-btn, #qPanel')) this.closePanel(); });
    new IntersectionObserver((es) => { es.forEach((e) => { this.ratio = e.isIntersecting ? e.intersectionRatio : 0; }); Live.update(); }, { threshold: [0, 0.15, 0.3, 0.5, 0.75] }).observe(screen);
    new ResizeObserver(() => { this.w = screen.clientWidth; this.layoutPanel(); }).observe(screen);
    HOSTS.push(this);
    this.syncChrome(); this.renderPlayer();
  }
  on(fn) { this.subs.add(fn); }
  emit(type, d) { this.subs.forEach((fn) => fn(type, d)); }
  get scene() { return sceneById(this.sceneId); }

  // Scenes ────────────────────────────────────────
  async setScene(id, opt = {}) {
    const s = sceneById(id);
    if (s.id === this.sceneId && (this.frame || !this.active)) { if (opt.env) this.setEnv(opt.env[0], opt.env[1]); return; }
    const tok = ++this.switchTok;
    this.sceneId = s.id;
    this.env = opt.env ? { hour: opt.env[0], weather: opt.env[1] } : { hour: s.hour, weather: s.weather };
    this.syncChrome(); this.emit('scene', s); this.emit('state');
    const src = `img/${s.id}.jpg`;
    if (this.poster.getAttribute('src') !== src) {
      const im = new Image(); im.src = src;
      await Promise.race([im.decode().catch(() => {}), wait(450)]);
      if (tok !== this.switchTok) return;
      this.poster.src = src;
    }
    if (this.frame) { this.frame.classList.remove('ready'); await wait(reduceMotion ? 0 : 380); if (tok !== this.switchTok) return; }
    this.drop(); this.spawn();
  }
  spawn() {
    if (this.frame || !this.active || !this.wantLive) return;
    const s = this.scene, f = document.createElement('iframe');
    f.className = 'scene';
    f.title = `${s.name} — live wallpap scene${this.interactive ? '. Click and move inside it to interact.' : ''}`;
    f.setAttribute('allow', 'autoplay');
    if (!this.interactive) { f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); }
    const q = new URLSearchParams({ hour: this.env.hour.toFixed(2), weather: this.env.weather, fps: '30', muted: Sound.on ? '0' : '1' });
    if (this.calm) q.set('calm', '1');
    f.src = `scenes/${s.id}.html?${q}`;
    // Attach as soon as the scene's script has run (DOM ready), so state, music and clicks flow
    // early; fade it in over its poster only once everything (art) has loaded.
    f.addEventListener('load', () => { this.onLoad(f); this.fadeIn(f); }, { once: true });
    const poll = setInterval(() => {
      if (f !== this.frame || this.ready) return clearInterval(poll);
      try { const w = f.contentWindow; if (w.location.href.includes('/scenes/') && w.document.readyState !== 'loading' && w.LW) { clearInterval(poll); this.onLoad(f); } }
      catch (e) { clearInterval(poll); }
    }, 100);
    this.poster.after(f);
    this.frame = f; this.ready = false;
    this.setPill('Loading…', false);
  }
  drop() {
    if (!this.frame) return;
    this.frame.remove(); this.frame = null; this.ready = false; this.focusSent = null;
  }
  // The next scene loads ahead in a hidden frame and is paused as soon as it has loaded (no frames
  // drawn), so switching to it is instant instead of poster → loading → live.
  prewarm(id) {
    if (this.warm && this.warm.id === id) return;
    this.dropWarm();
    if (!this.active || !this.wantLive || !id || id === this.sceneId) return;
    const s = sceneById(id), f = document.createElement('iframe'), w = { id, frame: f, loaded: false };
    f.className = 'scene warm'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.setAttribute('allow', 'autoplay');
    f.src = `scenes/${s.id}.html?${new URLSearchParams({ hour: s.hour.toFixed(2), weather: s.weather, fps: '30', muted: '1' })}`;
    f.addEventListener('load', () => { w.loaded = true; try { f.contentWindow.__lw('focus', false); } catch (e) {} }, { once: true });
    this.poster.after(f); this.warm = w;
  }
  dropWarm() { if (this.warm) { this.warm.frame.remove(); this.warm = null; } }
  takeWarm(id) {
    const w = this.warm;
    if (!w || w.id !== id || !w.loaded || !this.active) return false;
    this.warm = null;
    if (this.frame) this.frame.remove();
    const f = w.frame, s = this.scene;
    f.classList.remove('warm'); f.removeAttribute('aria-hidden'); f.tabIndex = 0;
    f.title = `${s.name} — live wallpap scene. Click and move inside it to interact.`;
    this.frame = f; this.ready = false; this.focusSent = null;
    this.onLoad(f);                     // host bridge, listeners, env/sound/focus pushed (focus resumes it)
    f.classList.add('ready'); this.flushWaiters(); this.applyFocus(); this.emit('live');
    return true;
  }
  onLoad(f) {
    if (f !== this.frame || this.ready) return;
    this.ready = true;
    try {
      const doc = f.contentDocument, win = f.contentWindow;
      const st = doc.createElement('style'); st.textContent = '#hud{display:none!important}'; doc.head.appendChild(st);
      // Act as the host: in-scene media buttons (record player, jukebox…) drive our player.
      if (win.LW) { win.LW.isHost = true; win.LW.post = (m) => { if (m && m.type === 'media') this.onMedia(m.cmd); else if (m && m.type === 'calm' && !!m.on !== this.calm) this.setCalm(!!m.on); }; }
      if (this.interactive) {
        const act = () => { this.emit('user'); this.emit('down'); if (this.paused) this.setPaused(false); this.hideCard(); if (this.panelOpen) this.closePanel(); };
        win.addEventListener('pointerdown', act, { passive: true });
        let lx = null, ly = null;
        win.addEventListener('pointermove', (e) => { if (lx !== null && Math.hypot(e.screenX - lx, e.screenY - ly) > 3) this.emit('user'); lx = e.screenX; ly = e.screenY; }, { passive: true });
        win.addEventListener('wheel', () => this.emit('user'), { passive: true });
      }
    } catch (e) { /* cross-origin preview: postMessage still works */ }
    this.pushAll();
    this.flushAttach();
    this.emit('loaded');
  }
  fadeIn(f) { setTimeout(() => { if (f === this.frame) { f.classList.add('ready'); this.flushWaiters(); this.applyFocus(); this.emit('live'); } }, 380); }
  flushAttach() { const w = this.attachWaiters || []; this.attachWaiters = []; w.forEach((fn) => fn()); }
  whenAttached(run, ms = 5000) {
    if (this.ready) return Promise.resolve();
    return new Promise((res) => { const t = setTimeout(res, ms); (this.attachWaiters = this.attachWaiters || []).push(() => { clearTimeout(t); res(); }); }).then(() => run && run.check());
  }
  flushWaiters() { const w = this.waiters; this.waiters = []; w.forEach((fn) => fn()); }
  isLive() { return !!(this.frame && this.ready && this.frame.classList.contains('ready')); }
  whenLive(run, ms = 7000) {
    if (this.isLive()) return Promise.resolve();
    return new Promise((res) => { const t = setTimeout(res, ms); this.waiters.push(() => { clearTimeout(t); res(); }); }).then(() => run && run.check());
  }
  setActive(on) {
    if (on !== this.active) {
      this.active = on;
      if (on) { clearTimeout(this.releaseTimer); this.spawn(); }
      else this.releaseTimer = setTimeout(() => { if (!this.active) { this.drop(); this.setPill('Preview', false); } }, 2500);
      this.emit('active', on);
    }
    this.applyFocus();
  }
  applyFocus() {
    const f = this.active && this.ratio > 0.1 && !document.hidden && !this.paused;
    if (this.ready && f !== this.focusSent) { this.post('focus', f); this.focusSent = f; }
    if (this.ready) this.setPill(this.paused ? 'Paused · click to resume' : !this.isLive() ? 'Loading…' : f ? 'Live' : 'Paused', f && this.isLive());
  }
  setPill(text, live) { const p = this.el.pill; if (!p) return; p.querySelector('span').textContent = text; p.classList.toggle('resting', !live); }

  // Talking to the scene (same API the Mac app uses) ─────────────────────────
  post(type, ...a) {
    if (!this.frame || !this.ready) return;
    const w = this.frame.contentWindow;
    try { w.__lw(type, ...a); } catch (e) { try { w.postMessage({ __lw: [type, ...a] }, location.origin && location.origin !== 'null' ? location.origin : '*'); } catch (e2) {} }
  }
  pushAll() {
    this.focusSent = null;
    this.post('env', { hour: this.env.hour, weather: this.env.weather });
    this.post('mute', 0, 0, !Sound.on);
    this.post('settings', { breath: this.breath });
    this.post('breath', this.breath);
    this.post('calm', this.calm);
    if (this.soundscape !== 'off') this.post('ambient', { kind: this.soundscape, volume: this.pst.ssVol });
    if (this.pst.companions !== 'off') this.post('agents', { style: this.pst.companions, list: AGENTS });
    this.post('nowplaying', this.music ? Music.nowPlaying() : null);
    this.applyFocus();
  }
  primeAudio() {
    try { const LW = this.frame && this.frame.contentWindow.LW; if (!LW) return; LW.muted = false; LW.audio();
      setTimeout(() => { const c = LW._ctx; this.soundHint(this.interactive && Sound.on && !(c && c.state === 'running')); }, 500);
    } catch (e) {}
  }
  soundHint(on) { const h = $('.sound-hint', this.screen); if (h) h.hidden = !on; }
  sceneXY(fx, fy) { const f = this.frame; const w = f ? f.clientWidth : this.screen.clientWidth, h = f ? f.clientHeight : this.screen.clientHeight; return [fx * w, fy * h]; }
  tap(fx, fy) { const [x, y] = this.sceneXY(fx, fy); this.post('move', x, y); this.post('down', x, y); setTimeout(() => this.post('up', x, y), 110); }
  async hold(fx, fy, ms, run) {
    const [x, y] = this.sceneXY(fx, fy); this.post('down', x, y);
    const t0 = performance.now();
    try { while (performance.now() - t0 < ms) { await run.sleep(90); this.post('move', x + Math.sin(performance.now() / 160) * 2, y); } }
    finally { this.post('up', x, y); }
  }

  // State ──────────────────────────────────────────
  setEnv(hour, weather) {
    if (hour != null) this.env.hour = hour;
    if (weather) this.env.weather = weather;
    this.post('env', { hour: this.env.hour, weather: this.env.weather });
    this.syncChrome(); this.emit('state'); this.renderPanel();
  }
  setHour(h) { this.setEnv(h, null); }
  setWeather(w) { this.setEnv(null, w); }
  setCalm(on) { this.calm = on; this.post('settings', { breath: this.breath }); this.post('calm', on); this.emit('state'); this.renderPanel(); }
  setBreath(p) { this.breath = p; this.post('settings', { breath: p }); this.post('breath', p); if (this.calm) { this.post('calm', false); this.post('calm', true); } this.emit('state'); }
  setMusic(on) {
    if (on === this.music) return;
    this.music = on;
    this.post('nowplaying', on ? Music.nowPlaying() : null);
    this.renderPlayer(); syncMusic(); this.emit('state'); this.renderPanel();
  }
  setWindow(on) { this.el.win.classList.toggle('away', !on); }
  remind(kind = 'water') { this.post('reminder', kind); }
  showCard(ms = 7000) { clearTimeout(this.cardTimer); this.el.card.classList.remove('away'); if (ms) this.cardTimer = setTimeout(() => this.hideCard(), ms); }
  hideCard() { clearTimeout(this.cardTimer); this.el.card.classList.add('away'); }
  action(a) { this.post('action', a); }
  setPaused(on) { this.paused = on; this.applyFocus(); this.renderPanel(); }
  onMedia(cmd) {
    if (!this.music) this.setMusic(true);
    if (cmd === 'playpause') Music.toggle(); else Music.next(cmd === 'previous' ? -1 : 1);
    this.emit('user');
  }
  note(text, ms = 3200) { const n = this.el.note; n.textContent = text; n.hidden = false; clearTimeout(this.noteT); this.noteT = setTimeout(() => { n.hidden = true; }, ms); }

  // Desktop chrome ────────────────────────────────
  syncChrome() {
    const { hour, weather } = this.env;
    const day = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    this.el.clock.textContent = `${day} ${fmtHour(hour, true)}`;
    const [temp, dayName, nightName] = WX_WIDGET[weather] || WX_WIDGET.clear;
    const night = isNight(hour);
    this.el.wgTemp.textContent = `${temp + (night ? -4 : 0)}°`;
    this.el.wgCond.textContent = night && weather === 'clear' ? nightName : dayName;
    this.el.wgIc.innerHTML = night && weather === 'clear' ? WX_ICON.moon : WX_ICON[weather] || WX_ICON.clear;
  }
  renderPlayer() {
    const t = Music.track, p = this.el.player;
    p.classList.toggle('away', !this.music);
    p.classList.toggle('paused', !Music.playing);
    if (!this.music) return;
    if (this._art !== t.title) { this._art = t.title; this.el.art.style.backgroundImage = `url(${artFor(t)})`; }
    this.el.app.textContent = t.app === 'Spotify' ? 'Spotify' : 'Apple Music';
    this.el.title.textContent = t.title; this.el.artist.textContent = `${t.artist} — ${t.album}`;
    this.el.pp.innerHTML = Music.playing ? ICO.pause : ICO.play;
    this.el.pp.setAttribute('aria-label', Music.playing ? 'Pause' : 'Play');
    this.renderProgress();
  }
  renderProgress() {
    const { el, len } = Music.progress(), f = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    this.el.bar.style.setProperty('--p', (el / len).toFixed(4));
    this.el.cur.textContent = f(el); this.el.len.textContent = f(len);
  }

  // The menu-bar panel ────────────────────────────
  async openPanel() {
    this.panelOpen = true;
    this.el.wave.setAttribute('aria-expanded', 'true');
    if (!this.panelFrame) {
      try {
        const f = document.createElement('iframe');
        f.title = 'wallpap menu-bar panel (preview)';
        f.srcdoc = await getPanelSrc();
        this.el.pop.appendChild(f); this.panelFrame = f;
        this.layoutPanel();
      } catch (e) { this.note('The menu-bar panel lives in the app.'); this.panelOpen = false; return; }
    }
    if (!this.panelOpen) return;
    this.el.pop.classList.remove('away');
    this.renderPanel(); this.emit('state');
  }
  closePanel() {
    if (!this.panelOpen) return;
    this.panelOpen = false;
    this.el.wave.setAttribute('aria-expanded', 'false');
    this.el.pop.classList.add('away'); this.emit('state');
  }
  panelScale() { return clamp(this.w / 1180, 0.5, 1); }
  layoutPanel() {
    const f = this.panelFrame; if (!f) return;
    const s = this.panelScale(), mb = parseFloat(getComputedStyle(this.screen).getPropertyValue('--mb-h')) || 22;
    const avail = (this.screen.clientHeight - mb - 10) / s, h = Math.min(this.panelH || 560, avail);
    f.style.height = `${h}px`; f.style.transform = `scale(${s})`;
    this.el.pop.style.width = `${340 * s}px`; this.el.pop.style.height = `${h * s}px`;
  }
  panelState() {
    const s = this.scene, P = this.pst;
    return {
      pro: true, web: true, scene: s.id, categories: CATS,
      scenes: SCENES.map((x) => ({ id: x.id, title: x.name, cat: x.cat, pro: false, music: !!x.music })),
      sceneCtl: (s.actions || []).map(([v, title]) => ({ type: 'action', title, v })),
      timeView: this.timeView || 'auto', weather: this.env.weather, liveWeather: 'Live weather in the app', precise: P.precise,
      muted: !Sound.on, audio: ['fx', 'ambience', 'weather'].map((c) => ({ c, on: P.audio[c], vol: 1 })),
      soundscape: this.soundscape, ssVol: P.ssVol, music: this.music, musicDenied: false, beat: true, companions: P.companions,
      calm: this.calm, breath: this.breath, water: this.water, paused: this.paused, userPaused: this.paused, fps: P.fps, breathEvery: P.breathEvery,
      overApps: P.overApps, layoutMode: P.layoutMode, layoutSummary: '2 widgets on the right', avoidIcons: P.avoidIcons, login: P.login,
      energy: this.energy, away: P.away, awayRec: 120, onBattery: false,
      awayChoices: [[30, '30 sec'], [60, '1 min'], [120, '2 min'], [300, '5 min'], [600, '10 min'], [1800, '30 min']],
    };
  }
  renderPanel() { if (!this.panelFrame || !this.panelOpen) return; try { this.panelFrame.contentWindow.render(this.panelState()); } catch (e) {} }
  onPanel(m) {
    const v = m.v, P = this.pst;
    switch (m.a) {
      case 'ready': this.renderPanel(); return;
      case 'addToDesktop': Desktop.open(this.sceneId); return;
      case 'height': this.panelH = v; this.layoutPanel(); return;
      case 'pickScene': (this.onPick || ((id) => this.setScene(id)))(v); break;
      case 'pickWeather': if (v === '') this.note('Live weather follows your sky — in the app, with Pro'); else this.setWeather(v); break;
      case 'pickTimeView': this.timeView = v; this.setHour(v === 'auto' ? localHour() : VIEW_HOURS[v]); break;
      case 'toggleMute': Sound.toggle(); break;
      case 'toggleMusicMode': this.setMusic(!this.music); if (this.onMusicPref) this.onMusicPref(this.music); break;
      case 'pickSoundscape': this.soundscape = v; this.post('ambient', { kind: v, volume: P.ssVol }); if (v !== 'off' && !Sound.on) Sound.set(true); break;
      case 'pickSoundscapeVolume': P.ssVol = v; this.post('ambient', { kind: this.soundscape, volume: v }); break;
      case 'toggleAudioCat': P.audio[v] = !P.audio[v]; this.post('audio', { [v]: { on: P.audio[v] } }); break;
      case 'toggleCalm': this.setCalm(!this.calm); break;
      case 'pickBreath': this.setBreath(v); break;
      case 'pickReminder': this.water = m.tag != null ? m.tag : v; break;
      case 'remindNow': this.remind('water'); break;
      case 'previewReminderCard': this.closePanel(); this.showCard(); break;
      case 'toggleRemindersOverApps': P.overApps = !P.overApps; break;
      case 'pickBreathReminder': P.breathEvery = m.tag != null ? m.tag : v; break;
      case 'pickCompanions': P.companions = v; this.post('agents', { style: v === 'off' ? 'native' : v, list: v === 'off' ? [] : AGENTS }); break;
      case 'pickEnergy': this.energy = v; break;
      case 'pickAway': P.away = m.tag != null ? m.tag : v; break;
      case 'pickFps': P.fps = m.tag != null ? m.tag : v; this.post('perf', { fps: P.fps }); break;
      case 'togglePause': this.setPaused(!this.paused); if (this.paused) this.note('Paused — the scene keeps its last frame. Click it to resume.'); break;
      case 'togglePreciseLocation': P.precise = !P.precise; break;
      case 'toggleAvoidIcons': P.avoidIcons = !P.avoidIcons; break;
      case 'pickLayoutMode': P.layoutMode = v; break;
      case 'toggleLogin': P.login = !P.login; break;
      case 'runAction': this.action(v); break;
      case 'reloadScene': { const id = this.sceneId; this.drop(); this.sceneId = id; this.spawn(); break; }
      case 'openPro': case 'enterLicense': this.closePanel(); $('#pricing').scrollIntoView({ behavior: smooth() }); return;
      case 'quit': this.closePanel(); this.note('Quit gives you your normal wallpaper back — wallpap never changes it.', 4200); return;
      default: break;
    }
    this.emit('user');
    this.renderPanel();
  }
}

// ─── Live: only the most visible screen runs a scene ─────────────────────────
const Live = {
  owner: null, keep: null, linger: null, lingerUntil: 0,
  update() {
    // The screen in front wins (the journey once it is pinned over the zoomed hero, where both fill the
    // window); otherwise the most visible one.
    const cand = document.hidden ? null : HOSTS.filter((h) => h.wantLive && h.ratio > 0.15).sort((a, b) => (b.front ? 1 : 0) - (a.front ? 1 : 0) || b.ratio - a.ratio)[0] || null;
    // Hand-over: a live scene keeps running until the next one is live too (the hero's zoom into the
    // journey never shows a still), then it is disposed. Otherwise the old context goes first.
    if (this.owner && cand && this.owner !== cand && this.owner.isLive() && !cand.isLive()) this.keep = this.owner;
    if (this.keep && (!cand || this.keep === cand || cand.isLive())) {
      // The new scene is live: the old one lingers through the 0.7 s cross-fade, then goes.
      if (cand && cand !== this.keep) { this.linger = this.keep; this.lingerUntil = performance.now() + 900; setTimeout(() => this.update(), 950); }
      this.keep = null;
    }
    const linger = this.linger && performance.now() < this.lingerUntil && this.linger !== cand ? this.linger : (this.linger = null);
    this.owner = cand;
    HOSTS.filter((h) => h !== cand && h !== this.keep && h !== linger).forEach((h) => { h.setActive(false); h.drop(); h.dropWarm(); });
    if (cand) { cand.setActive(true); if (this.keep) cand.whenLive(null, 8000).then(() => this.update()); }
    syncMusic();
  },
};
function syncMusic() {
  const h = Live.owner;
  const want = !!(h && h.music && h.ratio > 0.15 && !document.hidden && !Music.userPaused);
  if (want) Music.play(); else Music.pause();
}
Music.on((type, f) => {
  const h = Live.owner;
  if (type === 'frame') { if (h && h.music) { h.post('beat', f); h.renderProgress(); } return; }
  HOSTS.forEach((x) => { if (x.music) x.post('nowplaying', Music.nowPlaying()); x.renderPlayer(); });
});
document.addEventListener('visibilitychange', () => Live.update());

// ─── Ghost cursor ────────────────────────────────────────────────────────────
class Ghost {
  constructor(container) {
    this.c = container; this.el = document.createElement('div'); this.el.className = 'ghost'; this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = CURSOR; container.appendChild(this.el); this.x = null; this.y = null; this.onMove = null;
  }
  show(on) { this.el.classList.toggle('on', on); }
  place(x, y) { this.x = x; this.y = y; this.el.style.transform = `translate(${x}px,${y}px)`; if (this.onMove) this.onMove(x, y); }
  local(r) { const c = this.c.getBoundingClientRect(); return [r.left - c.left, r.top - c.top]; }
  at(el, fx = 0.5, fy = 0.5) { const r = el.getBoundingClientRect(), [x, y] = this.local(r); return [x + r.width * fx, y + r.height * fy]; }
  async moveTo([x, y], run, ms) {
    if (this.x === null) { const w = this.c.clientWidth, h = this.c.clientHeight; this.place(w * 0.86, h * 0.9); }
    const x0 = this.x, y0 = this.y, d = Math.hypot(x - x0, y - y0), dur = ms || clamp(380 + d * 0.9, 450, 1300), t0 = performance.now();
    this.show(true);
    // a gentle arc, like a hand
    const bend = Math.min(60, d * 0.18) * (x > x0 ? -1 : 1);
    while (true) {
      run.check();
      const k = Math.min(1, (performance.now() - t0) / dur), e = easeInOut(k), arc = Math.sin(Math.PI * e) * bend;
      this.place(x0 + (x - x0) * e, y0 + (y - y0) * e + arc * 0.4);
      if (k >= 1) break;
      await new Promise((r) => requestAnimationFrame(r));
    }
  }
  async click(run) { this.el.classList.remove('click'); void this.el.offsetWidth; this.el.classList.add('click'); await run.sleep(200); }
  press(on) { this.el.classList.toggle('press', on); }
}

// ─── Playground (the hero) ───────────────────────────────────────────────────
const PG = {
  init() {
    this.sec = $('#scenes'); this.picker = $('#picker'); this.fsPick = $('#fsPick'); this.panel = $('#panel');
    const first = SCENES.some((s) => s.id === qs.get('scene')) ? qs.get('scene') : 'koi';
    // The poster paints first; the live scene starts once the page has loaded (goLive), or on the
    // first touch here — whichever comes first. Data saver: only when asked.
    if (first !== 'koi') $('#pgScreen .poster').src = `img/${first}.jpg`;   // ?scene=… : its own poster
    this.host = new SceneHost($('#pgScreen'), { name: 'pg', interactive: true, scene: first, wantLive: false });
    this.host.onPick = (id) => this.select(id);
    this.host.onMusicPref = (on) => { this.musicPref = on; };
    this.musicPref = null;
    this.host.on((type) => { if (type === 'state' || type === 'scene') this.sync(); });
    this.renderPicker();
    const pick = (e) => { const b = e.target.closest('[data-scene]'); if (b) { this.goLive(); this.select(b.dataset.scene); Tour.userActivity(); } };
    this.picker.addEventListener('click', pick); this.fsPick.addEventListener('click', pick);
    this.bindControls();
    if (saveData || reduceMotion) $('#playLive').hidden = false;
    $('#playLive').addEventListener('click', () => this.goLive(true));
    if (!saveData) this.sec.addEventListener('pointerdown', () => this.goLive(), { capture: true, passive: true, once: true });
    this.select(first, { initial: true });
  },
  goLive(force) {
    const h = this.host;
    if (h.wantLive || phoneMQ.matches || ((saveData || reduceMotion) && !force)) return;
    $('#playLive').hidden = true;
    h.wantLive = true; Live.update(); Tour.maybeStart(2600);
  },
  renderPicker() {
    this.picker.innerHTML = CATS.map((c) => `
      <div class="pk-group" role="group" aria-label="${c}">
        <p class="pk-label" aria-hidden="true">${c}</p>
        <div class="pk-tiles">${SCENES.filter((s) => s.cat === c).map((s) => `
          <button class="pk-tile" type="button" data-scene="${s.id}" aria-pressed="false" title="${s.name}" aria-label="${s.name}${s.music ? ', plays your music' : ''}">
            <span class="pk-thumb"><img src="img/${s.id}-xs.jpg" alt="" width="256" height="160" decoding="async"></span>
            <span class="pk-name"><span class="pk-nm">${s.name}</span>${s.music ? '<svg class="pk-mus" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>' : ''}</span>
          </button>`).join('')}</div>
      </div>`).join('');
    // The compact picker inside the fullscreen dropdown (the strip above isn't visible there).
    this.fsPick.innerHTML = `<p class="p-label" aria-hidden="true">Scene</p><div class="fp-grid">${SCENES.map((s) => `
      <button class="fp-tile" type="button" data-scene="${s.id}" aria-pressed="false"><img src="img/${s.id}-xs.jpg" alt="" width="256" height="160" loading="lazy" decoding="async"><span>${s.name}</span></button>`).join('')}</div>`;
  },
  tile(id) { return $(`[data-scene="${id}"]`, this.picker); },
  select(id, o = {}) {
    const s = sceneById(id), h = this.host;
    h.setScene(s.id);
    const wantMusic = this.musicPref !== null ? this.musicPref || !!s.music : !!s.music;
    h.setMusic(wantMusic);
    if (h.calm) h.setCalm(false);
    $$('[data-scene]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.scene === s.id)));
    const t = this.tile(s.id); if (t) { if (o.initial) requestAnimationFrame(() => { const p = this.picker; p.scrollLeft = t.offsetLeft - p.offsetLeft - 8; }); else this.revealTile(t); }
    this.head(s, o.initial);
    this.sec.style.setProperty('--glow', s.glow);
    $('#pCat').textContent = `${s.name} · ${s.cat}`;
    $('#sceneTips').innerHTML = s.tips.map((x) => `<li>${x}</li>`).join('');
    $('#sceneActions').innerHTML = (s.actions || []).map(([a, l]) => `<button class="btn btn-small btn-soft" type="button" data-action="${a}">${l}</button>`).join('');
    if (!Tour.running) Tour.idleCaption();
    this.sync();
  },
  revealTile(t) {    // scroll the picker strip (never the page)
    const p = this.picker, pr = p.getBoundingClientRect(), tr = t.getBoundingClientRect();
    if (pr.width && (tr.left < pr.left + 8 || tr.right > pr.right - 8)) p.scrollTo({ left: p.scrollLeft + (tr.left - pr.left) - pr.width / 2 + tr.width / 2, behavior: smooth() });
  },
  head(s, instant) {
    const t = $('#pgTitle');
    if (t.dataset.scene === s.id) return;
    t.dataset.scene = s.id;
    if (instant || reduceMotion) { t.textContent = s.title; return; }
    t.classList.add('out'); clearTimeout(this.headT);
    this.headT = setTimeout(() => { t.textContent = s.title; t.classList.remove('out'); }, 220);
  },
  bindControls() {
    const h = this.host, hour = $('#hour'), panel = this.panel;
    $('#wxChips').innerHTML = WEATHER.map(([k, label, svg]) => `<button class="chip" type="button" role="radio" aria-checked="false" data-wx="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>${label}</button>`).join('');
    $('#wxChips').addEventListener('click', (e) => { const b = e.target.closest('[data-wx]'); if (b) h.setWeather(b.dataset.wx); });
    radioKeys($('#wxChips'));
    let raf = 0;
    hour.addEventListener('input', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => h.setHour(+hour.value)); });
    $('#qMusic').addEventListener('click', () => { this.musicPref = !h.music; h.setMusic(!h.music); if (h.music) { Music.userPaused = false; syncMusic(); } });
    $('#qBreathe').addEventListener('click', () => h.setCalm(!h.calm));
    $('#qWater').addEventListener('click', (e) => { h.remind('water'); h.showCard(); flash(e.currentTarget); });
    $('#qPanel').addEventListener('click', (e) => { e.stopPropagation(); if (this.dropOpen) this.setDrop(false); h.panelOpen ? h.closePanel() : h.openPanel(); if (phoneMQ.matches) setSheet(false); });
    $('#sceneActions').addEventListener('click', (e) => { const b = e.target.closest('[data-action]'); if (b) { h.action(b.dataset.action); flash(b); } });
    // mobile bottom sheet
    const sheetBtn = $('#sheetBtn'), scrim = $('#scrim');
    const setSheet = this.setSheet = (open) => { panel.classList.toggle('open', open); scrim.hidden = !open; sheetBtn.setAttribute('aria-expanded', String(open)); if (open) { Tour.userActivity(); $('#panelClose').focus({ preventScroll: true }); } };
    sheetBtn.addEventListener('click', () => setSheet(!panel.classList.contains('open')));
    $('#panelClose').addEventListener('click', () => { if (this.dropOpen) this.setDrop(false, true); else setSheet(false); });
    scrim.addEventListener('click', () => setSheet(false));

    // Fullscreen: the live scene fills the browser like a real wallpaper. The menu bar's wave then
    // drops these same controls (plus a compact scene picker) from the menu bar, the way the app's
    // panel drops on a Mac: the panel moves into the screen — the fullscreen element — for as long
    // as fullscreen lasts, and back beside it afterwards. Browsers without element fullscreen
    // (iPhone) get the same view as a fixed overlay with an exit button.
    const screenEl = $('#pgScreen'), fsBtn = $('#fsBtn'), wave = h.el.wave, home = document.createComment(' controls live here outside fullscreen ');
    panel.before(home);
    screenEl.querySelector('.mb-right').insertAdjacentHTML('afterbegin', '<button class="fs-exit" type="button" aria-label="Exit fullscreen" title="Exit fullscreen (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>');
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
    const inFs = () => screenEl.classList.contains('is-fs');
    const placeDrop = () => {   // under the wave, kept inside the screen
      const sr = screenEl.getBoundingClientRect(), wr = wave.getBoundingClientRect(), w = panel.offsetWidth;
      panel.style.left = `${clamp(wr.left + wr.width / 2 - sr.left - w / 2, 8, sr.width - w - 8)}px`;
    };
    this.setDrop = (open, focus) => {
      if (open && !inFs()) return;
      this.dropOpen = open;
      panel.classList.toggle('drop-open', open);
      wave.setAttribute('aria-expanded', String(open));
      if (open) {
        if (h.panelOpen) h.closePanel();
        placeDrop();
        const cur = $('.fp-tile[aria-pressed="true"]', panel);
        if (cur) cur.scrollIntoView({ block: 'nearest' });
        if (focus) (cur || $('#hour')).focus({ preventScroll: true });
      } else if (focus) wave.focus({ preventScroll: true });
      this.sync();
    };
    h.onWave = (e) => { if (!inFs()) return false; this.setDrop(!this.dropOpen, e.detail === 0); return true; };
    document.addEventListener('pointerdown', (e) => { if (this.dropOpen && !e.target.closest('#panel, .wave-btn')) this.setDrop(false); }, true);
    h.on((type) => { if (type === 'down' && this.dropOpen) this.setDrop(false); });   // a click inside the scene
    new ResizeObserver(() => { if (this.dropOpen) placeDrop(); }).observe(screenEl);

    const setFsClass = (on) => {
      screenEl.classList.toggle('is-fs', on); document.documentElement.classList.toggle('pg-fs', on);
      fsBtn.setAttribute('aria-pressed', String(on));
      Tour.held = on;                                     // fullscreen is the visitor's: no auto tour
      if (on) {
        setSheet(false); Tour.stop();
        if (panel.parentNode !== screenEl) { panel.classList.add('as-drop'); screenEl.appendChild(panel); }
        wave.setAttribute('aria-controls', 'panel'); wave.setAttribute('aria-label', 'Show the controls');
        h.note('Click the wave in the menu bar for the controls · Esc to exit', 4200);
      } else {
        this.setDrop(false);
        if (panel.parentNode === screenEl) { panel.classList.remove('as-drop'); panel.style.left = ''; home.after(panel); }
        wave.removeAttribute('aria-controls'); wave.setAttribute('aria-label', 'Open the wallpap menu-bar panel');
        if (h.panelOpen) h.closePanel();
        Tour.maybeStart(1500);
      }
    };
    const enterFs = async () => {
      this.goLive(true);
      const req = screenEl.requestFullscreen || screenEl.webkitRequestFullscreen;
      // Some embedded/in-app browsers never settle the request: give it a moment, then use the overlay.
      if (req) { try { await Promise.race([req.call(screenEl), wait(700)]); } catch (e) {} if (fsEl() === screenEl) return; }
      setFsClass(true);                                   // fallback: fixed overlay
    };
    const exitFs = () => {
      if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else setFsClass(false);
    };
    fsBtn.addEventListener('click', () => (fsEl() || inFs() ? exitFs() : enterFs()));
    screenEl.querySelector('.fs-exit').addEventListener('click', (e) => { e.stopPropagation(); exitFs(); });
    const onFsChange = () => setFsClass(fsEl() === screenEl);
    document.addEventListener('fullscreenchange', onFsChange); document.addEventListener('webkitfullscreenchange', onFsChange);

    // Esc closes the innermost thing that's open: the dropdown, the app's panel, the sheet, then the
    // overlay fullscreen (native fullscreen exits on its own). It must also work while focus is inside
    // the scene or panel iframe, whose key events never reach this document.
    const onEsc = () => {
      if (this.dropOpen) return this.setDrop(false, true);
      if (h.panelOpen) { h.closePanel(); wave.focus({ preventScroll: true }); return; }
      if (panel.classList.contains('open')) { setSheet(false); sheetBtn.focus({ preventScroll: true }); return; }
      if (inFs() && !fsEl()) { setFsClass(false); fsBtn.focus({ preventScroll: true }); }
    };
    addEventListener('keydown', (e) => { if (e.key === 'Escape') onEsc(); });
    const escIn = (f) => { try { const w = f.contentWindow; if (!w || w.__fsEsc) return; w.__fsEsc = true; w.addEventListener('keydown', (e) => { if (e.key === 'Escape') onEsc(); }, true); } catch (e) {} };
    const escWatch = (f) => { escIn(f); f.addEventListener('load', () => escIn(f)); };
    screenEl.querySelectorAll('iframe').forEach(escWatch);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; if (n.tagName === 'IFRAME') escWatch(n); else n.querySelectorAll?.('iframe').forEach(escWatch); }))).observe(screenEl, { childList: true, subtree: true });
  },
  sync() {
    const h = this.host;
    const hour = $('#hour'); if (+hour.value !== h.env.hour) hour.value = h.env.hour;
    $('#hourOut').textContent = fmtHour(h.env.hour);
    hour.setAttribute('aria-valuetext', fmtHour(h.env.hour));
    $$('#wxChips [data-wx]').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.wx === h.env.weather)));
    $('#qMusic').setAttribute('aria-pressed', String(h.music)); $('#qMusicSub').textContent = h.music ? Music.track.title : 'off';
    $('#qBreathe').setAttribute('aria-pressed', String(h.calm));
    $('#qPanel').setAttribute('aria-pressed', String(!!h.panelOpen));
  },
};
function flash(b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 900); }
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

// ─── Tour: a ghost cursor explores the hero scene until you take over ─────────
// Starts only while the hero's screen is well in view and the live scene is up; any real touch,
// wheel, key or mouse move in the hero (iframes included) hands control back, and it only resumes
// after 25 s without any, only once opted into. Off by default and in fullscreen.
const Tour = {
  mode: 'off', running: false, run: null, i: 0, inView: false, lastUser: -1e9, IDLE: 25000,
  init() {
    this.btn = $('#tourBtn'); this.cap = $('#tourCap'); this.ghost = new Ghost(PG.sec);
    const h = PG.host;
    this.ghost.onMove = (x, y) => {   // the scene feels the ghost cursor too
      const sr = h.screen.getBoundingClientRect(), [gx, gy] = this.ghost.local(sr), lx = x - gx, ly = y - gy;
      if (lx >= 0 && ly >= 0 && lx <= sr.width && ly <= sr.height) h.post('move', lx, ly);
    };
    this.steps = this.defineSteps();
    this.btn.addEventListener('click', () => this.setMode(this.mode === 'auto' && (this.running || this.resumeT) ? 'off' : 'auto'));
    h.on((type) => { if (type === 'user') this.userActivity(); });
    // Any real interaction in the demo hands control to the visitor.
    const area = PG.sec;
    ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((ev) => area.addEventListener(ev, (e) => { if (e.isTrusted) this.userActivity(); }, { passive: true, capture: true }));
    let lx = null, ly = null;
    area.addEventListener('pointermove', (e) => { if (!e.isTrusted) return; if (lx !== null && Math.hypot(e.screenX - lx, e.screenY - ly) > 4) this.userActivity(); lx = e.screenX; ly = e.screenY; }, { passive: true });
    area.addEventListener('pointerleave', () => { lx = null; });
    // The live scene and the menu-bar panel are iframes: their clicks and moves never reach this
    // document, so listen inside each one (same origin) as it loads. A window blur while focus moves
    // into one of our iframes covers anything we can't reach.
    const hookFrame = (f) => {
      try {
        const w = f.contentWindow; if (!w || w.__tourHooked) return; w.__tourHooked = true;
        ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((ev) => w.addEventListener(ev, (e) => { if (e.isTrusted) this.userActivity(); }, { passive: true, capture: true }));
        let fx = null, fy = null;
        w.addEventListener('pointermove', (e) => { if (!e.isTrusted) return; if (fx !== null && Math.hypot(e.screenX - fx, e.screenY - fy) > 4) this.userActivity(); fx = e.screenX; fy = e.screenY; }, { passive: true });
      } catch (e) {}
    };
    const watchFrame = (f) => { hookFrame(f); f.addEventListener('load', () => hookFrame(f)); };
    area.querySelectorAll('iframe').forEach(watchFrame);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; if (n.tagName === 'IFRAME') watchFrame(n); else n.querySelectorAll?.('iframe').forEach(watchFrame); }))).observe(area, { childList: true, subtree: true });
    addEventListener('blur', () => setTimeout(() => { const a = document.activeElement; if (a && a.tagName === 'IFRAME' && area.contains(a)) this.userActivity(); }, 0));
    new IntersectionObserver((es) => { es.forEach((e) => { this.inView = e.isIntersecting && e.intersectionRatio >= 0.45; }); this.inView ? this.maybeStart(1400) : this.stop(); }, { threshold: [0, 0.45, 0.7] }).observe($('#playground'));
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.maybeStart(1500)));
    // The walkthrough is opt-in, including for reduced-motion visitors.
    this.idleCaption(); this.label();
  },
  defineSteps() {
    const h = PG.host, g = () => this.ghost;
    const inScene = (fx, fy) => { const sr = h.screen.getBoundingClientRect(), [x, y] = g().local(sr); return [x + sr.width * fx, y + sr.height * fy]; };
    const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
    const press = async (el, r, fn) => {
      if (el && el.closest('#picker')) { PG.revealTile(el); await r.sleep(450); }
      if (visible(el)) { await g().moveTo(g().at(el), r); await g().click(r); }
      fn();
    };
    const sceneTap = async (fx, fy, r) => { await g().moveTo(inScene(fx, fy), r); await g().click(r); h.tap(fx, fy); };
    const ensure = async (id, r) => { if (h.sceneId !== id) { await press(PG.tile(id), r, () => PG.select(id)); } await h.whenLive(r, 8000); };
    const dragHour = async (to, r) => {
      const el = $('#hour');
      if (!visible(el)) { h.setHour(to); return; }
      const from = h.env.hour, pos = (v) => g().at(el, clamp(v / 23.75, 0.02, 0.98), 0.5);
      await g().moveTo(pos(from), r); g().press(true);
      const t0 = performance.now(), dur = 2200;
      for (;;) { r.check(); const k = Math.min(1, (performance.now() - t0) / dur), v = from + (to - from) * easeInOut(k); g().place(...pos(v)); h.setHour(Math.round(v * 4) / 4); if (k >= 1) break; await r.sleep(60); }
      g().press(false);
    };
    // Phones / data saver: a lighter tour (Cymatics is ~0.1 MB; the cats and record store carry MBs of painted art).
    const light = phoneMQ.matches || saveData, mus = light ? 'cymatics' : 'records';
    const all = [
      { cap: 'Click the water to feed the koi', now: () => { PG.select('koi'); setTimeout(() => h.tap(0.36, 0.58), 1500); },
        run: async (r) => { await ensure('koi', r); await r.sleep(400); await sceneTap(0.36, 0.58, r); await r.sleep(1400); await sceneTap(0.5, 0.44, r); await r.sleep(1200);
          await g().moveTo(inScene(0.28, 0.4), r); g().press(true); await h.hold(0.28, 0.4, 1600, r); g().press(false); await r.sleep(1400); } },
      { cap: 'Make it rain', now: () => h.setWeather('rain'), run: async (r) => { await press($('[data-wx="rain"]'), r, () => h.setWeather('rain')); await r.sleep(3400); } },
      { cap: 'Turn the clock to dusk', now: () => h.setHour(19.5), run: async (r) => { await dragHour(19.5, r); await r.sleep(2600); } },
      { heavy: true, cap: 'Pick another scene', now: () => PG.select('cats'), run: async (r) => { await press(PG.tile('cats'), r, () => PG.select('cats')); await h.whenLive(r, 8000); await r.sleep(1600); } },
      { heavy: true, cap: 'Toss the cats a toy', now: () => { PG.select('cats'); setTimeout(() => h.action('toy'), 1500); },
        run: async (r) => { await ensure('cats', r); await sceneTap(0.42, 0.84, r); await r.sleep(1500); await press($('[data-action="toy"]'), r, () => h.action('toy')); await r.sleep(3000); } },
      { cap: 'Music Mode: what’s playing on your Mac, in the scene', now: () => PG.select(mus),
        run: async (r) => { await ensure(mus, r); await r.sleep(3800); await press(h.el.next, r, () => Music.next(1)); await r.sleep(4200); } },
      { cap: 'Take a breath — Done when you’re ready', now: () => h.setCalm(true), run: async (r) => { await press($('#qBreathe'), r, () => h.setCalm(true)); await r.sleep(9000); h.setCalm(false); await r.sleep(600); } },
      { cap: 'A gentle reminder to drink some water', now: () => { h.remind('water'); h.showCard(); },
        run: async (r) => { await press($('#qWater'), r, () => { h.remind('water'); h.showCard(5200); }); await r.sleep(5000); } },
      { cap: 'Everything lives in one menu-bar panel', now: () => h.openPanel(),
        run: async (r) => { await press(h.el.wave, r, () => h.openPanel()); await r.sleep(4600); h.closePanel(); await r.sleep(400); } },
      { cap: 'Back to the pond', now: () => PG.select('koi'), run: async (r) => { await press(PG.tile('koi'), r, () => PG.select('koi')); await h.whenLive(r, 8000); await r.sleep(1400); } },
    ];
    return light ? all.filter((x) => !x.heavy) : all;
  },
  maybeStart(delay = 0) {
    if (this.mode !== 'auto' || this.held || this.running || !this.inView || document.hidden || !PG.host.wantLive || Zoom.e > .02) return;
    delay = Math.max(delay, this.lastUser + this.IDLE - performance.now());   // never cut a lull short
    clearTimeout(this.resumeT);
    this.resumeT = setTimeout(() => { this.resumeT = 0; if (this.mode === 'auto' && !this.held && this.inView && !this.running && !document.hidden) this.start(); }, delay);
    this.label();
  },
  async start() {
    this.running = true; this.label();
    const run = this.run = newRun();
    try {
      await PG.host.whenLive(run, 9000);
      for (;;) {
        const st = this.steps[this.i % this.steps.length];
        this.caption(st.cap, (this.i % this.steps.length) + 1);
        await st.run(run);
        this.i++;
      }
    } catch (e) { if (e !== ABORT) console.warn(e); }
    if (this.run === run) { this.running = false; this.ghost.show(false); this.ghost.press(false); this.label(); }
  },
  stop() { clearTimeout(this.resumeT); this.resumeT = 0; if (this.run) this.run.cancel(); this.running = false; this.ghost.show(false); this.ghost.press(false); this.label(); },
  userActivity() {
    this.lastUser = performance.now();
    if (this.mode !== 'auto') return;
    if (this.running) { this.stop(); this.cap.textContent = 'Your turn — explore. The tour picks up again when you’re idle.'; }
    clearTimeout(this.resumeT);
    this.resumeT = setTimeout(() => { this.resumeT = 0; this.maybeStart(0); }, this.IDLE);   // resume only after a real lull
    this.label();
  },
  setMode(m) {
    this.mode = m;
    if (m === 'auto') this.lastUser = -1e9;               // asked for the tour: start it now
    if (m === 'off') { this.stop(); this.idleCaption(); }
    else { this.stop(); this.maybeStart(150); }
    this.label();
  },
  label() {
    const touring = this.mode === 'auto' && (this.running || this.resumeT);
    this.btn.textContent = touring ? 'Explore yourself' : 'Show me around';
    this.btn.setAttribute('aria-pressed', String(!!touring));
    $('#tourbar').classList.toggle('touring', !!this.running);
  },
  caption(text, n) {
    const c = this.cap, set = () => { c.innerHTML = `<span class="tb-n">${n}/${this.steps.length}</span> ${text}`; };
    if (reduceMotion) return set();
    c.parentElement.classList.add('out'); setTimeout(() => { set(); c.parentElement.classList.remove('out'); }, 220);
  },
  idleCaption() { if (this.cap) this.cap.textContent = phoneMQ.matches ? 'A preview of your next desktop.' : reduceMotion ? 'Still preview. Play when you’re ready.' : PG.host.scene.tips[0]; },
  renderList() {
    const l = $('#tourList'); l.hidden = false;
    l.innerHTML = this.steps.map((s, i) => `<li><button type="button" data-ts="${i}">${s.cap}</button></li>`).join('');
    l.addEventListener('click', (e) => { const b = e.target.closest('[data-ts]'); if (b) this.steps[+b.dataset.ts].now(); });
  },
};

// ─── Download / Buy ──────────────────────────────────────────────────────────
const dlToast = $('#dlToast');
let toastTimer = 0;
$$('[data-download]').forEach((a) => {
  a.href = DOWNLOAD_URL;
  a.addEventListener('click', () => { clearTimeout(toastTimer); setTimeout(() => { dlToast.hidden = false; }, 500); toastTimer = setTimeout(() => { dlToast.hidden = true; }, 20000); });
});
$('#dlToastX').addEventListener('click', () => { dlToast.hidden = true; clearTimeout(toastTimer); });
$$('[data-buy]').forEach((a) => { a.href = BUY_URL; a.rel = 'noopener'; });
$('#year').textContent = new Date().getFullYear();
{ const nav = $('.nav'); const f = () => nav.classList.toggle('scrolled', scrollY > 8); addEventListener('scroll', f, { passive: true }); f(); }

// ─── Community scenes: featured entries from catalog.json (the app's Discover feed) ───
async function renderCommunity() {
  let list = [];
  try { const r = await fetch('catalog.json', { cache: 'no-cache' }); if (r.ok) list = ((await r.json()).scenes || []).filter((e) => e && e.featured && e.title); } catch (e) { return; }
  if (!list.length) return;
  const safeURL = (u) => { try { const x = new URL(u, new URL('catalog.json', location.href)); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; } };
  const mk = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; };
  const grid = $('#commGrid');
  list.slice(0, 8).forEach((e) => {
    const li = mk('li', 'comm-card'), thumb = e.thumb && safeURL(e.thumb);
    if (thumb) { const img = mk('img'); img.src = thumb; img.alt = ''; img.width = 256; img.height = 160; img.loading = 'lazy'; img.decoding = 'async'; li.append(img); }
    li.append(mk('h3', null, e.title));
    const by = mk('p', 'by', 'by '), url = e.authorURL && safeURL(e.authorURL);
    if (url) { const a = mk('a', null, e.author || 'wallpap'); a.href = url; a.rel = 'noopener nofollow'; by.append(a); } else by.append(e.author || 'wallpap');
    li.append(by);
    if (e.blurb) li.append(mk('p', null, e.blurb));
    if (WallpapLinks.validID(e.id)) { const b = mk('button', 'btn btn-small btn-ghost', 'Add to desktop'); b.type = 'button'; b.dataset.addScene = e.id; b.setAttribute('aria-label', `Add ${e.title} to desktop`); li.append(b); }
    grid.append(li);
  });
  $('#community').hidden = false;
}
idle(renderCommunity, 4000);

// ─── Try: the feature tiles under the hero run their demo in the hero scene ───
const Try = {
  init() { $$('[data-try]').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.try).catch((e) => { if (e !== ABORT) console.warn(e); }))); },
  async go(k) {
    const h = PG.host;
    if (this.run) this.run.cancel();
    const r = this.run = newRun();
    Tour.userActivity();                                  // the visitor is driving: tour stops, resumes after a lull
    PG.goLive(true);
    if (PG.setSheet) PG.setSheet(false);
    PG.sec.scrollIntoView({ behavior: smooth(), block: 'start' });
    await r.sleep(reduceMotion ? 0 : 550);
    const scene = (id) => { if (h.sceneId !== id) PG.select(id); };
    if (k === 'touch') {
      scene('koi'); await h.whenLive(r, 8000); await r.sleep(300);
      for (const [x, y] of [[0.36, 0.58], [0.5, 0.44], [0.27, 0.4]]) { h.tap(x, y); await r.sleep(1100); }
    } else if (k === 'day') {
      await h.whenLive(r, 8000);
      const from = h.env.hour, to = from >= 17 && from < 20 ? 21.5 : 19.5, t0 = performance.now(), dur = reduceMotion ? 0 : 2200;
      for (;;) { const t = dur ? Math.min(1, (performance.now() - t0) / dur) : 1; h.setHour(Math.round((from + (to - from) * easeInOut(t)) * 4) / 4); if (t >= 1) break; await r.sleep(70); }
      await r.sleep(500); h.setWeather('rain');
    } else if (k === 'music') {
      const id = phoneMQ.matches || saveData ? 'cymatics' : 'records';   // the light one on phones
      if (h.sceneId !== id) PG.select(id);
      if (!h.music) { PG.musicPref = true; h.setMusic(true); }
      Music.userPaused = false; syncMusic();
    } else if (k === 'calm') {
      await h.whenAttached(r, 6000); h.setCalm(true);
    } else if (k === 'remind') {
      await h.whenAttached(r, 6000); h.remind('water'); await r.sleep(2600);
      h.setWindow(true);
      try { await r.sleep(900); h.showCard(5600); await r.sleep(6000); } finally { h.setWindow(false); }
    } else if (k === 'menu') {
      await h.openPanel();
    }
  },
};

// ─── Journey: a guided walk through the app, full screen ───────────────────
// One pinned viewport; each chapter is one screen of scroll. Touch the koi (a short tutorial), the
// real menu asks you to pick another world, play with it (a small guide per scene), the menu shows
// time of day and weather, then more worlds to choose from — and the page carries on below.
// Finishing a chapter's guide moves on by itself; scrolling always moves on too (never a trap).
const CHAPTERS = [
  { id: 'touch', label: 'Touch', next: 'Pick another world' },
  { id: 'choose', label: 'Choose', next: 'Play with it' },
  { id: 'play', label: 'Play', next: 'Set the mood' },
  { id: 'mood', label: 'Set the mood', next: 'More worlds' },
  { id: 'explore', label: 'Explore', next: 'Keep scrolling' },
];
// [what to do, how we know it happened]. move/down/hold/wait complete the current step only;
// media, cat, food, water, toy come straight from the scene and tick their own step.
const GUIDES = {
  koi: [['Move your cursor through the water', 'move'], ['Click the water to drop food', 'down'], ['Press and hold — the koi nibble your fingertip', 'hold']],
  cats: [['Click a cat — it follows your cursor', 'cat'], ['Click the terracotta bowl to feed them', 'food'], ['Click the blue bowl for fresh water', 'water']],
  grass: [['Brush through the meadow', 'move'], ['Click a panda — or the cub', 'down'], ['Look up: kites ride the thermals', 'wait']],
  cafe: [['Click the record player to play or pause', 'media'], ['Click the cat for a slow blink', 'down']],
  cabin: [['Click the fire for sparks', 'down'], ['Click the dog — or the cat on the sill', 'down'], ['Click the window for a gust of snow', 'down']],
  records: [['Click the turntable to drop the needle', 'media'], ['Pet the cat, or the pup', 'down']],
  speakeasy: [['Click the piano keys to play a note', 'down'], ['Click a cat to make a friend', 'down']],
  rooftop: [['Click the boombox to play or pause', 'media'], ['Click the projector for the next track', 'media']],
  ramen: [['Click the vending machine — a can drops', 'down'], ['Brush the noren curtain', 'move'], ['Click the radio to play or pause', 'media']],
  train: [['Click the window to skip ahead', 'down'], ['Watch the countryside roll by', 'wait']],
  bowls: [['Click a bowl to strike it', 'down'], ['Rest on a bowl, then circle its rim', 'move']],
  cymatics: [['Tap the sand', 'down'], ['Each track draws its own figure', 'wait']],
};
const ORDERED = ['move', 'down', 'hold', 'wait'];
const PANEL_COACH_CSS = `@keyframes wpPulse{0%,100%{box-shadow:0 0 0 2px #d9a441}50%{box-shadow:0 0 0 6px rgba(217,164,65,.28)}}
body[data-coach=scenes] section.c:has(:is(.strip,.thumbs)){animation:wpPulse 1.6s ease-in-out infinite}
body[data-coach=time] .timerow{border-radius:11px;animation:wpPulse 1.6s ease-in-out infinite}
body[data-coach=weather] .ico:has(>[data-a=pickWeather]){border-radius:9px;animation:wpPulse 1.6s ease-in-out infinite}`;
const Journey = {
  order: CHAPTERS,
  index: -1, entered: -1, active: false, prog: {}, picked: null,
  init() {
    this.el = $('#journey'); this.stage = $('#journeyStage'); this.guide = $('#journeyGuide'); this.coach = $('#journeyCoach'); this.more = $('#journeyMore');
    this.motion = motionMQ;
    this.el.style.setProperty('--scene-count', CHAPTERS.length);
    this.host = new SceneHost($('#journeyScreen'), { name: 'journey', interactive: true, scene: 'koi' });
    // SceneHost supplies the same app bridge as the playground. The journey keeps the Mac's menu bar
    // (its wave opens wallpap's real panel for this scene); the desktop clutter goes.
    $$('.widgets, .desk-icons, .app-window, .status-pill', this.host.screen).forEach((el) => { el.hidden = true; });
    this.host.screen.insertBefore($('.journey-shade', this.stage), this.host.el.wave.closest('.menubar'));
    this.host.onPick = (id) => this.pick(id);
    const onPanel = this.host.onPanel.bind(this.host);
    this.host.onPanel = (m) => { onPanel(m); this.panelMsg(m); };
    this.host.on((type) => {
      if (type === 'loaded') this.attach();
      if (type === 'live') {
        $('#journeyMode').textContent = 'Live & interactive'; Zoom.update();
        clearTimeout(this.warmT);   // then quietly load the likeliest next world
        this.warmT = setTimeout(() => { if (this.active && this.host.isLive() && this.host.sceneId === 'koi' && this.index <= 1) this.host.prewarm('cats'); }, 1200);
      }
      if (type === 'state') { this.stage.classList.toggle('menu-open', !!this.host.panelOpen); this.placeCoach(); }
    });
    this.host.onMedia = (cmd) => {
      // Sound begins only with a deliberate in-scene media action.
      Sound.set(true);
      const playing = Music.playing;
      this.host.setMusic(true);
      if (cmd === 'playpause') {
        Music.userPaused = playing;
        if (playing) Music.pause(); else Music.play();
      } else Music.next(cmd === 'previous' ? -1 : 1);
      this.fire('media');
    };
    $('#journeyProgress').innerHTML = CHAPTERS.map(() => '<i></i>').join('');
    this.more.innerHTML = `<p class="jm-k">More worlds</p><div class="jm-row">${SCENES.map((s) => `<button type="button" data-world="${s.id}" aria-pressed="false" title="${s.name}"><img src="img/${s.id}-xs.jpg" alt="" width="256" height="160" loading="lazy" decoding="async"><span>${s.name}</span></button>`).join('')}</div>`;
    this.more.addEventListener('click', (e) => { const b = e.target.closest('[data-world]'); if (b) this.pick(b.dataset.world); });
    this.guide.addEventListener('click', (e) => { if (e.target.closest('[data-guide-next]')) this.go(this.index + 1); });
    $('#journeyAdd').addEventListener('click', () => Desktop.open(this.host.sceneId));
    $('#journeyPrev').addEventListener('click', () => this.go(this.index - 1));
    $('#journeyNext').addEventListener('click', () => this.go(this.index + 1));
    $('.journey-skip').addEventListener('click', (e) => { e.preventDefault(); this.go(CHAPTERS.length); });
    $('.journey-entry').addEventListener('click', (e) => { e.preventDefault(); this.go(0); });
    $('.journey-wordmark').addEventListener('click', (e) => { e.preventDefault(); this.go(-1); });
    this.key = (e) => {
      if (!this.active || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest?.('input,select,textarea,[contenteditable="true"]')) return;
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (d && !e.repeat) { e.preventDefault(); this.go(this.index + d); }
      if (e.key === 'Escape') { e.preventDefault(); this.go(CHAPTERS.length); }
    };
    document.addEventListener('keydown', this.key);
    let pending = false;
    this.schedule = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; this.update(); }); } };
    addEventListener('scroll', this.schedule, { passive: true });
    addEventListener('resize', () => { this.schedule(); this.placeCoach(); });
    document.addEventListener('visibilitychange', () => this.update());
    const modeChange = () => {
      if (this.still()) { PG.host.wantLive = false; PG.host.drop(); Tour.setMode('off'); }
      else PG.goLive();
      Tour.idleCaption();
      this.index = -1; this.entered = -1; this.update();
    };
    phoneMQ.addEventListener('change', modeChange); this.motion.addEventListener('change', modeChange);
    this.update();
  },
  still() { return phoneMQ.matches || this.motion.matches || saveData; },
  get chapter() { return (CHAPTERS[this.index] || CHAPTERS[0]).id; },
  go(index) {
    const top = this.el.getBoundingClientRect().top + scrollY;
    const y = index < 0 ? 0 : index >= CHAPTERS.length ? $('#journey-end').offsetTop : top + index * this.stage.offsetHeight + (index === 0 && Zoom.on ? Zoom.fade() : 0);
    if (index < 0 || index >= CHAPTERS.length) {
      scrollTo({ top: y, behavior: index < 0 || this.motion.matches ? 'instant' : 'smooth' });
      (index < 0 ? $('#hero-title') : $('#journey-end')).focus({ preventScroll: true });
    } else scrollTo({ top: y, behavior: this.motion.matches ? 'instant' : 'smooth' });
  },
  update() {
    const r = this.el.getBoundingClientRect(), h = this.stage.offsetHeight;
    const wasActive = this.active;
    this.active = (Zoom.on ? r.top <= 1 : r.top < innerHeight * .5) && r.bottom > innerHeight * .5;
    document.documentElement.classList.toggle('in-journey', this.active);
    const index = clamp(Math.floor((-r.top + h * .35) / h), 0, CHAPTERS.length - 1);
    this.host.wantLive = this.active && !this.still() && !document.hidden;
    this.host.front = this.active;
    if (index !== this.index) this.select(index);
    if (this.active && this.entered !== this.index) this.enter();
    if (!this.active && wasActive) this.leave();
    if (!this.host.wantLive) { this.host.drop(); this.host.dropWarm(); }
    Live.update();
    if (this.host.active) this.host.spawn();
  },
  select(index) {
    if (this.entered >= 0) this.leave();
    this.index = index;
    const ch = this.chapter;
    this.stage.dataset.chapter = ch;
    // The tutorial is the koi's; "Play" needs a world other than the pond (the cats, unless you picked one).
    if (ch === 'touch') this.show('koi');
    else if (ch === 'play' && this.host.sceneId === 'koi') this.show(this.picked || 'cats');
    const n = String(index + 1).padStart(2, '0');
    $('#journeyCount').textContent = `${n} / ${String(CHAPTERS.length).padStart(2, '0')}`;
    $('#journeyCount').setAttribute('aria-label', `Step ${index + 1} of ${CHAPTERS.length}: ${CHAPTERS[index].label}`);
    $$('#journeyProgress i').forEach((el, i) => el.classList.toggle('visited', i <= index));
    $('#journeyPrev').setAttribute('aria-label', index ? 'Previous step' : 'Back to the top');
    $('#journeyNext').setAttribute('aria-label', index === CHAPTERS.length - 1 ? 'Finish' : 'Next step');
  },
  // Put a world on screen (disposing the old one at once, even mid-load).
  show(id) {
    const s = sceneById(id), h = this.host;
    if (h.sceneId !== id || (!h.frame && !h.warm)) {
      ++h.switchTok; h.sceneId = id; h.env = { hour: s.hour, weather: s.weather }; h.timeView = 'auto';
      if (!h.takeWarm(id)) h.drop();
      h.poster.src = `img/${id}.jpg`; h.poster.alt = `${s.name} wallpaper preview`;
      h.music = false; h.syncChrome(); h.renderPlayer();
      if (h.active) h.spawn();
    }
    $('#journeyName').textContent = s.name; $('#journeyCategory').textContent = s.cat;
    $('#journeyMode').textContent = this.still() ? 'Still preview · comes alive on your Mac' : h.isLive() ? 'Live & interactive' : 'Opening this world…';
    $$('[data-world]', this.more).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.world === id)));
    this.stage.dataset.scene = id;
    if (this.entered >= 0 && ['touch', 'play', 'explore'].includes(this.chapter)) this.renderGuide();
  },
  pick(id) {
    this.picked = id;
    this.host.closePanel();
    if (this.chapter === 'choose' || this.chapter === 'touch') { this.show(id); this.go(CHAPTERS.findIndex((c) => c.id === 'play')); }
    else this.show(id);
  },
  // Chapters ─────────────────────────────────────
  enter() {
    this.entered = this.index;
    const ch = this.chapter, h = this.host;
    this.renderGuide();
    this.more.classList.toggle('visible', ch === 'explore' || (ch === 'choose' && this.still()));
    if (this.still()) return;
    if (ch === 'choose' || ch === 'mood') {
      this.coachKey = ch === 'choose' ? 'scenes' : 'time';
      this.coachT = setTimeout(() => this.openPanelCoach(), 650);
      this.placeCoach();
    }
  },
  leave() {
    this.entered = -1;
    clearTimeout(this.coachT); clearTimeout(this.advanceT); clearTimeout(this.waitT);
    this.coachKey = null; this.setPanelCoach(null);
    if (this.host.panelOpen) this.host.closePanel();
    this.coach.classList.remove('visible');
    this.more.classList.remove('visible');
  },
  async openPanelCoach() {
    if (!this.coachKey || this.entered !== this.index) return;
    await this.host.openPanel();
    this.setPanelCoach(this.coachKey);
    this.placeCoach();
  },
  // Highlight part of the real panel (scenes/menu.html): open its section, ring the controls.
  setPanelCoach(k, tries = 0) {
    const f = this.host.panelFrame;
    let w, d;
    try { w = f && f.contentWindow; d = w && w.document; } catch (e) { return; }
    if (!d || !d.body || typeof w.render !== 'function') { if (k && tries < 30) setTimeout(() => this.setPanelCoach(k, tries + 1), 100); return; }
    if (!d.getElementById('wpCoach')) { const st = d.createElement('style'); st.id = 'wpCoach'; st.textContent = PANEL_COACH_CSS; d.head.appendChild(st); }
    if (!k) { delete d.body.dataset.coach; return; }
    d.body.dataset.coach = k;
    this.host.renderPanel();
    const sel = k === 'scenes' ? '.strip, .thumbs' : k === 'time' ? '.timerow' : '[data-a=pickWeather]';
    requestAnimationFrame(() => { const t = d.querySelector(sel); if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  },
  coachText() {
    const k = this.coachKey;
    if (!k) return '';
    if (!this.host.panelOpen) return 'Click the wave in the menu bar — that’s wallpap.';
    return k === 'scenes' ? 'This is wallpap’s menu, up in your menu bar. Pick another world.'
      : k === 'time' ? 'Turn the clock. Try Sunset — or Night.'
      : k === 'weather' ? 'Now the sky. Make it rain, or snow.'
      : 'Everything lives in this one menu.';
  },
  placeCoach() {
    const c = this.coach, t = this.coachText();
    if (!t || !this.active || this.entered !== this.index) { c.classList.remove('visible'); return; }
    c.textContent = t;
    const sr = this.stage.getBoundingClientRect(), open = this.host.panelOpen, pop = this.host.el.pop.getBoundingClientRect(), wave = this.host.el.wave.getBoundingClientRect();
    c.classList.toggle('side', open);
    if (open) { c.style.right = `${Math.max(12, sr.right - pop.left + 16)}px`; c.style.top = `${pop.top - sr.top + 34}px`; }
    else { c.style.right = `${Math.max(12, sr.right - wave.right - 6)}px`; c.style.top = ''; }
    c.classList.add('visible');
  },
  panelMsg(m) {
    if (m.a === 'runAction') this.fire({ feed: 'food', water: 'water', toy: 'toy' }[m.v] || 'down');
    if (this.chapter !== 'mood' || this.entered !== this.index) return;
    if (m.a === 'pickTimeView' && this.coachKey === 'time') { this.coachKey = 'weather'; this.setPanelCoach('weather'); this.placeCoach(); }
    else if (m.a === 'pickWeather' && m.v && this.coachKey === 'weather') {
      this.coachKey = 'done'; this.setPanelCoach(null); this.placeCoach();
      const i = this.index;
      this.advanceT = setTimeout(() => { if (this.index === i && this.active) { this.host.closePanel(); this.go(i + 1); } }, 2400);
    }
  },
  // The small guide ───────────────────────────────
  steps() { return GUIDES[this.host.sceneId] || []; },
  done() { const id = this.host.sceneId; return (this.prog[id] = this.prog[id] || this.steps().map(() => false)); },
  renderGuide() {
    const ch = this.chapter, g = this.guide;
    const menuCh = ch === 'choose' || ch === 'mood';
    const on = (!menuCh || this.still()) && this.entered === this.index;
    g.classList.toggle('visible', on);
    if (!on) return;
    if (menuCh) {   // phones and still previews: the menu chapters as a short note (pick from the strip below)
      g.classList.remove('complete');
      g.innerHTML = `<p class="g-k">The menu</p><p class="g-still">${ch === 'choose' ? 'wallpap lives in your Mac’s menu bar. Pick another world from it — try one below.' : 'From the same menu, turn the clock to sunset or night and bring in rain or snow.'}</p>
        <div class="g-foot"><span></span><button type="button" data-guide-next>${CHAPTERS[this.index].next} <span aria-hidden="true">↓</span></button></div>`;
      return;
    }
    const steps = this.steps(), done = this.done(), cur = done.indexOf(false), all = cur < 0, s = this.host.scene;
    const still = this.still(), nextLabel = CHAPTERS[this.index].next;
    g.innerHTML = `<p class="g-k">${ch === 'touch' ? 'Your first world' : ch === 'play' ? 'Play' : 'Try'} · ${s.name}</p>
      ${still ? '<p class="g-still">On your Mac you can:</p>' : ''}
      <ol class="g-steps">${steps.map(([t], i) => `<li class="${done[i] ? 'done' : i === cur && !still ? 'now' : ''}"><i aria-hidden="true"></i><span>${t}</span></li>`).join('')}</ol>
      <div class="g-foot">${all && !still ? '<span class="g-ok">Nicely done.</span>' : '<span></span>'}<button type="button" data-guide-next>${nextLabel} <span aria-hidden="true">↓</span></button></div>`;
    g.classList.toggle('complete', all);
    clearTimeout(this.waitT);
    if (!all && steps[cur][1] === 'wait' && !still) { const id = s.id; this.waitT = setTimeout(() => { if (this.host.sceneId === id) this.fire('wait'); }, 3800); }
  },
  fire(kind) {
    if (this.entered !== this.index || !['touch', 'play', 'explore'].includes(this.chapter)) return;
    const steps = this.steps(), done = this.done(), cur = done.indexOf(false);
    if (cur < 0) return;
    let i = -1;
    if (ORDERED.includes(kind)) { if (steps[cur][1] === kind) i = cur; }
    else i = steps.findIndex(([, k], j) => k === kind && !done[j]);
    if (i < 0) return;
    done[i] = true;
    this.renderGuide();
    if (done.every(Boolean) && this.chapter !== 'explore') {
      const at = this.index;
      clearTimeout(this.advanceT);
      this.advanceT = setTimeout(() => { if (this.index === at && this.active && !this.host.panelOpen) this.go(at + 1); }, 1900);
    }
  },
  attach() {
    const win = this.host.frame?.contentWindow;
    if (!win || win.__jHooked) return;
    win.__jHooked = true;
    win.addEventListener('keydown', this.key);
    // Canvas scenes have no scrollable content. Forward their wheel to the document so
    // the journey is never a scroll trap, including when the pointer is over an iframe.
    win.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      scrollBy({ top: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1), behavior: 'instant' });
    }, { passive: false });
    // These scenes play notes directly rather than sending a media-player message.
    // Unlock their sound on the visitor's first click, before LW handles that click.
    if (['bowls', 'speakeasy'].includes(this.host.sceneId)) {
      win.addEventListener('pointerdown', () => { if (!Sound.on) Sound.set(true); }, { capture: true, once: true });
    }
    // What the guide listens for: a sweep of the cursor, a click, a press held.
    let last = null, dist = 0, holdT = 0;
    win.addEventListener('pointermove', (e) => {
      if (last) { dist += Math.hypot(e.clientX - last[0], e.clientY - last[1]); if (dist > 280) { dist = 0; this.fire('move'); } }
      last = [e.clientX, e.clientY];
    }, { passive: true });
    win.addEventListener('pointerdown', () => { this.fire('down'); clearTimeout(holdT); holdT = setTimeout(() => this.fire('hold'), 800); }, { passive: true });
    win.addEventListener('pointerup', () => clearTimeout(holdT), { passive: true });
    win.addEventListener('pointercancel', () => clearTimeout(holdT), { passive: true });
    // Santorini Cats tells us exactly what happened: a cat clicked, a bowl filled, a toy tossed.
    const hookCats = (tries = 0) => {
      const c = win.__cats;
      if (!c || !c.pets) { if (tries < 40) setTimeout(() => hookCats(tries + 1), 150); return; }
      const p = c.pets, click = p.click, toy = p.toy;
      p.click = (...a) => { const r = click.apply(p, a); if (r) this.fire('cat'); return r; };
      p.toy = (...a) => { const r = toy.apply(p, a); this.fire('toy'); return r; };
      if (win.LW) win.LW.on('bowl', (k) => this.fire(k));
    };
    if (this.host.sceneId === 'cats') hookCats();
  },
};

// ─── Zoom: scroll into the Mac ───────────────────────────────────────────────
// The hero is pinned while the Mac's screen grows (one transform on the Mac) until it covers the
// window; then the Mac fades away over the journey, which is already pinned underneath on the same scene.
const Zoom = {
  on: false, e: 0,
  run() { return innerHeight; },             // scroll spent zooming (--zr)
  fade() { return innerHeight * .3; },       // scroll spent handing over to the journey (--zf)
  init() {
    this.mac = $('#mac'); this.screen = $('#pgScreen'); this.hero = $('#scenes');
    this.wide = matchMedia('(min-width: 900px) and (min-height: 560px)');
    const apply = () => {
      this.on = this.wide.matches && !motionMQ.matches && !phoneMQ.matches;
      document.documentElement.classList.toggle('zoom-on', this.on);
      this.measure(); this.update();
    };
    [this.wide, motionMQ, phoneMQ].forEach((m) => m.addEventListener('change', apply));
    let pending = false;
    const tick = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; this.update(); }); } };
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', () => { this.measure(); this.update(); });
    new ResizeObserver(() => { this.measure(); this.update(); }).observe(this.mac.parentElement);
    apply();
  },
  measure() {      // the screen's place inside the Mac, untransformed
    const t = this.mac.style.transform; this.mac.style.transform = '';
    const m = this.mac.getBoundingClientRect(), s = this.screen.getBoundingClientRect();
    this.off = [s.left - m.left, s.top - m.top]; this.sw = s.width; this.sh = s.height;
    this.mac.style.transform = t;
    // The menu bar stays through the zoom; the journey's is sized to what the hero's becomes at full
    // size, so the hand-off is seamless.
    const jm = $('#journeyScreen .menubar'), js = $('#journeyScreen'), st = $('#journeyStage');
    if (!jm) return;
    if (this.on && this.sw) {
      const mb = $('.menubar', this.screen), cs = getComputedStyle(mb), S = Math.max(innerWidth / this.sw, innerHeight / this.sh), h = mb.offsetHeight * S;
      jm.style.height = `${h}px`; jm.style.fontSize = `${parseFloat(cs.fontSize) * S}px`;
      jm.style.paddingLeft = jm.style.paddingRight = `${parseFloat(cs.paddingLeft) * S}px`;
      js.style.setProperty('--mb-h', `${h}px`); st.style.setProperty('--jmb', `${h}px`);
    } else { jm.style.cssText = ''; js.style.removeProperty('--mb-h'); st.style.removeProperty('--jmb'); }
  },
  update() {
    const root = document.documentElement;
    if (!this.on || !this.sw) {
      this.e = 0; this.mac.style.transform = '';
      root.style.removeProperty('--zoom'); root.classList.remove('zoomed', 'zoom-reveal'); return;
    }
    const run = this.run();
    const p = clamp(scrollY / (run * .9), 0, 1), e = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    // Where the screen sits now (the Mac's parent is never transformed) and where it should end:
    // covering the window, centred.
    const base = this.mac.parentElement.getBoundingClientRect(), sx = base.left + this.off[0], sy = base.top + this.off[1];
    const S = Math.max(innerWidth / this.sw, innerHeight / this.sh) * 1.006, tx = (innerWidth - this.sw * S) / 2, ty = (innerHeight - this.sh * S) / 2;   // a hair over: no bezel sliver
    this.mac.style.transformOrigin = `${this.off[0]}px ${this.off[1]}px`;
    this.mac.style.transform = e ? `translate(${(tx - sx) * e}px,${(ty - sy) * e}px) scale(${1 + (S - 1) * e})` : '';
    // Hand over once the journey underneath is pinned AND its own scene is live: the screen is never a still.
    const reveal = scrollY >= run - 1 && !!Journey.host?.isLive() || scrollY >= run + this.fade();
    this.e = e;
    root.style.setProperty('--zoom', e.toFixed(4));
    root.classList.toggle('zoomed', e > .35);
    root.classList.toggle('zoom-reveal', !!reveal);
    if (reveal && !this.revealed && Journey.host) Journey.placeCoach();
    this.revealed = !!reveal;
    if (e > .02 && Tour.running) Tour.stop();
  },
};

// ─── Boot ────────────────────────────────────────────────────────────────────
Desktop.init();
PG.init();
Tour.init();
Try.init();
Journey.init();
Zoom.init();
Journey.update();
Live.update();
// The live scene starts after the page has loaded and the browser is idle; the poster carries the
// first paint. (Any touch in the hero, Fullscreen or a "Try it" starts it sooner.)
const goLiveSoon = () => idle(() => PG.goLive(), 1500);
if (document.readyState === 'complete') goLiveSoon(); else addEventListener('load', goLiveSoon, { once: true });
