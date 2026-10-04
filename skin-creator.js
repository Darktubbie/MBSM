/* ============================================================
   skin-creator.js
   "Skin Creator": editor de skins clásicas de Minecraft Bedrock
   con lienzo 2D + vista previa 3D en vivo.

   La vista 3D usa la librería open-source skinview3d (MIT,
   https://github.com/bs-community/skinview3d) en vez de un
   modelo hecho a mano -- el primer intento con geometría/UV
   propios salía con las partes mal ubicadas. skinview3d ya
   resuelve esto de forma probada (miles de sitios la usan para
   renderizar skins de Minecraft).

   Formato de textura: igual que un PNG de skin real -- una sola
   imagen que ya contiene tanto la capa base como la overlay,
   cada una en su propia región UV (por eso importar un PNG real
   funciona directo).
   ============================================================ */
const SkinCreator = (() => {
  let inited = false;

  /* ---------------- i18n ---------------- */
  const I18N = {
    en: {
      'sc.title': 'Skin Creator',
      'sc.resolution': 'Resolution',
      'sc.resolutionHintNew': '64×64 supports a base and an overlay layer.',
      'sc.resolutionHintLegacy': '64×32 is the legacy format: base layer only, no overlay.',
      'sc.resolutionHintHd': '128×128 is a 2× version of the same layout, with base and overlay.',
      'sc.model': 'Model',
      'sc.modelWide': 'Steve (wide)',
      'sc.modelSlim': 'Alex (slim)',
      'sc.layer': 'Layer',
      'sc.layerBase': 'Base',
      'sc.layerOverlay': 'Overlay',
      'sc.showOverlayIn3d': 'Show overlay in the 3D preview',
      'sc.tools': 'Tools',
      'sc.toolPencil': 'Pencil',
      'sc.toolEraser': 'Eraser',
      'sc.toolBucket': 'Fill bucket',
      'sc.toolEyedropper': 'Eyedropper',
      'sc.eraseToTransparent': 'Eraser leaves pixels transparent',
      'sc.color': 'Color',
      'sc.fileSection': 'File',
      'sc.newSkin': 'New blank skin',
      'sc.importPng': 'Import PNG to edit',
      'sc.exportPng': 'Export as PNG',
      'sc.preview3dTitle': '3D Preview',
      'sc.dragToRotate': 'Drag to rotate · scroll to zoom',
      'sc.showGrid': 'Grid',
      'sc.highlightPart': 'Highlight body parts',
      'sc.canvasHint': 'One finger draws · two fingers move and zoom the canvas',
      'sc.modePencil': 'Draw mode',
      'sc.modeHand': 'Move & zoom mode (drawing disabled)',
      'sc.canvasHintHand': 'Move & zoom mode — drag with one or two fingers, nothing gets painted',
      'mobile.tools': 'Tools',
      'mobile.canvas': 'Canvas',
      'mobile.preview3d': '3D',
      'sc.importUnsupported': (w, h) => `That image is ${w}x${h}px, which isn't one of the supported sizes (64x64, 64x32, 128x128).`,
      'sc.importOk': (w, h) => `Loaded a ${w}x${h} skin.`,
      'sc.newSkinConfirm': 'Start a new blank skin? Unsaved changes will be lost.',
      'sc.exportedToast': 'Skin exported as PNG.',
      'sc.viewerLoadError': '3D preview library failed to load — check your connection and reload the page. The 2D editor still works.'
    },
    es: {
      'sc.title': 'Creador de Skins',
      'sc.resolution': 'Resolución',
      'sc.resolutionHintNew': '64×64 soporta capa base y capa overlay.',
      'sc.resolutionHintLegacy': '64×32 es el formato antiguo: solo capa base, sin overlay.',
      'sc.resolutionHintHd': '128×128 es una versión 2× del mismo layout, con base y overlay.',
      'sc.model': 'Modelo',
      'sc.modelWide': 'Steve (ancho)',
      'sc.modelSlim': 'Alex (delgado)',
      'sc.layer': 'Capa',
      'sc.layerBase': 'Base',
      'sc.layerOverlay': 'Overlay',
      'sc.showOverlayIn3d': 'Mostrar overlay en la vista 3D',
      'sc.tools': 'Herramientas',
      'sc.toolPencil': 'Lápiz',
      'sc.toolEraser': 'Borrador',
      'sc.toolBucket': 'Cubeta de relleno',
      'sc.toolEyedropper': 'Gotero',
      'sc.eraseToTransparent': 'El borrador deja los píxeles transparentes',
      'sc.color': 'Color',
      'sc.fileSection': 'Archivo',
      'sc.newSkin': 'Nueva skin en blanco',
      'sc.importPng': 'Importar PNG para editar',
      'sc.exportPng': 'Exportar como PNG',
      'sc.preview3dTitle': 'Vista previa 3D',
      'sc.dragToRotate': 'Arrastra para rotar · scroll para zoom',
      'sc.showGrid': 'Grilla',
      'sc.highlightPart': 'Resaltar partes del cuerpo',
      'sc.canvasHint': 'Un dedo dibuja · dos dedos mueven y hacen zoom del lienzo',
      'sc.modePencil': 'Modo dibujo',
      'sc.modeHand': 'Modo mover y hacer zoom (sin dibujar)',
      'sc.canvasHintHand': 'Modo mover y hacer zoom — arrastra con uno o dos dedos, no se pinta nada',
      'mobile.tools': 'Herramientas',
      'mobile.canvas': 'Lienzo',
      'mobile.preview3d': '3D',
      'sc.importUnsupported': (w, h) => `Esa imagen es de ${w}x${h}px, que no es una resolución soportada (64x64, 64x32, 128x128).`,
      'sc.importOk': (w, h) => `Se cargó una skin de ${w}x${h}.`,
      'sc.newSkinConfirm': '¿Empezar una skin nueva en blanco? Se perderán los cambios sin exportar.',
      'sc.exportedToast': 'Skin exportada como PNG.',
      'sc.viewerLoadError': 'La librería de vista previa 3D no cargó — revisa tu conexión y recarga la página. El editor 2D sigue funcionando.'
    }
  };
  function scLang() {
    try {
      const stored = localStorage.getItem('mbsm_lang');
      if (stored === 'es' || stored === 'en') return stored;
    } catch (e) {}
    return (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  }
  function t(key, ...args) {
    const dict = I18N[scLang()] || I18N.es;
    const entry = dict[key] !== undefined ? dict[key] : I18N.es[key];
    if (typeof entry === 'function') return entry(...args);
    return entry !== undefined ? entry : key;
  }
  function applyI18n() {
    document.querySelectorAll('#skinCreatorStudio [data-sc-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-sc-i18n'));
    });
    document.querySelectorAll('#skinCreatorStudio [data-sc-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-sc-i18n-title'));
    });
  }

  /* ---------------- Mapa UV (para el resaltado de partes en el lienzo 2D) ----------------
     Cada región es [x, y, w, h] en px sobre un lienzo de 64x64 (se escala x2
     para 128x128). Sirve para dibujar los contornos guía y saber en qué
     parte del cuerpo se está pintando -- ya no se usa para geometría 3D
     (eso lo resuelve skinview3d), solo para la ayuda visual del editor. */
  const UV = {
    head1: { top:[8,0,8,8], bottom:[16,0,8,8], right:[0,8,8,8], front:[8,8,8,8], left:[16,8,8,8], back:[24,8,8,8] },
    head2: { top:[40,0,8,8], bottom:[48,0,8,8], right:[32,8,8,8], front:[40,8,8,8], left:[48,8,8,8], back:[56,8,8,8] },
    body1: { top:[20,16,8,4], bottom:[28,16,8,4], right:[16,20,4,12], front:[20,20,8,12], left:[28,20,4,12], back:[32,20,8,12] },
    body2: { top:[20,32,8,4], bottom:[28,32,8,4], right:[16,36,4,12], front:[20,36,8,12], left:[28,36,4,12], back:[32,36,8,12] },
    rarm1: { top:[44,16,4,4], bottom:[48,16,4,4], right:[40,20,4,12], front:[44,20,4,12], left:[48,20,4,12], back:[52,20,4,12] },
    rarm2: { top:[44,32,4,4], bottom:[48,32,4,4], right:[40,36,4,12], front:[44,36,4,12], left:[48,36,4,12], back:[52,36,4,12] },
    larm1: { top:[36,48,4,4], bottom:[40,48,4,4], right:[32,52,4,12], front:[36,52,4,12], left:[40,52,4,12], back:[44,52,4,12] },
    larm2: { top:[52,48,4,4], bottom:[56,48,4,4], right:[48,52,4,12], front:[52,52,4,12], left:[56,52,4,12], back:[60,52,4,12] },
    rleg1: { top:[4,16,4,4], bottom:[8,16,4,4], right:[0,20,4,12], front:[4,20,4,12], left:[8,20,4,12], back:[12,20,4,12] },
    rleg2: { top:[4,32,4,4], bottom:[8,32,4,4], right:[0,36,4,12], front:[4,36,4,12], left:[8,36,4,12], back:[12,36,4,12] },
    lleg1: { top:[20,48,4,4], bottom:[24,48,4,4], right:[16,52,4,12], front:[20,52,4,12], left:[24,52,4,12], back:[28,52,4,12] },
    lleg2: { top:[4,48,4,4], bottom:[8,48,4,4], right:[0,52,4,12], front:[4,52,4,12], left:[8,52,4,12], back:[12,52,4,12] }
  };
  // Colores por cara (no por parte del cuerpo), al estilo de la textura
  // de ejemplo que trae Blockbench en una skin nueva: cada una de las 6
  // caras de un cubo (arriba/abajo/frente/atrás/izquierda/derecha) tiene
  // su propio color, igual en cabeza/cuerpo/brazos/piernas -- así, con
  // solo mirar el color ya sabes qué cara del modelo es esa región.
  const FACE_COLORS = {
    top: '#e8e8e8', bottom: '#5a5a5a', front: '#4caf50',
    back: '#3f51b5', left: '#ff9800', right: '#e91e63'
  };
  function forEachUVRect(scale, hasOverlay, cb) {
    Object.keys(UV).forEach(key => {
      const isLayer2 = key.endsWith('2');
      if (isLayer2 && !hasOverlay) return;
      const partName = key.slice(0, -1);
      const box = UV[key];
      Object.keys(box).forEach(face => {
        const [x, y, w, h] = box[face];
        cb(x * scale, y * scale, w * scale, h * scale, partName, face, isLayer2);
      });
    });
  }
  function drawDefaultTemplate(ctx, scale, hasOverlay) {
    // Solo pinta la capa base (capa 1); la capa overlay se deja
    // transparente para que el usuario decida si le agrega algo ahí.
    forEachUVRect(scale, false, (x, y, w, h, partName, face) => {
      ctx.fillStyle = FACE_COLORS[face] || '#888888';
      ctx.fillRect(x, y, w, h);
    });
  }

  /* ---------------- Estado ---------------- */
  const state = {
    resKey: '64x64', w: 64, h: 64, scale: 1, hasOverlay: true,
    model: 'wide', layer: 'base', tool: 'pencil', interactionMode: 'pencil',
    color: '#e0ac7cff', eraseTransparent: true,
    showOverlayIn3d: true, showGrid: true,
    zoom: 8, panX: 0, panY: 0, canvas: null, ctx: null, dirty: false
  };
  const RES_MAP = {
    '64x64': { w: 64, h: 64, scale: 1, overlay: true },
    '64x32': { w: 64, h: 32, scale: 1, overlay: false },
    '128x128': { w: 128, h: 128, scale: 2, overlay: true }
  };

  function makeBlankCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function get2dCtx(canvas) {
    return canvas.getContext('2d', { willReadFrequently: true });
  }

  function setResolution(resKey, preserveContent, applyTemplate) {
    const def = RES_MAP[resKey];
    state.resKey = resKey;
    state.w = def.w; state.h = def.h; state.scale = def.scale; state.hasOverlay = def.overlay;

    const old = state.canvas;
    const next = makeBlankCanvas(state.w, state.h);
    const nctx = get2dCtx(next);
    nctx.imageSmoothingEnabled = false;
    if (preserveContent && old) {
      nctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, next.width, next.height);
    } else if (applyTemplate) {
      drawDefaultTemplate(nctx, state.scale, def.overlay);
    }
    state.canvas = next;
    state.ctx = nctx;

    if (!def.overlay && state.layer === 'overlay') setLayer('base');
    resizeCanvasElements();
    render2d();
    pushTextureToViewer();
    updateResolutionHint();
    updateLayerAvailability();
  }

  function updateResolutionHint() {
    const hint = document.getElementById('scResolutionHint');
    if (!hint) return;
    const key = state.resKey === '64x32' ? 'sc.resolutionHintLegacy'
      : state.resKey === '128x128' ? 'sc.resolutionHintHd' : 'sc.resolutionHintNew';
    hint.textContent = t(key);
  }
  function updateLayerAvailability() {
    const overlayBtn = document.getElementById('scLayerOverlay');
    if (!overlayBtn) return;
    overlayBtn.disabled = !state.hasOverlay;
    overlayBtn.style.opacity = state.hasOverlay ? '' : '.4';
    overlayBtn.style.cursor = state.hasOverlay ? '' : 'not-allowed';
  }

  /* ---------------- Herramientas de dibujo ---------------- */
  function hexToRgba(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 6) hex += 'ff';
    const n = parseInt(hex, 16);
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }
  function rgbaToHex([r, g, b, a]) {
    const h = v => v.toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b) + h(a);
  }
  function setPixel(x, y, [r, g, b, a]) {
    if (x < 0 || y < 0 || x >= state.w || y >= state.h) return;
    const id = state.ctx.getImageData(x, y, 1, 1);
    id.data[0] = r; id.data[1] = g; id.data[2] = b; id.data[3] = a;
    state.ctx.putImageData(id, x, y);
  }
  function getPixel(x, y) {
    if (x < 0 || y < 0 || x >= state.w || y >= state.h) return [0, 0, 0, 0];
    const id = state.ctx.getImageData(x, y, 1, 1);
    return [id.data[0], id.data[1], id.data[2], id.data[3]];
  }
  function toolPencil(x, y) { setPixel(x, y, hexToRgba(state.color)); }
  function toolEraser(x, y) {
    if (state.eraseTransparent) setPixel(x, y, [0, 0, 0, 0]);
    else setPixel(x, y, [255, 255, 255, 255]);
  }
  function toolEyedropper(x, y) {
    const px = getPixel(x, y);
    if (px[3] === 0) return;
    state.color = rgbaToHex(px);
    syncColorUI();
    setTool('pencil');
  }
  function toolBucket(x, y) {
    const target = getPixel(x, y);
    const fill = hexToRgba(state.color);
    if (target.every((v, i) => v === fill[i])) return;
    const w = state.w, h = state.h;
    const img = state.ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const matches = (i) => data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3];
    const setAt = (i) => { data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3]; };
    const stack = [[x, y]];
    const seen = new Uint8Array(w * h);
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const pi = cy * w + cx;
      if (seen[pi]) continue;
      const idx = pi * 4;
      if (!matches(idx)) continue;
      seen[pi] = 1;
      setAt(idx);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    state.ctx.putImageData(img, 0, 0);
  }
  function applyTool(x, y) {
    if (state.tool === 'pencil') toolPencil(x, y);
    else if (state.tool === 'eraser') toolEraser(x, y);
    else if (state.tool === 'bucket') toolBucket(x, y);
    else if (state.tool === 'eyedropper') toolEyedropper(x, y);
    state.dirty = true;
    render2d();
    scheduleTextureUpdate();
  }
  function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll('#scToolGrid .scToolBtn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tool') === tool);
    });
  }
  function setLayer(layer) {
    if (layer === 'overlay' && !state.hasOverlay) return;
    state.layer = layer;
    document.getElementById('scLayerBase').classList.toggle('active', layer === 'base');
    document.getElementById('scLayerOverlay').classList.toggle('active', layer === 'overlay');
    renderGrid();
  }

  const PALETTE = [
    '#000000ff', '#3b3b3bff', '#7a7a7aff', '#c4c4c4ff', '#ffffffff',
    '#e0ac7cff', '#a5673fff', '#5b3a29ff', '#c62828ff', '#e67e22ff',
    '#f1c40fff', '#2e7d32ff', '#4ade80ff', '#1976d2ff', '#7c3aedff', '#e91e8cff'
  ];
  function buildSwatches() {
    const row = document.getElementById('scSwatchRow');
    if (!row) return;
    row.innerHTML = '';
    PALETTE.forEach(hex => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'scSwatch';
      b.style.background = hex.slice(0, 7);
      b.addEventListener('click', () => { state.color = hex; syncColorUI(); });
      row.appendChild(b);
    });
  }
  let colorPicker = null;
  function initColorPicker() {
    const mount = document.getElementById('scColorPickerMount');
    if (!mount || typeof MBSMColorPicker === 'undefined') return;
    colorPicker = MBSMColorPicker.create(mount, {
      initial: state.color,
      alpha: true,
      onChange: (hex) => { state.color = hex; }
    });
  }
  function syncColorUI() {
    if (colorPicker) colorPicker.setColor(state.color);
  }

  /* ---------------- Render 2D (zoom + grilla + resaltado de partes) ---------------- */
  function applyStageTransform() {
    const stage = document.getElementById('scCanvasStage');
    if (stage) stage.style.transform = `translate(${state.panX}px, ${state.panY}px)`;
  }
  function resizeCanvasElements() {
    const pixel = document.getElementById('scPixelCanvas');
    const grid = document.getElementById('scGridCanvas');
    const stage = document.getElementById('scCanvasStage');
    if (!pixel || !grid || !stage) return;
    const dw = state.w * state.zoom, dh = state.h * state.zoom;
    stage.style.width = dw + 'px';
    stage.style.height = dh + 'px';
    [pixel, grid].forEach(c => { c.width = dw; c.height = dh; c.style.width = dw + 'px'; c.style.height = dh + 'px'; });
    applyStageTransform();
    renderGrid();
  }
  function render2d() {
    const pixel = document.getElementById('scPixelCanvas');
    if (!pixel || !state.canvas) return;
    const ctx = pixel.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, pixel.width, pixel.height);
    ctx.drawImage(state.canvas, 0, 0, state.w, state.h, 0, 0, pixel.width, pixel.height);
  }
  function renderGrid() {
    const grid = document.getElementById('scGridCanvas');
    if (!grid) return;
    const ctx = grid.getContext('2d');
    ctx.clearRect(0, 0, grid.width, grid.height);

    if (state.showGrid && state.zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,.10)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= state.w; x++) {
        ctx.beginPath(); ctx.moveTo(x * state.zoom + .5, 0); ctx.lineTo(x * state.zoom + .5, grid.height); ctx.stroke();
      }
      for (let y = 0; y <= state.h; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * state.zoom + .5); ctx.lineTo(grid.width, y * state.zoom + .5); ctx.stroke();
      }
    }
  }
  function computeMinZoom() {
    const scrollEl = document.getElementById('scCanvasScroll');
    if (!scrollEl) return 2;
    const availW = Math.max(1, scrollEl.clientWidth - 32);
    const availH = Math.max(1, scrollEl.clientHeight - 32);
    const fit = Math.floor(Math.min(availW / state.w, availH / state.h));
    return Math.max(2, fit);
  }
  function setZoom(z) {
    const minZoom = computeMinZoom();
    state.zoom = Math.max(minZoom, Math.min(24, z));
    document.getElementById('scZoomLabel').textContent = Math.round(state.zoom / 8 * 800) + '%';
    resizeCanvasElements();
    render2d();
  }

  function canvasEventToPixel(e) {
    const pixel = document.getElementById('scPixelCanvas');
    const rect = pixel.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.floor((clientX - rect.left) / rect.width * state.w);
    const y = Math.floor((clientY - rect.top) / rect.height * state.h);
    return [x, y];
  }
  let painting = false;
  let lastPixel = null;
  function drawLine(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    while (true) {
      applyTool(x, y);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  function wireCanvasEvents() {
    const pixel = document.getElementById('scPixelCanvas');
    const scrollEl = document.getElementById('scCanvasScroll');
    const stage = document.getElementById('scCanvasStage');
    if (!pixel) return;

    // ---- Dibujo con mouse o con UN dedo (solo en modo lápiz) ----
    const start = (e) => {
      e.preventDefault();
      painting = true;
      const [x, y] = canvasEventToPixel(e);
      lastPixel = [x, y];
      applyTool(x, y);
    };
    const move = (e) => {
      if (!painting) return;
      e.preventDefault();
      const [x, y] = canvasEventToPixel(e);
      if (lastPixel && (lastPixel[0] !== x || lastPixel[1] !== y)) {
        if (state.tool === 'pencil' || state.tool === 'eraser') drawLine(lastPixel[0], lastPixel[1], x, y);
        else applyTool(x, y);
        lastPixel = [x, y];
      }
    };
    const end = () => { painting = false; lastPixel = null; };

    // ---- Paneo con UN puntero (mouse arrastrando, o un dedo en modo mano) ----
    let panning1 = false;
    let panStart1 = null;
    let panOrigin1 = null;
    function pointerXY(e) {
      return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    }
    const startPan1 = (e) => {
      e.preventDefault();
      panning1 = true;
      panStart1 = pointerXY(e);
      panOrigin1 = { x: state.panX, y: state.panY };
    };
    const movePan1 = (e) => {
      if (!panning1) return;
      e.preventDefault();
      const p = pointerXY(e);
      state.panX = panOrigin1.x + (p.x - panStart1.x);
      state.panY = panOrigin1.y + (p.y - panStart1.y);
      applyStageTransform();
    };
    const endPan1 = () => { panning1 = false; };

    pixel.addEventListener('mousedown', (e) => {
      if (state.interactionMode === 'hand') startPan1(e); else start(e);
    });
    pixel.addEventListener('mousemove', (e) => {
      if (state.interactionMode === 'hand') movePan1(e); else move(e);
    });
    window.addEventListener('mouseup', () => { endPan1(); end(); });

    // ---- Zoom con la rueda del mouse (escritorio) ----
    if (scrollEl) {
      scrollEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        setZoom(state.zoom + (e.deltaY < 0 ? 1 : -1));
      }, { passive: false });
    }

    // ---- Táctil: en modo lápiz, 1 dedo dibuja y 2 dedos mueven/hacen
    // zoom; en modo mano, 1 o 2 dedos siempre mueven/hacen zoom y nunca
    // dibujan. Antes el contenedor tenía scroll nativo del navegador,
    // que competía con nuestro propio manejo del toque (de ahí los
    // errores de consola "Ignored attempt to cancel..."). Ahora el
    // paneo lo hacemos nosotros por completo con transform, así que no
    // hay ningún scroll nativo con el que pelear.
    let pinchStartDist = 0;
    let pinchStartZoom = 8;
    let panStartMid = null;
    let panStartOffset = { x: 0, y: 0 };
    let twoFingerMode = false;

    function touchDist(t0, t1) {
      return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    }
    function touchMid(t0, t1) {
      return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
    }

    pixel.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        twoFingerMode = false;
        if (state.interactionMode === 'hand') startPan1(e); else start(e);
      } else if (e.touches.length >= 2) {
        painting = false; lastPixel = null; panning1 = false; // cancela cualquier trazo/paneo de 1 dedo en curso
        twoFingerMode = true;
        pinchStartDist = touchDist(e.touches[0], e.touches[1]);
        pinchStartZoom = state.zoom;
        panStartMid = touchMid(e.touches[0], e.touches[1]);
        panStartOffset = { x: state.panX, y: state.panY };
      }
    }, { passive: false });

    pixel.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (twoFingerMode && e.touches.length >= 2) {
        const dist = touchDist(e.touches[0], e.touches[1]);
        const mid = touchMid(e.touches[0], e.touches[1]);
        const scaleFactor = dist / (pinchStartDist || dist);
        const liveZoom = Math.max(computeMinZoom(), Math.min(24, pinchStartZoom * scaleFactor));
        const dx = mid.x - panStartMid.x, dy = mid.y - panStartMid.y;
        if (stage) {
          const visualScale = liveZoom / state.zoom;
          stage.style.transform = `translate(${panStartOffset.x + dx}px, ${panStartOffset.y + dy}px) scale(${visualScale})`;
        }
        pixel.dataset.liveZoom = liveZoom;
        pixel.dataset.livePanX = panStartOffset.x + dx;
        pixel.dataset.livePanY = panStartOffset.y + dy;
      } else if (!twoFingerMode) {
        if (state.interactionMode === 'hand') movePan1(e); else move(e);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      endPan1();
      if (twoFingerMode && e.touches.length < 2) {
        twoFingerMode = false;
        const liveZoom = parseFloat(pixel.dataset.liveZoom || state.zoom);
        state.panX = parseFloat(pixel.dataset.livePanX || state.panX);
        state.panY = parseFloat(pixel.dataset.livePanY || state.panY);
        setZoom(Math.round(liveZoom));
      }
      if (e.touches.length === 0) end();
    });
  }

  /* ---------------- Vista previa 3D (skinview3d) ---------------- */
  let viewer = null;
  let textureUpdateQueued = false;

  function scheduleTextureUpdate() {
    if (textureUpdateQueued) return;
    textureUpdateQueued = true;
    requestAnimationFrame(() => { textureUpdateQueued = false; pushTextureToViewer(); });
  }

  function currentSkinDataURL() {
    return state.canvas.toDataURL('image/png');
  }

  function pushTextureToViewer() {
    if (!viewer) return;
    try {
      viewer.loadSkin(currentSkinDataURL());
      applyModelType();
    } catch (e) { /* si la librería no cargó, el editor 2D sigue funcionando igual */ }
    applyOverlayVisibility();
  }

  function applyModelType() {
    // skinview3d intenta adivinar solo (slim/default) mirando la textura;
    // eso pisaba nuestra elección manual del selector Steve/Alex. Forzamos
    // el modelo explícitamente, como documenta la propia librería.
    if (!viewer) return;
    try {
      viewer.detectModel = false;
      viewer.playerObject.skin.slim = state.model === 'slim';
    } catch (e) { /* estructura interna puede variar entre versiones */ }
  }

  function applyOverlayVisibility() {
    if (!viewer || !viewer.playerObject) return;
    const parts = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const visible = state.showOverlayIn3d && state.hasOverlay;
    parts.forEach(p => {
      try {
        const part = viewer.playerObject.skin[p];
        if (part && part.outerLayer) part.outerLayer.visible = visible;
      } catch (e) { /* estructura interna puede variar entre versiones; no rompe el resto */ }
    });
  }

  function init3d() {
    const container = document.getElementById('scViewport3d');
    if (!container || viewer) return;
    if (typeof skinview3d === 'undefined') {
      const status = document.getElementById('scCanvasStatus');
      if (status) status.textContent = t('sc.viewerLoadError');
      return;
    }
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    viewer = new skinview3d.SkinViewer({
      canvas, width, height,
      skin: currentSkinDataURL(),
      model: state.model === 'slim' ? 'slim' : 'default'
    });
    applyModelType();
    try {
      const controls = skinview3d.createOrbitControls(viewer);
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = false;
    } catch (e) {}
    applyOverlayVisibility();

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      viewer.width = w;
      viewer.height = h;
    });
    ro.observe(container);

    // skinview3d trae su propio loop de render interno; solo hace falta
    // pausarlo cuando la pestaña no está visible, para no seguir usando
    // GPU en segundo plano.
    let wasActive = true;
    setInterval(() => {
      const section = document.getElementById('skinCreator');
      const isActive = !!(section && section.classList.contains('active-tab'));
      if (isActive !== wasActive) {
        wasActive = isActive;
        try { viewer.renderPaused = !isActive; } catch (e) {}
      }
    }, 500);
  }

  /* ---------------- Importar / exportar PNG ---------------- */
  function detectResKeyFromSize(w, h) {
    if (w === 64 && h === 64) return '64x64';
    if (w === 64 && h === 32) return '64x32';
    if (w === 128 && h === 128) return '128x128';
    return null;
  }
  function importFile(file) {
    const img = new Image();
    img.onload = () => {
      const resKey = detectResKeyFromSize(img.width, img.height);
      const hintEl = document.getElementById('scImportHint');
      if (!resKey) {
        if (hintEl) hintEl.textContent = t('sc.importUnsupported', img.width, img.height);
        return;
      }
      setResolution(resKey, false);
      document.querySelectorAll('#scResolutionRow .scSegBtn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-res') === resKey);
      });
      state.ctx.clearRect(0, 0, state.w, state.h);
      state.ctx.drawImage(img, 0, 0);
      render2d();
      pushTextureToViewer();
      if (hintEl) hintEl.textContent = t('sc.importOk', img.width, img.height);
    };
    img.onerror = () => {
      const hintEl = document.getElementById('scImportHint');
      if (hintEl) hintEl.textContent = t('sc.importUnsupported', '?', '?');
    };
    img.src = URL.createObjectURL(file);
  }
  function exportPng() {
    const out = document.createElement('canvas');
    out.width = state.w; out.height = state.h;
    out.getContext('2d').drawImage(state.canvas, 0, 0);
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'skin_' + state.w + 'x' + state.h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (typeof window.mbsmToast === 'function') window.mbsmToast('success', t('sc.exportedToast'));
    }, 'image/png');
  }

  /* ---------------- Paneles móviles (bottom sheets) ---------------- */
  function wireMobilePanels() {
    const backdrop = document.getElementById('scMobileBackdrop');
    const toolsEl = document.getElementById('scTools');
    const preview3dEl = document.getElementById('scPreview3d');
    const btnTools = document.getElementById('scBtnMobileTools');
    const btnCanvas = document.getElementById('scBtnMobileCanvas');
    const btn3d = document.getElementById('scBtnMobile3d');
    if (!backdrop || !toolsEl || !preview3dEl) return;

    function setTab(activeBtn) {
      [btnTools, btnCanvas, btn3d].forEach(b => b.classList.toggle('active', b === activeBtn));
    }
    function closeAll() {
      toolsEl.classList.remove('open');
      preview3dEl.classList.remove('open');
      backdrop.classList.remove('active');
      setTab(btnCanvas);
    }
    function openPanel(el, btn) {
      toolsEl.classList.remove('open');
      preview3dEl.classList.remove('open');
      el.classList.add('open');
      backdrop.classList.add('active');
      setTab(btn);
    }
    btnTools.addEventListener('click', () => openPanel(toolsEl, btnTools));
    btn3d.addEventListener('click', () => openPanel(preview3dEl, btn3d));
    btnCanvas.addEventListener('click', closeAll);
    backdrop.addEventListener('click', closeAll);
    document.getElementById('scBtnCloseTools').addEventListener('click', closeAll);
    document.getElementById('scBtnClose3d').addEventListener('click', closeAll);

    [toolsEl, preview3dEl].forEach(sheet => {
      const handle = sheet.querySelector('.scMobileSheetHandle');
      if (!handle) return;
      let startY = 0, dragging = false;
      handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; dragging = true; sheet.style.transition = 'none'; }, { passive: true });
      handle.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dy = Math.max(0, e.touches[0].clientY - startY);
        sheet.style.transform = `translateY(${dy}px)`;
      }, { passive: true });
      handle.addEventListener('touchend', (e) => {
        if (!dragging) return;
        dragging = false;
        sheet.style.transition = '';
        sheet.style.transform = '';
        if (e.changedTouches[0].clientY - startY > 90) closeAll();
      });
    });
  }

  /* ---------------- Wiring general ---------------- */
  function wireUI() {
    window.addEventListener('resize', () => setZoom(state.zoom));

    function setInteractionMode(mode) {
      state.interactionMode = mode;
      document.getElementById('scModePencil').classList.toggle('active', mode === 'pencil');
      document.getElementById('scModeHand').classList.toggle('active', mode === 'hand');
      const pixel = document.getElementById('scPixelCanvas');
      if (pixel) pixel.style.cursor = mode === 'hand' ? 'grab' : 'crosshair';
      const status = document.getElementById('scCanvasStatus');
      if (status) status.textContent = mode === 'hand' ? t('sc.canvasHintHand') : t('sc.canvasHint');
    }
    document.getElementById('scModePencil').addEventListener('click', () => setInteractionMode('pencil'));
    document.getElementById('scModeHand').addEventListener('click', () => setInteractionMode('hand'));
    document.querySelectorAll('#scResolutionRow .scSegBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#scResolutionRow .scSegBtn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setResolution(btn.getAttribute('data-res'), true);
      });
    });
    document.querySelectorAll('[data-model]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-model]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.model = btn.getAttribute('data-model');
        pushTextureToViewer();
      });
    });
    document.getElementById('scLayerBase').addEventListener('click', () => setLayer('base'));
    document.getElementById('scLayerOverlay').addEventListener('click', () => setLayer('overlay'));
    document.getElementById('scShowOverlayIn3d').addEventListener('change', (e) => {
      state.showOverlayIn3d = e.target.checked;
      applyOverlayVisibility();
    });
    document.querySelectorAll('#scToolGrid .scToolBtn').forEach(btn => {
      btn.addEventListener('click', () => setTool(btn.getAttribute('data-tool')));
    });
    document.getElementById('scEraseToTransparent').addEventListener('change', (e) => {
      state.eraseTransparent = e.target.checked;
    });
    document.getElementById('scShowGrid').addEventListener('change', (e) => {
      state.showGrid = e.target.checked;
      renderGrid();
    });
    document.getElementById('scZoomIn').addEventListener('click', () => setZoom(state.zoom + 2));
    document.getElementById('scZoomOut').addEventListener('click', () => setZoom(state.zoom - 2));

    document.getElementById('scNewSkinBtn').addEventListener('click', () => {
      if (state.dirty && !confirm(t('sc.newSkinConfirm'))) return;
      state.ctx.clearRect(0, 0, state.w, state.h);
      drawDefaultTemplate(state.ctx, state.scale, state.hasOverlay);
      state.dirty = false;
      render2d();
      pushTextureToViewer();
      const hintEl = document.getElementById('scImportHint');
      if (hintEl) hintEl.textContent = '';
    });
    document.getElementById('scImportInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importFile(f);
      e.target.value = '';
    });
    document.getElementById('scExportBtn').addEventListener('click', exportPng);

    wireCanvasEvents();
    wireMobilePanels();
  }

  /* ---------------- Init (lazy) ---------------- */
  function init() {
    if (inited) return;
    inited = true;

    applyI18n();
    buildSwatches();
    initColorPicker();
    syncColorUI();
    setResolution('64x64', false, true);
    setZoom(8);
    wireUI();
    const status = document.getElementById('scCanvasStatus');
    if (status) status.textContent = t('sc.canvasHint');
    init3d();
  }

  return { init };
})();

(function () {
  var btn = document.querySelector('.tab-link[data-tab="skinCreator"]');
  if (!btn) return;
  document.querySelectorAll('.tab-link[data-tab="skinCreator"]').forEach(function (link) {
    link.addEventListener('click', function () { SkinCreator.init(); });
  });
  // Enlaces directos (/Skin-Creator/) o el botón atrás/adelante del
  // navegador llaman a switchTab() directamente, sin pasar por un clic
  // en el link de arriba -- por eso se revisa también en estos casos.
  window.addEventListener('load', function () {
    var section = document.getElementById('skinCreator');
    if (section && section.classList.contains('active-tab')) SkinCreator.init();
  });
  window.addEventListener('popstate', function () {
    setTimeout(function () {
      var section = document.getElementById('skinCreator');
      if (section && section.classList.contains('active-tab')) SkinCreator.init();
    }, 0);
  });
})();
