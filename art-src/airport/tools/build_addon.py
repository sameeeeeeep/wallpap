# Builds the shipped art for addons/airport from this folder:
#   plates  → art/plate-{day,dusk,night,overcast}.webp   (2048x1280, lossy)
#   masks   → art/sky.png (L), art/exposed.png (L, kit weather), art/ground.png (RGB: R paved, G apron, B grass)
#   occluders → art/occ/*.png (1280x800 L)
#   sprites → art/atlas.webp + art/atlas.json (frames, metres-per-pixel, light anchors)
#   layout  → art/layout.json (layout.json with file names rewritten; sprites table replaced by atlas.json)
#   debug   → raw/addon-anchors.png, raw/addon-ground.png (QA)
#   python3 art-src/airport/tools/build_addon.py
import json, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SRC))
OUT = os.path.join(ROOT, 'addons', 'airport', 'art')
os.makedirs(os.path.join(OUT, 'occ'), exist_ok=True)
L = json.load(open(f'{SRC}/layout.json'))
PW, PH = 2048, 1280

# ── plates ──
for n in ['day', 'dusk', 'night', 'overcast']:
    im = Image.open(f'{SRC}/plate-{n}.png').convert('RGB').resize((PW, PH), Image.LANCZOS)
    im.save(f'{OUT}/plate-{n}.webp', quality=86, method=6)

# ── occluders ──
occ = {}
for it in L['occluders']['items']:
    m = Image.open(f"{SRC}/{it['file']}").convert('L')
    occ[it['id']] = np.asarray(m.resize((1280, 800), Image.LANCZOS)).astype(float) / 255
    m.resize((1280, 800), Image.LANCZOS).save(f"{OUT}/occ/{it['id']}.png", optimize=True)

# ── masks ──
MW, MH = 1280, 800
sky = Image.open(f'{ROOT}/art-src/kit-addons/plate-demo/sky.png').convert('L').resize((MW, MH), Image.LANCZOS)
sky.save(f'{OUT}/sky.png', optimize=True)
skyA = np.asarray(sky).astype(float) / 255
im = np.asarray(Image.open(f'{SRC}/plate-day.png').convert('RGB').resize((MW, MH), Image.LANCZOS)).astype(float) / 255
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(-1), im.min(-1); sat = (mx - mn) / (mx + 1e-4)
yy, xx = np.mgrid[0:MH, 0:MW] / np.array([MH, MW], float)[:, None, None]
below = yy > 0.379
paved = (sat < 0.16) & below & (g < r + 0.04)
paved = nd.binary_opening(paved, iterations=1)
paved = nd.binary_closing(paved, iterations=3)
lab, n = nd.label(paved); sizes = nd.sum(paved, lab, range(1, n + 1))
paved = np.isin(lab, 1 + np.where(sizes > 3000)[0])
holes = nd.binary_fill_holes(paved) & ~paved; hl, hn = nd.label(holes); hs = nd.sum(holes, hl, range(1, hn + 1))
paved |= np.isin(hl, 1 + np.where(hs < 900)[0])             # markings, not grass islands
building = np.maximum.reduce([occ[k] for k in occ])          # terminal, jet bridges, masts
paved_f = np.clip(nd.gaussian_filter(paved.astype(float), 1.0) - building * 1.5, 0, 1)
# apron polygon (plate coords): everything paved inside it is apron concrete
apron_poly = [(0.0, 0.468), (0.712, 0.81), (0.49, 1.0), (0.0, 1.0)]
pm = Image.new('L', (MW, MH), 0); ImageDraw.Draw(pm).polygon([(x * MW, y * MH) for x, y in apron_poly], fill=255)
apronA = np.asarray(pm).astype(float) / 255 * paved_f
grass = np.clip((1 - nd.gaussian_filter(paved.astype(float), 1.0)) * (yy > 0.37) * (1 - skyA) - building, 0, 1)
ground = np.stack([paved_f, apronA, grass], -1)
Image.fromarray((ground * 255).astype(np.uint8), 'RGB').save(f'{OUT}/ground.png', optimize=True)
# kit 'exposed' (wet darkening + snow): grass/apron/roofs 1, cleared runway & taxiways 0.38, terminal facade 0.5, masts 0
movement = np.clip(paved_f - apronA, 0, 1)
exposed = np.clip((1 - skyA) * (yy > 0.36), 0, 1) * (1 - movement * 0.62)
exposed = exposed * (1 - occ['terminal'] * 0.5) * (1 - np.maximum.reduce([occ[k] for k in occ if k.startswith('mast')]))
Image.fromarray((exposed * 255).astype(np.uint8), 'L').save(f'{OUT}/exposed.png', optimize=True)
dbg = (im * 0.5 + ground * 0.5)
Image.fromarray((np.clip(dbg, 0, 1) * 255).astype(np.uint8)).save(f'{SRC}/raw/addon-ground.png')

