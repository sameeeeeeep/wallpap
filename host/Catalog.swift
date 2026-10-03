// Scenes beyond the ones bundled in the app. Two sources, one folder:
//   ~/Library/Application Support/wallpap/Scenes/<id>/index.html + scene.json (+ assets)
// • the online catalog (https://wallpap.live/catalog.json) — scenes we ship without an app
//   update, downloaded as a zip on first pick and updated when the catalog's version is newer;
// • folders the user adds themselves (menu → Add Scene Folder…).
// scene.json: {"id":"snowglobe","title":"Snow Globe","category":"Cozy Rooms","pro":true,"version":2,
//              "author":"Jane Doe","authorURL":"https://…","music":false}
// A `.source` file in the folder records where it came from: "catalog" or "user" (user folders are the
// Custom tab and need Pro).
// Each add-on folder receives a fresh copy of the shared runtime (lw.js, pet-motion.js,
// astronomy.js) on install and launch, so `<script src="lw.js">` works exactly as in bundled scenes.
import AppKit

struct CatalogEntry {
    let id: String, title: String, category: String, pro: Bool, version: Int
    let zip: URL, thumb: URL?
    var author = "wallpap", blurb = "", featured = false, isNew = false
}

private var catalogEntries: [CatalogEntry] = []
private var installing: Set<String> = []
let catalogURL = URL(string: ProcessInfo.processInfo.environment["WALLPAP_CATALOG"] ?? "https://wallpap.live/catalog.json")!
let sharedRuntime = ["lw.js", "pet-motion.js", "astronomy.js", "moon.js", "music.js", "kit.js", "art/shared/moon.png"]

/// Bundled + installed add-on scenes, bundled first, in menu order.
var scenes: [Scene] { builtinScenes + addonScenes().map(\.scene) }

var addonDir: URL {
    let d = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("wallpap/Scenes", isDirectory: true)
    try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
    return d
}

struct Addon { let scene: Scene; let dir: URL; let version: Int }

func validSceneID(_ id: String) -> Bool {
    !id.isEmpty && id.count <= 40 && id.allSatisfy { $0.isLowercase || $0.isNumber || $0 == "-" } && !builtinScenes.contains { $0.id == id }
}

func readManifest(_ dir: URL) -> Addon? {
    guard let data = try? Data(contentsOf: dir.appendingPathComponent("scene.json")),
          let m = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let id = m["id"] as? String, validSceneID(id),
          FileManager.default.fileExists(atPath: dir.appendingPathComponent("index.html").path) else { return nil }
    let title = (m["title"] as? String) ?? id
    let source = (try? String(contentsOf: dir.appendingPathComponent(".source"), encoding: .utf8))?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "user"
    let custom = source != "catalog"
    var cat = (m["category"] as? String) ?? "More"
    if !categories.contains(cat) || cat == "Custom" { cat = "More" }
    if custom { cat = "Custom" }
    var sc = Scene(id: id, title: title, key: "", pro: custom || (m["pro"] as? Bool ?? false), category: cat, music: m["music"] as? Bool ?? false)
    sc.author = (m["author"] as? String) ?? (custom ? "you" : "wallpap")
    sc.authorURL = (m["authorURL"] as? String) ?? ""
    sc.custom = custom
    return Addon(scene: sc, dir: dir, version: m["version"] as? Int ?? 1)
}

func addonScenes() -> [Addon] {
    let dirs = (try? FileManager.default.contentsOfDirectory(at: addonDir, includingPropertiesForKeys: nil)) ?? []
    return dirs.filter { $0.hasDirectoryPath }.compactMap(readManifest).sorted { $0.scene.title < $1.scene.title }
}

extension App {
    /// The page to load for a scene and the folder WebKit may read, or nil if it isn't installed.
    func sceneFile(_ id: String) -> (url: URL, root: URL)? {
        if builtinScenes.contains(where: { $0.id == id }) {
            let f = scenesDir.appendingPathComponent("\(id).html")
            return FileManager.default.fileExists(atPath: f.path) ? (f, scenesDir) : nil
        }
        guard let a = addonScenes().first(where: { $0.scene.id == id }) else { return nil }
        return (a.dir.appendingPathComponent("index.html"), a.dir)
    }

    func installRuntime(into dir: URL) {
        for f in sharedRuntime {
            let src = scenesDir.appendingPathComponent(f), dst = dir.appendingPathComponent(f)
            guard let s = try? Data(contentsOf: src) else { continue }   // older bundles may lack newer files
            try? FileManager.default.createDirectory(at: dst.deletingLastPathComponent(), withIntermediateDirectories: true)
            if (try? Data(contentsOf: dst)) == s { continue }
            try? s.write(to: dst, options: .atomic)
        }
    }

    func refreshAddonRuntime() { addonScenes().forEach { installRuntime(into: $0.dir) } }

    // MARK: online catalog

    /// Catalog entries not installed yet, or newer than the installed copy (shown as "Get"/"Update").
    func catalogOffers() -> [CatalogEntry] {
        let have = Dictionary(uniqueKeysWithValues: addonScenes().map { ($0.scene.id, $0.version) })
        return catalogEntries.filter { (have[$0.id] ?? 0) < $0.version }
    }

