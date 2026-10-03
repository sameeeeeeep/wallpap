# Scene generator spec (authoritative)

This file is the contract for `tools/plate-scene` (`new.py`). A scene is generated from one sentence, in minutes,
and must pass every gate below **without hand fixes**. If a scene fails a gate, fix the generator, the template or
the presets, never the one scene. Everything else (`docs/polish-brief.md`, `docs/scene-design.md`, the
`new-scene` skill, AGENTS.md) points here; when a new owner rule appears, it is added to this spec as a stage
requirement plus a gate.

Bar: a living place, not a photo with particles. It is illustrated by default, cinematic and restrained. Every
moving thing is animated from a sprite sheet. Nothing floats, nothing passes through anything, and the right side
stays quiet for widgets.

---

## Stages

Each stage writes its outputs under `art-src/<id>/` and records its time in `timings.json`. `--resume` reruns only
stages whose outputs are missing or whose inputs changed. Image jobs run in parallel (`--jobs`, default 5).

| # | Stage | Output | Gate (section below) |
|---|---|---|---|
| S0 | **Design** | `design.json` (+ `design.md` rendered from it) | G0 |
| S1 | **Style + plates** | `style.json`, plates `day / golden / night / overcast` (aligned) | G1 |
| S2 | **Masks** | `sky / water / exposed / emissive` (+ refined edges) | G2 |
| S3 | **World geometry** | `geometry.json` | G3 |
| S4 | **Cast sprites** | per actor: sheets, cut frames, `cast.json` | G4 |
| S5 | **Assemble** | `addons/<id>/` with `art/scene-config.json` (schema below) | G5 |
| S6 | **QA run** | `shots/gen/<id>/` contact sheets + `qa.json` | all gates |
| S7 | **Pack** | local zip + catalog fragment (publishing only on owner say-so) | — |

### S0 Design (the step that makes scenes good)
From the sentence (plus optional web references saved in `art-src/<id>/refs/`), produce `design.json`:
- **place**: what makes it recognisable; the foreground, midground and far layers; the season and mood.
- **style**: `illustrated` (default) or `painterly` or `photoreal`. Photoreal is allowed only if every actor can be
  photoreal too.
- **cast**: 4–8 actors, near, mid and far. For each actor:
  - kind, count and variants (types, colours and sizes; never one sprite repeated)
  - lane (see S3) and behaviour (schedule, randomness, never synchronised)
  - day / night / weather differences
  - real-world size in metres
  - views needed (from its lanes, see S4) and sound
  - Examples are in `docs/scene-design.md` §3 (airport: arrivals park and departures are different aircraft;
    Marine Drive: traffic both ways; valley: paragliders).
- **geometry intent**: walk areas, stairs, perches, props that block, and lanes for vehicles, boats and flight.
- **interactions** (1–3) and **moments** (a rare event).
- **quiet zone**: the right ~28% (mirrored by `LW.layout`) holds no focal motion.

### S1 Style + plates
- Write `style.json` (palette, line weight, texture, light direction). Every plate and sprite prompt includes it.
  Sprites also get the plate as a style reference.
- Generate the day plate, then derive golden, night and overcast from the day plate as reference: same geometry,
  only the light changes.
  - Night is **moonlight**: blue-silver key light, lit windows and lamps, readable scene. Never near-black.
- Aspect handling:
  - Codex outputs ≤1536×1024. Compose and outpaint to 16:10.
  - Ultrawide is extended with quiet edge material, never a mirrored copy of landmarks.
- No text, logos, brands or copyrighted characters. No people close-up in plates (people are actors).

### S2 Masks
- sky, water, exposed (where rain and snow can land), emissive (lamps and windows).
- Edges are refined at full resolution: guided or matting filter, a 1–2 px choke, and colour decontamination
  against the replacement sky. There must be no halo around trees or buildings, and no black slab or jagged cut.

### S3 World geometry (`geometry.json`): actors never pass through objects
All coordinates are normalised to the plate and mirror with `LW.layout`.
- **groundPlane**:
  - horizon y
  - depth→scale function (px per metre at each y), fitted from a known-size reference in the plate: a door is
    ≈2.2 m, a car ≈4.5 m long, a person ≈1.7 m. Store which reference was used.
  - DIAG: the screen slope of a 45° ground heading. 3/4 views are drawn for this heading.
