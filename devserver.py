# Dev server for LiveWall scenes: static files + PUT /__shot/<name>.png saves a
# screenshot the page captured of itself into ../shots (used for self-testing).
import http.server, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scenes')
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_PUT(self):
        if not self.path.startswith('/__shot/'): return self.send_error(404)
        name = os.path.basename(self.path[len('/__shot/'):]) or 'shot.png'
        os.makedirs(SHOTS, exist_ok=True)
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        open(os.path.join(SHOTS, name), 'wb').write(data)
        self.send_response(204); self.end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 5210
http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
