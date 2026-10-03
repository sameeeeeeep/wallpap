# 2026-10-03 — one command, three new plate scenes

Additive scene-polish log: the owner restricted this task to new files. The
existing `docs/scene-polish.md`, shared pipeline scripts, other sessions' add-ons,
shared catalog, and installed wallpaper app were not edited by this work.

## What shipped locally

`addons/_template/index.html` loads `art/scene-config.json` and the shared
`tools/plate-scene/plate-fx.js` presets. Every generated scene has byte-identical
HTML and preset JavaScript. Only JSON and art differ. No hand-edited paths,
scene-specific JavaScript, or scene-specific branches were used.

`tools/plate-scene/new.py` expands the existing `prompts.py` templates into a spec,
executes `plate.py gen → build → masks → pack`, derives conservative paths from
masks, copies the template/runtime, creates the manifest and thumbnail, and runs
the existing packer in an isolated staging tree. Local ZIPs are under
`art-src/<id>/package/`; the real `site/catalog.json` is not changed.

Three exact first-run commands (launched concurrently):

```sh
python3 tools/plate-scene/new.py kyoto "A Kyoto temple garden with a koi stream and maple trees"
python3 tools/plate-scene/new.py harbour "Santorini-style harbour with fishing boats at golden hour"
python3 tools/plate-scene/new.py iceland "Icelandic black-sand beach with basalt sea stacks"
```

Default inference: water + birds for all three, lights for Kyoto and Harbour,
boats for Harbour. The Harbour water path was derived automatically, with no
fallback needed. Roads/walkers remain optional presets, tested with masks/paths;
these three descriptions do not imply traffic or walking people.

## Timings and package sizes

All numbers are measured wall-clock seconds, including subprocess time. The
first runs used seven images each: day, dusk, night, overcast, sky/exposed/water
keys. Generation was through the existing Codex CLI calling built-in ImageGen;
no separate image API key or fallback image API was used.

| Scene | Gen | Build | Masks | Art pack | Configure | ZIP | Total | ZIP size |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Kyoto | 248.71 | 44.24 | 25.65 | 1.48 | 0.12 | 0.23 | 320.43 s / 5.34 min | 3.40 MB |
| Harbour | 240.64 | 45.05 | 15.74 | 2.48 | 0.71 | 0.46 | 305.09 s / 5.08 min | 3.00 MB |
| Iceland | 201.87 | 42.33 | 4.14 | 1.45 | 0.13 | 0.22 | 250.15 s / 4.17 min | 2.58 MB |

Shared-template polish followed the first screenshot review: replaced the blocky
boat silhouette with a reusable generated fishing launch, kept sun/moon in the
clear band, and started snow bare instead of Kit's 65% initial coverage. The
original commands plus `--resume` applied these changes without regenerating any
plate or mask: Kyoto 71.00 s, Harbour 62.95 s, Iceland 56.12 s. The final ZIP sizes
above include that polish. The one-time shared boat generation took 24.7 s.

First-generation timings exclude implementation, shared-preset polish, and visual
QA; they demonstrate sentence-to-package throughput, not the total development
session. Final eight-state WebKit capture runs took 42.06 / 45.28 / 44.23 s.
Observed generation latency is not guaranteed for future scenes.

Full records: `art-src/{kyoto,harbour,iceland}/timings.json` and
[WebKit reports](plate-scene-proof/results.json).

## Visual verification

Ran `python3 tools/plate-scene/verify-new.py kyoto harbour iceland --extended`.
It reused the existing development server on 5210 and the existing
`scenes/_addons -> ../addons` symlink. No running wallpaper app was touched.

Opened all final contact sheets and inspected every frame: day (12), night (0),
rain, golden hour (18.1), left/avoid layout, calm, snow, and 2400×1000 mirrored rain.
All 24 captures report zero JavaScript errors and all runtime assets loaded.
Full images are local at `shots/one-command/<id>-<case>.png`.

