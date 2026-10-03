#!/usr/bin/env python3
"""Shrink scene art IN A BUILD COPY (never the source): lossy palette PNGs where they look the same.

    python3 tools/compress-art.py <dir> [--min-kb 120] [--psnr 40]

For every PNG over --min-kb it tries a 256-colour quantised version (with and without dithering) and keeps the
smallest one whose PSNR against the original (alpha-weighted RGB) is at least --psnr dB and that is at least 20%
smaller. File names never change, so scenes need no edits. Prints a summary.
"""
import sys, os, io, math, argparse
from PIL import Image
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('dir'); ap.add_argument('--min-kb', type=int, default=120); ap.add_argument('--psnr', type=float, default=40)
a = ap.parse_args()

def psnr(x, y, alpha):
    w = alpha[..., None] / 255.0
    mse = float(((x.astype(np.float32) - y.astype(np.float32)) ** 2 * w).sum() / max(1.0, w.sum() * 3))
    return 99.0 if mse <= 1e-9 else 10 * math.log10(255 ** 2 / mse)

before = after = done = 0
for root, _, files in os.walk(a.dir):
    for f in files:
        if not f.lower().endswith('.png'): continue
        p = os.path.join(root, f); size = os.path.getsize(p)
        if size < a.min_kb * 1024: continue
        before += size
        try:
            im = Image.open(p); im.load()
            rgba = im.convert('RGBA'); arr = np.asarray(rgba)
            best = None
            for dither in (Image.Dither.FLOYDSTEINBERG, Image.Dither.NONE):
                q = rgba.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=dither)
                buf = io.BytesIO(); q.save(buf, 'PNG', optimize=True); data = buf.getvalue()
                back = np.asarray(Image.open(io.BytesIO(data)).convert('RGBA'))
                if np.abs(back[..., 3].astype(int) - arr[..., 3].astype(int)).max() > 24: continue   # keep alpha edges clean
                s = psnr(arr[..., :3], back[..., :3], arr[..., 3])
                if s >= a.psnr and len(data) < size * 0.8 and (best is None or len(data) < len(best)): best = data
            if best:
                open(p, 'wb').write(best); after += len(best); done += 1
            else:
                after += size
        except Exception as e:
            after += size; print('skip', p, e)
print(f'compress-art: {done} files shrunk · {before/1e6:.1f} MB → {after/1e6:.1f} MB (files ≥ {a.min_kb} KB)')
