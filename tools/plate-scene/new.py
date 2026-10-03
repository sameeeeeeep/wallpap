#!/usr/bin/env python3
"""Make a complete local wallpap add-on from one sentence; see QUICKSTART.md."""
import argparse
import fcntl
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import prompts

PRESETS = {'water', 'birds', 'boats', 'traffic', 'lights', 'walkers'}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, indent=2) + '\n')
    tmp.replace(path)


def make_spec(sid, description, category='Nature', requested=None):
    """Deterministic prompt expansion, no per-place scripts or separate planning agent."""
    text = description.lower()
    water = bool(re.search(r'\b(stream|river|lake|pond|koi|sea|ocean|harbou?r|beach|coast|water|canal)\b', text))
    boats = bool(re.search(r'\b(boats?|ships?|harbou?r|marina|fishing)\b', text))
    traffic = bool(re.search(r'\b(road|street|traffic|highway|boulevard|city)\b', text))
    lights = bool(re.search(r'\b(temple|harbou?r|village|city|town|street|cabin|building|garden)\b', text))
    names = set(requested) if requested is not None else {'birds'} | ({'water'} if water else set()) | ({'boats'} if boats else set()) | ({'traffic'} if traffic else set()) | ({'lights'} if lights else set())
    if 'boats' in names: names.add('water')
    keys = {
        'sky': 'ONLY the open sky, including the sky in gaps between branches; exclude water reflections, foliage, buildings and land',
        'exposed': 'ONLY open sky and outdoor upward-facing surfaces directly exposed to falling rain (open water, uncovered ground, open paths, upper roof surfaces). Leave walls, tree trunks, foliage silhouettes, interiors, sheltered ground under roofs/awnings/bridges/canopies and all other objects UNCHANGED. Be conservative at shelter boundaries',
    }
    if 'water' in names: keys['water'] = 'ONLY visible liquid water, precisely excluding banks, rocks, bridges, land, structures and sky'
    if 'traffic' in names: keys['road'] = 'ONLY the drivable road surface. Exclude pavements, buildings, water and all other surfaces. If there is no road, change nothing'
    if 'walkers' in names: keys['walk'] = 'ONLY uncovered pedestrian paths in the middle distance. Exclude roads, water, walls, stairs, obstructions and all other surfaces. If there is no safe path, change nothing'
    natural = not lights
    return {
        'scene': description.strip(), 'style': 'photo',
        'calm': 'quiet open water, sky or simple low-contrast ground appropriate to this place',
        'space': 'Wide establishing view from a fixed camera, believable perspective. Place the main landmark in the left two-thirds. Leave water and travel corridors unobstructed in the middle distance where appropriate. Preserve the character of the requested place; do not add roads or buildings that do not belong.',
        'preserve': 'every shoreline, branch, rock, path, building, roof edge and horizon',
        'surfaces': 'the existing natural and architectural surfaces',
        'night_lights': ('No artificial lighting, no lamps, no buildings added; only very faint blue ambient night light' if natural else 'Only existing windows and existing lamps glow softly warm; no extra structures, lights, signs or objects'),
        'wet': 'exposed surfaces have a restrained wet sheen, while sheltered ground stays dry; preserve water boundaries',
        'plates': ['day', 'dusk', 'night', 'overcast'], 'keys': keys,
        'mask_ops': [{'name': n, 'minus': ['sky']} for n in keys if n not in ('sky', 'exposed')],
        'emissive': {'max_lights': 160}, 'ship_size': [2560, 1600], 'jpeg': 86,
        'generator': {'name': 'plate-new', 'version': 1, 'id': sid, 'description': description,
                      'category': category, 'presets': sorted(names)},
    }


