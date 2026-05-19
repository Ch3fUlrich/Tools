/**
 * Timeline Interactive Editor
 *
 * UX features:
 * - Drag + multi-select arrows
 * - Add/remove arrows
 * - Stage boundary drag with proportional remap of arrows in affected stages
 * - Double-click timeline text to edit
 * - Sortable/filterable inspector table with expandable row editors
 */

(function () {
  const EPSILON = 0.0001;

  const state = {
    config: null,
    svg: null,
    selectedKeys: new Set(),
    selectedBlockKeys: new Set(),
    selectedBlockKey: null,
    selectedStageIndex: null,
    selectedBoundaryIndex: null,
    selectedMainAxis: false,
    drag: null,
    blockDrag: null,
    mainAxisDrag: null,
    stageDrag: null,
    yScaleDrag: null,
    viewport: {
      zoom: 1,
      panX: 0,
      panY: 0,
      drag: null,
    },
    history: {
      entries: [],
      index: -1,
      restoring: false,
    },
    keyNudge: {
      key: null,
      repeatCount: 0,
    },
    suppressNextClickEditor: false,
    pendingStageSelectionIndex: null,
    pendingNodeSelectionKeys: null,
    ui: null,
    inspector: {
      filterType: "all",
      search: "",
      sortKey: "label",
      sortDirection: "asc",
      expandedId: null,
    },
    floating: {
      onSave: null,
    },
  };

  const COLOR_OPTIONS = [
    { value: "var(--human)", label: "Human" },
    { value: "var(--human-soft)", label: "Human soft" },
    { value: "var(--mouse)", label: "Mouse" },
    { value: "var(--mouse-soft)", label: "Mouse soft" },
    { value: "var(--track)", label: "Track" },
    { value: "var(--text)", label: "Text" },
    { value: "var(--muted)", label: "Muted" },
    { value: "var(--window-1)", label: "Neonatal" },
    { value: "var(--window-2)", label: "Infancy" },
    { value: "var(--window-3)", label: "Toddler" },
    { value: "var(--window-4)", label: "Early childhood" },
    { value: "var(--window-5)", label: "Later childhood" },
    { value: "#2dd4bf", label: "Teal" },
    { value: "#60a5fa", label: "Blue" },
    { value: "#a78bfa", label: "Violet" },
    { value: "#f472b6", label: "Pink" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#22c55e", label: "Green" },
  ];

  const TEMPLATE_STAGE_COLORS = [
    "var(--window-1)",
    "var(--window-2)",
    "var(--window-3)",
    "var(--window-4)",
    "var(--window-5)",
  ];

  const TEMPLATE_STAGE_NAMES = [
    "Neonatal",
    "Infancy",
    "Toddler",
    "Early childhood",
    "Later childhood",
  ];

  function createStatus(message, isError) {
    if (!state.ui || !state.ui.status) return;
    state.ui.status.textContent = message;
    state.ui.status.classList.toggle("is-error", Boolean(isError));
  }

  function toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && !value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(start, end, ratio) {
    return start + ((end - start) * ratio);
  }

  function roundToThree(value) {
    return Math.round(value * 1000) / 1000;
  }

  function getDefaultNodeTitleFontSize() {
    return Number(state.config?.nodes?.titleFontSize) > 0 ? Number(state.config.nodes.titleFontSize) : 16;
  }

  function getDefaultNodeAgeFontSize() {
    return Number(state.config?.nodes?.ageFontSize) > 0 ? Number(state.config.nodes.ageFontSize) : 13;
  }

  function getDefaultBlockTitleFontSize() {
    return Number(state.config?.blocks?.titleFontSize) > 0 ? Number(state.config.blocks.titleFontSize) : 16;
  }

  function getDefaultBlockAgeFontSize() {
    return Number(state.config?.blocks?.ageFontSize) > 0 ? Number(state.config.blocks.ageFontSize) : 13;
  }

  function normalizePositiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function normalizeTimelineTextSizes() {
    getAllNodeEntries().forEach((entry) => {
      entry.node.titleFontSize = normalizePositiveNumber(entry.node.titleFontSize, getDefaultNodeTitleFontSize());
      entry.node.ageFontSize = normalizePositiveNumber(entry.node.ageFontSize, getDefaultNodeAgeFontSize());
    });

    getAllBlockEntries().forEach((entry) => {
      entry.block.titleFontSize = normalizePositiveNumber(entry.block.titleFontSize, getDefaultBlockTitleFontSize());
      entry.block.ageFontSize = normalizePositiveNumber(entry.block.ageFontSize, getDefaultBlockAgeFontSize());
    });
  }

  function deepClone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function buildArrowPath(width, height) {
    const halfHeight = Number(height) / 2;
    return `M0 0L${width} ${halfHeight}L0 ${height}Z`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function closeFloatingEditor() {
    if (!state.ui?.floatingRoot) return;
    state.ui.floatingRoot.hidden = true;
    state.ui.floatingBody.innerHTML = "";
    if (state.ui.floatingSave) state.ui.floatingSave.hidden = false;
    state.floating.onSave = null;
  }

  function getFloatingValues() {
    if (!state.ui?.floatingBody) return {};

    const values = {};
    state.ui.floatingBody.querySelectorAll("[data-floating-field]").forEach((field) => {
      values[field.dataset.floatingField] = field.value;
    });
    return values;
  }

  function setFloatingFieldValue(fieldName, value) {
    const field = state.ui?.floatingBody?.querySelector(`[data-floating-field="${fieldName}"]`);
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function isColorField(fieldDef) {
    if (fieldDef.colorOptions) return true;
    const name = String(fieldDef.name || "");
    if (["fill", "stroke", "markerFill", "titleFill", "ageFill"].includes(name)) return true;
    return /color/i.test(String(fieldDef.label || name));
  }

  function createColorOptions(input, options) {
    const palette = document.createElement("div");
    palette.className = "color-option-list";

    (options || COLOR_OPTIONS).forEach((optionDef) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-option";
      button.title = optionDef.label || optionDef.value;
      button.setAttribute("aria-label", optionDef.label || optionDef.value);
      button.style.background = optionDef.value;
      button.addEventListener("click", () => {
        input.value = optionDef.value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      });
      palette.appendChild(button);
    });

    return palette;
  }

  function createArrowPreviewSvg(colorValue) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 64 20");
    svg.setAttribute("aria-hidden", "true");

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "5");
    line.setAttribute("y1", "10");
    line.setAttribute("x2", "51");
    line.setAttribute("y2", "10");
    line.setAttribute("stroke", colorValue || "currentColor");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    svg.appendChild(line);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M50 4L60 10L50 16Z");
    path.setAttribute("fill", colorValue || "currentColor");
    svg.appendChild(path);

    return svg;
  }

  function getColorOptionsHtml(fieldName) {
    return `
      <div class="color-option-list inspector-color-options">
        ${COLOR_OPTIONS.map((option) => `
          <button
            type="button"
            class="color-option"
            data-inspector-color-field="${escapeHtml(fieldName)}"
            data-inspector-color-value="${escapeHtml(option.value)}"
            aria-label="${escapeHtml(option.label)}"
            title="${escapeHtml(option.label)}"
            style="background: ${escapeHtml(option.value)}"
          ></button>
        `).join("")}
      </div>
    `;
  }

  function getInspectorColorFieldHtml(label, fieldName, value) {
    return `
      <label class="editor-field has-color-options">
        <span>${escapeHtml(label)}</span>
        <input type="text" data-inspector-field="${escapeHtml(fieldName)}" value="${escapeHtml(value || "")}" />
        ${getColorOptionsHtml(fieldName)}
      </label>
    `;
  }

  function positionFloatingEditor(anchorPoint) {
    if (!state.ui?.floatingRoot || !anchorPoint) return;

    const root = state.ui.floatingRoot;
    const pad = 12;
    root.style.left = `${anchorPoint.x + pad}px`;
    root.style.top = `${anchorPoint.y + pad}px`;

    const rect = root.getBoundingClientRect();
    const left = clamp(anchorPoint.x + pad, pad, Math.max(pad, window.innerWidth - rect.width - pad));
    const top = clamp(anchorPoint.y + pad, pad, Math.max(pad, window.innerHeight - rect.height - pad));
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
  }

  function openFloatingEditor(options) {
    if (!state.ui?.floatingRoot || !state.ui?.floatingBody || !state.ui?.floatingTitle || !state.ui?.floatingSave) return;

    const {
      title,
      fields,
      values,
      saveLabel,
      anchorPoint,
      extraActions,
      afterRender,
      hideSave,
      onSave,
    } = options;

    const body = state.ui.floatingBody;
    body.innerHTML = "";

    fields.forEach((fieldDef) => {
      const wrapper = document.createElement(fieldDef.type === "arrow-style" ? "div" : "label");
      wrapper.className = "editor-field";
      if (isColorField(fieldDef)) {
        wrapper.classList.add("has-color-options");
      }

      const label = document.createElement("span");
      label.textContent = fieldDef.label;
      wrapper.appendChild(label);

      let input;
      if (fieldDef.type === "arrow-style") {
        input = document.createElement("input");
        input.type = "hidden";
        input.dataset.floatingField = fieldDef.name;

        const optionsWrap = document.createElement("div");
        optionsWrap.className = "arrow-style-options";

        (fieldDef.options || []).forEach((optionDef) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "arrow-style-option";
          button.title = String(optionDef.label || optionDef.value);
          button.dataset.arrowStyleValue = String(optionDef.value);
          button.appendChild(createArrowPreviewSvg(optionDef.color || "currentColor"));
          button.addEventListener("click", () => {
            input.value = String(optionDef.value);
            optionsWrap.querySelectorAll(".arrow-style-option").forEach((optionButton) => {
              optionButton.classList.toggle("is-selected", optionButton === button);
            });
            if (fieldDef.syncColorField && optionDef.color) {
              const colorInput = body.querySelector(`[data-floating-field="${fieldDef.syncColorField}"]`);
              if (colorInput) {
                colorInput.value = optionDef.color;
                colorInput.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }
          });
          optionsWrap.appendChild(button);
        });

        wrapper.appendChild(input);
        wrapper.appendChild(optionsWrap);
        body.appendChild(wrapper);

        const nextValue = values && values[fieldDef.name] !== undefined ? values[fieldDef.name] : "";
        input.value = nextValue === null ? "" : String(nextValue);
        const selectedButton = Array.from(optionsWrap.querySelectorAll(".arrow-style-option"))
          .find((button) => button.dataset.arrowStyleValue === input.value)
          || optionsWrap.querySelector(".arrow-style-option");
        if (selectedButton) {
          selectedButton.classList.add("is-selected");
          if (!input.value) input.value = selectedButton.dataset.arrowStyleValue || "";
        }
        return;
      }

      if (fieldDef.type === "select") {
        input = document.createElement("select");
        (fieldDef.options || []).forEach((optionDef) => {
          const option = document.createElement("option");
          option.value = String(optionDef.value);
          option.textContent = String(optionDef.label);
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = fieldDef.type || "text";
        if (fieldDef.min !== undefined) input.min = String(fieldDef.min);
        if (fieldDef.max !== undefined) input.max = String(fieldDef.max);
        if (fieldDef.step !== undefined) input.step = String(fieldDef.step);
        if (fieldDef.placeholder) input.placeholder = fieldDef.placeholder;
        if (fieldDef.readonly) input.readOnly = true;
      }

      input.dataset.floatingField = fieldDef.name;
      const nextValue = values && values[fieldDef.name] !== undefined ? values[fieldDef.name] : "";
      input.value = nextValue === null ? "" : String(nextValue);

      if (isColorField(fieldDef)) {
        const colorWrap = document.createElement("div");
        colorWrap.className = "color-field-wrap";
        const currentSwatch = document.createElement("span");
        currentSwatch.className = "color-current-swatch";
        currentSwatch.style.background = input.value || "var(--surface-3)";
        input.addEventListener("input", () => {
          currentSwatch.style.background = input.value || "var(--surface-3)";
        });
        colorWrap.appendChild(currentSwatch);
        colorWrap.appendChild(input);
        wrapper.appendChild(colorWrap);
        wrapper.appendChild(createColorOptions(input, fieldDef.colorOptions || COLOR_OPTIONS));
      } else {
        wrapper.appendChild(input);
      }

      body.appendChild(wrapper);
    });

    state.ui.floatingTitle.textContent = title || "Edit";
    state.ui.floatingSave.textContent = saveLabel || "Save";
    state.ui.floatingSave.hidden = Boolean(hideSave);
    state.floating.onSave = onSave;

    if (state.ui.floatingActions) {
      state.ui.floatingActions.querySelectorAll("[data-floating-extra-action]").forEach((button) => button.remove());
      (extraActions || []).forEach((actionDef) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = actionDef.className || "editor-btn editor-btn-ghost";
        button.dataset.floatingExtraAction = "true";
        button.textContent = actionDef.label;
        button.addEventListener("click", () => {
          const shouldClose = actionDef.onClick?.(getFloatingValues());
          if (shouldClose !== false) {
            closeFloatingEditor();
          }
        });
        state.ui.floatingActions.insertBefore(button, state.ui.floatingSave);
      });
    }

    if (typeof afterRender === "function") {
      afterRender(body, state.ui.floatingActions);
    }

    state.ui.floatingRoot.hidden = false;
    positionFloatingEditor(anchorPoint || { x: window.innerWidth * 0.5, y: window.innerHeight * 0.25 });

    const firstInput = body.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();
  }

  function eventToViewportPoint(event) {
    if (!event) {
      return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.25 };
    }

    return {
      x: event.clientX ?? (window.innerWidth * 0.5),
      y: event.clientY ?? (window.innerHeight * 0.25),
    };
  }

  function parseNodeKey(key) {
    if (!key || typeof key !== "string") return null;
    const parts = key.split(":");
    if (parts.length !== 2) return null;

    const nodeType = parts[0];
    const nodeIndex = Number(parts[1]);
    if ((nodeType !== "human" && nodeType !== "mouse") || !Number.isInteger(nodeIndex)) {
      return null;
    }

    return { nodeType, nodeIndex };
  }

  function toSvgPoint(clientX, clientY) {
    if (!state.svg) return null;

    const matrix = state.svg.getScreenCTM();
    if (!matrix) return null;

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function getNodeCollection(nodeType) {
    if (!state.config) return null;
    if (nodeType === "human") return state.config.humanNodes;
    if (nodeType === "mouse") return state.config.mouseNodes;
    return null;
  }

  function getNode(nodeType, nodeIndex) {
    const collection = getNodeCollection(nodeType);
    if (!collection || nodeIndex < 0 || nodeIndex >= collection.length) return null;
    return collection[nodeIndex];
  }

  function getBlockCollection(blockType) {
    if (!state.config) return null;
    if (blockType === "human") return state.config.humanRangeBlocks;
    if (blockType === "mouse") return state.config.mouseRangeBlocks;
    return null;
  }

  function getBlock(blockType, blockIndex) {
    const collection = getBlockCollection(blockType);
    if (!collection || blockIndex < 0 || blockIndex >= collection.length) return null;
    return collection[blockIndex];
  }

  function parseBlockKey(key) {
    if (!key || typeof key !== "string") return null;
    const parts = key.split(":");
    if (parts.length !== 2) return null;

    const blockType = parts[0];
    const blockIndex = Number(parts[1]);
    if ((blockType !== "human" && blockType !== "mouse") || !Number.isInteger(blockIndex)) {
      return null;
    }

    return { blockType, blockIndex };
  }

  function getAllBlockEntries() {
    const entries = [];

    const humanBlocks = state.config?.humanRangeBlocks || [];
    humanBlocks.forEach((block, index) => {
      entries.push({
        key: `human:${index}`,
        blockType: "human",
        blockIndex: index,
        block,
      });
    });

    const mouseBlocks = state.config?.mouseRangeBlocks || [];
    mouseBlocks.forEach((block, index) => {
      entries.push({
        key: `mouse:${index}`,
        blockType: "mouse",
        blockIndex: index,
        block,
      });
    });

    return entries;
  }

  function getBlockEntryByKey(key) {
    const parsed = parseBlockKey(key);
    if (!parsed) return null;

    const block = getBlock(parsed.blockType, parsed.blockIndex);
    if (!block) return null;

    return {
      key,
      blockType: parsed.blockType,
      blockIndex: parsed.blockIndex,
      block,
    };
  }

  function getSelectedBlockEntries() {
    return Array.from(state.selectedBlockKeys)
      .map((key) => getBlockEntryByKey(key))
      .filter(Boolean);
  }

  function getNodeEntryByKey(key) {
    const parsed = parseNodeKey(key);
    if (!parsed) return null;

    const node = getNode(parsed.nodeType, parsed.nodeIndex);
    if (!node) return null;

    return {
      key,
      nodeType: parsed.nodeType,
      nodeIndex: parsed.nodeIndex,
      node,
    };
  }

  function getAllNodeEntries() {
    const entries = [];

    const humanNodes = state.config?.humanNodes || [];
    humanNodes.forEach((node, index) => {
      entries.push({
        key: `human:${index}`,
        nodeType: "human",
        nodeIndex: index,
        node,
      });
    });

    const mouseNodes = state.config?.mouseNodes || [];
    mouseNodes.forEach((node, index) => {
      entries.push({
        key: `mouse:${index}`,
        nodeType: "mouse",
        nodeIndex: index,
        node,
      });
    });

    return entries;
  }

  function getSelectedEntries() {
    return Array.from(state.selectedKeys)
      .map((key) => getNodeEntryByKey(key))
      .filter(Boolean);
  }

  function createGroupId() {
    return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function isValidGroupMember(member) {
    if (!member || typeof member !== "object") return false;
    if (member.kind === "arrow") {
      return (member.nodeType === "human" || member.nodeType === "mouse")
        && Number.isInteger(member.nodeIndex);
    }
    if (member.kind === "block") {
      return (member.blockType === "human" || member.blockType === "mouse")
        && Number.isInteger(member.blockIndex);
    }
    return false;
  }

  function cloneGroupMember(member) {
    if (!isValidGroupMember(member)) return null;
    return member.kind === "arrow"
      ? {
          kind: "arrow",
          nodeType: member.nodeType,
          nodeIndex: member.nodeIndex,
        }
      : {
          kind: "block",
          blockType: member.blockType,
          blockIndex: member.blockIndex,
        };
  }

  function ensureCustomGroups() {
    if (!state.config) return [];
    if (!Array.isArray(state.config.customGroups)) {
      state.config.customGroups = [];
    }

    state.config.customGroups = state.config.customGroups
      .map((group, index) => {
        const members = Array.isArray(group?.members)
          ? group.members.map((member) => cloneGroupMember(member)).filter(Boolean)
          : [];
        if (!members.length) return null;
        return {
          id: group.id || `group-${index + 1}`,
          label: String(group.label || `Group ${index + 1}`),
          color: String(group.color || "var(--track)"),
          members,
        };
      })
      .filter(Boolean);

    return state.config.customGroups;
  }

  function getCustomGroupById(groupId) {
    return ensureCustomGroups().find((group) => group.id === groupId) || null;
  }

  function getSelectedGroupMembers() {
    const members = [];

    state.selectedKeys.forEach((key) => {
      const parsed = parseNodeKey(key);
      if (!parsed) return;
      members.push({
        kind: "arrow",
        nodeType: parsed.nodeType,
        nodeIndex: parsed.nodeIndex,
      });
    });

    state.selectedBlockKeys.forEach((key) => {
      const parsed = parseBlockKey(key);
      if (!parsed) return;
      members.push({
        kind: "block",
        blockType: parsed.blockType,
        blockIndex: parsed.blockIndex,
      });
    });

    return members;
  }

  function formatGroupMember(member) {
    if (!member) return "";
    if (member.kind === "arrow") {
      const node = getNode(member.nodeType, member.nodeIndex);
      return node ? `${node.title || "Arrow"} (${member.nodeType})` : "";
    }

    const block = getBlock(member.blockType, member.blockIndex);
    return block ? `${block.title || "Block"} (${member.blockType})` : "";
  }

  function describeGroupMembers(members) {
    const labels = (members || []).map((member) => formatGroupMember(member)).filter(Boolean);
    if (!labels.length) return "No selected blocks or arrows.";
    return labels.join(", ");
  }

  function applyGroupColorToMember(member, colorValue) {
    if (!colorValue || !String(colorValue).trim()) return;

    if (member.kind === "arrow") {
      const node = getNode(member.nodeType, member.nodeIndex);
      if (!node) return;
      node.stroke = colorValue;
      node.circleFill = colorValue;
      updateNodeVisual(member.nodeType, member.nodeIndex);
      return;
    }

    const block = getBlock(member.blockType, member.blockIndex);
    if (!block) return;
    block.stroke = colorValue;
    block.fill = `color-mix(in srgb, ${colorValue} 16%, transparent)`;
    updateBlockVisual(member.blockType, member.blockIndex);
  }

  function removeCustomGroup(groupId) {
    const groups = ensureCustomGroups();
    const nextGroups = groups.filter((group) => group.id !== groupId);
    const removed = nextGroups.length !== groups.length;
    state.config.customGroups = nextGroups;
    if (removed) {
      refreshTimelineLegend();
      createStatus("Removed group.");
    }
    return removed;
  }

  function updateGroupsAfterRemoval(kind, itemType, itemIndex) {
    const groups = ensureCustomGroups();
    let changed = false;

    groups.forEach((group) => {
      const nextMembers = [];
      group.members.forEach((member) => {
        const isTargetType = kind === "arrow"
          ? member.kind === "arrow" && member.nodeType === itemType
          : member.kind === "block" && member.blockType === itemType;

        if (!isTargetType) {
          nextMembers.push(member);
          return;
        }

        const memberIndex = kind === "arrow" ? member.nodeIndex : member.blockIndex;
        if (memberIndex === itemIndex) {
          changed = true;
          return;
        }

        if (memberIndex > itemIndex) {
          const nextMember = { ...member };
          if (kind === "arrow") nextMember.nodeIndex -= 1;
          else nextMember.blockIndex -= 1;
          nextMembers.push(nextMember);
          changed = true;
          return;
        }

        nextMembers.push(member);
      });

      group.members = nextMembers;
    });

    state.config.customGroups = groups.filter((group) => group.members.length > 0);
    if (changed) refreshTimelineLegend();
  }

  function getPrimarySelection() {
    const entries = getSelectedEntries();
    return entries.length ? entries[0] : null;
  }

  function getStages() {
    if (!state.config || !Array.isArray(state.config.developmentWindows)) return [];
    return state.config.developmentWindows;
  }

  function getStage(index) {
    const stages = getStages();
    if (!Number.isInteger(index) || index < 0 || index >= stages.length) return null;
    return stages[index];
  }

  function getStageEditingConfig() {
    return state.config?.stageEditing || {};
  }

  function getStageMinWidth() {
    return getStageEditingConfig().minWidth ?? 56;
  }

  function getStageBounds() {
    const stages = getStages();
    const fallbackTop = 105;
    const fallbackBottom = 775;
    const stageEditing = getStageEditingConfig();

    if (!stages.length) {
      return {
        top: stageEditing.boundaryTopY ?? fallbackTop,
        bottom: stageEditing.boundaryBottomY ?? fallbackBottom,
      };
    }

    return {
      top: stageEditing.boundaryTopY ?? stages[0].y,
      bottom: stageEditing.boundaryBottomY ?? (stages[0].y + stages[0].height),
    };
  }

  function resolveRangeTickX(tick) {
    const stages = getStages();
    if (typeof tick?.x === "number") return tick.x;

    if (typeof tick?.stageEdge === "number") {
      const edgeIndex = tick.stageEdge;
      if (edgeIndex <= 0 && stages.length) return stages[0].x;
      if (edgeIndex >= stages.length && stages.length) {
        const last = stages[stages.length - 1];
        return last.x + last.width;
      }
      if (edgeIndex > 0 && edgeIndex < stages.length) {
        const leftStage = stages[edgeIndex - 1];
        return leftStage.x + leftStage.width;
      }
    }

    if (typeof tick?.stageCenter === "number" && stages[tick.stageCenter]) {
      const stage = stages[tick.stageCenter];
      return stage.x + stage.width / 2;
    }

    return null;
  }

  function parseRangeLabel(label, rangeIndex) {
    const normalized = String(label || "").trim().toLowerCase().replace(/[+~]/g, "");
    const numberMatch = normalized.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return null;

    const value = Number(numberMatch[1]);
    if (!Number.isFinite(value)) return null;

    if (rangeIndex === 1) {
      if (normalized.startsWith("p")) return { value, kind: "mouse-day" };
      if (normalized.includes("wk")) return { value: value * 7, kind: "mouse-day" };
      return { value, kind: "mouse-day" };
    }

    if (normalized.includes(" y") || normalized.endsWith("y")) return { value: value * 12, kind: "human-month" };
    return { value, kind: "human-month" };
  }

  function formatRangeValue(value, kind) {
    if (!Number.isFinite(value)) return "";

    if (kind === "mouse-day") {
      return `P${Math.round(value)}`;
    }

    if (value < 24) {
      const roundedMonths = Math.round(value * 10) / 10;
      return `${Number.isInteger(roundedMonths) ? roundedMonths.toFixed(0) : roundedMonths} mo`;
    }

    const years = Math.round((value / 12) * 10) / 10;
    return `${Number.isInteger(years) ? years.toFixed(0) : years} y`;
  }

  function getTimelineTicks(rangeIndex) {
    const range = state.config?.axisRanges?.[rangeIndex];
    return (range?.ticks || [])
      .map((tick) => ({
        x: resolveRangeTickX(tick),
        label: tick.label || "",
        parsed: parseRangeLabel(tick.label, rangeIndex),
      }))
      .filter((tick) => Number.isFinite(tick.x))
      .sort((a, b) => a.x - b.x);
  }

  function describeTimelineX(x, rangeIndex) {
    const ticks = getTimelineTicks(rangeIndex);

    if (!ticks.length) return `x ${roundToThree(x)}`;

    const first = ticks[0];
    const last = ticks[ticks.length - 1];
    if (x <= first.x) return first.label || formatRangeValue(first.parsed?.value, first.parsed?.kind) || `x ${roundToThree(x)}`;
    if (x >= last.x) return last.label || formatRangeValue(last.parsed?.value, last.parsed?.kind) || `x ${roundToThree(x)}`;

    for (let index = 0; index < ticks.length - 1; index += 1) {
      const left = ticks[index];
      const right = ticks[index + 1];
      if (x < left.x || x > right.x) continue;

      const ratio = (x - left.x) / Math.max(1, right.x - left.x);
      if (left.parsed && right.parsed && left.parsed.kind === right.parsed.kind) {
        return formatRangeValue(lerp(left.parsed.value, right.parsed.value, ratio), left.parsed.kind);
      }

      const percent = Math.round(ratio * 100);
      return `${left.label || "start"} + ${percent}%`;
    }

    return `x ${roundToThree(x)}`;
  }

  function resolveTimelineInputToX(input, rangeIndex, fallbackX) {
    const text = String(input ?? "").trim();
    if (!text) return fallbackX;

    const ticks = getTimelineTicks(rangeIndex);
    if (!ticks.length) return fallbackX;

    const normalized = text.toLowerCase();
    const exactTick = ticks.find((tick) => String(tick.label || "").trim().toLowerCase() === normalized);
    if (exactTick) return roundToThree(exactTick.x);

    const parsed = parseRangeLabel(text, rangeIndex);
    if (!parsed) {
      const rawX = toNumber(text);
      return rawX !== null ? roundToThree(rawX) : fallbackX;
    }

    const parsedTicks = ticks.filter((tick) => tick.parsed && tick.parsed.kind === parsed.kind);
    if (!parsedTicks.length) return fallbackX;

    const first = parsedTicks[0];
    const last = parsedTicks[parsedTicks.length - 1];
    if (parsed.value <= first.parsed.value) return roundToThree(first.x);
    if (parsed.value >= last.parsed.value) return roundToThree(last.x);

    for (let index = 0; index < parsedTicks.length - 1; index += 1) {
      const left = parsedTicks[index];
      const right = parsedTicks[index + 1];
      const leftValue = left.parsed.value;
      const rightValue = right.parsed.value;
      const minValue = Math.min(leftValue, rightValue);
      const maxValue = Math.max(leftValue, rightValue);

      if (parsed.value < minValue || parsed.value > maxValue) continue;

      const denominator = rightValue - leftValue;
      const ratio = denominator === 0 ? 0 : (parsed.value - leftValue) / denominator;
      return roundToThree(lerp(left.x, right.x, ratio));
    }

    return fallbackX;
  }

  function getStageNameForX(x) {
    const stage = getStages().find((candidate) => x >= candidate.x && x <= candidate.x + candidate.width);
    if (!stage) return "";
    const index = getStages().indexOf(stage);
    return inferStageName(stage, index);
  }

  function ensureDragReadout() {
    if (!state.svg) return null;

    let group = state.svg.querySelector(".drag-readout");
    if (group) return group;

    group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("drag-readout");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.classList.add("drag-readout-bg");
    rect.setAttribute("rx", "6");
    group.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.classList.add("drag-readout-text");
    text.setAttribute("text-anchor", "middle");
    group.appendChild(text);

    state.svg.appendChild(group);
    return group;
  }

  function updateDragReadout(label, x, y) {
    const group = ensureDragReadout();
    if (!group) return;

    const text = group.querySelector(".drag-readout-text");
    const rect = group.querySelector(".drag-readout-bg");
    text.textContent = label;
    text.setAttribute("x", x);
    text.setAttribute("y", y);

    const width = Math.max(96, label.length * 7.2);
    rect.setAttribute("x", x - width / 2);
    rect.setAttribute("y", y - 18);
    rect.setAttribute("width", width);
    rect.setAttribute("height", 24);
    group.removeAttribute("hidden");
  }

  function clearDragReadout() {
    state.svg?.querySelector(".drag-readout")?.remove();
  }

  function describeBlockPlacement(blockType, block) {
    const rangeIndex = blockType === "mouse" ? 1 : 0;
    const startLabel = describeTimelineX(Number(block.xStart), rangeIndex);
    const endLabel = describeTimelineX(Number(block.xEnd), rangeIndex);
    const stageName = getStageNameForX((Number(block.xStart) + Number(block.xEnd)) / 2);
    return `${startLabel} -> ${endLabel}${stageName ? ` (${stageName})` : ""}`;
  }

  function describeBlockAgeRange(blockType, block) {
    const rangeIndex = blockType === "mouse" ? 1 : 0;
    return `${describeTimelineX(Number(block.xStart), rangeIndex)} -> ${describeTimelineX(Number(block.xEnd), rangeIndex)}`;
  }

  function describeNodePlacement(nodeType, node) {
    const rangeIndex = nodeType === "mouse" ? 1 : 0;
    const ageLabel = describeTimelineX(Number(node.x), rangeIndex);
    const stageName = getStageNameForX(Number(node.x));
    return `${ageLabel}${stageName ? ` (${stageName})` : ""}`;
  }

  function describeNodeAgeRange(nodeType, node) {
    const rangeIndex = nodeType === "mouse" ? 1 : 0;
    return describeTimelineX(Number(node.x), rangeIndex);
  }

  function snapshotVerticalLayout() {
    return {
      bounds: getStageBounds(),
      canvasHeight: Number(state.config?.canvas?.height) || 860,
      viewBox: state.config?.canvas?.viewBox || "0 0 1480 860",
      stages: getStages().map((stage) => ({
        y: Number(stage.y),
        height: Number(stage.height),
        stageLabelY: Number(stage.stageLabelY ?? getStageLabelSettings().y),
      })),
      humanNodes: (state.config?.humanNodes || []).map((node) => ({ yNode: Number(node.yNode), yAxis: Number(node.yAxis) })),
      mouseNodes: (state.config?.mouseNodes || []).map((node) => ({ yNode: Number(node.yNode), yAxis: Number(node.yAxis) })),
      humanBlocks: (state.config?.humanRangeBlocks || []).map((block) => ({ y: Number(block.y) })),
      mouseBlocks: (state.config?.mouseRangeBlocks || []).map((block) => ({ y: Number(block.y) })),
      mainAxis: state.config?.mainAxis ? {
        x1: Number(state.config.mainAxis.x1),
        x2: Number(state.config.mainAxis.x2),
        y: Number(state.config.mainAxis.y),
      } : null,
      axisLabels: (state.config?.axisLabels || []).map((label) => ({ y: Number(label.y) })),
      axisRanges: (state.config?.axisRanges || []).map((range) => ({
        lineY: Number(range.lineY),
        titleY: Number(range.titleY),
      })),
      alignmentNote: state.config?.alignmentNote ? {
        rectY: Number(state.config.alignmentNote.rect?.y),
        lineYs: (state.config.alignmentNote.lines || []).map((line) => Number(line.y)),
      } : null,
    };
  }

  function snapshotHorizontalLayout() {
    return {
      canvasWidth: Number(state.config?.canvas?.width) || 1480,
      viewBox: state.config?.canvas?.viewBox || "0 0 1480 860",
      stages: getStages().map((stage) => ({
        x: Number(stage.x),
        width: Number(stage.width),
        stageLabelX: Number(stage.stageLabelX),
      })),
      humanNodes: (state.config?.humanNodes || []).map((node) => ({ x: Number(node.x) })),
      mouseNodes: (state.config?.mouseNodes || []).map((node) => ({ x: Number(node.x) })),
      humanBlocks: (state.config?.humanRangeBlocks || []).map((block) => ({
        xStart: Number(block.xStart),
        xEnd: Number(block.xEnd),
      })),
      mouseBlocks: (state.config?.mouseRangeBlocks || []).map((block) => ({
        xStart: Number(block.xStart),
        xEnd: Number(block.xEnd),
      })),
      mainAxis: state.config?.mainAxis ? {
        x1: Number(state.config.mainAxis.x1),
        x2: Number(state.config.mainAxis.x2),
        y: Number(state.config.mainAxis.y),
      } : null,
      axisLabels: (state.config?.axisLabels || []).map((label) => ({ x: Number(label.x), y: Number(label.y) })),
      axisRanges: (state.config?.axisRanges || []).map((range) => ({
        lineStartX: Number(range.lineStartX),
        lineEndX: Number(range.lineEndX),
        titleX: Number(range.titleX),
        ticks: (range.ticks || []).map((tick) => ({ x: Number(tick.x) })),
      })),
      alignmentNote: state.config?.alignmentNote ? {
        rectX: Number(state.config.alignmentNote.rect?.x),
        rectWidth: Number(state.config.alignmentNote.rect?.width),
        lineXs: (state.config.alignmentNote.lines || []).map((line) => Number(line.x)),
      } : null,
    };
  }

  function scaleYFromSnapshot(value, oldStart, oldEnd, newStart, newEnd) {
    const denominator = oldEnd - oldStart;
    if (!Number.isFinite(value) || Math.abs(denominator) < EPSILON) return value;
    const ratio = (value - oldStart) / denominator;
    return roundToThree(newStart + ratio * (newEnd - newStart));
  }

  function scaleXFromSnapshot(value, oldStart, oldEnd, newStart, newEnd) {
    const denominator = oldEnd - oldStart;
    if (!Number.isFinite(value) || Math.abs(denominator) < EPSILON) return value;
    const ratio = (value - oldStart) / denominator;
    return roundToThree(newStart + ratio * (newEnd - newStart));
  }

  function getCanvasViewBoxParts() {
    const canvas = state.config?.canvas || {};
    const viewBox = String(canvas.viewBox || `0 0 ${canvas.width || 1480} ${canvas.height || 860}`);
    const parts = viewBox.trim().split(/\s+/).map(Number);
    return {
      x: Number.isFinite(parts[0]) ? parts[0] : 0,
      y: Number.isFinite(parts[1]) ? parts[1] : 0,
      width: Number.isFinite(parts[2]) ? parts[2] : Number(canvas.width || 1480),
      height: Number.isFinite(parts[3]) ? parts[3] : Number(canvas.height || 860),
    };
  }

  function setCanvasVerticalBounds(top, bottom) {
    const note = state.config?.alignmentNote;
    const noteBottom = note?.rect ? Number(note.rect.y) + Number(note.rect.height || 0) + 30 : bottom + 120;
    const canvas = state.config?.canvas;
    if (!canvas) return;

    const viewBox = getCanvasViewBoxParts();
    const minY = Math.min(0, Math.floor(top - 80));
    const maxY = Math.max(Math.ceil(noteBottom), Math.ceil(bottom + 110), minY + 520);
    const nextHeight = Math.max(520, maxY - minY);
    canvas.height = nextHeight;
    canvas.viewBox = `${viewBox.x} ${minY} ${viewBox.width} ${nextHeight}`;
  }

  function setCanvasHeightFromBottom(bottom) {
    setCanvasVerticalBounds(0, bottom);
  }

  function setCanvasHorizontalBounds(left, right) {
    const canvas = state.config?.canvas;
    if (!canvas) return;

    const viewBox = getCanvasViewBoxParts();
    const minX = Math.min(0, Math.floor(left - 80));
    const maxX = Math.max(Math.ceil(right + 80), minX + 620);
    const nextWidth = Math.max(620, maxX - minX);
    canvas.width = nextWidth;
    canvas.viewBox = `${minX} ${viewBox.y} ${nextWidth} ${viewBox.height}`;
  }

  function applyVerticalScaleFromSnapshot(edge, requestedY, snapshot) {
    if (!snapshot || !state.config) return false;

    const mainY = Number(state.config.mainAxis?.y) || 385;
    const oldTop = snapshot.bounds.top;
    const oldBottom = snapshot.bounds.bottom;
    const nextTop = edge === "top" ? Math.min(requestedY, mainY - 70) : oldTop;
    const nextBottom = edge === "bottom" ? Math.max(requestedY, mainY + 70) : oldBottom;

    if (Math.abs(nextTop - oldTop) < EPSILON && Math.abs(nextBottom - oldBottom) < EPSILON) return false;

    state.config.stageEditing = state.config.stageEditing || {};
    state.config.stageEditing.boundaryTopY = roundToThree(nextTop);
    state.config.stageEditing.boundaryBottomY = roundToThree(nextBottom);

    getStages().forEach((stage, index) => {
      const startStage = snapshot.stages[index];
      if (!startStage) return;
      stage.y = roundToThree(nextTop);
      stage.height = roundToThree(nextBottom - nextTop);
      stage.stageLabelY = scaleYFromSnapshot(startStage.stageLabelY, oldTop, mainY, nextTop, mainY);
    });

    (state.config.humanNodes || []).forEach((node, index) => {
      const startNode = snapshot.humanNodes[index];
      if (!startNode) return;
      node.yNode = scaleYFromSnapshot(startNode.yNode, oldTop, mainY, nextTop, mainY);
    });

    (state.config.mouseNodes || []).forEach((node, index) => {
      const startNode = snapshot.mouseNodes[index];
      if (!startNode) return;
      node.yNode = scaleYFromSnapshot(startNode.yNode, mainY, oldBottom, mainY, nextBottom);
    });

    (state.config.humanRangeBlocks || []).forEach((block, index) => {
      const startBlock = snapshot.humanBlocks[index];
      if (!startBlock) return;
      block.y = scaleYFromSnapshot(startBlock.y, oldTop, mainY, nextTop, mainY);
    });

    (state.config.mouseRangeBlocks || []).forEach((block, index) => {
      const startBlock = snapshot.mouseBlocks[index];
      if (!startBlock) return;
      block.y = scaleYFromSnapshot(startBlock.y, mainY, oldBottom, mainY, nextBottom);
    });

    (state.config.axisLabels || []).forEach((label, index) => {
      const startLabel = snapshot.axisLabels[index];
      if (!startLabel) return;
      if (String(label.text || "").toLowerCase().includes("human")) {
        label.y = roundToThree((nextTop + mainY) / 2);
        label.transform = `rotate(-90 ${label.x} ${label.y})`;
      } else if (String(label.text || "").toLowerCase().includes("mice")) {
        label.y = roundToThree((mainY + nextBottom) / 2);
        label.transform = `rotate(-90 ${label.x} ${label.y})`;
      }
    });

    const ranges = state.config.axisRanges || [];
    if (ranges[0] && snapshot.axisRanges[0]) {
      ranges[0].lineY = roundToThree(snapshot.axisRanges[0].lineY + (nextTop - oldTop));
      if (Number.isFinite(snapshot.axisRanges[0].titleY)) {
        ranges[0].titleY = roundToThree(snapshot.axisRanges[0].titleY + (nextTop - oldTop));
      }
    }
    if (ranges[1] && snapshot.axisRanges[1]) {
      ranges[1].lineY = roundToThree(snapshot.axisRanges[1].lineY + (nextBottom - oldBottom));
      if (Number.isFinite(snapshot.axisRanges[1].titleY)) {
        ranges[1].titleY = roundToThree(snapshot.axisRanges[1].titleY + (nextBottom - oldBottom));
      }
    }

    if (state.config.alignmentNote && snapshot.alignmentNote) {
      const deltaBottom = nextBottom - oldBottom;
      state.config.alignmentNote.rect.y = roundToThree(snapshot.alignmentNote.rectY + deltaBottom);
      (state.config.alignmentNote.lines || []).forEach((line, index) => {
        const startY = snapshot.alignmentNote.lineYs[index];
        if (Number.isFinite(startY)) line.y = roundToThree(startY + deltaBottom);
      });
    }

    setCanvasVerticalBounds(nextTop, nextBottom);
    syncWindowLabelsFromStages();

    if (state.svg) {
      state.svg.setAttribute("viewBox", state.config.canvas.viewBox);
      state.svg.setAttribute("height", state.config.canvas.height);
      getStages().forEach((_, index) => updateStageVisual(index));
      updateStageBoundaryHandles();
      updateRangeAxesVisuals();
      updateAxisLabelVisuals();
      getAllNodeEntries().forEach((entry) => updateNodeVisual(entry.nodeType, entry.nodeIndex));
      getAllBlockEntries().forEach((entry) => updateBlockVisual(entry.blockType, entry.blockIndex));
    }

    return true;
  }

  function applyHorizontalScaleFromSnapshot(edge, requestedX, snapshot) {
    if (!snapshot || !state.config?.mainAxis || !snapshot.mainAxis) return false;

    const oldStart = snapshot.mainAxis.x1;
    const oldEnd = snapshot.mainAxis.x2;
    const minWidth = 120;
    const nextStart = edge === "resize-start" ? Math.min(requestedX, oldEnd - minWidth) : oldStart;
    const nextEnd = edge === "resize-end" ? Math.max(requestedX, oldStart + minWidth) : oldEnd;

    if (Math.abs(nextStart - oldStart) < EPSILON && Math.abs(nextEnd - oldEnd) < EPSILON) return false;

    const mapX = (value) => scaleXFromSnapshot(value, oldStart, oldEnd, nextStart, nextEnd);
    state.config.mainAxis.x1 = roundToThree(nextStart);
    state.config.mainAxis.x2 = roundToThree(nextEnd);

    getStages().forEach((stage, index) => {
      const startStage = snapshot.stages[index];
      if (!startStage) return;
      const startX = mapX(startStage.x);
      const endX = mapX(startStage.x + startStage.width);
      stage.x = startX;
      stage.width = roundToThree(endX - startX);
      if (Number.isFinite(startStage.stageLabelX)) stage.stageLabelX = mapX(startStage.stageLabelX);
    });

    (state.config.humanNodes || []).forEach((node, index) => {
      const startNode = snapshot.humanNodes[index];
      if (startNode) node.x = mapX(startNode.x);
    });
    (state.config.mouseNodes || []).forEach((node, index) => {
      const startNode = snapshot.mouseNodes[index];
      if (startNode) node.x = mapX(startNode.x);
    });

    (state.config.humanRangeBlocks || []).forEach((block, index) => {
      const startBlock = snapshot.humanBlocks[index];
      if (!startBlock) return;
      block.xStart = mapX(startBlock.xStart);
      block.xEnd = mapX(startBlock.xEnd);
      if ("x" in block) block.x = block.xStart;
      if ("end" in block) block.end = block.xEnd;
    });
    (state.config.mouseRangeBlocks || []).forEach((block, index) => {
      const startBlock = snapshot.mouseBlocks[index];
      if (!startBlock) return;
      block.xStart = mapX(startBlock.xStart);
      block.xEnd = mapX(startBlock.xEnd);
      if ("x" in block) block.x = block.xStart;
      if ("end" in block) block.end = block.xEnd;
    });

    (state.config.axisLabels || []).forEach((label, index) => {
      const startLabel = snapshot.axisLabels[index];
      if (!startLabel) return;
      if (Number.isFinite(startLabel.x)) label.x = mapX(startLabel.x);
      if (label.transform) label.transform = `rotate(-90 ${label.x} ${label.y})`;
    });

    (state.config.axisRanges || []).forEach((range, index) => {
      const startRange = snapshot.axisRanges[index];
      if (!startRange) return;
      if (Number.isFinite(startRange.lineStartX)) range.lineStartX = mapX(startRange.lineStartX);
      if (Number.isFinite(startRange.lineEndX)) range.lineEndX = mapX(startRange.lineEndX);
      if (Number.isFinite(startRange.titleX)) range.titleX = mapX(startRange.titleX);
      (range.ticks || []).forEach((tick, tickIndex) => {
        const startTick = startRange.ticks?.[tickIndex];
        if (startTick && Number.isFinite(startTick.x)) tick.x = mapX(startTick.x);
      });
    });

    if (state.config.alignmentNote && snapshot.alignmentNote) {
      if (Number.isFinite(snapshot.alignmentNote.rectX)) {
        const noteStart = mapX(snapshot.alignmentNote.rectX);
        const noteEnd = mapX(snapshot.alignmentNote.rectX + snapshot.alignmentNote.rectWidth);
        state.config.alignmentNote.rect.x = noteStart;
        state.config.alignmentNote.rect.width = roundToThree(noteEnd - noteStart);
      }
      (state.config.alignmentNote.lines || []).forEach((line, index) => {
        const startX = snapshot.alignmentNote.lineXs[index];
        if (Number.isFinite(startX)) line.x = mapX(startX);
      });
    }

    syncWindowLabelsFromStages();
    refreshAgeRangesFromPositions();

    const stages = getStages();
    const left = Math.min(Number(state.config.mainAxis.x1), ...stages.map((stage) => Number(stage.x)));
    const right = Math.max(Number(state.config.mainAxis.x2), ...stages.map((stage) => Number(stage.x) + Number(stage.width)));
    setCanvasHorizontalBounds(left, right);

    if (state.svg) {
      state.svg.setAttribute("viewBox", state.config.canvas.viewBox);
      state.svg.setAttribute("width", state.config.canvas.width);
      getStages().forEach((_, index) => updateStageVisual(index));
      updateStageBoundaryHandles();
      updateRangeAxesVisuals();
      updateAxisLabelVisuals();
      updateMainAxisVisual();
      getAllNodeEntries().forEach((entry) => updateNodeVisual(entry.nodeType, entry.nodeIndex));
      getAllBlockEntries().forEach((entry) => updateBlockVisual(entry.blockType, entry.blockIndex));
    }

    return true;
  }

  function getMainAxisY() {
    return Number(state.config?.mainAxis?.y) || 385;
  }

  function syncNodesToMainAxis() {
    const axisY = getMainAxisY();
    (state.config?.humanNodes || []).forEach((node) => {
      node.yAxis = axisY;
    });
    (state.config?.mouseNodes || []).forEach((node) => {
      node.yAxis = axisY;
    });
  }

  function updateAxisLabelVisuals() {
    if (!state.svg || !Array.isArray(state.config?.axisLabels)) return;

    state.config.axisLabels.forEach((label, index) => {
      const element = state.svg.querySelector(`.axis-label[data-axis-index="${index}"]`)
        || state.svg.querySelectorAll(".axis-label")[index];
      if (!element) return;

      element.setAttribute("x", label.x);
      element.setAttribute("y", label.y);
      element.setAttribute("transform", label.transform || "");
      element.textContent = label.text || "";
      if (label.fill) element.setAttribute("fill", label.fill);
    });
  }

  function applyCenterAxisMoveFromSnapshot(requestedY, snapshot) {
    if (!snapshot || !state.config?.mainAxis || !snapshot.mainAxis) return false;

    const oldTop = snapshot.bounds.top;
    const oldBottom = snapshot.bounds.bottom;
    const oldMainY = snapshot.mainAxis.y;
    const nextMainY = clamp(requestedY, oldTop + 90, oldBottom - 90);

    if (Math.abs(nextMainY - oldMainY) < EPSILON) return false;

    state.config.mainAxis.y = roundToThree(nextMainY);

    (state.config.humanNodes || []).forEach((node, index) => {
      const startNode = snapshot.humanNodes[index];
      if (!startNode) return;
      node.yNode = scaleYFromSnapshot(startNode.yNode, oldTop, oldMainY, oldTop, nextMainY);
      node.yAxis = state.config.mainAxis.y;
    });

    (state.config.mouseNodes || []).forEach((node, index) => {
      const startNode = snapshot.mouseNodes[index];
      if (!startNode) return;
      node.yNode = scaleYFromSnapshot(startNode.yNode, oldMainY, oldBottom, nextMainY, oldBottom);
      node.yAxis = state.config.mainAxis.y;
    });

    (state.config.humanRangeBlocks || []).forEach((block, index) => {
      const startBlock = snapshot.humanBlocks[index];
      if (!startBlock) return;
      block.y = scaleYFromSnapshot(startBlock.y, oldTop, oldMainY, oldTop, nextMainY);
    });

    (state.config.mouseRangeBlocks || []).forEach((block, index) => {
      const startBlock = snapshot.mouseBlocks[index];
      if (!startBlock) return;
      block.y = scaleYFromSnapshot(startBlock.y, oldMainY, oldBottom, nextMainY, oldBottom);
    });

    (state.config.axisLabels || []).forEach((label) => {
      const lowerText = String(label.text || "").toLowerCase();
      if (lowerText.includes("human") || lowerText.includes("upper")) {
        label.y = roundToThree((oldTop + nextMainY) / 2);
      } else if (lowerText.includes("mice") || lowerText.includes("lower")) {
        label.y = roundToThree((nextMainY + oldBottom) / 2);
      } else {
        return;
      }
      label.transform = `rotate(-90 ${label.x} ${label.y})`;
    });

    if (state.svg) {
      updateMainAxisVisual();
      updateAxisLabelVisuals();
      getAllNodeEntries().forEach((entry) => updateNodeVisual(entry.nodeType, entry.nodeIndex));
      getAllBlockEntries().forEach((entry) => updateBlockVisual(entry.blockType, entry.blockIndex));
    }

    return true;
  }

  function getStageLabelSettings() {
    const stageLabels = state.config?.stageLabels || {};
    return {
      y: stageLabels.y ?? 114,
      fill: stageLabels.fill ?? "color-mix(in srgb, var(--text) 90%, transparent)",
      className: stageLabels.class ?? "svg-window-label",
    };
  }

  function inferStageName(stage, index) {
    if (stage.stageName) return stage.stageName;
    if (stage.humanLabel) return stage.humanLabel;
    if (stage.label) return stage.label;
    return `Stage ${index + 1}`;
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

  function ensureStageMetadata() {
    getStages().forEach((stage, index) => {
      if (!stage.humanLabel) stage.humanLabel = inferHumanLabel(stage, index);
      if (!stage.mouseLabel) stage.mouseLabel = inferMouseLabel(stage, index);
      if (!stage.stageName) stage.stageName = inferStageName(stage, index);
    });
  }

  function syncWindowLabelsFromStages() {
    if (!state.config) return;

    ensureStageMetadata();

    const settings = getStageLabelSettings();
    const labels = [];

    getStages().forEach((stage, index) => {
      labels.push({
        stageIndex: index,
        x: stage.x + stage.width / 2,
        y: stage.stageLabelY ?? settings.y,
        text: inferStageName(stage, index),
        class: stage.stageLabelClass || settings.className,
        fill: stage.stageLabelFill || settings.fill,
      });
    });

    state.config.windowLabels = labels;
  }

  function refreshTimelineLegend() {
    ensureCustomGroups();
    if (typeof window !== "undefined" && typeof window.renderTimelineLegend === "function") {
      window.renderTimelineLegend(state.config);
    }
  }

  function syncAxisTicksWithStages() {
    const stages = getStages();
    const axisRanges = state.config?.axisRanges;
    if (!stages.length || !Array.isArray(axisRanges)) return;

    axisRanges.forEach((range, rangeIndex) => {
      const oldTicks = Array.isArray(range.ticks) ? range.ticks : [];
      const fallbackPrefix = rangeIndex === 0 ? "age" : "P";
      range.ticks = Array.from({ length: stages.length + 1 }, (_, index) => ({
        stageEdge: index,
        label: oldTicks[index]?.label || (index === 0 ? "" : `${fallbackPrefix}${index * (rangeIndex === 0 ? 1 : 7)}`),
      }));

      range.lineStartX = stages[0].x;
      range.lineEndX = stages[stages.length - 1].x + stages[stages.length - 1].width;
    });
  }

  function insertAxisTick(edgeIndex, humanLabel, mouseLabel) {
    const axisRanges = state.config?.axisRanges;
    if (!Array.isArray(axisRanges)) return;

    [humanLabel, mouseLabel].forEach((label, rangeIndex) => {
      const range = axisRanges[rangeIndex];
      if (!range) return;
      if (!Array.isArray(range.ticks)) range.ticks = [];
      range.ticks.splice(edgeIndex, 0, { stageEdge: edgeIndex, label: label || "new" });
      range.ticks.forEach((tick, index) => {
        tick.stageEdge = index;
      });
    });

    syncAxisTicksWithStages();
  }

  function removeAxisTick(edgeIndex) {
    const axisRanges = state.config?.axisRanges;
    if (!Array.isArray(axisRanges)) return;

    axisRanges.forEach((range) => {
      if (!Array.isArray(range.ticks)) range.ticks = [];
      if (edgeIndex > 0 && edgeIndex < range.ticks.length) {
        range.ticks.splice(edgeIndex, 1);
      }
      range.ticks.forEach((tick, index) => {
        tick.stageEdge = index;
      });
    });

    syncAxisTicksWithStages();
  }

  function applySpeciesColorsToBlock(blockType, blockIndex, species) {
    const block = getBlock(blockType, blockIndex);
    if (!block) return false;

    if (species === "human") {
      block.fill = "var(--human-soft)";
      block.stroke = "var(--human)";
      block.titleFill = "var(--text)";
      block.ageFill = "var(--muted)";
    } else {
      block.fill = "var(--mouse-soft)";
      block.stroke = "var(--mouse)";
      block.titleFill = "var(--text)";
      block.ageFill = "var(--muted)";
    }

    setFloatingFieldValue("fill", block.fill);
    setFloatingFieldValue("stroke", block.stroke);
    setFloatingFieldValue("titleFill", block.titleFill);
    setFloatingFieldValue("ageFill", block.ageFill);

    updateBlockVisual(blockType, blockIndex);
    renderInspector();
    createStatus(`Applied ${species === "human" ? "upper group" : "lower group"} colors to block.`);
    return true;
  }

  function resolveBlockFromEvent(event, allowSelectedFallback = false) {
    const blockGroup = event?.target?.closest?.(".editable-range");
    if (blockGroup && state.svg?.contains(blockGroup)) {
      const blockType = blockGroup.dataset.blockType;
      const blockIndex = Number(blockGroup.dataset.blockIndex);
      if ((blockType === "human" || blockType === "mouse") && Number.isInteger(blockIndex)) {
        return { blockGroup, blockType, blockIndex };
      }
    }

    if (!allowSelectedFallback) return null;

    const selectedBlock = parseBlockKey(state.selectedBlockKey);
    if (!selectedBlock) return null;

    return {
      blockGroup: state.svg?.querySelector(`.editable-range[data-block-type="${selectedBlock.blockType}"][data-block-index="${selectedBlock.blockIndex}"]`) || null,
      blockType: selectedBlock.blockType,
      blockIndex: selectedBlock.blockIndex,
    };
  }

  function openBlockSettingsFromEvent(event, allowSelectedFallback = false) {
    const resolved = resolveBlockFromEvent(event, allowSelectedFallback);
    if (!resolved) return false;

    const block = getBlock(resolved.blockType, resolved.blockIndex);
    if (!block) return false;

    openBlockSettingsEditor(resolved.blockType, resolved.blockIndex, event);
    return true;
  }

  function getStageAgeValues(stageIndex) {
    return {
      humanStartAge: state.config?.axisRanges?.[0]?.ticks?.[stageIndex]?.label || "",
      humanEndAge: state.config?.axisRanges?.[0]?.ticks?.[stageIndex + 1]?.label || "",
      mouseStartAge: state.config?.axisRanges?.[1]?.ticks?.[stageIndex]?.label || "",
      mouseEndAge: state.config?.axisRanges?.[1]?.ticks?.[stageIndex + 1]?.label || "",
    };
  }

  function applyStageAgeValues(stageIndex, values) {
    const humanTicks = state.config?.axisRanges?.[0]?.ticks;
    const mouseTicks = state.config?.axisRanges?.[1]?.ticks;
    if (humanTicks?.[stageIndex]) humanTicks[stageIndex].label = values.humanStartAge ?? humanTicks[stageIndex].label;
    if (humanTicks?.[stageIndex + 1]) humanTicks[stageIndex + 1].label = values.humanEndAge ?? humanTicks[stageIndex + 1].label;
    if (mouseTicks?.[stageIndex]) mouseTicks[stageIndex].label = values.mouseStartAge ?? mouseTicks[stageIndex].label;
    if (mouseTicks?.[stageIndex + 1]) mouseTicks[stageIndex + 1].label = values.mouseEndAge ?? mouseTicks[stageIndex + 1].label;
    refreshAgeRangesFromPositions();
    updateRangeAxesVisuals();
  }

  function refreshAgeRangesFromPositions() {
    getAllNodeEntries().forEach((entry) => {
      entry.node.ageRange = describeNodeAgeRange(entry.nodeType, entry.node);
      updateNodeVisual(entry.nodeType, entry.nodeIndex);
    });

    getAllBlockEntries().forEach((entry) => {
      entry.block.ageRange = describeBlockAgeRange(entry.blockType, entry.block);
      updateBlockVisual(entry.blockType, entry.blockIndex);
    });

    renderInspector();
  }

  function getNodeMarkerId(nodeType, node) {
    if (node?.markerId) return node.markerId;
    return nodeType === "human" ? "humanArrow" : "mouseArrow";
  }

  function getNodeOffsets(nodeType) {
    const nodes = state.config?.nodes || {};
    if (nodeType === "human") {
      return {
        titleOffsetX: nodes.humanTitleOffsetX ?? 0,
        ageOffsetX: nodes.humanAgeOffsetX ?? 0,
        titleOffset: nodes.humanTitleOffsetY ?? -21,
        ageOffset: nodes.humanAgeOffsetY ?? -37,
      };
    }

    return {
      titleOffsetX: nodes.mouseTitleOffsetX ?? 0,
      ageOffsetX: nodes.mouseAgeOffsetX ?? 0,
      titleOffset: nodes.mouseTitleOffsetY ?? 23,
      ageOffset: nodes.mouseAgeOffsetY ?? 39,
    };
  }

  function setTextOverrides(textElement, fillValue, fontSizeValue) {
    if (!textElement) return;

    if (fillValue && String(fillValue).trim()) {
      textElement.setAttribute("fill", fillValue);
    } else {
      textElement.removeAttribute("fill");
    }

    if (typeof fontSizeValue === "number" && Number.isFinite(fontSizeValue) && fontSizeValue > 0) {
      textElement.style.fontSize = `${fontSizeValue}px`;
    } else {
      textElement.style.removeProperty("font-size");
    }
  }

  function findNodeGroupByKey(key) {
    if (!state.svg) return null;
    return state.svg.querySelector(`[data-node-key="${key}"]`);
  }

  function updateNodeVisual(nodeType, nodeIndex) {
    const node = getNode(nodeType, nodeIndex);
    if (!node || !state.svg) return;

    const key = `${nodeType}:${nodeIndex}`;
    const group = findNodeGroupByKey(key);
    if (!group) return;

    const line = group.querySelector(".node-connector");
    const circle = group.querySelector(".node-circle");
    const titleText = group.querySelector(".node-title");
    const ageText = group.querySelector(".node-age");
    const hitArea = group.querySelector(".node-hit-area");

    const markerId = getNodeMarkerId(nodeType, node);
    const strokeWidth = node.strokeWidth ?? state.config.nodes.connectorStrokeWidth;
    const circleRadius = node.circleRadius ?? state.config.nodes.circleRadius;
    const offsets = getNodeOffsets(nodeType);
    const axisY = getMainAxisY();
    node.yAxis = axisY;

    if (line) {
      line.setAttribute("x1", node.x);
      line.setAttribute("y1", node.yNode);
      line.setAttribute("x2", node.x);
      line.setAttribute("y2", axisY);
      line.setAttribute("stroke", node.stroke);
      line.setAttribute("stroke-width", strokeWidth);
      line.setAttribute("marker-end", `url(#${markerId})`);
    }

    if (circle) {
      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.yNode);
      circle.setAttribute("r", circleRadius);
      circle.setAttribute("fill", node.circleFill || node.stroke);
    }

    if (titleText) {
      titleText.setAttribute("x", node.x + (node.titleOffsetX ?? offsets.titleOffsetX));
      titleText.setAttribute("y", node.yNode + offsets.titleOffset);
      titleText.textContent = node.title;
      setTextOverrides(titleText, node.titleFill, normalizePositiveNumber(node.titleFontSize, getDefaultNodeTitleFontSize()));
    }

    if (ageText) {
      ageText.setAttribute("x", node.x + (node.ageOffsetX ?? offsets.ageOffsetX));
      ageText.setAttribute("y", node.yNode + offsets.ageOffset);
      ageText.textContent = node.ageRange;
      setTextOverrides(ageText, node.ageFill, normalizePositiveNumber(node.ageFontSize, getDefaultNodeAgeFontSize()));
    }

    if (hitArea) {
      hitArea.setAttribute("cx", node.x);
      hitArea.setAttribute("cy", node.yNode);
      hitArea.setAttribute("r", Math.max(16, circleRadius + 10));
    }
  }

  function updateBlockVisual(blockType, blockIndex) {
    const block = getBlock(blockType, blockIndex);
    if (!block || !state.svg) return;

    const group = state.svg.querySelector(`.editable-range[data-block-type="${blockType}"][data-block-index="${blockIndex}"]`);
    if (!group) return;

    const body = group.querySelector(".range-block-body");
    const titleText = group.querySelector(".range-block-title");
    const ageText = group.querySelector(".range-block-age");
    const hitbox = group.querySelector(".range-block-hitbox");
    const leftHandle = group.querySelector(".range-block-resize-left");
    const rightHandle = group.querySelector(".range-block-resize-right");
    const topHandle = group.querySelector(".range-block-resize-top");
    const bottomHandle = group.querySelector(".range-block-resize-bottom");

    const xStart = Number(block.xStart);
    const xEnd = Number(block.xEnd);
    const x = Math.min(xStart, xEnd);
    const width = Math.max(8, Math.abs(xEnd - xStart));
    const blocks = state.config?.blocks || {};
    const isHuman = blockType === "human";
    const y = Number(block.y);
    const height = getNormalizedBlockHeight(block.height);
    block.height = height;
    const centerX = x + (width / 2);

    const titleOffsetY = block.titleOffsetY ?? blocks.titleInsideOffsetY ?? 14;
    const ageOffsetY = block.ageOffsetY ?? blocks.ageInsideOffsetY ?? 28;
    const titleOffsetX = block.titleOffsetX ?? 0;
    const ageOffsetX = block.ageOffsetX ?? 0;

    if (body) {
      body.setAttribute("x", x);
      body.setAttribute("y", y);
      body.setAttribute("width", width);
      body.setAttribute("height", height);
      body.setAttribute("rx", block.rx ?? blocks.cornerRadius ?? 8);
      body.setAttribute("fill", block.fill || (isHuman ? "var(--human-soft)" : "var(--mouse-soft)"));
      body.setAttribute("stroke", block.stroke || (isHuman ? "var(--human)" : "var(--mouse)"));
      body.setAttribute("stroke-width", block.strokeWidth ?? blocks.strokeWidth ?? 1.9);
    }

    if (titleText) {
      titleText.setAttribute("x", centerX + titleOffsetX);
      titleText.setAttribute("y", y + titleOffsetY);
      titleText.textContent = block.title || "Range";
      setTextOverrides(titleText, block.titleFill, normalizePositiveNumber(block.titleFontSize, getDefaultBlockTitleFontSize()));
    }

    if (ageText) {
      ageText.setAttribute("x", centerX + ageOffsetX);
      ageText.setAttribute("y", y + ageOffsetY);
      ageText.textContent = block.ageRange || "";
      setTextOverrides(ageText, block.ageFill, normalizePositiveNumber(block.ageFontSize, getDefaultBlockAgeFontSize()));
    }

    if (hitbox) {
      hitbox.setAttribute("x", x - 4);
      hitbox.setAttribute("y", y - 6);
      hitbox.setAttribute("width", width + 8);
      hitbox.setAttribute("height", height + 12);
    }

    if (leftHandle) {
      leftHandle.setAttribute("x", x - 7);
      leftHandle.setAttribute("y", y - 6);
      leftHandle.setAttribute("width", 14);
      leftHandle.setAttribute("height", height + 12);
    }

    if (rightHandle) {
      rightHandle.setAttribute("x", x + width - 7);
      rightHandle.setAttribute("y", y - 6);
      rightHandle.setAttribute("width", 14);
      rightHandle.setAttribute("height", height + 12);
    }

    if (topHandle) {
      topHandle.setAttribute("x", x - 4);
      topHandle.setAttribute("y", y - 7);
      topHandle.setAttribute("width", width + 8);
      topHandle.setAttribute("height", 14);
    }

    if (bottomHandle) {
      bottomHandle.setAttribute("x", x - 4);
      bottomHandle.setAttribute("y", y + height - 7);
      bottomHandle.setAttribute("width", width + 8);
      bottomHandle.setAttribute("height", 14);
    }
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

  function updateRangeAxesVisuals() {
    if (!state.svg || !state.config || !Array.isArray(state.config.axisRanges)) return;

    const stages = getStages();

    state.config.axisRanges.forEach((range, rangeIndex) => {
      const group = state.svg.querySelector(`.range-axis[data-range-index="${rangeIndex}"]`);
      if (!group) return;

      const title = group.querySelector(".range-axis-title");
      if (title) {
        title.setAttribute("x", range.titleX ?? range.lineStartX ?? 130);
        title.setAttribute("y", range.titleY ?? ((range.lineY ?? 100) - 14));
        title.textContent = range.title || "";
      }

      const axisLine = group.querySelector(`.range-axis-line[data-range-index="${rangeIndex}"]`);
      if (axisLine) {
        axisLine.setAttribute("x1", range.lineStartX ?? 130);
        axisLine.setAttribute("x2", range.lineEndX ?? 1325);
        axisLine.setAttribute("y1", range.lineY ?? 100);
        axisLine.setAttribute("y2", range.lineY ?? 100);
      }

      const axisHitbox = group.querySelector(`.range-axis-height-hitbox[data-range-index="${rangeIndex}"]`);
      if (axisHitbox) {
        axisHitbox.setAttribute("x1", range.lineStartX ?? 130);
        axisHitbox.setAttribute("x2", range.lineEndX ?? 1325);
        axisHitbox.setAttribute("y1", range.lineY ?? 100);
        axisHitbox.setAttribute("y2", range.lineY ?? 100);
        axisHitbox.setAttribute("stroke-width", Math.max(18, Number(range.lineWidth ?? 1.5) + 16));
      }

      const directionSign = range.tickDirection === "up" ? -1 : 1;
      const tickSize = range.tickSize ?? 10;
      const labelOffset = range.labelOffset ?? 12;

      (range.ticks || []).forEach((tick, tickIndex) => {
        const tickX = resolveAxisTickX(tick, stages);
        if (tickX === null) return;

        const tickLine = group.querySelector(`.range-axis-tick-line[data-range-index="${rangeIndex}"][data-tick-index="${tickIndex}"]`);
        const tickLabel = group.querySelector(`.range-axis-tick-label[data-range-index="${rangeIndex}"][data-tick-index="${tickIndex}"]`);

        if (tickLine) {
          tickLine.setAttribute("x1", tickX);
          tickLine.setAttribute("x2", tickX);
          tickLine.setAttribute("y1", range.lineY ?? 100);
          tickLine.setAttribute("y2", (range.lineY ?? 100) + (directionSign * tickSize));
        }

        if (tickLabel) {
          tickLabel.setAttribute("x", tickX);
          tickLabel.setAttribute(
            "y",
            range.tickDirection === "up"
              ? (range.lineY ?? 100) + labelOffset
              : (range.lineY ?? 100) - labelOffset
          );
          tickLabel.textContent = tick.label || "";
        }
      });
    });
  }

  function updateStageVisual(stageIndex) {
    if (!state.svg) return;

    const stage = getStage(stageIndex);
    const rect = state.svg.querySelector(`.stage-window[data-stage-index="${stageIndex}"]`);
    const hitbox = state.svg.querySelector(`.stage-hitbox[data-stage-index="${stageIndex}"]`);

    if (!stage || !rect || !hitbox) return;

    rect.setAttribute("x", stage.x);
    rect.setAttribute("y", stage.y);
    rect.setAttribute("width", stage.width);
    rect.setAttribute("height", stage.height);
    rect.setAttribute("rx", stage.rx ?? 18);
    rect.setAttribute("fill", stage.fill);
    rect.setAttribute("opacity", stage.opacity ?? 0.22);

    hitbox.setAttribute("x", stage.x);
    hitbox.setAttribute("y", stage.y);
    hitbox.setAttribute("width", stage.width);
    hitbox.setAttribute("height", stage.height);

    const labels = state.config?.windowLabels || [];
    const labelEntry = labels.find((entry) => Number(entry.stageIndex) === stageIndex);
    if (!labelEntry) return;

    const labelNode = state.svg.querySelector(`.stage-window-label[data-stage-index="${stageIndex}"]`);
    if (!labelNode) return;

    labelNode.setAttribute("x", labelEntry.x);
    labelNode.setAttribute("y", labelEntry.y);
    labelNode.setAttribute("fill", labelEntry.fill);
    labelNode.setAttribute("class", "stage-window-label");
    String(labelEntry.class || "").split(/\s+/).filter(Boolean).forEach((className) => {
      labelNode.classList.add(className);
    });
    labelNode.textContent = labelEntry.text;
  }

  function updateStageBoundaryHandles() {
    if (!state.svg) return;

    const stages = getStages();
    const bounds = getStageBounds();

    for (let boundaryIndex = 0; boundaryIndex < stages.length - 1; boundaryIndex += 1) {
      const leftStage = stages[boundaryIndex];
      const boundaryX = leftStage.x + leftStage.width;

      const line = state.svg.querySelector(`.stage-boundary-handle[data-boundary-index="${boundaryIndex}"]`);
      const hitbox = state.svg.querySelector(`.stage-boundary-hitbox[data-boundary-index="${boundaryIndex}"]`);

      if (line) {
        line.setAttribute("x1", boundaryX);
        line.setAttribute("x2", boundaryX);
        line.setAttribute("y1", bounds.top);
        line.setAttribute("y2", bounds.bottom);
      }

      if (hitbox) {
        hitbox.setAttribute("x", boundaryX - 7);
        hitbox.setAttribute("y", bounds.top);
        hitbox.setAttribute("width", 14);
        hitbox.setAttribute("height", bounds.bottom - bounds.top);
      }
    }
  }

  function getCommonValue(entries, selector) {
    if (!entries.length) return null;

    const firstValue = selector(entries[0]);
    for (let i = 1; i < entries.length; i += 1) {
      if (selector(entries[i]) !== firstValue) return null;
    }

    return firstValue;
  }

  function formatNodeLabel(entry) {
    const prefix = entry.nodeType === "human" ? "Human" : "Mouse";
    return `${prefix} ${entry.nodeIndex + 1}: ${entry.node.title} (x=${roundToThree(entry.node.x)}, y=${roundToThree(entry.node.yNode)})`;
  }

  function renderNodeSelectionVisuals() {
    if (!state.svg) return;

    state.svg.querySelectorAll(".editable-node").forEach((group) => {
      const key = group.dataset.nodeKey;
      const selected = key && state.selectedKeys.has(key);
      group.classList.toggle("is-selected", Boolean(selected));
    });
  }

  function renderBlockSelectionVisuals() {
    if (!state.svg) return;

    state.svg.querySelectorAll(".editable-range").forEach((group) => {
      const key = group.dataset.blockKey;
      group.classList.toggle("is-selected", Boolean(key && state.selectedBlockKeys.has(key)));
    });
  }

  function renderStageSelectionVisuals() {
    if (!state.svg) return;

    state.svg.querySelectorAll(".stage-window").forEach((rect) => {
      const index = Number(rect.dataset.stageIndex);
      const isSelected = Number.isInteger(index) && index === state.selectedStageIndex;
      rect.classList.toggle("is-selected", isSelected);
    });
  }

  function renderMainAxisSelectionVisuals() {
    if (!state.svg) return;
    state.svg.querySelectorAll(".main-axis-line").forEach((line) => {
      line.classList.toggle("is-selected", Boolean(state.selectedMainAxis));
    });
  }

  function renderBoundarySelectionVisuals() {
    if (!state.svg) return;

    state.svg.querySelectorAll(".stage-boundary-handle").forEach((line) => {
      const boundaryIndex = Number(line.dataset.boundaryIndex);
      line.classList.toggle("is-selected", Number.isInteger(boundaryIndex) && boundaryIndex === state.selectedBoundaryIndex);
    });
  }

  function refreshStageOptions() {
    if (!state.ui || !state.ui.createStage) return;

    const select = state.ui.createStage;
    const previous = select.value;
    select.innerHTML = "";

    getStages().forEach((stage, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `Stage ${index + 1}: ${stage.humanLabel || inferHumanLabel(stage, index)} / ${stage.mouseLabel || inferMouseLabel(stage, index)}`;
      select.appendChild(option);
    });

    if (!select.options.length) return;

    if (previous && select.querySelector(`option[value="${previous}"]`)) {
      select.value = previous;
      return;
    }

    if (Number.isInteger(state.selectedStageIndex)) {
      const selectedValue = String(state.selectedStageIndex);
      if (select.querySelector(`option[value="${selectedValue}"]`)) {
        select.value = selectedValue;
        return;
      }
    }

    select.value = "0";
  }

  function updateNodeSelectionPanel() {
    if (!state.ui || !state.ui.selectionSummary || !state.ui.selectionList) return;

    const entries = getSelectedEntries();
    const hasSelection = entries.length > 0;
    const primary = entries[0] || null;

    if (!hasSelection) {
      state.ui.selectionSummary.textContent = "No arrows selected.";
      state.ui.selectionList.textContent = "Selected arrows will appear here.";
      if (state.ui.inputX) state.ui.inputX.value = "";
      if (state.ui.inputY) state.ui.inputY.value = "";
      if (state.ui.titleText) state.ui.titleText.value = "";
      if (state.ui.ageText) state.ui.ageText.value = "";
    } else {
      const suffix = entries.length === 1 ? "arrow selected" : "arrows selected";
      state.ui.selectionSummary.textContent = `${entries.length} ${suffix}.`;
      state.ui.selectionList.textContent = entries.map(formatNodeLabel).join("\n");

      if (state.ui.inputX) state.ui.inputX.value = roundToThree(primary.node.x);
      if (state.ui.inputY) state.ui.inputY.value = roundToThree(primary.node.yNode);

      if (entries.length === 1) {
        if (state.ui.titleText) state.ui.titleText.value = primary.node.title;
        if (state.ui.ageText) state.ui.ageText.value = primary.node.ageRange;
      } else {
        if (state.ui.titleText) state.ui.titleText.value = "";
        if (state.ui.ageText) state.ui.ageText.value = "";
      }
    }

    if (state.ui.titleText) state.ui.titleText.disabled = entries.length !== 1;
    if (state.ui.ageText) state.ui.ageText.disabled = entries.length !== 1;

    const disableButtons = !hasSelection;
    if (state.ui.applyPosition) state.ui.applyPosition.disabled = disableButtons;
    if (state.ui.applyDelta) state.ui.applyDelta.disabled = disableButtons;
    if (state.ui.applyArrowStyle) state.ui.applyArrowStyle.disabled = disableButtons;
    if (state.ui.applyTextStyle) state.ui.applyTextStyle.disabled = disableButtons;
    if (state.ui.removeSelected) state.ui.removeSelected.disabled = disableButtons;

    const commonStroke = hasSelection
      ? getCommonValue(entries, (entry) => entry.node.stroke)
      : null;
    if (state.ui.stroke) state.ui.stroke.value = commonStroke || "";

    const commonStrokeWidth = hasSelection
      ? getCommonValue(entries, (entry) => entry.node.strokeWidth ?? state.config.nodes.connectorStrokeWidth)
      : null;
    if (state.ui.strokeWidth) state.ui.strokeWidth.value = commonStrokeWidth ?? "";

    const commonMarkerId = hasSelection
      ? getCommonValue(entries, (entry) => getNodeMarkerId(entry.nodeType, entry.node))
      : null;

    if (state.ui.markerId && commonMarkerId) {
      state.ui.markerId.value = commonMarkerId;
    } else if (state.ui.markerId && hasSelection) {
      state.ui.markerId.value = getNodeMarkerId(primary.nodeType, primary.node);
    }

    if (state.ui.markerId) {
      updateMarkerFields(state.ui.markerId.value);
    }

    const commonTitleFill = hasSelection
      ? getCommonValue(entries, (entry) => entry.node.titleFill || "")
      : null;
    const commonAgeFill = hasSelection
      ? getCommonValue(entries, (entry) => entry.node.ageFill || "")
      : null;
    const commonTitleSize = hasSelection
      ? getCommonValue(entries, (entry) => entry.node.titleFontSize ?? "")
      : null;
    const commonAgeSize = hasSelection
      ? getCommonValue(entries, (entry) => entry.node.ageFontSize ?? "")
      : null;

    if (state.ui.titleFill) state.ui.titleFill.value = commonTitleFill ?? "";
    if (state.ui.ageFill) state.ui.ageFill.value = commonAgeFill ?? "";
    if (state.ui.titleSize) state.ui.titleSize.value = commonTitleSize ?? "";
    if (state.ui.ageSize) state.ui.ageSize.value = commonAgeSize ?? "";
  }

  function updateStagePanel() {
    if (!state.ui || !state.ui.stageSummary) return;

    const stage = getStage(state.selectedStageIndex);
    if (!stage) {
      state.ui.stageSummary.textContent = "No developmental stage selected.";
      if (state.ui.stageEdit) state.ui.stageEdit.disabled = true;
      if (state.ui.stageRemove) state.ui.stageRemove.disabled = true;
      return;
    }

    const label = `${stage.humanLabel || "-"} / ${stage.mouseLabel || "-"}`;
    state.ui.stageSummary.textContent = `Selected stage ${state.selectedStageIndex + 1}: ${label} (x=${roundToThree(stage.x)}, width=${roundToThree(stage.width)})`;
    if (state.ui.stageEdit) state.ui.stageEdit.disabled = false;
    if (state.ui.stageRemove) state.ui.stageRemove.disabled = getStages().length <= 1;
  }

  function renderSelectionState() {
    renderNodeSelectionVisuals();
    renderBlockSelectionVisuals();
    renderStageSelectionVisuals();
    renderMainAxisSelectionVisuals();
    renderBoundarySelectionVisuals();
    updateNodeSelectionPanel();
    updateStagePanel();
      if (state.ui?.toolbarGroup) {
        state.ui.toolbarGroup.disabled = getSelectedGroupMembers().length < 2;
      }
  }

  function setSelection(keys) {
    state.selectedBlockKeys.clear();
    state.selectedBlockKey = null;
    state.selectedStageIndex = null;
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    state.selectedKeys = new Set(keys);
    renderSelectionState();
    renderInspector();
  }

  function clearAllSelections() {
    state.selectedKeys.clear();
    state.selectedBlockKeys.clear();
    state.selectedBlockKey = null;
    state.selectedStageIndex = null;
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    renderSelectionState();
    renderInspector();
  }

  function setSelectedStage(index) {
    state.selectedBlockKeys.clear();
    state.selectedBlockKey = null;
    state.selectedKeys.clear();
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    if (!Number.isInteger(index) || !getStage(index)) {
      state.selectedStageIndex = null;
    } else {
      state.selectedStageIndex = index;
      if (state.ui && state.ui.createStage) {
        state.ui.createStage.value = String(index);
      }
    }

    renderSelectionState();
    renderInspector();
  }

  function toggleSelection(key) {
    if (!key) return;

    if (state.selectedKeys.has(key)) {
      state.selectedKeys.delete(key);
    } else {
      state.selectedKeys.add(key);
    }

    renderSelectionState();
    renderInspector();
  }

  function setSelectedBlock(blockKey) {
    state.selectedKeys.clear();
    state.selectedStageIndex = null;
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    state.selectedBlockKey = blockKey;
    state.selectedBlockKeys = blockKey ? new Set([blockKey]) : new Set();
    renderSelectionState();
    renderInspector();
  }

  function toggleBlockSelection(blockKey) {
    if (!blockKey) return;

    if (state.selectedBlockKeys.has(blockKey)) {
      state.selectedBlockKeys.delete(blockKey);
      if (state.selectedBlockKey === blockKey) {
        state.selectedBlockKey = state.selectedBlockKeys.values().next().value || null;
      }
    } else {
      state.selectedBlockKeys.add(blockKey);
      state.selectedBlockKey = blockKey;
    }

    state.selectedStageIndex = null;
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    renderSelectionState();
    renderInspector();
  }

  function setSelectedBoundary(boundaryIndex) {
    state.selectedKeys.clear();
    state.selectedBlockKeys.clear();
    state.selectedBlockKey = null;
    state.selectedMainAxis = false;
    state.selectedBoundaryIndex = Number.isInteger(boundaryIndex) ? boundaryIndex : null;
    state.selectedStageIndex = null;
    renderSelectionState();
    renderInspector();
  }

  function getArrowConfigById(markerId) {
    if (!state.config || !state.config.arrows) return null;

    const values = Object.values(state.config.arrows);
    for (let i = 0; i < values.length; i += 1) {
      if (values[i].id === markerId) return values[i];
    }

    return null;
  }

  function updateMarkerFields(markerId) {
    const marker = getArrowConfigById(markerId);
    if (!marker || !state.ui?.markerWidth) return;

    state.ui.markerWidth.value = marker.markerWidth;
    state.ui.markerHeight.value = marker.markerHeight;
    state.ui.markerRefX.value = marker.refX;
    state.ui.markerRefY.value = marker.refY;
    state.ui.markerFill.value = marker.fill || "";
  }

  function applyMarkerVisualUpdate(markerId) {
    if (!state.svg) return;

    const markerConfig = getArrowConfigById(markerId);
    if (!markerConfig) return;

    const markerElement = state.svg.querySelector(`marker[id="${markerId}"]`);
    if (!markerElement) return;

    markerElement.setAttribute("markerWidth", markerConfig.markerWidth);
    markerElement.setAttribute("markerHeight", markerConfig.markerHeight);
    markerElement.setAttribute("refX", markerConfig.refX);
    markerElement.setAttribute("refY", markerConfig.refY);

    let pathElement = markerElement.querySelector("path");
    if (!pathElement) {
      pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
      markerElement.appendChild(pathElement);
    }

    pathElement.setAttribute(
      "d",
      markerConfig.path || buildArrowPath(markerConfig.markerWidth, markerConfig.markerHeight)
    );
    pathElement.setAttribute("fill", markerConfig.fill);
  }

  function markerIdFromUrl(value, fallback) {
    const match = String(value || "").match(/#([^)]+)/);
    return match ? match[1] : fallback;
  }

  function getMainAxisMarkerId() {
    return markerIdFromUrl(state.config?.mainAxis?.markerEnd, "mainArrow");
  }

  function updateMainAxisVisual() {
    if (!state.svg || !state.config?.mainAxis) return;

    const axis = state.config.mainAxis;
    const line = state.svg.querySelector(".main-axis-line");
    const hitbox = state.svg.querySelector(".main-axis-hitbox");

    if (line) {
      line.setAttribute("x1", axis.x1);
      line.setAttribute("x2", axis.x2);
      line.setAttribute("y1", axis.y);
      line.setAttribute("y2", axis.y);
      line.setAttribute("stroke", axis.stroke);
      line.setAttribute("stroke-width", axis.strokeWidth);
      line.setAttribute("stroke-linecap", axis.strokeLinecap || "round");
      line.setAttribute("marker-end", axis.markerEnd || "url(#mainArrow)");
    }

    if (hitbox) {
      hitbox.setAttribute("x1", axis.x1);
      hitbox.setAttribute("x2", axis.x2);
      hitbox.setAttribute("y1", axis.y);
      hitbox.setAttribute("y2", axis.y);
      hitbox.setAttribute("stroke-width", Math.max(18, Number(axis.strokeWidth || 5) + 14));
    }
  }

  function applyMovement(dx, dy, statusMessage) {
    const entries = getSelectedEntries();
    if (!entries.length) {
      createStatus("Select at least one arrow first.", true);
      return;
    }

    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      createStatus("Invalid movement values.", true);
      return;
    }

    entries.forEach((entry) => {
      entry.node.x = roundToThree(entry.node.x + dx);
      entry.node.yNode = roundToThree(entry.node.yNode + dy);
      updateNodeVisual(entry.nodeType, entry.nodeIndex);
    });

    updateNodeSelectionPanel();
    renderInspector();
    createStatus(statusMessage);
  }

  function onApplyExactPosition() {
    const primary = getPrimarySelection();
    if (!primary) {
      createStatus("Select an arrow first.", true);
      return;
    }

    const x = toNumber(state.ui.inputX.value);
    const y = toNumber(state.ui.inputY.value);

    if (x === null || y === null) {
      createStatus("Exact X and Y must be valid numbers.", true);
      return;
    }

    applyMovement(x - primary.node.x, y - primary.node.yNode, "Applied exact position to selection.");
  }

  function onApplyDeltaMove() {
    const dx = toNumber(state.ui.inputDX.value) ?? 0;
    const dy = toNumber(state.ui.inputDY.value) ?? 0;
    applyMovement(dx, dy, "Moved selection by delta.");
  }

  function onApplyArrowStyle() {
    const entries = getSelectedEntries();
    if (!entries.length) {
      createStatus("Select at least one arrow first.", true);
      return;
    }

    const stroke = state.ui.stroke.value.trim();
    const strokeWidth = toNumber(state.ui.strokeWidth.value);
    const markerId = state.ui.markerId.value;

    entries.forEach((entry) => {
      if (stroke) entry.node.stroke = stroke;
      if (strokeWidth !== null && strokeWidth > 0) entry.node.strokeWidth = strokeWidth;
      if (markerId) entry.node.markerId = markerId;
      updateNodeVisual(entry.nodeType, entry.nodeIndex);
    });

    renderInspector();
    createStatus("Applied arrow style to selection.");
  }

  function onApplyMarkerStyle() {
    const markerId = state.ui.markerId.value;
    const markerConfig = getArrowConfigById(markerId);

    if (!markerConfig) {
      createStatus("Choose a valid arrowhead preset.", true);
      return;
    }

    const markerWidth = toNumber(state.ui.markerWidth.value);
    const markerHeight = toNumber(state.ui.markerHeight.value);
    const markerRefX = toNumber(state.ui.markerRefX.value);
    const markerRefY = toNumber(state.ui.markerRefY.value);
    const markerFill = state.ui.markerFill.value.trim();

    if (markerWidth !== null && markerWidth > 0) markerConfig.markerWidth = markerWidth;
    if (markerHeight !== null && markerHeight > 0) markerConfig.markerHeight = markerHeight;
    if (markerRefX !== null && markerRefX >= 0) markerConfig.refX = markerRefX;
    if (markerRefY !== null && markerRefY >= 0) markerConfig.refY = markerRefY;
    if (markerFill) markerConfig.fill = markerFill;

    markerConfig.path = buildArrowPath(markerConfig.markerWidth, markerConfig.markerHeight);

    applyMarkerVisualUpdate(markerId);
    createStatus(`Updated arrowhead style for ${markerId}.`);
  }

  function onApplyTextStyle() {
    const entries = getSelectedEntries();
    if (!entries.length) {
      createStatus("Select at least one arrow first.", true);
      return;
    }

    const titleFill = state.ui.titleFill.value.trim();
    const ageFill = state.ui.ageFill.value.trim();
    const titleSize = toNumber(state.ui.titleSize.value);
    const ageSize = toNumber(state.ui.ageSize.value);

    if (entries.length === 1) {
      const entry = entries[0];
      if (state.ui.titleText.value !== "") entry.node.title = state.ui.titleText.value;
      if (state.ui.ageText.value !== "") entry.node.ageRange = state.ui.ageText.value;
    }

    entries.forEach((entry) => {
      if (titleFill) entry.node.titleFill = titleFill;
      if (ageFill) entry.node.ageFill = ageFill;
      if (titleSize !== null && titleSize > 0) entry.node.titleFontSize = titleSize;
      if (ageSize !== null && ageSize > 0) entry.node.ageFontSize = ageSize;
      updateNodeVisual(entry.nodeType, entry.nodeIndex);
    });

    updateNodeSelectionPanel();
    renderInspector();
    createStatus("Applied text style to selection.");
  }

  function getDefaultNodeY(nodeType) {
    const collection = getNodeCollection(nodeType) || [];
    if (collection.length > 0) {
      const average = collection.reduce((sum, node) => sum + (node.yNode || 0), 0) / collection.length;
      return roundToThree(average);
    }

    return nodeType === "human" ? 220 : 570;
  }

  function getDefaultAxisY(nodeType) {
    const collection = getNodeCollection(nodeType) || [];
    if (collection.length > 0) {
      return roundToThree(collection[0].yAxis);
    }

    const mainAxisY = state.config?.mainAxis?.y ?? 440;
    return nodeType === "human" ? mainAxisY - 13 : mainAxisY + 13;
  }

  function getMinimumBlockHeight() {
    const blocks = state.config?.blocks || {};
    const titleOffset = Number(blocks.titleInsideOffsetY ?? 14);
    const ageOffset = Number(blocks.ageInsideOffsetY ?? 28);
    return Math.max(40, titleOffset + 22, ageOffset + 12);
  }

  function getNormalizedBlockHeight(value) {
    const numericValue = toNumber(value);
    const fallback = toNumber(state.config?.blocks?.defaultHeight) ?? getMinimumBlockHeight();
    return roundToThree(Math.max(numericValue ?? fallback, getMinimumBlockHeight()));
  }

  function getDefaultBlockY(blockType, stage) {
    const mainAxisY = Number(state.config?.mainAxis?.y ?? 385);
    const stageY = Number(stage?.y ?? 105);
    const stageHeight = Number(stage?.height ?? 535);
    const blockHeight = getMinimumBlockHeight();
    const stageBottom = stageY + stageHeight;

    if (blockType === "human") {
      return roundToThree(clamp(stageY + 90, stageY + 14, mainAxisY - blockHeight - 24));
    }

    return roundToThree(clamp(mainAxisY + 70, mainAxisY + 24, stageBottom - blockHeight - 14));
  }

  function addArrowWithValues(values) {
    const nodeType = values.nodeType === "mouse" ? "mouse" : "human";
    const stageIndex = Number(values.stageIndex);
    const stage = getStage(stageIndex) || getStage(0);

    if (!stage) {
      createStatus("No stage available to place a new arrow.", true);
      return false;
    }

    const defaultX = stage.x + stage.width / 2;
    const rangeIndex = nodeType === "mouse" ? 1 : 0;
    const xInput = resolveTimelineInputToX(values.x, rangeIndex, defaultX);
    const yInput = toNumber(values.y);

    const node = {
      x: roundToThree(xInput),
      yNode: roundToThree(yInput ?? getDefaultNodeY(nodeType)),
      yAxis: getDefaultAxisY(nodeType),
      title: (values.title || "").trim() || `New ${nodeType} milestone`,
      ageRange: (values.ageRange || "").trim() || "Edit age",
      stroke: nodeType === "human" ? "var(--human)" : "var(--mouse)",
      titleFontSize: getDefaultNodeTitleFontSize(),
      ageFontSize: getDefaultNodeAgeFontSize(),
    };

    const collection = getNodeCollection(nodeType);
    if (!collection) {
      createStatus("Could not resolve arrow collection.", true);
      return false;
    }

    collection.push(node);
    state.pendingNodeSelectionKeys = [`${nodeType}:${collection.length - 1}`];

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
      createStatus("Added new arrow.");
    }

    return true;
  }

  function onAddArrow(values) {
    if (values && typeof values === "object" && !(values instanceof Event)) {
      return addArrowWithValues(values);
    }

    if (!state.ui?.createType || !state.ui?.createStage) {
      createStatus("Use Add in Timeline Settings Table to create arrows.", true);
      return false;
    }

    return addArrowWithValues({
      nodeType: state.ui.createType.value,
      stageIndex: state.ui.createStage.value,
      title: state.ui.createTitle?.value,
      ageRange: state.ui.createAge?.value,
      x: state.ui.createX?.value,
      y: state.ui.createY?.value,
    });
  }

  function addRangeBlockWithValues(values) {
    const blockType = values.blockType === "mouse" ? "mouse" : "human";
    const stageIndex = Number(values.stageIndex);
    const stage = getStage(stageIndex) || getStage(0);
    if (!stage) {
      createStatus("No stage available to place a range block.", true);
      return false;
    }

    const yDefault = getDefaultBlockY(blockType, stage);
    const defaultStart = stage.x + (stage.width * 0.2);
    const defaultEnd = stage.x + (stage.width * 0.8);
    const rangeIndex = blockType === "mouse" ? 1 : 0;
    const xStart = resolveTimelineInputToX(values.xStart, rangeIndex, defaultStart);
    const xEnd = resolveTimelineInputToX(values.xEnd, rangeIndex, defaultEnd);
    const y = toNumber(values.y);
    const height = toNumber(values.height);

    const block = {
      xStart: roundToThree(xStart),
      xEnd: roundToThree(xEnd),
      y: roundToThree(y ?? yDefault),
      height: getNormalizedBlockHeight(height),
      title: (values.title || "").trim() || `New ${blockType} range`,
      ageRange: (values.ageRange || "").trim() || "range",
      fill: blockType === "human" ? "var(--human-soft)" : "var(--mouse-soft)",
      stroke: blockType === "human" ? "var(--human)" : "var(--mouse)",
      titleFontSize: getDefaultBlockTitleFontSize(),
      ageFontSize: getDefaultBlockAgeFontSize(),
    };

    const collection = getBlockCollection(blockType);
    if (!collection) {
      createStatus("Could not resolve range block collection.", true);
      return false;
    }

    collection.push(block);
    setSelectedBlock(`${blockType}:${collection.length - 1}`);

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
      createStatus("Added new range block.");
    }

    return true;
  }

  function onRemoveSelectedArrows(skipConfirm = false) {
    const entries = getSelectedEntries();
    if (!entries.length) {
      createStatus("Select at least one arrow to remove.", true);
      return;
    }

    if (!skipConfirm) {
      const confirmed = window.confirm(`Remove ${entries.length} selected arrow(s)?`);
      if (!confirmed) return;
    }

    const grouped = {
      human: [],
      mouse: [],
    };

    entries.forEach((entry) => {
      grouped[entry.nodeType].push(entry.nodeIndex);
    });

    Object.keys(grouped).forEach((type) => {
      grouped[type].sort((a, b) => b - a);
      const collection = getNodeCollection(type);
      if (!collection) return;
      grouped[type].forEach((index) => {
        collection.splice(index, 1);
      });
    });

    state.selectedKeys.clear();
    state.pendingNodeSelectionKeys = [];

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
      createStatus("Removed selected arrows.");
    }
  }

  function getStageBoundaryX(boundaryIndex) {
    const leftStage = getStage(boundaryIndex);
    if (!leftStage) return null;
    return leftStage.x + leftStage.width;
  }

  function captureBoundarySnapshot(boundaryIndex) {
    const leftStage = getStage(boundaryIndex);
    const rightStage = getStage(boundaryIndex + 1);
    if (!leftStage || !rightStage) return null;

    const snapshot = {
      leftX: leftStage.x,
      leftWidth: leftStage.width,
      rightX: rightStage.x,
      rightWidth: rightStage.width,
      rightEdge: rightStage.x + rightStage.width,
      nodeMappings: [],
      blockMappings: [],
    };

    const allEntries = getAllNodeEntries();
    allEntries.forEach((entry) => {
      const x = entry.node.x;

      if (snapshot.leftWidth > EPSILON && x >= snapshot.leftX - EPSILON && x <= (snapshot.leftX + snapshot.leftWidth + EPSILON)) {
        const fraction = clamp((x - snapshot.leftX) / snapshot.leftWidth, 0, 1);
        snapshot.nodeMappings.push({
          nodeType: entry.nodeType,
          nodeIndex: entry.nodeIndex,
          side: "left",
          fraction,
        });
        return;
      }

      if (snapshot.rightWidth > EPSILON && x >= snapshot.rightX - EPSILON && x <= snapshot.rightEdge + EPSILON) {
        const fraction = clamp((x - snapshot.rightX) / snapshot.rightWidth, 0, 1);
        snapshot.nodeMappings.push({
          nodeType: entry.nodeType,
          nodeIndex: entry.nodeIndex,
          side: "right",
          fraction,
        });
      }
    });

    getAllBlockEntries().forEach((entry) => {
      ["xStart", "xEnd"].forEach((field) => {
        const x = Number(entry.block[field]);
        if (!Number.isFinite(x)) return;

        if (snapshot.leftWidth > EPSILON && x >= snapshot.leftX - EPSILON && x <= (snapshot.leftX + snapshot.leftWidth + EPSILON)) {
          snapshot.blockMappings.push({
            blockType: entry.blockType,
            blockIndex: entry.blockIndex,
            field,
            side: "left",
            fraction: clamp((x - snapshot.leftX) / snapshot.leftWidth, 0, 1),
          });
          return;
        }

        if (snapshot.rightWidth > EPSILON && x >= snapshot.rightX - EPSILON && x <= snapshot.rightEdge + EPSILON) {
          snapshot.blockMappings.push({
            blockType: entry.blockType,
            blockIndex: entry.blockIndex,
            field,
            side: "right",
            fraction: clamp((x - snapshot.rightX) / snapshot.rightWidth, 0, 1),
          });
        }
      });
    });

    return snapshot;
  }

  function applyBoundaryMoveFromSnapshot(boundaryIndex, requestedX, snapshot) {
    const leftStage = getStage(boundaryIndex);
    const rightStage = getStage(boundaryIndex + 1);

    if (!leftStage || !rightStage || !snapshot) return false;

    const minWidth = getStageMinWidth();
    const minX = snapshot.leftX + minWidth;
    const maxX = snapshot.rightEdge - minWidth;
    const newBoundaryX = roundToThree(clamp(requestedX, minX, maxX));
    const currentBoundary = leftStage.x + leftStage.width;

    if (Math.abs(newBoundaryX - currentBoundary) < EPSILON) return false;

    leftStage.x = roundToThree(snapshot.leftX);
    leftStage.width = roundToThree(newBoundaryX - snapshot.leftX);

    rightStage.x = roundToThree(newBoundaryX);
    rightStage.width = roundToThree(snapshot.rightEdge - newBoundaryX);

    snapshot.nodeMappings.forEach((mapping) => {
      const node = getNode(mapping.nodeType, mapping.nodeIndex);
      if (!node) return;

      if (mapping.side === "left") {
        node.x = roundToThree(leftStage.x + (mapping.fraction * leftStage.width));
      } else {
        node.x = roundToThree(rightStage.x + (mapping.fraction * rightStage.width));
      }

      updateNodeVisual(mapping.nodeType, mapping.nodeIndex);
    });

    const touchedBlocks = new Set();
    snapshot.blockMappings.forEach((mapping) => {
      const block = getBlock(mapping.blockType, mapping.blockIndex);
      if (!block) return;

      if (mapping.side === "left") {
        block[mapping.field] = roundToThree(leftStage.x + (mapping.fraction * leftStage.width));
      } else {
        block[mapping.field] = roundToThree(rightStage.x + (mapping.fraction * rightStage.width));
      }

      touchedBlocks.add(`${mapping.blockType}:${mapping.blockIndex}`);
    });

    touchedBlocks.forEach((key) => {
      const parsed = parseBlockKey(key);
      if (parsed) updateBlockVisual(parsed.blockType, parsed.blockIndex);
    });

    syncWindowLabelsFromStages();
    updateStageVisual(boundaryIndex);
    updateStageVisual(boundaryIndex + 1);
    updateStageBoundaryHandles();
    updateRangeAxesVisuals();
    updateNodeSelectionPanel();
    updateStagePanel();
    refreshTimelineLegend();

    return true;
  }

  function removeArrowAt(nodeType, nodeIndex, skipConfirm = false) {
    const collection = getNodeCollection(nodeType);
    if (!collection || !collection[nodeIndex]) return false;

    if (!skipConfirm) {
      const confirmed = window.confirm("Remove this arrow?");
      if (!confirmed) return false;
    }

    collection.splice(nodeIndex, 1);
    updateGroupsAfterRemoval("arrow", nodeType, nodeIndex);
    state.pendingNodeSelectionKeys = [];
    state.selectedKeys.clear();

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    createStatus("Removed arrow.");
    return true;
  }

  function duplicateArrowAt(nodeType, nodeIndex) {
    const collection = getNodeCollection(nodeType);
    const node = getNode(nodeType, nodeIndex);
    if (!collection || !node) return false;

    const clone = deepClone(node);
    clone.x = roundToThree(Number(clone.x || 0) + 24);
    clone.yNode = roundToThree(Number(clone.yNode || 0) + 24);
    clone.title = `${clone.title || "Milestone"} copy`;
    collection.splice(nodeIndex + 1, 0, clone);
    state.pendingNodeSelectionKeys = [`${nodeType}:${nodeIndex + 1}`];

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    createStatus("Duplicated arrow.");
    return true;
  }

  function removeBlockAt(blockType, blockIndex, skipConfirm = false) {
    const collection = getBlockCollection(blockType);
    if (!collection || !collection[blockIndex]) return false;

    if (!skipConfirm) {
      const confirmed = window.confirm("Remove this range block?");
      if (!confirmed) return false;
    }

    collection.splice(blockIndex, 1);
    updateGroupsAfterRemoval("block", blockType, blockIndex);
    state.selectedBlockKey = null;
    state.selectedBlockKeys.clear();

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    createStatus("Removed range block.");
    return true;
  }

  function duplicateBlockAt(blockType, blockIndex) {
    const collection = getBlockCollection(blockType);
    const block = getBlock(blockType, blockIndex);
    if (!collection || !block) return false;

    const clone = deepClone(block);
    clone.xStart = roundToThree(Number(clone.xStart || 0) + 24);
    clone.xEnd = roundToThree(Number(clone.xEnd || 0) + 24);
    clone.y = roundToThree(Number(clone.y || 0) + 24);
    clone.title = `${clone.title || "Range"} copy`;
    collection.splice(blockIndex + 1, 0, clone);
    setSelectedBlock(`${blockType}:${blockIndex + 1}`);

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    createStatus("Duplicated range block.");
    return true;
  }

  function removeSelectedBlocks(skipConfirm = false) {
    const selectedKeys = Array.from(state.selectedBlockKeys);
    if (!selectedKeys.length) {
      createStatus("Select at least one range block to remove.", true);
      return false;
    }

    if (!skipConfirm) {
      const confirmed = window.confirm(`Remove ${selectedKeys.length} selected range block(s)?`);
      if (!confirmed) return false;
    }

    const grouped = {
      human: [],
      mouse: [],
    };

    selectedKeys.forEach((key) => {
      const parsed = parseBlockKey(key);
      if (!parsed) return;
      grouped[parsed.blockType].push(parsed.blockIndex);
    });

    Object.keys(grouped).forEach((blockType) => {
      const collection = getBlockCollection(blockType);
      if (!collection) return;
      grouped[blockType].sort((a, b) => b - a).forEach((blockIndex) => {
        collection.splice(blockIndex, 1);
      });
    });

    state.selectedBlockKey = null;
    state.selectedBlockKeys.clear();

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    createStatus("Removed selected range blocks.");
    return true;
  }

  function setBoundaryDraggingClass(boundaryIndex, dragging) {
    if (!state.svg) return;

    const line = state.svg.querySelector(`.stage-boundary-handle[data-boundary-index="${boundaryIndex}"]`);
    if (!line) return;

    line.classList.toggle("is-dragging", Boolean(dragging));
  }

  function beginStageDrag(pointerEvent, boundaryIndex) {
    const startPoint = toSvgPoint(pointerEvent.clientX, pointerEvent.clientY);
    const startBoundaryX = getStageBoundaryX(boundaryIndex);
    const snapshot = captureBoundarySnapshot(boundaryIndex);

    if (!startPoint || startBoundaryX === null || !snapshot) return;

    state.stageDrag = {
      pointerId: pointerEvent.pointerId,
      boundaryIndex,
      startPoint,
      startBoundaryX,
      snapshot,
      moved: false,
    };

    setBoundaryDraggingClass(boundaryIndex, true);

    if (state.svg && typeof state.svg.setPointerCapture === "function") {
      state.svg.setPointerCapture(pointerEvent.pointerId);
    }
  }

  function finishStageDrag() {
    if (!state.stageDrag) return;

    setBoundaryDraggingClass(state.stageDrag.boundaryIndex, false);

    if (state.stageDrag.moved) {
      createStatus("Adjusted developmental stage boundary and remapped arrows in affected stages.");
      renderInspector();
      recordHistory("Adjusted stage boundary");
    }

    state.stageDrag = null;
  }

  function beginYScaleDrag(pointerEvent, edge) {
    const startPoint = toSvgPoint(pointerEvent.clientX, pointerEvent.clientY);
    if (!startPoint || (edge !== "top" && edge !== "bottom")) return;

    state.yScaleDrag = {
      pointerId: pointerEvent.pointerId,
      edge,
      startPoint,
      snapshot: snapshotVerticalLayout(),
      moved: false,
    };

    state.svg?.classList.add("is-scaling-y");

    if (state.svg && typeof state.svg.setPointerCapture === "function") {
      state.svg.setPointerCapture(pointerEvent.pointerId);
    }
  }

  function finishYScaleDrag() {
    if (!state.yScaleDrag) return;

    state.svg?.classList.remove("is-scaling-y");

    if (state.yScaleDrag.moved) {
      createStatus("Adjusted figure height.");
      renderInspector();
      recordHistory("Adjusted figure height");
      if (typeof window.initializeTimeline === "function") {
        window.initializeTimeline();
      }
    }

    clearDragReadout();
    state.yScaleDrag = null;
  }

  function addStageBySplitValues(baseStageIndex, values) {
    const selectedStage = getStage(baseStageIndex);
    if (!selectedStage) {
      createStatus("Select a developmental stage first.", true);
      return false;
    }

    const minWidth = getStageMinWidth();
    if (selectedStage.width < (minWidth * 2)) {
      createStatus("Selected stage is too small to split.", true);
      return false;
    }

    const opacity = toNumber(values.opacity);
    const splitPercent = toNumber(values.splitPercent);

    if (opacity === null || splitPercent === null) {
      createStatus("Opacity and split percent must be valid numbers.", true);
      return false;
    }

    const safeOpacity = clamp(opacity, 0, 1);
    const safeSplitPercent = clamp(splitPercent, 20, 80);
    const splitX = selectedStage.x + (selectedStage.width * (safeSplitPercent / 100));
    const leftWidth = roundToThree(splitX - selectedStage.x);
    const rightWidth = roundToThree(selectedStage.width - leftWidth);

    if (leftWidth < minWidth || rightWidth < minWidth) {
      createStatus("Split results in too small stage widths.", true);
      return false;
    }

    selectedStage.width = leftWidth;

    const newStage = {
      x: roundToThree(selectedStage.x + leftWidth),
      y: selectedStage.y,
      width: rightWidth,
      height: selectedStage.height,
      rx: selectedStage.rx,
      fill: values.fill?.trim() || selectedStage.fill,
      opacity: safeOpacity,
      label: "",
      stageName: values.stageName?.trim() || `Stage ${baseStageIndex + 2}`,
      humanLabel: values.humanLabel?.trim() || `Human stage ${baseStageIndex + 2}`,
      mouseLabel: values.mouseLabel?.trim() || `Mouse stage ${baseStageIndex + 2}`,
    };

    const stages = getStages();
    stages.splice(baseStageIndex + 1, 0, newStage);

    insertAxisTick(baseStageIndex + 1, values.humanBoundaryAge?.trim(), values.mouseBoundaryAge?.trim());
    syncWindowLabelsFromStages();
    state.pendingStageSelectionIndex = baseStageIndex + 1;

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    return true;
  }

  function onAddStagePopup(anchorEvent) {
    const selectedStage = getStage(state.selectedStageIndex);
    if (!selectedStage) {
      createStatus("Select a developmental stage first.", true);
      return;
    }

    const minWidth = getStageMinWidth();
    if (selectedStage.width < (minWidth * 2)) {
      createStatus("Selected stage is too small to split.", true);
      return;
    }

    openFloatingEditor({
      title: "Add stage by splitting selected",
      fields: [
        { name: "stageName", label: "Stage name", type: "text" },
        { name: "humanLabel", label: "Human label", type: "text" },
        { name: "mouseLabel", label: "Mouse label", type: "text" },
        { name: "humanBoundaryAge", label: "Human age at new boundary", type: "text" },
        { name: "mouseBoundaryAge", label: "Mouse age at new boundary", type: "text" },
        { name: "fill", label: "Fill", type: "text" },
        { name: "opacity", label: "Opacity", type: "number", min: 0, max: 1, step: 0.01 },
        { name: "splitPercent", label: "Split percent (20-80)", type: "number", min: 20, max: 80, step: 1 },
      ],
      values: {
        stageName: `${selectedStage.stageName || inferStageName(selectedStage, state.selectedStageIndex)} (new)`,
        humanLabel: `${selectedStage.humanLabel || "Human stage"} (new)`,
        mouseLabel: `${selectedStage.mouseLabel || "Mouse stage"} (new)`,
        humanBoundaryAge: "new",
        mouseBoundaryAge: "new",
        fill: selectedStage.fill || "var(--window-3)",
        opacity: String(selectedStage.opacity ?? 0.22),
        splitPercent: "50",
      },
      anchorPoint: eventToViewportPoint(anchorEvent),
      saveLabel: "Add stage",
      onSave: (values) => addStageBySplitValues(state.selectedStageIndex, values),
    });
  }

  function removeStageAt(stageIndex) {
    const stages = getStages();
    const selectedStage = getStage(stageIndex);

    if (!selectedStage) {
      createStatus("Select a developmental stage first.", true);
      return false;
    }

    if (stages.length <= 1) {
      createStatus("At least one stage must remain.", true);
      return false;
    }

    const confirmLabel = `${selectedStage.humanLabel || "?"} / ${selectedStage.mouseLabel || "?"}`;
    const confirmed = window.confirm(`Remove stage "${confirmLabel}"?`);
    if (!confirmed) return false;

    let nextSelected = 0;

    if (stageIndex === 0) {
      const right = stages[1];
      right.x = selectedStage.x;
      right.width = roundToThree(right.width + selectedStage.width);
      stages.splice(0, 1);
      removeAxisTick(1);
      nextSelected = 0;
    } else {
      const left = stages[stageIndex - 1];
      left.width = roundToThree(left.width + selectedStage.width);
      stages.splice(stageIndex, 1);
      removeAxisTick(stageIndex);
      nextSelected = stageIndex - 1;
    }

    syncAxisTicksWithStages();
    syncWindowLabelsFromStages();
    state.pendingStageSelectionIndex = clamp(nextSelected, 0, stages.length - 1);

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    return true;
  }

  function onRemoveStagePopup() {
    removeStageAt(state.selectedStageIndex);
  }

  function addAdjacentStage(stageIndex, side, values = {}) {
    const stage = getStage(stageIndex);
    if (!stage) {
      createStatus("Select a developmental stage first.", true);
      return false;
    }

    const minWidth = getStageMinWidth();
    if (stage.width < minWidth * 2) {
      createStatus("Selected stage is too small to split.", true);
      return false;
    }

    const newWidth = roundToThree(stage.width / 2);
    const remainingWidth = roundToThree(stage.width - newWidth);
    const newStage = {
      x: side === "left" ? stage.x : roundToThree(stage.x + remainingWidth),
      y: stage.y,
      width: newWidth,
      height: stage.height,
      rx: stage.rx,
      fill: stage.fill,
      opacity: stage.opacity ?? 0.22,
      label: "",
      stageName: values.stageName?.trim() || "New stage",
      humanLabel: values.humanLabel?.trim() || "New stage",
      mouseLabel: values.mouseLabel?.trim() || "New stage",
    };

    const edgeIndex = stageIndex + 1;
    if (side === "left") {
      stage.x = roundToThree(stage.x + newWidth);
      stage.width = remainingWidth;
      getStages().splice(stageIndex, 0, newStage);
      state.pendingStageSelectionIndex = stageIndex;
    } else {
      stage.width = remainingWidth;
      getStages().splice(stageIndex + 1, 0, newStage);
      state.pendingStageSelectionIndex = stageIndex + 1;
    }

    insertAxisTick(edgeIndex, values.humanBoundaryAge?.trim(), values.mouseBoundaryAge?.trim());
    syncWindowLabelsFromStages();
    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    createStatus(`Added stage to the ${side}.`);
    return true;
  }

  function openAdjacentStageEditor(stageIndex, side, anchorEvent) {
    const stage = getStage(stageIndex);
    if (!stage) return false;

    openFloatingEditor({
      title: `Add stage to ${side}`,
      fields: [
        { name: "stageName", label: "Stage name", type: "text" },
        { name: "humanLabel", label: "Human label", type: "text" },
        { name: "mouseLabel", label: "Mouse label", type: "text" },
        { name: "humanBoundaryAge", label: "Human age at new boundary", type: "text" },
        { name: "mouseBoundaryAge", label: "Mouse age at new boundary", type: "text" },
      ],
      values: {
        stageName: "New stage",
        humanLabel: "New stage",
        mouseLabel: "New stage",
        humanBoundaryAge: "new",
        mouseBoundaryAge: "new",
      },
      saveLabel: "Add stage",
      anchorPoint: eventToViewportPoint(anchorEvent),
      onSave: (values) => addAdjacentStage(stageIndex, side, values),
    });

    return false;
  }

  function getMarkerOptions(selectedMarkerId) {
    const arrows = Object.values(state.config?.arrows || {});
    if (!arrows.length) {
      return [{ value: selectedMarkerId || "", label: selectedMarkerId || "default" }];
    }

    return arrows.map((arrow) => ({
      value: arrow.id,
      label: arrow.id,
      color: arrow.fill,
    }));
  }

  function openStageSettingsEditor(stageIndex, anchorEvent) {
    const selectedStage = getStage(stageIndex);
    if (!selectedStage) {
      createStatus("Select a developmental stage first.", true);
      return;
    }

    state.selectedStageIndex = stageIndex;
    state.selectedKeys.clear();
    state.selectedBlockKeys.clear();
    state.selectedBlockKey = null;
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    renderSelectionState();

    const ageValues = getStageAgeValues(stageIndex);
    openFloatingEditor({
      title: "Edit background",
      fields: [
        { name: "stageName", label: "Stage name", type: "text" },
        { name: "humanLabel", label: "Human label", type: "text" },
        { name: "mouseLabel", label: "Mouse label", type: "text" },
        { name: "humanStartAge", label: "Human start age", type: "text" },
        { name: "humanEndAge", label: "Human end age", type: "text" },
        { name: "mouseStartAge", label: "Mouse start age", type: "text" },
        { name: "mouseEndAge", label: "Mouse end age", type: "text" },
        { name: "fill", label: "Fill", type: "text" },
        { name: "opacity", label: "Opacity", type: "number", min: 0, max: 1, step: 0.01 },
      ],
      values: {
        stageName: selectedStage.stageName || inferStageName(selectedStage, state.selectedStageIndex),
        humanLabel: selectedStage.humanLabel || inferHumanLabel(selectedStage, state.selectedStageIndex),
        mouseLabel: selectedStage.mouseLabel || inferMouseLabel(selectedStage, state.selectedStageIndex),
        ...ageValues,
        fill: selectedStage.fill || "var(--window-3)",
        opacity: String(selectedStage.opacity ?? 0.22),
      },
      anchorPoint: eventToViewportPoint(anchorEvent),
      saveLabel: "Save stage",
      extraActions: [
        {
          label: "Add stage left",
          className: "editor-btn editor-btn-ghost",
          onClick: () => openAdjacentStageEditor(stageIndex, "left", anchorEvent),
        },
        {
          label: "Add stage right",
          className: "editor-btn editor-btn-ghost",
          onClick: () => openAdjacentStageEditor(stageIndex, "right", anchorEvent),
        },
        {
          label: "Remove",
          className: "editor-btn editor-btn-danger",
          onClick: () => removeStageAt(stageIndex),
        },
      ],
      onSave: (values) => {
        const newOpacity = toNumber(values.opacity);
        if (newOpacity === null) {
          createStatus("Opacity must be a valid number.", true);
          return false;
        }

        selectedStage.stageName = values.stageName?.trim() || selectedStage.stageName;
        selectedStage.humanLabel = values.humanLabel?.trim() || selectedStage.humanLabel;
        selectedStage.mouseLabel = values.mouseLabel?.trim() || selectedStage.mouseLabel;
        selectedStage.fill = values.fill?.trim() || selectedStage.fill;
        selectedStage.opacity = clamp(newOpacity, 0, 1);
        applyStageAgeValues(stageIndex, values);

        syncWindowLabelsFromStages();
        updateStageVisual(stageIndex);
        updateStagePanel();
        renderInspector();
        refreshStageOptions();
        refreshTimelineLegend();
        createStatus("Updated selected stage.");
        return true;
      },
    });
  }

  function onEditStagePopup(anchorEvent) {
    openStageSettingsEditor(state.selectedStageIndex, anchorEvent);
  }

  function openNodeSettingsEditor(nodeType, nodeIndex, anchorEvent) {
    const node = getNode(nodeType, nodeIndex);
    if (!node) return;
    const rangeIndex = nodeType === "mouse" ? 1 : 0;

    const key = `${nodeType}:${nodeIndex}`;
    state.selectedBlockKey = null;
    state.selectedBlockKeys.clear();
    state.selectedStageIndex = null;
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    state.selectedKeys = new Set([key]);
    renderSelectionState();
    renderInspector();

    const markerId = getNodeMarkerId(nodeType, node);
    const marker = getArrowConfigById(markerId);

    openFloatingEditor({
      title: "Edit arrow",
      fields: [
        { name: "title", label: "Text", type: "text" },
        { name: "ageRange", label: "Subtext", type: "text" },
        { name: "x", label: "Age / time", type: "text" },
        { name: "yNode", label: "Y", type: "number", step: 1 },
        { name: "stroke", label: "Arrow color", type: "text" },
        { name: "strokeWidth", label: "Arrow width", type: "number", min: 0.1, step: 0.1 },
        { name: "markerId", label: "Arrowhead style", type: "arrow-style", options: getMarkerOptions(markerId), syncColorField: "markerFill" },
        { name: "markerSize", label: "Arrowhead size", type: "number", min: 4, max: 18, step: 1 },
        { name: "markerFill", label: "Arrowhead color", type: "text" },
        { name: "titleFill", label: "Text color", type: "text" },
        { name: "ageFill", label: "Subtext color", type: "text" },
        { name: "titleFontSize", label: "Text size", type: "number", min: 10, max: 32, step: 1 },
        { name: "ageFontSize", label: "Subtext size", type: "number", min: 9, max: 28, step: 1 },
      ],
      values: {
        title: node.title || "",
        ageRange: node.ageRange || "",
        x: describeTimelineX(Number(node.x), rangeIndex),
        yNode: roundToThree(node.yNode),
        stroke: node.stroke || "",
        strokeWidth: node.strokeWidth ?? state.config?.nodes?.connectorStrokeWidth ?? "",
        markerId,
        markerSize: marker?.markerWidth ?? "",
        markerFill: marker?.fill || "",
        titleFill: node.titleFill || "",
        ageFill: node.ageFill || "",
        titleFontSize: node.titleFontSize ?? "",
        ageFontSize: node.ageFontSize ?? "",
      },
      saveLabel: "Save arrow",
      anchorPoint: eventToViewportPoint(anchorEvent),
      extraActions: [
        {
          label: "Duplicate",
          className: "editor-btn editor-btn-ghost",
          onClick: () => duplicateArrowAt(nodeType, nodeIndex),
        },
        {
          label: "Delete",
          className: "editor-btn editor-btn-danger",
          onClick: () => removeArrowAt(nodeType, nodeIndex),
        },
      ],
      onSave: (values) => {
        const x = resolveTimelineInputToX(values.x, rangeIndex, node.x);
        const yNode = toNumber(values.yNode);
        const strokeWidth = toNumber(values.strokeWidth);
        const nextMarkerId = values.markerId?.trim() || markerId;
        const nextMarker = getArrowConfigById(nextMarkerId);
        const markerSize = toNumber(values.markerSize);
        const markerFill = values.markerFill?.trim();
        const titleFontSize = toNumber(values.titleFontSize);
        const ageFontSize = toNumber(values.ageFontSize);

        node.title = values.title ?? "";
        node.ageRange = values.ageRange ?? "";
        node.stroke = values.stroke?.trim() || node.stroke;
        node.x = roundToThree(x);
        if (yNode !== null) node.yNode = roundToThree(yNode);
        if (strokeWidth !== null && strokeWidth > 0) node.strokeWidth = strokeWidth;
        if (nextMarkerId) node.markerId = nextMarkerId;
        node.titleFill = values.titleFill?.trim() || "";
        node.ageFill = values.ageFill?.trim() || "";
        node.titleFontSize = titleFontSize !== null && titleFontSize > 0
          ? titleFontSize
          : (node.titleFontSize && node.titleFontSize > 0 ? node.titleFontSize : getDefaultNodeTitleFontSize());
        node.ageFontSize = ageFontSize !== null && ageFontSize > 0
          ? ageFontSize
          : (node.ageFontSize && node.ageFontSize > 0 ? node.ageFontSize : getDefaultNodeAgeFontSize());

        if (nextMarker && markerFill) {
          nextMarker.fill = markerFill;
        }

        if (nextMarker && markerSize !== null && markerSize > 0) {
          nextMarker.markerWidth = markerSize;
          nextMarker.markerHeight = markerSize;
          nextMarker.refX = markerSize;
          nextMarker.refY = markerSize / 2;
          nextMarker.path = buildArrowPath(markerSize, markerSize);
        }

        if (nextMarker) {
          applyMarkerVisualUpdate(nextMarker.id);
        }

        updateNodeVisual(nodeType, nodeIndex);
        updateNodeSelectionPanel();
        renderInspector();
        createStatus("Updated arrow.");
        return true;
      },
    });
  }

  function openMainAxisSettingsEditor(anchorEvent) {
    const axis = state.config?.mainAxis;
    if (!axis) return;

    state.selectedKeys.clear();
    state.selectedBlockKey = null;
    state.selectedStageIndex = null;
    state.selectedMainAxis = true;
    renderSelectionState();

    const markerId = getMainAxisMarkerId();
    const marker = getArrowConfigById(markerId);

    openFloatingEditor({
      title: "Edit center arrow",
      fields: [
        { name: "x1", label: "Start age / time", type: "text" },
        { name: "x2", label: "End age / time", type: "text" },
        { name: "y", label: "Y", type: "number", step: 1 },
        { name: "stroke", label: "Arrow color", type: "text" },
        { name: "strokeWidth", label: "Arrow width", type: "number", min: 0.1, step: 0.1 },
        { name: "markerId", label: "Arrowhead style", type: "arrow-style", options: getMarkerOptions(markerId), syncColorField: "markerFill" },
        { name: "markerSize", label: "Arrowhead size", type: "number", min: 4, max: 20, step: 1 },
        { name: "markerFill", label: "Arrowhead color", type: "text" },
      ],
      values: {
        x1: describeTimelineX(Number(axis.x1), 0),
        x2: describeTimelineX(Number(axis.x2), 0),
        y: roundToThree(axis.y),
        stroke: axis.stroke || "",
        strokeWidth: axis.strokeWidth ?? "",
        markerId,
        markerSize: marker?.markerWidth ?? "",
        markerFill: marker?.fill || "",
      },
      saveLabel: "Save arrow",
      anchorPoint: eventToViewportPoint(anchorEvent),
      onSave: (values) => {
        const x1 = resolveTimelineInputToX(values.x1, 0, axis.x1);
        const x2 = resolveTimelineInputToX(values.x2, 0, axis.x2);
        const y = toNumber(values.y);
        const strokeWidth = toNumber(values.strokeWidth);
        const nextMarkerId = values.markerId?.trim() || markerId;
        const nextMarker = getArrowConfigById(nextMarkerId);
        const markerSize = toNumber(values.markerSize);
        const markerFill = values.markerFill?.trim();

        axis.x1 = roundToThree(x1);
        axis.x2 = roundToThree(x2);
        if (y !== null) axis.y = roundToThree(y);
        axis.stroke = values.stroke?.trim() || axis.stroke;
        if (strokeWidth !== null && strokeWidth > 0) axis.strokeWidth = strokeWidth;
        if (nextMarkerId) axis.markerEnd = `url(#${nextMarkerId})`;

        if (nextMarker && markerFill) {
          nextMarker.fill = markerFill;
        }

        if (nextMarker && markerSize !== null && markerSize > 0) {
          nextMarker.markerWidth = markerSize;
          nextMarker.markerHeight = markerSize;
          nextMarker.refX = markerSize;
          nextMarker.refY = markerSize / 2;
          nextMarker.path = buildArrowPath(markerSize, markerSize);
        }

        if (nextMarker) {
          applyMarkerVisualUpdate(nextMarker.id);
        }

        updateMainAxisVisual();
        renderSelectionState();
        createStatus("Updated center arrow.");
        return true;
      },
    });
  }

  function openPageCopyEditor(anchorEvent) {
    const root = state.ui?.pageCopyRoot;
    if (!root) return;

    const eyebrow = root.querySelector('[data-page-copy="eyebrow"]');
    const title = root.querySelector('[data-page-copy="title"]');
    const description = root.querySelector('[data-page-copy="description"]');

    openFloatingEditor({
      title: "Edit page text",
      fields: [
        { name: "eyebrow", label: "Eyebrow", type: "text" },
        { name: "title", label: "Title", type: "text" },
        { name: "description", label: "Description", type: "text" },
      ],
      values: {
        eyebrow: eyebrow?.textContent || "",
        title: title?.textContent || "",
        description: description?.textContent || "",
      },
      saveLabel: "Save text",
      anchorPoint: eventToViewportPoint(anchorEvent),
      onSave: (values) => {
        if (eyebrow) eyebrow.textContent = values.eyebrow || "";
        if (title) title.textContent = values.title || "";
        if (description) description.textContent = values.description || "";
        createStatus("Updated page text.");
        return true;
      },
    });
  }

  function getTemplateTickLabels(stageCount, rangeIndex) {
    const presets = rangeIndex === 0
      ? {
          1: ["0 mo", "11 y+"],
          2: ["0 mo", "4 y", "11 y+"],
          3: ["0 mo", "2 y", "6 y", "11 y+"],
        }
      : {
          1: ["P2", "P77"],
          2: ["P2", "P35", "P77"],
          3: ["P2", "P28", "P49", "P77"],
        };

    return deepClone(presets[stageCount] || presets[3]);
  }

  function createTemplateConfig(layout, stageCount) {
    const base = deepClone(window.TIMELINE_DEFAULT_CONFIG || resolveConfig() || {});
    const mainAxis = base.mainAxis || {};
    const x1 = Number(mainAxis.x1 || 130);
    const x2 = Number(mainAxis.x2 || 1325);
    const totalWidth = x2 - x1;
    const stageWidth = totalWidth / Math.max(stageCount, 1);
    const stageTop = Number(base.stageEditing?.boundaryTopY || 105);
    const stageBottom = Number(base.stageEditing?.boundaryBottomY || 640);
    const mainY = Number(mainAxis.y || 385);
    const stageHeight = stageBottom - stageTop;
    const bandGap = 24;
    const upperStageHeight = Math.max(120, roundToThree(mainY - stageTop - bandGap));
    const lowerStageY = roundToThree(mainY + bandGap);
    const lowerStageHeight = Math.max(120, roundToThree(stageBottom - lowerStageY));

    let activeStageY = stageTop;
    let activeStageHeight = stageHeight;
    let activeLabelY = roundToThree(stageTop + 18);

    if (layout === "upper") {
      activeStageY = stageTop;
      activeStageHeight = upperStageHeight;
      activeLabelY = roundToThree(activeStageY + 18);
    } else if (layout === "lower") {
      activeStageY = lowerStageY;
      activeStageHeight = lowerStageHeight;
      activeLabelY = roundToThree(activeStageY + activeStageHeight - 14);
    }

    base.layoutMode = layout;
    base.customGroups = [];
    base.stageEditing = {
      ...(base.stageEditing || {}),
      boundaryTopY: activeStageY,
      boundaryBottomY: roundToThree(activeStageY + activeStageHeight),
    };

    base.legendLabels = {
      human: "Upper group",
      mouse: "Lower group",
    };

    base.developmentWindows = Array.from({ length: stageCount }, (_, index) => ({
      x: roundToThree(x1 + (index * stageWidth)),
      y: activeStageY,
      width: roundToThree(stageWidth),
      height: activeStageHeight,
      rx: 18,
      fill: TEMPLATE_STAGE_COLORS[index % TEMPLATE_STAGE_COLORS.length],
      opacity: index === 0 ? 0.28 : 0.22,
      label: `Stage ${index + 1}`,
      stageName: TEMPLATE_STAGE_NAMES[index] || `Stage ${index + 1}`,
      humanLabel: TEMPLATE_STAGE_NAMES[index] || `Stage ${index + 1}`,
      mouseLabel: getTemplateTickLabels(stageCount, 1)[index] || `P${2 + (index * 7)}`,
      stageLabelY: activeLabelY,
    }));

    const humanTicks = getTemplateTickLabels(stageCount, 0);
    const mouseTicks = getTemplateTickLabels(stageCount, 1);
    base.axisRanges = (base.axisRanges || []).map((range, rangeIndex) => ({
      ...range,
      lineStartX: x1,
      lineEndX: x2,
      hidden: (layout === "upper" && rangeIndex === 1) || (layout === "lower" && rangeIndex === 0),
      ticks: (rangeIndex === 0 ? humanTicks : mouseTicks).map((label, index) => ({
        stageEdge: index,
        label,
      })),
    }));

    if (Array.isArray(base.axisLabels) && base.axisLabels[0]) {
      base.axisLabels[0].text = layout === "lower" ? "" : "Upper group";
      base.axisLabels[0].hidden = layout === "lower";
      base.axisLabels[0].y = roundToThree((stageTop + mainY) / 2);
      base.axisLabels[0].transform = `rotate(-90 ${base.axisLabels[0].x} ${base.axisLabels[0].y})`;
    }
    if (Array.isArray(base.axisLabels) && base.axisLabels[1]) {
      base.axisLabels[1].text = layout === "upper" ? "" : "Lower group";
      base.axisLabels[1].hidden = layout === "upper";
      base.axisLabels[1].y = roundToThree((mainY + stageBottom) / 2);
      base.axisLabels[1].transform = `rotate(-90 ${base.axisLabels[1].x} ${base.axisLabels[1].y})`;
    }

    const sampleStage = base.developmentWindows[Math.min(1, base.developmentWindows.length - 1)] || base.developmentWindows[0];
    const sampleBlockStart = roundToThree(sampleStage.x + (sampleStage.width * 0.18));
    const sampleBlockEnd = roundToThree(sampleStage.x + (sampleStage.width * 0.58));
    const sampleArrowX = roundToThree(sampleStage.x + (sampleStage.width * 0.5));

    base.humanNodes = layout === "lower" ? [] : [{
      x: sampleArrowX,
      yNode: roundToThree(stageTop + 92),
      yAxis: roundToThree(mainY - 13),
      title: "Example milestone",
      ageRange: humanTicks[Math.min(1, humanTicks.length - 1)] || "1 y",
      stroke: "var(--human)",
      markerId: "humanArrow",
    }];

    base.humanRangeBlocks = layout === "lower" ? [] : [{
      xStart: sampleBlockStart,
      xEnd: sampleBlockEnd,
      y: roundToThree(stageTop + 178),
      height: 40,
      title: "Example block",
      ageRange: `${humanTicks[0]} -> ${humanTicks[Math.min(1, humanTicks.length - 1)]}`,
      fill: "var(--human-soft)",
      stroke: "var(--human)",
      strokeWidth: 1.9,
      rx: 8,
    }];

    base.mouseNodes = layout === "upper" ? [] : [{
      x: sampleArrowX,
      yNode: roundToThree(mainY + 132),
      yAxis: roundToThree(mainY + 13),
      title: "Example milestone",
      ageRange: mouseTicks[Math.min(1, mouseTicks.length - 1)] || "P21",
      stroke: "var(--mouse)",
      markerId: "mouseArrow",
    }];

    base.mouseRangeBlocks = layout === "upper" ? [] : [{
      xStart: sampleBlockStart,
      xEnd: sampleBlockEnd,
      y: roundToThree(mainY + 70),
      height: 40,
      title: "Example block",
      ageRange: `${mouseTicks[0]} -> ${mouseTicks[Math.min(1, mouseTicks.length - 1)]}`,
      fill: "var(--mouse-soft)",
      stroke: "var(--mouse)",
      strokeWidth: 1.9,
      rx: 8,
    }];

    return base;
  }

  function applyNewFigureTemplate(layout, stageCount) {
    const config = createTemplateConfig(layout, stageCount);
    const payload = {
      format: "timeline-builder-config",
      version: 1,
      pageCopy: {
        eyebrow: "Editable timeline builder",
        title: "Create and refine visual timelines",
        description: "Use this page to build timelines with editable stages, arrows, blocks, labels, colors, and styles. The current figure is an example comparing episodic-like memory development across humans and mice.",
      },
      config,
    };

    clearAllSelections();

    if (window.TimelineIO?.importSetupObject) {
      window.TimelineIO.importSetupObject(payload);
    } else {
      window.TIMELINE_CONFIG = config;
      if (typeof window.initializeTimeline === "function") {
        window.initializeTimeline();
      }
    }

    createStatus(`Created a new ${layout === "dual" ? "two-group" : `${layout} group`} figure with ${stageCount} stage${stageCount === 1 ? "" : "s"}.`);
    return true;
  }

  function getTemplatePreviewTitle(layout) {
    if (layout === "dual") return "Two groups";
    if (layout === "upper") return "Upper only";
    return "Lower only";
  }

  function renderTemplateStageZone(position, stageCount, colorOffset) {
    const cells = Array.from({ length: stageCount }, (_, index) => `
      <span
        class="template-card-stage-cell"
        style="background:${TEMPLATE_STAGE_COLORS[(colorOffset + index) % TEMPLATE_STAGE_COLORS.length]}"
      ></span>
    `).join("");

    return `
      <span class="template-card-stage-zone template-card-stage-zone-${position}" style="--template-stage-count:${stageCount}">
        ${cells}
      </span>
    `;
  }

  function createTemplatePreview(layout, stageCount) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `template-card template-card-${layout}`;
    const title = getTemplatePreviewTitle(layout);
    const stageLabel = `${stageCount} stage${stageCount === 1 ? "" : "s"}`;
    const previewZones = [];

    if (layout !== "lower") {
      previewZones.push(renderTemplateStageZone("upper", stageCount, 0));
    }

    if (layout !== "upper") {
      previewZones.push(renderTemplateStageZone("lower", stageCount, layout === "dual" ? stageCount : 0));
    }

    card.innerHTML = `
      <span class="template-card-heading">
        <span class="template-card-title">${title}</span>
        <span class="template-card-meta">${stageLabel}</span>
      </span>
      <span class="template-card-preview template-card-preview-${layout}">
        ${previewZones.join("")}
        <span class="template-card-axis"></span>
        ${layout !== "lower" ? '<span class="template-card-block template-card-block-upper"></span><span class="template-card-arrow template-card-arrow-upper"></span>' : ""}
        ${layout !== "upper" ? '<span class="template-card-block template-card-block-lower"></span><span class="template-card-arrow template-card-arrow-lower"></span>' : ""}
      </span>
      <span class="template-card-footer">
        <span class="template-card-count">${layout === "dual" ? stageCount * 2 : stageCount} colors</span>
        <span class="template-card-label">Create preset</span>
      </span>
    `;
    return card;
  }

  function openNewFigureTemplatePicker(anchorEvent) {
    const rows = [
      { label: "Upper group only", layout: "upper" },
      { label: "Lower group only", layout: "lower" },
      { label: "Two groups", layout: "dual" },
    ];

    openFloatingEditor({
      title: "New figure",
      fields: [],
      values: {},
      hideSave: true,
      anchorPoint: eventToViewportPoint(anchorEvent),
      afterRender: (body) => {
        const intro = document.createElement("p");
        intro.className = "editor-help";
        intro.textContent = "Pick a clean starting figure. Each preset creates stages plus one sample block and milestone so the layout is easy to edit immediately.";
        body.appendChild(intro);

        const picker = document.createElement("div");
        picker.className = "template-picker";

        rows.forEach((row) => {
          const rowElement = document.createElement("div");
          rowElement.className = "template-picker-row";

          const title = document.createElement("div");
          title.className = "template-picker-row-title";
          title.textContent = row.label;
          rowElement.appendChild(title);

          const cards = document.createElement("div");
          cards.className = "template-picker-cards";

          [1, 2, 3].forEach((stageCount) => {
            const card = createTemplatePreview(row.layout, stageCount);
            card.addEventListener("click", () => {
              applyNewFigureTemplate(row.layout, stageCount);
              closeFloatingEditor();
            });
            cards.appendChild(card);
          });

          rowElement.appendChild(cards);
          picker.appendChild(rowElement);
        });

        body.appendChild(picker);
      },
      onSave: () => true,
    });
  }

  function openSpeciesSettingsEditor(species, anchorEvent) {
    if (!state.config) return;
    if (!state.config.legendLabels) state.config.legendLabels = {};

    const isHuman = species === "human";
    const colorName = isHuman ? "--human" : "--mouse";
    const softName = isHuman ? "--human-soft" : "--mouse-soft";
    const rootStyle = getComputedStyle(document.documentElement);
    const currentColor = document.documentElement.style.getPropertyValue(colorName).trim()
      || rootStyle.getPropertyValue(colorName).trim()
      || (isHuman ? "var(--human)" : "var(--mouse)");
    const currentSoft = document.documentElement.style.getPropertyValue(softName).trim()
      || rootStyle.getPropertyValue(softName).trim()
      || (isHuman ? "var(--human-soft)" : "var(--mouse-soft)");

    openFloatingEditor({
      title: isHuman ? "Edit human category" : "Edit mouse category",
      fields: [
        { name: "label", label: "Legend name", type: "text" },
        { name: "color", label: "Category color", type: "text" },
        { name: "softColor", label: "Soft block color", type: "text" },
      ],
      values: {
        label: state.config.legendLabels[species] || (isHuman ? "Human milestones" : "Mouse milestones"),
        color: currentColor,
        softColor: currentSoft,
      },
      saveLabel: "Save category",
      anchorPoint: eventToViewportPoint(anchorEvent),
      onSave: (values) => {
        state.config.legendLabels[species] = values.label?.trim() || (isHuman ? "Human milestones" : "Mouse milestones");
        if (values.color?.trim()) document.documentElement.style.setProperty(colorName, values.color.trim());
        if (values.softColor?.trim()) document.documentElement.style.setProperty(softName, values.softColor.trim());
        refreshTimelineLegend();
        createStatus("Updated category settings.");
        return true;
      },
    });
  }

  function openGroupSettingsEditor(anchorEvent, groupId = null) {
    ensureCustomGroups();

    const existingGroup = groupId ? getCustomGroupById(groupId) : null;
    const members = existingGroup
      ? existingGroup.members.map((member) => cloneGroupMember(member)).filter(Boolean)
      : getSelectedGroupMembers();

      if (!existingGroup && members.length < 2) {
        createStatus("Select at least two blocks or arrows before creating a group.", true);
        return;
      }

    openFloatingEditor({
      title: existingGroup ? "Edit group" : "Create group",
      fields: [
        { name: "label", label: "Group name", type: "text" },
        { name: "color", label: "Group color", type: "text" },
        { name: "members", label: "Members", type: "text", readonly: true },
      ],
      values: {
        label: existingGroup?.label || "New group",
        color: existingGroup?.color || "var(--track)",
        members: describeGroupMembers(members),
      },
      saveLabel: existingGroup ? "Save group" : "Create group",
      anchorPoint: eventToViewportPoint(anchorEvent),
      extraActions: existingGroup ? [{
        label: "Delete group",
        className: "editor-btn editor-btn-danger",
        onClick: () => removeCustomGroup(existingGroup.id),
      }] : [],
      onSave: (values) => {
        const groups = ensureCustomGroups();
        const nextColor = values.color?.trim() || existingGroup?.color || "var(--track)";
        const nextLabel = values.label?.trim() || existingGroup?.label || "New group";
        let targetGroup = existingGroup;

        if (!targetGroup) {
          targetGroup = {
            id: createGroupId(),
            members: members.map((member) => cloneGroupMember(member)).filter(Boolean),
          };
          groups.push(targetGroup);
        }

        targetGroup.label = nextLabel;
        targetGroup.color = nextColor;
        targetGroup.members = members.map((member) => cloneGroupMember(member)).filter(Boolean);
        targetGroup.members.forEach((member) => applyGroupColorToMember(member, nextColor));

        refreshTimelineLegend();
        renderInspector();
        createStatus(existingGroup ? "Updated group." : "Created group.");
        return true;
      },
    });
  }

  function openBlockSettingsEditor(blockType, blockIndex, anchorEvent) {
    const block = getBlock(blockType, blockIndex);
    if (!block) return;
    const rangeIndex = blockType === "mouse" ? 1 : 0;

    state.selectedKeys.clear();
    state.selectedBlockKeys.clear();
    state.selectedStageIndex = null;
    state.selectedBoundaryIndex = null;
    state.selectedMainAxis = false;
    setSelectedBlock(`${blockType}:${blockIndex}`);

    openFloatingEditor({
      title: "Edit block",
      fields: [
        { name: "title", label: "Text", type: "text" },
        { name: "ageRange", label: "Subtext", type: "text" },
        { name: "xStart", label: "Age / time start", type: "text" },
        { name: "xEnd", label: "Age / time end", type: "text" },
        { name: "y", label: "Y", type: "number", step: 1 },
        { name: "height", label: "Height", type: "number", min: 10, step: 1 },
        { name: "fill", label: "Fill color", type: "text" },
        { name: "stroke", label: "Border color", type: "text" },
        { name: "strokeWidth", label: "Border width", type: "number", min: 0.1, step: 0.1 },
        { name: "rx", label: "Corner radius", type: "number", min: 0, step: 1 },
        { name: "titleFill", label: "Text color", type: "text" },
        { name: "ageFill", label: "Subtext color", type: "text" },
        { name: "titleFontSize", label: "Text size", type: "number", min: 10, max: 32, step: 1 },
        { name: "ageFontSize", label: "Subtext size", type: "number", min: 9, max: 28, step: 1 },
      ],
      values: {
        title: block.title || "",
        ageRange: block.ageRange || "",
        xStart: describeTimelineX(Number(block.xStart), rangeIndex),
        xEnd: describeTimelineX(Number(block.xEnd), rangeIndex),
        y: roundToThree(block.y),
        height: getNormalizedBlockHeight(block.height),
        fill: block.fill || "",
        stroke: block.stroke || "",
        strokeWidth: block.strokeWidth ?? state.config?.blocks?.strokeWidth ?? "",
        rx: block.rx ?? state.config?.blocks?.cornerRadius ?? "",
        titleFill: block.titleFill || "",
        ageFill: block.ageFill || "",
        titleFontSize: block.titleFontSize ?? "",
        ageFontSize: block.ageFontSize ?? "",
      },
      saveLabel: "Save block",
      anchorPoint: eventToViewportPoint(anchorEvent),
      extraActions: [
        {
          label: "Use upper group colors",
          className: "editor-btn editor-btn-ghost",
          onClick: () => applySpeciesColorsToBlock(blockType, blockIndex, "human"),
        },
        {
          label: "Use lower group colors",
          className: "editor-btn editor-btn-ghost",
          onClick: () => applySpeciesColorsToBlock(blockType, blockIndex, "mouse"),
        },
        {
          label: "Duplicate",
          className: "editor-btn editor-btn-ghost",
          onClick: () => duplicateBlockAt(blockType, blockIndex),
        },
        {
          label: "Delete",
          className: "editor-btn editor-btn-danger",
          onClick: () => removeBlockAt(blockType, blockIndex),
        },
      ],
      onSave: (values) => {
        const xStart = resolveTimelineInputToX(values.xStart, rangeIndex, block.xStart);
        const xEnd = resolveTimelineInputToX(values.xEnd, rangeIndex, block.xEnd);
        const y = toNumber(values.y);
        const height = toNumber(values.height);
        const strokeWidth = toNumber(values.strokeWidth);
        const rx = toNumber(values.rx);
        const titleFontSize = toNumber(values.titleFontSize);
        const ageFontSize = toNumber(values.ageFontSize);

        block.title = values.title ?? "";
        block.ageRange = values.ageRange ?? "";
        block.fill = values.fill?.trim() || block.fill;
        block.stroke = values.stroke?.trim() || block.stroke;
        block.titleFill = values.titleFill?.trim() || "";
        block.ageFill = values.ageFill?.trim() || "";
        block.titleFontSize = titleFontSize !== null && titleFontSize > 0
          ? titleFontSize
          : (block.titleFontSize && block.titleFontSize > 0 ? block.titleFontSize : getDefaultBlockTitleFontSize());
        block.ageFontSize = ageFontSize !== null && ageFontSize > 0
          ? ageFontSize
          : (block.ageFontSize && block.ageFontSize > 0 ? block.ageFontSize : getDefaultBlockAgeFontSize());
        block.xStart = roundToThree(xStart);
        block.xEnd = roundToThree(xEnd);
        if (y !== null) block.y = roundToThree(y);
        block.height = getNormalizedBlockHeight(height);
        if (strokeWidth !== null && strokeWidth > 0) block.strokeWidth = strokeWidth;
        if (rx !== null && rx >= 0) block.rx = rx;

        updateBlockVisual(blockType, blockIndex);
        renderInspector();
        createStatus("Updated block.");
        return true;
      },
    });
  }

  function beginDrag(pointerEvent) {
    const startPoint = toSvgPoint(pointerEvent.clientX, pointerEvent.clientY);
    const entries = getSelectedEntries();
    if (!startPoint || !entries.length) return;

    const startPositions = new Map();
    entries.forEach((entry) => {
      startPositions.set(entry.key, {
        x: entry.node.x,
        yNode: entry.node.yNode,
      });
    });

    const startBlocks = new Map();
    state.selectedBlockKeys.forEach((key) => {
      const entry = getBlockEntryByKey(key);
      if (!entry) return;
      startBlocks.set(key, {
        xStart: Number(entry.block.xStart),
        xEnd: Number(entry.block.xEnd),
        y: Number(entry.block.y),
        height: getNormalizedBlockHeight(entry.block.height),
      });
    });

    state.drag = {
      pointerId: pointerEvent.pointerId,
      startPoint,
      startPositions,
      startBlocks,
      moved: false,
    };

    state.svg.classList.add("is-dragging-selection");
    state.svg.querySelectorAll(".editable-node.is-selected").forEach((group) => {
      group.classList.add("is-dragging");
    });
    state.svg.querySelectorAll(".editable-range.is-selected").forEach((group) => {
      group.classList.add("is-dragging");
    });

    if (typeof state.svg.setPointerCapture === "function") {
      state.svg.setPointerCapture(pointerEvent.pointerId);
    }
  }

  function finishDrag() {
    if (!state.drag || !state.svg) return;

    state.svg.classList.remove("is-dragging-selection");
    state.svg.querySelectorAll(".editable-node.is-dragging").forEach((group) => {
      group.classList.remove("is-dragging");
    });
    state.svg.querySelectorAll(".editable-range.is-dragging").forEach((group) => {
      group.classList.remove("is-dragging");
    });

    if (state.drag.moved) {
      state.suppressNextClickEditor = true;
      updateNodeSelectionPanel();
      renderInspector();
      recordHistory("Moved arrows");
      createStatus("Dragged selected arrows.");
    }

    clearDragReadout();
    state.drag = null;
  }

  function beginBlockDrag(pointerEvent, blockType, blockIndex, mode) {
    const startPoint = toSvgPoint(pointerEvent.clientX, pointerEvent.clientY);
    const block = getBlock(blockType, blockIndex);
    if (!startPoint || !block) return;

    const activeBlockKey = `${blockType}:${blockIndex}`;
    const draggableKeys = mode === "move" && state.selectedBlockKeys.has(activeBlockKey)
      ? Array.from(state.selectedBlockKeys)
      : [activeBlockKey];
    const startBlocks = new Map();
    draggableKeys.forEach((key) => {
      const entry = getBlockEntryByKey(key);
      if (!entry) return;
      startBlocks.set(key, {
        xStart: Number(entry.block.xStart),
        xEnd: Number(entry.block.xEnd),
        y: Number(entry.block.y),
        height: getNormalizedBlockHeight(entry.block.height),
      });
    });

    const startNodes = new Map();
    if (mode === "move" && state.selectedBlockKeys.has(activeBlockKey)) {
      state.selectedKeys.forEach((key) => {
        const entry = getNodeEntryByKey(key);
        if (!entry) return;
        startNodes.set(key, {
          x: Number(entry.node.x),
          yNode: Number(entry.node.yNode),
        });
      });
    }

    state.blockDrag = {
      pointerId: pointerEvent.pointerId,
      blockType,
      blockIndex,
      mode,
      activeBlockKey,
      startBlocks,
      startNodes,
      startPoint,
      startBlock: {
        xStart: Number(block.xStart),
        xEnd: Number(block.xEnd),
        y: Number(block.y),
        height: getNormalizedBlockHeight(block.height),
      },
      moved: false,
    };

    if (state.svg) {
      state.svg.classList.add("is-dragging-range");
      const group = state.svg.querySelector(`.editable-range[data-block-type="${blockType}"][data-block-index="${blockIndex}"]`);
      if (group) group.classList.add("is-dragging");
    }

    if (state.svg && typeof state.svg.setPointerCapture === "function") {
      state.svg.setPointerCapture(pointerEvent.pointerId);
    }
  }

  function getMainAxisDragMode(point) {
    const axis = state.config?.mainAxis;
    if (!axis || !point) return "move";

    const x1 = Number(axis.x1);
    const x2 = Number(axis.x2);
    const edgeThreshold = Math.max(18, Number(axis.strokeWidth || 5) + 16);
    if (Math.abs(point.x - x1) <= edgeThreshold) return "resize-start";
    if (Math.abs(point.x - x2) <= edgeThreshold) return "resize-end";
    return "move";
  }

  function beginMainAxisDrag(pointerEvent, mode) {
    const startPoint = toSvgPoint(pointerEvent.clientX, pointerEvent.clientY);
    const axis = state.config?.mainAxis;
    if (!startPoint || !axis) return;

    state.mainAxisDrag = {
      pointerId: pointerEvent.pointerId,
      mode,
      startPoint,
      startAxis: {
        x1: Number(axis.x1),
        x2: Number(axis.x2),
        y: Number(axis.y),
      },
      layoutSnapshot: snapshotVerticalLayout(),
      horizontalSnapshot: snapshotHorizontalLayout(),
      moved: false,
    };

    state.svg.classList.add("is-dragging-main-axis");
    const line = state.svg.querySelector(".main-axis-line");
    if (line) line.classList.add("is-dragging");

    if (typeof state.svg.setPointerCapture === "function") {
      state.svg.setPointerCapture(pointerEvent.pointerId);
    }
  }

  function finishMainAxisDrag() {
    if (!state.mainAxisDrag || !state.svg) return;

    state.svg.classList.remove("is-dragging-main-axis");
    const line = state.svg.querySelector(".main-axis-line");
    if (line) line.classList.remove("is-dragging");

    if (state.mainAxisDrag.moved) {
      state.suppressNextClickEditor = true;
      renderInspector();
      recordHistory("Adjusted center arrow");
      createStatus("Adjusted center arrow.");
    }

    clearDragReadout();
    state.mainAxisDrag = null;
  }

  function finishBlockDrag() {
    if (!state.blockDrag || !state.svg) return;

    state.svg.classList.remove("is-dragging-range");
    state.svg.querySelectorAll(".editable-range.is-dragging").forEach((group) => {
      group.classList.remove("is-dragging");
    });

    if (state.blockDrag.moved) {
      state.suppressNextClickEditor = true;
      renderInspector();
      recordHistory(state.blockDrag.mode === "move" ? "Moved block" : "Resized block");
      createStatus(state.blockDrag.mode === "move" ? "Dragged range block." : "Resized range block.");
    }

    clearDragReadout();
    state.blockDrag = null;
  }

  function applyTextEdit(textElement, nextText) {
    if (!textElement) return;

    const role = textElement.dataset.textRole;

    if (role === "node-title") {
      const nodeType = textElement.dataset.nodeType;
      const nodeIndex = Number(textElement.dataset.nodeIndex);
      const node = getNode(nodeType, nodeIndex);
      if (!node) return;
      node.title = nextText;
      updateNodeVisual(nodeType, nodeIndex);
      updateNodeSelectionPanel();
      renderInspector();
      return;
    }

    if (role === "node-age") {
      const nodeType = textElement.dataset.nodeType;
      const nodeIndex = Number(textElement.dataset.nodeIndex);
      const node = getNode(nodeType, nodeIndex);
      if (!node) return;
      node.ageRange = nextText;
      updateNodeVisual(nodeType, nodeIndex);
      updateNodeSelectionPanel();
      renderInspector();
      return;
    }

    if (role === "block-title") {
      const blockType = textElement.dataset.blockType;
      const blockIndex = Number(textElement.dataset.blockIndex);
      const block = getBlock(blockType, blockIndex);
      if (!block) return;
      block.title = nextText;
      updateBlockVisual(blockType, blockIndex);
      renderInspector();
      return;
    }

    if (role === "block-age") {
      const blockType = textElement.dataset.blockType;
      const blockIndex = Number(textElement.dataset.blockIndex);
      const block = getBlock(blockType, blockIndex);
      if (!block) return;
      block.ageRange = nextText;
      updateBlockVisual(blockType, blockIndex);
      renderInspector();
      return;
    }

    if (role === "stage-label") {
      const stageIndex = Number(textElement.dataset.stageIndex);
      const stage = getStage(stageIndex);
      if (!stage) return;

      stage.stageName = nextText;

      syncWindowLabelsFromStages();
      updateStageVisual(stageIndex);
      refreshStageOptions();
      updateStagePanel();
      renderInspector();
      refreshTimelineLegend();
      return;
    }

    if (role === "axis-label") {
      const axisIndex = Number(textElement.dataset.axisIndex);
      if (Array.isArray(state.config?.axisLabels) && state.config.axisLabels[axisIndex]) {
        state.config.axisLabels[axisIndex].text = nextText;
      }
      textElement.textContent = nextText;
      return;
    }

    if (role === "range-tick") {
      const rangeIndex = Number(textElement.dataset.rangeIndex);
      const tickIndex = Number(textElement.dataset.tickIndex);
      if (state.config?.axisRanges?.[rangeIndex]?.ticks?.[tickIndex]) {
        state.config.axisRanges[rangeIndex].ticks[tickIndex].label = nextText;
      }
      textElement.textContent = nextText;
      refreshAgeRangesFromPositions();
      updateRangeAxesVisuals();
      return;
    }

    if (role === "range-title") {
      const rangeIndex = Number(textElement.dataset.rangeIndex);
      if (state.config?.axisRanges?.[rangeIndex]) {
        state.config.axisRanges[rangeIndex].title = nextText;
      }
      textElement.textContent = nextText;
      return;
    }

    if (role === "note-line") {
      const noteIndex = Number(textElement.dataset.noteIndex);
      if (state.config?.alignmentNote?.lines?.[noteIndex]) {
        state.config.alignmentNote.lines[noteIndex].text = nextText;
      }
      textElement.textContent = nextText;
      return;
    }

    textElement.textContent = nextText;
  }

  function onSvgPointerDown(event) {
    if (event.button !== 0 || !state.svg) return;
    if (event.ctrlKey) return;

    const mainAxisTarget = event.target.closest(".main-axis-hitbox, .main-axis-line");
    if (mainAxisTarget && state.svg.contains(mainAxisTarget)) {
      event.preventDefault();
      const point = toSvgPoint(event.clientX, event.clientY);
      state.selectedKeys.clear();
      state.selectedBlockKeys.clear();
      state.selectedBlockKey = null;
      state.selectedStageIndex = null;
      state.selectedBoundaryIndex = null;
      state.selectedMainAxis = true;
      renderSelectionState();
      beginMainAxisDrag(event, getMainAxisDragMode(point));
      createStatus("Center arrow selected. Drag vertically to move it, or drag either end to change its width.");
      return;
    }

    const rangeAxisTarget = event.target.closest(".range-axis-height-hitbox, .range-axis-line, .range-axis-tick-line");
    if (rangeAxisTarget && state.svg.contains(rangeAxisTarget)) {
      const rangeIndex = Number(rangeAxisTarget.dataset.rangeIndex);
      if (rangeIndex === 0 || rangeIndex === 1) {
        event.preventDefault();
        beginYScaleDrag(event, rangeIndex === 0 ? "top" : "bottom");
        createStatus(rangeIndex === 0 ? "Dragging top bracket to scale figure height." : "Dragging bottom bracket to scale figure height.");
        return;
      }
    }

    const boundaryTarget = event.target.closest(".stage-boundary-hitbox, .stage-boundary-handle");
    if (boundaryTarget && state.svg.contains(boundaryTarget)) {
      event.preventDefault();
      const boundaryIndex = Number(boundaryTarget.dataset.boundaryIndex);
      if (Number.isInteger(boundaryIndex)) {
        setSelectedBoundary(boundaryIndex);
        beginStageDrag(event, boundaryIndex);
        createStatus("Stage boundary selected. Drag or use keyboard arrows to move it.");
      }
      return;
    }

    const stageTarget = event.target.closest(".stage-hitbox");
    if (stageTarget && state.svg.contains(stageTarget)) {
      event.preventDefault();
      const stageIndex = Number(stageTarget.dataset.stageIndex);
      if (Number.isInteger(stageIndex)) {
        state.selectedBlockKey = null;
        state.selectedMainAxis = false;
        setSelectedStage(stageIndex);
        createStatus("Stage selected. Drag a stage boundary to resize and remap arrows in that range.");
      }
      return;
    }

    const resizeHandle = event.target.closest(".range-block-resize-hitbox");
    if (resizeHandle && state.svg.contains(resizeHandle)) {
      const blockGroup = resizeHandle.closest(".editable-range");
      const blockType = blockGroup?.dataset.blockType;
      const blockIndex = Number(blockGroup?.dataset.blockIndex);
      const blockKey = blockGroup?.dataset.blockKey || null;
      if (blockGroup && (blockType === "human" || blockType === "mouse") && Number.isInteger(blockIndex)) {
        event.preventDefault();
        const preserveMultiSelection = Boolean(
          blockKey
          && state.selectedBlockKeys.size > 1
          && state.selectedBlockKeys.has(blockKey)
        );
        if (preserveMultiSelection) {
          state.selectedBlockKey = blockKey;
          state.selectedStageIndex = null;
          state.selectedBoundaryIndex = null;
          state.selectedMainAxis = false;
          renderSelectionState();
          renderInspector();
        } else {
          setSelectedBlock(blockKey);
        }
        if (event.detail >= 2) {
          openBlockSettingsEditor(blockType, blockIndex, event);
          return;
        }
        const resizeSide = resizeHandle.dataset.resizeSide;
        const mode = resizeSide === "start"
          ? "resize-start"
          : resizeSide === "top"
            ? "resize-top"
            : resizeSide === "bottom"
              ? "resize-bottom"
              : "resize-end";
        beginBlockDrag(event, blockType, blockIndex, mode);
        createStatus("Range block selected. Drag the handle to resize it.");
      }
      return;
    }

    const blockGroup = event.target.closest(".editable-range");
    if (blockGroup && state.svg.contains(blockGroup)) {
      event.preventDefault();
      const blockType = blockGroup.dataset.blockType;
      const blockIndex = Number(blockGroup.dataset.blockIndex);
      const blockKey = blockGroup.dataset.blockKey || null;
      if (event.shiftKey) {
        toggleBlockSelection(blockKey);
        createStatus("Block selection updated (Shift + click).");
        return;
      }
      const preserveMultiSelection = Boolean(blockKey && state.selectedBlockKeys.size > 1 && state.selectedBlockKeys.has(blockKey));
      if (preserveMultiSelection) {
        state.selectedBlockKey = blockKey;
        state.selectedStageIndex = null;
        state.selectedBoundaryIndex = null;
        state.selectedMainAxis = false;
        renderSelectionState();
        renderInspector();
      } else {
        setSelectedBlock(blockKey);
      }
      if (event.detail >= 2) {
        openBlockSettingsFromEvent(event);
        return;
      }
      if ((blockType === "human" || blockType === "mouse") && Number.isInteger(blockIndex)) {
        beginBlockDrag(event, blockType, blockIndex, "move");
      }
      createStatus("Range block selected.");
      return;
    }

    if (event.detail >= 2 && event.target === state.svg && openBlockSettingsFromEvent(event, true)) {
      event.preventDefault();
      return;
    }

    const nodeGroup = event.target.closest(".editable-node");
    if (!nodeGroup || !state.svg.contains(nodeGroup)) return;

    if (event.target.closest("text[data-text-role]")) {
      return;
    }

    event.preventDefault();

    const key = nodeGroup.dataset.nodeKey;
    if (!key) return;

    if (event.shiftKey) {
      state.selectedBlockKey = null;
      state.selectedStageIndex = null;
      state.selectedMainAxis = false;
      toggleSelection(key);
      createStatus("Selection updated (Shift + click). Drag a selected arrow to move all selected.");
      return;
    }

    if (!state.selectedKeys.has(key) || (state.selectedKeys.size !== 1 && !state.selectedBlockKeys.size)) {
      state.selectedBlockKey = null;
      setSelection([key]);
    }

    beginDrag(event);
  }

  function onSvgPointerMove(event) {
    if (state.mainAxisDrag && event.pointerId === state.mainAxisDrag.pointerId) {
      const currentPoint = toSvgPoint(event.clientX, event.clientY);
      if (!currentPoint || !state.config?.mainAxis) return;

      event.preventDefault();

      const dx = currentPoint.x - state.mainAxisDrag.startPoint.x;
      const dy = currentPoint.y - state.mainAxisDrag.startPoint.y;
      const axis = state.config.mainAxis;
      let moved = false;

      if (state.mainAxisDrag.mode === "resize-start") {
        moved = applyHorizontalScaleFromSnapshot(
          "resize-start",
          state.mainAxisDrag.startAxis.x1 + dx,
          state.mainAxisDrag.horizontalSnapshot
        );
      } else if (state.mainAxisDrag.mode === "resize-end") {
        moved = applyHorizontalScaleFromSnapshot(
          "resize-end",
          state.mainAxisDrag.startAxis.x2 + dx,
          state.mainAxisDrag.horizontalSnapshot
        );
      } else {
        moved = applyCenterAxisMoveFromSnapshot(
          state.mainAxisDrag.startAxis.y + dy,
          state.mainAxisDrag.layoutSnapshot
        );
      }

      if (moved) {
        updateMainAxisVisual();
        updateRangeAxesVisuals();
        state.mainAxisDrag.moved = true;
        updateDragReadout(
          state.mainAxisDrag.mode === "move"
            ? `center y ${roundToThree(axis.y)}`
            : `${roundToThree(axis.x1)} -> ${roundToThree(axis.x2)}`,
          state.mainAxisDrag.mode === "resize-start" ? Number(axis.x1) : Number(axis.x2),
          Number(axis.y) - 16
        );
      }
      return;
    }

    if (state.yScaleDrag && event.pointerId === state.yScaleDrag.pointerId) {
      const currentPoint = toSvgPoint(event.clientX, event.clientY);
      if (!currentPoint) return;

      event.preventDefault();

      const dy = currentPoint.y - state.yScaleDrag.startPoint.y;
      const edge = state.yScaleDrag.edge;
      const startY = edge === "top" ? state.yScaleDrag.snapshot.bounds.top : state.yScaleDrag.snapshot.bounds.bottom;
      const requestedY = startY + dy;
      const moved = applyVerticalScaleFromSnapshot(edge, requestedY, state.yScaleDrag.snapshot);

      if (moved) {
        state.yScaleDrag.moved = true;
        const bounds = getStageBounds();
        updateDragReadout(
          `height ${roundToThree(bounds.bottom - bounds.top)}`,
          Number(state.config?.mainAxis?.x1 || 130) + 90,
          edge === "top" ? bounds.top - 14 : bounds.bottom + 24
        );
      }

      return;
    }

    if (state.stageDrag && event.pointerId === state.stageDrag.pointerId) {
      const currentPoint = toSvgPoint(event.clientX, event.clientY);
      if (!currentPoint) return;

      event.preventDefault();

      const dx = currentPoint.x - state.stageDrag.startPoint.x;
      const requestedBoundaryX = state.stageDrag.startBoundaryX + dx;
      const moved = applyBoundaryMoveFromSnapshot(
        state.stageDrag.boundaryIndex,
        requestedBoundaryX,
        state.stageDrag.snapshot
      );

      if (moved) {
        state.stageDrag.moved = true;
      }

      return;
    }

    if (state.blockDrag && event.pointerId === state.blockDrag.pointerId) {
      const currentPoint = toSvgPoint(event.clientX, event.clientY);
      if (!currentPoint) return;

      const block = getBlock(state.blockDrag.blockType, state.blockDrag.blockIndex);
      if (!block) return;

      event.preventDefault();

      const dx = currentPoint.x - state.blockDrag.startPoint.x;
      const dy = currentPoint.y - state.blockDrag.startPoint.y;
      const minWidth = state.config?.blocks?.minWidth ?? 28;
      const minHeight = getMinimumBlockHeight();
      const start = state.blockDrag.startBlock;

      if (state.blockDrag.mode === "move") {
        state.blockDrag.startBlocks.forEach((startBlock, key) => {
          const entry = getBlockEntryByKey(key);
          if (!entry) return;
          entry.block.xStart = roundToThree(startBlock.xStart + dx);
          entry.block.xEnd = roundToThree(startBlock.xEnd + dx);
          entry.block.y = roundToThree(startBlock.y + dy);
          entry.block.ageRange = describeBlockAgeRange(entry.blockType, entry.block);
          updateBlockVisual(entry.blockType, entry.blockIndex);
        });
        state.blockDrag.startNodes.forEach((startNode, key) => {
          const entry = getNodeEntryByKey(key);
          if (!entry) return;
          entry.node.x = roundToThree(startNode.x + dx);
          entry.node.yNode = roundToThree(startNode.yNode + dy);
          entry.node.ageRange = describeNodeAgeRange(entry.nodeType, entry.node);
          updateNodeVisual(entry.nodeType, entry.nodeIndex);
        });
      } else if (state.blockDrag.mode === "resize-start") {
        const nextStart = clamp(start.xStart + dx, Number.NEGATIVE_INFINITY, start.xEnd - minWidth);
        block.xStart = roundToThree(nextStart);
        block.xEnd = roundToThree(start.xEnd);
      } else if (state.blockDrag.mode === "resize-top") {
        const nextY = Math.min(start.y + dy, start.y + start.height - minHeight);
        const nextHeight = Math.max(minHeight, (start.y + start.height) - nextY);
        block.y = roundToThree(nextY);
        block.height = roundToThree(nextHeight);
      } else if (state.blockDrag.mode === "resize-bottom") {
        const nextHeight = Math.max(minHeight, start.height + dy);
        block.y = roundToThree(start.y);
        block.height = roundToThree(nextHeight);
      } else {
        const nextEnd = clamp(start.xEnd + dx, start.xStart + minWidth, Number.POSITIVE_INFINITY);
        block.xStart = roundToThree(start.xStart);
        block.xEnd = roundToThree(nextEnd);
      }

      if (state.blockDrag.mode !== "move") {
        block.ageRange = describeBlockAgeRange(state.blockDrag.blockType, block);
        updateBlockVisual(state.blockDrag.blockType, state.blockDrag.blockIndex);
      }
      updateDragReadout(
        describeBlockPlacement(state.blockDrag.blockType, block),
        (Number(block.xStart) + Number(block.xEnd)) / 2,
        Number(block.y) - 12
      );
      state.blockDrag.moved = true;
      return;
    }

    if (!state.drag || event.pointerId !== state.drag.pointerId) return;

    const currentPoint = toSvgPoint(event.clientX, event.clientY);
    if (!currentPoint) return;

    event.preventDefault();

    const dx = currentPoint.x - state.drag.startPoint.x;
    const dy = currentPoint.y - state.drag.startPoint.y;

    Array.from(state.selectedKeys).forEach((key) => {
      const parsed = parseNodeKey(key);
      if (!parsed) return;

      const node = getNode(parsed.nodeType, parsed.nodeIndex);
      const startPosition = state.drag.startPositions.get(key);
      if (!node || !startPosition) return;

      node.x = roundToThree(startPosition.x + dx);
      node.yNode = roundToThree(startPosition.yNode + dy);
      node.ageRange = describeNodeAgeRange(parsed.nodeType, node);
      updateNodeVisual(parsed.nodeType, parsed.nodeIndex);
    });

    state.drag.startBlocks.forEach((startBlock, key) => {
      const entry = getBlockEntryByKey(key);
      if (!entry) return;
      entry.block.xStart = roundToThree(startBlock.xStart + dx);
      entry.block.xEnd = roundToThree(startBlock.xEnd + dx);
      entry.block.y = roundToThree(startBlock.y + dy);
      entry.block.ageRange = describeBlockAgeRange(entry.blockType, entry.block);
      updateBlockVisual(entry.blockType, entry.blockIndex);
    });

    state.drag.moved = true;
    updateNodeSelectionPanel();

    const primary = getPrimarySelection();
    if (primary) {
      updateDragReadout(
        describeNodePlacement(primary.nodeType, primary.node),
        Number(primary.node.x),
        Number(primary.node.yNode) - 18
      );
    }
  }

  function onSvgPointerUp(event) {
    if (state.mainAxisDrag && event.pointerId === state.mainAxisDrag.pointerId) {
      if (state.svg && typeof state.svg.releasePointerCapture === "function") {
        try {
          state.svg.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore pointer release failures.
        }
      }
      finishMainAxisDrag();
      return;
    }

    if (state.yScaleDrag && event.pointerId === state.yScaleDrag.pointerId) {
      if (state.svg && typeof state.svg.releasePointerCapture === "function") {
        try {
          state.svg.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore pointer release failures.
        }
      }
      finishYScaleDrag();
      return;
    }

    if (state.stageDrag && event.pointerId === state.stageDrag.pointerId) {
      if (state.svg && typeof state.svg.releasePointerCapture === "function") {
        try {
          state.svg.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore pointer release failures.
        }
      }
      finishStageDrag();
      return;
    }

    if (state.blockDrag && event.pointerId === state.blockDrag.pointerId) {
      if (state.svg && typeof state.svg.releasePointerCapture === "function") {
        try {
          state.svg.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Ignore pointer release failures.
        }
      }
      finishBlockDrag();
      return;
    }

    if (!state.drag || event.pointerId !== state.drag.pointerId) return;

    if (state.svg && typeof state.svg.releasePointerCapture === "function") {
      try {
        state.svg.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer release failures.
      }
    }

    finishDrag();
  }

  function onSvgClick(event) {
    if (!state.svg) return;

    if (state.suppressNextClickEditor) {
      state.suppressNextClickEditor = false;
      return;
    }

    if (event.target.closest(".stage-boundary-hitbox, .stage-boundary-handle")) return;

    const mainAxisTarget = event.target.closest(".main-axis-hitbox, .main-axis-line");
    if (mainAxisTarget && state.svg.contains(mainAxisTarget)) {
      openMainAxisSettingsEditor(event);
      return;
    }

    const blockGroup = event.target.closest(".editable-range");
    if (blockGroup && state.svg.contains(blockGroup)) {
      if (!event.shiftKey) {
        const blockType = blockGroup.dataset.blockType;
        const blockIndex = Number(blockGroup.dataset.blockIndex);
        if ((blockType === "human" || blockType === "mouse") && Number.isInteger(blockIndex)) {
          openBlockSettingsEditor(blockType, blockIndex, event);
        }
      }
      return;
    }

    const nodeGroup = event.target.closest(".editable-node");
    if (nodeGroup && state.svg.contains(nodeGroup)) {
      if (!event.shiftKey) {
        const nodeType = nodeGroup.dataset.nodeType;
        const nodeIndex = Number(nodeGroup.dataset.nodeIndex);
        if ((nodeType === "human" || nodeType === "mouse") && Number.isInteger(nodeIndex)) {
          openNodeSettingsEditor(nodeType, nodeIndex, event);
        }
      }
      return;
    }

    if (event.target.closest(".stage-hitbox")) return;

    if (!event.shiftKey) {
      clearAllSelections();
      createStatus("Selection cleared.");
    }
  }

  function onSvgDoubleClick(event) {
    if (!state.svg) return;

    const mainAxisTarget = event.target.closest(".main-axis-hitbox, .main-axis-line");
    if (mainAxisTarget && state.svg.contains(mainAxisTarget)) {
      event.preventDefault();
      event.stopPropagation();
      openMainAxisSettingsEditor(event);
      return;
    }

    const blockGroup = event.target.closest(".editable-range");
    if (blockGroup && state.svg.contains(blockGroup)) {
      event.preventDefault();
      event.stopPropagation();
      openBlockSettingsFromEvent(event);
      return;
    }

    const nodeGroup = event.target.closest(".editable-node");
    if (nodeGroup && state.svg.contains(nodeGroup)) {
      event.preventDefault();
      event.stopPropagation();
      const nodeType = nodeGroup.dataset.nodeType;
      const nodeIndex = Number(nodeGroup.dataset.nodeIndex);
      if ((nodeType === "human" || nodeType === "mouse") && Number.isInteger(nodeIndex)) {
        openNodeSettingsEditor(nodeType, nodeIndex, event);
      }
      return;
    }

    const stageTarget = event.target.closest(".stage-hitbox, .stage-window-label");
    if (stageTarget && state.svg.contains(stageTarget)) {
      event.preventDefault();
      event.stopPropagation();
      const stageIndex = Number(stageTarget.dataset.stageIndex);
      if (Number.isInteger(stageIndex)) {
        openStageSettingsEditor(stageIndex, event);
      }
      return;
    }

    if (event.target === state.svg && openBlockSettingsFromEvent(event, true)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const text = event.target.closest("text");
    if (!text || !state.svg.contains(text)) return;

    event.preventDefault();
    event.stopPropagation();

    const currentText = text.textContent || "";
    openFloatingEditor({
      title: "Edit text",
      fields: [
        { name: "text", label: "Text", type: "text" },
      ],
      values: { text: currentText },
      saveLabel: "Apply",
      anchorPoint: eventToViewportPoint(event),
      onSave: (values) => {
        applyTextEdit(text, values.text ?? "");
        createStatus("Updated text.");
        return true;
      },
    });
  }

  function resetKeyNudge() {
    state.keyNudge.key = null;
    state.keyNudge.repeatCount = 0;
  }

  function getKeyboardNudgeStep(event) {
    const isSameKey = state.keyNudge.key === event.key;
    if (!event.repeat || !isSameKey) {
      state.keyNudge.key = event.key;
      state.keyNudge.repeatCount = 0;
    } else {
      state.keyNudge.repeatCount += 1;
    }

    const baseStep = event.shiftKey ? 8 : 1;
    const acceleration = 1 + Math.floor(state.keyNudge.repeatCount / 4);
    return baseStep * acceleration;
  }

  function nudgeSelectedBlocks(dx, dy) {
    const entries = getSelectedBlockEntries();
    if (!entries.length) return false;

    entries.forEach((entry) => {
      entry.block.xStart = roundToThree(Number(entry.block.xStart) + dx);
      entry.block.xEnd = roundToThree(Number(entry.block.xEnd) + dx);
      entry.block.y = roundToThree(Number(entry.block.y) + dy);
      entry.block.ageRange = describeBlockAgeRange(entry.blockType, entry.block);
      updateBlockVisual(entry.blockType, entry.blockIndex);
    });

    renderInspector();
    createStatus(`Nudged ${entries.length === 1 ? "range block" : "range blocks"} by (${dx}, ${dy}).`);
    return true;
  }

  function nudgeSelectedBoundary(dx) {
    if (!Number.isInteger(state.selectedBoundaryIndex)) return false;
    const currentX = getStageBoundaryX(state.selectedBoundaryIndex);
    const snapshot = captureBoundarySnapshot(state.selectedBoundaryIndex);
    if (currentX === null || !snapshot) return false;

    const moved = applyBoundaryMoveFromSnapshot(
      state.selectedBoundaryIndex,
      currentX + dx,
      snapshot
    );

    if (moved) {
      renderInspector();
      createStatus(`Moved stage boundary by ${dx > 0 ? "+" : ""}${dx}.`);
    }
    return moved;
  }

  function nudgeMainAxis(dx, dy) {
    if (!state.selectedMainAxis || !state.config?.mainAxis) return false;

    const snapshot = snapshotVerticalLayout();

    if (dx) {
      state.config.mainAxis.x1 = roundToThree(Number(state.config.mainAxis.x1) + dx);
      state.config.mainAxis.x2 = roundToThree(Number(state.config.mainAxis.x2) + dx);
    }

    if (dy) {
      const currentY = Number(snapshot.mainAxis?.y ?? state.config.mainAxis.y);
      applyCenterAxisMoveFromSnapshot(currentY + dy, snapshot);
    }

    updateMainAxisVisual();
    updateRangeAxesVisuals();
    createStatus(`Moved center arrow by (${dx}, ${dy}).`);
    return true;
  }

  function removeActiveSelection() {
    if (state.selectedBlockKeys.size) {
      return removeSelectedBlocks();
    }

    if (state.selectedKeys.size) {
      onRemoveSelectedArrows();
      return true;
    }

    if (Number.isInteger(state.selectedStageIndex)) {
      return removeStageAt(state.selectedStageIndex);
    }

    if (Number.isInteger(state.selectedBoundaryIndex)) {
      createStatus("Select a background rather than a boundary if you want to remove a stage.", true);
      return false;
    }

    if (state.selectedMainAxis) {
      createStatus("The center arrow is required and cannot be deleted.", true);
      return false;
    }

    return false;
  }

  function onDocumentKeyUp(event) {
    if (event.key === state.keyNudge.key) {
      resetKeyNudge();
    }
  }

  function applyTimelineViewport() {
    const figure = state.ui?.timelineFigure;
    if (!figure) return;

    const zoomPercent = `${Math.round(state.viewport.zoom * 100)}%`;
    figure.style.transformOrigin = "0 0";
    figure.style.transform = `translate(${state.viewport.panX}px, ${state.viewport.panY}px) scale(${state.viewport.zoom})`;
    figure.style.width = state.viewport.zoom > 1 ? `${state.viewport.zoom * 100}%` : "";
    figure.dataset.timelineZoom = zoomPercent;
    if (state.ui?.zoomReset) {
      state.ui.zoomReset.textContent = zoomPercent;
      state.ui.zoomReset.setAttribute("aria-label", `Timeline zoom ${zoomPercent}`);
    }
  }

  function setTimelineZoom(nextZoom) {
    state.viewport.zoom = clamp(nextZoom, 0.35, 3);
    applyTimelineViewport();
    createStatus(`Zoom ${Math.round(state.viewport.zoom * 100)}%.`);
  }

  function resetTimelineView() {
    state.viewport.zoom = 1;
    state.viewport.panX = 0;
    state.viewport.panY = 0;
    state.viewport.drag = null;
    applyTimelineViewport();
    createStatus("Reset timeline view.");
  }

  function onTimelineWheel(event) {
    if (!event.ctrlKey) return;

    event.preventDefault();
    setTimelineZoom(state.viewport.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  function onTimelineViewportPointerDown(event) {
    if (!event.ctrlKey || event.button !== 0) return;

    state.viewport.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: state.viewport.panX,
      panY: state.viewport.panY,
    };
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    state.svg?.classList.add("is-panning");
    event.preventDefault();
  }

  function onTimelineViewportPointerMove(event) {
    const drag = state.viewport.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    state.viewport.panX = roundToThree(drag.panX + event.clientX - drag.startX);
    state.viewport.panY = roundToThree(drag.panY + event.clientY - drag.startY);
    applyTimelineViewport();
    event.preventDefault();
  }

  function onTimelineViewportPointerUp(event) {
    const drag = state.viewport.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    state.viewport.drag = null;
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    state.svg?.classList.remove("is-panning");
    createStatus("Moved timeline view.");
    event.preventDefault();
  }

  function recordHistory(label, options = {}) {
    if (state.history.restoring || !state.config) return;

    normalizeTimelineTextSizes();
    syncNodesToMainAxis();

    const entry = {
      label: label || "Updated timeline",
      at: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      snapshot: deepClone(state.config),
    };

    if (options.replace && state.history.entries.length) {
      const replaceIndex = state.history.index >= 0 ? state.history.index : state.history.entries.length - 1;
      state.history.entries[replaceIndex] = entry;
      state.history.index = replaceIndex;
    } else {
      state.history.entries = state.history.entries.slice(0, state.history.index + 1);
      state.history.entries.push(entry);
      state.history.index = state.history.entries.length - 1;
    }

    renderHistoryPanel();
  }

  function renderHistoryPanel() {
    if (!state.ui?.historyList) return;

    state.ui.historyList.innerHTML = "";
    state.history.entries.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = `timeline-history-item${index === state.history.index ? " is-active" : ""}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "timeline-history-button";
      button.dataset.historyIndex = String(index);
      button.innerHTML = `<span class="timeline-history-label">${entry.label}</span><span class="timeline-history-meta">${entry.at}</span>`;

      item.appendChild(button);
      state.ui.historyList.appendChild(item);
    });
  }

  function restoreHistory(index, action = "restore") {
    if (!Number.isInteger(index) || index < 0 || index >= state.history.entries.length) {
      createStatus("No more history at that point.", true);
      return;
    }

    const entry = state.history.entries[index];
    state.history.restoring = true;
    state.history.index = index;
    state.config = deepClone(entry.snapshot);
    window.TIMELINE_CONFIG = state.config;
    normalizeTimelineTextSizes();
    syncNodesToMainAxis();

    if (typeof window.initializeTimeline === "function") {
      window.initializeTimeline();
    }

    state.history.restoring = false;
    renderHistoryPanel();
    createStatus(`${action === "undo" ? "Undo" : action === "redo" ? "Redo" : "Restored"}: ${entry.label}.`);
  }

  function setHistoryPanelOpen(open) {
    if (!state.ui?.historyPanel) return;

    state.ui.historyPanel.hidden = !open;
    state.ui.historyToggle?.setAttribute("aria-expanded", String(Boolean(open)));
    if (open) renderHistoryPanel();
  }

  function toggleHistoryPanel() {
    setHistoryPanelOpen(state.ui?.historyPanel?.hidden !== false);
  }

  function onHistoryListClick(event) {
    const button = event.target.closest("[data-history-index]");
    if (!button) return;

    restoreHistory(Number(button.dataset.historyIndex));
  }

    function onDocumentKeyDown(event) {
      if (event.key === "Escape" && state.ui?.floatingRoot && !state.ui.floatingRoot.hidden) {
        event.preventDefault();
        closeFloatingEditor();
        return;
      }

      if (event.key === "Escape" && state.ui?.historyPanel && !state.ui.historyPanel.hidden) {
        event.preventDefault();
        setHistoryPanelOpen(false);
        return;
      }

      if (event.key === "Escape") {
        const openExportMenu = document.querySelector("[data-export-menu][open]");
        if (openExportMenu) {
          event.preventDefault();
          openExportMenu.removeAttribute("open");
          return;
        }
      }

      const key = String(event.key || "").toLowerCase();
      const wantsUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && key === "z";
      const wantsRedo = (event.ctrlKey || event.metaKey) && (key === "y" || (event.shiftKey && key === "z"));
      if (wantsUndo || wantsRedo) {
        event.preventDefault();
        restoreHistory(state.history.index + (wantsRedo ? 1 : -1), wantsRedo ? "redo" : "undo");
        return;
      }

      const target = event.target;
    if (target && target.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      if (!state.selectedKeys.size && !state.selectedBlockKeys.size && state.selectedStageIndex === null && state.selectedBoundaryIndex === null && !state.selectedMainAxis) {
        return;
      }
      event.preventDefault();
      removeActiveSelection();
      return;
    }

    if (!state.selectedKeys.size && !state.selectedBlockKeys.size && state.selectedBoundaryIndex === null && !state.selectedMainAxis) {
      return;
    }

    let dx = 0;
    let dy = 0;
    const step = getKeyboardNudgeStep(event);

    switch (event.key) {
      case "ArrowLeft":
        dx = -step;
        break;
      case "ArrowRight":
        dx = step;
        break;
      case "ArrowUp":
        dy = -step;
        break;
      case "ArrowDown":
        dy = step;
        break;
      default:
        return;
    }

    event.preventDefault();

    let handled = false;

    if (state.selectedKeys.size) {
      applyMovement(dx, dy, `Nudged selection by (${dx}, ${dy}).`);
      handled = true;
    }

    if (state.selectedBlockKeys.size) {
      handled = nudgeSelectedBlocks(dx, dy) || handled;
    }

    if (!dy && state.selectedBoundaryIndex !== null) {
      handled = nudgeSelectedBoundary(dx) || handled;
    }

    if (state.selectedMainAxis) {
      handled = nudgeMainAxis(dx, dy) || handled;
    }

    if (!handled) {
      createStatus("Select a block, arrow, boundary, or center arrow first.", true);
    }
  }

  function parseInspectorRowId(rowId) {
    if (!rowId || typeof rowId !== "string") return null;

    if (rowId.startsWith("stage:")) {
      return {
        kind: "stage",
        stageIndex: Number(rowId.split(":")[1]),
      };
    }

    if (rowId.startsWith("block:")) {
      const parts = rowId.split(":");
      if (parts.length !== 3) return null;

      return {
        kind: "block",
        blockType: parts[1],
        blockIndex: Number(parts[2]),
      };
    }

    if (rowId.startsWith("arrow:")) {
      const parts = rowId.split(":");
      if (parts.length !== 3) return null;

      return {
        kind: "arrow",
        nodeType: parts[1],
        nodeIndex: Number(parts[2]),
      };
    }

    return null;
  }

  function buildInspectorRows() {
    const rows = [];

    const stages = getStages();
    stages.forEach((stage, index) => {
      const ageValues = getStageAgeValues(index);
      rows.push({
        id: `stage:${index}`,
        kind: "stage",
        group: "Background",
        label: stage.stageName || inferStageName(stage, index),
        x: stage.x,
        y: stage.width,
        xLabel: ageValues.humanStartAge || roundToThree(stage.x),
        yLabel: `${ageValues.humanEndAge || "end"} / w=${roundToThree(stage.width)}`,
        searchText: `${stage.stageName || ""} ${stage.humanLabel || ""} ${stage.mouseLabel || ""} ${stage.fill || ""}`.toLowerCase(),
      });
    });

    getAllNodeEntries().forEach((entry) => {
      const rangeIndex = entry.nodeType === "mouse" ? 1 : 0;
      rows.push({
        id: `arrow:${entry.nodeType}:${entry.nodeIndex}`,
        kind: "arrow",
        group: entry.nodeType === "human" ? "Human" : "Mouse",
        label: entry.node.title,
        x: entry.node.x,
        y: entry.node.yNode,
        xLabel: describeTimelineX(Number(entry.node.x), rangeIndex),
        yLabel: `y=${roundToThree(entry.node.yNode)}`,
        searchText: `${entry.node.title || ""} ${entry.node.ageRange || ""} ${entry.node.stroke || ""}`.toLowerCase(),
      });
    });

    getAllBlockEntries().forEach((entry) => {
      const rangeIndex = entry.blockType === "mouse" ? 1 : 0;
      const xStart = Math.min(Number(entry.block.xStart), Number(entry.block.xEnd));
      const xEnd = Math.max(Number(entry.block.xStart), Number(entry.block.xEnd));
      rows.push({
        id: `block:${entry.blockType}:${entry.blockIndex}`,
        kind: "block",
        group: entry.blockType === "human" ? "Human" : "Mouse",
        label: entry.block.title || "Range",
        x: xStart,
        y: xEnd,
        xLabel: describeTimelineX(xStart, rangeIndex),
        yLabel: `end=${describeTimelineX(xEnd, rangeIndex)}`,
        searchText: `${entry.block.title || ""} ${entry.block.ageRange || ""} ${entry.block.stroke || ""}`.toLowerCase(),
      });
    });

    return rows;
  }

  function compareRows(a, b, key) {
    const normalizeString = (value) => String(value || "").toLowerCase();

    if (key === "x" || key === "y") {
      const av = Number(a[key] ?? 0);
      const bv = Number(b[key] ?? 0);
      return av - bv;
    }

    return normalizeString(a[key]).localeCompare(normalizeString(b[key]));
  }

  function getExpandedArrowEditorHtml(nodeType, nodeIndex) {
    const node = getNode(nodeType, nodeIndex);
    if (!node) return "";
    const rangeIndex = nodeType === "mouse" ? 1 : 0;

    const markerId = getNodeMarkerId(nodeType, node);
    const markerOptions = Object.values(state.config?.arrows || {})
      .map((arrow) => {
        const selected = arrow.id === markerId ? " selected" : "";
        return `<option value="${escapeHtml(arrow.id)}"${selected}>${escapeHtml(arrow.id)}</option>`;
      })
      .join("");

    return `
      <div class="inspector-editor-grid">
        <label class="editor-field">
          <span>Title</span>
          <input type="text" data-inspector-field="title" value="${escapeHtml(node.title || "")}" />
        </label>
        <label class="editor-field">
          <span>Age label</span>
          <input type="text" data-inspector-field="ageRange" value="${escapeHtml(node.ageRange || "")}" />
        </label>
        <label class="editor-field">
          <span>Age / time</span>
          <input type="text" data-inspector-field="x" value="${escapeHtml(describeTimelineX(Number(node.x), rangeIndex))}" />
        </label>
        <label class="editor-field">
          <span>Y</span>
          <input type="number" step="1" data-inspector-field="yNode" value="${escapeHtml(roundToThree(node.yNode))}" />
        </label>
        ${getInspectorColorFieldHtml("Color", "stroke", node.stroke || "")}
        <label class="editor-field">
          <span>Width</span>
          <input type="number" min="0.1" step="0.1" data-inspector-field="strokeWidth" value="${escapeHtml(node.strokeWidth ?? state.config.nodes.connectorStrokeWidth)}" />
        </label>
        <label class="editor-field">
          <span>Arrowhead</span>
          <select data-inspector-field="markerId">${markerOptions}</select>
        </label>
        <label class="editor-field">
          <span>Arrowhead size</span>
          <input type="number" min="4" max="20" step="1" data-inspector-field="markerSize" value="${escapeHtml(getArrowConfigById(markerId)?.markerWidth ?? "")}" />
        </label>
      </div>
      <div class="inspector-editor-actions">
        <button type="button" class="editor-btn" data-inspector-action="arrow-save" data-row-id="arrow:${escapeHtml(nodeType)}:${nodeIndex}">Save arrow</button>
        <button type="button" class="editor-btn editor-btn-ghost" data-inspector-action="arrow-focus" data-row-id="arrow:${escapeHtml(nodeType)}:${nodeIndex}">Select arrow</button>
        <button type="button" class="editor-btn editor-btn-danger" data-inspector-action="arrow-remove" data-row-id="arrow:${escapeHtml(nodeType)}:${nodeIndex}">Remove arrow</button>
      </div>
    `;
  }

  function getExpandedStageEditorHtml(stageIndex) {
    const stage = getStage(stageIndex);
    if (!stage) return "";
    const ageValues = getStageAgeValues(stageIndex);

    return `
      <div class="inspector-editor-grid">
        <label class="editor-field">
          <span>Stage name (top bracket)</span>
          <input type="text" data-inspector-field="stageName" value="${escapeHtml(stage.stageName || inferStageName(stage, stageIndex))}" />
        </label>
        <label class="editor-field">
          <span>Human label</span>
          <input type="text" data-inspector-field="humanLabel" value="${escapeHtml(stage.humanLabel || "")}" />
        </label>
        <label class="editor-field">
          <span>Mouse label</span>
          <input type="text" data-inspector-field="mouseLabel" value="${escapeHtml(stage.mouseLabel || "")}" />
        </label>
        <label class="editor-field">
          <span>Human start age</span>
          <input type="text" data-inspector-field="humanStartAge" value="${escapeHtml(ageValues.humanStartAge)}" />
        </label>
        <label class="editor-field">
          <span>Human end age</span>
          <input type="text" data-inspector-field="humanEndAge" value="${escapeHtml(ageValues.humanEndAge)}" />
        </label>
        <label class="editor-field">
          <span>Mouse start age</span>
          <input type="text" data-inspector-field="mouseStartAge" value="${escapeHtml(ageValues.mouseStartAge)}" />
        </label>
        <label class="editor-field">
          <span>Mouse end age</span>
          <input type="text" data-inspector-field="mouseEndAge" value="${escapeHtml(ageValues.mouseEndAge)}" />
        </label>
        ${getInspectorColorFieldHtml("Fill color", "fill", stage.fill || "")}
        <label class="editor-field">
          <span>Opacity</span>
          <input type="number" min="0" max="1" step="0.01" data-inspector-field="opacity" value="${escapeHtml(stage.opacity ?? 0.22)}" />
        </label>
      </div>
      <div class="inspector-editor-actions">
        <button type="button" class="editor-btn" data-inspector-action="stage-save" data-row-id="stage:${stageIndex}">Save stage</button>
        <button type="button" class="editor-btn editor-btn-ghost" data-inspector-action="stage-focus" data-row-id="stage:${stageIndex}">Select stage</button>
      </div>
    `;
  }

  function getExpandedBlockEditorHtml(blockType, blockIndex) {
    const block = getBlock(blockType, blockIndex);
    if (!block) return "";
    const rangeIndex = blockType === "mouse" ? 1 : 0;

    return `
      <div class="inspector-editor-grid">
        <label class="editor-field">
          <span>Title</span>
          <input type="text" data-inspector-field="title" value="${escapeHtml(block.title || "")}" />
        </label>
        <label class="editor-field">
          <span>Age label</span>
          <input type="text" data-inspector-field="ageRange" value="${escapeHtml(block.ageRange || "")}" />
        </label>
        <label class="editor-field">
          <span>Age / time start</span>
          <input type="text" data-inspector-field="xStart" value="${escapeHtml(describeTimelineX(Number(block.xStart), rangeIndex))}" />
        </label>
        <label class="editor-field">
          <span>Age / time end</span>
          <input type="text" data-inspector-field="xEnd" value="${escapeHtml(describeTimelineX(Number(block.xEnd), rangeIndex))}" />
        </label>
        <label class="editor-field">
          <span>Y</span>
          <input type="number" step="1" data-inspector-field="y" value="${escapeHtml(roundToThree(block.y))}" />
        </label>
        <label class="editor-field">
          <span>Height</span>
          <input type="number" min="${escapeHtml(getMinimumBlockHeight())}" step="1" data-inspector-field="height" value="${escapeHtml(getNormalizedBlockHeight(block.height))}" />
        </label>
        ${getInspectorColorFieldHtml("Fill", "fill", block.fill || "")}
        ${getInspectorColorFieldHtml("Stroke", "stroke", block.stroke || "")}
      </div>
      <div class="inspector-editor-actions">
        <button type="button" class="editor-btn" data-inspector-action="block-save" data-row-id="block:${escapeHtml(blockType)}:${blockIndex}">Save range block</button>
        <button type="button" class="editor-btn editor-btn-ghost" data-inspector-action="block-focus" data-row-id="block:${escapeHtml(blockType)}:${blockIndex}">Select block</button>
        <button type="button" class="editor-btn editor-btn-danger" data-inspector-action="block-remove" data-row-id="block:${escapeHtml(blockType)}:${blockIndex}">Remove block</button>
      </div>
    `;
  }

  function renderSortButtons() {
    if (!state.ui?.inspectorSortButtons) return;

    state.ui.inspectorSortButtons.forEach((button) => {
      if (!button.dataset.baseLabel) {
        button.dataset.baseLabel = button.textContent || "";
      }

      const key = button.dataset.inspectorSort;
      const active = key === state.inspector.sortKey;
      const suffix = active ? (state.inspector.sortDirection === "asc" ? " (asc)" : " (desc)") : "";
      button.textContent = `${button.dataset.baseLabel}${suffix}`;
    });
  }

  function renderInspector() {
    if (!state.ui || !state.ui.inspectorBody) return;

    const rows = buildInspectorRows();
    const filterType = state.inspector.filterType;
    const search = state.inspector.search.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (filterType !== "all" && row.kind !== filterType) return false;
      if (!search) return true;
      return (
        row.label.toLowerCase().includes(search)
        || row.group.toLowerCase().includes(search)
        || row.searchText.includes(search)
      );
    });

    filtered.sort((a, b) => {
      const direction = state.inspector.sortDirection === "asc" ? 1 : -1;
      return compareRows(a, b, state.inspector.sortKey) * direction;
    });

    state.ui.inspectorBody.innerHTML = "";

    filtered.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "inspector-row";
      tr.dataset.rowId = row.id;

      const parsedId = parseInspectorRowId(row.id);
      if (parsedId && parsedId.kind === "arrow") {
        const key = `${parsedId.nodeType}:${parsedId.nodeIndex}`;
        if (state.selectedKeys.has(key)) {
          tr.classList.add("is-selected");
        }
      } else if (parsedId && parsedId.kind === "block") {
        const blockKey = `${parsedId.blockType}:${parsedId.blockIndex}`;
        if (state.selectedBlockKey === blockKey) {
          tr.classList.add("is-selected");
        }
      }

      if (state.inspector.expandedId === row.id) {
        tr.classList.add("is-expanded");
      }

        const kindClass = row.kind === "arrow"
          ? "inspector-kind-arrow"
          : (row.kind === "block" ? "inspector-kind-block" : "inspector-kind-stage");
      const yLabel = row.yLabel || (row.kind === "stage"
        ? `w=${roundToThree(row.y)}`
        : (row.kind === "block" ? `end=${roundToThree(row.y)}` : `y=${roundToThree(row.y)}`));
      const xLabel = row.xLabel || roundToThree(row.x);

      tr.innerHTML = `
        <td data-label="Type"><span class="inspector-kind ${kindClass}">${escapeHtml(row.kind)}</span></td>
        <td data-label="Group">${escapeHtml(row.group)}</td>
        <td data-label="Label">${escapeHtml(row.label)}</td>
        <td data-label="Age / Start">${escapeHtml(xLabel)}</td>
        <td data-label="Y / End age / Width">${escapeHtml(yLabel)}</td>
      `;

      state.ui.inspectorBody.appendChild(tr);

      if (state.inspector.expandedId === row.id) {
        const expandTr = document.createElement("tr");
        expandTr.className = "inspector-expand";

        const expandTd = document.createElement("td");
        expandTd.colSpan = 5;

        const content = document.createElement("div");
        content.className = "inspector-expand-content";
        content.dataset.inspectorEditor = row.id;

        if (row.kind === "arrow") {
          const parsed = parseInspectorRowId(row.id);
          content.innerHTML = getExpandedArrowEditorHtml(parsed.nodeType, parsed.nodeIndex);
        } else if (row.kind === "block") {
          const parsed = parseInspectorRowId(row.id);
          content.innerHTML = getExpandedBlockEditorHtml(parsed.blockType, parsed.blockIndex);
        } else {
          const parsed = parseInspectorRowId(row.id);
          content.innerHTML = getExpandedStageEditorHtml(parsed.stageIndex);
        }

        expandTd.appendChild(content);
        expandTr.appendChild(expandTd);
        state.ui.inspectorBody.appendChild(expandTr);
      }
    });

    state.ui.inspectorEmpty.hidden = filtered.length > 0;
    renderSortButtons();
  }

  function readInspectorField(container, fieldName) {
    const element = container.querySelector(`[data-inspector-field="${fieldName}"]`);
    return element ? element.value : "";
  }

  function onInspectorAction(event) {
    const colorButton = event.target.closest("[data-inspector-color-field]");
    if (colorButton) {
      event.preventDefault();
      const container = colorButton.closest(".inspector-expand-content");
      const fieldName = colorButton.dataset.inspectorColorField;
      const input = container?.querySelector(`[data-inspector-field="${fieldName}"]`);
      if (input) {
        input.value = colorButton.dataset.inspectorColorValue || "";
        input.focus();
      }
      return true;
    }

    const actionButton = event.target.closest("[data-inspector-action]");
    if (!actionButton) return false;

    event.preventDefault();

    const action = actionButton.dataset.inspectorAction;
    const rowId = actionButton.dataset.rowId;
    const parsed = parseInspectorRowId(rowId);
    if (!parsed) return true;

    const editorContainer = actionButton.closest(".inspector-expand-content");

    if (action === "arrow-focus" && parsed.kind === "arrow") {
      setSelection([`${parsed.nodeType}:${parsed.nodeIndex}`]);
      createStatus("Arrow selected from table.");
      return true;
    }

    if (action === "arrow-remove" && parsed.kind === "arrow") {
      removeArrowAt(parsed.nodeType, parsed.nodeIndex);
      return true;
    }

    if (action === "arrow-save" && parsed.kind === "arrow") {
      const node = getNode(parsed.nodeType, parsed.nodeIndex);
      if (!node || !editorContainer) return true;

      const rangeIndex = parsed.nodeType === "mouse" ? 1 : 0;
      const x = resolveTimelineInputToX(readInspectorField(editorContainer, "x"), rangeIndex, node.x);
      const yNode = toNumber(readInspectorField(editorContainer, "yNode"));
      const strokeWidth = toNumber(readInspectorField(editorContainer, "strokeWidth"));
      const markerId = readInspectorField(editorContainer, "markerId").trim();
      const markerSize = toNumber(readInspectorField(editorContainer, "markerSize"));

      node.title = readInspectorField(editorContainer, "title");
      node.ageRange = readInspectorField(editorContainer, "ageRange");
      node.stroke = readInspectorField(editorContainer, "stroke").trim() || node.stroke;

      node.x = roundToThree(x);
      if (yNode !== null) node.yNode = roundToThree(yNode);
      if (strokeWidth !== null && strokeWidth > 0) node.strokeWidth = strokeWidth;
      if (markerId) node.markerId = markerId;
      if (markerId && markerSize !== null && markerSize > 0) {
        const marker = getArrowConfigById(markerId);
        if (marker) {
          marker.markerWidth = markerSize;
          marker.markerHeight = markerSize;
          marker.refX = markerSize;
          marker.refY = markerSize / 2;
          marker.path = buildArrowPath(markerSize, markerSize);
          applyMarkerVisualUpdate(marker.id);
        }
      }

      updateNodeVisual(parsed.nodeType, parsed.nodeIndex);
      updateNodeSelectionPanel();
      renderInspector();
      createStatus("Arrow updated from table.");
      return true;
    }

    if (action === "block-focus" && parsed.kind === "block") {
      setSelectedBlock(`${parsed.blockType}:${parsed.blockIndex}`);
      createStatus("Range block selected from table.");
      return true;
    }

    if (action === "block-remove" && parsed.kind === "block") {
      removeBlockAt(parsed.blockType, parsed.blockIndex);
      return true;
    }

    if (action === "block-save" && parsed.kind === "block") {
      const block = getBlock(parsed.blockType, parsed.blockIndex);
      if (!block || !editorContainer) return true;

      const rangeIndex = parsed.blockType === "mouse" ? 1 : 0;
      const xStart = resolveTimelineInputToX(readInspectorField(editorContainer, "xStart"), rangeIndex, block.xStart);
      const xEnd = resolveTimelineInputToX(readInspectorField(editorContainer, "xEnd"), rangeIndex, block.xEnd);
      const y = toNumber(readInspectorField(editorContainer, "y"));
      const height = toNumber(readInspectorField(editorContainer, "height"));

      block.title = readInspectorField(editorContainer, "title") || block.title;
      block.ageRange = readInspectorField(editorContainer, "ageRange");
      block.fill = readInspectorField(editorContainer, "fill").trim() || block.fill;
      block.stroke = readInspectorField(editorContainer, "stroke").trim() || block.stroke;
      block.titleFontSize = normalizePositiveNumber(block.titleFontSize, getDefaultBlockTitleFontSize());
      block.ageFontSize = normalizePositiveNumber(block.ageFontSize, getDefaultBlockAgeFontSize());

      block.xStart = roundToThree(xStart);
      block.xEnd = roundToThree(xEnd);
      if (y !== null) block.y = roundToThree(y);
      block.height = getNormalizedBlockHeight(height);

      updateBlockVisual(parsed.blockType, parsed.blockIndex);
      renderInspector();
      createStatus("Range block updated from table.");
      return true;
    }

    if (action === "stage-focus" && parsed.kind === "stage") {
      setSelectedStage(parsed.stageIndex);
      createStatus("Stage selected from table.");
      return true;
    }

    if (action === "stage-save" && parsed.kind === "stage") {
      const stage = getStage(parsed.stageIndex);
      if (!stage || !editorContainer) return true;

      const opacity = toNumber(readInspectorField(editorContainer, "opacity"));
      stage.stageName = readInspectorField(editorContainer, "stageName").trim() || stage.stageName || inferStageName(stage, parsed.stageIndex);
      stage.humanLabel = readInspectorField(editorContainer, "humanLabel").trim() || stage.humanLabel;
      stage.mouseLabel = readInspectorField(editorContainer, "mouseLabel").trim() || stage.mouseLabel;
      stage.fill = readInspectorField(editorContainer, "fill").trim() || stage.fill;
      applyStageAgeValues(parsed.stageIndex, {
        humanStartAge: readInspectorField(editorContainer, "humanStartAge"),
        humanEndAge: readInspectorField(editorContainer, "humanEndAge"),
        mouseStartAge: readInspectorField(editorContainer, "mouseStartAge"),
        mouseEndAge: readInspectorField(editorContainer, "mouseEndAge"),
      });
      if (opacity !== null) {
        stage.opacity = clamp(opacity, 0, 1);
      }

      syncWindowLabelsFromStages();
      updateStageVisual(parsed.stageIndex);
      updateStagePanel();
      refreshStageOptions();
      renderInspector();
      refreshTimelineLegend();
      createStatus("Stage updated from table.");
      return true;
    }

    return true;
  }

  function onInspectorBodyClick(event) {
    if (onInspectorAction(event)) return;

    if (event.target.closest("input, select, textarea, button")) return;

    const row = event.target.closest("tr.inspector-row");
    if (!row) return;

    const rowId = row.dataset.rowId;
    if (!rowId) return;

    if (state.inspector.expandedId === rowId) {
      state.inspector.expandedId = null;
    } else {
      state.inspector.expandedId = rowId;
    }

    renderInspector();
  }

  function onInspectorSort(event) {
    const button = event.currentTarget;
    const key = button.dataset.inspectorSort;
    if (!key) return;

    if (state.inspector.sortKey === key) {
      state.inspector.sortDirection = state.inspector.sortDirection === "asc" ? "desc" : "asc";
    } else {
      state.inspector.sortKey = key;
      state.inspector.sortDirection = "asc";
    }

    renderInspector();
  }

  function buildStageOptionValues() {
    return getStages().map((stage, index) => ({
      value: String(index),
      label: `Stage ${index + 1}: ${stage.stageName || inferStageName(stage, index)}`,
    }));
  }

  function onInspectorAddOpen(event, addTypeOverride) {
    const addType = addTypeOverride || state.ui?.inspectorAddType?.value || "arrow";
    const stageOptions = buildStageOptionValues();
    const defaultStage = Number.isInteger(state.selectedStageIndex) ? String(state.selectedStageIndex) : (stageOptions[0]?.value || "0");
    const selectedStage = getStage(Number(defaultStage)) || getStage(0);
    const defaultBlockType = state.selectedBlockKey?.startsWith("mouse:") ? "mouse" : "human";
    const defaultNodeType = state.selectedKeys.size
      ? (getPrimarySelection()?.nodeType || "human")
      : defaultBlockType;

    if (addType === "stage") {
      openFloatingEditor({
        title: "Add stage",
        fields: [
          { name: "stageIndex", label: "Split this stage", type: "select", options: stageOptions },
          { name: "stageName", label: "Stage name", type: "text" },
          { name: "humanLabel", label: "Human label", type: "text" },
          { name: "mouseLabel", label: "Mouse label", type: "text" },
          { name: "humanBoundaryAge", label: "Human age at new boundary", type: "text" },
          { name: "mouseBoundaryAge", label: "Mouse age at new boundary", type: "text" },
          { name: "fill", label: "Fill", type: "text" },
          { name: "opacity", label: "Opacity", type: "number", min: 0, max: 1, step: 0.01 },
          { name: "splitPercent", label: "Split percent (20-80)", type: "number", min: 20, max: 80, step: 1 },
        ],
        values: {
          stageIndex: defaultStage,
          stageName: "New stage",
          humanLabel: "Human label",
          mouseLabel: "Mouse label",
          humanBoundaryAge: "new",
          mouseBoundaryAge: "new",
          fill: selectedStage?.fill || "var(--window-3)",
          opacity: String(selectedStage?.opacity ?? 0.22),
          splitPercent: "50",
        },
        saveLabel: "Add stage",
        anchorPoint: eventToViewportPoint(event),
        onSave: (values) => {
          const stageIndex = Number(values.stageIndex);
          if (!Number.isInteger(stageIndex)) {
            createStatus("Choose a valid base stage.", true);
            return false;
          }
          return addStageBySplitValues(stageIndex, values);
        },
      });
      return;
    }

    if (addType === "block") {
      openFloatingEditor({
        title: "Add range block",
        fields: [
          {
            name: "blockType",
            label: "Species",
            type: "select",
            options: [
              { value: "human", label: "Human" },
              { value: "mouse", label: "Mouse" },
            ],
          },
          { name: "stageIndex", label: "Stage", type: "select", options: stageOptions },
          { name: "title", label: "Title", type: "text" },
          { name: "ageRange", label: "Age label", type: "text" },
          { name: "xStart", label: "Age / time start (optional)", type: "text" },
          { name: "xEnd", label: "Age / time end (optional)", type: "text" },
          { name: "y", label: "Y (optional)", type: "number", step: 1 },
          { name: "height", label: "Height (optional)", type: "number", min: 6, step: 1 },
        ],
        values: {
          blockType: defaultBlockType,
          stageIndex: defaultStage,
          title: "New range",
          ageRange: "range",
          xStart: describeTimelineX(selectedStage ? selectedStage.x + (selectedStage.width * 0.2) : 180, defaultBlockType === "mouse" ? 1 : 0),
          xEnd: describeTimelineX(selectedStage ? selectedStage.x + (selectedStage.width * 0.8) : 280, defaultBlockType === "mouse" ? 1 : 0),
          y: selectedStage ? getDefaultBlockY(defaultBlockType, selectedStage) : "",
          height: getMinimumBlockHeight(),
        },
        saveLabel: "Add range block",
        anchorPoint: eventToViewportPoint(event),
        onSave: (values) => addRangeBlockWithValues(values),
      });
      return;
    }

    openFloatingEditor({
      title: "Add arrow",
      fields: [
        {
          name: "nodeType",
          label: "Species",
          type: "select",
          options: [
            { value: "human", label: "Human" },
            { value: "mouse", label: "Mouse" },
          ],
        },
        { name: "stageIndex", label: "Stage", type: "select", options: stageOptions },
        { name: "title", label: "Title", type: "text" },
        { name: "ageRange", label: "Age label", type: "text" },
        { name: "x", label: "Age / time (optional)", type: "text" },
        { name: "y", label: "Y (optional)", type: "number", step: 1 },
      ],
      values: {
        nodeType: defaultNodeType,
        stageIndex: defaultStage,
        title: "New milestone",
        ageRange: "Age range",
        x: describeTimelineX(selectedStage ? selectedStage.x + (selectedStage.width / 2) : 240, defaultNodeType === "mouse" ? 1 : 0),
        y: selectedStage ? getDefaultNodeY(defaultNodeType) : "",
      },
      saveLabel: "Add arrow",
      anchorPoint: eventToViewportPoint(event),
      onSave: (values) => onAddArrow(values),
    });
  }

  function bindSvg(svg) {
    if (state.svg === svg) {
      renderSelectionState();
      return;
    }

    if (state.svg) {
      state.svg.removeEventListener("pointerdown", onSvgPointerDown);
      state.svg.removeEventListener("pointermove", onSvgPointerMove);
      state.svg.removeEventListener("pointerup", onSvgPointerUp);
      state.svg.removeEventListener("pointercancel", onSvgPointerUp);
      state.svg.removeEventListener("click", onSvgClick);
      state.svg.removeEventListener("dblclick", onSvgDoubleClick);
    }

    state.svg = svg;
    if (!state.svg) return;

    state.svg.addEventListener("pointerdown", onSvgPointerDown);
    state.svg.addEventListener("pointermove", onSvgPointerMove);
    state.svg.addEventListener("pointerup", onSvgPointerUp);
    state.svg.addEventListener("pointercancel", onSvgPointerUp);
    state.svg.addEventListener("click", onSvgClick);
    state.svg.addEventListener("dblclick", onSvgDoubleClick);

    renderSelectionState();
  }

  function populateMarkerSelect() {
    if (!state.ui?.markerId || !state.config?.arrows) return;

    const markerSelect = state.ui.markerId;
    const current = markerSelect.value;
    markerSelect.innerHTML = "";

    Object.values(state.config.arrows).forEach((arrow) => {
      const option = document.createElement("option");
      option.value = arrow.id;
      option.textContent = arrow.id;
      markerSelect.appendChild(option);
    });

    if (!markerSelect.options.length) return;

    if (current && markerSelect.querySelector(`option[value="${current}"]`)) {
      markerSelect.value = current;
    } else {
      markerSelect.value = markerSelect.options[0].value;
    }

    updateMarkerFields(markerSelect.value);
  }

  function normalizeSelectedKeys() {
    const validKeys = new Set(getAllNodeEntries().map((entry) => entry.key));
    const next = new Set();

    Array.from(state.selectedKeys).forEach((key) => {
      if (validKeys.has(key)) {
        next.add(key);
      }
    });

    state.selectedKeys = next;

    const validBlockKeys = new Set(getAllBlockEntries().map((entry) => entry.key));
    if (!validBlockKeys.has(state.selectedBlockKey)) {
      state.selectedBlockKey = null;
    }
    state.selectedBlockKeys = new Set(
      Array.from(state.selectedBlockKeys).filter((key) => validBlockKeys.has(key))
    );
    if (!state.selectedBlockKeys.size && state.selectedBlockKey) {
      state.selectedBlockKeys = new Set([state.selectedBlockKey]);
    }
    if (state.selectedBlockKey && !state.selectedBlockKeys.has(state.selectedBlockKey)) {
      state.selectedBlockKey = state.selectedBlockKeys.values().next().value || null;
    }
    if (
      state.selectedBoundaryIndex !== null
      && (state.selectedBoundaryIndex < 0 || state.selectedBoundaryIndex >= Math.max(0, getStages().length - 1))
    ) {
      state.selectedBoundaryIndex = null;
    }
  }

  function bindUI() {
    if (!state.ui || state.ui.bound) return;

    if (state.ui.applyPosition) state.ui.applyPosition.addEventListener("click", onApplyExactPosition);
    if (state.ui.applyDelta) state.ui.applyDelta.addEventListener("click", onApplyDeltaMove);
    if (state.ui.applyArrowStyle) state.ui.applyArrowStyle.addEventListener("click", onApplyArrowStyle);
    if (state.ui.applyMarker) state.ui.applyMarker.addEventListener("click", onApplyMarkerStyle);
    if (state.ui.applyTextStyle) state.ui.applyTextStyle.addEventListener("click", onApplyTextStyle);

    if (state.ui.addArrow) state.ui.addArrow.addEventListener("click", onAddArrow);
    if (state.ui.removeSelected) state.ui.removeSelected.addEventListener("click", onRemoveSelectedArrows);

    if (state.ui.clearSelection) {
      state.ui.clearSelection.addEventListener("click", () => {
        clearAllSelections();
        createStatus("Selection cleared.");
      });
    }

    if (state.ui.stageAdd) state.ui.stageAdd.addEventListener("click", onAddStagePopup);
    if (state.ui.stageEdit) state.ui.stageEdit.addEventListener("click", onEditStagePopup);
    if (state.ui.stageRemove) state.ui.stageRemove.addEventListener("click", onRemoveStagePopup);

    if (state.ui.markerId) {
      state.ui.markerId.addEventListener("change", () => {
        updateMarkerFields(state.ui.markerId.value);
      });
    }

    state.ui.inspectorFilterType.addEventListener("change", () => {
      state.inspector.filterType = state.ui.inspectorFilterType.value;
      renderInspector();
    });

    state.ui.inspectorFilterText.addEventListener("input", () => {
      state.inspector.search = state.ui.inspectorFilterText.value || "";
      renderInspector();
    });

    state.ui.inspectorSortButtons.forEach((button) => {
      button.addEventListener("click", onInspectorSort);
    });

    if (state.ui.inspectorAddOpen) {
      state.ui.inspectorAddOpen.addEventListener("click", onInspectorAddOpen);
    }

    state.ui.toolbarAddButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        const addType = button.dataset.toolbarAddType || "arrow";
        if (state.ui.inspectorAddType) {
          state.ui.inspectorAddType.value = addType;
        }
        onInspectorAddOpen(event, addType);
      });
    });

    if (state.ui.toolbarNewFigure) {
      state.ui.toolbarNewFigure.addEventListener("click", (event) => {
        openNewFigureTemplatePicker(event);
      });
    }

    if (state.ui.toolbarGroup) {
      state.ui.toolbarGroup.addEventListener("click", (event) => {
        openGroupSettingsEditor(event);
      });
    }

    if (state.ui.zoomOut) state.ui.zoomOut.addEventListener("click", () => setTimelineZoom(state.viewport.zoom / 1.15));
    if (state.ui.zoomReset) state.ui.zoomReset.addEventListener("click", () => setTimelineZoom(1));
    if (state.ui.zoomIn) state.ui.zoomIn.addEventListener("click", () => setTimelineZoom(state.viewport.zoom * 1.15));
    if (state.ui.viewReset) state.ui.viewReset.addEventListener("click", resetTimelineView);
    if (state.ui.historyToggle) state.ui.historyToggle.addEventListener("click", toggleHistoryPanel);
    if (state.ui.historyClose) state.ui.historyClose.addEventListener("click", () => setHistoryPanelOpen(false));
    if (state.ui.historyList) state.ui.historyList.addEventListener("click", onHistoryListClick);

    if (state.ui.timelineScroller) {
      state.ui.timelineScroller.addEventListener("wheel", onTimelineWheel, { passive: false });
      state.ui.timelineScroller.addEventListener("pointerdown", onTimelineViewportPointerDown);
      state.ui.timelineScroller.addEventListener("pointermove", onTimelineViewportPointerMove);
      state.ui.timelineScroller.addEventListener("pointerup", onTimelineViewportPointerUp);
      state.ui.timelineScroller.addEventListener("pointercancel", onTimelineViewportPointerUp);
    }

    if (state.ui.floatingSave) {
      state.ui.floatingSave.addEventListener("click", () => {
        if (typeof state.floating.onSave !== "function") {
          closeFloatingEditor();
          return;
        }

        const shouldClose = state.floating.onSave(getFloatingValues());
        if (shouldClose !== false) {
          normalizeTimelineTextSizes();
          recordHistory("Edited timeline");
          closeFloatingEditor();
        }
      });
    }

    if (state.ui.floatingCancelButtons) {
      state.ui.floatingCancelButtons.forEach((button) => {
        button.addEventListener("click", () => {
          closeFloatingEditor();
        });
      });
    }

    if (state.ui.pageCopyRoot) {
      state.ui.pageCopyRoot.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        if (!event.target.closest("[data-page-copy]")) return;
        openPageCopyEditor(event);
      });
    }

      if (state.ui.legendRoot) {
        state.ui.legendRoot.addEventListener("click", (event) => {
          const chip = event.target.closest("[data-legend-kind]");
          if (!chip || chip.dataset.legendKind !== "group" || !chip.dataset.groupId) return;

          const group = ensureCustomGroups().find((entry) => entry.id === chip.dataset.groupId);
          const members = Array.isArray(group?.members) ? group.members : [];
          const nodeKeys = [];
          const blockKeys = [];

          members.forEach((member) => {
            if (member?.kind === "arrow" && (member.nodeType === "human" || member.nodeType === "mouse") && Number.isInteger(member.nodeIndex)) {
              nodeKeys.push(`${member.nodeType}:${member.nodeIndex}`);
            }
            if (member?.kind === "block" && (member.blockType === "human" || member.blockType === "mouse") && Number.isInteger(member.blockIndex)) {
              blockKeys.push(`${member.blockType}:${member.blockIndex}`);
            }
          });

          state.selectedKeys = new Set(nodeKeys);
          state.selectedBlockKeys = new Set(blockKeys);
          state.selectedBlockKey = blockKeys[blockKeys.length - 1] || null;
          state.selectedStageIndex = null;
          state.selectedBoundaryIndex = null;
          state.selectedMainAxis = false;
          renderSelectionState();
          renderInspector();
          createStatus(`Selected ${members.length} group member(s).`);
        });

        state.ui.legendRoot.addEventListener("dblclick", (event) => {
        const chip = event.target.closest("[data-legend-kind]");
        if (!chip) return;
        event.preventDefault();
        event.stopPropagation();

        if (chip.dataset.legendKind === "species") {
          openSpeciesSettingsEditor(chip.dataset.legendSpecies, event);
          return;
        }

        if (chip.dataset.legendKind === "group" && chip.dataset.groupId) {
          openGroupSettingsEditor(event, chip.dataset.groupId);
          return;
        }

        const stageIndex = Number(chip.dataset.stageIndex);
        if (Number.isInteger(stageIndex)) {
          openStageSettingsEditor(stageIndex, event);
        }
      });
    }

    state.ui.inspectorBody.addEventListener("click", onInspectorBodyClick);

    document.addEventListener("keydown", onDocumentKeyDown);
    document.addEventListener("keyup", onDocumentKeyUp);
    state.ui.bound = true;
  }

  function resolveConfig() {
    if (typeof window !== "undefined" && window.TIMELINE_CONFIG) return window.TIMELINE_CONFIG;
    if (typeof TIMELINE_CONFIG !== "undefined") return TIMELINE_CONFIG;
    return null;
  }

  function resolveUI() {
    const root = document.querySelector("[data-timeline-editor]");
    const inspectorRoot = document.querySelector("[data-timeline-inspector]");
    if (!inspectorRoot) return null;

    const queryRoot = (selector) => (root ? root.querySelector(selector) : null);

    return {
      root,
      pageCopyRoot: document.querySelector("[data-page-copy-root]"),
      legendRoot: document.querySelector("[data-timeline-legend]"),
      selectionSummary: queryRoot("[data-editor-selection-summary]"),
      selectionList: queryRoot("[data-editor-selection-list]"),
      stageSummary: queryRoot("[data-editor-stage-summary]"),
      inputX: queryRoot("[data-editor-x]"),
      inputY: queryRoot("[data-editor-y]"),
      inputDX: queryRoot("[data-editor-dx]"),
      inputDY: queryRoot("[data-editor-dy]"),
      stroke: queryRoot("[data-editor-stroke]"),
      strokeWidth: queryRoot("[data-editor-stroke-width]"),
      markerId: queryRoot("[data-editor-marker-id]"),
      markerWidth: queryRoot("[data-editor-marker-width]"),
      markerHeight: queryRoot("[data-editor-marker-height]"),
      markerRefX: queryRoot("[data-editor-marker-refx]"),
      markerRefY: queryRoot("[data-editor-marker-refy]"),
      markerFill: queryRoot("[data-editor-marker-fill]"),
      titleText: queryRoot("[data-editor-title-text]"),
      ageText: queryRoot("[data-editor-age-text]"),
      titleFill: queryRoot("[data-editor-title-fill]"),
      ageFill: queryRoot("[data-editor-age-fill]"),
      titleSize: queryRoot("[data-editor-title-size]"),
      ageSize: queryRoot("[data-editor-age-size]"),
      applyPosition: queryRoot("[data-editor-apply-position]"),
      applyDelta: queryRoot("[data-editor-apply-delta]"),
      applyArrowStyle: queryRoot("[data-editor-apply-arrow-style]"),
      applyMarker: queryRoot("[data-editor-apply-marker]"),
      applyTextStyle: queryRoot("[data-editor-apply-text-style]"),
      clearSelection: queryRoot("[data-editor-clear-selection]"),
      stageAdd: queryRoot("[data-editor-stage-add]"),
      stageEdit: queryRoot("[data-editor-stage-edit]"),
      stageRemove: queryRoot("[data-editor-stage-remove]"),
      createType: queryRoot("[data-editor-create-type]"),
      createStage: queryRoot("[data-editor-create-stage]"),
      createTitle: queryRoot("[data-editor-create-title]"),
      createAge: queryRoot("[data-editor-create-age]"),
      createX: queryRoot("[data-editor-create-x]"),
      createY: queryRoot("[data-editor-create-y]"),
      addArrow: queryRoot("[data-editor-add-arrow]"),
      removeSelected: queryRoot("[data-editor-remove-selected]"),
      status: document.querySelector("[data-editor-status]"),
      inspectorRoot,
      inspectorAddType: inspectorRoot.querySelector("[data-inspector-add-type]"),
      inspectorAddOpen: inspectorRoot.querySelector("[data-inspector-add-open]"),
      inspectorFilterType: inspectorRoot.querySelector("[data-inspector-filter-type]"),
      inspectorFilterText: inspectorRoot.querySelector("[data-inspector-filter-text]"),
      inspectorBody: inspectorRoot.querySelector("[data-inspector-body]"),
      inspectorEmpty: inspectorRoot.querySelector("[data-inspector-empty]"),
      inspectorSortButtons: Array.from(inspectorRoot.querySelectorAll("[data-inspector-sort]")),
      toolbarAddButtons: Array.from(document.querySelectorAll("[data-toolbar-add-type]")),
      toolbarGroup: document.querySelector("[data-toolbar-group]"),
      toolbarNewFigure: document.querySelector("[data-toolbar-new-figure]"),
      timelineScroller: document.querySelector("#timeline"),
      timelineFigure: document.querySelector("#timeline figure"),
      zoomOut: document.querySelector("[data-timeline-zoom-out]"),
      zoomReset: document.querySelector("[data-timeline-zoom-reset]"),
      zoomIn: document.querySelector("[data-timeline-zoom-in]"),
      viewReset: document.querySelector("[data-timeline-view-reset]"),
      historyToggle: document.querySelector("[data-history-toggle]"),
      historyPanel: document.querySelector("[data-history-panel]"),
      historyClose: document.querySelector("[data-history-close]"),
      historyList: document.querySelector("[data-history-list]"),
      floatingRoot: document.querySelector("[data-floating-editor]"),
      floatingTitle: document.querySelector("[data-floating-title]"),
      floatingBody: document.querySelector("[data-floating-body]"),
      floatingActions: document.querySelector(".floating-editor-actions"),
      floatingSave: document.querySelector("[data-floating-save]"),
      floatingCancelButtons: Array.from(document.querySelectorAll("[data-floating-cancel]")),
      bound: false,
    };
  }

  function onTimelineRendered(event) {
    if (!event || !event.detail) return;

    state.config = event.detail.config || resolveConfig();
    if (!state.config) {
      createStatus("Could not load timeline config for editor.", true);
      return;
    }

    ensureStageMetadata();
    ensureCustomGroups();
    normalizeTimelineTextSizes();
    syncNodesToMainAxis();
    syncWindowLabelsFromStages();
    syncAxisTicksWithStages();
    refreshTimelineLegend();

    if (state.ui.markerId && !state.ui.markerId.options.length) {
      populateMarkerSelect();
    }

    bindSvg(event.detail.svg || document.querySelector(".timeline-svg"));
    refreshStageOptions();

    if (state.pendingNodeSelectionKeys) {
      state.selectedKeys = new Set(state.pendingNodeSelectionKeys);
      state.pendingNodeSelectionKeys = null;
    }

    if (state.pendingStageSelectionIndex !== null) {
      if (getStage(state.pendingStageSelectionIndex)) {
        state.selectedStageIndex = state.pendingStageSelectionIndex;
      } else {
        state.selectedStageIndex = null;
      }
      state.pendingStageSelectionIndex = null;
    }

    normalizeSelectedKeys();

    if (state.selectedStageIndex !== null && !getStage(state.selectedStageIndex)) {
      state.selectedStageIndex = null;
    }

    renderSelectionState();
    renderInspector();
    applyTimelineViewport();
    if (!state.history.entries.length) recordHistory("Initial figure", { replace: true });
    renderHistoryPanel();
  }

  function bootstrap() {
    state.ui = resolveUI();
    if (!state.ui) return;

    bindUI();

    document.addEventListener("timeline:rendered", onTimelineRendered);

    state.config = resolveConfig();
    if (state.config) {
      ensureStageMetadata();
      normalizeTimelineTextSizes();
      syncNodesToMainAxis();
      syncWindowLabelsFromStages();
      syncAxisTicksWithStages();
      refreshTimelineLegend();
      populateMarkerSelect();
      refreshStageOptions();
    }

    const existingSvg = document.querySelector(".timeline-svg");
    if (existingSvg && state.config) {
      bindSvg(existingSvg);
      renderSelectionState();
      renderInspector();
      applyTimelineViewport();
      if (!state.history.entries.length) recordHistory("Initial figure", { replace: true });
      renderHistoryPanel();
      createStatus("Editor ready. Click arrows or stages to edit.");
      return;
    }

    if (!existingSvg && typeof window !== "undefined") {
      if (typeof window.initializeTimelineWhenConfigReady === "function") {
        window.initializeTimelineWhenConfigReady();
      } else if (typeof window.initializeTimeline === "function") {
        window.initializeTimeline();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
