(function () {
'use strict';

/* ============================================================
   OBJ -> Skin Bedrock 1.8 (poly_mesh) converter
   A standalone tool, written from scratch with three.js +
   THREE.OBJLoader + JSZip. It understands Minecraft Bedrock's public
   format (geometry.json / skins.json) conceptually, but doesn't reuse
   code from any third-party project.
   ============================================================ */

/* ==================== i18n (ES / EN) ====================
   Same pattern as the rest of MBSM: data-i18n / data-i18n-title /
   data-i18n-placeholder / data-i18n-html attributes on the static HTML,
   plus a t(key, vars) function for the text the JS builds dynamically
   (status messages, warnings, validator errors). The language is stored
   in localStorage under the SAME key MBSM uses ("mbsm_lang"), so if this
   tool is opened embedded inside MBSM (same page/origin) it automatically
   inherits whatever language was chosen there — and its own switcher
   updates that choice for the rest of the site too. */
const I18N = {
  es: {
    'drop.text': 'Suelta tu .obj y tu textura aquí',
    'mobile.models': 'Modelos',
    'mobile.bonesExport': 'Huesos / Exportar',
    'common.close': 'Cerrar',
    'common.delete': 'Eliminar',
    'common.selectModelFirst': 'Crea o selecciona un modelo primero.',
    'common.unassignedOption': 'sin asignar',
    'common.noModel': 'sin modelo',
    'common.noTexture': 'sin textura',
    'sidebar.newModel': '+ Nuevo modelo',
    'sidebar.changeObjTitle': 'Cambiar modelo .obj',
    'sidebar.objLabel': 'Modelo .obj',
    'sidebar.noFile': 'Sin archivo — haz clic para subir',
    'sidebar.changeTexTitle': 'Cambiar textura',
    'sidebar.texLabel': 'Textura',
    'sidebar.partsTitle': 'Partes del modelo',
    'sidebar.autoAssignTitle': 'Reasignar huesos según el nombre de cada parte',
    'sidebar.autoAssign': 'Autoasignar',
    'sidebar.searchPart': 'Buscar parte...',
    'empty.title': 'Crea un modelo para empezar',
    'empty.text1': 'Sube un archivo <code>.obj</code> exportado desde Blender/otro programa, con sus objetos o grupos nombrados (cabeza, brazo, torso, etc.) y una textura.',
    'empty.text2': 'Cuanto mejor nombrados estén los grupos del .obj, mejor podrá autoasignarlos esta herramienta a los huesos del esqueleto.',
    'tb.zoomIn': 'Acercar',
    'tb.zoomOut': 'Alejar',
    'tb.fit': 'Encuadrar modelo',
    'tb.wireframe': 'Alambre / wireframe',
    'tb.grid': 'Mostrar/ocultar grilla',
    'tb.skeleton': 'Mostrar/ocultar esqueleto',
    'tb.unassigned': 'Resaltar partes sin asignar',
    'tb.fullscreen': 'Pantalla completa',
    'credit.text': 'Inspirado en OBJ Skin Studio de MCMrARM',
    'tabs.bones': 'Huesos',
    'tabs.export': 'Exportar',
    'bones.addHere': '+ Agregar hueso aquí',
    'bones.addHereHint': 'Se crea dentro del hueso que tengas seleccionado en el árbol (como una subcarpeta). Si te equivocas de lugar, cámbialo luego con "Hueso padre".',
    'bones.boneWord': 'Hueso',
    'bones.name': 'Nombre',
    'bones.parent': 'Hueso padre',
    'bones.pivot': 'Pivote (X, Y, Z)',
    'bones.deleteBone': 'Eliminar hueso',
    'bones.assignedParts': 'Partes asignadas a este hueso',
    'bones.assignedPartsHint': 'Marca o desmarca partes en la lista de la izquierda para asignarlas a este hueso.',
    'bones.noPartsAssigned': 'Ninguna parte asignada.',
    'bones.confirmDelete': (name) => `¿Eliminar el hueso "${name}"? Sus partes asignadas quedarán sin asignar.`,
    'export.modelName': 'Nombre del modelo',
    'export.identifier': 'Identifier de geometría',
    'export.bonesWithGeo': 'Huesos con geometría',
    'export.totalTris': 'Triángulos totales',
    'export.unassignedParts': 'Partes sin asignar',
    'export.texture': 'Textura',
    'export.packName': 'Nombre del paquete de skins',
    'export.packNamePlaceholder': 'Mi Skin Pack',
    'export.packNameHint': 'Aplica a TODO el paquete (no solo a este modelo): se usa en <code>manifest.json</code> y como nombre visible del paquete dentro de Minecraft.',
    'export.styleLabel': 'Estilo del geometry.json',
    'export.fancy': 'Fancy',
    'export.compact': 'Compacto',
    'export.downloadHint': 'Genera <code>manifest.json</code>, <code>geometry.json</code>, <code>skins.json</code>, <code>texts/en_US.lang</code> y las texturas — listo para copiar tal cual a <code>games/com.mojang/skin_packs/</code>.',
    'export.downloadBtnSingle': 'Descargar paquete de skin',
    'export.downloadBtnMulti': 'Descargar paquete de skins',
    'status.readingObj': 'Leyendo modelo .obj...',
    'status.modelLoaded': (n) => `Modelo cargado: ${n} parte(s).`,
    'status.texError': 'No se pudo leer la textura.',
    'status.exportBlocked': (err) => `Exportación bloqueada: ${err}`,
    'status.noModelsToExport': 'No hay modelos listos para exportar.',
    'status.objReadError': (msg) => `Error leyendo el .obj: ${msg}`,
    'errors.noValidMeshes': 'No se encontraron mallas válidas en el .obj',
    'errors.unnamedPart': (n) => `parte_${n}`,
    'status.partsReassigned': 'Partes reasignadas por nombre.',
    'warn.noTexture': 'No hay textura cargada: el geometry.json se puede exportar, pero necesitas una textura para que la skin se vea bien en el juego.',
    'warn.unassignedParts': (n) => `${n} parte(s) sin asignar a ningún hueso no se incluirán en la exportación.`,
    'warn.noBonesWithParts': 'Ningún hueso tiene partes asignadas todavía.',
    'defaultModelName': (n) => `Modelo ${n}`,
    'bones.defaultName': 'hueso',
    'partsLoadedShort': (n) => `${n} parte(s)`,
    'partsLoadedLong': (n) => `${n} parte(s) cargadas`,
    'val.invalidJson': (msg) => `El resultado no es JSON válido: ${msg}`,
    'val.notJsonObject': 'El resultado no es un objeto JSON.',
    'val.wrongVersion': (v) => `"format_version" debe ser exactamente "1.8.0" (se encontró: ${v}).`,
    'val.modernGeometryArray': 'Se encontró "minecraft:geometry" en la raíz: esa clave pertenece al formato moderno (1.12.0/1.16.0), no a 1.8.0.',
    'val.modernDescription': 'Se encontró "description" en la raíz: ese objeto no existe en el formato 1.8.0 de referencia.',
    'val.modernTextureUnderscore': 'Se encontraron "texture_width"/"texture_height" (con guion bajo): 1.8.0 usa "texturewidth"/"textureheight".',
    'val.noGeometryKey': 'La raíz no tiene ninguna clave de geometría del tipo "geometry.<id>" (además de "format_version").',
    'val.badGeometryKeyPrefix': (k) => `La clave "${k}" en la raíz debería empezar con "geometry." como en el archivo de referencia (geometry.sploot).`,
    'val.invalidGeometryObject': (k) => `"${k}" no es un objeto de geometría válido (bones/texturewidth/textureheight).`,
    'val.geometryTextureUnderscore': (k) => `"${k}" usa "texture_width"/"texture_height" (con guion bajo) en vez de "texturewidth"/"textureheight".`,
    'val.missingTextureWidth': (k) => `"${k}": "texturewidth" falta o no es un número mayor que 0.`,
    'val.missingTextureHeight': (k) => `"${k}": "textureheight" falta o no es un número mayor que 0.`,
    'val.noBones': (k) => `"${k}": no hay "bones" definidos en la geometría.`,
    'val.boneNoName': (k, label) => `"${k}": el hueso ${label} no tiene "name".`,
    'val.parentNotFound': (k, name, parent) => `"${k}": el hueso "${name}" tiene "parent": "${parent}", pero ningún hueso se llama así.`,
    'val.selfParent': (k, name) => `"${k}": el hueso "${name}" no puede ser su propio padre.`,
    'val.invalidPivot': (k, name) => `"${k}": el hueso "${name}" tiene un "pivot" inválido; debe ser [x, y, z] numérico.`,
    'val.invalidPolyMesh': (k, name) => `"${k}": el "poly_mesh" del hueso "${name}" no es un objeto válido.`,
    'val.missingNormalizedUvs': (k, name) => `"${k}": el poly_mesh del hueso "${name}" no tiene "normalized_uvs" (boolean).`,
    'val.missingPolyMeshArray': (k, name, key) => `"${k}": el poly_mesh del hueso "${name}" no tiene "${key}" (array) válido.`,
    'val.noPositions': (k, name) => `"${k}": el poly_mesh del hueso "${name}" no tiene posiciones.`,
    'val.noPolys': (k, name) => `"${k}": el poly_mesh del hueso "${name}" no tiene polígonos.`,
    'val.badVertexRefs': (k, name, n) => `"${k}": el poly_mesh del hueso "${name}" tiene ${n} referencia(s) de vértice inválidas (índices fuera de rango en positions/normals/uvs).`,
    'val.invalidHeader': (n) => `geometry.json inválido para 1.8.0 (${n} problema(s)):`,
  },
  en: {
    'drop.text': 'Drop your .obj and your texture here',
    'mobile.models': 'Models',
    'mobile.bonesExport': 'Bones / Export',
    'common.close': 'Close',
    'common.delete': 'Delete',
    'common.selectModelFirst': 'Create or select a model first.',
    'common.unassignedOption': 'unassigned',
    'common.noModel': 'no model',
    'common.noTexture': 'no texture',
    'sidebar.newModel': '+ New model',
    'sidebar.changeObjTitle': 'Change .obj model',
    'sidebar.objLabel': '.obj model',
    'sidebar.noFile': 'No file — click to upload',
    'sidebar.changeTexTitle': 'Change texture',
    'sidebar.texLabel': 'Texture',
    'sidebar.partsTitle': 'Model parts',
    'sidebar.autoAssignTitle': 'Reassign bones based on each part\'s name',
    'sidebar.autoAssign': 'Auto-assign',
    'sidebar.searchPart': 'Search part...',
    'empty.title': 'Create a model to get started',
    'empty.text1': 'Upload an <code>.obj</code> file exported from Blender/another program, with its objects or groups named (head, arm, torso, etc.) and a texture.',
    'empty.text2': 'The better named the .obj groups are, the better this tool can auto-assign them to the skeleton\'s bones.',
    'tb.zoomIn': 'Zoom in',
    'tb.zoomOut': 'Zoom out',
    'tb.fit': 'Fit model to view',
    'tb.wireframe': 'Wireframe',
    'tb.grid': 'Show/hide grid',
    'tb.skeleton': 'Show/hide skeleton',
    'tb.unassigned': 'Highlight unassigned parts',
    'tb.fullscreen': 'Fullscreen',
    'credit.text': 'Inspired by OBJ Skin Studio by MCMrARM',
    'tabs.bones': 'Bones',
    'tabs.export': 'Export',
    'bones.addHere': '+ Add bone here',
    'bones.addHereHint': 'It\'s created inside whichever bone you have selected in the tree (like a subfolder). If you place it wrong, change it later with "Parent bone".',
    'bones.boneWord': 'Bone',
    'bones.name': 'Name',
    'bones.parent': 'Parent bone',
    'bones.pivot': 'Pivot (X, Y, Z)',
    'bones.deleteBone': 'Delete bone',
    'bones.assignedParts': 'Parts assigned to this bone',
    'bones.assignedPartsHint': 'Check or uncheck parts in the list on the left to assign them to this bone.',
    'bones.noPartsAssigned': 'No parts assigned.',
    'bones.confirmDelete': (name) => `Delete bone "${name}"? Its assigned parts will become unassigned.`,
    'export.modelName': 'Model name',
    'export.identifier': 'Geometry identifier',
    'export.bonesWithGeo': 'Bones with geometry',
    'export.totalTris': 'Total triangles',
    'export.unassignedParts': 'Unassigned parts',
    'export.texture': 'Texture',
    'export.packName': 'Skin pack name',
    'export.packNamePlaceholder': 'My Skin Pack',
    'export.packNameHint': 'Applies to the WHOLE pack (not just this model): used in <code>manifest.json</code> and as the pack\'s visible name in Minecraft.',
    'export.styleLabel': 'geometry.json style',
    'export.fancy': 'Fancy',
    'export.compact': 'Compact',
    'export.downloadHint': 'Generates <code>manifest.json</code>, <code>geometry.json</code>, <code>skins.json</code>, <code>texts/en_US.lang</code> and the textures — ready to copy as-is into <code>games/com.mojang/skin_packs/</code>.',
    'export.downloadBtnSingle': 'Download skin package',
    'export.downloadBtnMulti': 'Download skins package',
    'status.readingObj': 'Reading .obj model...',
    'status.modelLoaded': (n) => `Model loaded: ${n} part(s).`,
    'status.texError': 'Could not read the texture.',
    'status.exportBlocked': (err) => `Export blocked: ${err}`,
    'status.noModelsToExport': 'No models ready to export.',
    'status.objReadError': (msg) => `Error reading the .obj: ${msg}`,
    'errors.noValidMeshes': 'No valid meshes were found in the .obj file',
    'errors.unnamedPart': (n) => `part_${n}`,
    'status.partsReassigned': 'Parts reassigned by name.',
    'warn.noTexture': 'No texture loaded: the geometry.json can still be exported, but you need a texture for the skin to look right in-game.',
    'warn.unassignedParts': (n) => `${n} part(s) not assigned to any bone won't be included in the export.`,
    'warn.noBonesWithParts': 'No bone has any parts assigned yet.',
    'defaultModelName': (n) => `Model ${n}`,
    'bones.defaultName': 'bone',
    'partsLoadedShort': (n) => `${n} part(s)`,
    'partsLoadedLong': (n) => `${n} part(s) loaded`,
    'val.invalidJson': (msg) => `The result isn't valid JSON: ${msg}`,
    'val.notJsonObject': 'The result is not a JSON object.',
    'val.wrongVersion': (v) => `"format_version" must be exactly "1.8.0" (found: ${v}).`,
    'val.modernGeometryArray': 'Found "minecraft:geometry" at the root: that key belongs to the modern format (1.12.0/1.16.0), not 1.8.0.',
    'val.modernDescription': 'Found "description" at the root: that object doesn\'t exist in the reference 1.8.0 format.',
    'val.modernTextureUnderscore': 'Found "texture_width"/"texture_height" (with underscore): 1.8.0 uses "texturewidth"/"textureheight".',
    'val.noGeometryKey': 'The root has no "geometry.<id>" key (besides "format_version").',
    'val.badGeometryKeyPrefix': (k) => `The key "${k}" at the root should start with "geometry." like in the reference file (geometry.sploot).`,
    'val.invalidGeometryObject': (k) => `"${k}" is not a valid geometry object (bones/texturewidth/textureheight).`,
    'val.geometryTextureUnderscore': (k) => `"${k}" uses "texture_width"/"texture_height" (with underscore) instead of "texturewidth"/"textureheight".`,
    'val.missingTextureWidth': (k) => `"${k}": "texturewidth" is missing or isn't a number greater than 0.`,
    'val.missingTextureHeight': (k) => `"${k}": "textureheight" is missing or isn't a number greater than 0.`,
    'val.noBones': (k) => `"${k}": no "bones" defined in the geometry.`,
    'val.boneNoName': (k, label) => `"${k}": bone ${label} has no "name".`,
    'val.parentNotFound': (k, name, parent) => `"${k}": bone "${name}" has "parent": "${parent}", but no bone is named that.`,
    'val.selfParent': (k, name) => `"${k}": bone "${name}" can't be its own parent.`,
    'val.invalidPivot': (k, name) => `"${k}": bone "${name}" has an invalid "pivot"; it must be numeric [x, y, z].`,
    'val.invalidPolyMesh': (k, name) => `"${k}": bone "${name}"'s "poly_mesh" isn't a valid object.`,
    'val.missingNormalizedUvs': (k, name) => `"${k}": bone "${name}"'s poly_mesh has no "normalized_uvs" (boolean).`,
    'val.missingPolyMeshArray': (k, name, key) => `"${k}": bone "${name}"'s poly_mesh has no valid "${key}" (array).`,
    'val.noPositions': (k, name) => `"${k}": bone "${name}"'s poly_mesh has no positions.`,
    'val.noPolys': (k, name) => `"${k}": bone "${name}"'s poly_mesh has no polygons.`,
    'val.badVertexRefs': (k, name, n) => `"${k}": bone "${name}"'s poly_mesh has ${n} invalid vertex reference(s) (indices out of range in positions/normals/uvs).`,
    'val.invalidHeader': (n) => `geometry.json invalid for 1.8.0 (${n} problem(s)):`,
  },
};

function detectInitialLang() {
  try {
    const stored = localStorage.getItem('mbsm_lang');
    if (stored === 'es' || stored === 'en') return stored;
  } catch (e) { /* localStorage may be blocked (sandboxed iframe, etc.) */ }
  const nav = (navigator.language || 'es').toLowerCase();
  return nav.startsWith('en') ? 'en' : 'es';
}

const state_i18n = { lang: detectInitialLang() };

function t(key, ...args) {
  const dict = I18N[state_i18n.lang] || I18N.es;
  const entry = dict[key] !== undefined ? dict[key] : I18N.es[key];
  if (typeof entry === 'function') return entry(...args);
  return entry !== undefined ? entry : key;
}

function applyI18n() {
  const lang = state_i18n.lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-oss-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-oss-i18n')); });
  document.querySelectorAll('[data-oss-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-oss-i18n-html')); });
  document.querySelectorAll('[data-oss-i18n-title]').forEach((el) => { el.title = t(el.getAttribute('data-oss-i18n-title')); });
  document.querySelectorAll('[data-oss-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.getAttribute('data-oss-i18n-placeholder')); });
  document.querySelectorAll('.lang-btn').forEach((b) => { b.classList.toggle('active', b.dataset.lang === lang); });
  // refresh text the app builds dynamically and that data-i18n doesn't cover
  if (typeof refreshProjectList === 'function' && document.getElementById('projectList')) refreshProjectList();
  if (typeof refreshExportPanel === 'function' && document.getElementById('exportContent')) refreshExportPanel();
  if (typeof refreshBoneTree === 'function' && document.getElementById('boneTree')) refreshBoneTree();
}

