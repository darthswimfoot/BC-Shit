(() => {
  "use strict";

  const itemName = "EchoChinesePanties";
  const sourcePrefix =
    "https://raw.githubusercontent.com/SugarChain-Studio/echo-clothing-ext/main/resources/Assets/Female3DCG/Panties/ChinesePanties1_";

  if (window.__echoChinesePantiesInstalled) {
    alert("Echo Chinese Panties is already installed for this game session.");
    return;
  }

  const groupDef = AssetFemale3DCG.find(g => g.Group === "Panties");
  const group = AssetGroupGet("Female3DCG", "Panties");
  const base = groupDef?.Asset.find(a => a.Name === "Panties1");

  if (!groupDef || !group || !base) {
    alert("Echo Chinese Panties: could not find the game's base panties asset.");
    return;
  }

  if (AssetGet("Female3DCG", "Panties", itemName)) {
    alert("Echo Chinese Panties is already registered. Reload the game if it is missing.");
    return;
  }

  const mapImageUrl = url => {
    if (typeof url !== "string") return url;

    // Use the corresponding source texture for the item's normal draw layers.
    const sizeMatch = url.match(
      /Assets\/Female3DCG\/Panties\/EchoChinesePanties_(Small|Normal|Large|XLarge)\.png$/
    );
    if (sizeMatch) return sourcePrefix + sizeMatch[1] + ".png";

    // The Echo repository has no dedicated preview/inventory thumbnail.
    // Reuse the Large clothing texture for those image requests.
    if (
      /Assets\/Female3DCG\/Panties\/Preview\/EchoChinesePanties\.png$/.test(url) ||
      /Screens\/Inventory\/Panties\/EchoChinesePanties\.png$/.test(url)
    ) {
      return sourcePrefix + "Large.png";
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
    AssetAdd(
      group,
      { ...base, Name: itemName },
      AssetFemale3DCGExtended,
      groupDef
    );
  } catch (error) {
    restores.reverse().forEach(restore => restore());
    console.error("Echo Chinese Panties registration failed:", error);
    alert("Echo Chinese Panties could not be registered. See the browser console for details.");
    return;
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
        // Compact text button in the upper-right corner of each NPC's card.
        window.DrawButton(buttonX, 25, 115, 60, "Dress NPC", "White", "");
      }
      return result;
    };

    window.PrivateClick = function (...args) {
      if (
        window.LogQuery("RentRoom", "PrivateRoom") &&
        window.MouseY >= 25 && window.MouseY < 85 &&
        Array.isArray(window.PrivateCharacter)
      ) {
        const offset = Number(window.PrivateCharacterOffset) || 0;
        let x = 1000 - ((window.PrivateCharacter.length - offset) * 250);
        if (x < 0) x = 0;

        for (let index = offset; index < window.PrivateCharacter.length && index < offset + 4; index++) {
          if (index === 0 || !window.PrivateCharacter[index]) continue;
          const buttonX = x + (index - offset) * 470 + 345;
          if (window.MouseX >= buttonX && window.MouseX < buttonX + 115) {
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

  window.__echoChinesePantiesInstalled = true;
  window.__restoreEchoChinesePanties = () => {
    restores.reverse().forEach(restore => restore());
    delete window.__echoChinesePantiesInstalled;
    delete window.__restoreEchoChinesePanties;
    console.log("Echo Chinese Panties image redirects removed. Reload the game to remove the item.");
  };

  console.log("Echo Chinese Panties registered. Reload the game to remove it.");
  alert(
    "Echo Chinese Panties has been added to the panties inventory. " +
    "Its preview reuses the Large clothing image. Find EchoChinesePanties and equip it. " +
    (npcDressButtonInstalled
      ? "Private Room NPC Dress buttons installed; use them to open the NPC clothing editor."
      : "Private Room NPC Dress buttons were not installed because the required game functions were unavailable.") + " " +
    (bodyEditHookInstalled
      ? "Experimental NPC body-editing hook installed; test on a disposable NPC first."
      : "NPC body-editing hook was not installed because AppearanceLoad was not available.") +
    " Reload the game to undo the changes."
  );
})();