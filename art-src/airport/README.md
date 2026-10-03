# Airport — art + layout (wallpap scene, not yet coded)

Control-tower view over an airfield, photoreal. Everything here was generated with Codex's built-in image tool
(`gen.sh`), then aligned / cut / measured with the scripts in `tools/`. Scene code is not written yet — this folder is
its input. **Coordinates for the code live in `layout.json` (normalised 0..1 of the plate).**

## Files

| file | size | what |
|---|---|---|
| `plate-day.png` | 2560x1600 | clear midday, plain gradient sky (no clouds/sun/moon) |
| `plate-dusk.png` | 2560x1600 | golden hour, warm low light from the left, long shadows |
| `plate-night.png` | 2560x1600 | dark field, terminal windows + apron floodlight pools lit; runway/taxiway surfaces dark & unlit (lights are rendered live) |
| `plate-overcast.png` | 2560x1600 | flat grey light, wet tarmac sheen (rain / fog) |
| `layout.json` | | runway, taxiways, exits, stands, flight paths, scale model, every light position, occluders, sprite metadata |
| `layout-check.png` | 2560x1600 | layout.json drawn over the day plate (QA). `raw/layout-check-night.png` = same on night |
| `occluders/*.png` | 2560x1600 L | alpha masks of plate features that must sit IN FRONT of sprites: `mast-A..E`, `jetbridge-1/2`, `terminal` |
| `preview.png` | 2000x2126 | contact sheet: 4 plate thumbs, a staged day scene built only from layout.json + sprites, all sprites |
| `raw/preview-day-full.png`, `raw/preview-dusk.png`, `raw/preview-night.png` | | same staging per lighting (naive sprite tints) |
| `sprites/*.png` | | 28 transparent cut-outs (table below) |
| `sheets/*.png` | | the generated sprite sheets (flat #e6e6e6 bg) the sprites were cut from |
| `raw/plate-*.png` | 1536x1024 | untouched Codex plates; `raw/aligned/` = dusk/night/overcast warped onto day geometry |
| `gen.sh` | | every generation prompt (`zsh gen.sh day dusk …`; skips files that exist) |
| `tools/align.py` | | warps a relit plate onto the day plate (tile phase-correlation → quadratic displacement field) |
| `tools/build_plates.py` | | raw → aligned → 16:10 crop → 2560x1600 |
| `tools/defringe.py` | | removes the grey halo Vision leaves in soft cut-out edges (run on all sprites) |
| `tools/make_layout.py` | | **source of truth** for layout.json, occluders and layout-check (measurements in raw px) |
| `tools/preview.py` | | builds preview.png — also a reference implementation of placement/scale/occlusion |

Total ≈ 71 MB (of which `raw/` 26 MB and `sheets/` 11 MB are source material and can be dropped from any shipped pack).

## Plates
* Codex caps at 1536x1024 (3:2). Plates = top 64 px of sky cropped (→ 16:10) and Lanczos-upscaled x1.667 + light unsharp. They are
  therefore a bit soft at 1:1 on a 5K screen — fine as a wallpaper backdrop, but don't expect native 2560 detail.
* 16:9: drop 160 px of SKY at the top (`ny_169 = (ny-0.1)/0.9`). Ultrawide: edges are plain sky gradient, far fields and grass —
  stretch/repeat the outer columns with a soft blur.
* Calm zone: x > 0.72 holds only grass, the runway/taxiway running out, far fields and sky. (The departure climb-out passes through it briefly.)
* Codex's relit edits re-framed the image (dusk shifted ~30 px, night ~50–60 px vertically). `tools/align.py` warps them back;
  residual < 0.3 raw px, verified with edge overlays and `raw/layout-check-night.png`. **One layout.json fits all four plates.**
* Night plate: masts, apron and terminal are lit in the plate; runway, taxiway, threshold, PAPI, approach and beacon lights are NOT
  baked — draw them from `layout.lights`.

## layout.json (all [nx, ny] in 0..1 of the plate; `_px2560` = pixels of the 2560-wide plate)
* **Scale** — `pxPerMetre_px2560(ny) = K * (ny - horizon_y)^P` with K=19.947, P=0.78, horizon_y=0.3552, evaluated at the
  aircraft's GROUND point. Sprite scale factor = `pxPerMetre / sprites[key].sprite_px_per_m`. A 40 m aircraft is
  ~58 px at the runway's left end, ~112 px at runway mid-left (nx .39), ~141 px (nx .59), ~199 px at the right edge;
  ~270 px on taxiway A mid; 290–470 px on the stands (S2→S6). The exponent is fitted, not physical: the painted plate's near
  field is "smaller" than a true pinhole, so P<1 keeps parked aircraft matched to their stand lines and jet bridges.
* **runway** — centreline / far & near edge polylines, threshold (left frame edge), touchdown (nx .22), rotate point, vacate point.
  Landing direction is **left → right**.
* **taxiways** — `A` (parallel taxiway, runs off the left edge), `exit_west`, `exit_east` (both painted angling back down-left,
  as generated), `apron_taxilane` (along the stand entry ends, also leaves frame left — networks join off-frame).
* **stands** S2–S6 — `nose` (stop-bar T), `entry` (lead-in T), heading, expected 40 m size. S6 is the near hero stand.
* **paths** — `approach` (enters from the far-left sky at nx<0, with `approach_ground_y` per point for scaling), `rollout`,
  `vacate_via_exit_east_then_west_on_A`, `lineup` (mostly off-frame left), `takeoff_roll`, `climb_out` (+ground_y), pushback note.
* **lights** — runway edge (30 m spacing, both edges), runway centreline (15 m), green threshold bar, approach light line + crossbar
  (all at nx<0 — the threshold is the frame edge, so they only show on ultrawide), PAPI (4, far side of touchdown), taxiway
  centreline green, apron floodlight lamps/bases/pool centres, red obstruction lights on mast tops, rotating beacon on the
  terminal roof (the tower is the camera so it has no visible beacon), terminal window glow rect.
* **occluders** — each with `base_y`. Draw sprites back-to-front by ground y; after each sprite, redraw the CURRENT plate through
  every occluder mask whose `base_y` is greater than the sprite's ground y (see `tools/preview.py stage()`). Masts D/E cross
  parked aircraft at S4–S6; jet-bridge heads sit beside the S3/S4 noses.
* **sprites** — size, real length, `sprite_px_per_m`, `anchor` (bottom-centre = wheel contact), facing.

## Sprites (soft daylight from upper-left, seen from slightly above, no liveries/text)

| file | px | sprite px/m |
|---|---|---|
| `sprites/a320-q-front-air.png` | 711x358 | 18.75 |
| `sprites/a320-q-front.png` | 1009x436 | 24.48 |
| `sprites/a320-q-rear-air.png` | 732x222 | 18.75 |
| `sprites/a320-q-rear.png` | 1005x356 | 23.683 |
| `sprites/a320-side-gear-up.png` | 702x172 | 18.75 |
| `sprites/a320-side.png` | 705x240 | 18.75 |
| `sprites/atr72-q-front-air.png` | 714x380 | 26.14 |
| `sprites/atr72-q-front.png` | 708x422 | 23.846 |
| `sprites/atr72-q-rear-air.png` | 726x248 | 26.14 |
| `sprites/atr72-q-rear.png` | 720x258 | 23.85 |
| `sprites/atr72-side-gear-up.png` | 714x186 | 26.14 |
| `sprites/atr72-side.png` | 711x230 | 26.14 |
| `sprites/b787-q-front-air.png` | 714x372 | 12.316 |
| `sprites/b787-q-front.png` | 732x442 | 11.616 |
| `sprites/b787-q-rear-air.png` | 711x234 | 12.316 |
| `sprites/b787-q-rear.png` | 726x274 | 11.57 |
| `sprites/b787-side-gear-up.png` | 708x164 | 12.316 |
| `sprites/b787-side.png` | 702x208 | 12.316 |
| `sprites/baggage-train-side.png` | 699x144 | 49.929 |
| `sprites/e175-q-front-air.png` | 708x368 | 22.05 |
| `sprites/e175-q-front.png` | 978x504 | 28.023 |
| `sprites/e175-q-rear-air.png` | 698x257 | 22.05 |
| `sprites/e175-q-rear.png` | 945x359 | 27.465 |
| `sprites/e175-side-gear-up.png` | 699x172 | 22.05 |
| `sprites/e175-side.png` | 699x230 | 22.05 |
| `sprites/follow-me-side.png` | 310x156 | 67.391 |
| `sprites/fuel-truck-side.png` | 681x230 | 68.1 |
| `sprites/tug-side.png` | 573x202 | 88.154 |

Which to use when (all base sprites face LEFT; **mirror horizontally for right-facing** — anchor x stays 0.5):
* `<type>-side` (gear down) — on the runway (landing roll / take-off roll, **mirrored**: traffic moves left→right), short final/flare
  (mirrored), parked on stands (unmirrored, nose at `stand.nose`, body toward `entry`), taxiing west on A (unmirrored).
* `<type>-side-gear-up` — climb-out after rotation (mirrored, rotate 5–10° nose-up), and far approach before gear-down.
* `<type>-q-front` / `<type>-q-rear` — **ground attitude** (wings level, wheels down): turning onto/off exits, taxiing toward / away
  from the camera, pushback (q-rear while being pushed toward `entry`), taxi-in on the apron taxilane.
* `<type>-q-front-air` / `<type>-q-rear-air` — banked, in flight: far-out approach (mirror q-front-air so the nose points
  lower-right toward the runway), a turning climb-out away from the field.
* Vehicles: `tug-side` at a stand nose (pushback), `fuel-truck-side` beside the wing, `baggage-train-side` on the apron
  service road, `follow-me-side` leading an arrival on the taxilane. Pure side views; mirror for right-facing.
* Real lengths used: a320 37.6 m, b787 57 m, atr72 27.2 m, e175 31.7 m, tug 6.5, baggage train 14, fuel truck 10, follow-me 4.6.
* Add a soft dark ellipse shadow under ground sprites (preview uses ~0.84 x sprite width, alpha ≈ 0.27, blurred); none when airborne.
* Lighting per plate: sprites are neutral daylight. Dusk wants a warm multiply (~1.05, .78, .55); night needs a dark cool multiply
  (~.22, .24, .32) **plus** floodlight boost on the apron and live nav/strobe/landing lights — the flat tint in
  `raw/preview-night.png` makes runway aircraft look too bright; overcast wants a slight desaturate + darken.

## QA notes — what was weak / fixed
* First q-front/q-rear sheets came out **banked / in flight** — fine for approach/climb, wrong for taxi/parking. Kept them as
  `*-air`, generated a second "ground attitude" sheet per type (reference = first sheet). All four came out level and consistent.
* Vision missed the **follow-me car** on the vehicle sheet and clipped the **e175 q-rear-air** wingtip — both re-cut from crops.
* Vision's soft edge carried a **light-grey halo** (visible on dark plates) → `tools/defringe.py` un-mixes the #e6e6e6 bg and
  tightens alpha. Edges are now clean on dark and green; very thin parts (props, antennas) stay a little soft.
* Vehicle sheet scale is not consistent between vehicles (tug drawn as big as the fuel truck) — irrelevant because each sprite is
  scaled by real length via `sprite_px_per_m`. Ground q-view sheets have their own scale, matched to the air views by width (±8%).
* Side views are near-pure profile (little top surface visible) — reads fine at runway distance.
* Plate geometry quirks (as generated, measured as-is): both high-speed exits angle back down-left, so a left→right arrival makes
  a slow ~150° turn onto `exit_east`; the right-hand threshold piano keys cover only the near half of the runway; the landing
  threshold sits on the left frame edge, so approach lights are off-frame.
* Nothing skipped. No text/logos found on any sprite (the ATR nose shows a tiny unreadable emblem-like panel mark).

## Exact prompts (expanded from gen.sh; each was piped to `codex exec -s workspace-write --skip-git-repo-check [-i ref] -` with
"Use your built-in image generation tool to make exactly this one image (largest landscape size available, ideally 16:10 /
1536x1024 or larger). Save the final PNG at exactly this absolute path: <out> . Do nothing else: do not write any code or other files." appended)

