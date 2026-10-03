import http.server
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class H(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def translate_path(self,path):
  p=Path(super().translate_path(path))
  if not p.exists() and p.name in ('lw.js','astronomy.js'):return str(ROOT/'scenes'/p.name)
  return str(p)
 def log_message(self,*a):pass
http.server.ThreadingHTTPServer(('127.0.0.1',5214),H).serve_forever()