- [Kyoto proof](plate-scene-proof/kyoto-contact.jpg): left temple/maples, open water
  in the quiet area; coherent warm windows at night and reflected light. Mirrored
  framing keeps the temple clear of left widgets. Kyoto art interprets the stream
  as a broad garden waterway; the water preset animates shimmer/ripples, not koi.
- [Harbour proof](plate-scene-proof/harbour-contact.jpg): boats stay on the derived
  water route, small enough to remain distant; night windows, golden-hour stone,
  masked rain, and mirrored framing verified.
- [Iceland proof](plate-scene-proof/iceland-contact.jpg): sea stacks stay left (or
  right when mirrored), no artificial lights enabled, restrained shimmer and
  dark shore at night. Golden-hour light direction and sun now agree.

Weather is rendered to a transparent target and multiplied by the exposed mask,
so entire rain streaks and snowflakes are clipped at shelter boundaries. Water
ripples and splashes also consult the masks. New snow coverage after four virtual
seconds was 0.0165 for all three scenes; it no longer starts at 0.65. Kit retains
its accumulation/melt model. No new speech bubbles or emoji; calm uses LW's shared
phase guide. Ambient beds use the existing ambience bus and respect mute.

The reported final JS averages ranged from 0.09 to 0.53 ms per frame. These are
Kit's JS measurements in wkshot, **not GPU or installed-app performance results**.
Generated semantic masks remain approximations; future places still need the
visual check. Optional traffic and walker behaviors passed automated coverage,
but these three sample scenes do not provide visual examples of those presets.

## Tests and artifact integrity

- `python3 tools/plate-scene/test_new.py`: 7 passing, including mask routes around
  holes, missing/thin masks, protected paths/IDs, ownership/resume checks, and
  stopping before packaging when generation returns success without images.
- `node --test tools/plate-scene/test_presets.cjs`: 4 passing, covering water-only
  clicks, widget/shelter guards, boat/traffic/walker mask gates, and calm holds.
- `node --test tests/*.cjs`: existing 32 tests pass.
- All three ZIPs pass CRC integrity and required-entry checks. The packer excludes
  host-provided `lw.js` and `astronomy.js`; the dev folders include them for preview.
- Template/preset equality, hashes, package sizes: [manifest](plate-scene-proof/manifest.json).

## Image prompts and provenance

Exact expanded prompts for every plate and semantic key are committed at
`art-src/<id>/prompts.json`, with their input specs alongside. They use the existing
master/edit/key templates; edits preserve geometry and change lighting only.
All generated plate/key sources remain locally in `art-src/<id>/raw/`.
Shipped art is in `addons/<id>/art/`. No manual painting or per-scene mask patches.

The reusable boat is `addons/_template/art/shared/fishing-boat.png` (built-in
ImageGen source `exec-ce91eb5f-7f15-4b17-a863-783eb995e8f1.png`). The launcher trims
transparent padding and downsamples a copy into boat-enabled scenes. Exact prompt:

> Use case: photorealistic-natural. Production transparent PNG sprite for a calm photorealistic harbour wallpaper. Exactly ONE small traditional Greek wooden fishing launch, weathered cream cabin, dark muted navy hull, thin wooden mast, a little fishing rigging, NO sail. Entire boat fully visible with generous empty transparent margin on all sides. Side view pointing right, viewed slightly from above at about 15 degrees so a sliver of deck and cabin roof is visible. Realistic proportions, authentic modest fishing craft, neutral diffuse daylight, fine natural wood detail, subdued colours, no outlines or cartoon shapes. Flat broadside hull baseline, suitable for appearing very distant at 25 pixels wide on screen. Background genuinely transparent. NO water, no wake, no reflection, no ground, no shadow outside boat, no people, no text, no lettering, no flags, no other objects, no panels or atlas grid. This is a reusable single isolated cutout asset, not a harbour illustration.

Local work commits: `cb130a5` (template), `1d19e40` (launcher), `dc9ac70` (three
scenes, reusable boat and visual verification), followed by the documentation
commit. No push, release, installation, reload, catalog publication, or post.
