// wallpap launch clips + stills. Loaded by stage/stage.html; render.py reads each clip's meta
// (captions, music bed, crop focus, sfx) back from STAGE.init().
//
// Clip fields
//   dur            seconds (30 fps)
//   shots[]        { scene, at (s, clip time), hour (number or [[t, h], …] keyframes), weather,
//                    pre (pre-roll s), xfade (s), zoom [from, to] slow push-in, origin [fx, fy],
//                    music (feed Beat-Sync frames from the bed), setup(api), events [[t, api => …]] }
//   cursor[]       keyframes { t, x, y } or { t, at: api => [x, y] } (resolved when the move starts);
//                  click:true → ring + scene click (to:'ui' = mock UI only), sfx:'plop'|'tap'|'pop'|'purr'|'chime',
//                  ui:'select:Projects'|'open'|'panel' (desktop mock), move: seconds spent travelling
//   captions[]     { t0, t1, eyebrow, text }  rendered per aspect by render.py
//   bed            'lofi' | 'ambient'; bedStart (s into the bed); bedGain
//   focus          0..1 horizontal centre of the 9:16 / 1:1 crops (number or [[t, f], …])
//   vertical       'crop' (default) | 'frame' (whole 16:9 frame floated on a blurred backdrop)
//   mock           { clock, … } draws the macOS desktop (menu bar, widgets, icons, Dock)
// api: w (scene window), lw(...), action(name), calm(on), env(patch), reminder(kind), nowPlaying(on), down/up/move(x, y), sfx(kind)
'use strict';
const H = 1080;
const PANEL_KOI = { scene: 'koi', liveWeather: 'Live — clear · 21° (Lisbon)', sceneCtl: [{ type: 'action', title: 'Feed the Koi', v: 'feed' }] };
const catXY = (api, i = 0) => { const c = api.w.__cats.cats[i % api.w.__cats.cats.length]; return [c.x * H / 1000, (c.y - c.z - 34) * H / 1000]; };
const pandaXY = (api, i = 0) => { const p = api.w.__grass.pandas[i % api.w.__grass.pandas.length]; return p.hit ? [p.hit.hx, p.hit.hy] : [700, 760]; };
const bowlXY = (api, i) => { const b = api.w.__bowls.bowls()[i]; return [b.x, b.y]; };

