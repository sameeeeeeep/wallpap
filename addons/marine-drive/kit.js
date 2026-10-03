// kit.js — the wallpap scene kit. Plain script (no modules, no build); attaches window.Kit.
// Extracted from scenes/koi.html so a realistic, cheap-to-run scene is ~150–250 lines of declaration.
//
// Load order (kit first so it captures the real clock before lw.js's ?virtual=1 swaps it; moon.js only if a sky shows):
//   <script src="astronomy.js"></script> <script src="kit.js"></script> <script src="lw.js"></script> <script src="moon.js"></script>
// Add-ons ship kit.js, moon.js and art/shared/moon.png themselves (addons/build.sh); the app provides the rest.
//
// ─── A scene ────────────────────────────────────────────────────────────────────────────────────
//   Kit.scene({
//     assets: { atlas: 'atlas.png' },                  // images (or *.json data), loaded before setup; layers may add their own
//     layers: [Kit.sky(), Kit.meadow({...}), Kit.sprites((b, k, t) => {...}), Kit.particles(), Kit.light()],
//     life: [obj],                                     // anything with update(dt, t, k) (and draw(b, k, t), drawn by Kit.life())
//     setup(k) {}, resize(k) {}, update(dt, t, k) {},  // your own state
//     breathe(level, phase, k) {},                     // calm mode: level 0..1 on lw.js's breath clock (holds hold)
//     music(m, k) {},                                  // m = {level, beat} — beat decays; keep it gentle
//     onDown(x, y, k) {}, onUp, onMove, onDrag,         // input (CSS px; LW events)
//     onAction: { name(k) {} },                         // menu actions (LW.on('action'))
//     onReminder(r, k) {},                              // default: an in-world serif tag + soft chime
//     ambience: { build(A, k) {}, tick(A, k, at) {} },  // procedural bed on LW.bus('ambience'); rain/thunder/wind automatic
//     exposedAt(x, y, k) {}, surfaceAt(x, y, k) {},      // world for weather (defaults: all exposed ground; plates use masks)
//   })  →  k (the runtime: k.gl, k.W, k.H, k.L lighting, k.wind, k.cursor, k.breath, k.music, k.batch, k.sheet(), …)
//
// ─── Layers (drawn in order into one HDR scene target, then graded to the screen) ─────────────────
//   Kit.sky({elev, cover, stars, place, res})       sky dome for any view (elev = [top, bottom] radians: looking up or at a
//                                                  horizon): gradient, volumetric-ish clouds (3 layers, sun-lit edges,
//                                                  half-res, 15 fps), sun, stars, and the shared photoreal moon (moon.js)
//   Kit.water({floor, under(b,k,t), surface(b,k,t)}) koi's pond: ripple sim refraction, caustics, sky, glints, mist
//   Kit.waves({shore, under(b,k,t)})                top-down beach: sand (baked), swell, bores, swash + wet sand, foam lace,
//                                                  caustics, glitter; night bioluminescent foam. layer.edge/bores are
//                                                  JS-driven so breath can own them
//   Kit.meadow({plants, ground, dof})               baked ground + instanced plant sprites swaying in the wind field on the
//                                                  GPU (static VBO), shadows, cursor push, breath bloom; layer.blooms = perches
//   Kit.plate({plates, masks, occluders})           photo/painted backdrops (Codex plates): day/dusk/night/overcast crossfade,
//                                                  sky mask → live sky, water → shimmer + ripples, emissive night lights
//                                                  (auto: night − day), exposed → rain/snow/wet, occluders, coordinate maps
//   Kit.sprites(fn)                                 your batch drawing at this depth: fn(b, k, t)
//   Kit.life()                                      draws def.life items' draw(b, k, t) here (default: before particles)
//   Kit.particles({rain, snow, fireflies, pollen, petals, splash})   weather-driven; falls only where k.exposedAt, rings
//                                                  only on exposed ground (k.surfaceAt), rain on water → ripples
//   Kit.light({vignette, grain, glow, fog})         final grade: time × weather, mist, bloom-ish glow, filmic shoulder
//
// ─── Services on k ────────────────────────────────────────────────────────────────────────────────
//   k.layout     {side, mirror, clear, clearPx, avoid, avoidPx} from LW.layout (+ 'layout' events → re-resize). Author for
//                widgets-on-the-right; k.mx(x) / k.mfx(f) mirror when they're on the left; k.clearX(f) = a point across
//                the clear band; k.restOK(x, y) = may something linger here (inside clear, outside avoid boxes)
//   k.shade      0..1 (or 'auto'-style number) → a dappled tree shade over the widget side; or [x0, soft, amount, dir]
//   k.exposedAt(x, y) / k.surfaceAt(x, y) → precipitation reach / 'ground' | 'water' | null (what a raindrop hits)
//   k.wetAcc / k.snowAcc  weather that builds up: wet soaks in ~30 s, dries over ~6 min; snow settles over ~4 min
//   k.L          eased lighting: light, amb, zenith, horizon, sky, sunDir (shadow px per px of height), sun/moon
//                {x,y,elev,vis}, night, day, golden, cloud, wet, snow (accumulated), fog, sat, wind, spec, caust, flash, tint
//   k.wind       {base, gust, dir, at(x,y)} — same field as GLSL kitWind(p); k.wind.puff(s) adds a gust
//   k.cursor     {x, y, vx, vy, speed, inside, still (s since moved), down}
//   k.breath     {fade, level, phase, k, still} — lw.js breath clock; LW.breathDiegetic set if def.breathe
//   k.music      {level, beat}
//   k.ripples    shared wave-equation heightfield (water/waves): k.ripples.drop(x, y, r, strength)
//   k.batch      2D batch: sprite, shadow, quad4, tri, line, strip, glow, ring, rect — premultiplied, one draw per flush
//   k.sheet(src, frames) atlas (uploaded once, mipmapped)    k.field(sheet, list) instanced static sprites
//   k.program(fs), k.pass(prog, uniforms, target), k.target(w, h, float)   raw GL when a layer needs it
//   k.sound      one-shots: plop, splash, chime, flutter, gull, tone, burst (fx bus, respects mute)
//   k.stats      {js, jsMax} ms/frame (real clock); Kit.bench(s) → JS + GPU ms (p10/p50/p95), Kit.profile(s) per layer
//   Kit.steer    wander / seek / arrive / flee / separate / flock / bounds / calmZone / move / turnMove (pure)
//   Kit.rope(n, seg, x, y)   verlet rope (kite strings, tails)     Kit.spring(x, k, damp)
//   Kit.path(points)         arc-length polyline: .at(u) → [x, y, angle] (taxi routes, flight paths, boats)
//   Kit.palette(env)         pure lighting target for an LW.env      Kit.paint.*  procedural sprite painters
//
// Rules this kit enforces for you: never upload a 2D canvas per frame (atlases, text, moon upload once / on change),
// internal resolution capped (~1.7 MP), dt clamped ≤ 0.1, clouds/bakes amortised, the widget side kept calm (LW.layout).
//
// ─── Minimal scene ────────────────────────────────────────────────────────────────────────────────
//   Kit.scene({ layers: [Kit.water({ surface(b, k) { /* pads */ } }), Kit.particles({ fireflies: 12 }), Kit.light()],
//               onDown(x, y, k) { k.ripples.drop(x, y, 14, -1.3); k.sound.plop(x); } });
(function (root) {
'use strict';
const realNow = root.__realNow || (typeof performance !== 'undefined' ? performance.now.bind(performance) : Date.now);

// ─── Math ──────────────────────────────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function seeded(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NP = (() => { const r = seeded(7), a = new Float32Array(1024); for (let i = 0; i < 1024; i++) a[i] = r() * 2 - 1; return a; })();
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(NP[i & 1023], NP[(i + 1) & 1023], u); }
function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => NP[(a * 73 + b * 151 + ((a * b) & 255)) & 1023];
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
}
const CALM_X = 0.72;   // the right ~28% is for macOS widgets: calm background only

// ─── Lighting palette: time of day × weather (pure) ────────────────────────────────────────────
// hour, sun light rgb, ambient, zenith, horizon   (hours follow lw.js: sunrise 6.3, sunset 18.3, dusk 19.6)
const SKY = [
  [0,    [0.54, 0.64, 0.96], 0.34, [0.038, 0.058, 0.110], [0.105, 0.140, 0.215]],
  [4.9,  [0.56, 0.64, 0.95], 0.35, [0.043, 0.064, 0.122], [0.115, 0.150, 0.225]],
  [5.7,  [0.80, 0.56, 0.55], 0.44, [0.090, 0.120, 0.260], [0.560, 0.400, 0.440]],
  [6.3,  [1.00, 0.70, 0.50], 0.60, [0.200, 0.300, 0.540], [1.000, 0.620, 0.420]],
  [7.6,  [1.00, 0.86, 0.70], 0.84, [0.190, 0.380, 0.700], [0.720, 0.780, 0.850]],
  [12,   [1.00, 0.97, 0.92], 1.00, [0.150, 0.340, 0.700], [0.620, 0.760, 0.900]],
  [16.3, [1.00, 0.90, 0.76], 0.93, [0.170, 0.350, 0.680], [0.700, 0.760, 0.840]],
  [17.6, [1.00, 0.78, 0.55], 0.76, [0.220, 0.320, 0.580], [1.000, 0.660, 0.400]],
  [18.3, [1.00, 0.66, 0.50], 0.56, [0.150, 0.180, 0.380], [0.950, 0.460, 0.340]],
  [19.6, [0.60, 0.60, 0.88], 0.38, [0.040, 0.060, 0.150], [0.260, 0.200, 0.320]],
  [21,   [0.54, 0.64, 0.96], 0.34, [0.038, 0.058, 0.110], [0.105, 0.140, 0.215]],
  [24,   [0.54, 0.64, 0.96], 0.34, [0.038, 0.058, 0.110], [0.105, 0.140, 0.215]],
];
const WEATHER = { // dim, spec, caust, wind, fog, sat, cloud cover, wet, snow
  clear:  { dim: 1.0,  spec: 1.0,  caust: 1.0,  wind: 0.45, fog: 0.0,  sat: 1.0,  cloud: 0.28, wet: 0, snow: 0 },
  cloudy: { dim: 0.8,  spec: 0.35, caust: 0.3,  wind: 0.6,  fog: 0.05, sat: 0.86, cloud: 0.7,  wet: 0, snow: 0 },
  rain:   { dim: 0.68, spec: 0.5,  caust: 0.1,  wind: 0.85, fog: 0.12, sat: 0.78, cloud: 0.95, wet: 1, snow: 0 },
  storm:  { dim: 0.52, spec: 0.55, caust: 0.05, wind: 1.35, fog: 0.16, sat: 0.7,  cloud: 1.0,  wet: 1, snow: 0 },
  snow:   { dim: 0.82, spec: 0.25, caust: 0.15, wind: 0.3,  fog: 0.18, sat: 0.62, cloud: 0.88, wet: 0, snow: 1 },
  fog:    { dim: 0.76, spec: 0.15, caust: 0.12, wind: 0.15, fog: 0.5,  sat: 0.7,  cloud: 0.6,  wet: 0.3, snow: 0 },
};
function skyAt(h) {
  h = ((h % 24) + 24) % 24;
  for (let i = 0; i < SKY.length - 1; i++) {
    const a = SKY[i], b = SKY[i + 1];
    if (h >= a[0] && h <= b[0]) {
      const t = smooth(0, 1, (h - a[0]) / (b[0] - a[0]));
      return { light: mix3(a[1], b[1], t), amb: lerp(a[2], b[2], t), zenith: mix3(a[3], b[3], t), horizon: mix3(a[4], b[4], t) };
    }
  }
  return skyAt(12);
}
// Sun / moon on the sky dome: elevation (rad) + azimuth (rad, SunCalc convention: 0 = south, +west).
function bodies(env) {
  const A = env.astronomy;
  if (A && A.sun) return { sun: { elev: A.sun.altitude, az: A.sun.azimuth }, moon: { elev: A.moon.altitude, az: A.moon.azimuth, frac: A.moon.fraction, phase: A.moon.phase } };
  const h = env.hour, d = (h - 12.3) / 12;   // canonical day: sunrise 6.3 → sunset 18.3
  const sun = { elev: Math.sin(Math.PI * (h - 6.3) / 12) * 1.05, az: d * Math.PI * 1.1 };
  const mh = (h + 12) % 24;
  return { sun, moon: { elev: Math.sin(Math.PI * (mh - 6.3) / 12) * 0.9, az: ((mh - 12.3) / 12) * Math.PI, frac: 0.75, phase: 0.38 } };
}
function palette(env) {
  env = env || { hour: 12, weather: 'clear', intensity: 0.7, wind: 0.3 };
  const k = skyAt(env.hour), w = WEATHER[env.weather] || WEATHER.clear;
  const it = env.weather === 'clear' ? 1 : clamp(0.5 + (env.intensity ?? 0.7) * 0.6, 0.5, 1.1);
  const wm = (v, c) => lerp(c, v, it);
  const dim = wm(w.dim, 1), day = smooth(0.32, 0.8, k.amb), night = 1 - day;
  const gray = (c, s) => { const l = (c[0] + c[1] + c[2]) / 3; return c.map((v) => lerp(l, v, s)); };
  const B = bodies(env);
  const hr = ((env.hour % 24) + 24) % 24;
  const golden = Math.max(smooth(1.5, 0, Math.abs(hr - 6.6)), smooth(1.7, 0, Math.abs(hr - 18.0))) * dim;
  const shadowLen = (e) => Math.min(2.6, 1 / Math.tan(Math.max(0.12, e)));
  const src = B.sun.elev > -0.05 ? B.sun : B.moon;
  const sl = shadowLen(src.elev);
  const cloud = clamp(wm(w.cloud, 0.28), 0, 1);
  return {
    light: gray(k.light, lerp(1, 0.5, (1 - dim) * 1.6)).map((v) => v * lerp(1, dim, 0.75)),
    amb: Math.max(k.amb * dim, night * (0.29 + 0.085 * (B.moon.frac ?? 0.75))),
    zenith: gray(k.zenith, lerp(1, 0.35, 1 - dim)).map((v) => v * lerp(0.62, 1, dim)),
    horizon: gray(k.horizon, lerp(1, 0.4, 1 - dim)).map((v) => v * lerp(0.75, 1, dim)),
    sunDir: [Math.sin(src.az) * sl, -Math.cos(src.az) * sl],   // top-down shadow offset per px of height (y down)
    sunElev: B.sun.elev, sunAz: B.sun.az, moonElev: B.moon.elev, moonAz: B.moon.az,
    moonFrac: B.moon.frac ?? 0.75, moonPhase: B.moon.phase ?? 0.38,
    night, day, golden,
    cloud, wet: wm(w.wet, 0), snow: wm(w.snow, 0),
    fog: wm(w.fog, 0) + night * 0.03,
    sat: wm(w.sat, 1) * lerp(1, 0.6, night),                     // colour fades under moonlight
    wind: lerp(w.wind, w.wind * (0.6 + (env.wind ?? 0.3)), 0.5),
    spec: wm(w.spec, 1) * lerp(0.35, 1, day),
    caust: wm(w.caust, 1) * lerp(0.1, 1, day),
  };
}

// ─── Steering & physics helpers (pure; agents are plain objects {x, y, vx, vy, ang, speed, seed, …}) ──
const band = (k) => typeof k === 'number' ? [0, k * CALM_X, k] : [k.layout.clearPx[0], k.layout.clearPx[1], k.W];
const steer = {
  // Heading-based wander: returns a unit-ish force that slowly rotates.
  wander(a, t, rate = 0.15, spread = 1.3) { const w = (a.ang || 0) + noise1((a.seed || 0) + t * rate) * spread; return [Math.cos(w), Math.sin(w)]; },
  seek(a, x, y, w = 1) { const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy) || 1; return [dx / d * w, dy / d * w, d]; },
  arrive(a, x, y, r, w = 1) { const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / r); return [dx / d * w * k, dy / d * w * k, d]; },
  flee(a, x, y, r, w = 1) { const dx = a.x - x, dy = a.y - y, d = Math.hypot(dx, dy) || 1; if (d > r) return [0, 0, d]; const k = (1 - d / r) * w; return [dx / d * k, dy / d * k, d]; },
  separate(a, list, r, w = 1) {
    let fx = 0, fy = 0;
    for (const o of list) { if (o === a) continue; const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy); if (d > 0 && d < r) { fx += dx / d * (1 - d / r); fy += dy / d * (1 - d / r); } }
    return [fx * w, fy * w];
  },
  flock(a, list, r, wAlign = 0.3, wCohere = 0.2) {
    let ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
    for (const o of list) { if (o === a) continue; const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < r) { ax += Math.cos(o.ang || 0); ay += Math.sin(o.ang || 0); cx += o.x; cy += o.y; n++; } }
    if (!n) return [0, 0];
    const [sx, sy] = steer.seek(a, cx / n, cy / n, wCohere);
    return [ax / n * wAlign + sx, ay / n * wAlign + sy];
  },
  // Soft walls: force back into [m, W-m]×[m, H-m].
  bounds(a, W, H, m, w = 2.5) {
    let fx = 0, fy = 0;
    if (a.x < m) fx += (m - a.x) / m * w; if (a.x > W - m) fx -= (a.x - (W - m)) / m * w;
    if (a.y < m) fy += (m - a.y) / m * w; if (a.y > H - m) fy -= (a.y - (H - m)) / m * w;
    return [fx, fy];
  },
  // Widgets/icons own one side (LW.layout): things may pass through but not linger. Pushes back into the clear band.
  // k = the runtime (uses k.layout) or, legacy/pure, a screen width W with the widgets on the right.
  calmZone(a, k, w = 1) {
    const [x0, x1, W] = band(k), span = Math.max(1, W * 0.28);
    return a.x > x1 ? [-(a.x - x1) / span * w, 0] : a.x < x0 ? [(x0 - a.x) / span * w, 0] : [0, 0];
  },
  okToRest(x, k, y) { if (typeof k === 'object' && k.restOK) return k.restOK(x, y ?? -1e6); const [x0, x1] = band(k); return x > x0 && x < x1; },
  // Velocity integration for insects / particles: steer toward (fx,fy)*maxSpeed with an acceleration limit.
  move(a, fx, fy, dt, maxSpeed, accel = 4) {
    a.vx = ease(a.vx || 0, fx * maxSpeed, accel, dt); a.vy = ease(a.vy || 0, fy * maxSpeed, accel, dt);
    a.x += a.vx * dt; a.y += a.vy * dt;
    const sp = Math.hypot(a.vx, a.vy); if (sp > 1) a.ang = Math.atan2(a.vy, a.vx); a.speed = sp;
  },
  // Heading integration for fish / birds: turn-rate limited, speed eased.
  turnMove(a, fx, fy, dt, speed, turn = 1.5, accel = 1.2) {
    a.ang = (a.ang || 0) + clamp(angDiff(a.ang || 0, Math.atan2(fy, fx)), -turn * dt, turn * dt);
    a.speed = ease(a.speed || 0, speed, accel, dt);
    a.vx = Math.cos(a.ang) * a.speed; a.vy = Math.sin(a.ang) * a.speed;
    a.x += a.vx * dt; a.y += a.vy * dt;
  },
};
// Verlet rope: pin either end each step. Used for kite strings and tails.
function rope(n, seg, x = 0, y = 0) {
  const p = new Float32Array(n * 2), q = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { p[i * 2] = q[i * 2] = x; p[i * 2 + 1] = q[i * 2 + 1] = y + i * seg; }
  return {
    n, seg, p, q,
    step(dt, o = {}) {
      const g = o.gravity ?? 300, damp = o.damping ?? 0.985, iters = o.iters ?? 12, wind = o.wind;
      const dt2 = dt * dt;
      for (let i = 0; i < n; i++) {
        const ix = i * 2, x = p[ix], y = p[ix + 1];
        let ax = 0, ay = g;
        if (wind) { const w = typeof wind === 'function' ? wind(x, y, i) : wind; ax += w[0]; ay += w[1]; }
        p[ix] = x + (x - q[ix]) * damp + ax * dt2; p[ix + 1] = y + (y - q[ix + 1]) * damp + ay * dt2;
        q[ix] = x; q[ix + 1] = y;
      }
      for (let k = 0; k < iters; k++) {
        if (o.pinA) { p[0] = o.pinA[0]; p[1] = o.pinA[1]; }
        if (o.pinB) { p[n * 2 - 2] = o.pinB[0]; p[n * 2 - 1] = o.pinB[1]; }
        for (let i = 0; i < n - 1; i++) {
          const a = i * 2, b = a + 2, dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], d = Math.hypot(dx, dy) || 1e-6;
          const diff = (d - seg) / d * 0.5;
          const wa = (i === 0 && o.pinA) ? 0 : 1, wb = (i === n - 2 && o.pinB) ? 0 : 1, s = wa + wb || 1;
          p[a] += dx * diff * 2 * wa / s; p[a + 1] += dy * diff * 2 * wa / s;
          p[b] -= dx * diff * 2 * wb / s; p[b + 1] -= dy * diff * 2 * wb / s;
        }
      }
      if (o.pinA) { p[0] = o.pinA[0]; p[1] = o.pinA[1]; }
      if (o.pinB) { p[n * 2 - 2] = o.pinB[0]; p[n * 2 - 1] = o.pinB[1]; }
    },
    pt(i) { return [p[i * 2], p[i * 2 + 1]]; },
    place(x0, y0, x1, y1, sag = 0) { for (let i = 0; i < n; i++) { const t = i / (n - 1), x = lerp(x0, x1, t), y = lerp(y0, y1, t) + sag * 4 * t * (1 - t); p[i * 2] = q[i * 2] = x; p[i * 2 + 1] = q[i * 2 + 1] = y; } },
  };
}
// path(points) — a polyline with arc-length parameterisation for sprites that travel (taxi, fly, sail, drive):
//   p.at(u 0..1) → [x, y, angle]; p.length; p.pts. Works in any space (plate 0..1 coords or screen px).
function path(points, closed = false) {
  const pts = closed ? points.concat([points[0]]) : points.slice(), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = cum[cum.length - 1] || 1;
  return {
    pts, length,
    at(u) {
      u = closed ? ((u % 1) + 1) % 1 : clamp(u, 0, 1);
      const d = u * length; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1, t = (d - cum[i - 1]) / seg;
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), Math.atan2(b[1] - a[1], b[0] - a[0])];
    },
    map(fn) { return path(pts.map(fn), false); },
  };
}
function spring(x = 0, k = 40, damp = 8) { return { x, v: 0, target: x, step(dt) { const a = (this.target - this.x) * k - this.v * damp; this.v += a * dt; this.x += this.v * dt; return this.x; } }; }

