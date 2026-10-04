// pausebench — what a scene costs LIVE vs PAUSED, and what a scene SWITCH leaves behind, measured in a
// headless WKWebView set up like the real host (message handler "lw", autoplay allowed, file URLs), at real
// speed. It never touches the installed wallpap: its window sits off-screen with WebKit's occlusion
// detection off (the page believes it is visible, as on the desktop), and every audio graph is routed into a
// silent sink, so the Mac stays quiet while WebAudio still renders exactly as in the app.
//
// CPU and memory come from the kernel (proc_pid_rusage, like wpmeter) for the scene's own WebContent process
// (from the view) plus the WebKit GPU/Networking helpers this harness started.
//
//   swiftc -O -parse-as-library tools/measure/pausebench.swift host/WebTeardown.swift -o .build/pausebench
//   .build/pausebench pause  <scenesDir> koi,cats,...  [live=8] [paused=20]       → JSON lines per scene
//   .build/pausebench switch <scenesDir> cats,koi      [teardown=retire|legacy] [settle=12] [after=20] [hold=0]
//   common options: store=default|ephemeral (default = like the app), pool=shared|own (own WKProcessPool per view)
//
// pause: load, settle, measure live, __lw('focus',false) like the host's away pause, settle, measure paused,
//        count timer wakeups / frames / audio state while paused, resume and check the scene moves again.
// switch: load scene A, settle, then do what App.loadScene does (new view per scene) with the chosen
//        teardown of the old view, load B, and sample memory of every WebContent process once a second.
import AppKit
import WebKit
import Darwin

// MARK: process accounting (same kernel counters as wpmeter)
var tb = mach_timebase_info_data_t()
func cpuNs(_ pid: pid_t) -> UInt64? { usage(pid).map { $0.0 } }
func footprintMB(_ pid: pid_t) -> Double? { usage(pid).map { Double($0.1) / 1_048_576 } }
func usage(_ pid: pid_t) -> (UInt64, UInt64)? {
    var info = rusage_info_v6()
    let ok = withUnsafeMutablePointer(to: &info) { p in
        p.withMemoryRebound(to: Optional<rusage_info_t>.self, capacity: 1) { proc_pid_rusage(pid, RUSAGE_INFO_V6, $0) }
    }
    guard ok == 0 else { return nil }
    return ((info.ri_user_time + info.ri_system_time) * UInt64(tb.numer) / UInt64(tb.denom), info.ri_phys_footprint)
}
func allPids() -> [pid_t] {
    let n = proc_listallpids(nil, 0)
    var pids = [pid_t](repeating: 0, count: Int(n) * 2)
    let got = proc_listallpids(&pids, Int32(pids.count * MemoryLayout<pid_t>.size))
    return Array(pids.prefix(Int(got))).filter { $0 > 0 }
}
func pname(_ pid: pid_t) -> String {
    var buf = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN))
    return proc_pidpath(pid, &buf, UInt32(buf.count)) > 0 ? (String(cString: buf) as NSString).lastPathComponent : "?"
}
typealias RespFn = @convention(c) (pid_t) -> pid_t
let respFn: RespFn? = {
    guard let sym = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "responsibility_get_pid_responsible_for_pid") else { return nil }
    return unsafeBitCast(sym, to: RespFn.self)
}()
/// WebKit helpers that did not exist before this harness started and belong to the same responsible process.
var preexisting = Set<pid_t>()
func webkitHelpers() -> [pid_t] {
    let me = getpid(), myResp = respFn?(me) ?? me
    return allPids().filter { p in
        !preexisting.contains(p) && pname(p).hasPrefix("com.apple.WebKit.") && (respFn?(p) == myResp || respFn?(p) == me)
    }
}

