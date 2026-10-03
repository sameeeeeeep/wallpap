# plate-scene steps after generation: build (align + crop + upscale), masks, cut, check, pack.  Called by plate.py.
import json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as nd
from plate import art, load, ROOT, HERE, VARIANTS

FULL = (2560, 1600)   # master plate size (16:10). Codex gives 1536x1024 (3:2): crop sky to 16:10, Lanczos x1.667


def rgb(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
def save(a, p, mode=None):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), mode); im.save(p, optimize=True); return im


# ─── align: warp a relit/keyed edit onto the day plate (Codex edits re-frame by a few to ~60 px) ─────────────────
# Tile phase-correlation on normalised gradient images (featureless tiles — plain sky, flat key colour — are skipped)
# → robust quadratic displacement field → cubic resample. Same method as art-src/airport/tools/align.py, generalised.
def _grad(a):
    a = a.mean(2) if a.ndim == 3 else a
    m = nd.uniform_filter(a, 31); s = np.sqrt(nd.uniform_filter((a - m) ** 2, 31)) + 4
    a = (a - m) / s
    return np.hypot(nd.sobel(a, 1), nd.sobel(a, 0))


def _phase(a, b):
    A, B = np.fft.fft2(a), np.fft.fft2(b); R = A * np.conj(B); R /= np.abs(R) + 1e-9
    r = np.real(np.fft.ifft2(R)); i = np.unravel_index(np.argmax(r), r.shape); peak = r[i] / (r.std() + 1e-9)
    out = []
    for k in (0, 1):
        sh = i[k] if i[k] < r.shape[k] // 2 else i[k] - r.shape[k]
        idx = list(i); m = r.shape[k]; idx[k] = (i[k] - 1) % m; l = r[tuple(idx)]; idx[k] = (i[k] + 1) % m; rr = r[tuple(idx)]
        den = l - 2 * r[i] + rr; out.append(sh + (0.5 * (l - rr) / den if den != 0 else 0))
    return out[0], out[1], peak


def align(day, var, ignore=None, log=print):
    """day, var: float RGB arrays (same size). ignore: bool mask of day pixels to skip (e.g. keyed region). → warped var"""
    G1, G2 = _grad(day), _grad(var); H, W = G1.shape; T = 128; win = np.outer(np.hanning(T), np.hanning(T)); pts = []
    for y in range(0, H - T + 1, 48):
        for x in range(0, W - T + 1, 48):
            a, b = G1[y:y + T, x:x + T], G2[y:y + T, x:x + T]
            if a.std() < 0.3 or b.std() < 0.3: continue
            if ignore is not None and ignore[y:y + T, x:x + T].mean() > 0.25: continue
            dy, dx, pk = _phase(a * win, b * win)
            if pk > 12 and abs(dx) < 80 and abs(dy) < 80: pts.append((x + T / 2, y + T / 2, dx, dy))
    P = np.array(pts)
    if len(P) < 12: log(f'  align: only {len(P)} tiles — left as is'); return var
    basis = lambda x, y: np.stack([np.ones_like(x), x / W, y / H, (x / W) ** 2, x * y / W / H, (y / H) ** 2], -1)
    keep = np.ones(len(P), bool)
    for _ in range(6):
        B = basis(P[keep, 0], P[keep, 1])
        cx = np.linalg.lstsq(B, P[keep, 2], rcond=None)[0]; cy = np.linalg.lstsq(B, P[keep, 3], rcond=None)[0]
        Ba = basis(P[:, 0], P[:, 1]); res = np.hypot(Ba @ cx - P[:, 2], Ba @ cy - P[:, 3])
        keep = res < max(1.0, 2.5 * np.median(res[keep]))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # outside the measured tiles (plain sky…) hold the field at the nearest measured row instead of extrapolating
    y0, y1 = P[keep, 1].min(), P[keep, 1].max()
    ys = np.clip(yy, y0, y1); Bf = basis(xx.ravel(), ys.ravel())
    DX = (Bf @ cx).reshape(H, W); DY = (Bf @ cy).reshape(H, W)
    log(f'  align: {len(P)} tiles, {keep.sum()} inliers, residual {np.median(res[keep]):.2f}px, '
        f'dx {DX.min():.1f}..{DX.max():.1f} dy {DY.min():.1f}..{DY.max():.1f}')
    return np.stack([nd.map_coordinates(var[..., c], [yy - DY, xx - DX], order=3, mode='nearest') for c in range(3)], -1)


