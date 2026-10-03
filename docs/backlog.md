# wallpap backlog — everything asked for in the 2026-10-02/03 thread

Status: [ ] todo · [~] in progress (agent) · [x] done · owner in brackets

## Priority verification pass — 2026-10-03
- [x] P0 Train: actual mask bounds cover both openings; muted panorama grade; trees grounded on the matching moving foreground, smaller with contact shadows, excluded from bridges. All four skins checked in WebKit day/night/surge/tunnel.
- [x] P0 Night Drive: continuous distance/detail fades, crest clipping, road-aligned traffic, painted biome/roadside assets. Opened motion contact sheets (66s each), ultrawide left/rain and individual biome shots. Forest 3.88 ms total / 3.08 ms JS at 1440×900.
- [x] P0 Menu: all 16 scene control sets checked at 340px in light/dark; Bowls timer overflow fixed; expanded shared sections also inspected.
- [x] P1 Cats + Grass: verified departures/returns, reminder and count changes while off, shared moon, accumulation/melt and mirrored/avoid layouts; fixed mountain seam and painted Cats clouds.
- [x] P1 Rooftop + Ramen: source and rendered day/night landmarks align; retained plates. Fixed Rooftop foreground cutouts sampling night art during daylight; day/night/dawn/dusk and wide captures inspected.

Baseline: `node --test tests/*.cjs` passes all 32 tests. Follow this order; inspect `wkshot` screenshots before advancing and commit each finished item locally. No push, release or running-app replacement.

## App / menu (host — Claude)
- [x] Energy modes: always / pause when away (30s–30m, 2m recommended) / pause on battery; crisp pause (no blur), click resumes; never pause under our own panel/menu
- [x] Panel dark mode (follows system)
- [x] Music Mode indicator: which scenes play music; note when current scene has no player
- [x] Renames: Corner Café, Train Journey
- [x] Tiers: every scene free with default skin; Pro = all skins + Music/Calm/reminders/live weather/soundscapes/companions ($5, Dodo)
- [x] Keep clear for widgets/icons: auto-detect + Auto/Right/Left/Off (scenes retrofit = per-scene agents)
- [x] Reminder card over apps (water/stretch/breathe) + breathe reminder timer
- [x] Skins infra + Pets on/off per scene
- [x] Time modes: Live / Slow cycle / Fast cycle (+ fixed moments)
- [x] Every scene action/setting in menu + panel
- [x] Free-user states in panel: what free users see, Pro CTA, enter license, share with others
- [x] Scene store in the menu: "Add more" (catalog: featured / new), users add scenes to their list; featured section
- [x] "My Scenes" tab for custom/user-uploaded scenes; free users cannot run custom scenes
- [~] Authors on scenes (scene.json author/link) [x app] + submission (docs/SCENES.md + GitHub issue form) [x] + featured/community on website [Landing agent]
- [x] Auto-cycle scenes (every N min, order/shuffle, which scenes)
- [x] No emoji/glyphs in host UI: SF Symbols in native menu (♪, ⚠), custom SVG icons in panel
- [~] Register new scenes + skins: drive, kinetic, fluids, skies, cymatics skins [x]; train skins (pending agent); kit add-ons via catalog [x]

