// Scripted music for the Speakeasy band (wkshot pre-JS, ?virtual=1): runs on the virtual frame clock.
// Song A (trio): idle → play → count-in → intro (brushes) → build → drop (crash) → groove → breakdown → stop → idle.
// Song B (+ singer): play → the singer rises on the lift → sings → stop → she sinks away.
// Music comes from music.js's own fake stream (122 bpm, Am–F–C–G, sections) through the real __lw('beat') path;
// seekBar() jumps that song to a bar. window.__scn.log holds what happened (section/mode per event).
(() => {
  const seekBar = (b) => { const F = LW.mx.fake; F.t = b * 4 * 60 / 122 + 0.01; F.lastBeat = Math.floor(F.t * 122 / 60); F.dropUntil = -1; };
  const A = { title: 'Blue Hour Waltz', artist: 'The Velvet Lanterns', album: 'Last Call', artwork: '', playing: true, app: 'Music' };
  const B = { title: 'Gin & Moonlight', artist: 'Harlan Sweet Quartet', album: 'After Hours', artwork: '', playing: true, app: 'Music' };
  const ev = [
    [2.0, () => { __speak.BAND.force = { singer: false }; __lw('nowplaying', A); }],
    [7.0, () => seekBar(11)],
    [11.0, () => seekBar(15.6)],
    [15.4, () => seekBar(26.2)],
    [19.0, () => __lw('nowplaying', { ...A, playing: false })],
    [25.0, () => { __speak.BAND.force = { singer: true }; seekBar(0); __lw('nowplaying', B); }],
    [27.5, () => seekBar(15.7)],
    [33.0, () => __lw('nowplaying', { ...B, playing: false })],
  ];
  const t0 = performance.now(), log = [];
  window.__scn = { log };
  let last = '';
  (function tick() {
    const t = (performance.now() - t0) / 1000;
    while (ev.length && ev[0][0] <= t) ev.shift()[1]();
    const B2 = __speak.BAND, s = `${B2.mode}/${LW.mx.section}/singer:${B2.lineup.singer}`;
    if (s !== last) { log.push(`${t.toFixed(2)} ${s}`); last = s; }
    requestAnimationFrame(tick);
  })();
  window.__shotReport = () => ({ log, errs: window.__errs });
})();
