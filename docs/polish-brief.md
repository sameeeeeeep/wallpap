# Scene polish brief — 2026-10-03

User feedback this round: "a lot of basics are not solved", pets look pasted-in in room scenes, procedural things look
fake (Snowy Cabin + its fire, cars outside windows), music objects are inconsistent, scenes collide with the user's
widgets/icons. Read `docs/scene-brief.md`, the header of `scenes/lw.js`, `scenes/pet-motion.js` (shared pet code), and
`scenes/art/sprites/README.md` first.

## 1. Codex art over procedural fakes
Anything drawn procedurally that doesn't look good → make it with Codex image generation (painted/realistic, matching the
scene's existing art and lighting), as the train/rooftop plates were (see `docs/scene-polish.md` for prompt style; record
your prompts there). Generate:
`echo "<prompt>" | codex exec -s workspace-write --skip-git-repo-check [-i ref1.png,ref2.png] -`
(prompt on STDIN via the trailing `-`; `-i` is a comma-separated list; tell Codex the exact output path). For edits of an
existing plate pass it as `-i` and say "preserve all geometry". Cut transparent sprites from a flat #e6e6e6 background with
`python3 art-src/cycles/cut.py` (background-colour cutter — better than Vision for fur/dark areas; read it for usage) or
`swift tools/cutout.swift <img> <outdir> <prefix> strip`. Animated things (fire, steam, flicker) should be layered art +
subtle procedural motion (or a small flipbook) — never flat cartoon shapes.

## 2. Pets that belong (user chose: integrate + per-scene toggle)
- Motion gaze (owner 2026-10-04): every walk/run/jump/hunt/pounce head follows its travel heading. Lateral heads are true profile with one eye; diagonal heads align with body/path, jumps watch the landing spot, rear views never look back. Only stationary idle/picked-me poses may look at the viewer. Inspect every generated frame, then old/new JPEGs and day/night WebKit sequences; frame counts or tests alone cannot approve gaze.
- Lighting: tint each pet by the light at its position (warm lamp pools, cool window light, darkness) — not a flat sprite.
  Soft contact shadow under feet/body; rim light from strong sources when it helps.
- Scale relative to furniture must be believable; perches must make sense (rug, sofa, cushion, windowsill, shelf, counter).
  Occlude correctly behind furniture edges in front of them.
- Never rest in the area the user's widgets occupy (see §4).
- Toggle: `LW.settings.pets === false` → pets leave gracefully (walk off-screen / curl up out of view) and stay away;
  `true`/undefined → they come back. React to `LW.on('settings')`. The host already shows a "Pets: On/Off" control.
- Walking uses the shared gait cycles (`LW.petGait`, already wired). Keep transitions/cycles working.

## 3. Music — one source per scene (user approved)
Three kinds: ① PLAYERS show the track (artwork/title) on ONE hero object; click = play/pause (`LW.post({type:'media',cmd})`),
another click target = next. Other music-ish objects are decor or DISPLAYS that mirror the same track (never a second
player). ② BEAT-SYNC ONLY: no track UI; the world moves with `LW.music` + `'beat'`. ③ Visualizers (Cymatics).
Per scene: Records = turntable ① · Cabin = turntable ① · Corner Café = skins (`LW.settings.player`): 'record' turntable
(default) | 'jukebox' ① · Ramen Alley = radio ① · Rooftop = radio is the source ①, the projector is a DISPLAY showing the
artwork big (+ title small) · Speakeasy = ② BEAT-SYNC ONLY: a self-playing upright piano whose keys/hammers move with the
music + stage lights and footlights pulsing gently; remove any now-playing text/artwork UI there (the jukebox/gramophone
can stay as decor or go). Subtle, never strobe. Paused → calm.

