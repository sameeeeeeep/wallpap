# Align a relit plate variant onto the day plate's geometry (Codex edits drift a few px).
#   python3 align.py day.png variant.png out.png
# Tile phase-correlation on gradient images (ground only, sky has no features) -> robust quadratic
# displacement field -> resample with scipy map_coordinates.
import sys, numpy as np
from PIL import Image
from scipy import ndimage

def grad(p):
    a = np.asarray(Image.open(p).convert('L')).astype(float)
    a = (a - ndimage.uniform_filter(a, 31)) / (np.sqrt(ndimage.uniform_filter((a - ndimage.uniform_filter(a, 31))**2, 31)) + 4)
    gx, gy = ndimage.sobel(a, 1), ndimage.sobel(a, 0)
    return np.hypot(gx, gy)

def phase(a, b):
    A, B = np.fft.fft2(a), np.fft.fft2(b)
    R = A * np.conj(B); R /= np.abs(R) + 1e-9
    r = np.real(np.fft.ifft2(R))
    i = np.unravel_index(np.argmax(r), r.shape)
    peak = r[i] / (r.std() + 1e-9)
    sh = [i[k] if i[k] < r.shape[k] // 2 else i[k] - r.shape[k] for k in (0, 1)]
    # subpixel parabola
    out = []
    for k in (0, 1):
        idx = list(i); m = r.shape[k]
        idx[k] = (i[k] - 1) % m; l = r[tuple(idx)]
        idx[k] = (i[k] + 1) % m; rr = r[tuple(idx)]
        den = l - 2 * r[i] + rr
        out.append(sh[k] + (0.5 * (l - rr) / den if den != 0 else 0))
    return out[0], out[1], peak

day, var, outp = sys.argv[1:4]
G1, G2 = grad(day), grad(var)
H, W = G1.shape
T = 128; win = np.outer(np.hanning(T), np.hanning(T))
pts = []
for y in range(400, H - T, 48):
    for x in range(0, W - T, 48):
        a, b = G1[y:y+T, x:x+T], G2[y:y+T, x:x+T]
        if a.std() < 0.3: continue
        dy, dx, pk = phase(a * win, b * win)
        if pk > 12 and abs(dx) < 60 and abs(dy) < 60:
            pts.append((x + T/2, y + T/2, dx, dy))
P = np.array(pts)
def basis(x, y):
    x = x / W; y = y / H
    return np.stack([np.ones_like(x), x, y, x*x, x*y, y*y], -1)
keep = np.ones(len(P), bool)
for it in range(5):
    B = basis(P[keep, 0], P[keep, 1])
    cx = np.linalg.lstsq(B, P[keep, 2], rcond=None)[0]
    cy = np.linalg.lstsq(B, P[keep, 3], rcond=None)[0]
    Ba = basis(P[:, 0], P[:, 1])
    res = np.hypot(Ba @ cx - P[:, 2], Ba @ cy - P[:, 3])
    keep = res < max(1.0, 2.5 * np.median(res[keep]))
print(f'{len(P)} tiles, {keep.sum()} inliers, median residual {np.median(res[keep]):.2f}px')
# displacement: day(x,y) corresponds to var(x - dx, y - dy)  (phase(a,b) gives shift of a relative to b)
yy, xx = np.mgrid[0:H, 0:W].astype(float)
Bf = basis(xx.ravel(), yy.ravel())
DX = (Bf @ cx).reshape(H, W); DY = (Bf @ cy).reshape(H, W)
# sky region (no tiles): clamp field to its value at y=420 so the sky isn't extrapolated wildly
mask = yy < 420
DX[mask] = DX[420][None, :].repeat(H, 0)[mask]; DY[mask] = DY[420][None, :].repeat(H, 0)[mask]
print('field dx range %.1f..%.1f  dy range %.1f..%.1f' % (DX.min(), DX.max(), DY.min(), DY.max()))
src = np.asarray(Image.open(var).convert('RGB')).astype(float)
out = np.stack([ndimage.map_coordinates(src[..., c], [yy - DY, xx - DX], order=3, mode='nearest') for c in range(3)], -1)
Image.fromarray(np.clip(out, 0, 255).astype('uint8')).save(outp)
