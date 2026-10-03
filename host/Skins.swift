// Skins: alternative looks of one scene (e.g. Train Journey → Shinkansen, Swiss Alpine…).
// Free users get each scene's FIRST skin; Pro unlocks the rest (plus Pro features).
// A scene reads its skin from LW.settings.skin (and pets on/off from LW.settings.pets !== false).
// Add a scene's skins here once the scene implements them.
import AppKit

/// sceneID → [(skin id, title)], default first.
let sceneSkins: [String: [(String, String)]] = [
    "cafe": [("record", "Turntable"), ("jukebox", "Jukebox")],          // stored under the scene's existing "player" key
    "cymatics": [("sand", "Sand"), ("faraday", "Faraday Water"), ("filings", "Iron Filings")],
    "kinetic": [("copper", "Copper Rain"), ("harmonograph", "Harmonograph"), ("pendulum", "Pendulum Wave")],
    "fluids": [("ferro", "Magnet Bloom"), ("vortex", "Vortex Rings"), ("ripple", "Ripple Tank")],
    "skies": [("komorebi", "Komorebi")],
    "train": [("indian", "Indian Sleeper"), ("shinkansen", "Shinkansen"), ("swiss", "Swiss Alpine"), ("orient", "Orient Express")],
]
/// Scenes whose skin lives under a legacy settings key instead of "skin".
let skinKey: [String: String] = ["cafe": "player"]
/// Scenes with pets that can be switched off.
let petScenes: Set<String> = ["cats", "grass", "cafe", "cabin", "records", "speakeasy", "rooftop", "ramen"]

extension App {
    func skins(for id: String) -> [(String, String)] { sceneSkins[id] ?? [] }
    func skinKeyFor(_ id: String) -> String { skinKey[id] ?? "skin" }

    /// The skin actually shown (free users are held to the default).
    func currentSkin(_ id: String) -> String? {
        let list = skins(for: id)
        guard let first = list.first?.0 else { return nil }
        let want = (defaults.dictionary(forKey: "settings.\(id)") ?? [:])[skinKeyFor(id)] as? String ?? first
        return isPro || want == first ? want : first
    }

    /// Settings as the scene should see them: skin clamped to what the user may use.
    func effectiveSceneSettings() -> [String: Any] {
        var s = sceneSettings
        if let skin = currentSkin(sceneID) { s[skinKeyFor(sceneID)] = skin }
        return s
    }

    @objc func pickSkin(_ item: NSMenuItem) {
        guard let v = item.representedObject as? String else { return }
        if !isPro, v != skins(for: sceneID).first?.0 { openPro(); return }
        setSetting(skinKeyFor(sceneID), v)
    }
    @objc func togglePets() {
        let on = (sceneSettings["pets"] as? Bool) ?? true
        setSetting("pets", !on)
    }
    var petsOn: Bool { (sceneSettings["pets"] as? Bool) ?? true }
}
