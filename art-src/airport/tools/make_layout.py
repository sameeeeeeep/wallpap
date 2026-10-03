# Builds layout.json + layout-check*.png + occluders/ from hand-measured features of raw/plate-day.png.
# All measurements below are in RAW plate pixels (1536x1024, as Codex generated it). The delivered plates are
# that image with the top 64 px cropped (16:10) and upscaled to 2560x1600, so:
#     nx = x / 1536          ny = (y - 64) / 960
# layout.json is entirely in normalised 0..1 coords of the delivered plate (multiply by plate w/h).
import json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RW, RH, CROP = 1536, 1024, 64
FW, FH = 2560, 1600

def n(p):  # raw -> normalised
    return [round(p[0] / RW, 5), round((p[1] - CROP) / (RH - CROP), 5)]
def npl(pts): return [n(p) for p in pts]

# ---------------------------------------------------------------- perspective / scale
# Ground-plane scale model (raw px per metre at a ground point):
#   ppm = PPM_RWY * ((y - Y_HORIZON) / 112) ** P
# A true pinhole over flat ground would be linear in (y - horizon) (P = 1, eye height ~50 m), but the painted
# plate's near field is drawn "smaller" than that (stand lines / jet bridges), so P was fitted to:
# runway mid (y=517) 2.24 px/m, stand S2 lead-in ~45 m, stand S6 lead-in ~45 m.  Checked by eye in preview.png.
Y_HORIZON = 405.0
PPM_RWY, P = 2.24, 0.78
def ppm_raw(y): return PPM_RWY * (max(0.0, y - Y_HORIZON) / 112) ** P

# ---------------------------------------------------------------- runway (painted white edge lines)
RX   = [0, 100, 200, 300, 400, 560, 660, 760, 860, 960, 1060, 1160, 1260, 1360, 1460, 1536]
FAR  = [434, 434.5, 437.5, 445, 452, 464, 471, 478.5, 486, 493.5, 501, 509, 516.5, 524, 532, 538]
NEAR = [443, 449, 456.5, 469.5, 479, 493, 504.5, 514.5, 524.5, 535, 545.5, 555.5, 566.5, 576.5, 587.5, 596]
def far(x): return float(np.interp(x, RX, FAR))
def near(x): return float(np.interp(x, RX, NEAR))
def cl(x): return (far(x) + near(x)) / 2

# ---------------------------------------------------------------- taxiways (yellow centre lines)
TWY_A = [(-80, 476), (0, 492), (100, 508), (200, 527), (300, 546), (400, 566), (480, 584), (600, 609), (720, 633.5),
         (840, 659), (960, 684.5), (1080, 711), (1200, 738.5), (1320, 766), (1440, 797), (1536, 822)]
# high-speed exits (as painted: both leave the runway heading down-left and curl onto the taxiway)
EXIT_W = [(560, cl(560)), (515, 497), (470, 512), (420, 524), (370, 533), (340, 543), (345, 555), (380, 562)]
EXIT_E = [(1100, cl(1100)), (1060, 537), (1037, 546), (950, 584), (880, 613), (858, 630), (862, 646), (885, 661), (925, 677)]
# apron taxilane running along the entry ends of the stand lines (joins taxiway A off-frame left)
TAXILANE = [(-80, 503), (0, 527), (232, 598), (445, 665), (600, 712), (763, 765), (945, 822), (1060, 856)]

# ---------------------------------------------------------------- stands  (stop-bar T = nose wheel, entry T)
STANDS = [  # id, stop(nose), entry, note
    ('S2', (130, 683), (340, 648), 'contact-ish, far; partly behind mast C'),
    ('S3', (222, 722), (445, 684), 'jet bridge 1 head beside the nose'),
    ('S4', (355, 785), (598, 730), 'jet bridge 2 head beside the nose; mast D in front'),
    ('S5', (500, 860), (760, 783), 'remote (stairs); mast D/E in front'),
    ('S6', (664, 951), (944, 842), 'remote, nearest/biggest hero stand; mast E in front'),
]
JETBRIDGE_HEADS = {'JB1': (200, 712), 'JB2': (322, 764)}

