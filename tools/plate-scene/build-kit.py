#!/usr/bin/env python3
"""Package generated day/night masters and explicit region polygons into Kit.plate add-ons.
Run from repo root: python3 tools/plate-scene/build-kit.py
Sources and measured mask polygons live in art-src/plate-scenes/manifest.json.
No generation/network calls; sky segmentation is connected to the top border.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from edges import complete_sky, refine_sky, decontaminate
ROOT=Path(__file__).resolve().parents[2]
for s in json.loads((ROOT/'art-src/plate-scenes/manifest.json').read_text()):
    dest=ROOT/'addons'/s['id'];art=dest/'art';art.mkdir(parents=True,exist_ok=True)
    day=Image.open(ROOT/s['day']).convert('RGB');w,h=day.size
    a=np.array(day).astype(float);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    candidates=(b>r+5)&(g>r+1)&(a.mean(2)>s.get('sky_luminance',145))
    if s['id']=='taj-mahal':
        neutral=(b>r-15)&(g>r-8)&(a.mean(2)>145)&((a.max(2)-a.min(2))<40)
        neutral[:,:int(w*.602)] &= (b[:,:int(w*.602)]>r[:,:int(w*.602)]+1)
        candidates|=neutral
    if s['id']=='hillside-valley':
        edge=np.maximum(np.abs(ndimage.sobel(a.mean(2),0)),np.abs(ndimage.sobel(a.mean(2),1)))
        candidates &= edge<32
    if s['id']=='marine-drive': candidates[:int(h*.442),int(w*.696):]=True
    candidates[int(h*s['sky_limit']):]=False
    seed=np.zeros_like(candidates);seed[0]=candidates[0]
    sky=ndimage.binary_propagation(seed,mask=candidates)
    sky=ndimage.binary_fill_holes(sky)
    sky=refine_sky(a, complete_sky(a, sky))
    Image.fromarray((sky*255).astype('uint8')).save(art/'sky.png')
    for name in ['day','night']:
        source=np.asarray(Image.open(ROOT/s[name]).convert('RGB'))
        Image.fromarray(decontaminate(source, sky)).save(art/f'plate-{name}.webp',quality=92)
    def polygon(points):
        im=Image.new('L',(w,h));ImageDraw.Draw(im).polygon([(int(x*w),int(y*h)) for x,y in points],fill=255);return im
    water=polygon(s['water']).filter(ImageFilter.GaussianBlur(1));water.save(art/'water.png')
    # Snow/wet sheen only on exposed horizontal surfaces, never facades or beneath trees.
    polygon(s['ground']).filter(ImageFilter.GaussianBlur(1)).save(art/'exposed.png')
    (dest/'scene.json').write_text(json.dumps(dict(id=s['id'],title=s['title'],category='Places',version=1,author='wallpap',pro=True,blurb=s['blurb']),indent=2)+'\n')
    day.resize((256,171)).crop((0,5,256,165)).save(dest/'thumb.jpg',quality=90)
    (dest/'index.html').write_text('''<!doctype html><html><head><meta charset="utf-8"><title>'''+s['title']+'''</title></head><body>
<script src="astronomy.js"></script><script src="kit.js"></script><script src="lw.js"></script><script src="moon.js"></script>
<script>
'use strict';
const plate=Kit.plate({base:'art/',plates:{day:'plate-day.webp',night:'plate-night.webp'},masks:{sky:'sky.png',water:'water.png',exposed:'exposed.png'},shimmer:.16,sparkle:.06,focus:[.5,.35]});
const scene=Kit.scene({onReminder(){},
 exposedAt(x,y){return plate.maskAt('sky',x,y)>.5||plate.maskAt('water',x,y)>.5||plate.maskAt('exposed',x,y)>.5;},
 surfaceAt(x,y){return plate.maskAt('water',x,y)>.5?'water':plate.maskAt('exposed',x,y)>.5?'ground':null;},
 layers:[Kit.sky({cover:.12,elev:[.55,-.85]}),plate,Kit.particles({splash:true}),Kit.light({glow:.18,fog:.3})],
 onDown(x,y,k){if(plate.maskAt('water',x,y)>.5&&k.restOK(x,y))k.ripples.drop(x,y,12,-.25);},
 breathe(level,phase,k){plate.opt.shimmer=.1+level*.08;}
});
window.plateScene={plate,scene};
</script></body></html>\n''')
