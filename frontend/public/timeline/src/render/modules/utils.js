const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgElement(tagName) {
  return document.createElementNS(SVG_NS, tagName);
}

function buildArrowPath(width, height) {
  const halfHeight = Number(height) / 2;
  return `M0 0L${width} ${halfHeight}L0 ${height}Z`;
}

function applyTextStyleOverrides(textElement, colorValue, fontSizeValue) {
  if (colorValue) {
    textElement.setAttribute("fill", colorValue);
  }

  if (typeof fontSizeValue === "number" && Number.isFinite(fontSizeValue) && fontSizeValue > 0) {
    textElement.style.fontSize = `${fontSizeValue}px`;
  } else {
    textElement.style.removeProperty("font-size");
  }
}

function setDatasetAttributes(element, attributes) {
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    element.setAttribute(`data-${key}`, String(value));
  });
}
