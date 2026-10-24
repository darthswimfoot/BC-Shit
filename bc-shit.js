
(() => {
    let output;

    try {
        const group = AssetGroup[10];
        const sample = group
            ? Object.fromEntries(
                Object.keys(group).map(key => {
                    let value;
                    try {
                        value = group[key];
                        if (typeof value === "function") {
                            value = "[function]";
                        } else if (value && typeof value === "object") {
                            value = Array.isArray(value)
                                ? `[array, length ${value.length}]`
                                : "[object]";
                        }
                    } catch (e) {
                        value = "[error reading property]";
                    }
                    return [key, value];
                })
            )
            : "AssetGroup[10] is missing";

        output = JSON.stringify(sample, null, 2);
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

    alert("Diagnostic ready. If it wasn't copied automatically, press Ctrl+A, then Ctrl+C, and paste it here.");
})();