# ── sprite atlas + anchors ──
def anchors(a, view):
    """Light anchor points (fractions of the frame, sprite facing as drawn) from the alpha mask."""
    h, w = a.shape; op = a > 0.5
    ys, xs = np.nonzero(op)
    P = {}
    if view.startswith('side'):
        cols = np.nonzero(op.any(0))[0]; x0, x1 = cols[0], cols[-1]
        nose_y = np.nonzero(op[:, x0 + 1])[0].mean()
        c = int(x0 + (x1 - x0) * 0.3); run = np.nonzero(op[:, c])[0]
        # fuselage = the run containing the nose height
        seg = np.split(run, np.where(np.diff(run) > 1)[0] + 1); fus = max(seg, key=lambda s: len(s))
        fT, fB = fus[0], fus[-1]
        rows = np.arange(int(fT), h); tailx = max(np.nonzero(op[r_])[0].max() for r_ in rows if op[r_].any())
        tr = [r_ for r_ in rows if op[r_].any() and np.nonzero(op[r_])[0].max() >= tailx - 2]
        P['nose'] = [x0 / w, nose_y / h]
        P['tail'] = [tailx / w, float(np.mean(tr)) / h]
        P['top'] = [(x0 + (x1 - x0) * 0.45) / w, fT / h]
        P['belly'] = [(x0 + (x1 - x0) * 0.42) / w, fB / h]
        P['land'] = [(x0 + (x1 - x0) * 0.4) / w, (fB - (fB - fT) * 0.15) / h]
        P['taxi'] = [(x0 + (x1 - x0) * 0.1) / w, (fB - (fB - fT) * 0.1) / h]
        P['wing'] = [(x0 + (x1 - x0) * 0.6) / w, (fT + (fB - fT) * 0.7) / h]
        bot = op[int(h * 0.9):, int(x0 + (x1 - x0) * 0.3):]
        gx = np.nonzero(bot.any(0))[0]
        P['gear'] = [((gx.mean() if len(gx) else (x1 - x0) * 0.2) + x0 + (x1 - x0) * 0.3) / w, 0.99]
        P['fin'] = [(x1 - (x1 - x0) * 0.06) / w, ys.min() / h + 0.06]
    else:
        lx = xs.min(); ly = ys[xs == lx].mean()
        sel = ys > h * 0.28; rx = xs[sel].max(); ry = ys[sel][xs[sel] == rx].mean()
        if 'front' in view:
            sel2 = (ys > h * 0.55) & (xs < w * 0.35)
            k_ = np.argmin(xs[sel2] - ys[sel2] * 0.7); nx_, ny_ = xs[sel2][k_], ys[sel2][k_]
            P['nose'] = [nx_ / w, ny_ / h]
            P['wingL'] = [lx / w, ly / h]; P['wingR'] = [rx / w, ry / h]       # front: viewer-left tip = right wing (green)
            P['land'] = [(nx_ + w * 0.06) / w, (ny_ - h * 0.03) / h]
        else:
            k_ = np.argmax(xs + ys * 1.2); P['tail'] = [xs[k_] / w, ys[k_] / h]
            P['wingL'] = [lx / w, ly / h]; P['wingR'] = [rx / w, ry / h]       # rear: viewer-left tip = left wing (red)
        P['top'] = [0.5, ys[np.abs(xs - w * 0.5) < 3].min() / h]
        P['fin'] = [xs[ys == ys.min()].mean() / w, ys.min() / h + 0.04]
    return {k: [round(float(v[0]), 4), round(float(v[1]), 4)] for k, v in P.items()}

