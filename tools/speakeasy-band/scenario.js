// Scripted music for the Speakeasy band (wkshot pre-JS, ?virtual=1): runs on the virtual frame clock.
// Song A (trio): idle → play → count-in → intro (brushes) → build → drop (crash) → groove → breakdown → stop → idle.
// Song B (+ singer): play → the singer rises on the lift → sings → stop → she sinks away.
// Song C (+ sax): rises, phrases/breaths, build, a solo on the drop, stop → sinks. Song D: both guests (rare).
// Music comes from music.js's own fake stream (122 bpm, Am–F–C–G, sections) through the real __lw('beat') path;
// seekBar() jumps that song to a bar. window.__scn.log holds what happened (section/mode per event).
(() => {
  const seekBar = (b) => { const F = LW.mx.fake; F.t = b * 4 * 60 / 122 + 0.01; F.lastBeat = Math.floor(F.t * 122 / 60); F.dropUntil = -1; };
  const A = { title: 'Blue Hour Waltz', artist: 'The Velvet Lanterns', album: 'Last Call', artwork: '', playing: true, app: 'Music' };
  const B = { title: 'Gin & Moonlight', artist: 'Harlan Sweet Quartet', album: 'After Hours', artwork: '', playing: true, app: 'Music' };
  const C = { title: 'Smoke Rings', artist: 'Ida Mae & the Brass Moon', album: 'Speakeasy Sides', artwork: '', playing: true, app: 'Music' };
  const D = { title: 'Last Call', artist: 'The House Quintet', album: 'Closing Time', artwork: '', playing: true, app: 'Music' };
  const ev = [
    [2.0, () => { __speak.BAND.force = { singer: false }; __lw('nowplaying', A); }],
    [7.0, () => seekBar(11)],
    [11.0, () => seekBar(15.6)],
    [15.4, () => seekBar(26.2)],
    [19.0, () => __lw('nowplaying', { ...A, playing: false })],
    [25.0, () => { __speak.BAND.force = { singer: true }; seekBar(0); __lw('nowplaying', B); }],
    [27.5, () => seekBar(15.7)],
    [33.0, () => __lw('nowplaying', { ...B, playing: false })],
    [37.0, () => { __speak.BAND.force = { singer: false, sax: true }; seekBar(0); __lw('nowplaying', C); }],
    [40.5, () => seekBar(11)],
    [43.0, () => seekBar(15.75)],
    [50.0, () => __lw('nowplaying', { ...C, playing: false })],
    [55.0, () => { __speak.BAND.force = { singer: true, sax: true }; seekBar(17); __lw('nowplaying', D); }],
    [60.0, () => __lw('nowplaying', { ...D, playing: false })],
  ];
  // window.__scnFrom = t: start the script at t (earlier events dropped; songs are independent) —
  // sequence.py renders long scripts in parts so one WKWebView run stays under wkshot's time limit
  const from = window.__scnFrom || 0;
  for (let i = ev.length - 1; i >= 0; i--) { if (ev[i][0] < from) ev.splice(i, 1); else ev[i][0] -= from; }
  const t0 = performance.now(), log = [];
  window.__scn = { log };
  let last = '';
  (function tick() {
    const t = (performance.now() - t0) / 1000;
    while (ev.length && ev[0][0] <= t) ev.shift()[1]();
    const B2 = __speak.BAND, s = `${B2.mode}/${LW.mx.section}/singer:${B2.lineup.singer}/sax:${B2.lineup.sax}/${B2.sax.solo > 0 ? 'SOLO' : B2.sax.phrase > 0 ? 'phrase' : 'rest'}`;
    if (s !== last) { log.push(`${t.toFixed(2)} ${s}`); last = s; }
    requestAnimationFrame(tick);
  })();
  window.__shotReport = () => ({ log, errs: window.__errs });
})();
