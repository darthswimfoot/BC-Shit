
(() => {
    let output;

    try {
        const assets = AssetGroup[10].Asset;

        output = JSON.stringify(
            assets.slice(0, 3).map((asset, index) => ({
                index,
                type: typeof asset,
                value: asset,
                keys: asset && typeof asset === "object"
                    ? Object.keys(asset)
                    : [],
            })),
            (key, value) => {
                if (typeof value === "function") return "[function]";
                if (value instanceof Map) return "[Map]";
                return value;
            },
            2
        );
    } catch (e) {
        output = "ERROR: " + (e.stack || e.message || String(e));
    }

    const box = document.createElement("textarea");
    box.value = output;
    box.style.cssText =
        "position:fixed;top:5%;left:5%;width:90%;height:85%;" +
        "z-index:2147483647;background:white;color:black;" +
        "font-size:14px;padding:10px;";
    document.body.appendChild(box);
    box.focus();
    box.select();

    try {
        document.execCommand("copy");
    } catch {}

    alert("Diagnostic ready. If needed, click the text and press Ctrl+A, then Ctrl+C.");
})();
