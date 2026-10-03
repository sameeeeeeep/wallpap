# Packs the raw Codex art into one small atlas per add-on scene (+ a frames map printed as JS).
#   python3 art-src/kit-addons/pack.py      → addons/<scene>/atlas.png, frames printed to stdout
import json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ADD = os.path.join(HERE, '..', '..', 'addons')
PAD = 10

def load(n): return Image.open(os.path.join(HERE, n + '.png')).convert('RGBA')
def trim(im): return im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
def fit(im, w): return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)

def components(im, min_area=4000):
    """Split an image of separated objects into crops (flood fill on alpha)."""
    a = im.getchannel('A').point(lambda v: 255 if v > 20 else 0)
    W, H = a.size; px = a.load(); seen = set(); boxes = []
    for y in range(0, H, 3):
        for x in range(0, W, 3):
            if px[x, y] and (x, y) not in seen:
                stack = [(x, y)]; seen.add((x, y)); x0 = x1 = x; y0 = y1 = y; n = 0
                while stack:
                    cx, cy = stack.pop(); n += 1
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for nx, ny in ((cx+3, cy), (cx-3, cy), (cx, cy+3), (cx, cy-3)):
                        if 0 <= nx < W and 0 <= ny < H and px[nx, ny] and (nx, ny) not in seen:
                            seen.add((nx, ny)); stack.append((nx, ny))
                if n * 9 > min_area: boxes.append((x0 - 4, y0 - 4, x1 + 5, y1 + 5))
    boxes.sort(key=lambda b: (round(b[1] / 200), b[0]))
    return [im.crop(b) for b in boxes]

def halves(im, w):
    """Bilaterally symmetric animal (body vertical): centre on the alpha centre of mass, split into L/R + a body strip."""
    im = trim(im); a = im.getchannel('A'); W, H = im.size
    cols = [sum(a.crop((x, 0, x + 1, H)).getdata()) for x in range(W)]
    cx = sum(i * c for i, c in enumerate(cols)) / max(1, sum(cols))
    hw = int(max(cx, W - cx)) + 1
    canvas = Image.new('RGBA', (hw * 2, H)); canvas.paste(im, (int(hw - cx), 0))
    canvas = fit(canvas, w)
    W2, H2 = canvas.size
    L = canvas.crop((0, 0, W2 // 2, H2)); R = canvas.crop((W2 // 2, 0, W2, H2))
    return L, R, canvas

def pack(items, aw):
    x = y = rowh = 0; frames = {}
    for name, im in items:
        if x + im.width + PAD * 2 > aw: x = 0; y += rowh + PAD * 2; rowh = 0
        frames[name] = [x + PAD, y + PAD, im.width, im.height]; x += im.width + PAD * 2; rowh = max(rowh, im.height)
    ah = y + rowh + PAD * 2
    atlas = Image.new('RGBA', (aw, ah))
    for name, im in items: f = frames[name]; atlas.paste(im, (f[0], f[1]))
    return atlas, frames

def save(scene, items, aw):
    atlas, frames = pack(items, aw)
    out = os.path.join(ADD, scene, 'atlas.png'); atlas.save(out, optimize=True)
    print(f'// {scene}: atlas.png {atlas.size} {os.path.getsize(out)//1024} KB')
    print('const FRAMES = ' + json.dumps(frames, separators=(',', ':')) + ';')

# Butterfly garden: wing halves + flower heads
items = []
for sp in ('monarch', 'morpho', 'swallowtail', 'white'):
    L, R, full = halves(load('bf-' + sp), 208)
    items += [(sp + 'L', L), (sp + 'R', R)]
fl = components(load('flowers-a')) + components(load('flowers-b'))
for name, im in zip(('cosmos', 'daisy', 'zinnia', 'echinacea', 'rudbeckia', 'scabiosa'), fl): items.append((name, fit(trim(im), 150)))
for name in ('hosta', 'fern', 'grass', 'mantle'): items.append((name, fit(trim(load('leaf-' + name)), 240)))
save('butterfly-garden', items, 1024)
g = Image.open(os.path.join(HERE, 'ground.png')).convert('RGB').resize((768, 768), Image.LANCZOS)
g.save(os.path.join(ADD, 'butterfly-garden', 'ground.jpg'), quality=86, optimize=True)
print('// ground.jpg', os.path.getsize(os.path.join(ADD, 'butterfly-garden', 'ground.jpg')) // 1024, 'KB')

# Beach: gull halves, crab, shells
items = []
L, R, full = halves(load('gull'), 300); items += [('gullL', L), ('gullR', R)]
items.append(('crab', fit(trim(load('crab')), 150)))
for name, im in zip(('cockle', 'scallop', 'whelk', 'tellin'), components(load('shells'))): items.append((name, fit(trim(im), 84)))
save('beach', items, 1024)
