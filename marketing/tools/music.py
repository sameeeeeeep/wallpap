"""Original, procedurally generated music beds for the wallpap clips (no samples, no third-party audio).

    python3 marketing/tools/music.py          # writes marketing/audio/*

Outputs (all deterministic, seeded):
  bed-lofi.wav        80 bpm lo-fi: warm electric-piano chords (Fmaj7 Em7 Dm9 Cmaj7), round bass,
                      soft kick / rim / swung shaker, a sparse pentatonic bell line, vinyl hiss.
  bed-ambient.wav     beatless pad for Calm clips: slow chords that swell on a 16 s box-breath cycle.
  beats-lofi.json     per-frame (30 fps) analysis of bed-lofi in the shape the host's Beat Sync sends
                      (window.__lw('beat', frame)) so scenes pulse exactly on the audible beat.
  sfx-*.wav           tiny interaction sounds (plop, tap, chime, purr) mixed at click times.
  cover.jpg           original abstract artwork for the demo "now playing" track.
"""
import json, os, wave
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'audio'))
rng = np.random.default_rng(7)

BPM = 80.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 26                       # ≈ 78 s
DUR = BARS * BAR + 3.0          # + reverb tail

# Fmaj7 – Em7 – Dm9 – Cmaj7 (MIDI voicings, mid register)
CHORDS = [
    (5, 0, [53, 57, 60, 64, 69]),      # F  A  C  E  A   (root pc, quality 1=maj 0=min, notes)
    (4, 0, [52, 55, 59, 62, 67]),      # E  G  B  D  G
    (2, 0, [50, 57, 60, 64, 65]),      # D  A  C  E  F
    (0, 1, [48, 55, 59, 64, 67]),      # C  G  B  E  G
]
CHORDS = [(r, 1 if r in (5, 0) else 0, n) for r, _, n in CHORDS]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def buf(seconds=DUR):
    return np.zeros(int(seconds * SR))


def add(dst, src, at):
    i = int(at * SR)
    if i >= len(dst):
        return
    n = min(len(src), len(dst) - i)
    dst[i:i + n] += src[:n]


def fft_filter(x, lo=None, hi=None, slope=1.0):
    """Gentle zero-phase band filter in the frequency domain."""
    n = 1 << int(np.ceil(np.log2(len(x) + 1)))
    X = np.fft.rfft(x, n)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (4 * slope))
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (4 * slope))
    return np.fft.irfft(X * g, n)[:len(x)]


def reverb(x, secs=1.6, wet=0.22, seed=3):
    r = np.random.default_rng(seed)
    n = int(secs * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 6.9 / secs)
    ir = fft_filter(ir, lo=180, hi=5200)
    ir[:int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    m = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)]
    return x * (1 - wet) + y * wet * 1.6


# ── instruments ─────────────────────────────────────────────────────────────
def epiano(m, dur, vel=0.5):
    n = int((dur + 1.2) * SR); t = np.arange(n) / SR
    f = hz(m)
    env = np.minimum(1, t / 0.006) * np.exp(-t / 2.2)
    rel = np.clip((dur + 1.2 - t) / 1.2, 0, 1)
    idx = 1.4 * np.exp(-t / 0.35)
    tone = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tone += 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.6)
    tone += 0.06 * np.sin(2 * np.pi * 7.02 * f * t) * np.exp(-t / 0.05)   # tine tick
    return tone * env * rel * vel


def bass(m, dur, vel=0.6):
    n = int((dur + 0.3) * SR); t = np.arange(n) / SR
    f = hz(m)
    env = np.minimum(1, t / 0.012) * np.exp(-t / 1.4) * np.clip((dur + 0.3 - t) / 0.3, 0, 1)
    return (np.sin(2 * np.pi * f * t) + 0.22 * np.sin(4 * np.pi * f * t)) * env * vel


def kick(vel=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.24) * np.minimum(1, t / 0.002) * vel


def rim(vel=0.5, r=rng):
    n = int(0.35 * SR); t = np.arange(n) / SR
    nz = fft_filter(r.standard_normal(n), lo=900, hi=4200)
    return (nz * 0.55 * np.exp(-t / 0.07) + 0.4 * np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.04)) * vel


