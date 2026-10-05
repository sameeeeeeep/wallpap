// Screenshot a scene in WebKit (the engine wallpap runs in) — no browser or permissions needed.
//   swift tools/wkshot.swift <url-or-scene> <out.png> [width height steps "js before shot"]
//   swift tools/wkshot.swift train shots/train-swiss.png 1600 1000 4 "__lw('settings',{skin:'swiss'})"
// A bare scene name loads http://localhost:5210/<scene>.html?virtual=1&muted=1 (run `python3 devserver.py 5210`).
// Steps the virtual clock `steps` seconds in 1/30 s ticks after the JS, then saves a PNG and prints JS errors.
import AppKit
import WebKit

let a = CommandLine.arguments
guard a.count >= 3 else { print("usage: wkshot <url|scene> <out.png> [w h steps js]"); exit(1) }
let target = (a[1].hasPrefix("http") || a[1].hasPrefix("file:")) ? a[1] : "http://localhost:5210/\(a[1]).html?virtual=1&muted=1"
let out = a[2]
let W = a.count > 3 ? Double(a[3]) ?? 1600 : 1600, H = a.count > 4 ? Double(a[4]) ?? 1000 : 1000
let steps = a.count > 5 ? Double(a[5]) ?? 3 : 3
let pre = a.count > 6 ? a[6] : ""
// Optional sequence in ONE running scene. Values are elapsed virtual seconds after
// the initial steps; snapshots use -f00, -f01... suffixes. No app is launched.
let frameScript = ProcessInfo.processInfo.environment["WKSHOT_FRAME_JS"].flatMap { try? String(contentsOfFile: $0, encoding: .utf8) } ?? ""
let initScript = ProcessInfo.processInfo.environment["WKSHOT_INIT_JS"].flatMap { try? String(contentsOfFile: $0, encoding: .utf8) } ?? ""
let frames = (ProcessInfo.processInfo.environment["WKSHOT_FRAMES"] ?? "0").split(separator: ",").compactMap { Double($0) }.sorted()

