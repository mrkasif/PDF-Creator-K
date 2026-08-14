(() => {
  "use strict";

  const PAGE_W = 794;
  const PAGE_H = 1123;
  const MAX_UNDO = 200;

  const PALETTE = ["#6c8cff", "#ff6c8c", "#6cff9a", "#ffd166", "#8a7cff", "#ff9f6c", "#4cc9f0", "#e05a5a", "#4caf7d", "#f0f4ff", "#22252b"];

  /* ---------------- Fonts ---------------- */
  const FONTS = [
    { name: "Arial", cat: "System" }, { name: "Verdana", cat: "System" },
    { name: "Tahoma", cat: "System" }, { name: "Trebuchet MS", cat: "System" },
    { name: "Times New Roman", cat: "System" }, { name: "Georgia", cat: "System" },
    { name: "Courier New", cat: "System" }, { name: "Comic Sans MS", cat: "System" },
    { name: "Impact", cat: "System" }, { name: "Segoe UI", cat: "System" },
    { name: "Roboto", cat: "Sans" }, { name: "Open Sans", cat: "Sans" },
    { name: "Inter", cat: "Sans" }, { name: "Poppins", cat: "Sans" },
    { name: "Montserrat", cat: "Sans" }, { name: "Lato", cat: "Sans" },
    { name: "Oswald", cat: "Sans" }, { name: "Raleway", cat: "Sans" },
    { name: "Nunito", cat: "Sans" }, { name: "Quicksand", cat: "Sans" },
    { name: "Work Sans", cat: "Sans" }, { name: "Manrope", cat: "Sans" },
    { name: "Lexend", cat: "Sans" }, { name: "Jost", cat: "Sans" },
    { name: "Space Grotesk", cat: "Sans" }, { name: "Archivo", cat: "Sans" },
    { name: "DM Sans", cat: "Sans" }, { name: "Rubik", cat: "Sans" },
    { name: "Playfair Display", cat: "Serif" }, { name: "Merriweather", cat: "Serif" },
    { name: "Cormorant Garamond", cat: "Serif" }, { name: "Abril Fatface", cat: "Serif" },
    { name: "Zilla Slab", cat: "Serif" }, { name: "Noto Serif", cat: "Serif" },
    { name: "Bebas Neue", cat: "Display" }, { name: "Anton", cat: "Display" },
    { name: "Righteous", cat: "Display" }, { name: "Orbitron", cat: "Display" },
    { name: "Bangers", cat: "Display" }, { name: "Lobster", cat: "Hand" },
    { name: "Pacifico", cat: "Hand" }, { name: "Caveat", cat: "Hand" },
    { name: "Dancing Script", cat: "Hand" }, { name: "Kaushan Script", cat: "Hand" },
    { name: "Great Vibes", cat: "Hand" }, { name: "Amatic SC", cat: "Hand" },
    { name: "Permanent Marker", cat: "Hand" }, { name: "Shrikhand", cat: "Display" },
    { name: "Press Start 2P", cat: "Display" },
    { name: "JetBrains Mono", cat: "Mono" }, { name: "Fira Code", cat: "Mono" },
    { name: "Source Code Pro", cat: "Mono" }, { name: "IBM Plex Mono", cat: "Mono" },
  ];

  const CAT_ORDER = ["System", "Sans", "Serif", "Display", "Hand", "Mono", "Custom"];
  let customFonts = [];
  const loadedFonts = new Set();
  const FONT_CSS_ORDER = { "System": 1, "Sans": 2, "Serif": 3, "Display": 4, "Hand": 5, "Mono": 6, "Custom": 7 };

  /* ---------------- State ---------------- */
  let pages = [{ elements: [] }];
  let pageIdx = 0;
  let tool = "select";
  let zoom = 100;
  let selectedId = null;
  let undoStack = [];
  let redoStack = [];
  let currentStroke = "#22252b";
  let currentFill = "#6c8cff";
  let busy = false;

  /* ---------------- DOM refs ---------------- */
  const $ = (id) => document.getElementById(id);
  const pagesEl = $("pages");
  const canvasScroll = $("canvas-scroll");
  const propsEmpty = $("props-empty");
  const propsPanel = $("props-panel");
  const modal = $("chart-modal");

  /* ---------------- Utilities ---------------- */
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const currentPage = () => pages[pageIdx];
  const snapshot = () => JSON.stringify(pages);

  function saveState() {
    undoStack.push(snapshot());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    updateHistoryUI();
  }

  function restoreState(s) {
    pages = JSON.parse(s);
    if (pageIdx >= pages.length) pageIdx = pages.length - 1;
    selectedId = null;
    render();
  }

  function updateHistoryUI() {
    $("btn-undo").disabled = undoStack.length === 0;
    $("btn-redo").disabled = redoStack.length === 0;
  }

  function toast(msg, type) {
    const t = document.createElement("div");
    t.className = "toast" + (type ? " " + type : "");
    t.textContent = msg;
    $("toast-wrap").appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2200);
    setTimeout(() => t.remove(), 2600);
  }

  function pagePos(pageEl, e) {
    const r = pageEl.getBoundingClientRect();
    const s = r.width / PAGE_W;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  }

  /* ---------------- Fonts ---------------- */
  function ensureFontLoaded(family) {
    if (loadedFonts.has(family)) return;
    loadedFonts.add(family);
    if (["Arial", "Verdana", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Courier New", "Comic Sans MS", "Impact", "Segoe UI"].includes(family)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + family.trim().replace(/ /g, "+") + ":ital,wght@0,400;0,700;1,400;1,700&display=swap";
    document.head.appendChild(link);
  }

  function buildFontOptions() {
    const select = $("prop-font");
    select.innerHTML = "";
    const groups = {};
    for (const f of FONTS) (groups[f.cat] = groups[f.cat] || []).push(f.name);
    for (const cf of customFonts) (groups["Custom"] = groups["Custom"] || []).push(cf);
    const cats = Object.keys(groups).sort((a, b) => FONT_CSS_ORDER[a] - FONT_CSS_ORDER[b]);
    for (const cat of cats) {
      const opt = document.createElement("optgroup");
      opt.label = cat;
      for (const name of groups[cat].sort()) {
        const o = document.createElement("option");
        o.value = name;
        o.textContent = name;
        o.style.fontFamily = name + ", sans-serif";
        opt.appendChild(o);
      }
      select.appendChild(opt);
    }
  }

  async function loadCustomFont(file) {
    const name = file.name.replace(/\.[^.]+$/, "");
    try {
      const face = new FontFace(name, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      customFonts.push(name);
      buildFontOptions();
      toast("Font \u201C" + name + "\u201D installed", "success");
      return name;
    } catch (e) {
      toast("Could not load font", "error");
      return null;
    }
  }

  /* ---------------- Rendering ---------------- */
  function render() {
    pagesEl.innerHTML = "";
    $("page-total").textContent = pages.length;
    $("page-num").textContent = pageIdx + 1;
    pages.forEach((page, i) => {
      const pg = document.createElement("div");
      pg.className = "page" + (i === pageIdx ? " pg-selected" : "");
      pg.dataset.index = i;
      pg.dataset.pagenum = i;

      const label = document.createElement("div");
      label.className = "page-label";
      label.textContent = "Page " + (i + 1);
      pg.appendChild(label);

      page.elements.forEach((el, z) => renderElement(pg, el, z, i === pageIdx));
      attachPageEvents(pg);
      pagesEl.appendChild(pg);
    });
    updatePropsPanel();
  }

  function renderElement(pg, el, z, isActive) {
    const d = document.createElement("div");
    d.className = "el el-" + el.type;
    d.dataset.id = el.id;
    d.style.left = el.x + "px";
    d.style.top = el.y + "px";
    d.style.width = el.w + "px";
    d.style.height = el.h + "px";
    d.style.zIndex = z + 1;
    if (el.rot) d.style.transform = "rotate(" + el.rot + "deg)";
    if (el.opacity != null) d.style.opacity = el.opacity / 100;

    if (el.type === "text") {
      d.textContent = el.value || "";
      d.style.fontFamily = "'" + el.fontFamily + "', sans-serif";
      d.style.fontSize = el.fontSize + "px";
      d.style.color = el.color;
      d.style.fontWeight = el.bold ? 700 : 400;
      d.style.fontStyle = el.italic ? "italic" : "normal";
      d.style.textDecoration = el.underline ? "underline" : "none";
      d.style.textAlign = el.align || "left";
      d.style.lineHeight = el.lineHeight || 1.2;
    } else if (el.type === "rect" || el.type === "ellipse") {
      d.style.setProperty("--el-fill", hexToRgba(el.fill, el.fillOpacity / 100));
      d.style.setProperty("--el-strokewidth", el.strokeWidth + "px");
      d.style.setProperty("--el-strokecolor", el.strokeColor);
      if (el.type === "rect") d.style.setProperty("--el-radius", (el.radius || 0) + "px");
      d.style.setProperty("--el-shadow", el.shadow ? "0 4px " + el.shadow + "px rgba(0,0,0,.3)" : "none");
      d.classList.add("el-shape");
    } else if (el.type === "line" || el.type === "arrow") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", el.w);
      svg.setAttribute("height", el.h);
      const x1 = el.x1 - el.x, y1 = el.y1 - el.y, x2 = el.x2 - el.x, y2 = el.y2 - el.y;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1);
      line.setAttribute("x2", x2); line.setAttribute("y2", y2);
      line.setAttribute("stroke", el.strokeColor);
      line.setAttribute("stroke-width", el.strokeWidth);
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
      if (el.type === "arrow") {
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const a = el.arrowSize || 12;
        const head = document.createElementNS("http://www.w3.org/2000/svg", "path");
        head.setAttribute("d",
          "M" + x2 + " " + y2 +
          " L" + (x2 - a * Math.cos(ang - 0.5)) + " " + (y2 - a * Math.sin(ang - 0.5)) +
          " L" + (x2 - a * Math.cos(ang + 0.5)) + " " + (y2 - a * Math.sin(ang + 0.5)) + " Z");
        head.setAttribute("fill", el.strokeColor);
        svg.appendChild(head);
      }
      d.appendChild(svg);
    } else if (el.type === "image") {
      const img = document.createElement("img");
      img.src = el.src;
      img.draggable = false;
      d.appendChild(img);
    } else if (el.type === "draw") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", el.w);
      svg.setAttribute("height", el.h);
      svg.setAttribute("viewBox", "0 0 " + el.w + " " + el.h);
      svg.setAttribute("preserveAspectRatio", "none");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", el.path);
      path.setAttribute("stroke", el.strokeColor);
      path.setAttribute("stroke-width", el.strokeWidth);
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("fill", "none");
      svg.appendChild(path);
      d.appendChild(svg);
    }

    pg.appendChild(d);

    if (el.type === "text") {
      d.addEventListener("dblclick", () => { setTool("select"); startTextEdit(el.id); });
    }

    if (isActive && selectedId === el.id) {
      d.classList.add("el-selected");
      addHandles(pg, d, el);
    }

    d.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (tool === "text" && el.type === "text") { startTextEdit(el.id); return; }
      if (tool !== "select") return;
      selectedId = el.id;
      startMoveOrDrag(d, e);
    });
  }

  function addHandles(pg, d, el) {
    const isLine = el.type === "line" || el.type === "arrow";
    const handles = isLine
      ? [["nw", "nwse"], ["ne", "nesw"], ["sw", "nesw"], ["se", "nwse"]]
      : [["nw", "nwse"], ["n", "ns"], ["ne", "nesw"], ["e", "ew"], ["se", "nwse"], ["s", "ns"], ["sw", "nesw"], ["w", "ew"]];
    for (const [pos, cursor] of handles) {
      const h = document.createElement("div");
      h.className = "resize-handle h-" + pos;
      h.style.cursor = cursor;
      h.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        startResize(d, e, pos);
      });
      d.appendChild(h);
    }
    const rot = document.createElement("div");
    rot.className = "resize-handle h-rot";
    rot.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      startRotate(d, e);
    });
    d.appendChild(rot);
  }

  /* ---------------- Interaction: move / resize / rotate ---------------- */
  let drag = null;

  function startMoveOrDrag(elNode, e) {
    const id = elNode.dataset.id;
    const el = findEl(id);
    if (!el) return;
    saveState();
    const start = pagePos(elNode.parentElement, e);
    const ox = start.x - el.x, oy = start.y - el.y;
    drag = {
      mode: "move", el, id,
      down: { x: e.clientX, y: e.clientY },
      moved: false,
      ox, oy,
    };
    addDragListeners();
  }

  function startResize(elNode, e, handle) {
    const id = elNode.dataset.id;
    const el = findEl(id);
    if (!el) return;
    saveState();
    const pg = elNode.parentElement;
    const start = pagePos(pg, e);
    drag = {
      mode: "resize", el, handle,
      start: { x: start.x, y: start.y },
      rect: { x: el.x, y: el.y, w: el.w, h: el.h },
    };
    addDragListeners();
  }

  function startRotate(elNode, e) {
    const id = elNode.dataset.id;
    const el = findEl(id);
    if (!el) return;
    saveState();
    const start = pagePos(elNode.parentElement, e);
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    drag = {
      mode: "rotate", el,
      base: (Math.atan2(start.y - cy, start.x - cx) * 180 / Math.PI) - (el.rot || 0),
      cx, cy,
    };
    addDragListeners();
  }

  function addDragListeners() {
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp);
  }

  function onDragMove(e) {
    if (!drag) return;
    const pg = currentPageEl();
    const pos = pagePos(pg, e);
    if (drag.mode === "move") {
      drag.moved = true;
      drag.el.x = clamp(pos.x - drag.ox, 0, PAGE_W - 10);
      drag.el.y = clamp(pos.y - drag.oy, 0, PAGE_H - 10);
      render();
    } else if (drag.mode === "resize") {
      const r = drag.rect, h = drag.handle;
      const dx = pos.x - drag.start.x;
      const dy = pos.y - drag.start.y;
      const min = 4;
      if (h.includes("w")) { drag.el.x = r.x + dx; drag.el.w = Math.max(min, r.w - dx); }
      if (h.includes("e")) { drag.el.w = Math.max(min, r.w + dx); }
      if (h.includes("n")) { drag.el.y = r.y + dy; drag.el.h = Math.max(min, r.h - dy); }
      if (h.includes("s")) { drag.el.h = Math.max(min, r.h + dy); }
      if (drag.el.type === "line" || drag.el.type === "arrow") {
        fixLineBBox(drag.el);
      }
      render();
    } else if (drag.mode === "rotate") {
      const ang = Math.atan2(pos.y - drag.cy, pos.x - drag.cx) * 180 / Math.PI;
      drag.el.rot = Math.round(ang - drag.base);
      render();
    }
  }

  function onDragUp() {
    if (drag && drag.mode === "move") render();
    drag = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
  }

  function fixLineBBox(el) {
    el.x = Math.min(el.x1, el.x2);
    el.y = Math.min(el.y1, el.y2);
    el.w = Math.max(Math.abs(el.x2 - el.x1), 1);
    el.h = Math.max(Math.abs(el.y2 - el.y1), 1);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function currentPageEl() {
    const pgs = pagesEl.querySelectorAll(".page");
    return pgs[pageIdx];
  }

  /* ---------------- Selection ---------------- */
  function findEl(id) {
    for (const p of pages) {
      for (const el of p.elements) if (el.id === id) return el;
    }
    return null;
  }

  function clearSelection() {
    selectedId = null;
    render();
  }

  /* ---------------- Element creation ---------------- */
  function addElement(el, pageIndex) {
    const pg = pageIndex != null ? pages[pageIndex] : currentPage();
    pg.elements.push(el);
    selectedId = el.id;
    return el;
  }

  function makeDefaults(type, x, y) {
    const common = { id: uid(), type, x, y, rot: 0, opacity: 100 };
    if (type === "text") return Object.assign(common, {
      value: "Double-click to edit",
      fontFamily: "Inter", fontSize: 24, color: "#22252b",
      bold: false, italic: false, underline: false, align: "left", lineHeight: 1.2,
      w: 260, h: 60,
    });
    if (type === "rect") return Object.assign(common, { w: 180, h: 120, fill: currentFill, fillOpacity: 60, strokeWidth: 2, strokeColor: currentStroke, radius: 8, shadow: 0 });
    if (type === "ellipse") return Object.assign(common, { w: 180, h: 140, fill: currentFill, fillOpacity: 60, strokeWidth: 2, strokeColor: currentStroke, shadow: 0 });
    if (type === "line" || type === "arrow") return Object.assign(common, { x1: x, y1: y, x2: x + 100, y2: y + 100, w: 100, h: 100, strokeColor: currentStroke, strokeWidth: 3, arrowSize: 12 });
    if (type === "image") return Object.assign(common, { src: "", w: 200, h: 200 });
    if (type === "draw") return Object.assign(common, { path: "", strokeColor: currentStroke, strokeWidth: +$("draw-size").value || 4, w: 1, h: 1 });
    return common;
  }

  /* ---------------- Page events ---------------- */
  function attachPageEvents(pg) {
    pg.addEventListener("pointerdown", (e) => {
      const idx = +pg.dataset.index;
      if (idx !== pageIdx) { pageIdx = idx; render(); return; }
      if (busy || editingText) return;

      const pos = pagePos(pg, e);

      if (tool === "select") {
        clearSelection();
        return;
      }
      if (tool === "text") {
        const el = makeDefaults("text", pos.x, pos.y);
        addElement(el);
        saveState();
        render();
        startTextEdit(el.id);
        return;
      }
      if (tool === "image") {
        $("image-input").dataset.place = JSON.stringify(pos);
        $("image-input").click();
        return;
      }
      if (tool === "rect" || tool === "ellipse" || tool === "line" || tool === "arrow" || tool === "draw") {
        saveState();
        const el = makeDefaults(tool, pos.x, pos.y);
        addElement(el);
        if (tool === "draw") el.path = "M" + pos.x + " " + pos.y;
        drag = { mode: "create", el, start: { x: pos.x, y: pos.y }, startEl: { x: el.x, y: el.y } };
        render();
        window.addEventListener("pointermove", onCreateMove);
        window.addEventListener("pointerup", onCreateUp);
        return;
      }
    });
  }

  function onCreateMove(e) {
    const pg = currentPageEl();
    const pos = pagePos(pg, e);
    const el = drag.el;
    if (drag.mode !== "create") return;

    if (el.type === "draw") {
      el.path += " L" + pos.x + " " + pos.y;
      const pts = el.path.replace(/[ML]/g, " ").trim().split(/\s+/).map(Number);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]); minY = Math.min(minY, pts[i + 1]);
        maxX = Math.max(maxX, pts[i]); maxY = Math.max(maxY, pts[i + 1]);
      }
      el.x = Math.floor(minX); el.y = Math.floor(minY);
      el.w = Math.max(1, Math.ceil(maxX - minX));
      el.h = Math.max(1, Math.ceil(maxY - minY));
      el.path = "M" + (pts[0] - el.x) + " " + (pts[1] - el.y);
      for (let i = 2; i < pts.length; i += 2) el.path += " L" + (pts[i] - el.x) + " " + (pts[i + 1] - el.y);
      render();
      return;
    }

    const dx = pos.x - drag.start.x;
    const dy = pos.y - drag.start.y;
    if (el.type === "line" || el.type === "arrow") {
      el.x1 = drag.startEl.x; el.y1 = drag.startEl.y;
      el.x2 = pos.x; el.y2 = pos.y;
      fixLineBBox(el);
    } else {
      const sx = drag.startEl.x, sy = drag.startEl.y;
      el.x = Math.min(sx, pos.x); el.y = Math.min(sy, pos.y);
      el.w = Math.max(1, Math.abs(pos.x - sx));
      el.h = Math.max(1, Math.abs(pos.y - sy));
      if (el.type === "ellipse") { }
    }
    render();
  }

  function onCreateUp(e) {
    const el = drag.el;
    const min = 6;
    if (el.type !== "draw" && el.type !== "line" && el.type !== "arrow" && (el.w < min || el.h < min)) {
      el.w = Math.max(el.w, min);
      el.h = Math.max(el.h, min);
    }
    drag = null;
    window.removeEventListener("pointermove", onCreateMove);
    window.removeEventListener("pointerup", onCreateUp);
  }

  /* ---------------- Text editing ---------------- */
  let editingText = null;

  function startTextEdit(id) {
    const el = findEl(id);
    if (!el) return;
    if (editingText) commitTextEdit();
    editingText = id;
    saveState();
    render();
    const node = pagesEl.querySelector('.el-text[data-id="' + id + '"]');
    if (!node) { editingText = null; return; }
    node.contentEditable = "true";
    node.classList.add("el-edit");
    node.focus();
    document.execCommand("selectAll");
    node.addEventListener("blur", commitTextEdit);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); node.blur(); }
      if (e.key === "Escape") { cancelTextEdit(); }
    });
  }

  function commitTextEdit() {
    if (!editingText) return;
    const id = editingText;
    const node = pagesEl.querySelector('.el-text[data-id="' + id + '"]');
    const el = findEl(id);
    if (el && node) {
      el.value = node.textContent || "";
      el.h = Math.max(30, node.scrollHeight + 4);
      el.w = Math.max(40, node.scrollWidth + 4);
    }
    editingText = null;
    render();
  }

  function cancelTextEdit() {
    editingText = null;
    render();
  }

  /* ---------------- Chart modal ---------------- */
  function openChartModal() {
    if (editingText) commitTextEdit();
    const isScatter = $("chart-type").value === "scatter" || $("chart-type").value === "bubble";
    $("row-sel-data").hidden = !isScatter;
    modal.hidden = false;
  }

  function closeChartModal() { modal.hidden = true; }

  function chartHeight(type, size) {
    return Math.round(size * (["pie", "doughnut", "polarArea"].includes(type) ? 0.85 : 0.6));
  }

  function chartImage() {
    const type = $("chart-type").value;
    const size = Math.max(200, +$("chart-size").value || 600);
    const title = $("chart-title").value.trim();
    const labels = $("chart-labels").value.split("\n").map(s => s.trim()).filter(Boolean);
    const data = $("chart-data").value.split("\n").map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n));
    const colors = $("chart-colors").value.split("\n").map(s => s.trim()).filter(Boolean);

    const bg = [];
    for (let i = 0; i < (labels.length || data.length); i++) {
      bg.push(colors[i] || PALETTE[i % PALETTE.length]);
    }

    const h = chartHeight(type, size);
    const c = document.createElement("canvas");
    const dpr = 2;
    c.width = size * dpr;
    c.height = h * dpr;
    c.style.width = size + "px";
    c.style.height = h + "px";
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);

    const isScatter = type === "scatter" || type === "bubble";
    let cfg;

    if (isScatter) {
      const xs = $("chart-x").value.split("\n").map(s => +s.trim()).filter(n => !isNaN(n));
      const ys = $("chart-y").value.split("\n").map(s => +s.trim()).filter(n => !isNaN(n));
      const pts = xs.map((x, i) => ({ x, y: ys[i] != null ? ys[i] : 0 }));
      cfg = {
        type,
        data: { datasets: [{ label: title || "Data", data: pts, backgroundColor: colors[0] || PALETTE[0], borderColor: colors[0] || PALETTE[0] }] },
        options: { responsive: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: "rgba(0,0,0,.08)" } }, y: { grid: { color: "rgba(0,0,0,.08)" } } } },
      };
      if (type === "bubble") {
        cfg.data.datasets[0].data = pts.map(p => ({ x: p.x, y: p.y, r: 8 + Math.random() * 10 }));
      }
    } else {
      cfg = {
        type,
        data: { labels, datasets: [{ label: title || "Data", data, backgroundColor: type === "line" ? bg[0] : bg, borderColor: type === "line" ? bg[0] : bg, borderWidth: 3, tension: 0.35, fill: type === "line" }] },
        options: {
          responsive: false,
          plugins: {
            title: title ? { display: true, text: title, font: { size: size / 26, weight: "bold" } } : {},
            legend: { display: $("chart-legend").value !== "none", position: $("chart-legend").value, labels: { boxWidth: 14, font: { size: size / 40 } } },
          },
          scales: (type === "line" || type === "bar") ? {
            x: { grid: { color: "rgba(0,0,0,.06)" } },
            y: { grid: { color: "rgba(0,0,0,.08)" } },
          } : {},
        },
      };
    }

    new Chart(ctx, cfg);
    return { src: c.toDataURL("image/png"), w: size, h };
  }

  function insertChart() {
    try {
      const { src, w, h } = chartImage();
      const pos = { x: (PAGE_W - Math.min(w, PAGE_W - 40)) / 2, y: (PAGE_H - h) / 3 };
      const el = makeDefaults("image", pos.x, pos.y);
      el.src = src;
      el.w = Math.min(w, PAGE_W - 40);
      el.h = h * (el.w / w);
      addElement(el);
      saveState();
      render();
      closeChartModal();
      setTool("select");
      toast("Chart inserted", "success");
    } catch (e) {
      console.error(e);
      toast("Chart creation failed", "error");
    }
  }

  /* ---------------- Props panel ---------------- */
  function updatePropsPanel() {
    const el = selectedId ? findEl(selectedId) : null;
    propsEmpty.hidden = !!el;
    propsPanel.hidden = !el;
    if (!el) return;

    $("prop-x").value = Math.round(el.x);
    $("prop-y").value = Math.round(el.y);
    $("prop-w").value = Math.round(el.w);
    $("prop-h").value = Math.round(el.h);
    $("prop-rot").value = el.rot || 0;
    $("prop-opacity").value = el.opacity != null ? el.opacity : 100;

    $("section-text").hidden = el.type !== "text";
    $("section-shape").hidden = !(el.type === "rect" || el.type === "ellipse");
    $("row-radius").hidden = el.type !== "rect";

    if (el.type === "text") {
      $("prop-font").value = el.fontFamily;
      $("prop-fontsize").value = el.fontSize;
      $("prop-textcolor").value = el.color;
      $("prop-lineheight").value = el.lineHeight || 1.2;
      $("btn-bold").classList.toggle("active", !!el.bold);
      $("btn-italic").classList.toggle("active", !!el.italic);
      $("btn-underline").classList.toggle("active", !!el.underline);
      ["left", "center", "right"].forEach(a => {
        $("btn-align-" + a).classList.toggle("active", (el.align || "left") === a);
      });
    }
    if (el.type === "rect" || el.type === "ellipse") {
      $("prop-fill").value = el.fill;
      $("prop-fillopacity").value = el.fillOpacity;
      $("prop-strokewidth").value = el.strokeWidth;
      $("prop-strokecolor").value = el.strokeColor;
      $("prop-radius").value = el.radius || 0;
      $("prop-shadow").value = el.shadow || 0;
    }
  }

  function updateElementFromProps() {
    const el = selectedId ? findEl(selectedId) : null;
    if (!el) return;
    el.x = +$("prop-x").value || 0;
    el.y = +$("prop-y").value || 0;
    el.w = Math.max(1, +$("prop-w").value || 1);
    el.h = Math.max(1, +$("prop-h").value || 1);
    el.rot = +$("prop-rot").value || 0;
    el.opacity = +$("prop-opacity").value || 0;

    if (el.type === "text") {
      el.fontSize = +$("prop-fontsize").value || 12;
      el.color = $("prop-textcolor").value;
      el.lineHeight = +$("prop-lineheight").value || 1.2;
    }
    if (el.type === "rect" || el.type === "ellipse") {
      el.fill = $("prop-fill").value;
      el.fillOpacity = +$("prop-fillopacity").value;
      el.strokeWidth = +$("prop-strokewidth").value || 0;
      el.strokeColor = $("prop-strokecolor").value;
      el.radius = +$("prop-radius").value || 0;
      el.shadow = +$("prop-shadow").value || 0;
    }
  }

  /* ---------------- Toolbar actions ---------------- */
  function setTool(t) {
    tool = t;
    if (editingText) commitTextEdit();
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.toggle("active", b.dataset.tool === t));
    $("status-tool").textContent = t;
    document.body.style.cursor = t === "select" ? "default" : "crosshair";
  }

  function deleteSelected() {
    if (!selectedId) return;
    saveState();
    const pg = currentPage();
    pg.elements = pg.elements.filter(e => e.id !== selectedId);
    selectedId = null;
    render();
  }

  function duplicateSelected() {
    if (!selectedId) return;
    saveState();
    const el = findEl(selectedId);
    const copy = clone(el);
    copy.id = uid();
    copy.x += 16; copy.y += 16;
    currentPage().elements.push(copy);
    selectedId = copy.id;
    render();
  }

  function moveLayer(dir) {
    if (!selectedId) return;
    saveState();
    const arr = currentPage().elements;
    const i = arr.findIndex(e => e.id === selectedId);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    render();
  }

  function addPage() {
    saveState();
    pages.push({ elements: [] });
    pageIdx = pages.length - 1;
    selectedId = null;
    render();
    toast("Page " + pages.length + " added", "success");
  }

  function deletePage() {
    if (pages.length <= 1) { toast("Cannot delete the last page", "error"); return; }
    saveState();
    pages.splice(pageIdx, 1);
    if (pageIdx >= pages.length) pageIdx = pages.length - 1;
    selectedId = null;
    render();
  }

  function setZoom(v) {
    zoom = clamp(Math.round(v), 25, 300);
    $("zoom-label").textContent = zoom + "%";
    $("status-zoom").textContent = zoom + "%";
    pagesEl.style.zoom = zoom / 100;
  }

  function nudge(dx, dy) {
    if (!selectedId) return;
    const el = findEl(selectedId);
    if (!el) return;
    saveState();
    el.x = clamp(el.x + dx, 0, PAGE_W - el.w);
    el.y = clamp(el.y + dy, 0, PAGE_H - el.h);
    render();
  }

  /* ---------------- Export ---------------- */
  async function exportPDF() {
    if (busy) return;
    if (!window.jspdf) { toast("PDF library not loaded. Check connection.", "error"); return; }
    if (editingText) commitTextEdit();

    busy = true;
    const savedSel = selectedId;
    let overlay;
    try {
      selectedId = null;
      render();

      overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(10,12,16,.75);display:grid;place-items:center;z-index:400;color:#fff;font-size:16px;";
      overlay.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;"><div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.25);border-top-color:#6c8cff;border-radius:50%;animation:spin 1s linear infinite;"></div>Generating PDF…</div>';
      document.body.appendChild(overlay);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const savedZoom = zoom;
      setZoom(100);

      for (let i = 0; i < pages.length; i++) {
        const node = pagesEl.children[i];
        await document.fonts.ready;
        const canvas = await html2canvas(node, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          windowWidth: PAGE_W,
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, 210, 297);
        overlay.firstChild.textContent = "Rendering page " + (i + 1) + "/" + pages.length + "…";
      }

      setZoom(savedZoom);
      pdf.save("pdf-creator-design.pdf");
      toast("PDF exported!", "success");
    } catch (err) {
      console.error(err);
      toast("Export failed: " + err.message, "error");
    } finally {
      busy = false;
      selectedId = savedSel;
      render();
      if (overlay) overlay.remove();
    }
  }

  /* ---------------- Images ---------------- */
  function handleImageFile(file) {
    const place = JSON.parse($("image-input").dataset.place || "null");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        saveState();
        const maxW = PAGE_W * 0.7, maxH = PAGE_H * 0.7;
        let w = img.width, h = img.height;
        const sc = Math.min(1, maxW / w, maxH / h);
        w *= sc; h *= sc;
        const pos = place || { x: (PAGE_W - w) / 2, y: (PAGE_H - h) / 3 };
        const el = makeDefaults("image", pos.x, pos.y);
        el.src = ev.target.result;
        el.w = Math.max(20, w);
        el.h = Math.max(20, h);
        addElement(el);
        render();
        setTool("select");
        toast("Image added", "success");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- Mini palette ---------------- */
  function buildMiniPalette() {
    const wrap = $("mini-colors");
    wrap.innerHTML = "";
    PALETTE.forEach((c) => {
      const d = document.createElement("div");
      d.className = "mini-color";
      d.style.background = c;
      d.title = c;
      d.addEventListener("click", () => {
        currentStroke = c;
        wrap.querySelectorAll(".mini-color").forEach(x => x.style.borderColor = "rgba(255,255,255,.25)");
        d.style.borderColor = "#fff";
      });
      wrap.appendChild(d);
    });
  }

  function hexToRgba(hex, a) {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + (a == null ? 1 : a) + ")";
  }

  /* ---------------- Wiring ---------------- */
  function wire() {
    // tools
    document.querySelectorAll(".tool-btn").forEach(b => b.addEventListener("click", () => setTool(b.dataset.tool)));

    // toolbar
    $("btn-undo").onclick = () => { if (undoStack.length) { redoStack.push(snapshot()); restoreState(undoStack.pop()); } };
    $("btn-redo").onclick = () => { if (redoStack.length) { undoStack.push(snapshot()); restoreState(redoStack.pop()); } };
    $("btn-zoom-in").onclick = () => setZoom(zoom + 10);
    $("btn-zoom-out").onclick = () => setZoom(zoom - 10);
    $("btn-add-page").onclick = addPage;
    $("btn-delete-page").onclick = deletePage;
    $("btn-duplicate").onclick = duplicateSelected;
    $("btn-export").onclick = exportPDF;

    // props
    ["prop-x", "prop-y", "prop-w", "prop-h", "prop-rot"].forEach(id => {
      $(id).addEventListener("change", () => { if (!selectedId) return; saveState(); updateElementFromProps(); render(); });
    });
    $("prop-opacity").addEventListener("input", () => { updateElementFromProps(); render(); });
    $("prop-font").addEventListener("change", () => {
      const el = findEl(selectedId); if (!el) return;
      ensureFontLoaded($("prop-font").value);
      saveState(); el.fontFamily = $("prop-font").value; render();
    });
    $("prop-fontsize").addEventListener("change", () => { if (!selectedId) return; saveState(); updateElementFromProps(); render(); });
    $("prop-textcolor").addEventListener("input", () => { updateElementFromProps(); render(); });
    $("prop-lineheight").addEventListener("input", () => { updateElementFromProps(); render(); });
    $("btn-bold").onclick = () => { const el = findEl(selectedId); if (!el) return; saveState(); el.bold = !el.bold; render(); };
    $("btn-italic").onclick = () => { const el = findEl(selectedId); if (!el) return; saveState(); el.italic = !el.italic; render(); };
    $("btn-underline").onclick = () => { const el = findEl(selectedId); if (!el) return; saveState(); el.underline = !el.underline; render(); };
    ["left", "center", "right"].forEach(a => {
      $("btn-align-" + a).onclick = () => { const el = findEl(selectedId); if (!el) return; saveState(); el.align = a; render(); };
    });
    ["prop-fill", "prop-strokecolor"].forEach(id => $(id).addEventListener("input", () => { updateElementFromProps(); render(); }));
    ["prop-fillopacity", "prop-radius", "prop-shadow"].forEach(id => $(id).addEventListener("input", () => { updateElementFromProps(); render(); }));
    $("prop-strokewidth").addEventListener("change", () => { if (!selectedId) return; saveState(); updateElementFromProps(); render(); });

    $("btn-front").onclick = () => { const el = findEl(selectedId); if (!el) return; saveState(); const a = currentPage().elements; a.splice(a.indexOf(el), 1); a.push(el); render(); };
    $("btn-back").onclick = () => { const el = findEl(selectedId); if (!el) return; saveState(); const a = currentPage().elements; a.splice(a.indexOf(el), 1); a.unshift(el); render(); };
    $("btn-up").onclick = () => moveLayer(1);
    $("btn-down").onclick = () => moveLayer(-1);
    $("btn-dup").onclick = duplicateSelected;
    $("btn-delete").onclick = deleteSelected;

    // modal
    $("chart-close").onclick = closeChartModal;
    modal.addEventListener("click", (e) => { if (e.target === modal) closeChartModal(); });
    $("chart-type").addEventListener("change", () => {
      const s = $("chart-type").value;
      $("row-sel-data").hidden = !(s === "scatter" || s === "bubble");
    });
    $("chart-preview").onclick = () => {
      try { const r = chartImage(); const w = window.open("", "_blank"); if (w) { w.document.write('<img src="' + r.src + '" />'); } } catch (e) { toast("Preview failed", "error"); }
    };
    $("chart-insert").onclick = insertChart;

    // image / font upload
    $("image-input").addEventListener("change", (e) => { if (e.target.files[0]) handleImageFile(e.target.files[0]); e.target.value = ""; });
    $("font-input").addEventListener("change", async (e) => { if (e.target.files[0]) await loadCustomFont(e.target.files[0]); e.target.value = ""; });

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (modal && !modal.hidden) return;
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || editingText;
      if (e.key === "Escape" && !typing) { clearSelection(); setTool("select"); return; }
      if (e.key === "Delete" && !typing) { deleteSelected(); return; }
      if ((e.ctrlKey || e.metaKey) && !typing) {
        if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); $("btn-undo").click(); return; }
        if (e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); $("btn-redo").click(); return; }
        if (e.key.toLowerCase() === "y") { e.preventDefault(); $("btn-redo").click(); return; }
        if (e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
      }
      if (!typing && selectedId && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        nudge(e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
      }
      const toolKeys = { v: "select", t: "text", r: "rect", l: "line", i: "image" };
      if (!typing && !e.ctrlKey && !e.metaKey && toolKeys[e.key.toLowerCase()]) {
        setTool(toolKeys[e.key.toLowerCase()]);
      }
    });

    canvasScroll.addEventListener("wheel", (e) => {
      if (e.ctrlKey) { e.preventDefault(); setZoom(zoom - Math.sign(e.deltaY) * 5); }
    }, { passive: false });

    // status
    $("status-tool").textContent = "Select";
  }

  /* ---------------- Init ---------------- */
  buildFontOptions();
  buildMiniPalette();
  wire();
  render();
  setZoom(100);
})();
