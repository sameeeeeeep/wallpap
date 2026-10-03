#!/usr/bin/env python3
# Walk-cycle strip -> one atlas for train.html. Background-colour cut (same approach as
# art-src/cycles/cut.py: border-connected near-background = outside, enclosed neutral pockets too,
# edges un-mixed from the grey), N largest pieces ordered left->right, each registered on its head
# (alpha centroid of the top 16% of the piece) and bottom-aligned on the soles.
# usage: pack.py <strip.png> <out.png> <N> [maxH]   -> prints the PEOPLE_META entry
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
maxH = int(sys.argv[4]) if len(sys.argv) > 4 else 0
im = np.array(Image.open(src).convert('RGB')).astype(float); h, w, _ = im.shape
border = np.concatenate([im[:4].reshape(-1,3), im[-4:].reshape(-1,3), im[:, :4].reshape(-1,3), im[:, -4:].reshape(-1,3)])
bg = np.median(border, 0); dist = np.abs(im - bg).max(2)
lab, _ = nd.label(dist < 16); edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); edge = edge[edge > 0]
outside = np.isin(lab, edge)
neutral = (np.abs(im[:,:,0]-im[:,:,1]) < 5) & (np.abs(im[:,:,1]-im[:,:,2]) < 5) & (dist < 10)
pl, pn = nd.label(neutral & ~outside)
if pn:
    ps = nd.sum(np.ones_like(dist), pl, range(1, pn+1)); outside |= np.isin(pl, np.where(ps >= 60)[0] + 1)
fg = nd.binary_opening(~outside, iterations=1)
lab2, n = nd.label(fg, structure=np.ones((3,3)))
sizes = nd.sum(fg, lab2, range(1, n+1)); keep = np.argsort(sizes)[::-1][:N] + 1
if len(keep) < N or sizes[keep[-1]-1] < sizes[keep[0]-1] * .3: print('pieces', sorted(sizes.astype(int))[::-1][:N+3]); sys.exit(2)
objs = nd.find_objects(lab2); keep = sorted(keep, key=lambda k: objs[k-1][1].start)
alpha = np.clip((dist - 6) / 22, 0, 1); inner = nd.binary_erosion(fg, iterations=2)
frames = []
for k in keep:
    sl = objs[k-1]; y0, y1 = max(0, sl[0].start-2), min(h, sl[0].stop+2); x0, x1 = max(0, sl[1].start-2), min(w, sl[1].stop+2)
    own = lab2[y0:y1, x0:x1] == k
    m = (nd.binary_dilation(own, iterations=1) & ~outside[y0:y1, x0:x1]) | own
    a = np.where(inner[y0:y1, x0:x1] & m, 1.0, np.where(m, alpha[y0:y1, x0:x1], 0.0))
    P = im[y0:y1, x0:x1]; aa = np.clip(a, 1e-3, 1)[..., None]
    C = np.clip((P - (1 - aa) * bg) / aa, 0, 255); C = np.where(a[..., None] >= .999, P, C)
    C = np.where(a[..., None] < .01, 0, C)
    rgba = np.dstack([C, a * 255]).astype(np.uint8)
    ys, xs = np.where(rgba[:, :, 3] > 8); rgba = rgba[ys.min():ys.max()+1, xs.min():xs.max()+1]
    frames.append(rgba)
H = max(f.shape[0] for f in frames)
sc = min(1, maxH / H) if maxH else 1
if sc < 1:
    frames = [np.array(Image.fromarray(f).resize((max(1, round(f.shape[1]*sc)), max(1, round(f.shape[0]*sc))), Image.LANCZOS)) for f in frames]
    H = max(f.shape[0] for f in frames)
Wt = sum(f.shape[1] + 4 for f in frames)
atlas = np.zeros((H, Wt, 4), np.uint8); meta = []; x = 0
for f in frames:
    fh, fw = f.shape[:2]; top = f[:max(8, int(fh * .16))]
    yy, xx = np.nonzero(top[:, :, 3] > 128); ax = float(xx.mean()) if len(xx) else fw / 2
    atlas[H-fh:H, x:x+fw] = f; meta.append([x, H-fh, fw, fh, round(ax, 1)]); x += fw + 4
Image.fromarray(atlas).save(out, optimize=True)
print(json.dumps({'h': H, 'frames': meta}, separators=(',', ':')))
