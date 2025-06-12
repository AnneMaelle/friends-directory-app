// Friends Directory App
// Handles: add/edit/delete friends, localStorage, import/export, UI rendering

const STORAGE_KEY = 'friendsDirectory';
let friends = [];
let editingIndex = null;

// DOM Elements
const friendsList = document.getElementById('friendsList');
const addFriendBtn = document.getElementById('addFriendBtn');
const friendModal = document.getElementById('friendModal');
const friendForm = document.getElementById('friendForm');
const cancelBtn = document.getElementById('cancelBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const modalTitle = document.getElementById('modalTitle');

// Utility
function saveFriends() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}
function loadFriends() {
    const data = localStorage.getItem(STORAGE_KEY);
    friends = data ? JSON.parse(data) : [];
}
function resetForm() {
    friendForm.reset();
    editingIndex = null;
}
function openModal(editIdx = null) {
    friendModal.classList.remove('hidden');
    if (editIdx !== null) {
        modalTitle.textContent = 'Edit Friend';
        editingIndex = editIdx;
        const f = friends[editIdx];
        for (const [k, v] of Object.entries(f)) {
            if (friendForm.elements[k]) friendForm.elements[k].value = v || '';
        }
    } else {
        modalTitle.textContent = 'Add Friend';
        resetForm();
    }
}
function closeModal() {
    friendModal.classList.add('hidden');
    resetForm();
}

// Render
function renderFriends() {
    friendsList.innerHTML = '';
    if (friends.length === 0) {
        friendsList.innerHTML = '<p>No friends added yet.</p>';
        return;
    }
    friends.forEach((f, idx) => {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.innerHTML = `
            <div class="card-actions">
                <button onclick="editFriend(${idx})">Edit</button>
                <button onclick="deleteFriend(${idx})">Delete</button>
            </div>
            <h3>${f.fullName} ${f.nickname ? `(${f.nickname})` : ''}</h3>
            <p><strong>Birthday:</strong> ${f.birthday || '-'}</p>
            <p><strong>Relationship:</strong> ${f.relationship || '-'}</p>
            <p><strong>Food Pref:</strong> ${f.foodPreferences || '-'}</p>
            <p><strong>Dietary:</strong> ${f.dietaryRestrictions || '-'}</p>
            <p><strong>Allergies:</strong> ${f.allergies || '-'}</p>
            <p><strong>Favorites:</strong> ${f.favorites || '-'}</p>
            <p><strong>Gift History:</strong> ${f.giftHistory || '-'}</p>
            <p><strong>Gift Ideas:</strong> ${f.giftIdeas || '-'}</p>
            <p><strong>Tags/Notes:</strong> ${f.tags || '-'}</p>
            <p><strong>Color:</strong> ${f.favoriteColor || '-'}</p>
            <p><strong>Clothing Size:</strong> ${f.clothingSize || '-'}</p>
            <p><strong>Brand Pref:</strong> ${f.brandPreferences || '-'}</p>
            <p><strong>Notes:</strong> ${f.notes || '-'}</p>
        `;
        friendsList.appendChild(card);
    });
}

// Add/Edit/Delete
window.editFriend = function(idx) {
    openModal(idx);
};
window.deleteFriend = function(idx) {
    if (confirm('Delete this friend?')) {
        friends.splice(idx, 1);
        saveFriends();
        renderFriends();
    }
};

// Form Submit
friendForm.onsubmit = function(e) {
    e.preventDefault();
    const formData = new FormData(friendForm);
    const friend = {};
    for (const [k, v] of formData.entries()) friend[k] = v.trim();
    if (editingIndex !== null) {
        friends[editingIndex] = friend;
    } else {
        friends.push(friend);
    }
    saveFriends();
    renderFriends();
    closeModal();
};

// Modal Controls
addFriendBtn.onclick = () => openModal();
cancelBtn.onclick = closeModal;
friendModal.onclick = (e) => { if (e.target === friendModal) closeModal(); };

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Export/Import
exportBtn.onclick = function() {
    const dataStr = JSON.stringify(friends, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'friends_directory.json';
    a.click();
    URL.revokeObjectURL(url);
};
importBtn.onclick = function() {
    importFile.click();
};
importFile.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (Array.isArray(imported)) {
                friends = imported;
                saveFriends();
                renderFriends();
                alert('Import successful!');
            } else {
                alert('Invalid file format.');
            }
        } catch {
            alert('Failed to import file.');
        }
    };
    reader.readAsText(file);
};

// Init
loadFriends();
renderFriends();