function setLang(lang) {
  state_i18n.lang = (lang === 'en') ? 'en' : 'es';
  try { localStorage.setItem('mbsm_lang', state_i18n.lang); } catch (e) { /* ignore if storage isn't available */ }
  applyI18n();
  // Propagates the change to the rest of MBSM when this tool lives
  // embedded in the same page (index.html): applyLanguage() is the main
  // site's global function (defined in app.js).
  if (typeof applyLanguage === 'function') applyLanguage(state_i18n.lang);
}

const GEOMETRY_FORMAT_VERSION = '1.8.0';

/* ==================== Standard humanoid skeleton ====================
   Standard names and pivots for Bedrock's "humanoid" model (public
   format data, not creative work of ours). The user is free to edit,
   delete or add bones. */
function createDefaultSkeleton() {
  // Hierarchy and sibling order copied 1:1 from Blockbench's actual
  // outliner for the humanoid skeleton (root>waist>body>head>hat, then
  // cape/leftArm/rightArm/jacket as head's siblings, each arm with its
  // own sleeve+item, and the legs as waist's siblings under root).
  // Left/right pivots copied from Bedrock's actual vanilla humanoid
  // skeleton (confirmed against the reference geometry_1_16_0.json:
  // leftArm=[-5,22,0], rightArm=[5,22,0], leftLeg=[-1.9,12,0],
  // rightLeg=[1.9,12,0]).
  // EXCEPTION: leftItem/rightItem do NOT follow that same sign. These
  // were tested in-game (custom bones, not vanilla, meant for holding
  // props in the hand) and with the "vanilla" sign the object showed up
  // in the wrong hand, so here they're flipped relative to their arm:
  // leftItem gets a positive X, rightItem a negative X.
  return [
    { name: 'root', parent: null, pivot: [0, 0, 0] },
    { name: 'waist', parent: 'root', pivot: [0, 12, 0] },
    { name: 'body', parent: 'waist', pivot: [0, 24, 0] },
    { name: 'head', parent: 'body', pivot: [0, 24, 0] },
    { name: 'hat', parent: 'head', pivot: [0, 24, 0] },
    { name: 'cape', parent: 'body', pivot: [0, 24, 3] },
    { name: 'leftArm', parent: 'body', pivot: [-5, 22, 0] },
    { name: 'leftSleeve', parent: 'leftArm', pivot: [-5, 22, 0] },
    // extra bones for props held in the hand (not part of the vanilla
    // skeleton, but useful for positioning props via their pivot)
    { name: 'leftItem', parent: 'leftArm', pivot: [5, 13, 0] },
    { name: 'rightArm', parent: 'body', pivot: [5, 22, 0] },
    { name: 'rightSleeve', parent: 'rightArm', pivot: [5, 22, 0] },
    { name: 'rightItem', parent: 'rightArm', pivot: [-5, 13, 0] },
    { name: 'jacket', parent: 'body', pivot: [0, 24, 0] },
    { name: 'leftLeg', parent: 'root', pivot: [-1.9, 12, 0] },
    { name: 'leftPants', parent: 'leftLeg', pivot: [-1.9, 12, 0] },
    { name: 'rightLeg', parent: 'root', pivot: [1.9, 12, 0] },
    { name: 'rightPants', parent: 'rightLeg', pivot: [1.9, 12, 0] },
  ];
}

