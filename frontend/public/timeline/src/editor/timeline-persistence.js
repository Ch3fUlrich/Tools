/**
 * Persists the timeline figure to localStorage so edits survive reloads,
 * navigation, and theme changes.
 *
 * Load order matters: this script must run after timeline-config.js (it
 * chains onto window.timelineConfigReady so a saved figure wins over the
 * bundled default) and before timeline-generator.js renders.
 */
(function () {
  var STORAGE_KEY = "tools-timeline-config-v1";

  function readSaved() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  // Restore: prefer the saved figure over the bundled default config.
  if (window.timelineConfigReady && typeof window.timelineConfigReady.then === "function") {
    window.timelineConfigReady = window.timelineConfigReady.then(function (config) {
      var saved = readSaved();
      if (saved) {
        window.TIMELINE_CONFIG = saved;
        return saved;
      }
      return config;
    });
  }

  // Save (debounced) after every render — covers edits, imports, undo/redo,
  // and "New figure" alike.
  var saveTimer = null;
  document.addEventListener("timeline:rendered", function (event) {
    var config = (event.detail && event.detail.config) || window.TIMELINE_CONFIG;
    if (!config) return;
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (_error) {
        // Storage full or blocked — editing continues without persistence.
      }
    }, 250);
  });
})();
