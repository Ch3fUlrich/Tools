function appendRangeBlockGroup(svg, config, blockType, block, index) {
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