def shaker(vel=0.2, r=rng):
    n = int(0.09 * SR); t = np.arange(n) / SR
    nz = fft_filter(r.standard_normal(n), lo=6500, hi=13000)
    return nz * np.minimum(1, t / 0.008) * np.exp(-t / 0.025) * vel


def bell(m, vel=0.25):
    n = int(2.5 * SR); t = np.arange(n) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.25)
    return s * np.exp(-t / 0.9) * np.minimum(1, t / 0.003) * vel


def pad(notes, dur, vel=0.2, r=rng):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    for m in notes:
        for det in (-0.07, 0.0, 0.065):
            f = hz(m) * 2 ** (det / 12)
            ph = r.uniform(0, 2 * np.pi)
            y += np.sin(2 * np.pi * f * t + ph) + 0.12 * np.sin(4 * np.pi * f * t + ph)
    att = np.minimum(1, t / 2.5); rel = np.clip((dur - t) / 2.5, 0, 1)
    return y * att * rel * vel / (len(notes) * 3)


def tremolo_pan(x, rate=4.2, depth=0.35):
    t = np.arange(len(x)) / SR
    p = np.sin(2 * np.pi * rate * t) * depth
    return np.stack([x * (1 - p) , x * (1 + p)], 1) * 0.7


def stereo(x, pan=0.0):
    return np.stack([x * (1 - pan) * 0.7, x * (1 + pan) * 0.7], 1)


# ── lo-fi bed ───────────────────────────────────────────────────────────────
def make_lofi():
    keys, bss, drums, hats, bells = buf(), buf(), buf(), buf(), buf()
    kick_track, snare_track = buf(), buf()
    kicks, snares = [], []
    swing = 0.14 * BEAT  # late off-beats
    motif = [None, 72, None, 76, 74, None, 69, None, None, 67, None, 69, 72, None, None, None]
    for bar in range(BARS):
        t0 = bar * BAR
        root, q, notes = CHORDS[bar % 4]
        drums_on = bar >= 1 and bar < BARS - 1
        # chords: hit on 1, soft re-hit on the "and" of 2 every other bar
        for j, m in enumerate(notes):
            add(keys, epiano(m, BAR * 0.98, 0.32 + 0.04 * rng.random()), t0 + j * 0.012 + rng.uniform(0, 0.004))
        if bar % 2 == 1:
            for j, m in enumerate(notes[1:]):
                add(keys, epiano(m + 12 if j == 3 else m, BEAT * 1.2, 0.14), t0 + 1.5 * BEAT + swing + j * 0.01)
        # bass
        bm = 36 + root if root >= 4 else 48 + root
        if root in (5, 4):
            bm = 36 + root + 0  # F2 / E2
        add(bss, bass(bm, BEAT * 1.7, 0.55), t0)
        add(bss, bass(bm, BEAT * 0.9, 0.42), t0 + 2 * BEAT)
        add(bss, bass(bm + 7, BEAT * 0.45, 0.3), t0 + 3 * BEAT + BEAT / 2 + swing)
        if drums_on:
            for b, v in ((0, 1.0), (2, 0.85)):
                add(kick_track, kick(v), t0 + b * BEAT); kicks.append((t0 + b * BEAT, v))
            if bar % 2 == 1:
                add(kick_track, kick(0.55), t0 + 2.5 * BEAT + swing); kicks.append((t0 + 2.5 * BEAT + swing, 0.55))
            for b in (1, 3):
                add(snare_track, rim(0.5), t0 + b * BEAT); snares.append(t0 + b * BEAT)
            for e in range(8):
                at = t0 + e * BEAT / 2 + (swing if e % 2 else 0)
                add(hats, shaker(0.16 if e % 2 else 0.24), at + rng.uniform(-0.004, 0.004))
        # bell motif (2-bar phrase), only after the intro
        if bar >= 2 and bar < BARS - 1:
            for s in range(8):
                m = motif[(bar % 2) * 8 + s]
                if m is not None and rng.random() < 0.85:
                    add(bells, bell(m, 0.12), t0 + s * BEAT / 2 + (swing if s % 2 else 0))
    keys = fft_filter(keys, hi=3200)
    hats = fft_filter(hats, hi=9000)
    drums = kick_track * 0.9 + reverb(snare_track, 0.9, 0.25)
    mixL = tremolo_pan(keys, 3.6, 0.25)
    mix = mixL + stereo(bss, 0) + stereo(drums, 0) + stereo(hats, 0.25) + stereo(reverb(bells, 2.2, 0.45), -0.3)
    # vinyl: hiss + sparse crackle
    n = len(keys)
    hiss = fft_filter(rng.standard_normal(n), lo=1500, hi=7000) * 0.006
    crack = np.zeros(n); idx = rng.integers(0, n, int(DUR * 9)); crack[idx] = rng.uniform(-1, 1, len(idx)) * 0.08
    crack = fft_filter(crack, lo=1200, hi=6000)
    mix += stereo(hiss + crack, 0.0) * 1.2
    # glue: overall reverb, warm tape-ish saturation, gentle low-pass, fades
    mix = np.stack([reverb(mix[:, 0], 1.4, 0.16, 5), reverb(mix[:, 1], 1.4, 0.16, 6)], 1)
    mix = np.stack([fft_filter(mix[:, 0], lo=30, hi=11000), fft_filter(mix[:, 1], lo=30, hi=11000)], 1)
    mix = np.tanh(mix * 1.6) / 1.6
    stems = {'kick': kick_track, 'snare': snare_track, 'keys': keys, 'bass': bss, 'hats': hats}
    return master(mix), stems, kicks, snares