- **walkable**: polygons per surface (floor, terrace, promenade, road, water) with their height level.
- **colliders**: footprints on the ground plane for every solid thing that stands on the floor:
  - furniture, stairs, pots, booths, the stage, parked vehicles, walls and planters
  - each collider has a front edge (y) for occlusion and an optional height
- **stairs**: step lines with rise. They are climbed with per-step hops or jump poses, never walked through.
- **perches**: ledges, sills, benches and roofs, each with jump links (from, to, max rise).
- **occluders**: cut-out foreground prop layers (from the plate plus a mask). The renderer draws them over actors
  whose depth is behind the prop's front edge.
- **lanes**: polylines with direction(s) and allowed views: roads (both ways), water routes, taxiways/runway,
  flight paths, paraglider thermals and promenades.
- **spots**: bowls, beds, sun patches, benches, parking stands, gates, moorings and exits.
- How it's produced:
  - automatically: segmentation and depth on the day plate propose props, footprints and front edges
  - from the design step: names lanes, stairs and perches
  - the result is validated (G3), and a debug overlay is rendered into the QA sheet

### S4 Cast sprites (sprite sheets, always)
For every actor variant, generate sheets on a flat #e6e6e6 background, style-referenced on `style.json`, the plate
and the actor's own side sheet, then cut, align and plant:
- **Views** come from its lanes:
  - lateral movement needs side (mirrored for left/right)
  - any depth movement needs 3/4 front and 3/4 back
  - rotation (aircraft taxiing, cars turning) needs an angle set (8 or 16 headings)
  - paths may only use headings that have art (lateral or DIAG; steep trips become a zigzag)
- **Cycles**, chosen by kind:
  - walkers and animals: walk ×8, run ×6, idle, sit, turn and jump ×5 in every view used
  - vehicles: a roll cycle (wheels), plus doors/props if used
  - boats: a bob/rock cycle and a wake
  - birds: flap ×6–8, plus glide and land
  - paragliders: canopy sway
  - aircraft: an angle set plus gear and lights
- Lights (headlights, windows, nav lights) are separate glow sprites.
- **Alignment**:
  - the contact point (paws, wheels, hull waterline) sits on one baseline
  - gait frames are planted so the contact point doesn't slide (picked by distance travelled)
  - scale comes from metres × the depth→scale function
- **Variety**: at least 3 variants per crowd actor (colours, types, liveries).
- Write `cast.json` with the frames, anchors, metres, views, stride and fps.

### S5 Assemble: `scene-config.json` (schema v2)
```jsonc
{
  "version": 2, "id": "…", "title": "…", "category": "…", "style": "illustrated",
  "layers": { "plates": {"day": "…", "golden": "…", "night": "…", "overcast": "…"},
              "masks": {"sky": "…", "water": "…", "exposed": "…", "emissive": "…"},
              "occluders": [{"src": "…", "frontY": 0.71}] },
  "geometry": "geometry.json",              // S3, required
  "cast": [{ "id": "taxi", "sheet": "…", "views": ["side", "f", "b"], "metres": 4.5, "count": [2, 5],
             "lane": "road-east", "behaviour": "traffic", "night": {"glow": "headlights"}, "sound": "…" }],
  "interactions": [{ "on": "click:road", "do": "honk" }],
  "moments": [{ "every": [600, 1800], "do": "fireworks" }],
  "quiet": [0.72, 1.0],
  "weather": { "exposed": "exposed", "rain": "streaks+splashes+wet", "snow": "accumulate" }
}
```
The template (`addons/_template`) is data-driven: no per-scene JS. Behaviours (traffic, walkers, pets, boats,
flock, aircraft ops, paragliders) live in shared presets that read lanes, colliders and occluders.

---

## Quality gates (`qa.json`; all must pass before S7)

Measured gates run in WebKit (`tools/wkshot`, virtual clock) over a 10-minute simulated run per time of day.

