// ==UserScript==
// @name         极简划词搜索
// @description  超小尺寸悬浮窗，支持划词搜索（百度/头条/知乎/小红书）、复制、打开链接；拖拽链接/图片直接新窗口打开（图片改为保存）；拖拽选中文本则执行搜索或打开域名；极致性能优化，大幅降低CPU占用
// @icon         https://www.baidu.com/favicon.ico
// @namespace    http://tampermonkey.net/
// @version      2.1
// @author       ddrwin
// @license      MIT
// @match        *://*/*
// @grant        none
// @note         2026.2.7  V1.0 初始版本
// @note         2026.2.8  V1.1 增加打开按钮，优化样式
// @note         2026.2.9  V1.2 增加拖拽搜索功能，修复状态残留bug
// @note         2026.2.10 V1.3 修复点击复制按钮误触拖拽搜索的问题
// @note         2026.2.11 V1.4 增加链接拖拽打开功能
// @note         2026.2.12 V1.5 增加图片拖拽打开功能
// @note         2026.2.13 V1.6 增加小红书搜索引擎
// @note         2026.2.14 V1.7 修复操作后未清除文本选中的问题
// @note         2026.2.15 V1.8 性能优化：缓存元素检测结果，减少DOM操作，调整搜索引擎顺序
// @note         2026.2.16 V1.9 性能大优化：使用Element.closest、raf节流、文档片段构建、快速空选返回
// @note         2026.2.17 V2.0 修复拖拽搜索误触及按钮点击错乱：仅当鼠标按下在选中区域内才触发拖拽，按钮事件改用直接绑定
// @note         2026.2.21 V2.0.2 优化URL识别逻辑，兼容不带协议的域名路径，增强特殊字符支持（基于v2.0.2beta1改进）
// @note         2026.2.26  V2.0.3 添加图片拖拽下载保存
// @note         2026.2.26  V2.0.4 改进图片下载兼容性：增加跨域处理和多级回退，控制台输出提示
// @note         2026.2.28  V2.0.5 图片保存时自动以当前时间重命名，时间格式调整为 YYYY.MM.DD~HH·MM·SS，添加详细注释
// @note         2026.3.1  V2.1 事件注册统一管理；搜索引擎列表配置化，方便未来扩展（如 Bing）
// @downloadURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.user.js
// @updateURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.meta.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 辅助函数：获取格式化的当前日期时间字符串
     * 格式：YYYY.MM.DD~HH·MM·SS
     * 例如：2026.03.01~14·25·36
     * 使用中点分隔小时、分钟、秒，避免文件名中的冒号问题
     */
    function getFormattedDateTime() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');   // 月份补零
        const day = String(d.getDate()).padStart(2, '0');          // 日期补零
        const hours = String(d.getHours()).padStart(2, '0');       // 小时补零
        const minutes = String(d.getMinutes()).padStart(2, '0');   // 分钟补零
        const seconds = String(d.getSeconds()).padStart(2, '0');   // 秒补零
        return `${year}.${month}.${day}~${hours}·${minutes}·${seconds}`;
    }

    // ==================== 图标 base64 编码 ====================
    const ICONS = {
        copy: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjU1Nzc5ODc4NDY4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0MTciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj5AZm9udC1mYWNlIHsgZm9udC1mYW1pbHk6IGZlZWRiYWNrLWljb25mb250OyBzcmM6IHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUud29mZjI/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmMiIpLCB1cmwoIi8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmIiksIHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUudHRmP3Q9MTYzMDAzMzc1OTk0NCIpIGZvcm1hdCgidHJ1ZXR5cGUiKTsgfQ0KPC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTM3NyA0MzJoMzQ5YTggOCAwIDAgMSA4IDh2NDhhOCA4IDAgMCAxLTggOEgzNzdhOCA4IDAgMCAxLTgtOHYtNDhhOCA4IDAgMCAxIDgtOHogbTAgMTYwaDI1OGE4IDggMCAwIDEgOCA4djQ4YTggOCAwIDAgMS04IDhIMzc3YTggOCAwIDAgMS04LTh2LTQ4YTggOCAwIDAgMSA4LTh6IG0tNjUtMjgwdjU3Nmg0ODBWMzEySDMxMnogbS00MC03Mmg1NjBjMTcuNjczIDAgMzIgMTQuMzI3IDMyIDMydjY1NmMwIDE3LjY3My0xNC4zMjcgMzItMzIgMzJIMjcyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJWMjcyYzAtMTcuNjczIDE0LjMyNy0zMiAzMi0zMnogbS04OC01NnY2NjRhOCA4IDAgMCAxLTggOGgtNTZhOCA4IDAgMCAxLTgtOFYxNDRjMC0xNy42NzMgMTQuMzI3LTMyIDMyLTMyaDYzMmE4IDggMCAwIDEgOCA4djU2YTggOCAwIDAgMS04IDhIMTg0eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iMTQxOCI+PC9wYXRoPjwvc3ZnPg==',
        search: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTY3NDk1OTczIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIwNzciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNNDQ2LjExMjMyMyAxNzcuNTQ1MDUxYzEzNy41Njc2NzcgMC4yMTk3OTggMjUyLjYxMjUyNSAxMDQuNTk3OTggMjY2LjE2MjQyNCAyNDEuNDkzMzMzIDEzLjU2MjgyOCAxMzYuODk1MzU0LTc4Ljc3ODE4MiAyNjEuODE4MTgyLTIxMy42MTc3NzcgMjg5LjAwODQ4NS0xMzQuODUyNTI1IDI3LjIwMzIzMi0yNjguMzg2MjYzLTUyLjE1Njc2OC0zMDguOTQ1NDU1LTE4My42MDg4ODlzMjUuMDE4MTgyLTI3Mi4yNTIxMjEgMTUxLjczODE4Mi0zMjUuNzc5Mzk0QTI2Ny4yMzU1NTYgMjY3LjIzNTU1NiAwIDAgMSA0NDYuMTEyMzIzIDE3Ny41NDUwNTFtMC02Mi4wNjA2MDdjLTE4Mi43OTQzNDMgMC0zMzAuOTg5ODk5IDE0OC4xOTU1NTYtMzMwLjk4OTg5OSAzMzAuOTg5ODk5czE0OC4xOTU1NTYgMzMwLjk4OTg5OSAzMzAuOTg5ODk5IDMzMC45ODk4OTkgMzMwLjk4OTg5OS0xNDguMTk1NTU2IDMzMC45ODk4OTktMzMwLjk4OTg5OS0xNDguMTk1NTU2LTMzMC45ODk4OTktMzMwLjk4OTg5OS0zMzAuOTg5ODk5eiBtNDMxLjMyMTIxMiA3OTMuMzQxNDE1YTMwLjg0OTI5MyAzMC44NDkyOTMgMCAwIDEtMjEuOTQxMDEtOS4xMDIyMjNsLTE1Ny4yMjAyMDItMTU3LjIyMDIwMmMtMTEuNzUyNzI3LTEyLjE3OTM5NC0xMS41ODQ2NDYtMzEuNTM0NTQ1IDAuMzc0OTUtNDMuNTA3MDcgMTEuOTcyNTI1LTExLjk3MjUyNSAzMS4zMjc2NzctMTIuMTQwNjA2IDQzLjQ5NDE0MS0wLjM3NDk1bDE1Ny4yMjAyMDIgMTU3LjIyMDIwMmEzMS4wMzY3NjggMzEuMDM2NzY4IDAgMCAxIDYuNzIzMjMyIDMzLjgxMDEwMSAzMS4wMDQ0NDQgMzEuMDA0NDQ0IDAgMCAxLTI4LjY1MTMxMyAxOS4xNzQxNDJ6IG0wIDAiIHAtaWQ9IjIwNzgiIGZpbGw9IiMzMzMzMzMiPjwvcGF0aD48L3N2Zz4=',
        openLink: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTgwNDU1NTcwIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijk0MiIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNODMyIDEyOEg2NDB2NjRoMTQ2Ljc1Mkw1MjEuMzc2IDQ1Ny4zNzZsNDUuMjQ4IDQ1LjI0OEw4MzIgMjM3LjI0OFYzODRoNjRWMTI4eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQzIj48L3BhdGg+PHBhdGggZD0iTTc2OCA4MzJIMTkyVjI1NmgzNTJ2LTY0SDE2MGEzMiAzMiAwIDAgMC0zMiAzMnY2NDBhMzIgMzIgMCAwIDAgMzIgMzJoNjQwYTMyIDMyIDAgMCAwIDMyLTMzVjQ4MGgtNjR2MzUyeiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQ0Ij48L3BhdGg+PC9zdmc+',
        save: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3E%3Cpath fill="%23333" d="M8 12L4 8h3V4h2v4h3l-4 4zM2 14h12v-2H2v2z"/%3E%3C/svg%3E'
    };

    // ==================== 搜索引擎列表（可配置，方便扩展）====================
    // 若要添加新的搜索引擎，只需在此数组末尾添加一项，格式如下：
    // { name: '必应', icon: ICONS.search, url: 'https://www.bing.com/search?q=%s' }
    // 注意：icon 字段可以使用现有的 ICONS.search 或自定义新的图标数据
    const SEARCH_ENGINES = [
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
        return isBaiduDomain() ? SEARCH_ENGINES.filter(e => e.name !== '百度') : SEARCH_ENGINES;
    }

    /**
     * 判断选中的文本是否是一个域名或URL
     * @param {string} text - 选中的文本
     * @returns {boolean} - 如果是域名/URL则返回true
     */
    function isDomain(text) {
        if (!text || text.includes(' ')) return false;

        // 规则1：匹配完整URL（带协议，包含路径/特殊字符）
        const urlRegex = /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
        if (urlRegex.test(text)) return true;

        // 规则2：匹配类似域名（可能带路径/查询），但无协议
        const domainLikeRegex = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
        return domainLikeRegex.test(text) &&
               text.includes('.') &&
               text.split('.').pop().length >= 2; // 确保最后一段至少2字符（如 .com）
    }

    /**
     * 将可能的域名补全为完整的URL
     * @param {string} domain - 域名或URL
     * @returns {string} - 补全后的URL
     */
    function makeUrl(domain) {
        return domain.startsWith('http') ? domain : 'https://' + domain;
    }

    /**
     * 快速判断是否在可编辑元素内（使用 closest）
     * @param {Element} el - 目标元素
     * @returns {boolean} - 如果在可编辑区域内返回true
     */
    function isInsideEditable(el) {
        return el && el.closest('input, textarea, [contenteditable="true"], [contenteditable=""]') !== null;
    }

    // ==================== 判断链接/图片（缓存 + closest）====================
    const linkCache = new WeakMap(); // 缓存链接检测结果，避免重复DOM查询

    /**
     * 判断元素是否是链接（或位于链接内）
     * @param {Element} el - 目标元素
     * @returns {boolean} - 如果是链接返回true
     */
    function isLinkElement(el) {
        if (!el) return false;
        if (linkCache.has(el)) return linkCache.get(el);
        const a = el.closest('a[href]');
        const result = !!a;
        linkCache.set(el, result);
        return result;
    }

    /**
     * 获取链接元素的URL
     * @param {Element} el - 目标元素
     * @returns {string|null} - URL或null
     */
    function getLinkUrl(el) {
        const a = el.closest('a[href]');
        return a ? a.href : null;
    }

    /**
     * 判断元素是否为图片
     * @param {Element} el - 目标元素
     * @returns {boolean} - 如果是图片返回true
     */
    function isImageElement(el) {
        return el && el.tagName === 'IMG';
    }

    /**
     * 获取图片元素的src
     * @param {Element} el - 目标元素
     * @returns {string|null} - 图片URL或null
     */
    function getImageUrl(el) {
        return el && el.tagName === 'IMG' ? el.src : null;
    }

    // ==================== 下载图片函数（多级回退 + 时间重命名）====================
    /**
     * 异步下载图片，优先使用 showSaveFilePicker 弹出保存对话框，
     * 如果失败则回退到 <a download> 直接下载（可指定文件名），
     * 最后在控制台提示手动保存方法。
     * @param {string} url - 图片URL
     */
    async function downloadImage(url) {
        // 从URL中提取文件扩展名（如 .jpg, .png），若无则默认 .jpg
        const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
        // 获取当前时间字符串，作为新文件名（不含扩展名）
        const timeStr = getFormattedDateTime();
        const newFileName = timeStr + ext; // 完整文件名，如 2026.03.01~14·25·36.jpg

        // 尝试使用现代文件保存 API（需用户手势触发）
        if (window.showSaveFilePicker) {
            try {
                // 发起 fetch 请求获取图片数据，添加请求头模拟浏览器行为
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

                // 弹出系统保存对话框，建议使用新文件名
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
                return; // 成功，结束
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('⏸️ 用户取消保存');
                    return;
                }
                // 其他错误（网络、权限等），记录并尝试回退方案
                console.warn('⚠️ showSaveFilePicker 失败，尝试备用下载方案', err);
            }
        }

        // 备用方案1：使用 <a download> 直接下载（可指定文件名，但可能因跨域被浏览器忽略）
        const a = document.createElement('a');
        a.href = url;
        a.download = newFileName; // 设置下载文件名（部分浏览器支持）
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`🔄 已尝试用 <a> 触发下载，文件名为 ${newFileName}，如果未开始下载，可能是跨域限制。`);

        // 备用方案2：如果上述方法无效，延迟后提示用户手动保存
        setTimeout(() => {
            console.log(`💡 如果图片未下载，请尝试右键点击链接，选择“图片另存为”并重命名为 ${newFileName}：\n${url}`);
            // 也可选择打开新窗口（取消下面注释）
            // window.open(url, '_blank');
        }, 500);
    }

    // ==================== 样式常量 ====================
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
    let toolbar = null;        // 工具栏DOM元素
    let hideTimeout = null;    // 自动隐藏定时器

    /**
     * 初始化工具栏（创建DOM并绑定基础事件）
     */
    function initToolbar() {
        toolbar = document.createElement('div');
        toolbar.id = 'custom-search-toolbar';
        toolbar.style.cssText = TOOLBAR_STYLE;
        // 阻止默认事件，避免干扰文本选择
        toolbar.addEventListener('mousedown', e => e.preventDefault());
        toolbar.addEventListener('mouseup', e => e.stopPropagation());
        // 事件委托：点击按钮时执行其存储的 handler
        toolbar.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (btn && btn._handler) btn._handler();
        });
        // 工具栏鼠标进入/离开处理
        toolbar.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
        toolbar.addEventListener('mouseleave', scheduleHide);
        document.body.appendChild(toolbar);
    }

    /**
     * 构建工具栏内容（根据选中文本或图片模式）
     * @param {string} selectedText - 选中的文本或图片URL
     * @param {string} mode - 'text' 或 'image'，决定工具栏按钮
     */
    function buildToolbar(selectedText, mode = 'text') {
        if (!toolbar) initToolbar();
        toolbar.innerHTML = ''; // 清空旧内容

        const fragment = document.createDocumentFragment();
        let buttons = [];

        if (mode === 'image') {
            // 图片模式：仅显示保存按钮
            buttons.push({
                icon: ICONS.save,
                text: '保存',
                handler: () => {
                    downloadImage(selectedText); // 触发图片下载
                    window.getSelection().empty(); // 清除选中（若有）
                    hideToolbar();
                }
            });
        } else {
            // 文本模式：根据是否域名显示“打开”按钮，以及复制、搜索引擎按钮
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
        }

        // 循环创建按钮并插入分隔符
        buttons.forEach((btn, i) => {
            if (i > 0) {
                const sep = document.createElement('span');
                sep.style.cssText = SEPARATOR_STYLE;
                fragment.appendChild(sep);
            }
            const btnEl = document.createElement('button');
            btnEl.style.cssText = BUTTON_STYLE;
            btnEl.innerHTML = `<img src="${btn.icon}" style="${ICON_STYLE}" alt=""><span>${btn.text}</span>`;
            btnEl._handler = btn.handler; // 将 handler 存储到按钮元素上
            // 悬停效果
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

    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     */
    function copyText(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    /**
     * 后备复制方法（使用 textarea）
     * @param {string} text - 要复制的文本
     */
    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    /**
     * 显示工具栏
     * @param {number} x - 鼠标X坐标
     * @param {number} y - 鼠标Y坐标
     * @param {string} selectedText - 选中的文本或图片URL
     * @param {string} mode - 'text' 或 'image'
     */
    function showToolbar(x, y, selectedText, mode = 'text') {
        if (hideTimeout) clearTimeout(hideTimeout);
        // 使用双重 rAF 避免布局抖动
        requestAnimationFrame(() => {
            buildToolbar(selectedText, mode);
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

    /**
     * 隐藏工具栏
     */
    function hideToolbar() {
        if (toolbar) toolbar.style.display = 'none';
    }

    /**
     * 延迟隐藏工具栏（用于鼠标离开时）
     */
    function scheduleHide() {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hideToolbar, 500);
    }

    // ==================== 拖拽相关（raf节流 + 选区位置检测）====================
    const DRAG_THRESHOLD = 5; // 拖拽触发最小距离
    let dragStartX = 0, dragStartY = 0;
    let dragListening = false; // 是否正在监听拖拽移动
    let dragTriggered = false; // 是否已触发拖拽动作
    let dragMode = null;       // 'link', 'image', 'search'
    let dragUrl = null;        // 拖拽的URL（链接或图片）
    let rafId = null;          // requestAnimationFrame ID

    /**
     * 开始监听拖拽（mousedown）
     * @param {MouseEvent} e
     */
    function startDragListening(e) {
        if (e.button !== 0 || (toolbar && toolbar.contains(e.target)) || isInsideEditable(e.target)) return;

        // 判断点击在什么元素上
        if (isLinkElement(e.target)) {
            dragMode = 'link';
            dragUrl = getLinkUrl(e.target);
            if (!dragUrl) return;
        } else if (isImageElement(e.target)) {
            dragMode = 'image';
            dragUrl = getImageUrl(e.target);
            if (!dragUrl) return;
        } else {
            // 没有点击链接/图片，检查是否点击在选中区域内
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            if (!selectedText) return;

            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                // 如果鼠标不在选区的矩形范围内，不启动拖拽（可能是开始新选择）
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

        // 监听后续移动和松开事件
        document.addEventListener('mousemove', onDragMoveThrottled, { passive: true });
        document.addEventListener('mouseup', onDragEnd);
    }

    /**
     * 节流的拖拽移动处理函数
     * @param {MouseEvent} e
     */
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

                hideToolbar(); // 隐藏可能显示的工具栏

                // 根据拖拽模式执行操作
                if (dragMode === 'link' && dragUrl) {
                    window.open(dragUrl, '_blank');
                } else if (dragMode === 'image' && dragUrl) {
                    downloadImage(dragUrl); // 图片拖拽保存
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

    /**
     * 拖拽结束（mouseup）
     */
    function onDragEnd() {
        cleanupDragListeners();
        dragTriggered = false;
        dragMode = null;
        dragUrl = null;
    }

    /**
     * 清理拖拽监听器
     */
    function cleanupDragListeners() {
        dragListening = false;
        document.removeEventListener('mousemove', onDragMoveThrottled);
        document.removeEventListener('mouseup', onDragEnd);
        if (rafId) cancelAnimationFrame(rafId);
    }

    // ==================== 事件监听统一管理 ====================
    /**
     * 初始化所有全局事件监听器
     * 集中管理，便于查看和修改
     */
    function initEventListeners() {
        // 监听鼠标按下，开始拖拽检测
        document.addEventListener('mousedown', startDragListening, { passive: true });

        // 监听鼠标松开，显示划词工具栏
        document.addEventListener('mouseup', onMouseUp);

        // 点击页面其他地方隐藏工具栏
        document.addEventListener('mousedown', onDocumentMouseDown, { passive: true });

        // 滚动时隐藏工具栏
        window.addEventListener('scroll', hideToolbar, { passive: true });

        // 选区变化时，如果没有选中文本则隐藏工具栏
        document.addEventListener('selectionchange', onSelectionChange);
    }

    // 以下为事件监听器的具体实现（已定义，此处只是引用，无需重复定义）

    /**
     * 鼠标松开事件处理
     * @param {MouseEvent} e
     */
    function onMouseUp(e) {
        if (dragTriggered) {
            // 如果拖拽已触发，重置状态并返回
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

        showToolbar(e.clientX, e.clientY, text, 'text');
    }

    /**
     * 文档上按下鼠标事件处理（用于点击外部隐藏工具栏）
     * @param {MouseEvent} e
     */
    function onDocumentMouseDown(e) {
        if (toolbar && !toolbar.contains(e.target)) hideToolbar();
    }

    /**
     * 选区变化事件处理
     */
    function onSelectionChange() {
        if (!window.getSelection().toString().trim()) {
            setTimeout(() => {
                if (!window.getSelection().toString().trim()) hideToolbar();
            }, 100);
        }
    }

    // ==================== 启动脚本 ====================
    // 初始化所有事件监听器
    initEventListeners();
})();