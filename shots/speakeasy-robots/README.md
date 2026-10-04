# Speakeasy robot band — evidence (2026-10-04)

WKWebView (`tools/wkshot`, `?virtual=1&muted=1`), 1600×1000, music from music.js's fake stream through the real
`__lw('beat')` path, scripted by `tools/speakeasy-band/scenario.js`; reproduce with
`python3 tools/speakeasy-band/sequence.py <port> night,day` (dev server: `python3 devserver.py <port>`).

- `night-sequence.jpg`, `day-sequence.jpg` — 22 stage crops each: idle → play pressed (heads turn) → 4-beat stick
  count-in → intro (brushes, pads) → build (snare 8ths, ride swell) → drop (crash) → groove (ride + backbeat, three
  frames 1/8 beat apart) → breakdown (brushes) → stop (final crash) → settle → idle → song B with the singer rising on
  the lift → quartet → stop (she sinks) → idle trio.
- `night-full.jpg`, `day-full.jpg` — whole room: idle, groove, idle again, quartet.
- `*-log.json` — mode/section timeline per run; zero JS errors, zero failed images.
- `closeup-drummer-groove-1beat.jpg` — 12 frames across one beat: sticks lift and land on the ride/snare on time.
- `closeup-quartet-night.jpg`, `closeup-pianist-play-vs-idle.jpg` — part seams, occlusion, hands on the keys / in the lap.
- `taps-glissando-twirl.jpg` — tapping the resting pianist (glissando, keys go down under the hand) and drummer (twirl).
- `layout-left-and-ultrawide.jpg` — `?side=left` (stage slides right, widgets left) and 3440×1440.
Raw PNGs were deleted after JPEG conversion.