def derive_path(mask_path, kind='water'):
    """Shortest routes within one eroded mask component; never bridge islands/holes.

    At 256x160, weighted graph distance prefers clearance from banks. Keep the
    middle distance and left 70% free of desktop widgets; live layout can mirror it.
    A missing/narrow/disconnected route is a supported result, not a fake path.
    """
    import numpy as np
    from PIL import Image
    from scipy import ndimage as nd
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import dijkstra
    if not mask_path.exists(): return None
    m = np.asarray(Image.open(mask_path).convert('L').resize((256, 160))) > 235
    m[:int(160 * .36)] = False
    m[int(160 * .79):] = False
    m[:, int(256 * .69):] = False
    m[:, :int(256 * .04)] = False
    m = nd.binary_erosion(m, iterations=2 if kind == 'water' else 1)
    lab, n = nd.label(m)
    if not n: return None
    counts = np.bincount(lab.ravel()); counts[0] = 0
    m = lab == counts.argmax()
    yy, xx = np.where(m)
    if len(xx) < 25: return None
    clearance = nd.distance_transform_edt(m)
    ids = np.full(m.shape, -1, dtype=int); ids[yy, xx] = np.arange(len(xx))
    rows, cols, costs = [], [], []
    for dy, dx in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
        ny, nx = yy + dy, xx + dx
        valid = (ny >= 0) & (ny < 160) & (nx >= 0) & (nx < 256)
        a = np.where(valid)[0]; ny, nx = ny[valid], nx[valid]
        good = ids[ny, nx] >= 0; a, ny, nx = a[good], ny[good], nx[good]
        rows.extend(a); cols.extend(ids[ny, nx]); costs.extend(1 + 4 / np.maximum(1, clearance[ny, nx]))
    graph = coo_matrix((costs, (rows, cols)), shape=(len(xx), len(xx))).tocsr()
    # Choose opposite extremes in the component's longest direction.
    axis = xx if np.ptp(xx) >= np.ptp(yy) else yy
    start = int(np.argmin(axis)); end = int(np.argmax(axis))
    dist, previous = dijkstra(graph, directed=False, indices=start, return_predecessors=True)
    if not np.isfinite(dist[end]): return None
    chain = [end]
    while chain[-1] != start:
        p = int(previous[chain[-1]])
        if p < 0: return None
        chain.append(p)
    chain.reverse()
    if len(chain) < 26: return None
    # Keep every turn, rather than simplifying across a bank or a hole.
    points = [[(int(xx[i]) + .5) / 256, (int(yy[i]) + .5) / 160] for i in chain]
    keep = [points[0]]
    for i in range(1, len(points) - 1):
        a, b, c = points[i-1:i+2]
        if (b[0]-a[0], b[1]-a[1]) != (c[0]-b[0], c[1]-b[1]): keep.append(b)
    keep.append(points[-1])
    return keep


