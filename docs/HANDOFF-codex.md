# Handoff to Codex — wallpap (2026-10-03)

You're picking up wallpap, a macOS live-wallpaper app (menu-bar app; HTML scenes in WKWebViews behind the desktop
icons). Repo: this folder (`livewall/`), GitHub `sameeeeeeep/wallpap`, site `wallpap.live` (GitHub Pages from `site/`).
Owner: Sameep (founder; wants calm, premium, cinematic quality — "Anyma-level restraint", not cartoony; no emoji; no
text bubbles). Latest release: **0.12.1** (notarized). Everything below is committed locally as WIP on `main`
(`f08e387` + this handoff commit) but **not pushed / not released**.

## Read first (in order)
1. `docs/backlog.md` — the full checklist of everything the owner asked for, with status. Source of truth.
2. `HANDOFF.md` — architecture overview (host Swift app, scenes, lw.js shim, build/dev).
3. `docs/polish-brief.md` — rules every scene must follow (§1 Codex art over procedural fakes, §2 pets, §3 music
   roles, §4 desktop layout awareness, §5 shared moon, §6 no bubbles/emoji, §7 plausibility audit, §8 weather that
   respects the world). Apply these to anything you touch.
4. `docs/scene-brief.md` (scene rules), `scenes/lw.js` header (shared runtime API), `docs/scene-polish.md`
   (dated log of every change + the Codex prompts used), `docs/SCENES.md` (add-on scene format).

## How to work
- Dev server: `python3 devserver.py 5210` (serves `scenes/`), open `http://localhost:5210/<scene>.html?virtual=1&muted=1`
  — with `virtual=1` step time via `LW.advance(seconds)` and save shots via `await LW.shot('name.png', scale, [x,y,w,h])`
  (writes to `shots/`). Look at every shot before calling something done.
- **Visual verification (use this — no browser needed):** `tools/wkshot` renders a scene in WebKit (the engine the app
  uses) and saves a PNG + prints JS errors: `./tools/wkshot <scene|url> <out.png> [w h stepsSeconds "js run before"]`,
  e.g. `./tools/wkshot "http://localhost:5210/train.html?virtual=1&muted=1&hour=12" shots/t.png 1600 1000 4 "__lw('settings',{skin:'swiss'})"`
  (rebuild with `swiftc -O -o tools/wkshot tools/wkshot.swift -framework AppKit -framework WebKit`). Needs the dev
  server (`python3 devserver.py 5210`). Output is 2× (retina) — downscale/crop with PIL to inspect. Open the PNGs and
  look at them before calling anything done.
- Tests: `node --test tests/*.cjs` (32 passing). Swift: `swiftc -typecheck -target arm64-apple-macos13 host/*.swift`.
- Build app: `./build.sh` (ad-hoc dev build into `wallpap.app`), `./build.sh --run`, release `./build.sh --dmg`
  (Developer ID + hardened runtime + notarize + staple via the existing `relay-notary` keychain profile — no setup
  needed). Dev hook: `LIVEWALL_DEV=1 ./wallpap.app/Contents/MacOS/wallpap` then `./dev.sh js|panel|pjs|psnap|state|scene:<id>`.
- Images: use your built-in image generation for anything that looks fake when drawn procedurally. For plate edits pass
  the original as a reference and say "preserve all geometry, change only lighting". Cut sprites from a flat #e6e6e6
  background with `python3 art-src/cycles/cut.py` (or `swift tools/cutout.swift <img> <outdir> <prefix> strip`).
  Generated sizes are ≤1536×1024 — for other aspects, compose/align (see `art-src/airport/tools/align.py`).
- Never reload/replace the owner's running wallpaper without asking; test in the browser first. Don't post to social
  media. Releases/pushes: only when the owner says ship.

## Pending — do these, highest priority first
### P0 — owner's latest feedback (fix before release)
1. **Train Journey** (`scenes/train.html`, 4 skins via `LW.settings.skin`: indian/shinkansen/swiss/orient):
   - a **blue frame** shows around the window opening (flat navy glass region of the interior plate not fully covered
     by the landscape; a previous agent started regenerating `scenes/art/train/**/win-mask.png` — verify/finish): the
     outside must fill the opening exactly in every skin, day/night, during the window-click surge and in tunnels;
   - in some skins the **outside illustration style doesn't match the interior** — repaint the panoramas/props with the
     interior plate as style reference, or grade them to match;
   - **trees/poles float in the air** — ground every trackside sprite on its parallax band's terrain line (trim
     transparent padding, contact shadow, correct depth scale), bridge piers too.
