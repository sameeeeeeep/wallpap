#!/usr/bin/env python3
"""Assemble the 45-second owner reels and validate their recorded coverage.

Input: final-raw/{showcase-*-h12,night-*-h22}.{mp4,json}.
Optional follow-final/showcase-*-h12 replaces seconds 33.2–41 after a fix.
All inputs are actual file:// WebKit captures. Edits are labelled hard cuts.
"""
import argparse, json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'shots/cats-gpt'
parser = argparse.ArgumentParser()
parser.add_argument('--coats', nargs='+', default=['orange', 'black', 'grey', 'calico', 'siamese'])
parser.add_argument('--input-dir', type=Path, default=OUT / 'final-raw')
parser.add_argument('--fresh', action='store_true', help='Use only newly captured day/night inputs')
args = parser.parse_args()
summary = json.loads((OUT / 'video-quality.json').read_text()) if (OUT / 'video-quality.json').exists() else {}
for coat in args.coats:
    day = args.input_dir / f'showcase-{coat}-h12.mp4'
    follow = OUT / 'follow-final' / f'showcase-{coat}-h12.mp4'
    night = args.input_dir / f'night-{coat}-h22.mp4'
    use_follow = follow.exists() and not args.fresh
    inputs = [day, follow, night] if use_follow else [day, night]
    counts = [996, 234, 120] if use_follow else [1230, 120]
    reports = []
    filters = []
    command = ['ffmpeg', '-y', '-v', 'error']
    for i, (path, count) in enumerate(zip(inputs, counts)):
        records = json.loads(path.with_suffix('.json').read_text())[:count]
        assert len(records) == count, (coat, path, len(records))
        for record in records:
            record['time'] = round(len(reports) / 30, 4)
            record['lighting'] = 'night' if path == night else 'day'
            assert not record['errors'], (coat, record)
            reports.append(record)
        command += ['-i', str(path)]
        filters.append(f'[{i}:v]trim=end_frame={count},setpts=PTS-STARTPTS[v{i}]')
    filters.append(''.join(f'[v{i}]' for i in range(len(inputs))) + f'concat=n={len(inputs)}:v=1:a=0[out]')
    output = OUT / f'{coat}.mp4'
    subprocess.run(command + ['-filter_complex', ';'.join(filters), '-map', '[out]', '-c:v', 'libx264',
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
