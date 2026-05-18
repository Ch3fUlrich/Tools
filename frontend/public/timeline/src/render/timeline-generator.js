/**
 * Timeline Generator
 *
 * Generates SVG timeline markup from TIMELINE_CONFIG.
 * Includes editable stage boundaries, dual age-range axes,
 * and text metadata hooks for interactive editing.
 */

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

function getStageLabelSettings(config) {
  const stageLabels = config.stageLabels || {};
  return {
    y: stageLabels.y ?? 114,
    fill: stageLabels.fill ?? "color-mix(in srgb, var(--text) 78%, transparent)",
    className: stageLabels.class ?? "svg-window-label",
  };
}

function setDatasetAttributes(element, attributes) {
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    element.setAttribute(`data-${key}`, String(value));
  });
}

function inferHumanLabel(stage, index) {
  if (stage.humanLabel) return stage.humanLabel;
  if (stage.label && stage.label.includes("/")) {
    return stage.label.split("/")[0].trim();
  }
  return stage.label || `Stage ${index + 1}`;
}

function inferMouseLabel(stage, index) {
  if (stage.mouseLabel) return stage.mouseLabel;
  if (stage.label && stage.label.includes("/")) {
    return stage.label.split("/").slice(1).join("/").trim();
  }
  return `Mouse stage ${index + 1}`;
}

function inferStageName(stage, index) {
  if (stage.stageName) return stage.stageName;
  if (stage.humanLabel) return stage.humanLabel;
  if (stage.label) return stage.label;
  return `Stage ${index + 1}`;
}

function inferLayoutMode(config) {
  const hasHumanContent = Boolean((config?.humanNodes?.length || 0) || (config?.humanRangeBlocks?.length || 0));
  const hasMouseContent = Boolean((config?.mouseNodes?.length || 0) || (config?.mouseRangeBlocks?.length || 0));

  if (hasHumanContent && !hasMouseContent) return "upper";
  if (hasMouseContent && !hasHumanContent) return "lower";

  const explicitLayout = config?.layoutMode;
  if (explicitLayout === "upper" || explicitLayout === "lower" || explicitLayout === "dual") {
    return explicitLayout;
  }

  return "dual";
}

function normalizeSingleGroupLayout(config) {
  const layoutMode = inferLayoutMode(config);
  if (layoutMode === "dual" || !Array.isArray(config?.developmentWindows) || !config.developmentWindows.length) {
    return;
  }

  const stageEditing = config.stageEditing || {};
  const mainY = Number(config?.mainAxis?.y ?? 385);
  const initialTop = Number(stageEditing.boundaryTopY ?? config.developmentWindows[0]?.y ?? 105);
  const initialBottom = Number(
    stageEditing.boundaryBottomY
    ?? ((config.developmentWindows[0]?.y ?? 105) + (config.developmentWindows[0]?.height ?? 0))
  );
  const bandGap = 24;
  const targetTop = layoutMode === "lower" ? roundToThree(mainY + bandGap) : initialTop;
  const targetBottom = layoutMode === "upper" ? roundToThree(mainY - bandGap) : initialBottom;
  const targetHeight = Math.max(120, roundToThree(targetBottom - targetTop));
  const targetLabelY = layoutMode === "lower"
    ? roundToThree(targetTop + targetHeight - 14)
    : roundToThree(targetTop + 18);

  config.developmentWindows.forEach((stage) => {
    stage.y = targetTop;
    stage.height = targetHeight;
    stage.stageLabelY = targetLabelY;
  });

  config.stageEditing = {
    ...stageEditing,
    boundaryTopY: targetTop,
    boundaryBottomY: roundToThree(targetTop + targetHeight),
  };

  if (Array.isArray(config.axisLabels)) {
    if (config.axisLabels[0]) {
      config.axisLabels[0].hidden = layoutMode === "lower";
      config.axisLabels[0].y = roundToThree((targetTop + mainY) / 2);
    }
    if (config.axisLabels[1]) {
      config.axisLabels[1].hidden = layoutMode === "upper";
      config.axisLabels[1].y = roundToThree((mainY + targetTop + targetHeight) / 2);
    }
  }

}

