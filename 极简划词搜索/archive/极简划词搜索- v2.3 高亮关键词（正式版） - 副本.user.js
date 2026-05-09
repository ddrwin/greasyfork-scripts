// ==UserScript==
// @name         极简划词搜索
// @description  超小尺寸悬浮窗，支持划词搜索、复制、打开链接；拖拽链接/图片保存；预定义五组高亮样式（可自定义），动态添加关键词增量高亮，无闪烁；自动高亮默认关闭，加粗样式默认注释；工具栏默认手动隐藏；极致性能优化
// @icon         https://www.baidu.com/favicon.ico
// @namespace    http://tampermonkey.net/
// @version      2.3.0
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
// @downloadURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.user.js
// @updateURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 可配置常量 ====================
    /**
     * 图片下载代理地址，用于绕过 CORS 限制（若置空则禁用代理）
     */
    const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';

    /**
     * 是否在最后的手动保存提示中自动打开新窗口
     * true : 控制台提示同时打开新窗口（便于手动保存）
     * false: 仅给出控制台提示
     */
    const OPEN_WINDOW_AS_FALLBACK = false;

    /**
     * 工具栏消失模式：
     * - 'auto'   : 鼠标移开工具栏后延迟 HIDE_DELAY 毫秒自动隐藏
     * - 'manual' : 鼠标移开不隐藏，需点击页面其他位置或点击工具栏按钮后才隐藏
     */
    const TOOLBAR_HIDE_MODE = 'manual';

    /**
     * 自动隐藏延迟（毫秒），仅在 TOOLBAR_HIDE_MODE='auto' 时有效
     */
    const HIDE_DELAY = 1000;

    /**
     * 是否在页面加载时自动高亮预定义关键词（默认关闭）
     * true : 页面加载后立即高亮 HIGHLIGHT_GROUPS 中定义的所有关键词
     * false: 不自动高亮，仅通过划词点击“高亮”按钮添加关键词
     */
    const AUTO_HIGHLIGHT_ENABLED = false;

    // ==================== 工具栏位置偏移量（图标个数）====================
    /**
     * 工具栏向左偏移的图标个数（正数左移，负数右移）
     * 偏移量基于工具栏第一个按钮的实际宽度计算，确保以“图标位置”为单位。
     * 例如设置为 1 时，工具栏会向左移动一个按钮宽度，使鼠标位于第二个按钮上方。
     */
    const OFFSET_LEFT_ICON_COUNT = 1.2;   // 用户可自行调整

    /**
     * 工具栏向下偏移的图标个数（正数下移，负数上移）
     * 偏移量基于工具栏第一个按钮的实际高度计算。
     * 例如设置为 0.3 时，工具栏会向下移动 0.3 个按钮高度。
     */
    const OFFSET_DOWN_ICON_COUNT = 0.3;   // 用户可自行调整

    // ==================== 高亮分组 ====================
    /**
     * 高亮样式分组，每组包含：
     *   name    : 分组名称（用于显示）
     *   keywords: 该组需要高亮的关键词数组（用户可自行添加）
     *   style   : 该组关键词的 CSS 样式字符串
     * 注：字体加粗样式默认被注释，如需启用请去掉 /* 和 */
     
    const HIGHLIGHT_GROUPS = [
        {
            name: "白字红底",
            keywords: [], // 用户可在此添加关键词，例如 ["北京", "阿里"]
            style: "background-color:#DE0422; color:#FFFFFF; /* font-weight:bold; */"
        },
        {
            name: "白字紫底",
            keywords: [],
            style: "background-color:#6633FF; color:#FFFFFF; /* font-weight:bold; */"
        },
        {
            name: "白字深绿底",
            keywords: [],
            style: "background-color:#008373; color:#FFFFFF; /* font-weight:bold; */"
        },
        {
            name: "红字黄底",
            keywords: [],
            style: "background-color:#FFFFCC; color:#FF0000; /* font-weight:bold; */"
        },
        {
            name: "绿字黄底",
            keywords: [],
            style: "background-color:#FFFFCC; color:#00CC00; /* font-weight:bold; */"
        }
    ];

    // ==================== 高亮管理 ====================
    /**
     * highlights 数组存储当前所有需要高亮的关键词及其对应的样式索引
     * 元素格式：{ keyword: string, styleIndex: number }
     */
    let highlights = [];

    /**
     * 下一个可用的动态样式索引（用于循环分配五组样式）
     * 每当用户通过“高亮”按钮添加新关键词时，使用该索引对应的样式，然后索引自增。
     */
    let nextStyleIndex = 0;

    /**
     * 用于异步分批处理高亮的定时器 ID
     */
    let highlightTimer = null;

    /**
     * MutationObserver 实例，用于监听页面变化，自动对新内容进行高亮
     */
    let observer = null;

    /**
     * MutationObserver 防抖定时器，避免频繁触发
     */
    let observerDebounceTimer = null;

    /**
     * 转义正则表达式特殊字符
     * @param {string} string - 原始字符串
     * @returns {string} - 转义后的字符串
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 判断一个文本节点是否已经被高亮包裹（或其祖先有高亮）
     * 通过向上查找 .search-highlight 类来判断
     * @param {Node} node - 文本节点
     * @returns {boolean} - 如果已经被高亮包裹则返回 true
     */
    function isNodeHighlighted(node) {
        return node.parentElement?.closest('.search-highlight') !== null;
    }

    /**
     * 异步增量应用所有高亮关键词
     * 核心逻辑：遍历所有未被高亮的文本节点，对每个节点用正则匹配所有关键词，
     * 然后按匹配位置拆分成文档片段，用 span 包裹关键词并应用对应样式。
     * 采用分批处理（BATCH_SIZE = 50）避免阻塞主线程。
     */
    function applyHighlightsAsync() {
        if (highlightTimer) clearTimeout(highlightTimer);
        if (highlights.length === 0) return;

        // 创建 TreeWalker 遍历所有文本节点，但跳过脚本、样式、输入框等标签内的文本，以及已被高亮的节点
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 跳过脚本、样式、输入框等标签内的文本
                    if (node.parentElement && ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(node.parentElement.tagName))
                        return NodeFilter.FILTER_REJECT;
                    // 跳过已经被高亮包裹的节点（避免重复处理）
                    if (isNodeHighlighted(node))
                        return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        // 构建同时匹配所有关键词的正则表达式（忽略大小写）
        const escapedKeywords = highlights.map(h => escapeRegExp(h.keyword));
        const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');

        let index = 0;
        const BATCH_SIZE = 50; // 每批处理 50 个文本节点

        const processNextBatch = () => {
            const end = Math.min(index + BATCH_SIZE, textNodes.length);
            for (let i = index; i < end; i++) {
                const node = textNodes[i];
                const text = node.textContent;
                const matches = [];
                let match;
                // 在当前文本节点中查找所有匹配的关键词
                while ((match = regex.exec(text)) !== null) {
                    matches.push({
                        index: match.index,
                        keyword: match[0],
                        length: match[0].length
                    });
                }
                if (matches.length === 0) continue;

                // 构建文档片段，将原始文本拆分为普通文本和高亮 span
                const fragment = document.createDocumentFragment();
                let lastPos = 0;
                for (const m of matches) {
                    const highlight = highlights.find(h => h.keyword.toLowerCase() === m.keyword.toLowerCase());
                    if (!highlight) continue;
                    const style = HIGHLIGHT_GROUPS[highlight.styleIndex % HIGHLIGHT_GROUPS.length]?.style || HIGHLIGHT_GROUPS[0].style;

                    // 添加匹配前的普通文本
                    if (m.index > lastPos)
                        fragment.appendChild(document.createTextNode(text.substring(lastPos, m.index)));

                    // 创建高亮 span
                    const span = document.createElement('span');
                    span.className = 'search-highlight';
                    span.style.cssText = style;
                    span.textContent = m.keyword;
                    fragment.appendChild(span);
                    lastPos = m.index + m.length;
                }
                // 添加剩余文本
                if (lastPos < text.length)
                    fragment.appendChild(document.createTextNode(text.substring(lastPos)));

                // 用文档片段替换原文本节点
                node.parentNode.replaceChild(fragment, node);
            }
            index = end;
            if (index < textNodes.length) {
                // 继续下一批
                highlightTimer = setTimeout(processNextBatch, 0);
            } else {
                highlightTimer = null;
            }
        };

        highlightTimer = setTimeout(processNextBatch, 0);
    }

    /**
     * 初始化预定义关键词高亮（仅当 AUTO_HIGHLIGHT_ENABLED 为 true 时调用）
     * 将 HIGHLIGHT_GROUPS 中定义的所有关键词加入 highlights 数组，并分配对应的组索引。
     * 如果同一关键词出现在多个组，则后面的组会覆盖前面的（去重逻辑）。
     */
    function initPredefinedHighlights() {
        HIGHLIGHT_GROUPS.forEach((group, groupIndex) => {
            group.keywords.forEach(keyword => {
                const existingIndex = highlights.findIndex(h => h.keyword === keyword);
                if (existingIndex !== -1) highlights.splice(existingIndex, 1); // 移除旧的关键词
                highlights.push({ keyword, styleIndex: groupIndex });
            });
        });
    }

    /**
     * 添加新的高亮关键词（由用户划词点击“高亮”按钮触发）
     * 如果关键词已存在，则将其移动到数组末尾（表示最近使用），样式不变；
     * 如果是新词，则使用下一个动态样式索引（循环五组），并自增 nextStyleIndex。
     * @param {string} keyword - 要高亮的关键词
     */
    function addDynamicHighlight(keyword) {
        if (!keyword) return;
        const existingIndex = highlights.findIndex(h => h.keyword === keyword);
        if (existingIndex !== -1) {
            // 已存在，则将其移动到末尾（最近使用）
            const existing = highlights.splice(existingIndex, 1)[0];
            highlights.push(existing);
        } else {
            // 新关键词，使用下一个动态样式索引（循环五组）
            highlights.push({ keyword, styleIndex: nextStyleIndex % HIGHLIGHT_GROUPS.length });
            nextStyleIndex++;
        }
        applyHighlightsAsync();
    }

    // 根据开关决定是否加载预定义关键词并立即高亮
    if (AUTO_HIGHLIGHT_ENABLED) {
        initPredefinedHighlights();
        applyHighlightsAsync();
    }

    /**
     * 初始化 MutationObserver，监听页面变化，当 DOM 有变动时自动重新应用高亮（增量模式）。
     * 使用 200ms 防抖避免频繁触发。
     */
    function initMutationObserver() {
        observer = new MutationObserver(() => {
            if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
            observerDebounceTimer = setTimeout(() => {
                applyHighlightsAsync();
                observerDebounceTimer = null;
            }, 200);
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    initMutationObserver();

    /**
     * 获取格式化的当前日期时间字符串，用于图片文件名
     * 格式：YYYY.MM.DD~HH·MM·SS  例如：2026.03.01~14·25·36
     * 使用中点分隔小时、分钟、秒，避免文件名中的冒号问题。
     * @returns {string} 格式化后的时间字符串
     */
    function getFormattedDateTime() {
        const d = new Date();
        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}~${String(d.getHours()).padStart(2,'0')}·${String(d.getMinutes()).padStart(2,'0')}·${String(d.getSeconds()).padStart(2,'0')}`;
    }

    // ==================== 图标 ====================
    /**
     * 所有按钮使用的图标 base64 编码
     */
    const ICONS = {
        copy: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjU1Nzc5ODc4NDY4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0MTciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj5AZm9udC1mYWNlIHsgZm9udC1mYW1pbHk6IGZlZWRiYWNrLWljb25mb250OyBzcmM6IHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUud29mZjI/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmMiIpLCB1cmwoIi8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmIiksIHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUudHRmP3Q9MTYzMDAzMzc1OTk0NCIpIGZvcm1hdCgidHJ1ZXR5cGUiKTsgfQ0KPC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTM3NyA0MzJoMzQ5YTggOCAwIDAgMSA4IDh2NDhhOCA4IDAgMCAxLTggOEgzNzdhOCA4IDAgMCAxLTgtOHYtNDhhOCA4IDAgMCAxIDgtOHogbTAgMTYwaDI1OGE4IDggMCAwIDEgOCA4djQ4YTggOCAwIDAgMS04IDhIMzc3YTggOCAwIDAgMS04LTh2LTQ4YTggOCAwIDAgMSA4LTh6IG0tNjUtMjgwdjU3Nmg0ODBWMzEySDMxMnogbS00MC03Mmg1NjBjMTcuNjczIDAgMzIgMTQuMzI3IDMyIDMydjY1NmMwIDE3LjY3My0xNC4zMjcgMzItMzIgMzJIMjcyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJWMjcyYzAtMTcuNjczIDE0LjMyNy0zMiAzMi0zMnogbS04OC01NnY2NjRhOCA4IDAgMCAxLTggOGgtNTZhOCA4IDAgMCAxLTgtOFYxNDRjMC0xNy42NzMgMTQuMzI3LTMyIDMyLTMyaDYzMmE4IDggMCAwIDEgOCA4djU2YTggOCAwIDAgMS04IDhIMTg0eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iMTQxOCI+PC9wYXRoPjwvc3ZnPg==',
        search: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTY3NDk1OTczIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIwNzciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNNDQ2LjExMjMyMyAxNzcuNTQ1MDUxYzEzNy41Njc2NzcgMC4yMTk3OTggMjUyLjYxMjUyNSAxMDQuNTk3OTggMjY2LjE2MjQyNCAyNDEuNDkzMzMzIDEzLjU2MjgyOCAxMzYuODk1MzU0LTc4Ljc3ODE4MiAyNjEuODE4MTgyLTIxMy42MTc3NzcgMjg5LjAwODQ4NS0xMzQuODUyNTI1IDI3LjIwMzIzMi0yNjguMzg2MjYzLTUyLjE1Njc2OC0zMDguOTQ1NDU1LTE4My42MDg4ODlzMjUuMDE4MTgyLTI3Mi4yNTIxMjEgMTUxLjczODE4Mi0zMjUuNzc5Mzk0QTI2Ny4yMzU1NTYgMjY3LjIzNTU1NiAwIDAgMSA0NDYuMTEyMzIzIDE3Ny41NDUwNTFtMC02Mi4wNjA2MDdjLTE4Mi43OTQzNDMgMC0zMzAuOTg5ODk5IDE0OC4xOTU1NTYtMzMwLjk4OTg5OSAzMzAuOTg5ODk5czE0OC4xOTU1NTYgMzMwLjk4OTg5OSAzMzAuOTg5ODk5IDMzMC45ODk4OTkgMzMwLjk4OTg5OS0xNDguMTk1NTU2IDMzMC45ODk4OTktMzMwLjk4OTg5OS0xNDguMTk1NTU2LTMzMC45ODk4OTktMzMwLjk4OTg5OS0zMzAuOTg5ODk5eiBtNDMxLjMyMTIxMiA3OTMuMzQxNDE1YTMwLjg0OTI5MyAzMC44NDkyOTMgMCAwIDEtMjEuOTQxMDEtOS4xMDIyMjNsLTE1Ny4yMjAyMDItMTU3LjIyMDIwMmMtMTEuNzUyNzI3LTEyLjE3OTM5NC0xMS41ODQ2NDYtMzEuNTM0NTQ1IDAuMzc0OTUtNDMuNTA3MDcgMTEuOTcyNTI1LTExLjk3MjUyNSAzMS4zMjc2NzctMTIuMTQwNjA2IDQzLjQ5NDE0MS0wLjM3NDk1bDE1Ny4yMjAyMDIgMTU3LjIyMDIwMmEzMS4wMzY3NjggMzEuMDM2NzY4IDAgMCAxIDYuNzIzMjMyIDMzLjgxMDEwMSAzMS4wMDQ0NDQgMzEuMDA0NDQ0IDAgMCAxLTI4LjY1MTMxMyAxOS4xNzQxNDJ6IG0wIDAiIHAtaWQ9IjIwNzgiIGZpbGw9IiMzMzMzMzMiPjwvcGF0aD48L3N2Zz4=',
        openLink: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTgwNDU1NTcwIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijk0MiIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNODMyIDEyOEg2NDB2NjRoMTQ2Ljc1Mkw1MjEuMzc2IDQ1Ny4zNzZsNDUuMjQ4IDQ1LjI0OEw4MzIgMjM3LjI0OFYzODRoNjRWMTI4eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQzIj48L3BhdGg+PHBhdGggZD0iTTc2OCA4MzJIMTkyVjI1NmgzNTJ2LTY0SDE2MGEzMiAzMiAwIDAgMC0zMiAzMnY2NDBhMzIgMzIgMCAwIDAgMzIgMzJoNjQwYTMyIDMyIDAgMCAwIDMyLTMzVjQ4MGgtNjR2MzUyeiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQ0Ij48L3BhdGg+PC9zdmc+',
        save: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3E%3Cpath fill="%23333" d="M8 12L4 8h3V4h2v4h3l-4 4zM2 14h12v-2H2v2z"/%3E%3C/svg%3E',
        highlight: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBkPSJNMTIgMjEuMzVsLTEuNDUtMS4zMkM1LjQgMTUuMzYgMiAxMi4yOCAyIDguNSAyIDUuNDIgNC40MiAzIDcuNSAzYzEuNzQgMCAzLjQxLjgxIDQuNSAyLjA5QzEzLjA5IDMuODEgMTQuNzYgMyAxNi41IDMgMTkuNTggMyAyMiA1LjQyIDIyIDguNWMwIDMuNzgtMy40IDYuODYtOC41NSAxMS41NEwxMiAyMS4zNXoiIGZpbGw9IiNlNzRjM2MiLz48L3N2Zz4='
    };

    // ==================== 搜索引擎列表 ====================
    /**
     * 搜索引擎配置数组，可按需添加或删除。
     * 每项包含：
     *   name: 显示在按钮上的名称
     *   icon: 图标（通常使用 ICONS.search）
     *   url:  搜索链接，其中 %s 会被替换为编码后的搜索词
     */
    const SEARCH_ENGINES = [
        { name: '百度', icon: ICONS.search, url: 'https://www.baidu.com/s?wd=%s' },
        { name: '头条', icon: ICONS.search, url: 'https://www.toutiao.com/search/?keyword=%s' },
        { name: '知乎', icon: ICONS.search, url: 'https://www.zhihu.com/search?type=content&q=%s' },
        { name: '小红书', icon: ICONS.search, url: 'https://www.xiaohongshu.com/search_result?keyword=%s' }
    ];

    /**
     * 判断当前页面是否为百度域名
     * @returns {boolean}
     */
    function isBaiduDomain() {
        return location.hostname.includes('baidu.com');
    }

    /**
     * 获取当前站点应显示的搜索引擎列表（若在百度页面则隐藏百度搜索按钮）
     * @returns {Array} 搜索引擎配置数组
     */
    function getEnginesForCurrentSite() {
        return isBaiduDomain() ? SEARCH_ENGINES.filter(e => e.name !== '百度') : SEARCH_ENGINES;
    }

    // ==================== 工具模块：URL和元素判断 ====================
    /**
     * 工具对象，包含各种与 URL 和元素相关的判断函数
     */
    const UrlUtils = {
        /**
         * 缓存链接检测结果，避免重复 DOM 查询
         */
        linkCache: new WeakMap(),

        /**
         * 判断选中的文本是否是一个域名或 URL
         * @param {string} text - 选中的文本
         * @returns {boolean} - 如果是域名/URL 返回 true
         */
        isDomain(text) {
            if (!text || text.includes(' ')) return false;
            // 规则1：匹配完整 URL（带协议，包含路径/特殊字符）
            const urlRegex = /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
            if (urlRegex.test(text)) return true;
            // 规则2：匹配类似域名（可能带路径/查询），但无协议
            const domainLikeRegex = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
            return domainLikeRegex.test(text) && text.includes('.') && text.split('.').pop().length >= 2;
        },

        /**
         * 将可能的域名补全为完整的 URL（添加 https:// 前缀）
         * @param {string} domain - 域名或 URL
         * @returns {string} - 补全后的 URL
         */
        makeUrl(domain) {
            return domain.startsWith('http') ? domain : 'https://' + domain;
        },

        /**
         * 快速判断是否在可编辑元素内（使用 closest）
         * @param {Element} el - 目标元素
         * @returns {boolean} - 如果在可编辑区域内返回 true
         */
        isInsideEditable(el) {
            return el?.closest('input, textarea, [contenteditable="true"], [contenteditable=""]') !== null;
        },

        /**
         * 判断元素是否是链接（或位于链接内）
         * @param {Element} el - 目标元素
         * @returns {boolean} - 如果是链接返回 true
         */
        isLinkElement(el) {
            if (!el) return false;
            if (this.linkCache.has(el)) return this.linkCache.get(el);
            const a = el.closest('a[href]');
            const result = !!a;
            this.linkCache.set(el, result);
            return result;
        },

        /**
         * 获取链接元素的 URL
         * @param {Element} el - 目标元素
         * @returns {string|null} - URL 或 null
         */
        getLinkUrl(el) {
            const a = el?.closest('a[href]');
            return a?.href ?? null;
        },

        /**
         * 判断元素是否为图片
         * @param {Element} el - 目标元素
         * @returns {boolean} - 如果是图片返回 true
         */
        isImageElement(el) {
            return el?.tagName === 'IMG';
        },

        /**
         * 获取图片元素的 src
         * @param {Element} el - 目标元素
         * @returns {string|null} - 图片 URL 或 null
         */
        getImageUrl(el) {
            return el?.tagName === 'IMG' ? el.src : null;
        }
    };

    // ==================== 代理请求封装 ====================
    /**
     * 通过 fetch 获取图片 Blob，支持直接请求和代理重试。
     * 首先尝试直接请求原图，若失败且配置了 PROXY_URL，则通过代理重试。
     * @param {string} url - 图片 URL
     * @param {Object} headers - 请求头
     * @returns {Promise<Blob>} 返回图片 Blob
     */
    async function fetchWithProxy(url, headers) {
        try {
            const response = await fetch(url, { mode: 'cors', credentials: 'omit', headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.blob();
        } catch (directErr) {
            console.warn('直接 fetch 失败，尝试代理：', directErr);
            if (PROXY_URL) {
                const proxyUrl = PROXY_URL + url;
                const response = await fetch(proxyUrl, { mode: 'cors', credentials: 'omit', headers });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.blob();
            } else {
                throw directErr;
            }
        }
    }

    // ==================== 下载图片函数 ====================
    /**
     * 异步下载图片，优先使用 showSaveFilePicker 弹出保存对话框（用户可选择位置），
     * 若失败或浏览器不支持，则回退到 <a download> 直接下载（可指定文件名），
     * 最后在控制台提示手动保存方法。
     * @param {string} url - 图片 URL
     */
    async function downloadImage(url) {
        // 从 URL 中提取文件扩展名（如 .jpg, .png），若无则默认 .jpg
        const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
        const timeStr = getFormattedDateTime();
        const newFileName = timeStr + ext; // 完整文件名，如 2026.03.01~14·25·36.jpg

        // 通用请求头，尽量模拟浏览器行为，减少被服务器拒绝的概率
        const headers = {
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': location.origin,
            'Origin': location.origin,
            'User-Agent': navigator.userAgent
        };

        // 尝试使用现代文件保存 API（需用户手势触发）
        if (window.showSaveFilePicker) {
            try {
                const blob = await fetchWithProxy(url, headers);
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: newFileName,
                    types: [{ description: 'Image', accept: { [blob.type]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] } }]
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
                console.warn('⚠️ 所有 fetch 尝试失败，使用备用下载方案', err);
            }
        }

        // 备用方案1：使用 <a download> 直接下载（可指定文件名，但可能因跨域被浏览器忽略）
        const a = document.createElement('a');
        a.href = url;
        a.download = newFileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`🔄 已尝试用 <a> 触发下载，文件名为 ${newFileName}，如果未开始下载，可能是跨域限制。`);

        // 备用方案2：延迟后提示用户手动保存（可选打开新窗口）
        setTimeout(() => {
            console.log(`💡 如果图片未下载，请尝试右键点击链接，选择“图片另存为”并重命名为 ${newFileName}：\n${url}`);
            if (OPEN_WINDOW_AS_FALLBACK) window.open(url, '_blank');
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

    // ==================== 工具栏管理 ====================
    let toolbar = null;        // 工具栏 DOM 元素
    let hideTimeout = null;    // 自动隐藏定时器

    /**
     * 初始化工具栏（创建 DOM 并绑定基础事件）
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
            btn?._handler?.();
        });
        // 工具栏鼠标进入/离开处理
        toolbar.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
        toolbar.addEventListener('mouseleave', () => {
            if (TOOLBAR_HIDE_MODE === 'auto') scheduleHide();
        });
        document.body.appendChild(toolbar);
    }

    /**
     * 构建工具栏内容（根据选中文本或图片模式）
     * @param {string} selectedText - 选中的文本或图片 URL
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
                    downloadImage(selectedText);
                    window.getSelection().empty();
                    hideToolbar();
                }
            });
        } else {
            // 文本模式：高亮、复制、打开（若为域名）、搜索引擎按钮
            // 高亮按钮（放在最前）
            buttons.push({
                icon: ICONS.highlight,
                text: '高亮',
                handler: () => {
                    const keyword = window.getSelection().toString().trim();
                    if (keyword) addDynamicHighlight(keyword);
                    hideToolbar();
                }
            });

            // 复制按钮
            buttons.push({
                icon: ICONS.copy,
                text: '复制',
                handler: () => {
                    copyText(selectedText);
                    window.getSelection().empty();
                    hideToolbar();
                }
            });

            // 如果选中文本是域名，则添加“打开”按钮
            if (UrlUtils.isDomain(selectedText)) {
                buttons.push({
                    icon: ICONS.openLink,
                    text: '打开',
                    handler: () => {
                        window.open(UrlUtils.makeUrl(selectedText), '_blank');
                        window.getSelection().empty();
                        hideToolbar();
                    }
                });
            }

            // 搜索引擎按钮
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
     * @param {number} x - 鼠标 X 坐标
     * @param {number} y - 鼠标 Y 坐标
     * @param {string} selectedText - 选中的文本或图片 URL
     * @param {string} mode - 'text' 或 'image'
     */
    function showToolbar(x, y, selectedText, mode = 'text') {
        if (hideTimeout) clearTimeout(hideTimeout);
        requestAnimationFrame(() => {
            buildToolbar(selectedText, mode);

            // 关键修复：先让工具栏可见，确保尺寸计算正确
            toolbar.style.display = 'flex';
            // 强制重排，确保布局已应用
            toolbar.offsetHeight;

            const winW = innerWidth, winH = innerHeight;
            const toolW = toolbar.offsetWidth, toolH = toolbar.offsetHeight;
            let left = x + 6, top = y + 10;

            if (mode === 'text') {
                const firstBtn = toolbar.querySelector('button');
                if (firstBtn) {
                    // 应用基于图标个数的偏移量（左移为负，下移为正）
                    left += firstBtn.offsetWidth * (-OFFSET_LEFT_ICON_COUNT);
                    top += firstBtn.offsetHeight * OFFSET_DOWN_ICON_COUNT;
                }
            }

            // 边界检查，确保工具栏不超出屏幕
            if (left + toolW > winW) left = winW - toolW - 6;
            if (top + toolH > winH) top = y - toolH - 6;
            left = Math.max(2, left);
            top = Math.max(2, top);

            toolbar.style.left = left + 'px';
            toolbar.style.top = top + 'px';
            // display 已设置，无需重复
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
        hideTimeout = setTimeout(hideToolbar, HIDE_DELAY);
    }

    // ==================== 拖拽相关 ====================
    const DRAG_THRESHOLD = 5; // 拖拽触发最小距离（像素）

    let dragStartX = 0, dragStartY = 0;
    let dragListening = false; // 是否正在监听拖拽移动
    let dragTriggered = false; // 是否已触发拖拽动作
    let dragMode = null;       // 'link', 'image', 'search'
    let dragUrl = null;        // 拖拽的 URL（链接或图片）
    let rafId = null;          // requestAnimationFrame ID

    /**
     * 开始监听拖拽（mousedown）
     * @param {MouseEvent} e
     */
    function startDragListening(e) {
        // 只监听左键、不在工具栏上、不在可编辑区域内
        if (e.button !== 0 || toolbar?.contains(e.target) || UrlUtils.isInsideEditable(e.target)) return;

        // 判断点击在什么元素上
        if (UrlUtils.isLinkElement(e.target)) {
            dragMode = 'link';
            dragUrl = UrlUtils.getLinkUrl(e.target);
            if (!dragUrl) return;
        } else if (UrlUtils.isImageElement(e.target)) {
            dragMode = 'image';
            dragUrl = UrlUtils.getImageUrl(e.target);
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
            const dist = Math.sqrt(dx * dx + dy * dy);
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
                        window.open(UrlUtils.isDomain(sel) ? UrlUtils.makeUrl(sel) : 'https://www.baidu.com/s?wd=' + encodeURIComponent(sel), '_blank');
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
     * 初始化所有全局事件监听器，集中管理便于查看和修改
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

        if (toolbar?.contains(e.target)) return;
        if (UrlUtils.isInsideEditable(e.target)) {
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
    initEventListeners();
})();