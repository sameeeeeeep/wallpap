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