def _crop(im, ratio=1.6):
    """3:2 → 16:10 by cropping the top (sky). Returns (image, top_px)."""
    w, h = im.size; nh = round(w / ratio)
    if nh >= h: return im, 0
    top = h - nh; return im.crop((0, top, w, h)), top


def _keyed(a):
    """Greenness of a chroma-key (#00FF00) edit, 0..1."""
    g = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    return np.clip((g - 70) / 90, 0, 1) * (a[..., 1] > 120)


# ─── build ──────────────────────────────────────────────────────────────────────────────────────────────────────
def build(sid, rest):
    spec = load(sid); raw = art(sid, 'raw'); day = rgb(f'{raw}/plate-day.png'); H, W = day.shape[:2]
    os.makedirs(f'{raw}/aligned', exist_ok=True)
    sharp = spec.get('unsharp', 45 if spec.get('style', 'photo') == 'photo' else 25)
    names = [f'plate-{v}' for v in VARIANTS if os.path.exists(f'{raw}/plate-{v}.png')] + \
            [f'key-{k}' for k in spec.get('keys', {}) if os.path.exists(f'{raw}/key-{k}.png')]
    for n in names:
        if rest and n.split('-', 1)[1] not in rest: continue
        src = f'{raw}/{n}.png'
        if n != 'plate-day':
            v = Image.open(src).convert('RGB')
            if v.size != (W, H): v = v.resize((W, H), Image.LANCZOS)
            va = np.asarray(v).astype(np.float32)
            print(n); al = align(day, va, ignore=_keyed(va) > 0.3 if n.startswith('key-') else None)
            src = f'{raw}/aligned/{n}.png'; save(al, src)
        im, top = _crop(Image.open(src).convert('RGB'))
        if n.startswith('key-'):   # keys stay at working res (masks are derived from them)
            im.save(f'{raw}/aligned/{n}-crop.png'); continue
        im = im.resize(FULL, Image.LANCZOS)
        if sharp: im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=sharp, threshold=2))
        os.makedirs(art(sid, 'plates'), exist_ok=True); im.save(art(sid, 'plates', n + '.png'), optimize=True)
        print('  wrote plates/%s.png (crop top %d px)' % (n, top))


# ─── masks ──────────────────────────────────────────────────────────────────────────────────────────────────────
def guided(I, p, r=6, eps=2e-3):
    """Guided filter (He et al.): snaps a rough mask p to the edges of guide image I (grey 0..1)."""
    f = lambda x: nd.uniform_filter(x, 2 * r + 1)
    mI, mp = f(I), f(p); a = (f(I * p) - mI * mp) / (f(I * I) - mI * mI + eps); b = mp - a * mI
    return np.clip(f(a) * I + f(b), 0, 1)


def clean(m, min_area=60, hole=60):
    b = m > 0.5
    lab, n = nd.label(b); s = nd.sum(b, lab, range(1, n + 1)); b = np.isin(lab, np.where(s >= min_area)[0] + 1)
    lab, n = nd.label(~b); s = nd.sum(~b, lab, range(1, n + 1)); b |= np.isin(lab, np.where(s < hole)[0] + 1)
    return b


