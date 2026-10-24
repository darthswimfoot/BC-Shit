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
    "Its preview now reuses the Large clothing image. Find EchoChinesePanties and equip it. " +
    "Reload the game to undo the change."
  );
})();