// dom.js
// Handles all DOM element selection and direct DOM manipulation

// Export DOM element selectors
export const friendsList = document.getElementById('friendsList');
export const addFriendBtn = document.getElementById('addFriendBtn');
export const friendModal = document.getElementById('friendModal');
export const friendForm = document.getElementById('friendForm');
export const exportBtn = document.getElementById('exportBtn');
export const importBtn = document.getElementById('importBtn');
export const importFile = document.getElementById('importFile');
export const modalTitle = document.getElementById('modalTitle');

// Utility to create and append floating add button
export function createFloatingAddBtn(onClick) {
    const floatingAddBtn = document.createElement('button');
    floatingAddBtn.id = 'floatingAddBtn';
    floatingAddBtn.title = 'Add Friend';
    floatingAddBtn.innerText = '+';
    floatingAddBtn.onclick = onClick;
    document.body.appendChild(floatingAddBtn);
}

// Utility to insert filter bar container if not present
export function ensureFilterBarContainer() {
    let filterBarContainer = document.getElementById('filterBarContainer');
    if (!filterBarContainer) {
        filterBarContainer = document.createElement('div');
        filterBarContainer.id = 'filterBarContainer';
        document.body.insertBefore(filterBarContainer, friendsList);
    }
    return filterBarContainer;
}
