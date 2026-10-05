// Pure parsing, shared by the host and the standalone executable tests.
import Foundation

struct SceneLink: Equatable {
    let id: String
    let look: String?

    static func validID(_ value: String) -> Bool {
        value.utf8.count <= 40 && value.range(of: "^[a-z0-9]+(?:-[a-z0-9]+)*\\z", options: .regularExpression) != nil
    }

    init?(url: URL) {
        guard let c = URLComponents(url: url, resolvingAgainstBaseURL: false),
              c.scheme == "wallpap", c.host == "scene", c.user == nil, c.password == nil,
              c.port == nil, c.fragment == nil, c.percentEncodedPath.hasPrefix("/") else { return nil }
        let id = String(c.percentEncodedPath.dropFirst())
        guard Self.validID(id) else { return nil }
        // Accept one literal look identifier only, with no encoded separators or extra parameters.
        var look: String?
        if let query = c.percentEncodedQuery {
            guard query.hasPrefix("look=") else { return nil }
            let value = String(query.dropFirst(5))
            guard Self.validID(value) else { return nil }
            look = value
        }
        self.id = id; self.look = look
    }
}
