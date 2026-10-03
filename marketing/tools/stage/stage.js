// Capture stage: plays a clip from clips.js deterministically, one 1/30 s frame at a time.
// Every scene runs in its own same-origin iframe with ?virtual=1, so its clock only moves when
// we call LW.advance(). The stage adds crossfades, slow push-ins, a cursor that really clicks
// the scene (window.__lw('down', …)), music frames (Beat Sync format) and an optional macOS
// desktop mock. render.py screenshots the page after each STAGE.frame(i).
'use strict';
(function () {
  const FPS = 30, DT = 1 / FPS;
  const $ = (s, el = document) => el.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const smooth = (k) => k * k * (3 - 2 * k);
  const ORIGIN = location.origin;

  const S = (window.STAGE = { ready: false });
  let clip = null, shots = [], beats = null, sfx = [], t = 0, cur = null, mock = null, lastFrame = -1;

  // ── keyframe helper: [[t, v], …] → value at time ─────────────────────
  function keyed(spec, time, fallback) {
    if (spec == null) return fallback;
    if (!Array.isArray(spec) || !Array.isArray(spec[0])) return spec;
    if (time <= spec[0][0]) return spec[0][1];
    for (let i = 1; i < spec.length; i++) {
      const [t1, v1] = spec[i], [t0, v0] = spec[i - 1];
      if (time <= t1) return typeof v0 === 'number' ? lerp(v0, v1, smooth((time - t0) / Math.max(1e-6, t1 - t0))) : v0;
    }
    return spec[spec.length - 1][1];
  }

  // ── scenes ─────────────────────────────────────────────────────────────
  function sceneURL(sh) {
    const q = new URLSearchParams({ virtual: '1', fake: '0', ...(sh.query || {}) });
    const h = keyed(sh.hour, sh.at || 0, 15);
    q.set('hour', String(h));
    if (sh.weather) q.set('weather', keyed(sh.weather, sh.at || 0, 'clear'));
    return `${ORIGIN}/scenes/${sh.scene}.html?${q}`;
  }
  async function loadShot(sh, idx) {
    const fr = document.createElement('iframe');
    fr.style.zIndex = String(idx + 1);
    $('#scenes').appendChild(fr);
    await new Promise((res) => { fr.onload = res; fr.src = sceneURL(sh); });
    const w = fr.contentWindow;
    for (let k = 0; k < 100 && !(w.LW && w.LW.advance); k++) await sleep(50);
    if (!w.LW || !w.LW.advance) throw new Error('scene did not start in virtual mode: ' + sh.scene);
    const st = w.document.createElement('style');
    st.textContent = '#hud{display:none!important}' + (sh.css || '');
    w.document.head.appendChild(st);
    try { w.localStorage.clear(); } catch (e) {}
    await sleep(sh.loadWait || 900);           // let sprite sheets / paintings decode (real time)
    const shot = { sh, idx, fr, w, api: null, fired: new Set(), hour: null };
    shot.api = makeApi(shot);
    shot.api.env({ weather: keyed(sh.weather, sh.at || 0, 'clear'), intensity: sh.intensity || 0.75 });
    if (sh.settings) w.__lw('settings', sh.settings);
    if (sh.setup) await sh.setup(shot.api);
    // pre-roll so animals have settled and fades have finished before frame 0
    const pre = sh.pre == null ? 4 : sh.pre, n = Math.round(pre * FPS);
    for (let i = 0; i < n; i++) {
      const tt = (sh.at || 0) - pre + i * DT;
      feedMusic(shot, tt);
      w.LW.advance(DT);
      if (i % 30 === 29) await sleep(0);
    }
    return shot;
  }
  function makeApi(shot) {
    const w = shot.w;
    const api = {
      get w() { return w; }, shot,
      lw: (...a) => w.__lw(...a),
      action: (a) => w.__lw('action', a),
      calm: (on = true) => w.__lw('calm', on),
      env: (patch) => { const p = { hour: shot.hour == null ? keyed(shot.sh.hour, t, 15) : shot.hour, ...patch }; shot.hour = p.hour; w.__lw('env', p); },
      reminder: (kind, text) => w.__lw('reminder', kind, text),
      nowPlaying: (on = true, extra = {}) => w.__lw('nowplaying', on ? { ...TRACK, ...extra, playing: true } : { ...TRACK, playing: false }),
      down: (x, y) => { w.__lw('move', x, y); w.__lw('down', x, y); },
      up: (x, y) => w.__lw('up', x, y),
      move: (x, y) => w.__lw('move', x, y),
      sfx: (kind, gain = 1) => sfx.push({ t: +t.toFixed(3), kind, gain }),
      H: 1080, W: 1920,
    };
    return api;
  }
  const TRACK = { title: 'Slow Tide', artist: 'Harbor Lights', album: 'Quiet Rooms', artwork: ORIGIN + '/marketing/audio/cover.jpg', app: 'Music' };

  function feedMusic(shot, time) {
    if (!beats || !shot.sh.music) return;
    const i = Math.round(((clip.bedStart || 0) + time) * FPS);
    const fr = beats.frames[Math.max(0, Math.min(beats.frames.length - 1, i))];
    shot.w.__lw('beat', fr);
  }

  // ── visibility / crossfades ────────────────────────────────────────────
  function shotWindow(k) {
    const sh = shots[k].sh, next = shots[k + 1];
    const start = sh.at || 0, xf = sh.xfade == null ? 0.9 : sh.xfade;
    const end = next ? (next.sh.at || 0) + (next.sh.xfade == null ? 0.9 : next.sh.xfade) : clip.dur + 1;
    return { start, xf, end };
  }
  function shotOpacity(k, time) {
    const { start, xf, end } = shotWindow(k);
    if (time < start || time > end) return 0;
    if (k === 0 || xf <= 0) return 1;
    return smooth(clamp((time - start) / xf));
  }

  // ── cursor ─────────────────────────────────────────────────────────────
  function cursorAt(time) {
    const path = clip.cursor;
    if (!path || !path.length) return null;
    // resolve dynamic targets lazily (when the move toward them begins)
    for (let i = 0; i < path.length; i++) {
      const k = path[i];
      if (k.at && k._xy == null) {
        const startMove = i > 0 ? path[i - 1].t : k.t;
        if (time >= startMove) { const sh = activeShot(k.t); try { k._xy = k.at(sh.api); } catch (e) { k._xy = [960, 540]; } }
      }
    }
    const xy = (k) => k._xy || [k.x, k.y];
    let p;
    if (time <= path[0].t) p = xy(path[0]);
    else {
      p = xy(path[path.length - 1]);
      for (let i = 1; i < path.length; i++) {
        if (time <= path[i].t) {
          const a = path[i - 1], b = path[i];
          const mv = b.move || Math.min(1.1, b.t - a.t);           // move during the last `move` seconds
          const k = clamp((time - (b.t - mv)) / mv);
          const A = xy(a), B = xy(b), e = ease(k);
          const arc = Math.sin(Math.PI * e) * Math.hypot(B[0] - A[0], B[1] - A[1]) * 0.06;   // a slight hand-drawn arc
          p = [lerp(A[0], B[0], e) - arc * 0.3, lerp(A[1], B[1], e) - arc];
          break;
        }
      }
    }
    const show = clip.cursorShow || [path[0].t - 0.4, clip.dur];
    const vis = clamp((time - show[0]) / 0.4) * clamp((show[1] - time) / 0.4);
    return { x: p[0], y: p[1], vis };
  }
  function ring(x, y, big) {
    const el = document.createElement('div');
    el.className = 'ring';
    el.dataset.born = String(t); el.dataset.big = big ? '1' : '';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('#stage').appendChild(el);
  }
  function updateRings() {
    document.querySelectorAll('.ring').forEach((el) => {
      const age = t - +el.dataset.born, life = 0.55;
      if (age > life) { el.remove(); return; }
      const r = 8 + 34 * smooth(age / life) * (el.dataset.big ? 1.3 : 1);
      el.style.width = el.style.height = 2 * r + 'px';
      el.style.transform = `translate(${-r}px, ${-r}px)`;
      el.style.opacity = String(0.9 * (1 - age / life));
    });
  }
  function activeShot(time) {
    let s = shots[0];
    for (const sh of shots) if ((sh.sh.at || 0) <= time + 1e-6) s = sh;
    return s;
  }
  // Scene coordinates under a stage point (undo the shot's push-in transform).
  function toScene(shot, x, y, time) {
    const z = shotZoom(shot, time), [ox, oy] = shot.sh.origin || [0.5, 0.5];
    const cx = 1920 * ox, cy = 1080 * oy;
    return [cx + (x - cx) / z, cy + (y - cy) / z];
  }
  function shotZoom(shot, time) {
    const zs = shot.sh.zoom;
    if (!zs) return 1;
    const { start, end } = shotWindow(shot.idx);
    return lerp(zs[0], zs[1], clamp((time - start) / Math.max(0.1, Math.min(end, clip.dur) - start)));
  }

  // ── macOS desktop mock ─────────────────────────────────────────────────
  const WAVE = '<svg width="22" height="16" viewBox="0 0 22 16"><path d="M1.5 4.2c2.3 0 2.3 2.2 4.6 2.2s2.3-2.2 4.6-2.2 2.3 2.2 4.6 2.2 2.3-2.2 4.6-2.2M1.5 10.2c2.3 0 2.3 2.2 4.6 2.2s2.3-2.2 4.6-2.2 2.3 2.2 4.6 2.2 2.3-2.2 4.6-2.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const WIFI = '<svg width="20" height="16" viewBox="0 0 24 19"><path d="M12 18.5l2.6-3a3.6 3.6 0 0 0-5.2 0zM5.2 10.9a9.6 9.6 0 0 1 13.6 0l-1.9 2.2a6.9 6.9 0 0 0-9.8 0zM1.6 6.8a14.6 14.6 0 0 1 20.8 0l-1.9 2.2a11.8 11.8 0 0 0-17 0z" fill="#fff"/></svg>';
  const BATT = '<svg width="30" height="14" viewBox="0 0 30 14"><rect x=".75" y=".75" width="25" height="12.5" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/><rect x="3" y="3" width="17" height="8" rx="1.6" fill="#fff"/><rect x="27" y="4.5" width="2" height="5" rx="1" fill="#fff" fill-opacity=".6"/></svg>';
  const FOLDER = (s = 64) => `<svg width="${s}" height="${s * 0.8}" viewBox="0 0 64 51"><path d="M3 8a5 5 0 0 1 5-5h15l5 5h28a5 5 0 0 1 5 5v31a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" fill="#5aa7e8"/><path d="M3 15h58v29a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" fill="#79bdf2"/></svg>`;
  const DOC = '<svg width="52" height="64" viewBox="0 0 52 64"><path d="M4 4h30l14 14v42H4z" fill="#fafafa" stroke="#cfd3d6" stroke-width="2"/><path d="M34 4v14h14" fill="#e6e9ec" stroke="#cfd3d6" stroke-width="2"/><path d="M12 30h28M12 37h28M12 44h20" stroke="#aab2b8" stroke-width="2.4"/></svg>';
  const DRIVE = '<svg width="64" height="50" viewBox="0 0 64 50"><rect x="3" y="8" width="58" height="34" rx="6" fill="#d9dde0" stroke="#a9b0b5" stroke-width="2"/><rect x="3" y="30" width="58" height="12" rx="5" fill="#b9c0c5"/><circle cx="52" cy="36" r="2.4" fill="#5d6a72"/></svg>';
  const IMG = '<svg width="60" height="48" viewBox="0 0 60 48"><rect x="2" y="2" width="56" height="44" rx="4" fill="#fff" stroke="#cfd3d6" stroke-width="2"/><rect x="7" y="7" width="46" height="34" fill="#8fb7d6"/><path d="M7 41l15-16 10 10 7-6 14 12z" fill="#4e7a5b"/><circle cx="42" cy="16" r="4.5" fill="#f6dd8f"/></svg>';
  function buildMock(m) {
    const root = $('#mock');
    const icons = m.icons || [['Macintosh HD', DRIVE], ['Projects', FOLDER()], ['Notes.txt', DOC], ['Kyoto.jpg', IMG]];
    root.innerHTML = `
      <div class="menubar"><div class="l"><span class="apple">&#xF8FF;</span><b>Finder</b><span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span></div>
        <div class="r"><span class="wave">${WAVE}</span>${WIFI}${BATT}<span class="clock">${m.clock || 'Fri 3 Oct  6:12 PM'}</span></div></div>
      <div class="widgets">
        <div class="wdg cal"><div class="k">Friday</div><div class="big">3</div><div class="s">Design review · 4:30</div></div>
        <div class="wdg"><div class="k">Lisbon</div><div class="big">21°</div><div class="s">Clear · H 24° L 16°</div></div>
      </div>
      <div class="icons">${icons.map(([n, g]) => `<div class="icon" data-n="${n}"><div class="g">${g}</div><span>${n}</span></div>`).join('')}</div>
      <div class="dock">${['#4b8de8', '#f3f3f1', '#f6c344', '#2d2f33', '#e9604f', '#5fbf73', '#20382d'].map((c, i) => `<i style="background:${c}">${dockGlyph(i)}</i>`).join('')}</div>
      <div class="win"><div class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
        <div class="side"><b>Favourites</b><span>Desktop</span><span>Documents</span><span>Downloads</span><b>Locations</b><span>Macintosh HD</span></div>
        <div class="main"><div class="bar" style="left:190px">Projects</div>
          ${['site', 'sketches', 'scenes', 'notes', 'audio', 'press'].map((n) => `<div class="f">${FOLDER(58)}<span>${n}</span></div>`).join('')}</div></div>
      <div class="panel"><iframe src="${ORIGIN}/scenes/menu.html" scrolling="no"></iframe></div>`;
    mock = { m, root, win: $('.win', root), panel: $('.panel', root), wave: $('.wave', root), winT: null, panelT: null };
  }
  function dockGlyph(i) {
    const g = [
      '<svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="13" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M4 17h26M17 4c5 4 5 22 0 26M17 4c-5 4-5 22 0 26" stroke="#fff" stroke-width="2" fill="none"/></svg>',
      '<svg width="30" height="34" viewBox="0 0 30 34"><path d="M5 6h20M5 13h20M5 20h14" stroke="#9aa1a6" stroke-width="2.6" stroke-linecap="round"/></svg>',
      '<svg width="32" height="32" viewBox="0 0 32 32"><path d="M6 6h20v20H6z" fill="#fff" opacity=".85"/><path d="M6 12h20" stroke="#e0a92e" stroke-width="3"/></svg>',
      '<svg width="34" height="28" viewBox="0 0 34 28"><path d="M5 7l8 7-8 7M16 22h12" stroke="#d6f5e6" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>',
      '<svg width="30" height="32" viewBox="0 0 30 32"><path d="M11 25V8l15-4v17" stroke="#fff" stroke-width="2.6" fill="none"/><circle cx="8" cy="25" r="4" fill="#fff"/><circle cx="23" cy="21" r="4" fill="#fff"/></svg>',
      '<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M16 9v7l5 3" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
      WAVE.replace('width="22" height="16"', 'width="36" height="26"'),
    ];
    return g[i];
  }
  function mockUI(name) {
    if (!mock) return;
    const [verb, arg] = name.split(':');
    if (verb === 'select') document.querySelectorAll('.icon').forEach((el) => el.classList.toggle('sel', el.dataset.n === arg));
    if (verb === 'deselect') document.querySelectorAll('.icon').forEach((el) => el.classList.remove('sel'));
    if (verb === 'open') mock.winT = t;
    if (verb === 'close') mock.winClose = t;
    if (verb === 'panel') { mock.panelT = t; mock.wave.classList.add('on'); }
    if (verb === 'panelClose') { mock.panelClose = t; mock.wave.classList.remove('on'); }
  }
  function updateMock() {
    if (!mock) return;
    if (mock.winT != null) {
      const k = smooth(clamp((t - mock.winT) / 0.35)), c = mock.winClose != null ? 1 - smooth(clamp((t - mock.winClose) / 0.25)) : 1;
      mock.win.style.opacity = String(k * c);
      mock.win.style.transform = `scale(${lerp(0.6, 1, k)})`;
    }
    if (mock.panelT != null) {
      const k = smooth(clamp((t - mock.panelT) / 0.22)), c = mock.panelClose != null ? 1 - smooth(clamp((t - mock.panelClose) / 0.2)) : 1;
      const r = mock.wave.getBoundingClientRect(), ms = mock.scale || 1;
      const sc = mock.m.panelScale || 1.25;
      mock.panel.style.left = ((r.left - (mock.ox || 0)) / ms + r.width / ms / 2 - 170) + 'px';
      mock.panel.style.top = (40 + (sc - 1) * 0) + 'px';
      mock.panel.style.opacity = String(k * c);
      mock.panel.style.transform = `scale(${sc * lerp(0.97, 1, k)})`;
    }
  }
  async function sizePanel() {
    if (!mock) return;
    const f = $('.panel iframe');
    const ok = () => { try { const d = f.contentDocument; return d && d.location.href.includes('menu.html') && d.readyState === 'complete' && d.getElementById('root'); } catch (e) { return false; } };
    for (let i = 0; i < 80 && !ok(); i++) await sleep(100);
    try {
      const d = f.contentDocument;
      const st = d.createElement('style'); st.textContent = 'html,body{overflow:hidden!important}'; d.head.appendChild(st);
      if (mock.m.panelState) f.contentWindow.eval('render(Object.assign({}, S, ' + JSON.stringify(mock.m.panelState) + '))');
      await sleep(400);
      const h = Math.ceil(d.getElementById('root').getBoundingClientRect().height);
      f.style.height = (h > 120 ? Math.min(h, mock.m.panelMax || 610) : 560) + 'px';
    } catch (e) { f.style.height = '560px'; }
  }

  // ── public API ─────────────────────────────────────────────────────────
  S.init = async function (id, opts = {}) {
    clip = (window.CLIPS || {})[id];
    if (!clip) throw new Error('unknown clip ' + id);
    if ((window.CLIP_SKIP || []).includes(id)) throw new Error('skipped (CLIP_SKIP in clips.js)');
    t = 0; sfx = []; shots = []; lastFrame = -1;
    if (clip.music || clip.shots.some((s) => s.music)) beats = await (await fetch(ORIGIN + '/marketing/audio/beats-lofi.json')).json();
    if (clip.mock) { buildMock(clip.mock); await sizePanel(); }
    for (let i = 0; i < clip.shots.length; i++) shots.push(await loadShot(clip.shots[i], i));
    (clip.cursor || []).forEach((k) => { k._xy = null; k._done = false; });
    S.ready = true;
    await S.frame(0);
    return S.meta();
  };
  S.meta = function () {
    const cl = clip.cursor || [];
    const clickSfx = cl.filter((k) => k.click && k.sfx).map((k) => ({ t: k.t, kind: k.sfx, gain: k.gain || 1 }));
    return {
      id: clip.id, title: clip.title, dur: clip.dur, bed: clip.bed || 'lofi', bedStart: clip.bedStart || 0, bedGain: clip.bedGain || 1,
      captions: clip.captions || [], focus: clip.focus == null ? 0.42 : clip.focus, vertical: clip.vertical || 'crop',
      square: clip.square || 'crop', endcard: clip.endcard !== false, sfx: clickSfx.concat(sfx), capPos: clip.capPos || {},
    };
  };
  S.frame = async function (i) {
    if (i <= lastFrame) return;
    for (let f = lastFrame + 1; f <= i; f++) {
      t = f * DT;
      // timeline events (absolute clip time) for each shot
      for (const sh of shots) for (const [et, fn] of sh.sh.events || []) {
        const key = et + '|' + fn;
        if (et <= t + 1e-6 && !sh.fired.has(key)) { sh.fired.add(key); try { await fn(sh.api); } catch (e) { console.error(e); } }
      }
      // cursor + clicks
      const c = cursorAt(t);
      const target = activeShot(t);
      if (c) {
        for (const k of clip.cursor) {
          if (k.click && !k._done && t >= k.t - 1e-6) {
            k._done = true;
            const xy = k._xy || [k.x, k.y];
            ring(xy[0], xy[1], k.dbl);
            if (k.dbl) setTimeout(() => {}, 0);
            if (k.ui) mockUI(k.ui);
            if (k.to !== 'ui') {
              const [sx, sy] = toScene(target, xy[0], xy[1], t);
              target.api.down(sx, sy); k._upAt = t + 0.12; k._up = [sx, sy];
            }
            if (k.after) { try { await k.after(target.api); } catch (e) { console.error(e); } }
          }
          if (k._upAt != null && t >= k._upAt) { target.api.up(...k._up); k._upAt = null; }
        }
        if (c.vis > 0 && clip.cursorMoves !== false) { const [sx, sy] = toScene(target, c.x, c.y, t); target.api.move(sx, sy); }
        const el = $('#cursor');
        el.style.opacity = String(c.vis);
        el.style.transform = `translate(${c.x - 3}px, ${c.y - 2}px) scale(${clip.cursorScale || 1.25})`;
      }
      updateRings();
      updateMock();
      // scenes: env keyframes, music, opacity, push-in, then step the clock
      for (const sh of shots) {
        const op = shotOpacity(sh.idx, t);
        sh.fr.style.opacity = String(op);
        if (op <= 0) { sh.fr.style.visibility = 'hidden'; continue; }
        sh.fr.style.visibility = 'visible';
        const z = shotZoom(sh, t), [ox, oy] = sh.sh.origin || [0.5, 0.5];
        sh.fr.style.transformOrigin = `${ox * 100}% ${oy * 100}%`;
        sh.fr.style.transform = `scale(${z})`;
        if (Array.isArray(sh.sh.hour) && Array.isArray(sh.sh.hour[0])) {
          // setView('custom') = the scene's own quick light transition (env patches alone are smoothed over minutes)
          const h = keyed(sh.sh.hour, t, 15); sh.hour = h;
          if (sh.w.LW.setView) sh.w.LW.setView('custom', h); else sh.api.env({ hour: h });
        }
        feedMusic(sh, t);
        if (f > 0) sh.w.LW.advance(DT);
      }
    }
    lastFrame = i;
  };

  // ── stills: one composed frame (carousel slides, gallery images) ───────
  S.still = async function (id) {
    const st = (window.STILLS || {})[id];
    if (!st) throw new Error('unknown still ' + id);
    const stage = $('#stage');
    stage.style.width = st.w + 'px'; stage.style.height = st.h + 'px';
    clip = { id, dur: 1, shots: [st.shot], cursor: st.cursor || [], music: st.shot.music, bedStart: st.bedStart || 6 };
    if (clip.shots.some((s) => s.music)) beats = await (await fetch(ORIGIN + '/marketing/audio/beats-lofi.json')).json();
    if (st.mock) { buildMock(st.mock); await sizePanel(); if (st.mock.panel) mockUI('panel'); }
    shots = [await loadShot(st.shot, 0)];
    const fr = shots[0].fr, v = st.view || {};
    // place the 1920×1080 scene: scale + offset (px in still space)
    const sc = v.scale || Math.max(st.w / 1920, st.h / 1080);
    const x = v.x != null ? v.x : (st.w - 1920 * sc) * (v.fx == null ? 0.5 : v.fx);
    const y = v.y != null ? v.y : (st.h - 1080 * sc) * (v.fy == null ? 0.5 : v.fy);
    fr.style.transformOrigin = '0 0'; fr.style.transform = `translate(${x}px, ${y}px) scale(${sc})`; fr.style.opacity = '1';
    if (st.mock) { const m = $('#mock'); m.style.width = '1920px'; m.style.height = '1080px'; m.style.transformOrigin = '0 0'; m.style.transform = fr.style.transform; mock.scale = sc; mock.ox = x; }
    $('#still').innerHTML = st.html || '';
    t = 0; mock && (mock.panelT = -1); updateMock();
    const c = st.cursor && st.cursor[0];
    if (c) { const el = $('#cursor'); el.style.opacity = '1'; el.style.transform = `translate(${x + c.x * sc - 3}px, ${y + c.y * sc - 2}px) scale(${1.25 * sc})`; }
    shots[0].w.LW.advance(DT);
    return { w: st.w, h: st.h, out: st.out || id + '.png' };
  };

  // Browser preview: ?clip=koi&play=1 steps in real time (approximately) so you can eyeball a clip.
  const qs = new URLSearchParams(location.search);
  if (qs.get('clip')) {
    addEventListener('load', async () => {
      const fit = () => { const s = Math.min(innerWidth / 1920, innerHeight / 1080); $('#stage').style.transform = `scale(${s})`; };
      fit(); addEventListener('resize', fit);
      await S.init(qs.get('clip'));
      if (qs.get('play') === '1') { let i = 0; const go = async () => { await S.frame(i++); if (i < clip.dur * FPS) setTimeout(go, 1000 / FPS); }; go(); }
    });
  }
  if (qs.get('still')) addEventListener('load', () => S.still(qs.get('still')));
})();
