# Hacker News — Show HN

HN doesn't take media attachments. Link to the site, and the site's live scene embed does the demo. Post Tuesday to Thursday, around 8–10am US Pacific, and stay in the thread.

**Title:** Show HN: Wallpap – interactive live wallpapers for macOS

(Alternate: "Show HN: A koi pond behind your Mac's desktop icons")

**URL:** https://wallpap.live

**Text:**

I made wallpap, a menu-bar app that puts animated scenes behind your desktop icons. You can click them. A koi pond where the fish come for food, cats on a terrace, a record store that shows whatever is playing in Apple Music or Spotify, a cymatics plate where sand forms Chladni patterns to your music.

Some implementation notes, since that's probably the interesting part here:

- Each display gets one borderless WKWebView, pinned just above the system wallpaper and below the desktop icons, on every Space. It ignores the mouse, so Finder keeps the desktop. A global event monitor forwards the cursor and clicks to the scene only when they land on bare desktop.
- Every scene is a single self-contained HTML file (Canvas2D / WebGL, no build step) plus a shared shim that handles input, weather/time, reminders, music and energy. New scenes ship from an online catalog without an app update.
- Energy: the shim owns requestAnimationFrame. It caps the frame rate while you're using the desktop, and when you haven't touched the desktop for a while it stops rendering entirely and keeps the last frame. Scenes have to clamp dt because a resume can follow a long pause.
- Weather comes from Open-Meteo with approximate coordinates. Sunrise, sunset and moon phase are computed locally.
- Beat Sync analyses system audio passively to get levels, kicks, chroma and key, and turns that into scene motion. Your audio is never rerouted.
- Scenes have a virtual-clock mode (rAF and performance.now replaced, stepped manually). That's how I take deterministic screenshots, and how the launch videos were rendered frame by frame.

Every scene is free in its default look. Pro is a $5 one-time license that adds skins, Music Mode, Calm (breathing inside the scene), reminders, soundscapes and live weather. No account. Signed and notarized, macOS 13+.

I'd especially like to hear about performance on older Intel Macs, and whether the "pause and keep the last frame" behaviour feels right.
