# Koi shoals verification

Use this worktree only. Start `python3 devserver.py 5286` from the repository root;
the scripts use the existing `tools/wkshot` binary without building the app.

Run `python3 tools/koi-shoals/capture.py day` and repeat for `night`, `rain`, `left`,
`ultrawide`, `calm`, `small`, and `companions`. Requires Pillow. Every run checks
for at least 3 GiB free before capturing, rejects JS/image errors, creates four
downscaled JPEG contact sheets and four detail sheets, and removes its raw PNGs.
Evidence is local in `shots/koi-shoals/` (gitignored).

All use `?virtual=1&muted=1&shotSeed=41`, with 3 seconds to settle. `WKSHOT_FRAMES`
samples 0, 1, 1.2, 1.6, 3, 5, 6, 8, 10, 12, 14, 14.5, 15, 16, 18, 22 seconds.
The shared pre-script `sequence.js` sends a 2,200 px/s cursor sweep at 1s, leaves
at 1.25s, parks a cursor near the second school from 6–13s, then sends an actual
`down`/`up` food drop on open water near the third school at 14s. Logs retain group
spread, depth, scatter state, pellet portions and event times for each frame.

Default size is 1600×1000; small is 800×600; ultrawide is 3440×1440 with
`side=left`. The left run adds a widget rectangle within the clear band to check
the independent `avoid` geometry. Companions injects working Claude and attention
Codex koi, plus music, so glows and the shared pattern atlas are exercised.

For timings, pass `perf.js` as wkshot's pre-script (initial step count **0**).
For example:

```sh
./tools/wkshot 'http://localhost:5286/koi.html?virtual=1&muted=1&hour=12&shotSeed=41' shots/koi-shoals/perf.png 1600 1000 0 "$(cat tools/koi-shoals/perf.js)"
```

Baseline source is commit `bc3a78a8be245c417fae750bfa3b3d1ee17a455e:scenes/koi.html`.
For comparison, temporarily serve that content as `scenes/koi-shoals-baseline.html`
and use the same command against that URL; remove the temporary file afterward.
Do not overwrite the working scene or use another worktree. Downscale the timing
capture to JPEG and delete its PNG too.

The harness measures 300 frames after 60 warmup frames with
`Performance.prototype.now.call(performance)` (the real clock, bypassing virtual
`performance.now`). `__shotPoll` submits six virtual 30 Hz frames per host poll;
host polls leave time for GPU work. Offscreen WebKit throttles `setInterval`, so
the initial timer-driven harness timed out and was replaced by this host-driven
one. Tick timing includes JS and driver submission/blocking, not GPU completion
or display latency. The explicit shoal subtotal is update + mesh emission.
WebKit quantizes the clock to roughly 1 ms, so use sample means, not single-frame
sub-millisecond percentiles. The second run also counts `gl.drawArrays` calls.
The final harness additionally warms 200 CPU-only iterations and times 30 blocks
of 20 updates + mesh emissions, resetting the existing vertex buffer's write
cursor each time. No GL calls occur in these blocks; this amortizes the clock's
quantization. OS scheduling can still affect wall-clock measurements.

Acceptance on Apple M1 / macOS 26.5.2 at 1600×1000: the CPU-only mean was
**0.183 ms/frame**, block p95 **0.350 ms/frame**. In the same run, in-frame shoal
work averaged **0.240 ms**. There are **five draw calls before and after**, and
the existing 60,000-vertex buffer never grows (44 minnows add 2,112 vertices).
Hot update/emission paths contain no new arrays, objects, closures or timers.

Full-frame JS + submission varies with background load. Across three baseline
runs the means were 1.053, 2.087, 0.863 ms; across three final-code runs they were
1.187, 3.760, 0.830 ms. Median run means: **1.053 → 1.187 ms**. The contended
3.760 ms run also reports 0.703 ms for the in-frame shoal subtotal; this is why
the report includes the batched CPU measurement and all raw runs rather than
treating a single wall-clock frame as CPU time. Initial implementation repeats
reached 0.563 ms; hoisting common easing factors and rejecting distant koi
capsules before taking square roots reduced the actual steering work.

Run `node --test tests/*.cjs`. Eight focused tests exercise counts, mesh deformation,
swept input, regrouping, ambient pacing/depth, food nibbles, adult exclusion,
layout rectangles and still-cursor spacing. Visual checks remain required.
