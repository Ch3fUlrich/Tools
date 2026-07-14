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
