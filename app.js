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
        const local = localStorage.getItem('dropdown_options');
        if (local) {
            DROPDOWN_OPTIONS = JSON.parse(local);
            return;
        }
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
    attachDynamicDropdownListeners();
    attachComboboxListeners();
    document.getElementById('cancelBtn').onclick = closeModal;
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
                <button class="icon-btn" title="Edit" onclick="editFriend(${idx})">✏️</button>
                <button class="icon-btn" title="Delete" onclick="deleteFriend(${idx})">🗑️</button>
            </div>
            <h3>${f.fullName} ${f.nickname ? `(${f.nickname})` : ''}</h3>
            <div class="card-section">
                <button class="section-toggle" onclick="toggleSection(this)">Personal Info</button>
                <div class="section-content">
                    <p><span title="Birthday">🎂</span> <strong>Birthday:</strong> ${f.birthday || '-'}</p>
                    <p><span title="Relationship">❤️</span> <strong>Relationship:</strong> ${f.relationship || '-'}</p>
                    <p><span title="Clothing Size">👕</span> <strong>Clothing Size:</strong> ${f.clothingSize || '-'}</p>
                    <p><span title="Brand Preferences">🌸</span> <strong>Brand Pref:</strong> ${f.brandPreferences || '-'}</p>
                    <p><span title="Favorite Color">🎨</span> <strong>Color:</strong> ${f.favoriteColor || '-'}</p>
                    <p><span title="Tags/Notes">🏷️</span> <strong>Tags/Notes:</strong> ${f.tags || '-'}</p>
                    <p><span title="Personal Notes">📝</span> <strong>Notes:</strong> ${f.notes || '-'}</p>
                </div>
            </div>
            <div class="card-section">
                <button class="section-toggle" onclick="toggleSection(this)">Food & Dietary</button>
                <div class="section-content">
                    <p><span title="Food Preferences">🍽️</span> <strong>Food Pref:</strong> ${f.foodPreferences || '-'}</p>
                    <p><span title="Dietary Restrictions">🥗</span> <strong>Dietary:</strong> ${f.dietaryRestrictions || '-'}</p>
                    <p><span title="Allergies">⚠️</span> <strong>Allergies:</strong> ${f.allergies || '-'}</p>
                    <p><span title="Favorites">🍰</span> <strong>Favorite Meals/Drinks/Desserts:</strong> ${f.favorites || '-'}</p>
                </div>
            </div>
            <div class="card-section">
                <button class="section-toggle" onclick="toggleSection(this)">Gifts</button>
                <div class="section-content">
                    <p><span title="Gift History">🎁</span> <strong>Gift History:</strong> ${f.giftHistory || '-'}</p>
                    <p><span title="Gift Ideas">💡</span> <strong>Gift Ideas:</strong> ${f.giftIdeas || '-'}</p>
                </div>
            </div>
        `;
        friendsList.appendChild(card);
    });
}
function renderDropdown(name, selectedValue) {
    const options = DROPDOWN_OPTIONS[name] || [];
    let html = `<select name="${name}" data-dropdown="${name}">` +
        options.map(opt => `<option value="${opt.toLowerCase() || ''}"${selectedValue === opt.toLowerCase() ? ' selected' : ''}>${opt || 'Select...'}</option>`).join('');
    html += `<option value="__add_new__">+ Add new...</option></select>`;
    return html;
}
function renderCombobox(name, value) {
    const options = DROPDOWN_OPTIONS[name] || [];
    return `
      <div class="combobox-wrapper" style="position:relative;">
        <input type="text" name="${name}" class="combobox-input" autocomplete="off" value="${value || ''}" data-combobox="${name}" placeholder="Type or select..." />
        <div class="combobox-list" style="display:none; position:absolute; background:#fff; border:1px solid #ccc; z-index:10; max-height:120px; overflow-y:auto;"></div>
      </div>
    `;
}
function renderFriendForm(friend = {}) {
    return `
        <h2 id="modalTitle">${editingIndex !== null ? 'Edit Friend' : 'Add Friend'}</h2>
        <label>Full Name <input type="text" name="fullName" value="${friend.fullName || ''}" required></label>
        <label>Nickname <input type="text" name="nickname" value="${friend.nickname || ''}"></label>
        <label>Birthday <input type="date" name="birthday" value="${friend.birthday || ''}"></label>
        <label>Relationship Type
            ${renderCombobox('relationship', friend.relationship)}
        </label>
        <label>Food Preferences <input type="text" name="foodPreferences" value="${friend.foodPreferences || ''}"></label>
        <label>Dietary Restrictions
            ${renderCombobox('dietaryRestrictions', friend.dietaryRestrictions)}
        </label>
        <label>Allergies / Food Phobias <input type="text" name="allergies" value="${friend.allergies || ''}"></label>
        <label>Favorite Meals/Drinks/Desserts <input type="text" name="favorites" value="${friend.favorites || ''}"></label>
        <label>Gift History
            ${renderCombobox('giftHistory', friend.giftHistory)}
        </label>
        <label>Future Gift Ideas <input type="text" name="giftIdeas" value="${friend.giftIdeas || ''}"></label>
        <label>Tags/Notes <input type="text" name="tags" value="${friend.tags || ''}"></label>
        <label>Favorite Color
            ${renderCombobox('favoriteColor', friend.favoriteColor)}
        </label>
        <label>Clothing Size
            ${renderCombobox('clothingSize', friend.clothingSize)}
        </label>
        <label>Perfume/Brand Preferences <input type="text" name="brandPreferences" value="${friend.brandPreferences || ''}"></label>
        <label>Personal Notes <textarea name="notes">${friend.notes || ''}</textarea></label>
        <div class="modal-actions">
            <button type="submit">Save</button>
            <button type="button" id="cancelBtn">Cancel</button>
        </div>
    `;
}

// Handle dynamic add for dropdowns
function handleDropdownAddNew(e) {
    const select = e.target;
    if (select.value === '__add_new__') {
        const dropdownName = select.getAttribute('data-dropdown');
        setTimeout(() => {
            const newOption = prompt(`Add new option for ${dropdownName}:`);
            if (newOption && !DROPDOWN_OPTIONS[dropdownName].includes(newOption)) {
                DROPDOWN_OPTIONS[dropdownName].push(newOption);
                localStorage.setItem('dropdown_options', JSON.stringify(DROPDOWN_OPTIONS));
                // Re-render the form with the new option selected
                const formData = new FormData(friendForm);
                const friend = {};
                for (const [k, v] of formData.entries()) friend[k] = v;
                friend[dropdownName] = newOption.toLowerCase();
                friendForm.innerHTML = renderFriendForm(friend);
                attachDynamicDropdownListeners();
                attachComboboxListeners();
                friendForm.onsubmit = formSubmitHandler;
                document.getElementById('cancelBtn').onclick = closeModal;
            } else {
                // Reset selection if cancelled or duplicate
                select.value = '';
            }
        }, 100);
    }
}

function attachDynamicDropdownListeners() {
    friendForm.querySelectorAll('select[data-dropdown]').forEach(sel => {
        sel.addEventListener('change', handleDropdownAddNew);
    });
}
function attachComboboxListeners() {
    friendForm.querySelectorAll('.combobox-wrapper').forEach(wrapper => {
        const input = wrapper.querySelector('.combobox-input');
        const list = wrapper.querySelector('.combobox-list');
        const name = input.getAttribute('data-combobox');
        input.addEventListener('input', function() {
            const val = input.value.toLowerCase();
            const opts = (DROPDOWN_OPTIONS[name] || []).filter(opt => opt.toLowerCase().includes(val) && opt);
            if (opts.length > 0) {
                list.innerHTML = opts.map(opt => `<div class="combobox-item" style="padding:4px 8px; cursor:pointer;">${opt}</div>`).join('');
                list.style.display = 'block';
            } else {
                list.innerHTML = '';
                list.style.display = 'none';
            }
        });
        input.addEventListener('focus', function() {
            input.dispatchEvent(new Event('input'));
        });
        input.addEventListener('blur', function() {
            setTimeout(() => { list.style.display = 'none'; }, 200);
        });
        list.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('combobox-item')) {
                input.value = e.target.textContent;
                list.style.display = 'none';
            }
        });
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

// Move form submit logic to a named function
// In formSubmitHandler, after saving, add new value to options if not present
function formSubmitHandler(e) {
    e.preventDefault();
    const formData = new FormData(friendForm);
    const friend = {};
    for (const [k, v] of formData.entries()) friend[k] = v.trim();
    // Add new combobox values if not present
    ['relationship','dietaryRestrictions','giftHistory','favoriteColor','clothingSize'].forEach(field => {
        if (friend[field] && !DROPDOWN_OPTIONS[field].includes(friend[field])) {
            DROPDOWN_OPTIONS[field].push(friend[field]);
            localStorage.setItem('dropdown_options', JSON.stringify(DROPDOWN_OPTIONS));
        }
    });
    if (editingIndex !== null) {
        friends[editingIndex] = friend;
    } else {
        friends.push(friend);
    }
    saveFriends();
    renderFriends();
    closeModal();
}

// Collapsible section logic
window.toggleSection = function(btn) {
    const content = btn.nextElementSibling;
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        btn.classList.add('open');
    } else {
        content.style.display = 'none';
        btn.classList.remove('open');
    }
};

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

// Floating Add Friend Button
const floatingAddBtn = document.createElement('button');
floatingAddBtn.id = 'floatingAddBtn';
floatingAddBtn.title = 'Add Friend';
floatingAddBtn.innerText = '+';
floatingAddBtn.onclick = () => openModal();
document.body.appendChild(floatingAddBtn);
