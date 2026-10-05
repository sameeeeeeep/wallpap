// Anonymous aggregate counters, memory only. No retry, identity, per-event record or disk queue.
import Foundation

enum PlayConfig {
    // tools/analytics-worker, deployed 2026-10-06 on Cloudflare (D1 wallpap-play-counts).
    static let analyticsEndpoint = "https://wallpap.live/counts"
}
struct PlayAnalyticsBatch: Codable { let day: String; let appVersion: String; let counts: [String: Int] }
final class PlayAnalytics {
    static let allowed: Set<String> = ["play_open", "card_open:word-of-the-day", "card_open:crossword-of-the-day", "card_open:news", "puzzle_complete:word-of-the-day", "puzzle_complete:crossword-of-the-day", "news_click",
        // App usage (2026-10-06): one "active" per Mac per day, the panel, features turned on.
        "active", "panel_open", "breathe_start", "music_on", "soundscape_on", "water_reminder_on", "breathe_reminder_on", "scene_action"]
    /// World picks are counted per world id ("scene:koi"); ids are short slugs, never free text.
    static func isAllowed(_ e: String) -> Bool { allowed.contains(e) || e.range(of: "^scene:[a-z0-9-]{1,32}$", options: .regularExpression) != nil }
    private(set) var counts: [String: Int] = [:]
    private(set) var day: String
    var enabled = true { didSet { if !enabled { counts.removeAll() } } }
    let version: String
    let endpoint: String
    private var batchedDays = Set<String>()
    private var timer: Timer?
    private var task: URLSessionDataTask?
    private let redirect = PlayNoRedirect()
    private lazy var session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.httpCookieStorage = nil; c.httpShouldSetCookies = false; c.urlCredentialStorage = nil; c.urlCache = nil
        c.timeoutIntervalForRequest = 10; c.timeoutIntervalForResource = 10
        return URLSession(configuration: c, delegate: redirect, delegateQueue: nil)
    }()
    init(version: String, endpoint: String = PlayConfig.analyticsEndpoint, now: Date = Date()) {
        self.version = version; self.endpoint = endpoint; day = Self.localDay(now)
        counts["active"] = 1
    }
    static func localDay(_ date: Date) -> String {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = .current; f.dateFormat = "yyyy-MM-dd"; return f.string(from: date)
    }
    func start() {
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in self?.tick() }
    }
    func record(_ event: String, now: Date = Date()) {
        tick(now: now)
        guard enabled, Self.isAllowed(event), counts.count < 48 || counts[event] != nil else { return }
        counts[event] = min(9999, (counts[event] ?? 0) + 1)
    }
    // Called only at a local-day boundary; at most one attempt for that day's batch.
    func rotate(now: Date) -> PlayAnalyticsBatch? {
        let next = Self.localDay(now); guard next != day else { return nil }
        let batch = enabled && !counts.isEmpty && !batchedDays.contains(day) ? PlayAnalyticsBatch(day: day, appVersion: version, counts: counts) : nil
        if batch != nil { batchedDays.insert(day) }
        day = next; counts.removeAll(); if enabled { counts["active"] = 1 }   // still running on the new day
        return batch
    }
    func tick(now: Date = Date()) {
        guard let batch = rotate(now: now), enabled, !endpoint.isEmpty,
              let url = URL(string: endpoint), url.scheme == "https", url.user == nil, url.password == nil,
              let body = try? JSONEncoder().encode(batch) else { return }
        var request = URLRequest(url: url); request.httpMethod = "POST"; request.httpBody = body
        request.httpShouldHandleCookies = false; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        task = session.dataTask(with: request) { _, _, _ in /* No per-request logs or retry identifiers. */ }; task?.resume()
    }
    func disable() { enabled = false; task?.cancel(); task = nil }
}
