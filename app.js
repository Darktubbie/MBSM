// app.js
// Handles the UI, drag & drop, and loading the ZIP file

let currentZip = null;
let currentZipName = "";
let currentReport = null;

const dropzone = document.getElementById("dropzone");
const zipInput = document.getElementById("zipInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const selectedFile = document.getElementById("selectedFile");
const results = document.getElementById("results");

// ---------- i18n ----------
const I18N = {
  en: {
    nav: {
      home: "Home", validator: "Skins 4D/5D", studio: "Classic Skins", about: "About",
      groupWorkspace: "WORKSPACE", groupViewers: "VIEWERS", groupTools: "TOOLS",
      viewers4d5d: "4D/5D Viewer", classicSkins: "Classic Skins Viewer", validatorTool: "Validator & Fixer",
      maker: "Skinpack Maker", objSkin: "OBJ → Skin 1.8",
      search: "Search", settings: "Settings"
    },
    settings: {
      languageLabel: "Language",
      themeLabel: "Theme"
    },
    topbar: {
      searchPlaceholder: "Search MBSM..."
    },
    home: {
      title: "EVERYTHING YOU NEED FOR MINECRAFT BEDROCK SKINS",
      subtitle: "MBSM is a free toolbox for Minecraft Bedrock skin packs that runs almost entirely in your browser. Pick what you need below.",
      btnValidator: "Check a 4D/5D pack",
      btnStudio: "Open Classic Skins",
      cardValidatorTitle: "Skins 4D/5D",
      cardValidatorText: "Analyze a 4D/5D skin pack for errors, missing files and localization problems, and generate a fixed download.",
      cardStudioTitle: "Classic Skins",
      cardStudioText: "Preview regular skin packs in 3D, or build your own from scratch with the Skinpack Maker.",
      cardAboutTitle: "About",
      cardAboutText: "What MBSM checks, how it works, and why it exists.",
      featuresEyebrow: "ALL THE TOOLS, ONE TOOLBOX",
      featuresTitle: "Everything you need for a healthy pack. Nothing that wastes your time.",
      toolsLabel: "Tools",
      featuresText: "Each module does exactly one thing, and does it well.",
      fcValidatorTag: "VALIDATOR & FIXER",
      fcValidatorTitle: "Catch it, then fix it automatically",
      fcValidatorText: "Checks geometry.json, render controllers and ambiguous or duplicate model names, then auto-resolves the obvious issues — broken references, ambiguities, small details — and flags the rest for you.",
      fcValidatorCaption: "Check and fix skin packs",
      fcViewerTag: "4D/5D VIEWER",
      fcViewerTitle: "See your 4D/5D model before exporting",
      fcViewerText: "Preview bones, cubes and pivots of custom geometries with the skin applied, rotating live — or send 4D models straight to an embedded Blockbench editor.",
      fcViewerCaption: "View and edit models",
      fcClassicViewerTag: "3D VIEWER",
      fcClassicViewerTitle: "Preview your classic skin in 3D",
      fcClassicViewerText: "See a regular Minecraft Bedrock skin applied to the Steve/Alex model, rotating live, before using it in-game.",
      fcClassicViewerCaption: "View and edit classic skins",
      fcMakerTag: "MAKER",
      fcMakerTitle: "Build a pack from scratch",
      fcMakerText: "Generates the full skin pack structure — manifest, geometry and textures — without touching a console.",
      fcMakerCaption: "Create skin packs for Bedrock",
      fcObjSkinTag: "OBJ → SKIN 1.8",
      fcObjSkinTitle: "Turn a 3D model into a working 5D skin",
      fcObjSkinText: "Import an .obj + texture, assign parts to bones, adjust pivots visually, and export a real Bedrock 1.8.0 poly_mesh — ready as a full skin pack.",
      fcObjSkinCaption: "Convert 3D models to skins",
      welcomeGreeting: {
        morning: [
          "Good morning", "Morning!", "Rise and shine", "Good morning — ready to build?",
          "Hope you slept well", "Top of the morning"
        ],
        afternoon: [
          "Good afternoon", "Welcome back", "Hope your day's going well", "Good to see you",
          "Afternoon!", "Great to have you here"
        ],
        evening: [
          "Good evening", "Welcome back", "Evening!", "Hope your day went well",
          "Good to see you again"
        ],
        night: [
          "Burning the midnight oil?", "Still up?", "Late-night session, huh?",
          "Working late?", "Good night... or good morning, almost", "Quiet hours, best hours"
        ]
      },
      welcomeSubtitle: "Minecraft Bedrock Skin Manager",
      versionBadge: "v0.8.1 • Beta",
      statModels: "Models",
      statSkins: "Skins",
      statPacks: "Packs",
      recentTitle: "Recent Projects",
      viewAll: "View All",
      viewLess: "View Less",
      recentEmpty: "No recent projects yet — start by validating a pack or building a skin.",
      recentTypeModel: "Model",
      recentTypeSkin: "Skin",
      recentTypePack: "Pack",
      timeJustNow: "Just now",
      timeMinAgo: (n) => `${n} min ago`,
      timeHoursAgo: (n) => `${n}h ago`,
      timeYesterday: "Yesterday",
      timeDaysAgo: (n) => `${n}d ago`
    },
    changelog: {
      eyebrow: "CHANGELOG",
      title: "What's new in MBSM",
      viewAll: "View all updates",
      badge: {
        patch: "Patch / Bugfix",
        minor: "Minor Update",
        major: "Major Release"
      },
      v081: {
        item1: "Fixed the mobile bottom nav's icons rendering huge on tablet-width screens (a CSS breakpoint gap between the mobile and desktop layouts).",
        item2: "Fixed an invalid/mistyped tool URL (e.g. a typo'd /Validator/) looping endlessly, or landing on Home while leaving the wrong address in the bar and passing it on to every link clicked afterwards.",
        item3: "Added a proper \"Page not found\" screen (at /404/) with a Back to Home button for invalid links, instead of always silently assuming Home."
      },
      v080: {
        item1: "Dashboard cards for the Validator, 4D/5D Viewer and Classic Skins now feature a large model as the main visual, instead of just an icon.",
        item2: "Improved Hero section with a subtle floating model for extra depth.",
        item3: "Redesigned Update Log: obsidian marks Patch/Bugfix releases, amethyst is reserved for future Major Releases, and Minor Updates keep the MBSM icon.",
        item4: "General visual polish across the Dashboard.",
        item5: "Home: removed the duplicated System status card and moved \"View all updates\" under the version badge, next to the latest release's badge.",
        item6: "Sidebar: 4D/5D and Classic Skins are now labeled as viewers (4D/5D Viewer, Classic Skins Viewer).",
        item7: "Each tool now has its own URL (e.g. /Validator/), with support for direct links and browser back/forward navigation.",
        item8: "The Fixer's output ZIP name now matches the page's language (\"_fixed\" in English, \"_corregido\" in Spanish).",
        item9: "The Home greeting now varies and adapts to the device's local time of day.",
        item10: "Home: removed the Quick Actions card (it duplicated the Tools cards below); Skinpack Maker and OBJ → Skin now have a model image too, and the Validator card's static \"Valid\" badge is gone.",
        item11: "Mobile: the bottom nav's Viewers and Tools buttons now open a picker instead of jumping straight to a single tool.",
        item12: "Mobile: the bottom nav's \"Resources\" button (which only ever opened About) is now labeled About.",
        item13: "Mobile: the bottom nav's \"More\" button is now a dedicated Settings sheet (language, theme, GitHub) instead of duplicating the full menu; the redundant hamburger button was removed from mobile."
      },
      v070: {
        item1: "Complete visual redesign: new sidebar, dashboard, an Inspector panel for the 4D/5D viewer, Dark/Light/System themes and refreshed tools throughout.",
        item2: "Several bug fixes across the app."
      }
    },
    perks: {
      eyebrow: "DETAILS THAT MATTER",
      title: "Built by and for skin creators",
      p1Title: "Local by default",
      p1Text: "Validating, fixing, previewing and building skin packs all runs locally in JavaScript — nothing is uploaded anywhere. The one exception: sending a 4D model to the embedded Blockbench Web editor briefly sends that model's data to web.blockbench.net so it can open it.",
      p2Title: "Spanish and English",
      p2Text: "Full interface in both languages, with automatic browser-language detection.",
      p3Title: "Made for 4D and 5D",
      p3Text: "Not a generic validator: it understands custom geometries, extra layers and ambiguous models."
    },
    oss: {
      title: "Open source, as it should be",
      text: "MBSM is built in the open. Report bugs, request features or check the code yourself.",
      btn: "View repository"
    },
    finalCta: {
      eyebrow: "READY?",
      title: "Stop guessing why your skin won't load",
      text: "Open the validator and check your first pack in under a minute.",
      btn: "Get started"
    },
    hero: {
      statusTitle: "System status",
      statusReady: "Everything ready",
      statusUpToDate: "MBSM is up to date",
      statusInstant: "Instant, in your browser",
      statusPrivate: "No files uploaded to any server"
    },
    validator: {
      sectionTitle: "SKINS 4D/5D",
      windowTitle: "VALIDATOR",
      tabIntro: "Everything for 4D/5D Minecraft Bedrock skin packs: validate and automatically fix broken references, missing files or JSON errors, or preview your 5D and 4D models live in 3D without leaving MBSM.",
      dropTitle: "DRAG YOUR SKINPACK",
      dropText: `Accepts
        <strong>.zip</strong>
        and
        <strong>.mcpack</strong>
        Minecraft Bedrock skin pack files.`,
      selectFile: "Select file",
      noFile: "No file selected",
      summary: "Summary",
      statSkins: "Skins detected",
      statErrors: "Errors",
      statWarnings: "Warnings",
      statSuccess: "Passed",
      infoBrowser: "The analysis runs entirely in your browser.",
      infoPrivate: "No file is ever sent to any external server.",
      resultsTitle: "Analysis results",
      analyzeBtn: "Analyze package",
      ambiguousOptionShort: "Auto-resolve geometry ambiguities",
      ambiguousInfoTitle: "What does this do?",
      ambiguousInfoText: `Sometimes the same model name shows up more than once in geometry.json — for example "geometry.Egg" and "geometry.custom.Egg" both existing at the same time. When that happens, MBSM can't be 100% sure which one a skin meant to use. With this OFF, it will flag it as an error so you can check by hand. With this ON, it just picks the first match and moves on — faster, but it could occasionally pick the wrong one.`,
      waitingTitle: "Waiting for a package",
      waitingText: "Select or drag a ZIP or MCPACK file to start the analysis.",
      loadingTitle: "Analyzing package",
      loadingText: "Reading files and checking references...",
      loadingBtn: "Loading...",
      analyzingBtn: "Analyzing...",
      readyTitle: "Package ready to analyze",
      invalidExtTitle: "Unsupported format",
      invalidExtText: "Files must be Minecraft Bedrock skin packs (.zip or .mcpack).",
      invalidExtSelected: "Only .zip or .mcpack files are allowed.",
      notPackTitle: "Incompatible package",
      notPackText: `Must be a compatible Minecraft Bedrock skin pack (skins.json is required, and a "skin_pack" module if manifest.json is present).`,
      notPackSelected: "The file doesn't look like a Minecraft Bedrock skin pack.",
      invalidFileTitle: "Invalid file",
      invalidFileText: "The selected file couldn't be opened correctly.",
      invalidFileSelected: "Couldn't open the file.",
      internalErrorTitle: "Internal error",
      internalErrorText: "Something went wrong during the package analysis.",
      needPackAlert: "Load a skinpack first.",
      subValidator: "Validator"
    },
    sg: {
      subViewer: "4D/5D Viewer",
      subObjSkin: "OBJ → Skin 1.8",
      tabIntro: "Live 3D preview for 4D/5D geometries: 5D models (poly_mesh) render directly here, 4D models (cubes) open in an embedded Blockbench Web editor, all without leaving MBSM.",
      windowTitle: "4D/5D VIEWER",
      fieldPack: "Full pack (optional)",
      dzPackHint: ".zip / .mcpack — reads geometry.json (4D+5D) and pairs textures via skins.json",
      fieldGeo: "Geometry (.geo.json)",
      dzGeoHint: "Legacy format — detects 4D/5D per model",
      fieldTex: "Texture (.png)",
      dzTexHint: "PNG, any size that's a multiple of 64",
      fieldModel: "Detected model",
      statBones: "Bones",
      statCubes: "Cubes / Polys",
      inspectorTitle: "MODEL",
      inspectorDisplay: "DISPLAY",
      appearanceTitle: "APPEARANCE",
      appearanceBg: "Background",
      toggleSpin: "Auto-rotate",
      toggleWire: "Wireframe",
      toggleGrid: "Floor / grid",
      togglePivots: "Show pivots",
      btnReset: "Frame model (5D only)",
      fieldLog: "Log",
      logWaiting: "Waiting for files…",
      emptyTitle: "Nothing to render yet",
      emptyText: "Upload a .zip/.mcpack pack, or a loose geometry + texture, to see the 3D model (5D) or the embedded Blockbench editor (4D).",
      tagMixed: "MIXED",
      tagEmpty: "EMPTY",
      bbTogglePanel: "Minimize/expand this panel",
      bbExpandPanel: "Expand this panel",
      bbCollapsePanel: "Minimize this panel",
      bbLoadingFrame: "Loading Blockbench Web inside the panel…",
      bbFrameReady: "Blockbench Web ready.",
      bbCheckingEmbed: "Checking whether Blockbench Web can be embedded before loading the model…",
      bbBlockedStatus: "⚠ web.blockbench.net can't be embedded inside MBSM (its server is blocking embedding via X-Frame-Options or CSP). This can't be worked around from the browser without the remote server's cooperation — it isn't a bug in MBSM.",
      bbBlockedInstructions: "<p>As an alternative, the files are prepared anyway so you can open them yourself in Blockbench, without losing your place in MBSM:</p>",
      bbUrlSent: (id) => `Geometry "${id}" [4D] sent to Blockbench by URL.`,
      bbSuspectedFail: (id, ms) => `⚠ Geometry "${id}" [4D] was sent by URL, but the panel "finished loading" in just ${ms} ms — too fast for a real Blockbench startup. The server likely rejected the URL for being too long (something like "414 URI Too Long"). This can't be confirmed for certain from here (there's no way to read the actual response of a cross-origin iframe), so check the panel on the right: if it's black/blank or shows an error, use the manual download below.`,
      bbDownloadGeo: (name) => `⬇ Download geometry (${name})`,
      bbDownloadTex: (name) => `⬇ Download texture (${name})`,
      bbNoTexture: "No texture paired in skins.json for this model — only the geometry is prepared.",
      bbReopenHint: "Download these files and open them with Ctrl+O (or Blockbench's menu) from wherever web.blockbench.net does load — the embedding block doesn't depend on MBSM.",
      bbTooLargeStatus: (id) => `Geometry "${id}" [4D] is too large to send by URL (Blockbench rejects it). It was prepared as a file to open inside the panel without that limit.`,
      bbFileInstructionsHtml: `
        <p><strong>How to load it without leaving the panel:</strong></p>
        <ol>
          <li>Download the geometry file below (and the texture, if it appears).</li>
          <li>Click inside the Blockbench panel on the right and use <em>File → Open</em> to open the downloaded file.</li>
          <li>Select the downloaded <code>.geo.json</code>. Blockbench opens it without going through the URL, so there's no size limit.</li>
          <li>With the model open, add the downloaded texture (drag it onto the canvas or use <em>Textures → Add Texture</em>). Blockbench will assign it using the UV the geometry already carries (texturewidth/textureheight, per-face UV, mirror, inflate — all of that travels intact inside the .geo.json, none of it depends on the URL).</li>
        </ol>
      `,
      bbSafetyNetIntro: (id) => `The geometry "${id}" was sent to Blockbench by URL.`,
      bbSafetyNetTextureNote: "Blockbench Web doesn't support receiving geometry and texture at the same time by URL, so the texture needs to be added inside the panel.",
      bbSafetyNetWarningHtml: `⚠ If the Blockbench panel stays black, blank, or shows an error like <code>"Error: URI Too Long"</code>, this model was actually too large for Blockbench's server to accept by URL — that limit is set by their server and this page can't verify it from here. Use the buttons below to download it yourself and open it inside the panel with <code>Ctrl+O</code> (then drag in the texture afterwards).`
    },
    objskin: {
      windowTitle: "OBJ → SKIN STUDIO",
      intro: "Import a 3D model (.obj) exported from Blender or another program, assign its parts to a skeleton's bones, position pivots visually, and export a real Bedrock 1.8.0 geometry (poly_mesh) — ready as a full skin pack (manifest.json, skins.json, lang and textures included)."
    },
    fix: {
      title: "Available fixes",
      subtitle: "Select the repairs you want to apply.",
      jsonTitle: "Repair JSON",
      jsonDesc: "Fixes common syntax errors (trailing commas, etc.)",
      locTitle: "Sync localization_name",
      locDesc: "Links each skin to its entry in texts/.lang",
      textsTitle: "Create missing text entries",
      textsDesc: "Generates missing entries in language files",
      syncTitle: "Sync skins",
      syncDesc: "Fixes wrong upper/lowercase and misspelled model/texture references by matching real file names",
      syncInfoTitle: "What does this do?",
      syncInfoText: `If a skin's "texture", "cape" or "geometry" field doesn't match a real file — wrong upper/lowercase (like "Egg.png" vs "egg.png"), or misspelled/slightly wrong (say skins.json points to "egg_model" but geometry.json actually has "egg_modle") — this looks through geometry.json and the images in the pack for the closest matching name and fixes the reference automatically. It won't touch anything that's already correct.`,
      dupTitle: "Remove duplicate or unused skins",
      dupDesc: "Removes duplicates and skins whose texture doesn't exist",
      repairBtn: "Create fixed ZIP",
      repairing: "Building fixed package...",
      repairError: "Something went wrong while building the fixed package. Check the console for details.",
      fixedSuffix: "_fixed"
    },
    notfound: {
      title: "Page not found",
      text: "There's no tool at this address — it may be mistyped, or the link is outdated.",
      backHome: "Back to Home"
    },
    about: {
      title: "ABOUT MBSM",
      toolsTitle: "WHAT'S INSIDE MBSM",
      p1: `MBSM is a free toolbox for
        <strong>Minecraft Bedrock</strong>
        skin packs that runs almost entirely in your browser: a validator
        for 4D/5D packs with custom geometries, a 3D skin viewer, a 4D/5D
        viewer with an embedded Blockbench Web editor, an OBJ → Skin 1.8
        converter that turns a 3D model into a working 5D skin pack, and a
        skin pack builder. The only thing that ever leaves your browser is a
        4D model's data when you send it to that embedded Blockbench editor —
        everything else stays local.`,
      p2: "The goal is to catch exactly the mistakes that usually make a skin not show up in-game, a model fail to load, or textures break — and to make building a pack from scratch simple."
    },
    checks: {
      sectionTitle: "WHAT THE VALIDATOR CHECKS",
      geoTitle: "Geometries",
      geoText: `Verifies that the identifiers used in
        <strong>skins.json</strong>
        actually exist in
        <strong>geometry.json</strong>.`,
      texTitle: "Textures",
      texText: "Checks that every image referenced by a skin physically exists inside the package and detects upper/lowercase mismatches.",
      langTitle: "Texts / Lang",
      langText: `Checks that every
        <strong>localization_name</strong>
        has its matching entry in
        <strong>texts/.lang</strong>
        and detects missing or extra keys.`,
      manifestTitle: "Manifest",
      manifestText: `Validates
        <strong>UUID</strong>,
        <strong>format_version</strong>,
        present modules and other common issues in
        <strong>manifest.json</strong>.`,
      jsonTitle: "JSON",
      jsonText: "Detects JSON files with syntax errors and shows the approximate location of the problem whenever possible.",
      consTitle: "Consistency",
      consText: "Compares names, paths, duplicate references and overall consistency across every file in the skinpack."
    },
    footer: { text: "Made for the Minecraft Bedrock community" },
    studio: {
      sectionTitle: "CLASSIC SKINS",
      tabIntro: "Preview regular Minecraft Bedrock skin packs in 3D, or build your own pack from scratch.",
      subViewer: "Skin Viewer",
      subMaker: "Skinpack Maker",
      windowTitleViewer: "VIEWER",
      windowTitleMaker: "MAKER"
    },
    viewer: {
      sectionTitle: "SKIN PACK VIEWER",
      intro: "Load a regular (non-4D) Minecraft Bedrock skin pack to see each skin's texture and preview it in 3D on its Steve or Alex model.",
      dropTitle: "DRAG YOUR SKIN PACK",
      dropText: `Accepts
        <strong>.zip</strong>
        and
        <strong>.mcpack</strong>
        Minecraft Bedrock skin pack files.`,
      modelSteve: "Steve (Wide)",
      modelAlex: "Alex (Slim)",
      viewTexture: "View texture",
      view3D: "View in 3D",
      noTexture: "Texture not found in the package.",
      notASkinPack: "This file doesn't look like a Minecraft Bedrock skin pack.",
      noSkins: "No skins were found in this package.",
      loading: "Loading package..."
    },
    maker: {
      intro: "Build a regular Minecraft Bedrock skin pack: import skins, choose their model, and download a ready-to-install .mcpack.",
      addSkinTitle: "Add a skin",
      importUpload: "Upload PNG",
      importUsername: "Username",
      chooseImage: "Choose image",
      uploadHint: "Accepts 64x64, 64x32 (legacy) and 128x128 skins.",
      invalidDimensions: "That doesn't look like a Minecraft skin (expected 64x64, 64x32, or 128x128).",
      platformJava: "Java",
      platformBedrock: "Bedrock",
      usernamePlaceholder: "Notch",
      importBtn: "Import",
      usernameHintJava: "Fetches the current skin of a Minecraft Java Edition account.",
      usernameHintBedrock: "Fetches the skin of a Bedrock/Xbox gamertag, if it's been seen on a Geyser server before.",
      skinsInPack: "Skins in this pack",
      noSkinsYet: "No skins added yet.",
      skinName: "Name",
      skinModel: "Model",
      remove: "Remove",
      packSettings: "Pack settings",
      packName: "Pack name",
      packNamePlaceholder: "My Skin Pack",
      packDescription: "Description (optional)",
      packDescPlaceholder: "A collection of custom skins",
      colorsLabel: "Colors",
      formatLabel: "Format",
      codesHint: "Click a field above, then tap a color or format to insert it there. You can also type & instead of § (e.g. &c) if that's easier.",
      packIcon: "Pack icon (optional)",
      chooseIcon: "Choose icon",
      generateBtn: "Download skin pack",
      stepAdd: "Add skins",
      stepManage: "Manage pack",
      stepSettings: "Pack settings",
      stepExport: "Export",
      importing: "Importing...",
      importOk: 'Added "{name}".',
      importFailGeneric: "Couldn't import that image.",
      needUsername: "Type a username first.",
      importFailUsernameJava: "Couldn't find a Java skin for that username. Check the spelling — some sources take a minute to update after a skin change.",
      importFailUsernameBedrock: "Couldn't find a Bedrock skin for that gamertag. This only works if the account has joined a Geyser server before.",
      needSkins: "Add at least one skin first.",
      needName: "Give the pack a name first.",
      generating: "Building pack...",
      generateError: "Something went wrong while building the pack. Check the console for details.",
      defaultSkinName: "Skin",
      colorBlack: "Black", colorDarkBlue: "Dark Blue", colorDarkGreen: "Dark Green",
      colorDarkAqua: "Dark Aqua", colorDarkRed: "Dark Red", colorDarkPurple: "Dark Purple",
      colorGold: "Gold", colorGray: "Gray", colorDarkGray: "Dark Gray",
      colorBlue: "Blue", colorGreen: "Green", colorAqua: "Aqua",
      colorRed: "Red", colorLightPurple: "Light Purple", colorYellow: "Yellow",
      colorWhite: "White", colorMinecoinGold: "Minecoin Gold", colorQuartz: "Material Quartz",
      colorIron: "Material Iron", colorNetherite: "Material Netherite",
      colorRedstone: "Material Redstone", colorCopper: "Material Copper",
      colorGoldMaterial: "Material Gold", colorEmerald: "Material Emerald",
      colorDiamond: "Material Diamond", colorLapis: "Material Lapis",
      colorAmethyst: "Material Amethyst",
      formatBold: "Bold", formatItalic: "Italic",
      formatObfuscated: "Obfuscated (scrambles the text)", formatReset: "Reset formatting"
    },
    js: {
      skinsPreviewTitle: "👕 Detected skins",
      skinPreviewMissingLang: "(no name in lang)",
      rowName: "Name:",
      rowModel: "Model:",
      rowCape: "Cape:",
      animationsLabel: "Animations",
      defaultPackDescription: "4D skin pack"
    }
  },
  es: {
    nav: {
      home: "Inicio", validator: "Skins 4D/5D", studio: "Skins Clásicas", about: "Acerca de",
      groupWorkspace: "ESPACIO", groupViewers: "VISORES", groupTools: "HERRAMIENTAS",
      viewers4d5d: "Visor 4D/5D", classicSkins: "Visor de Skins Clásicas", validatorTool: "Validador & Fixer",
      maker: "Creador de Skinpacks", objSkin: "OBJ → Skin 1.8",
      search: "Buscar", settings: "Ajustes"
    },
    settings: {
      languageLabel: "Idioma",
      themeLabel: "Tema"
    },
    topbar: {
      searchPlaceholder: "Buscar en MBSM..."
    },
    home: {
      title: "TODO LO QUE NECESITAS PARA SKINS DE MINECRAFT BEDROCK",
      subtitle: "MBSM es una caja de herramientas gratuita para skinpacks de Minecraft Bedrock que funciona casi por completo en tu navegador. Elige lo que necesites abajo.",
      btnValidator: "Revisar un pack 4D/5D",
      btnStudio: "Abrir Skins Clásicas",
      cardValidatorTitle: "Skins 4D/5D",
      cardValidatorText: "Analiza un skinpack 4D/5D en busca de errores, archivos faltantes y problemas de localización, y genera una descarga corregida.",
      cardStudioTitle: "Skins Clásicas",
      cardStudioText: "Previsualiza skinpacks normales en 3D, o crea el tuyo desde cero con el Skinpack Maker.",
      cardAboutTitle: "Acerca de",
      cardAboutText: "Qué revisa MBSM, cómo funciona, y por qué existe.",
      featuresEyebrow: "TODAS LAS HERRAMIENTAS, UNA CAJA",
      featuresTitle: "Todo lo que necesitas para un pack sano. Nada que te haga perder tiempo.",
      toolsLabel: "Herramientas",
      featuresText: "Cada módulo hace exactamente una cosa, y la hace bien.",
      fcValidatorTag: "VALIDADOR & FIXER",
      fcValidatorTitle: "Encuéntralo y corrígelo automáticamente",
      fcValidatorText: "Revisa geometry.json, render controllers y nombres de modelo duplicados o ambiguos, y luego corrige solo lo evidente — referencias rotas, ambigüedades, detalles menores — señalando el resto para que decidas tú.",
      fcValidatorCaption: "Valida y corrige skin packs",
      fcViewerTag: "VISOR 4D/5D",
      fcViewerTitle: "Mira tu modelo 4D/5D antes de exportar",
      fcViewerText: "Previsualiza huesos, cubos y pivotes de geometrías personalizadas con la skin aplicada, girando en vivo — o envía modelos 4D directo a un editor Blockbench integrado.",
      fcViewerCaption: "Mira y edita modelos",
      fcClassicViewerTag: "VISOR 3D",
      fcClassicViewerTitle: "Previsualiza tu skin clásica en 3D",
      fcClassicViewerText: "Mira una skin normal de Minecraft Bedrock aplicada al modelo Steve/Alex, girando en vivo, antes de usarla en el juego.",
      fcClassicViewerCaption: "Mira y edita skins clásicas",
      fcMakerTag: "CONSTRUCTOR",
      fcMakerTitle: "Arma un pack desde cero",
      fcMakerText: "Genera la estructura completa de un skin pack — manifest, geometría y texturas — sin tocar una consola.",
      fcMakerCaption: "Crea skin packs para Bedrock",
      fcObjSkinTag: "OBJ → SKIN 1.8",
      fcObjSkinTitle: "Convierte un modelo 3D en una skin 5D funcional",
      fcObjSkinText: "Importa un .obj + textura, asigna las partes a los huesos, ajusta los pivotes visualmente, y exporta una geometría real Bedrock 1.8.0 (poly_mesh) — lista como paquete de skin completo.",
      fcObjSkinCaption: "Convierte modelos 3D en skins",
      welcomeGreeting: {
        morning: [
          "Buenos días", "¡Buen día!", "Arriba con energía", "Buenos días, ¿listos para crear?",
          "Espero que hayas dormido bien", "Buen comienzo de día"
        ],
        afternoon: [
          "Buenas tardes", "Bienvenido de nuevo", "Espero que tu día vaya bien", "Qué gusto verte",
          "¡Buena tarde!", "Un gusto tenerte por aquí"
        ],
        evening: [
          "Buenas noches", "Bienvenido de nuevo", "¡Buenas!", "Espero que tu día haya ido bien",
          "Qué bueno verte otra vez"
        ],
        night: [
          "¿Trasnochando?", "¿Sigues despierto?", "Sesión nocturna, ¿eh?",
          "Trabajando hasta tarde", "Buenas noches... o casi buenos días", "Las horas tranquilas son las mejores"
        ]
      },
      welcomeSubtitle: "Minecraft Bedrock Skin Manager",
      versionBadge: "v0.8.1 • Beta",
      statModels: "Modelos",
      statSkins: "Skins",
      statPacks: "Packs",
      recentTitle: "Proyectos recientes",
      viewAll: "Ver todo",
      viewLess: "Ver menos",
      recentEmpty: "Aún no hay proyectos recientes — empieza validando un pack o creando una skin.",
      recentTypeModel: "Modelo",
      recentTypeSkin: "Skin",
      recentTypePack: "Pack",
      timeJustNow: "Ahora mismo",
      timeMinAgo: (n) => `hace ${n} min`,
      timeHoursAgo: (n) => `hace ${n}h`,
      timeYesterday: "Ayer",
      timeDaysAgo: (n) => `hace ${n}d`
    },
    changelog: {
      eyebrow: "REGISTRO DE CAMBIOS",
      title: "Novedades de MBSM",
      viewAll: "Ver todas las actualizaciones",
      badge: {
        patch: "Parche / Corrección",
        minor: "Actualización menor",
        major: "Lanzamiento mayor"
      },
      v081: {
        item1: "Se corrigió que los íconos de la barra inferior móvil se vieran gigantes en pantallas de ancho tipo tablet (un hueco entre los breakpoints de móvil y escritorio).",
        item2: "Se corrigió que una URL de herramienta inválida o mal escrita (por ejemplo, un /Validator/ con typo) hiciera un loop infinito, o mandara a Home dejando la dirección incorrecta en la barra y arrastrándola a cada enlace que se tocara después.",
        item3: "Se agregó una pantalla propia de \"Página no encontrada\" (en /404/) con un botón para volver al inicio, en vez de asumir siempre Home en silencio."
      },
      v080: {
        item1: "Las cards del Validador, el Visor 4D/5D y Classic Skins ahora muestran un modelo grande como elemento visual principal, en vez de solo un icono.",
        item2: "Hero Section mejorada con un modelo flotante sutil que le da más profundidad.",
        item3: "Rediseño del Update Log: la obsidiana marca los lanzamientos de tipo Patch/Bugfix, la amatista queda reservada para futuras Major Releases, y las Minor Updates conservan el icono de MBSM.",
        item4: "Pulido visual general en el Dashboard.",
        item5: "Home: se quitó la tarjeta duplicada de \"System status\" y \"Ver todas las actualizaciones\" se movió debajo del badge de versión, junto al badge de la última versión.",
        item6: "Sidebar: 4D/5D y Classic Skins ahora se etiquetan como visores (Visor 4D/5D, Visor de Skins Clásicas).",
        item7: "Cada herramienta ahora tiene su propia URL (por ejemplo /Validator/), con soporte para enlaces directos y navegación con atrás/adelante del navegador.",
        item8: "El nombre del ZIP corregido que genera el Fixer ahora sigue el idioma de la página (\"_fixed\" en inglés, \"_corregido\" en español).",
        item9: "El saludo de la Home ahora varía y se adapta a la hora local del dispositivo.",
        item10: "Home: se quitó la tarjeta de Acciones Rápidas (duplicaba las cards de Tools de más abajo); Creador de Skinpacks y OBJ → Skin ahora también tienen imagen, y se quitó el badge fijo \"Válido\" de la card del Validador.",
        item11: "Móvil: los botones Viewers y Tools de la barra inferior ahora abren un selector en vez de saltar directo a una sola herramienta.",
        item12: "Móvil: el botón \"Resources\" de la barra inferior (que solo llevaba a About) ahora se llama About.",
        item13: "Móvil: el botón \"More\" de la barra inferior ahora es una hoja de Ajustes (idioma, tema, GitHub) en vez de duplicar el menú completo; se quitó el botón de hamburguesa, ya redundante en móvil."
      },
      v070: {
        item1: "Rediseño visual completo: nueva sidebar, dashboard, panel Inspector en el visor 4D/5D, temas Oscuro/Claro/Sistema y herramientas renovadas en toda la app.",
        item2: "Varias correcciones de errores en la app."
      }
    },
    perks: {
      eyebrow: "DETALLES QUE IMPORTAN",
      title: "Pensado por y para creadores de skins",
      p1Title: "Local por defecto",
      p1Text: "Validar, reparar, previsualizar y crear skin packs corre todo localmente en JavaScript — no se sube nada a ningún lado. La única excepción: al enviar un modelo 4D al editor Blockbench Web integrado, los datos de ese modelo se envían brevemente a web.blockbench.net para que pueda abrirlo.",
      p2Title: "Español e inglés",
      p2Text: "Interfaz completa en ambos idiomas, con detección automática del idioma del navegador.",
      p3Title: "Pensado para 4D y 5D",
      p3Text: "No es un validador genérico: entiende geometrías personalizadas, capas extra y modelos ambiguos."
    },
    oss: {
      title: "Código abierto, como debe ser",
      text: "MBSM se construye en público. Reporta errores, pide funciones o revisa el código tú mismo.",
      btn: "Ver repositorio"
    },
    finalCta: {
      eyebrow: "¿LISTO?",
      title: "Deja de adivinar por qué tu skin no carga",
      text: "Abre el validador y revisa tu primer pack en menos de un minuto.",
      btn: "Empezar"
    },
    hero: {
      statusTitle: "Estado del sistema",
      statusReady: "Todo listo",
      statusUpToDate: "MBSM está actualizado",
      statusInstant: "Instantáneo, en tu navegador",
      statusPrivate: "Ningún archivo se sube a un servidor"
    },
    validator: {
      sectionTitle: "SKINS 4D/5D",
      windowTitle: "VALIDADOR",
      tabIntro: "Todo para skinpacks 4D/5D de Minecraft Bedrock: valida y repara automáticamente referencias rotas, archivos faltantes o errores de JSON, o previsualiza tus modelos 5D y 4D en 3D en vivo sin salir de MBSM.",
      dropTitle: "ARRASTRA TU SKINPACK",
      dropText: `Admite archivos
        <strong>.zip</strong>
        y
        <strong>.mcpack</strong>
        de skins de Minecraft Bedrock.`,
      selectFile: "Seleccionar archivo",
      noFile: "Ningún archivo seleccionado",
      summary: "Resumen",
      statSkins: "Skins detectadas",
      statErrors: "Errores",
      statWarnings: "Advertencias",
      statSuccess: "Correctos",
      infoBrowser: "El análisis se ejecuta completamente en tu navegador.",
      infoPrivate: "Ningún archivo es enviado a servidores externos.",
      resultsTitle: "Resultados del análisis",
      analyzeBtn: "Analizar paquete",
      ambiguousOptionShort: "Resolver ambigüedades de geometría automáticamente",
      ambiguousInfoTitle: "¿Qué hace esto?",
      ambiguousInfoText: `A veces el mismo nombre de modelo aparece más de una vez en geometry.json — por ejemplo "geometry.Egg" y "geometry.custom.Egg" existiendo al mismo tiempo. Cuando eso pasa, MBSM no puede estar 100% seguro de cuál quiso usar la skin. Con esto DESACTIVADO, se marcará como error para que lo revises a mano. Con esto ACTIVADO, simplemente elige la primera coincidencia y continúa — más rápido, pero podría elegir la incorrecta alguna vez.`,
      waitingTitle: "Esperando un paquete",
      waitingText: "Selecciona o arrastra un archivo ZIP o MCPACK para comenzar el análisis.",
      loadingTitle: "Analizando paquete",
      loadingText: "Leyendo archivos y comprobando referencias...",
      loadingBtn: "Cargando...",
      analyzingBtn: "Analizando...",
      readyTitle: "Paquete listo para analizar",
      invalidExtTitle: "Formato no compatible",
      invalidExtText: "Deben ser paquetes de skins de Minecraft Bedrock (.zip o .mcpack).",
      invalidExtSelected: "Solo se permiten archivos .zip o .mcpack.",
      notPackTitle: "Paquete no compatible",
      notPackText: `Deben ser skins de Minecraft Bedrock compatibles (se requiere skins.json y, si hay manifest.json, un módulo de tipo "skin_pack").`,
      notPackSelected: "El archivo no parece ser un skinpack de Minecraft Bedrock.",
      invalidFileTitle: "Archivo inválido",
      invalidFileText: "El archivo seleccionado no pudo abrirse correctamente.",
      invalidFileSelected: "No se pudo abrir el archivo.",
      internalErrorTitle: "Error interno",
      internalErrorText: "Ocurrió un problema durante el análisis del paquete.",
      needPackAlert: "Primero carga un skinpack.",
      subValidator: "Validador"
    },
    sg: {
      subViewer: "Visor 4D/5D",
      subObjSkin: "OBJ → Skin 1.8",
      tabIntro: "Vista previa 3D en vivo para geometrías 4D/5D: los modelos 5D (poly_mesh) se renderizan aquí mismo, los modelos 4D (cubes) se abren en un editor Blockbench Web integrado, todo sin salir de MBSM.",
      windowTitle: "VISOR 4D/5D",
      fieldPack: "Pack completo (opcional)",
      dzPackHint: ".zip / .mcpack — lee geometry.json (4D+5D) y empareja texturas vía skins.json",
      fieldGeo: "Geometría (.geo.json)",
      dzGeoHint: "Formato legacy — detecta 4D/5D por modelo",
      fieldTex: "Textura (.png)",
      dzTexHint: "PNG, cualquier tamaño múltiplo de 64",
      fieldModel: "Modelo detectado",
      statBones: "Huesos",
      statCubes: "Cubos / Polys",
      inspectorTitle: "MODELO",
      inspectorDisplay: "VISTA",
      appearanceTitle: "APARIENCIA",
      appearanceBg: "Fondo",
      toggleSpin: "Auto-rotar",
      toggleWire: "Wireframe",
      toggleGrid: "Piso / cuadrícula",
      togglePivots: "Mostrar pivotes",
      btnReset: "Encuadrar modelo (solo 5D)",
      fieldLog: "Registro",
      logWaiting: "Esperando archivos…",
      emptyTitle: "Todavía no hay nada que renderizar",
      emptyText: "Sube un pack .zip/.mcpack, o una geometría + textura por separado, para ver el modelo en 3D (5D) o en el editor Blockbench integrado (4D).",
      tagMixed: "MIXTO",
      tagEmpty: "VACÍO",
      bbTogglePanel: "Minimizar/expandir este panel",
      bbExpandPanel: "Expandir este panel",
      bbCollapsePanel: "Minimizar este panel",
      bbLoadingFrame: "Cargando Blockbench Web dentro del panel…",
      bbFrameReady: "Blockbench Web listo.",
      bbCheckingEmbed: "Comprobando si Blockbench Web puede embeberse antes de cargar el modelo…",
      bbBlockedStatus: "⚠ web.blockbench.net no se puede embeber dentro de MBSM (su servidor está bloqueando el embebido, vía X-Frame-Options o CSP). Esto no se puede evitar desde el navegador sin cooperación del servidor remoto — no es un fallo de MBSM.",
      bbBlockedInstructions: "<p>Como alternativa, se preparan los archivos igualmente para que los abras tú mismo en Blockbench, sin perder tu sitio en MBSM:</p>",
      bbUrlSent: (id) => `Geometría "${id}" [4D] enviada a Blockbench por URL.`,
      bbSuspectedFail: (id, ms) => `⚠ La geometría "${id}" [4D] se envió por URL, pero el panel "terminó de cargar" en solo ${ms} ms — demasiado rápido para ser un arranque real de Blockbench. Es probable que el servidor haya rechazado la URL por ser demasiado larga (algo como "414 URI Too Long"). No se puede confirmar desde aquí con certeza (no hay forma de leer la respuesta real de un iframe de otro origen), así que revisa el panel de la derecha: si está en negro/blanco o muestra un error, usa la descarga manual de abajo.`,
      bbDownloadGeo: (name) => `⬇ Descargar geometría (${name})`,
      bbDownloadTex: (name) => `⬇ Descargar textura (${name})`,
      bbNoTexture: "No hay textura emparejada en skins.json para este modelo — solo se prepara la geometría.",
      bbReopenHint: "Descarga estos archivos y ábrelos con Ctrl+O (o el menú de Blockbench) desde donde web.blockbench.net sí cargue — el bloqueo de embebido no depende de MBSM.",
      bbTooLargeStatus: (id) => `Geometría "${id}" [4D] es demasiado grande para enviarla por URL (Blockbench la rechaza). Se preparó como archivo para abrir dentro del panel sin ese límite.`,
      bbFileInstructionsHtml: `
        <p><strong>Cómo cargarla sin salir del panel:</strong></p>
        <ol>
          <li>Descarga el archivo de geometría de abajo (y la textura, si aparece).</li>
          <li>Haz clic dentro del panel de Blockbench de la derecha y usa <em>File → Open</em> para abrir el archivo descargado.</li>
          <li>Selecciona el <code>.geo.json</code> descargado. Blockbench lo abre sin pasar por la URL, así que no hay límite de tamaño.</li>
          <li>Con el modelo abierto, añade la textura descargada (arrástrala sobre el lienzo o usa <em>Textures → Add Texture</em>). Blockbench la asignará usando el UV que ya trae la geometría (texturewidth/textureheight, UV por cara, mirror, inflate — todo eso viaja intacto dentro del .geo.json, no depende de la URL).</li>
        </ol>
      `,
      bbSafetyNetIntro: (id) => `La geometría "${id}" se envió a Blockbench por URL.`,
      bbSafetyNetTextureNote: "Blockbench Web no admite recibir geometría y textura a la vez por URL, así que la textura hay que añadirla dentro del panel.",
      bbSafetyNetWarningHtml: `⚠ Si el panel de Blockbench se queda en negro, en blanco, o muestra un texto de error como <code>"Error: URI Too Long"</code>, es que este modelo era, en realidad, demasiado grande para que el servidor de Blockbench lo aceptara por URL — ese límite lo impone su servidor y esta página no puede comprobarlo desde aquí. Usa los botones de abajo para descargarlo tú mismo y ábrelo dentro del panel con <code>Ctrl+O</code> (y arrastra la textura después).`
    },
    objskin: {
      windowTitle: "OBJ → SKIN STUDIO",
      intro: "Importa un modelo 3D (.obj) exportado desde Blender u otro programa, asigna sus partes a los huesos de un esqueleto, posiciona los pivotes visualmente, y exporta una geometría real Bedrock 1.8.0 (poly_mesh) — lista como paquete de skin completo (manifest.json, skins.json, lang y texturas incluidos)."
    },
    fix: {
      title: "Correcciones disponibles",
      subtitle: "Selecciona las reparaciones que quieres aplicar.",
      jsonTitle: "Reparar JSON",
      jsonDesc: "Corrige errores comunes de sintaxis (comas sobrantes, etc.)",
      locTitle: "Sincronizar localization_name",
      locDesc: "Vincula cada skin con su entrada en texts/.lang",
      textsTitle: "Crear textos faltantes",
      textsDesc: "Genera entradas faltantes en los archivos de idioma",
      syncTitle: "Sincronizar skins",
      syncDesc: "Corrige mayúsculas/minúsculas incorrectas y referencias de modelo/textura mal escritas buscando el nombre real del archivo",
      syncInfoTitle: "¿Qué hace esto?",
      syncInfoText: `Si el campo "texture", "cape" o "geometry" de una skin no coincide con un archivo real — ya sea por mayúsculas/minúsculas (como "Egg.png" contra "egg.png"), o por estar mal escrito/ligeramente incorrecto (por ejemplo skins.json apunta a "egg_model" pero geometry.json en realidad tiene "egg_modle") — esto revisa geometry.json y las imágenes del paquete en busca del nombre más parecido y corrige la referencia automáticamente. No toca nada que ya esté correcto.`,
      dupTitle: "Remover skins repetidas o no usadas",
      dupDesc: "Elimina duplicados y skins cuya textura no existe",
      repairBtn: "Crear ZIP corregido",
      repairing: "Generando paquete corregido...",
      repairError: "Ocurrió un problema al generar el paquete corregido. Revisa la consola para más detalles.",
      fixedSuffix: "_corregido"
    },
    notfound: {
      title: "Página no encontrada",
      text: "No hay ninguna herramienta en esta dirección — puede estar mal escrita, o el enlace ya no existe.",
      backHome: "Volver al inicio"
    },
    about: {
      title: "ACERCA DE MBSM",
      toolsTitle: "QUÉ INCLUYE MBSM",
      p1: `MBSM es una caja de herramientas gratuita para paquetes de
        <strong>Minecraft Bedrock</strong> que funciona casi por completo en
        tu navegador: un validador para packs 4D/5D con geometrías
        personalizadas, un visor de skins en 3D, un visor 4D/5D con un
        editor Blockbench Web integrado, un conversor OBJ → Skin 1.8 que
        convierte un modelo 3D en un paquete de skin 5D funcional, y un
        creador de skinpacks. Lo único que sale de tu navegador son los
        datos de un modelo 4D cuando lo envías a ese editor Blockbench
        integrado — todo lo demás se queda local.`,
      p2: "El objetivo es detectar exactamente los errores que suelen provocar que una skin no aparezca en el juego, que el modelo no cargue o que las texturas se rompan — y hacer sencillo crear un pack desde cero."
    },
    checks: {
      sectionTitle: "QUÉ REVISA EL VALIDADOR",
      geoTitle: "Geometrías",
      geoText: `Verifica que los identificadores usados en
        <strong>skins.json</strong>
        existan realmente en
        <strong>geometry.json</strong>.`,
      texTitle: "Texturas",
      texText: "Comprueba que todas las imágenes referenciadas por las skins existan físicamente dentro del paquete y detecta diferencias por mayúsculas y minúsculas.",
      langTitle: "Texts / Lang",
      langText: `Revisa que cada
        <strong>localization_name</strong>
        tenga su entrada correspondiente en
        <strong>texts/.lang</strong>
        y detecta claves faltantes o sobrantes.`,
      manifestTitle: "Manifest",
      manifestText: `Valida
        <strong>UUID</strong>,
        <strong>format_version</strong>,
        módulos presentes y otros problemas comunes de
        <strong>manifest.json</strong>.`,
      jsonTitle: "JSON",
      jsonText: "Detecta archivos JSON con errores de sintaxis y muestra la ubicación aproximada del problema cuando sea posible.",
      consTitle: "Consistencia",
      consText: "Compara nombres, rutas, referencias duplicadas y coherencia general entre todos los archivos del skinpack."
    },
    footer: { text: "Hecho para la comunidad de Minecraft Bedrock" },
    studio: {
      sectionTitle: "SKINS CLÁSICAS",
      tabIntro: "Previsualiza skinpacks normales de Minecraft Bedrock en 3D, o crea tu propio pack desde cero.",
      subViewer: "Visor de Skins",
      subMaker: "Skinpack Maker",
      windowTitleViewer: "VISOR",
      windowTitleMaker: "CONSTRUCTOR"
    },
    viewer: {
      sectionTitle: "VISOR DE SKIN PACKS",
      intro: "Carga un skin pack normal (no 4D) de Minecraft Bedrock para ver la textura de cada skin y previsualizarla en 3D sobre su modelo Steve o Alex.",
      dropTitle: "ARRASTRA TU SKIN PACK",
      dropText: `Admite archivos
        <strong>.zip</strong>
        y
        <strong>.mcpack</strong>
        de skins de Minecraft Bedrock.`,
      modelSteve: "Steve (Wide)",
      modelAlex: "Alex (Slim)",
      viewTexture: "Ver textura",
      view3D: "Ver en 3D",
      noTexture: "No se encontró la textura en el paquete.",
      notASkinPack: "El archivo no parece ser un skinpack de Minecraft Bedrock.",
      noSkins: "No se encontraron skins en este paquete.",
      loading: "Cargando paquete..."
    },
    maker: {
      intro: "Crea un skinpack normal de Minecraft Bedrock: importa skins, elige su modelo, y descarga un .mcpack listo para instalar.",
      addSkinTitle: "Agregar una skin",
      importUpload: "Subir PNG",
      importUsername: "Usuario",
      chooseImage: "Elegir imagen",
      uploadHint: "Acepta skins de 64x64, 64x32 (formato antiguo) y 128x128.",
      invalidDimensions: "Eso no parece una skin de Minecraft (se espera 64x64, 64x32 o 128x128).",
      platformJava: "Java",
      platformBedrock: "Bedrock",
      usernamePlaceholder: "Notch",
      importBtn: "Importar",
      usernameHintJava: "Obtiene la skin actual de una cuenta de Minecraft Java Edition.",
      usernameHintBedrock: "Obtiene la skin de un gamertag de Bedrock/Xbox, si ya se vio antes en algún servidor con Geyser.",
      skinsInPack: "Skins en este pack",
      noSkinsYet: "Todavía no se agregó ninguna skin.",
      skinName: "Nombre",
      skinModel: "Modelo",
      remove: "Quitar",
      packSettings: "Configuración del pack",
      packName: "Nombre del pack",
      packNamePlaceholder: "Mi Skin Pack",
      packDescription: "Descripción (opcional)",
      packDescPlaceholder: "Una colección de skins personalizadas",
      colorsLabel: "Colores",
      formatLabel: "Formato",
      codesHint: "Tocá un campo de arriba y después un color o formato para insertarlo ahí. También podés escribir & en vez de § (ej. &c) si te resulta más fácil.",
      packIcon: "Ícono del pack (opcional)",
      chooseIcon: "Elegir ícono",
      generateBtn: "Descargar skin pack",
      stepAdd: "Agregar skins",
      stepManage: "Gestionar pack",
      stepSettings: "Ajustes del pack",
      stepExport: "Exportar",
      importing: "Importando...",
      importOk: 'Se agregó "{name}".',
      importFailGeneric: "No se pudo importar esa imagen.",
      needUsername: "Primero escribí un nombre de usuario.",
      importFailUsernameJava: "No se encontró una skin de Java para ese usuario. Revisá la ortografía — algunas fuentes tardan un minuto en actualizarse tras cambiar de skin.",
      importFailUsernameBedrock: "No se encontró una skin de Bedrock para ese gamertag. Esto solo funciona si la cuenta ya se conectó antes a un servidor con Geyser.",
      needSkins: "Primero agrega al menos una skin.",
      needName: "Primero dale un nombre al pack.",
      generating: "Generando pack...",
      generateError: "Ocurrió un problema al generar el pack. Revisa la consola para más detalles.",
      defaultSkinName: "Skin",
      colorBlack: "Negro", colorDarkBlue: "Azul oscuro", colorDarkGreen: "Verde oscuro",
      colorDarkAqua: "Turquesa oscuro", colorDarkRed: "Rojo oscuro", colorDarkPurple: "Púrpura oscuro",
      colorGold: "Dorado", colorGray: "Gris", colorDarkGray: "Gris oscuro",
      colorBlue: "Azul", colorGreen: "Verde", colorAqua: "Turquesa",
      colorRed: "Rojo", colorLightPurple: "Púrpura claro", colorYellow: "Amarillo",
      colorWhite: "Blanco", colorMinecoinGold: "Dorado Minecoin", colorQuartz: "Material cuarzo",
      colorIron: "Material hierro", colorNetherite: "Material netherita",
      colorRedstone: "Material redstone", colorCopper: "Material cobre",
      colorGoldMaterial: "Material oro", colorEmerald: "Material esmeralda",
      colorDiamond: "Material diamante", colorLapis: "Material lapislázuli",
      colorAmethyst: "Material amatista",
      formatBold: "Negrita", formatItalic: "Cursiva",
      formatObfuscated: "Ofuscado (revuelve el texto)", formatReset: "Reiniciar formato"
    },
    js: {
      skinsPreviewTitle: "👕 Skins detectadas",
      skinPreviewMissingLang: "(sin nombre en el lang)",
      rowName: "Nombre:",
      rowModel: "Modelo:",
      rowCape: "Capa:",
      animationsLabel: "Animaciones",
      defaultPackDescription: "Paquete de skins 4D"
    }
  }
};

let currentLang = "en";

function t(key, ...args) {
  const parts = key.split(".");
  let node = I18N[currentLang];
  for (const p of parts) {
    if (!node) return key;
    node = node[p];
  }
  // A handful of keys (like the Home greeting) hold an array of variants
  // instead of a single string, so the text feels a little different
  // each time the page loads or the language is switched.
  if (Array.isArray(node)) {
    node = node[Math.floor(Math.random() * node.length)];
  }
  if (typeof node === "function") return node(...args);
  return typeof node === "string" ? node : key;
}

// ---------- Home greeting: varies with the device's local time of day ----------
// (home.welcomeGreeting is a {morning, afternoon, evening, night} pool per
// language rather than a plain string/array, so it's handled here instead
// of through the generic t() lookup above.)
function greetingBucketForHour(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function currentGreeting() {
  const pools = (I18N[currentLang] && I18N[currentLang].home && I18N[currentLang].home.welcomeGreeting) || {};
  const bucket = greetingBucketForHour(new Date().getHours());
  const list = (pools[bucket] && pools[bucket].length) ? pools[bucket] : (pools.morning || []);
  return list.length ? list[Math.floor(Math.random() * list.length)] : "";
}

async function applyLanguage(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;

  try { localStorage.setItem("mbsm_lang", lang); } catch (e) {}

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = key === "home.welcomeGreeting" ? currentGreeting() : t(key);
  });

  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });

  // <input> placeholders (e.g. the Skinpack Maker's fields) aren't
  // visible content via textContent/innerHTML, so they need their own
  // attribute.
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });

  // Analysis messages are locked into whatever language they were
  // generated in, so if a pack is already loaded we re-run the analysis
  // in the new language so the results get translated too.
  if (currentZip) {

    try {
      const resolveAmbiguousGeometry =
        document.getElementById("resolveAmbiguousGeometry")?.checked || false;

      currentReport = await validateSkinPack(currentZip, currentZipName, {
        resolveAmbiguousGeometry,
        lang: currentLang
      });

      renderReport(currentReport);

    } catch (e) {
      console.error(e);
    }

  } else {
    clearResults();
  }

  if (typeof viewerResults !== "undefined" && viewerResults && !viewerResults._skinsData) {
    viewerShowMessage(t("validator.waitingText"));
  }

  // Repaints the 4D/5D viewer's already-shown text in the new language
  // (Blockbench's status/instructions, and the model selector's
  // MIXED/EMPTY tags where applicable). Doesn't retry anything with side
  // effects -- it only re-translates text that's already been computed.
  if (typeof BlockbenchPanel !== "undefined") BlockbenchPanel.refreshLanguage();
  if (typeof SkinGeoViewer !== "undefined") SkinGeoViewer.refreshLanguage();

  // Same idea as above, but for the OBJ -> Skin 1.8 converter (used to
  // be a separate page, now it's just another module in the SPA).
  if (typeof ObjSkinStudio !== "undefined") ObjSkinStudio.refreshLanguage();

  // The Skinpack Maker builds its skin list and preview dynamically
  // (not through data-i18n), so they need to be repainted every time the
  // language changes.
  if (typeof refreshMakerLanguage === "function") {
    refreshMakerLanguage();
  }

  if (analyzeBtn && analyzeBtn.textContent.trim() !== t("validator.loadingBtn") && analyzeBtn.textContent.trim() !== t("validator.analyzingBtn")) {
    analyzeBtn.textContent = t("validator.analyzeBtn");
  }

  if (typeof mbsmRenderDashboard === "function") mbsmRenderDashboard();
}

