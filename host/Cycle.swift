// Auto-cycle: change scene every N minutes — through all scenes or only the current category, in
// order or shuffled. Skips scenes the user can't open (Pro-only for free users) and waits while the
// wallpaper is paused, so it never swaps scenes nobody is looking at.
import AppKit

private var cycleTimerRef: Timer?
private var shuffleBag: [String] = []

extension App {
    static let cycleChoices: [(String, Int)] = [("Off", 0), ("15 min", 15), ("30 min", 30), ("1 hour", 60), ("2 hours", 120)]
    var sceneCycleMinutes: Int {
        get { defaults.integer(forKey: "sceneCycleMinutes") }
        set { defaults.set(newValue, forKey: "sceneCycleMinutes"); startSceneCycle() }
    }
    /// "all" | "category"
    var sceneCycleScope: String {
        get { defaults.string(forKey: "sceneCycleScope") ?? "all" }
        set { defaults.set(newValue, forKey: "sceneCycleScope"); shuffleBag = [] }
    }
    var sceneCycleShuffle: Bool {
        get { defaults.object(forKey: "sceneCycleShuffle") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "sceneCycleShuffle"); shuffleBag = [] }
    }

    func startSceneCycle() {
        cycleTimerRef?.invalidate(); cycleTimerRef = nil
        guard sceneCycleMinutes > 0 else { return }
        cycleTimerRef = Timer.scheduledTimer(withTimeInterval: Double(sceneCycleMinutes) * 60, repeats: true) { [weak self] _ in
            self?.cycleToNextScene()
        }
    }

    func cycleCandidates() -> [Scene] {
        let cat = scenes.first { $0.id == sceneID }?.category
        return scenes.filter { s in
            sceneFile(s.id) != nil && (isPro || !s.pro) && (sceneCycleScope == "all" || s.category == cat)
        }
    }

    func cycleToNextScene() {
        guard !paused, engaged else { return }
        let list = cycleCandidates().map(\.id)
        guard list.count > 1 else { return }
        var next: String
        if sceneCycleShuffle {
            shuffleBag = shuffleBag.filter { list.contains($0) && $0 != sceneID }
            if shuffleBag.isEmpty { shuffleBag = list.filter { $0 != sceneID }.shuffled() }
            next = shuffleBag.removeFirst()
        } else {
            let i = list.firstIndex(of: sceneID) ?? -1
            next = list[(i + 1) % list.count]
        }
        sceneID = next
        loadScene()
    }

    @objc func pickSceneCycle(_ item: NSMenuItem) { sceneCycleMinutes = item.tag; rebuildMenu() }
    @objc func pickSceneCycleScope(_ item: NSMenuItem) { sceneCycleScope = item.representedObject as? String ?? "all"; rebuildMenu() }
    @objc func toggleSceneCycleShuffle() { sceneCycleShuffle.toggle(); rebuildMenu() }
    @objc func nextSceneNow() { cycleToNextScene() }

    /// Share wallpap: the system share sheet with the site link, anchored to the menu-bar icon.
    @objc func shareApp() {
        panelHostIfLoaded?.popover.performClose(nil)
        guard let b = status.button, let url = URL(string: "https://wallpap.live") else { return }
        let text = "wallpap — animated, interactive wallpapers for your Mac"
        DispatchQueue.main.async {
            NSSharingServicePicker(items: [text, url]).show(relativeTo: b.bounds, of: b, preferredEdge: .minY)
        }
    }
    @objc func openSubmitScene() { NSWorkspace.shared.open(URL(string: "https://wallpap.live/#make-a-scene")!) }
}
