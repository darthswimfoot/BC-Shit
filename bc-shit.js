(() => {
    const a = AssetGroup[10].Asset[0];
    const l = a.Layer[0];

    const simple = o => {
        const out = {};
        for (const k of Object.keys(o || {})) {
            const v = o[k];
            if (v === null || ["string", "number", "boolean"].includes(typeof v))
                out[k] = v;
            else if (Array.isArray(v))
                out[k] = `[array: ${v.length}]`;
            else if (typeof v === "object")
                out[k] = `[object: ${Object.keys(v).slice(0, 12).join(", ")}]`;
            else if (typeof v === "function")
                out[k] = "[function]";
        }
        return out;
    };

    const result = {
        assetName: a.Name,
        layer: simple(l),
        layerAsset: simple(l.Asset),
        layerAssetKeys: Object.keys(l.Asset || {}),
        extended: simple(a.Extended)
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
