// Update addiction time display
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs || tabs.length === 0) return;
  const tabId = tabs[0].id;
  
  // Get addiction time from current tab
  chrome.tabs.sendMessage(tabId, { type: 'GET_ADDICTION_TIME' }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('addictionTime').textContent = '未加载';
      return;
    }
    if (response && response.time) {
      const minutes = Math.floor(response.time / 60);
      const seconds = response.time % 60;
      document.getElementById('addictionTime').textContent = 
        minutes + '分' + seconds + '秒';
    }
  });

  // Get block count from current tab
  chrome.tabs.sendMessage(tabId, { type: 'GET_BLOCK_COUNT' }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('blockCount').textContent = '未加载';
      return;
    }
    if (response && response.count !== undefined) {
      document.getElementById('blockCount').textContent = response.count;
    }
  });
});