// ─── Procedural sprite painters (2D canvas, run once at setup; uploaded once) ─────────────────────
function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
const paint = {
  // A clump of grass blades seen from slightly above (pivot at the bottom-centre).
  grassTuft(size = 128, hue = [74, 112, 52], blades = 26, seed = 1) {
    const r = seeded(seed), cv = canvas(size, size), c = cv.getContext('2d');
    c.translate(size / 2, size * 0.96);
    for (let i = 0; i < blades; i++) {
      const a = (r() - 0.5) * 1.5, len = size * (0.45 + r() * 0.5), w = size * (0.018 + r() * 0.02), bend = (r() - 0.5) * 0.9 + a * 0.5;
      const tx = Math.sin(a) * len, ty = -Math.cos(a) * len, cx = Math.sin(a + bend * 0.5) * len * 0.55, cy = -Math.cos(a) * len * 0.6;
      const sh = 0.7 + r() * 0.5, g = c.createLinearGradient(0, 0, tx, ty);
      const col = (k) => `rgb(${hue.map((v, j) => Math.round(v * sh * k + (j === 1 ? 8 : 0) * (k - 0.6))).join(',')})`;
      g.addColorStop(0, col(0.45)); g.addColorStop(0.5, col(0.95)); g.addColorStop(1, col(1.25));
      c.fillStyle = g; c.beginPath(); c.moveTo(-w, 0);
      c.quadraticCurveTo(cx - w * 0.6, cy, tx, ty); c.quadraticCurveTo(cx + w * 0.6, cy, w, 0); c.closePath(); c.fill();
    }
    return cv;
  },
  // Broad leaves in a loose rosette, seen from above (pivot centre).
  leafRosette(size = 160, hue = [64, 104, 50], leaves = 7, seed = 2, narrow = 0.38) {
    const r = seeded(seed), cv = canvas(size, size), c = cv.getContext('2d');
    c.translate(size / 2, size / 2);
    for (let i = 0; i < leaves; i++) {
      const a = (i / leaves) * TAU + r() * 0.5, len = size * (0.32 + r() * 0.16), w = len * narrow * (0.8 + r() * 0.4), sh = 0.75 + r() * 0.45;
      c.save(); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, `rgb(${hue.map((v) => Math.round(v * sh * 0.55)).join(',')})`);
      g.addColorStop(0.55, `rgb(${hue.map((v) => Math.round(v * sh)).join(',')})`);
      g.addColorStop(1, `rgb(${hue.map((v) => Math.round(v * sh * 1.15)).join(',')})`);
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0);
      c.bezierCurveTo(len * 0.3, -w, len * 0.8, -w * 0.7, len, 0); c.bezierCurveTo(len * 0.8, w * 0.7, len * 0.3, w, 0, 0); c.fill();
      c.strokeStyle = 'rgba(220,240,190,0.22)'; c.lineWidth = Math.max(0.8, size * 0.008);
      c.beginPath(); c.moveTo(len * 0.05, 0); c.lineTo(len * 0.92, 0); c.stroke();
      c.strokeStyle = 'rgba(210,235,180,0.1)';
      for (let v = 0.2; v < 0.85; v += 0.13) { c.beginPath(); c.moveTo(len * v, 0); c.lineTo(len * (v + 0.12), -w * 0.55 * (1 - v * 0.6)); c.moveTo(len * v, 0); c.lineTo(len * (v + 0.12), w * 0.55 * (1 - v * 0.6)); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(len * 0.3, w * 0.2, len * 0.8, w * 0.7 * 0.6, len, 0); c.bezierCurveTo(len * 0.8, w * 0.7, len * 0.3, w, 0, 0); c.fill();
      c.restore();
    }
    return cv;
  },
  // Trifoliate clover / small-leaved ground cover patch.
  clover(size = 96, hue = [70, 112, 56], n = 9, seed = 3) {
    const r = seeded(seed), cv = canvas(size, size), c = cv.getContext('2d');
    c.translate(size / 2, size / 2);
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * size * 0.6, y = (r() - 0.5) * size * 0.6, s = size * (0.08 + r() * 0.05), rot = r() * TAU, sh = 0.75 + r() * 0.5;
      for (let j = 0; j < 3; j++) {
        const a = rot + j * TAU / 3; c.save(); c.translate(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.9); c.rotate(a);
        const g = c.createRadialGradient(-s * 0.3, 0, 0, 0, 0, s * 1.1);
        g.addColorStop(0, `rgb(${hue.map((v) => Math.round(v * sh * 1.2)).join(',')})`); g.addColorStop(1, `rgb(${hue.map((v) => Math.round(v * sh * 0.7)).join(',')})`);
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, s, s * 0.85, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(235,245,220,0.18)'; c.lineWidth = s * 0.12; c.beginPath(); c.arc(-s * 0.1, 0, s * 0.45, -1.2, 1.2); c.stroke();
        c.restore();
      }
    }
    return cv;
  },
  // Soft round disc (pollen, motes) and a petal.
  petal(size = 24, col = [240, 200, 210]) { const cv = canvas(size, size), c = cv.getContext('2d'); c.translate(size / 2, size / 2); const g = c.createLinearGradient(-size / 2, 0, size / 2, 0); g.addColorStop(0, `rgb(${col.map((v) => v * 0.85).join(',')})`); g.addColorStop(1, `rgb(${col.join(',')})`); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, size * 0.42, size * 0.24, 0, 0, TAU); c.fill(); return cv; },
  leaf(size = 32, col = [150, 110, 50]) { const cv = canvas(size, size), c = cv.getContext('2d'); c.translate(size / 2, size / 2); c.fillStyle = `rgb(${col.join(',')})`; c.beginPath(); c.moveTo(-size * 0.45, 0); c.quadraticCurveTo(0, -size * 0.3, size * 0.45, 0); c.quadraticCurveTo(0, size * 0.3, -size * 0.45, 0); c.fill(); c.strokeStyle = 'rgba(60,30,10,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-size * 0.45, 0); c.lineTo(size * 0.4, 0); c.stroke(); return cv; },
};

// ─── GLSL ────────────────────────────────────────────────────────────────────────────────────────
// Fullscreen layers draw into the scene target where texel row 0 = top of the screen, so
// kitPx() = CSS px with y down, matching the batch renderer. Only the final grade flips.
const FULL_VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0,0.0,1.0); }`;
const PRE = `#version 300 es
precision highp float;
uniform vec2 uRes, uView; uniform float uTime;
uniform vec3 uLight, uZenith, uHorizon, uSkyRefl;
uniform float uAmb, uNight, uDay, uGolden, uWet, uSnow, uCloud, uFog, uFlash, uSpec, uCaust;
uniform vec2 uSunDir, uCloudDrift; uniform vec4 uWind; uniform vec4 uShade;
out vec4 o;
vec2 kitPx(){ return gl_FragCoord.xy / uRes * uView; }
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash2(vec2 p){ return vec2(hash(p), hash(p + 19.19)); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm3(vec2 p){ float s=0., a=.5; for(int i=0;i<3;i++){ s+=a*noise(p); p=p*2.03+17.1; a*=.5; } return s/.875; }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p+17.1; a*=.5; } return s/.97; }
float kitWind(vec2 p){ float s = dot(p, uWind.zw);
  return uWind.x*(0.7+0.3*sin(s*0.0045 - uTime*1.1 + 1.7*sin(p.y*0.0021 + uTime*0.37))) + uWind.y*(0.6+0.4*sin(s*0.003 - uTime*2.0)); }
