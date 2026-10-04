'use strict';
// Gull sprite sheet for the top-down Beach, painted once into a canvas at load (no image file to ship).
// Adult ring-billed / herring type seen from straight above: white head, body and tail, pale grey mantle and upper
// wing with a white trailing edge, black primaries with white "mirror" spots, yellow bill with a red gonys spot.
// Sources: no CC0/CC-BY top-down gull sheet exists (see art-src/beach/refs/README.md), so poses follow references
// (gull flight photos from above + side-view flap timing) and are built here from a jointed wing model.
//
// Frames (all "head up" = forward is −y):
//   w0…w9   right-wing flap cycle (w0 top of the upstroke → full downstroke w2–w3 → bottom w5 → flexed upstroke w6–w8)
//   wGlide  soaring: arm flat, hand swept back      wFlare  landing: wings forward and raised, braking
//   wFold1…3 the wing folding onto the back (take-off reads them backwards)
//            wing frames have their shoulder at FR.wingAnchor (fraction of the cell); the left wing is the mirror.
//   body / bodyFan                flying body (tail closed / fanned for turns and landing)
//   stand lookL lookR crouch sleep walk0…walk5     standing gull (folded wings, primaries crossed over the tail)
// Units: S = wingspan in sheet px. Flying cells are drawn so that 1 sheet px = 1/S of the span; ground cells too.
(function () {
  const S = 220, TAU = Math.PI * 2;
  const COL = { white: '#f6f5f0', whiteSh: '#cdd3d8', mantle: '#a9b2ba', mantleD: '#8d97a1', mantleL: '#c3cad0', black: '#1c1e21',
    blackL: '#3a3d42', bill: '#e9c23c', billD: '#b98f22', red: '#c6382a', leg: '#e5bd5c', legD: '#b48c34', eye: '#16130f', line: 'rgba(52,60,70,0.34)' };
  const WING = { w: Math.round(S * 0.56), h: Math.round(S * 0.7), ax: 6, ay: Math.round(S * 0.22) };   // shoulder at (ax, ay)
  const BODY = { w: Math.round(S * 0.3), h: Math.round(S * 0.6) };                                    // centre = shoulder line
  const GROUND = { w: Math.round(S * 0.34), h: Math.round(S * 0.56) };                                // centre = body centre
  let seed = 9071;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

  // ── jointed wing → projected polygons (arm, hand, primaries) in cell px, shoulder at origin, +x out, +y back ──
  function wingGeom(p) {
    const A = S * 0.2 * p.armK, Hn = S * 0.275 * (p.handK ?? 1);   // half-span 0.5 S minus the body's half-width
    const ca = Math.cos(p.ea), ch = Math.cos(p.ea + p.eh);
    const W = [A * Math.cos(p.fa) * ca, A * Math.sin(p.fa)];
    const hd = p.fa + p.sw, T = [W[0] + Hn * Math.cos(hd) * ch, W[1] + Hn * Math.sin(hd)];
    const ua = [W[0], W[1]], la = Math.hypot(ua[0], ua[1]) || 1, pa = [-ua[1] / la, ua[0] / la];   // arm perpendicular (back)
    const uh = [T[0] - W[0], T[1] - W[1]], lh = Math.hypot(uh[0], uh[1]) || 1, ph = [-uh[1] / lh, uh[0] / lh];
    return { W, T, pa, ph, ca, ch, lh };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const P2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  function poly(g, pts) { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); }
  function shade(hex, k) {   // multiply a #rrggbb by k (k > 1 brightens toward white)
    const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (k <= 1 ? v * k : v + (255 - v) * (k - 1)));
    return `rgb(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')})`;
  }

  // closed outline through pts with every corner rounded (quadratic through the midpoints)
  function smoothPoly(g, pts) {
    const n = pts.length, m = (i) => P2(pts[i % n], pts[(i + 1) % n], 0.5);
    g.beginPath(); const s0 = m(n - 1); g.moveTo(s0[0], s0[1]);
    for (let i = 0; i < n; i++) { const q = m(i); g.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
    g.closePath();
  }
  function paintWing(g, p) {
    const G = wingGeom(p), { W, T, pa, ph } = G;
    const litA = 0.82 + 0.18 * G.ca, litH = 0.82 + 0.18 * G.ch;
    const c0 = S * 0.15, cw = S * 0.125, e = S * 0.026;          // chord at shoulder / wrist; leading-edge offset
    const N = 10, at = (t) => P2(W, T, t);
    // one outline: shoulder → arm leading edge → wrist → hand leading edge → tip → primaries' trailing edge → secondaries
    const lead = [], trail = [];
    for (let i = 0; i <= N; i++) { const t = i / N, q = at(t), b = Math.sin(t * Math.PI) * S * 0.006; lead.push([q[0] - ph[0] * (e + b), q[1] - ph[1] * (e + b)]); }
    for (let i = N; i >= 0; i--) { const t = i / N, q = at(t), c = cw * 0.95 * Math.pow(1 - t, 0.8) + S * 0.02; trail.push([q[0] + ph[0] * (c - e), q[1] + ph[1] * (c - e)]); }
    const armLE = [0, -S * 0.045], armTE = [0, -S * 0.045 + c0];
    const armMidL = P2(armLE, lead[0], 0.5), armMidT = P2(armTE, trail[N], 0.5);
    const outline = [armLE, [armMidL[0] - pa[0] * S * 0.008, armMidL[1] - pa[1] * S * 0.008], ...lead, ...trail, [armMidT[0] + pa[0] * S * 0.012, armMidT[1] + pa[1] * S * 0.012], armTE];
    g.save();
    smoothPoly(g, outline); g.fillStyle = shade(COL.mantle, (litA + litH) / 2); g.fill();
    g.save(); smoothPoly(g, outline); g.clip();
    // soft lighting across the chord: pale leading edge → mid grey → slightly darker before the white trailing band
    const mid = P2(armLE, lead[3], 0.5);
    let gr = g.createLinearGradient(mid[0], mid[1], mid[0] + pa[0] * c0, mid[1] + pa[1] * c0);
    gr.addColorStop(0, shade(COL.mantleL, litA)); gr.addColorStop(0.45, shade(COL.mantle, litA)); gr.addColorStop(1, shade(COL.mantleD, litA));
    g.globalAlpha = 0.85; g.fillStyle = gr; g.fillRect(-S, -S, S * 3, S * 3); g.globalAlpha = 1;
    // hand: grey → black outer primaries
    const b0 = at(0.6), b1 = at(0.74);
    gr = g.createLinearGradient(b0[0], b0[1], b1[0], b1[1]);
    gr.addColorStop(0, 'rgba(28,30,33,0)'); gr.addColorStop(0.35, 'rgba(48,52,58,0.85)'); gr.addColorStop(1, COL.black);
    g.fillStyle = gr; g.beginPath(); const far = 2 * S; g.moveTo(b0[0] - ph[0] * far, b0[1] - ph[1] * far); g.lineTo(b0[0] + ph[0] * far, b0[1] + ph[1] * far);
    g.lineTo(b0[0] + ph[0] * far + (T[0] - W[0]) * 3, b0[1] + ph[1] * far + (T[1] - W[1]) * 3); g.lineTo(b0[0] - ph[0] * far + (T[0] - W[0]) * 3, b0[1] - ph[1] * far + (T[1] - W[1]) * 3); g.closePath(); g.fill();
    // white trailing edge along the secondaries and inner primaries
    g.strokeStyle = shade(COL.white, 0.96 * litA); g.lineWidth = S * 0.026; g.lineCap = 'round';
    g.beginPath(); g.moveTo(armTE[0], armTE[1] + S * 0.004); g.quadraticCurveTo(armMidT[0] + pa[0] * S * 0.012, armMidT[1] + pa[1] * S * 0.012, trail[N][0], trail[N][1]);
    for (let j = N - 1; j >= Math.round(N * 0.45); j--) g.lineTo(trail[j][0], trail[j][1]);   // t 0.1 → 0.55
    g.stroke();
    // mirrors near the tip
    for (const [t, r] of [[0.9, 0.014], [0.79, 0.009]]) { const q = at(t); g.fillStyle = 'rgba(244,244,240,0.95)'; g.beginPath(); g.ellipse(q[0] + ph[0] * S * 0.006, q[1] + ph[1] * S * 0.006, r * S, r * S * 0.7, Math.atan2(T[1] - W[1], T[0] - W[0]), 0, TAU); g.fill(); }
    // feather texture: faint shafts fanning from the hand, coverts' soft rows on the arm
    g.lineWidth = 0.55; g.lineCap = 'butt';
    for (let i = 1; i < 10; i++) { const t = i / 10, q = trail[N - Math.round(t * N)], r = at(Math.min(1, t + 0.25)); g.strokeStyle = t > 0.62 ? 'rgba(0,0,0,0.25)' : 'rgba(90,100,110,0.13)'; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(lerp(q[0], r[0], 0.5), lerp(q[1], r[1], 0.5)); g.stroke(); }
    for (let i = 1; i < 12; i++) { const t = i / 12, a = P2(armLE, lead[0], t), b = P2(armTE, trail[N], t); g.strokeStyle = 'rgba(90,100,110,0.1)'; g.beginPath(); g.moveTo(lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5)); g.lineTo(lerp(a[0], b[0], 0.86), lerp(a[1], b[1], 0.86)); g.stroke(); }
    g.restore();
    // slotted outer primaries: slim black tips just past the outline
    g.fillStyle = COL.black;
    for (let j = 0; j < 4; j++) {
      const t = 0.93 + j * 0.02, q = at(Math.min(1, t)), back = S * (0.002 + j * 0.007), d = Math.atan2(T[1] - W[1], T[0] - W[0]) + 0.05 + j * 0.07;
      const base = [q[0] + ph[0] * back, q[1] + ph[1] * back], len = S * (0.026 - j * 0.003);
      g.beginPath(); g.ellipse(base[0] + Math.cos(d) * len * 0.45, base[1] + Math.sin(d) * len * 0.45, len * 0.55, S * 0.0058, d, 0, TAU); g.fill();
    }
    smoothPoly(g, outline); g.strokeStyle = COL.line; g.lineWidth = 1; g.stroke();
    g.restore();
  }

  // ── flying body (head up), origin = the shoulder line centre ──
  function paintBody(g, fan) {
    const tw = fan ? S * 0.075 : S * 0.048, tl = fan ? S * 0.22 : S * 0.235;
    // tail
    g.fillStyle = COL.white; g.beginPath(); g.moveTo(-S * 0.035, S * 0.09); g.lineTo(-tw, tl); g.quadraticCurveTo(0, tl + S * (fan ? 0.022 : 0.006), tw, tl); g.lineTo(S * 0.035, S * 0.09); g.closePath(); g.fill();
    g.strokeStyle = COL.line; g.lineWidth = 1; g.stroke();
    g.globalAlpha = 0.25; g.strokeStyle = COL.whiteSh; g.lineWidth = 0.8; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * S * 0.006, S * 0.11); g.lineTo(i * tw / 3.4, tl - 2); g.stroke(); } g.globalAlpha = 1;
    // body: white, shaded on the far (lower-right) side
    const gr = g.createLinearGradient(-S * 0.06, -S * 0.05, S * 0.06, S * 0.08);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, COL.white); gr.addColorStop(1, COL.whiteSh);
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, S * 0.015, S * 0.05, S * 0.115, 0, 0, TAU); g.fill(); g.strokeStyle = COL.line; g.stroke();
    // mantle (grey back between the wings)
    const mg = g.createRadialGradient(0, 0, S * 0.01, 0, 0, S * 0.07); mg.addColorStop(0, COL.mantle); mg.addColorStop(0.75, COL.mantle); mg.addColorStop(1, 'rgba(169,178,186,0)');
    g.fillStyle = mg; g.beginPath(); g.ellipse(0, S * 0.0, S * 0.05, S * 0.075, 0, 0, TAU); g.fill();
    paintHead(g, 0, -S * 0.125, 0, false);
  }
  // head at (x, y) looking `turn` rad off forward; bill; tiny eyes on both sides
  function paintHead(g, x, y, turn, tucked) {
    g.save(); g.translate(x, y); g.rotate(turn);
    if (!tucked) {
      g.fillStyle = COL.bill; g.beginPath(); g.moveTo(-S * 0.009, -S * 0.035); g.quadraticCurveTo(-S * 0.006, -S * 0.07, 0, -S * 0.077); g.quadraticCurveTo(S * 0.006, -S * 0.07, S * 0.009, -S * 0.035); g.closePath(); g.fill();
      g.strokeStyle = COL.billD; g.lineWidth = 0.8; g.stroke();
      g.fillStyle = COL.red; g.beginPath(); g.arc(S * 0.004, -S * 0.064, S * 0.0035, 0, TAU); g.fill();
    }
    const gr = g.createRadialGradient(-S * 0.01, -S * 0.012, S * 0.004, 0, 0, S * 0.04);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, COL.white); gr.addColorStop(1, COL.whiteSh);
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, S * 0.032, S * 0.04, 0, 0, TAU); g.fill(); g.strokeStyle = COL.line; g.lineWidth = 1; g.stroke();
    if (!tucked) { g.fillStyle = COL.eye; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * S * 0.027, -S * 0.012, S * 0.003, 0, TAU); g.fill(); } }
    g.restore();
  }

  // ── standing gull (head up), origin = body centre. o: {head:[dx,dy], turn, feet:[[x,y,ang]…], roll, crouch, sleep} ──
  function paintStand(g, o) {
    const r = o.roll || 0, cr = o.crouch || 0;
    g.save(); g.translate(r * S * 0.006, 0);
    // feet first (the body covers the hidden one)
    for (const [fx, fy, fa] of o.feet || []) {
      g.save(); g.translate(fx * S, fy * S); g.rotate(fa); g.fillStyle = COL.leg; g.strokeStyle = COL.legD; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(0, S * 0.012); g.lineTo(-S * 0.016, -S * 0.022); g.quadraticCurveTo(0, -S * 0.016, S * 0.016, -S * 0.022); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
    // tail (white, mostly under the primaries)
    g.fillStyle = COL.white; g.beginPath(); g.ellipse(0, S * 0.15, S * 0.03, S * 0.06, 0, 0, TAU); g.fill(); g.strokeStyle = COL.line; g.lineWidth = 1; g.stroke();
    // body: white flanks
    const bw = S * (o.sleep ? 0.068 : 0.06) * (1 + cr * 0.06), bl = S * (o.sleep ? 0.1 : 0.115);
    let gr = g.createLinearGradient(-bw, -bl, bw, bl); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, COL.white); gr.addColorStop(1, COL.whiteSh);
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, S * 0.02, bw, bl, 0, 0, TAU); g.fill(); g.stroke();
    // folded wings over the back: grey, white tertial crescent, black primaries crossing past the tail
    const ww = S * 0.052 * (1 + cr * 0.25), wl = S * 0.11;
    gr = g.createLinearGradient(-ww, -S * 0.06, ww, S * 0.14); gr.addColorStop(0, COL.mantleL); gr.addColorStop(0.5, COL.mantle); gr.addColorStop(1, COL.mantleD);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -S * 0.07); g.bezierCurveTo(ww * 1.25, -S * 0.06, ww * 1.1, S * 0.08, ww * 0.35, S * 0.14); g.lineTo(-ww * 0.35, S * 0.14); g.bezierCurveTo(-ww * 1.1, S * 0.08, -ww * 1.25, -S * 0.06, 0, -S * 0.07); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(80,90,100,0.35)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -S * 0.055); g.lineTo(0, S * 0.13); g.stroke();   // the wings' meeting line
    g.strokeStyle = 'rgba(248,248,244,0.9)'; g.lineWidth = S * 0.008; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ww * 0.15, S * 0.1, ww * 0.6, s > 0 ? 0.2 : Math.PI - 1.1, s > 0 ? 1.1 : Math.PI - 0.2); g.stroke(); }
    for (const s of [-1, 1]) {   // primaries: black blades crossing at the tips
      g.fillStyle = COL.black; g.beginPath(); g.moveTo(s * ww * 0.6, S * 0.115); g.quadraticCurveTo(s * ww * 0.25, S * 0.2, -s * S * 0.012, S * 0.255); g.quadraticCurveTo(s * ww * 0.05, S * 0.19, -s * ww * 0.05, S * 0.125); g.closePath(); g.fill();
      g.fillStyle = 'rgba(245,245,240,0.9)'; g.beginPath(); g.arc(-s * S * 0.004, S * 0.238, S * 0.0055, 0, TAU); g.fill();
    }
    g.restore();
    if (o.sleep) { paintHead(g, S * 0.018, -S * 0.04, Math.PI * 0.82, true); g.fillStyle = COL.bill; g.beginPath(); g.ellipse(S * 0.03, -S * 0.012, S * 0.006, S * 0.014, -0.4, 0, TAU); g.fill(); return; }
    const [hx, hy] = o.head || [0, 0];
    // neck
    g.fillStyle = COL.white; g.beginPath(); g.ellipse(hx * S * 0.5, -S * 0.085 + hy * S * 0.5, S * 0.03, S * 0.03, 0, 0, TAU); g.fill();
    paintHead(g, hx * S, -S * 0.12 + hy * S - cr * S * 0.012, o.turn || 0, false);
  }

  function build() {
    const wingNames = [], wingP = {};
    for (let i = 0; i < 10; i++) {   // flap cycle: ea top (+0.9 rad) at p 0 → bottom (−0.6) at p .5; flexed (swept) on the upstroke
      const p = i / 10, s = Math.sin(TAU * p), up = Math.max(0, -s);
      wingP['w' + i] = { ea: 0.12 + 0.72 * Math.cos(TAU * p), eh: 0.3 * s, sw: 0.18 + 0.62 * up, fa: -0.06 - 0.1 * Math.max(0, s) + 0.12 * up, armK: 1 - 0.22 * up, handK: 1 - 0.1 * up };
    }
    wingP.wGlide = { ea: 0.06, eh: -0.05, sw: 0.34, fa: -0.02, armK: 1, handK: 1 };
    wingP.wFlare = { ea: 0.42, eh: 0.25, sw: -0.02, fa: -0.38, armK: 0.95, handK: 1 };
    [0.35, 0.65, 0.95].forEach((f, i) => { const fa = lerp(-0.02, 0.85, f), hd = lerp(0.34, 1.5, f); wingP['wFold' + (i + 1)] = { ea: 0.2 * (1 - f), eh: 0, sw: hd - fa, fa, armK: 1 - 0.65 * f, handK: 1 - 0.12 * f }; });
    for (const n in wingP) wingNames.push(n);
    const ground = {
      stand: { head: [0, 0], feet: [] },
      lookL: { head: [-0.006, 0.004], turn: -0.6 },
      lookR: { head: [0.006, 0.004], turn: 0.6 },
      crouch: { head: [0, -0.012], crouch: 1, feet: [[-0.028, -0.05, -0.15], [0.028, -0.05, 0.15]] },
      sleep: { sleep: true },
    };
    for (let i = 0; i < 6; i++) {   // walk: alternate feet step forward (toes peek out past the breast), head bobs, body rolls
      const ph = i / 6 * TAU, s = Math.sin(ph), L = Math.max(0, s), R = Math.max(0, -s);
      ground['walk' + i] = { head: [0, -0.012 * Math.cos(ph * 2) - 0.004], roll: s, feet: [[-0.03, -0.035 - 0.05 * L, -0.12], [0.03, -0.035 - 0.05 * R, 0.12]] };
    }
    const cols = 5, wr = Math.ceil(wingNames.length / cols), gnames = ['body', 'bodyFan', ...Object.keys(ground)];
    const gc = Math.floor((cols * WING.w) / Math.max(BODY.w, GROUND.w)), gr2 = Math.ceil(gnames.length / gc);
    const cv = document.createElement('canvas'); cv.width = cols * WING.w; cv.height = wr * WING.h + gr2 * Math.max(BODY.h, GROUND.h);
    const g = cv.getContext('2d'), frames = {};
    wingNames.forEach((n, i) => {
      const x = (i % cols) * WING.w, y = Math.floor(i / cols) * WING.h;
      g.save(); g.beginPath(); g.rect(x, y, WING.w, WING.h); g.clip(); g.translate(x + WING.ax, y + WING.ay); paintWing(g, wingP[n]); g.restore();
      frames[n] = [x, y, WING.w, WING.h];
    });
    const cw = Math.max(BODY.w, GROUND.w), chh = Math.max(BODY.h, GROUND.h), y0 = wr * WING.h;
    gnames.forEach((n, i) => {
      const x = (i % gc) * cw, y = y0 + Math.floor(i / gc) * chh, isBody = n.startsWith('body');
      const C = isBody ? BODY : GROUND;
      g.save(); g.beginPath(); g.rect(x, y, cw, chh); g.clip(); g.translate(x + cw / 2, y + chh / 2);
      if (isBody) paintBody(g, n === 'bodyFan'); else paintStand(g, ground[n]);
      g.restore();
      frames[n] = [x + (cw - C.w) / 2, y + (chh - C.h) / 2, C.w, C.h];
    });
    return { canvas: cv, frames, S, wing: { w: WING.w, h: WING.h, ax: WING.ax / WING.w, ay: WING.ay / WING.h }, body: { w: BODY.w, h: BODY.h }, ground: { w: GROUND.w, h: GROUND.h },
      flap: ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'], walk: ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'], fold: ['wFold1', 'wFold2', 'wFold3'] };
  }
  window.GullSheet = { build };
})();
