
(() => {
    const group = AssetGroup[10];

    const output = JSON.stringify({
        group: {
            Name: group.Name,
            Description: group.Description,
            keys: Object.keys(group),
        },
        AssetLoad: AssetLoad.toString().slice(0, 500),
        AssetGet: AssetGet.toString().slice(0, 500),
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
