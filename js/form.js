// form.js
// Handles form logic, validation, and wizard state

export let wizardStep = 0;
export let wizardData = {};

export function resetForm(form) {
    form.reset();
    wizardStep = 0;
    wizardData = {};
}

export function openModal(editIdx, friends, editingIndexRef, modal, form, DROPDOWN_OPTIONS, renderWizard) {
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    let friend = {};
    if (editIdx !== null) {
        editingIndexRef.value = editIdx;
        friend = friends[editIdx];
    } else {
        editingIndexRef.value = null;
    }
    renderWizard(friend, form, DROPDOWN_OPTIONS);
}

export function renderFriendWizard(friend = {}, form, DROPDOWN_OPTIONS) {
    wizardStep = 0;
    wizardData = { ...friend };
    updateWizardStep(form, DROPDOWN_OPTIONS);
}

export function updateWizardStep(form, DROPDOWN_OPTIONS) {
    const steps = [
        {
            title: 'Personal Info',
            fields: [
                { name: 'fullName', label: 'Full Name', type: 'text', required: true },
                { name: 'nickname', label: 'Nickname', type: 'text' },
                { name: 'birthday', label: 'Birthday', type: 'date' },
                { name: 'relationship', label: 'Relationship', type: 'combo' }
            ]
        },
        {
            title: 'Preferences',
            fields: [
                { name: 'foodPreferences', label: 'Food Preferences', type: 'combo' },
                { name: 'dietaryRestrictions', label: 'Dietary Restrictions', type: 'combo' },
                { name: 'allergies', label: 'Allergies', type: 'text' },
                { name: 'favorites', label: 'Favorite Meals/Drinks/Desserts', type: 'text' }
            ]
        },
        {
            title: 'Gifts & Notes',
            fields: [
                { name: 'giftHistory', label: 'Gift History', type: 'combo' },
                { name: 'giftIdeas', label: 'Gift Ideas', type: 'text' },
                { name: 'tags', label: 'Tags/Notes', type: 'text' },
                { name: 'notes', label: 'Notes', type: 'textarea' }
            ]
        }
    ];
    const step = steps[wizardStep];
    let progressDots = `<div class="friend-wizard-steps">`;
    for (let i = 0; i < steps.length; i++) {
        progressDots += `<span class="friend-wizard-dot${i === wizardStep ? ' active' : ''}"></span>`;
    }
    progressDots += `</div>`;
    let progressBar = `<div class="friend-wizard-progress"><div class="friend-wizard-progress-bar" style="width:${((wizardStep+1)/steps.length)*100}%"></div></div>`;
    let fieldsHtml = step.fields.map(f => {
        let requiredStar = f.required ? '<span style="color:#e74c3c;font-weight:bold;margin-left:0.25em;vertical-align:middle;">*</span>' : '';
        if (f.type === 'combo') {
            return `<label style="display:flex;align-items:left;gap:0.3em;"><span>${f.label}${requiredStar}</span>
                <input class="combobox-input" name="${f.name}" list="${f.name}List" value="${wizardData[f.name]||''}" ${f.required?'required':''} />
                <datalist id="${f.name}List">
                    ${(DROPDOWN_OPTIONS[f.name]||[]).map(opt => `<option value="${opt}"></option>`).join('')}
                </datalist>
            </label>`;
        } else if (f.type === 'textarea') {
            return `<label style="display:flex;align-items:left;gap:0.3em;"><span>${f.label}${requiredStar}</span>
                <textarea name="${f.name}">${wizardData[f.name]||''}</textarea>
            </label>`;
        } else {
            return `<label style="display:flex;align-items:left;gap:0.3em;"><span>${f.label}${requiredStar}</span>
                <input type="${f.type}" name="${f.name}" value="${wizardData[f.name]||''}" ${f.required?'required':''} />
            </label>`;
        }
    }).join('');
    form.innerHTML = `
        <h2 style="margin-bottom:0.5em;">${step.title}</h2>
        ${progressDots}
        ${progressBar}
        <div id="wizardStepFields" class="friend-wizard-section">${fieldsHtml}</div>
        <div class="modal-actions">
            ${wizardStep > 0 ? '<button type="button" id="wizardPrevBtn">Back</button>' : ''}
            ${wizardStep < steps.length-1 ? '<button type="button" id="wizardNextBtn">Next</button>' : '<button type="submit" id="wizardSaveBtn">Save</button>'}
            <button type="button" id="cancelBtn">Cancel</button>
        </div>
    `;
    form.querySelector('#cancelBtn').onclick = () => {
        form.reset();
        document.getElementById('friendModal').classList.add('hidden');
        setTimeout(() => { document.getElementById('friendModal').style.display = 'none'; }, 200);
    };
    if (wizardStep > 0) form.querySelector('#wizardPrevBtn').onclick = () => { wizardStep--; updateWizardStep(form, DROPDOWN_OPTIONS); };
    if (wizardStep < steps.length-1) form.querySelector('#wizardNextBtn').onclick = () => {
        if (saveWizardStepFields(form)) { wizardStep++; updateWizardStep(form, DROPDOWN_OPTIONS); }
    };
    else if (form.querySelector('#wizardSaveBtn')) form.querySelector('#wizardSaveBtn').onclick = (e) => { e.preventDefault(); if (saveWizardStepFields(form)) form.dispatchEvent(new Event('submit', {cancelable:true})); };
}

export function saveWizardStepFields(form) {
    // Validate and collect the current step's fields into wizardData
    const fields = form.querySelectorAll('#wizardStepFields [name]');
    let valid = true;
    fields.forEach(field => {
        // If the field is required and empty, mark as invalid
        if (field.hasAttribute('required') && !field.value.trim()) {
            field.classList.add('input-error');
            valid = false;
        } else {
            field.classList.remove('input-error');
        }
        // Save the value in wizardData
        wizardData[field.name] = field.value.trim();
    });
    return valid;
}

export function saveWizardFriend(
    friends,
    editingIndexRef,
    DROPDOWN_OPTIONS,
    saveFriends,
    renderFriends,
    closeModal
) {
    // Save or update a friend entry using the collected wizardData
    const friend = { ...wizardData };
    // Normalize tags (split by comma, trim, remove empty)
    if (friend.tags) {
        friend.tags = friend.tags.split(',').map(t => t.trim()).filter(Boolean);
    } else {
        friend.tags = [];
    }
    // Add new dropdown options if user entered new values
    Object.keys(DROPDOWN_OPTIONS).forEach(key => {
        if (friend[key] && !DROPDOWN_OPTIONS[key].includes(friend[key])) {
            DROPDOWN_OPTIONS[key].push(friend[key]);
        }
    });
    // If editing, update the friend; else, add new
    if (editingIndexRef.value !== null && editingIndexRef.value !== undefined) {
        friends[editingIndexRef.value] = friend;
    } else {
        friends.push(friend);
    }
    saveFriends(friends, DROPDOWN_OPTIONS);
    renderFriends(friends);
    closeModal();
}