// Drifting cloud shadows on the ground (strongest at partial cover).
float kitCloudShadow(vec2 p){
  float strength = smoothstep(0.32, 0.62, uCloud) * (1.0 - smoothstep(0.85, 1.0, uCloud)) * uDay;
  if (strength < 0.01) return 0.0;
  float n = fbm3(p * 0.0009 + uCloudDrift);
  return smoothstep(0.62 - uCloud * 0.3, 0.8 - uCloud * 0.3, n) * strength * 0.6;
}
// A tree's dappled shade over the widget side (uShade = edge x 0..1, softness, amount, direction ±1) — calms it.
float kitShade(vec2 p){
  if (uShade.z < 0.01) return 0.0;
  float fx = p.x / uView.x + 0.06 * (noise(p * 0.004) - 0.5);
  float m = uShade.w < 0.0 ? smoothstep(uShade.x + uShade.y, uShade.x - uShade.y, fx) : smoothstep(uShade.x - uShade.y, uShade.x + uShade.y, fx);
  float leaves = smoothstep(0.42, 0.62, fbm3(p * 0.012 + vec2(sin(uTime * 0.4), cos(uTime * 0.33)) * 0.08 * uWind.x + uCloudDrift * 0.2));
  return m * uShade.z * (0.75 + 0.25 * leaves) * uDay;
}
vec3 kitSat(vec3 c, float s){ float l = dot(c, vec3(0.299,0.587,0.114)); return mix(vec3(l), c, s); }
// Tileable water caustic (after joltz0r / Dave Hoskins), as in koi.
float kitCaustic(vec2 p, float t){
  p = mod(p, 6.28318) - 250.0; vec2 i = p; float c = 1.0; float inten = .005;
  for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n+1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0/length(vec2(p.x / (sin(i.x+tt)/inten), p.y / (cos(i.y+tt)/inten))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0);
}
`;

// ─── The runtime ────────────────────────────────────────────────────────────────────────────────
function scene(def) {
  const LW = root.LW;
  const k = { def, W: 0, H: 0, DPR: 1, res: 1, t: 0, st: 0, dt: 0, frame: 0, ready: false, assets: {}, stats: { js: 0, jsMax: 0, n: 0 } };
  root.KIT = k;   // dev handle
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block';
  document.body.prepend(cv);
  if (!document.body.style.background) document.body.style.cssText += ';margin:0;height:100vh;overflow:hidden;background:#050807';
  const gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'default' });
  if (!gl) { document.body.style.background = '#223'; console.error('kit: WebGL2 unavailable'); return k; }
  k.gl = gl; k.canvas = cv;
  const floatOK = !!gl.getExtension('EXT_color_buffer_float');
  k.floatOK = floatOK;

  // ── GL helpers ──
  function compile(src, type) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); console.error(log, src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); throw new Error(log); } return s; }
  function link(vs, fs, attribs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(vs, gl.VERTEX_SHADER)); gl.attachShader(p, compile(fs, gl.FRAGMENT_SHADER));
    (attribs || []).forEach((n, i) => gl.bindAttribLocation(p, i, n));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size }; }
    return { p, u };
  }
  // program(fs body) — prepends the shared GLSL prelude unless the source starts with #version.
  k.program = (fs, vs = FULL_VS, attribs) => link(vs, fs.startsWith('#version') ? fs : PRE + fs, attribs);
  function setU(prog, name, v) {
    const u = prog.u[name]; if (!u) return;
    switch (u.type) {
      case gl.FLOAT: u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v); break;
      case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
      case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
      case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
      case gl.INT: case gl.BOOL: gl.uniform1i(u.loc, v); break;
      default: break;
    }
  }
  k.set = setU;
  const texUnits = {};
  k.tex = (prog, name, tex, unit) => { const u = prog.u[name]; if (!u) return; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.loc, unit); };
  function makeTex(w, h, fmt = 'rgba8', filter = gl.LINEAR) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (fmt === 'half') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  // target(w, h, float) → {tex, fbo, w, h}; float uses RGBA16F when the GPU can render to it.
  k.target = (w, h, float) => {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const tex = makeTex(w, h, float && floatOK ? 'half' : 'rgba8'), fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  };
  // Dev: wait for the GPU (1-px readback from a private 1×1 target, so the drawing buffer is never touched).
  let syncRT = null; const syncPx = new Uint8Array(4);
  k.gpuSync = () => { if (!syncRT) syncRT = k.target(1, 1); gl.bindFramebuffer(gl.FRAMEBUFFER, syncRT.fbo); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPx); };
  k.free = (rt) => { if (rt) { gl.deleteTexture(rt.tex); gl.deleteFramebuffer(rt.fbo); } };
  k.bindTarget = (rt) => { gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.fbo : null); gl.viewport(0, 0, rt ? rt.w : cv.width, rt ? rt.h : cv.height); };
  k.bindScene = () => k.bindTarget(k.sceneRT);
  const vao = gl.createVertexArray();
  // Shared uniforms every pass gets for free (if the shader declares them).
  function common(prog, rt) {
    const L = k.L;
    setU(prog, 'uRes', [rt ? rt.w : cv.width, rt ? rt.h : cv.height]); setU(prog, 'uView', [k.W, k.H]); setU(prog, 'uTime', k.st);
    setU(prog, 'uLight', L.light); setU(prog, 'uZenith', L.zenith); setU(prog, 'uHorizon', L.horizon); setU(prog, 'uSkyRefl', L.sky);
    setU(prog, 'uAmb', L.amb); setU(prog, 'uNight', L.night); setU(prog, 'uDay', L.day); setU(prog, 'uGolden', L.golden);
    setU(prog, 'uWet', L.wet); setU(prog, 'uSnow', L.snow); setU(prog, 'uCloud', L.cloud); setU(prog, 'uFog', L.fog); setU(prog, 'uFlash', L.flash);
    setU(prog, 'uSpec', L.spec); setU(prog, 'uCaust', L.caust);
    setU(prog, 'uSunDir', L.sunDir); setU(prog, 'uShade', shadeVec()); setU(prog, 'uCloudDrift', k.wind.drift); setU(prog, 'uWind', [k.wind.base, k.wind.gust, k.wind.dir[0], k.wind.dir[1]]);
  }
  k.common = common;
  // pass(prog, {uniforms…, textures as {tex}}, target, blend) — one fullscreen triangle.
  k.pass = (prog, uni = {}, rt = k.sceneRT, blend = false) => {
    k.bindTarget(rt); gl.useProgram(prog.p); gl.bindVertexArray(vao); common(prog, rt);
    let unit = 0;
    for (const name in uni) { const v = uni[name]; if (v && v.tex !== undefined) k.tex(prog, name, v.tex, unit++); else if (v && v.texture) k.tex(prog, name, v.texture, unit++); else setU(prog, name, v); }
    if (blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (blend) gl.disable(gl.BLEND);
  };

  // ── Atlas sheets (uploaded once, mipmapped; premultiplied) ──
  // sheet(source, frames) — source: an Image/canvas (+ frames {name:[x,y,w,h]}) or an object {name: canvas|image} to pack.
  k.sheet = (src, frames) => {
    let img = src, fr = frames;
    if (!(src instanceof HTMLImageElement || src instanceof HTMLCanvasElement || (root.ImageBitmap && src instanceof ImageBitmap))) {
      const PAD = 10, AW = 2048; let x = 0, y = 0, rowH = 0; fr = {};
      for (const name in src) { const s = src[name]; if (x + s.width + PAD * 2 > AW) { x = 0; y += rowH + PAD * 2; rowH = 0; } fr[name] = [x + PAD, y + PAD, s.width, s.height]; x += s.width + PAD * 2; rowH = Math.max(rowH, s.height); }
      img = canvas(AW, Math.max(4, y + rowH + PAD * 2)); const c = img.getContext('2d');
      for (const name in src) c.drawImage(src[name], fr[name][0], fr[name][1]);
    }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const W = img.width, H = img.height, f = {};
    for (const name in fr) { const [x, y, w, h] = fr[name]; f[name] = { uv: [x / W, y / H, (x + w) / W, (y + h) / H], w, h, aspect: h / w }; }
    return { tex: t, f, w: W, h: H };
  };

  // image(img, repeat) → a mipmapped texture (e.g. a tiling ground photo), uploaded once.
  k.image = (img, repeat = true) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return { tex: t, w: img.width, h: img.height };
  };

  // ── 2D batch renderer: CSS px in, premultiplied colour out ──
  // modes: 0 textured · 1 flat · 2 AA ribbon (v −1..1) · 3 glow disc · 4 soft shadow (atlas alpha, mip-blurred) · 5 ring
  const BATCH_VS = `#version 300 es
  in vec2 aPos; in vec2 aUV; in vec4 aCol; in vec4 aP;
  uniform vec2 uView; out vec2 vUV; out vec4 vCol; out vec4 vP;
  void main(){ vUV = aUV; vCol = aCol; vP = aP; gl_Position = vec4(aPos / uView * 2.0 - 1.0, 0.0, 1.0); }`;
  const BATCH_FS = `#version 300 es
  precision highp float;
  uniform sampler2D uAtlas; in vec2 vUV; in vec4 vCol; in vec4 vP; out vec4 o;
  void main(){
    int m = int(vP.x + 0.5);
    if (m == 0) { o = texture(uAtlas, vUV, vP.y) * vCol; return; }
    if (m == 1) { o = vCol; return; }
    if (m == 2) { float av = abs(vUV.y), fw = fwidth(vUV.y) * 1.2 + 1e-4; float a = vP.y > 0.0 ? exp(-av*av*3.0) * (1.0 - smoothstep(0.85, 1.0, av)) : 1.0 - smoothstep(1.0 - fw, 1.0, av); o = vCol * a; return; }
    if (m == 3) { float r2 = dot(vUV, vUV); float a = exp(-r2 * vP.y) * (1.0 - smoothstep(0.8, 1.0, r2)); o = vCol * a; return; }
    if (m == 4) { float a = texture(uAtlas, vUV, vP.y).a; o = vCol * a; return; }
    if (m == 5) { float r = length(vUV); float a = exp(-pow((r - 0.82) / max(vP.y, 0.02), 2.0)) * (1.0 - smoothstep(0.96, 1.0, r)); o = vCol * a; return; }
    o = vCol;
  }`;
  const batchP = link(BATCH_VS, BATCH_FS, ['aPos', 'aUV', 'aCol', 'aP']);
  const STRIDE = 12;
  let vb = new Float32Array(STRIDE * 24000), vn = 0, curSheet = null;
  const bvao = gl.createVertexArray(), bbuf = gl.createBuffer();
  gl.bindVertexArray(bvao); gl.bindBuffer(gl.ARRAY_BUFFER, bbuf);
  [[0, 2, 0], [1, 2, 2], [2, 4, 4], [3, 4, 8]].forEach(([loc, n, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, STRIDE * 4, off * 4); });
  gl.bindVertexArray(null);
  function vtx(x, y, u, v, r, g, b, a, m, p1 = 0, p2 = 0, p3 = 0) {
    if (vn + STRIDE > vb.length) { const nb = new Float32Array(vb.length * 2); nb.set(vb); vb = nb; }
    vb[vn++] = x; vb[vn++] = y; vb[vn++] = u; vb[vn++] = v; vb[vn++] = r; vb[vn++] = g; vb[vn++] = b; vb[vn++] = a; vb[vn++] = m; vb[vn++] = p1; vb[vn++] = p2; vb[vn++] = p3;
  }
  const Q = [[0, 0], [0, 0], [0, 0], [0, 0]];
  function quadV(P, uv, r, g, b, a, m, p1) { // P: 4 corners TL TR BR BL; uv: [u0,v0,u1,v1] mapped to those corners
    const U = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
    for (const i of [0, 1, 2, 0, 2, 3]) vtx(P[i][0], P[i][1], U[i][0], U[i][1], r * a, g * a, b * a, a, m, p1);
  }
  function corners(x, y, w, h, rot, ax, ay) {
    const c = Math.cos(rot), s = Math.sin(rot), x0 = -w * ax, y0 = -h * ay, x1 = x0 + w, y1 = y0 + h;
    const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    for (let i = 0; i < 4; i++) { Q[i][0] = x + pts[i][0] * c - pts[i][1] * s; Q[i][1] = y + pts[i][0] * s + pts[i][1] * c; }
    return Q;
  }
  const UNIT = [-1, -1, 1, 1];
  const batch = k.batch = {
    use(sheet) { if (sheet && sheet !== curSheet) { batch.flush(); curSheet = sheet; } return batch; },
    flush() {
      if (!vn) return;
      gl.useProgram(batchP.p); setU(batchP, 'uView', [k.W, k.H]);
      if (curSheet) k.tex(batchP, 'uAtlas', curSheet.tex, 0);
      gl.bindVertexArray(bvao); gl.bindBuffer(gl.ARRAY_BUFFER, bbuf);
      gl.bufferData(gl.ARRAY_BUFFER, vb.subarray(0, vn), gl.STREAM_DRAW);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, vn / STRIDE);
      gl.disable(gl.BLEND); gl.bindVertexArray(null); vn = 0;
    },
    // sprite(frame, x, y, w, h, rot, rgb, alpha, ax, ay, blur) — rgb is a tint (use k.L.tint for lit sprites)
    sprite(f, x, y, w, h, rot = 0, col = k.L.tint, a = 1, ax = 0.5, ay = 0.5, blur = 0) { quadV(corners(x, y, w, h, rot, ax, ay), f.uv, col[0], col[1], col[2], a, 0, blur); },
    // A soft cast shadow of the sprite's silhouette (mip-blurred), multiply-ish via premultiplied black.
    shadow(f, x, y, w, h, rot = 0, a = 0.35, blur = 2, ax = 0.5, ay = 0.5) { quadV(corners(x, y, w, h, rot, ax, ay), f.uv, 0.02, 0.03, 0.04, a, 4, blur); },
    // Arbitrary quad (e.g. a wing hinged at the body): P = 4 corners TL TR BR BL.
    quad4(f, P, col = k.L.tint, a = 1, mode = 0, blur = 0) { quadV(P, f ? f.uv : [0, 0, 1, 1], col[0], col[1], col[2], a, mode, blur); },
    tri(x0, y0, x1, y1, x2, y2, col, a = 1, c1, c2) {
      const C = [col, c1 || col, c2 || col]; const P = [[x0, y0], [x1, y1], [x2, y2]];
      for (let i = 0; i < 3; i++) vtx(P[i][0], P[i][1], 0, 0, C[i][0] * a, C[i][1] * a, C[i][2] * a, a, 1);
    },
    rect(x, y, w, h, col, a = 1) { quadV(corners(x, y, w, h, 0, 0, 0), UNIT, col[0], col[1], col[2], a, 1, 0); },
    // line with anti-aliased edges; soft=1 gives a gaussian cross-section (glowing filaments, streaks)
    line(x0, y0, x1, y1, w, col, a = 1, soft = 0, a1) {
      const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d * (w * 0.5 + 0.75), ny = dx / d * (w * 0.5 + 0.75);
      const A = [[x0 + nx, y0 + ny, -1, a], [x1 + nx, y1 + ny, -1, a1 ?? a], [x1 - nx, y1 - ny, 1, a1 ?? a], [x0 - nx, y0 - ny, 1, a]];
      for (const i of [0, 1, 2, 0, 2, 3]) { const p = A[i]; vtx(p[0], p[1], 0, p[2], col[0] * p[3], col[1] * p[3], col[2] * p[3], p[3], 2, soft); }
    },
    // strip(pts flat [x0,y0,x1,y1,…], width(i,t), color(i,t) → [r,g,b,a]) — tapered ribbons (strings, tails, wings)
    strip(pts, width, color, soft = 0) {
      const n = pts.length / 2; let px = 0, py = 0;
      for (let i = 0; i < n - 1; i++) {
        const segs = [i, i + 1], E = [];
        for (const j of segs) {
          const ja = Math.max(0, j - 1), jb = Math.min(n - 1, j + 1);
          let tx = pts[jb * 2] - pts[ja * 2], ty = pts[jb * 2 + 1] - pts[ja * 2 + 1]; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
          const t = j / (n - 1), w = width(j, t) * 0.5 + 0.6, c = color(j, t);
          E.push([pts[j * 2] - ty * w, pts[j * 2 + 1] + tx * w, pts[j * 2] + ty * w, pts[j * 2 + 1] - tx * w, c]);
        }
        const [a, b] = E, ca = a[4], cb = b[4];
        const V = [[a[0], a[1], -1, ca], [b[0], b[1], -1, cb], [b[2], b[3], 1, cb], [a[2], a[3], 1, ca]];
        for (const q of [0, 1, 2, 0, 2, 3]) { const p = V[q], c = p[3]; vtx(p[0], p[1], 0, p[2], c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3], 2, soft); }
      }
    },
    // glow(x, y, radius, rgb, alpha, additive=1, hardness=3)
    glow(x, y, r, col, a = 1, add = 1, hard = 3) { const P = corners(x, y, r * 2, r * 2, 0, 0.5, 0.5); const al = a * (1 - add); for (const i of [0, 1, 2, 0, 2, 3]) vtx(P[i][0], P[i][1], [-1, 1, 1, -1][i], [-1, -1, 1, 1][i], col[0] * a, col[1] * a, col[2] * a, al, 3, hard); },
    ring(x, y, r, col, a = 1, width = 0.08, add = 0) { const P = corners(x, y, r * 2, r * 2, 0, 0.5, 0.5); const al = a * (1 - add); for (const i of [0, 1, 2, 0, 2, 3]) vtx(P[i][0], P[i][1], [-1, 1, 1, -1][i], [-1, -1, 1, 1][i], col[0] * a, col[1] * a, col[2] * a, al, 5, width); },
  };

  // ── Instanced static sprite field (plants etc.): one VBO, sway + cursor push on the GPU ──
  // list: [{f, x, y, w, h, rot, pivot (0.5 centre | ~0.95 base), height (px above ground → shadow offset), sway, phase, tint:[r,g,b], a, bloom, blur (mip bias)}]
  const FIELD_VS = `#version 300 es
  layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aXYWH; layout(location=2) in vec4 aUV;
  layout(location=3) in vec4 aTint; layout(location=4) in vec4 aP; layout(location=5) in vec4 aQ;
  uniform vec2 uView; uniform float uTime; uniform vec4 uWind; uniform vec2 uSunDir; uniform vec4 uCursor; uniform float uBloom, uShadow, uDof;
  out vec2 vUV; out vec4 vTint; out vec2 vWorld; out float vBias;
  float kitWind(vec2 p){ float s = dot(p, uWind.zw);
    return uWind.x*(0.7+0.3*sin(s*0.0045 - uTime*1.1 + 1.7*sin(p.y*0.0021 + uTime*0.37))) + uWind.y*(0.6+0.4*sin(s*0.003 - uTime*2.0)); }
  void main(){
    float rot = aP.x, sway = aP.y, phase = aP.z, bloom = aP.w, pivot = aQ.x, height = aQ.y;
    vec2 size = aXYWH.zw * (1.0 + uBloom * bloom);
    vec2 local = (aCorner - vec2(0.5, pivot)) * size;
    float c = cos(rot), s = sin(rot);
    vec2 p = aXYWH.xy + vec2(local.x*c - local.y*s, local.x*s + local.y*c);
    float lever = pivot > 0.7 ? clamp((pivot - aCorner.y) / pivot, 0.0, 1.0) : 1.0;
    float w = kitWind(aXYWH.xy);
    vec2 disp = uWind.zw * (w * (0.75 + 0.25*sin(uTime*1.7 + phase)) + 0.18*w*sin(uTime*3.1 + phase*2.3)) * sway * lever;
    vec2 d = aXYWH.xy - uCursor.xy; float dl = length(d);
    if (dl < uCursor.z && dl > 0.0) disp += d / dl * pow(1.0 - dl / uCursor.z, 2.0) * uCursor.w * sway * lever;
    p += disp;
    if (uShadow > 0.0) p += uSunDir * height * (0.6 + 0.4*lever);
    vUV = vec2(mix(aUV.x, aUV.z, aCorner.x), mix(aUV.y, aUV.w, aCorner.y));
    vTint = aTint; vWorld = p;
    vBias = uDof * smoothstep(0.42, 0.0, aXYWH.y / uView.y) * 2.2 + uShadow * (1.0 + height * 0.04) + aQ.z;
    gl_Position = vec4(p / uView * 2.0 - 1.0, 0.0, 1.0);
  }`;
  const FIELD_FS = PRE.replace('out vec4 o;', '') + `
  uniform sampler2D uAtlas; uniform float uShadow, uShadowA; uniform vec3 uTint;
  in vec2 vUV; in vec4 vTint; in vec2 vWorld; in float vBias; out vec4 o;
  void main(){
    vec4 t = texture(uAtlas, vUV, vBias);
    if (uShadow > 0.0) { o = vec4(0.0, 0.006, 0.01, 1.0) * t.a * uShadowA * vTint.a; return; }
    float cs = max(kitCloudShadow(vWorld), kitShade(vWorld));
    vec3 c = t.rgb * vTint.rgb * uTint * (1.0 - cs * 0.85);
    c = mix(c, c * vec3(0.72, 0.8, 0.82), uWet * 0.5);                                       // wet foliage darkens…
    c += uWet * (uZenith * 0.5 + 0.03) * t.a * smoothstep(0.3, 0.75, dot(t.rgb, vec3(0.3, 0.6, 0.1)));   // …and glosses
    // snow settles on the lit, up-facing parts first (bright texels), in drifts, thickening with uSnow
    float sl = dot(t.rgb, vec3(0.3, 0.6, 0.1)) / max(t.a, 1e-3), sn = noise(vWorld * 0.05) * 0.5 + noise(vWorld * 0.17) * 0.5;
    float snowM = smoothstep(1.05 - uSnow * 1.1, 1.25 - uSnow * 1.1, sl * 0.9 + sn * 0.55 + uSnow * 0.3);
    c = mix(c, vec3(0.88, 0.91, 0.96) * t.a * (uLight * uAmb * 0.9 + uZenith * 0.25 + 0.05) * (0.72 + 0.5 * clamp(sl, 0.0, 1.0)), snowM * min(1.0, uSnow * 2.5) * 0.95);
    o = vec4(c, t.a) * vTint.a;
  }`;
  const fieldP = link(FIELD_VS, FIELD_FS);
  const quadCorner = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadCorner); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
  k.field = (sheet, list) => {
    const F = 20, data = new Float32Array(list.length * F);
    list.forEach((it, i) => {
      const o = i * F, uv = it.f.uv, tint = it.tint || [1, 1, 1];
      data.set([it.x, it.y, it.w, it.h, uv[0], uv[1], uv[2], uv[3], tint[0], tint[1], tint[2], it.a ?? 1, it.rot || 0, it.sway ?? 1, it.phase ?? Math.random() * TAU, it.bloom || 0, it.pivot ?? 0.5, it.height || 0, it.blur || 0, 0], o);
    });
    const vao2 = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao2);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadCorner); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    [[1, 0], [2, 4], [3, 8], [4, 12], [5, 16]].forEach(([loc, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, F * 4, off * 4); gl.vertexAttribDivisor(loc, 1); });
    gl.bindVertexArray(null);
    return {
      list, n: list.length,
      draw(o = {}) {
        batch.flush();
        gl.useProgram(fieldP.p); common(fieldP, k.sceneRT); k.tex(fieldP, 'uAtlas', sheet.tex, 0);
        const c = k.cursor, push = o.push ?? 0;
        setU(fieldP, 'uCursor', [c.inside ? c.x : -1e5, c.inside ? c.y : -1e5, o.pushR ?? 90, push]);
        setU(fieldP, 'uBloom', o.bloom ?? 0); setU(fieldP, 'uDof', o.dof ?? 0); setU(fieldP, 'uTint', o.tint || k.L.tint);
        gl.bindVertexArray(vao2); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        if (o.shadow) { setU(fieldP, 'uShadow', 1); setU(fieldP, 'uShadowA', o.shadow); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, list.length); }
        setU(fieldP, 'uShadow', 0); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, list.length);
        gl.disable(gl.BLEND); gl.bindVertexArray(null);
      },
      // JS twin of the vertex shader's sway: where a sprite's top (lever 1) currently is.
      sway(it) {
        const w = k.wind.at(it.x, it.y), t = k.st, d = k.wind.dir, sw = it.sway ?? 1, ph = it.phase || 0;
        const m = (w * (0.75 + 0.25 * Math.sin(t * 1.7 + ph)) + 0.18 * w * Math.sin(t * 3.1 + ph * 2.3)) * sw;
        return [it.x + d[0] * m, it.y + d[1] * m];
      },
      free() { gl.deleteBuffer(buf); gl.deleteVertexArray(vao2); },
    };
  };

  // ── Services ──
  k.L = Object.assign(palette(LW.env), { flash: 0, sky: [0.5, 0.6, 0.7], tint: [1, 1, 1] });
  k.wind = {
    base: 0.4, gust: 0, puffs: 0, dir: [0.94, 0.34], drift: [0, 0], strength: 46,
    at(x, y) { const s = x * this.dir[0] + y * this.dir[1], t = k.st;
      return this.base * (0.7 + 0.3 * Math.sin(s * 0.0045 - t * 1.1 + 1.7 * Math.sin(y * 0.0021 + t * 0.37))) + this.gust * (0.6 + 0.4 * Math.sin(s * 0.003 - t * 2.0)); },
    puff(s = 1) { this.puffs = Math.min(2.5, this.puffs + s); },
  };
  k.cursor = { x: -1e4, y: -1e4, vx: 0, vy: 0, speed: 0, inside: false, still: 99, down: false, lastT: 0 };
  k.breath = { on: false, fade: 0, level: 0, phase: 'rest', k: 0, still: 0, st: null, t0: realNow() / 1000, lead(sec) { return LW.breathState(breathClock() + sec); } };
  k.music = { level: 0, beat: 0 };
  k.lastInput = 0;
  // ── Layout (host/Layout.swift → LW.layout): which side holds the user's widgets/icons, and the clear band for
  //    hero content. Author scenes for widgets-on-the-right and wrap x with k.mx(x): it mirrors when they're left.
  function readLayout() {
    const Lo = LW.layout || {}, side = Lo.side || 'right';
    const clear = Lo.clear || (side === 'left' ? [1 - CALM_X, 1] : side === 'off' ? [0, 1] : [0, CALM_X]);
    k.layout = { side, mirror: side === 'left', clear, avoid: Lo.avoid || [],
      clearPx: [clear[0] * k.W, clear[1] * k.W], avoidPx: (Lo.avoid || []).map(([x, y, w, h]) => [x * k.W, y * k.H, w * k.W, h * k.H]) };
    k.wind.dir = [k.layout.mirror ? -0.94 : 0.94, 0.34];
  }
  k.mx = (x) => (k.layout.mirror ? k.W - x : x);
  k.mfx = (f) => (k.layout.mirror ? 1 - f : f);                          // same for a 0..1 fraction
  k.clearX = (f) => lerp(k.layout.clearPx[0], k.layout.clearPx[1], f);    // a point across the clear band
  // Can something rest here for a while? Inside the clear band and outside every avoid box (icons, widgets).
  k.restOK = (x, y, pad = 24) => x > k.layout.clearPx[0] + pad && x < k.layout.clearPx[1] - pad &&
    !k.layout.avoidPx.some(([bx, by, bw, bh]) => x > bx - pad && x < bx + bw + pad && y > by - pad && y < by + bh + pad);
  // k.shade = 'auto' → a dappled shade over the widget side (or [x0, soft, amount, dir] by hand)
  function shadeVec() {
    const sh = k.shade;
    if (!sh) return [0, 0, 0, 0];
    if (Array.isArray(sh)) return sh;
    const amt = typeof sh === 'number' ? sh : 0.5, Lo = k.layout;
    if (Lo.side === 'off') return [0, 0, 0, 0];
    return Lo.mirror ? [Lo.clear[0] - 0.05, 0.13, amt, -1] : [Lo.clear[1] + 0.05, 0.13, amt, 1];
  }
  LW.on('layout', () => { readLayout(); if (k.ready) resize(); });
  // ── World-aware weather ── precipitation only where the sky can reach (k.exposedAt), splashes only on exposed
  //    ground (k.surfaceAt → 'ground' | 'water' | null), and wet/snow that build up and dry/melt over minutes.
  //    Defaults: everything exposed, everything ground. Override with def.exposedAt / def.surfaceAt, or a plate's masks.
  k.exposedAt = (x, y) => (def.exposedAt ? def.exposedAt(x, y, k) : k.plateLayer ? k.plateLayer.maskAt('exposed', x, y, 1) > 0.5 : true);
  k.surfaceAt = (x, y) => {
    if (def.surfaceAt) return def.surfaceAt(x, y, k);
    const P = k.plateLayer; if (!P) return 'ground';
    if (P.maskAt('sky', x, y, 0) > 0.5) return null;
    return P.maskAt('water', x, y, 0) > 0.5 ? 'water' : 'ground';
  };
  k.wetAcc = 0; k.snowAcc = 0;
  function stepWeather(dt) {
    const w = LW.env.weather, it = LW.env.intensity ?? 0.7, rain = w === 'rain' || w === 'storm', snow = w === 'snow';
    k.wetAcc = clamp(k.wetAcc + dt * (rain ? (0.4 + it) / 30 : w === 'fog' ? (0.3 - k.wetAcc) / 200 : -1 / 360), 0, 1);   // soaks in ~30 s, dries over ~6 min
    k.snowAcc = clamp(k.snowAcc + dt * (snow ? (0.3 + it) / 240 : -((LW.env.temp ?? 5) > 1 ? 1 / 420 : 1 / 1800)), 0, 1);   // settles over ~4 min, melts slowly
  }
  function breathClock() { const bt = LW.breathTime ? LW.breathTime() : 0; return bt > 0 ? bt : performance.now() / 1000 - k.breath.t0; }
  if (def.breathe) LW.breathDiegetic = true;
  LW.on('calm', (on) => { if (on) k.breath.t0 = performance.now() / 1000; k.lastInput = k.t; });
  LW.on('beat', (s) => { k.music.beat = Math.max(k.music.beat, s); });

  // ── Input ──
  LW.on('move', (x, y) => {
    const c = k.cursor, now = performance.now() / 1000, dt = Math.max(0.008, now - (c.lastT || now - 0.016));
    if (c.inside && c.lastT) { c.vx = lerp(c.vx, (x - c.x) / dt, 0.35); c.vy = lerp(c.vy, (y - c.y) / dt, 0.35); }
    c.x = x; c.y = y; c.lastT = now; c.inside = true; c.still = 0; c.speed = Math.hypot(c.vx, c.vy); k.lastInput = k.t;
    def.onMove && def.onMove(x, y, k);
  });
  LW.on('leave', () => { k.cursor.inside = false; });
  LW.on('down', (x, y) => { k.cursor.down = true; k.cursor.x = x; k.cursor.y = y; k.cursor.inside = true; k.lastInput = k.t; def.onDown && def.onDown(x, y, k); });
  LW.on('up', (x, y) => { k.cursor.down = false; def.onUp && def.onUp(x, y, k); });
  LW.on('drag', (x, y) => { def.onDrag && def.onDrag(x, y, k); });
  LW.on('action', (a) => { const fn = def.onAction && def.onAction[a]; if (fn) fn(k); });
  LW.on('reminder', (r) => { k.lastInput = k.t; if (def.onReminder) def.onReminder(r, k); else showReminder(r); });

  // ── Sound ──
  k.sound = makeSound(k, def);

  // ── Ripples (shared heightfield; created on first use) ──
  let ripples = null;
  Object.defineProperty(k, 'ripples', { get() { if (!ripples && floatOK) ripples = makeRipples(k, link, vao); return ripples; } });

  // ── Reminder tag (text rendered to a canvas once, uploaded once) ──
  let rem = null;
  function showReminder(r) {
    const fs = Math.round(clamp(Math.min(k.W, k.H) * 0.028, 18, 40)), c = canvas(1, 1).getContext('2d');
    const font = `italic 300 ${fs * 2}px ui-serif, "New York", Georgia, serif`; c.font = font;
    const w = Math.ceil(c.measureText(r.text).width + fs * 3), h = fs * 4, cv2 = canvas(w, h), g = cv2.getContext('2d');
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = fs * 0.8;
    g.fillStyle = '#f4eee2'; g.fillText(r.text, w / 2, h / 2);
    if (rem) gl.deleteTexture(rem.sheet.tex);
    rem = { sheet: k.sheet({ t: cv2 }), w: w / 2, h: h / 2, t: 0, x: k.W * 0.36, y: k.H * 0.8 };
    k.sound.chime();
  }
  k.showReminder = showReminder;
  function drawReminder(dt) {
    if (!rem) return;
    rem.t += dt; if (rem.t > 15) { gl.deleteTexture(rem.sheet.tex); rem = null; return; }
    const a = smooth(0.4, 2.2, rem.t) * smooth(14.5, 11.5, rem.t);
    batch.use(rem.sheet).sprite(rem.sheet.f.t, rem.x + Math.sin(k.t * 1.1) * 1.5, rem.y, rem.w, rem.h, 0, [1, 1, 1], a * 0.92);
    batch.flush();
  }

  // ── Layers ──
  const layers = (def.layers || []).filter(Boolean);
  if (!layers.some((l) => l.kind === 'light')) layers.push(Kit.light());
  if (def.life && !layers.some((l) => l.kind === 'life')) { const i = layers.findIndex((l) => l.kind === 'particles' || l.kind === 'light'); layers.splice(i, 0, Kit.life()); }
  k.layers = layers;
  k.layer = (kind) => layers.find((l) => l.kind === kind || l.name === kind);

  // ── Resize ──
  function resize() {
    k.W = innerWidth; k.H = innerHeight; k.DPR = Math.min(devicePixelRatio || 1, 2); readLayout();
    k.res = Math.min(k.DPR, Math.sqrt((def.maxPixels || 1.7e6) / (k.W * k.H)));   // soft scenes: ~1× is plenty (M1 + Low Power Mode)
    cv.width = Math.round(k.W * k.res); cv.height = Math.round(k.H * k.res);
    k.free(k.sceneRT); k.sceneRT = k.target(cv.width, cv.height, true);
    if (ripples) ripples.resize();
    for (const l of layers) l.resize && l.resize(k);
    def.resize && def.resize(k);
  }
  addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(() => { if (k.ready) resize(); }, 150); });

  // ── Lighting easing (crossfades over ~20–40 s, faster right after a view change) ──
  function stepLight(dt, snap) {
    const t = palette(LW.env), a = snap ? 1 : (LW.envBlend ? LW.envBlend(dt, 9) : 1 - Math.exp(-dt / 9)), L = k.L;
    for (const key in t) { const v = t[key]; if (Array.isArray(v)) L[key] = L[key] && !snap ? L[key].map((x, i) => lerp(x, v[i], a)) : v.slice(); else L[key] = snap || L[key] === undefined ? v : lerp(L[key], v, a); }
    L.flash *= Math.exp(-dt * 7);
    if (snap) { const w = LW.env.weather; k.wetAcc = w === 'rain' || w === 'storm' ? 1 : 0; k.snowAcc = w === 'snow' ? 0.65 : 0; }
    L.wet = k.wetAcc; L.snow = k.snowAcc; L.snowing = LW.env.weather === 'snow' ? 1 : 0;
    L.sky = mix3(L.zenith, L.horizon, 0.45);
    // sprite tint: what a matte object receives (sun × ambient + a little sky fill)
    L.tint = [0, 1, 2].map((i) => L.light[i] * L.amb * 0.92 + L.zenith[i] * 0.18 + 0.02);
  }

  k.snapLight = () => stepLight(0, true);   // dev/tests: jump straight to the current env's light

  // ── Main loop ──
  let prev = 0, nextFlash = 12;
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now() / 1000, dt = Math.min(0.1, prev ? now - prev : 1 / 30); prev = now;
    const r0 = realNow();
    k.t += dt; k.st = k.t % 3600; k.dt = dt; k.frame++;
    stepWeather(dt); stepLight(dt, k.frame === 1);
    // wind: weather base + gust noise + puffs (breath, actions, music)
    const W = k.wind, L = k.L;
    W.puffs *= Math.exp(-dt * 0.9);
    W.base = ease(W.base, L.wind, 0.5, dt);
    W.gust = clamp(Math.max(0, noise1(k.t * 0.07 + 3) * 0.9 - 0.15) * L.wind + W.puffs * 0.6 + k.music.level * 0.12 * (def.music ? 0 : 1), 0, 2.5);
    W.drift[0] += W.dir[0] * dt * (0.006 + W.base * 0.01); W.drift[1] += W.dir[1] * dt * (0.006 + W.base * 0.01);
    // breath
    const B = k.breath; B.on = LW.calm; B.fade = ease(B.fade, LW.calm ? 1 : 0, 0.8, dt);
    if (B.fade > 0.001) { const st = LW.breathState(breathClock()); B.st = st; B.level = st.level; B.phase = st.phase; B.k = st.k; B.still = ease(B.still, st.phase === 'hold' || st.phase === 'rest' ? 1 : 0, 1.6, dt); }
    else { B.st = null; B.still = 0; }
    if (B.fade > 0.001 && def.breathe) def.breathe(B.level, B.phase, k);
    // music
    const M = k.music; M.level = ease(M.level, LW.music ? LW.music.level || 0 : 0, 3, dt); M.beat *= Math.exp(-dt * 5);
    if (def.music && (M.level > 0.005 || M.beat > 0.005)) def.music(M, k);
    else if (!def.music && M.beat > 0.2) W.puffs = Math.min(2.5, W.puffs + M.beat * dt * 0.6);
    // cursor
    const C = k.cursor; C.still += dt; if (C.still > 0.12) { C.vx *= Math.exp(-dt * 8); C.vy *= Math.exp(-dt * 8); C.speed = Math.hypot(C.vx, C.vy); }
    // storms
    if (LW.env.weather === 'storm') { nextFlash -= dt; if (nextFlash <= 0) { L.flash = rand(0.6, 1.2); nextFlash = rand(8, 24); k.sound.thunder(); } }
    // update
    def.update && def.update(dt, k.t, k);
    for (const it of def.life || []) it.update && it.update(dt, k.t, k);
    for (const l of layers) l.update && l.update(dt, k.t, k);
    if (ripples) ripples.step();
    // draw
    k.bindScene(); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const prof = k.profile, sync = prof && k.gpuSync;
    if (prof) { if (ripples) sync(); }
    for (const l of layers) {
      const p0 = prof ? (sync(), realNow()) : 0;
      if (l.kind === 'light') { k.bindScene(); drawReminder(dt); def.draw && (def.draw(batch, k, k.t), batch.flush()); }
      if (l.kind !== 'light' && l.kind !== 'sky' && l.kind !== 'water' && l.kind !== 'waves') k.bindScene();
      l.draw && l.draw(k, k.t);
      batch.flush();
      if (prof) { sync(); const key = l.name || l.kind; prof.ms[key] = (prof.ms[key] || 0) + realNow() - p0; }
    }
    if (prof) prof.n++;
    const ms = realNow() - r0, S = k.stats;
    S.js = S.n ? lerp(S.js, ms, 0.05) : ms; S.jsMax = Math.max(S.jsMax * 0.999, ms); S.n++; S.last = ms;
  }

  // ── Boot: load assets, then setup ──
  // assets: def.assets plus any layer's own (layer.assets, e.g. a plate's layout files); *.json is fetched as data
  const loadOne = ([name, url]) => /\.json$/i.test(url) ? fetch(url).then((r) => r.json()).then((j) => [name, j]).catch(() => { console.warn('kit: missing asset', url); return [name, null]; })
    : new Promise((res) => { const im = new Image(); im.onload = () => res([name, im]); im.onerror = () => { console.warn('kit: missing asset', url); res([name, null]); }; im.src = url; });
  (async () => { for (const l of layers) if (l.preload) Object.assign(l.assets || (l.assets = {}), await l.preload()); })()
    .then(() => Promise.all(Object.entries(Object.assign({}, ...layers.map((l) => l.assets || {}), def.assets || {})).map(loadOne)))
    .then((loaded) => {
      for (const [n, im] of loaded) k.assets[n] = im;
      k.W = innerWidth; k.H = innerHeight; readLayout();
      stepLight(0, true);
      def.setup && def.setup(k);
      for (const l of layers) l.init && l.init(k);
      resize();
      k.ready = true;
      ambience(k, def);
      requestAnimationFrame(frame);
    }).catch((e) => console.error(e));

  // Dev HUD (browser only).
  if (!LW.isHost) {
    const hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:14px;bottom:12px;font:12px ui-monospace,Menlo,monospace;color:#e8efe6;opacity:0;transition:opacity .6s;pointer-events:none;text-shadow:0 1px 2px #000a;z-index:5';
    document.body.append(hud);
    const show = () => { hud.textContent = `${LW.env.weather} · ${(LW.env.clockHour ?? LW.env.hour).toFixed(1)}h${LW.calm ? ' · calm' : ''}${LW.muted ? ' · muted' : ''} · ${k.stats.js.toFixed(2)}ms   [w t r b m]`; hud.style.opacity = 0.8; clearTimeout(show.t); show.t = setTimeout(() => (hud.style.opacity = 0), 2500); };
    LW.on('env', show); LW.on('calm', show); LW.on('mute', show);
  }
  return k;
}

// ─── Ripple sim (koi's wave equation at 1/3 res) ─────────────────────────────────────────────────
function makeRipples(k, link, vao) {
  const gl = k.gl, DIV = 3;
  const SIM = `#version 300 es
  precision highp float;
  uniform sampler2D uPrev; uniform vec2 uSize; uniform vec4 uDrops[16]; uniform int uN; uniform float uDamp; out vec4 o;
  void main(){
    vec2 uv = gl_FragCoord.xy / uSize, tx = 1.0/uSize; vec4 c = texture(uPrev, uv);
    float n = texture(uPrev, uv+vec2(tx.x,0)).r + texture(uPrev, uv-vec2(tx.x,0)).r + texture(uPrev, uv+vec2(0,tx.y)).r + texture(uPrev, uv-vec2(0,tx.y)).r;
    float h = (n*0.5 - c.g) * uDamp;
    for (int i=0;i<16;i++){ if (i>=uN) break; vec4 d = uDrops[i]; float dist = length((uv - d.xy) * uSize); if (dist < d.z) h += d.w * (0.5 + 0.5*cos(3.14159*dist/d.z)); }
    vec2 e = min(uv, 1.0-uv) * uSize; h *= smoothstep(0.0, 4.0, min(e.x, e.y));
    o = vec4(h, c.r, 0.0, 1.0);
  }`;
  const prog = link(`#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0,0.0,1.0); }`, SIM);
  const R = { w: 0, h: 0, rt: [null, null], i: 0, drops: [], damp: 0.986, buf: new Float32Array(64) };
  R.resize = () => {
    R.rt.forEach((t) => k.free(t));
    R.w = Math.max(64, Math.round(k.W / DIV)); R.h = Math.max(64, Math.round(k.H / DIV));
    R.rt = [k.target(R.w, R.h, true), k.target(R.w, R.h, true)];
  };
  // drop(x, y, radius px, strength): negative = a dent (drop / poke), positive = a bump
  R.drop = (x, y, r, s) => { if (R.drops.length < 64) R.drops.push([x / k.W, y / k.H, Math.max(2.6, r / DIV), s]); };
  R.step = () => {
    if (!R.rt[0]) R.resize();
    gl.useProgram(prog.p); gl.bindVertexArray(vao);
    gl.viewport(0, 0, R.w, R.h);
    gl.uniform2f(prog.u.uSize.loc, R.w, R.h); gl.uniform1f(prog.u.uDamp.loc, R.damp);
    for (let s = 0; s < 2; s++) {
      const b = R.drops.splice(0, 16); R.buf.fill(0); b.forEach((d, i) => R.buf.set(d, i * 4));
      gl.uniform4fv(prog.u.uDrops.loc, R.buf); gl.uniform1i(prog.u.uN.loc, b.length);
      const dst = 1 - R.i; gl.bindFramebuffer(gl.FRAMEBUFFER, R.rt[dst].fbo);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.rt[R.i].tex); gl.uniform1i(prog.u.uPrev.loc, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3); R.i = dst;
    }
  };
  Object.defineProperty(R, 'tex', { get() { return R.rt[R.i] ? R.rt[R.i].tex : null; } });
  return R;
}

