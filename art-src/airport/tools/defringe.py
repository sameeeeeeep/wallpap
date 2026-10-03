# Remove the light-grey (#e6e6e6) halo Vision leaves in the soft edge of a cut-out:
# un-mix the background colour from semi-transparent pixels and tighten the alpha ramp a little.
#   python3 defringe.py sprite.png [more.png ...]   (in place)
import sys, numpy as np
from PIL import Image
BG = np.array([230, 230, 230], float)
for p in sys.argv[1:]:
    A = np.asarray(Image.open(p).convert('RGBA')).astype(float)
    a = A[..., 3:4] / 255.0
    a2 = np.clip((a - 0.12) / 0.80, 0, 1)                  # tighter ramp
    c = (A[..., :3] - (1 - a) * BG) / np.maximum(a, 0.08)  # un-mix bg (using the original alpha)
    c = np.where(a > 0.98, A[..., :3], c)
    out = np.concatenate([np.clip(c, 0, 255), a2 * 255], -1).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(p, optimize=True)
    print('defringed', p.split('/')[-1])
