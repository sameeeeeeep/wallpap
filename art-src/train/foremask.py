#!/usr/bin/env python3
# Foreground occluders per skin: what stands between the camera and the aisle plane the passers-by
# walk on (Indian: the ladders and the near side-berth panel; others: the nearest seat backs/doors).
# Polygons in plate pixels (1586x992), traced by eye on gridded crops; feathered 1.2 px.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
R = lambda x0, y0, x1, y1: [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
POLY = {
  '': [R(40, 0, 80, 992),
       [(0, 226), (48, 236), (48, 262), (0, 254)], [(0, 400), (48, 406), (48, 432), (0, 428)],
       [(0, 638), (48, 640), (48, 670), (0, 668)], [(0, 866), (48, 866), (48, 904), (0, 906)],
       R(1306, 0, 1347, 992), R(1400, 0, 1586, 992),
       R(1340, 228, 1405, 275), R(1340, 402, 1405, 434), R(1340, 636, 1405, 670), R(1340, 856, 1405, 902)],
  'shinkansen': [[(0, 60), (45, 75), (80, 105), (98, 160), (102, 350), (112, 560), (118, 820), (150, 840), (185, 870), (185, 992), (0, 992)],
                 [(1586, 70), (1540, 85), (1500, 120), (1478, 200), (1470, 340), (1470, 560), (1460, 820), (1420, 840), (1381, 870), (1381, 992), (1586, 992)]],
  'swiss': [[(0, 120), (50, 125), (55, 165), (110, 195), (145, 260), (152, 450), (160, 575), (205, 590), (208, 992), (0, 992)],
            [(1586, 120), (1520, 120), (1500, 165), (1460, 220), (1446, 300), (1442, 450), (1440, 570), (1395, 585), (1390, 992), (1586, 992)]],
  'orient': [[(0, 0), (130, 0), (130, 405), (150, 405), (175, 415), (190, 440), (190, 992), (0, 992)],
             [(1586, 0), (1386, 0), (1386, 400), (1350, 405), (1330, 430), (1326, 992), (1586, 992)]],
}
for k, polys in POLY.items():
    m = Image.new('L', (1586, 992), 0); d = ImageDraw.Draw(m)
    for p in polys: d.polygon(p, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.2))
    a = np.array(m); out = np.dstack([np.full(a.shape + (3,), 255, np.uint8), a])
    Image.fromarray(out).save(f'../../scenes/art/train/{k + "/" if k else ""}fore-mask.png', optimize=True)
    print(k or 'indian', 'ok')
