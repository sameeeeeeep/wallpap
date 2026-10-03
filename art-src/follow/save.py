#!/usr/bin/env python3
import json,re,sys,shutil
from pathlib import Path
from PIL import Image
base=Path(__file__).resolve().parent
if shutil.disk_usage('/').free<3*1024**3: raise SystemExit('STOP: under 3 GB free')
record=json.loads(sys.argv[1]);p=Path(re.findall(r' as (/.+?\.png)',record['result'])[0])
out=record.get('output',record['key'])
Image.open(p).save(base/(out+'.webp'),lossless=True)
path=base/'prompts.json'; records=json.loads(path.read_text()) if path.exists() else []
if not any(r['result']==record['result'] for r in records):records.append(record)
path.write_text(json.dumps(records,indent=2)+'\n')
p.unlink()
print(out)
