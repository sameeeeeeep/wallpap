#!/usr/bin/env python3
"""Walk cycles from AI in-place walk videos (Kling via Magnific, art-src/walk-video/<coat>-<view>.mp4).

For each video: find the cleanest loop (one full stride), cut the cat off the white background
(border flood fill keeps white chests and paws), register every frame on the upper torso so the
body doesn't jitter, scale to the approved atlas size for that view, and write walk-<view>.webp plus
its manifest entry. Every other clip stays as it is. Run tools/cats-qa/manifest.py afterwards.
"""
from pathlib import Path
import json, subprocess, sys, tempfile
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-src/walk-video'
BASE = ROOT / 'scenes/art/sprites/cats'
COATS = ['orange', 'black', 'grey', 'calico', 'siamese']
VIEWS = ['side', 'near', 'far', 'toward', 'away']
MAX_FRAMES = 16


def frames_of(video, width=960):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(video), '-vf', f'scale={width}:-2',
                        f'{tmp}/f%04d.png'], check=True)
        return [np.asarray(Image.open(p).convert('RGB')) for p in sorted(Path(tmp).glob('f*.png'))]


def cutout(rgb):
    neutral = rgb.max(2).astype(int) - rgb.min(2) < 24
    bg = (rgb.min(2) > 214) & neutral
    seed = np.zeros(bg.shape, bool); seed[[0, -1], :] = True; seed[:, [0, -1]] = True
    outside = ndi.binary_propagation(seed & bg, mask=bg)
    # Paper enclosed between legs is background too: it is flat bright white (mean > 246,
    # little texture). Painted white fur (chests, paws) is shaded and darker, so it stays.
    inner, k = ndi.label(bg & ~outside)
    for i in range(1, k + 1):
        m = inner == i
        if m.sum() < 40: continue
        px = rgb[m].astype(float)
        # Mostly paper-white pixels (painted white fur almost never reaches 247+).
        if (px.min(1) > 246).mean() > .5: outside |= m
    mask = ~outside
    lab, n = ndi.label(mask)
    if n == 0: return None
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    mask = lab == int(np.argmax(sizes))
    # soft 1px edge
    alpha = ndi.gaussian_filter(mask.astype(float), .6)
    alpha[~ndi.binary_dilation(mask)] = 0
    return np.dstack([rgb, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])


def best_loop(frames):
    """One full stride: the shortest period whose average frame match is within 10% of the best.
    Averaged over the whole clip (not one lucky pair), and judged on colour in the leg half, where
    a half-stride (near and far legs swapped) differs from a full one."""
    small = [np.asarray(Image.fromarray(f).resize((192, 108))).astype(float) for f in frames]
    n = len(small); lo = 14; hi = min(34, n // 2)   # <=1.4 s: longer loops let markings drift
    def d(L, s): return np.abs(small[s][54:] - small[s + L][54:]).mean() + .5 * np.abs(small[s][:54] - small[s + L][:54]).mean()
    curve = {L: np.mean([d(L, s) for s in range(2, n - L - 2)]) for L in range(lo, hi)}
    floor = min(curve.values())
    L = min(k for k, v in curve.items() if v <= floor * 1.10)
    s = min(range(2, n - L - 2), key=lambda s: d(L, s))
    return s, L


def register(cut):
    """Shift each frame so the upper torso (top 55% of the silhouette) stays put."""
    ref = cut[0][:, :, 3] > 128
    ys, xs = np.nonzero(ref); top, bot = ys.min(), ys.max(); cut_y = int(top + (bot - top) * .55)
    tmpl = ref[top:cut_y].astype(float)
    shifts = []
    for c in cut:
        a = (c[:, :, 3] > 128).astype(float); best = (-1, 0, 0)
        for dy in range(-12, 13, 2):
            for dx in range(-24, 25, 2):
                y0 = top + dy
                if y0 < 0: continue
                win = a[y0:y0 + tmpl.shape[0]]
                win = np.roll(win, -dx, axis=1)[:, :tmpl.shape[1]]
                if win.shape != tmpl.shape: continue
                score = (win * tmpl).sum()
                if score > best[0]: best = (score, dx, dy)
        shifts.append(best[1:])
    return shifts


def atlas_area(coat, view, manifest):
    c = manifest.get('walk-' + view)
    if not c: return None
    im = Image.open(BASE / coat / 'atlas' / f'walk-{view}.webp').convert('RGBA')
    areas = []
    for x, y, w, h, *_ in c['frames']:
        areas.append((np.asarray(im.crop((x, y, x + w, y + h)))[:, :, 3] > 128).sum())
    return float(np.median(areas))


def build(coats, views):
    for coat in coats:
        mpath = BASE / coat / 'atlas/manifest.json'; manifest = json.loads(mpath.read_text())
        for view in views:
            video = SRC / f'{coat}-{view}.mp4'
            if not video.exists(): print('missing', video); continue
            frames = frames_of(video); s, L = best_loop(frames)
            pick = np.linspace(s, s + L, min(L, MAX_FRAMES), endpoint=False).round().astype(int)
            cuts = [cutout(frames[i]) for i in pick]
            if any(c is None for c in cuts): print('cut failed', coat, view); continue
            shifts = register(cuts)
            target = atlas_area(coat, view, manifest)
            area = float(np.median([(c[:, :, 3] > 128).sum() for c in cuts]))
            scale = (target / area) ** .5 if target else .5
            ground = int(np.median([np.nonzero(c[:, :, 3].any(1))[0].max() - dy for c, (dx, dy) in zip(cuts, shifts)]))
            ys, xs = np.nonzero(cuts[0][:, :, 3] > 128); torso_x = float(xs.mean())
            small, rects = [], []
            for c, (dx, dy) in zip(cuts, shifts):
                ys, xs = np.nonzero(c[:, :, 3] > 8); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
                crop = Image.fromarray(c[y0:y1, x0:x1])
                p = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
                a = np.array(p); a[:, :, 3][a[:, :, 3] < 12] = 0; p = Image.fromarray(a)
                ax = round((torso_x + dx - x0) * scale); ay = round((ground + dy - y0) * scale)
                small.append(p); rects.append([0, 0, p.width, p.height, ax, ay])
            cols = 4; cw = max(p.width for p in small) + 4; ch = max(p.height for p in small) + 4
            rows = (len(small) + cols - 1) // cols
            sheet = Image.new('RGBA', (cw * cols, ch * rows))
            for i, (p, r) in enumerate(zip(small, rects)):
                r[0], r[1] = i % cols * cw, i // cols * ch; sheet.alpha_composite(p, (r[0], r[1]))
            key = 'walk-' + view
            sheet.save(BASE / coat / 'atlas' / f'{key}.webp', quality=90, method=6)
            old = manifest.get(key, {})
            manifest[key] = {'src': f'art/sprites/cats/{coat}/atlas/{key}.webp', 'frames': rects,
                             'stride': old.get('stride', 40), 'source': f'art-src/walk-video/{coat}-{view}.mp4',
                             'loop': [int(s), int(L)]}
            print(coat, view, 'loop', s, L, 'frames', len(rects), 'scale', round(scale, 3))
        mpath.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    coats = [c for c in sys.argv[1:] if c in COATS] or COATS
    views = [v for v in sys.argv[1:] if v in VIEWS] or VIEWS
    build(coats, views)
