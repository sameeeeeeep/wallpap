#!/usr/bin/env python3
"""Measure every scene in the REAL app on this Mac: CPU, memory and energy.

Needs wallpap running with LIVEWALL_DEV=1 (so ./dev.sh can switch scenes). For each scene it switches,
lets it settle, then for N seconds records (a) the app + its WebKit helpers via .build/wpmeter (CPU %,
memory footprint, CPU-side energy) and (b) whole-Mac power from the battery (current x voltage, only
meaningful on battery). A 'paused' baseline is taken first and last; the battery delta vs paused is the
wallpaper's real battery cost, GPU and compositor included. Run it while the Mac is otherwise idle.

    python3 tools/measure/run-scenes.py [--settle 15] [--seconds 30] [scene ...]  → docs/perf/<date>.json

Checking the pause/memory targets on a fresh build (quit the installed wallpap first; one instance only):
    ./build.sh && LIVEWALL_DEV=1 ./wallpap.app/Contents/MacOS/wallpap &
    rm -f .build/wpmeter .build/devpost                         # rebuild the meters from this checkout
    python3 tools/measure/run-scenes.py --seconds 20 --extras --soak 60 koi cats      # ~6 min
  - 'paused-start' / 'paused-end' rows (the real Pause path): total cpu < 0.5 % (app + WebKit helpers).
  - 'cats->koi memory every 2 s': falls to about koi's own row (~300-400 MB) within the first 2-3 samples,
    with no second large com.apple.WebKit.WebContent left in the row's procs.
Then quit it and reopen the installed wallpap.
"""
import argparse, json, os, re, subprocess, threading, time, datetime, platform
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
ap = argparse.ArgumentParser()
ap.add_argument('--settle', type=float, default=15); ap.add_argument('--seconds', type=float, default=30)
ap.add_argument('--interact', action='store_true', help='drive each scene with the scripted pointer while measuring')
ap.add_argument('--extras', action='store_true', help='also: scene-switch spike, Play open, 10-min memory soak (koi, cats)')
ap.add_argument('--soak', type=float, default=600)
ap.add_argument('scenes', nargs='*', default=['koi', 'bowls', 'cats', 'grass', 'cafe', 'records', 'ramen', 'rooftop', 'speakeasy', 'cabin', 'train', 'cymatics'])
a = ap.parse_args()

def dev(cmd):
    try: subprocess.run(['.build/devpost', cmd], capture_output=True, timeout=10)
    except subprocess.TimeoutExpired: print('  (dev command timed out:', cmd, ')', flush=True)
def devjs(js):
    try: os.remove('/tmp/livewall-dev.txt')
    except OSError: pass
    dev('js:' + js); time.sleep(0.6)
    try: return open('/tmp/livewall-dev.txt').read().strip()
    except OSError: return ''

def battery_w():
    out = subprocess.run(['ioreg', '-rn', 'AppleSmartBattery'], capture_output=True, text=True).stdout
    amp = re.search(r'"InstantAmperage" = (\d+)', out); volt = re.search(r'"Voltage" = (\d+)', out)
    ext = '"ExternalConnected" = Yes' in out
    if not amp or not volt: return None, ext
    ma = int(amp.group(1)); ma = ma - (1 << 64) if ma >= (1 << 63) else ma
    return -ma * int(volt.group(1)) / 1e6, ext          # discharge current is negative → positive watts

def measure(label):
    watts, plugged = [], False
    stop = threading.Event()
    def poll():
        nonlocal plugged
        while not stop.is_set():
            w, ext = battery_w(); plugged |= ext
            if w is not None: watts.append(w)
            stop.wait(1)
    t = threading.Thread(target=poll); t.start()
    r = subprocess.run(['.build/wpmeter', str(a.seconds)], capture_output=True, text=True)
    stop.set(); t.join()
    m = json.loads(r.stdout)
    sysw = sum(watts) / len(watts) if watts and not plugged else None
    row = {'label': label, **m['total'], 'systemW': round(sysw, 2) if sysw is not None else None,
           'procs': m['procs']}
    print(f"{label:12s} cpu {m['total']['cpu']:5.1f}%  mem {m['total']['mb']:5.0f} MB  cpu-energy {m['total']['mw']:4.0f} mW  "
          f"system {('%.2f W' % sysw) if sysw is not None else 'n/a (plugged in)'}", flush=True)
    return row

for tool in ['devpost', 'wpmeter']:
  if not os.path.exists(f'.build/{tool}'):
    subprocess.run(['swiftc', '-O', f'tools/measure/{tool}.swift', '-o', f'.build/{tool}'], check=True)
if False:
    subprocess.run(['swiftc', '-O', 'tools/measure/wpmeter.swift', '-o', '.build/wpmeter'], check=True)
info = {'date': datetime.datetime.now().isoformat(timespec='seconds'),
        'model': subprocess.run(['sysctl', '-n', 'hw.model'], capture_output=True, text=True).stdout.strip(),
        'chip': subprocess.run(['sysctl', '-n', 'machdep.cpu.brand_string'], capture_output=True, text=True).stdout.strip(),
        'macos': platform.mac_ver()[0], 'settle': a.settle, 'seconds': a.seconds}
