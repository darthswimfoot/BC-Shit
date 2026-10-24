(async () => {
  "use strict";
  console.info("[BC-Shit] script execution started", location.href);
  const itemName = "TogrutaHeadTailsSmallFront";
  const backItemName = "TogrutaHeadTailsSmallBack";
  const sourceTexture = "https://cdn.jsdelivr.net/gh/darthswimfoot/BC-Shit@main/togrutaheadtailssmallfront.png";
  const backSourceTexture = "https://cdn.jsdelivr.net/gh/darthswimfoot/BC-Shit@main/togrutaheadtailssmallback.png";
  // Shift visible pixels 50px right inside the original canvas. The source
  // sprite is 50px left of the game's expected HairBack origin.
  let alignedBackTexture = backSourceTexture;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(backSourceTexture, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error("HTTP " + response.status);
    const bitmap = await createImageBitmap(await response.blob());
    if (bitmap.width === 300 && bitmap.height === 500) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 500;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 50, 0);
      alignedBackTexture = canvas.toDataURL("image/png");
    }
    bitmap.close?.();
  } catch (error) {
    console.warn("BC-Shit: using original back texture because canvas alignment failed:", error);
  }
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
      return sourceTexture;
    }
    if (lowerPath.includes(backItemName.toLowerCase())) {
      return alignedBackTexture;
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
      if (mappedUrl !== requestUrl) return originalFetch.call(this, mappedUrl, init);
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
    preloadGameCache("DrawImageCache", alignedBackTexture),
    preloadGameCache("GLDrawImageCache", sourceTexture),
    preloadGameCache("GLDrawImageCache", alignedBackTexture)
  ]);

  try {
    if (!window.AssetGet("Female3DCG", "HairFront", itemName)) {
      window.AssetAdd(group, { ...base, Name: itemName, Description: "Togruta Small" }, window.AssetFemale3DCGExtended, groupDef);
    }
    if (!window.AssetGet("Female3DCG", "HairBack", backItemName)) {
      const backAssetData = { ...backBase, Name: backItemName, Description: "Togruta Small", DescriptionPlural: "Togruta Small", Priority: 999999, LayerPriority: 999999 };
      // Preserve an explicit layer definition when the chosen asset has one.
      // If HairBack1 has no Layer array, let R133 create its standard single layer.
      if (Array.isArray(backBase.Layer)) backAssetData.Layer = backBase.Layer.map(layer => layer && typeof layer === "object" ? { ...layer } : layer);
      else delete backAssetData.Layer;
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
  }
  const registeredTogrutaBackAsset = window.AssetGet("Female3DCG", "HairBack", backItemName);
  if (registeredTogrutaBackAsset) {
    registeredTogrutaBackAsset.Description = "Togruta Small";
    registeredTogrutaBackAsset.DescriptionPlural = "Togruta Small";
    registeredTogrutaBackAsset.Priority = 999999;
    registeredTogrutaBackAsset.LayerPriority = 999999;
    // Repair stale registrations left by earlier bookmarklet versions.
    if (!Array.isArray(registeredTogrutaBackAsset.Layer)) {
      registeredTogrutaBackAsset.Layer = Array.isArray(backBase.Layer)
        ? backBase.Layer.map(layer => layer && typeof layer === "object" ? { ...layer } : layer)
        : [{ Name: null, Asset: registeredTogrutaBackAsset }];
    }
    // The broken asset may already be present in a character appearance entry.
    // Repair those item-level Asset references too, without changing its group or name.
    for (const character of [window.Player, ...(Array.isArray(window.Character) ? window.Character : [])]) {
      if (!character || !Array.isArray(character.Appearance)) continue;
      for (const item of character.Appearance) {
        if (item && item.Asset && item.Asset.Name === backItemName && !Array.isArray(item.Asset.Layer)) {
          item.Asset.Layer = registeredTogrutaBackAsset.Layer.map(layer => layer && typeof layer === "object" ? { ...layer } : layer);
        }
      }
    }
    // Keep Layer as the structured array required by R133; never replace it with a string.
  }

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

  // Add a direct "Dress NPC" button to Private Room NPC cards.
  // Reuse the game's existing NPC custom-clothing save path.
  let npcDressButtonInstalled = false;
  if (
    typeof window.PrivateDrawCharacter === "function" &&
    typeof window.PrivateClick === "function" &&
    typeof window.CharacterAppearanceLoadCharacter === "function" &&
    !window.__bcShitNpcDressButtonInstalled
  ) {
    const originalPrivateDrawCharacter = window.PrivateDrawCharacter;
    const originalPrivateClick = window.PrivateClick;

    window.PrivateDrawCharacter = function (...args) {
      const result = originalPrivateDrawCharacter.apply(this, args);
      if (!Array.isArray(window.PrivateCharacter)) return result;

      const offset = Number(window.PrivateCharacterOffset) || 0;
      let x = 1000 - ((window.PrivateCharacter.length - offset) * 250);
      if (x < 0) x = 0;

      for (let index = offset; index < window.PrivateCharacter.length && index < offset + 4; index++) {
        const npc = window.PrivateCharacter[index];
        if (!npc || index === 0) continue;
        const buttonX = x + (index - offset) * 470 + 345;
        // Match the game's built-in Dress / Change Appearance icon button.
        window.DrawButton(buttonX, 25, 63, 63, "", "White", "Icons/Dress.png", window.TextGet("Dress"));
      }
      return result;
    };

    window.PrivateClick = function (...args) {
      if (
        window.LogQuery("RentRoom", "PrivateRoom") &&
        window.MouseY >= 25 && window.MouseY < 88 &&
        Array.isArray(window.PrivateCharacter)
      ) {
        const offset = Number(window.PrivateCharacterOffset) || 0;
        let x = 1000 - ((window.PrivateCharacter.length - offset) * 250);
        if (x < 0) x = 0;

        for (let index = offset; index < window.PrivateCharacter.length && index < offset + 4; index++) {
          if (index === 0 || !window.PrivateCharacter[index]) continue;
          const buttonX = x + (index - offset) * 470 + 345;
          if (window.MouseX >= buttonX && window.MouseX < buttonX + 63) {
            const npc = window.PrivateCharacter[index];
            // This is the same save path used by the built-in "Custom" clothes dialogue.
            window.PrivateCharacterNewClothes = npc;
            window.CharacterAppearanceLoadCharacter(npc);
            return;
          }
        }
      }
      return originalPrivateClick.apply(this, args);
    };

    window.__bcShitNpcDressButtonInstalled = true;
    window.__restoreBCShitNpcDressButton = () => {
      window.PrivateDrawCharacter = originalPrivateDrawCharacter;
      window.PrivateClick = originalPrivateClick;
      delete window.__bcShitNpcDressButtonInstalled;
      delete window.__restoreBCShitNpcDressButton;
      console.log("Private Room NPC dress buttons removed.");
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
