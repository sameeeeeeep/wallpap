// LiveWall shim — one input/audio API for every scene, whether it runs
// inside the native desktop host (WKWebView at desktop level, which never
// receives real mouse events) or in a normal browser tab for development.
//
// Scenes use:
//   LW.on('move', (x, y) => ...)      cursor moved (CSS px, window-local)
//   LW.on('down', (x, y) => ...)      click on the desktop (not on another app's window)
//   LW.on('up',   (x, y) => ...)
//   LW.on('drag', (x, y) => ...)      move while held
//   LW.on('mute', (muted) => ...)
//   LW.pointer                        {x, y, down, inside, t}
//   LW.audio()                        shared AudioContext (or null if muted/unavailable)
//   LW.muted, LW.isHost
//
// Ambient / wellbeing layer (host sends real weather + reminder timers):
//   LW.env        {weather, intensity, temp, hour, isDay, wind}
//                 weather ∈ 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'
//                 hour = local fractional hour 0..24 (drives dawn/day/dusk/night)
//   LW.on('env', env => ...)          fires on load and whenever it changes
//   LW.on('reminder', r => ...)       r = {kind:'water'|'stretch'|'breathe', text}
//                                     scenes show it IN-WORLD, gently, then let it fade
//   Breathing: one standard overlay drawn by this runtime over every scene (orb + phase ring +
//   countdown + Done). Scenes are NOT told (LW.calm stays false, 'calm' is never emitted);
//   LW.breathing / LW.setBreathing(on) / LW.on('breathing', on). Done posts {type:'calm', on:false}.
// Music mode (host reads Apple Music / Spotify "now playing"):
//   LW.nowPlaying  {title, artist, album, artwork (data/https URL or ''), playing, app} | null
//   LW.on('nowplaying', np => ...)    fires on track/play-state change
// Audio categories (each has its own on/off + volume, set from the menu):
//   LW.bus('fx')       interaction sounds (clicks, purrs, plops, strikes)   ← default
//   LW.bus('ambience') the scene's own background bed (train rumble, fire, café hiss…)
//   LW.bus('weather')  rain, thunder, wind
//   (music-reactive scenes don't play music themselves; soundscapes have their own bus)
//   Anything a scene connects straight to ctx.destination lands on 'fx' automatically,
//   so scenes only need LW.bus() for ambience/weather.
// Breathing (calm mode): LW.breathState(t) → {phase:'in'|'hold'|'out'|'rest', k, level, label}
//   pattern from settings: 'box' (4-4-4-4, default) | 'calm' (4 in / 6 out) | '478'.
//   lw.js draws the guide (a dot tracing a square for box, a ring otherwise) — scenes just
//   dim/slow and may use .level (0 empty … 1 full lungs) to breathe their world.
//   Diegetic breathing (opt-in): a scene whose own world visibly breathes sets, at load,
//     LW.breathDiegetic = true
//   and lw.js then drops the big glow/box overlay and keeps only a small, low-contrast
//   phase label ("breathe in" / "hold" / "breathe out") with a thin segmented progress cue
//   (one segment per phase, so holds read). Optional: LW.breathLabelAt = [fx, fy] moves the
//   label (fractions of the viewport; default [0.36, 0.84], inside the left ~70%).
//   Scenes drive their world from LW.breathState(t).level and must HOLD still during
//   'hold'/'rest' (level is constant there). Same clock as the label:
//     LW.breathTime()   seconds on the guide's clock; 0 while the guide isn't running (it starts on
//                       the window load event / when calm turns on). Scenes should prefer it over their
//                       own clock whenever it's > 0, and keep their own only for scene-started calm.
//     LW.breathFade     0..1, how far the guide is faded in (follows calm on/off, ~2s)
//   The label sits on a faint smoked chip so it stays readable on bright scenes; keep it above
//   y ≈ 0.87 so the Dock and the bottom companion strip don't cover it.
// Beat sync (opt-in host feature: passive system-audio analysis while music plays):
//   LW.music      {level, bass, mid, high} 0..1, smoothed — live when LW.music.live
//   LW.on('beat', strength => ...)   fires on detected beats (strength 0..1)
//   When beat sync is off but a track is playing, lw.js synthesizes a gentle
//   ~96 bpm pulse (LW.music.live = false) so scenes can still breathe with it.
// Background soundscape (independent of the scene's interactive sounds, set
// globally from the menu): white | pink | brown | rain | ocean | fire | stream | off.
//   LW.soundscape  {kind, volume}     — lw.js plays it; scenes don't need to do anything.
// AI companions (host watches Claude Code / Codex session activity):
//   LW.agents   {style:'native'|'off', list:[{id, kind:'claude'|'codex', project, state:'working'|'idle'|'attention'}]}
//   LW.on('agents', a => ...)   'attention' = finished or blocked, waiting for the user.
//   Only scenes that give companions an in-world form draw them (Koi Pond); others ignore this.
// Energy: lw.js governs requestAnimationFrame for every scene.
//   LW.fps       target frame rate while the desktop is in use (host setting: 20/30/60)
//   LW.focused   false when the user hasn't touched the desktop for a while → the
//                scene blurs softly and stops rendering entirely (0 fps).
//   LW.keepAlive set true while a scene must keep ticking for audio (e.g. bowls auto
//                play) → it ticks at 2 fps behind the blur instead of stopping.
//   Scenes must clamp dt (a resume can follow a long pause).
// Landing-page embeds can drive a scene with
//   iframe.contentWindow.postMessage({__lw: ['env', {weather:'rain'}]}, '*')
// Dev keys (browser only): w = cycle weather, t = +3h time, r = water reminder,
//   b = toggle calm/breathe, m = mute. URL: ?weather=rain&hour=22&calm=1
//
// The host calls window.__lw(type, x, y, flag).
(function () {
  const handlers = {};
  const runtimeBase = new URL(".", document.currentScript.src);
  let playLoading = false;
  const qs = new URLSearchParams(location.search);
  const LW = {
    isHost: !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.lw),
    muted: qs.get('muted') === '1',
    pointer: { x: -9999, y: -9999, down: false, inside: false, t: 0 },
    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    emit(type, ...args) { (handlers[type] || []).forEach((fn) => { try { fn(...args); } catch (e) { console.error(e); } }); },
    _ctx: null,
    audio() {
      if (LW.muted) return null;
      if (!LW._ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        LW._ctx = new AC({ latencyHint: 'interactive' });
        if (!audioWanted()) syncAudio();   // created while paused: don't let it run
      }
      if (LW._ctx.state !== 'running' && audioWanted()) LW._ctx.resume().catch(() => {});
      return LW._ctx;
    },
    post(msg) {
      if (LW.isHost) window.webkit.messageHandlers.lw.postMessage(msg);
    },
  };

  // ─── Idle governor: a paused page does no work ──────────────────────────
  // While the scene is paused (LW.focused false) and nothing keeps it alive (LW.keepAlive, e.g. bowls
  // auto-play), every setInterval the page registered is suspended — cleared natively, so no timer
  // wakes the process — and re-armed on resume; the shared AudioContext fades its scene buses out and
  // suspends (its clock stops, so scheduled sound resumes exactly where it was). The global soundscape
  // is an explicit choice and keeps sounding: then the context stays running with the scene buses at 0.
  // setTimeout is left alone (one-shots end by themselves; lw.js's own still/pill fades rely on it).
  const rawSetInterval = window.setInterval.bind(window), rawClearInterval = window.clearInterval.bind(window);
  const rawSetTimeout = window.setTimeout.bind(window), rawClearTimeout = window.clearTimeout.bind(window);
  const intervals = new Map();
  let ivSeq = 1 << 30, idle = false, suspendT = 0;
  window.setInterval = function (fn, ms, ...args) {
    if (typeof fn !== 'function') return rawSetInterval(fn, ms, ...args);
    const id = ivSeq++, rec = { ms, raw: 0, run: () => fn.apply(window, args) };
    intervals.set(id, rec);
    if (!idle) rec.raw = rawSetInterval(rec.run, ms);
    return id;
  };
  const clearAny = (raw) => function (id) {
    const rec = intervals.get(id);
    if (!rec) return raw(id);
    if (rec.raw) rawClearInterval(rec.raw);
    intervals.delete(id);
  };
  window.clearInterval = clearAny(rawClearInterval);
  window.clearTimeout = clearAny(rawClearTimeout);   // the two id spaces are interchangeable on the web
  function setIdle(on) {
    if (idle === on) return;
    idle = on;
    for (const rec of intervals.values()) {
      if (on) { rawClearInterval(rec.raw); rec.raw = 0; } else if (!rec.raw) rec.raw = rawSetInterval(rec.run, rec.ms);
    }
    syncAudio();
  }
  const soundscapeOn = () => !!(SS && SS.gain);
  function audioWanted() { return !LW.muted && (!idle || soundscapeOn()); }
  function syncAudio() {
    const ctx = LW._ctx;
    if (!ctx) return;
    for (const k in BUS) applyBus(k);   // scene buses go quiet while idle
    rawClearTimeout(suspendT);
    if (audioWanted()) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); }
    else if (ctx.state === 'running') suspendT = rawSetTimeout(() => { if (!audioWanted() && LW._ctx === ctx) ctx.suspend().catch(() => {}); }, LW.muted ? 0 : 450);   // after the fade
  }
  LW._idle = () => idle;

  function input(type, x, y) {
    if (type === 'down' && LW._breathHit && LW._breathHit(x, y)) { LW.setBreathing(false); return; }
    const p = LW.pointer;
    p.x = x; p.y = y; p.t = performance.now(); p.inside = true;
    if (type === 'down') { p.down = true; LW.audio(); if (LW.soundscape.kind !== 'off' && !SS.gain) startSoundscape(); }
    if (type === 'up') p.down = false;
    if (type === 'move' && p.down) LW.emit('drag', x, y);
    LW.emit(type, x, y);
  }

  const viewHours = {sunrise:6.3, day:12, sunset:18.3, evening:19.6, night:0};
  const viewLabels = {auto:'Auto · local time', sunrise:'Sunrise', day:'Day', sunset:'Sunset', evening:'Evening', night:'Night'};
  const standalone = !LW.isHost && window.self === window.top;
  const localHour = () => { const d=new Date(); return d.getHours()+d.getMinutes()/60; };
  let savedView='auto';
  if(standalone)try{savedView=localStorage.getItem('lw.view')||'auto';}catch(e){}
  const validView = v => v==='auto'||Object.prototype.hasOwnProperty.call(viewHours,v);
  const queryHour=qs.has('hour')&&qs.get('hour').trim()!==''?Number(qs.get('hour')):NaN;
  let pinnedHour=Number.isFinite(queryHour)?((queryHour%24)+24)%24:null;
  let viewMode=LW.isHost?'auto':validView(qs.get('view'))?qs.get('view'):pinnedHour!==null?'custom':validView(savedView)?savedView:'auto';
  LW.view = viewMode;
  let viewTransitionUntil=0;
  LW.envBlend=(dt,seconds)=>1-Math.exp(-dt/(performance.now()<viewTransitionUntil?0.65:seconds));
  LW.env = {
    weather: qs.get('weather') || 'clear',
    intensity: +(qs.get('intensity') || 0.7), temp:20, wind:0.3,
    hour: viewMode==='custom'?pinnedHour:viewMode==='auto'?localHour():viewHours[viewMode], isDay:true,
  };
  LW.env.isDay = LW.env.hour > 6.5 && LW.env.hour < 19.5;
  // Breathing is one standard overlay drawn here for every scene (scenes no longer stage their own):
  // LW.calm stays false for scenes, LW.breathing is the overlay.
  LW.calm = false;
  LW.breathing = qs.get('calm') === '1';
  LW.setEnv = function (patch) {
    if(LW.isHost&&(validView(patch.view)||patch.view==='cycle')&&patch.view!==LW.view){   // 'cycle' = host's accelerated day: use its hour, not the real sky
    LW.view=patch.view;viewTransitionUntil=performance.now()+6000;}
    const clockHour=Number.isFinite(patch.hour)?patch.hour:(LW.env.clockHour??localHour());
    Object.assign(LW.env, patch);
    LW.env.clockHour=clockHour;LW.env.hour=clockHour;
    if(standalone && viewMode!=='auto')LW.env.hour=viewMode==='custom'?pinnedHour:viewHours[viewMode];
    const sky=LW.view==='auto'&&window.LWAstronomy?LWAstronomy.calculate(new Date(),LW.env.location):null;
    LW.env.astronomy=sky;
    if(sky)LW.env.hour=sky.hour;
    LW.env.isDay=sky?sky.isDay:LW.env.hour>6.5&&LW.env.hour<19.5;
    LW.emit('env', LW.env);
  };
  LW.moonVisibility=()=>LW.env.astronomy?LW.env.astronomy.moon.visibility:1;
  LW.setView = function (mode, hour) {
    if(LW.isHost||(!validView(mode)&&!(mode==='custom'&&Number.isFinite(hour))))return;
    viewTransitionUntil=performance.now()+6000;
    viewMode=mode;LW.view=mode;pinnedHour=mode==='custom'?((hour%24)+24)%24:null;
    if(standalone){
      try{localStorage.setItem('lw.view',mode==='custom'?'auto':mode);}catch(e){}
      const url=new URL(location.href);url.searchParams.delete('hour');url.searchParams.delete('view');
      if(mode==='custom')url.searchParams.set('hour',String(pinnedHour));
      else url.searchParams.set('view',mode);
      history.replaceState(null,'',url);
    }
    LW.setEnv({hour:mode==='auto'?localHour():mode==='custom'?pinnedHour:viewHours[mode]});
    LW.emit('view',mode);
  };
  // Only Auto follows wall-clock time. Native windows receive the host clock.
  setInterval(() => { if(!LW.isHost&&viewMode==='auto')LW.setEnv({hour:localHour()}); },60000);
  addEventListener('load', () => { LW.emit('env', LW.env); if (LW.calm) LW.emit('calm', true); });
  // Compact browser-only control; embeds and the desktop use their own menus.
  if(standalone && qs.get('virtual')!=='1'){
    const mount=()=>{
      const box=document.createElement('label');box.dataset.lwControls='';
      box.style.cssText='position:fixed;z-index:2147483646;top:16px;right:16px;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #ffffff30;border-radius:12px;background:#18232bcb;color:#f7f3ea;box-shadow:0 3px 16px #0002;backdrop-filter:blur(12px);font:12px/1.4 system-ui,sans-serif;';
      const caption=document.createElement('span');caption.textContent='View';box.append(caption);
      const select=document.createElement('select');select.setAttribute('aria-label','Time of day');
      select.style.cssText='font:inherit;color:inherit;background:#26353d;border:1px solid #ffffff30;border-radius:7px;padding:5px 7px;cursor:pointer;max-width:170px;';
      for(const [value,label] of Object.entries(viewLabels)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
      const sync=()=>{
        let custom=select.querySelector('option[value="custom"]');
        if(viewMode==='custom'){if(!custom){custom=document.createElement('option');custom.value='custom';select.append(custom);}custom.textContent='Fixed · '+String(Math.floor(pinnedHour)).padStart(2,'0')+':'+String(Math.floor((pinnedHour%1)*60)).padStart(2,'0');}
        else if(custom)custom.remove();
        select.value=viewMode;box.title=viewMode==='auto'?'Follows your local clock':'Fixed lighting; choose Auto to follow your local clock';
      };
      select.addEventListener('change',()=>LW.setView(select.value));
      for(const type of ['pointerdown','pointerup','pointermove','click','keydown'])box.addEventListener(type,e=>e.stopPropagation());
      const locate=document.createElement('button');locate.type='button';locate.textContent='Use location';
      locate.style.cssText='font:inherit;color:inherit;background:transparent;border:0;padding:5px;cursor:pointer;';
      locate.title='Use your location to sync sunrise, sunset and moonrise in Auto. Calculated on this device.';
      locate.addEventListener('click',()=>{
        if(!navigator.geolocation){locate.textContent='Location unavailable';return;}
        locate.disabled=true;locate.textContent='Locating…';
        navigator.geolocation.getCurrentPosition(pos=>{
          LW.setEnv({location:{latitude:pos.coords.latitude,longitude:pos.coords.longitude,approximate:pos.coords.accuracy>5000}});
          locate.textContent='Location synced';locate.disabled=false;
        },()=>{locate.textContent='Retry location';locate.disabled=false;},{enableHighAccuracy:false,timeout:12000,maximumAge:900000});
      });
      const showLocate=()=>{locate.hidden=viewMode!=='auto';};LW.on('view',showLocate);showLocate();
      box.append(select,locate);document.body.append(box);LW.on('view',sync);sync();
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  }

  const REMINDER_TEXT = {
    water: 'a sip of water?',
    stretch: 'roll your shoulders, unclench your jaw',
    breathe: 'breathe in… and out',
  };

  // Per-scene settings, persisted by the host (UserDefaults) and editable from
  // the menu bar or from in-scene controls:
  //   LW.settings              current values (scene supplies defaults)
  //   LW.on('settings', s)     fires when the host pushes / anything changes
  //   LW.set(key, value)       change + persist (host remembers per scene)
  //   LW.on('action', name)    one-shot commands from the menu (e.g. 'feed', 'water')
  // Browser dev: ?set.mode=focus&set.bowls=9 seeds settings; changes go to localStorage.
  LW.settings = {};
  for (const [k, v] of qs) if (k.startsWith('set.')) LW.settings[k.slice(4)] = isNaN(+v) || v === '' ? v : +v;
  if (!LW.isHost) { try { Object.assign(LW.settings, JSON.parse(localStorage.getItem('lw.settings.' + location.pathname) || '{}')); } catch (e) {} }
  LW.set = function (key, value) {
    LW.settings[key] = value;
    LW.emit('settings', LW.settings);
    if (LW.isHost) LW.post({ type: 'set', key, value });
    else { try { localStorage.setItem('lw.settings.' + location.pathname, JSON.stringify(LW.settings)); } catch (e) {} }
  };

  // ─── Music mode ───────────────────────────────────────────────────────────
  LW.nowPlaying = null;
  function setNowPlaying(np) {
    const prev = LW.nowPlaying;
    LW.nowPlaying = np && np.title ? np : null;
    const changed = !prev !== !LW.nowPlaying || (prev && LW.nowPlaying &&
      (prev.title !== np.title || prev.artist !== np.artist || prev.playing !== np.playing || prev.artwork !== np.artwork));
    if (changed) LW.emit('nowplaying', LW.nowPlaying);
    if (LW.nowPlaying) wakePulse();
  }

  // ─── Audio buses ──────────────────────────────────────────────────────────
  LW.audioPrefs = { fx: { on: true, vol: 1 }, ambience: { on: true, vol: 1 }, weather: { on: true, vol: 1 } };
  const BUS = {};
  LW.bus = function (cat) {
    const ctx = LW.audio();
    if (!ctx) return null;
    if (!BUS[cat]) {
      const g = ctx.createGain();
      g.__lwBus = true;
      __rawConnect.call(g, ctx.destination);
      BUS[cat] = g;
      applyBus(cat);
    }
    return BUS[cat];
  };
  function applyBus(cat) {
    const g = BUS[cat], p = LW.audioPrefs[cat];
    if (!g || !p || !LW._ctx) return;
    g.gain.setTargetAtTime(p.on && !idle ? p.vol : 0, LW._ctx.currentTime, idle ? 0.1 : 0.25);
  }
  // Route anything connected straight to the speakers through the 'fx' bus.
  const __rawConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target && this.context && target === this.context.destination && !this.__lwBus) {
      const fx = LW.bus('fx');
      if (fx) return __rawConnect.call(this, fx, ...rest);
    }
    return __rawConnect.call(this, target, ...rest);
  };

  // ─── Breathing patterns + guide ───────────────────────────────────────────
  const PATTERNS = {
    box:  [['in', 4, 'breathe in'], ['hold', 4, 'hold'], ['out', 4, 'breathe out'], ['rest', 4, 'hold']],
    calm: [['in', 4, 'breathe in'], ['out', 6, 'breathe out']],
    '478': [['in', 4, 'breathe in'], ['hold', 7, 'hold'], ['out', 8, 'breathe out']],
  };
  LW.breathPattern = function () { return PATTERNS[LW.settings.breath] ? LW.settings.breath : (PATTERNS[LW.globalBreath] ? LW.globalBreath : 'box'); };
  LW.breathState = function (t) {
    const P = PATTERNS[LW.breathPattern()], total = P.reduce((a, p) => a + p[1], 0);
    let x = ((t % total) + total) % total;
    for (const [phase, dur, label] of P) {
      if (x < dur) {
        const k = x / dur, e = 0.5 - 0.5 * Math.cos(Math.PI * k);
        const level = phase === 'in' ? e : phase === 'out' ? 1 - e : phase === 'hold' ? 1 : 0;
        return { phase, k, level, label, dur, cycle: total };
      }
      x -= dur;
    }
    return { phase: 'in', k: 0, level: 0, label: 'breathe in', dur: 4, cycle: total };
  };
  const BG = { cv: null, on: false, a: 0, t0: 0, last: 0, btn: null, breaths: 0, lastCycle: -1 };
  LW.breathDiegetic = false;   // kept for old scenes; ignored
  LW.breathLabelAt = null;
  LW.breathFade = 0;           // scenes no longer react to breathing
  LW.breathTime = function () { return 0; };
  // Where the guide sits (the open part of the screen, clear of widgets) and its Done button.
  function breathGeom() {
    const W = innerWidth, H = innerHeight, m = Math.min(W, H), cl = (LW.layout && LW.layout.clear) || [0, 1];
    const cx = W * (cl[0] + cl[1]) / 2, cy = H * 0.47, R = m * 0.13, RR = R * 1.18;
    const bw = m * 0.11, bh = m * 0.042;
    return { W, H, m, cx, cy, R, RR, bw, bh, bx: cx - bw / 2, by: cy + RR + m * 0.075 };
  }
  // The standard breathing overlay: the scene dims a little, an orb fills and empties with the
  // breath inside a ring that shows the phase, a big countdown, and a Done button to dismiss.
  function breathGuide(ts) {
    const want = LW.breathing;
    if (!want && BG.a < 0.01) { BG.on = false; BG.btn = null; if (BG.cv) BG.cv.getContext('2d').clearRect(0, 0, BG.cv.width, BG.cv.height); return; }
    requestAnimationFrame(breathGuide);
    const t = ts / 1000, dt = Math.min(0.1, BG.last ? t - BG.last : 0.016); BG.last = t;
    BG.a += ((want ? 1 : 0) - BG.a) * Math.min(1, dt * 2.2);
    if (!BG.cv) {
      BG.cv = document.createElement('canvas');
      BG.cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:40';
      document.documentElement.appendChild(BG.cv);
    }
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight, cv = BG.cv;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const el = t - BG.t0, st = LW.breathState(el), a = BG.a, G = breathGeom(), m = G.m;
    const cyc = Math.floor(el / st.cycle);
    if (cyc !== BG.lastCycle) { if (BG.lastCycle >= 0) BG.breaths++; BG.lastCycle = cyc; }
    // Keep clear of widgets: centre in the open part of the screen.
    const { cx, cy, R } = G;
    // dim the scene so the guide reads on any picture
    const v = c.createRadialGradient(cx, cy, R * 0.5, cx, cy, Math.max(W, H) * 0.75);
    v.addColorStop(0, `rgba(6,10,14,${0.34 * a})`); v.addColorStop(1, `rgba(6,10,14,${0.55 * a})`);
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    // a soft dark pool behind the guide so it reads over busy scenes
    const pool = c.createRadialGradient(cx, cy + R * 0.4, R * 0.3, cx, cy + R * 0.4, R * 2.6);
    pool.addColorStop(0, `rgba(6,10,14,${0.42 * a})`); pool.addColorStop(1, 'rgba(6,10,14,0)');
    c.fillStyle = pool; c.fillRect(0, 0, W, H);
    // the orb: fills on the in-breath, holds, empties on the out-breath
    const r = R * (0.5 + 0.5 * st.level);
    c.globalAlpha = a;
    const g = c.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r * 1.25);
    g.addColorStop(0, 'rgba(255,250,240,0.55)'); g.addColorStop(0.6, 'rgba(232,240,236,0.26)'); g.addColorStop(1, 'rgba(232,240,236,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r * 1.25, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,250,240,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    // the ring: one arc per phase (length ∝ its seconds), the current one fills
    const P = { box: [['in', 4], ['hold', 4], ['out', 4], ['rest', 4]], calm: [['in', 4], ['out', 6]], '478': [['in', 4], ['hold', 7], ['out', 8]] }[LW.breathPattern()];
    const RR = G.RR, gap = 0.06, tot = st.cycle; let ang = -Math.PI / 2;
    const curI = P.findIndex((p) => p[0] === st.phase);
    c.lineCap = 'round'; c.lineWidth = Math.max(2.5, m * 0.004);
    P.forEach(([ph, d], i) => {
      const span = (Math.PI * 2) * d / tot - gap;
      c.strokeStyle = 'rgba(255,250,240,0.18)'; c.beginPath(); c.arc(cx, cy, RR, ang, ang + span); c.stroke();
      const f = i < curI ? 1 : i === curI ? st.k : 0;
      if (f > 0) { c.strokeStyle = 'rgba(255,250,240,0.92)'; c.beginPath(); c.arc(cx, cy, RR, ang, ang + span * f); c.stroke(); }
      ang += span + gap;
    });
    // words + countdown
    const fresh = Math.min(1, st.k * st.dur / 0.5);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 10;
    c.fillStyle = '#fbf6ec';
    c.globalAlpha = a * (0.6 + 0.4 * fresh);
    c.font = '300 ' + Math.round(m * 0.03) + 'px ui-serif, "New York", Georgia, serif';
    c.fillText(st.label.replace(/^./, (x) => x.toUpperCase()), cx, cy - m * 0.028);
    c.globalAlpha = a;
    c.font = '200 ' + Math.round(m * 0.06) + 'px -apple-system, system-ui, sans-serif';
    c.fillText(String(Math.max(1, Math.ceil(st.dur * (1 - st.k)))), cx, cy + m * 0.032);
    c.shadowBlur = 0;
    // under the orb: pattern + breaths taken, then Done
    const name = { box: 'Box breathing · 4-4-4-4', calm: 'Calm · in 4, out 6', '478': 'Relax · 4-7-8' }[LW.breathPattern()];
    c.globalAlpha = a * 0.7; c.font = '500 ' + Math.round(m * 0.0135) + 'px -apple-system, system-ui, sans-serif';
    c.fillText(name + (BG.breaths ? `  ·  ${BG.breaths} breath${BG.breaths > 1 ? 's' : ''}` : ''), cx, cy + RR + m * 0.045);
    const { bw, bh, bx, by } = G;
    c.globalAlpha = a; c.fillStyle = 'rgba(255,250,240,0.16)'; c.strokeStyle = 'rgba(255,250,240,0.45)'; c.lineWidth = 1;
    c.beginPath(); c.roundRect(bx, by, bw, bh, bh / 2); c.fill(); c.stroke();
    c.fillStyle = '#fbf6ec'; c.font = '500 ' + Math.round(m * 0.016) + 'px -apple-system, system-ui, sans-serif';
    c.fillText('Done', cx, by + bh / 2 + 0.5);
    c.globalAlpha = 1;
  }
  function startBreathGuide() { if (!BG.on) { BG.on = true; BG.t0 = performance.now() / 1000; BG.breaths = 0; BG.lastCycle = -1; requestAnimationFrame(breathGuide); } }
  LW.setBreathing = function (on, fromHost) {
    on = !!on;
    if (on === LW.breathing && (!on || BG.on)) return;
    LW.breathing = on;
    if (on) startBreathGuide();
    if (!fromHost) LW.post({ type: 'calm', on });   // keep the menu's Breathe switch in step
    LW.emit('breathing', on);
  };
  LW._breathHit = (x, y) => { if (!LW.breathing || BG.a < 0.3) return false; const g = breathGeom(); return x >= g.bx - 10 && x <= g.bx + g.bw + 10 && y >= g.by - 10 && y <= g.by + g.bh + 10; };
  addEventListener('load', () => { if (LW.breathing) startBreathGuide(); });

  // ─── Music levels + beats ─────────────────────────────────────────────────
  LW.music = { level: 0, bass: 0, mid: 0, high: 0, live: false, lastLive: 0 };
  function onBeatFrame(m) {
    const M = LW.music;
    M.level = m.l; M.bass = m.b; M.mid = m.m; M.high = m.h; M.live = true; M.lastLive = performance.now();
    M.raw = m; wakePulse();   // whole frame: newer hosts add chroma/key/bpm/sections (see host/BeatSync.swift); read via music.js
    if (m.k) LW.emit('beat', Math.min(1, m.k));
    LW.emit('beatframe', m);
  }
  // Fallback pulse when there's music but no live analysis. Runs only while there is music (or a level
  // still decaying), so a silent desktop has no 10 Hz timer.
  let fakeT = 0, pulseIv = 0;
  function pulse() {
    const M = LW.music;
    if (M.live && performance.now() - M.lastLive > 3000) M.live = false;
    if (M.live) return;
    const playing = LW.nowPlaying && LW.nowPlaying.playing;
    fakeT += 0.1;
    const target = playing ? 0.35 + 0.1 * Math.sin(fakeT * 0.3) : 0;
    M.level += (target - M.level) * 0.2; M.bass = M.level; M.mid = M.level * 0.8; M.high = M.level * 0.5;
    if (playing && Math.round(fakeT * 10) % 6 === 0) LW.emit('beat', 0.4);   // ~100 bpm, soft
    if (!playing && M.level < 0.001) { M.level = M.bass = M.mid = M.high = 0; clearInterval(pulseIv); pulseIv = 0; }
  }
  function wakePulse() { if (!pulseIv) pulseIv = setInterval(pulse, 100); }

  // ─── Background soundscapes (procedural, looped, very light on CPU) ──────
  LW.soundscape = { kind: 'off', volume: 0.35 };
  const SS = { nodes: [], timers: [], gain: null, kind: 'off' };
  function noiseBuffer(ctx, color, secs = 6) {
    const n = ctx.sampleRate * secs, buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (color === 'white') d[i] = w * 0.5;
        else if (color === 'pink') {   // Paul Kellet's refined pink filter
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }   // brown
      }
      // crossfade the loop seam
      const f = Math.floor(ctx.sampleRate * 0.05);
      for (let i = 0; i < f; i++) { const k = i / f; d[n - f + i] = d[n - f + i] * (1 - k) + d[i] * k; }
    }
    return buf;
  }
  function stopSoundscape() {
    SS.timers.forEach(rawClearInterval); SS.timers = [];
    const g = SS.gain, ctx = LW._ctx;
    if (g && ctx) {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      const old = SS.nodes; setTimeout(() => old.forEach((n) => { try { n.stop && n.stop(); n.disconnect(); } catch (e) {} }), 2000);
    }
    SS.nodes = []; SS.gain = null; SS.kind = 'off';
    syncAudio();
  }
  function startSoundscape() {
    const { kind, volume } = LW.soundscape;
    if (SS.kind === kind && SS.gain) { if (LW._ctx) SS.gain.gain.setTargetAtTime(volume * 0.5, LW._ctx.currentTime, 0.3); return; }
    stopSoundscape();
    if (kind === 'off') return;
    const ctx = LW.audio();
    if (!ctx) return;
    const out = ctx.createGain(); out.gain.value = 0; out.__lwBus = true; out.connect(ctx.destination);
    out.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 1.2);
    SS.gain = out; SS.kind = kind;
    syncAudio();   // a paused page keeps its context running for the soundscape
    const src = (color) => { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(ctx, color); s.loop = true; s.start(); SS.nodes.push(s); return s; };
    const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; SS.nodes.push(b); return b; };
    const lfo = (rate, depth, param) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); SS.nodes.push(o, g); };
    const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
    const burst = (dur, f, q, amp) => {   // a single short filtered noise event (drip, crackle)
      const t = ctx.currentTime, s = ctx.createBufferSource(), b = filt('bandpass', f, q), g = ctx.createGain();
      s.buffer = SS.white || (SS.white = noiseBuffer(ctx, 'white', 1));
      g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      chain(s, b, g, out); s.start(t, Math.random() * 0.8, dur + 0.02);
    };
    if (kind === 'white') chain(src('white'), filt('lowpass', 9000), out);
    else if (kind === 'pink') chain(src('pink'), out);
    else if (kind === 'brown') chain(src('brown'), filt('lowpass', 900), out);
    else if (kind === 'rain') {
      chain(src('pink'), filt('highpass', 500), filt('lowpass', 6500), out);
      SS.timers.push(rawSetInterval(() => { if (Math.random() < 0.6) burst(0.04, 2500 + Math.random() * 3000, 4, 0.05 + Math.random() * 0.08); }, 60));
    } else if (kind === 'ocean') {
      const lp = filt('lowpass', 700), g = ctx.createGain(); g.gain.value = 0.55; SS.nodes.push(g);
      chain(src('brown'), lp, g, out);
      lfo(1 / 9, 500, lp.frequency); lfo(1 / 9, 0.45, g.gain);   // slow swells, ~9s per wave
      chain(src('pink'), filt('highpass', 2000), ctx.createGain(), out).gain.value = 0.08;
    } else if (kind === 'fire') {
      chain(src('brown'), filt('lowpass', 350), out);
      SS.timers.push(rawSetInterval(() => { if (Math.random() < 0.35) burst(0.015 + Math.random() * 0.03, 1500 + Math.random() * 4000, 2, 0.1 + Math.random() * 0.25); }, 80));
    } else if (kind === 'stream') {
      const bp = filt('bandpass', 1200, 0.6);
      chain(src('pink'), bp, out);
      lfo(0.7, 400, bp.frequency); lfo(1.9, 250, bp.frequency);
    }
  }
  LW.setSoundscape = function (s) { Object.assign(LW.soundscape, s || {}); if (!LW.muted) startSoundscape(); else stopSoundscape(); };

  // ─── Energy governor: frame cap + focus pause ────────────────────────────
  // Desktop layout (host/Layout.swift): which side holds the user's widgets/icons and the free
  // horizontal band for hero content, in 0..1 of the display. Scenes should keep `avoid` boxes calm
  // and place their main objects inside `clear`. Browser preview: ?side=left to test mirroring.
  LW.layout = { side: qs.get('side') || 'right', clear: qs.get('side') === 'left' ? [0.28, 1] : qs.get('side') === 'off' ? [0, 1] : [0, 0.72], avoid: [] };
  LW.fps = +(qs.get('fps') || 30);
  LW.focused = true;
  let keepAlive = false;
  Object.defineProperty(LW, 'keepAlive', {
    enumerable: true,
    get: () => keepAlive,
    set(v) {
      keepAlive = !!v;
      setIdle(!LW.focused && !keepAlive);
      if (!LW.focused) LW._resumeFrames();   // a paused page starts (or stops) its 2 fps keep-alive ticks
    },
  });
  if (qs.get('virtual') !== '1') {
    const realRAF = window.requestAnimationFrame.bind(window);
    let queue = [], scheduled = false, last = 0, timer = 0;
    const pump = (ts) => {
      scheduled = false;
      const live = LW.focused, fps = live ? LW.fps : LW.keepAlive ? 2 : 0;
      if (!fps) return;                                   // fully paused; resume() restarts
      if (ts - last < 1000 / fps - 4) { schedule(live ? 0 : 1000 / fps - (ts - last)); return; }
      last = ts;
      const q = queue; queue = [];
      q.forEach((cb) => { try { cb(ts); } catch (e) { console.error(e); } });
    };
    const schedule = (delay = 0) => {
      if (scheduled) return;
      scheduled = true;
      if (delay > 20) { clearTimeout(timer); timer = setTimeout(() => realRAF(pump), delay); }   // no 60 Hz polling while idle
      else realRAF(pump);
    };
    window.requestAnimationFrame = (cb) => { queue.push(cb); schedule(); return queue.length; };
    LW._resumeFrames = () => { scheduled = false; clearTimeout(timer); schedule(); };
    // Run the scene's pending frame once even while paused (to freeze or restore a GPU canvas).
    LW._frameOnce = () => { const q = queue; queue = []; const ts = performance.now(); q.forEach((cb) => { try { cb(ts); } catch (e) { console.error(e); } }); };
  } else { LW._resumeFrames = () => {}; LW._frameOnce = () => {}; }

  // Paused scenes: WebKit may drop a canvas's last frame (WebGL *and* accelerated 2D) while the
  // occluded desktop isn't drawing, which shows the black page background instead of the scene.
  // On pause, render one last frame and lay a still over each visible canvas: a 2D copy at once,
  // then a decoded <img> of it (image data survives backing-store purges). Removed on resume.
  // If the page comes back visible while still paused, re-take the still as a backstop.
  const liveCanvases = new Set();
  const getCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const ctx = getCtx.call(this, type, opts);
    if (ctx && /webgl|2d/.test(type)) liveCanvases.add(this);
    return ctx;
  };
  let frozen = [], freezeId = 0;
  function freezeStill() {
    thawStill();
    const id = freezeId;
    LW._frameOnce();   // a WebGL drawing buffer is readable right after a render, in the same task
    const minArea = innerWidth * innerHeight * 0.05;   // skip offscreen helpers and small UI canvases
    for (const c of [...liveCanvases]) {   // snapshot: the stills below are canvases too
      if (!c.isConnected || !c.width || !c.height || c.dataset.lwStill) continue;
      const r = c.getBoundingClientRect(), cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden' || r.width * r.height < minArea) continue;
      const o = document.createElement('canvas');
      o.width = c.width; o.height = c.height;
      o.dataset.lwStill = '1';
      try { getCtx.call(o, '2d').drawImage(c, 0, 0); } catch (e) { continue; }
      o.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;opacity:${cs.opacity};z-index:${cs.zIndex === 'auto' ? 0 : cs.zIndex};mix-blend-mode:${cs.mixBlendMode}`;
      c.after(o); frozen.push(o);
      try {
        o.toBlob((b) => {
          if (!b || id !== freezeId || !o.isConnected) return;
          const img = new Image(), url = URL.createObjectURL(b);
          img.src = url; img.style.cssText = o.style.cssText; img.dataset.lwStill = '1'; img._url = url;
          img.decode().then(() => {
            if (id !== freezeId || !o.isConnected) { URL.revokeObjectURL(url); return; }
            o.replaceWith(img); frozen[frozen.indexOf(o)] = img;
          }, () => URL.revokeObjectURL(url));
        }, 'image/png');
      } catch (e) {}   // tainted canvas: keep the 2D copy
    }
  }
  // Resume: the live scene restarts from the same frame underneath; the still softly blurs and fades
  // away over it (no hard cut). Re-freezing mid-fade drops the old still at once.
  function thawStill(soft) {
    freezeId++;
    const gone = frozen; frozen = [];
    const drop = (o) => { o.remove(); if (o._url) URL.revokeObjectURL(o._url); };
    if (!soft) { gone.forEach(drop); return; }
    gone.forEach((o) => {
      o.style.transition = 'opacity .7s ease, filter .7s ease';
      setTimeout(() => { o.style.opacity = '0'; o.style.filter = 'blur(10px)'; }, 30);   // after the first live frame
      setTimeout(() => drop(o), 800);
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !LW.focused && liveCanvases.size) freezeStill();
  });
  // The page is being closed (scene switch: the host closes the old view outright) or navigated away:
  // let go of the paused stills' decoded images and the audio graph at once instead of with the process.
  window.addEventListener('pagehide', () => {
    thawStill();
    try { if (LW._ctx && LW._ctx.state !== 'closed') LW._ctx.close(); } catch (e) {}
  });
  const blurCSS = document.createElement('style');
  // An auto-paused scene simply stops drawing and keeps its last frame (no blur/zoom): it should
  // still look like a wallpaper. A desktop click resumes it (host energy modes).
  blurCSS.textContent = 'html{background:#000}';
  document.head.appendChild(blurCSS);
  // Paused pill: the scene keeps its last frame (no blur) and says so, with how to continue.
  let pausePill = null;
  function showPausePill(on) {
    if (!pausePill) {
      pausePill = document.createElement('div');
      pausePill.style.cssText = 'position:fixed;z-index:2147483645;left:28px;bottom:28px;display:flex;align-items:center;gap:9px;padding:8px 13px 8px 11px;border-radius:999px;background:rgba(20,26,24,.62);color:#eef2ec;font:500 12px/1.2 -apple-system,system-ui,sans-serif;letter-spacing:.01em;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 0 0 .5px rgba(255,255,255,.14),0 4px 18px rgba(0,0,0,.25);opacity:0;transform:translateY(6px);transition:opacity .5s ease,transform .5s ease;pointer-events:none';
      document.body.appendChild(pausePill);
    }
    if (on) {
      const why = LW.pauseReason === 'battery' ? 'Paused to save battery' : LW.pauseReason === 'away' ? 'Resting while you’re away' : 'Paused';
      pausePill.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 5v10M13 5v10"/></svg><span>' + why + '</span><span style="opacity:.6">· click to continue</span>';
      const left = (LW.layout && LW.layout.side) === 'left';   // keep clear of the widgets
      pausePill.style.left = left ? 'auto' : '28px'; pausePill.style.right = left ? '28px' : 'auto';
      setTimeout(() => { pausePill.style.opacity = '1'; pausePill.style.transform = 'none'; }, 30);   // rAF is stopped while paused
    } else { pausePill.style.opacity = '0'; pausePill.style.transform = 'translateY(6px)'; }
  }
  function setFocused(on) {
    if (LW.focused === on) return;
    LW.focused = on;
    if (on) setIdle(false);
    if (on) thawStill(true); else freezeStill();
    showPausePill(!on);
    document.documentElement.classList.toggle('lw-unfocused', !on);
    LW.emit('focus', on);
    if (!on) setIdle(!LW.keepAlive);   // after the scene's own focus handlers and the last frame
    if (on) LW._resumeFrames();
  }

  // ─── AI companions ────────────────────────────────────────────────────────
  // Only scenes with an in-world form for them (Koi Pond) show companions; there is no generic overlay.
  LW.agents = { style: 'native', list: [] };
  LW.nativeAgents = false;
  function setAgents(a) {
    LW.agents = { style: (a && a.style) || 'native', list: (a && a.list) || [] };
    LW.emit('agents', LW.agents);
  }

  // Shared illustrated-pose timing. Never dissolve two animal silhouettes.
  // The old pose tucks, changes at the lowest point, then settles into the new pose.
  LW.poseFrame = function (from, to, progress) {
    const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 1));
    if (!from || from === to || t >= 1) return { pose: to, sx: 1, sy: 1 };
    const tuck = Math.pow(Math.sin(Math.PI * t), 2);
    return { pose: t < 0.5 ? from : to, sx: 1 + 0.025 * tuck, sy: 1 - 0.085 * tuck };
  };
  LW.poseState = function (owner, target, duration = 0.42) {
    const now = performance.now() / 1000;
    const s = owner._illustratedPose || (owner._illustratedPose = { from: target, to: target, at: now - duration });
    if (target !== s.to) {
      const shown = LW.poseFrame(s.from, s.to, (now - s.at) / duration).pose;
      const walking = /^walk[12]$/.test(String(target)) && /^walk[12]$/.test(String(shown));
      s.from = shown; s.to = target; s.at = walking ? now - duration : now;
    }
    return LW.poseFrame(s.from, s.to, (now - s.at) / duration);
  };
  // Keep the full stage height on wide desktops, extending quiet edge materials.
  LW.roomImage = function(g,im,wall='#17232c',floor='#111b24') {
    g.save();
    const wash=g.createLinearGradient(0,0,0,1000);wash.addColorStop(0,wall);wash.addColorStop(.7,wall);wash.addColorStop(1,floor);
    g.fillStyle=wash;g.fillRect(-1800,0,5200,1000);
    g.drawImage(im,0,0,1600,1000);
    // Broad quiet panels outside the original composition, without stretching furniture.
    for(const [x,dir] of [[1600,1],[0,-1]]){
      const shade=g.createLinearGradient(x,0,x+dir*900,0);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.42)');
      g.fillStyle=shade;g.fillRect(dir>0?x:x-1800,0,1800,1000);
    }
    g.restore();
  };
  // Cached paintings are graded only during room rebakes, never per frame.
  LW.roomGrade = function (g, x, y, w, h, day) {
    g.save();
    const d = Math.max(0, Math.min(1, day || 0));
    if (d > 0.001) { g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(177,201,219,${d * 0.18})`; g.fillRect(x,y,w,h); }
    g.restore();
  };

  // Native host entry point.
  window.__lw = function (type, x, y, flag) {
    if (type === 'play') { if(window.PlayShell) LW.emit('play',x); else { LW._playPending=x; if(!playLoading){playLoading=true;const s=document.createElement('script');s.src=new URL('play/play.js',runtimeBase);s.onerror=()=>{playLoading=false;LW.post({type:'play',op:'close'});};document.head.append(s);} } return; }
    if (type === 'playReply') { LW.emit('playReply',x); return; }
    if (type === 'agents') { setAgents(x); return; }
    if (type === 'audio') { for (const k in x || {}) { LW.audioPrefs[k] = Object.assign(LW.audioPrefs[k] || {}, x[k]); applyBus(k); } LW.emit('audioprefs', LW.audioPrefs); return; }
    if (type === 'breath') { LW.globalBreath = x; return; }
    if (type === 'beat') { onBeatFrame(x); return; }
    if (type === 'focus') { setFocused(LW.playOpen || !!x); return; }
    if (type === 'perf') { if (x && x.fps) LW.fps = x.fps; LW._resumeFrames(); return; }
    if (type === 'nowplaying') { setNowPlaying(x); return; }
    if (type === 'ambient') { LW.setSoundscape(x); return; }
    if (type === 'settings') { Object.assign(LW.settings, x || {}); LW.emit('settings', LW.settings); return; }
    if (type === 'action') { if (x === 'calm' || x === 'breathe') { LW.setBreathing(x === 'breathe' ? true : !LW.breathing); return; } LW.emit('action', x); return; }
    if (type === 'pauseReason') { LW.pauseReason = x || ''; return; }
    if (type === 'layout') {
      // Identical pushes (the host re-sends on display notifications) must not rebuild the scene.
      const next = Object.assign({}, LW.layout, x || {});
      if (LW.layout && JSON.stringify(next) === JSON.stringify(LW.layout)) return;
      LW.layout = next; LW.emit('layout', LW.layout); return;
    }
    if (type === 'env') { LW.setEnv(x); return; }
    if (type === 'reminder') { if (x === 'breathe') { LW.setBreathing(true); return; } LW.emit('reminder', { kind: x, text: y || REMINDER_TEXT[x] || '' }); return; }
    if (type === 'calm') { LW.setBreathing(!!x, true); return; }
    if (type === 'mute') { LW.muted = !!flag; syncAudio(); if (!LW.muted && LW.soundscape.kind !== 'off') startSoundscape(); LW.emit('mute', LW.muted); return; }
    if (type === 'leave') { LW.pointer.inside = false; LW.emit('leave'); return; }
    input(type, x, y);
  };

  // Browser dev mode: real DOM events.
  if (!LW.isHost) {
    addEventListener('pointermove', (e) => input('move', e.clientX, e.clientY));
    addEventListener('pointerdown', (e) => input('down', e.clientX, e.clientY));
    addEventListener('pointerup', (e) => input('up', e.clientX, e.clientY));
    addEventListener('pointerleave', () => { LW.pointer.inside = false; LW.emit('leave'); });
    const W = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
    addEventListener('keydown', (e) => {
      if (LW.playOpen) return;
      if (e.key === 'm') window.__lw('mute', 0, 0, !LW.muted);
      if (e.key === 'w') LW.setEnv({ weather: W[(W.indexOf(LW.env.weather) + 1) % W.length] });
      if (e.key === 't') LW.setView('custom', (LW.env.hour + 3) % 24);
      if (e.key === 'r') window.__lw('reminder', 'water');
      if (e.key === 'b') window.__lw('calm', !LW.breathing);
      if (e.key === 'Escape' && LW.breathing) LW.setBreathing(false);
      if (e.key === 'a') {   // cycle: working + idle → one waiting for you → none
        const n = LW.agents.list, waiting = n.some((x) => x.state === 'attention');
        window.__lw('agents', { style: LW.agents.style, list: !n.length ? [{ id: 'c1', kind: 'claude', project: 'visuals', state: 'working' }, { id: 'x1', kind: 'codex', project: 'nia', state: 'idle' }]
          : !waiting ? [{ id: 'c1', kind: 'claude', project: 'visuals', state: 'attention' }, { id: 'x1', kind: 'codex', project: 'nia', state: 'working' }] : [] });
      }
      if (e.key === 'n') window.__lw('nowplaying', LW.nowPlaying && LW.nowPlaying.playing ? { ...LW.nowPlaying, playing: false } :
        { title: 'Moon River', artist: 'Lo-fi Dev Trio', album: 'Late Night Tests', artwork: '', playing: true, app: 'Music' });
    });
    // Landing-page embeds drive the scene via postMessage({__lw: [type, ...args]}).
    addEventListener('message', (e) => { const d = e.data; if (e.source===window.parent && e.source!==window && d && Array.isArray(d.__lw)) window.__lw(...d.__lw); });
    if (qs.get('np') === '1') setNowPlaying({ title: 'Moon River', artist: 'Lo-fi Dev Trio', album: 'Late Night Tests', artwork: '', playing: true, app: 'Music' });
    if (qs.get('ambient')) LW.soundscape.kind = qs.get('ambient');
  }

  // Dev: ?virtual=1 replaces requestAnimationFrame + performance.now with a
  // virtual clock so a hidden/background tab can be stepped deterministically:
  //   LW.advance(seconds, fps=30)  then  await LW.shot('x.png')
  if (qs.get('virtual') === '1') {
    const realNow = performance.now.bind(performance);
    let vt = realNow(), queue = [];
    performance.now = () => vt;
    window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    LW.advance = function (sec, fps = 30) {
      const steps = Math.max(1, Math.round(sec * fps));
      for (let i = 0; i < steps; i++) {
        vt += 1000 / fps;
        const q = queue; queue = [];
        q.forEach((cb) => { try { cb(vt); } catch (e) { console.error(e); } });
      }
      return vt;
    };
    LW.virtual = true;
  }

  // Dev: composite every visible canvas (after the next frame renders) and save
  // it via the dev server to livewall/shots/<name>. Returns a promise.
  // crop = [x, y, w, h] in CSS px (optional) — e.g. to inspect one sprite up close.
  LW.shot = function (name = 'shot.png', scale = 0.5, crop) {
    const raf = LW.virtual ? (cb) => { LW.advance(1 / 30); cb(); } : requestAnimationFrame;
    const [cx, cy, cw, ch] = crop || [0, 0, innerWidth, innerHeight];
    return new Promise((resolve) => raf(() => {
      const c = document.createElement('canvas');
      c.width = Math.round(cw * scale); c.height = Math.round(ch * scale);
      const x = c.getContext('2d');
      x.fillStyle = getComputedStyle(document.body).backgroundColor || '#000';
      x.fillRect(0, 0, c.width, c.height);
      document.querySelectorAll('canvas').forEach((cv) => {
        const r = cv.getBoundingClientRect();
        if (r.width && getComputedStyle(cv).display !== 'none') x.drawImage(cv, (r.left - cx) * scale, (r.top - cy) * scale, r.width * scale, r.height * scale);
      });
      c.toBlob((b) => fetch('/__shot/' + name, { method: 'PUT', body: b }).then(() => resolve(name)), 'image/png');
    }));
  };

  if (LW.isHost) {
    addEventListener('error', (e) => LW.post('log:error ' + e.message + ' @' + e.lineno));
    LW.on('down', () => setTimeout(() => LW.post('log:audio ' + (LW._ctx ? LW._ctx.state : 'none')), 400));
  }

  // Self-heal: if WebKit drops a WebGL context (memory pressure, GPU process restart)
  // the canvas goes black and never recovers on its own — reload the scene instead.
  if (LW.isHost) {
    document.addEventListener('webglcontextlost', (e) => {
      LW.post('log:webgl context lost — reloading scene');
      setTimeout(() => location.reload(), 600);
    }, true);
  }

  window.LW = LW;
})();