document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => applyLanguage(btn.getAttribute("data-lang")));
});

// ==========================================================
// Dashboard: Models/Skins/Packs stats + Recent Projects
// Persisted locally (localStorage) so the Home dashboard reflects
// what the person has actually done in this browser.
// ==========================================================
const MBSM_STATS_KEY = "mbsm_dash_stats_v1";
const MBSM_RECENT_KEY = "mbsm_dash_recent_v1";
const MBSM_RECENT_MAX = 20;
const MBSM_RECENT_SHOWN = 5;

function mbsmLoadStats() {
  try {
    const raw = localStorage.getItem(MBSM_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        models: Number(parsed.models) || 0,
        skins: Number(parsed.skins) || 0,
        packs: Number(parsed.packs) || 0
      };
    }
  } catch (e) {}
  return { models: 0, skins: 0, packs: 0 };
}

function mbsmSaveStats(stats) {
  try { localStorage.setItem(MBSM_STATS_KEY, JSON.stringify(stats)); } catch (e) {}
}

function mbsmBumpStat(key, amount = 1) {
  const stats = mbsmLoadStats();
  stats[key] = (stats[key] || 0) + amount;
  mbsmSaveStats(stats);
  mbsmRenderDashboard();
}

function mbsmLoadRecent() {
  try {
    const raw = localStorage.getItem(MBSM_RECENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function mbsmSaveRecent(list) {
  try { localStorage.setItem(MBSM_RECENT_KEY, JSON.stringify(list.slice(0, MBSM_RECENT_MAX))); } catch (e) {}
}

// type: "model" | "skin" | "pack"
function mbsmAddRecent(type, name) {
  const list = mbsmLoadRecent();
  list.unshift({ type, name: String(name || "").slice(0, 80), ts: Date.now() });
  mbsmSaveRecent(list);
  mbsmRenderDashboard();
}

function mbsmFormatRelativeTime(ts) {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return t("home.timeJustNow");
  if (minutes < 60) return t("home.timeMinAgo", minutes);

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("home.timeHoursAgo", hours);

  const days = Math.floor(hours / 24);
  if (days === 1) return t("home.timeYesterday");
  return t("home.timeDaysAgo", days);
}

const MBSM_RECENT_ICONS = {
  model: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 21v-9M12 12 4 7.5M12 12l8-4.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  skin: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M8 9.5h.01M16 9.5h.01M8.5 15c1 1 6 1 7 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  pack: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 8.5V16l8 4.5 8-4.5V8.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
};

let mbsmRecentExpanded = false;

function mbsmRenderDashboard() {
  const stats = mbsmLoadStats();

  const elModels = document.getElementById("dashStatModels");
  const elSkins = document.getElementById("dashStatSkins");
  const elPacks = document.getElementById("dashStatPacks");
  if (elModels) elModels.textContent = stats.models;
  if (elSkins) elSkins.textContent = stats.skins;
  if (elPacks) elPacks.textContent = stats.packs;

  const listEl = document.getElementById("dashRecentList");
  const viewAllBtn = document.getElementById("dashRecentViewAll");
  if (!listEl) return;

  const all = mbsmLoadRecent();

  if (viewAllBtn) {
    viewAllBtn.style.display = all.length > MBSM_RECENT_SHOWN ? "" : "none";
    viewAllBtn.textContent = mbsmRecentExpanded ? t("home.viewLess") : t("home.viewAll");
  }

  const recent = mbsmRecentExpanded ? all : all.slice(0, MBSM_RECENT_SHOWN);

  if (!recent.length) {
    listEl.innerHTML = `<p class="dash-recent-empty">${t("home.recentEmpty")}</p>`;
    return;
  }

  const typeLabelKey = { model: "home.recentTypeModel", skin: "home.recentTypeSkin", pack: "home.recentTypePack" };
  const typeIconClass = { model: "", skin: "dash-recent-icon-skin", pack: "dash-recent-icon-pack" };

  listEl.innerHTML = recent.map(item => {
    const icon = MBSM_RECENT_ICONS[item.type] || MBSM_RECENT_ICONS.pack;
    const iconClass = typeIconClass[item.type] || "";
    const typeLabel = t(typeLabelKey[item.type] || "home.recentTypePack");
    return `
      <div class="dash-recent-item">
        <div class="dash-recent-icon ${iconClass}" aria-hidden="true">${icon}</div>
        <div class="dash-recent-body">
          <span class="dash-recent-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <span class="dash-recent-time">${typeLabel} · ${mbsmFormatRelativeTime(item.ts)}</span>
        </div>
      </div>
    `;
  }).join("");
}

(function initDashRecentViewAll() {
  const btn = document.getElementById("dashRecentViewAll");
  if (!btn) return;
  btn.addEventListener("click", () => {
    mbsmRecentExpanded = !mbsmRecentExpanded;
    mbsmRenderDashboard();
  });
})();

// ---------- Fade-in animations on scroll ----------
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("in-view"));
}

// ---------- Estadísticas ----------
function resetStats() {
  document.getElementById("skinsCount").textContent = "0";
  document.getElementById("errorsCount").textContent = "0";
  document.getElementById("warningsCount").textContent = "0";
  document.getElementById("successCount").textContent = "0";
}

function setStats(stats) {
  document.getElementById("skinsCount").textContent = stats.skins || 0;
  document.getElementById("errorsCount").textContent = stats.errors || 0;
  document.getElementById("warningsCount").textContent = stats.warnings || 0;
  document.getElementById("successCount").textContent = stats.success || 0;
}

// ---------- Resultados ----------
function clearResults() {
    results.innerHTML = `
    <div class="result-placeholder">
        <div class="placeholder-icon">🧱</div>
        <h4>${t("validator.waitingTitle")}</h4>
        <p>${t("validator.waitingText")}</p>
    </div>
    `;
}

function showLoading() {
    results.innerHTML = `
    <div class="result-placeholder">
        <div class="placeholder-icon">⏳</div>
        <h4>${t("validator.loadingTitle")}</h4>
        <p>${t("validator.loadingText")}</p>
    </div>
    `;
}
function addResult(type, title, message) {
  const item = document.createElement("div");
  item.className = `result-item ${type}`;

  item.innerHTML = `
<h4>${title}</h4>
<p>${message}</p>
`;

results.appendChild(item);
}

function beginResults() {
  results.innerHTML = "";
}

// ---------- Drag & Drop ----------
["dragenter", "dragover"].forEach(event => {
  dropzone.addEventListener(event, e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("drag");
  });
});

