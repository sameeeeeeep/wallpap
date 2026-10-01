# wallpap

**Your desktop, alive.** A tiny macOS menu-bar app that puts calm, interactive scenes *behind your desktop icons* — a koi pond, singing bowls, cats on a Santorini terrace, a meadow of pandas, a late-night café that plays along with your music. They follow your real weather and time of day, nudge you to drink water and breathe, and rest (≈0 energy) whenever you're not looking at the desktop.

→ **[wallpap.live](https://wallpap.live)** · [Download for Mac](https://github.com/sameeeeeeep/wallpap/releases/latest/download/wallpap.dmg)

## How it works
- `host/main.swift` — the native app: one borderless `WKWebView` per display, pinned just above the system wallpaper and below the desktop icons, on every Space. It ignores the mouse (Finder keeps the desktop); a global monitor forwards cursor/clicks to the scene only when they land on bare desktop. Menu bar controls, weather (Open-Meteo), reminders, soundscapes, Music Mode (Apple Music / Spotify), AI companions (Claude Code / Codex activity), energy governor.
- `scenes/` — each scene is a single self-contained HTML file (Canvas2D / WebGL, no build step). `scenes/lw.js` is the shared shim: input, audio, env/weather, reminders, calm mode, settings, soundscapes, frame governor, companions.
- `site/` — the static website (GitHub Pages). `build-site.sh` copies the live scenes in.

## Build
```bash
./build.sh --run     # build + launch
./build.sh --dmg     # universal release build → dist/wallpap.dmg
```
Requires macOS 13+ and the Xcode command-line tools (`swiftc`).

## Develop a scene
```bash
python3 devserver.py 5210   # → http://127.0.0.1:5210/koi.html
```
Dev keys: `w` weather · `t` +3h · `r` reminder · `b` calm · `m` mute · `n` fake now-playing · `a` fake AI companions. `?virtual=1` + `LW.advance(sec)` / `await LW.shot('x.png')` for headless screenshots.

© wallpap. Source available; all rights reserved.
