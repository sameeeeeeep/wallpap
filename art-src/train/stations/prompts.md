# Built-in ImageGen — 2026-10-04

No Freepik, Magnific or external paid API was used. All generations used the built-in image tool.
Style reference: `shots/train-stations/style-reference.jpg`, assembled from the four existing day
interiors and panoramas. Source image IDs are retained in `scenes/art/train/stations/sources.json`.
`tools/train-stations/prepare.py [generated-output-directory]` packs alpha-preserving WebP and
registers per-row animation frames to shared foot baselines. Runtime art is 1440×480 per platform,
and 768×640 for the six-column/four-row life atlas. Built-in originals remain in the default generated-images directory.

## Indian
Use case: stylized-concept. Transparent painted scenery strip for a premium train-window wallpaper.
ONE very wide 3:1 side elevation of an Indian railway platform at Itarsi, seen straight across the track
from seated train-window eye height, no perspective convergence along platform, horizontal platform edge.
Muted painterly cinematic realism: soft oil-painted material textures, warm ivory stucco, dusty sage/plum
iron canopy, weathered concrete. Entire finite canopy visible with margin at left and right. Cream
station back wall and benches behind a clear empty walking apron. Three slender canopy columns, yellow
bilingual board reading “इटारसी” and “ITARSI”, modest tea kiosk with no vendor. Platform bottom 22%,
canopy roof upper 18%, building below it, platform edge horizontal at 90% image height. Lamps under
canopy, unlit daylight (runtime lights them). Soft neutral daylight, restrained saturation. Transparent
background above roof and around finite architecture; no sky, landscape, people, animals, train, tracks,
border. Connected shelter with visible side silhouette. Life is separate sprite sheets.

## Shinkansen
ONE very wide 3:1 transparent painted scenery strip of a small Japanese Shinkansen station platform,
straight side elevation across track from seated train-window eye level. Premium muted cinematic
painterly realism, fine soft material textures matching reference, not cartoon/vector. Entire finite
architecture with small margin at ends. Pale warm grey modern canopy, slender steel columns, rear glass
windbreak, dark LED departures board with amber “HIKARI • 12:40”, sign “三島 MISHIMA”, one bench at back.
Front row of chest-height glass safety barriers with sliding door openings, thin brushed steel frames,
yellow tactile line along straight horizontal edge. Clear empty walking apron between back fixtures
and barriers. Roof at y≈18%, platform surface y≈78–87%, vertical platform edge y≈90–100%. Unlit fixtures;
soft neutral daylight for runtime night grading. Transparent sky/surroundings, solid platform lower band.
No people, animals, trains, landscape, rails, border or vanishing point.

## Swiss
ONE transparent very wide 3:1 painted station scenery strip. Small Swiss alpine railway station: low
honey-brown wooden chalet in central two thirds, modest slate roof/eaves, white shutters, red geranium
flower boxes, round railway clock under roof, blue enamel “BERGÜN” sign, wooden bench. Covered veranda,
two timber posts; stone platform, straight horizontal edge. Strict straight-on side elevation at seated
train-window eye height, no perspective convergence. Soft cinematic oil-painted realism, subdued natural
palette and fine texture matching train reference, no thick outlines. Roof y≈12%, floor y≈80%, edge y≈90%.
Empty walkway in front of bench/posts. Wall lanterns unlit in daylight, runtime lights them. Transparent
above/around chalet; no sky, mountain, terrain, trees, snow, people, animals, trains, rails, borders.
Whole building within canvas, generous horizontal margins; ground forms wide finite strip.

## Orient
ONE transparent very wide 3:1 painted station scenery strip for Orient Express carriage wallpaper.
Old-world continental station: ivory limestone rear facade, tall arched dark glass windows, dark sage
cast-iron-and-glass canopy and three slender columns, restrained filigree brackets, bronze gas lanterns,
old wooden bench, enamel “VENEZIA S. LUCIA”. Realistic proportions, strict straight-on side elevation across
tracks from seated eye height, no vanishing point. No train/track. Empty walking apron in front of rear
fixtures. Platform surface y≈80–87%, front edge 90%, canopy top 15%. Finite whole canopy with end margins;
transparent above/at sides. Muted painterly cinematic realism matching supplied interior/panorama,
soft oil-painted material detail, no outlines, cartoon or oversaturated gold. Neutral daylight, unlit
lanterns for runtime. No people, animals, moving foliage, sky, landscape or borders.

## Life atlas, then gait correction
Transparent production animation sprite sheet, exactly six columns and four rows, equal cells; 3:2 canvas
1536×1024, each cell 256×256. Entire figures inside their cell, common feet baseline, generous separation.
Muted finely painted realistic full-body people for cinematic train-window illustration, no cartoon/outlines.
Row 1: same adult Indian woman, terracotta sari, cloth bag, six subtly different planted waiting poses,
head turns and hand adjusts bag; height 210px. Row 2: same man, navy travel jacket, beige trousers, shoulder
bag, true right-facing profile head/one eye; six consecutive walk-cycle frames with alternate contact and
passing, bent knees, reciprocal arms; height 210px. Row 3: same adult vendor, grey waistcoat, ivory apron,
six rooted serving poses lifting metal pot and pouring into cup, no cart, distinct hands; height 210px.
Row 4: same grey pigeon facing right, six peck poses from standing through beak down to neck up, width
130px/height 90px, planted feet. Neutral daylight for grading. True alpha, no backdrop, shadows beyond
feet, grid, labels or text. Same character per row changing anatomical poses, never repeated stills.

Correction prompt to first generated atlas: remove background to true alpha, preserve rows 1/3/4 and
all silhouette detail. Correct row 2 to six-frame right-facing gait: right heel contact/left toe behind;
weight over right foot with left knee bent passing, feet close; left leg swings forward/right pushes;
left heel contact/right behind; weight over left/right bent passing, feet close; right leg swings forward
as left heel lifts. Frames 2 and 5 must have narrow leg silhouette, not six split-stance pictures. Preserve
profile head, coat, trousers, bag and scale. No backdrop/gradient/shadow field, six columns/four rows.

## Review decisions
The first walk had insufficient leg passing poses; replaced with corrected atlas. Night runtime exposure
lifted after WebKit review; Shinkansen practicals cooled. No generated night plates (day art is graded and
relit in cached canvas layers). All source alpha preserved; no background-removal API. Walking, rooted
waiting, serving and pigeon peck frames inspected on a neutral matte in `life-frames.jpg`.
