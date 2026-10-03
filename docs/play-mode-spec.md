# Play mode: spec (v1)

Owner decisions, 2026-10-04 (answered at the notch):

| Topic | Decision |
| --- | --- |
| Entry | **Menu bar only**: a "Play" button in the glass panel (scenes/menu.html) and a "Play" item in the native menu. No hotkey, no double-click. |
| Surface | **Glass panel over the live scene.** The scene and its pets keep running behind it. |
| Authoring | **Codex-generated catalog first.** Every card follows this spec and the template, so a new card comes from one line. A user "make one" box comes in a later round. |
| First cards | **Daily puzzles** (a word-of-the-day game and a crossword-of-the-day) and **news** from reliable outlets' own feeds. No curation of our own. |
| Money | Free tier: news and puzzles show **non-targeted (contextual) ads**. **Pro removes ads.** |
| Data | **No user data collected.** Only basic anonymous analytics: aggregate counts, no identifiers. |

The product direction: the wallpaper becomes a place you come back to. It's a calm scene most of the time, and it opens into a small set of things to do (puzzles, news, later more). Content must be trivially AI-authorable.

---

## 1. Experience

### Opening
- The menu bar glass panel gets a **Play** button in its quick bar, and the native menu gets **Play…**. Both are free-tier visible.
- Opening Play:
  1. The wallpaper window rises above app windows, like Show Desktop.
  2. The scene fades in over about 300 ms, still alive, pets and all.
  3. The glass panel slides up from the bottom-centre of the scene's clear area (it respects `LW.layout.clear`, so it never sits under the user's widgets side).
- The scene keeps running at its normal frame rate while Play is open. The energy governor treats Play as engaged.
- Pets keep their routines, and may glance at the panel. They never walk over the panel; it's an occluder on their stage.

### The panel
- Frosted glass, the same visual family as the menu panel: wallpap green-ink identity, light and dark following macOS. About 720×520 pt, rounded 18, soft shadow, backdrop blur of the scene.
- **Left rail of categories:** Puzzles, News. Later: Pets, Calm, Tools. Each has an icon and a count.
- **Home view:**
  - A "Today" strip: today's word game and crossword, with done/streak state.
  - The top 5 headlines.
  - Then a grid of the category's cards.
- **A card opens inside the panel.** It's a sandboxed frame. A back chevron returns to the grid, and the title bar shows the card name and its source/credit.
- **Closing:**
  - Esc, the ✕, or the menu bar Play again → the panel slides down and the wallpaper drops back below the desktop icons.
  - A click on the scene outside the panel also closes it.
  - Focus returns to the app that was frontmost before.
- Keyboard works fully inside Play: tab, arrows, typing for puzzles. The wallpaper window becomes key only while Play is open.

### States and edge cases (all must be handled)
- **Paused scene** (energy away/battery/user): opening Play resumes it (the still blurs away, as on resume today); closing returns to the previous energy state.
- **Multiple displays:** Play opens on the display with the mouse. Other displays stay wallpaper.
- **Fullscreen app Space:** the menu item opens Play on the desktop Space (switches Space) or is disabled with a tooltip. Pick whichever is reliable, and document it.
- **Offline:** news shows the last cached headlines with "Offline · updated <time>". Puzzles work fully offline (content is bundled).
- **First run:** a one-line hint in the panel ("Daily puzzles and headlines, right on your wallpaper") with no modal.
- **Pro vs free:**
  - Free shows the ad slot in news and puzzle cards (see §4).
  - Pro hides it, with no layout jump; the slot simply isn't rendered.
  - Locked categories don't exist in v1. Everything is free with ads.
- **Accessibility:** VoiceOver labels on rail, cards and puzzle cells. Respect Reduce Motion: no slide, crossfade only.

## 2. Architecture

