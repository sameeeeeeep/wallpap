// Official-feed-only transport and disk cache. No article fetching, cookies or credentials.
import Foundation

struct PlayFeed: Codable { let id: String; let outlet: String; let url: String; let termsURL: String; let termsChecked: String; let linkHosts: [String] }
struct PlayHeadline: Codable { let title: String; let link: String; let source: String; let published: String }
struct PlayFeedResult: Codable { var items: [PlayHeadline]; var updated: String?; var offline: Bool; var error: String? }

final class PlayFeedParser: NSObject, XMLParserDelegate {
    let feed: PlayFeed
    var items: [PlayHeadline] = []
    private var entry: [String: String]?
    private var stack: [String] = []
    private var text = ""
    init(_ feed: PlayFeed) { self.feed = feed }
    static func safeLink(_ value: String, hosts: [String]) -> Bool {
        guard let u = URLComponents(string: value), u.scheme == "https", u.user == nil, u.password == nil,
              u.port == nil || u.port == 443, value.count <= 2048, let h = u.host?.lowercased() else { return false }
        return hosts.contains(h)
    }
    static func parse(_ data: Data, feed: PlayFeed) throws -> [PlayHeadline] {
        guard data.count <= 2_000_000, let raw = String(data: data, encoding: .utf8),
              !raw.uppercased().contains("<!DOCTYPE"), !raw.uppercased().contains("<!ENTITY") else { throw NSError(domain: "Invalid feed", code: 1) }
        let delegate = PlayFeedParser(feed), parser = XMLParser(data: data)
        parser.shouldResolveExternalEntities = false; parser.delegate = delegate
        guard parser.parse() else { throw parser.parserError ?? NSError(domain: "Invalid XML", code: 1) }
        return delegate.items
    }
    func parser(_ parser: XMLParser, didStartElement element: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String]) {
        let e = element.lowercased(); stack.append(e); text = ""
        if e == "item" || e == "entry" { entry = [:] }
        if e == "link", entry != nil, let href = attributes["href"], attributes["rel"] == nil || attributes["rel"] == "alternate" { entry?["link"] = href }
    }
    func parser(_ parser: XMLParser, foundCharacters string: String) { if text.count < 10000 { text += string } }
    func parser(_ parser: XMLParser, foundCDATA data: Data) { if let s = String(data: data, encoding: .utf8) { self.parser(parser, foundCharacters: s) } }
    func parser(_ parser: XMLParser, didEndElement element: String, namespaceURI: String?, qualifiedName: String?) {
        let e = element.lowercased(), value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if entry != nil && ["title", "link", "pubdate", "published", "updated", "dc:date"].contains(e), !value.isEmpty { entry?[e] = value }
        if e == "item" || e == "entry" {
            if let a = entry, let title = a["title"], !title.isEmpty, title.count <= 600, !title.contains("<"),
               let link = a["link"], Self.safeLink(link, hosts: feed.linkHosts),
               let date = Self.date(a["published"] ?? a["pubdate"] ?? a["updated"] ?? a["dc:date"] ?? ""), items.count < 100 {
                items.append(PlayHeadline(title: title, link: link, source: feed.outlet, published: ISO8601DateFormatter().string(from: date)))
            }
            entry = nil
        }
        if !stack.isEmpty { stack.removeLast() }; text = ""
    }
    static func date(_ s: String) -> Date? {
        let iso = ISO8601DateFormatter(); if let d = iso.date(from: s) { return d }
        iso.formatOptions.insert(.withFractionalSeconds); if let d = iso.date(from: s) { return d }
        for format in ["EEE, dd MMM yyyy HH:mm:ss Z", "EEE, d MMM yyyy HH:mm:ss zzz", "yyyy-MM-dd'T'HH:mm:ssZ"] {
            let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = format
            if let d = f.date(from: s) { return d }
        }
        return nil
    }
}

// Redirects are rejected: an allow-listed URL cannot become an arbitrary request.
final class PlayNoRedirect: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
final class PlayFeedStore {
    let feeds: [PlayFeed]; let directory: URL
    private let delegate = PlayNoRedirect()
    private lazy var session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.httpCookieStorage = nil; c.httpShouldSetCookies = false; c.urlCredentialStorage = nil; c.urlCache = nil
        c.timeoutIntervalForRequest = 12; c.timeoutIntervalForResource = 15
        return URLSession(configuration: c, delegate: delegate, delegateQueue: nil)
    }()
    init(feeds: [PlayFeed], directory: URL) { self.feeds = feeds; self.directory = directory }
    func cached(_ id: String) -> PlayFeedResult? {
        guard let feed = feeds.first(where: { $0.id == id }),
              let data = try? Data(contentsOf: directory.appendingPathComponent(id + ".json")), data.count < 500_000,
              var result = try? JSONDecoder().decode(PlayFeedResult.self, from: data) else { return nil }
        result.items = Array(result.items.filter { PlayFeedParser.safeLink($0.link, hosts: feed.linkHosts) && PlayFeedParser.date($0.published) != nil && $0.title.count <= 600 && $0.source == feed.outlet }.prefix(100))
        return result
    }
    static func fresh(_ result: PlayFeedResult, now: Date = Date()) -> Bool {
        guard let updated = result.updated.flatMap(PlayFeedParser.date) else { return false }
        return now.timeIntervalSince(updated) >= 0 && now.timeIntervalSince(updated) < 900
    }
    func fetch(_ id: String, done: @escaping (PlayFeedResult) -> Void) {
        guard let feed = feeds.first(where: { $0.id == id }), let url = URL(string: feed.url),
              PlayFeedParser.safeLink(feed.url, hosts: [url.host ?? ""]) else {
            done(PlayFeedResult(items: [], offline: true, error: "Feed not permitted")); return
        }
        let old = cached(id)
        if let old, Self.fresh(old) { done(PlayFeedResult(items: old.items, updated: old.updated, offline: false)); return }
        var request = URLRequest(url: url); request.httpShouldHandleCookies = false; request.setValue("application/rss+xml, application/atom+xml, application/xml", forHTTPHeaderField: "Accept")
        session.dataTask(with: request) { data, response, error in
            var result: PlayFeedResult
            if error == nil, let http = response as? HTTPURLResponse, http.statusCode == 200,
               let data, let items = try? PlayFeedParser.parse(data, feed: feed), !items.isEmpty {
                result = PlayFeedResult(items: items, updated: ISO8601DateFormatter().string(from: Date()), offline: false)
                if let encoded = try? JSONEncoder().encode(result) {
                    try? FileManager.default.createDirectory(at: self.directory, withIntermediateDirectories: true)
                    try? encoded.write(to: self.directory.appendingPathComponent(id + ".json"), options: .atomic)
                }
            } else { result = PlayFeedResult(items: old?.items ?? [], updated: old?.updated, offline: true, error: "Feed unavailable") }
            DispatchQueue.main.async { done(result) }
        }.resume()
    }
}
