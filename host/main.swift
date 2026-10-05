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

/// `pro`: whole scene locked for free users (none today — every scene is free with its default skin;
/// Pro unlocks the other skins + Pro features). `music`: has an in-scene player Music Mode drives.
struct Scene {
    let id: String; let title: String; let key: String; var pro = false; let category: String; var music = false
    /// Credit shown in the panel ("by …"). Built-in scenes are by wallpap; add-ons carry scene.json's author.
    var author = "wallpap"; var authorURL = ""
    /// A folder the user added themselves (Custom tab; Pro only).
    var custom = false
}

/// Menu categories, in order. Music Mode works in every scene; it isn't a category.
/// "More" collects add-on scenes whose category isn't one of these (Catalog.swift).
let categories = ["Nature", "Places", "Cozy Rooms", "City Nights", "Journeys", "Mindful", "Music", "More", "Custom"]
/// Scenes held back from the build until they reach the bar (owner, 2026-10-03): Night Drive and the
/// Music visualizers except Cymatics. Their files stay in the bundle; they just aren't offered.
let shelvedScenes: Set<String> = ["drive", "kinetic", "fluids", "skies"]
/// Scenes shipped inside the app. `scenes` (Catalog.swift) adds the installed add-ons.
let allBuiltinScenes: [Scene] = [
    Scene(id: "koi", title: "Koi Pond", key: "1", category: "Nature"),
    Scene(id: "grass", title: "Touch Grass", key: "2", category: "Nature"),
    Scene(id: "cats", title: "Santorini Cats", key: "3", category: "Nature"),
    Scene(id: "cafe", title: "Corner Café", key: "4", category: "Cozy Rooms", music: true),
    Scene(id: "cabin", title: "Snowy Cabin", key: "", category: "Cozy Rooms", music: true),
    Scene(id: "records", title: "Record Store", key: "", category: "Cozy Rooms", music: true),
    Scene(id: "speakeasy", title: "Speakeasy", key: "", category: "City Nights", music: true),
    Scene(id: "rooftop", title: "Rooftop", key: "", category: "City Nights", music: true),
    Scene(id: "ramen", title: "Ramen Alley", key: "", category: "City Nights", music: true),
    Scene(id: "train", title: "Train Journey", key: "", category: "Journeys", music: true),
    Scene(id: "drive", title: "Night Drive", key: "", category: "Journeys", music: true),
    Scene(id: "bowls", title: "Singing Bowls", key: "5", category: "Mindful"),
    Scene(id: "cymatics", title: "Cymatics", key: "", category: "Music", music: true),
    Scene(id: "kinetic", title: "Kinetic", key: "", category: "Music", music: true),
    Scene(id: "fluids", title: "Fluids", key: "", category: "Music", music: true),
    Scene(id: "skies", title: "Skies", key: "", category: "Music", music: true),
]
// (after allBuiltinScenes: main.swift globals initialise top to bottom)
let builtinScenes: [Scene] = allBuiltinScenes.filter { !shelvedScenes.contains($0.id) }

final class WallWindow: NSWindow {
    var playPresented = false
    override var canBecomeKey: Bool { playPresented }
    override var canBecomeMain: Bool { playPresented }
    private(set) var web: WKWebView
    let screenID: CGDirectDisplayID
    private weak var handler: WKScriptMessageHandler?