/* Heuristic for auto-assigning bones by the .obj part's name */
const BONE_ALIASES = [
  { bone: 'head', re: /head|cabeza|skull/i },
  { bone: 'hat', re: /hat|gorro|helmet|casco/i },
  { bone: 'leftItem', re: /(item|arma|weapon|objeto|prop).*(l(eft)?\b|izq)|(l(eft)?\b|izq).*(item|arma|weapon|objeto|prop)/i },
  { bone: 'rightItem', re: /(item|arma|weapon|objeto|prop).*(r(ight)?\b|der)|(r(ight)?\b|der).*(item|arma|weapon|objeto|prop)/i },
  { bone: 'leftSleeve', re: /(sleeve).*(l(eft)?\b|izq)|(l(eft)?\b|izq).*sleeve/i },
  { bone: 'rightSleeve', re: /(sleeve).*(r(ight)?\b|der)|(r(ight)?\b|der).*sleeve/i },
  { bone: 'leftArm', re: /(arm|brazo).*(l(eft)?\b|izq|_l\b|\.l\b)|(l(eft)?\b|izq).*(arm|brazo)/i },
  { bone: 'rightArm', re: /(arm|brazo).*(r(ight)?\b|der|_r\b|\.r\b)|(r(ight)?\b|der).*(arm|brazo)/i },
  { bone: 'leftPants', re: /(pants|pantal).*(l(eft)?\b|izq)|(l(eft)?\b|izq).*(pants|pantal)/i },
  { bone: 'rightPants', re: /(pants|pantal).*(r(ight)?\b|der)|(r(ight)?\b|der).*(pants|pantal)/i },
  { bone: 'leftLeg', re: /(leg|pierna).*(l(eft)?\b|izq|_l\b|\.l\b)|(l(eft)?\b|izq).*(leg|pierna)/i },
  { bone: 'rightLeg', re: /(leg|pierna).*(r(ight)?\b|der|_r\b|\.r\b)|(r(ight)?\b|der).*(leg|pierna)/i },
  { bone: 'jacket', re: /jacket|chaqueta|coat/i },
  { bone: 'cape', re: /cape|capa/i },
  { bone: 'waist', re: /waist|cintura|hip/i },
  { bone: 'body', re: /body|torso|chest|pecho/i },
];

function guessBoneForPartName(name) {
  for (const a of BONE_ALIASES) if (a.re.test(name)) return a.bone;
  return null;
}

/* ==================== Global state ==================== */
const state = { projects: [], activeId: null, activeBoneName: null, nextId: 1, nextPartColor: 0, exportStyle: 'fancy', packName: 'Mi Skin Pack' };

/* ==================== Three.js ==================== */
let scene, camera, renderer, controls, canvas;
let composer, boneOutlinePass, partOutlinePass, transformControls, pivotDummy;
let parentLinkGroup;
let gridHelper, skeletonGroup;
let currentPreviewGroup = null;

function initThree() {
  canvas = document.getElementById('canvas');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.05, 500);
  camera.position.set(2.4, 2, 2.8);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.2;
  controls.maxDistance = 60;
  controls.target.set(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x0a0f14, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 5, 4);
  scene.add(key);
  const back = new THREE.DirectionalLight(0x4fc3f7, 0.5);
  back.position.set(-3, 2, -4);
  scene.add(back);

  gridHelper = new THREE.GridHelper(4, 16, 0x2b3a4a, 0x1a2430);
  scene.add(gridHelper);

  skeletonGroup = new THREE.Group();
  skeletonGroup.visible = false;
  scene.add(skeletonGroup);

  parentLinkGroup = new THREE.Group();
  scene.add(parentLinkGroup);

  /* ---- post-processing: a silhouette outline (not a bounding cube) for
     the selected bone/part, still visible behind other geometry
     (hiddenEdgeColor) ---- */
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  boneOutlinePass = new THREE.OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  boneOutlinePass.edgeStrength = 6.5;
  boneOutlinePass.edgeGlow = 0.4;
  boneOutlinePass.edgeThickness = 1.8;
  boneOutlinePass.visibleEdgeColor.set(0x4fc3f7);
  boneOutlinePass.hiddenEdgeColor.set(0x1c5a75);
  composer.addPass(boneOutlinePass);

  partOutlinePass = new THREE.OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  partOutlinePass.edgeStrength = 6.5;
  partOutlinePass.edgeGlow = 0.5;
  partOutlinePass.edgeThickness = 1.8;
  partOutlinePass.visibleEdgeColor.set(0xffca28);
  partOutlinePass.hiddenEdgeColor.set(0x8a6a10);
  composer.addPass(partOutlinePass);

  const copyPass = new THREE.ShaderPass(THREE.CopyShader);
  copyPass.renderToScreen = true;
  composer.addPass(copyPass);

  /* ---- draggable gizmo for the pivot (colored arrows, like the
     reference tool) ---- */
  pivotDummy = new THREE.Object3D();
  scene.add(pivotDummy);
  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  transformControls.setMode('translate');
  transformControls.setSize(0.85);
  transformControls.enabled = false;
  transformControls.visible = false;
  transformControls.addEventListener('dragging-changed', (ev) => {
    controls.enabled = !ev.value;
    if (!ev.value) commitPivotFromGizmo(); // on release, rebuild the model with the final pivot
  });
  transformControls.addEventListener('objectChange', () => {
    const project = getActiveProject();
    const bone = project && state.activeBoneName ? project.bones.find((b) => b.name === state.activeBoneName) : null;
    if (!bone) return;
    bone.pivot = [pivotDummy.position.x, pivotDummy.position.y, pivotDummy.position.z];
    document.getElementById('pivotX').value = bone.pivot[0].toFixed(2);
    document.getElementById('pivotY').value = bone.pivot[1].toFixed(2);
    document.getElementById('pivotZ').value = bone.pivot[2].toFixed(2);
  });
  scene.add(transformControls);

  window.addEventListener('resize', onResize);
  onResize();
  renderer.setAnimationLoop(renderFrame);

  // This tool lives inside a tab that can be hidden (display:none) without
  // ever being destroyed, so the render loop would otherwise keep spinning
  // in the background forever after the user's first visit. Pausing it
  // while the container isn't visible saves a real chunk of CPU/GPU/battery,
  // and we do one resize + manual frame on the way back in case the
  // container's size changed while we weren't looking.
  const visibilityRoot = document.getElementById('objSkinStudio');
  if (visibilityRoot && 'IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver((entries) => {
      const visible = entries[entries.length - 1].isIntersecting;
      renderer.setAnimationLoop(visible ? renderFrame : null);
      if (visible) { onResize(); composer.render(); }
    });
    visibilityObserver.observe(visibilityRoot);
  }
}

function renderFrame() {
  controls.update();
  composer.render();
}

function commitPivotFromGizmo() {
  const project = getActiveProject();
  if (project) maybeBuildPreview(project); // rebuild the hierarchy with the pivot's final position
}

function onResize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  const h = canvas.clientHeight || canvas.parentElement.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (composer) {
    composer.setSize(w, h);
    [boneOutlinePass, partOutlinePass].forEach((p) => p && p.resolution.set(w, h));
  }
}

function fitCameraToObject(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 0.1);
  const fitDist = maxDim / (2 * Math.tan((camera.fov * Math.PI / 180) / 2)) * 1.8;
  controls.target.copy(center);
  // view from -Z: most OBJ exporters (e.g. Blender by default) put the
  // character's front facing -Z
  const dir = new THREE.Vector3(0.75, 0.55, -1).normalize();
  camera.position.copy(center.clone().add(dir.multiplyScalar(fitDist)));
  camera.near = Math.max(fitDist / 100, 0.01);
  camera.far = fitDist * 100;
  camera.updateProjectionMatrix();
  controls.update();
}

function dolly(factor) {
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
  dir.multiplyScalar(factor);
  camera.position.copy(controls.target).add(dir);
  controls.update();
}

/* ==================== 3D highlighting (selected bone / hovered part) ====================
   Uses OutlinePass (an outline around the mesh's actual silhouette, not
   a box) with hiddenEdgeColor so it stays visible behind other geometry.
   The selected bone's pivot is controlled with a draggable gizmo
   (TransformControls), same as the reference tool's arrows. */
