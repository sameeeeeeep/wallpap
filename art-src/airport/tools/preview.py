# preview.png: plate thumbnails + a staged day scene using layout.json (scales, paths, stands, occluders)
# + a strip of every sprite. Also writes raw/preview-dusk.png / raw/preview-night.png (same staging).
import json, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
L = json.load(open(f'{ROOT}/layout.json'))
FW, FH = L['plate']['size']; SC = L['scale']

def ppm(ny): return SC['K'] * max(0.0, ny - SC['horizon_y']) ** SC['P']
def interp(poly, t):  # point at fraction t along a polyline (by length)
    P = np.array(poly); seg = np.hypot(*np.diff(P, axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)]); d = t * cum[-1]
    i = min(np.searchsorted(cum, d) - 1, len(seg) - 1); i = max(i, 0); f = (d - cum[i]) / seg[i]
    return list(P[i] + (P[i + 1] - P[i]) * f)

def sprite(key, mirror=False, tint=None):
    m = L['sprites'][key]; im = Image.open(f"{ROOT}/{m['file']}").convert('RGBA')
    if mirror: im = ImageOps.mirror(im)
    return im, m

def place(canvas, key, ground, pos=None, mirror=False, shadow=True, light=None):
    """ground: [nx, ny] ground point (scale + shadow); pos: where the sprite's anchor goes (airborne) else ground."""
    im, m = sprite(key, mirror)
    s = ppm(ground[1]) / m['sprite_px_per_m']
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    im = im.resize((w, h), Image.LANCZOS)
    if light is not None: im = light(im)
    p = pos or ground
    x = round(p[0] * FW - w * m['anchor'][0]); y = round(p[1] * FH - h * m['anchor'][1])
    if shadow:
        sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
        gx, gy = ground[0] * FW, ground[1] * FH; rw = w * 0.42; rh = max(2, h * 0.07)
        d.ellipse([gx - rw + w * 0.05, gy - rh, gx + rw + w * 0.05, gy + rh], fill=(0, 0, 0, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(max(1.5, h * 0.04)))
        canvas.alpha_composite(sh)
    canvas.alpha_composite(im, (x, y))
    return ground[1]

def stage(plate_name, light=None):
    plate = Image.open(f'{ROOT}/{plate_name}').convert('RGBA'); cv = plate.copy()
    st = {s['id']: s for s in L['stands']}; R = L['runway']; T = L['taxiways']; PA = L['paths']
    items = []   # (ground_y, callable)
    def add(key, _unused, g, **k): items.append((g[1], lambda: place(cv, key, g, light=light, **k)))
    # runway: landing a320 just after touchdown, b787 rolling out, atr72 climbing out
    td = R['touchdown']; add('a320-side', None, [td[0] + 0.03, interp(R['centreline'], 0.235)[1]], mirror=True)
    add('b787-side', None, interp(R['centreline'], 0.62), mirror=True)
    cg = PA['climb_out']; gy = PA['climb_out_ground_y']
    items.append((0, lambda: place(cv, 'atr72-side-gear-up', [cg[3][0], gy[3]], pos=cg[3], mirror=True, shadow=False, light=light)))
    # approach: e175 far out on final (small, from the left)
    ap = PA['approach']; agy = PA['approach_ground_y']
    items.append((0, lambda: place(cv, 'e175-side', [ap[2][0], agy[2]], pos=[0.035, ap[2][1] + 0.005], mirror=True, shadow=False, light=light)))
    # taxiing west on A
    add('e175-side', None, interp(T['A'], 0.42))
    add('a320-q-rear', None, interp(T['A'], 0.16))
    # stands
    for sid, key in [('S2', 'atr72-side'), ('S3', 'e175-side'), ('S4', 'a320-side'), ('S6', 'b787-side')]:
        s = st[sid]; m = L['sprites'][key]
        # nose at the stop bar: shift the sprite so its LEFT end sits at the nose point
        im_w = m['size'][0] * ppm(s['nose'][1]) / m['sprite_px_per_m']
        g = [s['nose'][0] + im_w * 0.5 / FW - 0.004, s['nose'][1]]
        add(key, None, g)
    # an aircraft taxiing in on the apron taxilane toward S5, three-quarter front
    add('a320-q-front', None, interp(T['apron_taxilane'], 0.62))
    # ground vehicles
    s6 = st['S6']; s5 = st['S5']
    add('tug-side', None, [s6['nose'][0] - 0.035, s6['nose'][1] + 0.012])
    add('fuel-truck-side', None, [s5['nose'][0] + 0.02, s5['nose'][1] + 0.025])
    add('baggage-train-side', None, [0.34, 0.86])
    add('follow-me-side', None, interp(T['apron_taxilane'], 0.45))
    items.sort(key=lambda t: t[0])
    occ = sorted(L['occluders']['items'], key=lambda o: o['base_y'])
    # paint back-to-front; after every sprite, re-draw occluders whose base is nearer than that sprite
    for gy_, fn in items:
        fn()
        for o in occ:
            if o['base_y'] > gy_:
                mk = Image.open(f"{ROOT}/{o['file']}")
                cv.paste(plate, (0, 0), mk)
    return cv.convert('RGB')

def dusk_light(im):
    a = np.asarray(im).astype(float); a[..., :3] *= [1.05, 0.78, 0.55]; return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
def night_light(im):
    a = np.asarray(im).astype(float); a[..., :3] *= [0.22, 0.24, 0.32]; return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

day = stage('plate-day.png')
day.save(f'{ROOT}/raw/preview-day-full.png')
stage('plate-dusk.png', dusk_light).resize((1280, 800), Image.LANCZOS).save(f'{ROOT}/raw/preview-dusk.png')
stage('plate-night.png', night_light).resize((1280, 800), Image.LANCZOS).save(f'{ROOT}/raw/preview-night.png')

# ---- contact sheet
W = 2000; thumbs = [Image.open(f'{ROOT}/plate-{n}.png').convert('RGB').resize((490, 306), Image.LANCZOS) for n in ['day', 'dusk', 'night', 'overcast']]
main = day.resize((W, 1250), Image.LANCZOS)
keys = sorted(L['sprites']); cols = 8; cell = (250, 130); rows = math.ceil(len(keys) / cols)
sheet = Image.new('RGB', (W, 306 + 20 + 1250 + 20 + rows * cell[1] + 10), (24, 26, 30))
for i, t in enumerate(thumbs): sheet.paste(t, (i * 503 + 3, 3))
sheet.paste(main, (0, 326))
d = ImageDraw.Draw(sheet); y0 = 326 + 1250 + 20
for i, k in enumerate(keys):
    im = Image.open(f"{ROOT}/{L['sprites'][k]['file']}").convert('RGBA'); im.thumbnail((cell[0] - 20, cell[1] - 30), Image.LANCZOS)
    cx, cy = (i % cols) * cell[0], y0 + (i // cols) * cell[1]
    bg = Image.new('RGBA', im.size, (60, 66, 76, 255)); bg.alpha_composite(im)
    sheet.paste(bg.convert('RGB'), (cx + (cell[0] - im.width) // 2, cy + 4))
    d.text((cx + 8, cy + cell[1] - 22), k, fill=(200, 200, 200))
sheet.save(f'{ROOT}/preview.png', optimize=True)
print('preview.png', sheet.size)
