/**
 * Timeline configuration loader.
 *
 * The default timeline data lives in configs/timeline-default-config.json.
 * This loader keeps the app data-driven while still supporting direct file:// use.
 */

(function () {
  const DEFAULT_CONFIG_URL = "./configs/timeline-default-config.json";
  const DEFAULT_TITLE_FONT_SIZE = 16;
  const DEFAULT_SUBTEXT_FONT_SIZE = 13;

  function deepClone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function normalizePositiveFontSize(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return numeric;
  }

  function normalizeTextEntries(entries) {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      entry.titleFontSize = normalizePositiveFontSize(entry.titleFontSize, DEFAULT_TITLE_FONT_SIZE);
      entry.ageFontSize = normalizePositiveFontSize(entry.ageFontSize, DEFAULT_SUBTEXT_FONT_SIZE);
    });
  }

  function normalizeTimelineConfig(config) {
    if (!config || typeof config !== "object") return config;
    if (!config.nodes || typeof config.nodes !== "object") config.nodes = {};
    if (!config.blocks || typeof config.blocks !== "object") config.blocks = {};
    config.nodes.titleFontSize = normalizePositiveFontSize(config.nodes.titleFontSize, DEFAULT_TITLE_FONT_SIZE);
    config.nodes.ageFontSize = normalizePositiveFontSize(config.nodes.ageFontSize, DEFAULT_SUBTEXT_FONT_SIZE);
    config.blocks.titleFontSize = normalizePositiveFontSize(config.blocks.titleFontSize, DEFAULT_TITLE_FONT_SIZE);
    config.blocks.ageFontSize = normalizePositiveFontSize(config.blocks.ageFontSize, DEFAULT_SUBTEXT_FONT_SIZE);
    normalizeTextEntries(config.humanNodes);
    normalizeTextEntries(config.mouseNodes);
    normalizeTextEntries(config.humanRangeBlocks);
    normalizeTextEntries(config.mouseRangeBlocks);
    return config;
  }

  function useConfig(config, sourceUrl) {
    window.TIMELINE_CONFIG = normalizeTimelineConfig(deepClone(config));
    document.dispatchEvent(
      new CustomEvent("timeline:config-loaded", {
        detail: {
          config: window.TIMELINE_CONFIG,
          url: sourceUrl,
        },
      })
    );
    return window.TIMELINE_CONFIG;
  }

  async function loadJsonWithFetch(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load ${url}: ${response.status}`);
    }
    return response.json();
  }

  function loadJsonWithIframe(url) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.hidden = true;
      iframe.setAttribute("aria-hidden", "true");

      const cleanup = () => {
        iframe.remove();
      };

      iframe.addEventListener("load", () => {
        try {
          const text = iframe.contentDocument?.body?.textContent || "";
          cleanup();
          resolve(JSON.parse(text));
        } catch (error) {
          cleanup();
          reject(error);
        }
      });

      iframe.addEventListener("error", () => {
        cleanup();
        reject(new Error(`Could not load ${url}`));
      });

      iframe.src = url;
      document.documentElement.appendChild(iframe);
    });
  }

  async function loadDefaultTimelineConfig() {
    if (window.TIMELINE_DEFAULT_CONFIG) {
      return useConfig(window.TIMELINE_DEFAULT_CONFIG, "./src/config/timeline-default-config.js");
    }

    try {
      return useConfig(await loadJsonWithFetch(DEFAULT_CONFIG_URL), DEFAULT_CONFIG_URL);
    } catch (fetchError) {
      return useConfig(await loadJsonWithIframe(DEFAULT_CONFIG_URL), DEFAULT_CONFIG_URL);
    }
  }

  window.timelineConfigReady = loadDefaultTimelineConfig();
})();