def sky_heuristic(day):
    """Plain-gradient sky: smooth, low-texture pixels close to a per-row sky colour, connected to the top edge."""
    H, W = day.shape[:2]; g = day.mean(2)
    tex = np.sqrt(np.maximum(nd.uniform_filter(g * g, 7) - nd.uniform_filter(g, 7) ** 2, 0))
    top = day[:max(8, H // 30)].reshape(-1, 3).mean(0)
    sky = np.zeros((H, W), bool); ref = np.tile(top, (W, 1))
    for y in range(H):   # walk down, updating the expected colour from the sky found in the row above
        d = np.abs(day[y] - ref).max(1); cand = (d < 22) & (tex[y] < 3.0)
        if y == 0: sky[y] = cand
        else: sky[y] = cand & (sky[y - 1] | np.roll(sky[y - 1], 1) | np.roll(sky[y - 1], -1))
        if sky[y].sum() > 8: ref = np.where(sky[y][:, None], day[y], np.tile(day[y][sky[y]].mean(0), (W, 1)))
    lab, n = nd.label(sky); keep = np.unique(lab[0]); keep = keep[keep > 0]
    return np.isin(lab, keep).astype(np.float32)


def masks(sid, rest):
    spec = load(sid); raw = art(sid, 'raw'); out = art(sid, 'masks'); os.makedirs(out, exist_ok=True)
    day = np.asarray(Image.open(art(sid, 'plates', 'plate-day.png')).convert('RGB')).astype(np.float32)
    work = (1280, 800); dW = np.asarray(Image.fromarray(day.astype(np.uint8)).resize(work, Image.LANCZOS)).astype(np.float32)
    guide = dW.mean(2) / 255
    M = {}
    for name in spec.get('keys', {}):
        p = f'{raw}/aligned/key-{name}-crop.png'
        if not os.path.exists(p): print('  (no key for', name + ')'); continue
        k = np.asarray(Image.open(p).convert('RGB').resize(work, Image.LANCZOS)).astype(np.float32)
        m = clean(_keyed(k), 80, 80).astype(np.float32)
        M[name] = m
    if 'sky' not in M: M['sky'] = sky_heuristic(dW); print('  sky: heuristic (no key)')
    # sky: only what is connected to the top edge (keys sometimes spill green into reflections)
    lab, n = nd.label(M['sky'] > 0.5); keep = np.unique(lab[:3]); keep = keep[keep > 0]; M['sky'] = np.isin(lab, keep).astype(np.float32)
    for c in spec.get('mask_ops', []):   # e.g. {"name": "water", "minus": ["sky"]} / {"name": "exposed", "union": [...], "invert": true}
        m = M.get(c['name'], np.zeros_like(M['sky']))
        for u in c.get('union', []): m = np.maximum(m, M[u])
        for u in c.get('minus', []): m = m * (1 - M[u])
        if c.get('below') is not None: m[: int(c['below'] * work[1])] = 0
        if c.get('invert'): m = 1 - m
        M[c['name']] = m
    for name, m in M.items():
        r = spec.get('feather', {}).get(name, 1.2)
        m = guided(guide, m, 4, 1e-3) if name in ('sky', 'foliage', 'grass') else m
        m = nd.gaussian_filter(m, r)
        save(m * 255, f'{out}/{name}.png', 'L'); print(f'  masks/{name}.png  cover {m.mean() * 100:.1f}%')
    emissive(sid, spec)


def emissive(sid, spec):
    """emissive.png = what the night plate has that daylight doesn't (lit windows, lamps), cleaned; lights.json = blobs."""
    pn = art(sid, 'plates', 'plate-night.png')
    if not os.path.exists(pn): return
    d = rgb(art(sid, 'plates', 'plate-day.png')); n = rgb(pn)
    k = spec.get('emissive', {}); gain, sub, floor = k.get('gain', 1.4), k.get('day', 0.5), k.get('floor', 16)
    em = np.clip(n - d * sub - floor, 0, 255) * gain
    lum = em.max(2)
    # keep compact lights, drop broad soft washes (moonlit marble, a sky gradient): subtract a wide local mean
    broad = nd.uniform_filter(lum, 41)
    keep = np.clip((lum - broad * k.get('broad', 1.0) - 6) / 30, 0, 1)
    sky = np.asarray(Image.open(art(sid, 'masks', 'sky.png')).resize(FULL, Image.BILINEAR)).astype(np.float32) / 255
    em = em * keep[..., None] * (1 - sky[..., None])
    wm = art(sid, 'masks', 'water.png')
    if os.path.exists(wm) and k.get('water', 0) < 1:   # reflections stay in the (shimmering) night plate, not the static emissive
        w = np.asarray(Image.open(wm).resize(FULL, Image.BILINEAR)).astype(np.float32) / 255
        em = em * (1 - w[..., None] * (1 - k.get('water', 0)))
    save(em, art(sid, 'masks', 'emissive.png')); print(f'  masks/emissive.png  lit {(em.max(2) > 20).mean() * 100:.2f}%')
    # blobs → lights.json (plate 0..1 coords): windows/lamps for twinkle and fog/rain halos
    L = em.max(2); b = L > k.get('blob', 60); lab, nb = nd.label(b)
    if not nb: return
    idx = range(1, nb + 1); area = nd.sum(b, lab, idx); com = nd.center_of_mass(L, lab, idx); peak = nd.maximum(L, lab, idx)
    lights = []
    for a, c, p, i in zip(area, com, peak, idx):
        if a < 2 or a > k.get('blob_max', 900): continue
        ys, xs = np.where(lab == i) if a < 40 else (None, None)
        col = em[int(c[0]), int(c[1])] / max(1, em[int(c[0]), int(c[1])].max())
        lights.append([round(c[1] / FULL[0], 5), round(c[0] / FULL[1], 5), round(float(np.sqrt(a / np.pi)) / FULL[0], 5), round(float(p) / 255, 3), [round(float(v), 2) for v in col]])
    lights.sort(key=lambda l: -l[3])
    json.dump({'about': '[nx, ny, radius (0..1 of width), brightness 0..1, rgb] — compact lights found in night − day', 'lights': lights[:k.get('max_lights', 600)]},
              open(art(sid, 'masks', 'lights.json'), 'w'))
    print(f'  masks/lights.json  {len(lights)} lights')


# ─── cut ────────────────────────────────────────────────────────────────────────────────────────────────────────
def cut_sheet(src, outdir, prefix, n=None, min_frac=0.12):
    """Cut a sprite sheet on a flat grey (#e6e6e6) or chroma-green background → <prefix>-<i>.png, row-major order.
    Background = border-connected near-bg colour; soft edges are un-mixed (no halo); green spill is removed."""
    im = rgb(src); h, w, _ = im.shape
    border = np.concatenate([im[:4].reshape(-1, 3), im[-4:].reshape(-1, 3), im[:, :4].reshape(-1, 3), im[:, -4:].reshape(-1, 3)])
    bg = np.median(border, 0); green = bg[1] > 150 and bg[1] - max(bg[0], bg[2]) > 60
    if green:
        g = im[..., 1] - np.maximum(im[..., 0], im[..., 2])           # classic chroma key with soft alpha
        alpha = 1 - np.clip((g - 18) / 110, 0, 1)
        fg = alpha > 0.5
    else:
        dist = np.abs(im - bg).max(2); bgl = dist < 14
        lab, _ = nd.label(bgl); edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); edge = edge[edge > 0]
        fg = ~np.isin(lab, edge); alpha = np.clip((dist - 5) / 20, 0, 1)
        inner = nd.binary_erosion(fg, iterations=2); alpha = np.where(inner, 1, np.where(fg, np.maximum(alpha, 0.0), 0))
    fg = nd.binary_opening(fg, iterations=1)
    lab2, nn = nd.label(nd.binary_dilation(fg, iterations=3), structure=np.ones((3, 3)))
    sizes = nd.sum(fg, lab2, range(1, nn + 1)); order = np.argsort(sizes)[::-1]
    keep = [i + 1 for i in order if sizes[i] >= sizes[order[0]] * min_frac][: (n or 999)]
    objs = nd.find_objects(lab2)
    # row-major: group by vertical centre into rows
    cents = {k: ((objs[k - 1][0].start + objs[k - 1][0].stop) / 2, (objs[k - 1][1].start + objs[k - 1][1].stop) / 2) for k in keep}
    rows = []
    for k in sorted(keep, key=lambda k: cents[k][0]):
        if rows and abs(cents[k][0] - np.mean([cents[j][0] for j in rows[-1]])) < h * 0.12: rows[-1].append(k)
        else: rows.append([k])
    seq = [k for r in rows for k in sorted(r, key=lambda k: cents[k][1])]
    os.makedirs(outdir, exist_ok=True); out = []
    for i, k in enumerate(seq, 1):
        sl = objs[k - 1]; y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        m = lab2[y0:y1, x0:x1] == k; a = np.where(m, alpha[y0:y1, x0:x1], 0)
        P = im[y0:y1, x0:x1]; aa = np.clip(a, 1e-3, 1)[..., None]
        C = np.clip((P - (1 - aa) * bg) / aa, 0, 255); C = np.where(a[..., None] >= 0.999, P, C)
        if green:  # despill: green can't exceed the other two by much
            C[..., 1] = np.minimum(C[..., 1], np.maximum(C[..., 0], C[..., 2]) * 1.02 + 6)
        rgba = np.dstack([C, a * 255]).astype(np.uint8); ys, xs = np.where(rgba[..., 3] > 8)
        rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(rgba).save(f'{outdir}/{prefix}-{i}.png'); out.append(f'{prefix}-{i}.png {rgba.shape[1]}x{rgba.shape[0]}')
    return out


def cut(sid, rest):
    spec = load(sid)
    for name, sh in spec.get('sheets', {}).items():
        if rest and name not in rest: continue
        src = art(sid, 'sheets', name + '.png')
        if not os.path.exists(src): print('  (no sheet', name + ')'); continue
        r = cut_sheet(src, art(sid, 'sprites'), name, sh.get('n'), sh.get('min_frac', 0.12))
        print(f'{name}: {len(r)} sprites —', ', '.join(r))


# ─── check: draw layout.json over the plates ────────────────────────────────────────────────────────────────────
def check(sid, rest):
    p = art(sid, 'layout.json'); J = json.load(open(p)) if os.path.exists(p) else {}
    for v in ['day', 'night']:
        src = art(sid, 'plates', f'plate-{v}.png')
        if not os.path.exists(src): continue
        im = Image.open(src).convert('RGB'); W, H = im.size; d = ImageDraw.Draw(im, 'RGBA')
        try: font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 22)
        except Exception: font = None
        for i in range(1, 10):   # 0.1 grid
            d.line([(W * i / 10, 0), (W * i / 10, H)], fill=(255, 255, 255, 50)); d.line([(0, H * i / 10), (W, H * i / 10)], fill=(255, 255, 255, 50))
            d.text((W * i / 10 + 4, 4), f'{i / 10:.1f}', fill=(255, 255, 255, 200), font=font); d.text((4, H * i / 10 + 4), f'{i / 10:.1f}', fill=(255, 255, 255, 200), font=font)
        d.rectangle([W * 0.72, 0, W, H], outline=(255, 80, 80, 160), width=3)   # widget zone
        cols = [(255, 220, 0), (0, 220, 255), (255, 0, 200), (120, 255, 80), (255, 140, 0), (180, 120, 255)]
        for i, (name, pts) in enumerate((J.get('paths') or {}).items()):
            c = cols[i % len(cols)]; P = [(x * W, y * H) for x, y in pts]
            d.line(P, fill=c + (230,), width=4)
            for q in P: d.ellipse([q[0] - 5, q[1] - 5, q[0] + 5, q[1] + 5], fill=c + (255,))
            d.text((P[0][0] + 8, P[0][1] - 26), name, fill=c + (255,), font=font)
        for name, pts in (J.get('points') or {}).items():
            for q in (pts if isinstance(pts[0], list) else [pts]):
                d.ellipse([q[0] * W - 7, q[1] * H - 7, q[0] * W + 7, q[1] * H + 7], outline=(255, 255, 255, 255), width=3)
            q = pts[0] if isinstance(pts[0], list) else pts; d.text((q[0] * W + 10, q[1] * H), name, fill=(255, 255, 255, 255), font=font)
        sky = art(sid, 'masks', 'sky.png')
        if os.path.exists(sky):   # sky-mask edge in cyan
            m = np.asarray(Image.open(sky).resize((W, H))) > 127; e = m ^ nd.binary_erosion(m, iterations=2)
            a = np.asarray(im).copy(); a[e] = [0, 255, 255]; im = Image.fromarray(a)
        im.save(art(sid, f'check-{v}.png')); print('wrote', f'art-src/{sid}/check-{v}.png')


