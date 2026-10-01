// wallpap — puts an interactive web scene behind your desktop icons.
//
// One borderless WKWebView window per display, pinned at desktop level on
// every Space. Those windows ignore the mouse (so Finder keeps the desktop),
// and a global event monitor forwards cursor + clicks into the page — clicks
// only when they land on bare desktop, never through another app's window.

import AppKit
import WebKit
import ServiceManagement
import CoreLocation
import IOKit.ps
import CoreServices

struct Scene { let id: String; let title: String; let key: String; var pro = false }

let scenes: [Scene] = [
    Scene(id: "koi", title: "Koi Pond", key: "1"),
    Scene(id: "bowls", title: "Singing Bowls", key: "2", pro: true),
    Scene(id: "cats", title: "Cats", key: "3"),
    Scene(id: "grass", title: "Touch Grass", key: "4"),
    Scene(id: "cafe", title: "Night Café", key: "5", pro: true),
]

final class WallWindow: NSWindow {
    private(set) var web: WKWebView
    let screenID: CGDirectDisplayID
    private weak var handler: WKScriptMessageHandler?

    static func makeWebView(size: NSSize, handler: WKScriptMessageHandler) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.suppressesIncrementalRendering = true
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(handler, name: "lw")
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        let web = WKWebView(frame: NSRect(origin: .zero, size: size), configuration: config)
        web.autoresizingMask = [.width, .height]
        if #available(macOS 13.3, *) { web.isInspectable = true }
        web.setValue(false, forKey: "drawsBackground")
        return web
    }

    init(screen: NSScreen, handler: WKScriptMessageHandler) {
        screenID = screen.displayID
        self.handler = handler
        web = WallWindow.makeWebView(size: screen.frame.size, handler: handler)

        super.init(contentRect: screen.frame, styleMask: [.borderless], backing: .buffered, defer: false)
        // Modern macOS draws the wallpaper with Dock-owned windows a few levels
        // above kCGDesktopWindowLevel; sit just above those, still well below
        // the desktop-icon level (and every normal window).
        level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopWindow)) + 10)
        collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenNone]
        ignoresMouseEvents = true
        isOpaque = true
        backgroundColor = .black
        hasShadow = false
        isReleasedWhenClosed = false
        animationBehavior = .none
        contentView = web
        setFrame(screen.frame, display: true)
    }

    /// Each scene gets a brand-new web view, so nothing (audio tails, timers,
    /// WebGL contexts) can leak from the previous scene.
    func freshWebView() {
        guard let handler else { return }
        let old = web
        old.evaluateJavaScript("try{LW._ctx&&LW._ctx.close()}catch(e){}", completionHandler: nil)
        old.configuration.userContentController.removeScriptMessageHandler(forName: "lw")
        old.stopLoading()
        old.loadHTMLString("", baseURL: nil)
        web = WallWindow.makeWebView(size: frame.size, handler: handler)
        contentView = web
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { _ = old }   // let the old page finish tearing down
    }

    func js(_ s: String) { web.evaluateJavaScript(s, completionHandler: nil) }

    /// Pause: swap the live page for a still of its last frame and tear the page
    /// down entirely — zero CPU/GPU until resumed.
    private(set) var frozen = false
    func freeze() {
        guard !frozen else { return }
        frozen = true
        web.takeSnapshot(with: nil) { [weak self] img, _ in
            guard let self else { return }
            let iv = NSImageView(frame: NSRect(origin: .zero, size: self.frame.size))
            iv.image = img
            iv.imageScaling = .scaleAxesIndependently
            iv.autoresizingMask = [.width, .height]
            self.contentView = iv
            self.freshWebView()
            self.contentView = iv
        }
    }
    func unfreeze() {
        guard frozen else { return }
        frozen = false
        contentView = web
    }
}

extension NSScreen {
    var displayID: CGDirectDisplayID {
        (deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value ?? 0
    }
}

final class App: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, NSMenuDelegate, CLLocationManagerDelegate {
    var windows: [WallWindow] = []
    var status: NSStatusItem!
    var monitors: [Any] = []
    let defaults = UserDefaults.standard

    // MARK: Pro
    // Free: Koi, Cats, Touch Grass + all interactions + manual weather.
    // Pro ($9 one-time): every scene, reminders, Calm, live weather, soundscapes,
    // Music Mode, AI companions, future scenes. Licensing TBD — for now a flag.
    var isPro: Bool { defaults.bool(forKey: "pro") || ProcessInfo.processInfo.environment["WALLPAP_PRO"] == "1" }
    @objc func openPro() { NSWorkspace.shared.open(URL(string: "https://wallpap.live/#pro")!) }
    func lock(_ item: NSMenuItem) {
        guard !isPro else { return }
        item.title += "  ·  Pro"
        item.action = #selector(openPro); item.target = self
        item.submenu = nil; item.state = .off; item.keyEquivalent = ""
    }

    var sceneID: String {
        get { defaults.string(forKey: "scene") ?? "koi" }
        set { defaults.set(newValue, forKey: "scene") }
    }
    var muted: Bool {
        get { defaults.bool(forKey: "muted") }
        set { defaults.set(newValue, forKey: "muted") }
    }

    // Energy: render only while the desktop is actually in use.
    var pauseWhenIdle: Bool {
        get { defaults.object(forKey: "pauseWhenIdle") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "pauseWhenIdle") }
    }
    var fps: Int {
        get { let v = defaults.integer(forKey: "fps"); return v == 0 ? 30 : v }
        set { defaults.set(newValue, forKey: "fps") }
    }
    var lastDesktopActivity = CACurrentMediaTime()
    var engaged = true
    let idleSeconds = 20.0

