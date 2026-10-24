
(() => {
    const matches = Array.from(AssetGroup)
        .map((g, i) => ({
            index: i,
            name: g?.Name,
            description: g?.Description,
            category: g?.Category,
        }))
        .filter(g =>
            /pant|under|cloth|lingerie|bra|bottom/i.test(
                [g.name, g.description, g.category].join(" ")
            )
        );

    const output = JSON.stringify(matches, null, 2) ||
        "No matching entries found.";

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
