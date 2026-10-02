// Menu-bar panel: clicking the status icon opens a frosted control panel (scenes/menu.html),
// styled after wallpap.live's control column. Right-click or ⌥-click opens the full native menu.
// The panel only calls the existing menu actions, so behaviour stays in one place (main.swift).
import AppKit
import WebKit
import ServiceManagement

final class PanelHost: NSObject, WKScriptMessageHandler {
    unowned let app: App
    let popover = NSPopover()
    let web: WKWebView
    var nativeMenu = NSMenu()
    var ready = false

    init(app: App) {
        self.app = app
        let cfg = WKWebViewConfiguration()
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 340, height: 600), configuration: cfg)
        super.init()
        cfg.userContentController.add(self, name: "panel")
        web.setValue(false, forKey: "drawsBackground")
        let vc = NSViewController()
        vc.view = web
        popover.contentViewController = vc
        popover.contentSize = web.frame.size
        popover.behavior = .transient
        popover.appearance = NSAppearance(named: .aqua)   // the panel's palette is light, like the site
    }

    var pageURL: URL { app.scenesDir.appendingPathComponent("menu.html") }
    var available: Bool { FileManager.default.fileExists(atPath: pageURL.path) }

    func show(from button: NSStatusBarButton) {
        if web.url == nil { ready = false; web.loadFileURL(pageURL, allowingReadAccessTo: app.scenesDir) }
        else { push() }
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        NSApp.activate(ignoringOtherApps: true)   // so the transient popover closes on an outside click
    }

    func push() {
        guard ready, popover.isShown,
              let data = try? JSONSerialization.data(withJSONObject: app.panelState()),
              let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("render(\(json))")
    }

    // Selectors the page may call. Ones ending in ":" receive a stand-in NSMenuItem carrying
    // the value (representedObject) and tag, exactly as their real menu item would.
    static let allowed: Set<String> = [
        "pickScene:", "pickSetting:", "runAction:", "pickTimeView:", "pickWeather:", "togglePreciseLocation",
        "toggleMute", "toggleMusicMode", "toggleBeatSync", "openAutomationSettings", "pickSoundscape:",
        "pickSoundscapeVolume:", "toggleAudioCat:", "pickAudioVol:", "toggleCalm", "pickBreath:", "pickReminder:",
        "remindNow", "pickCompanions:", "togglePause", "pickFps:", "togglePauseWhenIdle", "togglePauseOnBattery",
        "toggleLogin", "reloadScene", "openPro", "enterLicense", "installScene:", "addSceneFolder", "openScenesFolder",
    ]

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let d = message.body as? [String: Any], let a = d["a"] as? String else { return }
        let v = d["v"].flatMap { $0 is NSNull ? nil : $0 }
        switch a {
        case "ready": ready = true; push(); return
        case "height":
            let maxH = (NSScreen.main?.visibleFrame.height ?? 900) - 40
            if let h = v as? Double { popover.contentSize = NSSize(width: 340, height: min(h, maxH)) }
            return
        case "quit": NSApp.terminate(nil); return
        case "showNativeMenu":
            popover.performClose(nil)
            DispatchQueue.main.async { self.app.openNativeMenu() }
            return
        default: break
        }
        // The page names actions without the selector's trailing ":" (pickWeather → pickWeather:).
        guard let a = [a, a + ":"].first(where: Self.allowed.contains) else { return }
        let sel = NSSelectorFromString(a)
        guard app.responds(to: sel) else { return }
        if a.hasSuffix(":") {
            let item = NSMenuItem()
            item.representedObject = v
            if let t = d["tag"] as? Int { item.tag = t }
            app.perform(sel, with: item)
        } else {
            app.perform(sel)
        }
        if a == "openPro" { popover.performClose(nil) }
        push()
    }
}

private var panelHostStorage: PanelHost?

extension App {
    var panelHost: PanelHost {
        if let p = panelHostStorage { return p }
        let p = PanelHost(app: self)
        panelHostStorage = p
        return p
    }

    /// Left-click → panel; right-click / ⌥-click (or no panel page shipped) → native menu.
    func attachPanel() {
        guard let b = status.button else { return }
        b.target = self
        b.action = #selector(statusClicked(_:))
        b.sendAction(on: [.leftMouseUp, .rightMouseUp])
    }

    @objc func statusClicked(_ sender: Any?) {
        let e = NSApp.currentEvent
        let wantsMenu = e?.type == .rightMouseUp || e?.modifierFlags.contains(.option) == true || e?.modifierFlags.contains(.control) == true
        let host = panelHost
        if host.popover.isShown { host.popover.performClose(nil); return }
        if wantsMenu || !host.available { openNativeMenu(); return }
        if let b = status.button { host.show(from: b) }
    }

    func openNativeMenu() {
        status.menu = panelHost.nativeMenu
        status.button?.performClick(nil)   // tracks the menu until it closes
        status.menu = nil
    }

    /// Everything the panel shows, as plain JSON values.
    func panelState() -> [String: Any] {
        let avail = scenes.filter { sceneFile($0.id) != nil }
        let builtin = Set(builtinScenes.map(\.id))
        // Scene-specific controls come from the same builder as the native menu.
        let m = NSMenu()
        addSceneItems(to: m)
        let sceneCtl: [[String: Any]] = m.items.compactMap { it in
            if let sub = it.submenu {
                return ["type": "choice", "title": it.title,
                        "options": sub.items.map { ["label": $0.title, "on": $0.state == .on, "v": $0.representedObject ?? NSNull()] }]
            }
            if it.action == #selector(runAction(_:)) { return ["type": "action", "title": it.title, "v": it.representedObject ?? ""] }
            return nil
        }
        let live = (env["weather"] as? String) ?? "clear"
        let temp = (env["temp"] as? Double).map { " · \(Int($0.rounded()))°" } ?? ""
        let place = weatherPlace.isEmpty ? "" : " (\(weatherPlace))"
        var login = false
        if #available(macOS 13, *) { login = SMAppService.mainApp.status == .enabled }
        return [
            "pro": isPro, "scene": sceneID, "categories": categories,
            "scenes": avail.map { s -> [String: Any] in
                var d: [String: Any] = ["id": s.id, "title": s.title, "cat": s.category, "pro": s.pro]
                if !builtin.contains(s.id) { d["thumb"] = addonThumb(s.id) ?? "" }
                return d
            },
            "offers": catalogOffers().map { ["id": $0.id, "title": $0.title, "cat": $0.category, "pro": $0.pro,
                                             "thumb": $0.thumb?.absoluteString ?? "", "busy": installingScenes.contains($0.id)] },
            "sceneCtl": sceneCtl,
            "timeView": timeView, "weather": weatherOverride ?? "", "precise": preciseLocation,
            "liveWeather": isPro ? (coord == nil ? "Live · locating…" : "Live — \(live)\(temp)\(place)") : "",
            "muted": muted,
            "audio": ["fx", "ambience", "weather"].map { ["c": $0, "on": audioPref($0).on, "vol": audioPref($0).vol] },
            "soundscape": soundscape, "ssVol": soundscapeVolume,
            "music": musicMode, "musicDenied": musicPermissionDenied, "beat": beatSyncOn,
            "companions": companionStyle, "calm": calm, "breath": breathPattern, "water": waterMinutes,
            "paused": paused, "userPaused": userPaused, "pob": pauseOnBattery, "idle": pauseWhenIdle, "fps": fps,
            "login": login,
        ]
    }
}
