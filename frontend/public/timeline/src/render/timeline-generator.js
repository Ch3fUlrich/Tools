/**
 * Timeline Generator
 *
 * Generates SVG timeline markup from TIMELINE_CONFIG.
 * Includes editable stage boundaries, dual age-range axes,
 * and text metadata hooks for interactive editing.
 */

function resolveTimelineConfig() {
  if (typeof window !== "undefined" && window.TIMELINE_CONFIG) return window.TIMELINE_CONFIG;
  if (typeof TIMELINE_CONFIG !== "undefined") return TIMELINE_CONFIG;
  return null;
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

  (config.humanRangeBlocks || []).forEach((block, index) => appendRangeBlockGroup(svg, config, "human", block, index));
  (config.mouseRangeBlocks || []).forEach((block, index) => appendRangeBlockGroup(svg, config, "mouse", block, index));

  // Human and mouse nodes
  (config.humanNodes || []).forEach((node, index) => appendNodeGroup(svg, config, "human", node, index));
  (config.mouseNodes || []).forEach((node, index) => appendNodeGroup(svg, config, "mouse", node, index));

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
