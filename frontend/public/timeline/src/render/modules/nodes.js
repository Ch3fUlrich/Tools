function appendNodeGroup(svg, config, nodeType, node, index) {
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
