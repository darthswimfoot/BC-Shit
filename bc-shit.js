(() => {
  "use strict";
  const itemName = "TogrutaHeadTailsSmallFront";
  const sourceTexture = "https://raw.githubusercontent.com/darthswimfoot/BC-Shit/main/togrutaheadtailssmallfront.png";
  if (window.__bcShitHeadTailsInstalled) {
    alert("BC-Shit is already installed for this game session.");
    return;
  }
  const groupDef = window.AssetFemale3DCG?.find(g => g.Group === "HairFront");
  const group = window.AssetGroupGet?.("Female3DCG", "HairFront");
  const base = groupDef?.Asset?.find(a => a.Name === "HairFront1") || groupDef?.Asset?.find(a => a.Name === "FrontHair1") || groupDef?.Asset?.[0];
  if (!groupDef || !group || !base) {
    alert("Togruta head-tails: no usable hairstyle template was found in HairFront.");
    return;
  }
  const mapImageUrl = url => {
    if (typeof url !== "string") return url;
    const path = url.split("?")[0];
    if (path.endsWith("/HairFront/" + itemName + ".png") ||
        path.endsWith("/HairFront/Preview/" + itemName + ".png") ||
        path.endsWith("/Inventory/HairFront/" + itemName + ".png") ||
        ["Small", "Normal", "Large", "XLarge"].some(size =>
          path.endsWith("/HairFront/" + itemName + "_" + size + ".png"))) {
      return sourceTexture;
    }
    return url;
  };
  const restores = [];
  for (const cache of [window.DrawImageCache, window.GLDrawImageCache]) {
    if (!cache || typeof cache.get !== "function") continue;
    const originalGet = cache.get;
    cache.get = function (url, ...args) {
      return originalGet.call(this, mapImageUrl(url), ...args);
    };
    restores.push(() => { cache.get = originalGet; });
  }
  try {
    if (!window.AssetGet("Female3DCG", "HairFront", itemName)) {
      window.AssetAdd(group, { ...base, Name: itemName, Description: "Togruta Small" }, window.AssetFemale3DCGExtended, groupDef);
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

  if (!window.__bcShitTogrutaNameInstalled) {
    if (typeof window.AssetDescription === "function") {
      const originalAssetDescription = window.AssetDescription;
      window.AssetDescription = function (...args) {
        if (args.some(arg => arg && typeof arg === "object" &&
            (arg.Name === itemName || arg === registeredTogrutaAsset))) return "Togruta Small";
        return originalAssetDescription.apply(this, args);
      };
    }
    if (typeof window.TextGet === "function") {
      const originalTextGet = window.TextGet;
      window.TextGet = function (key, ...args) {
        if (typeof key === "string" &&
            (key.includes(itemName) || key === "HairFront" + itemName ||
             key === "AssetHairFront" + itemName)) return "Togruta Small";
        return originalTextGet.call(this, key, ...args);
      };
    }
    window.__bcShitTogrutaNameInstalled = true;
  }

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
  console.log("Togruta head-tails registered in HairFront.");
  alert("Togruta head-tails added to Front Hair as " + itemName + ". Reload the game to undo the changes.");
})();
