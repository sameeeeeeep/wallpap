#!/usr/bin/env python3
"""Calico walks whose patches cannot drift: the orange cat's AI walk video supplies the motion,
and the calico markings (taken once from the calico start frame of that view) are painted onto
every frame in torso-registered positions. Legs and paws stay white. Then written like walk_video.
   python3 tools/cats-qa/calico_from_orange.py near far toward
"""
import sys, json
from pathlib import Path
import numpy as np
from scipy import ndimage as ndi
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
import walk_video as W

STARTS = Path('/private/tmp/claude-501/-Users-sameeprehlan-Documents-Projects-visuals/ab78a0d3-482b-455e-94e1-14ef2725a5f0/scratchpad/hop/starts')


def masks_from(template):
    t = template.astype(float); r, g, b = t[:, :, 0], t[:, :, 1], t[:, :, 2]; lum = t @ [.3, .59, .11]
    orange = (r - b > 45) & (r > 130) & (g < r * .85)
    black = lum < 75
    black = ndi.binary_opening(black, iterations=2)          # drop thin ink outlines
    orange = ndi.binary_opening(orange, iterations=1)
    return ndi.gaussian_filter(orange.astype(float), 1.2), ndi.gaussian_filter(black.astype(float), 1.2)


def build(views):
    coat = 'calico'; mpath = W.BASE / coat / 'atlas/manifest.json'; manifest = json.loads(mpath.read_text())
    for view in views:
        frames = W.frames_of(W.SRC / f'orange-{view}.mp4'); s, L = W.best_loop(frames)
        pick = list(np.linspace(s, s + L, min(L, W.MAX_FRAMES), endpoint=False).round().astype(int))
        tmpl = np.asarray(Image.open(STARTS / f'calico-{view}.png').convert('RGB').resize((frames[0].shape[1], frames[0].shape[0])))
        cuts = [W.cutout(frames[i]) for i in [0] + pick]
        shifts = W.register(cuts)                                 # relative to video frame 0 (= start image)
        O, B = masks_from(tmpl)
        ys, xs = np.nonzero(cuts[0][:, :, 3] > 128); top, bot = ys.min(), ys.max()
        leg_line = top + (bot - top) * (.62 if view != 'toward' else .70)
        out = []
        for c, (dx, dy) in zip(cuts[1:], shifts[1:]):
            rgb = c[:, :, :3].astype(float); lum = rgb @ [.3, .59, .11]
            o = ndi.shift(O, (dy, dx), order=1, mode='constant'); bl = ndi.shift(B, (dy, dx), order=1, mode='constant')
            yy = np.arange(c.shape[0])[:, None]; body = np.clip((leg_line + dy - yy) / 10, 0, 1)
            o *= body; bl *= body
            white = np.stack([lum * .24 + 185, lum * .24 + 181, lum * .24 + 174], 2)
            charcoal = np.stack([lum * .19 + 15, lum * .19 + 16, lum * .19 + 19], 2)
            col = white * (1 - o[:, :, None]) + rgb * o[:, :, None]
            col = col * (1 - bl[:, :, None]) + charcoal * bl[:, :, None]
            ink = np.clip((70 - lum) / 35, 0, 1)[:, :, None]; col = col * (1 - ink) + rgb * .62 * ink
            # keep eyes, nose and pink ears from the source frame
            r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
            keep = ((g > r * .91) & (g > b * 1.22) & (lum < 190)) | ((r > g * 1.2) & (b > g * .77) & (lum > 85) & (lum < 220))
            col[keep] = rgb[keep]
            out.append(np.dstack([np.clip(col, 0, 255).astype(np.uint8), c[:, :, 3]]))
        cuts, shifts = out, shifts[1:]
        target = W.atlas_area(coat, view, manifest); area = float(np.median([(c[:, :, 3] > 128).sum() for c in cuts]))
        scale = (target / area) ** .5
        ground = int(np.median([np.nonzero(c[:, :, 3].any(1))[0].max() - dy for c, (dx, dy) in zip(cuts, shifts)]))
        ys, xs = np.nonzero(cuts[0][:, :, 3] > 128); torso_x = float(xs.mean())
        small, rects = [], []
        for c, (dx, dy) in zip(cuts, shifts):
            ys, xs = np.nonzero(c[:, :, 3] > 8); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = Image.fromarray(c[y0:y1, x0:x1]); p = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
            a = np.array(p); a[:, :, 3][a[:, :, 3] < 12] = 0; p = Image.fromarray(a)
            small.append(p); rects.append([0, 0, p.width, p.height, round((torso_x + dx - x0) * scale), round((ground + dy - y0) * scale)])
        cols = 4; cw = max(p.width for p in small) + 4; ch = max(p.height for p in small) + 4
        sheet = Image.new('RGBA', (cw * cols, ch * ((len(small) + cols - 1) // cols)))
        for i, (p, r) in enumerate(zip(small, rects)):
            r[0], r[1] = i % cols * cw, i // cols * ch; sheet.alpha_composite(p, (r[0], r[1]))
        key = 'walk-' + view; sheet.save(W.BASE / coat / 'atlas' / f'{key}.webp', quality=90, method=6)
        old = manifest.get(key, {})
        manifest[key] = {'src': f'art/sprites/cats/{coat}/atlas/{key}.webp', 'frames': rects, 'stride': old.get('stride', 40),
                         'source': f'art-src/walk-video/orange-{view}.mp4 + fixed calico patches', 'loop': [int(s), int(L)]}
        print('calico', view, 'loop', s, L, 'scale', round(scale, 3))
    mpath.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    build([v for v in sys.argv[1:] if v in W.VIEWS] or ['near', 'far', 'toward'])
