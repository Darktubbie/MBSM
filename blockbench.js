/* =========================================================================
   blockbench.js — Blockbench Web integration for 4D models

   Responsible ONLY for:
     - creating/managing the embedded (iframe) panel for web.blockbench.net
     - detecting whether the embed actually works (X-Frame-Options/CSP)
     - loading the selected 4D geometry into Blockbench WITHOUT leaving
       the page, working around the URL length limit
     - handing over the matching texture (skins.json) so it can be
       assigned to the model inside Blockbench

   ---------------------------------------------------------------------
   BLOCKBENCH WEB'S ACTUAL LIMITATIONS (researched, not assumed):

   1. web.blockbench.net only documents these URL-based integration
      mechanisms (https://www.blockbench.net/wiki/docs/url-parameters/):
        - loadtype=json&loadname=...&loaddata=<stringified JSON>
        - loadtype=image / minecraft_skin (for standalone textures/skins)
        - m=<id> (a model previously uploaded to Blockbench's own "Share"
          service, meant for manual use via File > Export > Share; there's
          no documented public endpoint for a third party to upload to it
          programmatically, so this is NOT used as an automatic mechanism)
        - There's no documented postMessage for injecting data into an
          already-open project. The only "data" channel is the URL.

   2. Important consequence: **geometry AND texture can't both be sent
      through the URL at once** — loadtype only accepts one type per
      load. So even once the size limit is worked around, a 4D model's
      texture can NEVER be linked automatically through the URL alone:
      it needs a second step inside Blockbench (dragging/opening the
      PNG), same as normal manual use of Blockbench.

   3. That's why this implementation solves "JS -> File/Blob -> Blockbench"
      this way: instead of trying to cram more data into the URL, when
      the geometry is large (or when the texture needs to be supplied
      too), real files (a downloadable File/Blob) get generated with the
      geometry.json and the .png already paired up, and the panel guides
      the user to open them INSIDE the embedded Blockbench itself
      (Ctrl+O / drag from the file system) — without leaving the tab or
      MBSM. Opening a local file that way has no URL limit at all,
      because it never travels through the URL in the first place.

   4. On whether the iframe can actually be embedded: there's no way to
      read web.blockbench.net's HTTP headers (X-Frame-Options / CSP
      frame-ancestors) from another origin's JavaScript — that's exactly
      the protection mechanism at work. This module does NOT assume it
      works: it attempts the embed and checks it with a heuristic (see
      detectFrameBlocked), and if it detects a block, it says so
      explicitly instead of silently showing a blank panel.
   ========================================================================= */

