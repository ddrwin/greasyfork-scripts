// ==UserScript==
// @name         DeepSeek 侧边栏永恒守护
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  双防线守护 + 聊天区动态间距(>770px留10px, ≤770px留20px)
// @match        https://chat.deepseek.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deepseek.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

// ====== 防线一：matchMedia 劫持 (document-start) ======
(function() {
    'use strict';
    const originalMatchMedia = window.matchMedia.bind(window);
    let interceptCount = 0;

    window.matchMedia = function(query) {
        if (typeof query === 'string') {
            const match = query.match(/max-width\s*:\s*(\d+)px/);
            if (match && parseInt(match[1], 10) <= 1280) {
                interceptCount++;
                if (window.__DS_DEBUG__) {
                    console.log(`[守护] 拦截查询 #${interceptCount}: ${query}`);
                }
                return {
                    matches: false,
                    media: query,
                    onchange: null,
                    addListener: function(cb) { cb(this); },
                    removeListener: function() {},
                    addEventListener: function(type, cb) { if (type === 'change') cb(this); },
                    removeEventListener: function() {},
                    dispatchEvent: function() { return true; }
                };
            }
        }
        return originalMatchMedia(query);
    };
})();

// ====== 防线二：resize 兜底修复 + 动态内容区保护 (document-end) ======
(function() {
    'use strict';

    const SIDEBAR_SELECTOR = '._189b4a0';
    const CHAT_SELECTOR = '._6f2c522';
    const THRESHOLD = 770;
    const PADDING_WIDE = 10;
    const PADDING_NARROW = 20;

    function forceShowSidebar() {
        const sidebar = document.querySelector(SIDEBAR_SELECTOR);
        if (!sidebar) return;
        sidebar.style.setProperty('display', 'flex', 'important');
        sidebar.style.setProperty('visibility', 'visible', 'important');
        sidebar.style.setProperty('opacity', '1', 'important');
        sidebar.style.setProperty('pointer-events', 'auto', 'important');
    }

    function updateChatPadding() {
        const chat = document.querySelector(CHAT_SELECTOR);
        if (!chat) return;
        const padding = window.innerWidth <= THRESHOLD ? PADDING_NARROW : PADDING_WIDE;
        chat.style.setProperty('padding-right', `${padding}px`, 'important');
        chat.style.setProperty('box-sizing', 'border-box', 'important');
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const sidebar = document.querySelector(SIDEBAR_SELECTOR);
            const wasHidden = !sidebar || sidebar.offsetParent === null;
            forceShowSidebar();
            updateChatPadding();
            if (window.__DS_DEBUG__) {
                const status = wasHidden ? '⚠️已恢复' : '✅正常';
                console.log(`[守护] 宽度: ${window.innerWidth}px | 侧边栏: ${status}`);
            }
        }, 50);
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            forceShowSidebar();
            updateChatPadding();
        }, 500);
    });

    window.__DS_DEBUG__ = false;
    console.log('[守护] 已就绪。如需调试日志，控制台输入: window.__DS_DEBUG__ = true');
})();