def assemble(sid, spec):
    from PIL import Image
    src, dst = ROOT / 'art-src' / sid, ROOT / 'addons' / sid
    art = dst / 'art'; names = set(spec['generator']['presets'])
    route_names = {'boats': 'water', 'traffic': 'road', 'walkers': 'walk'}
    paths, fallbacks = {}, []
    for preset, mask in route_names.items():
        if preset in names:
            route = derive_path(art / (mask + '.png'), mask)
            if route: paths[mask] = route
            else:
                names.remove(preset)
                fallbacks.append(f'{preset}: no safe {mask} path; retained sky/weather/ambience and any valid water shimmer')
    layers = {'plates': {n: f'plate-{n}.jpg' for n in spec['plates']},
              'masks': {n: n + '.png' for n in spec['keys']}, 'focus': [.5, .5]}
    if (art / 'emissive.jpg').exists(): layers['masks']['emissive'] = 'emissive.jpg'
    if (art / 'lights.json').exists(): layers['lights'] = 'lights.json'
    import numpy as np
    sky = np.asarray(Image.open(art / 'sky.png')) > 127
    ys, _ = np.where(sky)
    layers['horizon'] = round(float(np.percentile(ys, 95) / sky.shape[0]), 3) if len(ys) else .4
    life = {'weather': True, 'calm': 'breathing', 'click': 'ripple-or-breeze',
            'ambience': 'stream' if re.search(r'\b(stream|river|koi|pond)\b', spec['scene'].lower()) else 'ocean' if 'water' in names else 'wind'}
    if 'water' in names: life['water'] = {'strength': .28, 'sparkle': .1}
    if 'birds' in names: life['birds'] = {'count': 5, 'height': max(.08, layers['horizon'] * .52)}
    if 'boats' in names: life['boats'] = {'count': 2, 'period': 240, 'size': .012}
    if 'traffic' in names: life['traffic'] = {'count': 5, 'period': 100}
    if 'walkers' in names: life['walkers'] = {'count': 2, 'period': 300}
    if 'lights' in names: life['lights'] = {'strength': .4}
    title = sid.replace('-', ' ').title()
    config = {'version': 1, 'title': title, 'layers': layers, 'life': life, 'paths': paths, 'fallbacks': fallbacks}
    write_json(art / 'scene-config.json', config)
    write_json(dst / 'scene.json', {'id': sid, 'title': title, 'category': spec['generator']['category'],
               'author': 'wallpap', 'version': 1, 'pro': True, 'blurb': spec['scene']})
    shutil.copyfile(ROOT / 'addons/_template/index.html', dst / 'index.html')
    # Limit copies to this new add-on: addons/build.sh touches every other add-on.
    for filename in ('kit.js', 'moon.js', 'astronomy.js', 'lw.js'):
        shutil.copyfile(ROOT / 'scenes' / filename, dst / filename)
    (art / 'shared').mkdir(exist_ok=True)
    shutil.copyfile(ROOT / 'scenes/art/shared/moon.png', art / 'shared/moon.png')
    Image.open(art / 'plate-day.jpg').resize((256, 160), Image.Resampling.LANCZOS).save(dst / 'thumb.jpg', quality=88)
    for message in fallbacks: print('  fallback:', message, flush=True)


def package(sid):
    """Use the existing packer without changing site/catalog.json or other sessions."""
    with tempfile.TemporaryDirectory(prefix='wallpap-new-pack-') as folder:
        stage = Path(folder)
        (stage / 'tools').mkdir(); (stage / 'addons').mkdir()
        shutil.copyfile(ROOT / 'tools/pack-scene.sh', stage / 'tools/pack-scene.sh')
        (stage / 'addons' / sid).symlink_to(ROOT / 'addons' / sid, target_is_directory=True)
        subprocess.run(['zsh', str(stage / 'tools/pack-scene.sh'), 'addons/' + sid], check=True)
        target = ROOT / 'art-src' / sid / 'package'; target.mkdir(exist_ok=True)
        for p in (stage / 'site/scenes-pack').iterdir(): shutil.copyfile(p, target / p.name)
        shutil.copyfile(stage / 'site/catalog.json', target / 'catalog-entry.json')
    print('  local ZIP:', target / (sid + '-1.zip'), flush=True)