function meshesForBone(project, boneName) {
  if (!currentPreviewGroup || !boneName) return [];
  const out = [];
  currentPreviewGroup.traverse((obj) => {
    if (obj.isMesh) {
      const part = project.parts.find((p) => p.id === obj.userData.partId);
      if (part && part.boneName === boneName) out.push(obj);
    }
  });
  return out;
}

function highlightPart(partId) {
  if (!partOutlinePass) return;
  if (partId == null || !currentPreviewGroup) { partOutlinePass.selectedObjects = []; return; }
  const meshes = [];
  currentPreviewGroup.traverse((obj) => { if (obj.isMesh && obj.userData.partId === partId) meshes.push(obj); });
  partOutlinePass.selectedObjects = meshes;
}

function updatePivotGizmo(bone) {
  if (!transformControls) return;
  if (!bone) {
    transformControls.enabled = false;
    transformControls.visible = false;
    transformControls.detach();
    return;
  }
  pivotDummy.position.set(bone.pivot[0], bone.pivot[1], bone.pivot[2]);
  transformControls.attach(pivotDummy);
  transformControls.enabled = true;
  transformControls.visible = true;
}

/* Draws a line between the selected bone's pivot and its parent's, with
   a dot over the parent's pivot, so it's obvious which "main folder" the
   selected sub-folder connects to. */
function updateParentLink(project, bone) {
  parentLinkGroup.clear();
  if (!bone || !bone.parent) return;
  const parent = project.bones.find((b) => b.name === bone.parent);
  if (!parent) return;

  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...bone.pivot),
    new THREE.Vector3(...parent.pivot),
  ]);
  const line = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({
    color: 0xffca28, dashSize: 0.12, gapSize: 0.08, depthTest: false, transparent: true,
  }));
  line.computeLineDistances();
  line.renderOrder = 998;
  parentLinkGroup.add(line);

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffca28, depthTest: false, transparent: true, opacity: 0.95 })
  );
  marker.position.set(parent.pivot[0], parent.pivot[1], parent.pivot[2]);
  marker.renderOrder = 998;
  parentLinkGroup.add(marker);
}

/* Recomputes the active bone's outline and repositions the pivot gizmo
   (call this after rebuilding the preview or moving a pivot). */
function refreshHighlights() {
  const project = getActiveProject();
  const bone = project && state.activeBoneName ? project.bones.find((b) => b.name === state.activeBoneName) : null;
  if (boneOutlinePass) boneOutlinePass.selectedObjects = bone ? meshesForBone(project, bone.name) : [];
  updatePivotGizmo(bone);
  updateParentLink(project, bone);
}

/* ==================== Utilities ==================== */
function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}
function loadImageFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ url, img });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
function slugify(name) {
  return (name || 'modelo').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'modelo';
}
const PART_HUES = [200, 340, 40, 160, 280, 20, 100, 260, 0, 180];
function colorForIndex(i) {
  const h = PART_HUES[i % PART_HUES.length];
  return new THREE.Color(`hsl(${h}, 70%, 60%)`);
}

/* ==================== OBJ parsing ==================== */
async function parseObjFile(file) {
  const text = await readAsText(file);
  const loader = new THREE.OBJLoader();
  const group = loader.parse(text);

  const parts = [];
  let idx = 0;
  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      let geo = child.geometry;
      if (geo.index) geo = geo.toNonIndexed();
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.attributes.uv) {
        const count = geo.attributes.position.count;
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
      }
      const name = (child.name && child.name.trim()) || t('errors.unnamedPart', idx + 1);
      parts.push({
        id: idx,
        name,
        geometry: geo,
        triCount: geo.attributes.position.count / 3,
        color: colorForIndex(idx),
        boneName: null,
        autoMatched: false,
      });
      idx++;
    }
  });

  // .obj with no named objects/groups: everything ends up as one single mesh
  if (!parts.length) {
    throw new Error(t('errors.noValidMeshes'));
  }
  return parts;
}

/* ==================== Proyectos ==================== */
function createProject(name) {
  const p = {
    id: state.nextId++,
    name: name || t('defaultModelName', state.nextId - 1),
    parts: [],
    bones: createDefaultSkeleton(),
    textureFile: null,
    textureURL: null,
    texW: 64,
    texH: 64,
    texture: null,
    material: null,
    hasObj: false,
  };
  state.projects.push(p);
  return p;
}

function getActiveProject() { return state.projects.find((p) => p.id === state.activeId); }

function autoAssignParts(project) {
  project.parts.forEach((part) => {
    const guess = guessBoneForPartName(part.name);
    if (guess && project.bones.some((b) => b.name === guess)) {
      part.boneName = guess;
      part.autoMatched = true;
    } else {
      part.boneName = 'body';
      part.autoMatched = false;
    }
  });
}

// Frees the GPU-side resources (geometries/textures) a project is holding
// onto. Three.js doesn't garbage-collect these on its own when you just
// drop a reference, so anywhere we replace or remove a project's model or
// texture, we dispose the old one first to avoid piling up orphaned memory
// over a long editing session.
function disposePartGeometries(parts) {
  if (!parts) return;
  parts.forEach((part) => { if (part.geometry) part.geometry.dispose(); });
}

async function setProjectObj(project, file) {
  setStatus(t('status.readingObj'));
  const parts = await parseObjFile(file);
  disposePartGeometries(project.parts);
  project.parts = parts;
  project.hasObj = true;
  autoAssignParts(project);
  setStatus(t('status.modelLoaded', parts.length));
}

async function setProjectTexture(project, file) {
  if (project.textureURL) URL.revokeObjectURL(project.textureURL);
  const loaded = await loadImageFile(file);
  if (!loaded) { setStatus(t('status.texError'), true); return; }
  if (project.texture) project.texture.dispose();
  project.textureFile = file;
  project.textureURL = loaded.url;
  project.texW = loaded.img.naturalWidth;
  project.texH = loaded.img.naturalHeight;
  const tex = new THREE.Texture(loaded.img);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  project.texture = tex;
  if (project.material) {
    project.material.map = tex;
    project.material.color.set(0xffffff);
    project.material.needsUpdate = true; // three.js needs this flag to react when a material gains a map it didn't have before
  }
}

function maybeBuildPreview(project) {
  if (currentPreviewGroup) { scene.remove(currentPreviewGroup); currentPreviewGroup = null; }
  // The skeleton lines/dots below are rebuilt from scratch on every call
  // (every pivot drag, bone rename, etc.), and Group.clear() only detaches
  // children — it doesn't free their geometries/materials. Dispose them
  // ourselves so an active editing session doesn't quietly pile up
  // hundreds of orphaned buffers.
  skeletonGroup.children.forEach((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
  skeletonGroup.clear();
  if (!project || !project.hasObj) return;

  if (!project.material) {
    project.material = new THREE.MeshLambertMaterial({
      map: project.texture, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, vertexColors: false,
    });
  } else if (project.material.map !== project.texture) {
    project.material.map = project.texture;
    project.material.needsUpdate = true;
  }
  if (!project.texture) project.material.color.set(0x88a0b0);
  else project.material.color.set(0xffffff);

  const root = new THREE.Group();
  const nodes = {};
  project.bones.forEach((b) => { nodes[b.name] = { data: b, group: new THREE.Group() }; nodes[b.name].group.name = b.name; });
  project.bones.forEach((b) => {
    const node = nodes[b.name];
    const parent = b.parent && nodes[b.parent] ? nodes[b.parent] : null;
    if (parent) {
      node.group.position.set(b.pivot[0] - parent.data.pivot[0], b.pivot[1] - parent.data.pivot[1], b.pivot[2] - parent.data.pivot[2]);
      parent.group.add(node.group);
    } else {
      node.group.position.set(b.pivot[0], b.pivot[1], b.pivot[2]);
      root.add(node.group);
    }
  });

  project.parts.forEach((part) => {
    const boneNode = part.boneName && nodes[part.boneName];
    const targetGroup = boneNode ? boneNode.group : root;
    const pivot = boneNode ? boneNode.data.pivot : [0, 0, 0];
    const mesh = new THREE.Mesh(part.geometry, project.material);
    mesh.position.set(-pivot[0], -pivot[1], -pivot[2]);
    mesh.userData.partId = part.id;
    targetGroup.add(mesh);
  });

  // skeleton (lines + a dot at each pivot)
  const linePositions = [];
  project.bones.forEach((b) => {
    if (!b.parent) return;
    const parent = project.bones.find((x) => x.name === b.parent);
    if (!parent) return;
    linePositions.push(b.pivot[0], b.pivot[1], b.pivot[2], parent.pivot[0], parent.pivot[1], parent.pivot[2]);
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x4fc3f7 }));
  skeletonGroup.add(lines);
  project.bones.forEach((b) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffca28 }));
    dot.position.set(b.pivot[0], b.pivot[1], b.pivot[2]);
    skeletonGroup.add(dot);
  });

  currentPreviewGroup = root;
  scene.add(root);
  refreshHighlights();
}

/* ==================== Project selection ==================== */
function selectProject(id, opts) {
  state.activeId = id;
  if (!(opts && opts.keepBoneSelection)) state.activeBoneName = null;
  const project = getActiveProject();
  const hasProject = !!project;

  document.getElementById('emptyState').style.display = hasProject ? 'none' : 'flex';
  document.getElementById('projectFiles').hidden = !hasProject;
  document.getElementById('toolbar').hidden = !hasProject;
  document.getElementById('partsSection').hidden = !hasProject || !project.hasObj;

  if (hasProject) {
    updateFileRows(project);
    maybeBuildPreview(project);
    if (currentPreviewGroup && !(opts && opts.skipFit)) fitCameraToObject(currentPreviewGroup);
    refreshPartsList();
    refreshBoneTree();
    refreshExportPanel();
  } else {
    showBonesEmpty();
    showExportEmpty();
    refreshHighlights();
  }
  refreshProjectList();
}

