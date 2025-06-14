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

// Utility: Calculate days until next birthday
function daysUntilBirthday(birthday) {
    if (!birthday) return null;
    const today = new Date();
    const bday = new Date(birthday);
    bday.setFullYear(today.getFullYear());
    if (bday < today) bday.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((bday - today) / (1000 * 60 * 60 * 24));
    return diff;
}

// Tag filter state
let activeTagFilter = null;

// Render tag filters at the top
function renderTagFilters() {
    const filterBar = document.getElementById('filterBar') || document.createElement('div');
    filterBar.id = 'filterBar';
    filterBar.className = 'filter-bar';
    filterBar.innerHTML = `
        <button class="filter-btn${!activeTagFilter ? ' active' : ''}" onclick="window.setTagFilter(null)">All</button>
        <button class="filter-btn${activeTagFilter==='birthdays' ? ' active' : ''}" onclick="window.setTagFilter('birthdays')">🎂 Birthdays Soon</button>
        <button class="filter-btn${activeTagFilter==='vegan' ? ' active' : ''}" onclick="window.setTagFilter('vegan')">🌱 Vegan Friends</button>
        <button class="filter-btn add-filter-btn" title="Add custom filter" onclick="window.openAddFilterModal()">+</button>
    `;
    friendsList.parentNode.insertBefore(filterBar, friendsList);
}
window.setTagFilter = function(tag) {
    activeTagFilter = tag;
    renderFriends();
    renderTagFilters();
};

