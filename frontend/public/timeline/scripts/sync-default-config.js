const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const resources = [
  {
    jsonPath: path.join(projectRoot, "configs", "timeline-default-config.json"),
    jsPath: path.join(projectRoot, "src", "config", "timeline-default-config.js"),
    globalName: "TIMELINE_DEFAULT_CONFIG",
    sourceLabel: "configs/timeline-default-config.json",
  },
  {
    jsonPath: path.join(projectRoot, "configs", "timeline-presets.json"),
    jsPath: path.join(projectRoot, "src", "config", "timeline-presets.js"),
    globalName: "TIMELINE_PRESET_LIBRARY",
    sourceLabel: "configs/timeline-presets.json",
  },
];

resources.forEach(({ jsonPath, jsPath, globalName, sourceLabel }) => {
  const jsonText = fs.readFileSync(jsonPath, "utf8");
  JSON.parse(jsonText);

  const output = `/**
 * Generated fallback for direct file:// browser use.
 * Source of truth: ${sourceLabel}
 */
window.${globalName} = ${jsonText.trim()};
`;

  fs.writeFileSync(jsPath, output);
  console.log(`Synced ${path.relative(projectRoot, jsPath)} from ${path.relative(projectRoot, jsonPath)}.`);
});
