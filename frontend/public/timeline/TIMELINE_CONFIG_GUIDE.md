# Timeline Configuration Guide

The timeline is driven by one configuration object. The default object lives in `configs/timeline-default-config.json`; `src/config/timeline-config.js` loads that JSON, normalizes it, and exposes it as `window.TIMELINE_CONFIG`. The renderer reads the active object and creates the SVG. The editor mutates the same object in memory, and `src/export/timeline-exporter.js` can export it as a portable setup JSON file.

## Architecture

- `configs/timeline-default-config.json` is the default timeline data and the preferred place for hand-edited defaults.
- `configs/timeline-presets.json` defines the starter figures used by the `New figure` dialog.
- `src/config/timeline-default-config.js` is generated from the JSON so Firefox and Edge can load defaults when the page is opened directly from disk.
- `src/config/timeline-presets.js` is the generated preset fallback for direct `file://` usage.
- `src/config/timeline-config.js` is only the loader/normalizer. It uses the generated fallback when available, otherwise it fetches the JSON, and exposes `window.TIMELINE_CONFIG`.
- `src/render/timeline-generator.js` is responsible for rendering SVG from the active config.
- `src/editor/timeline-editor.js` owns user editing, selection, dragging, keyboard shortcuts, grouping, and inspector updates.
- `src/export/timeline-exporter.js` owns file export/import only.

This keeps the source of truth clear: the active configuration object is the data model, and the SVG is regenerated or updated from that model.

## Main Sections

| Section | Purpose |
| --- | --- |
| `canvas` | SVG viewBox, width, and height. |
| `arrows` | Arrowhead marker presets. |
| `mainAxis` | Center timeline axis styling and position. |
| `developmentWindows` | Stage/background bands. |
| `stageLabels` | Defaults for stage label rendering. |
| `axisRanges` | Top and bottom age-range axes. |
| `axisLabels` | Side labels such as Humans and Mice. |
| `humanNodes`, `mouseNodes` | Arrow milestones. |
| `humanRangeBlocks`, `mouseRangeBlocks` | Duration/range blocks. |
| `blocks` | Shared block defaults. |
| `alignmentNote` | Figure note at the bottom. |

## Coordinate System

Coordinates are SVG units. The default canvas uses:

```js
canvas: {
  viewBox: "0 0 1480 860",
  width: 1480,
  height: 860,
}
```

`x` moves left/right. `y` moves down/up from the top-left origin.

## Development Windows

Stages are stored in `developmentWindows`:

```js
{
  x: 130,
  y: 105,
  width: 110,
  height: 535,
  rx: 18,
  fill: "var(--window-1)",
  opacity: 0.28,
  label: "Stage 1",
  humanLabel: "Neonatal",
  mouseLabel: "P2",
}
```

Use `stageName` or `humanLabel` for the visible stage name in the legend and top label. Use `mouseLabel` for the lower age axis. The editor keeps `axisRanges` synchronized when stages are added or removed.

## Arrows

Milestone arrows are stored in `humanNodes` and `mouseNodes`:

```js
{
  x: 170,
  yNode: 195,
  yAxis: 385,
  title: "Object onset",
  ageRange: "d3-4",
  stroke: "var(--human)",
  strokeWidth: 2.5,
  markerId: "humanArrow",
}
```

Important fields:

| Field | Purpose |
| --- | --- |
| `x` | Horizontal anchor for the arrow. |
| `yNode` | Dot position away from the center axis. |
| `yAxis` | Point where the arrow meets the center axis. |
| `title` | Main label. |
| `ageRange` | Subtext label. |
| `stroke` | Arrow color. |
| `markerId` | Arrowhead preset from `arrows`. |

## Range Blocks

Range blocks are stored in `humanRangeBlocks` and `mouseRangeBlocks`:

```js
{
  xStart: 250,
  xEnd: 390,
  y: 300,
  title: "Object what",
  ageRange: "d3-4 -> 6 mo",
  fill: "transparent",
  stroke: "var(--human)",
}
```

`xStart` and `xEnd` define the duration. The editor supports dragging the whole block and dragging either side to resize it.