### plate-day.png

```
Wide landscape photograph taken from inside the glass cab at the top of an airport control tower, about 50 metres up, looking out over the airfield (the tower glass and frames are NOT visible — clean view). Camera tilted gently down. Composition, exactly:
- Top ~40% of the frame: open sky only, a perfectly plain smooth clear gradient (deeper blue at the top fading to pale hazy blue at the horizon). ABSOLUTELY NO clouds, no sun, no moon, no birds, no contrails.
- Horizon line at about 40% from the top, flat distant countryside / low tree line and faint far hills, very plain and even so it can be extended sideways.
- One long main runway crossing the frame from left to right in the middle distance (its centreline around 55-62% from the top), receding slightly toward the LEFT (left end a bit further away and narrower, right end nearer and wider). Grey asphalt with white runway markings: dashed white centreline, white edge lines, white threshold piano-key stripes and white touchdown-zone bars near the LEFT end (the landing end), aiming-point blocks. The runway extends off the left edge and runs out toward the right side.
- A parallel taxiway between the runway and the camera (closer, lower in frame), darker asphalt with a yellow centreline, connected to the runway by two or three angled rapid-exit taxiways and one perpendicular link, all with yellow centre lines.
- Foreground LEFT and lower-left: a concrete apron with 4 empty remote parking stands (yellow lead-in lines and stop bars, painted stand boxes), two jet bridges / airbridges retracted and empty, a few apron floodlight masts, and the edge of a modern glass-and-steel terminal building at the bottom-left corner.
- Foreground and right side: wide flat mown green grass between the paved areas.
- RIGHT ~30% of the frame: calm and empty — only flat green grass, the far end of the runway/taxiway thinning out, distant flat fields and the plain sky. No buildings, no parked aircraft, no masts, no bright objects there.
- Completely EMPTY airfield: NO aircraft, NO vehicles, NO people anywhere. No text, no logos, no letters, no numbers, no signage that can be read (runway designation numbers omitted).
Lighting: clear midday, high sun, crisp soft shadows, clean blue sky gradient. Photorealistic, shot like a real high-end aviation photograph / cinematic film still: natural colour, true-to-life materials, subtle atmospheric haze with distance, crisp detail, no illustration, no painterly look, no CGI-toy look.
```