["dragleave", "dragend", "drop"].forEach(event => {
  dropzone.addEventListener(event, e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("drag");
  });
});

dropzone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file) {
    handleFile(file);
  }
});

// ---------- Selector ----------
zipInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

// ---------- Pre-check whether this looks like a skin pack ----------
async function isLikelySkinPack(zip) {
  const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);

  const hasSkinsJson = files.some(f => /(^|\/)skins\.json$/i.test(f));
  if (!hasSkinsJson) return false;

  const manifestPath = files.find(f => /(^|\/)manifest\.json$/i.test(f));
  if (!manifestPath) return true; // no manifest: let the validator report the problem

  try {
    const manifest = JSON.parse(await zip.files[manifestPath].async("string"));
    const modules = manifest.modules || [];
    const isSkinModule = modules.some(m => (m.type || "").toLowerCase() === "skin_pack");

    // If it declares modules but none of them is skin_pack, this is
    // probably not a skin pack (could be a regular resource/behavior pack).
    if (modules.length && !isSkinModule) return false;

  } catch (e) {
    // invalid manifest: let the validator report the specific error
  }

  return true;
}

// ---------- Minecraft formatting codes (§) ----------
// Minecraft BEDROCK's formatting codes (different from Java in some cases):
// Bedrock reuses the letters "m" and "n" as extra material colors instead
// of strikethrough/underline, and adds colors "g" through "u".
const MC_COLORS = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
  "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
  "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
  "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF",
  // Bedrock-exclusive colors (material/minecoin)
  "g": "#DDD605", "h": "#E3D4D1", "i": "#CECACA", "j": "#443A3B",
  "m": "#971607", "n": "#B4684D", "p": "#DEB12D", "q": "#47A036",
  "s": "#2CBAA8", "t": "#21497B", "u": "#9A5CC6"
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mcFormatToHtml(text) {
  if (!text) return "";

  let html = "";
  let buffer = "";
  let color = null, bold = false, italic = false, underline = false, strikethrough = false, obfuscated = false;

  function flush() {
    if (!buffer) return;

    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (bold) styles.push("font-weight:bold");
    if (italic) styles.push("font-style:italic");

    const decor = [];
    if (underline) decor.push("underline");
    if (strikethrough) decor.push("line-through");
    if (decor.length) styles.push(`text-decoration:${decor.join(" ")}`);

    const cls = obfuscated ? ' class="mc-obfuscated"' : "";

    html += `<span style="${styles.join(";")}"${cls}>${escapeHtml(buffer)}</span>`;
    buffer = "";
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "§" && i + 1 < text.length) {
      flush();

      const code = text[i + 1].toLowerCase();

      if (MC_COLORS[code]) {
        color = MC_COLORS[code];
        bold = italic = underline = strikethrough = obfuscated = false;
      } else if (code === "l") bold = true;
      else if (code === "o") italic = true;
      else if (code === "k") obfuscated = true;
      else if (code === "r") {
        color = null;
        bold = italic = underline = strikethrough = obfuscated = false;
      }

      i++;
      continue;
    }

    buffer += ch;
  }

  flush();
  return html;
}

