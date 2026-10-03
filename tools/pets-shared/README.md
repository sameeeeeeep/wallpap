# Shared pet acceptance harness

Uses the existing `tools/wkshot` binary in an isolated WKWebView. Serve `scenes/` on
`http://localhost:5210`; no app build, installation or running-app interaction is involved.
Run serially (especially timing), from this checkout:

```sh
python3 tools/pets-shared/capture.py
python3 tools/pets-shared/extras.py
python3 tools/pets-shared/controls.py
python3 tools/pets-shared/benchmark.py
node --test tests/*.cjs
python3 tools/pets-shared/audit.py
```

`capture.py [scene ...]` records 29 continuous frames per scene at noon and midnight:
lateral/front/back walks; side/front/back jumps; a linked perch jump; two-pet encounters;
resting at the scene's homes. Pandas intentionally keep the lateral view at every depth
request. Broad lanes allow passing; narrow lanes require waiting. The wide-floor unit
regression separately requires both animals to finish a same-lane swap without overlap.
`scenario.js` is the injected timeline. Hidden test actors never participate in production
behavior. The virtual-only `forceWalk` / `forceJump` controls cannot run in normal mode.

`extras.py` records the precise calico takeoff at 0.00/0.20s and through landing, plus
ultrawide left-widget compositions for all eight scenes. `controls.py [scene ...]` checks
natural behavior, actions/reminders, full exit, staying off, return, panda count and rain.
Every harness captures console errors as well as uncaught exceptions: the virtual LW
clock catches update errors internally, so checking only `window.onerror` is insufficient.

`benchmark.py` compares scene HTML and pet-motion.js at `03719de` with the working tree,
using the same viewport (1200×750), fixed noon and a seeded random stream. It warms 90
frames, then measures seven 90-frame batches, including a final canvas readback / GL
finish for each batch. Values are elapsed batch time divided by frames, not display
refresh FPS or installed-app profiling. All raw samples are retained in performance.json.

Evidence goes to `shots/pets-shared/<scene>/`: full-scene JPEG grids, close-up contact
sheets, control images and machine-readable reports in `.log` files. Raw capture PNGs
are removed after conversion. Stop below 3 GiB free or if evidence reaches 1 GiB.