### plate-dusk.png
_reference (-i): plate-day.png_

```
Edit the attached reference photograph. Preserve EVERY pixel of geometry exactly — same camera, same framing, same runway, taxiways, apron, terminal, grass, horizon, all in identical positions. Change ONLY the lighting and colour: golden hour, warm low sun from the LEFT (sun itself not visible in frame), long soft shadows falling toward the right, warm amber light raking across the grass and tarmac, sky a plain clean gradient from soft dusky blue at the top to warm peach/amber near the horizon. Still no clouds, no sun disc, no moon, no aircraft, no vehicles, no people, no text. Photorealistic, shot like a real high-end aviation photograph / cinematic film still: natural colour, true-to-life materials, subtle atmospheric haze with distance, crisp detail, no illustration, no painterly look, no CGI-toy look.
```

### plate-night.png
_reference (-i): plate-day.png_

```
Edit the attached reference photograph. Preserve EVERY pixel of geometry exactly — same camera, same framing, same runway, taxiways, apron, terminal, grass, horizon, all in identical positions. Change ONLY the lighting: clear night. Sky a plain deep navy gradient to slightly lighter blue-grey near the horizon, NO stars, NO moon, NO clouds. The field is dark. The terminal windows glow softly warm, the apron floodlight masts cast soft sodium/white pools of light on the apron and parking stands only. The runway and taxiways stay DARK and unlit: NO runway edge lights, NO centreline lights, NO approach lights, NO taxiway lights (those are added later). Faint distant town glow on the horizon at the far left only. Right side of frame stays dark and calm. No aircraft, no vehicles, no people, no text. Photorealistic, shot like a real high-end aviation photograph / cinematic film still: natural colour, true-to-life materials, subtle atmospheric haze with distance, crisp detail, no illustration, no painterly look, no CGI-toy look. Real long-exposure-free night photograph look, low noise.
```