    static func makeWebView(size: NSSize, handler: WKScriptMessageHandler) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        config.suppressesIncrementalRendering = true
        config.websiteDataStore = .default() // Persist shell-only local puzzle progress; opaque card frames have no origin.
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
    /// WebGL contexts) can leak from the previous scene. The old page is closed outright
    /// (WebTeardown.retire), which ends its WebContent process and returns its memory now.
    func freshWebView() {
        guard let handler else { return }
        let old = web
        web = WallWindow.makeWebView(size: frame.size, handler: handler)
        contentView = web
        WebTeardown.retire(old)
    }
    /// The window is going away (displays changed): close its page now rather than whenever it deallocates.
    func retireWebView() { WebTeardown.retire(web) }

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
    lazy var playAnalytics: PlayAnalytics = {
        let client = PlayAnalytics(version: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.12.1")
        client.enabled = sharePlayCounts; client.start(); return client
    }()
    lazy var playHost = PlayHost(app: self)
    var pendingSceneLinks: [URL] = []
    var sceneLinksReady = false
    var handlingSceneLink = false
    var windows: [WallWindow] = []
    var status: NSStatusItem!
    var monitors: [Any] = []
    let defaults = UserDefaults.standard

    // MARK: Pro
    // Free: Koi, Cats, Touch Grass + all interactions + manual weather.
    // Pro ($5 one-time): every scene, reminders, Calm, live weather, soundscapes,
    // Music Mode, AI companions, future scenes. Unlocked by a Dodo Payments license key (License.swift);
    // the `pro` default / WALLPAP_PRO stay as developer overrides.
    /// Owner 2026-10-05: "make pro free for all for now". Flip back to false to restore the paywall;
    /// existing license keys keep working either way.
    static let proFreeForAll = true
    var isPro: Bool { App.proFreeForAll || licensed || defaults.bool(forKey: "pro") || ProcessInfo.processInfo.environment["WALLPAP_PRO"] == "1" }
    @objc func openPro() { NSWorkspace.shared.open(URL(string: "https://wallpap.live/#pro")!) }
    func lock(_ item: NSMenuItem) {
        guard !isPro else { return }
        item.title += "  ·  Pro"
        item.action = #selector(openPro); item.target = self
        item.submenu = nil; item.state = .off; item.keyEquivalent = ""
    }

    var sceneID: String {
        get { let v = defaults.string(forKey: "scene") ?? "koi"; return shelvedScenes.contains(v) ? "koi" : v }
        set { defaults.set(newValue, forKey: "scene") }
    }
    var muted: Bool {
        get { defaults.bool(forKey: "muted") }
        set { defaults.set(newValue, forKey: "muted") }
    }

    // Energy modes. "always" = never auto-pause · "away" = pause after `awaySeconds` away from the
    // desktop · "battery" = like "away" (1 min) but only on battery; always on when plugged in.
    // An auto-pause just stops drawing (the scene stays as it was, no blur); a desktop CLICK resumes.
    var energyMode: String {
        get {
            if let m = defaults.string(forKey: "energyMode") { return m }
            if defaults.bool(forKey: "pauseOnBattery") { return "battery" }               // migrate old toggles
            return defaults.object(forKey: "pauseWhenIdle") as? Bool == false ? "always" : "away"
        }
        set { defaults.set(newValue, forKey: "energyMode") }
    }
    static let awayChoices: [(String, Int)] = [("30 sec", 30), ("1 min", 60), ("2 min", 120), ("5 min", 300), ("10 min", 600), ("30 min", 1800)]
    static let awayRecommended = 120
    var awaySeconds: Int {
        get { let v = defaults.integer(forKey: "awaySeconds"); return v == 0 ? App.awayRecommended : v }
        set { defaults.set(newValue, forKey: "awaySeconds") }
    }
    var pauseWhenIdle: Bool { energyMode != "always" }
    var fps: Int {
        get { let v = defaults.integer(forKey: "fps"); return v == 0 ? 30 : v }
        set { defaults.set(newValue, forKey: "fps") }
    }
    var lastDesktopActivity = CACurrentMediaTime()
    var engaged = true

    func checkEngagement() {
        if let w = playHost.window { w.js("__lw('focus',true)"); return }
        let now = CACurrentMediaTime()
        let panelOpen = panelHostIfLoaded?.popover.isShown == true      // never pause under our own menu
        var want: Bool
        switch energyMode {
        case "always": want = true
        case "battery" where !onBattery: want = true
        default:
            let limit = Double(energyMode == "battery" ? 60 : awaySeconds)
            // Once paused, only a desktop click (touchDesktop(click: true)) wakes it.
            want = engaged && (cursorOnDesktop || now - lastDesktopActivity < limit)
        }
        if panelOpen { want = true; lastDesktopActivity = now }
        if userPaused { want = false }
        setEngaged(want)
    }
    func setEngaged(_ want: Bool) {
        if want != engaged {
            engaged = want
            let why = want ? "" : (userPaused ? "user" : (energyMode == "battery" && onBattery ? "battery" : "away"))
            windows.forEach { $0.js("__lw('pauseReason','\(why)'); __lw('focus',\(want))") }
            panelHostIfLoaded?.push()
            engagementChanged()
        }
    }
    /// A paused wallpaper should cost ~nothing: while nobody's looking the host stops its own polling
    /// (60 Hz pointer poll, Music/Spotify AppleScript, beat-sync audio capture, Finder icon scan) and
    /// holds page updates (env, layout, companions) — then catches the page up in one go on resume.
    func engagementChanged() {
        if engaged {
            setMoveMonitors(true)
            if NSApp.isActive { startActivePointerPoll() }
            if musicMode && isPro { startMusicMode() } else { updateBeatSync() }
            flushAgentActivity()
            pushEnv(); pushLayout(); pushAgents()
        } else {
            stopActivePointerPoll(); setMoveMonitors(false)
            musicTimer?.invalidate(); musicTimer = nil
            updateBeatSync()
        }
    }
    func touchDesktop(click: Bool = false) {
        lastDesktopActivity = CACurrentMediaTime()
        if !engaged && click { setEngaged(true) }
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
    var beatSyncOn: Bool {
        get { defaults.bool(forKey: "beatSync") }
        set { defaults.set(newValue, forKey: "beatSync") }
    }
    lazy var beat: BeatSync = {
        let b = BeatSync()
        // Full music frame (levels + chroma, chord, key, tempo, sections) as JSON → LW.music / LW.mx.
        b.onMusic = { [weak self] json in
            guard let self, self.engaged else { return }   // nobody looking → don't bother the scene
            self.windows.forEach { $0.js("__lw('beat',\(json))") }
        }
        b.onError = { [weak self] err in
            NSLog("wallpap beat sync: \(err)")
            self?.beatSyncOn = false; self?.rebuildMenu()
        }
        return b
    }()
    /// Listen only while it matters: beat sync on, Pro, and music actually playing.
    func updateBeatSync() {
        let playing = lastNowPlayingJSON.contains("\"playing\":true")
        if isPro && beatSyncOn && musicMode && playing && engaged { beat.start() } else if beat.running { beat.stop() }
    }
    var lastTrackKey = ""
    var lastNowPlayingJSON = "null"
    var artworkCache: [String: String] = [:]

    func startMusicMode() {
        musicTimer?.invalidate(); musicTimer = nil
        guard musicMode, isPro else { lastNowPlayingJSON = "null"; windows.forEach { $0.js("__lw('nowplaying',null)") }; return }
        guard engaged else { return }   // paused: engagementChanged() restarts polling on resume
        pollNowPlaying()
        musicTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in self?.pollNowPlaying() }
        musicTimer?.tolerance = 0.5
    }

    func isRunning(_ bundleID: String) -> Bool {
        NSWorkspace.shared.runningApplications.contains { $0.bundleIdentifier == bundleID }
    }

    var musicPermissionDenied = false
    @discardableResult
    func runScript(_ src: String) -> NSAppleEventDescriptor? {
        var err: NSDictionary?
        let r = NSAppleScript(source: src)?.executeAndReturnError(&err)
        if let err {
            let code = err[NSAppleScript.errorNumber] as? Int ?? 0
            if code == -1743 || code == -1744 {   // not permitted to send Apple Events
                if !musicPermissionDenied { musicPermissionDenied = true; NSLog("wallpap: Automation permission missing for Music/Spotify"); rebuildMenu() }
            } else {
                NSLog("wallpap AppleScript error %d: %@", code, err[NSAppleScript.errorMessage] as? String ?? "")
            }
            return nil
        }
        if musicPermissionDenied { musicPermissionDenied = false; rebuildMenu() }
        return r
    }
    /// macOS "Click wallpaper to reveal desktop" (Sonoma+): when it's "Always" (the default), every click on a
    /// scene also slides all windows away. We never change it for the user; the panel offers a one-time tip.
    var clickRevealsDesktop: Bool {
        let v = CFPreferencesCopyAppValue("EnableStandardClickToShowDesktop" as CFString, "com.apple.WindowManager" as CFString)
        return (v as? NSNumber)?.boolValue ?? true
    }
    var clickTipDismissed: Bool {
        get { defaults.bool(forKey: "clickTipDismissed") }
        set { defaults.set(newValue, forKey: "clickTipDismissed") }
    }
    @objc func openDesktopSettings() {
        NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.Desktop-Settings.extension")!)
    }
    @objc func dismissClickTip() { clickTipDismissed = true; panelHostIfLoaded?.push() }
    @objc func openAutomationSettings() {
        NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation")!)
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
        updateBeatSync()
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
    // Watches file-change events in their session-log folders. To know when one is waiting for you it reads
    // only the structural markers of the newest log entries (Claude's stop_reason, Codex's event type),
    // never message text.
    var companionStyle: String {
        // Companions live only in scenes that give them an in-world form (Koi Pond); the old
        // "characters" overlay is gone, so that stored choice maps to on.
        get { let v = defaults.string(forKey: "companions") ?? "native"; return v == "characters" ? "native" : v }
        set { defaults.set(newValue, forKey: "companions") }
    }
    var agentSessions: [String: (kind: String, project: String, last: Date, waiting: Date?)] = [:]
    static let attentionSeconds: TimeInterval = 240   // how long a finished/waiting agent asks for you
    var fsStream: FSEventStreamRef?
    var lastAgentsJSON = ""
    var automatedSessions: [String: Bool] = [:]   // headless SDK runs (hooks, reviews) never get a companion

    /// Agent SDK runs (entrypoint "sdk-…") are automation such as review hooks, not sessions the user is in.
    static func isAutomated(_ path: String) -> Bool {
        guard let fh = FileHandle(forReadingAtPath: path) else { return false }
        defer { try? fh.close() }
        guard let data = try? fh.read(upToCount: 8192), let head = String(data: data, encoding: .utf8) else { return false }
        return head.contains("\"entrypoint\":\"sdk-")
    }

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

    /// Session logs that changed while the wallpaper was paused (path → when): parsed on resume, not per write.
    var pendingAgentPaths: [String: Date] = [:]
    func flushAgentActivity() {
        guard !pendingAgentPaths.isEmpty else { return }
        let pending = pendingAgentPaths; pendingAgentPaths = [:]
        noteAgentActivity(Array(pending.keys), at: pending)
    }
    func noteAgentActivity(_ paths: [String], at seen: [String: Date] = [:]) {
        guard engaged else {
            let now = Date()
            for p in paths where p.hasSuffix(".jsonl") { pendingAgentPaths[p] = now }
            return
        }
        for p in paths where p.hasSuffix(".jsonl") {
            let when = seen[p] ?? Date()
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
            // Subagent logs keep the session alive but only the main log says whose turn it is.
            let isMain = kind == "codex" || !p.contains("/subagents/")
            if kind == "claude" {
                if automatedSessions[key] == nil, isMain { automatedSessions[key] = App.isAutomated(p) }
                if automatedSessions[key] ?? false { continue }
            }
            var waiting = agentSessions[key]?.waiting
            if isMain { waiting = App.agentWaiting(p, kind) ? (waiting ?? when) : nil }
            agentSessions[key] = (kind, project, max(when, agentSessions[key]?.last ?? .distantPast), waiting)
        }
        pushAgents()
    }

    /// True when the newest entry in a session log means the agent is done or blocked on you.
    /// Reads the last 64 KB and looks only at structural fields.
    static func agentWaiting(_ path: String, _ kind: String) -> Bool {
        guard let fh = FileHandle(forReadingAtPath: path) else { return false }
        defer { try? fh.close() }
        let size = (try? fh.seekToEnd()) ?? 0
        try? fh.seek(toOffset: size > 65536 ? size - 65536 : 0)
        guard let data = try? fh.readToEnd(), let text = String(data: data, encoding: .utf8) else { return false }
        for line in text.split(separator: "\n").reversed() {
            guard let j = (try? JSONSerialization.jsonObject(with: Data(line.utf8))) as? [String: Any] else { continue }
            let type = j["type"] as? String ?? ""
            if kind == "codex" {
                guard type == "event_msg", let ev = (j["payload"] as? [String: Any])?["type"] as? String else { continue }
                if ev == "task_complete" || ev.hasSuffix("approval_request") { return true }
                if ev == "task_started" || ev == "user_message" { return false }
            } else {
                if type == "user" { return false }
                if type == "assistant" {
                    let stop = (j["message"] as? [String: Any])?["stop_reason"] as? String
                    return stop == "end_turn" || stop == "stop_sequence"
                }
            }
        }
        return false
    }

    /// "-Users-me-Documents-Projects-nia--claude-worktrees-x" → "nia"
    static func prettyProject(_ dir: String) -> String {
        var d = dir
        if let r = d.range(of: "--claude-worktrees") { d = String(d[..<r.lowerBound]) }
        if let r = d.range(of: "-Projects-", options: .backwards) { return String(d[r.upperBound...]) }
        return d.split(separator: "-").last.map(String.init) ?? ""
    }

    func pushAgents(force: Bool = false) {
        guard engaged || force else { return }   // a paused page gets the current list on resume
        let now = Date()
        agentSessions = agentSessions.filter { now.timeIntervalSince($0.value.last) < 90
            || ($0.value.waiting.map { now.timeIntervalSince($0) < App.attentionSeconds } ?? false) }
        var perKind: [String: Int] = [:]
        let list: [[String: Any]] = agentSessions.sorted { $0.key < $1.key }.compactMap { key, v in
            perKind[v.kind, default: 0] += 1
            guard perKind[v.kind]! <= 3 else { return nil }
            return ["id": String(UInt32(truncatingIfNeeded: key.hashValue), radix: 36), "kind": v.kind, "project": v.project,
                    "state": v.waiting.map { now.timeIntervalSince($0) < App.attentionSeconds } == true ? "attention"
                        : now.timeIntervalSince(v.last) < 12 ? "working" : "idle"]
        }
        let payload: [String: Any] = ["style": isPro ? companionStyle : "off", "list": isPro ? list : []]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8), force || json != lastAgentsJSON else { return }
        lastAgentsJSON = json
        windows.forEach { $0.js("__lw('agents',\(json))") }
    }

    // Breathing pattern for Calm · Breathe (box is the default).
    var breathPattern: String {
        get { defaults.string(forKey: "breathPattern") ?? "box" }
        set { defaults.set(newValue, forKey: "breathPattern") }
    }
    // Independent audio categories (on/off + level), mirrored into every scene.
    func audioPref(_ cat: String) -> (on: Bool, vol: Double) {
        (defaults.object(forKey: "audio.\(cat).on") as? Bool ?? true, defaults.object(forKey: "audio.\(cat).vol") as? Double ?? 1.0)
    }
    func pushAudioPrefs() {
        let parts = ["fx", "ambience", "weather"].map { c -> String in
            let p = audioPref(c); return "\(c):{on:\(p.on),vol:\(p.vol)}"
        }
        let js = "__lw('audio',{\(parts.joined(separator: ","))}); __lw('breath','\(breathPattern)')"
        windows.forEach { $0.js(js) }
    }

    var userPaused = false
    var pauseOnBattery: Bool {
        get { defaults.bool(forKey: "pauseOnBattery") }
        set { defaults.set(newValue, forKey: "pauseOnBattery") }
    }
    var onBattery = false
    var paused: Bool { userPaused }   // explicit Pause only; battery/away pauses are soft (see energyMode)

    func checkPower() {
        let snap = IOPSCopyPowerSourcesInfo().takeRetainedValue()
        let src = IOPSGetProvidingPowerSourceType(snap)?.takeUnretainedValue() as String?
        let now = src == kIOPMBatteryPowerKey
        if now != onBattery { onBattery = now; checkEngagement(); rebuildMenu() }
    }

    /// Pause = a soft pause: the scene stays loaded but stops drawing and shows a small
    /// "Paused · click to continue" pill (scenes that play audio — e.g. bowls auto-play — keep sounding).
    /// A click on the desktop continues.
    func applyPause() {
        if windows.contains(where: { $0.frozen }) { windows.forEach { $0.unfreeze() }; loadScene() }   // legacy hard freeze
        windows.forEach { $0.js("__lw('pauseReason','\(paused ? "user" : "")')") }
        setEngaged(!paused && engaged); if !paused { setEngaged(true); lastDesktopActivity = CACurrentMediaTime() }
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
        revalidateLicense()
        scheduleBreathReminders()
        startCycleTimer(timeView)
        startSceneCycle()
        refreshAddonRuntime()
        fetchCatalog()
        startAmbient()
        startMusicMode()
        startCompanions()
        // Generous tolerances let macOS coalesce these wakeups with others (they matter most while paused).
        Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in self?.pushAgents() }.tolerance = 0.5
        checkPower()
        Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in self?.checkPower() }.tolerance = 4
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.checkEngagement() }.tolerance = 0.2
        Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in if self?.engaged == true { self?.pushLayout() } }.tolerance = 1   // widgets moved/added
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
        sceneLinksReady = true
        drainSceneLinks()
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
            // menu-bar panel: open it, run JS in it, snapshot it, or open the native menu
            else if cmd == "panel" { if let b = self.status.button { self.panelHost.show(from: b) } }
            else if cmd == "panel-close" { self.panelHost.popover.performClose(nil) }
            else if cmd.hasPrefix("pjs:") {
                self.panelHost.web.evaluateJavaScript(String(cmd.dropFirst(4))) { r, e in
                    let out = e.map { "error: \($0)" } ?? String(describing: r ?? "nil")
                    try? out.write(toFile: "/tmp/livewall-dev.txt", atomically: true, encoding: .utf8)
                }
            } else if cmd.hasPrefix("psnap:") {
                let path = String(cmd.dropFirst(6))
                self.panelHost.web.takeSnapshot(with: nil) { img, _ in
                    guard let img, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
                          let png = rep.representation(using: .png, properties: [:]) else { return }
                    try? png.write(to: URL(fileURLWithPath: path))
                }
            } else if cmd.hasPrefix("interact:") {   // perf runs: scripted pointer through the real input path
                self.simulateInteraction(seconds: Double(cmd.dropFirst(9)) ?? 30)
            } else if cmd == "pause" || cmd == "resume" {   // perf runs: the real Pause menu path (host + page)
                self.userPaused = cmd == "pause"; self.applyPause()
            } else if cmd == "play-toggle" { self.playHost.toggle()
            } else if cmd == "state" {
                let d = (try? JSONSerialization.data(withJSONObject: self.panelState(), options: [.prettyPrinted])) ?? Data()
                try? d.write(to: URL(fileURLWithPath: "/tmp/livewall-dev.txt"))
            }
        }
    }

    /// Dev-only (LIVEWALL_DEV=1): drive the scene with a scripted pointer for `seconds`, sending exactly
    /// what real input sends (__lw move/down/up at ~90 Hz) so perf runs include the host → page cost.
    /// It never moves the real cursor or posts system events. Phases repeat every 8 s: fast sweeps,
    /// slow circling, a still pause (pets stalk/pounce, koi come to look), clicks, and a drag.
    var interactTimer: Timer?
    func simulateInteraction(seconds: Double) {
        interactTimer?.invalidate()
        guard let w = windows.first else { return }
        let W = Double(w.frame.width), H = Double(w.frame.height)
        let cx = W * 0.36, cy = H * 0.58, rx = W * 0.26, ry = H * 0.22   // inside the scene's clear area
        let t0 = CACurrentMediaTime()
        var down = false, lastClick = -1.0
        interactTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 90, repeats: true) { [weak self] t in
            guard let self else { t.invalidate(); return }
            let el = CACurrentMediaTime() - t0
            if el > seconds { if down { w.js("__lw('up',\(cx),\(cy))") }; t.invalidate(); self.interactTimer = nil; return }
            self.cursorOnDesktop = true; self.touchDesktop()
            let ph = el.truncatingRemainder(dividingBy: 8)
            var x = cx, y = cy
            switch ph {
            case ..<2:   x = cx + rx * sin(el * 3.1); y = cy + ry * sin(el * 4.3)            // fast sweeps
            case ..<4:   x = cx + rx * 0.5 * cos(el * 1.2); y = cy + ry * 0.5 * sin(el * 1.2)  // slow circling
            case ..<5.5: x = cx + rx * 0.3; y = cy + ry * 0.2                                 // hold still
            case ..<7:                                                                       // clicks
                x = cx - rx * 0.4 + (ph - 5.5) * 40; y = cy
                if el - lastClick > 0.5 { lastClick = el; w.js("__lw('down',\(x),\(y))"); w.js("__lw('up',\(x),\(y))") }
            default:                                                                         // drag
                x = cx - rx * 0.5 + (ph - 7) * rx; y = cy + ry * 0.3 * sin(ph * 6)
                if !down { down = true; w.js("__lw('down',\(x),\(y))") }
            }
            if ph < 7, down { down = false; w.js("__lw('up',\(x),\(y))") }
            w.js("__lw('move',\(x),\(y))")
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

    // macOS posts screen-parameter changes for many things that aren't a new display: EDR/HDR
    // headroom shifts (a video or bright content elsewhere), brightness, colour profile. Rebuilding
    // tore every web view down and reloaded the scene — the wallpaper flashed black, again and
    // again. Only rebuild when the set of displays changes; otherwise refit the windows in place.
    private var screensWork: DispatchWorkItem?
    @objc func screensChanged() {
        screensWork?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            let now = NSScreen.screens
            if now.map(\.displayID) == self.windows.map(\.screenID) {
                var resized = false
                for (w, screen) in zip(self.windows, now) where w.frame != screen.frame {
                    w.setFrame(screen.frame, display: true)
                    w.web.frame = NSRect(origin: .zero, size: screen.frame.size)
                    resized = true
                }
                // Nothing moved (the usual case: an EDR/brightness change): leave the scene alone.
                // A layout push makes scenes re-place their actors, e.g. cats teleport home.
                if resized { self.pushLayout(force: true) }
            } else { self.rebuildWindows() }
        }
        screensWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: work)
    }

    @objc func unlocked() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.windows.forEach { $0.orderFrontRegardless() }
            if Date().timeIntervalSince(self.lastWeatherFetch) > 10 * 60 { self.fetchWeather() }
            self.pushEnv()
        }
    }

    @objc func spaceChanged() {
        playHost.close(restoreFocus: false, immediate: true)
        windows.forEach { $0.orderFrontRegardless() }
    }

    func rebuildWindows() {
        playHost.close(immediate: true)
        windows.forEach { $0.retireWebView(); $0.close() }
        windows = NSScreen.screens.map { screen in
            let w = WallWindow(screen: screen, handler: self)
            w.orderFrontRegardless()
            return w
        }
        loadScene()
    }

    func loadScene() {
        playHost.close(immediate: true)
        if paused { rebuildMenu(); return }
        if !isPro, scenes.first(where: { $0.id == sceneID })?.pro == true { sceneID = "koi" }
        if sceneFile(sceneID) == nil { sceneID = "koi" }   // e.g. an add-on scene that was removed
        let (file, root) = sceneFile(sceneID) ?? (scenesDir.appendingPathComponent("koi.html"), scenesDir)
        if root != scenesDir { installRuntime(into: root) }   // add-on: keep its lw.js etc. current
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
            w.web.loadFileURL(c.url!, allowingReadAccessTo: root)
        }
        rebuildMenu()
    }

    // MARK: input forwarding

    var lastMoveSent = 0.0
    var lastDesktopCheck = 0.0
    var cursorOnDesktop = false
    var pendingMove = false

    func installMonitors() {
        setMoveMonitors(engaged)
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .leftMouseDown, handler: { [weak self] _ in self?.onButton("down") }) { monitors.append(m) }
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .leftMouseUp, handler: { [weak self] _ in self?.onButton("up") }) { monitors.append(m) }
        // Global monitors only see events posted to OTHER apps. Right after the user picks a scene in
        // our panel or menu, wallpap is the active app, so hover went dead until something else took
        // focus. setMoveMonitors also watches our own events, and we poll the pointer while we're active
        // as a backstop (some moves reach neither monitor when the active app has no key window).
        let nc = NotificationCenter.default
        nc.addObserver(forName: NSApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.startActivePointerPoll() }
        nc.addObserver(forName: NSApplication.didResignActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.stopActivePointerPoll() }
        if NSApp.isActive { startActivePointerPoll() }
    }

    /// Cursor-move monitors exist only while the wallpaper is engaged: a paused scene ignores hover (only a
    /// click continues it), and a global move monitor would wake the app for every move in every other app.
    private var moveMonitors: [Any] = []
    func setMoveMonitors(_ on: Bool) {
        guard on != !moveMonitors.isEmpty else { return }
        if !on { moveMonitors.forEach(NSEvent.removeMonitor); moveMonitors = []; return }
        let moveMask: NSEvent.EventTypeMask = [.mouseMoved, .leftMouseDragged]
        if let m = NSEvent.addGlobalMonitorForEvents(matching: moveMask, handler: { [weak self] _ in self?.onMove() }) { moveMonitors.append(m) }
        if let m = NSEvent.addLocalMonitorForEvents(matching: moveMask, handler: { [weak self] e in self?.onMove(); return e }) { moveMonitors.append(m) }
    }
    private var activePointerPoll: Timer?
    private var lastPolledPointer = NSPoint(x: -1, y: -1)
    func startActivePointerPoll() {
        guard activePointerPoll == nil, engaged else { return }   // paused: only a click wakes it
        // Event monitors can't see moves while WE are the active app; poll instead, while it matters.
        let t = Timer(timeInterval: 1.0 / 60, repeats: true) { [weak self] _ in
            guard let self else { return }
            let p = NSEvent.mouseLocation
            if p != self.lastPolledPointer { self.lastPolledPointer = p; self.onMove() }
        }
        RunLoop.main.add(t, forMode: .common)
        activePointerPoll = t
    }
    func stopActivePointerPoll() { activePointerPoll?.invalidate(); activePointerPoll = nil }

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
        if playHost.isOpen { return }
        if paused || !engaged { return }   // paused scenes ignore hover; only a click continues
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
        if playHost.isOpen { return }
        let p = NSEvent.mouseLocation
        if paused {   // a click on the desktop continues a paused wallpaper
            if type == "down", isDesktop(at: p) { userPaused = false; applyPause() }
            return
        }
        if type == "down" {
            downOnDesktop = isDesktop(at: p)
            cursorOnDesktop = downOnDesktop
            if downOnDesktop { touchDesktop(click: true) }
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
    let viewHours: [String: Double] = ["sunrise": 6.3, "day": 12, "sunset": 18.3, "evening": 19.6, "night": 0]
    /// Accelerated day cycles: scene-hours per real second. Slow = a whole day in an hour, Fast = in 8 minutes.
    var cycleRates: [String: Double] { ["slow": 24.0 / 3600, "fast": 24.0 / 480] }
    var timeView: String {
        get { let v = defaults.string(forKey: "timeView") ?? "auto"; return v == "auto" || viewHours[v] != nil || cycleRates[v] != nil ? v : "auto" }
        set { defaults.set(newValue, forKey: "timeView") }
    }
    var cycleStart: (Date, Double)?
    var cycleTimer: Timer?
    /// While a day cycle runs, push the advancing hour (fast: every 2 s, slow: every 10 s).
    func startCycleTimer(_ view: String) {
        cycleTimer?.invalidate(); cycleTimer = nil
        guard cycleRates[view] != nil else { return }
        cycleTimer = Timer.scheduledTimer(withTimeInterval: view == "fast" ? 2 : 10, repeats: true) { [weak self] _ in self?.pushEnv() }
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
        // Time-zone city first, always: until (or unless) a precise fix arrives, scenes would otherwise get
        // no location at all and fall back to a clock moon that ignores the real moonrise/moonset.
        if preciseLocation { loc.startUpdatingLocation() }
        locateByTimeZone()
        Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in self?.pushEnv() }.tolerance = 5
        Timer.scheduledTimer(withTimeInterval: 15 * 60, repeats: true) { [weak self] _ in self?.fetchWeather() }.tolerance = 30
        scheduleReminders()
    }

    func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        guard let c = locs.last?.coordinate else { return }
        coord = c
        weatherPlace = "your location"
        pushEnv()
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
                self.pushEnv()
                self.rebuildMenu()
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
            loc.stopUpdatingLocation(); coord = nil; pushEnv(); locateByTimeZone()
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

    func pushEnv(force: Bool = false) {
        guard engaged || force else { return }   // paused: engagementChanged() pushes on resume
        var e = env
        e["view"] = timeView
        if let c = coord { e["location"] = ["latitude": c.latitude, "longitude": c.longitude, "approximate": weatherPlace != "your location"] as [String: Any] }
        else { e["location"] = NSNull() }
        let d = Calendar.current.dateComponents([.hour, .minute], from: Date())
        let clock = Double(d.hour ?? 12) + Double(d.minute ?? 0) / 60
        if let rate = cycleRates[timeView] {
            // Starts from the real time when chosen and runs on from there.
            if cycleStart == nil { cycleStart = (Date(), clock) }
            let (t0, h0) = cycleStart!
            e["hour"] = (h0 + Date().timeIntervalSince(t0) * rate).truncatingRemainder(dividingBy: 24)
            e["view"] = "cycle"
        } else {
            cycleStart = nil
            e["hour"] = viewHours[timeView] ?? clock
        }
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
            self.fireReminder(self.reminderCount % 3 == 0 ? "stretch" : "water")
        }
    }

    func sendReminder(_ kind: String) { windows.forEach { $0.js("__lw('reminder','\(kind)')") } }

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        // Sandboxed subframes must never reach ANY scene/native capability.
        guard message.frameInfo.isMainFrame else { return }
        if let d = message.body as? [String: Any], d["type"] as? String == "play" { playHost.handle(message, body: d); return }
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
        guard let data = try? JSONSerialization.data(withJSONObject: effectiveSceneSettings()),
              let json = String(data: data, encoding: .utf8) else { return }
        windows.forEach { $0.js("__lw('settings',\(json))") }
    }
    func sendAction(_ name: String) { windows.forEach { $0.js("__lw('action','\(name)')") } }

    // If WebKit kills the page process (memory pressure, crash), the window would stay
    // black — reload the scene instead.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(PlayNavigation.allows(sourceMain: action.sourceFrame.isMainFrame, targetMain: action.targetFrame?.isMainFrame, url: action.request.url) ? .allow : .cancel)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if playHost.window?.web === webView { playHost.close(immediate: true) }
        NSLog("wallpap: scene process terminated — reloading")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.loadScene() }
    }

    // Page loaded → hand it the current env + its saved settings.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pushEnv(force: true)
        pushSettings()
        webView.evaluateJavaScript("__lw('perf',{fps:\(fps)}); __lw('focus',\(engaged)); __lw('nowplaying',\(lastNowPlayingJSON.isEmpty ? "null" : lastNowPlayingJSON))", completionHandler: nil)
        pushSoundscape()
        pushAudioPrefs()
        if !lastAgentsJSON.isEmpty { webView.evaluateJavaScript("__lw('agents',\(lastAgentsJSON))", completionHandler: nil) }
        pushLayout(force: true)
    }

    // MARK: menu

    func buildStatusItem() {
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let b = status.button {
            b.image = NSImage(systemSymbolName: "water.waves", accessibilityDescription: "wallpap")
            b.image?.isTemplate = true
        }
        attachPanel()
        rebuildMenu()
    }

    /// Separator + small grey section title (native section header on macOS 14+).
    func section(_ title: String, in menu: NSMenu) {
        if menu.numberOfItems > 0 { menu.addItem(.separator()) }
        if #available(macOS 14, *) { menu.addItem(.sectionHeader(title: title)); return }
        let h = NSMenuItem(title: title.uppercased(), action: nil, keyEquivalent: "")
        h.isEnabled = false
        menu.addItem(h)
    }

    func rebuildMenu() {
        let menu = NSMenu()
        let header = NSMenuItem(title: isPro ? "wallpap Pro" : "wallpap", action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)
        let play = NSMenuItem(title: playHost.isOpen ? "Close Play" : "Play…", action: #selector(togglePlay), keyEquivalent: "")
        play.target = self; if playHost.unavailableReason != nil { play.action = nil }; play.isEnabled = playHost.unavailableReason == nil; play.toolTip = playHost.unavailableReason
        menu.addItem(play)
        let counts = NSMenuItem(title: "Share anonymous usage counts", action: #selector(togglePlayCounts), keyEquivalent: "")
        counts.target = self; counts.state = sharePlayCounts ? .on : .off
        counts.toolTip = "Daily totals only. No identifiers, puzzle answers or article links."
        menu.addItem(counts)
        if !isPro {
            let up = NSMenuItem(title: "Unlock Pro — $5 one-time…", action: #selector(openPro), keyEquivalent: "")
            up.target = self
            menu.addItem(up)
            let key = NSMenuItem(title: "Enter License Key…", action: #selector(enterLicense), keyEquivalent: "")
            key.target = self
            menu.addItem(key)
        }
        section("Scene", in: menu)
        // Only offer scenes whose file is actually present.
        let available = scenes.filter { sceneFile($0.id) != nil }
        func sceneItem(_ s: Scene) -> NSMenuItem {
            let item = NSMenuItem(title: s.title, action: #selector(pickScene(_:)), keyEquivalent: s.key)
            if s.music { item.image = NSImage(systemSymbolName: "music.note", accessibilityDescription: "Plays your music") }
            item.representedObject = s.id
            item.state = s.id == sceneID ? .on : .off
            item.target = self
            if s.pro { lock(item) }
            return item
        }
        // One submenu per category; the active scene's category shows a dash.
        for cat in categories {
            let inCat = available.filter { $0.category == cat }
            guard !inCat.isEmpty else { continue }
            let cItem = NSMenuItem(title: cat, action: nil, keyEquivalent: "")
            let cMenu = NSMenu()
            inCat.forEach { cMenu.addItem(sceneItem($0)) }
            cItem.submenu = cMenu
            if inCat.contains(where: { $0.id == sceneID }) {
                cItem.state = .on
                cItem.title = "\(cat) — \(inCat.first { $0.id == sceneID }!.title)"
            }
            menu.addItem(cItem)
        }
        addSceneItems(to: menu)
        let cyItem = NSMenuItem(title: "Change Scene Automatically", action: nil, keyEquivalent: "")
        let cyMenu = NSMenu()
        for (label, m) in App.cycleChoices {
            let it = NSMenuItem(title: m == 0 ? "Off" : "Every \(label)", action: #selector(pickSceneCycle(_:)), keyEquivalent: "")
            it.tag = m; it.state = sceneCycleMinutes == m ? .on : .off; it.target = self
            cyMenu.addItem(it)
        }
        cyMenu.addItem(.separator())
        for (label, v) in [("From All Scenes", "all"), ("From This Category", "category")] {
            let it = NSMenuItem(title: label, action: #selector(pickSceneCycleScope(_:)), keyEquivalent: "")
            it.representedObject = v; it.state = sceneCycleScope == v ? .on : .off; it.target = self
            cyMenu.addItem(it)
        }
        let sh = NSMenuItem(title: "Shuffle", action: #selector(toggleSceneCycleShuffle), keyEquivalent: "")
        sh.state = sceneCycleShuffle ? .on : .off; sh.target = self
        cyMenu.addItem(sh)
        cyMenu.addItem(.separator())
        let nx = NSMenuItem(title: "Next Scene Now", action: #selector(nextSceneNow), keyEquivalent: "n")
        nx.target = self
        cyMenu.addItem(nx)
        cyItem.submenu = cyMenu
        menu.addItem(cyItem)
        let compItem = NSMenuItem(title: "AI Companions", action: nil, keyEquivalent: "")
        let compMenu = NSMenu()
        for (label, v) in [("Off", "off"), ("On (Koi Pond)", "native")] {
            let it = NSMenuItem(title: label, action: #selector(pickCompanions(_:)), keyEquivalent: "")
            it.representedObject = v
            it.state = companionStyle == v ? .on : .off
            it.target = self
            compMenu.addItem(it)
        }
        compItem.submenu = compMenu
        lock(compItem)
        menu.addItem(compItem)
        section("Environment", in: menu)
        let viewItem = NSMenuItem(title: "Time of Day", action: nil, keyEquivalent: "")
        let viewMenu = NSMenu()
        for (label, value) in [("Live — Local Time", "auto"), ("Day Cycle — Slow (a day per hour)", "slow"), ("Day Cycle — Fast (a day in 8 min)", "fast"), ("Sunrise", "sunrise"), ("Day", "day"), ("Sunset", "sunset"), ("Evening", "evening"), ("Night", "night")] {
            let item = NSMenuItem(title: label, action: #selector(pickTimeView(_:)), keyEquivalent: "")
            item.representedObject = value
            item.state = timeView == value ? .on : .off
            item.target = self
            viewMenu.addItem(item)
        }
        viewItem.submenu = viewMenu
        menu.addItem(viewItem)
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
        let lItem = NSMenuItem(title: "Keep Clear for Widgets", action: nil, keyEquivalent: "")
        let lMenu = NSMenu()
        let det = NSMenuItem(title: "Detected: \(layoutSummary())", action: nil, keyEquivalent: ""); det.isEnabled = false
        lMenu.addItem(det); lMenu.addItem(.separator())
        for (label, v) in [("Auto (follow my widgets)", "auto"), ("Right Side", "right"), ("Left Side", "left"), ("Off — use the full screen", "off")] {
            let it = NSMenuItem(title: label, action: #selector(pickLayoutMode(_:)), keyEquivalent: "")
            it.representedObject = v; it.state = layoutMode == v ? .on : .off; it.target = self
            lMenu.addItem(it)
        }
        lMenu.addItem(.separator())
        let ic = NSMenuItem(title: "Also Avoid My Desktop Icons", action: #selector(toggleAvoidIcons), keyEquivalent: "")
        ic.state = avoidIcons ? .on : .off; ic.target = self
        lMenu.addItem(ic)
        lItem.submenu = lMenu
        menu.addItem(lItem)
        section("Sound & Music", in: menu)
        let mute = NSMenuItem(title: "Sound On", action: #selector(toggleMute), keyEquivalent: "s")
        mute.state = muted ? .off : .on
        mute.target = self
        menu.addItem(mute)
        let sounds = NSMenuItem(title: "Sound Levels", action: nil, keyEquivalent: "")
        let sMenu = NSMenu()
        for (label, c) in [("Interaction Sounds", "fx"), ("Scene Ambience", "ambience"), ("Weather Sounds", "weather")] {
            let p = audioPref(c)
            let it = NSMenuItem(title: label, action: nil, keyEquivalent: "")
            let sub = NSMenu()
            let onItem = NSMenuItem(title: "On", action: #selector(toggleAudioCat(_:)), keyEquivalent: "")
            onItem.representedObject = c; onItem.state = p.on ? .on : .off; onItem.target = self
            sub.addItem(onItem); sub.addItem(.separator())
            for (vl, v) in [("Quiet", 0.4), ("Medium", 0.7), ("Full", 1.0)] {
                let vi = NSMenuItem(title: vl, action: #selector(pickAudioVol(_:)), keyEquivalent: "")
                vi.representedObject = [c, v]; vi.state = abs(p.vol - v) < 0.01 ? .on : .off; vi.target = self
                sub.addItem(vi)
            }
            it.submenu = sub
            it.state = p.on ? .on : .off
            sMenu.addItem(it)
        }
        sounds.submenu = sMenu
        menu.addItem(sounds)
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
        let curMusic = scenes.first { $0.id == sceneID }?.music ?? false
        let music = NSMenuItem(title: "Music Mode (Music / Spotify)", action: #selector(toggleMusicMode), keyEquivalent: "")

        music.state = musicMode ? .on : .off
        music.target = self
        lock(music)
        menu.addItem(music)
        if musicMode && !curMusic {
            let hint = NSMenuItem(title: "This scene has no music player — try one marked with a note", action: nil, keyEquivalent: "")
            hint.isEnabled = false; hint.indentationLevel = 1
            menu.addItem(hint)
        }
        if isPro && musicMode && musicPermissionDenied {
            let fix = NSMenuItem(title: "Allow wallpap to control Music/Spotify…", action: #selector(openAutomationSettings), keyEquivalent: "")
            fix.indentationLevel = 1
            fix.image = NSImage(systemSymbolName: "exclamationmark.triangle", accessibilityDescription: nil)
            fix.target = self
            menu.addItem(fix)
        }
        if isPro && musicMode {
            let bs = NSMenuItem(title: "Beat Sync — react to the music", action: #selector(toggleBeatSync), keyEquivalent: "")
            bs.state = beatSyncOn ? .on : .off
            bs.indentationLevel = 1
            bs.toolTip = "Listens to system audio (on-device, nothing recorded) so scenes move with the beat. Needs Screen & System Audio Recording permission."
            bs.target = self
            menu.addItem(bs)
        }
        section("Wellbeing", in: menu)
        let calmItem = NSMenuItem(title: "Calm · Breathe", action: #selector(toggleCalm), keyEquivalent: "b")
        calmItem.state = calm ? .on : .off
        calmItem.target = self
        lock(calmItem)
        menu.addItem(calmItem)
        if isPro {
            let bp = NSMenuItem(title: "Breathing Pattern", action: nil, keyEquivalent: "")
            let bpMenu = NSMenu()
            for (label, v) in [("Box — in · hold · out · hold (4-4-4-4)", "box"), ("Calm — in 4 · out 6", "calm"), ("Relax — 4-7-8", "478")] {
                let it = NSMenuItem(title: label, action: #selector(pickBreath(_:)), keyEquivalent: "")
                it.representedObject = v
                it.state = breathPattern == v ? .on : .off
                it.target = self
                bpMenu.addItem(it)
            }
            bp.submenu = bpMenu
            bp.indentationLevel = 1
            menu.addItem(bp)
        }
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
        let brItem = NSMenuItem(title: "Breathe Reminder", action: nil, keyEquivalent: "")
        let brMenu = NSMenu()
        for m in [0, 60, 90, 120] {
            let it = NSMenuItem(title: m == 0 ? "Off" : "Every \(m) min", action: #selector(pickBreathReminder(_:)), keyEquivalent: "")
            it.tag = m; it.state = breathMinutes == m ? .on : .off; it.target = self
            brMenu.addItem(it)
        }
        brItem.submenu = brMenu
        lock(brItem)
        menu.addItem(brItem)
        let over = NSMenuItem(title: "Show Reminders Over My Apps", action: #selector(toggleRemindersOverApps), keyEquivalent: "")
        over.state = remindersOverApps ? .on : .off; over.target = self
        over.toolTip = "When the desktop is covered, reminders appear as a small card under the menu bar."
        lock(over)
        menu.addItem(over)
        section("Performance", in: menu)
        let pause = NSMenuItem(title: "Pause Animation", action: #selector(togglePause), keyEquivalent: "p")
        pause.state = paused ? .on : .off
        pause.target = self
        menu.addItem(pause)
        let eItem = NSMenuItem(title: "Energy", action: nil, keyEquivalent: "")
        let eMenu = NSMenu()
        for (label, v) in [("Always On", "always"), ("Auto-Pause When Away", "away"), ("Pause on Battery", "battery")] {
            let it = NSMenuItem(title: label, action: #selector(pickEnergy(_:)), keyEquivalent: "")
            it.representedObject = v; it.state = energyMode == v ? .on : .off; it.target = self
            eMenu.addItem(it)
        }
        eMenu.addItem(.separator())
        let hdr = NSMenuItem(title: "Pause After", action: nil, keyEquivalent: ""); hdr.isEnabled = false
        eMenu.addItem(hdr)
        for (label, secs) in App.awayChoices {
            let it = NSMenuItem(title: secs == App.awayRecommended ? "\(label) (recommended)" : label, action: #selector(pickAway(_:)), keyEquivalent: "")
            it.tag = secs; it.state = energyMode == "away" && awaySeconds == secs ? .on : .off; it.target = self
            it.indentationLevel = 1
            eMenu.addItem(it)
        }
        eMenu.addItem(.separator())
        let note = NSMenuItem(title: "Paused scenes stay as they are — click the desktop to resume", action: nil, keyEquivalent: ""); note.isEnabled = false
        eMenu.addItem(note)
        eItem.submenu = eMenu
        menu.addItem(eItem)
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
        for e in catalogOffers() {
            let busy = installingScenes.contains(e.id)
            let it = NSMenuItem(title: busy ? "Downloading \(e.title)…" : "Get New Scene: \(e.title)", action: busy ? nil : #selector(installScene(_:)), keyEquivalent: "")
            it.representedObject = e.id; it.target = self
            menu.addItem(it)
        }
        let addF = NSMenuItem(title: "Add Scene Folder…", action: #selector(addSceneFolder), keyEquivalent: "")
        addF.target = self
        menu.addItem(addF)
        let openF = NSMenuItem(title: "Open Scenes Folder", action: #selector(openScenesFolder), keyEquivalent: "")
        openF.target = self
        menu.addItem(openF)
        let reload = NSMenuItem(title: "Reload Scene", action: #selector(reloadScene), keyEquivalent: "r")
        reload.target = self
        menu.addItem(reload)
        menu.addItem(.separator())
        if licensed {
            let lic = NSMenuItem(title: "Deactivate License on This Mac", action: #selector(deactivateLicense), keyEquivalent: "")
            lic.target = self
            menu.addItem(lic)
        }
        let login = NSMenuItem(title: "Open at Login", action: #selector(toggleLogin), keyEquivalent: "")
        login.target = self
        if #available(macOS 13, *) { login.state = SMAppService.mainApp.status == .enabled ? .on : .off }
        menu.addItem(login)
        let quit = NSMenuItem(title: "Quit wallpap", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        menu.addItem(quit)
        panelHost.nativeMenu = menu   // shown on right-click / ⌥-click (see Panel.swift)
        panelHost.push()
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
        // Looks (skins) first: free users get the first; others are marked Pro and open the store.
        let sk = skins(for: sceneID)
        if sk.count > 1 {
            let cur = currentSkin(sceneID) ?? sk[0].0
            choice("Look", key: skinKeyFor(sceneID), options: sk.enumerated().map { (i, s) in (i > 0 && !isPro ? "\(s.1) · Pro" : s.1, s.0 as Any) }, defaultValue: cur)
        }
        if petScenes.contains(sceneID) { choice("Pets", key: "pets", options: [("On", true), ("Off", false)], defaultValue: true) }
        switch sceneID {
        case "bowls":
            choice("Auto Play", key: "auto", options: [("Off", "off"), ("Focus", "focus"), ("Meditate", "meditate"), ("Sleep", "sleep")], defaultValue: "off")
            choice("Bowls", key: "set", options: [("Tibetan · 7", "tibetan7"), ("Tibetan · 9", "tibetan9"), ("Crystal", "crystal"), ("Mixed", "mixed")], defaultValue: "tibetan7")
            choice("Sleep Timer", key: "sleepMinutes", options: [("15 min", 15), ("30 min", 30), ("45 min", 45), ("60 min", 60), ("90 min", 90)], defaultValue: 45)
        case "koi":
            action("Drop Food", "feed")
        case "cats":
            action("Feed the Cats", "feed")
            action("Fill the Water Bowl", "water")
            action("Toss a Toy", "toy")
        case "grass":
            action("Give Bamboo", "bamboo")
            choice("Pandas", key: "pandas", options: [("1", 1), ("2", 2), ("3", 3)], defaultValue: 3)
            choice("Kites", key: "kites", options: [("None", 0), ("1", 1), ("2", 2), ("3", 3)], defaultValue: 2)
            choice("Songbirds", key: "birds", options: [("On", 1), ("Off", 0)], defaultValue: 1)
        case "cafe", "speakeasy":
            action("Pet the Cat", "pet")
        case "records", "ramen":
            action("Pet the Cat", "pet")
        case "rooftop":
            action("Pet the Cat", "pet")
            action("Fireworks (night, clear sky)", "fireworks")
        case "cabin":
            action("Pet the Dog", "pet")
            choice("Season", key: "season", options: [("Auto", "auto"), ("Winter", "winter"), ("Summer", "summer")], defaultValue: "auto")
        case "bowls":
            break
        case "cymatics":
            if (currentSkin("cymatics") ?? "sand") == "sand" { choice("Plate", key: "plate", options: [("Auto", "auto"), ("Square", "square"), ("Round", "round")], defaultValue: "auto") }
        case "drive":
            action("Flash High Beams", "beams")
            action("Honk", "horn")
            action("Faster", "faster")
            action("Slower", "slower")
            action("New Road", "newroad")
        default: break
        }
        if sceneID == "bowls" { action("Strike a Bowl", "strike") }
        // Scenes with a music player respond to transport actions while Music Mode is on.
        if musicMode, ["cafe", "speakeasy", "records", "ramen", "rooftop", "cabin", "cymatics", "drive", "kinetic", "fluids", "skies"].contains(sceneID) {
            action("Play / Pause", "playpause")
            action("Next Track", "next")
        }
    }

    @objc func pickSetting(_ item: NSMenuItem) {
        guard let kv = item.representedObject as? [Any], let key = kv.first as? String else { return }
        if key == skinKeyFor(sceneID), !isPro, let v = kv[1] as? String, v != skins(for: sceneID).first?.0 { openPro(); return }
        setSetting(key, kv[1])
    }
    @objc func runAction(_ item: NSMenuItem) {
        if let name = item.representedObject as? String { sendAction(name) }
    }

    @objc func pickScene(_ item: NSMenuItem) {
        guard let id = item.representedObject as? String, let scene = scenes.first(where: { $0.id == id }) else { return }
        guard !scene.pro || isPro else { openPro(); return }
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
        userPaused.toggle()
        applyPause()
    }
    @objc func pickEnergy(_ item: NSMenuItem) {
        energyMode = item.representedObject as? String ?? "away"
        setEngaged(true); lastDesktopActivity = CACurrentMediaTime(); rebuildMenu()
    }
    @objc func pickAway(_ item: NSMenuItem) { awaySeconds = item.tag; energyMode = "away"; rebuildMenu() }
    @objc func pickBreath(_ item: NSMenuItem) {
        breathPattern = item.representedObject as? String ?? "box"
        pushAudioPrefs(); rebuildMenu()
    }
    @objc func toggleAudioCat(_ item: NSMenuItem) {
        guard let c = item.representedObject as? String else { return }
        defaults.set(!audioPref(c).on, forKey: "audio.\(c).on")
        pushAudioPrefs(); rebuildMenu()
    }
    @objc func pickAudioVol(_ item: NSMenuItem) {
        guard let kv = item.representedObject as? [Any], let c = kv.first as? String, let v = kv.last as? Double else { return }
        defaults.set(v, forKey: "audio.\(c).vol"); defaults.set(true, forKey: "audio.\(c).on")
        pushAudioPrefs(); rebuildMenu()
    }
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
    @objc func toggleMusicMode() { musicMode.toggle(); startMusicMode(); updateBeatSync(); rebuildMenu() }
    @objc func toggleBeatSync() { beatSyncOn.toggle(); updateBeatSync(); rebuildMenu() }

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

    @objc func pickTimeView(_ item: NSMenuItem) {
        let value = item.representedObject as? String ?? "auto"
        guard value == "auto" || viewHours[value] != nil || cycleRates[value] != nil else { return }
        cycleStart = nil
        startCycleTimer(value)
        timeView = value
        pushEnv()
        rebuildMenu()
    }

    @objc func pickWeather(_ item: NSMenuItem) {
        let w = item.representedObject as? String ?? ""
        weatherOverride = w.isEmpty ? nil : w
        pushEnv()
        rebuildMenu()
    }

    @objc func pickReminder(_ item: NSMenuItem) { waterMinutes = item.tag; rebuildMenu() }
    @objc func remindNow() { fireReminder("water") }

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

// This command-line check returns before NSApplication, defaults, monitors or windows exist.
if CommandLine.arguments.contains("--play-resource-check") {
    guard let root = ProcessInfo.processInfo.environment["LIVEWALL_SCENES"] else { fputs("LIVEWALL_SCENES is required\n", stderr); exit(2) }
    let url = URL(fileURLWithPath: root)
    for file in ["play/play.js", "play/card-sdk.js", "play/catalog.js", "play/feeds.json", "play/house-ads.json", "play/cards/word-of-the-day/data/words.json", "play/cards/crossword-of-the-day/data/2026.json"] {
        guard FileManager.default.fileExists(atPath: url.appendingPathComponent(file).path) else { fputs("Missing Play resource\n", stderr); exit(2) }
    }
    guard PlayConfig.analyticsEndpoint.isEmpty else { fputs("Expected unconfigured endpoint\n", stderr); exit(2) }
    print("Play resource check PASS: bundled shell, SDK, cards, content, feeds and house ads; analytics endpoint empty. No app windows created.")
    exit(0)
}
let app = NSApplication.shared
let delegate = App()
app.delegate = delegate
app.run()
