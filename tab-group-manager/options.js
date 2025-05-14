document.addEventListener('DOMContentLoaded', () => {
  const tabList = document.getElementById('tab-list');
  const groupContainer = document.getElementById('group-container');
  const createGroupBtn = document.getElementById('create-group');
  const newGroupNameInput = document.getElementById('new-group-name');

  // Load current tabs
  chrome.tabs.query({ currentWindow: true }, tabs => {
      tabs.forEach(tab => {
          const li = document.createElement('li');
          li.textContent = `${tab.title} – ${new URL(tab.url).hostname}`;
          li.draggable = true;
          li.dataset.url = tab.url;
          li.addEventListener('dragstart', e => {
              e.dataTransfer.setData('text/plain', tab.url);
          });
          tabList.appendChild(li);
      });
  });

  // Load existing groups
  function renderGroups() {
    chrome.storage.local.get(null, groups => {
        groupContainer.innerHTML = '';
        for (const name in groups) {
            const groupEl = document.createElement('ul');
            groupEl.className = 'group dropzone';
            groupEl.dataset.name = name;

            // Create group title
            const titleContainer = document.createElement('div');
            const title = document.createElement('h3');
            title.textContent = name;
            titleContainer.appendChild(title);

            // Create the delete button for the group
            const deleteGroupBtn = document.createElement('button');
            deleteGroupBtn.textContent = 'Delete Group';
            deleteGroupBtn.className = 'delete-group-btn';
            deleteGroupBtn.addEventListener('click', () => {
                // Remove the group from local storage
                chrome.storage.local.remove(name, renderGroups);
            });
            titleContainer.appendChild(deleteGroupBtn);
            groupEl.appendChild(titleContainer);

            // Add tabs to the group
            groups[name].forEach(url => {
                const li = document.createElement('li');
                li.textContent = url;

                // Create a delete button for each tab
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.addEventListener('click', () => {
                    // Remove the tab from the group
                    const index = groups[name].indexOf(url);
                    if (index !== -1) {
                        groups[name].splice(index, 1);
                        chrome.storage.local.set({ [name]: groups[name] }, renderGroups);
                    }
                });

                li.appendChild(deleteBtn);
                groupEl.appendChild(li);
            });

            groupEl.addEventListener('dragover', e => e.preventDefault());

            groupEl.addEventListener('drop', e => {
                e.preventDefault();
                const url = e.dataTransfer.getData('text/plain');
                if (!groups[name].includes(url)) {
                    groups[name].push(url);
                    chrome.storage.local.set({ [name]: groups[name] }, renderGroups);
                }
            });

            groupContainer.appendChild(groupEl);
        }
    });
}


  createGroupBtn.addEventListener('click', () => {
      const name = newGroupNameInput.value.trim();
      if (!name) return;
      chrome.storage.local.set({ [name]: [] }, () => {
          newGroupNameInput.value = '';
          renderGroups();
      });
  });

  renderGroups();
});
