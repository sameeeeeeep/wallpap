// Wellbeing reminders that reach the user even when the wallpaper is covered.
// Water (every N min; every third one is a stretch) and Breathe (every N min) timers fire the scene's
// own in-world reminder as before. With "Also over my apps" on, a small card (scenes/card.html) slides
// in just below the menu bar when the desktop isn't in view: Done / Snooze, and Breathe opens a
// one-minute guide inside the card using the chosen pattern.
import AppKit
import WebKit

final class ReminderCard: NSObject, WKScriptMessageHandler {
    unowned let app: App
    let panel: NSPanel
    let web: WKWebView
    var hideTimer: Timer?
    var hovering = false

    init(app: App) {
        self.app = app
        let cfg = WKWebViewConfiguration()
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 320, height: 96), configuration: cfg)
        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 320, height: 96),
                        styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: true)
        super.init()
        cfg.userContentController.add(self, name: "card")
        web.setValue(false, forKey: "drawsBackground")
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.hidesOnDeactivate = false
        panel.contentView = web
    }

    func show(kind: String, text: String) {
        var c = URLComponents(url: app.scenesDir.appendingPathComponent("card.html"), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "kind", value: kind), URLQueryItem(name: "text", value: text),
                        URLQueryItem(name: "pattern", value: app.breathPattern)]
        web.loadFileURL(c.url!, allowingReadAccessTo: app.scenesDir)
        resize(height: 96)
        panel.alphaValue = 0
        panel.orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { $0.duration = 0.25; panel.animator().alphaValue = 1 }
        scheduleHide(14)
    }

    func resize(height: CGFloat) {
        // Under the status item on the screen that has the menu bar; right-aligned to the icon.
        let screen = NSScreen.screens.first ?? NSScreen.main!
        var x = screen.visibleFrame.maxX - 320 - 10
        if let b = app.status.button, let w = b.window {
            let r = w.convertToScreen(b.convert(b.bounds, to: nil))
            x = min(max(screen.frame.minX + 10, r.midX - 160), screen.visibleFrame.maxX - 330)
        }
        let y = screen.visibleFrame.maxY - height - 8
        panel.setFrame(NSRect(x: x, y: y, width: 320, height: height), display: true, animate: panel.isVisible)
    }

    func scheduleHide(_ secs: Double) {
        hideTimer?.invalidate()
        hideTimer = Timer.scheduledTimer(withTimeInterval: secs, repeats: false) { [weak self] _ in
            guard let self else { return }
            if self.hovering { self.scheduleHide(4) } else { self.hide() }
        }
    }

    func hide() {
        hideTimer?.invalidate()
        NSAnimationContext.runAnimationGroup({ $0.duration = 0.3; panel.animator().alphaValue = 0 },
                                             completionHandler: { [weak self] in self?.panel.orderOut(nil) })
    }

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let d = message.body as? [String: Any], let a = d["a"] as? String else { return }
        switch a {
        case "done", "close": hide()
        case "snooze":
            hide()
            let kind = d["kind"] as? String ?? "water"
            Timer.scheduledTimer(withTimeInterval: 600, repeats: false) { [weak self] _ in self?.app.fireReminder(kind) }
        case "breathe":                     // expand into the 1-minute guide
            hideTimer?.invalidate()
            resize(height: 230)
        case "breathDone": scheduleHide(2)
        case "hover": hovering = d["v"] as? Bool ?? false
        default: break
        }
    }
}

private var cardStorage: ReminderCard?
private var breathTimer: Timer?

extension App {
    var reminderCard: ReminderCard { if let c = cardStorage { return c }; let c = ReminderCard(app: self); cardStorage = c; return c }

    var breathMinutes: Int {
        get { defaults.integer(forKey: "breathMinutes") }
        set { defaults.set(newValue, forKey: "breathMinutes"); scheduleBreathReminders() }
    }
    /// Show reminder cards over other apps when the desktop isn't in view (opt-in).
    var remindersOverApps: Bool {
        get { defaults.bool(forKey: "remindersOverApps") }
        set { defaults.set(newValue, forKey: "remindersOverApps") }
    }

    func scheduleBreathReminders() {
        breathTimer?.invalidate()
        guard isPro, breathMinutes > 0 else { return }
        breathTimer = Timer.scheduledTimer(withTimeInterval: Double(breathMinutes) * 60, repeats: true) { [weak self] _ in
            self?.fireReminder("breathe")
        }
    }

    /// One reminder: the scene's in-world version always; the card too if the desktop isn't in view.
    func fireReminder(_ kind: String) {
        sendReminder(kind)
        let desktopInView = cursorOnDesktop && engaged
        guard remindersOverApps, !desktopInView else { return }
        let text = ["water": "A sip of water?", "stretch": "Roll your shoulders, unclench your jaw.", "breathe": "Take a minute to breathe?"][kind] ?? "A small pause?"
        reminderCard.show(kind: kind, text: text)
    }

    @objc func pickBreathReminder(_ item: NSMenuItem) { breathMinutes = item.tag; if item.tag > 0 { playAnalytics.record("breathe_reminder_on") }; rebuildMenu() }
    @objc func toggleRemindersOverApps() { remindersOverApps.toggle(); rebuildMenu() }
    @objc func previewReminderCard() { reminderCard.show(kind: "water", text: "A sip of water?") }
}
