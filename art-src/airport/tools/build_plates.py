# raw/plate-*.png (1536x1024, Codex) -> plate-*.png (2560x1600, 16:10)
#  1. variants are warped onto the day plate geometry (tools/align.py)
#  2. crop the top 64 px of sky (1536x960 = 16:10)   -> layout.json coords are normalised to THIS frame
#  3. Lanczos upscale x1.6667 + light unsharp mask
import subprocess, sys, os
from PIL import Image, ImageFilter
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
os.makedirs(f'{root}/raw/aligned', exist_ok=True)
for n in ['day', 'dusk', 'night', 'overcast']:
    src = f'{root}/raw/plate-{n}.png'
    if n != 'day':
        al = f'{root}/raw/aligned/plate-{n}.png'
        subprocess.run([sys.executable, f'{here}/align.py', f'{root}/raw/plate-day.png', src, al], check=True)
        src = al
    im = Image.open(src).convert('RGB').crop((0, 64, 1536, 1024))
    im = im.resize((2560, 1600), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=45, threshold=2))
    im.save(f'{root}/plate-{n}.png', optimize=True)
    print('wrote', f'plate-{n}.png', im.size)