During dragging, the editor maps `xStart`, `xEnd`, or an arrow `x` position linearly between the neighboring `axisRanges` ticks. Human positions are displayed as months/years; mouse positions are displayed as postnatal days such as `P21`. If you rename axis ticks, the live drag readout and saved `ageRange` text use the updated tick labels.

## Arrowhead Presets

Arrowheads are defined once in `arrows` and referenced by nodes or the main axis:

```js
arrows: {
  humanArrow: {
    id: "humanArrow",
    markerWidth: 8,
    markerHeight: 8,
    refX: 7,
    refY: 4,
    path: "M0 0L8 4L0 8Z",
    fill: "var(--human)",
  },
}
```

The editor can change marker color, width, and arrowhead size. Keep `path` aligned with `markerWidth` and `markerHeight` when editing by hand.

## Exportable Setup Format

The `Export` menu's `Setup JSON` option creates a JSON wrapper:

```json
{
  "format": "timeline-builder-config",
  "version": 1,
  "exportedAt": "2026-04-22T12:00:00.000Z",
  "app": "editable-timeline-builder",
  "pageCopy": {
    "eyebrow": "Editable timeline builder",
    "title": "Create and refine visual timelines",
    "description": "Use this page to build timelines..."
  },
  "config": {
    "canvas": {},
    "mainAxis": {},
    "developmentWindows": []
  }
}
```

Use this file when you want to preserve an editable timeline. It can be imported through the `Import` button. The importer also accepts a raw config object, but the wrapper is recommended.

## Programmatic Import/Export

`timeline-exporter.js` exposes `window.TimelineIO`:

```js
window.TimelineIO.exportTimeline("png");
window.TimelineIO.exportTimeline("json");
window.TimelineIO.importSetupObject(setupObject);
```

Supported export formats are `pdf`, `png`, `jpg`, `svg`, and `json`.

SVG exports are built from the generated SVG with computed styles and an explicit background inlined. PDF exports are generated as vector drawing commands for the timeline primitives, including text, blocks, stages, arrows, and arrowheads. PNG/JPG exports are raster outputs generated at a higher scale for sharper previews.

## Vertical Scaling

The top and bottom age-range brackets are editable height handles:

- Drag the top bracket to move the upper figure boundary.
- Drag the bottom bracket to move the lower figure boundary.
- Human-side labels and blocks scale linearly between the top bracket and center axis.
- Mouse-side labels and blocks scale linearly between the center axis and bottom bracket.

The active config updates `stageEditing.boundaryTopY`, `stageEditing.boundaryBottomY`, stage `y`/`height`, range-axis `lineY`, and related vertical coordinates.

## Manual Editing Workflow

1. Edit values in `timeline-default-config.json`.
2. Run `node scripts/sync-default-config.js` so direct `file://` usage gets the same defaults.
3. Reload `timeline.html`.
4. Use the browser editor for fine adjustments.
5. Export `Setup JSON` when you want to preserve the edited state.

## Color System

Colors can be CSS variables or literal color values:

```js
stroke: "var(--human)"
fill: "#2dd4bf"
```

Global color variables live in `style/timeline.css`, including:

| Variable | Purpose |
| --- | --- |
| `--human` | Human arrow/block color. |
| `--mouse` | Mouse arrow/block color. |
| `--track` | Center axis color. |
| `--window-1` through `--window-5` | Default stage colors. |
| `--text` | Main text color. |
| `--muted` | Secondary text color. |

## Troubleshooting

- If the figure does not render, check the browser console for JavaScript errors.
- If import fails, confirm the JSON contains `canvas`, `mainAxis`, and `developmentWindows`.
- If an exported PNG/JPG does not match the screen, export SVG as a fallback and inspect it in the browser.
- If you edit `configs/timeline-default-config.json` or `configs/timeline-presets.json` by hand, run `node scripts/sync-default-config.js` and reload before exporting setup JSON so the active config is current.

## Related Docs

See [README.md](README.md) for setup, usage, import/export behavior, and the current file layout.
