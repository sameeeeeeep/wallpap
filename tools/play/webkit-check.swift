import AppKit
import WebKit

@main struct Check {
 static func main() {
    let app=NSApplication.shared; app.setActivationPolicy(.prohibited)
    let test=WebCheck(); test.begin(); app.run(); _=test
 }
}
final class WebCheck: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    let root=URL(fileURLWithPath:ProcessInfo.processInfo.environment["LIVEWALL_SCENES"]!)
    var web:WKWebView!;var window:NSWindow!;var stage=0;var blocked=0;var wordReady=false;var persisted=false;var ticks=0
    func begin(){
        let cfg=WKWebViewConfiguration();cfg.websiteDataStore = .nonPersistent()
        cfg.preferences.setValue(true,forKey:"allowFileAccessFromFileURLs")
        cfg.userContentController.add(self,name:"lw");cfg.userContentController.add(self,name:"nativeQA")
        let probe="""
        if(window!==top){let tried=false;addEventListener('message',e=>{if(!e.data?.nativeQATick)return;if(!tried){tried=true;webkit.messageHandlers.lw.postMessage({type:'set',key:'forbidden',value:true});}webkit.messageHandlers.nativeQA.postMessage({ready:!!document.querySelector('#day')?.textContent,hasGuess:!!document.querySelector('#guess')});});}
        """
        cfg.userContentController.addUserScript(WKUserScript(source:probe,injectionTime:.atDocumentEnd,forMainFrameOnly:false))
        web=WKWebView(frame:NSRect(x:0,y:0,width:1000,height:750),configuration:cfg);web.navigationDelegate=self
        window=NSWindow(contentRect:NSRect(x:-20000,y:-20000,width:1000,height:750),styleMask:.borderless,backing:.buffered,defer:false);window.contentView=web;window.orderFrontRegardless()
        load("koi")
        Timer.scheduledTimer(withTimeInterval:0.2,repeats:true){[self] _ in poll()}
        DispatchQueue.main.asyncAfter(deadline:.now()+30){print("FAIL WebKit checks timed out stage=\(self.stage) blocked=\(self.blocked)");exit(1)}
    }
    func load(_ scene:String){var c=URLComponents(url:root.appendingPathComponent(scene+".html"),resolvingAgainstBaseURL:true)!;c.query="muted=1&virtual=1";web.loadFileURL(c.url!,allowingReadAccessTo:root)}
    func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){
        let allow=PlayNavigation.allows(sourceMain:action.sourceFrame.isMainFrame,targetMain:action.targetFrame?.isMainFrame,url:action.request.url)
        if !allow { print("navigation denied",action.sourceFrame.isMainFrame,action.targetFrame?.isMainFrame as Any,action.request.url?.absoluteString ?? "nil") }
        decisionHandler(allow ? .allow : .cancel)
    }
    func userContentController(_ c:WKUserContentController,didReceive message:WKScriptMessage){
        if message.name=="lw" {
            guard message.frameInfo.isMainFrame else {blocked+=1;return}
            if let m=message.body as? [String:Any],m["type"] as? String=="play",let id=m["id"] as? Int {web.evaluateJavaScript("__lw('playReply',{id:\(id),value:null})",completionHandler:nil)}
        }else if !message.frameInfo.isMainFrame,let m=message.body as? [String:Bool],m["ready"]==true,m["hasGuess"]==true{wordReady=true}
    }
    func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){
        if stage==0{stage=1;web.evaluateJavaScript("localStorage.setItem('wallpap.play.qa','local-progress');__lw('play',{open:true,pro:false})",completionHandler:nil)}
        else if stage==3{web.evaluateJavaScript("localStorage.getItem('wallpap.play.qa')"){v,e in self.persisted=(v as? String)=="local-progress";self.stage=4}}
    }
    func poll(){
        ticks+=1
        if stage==1{web.evaluateJavaScript("window.PlayShell&&PlayShell.state.open"){v,_ in if (v as? Bool)==true&&self.stage==1{self.stage=2;self.web.evaluateJavaScript("PlayShell.openCard('word-of-the-day');void 0",completionHandler:nil)}}}
        if stage==2{web.evaluateJavaScript("document.querySelector('iframe')?.contentWindow.postMessage({nativeQATick:1},'*')",completionHandler:nil);if wordReady&&blocked>0{stage=3;load("cats")}}
        if stage==4{
            precondition(persisted,"Progress did not persist across scene file URLs")
            precondition(!PlayNavigation.allows(sourceMain:false,targetMain:false,url:URL(string:"https://example.test/")))
            precondition(!PlayNavigation.allows(sourceMain:false,targetMain:true,url:URL(string:"file:///tmp/test")))
            print("Play WebKit native checks PASS: file:// shell + opaque card handshake, subframe native bridge denied, network/file frame navigation denied, local progress survives scene changes. Off-screen only; no defaults or live host touched.");exit(0)
        }
    }
}
