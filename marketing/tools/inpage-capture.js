// Manual / agent fallback capture: paste into a scene tab opened with ?virtual=1 on the dev server
// (python3 devserver.py 5210 → http://127.0.0.1:5210/koi.html?virtual=1&hour=16), e.g. via the
// Claude Browser javascript tool. It steps the scene clock 1/30 s per frame and saves PNGs through
// the dev server's /__shot endpoint into livewall/shots/mk-<name>-0001.png …
// Then:  marketing/tools/collect-frames.sh <name>   → marketing/frames/<name>/0001.png + <name>.mp4
//
// The main pipeline (render.py) does the same headless, with captions, crops and music. Use this
// one when you want to grab a quick moment from a scene you're actively tweaking.
//
//   await wpCapture({ name: 'koi-feed', seconds: 6, scale: 1, pre: 3, script: [
//     [0.5, () => { __lw('down', 640, 520); __lw('up', 640, 520); }],
//     [2.0, () => __lw('env', { hour: 16, weather: 'rain' })],
//   ] });
window.wpCapture = async function ({ name = 'clip', seconds = 8, scale = 1, pre = 2, script = [], fps = 30 } = {}) {
  if (!window.LW || !LW.virtual) throw new Error('open the scene with ?virtual=1');
  LW.advance(pre);
  const n = Math.round(seconds * fps), todo = script.slice().sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    while (todo.length && todo[0][0] <= t) { try { todo.shift()[1](); } catch (e) { console.error(e); } }
    // LW.shot advances one frame itself (virtual mode) and then composites every canvas
    await LW.shot(`mk-${name}-${String(i + 1).padStart(4, '0')}.png`, scale);
  }
  return `${n} frames → shots/mk-${name}-*.png`;
};
