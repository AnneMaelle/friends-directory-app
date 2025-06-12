// Friends Directory App
// Handles: add/edit/delete friends, localStorage, import/export, UI rendering

const STORAGE_KEY = 'friendsDirectory';
let friends = [];
let editingIndex = null;
let DROPDOWN_OPTIONS = {};

// DOM Elements
const friendsList = document.getElementById('friendsList');
const addFriendBtn = document.getElementById('addFriendBtn');
const friendModal = document.getElementById('friendModal');
const friendForm = document.getElementById('friendForm');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const modalTitle = document.getElementById('modalTitle');

// Load dropdown options from JSON asset
async function loadDropdownOptions() {
    try {
        const res = await fetch('dropdown_options.json');
        DROPDOWN_OPTIONS = await res.json();
    } catch (e) {
        // fallback to defaults if fetch fails
        DROPDOWN_OPTIONS = {
            relationship: ['', 'Friend', 'Colleague', 'Family', 'Partner', 'Other'],
            dietaryRestrictions: ['', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Other'],
            giftHistory: ['', 'Socks', 'Book', 'Mug', 'Perfume', 'Chocolate', 'Other'],
            favoriteColor: ['', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Black', 'White', 'Other'],
            clothingSize: ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other']
        };
    }
}

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
    friendModal.style.display = 'flex';
    friendModal.classList.remove('hidden');
    let friend = {};
    if (editIdx !== null) {
        editingIndex = editIdx;
        friend = friends[editIdx];
    } else {
        editingIndex = null;
    }
    friendForm.innerHTML = renderFriendForm(friend);
    // Re-attach cancel event
    document.getElementById('cancelBtn').onclick = closeModal;
    // Re-attach submit event
    friendForm.onsubmit = formSubmitHandler;
}
function closeModal() {
    friendModal.classList.add('hidden');
    setTimeout(() => {
        friendModal.style.display = 'none';
    }, 200);
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
function renderDropdown(name, selectedValue) {
    const options = DROPDOWN_OPTIONS[name] || [];
    return `<select name="${name}">` +
        options.map(opt => `<option value="${opt.toLowerCase() || ''}"${selectedValue === opt.toLowerCase() ? ' selected' : ''}>${opt || 'Select...'}</option>`).join('') +
        '</select>';
}
function renderFriendForm(friend = {}) {
    return `
        <h2 id="modalTitle">${editingIndex !== null ? 'Edit Friend' : 'Add Friend'}</h2>
        <label>Full Name <input type="text" name="fullName" value="${friend.fullName || ''}" required></label>
        <label>Nickname <input type="text" name="nickname" value="${friend.nickname || ''}"></label>
        <label>Birthday <input type="date" name="birthday" value="${friend.birthday || ''}"></label>
        <label>Relationship Type
            ${renderDropdown('relationship', friend.relationship)}
        </label>
        <label>Food Preferences <input type="text" name="foodPreferences" value="${friend.foodPreferences || ''}"></label>
        <label>Dietary Restrictions
            ${renderDropdown('dietaryRestrictions', friend.dietaryRestrictions)}
        </label>
        <label>Allergies / Food Phobias <input type="text" name="allergies" value="${friend.allergies || ''}"></label>
        <label>Favorite Meals/Drinks/Desserts <input type="text" name="favorites" value="${friend.favorites || ''}"></label>
        <label>Gift History
            ${renderDropdown('giftHistory', friend.giftHistory)}
        </label>
        <label>Future Gift Ideas <input type="text" name="giftIdeas" value="${friend.giftIdeas || ''}"></label>
        <label>Tags/Notes <input type="text" name="tags" value="${friend.tags || ''}"></label>
        <label>Favorite Color
            ${renderDropdown('favoriteColor', friend.favoriteColor)}
        </label>
        <label>Clothing Size
            ${renderDropdown('clothingSize', friend.clothingSize)}
        </label>
        <label>Perfume/Brand Preferences <input type="text" name="brandPreferences" value="${friend.brandPreferences || ''}"></label>
        <label>Personal Notes <textarea name="notes">${friend.notes || ''}</textarea></label>
        <div class="modal-actions">
            <button type="submit">Save</button>
            <button type="button" id="cancelBtn">Cancel</button>
        </div>
    `;
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

// Move form submit logic to a named function
function formSubmitHandler(e) {
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
}

// Modal Controls
addFriendBtn.onclick = () => openModal();
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
(async function init() {
    await loadDropdownOptions();
    loadFriends();
    renderFriends();
    // On page load, ensure modal is hidden
    friendModal.classList.add('hidden');
    friendModal.style.display = 'none';
})();
