(() => {
    const a = AssetGroup[10].Asset[0];
    const l = a.Layer[0];

    const result = {
        itemName: a.Name,
        group: a.Group?.Name,
        family: a.Group?.Family,
        layerName: l.Name,
        layerAssetName: l.Asset?.Name,
        layerAssetGroup: l.Asset?.Group?.Name,
        layerAssetFamily: l.Asset?.Group?.Family,
        textureRelatedFunctions: Object.keys(window).filter(
            k => /image|texture|asset.*path|path.*asset/i.test(k)
                && typeof window[k] === "function"
        ).slice(0, 50)
    };

    const box = document.createElement("textarea");
    box.value = JSON.stringify(result, null, 2);
    box.style.cssText =
        "position:fixed;top:5%;left:5%;width:90%;height:85%;" +
        "z-index:2147483647;background:white;color:black;font-size:14px;";
    document.body.appendChild(box);
    box.focus();
    box.select();
    alert("Click the text box, press Ctrl+A, then Ctrl+C, and paste the output here.");
})();
