// maker.js
// Skinpack Maker: lets you build a regular Minecraft Bedrock skinpack
// from scratch. Imports skins (a local PNG, or by Java/Bedrock username),
// auto-detects the model (wide/slim) while still letting you correct it
// by hand, sets up the pack's name, description and icon (with a Bedrock
// color/format picker), and generates a downloadable .mcpack with a
// fresh UUID every time you generate one.
//
// Import by username: uses a handful of public, CORS-enabled services
// (there's no backend of our own). For Java, we try minotar.net,
// mc-heads.net and mineskin.eu in order -- all of them accept the
// username directly, no need to resolve a UUID first. For Bedrock we use
// GeyserMC's public API (username/gamertag -> Xbox XUID -> texture id),
// and the final texture is downloaded through wsrv.nl (a CORS-enabled
// image proxy) since textures.minecraft.net doesn't send CORS headers.
// Note: the Bedrock lookup only finds a result if that account has
// already connected to a Geyser-enabled server before, since that's how
// GeyserMC's API works under the hood.
//
// Load-order note: this script runs BEFORE app.js, so it must never call
// t()/mcFormatToHtml()/escapeHtml() (defined in app.js) from top-level
// code — only from inside callbacks triggered by user interaction, or
// from applyLanguage(), both of which always run after app.js has
// already defined those functions.

// ---------- State ----------
let makerSkins = [];       // { id, name, model: "wide"|"slim", dataUrl }
let makerPackIcon = null;  // { dataUrl } | null
let makerNextId = 1;
let makerPlatform = "java"; // "java" | "bedrock", for username-based import
let makerActiveField = null; // the name/description <input> that was most recently focused

// ---------- Helpers ----------

// A valid Minecraft skin is either square (64x64, 128x128, ...) or has
// the old format's 2:1 ratio (64x32, 128x64, ...), always with a width
// that's a multiple of 64.
function makerValidDimensions(width, height) {
  if (!width || !height || width < 64 || width % 64 !== 0) return false;
  return height === width || width === height * 2;
}

// Detects whether a texture already drawn onto a canvas uses the "slim"
// model (Alex, 3px arms) instead of "wide" (Steve, 4px arms).
//
// Standard technique used by skin launchers/editors: in the 64x64
// layout, the right sleeve (layer 2) reserves a 1px strip that's only
// used by the wide model; on slim skins that strip is fully transparent.
// If those pixels are 100% transparent, it's slim.
// The old 64x32 format never has a slim model.
function makerDetectSlim(ctx, width, height) {
  if (height < 64) return false;

  try {
    const scale = width / 64;
    const x = Math.round(54 * scale);
    const y = Math.round(20 * scale);
    const w = Math.max(1, Math.round(scale));
    const h = Math.max(1, Math.round(12 * scale));

    const data = ctx.getImageData(x, y, w, h).data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Turns a local image (blob:) into a "clean" PNG by drawing it onto a
// canvas. This normalizes the output format (always a real PNG) and
// doubles as validation: if the image can't be decoded, the browser
// fires onerror. Also works out the likely model (wide/slim) along the way.
function makerImageToPng(sourceUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        if (!canvas.width || !canvas.height) {
          reject(new Error("empty_image"));
          return;
        }

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);

        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height,
          isSlimGuess: makerDetectSlim(ctx, canvas.width, canvas.height)
        });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("image_decode_error"));
    img.src = sourceUrl;
  });
}

function makerFileToPng(file) {
  const objectUrl = URL.createObjectURL(file);
  return makerImageToPng(objectUrl).finally(() => URL.revokeObjectURL(objectUrl));
}

function makerBlobToPng(blob) {
  const objectUrl = URL.createObjectURL(blob);
  return makerImageToPng(objectUrl).finally(() => URL.revokeObjectURL(objectUrl));
}