window.CLIPS = {
  // 1 ─ Hero montage: the best scenes, day → night
  hero: {
    title: 'wallpap — your desktop, alive', dur: 19, bed: 'lofi', bedStart: 0, focus: 0.4,
    shots: [
      { scene: 'koi', at: 0, hour: 10.5, zoom: [1.0, 1.05] },
      { scene: 'grass', at: 3.0, hour: 13, zoom: [1.04, 1.0], origin: [0.35, 0.6] },
      { scene: 'cats', at: 6.0, hour: 18.2, zoom: [1.0, 1.05], origin: [0.3, 0.7] },
      { scene: 'cafe', at: 9.0, hour: 19.8, weather: 'rain', zoom: [1.05, 1.0], origin: [0.4, 0.5] },
      { scene: 'rooftop', at: 12.0, hour: 21.5, zoom: [1.0, 1.05], origin: [0.3, 0.6] },
      { scene: 'cabin', at: 15.0, hour: 23, zoom: [1.0, 1.04], origin: [0.45, 0.6] },
    ],
    captions: [
      { t0: 0.6, t1: 5.2, eyebrow: 'wallpap for Mac', text: 'Your desktop, alive.' },
      { t0: 6.4, t1: 11.2, text: 'Living scenes behind your icons.' },
      { t0: 12.0, t1: 16.0, text: 'They follow your day, all the way to night.' },
    ],
  },

  // 2 ─ Feed the koi
  koi: {
    title: 'Feed the koi', dur: 15, bed: 'lofi', bedStart: 0, focus: [[0, 0.36], [15, 0.38]],
    shots: [{ scene: 'koi', at: 0, hour: 16.5, zoom: [1.0, 1.03], origin: [0.35, 0.5] }],
    cursor: [
      { t: 0.8, x: 1250, y: 820 },
      { t: 2.4, x: 640, y: 520, click: true, sfx: 'plop', move: 1.2 },
      { t: 5.6, x: 720, y: 600, click: true, sfx: 'plop', move: 0.8 },
      { t: 8.6, x: 560, y: 470, click: true, sfx: 'plop', move: 0.8 },
      { t: 9.4, x: 600, y: 500, click: true, sfx: 'plop', move: 0.5 },
      { t: 12.5, x: 820, y: 640, move: 2.0 },
    ],
    captions: [
      { t0: 0.5, t1: 4.6, eyebrow: 'Koi Pond', text: 'Click the water.' },
      { t0: 5.2, t1: 9.6, text: 'The koi come for the food.' },
      { t0: 10.2, t1: 13.6, text: 'Every interaction is free.' },
    ],
  },

  // 3 ─ Your music, in the scene (Music Mode, Pro)
  music: {
    title: 'Your music, in the scene', dur: 18, bed: 'lofi', bedStart: 3, music: true, focus: [[0, 0.5], [6.5, 0.5], [7.5, 0.33], [12.5, 0.33], [13.2, 0.38]],
    shots: [
      { scene: 'records', at: 0, hour: 21, music: true, zoom: [1.0, 1.05], origin: [0.5, 0.45], setup: (a) => a.nowPlaying(true) },
      { scene: 'rooftop', at: 6.5, hour: 21.5, music: true, zoom: [1.0, 1.04], origin: [0.25, 0.45], setup: (a) => a.nowPlaying(true) },
      { scene: 'ramen', at: 12.5, hour: 22, music: true, zoom: [1.03, 1.0], origin: [0.3, 0.5], setup: (a) => a.nowPlaying(true) },
    ],
    captions: [
      { t0: 0.6, t1: 5.8, eyebrow: 'Music Mode', text: 'Your music, in the scene.' },
      { t0: 6.8, t1: 11.8, text: 'Apple Music or Spotify — on the sleeve, the projector, the radio.' },
      { t0: 12.8, t1: 16.2, text: 'And the room moves with the beat.' },
    ],
  },

  // 4 ─ Breathe inside the scene (Calm, Pro)
  calm: {
    title: 'Breathe inside the scene', dur: 19, bed: 'ambient', bedStart: 0, focus: 0.38,
    shots: [
      { scene: 'koi', at: 0, hour: 17.8, pre: 3, setup: (a) => a.calm(true), zoom: [1.0, 1.03] },
      { scene: 'grass', at: 6.2, hour: 18.4, pre: 3, setup: (a) => a.calm(true), xfade: 1.4, zoom: [1.02, 1.0], origin: [0.35, 0.6] },
      { scene: 'rooftop', at: 12.4, hour: 21.5, pre: 3, setup: (a) => a.calm(true), xfade: 1.4, zoom: [1.0, 1.03], origin: [0.3, 0.5] },
    ],
    captions: [
      { t0: 0.8, t1: 5.6, eyebrow: 'Calm', text: 'Breathe inside the scene.' },
      { t0: 7.0, t1: 11.8, text: 'Ripples, gusts of wind, string lights —' },
      { t0: 13.0, t1: 16.4, text: 'everything breathes with you.' },
    ],
  },

  // 5 ─ Weather + time: one scene, sun → rain → night
  weather: {
    title: 'Real weather, real light', dur: 17, bed: 'lofi', bedStart: 0, focus: 0.36,
    shots: [{
      scene: 'cats', at: 0, hour: [[0, 10.5], [3.5, 13], [8.2, 16.6], [11, 18.3], [13, 19.4], [15.5, 21.6], [17, 22.4]], weather: 'clear', zoom: [1.0, 1.03], origin: [0.35, 0.6],
      events: [[3.6, (a) => a.env({ weather: 'rain', intensity: 1 })], [8.2, (a) => a.env({ weather: 'clear', intensity: 0.7 })]],
    }],
    captions: [
      { t0: 0.6, t1: 3.8, eyebrow: 'Santorini Cats', text: 'Light from your real clock.' },
      { t0: 4.3, t1: 8.6, text: 'Rain when it rains outside.' },
      { t0: 9.6, t1: 14.2, text: 'Then sunset, and tonight’s real moon.' },
    ],
  },

  // 6 ─ Pets: toss the cats a toy, bamboo for the pandas, pet the dog
  pets: {
    title: 'Play with the pets', dur: 17, bed: 'lofi', bedStart: 0, focus: [[0, 0.33], [5.8, 0.33], [6.6, 0.36], [11.6, 0.36], [12.4, 0.36]],
    shots: [
      { scene: 'cats', at: 0, hour: 17.4, zoom: [1.0, 1.03], origin: [0.3, 0.7] },
      { scene: 'grass', at: 5.8, hour: 14, zoom: [1.0, 1.03], origin: [0.35, 0.65] },
      { scene: 'cabin', at: 11.6, hour: 20.5, zoom: [1.0, 1.03], origin: [0.4, 0.75] },
    ],
    cursor: [
      { t: 0.6, x: 900, y: 1000 },
      { t: 2.0, x: 560, y: 900, click: true, sfx: 'pop', move: 1.1 },
      { t: 4.3, at: (a) => catXY(a, 1), click: true, sfx: 'purr', move: 1.0 },
      { t: 7.6, x: 820, y: 860, click: true, sfx: 'tap', move: 1.2 },
      { t: 9.6, at: (a) => pandaXY(a, 0), click: true, sfx: 'tap', move: 1.0 },
      { t: 13.6, x: 800, y: 905, click: true, sfx: 'purr', move: 1.4, after: (a) => a.action('pet') },
      { t: 16.2, x: 900, y: 760, move: 1.6 },
    ],
    captions: [
      { t0: 0.5, t1: 5.4, eyebrow: 'Interactions', text: 'Toss the cats a toy.' },
      { t0: 6.4, t1: 11.2, text: 'Drop bamboo for the pandas.' },
      { t0: 12.2, t1: 15.8, text: 'Pet the dog by the fire.' },
    ],
  },

  // 7 ─ It's your desktop (macOS mock)
  desktop: {
    title: 'It’s your desktop', dur: 17, bed: 'lofi', bedStart: 0, vertical: 'frame', square: 'frame', focus: 0.5,
    mock: { clock: 'Fri 3 Oct  5:42 PM', panelState: PANEL_KOI },
    shots: [{ scene: 'koi', at: 0, hour: 17.2 }],
    cursor: [
      { t: 0.8, x: 1000, y: 700 },
      { t: 2.2, x: 620, y: 520, click: true, sfx: 'plop', move: 1.1 },
      { t: 4.8, x: 1793, y: 270, click: true, to: 'ui', ui: 'select:Projects', sfx: 'tap', move: 1.4 },
      { t: 5.15, x: 1793, y: 270, click: true, to: 'ui', ui: 'open', sfx: 'tap', move: 0.1 },
      { t: 7.6, x: 1160, y: 820, click: true, sfx: 'plop', move: 1.3 },
      { t: 8.9, x: 1250, y: 760, click: true, sfx: 'plop', move: 0.6 },
      { t: 11.2, x: 1528, y: 16, click: true, to: 'ui', ui: 'panel', sfx: 'tap', move: 1.5 },
      { t: 14.5, x: 1460, y: 330, move: 1.6 },
    ],
    captions: [
      { t0: 0.6, t1: 4.4, eyebrow: 'macOS menu-bar app', text: 'It lives behind your icons.' },
      { t0: 5.2, t1: 10.2, text: 'Icons, windows and widgets work as always.' },
      { t0: 11.0, t1: 15.4, text: 'Everything else is one click away.' },
    ],
    capPos: { '16x9': 'bl' },
  },

  // 8 ─ Cymatics: sand forms Chladni patterns to your music
  cymatics: {
    title: 'Cymatics', dur: 15, bed: 'lofi', bedStart: 6, music: true, focus: 0.3,
    shots: [{ scene: 'cymatics', at: 0, hour: 22, music: true, pre: 5, zoom: [1.0, 1.06], origin: [0.28, 0.5], setup: (a) => a.nowPlaying(true) }],
    captions: [
      { t0: 0.7, t1: 5.0, eyebrow: 'Cymatics', text: 'Sand that listens.' },
      { t0: 5.6, t1: 10.4, text: 'Every chord finds its own pattern.' },
      { t0: 11.0, t1: 13.8, text: 'Played by whatever you’re playing.' },
    ],
  },

  // 9 ─ Singing bowls
  bowls: {
    title: 'Singing Bowls', dur: 13, bed: 'ambient', bedStart: 8, bedGain: 0.7, focus: 0.3,
    shots: [{ scene: 'bowls', at: 0, hour: 18.0, zoom: [1.0, 1.04], origin: [0.28, 0.75] }],
    cursor: [
      { t: 0.8, x: 900, y: 980 },
      { t: 2.2, at: (a) => bowlXY(a, 2), click: true, sfx: 'chime', move: 1.1 },
      { t: 5.2, at: (a) => bowlXY(a, 4), click: true, sfx: 'chime', move: 1.1, gain: 0.8 },
      { t: 8.0, at: (a) => bowlXY(a, 1), click: true, sfx: 'chime', move: 1.1, gain: 0.9 },
      { t: 11.5, x: 760, y: 700, move: 2 },
    ],
    captions: [
      { t0: 0.6, t1: 4.6, eyebrow: 'Singing Bowls', text: 'Strike a bowl.' },
      { t0: 5.4, t1: 10.6, text: 'Let the room ring.' },
    ],
  },
};
for (const [id, c] of Object.entries(window.CLIPS)) c.id = id;
window.CLIP_SKIP = ['calm', 'weather', 'pets', 'desktop', 'cymatics', 'bowls'];   // TEMP: budget cap for the first pass

