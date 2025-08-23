/**
 * @module popup
 * Handles popup UI and saving current tabs as group.
 */

import { loadStorage } from '../background/storage.js';

document.addEventListener('DOMContentLoaded', () => {
  
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const msg = chrome.i18n.getMessage(elem.dataset.i18n);
    if (msg) elem.textContent = msg;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
    const msg = chrome.i18n.getMessage(elem.dataset.i18nPlaceholder);
    if (msg) elem.placeholder = msg;
  });
  const groupNameInput = document.getElementById('group-name');
  const saveBtn = document.getElementById('save-group');
  const folderList = document.getElementById('folder-list');
  const groupList = document.getElementById('group-list');

  let storageData = { groups: {}, folders: {} };

  function renderFolders() {
    folderList.innerHTML = '';
    Object.keys(storageData.folders).sort().forEach(folderName => {
      const li = document.createElement('li');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'item-name';
      nameSpan.textContent = folderName;
      li.appendChild(nameSpan);

      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'buttons';

      const openBtn = document.createElement('button');
      openBtn.className = 'open-btn';
      openBtn.textContent = chrome.i18n.getMessage('openButtonText');
      openBtn.title = chrome.i18n.getMessage('openAllTabsTitle', [folderName]);
      openBtn.addEventListener('click', e => {
        e.stopPropagation();
        const groupsInFolder = storageData.folders[folderName] || [];
        groupsInFolder.forEach(gName => {
          const tabs = storageData.groups[gName];
          if (tabs && tabs.length) {
            tabs.forEach(tabObj => chrome.tabs.create({ url: tabObj.url }));
          }
        });
      });

      buttonsDiv.appendChild(openBtn);
      li.appendChild(buttonsDiv);
      folderList.appendChild(li);
    });
  }

  function renderGroups() {
    groupList.innerHTML = '';
    Object.keys(storageData.groups).sort().forEach(groupName => {
      const li = document.createElement('li');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'item-name';
      nameSpan.textContent = groupName;
      li.appendChild(nameSpan);

      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'buttons';

      const openBtn = document.createElement('button');
      openBtn.className = 'open-btn';
      openBtn.textContent = chrome.i18n.getMessage('openButtonText');
      openBtn.title = chrome.i18n.getMessage('openAllTabsTitle', [groupName]);
      openBtn.addEventListener('click', e => {
        e.stopPropagation();
        const tabs = storageData.groups[groupName];
        if (tabs && tabs.length) {
          tabs.forEach(tabObj => chrome.tabs.create({ url: tabObj.url }));
        }
      });

      buttonsDiv.appendChild(openBtn);
      li.appendChild(buttonsDiv);
      groupList.appendChild(li);
    });
  }

  function loadAndRender() {
    chrome.storage.local.get(null, data => {
      storageData.groups = data.groups || {};
      storageData.folders = data.folders || {};
      renderFolders();
      renderGroups();
    });
  }

  saveBtn.addEventListener('click', () => {
    const name = groupNameInput.value.trim();
    if (!name) return;
    chrome.tabs.query({ currentWindow: true }, tabs => {
      const tabObjs = tabs.map(tab => ({
        title: tab.title || tab.url,
        url: tab.url
      }));
      chrome.storage.local.get(null, (data) => {
        const allGroups = data.groups || {};
        allGroups[name] = tabObjs;
        chrome.storage.local.set({ groups: allGroups }, loadAndRender);
        groupNameInput.value = '';
      });
    });
  });

  loadAndRender();
});