function syncWindowLabelsFromStages(config) {
  if (!Array.isArray(config.developmentWindows)) return;

  if (!Array.isArray(config.windowLabels)) {
    config.windowLabels = [];
  }

  const stageLabelSettings = getStageLabelSettings(config);
  const labels = [];
  const layoutMode = inferLayoutMode(config);

  config.developmentWindows.forEach((stage, index) => {
    const currentStage = config.windowLabels.find((entry) => entry.stageIndex === index) || {};
    const fallbackLabelY = layoutMode === "lower"
      ? ((stage.y || 0) + (stage.height || 0) - 14)
      : ((stage.y || 0) + 18);

    labels.push({
      stageIndex: index,
      x: stage.x + stage.width / 2,
      y: stage.stageLabelY ?? currentStage.y ?? fallbackLabelY ?? stageLabelSettings.y,
      text: inferStageName(stage, index) || currentStage.text || `Stage ${index + 1}`,
      class: stage.stageLabelClass || currentStage.class || stageLabelSettings.className,
      fill: stage.stageLabelFill || currentStage.fill || stageLabelSettings.fill,
    });
  });

  config.windowLabels = labels;
}

function renderTimelineLegend(config) {
  const legend = document.querySelector("[data-timeline-legend]");
  if (!legend || !config) return;

  const items = [];
  const layoutMode = inferLayoutMode(config);

  if (layoutMode !== "lower") {
    items.push({
      label: config.legendLabels?.human || "Human milestones",
      color: "var(--human)",
      kind: "species",
      species: "human",
    });
  }

  if (layoutMode !== "upper") {
    items.push({
      label: config.legendLabels?.mouse || "Mouse milestones",
      color: "var(--mouse)",
      kind: "species",
      species: "mouse",
    });
  }

  (config.developmentWindows || []).forEach((stage, index) => {
    items.push({
      label: inferStageName(stage, index),
      color: stage.fill || `var(--window-${index + 1})`,
      kind: "stage",
      stageIndex: index,
    });
  });

  (config.customGroups || []).forEach((group, index) => {
    items.push({
      label: group.label || `Group ${index + 1}`,
      color: group.color || "var(--track)",
      kind: "group",
      groupId: group.id || `group-${index + 1}`,
    });
  });

  legend.replaceChildren();

  items.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.legendKind = item.kind;
    if (item.species) chip.dataset.legendSpecies = item.species;
    if (Number.isInteger(item.stageIndex)) chip.dataset.stageIndex = String(item.stageIndex);
    if (item.groupId) chip.dataset.groupId = String(item.groupId);

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = item.color;
    chip.appendChild(swatch);
    chip.appendChild(document.createTextNode(item.label));
    legend.appendChild(chip);
  });
}

function resolveTimelineConfig() {
  if (typeof window !== "undefined" && window.TIMELINE_CONFIG) return window.TIMELINE_CONFIG;
  if (typeof TIMELINE_CONFIG !== "undefined") return TIMELINE_CONFIG;
  return null;
}

function resolveAxisTickX(tick, stages) {
  if (typeof tick.x === "number") return tick.x;

  if (typeof tick.stageEdge === "number") {
    const edgeIndex = tick.stageEdge;

    if (edgeIndex <= 0 && stages.length > 0) {
      return stages[0].x;
    }

    if (edgeIndex >= stages.length && stages.length > 0) {
      const last = stages[stages.length - 1];
      return last.x + last.width;
    }

    if (edgeIndex > 0 && edgeIndex < stages.length) {
      const leftStage = stages[edgeIndex - 1];
      return leftStage.x + leftStage.width;
    }
  }

  if (typeof tick.stageCenter === "number") {
    const centerIndex = tick.stageCenter;
    if (centerIndex >= 0 && centerIndex < stages.length) {
      const stage = stages[centerIndex];
      return stage.x + stage.width / 2;
    }
  }

  return null;
}

