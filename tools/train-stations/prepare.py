"""Pack built-in ImageGen outputs; preserve alpha and register frame feet."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, shutil, sys
ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'.codex/generated_images/01a107e4-197b-7473-a80a-ace27b80e30f'
OUT=ROOT/'scenes/art/train/stations'
FILES={'indian':'e28c741f-794f-495e-8fd9-db2c8d6b557f','shinkansen':'99484604-990c-4966-b0d0-db51d40f73d9','swiss':'b4e0428b-a2e2-4265-9f78-d6658c9c46a3','orient':'e39c2313-fa2f-4488-afa3-ccb664036677','life':'b9d2f47b-e478-455b-a9b9-73d6adba44ab'}
if shutil.disk_usage('/').free<3*1024**3: raise SystemExit('STOP: less than 3 GiB free')
for skin,file in FILES.items():
 im=Image.open(SOURCE/f'exec-{file}.png')
 if skin!='life':
  im.resize((1440,480),Image.Resampling.LANCZOS).save(OUT/f'{skin}.webp',quality=90)
 else:
  # Generated rows have unequal heights. Crop each anatomical silhouette without rescaling
  # frames individually: one scale per row and a shared ground line keeps feet planted.
  rows=[(0,294),(294,575),(575,872),(872,1024)]
  atlas=Image.new('RGBA',(768,640)); frames=[]
  for row,(top,bottom) in enumerate(rows):
   cells=[im.crop((col*256,top,(col+1)*256,bottom)) for col in range(6)]
   boxes=[c.getchannel('A').point(lambda a:255 if a>80 else 0).getbbox() for c in cells]
   scale=min(115/max(b[2]-b[0] for b in boxes),148/max(b[3]-b[1] for b in boxes))
   for col,(cell,b) in enumerate(zip(cells,boxes)):
    crop=cell.crop(b);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    atlas.alpha_composite(crop,(col*128+(128-crop.width)//2,row*160+154-crop.height))
  atlas.save(OUT/'life.webp',quality=92)
  bg=Image.new('RGBA',atlas.size,'#687775');bg.alpha_composite(atlas);bg.convert('RGB').save(ROOT/'shots/train-stations/life-frames.jpg',quality=92)
# Record generated source lineage without retaining duplicate raw PNGs in the worktree.
(OUT/'sources.json').write_text(json.dumps(FILES,indent=2)+'\n')