# ---------------------------------------------------------------- flight paths
TOUCHDOWN = (340, cl(340))
APPROACH = [(-260, 232), (-120, 300), (0, 360), (100, 400), (200, 431), (280, 451), (340, cl(340))]
APPROACH_GROUND = [-260, -120, 0, 100, 200, 280, 340]          # x of the ground point under each (on extended CL)
ROLLOUT = [(340, cl(340)), (600, cl(600)), (900, cl(900)), (1100, cl(1100))]
LINEUP = [(-80, 476), (20, 486), (40, 462), (70, cl(70))]        # taxiway A west end -> runway (mostly off-frame)
TAKEOFF = [(70, cl(70)), (500, cl(500)), (900, cl(900))]          # rotate at ~x=900
CLIMB = [(900, cl(900)), (1000, 503), (1150, 470), (1350, 412), (1536, 345), (1760, 262)]
CLIMB_GROUND = [900, 1000, 1150, 1350, 1536, 1760]

# ---------------------------------------------------------------- lights
THRESHOLD_X = 4             # landing threshold (piano keys start at the frame edge)
FAR_THRESHOLD_X = 1450      # opposite-direction markings on the right (reverse ops only)
MASTS = [  # name, lamp head, base
    ('A', (10, 542), (11, 649)), ('B', (106, 566), (107, 696)), ('C', (250, 603), (250, 751)),
    ('D', (453, 663), (451, 868)), ('E', (801, 768), (799, 1060)),
]
BEACON = (272, 866)         # rotating aerodrome beacon on the near terminal roof corner
PAPI_X = [300, 312, 324, 336]   # 4 boxes just outside the FAR edge (pilot's left for left->right landings)

def along(fn_y, x0, x1, spacing_m, offset=0.0):
    """points every spacing_m metres along a curve y=fn_y(x), metres measured with the ground scale."""
    pts, x = [], x0
    while x <= x1:
        y = fn_y(x) + offset
        pts.append((x, y))
        s = ppm_raw(y)
        # x-step for spacing_m metres along a nearly horizontal line
        x += max(4.0, spacing_m * s)
    return pts

def poly_along(poly, spacing_m):
    pts = []; carry = 0.0
    for (x0, y0), (x1, y1) in zip(poly, poly[1:]):
        L = math.hypot(x1 - x0, y1 - y0); t = 0.0
        while True:
            y = y0 + (y1 - y0) * t / max(L, 1e-6)
            step = max(4.0, spacing_m * ppm_raw(y))
            t += step if pts else 0
            if not pts: pts.append((x0, y0)); continue
            if t > L: break
            pts.append((x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L))
    return [p for p in pts if -20 <= p[0] <= RW + 20 and 0 <= p[1] <= RH]

edge_far = along(lambda x: far(x) - 0.8, THRESHOLD_X, RW + 10, 30)
edge_near = along(lambda x: near(x) + 0.8, THRESHOLD_X, RW + 10, 30)
centre = along(cl, THRESHOLD_X + 6, RW + 10, 15)
thr_bar = [(THRESHOLD_X, far(THRESHOLD_X) + (near(THRESHOLD_X) - far(THRESHOLD_X)) * k / 7) for k in range(8)]
# approach lighting: extended centreline to the left, 30 m spacing, 900 m, crossbar at 300 m — all at nx<0
appr = []
xx = THRESHOLD_X
y_slope = (cl(100) - cl(0)) / 100
for i in range(30):
    yv = cl(0) + y_slope * (xx - 0)
    xx -= max(3.0, 30 * ppm_raw(yv))
    appr.append((xx, cl(0) + y_slope * xx))
appr_crossbar_x = appr[9][0]
papi = [(x, far(x) - 3.5) for x in PAPI_X]
twy_c = poly_along(TWY_A, 15) + poly_along(EXIT_W, 15) + poly_along(EXIT_E, 15)

