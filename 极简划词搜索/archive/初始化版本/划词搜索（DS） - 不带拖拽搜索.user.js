// ==UserScript==
// @name         极简划词工具栏（打开+复制+百度+知乎+头条）· 混合亮绿版
// @namespace    http://tampermonkey.net/
// @version      4.8
// @description  超小尺寸，打开按钮置首，所有按钮用竖线分隔，悬停文字为#5FE382，图标为#4CAF50亮绿滤镜
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 图标（深色版本）====================
    const ICONS = {
        copy: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjU1Nzc5ODc4NDY4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0MTciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj5AZm9udC1mYWNlIHsgZm9udC1mYW1pbHk6IGZlZWRiYWNrLWljb25mb250OyBzcmM6IHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUud29mZjI/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmMiIpLCB1cmwoIi8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmIiksIHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUudHRmP3Q9MTYzMDAzMzc1OTk0NCIpIGZvcm1hdCgidHJ1ZXR5cGUiKTsgfQ0KPC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTM3NyA0MzJoMzQ5YTggOCAwIDAgMSA4IDh2NDhhOCA4IDAgMCAxLTggOEgzNzdhOCA4IDAgMCAxLTgtOHYtNDhhOCA4IDAgMCAxIDgtOHogbTAgMTYwaDI1OGE4IDggMCAwIDEgOCA4djQ4YTggOCAwIDAgMS04IDhIMzc3YTggOCAwIDAgMS04LTh2LTQ4YTggOCAwIDAgMSA4LTh6IG0tNjUtMjgwdjU3Nmg0ODBWMzEySDMxMnogbS00MC03Mmg1NjBjMTcuNjczIDAgMzIgMTQuMzI3IDMyIDMydjY1NmMwIDE3LjY3My0xNC4zMjcgMzItMzIgMzJIMjcyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJWMjcyYzAtMTcuNjczIDE0LjMyNy0zMiAzMi0zMnogbS04OC01NnY2NjRhOCA4IDAgMCAxLTggOGgtNTZhOCA4IDAgMCAxLTgtOFYxNDRjMC0xNy42NzMgMTQuMzI3LTMyIDMyLTMyaDYzMmE4IDggMCAwIDEgOCA4djU2YTggOCAwIDAgMS04IDhIMTg0eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iMTQxOCI+PC9wYXRoPjwvc3ZnPg==',
        search: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTY3NDk1OTczIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIwNzciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNNDQ2LjExMjMyMyAxNzcuNTQ1MDUxYzEzNy41Njc2NzcgMC4yMTk3OTggMjUyLjYxMjUyNSAxMDQuNTk3OTggMjY2LjE2MjQyNCAyNDEuNDkzMzMzIDEzLjU2MjgyOCAxMzYuODk1MzU0LTc4Ljc3ODE4MiAyNjEuODE4MTgyLTIxMy42MTc3NzcgMjg5LjAwODQ4NS0xMzQuODUyNTI1IDI3LjIwMzIzMi0yNjguMzg2MjYzLTUyLjE1Njc2OC0zMDguOTQ1NDU1LTE4My42MDg4ODlzMjUuMDE4MTgyLTI3Mi4yNTIxMjEgMTUxLjczODE4Mi0zMjUuNzc5Mzk0QTI2Ny4yMzU1NTYgMjY3LjIzNTU1NiAwIDAgMSA0NDYuMTEyMzIzIDE3Ny41NDUwNTFtMC02Mi4wNjA2MDdjLTE4Mi43OTQzNDMgMC0zMzAuOTg5ODk5IDE0OC4xOTU1NTYtMzMwLjk4OTg5OSAzMzAuOTg5ODk5czE0OC4xOTU1NTYgMzMwLjk4OTg5OSAzMzAuOTg5ODk5IDMzMC45ODk4OTkgMzMwLjk4OTg5OS0xNDguMTk1NTU2IDMzMC45ODk4OTktMzMwLjk4OTg5OS0xNDguMTk1NTU2LTMzMC45ODk4OTktMzMwLjk4OTg5OS0zMzAuOTg5ODk5eiBtNDMxLjMyMTIxMiA3OTMuMzQxNDE1YTMwLjg0OTI5MyAzMC44NDkyOTMgMCAwIDEtMjEuOTQxMDEtOS4xMDIyMjNsLTE1Ny4yMjAyMDItMTU3LjIyMDIwMmMtMTEuNzUyNzI3LTEyLjE3OTM5NC0xMS41ODQ2NDYtMzEuNTM0NTQ1IDAuMzc0OTUtNDMuNTA3MDcgMTEuOTcyNTI1LTExLjk3MjUyNSAzMS4zMjc2NzctMTIuMTQwNjA2IDQzLjQ5NDE0MS0wLjM3NDk1bDE1Ny4yMjAyMDIgMTU3LjIyMDIwMmEzMS4wMzY3NjggMzEuMDM2NzY4IDAgMCAxIDYuNzIzMjMyIDMzLjgxMDEwMSAzMS4wMDQ0NDQgMzEuMDA0NDQ0IDAgMCAxLTI4LjY1MTMxMyAxOS4xNzQxNDJ6IG0wIDAiIHAtaWQ9IjIwNzgiIGZpbGw9IiMzMzMzMzMiPjwvcGF0aD48L3N2Zz4=',
        openLink: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTgwNDU1NTcwIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijk0MiIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNODMyIDEyOEg2NDB2NjRoMTQ2Ljc1Mkw1MjEuMzc2IDQ1Ny4zNzZsNDUuMjQ4IDQ1LjI0OEw4MzIgMjM3LjI0OFYzODRoNjRWMTI4eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQzIj48L3BhdGg+PHBhdGggZD0iTTc2OCA4MzJIMTkyVjI1NmgzNTJ2LTY0SDE2MGEzMiAzMiAwIDAgMC0zMiAzMnY2NDBhMzIgMzIgMCAwIDAgMzIgMzJoNjQwYTMyIDMyIDAgMCAwIDMyLTMzVjQ4MGgtNjR2MzUyeiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQ0Ij48L3BhdGg+PC9zdmc+'
    };

    // ==================== 搜索引擎列表 ====================
    const ALL_ENGINES = [
        { name: '百度', icon: ICONS.search, url: 'https://www.baidu.com/s?wd=%s' },
        { name: '知乎', icon: ICONS.search, url: 'https://www.zhihu.com/search?type=content&q=%s' },
        { name: '头条', icon: ICONS.search, url: 'https://www.toutiao.com/search/?keyword=%s' }
    ];

    // ==================== 域名判断 ====================
    function isBaiduDomain() {
        return window.location.hostname.includes('baidu.com');
    }

    function getEnginesForCurrentSite() {
        if (isBaiduDomain()) {
            return ALL_ENGINES.filter(engine => engine.name !== '百度');
        }
        return ALL_ENGINES;
    }

    function isDomain(text) {
        if (!text || text.includes(' ') || !text.includes('.')) return false;
        const parts = text.split('.');
        const last = parts[parts.length - 1];
        if (last.length < 2) return false;
        return /^[a-zA-Z0-9\-\.\:\/]+$/.test(text);
    }

    function makeUrl(domain) {
        if (domain.startsWith('http://') || domain.startsWith('https://')) {
            return domain;
        }
        return 'https://' + domain;
    }

    // ==================== 超小尺寸样式（圆角稍大）====================
    const TOOLBAR_STYLE = `
        position: fixed;
        z-index: 999999;
        background: #ffffff;
        border-radius: 8px;
        padding: 2px 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        display: flex;
        gap: 2px;
        font-size: 12px;
        color: #333;
        pointer-events: auto;
        border: 1px solid #e0e0e0;
        align-items: center;
        line-height: 1.2;
        flex-wrap: nowrap;
        white-space: nowrap;
    `;

    const BUTTON_STYLE = `
        background: transparent;
        border: none;
        color: #333;
        cursor: pointer;
        padding: 4px 4px;
        border-radius: 6px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 3px;
        transition: background 0.1s, color 0.1s;
        white-space: nowrap;
    `;

    const ICON_STYLE = `
        width: 13px;
        height: 13px;
        display: inline-block;
        vertical-align: middle;
        transition: filter 0.1s;
    `;

    const SEPARATOR_STYLE = `
        width: 1px;
        height: 18px;
        background: #ddd;
        margin: 0 2px;
    `;

    // 使用4.4版的亮绿色滤镜（针对#4CAF50）
    const GREEN_FILTER = 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)';

    // ==================== 工具栏管理 ====================
    let toolbar = null;
    let hideTimeout = null;

    function createToolbar() {
        const div = document.createElement('div');
        div.id = 'custom-search-toolbar';
        div.style.cssText = TOOLBAR_STYLE;
        div.addEventListener('mousedown', (e) => e.preventDefault());
        div.addEventListener('mouseup', (e) => e.stopPropagation());
        return div;
    }

    function createButton(iconDataUrl, text, clickHandler) {
        const btn = document.createElement('button');
        btn.style.cssText = BUTTON_STYLE;

        const img = document.createElement('img');
        img.src = iconDataUrl;
        img.style.cssText = ICON_STYLE;
        img.alt = '';

        const span = document.createElement('span');
        span.textContent = text;

        btn.appendChild(img);
        btn.appendChild(span);

        btn.addEventListener('mouseenter', (e) => {
            e.currentTarget.style.background = '#f0f0f0';
            e.currentTarget.style.color = '#5FE382';      // 文字保持最新版的亮绿色
            img.style.filter = GREEN_FILTER;               // 图标使用4.4版滤镜
        });
        btn.addEventListener('mouseleave', (e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#333';
            img.style.filter = 'none';
        });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            clickHandler();
        });
        return btn;
    }

    function createSeparator() {
        const sep = document.createElement('span');
        sep.style.cssText = SEPARATOR_STYLE;
        return sep;
    }

    function populateToolbar(selectedText) {
        if (!toolbar) toolbar = createToolbar();
        toolbar.innerHTML = '';

        // 构建按钮列表（按照显示顺序）
        const buttons = [];

        // 1. 如果选中文本是域名，添加“打开”按钮
        if (isDomain(selectedText)) {
            buttons.push({
                type: 'open',
                icon: ICONS.openLink,
                text: '打开',
                handler: () => {
                    const url = makeUrl(selectedText);
                    window.open(url, '_blank');
                    hideToolbar();
                }
            });
        }

        // 2. 添加“复制”按钮
        buttons.push({
            type: 'copy',
            icon: ICONS.copy,
            text: '复制',
            handler: () => {
                copyText(selectedText);
                hideToolbar();
            }
        });

        // 3. 添加搜索引擎按钮
        const engines = getEnginesForCurrentSite();
        engines.forEach(engine => {
            buttons.push({
                type: 'engine',
                icon: engine.icon,
                text: engine.name,
                handler: () => {
                    const url = engine.url.replace('%s', encodeURIComponent(selectedText));
                    window.open(url, '_blank');
                    hideToolbar();
                }
            });
        });

        // 遍历按钮列表，第一个按钮不加分隔线，之后每个按钮前加分隔线
        buttons.forEach((btn, index) => {
            if (index > 0) {
                toolbar.appendChild(createSeparator());
            }
            const button = createButton(btn.icon, btn.text, btn.handler);
            toolbar.appendChild(button);
        });

        document.body.appendChild(toolbar);
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('复制失败', err);
        }
        document.body.removeChild(textarea);
    }

    function showToolbar(x, y, selectedText) {
        if (hideTimeout) clearTimeout(hideTimeout);
        populateToolbar(selectedText);

        setTimeout(() => {
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;
            const toolWidth = toolbar.offsetWidth;
            const toolHeight = toolbar.offsetHeight;

            let left = x + 6;
            let top = y + 10;

            if (left + toolWidth > winWidth) left = winWidth - toolWidth - 6;
            if (top + toolHeight > winHeight) top = y - toolHeight - 6;
            if (left < 0) left = 2;
            if (top < 0) top = 2;

            toolbar.style.left = left + 'px';
            toolbar.style.top = top + 'px';
            toolbar.style.display = 'flex';
        }, 0);
    }

    function hideToolbar() {
        if (toolbar) toolbar.style.display = 'none';
    }

    function scheduleHide() {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hideToolbar, 500);
    }

    function isInsideEditable(element) {
        if (!element) return false;
        const tag = element.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
        if (element.isContentEditable) return true;
        let parent = element.parentElement;
        while (parent) {
            if (parent.isContentEditable) return true;
            parent = parent.parentElement;
        }
        return false;
    }

    // ==================== 事件监听 ====================
    document.addEventListener('mouseup', (e) => {
        if (toolbar && toolbar.contains(e.target)) return;
        if (isInsideEditable(e.target)) {
            hideToolbar();
            return;
        }
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 0 && selectedText !== '\x01') {
            showToolbar(e.clientX, e.clientY, selectedText);
        } else {
            hideToolbar();
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (toolbar && !toolbar.contains(e.target)) hideToolbar();
    });

    window.addEventListener('scroll', hideToolbar, { passive: true });

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection().toString().trim();
        if (selection.length === 0) {
            setTimeout(() => {
                if (window.getSelection().toString().trim().length === 0) hideToolbar();
            }, 100);
        }
    });

    // 工具栏悬停时不自动隐藏
    if (toolbar) {
        toolbar.addEventListener('mouseenter', () => {
            if (hideTimeout) clearTimeout(hideTimeout);
        });
        toolbar.addEventListener('mouseleave', scheduleHide);
    }
})();