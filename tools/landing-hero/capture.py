#!/usr/bin/env python3
"""Capture the requested viewport/system-appearance matrix in offscreen WebKit."""
from pathlib import Path
import subprocess, concurrent.futures, os, json
root = Path(__file__).resolve().parents[2]
os.chdir(root)
out = root / 'shots/hero'
out.mkdir(parents=True, exist_ok=True)
subprocess.run(['swiftc', '-O', '-o', '/tmp/wallpap-hero-capture', 'tools/landing-hero/capture.swift', '-framework', 'AppKit', '-framework', 'WebKit'], check=True)
setup = Path('tools/landing-hero/shot.js').read_text()

def capture(job):
    w, h, theme, target = job
    name = f'{w}x{h}-{theme}-{target}'
    url = f'http://127.0.0.1:5224/?shotAppearance={theme}&capture={target}'
    p = subprocess.run(['/tmp/wallpap-hero-capture', url, str(out / (name + '.png')), str(w), str(h), '0', setup], capture_output=True, text=True)
    (out / (name + '.log')).write_text(p.stdout + p.stderr)
    if p.returncode: raise RuntimeError(name + p.stdout + p.stderr)
    result = json.loads(next(line[8:] for line in p.stdout.splitlines() if line.startswith('result: ')))
    report = result['report']
    assert not result['errors'] and not report['errors'] and not report['imageErrors'], (name, result)
    assert not report['horizontalOverflow'] and not report['ghost'], (name, report)
    assert report['frames'] == (0 if w == 390 or target == 'end' else 1), (name, report)
    if target in ('koi', 'cats', 'cafe'): assert report['hint'], (name, report)
    print(name, report, flush=True)
    return { 'name': name, **report }

jobs = [(w,h,t,s) for w,h in [(1440,900),(1280,800),(390,844)] for t in ['light','dark'] for s in ['hero','koi','cats','cafe','end']]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    reports = list(pool.map(capture, jobs))
(out / 'matrix.json').write_text(json.dumps(reports, indent=2))
