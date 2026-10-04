# Scene polish — 2 October 2026

The train follows the supplied Indian Railways sleeper reference: blue stacked berths, steel ladders, luggage, overhead fan and warm metal walls. Window scenery, birds and chai steam remain live layers. The train compartment has no pets; occasional small flocks fly outside, clipped to the window glass. Pet loading, interaction, audio and movement were removed from this scene. The tabletop player and headphones are removed; train room offsets are applied once. Wide desktops retain the full stage height with quiet side panels.

The café, record shop, cabin, rooftop cinema, speakeasy and ramen alley use painted room backgrounds. Live player surfaces, windows, animal anchors and foreground depth remain code-driven. Missing prop bases and duplicate rooftop bulbs were corrected. The bowl window has softly layered curved mountains. Koi artwork remains as before.

Animal transitions show one opaque silhouette with a short tuck and settle at its foot anchor, replacing ghosted dissolves. These are pose swaps, not newly drawn anatomical in-between frames. Panda birds have dedicated four-frame transparent sparrow and kite atlases, uploaded once to WebGL and depth sorted with the meadow.

## Generated assets and prompt briefs

All assets were made with the built-in image generation tool and saved under `scenes/art/`. No API or CLI image generation was used. The following records the production prompt set; the train used the user's reference image, and the other room backgrounds used scene screenshots to preserve layout.

| Saved path | Prompt brief |
| --- | --- |
| `scenes/art/train/bg-night.png` | Indian sleeper compartment from the supplied reference; empty stacked blue vinyl berths, steel ladders, luggage rack and caged fan; warm lamps against cool metal. Wide view with a navy glass opening and empty fold-out table reserved for live layers. No people or pets. |
| `scenes/art/train/countryside-night.png` | Wide painted rural Indian panorama, moonlit indigo sky, paddy fields, distant rounded hills, palms and sparse village lights; subdued small details, no window, train, people or text. |
| `scenes/art/cafe/bg-night.png` | Preserve café screenshot geometry; cozy textured gouache room, warm wood, green walls, soft lamps and cushions. Clear live player surfaces and navy window glass; omit animals and animated props. |
| `scenes/art/records/bg-night.png` | Preserve record-shop layout; painterly wood cabinetry, warm material variation and quiet evening atmosphere. Keep player, sleeve and window placement; omit pets and live music surfaces. |
| `scenes/art/cabin/room-night.png` | Preserve cabin composition; hand-painted timber, stone fireplace and warm firelit texture. Reserve window, artwork, record player and animal areas for live layers. |
| `scenes/art/rooftop/bg-night.png` | Preserve wide rooftop cinema composition; painterly brick, city, decking, plants and gentle string lights; quiet right side, blank projection screen, no animals. |
| `scenes/art/speakeasy/bg-night.png` | Preserve wide club composition; rich painted velvet, wood, brass and amber lighting. Empty stage and booths, blank live signage, no people or animals. |
| `scenes/art/ramen/bg-night.png` | Preserve alley composition; painted lantern glow, wet paving, warm stall and tactile walls. Reserve vending screen, radio display and animal ledges for animation. |
| `scenes/art/birds/kite.png` | Transparent horizontal four-frame black kite atlas; top view, head right, forked tail left, natural feathered wings with four flight poses, matching painterly animal artwork. |
| `scenes/art/birds/sparrow.png` | Transparent horizontal four-frame sparrow atlas; facing right, perched and three wing positions; consistent size, natural proportions and restrained painted detail. |

## Verification

- Parsed all 23 inline scene scripts and shared `lw.js`; `git diff --check` passed.
- Rendered all eleven scenes at 1600×1000, 2560×1080 and 1280×800; no reported JavaScript errors. Optional absent art slots still fall back as designed.
- Exercised playback, pause, calm, water reminders and changing hour. Existing ten-second identity tests returned zero identity errors; cats and pandas returned zero teleports.
- Inspected rendered room layering and fixed window masking, absent prop bodies, overlapping player text and duplicate lights.
- Confirmed the train in a live browser as well as virtual time. Virtual captures must allow deferred asset/rebuild callbacks to settle before advancing the clock; an immediate screenshot after canvas resize can otherwise be blank.
- Verification used browser previews. The running wallpaper app was not reloaded or replaced.

Preview: http://127.0.0.1:5210/train.html?hour=21&muted=1

## Exact final train prompts

### Compartment

Use case: illustration-story. Asset: widescreen animated wallpaper background, 1600x1000 composition. Reference image is the user's desired Indian sleeper train mood and architecture, not an edit target. Create a beautiful detailed hand-painted cinematic Indian Railways sleeper compartment, viewed down a narrow aisle toward the far window, with NO PEOPLE and NO ANIMALS. Strong perspective, authentic broad blue vinyl lower berths on both sides, stacked upper berths, slender steel ladders at sides, overhead wire luggage rack with brown suitcases and folded blankets, a circular caged ceiling fan, cream and muted teal painted metal walls, tiny warm reading lamps. Night, cozy amber highlights contrasting cool indigo. The scene must feel like the reference and a real compact Indian sleeper rather than luxury European booth. Production layout in normalized coordinates: far rounded rectangular window opening x=.25 to .61, y=.24 to .55; fill its ENTIRE glass with flat uniform dark navy #101d2e, no bars, scenery, moon or reflections in that opening because the app will render a live landscape there. Narrow fold-out table directly below window, tabletop x=.29 to .56, y=.59 to .65, empty clear surface for live chai and a music player. Left lower berth extends from x=.04,y=.59 in distance to x=.33,y=.88 foreground, visible seat top; right lower berth extends x=.65,y=.59 to x=.91,y=.88. Mattress seams subtly rounded, convincing broad padded cushions with restrained fabric highlights, no button tufting. Steel handrails follow perspective. Upper berths run along both sides at y=.23 to .38. Center aisle floor at bottom. Rightmost 20% subdued and quiet, no prominent lettering. Warm wall lamps adjacent window. Small plaque above window may read 'S3'. No other text. Painterly rich tactile materials and soft shading, coherent perspective, polished movie background quality, avoid huge thick edges or chunky geometric shapes. No cup, no radio, no headphones, no player, no pets; these are separately animated.

### Countryside

Use case: illustration-story. Asset: very wide panoramic background for moving view outside an Indian sleeper train window. A quiet rural Indian landscape at blue hour under a moonlit indigo sky, lush paddy fields, distant hazy rounded hills, small clusters of palm trees, sparse distant village lights. Beautiful soft hand-painted cinematic illustration, gentle natural colors, atmospheric depth, fine painterly texture. Sky top 55%, farmland lower45%. Full moon near upper left. Landscape panoramic 3:1 aspect. Ground should be mostly dark green and teal fields with glints of moonlight. NO window, NO frame, NO train, NO interiors, NO people, NO text, NO large foreground objects or poles. All details subdued and small scale so countryside feels far away. Left and right edges similarly low hills and open fields so the scene can drift slowly.

## Train birds follow-up

Removed train pet code, sprite requests, click targets, pet audio and pet-related reminder actions. Reused the existing sparrow flight atlas for occasional flocks of three outside the glass. A 45-second simulation passed with finite bird positions and at most three birds; playback, calm, stretch, water and weather changes produced no JavaScript errors. No cat or dog sprite requests were made.

## Ambient train follow-up

Removed the music player, headphones, stand, reflected screen glow, floating music notes, album lighting and hidden media click targets. The window now only advances the landscape. Train speed remains steady independently of playback. Chai steam, birds, weather, calm breathing and temporary wellbeing reminders remain active. Browser animation checks passed without JavaScript errors.

## Moving window view

Replaced the mostly static night panorama with three cached, feathered landscape layers: hills, tree line and foreground fields. They scroll continuously at different speeds tied to train distance; mirrored joins avoid abrupt wraps. The moon and sky remain stationary, and nearby poles pass faster than the fields. Calm mode and tunnel visibility remain respected. Refreshed the existing in-app browser preview and visually confirmed different terrain in successive captures with a steady moon; no preview console errors.


## Rooftop spatial correction — 2026-10-02 (local)

Replaced the baked, malformed chairs with two rear three-quarter chair sprites facing the screen. The background was edited only to remove the original chairs and small projector crate. Chair alpha bounds are measured once at load so transparent atlas margins cannot lift the feet. Separate foreground rendering preserves pet occlusion; pets use the open floor and ledges instead of appearing pasted onto opaque chair backs.

Moved the projector onto a four-legged AV stand behind the seating, clear of the planter. The projector body and beam now share one lens transform aimed at the screen center. Added a supported tilt bracket and power cable. Replaced the fake album-art radio display and LED meter with a cassette, printed tuning scale, needle and mechanical knobs. Cassette rotation now uses elapsed time. Removed procedural city-window overlays that did not match the painted buildings.

Generated assets: `art/rooftop/bg-night.png` from exec-433d116f-d362-4cce-912c-23f0485ea22e; `art/rooftop/chairs.png` from exec-010cb75a-d614-4472-a495-4eb41c52d6e7. Originals retained in Codex generated_images.

Background prompt: preserve camera, wall, blank projection screen, skyline, lamps, plants, left crate, blanket and cushions; remove only the two chairs and the small projector crate; seamlessly restore wooden floorboards.

Chair prompt: transparent two-cell atlas; physically plausible wooden Adirondack chairs facing upper-left, viewed from behind/right; supported armrests, usable seats, stable connected legs; honey oak and muted teal with oatmeal cushions; warm upper-left lighting, navy ambient shadows, painterly style; no environment, pets or lettering.

Verification: JavaScript syntax and diff checks; browser preview at 16:9 and ultrawide; radio play transition and projector beam inspected in motion. Running wallpaper app left untouched; changes remain local.


## Daylight train and pet motion — 2026-10-02 (local)

Added matching daylight carriage and countryside art, blended by environment daylight. Lamps dim in daylight, dusk receives a warm tint, and carriage sway/track jolts are more visible. Moving landscape bands retain separate speeds with faster nearby poles/fences and a stationary sky. Fixed the landscape cache dimensions after deferred art loading; tunnel shading now covers the finished view. The normal browser preview uses live time, without the `virtual=1` test freeze.

Generated assets: `art/train/bg-day.png` from exec-36d62c25-7c59-4241-8abd-ed2bdc972f2b; `art/train/countryside-day.png` from exec-b89c63d4-2369-43c5-a7ff-6e4c99bd6e56. Original generated files remain in Codex generated_images.

Interior edit prompt: preserve every camera/geometry detail of the existing Indian sleeper carriage, including blue berths, rails, fan, luggage, table and empty window. Convert to late-morning natural daylight with neutral cream and blue materials, lamps off, and a flat pale-blue window opening. No people, pets or music player.

Landscape edit prompt: preserve the exact panoramic composition, terrain, horizon, hills, trees, fields and irrigation. Convert to clear late morning, removing the moon without adding a sun disk; blue sky, soft clouds, lush green and gold fields. No new objects.

Added `pet-motion.js` to seven pet scenes and both packaging scripts. Cat/dog walking height now uses a common reference with scene depth retained; individual resting poses have head/body scale corrections. Walking frames maintain height despite different source dimensions. Pose changes blend premultiplied layers around the same moving ground anchor instead of abruptly cutting at the midpoint. Gait changes no longer restart an unfinished stand-up blend. Pets wait to rise before translating. Cats retain their supporting ledge on resize instead of being dropped to the floor. Panda poses similarly blend in one GPU pass with corrected adult/pose scale and cub proportions retained.

Added regression tests for gait interruption, conserved blend opacity and walking-frame height. Browser checks exercise movement, identities, playback, calm and both train lighting states. A playback check also exposed the record-shop renderer accessing a procedural LED absent from painted-art mode; the LED overlay now checks its anchor before drawing.

All work remains local; no running wallpaper app rebuild or reload.

Final verification: all nine affected scenes passed browser checks with zero JavaScript/animation errors, including playback and calm transitions. Three shared-animation regression tests passed. Resize preserved both the bench and parapet cats. Train checks confirmed daylight at noon, darkness at 21:00, advancing landscape distance and nonzero carriage movement. Packaging scripts passed syntax checks; no build was run.


## Time-of-day selector — 2026-10-02 (local)

Standalone browser previews now have a compact View selector: Auto (local clock), Sunrise, Day, Sunset, Evening and Night. Browser choices persist across scenes; explicit URL view/hour values take precedence. Existing `hour=0` links are correctly shown as fixed midnight. Auto removes that pin, resumes minute-by-minute local time, and handles midnight rollover. Embedded scenes retain their parent controls. Selector input is isolated from scene pet/music interactions.

The native menu now has the same Time of Day choices, persisted globally and applied to all wallpaper windows. Manual selection uses a shorter lighting fade in scenes with slow environmental smoothing; Auto retains gradual changes. Native sources were type-checked without building or replacing the running app; the new native menu needs a future build.

Verification: browser checks passed all six choices, refresh/cross-scene persistence, explicit URL priority, fixed-view stability during environment updates, Auto clock rollover and day/night rendering for all eleven scenes. No JavaScript errors beyond expected missing optional art requests. Shared pet regression tests remain green.


## Location-based solar and lunar timing — 2026-10-02 (local)

