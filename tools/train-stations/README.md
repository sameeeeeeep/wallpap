# Train station QA

Runtime: `scenes/train-stations.js`, loaded only by Train Journey. No host or installed app changes.
`__train.forceStation(24)` requests a 24-second dwell at the next safe stretch; it does not teleport.
`__train.stations.report()` exposes phase, speed, stop distance, resource ownership and load/release counts.
The capture fixture explicitly places the QA train on a known safe stretch; normal calls never do this.

## Reproduce

- `python3 tools/train-stations/capture.py [indian|shinkansen|swiss|orient]`
  uses the existing off-screen `tools/wkshot` with file:// loading. Sequences: approach, exact stop,
  dwell, departure and cruise; four skins × day/night, rain, snow and two 3440×1440 left-layout checks.
  Outputs scene/window JPEG sheets and JSON reports under `shots/train-stations/`; deletes raw captures.
- `python3 tools/train-stations/benchmark.py`
  measures frame work with the real performance clock (virtual mode overrides it, producing zero timings).
  Baseline is `f6191d1:scenes/train.html`, before the station runtime was wired. Cruise/baseline/released
  samples start at the same speed and route distance; warmup precedes three 90-frame samples.
- `python3 tools/train-stations/idle.py`
  compiles only temporary off-screen QA executables, never the app. Drives virtual frames at 30 fps from
  a native timer because offscreen WebKit throttles normal RAF. Reads kernel CPU/physical-footprint
  counters for the harness and its own WebContent, GPU and Networking PIDs, obtained from WKWebView
  getters. All profiles receive the same 69-second virtual warmup and route reset, then three independent
  15-second samples/profile in balanced order. The released fixture checks
  that a complete stop loaded/released its art and returned to cruise before measurement. Includes IPC
  overhead; these are harness comparisons, not installed-app power measurements. Requires macOS/Swift.
  Optional `idle.py released` repeats only that profile against the saved baseline/cruise samples.
- `node --test tests/*.cjs`
- `python3 tools/train-stations/prepare.py [generated-image-source-directory]` rebuilds packed art.

Run performance tools serially without other captures. Scripts stop at 3 GiB free (slightly stricter than
3 GB). If a capture finishes while disk crosses the threshold, delete only this task's remaining PNGs;
do not continue rendering or delete unrelated files. Baseline HTML and QA executables are temporary.

## Verified 2026-10-04

Final 12-sequence file:// matrix: 108 snapshots retained as 24 JPEG contact sheets, all inspected.
Each sequence has three stopped frames with identical distance and zero speed, zero JS/image-load errors,
and one art load/release returning owned bytes to zero after departure. Includes all four skins by day/night,
Indian rain, Swiss snow, Japanese night-rain ultrawide-left and Swiss day ultrawide-left. The three day sheets
affected by the last pigeon refinement were recaptured and inspected. No duplicated/mirrored station art.

All **103 Node tests pass**, including seven station tests. Evidence is in `shots/train-stations/README.md`,
`acceptance.json`, `tests.log`, `*-scene.jpg`, `*-windows.jpg` and `*-report.json`. The full-scene sheets
preserve the carriage framing; window sheets expose feet, occlusion, canopy weather and lamp lighting.
All raw capture PNGs removed. An earlier pass stopped at 2.0 GiB; after free space recovered above the guard,
the final matrix and performance work resumed. No unrelated disk cleanup was performed.

## Performance

Kernel process-family measurements: 1600×1000 viewport, native-driven 30 fps, equal 69-second virtual
warmup and route reset, three 15-second samples/profile. CPU is a percentage of one CPU core; physical
footprint includes the offscreen host, WebContent, GPU and Networking processes. Values are median (range).

| Profile | CPU | Physical footprint, MiB |
|---|---:|---:|
| Previous scene baseline | 16.9% (15.5–18.4) | 271 (263–286) |
| New scene before a stop | 17.0% (15.7–18.7) | 280 (273–288) |
| New scene after release | 15.2% (15.0–18.7) | 280 (275–294) |

No clear persistent CPU increase in this harness. The median footprint after release equals the new
scene's pre-stop footprint; both are 9 MiB above the previous scene's median, with overlapping sample
ranges. This is a modest total-process difference, not a claim of zero browser-cache retention. No
installed-app measurement was made. Explicit image-source/handler detachment and canvas resizing release
resources immediately instead of depending only on JS garbage collection; stale decoded loads also detach.
The released profile was remeasured after that cleanup (`idle.py released`), retaining the equal-warmup
baseline/cruise samples. Canonical raw samples: `shots/train-stations/idle-performance.json`.


Frame-work samples (1600×1000 viewport, three 90-frame samples/profile, real performance clock):

| Profile | Median total ms/frame | Range | Median JS ms/frame |
|---|---:|---:|---:|
| Previous scene baseline | 7.18 | 6.21–8.21 | 0.56 |
| New scene, cruise before a stop | 6.64 | 4.77–6.74 | 0.66 |
| Station dwell | 2.26 | 1.86–7.30 | 0.14 |
| New scene, cruise after release | 3.70 | 2.60–5.28 | 0.33 |

These timings have substantial scheduler/GPU variance; they support frame-budget headroom, not a claimed
speedup. `shots/train-stations/performance.json` contains every sample. The original overlapping render
benchmark was rejected; the final benchmark ran serially and restored equal cruise starting positions.
Station image+canvas ownership peaks at **9,461,760 bytes (9.02 MiB)** and is **zero before preloading and
after departure**. This ownership count excludes browser decoder/GPU caches; kernel measurements above
include their physical footprint. Five packaged WebP assets total approximately 828 KiB on disk.

## Limits

One station design per skin, with shared walker/vendor art. No door-opening/boarding animation shipped:
life consists of waiting (Indian), walking, a rooted serving vendor and a daytime pecking pigeon. A credible
boarding sequence needs additional directional poses and door geometry; the current camera sees the
platform side, not the carriage door. Pigeon is naturally hidden behind the Japanese safety barrier.
All captures were muted: sound was code-reviewed for speed coupling but not auditioned. Visual acceptance
is the agent's inspection, not owner sign-off. No push/release/app rebuild/reload or owner-screen interaction.
