document.addEventListener('DOMContentLoaded', () => {

  const tabList = document.getElementById('tab-list');

  const groupList = document.getElementById('group-list');
  const newGroupInput = document.getElementById('new-group-name');
  const createGroupBtn = document.getElementById('create-group');

  const folderList = document.getElementById('folder-list');
  const newFolderInput = document.getElementById('new-folder-name');
  const createFolderBtn = document.getElementById('create-folder');

  // State storage: folders and groups
  let storageData = {
    folders: {},  // folderName -> array of groupNames
    groups: {}    // groupName -> array of tab objects {title, url}
  };

  // Track expanded groups in Groups panel separately from groups inside folders
  const expandedGroups = new Set();
  const expandedFolderGroups = new Map(); // Map folderName => Set of expanded groupNames
  const expandedFolders = new Set();

  // --- Utilities ---

  function getExpandedFolderGroups(folderName) {
    if (!expandedFolderGroups.has(folderName)) {
      expandedFolderGroups.set(folderName, new Set());
    }
    return expandedFolderGroups.get(folderName);
  }

  // Save storage data
  function saveStorage() {
    chrome.storage.local.set(storageData);
  }

  // Load and migrate old format if necessary
  function migrateOldData(oldData) {
    let changed = false;

    if (!('folders' in oldData) && !('groups' in oldData)) {
      // Old format: flat groups only, tabs as string URLs
      const groups = {};
      for (const key in oldData) {
        if (Array.isArray(oldData[key])) {
          // Migrate tabs to objects with title=url for existing data
          groups[key] = oldData[key].map(url => ({ title: url, url }));
        }
      }
      storageData.groups = groups;
      storageData.folders = {};
      changed = true;
      chrome.storage.local.set(storageData);
    } else {
      // Migrate any groups with tabs as strings to tabs as objects
      storageData.folders = oldData.folders || {};
      storageData.groups = oldData.groups || {};
      for (const groupName in storageData.groups) {
        const tabs = storageData.groups[groupName];
        if (tabs.length > 0 && typeof tabs[0] === 'string') {
          storageData.groups[groupName] = tabs.map(url => ({ title: url, url }));
          changed = true;
        }
      }
      if (changed) {
        chrome.storage.local.set(storageData);
      }
    }
    return changed;
  }

  // --- Render functions ---

  // Render open tabs panel
  function renderOpenTabs() {
    tabList.innerHTML = '';
    chrome.tabs.query({ currentWindow: true }, tabs => {
      tabs.forEach(tab => {
        const li = document.createElement('li');
        li.textContent = tab.title || tab.url;
        li.setAttribute('draggable', 'true');

        const tabObj = { title: tab.title || tab.url, url: tab.url };
        li.dataset.tab = JSON.stringify(tabObj);

        li.addEventListener('dragstart', e => {
          e.dataTransfer.setData('application/json', li.dataset.tab);
        });
        tabList.appendChild(li);
      });
    });
  }

  // Render all groups in Groups panel (all, no folder filtering)
  function renderGroups() {
    groupList.innerHTML = '';

    Object.keys(storageData.groups).sort().forEach(groupName => {
      const li = createGroupListItemForGroupsPanel(groupName, storageData.groups[groupName]);
      groupList.appendChild(li);
    });
  }

  // Group item for Groups panel
  function createGroupListItemForGroupsPanel(groupName, tabs) {
    const li = document.createElement('li');

    // Header row
    const headerRow = document.createElement('div');
    headerRow.classList.add('header-row');

    // Caret for expand/collapse
    const caret = document.createElement('span');
    caret.textContent = '▶';
    caret.className = 'caret';
    if (expandedGroups.has(groupName)) {
      caret.textContent = '▼';
      li.classList.add('expanded');
    }
    caret.style.userSelect = 'none';
    caret.addEventListener('click', e => {
      e.stopPropagation();
      if (expandedGroups.has(groupName)) {
        expandedGroups.delete(groupName);
      } else {
        expandedGroups.add(groupName);
      }
      renderGroups();
    });
    headerRow.appendChild(caret);

    // Group name label
    const nameSpan = document.createElement('span');
    nameSpan.textContent = groupName;
    nameSpan.classList.add('name');
    nameSpan.addEventListener('click', e => {
      e.stopPropagation();
      if (expandedGroups.has(groupName)) {
        expandedGroups.delete(groupName);
      } else {
        expandedGroups.add(groupName);
      }
      renderGroups();
    });
    headerRow.appendChild(nameSpan);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add('buttons');

    // Open button
    const openBtn = document.createElement('button');
    openBtn.className = 'open-btn';
    openBtn.textContent = 'Open';
    openBtn.title = `Open all tabs in group "${groupName}"`;
    openBtn.addEventListener('click', e => {
      e.stopPropagation();
      tabs.forEach(tab => chrome.tabs.create({ url: tab.url }));
    });
    buttonsDiv.appendChild(openBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-group-btn delete-btn';
    deleteBtn.title = `Delete group "${groupName}"`;
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteGroup(groupName);
    });
    buttonsDiv.appendChild(deleteBtn);

    headerRow.appendChild(buttonsDiv);

    // Make group draggable (to folders)
    headerRow.setAttribute('draggable', 'true');
    headerRow.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', groupName);
      e.dataTransfer.effectAllowed = 'move';
    });

    li.appendChild(headerRow);

    // Dropdown list of tabs (if expanded)
    if (expandedGroups.has(groupName)) {
      const tabUL = document.createElement('ul');
      tabUL.className = 'nested';

      tabs.forEach((tab, index) => {
        const tabLI = document.createElement('li');

        // Flex container for tab title and buttons
        const tabRow = document.createElement('div');
        tabRow.classList.add('header-row');

        // Title span
        const titleSpan = document.createElement('span');
        titleSpan.textContent = tab.title || tab.url || 'Untitled';
        titleSpan.classList.add('name');
        tabRow.appendChild(titleSpan);

        // Buttons container
        const buttonsDivTab = document.createElement('div');
        buttonsDivTab.classList.add('buttons');

        // Open tab button
        const openTabBtn = document.createElement('button');
        openTabBtn.textContent = 'Open';
        openTabBtn.classList.add('open-btn');
        openTabBtn.title = 'Open tab';
        openTabBtn.addEventListener('click', e => {
          e.stopPropagation();
          chrome.tabs.create({ url: tab.url });
        });
        buttonsDivTab.appendChild(openTabBtn);

        // Delete tab button
        const deleteTabBtn = document.createElement('button');
        deleteTabBtn.textContent = 'Delete';
        deleteTabBtn.classList.add('delete-btn');
        deleteTabBtn.title = 'Remove tab from group';
        deleteTabBtn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = storageData.groups[groupName].findIndex(t => t.url === tab.url);
          if (idx !== -1) {
            storageData.groups[groupName].splice(idx, 1);
            saveStorage();
            renderGroups();
          }
        });
        buttonsDivTab.appendChild(deleteTabBtn);

        tabRow.appendChild(buttonsDivTab);
        tabLI.appendChild(tabRow);

        tabUL.appendChild(tabLI);
      });

      li.appendChild(tabUL);
    }

    // Accept drag of tabs into group to add tab objects
    li.addEventListener('dragover', e => e.preventDefault());
    li.addEventListener('drop', e => {
      e.preventDefault();
      let tabObj;
      try {
        tabObj = JSON.parse(e.dataTransfer.getData('application/json'));
      } catch {
        return;
      }
      if (tabObj && tabObj.url && !tabs.some(t => t.url === tabObj.url)) {
        storageData.groups[groupName].push(tabObj);
        saveStorage();
        renderGroups();
      }
    });

    return li;
  }

  // Render folders panel
  function renderFolders() {
    folderList.innerHTML = '';

    Object.keys(storageData.folders).sort().forEach(folderName => {
      const li = createFolderListItem(folderName, storageData.folders[folderName]);
      folderList.appendChild(li);
    });
  }

  // Create folder list item: expandable folder with groups inside
  function createFolderListItem(folderName, groupNames) {
    const li = document.createElement('li');

    // Header row
    const headerRow = document.createElement('div');
    headerRow.classList.add('header-row');

    // Caret for expand/collapse of folder
    const caret = document.createElement('span');
    caret.textContent = '▶';
    caret.className = 'caret';
    if (expandedFolders.has(folderName)) {
      caret.textContent = '▼';
      li.classList.add('expanded');
    }
    caret.style.userSelect = 'none';
    caret.addEventListener('click', e => {
      e.stopPropagation();
      if (expandedFolders.has(folderName)) {
        expandedFolders.delete(folderName);
      } else {
        expandedFolders.add(folderName);
      }
      renderFolders();
    });
    headerRow.appendChild(caret);

    // Folder name label
    const nameSpan = document.createElement('span');
    nameSpan.textContent = folderName;
    nameSpan.classList.add('name');
    nameSpan.addEventListener('click', e => {
      e.stopPropagation();
      if (expandedFolders.has(folderName)) {
        expandedFolders.delete(folderName);
      } else {
        expandedFolders.add(folderName);
      }
      renderFolders();
    });
    headerRow.appendChild(nameSpan);

    // Buttons container for folder
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add('buttons');

    // Open button: opens all tabs in all groups in folder
    const openBtn = document.createElement('button');
    openBtn.className = 'open-btn';
    openBtn.textContent = 'Open';
    openBtn.title = `Open all tabs in folder "${folderName}"`;
    openBtn.addEventListener('click', e => {
      e.stopPropagation();
      groupNames.forEach(gName => {
        const tabs = storageData.groups[gName];
        if (tabs) tabs.forEach(tab => chrome.tabs.create({ url: tab.url }));
      });
    });
    buttonsDiv.appendChild(openBtn);

    // Delete button (deletes folder, not groups)
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-group-btn delete-btn';
    deleteBtn.title = `Delete folder "${folderName}"`;
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteFolder(folderName);
    });
    buttonsDiv.appendChild(deleteBtn);

    headerRow.appendChild(buttonsDiv);
    li.appendChild(headerRow);

    // Dropdown listing groups in folder with their own dropdowns
    if (expandedFolders.has(folderName)) {
      const groupsUL = document.createElement('ul');
      groupsUL.className = 'nested';

      groupNames.slice().sort().forEach(groupName => {
        const tabs = storageData.groups[groupName];
        if (!tabs) return;

        const groupLI = createGroupListItemForFolderPanel(folderName, groupName, tabs);
        groupsUL.appendChild(groupLI);
      });

      li.appendChild(groupsUL);
    }

    // Drag and drop: folder accepts dragged groups
    li.addEventListener('dragover', e => {
      e.preventDefault();
      li.style.backgroundColor = '#d0e7ff';
    });
    li.addEventListener('dragleave', e => {
      li.style.backgroundColor = '';
    });
    li.addEventListener('drop', e => {
      e.preventDefault();
      li.style.backgroundColor = '';
      const groupName = e.dataTransfer.getData('text/plain');
      if (groupName && storageData.groups[groupName]) {
        moveGroupToFolder(groupName, folderName);
      }
    });

    return li;
  }

  // Group item rendering inside a folder panel with independent dropdown expand state and Remove button
  function createGroupListItemForFolderPanel(folderName, groupName, tabs) {
    const li = document.createElement('li');

    const expandedSet = getExpandedFolderGroups(folderName);
    const isExpanded = expandedSet.has(groupName);

    // Header row
    const headerRow = document.createElement('div');
    headerRow.classList.add('header-row');

    // Caret
    const caret = document.createElement('span');
    caret.textContent = '▶';
    caret.className = 'caret';
    if (isExpanded) {
      caret.textContent = '▼';
      li.classList.add('expanded');
    }
    caret.style.userSelect = 'none';
    caret.addEventListener('click', e => {
      e.stopPropagation();
      if (expandedSet.has(groupName)) {
        expandedSet.delete(groupName);
      } else {
        expandedSet.add(groupName);
      }
      renderFolders();
    });
    headerRow.appendChild(caret);

    // Group name label
    const nameSpan = document.createElement('span');
    nameSpan.textContent = groupName;
    nameSpan.classList.add('name');
    nameSpan.addEventListener('click', e => {
      e.stopPropagation();
      if (expandedSet.has(groupName)) {
        expandedSet.delete(groupName);
      } else {
        expandedSet.add(groupName);
      }
      renderFolders();
    });
    headerRow.appendChild(nameSpan);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add('buttons');

    // Open button
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open';
    openBtn.classList.add('open-btn');
    openBtn.title = `Open all tabs in group "${groupName}"`;
    openBtn.addEventListener('click', e => {
      e.stopPropagation();
      tabs.forEach(tab => chrome.tabs.create({ url: tab.url }));
    });
    buttonsDiv.appendChild(openBtn);

    // Remove button: remove group from folder
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.title = `Remove group from folder "${folderName}"`;
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      removeGroupFromFolder(groupName, folderName);
    });
    buttonsDiv.appendChild(removeBtn);

    // Delete button (deletes group fully)
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-group-btn delete-btn';
    deleteBtn.title = `Delete group "${groupName}" completely`;
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteGroup(groupName);
    });
    buttonsDiv.appendChild(deleteBtn);

    headerRow.appendChild(buttonsDiv);
    li.appendChild(headerRow);

    // Dropdown tabs list if expanded
    if (isExpanded) {
      const tabUL = document.createElement('ul');
      tabUL.className = 'nested';
      tabs.forEach((tab, index) => {
        const tabLI = document.createElement('li');

        // Flex container for tab title and buttons
        const tabRow = document.createElement('div');
        tabRow.classList.add('header-row');

        // Title span
        const titleSpan = document.createElement('span');
        titleSpan.textContent = tab.title || tab.url || 'Untitled';
        titleSpan.classList.add('name');
        tabRow.appendChild(titleSpan);

        // Buttons container
        const buttonsDivTab = document.createElement('div');
        buttonsDivTab.classList.add('buttons');

        // Open tab button
        const openTabBtn = document.createElement('button');
        openTabBtn.textContent = 'Open';
        openTabBtn.classList.add('open-btn');
        openTabBtn.title = 'Open tab';
        openTabBtn.addEventListener('click', e => {
          e.stopPropagation();
          chrome.tabs.create({ url: tab.url });
        });
        buttonsDivTab.appendChild(openTabBtn);

        // Delete tab button
        const deleteTabBtn = document.createElement('button');
        deleteTabBtn.textContent = 'Delete';
        deleteTabBtn.classList.add('delete-btn');
        deleteTabBtn.title = 'Remove tab from group';
        deleteTabBtn.addEventListener('click', e => {
          e.stopPropagation();
          const groupTabs = storageData.groups[groupName];
          const idx = groupTabs.findIndex(t => t.url === tab.url);
          if (idx !== -1) {
            groupTabs.splice(idx, 1);
            saveStorage();
            renderFolders();
          }
        });
        buttonsDivTab.appendChild(deleteTabBtn);

        tabRow.appendChild(buttonsDivTab);
        tabLI.appendChild(tabRow);

        tabUL.appendChild(tabLI);
      });
      li.appendChild(tabUL);
    }

    return li;
  }

  // --- Actions ---

  function deleteGroup(groupName) {
    if (!confirm(`Delete group "${groupName}" and all its tabs? This action cannot be undone.`)) return;
    delete storageData.groups[groupName];
    Object.keys(storageData.folders).forEach(folder => {
      storageData.folders[folder] = storageData.folders[folder].filter(g => g !== groupName);
    });
    saveStorage();
    expandedGroups.delete(groupName);
    expandedFolderGroups.forEach(set => set.delete(groupName));
    renderGroups();
    renderFolders();
  }

  function deleteFolder(folderName) {
    if (!confirm(`Delete folder "${folderName}"? Groups inside will become unassigned.`)) return;
    delete storageData.folders[folderName];
    saveStorage();
    expandedFolders.delete(folderName);
    expandedFolderGroups.delete(folderName);
    renderFolders();
  }

  function removeGroupFromFolder(groupName, folderName) {
    if (!storageData.folders[folderName]) return;
    storageData.folders[folderName] = storageData.folders[folderName].filter(g => g !== groupName);
    saveStorage();
    const expandedSet = getExpandedFolderGroups(folderName);
    expandedSet.delete(groupName);
    renderFolders();
  }

  function createGroup(name) {
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
    renderGroups();
  }

  function createFolder(name) {
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
    renderFolders();
  }

  function moveGroupToFolder(groupName, folderName) {
    Object.keys(storageData.folders).forEach(folder => {
      storageData.folders[folder] = storageData.folders[folder].filter(g => g !== groupName);
    });
    if (!storageData.folders[folderName]) storageData.folders[folderName] = [];
    if (!storageData.folders[folderName].includes(groupName)) {
      storageData.folders[folderName].push(groupName);
    }
    saveStorage();
    renderFolders();
    renderGroups();
  }

  // --- Event listeners ---

  createGroupBtn.addEventListener('click', () => {
    createGroup(newGroupInput.value.trim());
    newGroupInput.value = '';
  });

  createFolderBtn.addEventListener('click', () => {
    createFolder(newFolderInput.value.trim());
    newFolderInput.value = '';
  });

  // --- Initialization ---

  chrome.storage.local.get(null, data => {
    if (migrateOldData(data)) {
      setTimeout(() => chrome.storage.local.get(null, newData => {
        storageData = newData;
        renderOpenTabs();
        renderGroups();
        renderFolders();
      }), 100);
    } else {
      storageData = {
        groups: data.groups || {},
        folders: data.folders || {}
      };
      renderOpenTabs();
      renderGroups();
      renderFolders();
    }
  });
});
