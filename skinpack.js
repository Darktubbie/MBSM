/* =========================================================================
   skinpack.js — Loading and parsing Minecraft Bedrock Skin Packs
   (.zip / .mcpack, geometry.json, skins.json, .png textures)

   Responsible ONLY for:
     - opening .zip/.mcpack files with JSZip
     - locating and parsing geometry.json (the only source of models)
     - detecting 4D (cubes) vs 5D (poly_mesh) by each geometry's actual
       STRUCTURE — never by format_version or the model's name
     - reading skins.json to pair each geometry with its real texture
     - extracting textures from the zip on demand

   Doesn't know about Three.js or Blockbench: it's pure data
   parsing/state. All of this logic is the same that already worked in
   the original prototype — it was just moved here and decoupled from
   the UI via a logFn(msg, kind) parameter instead of writing straight
   to the DOM log.
   ========================================================================= */

const SkinPack = (function () {

  // Repairs common JSON mistakes in hand-edited files (trailing commas
  // before "}" or "]"). If the JSON is already valid, this changes nothing.
  function repairAndParseJSON(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      try {
        const repaired = text.replace(/,(\s*[}\]])/g, "$1");
        return JSON.parse(repaired);
      } catch (e2) {
        return null;
      }
    }
  }

  // Detects whether ONE individual geometry (already extracted from
  // geometry.json) is 4D or 5D, by looking at the ACTUAL STRUCTURE of its
  // bones.
  //   - Bones with "cubes" (at least one cube)          -> 4D signal
  //   - Bones with "poly_mesh.positions" + "polys"       -> 5D signal
  function detectGeometryType(g) {
    const bones = g.bones || [];
    const hasCubes = bones.some(b => Array.isArray(b.cubes) && b.cubes.length > 0);
    const hasPolyMesh = bones.some(b => b.poly_mesh && Array.isArray(b.poly_mesh.positions) && Array.isArray(b.poly_mesh.polys));
    if (hasCubes && hasPolyMesh) return "MIXTO";
    if (hasPolyMesh) return "5D";
    if (hasCubes) return "4D";
    return "VACÍO";
  }

  // Converts a geometry.json using the legacy wrapper (identifier as
  // the top-level key) into a uniform internal list:
  // [{ id, texture_width, texture_height, bones, type }]. Deliberately
  // does NOT recognize the modern "minecraft:geometry" format: that gets
  // rejected earlier.
  function normalizeGeometry(json) {
    const out = [];
    Object.keys(json).forEach(key => {
      if (key === "format_version") return;
      const g = json[key];
      if (!g || typeof g !== "object" || !Array.isArray(g.bones)) return;
      out.push({
        id: key,
        texture_width: g.texturewidth || g.texture_width || 64,
        texture_height: g.textureheight || g.texture_height || 64,
        bones: g.bones,
        type: detectGeometryType(g)
      });
    });
    return out;
  }

  function summarizeTypes(list) {
    const n4d = list.filter(g => g.type === "4D").length;
    const n5d = list.filter(g => g.type === "5D").length;
    const nOther = list.length - n4d - n5d;
    let s = `${n4d} en 4D (cubes), ${n5d} en 5D (poly_mesh)`;
    if (nOther) s += `, ${nOther} mixto(s)/vacío(s)`;
    return s;
  }

  // Loads a standalone geometry (a single geometry.json, no pack around
  // it). Returns { normalized, formatVersion }, or null if it isn't valid.
  // Warnings/errors are reported through logFn, same as everywhere else.
  function loadStandaloneGeometry(json, label, logFn) {
    if (!json || typeof json !== "object") {
      logFn(label + " no es un JSON válido.", "err");
      return null;
    }
    if (Array.isArray(json["minecraft:geometry"])) {
      logFn(`${label} usa el formato 1.12.0+ ("minecraft:geometry") — no es compatible con este visor. Sube una geometría en formato legacy (identificador como llave de nivel superior).`, "err");
      return null;
    }
    const normalized = normalizeGeometry(json);
    if (!normalized.length) {
      logFn(label + " no contiene ninguna geometría legacy reconocible (se esperaban bones con \"cubes\" o \"poly_mesh\").", "err");
      return null;
    }
    const fv = json.format_version || "";
    if (fv && fv !== "1.8.0" && fv !== "1.10.0") {
      logFn(`Aviso: ${label} declara format_version "${fv}" (no es el típico 1.8.0/1.10.0), pero se procesa igual: la clasificación 4D/5D se hace por la estructura real de cada modelo, no por este campo.`, "warn");
    }
    logFn(`Geometría cargada: ${normalized.length} modelo(s) — ${summarizeTypes(normalized)}.`, "ok");
    normalized.forEach(g => {
      const hasTextureMeshes = g.bones.some(b => b.texture_meshes);
      if (hasTextureMeshes) logFn(`"${g.id}" usa texture_meshes (referencia a un modelo/textura externos, típico de objetos en la mano) — esa parte no se puede previsualizar aquí y se omite.`, "warn");
    });
    return normalized;
  }

  // Opens a full .zip/.mcpack and builds the list of options (model <->
  // texture, matched through skins.json). logFn(msg, kind) reports to the
  // UI log same as before. Returns { geoData, zip, options }, or null.
  async function parsePackFile(file, logFn) {
    logFn("Abriendo " + file.name + "…");
    let zip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (err) {
      console.error(err);
      logFn("No se pudo abrir el archivo como .zip/.mcpack.", "err");
      return null;
    }

    const jsonPaths = [];
    const texPaths = [];
    zip.forEach((path, entry) => {
      if (entry.dir) return;
      const lower = path.toLowerCase();
      if (lower.endsWith(".json")) jsonPaths.push(path);
      else if (lower.endsWith(".png")) texPaths.push(path);
    });

    // ONLY reads models from a file literally named "geometry.json".
    // If there's more than one, they're never merged: we warn and use
    // whichever sits closest to the root of the pack.
    const basename = (p) => p.split("/").pop().toLowerCase();
    const geometryJsonCandidates = jsonPaths.filter(p => basename(p) === "geometry.json");
    let geometryJsonPath = null;
    if (geometryJsonCandidates.length > 1) {
      geometryJsonCandidates.sort((a, b) => (a.match(/\//g) || []).length - (b.match(/\//g) || []).length);
      geometryJsonPath = geometryJsonCandidates[0];
      logFn(`⚠ Se encontraron ${geometryJsonCandidates.length} archivos "geometry.json" en el pack: ${geometryJsonCandidates.join(" | ")}. SkinGeo Viewer necesita una única fuente de geometría — NO se combinan. Se usa "${geometryJsonPath}" (el más cercano a la raíz) y el resto se ignora por completo.`, "warn");
    } else if (geometryJsonCandidates.length === 1) {
      geometryJsonPath = geometryJsonCandidates[0];
    }
    const otherJsonPaths = jsonPaths.filter(p => p !== geometryJsonPath);

    const allGeo = [];
    const modernFiles = [];
    const discardedModelFiles = [];
    let skinsJson = null;

    if (geometryJsonPath) {
      const raw = await zip.file(geometryJsonPath).async("text");
      const json = repairAndParseJSON(raw);
      if (!json) {
        logFn(`No se pudo leer "${geometryJsonPath}" como JSON válido (ni siquiera tras reparar comas sobrantes).`, "err");
      } else if (Array.isArray(json["minecraft:geometry"])) {
        modernFiles.push(geometryJsonPath);
      } else {
        const fv = json.format_version || "";
        if (fv && fv !== "1.8.0" && fv !== "1.10.0") {
          logFn(`Aviso: "${geometryJsonPath}" declara format_version "${fv}" — se procesa igual, la clasificación 4D/5D se hace por la estructura real de cada modelo.`, "warn");
        }
        const found = normalizeGeometry(json);
        found.forEach(g => allGeo.push(Object.assign({}, g, { sourceFile: geometryJsonPath })));
      }
    } else {
      logFn('El pack no trae ningún archivo llamado exactamente "geometry.json".', "err");
    }

    for (const path of otherJsonPaths) {
      const raw = await zip.file(path).async("text");
      const json = repairAndParseJSON(raw);
      if (!json) continue;

      if (/skins\.json$/i.test(path) && Array.isArray(json.skins)) {
        skinsJson = { path, data: json };
        continue;
      }
      if (Array.isArray(json["minecraft:geometry"])) {
        if (json["minecraft:geometry"].length) modernFiles.push(path);
        continue;
      }
      const found = normalizeGeometry(json);
      if (found.length) {
        discardedModelFiles.push(`${path} (${found.map(g => g.id).join(", ")})`);
      }
    }

    if (discardedModelFiles.length) {
      logFn(`ℹ ${discardedModelFiles.length} archivo(s) además de geometry.json también traen geometrías y se DESCARTAN (solo se usa geometry.json): ${discardedModelFiles.join(" | ")}`, "warn");
    }
    if (modernFiles.length) {
      logFn(`${modernFiles.length} archivo(s) usan el formato 1.12.0+ (${modernFiles.join(", ")}) — no es compatible con este visor y se ignoran.`, "warn");
    }
    if (!allGeo.length) {
      logFn("No se encontró ninguna geometría legacy reconocible en geometry.json.", "err");
      return null;
    }

    // Matching models to textures through skins.json.
    const options = [];
    if (skinsJson) {
      logFn(`skins.json encontrado (${skinsJson.path}): ${skinsJson.data.skins.length} skins.`, "ok");
      skinsJson.data.skins.forEach(entry => {
        const matches = allGeo
          .map((g, i) => ({ g, i }))
          .filter(x => x.g.id === entry.geometry);
        if (!matches.length) {
          logFn(`"${entry.localization_name || entry.geometry}" referencia "${entry.geometry}", que no se encontró en geometry.json.`, "warn");
          return;
        }
        matches.forEach(m => {
          options.push({
            label: `${entry.localization_name || entry.geometry} [${m.g.type}]`,
            geoIndex: m.i,
            textureFile: entry.texture
          });
        });
      });
    }

    const covered = new Set(options.map(o => o.geoIndex));
    allGeo.forEach((g, i) => {
      if (covered.has(i)) return;
      options.push({
        label: `${g.id} [${g.type}]` + (skinsJson ? " (sin nombre en skins.json)" : ""),
        geoIndex: i,
        textureFile: null
      });
    });

    logFn(`${allGeo.length} geometría(s) encontradas en geometry.json — ${summarizeTypes(allGeo)}.`, "ok");

    return { geoData: allGeo, zip, options };
  }

  // Finds and decodes the matched texture inside the zip. Returns a
  // promise that resolves to { url, img }, or null.
  function getTextureFromZip(zip, textureFile, logFn) {
    return new Promise((resolve) => {
      if (!textureFile || !zip) { resolve(null); return; }
      const match = Object.keys(zip.files).find(
        p => p.toLowerCase().endsWith("/" + textureFile.toLowerCase()) ||
             p.toLowerCase() === textureFile.toLowerCase()
      );
      if (!match) {
        logFn(`No se encontró el archivo de textura "${textureFile}" dentro del pack.`, "warn");
        resolve(null);
        return;
      }
      zip.file(match).async("blob").then(blob => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          logFn("Textura emparejada: " + match, "ok");
          resolve({ url, img, blob, path: match });
        };
        img.onerror = () => {
          logFn("La textura emparejada no se pudo decodificar.", "err");
          resolve(null);
        };
        img.src = url;
      });
    });
  }

  return {
    repairAndParseJSON,
    detectGeometryType,
    normalizeGeometry,
    summarizeTypes,
    loadStandaloneGeometry,
    parsePackFile,
    getTextureFromZip
  };
})();