    func fetchCatalog() {
        var req = URLRequest(url: catalogURL); req.cachePolicy = .reloadRevalidatingCacheData; req.timeoutInterval = 20
        URLSession.shared.dataTask(with: req) { data, resp, _ in
            guard (resp as? HTTPURLResponse)?.statusCode == 200, let data,
                  let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let list = j["scenes"] as? [[String: Any]] else { return }
            let entries: [CatalogEntry] = list.compactMap { m in
                guard let id = m["id"] as? String, validSceneID(id), let z = m["zip"] as? String,
                      let zip = URL(string: z, relativeTo: catalogURL)?.absoluteURL, zip.scheme == "https" else { return nil }
                var e = CatalogEntry(id: id, title: m["title"] as? String ?? id, category: m["category"] as? String ?? "More",
                                     pro: m["pro"] as? Bool ?? true, version: m["version"] as? Int ?? 1, zip: zip,
                                     thumb: (m["thumb"] as? String).flatMap { URL(string: $0, relativeTo: catalogURL)?.absoluteURL })
                e.author = m["author"] as? String ?? "wallpap"; e.blurb = m["blurb"] as? String ?? ""
                e.featured = m["featured"] as? Bool ?? false; e.isNew = m["new"] as? Bool ?? false
                return e
            }
            DispatchQueue.main.async {
                catalogEntries = entries
                // Silently update scenes the user already has.
                let have = Dictionary(uniqueKeysWithValues: addonScenes().map { ($0.scene.id, $0.version) })
                for e in entries where (have[e.id] ?? Int.max) < e.version { self.installCatalogScene(e.id, pick: false) }
                self.rebuildMenu()
            }
        }.resume()
    }

    /// Download (or update) a catalog scene, then optionally switch to it.
    @objc func installScene(_ item: NSMenuItem) {
        guard let id = item.representedObject as? String else { return }
        if let e = catalogEntries.first(where: { $0.id == id }), e.pro, !isPro { openPro(); return }
        installCatalogScene(id, pick: true)
    }

    func installCatalogScene(_ id: String, pick: Bool) {
        guard let e = catalogEntries.first(where: { $0.id == id }), !installing.contains(id) else { return }
        installing.insert(id); rebuildMenu()
        URLSession.shared.downloadTask(with: e.zip) { tmp, resp, _ in
            var ok = false
            if let tmp, (resp as? HTTPURLResponse)?.statusCode == 200 {
                let fm = FileManager.default
                let stage = fm.temporaryDirectory.appendingPathComponent("wallpap-\(UUID().uuidString)")
                let p = Process()
                p.executableURL = URL(fileURLWithPath: "/usr/bin/ditto")
                p.arguments = ["-x", "-k", tmp.path, stage.path]
                try? p.run(); p.waitUntilExit()
                // The zip holds either the scene files or one folder containing them.
                var root = stage
                if !fm.fileExists(atPath: stage.appendingPathComponent("scene.json").path),
                   let kids = try? fm.contentsOfDirectory(at: stage, includingPropertiesForKeys: nil),
                   kids.count == 1, kids[0].hasDirectoryPath { root = kids[0] }
                if p.terminationStatus == 0, let a = readManifest(root), a.scene.id == id {
                    let dst = addonDir.appendingPathComponent(id, isDirectory: true)
                    try? fm.removeItem(at: dst)
                    ok = (try? fm.moveItem(at: root, to: dst)) != nil
                    if ok { try? "catalog".write(to: dst.appendingPathComponent(".source"), atomically: true, encoding: .utf8) }
                }
                try? fm.removeItem(at: stage)
            }
            DispatchQueue.main.async {
                installing.remove(id)
                if ok {
                    self.installRuntime(into: addonDir.appendingPathComponent(id))
                    if pick || self.sceneID == id { self.sceneID = id; self.loadScene() } else { self.rebuildMenu() }
                } else {
                    self.rebuildMenu()
                    let a = NSAlert(); a.messageText = "Couldn't download “\(e.title)”"
                    a.informativeText = "Check your connection and try again."; a.runModal()
                }
            }
        }.resume()
    }

    var installingScenes: Set<String> { installing }

    // MARK: user folders

    @objc func addSceneFolder() {
        NSApp.activate(ignoringOtherApps: true)
        let p = NSOpenPanel()
        p.canChooseDirectories = true; p.canChooseFiles = false; p.allowsMultipleSelection = false
        p.message = "Choose a scene folder containing index.html and scene.json"
        guard p.runModal() == .OK, let src = p.url else { return }
        guard let a = readManifest(src) else {
            let al = NSAlert(); al.messageText = "That folder isn't a wallpap scene"
            al.informativeText = "It needs index.html and a scene.json like {\"id\":\"my-scene\",\"title\":\"My Scene\",\"category\":\"Nature\"} (id: lowercase letters, numbers, dashes)."
            al.runModal(); return
        }
        let dst = addonDir.appendingPathComponent(a.scene.id, isDirectory: true)
        try? FileManager.default.removeItem(at: dst)
        do { try FileManager.default.copyItem(at: src, to: dst) } catch { NSSound.beep(); return }
        try? "user".write(to: dst.appendingPathComponent(".source"), atomically: true, encoding: .utf8)
        guard isPro else { openPro(); rebuildMenu(); return }   // custom scenes are a Pro feature
        installRuntime(into: dst)
        sceneID = a.scene.id
        loadScene()
    }

    @objc func openScenesFolder() { NSWorkspace.shared.open(addonDir) }

    /// Small thumbnail for an add-on scene (thumb.jpg/png in its folder), as a data URL for the panel.
    func addonThumb(_ id: String) -> String? {
        let dir = addonDir.appendingPathComponent(id)
        for (f, mime) in [("thumb.jpg", "image/jpeg"), ("thumb.png", "image/png")] {
            if let d = try? Data(contentsOf: dir.appendingPathComponent(f)), d.count < 400_000 {
                return "data:\(mime);base64,\(d.base64EncodedString())"
            }
        }
        return nil
    }
}
