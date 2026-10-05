import Foundation

@main struct SceneLinkChecks {
    static func main() {
        for id in ["koi", "sky-kites", "scene-2", "7", String(repeating: "a", count: 40)] {
            precondition(SceneLink.validID(id), "Rejected ID: \(id)")
            let link = SceneLink(url: URL(string: "wallpap://scene/\(id)")!)
            precondition(link?.id == id && link?.look == nil)
        }
        for id in ["", "../koi", "/koi", "Koi", "café", "a_b", "a.b", "a b", "-koi", "koi-", "a--b", "koi\n", "koi\r", "koi\u{0000}", "１２", String(repeating: "a", count: 41)] {
            precondition(!SceneLink.validID(id), "Accepted ID: \(id)")
        }
        let look = SceneLink(url: URL(string: "wallpap://scene/train?look=swiss")!)
        precondition(look?.id == "train" && look?.look == "swiss")
        for raw in [
            "https://scene/koi", "file:///koi", "wallpap:scene/koi", "wallpap:///scene/koi", "wallpap://other/koi",
            "wallpap://scene", "wallpap://scene/", "wallpap://scene//koi", "wallpap://scene/koi/", "wallpap://scene/a/b",
            "wallpap://scene/../koi", "wallpap://scene/%2e%2e", "wallpap://scene/%6boi", "wallpap://scene/koi%00",
            "wallpap://user@scene/koi", "wallpap://user:pass@scene/koi", "wallpap://scene:80/koi", "wallpap://scene/koi#x",
            "wallpap://scene/koi?", "wallpap://scene/train?look=", "wallpap://scene/train?look=swiss&look=indian",
            "wallpap://scene/train?look=swiss&url=https://evil.test", "wallpap://scene/train?look=%73wiss",
            "wallpap://scene/train?url=https://evil.test", "wallpap://scene/train?look=../x", "wallpap://scene/train?look=Swiss"
        ] {
            if let url = URL(string: raw) { precondition(SceneLink(url: url) == nil, "Accepted URL: \(raw)") }
        }
        print("Scene link checks: strict ASCII IDs, bounds, routes, skins and hostile URLs PASS")
    }
}
