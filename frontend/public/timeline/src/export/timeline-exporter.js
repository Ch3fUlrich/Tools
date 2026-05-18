/**
 * Timeline Exporter
 *
 * Owns portable setup import/export and figure file rendering.
 * The editor mutates TIMELINE_CONFIG; this module serializes that active config.
 */

(function () {
  const SETUP_FORMAT = "timeline-builder-config";
  const SETUP_VERSION = 1;
  const DEFAULT_BASENAME = "timeline-figure";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MAX_IMPORT_SIZE_BYTES = 50 * 1024 * 1024;
  const FORBIDDEN_IMPORT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  function deepClone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function resolveConfig() {
    if (typeof window.resolveTimelineConfig === "function") return window.resolveTimelineConfig();
    return window.TIMELINE_CONFIG || null;
  }

  function getActiveSvg() {
    return document.querySelector(".timeline-svg");
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
    const config = resolveConfig();
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

  function svgBlob() {
    return new Blob([serializeSvg()], { type: "image/svg+xml;charset=utf-8" });
  }

  function svgToImage() {
    return new Promise((resolve, reject) => {
      const svg = getActiveSvg();
      if (!svg) {
        reject(new Error("No timeline SVG is available to export."));
        return;
      }

      const viewBox = parseViewBox(svg);
      const image = new Image();
      const svgText = serializeSvg();
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Timed out while rendering the SVG for image export."));
      }, 5000);

      image.onload = () => {
        window.clearTimeout(timeoutId);
        resolve({ image, width: viewBox.width, height: viewBox.height });
      };
      image.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error("Could not render the SVG for image export."));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create image file."));
      }, mimeType, quality);
    });
  }

  async function rasterBlob(format) {
    const { image, width, height } = await svgToImage();
    const scale = Math.max(3, Math.min(5, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext("2d");
    context.setTransform(scale, 0, 0, scale, 0, 0);

    if (format === "jpg") {
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);

    if (format === "jpg") return canvasToBlob(canvas, "image/jpeg", 0.92);
    return canvasToBlob(canvas, "image/png");
  }

  function parseColor(value, fallback = { r: 0, g: 0, b: 0, a: 1 }) {
    const raw = String(value || "").trim();
    if (!raw || raw === "none" || raw === "transparent") return { ...fallback, a: raw === "transparent" ? 0 : fallback.a };

    const rgbMatch = raw.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(",").map((part) => part.trim());
      return {
        r: clampColor(Number.parseFloat(parts[0])),
        g: clampColor(Number.parseFloat(parts[1])),
        b: clampColor(Number.parseFloat(parts[2])),
        a: parts[3] === undefined ? 1 : clampAlpha(Number.parseFloat(parts[3])),
      };
    }

    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const expanded = hex.length === 3
        ? hex.split("").map((digit) => `${digit}${digit}`).join("")
        : hex;
      return {
        r: Number.parseInt(expanded.slice(0, 2), 16),
        g: Number.parseInt(expanded.slice(2, 4), 16),
        b: Number.parseInt(expanded.slice(4, 6), 16),
        a: 1,
      };
    }

    return fallback;
  }

  function isResolvedPaintValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (raw === "none" || raw === "transparent") return true;
    if (/^rgba?\(/i.test(raw)) return true;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return true;
    return false;
  }

  function resolvePaintValue(element, attributeName, computedValue) {
    const inlineStyleValue = String(element.style?.getPropertyValue?.(attributeName) || "").trim();
    if (isResolvedPaintValue(inlineStyleValue)) return inlineStyleValue;

    const computed = String(computedValue || "").trim();
    if (isResolvedPaintValue(computed)) return computed;

    const attributeValue = String(element.getAttribute(attributeName) || "").trim();
    return attributeValue;
  }

  function clampColor(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(255, value));
  }

  function clampAlpha(value) {
    if (!Number.isFinite(value)) return 1;
    return Math.max(0, Math.min(1, value));
  }

  function pdfNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return String(Math.round(number * 1000) / 1000);
  }

  function pdfEscapeText(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function getPdfStyle(element) {
    const computed = window.getComputedStyle(element);
    const fill = resolvePaintValue(element, "fill", computed.fill);
    const stroke = resolvePaintValue(element, "stroke", computed.stroke);
    const opacity = clampAlpha(Number.parseFloat(element.getAttribute("opacity") || computed.opacity || "1"));
    const strokeWidth = Number.parseFloat(
      element.style.getPropertyValue("stroke-width")
      || element.getAttribute("stroke-width")
      || computed.strokeWidth
      || "1"
    );
    const fontSize = Number.parseFloat(
      element.style.getPropertyValue("font-size")
      || element.style.fontSize
      || computed.fontSize
      || "12"
    );
    const fontWeight = Number.parseInt(
      element.style.getPropertyValue("font-weight")
      || element.style.fontWeight
      || computed.fontWeight
      || "400",
      10
    );

    return {
      fill: parseColor(fill, { r: 0, g: 0, b: 0, a: 0 }),
      stroke: parseColor(stroke, { r: 0, g: 0, b: 0, a: 0 }),
      opacity,
      strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 1,
      fontSize: Number.isFinite(fontSize) ? fontSize : 12,
      fontWeight: Number.isFinite(fontWeight) ? fontWeight : 400,
      textAnchor: element.getAttribute("text-anchor") || computed.textAnchor || "start",
    };
  }

  function colorCommand(color, operator) {
    return `${pdfNumber(color.r / 255)} ${pdfNumber(color.g / 255)} ${pdfNumber(color.b / 255)} ${operator}\n`;
  }

  function alphaCommand(style) {
    const alpha = clampAlpha((style.opacity ?? 1) * (style.fill?.a ?? 1));
    if (alpha >= 0.995) return "";
    return `/GS${Math.round(alpha * 100)} gs\n`;
  }

  function strokeAlphaCommand(style) {
    const alpha = clampAlpha((style.opacity ?? 1) * (style.stroke?.a ?? 1));
    if (alpha >= 0.995) return "";
    return `/GS${Math.round(alpha * 100)} gs\n`;
  }

  function roundedRectPath(x, y, width, height, radiusX, radiusY) {
    const rx = Math.max(0, Math.min(radiusX || 0, width / 2));
    const ry = Math.max(0, Math.min(radiusY || 0, height / 2));
    if (rx <= 0 || ry <= 0) {
      return `${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re\n`;
    }

    const k = 0.552284749831;
    const cox = rx * k;
    const coy = ry * k;
    const right = x + width;
    const top = y + height;

    return [
      `${pdfNumber(x + rx)} ${pdfNumber(y)} m`,
      `${pdfNumber(right - rx)} ${pdfNumber(y)} l`,
      `${pdfNumber(right - rx + cox)} ${pdfNumber(y)} ${pdfNumber(right)} ${pdfNumber(y + ry - coy)} ${pdfNumber(right)} ${pdfNumber(y + ry)} c`,
      `${pdfNumber(right)} ${pdfNumber(top - ry)} l`,
      `${pdfNumber(right)} ${pdfNumber(top - ry + coy)} ${pdfNumber(right - rx + cox)} ${pdfNumber(top)} ${pdfNumber(right - rx)} ${pdfNumber(top)} c`,
      `${pdfNumber(x + rx)} ${pdfNumber(top)} l`,
      `${pdfNumber(x + rx - cox)} ${pdfNumber(top)} ${pdfNumber(x)} ${pdfNumber(top - ry + coy)} ${pdfNumber(x)} ${pdfNumber(top - ry)} c`,
      `${pdfNumber(x)} ${pdfNumber(y + ry)} l`,
      `${pdfNumber(x)} ${pdfNumber(y + ry - coy)} ${pdfNumber(x + rx - cox)} ${pdfNumber(y)} ${pdfNumber(x + rx)} ${pdfNumber(y)} c`,
      "h",
    ].join("\n") + "\n";
  }

  function rectCommand(element, pageHeight) {
    const style = getPdfStyle(element);
    const x = Number(element.getAttribute("x")) || 0;
    const y = Number(element.getAttribute("y")) || 0;
    const width = Number(element.getAttribute("width")) || 0;
    const height = Number(element.getAttribute("height")) || 0;
    const rx = Number(element.getAttribute("rx")) || 0;
    const ry = Number(element.getAttribute("ry")) || rx;
    if (width <= 0 || height <= 0) return "";

    const pdfY = pageHeight - y - height;
    const hasFill = style.fill.a > 0;
    const hasStroke = style.stroke.a > 0 && style.strokeWidth > 0;
    if (!hasFill && !hasStroke) return "";

    let command = "q\n";
    if (hasFill) command += alphaCommand(style) + colorCommand(style.fill, "rg");
    if (hasStroke) command += strokeAlphaCommand(style) + colorCommand(style.stroke, "RG") + `${pdfNumber(style.strokeWidth)} w\n`;
    command += roundedRectPath(x, pdfY, width, height, rx, ry);
    command += hasFill && hasStroke ? "B\n" : (hasFill ? "f\n" : "S\n");
    command += "Q\n";
    return command;
  }

  function lineCommand(element, pageHeight) {
    const style = getPdfStyle(element);
    if (style.stroke.a <= 0 || style.strokeWidth <= 0) return "";

    const x1 = Number(element.getAttribute("x1")) || 0;
    const y1 = Number(element.getAttribute("y1")) || 0;
    const x2 = Number(element.getAttribute("x2")) || 0;
    const y2 = Number(element.getAttribute("y2")) || 0;
    const dash = element.getAttribute("stroke-dasharray");

    let command = "q\n";
    command += strokeAlphaCommand(style) + colorCommand(style.stroke, "RG") + `${pdfNumber(style.strokeWidth)} w\n`;
    if (dash && dash !== "none") {
      const values = dash.split(/[,\s]+/).map(Number).filter(Number.isFinite);
      if (values.length) command += `[${values.map(pdfNumber).join(" ")}] 0 d\n`;
    }
    command += `${pdfNumber(x1)} ${pdfNumber(pageHeight - y1)} m ${pdfNumber(x2)} ${pdfNumber(pageHeight - y2)} l S\n`;

    if (element.getAttribute("marker-end")) {
      command += arrowHeadCommand(x1, y1, x2, y2, pageHeight, style.stroke);
    }

    command += "Q\n";
    return command;
  }

  function arrowHeadCommand(x1, y1, x2, y2, pageHeight, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const length = 10;
    const width = 7;
    const tip = { x: x2, y: y2 };
    const base = {
      x: x2 - Math.cos(angle) * length,
      y: y2 - Math.sin(angle) * length,
    };
    const normal = {
      x: Math.cos(angle + Math.PI / 2) * width / 2,
      y: Math.sin(angle + Math.PI / 2) * width / 2,
    };
    const left = { x: base.x + normal.x, y: base.y + normal.y };
    const right = { x: base.x - normal.x, y: base.y - normal.y };

    return [
      colorCommand(color, "rg"),
      `${pdfNumber(tip.x)} ${pdfNumber(pageHeight - tip.y)} m`,
      `${pdfNumber(left.x)} ${pdfNumber(pageHeight - left.y)} l`,
      `${pdfNumber(right.x)} ${pdfNumber(pageHeight - right.y)} l`,
      "h f\n",
    ].join("\n");
  }

  function circleCommand(element, pageHeight) {
    const style = getPdfStyle(element);
    const cx = Number(element.getAttribute("cx")) || 0;
    const cy = Number(element.getAttribute("cy")) || 0;
    const r = Number(element.getAttribute("r")) || 0;
    if (r <= 0 || style.fill.a <= 0) return "";

    const c = 0.5522847498 * r;
    const y = pageHeight - cy;
    return [
      "q",
      alphaCommand(style) + colorCommand(style.fill, "rg").trim(),
      `${pdfNumber(cx + r)} ${pdfNumber(y)} m`,
      `${pdfNumber(cx + r)} ${pdfNumber(y + c)} ${pdfNumber(cx + c)} ${pdfNumber(y + r)} ${pdfNumber(cx)} ${pdfNumber(y + r)} c`,
      `${pdfNumber(cx - c)} ${pdfNumber(y + r)} ${pdfNumber(cx - r)} ${pdfNumber(y + c)} ${pdfNumber(cx - r)} ${pdfNumber(y)} c`,
      `${pdfNumber(cx - r)} ${pdfNumber(y - c)} ${pdfNumber(cx - c)} ${pdfNumber(y - r)} ${pdfNumber(cx)} ${pdfNumber(y - r)} c`,
      `${pdfNumber(cx + c)} ${pdfNumber(y - r)} ${pdfNumber(cx + r)} ${pdfNumber(y - c)} ${pdfNumber(cx + r)} ${pdfNumber(y)} c`,
      "f",
      "Q\n",
    ].join("\n");
  }

  function simplePathCommand(element, pageHeight) {
    const style = getPdfStyle(element);
    if (style.fill.a <= 0) return "";

    const d = element.getAttribute("d") || "";
    const tokens = d.match(/[MLZmlz]|-?\d*\.?\d+/g) || [];
    if (!tokens.length) return "";

    let index = 0;
    let command = "q\n" + alphaCommand(style) + colorCommand(style.fill, "rg");
    while (index < tokens.length) {
      const token = tokens[index++];
      if (/^[Mm]$/.test(token) || /^[Ll]$/.test(token)) {
        const x = Number(tokens[index++]);
        const y = Number(tokens[index++]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) break;
        command += `${pdfNumber(x)} ${pdfNumber(pageHeight - y)} ${/^[Mm]$/.test(token) ? "m" : "l"}\n`;
      } else if (/^[Zz]$/.test(token)) {
        command += "h\n";
      }
    }
    command += "f\nQ\n";
    return command;
  }

  function textCommand(element, pageHeight) {
    const text = element.textContent || "";
    if (!text.trim()) return "";

    const style = getPdfStyle(element);
    if (style.fill.a <= 0) return "";

    let x = Number(element.getAttribute("x")) || 0;
    const y = Number(element.getAttribute("y")) || 0;
    const approxWidth = text.length * style.fontSize * 0.54;
    if (style.textAnchor === "middle") x -= approxWidth / 2;
    if (style.textAnchor === "end") x -= approxWidth;

    const fontName = style.fontWeight >= 700 ? "F2" : "F1";
    const transform = element.getAttribute("transform") || "";
    const rotateMatch = transform.match(/rotate\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)/);

    let textMatrix = `1 0 0 1 ${pdfNumber(x)} ${pdfNumber(pageHeight - y)}`;
    if (rotateMatch) {
      const angle = Number(rotateMatch[1]) * Math.PI / 180;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      textMatrix = `${pdfNumber(cos)} ${pdfNumber(sin)} ${pdfNumber(-sin)} ${pdfNumber(cos)} ${pdfNumber(x)} ${pdfNumber(pageHeight - y)}`;
    }

    return [
      "q",
      alphaCommand(style) + colorCommand(style.fill, "rg").trim(),
      "BT",
      `/${fontName} ${pdfNumber(style.fontSize)} Tf`,
      `${textMatrix} Tm`,
      `(${pdfEscapeText(text)}) Tj`,
      "ET",
      "Q\n",
    ].join("\n");
  }

  function buildVectorPdfContent(svg, pageHeight) {
    let content = "";
    svg.querySelectorAll("rect, line, circle, path, text").forEach((element) => {
      if (!(element instanceof SVGElement)) return;
      const tag = element.tagName.toLowerCase();
      if (tag === "rect") content += rectCommand(element, pageHeight);
      if (tag === "line") content += lineCommand(element, pageHeight);
      if (tag === "circle") content += circleCommand(element, pageHeight);
      if (tag === "path") content += simplePathCommand(element, pageHeight);
      if (tag === "text") content += textCommand(element, pageHeight);
    });
    return content;
  }

  function createVectorPdfBlob(svg, width, height) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let byteLength = 0;
    const content = buildVectorPdfContent(svg, height);

    const pushText = (text) => {
      const bytes = encoder.encode(text);
      chunks.push(bytes);
      byteLength += bytes.length;
    };

    const pushObject = (text) => {
      offsets.push(byteLength);
      pushText(text);
    };

    pushText("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
    pushObject("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    pushObject("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    pushObject(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(width)} ${pdfNumber(height)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /ExtGState ${buildExtGStateResource()} >> /Contents 6 0 R >>\nendobj\n`);
    pushObject("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
    pushObject("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");
    pushObject(`6 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);

    const xrefOffset = byteLength;
    pushText(`xref\n0 ${offsets.length}\n`);
    pushText("0000000000 65535 f \n");
    offsets.slice(1).forEach((offset) => {
      pushText(`${String(offset).padStart(10, "0")} 00000 n \n`);
    });
    pushText(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return new Blob(chunks, { type: "application/pdf" });
  }

  function buildExtGStateResource() {
    const entries = [];
    for (let alpha = 1; alpha <= 99; alpha += 1) {
      const value = alpha / 100;
      entries.push(`/GS${alpha} << /Type /ExtGState /ca ${pdfNumber(value)} /CA ${pdfNumber(value)} >>`);
    }
    return `<< ${entries.join(" ")} >>`;
  }

  async function pdfBlob() {
    const svg = createExportSvg();
    const viewBox = parseViewBox(svg);
    return createVectorPdfBlob(svg, Math.round(viewBox.width), Math.round(viewBox.height));
  }

  async function exportTimeline(format) {
    const blob = await createExportBlob(format);
    const extension = format === "json" ? "timeline.json" : format;
    downloadBlob(blob, filename(extension));
  }

  async function createExportBlob(format) {
    if (format === "json") {
      const payload = JSON.stringify(createSetupPayload(), null, 2);
      return new Blob([payload], { type: "application/json;charset=utf-8" });
    }

    if (format === "svg") {
      return svgBlob();
    }

    if (format === "png" || format === "jpg") {
      return rasterBlob(format);
    }

    if (format === "pdf") {
      return pdfBlob();
    }

    throw new Error(`Unsupported export format: ${format}`);
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
        importSetupObject(setup);
        setStatus("Imported timeline setup.");
      } catch (error) {
        setStatus(error.message || "Import failed.", true);
      }
    });
  }

  window.TimelineIO = {
    createExportBlob,
    createSetupPayload,
    exportTimeline,
    importSetupObject,
    serializeSvg,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindExportControls);
  } else {
    bindExportControls();
  }
})();
