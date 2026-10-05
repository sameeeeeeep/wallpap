# Landing hero and scene journey — 2026-10-05

Chosen headline: **A world behind your work.**
Support: **Live wallpapers. Made to be touched.**
CTA: **Download for Mac**.

Alternatives: “Your wallpaper has a life now.” / “Make room for wonder.” /
“Work here. Wander everywhere.” / “Give your desktop a pulse.”
Full copy notes: `shots/hero/copy-options.md`.

The hero uses forest ink on warm off-white with one primary CTA and the actual live
Mac preview. Fullscreen retains the playground, scene picker, controls and menu-bar
panel. “Show me around” is explicitly opt-in. Pets, Play, pricing, FAQ, community,
download/buy handlers and SEO metadata remain in place.

The next scroll enters a pinned viewport. Native page scrolling advances the twelve
scenes already offered in the playground: Koi, Cats, Café, Train, Grass, Cabin,
Records, Ramen, Rooftop, Speakeasy, Bowls, Cymatics. Each uses the existing scene
iframe and SceneHost app bridge. There is no duplicated scene implementation or new
scene artwork. A still paints immediately; only neighboring stills are prefetched.
The previous iframe is removed before the next is created. Hidden tabs and the end
CTA unload the rendering context. The existing scenes request 30fps.

The overlay contains a scene/category label, count and twelve progress marks,
previous/next controls, subtle download link and Skip. Wheel input over an iframe
scrolls the parent. Arrow keys work in the page and iframe. Escape/Skip jumps to the
end CTA and moves keyboard focus there. Normal scrolling continues into the rest
of the page without any wheel lock or mandatory snapping.

Each live scene gets one contextual hint, after it finishes loading plus 1.4 seconds.
It disappears after interaction or 5.2 seconds. Hints never take pointer input.
The piano and bowls unlock sound on the first deliberate click.
Media hints dismiss on the scene's actual media message; movement/click hints listen
inside the scene. A hint is offered once per scene per visit. There is no ghost
cursor in the journey.

At <=760px, on touch-only devices (including landscape phones), with reduced motion,
or Save-Data, the journey uses stills and a short scroll
hint. Phones never automatically or explicitly load heavy scene iframes. Reduced
motion disables automatic hero playback; the desktop visitor can explicitly play
that preview. Preference/viewport changes dispose live frames. The site deliberately
keeps its existing light brand palette in either system appearance.

## Verification and evidence

- `./build-site.sh` refreshed ignored `site/scenes/`.
- Own static server: `127.0.0.1:5224`; the owner's 5223 server was left alone.
- `node --test tests/*.cjs`: 96/96 passing.
- Thirty WebKit screenshots: 1440×900, 1280×800, 390×844 × light/dark system
  appearances × hero/Koi/Cats/Café/end. Scene shots contain the hint. All report
  zero JS/image errors, zero horizontal overflow, no automatic ghost, exactly one
  desktop scene iframe or zero mobile/end iframes. `shots/hero/matrix.json`.
- All twelve scenes, real cat picking, record-player audio, hint dismissal/expiry,
  iframe wheel and keyboard navigation, rapid-scroll unloading, return to hero,
  menu-bar panel, fullscreen controls and exit: `shots/hero/verification.json`.
- Hidden-tab restoration, runtime reduced-motion toggles and switching to the phone
  breakpoint: `shots/hero/lifecycle.json` (all seven checks pass).
- Landscape touch-device fallback: `shots/hero/844x390-touch-landscape.png`
  (zero scene iframes, no horizontal overflow).
- Reduced-motion desktop: `shots/hero/1440x900-reduced-motion.png` and its log.
- First-click piano/bowl sound unlock: `shots/hero/instruments.json`.
- Recording: `shots/hero/hero-journey-end.mp4` (27 seconds, 1280×800, 12fps),
  with `video-contact.jpg` and per-frame reports in `video-capture.log`.
- Contact sheets: `shots/hero/light-contact.jpg`, `shots/hero/dark-contact.jpg`.
  Individual filenames: `<width>x<height>-<light|dark>-<hero|koi|cats|cafe|end>.png`.

Reproduce on macOS (Swift/WebKit, Python Pillow, ffmpeg): run the static server at
5224, then `python3 tools/landing-hero/capture.py` and
`python3 tools/landing-hero/record.py`. To run the interaction checks, use the built
`/tmp/wallpap-hero-capture` with URL, output PNG, width, height, zero steps and the
contents of `tools/landing-hero/verify.js` as the final argument.

The offscreen harness derives from `tools/wkshot.swift`. It supplies visible-tab
visibility and a parent timer clock, uses the scenes' supported virtual clock, and
disables CSS transitions to capture their final states (offscreen WebKit does not
advance the compositor). The MP4 is a stepped WebKit capture, not a real-time FPS
benchmark. The screenshot script restarts the real hint timer after virtual scene
stepping; hint lifetime is independently checked by verify.js.

Performance evidence establishes a single rendering context, zero background/end
contexts and 30fps configuration. Frame timings in verification.json are virtual
JS dispatch measurements under concurrent capture load, not end-to-end presentation
latency. Real Safari/trackpad feel, low-end GPU behavior and physical iPhone testing
remain launch checks. No installed app, scene source, release, deployment or push.

## Visual review

The first review moved the scroll invitation fully above the fold, replaced the
phone's desktop click instruction, and removed all desktop controls from the
journey. Final desktop views leave the center of the wallpaper clear; mobile crops
remain legible, controls stay above the bottom edge, and the end CTA leads naturally
into the compact existing page. Hint timers now begin after artwork loads, fixing
the early-expiry issue found during capture. Final source review also corrected the Speakeasy hint to its playable piano keys
(the jukebox is decorative); that segment was recaptured for the MP4.
Existing stills retain their older art;
mobile shows those intentionally rather than downloading the live pet sprite sets.