## Scenes (agents)
- [x] Walk/run cycles + paw planting (17 cycles, planted paw ±1 px, tests) — cats/grass polish beyond that stopped by user (partial edits verified working)
- [x] Snowy Cabin realism + real fire (painted plates day/night/summer, flipbook fire, snow accumulation, record player, pets lit by room)
- [x] Corner Café (turntable / Pro jukebox, painted street + cars, day/overcast rooms) + Record Store (painted deck, window mask, dog bed) — records ~6 ms/frame (watch)
- [x] Speakeasy beat-sync player piano (no track UI); Rooftop boombox→projector display + chairs fixed; Ramen painted radio/noren/lanterns; indoor rain-splash bug fixed (ramen counter)
- [x] Bowls window light + layout; Train fast-forward (no black) + walkman; tunnel weather; painted trackside
- [x] Koi beat pulse + scale glimmer + moon reflection + snow on pads
- [x] Koi: 14 varieties dealt from a shuffled deck (no repeats); calm/music circling per-koi weights, directions, radii + straight glides (no synchronised banana ring)
- [x] Night Drive coast/forest/desert (registered, free default) — follow-up: Codex-painted parallax backdrops per biome; forest perf ~4.3 ms
- [x] Scene kit (kit.js, plate pipeline) + Butterfly Garden, Beach, Sky & Kites packed — follow-up refinement: garden flowers look pasted, beach crabs are blobs, kite clouds/kites flat
- [x] Visualizers: real harmony (chroma/chord/key/tempo/sections in BeatSync + music.js) + Faraday, Filings, Copper Rain, Harmonograph, Magnet Bloom, Komorebi — registered (Kinetic, Fluids, Skies) + skins. Follow-ups: Copper Rain ~7 ms / Magnet Bloom ~5 ms (verify in WebKit), Harmonograph rosettes; deferred skins: Vortex Rings, Ripple Tank, Pilot Wave, Pendulum Wave, Wooden Mirror, Light String, Suminagashi, Noctiluca, Aurora, Murmuration, Wind Dunes
- [x] Shared photoreal moon (scenes/moon.js) — adoption in every scene [all agents]
- [~] Weather smarts everywhere (brief §8 sent to all scene agents): rain only where sky is exposed (never indoors — e.g. splashes on a wooden floor), none in tunnels; snow accumulates on exposed ledges/roofs/ground over time and melts; wet surfaces; fog/haze per depth
- [~] No text bubbles/emojis; sound words only (meow/purr) [polish agents]
- [ ] Plausibility audit of every element in every scene (incl. koi, bowls, train, cymatics, drive) [agents]
- [~] Layout-aware retrofit: koi/bowls/train/cabin done; cymatics/drive/visualizers in their agents
- [x] Train skins: Indian Sleeper, Shinkansen, Swiss Alpine, Orient Express (live crossfade) + Indian rail-joint rhythm; passers-by art parked in art-src/train/deferred-people
- [x] Airport scene (kit plate add-on) — measured departures, parked aircraft, occlusion, night lights; packed locally and WebKit verified.
- [ ] Realistic plate pipeline + Marine Drive, Taj Mahal, Hillside Valley — PAUSED for compute (low priority per user)
- [ ] Illustrative "SimCity" living city (traffic, day/night)
- [~] Codex art over procedural fakes: done in cabin/café/records/speakeasy/rooftop/ramen/train/bowls; rooftop + ramen day plates aligned and verified

## Web + marketing
- [x] Landing page: scroll story, picker above scene, demo songs + player, auto-tour, make-a-scene + community, new pricing/FAQ (local, not pushed)
- [ ] Landing page final pass with everything shipped (scenes, pricing, features)
- [x] Social media kit (marketing/): 3 clips × 3 aspects (hero, koi, music), IG carousel, PH gallery, X/Threads/IG/LinkedIn/PH/Reddit/HN drafts, press kit — agent stopped by user; remaining clips (calm, weather, pets, desktop mock, cymatics) re-renderable later

## Release
- [ ] Compress scene art — DEFERRED: palette PNG fails quality on painted plates; needs WebP/pngquant tooling (not installed)
- [ ] Rebuild + test in the real app (ask before relaunching the live wallpaper)
- [ ] 0.13: commit, notarized DMG, GitHub release, site push (go/no-go on the notch)


_2026-10-03 04:20 IST: monthly spend limit hit — 8 agents stopped mid-task; resumed 10:40 IST after reset (all files verified to parse)._

_2026-10-03 12:00: user asked to prioritise near-complete work to save compute — stopped Airport + plate scenes; scoped down visualizers, marketing, train._

_2026-10-03 ~12:45: user low on session limit — stopped after sprite walk. Next: in-app test + 0.13 release + site push; rooftop/ramen day plates generated (verify alignment)._
