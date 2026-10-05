"""30-fps off-screen WKWebView kernel CPU/physical-footprint comparison.
Virtual frame scheduling avoids hidden-window RAF throttling; CPU is measured by the
kernel, not the virtual JS clock. Helper PIDs come from this WKWebView's own getters.
Never discovers, controls or measures the installed wallpaper app.
"""
from pathlib import Path
import subprocess,json,shutil,time,tempfile,statistics,sys
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/train-stations'
def space():
 if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: disk below 3 GiB')
space();base=ROOT/'scenes/train-stations-baseline.html'
base.write_bytes(subprocess.check_output(['git','show','f6191d1:scenes/train.html'],cwd=ROOT))
try:
 with tempfile.TemporaryDirectory(prefix='train-stations-meter-') as temp:
  temp=Path(temp);source=(ROOT/'tools/wkshot.swift').read_text().replace('attempts > 120','attempts > 1200').replace('.now() + 60)', '.now() + 120)')
  source=source.replace('if attempts > 1200', '''if attempts == 15 {
                var ids: [String: Int] = ["host": Int(getpid())]
                for (label, object) in [("view", self.web as NSObject), ("pool", self.web.configuration.processPool as NSObject), ("store", self.web.configuration.websiteDataStore as NSObject)] {
                    for key in ["_webProcessIdentifier", "_gpuProcessIdentifier", "_networkProcessIdentifier"] {
                        if object.responds(to: NSSelectorFromString(key)), let pid = object.value(forKey: key) as? NSNumber { ids[label + key] = pid.intValue }
                    }
                }
                print("idle-pids:", String(data: try! JSONSerialization.data(withJSONObject: ids), encoding: .utf8)!); fflush(stdout)
                self.run("JSON.stringify({errors:window.__errs,imageErrors:window.__imageErrors,station:window.__train.stations?.report()})") { r in print("idle-ready:", r ?? "null"); fflush(stdout) }
                Timer.scheduledTimer(withTimeInterval: 1.0/30.0, repeats: true) { _ in self.run("LW.advance(1/30);void 0") { _ in } }
            }
            if attempts > 1200''')
  (temp/'hold.swift').write_text(source)
  meter=(ROOT/'tools/measure/wpmeter.swift').read_text().replace('let pids = family()', 'let pids = Array(Set([app] + args.dropFirst(3).compactMap { Int32($0) }))')
  (temp/'meter.swift').write_text(meter)
  for src,out in [(temp/'hold.swift',temp/'hold'),(temp/'meter.swift',temp/'meter')]:
   space();subprocess.run(['swiftc','-O',str(src),'-o',str(out),'-framework','AppKit','-framework','WebKit'],check=True,capture_output=True)
  requested=sys.argv[1:]
  assert all(name in ['baseline','cruise','released'] for name in requested)
  results=[] if not requested else [r for r in json.loads((OUT/'idle-performance.json').read_text())['samples'] if r['profile'] not in requested]
  # Balanced order: three independent 15-second samples per profile. An optional profile reruns only that profile.
  order=requested*3 if requested else ['baseline','cruise','released','released','cruise','baseline','cruise','baseline','released']
  for name in order:
   space();scene=base if name=='baseline' else ROOT/'scenes/train.html'
   js="window.__shotPending=true;__train.train.v=260;__train.train.d=1000"
   if name!='released':
    js+=";window.__shotReady=()=>{LW.advance(69);__train.train.d=1000;__train.train.v=260}"
   if name=='released':
    js+=";__train.forceStation(24);window.__shotPoll=()=>{if(__train.stations.art.images&&!window.__measuredCycle){LW.advance(69);__train.train.d=1000;window.__measuredCycle=true}}"
   with (OUT/f'idle-{name}.log').open('w') as log:
    proc=subprocess.Popen([str(temp/'hold'),scene.as_uri()+'?virtual=1&muted=1&hour=12&shotSeed=43',str(temp/'unused.png'),'1600','1000','0',js],stdout=log,stderr=log)
    try:
     deadline=time.monotonic()+60
     while 'idle-ready:' not in (OUT/f'idle-{name}.log').read_text():
      if proc.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Idle fixture failed to become ready: '+name)
      time.sleep(.5)
     lines=(OUT/f'idle-{name}.log').read_text().splitlines()
     ready=json.loads(next(l.removeprefix('idle-ready: ') for l in lines if l.startswith('idle-ready: ')))
     ids=json.loads(next(l.removeprefix('idle-pids: ') for l in lines if l.startswith('idle-pids: ')))
     assert not ready['errors'] and not ready['imageErrors'],ready
     assert all(any(kind in k and v>0 for k,v in ids.items()) for kind in ['webProcess','gpuProcess','networkProcess']),ids
     if name!='baseline':
      assert ready['station']['phase']=='cruise' and ready['station']['bytes']==0,ready
      if name=='released':assert ready['station']['releases']==1,ready
     space();time.sleep(2)
     measurement=subprocess.check_output([str(temp/'meter'),'15',*map(str,sorted(set(v for v in ids.values() if v>0)))],text=True)
     result={'profile':name,**json.loads(measurement),'fixture':ready,'measuredPids':ids};results.append(result);print(name,json.dumps(result),flush=True)
    finally:
     proc.terminate();proc.wait(timeout=10)
  summaries={name:{metric:statistics.median(r['total'][metric] for r in results if r['profile']==name) for metric in ['cpu','mb','mw']} for name in ['baseline','cruise','released']}
  (OUT/'idle-performance.json').write_text(json.dumps({'samples':results,'medians':summaries},indent=2)+'\n')
  print('MEDIANS',json.dumps(summaries),flush=True)
finally:base.unlink(missing_ok=True)