function makerDataUrlToBytes(dataUrl) {
  const base64 = dataUrl.substring(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Generates a fresh, random UUID v4. Deliberately a function rather
// than a fixed value: every generated pack, even with the same name,
// needs its own distinct identifiers.
function makerGenerateUUID() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  // Fallback for browsers without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Lets you type Bedrock formatting codes two ways: pasting the § symbol
// directly (e.g. "§c"), or typing the easier-to-reach ampersand shortcut
// ("&c"). Both end up saved as a real § in the final pack.
function makerNormalizeFormatting(str) {
  if (!str) return "";
  // Valid Bedrock codes: 0-9 and a-u with no gaps (colors 0-9/a-j/m/n/
  // p/q/s/t/u + formatting k/l/o/r), same set as MC_COLORS +
  // mcFormatToHtml in app.js.
  return str.replace(/&([0-9a-u])/gi, (m, c) => "§" + c.toLowerCase());
}

// Turns a free-form name into a safe identifier (lowercase letters,
// digits and underscores only) for use as localization_name / a key
// prefix in the .lang files.
function makerSanitizeId(str, fallback) {
  const noFormatting = String(str || "").replace(/§./g, "").replace(/&[0-9a-u]/gi, "");
  let cleaned;
  try {
    cleaned = noFormatting.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
    cleaned = noFormatting;
  }
  cleaned = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function makerSetStatus(message, type) {
  const el = document.getElementById("makerImportStatus");
  if (!el) return;
  el.textContent = message || "";
  el.className = "maker-status" + (type ? " " + type : "");
}

// ---------- Skin list ----------

function makerAddSkin(dataUrl, suggestedName, modelGuess) {
  const name = (suggestedName && suggestedName.trim())
    ? suggestedName.trim()
    : `${t("maker.defaultSkinName")} ${makerSkins.length + 1}`;

  makerSkins.push({
    id: makerNextId++,
    name,
    model: modelGuess === "slim" ? "slim" : "wide",
    dataUrl
  });

  renderMakerSkinsList();
  makerSetStatus(t("maker.importOk").replace("{name}", name), "success");
}

function renderMakerSkinsList() {
  const list = document.getElementById("makerSkinsList");
  if (!list) return;

  if (!makerSkins.length) {
    list.innerHTML = `<p class="maker-empty">${t("maker.noSkinsYet")}</p>`;
    return;
  }

  list.innerHTML = makerSkins.map(skin => `
    <div class="maker-skin-item" data-id="${skin.id}">
      <img src="${skin.dataUrl}" alt="">
      <input
        type="text"
        class="maker-skin-name maker-skin-name-input"
        data-id="${skin.id}"
        data-role="maker-skin-name"
        value="${escapeHtml(skin.name)}"
        aria-label="${escapeHtml(t("maker.skinName"))}"
      >
      <select class="maker-skin-model-select" data-id="${skin.id}" data-role="maker-skin-model" aria-label="${escapeHtml(t("maker.skinModel"))}">
        <option value="wide" ${skin.model === "wide" ? "selected" : ""}>${t("viewer.modelSteve")}</option>
        <option value="slim" ${skin.model === "slim" ? "selected" : ""}>${t("viewer.modelAlex")}</option>
      </select>
      <button type="button" class="maker-skin-remove" data-id="${skin.id}" data-role="maker-skin-remove">${t("maker.remove")}</button>
    </div>
  `).join("");
}

// Event delegation: works no matter how many times the list gets
// re-rendered (no need to re-attach listeners).
const makerSkinsListEl = document.getElementById("makerSkinsList");

if (makerSkinsListEl) {

  makerSkinsListEl.addEventListener("input", (e) => {
    const target = e.target.closest('[data-role="maker-skin-name"]');
    if (!target) return;
    const id = Number(target.getAttribute("data-id"));
    const skin = makerSkins.find(s => s.id === id);
    if (skin) skin.name = target.value;
  });

  makerSkinsListEl.addEventListener("change", (e) => {
    const target = e.target.closest('[data-role="maker-skin-model"]');
    if (!target) return;
    const id = Number(target.getAttribute("data-id"));
    const skin = makerSkins.find(s => s.id === id);
    if (skin) skin.model = target.value === "slim" ? "slim" : "wide";
  });

  makerSkinsListEl.addEventListener("click", (e) => {
    const target = e.target.closest('[data-role="maker-skin-remove"]');
    if (!target) return;
    const id = Number(target.getAttribute("data-id"));
    makerSkins = makerSkins.filter(s => s.id !== id);
    renderMakerSkinsList();
  });

}

// ---------- Importar: Subir PNG ----------

const makerFileInput = document.getElementById("makerFileInput");

if (makerFileInput) {
  makerFileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // lets the user pick the same file again later

    if (!files.length) return;

    makerSetStatus(t("maker.importing"));

    for (const file of files) {
      try {
        const png = await makerFileToPng(file);

        if (!makerValidDimensions(png.width, png.height)) {
          makerSetStatus(t("maker.invalidDimensions"), "error");
          continue;
        }

        const suggestedName = file.name.replace(/\.[^.]+$/, "");
        makerAddSkin(png.dataUrl, suggestedName, png.isSlimGuess ? "slim" : "wide");
      } catch (err) {
        console.error(err);
        makerSetStatus(t("maker.importFailGeneric"), "error");
      }
    }
  });
}

// ---------- Import: by username (Java / Bedrock) ----------

// All of these accept the username directly (no need to resolve a UUID
// first) and have CORS enabled.
const MAKER_JAVA_SKIN_SOURCES = [
  { name: "minotar.net", url: (u) => `https://minotar.net/skin/${u}` },
  { name: "mc-heads.net", url: (u) => `https://mc-heads.net/skin/${u}` },
  { name: "mineskin.eu", url: (u) => `https://mineskin.eu/skin/${u}` }
];

async function makerFetchJavaSkin(username) {
  const encoded = encodeURIComponent(username.trim());

  for (const source of MAKER_JAVA_SKIN_SOURCES) {
    try {
      const res = await fetch(source.url(encoded), { mode: "cors" });
      if (!res.ok) continue;

      const blob = await res.blob();
      if (blob.size < 100) continue; // empty response / error placeholder

      const png = await makerBlobToPng(blob);
      if (!makerValidDimensions(png.width, png.height)) continue;

      return png;
    } catch (e) {
      // try the next source
    }
  }

  return null;
}

// GeyserMC exposes a public API for converting a Bedrock/Xbox gamertag
// into its XUID, and from there into the last skin that account uploaded
// to a Geyser-enabled server. The final texture is downloaded through
// wsrv.nl (a CORS-enabled image proxy) since textures.minecraft.net
// doesn't send CORS headers.
async function makerFetchBedrockSkin(gamertag) {
  try {
    const xuidRes = await fetch(
      `https://api.geysermc.org/v2/xbox/xuid/${encodeURIComponent(gamertag.trim())}`,
      { mode: "cors" }
    );
    if (!xuidRes.ok) return null;

    const xuidJson = await xuidRes.json();
    if (!xuidJson || !xuidJson.xuid) return null;

    const skinRes = await fetch(`https://api.geysermc.org/v2/skin/${xuidJson.xuid}`, { mode: "cors" });
    if (!skinRes.ok) return null;

    const skinJson = await skinRes.json();
    if (!skinJson || !skinJson.texture_id) return null;

    const textureUrl =
      `https://wsrv.nl/?url=${encodeURIComponent(`textures.minecraft.net/texture/${skinJson.texture_id}`)}&output=png`;

    const texRes = await fetch(textureUrl, { mode: "cors" });
    if (!texRes.ok) return null;

    const blob = await texRes.blob();
    const png = await makerBlobToPng(blob);
    if (!makerValidDimensions(png.width, png.height)) return null;

    return png;
  } catch (e) {
    return null;
  }
}

const makerUsernameInput = document.getElementById("makerUsernameInput");
const makerUsernameBtn = document.getElementById("makerUsernameBtn");
const makerUsernameHint = document.getElementById("makerUsernameHint");

document.querySelectorAll(".maker-platform-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    makerPlatform = btn.getAttribute("data-platform") === "bedrock" ? "bedrock" : "java";

    document.querySelectorAll(".maker-platform-btn").forEach(b => {
      b.classList.toggle("active", b === btn);
    });

    if (makerUsernameHint) {
      makerUsernameHint.textContent = t(
        makerPlatform === "bedrock" ? "maker.usernameHintBedrock" : "maker.usernameHintJava"
      );
    }
  });
});

