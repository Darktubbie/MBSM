/* ==========================================================
   Minecraft SkinPack Validator
   fixer.js
   Opt-in automatic repair system
   ========================================================== */


const Fixer = {

    // List of Minecraft Bedrock's official geometries
    officialGeometry: [
        "geometry.humanoid.custom",
        "geometry.humanoid.customSlim",
        "geometry.humanoid",
        "geometry.humanoid.slim"
    ],


    /**
     * Applies only the repairs the user selected
     *
     * options:
     *
     * {
     *   fixJson: true,
     *   syncLocalization: true,
     *   createMissingTexts: true,
     *   syncSkins: true,
     *   removeDuplicatesOrUnused: true
     * }
     */

    async apply(zip, options, report) {

        let changes = [];


        /*
        ==========================================
        JSON repair
        ==========================================
        */

        if(options.fixJson){

            for(let file of Object.keys(zip.files)){

                if(zip.files[file].dir) continue;
                if(!file.endsWith(".json")) continue;


                let content =
                    await zip.files[file].async("string");


                // If it's already valid JSON, leave it alone.
                try{
                    JSON.parse(content);
                    continue;
                }catch(e){}


                let fixed =
                    this.cleanJSON(content);


                try{

                    // Only apply the change if the result is actually
                    // valid JSON; otherwise we'd be overwriting the file
                    // with something half-repaired.
                    JSON.parse(fixed);

                    zip.file(file, fixed);

                    changes.push(
                        `JSON reparado: ${file}`
                    );

                }catch(e){

                    changes.push(
                        `No se pudo reparar automáticamente ${file}: ${e.message}`
                    );

                }

            }
        }



        /*
        ==========================================
        Sincronizar localization_name
        ==========================================
        */

        if(options.syncLocalization){

            await this.syncLocalization(
                zip,
                changes
            );

        }



        /*
        ==========================================
        Crear textos faltantes
        ==========================================
        */

        if(options.createMissingTexts){

            await this.createMissingTexts(
                zip,
                changes
            );

        }



        /*
        ==========================================
        Sincronizar skins (geometry / texture / cape)
        ==========================================
        */

        if(options.syncSkins){

            await this.syncSkins(
                zip,
                changes
            );

        }



        /*
        ==========================================
        Remove duplicate or unused skins
        ==========================================
        */

        if(options.removeDuplicatesOrUnused){

            await this.removeDuplicatesOrUnused(
                zip,
                changes
            );

        }


        return changes;

    },



    /*
    --------------------------------------------------
    Basic JSON cleanup
    --------------------------------------------------
    */

    cleanJSON(text){

        let fixed = text;


        // Strip a BOM at the start of the file
        fixed = fixed.replace(/^\uFEFF/, "");


        // "Smart" (typographic) quotes -> plain quotes
        fixed = fixed
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'");


        // Line comments (// ...) and block comments (/* ... */)
        // (simple heuristic; it doesn't tell whether these are inside a
        // string, but that's a rare case in skins.json)
        fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");
        fixed = fixed.replace(/(^|[^:])\/\/[^\n\r]*/g, "$1");


        // Single quotes 'value' -> double quotes "value"
        fixed = fixed.replace(
            /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
            (m, inner) => `"${inner.replace(/"/g, '\\"')}"`
        );


        // Unquoted keys: identifier: value -> "identifier": value
        fixed = fixed.replace(
            /([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g,
            '$1"$2"$3'
        );


        // Trailing commas before } or ]
        fixed = fixed.replace(/,(\s*[}])/g, "$1");
        fixed = fixed.replace(/,(\s*])/g, "$1");


        // Missing commas between back-to-back objects/arrays: "}{" or "][",
        // a very common mistake when hand-copying skins around.
        fixed = fixed.replace(/}(\s*){/g, "},$1{");
        fixed = fixed.replace(/](\s*)\[/g, "],$1[");
        fixed = fixed.replace(/"(\s*\n\s*)"(?=\s*[:,])/g, '",$1"');


        return fixed;

    },




    /*
    --------------------------------------------------
    Sincronización localization_name
    --------------------------------------------------
    */

    async syncLocalization(zip, changes){


        let skinFile =
            Object.keys(zip.files)
            .find(x =>
                x.endsWith("skins.json")
            );


        if(!skinFile)
            return;



        let skins =
            JSON.parse(
                await zip.files[skinFile]
                .async("string")
            );



        // Specifically look for en_US.lang: it's Minecraft Bedrock's
        // required/primary language.
        let langFile =
            Object.keys(zip.files)
            .find(x =>
                /(^|\/)en_US\.lang$/i.test(x)
            );


        let isNewFile = false;


        if(!langFile){

            // If other .lang files exist, use their same folder; if
            // there are none, create "texts/" right next to wherever
            // skins.json lives (not always at the zip's root): if the pack
            // lives at "skin.zip/persona/skins.json", the result should be
            // "skin.zip/persona/texts/en_US.lang", not "skin.zip/texts/...".
            let skinFolder =
                skinFile.includes("/")
                ? skinFile.substring(0, skinFile.lastIndexOf("/") + 1)
                : "";

            let anyLang =
                Object.keys(zip.files)
                .find(x =>
                    x.includes("texts/")
                    &&
                    x.endsWith(".lang")
                );

            let folder =
                anyLang
                ? anyLang.substring(0, anyLang.lastIndexOf("/") + 1)
                : `${skinFolder}texts/`;

            langFile = `${folder}en_US.lang`;
            isNewFile = true;

            changes.push(
                `Creado archivo ${langFile}`
            );
        }



        let lang =
            isNewFile
            ? ""
            : await zip.files[langFile]
              .async("string");



        let lines =
            lang.length
            ? lang.split(/\r?\n/)
            : [];



        // The PACK's localization_name (top-level in skins.json, next to
        // "serialize_name"). Keys in en_US.lang follow the format
        // skin.<packLocalizationName>.<skinLocalizationName>
        let packName =
            (typeof skins.localization_name === "string" && skins.localization_name.trim())
            ? skins.localization_name.trim()
            : null;



        for(let skin of skins.skins || []){


            let skinName =
                skin.localization_name;


            if(!skinName)
                continue;


            let key =
                packName
                ? `skin.${packName}.${skinName}`
                : `skin.${skinName}`;


            let exists =
                lines.some(
                    l =>
                    l.startsWith(key+"=")
                );


            if(!exists){

                lines.push(
                    `${key}=${skinName}`
                );


                changes.push(
                    `Creada entrada ${key}`
                );

            }

        }



        zip.file(
            langFile,
            lines.join("\n")
        );

    },





    /*
    --------------------------------------------------
    Create missing text files
    --------------------------------------------------
    --------------------------------------------------
    (Kept separate for future translations)
    --------------------------------------------------
    */

    async createMissingTexts(zip, changes){

        // Currently shares its logic
        // with syncLocalization.
        // Kept as a separate method because
        // it'll later support generating:
        // es_ES.lang
        // en_US.lang
        // pt_BR.lang


        await this.syncLocalization(
            zip,
            changes
        );

    },






    /*
    --------------------------------------------------
    Text-similarity utilities (used by "Sync skins")
    --------------------------------------------------
    */

    // Strips the "geometry." prefix and the ".png" extension, lowercases
    // everything, and drops anything that isn't a letter or digit. That
    // way "Egg_Model", "egg.model" and "geometry.egg.model" all get
    // compared on equal footing.
    normalizeForMatch(str){

        return String(str || "")
            .replace(/^geometry\./i, "")
            .replace(/\.png$/i, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

    },


    // Levenshtein distance (minimum number of edits to turn "a" into
    // "b"). Classic two-row implementation.
    levenshtein(a, b){

        const m = a.length, n = b.length;

        if(!m) return n;
        if(!n) return m;

        let prev = new Array(n + 1);
        let curr = new Array(n + 1);

        for(let j = 0; j <= n; j++) prev[j] = j;

        for(let i = 1; i <= m; i++){

            curr[0] = i;

            for(let j = 1; j <= n; j++){

                const cost = a[i - 1] === b[j - 1] ? 0 : 1;

                curr[j] = Math.min(
                    prev[j] + 1,
                    curr[j - 1] + 1,
                    prev[j - 1] + cost
                );

            }

            [prev, curr] = [curr, prev];

        }

        return prev[n];

    },


    // Similarity from 0 (nothing alike) to 1 (identical), after
    // normalizing both strings.
    similarity(a, b){

        const na = this.normalizeForMatch(a);
        const nb = this.normalizeForMatch(b);

        if(!na || !nb) return 0;
        if(na === nb) return 1;

        if(na.includes(nb) || nb.includes(na)){
            const shorter = Math.min(na.length, nb.length);
            const longer = Math.max(na.length, nb.length);
            return 0.75 + 0.25 * (shorter / longer);
        }

        const dist = this.levenshtein(na, nb);
        const maxLen = Math.max(na.length, nb.length);

        return maxLen ? 1 - (dist / maxLen) : 0;

    },


    // Given a list of candidates and one or more search keys, returns
    // the closest-matching candidate, or null if nothing clears the
    // minimum threshold, or if the top two are too close to call (in
    // that case it's safer not to guess).
    bestMatch(candidates, keys, threshold = 0.55, margin = 0.08){

        let best = null, bestScore = 0, second = 0;

        for(const candidate of candidates){

            let score = 0;

            for(const key of keys){
                score = Math.max(score, this.similarity(candidate, key));
            }

            if(score > bestScore){
                second = bestScore;
                bestScore = score;
                best = candidate;
            }else if(score > second){
                second = score;
            }

        }

        if(!best || bestScore < threshold) return null;
        if(second > 0 && bestScore - second < margin) return null;

        return best;

    },



    /*
    --------------------------------------------------
    Sync skins: fixes misspelled "geometry" and "texture"
    references by searching geometry.json and the pack's images
    for the name closest to each skin's localization_name (or
    its current value, if that's a useful hint too). Leaves
    anything already valid alone -- this is a real fix (it
    modifies skins.json), not just a report of what's missing.
    --------------------------------------------------
    */

    async syncSkins(zip, changes){


        let skinFile =
            Object.keys(zip.files)
            .find(x => x.endsWith("skins.json"));


        if(!skinFile)
            return;


        let skins;

        try{
            skins = JSON.parse(
                await zip.files[skinFile].async("string")
            );
        }catch(e){
            return;
        }



        // Available geometries: geometry.json (both formats) + Minecraft's
        // official geometries.
        let geoFile =
            Object.keys(zip.files)
            .find(x => /(^|\/)geometry\.json$/i.test(x));

        let availableGeometry = [];

        if(geoFile){

            try{

                let json = JSON.parse(
                    await zip.files[geoFile].async("string")
                );

                if(json["minecraft:geometry"]){
                    json["minecraft:geometry"].forEach(g => {
                        if(g?.description?.identifier){
                            availableGeometry.push(g.description.identifier);
                        }
                    });
                }

                // Legacy format: top-level keys like
                // "geometry.egg": { ... }
                Object.keys(json).forEach(k => {
                    if(/^geometry\./i.test(k)){
                        availableGeometry.push(k);
                    }
                });

            }catch(e){}

        }

        let availableGeometryLower =
            new Set(availableGeometry.map(id => id.toLowerCase()));

        // Official geometries are valid even if they don't appear in
        // geometry.json, but "syncing" to one of them by name-similarity
        // wouldn't make sense (a plain humanoid model shouldn't get
        // reassigned by accident), so they're only used to decide whether
        // the current geometry is ALREADY valid, never as match candidates.
        this.officialGeometry.forEach(id => availableGeometryLower.add(id.toLowerCase()));



        // Textures available inside the pack.
        let pngFiles =
            Object.keys(zip.files)
            .filter(f => /\.png$/i.test(f) && !zip.files[f].dir)
            .map(f => f.split("/").pop());

        let pngLower =
            new Set(pngFiles.map(p => p.toLowerCase()));


        let modified = false;


        for(let skin of skins.skins || []){

            let name = skin.localization_name || "";


            // ---- geometry ----
            let geoOk =
                skin.geometry &&
                availableGeometryLower.has(skin.geometry.toLowerCase());

            if(!geoOk && availableGeometry.length){

                let keys = [name, skin.geometry || ""].filter(Boolean);
                let match = this.bestMatch(availableGeometry, keys);

                if(match){

                    changes.push(
                        `Skin sincronizada "${name || "(sin nombre)"}": geometry "${skin.geometry || "(vacío)"}" → "${match}" (coincidencia por nombre parecido en geometry.json).`
                    );

                    skin.geometry = match;
                    modified = true;

                }

            }


            // ---- texture ----
            // 1) Does it already match exactly (case included)? Leave it.
            // 2) Does it match once case is ignored? That's a safe,
            //    high-confidence fix: correct it directly, no need for
            //    fuzzy matching.
            // 3) If it doesn't match at all, only then fall back to
            //    matching by similar name (riskier, so it goes last).
            let texExact =
                skin.texture &&
                pngFiles.includes(skin.texture);

            if(!texExact && skin.texture){

                let ciMatch = pngFiles.find(
                    f => f.toLowerCase() === skin.texture.toLowerCase()
                );

                if(ciMatch){

                    changes.push(
                        `Skin sincronizada "${name || "(sin nombre)"}": texture "${skin.texture}" → "${ciMatch}" (coincidían las letras, no las mayúsculas/minúsculas).`
                    );

                    skin.texture = ciMatch;
                    modified = true;

                }

            }

            let texOk =
                skin.texture &&
                pngLower.has(skin.texture.toLowerCase());

            if(!texOk && pngFiles.length){

                let keys = [name, skin.texture || ""].filter(Boolean);
                let match = this.bestMatch(pngFiles, keys);

                if(match){

                    changes.push(
                        `Skin sincronizada "${name || "(sin nombre)"}": texture "${skin.texture || "(vacío)"}" → "${match}" (coincidencia por nombre parecido con una imagen del paquete).`
                    );

                    skin.texture = match;
                    modified = true;

                }

            }


            // ---- cape (optional) ----
            // Same approach as texture, but without fuzzy matching: a
            // cape rarely shares a name with the skin, so guessing by
            // similarity would be unreliable. Only case mismatches get
            // corrected, same as the old "Fix upper/lowercase" used to do.
            if(skin.cape){

                let capeExact = pngFiles.includes(skin.cape);

                if(!capeExact){

                    let ciMatch = pngFiles.find(
                        f => f.toLowerCase() === skin.cape.toLowerCase()
                    );

                    if(ciMatch){

                        changes.push(
                            `Skin sincronizada "${name || "(sin nombre)"}": cape "${skin.cape}" → "${ciMatch}" (coincidían las letras, no las mayúsculas/minúsculas).`
                        );

                        skin.cape = ciMatch;
                        modified = true;

                    }

                }

            }

        }


        if(modified){

            zip.file(
                skinFile,
                JSON.stringify(skins, null, 2)
            );

        }


    },



    /*
    --------------------------------------------------
    Remove duplicate or unused skins
    --------------------------------------------------
    Duplicate: same localization_name already seen before
               (the first occurrence is kept).
    Unused:    the texture the skin points to doesn't
               physically exist inside the pack, so the
               skin could never actually be shown.
    --------------------------------------------------
    */

    async removeDuplicatesOrUnused(zip, changes){


        let skinFile =
            Object.keys(zip.files)
            .find(
                x =>
                x.endsWith("skins.json")
            );


        if(!skinFile)
            return;


        let skins =
            JSON.parse(
                await zip.files[skinFile]
                .async("string")
            );


        let pngFiles =
            Object.keys(zip.files)
            .filter(
                x =>
                /\.png$/i.test(x)
                &&
                !zip.files[x].dir
            );

        let pngNamesLower =
            pngFiles.map(
                p => p.split("/").pop().toLowerCase()
            );


        let seenNames = new Set();
        let kept = [];


        for(let skin of skins.skins || []){


            let name =
                skin.localization_name;


            // Duplicate: this localization_name was already seen
            if(name && seenNames.has(name)){

                changes.push(
                    `Skin repetida removida: ${name}`
                );

                continue;

            }


            // Unused: the texture doesn't exist in the pack
            let textureExists =
                skin.texture
                &&
                pngNamesLower.includes(
                    skin.texture.toLowerCase()
                );


            if(!textureExists){

                changes.push(
                    `Skin no usada removida: ${name || "(sin localization_name)"} (textura "${skin.texture || "(sin textura)"}" no encontrada).`
                );

                continue;

            }


            if(name)
                seenNames.add(name);


            kept.push(skin);

        }


        if(kept.length !== (skins.skins || []).length){

            skins.skins = kept;

            zip.file(
                skinFile,
                JSON.stringify(skins, null, 2)
            );

        }


    }


};