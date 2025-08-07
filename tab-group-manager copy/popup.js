document.addEventListener('DOMContentLoaded', () => {
  const groupNameInput = document.getElementById('group-name');
  const saveBtn = document.getElementById('save-group');
  const groupList = document.getElementById('group-list');

  function renderGroups() {
    chrome.storage.local.get(null, (groups) => {
      groupList.innerHTML = '';
      for (const name in groups) {
        const li = document.createElement('li');
        li.textContent = name;

        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open';
        openBtn.onclick = () => {
          groups[name].forEach(url => chrome.tabs.create({ url }));
        };

        li.appendChild(openBtn);
        groupList.appendChild(li);
      }
    });
  }

  saveBtn.addEventListener('click', () => {
    const name = groupNameInput.value.trim();
    if (!name) return;

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const urls = tabs.map(tab => tab.url);
      chrome.storage.local.set({ [name]: urls }, renderGroups);
      groupNameInput.value = '';
    });
  });

  renderGroups();
});
