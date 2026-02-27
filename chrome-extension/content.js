(() => {
  'use strict';

  const TARGET_HOST_RE = /(^|\.)bilibili\.com$|(^|\.)zhihu\.com$|(^|\.)xiaohongshu\.com$/;

  let timer = null;
  let overlay = null;
  let badge = null;
  let addictionStartTime = Date.now();
  let blockCount = 0;
  let isFirstBlock = true;

  // Default settings
  let settings = {
    firstBlockWaitTime: 10,
    firstBlockDuration: 5,
    followupBlockWaitTime: 10,
    followupBlockDuration: 5
  };

  function isTargetHost() {
    return TARGET_HOST_RE.test(location.hostname);
  }

  function log(msg) {
    console.log('[Block Algorithm] ' + msg);
  }

  function loadSettings() {
    chrome.storage.sync.get(settings, (items) => {
      settings = items;
      log('Settings loaded: ' + JSON.stringify(settings));
    });
  }

  function ensureBody(callback) {
    if (document.body) {
      callback();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        callback();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function getAddictionTime() {
    return Math.floor((Date.now() - addictionStartTime) / 1000);
  }

  function showTimerBadge() {
    if (!document.body) return;

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'block-algo-timer';
      badge.style.cssText = [
        'position:fixed',
        'left:10px',
        'bottom:10px',
        'background:#111',
        'color:#0f0',
        'padding:6px 10px',
        'font-size:12px',
        'border-radius:6px',
        'z-index:2147483647',
        'opacity:0.85',
        'font-family:monospace'
      ].join(';');
      document.body.appendChild(badge);
    }

    const time = getAddictionTime();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    badge.textContent = '沉迷时间: ' + minutes + 'm ' + seconds + 's';
  }

  function hideOverlay() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
  }

  function showOverlay(blockDuration) {
    if (overlay) return;

    ensureBody(() => {
      if (overlay) return;

      blockCount++;
      
      // Create a truly modal overlay
      overlay = document.createElement('div');
      overlay.id = 'algorithm-block-overlay';
      overlay.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'width:100%',
        'height:100%',
        'background:rgba(0,0,0,0.95)',
        'color:white',
        'display:flex',
        'flex-direction:column',
        'justify-content:center',
        'align-items:center',
        'font-size:28px',
        'z-index:2147483647',
        'pointer-events:all',
        'user-select:none'
      ].join(';');

      const title = document.createElement('div');
      title.textContent = '⚠️ 您可能沉迷于推荐算法';
      title.style.marginBottom = '20px';
      title.style.fontWeight = 'bold';
      title.style.fontSize = '32px';

      const tip = document.createElement('div');
      tip.style.fontSize = '24px';
      tip.style.marginBottom = '30px';
      tip.innerHTML = '屏幕将在 <span id="block-algo-countdown" style="color:#ff4444;font-weight:bold;font-size:36px;">' + blockDuration + '</span> 秒后恢复';

      const note = document.createElement('div');
      note.style.fontSize = '14px';
      note.style.color = '#aaa';
      note.style.marginTop = '20px';
      note.textContent = '（第 ' + blockCount + ' 次拦截）';

      overlay.appendChild(title);
      overlay.appendChild(tip);
      overlay.appendChild(note);
      document.body.appendChild(overlay);

      // Disable scroll during block
      const originalOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      log('黑屏已激活（第' + blockCount + '次），持续' + blockDuration + '秒');

      let remain = blockDuration;
      const interval = setInterval(() => {
        remain -= 1;
        const el = document.getElementById('block-algo-countdown');
        if (el) el.textContent = String(remain);
        if (remain <= 0) {
          clearInterval(interval);
          // Restore scroll
          document.documentElement.style.overflow = originalOverflow;
          hideOverlay();
          log('黑屏已解除（第' + blockCount + '次）');
          // Schedule next block
          scheduleBlock();
        }
      }, 1000);
    });
  }

  function scheduleBlock() {
    if (timer) clearTimeout(timer);
    
    let waitTime, blockDuration;
    if (isFirstBlock) {
      waitTime = settings.firstBlockWaitTime * 1000;
      blockDuration = settings.firstBlockDuration;
      isFirstBlock = false;
    } else {
      waitTime = settings.followupBlockWaitTime * 1000;
      blockDuration = settings.followupBlockDuration;
    }

    timer = setTimeout(() => {
      showOverlay(blockDuration);
    }, waitTime);
  }

  function onUserActivity() {
    scheduleBlock();
  }

  function init() {
    if (!isTargetHost()) return;

    log('脚本已加载: ' + location.href);
    loadSettings();

    // Start timer
    setInterval(showTimerBadge, 500);
    showTimerBadge();

    // Schedule first block
    scheduleBlock();

    window.addEventListener('scroll', onUserActivity, { passive: true });
    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('click', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('touchstart', onUserActivity, { passive: true });
  }

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_ADDICTION_TIME') {
      sendResponse({ time: getAddictionTime() });
    } else if (request.type === 'GET_BLOCK_COUNT') {
      sendResponse({ count: blockCount });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
