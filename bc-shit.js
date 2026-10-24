(() => {
    const group = AssetGroup.Panties;

    alert(
        "Panties group:\n" +
        "AssetGroup.Panties = " + typeof group +
        "\nGroup name = " + (group?.Name ?? "not found") +
        "\nGroup keys = " + (
            group ? Object.keys(group).join(", ") : "none"
        )
    );
})();
