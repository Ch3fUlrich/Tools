const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

// 1. Reconstruct configs/timeline-default-config.json and create split JS fallbacks
const defaultConfigDir = path.join(projectRoot, "configs", "default-config");
const configParts = ["layout", "stages", "axes", "human", "mouse", "misc"];

const assembledConfig = {};

configParts.forEach(part => {
  const jsonPath = path.join(defaultConfigDir, `${part}.json`);
  const jsonText = fs.readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(jsonText);

  // Merge into assembled config
  Object.assign(assembledConfig, parsed);

  // Generate smaller JS fallback
  const jsPath = path.join(projectRoot, "src", "config", `default-config-${part}.js`);
  const output = `/**
 * Generated fallback for direct file:// browser use.
 * Source of truth: configs/default-config/${part}.json
 */
window.TIMELINE_DEFAULT_CONFIG = window.TIMELINE_DEFAULT_CONFIG || {};
Object.assign(window.TIMELINE_DEFAULT_CONFIG, ${JSON.stringify(parsed, null, 2)});
`;
  fs.writeFileSync(jsPath, output);
  console.log(`Synced src/config/default-config-${part}.js from configs/default-config/${part}.json.`);
});

// Write the assembled config for fetch
const assembledJsonPath = path.join(projectRoot, "configs", "timeline-default-config.json");
fs.writeFileSync(assembledJsonPath, JSON.stringify(assembledConfig, null, 2) + "\n");
console.log(`Assembled configs/timeline-default-config.json from split pieces.`);

// 2. Process presets
const presetsJsonPath = path.join(projectRoot, "configs", "timeline-presets.json");
const presetsJsPath = path.join(projectRoot, "src", "config", "timeline-presets.js");
const presetsJsonText = fs.readFileSync(presetsJsonPath, "utf8");
JSON.parse(presetsJsonText);

const presetsOutput = `/**
 * Generated fallback for direct file:// browser use.
 * Source of truth: configs/timeline-presets.json
 */
window.TIMELINE_PRESET_LIBRARY = ${presetsJsonText.trim()};
`;
fs.writeFileSync(presetsJsPath, presetsOutput);
console.log(`Synced src/config/timeline-presets.js from configs/timeline-presets.json.`);
