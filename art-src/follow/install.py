#!/usr/bin/env python3
"""Cut the FOLLOW atlases; register gait contacts and fixed-scale sequences."""
import importlib.util,json,re,subprocess,sys,tempfile
from pathlib import Path
import numpy as np
from scipy import ndimage as nd
from PIL import Image,ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/webp'))
from assets import asset_path, save_art
BASE=Path(__file__).resolve().parent; ROOT=BASE.parents[1]
spec=importlib.util.spec_from_file_location('gaze_install',BASE.parent/'gaze-fix/install.py')
G=importlib.util.module_from_spec(spec);spec.loader.exec_module(G)
ROWS={'motion':[('run-f',6),('run-b',6),('stalk',6),('stalk-f',6),('stalk-b',6)],
      'hunt':[(k+s,5) for s in ['', '-f','-b'] for k in ['hunt','pounce']],
      'social':[(k,5) for k in ['perk','turn-f','turn-b','loaf-stretch']]}
def cut(animal,kind):
    im=Image.open(asset_path(BASE/f'{animal}-{kind}.webp')).convert('RGB'); a=np.array(im).astype(float)
    bg=np.median(np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3)]),axis=0)
    fg=nd.binary_opening(np.abs(a-bg).max(2)>20)
    labels,n=nd.label(fg);sizes=np.bincount(labels.ravel());sizes[0]=0
    boxes=nd.find_objects(labels);nr=len(ROWS[kind]);nc=ROWS[kind][0][1]
    biggest=sorted(np.argsort(sizes)[-nr*nc:],key=lambda i:(boxes[i-1][0].start+boxes[i-1][0].stop)/2)
    out={}
    with tempfile.TemporaryDirectory(prefix='follow-cut-') as tmp:
        tmp=Path(tmp)
        for row,(key,count) in enumerate(ROWS[kind]):
            bs=[boxes[i-1] for i in biggest[row*nc:(row+1)*nc]]
            y0=max(0,min(b[0].start for b in bs)-4);y1=min(im.height,max(b[0].stop for b in bs)+4)
            save_art(im.crop((0,y0,im.width,y1)),tmp/'strip.png')
            subprocess.run([sys.executable,str(BASE.parent/'cycles/cut.py'),str(tmp/'strip.png'),str(tmp),key,str(count)],check=True,stdout=subprocess.DEVNULL)
            out[key]=[Image.open(asset_path(tmp/f'{key}-{i}.png')).convert('RGBA') for i in range(1,count+1)]
    return out
def seq(cuts,H):
    pad=12; hh=max(c.height for c in cuts)+pad*2;out=[];centers=[]
    for c in cuts:
        _,bottom,cx=G.measure(np.array(c));cv=Image.new('RGBA',(c.width+pad*2,hh))
        cv.paste(c,(pad,hh-pad-1-int(bottom)));out.append(cv);centers.append(cx+pad)
    return out,dict(height=H,pad=pad,centers=centers)
def main():
    G.guard();js=ROOT/'scenes/pet-motion.js';source=js.read_text()
    layouts=json.loads(re.search(r'LW.PET_DIRECTION_LAYOUT=(\{.*\});',source)[1])
    seqs=json.loads((BASE/'sequence-layout.json').read_text()) if (BASE/'sequence-layout.json').exists() else {}
    reports=json.loads((BASE/'plant-qa.json').read_text()) if (BASE/'plant-qa.json').exists() else {}
    for animal in sys.argv[1:] or G.ANIMALS:
        G.guard();sid=('dogs/' if animal in ['golden','corgi'] else 'cats/')+animal
        folder=ROOT/'scenes/art/sprites'/sid; allrows={};seqs[sid]={}
        for kind in ROWS: allrows.update(cut(animal,kind))
        if sid.startswith('dogs/'):
            for key in ['stalk','stalk-f','stalk-b']:
                allrows.pop(key,None);layouts[sid].pop(key,None);reports.pop(animal+'-'+key,None)
                for i in range(1,7):asset_path(folder/'cycle'/f'{key}-{i}.png').unlink(missing_ok=True)
        # Sequences retain one anatomical scale; crouching never scales the body up.
        standing=G.measure(np.array(allrows['turn-f'][0]));socialH=standing[1]-standing[0]+1
        for key,cuts in allrows.items():
            if key.startswith(('run','stalk')):
                stride=.95 if key.startswith('run') else .35
                # Creeping uses the same paw planting machinery as walking.
                pk=key if key.startswith('run') else key.replace('stalk','walk')
                frames,geom,report=G.plant(cuts,pk,stride,animal)
                if key.startswith('stalk'):geom['height']/=.78;geom['stride']*=.78
                report['runtime_height']=geom['height'];layouts[sid][key]=geom;reports[animal+'-'+key]=report
                sub='cycle'
            else:
                if key.startswith(('hunt','pounce')):
                    hk='hunt'+('-f' if key.endswith('-f') else '-b' if key.endswith('-b') else '')
                    ref=allrows[hk];H=float(np.median([G.measure(np.array(c))[1]-G.measure(np.array(c))[0]+1 for c in ref]))/.75
                else:H=socialH
                frames,geom=seq(cuts,H);seqs[sid][key]=geom;sub='t'
            for i,im in enumerate(frames,1):save_art(im,folder/sub/f'{key}-{i}.png')
            allrows[key]=frames
        if animal in ['grey','calico','siamese']:
            for name,index in [('loaf',0),('stretch',3)]:
                im=allrows['loaf-stretch'][index];save_art(im.crop(im.getbbox()),folder/f'{name}.png')
        cv=Image.new('RGB',(1440,len(allrows)*155),'#b6b8be');d=ImageDraw.Draw(cv)
        for row,(key,frames) in enumerate(allrows.items()):
            for i,im in enumerate(frames):
                im=im.crop(im.getbbox());im.thumbnail((228,128),Image.Resampling.LANCZOS)
                x=i*240;y=row*155;cv.paste(im,(x+(240-im.width)//2,y+152-im.height),im);d.text((x+3,y+3),f'{key}-{i+1}',fill='#202028')
        save_art(cv,ROOT/'shots/follow'/f'{animal}-art.jpg',quality=88)
        print(animal,'installed',sum(map(len,allrows.values())),flush=True)
    source=re.sub(r'(LW.PET_DIRECTION_LAYOUT=)\{.*\};',lambda m:m[1]+json.dumps(layouts,separators=(',',':'))+';',source)
    definition='LW.PET_FOLLOW_LAYOUT='+json.dumps(seqs,separators=(',',':'))+';'
    if 'LW.PET_FOLLOW_LAYOUT=' in source:source=re.sub(r'LW.PET_FOLLOW_LAYOUT=\{.*\};',lambda m:definition,source)
    else:source=source.replace('  const cycleKey=', '  '+definition+'\n  const cycleKey=')
    js.write_text(source)
    for name,data in [('sequence-layout',seqs),('plant-qa',reports),('cycle-layout',{sid:{k:v for k,v in ls.items() if k.startswith(('stalk','run-'))} for sid,ls in layouts.items()})]:
        (BASE/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
if __name__=='__main__':main()
