#!/usr/bin/env python3
# Window glass mask from the flat placeholder colour of a skin's plates (night navy, day pale blue).
# Union over the given plates; small specks closed; 1 px grow + soft edge. Prints stage-unit rects.
# usage: winmask.py <out.png> <plate1.png> [plate2.png ...]
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
out, plates = sys.argv[1], sys.argv[2:]
union = None; masks = []
for p in plates:
    im = np.array(Image.open(p).convert('RGB')).astype(float); H, W, _ = im.shape
    # placeholder colour = the most common colour in the middle third (where the glass is)
    mid = im[int(H*.25):int(H*.5), int(W*.35):int(W*.6)].reshape(-1, 3)
    q = (mid // 6).astype(int); keys, cnt = np.unique(q[:, 0]*10000 + q[:, 1]*100 + q[:, 2], return_counts=True)
    k = keys[cnt.argmax()]; ref = mid[(q[:, 0]*10000 + q[:, 1]*100 + q[:, 2]) == k].mean(0)
    d = np.abs(im - ref).max(2)
    g = im.mean(2); mu = nd.uniform_filter(g, 7); sd = np.sqrt(np.maximum(nd.uniform_filter(g*g, 7) - mu*mu, 0))
    near = (d < 18) & (nd.maximum_filter(sd, 5) < 4.5)   # flat paint only: textured upholstery is not glass
    lab, n = nd.label(near); sizes = nd.sum(near, lab, range(1, n+1))
    big = [i+1 for i, s in enumerate(sizes) if s > 1500]
    m = np.isin(lab, big)
    m = nd.binary_closing(m, iterations=3); m = nd.binary_fill_holes(m) if False else m
    # fill enclosed specks (painted noise) but keep real mullions (large holes)
    holes = nd.binary_fill_holes(m) & ~m; hl, hn = nd.label(holes)
    if hn:
        hs = nd.sum(holes, hl, range(1, hn+1)); m |= np.isin(hl, [i+1 for i, s in enumerate(hs) if s < 400])
    print(p, 'ref', ref.round(), 'px', int(m.sum()), file=sys.stderr)
    masks.append(m)
union = np.logical_or.reduce(masks)
if len(masks) > 1:   # glass = flat placeholder in EVERY plate (night navy and day blue); kills dark carpet etc.
    lab, n = nd.label(union); keep = []
    for i, o in enumerate(nd.find_objects(lab), 1):
        c = lab[o] == i; tot = c.sum()
        if all((mm[o] & c).sum() > .3 * tot for mm in masks): keep.append(i)
    union = np.isin(lab, keep)
m = nd.binary_dilation(union, iterations=1)
a = nd.gaussian_filter(m.astype(float), 0.7); a = np.clip(a * 1.25, 0, 1)
Image.fromarray(np.dstack([np.full(m.shape + (3,), 255, np.uint8), (a * 255).astype(np.uint8)])).save(out, optimize=True)
H, W = m.shape; sx, sy = 1600 / W, 1000 / H
lab, n = nd.label(m); objs = nd.find_objects(lab); sizes = nd.sum(m, lab, range(1, n+1))
rects = sorted([[round(o[1].start*sx), round(o[0].start*sy), round(o[1].stop*sx), round(o[0].stop*sy), int(s)] for o, s in zip(objs, sizes)], key=lambda r: -r[4])
ys, xs = np.nonzero(m)
print(json.dumps({'rects': rects, 'bbox': [round(xs.min()*sx), round(ys.min()*sy), round((xs.max()+1)*sx), round((ys.max()+1)*sy)]}))
