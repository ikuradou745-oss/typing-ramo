function generateAnonymousName() {
    const sessionRandom = Math.random().toString(36).substr(2, 5);
    const timestamp = Date.now().toString(36);
    const salt = localStorage.getItem('nameSalt') || 'defaultSalt';
    return `${sessionRandom}-${timestamp}-${salt}`;
}

function generateFriendCode() {
    const array = new Uint32Array(3);
    window.crypto.getRandomValues(array);
    return Array.from(array, num => num.toString(36)).join('');
}

// Adding an event listener for the change name button
document.getElementById('changeNameButton').addEventListener('click', function() {
    if (currentUserData) {
        // Show modal
        $('#nameChangeModal').modal('show');
    }
});