// Add filter modal logic
window.openAddFilterModal = function() {
    // Create modal overlay
    let modal = document.getElementById('customFilterModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'customFilterModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.25)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
      <form id="customFilterForm" style="background:#fff;padding:2rem 2.5rem;border-radius:12px;box-shadow:0 4px 24px rgba(74,144,226,0.13);display:flex;flex-direction:column;gap:1.2rem;min-width:320px;max-width:90vw;">
        <h2 style="margin:0 0 0.5em 0;font-size:1.3em;color:#4a90e2;">Add Custom Filter</h2>
        <label style="font-weight:500;">Filter Name
          <input type="text" name="filterName" required placeholder="e.g. Cheese Lovers" style="margin-top:0.3em;padding:0.5em;font-size:1em;">
        </label>
        <label style="font-weight:500;">Query (e.g. <i>foodPreferences contains cheese</i>)
          <input type="text" name="filterQuery" required placeholder="e.g. foodPreferences contains cheese" style="margin-top:0.3em;padding:0.5em;font-size:1em;">
        </label>
        <div style="display:flex;gap:1em;justify-content:flex-end;">
          <button type="button" id="cancelCustomFilter" style="background:#eee;color:#4a90e2;border:none;padding:0.5em 1.2em;border-radius:5px;cursor:pointer;">Cancel</button>
          <button type="submit" style="background:linear-gradient(135deg,#4a90e2 60%,#50e3c2 100%);color:#fff;border:none;padding:0.5em 1.2em;border-radius:5px;cursor:pointer;font-weight:600;">Add</button>
        </div>
      </form>
    `;
    document.body.appendChild(modal);
    document.getElementById('cancelCustomFilter').onclick = () => modal.remove();
    document.getElementById('customFilterForm').onsubmit = function(e) {
        e.preventDefault();
        const name = this.filterName.value.trim();
        const query = this.filterQuery.value.trim();
        if (!name || !query) return;
        if (!window.customFilters) window.customFilters = [];
        window.customFilters.push({ name, query });
        modal.remove();
        renderTagFilters();
    };
};

// Extend renderTagFilters to show custom filters
const origRenderTagFilters = renderTagFilters;
renderTagFilters = function() {
    origRenderTagFilters();
    const filterBar = document.getElementById('filterBar');
    if (window.customFilters && window.customFilters.length) {
        window.customFilters.forEach((filter, i) => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn' + (activeTagFilter===`custom${i}` ? ' active' : '');
            btn.textContent = filter.name;
            btn.onclick = () => {
                activeTagFilter = `custom${i}`;
                renderFriends();
                renderTagFilters();
            };
            filterBar.insertBefore(btn, filterBar.querySelector('.add-filter-btn'));
        });
    }
};

// Render
function renderFriends() {
    let filtered = friends;
    if (activeTagFilter && activeTagFilter.startsWith('custom')) {
        const idx = parseInt(activeTagFilter.replace('custom', ''));
        const filter = window.customFilters && window.customFilters[idx];
        if (filter) {
            // Parse query: e.g. 'foodPreferences contains cheese'
            const match = filter.query.match(/^(\w+)\s+contains\s+(.+)$/i);
            if (match) {
                const field = match[1];
                const value = match[2].toLowerCase();
                filtered = friends.filter(f => (f[field]||'').toString().toLowerCase().includes(value));
            } else {
                // fallback: search all fields for the query string
                const keyword = filter.query.toLowerCase();
                filtered = friends.filter(f => Object.values(f).some(val => (val||'').toString().toLowerCase().includes(keyword)));
            }
        }
    }
    else if (activeTagFilter === 'birthdays') {
        filtered = friends.filter(f => {
            const days = daysUntilBirthday(f.birthday);
            return days !== null && days <= 30;
        });
    } else if (activeTagFilter === 'vegan') {
        filtered = friends.filter(f => (f.dietaryRestrictions||'').toLowerCase().includes('vegan'));
    }
    friendsList.innerHTML = '';
    if (filtered.length === 0) {
        friendsList.innerHTML = '<p>No friends added yet.</p>';
        return;
    }
    filtered.forEach((f, idx) => {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-idx', idx);
        // Drag events
        card.ondragstart = function(e) {
            e.dataTransfer.setData('text/plain', idx);
            card.classList.add('dragging');
        };
        card.ondragend = function() {
            card.classList.remove('dragging');
        };
        card.ondragover = function(e) {
            e.preventDefault();
            card.classList.add('drag-over');
        };
        card.ondragleave = function() {
            card.classList.remove('drag-over');
        };
        card.ondrop = function(e) {
            e.preventDefault();
            card.classList.remove('drag-over');
            const fromIdx = +e.dataTransfer.getData('text/plain');
            const toIdx = idx;
            if (fromIdx !== toIdx) {
                const moved = filtered.splice(fromIdx, 1)[0];
                filtered.splice(toIdx, 0, moved);
                // Update main friends array
                if (filtered.length === friends.length) {
                    friends = filtered;
                } else {
                    // If filtered, reorder only visible subset
                    const origIdx = friends.indexOf(moved);
                    friends.splice(origIdx, 1);
                    friends.splice(toIdx, 0, moved);
                }
                saveFriends();
                renderFriends();
            }
        };
        // Helper to render a field or a + Add link if empty
        function renderField(label, value, icon, fieldName) {
            if (value && value !== '-') {
                return `<p><span title="${label}">${icon}</span> <strong>${label}:</strong> ${value}</p>`;
            } else {
                return `<p class="add-field"><span title="${label}">${icon}</span> <strong>${label}:</strong> <a href="#" onclick="editFriend(${idx});event.preventDefault();" class="add-link">+ Add</a></p>`;
            }
        }
        // Birthday badge
        let birthdayBadge = '';
        const days = daysUntilBirthday(f.birthday);
        if (days !== null && !isNaN(days)) {
            if (days === 0) {
                birthdayBadge = '<span class="birthday-badge today">🎉 Birthday Today!</span>';
            } else {
                birthdayBadge = `<div class="birthday-badge" style="font-style:italic;font-size:0.98em;margin-top:0.2em;">🎂 Next birthday in ${days} day${days>1?'s':''}</div>`;
            }
        }
        card.innerHTML = `
            <div class="card-actions">
                <button class="icon-btn" title="Edit" onclick="editFriend(${idx})">✏️</button>
                <button class="icon-btn" title="Delete" onclick="deleteFriend(${idx})">🗑️</button>
            </div>
            <h3>${f.fullName} ${f.nickname ? `(${f.nickname})` : ''}</h3>
            ${birthdayBadge}
            <div class="card-section">
                <button class="section-toggle" onclick="toggleSection(this)">Personal Info</button>
                <div class="section-content">
                    ${renderField('Birthday', f.birthday, '🎂', 'birthday')}
                    ${renderField('Relationship', f.relationship, '❤️', 'relationship')}
                    ${renderField('Clothing Size', f.clothingSize, '👕', 'clothingSize')}
                    ${renderField('Brand Pref', f.brandPreferences, '🌸', 'brandPreferences')}
                    ${renderField('Color', f.favoriteColor, '🎨', 'favoriteColor')}
                    ${renderField('Tags/Notes', f.tags, '🏷️', 'tags')}
                    ${renderField('Notes', f.notes, '📝', 'notes')}
                </div>
            </div>
            <div class="card-section">
                <button class="section-toggle" onclick="toggleSection(this)">Food & Dietary</button>
                <div class="section-content">
                    ${renderField('Food Pref', f.foodPreferences, '🍽️', 'foodPreferences')}
                    ${renderField('Dietary', f.dietaryRestrictions, '🥗', 'dietaryRestrictions')}
                    ${renderField('Allergies', f.allergies, '⚠️', 'allergies')}
                    ${renderField('Favorite Meals/Drinks/Desserts', f.favorites, '🍰', 'favorites')}
                </div>
            </div>
            <div class="card-section">
                <button class="section-toggle" onclick="toggleSection(this)">Gifts</button>
                <div class="section-content">
                    ${renderField('Gift History', f.giftHistory, '🎁', 'giftHistory')}
                    ${renderField('Gift Ideas', f.giftIdeas, '💡', 'giftIdeas')}
                </div>
            </div>
        `;
        friendsList.appendChild(card);
    });
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

// After renderFriends, also render tag filters
const origRenderFriends = renderFriends;
renderFriends = function() {
    origRenderFriends();
    renderTagFilters();
};

// Delete friend function
function deleteFriend(idx) {
    if (confirm('Are you sure you want to delete this friend?')) {
        friends.splice(idx, 1);
        saveFriends();
        renderFriends();
    }
}