final class Shot: NSObject, WKNavigationDelegate {
    let web: WKWebView; let win: NSWindow
    override init() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .nonPersistent()
        cfg.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        cfg.userContentController.addUserScript(WKUserScript(source: "window.__pendingImages=new Set();const sd=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{get:sd.get,set(v){__pendingImages.add(this);const done=()=>__pendingImages.delete(this);this.addEventListener('load',done,{once:true});this.addEventListener('error',done,{once:true});sd.set.call(this,v)}});window.__errs=[];addEventListener('message',e=>{if(e.data&&e.data.__wkshotError)__errs.push(e.data.__wkshotError)});if(window!==top){addEventListener('error',e=>top.postMessage({__wkshotError:String(e.message)},'*'));addEventListener('unhandledrejection',e=>top.postMessage({__wkshotError:String(e.reason)},'*'));}addEventListener('error',e=>__errs.push(String(e.message)));addEventListener('unhandledrejection',e=>__errs.push(String(e.reason)));", injectionTime: .atDocumentStart, forMainFrameOnly: false))
        cfg.userContentController.addUserScript(WKUserScript(source: """

window.__imageErrors=[];
window.__loadedImages=[];
const failImage=e=>{const im=e.target;if(im instanceof HTMLImageElement)__imageErrors.push(im.currentSrc||im.src)};
addEventListener('error',failImage,true);
// Detached new Image() resources do not bubble errors to window.
const imageSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
Object.defineProperty(HTMLImageElement.prototype,'src',{get:imageSrc.get,set(v){
 this.addEventListener('error',failImage,{once:true});
 this.addEventListener('load',()=>__loadedImages.push(this.currentSrc||this.src),{once:true});
 imageSrc.set.call(this,v);
}});
const originalError=console.error;
console.error=(...args)=>{__errs.push(args.map(String).join(' '));originalError.apply(console,args)};
if(new URLSearchParams(location.search).has('shotSeed')){let seed=Number(new URLSearchParams(location.search).get('shotSeed'))||1;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}};
""", injectionTime: .atDocumentStart, forMainFrameOnly: false))
        // Offscreen WKWebViews do not receive visible-tab rAF/visibility. The harness
        // supplies a timer clock; application code is unchanged. Scene clocks stay virtual.
        cfg.userContentController.addUserScript(WKUserScript(source: """
Object.defineProperty(document,'hidden',{get:()=>!!window.__qaHidden,configurable:true});
Object.defineProperty(document,'visibilityState',{get:()=> 'visible'});
if(window===top){window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);window.cancelAnimationFrame=clearTimeout;}
const fs=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'src');
Object.defineProperty(HTMLIFrameElement.prototype,'src',{get:fs.get,set(v){if(v.includes('scenes/')&&!v.includes('menu.html'))v+=(v.includes('?')?'&':'?')+'virtual=1';fs.set.call(this,v)}});
\(initScript)
""", injectionTime: .atDocumentStart, forMainFrameOnly: false))
        cfg.userContentController.addUserScript(WKUserScript(source: "const css=document.createElement('style');css.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.append(css);", injectionTime: .atDocumentEnd, forMainFrameOnly: false))
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg)
        win = NSWindow(contentRect: NSRect(x: -20000, y: -20000, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
        super.init()
        win.contentView = web; win.orderFrontRegardless()
        web.navigationDelegate = self
        if let theme = URLComponents(string: target)?.queryItems?.first(where: { $0.name == "shotAppearance" })?.value {
            web.appearance = NSAppearance(named: theme == "dark" ? .darkAqua : .aqua)
        }
        let url = URL(string: target)!
        if url.isFileURL { web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent()) }
        else { web.load(URLRequest(url: url)) }
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
    func waitSetup(_ attempts: Int = 0, _ done: @escaping () -> Void) {
        run("(window.__shotPoll&&window.__shotPoll(),window.__shotPending===true)") { result in
            if (result as? Bool) != true { done(); return }
            if attempts > 2400 { self.run("JSON.stringify({errors:window.__errs,report:window.__shotReport?window.__shotReport():null,stage:window.__setupStage,ticks:window.__pollCount,html:document.querySelector('iframe')?.srcdoc.slice(-1000)})") { r in print("async setup timeout:",r ?? "null"); exit(4) }; return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { self.waitSetup(attempts + 1, done) }
        }
    }
    func capture(_ index: Int = 0) {
        run("window.__captureIndex=\(index);" + frameScript + ";void 0") { _ in self.waitSetup { self.captureReady(index) } }
    }
    func captureReady(_ index: Int) {
        let delta = frames[index] - (index > 0 ? frames[index - 1] : 0)
        run("(()=>{for(let i=0;i<Math.round(\(delta)*30);i++){if(window.LW)LW.advance(1/30);document.querySelectorAll('iframe.scene').forEach(f=>{try{f.contentWindow.LW?.advance(1/30)}catch(e){}})}return true})()") { _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                self.web.takeSnapshot(with: nil) { img, _ in
                    let path = frames.count > 1 ? String(out.dropLast(4)) + String(format: "-f%02d.png", index) : out
                    if let img, let t = img.tiffRepresentation, let r = NSBitmapImageRep(data: t), let png = r.representation(using: .png, properties: [:]) {
                        do { try png.write(to: URL(fileURLWithPath: path)); print("saved", path) }
                        catch { print("write failed:", error); exit(2) }
                    } else { print("snapshot failed"); exit(2) }
                    self.run("JSON.stringify({errors:window.__errs||[],imageErrors:window.__imageErrors||[],loadedImages:window.__loadedImages||[],pendingImages:window.__pendingImages.size,report:window.__shotReport?window.__shotReport():null})") { r in
                        print("result:", r ?? "{}")
                        if index + 1 < frames.count { self.capture(index + 1) } else { exit(0) }
                    }
                }
            }
        }
    }
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            self.run("1") { _ in
                self.run(pre.isEmpty ? "1" : pre + ";void 0") { _ in
                    self.waitImages {
                        self.run("(()=>{if(window.__shotReady)window.__shotReady();const n=Math.round(\(steps)*30);for(let i=0;i<n;i++)if(window.LW)LW.advance(1/30);return n})()") { _ in
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                self.waitSetup { self.capture() }
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
DispatchQueue.main.asyncAfter(deadline: .now() + 1200) { print("timeout"); exit(3) }
app.run()
_ = s
