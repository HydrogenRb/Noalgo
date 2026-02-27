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

  function loadSettings(callback) {
    chrome.storage.sync.get(settings, (items) => {
      settings = items;
      log('Settings loaded: ' + JSON.stringify(settings));
      if (callback) callback();
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

  let overlayListenersAttached = false;
  let overlayUpdateHandler = null;

  function hideOverlay() {
    if (overlayListenersAttached && overlayUpdateHandler) {
      window.removeEventListener('resize', overlayUpdateHandler);
      window.removeEventListener('scroll', overlayUpdateHandler, true);
      overlayListenersAttached = false;
    }
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
  }

  function getSearchRect() {
    const selectors = [
      // generic
      'input[type="search"]',
      'input[placeholder*="搜索"]',
      'input[aria-label*="搜索"]',
      'input[name="keyword"]',
      'input#search-keyword',
      'input[name="search"]',
      '.search-input input',
      '.search-box input',
      '.search-bar input',
      '.nav-search input',
      '.nav-search-input',
      // bilibili specific
      '.bili-header .nav-search-input',
      '.bili-header__bar .nav-search-input',
      '.bili-search__input',
      // zhihu specific
      '.SearchBar-input',
      '.SearchBar input',
      // xiaohongshu specific
      '.search-input input',
      '.search-box input'
    ];

    const candidates = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => candidates.push(el));
    });

    let bestRect = null;
    let bestArea = 0;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (rect.width > 0 && rect.height > 0 && area > bestArea) {
        bestArea = area;
        bestRect = rect;
      }
    }

    return bestRect;
  }

  function showOverlay(blockDuration) {
    if (overlay) return;

    ensureBody(() => {
      if (overlay) return;

      blockCount++;
      
      overlay = document.createElement('div');
      overlay.id = 'algorithm-block-overlay';
      overlay.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'width:100%',
        'height:100%',
        'color:white',
        'display:flex',
        'flex-direction:column',
        'justify-content:center',
        'align-items:center',
        'font-size:28px',
        'z-index:2147483647',
        'pointer-events:none',
        'user-select:none'
      ].join(';');

      const blockerTop = document.createElement('div');
      const blockerLeft = document.createElement('div');
      const blockerRight = document.createElement('div');
      const blockerBottom = document.createElement('div');
      const blockers = [blockerTop, blockerLeft, blockerRight, blockerBottom];
      const baseBlockerStyle = [
        'position:fixed',
        'background:rgba(0,0,0,0.95)',
        'pointer-events:auto',
        'z-index:2147483646'
      ].join(';');
      blockers.forEach((b) => {
        b.style.cssText = baseBlockerStyle;
        overlay.appendChild(b);
      });

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

      const message = document.createElement('div');
      message.style.cssText = [
        'position:relative',
        'z-index:2147483647',
        'pointer-events:none',
        'text-align:center'
      ].join(';');
      message.appendChild(title);
      message.appendChild(tip);
      message.appendChild(note);
      overlay.appendChild(message);
      document.body.appendChild(overlay);

      const updateBlockers = () => {
        const rect = getSearchRect();
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (!rect) {
          blockerTop.style.cssText = baseBlockerStyle + `;top:0;left:0;width:${w}px;height:${h}px`;
          blockerLeft.style.cssText = baseBlockerStyle + ';width:0;height:0';
          blockerRight.style.cssText = baseBlockerStyle + ';width:0;height:0';
          blockerBottom.style.cssText = baseBlockerStyle + ';width:0;height:0';
          return;
        }
        const pad = 6;
        const left = Math.max(0, rect.left - pad);
        const top = Math.max(0, rect.top - pad);
        const right = Math.min(w, rect.right + pad);
        const bottom = Math.min(h, rect.bottom + pad);

        blockerTop.style.cssText = baseBlockerStyle + `;top:0;left:0;width:${w}px;height:${top}px`;
        blockerBottom.style.cssText = baseBlockerStyle + `;top:${bottom}px;left:0;width:${w}px;height:${Math.max(0, h - bottom)}px`;
        blockerLeft.style.cssText = baseBlockerStyle + `;top:${top}px;left:0;width:${left}px;height:${Math.max(0, bottom - top)}px`;
        blockerRight.style.cssText = baseBlockerStyle + `;top:${top}px;left:${right}px;width:${Math.max(0, w - right)}px;height:${Math.max(0, bottom - top)}px`;
      };

      overlayUpdateHandler = updateBlockers;
      updateBlockers();
      if (!overlayListenersAttached) {
        window.addEventListener('resize', overlayUpdateHandler);
        window.addEventListener('scroll', overlayUpdateHandler, true);
        overlayListenersAttached = true;
      }

      log('黑屏已激活（第' + blockCount + '次），持续' + blockDuration + '秒');

      let remain = blockDuration;
      const interval = setInterval(() => {
        remain -= 1;
        const el = document.getElementById('block-algo-countdown');
        if (el) el.textContent = String(remain);
        if (remain <= 0) {
          clearInterval(interval);
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

  function init() {
    if (!isTargetHost()) return;

    log('脚本已加载: ' + location.href);
    loadSettings(() => {
      // Schedule first block after settings are loaded
      scheduleBlock();
    });

    // Start timer
    setInterval(showTimerBadge, 500);
    showTimerBadge();

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
