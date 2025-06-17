// ui.js
// Rendering and UI helpers

// Show a modal by id
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
}

// Hide a modal by id
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        setTimeout(() => { modal.style.display = 'none'; }, 200);
    }
}

// Render a message in a container
export function renderMessage(container, message) {
    container.innerHTML = `<p>${message}</p>`;
}

// Render a list of cards (friends)
export function renderFriendCards(friends, container, renderCard) {
    container.innerHTML = '';
    if (friends.length === 0) {
        renderMessage(container, 'No friends added yet.');
        return;
    }
    friends.forEach((f, idx) => {
        const card = renderCard(f, idx);
        container.appendChild(card);
    });
}