function updateFileRows(project) {
  const rowObj = document.getElementById('fileRowObj');
  const rowTex = document.getElementById('fileRowTex');
  rowObj.classList.toggle('filled', project.hasObj);
  rowTex.classList.toggle('filled', !!project.textureFile);
  document.getElementById('objFileName').textContent = project.hasObj
    ? t('partsLoadedLong', project.parts.length)
    : 'Sin archivo — haz clic para subir';
  document.getElementById('texFileName').textContent = project.textureFile
    ? project.textureFile.name
    : 'Sin archivo — haz clic para subir';
  const thumb = document.getElementById('texThumb');
  if (project.textureURL) {
    thumb.innerHTML = `<img src="${project.textureURL}" alt="">`;
  } else {
    thumb.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
  }
}

function deleteProject(id) {
  const idx = state.projects.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const project = state.projects[idx];
  if (project.textureURL) URL.revokeObjectURL(project.textureURL);
  if (project.texture) project.texture.dispose();
  if (project.material) project.material.dispose();
  disposePartGeometries(project.parts);
  state.projects.splice(idx, 1);
  if (state.activeId === id) {
    state.activeId = null;
    if (state.projects.length) selectProject(state.projects[0].id);
    else selectProject(null);
  } else {
    refreshProjectList();
  }
}

/* ==================== UI: project list ==================== */
function refreshProjectList() {
  const ul = document.getElementById('projectList');
  ul.innerHTML = '';
  state.projects.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'projectItem' + (p.id === state.activeId ? ' selected' : '');
    const thumb = document.createElement('div');
    thumb.className = 'projThumb';
    if (p.textureURL) { const img = document.createElement('img'); img.src = p.textureURL; thumb.appendChild(img); }
    const info = document.createElement('div');
    info.className = 'projInfo';
    const name = document.createElement('div'); name.className = 'projName'; name.textContent = p.name;
    const meta = document.createElement('div'); meta.className = 'projMeta';
    meta.textContent = p.hasObj ? t('partsLoadedShort', p.parts.length) : t('common.noModel');
    info.appendChild(name); info.appendChild(meta);
    const del = document.createElement('span');
    del.className = 'projDelete'; del.textContent = '×'; del.title = t('common.delete');
    del.addEventListener('click', (ev) => { ev.stopPropagation(); deleteProject(p.id); });
    li.appendChild(thumb); li.appendChild(info); li.appendChild(del);
    li.addEventListener('click', () => selectProject(p.id));
    ul.appendChild(li);
  });
  updatePackageButtonLabel();
}

/* ==================== UI: parts list ==================== */
function refreshPartsList() {
  const project = getActiveProject();
  const ul = document.getElementById('partsList');
  ul.innerHTML = '';
  if (!project) return;
  const query = document.getElementById('partsSearch').value.trim().toLowerCase();
  project.parts.filter((p) => !query || p.name.toLowerCase().includes(query)).forEach((part) => {
    const li = document.createElement('li');
    li.className = 'partItem';
    const sw = document.createElement('span');
    sw.className = 'partSwatch';
    sw.style.background = '#' + part.color.getHexString();
    const name = document.createElement('span'); name.className = 'partName'; name.textContent = part.name;

    const sel = document.createElement('select');
    sel.className = 'partBoneSelect' + (!part.autoMatched ? ' unassigned' : '');
    const noneOpt = document.createElement('option');
    noneOpt.value = ''; noneOpt.textContent = t('common.unassignedOption');
    sel.appendChild(noneOpt);
    project.bones.forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b.name; opt.textContent = b.name;
      if (part.boneName === b.name) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('click', (ev) => ev.stopPropagation());
    sel.addEventListener('change', () => {
      part.boneName = sel.value || null;
      part.autoMatched = true; // asignación manual = confirmada
      sel.className = 'partBoneSelect';
      maybeBuildPreview(project);
      refreshBoneTree();
      refreshExportPanel();
    });

    li.appendChild(sw); li.appendChild(name); li.appendChild(sel);
    li.addEventListener('mouseenter', () => highlightPart(part.id));
    li.addEventListener('mouseleave', () => highlightPart(null));
    li.addEventListener('click', () => {
      if (part.boneName) { state.activeBoneName = part.boneName; refreshBoneTree(); }
    });
    ul.appendChild(li);
  });
}

/* ==================== UI: bone tree ==================== */
function showBonesEmpty() {
  document.getElementById('bonesEmpty').hidden = false;
  document.getElementById('bonesContent').hidden = true;
}

function refreshBoneTree() {
  const project = getActiveProject();
  if (!project) { showBonesEmpty(); return; }
  document.getElementById('bonesEmpty').hidden = true;
  document.getElementById('bonesContent').hidden = false;

  const container = document.getElementById('boneTree');
  container.innerHTML = '';
  const byParent = {};
  project.bones.forEach((b) => { const k = b.parent || '__root__'; (byParent[k] = byParent[k] || []).push(b); });

  function render(list, parentEl) {
    list.forEach((b) => {
      const li = document.createElement('li');
      const node = document.createElement('div');
      node.className = 'boneNode' + (state.activeBoneName === b.name ? ' selected' : '');
      const parts = project.parts.filter((p) => p.boneName === b.name);

      const left = document.createElement('span');
      const nameSpan = document.createElement('span'); nameSpan.textContent = b.name;
      left.appendChild(nameSpan);
      if (b.parent) {
        const parentTag = document.createElement('span');
        parentTag.className = 'boneParentTag';
        parentTag.textContent = ` (→ ${b.parent})`;
        left.appendChild(parentTag);
      }
      node.appendChild(left);
      if (parts.length) {
        const count = document.createElement('span'); count.className = 'boneMeshCount'; count.textContent = `${parts.length}p`;
        node.appendChild(count);
      }
      node.addEventListener('click', () => { state.activeBoneName = b.name; refreshBoneTree(); showBoneDetail(b); refreshHighlights(); });
      li.appendChild(node);
      if (parts.length) {
        const partsUl = document.createElement('ul');
        partsUl.className = 'boneParts';
        parts.forEach((p) => {
          const pLi = document.createElement('li');
          pLi.className = 'bonePartChip';
          pLi.textContent = p.name;
          pLi.addEventListener('mouseenter', () => highlightPart(p.id));
          pLi.addEventListener('mouseleave', () => highlightPart(null));
          partsUl.appendChild(pLi);
        });
        li.appendChild(partsUl);
      }
      if (byParent[b.name]) { const ul = document.createElement('ul'); render(byParent[b.name], ul); li.appendChild(ul); }
      container.appendChild(li);
    });
  }
  render(byParent['__root__'] || [], container);

  if (state.activeBoneName) {
    const b = project.bones.find((x) => x.name === state.activeBoneName);
    if (b) showBoneDetail(b); else document.getElementById('boneDetail').hidden = true;
  } else {
    document.getElementById('boneDetail').hidden = true;
  }
  refreshHighlights();
}