// ─── Sound: one-shots (fx bus) + ambience bed (ambience bus) + weather bed (weather bus) ─────────
function makeSound(k, def) {
  const LW = root.LW;
  const S = { master: null, bufs: {} };
  function ctxOK() { const c = LW.audio(); return c && c.state === 'running' ? c : null; }
  function out() {
    const ctx = ctxOK(); if (!ctx) return null;
    if (!S.master) {
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      S.master = ctx.createGain(); S.master.gain.value = 0.55;
      const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);   // short open-air reverb
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      const verb = ctx.createConvolver(); verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.25;
      S.master.connect(comp); S.master.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(ctx.destination);
    }
    return ctx;
  }
  function noiseBuf(ctx, color = 'white') {
    if (S.bufs[color]) return S.bufs[color];
    const n = ctx.sampleRate * 4, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let l = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'brown') { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; }
      else if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
      else d[i] = w * 0.5;
    }
    const f = Math.floor(ctx.sampleRate * 0.05); for (let i = 0; i < f; i++) { const t = i / f; d[n - f + i] = d[n - f + i] * (1 - t) + d[i] * t; }
    return (S.bufs[color] = b);
  }
  const filt = (ctx, type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const panAt = (ctx, dest, x) => { const p = ctx.createStereoPanner(); p.pan.value = x === undefined ? Math.random() * 1.6 - 0.8 : clamp((x / k.W) * 2 - 1, -0.8, 0.8); p.connect(dest); return p; };
  function tone(ctx, dest, at, f0, f1, dur, amp, type = 'sine') {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(amp, at + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur + 0.02);
  }
  function burst(ctx, dest, at, dur, f, q, amp, type = 'bandpass') {
    const s = ctx.createBufferSource(), b = filt(ctx, type, f, q), g = ctx.createGain(); s.buffer = noiseBuf(ctx, 'white');
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(amp, at + Math.min(0.01, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(b); b.connect(g); g.connect(dest); s.start(at, Math.random() * 3, dur + 0.05);
  }
  function loop(ctx, color, dest, gain, ...filters) {
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = noiseBuf(ctx, color); s.loop = true; g.gain.value = gain;
    let n = s; for (const f of filters) { n.connect(f); n = f; } n.connect(g); g.connect(dest); s.start(0, Math.random() * 3.5); g.f = filters; return g;
  }
  function lfo(ctx, rate, depth, param) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); return o; }
  const A = { tone, burst, loop, lfo, filt, pan: panAt, noise: noiseBuf, out: null, wx: null,
    // canned voices for beds
    bird(ctx, dest, at, amp = 0.006) { const p = panAt(ctx, dest), n = 2 + Math.floor(Math.random() * 4), base = 2300 + Math.random() * 1900; for (let i = 0; i < n; i++) { const f = base * (0.85 + Math.random() * 0.35), d = 0.05 + Math.random() * 0.08; tone(ctx, p, at, f, f * (Math.random() < 0.55 ? 1.3 : 0.78), d, amp * (0.6 + Math.random() * 0.4)); at += d + 0.03 + Math.random() * 0.09; } },
    cricket(ctx, dest, at, amp = 0.0028) { const p = panAt(ctx, dest), f = 4100 + Math.random() * 800; for (let i = 0; i < 3; i++) tone(ctx, p, at + i * 0.055, f, f * 0.99, 0.04, amp); },
    bee(ctx, dest, at, amp = 0.004) { const p = panAt(ctx, dest), o = ctx.createOscillator(), g = ctx.createGain(), f = 190 + Math.random() * 60, d = 1.2 + Math.random() * 1.5; o.type = 'sawtooth'; o.frequency.setValueAtTime(f, at); o.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.25), at + d); const lp = filt(ctx, 'lowpass', 900); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(amp, at + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, at + d); o.connect(lp); lp.connect(g); g.connect(p); o.start(at); o.stop(at + d + 0.05); },
    gull(ctx, dest, at, amp = 0.012) { const p = panAt(ctx, dest), n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { const t = at + i * (0.28 + Math.random() * 0.1), f = 1500 + Math.random() * 400; const bp = filt(ctx, 'bandpass', f, 3); bp.connect(p); tone(ctx, bp, t, f * 1.25, f * 0.62, 0.32, amp, 'sawtooth'); } },
  };
  S.A = A;
  // fx one-shots (go to the fx bus via lw.js)
  S.tone = (f0, f1, dur, amp, x) => { const ctx = out(); if (ctx) tone(ctx, panAt(ctx, S.master, x), ctx.currentTime, f0, f1, dur, amp); };
  S.plop = (x, big = 1) => { const ctx = out(); if (!ctx) return; const t = ctx.currentTime, p = panAt(ctx, S.master, x), f0 = rand(420, 760) / Math.sqrt(big); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0 * 0.7, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.6, t + 0.05); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.14); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14 * big, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(p); o.start(t); o.stop(t + 0.25); burst(ctx, p, t, 0.08, 1800, 1.2, 0.05 * big); };
  S.splash = (x, big = 1) => { const ctx = out(); if (!ctx) return; const t = ctx.currentTime, p = panAt(ctx, S.master, x); burst(ctx, p, t, 0.35 * big, 1400, 0.6, 0.08 * big, 'lowpass'); burst(ctx, p, t + 0.02, 0.2, 3500, 1.5, 0.04 * big); for (let i = 0; i < 4; i++) burst(ctx, p, t + 0.08 + Math.random() * 0.25, 0.05, 2500 + Math.random() * 2500, 4, 0.02); };
  S.flutter = (x) => { const ctx = out(); if (!ctx) return; const t = ctx.currentTime, p = panAt(ctx, S.master, x); for (let i = 0; i < 6; i++) burst(ctx, p, t + i * 0.045, 0.03, 900 + Math.random() * 500, 1.5, 0.012); };
  S.gull = (x) => { const ctx = out(); if (ctx) A.gull(ctx, panAt(ctx, S.master, x), ctx.currentTime, 0.02); };
  S.chime = () => { const ctx = out(); if (!ctx) return; const t = ctx.currentTime; [[659.3, 0.05], [987.8, 0.025], [1318.5, 0.012]].forEach(([f, a], i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.02); g.gain.exponentialRampToValueAtTime(a, t + i * 0.02 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5); o.connect(g); g.connect(S.master); o.start(t); o.stop(t + 3.6); }); };
  S.thunder = () => { const ctx = ctxOK(), wx = ctx && LW.bus('weather'); if (!wx) return; const t = ctx.currentTime + rand(0.6, 2.2), n = ctx.createBufferSource(), lp = filt(ctx, 'lowpass', 140), g = ctx.createGain(); n.buffer = noiseBuf(ctx, 'brown'); n.loop = true; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5); n.connect(lp); lp.connect(g); g.connect(wx); n.start(t); n.stop(t + 4.6); };
  return S;
}
// Ambience bed: built once the shared AudioContext runs (first click; the host may start it sooner).
// Rain hiss lives on the weather bus and follows LW.env automatically; a wind bed follows k.wind.
function ambience(k, def) {
  const LW = root.LW, S = k.sound, A = S.A, amb = def.ambience || {};
  let on = false, rain = null, wind = null;
  setInterval(() => {
    if (LW.muted) return;
    const ctx = LW.isHost ? LW.audio() : LW._ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (!on) {
      const bus = LW.bus('ambience'); if (!bus) return;
      on = true; A.wx = LW.bus('weather');
      A.out = ctx.createGain(); A.out.gain.value = 0; A.out.connect(bus); A.out.gain.setTargetAtTime(1, ctx.currentTime, 2.5);
      if (amb.wind !== false) { wind = A.loop(ctx, 'pink', A.out, 0, A.filt(ctx, 'bandpass', 420, 0.6), A.filt(ctx, 'lowpass', 1600)); }
      try { amb.build && amb.build(A, k, ctx); } catch (e) { console.error(e); }
    }
    const w = LW.env.weather, target = (w === 'rain' ? 0.03 : w === 'storm' ? 0.05 : 0) * (0.5 + (LW.env.intensity ?? 0.7) * 0.6);
    if (!rain && target > 0 && A.wx) rain = A.loop(ctx, 'white', A.wx, 0, A.filt(ctx, 'highpass', 900), A.filt(ctx, 'lowpass', 5200));
    if (rain) rain.gain.setTargetAtTime(target, ctx.currentTime, 1.5);
    if (wind) { const lv = k.wind.base * 0.5 + k.wind.gust; wind.gain.setTargetAtTime((amb.windLevel ?? 0.02) * clamp(lv, 0.15, 2), ctx.currentTime, 0.6); wind.f[0].frequency.setTargetAtTime(320 + lv * 260, ctx.currentTime, 0.6); }
    try { amb.tick && amb.tick(A, k, ctx.currentTime + 0.05, ctx); } catch (e) { console.error(e); }
  }, 250);
}

