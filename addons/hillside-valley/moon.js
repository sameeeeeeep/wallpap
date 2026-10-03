/* Shared moon for every scene: a photoreal moon (art/shared/moon.png) with the real phase,
   earthshine on the dark side, a soft halo, and a warmer, dimmer tint near the horizon.
     <script src="moon.js"></script>   (after lw.js)
     LW.drawMoon(g, x, y, r, opts)  → canvas2D: halo + moon centred at (x, y), radius r (px)
     LW.moonCanvas(px, opts)        → a cached square canvas of the moon disk (for WebGL scenes: upload
                                      it as a texture only when LW.moonKey(opts) changes, never per frame)
   opts: { phase 0..1 (0 new · .25 first quarter · .5 full · .75 last quarter; default = real, from
           LW.env.astronomy, else SunCalc for today, else full), tilt (radians, bright-limb rotation), alt (radians above the
           horizon, warms/dims it when low), glow 0..1 (halo strength, default .35), haze 0..1 (thin cloud
           softening), alpha 0..1 }
   Phase shading is computed per pixel once per (size, phase step, tint) and cached. */
(() => {
  'use strict';
  const img = new Image();
  let ready = false;
  img.onload = () => { ready = img.naturalWidth > 0; };
  img.src = 'art/shared/moon.png';
  const cache = new Map();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const realPhase = () => {
    const m = LW.env && LW.env.astronomy && LW.env.astronomy.moon;
    return m && Number.isFinite(m.phase) ? m.phase :
      (window.SunCalc?.getMoonIllumination(new Date()).phase ?? 0.5);
  };
  // Low moon: warmer and a touch dimmer (atmospheric extinction), like the real thing.
  const tintFor = (alt) => {
    const k = Number.isFinite(alt) ? clamp(1 - alt / 0.35, 0, 1) : 0;
    return [1, 1 - 0.1 * k, 1 - 0.28 * k, 1 - 0.18 * k];   // r, g, b multipliers + brightness
  };
  LW.moonKey = (opts = {}) => {
    const p = Number.isFinite(opts.phase) ? opts.phase : realPhase();
    const t = tintFor(opts.alt);
    return `${Math.round(((p % 1) + 1) % 1 * 240)}|${t.map((v) => v.toFixed(2)).join(',')}|${(opts.tilt || 0).toFixed(2)}`;
  };
  LW.moonCanvas = (px, opts = {}) => {
    px = Math.max(8, Math.min(512, Math.round(px)));
    if (!ready) return null;
    const key = px + '|' + LW.moonKey(opts);
    let c = cache.get(key);
    if (c) return c;
    if (cache.size > 24) cache.delete(cache.keys().next().value);
    const p = ((Number.isFinite(opts.phase) ? opts.phase : realPhase()) % 1 + 1) % 1;
    const [tr, tg, tb, br] = tintFor(opts.alt);
    c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.translate(px / 2, px / 2); g.rotate(opts.tilt || 0); g.drawImage(img, -px / 2, -px / 2, px, px);
    const id = g.getImageData(0, 0, px, px), d = id.data, cosP = Math.cos(2 * Math.PI * p), waxing = p < 0.5;
    const edge = 1.6 / px;   // terminator softness in disk units
    for (let j = 0; j < px; j++) {
      const y = (j + 0.5) / px * 2 - 1, w = Math.sqrt(Math.max(0, 1 - y * y)), tx = w * cosP;
      for (let i = 0; i < px; i++) {
        const o = (j * px + i) * 4; if (!d[o + 3]) continue;
        const x = (i + 0.5) / px * 2 - 1;
        const s = waxing ? x - tx : -tx - x;                     // >0 = sunlit
        const lit = clamp(0.5 + s / (edge * 2 + 0.012), 0, 1);   // soft terminator
        // The dark side is mostly sky showing through, with a faint bluish earthshine.
        const k = lit * br + (1 - lit) * 0.32;
        d[o] = d[o] * k * tr; d[o + 1] = d[o + 1] * k * tg; d[o + 2] = Math.min(255, d[o + 2] * k * tb * (1 + 0.25 * (1 - lit)));
        d[o + 3] = d[o + 3] * (lit + (1 - lit) * 0.1);
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(id, 0, 0);
    cache.set(key, c);
    return c;
  };
  LW.drawMoon = (g, x, y, r, opts = {}) => {
    const p = Number.isFinite(opts.phase) ? opts.phase : realPhase();
    const lit = 0.5 - 0.5 * Math.cos(2 * Math.PI * p);           // illuminated fraction
    const a = opts.alpha == null ? 1 : opts.alpha, haze = clamp(opts.haze || 0, 0, 1);
    const [tr, tg, tb] = tintFor(opts.alt);
    // halo: scales with how much of the moon is lit, widens in haze
    const glow = (opts.glow == null ? 0.35 : opts.glow) * (0.25 + 0.75 * lit) * a;
    if (glow > 0.005) {
      const R = r * (3.2 + 3 * haze), gr = g.createRadialGradient(x, y, r * 0.9, x, y, R);
      const col = `${Math.round(205 * tr)},${Math.round(215 * tg)},${Math.round(235 * tb)}`;
      gr.addColorStop(0, `rgba(${col},${(0.22 * glow).toFixed(3)})`);
      gr.addColorStop(0.35, `rgba(${col},${(0.07 * glow).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr;
      g.fillRect(x - R, y - R, R * 2, R * 2); g.restore();
    }
    const dpr = (g.getTransform && g.getTransform().a) || 1;
    const c = LW.moonCanvas(r * 2 * dpr, opts);
    if (!c) return;
    g.save(); g.globalAlpha = a * (1 - 0.45 * haze);
    if (haze > 0.02) g.filter = `blur(${(haze * r * 0.08).toFixed(2)}px)`;
    g.drawImage(c, x - r, y - r, r * 2, r * 2);
    g.restore();
  };
})();