TARGET = {'aircraft': 11.5, 'vehicle': 18.0}
items = []
for key, m in sorted(L['sprites'].items()):
    im = Image.open(f"{SRC}/{m['file']}").convert('RGBA')
    kind = 'vehicle' if m['type'] in ('tug', 'baggage-train', 'fuel-truck', 'follow-me') else 'aircraft'
    s = min(1.0, TARGET[kind] / m['sprite_px_per_m'])
    im2 = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    a = np.asarray(im).astype(float)[..., 3] / 255
    items.append(dict(key=key, im=im2, ppm=m['sprite_px_per_m'] * im2.width / im.width, len=m['real_length_m'],
                      anchor=m['anchor'], view=m['view'], type=m['type'], kind=kind,
                      lights=anchors(a, m['view']) if kind == 'aircraft' else {}))
# shelf pack, tallest first
AW, PAD = 2048, 6
items.sort(key=lambda it: -it['im'].height)
x = y = rowH = 0
for it in items:
    w, h = it['im'].size
    if x + w + PAD * 2 > AW: x = 0; y += rowH + PAD * 2; rowH = 0
    it['xy'] = (x + PAD, y + PAD); x += w + PAD * 2; rowH = max(rowH, h)
AH = y + rowH + PAD * 2
atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
for it in items: atlas.alpha_composite(it['im'], it['xy'])
# bleed colour into transparent texels (mips/filtering stay clean even un-premultiplied)
arr = np.asarray(atlas).astype(float); al = arr[..., 3] > 8
idx = nd.distance_transform_edt(~al, return_distances=False, return_indices=True)
rgb = arr[..., :3][idx[0], idx[1]]
atlas = Image.fromarray(np.concatenate([rgb, arr[..., 3:]], -1).astype(np.uint8), 'RGBA')
atlas.save(f'{OUT}/atlas.webp', quality=90, alpha_quality=95, method=6)
frames = {it['key']: {'f': [it['xy'][0], it['xy'][1], it['im'].width, it['im'].height], 'ppm': round(it['ppm'], 4), 'len': it['len'],
                      'anchor': it['anchor'], 'view': it['view'], 'type': it['type'], 'lights': it['lights']} for it in items}
json.dump({'size': [AW, AH], 'frames': frames}, open(f'{OUT}/atlas.json', 'w'), separators=(',', ':'))

# QA: anchors drawn on each aircraft sprite
cell = 300; keys = [it for it in sorted(items, key=lambda i: i['key']) if it['kind'] == 'aircraft']
qa = Image.new('RGB', (cell * 6, cell // 2 * 4 + 20), (40, 55, 80)); d = ImageDraw.Draw(qa)
COL = {'nose': (255, 255, 255), 'tail': (255, 255, 255), 'top': (255, 40, 40), 'belly': (255, 40, 40), 'land': (255, 255, 120), 'taxi': (255, 200, 80),
       'wing': (255, 0, 255), 'wingL': (0, 255, 0), 'wingR': (255, 0, 0), 'gear': (0, 200, 255), 'fin': (200, 200, 255)}
for i, it in enumerate(keys):
    t = it['im'].copy(); t.thumbnail((cell - 10, cell // 2 - 10)); bg = Image.new('RGBA', t.size, (40, 55, 80, 255)); bg.alpha_composite(t)
    ox, oy = (i % 6) * cell + 5, (i // 6) * (cell // 2) + 5; qa.paste(bg.convert('RGB'), (ox, oy))
    for k_, (fx, fy) in it['lights'].items():
        px, py = ox + fx * t.width, oy + fy * t.height; d.ellipse([px - 3, py - 3, px + 3, py + 3], outline=COL.get(k_, (255, 255, 255)), width=2)
qa.save(f'{SRC}/raw/addon-anchors.png')

# ── layout (only what the scene reads) ──
J = {k: L[k] for k in ['plate', 'scale', 'runway', 'taxiways', 'stands', 'jet_bridge_heads', 'paths', 'lights']}
J['plate'] = dict(L['plate'], files=[f'plate-{n}.webp' for n in ['day', 'dusk', 'night', 'overcast']], size=[2560, 1600])
J['occluders'] = {'items': [dict(it, file=f"occ/{it['id']}.png") for it in L['occluders']['items']]}
json.dump(J, open(f'{OUT}/layout.json', 'w'), separators=(',', ':'))
tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
print(f'atlas {AW}x{AH}, art total {tot / 1e6:.2f} MB')