# ---------------------------------------------------------------- JSON
def size40(y): return round(40 * ppm_raw(y) * FW / RW, 1)  # final-plate px of a 40 m aircraft

layout = {
    "_about": "Airport scene layout. Coordinates are normalised [x, y] in 0..1 of the delivered 16:10 plate "
              "(plate-*.png, 2560x1600). Pixel values marked _px2560 are in 2560-wide plate pixels. "
              "Generated by tools/make_layout.py — edit that, not this.",
    "plate": {"files": ["plate-day.png", "plate-dusk.png", "plate-night.png", "plate-overcast.png"],
              "size": [FW, FH], "aspect": "16:10", "horizon_y": n((0, Y_HORIZON))[1],
              "calm_zone_x": 0.72, "sky_bottom_y": n((0, 395))[1],
              "crop_16x9": {"top": 0.1, "note": "2560x1600 -> 2560x1440: drop 160 px of SKY at the top (keeps the apron). ny_169 = (ny - 0.1) / 0.9"},
              "ultrawide_extend": "left/right edges are plain sky gradient + far fields + grass: stretch/repeat the outer ~3% columns with a soft horizontal blur. Left edge also has runway/taxiway/apron running out of frame, so extend those along their polylines (or crop vertically instead)"},
    "scale": {
        "model": "pxPerMetre_px2560(ny) = K * max(0, ny - horizon_y) ** P",
        "K": round(PPM_RWY * FW / RW * (960 / 112) ** P, 3), "P": P, "horizon_y": n((0, Y_HORIZON))[1],
        "sprite_draw_width_px2560": "real_length_m * pxPerMetre(ny_ground) / sprite_px_per_m * sprite_width  (i.e. multiply the sprite by pxPerMetre/sprite_px_per_m)",
        "note": "ground-plane scale at a ground point. For airborne aircraft use the ny of the ground point under it "
                "(the *_ground_y fields of the flight paths). Real lengths: a320 37.6 m, b787 57 m, atr72 27.2 m, "
                "e175 31.7 m, tug 6.5 m, baggage-train 14 m, fuel-truck 10 m, follow-me 4.6 m.",
        "aircraft_40m_px2560": {f"runway_x{round(x/RW,2)}": size40(cl(x)) for x in [0, 340, 600, 900, 1200, 1536]}
                               | {f"stand_{s[0]}": size40((s[1][1] + s[2][1]) / 2) for s in STANDS}
                               | {"taxiway_A_x0.5": size40(np.interp(768, [p[0] for p in TWY_A], [p[1] for p in TWY_A]))},
    },
    "runway": {
        "centreline": npl([(x, cl(x)) for x in RX]),
        "edge_far": npl([(x, far(x)) for x in RX]),
        "edge_near": npl([(x, near(x)) for x in RX]),
        "width_px2560": {str(round(x / RW, 3)): round((near(x) - far(x)) * FW / RW, 1) for x in RX},
        "width_note": "vertical (screen) thickness of the runway at that nx — ~45 m wide strip seen foreshortened",
        "threshold": n((THRESHOLD_X, cl(THRESHOLD_X))), "threshold_far_end": n((FAR_THRESHOLD_X, cl(FAR_THRESHOLD_X))),
        "touchdown": n(TOUCHDOWN), "rotate_point": n((900, cl(900))), "vacate_point": n((1100, cl(1100))),
        "landing_direction": "left -> right (eastbound). Aircraft on the runway face RIGHT: mirror the *-side sprites.",
    },
    "taxiways": {
        "A": npl(TWY_A), "exit_west": npl(EXIT_W), "exit_east": npl(EXIT_E), "apron_taxilane": npl(TAXILANE),
        "note": "A = parallel taxiway (yellow CL). exits are drawn runway->taxiway. Taxiway A and the apron "
                "taxilane both run off the LEFT edge, which is where the two networks connect (off-frame).",
    },
    "stands": [{"id": s[0], "nose": n(s[1]), "entry": n(s[2]),
                "heading_deg": round(math.degrees(math.atan2(s[1][1] - s[2][1], s[1][0] - s[2][0])), 1),
                "aircraft_40m_px2560": size40((s[1][1] + s[2][1]) / 2), "note": s[3],
                "use_sprite": "<type>-side (nose LEFT, unmirrored), nose at 'nose', body along the line toward 'entry'"}
               for s in STANDS],
    "jet_bridge_heads": {k: n(v) for k, v in JETBRIDGE_HEADS.items()},
    "paths": {
        "approach": npl(APPROACH), "approach_ground_y": [round(n((0, cl(x) if x >= 0 else cl(0) + (cl(100) - cl(0)) / 100 * x))[1], 5) for x in APPROACH_GROUND],
        "approach_entry": n(APPROACH[0]),
        "rollout": npl(ROLLOUT),
        "vacate_via_exit_east_then_west_on_A": npl(EXIT_E[:6] + [(850, 661)] + [p for p in TWY_A[::-1] if p[0] < 850]),
        "lineup": npl(LINEUP), "takeoff_roll": npl(TAKEOFF),
        "climb_out": npl(CLIMB), "climb_out_ground_y": [round(n((0, cl(min(x, 1536)) + (0 if x <= 1536 else (x - 1536) * 0.11)))[1], 5) for x in CLIMB_GROUND],
        "climb_out_direction_deg": round(math.degrees(math.atan2(CLIMB[-1][1] - CLIMB[1][1], CLIMB[-1][0] - CLIMB[1][0])), 1),
        "pushback": "from stand 'nose' back along the line to 'entry' (tail first), then taxi west on apron_taxilane and off-frame left",
        "note": "Typical cycle: approach (q-front-air far out -> side-gear-down mirrored) -> touchdown -> rollout -> "
                "vacate east exit -> taxi west on A -> off left.  Departure: (enter from off-frame left) lineup -> "
                "takeoff_roll -> rotate -> climb_out (side-gear-up mirrored, then q-rear-air shrinking is NOT right here — "
                "it climbs toward the camera side; keep side-gear-up and scale up). Climb-out crosses the calm zone briefly; fade/size it there.",
    },
    "lights": {
        "runway_edge_far": npl(edge_far), "runway_edge_near": npl(edge_near),
        "runway_edge_spacing_m": 30, "runway_centreline": npl(centre), "runway_centreline_spacing_m": 15,
        "threshold_bar_green": npl(thr_bar),
        "approach_lights_white": npl(appr), "approach_crossbar_nx": round(appr_crossbar_x / RW, 5),
        "approach_note": "threshold is at the left frame edge, so the approach light line lies at nx<0 — visible only when the plate is extended for ultrawide",
        "papi": npl(papi), "papi_note": "4 boxes, left of the runway for eastbound landings (far edge): 2 red / 2 white on slope",
        "taxiway_centreline_green": npl(twy_c), "taxiway_spacing_m": 15,
        "apron_floodlights": [{"id": m[0], "lamp": n(m[1]), "base": n(m[2]), "pool_centre": n((m[2][0] + 30, m[2][1] - 10))} for m in MASTS],
        "mast_obstruction_red": [n((m[1][0], m[1][1] - 6)) for m in MASTS],
        "beacon": n(BEACON), "beacon_note": "rotating white/green aerodrome beacon on the terminal roof (the tower itself is the camera)",
        "terminal_windows_glow_rect": [n((0, 700)), n((278, 1024))],
    },
    "occluders": {"note": "Plate pixels that must be drawn IN FRONT of sprites whose ground point is above (smaller y than) base_y. "
                          "Each is an alpha mask (occluders/<id>.png, full 2560x1600) — redraw the current plate through it.",
                  "items": []},
    "sprites": {},
}

