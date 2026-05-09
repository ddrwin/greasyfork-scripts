// ==UserScript==
// @name         DeepSeek 侧边栏永恒守护
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  双防线守护侧边栏 + 窄屏内容区保护（34px），默认静默
// @match        https://chat.deepseek.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deepseek.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

// ====== 防线一：matchMedia 劫持 ======
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

// ====== 防线二：resize 兜底修复 + 内容区保护 ======
(function() {
    'use strict';

    const SIDEBAR_SELECTOR = '._189b4a0';
    const CHAT_SELECTOR = '._6f2c522';
    const PROTECT_THRESHOLD = 770;
    const PROTECT_WIDTH = 34;

    function forceShowSidebar() {
        const sidebar = document.querySelector(SIDEBAR_SELECTOR);
        if (!sidebar) return;
        sidebar.style.setProperty('display', 'flex', 'important');
        sidebar.style.setProperty('visibility', 'visible', 'important');
        sidebar.style.setProperty('opacity', '1', 'important');
        sidebar.style.setProperty('pointer-events', 'auto', 'important');
        sidebar.style.setProperty('transform', 'none', 'important');
        const computedStyle = window.getComputedStyle(sidebar);
        if (computedStyle.width === '0px') {
            sidebar.style.setProperty('width', '260px', 'important');
        }
        if (computedStyle.height === '0px') {
            sidebar.style.setProperty('height', 'auto', 'important');
        }
    }

    function protectChatArea() {
        const chat = document.querySelector(CHAT_SELECTOR);
        if (!chat) return;
        if (window.innerWidth <= PROTECT_THRESHOLD) {
            chat.style.setProperty('padding-right', `${PROTECT_WIDTH}px`, 'important');
            chat.style.setProperty('box-sizing', 'border-box', 'important');
        } else {
            chat.style.removeProperty('padding-right');
            chat.style.removeProperty('box-sizing');
        }
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const sidebar = document.querySelector(SIDEBAR_SELECTOR);
            const wasHidden = !sidebar || sidebar.offsetParent === null;
            forceShowSidebar();
            protectChatArea();
            if (window.__DS_DEBUG__) {
                const status = wasHidden ? '⚠️已恢复' : '✅正常';
                console.log(`[守护] 宽度: ${window.innerWidth}px | 侧边栏: ${status}`);
            }
        }, 50);
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            forceShowSidebar();
            protectChatArea();
        }, 500);
    });

    window.__DS_DEBUG__ = false;
    console.log('[守护] 已就绪。如需调试日志，控制台输入: window.__DS_DEBUG__ = true');
})();