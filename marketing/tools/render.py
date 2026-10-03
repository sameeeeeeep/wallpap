#!/usr/bin/env python3
"""wallpap marketing renderer — one command re-renders every clip and still from the live scenes.

    python3 marketing/tools/render.py                 # music (if missing) + all clips + all stills
    python3 marketing/tools/render.py clips koi music # just these clips (all three aspects)
    python3 marketing/tools/render.py clips --quick   # fast preview: 1920×1080 master, draft encode
    python3 marketing/tools/render.py stills          # Instagram carousel + Product Hunt gallery
    python3 marketing/tools/render.py post koi        # re-do captions/crops/audio from the cached master
    python3 marketing/tools/render.py music           # regenerate the original music beds

Options: --jobs N (parallel headless Chromes, default 2) · --aspects 16x9,1x1,9x16 · --frames (also
dump numbered PNG frames to marketing/frames/<clip>/) · --scale 1.6667 (capture device-pixel ratio).

Pipeline: a private static server (repo root) → headless Chrome over --remote-debugging-pipe →
stage/stage.html runs each clip with the scenes' virtual clock (?virtual=1, LW.advance(1/30)) →
one screenshot per frame piped into ffmpeg (3200×1800 master) → per-aspect crop/framing + caption
overlays (PIL, SF Pro) + end card + original music bed and click sounds → H.264/AAC MP4s.
"""
import argparse, functools, http.server, io, json, math, os, shutil, subprocess, sys, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cdp import Chrome  # noqa: E402

MKT = os.path.normpath(os.path.join(HERE, '..'))
ROOT = os.path.normpath(os.path.join(MKT, '..'))
AUDIO = os.path.join(MKT, 'audio')
CACHE = os.path.join(MKT, '.cache')
CLIPS_OUT = os.path.join(MKT, 'clips')
IMAGES = os.path.join(MKT, 'images')
FFMPEG = shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
FPS = 30
ORDER = ['hero', 'koi', 'music', 'calm', 'weather', 'pets', 'desktop', 'cymatics', 'bowls']
STILL_ORDER = ['ig1', 'ig2', 'ig3', 'ig4', 'ig5', 'ig6', 'ph1', 'ph2', 'ph3', 'ph4', 'ph5', 'ph6']
ASPECTS = {'16x9': (1920, 1080), '1x1': (1080, 1080), '9x16': (1080, 1920)}
FONT_SANS = '/System/Library/Fonts/SFNS.ttf'
LOG_LOCK = threading.Lock()


def log(*a):
    with LOG_LOCK:
        print(time.strftime('%H:%M:%S'), *a, flush=True)


# ── static server ─────────────────────────────────────────────────────────
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def serve(port):
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


# ── capture ───────────────────────────────────────────────────────────────
def capture(clip, port, scale, frames_dir=None):
    """Render a clip's frames headless and encode a high-quality master. Returns (meta, master path)."""
    os.makedirs(os.path.join(CACHE, 'masters'), exist_ok=True)
    master = os.path.join(CACHE, 'masters', f'{clip}.mp4')
    tmp = master + '.part.mp4'
    with Chrome() as ch:
        page = ch.new_page(1920, 1080, scale)
        page.goto(f'http://127.0.0.1:{port}/marketing/tools/stage/stage.html', settle=0.3)
        meta = page.eval(f'STAGE.init({json.dumps(clip)})', timeout=600)
        n = int(round(meta['dur'] * FPS))
        W, H = int(round(1920 * scale)) // 2 * 2, int(round(1080 * scale)) // 2 * 2
        enc = subprocess.Popen([FFMPEG, '-nostdin', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
                                '-vf', f'scale={W}:{H}:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium',
                                '-crf', '14', '-r', str(FPS), tmp], stdin=subprocess.PIPE)
        if frames_dir:
            shutil.rmtree(frames_dir, ignore_errors=True); os.makedirs(frames_dir)
        t0 = time.time()
        for i in range(n):
            page.eval(f'STAGE.frame({i})')
            jpg = page.screenshot('jpeg', 95)
            enc.stdin.write(jpg)
            if frames_dir:
                from PIL import Image
                Image.open(io.BytesIO(jpg)).save(os.path.join(frames_dir, f'{i + 1:04d}.png'))
            if i % 90 == 0:
                el = time.time() - t0
                log(f'  {clip}: frame {i}/{n}  ({el / max(1, i):.2f}s/frame)')
        enc.stdin.close(); enc.wait()
        meta['final_sfx'] = page.eval('STAGE.meta().sfx')
    os.replace(tmp, master)
    json.dump(meta, open(os.path.join(CACHE, 'masters', f'{clip}.json'), 'w'), indent=1)
    return meta, master