// ─── Layer: sky (looking up) ──────────────────────────────────────────────────────────────────────
// Half-res pass (every other frame): gradient + sun glow + 3 cloud layers (cirrus, cumulus, near wisps), alpha =
// cloud cover. Full-res composite adds sharp stars, sun disc and moon under the clouds.
function sky(o = {}) {
  // elev: [elevation at the top of the screen, at the bottom] in radians. Looking up (default) ≈ [1.45, 0.48];
  // a horizon view (plates, landscapes) ≈ [0.55, -0.05] — clouds then flatten into the distance at the horizon.
  const opt = Object.assign({ res: 0.5, cover: null, stars: true, elev: [1.45, 0.48], moonSize: 0.034 }, o);
  const CLOUD = `
  uniform vec2 uSunPos, uElev; uniform float uSunVis, uCover;
  float lerp_n(float a, float b, float t){ return a + (b - a) * t; }
  float elevAt(vec2 uv){ return mix(uElev.x, uElev.y, uv.y); }
  vec2 plane(vec2 uv, float h){            // perspective onto a cloud plane at height h
    float e = max(elevAt(uv), 0.035);
    float r = min(h / tan(e), 14.0);
    return vec2((uv.x - 0.5) * uView.x / uView.y * (0.35 + r * 0.9), r * 1.4);
  }
  float dens(vec2 q, float cover){
    vec2 w = vec2(fbm3(q * 0.9 + uCloudDrift * 0.6), fbm3(q * 0.9 + 5.2 - uCloudDrift * 0.4));
    float n = fbm(q * 1.6 + w * 0.8 + uCloudDrift * 2.0) - (0.8 - cover * 0.5);
    float det = fbm(q * 6.5 + w * 1.6 + uCloudDrift * 3.2);                    // billows: crisp cauliflower edges
    float v = n + (det - 0.5) * 0.24;
    return smoothstep(0.0, 0.07, v) * (0.35 + 0.65 * smoothstep(0.0, 0.32, v));   // edge, then thickness
  }
  void main(){
    vec2 px = kitPx(), uv = px / uView;
    float lowEl = max(uElev.y, 0.0), el = elevAt(uv);                            // gradient spans the visible sky
    float hz = pow(clamp((uElev.x - el) / max(uElev.x - lowEl, 1e-3), 0.0, 1.0), 1.7);
    vec3 col = mix(uZenith, uHorizon, hz);
    float below = smoothstep(0.0, -0.06, el);                                    // under the horizon: haze
    float far = 1.0 - smoothstep(0.025, 0.16, el);                               // the cloud deck recedes into haze
    vec2 sd = (px - uSunPos) / uView.y; float ds = length(sd);
    vec3 sunC = uLight * uSunVis;
    col += sunC * (exp(-ds * 5.5) * 0.32 + exp(-ds * ds * 45.0) * 0.45) * (0.4 + 0.6 * uDay + uGolden * 0.5);
    col += uLight * uGolden * 0.18 * exp(-max(0.0, el - lowEl) * 4.5);            // warm low-sky band at golden hour
    vec2 sdir = normalize(-sd + vec2(1e-4)) * 0.07;
    float cover = uCover;
    // cirrus: high, thin, combed by the wind
    vec2 qc = plane(uv, 2.4); vec2 qw = vec2(qc.x * 0.5 + qc.y * 0.15, qc.y * 2.6);
    float ci = smoothstep(0.55, 0.95, fbm(qw * 1.1 + uCloudDrift * vec2(1.6, 0.3))) * smoothstep(0.1, 0.5, cover + 0.2) * 0.55 * (1.0 - far);
    vec3 ciC = mix(uZenith * 0.6 + uLight * 0.55 * uAmb, uLight * 1.15, 0.4 + 0.6 * exp(-ds * 3.0)) + uHorizon * uGolden * 0.4;
    col = mix(col, ciC, ci * (1.0 - uNight * 0.6));
    // cumulus: the hero layer, self-shadowed toward the sun
    vec2 q = plane(uv, 1.0);
    float d = dens(q, cover) * (1.0 - far), a = 0.0;
    if (d > 0.002) {
      float d1 = dens(q + sdir * 0.45, cover), d2 = dens(q + sdir * (1.2 + q.y * 0.2), cover);
      float lit = exp(-(d1 * 1.1 + d2 * 0.9) * 1.25) * 1.25;                       // light reaching this puff from the sun side
      lit = clamp(mix(lit, 0.55 + (d - d1) * 2.2, 0.35), 0.0, 1.0);
      float edge = (1.0 - d) * exp(-ds * 2.2) * uSunVis;                          // silver lining near the sun
      vec3 shade = mix(uZenith, uHorizon, 0.55) * 0.55 + vec3(0.05, 0.05, 0.06) * uAmb + uHorizon * uGolden * 0.35;
      shade = mix(shade, vec3(0.32, 0.34, 0.37) * uAmb, uCloud * 0.6);            // overcast: grey
      vec3 litC = uLight * (0.8 + 0.25 * uAmb) + uZenith * 0.25;
      vec3 cc = mix(shade, litC, lit * (1.0 - uCloud * 0.55)) + uLight * edge * 1.3;
      float lump = fbm3(q * 13.0 + uCloudDrift * 3.5), thick = smoothstep(0.4, 1.0, d);
      cc *= mix(1.0, 0.66 + 0.45 * lump, thick * (1.0 - lit * 0.45));            // thick undersides go grey and lumpy
      cc *= lerp_n(1.0, 0.42, uNight);
      a = smoothstep(0.0, 0.55, d);
      col = mix(col, cc, a);
    }
    // near wisps: low, fast, faint (parallax)
    vec2 qn = plane(uv, 0.55);
    float wn = smoothstep(0.62, 0.95, fbm(qn * 1.3 + uCloudDrift * 3.4 + 9.0)) * smoothstep(0.2, 0.6, cover) * 0.4 * (1.0 - far);
    col = mix(col, mix(uZenith, uHorizon, 0.6) * 0.8 + uLight * 0.35 * uAmb, wn);
    a = max(a, max(ci * 0.8, wn));
    // overcast veil
    col = mix(col, mix(uZenith, uHorizon, 0.5) * 0.9 + vec3(0.04) * uAmb, smoothstep(0.75, 1.0, uCloud) * 0.6);
    // toward the horizon the cloud deck recedes into haze (and never streaks where the projection runs out)
    col = mix(col, mix(uZenith, uHorizon, 0.85) * 0.95 + uLight * uGolden * 0.1, far * 0.9);
    a *= 1.0 - far;
    col = mix(col, uHorizon * 0.9, below);
    o = vec4(col, clamp((a + smoothstep(0.75, 1.0, uCloud) * 0.7) * (1.0 - below), 0.0, 1.0));
  }`;
  const COMP = `
  uniform sampler2D uSky, uMoonTex; uniform vec2 uSunPos, uMoonPos; uniform float uSunVis, uMoonVis, uMoonFrac, uMoonPhase, uStars, uMoonR, uHasMoonTex;
  void main(){
    vec2 px = kitPx(), uv = px / uView;
    vec4 s = texture(uSky, uv);
    vec3 col = s.rgb; float clear = 1.0 - s.a;
    // stars: two sparse grids (many faint, a few bright). Every star has its own size, brightness, tint and
    // scintillation (independent rate + phase from separate hashes, two incommensurate sines) — most barely
    // shimmer, roughly one in eight sparkles. Soft round points never narrower than ~1.4 render px (FWHM), so a
    // low-res scene (k.res < 1 on big displays) never shows them as square dots.
    if (uStars > 0.01) {
      float rp = uView.x / uRes.x;   // CSS px per render px
      vec3 sc = vec3(0.0);
      for (int l = 0; l < 2; l++) {
        float fl = float(l), cs = l == 0 ? 19.0 : 53.0, th = l == 0 ? 0.85 : 0.82;
        vec2 cell = floor(px / cs), f = fract(px / cs); float h = hash(cell + fl * 71.3);
        if (h > th) {
          float k = (h - th) / (1.0 - th);
          vec2 c = hash2(cell + 3.1 + fl * 17.0) * 0.6 + 0.2; float d = length(f - c) * cs;
          float mag = l == 0 ? 0.12 + 0.5 * k * k : 0.45 + 0.75 * k * k * k;
          float sig = max((l == 0 ? 0.5 : 0.75) + 0.4 * hash(cell + 5.7 + fl), 0.62 * rp);
          float rate = 0.4 + 1.8 * hash(cell + 11.3 + fl), ph = 6.2832 * hash(cell + 23.9 + fl);
          float amp = 0.06 + 0.5 * smoothstep(0.86, 1.0, hash(cell + 41.7 + fl));
          float tw = 1.0 + amp * (0.62 * sin(uTime * rate + ph) + 0.38 * sin(uTime * rate * 2.37 + ph * 1.7 + 1.3));
          vec3 tint = mix(vec3(1.0, 0.88, 0.76), vec3(0.8, 0.88, 1.0), smoothstep(0.12, 0.8, hash(cell + 61.1 + fl)));
          sc += tint * mag * tw * exp(-d * d / (2.0 * sig * sig));
        }
      }
      col += sc * uStars * clear * (1.0 - 0.6 * pow(uv.y, 2.0));
    }
    // sun disc (HDR: blooms in the grade)
    float ds = length(px - uSunPos) / uView.y;
    col += uLight * smoothstep(0.024, 0.02, ds) * 6.0 * uSunVis * clear;
    // moon: the shared photoreal disk (moon.js, real phase + earthshine) when loaded, else a procedural one
    vec2 mp = (px - uMoonPos) / uMoonR;
    float mr = length(mp);
    if (mr < 6.0 && uMoonVis > 0.01) {
      col += vec3(0.6, 0.7, 0.9) * exp(-mr * 0.9) * 0.12 * uMoonVis * clear * (0.4 + 0.6 * uMoonFrac);
      if (uHasMoonTex > 0.5) {
        if (mr < 1.05) { vec4 m = texture(uMoonTex, mp * 0.5 + 0.5); col = col * (1.0 - m.a * uMoonVis * (0.3 + 0.7 * clear)) + m.rgb * 1.35 * uMoonVis * (0.3 + 0.7 * clear); }
      } else if (mr < 1.0) {
        vec3 n = vec3(mp, sqrt(1.0 - mr * mr)); float ph = uMoonPhase * 6.28318;
        vec3 l = vec3(sin(ph), 0.0, -cos(ph));
        float lit = smoothstep(-0.06, 0.06, dot(n, l));
        float maria = 0.75 + 0.25 * fbm3(mp * 2.2 + 4.0);
        vec3 mc = vec3(0.95, 0.94, 0.9) * maria * (lit + 0.035) * 1.8;
        col = mix(col, mc, smoothstep(1.0, 0.96, mr) * uMoonVis * (0.25 + 0.75 * clear));
      }
    }
    o = vec4(col, 1.0);
  }`;
  let progC, progS, rt = null, frameN = 0;
  const L = { kind: 'sky', opt };
  function screenPos(k, elev, az) {   // dome → screen (facing south; mirrored with the layout); override with opt.place
    if (opt.place) return opt.place(k, elev, az);
    const [t, b] = opt.elev;
    return [k.mx(k.W * (0.5 + Math.sin(az) * 0.4)), k.H * (t - elev) / (t - b)];
  }
  let moonTex = null, moonKey = '';
  function moonTexture(k, r, alt) {   // re-upload only when LW.moonKey (phase step / tint) or the size changes
    const LW = root.LW; if (!LW.moonCanvas) return null;
    const px = Math.min(512, Math.round(r * 2 * k.res)), key = px + '|' + LW.moonKey({ alt });
    if (key === moonKey && moonTex) return moonTex;
    const c = LW.moonCanvas(px, { alt }); if (!c) return null;
    const gl = k.gl; if (!moonTex) moonTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, moonTex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    moonKey = key; return moonTex;
  }
  L.init = (k) => { progC = k.program(CLOUD); progS = k.program(COMP); };
  L.resize = (k) => { k.free(rt); rt = k.target(k.sceneRT.w * opt.res, k.sceneRT.h * opt.res, true); frameN = 0; };
  L.draw = (k) => {
    const Lt = k.L;
    const sun = screenPos(k, Lt.sunElev, Lt.sunAz), moon = screenPos(k, Lt.moonElev, Lt.moonAz);
    const sunVis = smooth(-0.08, 0.06, Lt.sunElev), moonVis = smooth(-0.04, 0.08, Lt.moonElev) * (root.LW.moonVisibility ? root.LW.moonVisibility() : 1);
    L.sun = { x: sun[0], y: sun[1], vis: sunVis }; L.moon = { x: moon[0], y: moon[1], vis: moonVis };
    const cover = opt.cover ?? Lt.cloud;
    if (frameN++ % 2 === 0) k.pass(progC, { uSunPos: sun, uSunVis: sunVis, uCover: cover, uElev: opt.elev }, rt);
    const mR = k.H * opt.moonSize, mt = moonVis > 0.01 ? moonTexture(k, mR, Lt.moonElev) : null;
    k.pass(progS, { uSky: rt, uMoonTex: { tex: mt || rt.tex }, uHasMoonTex: mt ? 1 : 0, uMoonR: mR, uSunPos: sun, uMoonPos: moon, uSunVis: sunVis, uMoonVis: moonVis, uMoonFrac: Lt.moonFrac, uMoonPhase: Lt.moonPhase, uStars: opt.stars ? smooth(0.45, 0.95, Lt.night) : 0 }, k.sceneRT);
  };
  return L;
}

// ─── Layer: water (koi's pond) ─────────────────────────────────────────────────────────────────────
// Ripple-sim refraction over a baked floor, caustics, things under the surface (under) and floating on it (surface),
// sky reflection, sun glints, mist. Interactive: k.ripples.drop(x, y, r, s).
function water(o = {}) {
  const opt = Object.assign({ deep: [0.03, 0.1, 0.1], shallow: [0.21, 0.23, 0.18], floor: null, dapple: 0, wind: 1 }, o);
  const FLOOR_FN = opt.floor || `
  float pebbles(vec2 p, out float tone){
    vec2 i = floor(p), f = fract(p); float best = 0.0; tone = 0.0;
    for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){
      vec2 g = vec2(x,y); vec2 h = hash2(i+g); if (h.x > 0.6) continue;
      vec2 c = g + 0.2 + h*0.6 - f; float ang = h.y*6.28; vec2 q = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*c;
      q.x *= 0.75 + h.x*0.5; float hr = hash(i+g+3.7); float r = 0.12 + 0.36*hr*hr; float d = length(q)/r;
      float v = smoothstep(1.0, 0.6, d) * (1.0 - 0.4*d*d); float ao = smoothstep(1.45, 1.0, d); v = v > 0.0 ? v : -ao*0.5;
      if (abs(v) > abs(best)){ best = v; tone = hash(i+g+9.1); }
    }
    return best;
  }
  vec4 floorAt(vec2 p, vec3 deep, vec3 shallow){
    float m1 = fbm3(p*0.35), m2 = fbm3(p*1.1 + 7.0);
    vec3 silt = mix(deep*1.1, shallow*0.55, m1); silt = mix(silt, silt*vec3(0.85,1.08,0.8), smoothstep(0.4,0.7,m2));
    float tone; float st = pebbles(p*0.75, tone); float patchM = smoothstep(0.42, 0.6, fbm3(p*0.3 + 3.1));
    float grain = noise(p*14.0)*0.5 + noise(p*31.0)*0.5; vec3 stone = shallow * mix(0.6, 1.15, tone);
    silt *= 0.88 + 0.24*grain; float stv = max(st, 0.0), ao = max(-st, 0.0);
    vec3 col = silt * (1.0 - ao*patchM); col = mix(col, stone*(0.9+0.2*grain), stv*patchM*0.85);
    return vec4(col, stv*patchM);
  }`;
  const FLOOR = `uniform vec3 uDeep, uShallow;` + FLOOR_FN + `
  void main(){ vec2 px = kitPx(); o = floorAt(px / uView.y * 8.0, uDeep, uShallow); }`;
  const COMP = `
  uniform sampler2D uSim, uUnder, uSurf, uFloor; uniform vec2 uSimTx; uniform float uHasSim, uDapple, uWindK; uniform vec3 uDeep;
  float blurA(sampler2D t, vec2 uv, float r){ float a = texture(t, uv).a*0.28; a += (texture(t, uv+vec2(r,0)).a + texture(t, uv-vec2(r,0)).a + texture(t, uv+vec2(0,r)).a + texture(t, uv-vec2(0,r)).a)*0.18; return a; }
  void main(){
    vec2 px = kitPx(), uv = px / uView, fp = px / uView.y;
    vec2 grad = vec2(texture(uSim, uv+vec2(uSimTx.x,0)).r - texture(uSim, uv-vec2(uSimTx.x,0)).r, texture(uSim, uv+vec2(0,uSimTx.y)).r - texture(uSim, uv-vec2(0,uSimTx.y)).r) * uHasSim;
    vec2 wp = fp*34.0;
    vec2 micro = vec2(noise(wp + uTime*vec2(1.1,0.6)) - 0.5, noise(wp.yx*1.13 - uTime*vec2(0.8,1.2)) - 0.5);
    vec3 N = normalize(vec3(-(grad*4.0 + micro*uWindK*uWind.x*0.22), 1.0)); vec2 refr = N.xy * 0.014;
    float dap = uDapple > 0.01 ? smoothstep(0.52, 0.72, fbm3(fp*2.2 + vec2(uTime*0.012, uTime*0.004))) * uDapple : 0.0;
    vec4 flr = texture(uFloor, uv + refr*1.8);
    float ca = kitCaustic((fp + refr*2.5)*4.2, uTime*0.32);
    vec2 so = normalize(uSunDir + vec2(1e-4)) * 0.03 * vec2(uView.y/uView.x, 1.0);
    float fsh = blurA(uUnder, uv + refr*0.5 + so, 0.006), psh = blurA(uSurf, uv + so*0.9, 0.008);
    float lit = (1.0 - dap*0.6) * (1.0 - fsh*0.75) * (1.0 - psh*0.72);
    vec3 col = flr.rgb * (uLight*uAmb*(0.5 + 0.5*lit) + vec3(0.02,0.03,0.035));
    col += uLight * ca * uCaust * lit * (0.5 + 0.5*flr.a) * 0.55;
    float depth = 0.55 + 0.25*smoothstep(0.1, 0.9, length((uv-0.5)*vec2(uView.x/uView.y,1.0)*0.9));
    col = mix(col, uDeep*(uAmb*0.8+0.08), 0.42*depth);
    vec4 f = texture(uUnder, uv + refr*0.7);
    col = col*(1.0 - f.a) + f.rgb * (uLight*uAmb*(0.92 - dap*0.35) + uLight*ca*uCaust*0.22 + vec3(0.03));
    vec4 pad = texture(uSurf, uv + grad*0.012); float slope = 1.0 - N.z;
    vec3 sky = uSkyRefl * (0.75 + 0.5*noise(fp*2.5 + vec2(uTime*0.006, 0.0) + N.xy*3.0));
    col += sky * (0.06 + min(slope, 0.04)*3.0) * (1.0 - pad.a);
    vec3 Ls = normalize(vec3(-uSunDir.x, uSunDir.y, 1.1)); vec3 Hh = normalize(Ls + vec3(0,0,1));
    col += uLight * pow(max(dot(N,Hh), 0.0), 220.0) * uSpec * 0.9 * (1.0 - pad.a);
    col = col*(1.0 - pad.a) + pad.rgb * (uLight*uAmb*(0.95 - dap*0.4) + vec3(0.025));
    o = vec4(col, 1.0);
  }`;
  let floorP, compP, floorRT = null, underRT = null, surfRT = null, key = '';
  const L = { kind: 'water', opt };
  L.init = (k) => { floorP = k.program(FLOOR); compP = k.program(COMP); };
  L.resize = (k) => { [floorRT, underRT, surfRT].forEach(k.free); floorRT = k.target(k.sceneRT.w, k.sceneRT.h, true); underRT = k.target(k.sceneRT.w, k.sceneRT.h); surfRT = k.target(k.sceneRT.w, k.sceneRT.h); key = ''; k.ripples; };
  L.draw = (k, t) => {
    const gl = k.gl, b = k.batch;
    if (key !== 'baked') { k.pass(floorP, { uDeep: opt.deep, uShallow: opt.shallow }, floorRT); key = 'baked'; }
    for (const [rt, fn] of [[underRT, opt.under], [surfRT, opt.surface]]) { k.bindTarget(rt); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); if (fn) { fn(b, k, t); b.flush(); } }
    const R = k.ripples;
    k.pass(compP, { uSim: { tex: R ? R.tex : underRT.tex }, uHasSim: R ? 1 : 0, uSimTx: R ? [1 / R.w, 1 / R.h] : [0, 0], uUnder: underRT, uSurf: surfRT, uFloor: floorRT, uDapple: opt.dapple, uWindK: opt.wind, uDeep: opt.deep }, k.sceneRT);
  };
  return L;
}

