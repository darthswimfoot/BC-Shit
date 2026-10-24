(() => {
    const character = Character.find(c => c.ID === 8);

    if (character) {
        alert("BC-Shit: Found character " + character.Name);
    } else {
        alert("BC-Shit: Script loaded, but character ID 8 was not found.");
    }
})();
