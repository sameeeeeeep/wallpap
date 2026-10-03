# Play feed review — 2026-10-04

No candidate is enabled in feeds.json. This is an intentional permissions state, not a network failure. Free Play includes house advertising, and wallpap sells Pro; a personal/noncommercial RSS licence is insufficient. Owner: obtain explicit commercial headline-plus-link permission, then record the approval, exact feed URL, outlet, termsURL, termsChecked, and exact allowed article hostnames before adding a source. Rebuild config.js, news/data/feeds.json and the news manifest from that allow-list with `node tools/pack-cards.js`.

| Candidate | URL check | Terms/source checked | Decision |
|---|---|---|---|
| BBC top stories | https://feeds.bbci.co.uk/news/rss.xml — HTTP 200, RSS, 26 items | https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf §15; current https://www.bbc.co.uk/usingthebbc/terms/ blocked in research browser | Business RSS use requires permission and may involve a fee; excluded pending permission and current terms confirmation. |
| NPR News | https://feeds.npr.org/1001/rss.xml — HTTP 200, RSS, 10 items | https://www.npr.org/about-npr/179876898/terms-of-use — retrieved directly 2026-10-04 | Commercial reuse requires consent; feed-use exception is for personal/noncommercial use and qualifying nonprofits. Excluded. |
| Guardian World | https://www.theguardian.com/world/rss — HTTP 200, RSS, 45 items | https://www.theguardian.com/help/feeds and https://www.theguardian.com/help/terms-of-service | Noncommercial use only without permission. Excluded. |
| Reuters | https://www.reutersagency.com/feed/?best-topics=world&post_type=best — HTTP 404 | https://liaison.thomsonreuters.com/page/rss-feeds-tech-notes | Official syndication uses authenticated client RSS. No working public general-news feed verified. Excluded. |
| AP wire alternative | No public feed added | https://api.ap.org/media/v/swagger/ — RSS access depends on API key and plan | Not a public syndication feed. Excluded. |

Machine-readable URL results: tools/play/sources/feed-checks.json. No article pages were fetched. No copied headlines are bundled; visual QA uses original, explicitly labelled test fixtures under tools/play only. An empty allow-list renders an honest permission-pending message and keeps puzzles working offline.