async function makerImportFromUsername() {
  const username = (makerUsernameInput.value || "").trim();

  if (!username) {
    makerSetStatus(t("maker.needUsername"), "error");
    return;
  }

  makerSetStatus(t("maker.importing"));

  const png = makerPlatform === "bedrock"
    ? await makerFetchBedrockSkin(username)
    : await makerFetchJavaSkin(username);

  if (!png) {
    makerSetStatus(
      t(makerPlatform === "bedrock" ? "maker.importFailUsernameBedrock" : "maker.importFailUsernameJava"),
      "error"
    );
    return;
  }

  makerAddSkin(png.dataUrl, username, png.isSlimGuess ? "slim" : "wide");
  makerUsernameInput.value = "";
}

if (makerUsernameBtn) {
  makerUsernameBtn.addEventListener("click", makerImportFromUsername);
}

if (makerUsernameInput) {
  makerUsernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      makerImportFromUsername();
    }
  });
}

// ---------- Pack setup: name, description, icon ----------

const makerPackName = document.getElementById("makerPackName");
const makerPackDescription = document.getElementById("makerPackDescription");
const makerNamePreview = document.getElementById("makerNamePreview");
const makerIconInput = document.getElementById("makerIconInput");
const makerIconPreview = document.getElementById("makerIconPreview");

