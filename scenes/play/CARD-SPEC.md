# wallpap card contract v1

Original content only. No borrowed game names, trade dress, or answer lists. A card is one HTML file with optional data/ JSON, credit and licence records. Register its manifest in catalog.json and rebuild catalog.js with `node tools/pack-cards.js`; this bundles assets for offline file:// WebKit loading without granting a frame file access.

Manifest (no extra fields): `{id, name, category, icon, credit, needs:{network:[feedIds], keyboard:boolean}, daily:boolean, ads:boolean}`. IDs are lowercase words separated by hyphens. Categories: Puzzles, News. Icons: puzzle, crossword, news (shell supplies SVG). Name/credit/icon nonempty, max 120 characters. Only approved feeds in feeds.json can be named.

## SDK
Include `<!--CARD_STYLE-->` in head and `<!--CARD_SDK-->` before inline scripts. `await card.ready()` completes theme/date handshake. `card.today()` returns local YYYY-MM-DD. `card.theme()` returns mode and accent. `card.load(key)` and `card.save(key,value)` are async, bounded to 64 KB per card, namespaced locally on this Mac; no sync. Use key `summary` with `{day,done,streak}` for Today. `card.feed(feedId)` returns `{items,offline,updated,error?}`. `card.open(url)` only opens a link obtained from the current feed capability. `card.event(name)` supports `puzzle_complete` (daily puzzles only); news clicks are counted by the host. `card.adSlot(element)` renders a labelled house ad for free users, and nothing for Pro. Only call it at puzzle completion or the bottom of news. `CARD_DATA` holds bundled data by filename stem. `PlayCore` supplies dailyIndex, feedback, crossword checks, streak, dedupe.

Requests use a per-load frame source check. Reload/back/close invalidates outstanding capabilities. CSP is default-src 'none', script-src 'unsafe-inline', style-src 'unsafe-inline', img-src data:, connect-src 'none', form-action 'none'; sandbox is exactly allow-scripts. No same-origin, cookies, file reads, navigation, forms, external CSS/scripts, network, workers, raw bridge access, dynamic code or telemetry. Use textContent for all untrusted text. Never insert feed HTML. Shell and host revalidate every capability; the linter is an authoring gate, not the security boundary.

## Design and access
Use shared card.css tokens (--ink, --muted, --paper, --line, --accent, --soft), system sans plus Georgia headings; restrained green ink, light/dark. Calm premium type, no urgent timers, loud scores, dark patterns, autoplay, emoji or moving artwork. Semantic buttons, visible focus, descriptive labels, aria-live status, labelled cells; feedback needs words/marks as well as colour. Keyboard supports all actions; Escape closes Play, Tab exits the frame naturally. Reduced Motion removes movement. Date changes restart daily content after persisting the old day's progress. Storage/network failures show actionable messages. Completion is idempotent locally.

## Measurable gates
1. `node tools/check-card.js <id> --static-only`: schema, folder/id, JS syntax, no forbidden capabilities/external resources, <300 KB excluding data/. Zero idle rAF or intervals. Interaction budget is <2 ms scripting per frame; report measurements in visual QA.
2. `node tools/check-card.js <id>`: all static gates plus headless file:// WebKit in light/dark with no JS errors (tools/play/verify.py). The optional --static-only shortcut is not the complete gate. JPEG contact sheets only; delete raw PNGs; abort below 3 GB free.
3. `node --test tests/*.cjs`: deterministic daily rules, content, checks, capability isolation, free/Pro, and failure states.
4. Inspect screenshots for clipping, readable contrast, focus, offline/loading/error/done/assisted states, and no content on the widget side. Review original clues, no offensive or obscure fill. Document source licences and feed terms checks.

Crossword grids use one keyboard focus stop with labelled gridcells and aria-activedescendant. Arrow keys select squares; Tab advances across clues then down clues and leaves the grid at the boundary.
