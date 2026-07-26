// Deterrent only: blocks the common DevTools shortcuts and right-click menu.
// This does NOT protect any secret or source code - anyone can still fetch
// the raw HTML/JS/CSS directly (curl, view-source:, browser dev flags,
// disabling JS before load, etc). It only stops casual users from opening
// DevTools with a keypress or right-click.
(function () {
  function isDevToolsShortcut(e) {
    const key = e.key;
    if (key === "F12") return true;
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C", "i", "j", "c"].includes(key)) {
      return true;
    }
    if ((e.ctrlKey || e.metaKey) && ["U", "u"].includes(key)) {
      return true;
    }
    return false;
  }

  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  document.addEventListener("keydown", function (e) {
    if (isDevToolsShortcut(e)) {
      e.preventDefault();
    }
  });
})();
