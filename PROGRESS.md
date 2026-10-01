# LiveWall — interactive live desktop wallpaper (macOS)

A tiny menu-bar app that puts an animated, interactive web scene **behind your desktop icons**,
on every Space and every display. The scenes react to your cursor and clicks, the real weather,
the time of day, and they nudge you to drink water and breathe.

## Run it

```bash
cd ~/Documents/Projects/visuals/livewall && ./build.sh --run
```

- A **〰 wave icon** appears in the menu bar. Pick a scene, then click bare desktop to interact.
- To autostart: menu → **Open at Login**. You can also drag `LiveWall.app` to /Applications first.
- **Quit** from the menu restores your normal wallpaper.

### Menu
| Item | What it does |
|---|---|
| Koi Pond / Singing Bowls / Cats (⌘1–3) | switch scene |
| Calm · Breathe (⌘B) | breathing guide: 4s in, 6s out. Everything slows down and syncs to it |
| Weather ▸ | *Live* uses Open-Meteo, no API key. Or force Clear/Cloudy/Rain/Storm/Snow/Fog |
| Water Reminder ▸ | off / 30 / 45 / 60 (default) / 90 min. Every third nudge is a stretch. *Remind Me Now* to preview |
| Sound (⌘S) | mute or unmute scene audio |
| Reload Scene (⌘R) | |

## How it works
- `host/main.swift` is an AppKit app with no Dock icon. It opens one borderless `WKWebView` window per screen.
  - The window level is set just above macOS's own wallpaper windows. Modern macOS draws the wallpaper with Dock-owned windows a few levels above `kCGDesktopWindowLevel`. The level stays below the desktop-icon level.
  - The window has `ignoresMouseEvents` set, so Finder keeps the desktop.
  - A global mouse monitor forwards moves and clicks to the page, but only when the cursor is over bare desktop. It checks the topmost window under the cursor with `CGWindowListCopyWindowInfo`, so clicks inside other apps never leak in.
  - WebKit stops rendering when the desktop is fully covered, so the idle cost is close to zero.
  - Weather comes from CoreLocation. If that isn't allowed, the time zone's city is used instead. The data comes from Open-Meteo every 15 min and is pushed to the page with the hour every minute.
- `scenes/lw.js` is the shared shim. It covers input, the audio context, env/weather, reminders, calm mode, dev keys and a self-screenshot helper.
- Scenes are plain HTML with no build step:
  - `scenes/koi.html`: the pond is drawn in a WebGL2 composite:
    - a GPU wave-equation ripple sim, with refraction, caustics, a pebble bed, fish and pad shadows, dappled tree shade, sky reflection, glints, mist and grain;
    - Canvas2D articulated koi in 9 varieties, some with butterfly fins;
    - lily pads and lotus;
    - seasonal leaves: maple in autumn, petals in spring;
    - fireflies on summer nights, snow melting into the water, rain rings, and storm lightning with thunder.
    - Interaction:
      - A click drops food. The fish startle, then come back to feed.
      - A still cursor draws curious koi.
      - A fast swipe scatters them.
      - The cursor trails ripples through the water.
    - Reminder: a lotus blooms and the text floats on the water. The koi gather.
    - Calm mode: a breathing ring appears and the koi orbit it.
  - `scenes/bowls.html`: a candlelit room with 7 hammered bowls tuned to D-minor pentatonic.
    - Sound: additive inharmonic synthesis with beating partial pairs, long decays and a generated reverb.
    - Click to strike. Hold and circle to rim-sing.
    - The window shows the weather and time of day.
    - Reminder: a glass of water appears.
    - Calm mode: the light breathes.
  - `scenes/cats.html`: a pixel-art room with 5 cats: orange tabby, black, grey/white, calico and siamese.
    - Behaviour: they sit, walk, sleep, loaf, groom, yawn, stretch, jump to the sill, shelf or tree, sniff each other and chase each other.
    - Cursor: they track it with their eyes, stalk and pounce on a fast cursor, and fall asleep when it goes idle.
    - Clicks: clicking a cat makes it purr (hearts) or meow. Clicking the floor tosses a yarn ball.
    - Time and weather: the window shows the weather and time of day. On sunny days there's a sunbeam nap spot. In storms they hide.
    - Water reminder: a cat laps at the water bowl with a speech bubble. Stretch reminder: the cats stretch.
    - Calm mode: they curl up together and breathe in sync.

## Develop
- Browser preview: `python3 devserver.py 5210` → http://127.0.0.1:5210/koi.html
  - Dev keys: `w` weather · `t` +3h · `r` reminder · `b` calm · `m` mute
  - URL params: `?weather=rain&hour=22&calm=1`
  - `?virtual=1` makes the scene step with `LW.advance(sec)`, and `await LW.shot('x.png')` saves to `shots/`.
