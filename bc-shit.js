(async () => {
  "use strict";
  const itemName = "TogrutaHeadTailsSmallFront";
  const backItemName = "TogrutaHeadTailsSmallBack";
  const sourceTexture = "https://raw.githubusercontent.com/darthswimfoot/BC-Shit/main/togrutaheadtailssmallfront.png";
  const backSourceTexture = "https://raw.githubusercontent.com/darthswimfoot/BC-Shit/main/togrutaheadtailssmallback.png";
  // Shift visible pixels 50px right inside the original canvas. The source
  // sprite is 50px left of the game's expected HairBack origin.
  let alignedBackTexture = backSourceTexture;
  try {
    const response = await fetch(backSourceTexture);
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
  const groupDef = window.AssetFemale3DCG?.find(g => g.Group === "HairFront");
  const group = window.AssetGroupGet?.("Female3DCG", "HairFront");
  const base = groupDef?.Asset?.find(a => a.Name === "HairFront1") || groupDef?.Asset?.find(a => a.Name === "FrontHair1") || groupDef?.Asset?.[0];
  const backGroupDef = window.AssetFemale3DCG?.find(g => g.Group === "HairBack");
  const backGroup = window.AssetGroupGet?.("Female3DCG", "HairBack");
  const backBase = backGroupDef?.Asset?.find(a => a.Name === "HairBack1" && Array.isArray(a.Layer)) || backGroupDef?.Asset?.find(a => Array.isArray(a.Layer)) || groupDef?.Asset?.find(a => Array.isArray(a.Layer));
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
    if (path.includes("/HairFront/" + itemName) ||
        path.includes("/Inventory/HairFront/" + itemName)) {
      return sourceTexture;
    }
    if (path.includes("/HairBack/" + backItemName) ||
        path.includes("/Inventory/HairBack/" + backItemName)) {
      return alignedBackTexture;
    }
    return url;
  };
  // Preload/decode both source textures before the custom assets can be
  // selected. This avoids the first equip racing the browser's initial image
  // decode; keep the game's normal cache API and URLs intact.
  async function preloadTexture(url) {
    const image = new Image();
    image.src = url;
    if (typeof image.decode === "function") {
      await image.decode();
    } else {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Texture failed to load: " + url));
      });
    }
    return image;
  }
  const decodedTextures = new Map();
  try {
    const [frontImage, backImage] = await Promise.all([
      preloadTexture(sourceTexture),
      preloadTexture(alignedBackTexture)
    ]);
    decodedTextures.set(sourceTexture, frontImage);
    decodedTextures.set(alignedBackTexture, backImage);
  } catch (error) {
    console.warn("BC-Shit: texture preload did not complete; continuing with normal cache loading:", error);
  }

  // R133 DrawImageCache stores CachedImage records, not HTMLImageElements.
  // Seed those records with the decoded images before asset registration so
  // the renderer can draw the custom textures immediately instead of caching
  // an unresolved first request. Keep a fallback to the game's loader if its
  // cache implementation is not the R133 ImageCache shape.
  function seedDecodedDrawImage(url, image) {
    const cache = window.DrawImageCache;
    if (!cache || !cache.cache || typeof cache.cache.set !== "function" ||
        typeof cache.get !== "function" || !image || !image.complete ||
        !image.naturalWidth) return false;
    const existing = cache.cache.get(url);
    if (existing && typeof existing.unload === "function") {
      try { existing.unload(); } catch { /* ignore stale cache entry */ }
    }
    const entry = {
      cache, url, state: "loaded", data: image, lastUsed: Date.now(),
      _generation: 0,
      async _load() {},
      unload() {},
      _dispose() {},
      isAsset() { return false; },
      isLoaded() { return this.state === "loaded"; },
      isLoading() { return this.state === "loading"; },
      isDoneLoading() { return this.state === "loaded"; },
      isFailing() { return false; }
    };
    cache.cache.set(url, entry);
    return true;
  }

  const restores = [];
  for (const cache of [window.DrawImageCache, window.GLDrawImageCache]) {
    if (!cache || typeof cache.get !== "function") continue;
    const originalGet = cache.get;
    cache.get = function (url, ...args) {
      return originalGet.call(this, mapImageUrl(url), ...args);
    };
    restores.push(() => { cache.get = originalGet; });
  }

  // R133 ImageCache.get() starts loading an unknown URL but does not return
  // drawable pixels on that first call. Seed the game's own cache and wait for
  // its CachedImage state to finish before registering/selecting the assets.
  // Preloading with a separate HTMLImageElement alone does not warm this cache.
  async function preloadGameCache(url) {
    const cache = window.DrawImageCache;
    if (!cache || typeof cache.get !== "function") return;
    let entry;
    try {
      entry = cache.get(url);
    } catch (error) {
      console.warn("BC-Shit: could not start game-cache preload:", url, error);
      return;
    }
    if (!entry || typeof entry.isDoneLoading !== "function") return;
    const started = Date.now();
    while (!entry.isDoneLoading() && Date.now() - started < 15000) {
      if (entry.state === "error" || entry.state === "failed" || entry.isFailing?.()) {
        console.warn("BC-Shit: game-cache preload failed:", url, entry.state);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        entry = cache.get(url) || entry;
      } catch { /* retain the original entry while it finishes */ }
    }
    if (!entry.isDoneLoading() || !entry.data) {
      console.warn("BC-Shit: game-cache preload timed out:", url, entry.state);
    }
  }
  // Seed only after URL redirection is installed, using the exact URLs
  // that redirected game-cache lookups will request.
  for (const [url, image] of decodedTextures) {
    seedDecodedDrawImage(url, image);
    // GLDrawImageCache stores HTMLImageElements directly; the WebGL renderer
    // reads this cache separately from DrawImageCache.
    if (window.GLDrawImageCache && typeof window.GLDrawImageCache.set === "function" &&
        image && image.complete && image.naturalWidth) {
      window.GLDrawImageCache.set(url, image);
    }
  }
  await Promise.all([preloadGameCache(sourceTexture), preloadGameCache(alignedBackTexture)]);

  try {
    if (!window.AssetGet("Female3DCG", "HairFront", itemName)) {
      window.AssetAdd(group, { ...base, Name: itemName, Description: "Togruta Small" }, window.AssetFemale3DCGExtended, groupDef);
    }
    if (!window.AssetGet("Female3DCG", "HairBack", backItemName)) {
      const backAssetData = { ...backBase, Name: backItemName, Description: "Togruta Small", DescriptionPlural: "Togruta Small", Priority: 999999, LayerPriority: 999999 };
      // Layer must remain the array schema expected by R133 appearance sorting and coloring.
      if (Array.isArray(backBase.Layer)) backAssetData.Layer = backBase.Layer.map(layer => layer && typeof layer === "object" ? { ...layer } : layer);
      else throw new Error("No template with a valid Layer array was found.");
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
        : [];
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
