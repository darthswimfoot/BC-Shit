(() => {
    const a = AssetGroup[10].Asset[0];
    const l = a.Layer[0];
    const out = {};

    for (const name of ["DrawGetImage", "AssetGet"]) {
        out[name] = window[name].toString().slice(0, 1800);
    }

    out.layerImageFlags = {
        HasImage: l.HasImage,
        ColorIndex: l.ColorIndex,
        ColorSuffix: l.ColorSuffix
    };

    const box = document.createElement("textarea");
    box.value = JSON.stringify(out, null, 2);
    box.style.cssText =
        "position:fixed;top:5%;left:5%;width:90%;height:85%;" +
        "z-index:2147483647;background:white;color:black;font-size:14px;";
    document.body.appendChild(box);
    box.focus();
    box.select();
    alert("Click the text box, press Ctrl+A, then Ctrl+C, and paste the output here.");
})();