- Live-edit inside the real wallpaper: `LIVEWALL_DEV=1 LIVEWALL_SCENES=$PWD/scenes ./LiveWall.app/Contents/MacOS/LiveWall`
  - then `./dev.sh reload`, `./dev.sh js "LW.env"`, `./dev.sh scene:cats`, `./dev.sh reminder:water`

## Status log
- **2026-10-01 ~05:10**
  - Host app builds with swiftc.
  - Verified inside the real WKWebView: the scene loads, `LW.isHost`, float render targets and live weather (cloudy, 26 °C) all work.
  - Koi pond: tuned over about 8 visual iterations (day, dusk, night, rain, reminder, calm).
  - Bowls: done by a parallel agent, with screenshots in `shots/bowls-*`.
  - Cats: agent still working.
  - **Not yet verified:** live compositing on the actual desktop and forwarding of real clicks. The screen was locked the whole time, which pauses WebKit.
  - First thing to check on unlock: launch, click the desktop, and watch for ripples.
  - Web audio inside the host: ✅ verified. An `AudioContext` reaches `running` with no real user gesture (48 kHz).

- **2026-10-01 ~05:30**
  - Polish pass on all three scenes:
    - koi: full-res fish, organic markings, scale texture, fading fins, a readable showa, 8 fish;
    - bowls: individual metals and patina, engraved bands, a mallet, candle drips and glow, rings layered correctly;
    - cats: no stacking, real bowls, a readable groom.
  - Rebuilt, and LiveWall.app was launched normally (`open`) so it's running when you unlock.
  - It uses about 0.4 ms of CPU per frame for koi at 1440×900.

- **2026-10-01 12:10**
  - Fixed the black desktop on first real launch. The bundled scenes URL was relative to the app bundle (`Contents/Resources/scenes/...`), so WebKit threw and nothing loaded.
  - Dev runs never hit it because they used an absolute `LIVEWALL_SCENES` path.
  - The app now resolves to an absolute URL. Verified with a snapshot from the live wallpaper window (`shots/host-desktop.png`).
  - It also re-shows its windows on unlock and when the screen wakes.

- **2026-10-01 afternoon**
  - **Clicks:** fixed. macOS 26's Notification Centre has a full-screen layer-21 overlay; system full-screen overlays are now ignored in the desktop check.
  - **Koi smoothness:** the pond went from 5 fps to smooth. Fish and surface are now WebGL meshes and sprites (no per-frame canvas→texture uploads, which stall WebKit). The pond floor is baked, and the water renders at about 1×.
  - **Scene switching:** each scene gets a fresh WKWebView, so audio can't carry over.
  - **Pause:** new **Pause Animation** (⌘P) and **Pause on Battery** options freeze the last frame and tear the page down, so it costs nothing while paused.
  - **Koi interactions:**
    - click a koi to make it dart off;
    - press and hold on the water and the koi nibble your fingertip;
    - a quick click drops food;
    - click a pad and it bobs;
    - a frog croaks (more at night) and leaps into the water when clicked;
    - a dragonfly darts, perches, dips the water and flees the cursor.
  - **Bowls:** rest the cursor on a bowl for 1.5 s to arm it, then circle to make it sing.
  - **Cost:** measured on cats at about 10–15% of one core in total, with energy impact around 10.
  - **In progress:** cats rebuilt as illustrated (non-pixel) cats on a Santorini terrace, with stable identities.

## When you wake up
1. Unlock. Your desktop should now be the koi pond, and the 〰 icon should be in the menu bar.
   - If macOS asks for **Location** for LiveWall, allowing it gives local weather. Denying falls back to your time zone's city.
2. Minimize windows (or press F11 / fn-F11 / Show Desktop), click the water, then park the cursor still and watch the koi come over.
3. From the 〰 menu, try: Singing Bowls (click bowls, or hold and circle for rim singing), Cats (click a cat, or click the floor for yarn), Calm · Breathe, Water Reminder → Remind Me Now, Weather → Rain/Snow/Storm.
4. If something looks off (black desktop, no clicks), menu → Quit restores the normal wallpaper. Tell me what you saw.

## Next ideas
- Verify on an unlocked desktop: multi-display, Spaces, full-screen apps, and CPU/energy use (target: less than 5% CPU when visible).
- Koi: occasional dragonfly or falling blossom, a turtle cameo, fish that remember being fed.
- Native audio fallback if WKWebView blocks the AudioContext without a real user gesture.
- A per-scene quality and FPS setting, and a pause on battery.
