# Play aggregate counter — not deployed

The app endpoint in host/PlayAnalytics.swift is empty. No data is sent until the owner deploys and ships an endpoint. The client holds event counts in memory, attempts one batch when the local date changes, then discards them. Failed sends and app exits lose counts by design; there is no disk queue, retry token or installation ID. Opting out clears memory and cancels an in-flight task (an already received batch cannot be withdrawn).

Accepted JSON: `{day:"2026-10-04",appVersion:"0.12.1",counts:{play_open:2}}`. Seven enumerated event keys only; no arbitrary properties. Payload <=2 KB, valid date within eight days, bounded integer counts. The only table contains day, app version, event and summed count. D1 atomic upserts avoid read/write races. There is no user/request table, cookie, geolocation, IP header read, fingerprint, access log, analytics SDK, or request logging. No third-party ad network.

## Owner deployment steps (do not run during development)
1. Review Cloudflare account/zone privacy settings. Keep Workers observability, tail consumers, Logpush and request/access/security-event retention disabled for this route wherever configurable. Transport necessarily exposes a source IP to the edge provider; this worker does not read or store it. Do not claim the provider cannot process IPs. Confirm provider retention terms before enabling the endpoint.
2. Install the current Wrangler CLI. Create D1 with `wrangler d1 create wallpap-play-counts`; put its database id in wrangler.toml. This infrastructure id is not a visitor/install identifier and is never sent by the app.
3. Initialise with `wrangler d1 execute wallpap-play-counts --remote --file schema.sql`. Configure a first-party custom domain/route ending in /counts. Leave workers_dev=false.
4. Run local tests (`node --test tests/play*.cjs` from repo root), then owner runs `wrangler deploy`.
5. Send one synthetic batch, verify only summed rows in D1 and no request logging, then set PlayConfig.analyticsEndpoint to the first-party HTTPS URL and rebuild.

Do not add IP-based deduplication or rate-limit storage. With no identities, counts are approximate and cannot be deduplicated or used as unique-user metrics. A public endpoint can receive fabricated counts; caps limit each batch, not each person. Daily counter retention/deletion can be performed on aggregates only. No deployment or account mutations were performed for v1.

API references checked 2026-10-04: https://developers.cloudflare.com/d1/worker-api/prepared-statements/ and https://developers.cloudflare.com/workers/observability/logs/workers-logs/ .
