"""Keep art generators aligned with the shipped PNG/WebP format registry.

Generated masters and scratch cuts keep their original formats. Reinstalled bundled
WebP assets are written losslessly so generation never adds a compression generation.
"""
import json, os, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'tools/webp/report.json'
def asset_path(value):
 if not isinstance(value,(str,os.PathLike)):return value
 p=Path(value)
 try:rel=p.resolve().relative_to(ROOT/'scenes/art').as_posix()
 except ValueError:return value
 converted={r['path'] for r in json.loads(REPORT.read_text()) if 'webp_bytes' in r} if REPORT.exists() else set()
 return p.with_suffix('.webp') if rel in converted else p

def save_art(im,destination,**kwargs):
 p=asset_path(destination)
 if str(p).endswith('.webp') and Path(p).resolve().is_relative_to(ROOT/'scenes/art'):
  kwargs.update(format='WEBP',lossless=True,quality=100,method=6,exact=True)
 im.save(p,**kwargs)

if __name__=='__main__':
 if len(sys.argv)==2:print(asset_path(sys.argv[1]))
 elif len(sys.argv)==3:save_art(Image.open(sys.argv[1]),sys.argv[2])
 else:raise SystemExit('usage: assets.py <bundled-path> | <source-image> <bundled-destination>')
