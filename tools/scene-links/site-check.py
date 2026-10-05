#!/usr/bin/env python3
"""Off-screen WebKit screenshots + DOM checks. Serves only this worktree; no app launch."""
import http.server
import json
from pathlib import Path
import subprocess
import sys
import threading
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'shots/add-to-desktop'

class Site(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = unquote(urlsplit(path).path).lstrip('/')
        base = ROOT if path.startswith('scenes/') else ROOT / 'site'
        target = (base / path).resolve()
        return str(target if target.is_relative_to(base) else base / '__missing')

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, BrokenPipeError):
            pass  # WebKit may cancel in-flight resources when the snapshot exits.

    def log_message(self, *_):
        pass

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # Port 0 keeps the owner's own dev server untouched.
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Site)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    cases = [(m, theme, 1440, 1000) for m in ['button', 'sheet', 'fullscreen-panel', 'fullscreen-sheet'] for theme in ['light', 'dark']]
    cases.append(('mobile', 'light', 390, 844))
    if len(sys.argv) > 1:
        cases = [case for case in cases if case[0] in sys.argv[1:]]
    setup = (ROOT / 'tools/scene-links/site-check.js').read_text()
    results = []
    try:
        for mode, theme, w, h in cases:
            name = f'{mode}-{theme}'
            url = f'http://127.0.0.1:{server.server_port}/?shotAppearance={theme}&check={mode}'
            result = subprocess.run([str(ROOT / 'tools/wkshot'), url, str(OUT / f'{name}.png'), str(w), str(h), '0', setup], capture_output=True, text=True, timeout=65)
            (OUT / f'{name}.log').write_text(result.stdout + result.stderr)
            if result.returncode:
                raise RuntimeError(f'{name}: {result.stdout} {result.stderr}')
            payload = json.loads(next(line[8:] for line in result.stdout.splitlines() if line.startswith('result: ')))
            if payload.get('errors') or payload.get('imageErrors') or not payload.get('report'):
                raise RuntimeError(f'{name}: {payload}')
            results.append({'name': name, **payload['report']})
            print(f'{name}: PASS ({len(payload["report"]["checks"])} checks)', flush=True)
        (OUT / ('results-' + '-'.join(sys.argv[1:]) + '.json' if len(sys.argv) > 1 else 'results.json')).write_text(json.dumps(results, indent=2) + '\n')
    finally:
        server.shutdown()
        server.server_close()
        thread.join()

if __name__ == '__main__':
    main()