# ── captions / end card (PIL) ─────────────────────────────────────────────
def font(size, weight=500, opsz=None):
    from PIL import ImageFont
    f = ImageFont.truetype(FONT_SANS, size)
    try:
        f.set_variation_by_axes([100, opsz or min(96, max(17, size * 0.75)), 400, weight])
    except Exception:
        pass
    return f


def wrap(draw, text, f, max_w):
    words, lines, line = text.split(), [], ''
    for w in words:
        test = (line + ' ' + w).strip()
        if draw.textlength(test, font=f) <= max_w or not line:
            line = test
        else:
            lines.append(line); line = w
    if line:
        lines.append(line)
    # avoid a lonely last word
    if len(lines) > 1 and len(lines[-1].split()) == 1 and len(lines[-2].split()) > 2:
        prev = lines[-2].split(); lines[-2] = ' '.join(prev[:-1]); lines[-1] = prev[-1] + ' ' + lines[-1]
    return lines


def tracked(draw, xy, text, f, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking
    return x


def caption_layout(aspect, vertical_mode):
    W, H = ASPECTS[aspect]
    if aspect == '16x9':
        return dict(W=W, H=H, x=112, bottom=H - 112, size=58, eyebrow=21, maxw=1000, scrim='bottom', align='left')
    if aspect == '1x1':
        if vertical_mode == 'frame':
            return dict(W=W, H=H, x=72, bottom=H - 64, size=44, eyebrow=19, maxw=940, scrim=None, align='left')
        return dict(W=W, H=H, x=76, bottom=H - 88, size=52, eyebrow=20, maxw=900, scrim='bottom', align='left')
    # 9:16 — keep clear of the Reels/TikTok UI (top ~13 %, bottom ~22 %, right ~14 %)
    if vertical_mode == 'frame':
        return dict(W=W, H=H, x=84, top=1330, size=58, eyebrow=22, maxw=880, scrim=None, align='left')
    return dict(W=W, H=H, x=84, bottom=1450, size=64, eyebrow=23, maxw=860, scrim='band', align='left')


def render_caption(cap, aspect, vertical_mode, path):
    from PIL import Image, ImageDraw, ImageFilter
    L = caption_layout(aspect, vertical_mode)
    W, H = L['W'], L['H']
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fh, fe = font(L['size'], 560), font(L['eyebrow'], 650, 17)
    lines = wrap(d, cap['text'], fh, L['maxw'])
    lh = int(L['size'] * 1.14)
    block = len(lines) * lh + (L['eyebrow'] * 2.1 if cap.get('eyebrow') else 0)
    top = L['top'] if 'top' in L else L['bottom'] - block
    # scrim (soft, wide) so text reads on bright scenes without a box
    if L['scrim']:
        sc = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sc)
        if L['scrim'] == 'bottom':
            y0 = int(top - L['size'] * 2.2)
            for y in range(y0, H):
                a = min(1, (y - y0) / max(1, (H - y0) * 0.75))
                sd.line([(0, y), (W, y)], fill=(6, 10, 12, int(150 * a * a)))
        else:
            y0, y1 = int(top - L['size'] * 2), int(top + block + L['size'] * 2)
            for y in range(y0, y1):
                k = (y - y0) / (y1 - y0); a = math.sin(math.pi * k) ** 1.5
                sd.line([(0, y), (W, y)], fill=(6, 10, 12, int(125 * a)))
        img = Image.alpha_composite(img, sc); d = ImageDraw.Draw(img)
    txt = Image.new('RGBA', (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(txt)
    y = top
    if cap.get('eyebrow'):
        tracked(td, (L['x'], y), cap['eyebrow'].upper(), fe, (250, 244, 232, 200), L['eyebrow'] * 0.16)
        y += int(L['eyebrow'] * 2.1)
    for ln in lines:
        td.text((L['x'], y), ln, font=fh, fill=(252, 248, 240, 255))
        y += lh
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    shadow.putalpha(txt.getchannel('A').point(lambda v: int(v * 0.55)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(L['size'] * 0.22))
    img = Image.alpha_composite(img, shadow)
    img = Image.alpha_composite(img, txt)
    img.save(path)


def wave_mark(draw, cx, cy, w, color, width):
    """Two soft sine strokes — the wallpap wave."""
    for dy in (-w * 0.15, w * 0.15):
        pts = []
        for i in range(81):
            k = i / 80
            pts.append((cx - w / 2 + k * w, cy + dy + math.sin(k * math.pi * 4 - math.pi / 2) * w * 0.055))
        draw.line(pts, fill=color, width=width, joint='curve')
        for p in (pts[0], pts[-1]):
            draw.ellipse((p[0] - width / 2, p[1] - width / 2, p[0] + width / 2, p[1] + width / 2), fill=color)


def render_endcard(aspect, path, line2='Living wallpapers for Mac', line3='Free at wallpap.live'):
    from PIL import Image, ImageDraw
    W, H = ASPECTS[aspect]
    img = Image.new('RGBA', (W, H), (8, 12, 13, 214))
    d = ImageDraw.Draw(img)
    u = min(W, H) / 1080
    cy = H * (0.44 if aspect == '9x16' else 0.46)
    fw = font(int(104 * u), 620); f2 = font(int(36 * u), 450); f3 = font(int(30 * u), 560); f4 = font(int(22 * u), 500, 17)
    word = 'wallpap'
    ww = d.textlength(word, font=fw)
    markw = 92 * u
    gap = 26 * u
    x0 = W / 2 - (markw + gap + ww) / 2
    wave_mark(d, x0 + markw / 2, cy + 6 * u, markw, (246, 241, 230, 255), max(3, int(7 * u)))
    d.text((x0 + markw + gap, cy), word, font=fw, fill=(246, 241, 230, 255), anchor='lm')
    d.text((W / 2, cy + 108 * u), line2, font=f2, fill=(246, 241, 230, 200), anchor='mm')
    d.text((W / 2, cy + 172 * u), line3, font=f3, fill=(246, 241, 230, 255), anchor='mm')
    d.text((W / 2, cy + 232 * u), 'MACOS 13+  ·  PRO $5, ONCE', font=f4, fill=(246, 241, 230, 130), anchor='mm')
    img.save(path)


# ── post: aspects, captions, audio ────────────────────────────────────────
def smooth_expr(keys, scale, offset):
    """ffmpeg expression for a keyframed value (smoothstep between keys)."""
    if not isinstance(keys, list):
        return f'({keys}*{scale}+{offset})'
    expr = f'({keys[-1][1]})'
    for i in range(len(keys) - 1, 0, -1):
        (t0, v0), (t1, v1) = keys[i - 1], keys[i]
        k = f'(clip((t-{t0})/{max(1e-3, t1 - t0)},0,1))'
        seg = f'({v0}+({v1}-{v0})*{k}*{k}*(3-2*{k}))'
        expr = f'if(lt(t,{t1}),{seg},{expr})'
    expr = f'if(lt(t,{keys[0][0]}),{keys[0][1]},{expr})'
    return f'(({expr})*{scale}+{offset})'


def build_audio(meta, out):
    dur = meta['dur']
    bed = os.path.join(AUDIO, f"bed-{meta['bed']}.wav")
    args = [FFMPEG, '-nostdin', '-v', 'error', '-y', '-ss', str(meta['bedStart']), '-t', str(dur), '-i', bed]
    sfx = meta.get('final_sfx') or meta.get('sfx') or []
    filt = [f"[0:a]volume={0.9 * meta.get('bedGain', 1):.3f},afade=t=in:d=0.6,afade=t=out:st={dur - 2.2:.2f}:d=2.2[bed]"]
    mix = ['[bed]']
    for j, s in enumerate(sfx):
        p = os.path.join(AUDIO, f"sfx-{s['kind']}.wav")
        if not os.path.exists(p):
            continue
        args += ['-i', p]
        ms = int(max(0, s['t']) * 1000)
        filt.append(f"[{len(mix)}:a]adelay={ms}|{ms},volume={0.55 * s.get('gain', 1):.3f}[s{j}]")
        mix.append(f'[s{j}]')
    filt.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=first,alimiter=limit=0.89[a]")
    args += ['-filter_complex', ';'.join(filt), '-map', '[a]', '-t', str(dur), '-c:a', 'aac', '-b:a', '192k', out]
    subprocess.run(args, check=True)


def post(clip, aspects, quick=False):
    """One ffmpeg pass: decode the master once, split into every aspect, overlay captions + end card."""
    meta = json.load(open(os.path.join(CACHE, 'masters', f'{clip}.json')))
    master = os.path.join(CACHE, 'masters', f'{clip}.mp4')
    num = ORDER.index(clip) + 1 if clip in ORDER else 0
    outdir = os.path.join(CLIPS_OUT, f'{num:02d}-{clip}')
    os.makedirs(outdir, exist_ok=True)
    work = os.path.join(CACHE, 'post', clip)
    shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
    audio = os.path.join(work, 'audio.m4a')
    build_audio(meta, audio)
    dur = meta['dur']
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', master],
                           capture_output=True, text=True).stdout.strip().split(',')
    MW, MH = int(probe[0]), int(probe[1])
    inputs = ['-i', master, '-i', audio]
    fl = [f"[0:v]split={len(aspects)}{''.join(f'[m{j}]' for j in range(len(aspects)))}"]
    k = 2
    outs = []

    def still_input(png):
        nonlocal k
        inputs.extend(['-i', png])
        k += 1
        # decode once, repeat in memory
        return f'[{k - 1}:v]format=rgba,loop=loop=-1:size=1:start=0,setpts=N/{FPS}/TB,trim=duration={dur}'

    for j, aspect in enumerate(aspects):
        W, H = ASPECTS[aspect]
        mode = meta['vertical'] if aspect == '9x16' else meta.get('square', 'crop') if aspect == '1x1' else 'crop'
        src = f'[m{j}]'
        if aspect == '16x9':
            fl.append(f'{src}scale={W}:{H}:flags=lanczos,setsar=1[b{j}]')
        elif mode == 'frame':
            fl.append(f'{src}split[fa{j}][fb{j}];[fa{j}]scale=-2:{H}:flags=bicubic,crop={W}:{H},gblur=sigma=40,eq=brightness=-0.10:saturation=0.9[bg{j}];'
                      f'[fb{j}]scale={W}:-2:flags=lanczos[fg{j}];[bg{j}][fg{j}]overlay=0:{"(H-h)/2-120" if aspect == "9x16" else "(H-h)/2-70"},setsar=1[b{j}]')
        else:
            cw = int(round(MH * W / H)) // 2 * 2
            x = smooth_expr(meta['focus'], MW, -cw / 2)
            fl.append(f"{src}crop={cw}:{MH}:x='clip({x},0,{MW - cw})':y=0,scale={W}:{H}:flags=lanczos,setsar=1[b{j}]")
        cur = f'[b{j}]'
        for ci, cap in enumerate(meta['captions']):
            png = os.path.join(work, f'cap-{aspect}-{ci}.png')
            render_caption(cap, aspect, mode, png)
            t0, t1 = cap['t0'], cap['t1']
            fl.append(f'{still_input(png)},fade=t=in:st={t0}:d=0.6:alpha=1,fade=t=out:st={t1 - 0.6}:d=0.6:alpha=1[c{j}_{ci}]')
            fl.append(f"{cur}[c{j}_{ci}]overlay=0:0:enable='between(t,{t0},{t1})'[v{j}_{ci}]")
            cur = f'[v{j}_{ci}]'
        if meta.get('endcard', True):
            png = os.path.join(work, f'end-{aspect}.png')
            render_endcard(aspect, png)
            ts = dur - 2.8
            fl.append(f'{still_input(png)},fade=t=in:st={ts}:d=0.8:alpha=1[e{j}]')
            fl.append(f"{cur}[e{j}]overlay=0:0:enable='gte(t,{ts})'[ve{j}]")
            cur = f'[ve{j}]'
        fl.append(f'{cur}fade=t=in:d=0.5,format=yuv420p[o{j}]')
        outs.append((aspect, f'[o{j}]', os.path.join(outdir, f'{clip}-{aspect}.mp4')))
    cmd = [FFMPEG, '-nostdin', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fl)]
    for aspect, lab, out in outs:
        cmd += ['-map', lab, '-map', '1:a', '-t', str(dur), '-c:v', 'libx264', '-preset', 'veryfast' if quick else 'medium',
                '-crf', '23' if quick else '18', '-profile:v', 'high', '-r', str(FPS), '-c:a', 'copy', '-movflags', '+faststart', out]
    subprocess.run(cmd, check=True)
    for aspect, lab, out in outs:
        log(f'  → {os.path.relpath(out, MKT)}')
    # poster frame (16:9, no captions) for link previews / thumbnails
    pt = meta.get('poster', min(dur * 0.45, dur - 3.5))
    subprocess.run([FFMPEG, '-nostdin', '-v', 'error', '-y', '-ss', str(pt), '-i', master, '-frames:v', '1', '-vf', 'scale=1920:1080:flags=lanczos',
                    '-q:v', '2', os.path.join(outdir, f'{clip}-poster.jpg')], check=True)


# ── stills ────────────────────────────────────────────────────────────────
def stills(ids, port):
    from PIL import Image
    with Chrome() as ch:
        for sid in ids:
            page = ch.new_page(1280, 800, 2)
            page.goto(f'http://127.0.0.1:{port}/marketing/tools/stage/stage.html', settle=0.3)
            info = page.eval('(async () => { const s = STILLS[%s]; return {w: s.w, h: s.h} })()' % json.dumps(sid))
            page.resize(info['w'], info['h'], 2)
            r = page.eval(f'STAGE.still({json.dumps(sid)})', timeout=300)
            time.sleep(0.4)
            png = page.screenshot('png')
            im = Image.open(io.BytesIO(png)).convert('RGB').resize((r['w'], r['h']), Image.LANCZOS)
            out = os.path.join(IMAGES, r['out'])
            os.makedirs(os.path.dirname(out), exist_ok=True)
            im.save(out, optimize=True)
            log(f'  still → {os.path.relpath(out, MKT)}')
            ch.send('Target.closeTarget', {'targetId': page.target})


# ── preview: contact sheet at a few times (no encode) ─────────────────────
def preview(clip, port, times=None):
    from PIL import Image
    os.makedirs(os.path.join(CACHE, 'preview'), exist_ok=True)
    with Chrome() as ch:
        page = ch.new_page(1920, 1080, 0.5)
        page.goto(f'http://127.0.0.1:{port}/marketing/tools/stage/stage.html', settle=0.3)
        meta = page.eval(f'STAGE.init({json.dumps(clip)})', timeout=600)
        dur = meta['dur']
        times = times or [round(dur * k / 8, 2) for k in range(1, 8)] + [dur - 0.1]
        ims = []
        for tt in times:
            page.eval(f'STAGE.frame({int(tt * FPS)})', timeout=600)
            ims.append(Image.open(io.BytesIO(page.screenshot('jpeg', 85))).convert('RGB').resize((640, 360)))
    cols = 2
    sheet = Image.new('RGB', (640 * cols, 360 * ((len(ims) + cols - 1) // cols)))
    for i, im in enumerate(ims):
        sheet.paste(im, ((i % cols) * 640, (i // cols) * 360))
    out = os.path.join(CACHE, 'preview', f'{clip}.jpg')
    sheet.save(out, quality=85)
    log(f'preview → {out}  (times {times})')


# ── main ──────────────────────────────────────────────────────────────────
def ensure_music(force=False):
    need = ['bed-lofi.wav', 'bed-ambient.wav', 'beats-lofi.json', 'cover.jpg']
    if force or not all(os.path.exists(os.path.join(AUDIO, n)) for n in need):
        log('generating music beds…')
        subprocess.run([sys.executable, os.path.join(HERE, 'music.py')], check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('what', nargs='?', default='all', choices=['all', 'clips', 'stills', 'post', 'music', 'preview'])
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--aspects', default='16x9,1x1,9x16')
    ap.add_argument('--jobs', type=int, default=2)
    ap.add_argument('--quick', action='store_true')
    ap.add_argument('--frames', action='store_true')
    ap.add_argument('--scale', type=float, default=5 / 3)
    ap.add_argument('--port', type=int, default=5299)
    a = ap.parse_args()
    aspects = [x for x in a.aspects.split(',') if x]
    if a.what == 'music':
        ensure_music(True); return
    ensure_music()
    srv = serve(a.port)
    try:
        if a.what == 'preview':
            for c in a.ids or ORDER:
                preview(c, a.port)
            return
        if a.what in ('all', 'clips', 'post'):
            ids = a.ids or ORDER
            if a.what == 'post':
                for c in ids:
                    post(c, aspects, a.quick)
            else:
                scale = 1.0 if a.quick else a.scale
                queue = list(ids)
                errors = []

                def worker():
                    while queue:
                        try:
                            c = queue.pop(0)
                        except IndexError:
                            return
                        t0 = time.time()
                        log(f'capturing {c}…')
                        try:
                            fd = os.path.join(MKT, 'frames', c) if a.frames else None
                            capture(c, a.port, scale, fd)
                            post(c, aspects, a.quick)
                            log(f'done {c} in {time.time() - t0:.0f}s')
                        except Exception as e:  # keep going; report at the end
                            errors.append((c, repr(e)))
                            log(f'FAILED {c}: {e!r}')
                ths = [threading.Thread(target=worker) for _ in range(max(1, a.jobs))]
                for th in ths:
                    th.start()
                for th in ths:
                    th.join()
                if errors:
                    log('errors:', errors)
        if a.what in ('all', 'stills'):
            stills(a.ids if a.what == 'stills' and a.ids else STILL_ORDER, a.port)
    finally:
        srv.shutdown()


if __name__ == '__main__':
    main()
