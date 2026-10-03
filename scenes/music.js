// music.js — the one music layer every wallpap visualizer reads. Plain script; load after lw.js:
//   <script src="lw.js"></script><script src="music.js"></script>
// and call LW.mx.update(dt) once at the top of each frame.
//
// It normalises whatever the host sends (host/BeatSync.swift: levels + kick, and on newer hosts
// chroma / chord / key / tempo / sections), smooths it, and turns it into musical *semantics*:
//
//   LW.mx.playing             a track is playing (LW.nowPlaying)
//   LW.mx.live                live system-audio analysis is arriving (Beat Sync on)
//   LW.mx.harmonyLive         real chroma/chord/key from the host (false → synthesised, see below)
//   level, bass, mid, high    0..1, lightly smoothed
//   energy                    0..1, slow loudness (≈1.2 s), drives "agitation" in most skins
//   bright                    0..1 spectral brightness (host centroid, or a band-ratio proxy)
//   chroma                    Float32Array(12), pitch-class energies C..B (max 1)
//   root, minor               current chord root pitch class 0..11 and quality
//   key, keyMinor             current key; keyPos = its place on the circle of fifths (relative
//                             minors share their major's place, so Am and C look alike)
//   rootPos                   chord root's place on the circle of fifths 0..11 (C=0, G=1, D=2 …)
//   interval                  {a, b, semis, ratio:[p,q], consonance 0..1} of the two strongest pitch classes
//   bpm, beatPhase, barPhase, beatIndex, bar, phrase     (4/4, 8-bar phrases)
//   kick, onset               decaying 0..1 envelopes (≈0.16 s / 0.1 s)
//   section                   'silence' | 'intro' | 'groove' | 'build' | 'drop' | 'breakdown'
//   tension                   0..1 rises through a build, released by the drop
//   pal                       {deep, mid, light, accent} linear RGB, a tonal ramp chosen by key and
//                             mode (circle of fifths → hue, major warmer / minor cooler), gliding
//   art                       {img, tint, acc, dark} (sRGB 0..255) from the artwork, or null
// Events: LW.mx.on(type, fn)
//   'kick' (strength)  'onset' (strength)  'beat' (index)  'bar' (index)  'phrase' (index)
//   'chord' ({root, minor, prevRoot, prevMinor})  'key' ({key, minor})
//   'section' (name, prev)  'build'  'drop'  'breakdown'  'track' (nowPlaying)  'art' (art)
//
// Fallbacks (older host, or Beat Sync off): levels/kicks come from lw.js (its own gentle pulse when
// nothing is analysed). Tempo is then estimated from kick spacing; sections from the energy
// envelope; harmony is SYNTHESISED as a slow diatonic progression on the beat clock (2 bars per
// chord) in a key that steps a fifth with every new track — never derived from the track title.
//
// Media + dev:  LW.mx.media('playpause'|'next'|'previous') — host transport, or built-in demo tracks
// (generated artwork) in a browser. In a browser, key 'n' (lw.js) starts a fake track; while it plays
// music.js feeds synthetic frames through the real __lw('beat', …) path: 122 bpm, 32 bars of
// intro / build / drop / breakdown, chords Am–F–C–G (2 bars each), modulating up a fifth every loop.
// ?fake=0 turns that off. LW.mx.fakeSeek(bars) jumps the fake song (for screenshots).
(function () {
  'use strict';
  const LW = window.LW;
  if (!LW) return;
  const qs = new URLSearchParams(location.search);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const approach = (v, t, tau, dt) => v + (t - v) * (1 - Math.exp(-dt / Math.max(1e-4, tau)));
  const nowS = () => performance.now() / 1000;
  const fifths = (pc) => (pc * 7) % 12;
  const handlers = {};

  const mx = LW.mx = {
    playing: false, live: false, harmonyLive: false, ever: false,
    level: 0, bass: 0, mid: 0, high: 0, energy: 0, bright: 0.4,
    chroma: new Float32Array(12),
    root: 9, minor: true, rootPos: 0, chordConf: 0,
    key: 9, keyMinor: true, keyPos: 0, keyConf: 0,
    interval: { a: 9, b: 4, semis: 7, ratio: [3, 2], consonance: 0.9 },
    bpm: 120, bpmConf: 0, beatPhase: 0, barPhase: 0, beatIndex: 0, bar: 0, phrase: 0,
    kick: 0, onset: 0, section: 'silence', tension: 0, silentFor: 99, sectionT: 0,
    pal: { deep: [0.02, 0.02, 0.03], mid: [0.2, 0.18, 0.16], light: [0.9, 0.85, 0.78], accent: [0.9, 0.55, 0.3] },
    art: null, trackKey: '', trackT: -99, np: null,
    fifths,
    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    emit(type, ...a) { (handlers[type] || []).forEach((fn) => { try { fn(...a); } catch (e) { console.error(e); } }); },
  };
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  mx.pcName = (pc) => NAMES[((pc % 12) + 12) % 12];
  mx.chordName = () => mx.pcName(mx.root) + (mx.minor ? 'm' : '');
  mx.keyName = () => mx.pcName(mx.key) + (mx.keyMinor ? ' minor' : ' major');

  // ─── Harmony → colour: circle of fifths → a restrained tonal hue ─────────────
  // Neighbouring keys get neighbouring hues; the sharp side warms (gold → copper → rose), the flat
  // side cools (sea-green → teal → slate → indigo). Saturation stays low: tonal, never rainbow.
  const HUE = [40, 30, 20, 8, 352, 334, 300, 262, 226, 200, 172, 70];   // by circle-of-fifths position C,G,D,A,E,B,F♯,D♭,A♭,E♭,B♭,F
  function hsl(h, s, l) {
    const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0), f(8), f(4)].map((v) => Math.pow(clamp(v, 0, 1), 2.2));   // → linear
  }
  mx.hueAt = (pos) => HUE[((Math.round(pos) % 12) + 12) % 12];
  // tonal ramp for a key: deep / mid / light share the hue, accent sits a little toward the chord's hue
  mx.palette = function (keyPos, minor, chordPos = keyPos) {
    const h = mx.hueAt(keyPos) + (minor ? -10 : 6), w = minor ? 0 : 1;
    const hc = mx.hueAt(chordPos);
    let d = ((hc - h + 540) % 360) - 180; d = clamp(d, -40, 40);
    return {
      deep: hsl((h + 360) % 360, 0.35, 0.05 + 0.01 * w),
      mid: hsl((h + 360) % 360, 0.28 + 0.06 * w, 0.32 + 0.04 * w),
      light: hsl((h + 360) % 360, 0.22 + 0.08 * w, 0.8 + 0.04 * w),
      accent: hsl((h + d * 0.6 + 360) % 360, 0.5 + 0.1 * w, 0.58),
    };
  };
  // consonance of an interval (semitones 0..11 folded to 0..6) and its just ratio
  // interval class (0..6, inversions folded) → just ratio + consonance; 5 (fourth/fifth) shows the 3:2 figure
  const RATIO = [[1, 1], [16, 15], [9, 8], [6, 5], [5, 4], [3, 2], [45, 32]];
  const CONS = [1, 0.12, 0.35, 0.7, 0.78, 0.92, 0.08];
  mx.ratioFor = (semis) => { const s = Math.min(((semis % 12) + 12) % 12, 12 - ((semis % 12) + 12) % 12); return { ratio: RATIO[s], consonance: CONS[s] }; };

  // ─── Now playing + artwork ─────────────────────────────────────────────────
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2;
    if (M === m) return [0, 0, l];
    const d = M - m, s = l > 0.5 ? d / (2 - M - m) : d / (M + m);
    const h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hsl255(h, s, l) { return hsl(h, s, l).map((v) => Math.pow(v, 1 / 2.2) * 255); }
  function extractPalette(img) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data;
      const bins = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
      let ar = 0, ag = 0, ab = 0;
      for (let i = 0; i < d.length; i += 4) {
        const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
        ar += d[i]; ag += d[i + 1]; ab += d[i + 2];
        const wgt = s * s * (1 - Math.abs(l - 0.52) * 1.6);
        if (wgt <= 0) continue;
        const bn = bins[Math.floor(h / 30) % 12];
        bn.w += wgt; bn.r += d[i] * wgt; bn.g += d[i + 1] * wgt; bn.b += d[i + 2] * wgt;
      }
      const n = d.length / 4, avg = [ar / n, ag / n, ab / n];
      const order = bins.map((b, i) => ({ ...b, i })).sort((a, b) => b.w - a.w);
      const norm = (c, L2) => { const [h, s] = rgb2hsl(c[0], c[1], c[2]); return hsl255(h, clamp(s, 0.25, 0.7), L2); };
      if (order[0].w < 3) return { tint: norm(avg, 0.62), acc: norm(avg, 0.7), dark: avg.map((v) => v * 0.35) };
      const b0 = order[0], c0 = [b0.r / b0.w, b0.g / b0.w, b0.b / b0.w];
      const b1 = order.find((b) => b !== b0 && Math.min(Math.abs(b.i - b0.i), 12 - Math.abs(b.i - b0.i)) >= 2 && b.w > b0.w * 0.15) || b0;
      return { tint: norm(c0, 0.62), acc: norm([b1.r / b1.w, b1.g / b1.w, b1.b / b1.w], 0.66), dark: avg.map((v) => v * 0.35) };
    } catch (e) { return null; }
  }
  let artSrc = '';
  function loadArt(src, key, retry) {
    artSrc = src;
    const img = new Image();
    if (!retry && /^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (mx.trackKey !== key) return;
      const p = extractPalette(img);
      mx.art = Object.assign({ img }, p || {});
      mx.emit('art', mx.art);
    };
    img.onerror = () => { if (!retry && /^https?:/i.test(src)) loadArt(src, key, true); };
    img.src = src;
  }
  function onNowPlaying(np) {
    mx.np = np || null;
    mx.playing = !!(np && np.playing);
    if (np) {
      mx.ever = true;
      const key = (np.title || '') + '\n' + (np.artist || '') + '\n' + (np.album || '');
      if (key !== mx.trackKey) {
        mx.trackKey = key; mx.trackT = nowS(); mx.art = null; artSrc = '';
        newTrack();
        mx.emit('track', np);
      }
      if (np.artwork && np.artwork !== artSrc) loadArt(np.artwork, key);
    }
  }
  LW.on('nowplaying', onNowPlaying);

  // ─── Host frames ───────────────────────────────────────────────────────────
  const H = { frame: null, at: -99, full: false, fullAt: -99, kicks: [], lastKick: -99 };
  LW.on('beatframe', (m) => {
    H.frame = m; H.at = nowS();
    if (Array.isArray(m.ch) && m.ch.length === 12) { H.full = true; H.fullAt = H.at; }
    if (m.o > 0) { mx.onset = Math.max(mx.onset, m.o); mx.emit('onset', m.o); }
  });
  LW.on('beat', (s) => {
    const t = nowS();
    if (t - H.lastKick > 0.2) { H.kicks.push(t); if (H.kicks.length > 16) H.kicks.shift(); }
    H.lastKick = t;
    mx.kick = Math.max(mx.kick, s);
    if (mx.playing) mx.emit('kick', s);
    // phase-lock the beat clock to kicks when the host doesn't send a phase
    if (!(H.full && nowS() - H.fullAt < 3)) {
      let e = mx.beatPhase; if (e > 0.5) e -= 1;
      clock.phase -= e * 0.35;
    }
  });
  function tempoFromKicks() {
    const k = H.kicks, iois = [];
    for (let i = 1; i < k.length; i++) {
      let d = k[i] - k[i - 1];
      if (d < 0.25 || d > 1.6) continue;
      while (d > 0.77) d /= 2;
      while (d < 0.375) d *= 2;
      iois.push(d);
    }
    if (iois.length < 4) return 0;
    iois.sort((a, b) => a - b);
    return 60 / iois[iois.length >> 1];
  }

  // ─── Beat clock ─────────────────────────────────────────────────────────────
  const clock = { phase: 0, idx: 0 };
  function alignBar() {   // make the current beat a phrase start (on drops / section changes)
    const r = Math.round(clock.phase) > 0.5 ? 1 : 0;
    clock.idx = Math.ceil((clock.idx + r) / 32) * 32 - r;
  }

  // ─── Sections (fallback when the host doesn't send them) ───────────────────
  const SE = { eS: 0, eM: 0, eL: 0, bS: 0, bM: 0, soundT: 0, build: 0, brk: 0, sinceDrop: 99, sinceT: 99, drop: 0, sinceKick: 99 };
  function sectionFallback(dt, lv, bass, kickNow) {
    const s = SE;
    s.soundT = lv > 0.04 ? s.soundT + dt : 0;
    const ema = (k, v, tau) => { s[k] += (v - s[k]) * (1 - Math.exp(-dt / Math.min(tau, Math.max(0.3, s.soundT)))); };
    const prevM = s.eM;
    ema('eS', lv, 0.4); ema('eM', lv, 4); ema('eL', lv, 30); ema('bS', bass, 0.5); ema('bM', bass, 4);
    const slope = (s.eM - prevM) / Math.max(dt, 1e-3);
    s.sinceKick = kickNow > 0.3 ? 0 : s.sinceKick + dt;
    s.sinceDrop += dt; s.sinceT += dt;
    s.build = s.soundT > 6 && slope > 0.004 ? Math.min(8, s.build + dt) : Math.max(0, s.build - dt * 0.7);
    s.brk = s.soundT > 6 && (s.sinceKick > 3.5 || s.eM < s.eL * 0.7) ? Math.min(8, s.brk + dt) : Math.max(0, s.brk - dt * 3);
    if (s.build > 2.5 || s.brk > 2 || s.sinceKick > 2) s.sinceT = 0;
    if (s.sinceT < 8 && s.sinceDrop > 12 && kickNow > 0.3 && s.bS > Math.max(s.bM * 1.25, 0.3)) { s.drop = 1.5; s.sinceDrop = 0; s.build = 0; s.brk = 0; }
    s.drop = Math.max(0, s.drop - dt);
    return s.drop > 0 ? 2 : s.brk > 2 ? 3 : s.build > 2.5 ? 1 : 0;
  }

  // ─── Synthesised harmony (no chroma from the host) ─────────────────────────
  const FB = { key: 9, minor: true, step: 0, lastBar: -1 };
  try { const k = +localStorage.getItem('lw.mx.key'); if (k >= 0 && k < 12) FB.key = k | 0; } catch (e) {}
  const PROG_MAJ = [[0, 0], [7, 0], [9, 1], [5, 0]];     // I – V – vi – IV   (offset, minor?)
  const PROG_MIN = [[0, 1], [8, 0], [3, 0], [10, 0]];    // i – VI – III – VII
  function newTrack() {
    if (!mx.harmonyLive) {
      FB.key = (FB.key + 7) % 12; FB.step = 0; FB.lastBar = -1;
      try { localStorage.setItem('lw.mx.key', String(FB.key)); } catch (e) {}
    }
  }
  const synthChroma = new Float32Array(12);
  function synthHarmony(dt) {
    FB.minor = mx.bright < 0.42;
    if (mx.playing && mx.bar !== FB.lastBar && mx.bar % 2 === 0) { FB.lastBar = mx.bar; FB.step++; }
    const P = FB.minor ? PROG_MIN : PROG_MAJ, [off, mn] = P[FB.step % 4];
    const r = (FB.key + off) % 12, third = (r + (mn ? 3 : 4)) % 12, fifth = (r + 7) % 12;
    const t = nowS();
    for (let i = 0; i < 12; i++) synthChroma[i] = 0.08 + 0.04 * Math.sin(t * 0.7 + i * 1.3);
    synthChroma[r] = 1; synthChroma[third] = 0.75 + 0.1 * Math.sin(t * 0.5); synthChroma[fifth] = 0.85;
    return { ch: synthChroma, r, q: mn ? 0 : 1, key: FB.key, mo: FB.minor ? 0 : 1 };
  }

  // ─── Dev: a fake track with full frames (browser only) ─────────────────────
  const FAKE = { on: !LW.isHost && qs.get('fake') !== '0', t: 0, lastBeat: -1, mine: -1, extUntil: -1, sendT: 0, dropUntil: -1 };
  const FAKE_PROG = [[9, 1], [5, 0], [0, 0], [7, 0]];    // Am F C G (offsets from A minor's tonic: absolute pcs)
  mx.fake = FAKE;
  mx.fakeSeek = (bars) => { FAKE.t += bars * 4 * 60 / 122; FAKE.lastBeat = Math.floor(FAKE.t * 122 / 60); };
  function fakeFrame(dt, T) {
    const M = LW.music;
    if (FAKE.mine >= 0 && M.lastLive > FAKE.mine) FAKE.extUntil = T + 3;     // someone else is feeding frames
    if (!FAKE.on || !mx.playing || T < FAKE.extUntil) return;
    FAKE.t += dt;
    const beat = FAKE.t * 122 / 60, bi = Math.floor(beat), fr = beat - bi;
    const loop = Math.floor(bi / 128), bar = Math.floor(bi / 4) % 32, sec = bar < 8 ? 0 : bar < 16 ? 1 : bar < 24 ? 2 : 3;
    const prog = ((bar % 8) + ((bi % 4) + fr) / 4) / 8;
    const kickOn = (sec === 0 && bar >= 2) || (sec === 1 && bar < 15) || sec === 2;
    const env = Math.exp(-fr * 7), wob = 0.06 * Math.sin(FAKE.t * 1.7);
    const base = [0.3, 0.36 + 0.24 * prog, 0.72, 0.2][sec];
    const b = clamp(base * 0.85 + (kickOn ? 0.35 * env : 0) + (sec === 2 ? 0.1 : 0), 0, 1);
    const m = clamp([0.3, 0.4, 0.6, 0.32][sec] + wob, 0, 1);
    const h = clamp([0.15, 0.22 + 0.55 * prog, 0.55, 0.3][sec] + wob, 0, 1);
    const l = clamp(base * 0.55 + 0.2 * m + 0.15 * h + (kickOn ? 0.12 * env : 0), 0, 1);
    let k = 0, o = 0;
    if (bi !== FAKE.lastBeat) {
      FAKE.lastBeat = bi;
      if (kickOn) k = sec === 2 ? 0.85 : 0.55;
      if (sec === 2 && bar === 16 && bi % 4 === 0) FAKE.dropUntil = FAKE.t + 1.5;
    }
    if (Math.abs(fr - 0.5) < 0.02 && sec !== 3) o = 0.4 + 0.3 * prog;
    // harmony: Am–F–C–G, two bars per chord, transposed up a fifth every loop
    const tr = (loop * 7) % 12, [pc, mn] = FAKE_PROG[Math.floor(bar / 2) % 4];
    const r = (pc + tr) % 12, third = (r + (mn ? 3 : 4)) % 12, fifth = (r + 7) % 12;
    const ch = new Array(12);
    for (let i = 0; i < 12; i++) ch[i] = +(0.07 + 0.05 * Math.abs(Math.sin(FAKE.t * 0.9 + i))).toFixed(2);
    ch[r] = 1; ch[third] = +(0.72 + 0.1 * Math.sin(FAKE.t)).toFixed(2); ch[fifth] = 0.84;
    const s = FAKE.t < FAKE.dropUntil ? 2 : sec === 1 && bar >= 11 ? 1 : sec === 3 && bar >= 26 ? 3 : 0;
    FAKE.sendT += dt;
    if (k || o || FAKE.sendT > 0.05) {
      FAKE.sendT = 0;
      window.__lw('beat', {
        l, b, m, h, k, o, c: [0.32, 0.38 + 0.25 * prog, 0.62, 0.36][sec], ch, r, q: mn ? 0 : 1, rc: 0.9,
        key: (9 + tr) % 12, mo: 0, kc: 0.8, bpm: 122, bc: 0.9, ph: fr, e: l, tr: [0, 0.3 * prog, 0.4, -0.4][sec], sec: s,
      });
      FAKE.mine = M.lastLive;
    }
  }

  // ─── Update (call once per frame) ──────────────────────────────────────────
  let lastT = -1, prevPhase = 0;
  const SEC = ['groove', 'build', 'drop', 'breakdown', 'silence'];
  const keyChroma = new Float32Array(12);
  mx.update = function (dtIn) {
    const T = nowS();
    if (T === lastT) return mx;
    const dt = clamp(lastT < 0 ? (dtIn || 1 / 30) : T - lastT, 0, 0.1);
    lastT = T;
    if (!LW.isHost) fakeFrame(dt, T);
    const M = LW.music, f = H.frame;
    mx.live = !!M.live;
    const full = H.full && T - H.fullAt < 3 && mx.live;
    mx.harmonyLive = full;

    // levels
    const lv = mx.playing ? M.level : M.level * 0.5;
    mx.level = approach(mx.level, lv, 0.05, dt);
    mx.bass = approach(mx.bass, M.bass, 0.05, dt);
    mx.mid = approach(mx.mid, M.mid, 0.08, dt);
    mx.high = approach(mx.high, M.high, 0.08, dt);
    mx.energy = approach(mx.energy, mx.playing ? M.level : 0, M.level > mx.energy ? 0.5 : 1.4, dt);
    const tot = M.bass + M.mid + M.high + 1e-3;
    const brightT = full && f && f.c != null ? f.c : clamp(((0.5 * M.mid + M.high) / tot - 0.15) / 0.5, 0, 1);
    mx.bright = approach(mx.bright, mx.playing ? brightT : 0.4, 1.2, dt);
    mx.kick *= Math.exp(-dt / 0.16);
    mx.onset *= Math.exp(-dt / 0.1);
    const sounding = mx.playing && M.level > 0.04;
    mx.silentFor = sounding ? 0 : mx.silentFor + dt;

    // tempo + beat clock
    let bpm = 0;
    if (full && f.bpm && f.bc > 0.12) { bpm = f.bpm; mx.bpmConf = f.bc; }
    else { bpm = tempoFromKicks(); mx.bpmConf = bpm ? 0.3 : 0; }
    if (bpm) mx.bpm = Math.abs(bpm - mx.bpm) / mx.bpm > 0.08 ? bpm : approach(mx.bpm, bpm, 2, dt);
    if (mx.playing) {
      clock.phase += dt * mx.bpm / 60;
      if (full && f.ph != null) {
        const target = f.ph + (T - H.at) * mx.bpm / 60;
        let e = ((target - clock.phase) % 1 + 1.5) % 1 - 0.5;
        clock.phase += e * Math.min(1, dt * 3);
      }
      while (clock.phase >= 1) {
        clock.phase -= 1; clock.idx++;
        mx.emit('beat', clock.idx);
        if (clock.idx % 4 === 0) mx.emit('bar', clock.idx / 4);
        if (clock.idx % 32 === 0) mx.emit('phrase', clock.idx / 32);
      }
      if (clock.phase < 0) clock.phase += 1;
    }
    mx.beatPhase = clock.phase; mx.beatIndex = clock.idx;
    mx.bar = Math.floor(clock.idx / 4); mx.phrase = Math.floor(clock.idx / 32);
    mx.barPhase = ((clock.idx % 4) + clock.phase) / 4;

    // sections
    const secCode = !mx.playing || mx.silentFor > 2 ? 4 : full && f.sec != null ? f.sec : sectionFallback(dt, M.level, M.bass, f && T - H.at < 0.06 ? f.k || 0 : 0);
    let name = SEC[secCode];
    if (name === 'groove' && mx.playing && T - mx.trackT < 20 && mx.tension < 0.05 && !SE.droppedThisTrack) name = 'intro';
    if (name !== mx.section) {
      const prev = mx.section;
      mx.section = name; mx.sectionT = 0;
      if (name === 'drop') { SE.droppedThisTrack = true; alignBar(); }
      mx.emit('section', name, prev);
      if (name === 'drop' || name === 'build' || name === 'breakdown') mx.emit(name);
    } else mx.sectionT += dt;
    mx.tension = name === 'build' ? Math.min(1, mx.tension + dt / 8) : name === 'drop' ? approach(mx.tension, 0, 0.25, dt) : approach(mx.tension, 0, 3, dt);

    // harmony
    const hsrc = full ? f : synthHarmony(dt);
    const ch = hsrc.ch;
    const aC = 1 - Math.exp(-dt / (full ? 0.15 : 0.6));
    for (let i = 0; i < 12; i++) mx.chroma[i] += ((+ch[i] || 0) - mx.chroma[i]) * aC;
    const root = hsrc.r | 0, minor = !hsrc.q;
    if ((root !== mx.root || minor !== mx.minor) && (mx.playing || !mx.ever)) {
      const prevRoot = mx.root, prevMinor = mx.minor;
      mx.root = root; mx.minor = minor;
      mx.emit('chord', { root, minor, prevRoot, prevMinor });
    }
    mx.chordConf = full ? +f.rc || 0 : 0.5;
    mx.rootPos = fifths(mx.root);
    const key = hsrc.key | 0, keyMinor = !hsrc.mo;
    if (key !== mx.key || keyMinor !== mx.keyMinor) {
      mx.key = key; mx.keyMinor = keyMinor;
      mx.emit('key', { key, minor: keyMinor });
    }
    mx.keyConf = full ? +f.kc || 0 : 0.4;
    mx.keyPos = fifths(keyMinor ? (key + 3) % 12 : key);
    // interval of the two strongest pitch classes
    let a = 0, b = -1;
    for (let i = 1; i < 12; i++) if (mx.chroma[i] > mx.chroma[a]) a = i;
    for (let i = 0; i < 12; i++) if (i !== a && (b < 0 || mx.chroma[i] > mx.chroma[b])) b = i;
    const semis = (b - a + 12) % 12, rr = mx.ratioFor(semis);
    mx.interval = { a, b, semis, ratio: rr.ratio, consonance: rr.consonance, strength: mx.chroma[b] };

    // palette glide (slow; key changes are rare)
    const P = mx.palette(mx.keyPos, mx.keyMinor, mx.rootPos);
    const k = 1 - Math.exp(-dt / 4);
    for (const n of ['deep', 'mid', 'light', 'accent']) for (let i = 0; i < 3; i++) mx.pal[n][i] += (P[n][i] - mx.pal[n][i]) * k;
    keyChroma.set(mx.chroma);
    return mx;
  };
  // first values: no glide from the defaults
  { const P = mx.palette(mx.keyPos, mx.keyMinor); mx.pal = { deep: P.deep.slice(), mid: P.mid.slice(), light: P.light.slice(), accent: P.accent.slice() }; }

  // ─── Media: host transport, or demo tracks in a browser ────────────────────
  let demoI = 0;
  const demoArt = [];
  const DEMO = [
    { title: 'Standing Waves', artist: 'Nodal Lines', album: 'Chladni Sessions', c: ['#1b3a63', '#e8b860', '#0a1428'] },
    { title: 'Fifths', artist: 'The Resonants', album: 'Circle', c: ['#6b2a40', '#f0a07a', '#220c18'] },
    { title: 'Copper & Air', artist: 'Kinetic Hall', album: 'Atrium', c: ['#2c5644', '#e8dcc0', '#0d1d16'] },
  ];
  function demoTrack(i) {
    const d = DEMO[i % DEMO.length];
    if (!demoArt[i % DEMO.length]) {
      const c = document.createElement('canvas'); c.width = c.height = 200;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 200, 200); gr.addColorStop(0, d.c[0]); gr.addColorStop(1, d.c[2]);
      g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
      g.fillStyle = d.c[1]; g.beginPath(); g.arc(128, 82, 42, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'italic 18px Georgia, serif'; g.fillText(d.album, 16, 182);
      demoArt[i % DEMO.length] = c.toDataURL('image/png');
    }
    return { title: d.title, artist: d.artist, album: d.album, artwork: demoArt[i % DEMO.length], playing: true, app: 'Music' };
  }
  mx.media = function (cmd) {
    if (LW.isHost) { LW.post({ type: 'media', cmd }); return; }
    const np = LW.nowPlaying;
    if (cmd === 'playpause') window.__lw('nowplaying', np ? { ...np, playing: !np.playing } : demoTrack(demoI));
    else { demoI = (demoI + (cmd === 'next' ? 1 : DEMO.length - 1)) % DEMO.length; window.__lw('nowplaying', demoTrack(demoI)); }
  };
  if (LW.nowPlaying) onNowPlaying(LW.nowPlaying);
})();
