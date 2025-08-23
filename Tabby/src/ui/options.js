/**
 * @module options
 * Handles the options page UI and event logic.
 */

import { loadStorage, saveStorage } from '/src/background/storage.js';
import { createGroup, createFolder } from '/src/background/tabManager.js';
import { renderOpenTabs, renderGroups, renderFolders } from '/src/ui/ui-render.js';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const msg = chrome.i18n.getMessage(elem.dataset.i18n);
    if (msg) elem.textContent = msg;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
    const msg = chrome.i18n.getMessage(elem.dataset.i18nPlaceholder);
    if (msg) elem.placeholder = msg;
  });
  
  const tabList = document.getElementById('tab-list');
  const groupList = document.getElementById('group-list');
  const folderList = document.getElementById('folder-list');

  const newGroupInput = document.getElementById('new-group-name');
  const createGroupBtn = document.getElementById('create-group');

  const newFolderInput = document.getElementById('new-folder-name');
  const createFolderBtn = document.getElementById('create-folder');

  let storageReady = false;

  function refreshAll() {
    if (!storageReady) return;
    renderOpenTabs(tabList);
    renderGroups(groupList);
    renderFolders(folderList);
  }

  loadStorage(() => {
    storageReady = true;
    refreshAll();
  });

  createGroupBtn.addEventListener('click', () => {
    createGroup(newGroupInput.value.trim());
    newGroupInput.value = '';
    refreshAll();
  });

  createFolderBtn.addEventListener('click', () => {
    createFolder(newFolderInput.value.trim());
    newFolderInput.value = '';
    refreshAll();
  });
});