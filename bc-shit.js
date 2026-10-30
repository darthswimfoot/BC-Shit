(async () => {
  "use strict";
  console.info("[BC-Shit] script execution started", location.href);
  const itemName = "TogrutaHeadTailsSmallFront";
  const backItemName = "TogrutaHeadTailsSmallBack";
  const textureCommit = "d3573ce06148c8be74f3d0985190ccbfeff40e98";
  const textureRoot = "https://cdn.jsdelivr.net/gh/darthswimfoot/BC-Shit@" + textureCommit + "/";
  const sourceTexture = textureRoot + "togrutaheadtailssmallfront.png";
  const stripeSourceTexture = textureRoot + "togrutaheadtailssmallfrontstripes.png";
  const backSourceTexture = textureRoot + "togrutaheadtailssmallback.png";
  const backStripeSourceTexture = textureRoot + "togrutaheadtailssmallbackstripes.png";
  // Shift visible pixels 50px right inside the original back canvas. Apply
  // the identical transform to the back stripe overlay so both layers align.
  async function alignBackTexture(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let response;
    try { response = await fetch(url, { signal: controller.signal }); }
    finally { clearTimeout(timeoutId); }
    if (!response.ok) throw new Error("HTTP " + response.status);
    const bitmap = await createImageBitmap(await response.blob());
    try {
      if (bitmap.width !== 300 || bitmap.height !== 500) return url;
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 500;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 50, 0);
      return canvas.toDataURL("image/png");
    } finally { bitmap.close?.(); }
  }
  let alignedBackTexture = backSourceTexture;
  let alignedBackStripeTexture = backStripeSourceTexture;
  try { alignedBackTexture = await alignBackTexture(backSourceTexture); }
  catch (error) { console.warn("BC-Shit: using original back texture because canvas alignment failed:", error); }
  try { alignedBackStripeTexture = await alignBackTexture(backStripeSourceTexture); }
  catch (error) { console.warn("BC-Shit: using original back stripe overlay because canvas alignment failed:", error); }
  if (window.__bcShitHeadTailsInstalled) {
    alert("BC-Shit is already installed for this game session.");
    return;
  }
  const restores = [];
  const groupDef = window.AssetFemale3DCG?.find(g => g.Group === "HairFront");
  const group = window.AssetGroupGet?.("Female3DCG", "HairFront");
  // Most standard hair assets are listed as strings in the raw group
  // definition. Only some specialized assets are objects with Name/Layer.
  // Normalize string entries to a minimal definition instead of spreading
  // a string into numeric character properties.
  const frontEntry = groupDef?.Asset?.find(a =>
    (typeof a === "string" && a === "HairFront1") ||
    (a && typeof a === "object" && a.Name === "HairFront1")
  ) || groupDef?.Asset?.find(a =>
    (typeof a === "string" && a === "FrontHair1") ||
    (a && typeof a === "object" && a.Name === "FrontHair1")
  ) || groupDef?.Asset?.[0];
  const base = typeof frontEntry === "string" ? { Name: frontEntry } : frontEntry;
  const backGroupDef = window.AssetFemale3DCG?.find(g => g.Group === "HairBack");
  const backGroup = window.AssetGroupGet?.("Female3DCG", "HairBack");
  // HairBack1 is also a valid base when it has no explicit Layer array:
  // AssetAdd/AssetBuildLayer supplies the engine's normal single layer.
  // Avoid borrowing a different hairstyle's multi-layer setup.
  const backEntry = backGroupDef?.Asset?.find(a =>
    (typeof a === "string" && a === "HairBack1") ||
    (a && typeof a === "object" && a.Name === "HairBack1")
  ) || backGroupDef?.Asset?.find(a => typeof a === "string") || backGroupDef?.Asset?.[0];
  const backBase = typeof backEntry === "string" ? { Name: backEntry } : backEntry;
  if (!groupDef || !group || !base || !backGroupDef || !backGroup || !backBase) {
    alert("Togruta head-tails: no usable HairFront or HairBack template was found.");
    return;
  }
  const mapImageUrl = url => {
    if (typeof url !== "string") return url;
    const path = url.split("?")[0];
    // Match every image variant the game may request (preview, inventory,
    // size, and layer textures), not just the few known suffixes. A first-time
    // asset render can request a different variant than later cached renders.
    // The renderer may build paths from DynamicGroupName, asset group,
    // or inventory paths depending on the drawing context. The unique asset
    // name is the stable part across those variants.
    // URL builders in the game and cache may normalize asset-name casing.
    // Compare case-insensitively so the first uncached request is redirected too.
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes(itemName.toLowerCase())) {
      return lowerPath.includes("stripes") ? stripeSourceTexture : sourceTexture;
    }
    if (lowerPath.includes(backItemName.toLowerCase())) {
      return lowerPath.includes("stripes") ? alignedBackStripeTexture : alignedBackTexture;
    }
    return url;
  };
  // Resolve R133 caches whether the game exposes them as window properties
  // or as top-level lexical bindings.
  const getGameCache = name => {
    if (name === "DrawImageCache") {
      if (window.DrawImageCache) return window.DrawImageCache;
      try { if (typeof DrawImageCache !== "undefined") return DrawImageCache; } catch {}
    }
    if (name === "GLDrawImageCache") {
      if (window.GLDrawImageCache) return window.GLDrawImageCache;
      try { if (typeof GLDrawImageCache !== "undefined") return GLDrawImageCache; } catch {}
    }
    return null;
  };
  // R133 has separate decoded-image and WebGL texture caches. Wait for them
  // to exist before hooking; the game can initialize these after script tags.
  async function waitForGameCaches() {
    const started = Date.now();
    while (Date.now() - started < 12000) {
      if (getGameCache("DrawImageCache") || getGameCache("GLDrawImageCache")) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  await waitForGameCaches();
  if (!window.__bcShitTogrutaCacheGetInstalled) {
    const pendingTextureEntries = new WeakSet();
    const redrawAfterTextureReady = (entry, url) => {
      if (!entry || (typeof entry !== "object" && typeof entry !== "function") || pendingTextureEntries.has(entry)) return;
      if (typeof entry.isLoaded === "function" && entry.isLoaded() && entry.data) return;
      if (typeof entry.isDoneLoading !== "function") return;
      pendingTextureEntries.add(entry);
      const started = Date.now();
      const check = () => {
        if (typeof entry.isLoaded === "function" && entry.isLoaded() && entry.data) {
          console.log("[BC-Shit Togruta] texture ready; refreshing character", url);
          try {
            if (window.Player) window.Player.MustDraw = true;
            if (typeof window.CharacterLoadCanvasAll === "function") window.CharacterLoadCanvasAll();
          } catch (error) {
            console.warn("[BC-Shit Togruta] character refresh after texture load failed", error);
          }
          return;
        }
        if (entry.isDoneLoading() || Date.now() - started >= 15000) {
          console.warn("[BC-Shit Togruta] texture finished without drawable data or timed out", {
            url, state: entry.state, hasData: !!entry.data
          });
          return;
        }
        setTimeout(check, 50);
      };
      setTimeout(check, 50);
    };
    const hookedCaches = [];
    for (const cacheName of ["DrawImageCache", "GLDrawImageCache"]) {
      const cache = getGameCache(cacheName);
      if (!cache || typeof cache.get !== "function") {
        console.warn("[BC-Shit Togruta] cache unavailable; could not hook " + cacheName, {
          windowProperty: !!window[cacheName],
          getType: typeof cache?.get
        });
        continue;
      }
      const originalCacheGet = cache.get;
      cache.get = function (url, ...args) {
        const mappedUrl = mapImageUrl(url);
        const entry = originalCacheGet.call(this, mappedUrl, ...args);
        if (mappedUrl !== url) {
          console.log("[BC-Shit Togruta] redirected " + cacheName, { requested: url, mapped: mappedUrl });
          redrawAfterTextureReady(entry, mappedUrl);
        }
        return entry;
      };
      hookedCaches.push({ cache, originalCacheGet, cacheName });
      console.log("[BC-Shit Togruta] hooked " + cacheName);
    }
    let originalGlLoadImage = null;
    if (typeof window.GLDrawLoadImage === "function") {
      originalGlLoadImage = window.GLDrawLoadImage;
      window.GLDrawLoadImage = function (gl, url, ...args) {
        const mappedUrl = mapImageUrl(url);
        if (mappedUrl !== url) console.log("[BC-Shit Togruta] redirected GLDrawLoadImage", { requested: url, mapped: mappedUrl });
        return originalGlLoadImage.call(this, gl, mappedUrl, ...args);
      };
      console.log("[BC-Shit Togruta] hooked GLDrawLoadImage");
    } else {
      console.warn("[BC-Shit Togruta] GLDrawLoadImage not exposed on window");
    }
    window.__bcShitTogrutaCacheGetInstalled = true;
    console.log("[BC-Shit Togruta] cache-hook summary", {
      hooked: hookedCaches.map(item => item.cacheName),
      drawImageCacheType: typeof getGameCache("DrawImageCache")?.get,
      glDrawImageCacheType: typeof getGameCache("GLDrawImageCache")?.get
    });
    restores.push(() => {
      for (const item of hookedCaches) item.cache.get = item.originalCacheGet;
      if (originalGlLoadImage) window.GLDrawLoadImage = originalGlLoadImage;
      delete window.__bcShitTogrutaCacheGetInstalled;
    });
  }

  // Keep a fetch redirect as a fallback for other code paths which load an
  // asset directly instead of consulting DrawImageCache.
  if (!window.__bcShitTogrutaFetchInstalled) {
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      const requestUrl = typeof input === "string" ? input
        : input && typeof input.url === "string" ? input.url : "";
      const mappedUrl = mapImageUrl(requestUrl);
      const isTogrutaCdnUrl = typeof requestUrl === "string" && requestUrl.startsWith(textureRoot);
      if (mappedUrl !== requestUrl || isTogrutaCdnUrl) {
        // R133 may already have redirected the cache key to our CDN URL before
        // fetch runs. Handle those URLs too, not only original game asset paths.
        // Merge Request and init headers, then remove conditional headers that
        // jsDelivr rejects during CORS preflight.
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init?.headers || undefined).forEach((value, key) => headers.set(key, value));
        headers.delete("if-none-match");
        headers.delete("if-modified-since");
        const safeInit = { ...(init || {}), headers, cache: "no-store" };
        return originalFetch.call(this, mappedUrl, safeInit);
      }
      return originalFetch.call(this, input, init);
    };
    window.__bcShitTogrutaFetchInstalled = true;
    restores.push(() => {
      window.fetch = originalFetch;
      delete window.__bcShitTogrutaFetchInstalled;
    });
  }

  // Preload BOTH R133 caches before making the assets selectable. The
  // decoded-image cache alone does not warm GLDrawImageCache, which can cause
  // the first selection to render without the texture.
  async function preloadGameCache(cacheName, url) {
    const cache = getGameCache(cacheName);
    if (!cache || typeof cache.get !== "function") { console.warn("[BC-Shit Togruta] preload skipped: cache unavailable", cacheName); return; }
    let entry;
    try {
      entry = cache.get(url);
    } catch (error) {
      console.warn("BC-Shit: could not start " + cacheName + " preload:", url, error);
      return;
    }
    if (!entry || typeof entry.isDoneLoading !== "function") { console.warn("[BC-Shit Togruta] preload skipped: unexpected cache entry", cacheName, url, entry); return; }
    const started = Date.now();
    while (!entry.isDoneLoading() && Date.now() - started < 15000) {
      if (entry.state === "error" || entry.state === "failed" || entry.isFailing?.()) {
        console.warn("BC-Shit: " + cacheName + " preload failed:", url, entry.state);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        entry = cache.get(url) || entry;
      } catch { /* retain the original entry while it finishes */ }
    }
    if (!entry.isDoneLoading() || !entry.data) {
      console.warn("BC-Shit: " + cacheName + " preload timed out or has no data:", url, entry.state);
    } else {
      console.info("[BC-Shit Togruta] preloaded " + cacheName, url);
    }
  }

  // Let R133's native ImageCache own decoding and cache state. Do not insert
  // HTMLImageElement objects into its caches: DrawImageCache expects decoded
  // ImageBitmaps, while GLDrawImageCache stores GL texture data.
  console.log("[BC-Shit Togruta] startup diagnostics", {
    drawImageCacheWindow: !!window.DrawImageCache,
    drawImageCacheResolved: !!getGameCache("DrawImageCache"),
    drawImageCacheGet: typeof getGameCache("DrawImageCache")?.get,
    glDrawImageCacheWindow: !!window.GLDrawImageCache,
    glDrawImageCacheResolved: !!getGameCache("GLDrawImageCache"),
    glDrawImageCacheGet: typeof getGameCache("GLDrawImageCache")?.get,
    glDrawLoadImageWindow: typeof window.GLDrawLoadImage,
    frontTemplate: base?.Name,
    backTemplate: backBase?.Name
  });
  await Promise.all([
    preloadGameCache("DrawImageCache", sourceTexture),
    preloadGameCache("DrawImageCache", stripeSourceTexture),
    preloadGameCache("DrawImageCache", alignedBackTexture),
    preloadGameCache("DrawImageCache", alignedBackStripeTexture),
    preloadGameCache("GLDrawImageCache", sourceTexture),
    preloadGameCache("GLDrawImageCache", stripeSourceTexture),
    preloadGameCache("GLDrawImageCache", alignedBackTexture),
    preloadGameCache("GLDrawImageCache", alignedBackStripeTexture)
  ]);

  try {
    if (!window.AssetGet("Female3DCG", "HairFront", itemName)) {
      window.AssetAdd(group, {
        ...base, Name: itemName, Description: "Togruta Small",
        DescriptionPlural: "Togruta Small",
        DefaultColor: ["#FFFFFF", "#FFFFFF"],
        Layer: [{ Name: "Main" }, { Name: "Stripes" }]
      }, window.AssetFemale3DCGExtended, groupDef);
    }
    if (!window.AssetGet("Female3DCG", "HairBack", backItemName)) {
      const backAssetData = {
        ...backBase, Name: backItemName, Description: "Togruta Small",
        DescriptionPlural: "Togruta Small", Priority: 999999, LayerPriority: 999999,
        DefaultColor: ["#FFFFFF", "#FFFFFF"],
        Layer: [{ Name: "Main" }, { Name: "Stripes" }]
      };
      window.AssetAdd(backGroup, backAssetData, window.AssetFemale3DCGExtended, backGroupDef);
    }
  } catch (error) {
    restores.reverse().forEach(restore => restore());
    console.error("Togruta head-tails registration failed:", error);
    alert("Could not register Togruta head-tails. Check the browser console.");
    return;
  }

  // Set the registered asset's display description directly as well as
  // intercepting the game's name helpers. The internal Name stays stable.
  const registeredTogrutaAsset = window.AssetGet("Female3DCG", "HairFront", itemName);
  if (registeredTogrutaAsset) {
    registeredTogrutaAsset.Description = "Togruta Small";
    registeredTogrutaAsset.DescriptionPlural = "Togruta Small";
    registeredTogrutaAsset.DefaultColor = ["#FFFFFF", "#FFFFFF"];
    // Do not overwrite Layer here: AssetAdd has already converted the raw definitions
    // into fully mapped runtime layers (Alpha, Priority, PoseMapping, etc.).
  }
  const registeredTogrutaBackAsset = window.AssetGet("Female3DCG", "HairBack", backItemName);
  if (registeredTogrutaBackAsset) {
    registeredTogrutaBackAsset.Description = "Togruta Small";
    registeredTogrutaBackAsset.DescriptionPlural = "Togruta Small";
    registeredTogrutaBackAsset.Priority = 999999;
    registeredTogrutaBackAsset.LayerPriority = 999999;
    registeredTogrutaBackAsset.DefaultColor = ["#FFFFFF", "#FFFFFF"];
    // Do not overwrite Layer here: AssetAdd has already converted the raw definitions
    // into fully mapped runtime layers (Alpha, Priority, PoseMapping, etc.).
  }

  // Return modded layer labels directly from TextCache.get so the first
  // color-menu draw never briefly displays MISSING TEXT, even before CSV load.
  const togrutaLayerLabels = {
    [itemName + "Main"]: "Main",
    [itemName + "Stripes"]: "Stripes",
    ["HairFront" + itemName + "Main"]: "Main",
    ["HairFront" + itemName + "Stripes"]: "Stripes",
    [backItemName + "Main"]: "Main",
    [backItemName + "Stripes"]: "Stripes",
    ["HairBack" + backItemName + "Main"]: "Main",
    ["HairBack" + backItemName + "Stripes"]: "Stripes"
  };
  const installTogrutaTextCacheHook = () => {
    let cacheClass;
    try {
      if (typeof TextCache === "function") cacheClass = TextCache;
    } catch {}
    if (!cacheClass || !cacheClass.prototype || typeof cacheClass.prototype.get !== "function") {
      return false;
    }
    if (cacheClass.prototype.__bcShitTogrutaLabels) return true;
    const originalGet = cacheClass.prototype.get;
    cacheClass.prototype.get = function (key, ...args) {
      if (Object.prototype.hasOwnProperty.call(togrutaLayerLabels, key)) {
        return togrutaLayerLabels[key];
      }
      return originalGet.call(this, key, ...args);
    };
    Object.defineProperty(cacheClass.prototype, "__bcShitTogrutaLabels", { value: true });
    return true;
  };

  let togrutaLabelCache = null;
  let togrutaLabelRebuildUnsubscribe = null;
  const setTogrutaLayerLabels = () => {
    installTogrutaTextCacheHook();
    let names;
    try {
      if (typeof ItemColorLayerNames !== "undefined") names = ItemColorLayerNames;
    } catch {}
    if (!names && window.ItemColorLayerNames) names = window.ItemColorLayerNames;
    if (!names || !names.cache || typeof names.cache !== "object") return false;

    const applyLabels = () => {
      if (names.cache && typeof names.cache === "object") {
        Object.assign(names.cache, togrutaLayerLabels);
      }
    };
    if (names !== togrutaLabelCache) {
      if (typeof togrutaLabelRebuildUnsubscribe === "function") {
        togrutaLabelRebuildUnsubscribe();
      }
      togrutaLabelCache = names;
      togrutaLabelRebuildUnsubscribe = typeof names.onRebuild === "function"
        ? names.onRebuild(applyLabels, false)
        : null;
    }
    applyLabels();
    return true;
  };
  // Install early if TextCache exists; retry to catch lazy initialization.
  installTogrutaTextCacheHook();
  setInterval(setTogrutaLayerLabels, 250);

  if (!window.__bcShitTogrutaNameInstalled) {
    if (typeof window.AssetDescription === "function") {
      const originalAssetDescription = window.AssetDescription;
      window.AssetDescription = function (...args) {
        if (args.some(arg => arg && typeof arg === "object" &&
            (arg.Name === itemName || arg === registeredTogrutaAsset))) return "Togruta Small";
        if (args.some(arg => arg && typeof arg === "object" && (arg.Name === backItemName || arg === registeredTogrutaBackAsset))) return "Togruta Small";
        return originalAssetDescription.apply(this, args);
      };
    }
    if (typeof window.TextGet === "function") {
      const originalTextGet = window.TextGet;
      window.TextGet = function (key, ...args) {
        if (typeof key === "string" &&
            (key.includes(itemName) || key === "HairFront" + itemName ||
             key === "AssetHairFront" + itemName)) return "Togruta Small";
        if (typeof key === "string" && (key.includes(backItemName) || key === "HairBack" + backItemName || key === "AssetHairBack" + backItemName)) return "Togruta Small";
        return originalTextGet.call(this, key, ...args);
      };
    }
    window.__bcShitTogrutaNameInstalled = true;
  }

  // Rebuild existing character canvases after the assets and texture redirects
  // are registered. Newly added assets do not necessarily invalidate a canvas
  // that was already built before the custom texture became available.
  if (window.Player) window.Player.MustDraw = true;
  if (typeof window.CharacterLoadCanvasAll === "function") {
    try {
      window.CharacterLoadCanvasAll();
    } catch (error) {
      console.warn("BC-Shit: immediate character canvas rebuild failed:", error);
    }
  }

  // Request foreground ordering for the custom back lekku where supported by the game renderer.
  // HairBack assets normally draw behind other groups; these metadata values signal highest priority to compatible renderers.
  // A full renderer override is deliberately avoided so normal character rendering stays stable.
  // Experimental NPC body-customization hook:
  // AppearanceLoad filters the editor list by AllowCustomize, while group
  // permissions also depend on Clothing. Temporarily enable both flags for
  // every appearance group of the selected NPC while the editor initializes.
  // The editor keeps the resulting group list/permissions for this session;
  // restore shared asset metadata immediately after initialization.
  let bodyEditHookInstalled = false;
  if (
    typeof window.AppearanceLoad === "function" &&
    !window.__bcShitNpcBodyEditInstalled
  ) {
    const originalAppearanceLoad = window.AppearanceLoad;
    window.AppearanceLoad = function (...args) {
      const target = window.CharacterAppearanceSelection || window.Player;
      if (!target || target.ID === 0 || !Array.isArray(window.AssetGroup)) {
        return originalAppearanceLoad.apply(this, args);
      }

      const changed = [];
      for (const assetGroup of window.AssetGroup) {
        if (
          assetGroup &&
          assetGroup.Family === target.AssetFamily &&
          assetGroup.Category === "Appearance"
        ) {
          changed.push({
            group: assetGroup,
            hadOwnClothing: Object.prototype.hasOwnProperty.call(assetGroup, "Clothing"),
            clothing: assetGroup.Clothing,
            hadOwnAllowCustomize: Object.prototype.hasOwnProperty.call(assetGroup, "AllowCustomize"),
            allowCustomize: assetGroup.AllowCustomize
          });
          assetGroup.Clothing = true;
          assetGroup.AllowCustomize = true;
        }
      }

      try {
        return originalAppearanceLoad.apply(this, args);
      } finally {
        for (const entry of changed) {
          if (entry.hadOwnClothing) entry.group.Clothing = entry.clothing;
          else delete entry.group.Clothing;
          if (entry.hadOwnAllowCustomize) entry.group.AllowCustomize = entry.allowCustomize;
          else delete entry.group.AllowCustomize;
        }
      }
    };

    window.__bcShitNpcBodyEditInstalled = true;
    window.__restoreBCShitNpcBodyEdit = () => {
      window.AppearanceLoad = originalAppearanceLoad;
      delete window.__bcShitNpcBodyEditInstalled;
      delete window.__restoreBCShitNpcBodyEdit;
      console.log("NPC body-customization hook removed. Reload the appearance screen to reset permissions.");
    };
    bodyEditHookInstalled = true;
  }

  // NPC appearance groups are still rejected by WardrobeGroupAccessible
  // after AppearanceLoad restores shared AssetGroup metadata. Override this
  // runtime access check for the selected NPC, leaving player permissions intact.
  let npcBodyAccessHookInstalled = false;
  if (
    typeof window.WardrobeGroupAccessible === "function" &&
    !window.__bcShitNpcBodyAccessInstalled
  ) {
    const originalWardrobeGroupAccessible = window.WardrobeGroupAccessible;
    window.WardrobeGroupAccessible = function (character, assetGroup, options) {
      const target = window.CharacterAppearanceSelection;
      if (
        target &&
        target.ID !== 0 &&
        character === target &&
        assetGroup &&
        assetGroup.Category === "Appearance"
      ) return true;
      return originalWardrobeGroupAccessible.call(this, character, assetGroup, options);
    };
    window.__bcShitNpcBodyAccessInstalled = true;
    window.__restoreBCShitNpcBodyAccess = () => {
      window.WardrobeGroupAccessible = originalWardrobeGroupAccessible;
      delete window.__bcShitNpcBodyAccessInstalled;
      delete window.__restoreBCShitNpcBodyAccess;
      console.log("NPC body-part access hook removed.");
    };
    npcBodyAccessHookInstalled = true;
  }

  // Add Dress and Rename controls to Private Room NPC cards.
  // Renames are local to this browser/account and do not alter the game's
  // canonical NPC definitions or the clothing save path.
  let npcDressButtonInstalled = false;
  if (
    typeof window.PrivateDrawCharacter === "function" &&
    typeof window.PrivateClick === "function" &&
    typeof window.CharacterAppearanceLoadCharacter === "function" &&
    !window.__bcShitNpcDressButtonInstalled
  ) {
    const originalPrivateDrawCharacter = window.PrivateDrawCharacter;
    const originalPrivateClick = window.PrivateClick;
    const storagePrefix = "BCShitNpcName:" + String(window.Player?.MemberNumber ?? "local") + ":";
    const npcKey = npc => storagePrefix + String(npc.ID) + ":" + String(npc.AccountName || npc.Name || "");
    const originalNames = new WeakMap();
    const storedNameFor = npc => {
      if (!npc || !Number.isFinite(Number(npc.ID))) return null;
      const original = originalNames.get(npc) || npc.Name;
      const key = storagePrefix + String(npc.ID) + ":" + String(npc.AccountName || original || "");
      try { return window.localStorage.getItem(key); }
      catch (error) { console.warn("[BC-Shit] NPC name storage unavailable", error); return null; }
    };
    const applyNpcName = npc => {
      if (!npc) return;
      if (!originalNames.has(npc)) originalNames.set(npc, npc.Name);
      const saved = storedNameFor(npc);
      if (saved && npc.Name !== saved) npc.Name = saved;
    };
    const cardPositions = () => {
      if (!Array.isArray(window.PrivateCharacter)) return [];
      const offset = Number(window.PrivateCharacterOffset) || 0;
      let x = 1000 - ((window.PrivateCharacter.length - offset) * 250);
      if (x < 0) x = 0;
      const cards = [];
      for (let index = offset; index < window.PrivateCharacter.length && index < offset + 4; index++) {
        const npc = window.PrivateCharacter[index];
        if (!npc || index === 0) continue;
        cards.push({ npc, dressX: x + (index - offset) * 470 + 345 });
      }
      return cards;
    };
    const renameNpc = npc => {
      applyNpcName(npc);
      const entered = window.prompt("Rename NPC (leave blank to restore original name):", npc.Name || "");
      if (entered === null) return;
      const name = entered.trim();
      if (name.length > 60) {
        window.alert("Please use a name of 60 characters or fewer.");
        return;
      }
      const original = originalNames.get(npc) || npc.Name;
      const key = storagePrefix + String(npc.ID) + ":" + String(npc.AccountName || original || "");
      try {
        if (name) window.localStorage.setItem(key, name);
        else window.localStorage.removeItem(key);
      } catch (error) {
        console.warn("[BC-Shit] Could not save NPC rename", error);
        window.alert("Name changed for this session, but browser storage was unavailable.");
      }
      npc.Name = name || original;
      npc.MustDraw = true;
      if (typeof window.CharacterRefresh === "function") {
        try { window.CharacterRefresh(npc, false); }
        catch (error) { console.warn("[BC-Shit] NPC refresh after rename failed", error); }
      }
    };

    const slaveCollarFor = npc => {
      const neck = npc?.Appearance?.find(item => item?.Asset?.Group?.Name === "ItemNeck");
      return neck && /slave.?collar/i.test(String(neck.Asset?.Name || "")) ? neck : null;
    };
    const removeSlaveCollar = npc => {
      if (!slaveCollarFor(npc)) return;
      if (!window.confirm("Remove this NPC's slave collar without disowning them?")) return;
      if (typeof window.InventoryRemove !== "function") {
        window.alert("Inventory removal is not available on this screen.");
        return;
      }
      window.InventoryRemove(npc, "ItemNeck", false);
      if (typeof window.CharacterRefresh === "function") window.CharacterRefresh(npc, false);
      npc.MustDraw = true;
      if (slaveCollarFor(npc)) window.alert("The game restored the slave collar; removal did not persist.");
    };

    const makeNpcSlave = npc => {
      if (npc.IsOwnedByPlayer?.() || npc.Owner === window.Player?.Name) return;
      if (npc.IsOwned?.() && !npc.IsOwnedByPlayer?.()) {
        window.alert("This NPC is already owned by someone else.");
        return;
      }
      if (!window.confirm("Make " + npc.Name + " your slave? This changes their actual Private Room ownership.")) return;
      if (typeof window.NPCEventAdd !== "function" || typeof window.ServerPrivateCharacterSync !== "function") {
        window.alert("The game's NPC ownership/save functions are unavailable.");
        return;
      }
      window.NPCEventAdd(npc, "NPCCollaring", window.CurrentTime || Date.now());
      npc.Owner = window.Player.Name;
      npc.Love = 100;
      npc.AllowItem = true;
      npc.MustDraw = true;
      window.ServerPrivateCharacterSync();
    };
    const editNpcTraits = npc => {
      if (!Array.isArray(npc.Trait) || typeof window.NPCTraitSet !== "function" ||
          typeof window.NPCTraitGet !== "function" || typeof window.ServerPrivateCharacterSync !== "function") {
        window.alert("The game's NPC trait editor/save functions are unavailable.");
        return;
      }
      // Positive values favor the first name, negative values favor its opposite.
      // Dominant is positive; Submissive is negative, as in the game's trait system.
      const axes = [
        ["Peaceful", "Violent"],
        ["Frigid", "Horny"],
        ["Wise", "Dumb"],
        ["Playful", "Serious"],
        ["Dominant", "Submissive"]
      ];
      const changes = [];
      for (const [positive, negative] of axes) {
        const current = window.NPCTraitGet(npc, positive);
        const input = window.prompt(
          "Change trait " + positive + "/" + negative + " (-100 to 100):\n" +
          "Positive = " + positive + ", negative = " + negative + ".\n" +
          "Current: " + current,
          String(current)
        );
        if (input === null) return;
        const value = Number(input.trim());
        if (!input.trim() || !Number.isInteger(value) || value < -100 || value > 100) {
          window.alert("Enter a whole number from -100 to 100. No changes were saved.");
          return;
        }
        changes.push({ name: value < 0 ? negative : positive, value: Math.abs(value) });
      }
      const relationInput = window.prompt("Change Relation (0 to 100):", String(npc.Love ?? 0));
      if (relationInput === null) return;
      const relation = Number(relationInput.trim());
      if (!relationInput.trim() || !Number.isInteger(relation) || relation < 0 || relation > 100) {
        window.alert("Enter a whole number from 0 to 100. No changes were saved.");
        return;
      }
      if (typeof window.NPCEventGet !== "function" || typeof window.NPCEventAdd !== "function") {
        window.alert("The game's NPC date functions are unavailable. No changes were saved.");
        return;
      }
      const now = Number(window.CurrentTime) || Date.now();
      const entry = Number(window.NPCEventGet(npc, "PrivateRoomEntry"));
      const days = entry > 0 ? Math.max(0, Math.floor((now - entry) / 86400000)) : 0;
      const daysInput = window.prompt("Change days together with this NPC (0 or more):", String(days));
      if (daysInput === null) return;
      const newDays = Number(daysInput.trim());
      if (!daysInput.trim() || !Number.isSafeInteger(newDays) || newDays < 0 || newDays > 36500) {
        window.alert("Enter a whole number from 0 to 36500. No changes were saved.");
        return;
      }
      window.NPCEventAdd(npc, "PrivateRoomEntry", now - newDays * 86400000);
      for (const change of changes) window.NPCTraitSet(npc, change.name, change.value);
      npc.Love = relation;
      if (typeof window.NPCTraitDialog === "function") window.NPCTraitDialog(npc);
      npc.MustDraw = true;
      window.ServerPrivateCharacterSync();
    };

    window.PrivateDrawCharacter = function (...args) {
      for (const { npc } of cardPositions()) applyNpcName(npc);
      const result = originalPrivateDrawCharacter.apply(this, args);
      for (const { dressX } of cardPositions()) {
        window.DrawButton(dressX, 25, 63, 63, "", "White", "Icons/Dress.png", window.TextGet("Dress"));
      }
      return result;
    };

    window.PrivateClick = function (...args) {
      if (window.LogQuery("RentRoom", "PrivateRoom")) {
        for (const { npc, dressX } of cardPositions()) {
          if (window.MouseX >= dressX && window.MouseX < dressX + 63 &&
              window.MouseY >= 25 && window.MouseY < 88) {
            window.PrivateCharacterNewClothes = npc;
            window.CharacterAppearanceLoadCharacter(npc);
            return;
          }
        }
      }
      return originalPrivateClick.apply(this, args);
    };

    // Keep the Private Room uncluttered. NPC actions live in the costume editor.
    // HTML controls are used so they remain clickable regardless of canvas scaling.
    const npcTools = document.createElement("div");
    npcTools.id = "bc-shit-npc-editor-tools";
    Object.assign(npcTools.style, {
      position: "fixed", top: "12px", right: "12px", zIndex: "100000",
      display: "none", gap: "5px", padding: "8px", borderRadius: "8px",
      background: "rgba(25,25,35,0.94)", border: "1px solid #aaa",
      fontFamily: "Arial, sans-serif"
    });
    const toolButtons = {};
    for (const [key, label, action] of [
      ["rename", "Rename", renameNpc],
      ["collar", "Uncollar", removeSlaveCollar],
      ["enslave", "Enslave", makeNpcSlave],
      ["traits", "Traits", editNpcTraits]
    ]) {
      const button = document.createElement("button");
      button.textContent = label;
      button.type = "button";
      Object.assign(button.style, { padding: "7px 10px", cursor: "pointer", fontSize: "13px" });
      button.addEventListener("click", () => {
        const npc = window.CharacterAppearanceSelection;
        if (npc && npc.ID !== 0 && window.PrivateCharacterNewClothes === npc) action(npc);
      });
      npcTools.appendChild(button);
      toolButtons[key] = button;
    }
    document.body.appendChild(npcTools);
    const updateNpcTools = () => {
      const npc = window.CharacterAppearanceSelection;
      const visible = window.CurrentScreen === "Appearance" && npc &&
        npc.ID !== 0 && window.PrivateCharacterNewClothes === npc;
      npcTools.style.display = visible ? "flex" : "none";
      if (!visible) return;
      toolButtons.collar.style.display = slaveCollarFor(npc) ? "" : "none";
      toolButtons.enslave.style.display =
        npc.IsOwnedByPlayer?.() || npc.Owner === window.Player?.Name || npc.IsOwned?.() ? "none" : "";
    };
    const npcToolsInterval = setInterval(updateNpcTools, 200);
    updateNpcTools();

    // Recruit NPCs encountered outside the Private Room. Do not mutate the
    // original room's NPC or assume PrivateVendor has been initialized.
    const recruitButton = document.createElement("button");
    recruitButton.type = "button";
    recruitButton.title = "Bring this NPC to your Private Room";
    recruitButton.setAttribute("aria-label", "Bring NPC to Private Room");
    recruitButton.id = "bc-shit-recruit-npc";
    Object.assign(recruitButton.style, {
      position: "fixed", top: "76px", right: "12px", zIndex: "100000",
      display: "none", alignItems: "center", gap: "6px", padding: "6px 10px",
      background: "#f8f8f8", color: "#111", border: "2px solid #555",
      borderRadius: "7px", cursor: "pointer", fontSize: "13px"
    });
    const roomIcon = document.createElement("img");
    roomIcon.src = "Icons/PrivateRoom.png";
    roomIcon.alt = "";
    Object.assign(roomIcon.style, { width: "30px", height: "30px", objectFit: "contain" });
    roomIcon.onerror = () => { roomIcon.style.display = "none"; };
    recruitButton.appendChild(roomIcon);
    recruitButton.appendChild(document.createTextNode("Private Room"));
    document.body.appendChild(recruitButton);
    const recruitCandidate = () => {
      const npc = window.CurrentCharacter;
      if (!npc || npc.ID === 0 || !npc.Name || !Array.isArray(npc.Appearance) ||
          window.CurrentScreen === "Private" || window.CurrentScreen === "Appearance" ||
          !window.CurrentCharacter || window.CurrentCharacter !== npc ||
          !Array.isArray(window.PrivateCharacter) ||
          window.PrivateCharacter.some(c => c && c.Name === npc.Name)) return null;
      return npc;
    };
    recruitButton.addEventListener("click", () => {
      const npc = recruitCandidate();
      if (!npc) return;
      if (typeof window.CharacterLoadNPC !== "function" ||
          typeof window.ServerAppearanceBundle !== "function" ||
          typeof window.NPCEventAdd !== "function" ||
          typeof window.ServerAccountUpdate?.QueueData !== "function") {
        window.alert("Private Room saving functions are not available.");
        return;
      }
      if (!window.confirm("Bring " + npc.Name + " to your Private Room?\\n\\n" +
          "A copy will be added to your Private Room. The original NPC may remain in this room.")) return;
      if (window.PrivateCharacter.some(c => c && c.Name === npc.Name)) return;
      try {
        const copy = window.CharacterLoadNPC("NPC_Private_Custom");
        copy.Name = npc.Name;
        copy.AccountName = "NPC_Private_Custom" + window.PrivateCharacter.length;
        copy.AssetFamily = npc.AssetFamily || copy.AssetFamily;
        copy.Appearance = npc.Appearance.slice();
        copy.AppearanceFull = npc.Appearance.slice();
        copy.Love = Number.isFinite(npc.Love) ? npc.Love : 0;
        copy.Title = npc.Title || "";
        copy.Trait = Array.isArray(npc.Trait) ? npc.Trait.map(t => ({ Name: t.Name, Value: t.Value })) : [];
        if (!copy.Trait.length && typeof window.NPCTraitGenerate === "function") window.NPCTraitGenerate(copy);
        copy.Event = Array.isArray(npc.Event) ? npc.Event.map(e => ({ ...e })) : [];
        copy.Owner = npc.Owner || "";
        copy.Lover = npc.Lover || "";
        if (npc.ArousalSettings) copy.ArousalSettings = { ...npc.ArousalSettings };
        window.NPCEventAdd(copy, "PrivateRoomEntry", Number(window.CurrentTime) || Date.now());
        const members = window.PrivateCharacter.slice(1).concat(copy);
        const serialized = members.map(member => {
          const record = {
            Name: member.Name, Love: member.Love, Title: member.Title,
            Trait: member.Trait, Cage: member.Cage, Owner: member.Owner,
            Lover: member.Lover, AssetFamily: member.AssetFamily,
            Appearance: window.ServerAppearanceBundle(member.Appearance),
            AppearanceFull: window.ServerAppearanceBundle(member.AppearanceFull || member.Appearance),
            ArousalSettings: member.ArousalSettings, Event: member.Event
          };
          if (member.FromPandora != null) record.FromPandora = member.FromPandora;
          return record;
        });
        window.ServerAccountUpdate.QueueData({ PrivateCharacter: serialized }, true);
        window.PrivateCharacter.push(copy);
        recruitButton.style.display = "none";
        window.alert(copy.Name + " was added to your Private Room list. Check your room to confirm.");
      } catch (error) {
        console.error("[BC-Shit] NPC recruitment failed:", error);
        window.alert("Could not add this NPC to the Private Room.");
      }
    });
    const recruitInterval = setInterval(() => {
      recruitButton.style.display = recruitCandidate() ? "flex" : "none";
    }, 250);

    window.__bcShitNpcDressButtonInstalled = true;
    window.__restoreBCShitNpcDressButton = () => {
      window.PrivateDrawCharacter = originalPrivateDrawCharacter;
      window.PrivateClick = originalPrivateClick;
      clearInterval(npcToolsInterval);
      npcTools.remove();
      clearInterval(recruitInterval);
      recruitButton.remove();
      delete window.__bcShitNpcDressButtonInstalled;
      delete window.__restoreBCShitNpcDressButton;
      console.log("Private Room NPC Dress and Rename buttons removed.");
    };
    npcDressButtonInstalled = true;
  }

  window.__bcShitHeadTailsInstalled = true;
  window.__restoreBCShitHeadTails = () => {
    restores.reverse().forEach(restore => restore());
    delete window.__bcShitHeadTailsInstalled;
    delete window.__restoreBCShitHeadTails;
    console.log("Togruta texture redirects removed. Reload to unregister the asset.");
  };
  console.log("Togruta head-tails registered in HairFront and HairBack.");
  alert("Togruta Small front and back head-tails added. Reload the game to undo the changes.");
})();
