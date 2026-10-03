"""Minimal Chrome DevTools Protocol client over --remote-debugging-pipe (stdlib only).

    with Chrome() as ch:
        page = ch.new_page(1920, 1080, scale=5/3)
        page.goto('http://127.0.0.1:5299/marketing/tools/stage.html')
        page.eval('1 + 1')            # -> 2
        jpg = page.screenshot()       # bytes
"""
import base64, json, os, shutil, subprocess, tempfile, threading, time

CHROME_CANDIDATES = [
    os.environ.get('CHROME', ''),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
]


class CDPError(RuntimeError):
    pass


class Chrome:
    def __init__(self, headless=True):
        exe = next((p for p in CHROME_CANDIDATES if p and os.path.exists(p)), None)
        if not exe:
            raise SystemExit('Google Chrome not found (set CHROME=/path/to/chrome)')
        self.profile = tempfile.mkdtemp(prefix='wallpap-capture-')
        to_child_r, self._w = os.pipe()
        self._r, from_child_w = os.pipe()

        def pre():
            os.dup2(to_child_r, 3)
            os.dup2(from_child_w, 4)

        args = [exe, '--remote-debugging-pipe', f'--user-data-dir={self.profile}',
                '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
                '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required',
                '--disable-features=Translate,MediaRouter', '--force-color-profile=srgb',
                '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
        if headless:
            args.append('--headless=new')
        args.append('about:blank')
        self.proc = subprocess.Popen(args, preexec_fn=pre, close_fds=False,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.close(to_child_r); os.close(from_child_w)
        self._id = 0
        self._lock = threading.Lock()
        self._waiters = {}
        self._events = []
        self._alive = True
        threading.Thread(target=self._reader, daemon=True).start()

    # ── transport ──────────────────────────────────────────────────────────
    def _reader(self):
        buf = b''
        while self._alive:
            try:
                chunk = os.read(self._r, 1 << 20)
            except OSError:
                break
            if not chunk:
                break
            buf += chunk
            while b'\0' in buf:
                raw, buf = buf.split(b'\0', 1)
                msg = json.loads(raw)
                if 'id' in msg:
                    w = self._waiters.pop(msg['id'], None)
                    if w:
                        w[1].append(msg); w[0].set()
                else:
                    self._events.append(msg)
                    if len(self._events) > 500:
                        del self._events[:250]
        self._alive = False
        for ev, box in list(self._waiters.values()):
            box.append({'error': {'message': 'chrome exited'}}); ev.set()

    def send(self, method, params=None, session=None, timeout=120):
        with self._lock:
            self._id += 1
            mid = self._id
        msg = {'id': mid, 'method': method, 'params': params or {}}
        if session:
            msg['sessionId'] = session
        ev, box = threading.Event(), []
        self._waiters[mid] = (ev, box)
        data = json.dumps(msg).encode() + b'\0'
        with self._lock:
            os.write(self._w, data)
        if not ev.wait(timeout):
            raise CDPError(f'timeout: {method}')
        res = box[0]
        if 'error' in res:
            raise CDPError(f"{method}: {res['error'].get('message')}")
        return res.get('result', {})

    def new_page(self, width, height, scale=1.0):
        tid = self.send('Target.createTarget', {'url': 'about:blank', 'newWindow': True, 'width': width, 'height': height})['targetId']
        sid = self.send('Target.attachToTarget', {'targetId': tid, 'flatten': True})['sessionId']
        p = Page(self, sid, tid)
        p.send('Page.enable'); p.send('Runtime.enable')
        p.resize(width, height, scale)
        return p

    def close(self):
        try:
            self.send('Browser.close', timeout=5)
        except Exception:
            pass
        self._alive = False
        try:
            self.proc.wait(5)
        except Exception:
            self.proc.kill()
        shutil.rmtree(self.profile, ignore_errors=True)

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


class Page:
    def __init__(self, chrome, session, target):
        self.c, self.s, self.target = chrome, session, target
        self.width = self.height = 0
        self.scale = 1.0

    def send(self, method, params=None, timeout=120):
        return self.c.send(method, params, self.s, timeout)

    def resize(self, width, height, scale=1.0):
        self.width, self.height, self.scale = width, height, scale
        self.send('Emulation.setDeviceMetricsOverride',
                  {'width': width, 'height': height, 'deviceScaleFactor': scale, 'mobile': False})

    def goto(self, url, settle=1.5):
        self.send('Page.navigate', {'url': url})
        t0 = time.time()
        while time.time() - t0 < 30:
            try:
                if self.eval('document.readyState') == 'complete':
                    break
            except CDPError:
                pass
            time.sleep(0.1)
        time.sleep(settle)

    def eval(self, expr, timeout=120):
        r = self.send('Runtime.evaluate', {'expression': expr, 'awaitPromise': True,
                                           'returnByValue': True, 'userGesture': True}, timeout)
        if 'exceptionDetails' in r:
            d = r['exceptionDetails']
            raise CDPError('JS: ' + (d.get('exception', {}).get('description') or d.get('text', '?')))
        return r.get('result', {}).get('value')

    def screenshot(self, fmt='jpeg', quality=94):
        p = {'format': fmt, 'captureBeyondViewport': False, 'optimizeForSpeed': True}
        if fmt == 'jpeg':
            p['quality'] = quality
        return base64.b64decode(self.send('Page.captureScreenshot', p)['data'])
