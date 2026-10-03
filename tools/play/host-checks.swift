import Foundation
@main struct PlayChecks {
 static func main() throws {
    let f = PlayFeed(id: "fixture", outlet: "Fixture News", url: "https://example.test/rss", termsURL: "https://example.test/terms", termsChecked: "2026-10-04", linkHosts: ["example.test"])
    let rss = "<rss><channel><item><title><![CDATA[A & B]]></title><link>https://example.test/story</link><pubDate>Sun, 04 Oct 2026 08:00:00 GMT</pubDate></item><item><title>Unsafe</title><link>file:///private/test</link><pubDate>Sun, 04 Oct 2026 08:00:00 GMT</pubDate></item></channel></rss>"
    let parsed = try PlayFeedParser.parse(Data(rss.utf8), feed: f)
    precondition(parsed.count == 1 && parsed[0].title == "A & B")
    let atom = "<feed xmlns='http://www.w3.org/2005/Atom'><entry><title>Atom headline</title><link rel='alternate' href='https://example.test/atom'/><published>2026-10-04T09:00:00Z</published></entry></feed>"
    let atomItems = try PlayFeedParser.parse(Data(atom.utf8), feed: f); precondition(atomItems.count == 1)
    for bad in ["file:///tmp/x", "javascript:alert(1)", "https://example.test.evil.test/a", "https://user@example.test/a", "http://example.test/a", "https://example.test:123/a"] { precondition(!PlayFeedParser.safeLink(bad, hosts: f.linkHosts)) }
    do { _ = try PlayFeedParser.parse(Data("<!DOCTYPE rss [<!ENTITY x SYSTEM 'file:///tmp/x'>]><rss/>".utf8), feed: f); fatalError("Accepted entity") } catch {}
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent("wallpap-play-checks-\(ProcessInfo.processInfo.processIdentifier)")
    defer { try? FileManager.default.removeItem(at: directory) }
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let now = Date(), result = PlayFeedResult(items: parsed, updated: ISO8601DateFormatter().string(from: now), offline: false)
    precondition(PlayFeedStore.fresh(result, now: now.addingTimeInterval(899)))
    precondition(!PlayFeedStore.fresh(result, now: now.addingTimeInterval(901)))
    let store = PlayFeedStore(feeds: [f], directory: directory)
    try JSONEncoder().encode(result).write(to: directory.appendingPathComponent("fixture.json"))
    precondition(store.cached("fixture")?.items.count == 1); precondition(store.cached("../../x") == nil)
    // Force a transport failure against loopback with stale cached data; never contact an outlet.
    let offlineFeed = PlayFeed(id: "fixture", outlet: "Fixture News", url: "https://127.0.0.1/rss", termsURL: f.termsURL, termsChecked: f.termsChecked, linkHosts: f.linkHosts)
    let stale = PlayFeedResult(items: parsed, updated: ISO8601DateFormatter().string(from: now.addingTimeInterval(-1000)), offline: false)
    try JSONEncoder().encode(stale).write(to: directory.appendingPathComponent("fixture.json"))
    let offlineStore = PlayFeedStore(feeds: [offlineFeed], directory: directory)
    var offline: PlayFeedResult?
    offlineStore.fetch("fixture") { offline = $0 }
    let deadline = Date().addingTimeInterval(18)
    while offline == nil && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.05)) }
    precondition(offline?.offline == true && offline?.items.count == 1 && offline?.updated == stale.updated)
    let analytics = PlayAnalytics(version: "0.12.1", now: now)
    analytics.record("play_open", now: now); analytics.record("arbitrary", now: now)
    precondition(analytics.counts == ["play_open": 1]);precondition(analytics.rotate(now: now) == nil)
    let next = Calendar.current.date(byAdding: .day, value: 1, to: now)!
    let batch = analytics.rotate(now: next)!
    let object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(batch)) as! [String: Any]
    precondition(Set(object.keys) == Set(["day", "appVersion", "counts"]))
    precondition(analytics.rotate(now: next) == nil && analytics.counts.isEmpty)
    analytics.record("news_click", now: next); analytics.disable(); precondition(analytics.counts.isEmpty)
    analytics.record("play_open", now: next);precondition(analytics.counts.isEmpty && analytics.endpoint.isEmpty)
    let clockChange = PlayAnalytics(version: "0.12.1", now: now)
    clockChange.record("play_open", now: now); precondition(clockChange.rotate(now: next) != nil)
    clockChange.record("play_open", now: now); precondition(clockChange.rotate(now: next) == nil)
    print("Play host checks: RSS, Atom, link allow-list, XML entities, disk cache/TTL, anonymous batch, rollover and opt-out PASS")
 }
}
