(() => {
    const a = AssetGroup[10].Asset[0];
    const results = {};

    for (const name of ["AssetGetPreviewPath", "AssetGetInventoryPath"]) {
        try {
            results[name] = {
                signature: window[name].toString().slice(0, 1200)
            };
        } catch (e) {
            results[name] = String(e);
        }
    }

    try {
        results.preview = AssetGetPreviewPath(a);
    } catch (e) {
        results.preview = "ERROR: " + e.message;
    }

    try {
        results.inventory = AssetGetInventoryPath(a);
    } catch (e) {
        results.inventory = "ERROR: " + e.message;
    }

    const box = document.createElement("textarea");
    box.value = JSON.stringify(results, null, 2);
    box.style.cssText =
        "position:fixed;top:5%;left:5%;width:90%;height:85%;" +
        "z-index:2147483647;background:white;color:black;font-size:14px;";
    document.body.appendChild(box);
    box.focus();
    box.select();
    alert("Click the text box, press Ctrl+A, then Ctrl+C, and paste the output here.");
})();
