/**
 * @module tabManager
 * Core logic to create, modify, and delete groups and folders.
 */

import { storageData, saveStorage } from './storage.js';

/**
 * Create a new tab group.
 * @param {string} name - Group name
 */
export function createGroup(name) {
  if (!name) {
    alert('Please enter a group name');
    return;
  }
  if (storageData.groups[name]) {
    alert('Group already exists');
    return;
  }
  storageData.groups[name] = [];
  saveStorage();
}

/**
 * Create a new folder.
 * @param {string} name - Folder name
 */
export function createFolder(name) {
  if (!name) {
    alert('Please enter a folder name');
    return;
  }
  if (storageData.folders[name]) {
    alert('Folder already exists');
    return;
  }
  storageData.folders[name] = [];
  saveStorage();
}

/**
 * Delete a group and remove it from all folders.
 * @param {string} groupName 
 */
export function deleteGroup(groupName) {
  if (!confirm(`Delete group "${groupName}" and all its tabs? This cannot be undone.`)) return;
  delete storageData.groups[groupName];
  Object.keys(storageData.folders).forEach(folder => {
    storageData.folders[folder] = storageData.folders[folder].filter(g => g !== groupName);
  });
  saveStorage();
}

/**
 * Delete a folder without deleting contained groups.
 * @param {string} folderName 
 */
export function deleteFolder(folderName) {
  if (!confirm(`Delete folder "${folderName}"? Groups inside will become unassigned.`)) return;
  delete storageData.folders[folderName];
  saveStorage();
}

/**
 * Move a group into a specific folder, removing it from others.
 * @param {string} groupName 
 * @param {string} folderName 
 */
export function moveGroupToFolder(groupName, folderName) {
  Object.keys(storageData.folders).forEach(folder => {
    storageData.folders[folder] = storageData.folders[folder].filter(g => g !== groupName);
  });
  if (!storageData.folders[folderName]) storageData.folders[folderName] = [];
  if (!storageData.folders[folderName].includes(groupName)) {
    storageData.folders[folderName].push(groupName);
  }
  saveStorage();
}

/**
 * Remove a group from a folder but keep it in storage.
 * @param {string} groupName 
 * @param {string} folderName 
 */
export function removeGroupFromFolder(groupName, folderName) {
  if (!storageData.folders[folderName]) return;
  storageData.folders[folderName] = storageData.folders[folderName].filter(g => g !== groupName);
  saveStorage();
}