// ─── Layer: waves (top-down beach) ─────────────────────────────────────────────────────────────────
// Shore frame: a line through shore.a → shore.b (fractions of the screen), sea on the side of shore.sea.
// s = signed distance from the mean waterline in units of H (+ = seaward). JS drives the swash edge and three
// bores (white-water fronts), so a scene can hand them to the breath. layer.waterAt(x, y) tells sand from sea.
function waves(o = {}) {
  const opt = Object.assign({ shore: { a: [0.3, -0.05], b: [0.64, 1.05] }, period: 11, runup: 0.075, backwash: 0.03, breakAt: 0.3,
    sand: [0.86, 0.77, 0.6], shallow: [0.30, 0.78, 0.74], deep: [0.015, 0.16, 0.30], under: null }, o);
  const SAND = `
  uniform vec2 uA, uN, uT; uniform vec3 uSand;
  float sCoord(vec2 px){ float al = dot(px, uT) / uView.y; return (dot(px - uA, uN) / uView.y) + 0.035*sin(al*4.1 + 1.3) + 0.018*sin(al*9.7 + 0.4) + 0.012*(fbm3(vec2(al*3.0, 0.5)) - 0.5); }
  void main(){
    vec2 px = kitPx(); float s = sCoord(px);
    vec2 g = px / uView.y;
    float grain = noise(px * 0.9) * 0.5 + noise(px * 0.37 + 7.0) * 0.5;
    float big = fbm3(g * 3.0);
    // wind ripple marks on the dry sand (shaded later through the height in .a)
    vec2 rp = vec2(dot(g, vec2(0.86, 0.5)), dot(g, vec2(-0.5, 0.86)));
    float rip = sin(rp.x * 210.0 + fbm3(rp * 9.0) * 9.0 + 2.0 * sin(rp.y * 30.0)) * 0.5 + 0.5; rip = mix(0.5, rip, smoothstep(-0.03, -0.2, s) * smoothstep(0.35, 0.7, fbm3(g * 4.0)) * 0.8);
    vec3 c = uSand * (0.86 + 0.16 * big) * (0.92 + 0.12 * grain);
    c *= mix(vec3(1.0), vec3(1.04, 1.0, 0.94), smoothstep(0.4, 0.8, fbm3(g * 9.0 + 3.0)));
    // shell grit + dark mineral specks
    c *= 0.93 + 0.12 * hash(floor(px * 1.3));
    vec2 spc = floor(px * 0.5); float sp = hash(spc + 3.3); vec2 spo = fract(px * 0.5) - hash2(spc) * 0.6 - 0.2;
    c *= 1.0 - step(0.9975, sp) * smoothstep(0.35, 0.0, length(spo)) * 0.45;
    // tide line: a band of dried seaweed + debris near the high-water mark
    float tl = exp(-pow((s + 0.13 + 0.02 * sin(dot(px, uT) * 0.01)) / 0.012, 2.0));
    float wrack = smoothstep(0.55, 0.75, fbm3(px * 0.06)) * tl;
    c = mix(c, vec3(0.22, 0.2, 0.13), wrack * 0.85);
    o = vec4(c, rip);
  }`;
  const COMP = `
  uniform sampler2D uBase, uUnder, uSim; uniform vec2 uA, uN, uT, uSimTx; uniform float uHasSim;
  uniform float uEdge, uWetLine, uRecede; uniform vec4 uBores, uBoreA; uniform vec3 uShallow, uDeep; uniform vec2 uMoonGlint;
  float sCoord(vec2 px){ float al = dot(px, uT) / uView.y; return (dot(px - uA, uN) / uView.y) + 0.035*sin(al*4.1 + 1.3) + 0.018*sin(al*9.7 + 0.4) + 0.012*(fbm3(vec2(al*3.0, 0.5)) - 0.5); }
  float lace(vec2 p){                       // cellular foam lace: bright thin walls between bubbles (domain-warped)
    p += vec2(noise(p * 0.35), noise(p * 0.35 + 7.7)) * 1.6 - 0.8;
    vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 g = vec2(x,y); vec2 o2 = hash2(i+g); vec2 r = g + o2 - f; float d = dot(r,r); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return (1.0 - smoothstep(0.0, 0.22, sqrt(d2) - sqrt(d1))) * (0.55 + 0.45 * noise(p * 0.6));
  }
  void main(){
    vec2 px = kitPx(), uv = px / uView, g = px / uView.y;
    float s = sCoord(px), al = dot(px, uT) / uView.y;
    // the swash edge wobbles along the shore (lobes / cusps)
    float edge = uEdge + 0.012*sin(al*14.0 + uTime*0.3) + 0.008*(noise(vec2(al*20.0, uTime*0.2)) - 0.5);
    float wet = smoothstep(uWetLine - 0.035, uWetLine + 0.004, s);
    float inWater = smoothstep(edge - 0.002, edge + 0.004, s);
    float depthS = max(s - edge, 0.0);
    float sea0 = max(s, 0.0);
    float bar = 0.1 * exp(-pow((s - 0.25) / 0.06, 2.0)) * (0.6 + 0.4 * noise(vec2(al * 4.0, 1.0)));   // a sandbar where waves break
    float depth = depthS * 0.9 + sea0 * sea0 * 1.5 - bar;
    // surface: swell trains (analytic slopes) + wind chop + ripple sim
    vec2 grad = vec2(0.0);
    if (uHasSim > 0.5) grad = vec2(texture(uSim, uv+vec2(uSimTx.x,0)).r - texture(uSim, uv-vec2(uSimTx.x,0)).r, texture(uSim, uv+vec2(0,uSimTx.y)).r - texture(uSim, uv-vec2(0,uSimTx.y)).r);
    vec2 slope = vec2(0.0); vec2 dirIn = -uN;
    for (int i = 0; i < 4; i++) {
      float fi = float(i), a = (fi - 1.5) * 0.28; vec2 d = vec2(dirIn.x * cos(a) - dirIn.y * sin(a), dirIn.x * sin(a) + dirIn.y * cos(a));
      float kk = 38.0 + fi * 17.0, ph = dot(g, d) * kk - uTime * (1.1 + fi * 0.35) + fi * 1.7;
      slope += d * cos(ph) * (0.11 / (1.0 + fi * 0.6));
    }
    slope *= smoothstep(0.02, 0.3, s) * (0.6 + 0.4 * uWind.x);
    vec2 cp = g * 42.0; vec2 chop = vec2(noise(cp + uTime * vec2(0.9, 0.4)) - noise(cp + vec2(0.07, 0.0) + uTime * vec2(0.9, 0.4)), noise(cp.yx * 1.2 - uTime * vec2(0.6, 0.9)) - noise(cp.yx * 1.2 + vec2(0.0, 0.07) - uTime * vec2(0.6, 0.9))) * 3.0;
    chop += vec2(noise(g * 110.0 + uTime * 0.7) - 0.5, noise(g.yx * 120.0 - uTime * 0.6) - 0.5) * 0.35;
    slope += chop * (0.12 + uWind.x * 0.16) * smoothstep(0.0, 0.04, depthS);
    vec3 Nrm = normalize(vec3(-(slope + grad * 1.5), 1.0));
    vec2 refr = Nrm.xy * 0.012 * smoothstep(0.0, 0.03, depthS);
    // ground (sand + things on it), refracted under water, darker where wet
    vec4 base = texture(uBase, uv + refr);
    vec4 und = texture(uUnder, uv + refr * 0.6);
    float ripShade = (base.a - 0.5) * 0.14 * (1.0 - wet);
    vec3 sunL = uLight * uAmb;
    float cs = kitCloudShadow(px);
    vec3 ground = base.rgb * (sunL * (1.0 - cs) * (1.0 + ripShade) + uZenith * 0.25 + 0.02);
    ground = mix(ground, ground * vec3(0.7, 0.66, 0.6), wet * 0.9 * (1.0 - inWater * 0.75));
    ground = mix(ground, ground * 0.8, uWet * 0.6);                              // rain-darkened beach
    ground = mix(ground, vec3(0.9, 0.93, 0.97) * (sunL + uZenith * 0.3 + 0.03), uSnow * (1.0 - wet) * smoothstep(0.35, 0.65, fbm3(g * 9.0) + uSnow * 0.5) * 0.9);   // snow settles on dry sand
    ground = ground * (1.0 - und.a) + und.rgb * (sunL * (1.0 - cs) + uZenith * 0.2 + 0.02);
    // wet-sand sheen: sky + glints on the thin film left behind
    float film = wet * (1.0 - inWater) * (0.4 + 0.6 * smoothstep(uWetLine, edge, s));
    ground += uSkyRefl * film * 0.2 + sunL * film * smoothstep(edge - 0.03, edge, s) * step(0.997, hash(floor(px * 0.6) + floor(uTime * 4.0) * 0.37)) * 1.2 * uSpec;
    // water column: absorption over the sand → turquoise shallows, aqua over the bar, deep blue offshore
    vec3 absorb = exp(-depth * vec3(3.6, 1.25, 1.0));
    float ca = 0.0;
    if (depth < 0.45 && inWater > 0.0) ca = kitCaustic(g * 6.0 + refr * 3.0, uTime * 0.45) * smoothstep(0.0, 0.015, depthS) * exp(-depth * 4.0);
    vec3 under = ground * absorb + uLight * ca * uCaust * 0.45 * absorb;
    vec3 scatter = mix(uShallow, uDeep, smoothstep(0.12, 1.1, depth)) * (uAmb * 0.85 + 0.05) * (1.0 - cs * 0.5);
    vec3 sea = mix(under, scatter, 1.0 - exp(-depth * 2.2) * 0.9);
    // light on the moving surface: swell catching the sun, sky reflection, sparse sparkle
    vec3 Ls = normalize(vec3(-uSunDir.x, -uSunDir.y, 1.4));
    sea += sunL * (dot(Nrm, Ls) - Ls.z) * 0.9 * smoothstep(0.0, 0.05, depthS);
    float fres = 0.03 + 0.6 * pow(1.0 - Nrm.z, 2.0);
    sea += uSkyRefl * fres * 0.8;
    sea *= 1.0 + dot(slope, vec2(-0.55, -0.85)) * 0.9 * smoothstep(0.05, 0.3, s);            // swell relief
    float mpath = exp(-pow((px.x - uMoonGlint.x) / (uView.x * 0.16), 2.0)) * uMoonGlint.y;
    sea += vec3(0.55, 0.62, 0.78) * mpath * (0.03 + fres * 0.5) * smoothstep(0.05, 0.25, s);
    float patchG = smoothstep(0.35, 0.8, fbm3(g * 2.5 + uTime * 0.03));
    vec2 sc = floor(px / 1.6);
    float spark = step(0.9993 - 0.003 * patchG * patchG, hash(sc + floor(uTime * 6.0 + hash(sc) * 6.0) * 0.61)) * smoothstep(0.05, 0.2, depthS) * max(0.0, dot(Nrm.xy, normalize(-uSunDir + vec2(1e-4))) * 6.0 + 0.3);
    sea += uLight * spark * uSpec * (0.4 + 1.2 * uDay) * (1.0 - cs) * (0.2 + patchG) * (1.0 - uNight * 0.7);
    // whitecaps when it's windy
    float cap = smoothstep(0.55, 1.2, uWind.x + uWind.y * 0.5) * smoothstep(0.25, 0.5, s) * smoothstep(0.12, 0.2, length(slope)) * smoothstep(0.5, 0.8, fbm3(g * 18.0 + uTime * 0.1));
    sea = mix(sea, vec3(0.9, 0.94, 0.96) * (sunL + uZenith * 0.3), cap * 0.6);
    // foam: bores (white water rolling in), swash front, receding lace
    float foam = 0.0, fresh = 0.0;
    for (int i = 0; i < 4; i++) {
      float b = uBores[i], a = uBoreA[i]; if (a < 0.01) continue;
      float x = s - b - 0.006*sin(al*11.0 + float(i)*2.0 + uTime*0.4) - 0.012*(noise(vec2(al*9.0, float(i)*3.0)) - 0.5);
      if (x < -0.006 || x > 0.14) continue;
      a *= smoothstep(0.15, 0.55, noise(vec2(al * 3.5 + float(i) * 7.3, float(i) + uTime * 0.05))) * 0.7 + 0.3;   // breaks unevenly along the shore
      float front = smoothstep(-0.004, 0.002, x) * exp(-max(x, 0.0) / (0.018 + 0.03 * a));
      float l = lace(g * 60.0 + vec2(float(i) * 7.0, uTime * 0.1)) * 0.6 + lace(g * 140.0 - float(i)) * 0.4;
      float f = front * a * smoothstep(0.1, 0.8, l * 0.8 + front * 0.85 - x * 5.0);
      f += smoothstep(-0.003, 0.0, x) * smoothstep(0.01, 0.0, x) * a * 0.7;     // the curl's bright lip
      foam = max(foam, f); fresh = max(fresh, f * exp(-max(x, 0.0) / 0.025) * (0.6 + 0.8 * step(0.6, l)));
    }
    float ex = s - edge, swashF = 0.0, trail = 0.0;
    if (ex > -0.004 && ex < 0.2) {
      float br = smoothstep(0.25, 0.65, fbm3(vec2(al * 60.0, ex * 400.0) + uTime * 0.15));
      swashF = smoothstep(-0.002, 0.0015, ex) * (exp(-max(ex, 0.0) / 0.0035) * (0.55 + 0.45 * br) + exp(-max(ex, 0.0) / 0.012) * 0.35 * smoothstep(0.35, 0.75, lace(g * 70.0 + uTime * 0.04)));
      trail = smoothstep(0.0, 0.01, ex) * exp(-ex / 0.045) * uRecede * smoothstep(0.45, 0.8, lace(g * 52.0 + vec2(0.0, uTime * 0.02)) * 0.7 + lace(g * 120.0) * 0.4);
    }
    foam = max(foam, max(swashF, trail * 0.75)) * inWater;
    vec3 foamC = vec3(0.92, 0.95, 0.97) * (sunL * (1.0 - cs * 0.6) + uZenith * 0.35 + 0.03);
    vec3 col = mix(ground, sea, inWater);
    col = mix(col, foamC, clamp(foam, 0.0, 1.0) * 0.9);
    // bioluminescence: fresh foam glows blue-green at night
    float bio = (fresh + swashF * 0.5 * (0.5 + 0.5 * noise(g * 80.0 + uTime))) * inWater * smoothstep(0.55, 1.0, uNight);
    col += vec3(0.12, 0.62, 1.0) * bio * 1.5 + vec3(0.5, 0.9, 1.0) * bio * bio * step(0.985, hash(floor(px / 1.5) + floor(uTime * 9.0))) * 2.0;
    // moonlight path: sparkles thicken under the moon
    float mspark = step(0.996, hash(sc * 1.37 + floor(uTime * 5.0 + hash(sc + 9.0) * 5.0) * 0.43)) * smoothstep(0.05, 0.2, depthS);
    col += vec3(0.8, 0.85, 0.95) * mspark * mpath * 1.4;
    o = vec4(col, 1.0);
  }`;
  let sandP, compP, baseRT = null, underRT = null;
  const L = { kind: 'waves', opt, edge: 0, wetLine: -0.03, recede: 0, bores: [0.4, 0.3, 0.2, 0.1], boreA: [0, 0, 0, 0], phase: 0, auto: true };
  let A = [0, 0], N = [1, 0], T = [0, 1];
  function frame(k) {   // the sea sits on the widget side (calm water); mirrors with LW.layout
    const mir = opt.mirror !== false && k.layout.mirror, fx = (f) => (mir ? 1 - f : f);
    const a = [fx(opt.shore.a[0]) * k.W, opt.shore.a[1] * k.H], b = [fx(opt.shore.b[0]) * k.W, opt.shore.b[1] * k.H];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    A = a; T = [dx / d, dy / d]; N = [dy / d, -dx / d];   // seaward = right of the line's direction
    if (!!opt.shore.flip !== mir) N = [-N[0], -N[1]];
  }
  // Signed shore coordinate (H units, + seaward) and its JS twin of the shader's wobble.
  L.s = (x, y) => { const al = (x * T[0] + y * T[1]) / L.H; return ((x - A[0]) * N[0] + (y - A[1]) * N[1]) / L.H + 0.035 * Math.sin(al * 4.1 + 1.3) + 0.018 * Math.sin(al * 9.7 + 0.4); };
  L.waterAt = (x, y) => L.s(x, y) > L.edge + 0.004;
  L.toXY = (s, along) => { const p = [A[0] + T[0] * along * L.H, A[1] + T[1] * along * L.H]; return [p[0] + N[0] * s * L.H, p[1] + N[1] * s * L.H]; };
  L.normal = () => N; L.tangent = () => T;
  L.init = (k) => { sandP = k.program(SAND); compP = k.program(COMP); };
  L.resize = (k) => { L.H = k.H; frame(k); [baseRT, underRT].forEach(k.free); baseRT = k.target(k.sceneRT.w, k.sceneRT.h); underRT = k.target(k.sceneRT.w, k.sceneRT.h); L.baked = false; k.ripples; };
  // Natural surf: bores spawn at the break line every period/2-ish, run in, and become the swash; the edge then
  // decelerates (uprush), turns and runs back (backwash). When !L.auto the scene drives L.edge / L.bores itself.
  let v = 0, nextBore = 0.5;
  L.update = (dt, t, k) => {
    if (!L.auto) return;
    nextBore -= dt;
    if (nextBore <= 0) { const i = L.boreA.indexOf(Math.min(...L.boreA)); L.bores[i] = opt.breakAt * rand(0.9, 1.1); L.boreA[i] = rand(0.75, 1); nextBore = opt.period * rand(0.42, 0.62); }
    for (let i = 0; i < 4; i++) {
      if (L.boreA[i] < 0.01) continue;
      const sp = 0.035 + L.bores[i] * 0.12;                 // slows as it shoals
      L.bores[i] -= sp * dt; L.boreA[i] *= Math.exp(-dt * 0.05);
      if (L.bores[i] <= L.edge + 0.003) { if (L.edge > -opt.runup * 0.6) v = Math.min(v, -(0.05 + 0.04 * L.boreA[i])); L.boreA[i] = 0; }
    }
    v += 0.032 * dt;                                         // gravity on the swash slope
    L.edge += v * dt;
    if (L.edge > opt.backwash) { L.edge = opt.backwash; v = 0; }
    if (L.edge < -opt.runup * 1.15) { L.edge = -opt.runup * 1.15; v = Math.max(v, 0); }
    L.recede = ease(L.recede, v > 0.004 ? 1 : 0, v > 0 ? 0.8 : 3, dt);
    L.wetLine = Math.min(ease(L.wetLine, L.edge, 0.025, dt), L.edge);
  };
  L.draw = (k, t) => {
    const gl = k.gl, Lt = k.L;
    if (!L.baked) { k.pass(sandP, { uA: A, uN: N, uT: T, uSand: opt.sand }, baseRT); L.baked = true; }
    k.bindTarget(underRT); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (opt.under) { opt.under(k.batch, k, t); k.batch.flush(); }
    const R = k.ripples, moonX = k.W * (0.5 + Math.sin(Lt.moonAz) * 0.5);
    k.pass(compP, { uBase: baseRT, uUnder: underRT, uSim: { tex: R ? R.tex : baseRT.tex }, uHasSim: R ? 1 : 0, uSimTx: R ? [1 / R.w, 1 / R.h] : [0, 0],
      uA: A, uN: N, uT: T, uEdge: L.edge, uWetLine: L.wetLine, uRecede: L.recede, uBores: L.bores, uBoreA: L.boreA,
      uShallow: opt.shallow, uDeep: opt.deep, uMoonGlint: [moonX, smooth(-0.02, 0.1, Lt.moonElev) * Lt.night] }, k.sceneRT);
  };
  return L;
}

