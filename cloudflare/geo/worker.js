// wallpap.live/geo — the visitor's approximate city and coordinates from Cloudflare's own IP
// geolocation (request.cf), so the landing page can show their time, place and weather on the hero
// desktop without sending anyone's IP to a third-party lookup. Nothing is stored or logged.
export default {
  fetch(request) {
    const cf = request.cf || {};
    const body = { city: cf.city || null, region: cf.region || null, country: cf.country || null, lat: cf.latitude || null, lon: cf.longitude || null, tz: cf.timezone || null };
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
  },
};
