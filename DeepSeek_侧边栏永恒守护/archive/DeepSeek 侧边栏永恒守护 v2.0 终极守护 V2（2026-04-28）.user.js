// ==UserScript==
// @name         DeepSeek 侧边栏终极守护 V2
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  全宽度劫持 + 智能救援，确保侧边栏永不消失
// @match        https://chat.deepseek.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deepseek.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

// 第一部分：源头劫持
(function() {
    'use strict';
    const originalMatchMedia = window.matchMedia.bind(window);

    window.matchMedia = function(query) {
        if (typeof query === 'string') {
            const match = query.match(/max-width\s*:\s*(\d+)px/);
            if (match) {
                const width = parseInt(match[1], 10);
                if (width <= 1280) {
                    console.log('[侧边栏守护] 已拦截媒体查询:', query);
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
        }
        return originalMatchMedia(query);
    };

    console.log('[侧边栏守护] 强力 matchMedia 劫持已启动（拦截所有 max-width ≤ 1280px）。');
})();

// 第二部分：智能救援系统
(function() {
    'use strict';
    const SIDEBAR_CLASS = '_189b4a0';
    const CHECK_INTERVAL = 100;
    let rescuedElement = null;

    function getRealSidebar() {
        const all = document.querySelectorAll('.' + SIDEBAR_CLASS);
        for (let el of all) {
            if (el !== rescuedElement && el.offsetParent !== null) {
                return el;
            }
        }
        return null;
    }

    function isSidebarVisibile() {
        const sidebar = getRealSidebar();
        return sidebar && sidebar.offsetParent !== null;
    }

    function rescue() {
        if (isSidebarVisibile()) {
            if (rescuedElement) {
                console.log('[侧边栏守护] 原始侧边栏已恢复，移除救援副本。');
                rescuedElement.remove();
                rescuedElement = null;
            }
            return;
        }
        if (rescuedElement) return;

        console.warn('[侧边栏守护] 侧边栏消失，开始注入救援元素…');
        const container = document.querySelector('main') || document.body;
        const div = document.createElement('div');
        div.className = SIDEBAR_CLASS;
        div.innerHTML = `
            <div style="padding:20px; color:#666; text-align:center;">
                <p>侧边栏位置保留中…</p>
                <p style="font-size:12px;">请尝试稍微拉宽窗口或刷新</p>
            </div>
        `;
        div.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            width: 260px !important;
            height: 100vh !important;
            background: #f3f4f6 !important;
            z-index: 9999 !important;
            border-left: 1px solid #d1d5db !important;
            overflow-y: auto !important;
        `;
        container.appendChild(div);
        rescuedElement = div;
        console.log('[侧边栏守护] 救援元素已注入。');
    }

    setInterval(() => { rescue(); }, CHECK_INTERVAL);

    window.addEventListener('load', () => {
        setTimeout(() => {
            console.log('[侧边栏守护] 智能救援系统已激活，全宽度监控中。');
        }, 500);
    });
})();