function appendRangeAxis(svg, range, rangeIndex, stages) {
  if (range?.hidden) return;

  const group = createSvgElement("g");
  group.classList.add("range-axis");
  group.dataset.rangeIndex = String(rangeIndex);
  group.dataset.rangeId = String(range.id || `range-${rangeIndex}`);

  if (range.title && String(range.title).trim()) {
    const titleText = createSvgElement("text");
    titleText.classList.add("range-axis-title");
    titleText.setAttribute("x", range.titleX ?? range.lineStartX ?? 130);
    titleText.setAttribute("y", range.titleY ?? ((range.lineY ?? 100) - 14));
    (String(range.titleClass || "svg-range-title").split(/\s+/).filter(Boolean)).forEach((className) => {
      titleText.classList.add(className);
    });
    titleText.setAttribute("fill", range.titleFill || "color-mix(in srgb, var(--text) 80%, transparent)");
    titleText.textContent = range.title;
    setDatasetAttributes(titleText, {
      "text-role": "range-title",
      "range-index": rangeIndex,
    });
    group.appendChild(titleText);
  }

  const axisLine = createSvgElement("line");
  axisLine.classList.add("range-axis-line");
  axisLine.dataset.rangeIndex = String(rangeIndex);
  axisLine.setAttribute("x1", range.lineStartX ?? 130);
  axisLine.setAttribute("x2", range.lineEndX ?? 1325);
  axisLine.setAttribute("y1", range.lineY ?? 100);
  axisLine.setAttribute("y2", range.lineY ?? 100);
  axisLine.setAttribute("stroke", range.lineStroke || "color-mix(in srgb, var(--text) 45%, transparent)");
  axisLine.setAttribute("stroke-width", range.lineWidth ?? 1.5);
  group.appendChild(axisLine);

  const axisHitbox = createSvgElement("line");
  axisHitbox.classList.add("range-axis-height-hitbox");
  axisHitbox.dataset.rangeIndex = String(rangeIndex);
  axisHitbox.setAttribute("x1", range.lineStartX ?? 130);
  axisHitbox.setAttribute("x2", range.lineEndX ?? 1325);
  axisHitbox.setAttribute("y1", range.lineY ?? 100);
  axisHitbox.setAttribute("y2", range.lineY ?? 100);
  axisHitbox.setAttribute("stroke", "transparent");
  axisHitbox.setAttribute("stroke-width", Math.max(18, Number(range.lineWidth ?? 1.5) + 16));
  axisHitbox.setAttribute("stroke-linecap", "round");
  group.appendChild(axisHitbox);

  const directionSign = range.tickDirection === "up" ? -1 : 1;
  const tickSize = range.tickSize ?? 10;
  const labelOffset = range.labelOffset ?? 12;

  (range.ticks || []).forEach((tick, tickIndex) => {
    const tickX = resolveAxisTickX(tick, stages);
    if (tickX === null) return;

    const tickLine = createSvgElement("line");
    tickLine.classList.add("range-axis-tick-line");
    tickLine.dataset.rangeIndex = String(rangeIndex);
    tickLine.dataset.tickIndex = String(tickIndex);
    tickLine.setAttribute("x1", tickX);
    tickLine.setAttribute("x2", tickX);
    tickLine.setAttribute("y1", range.lineY ?? 100);
    tickLine.setAttribute("y2", (range.lineY ?? 100) + (directionSign * tickSize));
    tickLine.setAttribute("stroke", range.tickStroke || "color-mix(in srgb, var(--text) 55%, transparent)");
    tickLine.setAttribute("stroke-width", range.tickWidth ?? 1.4);
    group.appendChild(tickLine);

    const tickLabel = createSvgElement("text");
    tickLabel.classList.add("range-axis-tick-label");
    tickLabel.dataset.rangeIndex = String(rangeIndex);
    tickLabel.dataset.tickIndex = String(tickIndex);
    tickLabel.setAttribute("x", tickX);
    tickLabel.setAttribute(
      "y",
      range.tickDirection === "up"
        ? (range.lineY ?? 100) + labelOffset
        : (range.lineY ?? 100) - labelOffset
    );
    tickLabel.setAttribute("text-anchor", "middle");
    (String(range.tickLabelClass || "svg-range-axis").split(/\s+/).filter(Boolean)).forEach((className) => {
      tickLabel.classList.add(className);
    });
    tickLabel.setAttribute("fill", range.tickLabelFill || "color-mix(in srgb, var(--text) 85%, transparent)");
    tickLabel.textContent = tick.label || "";
    setDatasetAttributes(tickLabel, {
      "text-role": "range-tick",
      "range-index": rangeIndex,
      "tick-index": tickIndex,
    });
    group.appendChild(tickLabel);
  });

  svg.appendChild(group);
}

