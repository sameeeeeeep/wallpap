import AppKit

extension App {
    func application(_ application: NSApplication, open urls: [URL]) {
        // Launch Services can deliver URLs before the status item/windows exist.
        pendingSceneLinks.append(contentsOf: urls.prefix(max(0, 16 - pendingSceneLinks.count)))
        drainSceneLinks()
    }

    func drainSceneLinks() {
        guard sceneLinksReady, !handlingSceneLink, !pendingSceneLinks.isEmpty else { return }
        handlingSceneLink = true
        let url = pendingSceneLinks.removeFirst()
        guard let link = SceneLink(url: url) else {
            sceneLinkAlert("That wallpap link isn't valid", "Use wallpap://scene/<id>, optionally followed by ?look=<skin>.")
            finishSceneLink(); return
        }
        // Built-ins and previously installed official scenes work offline. Custom folders are
        // deliberately excluded: a website cannot select arbitrary locally imported content.
        if builtinScenes.contains(where: { $0.id == link.id }) || addonScenes().contains(where: { $0.scene.id == link.id && !$0.scene.custom }) {
            selectSceneLink(link); finishSceneLink(); return
        }
        if addonScenes().contains(where: { $0.scene.id == link.id && $0.scene.custom }) {
            sceneLinkAlert("A custom scene uses this ID", "Rename or remove the custom scene in wallpap before adding this catalog scene. Your custom files have not been changed.")
            finishSceneLink(); return
        }
        fetchCatalog { result in
            switch result {
            case .failure:
                self.sceneLinkAlert("Couldn't load the scene catalog", "Check your connection and try Add to desktop again.")
                self.finishSceneLink()
            case .success(let entries):
                guard let entry = entries.first(where: { $0.id == link.id }) else {
                    self.sceneLinkAlert("Scene not found", "“\(link.id)” isn't in wallpap's catalog. It may have been removed or need a newer version of wallpap.")
                    self.finishSceneLink(); return
                }
                guard !entry.pro || self.isPro else { self.openPro(); self.finishSceneLink(); return }
                NSApp.activate(ignoringOtherApps: true)
                let alert = NSAlert()
                alert.messageText = "Add \(entry.title) to wallpap?"
                alert.informativeText = "Download this scene from wallpap's catalog and set it as your desktop wallpaper."
                alert.addButton(withTitle: "Add Scene")
                alert.addButton(withTitle: "Cancel")
                alert.buttons[1].keyEquivalent = "\u{1b}"
                let confirmed: (NSApplication.ModalResponse) -> Void = { response in
                    guard response == .alertFirstButtonReturn else { self.finishSceneLink(); return }
                    self.installCatalogScene(entry.id, pick: false) { success in
                        if success { self.selectSceneLink(link) }
                        self.finishSceneLink()
                    }
                }
                // Wallpaper windows and transient popovers cannot own a useful sheet.
                if let window = NSApp.keyWindow, !(window is WallWindow), window.isVisible,
                   window.styleMask.contains(.titled), window.attachedSheet == nil {
                    alert.beginSheetModal(for: window, completionHandler: confirmed)
                } else {
                    confirmed(alert.runModal())
                }
            }
        }
    }

    private func selectSceneLink(_ link: SceneLink) {
        guard let scene = scenes.first(where: { $0.id == link.id }), !scene.custom, sceneFile(link.id) != nil else {
            sceneLinkAlert("Couldn't open this scene", "Its installed files are missing or invalid. Try adding it again from Discover.")
            return
        }
        guard !scene.pro || isPro else { openPro(); return }
        if let look = link.look {
            guard let index = skins(for: link.id).firstIndex(where: { $0.0 == look }) else {
                sceneLinkAlert("Look not found", "This look isn't available for \(scene.title). Open the scene without ?look= or choose a look in wallpap.")
                return
            }
            guard index == 0 || isPro else { openPro(); return }
        }
        let item = NSMenuItem(); item.representedObject = link.id
        pickScene(item)
        if let look = link.look {
            let setting = NSMenuItem(); setting.representedObject = [skinKeyFor(link.id), look]
            pickSetting(setting)
        }
        NSApp.activate(ignoringOtherApps: true)
    }

    private func finishSceneLink() {
        handlingSceneLink = false
        DispatchQueue.main.async { self.drainSceneLinks() }
    }

    private func sceneLinkAlert(_ title: String, _ detail: String) {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert(); alert.messageText = title; alert.informativeText = detail
        alert.runModal()
    }
}
