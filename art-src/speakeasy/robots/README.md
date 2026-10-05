# Speakeasy house band — robot art sources

Original art for the Speakeasy's art-deco robot trio (+ guest singer). Runtime atlases:
`scenes/art/speakeasy/robots/{pianist,drummer,bassist,singer}.webp` + `rig.js`, built by `build.py`.

## Sourcing (owner rule: licensed first)
Searched for CC0 / public-domain / CC-BY art-deco robot figures that could be cut into a rig
(Openverse/rawpixel/publicdomainvectors/museum open-access via web search, 2026-10-04). Results were
flat cartoon clip-art or single photos — no painted, jointed, consistently lit figures matching the
scene, so nothing was used. The robots are ORIGINAL art generated with Magnific (Freepik) image
generation (commercial use permitted for the account's generations); no third-party assets are inside.

## Generations (Magnific, Nano Banana Pro, 2k) — every spend
| file | purpose | credits |
| --- | --- | --- |
| `concept-lineup.webp` | four robots, front A-pose, flat grey card; style ref = a crop of the live stage (night) | 75 |
| `pianist-rear.webp` | the pianist seen from behind on its stool + its head in profile; refs = pianist crop + stage | 75 |
| `saxophonist-sheet.webp` | guest saxophonist (front A-pose) + a tenor saxophone alone; refs = band lineup + stage | 75 |
Total: **225 credits** (budget 800). `simulate_cost` was run before each call.

### Prompt — concept-lineup.webp (style reference: the scene's stage crop)
> Character design lineup of four original 1920s art-deco automaton robot jazz musicians, painted in the same warm
> painterly storybook illustration style as the reference (soft brush texture, rich but restrained colour), elegant and
> premium, Metropolis-era futurism, NOT cute, NOT toy-like, NOT cartoon. All four stand side by side, front view, facing
> the viewer, in a neutral A-pose: standing straight, arms held slightly away from the body with a clear gap between arms
> and torso, elbows straight, hands open and relaxed, legs slightly apart, full body visible from head to feet, wide empty
> space between the robots so nothing overlaps. Visible mechanical ball joints at shoulders, elbows, wrists, hips and
> knees. 1) The pianist: slender and tall, gloss black lacquer torso with a gold sunburst inlay, oval polished-brass
> faceplate with one narrow horizontal glowing amber visor slit, a tall stepped gold fin crest on the head like a deco
> skyscraper spire, long slim jointed fingers. 2) The bassist: the tallest, lanky, polished chrome body with brass trim,
> stepped ziggurat shoulders, rounded chrome helmet head with two round glowing amber porthole eyes. 3) The drummer:
> stockier, burnished copper and brass barrel chest with ribbed horizontal bands, domed brass head with a small
> speaker-grille mouth and two amber lenses, sturdy arms, holding one wooden drumstick in each hand pointing down.
> 4) The guest singer: slim chrome and ivory enamel figure, graceful, head with a vertical radio-grille mouth and a thin
> gold halo ring around the head. Even soft warm key light from the upper left, gentle stage-light warmth, subtle dark
> shading. Perfectly flat uniform plain light grey background (#e6e6e6), no floor, no cast shadows, no text, no labels,
> no instruments, no people.

### Prompt — pianist-rear.webp (refs: the pianist cropped from the lineup + the stage crop)
> Character sheet of the exact same art-deco automaton robot pianist as the first reference image (gloss black lacquer
> body with gold sunburst inlay and gold pin-stripes, brass ball joints, tall stepped gold fin crest on the head), same
> warm painterly storybook illustration style and lighting as the second reference. LEFT SIDE: the robot seen from
> DIRECTLY BEHIND (back view, we see its back, the back of its head and crest), sitting upright on a small round
> art-deco piano stool with a dark red velvet cushion and brass legs; both arms held out to the sides away from the
> torso in a relaxed A-pose with a clear gap between arms and body, elbows straight, hands open with long slim jointed
> fingers; full figure and stool fully visible. RIGHT SIDE, well separated: the same robot's head and neck alone, turned
> to the right in clean side profile (facing right), showing the glowing amber visor slit from the side. Elegant,
> premium, not cute, not toy-like. Perfectly flat uniform plain light grey background (#e6e6e6), no floor, no cast
> shadows, no text, no piano, no people.
(The profile came out facing left; `build.py` mirrors it.)

### Prompt — saxophonist-sheet.webp (refs: the band lineup + the stage crop)
> Character sheet of a fifth robot for the same art-deco automaton jazz band as the first reference image (same family:
> 1920s Metropolis-era futurism, polished brass, gold and dark enamel, visible ball joints, glowing amber eyes), painted
> in the same warm painterly storybook illustration style and lighting as the references, elegant and premium, NOT cute,
> NOT toy-like. The saxophonist: a tall slim robot in polished gold-brass with dark bronze enamel panels and a stepped
> deco chest grille, a rounded helmet head with two small round glowing amber eyes and a small round brass mouthpiece
> socket for a mouth, a narrow gold crest. LEFT HALF: the robot alone, front view facing the viewer, standing straight in
> a neutral A-pose, arms held away from the body with a clear gap, elbows straight, hands relaxed and slightly curled as
> if ready to hold something, legs slightly apart, full body from head to feet. RIGHT HALF, well separated and not
> touching the robot: a curved golden tenor saxophone ALONE, standing upright, seen from the front with the bell curving
> up and to the right, mother-of-pearl key touches, gold lacquer, the neck and mouthpiece at the top; no hands, no strap.
> Even soft warm key light from the upper left. Perfectly flat uniform plain light grey background (#e6e6e6), no floor,
> no cast shadows, no text, no labels, no other instruments, no people.
(The horn is mirrored by `build.py` so its body hangs at the player's right; grey card trapped in the keywork is removed.)

## Cutting
1. `swift tools/cutout.swift <sheet> <dir> <prefix>` (Vision subject lifting) → `cut/*.png`, stored as lossless WebP
   (`drummer`, `bassist`, `singer`, `pianist-front` from the lineup; `pianist-rear`, `pianist-side`; `saxophonist`, `sax-horn`).
2. `python3 build.py` → rigid parts by joint bands/boxes in each figure's own frame (see the docstring), pale card
   remnants removed at the silhouette, 2 px edge pull + colour bleed (no grey halo on the dark stage), packed at
   2.4 px per world unit. A part drawn with zero rotation lands where it was cut, so the rest pose IS the painting.
3. `python3 tools/speakeasy-band/occluder.py` → `occluder.png`: the painted kit/bass/mic that stand in front of the
   robots (measured polygons in world units; drawn from the baked room through this mask).
