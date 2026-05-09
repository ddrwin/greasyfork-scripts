// ==UserScript==
// @name         DeepSeek 侧边栏永恒守护
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  双防线守护 + 动态间距 + SPA路由兼容 + 语义化降级 + 失效提示
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

// ====== 防线二：resize 兜底 + 动态间距 + SPA 兼容 (document-end) ======
(function() {
    'use strict';

    const THRESHOLD = 770;
    const PADDING_WIDE = 10;
    const PADDING_NARROW = 30;
    const MAX_FAIL_COUNT = 5;

    let failCount = 0;
    let warned = false;

    // ----- 语义化元素查找（支持降级） -----
    function findSidebar() {
        // 优先用已知类名
        let el = document.querySelector('._189b4a0');
        if (el) return el;

        // 降级：查找固定在右侧且包含滚动列表的容器
        const candidates = document.querySelectorAll('[class*="scroll"]');
        for (const c of candidates) {
            const style = window.getComputedStyle(c);
            if (style.position === 'fixed' && style.right !== 'auto' && parseInt(style.right) < 100) {
                return c;
            }
        }
        return null;
    }

    function findChatArea() {
        // 优先用已知类名
        let el = document.querySelector('._6f2c522');
        if (el) return el;

        // 降级：查找包含大量文本内容的主要区域
        const candidates = document.querySelectorAll('[class*="virtual"]');
        for (const c of candidates) {
            if (c.textContent && c.textContent.length > 500) {
                return c;
            }
        }
        return null;
    }

    // ----- 核心函数 -----
    function forceShowSidebar() {
        const sidebar = findSidebar();
        if (!sidebar) return;

        sidebar.style.setProperty('display', 'flex', 'important');
        sidebar.style.setProperty('visibility', 'visible', 'important');
        sidebar.style.setProperty('opacity', '1', 'important');
        sidebar.style.setProperty('pointer-events', 'auto', 'important');
    }

    function updateChatPadding() {
        const chat = findChatArea();
        if (!chat) return;

        const padding = window.innerWidth <= THRESHOLD ? PADDING_NARROW : PADDING_WIDE;
        chat.style.setProperty('padding-right', `${padding}px`, 'important');
        chat.style.setProperty('box-sizing', 'border-box', 'important');
    }

    function applyAll() {
        forceShowSidebar();
        updateChatPadding();
    }

    function checkHealth() {
        const sidebar = findSidebar();
        const chat = findChatArea();

        if (!sidebar || !chat) {
            failCount++;
            if (failCount >= MAX_FAIL_COUNT && !warned) {
                warned = true;
                console.warn(
                    '[守护] ⚠️ 连续多次未找到侧边栏或聊天区，可能页面已改版，脚本需要更新。\n' +
                    '请检查选择器是否仍然有效：._189b4a0 / ._6f2c522'
                );
            }
        } else {
            failCount = 0; // 找到了就重置计数
        }
    }

    // ----- resize 监听 -----
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            applyAll();
            if (window.__DS_DEBUG__) {
                console.log(`[守护] 宽度: ${window.innerWidth}px | 模式: ${window.innerWidth <= THRESHOLD ? '窄屏' : '宽屏'}`);
            }
        }, 50);
    });

    // ----- SPA 路由切换兼容：监视 DOM 变化 -----
    let observerTimer;
    const bodyObserver = new MutationObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(() => {
            applyAll();
            checkHealth();
        }, 200);
    });

    bodyObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // ----- 初始化 -----
    window.addEventListener('load', () => {
        setTimeout(() => {
            applyAll();
            checkHealth();
        }, 500);
    });

    // ----- 调试开关 -----
    window.__DS_DEBUG__ = false;
    console.log('[守护] v2.5 已就绪。调试模式: window.__DS_DEBUG__ = true');
})();