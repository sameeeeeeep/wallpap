# Make a wallpap scene

A scene is a folder with a web page. wallpap shows it full-screen behind your desktop icons on every display.

```
my-scene/
  index.html     the scene — plain HTML/CSS/JS, no build step, no network requests
  scene.json     {"id":"my-scene","title":"My Scene","category":"Nature","author":"Your Name","authorURL":"https://…","version":1,"music":false}
  thumb.jpg      256×160 preview for the menu
  …assets        images, sounds (keep the folder under ~10 MB)
```

Include the shared runtime with `<script src="lw.js"></script>` (and `moon.js`, `kit.js` if you use them) — the app
copies the current versions into your folder, so don't ship your own copies. Read the header of `scenes/lw.js`:

- **Input:** `LW.on('down'|'move'|'up'|'drag', (x, y) => …)` — clicks on bare desktop only.
- **World:** `LW.env` (hour, weather, real sun/moon via `LW.env.astronomy`) and `LW.on('env')`.
- **Desktop layout:** `LW.layout` `{side, clear:[x0,x1], avoid}` + `LW.on('layout')` — keep your main content inside
  `clear`; the user's widgets and icons live in the rest.
- **Music:** `LW.music` (level, bass, mid, high, chroma, key, tempo) + `LW.on('beat')`, `LW.nowPlaying`.
- **Calm:** set `LW.breathDiegetic = true` and breathe your world from `LW.breathState(LW.breathTime())`.
- **Settings & actions:** `LW.settings`, `LW.set(key, value)`, `LW.on('action', name => …)`.
- **Energy:** use `requestAnimationFrame`; wallpap throttles and pauses it. Clamp dt ≤ 0.1 s. Aim for < 4 ms per frame.

**Quality bar:** calm, cinematic, believable. No people's faces, no text bubbles, no emoji, no logos. Weather only
where the sky is. Nothing important on the side where the user's widgets sit. It should look good left alone for hours.

**Try it:** menu → Scenes → Custom → *Add a scene folder…* (Pro), or drop the folder into
`~/Library/Application Support/wallpap/Scenes/`.

**Submit:** open a "Submit a scene" issue at github.com/sameeeeeeep/wallpap/issues/new/choose. Featured scenes ship to
everyone through the Discover tab with your credit.