# ---------------------------------------------------------------- occluder masks
os.makedirs(f'{ROOT}/occluders', exist_ok=True)
day = np.asarray(Image.open(f'{ROOT}/raw/plate-day.png').convert('RGB')).astype(float)
lum = day.mean(-1)
def save_mask(name, m, base_y):
    im = Image.fromarray((m * 255).astype(np.uint8)).crop((0, CROP, RW, RH)).resize((FW, FH), Image.LANCZOS)
    im.save(f'{ROOT}/occluders/{name}.png', optimize=True)
    bbox = im.getbbox()
    layout["occluders"]["items"].append({"id": name, "file": f"occluders/{name}.png", "base_y": n((0, base_y))[1],
                                         "bbox": [round(bbox[0] / FW, 4), round(bbox[1] / FH, 4), round(bbox[2] / FW, 4), round(bbox[3] / FH, 4)]})
for name, head, base in MASTS:
    m = np.zeros((RH, RW))
    yy, xx = np.mgrid[0:RH, 0:RW]
    hw = 3 + (base[1] - 600) / 120          # wider for nearer masts
    t = np.clip((yy - head[1]) / max(1, base[1] - head[1]), 0, 1)
    px = head[0] + (base[0] - head[0]) * t
    band = (np.abs(xx - px) <= hw + 2) & (yy >= head[1] - 2) & (yy <= min(base[1] + 4, RH))
    headbox = (np.abs(xx - head[0]) <= 8 + hw * 2) & (np.abs(yy - head[1]) <= 6 + hw)
    region = band | headbox
    # keep only pixels darker than the concrete/grass behind them (poles are grey-blue on light concrete)
    bg = Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.MedianFilter(15))
    dark = (np.asarray(bg).astype(float) - lum) > 18
    mm = (region & dark).astype(float)
    mm = np.asarray(Image.fromarray((mm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))) / 255.0
    mm *= region
    save_mask(f'mast-{name}', mm, base[1])
