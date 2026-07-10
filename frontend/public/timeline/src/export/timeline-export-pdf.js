(function () {
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
    const rounded = Math.round(value * 1000) / 1000;
    return rounded === 0 ? "0" : String(rounded);
  }

  function pdfEscapeText(value) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function getPdfStyle(element) {
    const computed = window.getComputedStyle(element);
    return {
      fill: parseColor(resolvePaintValue(element, "fill", computed.getPropertyValue("fill"))),
      stroke: parseColor(resolvePaintValue(element, "stroke", computed.getPropertyValue("stroke")), { r: 0, g: 0, b: 0, a: 0 }),
      strokeWidth: Number.parseFloat(computed.getPropertyValue("stroke-width") || element.getAttribute("stroke-width")) || 0,
      fontSize: Number.parseFloat(computed.getPropertyValue("font-size") || element.getAttribute("font-size")) || 16,
      fontWeight: Number.parseInt(computed.getPropertyValue("font-weight") || element.getAttribute("font-weight"), 10) || 400,
      textAnchor: element.getAttribute("text-anchor") || "start",
    };
  }

  function colorCommand(color, operator) {
    return `${pdfNumber(color.r / 255)} ${pdfNumber(color.g / 255)} ${pdfNumber(color.b / 255)} ${operator}\n`;
  }

  function alphaCommand(style) {
    const alpha = style.fill.a;
    if (alpha >= 0.995) return "";
    return `/GS${Math.round(alpha * 100)} gs\n`;
  }

  function strokeAlphaCommand(style) {
    const alpha = style.stroke.a;
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
    const svg = window.TimelineExport.createExportSvg();
    const viewBox = window.TimelineExport.parseViewBox(svg);
    return createVectorPdfBlob(svg, Math.round(viewBox.width), Math.round(viewBox.height));
  }

  window.TimelineExport = window.TimelineExport || {};
  Object.assign(window.TimelineExport, {
    pdfBlob,
  });
})();