function updateMakerPreview() {
  if (!makerNamePreview) return;

  const rawName = makerPackName ? makerNormalizeFormatting(makerPackName.value) : "";
  const rawDesc = makerPackDescription ? makerNormalizeFormatting(makerPackDescription.value) : "";

  const nameHtml = rawName ? mcFormatToHtml(rawName) : escapeHtml(t("maker.packNamePlaceholder"));
  const descHtml = rawDesc ? mcFormatToHtml(rawDesc) : "";

  makerNamePreview.innerHTML = `
    <div class="pack-info-name">${nameHtml}</div>
    ${descHtml ? `<div class="pack-info-description">${descHtml}</div>` : ""}
  `;
}

if (makerPackName) makerPackName.addEventListener("input", updateMakerPreview);
if (makerPackDescription) makerPackDescription.addEventListener("input", updateMakerPreview);

// ---------- Color / formatting picker ----------
// Inserts the matching § code into whichever field (name or description)
// was most recently focused, at the cursor's position -- same as if the
// user had typed it by hand. That way Bedrock's codes are one tap away,
// without having to type the § symbol (awkward on most keyboards) or
// memorize the & shortcut.
[makerPackName, makerPackDescription].forEach(field => {
  if (!field) return;
  field.addEventListener("focus", () => { makerActiveField = field; });
});

// Names for the 16 standard colors + 11 Bedrock-exclusive material
// colors, in the same order/values as MC_COLORS (app.js) so the preview
// matches the chosen swatch exactly.
const MAKER_COLOR_CODES = [
  ["0", "#000000", "colorBlack"], ["1", "#0000AA", "colorDarkBlue"],
  ["2", "#00AA00", "colorDarkGreen"], ["3", "#00AAAA", "colorDarkAqua"],
  ["4", "#AA0000", "colorDarkRed"], ["5", "#AA00AA", "colorDarkPurple"],
  ["6", "#FFAA00", "colorGold"], ["7", "#AAAAAA", "colorGray"],
  ["8", "#555555", "colorDarkGray"], ["9", "#5555FF", "colorBlue"],
  ["a", "#55FF55", "colorGreen"], ["b", "#55FFFF", "colorAqua"],
  ["c", "#FF5555", "colorRed"], ["d", "#FF55FF", "colorLightPurple"],
  ["e", "#FFFF55", "colorYellow"], ["f", "#FFFFFF", "colorWhite"],
  ["g", "#DDD605", "colorMinecoinGold"], ["h", "#E3D4D1", "colorQuartz"],
  ["i", "#CECACA", "colorIron"], ["j", "#443A3B", "colorNetherite"],
  ["m", "#971607", "colorRedstone"], ["n", "#B4684D", "colorCopper"],
  ["p", "#DEB12D", "colorGoldMaterial"], ["q", "#47A036", "colorEmerald"],
  ["s", "#2CBAA8", "colorDiamond"], ["t", "#21497B", "colorLapis"],
  ["u", "#9A5CC6", "colorAmethyst"]
];

