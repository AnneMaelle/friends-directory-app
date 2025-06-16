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

// Move filter bar into #filterBarContainer for new layout
function renderTagFilters() {
    let filterBar = document.getElementById('filterBar');
    if (!filterBar) {
        filterBar = document.createElement('div');
        filterBar.id = 'filterBar';
        filterBar.className = 'filter-bar';
    }
    filterBar.innerHTML = `
        <button class="filter-btn${!activeTagFilter ? ' active' : ''}" data-type="all" onclick="window.setTagFilter(null)">All</button>
        <button class="filter-btn${activeTagFilter==='birthdays' ? ' active' : ''}" data-type="birthdays" onclick="window.setTagFilter('birthdays')">🎂 Birthdays Soon</button>
        <button class="filter-btn${activeTagFilter==='vegan' ? ' active' : ''}" data-type="vegan" onclick="window.setTagFilter('vegan')">🌱 Vegan Friends</button>
        <button class="filter-btn add-filter-btn" title="Add custom filter" onclick="window.openAddFilterModal()">+</button>
    `;
    // Insert filterBar into the new container
    let filterBarContainer = document.getElementById('filterBarContainer');
    if (!filterBarContainer) {
        filterBarContainer = document.createElement('div');
        filterBarContainer.id = 'filterBarContainer';
        document.body.insertBefore(filterBarContainer, document.getElementById('friendsList'));
    }
    filterBarContainer.innerHTML = '';
    filterBarContainer.appendChild(filterBar);
}
window.setTagFilter = function(tag) {
    activeTagFilter = tag;
    renderFriends();
    renderTagFilters();
};