### plate-overcast.png
_reference (-i): plate-day.png_

```
Edit the attached reference photograph. Preserve EVERY pixel of geometry exactly — same camera, same framing, same runway, taxiways, apron, terminal, grass, horizon, all in identical positions. Change ONLY the lighting and weather: flat overcast grey daylight just after rain, no shadows, the sky a plain smooth light-grey gradient (no distinct cloud shapes, no sun), slightly reduced contrast and a little more distance haze, the asphalt runway, taxiways and apron are WET with a soft sheen and faint reflections of the sky, grass a deeper damp green. No aircraft, no vehicles, no people, no text. Photorealistic, shot like a real high-end aviation photograph / cinematic film still: natural colour, true-to-life materials, subtle atmospheric haze with distance, crisp detail, no illustration, no painterly look, no CGI-toy look.
```

### sheet-a320.png

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Subject: a generic modern narrow-body twin-engine airliner (Airbus A320 type: single aisle, two underwing turbofans, low wing, conventional tail, small winglets). Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
Arrange 4 views of the SAME aircraft in a 2x2 grid:
 top-left: side profile, nose pointing LEFT, landing gear down (on the ground);
 top-right: side profile, nose pointing LEFT, landing gear retracted (in flight), slight nose-up attitude of about 5 degrees;
 bottom-left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, left side and front of the engines), gear down;
 bottom-right: three-quarter rear view, tail toward the viewer, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side), gear down.
