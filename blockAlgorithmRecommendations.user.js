// ==UserScript==
// @name         Block Algorithm Recommendations
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Block recommendations on Xiaohongshu, Zhihu, and Bilibili
// @author       Your Name
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const TARGET_HOST_RE = /(^|\.)bilibili\.com$|(^|\.)zhihu\.com$|(^|\.)xiaohongshu\.com$/;
    const INACTIVITY_MS = 10000;
    const BLOCK_SECONDS = 5;

    let timer = null;
    let overlay = null;
    let badge = null;

    function isTargetHost() {
        return TARGET_HOST_RE.test(location.hostname);
    }

    function log(msg) {
        console.log('[Block Algorithm] ' + msg);
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

    function showBadge() {
        if (badge || !document.body) return;
        badge = document.createElement('div');
        badge.textContent = 'Block Algo 已加载';
        badge.style.cssText = [
            'position:fixed',
            'right:10px',
            'bottom:10px',
            'background:#111',
            'color:#0f0',
            'padding:6px 10px',
            'font-size:12px',
            'border-radius:6px',
            'z-index:2147483647',
            'opacity:0.85'
        ].join(';');
        document.body.appendChild(badge);
    }

    function hideOverlay() {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        overlay = null;
    }

    function showOverlay() {
        if (overlay) return;

        ensureBody(() => {
            if (overlay) return;

            overlay = document.createElement('div');
            overlay.id = 'algorithm-block-overlay';
            overlay.style.cssText = [
                'position:fixed',
                'top:0',
                'left:0',
                'width:100%',
                'height:100%',
                'background:black',
                'color:white',
                'display:flex',
                'flex-direction:column',
                'justify-content:center',
                'align-items:center',
                'font-size:24px',
                'z-index:2147483647'
            ].join(';');

            const title = document.createElement('div');
            title.textContent = '⚠️ 您可能沉迷于推荐算法';
            title.style.marginBottom = '12px';

            const tip = document.createElement('div');
            tip.innerHTML = '屏幕将在 <span id="block-algo-countdown">' + BLOCK_SECONDS + '</span> 秒后恢复';

            overlay.appendChild(title);
            overlay.appendChild(tip);
            document.body.appendChild(overlay);

            log('黑屏已激活');

            let remain = BLOCK_SECONDS;
            const interval = setInterval(() => {
                remain -= 1;
                const el = document.getElementById('block-algo-countdown');
                if (el) el.textContent = String(remain);
                if (remain <= 0) {
                    clearInterval(interval);
                    hideOverlay();
                    log('黑屏已解除');
                }
            }, 1000);
        });
    }

    function scheduleBlock() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(showOverlay, INACTIVITY_MS);
    }

    function onUserActivity() {
        scheduleBlock();
    }

    function init() {
        if (!isTargetHost()) return;

        log('脚本已加载: ' + location.href);

        ensureBody(showBadge);
        scheduleBlock();

        window.addEventListener('scroll', onUserActivity, { passive: true });
        window.addEventListener('mousemove', onUserActivity, { passive: true });
        window.addEventListener('click', onUserActivity, { passive: true });
        window.addEventListener('keydown', onUserActivity);
        window.addEventListener('touchstart', onUserActivity, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();