// Add filter modal logic
window.openAddFilterModal = function() {
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
        <div id="filterRows"></div>
        <button type="button" id="addFilterRow" style="background:#eaf4fb;color:#4a90e2;border:none;padding:0.4em 1em;border-radius:5px;cursor:pointer;font-weight:600;margin-bottom:0.5em;">+ Add Condition</button>
        <div style="display:flex;gap:1em;justify-content:flex-end;">
          <button type="button" id="cancelCustomFilter" style="background:#eee;color:#4a90e2;border:none;padding:0.5em 1.2em;border-radius:5px;cursor:pointer;">Cancel</button>
          <button type="submit" style="background:linear-gradient(135deg,#4a90e2 60%,#50e3c2 100%);color:#fff;border:none;padding:0.5em 1.2em;border-radius:5px;cursor:pointer;font-weight:600;">Add</button>
        </div>
      </form>
    `;
    document.body.appendChild(modal);
    document.getElementById('cancelCustomFilter').onclick = () => modal.remove();

    // Add filter row logic
    const filterRows = document.getElementById('filterRows');
    function addRow(field = '', cond = 'contains', value = '') {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '0.5em';
        row.style.marginBottom = '0.5em';
        row.innerHTML = `
          <select name="filterField" required style="padding:0.3em;">
            <option value="">Field...</option>
            <option value="fullName">Full Name</option>
            <option value="nickname">Nickname</option>
            <option value="foodPreferences">Food Pref</option>
            <option value="dietaryRestrictions">Dietary</option>
            <option value="relationship">Relationship</option>
            <option value="tags">Tags/Notes</option>
            <option value="favoriteColor">Color</option>
            <option value="clothingSize">Clothing Size</option>
            <option value="brandPreferences">Brand Pref</option>
            <option value="allergies">Allergies</option>
            <option value="giftHistory">Gift History</option>
            <option value="giftIdeas">Gift Ideas</option>
          </select>
          <select name="filterCond" required style="padding:0.3em;">
            <option value="contains">contains</option>
            <option value="equals">equals</option>
          </select>
          <input type="text" name="filterValue" required placeholder="Value" style="padding:0.3em;flex:1;">
          <button type="button" class="removeRowBtn" style="background:#fff;color:#e74c3c;border:none;font-size:1.2em;cursor:pointer;">&times;</button>
        `;
        row.querySelector('select[name="filterField"]').value = field;
        row.querySelector('select[name="filterCond"]').value = cond;
        row.querySelector('input[name="filterValue"]').value = value;
        row.querySelector('.removeRowBtn').onclick = () => row.remove();
        filterRows.appendChild(row);
    }
    document.getElementById('addFilterRow').onclick = () => addRow();
    addRow(); // Add initial row
    document.getElementById('customFilterForm').onsubmit = function(e) {
        e.preventDefault();
        const name = this.filterName.value.trim();
        const rows = Array.from(filterRows.children).map(row => {
            return {
                field: row.querySelector('select[name="filterField"]').value,
                cond: row.querySelector('select[name="filterCond"]').value,
                value: row.querySelector('input[name="filterValue"]').value.trim()
            };
        }).filter(r => r.field && r.value);
        if (!name || !rows.length) return;
        if (!window.customFilters) window.customFilters = [];
        window.customFilters.push({ name, conditions: rows });
        modal.remove();
        renderTagFilters();
    };
};

// Update renderTagFilters to use filter.conditions
const origRenderTagFilters = renderTagFilters;
renderTagFilters = function() {
    origRenderTagFilters();
    const filterBar = document.getElementById('filterBar');
    if (window.customFilters && window.customFilters.length) {
        window.customFilters.forEach((filter, i) => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn' + (activeTagFilter===`custom${i}` ? ' active' : '');
            btn.setAttribute('data-type', `custom${i}`);
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

// Update renderFriends to support multiple conditions
// const origRenderFriends = renderFriends;
renderFriends = function() {
    let filtered = friends;
    if (activeTagFilter && activeTagFilter.startsWith('custom')) {
        const idx = parseInt(activeTagFilter.replace('custom', ''));
        const filter = window.customFilters && window.customFilters[idx];
        if (filter && filter.conditions) {
            filtered = friends.filter(f => filter.conditions.every(cond => {
                const fieldVal = (f[cond.field]||'').toString().toLowerCase();
                const val = cond.value.toLowerCase();
                if (cond.cond === 'contains') return fieldVal.includes(val);
                if (cond.cond === 'equals') return fieldVal === val;
                return false;
            }));
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

// --- Custom Filters Persistence ---
const CUSTOM_FILTERS_KEY = 'friendsDirectoryCustomFilters';
function saveCustomFilters() {
    localStorage.setItem(CUSTOM_FILTERS_KEY, JSON.stringify(window.customFilters || []));
}
function loadCustomFilters() {
    const data = localStorage.getItem(CUSTOM_FILTERS_KEY);
    window.customFilters = data ? JSON.parse(data) : [];
}

// Patch openAddFilterModal to save after adding
const origOpenAddFilterModal = window.openAddFilterModal;
window.openAddFilterModal = function() {
    origOpenAddFilterModal.apply(this, arguments);
    // Patch the submit handler to save after adding
    const form = document.getElementById('customFilterForm');
    if (form) {
        const origSubmit = form.onsubmit;
        form.onsubmit = function(e) {
            origSubmit.call(this, e);
            saveCustomFilters();
        };
    }
};

// Patch renderTagFilters to load from storage if needed
const origRenderTagFilters2 = renderTagFilters;
renderTagFilters = function() {
    if (!window.customFilters) loadCustomFilters();
    origRenderTagFilters2();
};

// On init, load custom filters
(async function init() {
    await loadDropdownOptions();
    loadFriends();
    loadCustomFilters();
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

function renderFriendForm(friend = {}) {
    // Render combobox for fields with dropdown options, else use text input
    function renderComboOrText(name, label, value) {
        if (DROPDOWN_OPTIONS[name]) {
            return `<label>${label}
                <input class="combobox-input" name="${name}" list="${name}List" value="${value || ''}" />
                <datalist id="${name}List">
                    ${DROPDOWN_OPTIONS[name].map(opt => `<option value="${opt}"></option>`).join('')}
                </datalist>
            </label>`;
        } else {
            return `<label>${label}
                <input type="text" name="${name}" value="${value || ''}" />
            </label>`;
        }
    }
    return `
        <label>Full Name
            <input type="text" name="fullName" value="${friend.fullName || ''}" required />
        </label>
        <label>Nickname
            <input type="text" name="nickname" value="${friend.nickname || ''}" />
        </label>
        <label>Birthday
            <input type="date" name="birthday" value="${friend.birthday || ''}" />
        </label>
        ${renderComboOrText('relationship', 'Relationship', friend.relationship)}
        ${renderComboOrText('clothingSize', 'Clothing Size', friend.clothingSize)}
        ${renderComboOrText('brandPreferences', 'Brand Preferences', friend.brandPreferences)}
        ${renderComboOrText('favoriteColor', 'Favorite Color', friend.favoriteColor)}
        <label>Tags/Notes
            <input type="text" name="tags" value="${friend.tags || ''}" />
        </label>
        <label>Notes
            <textarea name="notes">${friend.notes || ''}</textarea>
        </label>
        ${renderComboOrText('foodPreferences', 'Food Preferences', friend.foodPreferences)}
        ${renderComboOrText('dietaryRestrictions', 'Dietary Restrictions', friend.dietaryRestrictions)}
        <label>Allergies
            <input type="text" name="allergies" value="${friend.allergies || ''}" />
        </label>
        <label>Favorite Meals/Drinks/Desserts
            <input type="text" name="favorites" value="${friend.favorites || ''}" />
        </label>
        ${renderComboOrText('giftHistory', 'Gift History', friend.giftHistory)}
        <label>Gift Ideas
            <input type="text" name="giftIdeas" value="${friend.giftIdeas || ''}" />
        </label>
        <div class="modal-actions">
            <button type="submit">Save</button>
            <button type="button" id="cancelBtn">Cancel</button>
        </div>
    `;
}

function attachDynamicDropdownListeners() {
    // Enable dynamic addition of new dropdown options
    const selects = friendForm.querySelectorAll('select[data-dropdown]');
    selects.forEach(select => {
        select.onchange = function() {
            if (this.value === '__add_new__') {
                const field = this.getAttribute('data-dropdown');
                const newOption = prompt('Add new option:');
                if (newOption) {
                    // Add to dropdown options in memory
                    if (!DROPDOWN_OPTIONS[field]) DROPDOWN_OPTIONS[field] = [];
                    DROPDOWN_OPTIONS[field].push(newOption);
                    // Save to localStorage for persistence
                    localStorage.setItem('dropdown_options', JSON.stringify(DROPDOWN_OPTIONS));
                    // Re-render the dropdown
                    this.innerHTML = DROPDOWN_OPTIONS[field].map(opt => `<option value="${opt.toLowerCase()}">${opt}</option>`).join('') + '<option value="__add_new__">+ Add new...</option>';
                    this.value = newOption.toLowerCase();
                } else {
                    this.value = '';
                }
            }
        };
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
                // Save to localStorage if new value
                if (input.value && !DROPDOWN_OPTIONS[name].includes(input.value)) {
                    DROPDOWN_OPTIONS[name].push(input.value);
                    localStorage.setItem('dropdown_options', JSON.stringify(DROPDOWN_OPTIONS));
                }
                list.style.display = 'none';
            }
        });
    });
}

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

// Re-add global editFriend and deleteFriend functions
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