### Host (Swift)
- `host/Play.swift`:
  - Raises the wall window for the target display (level above normal windows, `ignoresMouseEvents = false`, can become key via an `NSWindow` subclass override, `.transient` + `.fullScreenAuxiliary`).
  - Tells the page `__lw('play', {open:true, pro, display})`.
  - Restores level, mouse-ignore and the previous frontmost app on close.
  - One entry point is used by both the panel button and the native menu.
- Bridge, allow-listed (extend the existing `lw` message handler):
  - `play.fetchFeed(id)`: the host fetches only the URLs in the feed allow-list (`scenes/play/feeds.json`), with no cookies. It parses RSS/Atom into `{title, link, source, published}` and caches for 15 min (disk cache in Application Support, so offline works).
  - `play.openLink(url)`: opens in the default browser, only for links that came from a fetched feed.
  - `play.analytics(event, props)`: see §5.
  - `play.close()`.
- Never give cards cookies, file access, or any host capability not listed here.

### Page (scenes/lw.js + scenes/play/)
- `scenes/play/play.js`: the Play shell, injected by lw.js when `play` opens. It renders the panel into any scene, so no scene needs changes. Each scene registers the panel rect as a pet occluder via the pets.js stage API.
- Cards live at `scenes/play/cards/<id>/`:
  - `card.json` manifest: `{ id, name, category, icon, credit, needs: { network: [feedIds], keyboard: bool }, daily: bool, ads: bool }`
  - `index.html`: one self-contained file.
  - Optional `data/` holds bundled content (puzzle sets).
- Cards run in an `<iframe sandbox="allow-scripts">`, with no same-origin. They talk to the shell only through `postMessage` via the tiny SDK `scenes/play/card-sdk.js`:
  - `card.ready()`
  - `card.save(key, value)` and `card.load(key)`: per-card local storage, held by the shell, never synced.
  - `card.today()`: the local date string, the daily seed.
  - `card.feed(id)`: news.
  - `card.open(url)`
  - `card.adSlot(el)`: no-op for Pro.
  - `card.event(name)`: anonymous count.
  - `card.theme()`: light/dark + accent tokens.
- Template: `scenes/play/cards/_template/` is a working minimal card plus a README. A new card = copy the template, edit, add `card.json`.
- **CARD-SPEC.md** (`scenes/play/CARD-SPEC.md`) is the AI-authoring contract, like `tools/plate-scene/SPEC.md`. It holds:
  - the manifest schema and the SDK API;
  - the design rules: the panel's type and colour tokens, calm and premium, no timers or scores shouting, no dark patterns;
  - the performance budget: idle 0 rAF, under 2 ms per interaction frame;
  - accessibility rules;
  - measurable gates: `node tools/check-card.js <id>` validates the manifest, sandbox-safe APIs only, no external network except `card.feed`, bundle size under 300 KB excluding `data/`, and a headless wkshot in light and dark with no errors.
- `tools/new-card.sh <id> "<one line>"` scaffolds from the template, ready for Codex.

## 3. First cards

### 3a. Daily word game: `cards/word-of-the-day`
- **An original game. Not Wordle:** not its name, not its green/yellow tile look, not its answer list.
  - Mechanic: a hidden 5-letter word. The player has 6 guesses, and each guess gets per-letter feedback.
  - Make the identity ours: wallpap's own palette, and soft shapes or marks in place of coloured squares. Feedback must not rely on colour alone (colour-blind safe). Keep a gentle cadence.
- **Content:** our own curated answer list of common, inoffensive 5-letter English words. It must cover at least 2 years of days, with no repeats within a year, plus a valid-guess dictionary. Use a permissively licensed word source and record the source and licence in `data/LICENSE.md`.
- **Daily rule:** everyone gets the same word on the same local date (`card.today()` → index).
  - The streak and done state are stored via `card.save`.
  - A shareable result string is optional, uses no URLs, and is copied to the clipboard only on tap.

### 3b. Daily mini crossword: `cards/crossword-of-the-day`
- A **5×5 mini crossword** with original clues. Generate a year's worth offline with a fill generator over a licensed word list; the clues are written by Codex and then checked.
  - Checks: no duplicate answers in a grid, no obscure fill (frequency threshold), no offensive entries, every clue unambiguous.
  - Ship `data/YYYY.json` and record provenance in `data/LICENSE.md`.
