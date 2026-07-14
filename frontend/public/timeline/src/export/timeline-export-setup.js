(function () {
  const SETUP_FORMAT = "timeline-builder-config";
  const SETUP_VERSION = 1;
  const FORBIDDEN_IMPORT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  function deepClone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function getPageCopy() {
    const read = (selector) => document.querySelector(selector)?.textContent?.trim() || "";
    return {
      eyebrow: read('[data-page-copy="eyebrow"]'),
      title: read('[data-page-copy="title"]'),
      description: read('[data-page-copy="description"]'),
    };
  }

  function createSetupPayload() {
    const config = window.TimelineExport.resolveConfig();
    if (!config) throw new Error("No timeline configuration is available.");

    return {
      format: SETUP_FORMAT,
      version: SETUP_VERSION,
      exportedAt: new Date().toISOString(),
      app: "editable-timeline-builder",
      pageCopy: getPageCopy(),
      config: deepClone(config),
    };
  }

  function sanitizeImportedValue(value, path = "root") {
    if (value === null) return null;

    if (Array.isArray(value)) {
      return value.map((entry, index) => sanitizeImportedValue(entry, `${path}[${index}]`));
    }

    const valueType = typeof value;
    if (valueType === "string" || valueType === "number" || valueType === "boolean") {
      return value;
    }

    if (valueType !== "object") {
      throw new Error(`Imported setup contains an unsupported value at ${path}.`);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Imported setup must only contain plain JSON objects.");
    }

    const output = {};
    Object.entries(value).forEach(([key, entryValue]) => {
      if (FORBIDDEN_IMPORT_KEYS.has(key)) {
        throw new Error(`Imported setup contains a forbidden key: ${key}.`);
      }
      output[key] = sanitizeImportedValue(entryValue, `${path}.${key}`);
    });
    return output;
  }

  function normalizeImportedSetup(value) {
    const sanitized = sanitizeImportedValue(value);
    const payload = sanitized && typeof sanitized === "object" ? sanitized : null;
    const config = payload?.format === SETUP_FORMAT ? payload.config : payload;

    if (!config || typeof config !== "object") {
      throw new Error("The imported setup does not contain a timeline config.");
    }

    if (!config.canvas || !config.mainAxis || !Array.isArray(config.developmentWindows)) {
      throw new Error("The imported setup is missing required timeline sections.");
    }

    return {
      config: deepClone(config),
      pageCopy: payload?.pageCopy || null,
    };
  }

  function applyPageCopy(pageCopy) {
    if (!pageCopy || typeof pageCopy !== "object") return;

    [
      ["eyebrow", pageCopy.eyebrow],
      ["title", pageCopy.title],
      ["description", pageCopy.description],
    ].forEach(([name, value]) => {
      if (typeof value !== "string") return;
      const element = document.querySelector(`[data-page-copy="${name}"]`);
      if (element) element.textContent = value;
    });
  }

  function importSetupObject(value) {
    const imported = normalizeImportedSetup(value);
    window.TIMELINE_CONFIG = imported.config;
    applyPageCopy(imported.pageCopy);

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    document.dispatchEvent(
      new CustomEvent("timeline:setup-imported", {
        detail: {
          config: imported.config,
          pageCopy: imported.pageCopy,
        },
      })
    );
  }

  window.TimelineExport = window.TimelineExport || {};
  Object.assign(window.TimelineExport, {
    createSetupPayload,
    importSetupObject,
  });
})();