    func checkEngagement() {
        let now = CACurrentMediaTime()
        let want = !pauseWhenIdle || cursorOnDesktop || now - lastDesktopActivity < idleSeconds
        if want != engaged { engaged = want; windows.forEach { $0.js("__lw('focus',\(want))") } }
    }
    func touchDesktop() {
        lastDesktopActivity = CACurrentMediaTime()
        if !engaged { checkEngagement() }
    }

    // MARK: soundscape (global background noise, independent of scene sounds)
    var soundscape: String {
        get { defaults.string(forKey: "soundscape") ?? "off" }
        set { defaults.set(newValue, forKey: "soundscape") }
    }
    var soundscapeVolume: Double {
        get { defaults.object(forKey: "soundscapeVolume") as? Double ?? 0.35 }
        set { defaults.set(newValue, forKey: "soundscapeVolume") }
    }
    func pushSoundscape() {
        let kind = isPro ? soundscape : "off"
        windows.forEach { $0.js("__lw('ambient',{kind:'\(kind)',volume:\(soundscapeVolume)})") }
    }

    // MARK: music mode (opt-in: asks for Automation permission only when enabled)
    var musicMode: Bool {
        get { defaults.bool(forKey: "musicMode") }
        set { defaults.set(newValue, forKey: "musicMode") }
    }
    var musicTimer: Timer?
    var lastTrackKey = ""
    var lastNowPlayingJSON = "null"
    var artworkCache: [String: String] = [:]