// ── Stills: Instagram carousel (1080×1350) + Product Hunt gallery (1270×760) ──
const WAVE_MARK = '<svg width="44" height="22" viewBox="0 0 22 16"><path d="M1.5 4.2c2.3 0 2.3 2.2 4.6 2.2s2.3-2.2 4.6-2.2 2.3 2.2 4.6 2.2 2.3-2.2 4.6-2.2M1.5 10.2c2.3 0 2.3 2.2 4.6 2.2s2.3-2.2 4.6-2.2 2.3 2.2 4.6 2.2 2.3-2.2 4.6-2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const scrimTop = (h, a = 0.62) => `<div class="scrim" style="top:0;height:${h}px;background:linear-gradient(180deg,rgba(8,12,14,${a}),rgba(8,12,14,0))"></div>`;
const scrimBot = (h, a = 0.7) => `<div class="scrim" style="bottom:0;height:${h}px;background:linear-gradient(0deg,rgba(8,12,14,${a}),rgba(8,12,14,0))"></div>`;
const igCard = (eyebrow, h1, p, pos = 'bottom') =>
  (pos === 'bottom' ? scrimBot(720) : scrimTop(640)) +
  `<div class="card" style="left:76px;right:76px;${pos === 'bottom' ? 'bottom:96px' : 'top:96px'}">
     ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${h1}</h1>${p ? `<p>${p}</p>` : ''}</div>
   <div class="card" style="left:76px;${pos === 'bottom' ? 'top:64px' : 'bottom:64px'}"><div class="mark">${WAVE_MARK}wallpap</div></div>`;