- **Play:** click or arrow to select, type letters, tab to move between clues, check a square, word or puzzle, reveal (marks the puzzle as assisted), and a gentle completion moment.
- **Same daily rule** as the word game. Progress saves as you play.

### 3c. News: `cards/news`
- **Sources are only reliable outlets' own official feeds**, in `scenes/play/feeds.json`. For each feed, record: id, outlet, URL, terms URL, and the date its terms were checked.
- **Start with general world/top-stories feeds that are public and meant for syndication.** Candidates (verify each URL works and that its terms allow headline-plus-link display):
  - BBC News top stories RSS;
  - NPR News RSS;
  - The Guardian world RSS;
  - one wire service if it has an official public feed.
- Drop any feed that doesn't work or whose terms forbid this.
- **Show headline, outlet and relative time.** Optionally the feed's own short description, truncated. Never fetch or scrape article pages, and never rewrite or summarise headlines.
- **Clicking opens the article on the outlet's site** in the default browser.
- Tabs: "Top" (merged by time, de-duplicated by near-identical titles) and one tab per outlet.
- No personalisation, no reading history kept beyond "seen" dots stored locally.
- **No curation of our own:** order is by publication time only.

## 4. Ads (free tier)
- **Non-targeted only:** the ad is chosen from context (the card's category), never from the user, and never with a cookie, identifier or fingerprint.
- **v1:** implement the slot and a **house ad** source only. House ads promote wallpap Pro and other wallpap content, from `scenes/play/house-ads.json`.
  - Implement an adapter interface (`AdSource.pick(category) → {title, body, url, image}`) so a contextual network can be plugged in later. No third-party ad network ships until the owner picks one.
- **Placement:** one quiet, clearly-labelled "Sponsored" row at the bottom of news, and on the puzzle completion screen only. Never mid-puzzle, never animated, never sound.
- **Pro:** no slot at all.

## 5. Anonymous analytics
- **Events:** `play_open`, `card_open:<id>`, `puzzle_complete:<id>`, `news_click`. Only these, with no free-form props.
- **Client:**
  - Counts are kept in memory and batched once a day as `{day, appVersion, counts:{event:n}}`.
  - No user ID, install ID, IP storage or device fingerprint.
  - It sends nothing when the endpoint isn't configured, and there's an off switch in settings: "Share anonymous usage counts", default on, with a one-line explanation.
- **Server:** `tools/analytics-worker/`, a minimal Cloudflare Worker.
  - It accepts the batch, increments daily aggregate counters and drops the request IP.
  - It stores only aggregates, and has README deploy steps.
  - **Do not deploy.** The owner deploys. The endpoint URL lives in host config, empty by default.
- Write a short privacy note for the site (`site/privacy-play.md`) that states exactly this.

## 6. Verification (look before done)
- Headless wkshot of the Play shell in 3 scenes (cats, koi, train), light and dark, with each card open: home, mid-puzzle, completed, news list, offline news, and Pro without the ad slot. Keep them as small JPEG contact sheets in `shots/play/`. Delete raw PNGs, and stop if free disk is under 3 GB.
- Pets visibly avoid the panel area, and nothing renders under the widget side.
- `node --test tests/*.cjs` passes, with new tests for:
  - the daily index function;
  - word-game feedback, including repeated letters;
  - crossword check, reveal and completion;
  - feed parsing, de-duplication and cache/offline;
  - the ad slot hidden for Pro;
  - the analytics batch having no identifiers;
  - `check-card.js` gates.
- Host: build with `./build.sh` in this worktree only, and run the built app with `LIVEWALL_SCENES` pointed at this worktree's `scenes/` **only for automated checks that don't take over the owner's screen**. The owner's live wallpaper must not be touched. Otherwise leave host checks for the owner's test card.