rows = []
os.makedirs('docs/perf', exist_ok=True)
OUT = f"docs/perf/{info['date'][:10]}-{info['model']}{'-interact' if a.interact else ''}{'-extras' if a.extras else ''}.json"
def save(): json.dump({'info': info, 'rows': rows}, open(OUT, 'w'), indent=1)
# Keep the wallpaper engaged for the whole run (the owner may be away); restore their mode after.
DOM = 'live.wallpap.mac'
prev_mode = subprocess.run(['defaults', 'read', DOM, 'energyMode'], capture_output=True, text=True)
prev_mode = prev_mode.stdout.strip() if prev_mode.returncode == 0 else None
subprocess.run(['defaults', 'write', DOM, 'energyMode', 'always'])
def restore_mode():
    if prev_mode is None: subprocess.run(['defaults', 'delete', DOM, 'energyMode'], capture_output=True)
    else: subprocess.run(['defaults', 'write', DOM, 'energyMode', prev_mode])
prev_scene = subprocess.run(['defaults', 'read', DOM, 'scene'], capture_output=True, text=True).stdout.strip() or 'koi'
import atexit; atexit.register(restore_mode); atexit.register(lambda: dev(f'scene:{prev_scene}'))
def paused(label):
    # The real Pause path (host stops its polling too); the JS line keeps older builds paused as well.
    dev('pause'); devjs("__lw('pauseReason','user'); __lw('focus',false)"); time.sleep(a.settle)
    rows.append(measure(label)); dev('resume'); devjs("__lw('pauseReason',''); __lw('focus',true)")
paused('paused-start')
for s in a.scenes:
    dev(f'scene:{s}'); time.sleep(a.settle)
    devjs("__lw('focus',true)")
    if a.interact: dev(f'interact:{a.seconds + 2:.0f}')
    rows.append(measure(s + ('+interact' if a.interact else ''))); save()
if a.extras:
    # Switching cost: measure the 10 s right after a scene change (teardown + load + art decode).
    for s in ['cats', 'koi', 'train']:
        dev(f'scene:{s}'); r = subprocess.run(['.build/wpmeter', '10'], capture_output=True, text=True)
        m = json.loads(r.stdout); rows.append({'label': f'switch->{s}', **m['total'], 'systemW': None, 'procs': m['procs']})
        print(f"switch->{s:7s} cpu {m['total']['cpu']:5.1f}%  mem {m['total']['mb']:5.0f} MB (first 10 s)", flush=True); time.sleep(a.settle)
    # Memory after leaving a heavy scene: cats (~1 GB of decoded sprites) → koi. Should fall to koi's own
    # baseline within a few seconds (the old page is closed, its WebContent process exits).
    dev('scene:cats'); time.sleep(a.settle); dev('scene:koi'); series = []; pages = []
    for i in range(10):
        m = json.loads(subprocess.run(['.build/wpmeter', '2'], capture_output=True, text=True).stdout)
        series.append(m['total']['mb'])
        pages.append([p['mb'] for p in m['procs'] if p['name'] == 'com.apple.WebKit.WebContent'])   # a lingering old page shows here
    rows.append({'label': 'cats->koi-memory', 'mbSeries': series, 'mbEnd': series[-1], 'webContentMB': pages})
    print(f"cats->koi memory every 2 s: {series} MB; WebContent processes: {pages}", flush=True)
    # Play open over the live scene.
    dev('scene:cats'); time.sleep(a.settle); dev('play-toggle'); time.sleep(4)
    rows.append(measure('play-open')); dev('play-toggle'); time.sleep(3)
    # Memory soak: does footprint keep growing? Sample every 30 s.
    for s in ['koi', 'cats']:
        dev(f'scene:{s}'); time.sleep(a.settle); series = []
        for i in range(int(a.soak // 30)):
            if a.interact and i % 4 == 0: dev('interact:25')
            m = json.loads(subprocess.run(['.build/wpmeter', '30'], capture_output=True, text=True).stdout)
            series.append(m['total']['mb'])
        rows.append({'label': f'soak-{s}', 'mbSeries': series, 'mbStart': series[0], 'mbEnd': series[-1], 'mbPeak': max(series)})
        print(f"soak {s:5s} memory {series[0]:.0f} → {series[-1]:.0f} MB (peak {max(series):.0f}) over {len(series)*30} s", flush=True)
paused('paused-end')
base = [r['systemW'] for r in rows if r['label'].startswith('paused') and r['systemW'] is not None]
if base:
    b = sum(base) / len(base)
    for r in rows: r['wallpaperW'] = round(r['systemW'] - b, 2) if r['systemW'] is not None else None
os.makedirs('docs/perf', exist_ok=True)
out = f"docs/perf/{info['date'][:10]}-{info['model']}{'-interact' if a.interact else ''}{'-extras' if a.extras else ''}.json"
json.dump({'info': info, 'rows': rows}, open(out, 'w'), indent=1)
print('saved', out)
