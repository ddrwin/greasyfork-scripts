// ==UserScript==
// @name         极简划词搜索
// @description  超小尺寸悬浮窗，支持划词搜索（百度/头条/知乎/小红书）、复制、打开链接；拖拽链接/图片直接新窗口打开（图片改为保存）；拖拽选中文本则执行搜索或打开域名；极致性能优化，大幅降低CPU占用
// @icon         https://www.baidu.com/favicon.ico
// @namespace    http://tampermonkey.net/
// @version      2.1.5
// @author       ddrwin
// @license      MIT
// @match        *://*/*
// @grant        none
// @note         2026.2.7  V1.0 初始版本
// @note         2026.2.8  V1.1 增加打开按钮，优化样式
// ...（中间注释略，保持原样）
// @note         2026.3.2  V2.1.4 改进图片下载兼容性：增加跨域处理和多级回退，控制台输出提示
// @note         2026.3.2  V2.1.5 图片保存时自动以当前时间重命名（格式：YYYY.MM.DD~HH:MM:SS）
// @downloadURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.user.js
// @updateURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 辅助函数：获取格式化当前时间 ====================
    function getFormattedDateTime() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}.${month}.${day}~${hours}·${minutes}·${seconds}`;
    }

    // ==================== 图标 ====================
    const ICONS = {
        copy: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjU1Nzc5ODc4NDY4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0MTciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj5AZm9udC1mYWNlIHsgZm9udC1mYW1pbHk6IGZlZWRiYWNrLWljb25mb250OyBzcmM6IHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUud29mZjI/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmMiIpLCB1cmwoIi8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmIiksIHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUudHRmP3Q9MTYzMDAzMzc1OTk0NCIpIGZvcm1hdCgidHJ1ZXR5cGUiKTsgfQ0KPC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTM3NyA0MzJoMzQ5YTggOCAwIDAgMSA4IDh2NDhhOCA4IDAgMCAxLTggOEgzNzdhOCA4IDAgMCAxLTgtOHYtNDhhOCA4IDAgMCAxIDgtOHogbTAgMTYwaDI1OGE4IDggMCAwIDEgOCA4djQ4YTggOCAwIDAgMS04IDhIMzc3YTggOCAwIDAgMS04LTh2LTQ4YTggOCAwIDAgMSA4LTh6IG0tNjUtMjgwdjU3Nmg0ODBWMzEySDMxMnogbS00MC03Mmg1NjBjMTcuNjczIDAgMzIgMTQuMzI3IDMyIDMydjY1NmMwIDE3LjY3My0xNC4zMjcgMzItMzIgMzJIMjcyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJWMjcyYzAtMTcuNjczIDE0LjMyNy0zMiAzMi0zMnogbS04OC01NnY2NjRhOCA4IDAgMCAxLTggOGgtNTZhOCA4IDAgMCAxLTgtOFYxNDRjMC0xNy42NzMgMTQuMzI3LTMyIDMyLTMyaDYzMmE4IDggMCAwIDEgOCA4djU2YTggOCAwIDAgMS04IDhIMTg0eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iMTQxOCI+PC9wYXRoPjwvc3ZnPg==',
        search: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTY3NDk1OTczIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIwNzciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNNDQ2LjExMjMyMyAxNzcuNTQ1MDUxYzEzNy41Njc2NzcgMC4yMTk3OTggMjUyLjYxMjUyNSAxMDQuNTk3OTggMjY2LjE2MjQyNCAyNDEuNDkzMzMzIDEzLjU2MjgyOCAxMzYuODk1MzU0LTc4Ljc3ODE4MiAyNjEuODE4MTgyLTIxMy42MTc3NzcgMjg5LjAwODQ4NS0xMzQuODUyNTI1IDI3LjIwMzIzMi0yNjguMzg2MjYzLTUyLjE1Njc2OC0zMDguOTQ1NDU1LTE4My42MDg4ODlzMjUuMDE4MTgyLTI3Mi4yNTIxMjEgMTUxLjczODE4Mi0zMjUuNzc5Mzk0QTI2Ny4yMzU1NTYgMjY3LjIzNTU1NiAwIDAgMSA0NDYuMTEyMzIzIDE3Ny41NDUwNTFtMC02Mi4wNjA2MDdjLTE4Mi43OTQzNDMgMC0zMzAuOTg5ODk5IDE0OC4xOTU1NTYtMzMwLjk4OTg5OSAzMzAuOTg5ODk5czE0OC4xOTU1NTYgMzMwLjk4OTg5OSAzMzAuOTg5ODk5IDMzMC45ODk4OTkgMzMwLjk4OTg5OS0xNDguMTk1NTU2IDMzMC45ODk4OTktMzMwLjk4OTg5OS0xNDguMTk1NTU2LTMzMC45ODk4OTktMzMwLjk4OTg5OS0zMzAuOTg5ODk5eiBtNDMxLjMyMTIxMiA3OTMuMzQxNDE1YTMwLjg0OTI5MyAzMC44NDkyOTMgMCAwIDEtMjEuOTQxMDEtOS4xMDIyMjNsLTE1Ny4yMjAyMDItMTU3LjIyMDIwMmMtMTEuNzUyNzI3LTEyLjE3OTM5NC0xMS41ODQ2NDYtMzEuNTM0NTQ1IDAuMzc0OTUtNDMuNTA3MDcgMTEuOTcyNTI1LTExLjk3MjUyNSAzMS4zMjc2NzctMTIuMTQwNjA2IDQzLjQ5NDE0MS0wLjM3NDk1bDE1Ny4yMjAyMDIgMTU3LjIyMDIwMmEzMS4wMzY3NjggMzEuMDM2NzY4IDAgMCAxIDYuNzIzMjMyIDMzLjgxMDEwMSAzMS4wMDQ0NDQgMzEuMDA0NDQ0IDAgMCAxLTI4LjY1MTMxMyAxOS4xNzQxNDJ6IG0wIDAiIHAtaWQ9IjIwNzgiIGZpbGw9IiMzMzMzMzMiPjwvcGF0aD48L3N2Zz4=',
        openLink: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTgwNDU1NTcwIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijk0MiIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNODMyIDEyOEg2NDB2NjRoMTQ2Ljc1Mkw1MjEuMzc2IDQ1Ny4zNzZsNDUuMjQ4IDQ1LjI0OEw4MzIgMjM3LjI0OFYzODRoNjRWMTI4eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQzIj48L3BhdGg+PHBhdGggZD0iTTc2OCA4MzJIMTkyVjI1NmgzNTJ2LTY0SDE2MGEzMiAzMiAwIDAgMC0zMiAzMnY2NDBhMzIgMzIgMCAwIDAgMzIgMzJoNjQwYTMyIDMyIDAgMCAwIDMyLTMzVjQ4MGgtNjR2MzUyeiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQ0Ij48L3BhdGg+PC9zdmc+',
        save: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3E%3Cpath fill="%23333" d="M8 12L4 8h3V4h2v4h3l-4 4zM2 14h12v-2H2v2z"/%3E%3C/svg%3E'
    };

    // ==================== 搜索引擎列表 ====================
    const ALL_ENGINES = [
        { name: '百度', icon: ICONS.search, url: 'https://www.baidu.com/s?wd=%s' },
        { name: '头条', icon: ICONS.search, url: 'https://www.toutiao.com/search/?keyword=%s' },
        { name: '知乎', icon: ICONS.search, url: 'https://www.zhihu.com/search?type=content&q=%s' },
        { name: '小红书', icon: ICONS.search, url: 'https://www.xiaohongshu.com/search_result?keyword=%s' }
    ];

    // ==================== 域名/URL判断（优化版）====================
    function isBaiduDomain() {
        return location.hostname.includes('baidu.com');
    }

    function getEnginesForCurrentSite() {
        return isBaiduDomain() ? ALL_ENGINES.filter(e => e.name !== '百度') : ALL_ENGINES;
    }

    function isDomain(text) {
        if (!text || text.includes(' ')) return false;

        const urlRegex = /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
        if (urlRegex.test(text)) return true;

        const domainLikeRegex = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
        return domainLikeRegex.test(text) &&
               text.includes('.') &&
               text.split('.').pop().length >= 2;
    }

    function makeUrl(domain) {
        return domain.startsWith('http') ? domain : 'https://' + domain;
    }

    // ==================== 快速判断是否在可编辑元素内（使用 closest）====================
    function isInsideEditable(el) {
        return el && el.closest('input, textarea, [contenteditable="true"], [contenteditable=""]') !== null;
    }

    // ==================== 判断链接/图片（缓存 + closest）====================
    const linkCache = new WeakMap();
    function isLinkElement(el) {
        if (!el) return false;
        if (linkCache.has(el)) return linkCache.get(el);
        const a = el.closest('a[href]');
        const result = !!a;
        linkCache.set(el, result);
        return result;
    }

    function getLinkUrl(el) {
        const a = el.closest('a[href]');
        return a ? a.href : null;
    }

    function isImageElement(el) {
        return el && el.tagName === 'IMG';
    }

    function getImageUrl(el) {
        return el && el.tagName === 'IMG' ? el.src : null;
    }

    // ==================== 下载图片函数（改进版：多级回退 + 控制台提示 + 时间重命名）====================
    async function downloadImage(url) {
        // 从URL中提取扩展名（如 .jpg, .png），若无则默认 .jpg
        const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
        const timeStr = getFormattedDateTime();
        const newFileName = timeStr + ext;

        // 尝试使用现代文件保存 API
        if (window.showSaveFilePicker) {
            try {
                // 添加一些请求头模拟浏览器行为（可能对某些服务器有帮助）
                const response = await fetch(url, {
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Referer': location.origin,
                        'Origin': location.origin
                    }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();

                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: newFileName,
                    types: [{
                        description: 'Image',
                        accept: { [blob.type]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] }
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                console.log(`✅ 图片已保存为 ${newFileName}`);
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('⏸️ 用户取消保存');
                    return;
                }
                console.warn('⚠️ showSaveFilePicker 失败，尝试备用下载方案', err);
            }
        }

        // 备用方案1：使用 <a download> 直接下载（可指定文件名）
        const a = document.createElement('a');
        a.href = url;
        a.download = newFileName; // 设置下载文件名
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`🔄 已尝试用 <a> 触发下载，文件名为 ${newFileName}，如果未开始下载，可能是跨域限制。`);

        // 备用方案2：如果上述方法无效，提示用户手动保存（打开新窗口）
        setTimeout(() => {
            console.log(`💡 如果图片未下载，请尝试右键点击链接，选择“图片另存为”并重命名为 ${newFileName}：\n${url}`);
            // 也可以选择打开新窗口（去掉下面注释即可启用）
            // window.open(url, '_blank');
        }, 500);
    }

    // ==================== 样式 ====================
    const TOOLBAR_STYLE = `
        position: fixed; z-index: 999999; background: #fff; border-radius: 8px;
        padding: 2px 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: flex;
        gap: 2px; font-size: 12px; color: #333; pointer-events: auto;
        border: 1px solid #e0e0e0; align-items: center; line-height: 1.2;
        flex-wrap: nowrap; white-space: nowrap;
    `;
    const BUTTON_STYLE = `
        background: transparent; border: none; color: #333; cursor: pointer;
        padding: 4px 4px; border-radius: 6px; font-size: 12px; display: flex;
        align-items: center; gap: 3px; transition: background 0.1s, color 0.1s;
        white-space: nowrap;
    `;
    const ICON_STYLE = `width: 13px; height: 13px; display: inline-block; vertical-align: middle; transition: filter 0.1s;`;
    const SEPARATOR_STYLE = `width: 1px; height: 18px; background: #ddd; margin: 0 2px;`;
    const GREEN_FILTER = 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)';

    // ==================== 工具栏管理（使用文档片段）====================
    let toolbar = null;
    let hideTimeout = null;

    function initToolbar() {
        toolbar = document.createElement('div');
        toolbar.id = 'custom-search-toolbar';
        toolbar.style.cssText = TOOLBAR_STYLE;
        toolbar.addEventListener('mousedown', e => e.preventDefault());
        toolbar.addEventListener('mouseup', e => e.stopPropagation());
        toolbar.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (btn && btn._handler) btn._handler();
        });
        document.body.appendChild(toolbar);
    }

    function buildToolbar(selectedText) {
        if (!toolbar) initToolbar();
        toolbar.innerHTML = '';

        const fragment = document.createDocumentFragment();
        const buttons = [];

        if (isDomain(selectedText)) {
            buttons.push({
                icon: ICONS.openLink,
                text: '打开',
                handler: () => {
                    window.open(makeUrl(selectedText), '_blank');
                    window.getSelection().empty();
                    hideToolbar();
                }
            });
        }

        buttons.push({
            icon: ICONS.copy,
            text: '复制',
            handler: () => {
                copyText(selectedText);
                window.getSelection().empty();
                hideToolbar();
            }
        });

        getEnginesForCurrentSite().forEach(engine => {
            buttons.push({
                icon: engine.icon,
                text: engine.name,
                handler: () => {
                    const url = engine.url.replace('%s', encodeURIComponent(selectedText));
                    window.open(url, '_blank');
                    window.getSelection().empty();
                    hideToolbar();
                }
            });
        });

        buttons.forEach((btn, i) => {
            if (i > 0) {
                const sep = document.createElement('span');
                sep.style.cssText = SEPARATOR_STYLE;
                fragment.appendChild(sep);
            }
            const btnEl = document.createElement('button');
            btnEl.style.cssText = BUTTON_STYLE;
            btnEl.innerHTML = `<img src="${btn.icon}" style="${ICON_STYLE}" alt=""><span>${btn.text}</span>`;
            btnEl._handler = btn.handler;
            btnEl.addEventListener('mouseenter', e => {
                e.currentTarget.style.background = '#f0f0f0';
                e.currentTarget.style.color = '#5FE382';
                e.currentTarget.querySelector('img').style.filter = GREEN_FILTER;
            });
            btnEl.addEventListener('mouseleave', e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#333';
                e.currentTarget.querySelector('img').style.filter = 'none';
            });
            fragment.appendChild(btnEl);
        });

        toolbar.appendChild(fragment);
    }

    function copyText(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    function showToolbar(x, y, selectedText) {
        if (hideTimeout) clearTimeout(hideTimeout);
        requestAnimationFrame(() => {
            buildToolbar(selectedText);
            requestAnimationFrame(() => {
                const winW = innerWidth, winH = innerHeight;
                const toolW = toolbar.offsetWidth, toolH = toolbar.offsetHeight;
                let left = x + 6, top = y + 10;
                if (left + toolW > winW) left = winW - toolW - 6;
                if (top + toolH > winH) top = y - toolH - 6;
                left = Math.max(2, left);
                top = Math.max(2, top);
                toolbar.style.left = left + 'px';
                toolbar.style.top = top + 'px';
                toolbar.style.display = 'flex';
            });
        });
    }

    function hideToolbar() {
        if (toolbar) toolbar.style.display = 'none';
    }

    function scheduleHide() {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hideToolbar, 500);
    }

    // ==================== 拖拽相关（raf节流 + 选区位置检测）====================
    const DRAG_THRESHOLD = 5;
    let dragStartX = 0, dragStartY = 0;
    let dragListening = false;
    let dragTriggered = false;
    let dragMode = null;
    let dragUrl = null;
    let rafId = null;

    function startDragListening(e) {
        if (e.button !== 0 || (toolbar && toolbar.contains(e.target)) || isInsideEditable(e.target)) return;

        if (isLinkElement(e.target)) {
            dragMode = 'link';
            dragUrl = getLinkUrl(e.target);
            if (!dragUrl) return;
        } else if (isImageElement(e.target)) {
            dragMode = 'image';
            dragUrl = getImageUrl(e.target);
            if (!dragUrl) return;
        } else {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            if (!selectedText) return;

            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                    return;
                }
            }

            dragMode = 'search';
            dragUrl = null;
        }

        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragListening = true;
        dragTriggered = false;

        document.addEventListener('mousemove', onDragMoveThrottled, { passive: true });
        document.addEventListener('mouseup', onDragEnd);
    }

    function onDragMoveThrottled(e) {
        if (!dragListening || dragTriggered) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist >= DRAG_THRESHOLD) {
                e.preventDefault?.();
                e.stopPropagation?.();

                dragTriggered = true;
                dragListening = false;
                cleanupDragListeners();

                hideToolbar();

                if (dragMode === 'link' && dragUrl) {
                    window.open(dragUrl, '_blank');
                } else if (dragMode === 'image' && dragUrl) {
                    // 图片拖拽改为保存（使用改进的下载函数）
                    downloadImage(dragUrl);
                } else if (dragMode === 'search') {
                    const sel = window.getSelection().toString().trim();
                    if (sel) {
                        window.open(isDomain(sel) ? makeUrl(sel) : 'https://www.baidu.com/s?wd=' + encodeURIComponent(sel), '_blank');
                        window.getSelection().empty();
                    }
                }

                // 立即重置状态
                dragTriggered = false;
                dragMode = null;
                dragUrl = null;
            }
            rafId = null;
        });
    }

    function onDragEnd() {
        cleanupDragListeners();
        dragTriggered = false;
        dragMode = null;
        dragUrl = null;
    }

    function cleanupDragListeners() {
        dragListening = false;
        document.removeEventListener('mousemove', onDragMoveThrottled);
        document.removeEventListener('mouseup', onDragEnd);
        if (rafId) cancelAnimationFrame(rafId);
    }

    // ==================== 事件监听（使用 passive 优化）====================
    document.addEventListener('mousedown', startDragListening, { passive: true });

    document.addEventListener('mouseup', (e) => {
        if (dragTriggered) {
            dragTriggered = false;
            dragMode = null;
            dragUrl = null;
            return;
        }

        const sel = window.getSelection();
        const text = sel.toString().trim();
        if (!text) {
            hideToolbar();
            return;
        }

        if (toolbar && toolbar.contains(e.target)) return;
        if (isInsideEditable(e.target)) {
            hideToolbar();
            return;
        }

        showToolbar(e.clientX, e.clientY, text);
    });

    document.addEventListener('mousedown', (e) => {
        if (toolbar && !toolbar.contains(e.target)) hideToolbar();
    }, { passive: true });

    window.addEventListener('scroll', hideToolbar, { passive: true });

    document.addEventListener('selectionchange', () => {
        if (!window.getSelection().toString().trim()) {
            setTimeout(() => {
                if (!window.getSelection().toString().trim()) hideToolbar();
            }, 100);
        }
    });

    if (toolbar) {
        toolbar.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
        toolbar.addEventListener('mouseleave', scheduleHide);
    }
})();