def master(mix, target_rms=0.11):
    mix = mix * (target_rms / (np.sqrt(np.mean(mix ** 2)) + 1e-9))
    return np.tanh(mix * 1.1) / 1.1      # soft ceiling, no hard clipping


# ── ambient bed (calm) ──────────────────────────────────────────────────────
def make_ambient():
    dur = 72.0
    y = np.zeros(int(dur * SR))
    prog = [[53, 60, 64, 69, 72], [52, 59, 62, 67, 71], [50, 57, 60, 65, 69], [48, 55, 60, 64, 67]]
    for i in range(int(dur // 8) + 1):
        seg = pad(prog[i % 4], 11.0, 0.5)
        add(y, seg, i * 8.0)
    # 16 s box breath swell: in 4 / hold 4 / out 4 / hold 4
    t = np.arange(len(y)) / SR
    ph = (t % 16.0)
    lvl = np.where(ph < 4, 0.5 - 0.5 * np.cos(np.pi * ph / 4), np.where(ph < 8, 1, np.where(ph < 12, 0.5 + 0.5 * np.cos(np.pi * (ph - 8) / 4), 0)))
    y *= 0.62 + 0.38 * lvl
    bl = np.zeros_like(y)
    for k in range(int(dur // 4)):
        if rng.random() < 0.55:
            add(bl, bell(rng.choice([72, 76, 79, 81, 84]), 0.08), k * 4 + rng.uniform(0, 1))
    y = fft_filter(y, lo=60, hi=4200)
    mix = np.stack([reverb(y + bl, 3.5, 0.5, 8), reverb(y + bl * 0.8, 3.5, 0.5, 9)], 1)
    n = len(y)
    mix += stereo(fft_filter(rng.standard_normal(n), lo=300, hi=2500) * 0.004, 0)
    return master(mix, 0.085)


# ── sfx ─────────────────────────────────────────────────────────────────────
def sfx():
    out = {}
    t = np.arange(int(0.6 * SR)) / SR
    f = 380 * np.exp(-t / 0.06) + 520 * np.exp(-t / 0.012) + 240        # water plop: falling bubble
    out['plop'] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) * np.minimum(1, t / 0.002) * 0.5
    out['plop'] = reverb(out['plop'], 0.8, 0.3)
    t = np.arange(int(0.15 * SR)) / SR
    out['tap'] = fft_filter(rng.standard_normal(len(t)), lo=1500, hi=6000) * np.exp(-t / 0.012) * 0.35
    out['chime'] = reverb(bell(79, 0.35) + bell(86, 0.15), 2.0, 0.4)
    t = np.arange(int(1.4 * SR)) / SR
    purr = fft_filter(rng.standard_normal(len(t)), lo=60, hi=400) * (0.6 + 0.4 * np.sin(2 * np.pi * 24 * t))
    out['purr'] = purr * np.sin(np.pi * t / 1.4) * 0.5
    t = np.arange(int(0.5 * SR)) / SR
    out['pop'] = np.sin(2 * np.pi * (300 + 600 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.05) * 0.4   # soft toy bounce
    return out


def write_wav(path, x):
    x = np.asarray(x)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def analyse(mix, stems, kicks, snares, fps=30):
    """Per-frame Beat-Sync style frames: levels from the real stems, kicks/onsets from the grid."""
    n = int(len(mix) / SR * fps)
    hop = SR // fps

    def env(x):
        x = x[:n * hop].reshape(n, hop)
        e = np.sqrt(np.mean(x ** 2, 1))
        return e / (np.percentile(e, 97) + 1e-9)
    mono = mix.mean(1)
    L, B = env(mono), env(stems['bass'] + stems['kick'])
    M, Hh = env(stems['keys']), env(stems['hats'] + stems['snare'])
    frames = []
    ki = {int(round(t * fps)): v for t, v in kicks}
    si = {int(round(t * fps)) for t in snares}
    for i in range(n):
        t = i / fps
        bar = int(t // BAR)
        root, q, notes = CHORDS[bar % 4]
        ch = [0.07] * 12
        for m in notes:
            ch[m % 12] = max(ch[m % 12], 0.75)
        ch[root] = 1.0
        beat = t / BEAT
        fr = {
            'l': round(float(min(1, 0.15 + 0.75 * L[i])), 3), 'b': round(float(min(1, B[i] * 0.9)), 3),
            'm': round(float(min(1, M[i] * 0.8)), 3), 'h': round(float(min(1, Hh[i] * 0.8)), 3),
            'k': round(float(ki.get(i, 0) * 0.8), 2), 'o': 0.45 if i in si else 0,
            'c': 0.42, 'ch': ch, 'r': root, 'q': q, 'rc': 0.9, 'key': 0, 'mo': 1, 'kc': 0.85,
            'bpm': BPM, 'bc': 0.9, 'ph': round(beat - int(beat), 3), 'e': round(float(min(1, L[i])), 3),
            'tr': 0, 'sec': 0 if bar >= 1 else 4,
        }
        frames.append(fr)
    return {'fps': fps, 'bpm': BPM, 'beat': BEAT, 'frames': frames}


def cover(path):
    from PIL import Image, ImageDraw, ImageFilter
    S = 800
    im = Image.new('RGB', (S, S))
    yy, xx = np.mgrid[0:S, 0:S] / S
    r = 30 + 60 * yy + 30 * np.sin(xx * 3)
    g = 40 + 50 * yy
    b = 70 + 90 * (1 - yy)
    arr = np.stack([r, g, b], -1)
    im = Image.fromarray(np.clip(arr, 0, 255).astype('uint8'))
    d = ImageDraw.Draw(im, 'RGBA')
    d.ellipse((S * 0.5, S * 0.18, S * 0.82, S * 0.5), fill=(246, 214, 170, 235))          # low sun
    for k in range(9):                                                                   # water lines
        y = S * (0.62 + k * 0.04)
        d.line([(S * 0.08, y), (S * 0.92, y)], fill=(236, 205, 170, int(150 - k * 14)), width=4)
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    im.save(path, quality=92)


def main():
    os.makedirs(OUT, exist_ok=True)
    mix, stems, kicks, snares = make_lofi()
    write_wav(os.path.join(OUT, 'bed-lofi.wav'), mix)
    json.dump(analyse(mix, stems, kicks, snares), open(os.path.join(OUT, 'beats-lofi.json'), 'w'), separators=(',', ':'))
    write_wav(os.path.join(OUT, 'bed-ambient.wav'), make_ambient())
    for k, v in sfx().items():
        write_wav(os.path.join(OUT, f'sfx-{k}.wav'), v)
    cover(os.path.join(OUT, 'cover.jpg'))
    print('music →', OUT)


if __name__ == '__main__':
    main()
