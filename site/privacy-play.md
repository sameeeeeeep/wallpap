# Privacy in Play

Play's puzzles work offline. Guesses, crossword progress, streaks and headline “seen” dots stay on this Mac in local storage. They are not synced or sent to wallpap. “Seen” dots retain at most 100 links locally.

Play offers “Share anonymous usage counts” in settings, on by default. It counts only Play openings, card openings, puzzle completions and news-link clicks. Counts stay in memory and, if a server endpoint has been configured, are sent in one daily batch containing the calendar day, app version and event totals. There are no user or installation IDs, cookies, fingerprints, article URLs, guesses, puzzle answers, location or free-form properties in that batch. Turning the setting off clears unsent counts and cancels a pending send. Closing the app discards unsent counts.

The v1 endpoint is unconfigured, so no analytics leave the app. If enabled in a future release, wallpap's worker stores only aggregate day/version/event totals. It does not read or store request IP addresses or keep request logs. The hosting provider necessarily handles network addresses to deliver requests; its infrastructure policies also apply. A received anonymous batch cannot be associated with a person or removed individually.

News uses only approved publisher RSS/Atom feeds, fetched without cookies or credentials and cached locally for 15 minutes. It never fetches article pages. Publishers receive ordinary network connection information when a feed is requested. No sources are currently enabled pending syndication permission. Clicking a headline opens its publisher in your normal browser, where that site's privacy policy applies.

Free Play shows labelled, static house promotions selected only by the card category. No third-party ad network, ad tracking or profiling is included. Pro renders no ad slot. Clicking a house promotion opens wallpap's website in your normal browser.
