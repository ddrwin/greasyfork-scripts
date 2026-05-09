// ==UserScript==
// @name         极简划词搜索
// @description  超小尺寸悬浮窗，支持划词搜索、复制、打开链接；拖拽链接/图片保存；预定义六组高亮样式（可自定义），动态添加关键词增量高亮，无闪烁；自动高亮默认关闭，加粗样式默认注释；工具栏默认手动隐藏；可配置显示的搜索引擎；可调整按钮顺序；极致性能优化
// @icon         https://www.baidu.com/favicon.ico
// @namespace    http://tampermonkey.net/
// @version      2.4.3
// @author       ddrwin
// @license      MIT
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
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
// @note         2026.3.2  V2.1.1 增强图片下载：增加 CORS 代理重试机制、更完善的请求头，提升跨域图片保存成功率
// @note         2026.3.2  V2.1.2 工具模块拆分（UrlUtils）、使用可选链和空值合并简化代码、代理请求封装为独立函数
// @note         2026.3.3  V2.2.0 新增高亮按钮，支持页面内关键词高亮（最多5词，红/绿/蓝/紫/橙字黄底）；增加工具栏消失模式开关（auto/manual）；高亮操作异步分批处理，解决卡顿；可配置消失延迟
// @note         2026.3.3  V2.2.1 采用用户提供的五组预定义关键词及样式；高亮更新改为增量模式，已有高亮保持不变，消除闪烁；动态添加关键词按五色循环分配样式
// @note         2026.3.3  V2.2.2 修复预定义关键词未自动高亮的问题；增加 MutationObserver 监听页面变化，动态内容自动高亮
// @note         2026.3.3  V2.2.3 增加自动高亮开关（默认关闭）；加粗样式默认注释；工具栏消失模式默认改为手动；优化 MutationObserver 防抖
// @note         2026.3.3  V2.2.4 重新排列高亮组颜色（科普/硬件/人工智能颜色互换）；修复自动高亮开关未完全生效的问题；更换高亮图标
// @note         2026.3.3  V2.2.5 再次修复自动高亮开关：仅在开启时加载预定义关键词；清空所有分组关键词数组；更换太阳图标
// @note         2026.3.3  V2.2.6 分组名称改为颜色描述；再次修正太阳图标；点击高亮后工具栏立即消失
// @note         2026.3.3  V2.2.7 更换高亮图标为用户指定版本；交换复制和高亮按钮位置
// @note         2026.3.3  V2.2.8 增加工具栏偏移开关：可设置左移/下移多少个图标位置（基于按钮实际尺寸）
// @note         2026.3.3  V2.2.9 修复偏移量在后续划词中失效的问题（强制重排）；高亮按钮放回复制左侧
// @note         2026.3.5  V2.3.0 彻底修复偏移量失效问题：计算位置前先设置 display:flex；优化代码结构；重新调整高亮组顺序
// @note         2026.3.7  V2.4.0 移除百度域名特殊逻辑，搜索引擎全局统一配置；重新排列高亮颜色顺序（红/绿/蓝/菊红/紫/深绿）；代码全面注释
// @note         2026.3.7  V2.4.1 改用 GM_setValue/GM_getValue 实现跨域配置共享；彻底移除域名过滤
// @note         2026.3.7  V2.4.2 高亮添加防抖；设置面板边界优化；常量分组；代码精简
// @note         2026.3.7  V2.4.3 修复今日头条搜索页设置面板样式丢失问题：使用 Shadow DOM 封装面板，实现样式隔离；同步高亮颜色名称
// @downloadURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.user.js
// @updateURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置常量（集中管理）====================
    const CONFIG = {
        PROXY_URL: 'https://cors-anywhere.herokuapp.com/',
        OPEN_WINDOW_AS_FALLBACK: false,
        TOOLBAR_HIDE_MODE: 'manual',          // 'auto' 或 'manual'
        HIDE_DELAY: 1000,                      // 自动隐藏延迟（毫秒）
        AUTO_HIGHLIGHT_ENABLED: false,         // 是否自动高亮预定义关键词
        OFFSET_LEFT_ICON_COUNT: 0,              // 左移图标个数
        OFFSET_DOWN_ICON_COUNT: 0                // 下移图标个数
    };

    // ==================== 高亮分组（六组，按新顺序排列）====================
    // 颜色顺序：红、绿、蓝、菊红、紫、深绿
    const HIGHLIGHT_GROUPS = [
        { name: "红底白字", keywords: [], style: "background-color:#DE0422; color:#FFFFFF; /* font-weight:bold; */" },
        { name: "绿底白字", keywords: [], style: "background-color:#66CC00; color:#FFFFFF; /* font-weight:bold; */" },
        { name: "蓝底白字", keywords: [], style: "background-color:#3385FF; color:#FFFFFF; /* font-weight:bold; */" },
        { name: "菊红底白字", keywords: [], style: "background-color:#FF9933; color:#FFFFFF; /* font-weight:bold; */" },
        { name: "紫底白字", keywords: [], style: "background-color:#6633FF; color:#FFFFFF; /* font-weight:bold; */" },
        { name: "深绿底白字", keywords: [], style: "background-color:#008373; color:#FFFFFF; /* font-weight:bold; */" }
    ];

    // ==================== 搜索引擎配置（全局共享）====================
    const ALL_SEARCH_ENGINES = [
        { name: '百度', icon: '🔍', url: 'https://www.baidu.com/s?wd=%s' },
        { name: '头条', icon: '🔍', url: 'https://www.toutiao.com/search/?keyword=%s' },
        { name: '知乎', icon: '🔍', url: 'https://www.zhihu.com/search?type=content&q=%s' },
        { name: '小红书', icon: '🔍', url: 'https://www.xiaohongshu.com/search_result?keyword=%s' }
    ];

    // 从全局存储加载配置
    let enabledEngineNames = (() => {
        const saved = GM_getValue('search_engines_config', null);
        return saved && Array.isArray(saved) ? saved : ALL_SEARCH_ENGINES.map(e => e.name);
    })();

    let buttonOrder = GM_getValue('button_order_config', 'copy-first'); // 'copy-first' 或 'highlight-first'

    // 保存配置到全局存储
    const saveSearchEngineConfig = (engineNames) => GM_setValue('search_engines_config', engineNames);
    const saveButtonOrderConfig = (order) => GM_setValue('button_order_config', order);

    // 获取当前站点显示的搜索引擎（完全基于用户配置）
    const getEnabledEnginesForCurrentSite = () => ALL_SEARCH_ENGINES.filter(e => enabledEngineNames.includes(e.name));

    // ==================== 高亮管理 ====================
    let highlights = [];
    let nextStyleIndex = 0;
    let highlightTimer = null;
    let highlightDebounceTimer = null; // 用于防抖
    let observer = null;
    let observerDebounceTimer = null;

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isNodeHighlighted = (node) => node.parentElement?.closest('.search-highlight') !== null;

    function applyHighlightsAsync() {
        if (highlightTimer) clearTimeout(highlightTimer);
        if (highlights.length === 0) return;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (node.parentElement && ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(node.parentElement.tagName))
                        return NodeFilter.FILTER_REJECT;
                    if (isNodeHighlighted(node)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        const regex = new RegExp(`(${highlights.map(h => escapeRegExp(h.keyword)).join('|')})`, 'gi');
        let index = 0;
        const BATCH_SIZE = 50;

        const processNextBatch = () => {
            const end = Math.min(index + BATCH_SIZE, textNodes.length);
            for (let i = index; i < end; i++) {
                const node = textNodes[i];
                const text = node.textContent;
                const matches = [];
                let match;
                while ((match = regex.exec(text)) !== null) {
                    matches.push({ index: match.index, keyword: match[0], length: match[0].length });
                }
                if (matches.length === 0) continue;

                const fragment = document.createDocumentFragment();
                let lastPos = 0;
                for (const m of matches) {
                    const highlight = highlights.find(h => h.keyword.toLowerCase() === m.keyword.toLowerCase());
                    if (!highlight) continue;
                    const style = HIGHLIGHT_GROUPS[highlight.styleIndex % HIGHLIGHT_GROUPS.length]?.style || HIGHLIGHT_GROUPS[0].style;

                    if (m.index > lastPos) fragment.appendChild(document.createTextNode(text.substring(lastPos, m.index)));

                    const span = document.createElement('span');
                    span.className = 'search-highlight';
                    span.style.cssText = style;
                    span.textContent = m.keyword;
                    fragment.appendChild(span);
                    lastPos = m.index + m.length;
                }
                if (lastPos < text.length) fragment.appendChild(document.createTextNode(text.substring(lastPos)));

                node.parentNode.replaceChild(fragment, node);
            }
            index = end;
            if (index < textNodes.length) {
                highlightTimer = setTimeout(processNextBatch, 0);
            } else {
                highlightTimer = null;
            }
        };

        highlightTimer = setTimeout(processNextBatch, 0);
    }

    function addDynamicHighlight(keyword) {
        if (!keyword) return;
        const existingIndex = highlights.findIndex(h => h.keyword === keyword);
        if (existingIndex !== -1) {
            const existing = highlights.splice(existingIndex, 1)[0];
            highlights.push(existing);
        } else {
            highlights.push({ keyword, styleIndex: nextStyleIndex % HIGHLIGHT_GROUPS.length });
            nextStyleIndex++;
        }
        // 防抖：50ms 内多次添加只触发一次高亮更新
        if (highlightDebounceTimer) clearTimeout(highlightDebounceTimer);
        highlightDebounceTimer = setTimeout(() => {
            applyHighlightsAsync();
            highlightDebounceTimer = null;
        }, 50);
    }

    // 初始化预定义高亮（若开启）
    if (CONFIG.AUTO_HIGHLIGHT_ENABLED) {
        HIGHLIGHT_GROUPS.forEach((group, groupIndex) => {
            group.keywords.forEach(keyword => {
                const existingIndex = highlights.findIndex(h => h.keyword === keyword);
                if (existingIndex !== -1) highlights.splice(existingIndex, 1);
                highlights.push({ keyword, styleIndex: groupIndex });
            });
        });
        applyHighlightsAsync();
    }

    // MutationObserver 监听页面变化
    (function initMutationObserver() {
        observer = new MutationObserver(() => {
            if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
            observerDebounceTimer = setTimeout(() => {
                applyHighlightsAsync();
                observerDebounceTimer = null;
            }, 200);
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    })();

    // ==================== 辅助函数 ====================
    const getFormattedDateTime = () => {
        const d = new Date();
        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}~${String(d.getHours()).padStart(2,'0')}·${String(d.getMinutes()).padStart(2,'0')}·${String(d.getSeconds()).padStart(2,'0')}`;
    };

    // ==================== 图标 ====================
    const ICONS = {
        copy: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjU1Nzc5ODc4NDY4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0MTciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj5AZm9udC1mYWNlIHsgZm9udC1mYW1pbHk6IGZlZWRiYWNrLWljb25mb250OyBzcmM6IHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUud29mZjI/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmMiIpLCB1cmwoIi8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmIiksIHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUudHRmP3Q9MTYzMDAzMzc1OTk0NCIpIGZvcm1hdCgidHJ1ZXR5cGUiKTsgfQ0KPC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTM3NyA0MzJoMzQ5YTggOCAwIDAgMSA4IDh2NDhhOCA4IDAgMCAxLTggOEgzNzdhOCA4IDAgMCAxLTgtOHYtNDhhOCA4IDAgMCAxIDgtOHogbTAgMTYwaDI1OGE4IDggMCAwIDEgOCA4djQ4YTggOCAwIDAgMS04IDhIMzc3YTggOCAwIDAgMS04LTh2LTQ4YTggOCAwIDAgMSA4LTh6IG0tNjUtMjgwdjU3Nmg0ODBWMzEySDMxMnogbS00MC03Mmg1NjBjMTcuNjczIDAgMzIgMTQuMzI3IDMyIDMydjY1NmMwIDE3LjY3My0xNC4zMjcgMzItMzIgMzJIMjcyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJWMjcyYzAtMTcuNjczIDE0LjMyNy0zMiAzMi0zMnogbS04OC01NnY2NjRhOCA4IDAgMCAxLTggOGgtNTZhOCA4IDAgMCAxLTgtOFYxNDRjMC0xNy42NzMgMTQuMzI3LTMyIDMyLTMyaDYzMmE4IDggMCAwIDEgOCA4djU2YTggOCAwIDAgMS04IDhIMTg0eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iMTQxOCI+PC9wYXRoPjwvc3ZnPg==',
        search: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTY3NDk1OTczIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIwNzciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNNDQ2LjExMjMyMyAxNzcuNTQ1MDUxYzEzNy41Njc2NzcgMC4yMTk3OTggMjUyLjYxMjUyNSAxMDQuNTk3OTggMjY2LjE2MjQyNCAyNDEuNDkzMzMzIDEzLjU2MjgyOCAxMzYuODk1MzU0LTc4Ljc3ODE4MiAyNjEuODE4MTgyLTIxMy42MTc3NzcgMjg5LjAwODQ4NS0xMzQuODUyNTI1IDI3LjIwMzIzMi0yNjguMzg2MjYzLTUyLjE1Njc2OC0zMDguOTQ1NDU1LTE4My42MDg4ODlzMjUuMDE4MTgyLTI3Mi4yNTIxMjEgMTUxLjczODE4Mi0zMjUuNzc5Mzk0QTI2Ny4yMzU1NTYgMjY3LjIzNTU1NiAwIDAgMSA0NDYuMTEyMzIzIDE3Ny41NDUwNTFtMC02Mi4wNjA2MDdjLTE4Mi43OTQzNDMgMC0zMzAuOTg5ODk5IDE0OC4xOTU1NTYtMzMwLjk4OTg5OSAzMzAuOTg5ODk5czE0OC4xOTU1NTYgMzMwLjk4OTg5OSAzMzAuOTg5ODk5IDMzMC45ODk4OTkgMzMwLjk4OTg5OS0xNDguMTk1NTU2IDMzMC45ODk4OTktMzMwLjk4OTg5OS0xNDguMTk1NTU2LTMzMC45ODk4OTktMzMwLjk4OTg5OS0zMzAuOTg5ODk5eiBtNDMxLjMyMTIxMiA3OTMuMzQxNDE1YTMwLjg0OTI5MyAzMC44NDkyOTMgMCAwIDEtMjEuOTQxMDEtOS4xMDIyMjNsLTE1Ny4yMjAyMDItMTU3LjIyMDIwMmMtMTEuNzUyNzI3LTEyLjE3OTM5NC0xMS41ODQ2NDYtMzEuNTM0NTQ1IDAuMzc0OTUtNDMuNTA3MDcgMTEuOTcyNTI1LTExLjk3MjUyNSAzMS4zMjc2NzctMTIuMTQwNjA2IDQzLjQ5NDE0MS0wLjM3NDk1bDE1Ny4yMjAyMDIgMTU3LjIyMDIwMmEzMS4wMzY3NjggMzEuMDM2NzY4IDAgMCAxIDYuNzIzMjMyIDMzLjgxMDEwMSAzMS4wMDQ0NDQgMzEuMDA0NDQ0IDAgMCAxLTI4LjY1MTMxMyAxOS4xNzQxNDJ6IG0wIDAiIHAtaWQ9IjIwNzgiIGZpbGw9IiMzMzMzMzMiPjwvcGF0aD48L3N2Zz4=',
        openLink: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTgwNDU1NTcwIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijk0MiIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNODMyIDEyOEg2NDB2NjRoMTQ2Ljc1Mkw1MjEuMzc2IDQ1Ny4zNzZsNDUuMjQ4IDQ1LjI0OEw4MzIgMjM3LjI0OFYzODRoNjRWMTI4eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQzIj48L3BhdGg+PHBhdGggZD0iTTc2OCA4MzJIMTkyVjI1NmgzNTJ2LTY0SDE2MGEzMiAzMiAwIDAgMC0zMiAzMnY2NDBhMzIgMzIgMCAwIDAgMzIgMzJoNjQwYTMyIDMyIDAgMCAwIDMyLTMzVjQ4MGgtNjR2MzUyeiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQ0Ij48L3BhdGg+PC9zdmc+',
        save: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3E%3Cpath fill="%23333" d="M8 12L4 8h3V4h2v4h3l-4 4zM2 14h12v-2H2v2z"/%3E%3C/svg%3E',
        highlight: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBkPSJNMTIgMjEuMzVsLTEuNDUtMS4zMkM1LjQgMTUuMzYgMiAxMi4yOCAyIDguNSAyIDUuNDIgNC40MiAzIDcuNSAzYzEuNzQgMCAzLjQxLjgxIDQuNSAyLjA5QzEzLjA5IDMuODEgMTQuNzYgMyAxNi41IDMgMTkuNTggMyAyMiA1LjQyIDIyIDguNWMwIDMuNzgtMy40IDYuODYtOC41NSAxMS41NEwxMiAyMS4zNXoiIGZpbGw9IiNlNzRjM2MiLz48L3N2Zz4=',
        settings: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBkPSJNMTkuMTQgMTIuOTRjLjA0LS4zLjA2LS42MS4wNi0uOTQgMC0uMzItLjAyLS42NC0uMDctLjk0bDIuMDMtMS41OGMuMTgtLjE0LjIzLS40MS4xMi0uNjFsLTEuOTItMy4zMmMtLjEyLS4yMi0uMzctLjI5LS41OS0uMjJsLTIuMzkuOTZjLS41LS4zOC0xLjAzLS43LTEuNjItLjk0bC0uMzgtMi41NGMtLjAzLS4yNC0uMjQtLjQyLS40OC0uNDJoLTMuODRjLS4yNCAwLS40NS4xOC0uNDguNDJsLS4zOCAyLjU0Yy0uNTkuMjQtMS4xMy41Ny0xLjYyLjk0bC0yLjM5LS45NmMtLjIyLS4wOC0uNDcgMC0uNTkuMjJMMi43NCA4Ljg3Yy0uMTIuMjEtLjA4LjQ3LjEyLjYxbDIuMDMgMS41OGMtLjA1LjMtLjA5LjYzLS4wOS45NHMwLjAyLjY0LjA3Ljk0bC0yLjAzIDEuNThjLS4xOC4xNC0uMjMuNDEtLjEyLjYxbDEuOTIgMy4zMmMuMTIuMjIuMzcuMjkuNTkuMjJsMi4zOS0uOTZjLjUuMzggMS4wMy43IDEuNjIuOTRsLjM4IDIuNTRjLjAzLjI0LjI0LjQyLjQ4LjQyaDMuODRjLjI0IDAgLjQ1LS4xOC40OC0uNDJsLjM4LTIuNTRjLjU5LS4yNCAxLjEzLS41NiAxLjYyLS45NGwyLjM5Ljk2Yy4yMi4wOC40NyAwIC41OS0uMjJsMS45Mi0zLjMyYy4xMi0uMjIuMDctLjQ3LS4xMi0uNjFsLTIuMDEtMS41OE0xMiAxNS42Yy0xLjk4IDAtMy42LTEuNjItMy42LTMuNnMxLjYyLTMuNiAzLjYtMy42IDMuNiAxLjYyIDMuNiAzLjYtMS42MiAzLjYtMy42IDMuNnoiIGZpbGw9IiMzMzMiLz48L3N2Zz4='
    };
    ALL_SEARCH_ENGINES.forEach(e => e.icon = ICONS.search);

    // ==================== 设置面板（使用 Shadow DOM 实现样式隔离）===================
    let settingsPanelHost = null; // Shadow DOM 的容器（普通 div）
    let settingsPanelRoot = null; // Shadow root

    const createSettingsPanel = () => {
        if (settingsPanelHost) return;

        // 创建一个普通的 div 作为 Shadow DOM 的宿主
        settingsPanelHost = document.createElement('div');
        settingsPanelHost.id = 'custom-search-settings-host';
        settingsPanelHost.style.cssText = 'all: initial; position: fixed; z-index: 1000000; left: 0; top: 0; width: 0; height: 0;'; // 隐藏自身，只作为容器

        // 附加 Shadow DOM（使用 open 模式方便调试）
        settingsPanelRoot = settingsPanelHost.attachShadow({ mode: 'open' });

        // 在 Shadow DOM 内构建面板内容
        const panelDiv = document.createElement('div');
        panelDiv.style.cssText = `
            position: fixed;
            background: #fff;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid #e0e0e0;
            font-size: 14px;
            color: #333;
            display: none;
            min-width: 220px;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        `;

        // 标题
        const title = document.createElement('div');
        title.style.cssText = 'font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 4px;';
        title.textContent = '搜索引擎设置';
        panelDiv.appendChild(title);

        // 搜索引擎复选框列表
        const listDiv = document.createElement('div');
        listDiv.style.cssText = 'margin-bottom: 12px;';
        ALL_SEARCH_ENGINES.forEach(engine => {
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 6px; cursor: pointer;';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = engine.name;
            cb.checked = enabledEngineNames.includes(engine.name);
            cb.style.cssText = 'margin-right: 6px; vertical-align: middle;';
            label.appendChild(cb);
            label.appendChild(document.createTextNode(engine.name));
            listDiv.appendChild(label);
        });
        panelDiv.appendChild(listDiv);

        // 按钮顺序选项
        const orderDiv = document.createElement('div');
        orderDiv.style.cssText = 'margin-bottom: 12px; border-top: 1px solid #eee; padding-top: 8px;';
        const orderLabel = document.createElement('label');
        orderLabel.style.cssText = 'display: flex; align-items: center; cursor: pointer;';
        const orderCb = document.createElement('input');
        orderCb.type = 'checkbox';
        orderCb.checked = (buttonOrder === 'highlight-first');
        orderCb.style.cssText = 'margin-right: 6px; vertical-align: middle;';
        orderLabel.appendChild(orderCb);
        orderLabel.appendChild(document.createTextNode('高亮按钮在前（默认复制在前）'));
        orderDiv.appendChild(orderLabel);
        panelDiv.appendChild(orderDiv);

        // 按钮区域
        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
            background: #5FE382;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 13px;
            font-family: inherit;
        `;
        saveBtn.addEventListener('click', () => {
            const checkboxes = panelDiv.querySelectorAll('input[type="checkbox"]');
            const selected = [];
            for (let i = 0; i < ALL_SEARCH_ENGINES.length; i++) {
                if (checkboxes[i].checked) selected.push(checkboxes[i].value);
            }
            enabledEngineNames = selected;
            saveSearchEngineConfig(selected);
            buttonOrder = checkboxes[ALL_SEARCH_ENGINES.length].checked ? 'highlight-first' : 'copy-first';
            saveButtonOrderConfig(buttonOrder);
            panelDiv.style.display = 'none';
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            background: #f0f0f0;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 13px;
            font-family: inherit;
        `;
        cancelBtn.addEventListener('click', () => {
            panelDiv.style.display = 'none';
        });

        btnDiv.appendChild(saveBtn);
        btnDiv.appendChild(cancelBtn);
        panelDiv.appendChild(btnDiv);

        // 将面板添加到 Shadow DOM
        settingsPanelRoot.appendChild(panelDiv);
        document.body.appendChild(settingsPanelHost);
    };

    const showSettingsPanel = () => {
        createSettingsPanel();
        if (!toolbar) return;

        const panelDiv = settingsPanelRoot.querySelector('div');
        if (!panelDiv) return;

        // 更新复选框状态
        const checkboxes = panelDiv.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < ALL_SEARCH_ENGINES.length; i++) {
            checkboxes[i].checked = enabledEngineNames.includes(ALL_SEARCH_ENGINES[i].name);
        }
        checkboxes[ALL_SEARCH_ENGINES.length].checked = (buttonOrder === 'highlight-first');

        const toolbarRect = toolbar.getBoundingClientRect();
        const panelWidth = 240;
        let left = toolbarRect.left;
        let top = toolbarRect.bottom + 5;

        // 边界检查
        if (left + panelWidth > window.innerWidth) left = window.innerWidth - panelWidth - 5;
        if (top + 200 > window.innerHeight) top = toolbarRect.top - 205;
        left = Math.max(5, left);
        top = Math.max(5, top);

        panelDiv.style.left = left + 'px';
        panelDiv.style.top = top + 'px';
        panelDiv.style.display = 'block';
    };

    // ==================== 工具栏样式与变量 ====================
    const TOOLBAR_STYLE = `position:fixed; z-index:999999; background:#fff; border-radius:8px; padding:2px 4px; box-shadow:0 2px 6px rgba(0,0,0,0.1); display:flex; gap:2px; font-size:12px; color:#333; pointer-events:auto; border:1px solid #e0e0e0; align-items:center; line-height:1.2; flex-wrap:nowrap; white-space:nowrap;`;
    const BUTTON_STYLE = `background:transparent; border:none; color:#333; cursor:pointer; padding:4px 4px; border-radius:6px; font-size:12px; display:flex; align-items:center; gap:3px; transition:background 0.1s, color 0.1s; white-space:nowrap;`;
    const ICON_STYLE = `width:13px; height:13px; display:inline-block; vertical-align:middle; transition:filter 0.1s;`;
    const SEPARATOR_STYLE = `width:1px; height:18px; background:#ddd; margin:0 2px;`;
    const GREEN_FILTER = 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)';

    let toolbar = null;
    let hideTimeout = null;

    const initToolbar = () => {
        toolbar = document.createElement('div');
        toolbar.id = 'custom-search-toolbar';
        toolbar.style.cssText = TOOLBAR_STYLE;
        toolbar.addEventListener('mousedown', e => e.preventDefault());
        toolbar.addEventListener('mouseup', e => e.stopPropagation());
        toolbar.addEventListener('click', e => e.target.closest('button')?._handler?.());
        toolbar.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
        toolbar.addEventListener('mouseleave', () => CONFIG.TOOLBAR_HIDE_MODE === 'auto' && scheduleHide());
        document.body.appendChild(toolbar);
    };

    const buildToolbar = (selectedText, mode = 'text') => {
        if (!toolbar) initToolbar();
        toolbar.innerHTML = '';
        const fragment = document.createDocumentFragment();
        let buttons = [];

        if (mode === 'image') {
            buttons.push({
                icon: ICONS.save,
                text: '保存',
                handler: () => { downloadImage(selectedText); window.getSelection().empty(); hideToolbar(); }
            });
        } else {
            const copyBtn = { icon: ICONS.copy, text: '复制', handler: () => { copyText(selectedText); window.getSelection().empty(); hideToolbar(); } };
            const highlightBtn = { icon: ICONS.highlight, text: '高亮', handler: () => { const kw = window.getSelection().toString().trim(); if (kw) addDynamicHighlight(kw); hideToolbar(); } };
            if (buttonOrder === 'highlight-first') { buttons.push(highlightBtn, copyBtn); } else { buttons.push(copyBtn, highlightBtn); }

            if (UrlUtils.isDomain(selectedText)) {
                buttons.push({
                    icon: ICONS.openLink,
                    text: '打开',
                    handler: () => { window.open(UrlUtils.makeUrl(selectedText), '_blank'); window.getSelection().empty(); hideToolbar(); }
                });
            }

            getEnabledEnginesForCurrentSite().forEach(engine => {
                buttons.push({
                    icon: engine.icon,
                    text: engine.name,
                    handler: () => { window.open(engine.url.replace('%s', encodeURIComponent(selectedText)), '_blank'); window.getSelection().empty(); hideToolbar(); }
                });
            });

            buttons.push({ icon: ICONS.settings, text: '', title: '设置', handler: showSettingsPanel });
        }

        buttons.forEach((btn, i) => {
            if (i > 0) {
                const sep = document.createElement('span');
                sep.style.cssText = SEPARATOR_STYLE;
                fragment.appendChild(sep);
            }
            const btnEl = document.createElement('button');
            btnEl.style.cssText = BUTTON_STYLE;
            if (btn.title) btnEl.title = btn.title;
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
    };

    // ==================== 复制相关 ====================
    const copyText = (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };
    const fallbackCopy = (text) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    };

    // ==================== 显示/隐藏工具栏 ====================
    const showToolbar = (x, y, selectedText, mode = 'text') => {
        if (hideTimeout) clearTimeout(hideTimeout);
        requestAnimationFrame(() => {
            buildToolbar(selectedText, mode);
            toolbar.style.display = 'flex';
            toolbar.offsetHeight; // 强制重排
            const winW = innerWidth, winH = innerHeight;
            const toolW = toolbar.offsetWidth, toolH = toolbar.offsetHeight;
            let left = x + 6, top = y + 10;
            if (mode === 'text') {
                const firstBtn = toolbar.querySelector('button');
                if (firstBtn) {
                    left += firstBtn.offsetWidth * (-CONFIG.OFFSET_LEFT_ICON_COUNT);
                    top += firstBtn.offsetHeight * CONFIG.OFFSET_DOWN_ICON_COUNT;
                }
            }
            if (left + toolW > winW) left = winW - toolW - 6;
            if (top + toolH > winH) top = y - toolH - 6;
            left = Math.max(2, left);
            top = Math.max(2, top);
            toolbar.style.left = left + 'px';
            toolbar.style.top = top + 'px';
        });
    };
    const hideToolbar = () => { if (toolbar) toolbar.style.display = 'none'; };
    const scheduleHide = () => {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hideToolbar, CONFIG.HIDE_DELAY);
    };

    // ==================== 工具模块：URL和元素判断 ====================
    const UrlUtils = {
        linkCache: new WeakMap(),
        isDomain(text) {
            if (!text || text.includes(' ')) return false;
            const urlRegex = /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
            if (urlRegex.test(text)) return true;
            const domainLikeRegex = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
            return domainLikeRegex.test(text) && text.includes('.') && text.split('.').pop().length >= 2;
        },
        makeUrl: (domain) => domain.startsWith('http') ? domain : 'https://' + domain,
        isInsideEditable: (el) => el?.closest('input, textarea, [contenteditable="true"], [contenteditable=""]') !== null,
        isLinkElement(el) {
            if (!el) return false;
            if (this.linkCache.has(el)) return this.linkCache.get(el);
            const a = el.closest('a[href]');
            const result = !!a;
            this.linkCache.set(el, result);
            return result;
        },
        getLinkUrl: (el) => el?.closest('a[href]')?.href ?? null,
        isImageElement: (el) => el?.tagName === 'IMG',
        getImageUrl: (el) => el?.tagName === 'IMG' ? el.src : null
    };

    // ==================== 代理请求与下载 ====================
    async function fetchWithProxy(url, headers) {
        try {
            const res = await fetch(url, { mode: 'cors', credentials: 'omit', headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.blob();
        } catch (directErr) {
            console.warn('直接 fetch 失败，尝试代理：', directErr);
            if (CONFIG.PROXY_URL) {
                const proxyUrl = CONFIG.PROXY_URL + url;
                const res = await fetch(proxyUrl, { mode: 'cors', credentials: 'omit', headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.blob();
            } else {
                throw directErr;
            }
        }
    }

    async function downloadImage(url) {
        const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
        const newFileName = getFormattedDateTime() + ext;
        const headers = {
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': location.origin,
            'Origin': location.origin,
            'User-Agent': navigator.userAgent
        };

        if (window.showSaveFilePicker) {
            try {
                const blob = await fetchWithProxy(url, headers);
                const handle = await window.showSaveFilePicker({
                    suggestedName: newFileName,
                    types: [{ description: 'Image', accept: { [blob.type]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                console.log(`✅ 图片已保存为 ${newFileName}`);
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('⏸️ 用户取消保存');
                    return;
                }
                console.warn('⚠️ 所有 fetch 尝试失败，使用备用下载方案', err);
            }
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = newFileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`🔄 已尝试用 <a> 触发下载，文件名为 ${newFileName}，如果未开始下载，可能是跨域限制。`);

        setTimeout(() => {
            console.log(`💡 如果图片未下载，请尝试右键点击链接，选择“图片另存为”并重命名为 ${newFileName}：\n${url}`);
            if (CONFIG.OPEN_WINDOW_AS_FALLBACK) window.open(url, '_blank');
        }, 500);
    }

    // ==================== 拖拽相关 ====================
    const DRAG_THRESHOLD = 5;
    let dragStartX = 0, dragStartY = 0, dragListening = false, dragTriggered = false, dragMode = null, dragUrl = null, rafId = null;

    const startDragListening = (e) => {
        if (e.button !== 0 || toolbar?.contains(e.target) || UrlUtils.isInsideEditable(e.target)) return;
        if (UrlUtils.isLinkElement(e.target)) {
            dragMode = 'link';
            dragUrl = UrlUtils.getLinkUrl(e.target);
            if (!dragUrl) return;
        } else if (UrlUtils.isImageElement(e.target)) {
            dragMode = 'image';
            dragUrl = UrlUtils.getImageUrl(e.target);
            if (!dragUrl) return;
        } else {
            const sel = window.getSelection();
            const text = sel.toString().trim();
            if (!text) return;
            if (sel.rangeCount > 0) {
                const rect = sel.getRangeAt(0).getBoundingClientRect();
                if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
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
    };

    const onDragMoveThrottled = (e) => {
        if (!dragListening || dragTriggered) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            if (Math.sqrt(dx*dx + dy*dy) >= DRAG_THRESHOLD) {
                e.preventDefault?.();
                e.stopPropagation?.();
                dragTriggered = true;
                dragListening = false;
                cleanupDragListeners();
                hideToolbar();
                if (dragMode === 'link' && dragUrl) {
                    window.open(dragUrl, '_blank');
                } else if (dragMode === 'image' && dragUrl) {
                    downloadImage(dragUrl);
                } else if (dragMode === 'search') {
                    const sel = window.getSelection().toString().trim();
                    if (sel) {
                        window.open(UrlUtils.isDomain(sel) ? UrlUtils.makeUrl(sel) : 'https://www.baidu.com/s?wd=' + encodeURIComponent(sel), '_blank');
                        window.getSelection().empty();
                    }
                }
                dragTriggered = false;
                dragMode = null;
                dragUrl = null;
            }
            rafId = null;
        });
    };

    const onDragEnd = () => { cleanupDragListeners(); dragTriggered = false; dragMode = null; dragUrl = null; };
    const cleanupDragListeners = () => {
        dragListening = false;
        document.removeEventListener('mousemove', onDragMoveThrottled);
        document.removeEventListener('mouseup', onDragEnd);
        if (rafId) cancelAnimationFrame(rafId);
    };

    // ==================== 事件监听 ====================
    const initEventListeners = () => {
        document.addEventListener('mousedown', startDragListening, { passive: true });
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousedown', onDocumentMouseDown, { passive: true });
        window.addEventListener('scroll', hideToolbar, { passive: true });
        document.addEventListener('selectionchange', onSelectionChange);
    };

    const onMouseUp = (e) => {
        if (dragTriggered) { dragTriggered = false; dragMode = null; dragUrl = null; return; }
        const text = window.getSelection().toString().trim();
        if (!text) { hideToolbar(); return; }
        if (toolbar?.contains(e.target)) return;
        if (UrlUtils.isInsideEditable(e.target)) { hideToolbar(); return; }
        showToolbar(e.clientX, e.clientY, text, 'text');
    };
    const onDocumentMouseDown = (e) => { if (toolbar && !toolbar.contains(e.target)) hideToolbar(); };
    const onSelectionChange = () => {
        if (!window.getSelection().toString().trim()) {
            setTimeout(() => { if (!window.getSelection().toString().trim()) hideToolbar(); }, 100);
        }
    };

    // ==================== 启动 ====================
    initEventListeners();
})();