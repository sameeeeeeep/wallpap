import AppKit
import WebKit

final class PlayHost {
    unowned let app: App
    weak var window: WallWindow?
    var priorApp: NSRunningApplication?
    var menuPriorApp: NSRunningApplication?
    var menuPriorEngaged: Bool?
    private var savedLevel: NSWindow.Level = .normal
    private var savedBehavior: NSWindow.CollectionBehavior = []
    private var savedIgnore = true
    private var savedEngaged = true
    private var closing = false
    private var links = Set<String>()
    private var keyMonitor: Any?
    private var outsideMonitor: Any?
    lazy var feedStore: PlayFeedStore = {
        let data = try? Data(contentsOf: app.scenesDir.appendingPathComponent("play/feeds.json"))
        let feeds = data.flatMap { try? JSONDecoder().decode([PlayFeed].self, from: $0) } ?? []
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return PlayFeedStore(feeds: feeds, directory: support.appendingPathComponent("wallpap/Play/feeds"))
    }()
    init(app: App) { self.app = app }
    var isOpen: Bool { window != nil }
    // Public APIs do not expose the active Space's type. Conservatively disable when a
    // foreign layer-zero window covers the entire display (also some borderless games).
    var unavailableReason: String? {
        if isOpen { return nil }
        guard let screen = NSScreen.screens.first(where: { $0.frame.contains(NSEvent.mouseLocation) }),
              let primary = NSScreen.screens.first,
              let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return nil }
        let bounds = CGRect(x: screen.frame.minX, y: primary.frame.maxY - screen.frame.maxY, width: screen.frame.width, height: screen.frame.height)
        for item in info {
            guard (item[kCGWindowLayer as String] as? Int) == 0,
                  (item[kCGWindowOwnerPID as String] as? Int32) != ProcessInfo.processInfo.processIdentifier,
                  (item[kCGWindowAlpha as String] as? Double ?? 1) > 0,
                  let rect = item[kCGWindowBounds as String] as? [String: Any],
                  let r = CGRect(dictionaryRepresentation: rect as CFDictionary) else { continue }
            if r.insetBy(dx: -1, dy: -1).contains(bounds) { return "Leave the full-screen app to open Play on this desktop." }
        }
        return nil
    }
    func rememberMenuContext() {
        guard !isOpen else { return }
        if let front = NSWorkspace.shared.frontmostApplication, front.processIdentifier != ProcessInfo.processInfo.processIdentifier { menuPriorApp = front; menuPriorEngaged = app.engaged }
    }
    func toggle() {
        if isOpen { close(); return }
        guard unavailableReason == nil, let w = app.target(for: NSEvent.mouseLocation) else { return }
        savedEngaged = menuPriorEngaged ?? app.engaged
        priorApp = menuPriorApp ?? NSWorkspace.shared.frontmostApplication
        menuPriorApp = nil; menuPriorEngaged = nil
        app.panelHostIfLoaded?.popover.performClose(nil)
        window = w; savedLevel = w.level; savedBehavior = w.collectionBehavior; savedIgnore = w.ignoresMouseEvents
        w.playPresented = true; w.level = .floating
        w.collectionBehavior = [.canJoinAllSpaces, .transient, .fullScreenAuxiliary]
        w.ignoresMouseEvents = false
        w.js("__lw('focus',true)")
        NSApp.activate(ignoringOtherApps: true); w.makeKeyAndOrderFront(nil); w.makeFirstResponder(w.web)
        if !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
            w.alphaValue = 0
            NSAnimationContext.runAnimationGroup { c in c.duration = 0.3; w.animator().alphaValue = 1 }
        }
        let payload: [String: Any] = ["open": true, "pro": app.isPro, "display": w.screenID, "reduceMotion": NSWorkspace.shared.accessibilityDisplayShouldReduceMotion]
        emit("play", payload, to: w.web)
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 53 { self?.close(); return nil }; return event
        }
        outsideMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in self?.close(restoreFocus: false) }
        app.recordPlayEvent("play_open")
        app.rebuildMenu()
    }
    func close(restoreFocus: Bool = true, immediate: Bool = false) {
        guard let w = window, !closing else { return }; closing = true
        if let m = keyMonitor { NSEvent.removeMonitor(m); keyMonitor = nil }
        if let m = outsideMonitor { NSEvent.removeMonitor(m); outsideMonitor = nil }
        emit("play", ["open": false], to: w.web)
        let finish = { [self] in
            w.level = savedLevel; w.collectionBehavior = savedBehavior; w.ignoresMouseEvents = savedIgnore; w.playPresented = false; w.alphaValue = 1
            w.resignKey(); window = nil; closing = false; links.removeAll()
            app.engaged = !savedEngaged; app.setEngaged(savedEngaged)
            // The page closes its fade after 260ms; this comes after it.
            w.js("__lw('focus',\(savedEngaged && !app.userPaused));")
            if restoreFocus, let priorApp, priorApp.processIdentifier != ProcessInfo.processInfo.processIdentifier { priorApp.activate(options: []) }
            priorApp = nil; app.rebuildMenu()
        }
        if immediate { finish() } else { DispatchQueue.main.asyncAfter(deadline: .now() + 0.32, execute: finish) }
    }
    func emit(_ event: String, _ value: [String: Any], to web: WKWebView) {
        guard let data = try? JSONSerialization.data(withJSONObject: value), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("__lw('\(event)',\(json))", completionHandler: nil)
    }
    func handle(_ message: WKScriptMessage, body: [String: Any]) {
        guard message.frameInfo.isMainFrame, let w = window, message.webView === w.web,
              let op = body["op"] as? String else { return }
        let id = body["id"] as? Int ?? 0
        func reply(_ value: Any = NSNull(), error: String? = nil) {
            guard self.window === w else { return }
            var object: [String: Any] = ["id": id, "value": value]; if let error { object["error"] = error }
            emit("playReply", object, to: w.web)
        }
        switch op {
        case "close": reply(); close()
        case "fetchFeed":
            guard let feed = body["feed"] as? String, feedStore.feeds.contains(where: { $0.id == feed }) else { reply(error: "Feed not permitted"); return }
            feedStore.fetch(feed) { [weak self, weak w] result in
                guard let self, let w, self.window === w else { return }
                result.items.forEach { self.links.insert($0.link) }
                guard let data = try? JSONEncoder().encode(result), let value = try? JSONSerialization.jsonObject(with: data) else { reply(error: "Feed unavailable"); return }
                reply(value)
            }
        case "openLink":
            guard let link = body["url"] as? String, links.contains(link), let url = URL(string: link), url.scheme == "https" else { reply(error: "Link not permitted"); return }
            reply(); close(restoreFocus: false); NSWorkspace.shared.open(url); app.recordPlayEvent("news_click")
        case "analytics":
            guard let event = body["event"] as? String else { return }; app.recordPlayEvent(event); reply()
        case "houseAd":
            guard !app.isPro, let category = body["category"] as? String, ["News", "Puzzles"].contains(category) else { reply(error: "Ad not permitted"); return }
            // A separate, fixed first-party action; never widens the feed-link capability.
            let data = try? Data(contentsOf: app.scenesDir.appendingPathComponent("play/house-ads.json"))
            let ads = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [[String: String]] } ?? []
            guard let ad = ads.first(where: { $0["category"] == category }), let link = ad["url"],
                  ["https://wallpap.live/#pro", "https://wallpap.live/#scenes"].contains(link), let url = URL(string: link) else { reply(error: "Ad unavailable"); return }
            reply(); close(restoreFocus: false); NSWorkspace.shared.open(url)
        default: reply(error: "Capability not permitted")
        }
    }
}

extension App {
    @objc func togglePlay() { playHost.toggle() }
    var sharePlayCounts: Bool { defaults.object(forKey: "sharePlayCounts") as? Bool ?? true }
    @objc func togglePlayCounts() {
        defaults.set(!sharePlayCounts, forKey: "sharePlayCounts")
        if sharePlayCounts { playAnalytics.enabled = true } else { playAnalytics.disable() }
        rebuildMenu()
    }
    func recordPlayEvent(_ event: String) { playAnalytics.record(event) }
}
