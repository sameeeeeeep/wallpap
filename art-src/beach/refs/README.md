# Beach gulls — sprite sourcing (2026-10-04)

Owner: "the sea gulls are all wrong". The Beach is a straight-down aerial view, so the gulls need a **top-down**
flap cycle, standing/walking poses and shadows. Searched for shippable (CC0 / public-domain, or CC-BY with credit)
sprite sheets before drawing anything. Nothing usable exists, so the sheet is built procedurally in
`addons/beach/gull-sheet.js` (a jointed wing model painted into a canvas at load); the items below were used only as
pose/motion references. **No third-party pixels ship.** No files were downloaded; no paid image generation was used.

| Reference | URL | Licence | Why not shipped / how used |
|---|---|---|---|
| "OH GULLY" seagull flight sprites (Spring Spring) | https://opengameart.org/content/oh-gully | CC0 | Side view, cartoon — wrong camera. Used for flap timing (downstroke/upstroke split, glide pose). |
| Animated Birds 32×32 (MoikMellah) | https://opengameart.org/content/animated-birds-32x32 | CC0 | Side-view pixel art, 5 frames — wrong camera/style. Frame-count reference only. |
| [LPC] Birds (bluecarrot16) | https://opengameart.org/content/lpc-birds | CC-BY-SA / GPL / OGA-BY | 4-direction 32 px pixel art, no gull; share-alike licences — not used. |
| Top-down birds game sprite pack (Game Developer Studio) | https://gamedeveloperstudio.itch.io/top-down-birds-game-sprite-pack | Paid (£5, standard licence) | Has a top-down seagull, but it is paid — out of scope (no spending). Not viewed beyond the listing. |
| 2D Pixel Art Seagull Sprites (Elthen) | https://elthen.itch.io/2d-pixel-art-seagull-sprites | Paid | Side view pixel art. Not used. |
| Seagull Animation Pixel Art (MakingGamesInc) | https://makinggamesinc.itch.io/seagull-pixel-art | Free, "don't resell as-is" (not CC) | Side view 32 px; licence not clearly redistributable in a sold app. Not used. |
| Plumage | — | — | Standard field-guide marks for an adult ring-billed / herring gull (pale grey mantle, white trailing edge, black primaries with white mirrors, yellow bill with red gonys spot). No photo was fetched or copied. |

Built sheet (see `gull-sheet-preview.html`, served from the repo root): `w0…w9` flap cycle, `wGlide`, `wFlare`,
`wFold1…3` (right wing; the left is mirrored at draw time so banking/asymmetry stays possible), `body`/`bodyFan`,
`stand lookL lookR crouch sleep walk0…walk5`.
