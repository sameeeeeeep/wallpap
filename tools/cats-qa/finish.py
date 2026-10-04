#!/usr/bin/env python3
"""Assemble the 45-second owner reels and validate their recorded coverage.

Input: final-raw/{showcase-*-h12,night-*-h22}.{mp4,json}.
Optional follow-final/showcase-*-h12 replaces seconds 33.2–41 after a fix.
All inputs are actual file:// WebKit captures. Edits are labelled hard cuts.
"""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'shots/cats-gpt'
summary = {}
for coat in ['orange', 'black', 'grey', 'calico', 'siamese']:
    day = OUT / 'final-raw' / f'showcase-{coat}-h12.mp4'
    follow = OUT / 'follow-final' / f'showcase-{coat}-h12.mp4'
    night = OUT / 'final-raw' / f'night-{coat}-h22.mp4'
    inputs = [day, follow, night] if follow.exists() else [day, night]
    counts = [996, 234, 120] if follow.exists() else [1230, 120]
    reports = []
    filters = []
    args = ['ffmpeg', '-y', '-v', 'error']
    for i, (path, count) in enumerate(zip(inputs, counts)):
        records = json.loads(path.with_suffix('.json').read_text())[:count]
        assert len(records) == count, (coat, path, len(records))
        for record in records:
            record['time'] = round(len(reports) / 30, 4)
            record['lighting'] = 'night' if path == night else 'day'
            assert not record['errors'], (coat, record)
            reports.append(record)
        args += ['-i', str(path)]
        filters.append(f'[{i}:v]trim=end_frame={count},setpts=PTS-STARTPTS[v{i}]')
    filters.append(''.join(f'[v{i}]' for i in range(len(inputs))) + f'concat=n={len(inputs)}:v=1:a=0[out]')
    output = OUT / f'{coat}.mp4'
    subprocess.run(args + ['-filter_complex', ';'.join(filters), '-map', '[out]', '-c:v', 'libx264',
                          '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)], check=True)
    output.with_suffix('.json').write_text(json.dumps(reports, separators=(',', ':')))
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=nb_frames,r_frame_rate,duration', '-of', 'json', str(output)]))['streams'][0]
    assert probe['nb_frames'] == '1350' and probe['r_frame_rate'] == '30/1', probe
    labels = {r['label'] for r in reports}
    for gait in ['WALK', 'RUN']:
        assert len([s for s in labels if s.startswith(gait + ' / ')]) == 8
    poses = {r['pose'] for r in reports}
    for action in ['perk', 'stretch']:
        assert {f'{action}-{i}' for i in range(1, 9)} <= poses, (coat, action, poses)
    for view in ['side', 'near', 'toward', 'far', 'away']:
        assert {f'jump-{view}-{i}' for i in range(1, 9)} <= poses, (coat, view)
    assert any(r['pounce'] and r['pounce']['land'] == r['pounce']['target'] for r in reports)
    jumps = [r['jump'] for r in reports if r['jump']]
    assert any(j['from'] == 'floor' and j['to'] == '0' for j in jumps)
    assert any(j['from'] == '0' and j['to'] == 'floor' for j in jumps)
    summary[coat] = {'frames': len(reports), 'fps': 30, 'seconds': 45, 'bytes': output.stat().st_size,
                     'eightWalkAndRunDirections': True, 'fiveJumpViews': True,
                     'fullPerkAndStretch': True, 'pounceLandedOnTarget': True, 'ledgesBothWays': True}
    print(coat, '45 seconds, coverage passed', flush=True)
(OUT / 'video-quality.json').write_text(json.dumps(summary, indent=2) + '\n')
