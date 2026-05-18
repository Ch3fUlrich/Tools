/**
 * Keeps the split iframe panels on /tools/timeline in sync.
 *
 * The standalone editor still owns all timeline behavior; the Next.js page only
 * embeds the same app twice in focused panel modes.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const panel = params.get("panel");
  if (panel !== "timeline" && panel !== "settings") return;
  if (typeof BroadcastChannel !== "function") return;

  const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const channel = new BroadcastChannel("tools-timeline-builder");
  let applyingRemoteConfig = false;

  function cloneConfig(config) {
    if (!config) return null;
    try {
      return JSON.parse(JSON.stringify(config));
    } catch (_error) {
      return null;
    }
  }

  document.addEventListener("timeline:rendered", (event) => {
    if (applyingRemoteConfig) return;

    const config = cloneConfig(event.detail?.config || window.TIMELINE_CONFIG);
    if (!config) return;

    channel.postMessage({
      type: "timeline-config-updated",
      source: instanceId,
      config,
    });
  });

  channel.addEventListener("message", (event) => {
    const message = event.data || {};
    if (message.type !== "timeline-config-updated" || message.source === instanceId) return;

    const config = cloneConfig(message.config);
    if (!config) return;

    applyingRemoteConfig = true;
    window.TIMELINE_CONFIG = config;

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    applyingRemoteConfig = false;
  });
})();
