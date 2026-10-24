
(() => {
    const group = AssetGroup.Panties;

    const output = [
        "AssetLoad arguments: " + AssetLoad.length,
        "AssetGet arguments: " + AssetGet.length,
        "AssetGroup.Panties type: " + typeof group,
        "Panties group name: " + (group?.Name ?? "not found"),
        "Panties group keys: " + (
            group ? Object.keys(group).join(", ") : "none"
        ),
    ].join("\n");

    // Show a selectable text box.
    const box = document.createElement("textarea");
    box.value = output;
    box.style.cssText =
        "position:fixed;top:10%;left:5%;width:90%;height:70%;" +
        "z-index:2147483647;background:white;color:black;" +
        "font-size:16px;padding:10px;";
    document.body.appendChild(box);
    box.focus();
    box.select();

    // Try to copy automatically.
    try {
        if (document.execCommand("copy")) {
            alert("Output copied! Paste it directly into ChatGPT.");
        } else {
            alert("Output is selected. Press Ctrl+C, then paste it here.");
        }
    } catch {
        alert("Output is selected. Press Ctrl+C, then paste it here.");
    }
})();
