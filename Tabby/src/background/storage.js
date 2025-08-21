/**
 * @module storage
 * Manage storage state and migration logic for Tabby extension.
 */

export let storageData = {
  folders: {},
  groups: {}
};

/**
 * Save current storageData to Chrome local storage.
 */
export function saveStorage() {
  chrome.storage.local.set(storageData);
}

/**
 * Load storage, migrate if needed, then callback with data.
 * @param {function(Object)} callback - Callback with storageData.
 */
export function loadStorage(callback) {
  chrome.storage.local.get(null, (data) => {
    if (migrateOldData(data)) {
      // Wait briefly for storage to update, then reload.
      setTimeout(() => chrome.storage.local.get(null, (newData) => {
        storageData = newData;
        callback(storageData);
      }), 100);
    } else {
      storageData = {
        groups: data.groups || {},
        folders: data.folders || {}
      };
      callback(storageData);
    }
  });
}

/**
 * Migrate old storage format to new with folders/groups and tab objects.
 * @param {Object} oldData 
 * @returns {boolean} True if migration occurred.
 */
function migrateOldData(oldData) {
  let changed = false;

  // Old format: no folders/groups keys, tabs stored as string URLs.
  if (!('folders' in oldData) && !('groups' in oldData)) {
    const groups = {};
    for (const key in oldData) {
      if (Array.isArray(oldData[key])) {
        // Convert string URLs to {title,url} objects with title = url.
        groups[key] = oldData[key].map(url => ({ title: url, url }));
      }
    }
    storageData.groups = groups;
    storageData.folders = {};
    changed = true;
    chrome.storage.local.set(storageData);
  } else {
    storageData.folders = oldData.folders || {};
    storageData.groups = oldData.groups || {};
    for (const groupName in storageData.groups) {
      const tabs = storageData.groups[groupName];
      if (tabs.length > 0 && typeof tabs[0] === 'string') {
        storageData.groups[groupName] = tabs.map(url => ({ title: url, url }));
        changed = true;
      }
    }
    if (changed) chrome.storage.local.set(storageData);
  }
  return changed;
}
