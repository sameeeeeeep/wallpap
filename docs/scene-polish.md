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