    func startMusicMode() {
        musicTimer?.invalidate()
        guard musicMode, isPro else { lastNowPlayingJSON = "null"; windows.forEach { $0.js("__lw('nowplaying',null)") }; return }
        pollNowPlaying()
        musicTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in self?.pollNowPlaying() }
    }

    func isRunning(_ bundleID: String) -> Bool {
        NSWorkspace.shared.runningApplications.contains { $0.bundleIdentifier == bundleID }
    }

    @discardableResult
    func runScript(_ src: String) -> NSAppleEventDescriptor? {
        var err: NSDictionary?
        let r = NSAppleScript(source: src)?.executeAndReturnError(&err)
        return err == nil ? r : nil
    }

    /// Only ever talks to an app that's already running (never launches Music/Spotify).
    func pollNowPlaying() {
        var info: (title: String, artist: String, album: String, playing: Bool, app: String)?
        if isRunning("com.spotify.client"),
           let r = runScript("tell application \"Spotify\" to if player state is not stopped then return {name of current track, artist of current track, album of current track, (player state as string)}"),
           r.numberOfItems == 4 {
            info = (r.atIndex(1)?.stringValue ?? "", r.atIndex(2)?.stringValue ?? "", r.atIndex(3)?.stringValue ?? "", r.atIndex(4)?.stringValue == "playing", "Spotify")
        }
        if (info == nil || info?.playing == false), isRunning("com.apple.Music"),
           let r = runScript("tell application \"Music\" to if player state is not stopped then return {name of current track, artist of current track, album of current track, (player state as string)}"),
           r.numberOfItems == 4 {
            let m = (r.atIndex(1)?.stringValue ?? "", r.atIndex(2)?.stringValue ?? "", r.atIndex(3)?.stringValue ?? "", r.atIndex(4)?.stringValue == "playing", "Music")
            if info == nil || m.3 { info = m }
        }
        guard let np = info, !np.title.isEmpty else {
            if lastNowPlayingJSON != "null" { lastNowPlayingJSON = "null"; windows.forEach { $0.js("__lw('nowplaying',null)") } }
            return
        }
        let key = "\(np.app)|\(np.title)|\(np.artist)|\(np.album)"
        if key != lastTrackKey { lastTrackKey = key; fetchArtwork(app: np.app, key: key) }
        let payload: [String: Any] = ["title": np.title, "artist": np.artist, "album": np.album, "playing": np.playing,
                                      "app": np.app, "artwork": artworkCache[key] ?? ""]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8), json != lastNowPlayingJSON else { return }
        lastNowPlayingJSON = json
        windows.forEach { $0.js("__lw('nowplaying',\(json))") }
    }

    /// Artwork → small JPEG data URL, so scenes can sample its colors without CORS issues.
    func fetchArtwork(app: String, key: String) {
        guard artworkCache[key] == nil else { return }
        func store(_ img: NSImage?) {
            guard let img, let url = Self.dataURL(img) else { return }
            artworkCache[key] = url
            if artworkCache.count > 20 { artworkCache.removeAll(); artworkCache[key] = url }
            lastNowPlayingJSON = ""   // force a push with the artwork
            pollNowPlaying()
        }
        if app == "Music" {
            if let d = runScript("tell application \"Music\" to get data of artwork 1 of current track")?.data { store(NSImage(data: d)) }
        } else if let s = runScript("tell application \"Spotify\" to get artwork url of current track")?.stringValue, let u = URL(string: s) {
            URLSession.shared.dataTask(with: u) { d, _, _ in
                DispatchQueue.main.async { store(d.flatMap { NSImage(data: $0) }) }
            }.resume()
        }
    }

    static func dataURL(_ img: NSImage, size: CGFloat = 320) -> String? {
        let out = NSImage(size: NSSize(width: size, height: size))
        out.lockFocus()
        img.draw(in: NSRect(x: 0, y: 0, width: size, height: size), from: .zero, operation: .copy, fraction: 1)
        out.unlockFocus()
        guard let tiff = out.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
              let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85]) else { return nil }
        return "data:image/jpeg;base64," + jpg.base64EncodedString()
    }

    func mediaCommand(_ cmd: String) {
        guard musicMode else { return }
        let app = lastTrackKey.hasPrefix("Spotify") ? "Spotify" : "Music"
        let verb = ["playpause": "playpause", "next": "next track", "previous": "previous track"][cmd] ?? "playpause"
        runScript("tell application \"\(app)\" to \(verb)")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { self.pollNowPlaying() }
    }

    // MARK: AI companions — Claude Code / Codex appear while they work.
    // Watches only file-change *events* in their session-log folders (never reads contents).
    var companionStyle: String {
        get { defaults.string(forKey: "companions") ?? "native" }
        set { defaults.set(newValue, forKey: "companions") }
    }
    var agentSessions: [String: (kind: String, project: String, last: Date)] = [:]
    var fsStream: FSEventStreamRef?
    var lastAgentsJSON = ""

    func startCompanions() {
        if let s = fsStream { FSEventStreamStop(s); FSEventStreamInvalidate(s); FSEventStreamRelease(s); fsStream = nil }
        agentSessions.removeAll()
        defer { pushAgents() }
        guard isPro, companionStyle != "off" else { return }
        let home = NSHomeDirectory()
        let paths = [home + "/.claude/projects", home + "/.codex/sessions"].filter { FileManager.default.fileExists(atPath: $0) }
        guard !paths.isEmpty else { return }
        var ctx = FSEventStreamContext(version: 0, info: Unmanaged.passUnretained(self).toOpaque(), retain: nil, release: nil, copyDescription: nil)
        let cb: FSEventStreamCallback = { _, info, _, eventPaths, _, _ in
            guard let info else { return }
            let me = Unmanaged<App>.fromOpaque(info).takeUnretainedValue()
            if let arr = unsafeBitCast(eventPaths, to: NSArray.self) as? [String] { me.noteAgentActivity(arr) }
        }
        let flags = FSEventStreamCreateFlags(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes)
        guard let stream = FSEventStreamCreate(nil, cb, &ctx, paths as CFArray,
                                               FSEventStreamEventId(kFSEventStreamEventIdSinceNow), 1.0, flags) else { return }
        FSEventStreamSetDispatchQueue(stream, DispatchQueue.main)
        FSEventStreamStart(stream)
        fsStream = stream
    }

    func noteAgentActivity(_ paths: [String]) {
        for p in paths where p.hasSuffix(".jsonl") {
            let kind = p.contains("/.codex/") ? "codex" : "claude"
            var key = p, project = ""
            if kind == "claude", let r = p.range(of: "/.claude/projects/") {
                let parts = p[r.upperBound...].split(separator: "/").map(String.init)
                guard let dir = parts.first else { continue }
                // …/projects/<dir>/<session>.jsonl or …/<dir>/<session>/subagents/agent-*.jsonl → one session
                let session = parts.count > 1 ? parts[1].replacingOccurrences(of: ".jsonl", with: "") : ""
                key = dir + "/" + session
                project = App.prettyProject(dir)
            }
            agentSessions[key] = (kind, project, Date())
        }
        pushAgents()
    }

    /// "-Users-me-Documents-Projects-nia--claude-worktrees-x" → "nia"
    static func prettyProject(_ dir: String) -> String {
        var d = dir
        if let r = d.range(of: "--claude-worktrees") { d = String(d[..<r.lowerBound]) }
        if let r = d.range(of: "-Projects-", options: .backwards) { return String(d[r.upperBound...]) }
        return d.split(separator: "-").last.map(String.init) ?? ""
    }

    func pushAgents(force: Bool = false) {
        let now = Date()
        agentSessions = agentSessions.filter { now.timeIntervalSince($0.value.last) < 90 }
        var perKind: [String: Int] = [:]
        let list: [[String: Any]] = agentSessions.sorted { $0.key < $1.key }.compactMap { key, v in
            perKind[v.kind, default: 0] += 1
            guard perKind[v.kind]! <= 3 else { return nil }
            return ["id": String(UInt32(truncatingIfNeeded: key.hashValue), radix: 36), "kind": v.kind, "project": v.project,
                    "state": now.timeIntervalSince(v.last) < 12 ? "working" : "idle"]
        }
        let payload: [String: Any] = ["style": isPro ? companionStyle : "off", "list": isPro ? list : []]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8), force || json != lastAgentsJSON else { return }
        lastAgentsJSON = json
        windows.forEach { $0.js("__lw('agents',\(json))") }
    }

    var userPaused = false
    var pauseOnBattery: Bool {
        get { defaults.bool(forKey: "pauseOnBattery") }
        set { defaults.set(newValue, forKey: "pauseOnBattery") }
    }
    var onBattery = false
    var paused: Bool { userPaused || (pauseOnBattery && onBattery) }

    func checkPower() {
        let snap = IOPSCopyPowerSourcesInfo().takeRetainedValue()
        let src = IOPSGetProvidingPowerSourceType(snap)?.takeUnretainedValue() as String?
        let now = src == kIOPMBatteryPowerKey
        if now != onBattery { onBattery = now; applyPause() }
    }

    func applyPause() {
        if paused {
            windows.forEach { $0.freeze() }
        } else if windows.contains(where: { $0.frozen }) {
            windows.forEach { $0.unfreeze() }
            loadScene()
        }
        rebuildMenu()
    }

    // Scenes live in the bundle; LIVEWALL_SCENES overrides for live editing.
    lazy var scenesDir: URL = {
        if let p = ProcessInfo.processInfo.environment["LIVEWALL_SCENES"] { return URL(fileURLWithPath: p) }
        if let p = defaults.string(forKey: "scenesPath") { return URL(fileURLWithPath: p) }
        return Bundle.main.resourceURL!.appendingPathComponent("scenes", isDirectory: true).absoluteURL
    }()

    func applicationDidFinishLaunching(_ note: Notification) {
        NSApp.setActivationPolicy(.accessory)
        migrateDefaults()
        if defaults.object(forKey: "waterMinutes") == nil { defaults.set(60, forKey: "waterMinutes") }
        buildStatusItem()
        rebuildWindows()
        installMonitors()
        startAmbient()
        startMusicMode()
        startCompanions()
        Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in self?.pushAgents() }
        checkPower()
        Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in self?.checkPower() }
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.checkEngagement() }
        NotificationCenter.default.addObserver(self, selector: #selector(screensChanged),
            name: NSApplication.didChangeScreenParametersNotification, object: nil)
        let ws = NSWorkspace.shared.notificationCenter
        ws.addObserver(self, selector: #selector(spaceChanged), name: NSWorkspace.activeSpaceDidChangeNotification, object: nil)
        // Windows created while the screen is locked/asleep may not get ordered in;
        // re-assert them whenever the user comes back.
        ws.addObserver(self, selector: #selector(spaceChanged), name: NSWorkspace.screensDidWakeNotification, object: nil)
        ws.addObserver(self, selector: #selector(spaceChanged), name: NSWorkspace.sessionDidBecomeActiveNotification, object: nil)
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(unlocked),
            name: Notification.Name("com.apple.screenIsUnlocked"), object: nil)
        if ProcessInfo.processInfo.environment["LIVEWALL_DEV"] == "1" { installDevHook() }
    }

    /// Dev only: `livewall/dev.sh js "<code>"` / `dev.sh snap out.png` talk to the
    /// running app over a distributed notification. Off unless LIVEWALL_DEV=1.
    func installDevHook() {
        DistributedNotificationCenter.default().addObserver(forName: Notification.Name("com.sameep.livewall.dev"), object: nil, queue: .main) { [weak self] n in
            guard let self, let cmd = n.object as? String, let w = self.windows.first else { return }
            if cmd.hasPrefix("js:") {
                w.web.evaluateJavaScript(String(cmd.dropFirst(3))) { r, e in
                    let out = e.map { "error: \($0)" } ?? String(describing: r ?? "nil")
                    try? out.write(toFile: "/tmp/livewall-dev.txt", atomically: true, encoding: .utf8)
                }
            } else if cmd.hasPrefix("snap:") {
                let path = String(cmd.dropFirst(5))
                w.web.takeSnapshot(with: nil) { img, _ in
                    guard let img, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
                          let png = rep.representation(using: .png, properties: [:]) else { return }
                    try? png.write(to: URL(fileURLWithPath: path))
                }
            } else if cmd == "reload" { self.loadScene() }
            else if cmd.hasPrefix("scene:") { self.sceneID = String(cmd.dropFirst(6)); self.loadScene() }
            else if cmd.hasPrefix("reminder:") { self.sendReminder(String(cmd.dropFirst(9))) }
        }
    }

    /// The app was called LiveWall (com.sameep.livewall) before it became wallpap.
    func migrateDefaults() {
        guard !defaults.bool(forKey: "migratedFromLiveWall") else { return }
        if let old = UserDefaults(suiteName: "com.sameep.livewall")?.persistentDomain(forName: "com.sameep.livewall") {
            for (k, v) in old where defaults.object(forKey: k) == nil { defaults.set(v, forKey: k) }
        }
        defaults.set(true, forKey: "migratedFromLiveWall")
    }

    // MARK: windows

    @objc func screensChanged() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.rebuildWindows() }
    }

    @objc func unlocked() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.windows.forEach { $0.orderFrontRegardless() }
            if Date().timeIntervalSince(self.lastWeatherFetch) > 10 * 60 { self.fetchWeather() }
            self.pushEnv()
        }
    }

    @objc func spaceChanged() {
        windows.forEach { $0.orderFrontRegardless() }
    }

    func rebuildWindows() {
        windows.forEach { $0.close() }
        windows = NSScreen.screens.map { screen in
            let w = WallWindow(screen: screen, handler: self)
            w.orderFrontRegardless()
            return w
        }
        loadScene()
    }

    func loadScene() {
        if paused { rebuildMenu(); return }
        if !isPro, scenes.first(where: { $0.id == sceneID })?.pro == true { sceneID = "koi" }
        let file = scenesDir.appendingPathComponent("\(sceneID).html")
        // Resolve fully: Bundle URLs are relative to the bundle, and a relative URL
        // here makes WebKit throw (black wallpaper).
        var comps = URLComponents(url: file.absoluteURL, resolvingAgainstBaseURL: true)!
        comps.queryItems = [URLQueryItem(name: "host", value: "1"), URLQueryItem(name: "muted", value: muted ? "1" : "0")]
        comps.queryItems?.append(URLQueryItem(name: "calm", value: calm ? "1" : "0"))
        for (i, w) in windows.enumerated() {
            var c = comps
            c.queryItems?.append(URLQueryItem(name: "display", value: String(i)))
            if w.web.url != nil { w.freshWebView() }
            w.web.navigationDelegate = self
            w.web.loadFileURL(c.url!, allowingReadAccessTo: scenesDir)
        }
        rebuildMenu()
    }

    // MARK: input forwarding

    var lastMoveSent = 0.0
    var lastDesktopCheck = 0.0
    var cursorOnDesktop = false
    var pendingMove = false

    func installMonitors() {
        let moveMask: NSEvent.EventTypeMask = [.mouseMoved, .leftMouseDragged]
        if let m = NSEvent.addGlobalMonitorForEvents(matching: moveMask, handler: { [weak self] _ in self?.onMove() }) { monitors.append(m) }
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .leftMouseDown, handler: { [weak self] _ in self?.onButton("down") }) { monitors.append(m) }
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .leftMouseUp, handler: { [weak self] _ in self?.onButton("up") }) { monitors.append(m) }
    }

    /// Is the topmost on-screen window under the cursor below the normal window
    /// layer (i.e. Finder's desktop or us)? Then the cursor is on bare desktop.
    func isDesktop(at p: NSPoint) -> Bool {
        guard let primary = NSScreen.screens.first else { return false }
        let cg = CGPoint(x: p.x, y: primary.frame.maxY - p.y)
        guard let info = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return false }
        let myPID = ProcessInfo.processInfo.processIdentifier
        let screen = NSScreen.screens.first { $0.frame.contains(p) } ?? primary
        for w in info {
            guard let layer = w[kCGWindowLayer as String] as? Int,
                  let b = w[kCGWindowBounds as String] as? [String: CGFloat],
                  let alpha = w[kCGWindowAlpha as String] as? Double, alpha > 0.01 else { continue }
            if (w[kCGWindowOwnerPID as String] as? Int32) == myPID { continue }
            let rect = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0)
            guard rect.contains(cg) else { continue }
            // System overlays (Notification Centre's widget layer, the cursor layer, …)
            // span the whole display above layer 0 yet pass clicks through — skip them.
            let fullScreen = rect.width >= screen.frame.width - 1 && rect.height >= screen.frame.height - 1
            if layer > 0 && fullScreen { continue }
            let owner = w[kCGWindowOwnerName as String] as? String ?? ""
            if owner == "Window Server" && layer > 25 { continue }
            // Menu bar (24/25) and Dock (20) count as "not desktop"; ordinary windows are layer 0.
            return layer < 0
        }
        return true
    }

    func local(_ p: NSPoint, in w: WallWindow) -> (Double, Double) {
        (Double(p.x - w.frame.minX), Double(w.frame.maxY - p.y))
    }

    func target(for p: NSPoint) -> WallWindow? { windows.first { $0.frame.contains(p) } }

    func onMove() {
        if paused { return }
        let now = CACurrentMediaTime()
        let p = NSEvent.mouseLocation
        if now - lastDesktopCheck > 0.15 {
            lastDesktopCheck = now
            let was = cursorOnDesktop
            cursorOnDesktop = isDesktop(at: p)
            if was && !cursorOnDesktop { windows.forEach { $0.js("__lw('leave')") } }
        }
        guard cursorOnDesktop else { return }
        touchDesktop()
        // Coalesce to ~90 Hz.
        if now - lastMoveSent < 0.011 {
            if !pendingMove {
                pendingMove = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.012) { self.pendingMove = false; self.onMove() }
            }
            return
        }
        lastMoveSent = now
        guard let w = target(for: p) else { return }
        let (x, y) = local(p, in: w)
        w.js("__lw('move',\(x),\(y))")
    }

    var downOnDesktop = false
    func onButton(_ type: String) {
        if paused { return }
        let p = NSEvent.mouseLocation
        if type == "down" {
            downOnDesktop = isDesktop(at: p)
            cursorOnDesktop = downOnDesktop
            if downOnDesktop { touchDesktop() }
        }
        guard downOnDesktop, let w = target(for: p) else { return }
        let (x, y) = local(p, in: w)
        w.js("__lw('\(type)',\(x),\(y))")
    }

    // MARK: ambient — time, weather, reminders, calm

    var calm = false
    var env: [String: Any] = ["weather": "clear", "intensity": 0.0, "temp": 20.0, "wind": 0.2]
    var weatherOverride: String? {
        get { defaults.string(forKey: "weatherOverride") }
        set { defaults.set(newValue, forKey: "weatherOverride") }
    }
    var waterMinutes: Int {
        get { defaults.integer(forKey: "waterMinutes") }
        set { defaults.set(newValue, forKey: "waterMinutes"); scheduleReminders() }
    }
    let loc = CLLocationManager()
    var coord: CLLocationCoordinate2D?
    var reminderTimer: Timer?
    var reminderCount = 0

    /// Weather location: approximate from the time zone by default (no prompt).
    /// Precise location is opt-in from the Weather menu, which is when macOS asks.
    var preciseLocation: Bool {
        get { defaults.bool(forKey: "preciseLocation") }
        set { defaults.set(newValue, forKey: "preciseLocation") }
    }
    var weatherPlace = ""
    var lastWeatherFetch = Date.distantPast

    func startAmbient() {
        loc.delegate = self
        loc.desiredAccuracy = kCLLocationAccuracyReduced
        if preciseLocation { loc.startUpdatingLocation() } else { locateByTimeZone() }
        Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in self?.pushEnv() }
        Timer.scheduledTimer(withTimeInterval: 15 * 60, repeats: true) { [weak self] _ in self?.fetchWeather() }
        scheduleReminders()
    }

    func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        guard let c = locs.last?.coordinate else { return }
        coord = c
        weatherPlace = "your location"
        m.stopUpdatingLocation()
        fetchWeather()
        rebuildMenu()
    }
    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        NSLog("wallpap location: \(error)")
        locateByTimeZone()
    }

    /// No location permission? Approximate from the time zone's city
    /// (e.g. Asia/Kolkata → Kolkata) using Open-Meteo's geocoder.
    func locateByTimeZone() {
        guard coord == nil || !preciseLocation else { return }
        let city = TimeZone.current.identifier.split(separator: "/").last.map { $0.replacingOccurrences(of: "_", with: " ") } ?? ""
        guard !city.isEmpty, let q = city.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "https://geocoding-api.open-meteo.com/v1/search?name=\(q)&count=1") else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data, let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let r = (j["results"] as? [[String: Any]])?.first,
                  let lat = r["latitude"] as? Double, let lon = r["longitude"] as? Double else { return }
            DispatchQueue.main.async {
                guard !(self.preciseLocation && self.weatherPlace == "your location") else { return }
                self.coord = CLLocationCoordinate2D(latitude: lat, longitude: lon)
                self.weatherPlace = city
                NSLog("wallpap: weather location from time zone → \(city)")
                self.fetchWeather()
            }
        }.resume()
    }
    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        guard preciseLocation else { return }
        switch m.authorizationStatus {
        case .authorizedAlways, .authorized: m.startUpdatingLocation()
        case .denied, .restricted: preciseLocation = false; locateByTimeZone(); rebuildMenu()
        default: break
        }
    }

    @objc func togglePreciseLocation() {
        preciseLocation.toggle()
        if preciseLocation {
            loc.requestWhenInUseAuthorization()   // the macOS prompt appears now, not at launch
            loc.startUpdatingLocation()
        } else {
            loc.stopUpdatingLocation(); coord = nil; locateByTimeZone()
        }
        rebuildMenu()
    }

    /// Open-Meteo: free, no key. WMO weather codes → scene weather.
    func fetchWeather() {
        guard isPro, let c = coord else { return }
        lastWeatherFetch = Date()
        let url = URL(string: "https://api.open-meteo.com/v1/forecast?latitude=\(c.latitude)&longitude=\(c.longitude)&current=temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day")!
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data, let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let cur = j["current"] as? [String: Any] else { return }
            let code = cur["weather_code"] as? Int ?? 0
            let precip = cur["precipitation"] as? Double ?? 0
            let clouds = cur["cloud_cover"] as? Double ?? 0
            let weather: String
            switch code {
            case 0, 1: weather = "clear"
            case 2, 3: weather = "cloudy"
            case 45, 48: weather = "fog"
            case 71...77, 85, 86: weather = "snow"
            case 95...99: weather = "storm"
            case 51...67, 80...82: weather = "rain"
            default: weather = "clear"
            }
            let intensity = weather == "cloudy" ? clouds / 100 : min(1, 0.35 + precip / 4)
            DispatchQueue.main.async {
                self.env["weather"] = weather
                self.env["intensity"] = intensity
                self.env["temp"] = cur["temperature_2m"] as? Double ?? 20
                self.env["wind"] = min(1, (cur["wind_speed_10m"] as? Double ?? 5) / 40)
                self.pushEnv()
                self.rebuildMenu()
            }
        }.resume()
    }

    func pushEnv() {
        var e = env
        let d = Calendar.current.dateComponents([.hour, .minute], from: Date())
        e["hour"] = Double(d.hour ?? 12) + Double(d.minute ?? 0) / 60
        if let o = weatherOverride { e["weather"] = o; e["intensity"] = 0.75 }
        else if !isPro { e["weather"] = "clear"; e["intensity"] = 0.0 }   // live weather is Pro
        guard let data = try? JSONSerialization.data(withJSONObject: e),
              let json = String(data: data, encoding: .utf8) else { return }
        windows.forEach { $0.js("__lw('env',\(json))") }
    }

    func scheduleReminders() {
        reminderTimer?.invalidate()
        guard isPro, waterMinutes > 0 else { return }
        reminderTimer = Timer.scheduledTimer(withTimeInterval: Double(waterMinutes) * 60, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.reminderCount += 1
            // Mostly water; every third nudge is a stretch.
            self.sendReminder(self.reminderCount % 3 == 0 ? "stretch" : "water")
        }
    }

    func sendReminder(_ kind: String) { windows.forEach { $0.js("__lw('reminder','\(kind)')") } }

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        if let s = message.body as? String, s.hasPrefix("log:") { NSLog("[scene] %@", String(s.dropFirst(4))) }
        // In-scene controls persist their settings here (LW.set).
        if let d = message.body as? [String: Any], d["type"] as? String == "media", let cmd = d["cmd"] as? String {
            mediaCommand(cmd)
            return
        }
        if let d = message.body as? [String: Any], d["type"] as? String == "set", let key = d["key"] as? String {
            var cur = sceneSettings
            cur[key] = d["value"]
            sceneSettings = cur
            rebuildMenu()
        }
    }

    // Settings remembered per scene (e.g. bowls: auto mode, bowl set).
    var sceneSettings: [String: Any] {
        get { defaults.dictionary(forKey: "settings.\(sceneID)") ?? [:] }
        set { defaults.set(newValue, forKey: "settings.\(sceneID)") }
    }
    func setSetting(_ key: String, _ value: Any) {
        var cur = sceneSettings
        cur[key] = value
        sceneSettings = cur
        pushSettings()
        rebuildMenu()
    }
    func pushSettings() {
        guard let data = try? JSONSerialization.data(withJSONObject: sceneSettings),
              let json = String(data: data, encoding: .utf8) else { return }
        windows.forEach { $0.js("__lw('settings',\(json))") }
    }
    func sendAction(_ name: String) { windows.forEach { $0.js("__lw('action','\(name)')") } }

    // Page loaded → hand it the current env + its saved settings.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pushEnv()
        pushSettings()
        webView.evaluateJavaScript("__lw('perf',{fps:\(fps)}); __lw('focus',\(engaged)); __lw('nowplaying',\(lastNowPlayingJSON.isEmpty ? "null" : lastNowPlayingJSON))", completionHandler: nil)
        pushSoundscape()
        if !lastAgentsJSON.isEmpty { webView.evaluateJavaScript("__lw('agents',\(lastAgentsJSON))", completionHandler: nil) }
    }

    // MARK: menu

    func buildStatusItem() {
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let b = status.button {
            b.image = NSImage(systemSymbolName: "water.waves", accessibilityDescription: "wallpap")
            b.image?.isTemplate = true
        }
        rebuildMenu()
    }

    func rebuildMenu() {
        let menu = NSMenu()
        let header = NSMenuItem(title: isPro ? "wallpap Pro" : "wallpap", action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)
        if !isPro {
            let up = NSMenuItem(title: "Unlock Pro — $9 one-time…", action: #selector(openPro), keyEquivalent: "")
            up.target = self
            menu.addItem(up)
            menu.addItem(.separator())
        }
        for s in scenes {
            let item = NSMenuItem(title: s.title, action: #selector(pickScene(_:)), keyEquivalent: s.key)
            item.representedObject = s.id
            item.state = s.id == sceneID ? .on : .off
            item.target = self
            if s.pro { lock(item) }
            menu.addItem(item)
        }
        addSceneItems(to: menu)
        menu.addItem(.separator())
        let calmItem = NSMenuItem(title: "Calm · Breathe", action: #selector(toggleCalm), keyEquivalent: "b")
        calmItem.state = calm ? .on : .off
        calmItem.target = self
        lock(calmItem)
        menu.addItem(calmItem)

        let wItem = NSMenuItem(title: "Weather", action: nil, keyEquivalent: "")
        let wMenu = NSMenu()
        let live = (env["weather"] as? String) ?? "clear"
        let temp = (env["temp"] as? Double).map { " · \(Int($0.rounded()))°" } ?? ""
        let place = weatherPlace.isEmpty ? "" : " (\(weatherPlace))"
        let liveItem = NSMenuItem(title: coord == nil ? "Live (locating…)" : "Live — \(live)\(temp)\(place)", action: #selector(pickWeather(_:)), keyEquivalent: "")
        liveItem.representedObject = ""
        liveItem.state = weatherOverride == nil ? .on : .off
        liveItem.target = self
        if !isPro { liveItem.title = "Live Weather"; liveItem.state = .off }
        lock(liveItem)
        wMenu.addItem(liveItem)
        wMenu.addItem(.separator())
        for w in ["clear", "cloudy", "rain", "storm", "snow", "fog"] {
            let it = NSMenuItem(title: w.capitalized, action: #selector(pickWeather(_:)), keyEquivalent: "")
            it.representedObject = w
            it.state = weatherOverride == w ? .on : .off
            it.target = self
            wMenu.addItem(it)
        }
        wMenu.addItem(.separator())
        let precise = NSMenuItem(title: "Use My Precise Location", action: #selector(togglePreciseLocation), keyEquivalent: "")
        precise.state = preciseLocation ? .on : .off
        precise.target = self
        wMenu.addItem(precise)
        wItem.submenu = wMenu
        menu.addItem(wItem)

        let rItem = NSMenuItem(title: "Water Reminder", action: nil, keyEquivalent: "")
        let rMenu = NSMenu()
        for m in [0, 30, 45, 60, 90] {
            let it = NSMenuItem(title: m == 0 ? "Off" : "Every \(m) min", action: #selector(pickReminder(_:)), keyEquivalent: "")
            it.tag = m
            it.state = waterMinutes == m ? .on : .off
            it.target = self
            rMenu.addItem(it)
        }
        rMenu.addItem(.separator())
        let now = NSMenuItem(title: "Remind Me Now", action: #selector(remindNow), keyEquivalent: "")
        now.target = self
        rMenu.addItem(now)
        rItem.submenu = rMenu
        lock(rItem)
        menu.addItem(rItem)

        let ssItem = NSMenuItem(title: "Soundscape", action: nil, keyEquivalent: "")
        let ssMenu = NSMenu()
        for (label, kind) in [("Off", "off"), ("White Noise", "white"), ("Pink Noise", "pink"), ("Brown Noise", "brown"),
                              ("Rain", "rain"), ("Ocean", "ocean"), ("Fireplace", "fire"), ("Stream", "stream")] {
            let it = NSMenuItem(title: label, action: #selector(pickSoundscape(_:)), keyEquivalent: "")
            it.representedObject = kind
            it.state = soundscape == kind ? .on : .off
            it.target = self
            ssMenu.addItem(it)
            if kind == "off" { ssMenu.addItem(.separator()) }
        }
        ssMenu.addItem(.separator())
        for (label, v) in [("Quiet", 0.18), ("Medium", 0.35), ("Loud", 0.6)] {
            let it = NSMenuItem(title: label, action: #selector(pickSoundscapeVolume(_:)), keyEquivalent: "")
            it.representedObject = v
            it.state = abs(soundscapeVolume - v) < 0.01 ? .on : .off
            it.target = self
            ssMenu.addItem(it)
        }
        ssItem.submenu = ssMenu
        lock(ssItem)
        menu.addItem(ssItem)
        let compItem = NSMenuItem(title: "AI Companions", action: nil, keyEquivalent: "")
        let compMenu = NSMenu()
        for (label, v) in [("Off", "off"), ("In the Scene", "native"), ("As Characters (Clawd & Codex)", "characters")] {
            let it = NSMenuItem(title: label, action: #selector(pickCompanions(_:)), keyEquivalent: "")
            it.representedObject = v
            it.state = companionStyle == v ? .on : .off
            it.target = self
            compMenu.addItem(it)
        }
        compItem.submenu = compMenu
        lock(compItem)
        menu.addItem(compItem)
        let music = NSMenuItem(title: "Music Mode (Music / Spotify)", action: #selector(toggleMusicMode), keyEquivalent: "")
        music.state = musicMode ? .on : .off
        music.target = self
        lock(music)
        menu.addItem(music)

        menu.addItem(.separator())
        let mute = NSMenuItem(title: "Sound", action: #selector(toggleMute), keyEquivalent: "s")
        mute.state = muted ? .off : .on
        mute.target = self
        menu.addItem(mute)
        let pause = NSMenuItem(title: paused && !userPaused ? "Paused (on battery)" : "Pause Animation", action: #selector(togglePause), keyEquivalent: "p")
        pause.state = paused ? .on : .off
        pause.target = self
        menu.addItem(pause)
        let pob = NSMenuItem(title: "Pause on Battery", action: #selector(togglePauseOnBattery), keyEquivalent: "")
        pob.state = pauseOnBattery ? .on : .off
        pob.target = self
        menu.addItem(pob)
        let idle = NSMenuItem(title: "Rest When Not in Use", action: #selector(togglePauseWhenIdle), keyEquivalent: "")
        idle.state = pauseWhenIdle ? .on : .off
        idle.toolTip = "Blur and stop drawing after 20s away from the desktop; wakes when your cursor returns."
        idle.target = self
        menu.addItem(idle)
        let fpsItem = NSMenuItem(title: "Frame Rate", action: nil, keyEquivalent: "")
        let fpsMenu = NSMenu()
        for (label, v) in [("20 fps · Battery Saver", 20), ("30 fps · Balanced", 30), ("60 fps · Smooth", 60)] {
            let it = NSMenuItem(title: label, action: #selector(pickFps(_:)), keyEquivalent: "")
            it.tag = v
            it.state = fps == v ? .on : .off
            it.target = self
            fpsMenu.addItem(it)
        }
        fpsItem.submenu = fpsMenu
        menu.addItem(fpsItem)
        let reload = NSMenuItem(title: "Reload Scene", action: #selector(reloadScene), keyEquivalent: "r")
        reload.target = self
        menu.addItem(reload)
        let login = NSMenuItem(title: "Open at Login", action: #selector(toggleLogin), keyEquivalent: "")
        login.target = self
        if #available(macOS 13, *) { login.state = SMAppService.mainApp.status == .enabled ? .on : .off }
        menu.addItem(login)
        menu.addItem(.separator())
        let quit = NSMenuItem(title: "Quit wallpap", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        menu.addItem(quit)
        status.menu = menu
    }

    /// Scene-specific controls, shown under the scene list for the active scene.
    func addSceneItems(to menu: NSMenu) {
        func choice(_ title: String, key: String, options: [(String, Any)], defaultValue: Any) {
            let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            let sub = NSMenu()
            let current = sceneSettings[key] ?? defaultValue
            for (label, value) in options {
                let it = NSMenuItem(title: label, action: #selector(pickSetting(_:)), keyEquivalent: "")
                it.representedObject = [key, value]
                it.state = "\(current)" == "\(value)" ? .on : .off
                it.target = self
                sub.addItem(it)
            }
            item.submenu = sub
            item.indentationLevel = 1
            menu.addItem(item)
        }
        func action(_ title: String, _ name: String) {
            let it = NSMenuItem(title: title, action: #selector(runAction(_:)), keyEquivalent: "")
            it.representedObject = name
            it.indentationLevel = 1
            it.target = self
            menu.addItem(it)
        }
        switch sceneID {
        case "bowls":
            choice("Auto Play", key: "auto", options: [("Off", "off"), ("Focus", "focus"), ("Meditate", "meditate"), ("Sleep", "sleep")], defaultValue: "off")
            choice("Bowls", key: "set", options: [("Tibetan · 7", "tibetan7"), ("Tibetan · 9", "tibetan9"), ("Crystal", "crystal"), ("Mixed", "mixed")], defaultValue: "tibetan7")
            choice("Sleep Timer", key: "sleepMinutes", options: [("15 min", 15), ("30 min", 30), ("45 min", 45), ("60 min", 60), ("90 min", 90)], defaultValue: 45)
        case "cats":
            action("Feed the Cats", "feed")
            action("Fill the Water Bowl", "water")
        case "grass":
            action("Give Bamboo", "bamboo")
        default: break
        }
    }

    @objc func pickSetting(_ item: NSMenuItem) {
        guard let kv = item.representedObject as? [Any], let key = kv.first as? String else { return }
        setSetting(key, kv[1])
    }
    @objc func runAction(_ item: NSMenuItem) {
        if let name = item.representedObject as? String { sendAction(name) }
    }

    @objc func pickScene(_ item: NSMenuItem) {
        guard let id = item.representedObject as? String else { return }
        sceneID = id
        if userPaused { userPaused = false; windows.forEach { $0.unfreeze() } }
        loadScene()
    }

    @objc func toggleMute() {
        muted.toggle()
        windows.forEach { $0.js("__lw('mute',0,0,\(muted))") }
        rebuildMenu()
    }

    @objc func reloadScene() { loadScene() }

    @objc func togglePause() {
        if paused && !userPaused { pauseOnBattery = false } else { userPaused.toggle() }
        applyPause()
    }
    @objc func togglePauseOnBattery() { pauseOnBattery.toggle(); applyPause() }
    @objc func pickSoundscape(_ item: NSMenuItem) {
        soundscape = item.representedObject as? String ?? "off"
        pushSoundscape(); rebuildMenu()
    }
    @objc func pickSoundscapeVolume(_ item: NSMenuItem) {
        soundscapeVolume = item.representedObject as? Double ?? 0.35
        pushSoundscape(); rebuildMenu()
    }
    @objc func pickCompanions(_ item: NSMenuItem) {
        companionStyle = item.representedObject as? String ?? "native"
        startCompanions(); rebuildMenu()
    }
    @objc func toggleMusicMode() { musicMode.toggle(); startMusicMode(); rebuildMenu() }
    @objc func togglePauseWhenIdle() { pauseWhenIdle.toggle(); checkEngagement(); rebuildMenu() }
    @objc func pickFps(_ item: NSMenuItem) {
        fps = item.tag
        windows.forEach { $0.js("__lw('perf',{fps:\(item.tag)})") }
        rebuildMenu()
    }

    @objc func toggleCalm() {
        guard isPro else { openPro(); return }
        calm.toggle()
        windows.forEach { $0.js("__lw('calm',\(calm))") }
        rebuildMenu()
    }

    @objc func pickWeather(_ item: NSMenuItem) {
        let w = item.representedObject as? String ?? ""
        weatherOverride = w.isEmpty ? nil : w
        pushEnv()
        rebuildMenu()
    }

    @objc func pickReminder(_ item: NSMenuItem) { waterMinutes = item.tag; rebuildMenu() }
    @objc func remindNow() { sendReminder("water") }

    @objc func toggleLogin() {
        guard #available(macOS 13, *) else { return }
        let svc = SMAppService.mainApp
        do {
            if svc.status == .enabled { try svc.unregister() } else { try svc.register() }
        } catch {
            NSLog("wallpap login item: \(error)")
        }
        rebuildMenu()
    }
}

let app = NSApplication.shared
let delegate = App()
app.delegate = delegate
app.run()
