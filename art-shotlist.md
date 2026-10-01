# wallpap — art shot list (Google Vids image generation)

Pace: ≥60 s between generations, ≤10/hour, ≤40/day (ledger: ~/.relay/vids-ledger.jsonl).
Every character sheet: same character, several poses, **plain flat light-grey background** (#e9e6e1),
no shadows on the ground, no text — so poses can be cut out locally with macOS Vision subject lifting.
Shared style line (append to every prompt):
> soft storybook illustration, clean shapes, gentle shading, warm cozy palette, high detail, consistent character, children's picture-book quality, no text, no watermark

## Round 1 — cats (Santorini scene) · 5 generations
1. **Orange tabby cat character sheet**: the same chubby orange tabby cat with green eyes, white chest and paws, shown in 6 poses in a grid: walking side view facing right (two different steps), sitting facing viewer, loaf, curled asleep, big stretch. Plain flat light grey background.
2. **Black cat character sheet**: same layout; sleek black cat with big golden-yellow eyes, small pink nose.
3. **Grey and white cat character sheet**: same layout; grey tabby-ish back, white muzzle, chest and socks, green eyes.
4. **Calico cat character sheet**: same layout; white body with orange and black patches, amber eyes.
5. **Siamese cat character sheet**: same layout; cream body, dark brown face mask, ears, paws and tail, blue eyes.

## Round 2 — pandas (Touch Grass) · 2 generations
6. **Giant panda character sheet**: chubby adult panda, 6 poses: walking on all fours side view facing right (two steps), sitting munching bamboo, lying on back asleep, rolling, waving.
7. **Panda cub character sheet**: small round cub, same 6 poses.

## Round 3 — music scene paintings (16:9, no animals, no people) · 8 generations
8. Night café interior, rainy window onto city street, record player, warm lamps.
9. Record store after hours, crates of vinyl, a lit "now playing" wall frame (left blank), shop window with rain.
10. Night train carriage window seat, warm interior light, dark window (left blank for the moving view).
11. Speakeasy jazz bar, glowing bottles, small stage with piano and double bass, empty marquee frame.
12. City rooftop at night, string lights, plants, deck chairs, blanket, skyline.
13. Tokyo back alley ramen stall at night, red lanterns, noren curtain, vending machine (screen blank), puddles.
14. Cozy snowy cabin interior, fireplace, record player, big window with snowy pines.
15. Santorini terrace at golden hour, whitewashed walls, blue dome, bougainvillea, sea beyond (empty floor).

Art slots: each scene loads optional PNGs from `scenes/art/<scene>/` (see the comment block at the top of each scene file for exact filenames + sizes).
