#!/usr/bin/env python3
"""Occluder mask for the Speakeasy band: the painted drum shells/stands, double bass and microphone
in bg-night.webp that stand IN FRONT of the robots behind them. World rect x 1150..1500, y 330..700
at 2 px/unit -> scenes/art/speakeasy/robots/occluder.png (alpha = in front). Drums and mic are
measured polygons (world units); the bass is segmented by colour (honey wood vs. the red curtain).
usage: python3 tools/speakeasy-band/occluder.py [preview.jpg]"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'scenes', 'art', 'speakeasy')
X0, Y0, X1, Y1, S = 1150, 330, 1500, 700, 2
bg = Image.open(os.path.join(ART, 'bg-night.webp')).convert('RGB')
k = bg.size[0] / 2400
# the painting resampled into the occluder's world frame
crop = bg.transform(((X1 - X0) * S, (Y1 - Y0) * S), Image.AFFINE,
                    (1 / (S) * k, 0, (X0 + 180) * k, 0, 1 / S * k, Y0 * k), resample=Image.BICUBIC)
W, H = crop.size
m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
P = lambda pts: [((x - X0) * S, (y - Y0) * S) for x, y in pts]
def ell(cx, cy, rx, ry): d.ellipse([(cx - rx - X0) * S, (cy - ry - Y0) * S, (cx + rx - X0) * S, (cy + ry - Y0) * S], fill=255)
def quad(x0, y0, x1, y1, w):   # a thick line (stand tube)
    dx, dy = x1 - x0, y1 - y0; L = (dx * dx + dy * dy) ** .5; nx, ny = -dy / L * w / 2, dx / L * w / 2
    d.polygon(P([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)]), fill=255)
# kick drum (face-on)
ell(1300, 638, 48.5, 48.5)
# rack tom on the kick: shell + top head
d.polygon(P([(1266, 566), (1320, 566), (1320, 596), (1266, 596)]), fill=255); ell(1293, 566, 27, 8.5)
# snare: shell + head + tripod
d.polygon(P([(1208, 605), (1261, 605), (1261, 624), (1208, 624)]), fill=255); ell(1234.5, 605, 26.5, 7.5); ell(1234.5, 624, 26.5, 5)
d.polygon(P([(1222, 624), (1248, 624), (1252, 630), (1218, 630)]), fill=255)
for a, b in [((1219, 625), (1204, 687)), ((1231, 627), (1219, 688)), ((1238, 628), (1254, 686))]: quad(*a, *b, 3.0)
# floor tom: shell + head + legs
d.polygon(P([(1342, 613), (1390, 613), (1390, 672), (1342, 672)]), fill=255); ell(1366, 613, 24, 7); ell(1366, 672, 24, 6)
for a, b in [((1346, 670), (1340, 690)), ((1386, 670), (1392, 690))]: quad(*a, *b, 2.6)
# cymbal stands (the cymbals themselves are drawn live) + kick spurs
quad(1217, 562, 1217, 690, 3.4); quad(1371, 551, 1371, 618, 3.2); quad(1262, 516, 1236, 600, 3.0)
quad(1262, 676, 1250, 690, 2.6); quad(1338, 676, 1350, 690, 2.6)
# microphone: capsule + stand + base
ell(1178, 541, 13, 22); quad(1178, 556, 1178, 688, 4.6); ell(1178, 690, 21, 5.5)
mask = np.array(m) > 0
# the double bass: body outline traced on the painting (world units), plus scroll and pegs
d.polygon(P([(1405.0, 511.7), (1395.0, 516.7), (1389.2, 525.0), (1386.7, 538.3), (1390.0, 555.0), (1391.7, 578.3), (1388.3, 600.0), (1385.8, 616.7), (1385.0, 641.7), (1387.5, 660.0), (1395.0, 673.3), (1408.3, 681.7), (1426.7, 685.0), (1446.7, 684.2), (1463.3, 678.3), (1476.7, 666.7), (1483.3, 650.0), (1484.2, 630.0), (1480.0, 610.0), (1473.3, 596.7), (1466.7, 588.3), (1463.3, 576.7), (1464.2, 561.7), (1465.0, 546.7), (1463.3, 530.0), (1456.7, 518.3), (1446.7, 512.5), (1430.0, 510.8)]), fill=255)
ell(1412, 352, 9, 9); d.polygon(P([(1397, 362), (1430, 362), (1430, 385), (1397, 385)]), fill=255)
mask = np.array(m) > 0
yy, xx = np.mgrid[0:H, 0:W]; wx, wy = xx / S + X0, yy / S + Y0
box = (wx > 1384) & (wx < 1490) & (wy > 338) & (wy < 694)
bass = np.zeros_like(mask)
# the dark fingerboard/strings run up the neck to the scroll: a band along the neck axis
nb = Image.new('L', (W, H), 0); ImageDraw.Draw(nb).polygon(P([(1407, 352), (1421, 352), (1432, 572), (1417, 572)]), fill=255)
nb2 = Image.new('L', (W, H), 0); ImageDraw.Draw(nb2).polygon(P([(1426, 600), (1441, 600), (1441, 676), (1426, 676)]), fill=255)
bass |= (np.array(nb) > 0) | ((np.array(nb2) > 0) & box)
mask |= bass
out = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
os.makedirs(os.path.join(ART, 'robots'), exist_ok=True)
rgba = Image.merge('RGBA', (out.point(lambda v: 255),) * 3 + (out,))   # alpha = in front (destination-in mask)
rgba.save(os.path.join(ART, 'robots', 'occluder.png'), optimize=True)
if len(sys.argv) > 1:
    pv = Image.composite(Image.new('RGB', (W, H), (0, 255, 120)), crop, out.point(lambda v: v * 0.45))
    pv.resize((W * 2, H * 2)).save(sys.argv[1], quality=88)
    e = np.array(out) > 127; edge = e ^ nd.binary_erosion(e, iterations=1)
    c2 = np.array(crop.resize((W * 3, H * 3), Image.BICUBIC)); E = np.kron(edge, np.ones((3, 3), bool))
    c2[E] = (0, 255, 90); Image.fromarray(c2).save(sys.argv[1].replace('.jpg', '-edge.jpg'), quality=90)
print('occluder', W, H)
