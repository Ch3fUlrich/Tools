# Editable Timeline Builder

This folder contains a self-contained browser app for creating, editing, exporting, and re-importing visual timelines. The included default figure compares episodic-like memory development across humans and mice, but the same builder is meant to be reused for any staged timeline.

## What It Does

- Renders a timeline from one structured configuration object.
- Lets you edit stages, range blocks, arrows, labels, colors, and styles in the browser.
- Supports direct manipulation: drag arrows and blocks, resize range blocks, and resize developmental stages.
- Provides a settings table for exact edits and filtering.
- Exports the current figure as `PDF`, `PNG`, `JPG`, `SVG`, or a portable setup JSON file.
- Imports setup JSON files so a saved timeline can be recreated and edited again.

## Files

- `timeline.html` - main page for the editor.
- `memory-development-timeline.html` - compatibility redirect to `timeline.html`.
- `style/timeline.css` - shared styles for layout, editor chrome, and figure presentation.
- `configs/timeline-default-config.json` - default figure data loaded at startup.
- `configs/timeline-presets.json` - preset definitions used by the `New figure` dialog.
- `src/config/timeline-config.js` - config loader and normalization entry point.
- `src/config/timeline-default-config.js` - generated fallback for direct `file://` browser usage.
- `src/config/timeline-presets.js` - generated preset fallback for direct `file://` browser usage.
- `src/render/timeline-generator.js` - SVG rendering for the active timeline config.
- `src/editor/timeline-editor.js` - selection, editing, dragging, grouping, and inspector behavior.
- `src/export/timeline-exporter.js` - export/import logic for PDF, PNG, JPG, SVG, and setup JSON.
- `scripts/sync-default-config.js` - syncs JSON config files into their generated browser-safe JS fallbacks.
- `TIMELINE_CONFIG_GUIDE.md` - detailed configuration reference.

## Quick Start

Open `timeline.html` directly in a browser, or run a local server from this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/timeline.html`.

## Editing

- Click or drag arrows, range blocks, and stages directly in the figure.
- Double-click arrows, blocks, stages, legend items, or header text to open their settings.
- Use the toolbar buttons to add arrows, blocks, stages, groups, or a fresh preset figure.
- Use the Timeline Settings Table for exact values, colors, filtering, and removal.
- While dragging arrows or blocks, a live readout shows the interpolated age/week position within the current stage range.
- If you rename age-range ticks, dragged arrows and blocks use the updated tick names for their live readout and saved subtext.
- Mouse age ranges in the default example use postnatal day labels such as `P21` instead of week labels.
- Drag the top or bottom age bracket to scale the vertical height of the figure.
- Press `Esc` to close open popups or menus.

Changes are live in memory. To keep them, use the `Export` menu and save the setup JSON.

The default example is authored in `configs/timeline-default-config.json`. Edit that file when you want to change the starting state of the app, then run:

```bash
node scripts/sync-default-config.js
```

That syncs the generated `src/config/timeline-default-config.js` and `src/config/timeline-presets.js` fallbacks used by Firefox and Edge when the page is opened directly from disk. The browser editor and setup imports still work on the same active configuration object after load.

## Exporting

Use the `Export` menu in the timeline toolbar:

- `PDF` exports a single-page vector PDF of the current figure.
- `PNG` exports a high-resolution transparent raster image.
- `JPG` exports a raster image with the current page surface as the background.
- `SVG` exports an editable vector snapshot of the figure.
- `Setup JSON` exports a JSON file containing the active timeline configuration and page copy.

The setup file is the best format for future editing because it preserves the data and layout settings, not just the rendered picture.
SVG and PDF exports are vector outputs. SVG exports include an explicit background and resolved color values so they do not depend on the website theme after download.

## Importing

Click `Import` and choose a setup JSON file exported from this app. Imports are limited to JSON files up to 50 MB. The app replaces the active timeline configuration, redraws the SVG, and keeps the imported version editable.

## Setup JSON Format

Setup exports use this wrapper:

```json
{
  "format": "timeline-builder-config",
  "version": 1,
  "exportedAt": "2026-04-22T12:00:00.000Z",
  "app": "editable-timeline-builder",
  "pageCopy": {
    "eyebrow": "Editable timeline builder",
    "title": "Create and refine visual timelines",
    "description": "..."
  },
  "config": {
    "canvas": {},
    "developmentWindows": [],
    "humanNodes": [],
    "mouseNodes": []
  }
}
```

The importer also accepts a raw `TIMELINE_CONFIG` object, but the wrapper is preferred because it includes metadata and page copy.

## Troubleshooting

- If an export looks stale, refresh the page and export again.
- If imports fail, confirm the file is JSON and contains `canvas`, `mainAxis`, and `developmentWindows`.
- If local file behavior is inconsistent, use the local server option.

## Related Docs

See [TIMELINE_CONFIG_GUIDE.md](TIMELINE_CONFIG_GUIDE.md) for the full configuration structure and examples.