// Only the codes that are actually FORMATTING functions in Bedrock
// (§n and §m, unlike Java, are material colors here rather than
// underline/strikethrough -- that's why they don't show up as
// "formatting").
const MAKER_FORMAT_CODES = [
  ["l", "B", "formatBold"], ["o", "I", "formatItalic"],
  ["k", "?", "formatObfuscated"], ["r", "R", "formatReset"]
];

function makerInsertCode(code) {
  const field = makerActiveField || makerPackName;
  if (!field) return;

  const start = field.selectionStart != null ? field.selectionStart : field.value.length;
  const end = field.selectionEnd != null ? field.selectionEnd : field.value.length;

  field.value = field.value.slice(0, start) + "§" + code + field.value.slice(end);
  field.focus();

  const caret = start + 2;
  field.setSelectionRange(caret, caret);

  updateMakerPreview();
}

function renderMakerCodePickers() {
  const swatchGrid = document.getElementById("makerColorSwatches");
  const formatRow = document.getElementById("makerFormatButtons");

  if (swatchGrid) {
    swatchGrid.innerHTML = MAKER_COLOR_CODES.map(([code, hex, nameKey]) => `
      <button
        type="button"
        class="maker-swatch"
        style="background:${hex}"
        data-code="${code}"
        title="${escapeHtml(t("maker." + nameKey))}"
        aria-label="${escapeHtml(t("maker." + nameKey))}"
      ></button>
    `).join("");
  }

  if (formatRow) {
    formatRow.innerHTML = MAKER_FORMAT_CODES.map(([code, label, nameKey]) => `
      <button
        type="button"
        class="maker-format-btn"
        data-code="${code}"
        title="${escapeHtml(t("maker." + nameKey))}"
        aria-label="${escapeHtml(t("maker." + nameKey))}"
      >${label}</button>
    `).join("");
  }
}

document.addEventListener("click", (e) => {
  const swatch = e.target.closest(".maker-swatch, .maker-format-btn");
  if (!swatch) return;
  makerInsertCode(swatch.getAttribute("data-code"));
});

if (makerIconInput) {
  makerIconInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;

    try {
      const png = await makerFileToPng(file);
      makerPackIcon = { dataUrl: png.dataUrl };

      if (makerIconPreview) {
        makerIconPreview.innerHTML = `<img src="${png.dataUrl}" alt="">`;
      }
    } catch (err) {
      console.error(err);
      makerSetStatus(t("maker.importFailGeneric"), "error");
    }
  });
}

// ---------- Generate and download the .mcpack ----------

const makerGenerateBtn = document.getElementById("makerGenerateBtn");

