import WebKit

/// Taking a scene's web view out of service (scene switch, display rebuild).
///
/// The old way (load "" into the old view, drop our reference 0.5 s later) only freed the scene when the
/// WKWebView object actually deallocated. Anything else holding the view — an accessibility client, a
/// pending callback — kept the old page's process alive as about:blank with the previous scene's heap
/// still in it (~700–800 MB after Santorini Cats, measured with tools/measure/pausebench.swift hold=60).
/// Closing the page explicitly ends that WebContent process within a second no matter who still holds
/// the view object. The page gets `pagehide` first (lw.js drops its stills and closes its AudioContext).
enum WebTeardown {
    static func retire(_ old: WKWebView) {
        old.navigationDelegate = nil
        old.uiDelegate = nil
        old.configuration.userContentController.removeScriptMessageHandler(forName: "lw")
        old.configuration.userContentController.removeAllUserScripts()
        old.stopLoading()
        old.removeFromSuperview()
        // -[WKWebView _close] (SPI, present on every macOS we support) closes the page and its process now.
        let close = NSSelectorFromString("_close")
        if old.responds(to: close) { old.perform(close) } else { old.loadHTMLString("", baseURL: nil) }
    }
}