// ---------- Pack info banner ----------
function renderPackInfo(packInfo) {
  if (!packInfo) return "";

  const iconHtml = packInfo.iconDataUrl
    ? `<img src="${packInfo.iconDataUrl}" alt="Pack icon">`
    : `<div class="pack-icon-default"><img src="assets/mbsm-icon.png" alt=""></div>`;

  // The validator uses "Paquete de skins 4D" as its default description;
  // we translate it here so it respects the UI's current language.
  const description =
    packInfo.description === "Paquete de skins 4D"
      ? t("js.defaultPackDescription")
      : packInfo.description;

  return `
    <div class="pack-info-banner">
      <div class="pack-info-text">
        <div class="pack-info-name">${mcFormatToHtml(packInfo.name)}</div>
        <div class="pack-info-description">${mcFormatToHtml(description)}</div>
      </div>
      <div class="pack-info-icon">
        ${iconHtml}
      </div>
    </div>
  `;
}

// ---------- Skin preview ----------
// A colored 4D/5D tag for the validator -- same visual class the 4D/5D
// viewer's model selector uses (blue=4D, purple=5D), so both sections
// look consistent. Anything that isn't exactly "4D" or "5D" (mixed
// geometry, or "VACÍO"/empty if that ever shows up) gets a neutral class
// and its text translated for the current language instead of showing
// the hardcoded Spanish word.
function renderGeometryTypeTag(type) {
  if (type === "4D" || type === "5D") {
    return `<span class="sg-model-tag sg-model-tag-${type.toLowerCase()}">${type}</span> `;
  }
  if (type === "MIXTO") {
    return `<span class="sg-model-tag sg-model-tag-other">${escapeHtml(t("sg.tagMixed"))}</span> `;
  }
  if (type === "VACÍO") {
    return `<span class="sg-model-tag sg-model-tag-other">${escapeHtml(t("sg.tagEmpty"))}</span> `;
  }
  if (type) {
    return `<span class="sg-model-tag sg-model-tag-other">${escapeHtml(type)}</span> `;
  }
  return "";
}

