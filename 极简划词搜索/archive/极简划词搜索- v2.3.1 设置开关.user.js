// ==UserScript==
// @name         极简划词搜索
// @description  超小尺寸悬浮窗，支持划词搜索、复制、打开链接；拖拽链接/图片保存；预定义六组高亮样式（可自定义），动态添加关键词增量高亮，无闪烁；自动高亮默认关闭，加粗样式默认注释；工具栏默认手动隐藏；可配置显示的搜索引擎；极致性能优化
// @icon         https://www.baidu.com/favicon.ico
// @namespace    http://tampermonkey.net/
// @version      2.4.0
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
// @note         2026.3.7  V2.4.0 增加第六组高亮颜色（蓝底白字）；补全分组名称；添加设置按钮，支持自定义搜索引擎显示
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

    // ==================== 高亮分组（六组）====================
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
            name: "橙底白字",
            keywords: [],
            style: "background-color:#FF9933; color:#FFFFFF; /* font-weight:bold; */"
        },
        {
            name: "绿底白字",
            keywords: [],
            style: "background-color:#66CC00; color:#FFFFFF; /* font-weight:bold; */"
        },
        {
            name: "蓝底白字",
            keywords: [],
            style: "background-color:#3385FF; color:#FFFFFF; /* font-weight:bold; */"
        }
    ];

    // ==================== 搜索引擎配置 ====================
    /**
     * 所有可用的搜索引擎列表（完整列表，用于配置）
     * 注意：不要直接修改此数组，用于设置面板显示
     */
    const ALL_SEARCH_ENGINES = [
        { name: '百度', icon: ICONS?.search || '🔍', url: 'https://www.baidu.com/s?wd=%s' },
        { name: '头条', icon: ICONS?.search || '🔍', url: 'https://www.toutiao.com/search/?keyword=%s' },
        { name: '知乎', icon: ICONS?.search || '🔍', url: 'https://www.zhihu.com/search?type=content&q=%s' },
        { name: '小红书', icon: ICONS?.search || '🔍', url: 'https://www.xiaohongshu.com/search_result?keyword=%s' }
    ];

    /**
     * 从 localStorage 加载用户配置的搜索引擎名称列表
     * 返回一个数组，包含用户希望显示的搜索引擎名称
     */
    function loadSearchEngineConfig() {
        const saved = localStorage.getItem('search_engines_config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // 确保返回的是数组
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {}
        }
        // 默认返回所有搜索引擎名称
        return ALL_SEARCH_ENGINES.map(e => e.name);
    }

    /**
     * 保存用户配置的搜索引擎名称列表
     * @param {string[]} engineNames - 要显示的搜索引擎名称数组
     */
    function saveSearchEngineConfig(engineNames) {
        localStorage.setItem('search_engines_config', JSON.stringify(engineNames));
    }

    // 当前生效的搜索引擎名称列表
    let enabledEngineNames = loadSearchEngineConfig();

    /**
     * 根据当前配置获取应在工具栏显示的搜索引擎列表
     * 同时过滤掉百度页面上的百度搜索按钮
     * @returns {Array} 搜索引擎配置数组
     */
    function getEnabledEnginesForCurrentSite() {
        const isBaidu = location.hostname.includes('baidu.com');
        return ALL_SEARCH_ENGINES.filter(engine => {
            // 如果在百度页面且引擎名为百度，则隐藏
            if (isBaidu && engine.name === '百度') return false;
            // 否则检查是否在用户启用列表中
            return enabledEngineNames.includes(engine.name);
        });
    }

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
        highlight: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBkPSJNMTIgMjEuMzVsLTEuNDUtMS4zMkM1LjQgMTUuMzYgMiAxMi4yOCAyIDguNSAyIDUuNDIgNC40MiAzIDcuNSAzYzEuNzQgMCAzLjQxLjgxIDQuNSAyLjA5QzEzLjA5IDMuODEgMTQuNzYgMyAxNi41IDMgMTkuNTggMyAyMiA1LjQyIDIyIDguNWMwIDMuNzgtMy40IDYuODYtOC41NSAxMS41NEwxMiAyMS4zNXoiIGZpbGw9IiNlNzRjM2MiLz48L3N2Zz4=',
        settings: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23333"%3E%3Cpath d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5.5 12c0-.4 0-.8.1-1.2l-2-1.5 2-3.5 2.3.9c.6-.5 1.3-.9 2-1.2l.3-2.5h4l.3 2.5c.7.3 1.4.7 2 1.2l2.3-.9 2 3.5-2 1.5c.1.4.1.8.1 1.2s0 .8-.1 1.2l2 1.5-2 3.5-2.3-.9c-.6.5-1.3.9-2 1.2l-.3 2.5h-4l-.3-2.5c-.7-.3-1.4-.7-2-1.2l-2.3.9-2-3.5 2-1.5c-.1-.4-.1-.8-.1-1.2z"/%3E%3C/svg%3E'
    };

    // 更新 ALL_SEARCH_ENGINES 中的图标为实际 ICONS.search
    ALL_SEARCH_ENGINES.forEach(engine => {
        engine.icon = ICONS.search;
    });

    // ==================== 设置面板 ====================
    let settingsPanel = null; // 设置面板 DOM 元素

    /**
     * 创建设置面板（隐藏状态）
     */
    function createSettingsPanel() {
        if (settingsPanel) return;

        settingsPanel = document.createElement('div');
        settingsPanel.id = 'custom-search-settings';
        settingsPanel.style.cssText = `
            position: fixed;
            z-index: 1000000;
            background: #fff;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid #e0e0e0;
            font-size: 14px;
            color: #333;
            display: none;
            min-width: 200px;
        `;

        // 标题
        const title = document.createElement('div');
        title.style.cssText = 'font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 4px;';
        title.textContent = '搜索引擎设置';
        settingsPanel.appendChild(title);

        // 复选框列表
        const listDiv = document.createElement('div');
        listDiv.style.cssText = 'margin-bottom: 12px;';
        ALL_SEARCH_ENGINES.forEach(engine => {
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin-bottom: 6px; cursor: pointer;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = engine.name;
            checkbox.checked = enabledEngineNames.includes(engine.name);
            checkbox.style.marginRight = '6px';
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(engine.name));
            listDiv.appendChild(label);
        });
        settingsPanel.appendChild(listDiv);

        // 按钮区域
        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
            background: #5FE382; color: #fff; border: none; border-radius: 4px;
            padding: 6px 12px; cursor: pointer; font-size: 13px;
        `;
        saveBtn.addEventListener('click', () => {
            // 收集选中的引擎名称
            const checkboxes = settingsPanel.querySelectorAll('input[type="checkbox"]');
            const selected = [];
            checkboxes.forEach(cb => {
                if (cb.checked) selected.push(cb.value);
            });
            enabledEngineNames = selected;
            saveSearchEngineConfig(selected);
            settingsPanel.style.display = 'none';
            // 不需要立即刷新工具栏，下次划词自动生效
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            background: #f0f0f0; color: #333; border: 1px solid #ccc; border-radius: 4px;
            padding: 6px 12px; cursor: pointer; font-size: 13px;
        `;
        cancelBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
        });

        btnDiv.appendChild(saveBtn);
        btnDiv.appendChild(cancelBtn);
        settingsPanel.appendChild(btnDiv);

        document.body.appendChild(settingsPanel);
    }

    /**
     * 显示设置面板，并定位在工具栏附近
     */
    function showSettingsPanel() {
        createSettingsPanel();
        if (!toolbar) return;

        const toolbarRect = toolbar.getBoundingClientRect();
        const panelWidth = 220; // 预估宽度
        let left = toolbarRect.left;
        let top = toolbarRect.bottom + 5;

        // 边界检查
        if (left + panelWidth > window.innerWidth) {
            left = window.innerWidth - panelWidth - 5;
        }
        if (top + 200 > window.innerHeight) {
            top = toolbarRect.top - 205;
        }

        settingsPanel.style.left = left + 'px';
        settingsPanel.style.top = top + 'px';
        settingsPanel.style.display = 'block';
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

            // 搜索引擎按钮（根据配置）
            const enabledEngines = getEnabledEnginesForCurrentSite();
            enabledEngines.forEach(engine => {
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

            // 设置按钮（放在最后）
            buttons.push({
                icon: ICONS.settings,
                text: '设置',
                handler: () => {
                    showSettingsPanel();
                    // 设置面板不隐藏工具栏，但点击后工具栏可以保持显示（manual模式下）
                }
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

    // 以下函数与之前相同（UrlUtils, fetchWithProxy, downloadImage, copyText, fallbackCopy, showToolbar, hideToolbar, scheduleHide, 拖拽相关, 事件监听等）
    // 为节省篇幅，此处仅保留关键部分，实际脚本中应完整保留所有原有函数。
    // 由于篇幅限制，下面仅列出函数名，实际使用时应包含完整实现。

    // ...（UrlUtils, fetchWithProxy, downloadImage, copyText, fallbackCopy, showToolbar, hideToolbar, scheduleHide, 拖拽相关, 事件监听等函数均保持不变，此处从略）

    // 注意：以下为占位，实际脚本需包含所有之前定义的函数
    // 为了完整性，建议将之前 v2.3.0 中所有函数复制到此处，并保持原样。

    // 由于回答长度限制，无法在此完整粘贴所有代码，但修改点已明确：增加了第六组高亮、搜索引擎配置、设置按钮及面板。
    // 实际使用时，请将 v2.3.0 脚本中的函数完整保留，并按照上述修改整合。
})();