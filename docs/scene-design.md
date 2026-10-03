# Scene design — do this BEFORE generating anything

wallpap makes LIVE wallpapers. A beautiful still photo with a few generic particles is a failure ("boring", the
owner's word). Every scene must feel like a place going about its life. Speed comes from the pipeline; quality comes
from this design step. Write `art-src/<id>/design.md` with the sections below and get it right first.

## 1. References (10 min)
Search the web for real footage/photos of the place and of great live wallpapers / dioramas / tilt-shift videos of it.
Note: what moves there, at what pace, at what times of day; typical vehicles/creatures/people; light at night; what
makes it recognisable. Save 4–8 reference images under `art-src/<id>/refs/` (for your eyes and as style refs).

## 2. Style
Decide the rendering style deliberately. Default: **illustrated / painterly, slightly stylised** (not photoreal) —
it lets animated sprites blend with the backdrop and ages better. Photoreal only when every moving thing can also be
photoreal and properly animated. All plates + sprites of a scene share one style sheet (palette, line, texture).

## 3. Cast — what moves (aim for 4–8 distinct actors, layered near/mid/far)
For each actor: what it is, how many, VARIETY (types/colours/sizes — never one sprite repeated), its path or area,
its behaviour and timing (schedules, randomness, never synchronised), day/night/weather differences, and sound.
Examples:
- Airport: several aircraft TYPES and liveries; separate arrivals and departures (a landing aircraft taxis to a stand
  and parks — it does NOT take off again; departures are different aircraft pushed back from stands); taxiing,
  pushback tugs, baggage trains, fuel trucks, follow-me car, runway/taxi/approach lights, beacon, a helicopter now and
  then, birds by day.
- Marine Drive: continuous car/bus/taxi/bike traffic both directions with head/tail lights at night, walkers and
  joggers on the promenade, waves breaking on the tetrapods, gulls, a boat on the horizon, monsoon spray.
- Hillside valley: paragliders drifting on thermals, a small train crossing the viaduct, wind waves in the grass,
  washing fluttering, clouds casting moving shadows, birds, lanterns/fireflies at dusk.
- Kyoto garden: koi in the stream, falling maple leaves on the water, a heron, lanterns lit at dusk, rain rings.
- Harbour: fishing boats leaving/returning with wakes, bobbing moored boats, gulls, a ferry, lights on the quay.
- Iceland beach: waves rolling in, puffins/gulls, drifting fog, aurora on clear nights, a distant hiker.
## 4. Animation
Every actor that has a body (aircraft, cars, people, boats, birds, paragliders) is a **sprite SHEET with frames**
(walk/fly/roll cycles, turns, wheels, rotor, canopy sway) or proper angle sets for rotation — never one still image
dragged along a path. Lights are separate glow sprites. Generate sheets with consistent scale/camera; cut cleanly.

## 5. Boundaries & masks
Sky/water/exposed masks must have clean, decontaminated edges (no halo around trees/buildings): refine edges at full
res (guided/matting filter), choke 1–2 px, and colour-decontaminate edge pixels against the new sky. Check by
zooming on the skyline in day, golden and night.

## 6. Interaction & moments
1–3 delightful interactions (click a plane = landing lights; click the road = a car honks its lights; click the sky =
a paraglider takes off) and occasional "moments" (a fireworks night, a fly-past, a rainbow after rain).

## 7. Review (look, don't assume)
wkshot frame SEQUENCES (not single frames) for day/dusk/night/rain: are things moving believably, varied, entering
and leaving naturally, nothing floating, no repeated sprite, no halos? Compare against the references.
