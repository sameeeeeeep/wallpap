# Train station stops — 2026-10-04

## References and style
The four existing train interior plates and matching panoramas are the style references (contact sheet:
shots/train-stations/style-reference.jpg). Retain their muted painted realism, material detail and soft edges.
Station geometry is a straight side elevation, seen across a platform from a seated train window. Architecture
is static world scenery; only the camera passes it. No extra train, inset picture, border or repeated station.
Indian: weathered cream/plum canopy, columns, bilingual yellow name board, benches.
Shinkansen: pale modern canopy, glass safety barriers, tactile paving, restrained LED departures.
Swiss: modest timber chalet, flower boxes, clock, stone platform.
Orient: fine iron-and-glass canopy, warm stone, gas lamps, old-world signage.

## Cast and animation
Three or four small figures maximum: waiting traveller, walker, vendor; one pigeon. Every living actor uses
an actual multi-frame atlas (distinct body/limb poses). Waiting/vendor cycles stay rooted. Walkers use a clear
front promenade; no traversal through benches, columns or building. Figures below canopy, foot shadows, tint
from daylight/moonlight and warm practicals. Pigeon uses peck frames, not a translated still. No aisle actors.

## Geometry and lighting
A finite platform strip moves at near-layer speed, anchored to an analytic stopping distance. Sign/architecture
never tile or mirror. Existing far landscape persists above/around it. Foreground poles are excluded inside
station bounds. Props stay behind the walk corridor. Safety barrier in Japan occludes figures' lower bodies.
Day/night grade preserves lifted cool shadows; practical lamp pools re-light the platform and sprites. Weather
is excluded below covered canopy spans, with accumulation only on roof/unsheltered platform and wet apron.

## Timing, ownership, performance
Cruise 180–360 s between calls; defer safely past water/tunnels. Preload only at a scheduled approach. Smooth
quintic velocity curve, analytic integral for exact stop independent of framerate; 20–40 s dwell; eased departure.
Calm/surge cannot interrupt a stop; live skin changes release stale resources and restart the schedule. QA force
hook schedules next safe stop without teleporting. Art and tint canvases released after platform clears.

## Verification
file:// WKWebView sequences for 4 skins × day/night, rain, snow and ultrawide/left layout. Inspect full-scene and
window contact sheets, atlas frames, stop position, feet/occlusion, canopy weather. Test lifecycle, easing,
route clearance, interrupted loads, idle bytes and repeated stops. Measure baseline/cruise/dwell frame cost.
