# Add to desktop

The website hands a scene to the Mac app using `wallpap://`. This requires an app build containing `host/DeepLinks.swift`; the existing public DMG will only support the feature after a release. The download URL remains the existing latest-release DMG URL.

## Routes

| Link | Result |
| --- | --- |
| `wallpap://scene/koi` | Select the bundled Koi Pond through the same `pickScene` action as the panel. |
| `wallpap://scene/train?look=swiss` | Select Train Journey and its Swiss look; non-default looks require Pro. |
| `wallpap://scene/airport` | Select an installed official add-on, or find it in the official catalog, check Pro access, ask **Add Airport to wallpap?**, install it and select it. |

`CFBundleURLTypes` registers the scheme. `application(_:open:)` queues requests until startup is complete and processes them serially, with at most 16 waiting URLs. Installed built-ins and official add-ons work offline and need no confirmation. A new install uses an AppKit confirmation sheet when a suitable window exists, otherwise a native modal alert (wallpap normally has only desktop windows and a transient menu popover). Cancel leaves the scene uninstalled. Download progress appears in the existing menu/Discover busy state.

Pro scenes and non-default looks use the existing Pro upsell. Invalid links, unknown scene IDs, invalid looks, catalog failures, download failures and missing installed files get native alerts. A custom import with a colliding ID is preserved and produces an explanation instead of being overwritten by a scene link.

## Security boundary

- IDs and look IDs are 1–40 ASCII characters: lowercase letters or digits, with single internal dashes; no leading/trailing dash, doubled dash, Unicode, whitespace, dot, slash or percent encoding.
- Only `wallpap://scene/<id>` and one optional literal `?look=<skin>` are accepted. User info, ports, fragments, extra path components and extra/duplicate query parameters are rejected.
- A link supplies an ID, never a download URL or file path. Built-ins are checked against the compiled scene list; installed add-ons must have the existing catalog source marker. Custom imports cannot be selected through this route.
- New scenes must appear in `https://wallpap.live/catalog.json`. The old `WALLPAP_CATALOG` environment override is removed. The catalog response must resolve to that exact URL, and archive URLs must use HTTPS on `wallpap.live` without credentials or an explicit port. Archive responses from a different host or scheme are rejected before extraction.
- Installs reuse `installCatalogScene`, its staging directory and existing manifest checks: successful extraction, `scene.json`, `index.html`, valid ID and an exact ID match. This is the existing HTTPS/catalog trust model; the catalog currently has no signed archive or hash field, so this feature does not claim cryptographic archive verification.
- Scene selection goes through `pickScene`, which now also enforces scene-level Pro access. Requested looks are checked against the host's skin list and its free/default-look rule before selection.

## Website behavior

The hero, every playground picker card, current-preview action, preview menu bar, menu-bar panel and featured community cards offer **Add to desktop**. The panel action is injected only into the site's preview; the native panel stays unchanged.

On a Mac, a click navigates directly to the scheme while listening for window blur (including a focused preview iframe) or the document becoming hidden within 1,500 ms. Either event counts as an apparent handoff and saves `wallpap.app-opened=1` in localStorage. This is a browser heuristic, not proof of installation: switching tabs or an external-protocol permission dialog can also blur the page.

Without a handoff, a modal offers **Get wallpap for Mac**, the existing DMG download and **Already installed? Open wallpap**. Retry preserves the requested scene/look. Remembered visitors also navigate directly; the timeout remains as recovery if the app was removed. A timeout clears the remembered hint. Unavailable localStorage is harmless. Repeated clicks cancel earlier listeners/timers.

On Windows, Android, iPhone and iPad (including desktop-mode iPad), no scheme navigation is attempted. The sheet explains that wallpap is a Mac app and offers its Mac download. No automatic email or message is sent.

The sheet uses a native HTML modal dialog for focus containment, Escape dismissal and focus restoration; it is moved inside the fullscreen root so it stays visible above the scene. It follows system light/dark appearance while retaining the marketing page's existing light palette. The download is explicit; nothing opens or downloads merely by visiting the page.

## Reproduce the checks safely

```sh
node --test tests/*.cjs
./build.sh
python3 tools/scene-links/site-check.py
```

The first command includes executable Swift parser checks and browser-launcher tests. The build creates only this worktree's ignored `wallpap.app`; do not use `--run` for verification on the owner's Mac.

`site-check.py` serves this worktree's site plus scenes on an ephemeral loopback port, runs the existing off-screen `tools/wkshot`, and always stops its own server. It intercepts scheme navigation, exercises real UI handlers and the launcher timeout/retry, and writes PNGs, logs and `results.json` to `shots/add-to-desktop/`. Its community gallery fixture does not modify `site/catalog.json`. CSS transitions are disabled in the screenshot harness because off-screen WebKit can suspend them at their first frame. Optional mode arguments rerun only selected views, e.g. `python3 tools/scene-links/site-check.py fullscreen-panel`.

For an actual handoff smoke test on a separate test Mac/profile after installing the new build, click a site's **Add to desktop** action, or open `wallpap://scene/koi`. Test `wallpap://scene/train?look=swiss` with free and Pro access, and `wallpap://scene/airport` with Pro when it is not installed (cancel once, then accept). Try `wallpap://scene/not-a-real-scene` for the error alert. These operations were deliberately not run against the owner's installed app.

## Verification — 2026-10-05

- `node --test tests/*.cjs`: **110 passed, 0 failed**, final run 12.4 seconds. Earlier runs hit the pre-existing Play-host compiler's 25-second timeout under shared machine load; a final unmodified-command rerun passed without changing or skipping tests.
- `./build.sh`: **passed**; only the existing duplicate `case "bowls"` warning in `host/main.swift`. The built bundle's URL-scheme plist also passes `plutil -lint`.
- `python3 tools/scene-links/site-check.py`: **9/9 views passed**, 174 DOM/interaction assertions in total, zero JavaScript/image errors. The temporary server was stopped. PNGs were visually reviewed; the fullscreen scene canvas can retain its old raster size in off-screen WebKit, while the menu actions and modal occupy the correct fullscreen bounds.

- Executable URL/ID checks cover valid routes, skin parsing, length boundaries, traversal, encoded paths, extra query parameters, Unicode, newline IDs and hostile authorities.
- Launcher tests cover absent/present handler, blur/visibility/iframe focus, retry, remembered-open recovery, rapid clicks, blocked storage, navigation errors and non-Mac devices.
- WebKit checks cover all picker cards, hero presence, a featured-gallery fixture, the current playground button, fullscreen menu-panel action, fallback/retry, modal focus, download target and mobile layout. Captures: button, sheet, fullscreen panel and fullscreen sheet in both light/dark, plus a mobile Mac-only sheet.
- Fullscreen captures use the site's fixed-overlay fallback. Real browser fullscreen permission and Launch Services delivery/native install dialogs remain a release smoke test on a separate test environment; no scheme registration, app launch, install, settings change, push or release was performed here.
