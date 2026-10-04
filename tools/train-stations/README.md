# Train station QA

Runtime: `scenes/train-stations.js`, loaded only by Train Journey. No host or installed app changes.
`__train.forceStation(24)` requests a 24-second dwell at the next safe stretch; it does not teleport.
`__train.stations.report()` exposes phase, speed, stop distance, resource ownership and load/release counts.
The capture fixture explicitly places the QA train on a known safe stretch; normal calls never do this.

- `python3 tools/train-stations/capture.py [indian|shinkansen|swiss|orient]`
  uses the existing off-screen `tools/wkshot` with file:// loading. Sequences: approach, exact stop,
  dwell, departure and cruise; four skins × day/night, rain, snow and two 3440×1440 left-layout checks.
  Outputs scene/window JPEG sheets and JSON reports under `shots/train-stations/`; deletes raw captures.
- `python3 tools/train-stations/benchmark.py`
  uses the real performance clock (virtual mode overrides it, producing zero timings). Baseline is
  `f6191d1:scenes/train.html`, before the station runtime was wired. Run without concurrent renders.
- `node --test tests/*.cjs`
- `python3 tools/train-stations/prepare.py [generated-image-source-directory]` rebuilds packed art.

Both scripts stop at 3 GiB free. The owner requires stopping below 3 GB. If a capture completes while disk
space crosses the threshold, its PNGs may require deletion; do not keep rendering or delete unrelated data.

## Current acceptance status — DISK GUARD STOP

Rendering stopped with df reporting **2.0 GiB free** on 2026-10-04. Remaining task-owned PNGs were deleted.
All four initial skin/day/night sequences, rain/snow and left/ultrawide sequences rendered successfully.
Their reports show zero JS/image errors, zero speed and fixed distance throughout dwell, and station-owned
image/canvas bytes released to zero after departure. These are earlier revisions: night exposure and
walkway placement were subsequently refined. Final recaptures were interrupted by the disk guard.
The final foot-placement adjustment passed seven station tests; the immediately preceding full suite
passed 102/102. Re-run the full suite and final capture matrix after space is available, then inspect ALL
final sheets. Do not call this owner-approved visual quality yet.

No door-opening/boarding animation was shipped: life consists of waiting (Indian), walking, a rooted
serving vendor, and a daytime pecking pigeon. A believable boarding sequence needs additional directional
poses/door geometry. The current camera sees the platform side, not the carriage door.

The only completed real-clock benchmark ran concurrently with captures and is NOT a controlled regression
measurement: baseline 2.96–5.04 ms total/frame, cruise 6.62–7.11, dwell 9.68–14.69, released 4.58–8.23.
JS-only readings: baseline 0.59–1.20 ms, cruise 0.69–1.86, dwell 0.48–0.51, released 0.31–1.26.
Do not use these to assert the idle-CPU requirement passed. The revised benchmark fixture (warm caches,
equal speed/route starting point, no overlapping captures) still needs to run. Peak explicitly owned
station image+canvas storage is 9,461,760 bytes (~9.02 MiB); zero before preloading and after release.
Browser decoder/GPU caches and process RSS were not measured. Packaged five WebP assets are under 1 MB.