2. **Night Drive** (`scenes/drive.html`, pseudo-3D segment road; coast/forest/desert): "needs a lot of work in how
   things come in and out of frame, it breaks at times". Make every entry/exit seamless: roadside sprites fade/grow in
   from draw distance, correct hill-crest clipping, no flicker at segment joins, leave frame by scaling past the edge
   (not vanishing), cap near-sprite size; traffic drives in from the horizon and stays glued to the road; biome
   transitions crossfade; no road tearing at curves/crests; ultrawide + `?side=left`. Also: backdrops (sea/forest/desert
   silhouettes) are plain — repaint as Codex parallax plates. Forest biome ~4.3 ms/frame (budget 4).
3. **Menu panel** (`scenes/menu.html`, host bridge `host/Panel.swift`): the Look/skin block was just fixed (2-col grid);
   re-check every scene's controls render without overflow (light + dark mode).
### P1 — finish + verify, then release 0.13
4. **Cats + Grass** polish was stopped mid-way (paw planting is DONE and tested; scenes load clean): finish pets
   integration + Pets toggle (pandas amble into the bamboo when off), no bubbles/emoji (cats used to "say" things —
   verify removed), shared moon, weather §8, layout §4, and the grass "mountain band" shader change the agent was
   wiring when stopped (check `git diff f08e387~1 -- scenes/grass.html` context).
5. **Rooftop + Ramen day plates** were generated (`scenes/art/rooftop/bg-day.png`, `scenes/art/ramen/bg-day.png`) —
   verify they align with the night plates (rooftop night is 1942×809, generator outputs 3:2 → likely needs alignment
   or recomposition); fix or remove.
6. **In-app test** of all new host features (energy modes + click-to-resume, layout detection, reminder card,
   auto-cycle, Discover/Custom tabs, skins gating for free users, license flow with a Dodo test key, Music Mode +
   Beat Sync with real harmony — `BeatSync.swift` now sends chroma/chord/key/tempo/sections) and every scene in WebKit
   (perf: Copper Rain ~7 ms, Magnet Bloom ~5 ms, Records ~6 ms in Chromium — check on the real app).
7. **Release 0.13** when the owner says ship: bump `host/Info.plist`, commit, `./build.sh --dmg`, `gh release create`,
   push (deploys the new landing page in `site/` — already rebuilt: scroll story, picker, demo songs, auto-tour,
   make-a-scene, new pricing), update `site/catalog.json` add-ons if any, install to `~/Applications`.
### P2 — paused for budget (resume after release)
8. **Airport** add-on (art + `layout.json` + kit plate demo ready in `art-src/airport/`, `art-src/kit-addons/plate-demo/`).
9. **Realistic plate scenes** pipeline (`tools/plate-scene/`) + Marine Drive, Taj Mahal, Ghibli-inspired Hillside
   Valley (owner calls these lower priority).
10. **Train passers-by** (full-figure painted people; art parked in `art-src/train/deferred-people/`).
11. **More visualizer skins** (see `docs/visualizer-skins.md`: Vortex Rings, Ripple Tank, Pilot Wave, Pendulum Wave,
    Wooden Mirror, Light String, Suminagashi, Noctiluca, Aurora, Murmuration, Wind Dunes) + Harmonograph rosettes.
12. **Kit add-ons refinement**: Butterfly Garden flowers look pasted, Beach crabs are blobs, Sky & Kites clouds/kites flat.
13. **Illustrative living city** (SimCity-like, traffic, day/night).
14. **Painterly pet sprites** to match the painted rooms (current pets are outlined cartoon sprites).
15. **Art compression** (scenes 8–15 MB each; needs WebP/pngquant — not installed; keep filenames or update refs).
16. **Social media**: remaining clips (calm, weather, pets, desktop mock, cymatics) via `marketing/` pipeline
    (see `marketing/README.md`); posts are drafted in `marketing/posts/` — never post.

## Owner preferences to respect
No emoji anywhere (custom SVG / SF Symbols instead). No speech bubbles; animals show at most a small "meow/purr/woof".
Right ~28% of the screen (or whatever `LW.layout` says) stays calm for widgets/icons. Weather only where the sky is
exposed (no rain indoors, none in tunnels); snow accumulates and melts. Realistic over cartoony; when procedural looks
cheap, generate art. Music: one source per scene (players show the track; Speakeasy is beat-sync only; visualizers in
the Music category). Free = every scene's default look; Pro ($5, Dodo license keys) = all skins + Music/Calm/reminders/
live weather/soundscapes/custom scenes.
