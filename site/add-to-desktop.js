/* Shared by the site and Node tests. No installed-app probing until a visitor clicks. */
(function (root) {
  'use strict';
  const validID = (id) => typeof id === 'string' && id.length > 0 && id.length <= 40 &&
    !/[^a-z0-9-]/.test(id) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  function sceneURL(id, look) {
    if (!validID(id) || (look != null && !validID(look))) throw new Error('Invalid scene link');
    return `wallpap://scene/${id}${look == null ? '' : `?look=${look}`}`;
  }
  function isMac(navigator) {
    return /mac/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '') &&
      !/iPhone|iPad|iPod|Android/.test(navigator.userAgent || '') && !(navigator.maxTouchPoints > 1);
  }
  function createLauncher({ win, doc, storage, navigate, showFallback, onHandled = () => {},
    setTimer = setTimeout, clearTimer = clearTimeout }) {
    const key = 'wallpap.app-opened';
    let cancel = () => {};
    const remembered = () => { try { return storage.getItem(key) === '1'; } catch (_) { return false; } };
    function open(id, look) {
      const url = sceneURL(id, look);
      cancel();
      if (!isMac(win.navigator)) { showFallback({ id, look, mac: false }); return; }
      // Every click goes directly to the scheme, including remembered visitors. Keep the
      // timeout even for them: an uninstall or an older app must still offer a way forward.
      const known = remembered();
      let timer, settled = false;
      // The fullscreen panel is an iframe: it may already hold focus, so the app
      // switch blurs that window instead of the parent window.
      let focusedFrame;
      try { if (doc.activeElement?.tagName === 'IFRAME') focusedFrame = doc.activeElement.contentWindow; } catch (_) {}
      const cleanup = () => {
        clearTimer(timer);
        win.removeEventListener('blur', handled);
        focusedFrame?.removeEventListener('blur', handled);
        doc.removeEventListener('visibilitychange', visibility);
      };
      const handled = () => {
        if (settled) return;
        settled = true; cleanup();
        try { storage.setItem(key, '1'); } catch (_) {}
        onHandled({ id, look });
      };
      const visibility = () => { if (doc.hidden) handled(); };
      cancel = () => { settled = true; cleanup(); };
      win.addEventListener('blur', handled);
      focusedFrame?.addEventListener('blur', handled);
      doc.addEventListener('visibilitychange', visibility);
      const fallback = () => {
        if (settled) return;
        settled = true; cleanup();
        try { storage.removeItem(key); } catch (_) {}
        showFallback({ id, look, mac: true, known });
      };
      timer = setTimer(fallback, 1500);
      try { navigate(url); } catch (_) { fallback(); }
    }
    return { open, cancel: () => cancel(), remembered };
  }
  const api = { validID, sceneURL, isMac, createLauncher };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WallpapLinks = api;
})(typeof window !== 'undefined' ? window : globalThis);
