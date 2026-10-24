
(() => {
    const groups = Object.keys(AssetGroup);
    const matches = groups.filter(k =>
        /pant|cloth|under|bra/i.test(k)
    );

    const output = [
        "AssetGroup type: " + typeof AssetGroup,
        "Group count: " + groups.length,
        "Matching keys: " + (matches.join(", ") || "none"),
        "First 30 keys: " + groups.slice(0, 30).join(", "),
    ].join("\n");

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
