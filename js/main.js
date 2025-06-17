// main.js
// App entry point: orchestrates modules and app logic

import * as dom from './dom.js';
import * as storage from './storage.js';
import * as ui from './ui.js';
import * as form from './form.js';

// App state
let friends = [];
let editingIndexRef = { value: null };
let DROPDOWN_OPTIONS = {};
let activeTagFilter = null;
let customFilters = [];

// --- Data Loading ---
async function loadDropdownOptions() {
    DROPDOWN_OPTIONS = storage.loadDropdownOptions();
    if (!DROPDOWN_OPTIONS) {
        try {
            const res = await fetch('dropdown_options.json');
            DROPDOWN_OPTIONS = await res.json();
        } catch {
            DROPDOWN_OPTIONS = {
                relationship: ['', 'Friend', 'Colleague', 'Family', 'Partner', 'Other'],
                dietaryRestrictions: ['', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Other'],
                giftHistory: ['', 'Socks', 'Book', 'Mug', 'Perfume', 'Chocolate', 'Other'],
                favoriteColor: ['', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Black', 'White', 'Other'],
                clothingSize: ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other']
            };
        }
    }
}

function loadAllData() {
    friends = storage.loadFriends();
    customFilters = storage.loadCustomFilters();
}

// --- Utility: Days until next birthday ---
function daysUntilBirthday(birthday) {
    if (!birthday) return null;
    const today = new Date();
    const bday = new Date(birthday);
    bday.setFullYear(today.getFullYear());
    if (bday < today) bday.setFullYear(today.getFullYear() + 1);
    return Math.ceil((bday - today) / (1000 * 60 * 60 * 24));
}

// --- Filtering logic ---
function getFilteredFriends() {
    let filtered = friends;
    if (activeTagFilter && activeTagFilter.startsWith('custom')) {
        const idx = parseInt(activeTagFilter.replace('custom', ''));
        const filter = customFilters && customFilters[idx];
        if (filter && filter.conditions) {
            filtered = friends.filter(f => filter.conditions.every(cond => {
                const fieldVal = (f[cond.field]||'').toString().toLowerCase();
                const val = cond.value.toLowerCase();
                if (cond.cond === 'contains') return fieldVal.includes(val);
                if (cond.cond === 'equals') return fieldVal === val;
                return false;
            }));
        }
    } else if (activeTagFilter === 'birthdays') {
        filtered = friends.filter(f => {
            const days = daysUntilBirthday(f.birthday);
            return days !== null && days <= 30;
        });
    } else if (activeTagFilter === 'vegan') {
        filtered = friends.filter(f => (f.dietaryRestrictions||'').toLowerCase().includes('vegan'));
    }
    return filtered;
}

// --- UI Rendering ---
function renderFriends() {
    ui.renderFriendCards(
        getFilteredFriends(),
        dom.friendsList,
        renderFriendCard
    );
}

function renderFriendCard(f, idx) {
    const card = document.createElement('div');
    card.className = 'friend-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-idx', idx);
    // Drag events
    card.ondragstart = function(e) {
        e.dataTransfer.setData('text/plain', idx);
        card.classList.add('dragging');
    };
    card.ondragend = function() { card.classList.remove('dragging'); };
    card.ondragover = function(e) { e.preventDefault(); card.classList.add('drag-over'); };
    card.ondragleave = function() { card.classList.remove('drag-over'); };
    card.ondrop = function(e) {
        e.preventDefault();
        card.classList.remove('drag-over');
        const fromIdx = +e.dataTransfer.getData('text/plain');
        const toIdx = idx;
        if (fromIdx !== toIdx) {
            const moved = friends.splice(fromIdx, 1)[0];
            friends.splice(toIdx, 0, moved);
            storage.saveFriends(friends);
            renderFriends();
        }
    };
    // Helper to render a field or a + Add link if empty
    function renderField(label, value, icon, fieldName) {
        if (value && value !== '-') {
            return `<p><span title="${label}">${icon}</span> <strong>${label}:</strong> ${value}</p>`;
        } else {
            return `<p class="add-field"><span title="${label}">${icon}</span> <strong>${label}:</strong> <a href="#" data-edit="${idx}" class="add-link">+ Add</a></p>`;
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
            <button class="icon-btn" title="Edit" data-edit="${idx}">✏️</button>
            <button class="icon-btn" title="Delete" data-delete="${idx}">🗑️</button>
        </div>
        <h3>${f.fullName || ''} ${f.nickname ? `(${f.nickname})` : ''}</h3>
        ${birthdayBadge}
        <div class="card-section">
            <button class="section-toggle">Personal Info</button>
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
            <button class="section-toggle">Food & Dietary</button>
            <div class="section-content">
                ${renderField('Food Pref', f.foodPreferences, '🍽️', 'foodPreferences')}
                ${renderField('Dietary', f.dietaryRestrictions, '🥗', 'dietaryRestrictions')}
                ${renderField('Allergies', f.allergies, '⚠️', 'allergies')}
                ${renderField('Favorite Meals/Drinks/Desserts', f.favorites, '🍰', 'favorites')}
            </div>
        </div>
        <div class="card-section">
            <button class="section-toggle">Gifts</button>
            <div class="section-content">
                ${renderField('Gift History', f.giftHistory, '🎁', 'giftHistory')}
                ${renderField('Gift Ideas', f.giftIdeas, '💡', 'giftIdeas')}
            </div>
        </div>
    `;
    // Section toggle logic
    card.querySelectorAll('.section-toggle').forEach(btn => {
        btn.onclick = function() {
            const content = btn.nextElementSibling;
            if (content.style.display === 'none' || !content.style.display) {
                content.style.display = 'block';
                btn.classList.add('open');
            } else {
                content.style.display = 'none';
                btn.classList.remove('open');
            }
        };
    });
    // Edit/Delete/Add handlers
    card.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = e => {
            e.preventDefault();
            openEditModal(idx);
        };
    });
    card.querySelectorAll('[data-delete]').forEach(btn => {
        btn.onclick = e => {
            e.preventDefault();
            if (confirm('Delete this friend?')) {
                friends.splice(idx, 1);
                storage.saveFriends(friends);
                renderFriends();
            }
        };
    });
    return card;
}

// --- Modal Logic ---
function openEditModal(idx) {
    form.openModal(idx, friends, editingIndexRef, dom.friendModal, dom.friendForm, DROPDOWN_OPTIONS, (friend, formEl, opts) => {
        form.renderFriendWizard(friend, formEl, opts);
    });
}

dom.friendModal.onclick = (e) => { if (e.target === dom.friendModal) closeModal(); };
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
function closeModal() {
    dom.friendModal.classList.add('hidden');
    setTimeout(() => { dom.friendModal.style.display = 'none'; }, 200);
    form.resetForm(dom.friendForm);
}

// --- Filter Bar Rendering ---
function renderTagFilters() {
    let filterBar = document.getElementById('filterBar');
    if (!filterBar) {
        filterBar = document.createElement('div');
        filterBar.id = 'filterBar';
        filterBar.className = 'filter-bar';
    }
    filterBar.innerHTML = `
        <button class="filter-btn${!activeTagFilter ? ' active' : ''}" data-type="all">All</button>
        <button class="filter-btn${activeTagFilter==='birthdays' ? ' active' : ''}" data-type="birthdays">🎂 Birthdays Soon</button>
        <button class="filter-btn${activeTagFilter==='vegan' ? ' active' : ''}" data-type="vegan">🌱 Vegan Friends</button>
        <button class="filter-btn add-filter-btn" title="Add custom filter" id="addCustomFilterBtn">+</button>
    `;
    // Custom filter buttons
    customFilters.forEach((filter, i) => {
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
    // Insert filterBar into the container
    const filterBarContainer = dom.ensureFilterBarContainer();
    filterBarContainer.innerHTML = '';
    filterBarContainer.appendChild(filterBar);
    // Filter button handlers
    filterBar.querySelectorAll('.filter-btn[data-type]').forEach(btn => {
        btn.onclick = () => {
            const type = btn.getAttribute('data-type');
            activeTagFilter = type === 'all' ? null : type;
            renderFriends();
            renderTagFilters();
        };
    });
    // Add custom filter modal
    filterBar.querySelector('#addCustomFilterBtn').onclick = openAddFilterModal;
}

function openAddFilterModal() {
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
    addRow();
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
        customFilters.push({ name, conditions: rows });
        storage.saveCustomFilters(customFilters);
        modal.remove();
        renderTagFilters();
    };
}

// --- Export/Import ---
dom.exportBtn.onclick = () => {
    const dataStr = JSON.stringify(friends, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'friends_directory.json';
    a.click();
    URL.revokeObjectURL(url);
};
dom.importBtn.onclick = () => dom.importFile.click();
dom.importFile.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (Array.isArray(imported)) {
                friends = imported;
                storage.saveFriends(friends);
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

// --- Floating Add Button ---
dom.createFloatingAddBtn(() => dom.addFriendBtn.onclick());

// --- App Initialization ---
(async function init() {
    await loadDropdownOptions();
    loadAllData();
    renderFriends();
    renderTagFilters();
    dom.friendModal.classList.add('hidden');
    dom.friendModal.style.display = 'none';
})();

dom.addFriendBtn.onclick = () => {
    form.openModal(null, friends, editingIndexRef, dom.friendModal, dom.friendForm, DROPDOWN_OPTIONS, (friend, formEl, opts) => {
        form.renderFriendWizard(friend, formEl, opts);
        // Attach submit handler for the wizard
        formEl.onsubmit = function(e) {
            e.preventDefault();
            // Save wizard data
            form.saveWizardFriend(
                friends,
                editingIndexRef,
                DROPDOWN_OPTIONS,
                (f) => storage.saveFriends(f),
                renderFriends,
                closeModal
            );
            storage.saveDropdownOptions(DROPDOWN_OPTIONS);
        };
    });
};
