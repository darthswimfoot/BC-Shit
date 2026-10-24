
(() => {
    const group = AssetGroup[10];
    const assets = group.Asset || [];

    const output = JSON.stringify({
        groupName: group.Name,
        assetCount: assets.length,
        firstAssets: assets.slice(0, 5).map(a => ({
            Name: a.Name,
            keys: Object.keys(a),
            LayerCount: a.Layer?.length,
            FirstLayer: a.Layer?.[0],
            FirstColors: a.Color,
            DefaultColor: a.DefaultColor,
        })),
    }, null, 2);

    const box = document.createElement("textarea");
    box.value = output;
    box.style.cssText =
        "position:fixed;top:10%;left:5%;width:90%;height:70%;" +
        "z-index:2147483647;background:white;color:black;" +
        "font-size:16px;padding:10px;";
    document.body.appendChild(box);
    box.focus();
    box.select();

    try {
        if (!document.execCommand("copy")) {
            alert("Select the text and press Ctrl+C to copy.");
        } else {
            alert("Output copied. Paste it into ChatGPT.");
        }
    } catch {
        alert("Select the text and press Ctrl+C to copy.");
    }
})();
