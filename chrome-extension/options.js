// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get({
    firstBlockWaitTime: 10,
    firstBlockDuration: 5,
    followupBlockWaitTime: 10,
    followupBlockDuration: 5
  }, (items) => {
    document.getElementById('firstBlockWaitTime').value = items.firstBlockWaitTime;
    document.getElementById('firstBlockDuration').value = items.firstBlockDuration;
    document.getElementById('followupBlockWaitTime').value = items.followupBlockWaitTime;
    document.getElementById('followupBlockDuration').value = items.followupBlockDuration;
  });
}

// Save settings to storage
document.getElementById('saveBtn').addEventListener('click', () => {
  const settings = {
    firstBlockWaitTime: parseInt(document.getElementById('firstBlockWaitTime').value),
    firstBlockDuration: parseInt(document.getElementById('firstBlockDuration').value),
    followupBlockWaitTime: parseInt(document.getElementById('followupBlockWaitTime').value),
    followupBlockDuration: parseInt(document.getElementById('followupBlockDuration').value)
  };

  chrome.storage.sync.set(settings, () => {
    const status = document.getElementById('status');
    status.textContent = '✓ 设置已保存';
    status.classList.add('success');
    setTimeout(() => {
      status.classList.remove('success');
    }, 3000);
  });
});

// Load settings when page loads
document.addEventListener('DOMContentLoaded', loadSettings);
