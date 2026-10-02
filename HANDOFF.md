# wallpap — handoff (2026-10-02)

Live: repo https://github.com/sameeeeeeep/wallpap · release v0.10.0 (DMG) · site deploys via GitHub Pages
(custom domain wallpap.live — DNS at Spaceship still needs: A @ → 185.199.108–111.153, CNAME www → sameeeeeeep.github.io).

## Where things are
- `host/main.swift`, `host/BeatSync.swift` — native menu-bar app (WKWebView behind desktop icons). Build: `./build.sh --run` / `./build.sh --dmg`
  (`--dmg` = Developer ID + hardened runtime + notarize + staple via the `relay-notary` keychain profile).
  `host/Panel.swift` (+ `scenes/menu.html`) — click the wave → frosted control panel; right-click → native menu.
  `host/License.swift` — Pro via Dodo Payments license keys (public activate/validate API; live first, test fallback).
  `host/Catalog.swift` — add-on scenes in ~/Library/Application Support/wallpap/Scenes/<id>/ from the online catalog
  (site/catalog.json, packed with `tools/pack-scene.sh`) or user folders.
  Signed ad-hoc with a stable designated requirement (`identifier "live.wallpap.mac"`) so macOS privacy permissions survive rebuilds.
- `scenes/*.html` + `scenes/lw.js` — every scene is one self-contained HTML file; `lw.js` is the shared shim (input, weather/time, reminders,
  calm, settings, soundscapes, music/now-playing, beat sync, energy governor, AI companions). Read the header of `lw.js` first.
- `docs/scene-brief.md` — rules for scenes (right ~28% kept clear for macOS widgets, animals roam, no people, perf budget, art slots).
- `scenes/art/sprites/` — AI-generated character sprites (cats ×5, pandas ×3, dogs ×2), README lists poses. Sources: `art-src/*.jpg`.
- `tools/cutout.swift` — on-device subject cut-out (macOS Vision): `swift tools/cutout.swift sheet.jpg outdir prefix`.
- Dev: `python3 devserver.py 5210` → http://127.0.0.1:5210/<scene>.html — `?virtual=1` + `LW.advance(s)` + `await LW.shot('x.png')`
  for headless screenshots (saved to `shots/`). Live app dev hook: `LIVEWALL_DEV=1 ./wallpap.app/Contents/MacOS/wallpap` then `./dev.sh js "…"`.

## Open next
1. ~~Sprite transitions~~ — DONE 0.12: drawn in-between sheets for all 10 animals (scenes/art/sprites/*/*/t, shared player in pet-motion.js).
   Old notes: **Sprite transitions** (user's top ask): sprites only have static poses, so pose changes crossfade. Plan: generate a *transition sprite
   sheet* per animal — 4 rows × 5 in-between frames, same scale/baseline, plain light-grey background: (1) stand→sit, (2) sit→lie→curl asleep,
   (3) turn around right→left, (4) crouch→jump→land. Cut frames with `tools/cutout.swift`, play rows forward/backward for the reverse moves.
   Image gen status: Vids capped until Nov 1; Higgsfield 0 credits → needs another generator (Gemini web app, API key, or credits).
   Then wire frame sequences into the pet code of each scene (cats.html, grass.html, cafe.html, records/train/speakeasy/rooftop/ramen/cabin).
2. Jukebox v2: browse Apple Music playlists in-scene (AppleScript) / Spotify (Web API login), + QR "join the jam" via a small relay.
3. Measure each scene on the M1 in Low Power Mode (cabin looked heaviest in a hidden test browser).
4. Pro payments (isPro is a `defaults` flag for now; locked items open wallpap.live/#pro).
5. Music-scene background paintings (art slots exist; see the comment block atop each scene).

Don't flip/reload the user's live wallpaper while they're using it — test in a browser tab.
