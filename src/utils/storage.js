// ============================================
// Local Storage Utility
// Persistent data layer for offline-first support
// ============================================

const STORAGE_KEYS = {
  CONTACTS: 'safeher_contacts',
  USER_PROFILE: 'safeher_user_profile',
  ALERT_HISTORY: 'safeher_alert_history',
  SETTINGS: 'safeher_settings',
};

// ── Generic Storage Operations ──
function getItem(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return null;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
    return false;
  }
}

function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Error removing ${key} from storage:`, err);
    return false;
  }
}

// ── Emergency Contacts ──
export function getContacts() {
  return getItem(STORAGE_KEYS.CONTACTS) || [];
}

export function saveContacts(contacts) {
  return setItem(STORAGE_KEYS.CONTACTS, contacts);
}

export function addContact(contact) {
  const contacts = getContacts();
  const newContact = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship || 'Other',
    createdAt: new Date().toISOString(),
  };
  contacts.push(newContact);
  saveContacts(contacts);
  return newContact;
}

export function updateContact(id, updates) {
  const contacts = getContacts();
  const index = contacts.findIndex(c => c.id === id);
  if (index !== -1) {
    contacts[index] = { ...contacts[index], ...updates };
    saveContacts(contacts);
    return contacts[index];
  }
  return null;
}

export function deleteContact(id) {
  const contacts = getContacts().filter(c => c.id !== id);
  saveContacts(contacts);
  return contacts;
}

// ── User Profile ──
export function getUserProfile() {
  return getItem(STORAGE_KEYS.USER_PROFILE) || {
    name: 'User',
    phone: '',
    emergencyMessage: 'EMERGENCY! I need help! Please check my location.',
  };
}

export function saveUserProfile(profile) {
  return setItem(STORAGE_KEYS.USER_PROFILE, profile);
}

// ── Alert History ──
export function getAlertHistory() {
  return getItem(STORAGE_KEYS.ALERT_HISTORY) || [];
}

export function addAlertRecord(record) {
  const history = getAlertHistory();
  const newRecord = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    latitude: record.latitude,
    longitude: record.longitude,
    contactsNotified: record.contactsNotified || 0,
    method: record.method || 'app', // 'app', 'shake', 'sms'
    status: record.status || 'sent',
  };
  history.unshift(newRecord);
  // Keep last 50 records
  if (history.length > 50) history.length = 50;
  setItem(STORAGE_KEYS.ALERT_HISTORY, history);
  return newRecord;
}

// ── Settings ──
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS) || {
    shakeDetection: true,
    shakeThreshold: 15,
    countdownSeconds: 3,
    autoCallEmergency: false,
    sirenEnabled: true,
    vibrationEnabled: true,
  };
}

export function saveSettings(settings) {
  return setItem(STORAGE_KEYS.SETTINGS, settings);
}