```

### sheet-b787.png

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Subject: a generic large wide-body twin-engine airliner (Boeing 787 type: long wide fuselage, very large underwing turbofans with serrated nacelle edges, long flexible raked wings with no winglets, smooth tapered nose). Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
Arrange 4 views of the SAME aircraft in a 2x2 grid:
 top-left: side profile, nose pointing LEFT, landing gear down (on the ground);
 top-right: side profile, nose pointing LEFT, landing gear retracted (in flight), slight nose-up attitude of about 5 degrees;
 bottom-left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, left side and front of the engines), gear down;
 bottom-right: three-quarter rear view, tail toward the viewer, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side), gear down.
```

### sheet-atr72.png

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Subject: a generic regional twin turboprop airliner (ATR 72 type: high-mounted straight wing, two turboprop engines with six-blade propellers, T-tail, main gear in fuselage-side fairings). Propellers shown as a soft motion-blurred disc. Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
Arrange 4 views of the SAME aircraft in a 2x2 grid:
 top-left: side profile, nose pointing LEFT, landing gear down (on the ground);
 top-right: side profile, nose pointing LEFT, landing gear retracted (in flight), slight nose-up attitude of about 5 degrees;
 bottom-left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, left side and front of the engines), gear down;
 bottom-right: three-quarter rear view, tail toward the viewer, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side), gear down.
```

### sheet-e175.png

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Subject: a generic regional jet (Embraer E175 type: slim fuselage, low wing with winglets, two underwing turbofans, conventional tail, small and compact). Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
Arrange 4 views of the SAME aircraft in a 2x2 grid:
 top-left: side profile, nose pointing LEFT, landing gear down (on the ground);
 top-right: side profile, nose pointing LEFT, landing gear retracted (in flight), slight nose-up attitude of about 5 degrees;
 bottom-left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, left side and front of the engines), gear down;
 bottom-right: three-quarter rear view, tail toward the viewer, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side), gear down.
```

