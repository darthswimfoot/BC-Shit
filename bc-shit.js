(() => {
    const results = {
        AssetLoad: AssetLoad.length,
        AssetGet: AssetGet.length,
        AssetKeys: Object.keys(Asset),
        AssetGroupKeys: Object.keys(AssetGroup).slice(0, 30),
    };

    console.log("BC-Shit diagnostics:", results);

    alert(
        "AssetLoad arguments: " + results.AssetLoad +
        "\nAssetGet arguments: " + results.AssetGet +
        "\nAsset keys: " + results.AssetKeys.join(", ") +
        "\nAssetGroup keys: " + results.AssetGroupKeys.join(", ") +
        "\n\nMore details are in the browser console (F12)."
    );
})();
