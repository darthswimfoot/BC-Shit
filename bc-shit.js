(() => {
    const assets = AssetGroup[10].Asset;

    const result = assets.slice(0, 3).map((a, i) => ({
        index: i,
        type: typeof a,
        name: a?.Name ?? null,
        groupName: a?.Group?.Name ?? null,
        keys: a && typeof a === "object"
            ? Object.keys(a)
            : [],
        layers: Array.isArray(a?.Layer)
            ? a.Layer.map(l => ({
                name: l?.Name ?? null,
                keys: l && typeof l === "object"
                    ? Object.keys(l)
                    : []
            }))
            : null
    }));

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
