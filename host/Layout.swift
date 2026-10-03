// Desktop layout awareness: where the user's widgets (and, opt-in, desktop icons) sit, so scenes
// keep that area calm instead of assuming "the right 28%".
//  • Widgets: macOS draws desktop widgets as "Notification Centre" windows just above the desktop
//    level — their bounds come from CGWindowList with no permission needed.
//  • Icons (opt-in, asks Finder once for Automation): Finder's desktop item positions.
// Scenes receive __lw('layout', {side, clear:[x0,x1], avoid:[[x,y,w,h]…], widgets, icons}) in 0..1
// display coordinates; lw.js exposes it as LW.layout + LW.on('layout').
import AppKit

private var lastLayoutJSON: [CGDirectDisplayID: String] = [:]
private var cachedIcons: [CGRect] = []          // global CG coordinates (top-left origin)
private var iconsFetchedAt = Date.distantPast

extension App {
    /// "auto" (detected) | "right" | "left" | "off" — which side scenes keep clear.
    var layoutMode: String {
        get { defaults.string(forKey: "layoutMode") ?? "auto" }
        set { defaults.set(newValue, forKey: "layoutMode") }
    }
    var avoidIcons: Bool {
        get { defaults.bool(forKey: "avoidIcons") }
        set { defaults.set(newValue, forKey: "avoidIcons") }
    }

    /// Widget rectangles in global CG coordinates.
    func widgetRects() -> [CGRect] {
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] else { return [] }
        let iconLevel = Int(CGWindowLevelForKey(.desktopIconWindow))
        return list.compactMap { w in
            guard let owner = w[kCGWindowOwnerName as String] as? String, owner.hasPrefix("Notification Cent"),
                  let layer = w[kCGWindowLayer as String] as? Int, layer > iconLevel, layer < 0,
                  let b = w[kCGWindowBounds as String] as? [String: Double] else { return nil }
            return CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0)
        }
    }

    /// Desktop icon boxes via Finder (opt-in). Refreshed at most every 30 s, off the main thread.
    func refreshIcons() {
        guard avoidIcons, Date().timeIntervalSince(iconsFetchedAt) > 30 else { return }
        iconsFetchedAt = Date()
        DispatchQueue.global(qos: .utility).async {
            let src = """
            tell application "Finder"
              set out to ""
              repeat with i in (every item of desktop)
                set p to desktop position of i
                set out to out & (item 1 of p) & "," & (item 2 of p) & ";"
              end repeat
              return out
            end tell
            """
            var err: NSDictionary?
            let res = NSAppleScript(source: src)?.executeAndReturnError(&err).stringValue ?? ""
            let rects: [CGRect] = res.split(separator: ";").compactMap { pair in
                let v = pair.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
                guard v.count == 2 else { return nil }
                return CGRect(x: v[0] - 50, y: v[1] - 50, width: 100, height: 110)   // icon + label around its position
            }
            DispatchQueue.main.async { cachedIcons = rects; self.pushLayout() }
        }
    }

    @objc func pickLayoutMode(_ item: NSMenuItem) { layoutMode = item.representedObject as? String ?? "auto"; lastLayoutJSON = [:]; pushLayout(); rebuildMenu() }
    @objc func toggleAvoidIcons() {
        avoidIcons.toggle(); iconsFetchedAt = .distantPast
        if avoidIcons { refreshIcons() } else { cachedIcons = []; lastLayoutJSON = [:]; pushLayout() }
        rebuildMenu()
    }

    /// Per display: normalised avoid boxes + the side to keep clear + the free horizontal band.
    func layoutPayload(for w: WallWindow) -> [String: Any] {
        let db = CGDisplayBounds(w.screenID)
        func norm(_ r: CGRect) -> [Double]? {
            let i = r.intersection(db)
            guard !i.isNull, i.width > 4, i.height > 4 else { return nil }
            return [Double((i.minX - db.minX) / db.width), Double((i.minY - db.minY) / db.height),
                    Double(i.width / db.width), Double(i.height / db.height)]
        }
        let widgets = widgetRects().compactMap(norm)
        let icons = avoidIcons ? cachedIcons.compactMap(norm) : []
        let avoid = widgets + icons
        var side = layoutMode
        if side == "auto" {
            // Weigh occupied area by side of the screen; default to the right (macOS's own default).
            var l = 0.0, r = 0.0
            for a in avoid { let cx = a[0] + a[2] / 2, area = a[2] * a[3]; if cx < 0.5 { l += area } else { r += area } }
            side = l > r * 1.2 ? "left" : "right"
            if avoid.isEmpty { side = "right" }
        }
        // Free band for the scene's hero content: up to the nearest edge of what we avoid on that side.
        var clear = [0.0, 1.0]
        if side == "right" {
            let edge = avoid.filter { $0[0] + $0[2] / 2 >= 0.5 }.map { $0[0] }.min() ?? 0.72
            clear = [0, max(0.55, min(0.82, edge - 0.02))]
        } else if side == "left" {
            let edge = avoid.filter { $0[0] + $0[2] / 2 < 0.5 }.map { $0[0] + $0[2] }.max() ?? 0.28
            clear = [min(0.45, max(0.18, edge + 0.02)), 1]
        }
        return ["side": side, "clear": clear, "avoid": avoid, "widgets": widgets.count, "icons": icons.count, "mode": layoutMode]
    }

    /// Send the layout to each display's scene when it changes (called on load + every few seconds).
    func pushLayout(force: Bool = false) {
        refreshIcons()
        for w in windows {
            guard let data = try? JSONSerialization.data(withJSONObject: layoutPayload(for: w)),
                  let json = String(data: data, encoding: .utf8) else { continue }
            if !force, lastLayoutJSON[w.screenID] == json { continue }
            lastLayoutJSON[w.screenID] = json
            w.js("__lw('layout',\(json))")
        }
    }

    /// Short summary for the menu/panel, e.g. "4 widgets on the right".
    func layoutSummary() -> String {
        guard let w = windows.first else { return "" }
        let p = layoutPayload(for: w)
        let n = (p["widgets"] as? Int ?? 0), i = (p["icons"] as? Int ?? 0), side = p["side"] as? String ?? "right"
        if side == "off" { return "scenes use the full screen" }
        var parts: [String] = []
        if n > 0 { parts.append("\(n) widget\(n == 1 ? "" : "s")") }
        if i > 0 { parts.append("\(i) icon\(i == 1 ? "" : "s")") }
        return (parts.isEmpty ? "keeping the \(side) side clear" : parts.joined(separator: " + ") + " on the \(side)")
    }
}
