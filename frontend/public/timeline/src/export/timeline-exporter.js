/**
 * Timeline Exporter
 *
 * Owns portable setup import/export and figure file rendering.
 * The editor mutates TIMELINE_CONFIG; this module serializes that active config.
 */

(function () {
  const DEFAULT_BASENAME = "timeline-figure";
  const MAX_IMPORT_SIZE_BYTES = 50 * 1024 * 1024;

  function filename(extension) {
    const title = document.querySelector('[data-page-copy="title"]')?.textContent || DEFAULT_BASENAME;
    const safeTitle = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || DEFAULT_BASENAME;
    return `${safeTitle}.${extension}`;
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function createExportBlob(format) {
    if (format === "json") {
      const payload = JSON.stringify(window.TimelineExport.createSetupPayload(), null, 2);
      return new Blob([payload], { type: "application/json;charset=utf-8" });
    }

    if (format === "svg") {
      return window.TimelineExport.svgBlob();
    }

    if (format === "png" || format === "jpg") {
      return window.TimelineExport.rasterBlob(format);
    }

    if (format === "pdf") {
      return window.TimelineExport.pdfBlob();
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  async function exportTimeline(format) {
    const blob = await createExportBlob(format);
    const extension = format === "json" ? "timeline.json" : format;
    downloadBlob(blob, filename(extension));
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Choose a setup file to import."));
        return;
      }

      const name = String(file.name || "");
      if (!/\.json$/i.test(name)) {
        reject(new Error("Import only accepts .json setup files."));
        return;
      }

      if (Number(file.size || 0) > MAX_IMPORT_SIZE_BYTES) {
        reject(new Error("Import file is too large. The maximum supported size is 50 MB."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result || "")));
        } catch (error) {
          reject(new Error("The selected file is not valid JSON."));
        }
      };
      reader.onerror = () => reject(new Error("Could not read the selected setup file."));
      reader.readAsText(file, "utf-8");
    });
  }

  function setStatus(message, isError = false) {
    const status = document.querySelector("[data-editor-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function bindExportControls() {
    document.querySelectorAll("[data-timeline-export]").forEach((button) => {
      button.addEventListener("click", async () => {
        const format = button.dataset.timelineExport;
        const menu = button.closest("[data-export-menu]");
        try {
          button.disabled = true;
          setStatus(`Preparing ${format.toUpperCase()} export...`);
          await exportTimeline(format);
          if (menu) menu.removeAttribute("open");
          setStatus(`Exported ${format.toUpperCase()}.`);
        } catch (error) {
          setStatus(error.message || "Export failed.", true);
        } finally {
          button.disabled = false;
        }
      });
    });

    const input = document.querySelector("[data-timeline-import]");
    const trigger = document.querySelector("[data-timeline-import-trigger]");
    if (!input || !trigger) return;

    trigger.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;

      try {
        const setup = await readJsonFile(file);
        window.TimelineExport.importSetupObject(setup);
        setStatus("Imported timeline setup.");
      } catch (error) {
        setStatus(error.message || "Import failed.", true);
      }
    });
  }

  window.TimelineIO = {
    createExportBlob,
    createSetupPayload: () => window.TimelineExport.createSetupPayload(),
    exportTimeline,
    importSetupObject: (payload) => window.TimelineExport.importSetupObject(payload),
    serializeSvg: () => window.TimelineExport.serializeSvg(),
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindExportControls);
  } else {
    bindExportControls();
  }
})();