POLYS = {
    'jetbridge-1': ([(45, 705), (155, 685), (204, 685), (205, 725), (170, 742), (60, 752), (60, 772), (44, 772)], 760),
    'jetbridge-2': ([(150, 772), (290, 743), (318, 737), (327, 741), (327, 787), (302, 800), (304, 823), (270, 823), (268, 806), (176, 816), (176, 860), (150, 860)], 830),
    'terminal': ([(0, 688), (47, 703), (47, 758), (150, 768), (150, 872), (268, 860), (280, 884), (279, 1024), (0, 1024)], 1024),
}
for name, (poly, base_y) in POLYS.items():
    im = Image.new('L', (RW, RH), 0); ImageDraw.Draw(im).polygon(poly, fill=255)
    im = im.filter(ImageFilter.GaussianBlur(0.7))
    save_mask(name, np.asarray(im) / 255.0, base_y)

# ---------------------------------------------------------------- sprites metadata
REAL = {'a320': 37.6, 'b787': 57.0, 'atr72': 27.2, 'e175': 31.7, 'tug': 6.5, 'baggage-train': 14.0, 'fuel-truck': 10.0, 'follow-me': 4.6}
SP = f'{ROOT}/sprites'
for f in sorted(os.listdir(SP)):
    if not f.endswith('.png'): continue
    key = f[:-4]; im = Image.open(f'{SP}/{f}'); w, h = im.size
    typ = next(t for t in REAL if key.startswith(t + '-'))
    view = key[len(typ) + 1:]
    a = np.asarray(im)[..., 3] > 128
    rows = np.where(a.any(1))[0]
    # sheet scale: the side view's width == real length; other views on the same sheet share that scale
    side = Image.open(f'{SP}/{typ}-side.png').size[0]
    ppm_sheet = side / REAL[typ]
    if view in ('q-front', 'q-rear'):   # ground sheets (separate generation): scale matched to the air views
        ref = f'{SP}/{typ}-{view}-air.png'
        if os.path.exists(ref):
            ppm_sheet *= w / Image.open(ref).size[0] * 0.92  # same angle, wings level -> slightly narrower span
    layout["sprites"][key] = {"file": f"sprites/{f}", "size": [w, h], "type": typ, "view": view,
                              "real_length_m": REAL[typ], "sprite_px_per_m": round(ppm_sheet, 3),
                              "anchor": [0.5, round((rows[-1] + 1) / h, 4)],
                              "faces": "left" if 'side' in view else ('toward lower-left' if 'front' in view else 'away, upper-left')}

