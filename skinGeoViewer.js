/* =========================================================================
   skinGeoViewer.js — UI and orchestration for MBSM's 4D/5D viewer
   (built on the working code from SkinGeo Viewer/Fixer)

   Responsible for:
     - dropzones (pack / standalone geometry / standalone texture)
     - the model selector
     - drawing 4D (cubes) and 5D (poly_mesh) models with the same Renderer5D
       (the Blockbench embed was removed)
     - toggling controls (auto-rotate, wireframe, grid, pivots)
     - logging

   ISOLATION: everything lives inside the SkinGeoViewer namespace (an
   IIFE). It doesn't declare any global variable (`state`, `log`, `$`...)
   the way SkinGeo's original viewer.js did — that would have risked
   colliding with other MBSM modules. The DOM ids it uses are all
   prefixed with "sg" and live exclusively inside this tool's sub-tab in
   index.html.

   IMPORTANT: this file is a module INDEPENDENT from MBSM's original
   viewer.js (the regular Skin Pack viewer). It doesn't replace it,
   doesn't modify it, and shares no state with it.
   ========================================================================= */

const SkinGeoViewer = (function () {

  const state = {
    geoData: null,
    selectedGeo: null,
    zip: null,
    currentOptions: null,
    textureURL: null,
    textureImg: null,
    textureBlob: null,
    textureFilename: null
  };

  const $ = (id) => document.getElementById(id);
  let logBox = null;

  function log(msg, kind) {
    if (!logBox) return;
    const line = document.createElement("div");
    if (kind) line.className = kind;
    line.textContent = msg;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }
  function clearLog() { if (logBox) logBox.innerHTML = ""; }

  /* ---------------------------------------------------------------------
     Switching the panel (5D <-> 4D) within the host
     --------------------------------------------------------------------- */

  function showPanelFor(/* type */) {
    // 4D and 5D now share the same canvas, so the panel is always the 3D one.
    $("sgThreeViewer").style.display = "block";
    const bb = $("sgBlockbenchViewer");
    if (bb) bb.style.display = "none";
    $("sgViewportToolbar").style.display = "flex";
    $("sgRenderer5dControls").classList.remove("controls-disabled");
    Renderer5D.show();
  }

  /* ---------------------------------------------------------------------
     Dropzones
     --------------------------------------------------------------------- */

  function setupDropzone(zoneId, inputId, nameId, onFile) {
    const zone = $(zoneId);
    const input = $(inputId);
    const nameEl = $(nameId);
    if (!zone || !input) return;

    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => {
      if (e.target.files[0]) {
        if (nameEl) nameEl.textContent = e.target.files[0].name;
        onFile(e.target.files[0]);
      }
    });
    ["dragenter", "dragover"].forEach(evt =>
      zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add("drag"); })
    );
    ["dragleave", "drop"].forEach(evt =>
      zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove("drag"); })
    );
    zone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file) {
        if (nameEl) nameEl.textContent = file.name;
        onFile(file);
      }
    });
  }

  function handleGeoFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const json = SkinPack.repairAndParseJSON(reader.result);
      if (!json) {
        log("No se pudo leer " + file.name + " como JSON válido (ni siquiera tras intentar reparar comas sobrantes).", "err");
        return;
      }
      const normalized = SkinPack.loadStandaloneGeometry(json, file.name, log);
      if (!normalized) return;

      state.geoData = normalized;
      state.zip = null;
      const options = normalized.map((g, i) => ({ label: `${g.id} [${g.type}]`, geoIndex: i, textureFile: null }));
      populateModelSelect(options);
      state.selectedGeo = 0;
      selectModelOption(options[0]);
    };
    reader.readAsText(file);
  }

  function handleTexFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.textureURL = url;
      state.textureImg = img;
      state.textureBlob = file;
      state.textureFilename = file.name;
      Renderer5D.setTexture(img);
      log(`Textura lista (${img.width}×${img.height}).`, "ok");
      if (state.geoData && state.selectedGeo !== null) {
        const geoDef = state.geoData[state.selectedGeo];
        if (geoDef) rebuildCurrentModel();
      }
    };
    img.onerror = () => log("La textura no se pudo decodificar.", "err");
    img.src = url;
  }

  async function handlePackFile(file) {
    clearLog();
    const result = await SkinPack.parsePackFile(file, log);
    if (!result) return;

    state.geoData = result.geoData;
    state.zip = result.zip;
    state.currentOptions = result.options;

    populateModelSelect(result.options);
    if (result.options.length) {
      await selectModelOption(result.options[0]);
    }
  }

  /* ---------------------------------------------------------------------
     Model selection -> routes to 5D (Three.js) or 4D (Blockbench)
     --------------------------------------------------------------------- */

  // "4D"/"5D" are neutral labels (never translated). The edge cases
  // returned by SkinPack.detectGeometryType -- "MIXTO" (cubes + poly_mesh
  // in the same model) and "VACÍO" (no bone has any content) -- are
  // actual Spanish words in the data and need to follow whatever
  // language the UI is currently in.
  function tagDisplayText(type) {
    if (type === "4D" || type === "5D") return type;
    if (type === "MIXTO") return (typeof t === "function") ? t("sg.tagMixed") : type;
    if (type === "VACÍO") return (typeof t === "function") ? t("sg.tagEmpty") : type;
    return type;
  }

  function populateModelSelect(options) {
    const list = $("sgModelSelectList");
    list.innerHTML = "";

    options.forEach((opt, i) => {
      const geoDef = state.geoData[opt.geoIndex];
      const type = geoDef ? geoDef.type : "4D";

      const item = document.createElement("div");
      item.className = "sg-model-select-item";
      item.dataset.index = i;

      const tag = document.createElement("span");
      tag.className = "sg-model-tag sg-model-tag-" + ((type === "4D" || type === "5D") ? type.toLowerCase() : "other");
      tag.textContent = tagDisplayText(type);

      const name = document.createElement("span");
      name.className = "sg-model-select-item-name";
      name.textContent = geoDef ? geoDef.id : opt.label;

      item.appendChild(tag);
      item.appendChild(name);
      item.addEventListener("click", () => {
        closeModelSelect();
        selectModelOption(options[i]);
      });
      list.appendChild(item);
    });

    $("sgModelSelectWrap").style.display = options.length ? "block" : "none";
    state.currentOptions = options;
  }

  function closeModelSelect() {
    $("sgModelSelect").classList.remove("open");
  }

  function updateModelSelectTrigger(geoDef, selectedIndex) {
    const type = geoDef.type;
    const tagEl = $("sgModelSelectTag");
    tagEl.textContent = tagDisplayText(type);
    tagEl.className = "sg-model-tag sg-model-tag-" + ((type === "4D" || type === "5D") ? type.toLowerCase() : "other");
    $("sgModelSelectLabel").textContent = geoDef.id || "modelo";

    $("sgModelSelectList").querySelectorAll(".sg-model-select-item").forEach(el => {
      el.classList.toggle("active", parseInt(el.dataset.index, 10) === selectedIndex);
    });
  }

  async function selectModelOption(opt) {
    state.selectedGeo = opt.geoIndex;
    const geoDef = state.geoData[opt.geoIndex];
    if (!geoDef) return;

    if (state.currentOptions) {
      const idx = state.currentOptions.indexOf(opt);
      if (idx !== -1) updateModelSelectTrigger(geoDef, idx);
    }

    $("sgEmptyState").style.display = "none";
    $("sgModelBadge").style.display = "block";
    $("sgModelBadgeName").textContent = `${geoDef.id || "modelo"} [${geoDef.type}]`;

    showPanelFor(geoDef.type);
    $("sgBtnReset").disabled = false;

    if (opt.textureFile && state.zip) {
      const tex = await SkinPack.getTextureFromZip(state.zip, opt.textureFile, log);
      if (tex) {
        state.textureURL = tex.url;
        state.textureImg = tex.img;
        Renderer5D.setTexture(tex.img);
      }
    }

    rebuildCurrentModel();
  }

  function rebuildCurrentModel() {
    const geoDef = state.geoData[state.selectedGeo];
    if (!geoDef) return;
    const stats = Renderer5D.loadModel(geoDef);

    $("sgStatBones").textContent = stats.bones;
    $("sgStatCubes").textContent = geoDef.type === "5D" ? stats.polys : stats.cubes;
    $("sgModelBadgeMeta").textContent = geoDef.type === "5D"
      ? `${geoDef.texture_width}×${geoDef.texture_height} · ${stats.bones} huesos · ${stats.polys} polys`
      : `${geoDef.texture_width}×${geoDef.texture_height} · ${stats.bones} huesos · ${stats.cubes} cubos`;

    if (stats.textureMismatch) {
      log(`Aviso: la textura mide ${stats.textureMismatch.texW}×${stats.textureMismatch.texH} pero la geometría espera ${stats.textureMismatch.expectedW}×${stats.textureMismatch.expectedH}. Se usará la textura tal cual, puede desalinearse.`, "warn");
    }
    if (stats.meshCount) {
      const s = stats.bboxSize;
      log(`Diagnóstico "${geoDef.id}": ${stats.meshCount} malla(s) en escena · caja ${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)} unidades.`, "ok");
      if (s.x > 20 || s.y > 20 || s.z > 20) {
        log(`⚠ La caja de "${geoDef.id}" es sospechosamente grande frente al resto del modelo — puede haber una transformación fuera de escala en algún hueso/cubo/poly_mesh.`, "warn");
      }
    } else {
      log(`⚠ "${geoDef.id}" no generó ninguna malla visible (0 cubos y 0 poly_mesh renderizados) aunque declara ${geoDef.bones.length} huesos.`, "warn");
    }

    $("sgBtnReset").disabled = false;
  }

  /* ---------------------------------------------------------------------
     UI controls
     --------------------------------------------------------------------- */

  function bindSwitch(id, vtId, initial, onChange) {
    const elx = $(id);
    const vt = vtId ? $(vtId) : null;
    if (!elx) return;
    let value = initial;
    const paint = () => {
      elx.classList.toggle("on", value);
      if (vt) vt.classList.toggle("active", value);
    };
    paint();
    const flip = () => { value = !value; paint(); onChange(value); };
    elx.addEventListener("click", flip);
    if (vt) vt.addEventListener("click", flip);
  }

  /* ---------------------------------------------------------------------
     Initialization — called once from index.html (or the first time
     the sub-tab is opened)
     --------------------------------------------------------------------- */

  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    logBox = $("sgLog");

    Renderer5D.init($("sgThreeViewer"));

    setupDropzone("sgDzGeo", "sgInputGeo", "sgDzGeoName", handleGeoFile);
    setupDropzone("sgDzTex", "sgInputTex", "sgDzTexName", handleTexFile);
    setupDropzone("sgDzPack", "sgInputPack", "sgDzPackName", handlePackFile);

    bindSwitch("sgToggleSpin", "sgVtSpin", true, (v) => Renderer5D.setSpin(v));
    bindSwitch("sgToggleWire", "sgVtWire", false, (v) => Renderer5D.setWireframe(v));
    bindSwitch("sgToggleGrid", "sgVtGrid", true, (v) => Renderer5D.setGrid(v));
    bindSwitch("sgTogglePivots", null, false, (v) => {
      Renderer5D.setShowPivots(v);
      if (state.geoData && state.selectedGeo !== null) rebuildCurrentModel();
    });

    bindSwitch("sgToggleNormals", null, false, (v) => {
      Renderer5D.setNormalMode(v ? "recalculate" : "auto");
      if (state.geoData && state.selectedGeo !== null) rebuildCurrentModel();
    });

    $("sgBtnReset").addEventListener("click", () => Renderer5D.frameCamera());

    $("sgModelSelectTrigger").addEventListener("click", (e) => {
      e.stopPropagation();
      $("sgModelSelect").classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!$("sgModelSelect").contains(e.target)) closeModelSelect();
    });

    showPanelFor("5D");
  }

  // Repaints the model selector's tags (only actually matters for the
  // MIXED/EMPTY edge cases, since those are translatable words -- "4D"
  // and "5D" stay as neutral labels). Doesn't reselect anything or touch
  // the currently loaded model.
  function refreshLanguage() {
    if (state.currentOptions) populateModelSelect(state.currentOptions);
    if (state.geoData && state.selectedGeo !== null && state.currentOptions) {
      const idx = state.currentOptions.findIndex(o => o.geoIndex === state.selectedGeo);
      if (idx !== -1) updateModelSelectTrigger(state.geoData[state.selectedGeo], idx);
    }
  }

  return { init, refreshLanguage };

})();
