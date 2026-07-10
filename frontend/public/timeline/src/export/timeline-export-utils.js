(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function resolveConfig() {
    if (typeof window.resolveTimelineConfig === "function") return window.resolveTimelineConfig();
    return window.TIMELINE_CONFIG || null;
  }

  function getActiveSvg() {
    return document.querySelector(".timeline-svg");
  }

  function parseViewBox(svg) {
    const raw = svg.getAttribute("viewBox") || "";
    const parts = raw.trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3],
      };
    }

    const config = resolveConfig();
    return {
      x: 0,
      y: 0,
      width: Number(config?.canvas?.width) || 1480,
      height: Number(config?.canvas?.height) || 860,
    };
  }

  function getThemeColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function ensureExportBackground(svg, viewBox) {
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("x", String(viewBox.x));
    background.setAttribute("y", String(viewBox.y));
    background.setAttribute("width", String(viewBox.width));
    background.setAttribute("height", String(viewBox.height));
    background.setAttribute("fill", getThemeColor("--surface", "#1d1c1a"));
    background.setAttribute("data-export-background", "true");

    const frame = document.createElementNS(SVG_NS, "rect");
    const inset = 1;
    frame.setAttribute("x", String(viewBox.x + inset));
    frame.setAttribute("y", String(viewBox.y + inset));
    frame.setAttribute("width", String(Math.max(0, viewBox.width - inset * 2)));
    frame.setAttribute("height", String(Math.max(0, viewBox.height - inset * 2)));
    frame.setAttribute("rx", "24");
    frame.setAttribute("ry", "24");
    frame.setAttribute("fill", "none");
    frame.setAttribute("stroke", getThemeColor("--divider", "rgba(255,255,255,0.12)"));
    frame.setAttribute("stroke-width", "1");
    frame.setAttribute("data-export-frame", "true");

    const defs = svg.querySelector("defs");
    const insertAfterDefs = (element) => {
      if (defs && defs.nextSibling) {
        svg.insertBefore(element, defs.nextSibling);
      } else if (defs) {
        svg.appendChild(element);
      } else {
        svg.insertBefore(element, svg.firstChild);
      }
    };

    insertAfterDefs(background);
    svg.appendChild(frame);
  }

  function removeEditorOnlyElements(svg) {
    svg.querySelectorAll([
      ".node-hit-area",
      ".stage-hitbox",
      ".stage-boundary-hitbox",
      ".main-axis-hitbox",
      ".range-axis-height-hitbox",
      ".range-block-hitbox",
      ".range-block-resize-hitbox",
      ".stage-label-connector",
      ".drag-readout",
    ].join(",")).forEach((element) => element.remove());
  }

  function copyComputedSvgStyles(sourceSvg, targetSvg) {
    const sourceElements = [sourceSvg, ...sourceSvg.querySelectorAll("*")];
    const targetElements = [targetSvg, ...targetSvg.querySelectorAll("*")];
    const styleProperties = [
      "fill",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-dasharray",
      "opacity",
      "font-family",
      "font-size",
      "font-weight",
      "letter-spacing",
      "text-transform",
      "dominant-baseline",
      "paint-order",
    ];

    sourceElements.forEach((sourceElement, index) => {
      const targetElement = targetElements[index];
      if (!targetElement || !(sourceElement instanceof SVGElement) || !(targetElement instanceof SVGElement)) return;

      const computed = window.getComputedStyle(sourceElement);
      styleProperties.forEach((property) => {
        const value = computed.getPropertyValue(property);
        if (!value || value === "normal" || value === "none") return;
        targetElement.style.setProperty(property, value);
      });

      const textAnchor = sourceElement.getAttribute("text-anchor");
      if (textAnchor) targetElement.setAttribute("text-anchor", textAnchor);

      ["fill", "stroke"].forEach((attribute) => {
        const value = sourceElement.getAttribute(attribute);
        if (!value) return;
        if (value.includes("var(") || value.includes("color-mix(")) {
          const computedValue = computed.getPropertyValue(attribute);
          if (computedValue) targetElement.setAttribute(attribute, computedValue);
        }
      });
    });
  }

  function createExportSvg() {
    const svg = getActiveSvg();
    if (!svg) throw new Error("No timeline SVG is available to export.");

    const clone = svg.cloneNode(true);
    const viewBox = parseViewBox(svg);
    clone.setAttribute("xmlns", SVG_NS);
    clone.setAttribute("width", String(viewBox.width));
    clone.setAttribute("height", String(viewBox.height));
    clone.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") || "dark");

    clone.querySelectorAll(".is-selected, .is-dragging").forEach((element) => {
      element.classList.remove("is-selected", "is-dragging");
    });

    copyComputedSvgStyles(svg, clone);
    removeEditorOnlyElements(clone);
    ensureExportBackground(clone, viewBox);

    return clone;
  }

  function serializeSvg() {
    const clone = createExportSvg();
    const serialized = new XMLSerializer().serializeToString(clone);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
  }

  window.TimelineExport = window.TimelineExport || {};
  Object.assign(window.TimelineExport, {
    resolveConfig,
    getActiveSvg,
    parseViewBox,
    getThemeColor,
    ensureExportBackground,
    removeEditorOnlyElements,
    copyComputedSvgStyles,
    createExportSvg,
    serializeSvg,
  });
})();