async function makerGeneratePack() {
  if (!makerSkins.length) {
    mbsmToast("warning", t("maker.needSkins"));
    return;
  }

  const rawName = makerNormalizeFormatting(makerPackName ? makerPackName.value.trim() : "");

  if (!rawName) {
    mbsmToast("warning", t("maker.needName"));
    return;
  }

  const rawDescription = makerNormalizeFormatting(makerPackDescription ? makerPackDescription.value.trim() : "");

  const originalBtnText = makerGenerateBtn.textContent;
  makerGenerateBtn.disabled = true;
  makerGenerateBtn.textContent = t("maker.generating");

  try {
    const zip = new JSZip();

    // Fresh UUIDs every time: the manifest never reuses ones from a
    // previous pack, or between header and module.
    const headerUuid = makerGenerateUUID();
    const moduleUuid = makerGenerateUUID();

    const baseId = makerSanitizeId(rawName, "custom_pack");
    const serializeName = `${baseId}_${headerUuid.slice(0, 8)}`;

    // ---- manifest.json ----
    const manifest = {
      format_version: 2,
      header: {
        name: rawName,
        description: rawDescription || t("js.defaultPackDescription"),
        uuid: headerUuid,
        version: [1, 0, 0],
        min_engine_version: [1, 16, 0]
      },
      modules: [
        {
          type: "skin_pack",
          uuid: moduleUuid,
          version: [1, 0, 0]
        }
      ]
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // ---- skins.json + textures ----
    // Textures live at the pack's root (next to manifest.json and
    // skins.json), same as in real skinpacks: not inside a "skins/"
    // subfolder.
    const skinsJson = {
      serialize_name: serializeName,
      localization_name: serializeName,
      skins: []
    };

    const enUsLines = [`skinpack.${serializeName}=${rawName}`];
    const esEsLines = [`skinpack.${serializeName}=${rawName}`];

    makerSkins.forEach((skin, i) => {
      const skinId = `skin_${i + 1}`;
      const fileName = `${skinId}.png`;
      const displayName = makerNormalizeFormatting(skin.name.trim()) || `${t("maker.defaultSkinName")} ${i + 1}`;

      skinsJson.skins.push({
        localization_name: skinId,
        geometry: skin.model === "slim" ? "geometry.humanoid.customSlim" : "geometry.humanoid.custom",
        texture: fileName,
        type: "free"
      });

      zip.file(fileName, makerDataUrlToBytes(skin.dataUrl));

      const key = `skin.${serializeName}.${skinId}`;
      enUsLines.push(`${key}=${displayName}`);
      esEsLines.push(`${key}=${displayName}`);
    });

    zip.file("skins.json", JSON.stringify(skinsJson, null, 2));

    // ---- text / language files ----
    zip.file("texts/en_US.lang", enUsLines.join("\n"));
    zip.file("texts/es_ES.lang", esEsLines.join("\n"));
    zip.file("texts/languages.json", JSON.stringify(["en_US", "es_ES"], null, 2));

    // ---- pack icon (optional) ----
    if (makerPackIcon) {
      zip.file("pack_icon.png", makerDataUrlToBytes(makerPackIcon.dataUrl));
    }

    // streamFiles:false avoids "data descriptors" (sizes written after
    // the data instead of in the local header); some Windows antivirus
    // heuristics are more suspicious of zips using that streaming mode,
    // and there's no need for it here anyway since we already have every
    // byte in memory up front.
    const output = await zip.generateAsync({
      type: "blob",
      platform: "DOS",
      streamFiles: false,
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const downloadName = `${baseId || "skinpack"}.mcpack`;
    const blobUrl = URL.createObjectURL(output);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadName;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

  } catch (err) {
    console.error(err);
    mbsmToast("error", t("maker.generateError"));
  } finally {
    makerGenerateBtn.disabled = false;
    makerGenerateBtn.textContent = originalBtnText;
  }
}

if (makerGenerateBtn) {
  makerGenerateBtn.addEventListener("click", makerGeneratePack);
}

// ---------- Language refresh ----------
// app.js calls this function (if it exists) whenever the language
// changes, so the already-rendered skin list and the name/description
// preview get translated too -- they were generated dynamically, so
// data-i18n doesn't cover them.
function refreshMakerLanguage() {
  renderMakerSkinsList();
  updateMakerPreview();
  renderMakerCodePickers();

  const hintEl = document.getElementById("makerUsernameHint");
  if (hintEl) {
    hintEl.textContent = t(makerPlatform === "bedrock" ? "maker.usernameHintBedrock" : "maker.usernameHintJava");
  }
}