// ─── Layer: meadow (ground + instanced plants) ─────────────────────────────────────────────────────
// Default: a procedural ground cover (grass tufts, clover, leaf rosettes). Add flower drifts declaratively:
//   flowers: { images: {name: canvas|img}, kinds: [{name, size: [min, max] (px @1000), weight}], clusters, per: [min, max] }
// or take over completely with plants(k) → {sheet, list}. layer.blooms = flower-head instances (perches);
// layer.field.sway(it) → where that head is right now (JS twin of the GPU sway). layer.bloom = breath/beat scale.
function meadow(o = {}) {
  const opt = Object.assign({ soil: [0.16, 0.12, 0.08], grass: [0.2, 0.3, 0.12], dof: 0.7, shadow: 0.5, push: 26, plants: null, density: 1, flowers: null, zone: CALM_X }, o);
  const GROUND = `
  uniform vec3 uSoil, uGrass;
  void main(){
    vec2 px = kitPx(), g = px / uView.y;
    float m = fbm(g * 3.0), m2 = fbm3(g * 14.0 + 3.0), fine = noise(px * 0.45) * 0.5 + noise(px * 0.9 + 4.0) * 0.5;
    vec3 c = mix(uSoil, uGrass, smoothstep(0.3, 0.7, m) * 0.8 + 0.2);
    c *= 0.65 + 0.45 * m2; c *= 0.85 + 0.25 * fine;
    vec2 cell = floor(px / 7.0); float h = hash(cell); vec2 f = fract(px / 7.0) - 0.5;       // short blade strokes
    float ang = h * 6.28; vec2 d = vec2(cos(ang), sin(ang)); float along = dot(f, d), across = dot(f, vec2(-d.y, d.x));
    float blade = smoothstep(0.12, 0.0, abs(across)) * smoothstep(0.5, 0.2, abs(along)) * step(0.35, h);
    c = mix(c, uGrass * (1.1 + 0.5 * hash(cell + 2.0)), blade * 0.55);
    o = vec4(c, 1.0);
  }`;
  // Photo ground: texture-bombed (two rotated lookups blended by noise) so a tile never visibly repeats.
  const PHOTO = `
  uniform sampler2D uImg; uniform float uScale; uniform vec3 uSoil;
  void main(){
    vec2 px = kitPx(), p = px / uScale;
    vec3 a = texture(uImg, p).rgb, b = texture(uImg, mat2(0.8, -0.6, 0.6, 0.8) * p * 1.17 + 0.37).rgb, c = texture(uImg, mat2(-0.5, 0.87, -0.87, -0.5) * p * 0.91 + 0.71).rgb;
    float m = smoothstep(0.35, 0.65, fbm3(p * 1.3)), m2 = smoothstep(0.4, 0.7, fbm3(p * 0.9 + 5.0));
    vec3 col = mix(mix(a, b, m), c, m2 * 0.6);
    col *= 0.62 + 0.5 * fbm3(px / uView.y * 2.5);                    // broad light/shade variation
    col = mix(col, uSoil, smoothstep(0.62, 0.85, fbm3(px / uView.y * 4.0 + 9.0)) * 0.35);
    o = vec4(col, 1.0);
  }`;
  const LIT = `
  uniform sampler2D uBase;
  void main(){
    vec2 px = kitPx(); vec3 b = texture(uBase, px / uView).rgb;
    float cs = max(kitCloudShadow(px), kitShade(px));
    vec3 c = b * (uLight * uAmb * (1.0 - cs) * 0.85 + uZenith * 0.18 + 0.015);
    c = mix(c, c * vec3(0.7, 0.75, 0.78), uWet * 0.5);
    float sn = noise(px * 0.03) * 0.6 + noise(px * 0.11) * 0.4;
    c = mix(c, vec3(0.88, 0.91, 0.96) * (uLight * uAmb * 0.9 + uZenith * 0.25 + 0.04) * (0.8 + 0.3 * sn), min(1.0, uSnow * 2.5) * smoothstep(0.75 - uSnow * 0.8, 0.95 - uSnow * 0.8, sn));
    o = vec4(c, 1.0);
  }`;
  let gP, lP, pP, baseRT = null, img = null;
  const L = { kind: 'meadow', opt, field: null, blooms: [], bloom: 0, push: opt.push };
  L.init = (k) => { gP = k.program(GROUND); lP = k.program(LIT); pP = k.program(PHOTO); if (opt.groundImage) img = k.image(opt.groundImage, true); };
  // The bed is laid out once per size/clear band: the host sends 'layout' whenever the icons/widgets (avoid boxes)
  // move, and re-planting on each of those made the flowers jump around. buildPlants is seeded, so even a real
  // resize regrows the same bed rather than a new random one.
  let bedKey = '';
  L.resize = (k) => {
    const key = [k.W, k.H, Math.round(k.layout.clearPx[0]), Math.round(k.layout.clearPx[1])].join(',');
    if (L.field && key === bedKey) return;
    bedKey = key;
    k.free(baseRT); baseRT = opt.ground === false ? null : k.target(k.sceneRT.w, k.sceneRT.h); L.baked = false;
    if (L.field) { L.field.free(); if (L.sheet && !opt.plants) k.gl.deleteTexture(L.sheet.tex); }
    const P = opt.plants ? opt.plants(k) : buildPlants(k, opt);
    L.sheet = P.sheet; L.field = k.field(P.sheet, P.list); L.blooms = P.list.filter((p) => p.bloom > 0);
  };
  L.draw = (k) => {
    if (opt.ground !== false) {
      if (!L.baked) { if (img) k.pass(pP, { uImg: img, uScale: (opt.groundScale || 420) * Math.min(k.W, k.H) / 1000, uSoil: opt.soil }, baseRT); else k.pass(gP, { uSoil: opt.soil, uGrass: opt.grass }, baseRT); L.baked = true; }
      k.pass(lP, { uBase: baseRT }, k.sceneRT);
    } else k.bindScene();
    L.field.draw({ shadow: opt.shadow * lerp(0.35, 1, k.L.day) * (1 - k.L.cloud * 0.5), dof: opt.dof, bloom: L.bloom, push: L.push });
  };
  return L;
}
function buildPlants(k, opt) {
  // seeded (opt.seed): the same size grows the same bed; flowers draw from their own stream so a width change that
  // adds a row of ground cover doesn't reshuffle every flower
  const stream = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const seed = opt.seed ?? 20261004, rG = stream(seed), rF = stream(seed ^ 0x5bd1e995);
  let rnd = rG;
  const rand = (a = 1, b) => (b === undefined ? rnd() * a : a + rnd() * (b - a)), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  // ground cover: image clumps (opt.foliage = {images, kinds: [{name, size, weight, sway}], density}) or procedural tufts
  const FO = opt.foliage;
  const S = FO ? Object.assign({}, FO.images) : { tA: paint.grassTuft(128, [70, 104, 46], 26, 1), tB: paint.grassTuft(128, [86, 112, 50], 22, 2), tC: paint.grassTuft(112, [62, 94, 52], 30, 3),
    r: paint.leafRosette(150, [58, 98, 48], 7, 4), r2: paint.leafRosette(150, [66, 104, 44], 9, 6, 0.3), c: paint.clover(96, [66, 108, 52], 9, 5) };
  const kindsG = FO ? FO.kinds : [{ name: 'tA', size: [60, 100], weight: 1.8, tuft: true }, { name: 'tB', size: [60, 100], weight: 1.8, tuft: true }, { name: 'tC', size: [60, 100], weight: 1.8, tuft: true },
    { name: 'c', size: [46, 80], weight: 2.3 }, { name: 'r', size: [70, 120], weight: 1.1 }, { name: 'r2', size: [70, 120], weight: 1.1 }];
  const F = opt.flowers; if (F) Object.assign(S, F.images);
  const sheet = k.sheet(S), list = [], heads = [], u = Math.min(k.W, k.H) / 1000, W = k.W, H = k.H;
  const depthAt = (y) => 0.72 + 0.42 * (y / H);                  // slightly-above camera: nearer = bigger
  const totG = kindsG.reduce((a, q) => a + (q.weight || 1), 0);
  const chooseG = () => { let r = rand(totG); for (const q of kindsG) if ((r -= q.weight || 1) <= 0) return q; return kindsG[0]; };
  const step = (FO ? 90 : 46) * u / Math.sqrt((FO && FO.density) || opt.density);
  for (let y = -40; y < H + 60; y += step * 0.8) for (let x = -40; x < W + 40; x += step) {
    const px = x + rand(-step, step) * 0.6, py = y + rand(-step, step) * 0.5, d = depthAt(py), q = chooseG(), f = sheet.f[q.name], tuft = !!q.tuft;
    const sz = rand(q.size[0], q.size[1]) * d * u * 1.15;
    list.push({ f, x: px, y: py, w: sz, h: sz * f.aspect, rot: tuft ? rand(-0.25, 0.25) : rand(TAU), pivot: tuft ? 0.95 : 0.5, height: tuft ? sz * 0.25 : sz * (q.height ?? 0.1), sway: q.sway ?? (tuft ? 9 : 2.5), tint: [rand(0.82, 1.08), rand(0.88, 1.08), rand(0.82, 1.04)] });
  }
  if (F) {
    rnd = rF;
    const kinds = F.kinds, tot = kinds.reduce((a, q) => a + (q.weight || 1), 0), under = F.under || (FO ? kindsG.map((q) => q.name) : ['r', 'r2']);
    const choose = () => { let r = rand(tot); for (const q of kinds) if ((r -= q.weight || 1) <= 0) return q; return kinds[0]; };
    const nC = F.clusters ?? 14, per = F.per || [3, 8];
    for (let c = 0; c < nC; c++) {
      const q = choose(), cx = rand(k.layout.clearPx[0] + 0.03 * W, k.layout.clearPx[1] - 0.02 * W), cy = rand(0.06, 0.97) * H, n = Math.round(rand(per[0], per[1] + 1)), R = rand(60, 120) * u;
      for (let i = 0; i < n; i++) {
        const a = rand(TAU), rr = Math.sqrt(rnd()) * R, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8, d = depthAt(y);
        if (heads.some((h) => Math.hypot(h.x - x, h.y - y) < (h.w * 0.5))) continue;
        const sz = rand(q.size[0], q.size[1]) * d * u, f = sheet.f[q.name], ht = rand(40, 75) * d * u;
        if (i % 2 === 0) { const uf = sheet.f[pick(under)], us = sz * rand(1.6, 2.2); list.push({ f: uf, x: x + rand(-10, 10), y: y + rand(4, 16), w: us, h: us * uf.aspect, rot: rand(TAU), pivot: 0.5, height: ht * 0.35, sway: 3, tint: [0.78, 0.88, 0.78], under: true }); }
        heads.push({ f, name: q.name, x, y, w: sz, h: sz * f.aspect, rot: rand(TAU), pivot: 0.5, height: ht, sway: 7 + ht * 0.08, bloom: 1, tint: [rand(0.92, 1.05), rand(0.92, 1.05), rand(0.92, 1.05)] });
      }
    }
  }
  list.sort((a, b) => a.y - b.y); heads.sort((a, b) => a.y - b.y);
  return { sheet, list: list.concat(heads) };
}
// slice(img, [x, y, w, h]) → a canvas (for packing atlas frames together with procedural sprites).
function slice(img, f) { const c = canvas(f[2], f[3]); c.getContext('2d').drawImage(img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]); return c; }

// ─── Layer: plate (photo / painted backdrops, e.g. Codex-generated) ────────────────────────────────
// Kit.plate({ plates: {day, dusk, night, overcast}, masks: {sky, water, exposed, emissive}, occluders: [{mask, base}],
//             fit: 'cover', focus: [fx, fy], mirror: true, emissive: 1, shimmer: 1 })
//   Values are k.assets names (declare them in def.assets) or images. Only `day` is required: missing plates are
//   graded from it. Plates crossfade by lighting (night ← k.L.night, dusk ← golden, overcast ← cloud cover).
//   sky mask (white = sky)     → the live Kit.sky drawn before this layer shows through (clouds, sun, moon, stars)
//   water mask                 → shimmer (animated refraction of the plate), click/rain ripples, sun/moon sparkle
//   emissive mask (RGB lights) → night lights; if absent and a night plate exists: auto = night − day (lit windows,
//                                lamps), faded in through dusk so they switch on before the night plate takes over
//   exposed mask (white = open sky above) → where rain/snow fall, splash, wet and snow settle (k.exposedAt)
//   occluders: [{mask, base: ny}] → plate pixels that must sit IN FRONT of sprites whose ground point is above base;
//                                after drawing a sprite: layer.occlude(groundYpx, [x0, y0, x1, y1])
//   layer.toScreen(nx, ny) / fromScreen(x, y) / pxScale (screen px per plate px) / maskAt(name, x, y, default)
//   layout: {layout | layoutUrl: 'layout.json', base: 'art/'} reads plates, occluders, paths and the scale model from a
//   layout.json (art-src/airport format) → layer.path('rollout') (screen Kit.path), layer.pxPerMetre(nx, ny)
//   Layout: mirrors with LW.layout (opt.mirror) so the busy side of the plate stays out of the widgets' way.
function plate(o = {}) {
  const opt = Object.assign({ plates: {}, masks: {}, occluders: [], fit: 'cover', focus: [0.5, 0.5], mirror: true, emissive: 1, shimmer: 1, sparkle: 1, maxScale: 1 }, o);
  const FS = `
  uniform sampler2D uPDay, uPDusk, uPNight, uPOver, uSkyM, uWaterM, uExpM, uEmM, uSim, uOccM;
  uniform vec4 uW, uFit, uHas, uHasM; uniform vec2 uSimTx; uniform float uMirror, uEmK, uShimmer, uSparkle, uOcc, uMoonExposure;
  vec2 toPlate(vec2 px){ if (uMirror > 0.5) px.x = uView.x - px.x; return (px - uFit.xy) / uFit.zw; }
  void main(){
    vec2 px = kitPx(), uv = toPlate(px);
    float skyM = uHasM.x > 0.5 ? texture(uSkyM, uv).r : 0.0;
    float waterM = uHasM.y > 0.5 ? texture(uWaterM, uv).r : 0.0;
    float expM = uHasM.z > 0.5 ? texture(uExpM, uv).r : 1.0;
    vec2 duv = uv, slope = vec2(0.0);
    if (waterM > 0.01) {
      vec2 g = px / uView.y * 70.0;
      slope = vec2(noise(g + uTime * vec2(0.8, 0.3)) - 0.5, noise(g * 1.3 - uTime * vec2(0.4, 0.9)) - 0.5) * (0.6 + uWind.x * 0.6);
      if (uHasM.w > 0.5) { vec2 suv = px / uView; slope += vec2(texture(uSim, suv + vec2(uSimTx.x, 0)).r - texture(uSim, suv - vec2(uSimTx.x, 0)).r, texture(uSim, suv + vec2(0, uSimTx.y)).r - texture(uSim, suv - vec2(0, uSimTx.y)).r) * 6.0; }
      duv += slope * 0.004 * uShimmer * waterM * vec2(1.0, 0.6);
    }
    vec3 day = texture(uPDay, duv).rgb;
    vec3 dusk = uHas.x > 0.5 ? texture(uPDusk, duv).rgb : day * vec3(1.06, 0.8, 0.6) * 0.8;
    // Preserve painted practical lights while retaining surface detail on dark masters.
    vec3 moonlit = day * vec3(0.32, 0.39, 0.51) * uMoonExposure + vec3(0.012, 0.018, 0.028);
    vec3 night = uHas.y > 0.5 ? max(texture(uPNight, duv).rgb, moonlit) : moonlit;
    vec3 over = uHas.z > 0.5 ? texture(uPOver, duv).rgb : mix(vec3(dot(day, vec3(0.3, 0.59, 0.11))), day, 0.55) * 0.78;
    vec3 col = day * uW.x + dusk * uW.y + night * uW.z + over * uW.w;
    // night lights: explicit emissive mask, or what the night plate has that daylight doesn't
    vec3 em = uHas.w > 0.5 ? texture(uEmM, uv).rgb : max(night - day * 0.5 - 0.06, 0.0) * 1.4 * uHas.y;
    col += em * uEmK * (0.97 + 0.03 * sin(uTime * 13.0 + uv.x * 40.0));
    // water: sky in the ripples + sun/moon sparkle
    if (waterM > 0.01) {
      col += uSkyRefl * length(slope) * 0.12 * waterM;
      vec2 sc = floor(px / 1.6);
      float sp = step(0.9975, hash(sc + floor(uTime * 6.0 + hash(sc) * 6.0) * 0.61)) * waterM * uSparkle;
      col += (uLight * uAmb * (0.4 + uDay) + vec3(0.6, 0.65, 0.75) * uNight * 0.4) * sp;
    }
    // weather on exposed ground: wet darkens + sheen, snow settles on the lit, up-facing bits first
    float ground = expM * (1.0 - waterM) * (1.0 - skyM);
    col = mix(col, col * vec3(0.72, 0.74, 0.78) + uSkyRefl * 0.05, uWet * ground * 0.7);
    float sheen = pow(max(0.0, noise(px * vec2(0.008, 0.16)) - 0.28), 2.0);
    col += mix(vec3(0.22,0.27,0.32),vec3(0.10,0.15,0.23),uNight) * sheen * uWet * ground;
    float lum = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col, vec3(0.9, 0.93, 0.98) * (uAmb * 0.9 + 0.1), uSnow * ground * smoothstep(0.08, 0.5, lum + uSnow * 0.25 + (fbm3(px * 0.02) - 0.5) * 0.3));
    float a = 1.0 - skyM;
    if (uOcc > 0.5) a = texture(uOccM, uv).r;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) a = 0.0;
    o = vec4(col * a, a);
  }`;
  const L = { kind: 'plate', opt, tex: {}, masks: {}, occ: [] };
  let prog, fit = [0, 0, 1, 1], mirror = false, pw = 1, ph = 1, k = null;
  // layout.json (the art-src/airport format): plates, occluders, paths, scale model — all in 0..1 plate coords.
  //   opt.layout: an object, or opt.layoutUrl: 'layout.json' (fetched before the images); opt.base: folder prefix.
  const base = opt.base || '';
  function fromLayout(J) {
    L.layout = J; const A = {};
    if (J.plate && J.plate.files) for (const f of J.plate.files) { const n = ['day', 'dusk', 'night', 'overcast'].find((w) => f.includes(w)); if (n && !opt.plates[n]) { A['plate_' + n] = base + f; opt.plates[n] = 'plate_' + n; } }
    const items = (J.occluders && J.occluders.items) || [];
    if (!opt.occluders.length) opt.occluders = items.map((it) => { A['occ_' + it.id] = base + it.file; return { mask: 'occ_' + it.id, base: it.base_y, box: it.bbox }; });
    return A;
  }
  L.preload = async () => {
    let J = opt.layout;
    if (!J && opt.layoutUrl) J = await fetch(base + opt.layoutUrl).then((r) => r.json()).catch(() => null);
    const A = {};
    for (const [n, v] of Object.entries(opt.plates)) if (typeof v === 'string' && /[./]/.test(v)) { A['plate_' + n] = base + v; opt.plates[n] = 'plate_' + n; }
    for (const [n, v] of Object.entries(opt.masks)) if (typeof v === 'string' && /[./]/.test(v)) { A['mask_' + n] = base + v; opt.masks[n] = 'mask_' + n; }
    return Object.assign(A, J ? fromLayout(J) : {});
  };
  // A layout path (name or [[nx, ny]…]) as a screen-space Kit.path (re-ask after a resize/layout change).
  L.path = (p) => path((typeof p === 'string' ? L.layout.paths[p] : p).map(([x, y]) => L.toScreen(x, y)));
  // Ground-plane scale: screen px per metre at a plate point, from layout.scale (K·max(0, ny − horizon)^P, in px of the
  // plate width it was measured on) or opt.scale(nx, ny) → plate-px per metre.
  L.pxPerMetre = (nx, ny) => {
    const S = L.layout && L.layout.scale, ref = (L.layout && L.layout.plate && L.layout.plate.size && L.layout.plate.size[0]) || pw;
    const ppm = opt.scale ? opt.scale(nx, ny) : S ? S.K * Math.pow(Math.max(0, ny - S.horizon_y), S.P) * (pw / ref) : 1;
    return ppm * L.pxScale;
  };
  const src = (v) => (typeof v === 'string' ? k.assets[v] : v);
  function cpuMask(img, w = 192) {   // a small luminance copy for k.exposedAt / k.surfaceAt / maskAt
    const h = Math.max(1, Math.round(w * img.height / img.width)), c = canvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3 * (d[i * 4 + 3] / 255);
    return { m, w, h };
  }
  L.toScreen = (nx, ny) => { const x = fit[0] + nx * fit[2], y = fit[1] + ny * fit[3]; return [mirror ? k.W - x : x, y]; };
  L.fromScreen = (x, y) => [((mirror ? k.W - x : x) - fit[0]) / fit[2], (y - fit[1]) / fit[3]];
  L.maskAt = (name, x, y, def = 0) => { const M = L.masks[name]; if (!M) return def; const [nx, ny] = L.fromScreen(x, y); if (nx < 0 || ny < 0 || nx >= 1 || ny >= 1) return def; return M.m[Math.floor(ny * M.h) * M.w + Math.floor(nx * M.w)] / 255; };
  // Upload no bigger than the screen needs (internal resolution × cover scale): 4 plates stay ~25 MB, not ~85 MB.
  function sized(im, f = 1) {
    const need = Math.max(k.W / im.width, k.H / im.height) * Math.min(k.DPR || devicePixelRatio || 1, Math.sqrt(1.7e6 / (k.W * k.H))) * opt.maxScale * f;
    if (need >= 0.95) return im;
    const c = canvas(im.width * need, im.height * need); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c;
  }
  L.init = (kk) => {
    k = kk; k.plateLayer = L; prog = k.program(FS);
    for (const n of ['day', 'dusk', 'night', 'overcast']) { const im = src(opt.plates[n]); if (im) L.tex[n] = k.image(sized(im), false); }
    for (const n of ['sky', 'water', 'exposed', 'emissive']) { const im = src(opt.masks[n]); if (im) { L.tex['m_' + n] = k.image(sized(im), false); L.masks[n] = cpuMask(im); } }
    L.occ = opt.occluders.map((oc) => { const im = src(oc.mask); return im ? { base: oc.base, tex: k.image(sized(im, 0.75), false), box: oc.box || [0, 0, 1, 1] } : null; }).filter(Boolean);
    const d = src(opt.plates.day); pw = d.width; ph = d.height;
  };
  L.resize = () => {
    const sc = opt.fit === 'contain' ? Math.min(k.W / pw, k.H / ph) : Math.max(k.W / pw, k.H / ph), w = pw * sc, h = ph * sc;
    fit = [(k.W - w) * opt.focus[0], (k.H - h) * opt.focus[1], w, h]; L.pxScale = sc; mirror = !!(opt.mirror && k.layout.mirror);
    if (L.tex.m_water) k.ripples;
  };
  function weights(Lt) {
    const n = smooth(0.35, 0.85, Lt.night), g = Lt.golden * (1 - n) * (L.tex.dusk ? 1 : 0.6), ov = smooth(0.55, 0.92, Lt.cloud) * (1 - n) * (1 - g);
    const d = Math.max(0, 1 - n - g - ov), sum = d + g + n + ov || 1;
    return [d / sum, g / sum, n / sum, ov / sum];
  }
  function uniforms(occ) {
    const Lt = k.L, T = L.tex, R = T.m_water ? k.ripples : null, w = weights(Lt);
    const lightsOn = smooth(0.12, 0.5, Lt.night + Lt.golden * 0.3);
    return { uPDay: T.day, uPDusk: T.dusk || T.day, uPNight: T.night || T.day, uPOver: T.overcast || T.day, uSkyM: T.m_sky || T.day, uWaterM: T.m_water || T.day,
      uExpM: T.m_exposed || T.day, uEmM: T.m_emissive || T.day, uSim: { tex: R && R.tex ? R.tex : T.day.tex }, uOccM: occ ? occ.tex : T.day,
      uW: w, uFit: fit, uMirror: mirror ? 1 : 0, uHas: [T.dusk ? 1 : 0, T.night ? 1 : 0, T.overcast ? 1 : 0, T.m_emissive ? 1 : 0],
      uHasM: [T.m_sky ? 1 : 0, T.m_water ? 1 : 0, T.m_exposed ? 1 : 0, R && R.tex ? 1 : 0], uSimTx: R ? [1 / R.w, 1 / R.h] : [0, 0],
      uMoonExposure: 0.82 + 0.18 * Lt.moonFrac, uEmK: opt.emissive * (T.m_emissive ? lightsOn : Math.max(0, lightsOn - w[2]) + 0.15 * w[2]), uShimmer: opt.shimmer, uSparkle: opt.sparkle, uOcc: occ ? 1 : 0 };
  }
  L.draw = () => { k.pass(prog, uniforms(null), k.sceneRT, true); };
  // Redraw plate pixels that stand in front of a sprite whose ground point is at screen y = groundY (clipped to rect).
  L.occlude = (groundY, rect) => {
    const ny = (groundY - fit[1]) / fit[3], gl = k.gl; let any = false;
    for (const oc of L.occ) {
      if (oc.base <= ny) continue;
      const [a0, a1] = [L.toScreen(oc.box[0], oc.box[1]), L.toScreen(oc.box[2], oc.box[3])];
      const bx0 = Math.max(Math.min(a0[0], a1[0]), rect[0]), bx1 = Math.min(Math.max(a0[0], a1[0]), rect[2]), by0 = Math.max(a0[1], rect[1]), by1 = Math.min(a1[1], rect[3]);
      if (bx1 <= bx0 || by1 <= by0) continue;
      if (!any) { k.batch.flush(); any = true; }
      const s = k.res; gl.enable(gl.SCISSOR_TEST); gl.scissor(Math.floor(bx0 * s), Math.floor(by0 * s), Math.ceil((bx1 - bx0) * s) + 1, Math.ceil((by1 - by0) * s) + 1);
      k.pass(prog, uniforms(oc), k.sceneRT, true); gl.disable(gl.SCISSOR_TEST);
    }
  };
  return L;
}