// MARK: page instrumentation (installed at document start, before lw.js)
let silenceAndCount = """
(()=>{
  // Silent sink: everything that would reach the speakers goes through a gain of ~-140 dB instead.
  const raw = AudioNode.prototype.connect, sinks = new WeakMap();
  AudioNode.prototype.connect = function (t, ...r) {
    if (t && this.context && t === this.context.destination) {
      let s = sinks.get(this.context);
      if (!s) { s = this.context.createGain(); s.gain.value = 1e-7; raw.call(s, this.context.destination); sinks.set(this.context, s); }
      return raw.call(this, s, ...r);
    }
    return raw.call(this, t, ...r);
  };
  const AC = window.AudioContext;
  if (AC) window.AudioContext = window.webkitAudioContext = class extends AC { constructor(o) { super(o); (window.__pb.ctxs = window.__pb.ctxs || []).push(this); } };
  // Count what actually fires: native timer callbacks and native animation frames.
  const pb = window.__pb = { timers: 0, frames: 0, ctxs: [] };
  const si = window.setInterval, st = window.setTimeout, raf = window.requestAnimationFrame;
  window.setInterval = function (f, ...a) { return typeof f === 'function' ? si.call(window, function (...x) { pb.timers++; return f.apply(this, x); }, ...a) : si.call(window, f, ...a); };
  window.setTimeout = function (f, ...a) { return typeof f === 'function' ? st.call(window, function (...x) { pb.timers++; return f.apply(this, x); }, ...a) : st.call(window, f, ...a); };
  window.requestAnimationFrame = function (cb) { return raf.call(window, (t) => { pb.frames++; cb(t); }); };
})();
"""

