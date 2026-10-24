(() => {
    const results = [
        "AssetLoad",
        "AssetRegister",
        "AssetGet",
        "DynamicDraw",
        "CharacterRefresh"
    ];

    alert(
        "BC-Shit asset check:\n\n" +
        results.map(name =>
            name + ": " + typeof window[name]
        ).join("\n")
    );
})();