function generateTimelineSVG(config) {
  syncWindowLabelsFromStages(config);

  const svg = createSvgElement("svg");
  svg.setAttribute("class", "timeline-svg");
  svg.setAttribute("viewBox", config.canvas.viewBox);
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Timeline showing human memory development above and mouse memory development below a single left-to-right arrow"
  );

  // === Definitions (markers) ===
  const defs = createSvgElement("defs");
  Object.values(config.arrows).forEach((arrow) => {
    const marker = createSvgElement("marker");
    marker.setAttribute("id", arrow.id);
    marker.setAttribute("markerWidth", arrow.markerWidth);
    marker.setAttribute("markerHeight", arrow.markerHeight);
    marker.setAttribute("refX", arrow.refX);
    marker.setAttribute("refY", arrow.refY);
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "userSpaceOnUse");
    marker.dataset.markerId = arrow.id;

    const path = createSvgElement("path");
    path.setAttribute("d", arrow.path || buildArrowPath(arrow.markerWidth, arrow.markerHeight));
    path.setAttribute("fill", arrow.fill);
    path.classList.add("marker-path");

    marker.appendChild(path);
    defs.appendChild(marker);
  });
  svg.appendChild(defs);

  // === Background ===
  const bgRect = createSvgElement("rect");
  bgRect.setAttribute("x", "0");
  bgRect.setAttribute("y", "0");
  bgRect.setAttribute("width", config.canvas.width);
  bgRect.setAttribute("height", config.canvas.height);
  bgRect.setAttribute("fill", "transparent");
  svg.appendChild(bgRect);

  const stages = config.developmentWindows || [];
  const stageLabelSettings = getStageLabelSettings(config);
  const stageEditing = config.stageEditing || {};
  const stageBoundaryTopY = stageEditing.boundaryTopY ?? (stages[0]?.y ?? 105);
  const stageBoundaryBottomY = stageEditing.boundaryBottomY ?? ((stages[0]?.y ?? 105) + (stages[0]?.height ?? 670));

  // === Development windows (colored bands) ===
  stages.forEach((stage, index) => {
    const rect = createSvgElement("rect");
    rect.classList.add("stage-window");
    rect.dataset.stageIndex = String(index);
    rect.setAttribute("x", stage.x);
    rect.setAttribute("y", stage.y);
    rect.setAttribute("width", stage.width);
    rect.setAttribute("height", stage.height);
    rect.setAttribute("rx", stage.rx);
    rect.setAttribute("fill", stage.fill);
    rect.setAttribute("opacity", stage.opacity);
    svg.appendChild(rect);
  });

  (config.windowLabels || []).forEach((label, index) => {
    const text = createSvgElement("text");
    text.classList.add("stage-window-label");
    text.dataset.stageIndex = String(label.stageIndex ?? index);
    text.setAttribute("x", label.x);
    text.setAttribute("y", label.y ?? stageLabelSettings.y);
    text.setAttribute("text-anchor", "middle");
    (String(label.class || stageLabelSettings.className).split(/\s+/).filter(Boolean)).forEach((className) => {
      text.classList.add(className);
    });
    text.setAttribute("fill", label.fill || stageLabelSettings.fill);
    text.textContent = label.text;
    setDatasetAttributes(text, {
      "text-role": "stage-label",
      "stage-index": label.stageIndex ?? index,
    });
    svg.appendChild(text);
  });

  // Stage selection hitboxes
  stages.forEach((stage, index) => {
    const hitbox = createSvgElement("rect");
    hitbox.classList.add("stage-hitbox");
    hitbox.dataset.stageIndex = String(index);
    hitbox.setAttribute("x", stage.x);
    hitbox.setAttribute("y", stage.y);
    hitbox.setAttribute("width", stage.width);
    hitbox.setAttribute("height", stage.height);
    hitbox.setAttribute("fill", "transparent");
    hitbox.setAttribute("stroke", "transparent");
    svg.appendChild(hitbox);
  });

  // Stage boundary handles
  for (let boundaryIndex = 0; boundaryIndex < stages.length - 1; boundaryIndex += 1) {
    const stage = stages[boundaryIndex];
    const boundaryX = stage.x + stage.width;

    const handleLine = createSvgElement("line");
    handleLine.classList.add("stage-boundary-handle");
    handleLine.dataset.boundaryIndex = String(boundaryIndex);
    handleLine.setAttribute("x1", boundaryX);
    handleLine.setAttribute("x2", boundaryX);
    handleLine.setAttribute("y1", stageBoundaryTopY);
    handleLine.setAttribute("y2", stageBoundaryBottomY);
    svg.appendChild(handleLine);

    const handleHitbox = createSvgElement("rect");
    handleHitbox.classList.add("stage-boundary-hitbox");
    handleHitbox.dataset.boundaryIndex = String(boundaryIndex);
    handleHitbox.setAttribute("x", boundaryX - 7);
    handleHitbox.setAttribute("y", stageBoundaryTopY);
    handleHitbox.setAttribute("width", 14);
    handleHitbox.setAttribute("height", stageBoundaryBottomY - stageBoundaryTopY);
    handleHitbox.setAttribute("fill", "transparent");
    handleHitbox.setAttribute("stroke", "transparent");
    svg.appendChild(handleHitbox);
  }

  // === Main axis line ===
  const mainAxisLine = createSvgElement("line");
  mainAxisLine.classList.add("main-axis-line");
  mainAxisLine.dataset.mainAxis = "true";
  mainAxisLine.setAttribute("x1", config.mainAxis.x1);
  mainAxisLine.setAttribute("y1", config.mainAxis.y);
  mainAxisLine.setAttribute("x2", config.mainAxis.x2);
  mainAxisLine.setAttribute("y2", config.mainAxis.y);
  mainAxisLine.setAttribute("stroke", config.mainAxis.stroke);
  mainAxisLine.setAttribute("stroke-width", config.mainAxis.strokeWidth);
  mainAxisLine.setAttribute("stroke-linecap", config.mainAxis.strokeLinecap);
  mainAxisLine.setAttribute("marker-end", config.mainAxis.markerEnd);
  svg.appendChild(mainAxisLine);

  const mainAxisHitbox = createSvgElement("line");
  mainAxisHitbox.classList.add("main-axis-hitbox");
  mainAxisHitbox.dataset.mainAxis = "true";
  mainAxisHitbox.setAttribute("x1", config.mainAxis.x1);
  mainAxisHitbox.setAttribute("y1", config.mainAxis.y);
  mainAxisHitbox.setAttribute("x2", config.mainAxis.x2);
  mainAxisHitbox.setAttribute("y2", config.mainAxis.y);
  mainAxisHitbox.setAttribute("stroke", "transparent");
  mainAxisHitbox.setAttribute("stroke-width", Math.max(18, Number(config.mainAxis.strokeWidth || 5) + 14));
  mainAxisHitbox.setAttribute("stroke-linecap", "round");
  svg.appendChild(mainAxisHitbox);

  // === Axis labels (for example vertical species labels) ===
  (config.axisLabels || []).forEach((label) => {
    if (label?.hidden || !String(label.text || "").trim()) return;
    const text = createSvgElement("text");
    text.setAttribute("x", label.x);
    text.setAttribute("y", label.y);
    text.setAttribute("class", label.class);
    text.setAttribute("fill", label.fill);
    if (label.textAnchor) text.setAttribute("text-anchor", label.textAnchor);
    if (label.transform) text.setAttribute("transform", label.transform);
    text.textContent = label.text;
    setDatasetAttributes(text, {
      "text-role": "axis-label",
      "axis-index": (config.axisLabels || []).indexOf(label),
    });
    svg.appendChild(text);
  });

  // === Dual age-range axes ===
  (config.axisRanges || []).forEach((range, rangeIndex) => {
    appendRangeAxis(svg, range, rangeIndex, stages);
  });

  function appendNodeGroup(nodeType, node, index) {
    const isHuman = nodeType === "human";
    const nodeKey = `${nodeType}:${index}`;
    const defaultMarkerId = isHuman ? "humanArrow" : "mouseArrow";
    const markerId = node.markerId || defaultMarkerId;
    const strokeWidth = node.strokeWidth ?? config.nodes.connectorStrokeWidth;
    const circleRadius = node.circleRadius ?? config.nodes.circleRadius;
    const axisY = Number.isFinite(Number(config.mainAxis?.y)) ? Number(config.mainAxis.y) : Number(node.yAxis);
    const titleOffset = isHuman
      ? (config.nodes.humanTitleOffsetY ?? -21)
      : (config.nodes.mouseTitleOffsetY ?? 23);
    const ageOffset = isHuman
      ? (config.nodes.humanAgeOffsetY ?? -37)
      : (config.nodes.mouseAgeOffsetY ?? 39);
    const titleOffsetX = isHuman
      ? (config.nodes.humanTitleOffsetX ?? 0)
      : (config.nodes.mouseTitleOffsetX ?? 0);
    const ageOffsetX = isHuman
      ? (config.nodes.humanAgeOffsetX ?? 0)
      : (config.nodes.mouseAgeOffsetX ?? 0);

    const group = createSvgElement("g");
    group.classList.add("editable-node", `editable-node-${nodeType}`);
    group.dataset.nodeType = nodeType;
    group.dataset.nodeIndex = String(index);
    group.dataset.nodeKey = nodeKey;
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${nodeType} milestone ${node.title}`);

    const line = createSvgElement("line");
    line.classList.add("node-connector");
    line.setAttribute("x1", node.x);
    line.setAttribute("y1", node.yNode);
    line.setAttribute("x2", node.x);
    line.setAttribute("y2", axisY);
    line.setAttribute("stroke", node.stroke);
    line.setAttribute("stroke-width", strokeWidth);
    line.setAttribute("marker-end", `url(#${markerId})`);
    line.setAttribute("vector-effect", "non-scaling-stroke");
    group.appendChild(line);

    const circle = createSvgElement("circle");
    circle.classList.add("node-circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.yNode);
    circle.setAttribute("r", circleRadius);
    circle.setAttribute("fill", node.circleFill || node.stroke);
    group.appendChild(circle);

    const titleText = createSvgElement("text");
    titleText.classList.add("node-title");
    titleText.setAttribute("x", node.x + (node.titleOffsetX ?? titleOffsetX));
    titleText.setAttribute("y", node.yNode + titleOffset);
    titleText.setAttribute("text-anchor", "middle");
    (String(config.nodes.titleClass || "svg-title").split(/\s+/).filter(Boolean)).forEach((className) => {
      titleText.classList.add(className);
    });
    titleText.textContent = node.title;
    setDatasetAttributes(titleText, {
      "text-role": "node-title",
      "node-type": nodeType,
      "node-index": index,
    });
    applyTextStyleOverrides(titleText, node.titleFill, node.titleFontSize);
    group.appendChild(titleText);

    const ageText = createSvgElement("text");
    ageText.classList.add("node-age");
    ageText.setAttribute("x", node.x + (node.ageOffsetX ?? ageOffsetX));
    ageText.setAttribute("y", node.yNode + ageOffset);
    ageText.setAttribute("text-anchor", "middle");
    (String(config.nodes.ageClass || "svg-age").split(/\s+/).filter(Boolean)).forEach((className) => {
      ageText.classList.add(className);
    });
    ageText.textContent = node.ageRange;
    setDatasetAttributes(ageText, {
      "text-role": "node-age",
      "node-type": nodeType,
      "node-index": index,
    });
    applyTextStyleOverrides(ageText, node.ageFill, node.ageFontSize);
    group.appendChild(ageText);

    const hitArea = createSvgElement("circle");
    hitArea.classList.add("node-hit-area");
    hitArea.setAttribute("cx", node.x);
    hitArea.setAttribute("cy", node.yNode);
    hitArea.setAttribute("r", Math.max(16, circleRadius + 10));
    hitArea.setAttribute("fill", "transparent");
    hitArea.setAttribute("stroke", "transparent");
    group.appendChild(hitArea);

    svg.appendChild(group);
  }

  function appendRangeBlockGroup(blockType, block, index) {
    const isHuman = blockType === "human";
    const blocks = config.blocks || {};
    const xStart = Number(block.xStart);
    const xEnd = Number(block.xEnd);
    const x = Math.min(xStart, xEnd);
    const width = Math.max(8, Math.abs(xEnd - xStart));
    const height = block.height ?? blocks.defaultHeight ?? 18;
    const y = Number(block.y);
    const cornerRadius = block.rx ?? blocks.cornerRadius ?? 8;

    const titleOffsetY = block.titleOffsetY ?? blocks.titleInsideOffsetY ?? 14;
    const ageOffsetY = block.ageOffsetY ?? blocks.ageInsideOffsetY ?? 28;
    const titleOffsetX = block.titleOffsetX ?? 0;
    const ageOffsetX = block.ageOffsetX ?? 0;
    const centerX = x + (width / 2);

    const group = createSvgElement("g");
    group.classList.add("editable-range", `editable-range-${blockType}`);
    group.dataset.blockType = blockType;
    group.dataset.blockIndex = String(index);
    group.dataset.blockKey = `${blockType}:${index}`;

    const body = createSvgElement("rect");
    body.classList.add("range-block-body");
    body.setAttribute("x", x);
    body.setAttribute("y", y);
    body.setAttribute("width", width);
    body.setAttribute("height", height);
    body.setAttribute("rx", cornerRadius);
    body.setAttribute("fill", block.fill || (isHuman ? "var(--human-soft)" : "var(--mouse-soft)"));
    body.setAttribute("stroke", block.stroke || (isHuman ? "var(--human)" : "var(--mouse)"));
    body.setAttribute("stroke-width", block.strokeWidth ?? blocks.strokeWidth ?? 1.9);
    group.appendChild(body);

    const hitbox = createSvgElement("rect");
    hitbox.classList.add("range-block-hitbox");
    hitbox.setAttribute("x", x - 4);
    hitbox.setAttribute("y", y - 6);
    hitbox.setAttribute("width", width + 8);
    hitbox.setAttribute("height", height + 12);
    hitbox.setAttribute("fill", "transparent");
    hitbox.setAttribute("stroke", "transparent");
    group.appendChild(hitbox);

    const titleText = createSvgElement("text");
    titleText.classList.add("range-block-title");
    titleText.setAttribute("x", centerX + titleOffsetX);
    titleText.setAttribute("y", y + titleOffsetY);
    titleText.setAttribute("text-anchor", "middle");
    (String(block.titleClass || blocks.titleClass || "svg-title").split(/\s+/).filter(Boolean)).forEach((className) => {
      titleText.classList.add(className);
    });
    titleText.textContent = block.title || "Range";
    setDatasetAttributes(titleText, {
      "text-role": "block-title",
      "block-type": blockType,
      "block-index": index,
    });
    applyTextStyleOverrides(titleText, block.titleFill, block.titleFontSize);
    group.appendChild(titleText);

    const ageText = createSvgElement("text");
    ageText.classList.add("range-block-age");
    ageText.setAttribute("x", centerX + ageOffsetX);
    ageText.setAttribute("y", y + ageOffsetY);
    ageText.setAttribute("text-anchor", "middle");
    (String(block.ageClass || blocks.ageClass || "svg-age").split(/\s+/).filter(Boolean)).forEach((className) => {
      ageText.classList.add(className);
    });
    ageText.textContent = block.ageRange || "";
    setDatasetAttributes(ageText, {
      "text-role": "block-age",
      "block-type": blockType,
      "block-index": index,
    });
    applyTextStyleOverrides(ageText, block.ageFill, block.ageFontSize);
    group.appendChild(ageText);

    const leftHandle = createSvgElement("rect");
    leftHandle.classList.add("range-block-resize-hitbox", "range-block-resize-left");
    leftHandle.dataset.resizeSide = "start";
    leftHandle.setAttribute("x", x - 7);
    leftHandle.setAttribute("y", y - 6);
    leftHandle.setAttribute("width", 14);
    leftHandle.setAttribute("height", height + 12);
    leftHandle.setAttribute("fill", "transparent");
    leftHandle.setAttribute("stroke", "transparent");
    group.appendChild(leftHandle);

    const rightHandle = createSvgElement("rect");
    rightHandle.classList.add("range-block-resize-hitbox", "range-block-resize-right");
    rightHandle.dataset.resizeSide = "end";
    rightHandle.setAttribute("x", x + width - 7);
    rightHandle.setAttribute("y", y - 6);
    rightHandle.setAttribute("width", 14);
    rightHandle.setAttribute("height", height + 12);
    rightHandle.setAttribute("fill", "transparent");
    rightHandle.setAttribute("stroke", "transparent");
    group.appendChild(rightHandle);

    const topHandle = createSvgElement("rect");
    topHandle.classList.add("range-block-resize-hitbox", "range-block-resize-top");
    topHandle.dataset.resizeSide = "top";
    topHandle.setAttribute("x", x - 4);
    topHandle.setAttribute("y", y - 7);
    topHandle.setAttribute("width", width + 8);
    topHandle.setAttribute("height", 14);
    topHandle.setAttribute("fill", "transparent");
    topHandle.setAttribute("stroke", "transparent");
    group.appendChild(topHandle);

    const bottomHandle = createSvgElement("rect");
    bottomHandle.classList.add("range-block-resize-hitbox", "range-block-resize-bottom");
    bottomHandle.dataset.resizeSide = "bottom";
    bottomHandle.setAttribute("x", x - 4);
    bottomHandle.setAttribute("y", y + height - 7);
    bottomHandle.setAttribute("width", width + 8);
    bottomHandle.setAttribute("height", 14);
    bottomHandle.setAttribute("fill", "transparent");
    bottomHandle.setAttribute("stroke", "transparent");
    group.appendChild(bottomHandle);

    svg.appendChild(group);
  }

  (config.humanRangeBlocks || []).forEach((block, index) => appendRangeBlockGroup("human", block, index));
  (config.mouseRangeBlocks || []).forEach((block, index) => appendRangeBlockGroup("mouse", block, index));

  // Human and mouse nodes
  (config.humanNodes || []).forEach((node, index) => appendNodeGroup("human", node, index));
  (config.mouseNodes || []).forEach((node, index) => appendNodeGroup("mouse", node, index));

  // === Legacy axis ticks (kept for compatibility) ===
  if (Array.isArray(config.humanAxisTicks) && config.axisTicks && config.axisTicks.enabled !== false) {
    const tickGroup = createSvgElement("g");
    config.humanAxisTicks.forEach((tick) => {
      const tickLine = createSvgElement("line");
      tickLine.setAttribute("x1", tick.x);
      tickLine.setAttribute("y1", config.axisTicks.y1);
      tickLine.setAttribute("x2", tick.x);
      tickLine.setAttribute("y2", config.axisTicks.y2);
      tickLine.setAttribute("stroke", config.axisTicks.stroke);
      tickLine.setAttribute("stroke-width", config.axisTicks.strokeWidth);
      tickGroup.appendChild(tickLine);

      const tickLabel = createSvgElement("text");
      tickLabel.setAttribute("x", tick.x);
      tickLabel.setAttribute("y", config.axisTicks.labelY);
      tickLabel.setAttribute("text-anchor", "middle");
      tickLabel.setAttribute("class", config.axisTicks.labelClass);
      tickLabel.textContent = tick.label;
      tickGroup.appendChild(tickLabel);
    });
    svg.appendChild(tickGroup);
  }

  // === Figure comment note (moved lower) ===
  const alignNote = config.alignmentNote;
  const noteRect = createSvgElement("rect");
  noteRect.setAttribute("x", alignNote.rect.x);
  noteRect.setAttribute("y", alignNote.rect.y);
  noteRect.setAttribute("width", alignNote.rect.width);
  noteRect.setAttribute("height", alignNote.rect.height);
  noteRect.setAttribute("rx", alignNote.rect.rx);
  noteRect.setAttribute("fill", alignNote.rect.fill);
  noteRect.setAttribute("opacity", alignNote.rect.opacity);
  noteRect.setAttribute("stroke", alignNote.rect.stroke);
  svg.appendChild(noteRect);

  (alignNote.lines || []).forEach((line) => {
    const text = createSvgElement("text");
    text.setAttribute("x", line.x);
    text.setAttribute("y", line.y);
    text.setAttribute("class", line.class);
    text.textContent = line.text;
    setDatasetAttributes(text, {
      "text-role": "note-line",
      "note-index": (alignNote.lines || []).indexOf(line),
    });
    svg.appendChild(text);
  });

  return svg;
}

function initializeTimeline() {
  const config = resolveTimelineConfig();

  if (!config) {
    console.error("TIMELINE_CONFIG not found. Make sure timeline-default-config.json was loaded.");
    return;
  }

  const timelineFigure = document.querySelector(".timeline-scroller figure");
  if (!timelineFigure) {
    console.error("Timeline figure container not found.");
    return;
  }

  config.layoutMode = inferLayoutMode(config);
  normalizeSingleGroupLayout(config);
  syncWindowLabelsFromStages(config);

  if (Array.isArray(config.axisRanges)) {
    config.axisRanges.forEach((range, index) => {
      if (!range || typeof range !== "object") return;
      range.hidden = config.layoutMode === "upper"
        ? index === 1
        : config.layoutMode === "lower"
          ? index === 0
          : false;
    });
  }

  if (Array.isArray(config.axisLabels)) {
    if (config.axisLabels[0]) {
      config.axisLabels[0].hidden = config.layoutMode === "lower";
    }
    if (config.axisLabels[1]) {
      config.axisLabels[1].hidden = config.layoutMode === "upper";
    }
  }

  const existingSVG = timelineFigure.querySelector(".timeline-svg");
  if (existingSVG) {
    existingSVG.remove();
  }

  const newSVG = generateTimelineSVG(config);
  timelineFigure.appendChild(newSVG);
  renderTimelineLegend(config);

  document.dispatchEvent(
    new CustomEvent("timeline:rendered", {
      detail: {
        svg: newSVG,
        config,
      },
    })
  );

  console.log("Timeline initialized from config");
}

async function initializeTimelineWhenConfigReady() {
  if (!resolveTimelineConfig() && typeof window !== "undefined" && window.timelineConfigReady) {
    try {
      await window.timelineConfigReady;
    } catch (error) {
      console.error("Timeline config could not be loaded.", error);
    }
  }

  initializeTimeline();
}

window.initializeTimeline = initializeTimeline;
window.initializeTimelineWhenConfigReady = initializeTimelineWhenConfigReady;
window.renderTimelineLegend = renderTimelineLegend;
window.resolveTimelineConfig = resolveTimelineConfig;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTimelineWhenConfigReady);
} else {
  initializeTimelineWhenConfigReady();
}
