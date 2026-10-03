#!/usr/bin/env python3
"""plate-scene — turn any place into a wallpap plate scene.  See tools/plate-scene/README.md.

  plate.py prompts <id> [job]        print the expanded prompts (nothing is generated)
  plate.py gen     <id> [job ...]    Codex: day master → dusk/night/overcast(/dawn) edits + chroma-key masks + sprite sheets
                                     jobs: day dawn dusk night overcast key:<name> sheet:<name> | all (default) | plates | keys | sheets
                                     existing outputs are skipped (delete to regenerate); -j N parallel (default 5)
  plate.py build   <id>              align edits/keys onto the day geometry → crop 16:10 → upscale → plates/*.png
  plate.py masks   <id>              sky / water / any key → masks/*.png (+ emissive.png = night − day, lights.json)
  plate.py cut     <id> [sheet ...]  cut sheets/*.png → sprites/<sheet>-<n>.png (grey or green background, row-major)
  plate.py check   <id>              layout.json drawn over the day + night plates → check-day.png / check-night.png
  plate.py pack    <id>              → addons/<id>/art/: plates .jpg, masks, emissive, atlas.png + atlas.json, layout.json
Paths: art-src/<id>/{spec.json, raw/, sheets/, plates/, masks/, sprites/, layout.json, logs/}.
"""
import json, os, subprocess, sys, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import prompts as P

VARIANTS = ['day', 'dawn', 'dusk', 'night', 'overcast']


def art(sid, *p): return os.path.join(ROOT, 'art-src', sid, *p)
def load(sid): return json.load(open(art(sid, 'spec.json')))


def jobs_for(spec, sid, want):
    """→ {job: (prompt, out, refs)} for the requested job names."""
    J = {}
    for v in [v for v in VARIANTS if v in spec.get('plates', ['day', 'dusk', 'night', 'overcast'])]:
        out = art(sid, 'raw', f'plate-{v}.png')
        J[v] = (P.master(spec), out, None) if v == 'day' else (P.edit(spec, v), out, art(sid, 'raw', 'plate-day.png'))
    for name, region in spec.get('keys', {}).items():
        J['key:' + name] = (P.key(spec, region), art(sid, 'raw', f'key-{name}.png'), art(sid, 'raw', 'plate-day.png'))
    for name, sh in spec.get('sheets', {}).items():
        J['sheet:' + name] = (P.sheet(spec, sh), art(sid, 'sheets', f'{name}.png'), art(sid, sh['ref']) if sh.get('ref') else None)
    if not want or want == ['all']: return J
    out = {}
    for w in want:
        if w == 'plates': out.update({k: v for k, v in J.items() if ':' not in k})
        elif w == 'keys': out.update({k: v for k, v in J.items() if k.startswith('key:')})
        elif w == 'sheets': out.update({k: v for k, v in J.items() if k.startswith('sheet:')})
        elif w in J: out[w] = J[w]
        else: sys.exit(f'unknown job {w}; have: {" ".join(J)}')
    return out


def codex(job, prompt, out, refs, sid):
    if os.path.exists(out): return f'skip {job}'
    os.makedirs(os.path.dirname(out), exist_ok=True); os.makedirs(art(sid, 'logs'), exist_ok=True)
    cmd = ['codex', 'exec', '-s', 'workspace-write', '--skip-git-repo-check']
    if refs: cmd += ['-i', refs]
    cmd += ['-']
    with open(art(sid, 'logs', job.replace(':', '-') + '.txt'), 'w') as log:
        subprocess.run(cmd, input=(prompt + P.TAIL.format(out=out)).encode(), stdout=log, stderr=subprocess.STDOUT, cwd=art(sid))
    return ('ok   ' if os.path.exists(out) else 'FAIL ') + job


def gen(sid, want, par=5):
    spec = load(sid); J = jobs_for(spec, sid, want)
    first = {k: v for k, v in J.items() if not v[2] or not v[2].endswith('plate-day.png')}
    then = {k: v for k, v in J.items() if k not in first}
    for batch in (first, then):
        if batch is then and not os.path.exists(art(sid, 'raw', 'plate-day.png')):
            if then: print('no day plate yet — skipping', ' '.join(then)); break
        with cf.ThreadPoolExecutor(par) as ex:
            for r in ex.map(lambda kv: codex(kv[0], *kv[1], sid), batch.items()): print(r, flush=True)


def main():
    a = sys.argv[1:]
    if len(a) < 2: sys.exit(__doc__)
    cmd, sid, rest = a[0], a[1], a[2:]
    par = 5
    if '-j' in rest: i = rest.index('-j'); par = int(rest[i + 1]); rest = rest[:i] + rest[i + 2:]
    if cmd == 'prompts':
        for k, (p, out, refs) in jobs_for(load(sid), sid, rest).items(): print(f'### {k}  → {os.path.relpath(out, ROOT)}' + (f'  (ref {os.path.relpath(refs, ROOT)})' if refs else '') + '\n' + p + '\n')
    elif cmd == 'gen': gen(sid, rest, par)
    elif cmd in ('build', 'masks', 'cut', 'check', 'pack'):
        import steps; getattr(steps, cmd)(sid, rest)
    else: sys.exit(__doc__)


if __name__ == '__main__':
    main()