function renderSkinsPreview(skinDetails) {
  if (!skinDetails || !skinDetails.length) return "";

  const cards = skinDetails.map(skin => {

    const displayNameHtml = skin.displayName
      ? mcFormatToHtml(skin.displayName)
      : `<span class="skin-preview-missing">${t("js.skinPreviewMissingLang")}</span>`;

    let animationsHtml = "";
    if (skin.animations && Object.keys(skin.animations).length) {
      const animCount = Object.keys(skin.animations).length;
      animationsHtml = `
        <details class="skin-preview-animations">
          <summary>${t("js.animationsLabel")} (${animCount})</summary>
          <div class="skin-preview-animations-body">
            ${Object.entries(skin.animations).map(([slot, val]) =>
              `<div class="skin-preview-anim-row"><code>${escapeHtml(slot)}</code> <span class="anim-arrow">➡️</span> <code>${escapeHtml(val)}</code></div>`
            ).join("")}
          </div>
        </details>
      `;
    }

    const cardClass = skin.hasIssue
      ? "skin-preview-card skin-preview-card-warning"
      : "skin-preview-card";

    const geometryTypeTagHtml = skin.geometry
      ? renderGeometryTypeTag(skin.geometryType)
      : "";

    return `
      <div class="${cardClass}">
        <div class="skin-preview-displayname">${displayNameHtml}</div>
        <div class="skin-preview-row"><span>${t("js.rowName")}</span> ${escapeHtml(skin.name)}</div>
        <div class="skin-preview-row"><span>${t("js.rowModel")}</span> ${geometryTypeTagHtml}${escapeHtml(skin.geometry || "—")}</div>
        ${skin.cape ? `<div class="skin-preview-row"><span>${t("js.rowCape")}</span> ${escapeHtml(skin.cape)}</div>` : ""}
        ${animationsHtml}
      </div>
    `;
  }).join("");

  return `
    <div class="card skins-preview-card">
      <h3 class="pixel-title">${t("js.skinsPreviewTitle")}</h3>
      <div class="skins-preview-grid">
        ${cards}
      </div>
    </div>
  `;
}