function ancestryChain(project, bone) {
  const chain = [bone];
  let current = bone;
  let guard = 0;
  while (current.parent && guard++ < 64) {
    const parent = project.bones.find((b) => b.name === current.parent);
    if (!parent || chain.includes(parent)) break; // in case of an accidental cycle
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

function showBoneDetail(bone) {
  const project = getActiveProject();
  document.getElementById('boneDetail').hidden = false;
  document.getElementById('boneDetailTitle').textContent = bone.name;
  document.getElementById('boneNameInput').value = bone.name;
  document.getElementById('pivotX').value = bone.pivot[0];
  document.getElementById('pivotY').value = bone.pivot[1];
  document.getElementById('pivotZ').value = bone.pivot[2];

  // breadcrumb: which "main" bone this sub-folder connects to, showing
  // the full chain up to the root, with every name clickable
  const crumbWrap = document.getElementById('boneBreadcrumb');
  crumbWrap.innerHTML = '';
  const chain = ancestryChain(project, bone);
  chain.forEach((b, i) => {
    if (i > 0) { const sep = document.createElement('span'); sep.className = 'crumbSep'; sep.textContent = '›'; crumbWrap.appendChild(sep); }
    const crumb = document.createElement('span');
    crumb.className = 'crumb' + (b === bone ? ' current' : '');
    crumb.textContent = b.name;
    if (b !== bone) crumb.addEventListener('click', () => { state.activeBoneName = b.name; refreshBoneTree(); });
    crumbWrap.appendChild(crumb);
  });

  const sel = document.getElementById('boneParentSelect');
  sel.innerHTML = '<option value="">(ninguno / raíz)</option>';
  project.bones.forEach((b) => {
    if (b.name === bone.name) return;
    const opt = document.createElement('option');
    opt.value = b.name; opt.textContent = b.name;
    if (bone.parent === b.name) opt.selected = true;
    sel.appendChild(opt);
  });

  const assigned = document.getElementById('boneAssignedParts');
  assigned.innerHTML = '';
  const parts = project.parts.filter((p) => p.boneName === bone.name);
  if (!parts.length) {
    const li = document.createElement('li'); li.textContent = t('bones.noPartsAssigned'); assigned.appendChild(li);
  } else {
    parts.forEach((p) => { const li = document.createElement('li'); li.textContent = p.name; assigned.appendChild(li); });
  }
}

/* ==================== UI: exportación ==================== */
function showExportEmpty() {
  document.getElementById('exportEmpty').hidden = false;
  document.getElementById('exportContent').hidden = true;
}

function refreshExportPanel() {
  const project = getActiveProject();
  if (!project) { showExportEmpty(); updatePackageButtonLabel(); return; }
  document.getElementById('exportEmpty').hidden = true;
  document.getElementById('exportContent').hidden = false;
  document.getElementById('exportNameInput').value = project.name;
  document.getElementById('exportIdentifierInput').value = `geometry.${slugify(project.name)}`;
  document.getElementById('packNameInput').value = state.packName;

  const bonesWithGeo = project.bones.filter((b) => project.parts.some((p) => p.boneName === b.name));
  const totalTris = project.parts.reduce((sum, p) => sum + p.triCount, 0);
  const unassigned = project.parts.filter((p) => !p.boneName).length;

  document.getElementById('expBoneCount').textContent = bonesWithGeo.length;
  document.getElementById('expTriCount').textContent = totalTris;
  document.getElementById('expUnassignedCount').textContent = unassigned;
  document.getElementById('expTexSize').textContent = project.textureFile ? `${project.texW}×${project.texH}` : t('common.noTexture');

  const warnBox = document.getElementById('exportWarnings');
  warnBox.innerHTML = '';
  const warnings = [];
  if (!project.textureFile) warnings.push(t('warn.noTexture'));
  if (unassigned) warnings.push(t('warn.unassignedParts', unassigned));
  if (!bonesWithGeo.length) warnings.push(t('warn.noBonesWithParts'));
  const notAutoMatched = project.parts.filter((p) => p.boneName && !p.autoMatched).length;
  warnings.forEach((w) => { const d = document.createElement('div'); d.className = 'warnBox'; d.textContent = w; warnBox.appendChild(d); });

  updatePackageButtonLabel();
}

/* ==================== Building geometry.json ====================
   The ACTUAL structure of the classic Geometry 1.8.0 format (the same
   one used by the geometry.sploot reference file this tool was built
   from):

     {
       "format_version": "1.8.0",
       "geometry.<identificador>": {
         "bones": [
           {
             "name": "...",
             "parent": "...",           // optional
             "pivot": [x, y, z],
             "rotation": [x, y, z],     // optional
             "poly_mesh": {
               "normalized_uvs": true,
               "positions": [[x,y,z], ...],
               "normals":   [[x,y,z], ...],
               "uvs":       [[u,v], ...],
               "polys": [
                 [ [posIdx, normIdx, uvIdx], [posIdx, normIdx, uvIdx],
                   [posIdx, normIdx, uvIdx], [posIdx, normIdx, uvIdx] ], ...
               ]
             }
           }, ...
         ],
         "texturewidth": 64,
         "textureheight": 64
       }
     }

   Unlike the modern format (1.12+/1.16+), 1.8.0 has NO
   "minecraft:geometry" array, NO "description" object, and the texture
   width/height are called "texturewidth"/"textureheight" (all one word,
   no underscore) and live directly inside the geometry object, not
   inside "description". The geometry's root key is literally
   "geometry.<identifier>". */
function buildGeometryJSON(project) {
  const identifier = `geometry.${slugify(project.name)}`;
  const bones = project.bones.map((b) => {
    const out = { name: b.name };
    if (b.parent) out.parent = b.parent;
    // IMPORTANT: the bone's pivot does NOT get its X flipped. b.pivot's
    // values are already in Bedrock's real convention (e.g.
    // leftArm=[5,22,0] / rightArm=[-5,22,0], same as the vanilla humanoid
    // geometry), exactly as used in the 3D preview. Negating X here (like
    // an earlier version of this code did) swapped the left/right pivots
    // with each other -- the "leftArm" bone ended up with the pivot meant
    // for "rightArm" and vice versa. Negating X IS needed for the
    // poly_mesh's VERTICES (below), since that data comes from the
    // imported OBJ and does need that coordinate-system conversion; the
    // bone's pivot doesn't.
    out.pivot = [b.pivot[0], b.pivot[1], b.pivot[2]];
    if (Array.isArray(b.rotation) && b.rotation.some((v) => v)) {
      out.rotation = b.rotation;
    }
    if (b.locators) out.locators = b.locators;

    const parts = project.parts.filter((p) => p.boneName === b.name);
    if (parts.length) {
      const positions = [], normals = [], uvs = [], polys = [];
      let offset = 0;
      parts.forEach((part) => {
        const pos = part.geometry.attributes.position;
        const nrm = part.geometry.attributes.normal;
        const uv = part.geometry.attributes.uv;
        const vCount = pos.count;
        for (let i = 0; i < vCount; i++) {
          positions.push([-pos.getX(i), pos.getY(i), pos.getZ(i)]);
          normals.push([-nrm.getX(i), nrm.getY(i), nrm.getZ(i)]);
          uvs.push([uv.getX(i), uv.getY(i)]);
        }
        const triCount = vCount / 3;
        for (let t = 0; t < triCount; t++) {
          const a = offset + t * 3, b2 = a + 1, c = a + 2;
          // Every poly vertex is referenced as
          // [posIndex, normalIndex, uvIndex], same as in the 1.8.0
          // reference file (geometry.sploot). Since positions/normals/uvs
          // are generated 1:1 per OBJ vertex here, the three indices end
          // up numerically identical, but they're stored in the correct
          // order so the structure matches 1.8.0's real shape (it's not
          // just a coincidence). Triangles are stored as degenerate
          // "quads" (4th vertex repeated), which is the safe approach
          // poly_mesh already uses in Bedrock.
          polys.push([[a, a, a], [b2, b2, b2], [c, c, c], [c, c, c]]);
        }
        offset += vCount;
      });
      out.poly_mesh = { normalized_uvs: true, positions, normals, uvs, polys };
    }
    return out;
  });

  return {
    format_version: GEOMETRY_FORMAT_VERSION,
    [identifier]: {
      bones,
      texturewidth: project.texW || 64,
      textureheight: project.texH || 64,
    },
  };
}

/* ==================== 1.8.0 export validator ====================
   Checks that the generated JSON is REALLY compatible with Geometry
   1.8.0 and structurally equivalent to the reference file, and that no
   modern-format structure snuck in by accident (minecraft:geometry,
   description, texture_width/texture_height, etc).
   Returns { valid: boolean, errors: string[] }. */
function validateGeometry18(json) {
  const errors = [];

  // 12. The JSON must be valid / serializable.
  let asString;
  try {
    asString = JSON.stringify(json);
    JSON.parse(asString);
  } catch (e) {
    errors.push(t('val.invalidJson', e.message));
    return { valid: false, errors };
  }
  if (!json || typeof json !== 'object') {
    errors.push(t('val.notJsonObject'));
    return { valid: false, errors };
  }

  // 1. Exact format_version.
  if (json.format_version !== '1.8.0') {
    errors.push(t('val.wrongVersion', JSON.stringify(json.format_version)));
  }

  // 3. No structures from later formats sneaking in by accident.
  if (Object.prototype.hasOwnProperty.call(json, 'minecraft:geometry')) {
    errors.push(t('val.modernGeometryArray'));
  }
  if (Object.prototype.hasOwnProperty.call(json, 'description')) {
    errors.push(t('val.modernDescription'));
  }
  if (Object.prototype.hasOwnProperty.call(json, 'texture_width') || Object.prototype.hasOwnProperty.call(json, 'texture_height')) {
    errors.push(t('val.modernTextureUnderscore'));
  }

  // 2. Root structure: format_version + at least one "geometry.<id>" key.
  //    A single 1.8.0 geometry.json can hold SEVERAL geometries (one per
  //    model) as separate root keys — this is how this tool packs
  //    multiple models into a single file literally named
  //    "geometry.json", which is the name Bedrock requires.
  const geoKeys = Object.keys(json).filter((k) => k !== 'format_version');
  if (geoKeys.length === 0) {
    errors.push(t('val.noGeometryKey'));
    return { valid: false, errors };
  }
  geoKeys.forEach((geoKey) => {
    if (!geoKey.startsWith('geometry.')) {
      errors.push(t('val.badGeometryKeyPrefix', geoKey));
    }
  });

  // 4-11. Each geometry at the root must have its own valid structure.
  geoKeys.forEach((geoKey) => {
    const geo = json[geoKey];
    if (!geo || typeof geo !== 'object') {
      errors.push(t('val.invalidGeometryObject', geoKey));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(geo, 'texture_width') || Object.prototype.hasOwnProperty.call(geo, 'texture_height')) {
      errors.push(t('val.geometryTextureUnderscore', geoKey));
    }

    // 8. texturewidth / textureheight.
    if (typeof geo.texturewidth !== 'number' || !(geo.texturewidth > 0)) {
      errors.push(t('val.missingTextureWidth', geoKey));
    }
    if (typeof geo.textureheight !== 'number' || !(geo.textureheight > 0)) {
      errors.push(t('val.missingTextureHeight', geoKey));
    }

    // 5. The bones must actually exist.
    if (!Array.isArray(geo.bones) || geo.bones.length === 0) {
      errors.push(t('val.noBones', geoKey));
      return;
    }

    const boneNames = new Set(geo.bones.map((b) => b && b.name).filter(Boolean));
    geo.bones.forEach((b, bi) => {
      const label = b && b.name ? `"${b.name}"` : `#${bi}`;
      if (!b || !b.name) {
        errors.push(t('val.boneNoName', geoKey, label));
        return;
      }
      // 6. Valid parents.
      if (b.parent) {
        if (!boneNames.has(b.parent)) {
          errors.push(t('val.parentNotFound', geoKey, b.name, b.parent));
        }
        if (b.parent === b.name) {
          errors.push(t('val.selfParent', geoKey, b.name));
        }
      }
      // 7. Pivots with a valid structure.
      if (!Array.isArray(b.pivot) || b.pivot.length !== 3 || b.pivot.some((n) => typeof n !== 'number' || Number.isNaN(n))) {
        errors.push(t('val.invalidPivot', geoKey, b.name));
      }
      // 9, 10, 11. A complete poly_mesh with valid indices.
      if (b.poly_mesh !== undefined) {
        const pm = b.poly_mesh;
        if (!pm || typeof pm !== 'object') {
          errors.push(t('val.invalidPolyMesh', geoKey, b.name));
          return;
        }
        if (typeof pm.normalized_uvs !== 'boolean') {
          errors.push(t('val.missingNormalizedUvs', geoKey, b.name));
        }
        ['positions', 'normals', 'uvs', 'polys'].forEach((key) => {
          if (!Array.isArray(pm[key])) errors.push(t('val.missingPolyMeshArray', geoKey, b.name, key));
        });
        const okArrays = Array.isArray(pm.positions) && Array.isArray(pm.normals)
          && Array.isArray(pm.uvs) && Array.isArray(pm.polys);
        if (okArrays) {
          if (!pm.positions.length) errors.push(t('val.noPositions', geoKey, b.name));
          if (!pm.polys.length) errors.push(t('val.noPolys', geoKey, b.name));
          const nPos = pm.positions.length, nNorm = pm.normals.length, nUv = pm.uvs.length;
          let badPoly = 0;
          pm.polys.forEach((poly) => {
            if (!Array.isArray(poly) || poly.length < 3) { badPoly++; return; }
            poly.forEach((vert) => {
              if (!Array.isArray(vert) || vert.length !== 3) { badPoly++; return; }
              const [pIdx, nIdx, uIdx] = vert;
              if (!(pIdx >= 0 && pIdx < nPos)) badPoly++;
              if (!(nIdx >= 0 && nIdx < nNorm)) badPoly++;
              if (!(uIdx >= 0 && uIdx < nUv)) badPoly++;
            });
          });
          if (badPoly > 0) {
            errors.push(t('val.badVertexRefs', geoKey, b.name, badPoly));
          }
        }
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

/* Combines several projects' geometry into a SINGLE 1.8.0 geometry.json
   object, each under its own "geometry.<id>" key. This is needed because
   Bedrock requires the file to be literally named "geometry.json" (not
   "geometry.<name>.json"); to carry multiple models in the same pack
   without losing any of them, they're combined here into one file with a
   shared format_version and a distinct geometry key per model
   (deduplicating the identifier if two models produce the same slug).
   Returns { json, entries }, where entries maps each project to its
   final identifier inside the combined file. */
function buildCombinedGeometryJSON(projects) {
  const combined = { format_version: GEOMETRY_FORMAT_VERSION };
  const usedKeys = new Set();
  const entries = [];
  projects.forEach((project) => {
    const single = buildGeometryJSON(project);
    const geoKey = Object.keys(single).find((k) => k !== 'format_version');
    let finalKey = geoKey;
    let n = 2;
    while (usedKeys.has(finalKey)) {
      finalKey = `${geoKey}_${n}`;
      n += 1;
    }
    usedKeys.add(finalKey);
    combined[finalKey] = single[geoKey];
    entries.push({ project, identifier: finalKey });
  });
  return { json: combined, entries };
}

/* Runs the validator against a project's JSON, shows any errors in the
   export panel (blocking the download), and returns true only if it's
   valid. */
function validateAndShowErrors(json) {
  const result = validateGeometry18(json);
  const warnBox = document.getElementById('exportWarnings');
  if (warnBox) {
    warnBox.querySelectorAll('.validationErrorBox').forEach((el) => el.remove());
    if (!result.valid) {
      const box = document.createElement('div');
      box.className = 'warnBox validationErrorBox';
      box.style.borderColor = '#e05252';
      box.style.color = '#f2a3a3';
      const title = document.createElement('strong');
      title.textContent = t('val.invalidHeader', result.errors.length);
      box.appendChild(title);
      const list = document.createElement('ul');
      list.style.margin = '6px 0 0 18px';
      list.style.padding = '0';
      result.errors.forEach((err) => {
        const li = document.createElement('li');
        li.textContent = err;
        list.appendChild(li);
      });
      box.appendChild(list);
      warnBox.appendChild(box);
    }
  }
  if (!result.valid) {
    setStatus(t('status.exportBlocked', result.errors[0]), true);
  }
  return result.valid;
}

/* ==================== Downloads ==================== */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* Serializes the combined geometry according to the Fancy/Compact
   toggle:
   - "fancy": JSON.stringify with 2-space indentation (how this always
     used to be exported).
   - "compact": the whole file on a single line, no extra whitespace --
     same as the reference geometry.json (geometry.sploot) this tool was
     built from, which arrives as a single line. */
function stringifyGeometry(json) {
  return state.exportStyle === 'compact' ? JSON.stringify(json) : JSON.stringify(json, null, 2);
}

/* Downloads a SINGLE .zip package with EVERY exportable model, using the
   REAL structure Minecraft Bedrock needs to load a skin pack (worked out
   from an actual skins.json/manifest.json/lang set that works in-game):
   - manifest.json: identifies the pack to Minecraft (without this, the
     pack doesn't even show up in the skin pack list).
   - geometry.json: combines every geometry (one "geometry.<id>" key per
     model). Fixed name, required by Bedrock.
   - skins.json: an object (NOT a bare array) with "skins",
     "serialize_name" and a pack-level "localization_name". Each skin
     uses a "localization_name" WITHOUT spaces (required: Bedrock doesn't
     recognize names with a space there), which also doubles as the lang
     key.
   - texts/en_US.lang: defines the pack's visible name
     (skinpack.<key>) and each skin's (skin.<key>.<skin>) — without this
     the game has nowhere to pull the displayed text from.
   - one .png texture per model (if it has one). */
async function downloadSkinPackage() {
  const exportable = state.projects.filter((p) => p.hasObj && p.parts.some((pt) => pt.boneName));
  if (!exportable.length) { setStatus(t('status.noModelsToExport'), true); return; }

  const { json: combinedGeometry, entries } = buildCombinedGeometryJSON(exportable);
  if (!validateAndShowErrors(combinedGeometry)) return;

  const zip = new JSZip();
  zip.file('geometry.json', stringifyGeometry(combinedGeometry));

  const packName = (state.packName || '').trim() || 'Mi Skin Pack';
  const packKey = slugify(packName) || 'pack';

  const usedTexNames = new Set();
  const usedSkinKeys = new Set();
  const skins = [];
  const langLines = [`skinpack.${packKey}=${packName}`];

  entries.forEach(({ project, identifier }) => {
    let texName = null;
    if (project.textureFile) {
      const base = slugify(project.name) || 'skin';
      texName = `${base}.png`;
      let n = 2;
      while (usedTexNames.has(texName)) { texName = `${base}_${n}.png`; n += 1; }
      usedTexNames.add(texName);
      zip.file(texName, project.textureFile);
    }
    // localization_name NEVER has spaces (or accents/unusual symbols):
    // Bedrock uses it as an internal identification key and as part of
    // the lang key; with a space, the game just won't recognize it. The
    // "pretty" name the user gave the model is kept exactly as typed,
    // but only as the VISIBLE value inside the .lang file.
    let skinKey = slugify(project.name) || 'skin';
    let n = 2;
    while (usedSkinKeys.has(skinKey)) { skinKey = `${slugify(project.name) || 'skin'}_${n}`; n += 1; }
    usedSkinKeys.add(skinKey);

    const entry = { localization_name: skinKey, geometry: identifier };
    if (texName) entry.texture = texName;
    entry.type = 'free';
    skins.push(entry);
    langLines.push(`skin.${packKey}.${skinKey}=${project.name}`);
  });

  const skinsJson = {
    skins,
    serialize_name: packName,
    localization_name: packKey,
  };
  zip.file('skins.json', JSON.stringify(skinsJson, null, 2));
  zip.file('texts/en_US.lang', langLines.join('\n') + '\n');

  const manifest = {
    format_version: 1,
    header: {
      name: packName,
      description: packName,
      uuid: generateUUIDv4(),
      version: [1, 0, 0],
    },
    modules: [
      { type: 'skin_pack', uuid: generateUUIDv4(), version: [1, 0, 0] },
    ],
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = exportable.length > 1 ? `${packKey}.zip` : `${slugify(exportable[0].name) || 'skin'}_pack.zip`;
  downloadBlob(blob, zipName);
}

/* Generates a v4 UUID for manifest.json. Uses crypto.randomUUID() when
   the browser supports it (https/localhost contexts); if that isn't
   available (e.g. opening the file via file://), it falls back to a
   manual generation -- it doesn't need to be cryptographically secure,
   just a unique identifier so Minecraft can tell this pack apart from
   others. */
function generateUUIDv4() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* Updates the single download button's text and state
   (enabled/disabled) based on how many models are ready to export
   across the WHOLE project (not just the active one): singular wording
   for one model, plural for several. */
function updatePackageButtonLabel() {
  const btn = document.getElementById('btnDownloadPackage');
  if (!btn) return;
  const exportable = state.projects.filter((p) => p.hasObj && p.parts.some((pt) => pt.boneName));
  btn.textContent = exportable.length > 1 ? t('export.downloadBtnMulti') : t('export.downloadBtnSingle');
  btn.disabled = exportable.length === 0;
}

/* ==================== Status / messages ==================== */
function setStatus(msg, isWarn) {
  const el = document.getElementById('viewportStatus');
  el.textContent = msg;
  el.style.color = isWarn ? '#f0b96b' : '';
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => { el.textContent = ''; }, 5000);
}

/* ==================== Toolbar toggles ==================== */
const toggles = { wireframe: false, grid: true, skeleton: false };
function applyToggleStates() {
  document.getElementById('btnWireframe').classList.toggle('active', toggles.wireframe);
  document.getElementById('btnGrid').classList.toggle('active', toggles.grid);
  document.getElementById('btnSkeleton').classList.toggle('active', toggles.skeleton);
  gridHelper.visible = toggles.grid;
  skeletonGroup.visible = toggles.skeleton;
  const project = getActiveProject();
  if (project && project.material) project.material.wireframe = toggles.wireframe;
}

/* ==================== Wiring up the UI ==================== */
function initUI() {
  document.getElementById('btnNewProject').addEventListener('click', () => {
    const p = createProject(t('defaultModelName', state.projects.length + 1));
    selectProject(p.id);
  });
  document.getElementById('btnEmptyNewProject').addEventListener('click', () => document.getElementById('btnNewProject').click());

  // file rows: .obj model / texture (in the sidebar now, no longer in the viewport)
  function wireDropzone(el, input, onFile) {
    el.addEventListener('click', () => input.click());
    input.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (f) await onFile(f);
      e.target.value = '';
    });
    ['dragenter', 'dragover'].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('dragover'); }));
    el.addEventListener('drop', async (e) => {
      const f = e.dataTransfer.files[0];
      if (f) await onFile(f);
    });
  }

  wireDropzone(document.getElementById('fileRowObj'), document.getElementById('objInput'), async (f) => {
    let project = getActiveProject();
    if (!project) { project = createProject(f.name.replace(/\.obj$/i, '')); state.activeId = project.id; }
    if (project.name.startsWith('Modelo ')) project.name = f.name.replace(/\.obj$/i, '');
    try { await setProjectObj(project, f); } catch (err) { setStatus(t('status.objReadError', err.message), true); return; }
    selectProject(project.id);
  });
  wireDropzone(document.getElementById('fileRowTex'), document.getElementById('texInput'), async (f) => {
    let project = getActiveProject();
    if (!project) { project = createProject('Modelo ' + state.projects.length); state.activeId = project.id; }
    await setProjectTexture(project, f);
    selectProject(project.id, { skipFit: true, keepBoneSelection: true });
  });

  document.getElementById('btnAutoAssign').addEventListener('click', () => {
    const project = getActiveProject();
    if (!project) return;
    autoAssignParts(project);
    maybeBuildPreview(project);
    refreshPartsList(); refreshBoneTree(); refreshExportPanel();
    setStatus(t('status.partsReassigned'));
  });
  document.getElementById('partsSearch').addEventListener('input', refreshPartsList);

  // tabs
  document.querySelectorAll('.tabBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabBtn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tabPanel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // hueso: edición
  document.getElementById('boneNameInput').addEventListener('change', (e) => {
    const project = getActiveProject(); if (!project) return;
    const bone = project.bones.find((b) => b.name === state.activeBoneName);
    if (!bone) return;
    const newName = e.target.value.trim();
    if (!newName || project.bones.some((b) => b.name === newName && b !== bone)) { e.target.value = bone.name; return; }
    const oldName = bone.name;
    bone.name = newName;
    project.bones.forEach((b) => { if (b.parent === oldName) b.parent = newName; });
    project.parts.forEach((p) => { if (p.boneName === oldName) p.boneName = newName; });
    state.activeBoneName = newName;
    maybeBuildPreview(project); refreshBoneTree(); refreshPartsList(); refreshExportPanel();
  });
  document.getElementById('boneParentSelect').addEventListener('change', (e) => {
    const project = getActiveProject(); if (!project) return;
    const bone = project.bones.find((b) => b.name === state.activeBoneName);
    if (!bone) return;
    bone.parent = e.target.value || null;
    maybeBuildPreview(project); refreshBoneTree();
  });
  ['pivotX', 'pivotY', 'pivotZ'].forEach((id, axis) => {
    document.getElementById(id).addEventListener('input', (e) => {
      const project = getActiveProject(); if (!project) return;
      const bone = project.bones.find((b) => b.name === state.activeBoneName);
      if (!bone) return;
      const v = parseFloat(e.target.value);
      bone.pivot[axis] = isNaN(v) ? 0 : v;
      maybeBuildPreview(project);
    });
  });
  document.getElementById('btnAddBone').addEventListener('click', () => {
    const project = getActiveProject(); if (!project) return;
    const parentBone = project.bones.find((b) => b.name === state.activeBoneName);
    let base = t('bones.defaultName'), n = 1;
    while (project.bones.some((b) => b.name === base + n)) n++;
    const name = base + n;
    // Created INSIDE the currently selected bone (as a sub-folder); if
    // none is selected, it's created at the root. It can always be moved
    // afterwards by changing "Parent bone" in the panel.
    const startPivot = parentBone ? [...parentBone.pivot] : [0, 0, 0];
    project.bones.push({ name, parent: parentBone ? parentBone.name : 'root', pivot: startPivot });
    state.activeBoneName = name;
    maybeBuildPreview(project); refreshBoneTree(); refreshExportPanel();
  });
  document.getElementById('btnDeleteBone').addEventListener('click', () => {
    const project = getActiveProject(); if (!project) return;
    const bone = project.bones.find((b) => b.name === state.activeBoneName);
    if (!bone) return;
    if (!confirm(t('bones.confirmDelete', bone.name))) return;
    project.bones = project.bones.filter((b) => b !== bone);
    project.bones.forEach((b) => { if (b.parent === bone.name) b.parent = null; });
    project.parts.forEach((p) => { if (p.boneName === bone.name) p.boneName = null; });
    state.activeBoneName = null;
    maybeBuildPreview(project); refreshBoneTree(); refreshPartsList(); refreshExportPanel();
  });

  // exportación
  document.getElementById('exportNameInput').addEventListener('input', (e) => {
    const project = getActiveProject(); if (!project) return;
    project.name = e.target.value || project.name;
    document.getElementById('exportIdentifierInput').value = `geometry.${slugify(project.name)}`;
    refreshProjectList();
  });
  document.getElementById('btnDownloadPackage').addEventListener('click', downloadSkinPackage);
  document.getElementById('packNameInput').addEventListener('input', (e) => {
    state.packName = e.target.value;
  });
  document.getElementById('exportStyleToggle').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.segmentBtn');
    if (!btn) return;
    state.exportStyle = btn.dataset.style === 'compact' ? 'compact' : 'fancy';
    document.getElementById('btnStyleFancy').classList.toggle('active', state.exportStyle === 'fancy');
    document.getElementById('btnStyleCompact').classList.toggle('active', state.exportStyle === 'compact');
  });

  // toolbar
  document.getElementById('btnZoomIn').addEventListener('click', () => dolly(0.85));
  document.getElementById('btnZoomOut').addEventListener('click', () => dolly(1.18));
  document.getElementById('btnFit').addEventListener('click', () => { if (currentPreviewGroup) fitCameraToObject(currentPreviewGroup); });
  document.getElementById('btnWireframe').addEventListener('click', () => { toggles.wireframe = !toggles.wireframe; applyToggleStates(); });
  document.getElementById('btnGrid').addEventListener('click', () => { toggles.grid = !toggles.grid; applyToggleStates(); });
  document.getElementById('btnSkeleton').addEventListener('click', () => { toggles.skeleton = !toggles.skeleton; applyToggleStates(); });
  document.getElementById('btnUnassignedOnly').addEventListener('click', (e) => {
    const project = getActiveProject(); if (!project || !currentPreviewGroup) return;
    e.target.classList.toggle('active');
    const on = e.target.classList.contains('active');
    currentPreviewGroup.traverse((obj) => {
      if (obj.isMesh) {
        const part = project.parts.find((p) => p.id === obj.userData.partId);
        obj.material = on && part && part.autoMatched ? project.material.clone() : project.material;
        if (on && part) obj.visible = !part.autoMatched;
        else obj.visible = true;
      }
    });
  });
  document.getElementById('btnFullscreen').addEventListener('click', () => {
    const el = document.getElementById('app');
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  });

  // global drag & drop -> first .obj file and first image found
  const app = document.getElementById('app');
  const overlay = document.getElementById('dropOverlay');
  ['dragenter', 'dragover'].forEach((ev) => app.addEventListener(ev, (e) => { e.preventDefault(); overlay.classList.add('active'); }));
  ['dragleave'].forEach((ev) => app.addEventListener(ev, (e) => { if (e.target === app) overlay.classList.remove('active'); }));
  app.addEventListener('drop', async (e) => {
    e.preventDefault();
    overlay.classList.remove('active');
    if (e.target.closest('#fileRowObj') || e.target.closest('#fileRowTex')) return; // already handled by its own zone
    const files = Array.from(e.dataTransfer.files);
    const objFile = files.find((f) => /\.obj$/i.test(f.name));
    const texFile = files.find((f) => /\.(png|jpe?g)$/i.test(f.name));
    if (!objFile && !texFile) return;
    let project = getActiveProject();
    if (!project) { project = createProject(objFile ? objFile.name.replace(/\.obj$/i, '') : 'Modelo ' + (state.projects.length + 1)); state.activeId = project.id; }
    if (objFile) { try { await setProjectObj(project, objFile); } catch (err) { setStatus(t('status.objReadError', err.message), true); } }
    if (texFile) await setProjectTexture(project, texFile);
    selectProject(project.id);
  });

  applyToggleStates();

  // ---------- Paneles deslizables en móvil (sidebar / inspector) ----------
  const mobileBackdrop = document.getElementById('mobileBackdrop');
  const sidebarEl = document.getElementById('sidebar');
  const inspectorEl = document.getElementById('inspector');

  function closeMobilePanels() {
    sidebarEl.classList.remove('open');
    inspectorEl.classList.remove('open');
    mobileBackdrop.classList.remove('active');
  }
  function openMobilePanel(el) {
    sidebarEl.classList.remove('open');
    inspectorEl.classList.remove('open');
    el.classList.add('open');
    mobileBackdrop.classList.add('active');
  }
  document.getElementById('btnMobileSidebar').addEventListener('click', () => openMobilePanel(sidebarEl));
  document.getElementById('btnMobileInspector').addEventListener('click', () => openMobilePanel(inspectorEl));
  document.getElementById('btnCloseSidebar').addEventListener('click', closeMobilePanels);
  document.getElementById('btnCloseInspector').addEventListener('click', closeMobilePanels);
  mobileBackdrop.addEventListener('click', closeMobilePanels);
  // on mobile, picking/creating a model closes the panel so you can see the 3D viewport
  document.getElementById('projectList').addEventListener('click', () => { if (window.innerWidth <= 760) closeMobilePanels(); });
  document.getElementById('btnNewProject').addEventListener('click', () => { if (window.innerWidth <= 760) closeMobilePanels(); });

  // ---------- Language switcher (ES/EN), synced with MBSM ----------
  document.getElementById('objSkinLangSwitch').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.lang-btn');
    if (!btn) return;
    setLang(btn.dataset.lang);
  });
}

/* ==================== Startup ==================== */
let ossInitialized = false;
function initObjSkinStudio() {
  if (ossInitialized) return;
  ossInitialized = true;
  initThree();
  initUI();
  applyI18n();
  // if another tab/window (a different document) changes the language
  // in localStorage, this tool updates itself without needing a reload
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'mbsm_lang' && (ev.newValue === 'es' || ev.newValue === 'en')) {
      state_i18n.lang = ev.newValue;
      applyI18n();
    }
  });
}

// Public API: index.html uses this to lazily initialize this tool
// (only the first time its sub-tab is opened) and to refresh its text
// when the site's main language switcher changes language (see
// applyLanguage() in app.js). refreshLanguage() can't just be applyI18n:
// state_i18n.lang has to be synced with the site's current language
// (currentLang, a global variable from app.js) first -- otherwise it
// would repaint with whatever language this tool had saved, not with
// the one the user just picked.
window.ObjSkinStudio = {
  init: initObjSkinStudio,
  refreshLanguage: function () {
    if (typeof currentLang === 'string' && (currentLang === 'es' || currentLang === 'en')) {
      state_i18n.lang = currentLang;
    }
    applyI18n();
  }
};

})();
