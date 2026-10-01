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
//   LW.on('calm', on => ...)          calm/breathing mode toggled (slow everything down,
//                                     show a 4s-in / 6s-out breathing rhythm)
//   LW.calm       bool
// Music mode (host reads Apple Music / Spotify "now playing"):
//   LW.nowPlaying  {title, artist, album, artwork (data/https URL or ''), playing, app} | null
//   LW.on('nowplaying', np => ...)    fires on track/play-state change
// Background soundscape (independent of the scene's interactive sounds, set
// globally from the menu): white | pink | brown | rain | ocean | fire | stream | off.
//   LW.soundscape  {kind, volume}     — lw.js plays it; scenes don't need to do anything.
// AI companions (host watches Claude Code / Codex session activity):
//   LW.agents   {style:'native'|'characters'|'off', list:[{id, kind:'claude'|'codex', project, state:'working'|'idle'}]}
//   LW.on('agents', a => ...)
//   A scene that draws its own in-world companions sets LW.nativeAgents = true;
//   otherwise (or in 'characters' style) lw.js draws Clawd + a Codex bot along the bottom.
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
      }
      if (LW._ctx.state !== 'running') LW._ctx.resume().catch(() => {});
      return LW._ctx;
    },
    post(msg) {
      if (LW.isHost) window.webkit.messageHandlers.lw.postMessage(msg);
    },
  };

  function input(type, x, y) {
    const p = LW.pointer;
    p.x = x; p.y = y; p.t = performance.now(); p.inside = true;
    if (type === 'down') { p.down = true; LW.audio(); if (LW.soundscape.kind !== 'off' && !SS.gain) startSoundscape(); }
    if (type === 'up') p.down = false;
    if (type === 'move' && p.down) LW.emit('drag', x, y);
    LW.emit(type, x, y);
  }

  const now = new Date();
  LW.env = {
    weather: qs.get('weather') || 'clear',
    intensity: +(qs.get('intensity') || 0.7),
    temp: 20,
    wind: 0.3,
    hour: qs.has('hour') ? +qs.get('hour') : now.getHours() + now.getMinutes() / 60,
    isDay: true,
  };
  LW.env.isDay = LW.env.hour > 6.5 && LW.env.hour < 19.5;
  LW.calm = qs.get('calm') === '1';
  LW.setEnv = function (patch) {
    Object.assign(LW.env, patch);
    if (!('isDay' in patch)) LW.env.isDay = LW.env.hour > 6.5 && LW.env.hour < 19.5;
    LW.emit('env', LW.env);
  };
  // Keep the clock moving when no host is feeding us.
  setInterval(() => {
    if (qs.has('hour')) return;
    const d = new Date();
    LW.setEnv({ hour: d.getHours() + d.getMinutes() / 60 });
  }, 60000);
  addEventListener('load', () => { LW.emit('env', LW.env); if (LW.calm) LW.emit('calm', true); });

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
  }

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
    SS.timers.forEach(clearInterval); SS.timers = [];
    const g = SS.gain, ctx = LW._ctx;
    if (g && ctx) {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      const old = SS.nodes; setTimeout(() => old.forEach((n) => { try { n.stop && n.stop(); n.disconnect(); } catch (e) {} }), 2000);
    }
    SS.nodes = []; SS.gain = null; SS.kind = 'off';
  }
  function startSoundscape() {
    const { kind, volume } = LW.soundscape;
    if (SS.kind === kind && SS.gain) { if (LW._ctx) SS.gain.gain.setTargetAtTime(volume * 0.5, LW._ctx.currentTime, 0.3); return; }
    stopSoundscape();
    if (kind === 'off') return;
    const ctx = LW.audio();
    if (!ctx) return;
    const out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
    out.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 1.2);
    SS.gain = out; SS.kind = kind;
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
      SS.timers.push(setInterval(() => { if (Math.random() < 0.6) burst(0.04, 2500 + Math.random() * 3000, 4, 0.05 + Math.random() * 0.08); }, 60));
    } else if (kind === 'ocean') {
      const lp = filt('lowpass', 700), g = ctx.createGain(); g.gain.value = 0.55; SS.nodes.push(g);
      chain(src('brown'), lp, g, out);
      lfo(1 / 9, 500, lp.frequency); lfo(1 / 9, 0.45, g.gain);   // slow swells, ~9s per wave
      chain(src('pink'), filt('highpass', 2000), ctx.createGain(), out).gain.value = 0.08;
    } else if (kind === 'fire') {
      chain(src('brown'), filt('lowpass', 350), out);
      SS.timers.push(setInterval(() => { if (Math.random() < 0.35) burst(0.015 + Math.random() * 0.03, 1500 + Math.random() * 4000, 2, 0.1 + Math.random() * 0.25); }, 80));
    } else if (kind === 'stream') {
      const bp = filt('bandpass', 1200, 0.6);
      chain(src('pink'), bp, out);
      lfo(0.7, 400, bp.frequency); lfo(1.9, 250, bp.frequency);
    }
  }
  LW.setSoundscape = function (s) { Object.assign(LW.soundscape, s || {}); if (!LW.muted) startSoundscape(); else stopSoundscape(); };

  // ─── Energy governor: frame cap + focus pause ────────────────────────────
  LW.fps = +(qs.get('fps') || 30);
  LW.focused = true;
  LW.keepAlive = false;
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
  } else LW._resumeFrames = () => {};
  const blurCSS = document.createElement('style');
  blurCSS.textContent = 'html{background:#000}body{transition:filter 1.1s ease,transform 1.1s ease}html.lw-unfocused body{filter:blur(16px) saturate(.9) brightness(.86);transform:scale(1.05)}';
  document.head.appendChild(blurCSS);
  function setFocused(on) {
    if (LW.focused === on) return;
    LW.focused = on;
    document.documentElement.classList.toggle('lw-unfocused', !on);
    LW.emit('focus', on);
    if (on) LW._resumeFrames();
  }

  // ─── AI companions: generic character overlay (Clawd + Codex bot) ────────
  LW.agents = { style: 'native', list: [] };
  LW.nativeAgents = false;
  const CO = { cv: null, ctx: null, bots: new Map(), running: false, lastT: 0 };
  function companionsVisible() { return LW.agents.style === 'characters' || (LW.agents.style === 'native' && !LW.nativeAgents); }
  function setAgents(a) {
    LW.agents = { style: (a && a.style) || 'native', list: (a && a.list) || [] };
    LW.emit('agents', LW.agents);
    const want = companionsVisible() ? LW.agents.list : [];
    const ids = new Set(want.map((x) => x.id));
    for (const [id, b] of CO.bots) if (!ids.has(id)) b.leaving = true;
    want.forEach((x, i) => {
      let b = CO.bots.get(x.id);
      if (!b) {
        const fromLeft = true;   // their spot is lower-left, so they walk in from the left
        b = { id: x.id, kind: x.kind, x: fromLeft ? -40 : innerWidth + 40, dir: fromLeft ? 1 : -1, phase: Math.random() * 6, bubble: 0, wave: 0 };
        CO.bots.set(x.id, b);
      }
      Object.assign(b, { state: x.state, project: x.project || '', leaving: false });
    });
    // Spread the companions along the lower-left of the screen.
    let k = 0;
    for (const b of CO.bots.values()) if (!b.leaving) b.home = 70 + 150 * k++;
    if (CO.bots.size && !CO.running) { CO.running = true; requestAnimationFrame(drawCompanions); }
  }
  function ensureCanvas() {
    if (CO.cv) return;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:110px;pointer-events:none;z-index:50;transition:filter 1.1s ease';
    document.documentElement.appendChild(cv);   // outside <body>: immune to scene layout
    CO.cv = cv; CO.ctx = cv.getContext('2d');
  }
  function drawClawd(c, t, working, wave) {
    // Claude Code's little terracotta companion, drawn on a 2px grid.
    const P = 3.2, bob = working ? Math.round(Math.sin(t * 9) * 0.6) : 0;
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x * P), Math.round((y + bob) * P), Math.ceil(w * P), Math.ceil(h * P)); };
    const body = '#d97757', dark = '#b35d42';
    const step = working ? Math.floor(t * 8) % 2 : 0;
    R(-6, -2, 2, 3 + step, dark); R(-3, -2, 2, 3 - step + 1, dark); R(1, -2, 2, 3 + step, dark); R(4, -2, 2, 3 - step + 1, dark);   // legs
    R(-7, -10, 14, 8, body);                                            // body
    R(-9, -8 - (wave ? Math.round(Math.sin(t * 14)) + 1 : 0), 2, 3, body); R(7, -8, 2, 3, body);   // arms
    const blink = (t % 4) < 0.12;
    R(-4, -8, 1.4, blink ? 0.6 : 3, '#1a1311'); R(2.6, -8, 1.4, blink ? 0.6 : 3, '#1a1311');   // eyes
  }
  function drawCodex(c, t, working, wave) {
    const s = 1, bob = working ? Math.sin(t * 7) * 1.2 : 0;
    c.save(); c.translate(0, bob);
    c.fillStyle = '#20252b'; c.strokeStyle = '#e8eef0'; c.lineWidth = 1.6;
    c.beginPath(); c.roundRect(-17 * s, -34 * s, 34 * s, 26 * s, 8); c.fill(); c.stroke();          // head/screen
    c.fillStyle = '#7fe0d0'; c.font = 'bold 13px ui-monospace, Menlo, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText((t % 1) < 0.55 || !working ? '>_' : '> ', 0, -21);                                     // blinking prompt
    c.strokeStyle = '#e8eef0'; c.beginPath(); c.moveTo(0, -34); c.lineTo(0, -40); c.stroke();
    c.fillStyle = working ? '#7fe0d0' : '#9aa5ab'; c.beginPath(); c.arc(0, -42, 2.6, 0, Math.PI * 2); c.fill();   // antenna
    c.fillStyle = '#e8eef0'; c.beginPath(); c.roundRect(-10, -8, 20, 6, 3); c.fill();                // base
    const w = wave ? Math.sin(t * 14) * 0.6 : 0;
    c.strokeStyle = '#e8eef0'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-17, -18); c.lineTo(-23, -12 - w * 10); c.stroke(); c.beginPath(); c.moveTo(17, -18); c.lineTo(23, -12); c.stroke();
    c.restore();
  }
  function drawCompanions(ts) {
    if (!CO.bots.size) { CO.running = false; if (CO.ctx) CO.ctx.clearRect(0, 0, CO.cv.width, CO.cv.height); return; }
    requestAnimationFrame(drawCompanions);
    ensureCanvas();
    const t = ts / 1000, dt = Math.min(0.1, CO.lastT ? t - CO.lastT : 0.016); CO.lastT = t;
    const dpr = Math.min(2, devicePixelRatio || 1), cv = CO.cv;
    if (cv.width !== Math.round(innerWidth * dpr)) { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(110 * dpr); }
    cv.style.top = (innerHeight - 110) + 'px';
    cv.style.filter = LW.focused ? '' : 'blur(10px) brightness(.86)';
    const c = CO.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, innerWidth, 110);
    for (const [id, b] of CO.bots) {
      const target = b.leaving ? (b.dir > 0 ? -60 : innerWidth + 60) : b.home;
      const d = target - b.x, moving = Math.abs(d) > 2;
      if (moving) { const v = Math.sign(d) * Math.min(Math.abs(d) * 3, 90); b.x += v * dt; b.face = Math.sign(d); }
      else if (b.leaving) { CO.bots.delete(id); continue; }
      b.bubble = Math.max(0, b.bubble - dt); b.wave = Math.max(0, b.wave - dt);
      const working = b.state === 'working';
      c.save(); c.translate(b.x, 96);
      // soft ground shadow
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, 22, 4, 0, 0, Math.PI * 2); c.fill();
      if ((b.face || 1) < 0) c.scale(-1, 1);
      if (b.kind === 'codex') drawCodex(c, t + b.phase, working || moving, b.wave > 0); else drawClawd(c, t + b.phase, working || moving, b.wave > 0);
      c.restore();
      // tiny status chip
      const label = (b.kind === 'codex' ? 'codex' : 'claude') + (b.project ? ' · ' + b.project : '') + (working ? '' : ' · idle');
      const show = b.bubble > 0 || working;
      if (show && !moving) {
        c.font = '500 11px -apple-system, system-ui, sans-serif';
        const w = c.measureText(label).width + 16, x = b.x - w / 2, y = 30;
        c.globalAlpha = b.bubble > 0 ? 0.95 : 0.7;
        c.fillStyle = 'rgba(14,16,20,0.62)'; c.beginPath(); c.roundRect(x, y, w, 20, 10); c.fill();
        c.fillStyle = working ? (b.kind === 'codex' ? '#7fe0d0' : '#f0a07f') : '#c9ced2';
        c.beginPath(); c.arc(x + 9, y + 10, 2.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#eef1f3'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, x + 15, y + 10.5);
        c.globalAlpha = 1;
      }
    }
  }
  LW.on('down', (x, y) => {   // click a companion → it waves and shows what it's up to
    if (y < innerHeight - 110) return;
    for (const b of CO.bots.values()) if (Math.abs(b.x - x) < 26 && y > innerHeight - 70) { b.wave = 1.2; b.bubble = 4; }
  });

  // Native host entry point.
  window.__lw = function (type, x, y, flag) {
    if (type === 'agents') { setAgents(x); return; }
    if (type === 'focus') { setFocused(!!x); return; }
    if (type === 'perf') { if (x && x.fps) LW.fps = x.fps; LW._resumeFrames(); return; }
    if (type === 'nowplaying') { setNowPlaying(x); return; }
    if (type === 'ambient') { LW.setSoundscape(x); return; }
    if (type === 'settings') { Object.assign(LW.settings, x || {}); LW.emit('settings', LW.settings); return; }
    if (type === 'action') { LW.emit('action', x); return; }
    if (type === 'env') { LW.setEnv(x); return; }
    if (type === 'reminder') { LW.emit('reminder', { kind: x, text: y || REMINDER_TEXT[x] || '' }); return; }
    if (type === 'calm') { LW.calm = !!x; LW.emit('calm', LW.calm); return; }
    if (type === 'mute') { LW.muted = !!flag; if (LW._ctx) (LW.muted ? LW._ctx.suspend() : LW._ctx.resume()); if (!LW.muted && LW.soundscape.kind !== 'off') startSoundscape(); LW.emit('mute', LW.muted); return; }
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
      if (e.key === 'm') window.__lw('mute', 0, 0, !LW.muted);
      if (e.key === 'w') LW.setEnv({ weather: W[(W.indexOf(LW.env.weather) + 1) % W.length] });
      if (e.key === 't') LW.setEnv({ hour: (LW.env.hour + 3) % 24 });
      if (e.key === 'r') window.__lw('reminder', 'water');
      if (e.key === 'b') window.__lw('calm', !LW.calm);
      if (e.key === 'a') window.__lw('agents', CO.bots.size ? { style: LW.agents.style, list: [] } :
        { style: LW.agents.style, list: [{ id: 'c1', kind: 'claude', project: 'visuals', state: 'working' }, { id: 'x1', kind: 'codex', project: 'nia', state: 'idle' }] });
      if (e.key === 'n') window.__lw('nowplaying', LW.nowPlaying && LW.nowPlaying.playing ? { ...LW.nowPlaying, playing: false } :
        { title: 'Moon River', artist: 'Lo-fi Dev Trio', album: 'Late Night Tests', artwork: '', playing: true, app: 'Music' });
    });
    // Landing-page embeds drive the scene via postMessage({__lw: [type, ...args]}).
    addEventListener('message', (e) => { const d = e.data; if (d && Array.isArray(d.__lw)) window.__lw(...d.__lw); });
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

  window.LW = LW;
})();