### sheet-ground.png

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Subjects: four airport ground-support vehicles, all in pure SIDE VIEW facing LEFT, seen from slightly above, all at the same real-world scale, arranged in a 2x2 grid:
 top-left: an aircraft pushback tug (low, wide, heavy yellow tractor with a small cab);
 top-right: a baggage tractor towing three covered baggage carts in a straight line (tractor at the left end, the whole train facing left);
 bottom-left: an airport fuel / refuelling tanker truck (white and grey);
 bottom-right: a yellow-and-black chequered 'follow-me' car (a compact car or pickup with a light bar on the roof, no writing).
All vehicles generic, no logos, no text.
```

### sheet-a320-ground.png
_reference (-i): sheet-a320.png_

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Draw the SAME aircraft as in the attached reference sheet (identical design, proportions and paint), but this time standing ON THE GROUND: wings perfectly level (no bank, no pitch), all landing-gear wheels down and level as if resting on flat tarmac (but draw no tarmac). Two views side by side, left and right halves of the image:
 left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, the left side of the fuselage and the fronts of the engines), seen from about 25 degrees above;
 right: three-quarter rear view, tail toward the viewer's lower-right, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side of the fuselage), seen from about 25 degrees above. Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
```

### sheet-b787-ground.png
_reference (-i): sheet-b787.png_

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Draw the SAME aircraft as in the attached reference sheet (identical design, proportions and paint), but this time standing ON THE GROUND: wings perfectly level (no bank, no pitch), all landing-gear wheels down and level as if resting on flat tarmac (but draw no tarmac). Two views side by side, left and right halves of the image:
 left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, the left side of the fuselage and the fronts of the engines), seen from about 25 degrees above;
 right: three-quarter rear view, tail toward the viewer's lower-right, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side of the fuselage), seen from about 25 degrees above. Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
```

### sheet-atr72-ground.png
_reference (-i): sheet-atr72.png_

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Draw the SAME aircraft as in the attached reference sheet (identical design, proportions and paint), but this time standing ON THE GROUND: wings perfectly level (no bank, no pitch), all landing-gear wheels down and level as if resting on flat tarmac (but draw no tarmac). Two views side by side, left and right halves of the image:
 left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, the left side of the fuselage and the fronts of the engines), seen from about 25 degrees above;
 right: three-quarter rear view, tail toward the viewer's lower-right, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side of the fuselage), seen from about 25 degrees above. Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
```

### sheet-e175-ground.png
_reference (-i): sheet-e175.png_

```
Sprite reference sheet for a game/wallpaper, photorealistic like a real aviation photograph (NOT a cartoon, NOT a toy, NOT a 3D-render look): real materials, subtle panel lines, realistic glass, real tyres. Plain flat uniform light-grey #e6e6e6 studio background everywhere, NO ground plane, NO cast shadow on the background, NO reflections, NO text, NO labels, NO numbers, NO logos, NO airline livery, NO registration letters. Lighting: soft daylight from the upper-left. Camera elevation: seen from slightly above, about 15-20 degrees looking down (as if from an airport control tower), so the top of the fuselage and the top of the wings are slightly visible. Every object completely inside its cell with generous empty grey space around it; objects must NOT touch or overlap each other or the image edges. All objects on this sheet at the SAME scale.
Draw the SAME aircraft as in the attached reference sheet (identical design, proportions and paint), but this time standing ON THE GROUND: wings perfectly level (no bank, no pitch), all landing-gear wheels down and level as if resting on flat tarmac (but draw no tarmac). Two views side by side, left and right halves of the image:
 left: three-quarter front view, nose pointing toward the viewer's lower-left (we see the nose, the left side of the fuselage and the fronts of the engines), seen from about 25 degrees above;
 right: three-quarter rear view, tail toward the viewer's lower-right, nose pointing away toward the upper-left (we see the tail, the rear of the engines and the left side of the fuselage), seen from about 25 degrees above. Plain generic white fuselage with light grey belly, at most a thin subtle navy cheatline stripe and a plain navy or grey vertical tail; no logos, no writing.
```

