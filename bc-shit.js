(() => {
    alert("BC-Shit version 2");

    const character = Character.find(c => c.ID === 8);

    if (character) {
        alert("Found character: " + character.Name);
    } else {
        alert("Character ID 8 not found");
    }
})();
