# wallpap — shared brief for music scenes

Each scene is ONE self-contained file in `livewall/scenes/<id>.html` that runs fullscreen as the user's
desktop background inside a WKWebView (WebKit) on an M1 MacBook Air, often in Low Power Mode (30fps cap).
Plain HTML + inline JS/CSS, no build, no CDN. Include `<script src="lw.js"></script>`.

## Read first
- `livewall/scenes/lw.js` — ALL of it: input (`LW.on('move'|'down'|'up'|'drag'|'leave')`, never DOM mouse
  events), env/weather (`LW.env`, `LW.on('env')`), reminders, calm, settings (`LW.settings`, `LW.set`,
  `LW.on('settings')`, `LW.on('action')`), MUSIC (`LW.nowPlaying`, `LW.on('nowplaying')`), BEAT SYNC
  (`LW.music {level,bass,mid,high,live}`, `LW.on('beat', strength)`), media control
  (`LW.post({type:'media', cmd:'playpause'|'next'|'previous'})`), energy governor (clamp dt ≤ 0.1; lw.js
  stops rAF when the user isn't on the desktop), soundscapes (handled by lw.js).
- `livewall/scenes/cafe.html` — reference music scene (player + artwork sleeve + now-playing + palette tint
  from artwork + pets vibing + demo tracks when no host + art slots). Copy helpers you need; don't import.

## Rules
- **NO PEOPLE in frame, ever.** Cute animals welcome. Each animal keeps a stable identity forever (owns its
  appearance data; no shared scratch canvases between characters; never reorder the character array).
- **Animals ROAM**: several spots per scene, walking/jumping between them on natural schedules, no
  teleporting, never stuck in one place. Side-view walking moves mostly horizontally; depth changes as gentle
  arcs with the body turning — never slide diagonally in profile.
- **RIGHT SIDE CLEAR**: macOS desktop widgets live on the right. The right ~28% of the screen holds nothing
  that needs attention — no now-playing info/artwork, no main music object, no text, no animals resting there
  for long. Calm background only. Hero now-playing display + player go in the left ~70%.
- **MUSIC is the hero**: when playing, show album ARTWORK prominently + title/artist diegetically; light tints
  subtly toward the artwork palette; motion follows `LW.music` + `'beat'` (subtle, never strobe-y); paused →
  calmer/dimmer; nothing played yet → charming idle state. Click the main music object = play/pause; another
  object = next. Browser dev mode (no host): clicking play starts built-in demo tracks with generated artwork;
  key 'n' toggles a fake track.
- **Ambient & wellbeing**: time of day + weather visible (crossfade changes 20–40s); water reminder → in-world
  glass/cup with a small elegant "a sip of water?" tag (~12s); stretch → animals stretch; calm → lights dim,
  breathing glow 4s in / 6s out with low-contrast "breathe in / breathe out".
- **Art slots**: static background painting + each animal replaceable by optional PNGs from
  `scenes/art/<scene-id>/` (load via `new Image()`, procedural fallback if missing; document filenames +
  sizes in a comment block at the top of the file).
- **Performance**: never upload a 2D canvas into WebGL per frame (WebKit stalls). Prefer canvas2D: bake the
  static room once per light/weather change into an offscreen canvas, drawImage it each frame, draw only
  moving things on top. < 5ms JS per frame at 1440×900, DPR ≤ 2.
- **Style**: cozy, cinematic, restrained, premium illustrated look (storybook / lo-fi animation quality).
  Good at 16:10, 5K and ultrawide.

## Verify
`mcp__Claude_Browser__preview_start` name "livewall" (port 5210; serves `livewall/scenes`; saves screenshots).
Use YOUR OWN tab (`tabs_create`, pass tabId everywhere). The pane is usually hidden → use `?virtual=1`:
`LW.advance(secs)`, `await LW.shot('<id>-x.png', 0.7)` saves to `livewall/shots/` (Read it to view);
`LW.shot(name, scale, [x,y,w,h])` crops. Simulate music: `__lw('nowplaying', {title, artist, album,
artwork:<data URL>, playing:true, app:'Music'})`; beats: `__lw('beat', {l:.6,b:.7,m:.5,h:.3,k:.8})`.
Keep each tool call short (no long waits; use LW.advance). Don't edit other files. Never touch the user's live
wallpaper app. Report: what you built, perf numbers, art-slot filenames, known issues — concisely.