json.dump(layout, open(f'{ROOT}/layout.json', 'w'), indent=1)
print('layout.json written;', len(edge_far) + len(edge_near), 'edge lights,', len(centre), 'CL lights,', len(twy_c), 'twy lights')

# ---------------------------------------------------------------- check overlays
def draw_check(plate, out):
    im = Image.open(f'{ROOT}/{plate}').convert('RGB'); d = ImageDraw.Draw(im)
    P = lambda q: (q[0] * FW, q[1] * FH)
    def line(pts, col, w=3): d.line([P(q) for q in pts], fill=col, width=w)
    def dots(pts, col, r=4):
        for q in pts:
            x, y = P(q); d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    L = layout
    line(L['runway']['edge_far'], (255, 0, 255), 2); line(L['runway']['edge_near'], (255, 0, 255), 2)
    line(L['runway']['centreline'], (0, 255, 255), 2)
    for k in ['A', 'exit_west', 'exit_east']: line(L['taxiways'][k], (255, 120, 0), 3)
    line(L['taxiways']['apron_taxilane'], (255, 220, 0), 2)
    line(L['paths']['approach'], (80, 160, 255), 3); line(L['paths']['climb_out'], (255, 80, 80), 3)
    dots(L['lights']['runway_edge_far'] + L['lights']['runway_edge_near'], (255, 255, 255), 3)
    dots(L['lights']['runway_centreline'], (120, 255, 255), 2)
    dots(L['lights']['taxiway_centreline_green'], (0, 255, 0), 2)
    dots(L['lights']['threshold_bar_green'], (0, 200, 0), 4); dots(L['lights']['papi'], (255, 0, 0), 4)
    for m in L['lights']['apron_floodlights']: dots([m['lamp']], (255, 255, 0), 7); dots([m['base']], (255, 128, 0), 5)
    dots([L['lights']['beacon']], (0, 255, 0), 8)
    for s in L['stands']:
        dots([s['nose']], (255, 0, 0), 7); line([s['nose'], s['entry']], (255, 0, 0), 2)
        d.text((P(s['nose'])[0] - 10, P(s['nose'])[1] + 8), s['id'], fill=(255, 0, 0))
    dots([L['runway']['touchdown']], (0, 0, 255), 9); dots([L['runway']['threshold']], (0, 150, 0), 9)
    d.line([(0.72 * FW, 0), (0.72 * FW, FH)], fill=(255, 255, 255), width=1)
    # 40 m reference bars along the runway
    for xr in [100, 340, 600, 900, 1200, 1500]:
        y = cl(xr); Lp = 40 * ppm_raw(y)
        x0, y0 = P(n((xr - Lp / 2, y))); x1, _ = P(n((xr + Lp / 2, y)))
        d.line([(x0, y0 - 14), (x1, y0 - 14)], fill=(255, 255, 0), width=5)
    occ = np.zeros((FH, FW))
    for it in L['occluders']['items']: occ = np.maximum(occ, np.asarray(Image.open(f"{ROOT}/{it['file']}")) / 255.0)
    a = np.asarray(im).astype(float); tint = np.array([255, 0, 120.0])
    a = a * (1 - 0.45 * occ[..., None]) + tint * 0.45 * occ[..., None]
    Image.fromarray(a.astype(np.uint8)).save(out)
draw_check('plate-day.png', f'{ROOT}/layout-check.png')
draw_check('plate-night.png', f'{ROOT}/raw/layout-check-night.png')
print('check images written')