Vendored SunCalc v1.9.0 in `scenes/astronomy.js`, with its BSD license retained in the packaged source (upstream: https://github.com/mourner/suncalc/tree/v1.9.0). Calculations run locally using the date and detected coordinates; no astronomy network request or API key is needed. Auto maps real dawn, sunrise, solar noon, sunset and twilight events onto the existing scene lighting curves. Polar-day/night cases use solar altitude when events do not occur. Clock captions retain civil time separately from the lighting clock.

The host now passes its existing weather coordinates to every scene immediately after location resolves, independently of the weather fetch/Pro entitlement. Time-zone city coordinates remain marked approximate; precise location remains opt-in. Manual view selections bypass astronomy. Standalone browser previews add an optional Use location button in Auto, with explicit user activation, loading/error states and no persisted coordinates. No location prompt is triggered automatically.

Moon visibility follows calculated altitude/horizon crossings. Grass and bowls use calculated moon altitude/azimuth for their illustrative arcs. Train now uses a moonless landscape plus a separate moon, with calculated phase in Auto. Its visual placement remains a scene composition, not a compass-accurate sky map.

Moonless train asset: `art/train/countryside-night-sky.png`, generated from exec-b4ce1c8a-f808-43d1-a515-ddee1e45ffbe. Prompt: remove only the upper-left moon disk and local glow; fill seamlessly with dark blue sky and faint clouds; preserve exact panorama, horizon, terrain, fields, reflections, hills, palms, buildings, stars, clouds, palette and night lighting. Original source image preserved.

Regression checks cover summer/winter daylight, sunrise/sunset lighting anchors, moonrise/moonset, polar conditions and invalid/zero coordinates. Native sources type-check successfully. The running app has not been rebuilt or reloaded; these changes and sprite fixes are still local source/browser changes.


## Drawn in-between frames in every pet scene — 2026-10-02 (local)

Codex generated four 5-frame transition strips (stand-sit, sit-sleep, turn, jump) for all ten sprite sets: cats orange, black, grey, calico, siamese; dogs golden, corgi; pandas mei, bao, cub. Each strip was checked by eye against its set (character, 5 frames, scale, endpoint poses); none needed regenerating. All 40 strips were cut into `scenes/art/sprites/<kind>/<name>/t/` (200 frames).

Shared code in `pet-motion.js`: `LW.PET_SEQ_HAS` (which sets have sheets), `LW.petSeqLoad` / `LW.petSeqPrep` (load, then size and anchor each frame between the poses it joins; mirrored turn copies made once at load), `LW.petSeqStep` (per-pet player: family change → `LW.petPath`, turning on its feet → turn sheet, reversing mid-turn turns back), `LW.petSeqBusy` (travel waits while getting up), `LW.petJumpFrame` and `LW.petSwap` (cut into a sheet, 0.12 s fade out of one). `LW.petPoseScale` honours a frame's own size and `LW.poseState` cuts between drawn frames.

Wired into cats (all five coats, via the registry; the jump is now sized by body length, which makes the orange jump ~25% larger and matching its walk), cafe, cabin, records, speakeasy, rooftop, ramen and grass. Dogs map `lie` / corgi `sleep` onto the sit-sleep ending; pandas map sit-eat / sit-leaf / tumble and back-sleep / roll; a rolling panda ball keeps its crossfade. Grass bakes the frames into each panda's own atlas once (4 columns; ~1.4–1.7 k px square) and mirrors turn frames by swapping UVs, so nothing is uploaded per frame; the only extra cost is a larger re-tint on light changes (~10 ms frame when all three re-tint at once on a snap).

Verification: 14 `node --test tests/` cases pass (6 new for layout, playback, swaps and pose-state cuts). Each scene was stepped in a virtual-clock browser tab for 100–150 s with forced walks: stand-sit, sit-sleep, turn (both directions) and jump frames observed in every scene that has those motions, all positions finite, scene self-tests clean (no identity errors or teleports), no JavaScript errors; only pre-existing optional-art 404s. Stills in `shots/` (cafe-*, cabin-*, speak-*, grass-*, cats-*) checked for scale and foot anchoring. The running app was not rebuilt or reloaded.


## Drawn walk / run cycles driven by distance — 2026-10-03 (local)

Problem: every pet "walked" by swapping two static poses (walk1/walk2) on a clock (cats: `c.wf` advanced by time, a swap every ~0.2 s while the body glided at 80 px/s), so it flickered and the paws skated.

Art: Codex drew one-stride cycle strips for every set (`art-src/cycles/run-cycles.sh`, prompt inline: exact frame count, equal cells, identical scale, shared baseline, in-place body, #e6e6e6 background): an 8-frame `walk` for all ten sets and a 6-frame `run` (gallop/trot) for the five cats and two dogs. All 17 shipped. Two calico strips were redrawn once because the coat patches wandered between frames (the first tries are in `art-src/cycles/rejected/`). Vision's `cutout.swift` punched holes through dark fur patches on these flat-grey sheets, so the cycles use a chroma-key cutter instead (`art-src/cycles/cut.py`: background = what the border reaches through near-grey; enclosed leg-gap pockets removed; edges un-mixed from the grey, so no pale halo). `install.sh` cuts and installs to `scenes/art/sprites/<kind>/<name>/cycle/{walk-1..8,run-1..6}.png`; `qa.py`, `sheet.py` and `stride.py` are the QA tools.

Shared code (`pet-motion.js`): `LW.PET_CYCLE_HAS`, `LW.PET_CYCLE_N`, `LW.PET_STRIDE`, `LW.petCycleLoad` / `LW.petCyclePrep` (one size for the whole loop: the median frame is as tall as walk1; anchor pinned to the same torso point as walk1's anchor, from each frame's torso-band centroid smoothed around the loop, so the body doesn't jitter), `LW.petCycleLayout` (that maths, tested), `LW.petGaitFrame` (phase = distance ÷ stride; a stopped pet steps forward onto the nearest contact frame instead of freezing; walk ↔ run maps half a walk cycle onto a whole run cycle so the legs carry on) and `LW.petGait` (scene helper: stride from the table × walk1 height; a run request without a run sheet strides out the walk; returns `'walk1'` once settled on frame 1, `null` when a set has no cycle). Cycle frames count as gait frames for `LW.poseState` / `LW.petSwap` (hard cuts), and as the walk1 family for the transition sheets, so turn / stand-sit / jump still start from the walking pose.

Scenes: cats (all coats; distance from actual displacement; `walk` → walk cycle, `trot` → walk cycle strided out, `run` → run cycle; 'stand' settles), cafe, cabin, ramen, records, speakeasy, rooftop (anchors now honour `petFa`; procedural bob dropped while a drawn frame shows; a per-scene walk1 override in speakeasy/rooftop skips the cycle) and grass (the eight walk frames are baked into each panda's own atlas once at load, now 6 columns; chase uses the walk strided out). Tinting, de-fringing, depth scale, bench crouch, eyelids/tail wag on the static poses are unchanged; cycle frames carry walk1's head mark and no eyelids/tail wag.

Strides (walking heights per full cycle): measured from the drawn stance sweep (`stride.py`): walk 0.78–0.9 (cub 0.7); runs set to ~1.6. At scene speeds that is ~1 cycle/s for a walking cat (≈8 frames/s), ~2.5 cycles/s running.

Known limit: the generated strips are not true treadmill cycles — the planted paws barely slide back relative to the body between frames (`fit.py` finds the best-fit stride at its lower bound for most strips), so paws still glide slightly with the body while a frame is shown; one retry with explicit treadmill mechanics in the prompt (orange, golden, mei) did not change that and was not kept. The legs now cycle in step with the distance covered instead of flickering on a timer.

Verification: `node --test tests/` 26/26 (6 new: phase advances with distance not time, settle on contact, walk↔run continuity, layout, cuts/sizing, `petGait`). Browser (virtual clock, own tab, 1600×1000): cats self-test 90 s clean, cafe/cabin/ramen/records/speakeasy/rooftop/grass self-tests 60 s clean (no identity errors, teleports or JS errors; only the old optional-art 404s). Frame-per-distance logs in every scene (e.g. cats black: walk-7…walk-6 every ~10 px at k≈1.4; panda Mei: one cycle per ~120 px). Film strips in `shots/gait/` (one shot per frame change, crop following the pet): `before-after-cats-black.png` (top: old walk1/walk2 swap, bottom: drawn cycle), `strip-cats-orange-{walk,run}`, `strip-cafe-dog-walk`, `strip-cabin-dog-walk`, `strip-records-dog-walk`, `strip-speakeasy-dog-walk`, `strip-grass-mei-walk`, and `joins-walk1-cycle-standsit.png` (walk1 ≈ cycle frame 1 ≈ stand-sit-1 for all ten sets). The running app was not rebuilt or reloaded.


## Singing Bowls: window light, layout, room — 2026-10-03 (local)

Layout: the bowl group is sized from its real footprint (bowl radii at both ends) into the free band of `LW.layout.clear` (default 4.5–68.5% of the width), so bowls, candles, mallet, glass and props never reach the widget side; `side:'left'` mirrors the room (window on the right, light falling left) and re-lays out on the `layout` event. Checked at 1600×1000, 2560×1440, 3440×1440.

Window light is now geometric (`bakeLight`): the sun/moon direction (azimuth from the window's normal + elevation, from the existing sunX/sunE/moonX/moonE and astronomy values) gives a per-unit-drop offset (tx, tz); the floor patch is the window opening — arch, panes and mullion bars — under that one affine map (arch end lands furthest into the room; noon → short patch by the wall, dusk → long warm streak to the bottom edge). Penumbra grows with fall distance, softer for the moon and overcast. Bowls, candles and props standing in it throw shadows along the light and catch it on their rims and inner front walls; the beam is 40 slices of the same map at fractions of the drop (dust and incense smoke brighten inside it), strong in fog, faint when cloudy, gone with the source down. Moonlight scales with the real illuminated fraction. The sun/moon disc in the glass comes from the same direction and is nudged into a pane (never behind a mullion); the moon is the shared photoreal `LW.drawMoon`. Weather stays outside: no indoor fog fill; fog banks drift only through the view; rain beads only on the glass; snow builds up in the pane corners while it snows and melts after. Reminder text removed (the glass is the reminder).

Generated assets (Codex `exec`, image tool; prompts below; originals in `~/.codex/generated_images`):
- `art/bowls/window-view-day.png`, `window-view-night.png` (1152×468, sky keyed out of a flat magenta). Prompt: two identical-composition matte paintings of the view through a Himalayan meditation-room window; sky pure flat #ff00ff for keying; land only in the lower 45%: far snow-capped peaks (tallest a little left of centre), forested middle ridges, dark near hillside with a few conifers and a tiny string of prayer flags; crisp silhouette; day = late-morning light, night = same composition re-lit by moonlight, low contrast. No text/people.
- `art/bowls/incense.png`, `mala.png`, `plant.png`, `shawl.png` (reference: a scene screenshot for camera). Prompt: sprite sheet on #e6e6e6, four props seen ~25° from above in the bowls' painterly style, neutral upper-left light: brass incense dish with one upright stick (no smoke — animated), wooden mala coiled flat with maroon tassel, terracotta pot with trailing pothos, folded maroon-and-saffron woollen shawl. No text/people.
- `art/bowls/thangka.png` (380×562). Prompt: an old faded Tibetan thangka hanging flat — central mandala of lotus rings in muted ochre/red/indigo/gold, NO figures or text, faded blue/maroon brocade border, top rod with hanging cord, bottom roller with brass caps; flat #e6e6e6 background.

Room props are re-lit at bake by the room light at their spot (graded ambient + candle pools); the thangka is lit from below by the candles and falls into shadow toward the ceiling.

Shots: before `shots/bowls-before-{night,day,dusk}.png`; after `shots/bowls-after-{night,day,dusk,fog,water,t9-night}.png`, `bowls-f-left-{day,dusk}.png` (mirrored), `bowls-d-uw-day.png` (3440×1440), `bowls-e-moon.png`, `bowls-e-snow.png`.
Perf (1440×900, DPR 2, Chrome): ~1.9 ms/frame JS steady; light rebake ~20–50 ms (`bakeLight`) / ~70–85 ms full rebake, only when the light key changes.


## Indian sleeper train: surge, walkman, painted trackside — 2026-10-03 (local)

Window click no longer dips to black. It is a fast-forward: speed ramps ×14 over 0.9 s, holds 0.3 s, eases back over 1.7 s; the painted bands smear with a running-average motion blur proportional to each layer's speed; trackside sprites use cached horizontal box-blurred copies (pre-warmed one per frame while cruising, so the first surge doesn't hitch); poles whip past; a band-passed whoosh swells and settles. The jump to the next stretch of line happens at the blur's peak; tunnels are suppressed during a surge and the landing point is clear of them.

Music (user request, replacing the earlier "no player" decision): a walkman with a cassette stands on the fold-out table beside the chai, foam headphones coiled to its left and the cassette's case behind. Music Mode playing → hub teeth turn (fast spin on "next"), a tiny warm LED, the J-card carries the title and artist in a biro hand (wrapped to two lines if long; cached per track); paused → reels still; no Music Mode → blank J-card, everything at rest. Headphone foam swells a hair on `beat`. Click the walkman = play/pause; its fast-forward key (top right) or right flank = next; browser dev mode plays three demo tracks. The procedural kulhad is replaced by a painted one (live chai surface + steam kept).

Painted trackside replaces the procedural single pole and fence pickets: concrete telegraph poles every 560 (wires sag between insulators), palms and neems in the middle distance, scrub and km-stones close by; night/dusk tints baked once per light change. Weather respects the window: no rain beads/streaks or snow inside tunnels; streaks angle with speed; snow builds up in the frame corners and whitens the fields as it settles, grey skies when overcast. The tunnel itself is a dark, speed-smeared bore with streaking service lamps and a soft portal edge (no hard grey bars). The moon is the shared photoreal `LW.drawMoon`. Water/stretch reminders carry no words (glass appears; berth lamps swell three times for a stretch). Wide screens slide the stage away from `LW.layout.side`.

Generated assets (Codex `exec`; originals in `~/.codex/generated_images`):
- `art/train/walkman.png`, `headphones.png`, `kulhad.png` (refs: `bg-night.png`, `bg-day.png`). Prompt: sprite sheet on #e6e6e6 matching the compartment's painterly style: an unbranded 1980s walkman standing upright, front on, camera ~10° above; champagne aluminium, charcoal panel, smoky window showing a cassette with a BLANK cream label and two white reel hubs; 4 piano keys on top with fast-forward at the right; tiny unlit red LED top-right; short cord top-left. Orange-foam 80s headphones lying loosely coiled. Terracotta kulhad of milky chai seen slightly from above. Neutral upper-left light, no text/logos.
- `art/train/cassette-case.png` (refs: the cut walkman, `bg-night.png`). Prompt: clear Norelco cassette case standing upright, front on, with a BLANK cream ruled J-card and a muted teal top stripe; no writing. (The tool ignored the flat background; the rectangular case was cropped with a rounded mask.)
- `art/train/pole.png`, `scrub.png`, `palm.png`, `kmstone.png`, `neem.png` (ref: `countryside-day.png`). Prompt: one row of near trackside objects on #e6e6e6 in the panorama's painterly late-morning style: tall concrete railway telegraph pole with steel cross-arm and 4 ceramic insulators, low lantana scrub clump, slender coconut palm, yellow/black km-marker stone without numbers, rounded neem tree. No people/vehicles/text.
Cut with a flat-background keyer (border-connected and large enclosed near-grey regions → transparent, edge colours un-mixed from the grey).

Shots: before `shots/train-before-{day,night,pole,win-day,win-night}.png`; after `shots/train-after-day-idle.png`, `train-after-walkman-{idle,playing}.png`, `train-surge-*.png` + `train-surge-contact.png` (0–2.4 s, never dark), `train-e-night-win.png` (moon), `train-e-rain.png`, `train-e-rain-tunnel.png`, `train-f-tunnel-in.png`, `train-g-snow2.png`, `train-after-uw-{night,left}.png` (3440×1440, side right/left).
Perf (1440×900, DPR 2, `__train.benchRaw`): JS ~1.3 ms/frame idle, ~2.5 ms playing, ~3.4 ms at surge peak (≈21 ms total incl. GPU during the 2.9 s surge only); art-mode bake ~3 ms.


## Snowy Cabin rework — 2026-10-03 (local)

User: "snowy cabin looks fake tbh, that fire too". The procedural room, chair, window view and triangle fire are gone;
the scene is now painted plates + layered live effects (`scenes/cabin.html`, art in `scenes/art/cabin/`).

- **Room**: `room-night.jpg` / `room-day.jpg` (1586×992, identical geometry; day = Codex edit of night). Timber walls,
  fieldstone chimney with an EMPTY firebox, wingback leather armchair, bookshelf, walnut record cabinet with a clear top,
  6-pane window whose glass is a flat #0B1A2C placeholder (cut out by rectangle at bake), braided rug. Day/night are blended
  by daylight; summer/dusk get soft-light grades at bake. Ultrawide: `room-{night,day}-wide.jpg` (Codex outpaint, 2.4:1)
  supplies side panels (coat rack + snowshoes left, bench + lantern right), seamed with a feathered mirror of the stage edge.
- **Window**: `outside-winter-{night,day}.jpg`, `outside-summer-{day,night}.jpg` (1254², summer/day are edits of the winter
  night). Graded per bake for dusk, overcast desaturation and depth haze (snow/fog/blizzard); cursor parallax; real-phase
  moon via `LW.drawMoon`. Snow in three depths (far specks, mid flakes, a few big out-of-focus flakes near the glass) with one
  shared gusting wind; snow builds up on the outside of the pane bottoms while it snows (persists, melts slowly in sun,
  fast in summer); frost grain in the corners; sleet/rain streaks + drops on the glass; fireflies on summer nights.
- **Fire**: `fire.jpg` — 8-frame painted flame flipbook on black (Codex sheet, dark-red halos removed by a green-channel
  threshold, frames aligned on a common base), played as two out-of-phase layers (one mirrored) + small front tongues,
  additive, crossfaded at ~11 fps in a shuffled order, height/brightness driven by multi-octave noise flicker, beat boosts
  and the calm breath. `logs.png` (painted grate with glowing coals; Codex returned it with alpha), its coals pulse; embers
  with motion stretch; `smoke.jpg` wisps (screen) curl up into the flue. Room light: a bake of the lit room × warm falloff is
  added with the flicker (stones, hearth, rug, chair, floor brighten/ebb with the flames) + warm pools on hearth and rug.
  Summer afternoons die back to coals (cooled coal overlay); summer nights get a small fire.
- **Music (①)**: `turntable.png` (Codex, no tonearm) on the cabinet; the album art is the spinning label (clockwise even
  when mirrored), procedural tonearm swings on/off the record, groove sheen, power pilot. Sleeve leans on the logs beside
  it; a small pinned card shows title/artist (hidden until something has played). The framed print above the mantel is a
  DISPLAY mirroring the artwork (idle: a sepia print of the window view). Click player/sleeve = play/pause, window = next.
- **Pets**: Maple (dog: rug, by the record cabinet + bowl) and Ember (cat: armchair seat and back, rug edge, floor before the
  hearth). Rescaled to the furniture (~3.6 px/cm at the chair; floor scale from depth). Lit by sampling the plate's own
  light under them (blurred, once per bake) mixed with the live light model + fire flicker; rim light on the side facing
  the fire; contact shadow + a long soft shadow cast away from the fire; soft foot occlusion; a mild grade toward the
  painted plate. Pets toggle: they walk out past the left edge and stay gone; back on, they walk in. No hearts/bubbles:
  a click shows a small fading "purr"/"woof".
- **Small life**: slippers by the chair, cocoa mug (steaming) on the chair arm, dog water bowl; candles, shelf lantern and
  fairy-light bulbs get live glows. Water reminder = a glass of water appears on the hearth with a glint (no text).
- **Layout**: hero objects kept inside `LW.layout.clear` (the stage shifts left up to 80 units on 16:10);
  `side:'left'` mirrors the whole room (window/widgets side on the left), text/art/label un-mirrored; re-layout on the event.
- Removed: procedural room/chair/window painting, cartoon flame sprites, aurora, rig fallback for pets, music-note
  particles, hearts, the "put a record on ♪" card, the water tag text.

Prompts (all via `codex exec`; full text kept in the session scratchpad, summarised):
- room-night: "interior of a cozy, lived-in log cabin at night in deep winter… genuinely realistic painted… exact layout
  (normalized): fieldstone fireplace x .36–.60… empty frame with flat pure black interior… firebox EMPTY (no logs, grate,
  flames)… wingback cognac leather armchair with a clear flat seat… walnut record cabinet with a flat empty top… window glass
  flat #0B1A2C… braided rug… lit by a strong (unpainted) fire". Ref: train bg-night for quality only.
- room-day: edit of room-night — "preserve all geometry exactly; overcast late-morning daylight through the window; no
  flames; glass stays flat #0B1A2C; frame interior stays black".
- outside-winter-night: "deep-winter night from a cabin window: snow-laden spruces at the edges, clearing, buried split-rail
  fence, pine forest, far blue ridges; no moon, no stars, no falling snow". Day/summer-day/summer-night: geometry-preserving
  edits (bright overcast; high-summer meadow with wildflowers; clear summer night).
- fire-sheet: "4×2 grid, 8 successive moments 1/10 s apart of the same wood fire, flames only, pure black background,
  shared base line, realistic". logs: "wrought-iron basket grate with split oak/birch logs burning (no flames), glowing
  fissures, ember bed". smoke: "4 thin rising wood-smoke wisps on pure black". turntable: "vintage walnut/aluminium record
  player, front 20° above, LP with plain cream label, NO tonearm". props: "enamel dog bowl, stoneware cocoa mug, glass of
  water, sheepskin slippers; transparent background". wide: outpaint of room-night to 2.4:1 (+ day edit).

Verification (headless Chrome via CDP, virtual clock, 1600×1000 and 3440×1440; the shared Browser pane was at its tab cap):
night, day/snow, dusk, summer day/night, blizzard, fog, music + beats, calm, water, pets off/on, `side=left`, ultrawide
day/night — shots `shots/cabin-*.png`. `__cabin.selfTest(60)`: 0 identity errors, 0 jumps. `node --test tests/` passes.
No console errors.


## Koi Pond: beat-sync pulse + glimmer, moon on the water — 2026-10-03 (local)

Koi is the one nature scene that grooves, beat-sync only (no player, track text or artwork). Everything lives in `scenes/koi.html`.
- **Pulse:** each beat drops one soft, low ring into the real ripple sim at a focus point (weight: noisy wandering anchor, pulled toward where the koi gather). The focus stays inside `LW.layout.clear`, so it follows `side=left`. Kick strength sets the ring energy, with a hard cap. Bass drives a long, slow analytic swell (one crest per two bars) that fades out at the edge of the clear band. Floor caustics brighten with level (up to +30%) plus a soft-attack beat accent.
- **Glimmer:** each beat sends a chevron of light head-to-tail along every koi. The sweep is delayed by the koi's distance from the focus so it rides out with the ring, and delay plus sweep fit inside one beat. Metallic koi (ogon, orenji, platinum, chagoi) also flash single scales, more with bright highs. Glints are written as a second colour target of the existing koi draw (MRT, no extra pass or upload) and added as light in the composite: sun-white by day, moon-silver by night, softer under overcast. Pads near the ring tremble very slightly on strong kicks.
- **Motion:** while music plays the koi school loosely: alignment, a gentle pull and lazy circling round the focus, a small stroke on each beat. Tail beats drift toward 1x, 1/2x or 1/4x the tempo and loosely phase-lock with a per-koi offset. Pause settles within about 3 s (an explicit player pause wins over trailing live levels).
- **Respect:** silent; the synthetic pulse (`live=false`) runs at about 40%; calm fades it to about 6% and drops no rings (the breath rings own the water); beats are queued and handled in `tick()` so nothing piles up while the governor has frames stopped. JS cost is about 0.003 ms/frame.
- **Coordinator brief §5/§7/§8:** at night the shared photoreal moon (`moon.js`, real phase) is reflected, mirrored and broken up by the same ripples. It is uploaded only when `LW.moonKey` changes, placed in the upper clear band (drifting with azimuth), and dimmed by cloud, fog, rain and moon visibility. Rain and melting snow no longer ripple the water under floating pads, and the pads ride the water rigidly instead of warping. Snow frosts the pads over a few minutes and melts afterwards. The frog and dragonfly leave in snow or below 7 °C. The breath-ring centre and the Feed action also follow the clear band.

Verification: virtual-clock headless Chrome at 1600×1000 with simulated nowplaying and 120 bpm beat frames. Stills are in `shots/`: koi-music-{base,onbeat,offbeat}-{day,night}, koi-music-onbeat-sideleft, koi-music-calm, koi-music-paused, koi-music-glint-night-seq, koi-glint-seq*, koi-moon-{crop,ripple}, koi-rain-pad-after, koi-snow-pads. No JS errors; `node --test tests/` passes. The running app has not been rebuilt or reloaded.

## Night Drive — 2026-10-03

New scene `scenes/drive.html` (Journeys). Painted player car generated with Codex image generation (`codex exec`, prompt in
`art-src/drive/car-prompt.txt`: generic two-door GT rear view from a raised chase-cam angle, deep midnight-blue metallic,
unlit dark-red full-width tail-light bar, blank plate, no badges/text, flat #e6e6e6 background, no shadow). Codex returned
a transparent PNG (`art-src/drive/car-raw.png`), cropped/resized to `scenes/art/drive/car.png` (1100×725). The scene grades it
to the current light at bake time and adds live tail/brake/plate glows; procedural car remains as fallback (`?noart=1`).
Moon uses the shared `moon.js`. No emoji/symbol glyphs (vector note + arrow icons on the gantry; reminder signs use pictograms).

## Music visualizer families + real harmony — 2026-10-03 (local)

**Real harmony.** `host/BeatSync.swift` now runs a `MusicAnalyzer` (pure DSP, testable without capture): the v1 1024-pt
levels/kick are unchanged; added an 8192-pt chroma FFT every 8th hop (100 Hz–2.5 kHz → 12 pitch classes), a debounced
chord (24 triad templates), a Krumhansl–Schmuckler key (10 s chroma memory, ~5 s debounce), spectral centroid, spectral-flux
onsets, tempo by onset autocorrelation (78–160 bpm, comb-weighted) with a kick-phase-locked beat phase, and sections
(build / drop / breakdown / silence from raw-dB short/mid/long energy). Measured on a 70 s synthetic EDM test signal
(Am–F–C–G at 124 bpm, intro/build/gap/drop/breakdown): correct chords and A minor key, 124.4 bpm, build at 10 s, drop on the
return of the kick (33.4 s), breakdown at 53 s; **0.16 % of one M1 core**. Output is one JSON frame per ~50 ms
(`onMusic`), see the field list at the top of the file. Main.swift must switch from `onFrame` to `onMusic` (one closure).

`scenes/music.js` (new, shared) → `LW.mx`: normalises/smooths host data, harmony → tonal palette on the circle of fifths
(major warmer, minor cooler, low saturation), beat clock with bar/phrase events, chord/key/section events, interval +
just ratio of the two strongest pitch classes. Fallbacks: tempo from kick spacing, sections from the level envelope, and a
synthesised diatonic progression (2 bars/chord, key steps a fifth per track) — never a title hash. Browser dev: key `n`
feeds synthetic frames with chroma through Am–F–C–G (modulating each loop) via the real `__lw('beat')` path.
`lw.js`: the beat handler also stores `LW.music.raw` and emits `'beatframe'` (backward compatible).

**Skins.** Cymatics: Sand (now harmony-driven; auto plate shape from key mode), Faraday Water (port of cymatica), Iron
Filings (28k oriented filings on frosted paper, taps on kicks, chaining onto the stream-function contours of hidden poles);
switching crossfades. New scenes: Kinetic (Copper Rain, Harmonograph), Fluids (Magnet Bloom), Skies (Komorebi; at night
the dapples are pinhole images of the real moon phase via `moon.js`). All place the hero inside `LW.layout.clear` and follow
`LW.on('layout')`; all set `LW.breathDiegetic`. Canopy masks for Komorebi were generated with Codex
(`scenes/art/skies/canopy-near.png`, `canopy-far.png`; prompt: flat black leaf silhouettes on white — Japanese maple
branches / dense zelkova canopy — converted to 1024² grayscale occluder maps). Thumbnails: `scenes/art/thumbs/{kinetic,fluids,skies}.jpg`.

Verification: headless Chrome (ANGLE Metal, M1) at 1600×1000 DPR 2, `?virtual=1&muted=1`; shots in `shots/`
(`cymatics-{sand,faraday,filings}-*`, `kinetic-copper-*`, `kinetic-harmonograph-*`, `fluids-ferro-*`, `skies-komorebi-*`).
No console errors; `node --test tests/` passes; `swiftc -typecheck` passes. The running wallpaper app was not touched.


## Speakeasy, Rooftop, Ramen Alley polish — 2026-10-03

**Speakeasy (beat-sync only).** No now-playing UI anywhere: the marquee is always the house-band poster (its cartoon crescent replaced by a deco spotlight disc), the jukebox is silent decor (typed cards are unreadable type lines, no media clicks), the kick head reads "The House Trio", the gramophone and the `player` setting are gone, and the artwork tint/generated covers are removed. A painted player piano (`art/speakeasy/piano.png`) replaces the old one on stage: on each beat a chord goes down mid-keyboard, bass adds low keys and the sustain pedal, mids/highs drive a melody in the upper half; keys tip and drop (measured key geometry, black keys redrawn from the art), the paper roll scrolls with level. The follow-spot now finds the piano; spotlight, footlights and poster bulbs are steady and warm when paused and swell gently on beats. Painted street plates (`street-night.jpg` / `street-day.jpg`) replace the procedural brick view through the high window; weather and lying snow are graded on top, and snow drifts into the pane corners. Water/stretch reminders no longer show text tags.

**Rooftop.** The boombox (`art/rooftop/boombox.png`) is the player (click = play/pause, live cassette reels); the projector (`projector.png`, a slide projector on a side table) is a display: album art big, title/artist small; click it (or the wall) = next. Staging fixed: both deck chairs sit side by side on the open deck at the same depth, turned toward the wall, with contact shadows; the projector stands just behind and between them, inside the clear band, its beam passing over the chair backs. The cartoon moon is the shared photoreal `LW.drawMoon`. Painted-deck weather: wet sheen with string-light reflections, snow on parapet/wall top/deck; no rain splashes under chairs, the projector table or the radio crate. Idle projection is a film-leader frame instead of a cartoon moon slide.

**Ramen Alley.** The radio (`art/ramen/radio.png`) is the player (display scrolls the title; body = play/pause, tuning knob = next). The vending machine is decor: its panel cycles three painted ads (`ad-1..3.jpg`), no track UI, clicking drops a can. Painted noren (`noren-1..5.png`) and chochin lanterns (`lantern-1..2.png`, 麺) replace the procedural fake-glyph cloth and lanterns. The painted crescent was removed from `bg-night.png` (Codex sky edit blended into a feathered disk) and the shared moon is drawn live between the wires. Rain ripples now spawn only on open paving (not on the stall front/counter, under the eave, on the vending machine or crates) — this was the "splash rings on wood under a red stool" bug.

**All three.** Pets: no warm rim halo, the white cut-out fringe is eroded, stronger contact shadows, lower light floor so they sit in the room's light; `LW.settings.pets === false` → they get up and walk out of frame and stay away, `true` → they stroll back. Resting spots are filtered by `LW.layout.clear/avoid`; `LW.on('layout')` re-composes without reload (speakeasy/rooftop slide the camera so the hero sits in the clear band with `side:'left'`; ramen slides the painting right and fills the near-wall band with a dark wall). Petting shows only a small fading "purr"/"woof".

Prompts (Codex `codex exec`, references were crops of each scene's bg-night):
- piano: "1920s upright PLAYER PIANO, perfectly straight-on, dark polished mahogany… spool-box doors OPEN revealing a cream perforated paper roll… keyboard straight-on… two brass pedals… flat top EMPTY… plain #e6e6e6 background".
- street-night: "VIEW SEEN THROUGH a high street-level basement window, ~2.4:1, wet stone sidewalk at eye level, cast-iron lamp post at 75%, brick building across with two warmly lit sash windows, doorway with canvas awning, iron railing, indigo sky strip; no people/cars/text/frame". street-day: same view repainted in overcast daylight, "preserve all geometry".
- noren: "FIVE separate hanging indigo noren panels… white brush-printed steaming ramen bowl emblem on the middle panel, seigaiha wave print at the hem… #e6e6e6".
- lanterns: "TWO red paper chochin lanterns… glowing from inside, black lacquered caps, tassel, one bold brush kanji 麺… #e6e6e6".
- radio: "1960s Japanese tabletop transistor radio straight-on… cream case, walnut trim, speaker grille left, EMPTY smoky display window right, two knurled knobs… #e6e6e6".
- ads: "THREE square backlit illustrated ads, no text: iced coffee can on blue; green tea bottle on teal; cartoon orange cat hugging a red soda can on sunset orange".
- projector: "1960s slide projector on a tall slender wooden side table… three-quarter from front-right, lens pointing LEFT and slightly up… film tins on the lower shelf… #e6e6e6".
- boombox: "1980s cassette boombox straight-on, cream upper / muted teal lower, two speaker grilles, EMPTY smoky cassette window, piano-key buttons, tuning strip, chrome handle, no text… #e6e6e6".
- ramen sky edit: "remove the crescent moon AND its glow… preserve every wire, building silhouette and star exactly".


## Corner Café + Record Store polish — 2026-10-03 (local)

Corner Café (renamed from Night Café; the scene has day modes) and Record Store, per `docs/polish-brief.md` §1–8.

**Music.** Café: ONE player at a time via `LW.settings.player` — `'record'` (default) is a painted 1960s walnut record player on the console; `'jukebox'` (Pro skin) is a painted Wurlitzer-style jukebox standing against the wall where the console was (the room swaps to a console-less painting), with its bubble tubes lit live in the album's colours from a cream-glass mask, the track typed on its title strip, a glint on the playing record, beat-stepping selector lamps and a glowing grille; the now-playing sleeve sits on a small wall ledge over a painted crate of LPs (the "next" target). The chalkboard carries the title in both skins. Record Store: a painted direct-drive deck replaces the flat plinth (plinth removed from the paintings); record, tonearm (now parks in the painted arm rest and rides the groove), pilot lamp and the hero sleeve/letter board stay live.

**Through the windows.** Painted street plates (night wet, night dry, day) replace the procedural facades and lamp posts in both scenes; wetness crossfades wet/dry at night, overcast/rain greys the day plate and darkens + sheens the road, fog hazes the far side, snow settles in patches (lanes worn darker) and melts back, the night sky above the roofs is cut at load and replaced by the live sky and the shared photoreal moon (`moon.js`, real phase). Painted side-view cars (three) replace the procedural cars, re-lit per bake, with headlight beams, tail lights and wet reflections at night. Rain/splash rings stay clipped to the window's road band (no indoor rain in either scene — the screenshotted splash-on-wood bug is not in these two). Records: the window is cut with a glass mask from the painting, so the mullions and the sleeves/cactus on the sill stay in front of the street.

**Rooms by weather.** New day paintings (café chalkboard composited back in from the night plate), and overcast day paintings (no sun patches) blended in by cloud cover, also for the jukebox room.

**Pets.** Pets toggle (`LW.settings.pets`): café pets hop down and walk out past the right edge; record-store pets walk out along the front of the shop off the left edge; both fade at the edge, stay away, and stroll back in when re-enabled; off at load = nobody home. Resting spots respect `LW.layout.clear` and `avoid`. Two-part contact shadows (tight + cast away from the brighter side), a cached rim light from the brighter side (warm lamps at night, cool window by day). Record Store: a painted dog bed under the window whose front rim is redrawn over whoever lies in it, and bowls beside it; café: bowls by the door. Scale: both decks were made smaller (they were ~2× real size). No text bubbles/z's/hearts/emoji: a pet click shows one small fading "purr"/"woof"; the water reminder is the glass alone (no paper tag); ♪/✶ glyphs replaced by a vector note or removed.

**Layout.** `side:'left'` mirrors the whole room (world transform), with text, artwork, the decks (right-hand tonearms), the jukebox and the street drawn upright; pointer mapping, chalk/board/neon placement and parallax follow. Re-laid out on `LW.on('layout')` without reload. Wide screens: dim/vignette overlays now cover the side panels (the records vignette left a light strip on 21:9).

### Generated assets (Codex image generation; raw outputs and prompts kept in the session scratchpad)

| Path | Prompt brief |
| --- | --- |
| `art/cafe/bg-day.png` | Edit of bg-night: same café, late-morning daylight from the left window, lamps off, flat pale-blue glass; preserve all geometry. (Chalkboard composited back from the night plate.) |
| `art/cafe/bg-overcast.png`, `art/records/bg-overcast.png` | Edit of the day room: overcast rainy afternoon, no sun patches or shafts, soft diffuse cool light, lamps off; preserve geometry. |
| `art/cafe/bg-{night,day,overcast}-jukebox.png` | Edit: remove only the record console; continue wainscot panelling, skirting and floor boards with a soft contact line. |
| `art/records/bg-day.png`, `bg-night.png` | Day edit of the shop (lamps/picture light off, sun patch on the checkerboard), then both: remove only the flat turntable plinth, continue the counter top and shelves behind. |
| `art/{cafe,records}/street-night.png` | Café: narrow European street at blue hour — three-to-four storey townhouses, bakery with striped awning, bookshop, flower shop, wine bar, lit lamp, bicycle; empty wet cobbled road band. Records: red-brick walk-up with fire escapes, cream building with a cocktail bar, laundromat, hydrant, lamp; empty wet asphalt band. No people, cars or text. 1024². |
| `art/{cafe,records}/street-night-dry.png`, `street-day.png` | Edits preserving geometry: dry matte road (night); bright clear late morning, shops open, lamp off, dry road (day). |
| `art/{cafe,records}/car-1..3.png` | Sheet on #e6e6e6: 1960s cream compact, teal hatchback, oxblood delivery van, exact side view facing right, unlit lamps, no people. Cut with `art-src/cycles/cut.py`. |
| `art/cafe/jukebox.png` | Wurlitzer-1015-style front view, walnut + chrome, tubes painted UNLIT cream, blank marquee and title strip, dark lower dome glass. |
| `art/cafe/turntable.png` | 1960s walnut record player, front/20° above, platter ellipse ≈ 1/3, empty black mat, arm pillar + rest only (no tonearm). |
| `art/records/turntable.png` | Pro direct-drive deck, dotted platter rim, pitch slider, red pilot lamp, empty mat, arm pillar + rest only. |
| `art/cafe/crate.png` | Old fruit crate of upright LP sleeves (abstract covers), front/20° above. |
| `art/{cafe,records}/dogbed.png`, `bowls.png` | Plush rust/oatmeal round dog bed with a tartan blanket; ceramic water + kibble bowls on a wooden tray. |
| `art/records/glass-mask.png` | Not generated: alpha mask of the window glass, keyed from bg-day's flat glass colour. |

Verification: headless Chrome via CDP (the shared Browser pane had no free tab), `?virtual=1&muted=1`, 1600×1000 and 3440×1440, side right/left, night/day/rain/snow/storm/fog, playing/paused, jukebox skin, calm, water/stretch reminders, pets off→on, live `layout` event. Self-tests clean (café: 0 identity errors, 0 jumps, rightLong 0; records: 0 errors); no console errors (only the old optional per-scene pet-override 404s in records). Frame ~3 ms (café) / ~6 ms (records) at 1440×900 in rain, headless; rebakes 5–10 ms after the first. `node --test tests/*.cjs` 32/32. Shots: `shots/cafe-final-*.png`, `shots/records-final-*.png`.


## Train Journey: skins + jointed-rail rhythm — 2026-10-03 (local)

Renamed in-scene to "Train Journey" (title, header; the "night trains" book text is gone). `menu.html` and
`site/` still say "Night Train" (not train files, left alone).

**Skins** (`LW.settings.skin`, default `indian`): `indian` (Indian Sleeper), `shinkansen`, `swiss` (Swiss Alpine),
`orient` (Orient Express). A skin is one `SKINS` table entry in `scenes/train.html`: files, window (rect + optional
glass mask + view box), table + prop placement, panorama bands + moon line, lamps, carriage light colour, trackside
layers (sprite, scale, weight; insulator wires or a level contact wire), bridge (tiling bay; height/top in the
glass), tunnel palette, route segments and `rail: 'jointed' | 'welded'`. New skin = art in `art/train/<id>/`
(names in `SKIN_FILES`) + one entry. Switching loads the new art, then crossfades a still of the old carriage
into the live new one over 1.4 s (no reload; train, weather, music, calm carry on). Dev key `k` cycles skins.
- Mask-based windows: glass = alpha of `win-mask.png`, built by `art-src/train/winmask.py` from the flat placeholder
  colour that must match in BOTH plates (kills navy carpet etc.). Shinkansen's second window at the far left shows
  the landscape too.
- Trackside sprites scale with the window height (Swiss glass is ~1.65× the Indian one). Scrub is skipped on bridges.
- Bridges on `water` segments, all skins: Indian riveted through-truss (new `art/train/bridge.png`), Shinkansen
  concrete sound wall, Swiss granite parapet, Orient iron lattice truss.
- Ultrawide: plates continue their own averaged edge colours into the side panels, then shade (replaces the
  flat navy wash, which clashed with wood interiors).

**Rail rhythm**: Indian = jointed 13 m rails. Each joint is crossed by one bogie pair then the next
(`RAIL.axles`): hits at 0 / 72 / 208 / 280 ms, repeating every 520 ms at 90 km/h, scaled by speed. Rail lengths
jitter ±12 cm per joint, ±4 ms timing jitter, ±12 % level. The rear pair is lower and duller. Over bridges the
hits are louder and girders ring; in tunnels they're muffled; calm makes them softer; none during a surge. The
carriage jolt fires on the same axle crossings, so it lands with the clacks. Other skins = welded rail: no beat
and only a rare soft bogie settle. Verified: 7.69 hits/s scheduled at cruise on Indian (= 4 per joint), 0 after
switching to Swiss.

Generated (Codex `exec`; prompts in `art-src/train/prompts/*.txt`, raw outputs in `art-src/train/raw/`, runner
`gen.sh`):
- `<skin>/bg-night.png`: a new train interior, Indian plate as quality/style ref, same layout contract (camera
  in the aisle, facing seats, empty table under the window, glass flat #101d2e). `bg-day.png` is a
  geometry-preserving edit (lamps off, daylight, glass flat #a9c8e6).
- `<skin>/pano-day.png`: 3:1 panorama, Indian countryside as ref (Fuji + paddies; glaciers + turquoise lake +
  chalets; Venetian lagoon into vineyards/cypress hills). `pano-night.png` is a moonless-night edit; the real-phase
  `LW.drawMoon` is added live.
- `<skin>/pole|tree1|tree2|scrub|marker|bridge.png`: one 6-object sheet per skin, with that skin's pano as ref.
  The sheets were cut with `art-src/train/cutsheet.py`.
- `<skin>/drink.png` + extra: green tea yunomi + ekiben bento; hot chocolate + chocolate bar; bone-china teacup +
  teapot. Cut with `cutsoft.py` (tight border key: white porcelain sits too close to the #e6e6e6 background).
- `art/train/bridge.png`: Indian truss bay (full-bleed sheet, fixed-colour key).

Deferred (per coordinator): passers-by. Already made and parked in `art-src/train/deferred-people/`:
- Codex walk strips for all 10 people (`raw/p-*.png`).
- Packed atlases + metadata for the chai-wala and salaryman (`pack.py`).
- Foreground occluder masks per skin (`foremask.py`: ladders and side panel; near seat backs/doors).

Shots: `shots/train-skin-{shinkansen-day,shk-table,shk-country,swiss-xfade,swiss-day,swiss-night,orient-night,
indian-bridge,orient-uw-rain2,orient-uw-calm-music,indian-uw-rain,swiss-uw-snow}.png`. No console errors;
`node --test tests/` passes.
Known: the panorama's top band boundary can shear slightly under Fuji/hill bases at the far band's slow speed.
The cup/teapot handle holes keep a few grey pixels. Each new skin adds ~9-10 MB of PNG.
# 2026-10-03 — priority pass intake (verification blocked)

Read AGENTS.md, docs/HANDOFF-codex.md and scene briefs. All 32 existing Node tests pass.
No scene/art changes, generated images, new browser screenshots or finished-item commits in this pass yet.
The existing `.gitignore` modification was left untouched.

Train inspection: current mask alpha bounds in 1600×1000 stage coordinates are
Indian [475.16,316.53,952.33,555.44], Shinkansen [93.82,230.85,977.55,523.19],
Swiss [339.97,70.56,1168.22,476.81], Orient [491.30,225.81,986.63,498.99].
These differ from the declared glass rectangles. The outside renderer adds a 10-unit margin,
so inspect coverage during carriage rocking before attributing the blue rim solely to those bounds.
`winClip` still uses the main glass rectangle, excluding Shinkansen's second opening for clipped effects.
Trackside images already have tight nonzero-alpha bounds; inspect terrain placement and faint alpha fringes
before assuming transparent padding causes the floating trees.

Verification blocker: `python3 devserver.py 5210` failed at socket bind with PermissionError/Operation not permitted;
this session cannot request elevated execution. Browser inventory returned no controlled browsers and
`cua.getApp("com.apple.Safari")` returned “Computer Use was not approved to use Safari”.
Resume with an externally started dev server and an approved browser connection. No later priority item
has been marked complete or substituted for the required browser verification.

# 2026-10-03 — P0 Train verified with wkshot

- Existing regenerated masks inspected and retained: no remaining navy placeholder rim in all four looks.
  Renderer now derives coverage from the actual mask alpha plus a 10-unit rocking margin; effects cover
  Shinkansen's second opening too. Day/night, click surge and full tunnel (rain requested) all fill the glass.
- Reduced panorama saturation to 72%, softened brightness in a cached paint pass to match the carriage.
  Retained the existing generated art; no new image prompt needed for this item.
- Trees moved from the distant lake/field line to 93% of the view height, scaled down, and move at the
  foreground band's 0.68 speed. Soft contact shadows; trees and scrub suppressed over bridge spans.
  Poles remain planted below the sill and bridge piers extend beyond the visible opening.
- Opened and inspected `shots/p0-train-{day,night,surge,tunnel}-grid.jpg` (all 16 underlying
  `p0-train-<skin>-<state>.png` captures), plus before window crops. All scene error arrays empty.
  Surge reports true and tunnel coverage reports 1 for each skin. Node suite: 32/32 passing.
- `wkshot` now records errors from document start, gives settings-triggered assets one second to load
  before stepping, accepts non-LW pages, and prints an optional `__shotReport()` diagnostic.
  Recompiled only this screenshot helper; no installed/running wallpaper app touched.

# 2026-10-03 — P0 Night Drive motion + painted world

- Distance fade covers the last 70 segments; same-direction traffic now enters at the horizon too.
  Forest detail changes blend across 60 segments instead of popping at fixed cutoffs.
- Road LOD strips anchored to world segment boundaries. Crest clipping calculated per segment independently
  of LOD. All item faces, emissive layers and traffic lights clip behind crests; billboards reveal gradually.
  Source/destination sprite cropping caps the drawn rectangle to the viewport while close objects continue
  expanding beyond its edges. Segment zero traffic stays drawable until it actually passes the near plane.
- Coast/forest verges now share the road's ground plane (raised banks had unsupported roots over hidden
  crests); low continuous woodland floor replaces sawtooth walls. Forest density reduced from .38 to .28.
- Three generated transparent parallax plates: `scenes/art/drive/{coast,forest,desert}-painted.png`.
  Cached daylight/night/fog grading, correct horizon alignment, retained biomes during transitions.
  Generated `roadside-painted.png` supplies cottage/diner/fuel buildings and cactus/Joshua/sage sprites;
  runtime crops each cell to its alpha bounds. Existing train tree art reused and relit.
- `tools/check-drive.js`: 66s WebKit contact sheets; finite-state, crest monotonicity and projected road
  contact assertions at LOD joins. Both motion runs: 9 frames, max 4 traffic cars, zero issues/errors.
  Opened `shots/p0-drive-{traffic,transition}-motion.png`, `p0-drive-wide-left.png` (3440×1440 rain/day),
  `p0-drive-desert-final.png`, `p0-drive-forest-final.png` and intermediate biome iterations.
  Forest 1440×900, 240 frames alone: 3.88 ms total, 3.08 ms JS mean, 6 ms p90, 10 ms worst.
  This meets the mean budget; occasional frames exceed 4 ms. Node suite 32/32 passes.
- Screenshot helper now uses a nonpersistent WebKit data store: repeated URLs no longer return stale code
  or saved scene settings. No app rebuild/reload/install.

Built-in image generation prompts (no API/CLI fallback):
1. **Coast**: “Use case: stylized-concept. Create a premium hand-painted parallax background asset for a calm
   cinematic driving wallpaper, wide 3:1 composition. Coastal panorama: hazy blue-grey headlands and tiny rocky
   islands along a low horizon, calm textured slate-blue sea filling the entire lower half, a low weathered
   coastal bluff far left, very distant hills on the right. Restrained natural gouache/oil brushwork, believable
   atmospheric perspective, muted daylight colors suitable for runtime dusk grading. No road, no cars, no
   buildings, no people, no sun or moon, no text. The upper 40 percent above the irregular distant mountain
   horizon must be genuinely TRANSPARENT, no painted sky, no checkerboard. Terrain and sea are opaque and
   extend to left, right and bottom edges. The horizon sits about halfway down. This is one continuous
   landscape layer, not a mockup, not multiple panels. Save the generated asset.”
2. **Forest**: “Use case: stylized-concept. A single wide 3:1 hand-painted background layer for a cinematic
   driving wallpaper: Pacific Northwest evergreen valley, layered distant fir-covered ridges, delicate mist
   between the blue-green hills, nearer dark moss-green conifers at the left and right edges and a low open
   valley in the middle. Restrained realistic gouache and oil painting detail, atmospheric perspective, neutral
   muted daylight for runtime night grading. Terrain fills lower half to bottom and both edges. Genuinely
   transparent sky above the irregular tree-covered ridge, upper 40 percent empty transparent. No sky paint,
   checkerboard, sun, moon, road, buildings, vehicles, people, text, or labels. Landscape is continuous, not
   panels. Fine natural tree silhouettes, never geometric triangles.”
3. **Desert**: “Use case: stylized-concept. A single wide 3:1 hand-painted parallax background layer for a premium
   calm driving wallpaper: American southwest desert, distant layered sandstone mesas and buttes, hazy dusty
   rose and ochre cliffs, subtle wind-carved strata, low undulating desert basin in the foreground. All formations
   distant, strongest rock shapes on outer thirds, low open center. Restrained realistic oil/gouache brushwork,
   neutral muted daylight suitable for runtime dusk/night grading. Upper 40 percent and sky above the irregular
   low mesa skyline genuinely transparent; terrain opaque extending to both edges and bottom. No sky paint,
   checkerboard, sun, moon, road, cars, people, buildings, labels or text. Continuous cinematic landscape, not panels.”
4. **Roadside atlas**: “Use case: stylized-concept. Production sprite atlas for a cinematic painted road-trip
   wallpaper. Transparent background, exactly SIX isolated objects in a spacious 3 COLUMN by 2 ROW regular grid,
   each object entirely inside its cell with transparent margins and clearly separated from neighbors. Top row
   left: small realistic one-story roadside timber cottage, three-quarter front view, low porch, warm window
   glints. Top middle: charming weathered mid-century roadside diner, single low red-and-cream building, chrome
   trim, large warm windows, no sign pole. Top right: a modest small rural gas-station building with an attached
   low canopy and two vintage pumps, no logos. Bottom row left: one realistic branching saguaro cactus, complete
   base at ground. Bottom middle: one realistic Joshua tree, complete trunk and base. Bottom right: a low desert
   sagebrush clump with two small dusty sandstone rocks at its foot. Muted natural gouache/oil painting, physically
   plausible materials, soft neutral afternoon lighting, fine texture, no outlines or cartoon shapes. No people,
   cars, text, numbers, logos, ground plane, scenery, drop shadow or labels. Genuine transparency in all empty
   areas. Match scale within each row, bottom edges aligned within each cell. Wide 3:2 atlas.”

## 2026-10-03 — P0 menu verification
- Checked all 16 bundled scene control sets in native WebKit light and dark appearance at the host's 340px panel width. Opened four contact sheets covering all controls. The Bowls sleep timer overran by 16px; choice sets above four now use a full-width two-column block. Rechecked/opened both Bowls appearances and every expanded shared section. Reports: no JS errors or control overflow.
- Repro: `python3 tools/check-menu.py` (host literal control/skin definitions); `python3 tools/check-menu.py bowls shared`. Screenshots `shots/menu/`, reports `shots/menu-check.log`, `shots/menu-final.log`. This verifies HTML rendering, not the native host bridge or license transactions.
- `wkshot` now waits for pending dynamically loaded images and accepts `?shotAppearance=light|dark`; only this standalone helper was compiled. Opened the image-ready Drive ultrawide rain/left capture `shots/p0-drive-wide-left-final.png`. No app rebuild/reload. No image prompts for this item.

## 2026-10-03 — P1 Cats + Grass finish
- Grass: dissolved the mountain painting into the distant meadow instead of clipping at a straight horizon; sampling includes the extended foot (no stretched last-row streaks). Snow starts bare, accumulates over time, and survives lighting snaps. Fixed reminder/calm events interrupting departing pandas and count increases introducing pandas while Pets is off.
- Cats: replaced clipped procedural cloud blobs with a three-row transparent painted atlas, relit once per bake. Existing no-speech-bubble reminder behavior, textured shared moon, shelter masks, snow accumulation/melt, pet lighting and mirrored/avoid layout verified. Sound words and custom drawn hearts/sleep marks retained; no emoji characters or spoken sentences introduced.
- Opened `shots/p1-{cats,grass}-pets.png`: 170-second departure/reminders/return contact sheets, both report no issues. All cats/pandas away by 40 seconds and return after re-enabling. Count 3→1→3 with Pets off also ends with all three pandas away/visibility zero (`p1-grass-off-count.png`). Initial 20-second self-tests reported zero identity errors/teleports; planted-paw code retained.
- Opened both scenes' night, storm, snowfall, thaw, and 2400×1000 mirrored-left/avoid-box captures. Cats snow 0.656→0.521 after 60s clear; Grass 0.373→0.262 after 40s clear. A longer parallel Grass thaw capture hit the helper's 60-second timeout; shorter isolated scenario passed. Final Cats cloud captures `p1-cats-{night,storm,left}.png` and `p1-cats-clouds-final.png`. WebKit reports no JS errors; Node suite 32/32.
- Repro helpers: `tools/check-pets.js` as wkshot pre-script (0 steps), `python3 tools/check-pet-weather.py` (optional `scene:case` arguments). `wkshot` now calls optional `__shotReady` after image loads for deterministic diagnostic scripts.
- Generated `scenes/art/cats/clouds.png` with built-in ImageGen (source `exec-28b71916-f032-45e5-860d-0d5f9d2c02be.png`): “Create a production PNG sprite atlas with a fully transparent alpha background: THREE separate Mediterranean cumulus cloud formations, stacked in three evenly spaced rows. Each row contains one long horizontal cloud, all fully inside its cell with generous transparent padding. Canvas landscape 1536x1024, cloud 1 within x80..1450 y40..290, cloud 2 within x80..1450 y380..620, cloud 3 within x80..1450 y720..970. Soft luminous warm ivory tops, muted pale cool gray undersides, delicate natural wind-torn edges, irregular shapes with fine hand-painted gouache and oil brush texture. Quiet sophisticated scenic animation background art, distant clouds viewed horizontally from a Greek island terrace, matching a painterly blue-and-white Santorini setting. Distinct silhouettes, no repeating round blobs, no gradients posing as clouds, no hard cropped edges. No sky, no sun, no landscape, no text, no border, no shadow outside cloud alpha. Important: transparent background, individual cloud shapes separated by fully transparent gutters, restrained contrast and no outlines.” Actual alpha gutters mapped at y370/670 during runtime atlas sampling.

## 2026-10-03 — P1 Rooftop / Ramen plate alignment
- Opened all four source plates: Rooftop day/night are both 1942×809; Ramen day/night are both 1586×992. Wall edges, projection panel, roof parapet, strings, crates, pots, stall roof/counter, vending frame, stools and window grid align. No new art/crop/recomposition needed; existing paintings retained.
- Fixed a separate Rooftop day-layer mismatch: the foreground occlusion cutouts always sampled the raw night plate. They now sample the exact blended/graded room canvas, removing the dark patches on the daytime crate/pots/deck and maintaining the same geometry throughout the crossfade. Furniture stays on its own existing layer.
- Opened `shots/p1-{rooftop,ramen}-{day,sunset,night}-before.png`; then final Rooftop day/night/sunrise and both scenes' sunrise and 2400×1000 left-layout captures (`p1-*-final.png`). Dawn uses ~0.31/0.33 day blend; dusk also showed no doubled landmark edges. All captures report no JS errors. The existing Ramen wide-layout quiet-wall extension remains as designed; no host/layout redesign in this plate pass.
- No image-generation prompts or replacement assets for this item. All five requested priority items are locally committed; no app build/install/reload, push, release or post.

## 2026-10-03 — P2 Airport
Built `addons/airport` using Kit.plate and the prepared aligned plates, masks and metric layout. Quiet 150-second departure cycle enters/exits beyond the frame; parked A320/E175 use stop bars, contact shadows, plate occluders and apron lighting. Mirrored layout and avoid regions suppress resting aircraft; exposure mask excludes the terminal and surface checks exclude sky splashes. Shared moon, no reminder text. Existing generated art only (no new prompts). Packed with addons/build.sh and tools/pack-scene.sh. Inspected shots/p2-airport-{day,night,wide}.png (night lighting corrected after review); all WebKit errors empty; 32 Node tests pass. No app build/install or publishing.

## 2026-10-03 — P2 realistic plate add-ons
Created `addons/marine-drive`, `addons/taj-mahal`, `addons/hillside-valley` using Kit.plate. Six new built-in imagegen
masters are preserved in `art-src/plate-scenes/<id>/{day,night}.png`. `tools/plate-scene/build-kit.py` reproducibly encodes
WebP plates and builds measured water/exposure masks from manifest.json, with sky segmentation. Night edits retain the
day geometry; dawn/dusk and overcast use Kit fallback grading. Water shimmer is restrained, clicks make small ripples
only in clear water, shared sky/moon follow time, mirrored composition follows LW.layout, weather is masked from
facades/covered foliage and splash surfaces exclude sky. No people, text bubbles or emoji.

Built-in image prompts (all 1536×1024; no copied frames/characters):
- Marine Drive day: cinematic photorealistic view from high apartment at northern Back Bay looking south, elegant curved
  seafront road and Art Deco apartments LEFT, distant Nariman Point at x .55/y .4, tetrapods, calm Arabian Sea RIGHT,
  clear soft late-afternoon daylight, understated natural colors. Empty road, no people/vehicles/boats, smooth pale-blue
  sky without clouds/sun/moon, right 28% quiet for widgets, no text/logos/watermark.
- Marine Drive night (reference day): preserve ALL geometry/framing and every building, road, lamp, shoreline and horizon
  location. Change ONLY lighting to blue-hour night; Queen's Necklace amber promenade lamps, restrained water reflections,
  sparse lit apartment windows, deep navy sea, smooth dark sky without stars/clouds/moon. No new objects/light trails.
- Taj day: photorealistic cinematic architectural photograph, slightly offset garden viewpoint, entire marble mausoleum
  and four minarets left-central, reflecting pool from lower-left, cypress gardens, right 28% calm lawn/trees, fine marble
  detail and soft morning light, plain sky, no people/animals/vehicles/text/logos.
- Taj night (reference day; one connection failure, successful retry): preserve exact geometry/framing, change ONLY lighting
  to cool moonlit night, gently visible marble, dark gardens, silvery pool, no artificial floodlights, smooth navy sky
  without moon/stars/clouds, no new objects.
- Valley day: original Japanese hillside valley, Ghibli-inspired hand-painted background atmosphere, NO copied composition
  or characters, rich realistic depth, delicate gouache/watercolor texture, luminous afternoon light, tiny rustic farmhouse
  on terraced green hills LEFT, winding stream, grasses/wildflowers, misty wooded ridges, plain sky, right 28% quiet slopes,
  mature cinematic painting without outlines/toy shapes, no people/animals/text/logos.
- Valley night (reference day): change ONLY lighting, preserve every landscape feature and geometry; warm dim farmhouse
  windows, cool muted-green slopes, silvery stream, misty blue ridges, plain navy sky without moon/clouds/stars, no characters.

Inspected WebKit `shots/p2-{marine,taj,valley}-{day,night}.png` plus contact sheets; corrected pale leftover sky regions
and the valley horizon mask after visual review. Night checks include mirrored layout, ultrawide, rain and snow.
All captures report no JS errors. All 32 Node tests pass. All three packed locally; no publishing or installed-app changes.

## 2026-10-03 — P2 Train passers-by
Activated parked eight-frame chaiwala/salaryman sequences from `art-src/train/deferred-people` in
`scenes/art/train/people`. Indian uses chaiwala; Shinkansen, Swiss and Orient use the suited traveller. Floor-anchored
walking takes 30 seconds, with 155–217 seconds between crossings after an initial 55-second delay. Calm slows the walk;
skin changes cancel/restart safely. Cached lightAt tint incorporates each skin's lamp color and window daylight.
Each skin's alpha foreground mask removes the walker behind near seat backs, doorway edges or rails. Shared carriage
rocking, soft contact shadow, graded approach to clear-zone/avoid boundaries; no text. No new generation prompts.
Inspected `shots/p2-train-{indian,shinkansen,swiss,orient,occlusion,avoid}.png` and contact sheets, covering daylight,
night, left/off layouts and an explicit avoid region. No JS errors; Node suite 32/32. Installed app untouched.

## 2026-10-03 — P2 music installations and closed rosettes
Added `scenes/physical-skins.js`: Vortex Rings and Ripple Tank in Fluids, Pendulum Wave in Kinetic; registered all three
in `host/Skins.swift`. Original defaults remain first. Owning scenes update the shared music layer once per frame and
skip hidden renderers. New installations choose a free rectangle inside LW.layout.clear around avoid boxes.
- Vortex: capped five toroidal density volumes, softly lit ray integration, bounded ring speed/radius with mutual
  coaxial influence, rate-limited kicks, quiet idle releases and one calm ring per exhale. This is a bounded visual
  approximation, not a full fluid solver or the proposal's tracer-based Biot–Savart simulation.
- Ripple Tank: sum cylindrical wave fields from strongest chroma sources before caustic shading; circle-of-fifths
  source placement glides; idle/calm returns to one quiet source. No weather in the indoor installations.
- Pendulum: fifteen brass bobs, analytic integer cycle counts, lengths proportional to inverse squared frequency,
  phrase-period revival, smoothed amplitude, quiet resting motion. No beat-driven light flashes.
- Harmonograph: lock rational ratios and amplitudes for each complete orbit, lift at its exact common period, and
  draw successively smaller separate closed orbits. Third pendulum also uses an integer multiple; no detune-driven
  failure to close. Fixed caption to report the locked ratio. Existing reminder sentences no longer render.

Inspected wkshot `shots/p2-{vortex,ripple,pendulum,rosette}.png`, `*-final.png`, ripple-calm, skin-switch and review sheets.
Covered music, idle, calm, mirrored ultrawide/avoid, switching back to Harmonograph. Virtual captures disable CSS skin
transitions where necessary (WebKit's CSS clock does not advance with LW.advance). No JS errors. Closure reported
4.74e-16; invariant tests cover six ratios (including 45:32), both rotations, third pendulum, and 15-bob revival.
`node --test tests/*.cjs`: 34/34. `swiftc -typecheck -target arm64-apple-macos13 host/*.swift`: passed, existing warnings
only (including duplicate bowls case). No app rebuild/install, push or release. Other proposed visualizers remain backlog.

## 2026-10-03 — Santorini Cats directional walk art (Codex)

Owner report: diagonal travel showed a side-view cat sliding across the terrace.
Generated ten new eight-frame strips using the built-in imagegen tool, referencing each
coat's existing `art-src/cycles/cat-<coat>-walk.png`. Raw outputs:
`art-src/cycles/cat-<coat>-walk-f.png` and `cat-<coat>-walk-b.png` for orange, black,
grey, calico and siamese. All 80 installed frames are under the respective
`scenes/art/sprites/cats/<coat>/cycle/walk-{f,b}-1..8.png` paths.

Exact prompts and original generated-output paths: `art-src/cycles/directions-prompts.json`.
Prompt structure: same painted shading, fine outline, palette, coat markings, body proportions
and camera as the supplied side sheet; eight evenly spaced full-body frames in one row;
three-quarter FRONT walking toward camera/screen-right or three-quarter BACK walking away/
screen-right; entire torso rotated, near/far legs foreshortened, four-beat walk, complete ears,
paws and tail, fixed lighting and ground baseline, flat #e6e6e6, no text/props/shadows.
The tool returned alpha rather than the requested opaque grey. Retained those original sheets
and cut their alpha directly, avoiding a second chroma extraction and pale fringe.
`python3 art-src/cycles/cut-directions.py` reproduces the cuts, removes detached speckles,
and preserves a common vertical extent/baseline per strip. Runtime layout supplies one scale
per loop relative to the existing standing height. Inspected `shots/cats-dirs/raw-contact.jpg`
and `installed-contact.jpg`: front/rear body angles are distinct, identities and coat patches
are consistent. Directional running will use the allowed faster walk fallback; no new run art.

### Direction selection, paths and contact registration

Added optional `LW.PET_DIRECTION_HAS` and `LW.PET_DIRECTION_LAYOUT` registries to the shared
cycle loader/preparer. All eight frames must load before a view becomes available; one failed
frame disables that view without disabling side walk/run or the other view. Existing callers
without `vx`/`vy` retain their side-only behavior. Cats supply actual ground displacement per
frame: enter a depth view above 40°, return to side below 30° (35° ±5° hysteresis), down-screen
is front, up-screen is back. Pure vertical travel preserves the most recent horizontal facing.
Both view and facing commit on walk frames 1/5 or run frame 1, preserving distance-derived phase.
Directional run/trot uses the walk art at the movement's higher distance rate.

`petGait` now supplies a two-axis planting offset for vector callers. Cats apply that vector
once, without the former second horizontal image-anchor offset. Drawn directional frames are
walk-family poses; side turn sheets no longer interrupt a moving directional cycle. Resting
poses and their transitions remain the existing art. Transparent art padding is excluded from
body height, baseline, hit bounds, bench clearance and head position. The contact shadow uses
the standing walk reference width across all walking views; depth scaling is unchanged.

The first enlarged captures exposed inter-frame paw drift in the generated sheets. Added
`art-src/cycles/plant-directions.py`, extending the existing side-sheet planting method to
2D stance chains, with soft leg corrections and rigid original paw patches. Tuned directional
stride to 0.5 walking heights. Preserved original torso centroids and vertical padding in
`directions-layout.json` (mirrored in the runtime registry). Detached edge speckles are removed.
`directions-plant-qa.json` records input paw landmarks, offsets, stance chains and canonical
45-degree registration residuals. These measure the registered landmarks, not a claim of
zero pixel error for every possible heading or depth change.

Reproduce the installed art with `python3 art-src/cycles/cut-directions.py` followed by
`python3 art-src/cycles/plant-directions.py`. If regenerating masters, copy the resulting
`directions-layout.json` values into `LW.PET_DIRECTION_LAYOUT`; a regression test enforces parity.

Replaced the old side-art depth suppression/meander with ground-plane distance paths. About
35% of floor wander candidates make a depth approach; bowls/toys can be approached directly.
The existing floor bounds, clear-spot checks, ledge baselines, acceleration and arrival easing
remain in use. Virtual-only `__cats.forceWalk(id,x,y,{from:[x,y],gait,turn:{after,to:[x,y]}})`
provides a deterministic isolated walk and optional mid-walk retarget for WebKit capture.

Validation so far: `node --test tests/*.cjs` passes **43/43**. New tests cover missing-frame
atomicity, hysteresis, contact-only changes, vertical/left movement, phase continuity, run
fallback, vector planting, geometry/metadata parity and all 80 installed PNGs. Full day/night
WebKit matrix and visual findings follow below.

### Final WebKit motion verification

Ran `python3 shots/cats-dirs/verify.py` through the existing `./tools/wkshot`, using
`WKSHOT_FRAMES`: five coats × lateral/front/back/mid-walk turn × noon/midnight = 40 sequences,
16 captured frames each. `verify-extra.py` adds 12-frame night sequences for pure vertical
travel, mirrored-left travel and directional run fallback. All **676 captured frames** have
empty browser error lists; all five coats load both complete directional sets. Reports and
contact sheets are retained alongside `summary.json`; temporary full-size frame PNGs were
removed after composing the contact sheets.

Opened and inspected every final contact sheet and the 80-frame art overview. Front walks
show chest/near-far leg foreshortening, back walks show rump/back/tail, and neither uses the
side silhouette on a diagonal. Turn sequences retain body height and ground baseline as the
body changes view; apparent body length shortens with foreshortening. Night coats remain
readable, markings remain recognizable across frames, and the final paw registration removes
the conspicuous sliding seen in the first generated cuts. No obvious height/scale pops in the
inspected sequences. The landmark-error qualification above still applies outside the sampled
headings. Running deliberately reuses the eight-frame directional walk at the faster distance
rate rather than claiming a newly authored run cycle.

An additional 60-second natural-scene self-test covered 1,800 update frames: zero identity
errors, zero teleports, maximum step 2.6. The noon sample mostly rested, so depth-motion evidence
comes from the forced-walk matrix rather than that natural sample. `natural-overview.jpg` and
`natural.log` retain that check. `node --test tests/*.cjs`: **43 passed, 0 failed** (`tests.log`).
No wallpaper-app rebuild, replacement, relaunch, release or push was performed.


## 2026-10-03 — Santorini Cats jumps from every view (Codex)

Owner request: front/back jumps as well as left/right side jumps, matching the directional
walks; fix the floating paw shadow; verify every coat/view/mirror in day and night without
touching the installed app.

Generated ten new five-frame jump strips with the built-in imagegen tool. Each call used
that coat's `cat-<coat>-jump-reference.jpg` montage: existing side jump plus the newly authored
front/back walk sheets. Exact prompts and generation provenance are in
`art-src/cycles/jumps-prompts.json`. Prompt: same markings, palette, fine outline, soft shading,
head/body proportions; fixed three-quarter FRONT toward viewer/screen-right or BACK away/
screen-right; one evenly spaced row of five poses (crouch, hind-leg push-off, airborne stretch,
foreleg reach, soft landing); constant anatomical scale; complete paws/tails; flat #e6e6e6;
no text, shadows or props. Original outputs are retained as
`art-src/cycles/cat-<coat>-jump-{f,b}-original.png`; source sheets without the original suffix
are prepared masters with five evenly spaced cells on an exact #e6e6e6 backdrop. The generator
returned a mix of opaque grey and transparent sheets; the original outputs remain unmodified.

`python3 art-src/cycles/cut-jumps.py` reproduces the fifty runtime cutouts under
`scenes/art/sprites/cats/<coat>/t/jump-{f,b}-1..5.png`. It uses original alpha where available,
the existing flood-connected grey keyer otherwise, drops detached speckles and registers all
five frames to a common paw baseline. A single scale per strip puts the compressed landing
stance at 88% of its matching walk height; no per-frame rescaling. Per-frame torso anchors
and common scale/padding are in `jumps-layout.json`, mirrored in `LW.PET_JUMP_LAYOUT` and
checked by regression test. `shots/cats-jumps/art-contact.jpg` compares every cut with its
matching walking view. All ten generated strips and all fifty cuts were visually inspected.

Jump view uses the same `LW.petDirection` classifier as walking, sampled at takeoff and
locked through flight and landing. Ground depth comes from supporting ledge bases, excluding
ledge elevation, so a lateral hop upwards does not accidentally become a rear-facing jump.
Horizontal sign controls mirroring; pure-depth jumps retain the last horizontal facing. A
view becomes available only after all five frames load; incomplete views use the side jump.
Landing resets distance-gait phase and planting offsets to contact frame 1 while retaining
view/facing. Both surface jumps and the toy-stalk pounce path call the same preparation.
The ordinary ledge approach now starts 65 ground units in front with 20–45 lateral units,
so rear-facing bench/wall hops occur naturally; existing wall descent candidates include
front-facing jumps.

Contact shadows measure the lowest opaque paw band, excluding transparent padding, and
apply the same anchor, mirroring, transform and two-axis planting displacement as the cat.
Initial motion review exposed a shadow changing shape as airborne paws tucked/reached:
flight now interpolates takeoff/landing footprints beneath the body instead. Height controls
shrink and opacity. Grounded walking/landing retain the measured paw contact.

Concurrent owner-side work advanced this checkout through `ddaf733` and `2cc85c2` during this
pass (steeper walk paths, 16°/10° view thresholds, single-silhouette pose transitions). Those
changes were preserved. The threshold/pose tests from the follow-up `0b0d677` commit were preserved; jumps continue to share the walking classifier rather than duplicating
thresholds. No edits were made to `../livewall-quality`.

Verification used the real `./tools/wkshot` with `WKSHOT_FRAMES`: 60 sequences (five coats ×
side/front/back × left/right × noon/midnight), sixteen samples each from crouch through
landing and subsequent walk. Every matrix frame was visually reviewed in the paired
`review-<coat>-<day|night>-{0,1}.jpg` sheets. Front/back markings and scale remain consistent
with the walks; landing retains view/facing, reaches the ground, and restarts on walk contact
frame 1. The opaque paw band stays seated on its shadow in the reviewed front/back walk
frames. Air shadows remain under the moving body and fade/shrink with height. Night cutout
edges have no conspicuous grey fringe; all five coats remain readable.

Nine additional sequences cover actual `jumpDown` wall descents, `goLedge` bench ascents,
and toy-stalk pounces in both lighting states, plus a deliberately missing rear-jump frame,
a pure-depth jump, and a mirrored terrace at night. The failed image disables the whole rear
set and correctly uses side frames. The real toy path now shows its directional crouch
before pushing off. Surface depth classification is front on descent and back on ascent.

All **69 sequences / 1,104 frames** completed with **zero browser errors**. The audit checks
all five jump poses, matching first walking contact, the common cutout baseline, storage,
and absence of raw capture PNGs. Initial captures used a 1600×1000 viewport; concurrent
screenshot load caused WebKit's 60-second harness timeout on some cases. Those incomplete
cases were retried serially at 1200×750 (identical 1600×1000 logical layout). Both sizes are
downscaled into JPEG contact sheets. No incomplete sequence is counted. Evidence and
reproduction scripts: `shots/cats-jumps/README.md`; machine results: `summary.json`.

`node --test tests/*.cjs`: **48 passed, 0 failed** (`shots/cats-jumps/tests.log`). New regressions
cover shared direction/hysteresis, mirroring, fallback, landing contact reset, fifty assets
and geometry parity, planted shadow transforms, and stable airborne footprints. Re-cutting
from the originals reproduced all fifty runtime assets byte for byte. `git diff --check`
passed. Final evidence is approximately **36 MiB**, with raw PNG captures deleted. `df -h /`
was checked throughout; free storage stayed above the 3 GiB stop threshold (about 11 GiB
at final audit). No app rebuild, installation, relaunch, push, or release was performed.

## 2026-10-04 — shared companions, directional dog art

Owner decision: one common roster and one shared engine across all eight pet scenes.
Added golden/corgi front/back eight-frame walks and five-frame jumps (52 cuts total),
referenced on their existing side art. Side jump sheets already existed. Masters and
reproduction pipeline: `art-src/pets-shared/`; generation brief: `PROMPTS.md` there.
Visual art review: `shots/pets-shared/dog-art.jpg`. Corrected the golden second-frame
paw detector and widened its leg warp to eliminate torn fur. The selected planted
landmark residuals are below 1 source pixel; runtime verification follows separately.
Pandas retain their existing side sheets and will use lateral-only routes.

### Shared runtime (integration in progress)

`scenes/pets.js` now owns roster loading, pose sequencing, distance gait, drawn-heading
routes, floor/perch graph trips, jump registration, contact shadows, lighting, behavioral
choices, and cross-species full-body reservations. Jump flight paths reserve their swept
volume. Pose changes draw one opaque silhouette. Touch Grass consumes the same frame
geometry through its GPU adapter; side-only pandas cannot change walking depth.

The takeoff scale comes from the current supporting surface before the first crouch;
it no longer inherits a stale pose scale. Tests now exercise the shared module instead
of extracting private functions from Cats. Added common-roster, heading, panda-lane,
cross-species clearance, takeoff-scale, shadow, and exit/re-entry regressions.
`node --test tests/*.cjs`: 54 passing at this step. Scene/control/visual acceptance is
tracked separately and remains in progress until the full matrix is signed off below.

### All eight scene integrations and visual acceptance

Cats, Café, Records, Ramen, Rooftop, Speakeasy, Cabin and Grass now use `scenes/pets.js`.
Removed their separate pet loaders, navigation, pose and drawing implementations;
Grass retains a thin GPU adapter which consumes the same tinted frames and contact
shadows. Scenes declare floor unions, depth scale, perches/jump links, activity spots,
homes/exits, prop occluders and lighting. The seven-member roster is immutable; pandas
remain private to Grass, using lateral-only routes because no depth sheets were added.
The host's existing scene selection/Pets settings are unchanged; no Swift files changed.

Visual fixes during the WKWebView review:
- Registered the dog's selected planted paws without the golden frame-2 torn-leg warp.
- Kept the first jump crouch at the current supporting scale and cut directly into its
  registered sheet. Landing and crouch now retain destination/source depth respectively;
  resetting the landing timer must not put a foreground cat behind Santorini's bowl.
- Added foreground plate masks for the café cup/candle/counter, record crates/stand legs,
  and ramen vending cabinet/stools. Restricted floor routes around furniture footprints.
- Shared full-body clearance and swept jump reservations prevent cat-on-dog stacking.
  Pets wait at narrow encounters; the broad-floor swap test requires actual completion.
- Completed the rooftop's accessible front floor and covered chair/crate resting spots.
  Exit queues yield lateral space to their leader so angled aisle turns cannot deadlock.
- Preserved panda walking lanes for water/cursor interactions, and cached their shared
  frame between the grass-depth and sprite render passes. Static foreground masks are
  cached per room-paint revision; tiny props no longer re-clip a full room each frame.

Reproduction is documented in `tools/pets-shared/README.md`. The evidence directory is
`shots/pets-shared/`: noon/midnight sequences for every scene, close-up motion sheets,
exact calico takeoff/landing, ultrawide left-widget compositions, toggle/reminder/rain
reports, and before/after frame-time samples. Raw capture PNGs are deleted after JPEG
conversion. Tests cover headings, full-body crossing, shadow registration, jump scale
and depth, prop sorting, lateral pandas and graceful exit/re-entry including a narrow
queue. Acceptance totals and measured timings are recorded in the evidence README.

Final local acceptance: **60/60 Node tests pass**; **506 sequence frames** retained as
downscaled JPEG grids/close-ups and visually inspected; all eight seeded control runs
pass with no reported JS errors or pet overlaps. Evidence is **30.2 MiB**, no raw PNGs;
final free disk space was about **20 GiB**. Median frame-time comparisons showed no
regression in any scene (Cats 0.889→0.844 ms, Café 1.322→0.456, Records 1.378→1.144,
Ramen 2.722→1.411, Rooftop 2.733→2.089, Speakeasy 4.844→4.100, Cabin 2.311→2.256,
Grass 4.578→4.289). These are serial isolated-WKWebView batch measurements; small
differences are within normal timing noise, not a claim about installed-app FPS. The
earlier café mask regression was corrected by baking/caching masks, then remeasured.
No push, release, app rebuild/install/relaunch, host Swift edit or sibling-tree edit.

## 2026-10-04 — Travel-aligned pet gaze

Replaced 315 walk/run/jump frames across orange, black, grey, calico, Siamese,
golden and corgi. Lateral heads use true profile and forward gaze; diagonal heads
follow their body and landing direction. Idle artwork remains unchanged. Built-in
ImageGen masters, all exact prompts (including rejected iterations), and provenance
are in `art-src/gaze-fix/`. The prompt contract requires one visible side eye, forward
nose/ears, no camera gaze during motion, preserved coat/style and 8/6/5 frame counts.

`install.py` cuts, plants and updates shared geometry. Visual review caught clipped
rear-jump apex ears and incorrect dog paw identification; corrected row boundaries,
diagonal landmark splits and gallop/alternating contact chains before acceptance.
Selected stance contact residuals are below 1e-6 source pixels; this is a landmark
registration measurement, not an optical-flow guarantee for every painted paw pixel.

LOOKED at all seven old/new JPEG comparisons plus 112 isolated WebKit snapshots in
Santorini Cats and Speakeasy at noon/midnight: lateral/front/back walks, lateral run,
and all three jump angles. Final reports have no JS errors or pet overlaps. Evidence
and reproduction are in `shots/gaze-fix/README.md` and `tools/gaze-fix/`. All 61 Node
tests pass, including geometry/contact registry checks. Raw generation/capture PNGs
were removed after lossless WebP/JPEG preservation; approximately 16 GiB remains.
No app rebuild/install/relaunch, push, release or sibling-tree change. The missing
angles and FOLLOW addendum are subsequent logical steps.

## 2026-10-04 — Missing pet angles and chase art

Added 524 drawn frames: five cats each receive front/back runs (6 each), creeping
side/front/back walks (6 each), hunt/wiggle and pounce in all three views (5 each),
front sit/perk (5), side↔front and side↔back turns (5 each), loaf-to-stretch (5).
Both dogs receive the directional runs, bow/bounce, perk, turns and rest/stretch
equivalents (62 each). Grey/calico/Siamese also gain six standalone idle endpoints.
Existing orange/black idle endpoints are preserved.

All exact ImageGen prompts/provenance and 21 lossless masters are in
`art-src/follow/`; `install.py` locates whole connected figures before cutting row
bounds, registers the new gait contacts, and emits fixed-scale action metadata.
Prompt constraints: match existing painted coat, invariant anatomical scale, exact
counts, profile one-eye forward gaze, front gaze along diagonal, rear never lookback;
only picked-me sit faces viewer. Rejected colored backgrounds were regenerated on
flat light grey before cutting. Dog stalking rows are unused (dogs trot, bow, bounce).

LOOKED at all seven `shots/follow/*-art.jpg` cut/plant contact sheets. The metadata
checks cover complete sequences, runtime/source geometry and subpixel registered
stance contacts (same landmark limitation as gaze fix). Runtime loaders now expose
these assets; FOLLOW behavior and scripted scene verification follow separately.
Raw generated PNGs removed after lossless master preservation; no installed app changes.

## 2026-10-04 — Play mode overlay (play-mode worktree)

Shared Play shell over cats, koi and train, light/dark: green-ink glass panel, clear-area placement, keyboard-accessible original daily word/crossword cards and permission-aware news. Added shared CSS-screen pet occluders with canvas/mirror coordinate conversion; pets avoid new paths through the panel and existing overlap is clipped. No new scene artwork, actors, sprite assets or image-generation prompts. Headless JPEG evidence: `shots/play/{cats,koi,train}-{light,dark}-{scenes,panels}.jpg`, final crossword sheets, `edge-cases.jpg`, `interactions.jpg`. Mirrored, ultrawide, small viewport and paused/Reduce Motion cases checked. Native visible transitions remain on the owner checklist to respect the prohibition on touching the live screen. Full results and reproduction: `docs/play-verification.md`.
## 2026-10-04 — audit-fixes: shared night sky
- Cause: horizon camera placement projected the risen moon above the viewport; pinned previews used inconsistent hard-coded phases (Kit .38, moon texture .5). Low zenith values made a dark slab after grading; independent star twinkle already existed and is preserved.
- Shared fix: blue-silver night palette with phase-sensitive exposure and horizon glow; fit the moon into fully exposed sky samples while retaining live astronomical rise/set visibility. Both Kit and moon.js use SunCalc's current-date phase without a location. Propagated with the copy-only `zsh addons/build.sh`; no app build.
- Looked at audit source sheets (read-only), baseline `shots/audit-fix/before/<id>.jpg`, and `shots/audit-fix/night/<id>.jpg` for all seven horizon add-ons. Night display luminance .187–.245, above G1 .12. Airport additionally inspected mirrored and 3440x1440. Existing cloud dashes remain for the separate cloud fix.
- Verification tooling: `python3 tools/audit-server.py` (:5214, this worktree only), `python3 tools/audit-addons.py <stage> [ids...] [--cases day,night,rain,left,wide]`; three frames/case, disk guard at 3 GiB, JPEG sheets, deletes raw PNGs. Unit tests include night gradients across weather/phases and real-phase fallback.
- Three scene baselines are blocked by missing tracked-reference art: beach/art/crab.webp, butterfly-garden/art/garden.webp, sky-kites/art/{diamond,delta,cloud}.webp. Permission to recover just these assets read-only from the other worktree was requested; no access made. Full ten-scene acceptance stays pending. No image generation or prompts.

## 2026-10-04 — audit-fixes: rain scanline banding
- Cause isolated to Kit.plate wet sheen, not the falling particles: `noise(px * vec2(.008,.16))` produced a horizontal band roughly every 6 CSS pixels. Butterfly Garden also uses Kit.plate; its missing garden.webp currently blocks a fresh render.
- Replaced that anisotropic pixel-scale noise with broad aspect-correct, domain-warped wet patches. Existing exposed/water/sky masks remain in force.
- Opened `shots/audit-fix/rain-sheen/hillside-valley.jpg` and compared baseline plus `wet-isolate-f00.jpg` (wet pass disabled, falling rain retained): stripes removed, rain retained. No art prompts. 62 Node tests pass. Full garden acceptance pending asset recovery.

## 2026-10-04 — audit-fixes: rain changes the light
- Cause: sky `cover` overrides bypassed weather (including sky-kites' -1); the solar disk/key stayed active under overcast; the fallback overcast plate merely darkened baked sunlight.
- Kit now eases an overcast/direct-light pair with its existing lighting transition. Rain overrides clear cover, neutralizes the blue sky, suppresses solar disk/glare, cast sprite/foliage and dappled shadows, softens final contrast, and compresses fallback plate highlights/shadows. Clear restores all of these smoothly; wet ground dries separately as before. Authored overcast plates remain preferred; grading cannot repaint baked shadow geometry in scenes without an overcast master.
- Inspected `shots/audit-fix/rain-light/{airport,harbour,hillside-valley}.jpg` day/rain and `shots/audit-fix/transitions/airport.jpg` at +0/+6/+30 s on rain start and stop. Discarded early transition captures that changed weather before the first virtual frame; corrected harness settles the scene first. 63 Node tests pass.
- Isolated sky-kites sky settings (same shared sky/grade, no missing actor art) show night luma .205: `shots/audit-fix/sky-fixture-night-f00.jpg` through f02. This is diagnostic evidence, not full-scene acceptance. Full sky-kites render still awaits missing fabric/cloud assets. No image generation.

## 2026-10-04 — audit-fixes: per-scene natural cloud fields + final review
- Cause: every sky sampled the same unseeded noise field; the unbounded `h/tan(elevation)` projection compressed cloud detail into horizon dashes. Sky-kites repeated one still cloud cutout three times.
- Shared fix: stable scene-id hash, bounded depth projection, broader irregular cloud density with derivative-aware edges, softer high haze and moonlit cloud exposure. Mirroring recomposes the field without tiled landmarks. Sky-kites now uses the shared sky instead of translating identical still cutouts. The template preset consumes `config.id`; the generator writes it and the three existing JSON configs now include it. `addons/build.sh` also syncs the data-driven preset runtime.
- LOOKED at every final sequence: `shots/audit-fix/after/<id>.jpg` (day/night/rain, +0/+3/+6 s after 4 s settling) and `shots/audit-fix/layout/<id>.jpg` (night left + 3440x1440 left) for airport, harbour, hillside-valley, iceland, kyoto, marine-drive, taj-mahal. Harbour/Iceland/Kyoto now have distinct formations. No repeated horizon dashes, no wet-ground scanlines, skies neutral in rain, one visible moon with independent stars at night. No new art assets/prompts.
- 63 accepted baseline frames, 63 final frames, 42 layout frames, plus diagnostic/night/transition runs; all seven scenes load with zero reported JS errors. Final night display luma .188–.245; including wide/left .187–.245, all above G1 .12. Raw PNGs deleted; JPEGs/logs/results retained. Disk stayed around 15–16 GiB free (3 GiB guard). All 64 `node --test tests/*.cjs` tests pass; shared kit/moon/preset copies match their sources byte-for-byte.
- Acceptance LIMIT: beach, butterfly-garden and sky-kites still cannot boot in this worktree because referenced art is absent. Pending permission to recover beach/art/crab.webp, butterfly-garden/art/garden.webp, and sky-kites/art/{diamond,delta}.webp; cloud.webp is also needed only to reproduce sky-kites' original baseline. The original audit sheets were inspected read-only. The isolated sky fixture is NOT a substitute for these three full scene sequences. Full ten-scene signoff remains open. Existing actor/cast, exposure-mask and performance audit gaps are outside this shared-fix pass; fallback grading reduces but cannot repaint baked shadow geometry.
- Local commits only. No pets, cats, rooftop, host code, installed/running app, other-worktree writes, releases or pushes.
## 2026-10-04 — Shared pet FOLLOW mode

Tap toggles independent picks. The drawn turn/perk/front sit precedes following;
a tiny gated purr uses the FX bus and the contact shadow is subtly lighter. Eight
scene adapters supply world-space pointer coordinates and preserve mirror/ultrawide
transforms. Released pets rest briefly and resume their existing routines.

Cursor targets project onto floor polygons with prop/widget exclusions. Followers
reserve separate arc slots roughly a body length away, walk/run by distance and
cursor speed, and travel only lateral or drawn 3/4 headings (steep trips zigzag).
Drawn angle turns stop translation; surface changes use declared jump links. Cats
stalk with their drawn creeping gait, wiggle for 0.6–1.1 seconds, then use a locked
pounce target and a three-second cooldown. Dogs trot, play-bow and bounce. Only one
follower claims a pounce at a time; moving prey cancels an unlaunched hunt. Slow
continuous pointer movement is distinguished from an actual rest. Leaving waits
without dropping picks; pause/reset clears them, and an in-flight release finishes
its already committed landing without restoring selection.

Verification: **75/75 Node tests pass**, covering pick toggles, stationary perk,
multiple reservations/no overlap, drawn travel headings, all three exact pounce
landings, dog bow/bounce, fast/slow pointer behavior, leave/resume/pause/reset,
full-body prop/widget projection, declared ledge links, release during flight,
leave during a pending turn and FX muting/routing.

LOOKED at 320 pointer-driven WKWebView snapshots in Santorini Cats and Speakeasy
(day/night), 120 additional new-angle run/pounce/bounce snapshots, and 48 mirrored
ultrawide input snapshots across all eight scenes. All four interaction runs show
twelve total targeted landings with **0 scene-pixel endpoint error**, no reported
JS errors or overlaps, two picks, release and pause clearing. One 79-frame run hit
wkshot's 60-second timeout and was rerun successfully to all 80 frames. The Grass
fixture needed one render after QA placement to refresh its hit regions; its
actual input check then passed. Pandas retain their existing lateral-only art.

Evidence: `shots/follow/README.md`, `shots/follow/acceptance.json`, and
`shots/follow-angles/`. Reproduction: `tools/follow/README.md`. Combined with the
gaze-fix matrix, this task retains **600 verified scene snapshots** as downscaled
JPEGs. All raw capture/generation PNGs removed; source runtime PNGs retained.
Approximately 14 GiB free at acceptance. Prompts remain in `art-src/gaze-fix/` and
`art-src/follow/`. No push, release, app build/install/relaunch or sibling-tree edit.


## 2026-10-04 — Release 0.13.5 bundled art compression

Converted 1,196 PNG assets (all 1,080 pet frames included) to quality-gated WebP.
Total art: 178.81 → 67.29 MB; du: 177,080 → 68,152 KiB. Minimum PSNR 40.00593 dB,
maximum alpha error zero; unchanged dimensions and native WebKit alpha prove
unchanged registration/contact measurements. Retained 18 pixel-sensitive PNGs.
No art generation, geometry change or image prompts. Updated every runtime loader,
sprite format documentation, active generator references and PNG-header tests.
Removed absent optional-art requests; fixed two existing Café jukebox compatibility
errors discovered while checking its lazy-loaded paintings.

Inspected all 38 before/38 after day/night captures (16 built-ins, four train skins),
ten pet identities on light/dark mattes, weakest-PSNR crops, follow and Play sheets.
No visible degradation. Native 1,196-file comparisons pass before/after install;
96 Node tests pass, eight follow smokes pass on this worktree's 5217 server, six Play
smokes and two jukebox captures pass with zero errors/failed images. Plain local
`./build.sh` succeeds: app 72.40 MB (du 73,280 KiB); installed app untouched.
JPEG evidence: `shots/webp/README.md` and `shots/play/`; raw captures deleted.
Full sizes, retained-PNG rationale, test outputs and reproduction: `docs/webp-0.13.5.md`.
No push, release, notarization, installed-app change, or other-worktree edits.

## 2026-10-04 — Speakeasy: art-deco robot jazz trio (speakeasy-robots worktree)

Owner: "I like piano playing with music, but can we actually show some sort of futuristic robots operating
instruments for each song?" → chose an ART-DECO ROBOT JAZZ TRIO (brass/chrome 1920s-futurist automata on piano,
upright bass and drums; lineup shifts per song).

**Design.** Four original robots: a slender black-lacquer pianist with a stepped gold fin crest (seen from behind at the
upright, its head turning to a profile toward the band), a stocky copper drummer behind the painted kit, a lanky chrome
bassist behind the painted double bass, and a chrome-and-ivory guest singer who rises through a brass-ringed stage lift
for ~38% of songs (hash of the track). Each is a cut-out rig of rigid painted parts (head, torso, seat/legs, upper arm,
forearm, hand/stick) articulated per frame by FK + two-bone IK with damped springs (slight overshoot) — polish-brief §12
compliant (jointed rigid parts, nothing slid along a path). Robots stand BEHIND the painted kit/bass/mic: those are
redrawn from the baked room through `art/speakeasy/robots/occluder.png`; arms/hands/sticks draw in front. Parts are
tinted once per bake with a warm stage key (top lit, feet in shadow), eyes/visors glow softly.

**Music → motion** (music.js / `LW.mx`, newly loaded by the scene): every stroke is scheduled on the beat clock — hands
rebound, hover, travel to the next drum and land exactly on the hit. Drummer: jazz ride ("ding ding-a ding", swing from the
track hash) + snare backbeat in grooves; brushes (slow circles) in intros/breakdowns/quiet; snare 8ths→16ths and a ride
swell through builds; a crash on the drop; hi-hat closes on 2&4; kicks thump the bass-drum head; cymbals ring on springs.
Pianist: left hand on the chord root (fifths/octaves), right hand comps the chord (Charleston rhythm; runs in the treble on
busy bars); the actual keys under the hands go down (and the sustain pedal), the old self-playing roll stops. Bassist:
walking quarter notes — fretting hand slides along the neck by the note, plucking hand pulls across the strings, which
ring and blur. Heads nod with the tempo. Song start: heads turn to the drummer and the sticks click a 4-beat count-in
(also on a track change); stop/calm: a final crash, choke and slow settle; idle: breathing, glances, an occasional stick
twirl. Taps: drummer twirl/crash, pianist glissando (keys go down under the hand), bassist slap. Without the robot art
(`?noart=1`) the previous self-playing piano plays.

**Sources/licences.** No suitable CC0/PD/CC-BY figures (searched; only flat clip-art) → original Magnific generations
(commercial use allowed for the account). Prompts, masters, cut figures and the parts builder: `art-src/speakeasy/robots/`.

**Spend (Magnific, `simulate_cost` before each):**
| tool | purpose | credits |
| --- | --- | --- |
| images_generate (Nano Banana Pro 2k, 21:9, style ref = stage crop) | concept lineup: 4 robots, front A-pose, grey card | 75 |
| images_generate (Nano Banana Pro 2k, 16:9, refs = pianist crop + stage) | pianist rear view on stool + head profile | 75 |
| **total** | (budget 800) | **150** |

**Pets.** Pet code untouched. Pet STAGE geometry: the piano-lid ledge now starts at x 1050 (was 1032) so the cat stays
right of the seated pianist's crest; the lid nap spot (x 1084) is unchanged. 60 s pet self-test with music: 0 identity errors.

**Perf** (`tools/speakeasy-band/bench.py`, isolated WKWebView 1200×750, 7×90 frames, median, six runs, machine shared
with other agents): playing ≈3.3–3.6 ms (main ≈3.3–3.6), idle ≈3.0–3.3 ms (main ≈3.2–3.9). The band itself costs ≈0.2 ms;
it is paid for by filling the two light beams with a scrolling haze PATTERN instead of clip + tiled drawImage
(≈0.6 → ≈0.25 ms per beam). Canvas 2D only; part tints baked per light change; no per-frame image uploads.

**Verification (LOOKED at):** `shots/speakeasy-robots/` — night and day 22-frame scripted sequences (idle → count-in →
intro → build → drop → groove → breakdown → stop → idle → singer song → idle), full-room frames, drummer one-beat
close-up, quartet close-up, taps, `?side=left` and 3440×1440. Zero JS errors / failed images; 96 Node tests pass.
Reproduce: `python3 devserver.py <port>` then `python3 tools/speakeasy-band/sequence.py <port> night,day`.
Known gaps: see the backlog follow-ups (sax guest, pianist's hidden left hand, drummer shins, live Beat Sync check in-app).