const phCard = (h1, p) => scrimBot(420, 0.66) +
  `<div class="card" style="left:64px;right:64px;bottom:56px"><h1 style="font-size:58px">${h1}</h1>${p ? `<p style="font-size:24px;margin-top:12px">${p}</p>` : ''}</div>`;

window.STILLS = {
  // Instagram carousel — 1080×1350 (4:5). The scene is 16:9, so each slide shows a portrait window into it.
  ig1: { w: 1080, h: 1350, out: 'instagram/slide-1.png', shot: { scene: 'koi', hour: 17, pre: 6 }, view: { fx: 0.32 },
    html: igCard('Living wallpapers for Mac', 'Your desktop,<br>but alive.', 'Calm, animated scenes behind your icons. Click them and they react.') },
  ig2: { w: 1080, h: 1350, out: 'instagram/slide-2.png', shot: { scene: 'cats', hour: 18.3, pre: 6 }, view: { fx: 0.18 },
    html: igCard('Touch', 'Reach in. It reacts.', 'Feed the koi, toss the cats a toy, give the pandas bamboo, pet the dog.', 'top') },
  ig3: { w: 1080, h: 1350, out: 'instagram/slide-3.png', shot: { scene: 'records', hour: 21, pre: 6, music: true, setup: (a) => a.nowPlaying(true) }, view: { fx: 0.42 },
    html: igCard('Music Mode', 'Your music, in the room.', 'What’s playing in Apple Music or Spotify lands on the sleeve — and the room moves with the beat.') },
  ig4: { w: 1080, h: 1350, out: 'instagram/slide-4.png', shot: { scene: 'koi', hour: 20, pre: 7, setup: (a) => a.calm(true) }, view: { fx: 0.3 },
    html: igCard('Calm', 'Breathe inside the scene.', 'Box, 4·6 or 4-7-8. Ripples, wind and string lights keep the rhythm.', 'top') },
  ig5: { w: 1080, h: 1350, out: 'instagram/slide-5.png', shot: { scene: 'cymatics', hour: 22, pre: 8, music: true, setup: (a) => a.nowPlaying(true) }, view: { scale: 1.55, fx: 0.2, fy: 0.15 },
    html: igCard('Cymatics', 'Sand that listens.', 'A music visualizer where real Chladni patterns form to your track.') },
  ig6: { w: 1080, h: 1350, out: 'instagram/slide-6.png', shot: { scene: 'cabin', hour: 22.5, pre: 6 }, view: { fx: 0.4 },
    html: scrimBot(1350, 0.55) + `<div class="card" style="left:76px;right:76px;bottom:110px">
      <div class="mark" style="font-size:44px">${WAVE_MARK}wallpap</div>
      <h1 style="margin-top:28px">Every scene is free.</h1>
      <p>Pro is $5, once — every skin, Music Mode, Calm, reminders, soundscapes, live weather.</p>
      <p style="margin-top:34px;font-weight:600;opacity:1">wallpap.live</p></div>` },

  // Product Hunt gallery — 1270×760
  ph1: { w: 1270, h: 760, out: 'producthunt/gallery-1.png', shot: { scene: 'koi', hour: 17, pre: 6 }, mock: { clock: 'Fri 3 Oct  5:42 PM', panelState: PANEL_KOI, panel: true }, view: { fx: 1, fy: 0 }, html: '' },
  ph2: { w: 1270, h: 760, out: 'producthunt/gallery-2.png', shot: { scene: 'cats', hour: 18.3, pre: 6 }, html: phCard('Reach in. It reacts.', 'Feed the koi, toss the cats a toy, pet the dog — every interaction is free.') },
  ph3: { w: 1270, h: 760, out: 'producthunt/gallery-3.png', shot: { scene: 'records', hour: 21, pre: 6, music: true, setup: (a) => a.nowPlaying(true) }, html: phCard('Your music, in the room.', 'Apple Music and Spotify on the sleeve, the projector, the radio. Beat Sync moves the scene.') },
  ph4: { w: 1270, h: 760, out: 'producthunt/gallery-4.png', shot: { scene: 'grass', hour: 18.4, pre: 7, setup: (a) => a.calm(true) }, html: phCard('Breathe inside the scene.', 'Calm turns the world into your breathing guide.') },
  ph5: { w: 1270, h: 760, out: 'producthunt/gallery-5.png', shot: { scene: 'cymatics', hour: 22, pre: 8, music: true, setup: (a) => a.nowPlaying(true) }, view: { scale: 1.3, fx: 0.15, fy: 0.3 }, html: phCard('Cymatics.', 'Sand forms Chladni patterns to whatever you’re playing.') },
  ph6: { w: 1270, h: 760, out: 'producthunt/gallery-6.png', shot: { scene: 'cafe', hour: 19.8, weather: 'rain', pre: 6 }, html: phCard('Real weather. Real light.', 'Rain when it rains outside; sunrise and moonrise from your clock.') },
};