// ---------- Loading the ZIP ----------
async function handleFile(file) {
  resetStats();
  clearResults();

  const lowerName = file.name.toLowerCase();
  const validExtension = lowerName.endsWith(".zip") || lowerName.endsWith(".mcpack");

  if (!validExtension) {
    selectedFile.textContent = t("validator.invalidExtSelected");
    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <h4>${t("validator.invalidExtTitle")}</h4>
        <p>${t("validator.invalidExtText")}</p>
      </div>
    `;
    return;
  }

  selectedFile.textContent = file.name;
  currentZipName = file.name;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = t("validator.loadingBtn");

  try {
    currentZip = await JSZip.loadAsync(file);

    const looksValid = await isLikelySkinPack(currentZip);

    if (!looksValid) {
      currentZip = null;

      analyzeBtn.disabled = true;
      analyzeBtn.textContent = t("validator.analyzeBtn");

      selectedFile.textContent = t("validator.notPackSelected");

      results.innerHTML = `
        <div class="result-placeholder">
          <div class="placeholder-icon">❌</div>
          <h4>${t("validator.notPackTitle")}</h4>
          <p>${t("validator.notPackText")}</p>
        </div>
      `;

      return;
    }

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = t("validator.analyzeBtn");

    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">📦</div>
        <h4>${t("validator.readyTitle")}</h4>
        <p>${escapeHtml(file.name)}</p>
      </div>
    `;
  } catch (err) {
    console.error(err);

    currentZip = null;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = t("validator.analyzeBtn");

    selectedFile.textContent = t("validator.invalidFileSelected");

    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <h4>${t("validator.invalidFileTitle")}</h4>
        <p>${t("validator.invalidFileText")}</p>
      </div>
    `;
  }
}

// ---------- Renders a full report into #results ----------
function renderReport(report) {
  beginResults();

  if (report.packInfo) {
    results.insertAdjacentHTML("beforeend", renderPackInfo(report.packInfo));
  }

  report.results.forEach(r => {
    addResult(r.type, r.title, r.message);
  });

  if (report.skinDetails && report.skinDetails.length) {
    results.insertAdjacentHTML("beforeend", renderSkinsPreview(report.skinDetails));
  }

  setStats(report.stats);
}

// ---------- Run the analysis ----------
analyzeBtn.addEventListener("click", async () => {
  if (!currentZip) return;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = t("validator.analyzingBtn");

  showLoading();

  try {
    const resolveAmbiguousGeometry =
      document.getElementById("resolveAmbiguousGeometry")?.checked || false;

    // This function lives in validator.js
    currentReport = await validateSkinPack(currentZip, currentZipName, {
      resolveAmbiguousGeometry,
      lang: currentLang
    });

    renderReport(currentReport);

    document
    .getElementById("fixPanel")
    .style.display = "block";

    if (typeof mbsmBumpStat === "function") mbsmBumpStat("packs", 1);
    if (typeof mbsmAddRecent === "function") mbsmAddRecent("pack", currentZipName);

  } catch (err) {
    console.error(err);

    beginResults();

    addResult(
      "error",
      t("validator.internalErrorTitle"),
      t("validator.internalErrorText")
    );
  }

  analyzeBtn.disabled = false;
  analyzeBtn.textContent = t("validator.analyzeBtn");
});


const repairButton =
document.getElementById("repairButton");


if(repairButton){

repairButton.addEventListener("click", async ()=>{

if(!currentZip){
    mbsmToast("warning", t("validator.needPackAlert"));
    return;
}

let options={

fixJson:
document.getElementById("fixJson").checked,

syncLocalization:
document.getElementById("fixLocalization").checked,

createMissingTexts:
document.getElementById("fixTexts").checked,

syncSkins:
document.getElementById("syncSkins").checked,

removeDuplicatesOrUnused:
document.getElementById("removeDuplicatesOrUnused").checked

};


const originalBtnText = repairButton.textContent;
repairButton.disabled = true;
repairButton.textContent = t("fix.repairing");

try {

    let changes =
    await Fixer.apply(
    currentZip,
    options,
    currentReport
    );

    let output =
    await currentZip.generateAsync({
        type:"blob",
        platform:"DOS",
        streamFiles:false,
        compression:"DEFLATE",
        compressionOptions:{ level:6 }
    });

    // Output name: keeps the original extension (.zip or .mcpack)
    // instead of always assuming ".zip", which used to leave the name
    // unchanged for .mcpack files. The suffix itself follows the page's
    // current language (e.g. "_fixed" in English, "_corregido" in Spanish).
    const dotIndex = currentZipName.lastIndexOf(".");
    const baseName = dotIndex > -1 ? currentZipName.slice(0, dotIndex) : currentZipName;
    const ext = dotIndex > -1 ? currentZipName.slice(dotIndex) : ".mcpack";
    const downloadName = `${baseName}${t("fix.fixedSuffix")}${ext}`;

    const blobUrl = URL.createObjectURL(output);

    let link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadName;
    link.style.display = "none";

    // Some browsers (Firefox, Safari) won't trigger the download if the
    // link isn't actually inserted into the DOM at the moment it's clicked.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the URL after a short delay so we don't interrupt the download
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

} catch (err) {

    console.error(err);
    mbsmToast("error", t("fix.repairError"));

} finally {

    repairButton.disabled = false;
    repairButton.textContent = originalBtnText;

}

});

}

// ==========================================================
// Tab system (Validator / About / Viewer)
// ==========================================================
function switchTab(tabId) {
  document.querySelectorAll(".tab-section").forEach(sec => {
    sec.classList.toggle("active-tab", sec.id === tabId);
  });

  document.querySelectorAll(".tab-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-tab") === tabId);
  });

  const crumbEl = document.getElementById("topbarCrumb");
  const activeSidebarLabel = document.querySelector(".sidebar-link.active .sidebar-link-label");
  if (crumbEl) {
    if (tabId === "notfound") {
      crumbEl.textContent = "404";
    } else if (activeSidebarLabel) {
      crumbEl.textContent = activeSidebarLabel.textContent;
    }
  }

  // Switching main tabs disposes of any active 3D scene so it doesn't
  // keep rendering in the background.
  if (typeof dispose3DViewer === "function") {
    dispose3DViewer();
  }

  const target = document.getElementById(tabId);

  if (target) {
    target.classList.add("in-view");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.querySelectorAll(".tab-link[data-tab]").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab(link.getAttribute("data-tab"));

    // If the link also points to a specific sub-tab (e.g. a home card
    // meant to open "4D/5D Studio > 4D/5D Viewer"), we simulate a real
    // click on that sub-tab button instead of duplicating
    // switchSubTab()'s logic -- that way SkinGeoViewer's lazy-init hook
    // fires too, if it applies.
    const subtabId = link.getAttribute("data-subtab");
    if (subtabId) {
      const target = document.getElementById(link.getAttribute("data-tab"));
      const subBtn = target && target.querySelector('.sub-tab-btn[data-subtab="' + subtabId + '"]');
      if (subBtn) subBtn.click();
    }

    // Reflect whichever tab/tool ended up active in the address bar.
    // (If a sub-tab button was just clicked above, this is a harmless
    // no-op -- its own click handler already synced the same URL.)
    if (typeof syncUrlWithState === "function") syncUrlWithState();
  });
});

// ==========================================================
// Sub-tabs (nested inside a main tab, e.g. Classic Skins: Skin
// Viewer / Skinpack Maker, or the Maker's import methods)
// ==========================================================
function switchSubTab(btn) {
  const targetId = btn.getAttribute("data-subtab") || btn.getAttribute("data-importtab");
  if (!targetId) return;

  const group = btn.closest(".sub-tabs");
  if (!group) return;

  // This group's buttons activate sibling panels: we look up the
  // "group"'s parent container and, inside it, the .sub-tab-panel or
  // .import-panel that matches each button in this same group.
  const container = group.parentElement;
  if (!container) return;

  group.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  container.querySelectorAll(":scope > .sub-tab-panel, :scope > .import-panel").forEach(panel => {
    panel.classList.toggle("active-subtab", panel.id === targetId);
  });

  // If the sub-tab we're leaving was the Skin Viewer (which may have
  // an active 3D view), dispose of it.
  if (typeof dispose3DViewer === "function") {
    dispose3DViewer();
  }
}

document.querySelectorAll(".sub-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchSubTab(btn);
    if (typeof syncUrlWithState === "function") syncUrlWithState();
  });
});

// ==========================================================
// Page routing: gives each tool its own URL via the History API,
// so the address bar (e.g. ".../MBSM/Validator/") reflects whichever
// tab/tool is active, deep links open straight to that tool, and the
// browser's back/forward buttons move between them.
// ==========================================================

// Every "page" the app can land on: which main tab + (optional) sub-tab
// it corresponds to, and the URL segment used for it. Keep this in sync
// with the sub-tab groups in index.html (the sgTab* ones inside
// #validator, and the studio* ones inside #studio) and with 404.html's
// own copy of the segment list.
const ROUTES = [
  { tab: "home",      subtab: null,             path: "" },
  { tab: "validator", subtab: "sgTabViewer",    path: "4D-5D-Viewer" },
  { tab: "studio",    subtab: "studioViewer",   path: "Classic-Skins" },
  { tab: "validator", subtab: "sgTabValidator", path: "Validator" },
  { tab: "studio",    subtab: "studioMaker",    path: "Maker" },
  { tab: "validator", subtab: "sgTabObjSkin",   path: "Obj-Skin" },
  { tab: "about",     subtab: null,             path: "About" },
  { tab: "notfound",  subtab: null,             path: "404" }
];
const NOT_FOUND_ROUTE = ROUTES.find(r => r.tab === "notfound");

// How many leading path segments make up the site's own base directory,
// independent of MBSM's routes -- 1 for a typical GitHub Pages project
// site ("<user>.github.io/MBSM/..."), 0 if MBSM is hosted at a domain's
// root. Keep this in sync with the same constant in 404.html. Only used
// as a fallback below, when the pathname doesn't end in one of the known
// route segments above.
const BASE_SEGMENTS_FALLBACK = 1;

// The app can be served from a subpath (GitHub Pages project sites live
// at "/<repo>/", e.g. "/MBSM/"), so instead of hardcoding that we work
// it out from the current URL: strip a trailing known route segment
// (and/or "index.html") off the pathname, whatever's left is the base.
//
// IMPORTANT: this must run against the URL of the page *actually loaded
// right now* -- which, thanks to 404.html, is always either a valid tool
// URL, plain index.html, or the site root. It must NOT run against a
// redirected/typo'd path restored from sessionStorage below (that path
// can be anything the user typed, e.g. "/MBSM/validatos/", and trying to
// strip a base out of THAT is what used to send the router in circles).
//
// It's also hardened against a path that doesn't end in a known segment
// at all (in case 404.html's own redirect got bypassed somehow, e.g. in
// local testing without it configured): rather than trusting whatever's
// left over as the base -- which is exactly what let "/MBSM/validatos/"
// get treated as the base path, breaking every link built from it
// afterwards -- it falls back to keeping a fixed number of leading path
// segments, same as 404.html does.
function computeRouteBasePath() {
  let path = window.location.pathname;
  const knownSegments = ROUTES.map(r => r.path).filter(Boolean);
  for (const seg of knownSegments) {
    const re = new RegExp("/" + seg + "/?$", "i");
    if (re.test(path)) {
      path = path.replace(re, "/");
      if (!path.endsWith("/")) path += "/";
      return path;
    }
  }
  path = path.replace(/index\.html$/i, "");
  const segments = path.split("/").filter(Boolean);
  const base = "/" + segments.slice(0, BASE_SEGMENTS_FALLBACK).join("/");
  return base === "/" ? "/" : base + "/";
}

const ROUTE_BASE_PATH = computeRouteBasePath();

function findRoute(tab, subtab) {
  return ROUTES.find(r => r.tab === tab && r.subtab === (subtab || null))
      || ROUTES.find(r => r.tab === tab)
      || ROUTES[0];
}

function pathForRoute(tab, subtab) {
  const route = findRoute(tab, subtab);
  return ROUTE_BASE_PATH + (route.path ? route.path + "/" : "");
}

function routeForPath(pathname) {
  let rel = pathname;
  if (rel.indexOf(ROUTE_BASE_PATH) === 0) rel = rel.slice(ROUTE_BASE_PATH.length);
  rel = rel.replace(/^\/+|\/+$/g, "");
  if (!rel || /^index\.html$/i.test(rel)) return ROUTES[0];
  const match = ROUTES.find(r => r.path && r.path.toLowerCase() === rel.toLowerCase());
  // A non-empty segment that isn't index.html and doesn't match any known
  // route is an actual bad/mistyped link -- land on the 404 page instead
  // of silently pretending it was Home all along (and keeping the wrong
  // URL, which used to happen here).
  return match || NOT_FOUND_ROUTE;
}

// If we just bounced back from /404.html (GitHub Pages has no real
// server-side routing, so a direct link or refresh on a tool URL lands
// there first), figure out which page was actually requested -- using
// the ROUTE_BASE_PATH computed above from the real page we're on, never
// by trusting the redirected path as a base itself. An unrecognized/
// typo'd page (routeForPath() falling back to NOT_FOUND_ROUTE) shows the
// 404 page instead of looping or silently landing on Home.
let initialRoute = routeForPath(window.location.pathname);
try {
  const redirected = sessionStorage.getItem("mbsm_redirect_path");
  if (redirected) {
    sessionStorage.removeItem("mbsm_redirect_path");
    initialRoute = routeForPath(redirected);
  }
} catch (e) {}

// Only the *top-level* sub-tab group defines a "page" (a tool's import
// method tabs, for instance, are a nested group and don't count).
function currentTopLevelSubtab(tabId) {
  const target = document.getElementById(tabId);
  if (!target) return null;
  const btn = target.querySelector(":scope > .container > .sub-tabs > .sub-tab-btn.active[data-subtab]");
  return btn ? btn.getAttribute("data-subtab") : null;
}

// Set while we're applying a route to the UI (initial load / popstate),
// so the click handlers above know not to push a *new* history entry
// on top of the one we're just reacting to.
let isApplyingRoute = false;

function syncUrlWithState() {
  if (isApplyingRoute) return;
  const activeSection = document.querySelector(".tab-section.active-tab");
  if (!activeSection) return;
  const tabId = activeSection.id;
  const subtab = currentTopLevelSubtab(tabId);
  const path = pathForRoute(tabId, subtab);
  if (window.location.pathname !== path) {
    history.pushState({ tab: tabId, subtab: subtab }, "", path);
  }
}

function applyRoute(route) {
  isApplyingRoute = true;
  try {
    switchTab(route.tab);
    if (route.subtab) {
      const target = document.getElementById(route.tab);
      const subBtn = target && target.querySelector('.sub-tab-btn[data-subtab="' + route.subtab + '"]');
      if (subBtn) subBtn.click();
    }
  } finally {
    isApplyingRoute = false;
  }
}

// Back/forward browser navigation.
window.addEventListener("popstate", () => {
  applyRoute(routeForPath(window.location.pathname));
});

// The actual "apply whatever URL we were opened with" call happens
// further below, right after applyLanguage(savedLang) -- switchTab()
// (called from applyRoute) reads the sidebar's translated label for
// the topbar breadcrumb, so the language needs to be set first.

// ==========================================================
// Floating info window (the "?" buttons)
// ==========================================================
const INFO_CONTENT = {
  ambiguous: { titleKey: "validator.ambiguousInfoTitle", textKey: "validator.ambiguousInfoText" },
  syncSkins: { titleKey: "fix.syncInfoTitle", textKey: "fix.syncInfoText" }
};

const infoPopover = document.getElementById("infoPopover");
const infoPopoverTitle = document.getElementById("infoPopoverTitle");
const infoPopoverText = document.getElementById("infoPopoverText");
const infoPopoverClose = document.getElementById("infoPopoverClose");

function openInfoPopover(key) {
  const content = INFO_CONTENT[key];
  if (!content || !infoPopover) return;

  infoPopoverTitle.textContent = t(content.titleKey);
  infoPopoverText.textContent = t(content.textKey);
  infoPopover.hidden = false;
}

function closeInfoPopover() {
  if (infoPopover) infoPopover.hidden = true;
}

document.querySelectorAll(".info-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openInfoPopover(btn.getAttribute("data-info"));
  });
});

if (infoPopoverClose) {
  infoPopoverClose.addEventListener("click", closeInfoPopover);
}

if (infoPopover) {
  infoPopover.addEventListener("click", (e) => {
    if (e.target === infoPopover) closeInfoPopover();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeInfoPopover();
});

// ==========================================================
// Viewer for regular (non-4D) skin packs
// ==========================================================
const viewerDropzone = document.getElementById("viewerDropzone");
const viewerZipInput = document.getElementById("viewerZipInput");
const viewerSelectedFile = document.getElementById("viewerSelectedFile");
const viewerResults = document.getElementById("viewerResults");

function viewerShowMessage(msg) {
  viewerResults.innerHTML = `
    <div class="result-placeholder">
      <div class="placeholder-icon">🧱</div>
      <p>${escapeHtml(msg)}</p>
    </div>
  `;
}

function renderViewerSkins(skins) {
  if (!skins || !skins.length) {
    viewerShowMessage(t("viewer.noSkins"));
    return;
  }

  viewerResults.innerHTML = skins.map((skin, i) => {
    const modelLabel = skin.isSlim ? t("viewer.modelAlex") : t("viewer.modelSteve");
    const shownName = skin.displayName || skin.name;

    return `
      <div class="viewer-skin-card" data-index="${i}">
        <div class="viewer-skin-header">
          <div class="viewer-skin-name">${escapeHtml(shownName)}</div>
          <div class="viewer-skin-model">${modelLabel}</div>
        </div>

        <div class="viewer-skin-actions">
          <button type="button" class="btn btn-secondary viewer-btn-texture" data-index="${i}">🖼 ${t("viewer.viewTexture")}</button>
          <button type="button" class="btn btn-secondary viewer-btn-3d" data-index="${i}"><img src="assets/mbsm-icon.png" alt="" class="btn-icon-img"> ${t("viewer.view3D")}</button>
        </div>

        <div class="viewer-skin-content" id="viewerContent-${i}"></div>
      </div>
    `;
  }).join("");

  // Store the data so the buttons can use it
  viewerResults._skinsData = skins;

  viewerResults.querySelectorAll(".viewer-skin-header").forEach(header => {
    header.addEventListener("click", () => {
      header.closest(".viewer-skin-card").classList.toggle("expanded");
    });
  });

  viewerResults.querySelectorAll(".viewer-btn-texture").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute("data-index"));
      const skin = viewerResults._skinsData[idx];
      const content = document.getElementById(`viewerContent-${idx}`);

      if (typeof dispose3DViewer === "function") dispose3DViewer();

      if (!skin.textureDataUrl) {
        content.innerHTML = `<p class="viewer-empty">${t("viewer.noTexture")}</p>`;
        return;
      }

      content.innerHTML = `<img class="viewer-texture-img" src="${skin.textureDataUrl}" alt="${escapeHtml(skin.displayName || skin.name)}">`;
    });
  });

  viewerResults.querySelectorAll(".viewer-btn-3d").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute("data-index"));
      const skin = viewerResults._skinsData[idx];
      const content = document.getElementById(`viewerContent-${idx}`);

      if (!skin.textureDataUrl) {
        content.innerHTML = `<p class="viewer-empty">${t("viewer.noTexture")}</p>`;
        return;
      }

      content.innerHTML = `<canvas class="viewer-3d-canvas"></canvas>`;
      const canvas = content.querySelector("canvas");

      // Wait a frame so the canvas has a real size in the DOM
      requestAnimationFrame(() => {
        open3DViewer(canvas, skin.textureDataUrl, skin.isSlim);
      });
    });
  });
}

async function handleViewerFile(file) {
  viewerSelectedFile.textContent = file.name;

  const lowerName = file.name.toLowerCase();
  const validExtension = lowerName.endsWith(".zip") || lowerName.endsWith(".mcpack");

  if (!validExtension) {
    viewerSelectedFile.textContent = t("validator.invalidExtSelected");
    viewerShowMessage(t("validator.invalidExtText"));
    return;
  }

  viewerShowMessage(t("viewer.loading"));

  try {
    const zip = await JSZip.loadAsync(file);
    const skins = await parseNormalSkinPack(zip);

    if (!skins) {
      viewerSelectedFile.textContent = t("validator.notPackSelected");
      viewerShowMessage(t("viewer.notASkinPack"));
      return;
    }

    renderViewerSkins(skins);

    if (typeof mbsmBumpStat === "function") mbsmBumpStat("skins", skins.length);
    if (typeof mbsmAddRecent === "function") mbsmAddRecent("skin", file.name);

  } catch (err) {
    console.error(err);
    viewerSelectedFile.textContent = t("validator.invalidFileSelected");
    viewerShowMessage(t("validator.invalidFileText"));
  }
}

if (viewerDropzone && viewerZipInput) {

  viewerZipInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleViewerFile(e.target.files[0]);
  });

  viewerDropzone.addEventListener("click", (e) => {
    if (e.target.closest(".file-button")) return;
  });

  ["dragenter", "dragover"].forEach(evt => {
    viewerDropzone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      viewerDropzone.classList.add("drag");
    });
  });

  ["dragleave", "dragend", "drop"].forEach(evt => {
    viewerDropzone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      viewerDropzone.classList.remove("drag");
    });
  });

  viewerDropzone.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    if (file) handleViewerFile(file);
  });
}


// ---------- Inicializar ----------
resetStats();
mbsmRenderDashboard();

let savedLang = "en";
try {
  const stored = localStorage.getItem("mbsm_lang");
  if (stored === "es" || stored === "en") savedLang = stored;
} catch (e) {}

applyLanguage(savedLang);

// ==========================================================
// 4D/5D Viewer (SkinGeo Viewer) -- lazy init: only starts up
// Three.js/Blockbench the first time the user opens that sub-tab, so we
// don't burn resources if they never do. Doesn't touch
// switchTab()/switchSubTab() or viewer.js.
// ==========================================================
(function () {
  var sgTabBtn = document.querySelector('.sub-tab-btn[data-subtab="sgTabViewer"]');
  if (!sgTabBtn) return;
  sgTabBtn.addEventListener("click", function () {
    if (typeof SkinGeoViewer !== "undefined") SkinGeoViewer.init();
  });
})();

// ==========================================================
// OBJ -> Skin 1.8 (used to be obj-skin-studio.html, loaded via iframe) --
// same lazy-init idea: only starts up Three.js/its UI the first time the
// user opens that sub-tab.
// ==========================================================
(function () {
  var objSkinTabBtn = document.querySelector('.sub-tab-btn[data-subtab="sgTabObjSkin"]');
  if (!objSkinTabBtn) return;
  objSkinTabBtn.addEventListener("click", function () {
    if (typeof ObjSkinStudio !== "undefined") ObjSkinStudio.init();
  });
})();

// ==========================================================
// Page routing, part 2: apply whatever URL the page was opened with.
// This runs last on purpose -- switchTab()/switchSubTab() (triggered
// from applyRoute()) rely on the sidebar labels already being
// translated (applyLanguage() above) and, when the route points at the
// 4D/5D Viewer or OBJ -> Skin 1.8, on their lazy-init click hooks (just
// above) already being attached so a direct link actually starts them.
// ==========================================================
applyRoute(initialRoute);

// Normalize the address bar to the canonical route path (covers things
// like a trailing-slash mismatch or a stray "index.html").
(function normalizeInitialUrl() {
  const activeSection = document.querySelector(".tab-section.active-tab");
  if (!activeSection) return;
  const subtab = currentTopLevelSubtab(activeSection.id);
  const canonicalPath = pathForRoute(activeSection.id, subtab);
  if (window.location.pathname !== canonicalPath) {
    history.replaceState({ tab: activeSection.id, subtab }, "", canonicalPath);
  }
})();
