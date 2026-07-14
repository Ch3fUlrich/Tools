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
    applyTextStyleOverrides(tickLabel, tick.fill, tick.fontSize);

    const isStageLabel = Boolean(tick.isStageLabel);
    if (isStageLabel) {
      tickLabel.classList.add("stage-window-label");
    }

    group.appendChild(tickLabel);
  });

  svg.appendChild(group);
}