| Gate | Check | Pass |
|---|---|---|
| G0 | design.json complete | 4–8 actors, each with variants ≥2 (crowds ≥3), lane, metres, views; quiet zone set |
| G1 | plates aligned and lit | structural diff day↔night/golden < threshold; night mean luminance ≥ 0.12 and lamps lit; no text (OCR) |
| G2 | clean edges | halo metric at sky boundaries < threshold; no mask holes or islands > N px |
| G3 | geometry valid | walkable areas connected; colliders inside the plate; every lane/spot reachable; overlay rendered |
| G4 | sprites valid | every view a lane needs exists; frame count per cycle; contact slip ≤ 1 source px; consistent markings (colour histogram per variant) |
| G5 | **no pass-through** | 0 samples with an actor's footprint inside a collider; stairs only via climb poses; perches only via jump links |
| G5 | **depth order** | an actor behind a prop's front edge is drawn behind its occluder (pixel check on sampled frames) |
| G5 | **no overlaps** | 0 samples of two ground actors' footprints overlapping; 0 actors standing on another |
| G5 | **grounded** | contact shadow under the contact point (≤ 2 px) while grounded; shrinks with height when airborne |
| G5 | **heading = art** | screen heading within ±10° of the drawn view's heading while moving (no sliding sideways) |
| G5 | scale | actor size within ±15% of metres × depth scale (door/car/person reference) |
| G5 | life | each cast member visible ≥ X% of the run; never more than N identical sprites on screen; schedules desynchronised |
| G5 | weather | rain is visible (streak contrast > threshold) only inside `exposed`, with splashes/ripples; snow accumulates only on exposed surfaces; none indoors or in tunnels |
| G5 | quiet zone | motion energy in the quiet zone < 15% of the scene's |
| G5 | perf | ≤ 4 ms/frame median and ≤ 8 ms p95 at 1600×1000 in WebKit; 0 JS errors |
| G6 | visual review | contact sheets of frame sequences (day, golden, night, rain, snow, side=left, ultrawide) plus the geometry overlay, opened and judged against `design.json` and the refs; a short self-critique in `qa.json` |

Thresholds live in `tools/plate-scene/gates.json` (tuned on Santorini Cats and the reviewed scenes), so they can be
tightened in one place.

---

## Speed budget (target per scene)
S0 1 min · S1 2 min (parallel) · S2 30 s · S3 1 min · S4 3–5 min (parallel, the bulk) · S5 10 s · S6 2 min
→ **about 10 minutes from sentence to a scene that passes every gate.** Shared presets mean later scenes reuse
behaviours, so only art is new.

---

## Gaps against the current implementation (2026-10-04): the to-do list
1. No S0 `design.json`; presets are inferred from words instead (`--presets water,birds,boats,traffic,lights,walkers`).
2. Actors break §12 (sprite sheets always):
   - boats are one reusable cutout
   - walkers are tiny silhouettes
   - traffic is light trails only
   - birds are distant flocks with no flap frames
3. No S3 geometry:
   - paths are derived from eroded mask components
   - no colliders, stairs, perches, occluders, lanes with views, or depth→scale fit
4. No views beyond side; no angle sets (aircraft, turning cars).
5. Gates are partly visual-only (`verify-new.py`): no measured pass-through, overlap, heading, slip, scale,
   quiet-zone or weather checks, and no `gates.json`.
6. Plates: night grading and edge refinement were improved in `d9769bd` (quality run). Fold them into S1/S2 as
   required steps with gates G1/G2.
7. The pet engine (`scenes/pets.js`, in progress) is the reference behaviour for ground actors: directional
   walks/jumps, distance-planted gait, drawn-heading paths, tuck-and-cut poses. The template's walkers and pets
   presets should use it.

## Shared sky/weather requirements (owner audit, 2026-10-04)
S5 must use the shared Kit lighting and sky implementation. Night has a blue-silver
zenith, a gradual horizon glow, independently twinkling stars and the shared lunar
texture with the actual date's phase (also in pinned-hour previews). Compose a risen
moon inside the exposed sky mask; live astronomy still controls rise/set visibility.
Rain must override any clear-weather cloud setting, suppress direct sun and cast
shadows, soften contrast and restore daylight gradually after clearing.
Cloud fields are seeded by scene id, with broad irregular billows and soft depth/haze
at the horizon; no identical layouts, hard horizon strips or thin dash artifacts.

Additional G1/G5/G6 checks for shared changes: night mean Rec.709 display luminance
>= 0.12 in every add-on; inspect day/night/rain frame sequences at 1600x1000 plus
mirrored and 3440x1440 skies. Verify lunar phase against the astronomy value, a risen
moon fits fully within sky pixels, and separate ids produce different cloud fields.
Rain start/end sequences must show a continuous light transition and no solar disk
or hard cast shadows under full overcast; wet-ground crops must have no repeating
horizontal bands. Keep JPEG contact sheets and remove raw capture PNGs.