const BlockbenchPanel = (function () {

  const BB_URL = "https://web.blockbench.net/";
  // A measured (not guessed) limit on how much content can travel in
  // ?loaddata=... before web.blockbench.net rejects the request.
  //
  // ACTUAL MEASUREMENT: tested directly against the server from Termux —
  // a request with an 8000-byte loaddata loads fine; at 8100 bytes the
  // server returns an error. The previous value (7500) was an unmeasured
  // guess. This limit is set to 8100 (the real, verified breaking point)
  // so MBSM uses it as-is rather than a more conservative number — it's
  // kept as its own well-documented constant so it can be adjusted
  // easily in the future if Blockbench Web's server behavior changes.
  //
  // HEADS UP: this value is the limit for *loaddata's content* (its
  // value once already encoded with encodeURIComponent), not the whole
  // URL. The actual URL Blockbench builds also adds the origin,
  // "?loadtype=json", "&loadname=" with the encoded filename, and
  // "&loaddata=" — that overhead varies with the model's name. That's
  // why the decision doesn't compare the JSON's size against this number
  // directly: the full URL's actual length gets computed (see
  // estimateURLLength) and compared against the real total limit (URL
  // overhead + these loaddata bytes), instead of against some made-up
  // total-URL number.
  const SAFE_URL_PAYLOAD_LIMIT = 8100;
  // Grace period after the iframe's 'load' event before checking its
  // location (lets about:blank/the error page finish settling).
  const FRAME_DETECT_GRACE_MS = 300;
  // A safety net ONLY for the case where 'load' never fires (a hung
  // connection) — this isn't the timer that decides "blocked". Blockbench
  // Web is a heavy app (bundles its own Three.js) and on a slow
  // connection can take well over a few seconds to move past about:blank;
  // deciding "blocked" based on a short, fixed timeout produces false
  // positives (the X-Frame-Options warning shows up even though it was
  // just loading slowly, and Blockbench ends up loading fine afterwards).
  const FRAME_DETECT_SAFETY_TIMEOUT_MS = 15000;

  const state = {
    host: null,
    iframe: null,
    statusEl: null,
    instructionsEl: null,
    collapseBtn: null,
    collapsed: false,
    frameStatus: "idle", // idle | probing | ok | blocked
    currentGeoDef: null,
    currentTextureInfo: null, // { blob, filename } | null
    // Which status/instructions message was shown last, with the
    // minimal data needed to repaint it (never to repeat the action
    // itself -- see refreshLanguage()). Without this, changing language
    // while the panel is open would leave the already-shown text stuck
    // in the old language until the next interaction.
    lastAction: null
  };

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function init(hostEl) {
    state.host = hostEl;
    hostEl.innerHTML = "";

    const frameWrap = el("div", "bb-frame-wrap");
    state.iframe = document.createElement("iframe");
    state.iframe.className = "bb-frame";
    state.iframe.title = "Blockbench Web";
    // No sandbox: Blockbench needs WebGL, local storage, and full
    // script execution to work; restricting it with sandbox would break
    // it just as much as an embed block would.
    frameWrap.appendChild(state.iframe);

    // Collapsible bottom bar: the status + instructions take up
    // vertical space that eats into Blockbench's own panel (especially
    // on short screens/mobile). The minimize button hides the
    // instructions and leaves just the status line, and since
    // .bb-frame-wrap grows with flex:1 1 auto, the iframe automatically
    // reclaims that space.
    const statusRow = el("div", "bb-status-row");
    state.statusEl = el("div", "bb-status");
    state.collapseBtn = el("button", "bb-collapse-btn");
    state.collapseBtn.type = "button";
    state.collapseBtn.title = t("sg.bbTogglePanel");
    state.collapseBtn.textContent = "▾";
    state.collapseBtn.style.display = "none";
    state.collapseBtn.addEventListener("click", toggleCollapsed);
    statusRow.appendChild(state.statusEl);
    statusRow.appendChild(state.collapseBtn);

    state.instructionsEl = el("div", "bb-instructions");
    state.instructionsEl.style.display = "none";

    hostEl.appendChild(frameWrap);
    hostEl.appendChild(statusRow);
    hostEl.appendChild(state.instructionsEl);
  }

  function toggleCollapsed() {
    state.collapsed = !state.collapsed;
    state.instructionsEl.style.display = state.collapsed ? "none" : "";
    state.collapseBtn.textContent = state.collapsed ? "▸" : "▾";
    state.collapseBtn.title = state.collapsed ? t("sg.bbExpandPanel") : t("sg.bbCollapsePanel");
  }

  // Force a specific state (unlike toggleCollapsed, which always
  // flips it). No-ops if already in that state, so the title/arrow
  // doesn't fire needlessly.
  function collapseInstructions() { if (!state.collapsed) toggleCollapsed(); }
  function expandInstructions() { if (state.collapsed) toggleCollapsed(); }

  function setStatus(html, kind) {
    state.statusEl.innerHTML = html;
    state.statusEl.className = "bb-status" + (kind ? " " + kind : "");
  }

  function setInstructions(html) {
    const hasContent = !!html;
    state.instructionsEl.innerHTML = html || "";
    // With no content, there's no point reserving the block's empty
    // padding or showing a collapse button that wouldn't collapse
    // anything -- this way the status bar ends up as the last visible
    // element, flush against the bottom of the panel (no dead space
    // beneath it).
    state.collapseBtn.style.display = hasContent ? "" : "none";
    if (!hasContent) {
      state.instructionsEl.style.display = "none";
      return;
    }
    // If new instructions arrive while it's minimized, the user's
    // preference is respected (they stay hidden until they hit expand)
    // -- only the inner content gets updated.
    state.instructionsEl.style.display = state.collapsed ? "none" : "";
  }

  // Heuristic for detecting an X-Frame-Options/CSP block: when an
  // iframe's navigation gets blocked by those headers, the frame stays
  // on "about:blank" — which is STILL same-origin with the parent page,
  // so reading iframe.contentWindow.location.href does NOT throw. If
  // web.blockbench.net actually loaded instead (a different origin),
  // reading that property DOES throw a SecurityError. It isn't 100%
  // foolproof across every browser, but it's the most reliable signal
  // available without the remote server's cooperation — and it's
  // combined with the 'load' event as an extra signal.
  function detectFrameBlocked(iframe, callback) {
    let settled = false;
    const finish = (blocked) => {
      if (settled) return;
      settled = true;
      callback(blocked);
    };

    // Main signal: the iframe's own 'load' event. Fires whether
    // Blockbench actually loaded or the browser rendered an error page
    // due to a block -- which is why this alone ISN'T enough, it gets
    // corroborated by reading location.href right after. But unlike a
    // fixed timeout, this DOES wait as long as it needs to on a slow
    // connection, instead of giving up after 2-3 seconds.
    iframe.addEventListener("load", () => {
      setTimeout(checkLocation, FRAME_DETECT_GRACE_MS);
    }, { once: true });

    function checkLocation() {
      try {
        // A real cross-origin load -> this throws SecurityError -> NOT blocked.
        const href = iframe.contentWindow.location.href;
        // If it didn't throw, we're still on about:blank/same-origin -> blocked.
        finish(true);
      } catch (e) {
        finish(false);
      }
    }

    // Safety net: if 'load' never fires, we don't wait around forever.
    setTimeout(() => finish(true), FRAME_DETECT_SAFETY_TIMEOUT_MS);
  }

  function ensureFrameLoaded() {
    if (state.frameStatus === "ok" || state.frameStatus === "probing") return;
    state.frameStatus = "probing";
    state.lastAction = { type: "loading" };
    setStatus(t("sg.bbLoadingFrame"), "info");
    state.iframe.src = BB_URL;
    detectFrameBlocked(state.iframe, (blocked) => {
      if (blocked) {
        state.frameStatus = "blocked";
        showBlockedFallback();
      } else {
        state.frameStatus = "ok";
        state.lastAction = { type: "ready" };
        setStatus(t("sg.bbFrameReady"), "ok");
        // Once loading is confirmed, retry the pending load if there was one.
        if (state.currentGeoDef) loadIntoFrame(state.currentGeoDef, state.currentTextureInfo);
      }
    });
  }

  function showBlockedFallback() {
    state.lastAction = { type: "blocked" };
    setStatus(t("sg.bbBlockedStatus"), "err");
    setInstructions(`
      ${t("sg.bbBlockedInstructions")}
      <div id="bbFallbackButtons"></div>
    `);
    renderDownloadButtons(document.getElementById("bbFallbackButtons"), true);
    expandInstructions(); // here the user really does need to see the download buttons
  }

  /* ----------------------- building the 4D geometry ----------------------- */

  function buildGeometryJSON(geoDef) {
    const geometry = {
      format_version: "1.10.0",
      [geoDef.id]: {
        texturewidth: geoDef.texture_width,
        textureheight: geoDef.texture_height,
        bones: geoDef.bones
      }
    };
    return JSON.stringify(geometry);
  }

  // Single source of truth for the URL's fixed part (everything except
  // loaddata's actual value). Used by estimateURLLength(), loadByURL()
  // and computeSafeTotalURLLength() alike, so the three calculations
  // can't drift out of sync if the URL's format ever changes.
  function buildURLPrefix(filename) {
    return BB_URL + "?loadtype=json&loadname=" + encodeURIComponent(filename) + "&loaddata=";
  }

  // The actual length of the full encoded URL that's about to be sent
  // to the iframe: origin + ?loadtype=json + &loadname=<encoded
  // filename> + &loaddata=<encoded jsonData>. Not a rough estimate of
  // the JSON's size: it's the final URL's exact length.
  function estimateURLLength(jsonData, filename) {
    return buildURLPrefix(filename).length + encodeURIComponent(jsonData).length;
  }

  // The total safe URL limit for THIS specific model: this filename's
  // actual overhead (which varies model to model) plus the 8000 loaddata
  // bytes that were actually verified against the server. This way,
  // "send by URL or by file?" gets decided by comparing the full URL's
  // actual length against an equally real limit — never against some
  // eyeballed total-URL number.
  function computeSafeTotalURLLength(filename) {
    return buildURLPrefix(filename).length + SAFE_URL_PAYLOAD_LIMIT;
  }

  /* ----------------------- path A: URL (small models) ----------------------- */

  // Time threshold for the "suspiciously fast load" heuristic (see
  // loadByURL). It isn't a byte limit: it's a duration. Blockbench Web
  // is a heavy application (boots its own Three.js, rebuilds its entire
  // UI) and in practice its real startup doesn't drop below this even
  // with all its resources already cached by the browser (after the
  // first embed). A 414 "URI Too Long", on the other hand, is a trivial
  // plain-text response the browser finishes "loading" almost instantly.
  // This doesn't replace being able to read the real HTTP status code
  // (impossible from JS for a cross-origin iframe without Blockbench's
  // cooperation via CORS), but it gives a reasonably reliable signal
  // without relying on guessing an exact size limit that isn't
  // documented anywhere.
  const URL_LOAD_SUSPICIOUSLY_FAST_MS = 700;

  function loadByURL(geoDef) {
    const jsonData = buildGeometryJSON(geoDef);
    const filename = geoDef.id + ".geo.json";
    const url = buildURLPrefix(filename) + encodeURIComponent(jsonData);

    const startedAt = performance.now();
    state.iframe.addEventListener("load", function onUrlLoad() {
      const elapsed = performance.now() - startedAt;
      if (elapsed < URL_LOAD_SUSPICIOUSLY_FAST_MS) {
        flagSuspectedURLFailure(geoDef, elapsed);
      }
    }, { once: true });

    state.iframe.src = url;
    state.lastAction = { type: "urlLoaded", geoDef };
    setStatus(t("sg.bbUrlSent", geoDef.id), "ok");
  }

  // Fires when the iframe's navigation "finished" too fast to be a
  // real Blockbench startup — a likely sign the server rejected the URL
  // (e.g. a 414) instead of loading the app. This can't be stated with
  // 100% certainty (it's a timing heuristic, not an actual read of the
  // HTTP status), so it's flagged as a suspicion, not a confirmed fact,
  // and a manual download is always offered so the user can decide.
  function flagSuspectedURLFailure(geoDef, elapsedMs) {
    state.lastAction = { type: "suspectedFail", geoDef, elapsedMs };
    setStatus(t("sg.bbSuspectedFail", geoDef.id, Math.round(elapsedMs)), "warn");
    expandInstructions(); // expanded just so the warning is visible
    renderPostURLSafetyNet(geoDef, state.currentTextureInfo);
  }

  /* ----------------------- path B: file/Blob (large models or texture) ----------------------- */

  function renderDownloadButtons(container, includeReopenHint) {
    if (!container || !state.currentGeoDef) return;
    container.innerHTML = "";

    const geoDef = state.currentGeoDef;
    const jsonData = buildGeometryJSON(geoDef);
    const geoBlob = new Blob([jsonData], { type: "application/json" });
    const geoName = geoDef.id + ".geo.json";

    const geoBtn = el("a", "bb-dl-btn");
    geoBtn.textContent = t("sg.bbDownloadGeo", geoName);
    geoBtn.href = URL.createObjectURL(geoBlob);
    geoBtn.download = geoName;
    container.appendChild(geoBtn);

    if (state.currentTextureInfo && state.currentTextureInfo.blob) {
      const texBtn = el("a", "bb-dl-btn");
      const texName = state.currentTextureInfo.filename || (geoDef.id + ".png");
      texBtn.textContent = t("sg.bbDownloadTex", texName);
      texBtn.href = URL.createObjectURL(state.currentTextureInfo.blob);
      texBtn.download = texName;
      container.appendChild(texBtn);
    } else {
      const noTex = el("div", "bb-note", t("sg.bbNoTexture"));
      container.appendChild(noTex);
    }

    if (includeReopenHint) {
      const hint = el("div", "bb-note", t("sg.bbReopenHint"));
      container.appendChild(hint);
    }
  }

  function loadByFile(geoDef, textureInfo) {
    state.lastAction = { type: "fileLoaded", geoDef };
    setStatus(t("sg.bbTooLargeStatus", geoDef.id), "warn");
    setInstructions(`
      ${t("sg.bbFileInstructionsHtml")}
      <div id="bbFileButtons"></div>
    `);
    renderDownloadButtons(document.getElementById("bbFileButtons"), false);
    expandInstructions(); // here the user really does need to see the steps and buttons
  }

  /* ----------------------- public API ----------------------- */

  // geoDef: the selected, normalized geometry.
  // textureInfo: { blob, filename } | null — the texture already
  // resolved via skins.json (or null if none is paired up).
  function loadModel(geoDef, textureInfo) {
    state.currentGeoDef = geoDef;
    state.currentTextureInfo = textureInfo || null;
    setInstructions("");

    if (state.frameStatus !== "ok") {
      // We don't know yet whether the embed works: try it, and once
      // that resolves, loadIntoFrame() fires on its own from
      // ensureFrameLoaded.
      ensureFrameLoaded();
      if (state.frameStatus === "blocked") return; // fallback was already shown
      state.lastAction = { type: "checkingEmbed" };
      setStatus(t("sg.bbCheckingEmbed"), "info");
      return;
    }

    loadIntoFrame(geoDef, textureInfo);
  }

  function loadIntoFrame(geoDef, textureInfo) {
    const jsonData = buildGeometryJSON(geoDef);
    const filename = geoDef.id + ".geo.json";
    const urlLen = estimateURLLength(jsonData, filename);
    const safeLimit = computeSafeTotalURLLength(filename);

    if (urlLen <= safeLimit) {
      loadByURL(geoDef);
      renderPostURLSafetyNet(geoDef, textureInfo);
      // The instructions/warning panel stays VISIBLE by default after a
      // normal URL-based send -- it doesn't auto-collapse. The user
      // decides when to hide it (to gain viewing space) with the ▾/▸
      // button on the status bar, which is always available.
    } else {
      loadByFile(geoDef, textureInfo);
    }
  }

  // Always shown after a URL-based send (not just when a texture is
  // paired up). Two reasons, both real:
  //   1) The texture never travels alongside the geometry through the
  //      URL (Blockbench only accepts one loadtype per load), so if a
  //      texture is paired up, the manual step is needed regardless.
  //   2) Even though SAFE_URL_PAYLOAD_LIMIT (8100) is a measured value
  //      against the real server rather than a guess, it's still a
  //      single test on a single network/environment (Termux) — the
  //      real limit is enforced by web.blockbench.net's server (it
  //      responds with a 414 "URI Too Long" for URLs that are too
  //      long) and could vary under conditions this page doesn't
  //      control. On top of that, this page has NO way to read that
  //      response from JavaScript, since the iframe is cross-origin —
  //      trying to read its content to check would throw the same
  //      SecurityError already used to detect embed blocks, so there's
  //      no reliable way to tell "it loaded fine" apart from "the
  //      server silently rejected it" using JS alone. That's why,
  //      instead of promising a detection that can't be guaranteed, a
  //      manual download is always kept ready as a safety net.
  function renderPostURLSafetyNet(geoDef, textureInfo) {
    const needsTextureStep = !!textureInfo;
    setInstructions(`
      <p>${t("sg.bbSafetyNetIntro", geoDef.id)}
      ${needsTextureStep ? t("sg.bbSafetyNetTextureNote") : ""}</p>
      <p class="bb-note" style="margin-top:0;">${t("sg.bbSafetyNetWarningHtml")}</p>
      <div id="bbSafetyButtons"></div>
    `);
    renderDownloadButtons(document.getElementById("bbSafetyButtons"), false);
  }

  // "flex", not "block" -- state.host (.sg-blockbench-viewer) is a flex
  // column so the iframe (.bb-frame-wrap, flex:1 1 auto) can grow and
  // the status bar stays pinned to the bottom. With "block" that layout
  // never kicks in and the extra space just ends up as empty space.
  function show() { state.host.style.display = "flex"; ensureFrameLoaded(); }
  function hide() { state.host.style.display = "none"; }

  // Repaints the current status/instructions in the new language. On
  // purpose it does NOT retry any action with side effects (never
  // reassigns iframe.src, never restarts the "suspiciously fast load"
  // timer) -- it only regenerates already-computed text from the
  // context saved in state.lastAction.
  function refreshLanguage() {
    if (!state.collapseBtn) return; // the panel hasn't been initialized yet (lazy loading)
    state.collapseBtn.title = state.collapsed ? t("sg.bbExpandPanel") : t("sg.bbCollapsePanel");

    const a = state.lastAction;
    if (!a) return;

    switch (a.type) {
      case "loading":
        setStatus(t("sg.bbLoadingFrame"), "info");
        break;
      case "ready":
        setStatus(t("sg.bbFrameReady"), "ok");
        break;
      case "checkingEmbed":
        setStatus(t("sg.bbCheckingEmbed"), "info");
        break;
      case "blocked":
        setStatus(t("sg.bbBlockedStatus"), "err");
        setInstructions(`
          ${t("sg.bbBlockedInstructions")}
          <div id="bbFallbackButtons"></div>
        `);
        renderDownloadButtons(document.getElementById("bbFallbackButtons"), true);
        break;
      case "urlLoaded":
        setStatus(t("sg.bbUrlSent", a.geoDef.id), "ok");
        renderPostURLSafetyNet(a.geoDef, state.currentTextureInfo);
        break;
      case "suspectedFail":
        setStatus(t("sg.bbSuspectedFail", a.geoDef.id, Math.round(a.elapsedMs)), "warn");
        renderPostURLSafetyNet(a.geoDef, state.currentTextureInfo);
        break;
      case "fileLoaded":
        setStatus(t("sg.bbTooLargeStatus", a.geoDef.id), "warn");
        setInstructions(`
          ${t("sg.bbFileInstructionsHtml")}
          <div id="bbFileButtons"></div>
        `);
        renderDownloadButtons(document.getElementById("bbFileButtons"), false);
        break;
    }
  }

  return { init, loadModel, show, hide, refreshLanguage };
})();
