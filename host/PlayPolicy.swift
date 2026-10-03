import Foundation
// Shared with the headless WebKit security test. Srcdoc is the only frame document.
enum PlayNavigation {
    static func allows(sourceMain: Bool, targetMain: Bool?, url: URL?) -> Bool {
        guard sourceMain else { return false }
        guard let targetMain else { return false }
        return targetMain || url?.absoluteString == "about:srcdoc"
    }
}
