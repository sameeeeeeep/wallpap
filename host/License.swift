// Pro licensing via Dodo Payments license keys. Checkout happens on wallpap.live (Dodo emails the
// key). The app only calls Dodo's PUBLIC license endpoints (no API secret ships in the app):
//   POST /licenses/activate   {license_key, name}               → {id, …}  (one activation per Mac)
//   POST /licenses/validate   {license_key, license_key_instance_id} → {valid}
//   POST /licenses/deactivate {license_key, license_key_instance_id}
// A validated key is remembered; re-validation on launch only REVOKES on an explicit {valid:false},
// never because the Mac is offline.
import AppKit

extension App {
    static let dodoLive = URL(string: ProcessInfo.processInfo.environment["WALLPAP_DODO_BASE"] ?? "https://live.dodopayments.com")!
    static let dodoTest = URL(string: "https://test.dodopayments.com")!
    /// The environment the stored key was activated in (test-mode keys only exist on the test API).
    var dodoBase: URL { defaults.string(forKey: "license.base").flatMap(URL.init(string:)) ?? App.dodoLive }

    var licenseKey: String? { defaults.string(forKey: "license.key") }
    var licenseInstance: String? { defaults.string(forKey: "license.instance") }
    var licensed: Bool { licenseKey != nil && licenseInstance != nil }

    func dodo(_ path: String, _ body: [String: Any], base: URL? = nil, done: @escaping (Int, [String: Any]?) -> Void) {
        var req = URLRequest(url: (base ?? dodoBase).appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        req.timeoutInterval = 15
        URLSession.shared.dataTask(with: req) { data, resp, _ in
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            DispatchQueue.main.async { done(code, json) }
        }.resume()
    }

    @objc func enterLicense() {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "Enter your wallpap Pro key"
        alert.informativeText = "It's in the email from Dodo Payments after checkout."
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        field.placeholderString = "License key"
        alert.accessoryView = field
        alert.addButton(withTitle: "Activate")
        alert.addButton(withTitle: "Cancel")
        alert.addButton(withTitle: "Buy Pro — $5…")
        alert.window.initialFirstResponder = field
        switch alert.runModal() {
        case .alertFirstButtonReturn: activateLicense(field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines))
        case .alertThirdButtonReturn: openPro()
        default: break
        }
    }

    /// Live first; a key the live API doesn't know is tried on the test API (test-mode purchases).
    func activateLicense(_ key: String, base: URL = App.dodoLive) {
        guard !key.isEmpty else { return }
        let name = Host.current().localizedName ?? "Mac"
        dodo("licenses/activate", ["license_key": key, "name": name], base: base) { code, json in
            if code == 404, base == App.dodoLive { self.activateLicense(key, base: App.dodoTest); return }
            if (200..<300).contains(code), let id = json?["id"] as? String {
                self.defaults.set(key, forKey: "license.key")
                self.defaults.set(id, forKey: "license.instance")
                self.defaults.set(base.absoluteString, forKey: "license.base")
                self.proChanged()
                let ok = NSAlert(); ok.messageText = "wallpap Pro is unlocked"; ok.informativeText = "Thank you! Every scene and Pro feature is now on."; ok.runModal()
            } else {
                let fail = NSAlert()
                fail.messageText = "That key didn't activate"
                fail.informativeText = code == 0 ? "Couldn't reach the license server. Check your connection and try again."
                    : code == 404 ? "That key wasn't found. Copy it exactly from the Dodo Payments email."
                    : (json?["message"] as? String ?? "It may already be active on its maximum number of Macs (error \(code)).")
                fail.runModal()
            }
        }
    }

    /// On launch: drop a key Dodo explicitly reports as invalid (refunded / disabled). Offline → keep.
    func revalidateLicense() {
        guard let key = licenseKey, let inst = licenseInstance else { return }
        dodo("licenses/validate", ["license_key": key, "license_key_instance_id": inst]) { code, json in
            if (200..<300).contains(code), json?["valid"] as? Bool == false { self.clearLicense() }
        }
    }

    @objc func deactivateLicense() {
        guard let key = licenseKey, let inst = licenseInstance else { return }
        dodo("licenses/deactivate", ["license_key": key, "license_key_instance_id": inst]) { _, _ in }
        clearLicense()
    }

    func clearLicense() {
        defaults.removeObject(forKey: "license.key")
        defaults.removeObject(forKey: "license.instance")
        defaults.removeObject(forKey: "license.base")
        proChanged()
    }

    /// Re-apply everything gated on Pro.
    func proChanged() {
        rebuildMenu()
        loadScene()
    }
}
