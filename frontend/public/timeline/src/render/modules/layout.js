function getStageLabelSettings(config) {
  const stageLabels = config.stageLabels || {};
  return {
    y: stageLabels.y ?? 114,
    fill: stageLabels.fill ?? "color-mix(in srgb, var(--text) 78%, transparent)",
    className: stageLabels.class ?? "svg-window-label",
  };
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
