# wallpap — launch marketing kit

Nothing in this folder has been posted anywhere. Everything here is a draft for you to review.

```
marketing/
  clips/NN-<clip>/<clip>-16x9.mp4 · -1x1.mp4 · -9x16.mp4 · -poster.jpg   ← rendered videos (H.264 + AAC, 30 fps)
  images/instagram/slide-1…6.png      1080×1350 carousel
  images/producthunt/gallery-1…6.png  1270×760 gallery
  posts/        x-thread · threads · instagram · linkedin · producthunt · reddit-macapps · hacker-news · feature-bullets
  press-kit.md  + press/ (app icon, wave mark, og image, scene screenshots)
  audio/        original procedural music beds, click sounds, demo cover art, beat analysis
  tools/        the capture pipeline (below)
  .cache/       masters, previews, post work files (ignored, safe to delete)
```

## Re-render everything (one command)

```bash
python3 marketing/tools/render.py            # all clips (3 aspects each) + all stills
```

That is all you need after the scene polish pass. Variants:

```bash
python3 marketing/tools/render.py clips koi music      # only some clips
python3 marketing/tools/render.py clips --quick        # fast draft (1920×1080 master, quick encode)
python3 marketing/tools/render.py preview desktop      # 8-frame contact sheet → .cache/preview/desktop.jpg (no encode)
python3 marketing/tools/render.py post koi             # redo captions / crops / audio from the cached master
python3 marketing/tools/render.py stills ig3 ph1       # only some stills
python3 marketing/tools/render.py music                # regenerate the music beds
```

Options: `--jobs N` runs N headless Chromes in parallel (default 2). `--aspects 16x9,1x1,9x16`. `--frames` also writes numbered PNGs to `marketing/frames/<clip>/0001.png`. `--scale` sets the capture pixel ratio; the default 1.667 gives a 3200×1800 master. The first versions were rendered at 1.333 (2560×1440) because the machine was busy.

You only need Google Chrome, ffmpeg (`/opt/homebrew/bin/ffmpeg`) and python3 with numpy and Pillow. There's no npm and no Playwright. You don't need the dev server, because `render.py` starts its own static server on port 5299.

**Time:** about 1 s per frame per job at the default scale on a quiet M-series Mac, plus encoding. A 15 s clip is roughly 8–12 minutes. The full set takes about an hour with `--jobs 2`, and longer while other heavy work is running.

## How it works

1. **`tools/render.py`** serves the repo, launches headless Chrome over `--remote-debugging-pipe` (`tools/cdp.py`, stdlib only), and opens `tools/stage/stage.html`.
2. **`tools/stage/`** loads each scene of a clip into a same-origin iframe with `?virtual=1`. The scene's clock only moves when the stage calls `LW.advance(1/30)`, so every frame is deterministic and nothing depends on real time. On top of the scenes, the stage adds:
   - crossfades between shots and a slow push-in (`zoom`)
   - a macOS cursor that really clicks the scene through `window.__lw('down', x, y)`, with click rings
   - scene APIs at set times: `__lw('env')` for weather and time (hour keyframes go through `LW.setView('custom', h)` so the light actually travels), `__lw('calm', true)`, `__lw('nowplaying', …)`, `__lw('action', 'pet')`
   - Beat Sync frames (`__lw('beat', frame)`) taken from the analysis of the music bed, so the scene pulses on the beat you hear
   - an optional macOS desktop mock: menu bar with the wave, widgets, desktop icons, Dock, a Finder window, and the real `scenes/menu.html` panel
3. After each `STAGE.frame(i)`, Chrome screenshots the page. JPEG frames are piped straight into ffmpeg to make the master (`.cache/masters/<clip>.mp4`). Frames aren't kept on disk; disk space is tight.
4. **Post** decodes the master once and splits it into 16:9 (full frame), 1:1 and 9:16. Square and vertical are crops that follow the clip's `focus` keyframes; the desktop clip uses a `frame` layout instead, where the whole desktop floats on a blurred backdrop. Post then adds:
   - PIL captions in SF Pro, with a soft scrim and placement that respects the Reels/TikTok safe zones
   - the end card
   - the music bed and click sounds (plop, tap, pop, purr, chime) at the cursor's click times
5. **`tools/music.py`** generates everything audio, procedurally and from scratch: an 80 bpm lo-fi bed (Fmaj7–Em7–Dm9–Cmaj7 e-piano, bass, soft kick/rim/shaker, a pentatonic bell line, vinyl hiss), a beatless ambient bed that swells on a 16 s box-breath cycle, the click sounds, the demo cover art, and `beats-lofi.json`. No samples or third-party audio are used, so you can use it freely.

All clip choreography lives in **`tools/clips.js`**: shots, hours, weather events, cursor paths, captions, crop focus, music bed, and the `STILLS` layouts. The field reference is at the top of the file. Edit there, then run `preview` to check before a full render.

### Fallback: in-page capture with the dev server
`tools/inpage-capture.js` is a snippet you paste into a scene tab opened with `?virtual=1` on `devserver.py` (for example with the Claude Browser JS tool). It steps the clock and saves frames with `LW.shot` into `livewall/shots/mk-<name>-NNNN.png`. Then `tools/collect-frames.sh <name>` moves them to `marketing/frames/<name>/0001.png` and encodes `<name>.mp4`. Use it for quick grabs while you're working on a scene.

## The clips

| # | Clip | Scenes | Bed |
|---|------|--------|-----|
| 01 | hero: "Your desktop, alive." Day → night montage | Koi, Touch Grass, Santorini Cats, Café (rain), Rooftop, Snowy Cabin | lo-fi |
| 02 | koi: "Click the water." Cursor feeds the koi | Koi Pond | lo-fi + plops |
| 03 | music: "Your music, in the scene." Track on the sleeve, projector and vending-machine radio, beat-synced | Record Store, Rooftop, Ramen Alley | lo-fi (beat-synced) |
| 04 | calm: "Breathe inside the scene." | Koi, Touch Grass, Rooftop with Calm on | ambient (breath swell) |
| 05 | weather: sun → rain → sunset → night with moon, fast day cycle | Santorini Cats | lo-fi |
| 06 | pets: toy for the cats, pet a cat, bamboo for the pandas, pet the dog | Cats, Touch Grass, Snowy Cabin | lo-fi + sfx |
| 07 | desktop: "It lives behind your icons." Mac mock, select and open a folder, click the pond behind the window, open the menu-bar panel | Koi Pond on a macOS desktop | lo-fi |
| 08 | cymatics: "Sand that listens." | Cymatics | lo-fi (beat-synced) |
| 09 | bowls: strike three singing bowls | Singing Bowls | ambient + chimes |

The track shown in Music Mode is a made-up demo ("Slow Tide" by "Harbor Lights", with original cover art). It isn't a real artist.