def validate_generation(src, spec):
    from PIL import Image
    files = [src / 'raw' / f'plate-{n}.png' for n in spec['plates']]
    files += [src / 'raw' / f'key-{n}.png' for n in spec['keys']]
    for p in files:
        if not p.exists(): raise RuntimeError(f'Generation did not produce {p.name}; inspect {src}/logs, then rerun with --resume')
        with Image.open(p) as im: im.verify()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('id'); parser.add_argument('description')
    parser.add_argument('--category', default='Nature')
    parser.add_argument('--presets', help='comma-separated water,birds,boats,traffic,lights,walkers; default: infer from description')
    parser.add_argument('--jobs', type=int, default=5, help='parallel generation jobs (default 5)')
    parser.add_argument('--resume', action='store_true', help='resume this launcher’s existing spec; never replace art')
    parser.add_argument('--prepare-only', action='store_true', help='write spec and expanded prompts, no generation')
    args = parser.parse_args(argv)
    if not re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', args.id): parser.error('id must be lowercase letters/digits separated by hyphens')
    if not args.description.strip(): parser.error('description cannot be empty')
    if not 1 <= args.jobs <= 8: parser.error('--jobs must be 1..8')
    requested = {p.strip() for p in args.presets.split(',') if p.strip()} if args.presets is not None else None
    if requested is not None and requested - PRESETS: parser.error('unknown presets: ' + ', '.join(sorted(requested - PRESETS)))
    if args.id in {'marine-drive', 'taj', 'ghibli-valley', 'airport'}: parser.error('existing/concurrently owned add-on: choose a NEW id')
    src, dst = ROOT / 'art-src' / args.id, ROOT / 'addons' / args.id
    if src.is_symlink() or dst.is_symlink(): parser.error('output directories must not be symlinks')
    if (src.exists() or dst.exists()) and not args.resume: parser.error('id already exists; choose a new id or use --resume for a plate-new scene')
    if args.resume:
        if not (src / 'spec.json').exists(): parser.error('--resume needs an existing plate-new spec')
        spec = json.loads((src / 'spec.json').read_text())
        expected = make_spec(args.id, args.description, args.category, requested)['generator']
        if spec.get('generator') != expected: parser.error('resume arguments do not match the saved spec; use the original command plus --resume')
    else:
        spec = make_spec(args.id, args.description, args.category, requested)
        # mkdir is also an atomic claim against concurrent creation of this same id.
        src.mkdir(parents=True, exist_ok=False)
    with (src / '.new.lock').open('w') as lock:
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: parser.error('this scene is already being generated by another process')
        for dep in ('numpy', 'scipy', 'PIL'): __import__(dep)
        if not args.prepare_only and not shutil.which('codex'): parser.error('codex CLI is required by plate.py gen')
        write_json(src / 'spec.json', spec)
        # Sources remain available locally. Commit reproducible inputs and timings,
        # plus shipped art, rather than hundreds of MB of aligned intermediates.
        (src / '.gitignore').write_text('raw/\nplates/\nmasks/\nlogs/\npackage/\n.new.lock\n')
        expanded = {'day': prompts.master(spec)}
        expanded.update({n: prompts.edit(spec, n) for n in spec['plates'] if n != 'day'})
        expanded.update({'key:' + n: prompts.key(spec, r) for n, r in spec['keys'].items()})
        write_json(src / 'prompts.json', expanded)
        if args.prepare_only:
            print('Prepared', src / 'spec.json'); return 0
        timing_path = src / 'timings.json'
        records = json.loads(timing_path.read_text()) if timing_path.exists() else {'runs': []}
        run = {'started': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'stages': [], 'status': 'running'}
        records['runs'].append(run); started = time.monotonic()
        def stage(name, fn):
            print(f'[{args.id}] {name} ...', flush=True); t = time.monotonic()
            item = {'name': name, 'status': 'running'}; run['stages'].append(item)
            write_json(timing_path, records)
            try: fn(); item['status'] = 'ok'
            except BaseException:
                item['status'] = 'failed'; raise
            finally:
                item['seconds'] = round(time.monotonic() - t, 2)
                write_json(timing_path, records)
                print(f'[{args.id}] {name}: {item["seconds"]:.2f}s ({item["status"]})', flush=True)
        def plate(command):
            subprocess.run([sys.executable, str(HERE / 'plate.py'), command, args.id] + (['-j', str(args.jobs)] if command == 'gen' else []), cwd=ROOT, check=True)
            if command == 'gen': validate_generation(src, spec)
        try:
            for command in ('gen', 'build', 'masks', 'pack'): stage(command, lambda c=command: plate(c))
            stage('configure', lambda: assemble(args.id, spec))
            stage('package', lambda: package(args.id))
            run['status'] = 'ok'
        except BaseException as error:
            run['status'] = 'failed'; run['error'] = str(error)
            raise
        finally:
            run['seconds'] = round(time.monotonic() - started, 2)
            write_json(timing_path, records)
            print(f'[{args.id}] TOTAL {run["seconds"] / 60:.2f} min ({run["status"]})', flush=True)
        print('Ready:', dst, '\nPreview: http://localhost:5210/_addons/' + args.id + '/index.html?virtual=1&muted=1')
    return 0


if __name__ == '__main__':
    try: sys.exit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print('ERROR:', error, file=sys.stderr); sys.exit(1)