// ─── Layer: particles (rain, snow, fireflies, pollen, petals, leaves) ────────────────────────────
function particles(o = {}) {
  const opt = Object.assign({ rain: true, snow: true, fireflies: 0, pollen: 0, petals: 0, leaves: 0, splash: true, view: 'down', region: null }, o);
  const P = { kind: 'particles', opt, list: [], flies: [] };
  let sheet = null;
  P.init = (k) => {
    const pc = opt.petalColors || [[240, 200, 210], [250, 240, 236], [236, 170, 190]];
    const src = {}; pc.forEach((c, i) => (src['p' + i] = paint.petal(28, c)));
    [[150, 110, 50], [176, 128, 46], [120, 92, 40], [96, 120, 50]].forEach((c, i) => (src['l' + i] = paint.leaf(36, c)));
    sheet = k.sheet(src); P.npetal = pc.length;
  };
  P.burst = (x, y, n, col, speed = 220, life = 0.7, size = 2.2, puff = 0) => { if (puff) P.list.push({ type: 'puff', x, y, age: 0, life: 0.9, s: puff, col }); for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(0.3, 1) * speed; P.list.push({ type: 'spray', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.4, z: 0, age: 0, life: life * rand(0.6, 1.2), s: size * rand(0.6, 1.3), col }); } };
  P.update = (dt, t, k) => {
    const env = root.LW.env, w = env.weather, it = env.intensity ?? 0.7, W = k.W, H = k.H, wind = k.wind;
    const raining = opt.rain && (w === 'rain' || w === 'storm'), snowing = opt.snow && w === 'snow';
    const want = raining ? Math.min(1600, (w === 'storm' ? 680 : 440) * (0.5 + it) * W * H / 1296000) : 0, wantS = snowing ? 140 * (0.5 + it) : 0;
    let nr = 0, ns = 0, np = 0, nl = 0, npo = 0; for (const p of P.list) { if (p.type === 'rain') nr++; else if (p.type === 'snow') ns++; else if (p.type === 'petal') np++; else if (p.type === 'leaf') nl++; else if (p.type === 'pollen') npo++; }
    const spot = (x0, x1, y0, y1) => { for (let i = 0; i < 4; i++) { const x = rand(x0, x1), y = rand(y0, y1); if (k.exposedAt(x, y)) return [x, y]; } return null; };
    for (; nr < want; nr++) { const s = spot(-60, W + 60, -H * 0.2, H); if (!s) continue; P.list.push({ type: 'rain', x: s[0], y: s[1], z: rand(0.4, 1), age: 0, life: rand(0.5, 0.9) }); }
    for (; ns < wantS; ns++) { const s = spot(-50, W, -50, H); if (!s) break; P.list.push({ type: 'snow', x: s[0], y: s[1], z: rand(0.3, 1), age: 0, life: rand(4, 9), ph: rand(TAU) }); }
    const day = k.L.day > 0.5 && !raining && !snowing;
    if (day && np < opt.petals && Math.random() < dt * 0.6) P.list.push({ type: 'petal', i: Math.floor(rand(P.npetal)), x: rand(-40, W * 0.6), y: rand(-40, H), z: rand(0.5, 1), age: 0, life: rand(8, 14), rot: rand(TAU), vr: rand(-2, 2), ph: rand(TAU) });
    if (day && nl < opt.leaves && Math.random() < dt * 0.3) P.list.push({ type: 'leaf', i: Math.floor(rand(4)), x: rand(-40, W * 0.5), y: rand(-60, H * 0.7), z: rand(0.6, 1), age: 0, life: rand(9, 15), rot: rand(TAU), vr: rand(-2.5, 2.5), ph: rand(TAU) });
    if (day && npo < opt.pollen) P.list.push({ type: 'pollen', x: rand(W), y: rand(H), z: rand(0.3, 1), age: 0, life: rand(6, 14), ph: rand(TAU) });
    for (let i = P.list.length - 1; i >= 0; i--) {
      const p = P.list[i]; p.age += dt;
      const wx = wind.at(p.x, p.y) * wind.strength * wind.dir[0], wy = wind.at(p.x, p.y) * wind.strength * wind.dir[1];
      if (p.type === 'rain') { p.x += (wx * 3 + 40) * dt * p.z; p.y += 900 * dt * p.z; }
      else if (p.type === 'snow') { p.x += (wx * 0.8 + noise1(p.ph + t * 0.3) * 18) * dt * p.z; p.y += 28 * dt * p.z; }
      else if (p.type === 'petal' || p.type === 'leaf') { p.x += (wx * 1.6 + noise1(p.ph + t * 0.4) * 20) * dt; p.y += (wy + 14 + noise1(p.ph * 2 + t * 0.5) * 16) * dt; p.rot += p.vr * dt; }
      else if (p.type === 'pollen') { p.x += (wx * 0.6 + noise1(p.ph + t * 0.25) * 10) * dt; p.y += (wy * 0.6 + noise1(p.ph * 3 + t * 0.25) * 10) * dt; }
      else if (p.type === 'spray') { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-dt * 2); }
      if (p.age > p.life) {
        if (p.type === 'rain' && Math.random() < 0.5 && k.exposedAt(p.x, p.y)) {
          const surf = k.surfaceAt(p.x, p.y);                                       // rings only on exposed ground
          if ((surf === 'ground' || surf === 'water') && opt.splash) P.list.push({ type: 'splash', x: p.x, y: p.y, age: 0, life: 0.35, z: p.z });
          if (surf === 'water' && k.ripples) k.ripples.drop(p.x, p.y, 3, -0.08);
          if (surf && opt.onHit) opt.onHit(p.x, p.y, k, surf);
        }
        P.list.splice(i, 1);
      }
    }
    // fireflies: warm, dry dusk/night
    const m = new Date().getMonth(), wantF = opt.fireflies && k.L.night > 0.45 && !raining && !snowing && (opt.anyMonth || (m >= 3 && m <= 9)) ? opt.fireflies : 0;
    while (P.flies.length < wantF) { const r = opt.region || [0, 0.25, CALM_X, 1]; P.flies.push({ x: rand(r[0], r[2]) * W, y: rand(r[1], r[3]) * H, ph: rand(TAU), s: rand(0.6, 1.2), a: 0 }); }
    P.flies.forEach((f, i) => { f.x += noise1(f.ph + t * 0.2) * 14 * dt; f.y += noise1(f.ph * 3 + t * 0.2) * 12 * dt; f.a = ease(f.a, i < wantF ? 1 : 0, 0.5, dt); });
    for (let i = P.flies.length - 1; i >= 0; i--) if (i >= wantF && P.flies[i].a < 0.02) P.flies.splice(i, 1);
  };
  P.draw = (k, t) => {
    const b = k.batch, Lt = k.L, tint = Lt.tint;
    const rainC = [0.75, 0.8, 0.88].map((v, i) => v * (Lt.amb * 0.8 + 0.25) + Lt.zenith[i] * 0.2);
    b.use(sheet);
    for (const p of P.list) {
      const fade = Math.min(1, p.age * 3) * Math.min(1, (p.life - p.age) * 2);
      if (p.type === 'rain') { const len = (18 + 48 * p.z) * Math.sqrt(k.H / 900), dx = (k.wind.base * 0.08 + 0.04) * len; b.line(p.x, p.y, p.x + dx, p.y + len, 1 + p.z * 0.8, rainC, 0.0, 1, (0.38 + 0.32 * p.z) * Math.min(1, p.age * 14, (p.life - p.age) * 14)); }
      else if (p.type === 'splash') { const q = p.age / p.life; b.ring(p.x, p.y, 2 + q * 7 * p.z, rainC, (1 - q) * 0.6, 0.14); }
      else if (p.type === 'snow') { const sz = (1.2 + 2.6 * p.z); b.glow(p.x, p.y, sz * 1.6, [0.95, 0.97, 1].map((v) => v * (Lt.amb * 0.7 + 0.35)), 0.85 * fade * p.z, 0, 2.2); }
      else if (p.type === 'petal' || p.type === 'leaf') { const f = sheet.f[(p.type === 'petal' ? 'p' : 'l') + p.i], s = (p.type === 'petal' ? 16 : 22) * p.z, flip = Math.cos(t * 2.4 + p.ph); b.shadow(f, p.x + Lt.sunDir[0] * 18, p.y + Lt.sunDir[1] * 18, s, s * Math.abs(flip) + 2, p.rot, 0.18 * fade, 2.5); b.sprite(f, p.x, p.y, s, s * Math.abs(flip) + 2, p.rot, tint, fade); }
      else if (p.type === 'pollen') { const sun = Lt.light.map((v) => v * Lt.amb), tw = 0.5 + 0.5 * Math.sin(t * 2 + p.ph); b.glow(p.x, p.y, 2.2 + 2 * p.z, sun, 0.45 * fade * tw * Lt.day, 1, 2.5); }
      else if (p.type === 'spray') { const q = p.age / p.life; b.glow(p.x, p.y, p.s * 1.4, p.col || [0.92, 0.96, 1], (1 - q) * 0.9, 0.2, 2.6); }
      else if (p.type === 'puff') { const q = p.age / p.life; b.glow(p.x, p.y, p.s * (0.6 + q * 0.8), p.col, (1 - q) * (1 - q) * 0.75, 0, 1.6); b.ring(p.x, p.y, p.s * (0.5 + q * 1.6), p.col, (1 - q) * 0.5, 0.12); }
    }
    for (const f of P.flies) {
      const glow = f.a * Math.pow(0.5 + 0.5 * Math.sin(t * 1.3 * f.s + f.ph), 3);
      if (glow < 0.02) continue;
      b.glow(f.x, f.y, 16 * f.s, [0.9, 0.95, 0.45], glow * 0.55, 1, 2.2); b.glow(f.x, f.y, 3 * f.s, [1, 1, 0.75], glow * 1.4, 1, 1.5);
    }
  };
  // Plate weather is clipped across its entire footprint, including streak tips
  // and splash rings. Non-plate scenes retain their own exposure contract.
  const drawParticles = P.draw, initParticles = P.init;
  let weatherRT, clipProgram;
  P.init = k => {
    initParticles(k);
    clipProgram = k.program(`uniform sampler2D uWeather,uSkyMask,uGroundMask,uWaterMask;
      uniform vec4 uBox; uniform vec3 uMasks;
      void main(){vec2 px=kitPx(),uv=(px-uBox.xy)/uBox.zw;
        float mask=max(texture(uSkyMask,uv).r*uMasks.x,max(texture(uGroundMask,uv).r*uMasks.y,texture(uWaterMask,uv).r*uMasks.z));
        if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))mask=0.0;
        o=texture(uWeather,px/uView)*mask;}`);
  };
  P.resize = k => { if(weatherRT)k.free(weatherRT); weatherRT=null; };
  P.draw = (k,t) => {
    const plate=k.plateLayer, T=plate?.tex;
    if(!T?.m_exposed){drawParticles(k,t);return;}
    if(!weatherRT)weatherRT=k.target(k.W*k.res,k.H*k.res,false);
    k.batch.flush(); k.bindTarget(weatherRT);
    k.gl.clearColor(0,0,0,0); k.gl.clear(k.gl.COLOR_BUFFER_BIT);
    drawParticles(k,t); k.batch.flush();
    const a=plate.toScreen(0,0),z=plate.toScreen(1,1);
    k.pass(clipProgram,{uWeather:weatherRT,uSkyMask:T.m_sky||T.m_exposed,uGroundMask:T.m_exposed,uWaterMask:T.m_water||T.m_exposed,
      uMasks:[T.m_sky?1:0,1,T.m_water?1:0],uBox:[...a,z[0]-a[0],z[1]-a[1]]},k.sceneRT,true);
  };
  return P;
}

// ─── Layer: sprites / life hooks ──────────────────────────────────────────────────────────────────
function sprites(fn, name) { return { kind: 'sprites', name, draw: (k, t) => { fn(k.batch, k, t); } }; }
function life() { return { kind: 'life', draw: (k, t) => { for (const it of k.def.life || []) it.draw && it.draw(k.batch, k, t); } }; }

// ─── Layer: light (final grade to the screen) ──────────────────────────────────────────────────────
function light(o = {}) {
  const opt = Object.assign({ vignette: 0.38, grain: 0.018, glow: 0.35, threshold: 0.75, fog: 1, calmDim: 0.12, exposure: 1, contrast: 1, warmth: 0 }, o);
  const DOWN = `
  uniform sampler2D uSrc; uniform vec2 uTx; uniform float uThresh;
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes; vec3 c = vec3(0.0);
    for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 off = vec2(x,y) * uTx * 1.5; float w = (x==0&&y==0) ? 0.25 : (x==0||y==0) ? 0.125 : 0.0625; c += texture(uSrc, uv + off).rgb * w; }
    o = vec4(max(c - uThresh, 0.0), 1.0);
  }`;
  const GRADE = `
  uniform sampler2D uScene, uGlow; uniform float uGlowK, uVig, uGrain, uFogK, uSatK, uCalm, uExpo, uContrast, uWarm;
  void main(){
    vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);   // flip: scene rows are top-down
    vec2 px = uv * uView, g = px / uView.y;
    vec3 col = texture(uScene, uv).rgb * uExpo;
    col += texture(uGlow, uv).rgb * uGlowK;
    if (uFog * uFogK > 0.005) { float mist = fbm3(g * 1.3 + vec2(uTime * 0.02, -uTime * 0.008));
      vec3 fc = mix(vec3(0.58, 0.62, 0.64), vec3(0.17, 0.2, 0.27), uNight) * (uAmb * 0.85 + 0.12);
      col = mix(col, fc, uFog * uFogK * (0.35 + 0.55 * mist)); }
    col += uSkyRefl * uFlash * 0.6;
    col += vec3(0.012, 0.019, 0.029) * uNight * (1.0 - smoothstep(0.03, 0.3, dot(col, vec3(0.3,0.59,0.11))));
    col = kitSat(col, uSatK);
    col *= vec3(1.0 + uWarm, 1.0 + uWarm * 0.3, 1.0 - uWarm * 0.6);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col *= pow(max(lum, 1e-4) / 0.22, uContrast - 1.0);                       // contrast around mid-grey, hue-preserving
    col *= 1.0 - uCalm;
    float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(uView.x / uView.y * 0.8, 1.0)));
    col *= (1.0 - uVig) + uVig * vig;
    col = col / (1.0 + max(col - 0.7, 0.0) * 0.9);
    col += (fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.0) * 97.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uGrain;
    o = vec4(pow(max(col, 0.0), vec3(0.97)), 1.0);
  }`;
  let dP, gP, g1 = null, g2 = null;
  const L = { kind: 'light', opt };
  L.init = (k) => { dP = k.program(DOWN); gP = k.program(GRADE); };
  L.resize = (k) => { k.free(g1); k.free(g2); g1 = k.target(k.sceneRT.w / 4, k.sceneRT.h / 4, true); g2 = k.target(k.sceneRT.w / 8, k.sceneRT.h / 8, true); };
  L.draw = (k) => {
    if (opt.glow > 0) {
      k.pass(dP, { uSrc: k.sceneRT, uTx: [1 / k.sceneRT.w, 1 / k.sceneRT.h], uThresh: opt.threshold }, g1);
      k.pass(dP, { uSrc: g1, uTx: [1 / g1.w, 1 / g1.h], uThresh: 0 }, g2);
    }
    k.pass(gP, { uScene: k.sceneRT, uGlow: g2 || k.sceneRT, uGlowK: opt.glow, uVig: opt.vignette, uGrain: opt.grain, uFogK: opt.fog, uSatK: k.L.sat, uCalm: opt.calmDim * k.breath.fade, uExpo: opt.exposure, uContrast: opt.contrast, uWarm: opt.warmth }, null);
  };
  return L;
}

// ─── Dev: benchmark in ?virtual=1 ─────────────────────────────────────────────────────────────────
// Each frame starts with the GPU drained (1-px readback), so `js` is pure main-thread time for update + GL submission;
// `gpu` is the wait for that frame's GPU work afterwards (an upper bound: includes the readback round trip).
// Per-layer GPU cost (ms/frame, each layer synced on its own — dev only).
function profile(seconds = 2) {
  const k = root.KIT, LW = root.LW; if (!k || !LW.advance) return null;
  k.profile = { ms: {}, n: 0 }; LW.advance(seconds); const P = k.profile; k.profile = null;
  const out = {}; for (const key in P.ms) out[key] = +(P.ms[key] / P.n).toFixed(2); return out;
}
function bench(seconds = 5) {
  const k = root.KIT, LW = root.LW; if (!k || !LW.advance) return null;
  const js = [], gpu = [], n = Math.round(seconds * 30), sync = k.gpuSync;
  for (let i = 0; i < n; i++) { sync(); LW.advance(1 / 30); js.push(k.stats.last); const t = realNow(); sync(); gpu.push(realNow() - t); }
  const st = (a) => { a.sort((x, y) => x - y); return { p10: +a[Math.floor(a.length * 0.1)].toFixed(3), p50: +a[Math.floor(a.length / 2)].toFixed(3), avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3), p95: +a[Math.floor(a.length * 0.95)].toFixed(3) }; };
  return { js: st(js), gpu: st(gpu), frames: n, internal: [k.sceneRT.w, k.sceneRT.h], css: [k.W, k.H] };
}

const Kit = {
  scene, sky, water, waves, meadow, plate, particles, sprites, life, light,
  palette, steer, rope, spring, path, paint, bench, profile, canvas, slice,
  math: { TAU, rand, clamp, lerp, smooth, ease, angDiff, pick, mix3, noise1, noise2, seeded },
  CALM_X, PRE,
};
root.Kit = Kit;
if (typeof module !== 'undefined' && module.exports) module.exports = Kit;
})(typeof window !== 'undefined' ? window : globalThis);
