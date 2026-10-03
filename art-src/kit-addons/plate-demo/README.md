# Kit.plate reference demo (airport input)

How a realistic scene is built from Codex plates with `scenes/kit.js`: `Kit.plate({ layoutUrl, base, masks })` reads
`art-src/airport/layout.json` (plates, occluders, paths, scale model); a live `Kit.sky` shows through `sky.png`; night lights
come on automatically (night − day plate); `exposed.png` limits rain/snow; an A320 rolls out along `layout.paths.rollout` at
the layout's metric scale, and a parked one at S4 is occluded by mast D via `layer.occlude(groundY, rect)`.

- `sky.png` — sky mask derived from `plate-day.png` (blue, bright, connected to the top edge, 1.5 px feather). Reusable for the Airport scene.
- `exposed.png` — test-only exposure mask (terminal masked out).

Run (dev server serves `scenes/`): link this folder plus the airport art and runtime, open, then remove the link:

    ln -sfn "$PWD/art-src/kit-addons/plate-demo" scenes/_plate-demo
    for f in lw.js astronomy.js kit.js; do ln -sf ../../../scenes/$f art-src/kit-addons/plate-demo/$f; done
    ln -sfn ../../airport art-src/kit-addons/plate-demo/art
    open "http://127.0.0.1:5210/_plate-demo/index.html?virtual=0&hour=18"
    rm scenes/_plate-demo art-src/kit-addons/plate-demo/{lw.js,astronomy.js,kit.js,art}
