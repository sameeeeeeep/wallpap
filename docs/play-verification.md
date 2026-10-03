# Play v1 verification — 2026-10-04

Implemented in the isolated `play-mode` worktree. No push, release, deployment, installed-app launch, live defaults change, or interaction with the owner's desktop. All native rendering used an off-screen, activation-prohibited test harness. The local app's resource-check flag exits before NSApplication initialization.

## Automated results

- `node --test tests/*.cjs`: 76 passed, 0 failed, 0 skipped. Includes an executable Swift RSS/Atom, strict link, cache TTL/disk/offline, and anonymous-client check. Daily arithmetic, repeated letters, every crossword grid, original clue-bank consistency, all answer membership, ad removal, SDK isolation, and worker aggregate validation are covered.
- `./build.sh`: passes in this worktree. Existing duplicate `bowls` switch warning remains outside Play.
- `LIVEWALL_SCENES="$PWD/scenes" ./wallpap.app/Contents/MacOS/wallpap --play-resource-check`: passes, no windows created, endpoint empty.
- Off-screen native WebKit: file:// shell and opaque card handshake; child-frame native bridge denied; child network/file navigation denied; local progress survives switching scene file URLs. Passes.
- Full visual matrix: cats, koi and train, light/dark, home, both mid-puzzles/completed puzzles, assisted crossword, news, offline news, news bottom ad, word/news Pro and production feed-permission state. 72 captures, no JS or layout/ad assertions failed. Additional final crossword sheets include the revised single-focus accessible grid and Pro.
- Headless interactions: actual sandboxed keyboard navigation, word validation, crossword square/word/puzzle checks, assisted reveal, completion, sponsored rows and persisted progress. Simulated card failure displays Retry; reloading both cards preserves progress. Origin, cookie, feed, external link and free-form event probes are denied.
- Performance: measured synchronous puzzle handlers were 0–1 ms (WebKit clock resolution 1 ms); both cards have no idle rAF/interval loop. Full synthetic event dispatch includes a 5 ms first-arrow sample in WebKit, so the strict <2 ms end-to-end interaction-frame target is not established by these tests. Confirm cold interaction latency in the owner’s native test session; the raw timings are preserved rather than discarded.
- Layout edges: mirrored cats, 3440×1440 mirrored cats, 1024×768 koi, paused train with Reduce Motion; clear-area bounds, panel pet occlusion, resume/restore and rapid close/reopen pass. JPEG sheets inspected for clear widget space, readable controls and clipped/avoiding pets. No scene art changed.

Logs: `.build/play-tests.log`, `.build/play-build.log`, `.build/play-webkit.log`, `.build/play-gate-*.log`; structured visual/interaction reports are in `shots/play/*.json`. Raw PNGs are deleted as each contact sheet is made. Disk remained above 3 GB (14 GiB at final build).

## Contact sheets

- `shots/play/{cats,koi,train}-{light,dark}-scenes.jpg`: scene context; matching `-panels.jpg`: readable card details.
- `shots/play/*-crossword-of-the-day-*-{scenes,panels}.jpg` and `*-crossword-of-the-day-{scenes,panels}.jpg`: final grid, completion, assisted and Pro.
- `shots/play/cats-{light,dark}-{word-of-the-day,news,_template}-file-{scenes,panels}.jpg`: complete default authoring gates from native file:// loading.
- `shots/play/edge-cases.jpg`, `shots/play/interactions.jpg`: layout and actual interaction checks.

## Reproduce safely

```
node tools/pack-cards.js
node --test tests/*.cjs
node tools/check-card.js word-of-the-day
node tools/check-card.js crossword-of-the-day
node tools/check-card.js news
node tools/check-card.js _template
./build.sh
LIVEWALL_SCENES="$PWD/scenes" ./wallpap.app/Contents/MacOS/wallpap --play-resource-check
swiftc -O -o .build/play-webkit-check host/PlayPolicy.swift tools/play/webkit-check.swift -framework AppKit -framework WebKit
LIVEWALL_SCENES="$PWD/scenes" .build/play-webkit-check
```

The default card gate compiles its off-screen wkshot helper when needed and uses file://. Full matrix/edge/interactions use this worktree's `python3 devserver.py 5217`; run `python3 tools/play/verify.py`, `python3 tools/play/edge-cases.py`, and `python3 tools/play/interactions.py`. Test news fixtures are clearly marked original test headlines, injected in memory only. No article is scraped and no production permission is fabricated.

## Owner checks and decisions

- On a suitable test session, verify both menu entries, mouse-display selection, other displays staying wallpaper, return to the previous frontmost app, fullscreen disabled tooltip, and user/battery/away pause restoration. These visible native transitions were intentionally not exercised on the owner's screen. Confirm VoiceOver announcements with the actual assistive technology; semantic labels and keyboard paths were checked headlessly.
- No live feeds are enabled. See `docs/play-feed-review.md` for official URL/terms evidence. Obtain commercial headline-plus-link permission, record allowed article hosts and dates, then rebuild the catalog.
- Analytics is fully inert with the empty endpoint. Owner deploys `tools/analytics-worker` and confirms provider-level logging/privacy settings before configuring a URL. Nothing was deployed.
- House ads are the only ad source. A third-party contextual network remains an owner choice for a later release.
