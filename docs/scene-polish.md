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
