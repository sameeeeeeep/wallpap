"""Capture one wkshot sequence, make JPEG sheets/crops, delete its raw PNGs.
Run from the repository root with this worktree's dev server on 5286.
"""
import json, os, pathlib, shutil, subprocess, sys
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'shots/koi-shoals'
OUT.mkdir(parents=True, exist_ok=True)
name = sys.argv[1]
w, h = (3440,1440) if name == 'ultrawide' else (800,600) if name == 'small' else (1600,1000)
query = {'night':'hour=23','rain':'hour=12&weather=rain','left':'hour=12&side=left',
         'ultrawide':'hour=12&side=left','calm':'hour=12&calm=1'}.get(name,'hour=12')
frames = [0,1,1.2,1.6,3,5,6,8,10,12,14,14.5,15,16,18,22]
if shutil.disk_usage('/').free < 3*1024**3:
    raise SystemExit('STOP: less than 3 GiB free')
script = (ROOT/'tools/koi-shoals/sequence.js').read_text()
if name == 'left':
    script = "__lw('layout',{side:'left',clear:[.28,1],avoid:[[.58,.25,.13,.18]]});" + script
if name == 'companions':
    script = "__lw('agents',{style:'native',list:[{id:'qa-c',kind:'codex',state:'attention'},{id:'qa-a',kind:'claude',state:'working'}]});__lw('nowplaying',{playing:true,title:'QA',artist:'QA'});" + script
env = dict(os.environ, WKSHOT_FRAMES=','.join(map(str,frames)))
result = subprocess.run([str(ROOT/'tools/wkshot'),f'http://localhost:5286/koi.html?virtual=1&muted=1&shotSeed=41&{query}',
                         str(OUT/f'{name}.png'),str(w),str(h),'0',script],env=env,capture_output=True,text=True)
(OUT/f'{name}.log').write_text(result.stdout+result.stderr)
paths = sorted(OUT.glob(f'{name}-f*.png'))
reports = [json.loads(line[8:]) for line in result.stdout.splitlines() if line.startswith('result: ')]
if result.returncode or len(paths)!=len(frames) or any(r.get('errors') or r.get('imageErrors') for r in reports):
    raise SystemExit(result.stdout+result.stderr)
# Four sheets per run keep every frame large enough to inspect; crops reveal flex/occlusion.
for page in range(4):
    pw=800; ph=round(h/w*pw); sheet=Image.new('RGB',(pw*2,(ph+30)*2),(18,24,24))
    crop=Image.new('RGB',(1000,760),(18,24,24))
    for cell in range(4):
        i=page*4+cell; im=Image.open(paths[i]).convert('RGB')
        thumb=im.resize((pw,ph),Image.Resampling.LANCZOS)
        x=(cell%2)*pw;y=(cell//2)*(ph+30);sheet.paste(thumb,(x,y))
        ImageDraw.Draw(sheet).text((x+10,y+ph+8),f'{name} / {frames[i]:g}s',fill='white')
        group=0 if frames[i]<6 else 1 if frames[i]<14 else 2
        g=reports[i]['report']['groups'][group];scale=im.width/w
        region=im.crop(((g['x']-200)*scale,(g['y']-140)*scale,(g['x']+200)*scale,(g['y']+140)*scale))
        region=region.resize((500,350),Image.Resampling.LANCZOS)
        cx=(cell%2)*500;cy=(cell//2)*380;crop.paste(region,(cx,cy))
        ImageDraw.Draw(crop).text((cx+10,cy+358),f'{name} / {frames[i]:g}s / shoal {group+1}',fill='white')
    sheet.save(OUT/f'{name}-sheet-{page+1}.jpg',quality=88)
    crop.save(OUT/f'{name}-detail-{page+1}.jpg',quality=91)
for p in paths:p.unlink()
print(f'{name}: {len(reports)} clean frames, 4 contact sheets + 4 detail sheets; raw PNGs deleted')
