#!/usr/bin/env python3
"""Cut the generated robot figures into rigid cut-out parts and pack one atlas per robot.

Inputs (this folder): the Vision-lifted figures in cut/ (see README.md for how they were made).
Outputs: scenes/art/speakeasy/robots/<robot>.webp (atlas) and scenes/art/speakeasy/robots/rig.js
(window.SPEAK_RIG = {robot: {k, parts: {name: {x,y,w,h, px,py, ax,ay, ...}}}}).

Every part keeps the SOURCE coordinate frame of its figure: a part drawn with zero rotation lands
exactly where it was cut, so the rest pose reassembles the original painting. Each part has a pivot
(source px) and a parent; the runtime builds M_part = M_parent · T(pivot) · R(θ) · T(-pivot).

Shapes (source px):
  band  [ax,ay,bx,by,r,t0,t1]  pixels whose projection on a→b lies in [t0,t1] (fraction of |ab|)
                               and whose distance to the axis is < r  (limbs; t0<0 overlaps the parent)
  poly  [[x,y],...]            polygon
  box   [x0,y0,x1,y1]
  minus [part names]           subtract those parts' shapes (exclusive regions)
  plus  [[cx,cy,r],...]        add discs (joint caps kept on this part)
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'scenes', 'art', 'speakeasy', 'robots')
CUT = os.path.join(HERE, 'cut')
PX_PER_UNIT = 2.4          # atlas pixels per world unit (≈ the scene's largest device scale)

def band(a, b, r, t0=0.0, t1=1.0):
    return ('band', (a[0], a[1], b[0], b[1], r, t0, t1))

ROBOTS = {
  # ── the pianist, seen from behind on its stool (k = world units per source px) ──
  'pianist': {
    'src': 'pianist-rear.webp', 'k': 0.18, 'anchor': [667, 1462],   # stool feet centre
    'parts': [
      ['seat',  None,    [667, 850], [('box', (380, 840, 960, 1488))], [], []],
      ['upL',   'torso', [482, 540], [band((482, 540), (335, 715), 46, -0.12, 1.06)], [], []],
      ['foL',   'upL',   [335, 715], [band((335, 715), (160, 805), 40, -0.14, 1.04)], [], []],
      ['handL', 'foL',   [160, 805], [band((160, 805), (40, 905), 80, -0.12, 1.25)], [], []],
      ['upR',   'torso', [852, 540], [band((852, 540), (998, 715), 46, -0.12, 1.06)], [], []],
      ['foR',   'upR',   [998, 715], [band((998, 715), (1172, 805), 40, -0.14, 1.04)], [], []],
      ['handR', 'foR',   [1172, 805], [band((1172, 805), (1296, 905), 80, -0.12, 1.25)], [], []],
      ['torso', 'seat',  [667, 850], [('box', (440, 430, 900, 905))], ['upL', 'upR'], [[482, 540, 34], [852, 540, 34]]],
      ['head',  'torso', [667, 448], [('box', (520, 0, 820, 462))], [], []],
    ],
    'extra': {   # the head turned toward the band (profile, mirrored to face right), its own frame
      'headSide': {'src': 'pianist-side.webp', 'flip': True, 'scale': 0.5, 'pivot': [300, 1050], 'attach': [667, 448]},
    },
    'eyes': {'headSide': [[440, 670]]},
  },
  # ── the drummer, front view (seated behind the kit: legs are only seen as shins) ──
  'drummer': {
    'src': 'drummer.webp', 'k': 0.256, 'anchor': [405, 650],          # hips centre
    'parts': [
      ['shinL', 'torso', [310, 790], [band((310, 790), (300, 1024), 70, -0.12, 1.1)], [], []],
      ['shinR', 'torso', [495, 790], [band((495, 790), (505, 1024), 70, -0.12, 1.1)], [], []],
      ['torso', None,    [405, 520], [('box', (230, 190, 580, 720))], ['upL', 'upR'], [[212, 292, 30], [598, 292, 30]]],
      ['head',  'torso', [405, 205], [('box', (270, 0, 540, 222))], [], []],
      ['upL',   'torso', [205, 290], [band((205, 290), (150, 465), 64, -0.25, 1.06)], [], []],
      ['foL',   'upL',   [150, 465], [band((150, 465), (108, 625), 62, -0.16, 1.0)], [], []],
      ['handL', 'foL',   [108, 625], [band((108, 625), (232, 800), 95, -0.1, 1.08)], ['foL', ('poly', [(242, 540), (600, 540), (600, 1024), (242, 1024)])], []],
      ['upR',   'torso', [605, 290], [band((605, 290), (655, 465), 64, -0.25, 1.06)], [], []],
      ['foR',   'upR',   [655, 465], [band((655, 465), (700, 625), 62, -0.16, 1.0)], [], []],
      ['handR', 'foR',   [700, 625], [band((700, 625), (577, 800), 95, -0.1, 1.08)], ['foR', ('poly', [(210, 540), (568, 540), (568, 1024), (210, 1024)])], []],
    ],
    'tips': {'handL': [232, 800], 'handR': [577, 800]},   # stick tips (rest pose)
    'eyes': {'head': [[362, 105], [445, 105]]},
  },
  # ── the bassist, front view, standing behind the double bass ──
  'bassist': {
    'src': 'bassist.webp', 'k': 0.24, 'anchor': [236, 1200],
    'parts': [
      ['legs',  None,    [236, 525], [('box', (90, 520, 390, 1206))], ['upL', 'foL', 'upR', 'foR'], []],
      ['torso', 'legs',  [236, 525], [('box', (0, 200, 472, 560))], ['upL', 'upR', 'foL', 'foR'], []],
      ['head',  'torso', [236, 215], [('box', (130, 0, 345, 232))], [], []],
      ['upL',   'torso', [72, 352],  [band((72, 352), (58, 512), 52, -0.08, 1.04)], [], []],
      ['foL',   'upL',   [58, 512],  [band((58, 512), (44, 870), 62, -0.1, 1.05)], [], []],
      ['upR',   'torso', [402, 352], [band((402, 352), (416, 512), 52, -0.08, 1.04)], [], []],
      ['foR',   'upR',   [416, 512], [band((416, 512), (430, 870), 62, -0.1, 1.05)], [], []],
    ],
    'tips': {'foL': [44, 800], 'foR': [430, 800]},   # palm centres
    'eyes': {'head': [[200, 101], [270, 101]]},
  },
  # ── the guest singer (joins some songs at the microphone), front view ──
  'singer': {
    'src': 'singer.webp', 'k': 0.255, 'anchor': [305, 1062],
    'erase': [[(282, 548), (330, 548), (322, 980), (290, 980)]],   # background pocket between the legs
    'parts': [
      ['legs',  None,    [305, 470], [('box', (190, 455, 420, 1067))], ['upL', 'foL', 'upR', 'foR'], []],
      ['torso', 'legs',  [305, 470], [('box', (150, 215, 460, 520))], ['upL', 'upR', 'foL', 'foR'], [[222, 268, 22], [388, 268, 22]]],
      ['head',  'torso', [305, 225], [('box', (210, 0, 400, 240))], [], []],
      ['upL',   'torso', [222, 268], [band((222, 268), (168, 425), 40, -0.1, 1.04)], [], []],
      ['foL',   'upL',   [168, 425], [band((168, 425), (40, 615), 52, -0.08, 1.1)], [], []],
      ['upR',   'torso', [388, 268], [band((388, 268), (440, 425), 40, -0.1, 1.04)], [], []],
      ['foR',   'upR',   [440, 425], [band((440, 425), (575, 615), 52, -0.08, 1.1)], [], []],
    ],
    'tips': {'foL': [70, 585], 'foR': [545, 585]},
    'eyes': {'head': [[307, 182]]},
  },
}

def load(path):
    im = Image.open(path).convert('RGBA')
    return np.array(im).astype(np.float32)

def shape_mask(shape, h, w):
    kind, p = shape
    if kind == 'box':
        m = np.zeros((h, w), bool); x0, y0, x1, y1 = p; m[max(0, y0):y1, max(0, x0):x1] = True; return m
    if kind == 'poly':
        im = Image.new('L', (w, h), 0); ImageDraw.Draw(im).polygon([tuple(q) for q in p], fill=255); return np.array(im) > 0
    if kind == 'band':
        ax, ay, bx, by, r, t0, t1 = p
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
        t = ((xx - ax) * dx + (yy - ay) * dy) / L2
        d = np.abs((xx - ax) * dy - (yy - ay) * dx) / np.sqrt(L2)
        return (t >= t0) & (t <= t1) & (d < r)
    raise ValueError(kind)

def disc(h, w, cx, cy, r):
    yy, xx = np.mgrid[0:h, 0:w]
    return (xx - cx) ** 2 + (yy - cy) ** 2 < r * r

def defringe(rgba):
    """Vision lifts a pale halo of the grey card with the figure: pull the edge in by ~2 px,
    feather 1 px, and bleed interior colour outward so no grey shows on dark stages."""
    a = rgba[..., 3] / 255.0
    solid = a > 0.5
    core = nd.binary_erosion(solid, iterations=2)
    soft = nd.gaussian_filter(core.astype(np.float32), 0.8)
    alpha = np.clip(soft * 1.15, 0, 1) * (a > 0.02)
    # colour bleed: every pixel takes the colour of the nearest core pixel when near the edge
    idx = nd.distance_transform_edt(~core, return_distances=False, return_indices=True)
    rgb = rgba[..., :3].copy()
    edge = ~nd.binary_erosion(core, iterations=1)
    rgb[edge] = rgba[..., :3][idx[0], idx[1]][edge]
    out = np.dstack([rgb, alpha * 255])
    return out

def build(name, spec):
    src = load(os.path.join(CUT, spec['src']))
    for poly in spec.get('erase', []):
        h, w = src.shape[:2]
        m = shape_mask(('poly', poly), h, w)
        neutral = (np.abs(src[..., 0] - src[..., 1]) < 10) & (np.abs(src[..., 1] - src[..., 2]) < 10) & (src[..., :3].mean(2) > 170)
        src[m & neutral, 3] = 0
    a0 = src[..., 3] > 127
    near = nd.binary_dilation(~a0, iterations=6) & a0
    pale = (np.abs(src[..., 0] - src[..., 1]) < 12) & (np.abs(src[..., 1] - src[..., 2]) < 12) & (src[..., :3].mean(2) > 178)
    lab, n = nd.label(near & pale)
    if n:
        sz = nd.sum(np.ones(lab.shape), lab, range(1, n + 1))
        src[np.isin(lab, np.where(sz >= 12)[0] + 1), 3] = 0
    src = defringe(src)
    h, w = src.shape[:2]
    fg = src[..., 3] > 0
    shapes = {}
    for pn, parent, pivot, sh, minus, plus in spec['parts']:
        m = np.zeros((h, w), bool)
        for s in sh: m |= shape_mask(s, h, w)
        shapes[pn] = m
    scale = spec['k'] * PX_PER_UNIT
    pieces = []
    for pn, parent, pivot, sh, minus, plus in spec['parts']:
        m = shapes[pn].copy()
        for o in minus: m &= ~(shapes[o] if isinstance(o, str) else shape_mask(o, h, w))
        for cx, cy, r in plus: m |= disc(h, w, cx, cy, r)
        m &= fg
        if not m.any(): print('empty part', name, pn); sys.exit(2)
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = src[y0:y1, x0:x1].copy(); crop[..., 3] *= nd.gaussian_filter(m[y0:y1, x0:x1].astype(np.float32), 0.6)
        pieces.append((pn, parent, pivot, (x0, y0), crop))
    for en, e in spec.get('extra', {}).items():
        im = load(os.path.join(CUT, e['src']))
        im = defringe(im)
        if e.get('flip'): im = im[:, ::-1].copy()
        pv = list(e['pivot'])
        if e.get('flip'): pv[0] = im.shape[1] - pv[0]
        pieces.append((en, 'torso', pv, (0, 0), im, e['scale'], e['attach']))
    # pack (shelf) at atlas scale
    imgs = []
    for p in pieces:
        pn, parent, pivot, (ox, oy), crop = p[:5]
        es = p[5] if len(p) > 5 else 1.0
        att = p[6] if len(p) > 6 else None
        s = scale * es
        pim = Image.fromarray(np.clip(crop, 0, 255).astype(np.uint8), 'RGBA')
        tw, th = max(1, round(pim.width * s)), max(1, round(pim.height * s))
        pim = pim.resize((tw, th), Image.LANCZOS)
        imgs.append((pn, parent, pivot, ox, oy, es, pim, att))
    W = 1024 if max(i[6].width for i in imgs) < 1000 else 2048
    x = y = rowh = 0; pos = {}
    for it in sorted(imgs, key=lambda i: -i[6].height):
        im = it[6]
        if x + im.width + 2 > W: x = 0; y += rowh + 2; rowh = 0
        pos[it[0]] = (x, y); x += im.width + 2; rowh = max(rowh, im.height)
    H = y + rowh
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    meta = {'k': spec['k'], 'atlasScale': scale, 'anchor': spec['anchor'], 'parts': {}, 'order': [i[0] for i in imgs]}
    for pn, parent, pivot, ox, oy, es, im, att in imgs:
        ax, ay = pos[pn]; atlas.paste(im, (ax, ay))
        meta['parts'][pn] = {'x': ax, 'y': ay, 'w': im.width, 'h': im.height, 'ox': int(ox), 'oy': int(oy), 's': es,
                             'px': pivot[0], 'py': pivot[1], 'parent': parent}
        if att: meta['parts'][pn]['attach'] = att
    for k2 in ('tips', 'eyes'):
        if k2 in spec: meta[k2] = spec[k2]
    os.makedirs(OUT, exist_ok=True)
    atlas.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=90, method=6)
    print(name, 'atlas', W, H, 'parts', len(imgs))
    return meta

if __name__ == '__main__':
    rig = {n: build(n, s) for n, s in ROBOTS.items()}
    with open(os.path.join(OUT, 'rig.js'), 'w') as f:
        f.write('// generated by art-src/speakeasy/robots/build.py — robot cut-out rigs (source-frame parts)\n')
        f.write('window.SPEAK_RIG = ' + json.dumps(rig, separators=(',', ':')) + ';\n')
