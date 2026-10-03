# Make a scene in one command

From the repository root, on macOS with Python 3, Pillow, NumPy, SciPy, and a signed-in
`codex` CLI that supports built-in image generation:

```sh
python3 tools/plate-scene/new.py my-harbour "A quiet Mediterranean fishing harbour" --category Nature --presets water,birds,boats,lights
```

No scene JavaScript or hand-drawn paths. Omit `--presets` to infer suitable life from
the sentence. The command creates the spec using the existing prompt templates,
then runs `plate.py gen → build → masks → pack`, configures the shared template,
and invokes `tools/pack-scene.sh` in an isolated staging directory.

**Output**

- `addons/my-harbour/`: complete scene folder, including `index.html`, `scene.json`,
  thumbnail, shared runtime, plates, masks, and `art/scene-config.json`.
- `art-src/my-harbour/package/my-harbour-1.zip`: local installable package;
  `catalog-entry.json` is a local catalog fragment, not a published catalog update.
- `art-src/my-harbour/{spec,prompts,timings}.json`: reproducible inputs, exact expanded
  prompts, and elapsed seconds for every stage and run. Intermediate art and logs
  stay alongside these files, locally ignored by Git.

**Presets**

`water,birds,boats,traffic,lights,walkers` are supported. Boats imply water.
Sky, exposed-mask weather, a quiet ambient bed, calm breathing, and click-to-ripple
or breeze are included. Birds are distant flocks; boats use a reusable generated
cutout; traffic is distant night light trails; walkers are tiny distant silhouettes.
Road/walking masks are requested only when needed. Paths are derived inside eroded
mask components; absent or unsafe paths disable that actor and record the fallback
in `scene-config.json`. Water, sky and weather continue without paths.

All scenes use the same template and preset code. Optional tuning is **data only**:
`layers` names plates/masks, `life` sets preset parameters, and `paths` contains
normalised plate coordinates. Layout mirrors with `LW.layout`; avoid regions suppress
actors. Rain/snow are clipped across their entire rendered layer to the exposure mask.

**Resume and inspect**

Rerun the original command with `--resume` after an interruption or to rebuild with
updated shared presets. Existing images are reused. Other existing scenes are
refused. `--jobs 3` reduces generation concurrency (default 5); `--prepare-only`
writes the spec and prompts without generating images. Generation failures stop
before packaging; inspect `art-src/<id>/logs/` and `timings.json`.

```sh
python3 tools/plate-scene/verify-new.py my-harbour --extended
```

This starts `python3 devserver.py 5210` if needed, sets up the development add-on
symlink, and runs `wkshot` for day/night/rain plus golden hour, left/avoid layout,
calm, snow, and ultrawide. Open `shots/one-command/my-harbour-contact.jpg` and the
full PNGs; assertions and timings are in `shots/one-command/results.json`.
Preview: `http://localhost:5210/_addons/my-harbour/index.html?virtual=1&muted=1`.

**Measured proof (2026-10-03):** Kyoto 5.34 min, Harbour 5.08 min, Iceland 4.17 min
from sentence to local ZIP; image generation dominated. Shared-preset polish was
then applied through `--resume` in 1.18 / 1.05 / 0.94 min. These are observed runs,
not guaranteed latency. See [verification and exact commands](../../docs/scene-polish-one-command.md).
The command does not publish, change the shared catalog, install, or reload wallpap.
