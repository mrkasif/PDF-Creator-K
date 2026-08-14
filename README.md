# PDF Creator Studio

A browser-based PDF creator with a full design toolset: text with 50+ fonts, shapes, lines & arrows, freehand drawing, Chart.js charts, image upload, multi-page documents, and one-click PDF export.

![stack](https://img.shields.io/badge/stack-vanilla%20JS-6c8cff)

## Run it

```bash
npm start
```

Then open **http://localhost:3000**

> Use the server (not `file://`) so Google Fonts and image rendering work correctly during PDF export.

## Features

### Tools
| Tool | What it does |
|------|--------------|
| **Select** | Click to select, drag to move, resize with handles, rotate with the top handle |
| **Text** | Click a spot to place text, then type. Double-click any text to edit it later |
| **Rectangle / Ellipse** | Drag to draw |
| **Line / Arrow** | Drag to draw a line or arrow |
| **Chart** | Bar, line, pie, doughnut, radar, polar, scatter & bubble charts from your own data |
| **Image** | Upload PNG/JPG and place it on the page |
| **Draw** | Freehand sketching with adjustable stroke width |

### Editing
- **Fonts** – 50+ Google Fonts (sans, serif, display, handwriting, mono) plus your own `.ttf`/`.otf` uploads
- **Text styling** – size, color, bold / italic / underline, alignment, line height
- **Shapes** – fill & stroke color, fill opacity, border width, corner radius, drop shadow
- **Element controls** – X/Y/W/H, rotation, opacity, z-order (front/back/up/down), duplicate, delete
- **Pages** – add / delete pages, each page exports as a separate A4 sheet
- **Undo / Redo** – Ctrl+Z / Ctrl+Y (up to 200 steps)
- **Zoom** – Ctrl+scroll or the +/− buttons

### Export
- Renders every page at 2x resolution and produces a proper A4 PDF (210 × 297 mm)
- Keyboard: `Delete` removes, `Ctrl+D` duplicates, arrow keys nudge (Shift = 10px)

## Structure

```
index.html     App markup (layout, modal, CDN libraries)
css/styles.css Dark themed editor UI
js/app.js      All editor logic
server.js      Zero-dependency static server
```

Libraries are loaded from CDN: Chart.js, html2canvas, jsPDF.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `T` | Text tool |
| `R` | Rectangle |
| `L` | Line |
| `I` | Image tool |
| `Del` | Delete selection |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+D` | Duplicate |
| `Esc` | Deselect / cancel |
