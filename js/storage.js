// Handles all localStorage logic and persistence

const STORAGE_KEY = 'friendsDirectory';
const CUSTOM_FILTERS_KEY = 'friendsDirectoryCustomFilters';

export function saveFriends(friends) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

export function loadFriends() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function saveDropdownOptions(options) {
    localStorage.setItem('dropdown_options', JSON.stringify(options));
}

export function loadDropdownOptions() {
    const local = localStorage.getItem('dropdown_options');
    return local ? JSON.parse(local) : null;
}

export function saveCustomFilters(filters) {
    localStorage.setItem(CUSTOM_FILTERS_KEY, JSON.stringify(filters || []));
}

export function loadCustomFilters() {
    const data = localStorage.getItem(CUSTOM_FILTERS_KEY);
    return data ? JSON.parse(data) : [];
}
