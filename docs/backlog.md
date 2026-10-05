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
- [x] **Koi Pond small shoals — owner 2026-10-04**: 3–5 independent groups (24/44/60 fish by display), deforming silver-olive minnows and one optional gold-fry shoal in the existing underwater batch. Koi avoidance, swept-cursor scatter/regroup, restrained curiosity, pellet nibbling, night/rain/calm and widget avoidance implemented. WebKit day/night/rain, mirrored/avoid, ultrawide, small, calm and companion sequences inspected; 104 Node tests pass. Timing and JPEG evidence: `shots/koi-shoals/`; reproduction: `tools/koi-shoals/README.md`. Local commits only; installed app untouched.
- [x] **Scene touch-ups — owner 2026-10-04** (branch `scene-touchups`): (1) Butterfly Garden / shared kit: plants parted "a little too far" — meadow push now 0.45x amplitude, 0.7x radius, soft-capped, with a spring-back trail (slight overshoot, no popping); the v3 photo bed leans ~9 px away via the new `Kit.plate({part})`. (2) Beach: gulls rebuilt for the top-down camera from a procedural sprite sheet (flap cycle, glide/flare/fold, walk/stand/sleep), opaque, altitude shadows, groups of 1-3, standing birds that take off and land; crabs/shells rescaled. (3) Touch Grass: toy kites (diamond, delta, koi windsock) with fluttering sails, physical tails, sagging lines, gust climbs/dips, night LEDs, rain reel-in. Beach + Butterfly Garden packed as v3. Evidence `shots/touchups/`; log in `docs/scene-polish.md`.
- [ ] Follow-ups from the touch-ups: repack Sky & Kites (its meadow push changed with kit.js; not bumped); Touch Grass "Kites" panel setting now drives both toy kites and the black kites — confirm with the owner that this is what he meant (the scene's "kites" were black-kite raptors before).
- [x] **Train station calls — owner 2026-10-04**: four painted platforms, frame-animated waiting/walking/vendor/pigeon life, smooth brake/dwell/departure, safe-route scheduling and lazy art release on `train-stations`. Final file:// day/night/rain/snow/ultrawide matrix: 12 sequences, 108 snapshots, 24 inspected contact sheets, zero JS/image errors. All 103 tests pass. Performance measurements and limitations in `tools/train-stations/README.md`; evidence in `shots/train-stations/`. Local commits only.
- [ ] **Train boarding polish**: no explicit boarding/door-opening sequence yet; current platform cast waits/walks/serves/pecks and shares walker/vendor art across skins. Sound coupling was code-reviewed but muted QA did not audition it.
- [x] **Pet gaze correction — owner 2026-10-04**: replace all seven animals’ walk/run/jump motion sheets with travel-aligned heads; 315 frames cut, contact registration and JPEG comparisons in `shots/gaze-fix/`; seven old/new comparisons and 112 day/night WebKit snapshots inspected; 61 Node tests pass.
- [x] **FOLLOW art — owner addendum 2026-10-04**: front/back runs, side/front/back hunt and pounce, picked-me front sit/perk, drawn angle turns, missing loaf/stretch; dogs get play-bow/bounce equivalents. 524 sequence/cycle frames plus six idle endpoints installed; seven JPEG reviews inspected.
- [x] **FOLLOW interaction — owner addendum 2026-10-04**: multi-pick/release, projected cursor following, heading/geometry/spacing rules, intentional stalk/wiggle/pounce, wait/resume and pause reset; 75 Node tests pass; 488 additional inspected WebKit frames, including all eight mirrored ultrawide input checks. See `shots/follow/README.md`.
- [x] **Shared companions — owner 2026-10-04**: one `pets.js` and seven-member roster; migrate all eight scenes, cross-species avoidance/prop sorting, directional dog art, no-ghost poses, jump-scale continuity. All eight scenes use the shared runtime; 52 dog cuts installed. Day/night, takeoff, prop, crossing, toggle and ultrawide evidence: `shots/pets-shared/`; reproduction: `tools/pets-shared/`. Pandas retain lateral-only sheets.
- [ ] **Implement the generator spec** `tools/plate-scene/SPEC.md` — close the gap list at its end (design.json,
  geometry.json, cast sprite sheets with views, schema v2, measured gates + gates.json). Owner 2026-10-04: "the scene
  generator needs to keep all this properly documented — specced — so scenes can be generated very fast and perfect
  every time". Start after the quality run in ../livewall-quality lands (it edits tools/plate-scene too).
- [ ] **World geometry for actors (polish-brief §13)** — owner 2026-10-04: Santorini cats walk through the stairs;
  pets/people/vehicles must path around props, climb stairs, be occluded by depth, avoid each other. Do it in the shared
  pet engine + every scene's stage declaration (done in `scenes/pets.js` and all eight scenes); generator/template geometry remains pending.
- [x] **Shared pet engine + common roster** (owner picked 1a+2a, 2026-10-04): scenes/pets.js from the Santorini engine,
  5 cats + golden + corgi everywhere (pandas only in Touch Grass), dog 3/4 walk/jump art, migrate all 8 pet scenes.
  Implemented in the shared-companions entry above; no host changes or installed-app rebuild.
- [x] Santorini Cats directional jumps (Codex): fifty front/back frames across all five coats; shared ground-plane direction/mirroring, matching landing gait, side fallback, natural depth hops and planted-paw/body-tracking shadows. Visually verified 60 day/night/view/facing sequences plus 9 surface/toy/failure cases (1,104 frames); 48 tests pass. JPEG evidence in `shots/cats-jumps/` (36 MiB, raw capture PNGs deleted). Local commit only; installed app untouched.
- [x] Santorini Cats directional walks (Codex): all five coats have 8-frame front/rear cycles; velocity selects views with contact-gated hysteresis, distance planting and side fallback. Diagonal wandering enabled; 40 day/night motion sequences plus vertical/mirror/run checks visually inspected (`shots/cats-dirs/`); 43 tests pass. Directional runs use faster walk cycles.
- [x] Walk/run cycles + paw planting (17 cycles, planted paw ±1 px, tests) — cats/grass polish beyond that stopped by user (partial edits verified working)
- [x] Snowy Cabin realism + real fire (painted plates day/night/summer, flipbook fire, snow accumulation, record player, pets lit by room)
- [x] Corner Café (turntable / Pro jukebox, painted street + cars, day/overcast rooms) + Record Store (painted deck, window mask, dog bed) — records ~6 ms/frame (watch)
- [x] Speakeasy beat-sync player piano (no track UI); Rooftop boombox→projector display + chairs fixed; Ramen painted radio/noren/lanterns; indoor rain-splash bug fixed (ramen counter)
- [x] Speakeasy robot band (owner chose art-deco robot jazz trio, 2026-10-04, speakeasy-robots worktree): pianist/drummer/bassist cut-out rigs + guest singer on a stage lift, driven by music.js (beat-scheduled strokes, chord→keys, walking roots, section-aware drums, count-in/outro/idle, tap flourishes). Magnific 150 cr. Night/day sequences in `shots/speakeasy-robots/`; ~3.3–3.6 ms/frame playing. Follow-ups below.
- [x] Speakeasy guest saxophonist (owner-approved, 75 cr; scene total 225/800): phrases/breaths/solo on drops/fingers on keys, stage lift, per-track lineup (singer / sax / rarely both); drummer shins hidden, cuff seams capped.
- [ ] Speakeasy band follow-ups: (a) pianist's left hand is mostly hidden from behind — a 3/4 rear view or a mirror over the piano would show both hands; (b) verify in the real app with live Beat Sync (host chroma/sections) — only music.js's fake stream was used here; (c) the busiest stage (both guests, ~5% of songs) measures ~4 ms on a loaded machine — trim the jukebox/marquee per-frame gradients if it shows up in-app.
- [x] Bowls window light + layout; Train fast-forward (no black) + walkman; tunnel weather; painted trackside
- [x] Koi beat pulse + scale glimmer + moon reflection + snow on pads
- [x] Koi: 14 varieties dealt from a shuffled deck (no repeats); calm/music circling per-koi weights, directions, radii + straight glides (no synchronised banana ring)
- [x] Night Drive coast/forest/desert (registered, free default) — follow-up: Codex-painted parallax backdrops per biome; forest perf ~4.3 ms
- [x] Scene kit (kit.js, plate pipeline) + Butterfly Garden, Beach, Sky & Kites packed — follow-up refinement: garden flowers look pasted, beach crabs are blobs, kite clouds/kites flat
- [x] Visualizers: real harmony (chroma/chord/key/tempo/sections in BeatSync + music.js) + Faraday, Filings, Copper Rain, Harmonograph, Magnet Bloom, Komorebi — registered (Kinetic, Fluids, Skies) + skins. Follow-ups: Copper Rain ~7 ms / Magnet Bloom ~5 ms (verify in app); Harmonograph closed rosettes + Vortex Rings, Ripple Tank, Pendulum Wave completed and typechecked; deferred skins: Pilot Wave, Wooden Mirror, Light String, Suminagashi, Noctiluca, Aurora, Murmuration, Wind Dunes
- [x] Shared photoreal moon (scenes/moon.js) — adoption in every scene [all agents]
- [~] Weather smarts everywhere (brief §8 sent to all scene agents): rain only where sky is exposed (never indoors — e.g. splashes on a wooden floor), none in tunnels; snow accumulates on exposed ledges/roofs/ground over time and melts; wet surfaces; fog/haze per depth
- [~] No text bubbles/emojis; sound words only (meow/purr) [polish agents]
- [ ] Plausibility audit of every element in every scene (incl. koi, bowls, train, cymatics, drive) [agents]
- [~] Layout-aware retrofit: koi/bowls/train/cabin done; cymatics/drive/visualizers in their agents
- [x] Train skins: Indian Sleeper, Shinkansen, Swiss Alpine, Orient Express (live crossfade) + Indian rail-joint rhythm; rare passers-by integrated from deferred art with per-skin lighting, floor anchors and foreground occlusion
- [x] Airport scene (kit plate add-on) — measured departures, parked aircraft, occlusion, night lights; packed locally and WebKit verified.
- [x] Realistic plate pipeline + Marine Drive, Taj Mahal, Hillside Valley — six new generated masters, reproducible kit packaging, water/exposure masks, day/night + wide/mirrored/weather screenshots inspected.
- [ ] Illustrative "SimCity" living city (traffic, day/night)
- [~] Codex art over procedural fakes: done in cabin/café/records/speakeasy/rooftop/ramen/train/bowls; rooftop + ramen day plates aligned and verified

- [x] P2 Train passers-by: all four skins, rare/calm gait, foreground masks, layout avoidance; screenshots inspected.

## Web + marketing
- [x] Landing page: scroll story, picker above scene, demo songs + player, auto-tour, make-a-scene + community, new pricing/FAQ (local, not pushed)
- [ ] Landing page final pass with everything shipped (scenes, pricing, features)
- [x] Social media kit (marketing/): 3 clips × 3 aspects (hero, koi, music), IG carousel, PH gallery, X/Threads/IG/LinkedIn/PH/Reddit/HN drafts, press kit — agent stopped by user; remaining clips (calm, weather, pets, desktop mock, cymatics) re-renderable later

## Release
- [x] Compress scene art — release 0.13.5 worktree: 178.81 → 67.29 MB; 1,196 WebP conversions, exact alpha/dimensions, PSNR ≥40 dB; 18 pixel-sensitive PNGs retained. 96 tests pass; full day/night, native decode, follow and Play checks pass. Local app build 72.40 MB. See `docs/webp-0.13.5.md`.
- [ ] Rebuild + test in the real app (ask before relaunching the live wallpaper)
- [ ] 0.13: commit, notarized DMG, GitHub release, site push (go/no-go on the notch)


_2026-10-03 04:20 IST: monthly spend limit hit — 8 agents stopped mid-task; resumed 10:40 IST after reset (all files verified to parse)._

_2026-10-03 12:00: user asked to prioritise near-complete work to save compute — stopped Airport + plate scenes; scoped down visualizers, marketing, train._

_2026-10-03 ~12:45: user low on session limit — stopped after sprite walk. Next: in-app test + 0.13 release + site push; rooftop/ramen day plates generated (verify alignment)._

## Play mode v1 — isolated play-mode worktree (2026-10-04)
- [x] Step 1: sandboxed card SDK, shared deterministic rules, shell, authoring contract, template/scaffolder and static gates. Final headless gates follow the cards in step 6.
- [x] Step 2: per-display native presentation/menus, paused-state restore, conservative fullscreen guard, shared pet occluder, restricted RSS/Atom/link bridge and 15-minute disk cache. Swift typecheck passes (existing duplicate bowls warning); all 60 baseline tests pass.
- [x] Step 3: Letter Garden (2,116 curated answers), Little Crossings (365 unique offline 5×5 grids, 356 original-clued common entries), news UI. Official candidate URL/terms checks recorded in docs/play-feed-review.md; no commercially permitted source verified, so production allow-list is empty with an honest empty state.
- [x] Step 4: AdSource/HouseAdSource adapter, fixed contextual first-party promotions, Sponsored rows at news bottom and puzzle completion only, no Pro slot.
- [x] Step 5: memory-only anonymous daily counts, default-on off switch in both settings surfaces, empty endpoint, aggregate-only Cloudflare/D1 worker and privacy note. Worker not deployed.
- [x] Step 6: 76 tests pass; isolated app build and resource-only run pass; native off-screen WebKit security/persistence checks pass; 72-capture cats/koi/train light/dark matrix plus final crossword/Pro, file:// authoring gates, mirrored/ultrawide/small/paused and real interaction/fault-retry checks. JPEGs in shots/play; details and owner checklist in docs/play-verification.md.
- [ ] Owner follow-up: obtain commercial feed permission; deploy/configure aggregate analytics only when ready; select any future contextual ad network; test visible native Space/display/focus/VoiceOver behavior. Strict <2 ms total-frame latency remains unproven (0–1 ms card handlers; one 5 ms cold WebKit dispatch sample).
## Shared add-on audit fixes — 2026-10-04 (audit-fixes worktree)
- [~] Night sky: shared moon composition, real phase in pinned previews, graded exposure and preserved independent stars implemented. Seven horizon add-ons pass visual night review and G1; full ten-scene acceptance pending missing art in beach/garden/sky-kites.
- [~] Rain scanline banding: replaced the shared 20:1 stretched wet-sheen noise with broad warped patches; hillside rain sequences inspected without stripes. Garden verification awaits its missing plate.
- [~] Rain lighting implemented in Kit: weather overrides clear-cloud settings, suppresses direct sun/shadows, softens contrast, and restores smoothly. Airport transition and three plate-scene day/rain sequences inspected; sky-kites full-scene verification blocked by missing fabric art.
- [~] Clouds: shared scene-id seed, bounded perspective, broader formations and horizon haze implemented; template/generator wired and sky-kites migrated off repeated still clouds. Seven full before/after day/night/rain + mirrored/ultrawide sequences inspected. Three-scene acceptance remains blocked by missing art.

- [ ] Audit acceptance: recover the missing beach/garden/sky-kites assets with owner authorization, capture their full before/after sequences, and finish ten-scene signoff. Seven available scenes pass G1 (.187–.245 night luma), zero render errors; 64 Node tests pass. Evidence: `shots/audit-fix/`.

## Cats GPT replacement — owner 2026-10-04
- [x] Implement and deliver painted cat motion replacement: five coats, eight floor directions, walk/run/jump, front idle transitions, preserved follow/scene behavior; five 45-second WebKit review videos, contact sheets, 106 passing tests, 24 scene integrations and before/after performance. See docs/cats-gpt.md and shots/cats-gpt/README.md.
- [x] Owner accepted all motion except diagonal walks: “Diagonal walk is glitchy, rest is okay.” Preserve approved non-diagonal art, runs, jumps and transitions.
- [x] Diagonal walk correction: replace near/far whole-cycle sheets for all five coats, remove sheet-row root drift, match projected paw paths and measured stride; five 20-second 30 fps close-ups plus fresh full orange reel, full-cycle frame review and 107 passing tests. See shots/cats-gpt/diagonal-review.md.
- [x] Diagonal v3 whole-limb redraw after owner rejected stiff legs: explicit shoulder/elbow and hip/knee/hock poses, five 15-second side-by-side comparisons with approved side, cycle strips and consecutive-frame review; 107 tests pass. Only ten diagonal walk atlases/metadata changed. See shots/cats-gpt/diagonal-v3-review.md.
- [ ] Owner acceptance of diagonal v3 (G4-CAT); no installation authorized. Contact slip remains: strict no-sliding gate is not fully passed.

## Walk v5 integration — owner 2026-10-05
- [x] Replace every rejected walk using the supplied six-frame Magnific/Muybridge sheets, all five coats/views; clean cutouts, torso registration, fur grading, stable calico front markings and six-frame runtime. Preserve 70 approved non-walk atlases/metadata byte-for-byte; no art generation.
- [x] Capture five 20-second close-ups and five normal-zoom file-origin Santorini reels, inspect decoded poses and consecutive cycles, run 108 passing tests, record isolated performance and commit locally. Watch list: `shots/cats-gpt/README.md`; method: `tools/cats-qa/walk-v5-data/README.md`.
- [ ] Strict no-sliding visual acceptance: supplied six-pose stance travel remains uneven, with repeated foreleg positions and ambiguous rear support. Selected-span calibration is documented; no claim of perfect foot locking or new owner approval. Approved run/rest/jump art remains intact.