# ─── pack: → addons/<id>/art/ ───────────────────────────────────────────────────────────────────────────────────
def pack(sid, rest):
    spec = load(sid); dst = os.path.join(ROOT, 'addons', sid, 'art'); os.makedirs(dst, exist_ok=True)
    q, size = spec.get('jpeg', 84), tuple(spec.get('ship_size', FULL))
    for v in VARIANTS:
        s = art(sid, 'plates', f'plate-{v}.png')
        if os.path.exists(s):
            Image.open(s).convert('RGB').resize(size, Image.LANCZOS).save(f'{dst}/plate-{v}.jpg', quality=q, optimize=True, progressive=True)
    for f in sorted(os.listdir(art(sid, 'masks'))):
        s = art(sid, 'masks', f)
        if f == 'emissive.png': Image.open(s).convert('RGB').resize(size, Image.LANCZOS).save(f'{dst}/emissive.jpg', quality=90, optimize=True)
        elif f.endswith('.png'): Image.open(s).convert('L').save(f'{dst}/{f}', optimize=True)
        elif f.endswith('.json'): shutil.copy(s, f'{dst}/{f}')
    # atlas: spec.atlas = {"name": {"src": "sprites/x-1.png", "max": 256}} → atlas.png + atlas.json {name: [x, y, w, h]}
    A = spec.get('atlas', {})
    if A:
        ims = {}
        for name, a in A.items():
            im = Image.open(art(sid, a['src'])).convert('RGBA'); m = a.get('max', 256); s = min(1, m / max(im.size))
            if a.get('flip'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
            ims[name] = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS) if s < 1 else im
        PAD, AW = 6, 2048; x = y = rowh = 0; fr = {}
        for name, im in sorted(ims.items(), key=lambda kv: -kv[1].height):
            if x + im.width + PAD * 2 > AW: x = 0; y += rowh + PAD * 2; rowh = 0
            fr[name] = [x + PAD, y + PAD, im.width, im.height]; x += im.width + PAD * 2; rowh = max(rowh, im.height)
        at = Image.new('RGBA', (AW, y + rowh + PAD * 2), (0, 0, 0, 0))
        for name, im in ims.items(): at.paste(im, tuple(fr[name][:2]))
        # bleed the colour of edge texels into the transparent pad (no dark fringes when mip-mapped)
        a = np.asarray(at).astype(np.float32); al = a[..., 3:] / 255
        if (al < 1).any():
            col = a[..., :3] * al; wsum = nd.uniform_filter(al[..., 0], 5); csum = np.stack([nd.uniform_filter(col[..., c], 5) for c in range(3)], -1)
            fill = csum / np.maximum(wsum, 1e-4)[..., None]; a[..., :3] = np.where(al > 0.02, a[..., :3], fill)
        Image.fromarray(a.astype(np.uint8)).save(f'{dst}/atlas.png', optimize=True)
        json.dump(fr, open(f'{dst}/atlas.json', 'w')); print(f'  atlas.png {AW}x{at.height}, {len(fr)} frames')
    if os.path.exists(art(sid, 'layout.json')): shutil.copy(art(sid, 'layout.json'), f'{dst}/layout.json')
    shutil.copy(os.path.join(HERE, 'plate-fx.js'), os.path.join(ROOT, 'addons', sid, 'plate-fx.js'))
    tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(os.path.join(ROOT, 'addons', sid)) for f in fs)
    print(f'packed addons/{sid}: {tot / 1e6:.2f} MB')