final class Handler: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    var loaded: (() -> Void)?
    func userContentController(_ u: WKUserContentController, didReceive m: WKScriptMessage) {}
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) { loaded?(); loaded = nil }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { print(#"{"error":"load failed: \#(e)"}"#); exit(2) }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { print(#"{"error":"load failed: \#(e)"}"#); exit(2) }
    func webViewWebContentProcessDidTerminate(_ w: WKWebView) { FileHandle.standardError.write("note: a WebContent process terminated\n".data(using: .utf8)!) }
}

var storeKind = "default", poolKind = "shared", hold = 0.0
/// Same configuration as WallWindow.makeWebView, plus the instrumentation script.
func makeWebView(size: NSSize, handler: Handler) -> WKWebView {
    let config = WKWebViewConfiguration()
    config.mediaTypesRequiringUserActionForPlayback = []
    config.suppressesIncrementalRendering = true
    // Like the app: every scene view shares the default store (this harness's own, not wallpap's). That
    // sharing is what lets WebKit hand a closed page's process to the next scene (its process cache).
    config.websiteDataStore = storeKind == "ephemeral" ? .nonPersistent() : .default()
    if poolKind == "own" { config.processPool = WKProcessPool() }
    config.userContentController.add(handler, name: "lw")
    config.userContentController.addUserScript(WKUserScript(source: silenceAndCount, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
    let web = WKWebView(frame: NSRect(origin: .zero, size: size), configuration: config)
    web.setValue(false, forKey: "drawsBackground")
    // Off-screen but "visible": without this WebKit would see an occluded window and throttle the page.
    let sel = NSSelectorFromString("_setWindowOcclusionDetectionEnabled:")
    if web.responds(to: sel) { web.perform(sel, with: false) }
    return web
}
func webPid(_ w: WKWebView) -> pid_t {
    (w.value(forKey: "_webProcessIdentifier") as? NSNumber)?.int32Value ?? 0
}

// MARK: main-thread helpers for a linear script on a worker thread
func onMain<T>(_ f: @escaping () -> T) -> T { DispatchQueue.main.sync(execute: f) }
func js(_ w: WKWebView, _ s: String) -> Any? {
    let sem = DispatchSemaphore(value: 0); var out: Any?
    DispatchQueue.main.async { w.evaluateJavaScript(s) { r, e in out = r ?? e.map { "error: \($0)" }; sem.signal() } }
    sem.wait(); return out
}
func pause(_ s: Double) { Thread.sleep(forTimeInterval: s) }

final class Bench {
    let win: NSWindow
    let handler = Handler()
    var web: WKWebView
    let size: NSSize
    let scenesDir: URL
    init(scenesDir: URL) {
        self.scenesDir = scenesDir
        size = NSScreen.main?.frame.size ?? NSSize(width: 1440, height: 900)
        win = NSWindow(contentRect: NSRect(origin: NSPoint(x: -30000, y: -30000), size: size), styleMask: [.borderless], backing: .buffered, defer: false)
        win.isReleasedWhenClosed = false
        web = makeWebView(size: size, handler: handler)
        win.contentView = web
        win.orderFrontRegardless()
    }
    func load(_ scene: String, into w: WKWebView) {
        let sem = DispatchSemaphore(value: 0)
        onMain {
            self.handler.loaded = { sem.signal() }
            w.navigationDelegate = self.handler
            var c = URLComponents(url: self.scenesDir.appendingPathComponent("\(scene).html"), resolvingAgainstBaseURL: false)!
            c.queryItems = [.init(name: "host", value: "1"), .init(name: "muted", value: "0"), .init(name: "calm", value: "0"), .init(name: "display", value: "0")]
            w.loadFileURL(c.url!, allowingReadAccessTo: self.scenesDir)
        }
        sem.wait()
        // What App.webView(_:didFinish:) hands every page.
        let h = Calendar.current.component(.hour, from: Date()), m = Calendar.current.component(.minute, from: Date())
        _ = js(w, "__lw('env',{weather:'clear',intensity:0,temp:20,wind:0.2,view:'auto',hour:\(Double(h) + Double(m) / 60),location:null}); __lw('settings',{}); __lw('perf',{fps:30}); __lw('focus',true); __lw('nowplaying',null); __lw('ambient',{kind:'\(ambient)',volume:0.35}); __lw('audio',{fx:{on:true,vol:1},ambience:{on:true,vol:1},weather:{on:true,vol:1}}); 1")
    }
    /// CPU % of one core over `seconds` for the scene's WebContent + this harness's GPU/Networking helpers.
    func measure(_ seconds: Double) -> [String: Any] {
        // Exactly this view's processes (WebKit SPI), so other WebKit users on the Mac never count.
        let (wc, gpu, net) = onMain { (webPid(self.web), self.pid(self.web, "_gpuProcessIdentifier"), self.pid(self.web, "_networkProcessIdentifier")) }
        let pids = Array(Set([wc, gpu, net].filter { $0 > 0 }))
        var a: [pid_t: UInt64] = [:]; for p in pids { a[p] = cpuNs(p) }
        let t0 = DispatchTime.now().uptimeNanoseconds
        let pb0 = js(web, "JSON.stringify([__pb.timers,__pb.frames])") as? String ?? "[0,0]"
        pause(seconds)
        let pb1 = js(web, "JSON.stringify([__pb.timers,__pb.frames])") as? String ?? "[0,0]"
        let dt = Double(DispatchTime.now().uptimeNanoseconds - t0)
        var procs: [String: Double] = [:], total = 0.0
        for p in pids {
            guard let s0 = a[p], let s1 = cpuNs(p) else { continue }
            let c = Double(s1 &- s0) / dt * 100
            let n = p == wc ? "WebContent" : p == gpu ? "GPU" : "Networking"
            procs[n, default: 0] += (c * 100).rounded() / 100; total += c
        }
        let t = (try? JSONSerialization.jsonObject(with: Data(pb0.utf8))) as? [Int] ?? [0, 0]
        let u = (try? JSONSerialization.jsonObject(with: Data(pb1.utf8))) as? [Int] ?? [0, 0]
        return ["cpu": (total * 100).rounded() / 100, "procs": procs, "mb": (footprintMB(wc) ?? 0).rounded(),
                "timersPerSec": (Double(u[0] - t[0]) / seconds * 10).rounded() / 10, "framesPerSec": (Double(u[1] - t[1]) / seconds * 10).rounded() / 10]
    }
    var ambient = "off"
    func pid(_ w: WKWebView, _ key: String) -> pid_t {
        w.responds(to: NSSelectorFromString(key)) ? ((w.value(forKey: key) as? NSNumber)?.int32Value ?? 0) : 0
    }
}

func emit(_ d: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: d, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!); fflush(stdout)
}

@main enum Main {
    static func main() {
        mach_timebase_info(&tb)
        let a = CommandLine.arguments
        guard a.count >= 4 else { print("usage: pausebench pause|switch <scenesDir> <scene,...> [...]"); exit(1) }
        let mode = a[1], dir = URL(fileURLWithPath: a[2]).absoluteURL, scenes = a[3].split(separator: ",").map(String.init)
        let kv = Dictionary(a.dropFirst(4).compactMap { s -> (String, String)? in
            let p = s.split(separator: "=", maxSplits: 1).map(String.init); return p.count == 2 ? (p[0], p[1]) : nil }, uniquingKeysWith: { $1 })
        storeKind = kv["store"] ?? "default"; poolKind = kv["pool"] ?? "shared"; hold = Double(kv["hold"] ?? "0") ?? 0
        preexisting = Set(allPids())
        let app = NSApplication.shared
        app.setActivationPolicy(.prohibited)
        Thread.detachNewThread {
            let b = onMain { Bench(scenesDir: dir) }
            b.ambient = kv["ambient"] ?? "off"
            if mode == "pause" { runPause(b, scenes, live: Double(kv["live"] ?? "8") ?? 8, paused: Double(kv["paused"] ?? "20") ?? 20, settle: Double(kv["settle"] ?? "10") ?? 10) }
            else { runSwitch(b, scenes, teardown: kv["teardown"] ?? "retire", settle: Double(kv["settle"] ?? "12") ?? 12, after: Int(kv["after"] ?? "20") ?? 20) }
            exit(0)
        }
        app.run()
    }

    static func freshView(_ b: Bench, teardown: String) {
        onMain {
            let old = b.web
            b.web = makeWebView(size: b.size, handler: b.handler)
            if teardown == "legacy" {
                // What WallWindow.freshWebView did before: blank the old page, drop it 0.5 s later.
                old.evaluateJavaScript("try{LW._ctx&&LW._ctx.close()}catch(e){}", completionHandler: nil)
                old.configuration.userContentController.removeScriptMessageHandler(forName: "lw")
                old.stopLoading()
                old.loadHTMLString("", baseURL: nil)
                b.win.contentView = b.web
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { _ = old }
            } else {
                b.win.contentView = b.web
                WebTeardown.retire(old)
            }
            // hold=N: something else keeps the old view object alive for N s (an accessibility client, a
            // pending callback…). Teardown must not depend on the view being deallocated.
            if hold > 0 { DispatchQueue.main.asyncAfter(deadline: .now() + hold) { _ = old } }
        }
    }

    static func runPause(_ b: Bench, _ scenes: [String], live: Double, paused: Double, settle: Double) {
        for (i, s) in scenes.enumerated() {
            if i > 0 { freshView(b, teardown: "retire") }
            b.load(s, into: b.web); pause(settle)
            let ctx0 = js(b.web, "(__pb.ctxs||[]).map(c=>c.state).join(',')") as? String ?? ""
            let L = b.measure(live)
            _ = js(b.web, "__lw('pauseReason','away'); __lw('focus',false); 1"); pause(3)
            let ctxP = js(b.web, "(__pb.ctxs||[]).map(c=>c.state).join(',')") as? String ?? ""
            let P = b.measure(paused)
            // Resume: the scene must move again from where it was (frames flow, audio back if it was running).
            _ = js(b.web, "__lw('pauseReason',''); __lw('focus',true); 1")
            pause(0.5); let R = b.measure(3)
            pause(1)
            let ctxR = js(b.web, "(__pb.ctxs||[]).map(c=>c.state).join(',')") as? String ?? ""
            let stills = js(b.web, "document.querySelectorAll('[data-lw-still]').length") as? Int ?? -1
            let errs = js(b.web, "String(window.__lwErr||'')") as? String ?? ""
            emit(["scene": s, "live": L, "paused": P, "resumeFps": R["framesPerSec"] ?? 0, "audio": ["live": ctx0, "paused": ctxP, "resumed": ctxR],
                  "stillsLeftAfterResume": stills, "err": errs])
        }
    }

    static func runSwitch(_ b: Bench, _ scenes: [String], teardown: String, settle: Double, after: Int) {
        // Only this harness's own processes: the old scene's WebContent (until it exits), the new one, the GPU process.
        func mb(_ p: pid_t) -> Double? { p > 0 ? footprintMB(p).map { $0.rounded() } : nil }
        let gpuPid = { onMain { b.pid(b.web, "_gpuProcessIdentifier") } }
        // Every WebContent process this harness owns (a cached/suspended old process would show here).
        func webContentMB() -> Double { webkitHelpers().filter { pname($0).contains("WebContent") }.compactMap(mb).reduce(0, +) }
        b.load(scenes[0], into: b.web); pause(settle)
        var prev = onMain { webPid(b.web) }
        emit(["phase": "loaded \(scenes[0])", "pid": prev, "mb": mb(prev) ?? 0, "gpuMB": mb(gpuPid()) ?? 0])
        for s in scenes.dropFirst() {
            freshView(b, teardown: teardown)
            b.load(s, into: b.web)
            let cur = onMain { webPid(b.web) }
            var series: [[String: Any]] = []
            for t in 1...after {
                pause(1)
                let old = mb(prev), new = mb(cur) ?? 0
                series.append(["t": t, "oldMB": old.map { $0 as Any } ?? "exited", "newMB": new, "totalMB": (old ?? 0) + (cur == prev ? 0 : new), "gpuMB": mb(gpuPid()) ?? 0,
                               "allWebContentMB": webContentMB()])
            }
            emit(["phase": "switched to \(s) (\(teardown))", "oldPid": prev, "newPid": cur, "sameProcess": cur == prev, "series": series])
            prev = cur
        }
    }
}