## 4. Desktop layout awareness (new)
The host now sends `__lw('layout', {side:'right'|'left'|'off', clear:[x0,x1], avoid:[[x,y,w,h]…]})` (0..1 of the
display), available as `LW.layout` + `LW.on('layout', l => …)`. Default (and browser) = `{side:'right', clear:[0,0.72]}`;
test other sides with `?side=left` / `?side=off`. Place hero objects, music players, pets' resting spots and any text
inside `clear`; keep `avoid` boxes calm. For `side:'left'`, re-compose (move hero objects right) rather than leaving the
left cluttered. Re-layout on the event without reloading.

## Verify (each agent)
Dev server: http://127.0.0.1:5210/<scene>.html (serves scenes/). Claude Browser tools in your OWN tab (tabs_create; pass
tabId everywhere), `?virtual=1&muted=1` (+ `&hour=`, `&weather=`, `&side=left`), resize to 1600×1000 for shots (also
3440×1440), reset with preset desktop when done. LW.advance to step; `await LW.shot('<scene>-<name>.png')` → shots/.
LOOK at every shot and iterate until it's genuinely beautiful and believable. Music: `__lw('nowplaying',{title,artist,
artwork,playing:true,app:'Music'})`, beats `__lw('beat',{l:.6,b:.7,m:.5,h:.3,k:.8})`. Pets off: `__lw('settings',{pets:false})`.
Self-tests where exposed must stay clean; no console errors (old optional-art 404s excepted); `node --test tests/` passes.

## Rules
Only edit your assigned scene files + their art folders (`scenes/art/<scene>/`), docs/scene-polish.md (append a dated
section), and — ONLY the agent assigned it — scenes/pet-motion.js + tests. Never edit host/*.swift, scenes/lw.js,
scenes/menu.html, site/, addons/, scenes/kit.js, scenes/drive.html, or other agents' scenes. If you need a host/menu change
(e.g. a new action or setting), describe it in your report. Don't run build.sh or touch wallpap.app / ~/Applications.
Don't commit. Report concisely: per scene what changed, art generated (paths), shot paths, perf, known issues, host changes
needed.

## 5. The moon (new shared asset — use it everywhere a moon appears)
`scenes/moon.js` (load after lw.js): `LW.drawMoon(g, x, y, r, {phase?, tilt?, alt?, glow?, haze?, alpha?})` draws a
photoreal moon (art/shared/moon.png) with the REAL phase (from LW.env.astronomy by default), earthshine, halo, low-horizon
warmth and haze. WebGL scenes: `LW.moonCanvas(px, opts)` returns a cached canvas — upload it as a texture only when
`LW.moonKey(opts)` changes, never per frame. Replace every procedural moon (and moon reflections should use it too).
The user called the current moons "crap".

## 6. No text bubbles, no emojis
Animals never "say" sentences ("a sip of water?" etc.) — no speech/text bubbles anywhere. When an animal makes a sound,
at most show the sound word, small and tasteful ("meow", "purr", "woof"), fading. Reminders stay diegetic (a glass, a bowl
being filled, a soft glow) and the host's own reminder label handles text. NO emoji characters anywhere (UI, labels,
bubbles, signs). If an icon is needed, draw a small custom vector icon in the scene's style.

## 7. Plausibility audit (user: "chair placement in roof scene is wrong — think more")
Audit every element of your scenes for physical/staging sense: furniture orientation and placement (chairs face what
they're for, nothing floats, nothing intersects), scale relative to doors/people-height, light sources actually lighting
nearby surfaces, shadows consistent with light direction, reflections on wet ground/glass, what's visible through windows
matching the time/weather, depth sorting/occlusion, and what's MISSING that a real place would have (small life details:
a plant, a mug, a coat on a hook, a cat bowl…). Fix what's wrong; add what makes it feel inhabited (without people unless
the scene brief says otherwise).

## 8. Weather that respects the world (user: "be smart about all this")
- Rain/snow particles ONLY where the sky is exposed: outside windows (seen through the glass, clipped to the opening), on
  open terraces/streets/rooftops. NEVER indoors (a bug the user screenshotted: rain splash rings on a wooden floor under a
  bar stool), never under awnings/roofs/overhangs/bridges, never inside tunnels (train: when the window shows a tunnel,
  no rain/snow on the glass or outside). Use explicit "exposed" masks/regions per scene.
- Rain shows as: streaks outside, drops/rivulets on window glass, splash rings + ripples only on exposed wet ground and
  puddles, wet sheen/reflections on exposed surfaces, dripping from edges of awnings.
- Snow ACCUMULATES over time on exposed upward-facing surfaces (ledges, roofs, railings, window sills outside, ground,
  branches) — build up gradually during snowfall, persist a while after, melt/sparkle in sun; snow on glass corners.
- Fog/haze grows with depth; lights get halos in fog/rain. Wind direction consistent across particles, smoke, foliage.

## 9. Night is moonlight, not black (owner, repeatedly)
Night must never collapse to near-black or a flat dark slab. Grade toward cool moonlight: overall exposure maybe 25–40%
of day, blue-silver key light from the moon's direction (strength follows the real moon phase — dimmer on new moon but
still readable), lifted shadows with detail, silver highlights on water/stone/foliage, stars and the shared moon in a
graded (not flat) sky, warm practical lights (windows, lamps) as accents. The scene must remain clearly legible at a
glance. Same for every scene and every add-on.

## 10. Scale & physics sanity (owner: "look at the size of the car, is this a joke?")
Check every moving or placed object against known sizes in the plate: doors ≈ 2.1–2.2 m, people ≈ 1.7 m, cars ≈ 4.2 m
long × 1.5 m tall, buses ≈ 12 m, aircraft per type, boats per type. Measure in the plate, set the scale from it, and
verify with a crop next to a door/person. Same for speed (cars ~30–50 km/h in a city street, people ~1.4 m/s).

## 11. Weather must be visible and right
Rain reads as rain at wallpaper scale: streaks with depth layers, splashes/ripples on exposed ground and water, wet
sheen and reflections, darker overcast grade, drops on glass when there's glass. Never "rain" that's just a faint haze.

## 12. Sprite sheets, always (owner: "sprite sheets always, not just still images")
Anything that moves or lives in a scene — aircraft, cars, buses, boats, people, animals, birds, paragliders, kites,
trains, flags, laundry, smoke, fire — is drawn from a SPRITE SHEET with animation frames (walk/fly/roll/sway cycles,
wheel/rotor/propeller turns, turn angles, bobbing), generated with consistent scale/camera/lighting and cut cleanly.
A single still image translated along a path is not acceptable, ever. If a sheet looks wrong, regenerate it; if it
can't be made good, leave the actor out rather than faking it.

## 13. Actors respect the world's objects (owner: "cats in Santorini sort of go through stairs — be smart about this")
Nothing that moves may pass through a solid thing. Every scene (hand-built or generated) declares its props as
geometry, and every actor (pets, people, cars, boats, aircraft, birds landing) plans around it:
- **Footprints / colliders** for solids on the ground plane (stairs, benches, pots, furniture, tables, booths, the
  stage, walls, planters, parked cars): actors path around them (no straight lines through), never stop inside them.
- **Walkable areas** are polygons, not a band; **stairs and steps are climbed** (per-step hops/jumps with the right
  pose), never walked through; ledges/perches are reached by a jump link.
- **Occlusion by depth**: each prop has a front edge (y on the floor); actors behind it are drawn behind it (prop
  re-drawn on top / mask), actors in front are drawn in front. Contact shadows stop at the prop.
- **Actors avoid each other** (personal space by depth; no overlaps, no riding on each other).
- Verify with frame sequences of actors moving around/behind every prop (and up/down stairs) in day and night.
Scene generation (tools/plate-scene, new-scene skill) must produce this geometry too: auto-detect props from the plate
(depth/segmentation → footprints + front edges), let the design step name walk paths, perches and stairs, and fail QA
if any actor crosses a collider.

