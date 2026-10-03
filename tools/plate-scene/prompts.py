# Prompt templates for the plate-scene pipeline. Everything a scene needs is written ONCE in art-src/<id>/spec.json
# (the place, what's calm, what lights up at night…); these templates wrap it with the composition rules that make a
# Codex image work as a live wallpaper plate, and with the "preserve geometry, change only light" edit language.
#
# Rules baked into every master plate (learned on the airport set):
#   * plain gradient sky, no clouds/sun/moon/birds → the live Kit.sky shows through a sky mask
#   * the right ~28% calm → macOS widgets sit there (k.layout mirrors it when they're on the left)
#   * empty of people/vehicles/animals → everything that moves is a live sprite, so it can move
#   * no text/logos/signage; nothing important in the top ~6% (3:2 → 16:10 crop)

STYLE = {
    'photo': ('Photorealistic, shot like a real high-end travel / architectural photograph or a cinematic film still: natural '
              'colour, true-to-life materials, subtle atmospheric haze with distance, crisp detail, gentle natural contrast. '
              'No illustration, no painterly look, no CGI-toy look, no HDR halos, no tilt-shift, no vignette, no watermark.'),
    'painted': ('Hand-painted animation background art in the tradition of classic 1980s-90s Japanese animated feature films: '
                'gouache and poster colour on paper, soft confident brushwork, lush saturated greens, luminous light, gentle '
                'atmospheric perspective, clean readable shapes, a little paper texture. An ORIGINAL painting (not a copy of any '
                'existing film frame), no characters, no people, no text, no signature, no watermark.'),
}

TAIL = ('\n\nUse your built-in image generation tool to make exactly this one image (largest landscape size available, '
        'ideally 1536x1024). Save the final PNG at exactly this absolute path: {out} . Do nothing else: do not write any code '
        'or other files.')


def master(spec):
    """The DAY plate: the one image every other plate is an edit of."""
    s = spec
    rules = [
        f"Wallpaper composition for a wide desktop screen (the top ~6% of the image will be cropped away, keep nothing important there).",
        f"The sky ({s.get('sky_area', 'top ~40% of the frame')}) is a perfectly plain, smooth, clear gradient — ABSOLUTELY NO clouds, "
        f"no sun, no moon, no stars, no birds, no aircraft, no contrails (the sky is animated live on top of this image).",
        f"The RIGHT ~28% of the frame is calm and simple ({s.get('calm', 'open sky and quiet ground')}): no hero subject and no bright, "
        f"busy or high-contrast detail there, because desktop widgets sit on top of it.",
        f"Completely empty of people, vehicles and animals{(' ' + s['allow']) if s.get('allow') else ''} — they are added live later. "
        f"No text, no letters, no numbers, no logos, no readable signage.",
    ]
    if s.get('space'): rules.append(s['space'])
    light = s.get('light', {}).get('day', 'clear, bright mid-morning sun from the upper left, crisp soft shadows, clean blue sky gradient')
    return (s['scene'].strip() + '\n' + '\n'.join('- ' + r for r in rules) +
            f"\nLighting: {light}.\n{STYLE[s.get('style', 'photo')]}")


EDIT_HEAD = ('Edit the attached reference image. Preserve EVERY pixel of geometry exactly — same camera, same framing, same '
             '{preserve}, everything in identical positions and sizes. Change ONLY the {what}: ')
EDIT_TAIL = (' Keep the sky a plain, smooth gradient: no clouds, no sun disc, no moon, no stars. Still no people, vehicles, '
             'animals or text.\n{style}')

DEFAULT_LIGHT = {
    'dawn': ('lighting', 'sunrise: soft pink-gold early light from the {sunrise_side} (the sun itself NOT visible), long soft cool '
             'shadows, a thin pale morning mist lying low over the ground and water, sky a plain gradient from pale blue at the top '
             'to soft peach-pink near the horizon'),
    'dusk': ('lighting and colour', 'golden hour just before sunset: warm low sun from the {sunset_side} (the sun itself NOT '
             'visible), long soft shadows, warm amber light raking across {surfaces}, sky a plain clean gradient from soft dusky '
             'blue at the top to warm peach/amber near the horizon'),
    'night': ('lighting', 'clear night: sky a plain deep navy gradient to a slightly lighter blue-grey near the horizon, NO stars, '
              'NO moon. {night_lights}. Everything else dark, gently readable in soft blue ambient light. Real night photograph '
              'look, low noise, no long-exposure light trails'),
    'overcast': ('lighting and weather', 'flat overcast grey daylight just after rain, no shadows, the sky a plain smooth grey '
                 'gradient (no distinct cloud shapes, no sun), slightly reduced contrast and a little more haze with distance, '
                 '{wet}'),
}


def edit(spec, variant):
    s, L = spec, spec.get('light', {})
    what, body = DEFAULT_LIGHT[variant]
    body = L.get(variant) or body
    body = body.format(sunrise_side=s.get('sunrise_side', 'right'), sunset_side=s.get('sunset_side', 'left'),
                       surfaces=s.get('surfaces', 'the ground'), night_lights=s.get('night_lights', 'Windows glow softly warm'),
                       wet=s.get('wet', 'all paved surfaces WET with a soft sheen and faint reflections of the sky'))
    return (EDIT_HEAD.format(preserve=s.get('preserve', 'buildings, ground and horizon'), what=what) + body.rstrip('.') + '.' +
            EDIT_TAIL.format(style=STYLE[s.get('style', 'photo')]))


def key(spec, region):
    """A chroma-key edit of the day plate: the region painted flat #00FF00, everything else untouched → align → mask."""
    return ('Edit the attached reference image. Keep EVERYTHING exactly as it is — same framing, same pixels, same colours — '
            f'EXCEPT: paint {region} with pure, flat chroma-key green #00FF00 (exactly that colour, completely flat: no shading, '
            'no texture, no reflections, no gradient, no outline), filling it completely right up to its exact true outlines '
            '(follow every edge precisely, including small gaps and thin parts). Do not change, move, add or recolour anything else.')


BG = {'grey': 'plain flat uniform light-grey #e6e6e6', 'green': 'plain flat uniform chroma-key green #00FF00'}


def sheet(spec, sh):
    style = sh.get('style') or STYLE[spec.get('style', 'photo')]
    return (f"Sprite reference sheet for a live wallpaper. {style}\n"
            f"{BG[sh.get('bg', 'grey')]} background everywhere (exactly that colour), NO ground plane, NO cast shadow on the "
            f"background, NO reflections, NO text, NO labels, NO numbers, NO logos. Every object completely inside its own cell with "
            f"generous empty background around it; objects must NOT touch or overlap each other or the image edges. "
            f"{sh.get('light', 'Lighting: soft daylight from the upper-left.')}\n{sh['prompt'].strip()}")
