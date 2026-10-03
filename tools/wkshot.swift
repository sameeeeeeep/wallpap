// Screenshot a scene in WebKit (the engine wallpap runs in) — no browser or permissions needed.
//   swift tools/wkshot.swift <url-or-scene> <out.png> [width height steps "js before shot"]
//   swift tools/wkshot.swift train shots/train-swiss.png 1600 1000 4 "__lw('settings',{skin:'swiss'})"
// A bare scene name loads http://localhost:5210/<scene>.html?virtual=1&muted=1 (run `python3 devserver.py 5210`).
// Steps the virtual clock `steps` seconds in 1/30 s ticks after the JS, then saves a PNG and prints JS errors.
import AppKit
import WebKit

let a = CommandLine.arguments
guard a.count >= 3 else { print("usage: wkshot <url|scene> <out.png> [w h steps js]"); exit(1) }
let target = a[1].hasPrefix("http") ? a[1] : "http://localhost:5210/\(a[1]).html?virtual=1&muted=1"
let out = a[2]
let W = a.count > 3 ? Double(a[3]) ?? 1600 : 1600, H = a.count > 4 ? Double(a[4]) ?? 1000 : 1000
let steps = a.count > 5 ? Double(a[5]) ?? 3 : 3
let pre = a.count > 6 ? a[6] : ""

final class Shot: NSObject, WKNavigationDelegate {
    let web: WKWebView; let win: NSWindow
    override init() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .nonPersistent()
        cfg.userContentController.addUserScript(WKUserScript(source: "window.__pendingImages=new Set();const sd=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{get:sd.get,set(v){__pendingImages.add(this);const done=()=>__pendingImages.delete(this);this.addEventListener('load',done,{once:true});this.addEventListener('error',done,{once:true});sd.set.call(this,v)}});window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));addEventListener('unhandledrejection',e=>__errs.push(String(e.reason)));", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg)
        win = NSWindow(contentRect: NSRect(x: -20000, y: -20000, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
        super.init()
        win.contentView = web; win.orderFrontRegardless()
        web.navigationDelegate = self
        if let theme = URLComponents(string: target)?.queryItems?.first(where: { $0.name == "shotAppearance" })?.value {
            web.appearance = NSAppearance(named: theme == "dark" ? .darkAqua : .aqua)
        }
        web.load(URLRequest(url: URL(string: target)!))
    }
    func run(_ js: String, _ done: @escaping (Any?) -> Void) {
        web.evaluateJavaScript(js) { r, e in if let e { print("js error:", e.localizedDescription) }; done(r) }
    }
    func waitImages(_ attempts: Int = 0, _ done: @escaping () -> Void) {
        run("window.__pendingImages.size") { result in
            if (result as? Int ?? 0) == 0 || attempts >= 60 { done(); return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.waitImages(attempts + 1, done) }
        }
    }
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            self.run("1") { _ in
                self.run(pre.isEmpty ? "1" : pre + ";void 0") { _ in
                    self.waitImages {
                        self.run("(()=>{if(window.__shotReady)window.__shotReady();const n=Math.round(\(steps)*30);for(let i=0;i<n;i++)if(window.LW)LW.advance(1/30);return n})()") { _ in
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                w.takeSnapshot(with: nil) { img, _ in
                                    if let img, let t = img.tiffRepresentation, let r = NSBitmapImageRep(data: t), let png = r.representation(using: .png, properties: [:]) {
                                        try? png.write(to: URL(fileURLWithPath: out)); print("saved", out)
                                    } else { print("snapshot failed") }
                                    self.run("JSON.stringify({errors:window.__errs||[],report:window.__shotReport?window.__shotReport():null})") { r in print("result:", r ?? "{}"); exit(0) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { print("load failed:", e); exit(2) }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { print("load failed:", e); exit(2) }
}
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let s = Shot()
DispatchQueue.main.asyncAfter(deadline: .now() + 60) { print("timeout"); exit(3) }
app.run()
_ = s
