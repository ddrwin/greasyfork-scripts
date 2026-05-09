// ==UserScript==
// @name         极简划词搜索
// @description  超小尺寸悬浮窗，支持划词搜索、复制、打开链接；拖拽链接/图片保存；预定义五组高亮样式（科普/硬件/人工智能/华为/苹果微软特斯拉），动态添加关键词增量高亮，无闪烁；极致性能优化
// @icon         https://www.baidu.com/favicon.ico
// @namespace    http://tampermonkey.net/
// @version      2.2.1
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
// @downloadURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.user.js
// @updateURL https://update.greasyfork.org/scripts/566626/%E6%9E%81%E7%AE%80%E5%88%92%E8%AF%8D%E5%B7%A5%E5%85%B7%E6%A0%8F.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 可配置常量 ====================
    const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';
    const OPEN_WINDOW_AS_FALLBACK = false;
    const TOOLBAR_HIDE_MODE = 'auto'; // 'auto' 或 'manual'
    const HIDE_DELAY = 1000; // 自动隐藏延迟（毫秒）

    // ==================== 高亮分组（用户提供）====================
    const HIGHLIGHT_GROUPS = [
        {
            name: "科普",
            keywords: ["北京", "阿里", "百度", "腾讯", "奔驰", "新一代", "中国", "美国", "女性", "太空", "NASA", "月球", "火星", "飞船", "火箭", "探测器", "宇宙", "暗黑", "科学"],
            style: "background-color:#DE0422; color:#FFFFFF; font-weight:bold;"
        },
        {
            name: "硬件",
            keywords: ["nApoleon", "ITX", "RTX", "DLSS", "Arrow", "Lake", "英特尔", "新一代", "Ultra", "Intel", "137", "国补", "265"],
            style: "background-color:#FFFFCC; color:#FF0000; font-weight:bold;"
        },
        {
            name: "人工智能",
            keywords: ["NVIDIA", "大模型", "OpenAI", "AI", "ChatGPT", "GPT", "人工智能", "芯片", "机器人", "GPU", "deepseek", "通义千问", "文心一言"],
            style: "background-color:#FFFFCC; color:#00CC00; font-weight:bold;"
        },
        {
            name: "华为",
            keywords: ["5G", "华为", "HMS", "鸿蒙", "HUAWEI", "麒麟", "光刻机", "Mate", "HarmonyOS", "荣耀", "海思"],
            style: "background-color:#6633FF; color:#FFFFFF; font-weight:bold;"
        },
        {
            name: "苹果|微软|特斯拉",
            keywords: ["苹果", "iPhone", "iPad", "ios", "iOS", "微软", "电动车", "特斯拉", "马斯克"],
            style: "background-color:#008373; color:#FFFFFF; font-weight:bold;"
        }
    ];

    // ==================== 高亮管理 ====================
    let highlights = [];          // 存储 { keyword, styleIndex }
    let nextStyleIndex = 0;       // 下一个可用的颜色索引（动态添加时使用）
    let highlightTimer = null;     // 用于异步分批处理

    /**
     * 转义正则表达式特殊字符
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 判断一个节点是否已经被高亮包裹（或其祖先有高亮）
     */
    function isNodeHighlighted(node) {
        return node.parentElement?.closest('.search-highlight') !== null;
    }

    /**
     * 异步增量应用所有高亮关键词，只处理未被高亮的文本节点，已有高亮保持不变
     */
    function applyHighlightsAsync() {
        if (highlightTimer) {
            clearTimeout(highlightTimer);
            highlightTimer = null;
        }

        if (highlights.length === 0) return;

        // 收集所有未被高亮的文本节点
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 跳过脚本、样式、输入框等标签内的文本
                    if (node.parentElement && ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(node.parentElement.tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // 跳过已经被高亮包裹的节点（避免重复处理）
                    if (isNodeHighlighted(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        // 构建同时匹配所有关键词的正则表达式（忽略大小写）
        const escapedKeywords = highlights.map(h => escapeRegExp(h.keyword));
        const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');

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
                    matches.push({
                        index: match.index,
                        keyword: match[0],
                        length: match[0].length
                    });
                }
                if (matches.length === 0) continue;

                // 按匹配位置构建文档片段
                const fragment = document.createDocumentFragment();
                let lastPos = 0;
                for (const m of matches) {
                    const highlight = highlights.find(h => h.keyword.toLowerCase() === m.keyword.toLowerCase());
                    if (!highlight) continue;
                    const styleIndex = highlight.styleIndex;
                    // 从 HIGHLIGHT_GROUPS 获取样式，如果 styleIndex 超出范围则使用第一个组样式
                    const style = HIGHLIGHT_GROUPS[styleIndex % HIGHLIGHT_GROUPS.length]?.style || HIGHLIGHT_GROUPS[0].style;

                    if (m.index > lastPos) {
                        fragment.appendChild(document.createTextNode(text.substring(lastPos, m.index)));
                    }
                    const span = document.createElement('span');
                    span.className = 'search-highlight';
                    span.style.cssText = style; // 直接应用组的 CSS 文本
                    span.textContent = m.keyword;
                    fragment.appendChild(span);
                    lastPos = m.index + m.length;
                }
                if (lastPos < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(lastPos)));
                }
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

    /**
     * 初始化预定义关键词高亮
     */
    function initPredefinedHighlights() {
        HIGHLIGHT_GROUPS.forEach((group, groupIndex) => {
            group.keywords.forEach(keyword => {
                // 去重：如果已存在相同关键词，则移除旧的（以后添加的组优先）
                const existingIndex = highlights.findIndex(h => h.keyword === keyword);
                if (existingIndex !== -1) {
                    highlights.splice(existingIndex, 1);
                }
                highlights.push({ keyword, styleIndex: groupIndex });
            });
        });
        // 注意：预定义关键词不占用动态添加的样式索引，动态添加的从0开始循环
    }

    /**
     * 添加新的高亮关键词（动态添加）
     * @param {string} keyword - 要高亮的关键词
     */
    function addDynamicHighlight(keyword) {
        if (!keyword) return;
        // 去重：如果已存在相同关键词，则将其移动到末尾（保留原样式？这里我们选择保留原样式，不改变）
        const existingIndex = highlights.findIndex(h => h.keyword === keyword);
        if (existingIndex !== -1) {
            // 已存在，则将其移动到末尾（表示最近使用）
            const existing = highlights.splice(existingIndex, 1)[0];
            highlights.push(existing);
        } else {
            // 新关键词，使用下一个动态样式索引（循环五组）
            highlights.push({ keyword, styleIndex: nextStyleIndex % HIGHLIGHT_GROUPS.length });
            nextStyleIndex++;
        }
        applyHighlightsAsync();
    }

    // 初始化预定义高亮
    initPredefinedHighlights();

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

    // ==================== 图标 base64 编码 ====================
    const ICONS = {
        copy: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjU1Nzc5ODc4NDY4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0MTciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj5AZm9udC1mYWNlIHsgZm9udC1mYW1pbHk6IGZlZWRiYWNrLWljb25mb250OyBzcmM6IHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUud29mZjI/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmMiIpLCB1cmwoIi8vYXQuYWxpY2RuLmNvbS90L2ZvbnRfMTAzMTE1OF91Njl3OHloeGR1LndvZmY/dD0xNjMwMDMzNzU5OTQ0IikgZm9ybWF0KCJ3b2ZmIiksIHVybCgiLy9hdC5hbGljZG4uY29tL3QvZm9udF8xMDMxMTU4X3U2OXc4eWh4ZHUudHRmP3Q9MTYzMDAzMzc1OTk0NCIpIGZvcm1hdCgidHJ1ZXR5cGUiKTsgfQ0KPC9zdHlsZT48L2RlZnM+PHBhdGggZD0iTTM3NyA0MzJoMzQ5YTggOCAwIDAgMSA4IDh2NDhhOCA4IDAgMCAxLTggOEgzNzdhOCA4IDAgMCAxLTgtOHYtNDhhOCA4IDAgMCAxIDgtOHogbTAgMTYwaDI1OGE4IDggMCAwIDEgOCA4djQ4YTggOCAwIDAgMS04IDhIMzc3YTggOCAwIDAgMS04LTh2LTQ4YTggOCAwIDAgMSA4LTh6IG0tNjUtMjgwdjU3Nmg0ODBWMzEySDMxMnogbS00MC03Mmg1NjBjMTcuNjczIDAgMzIgMTQuMzI3IDMyIDMydjY1NmMwIDE3LjY3My0xNC4zMjcgMzItMzIgMzJIMjcyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJWMjcyYzAtMTcuNjczIDE0LjMyNy0zMiAzMi0zMnogbS04OC01NnY2NjRhOCA4IDAgMCAxLTggOGgtNTZhOCA4IDAgMCAxLTgtOFYxNDRjMC0xNy42NzMgMTQuMzI3LTMyIDMyLTMyaDYzMmE4IDggMCAwIDEgOCA4djU2YTggOCAwIDAgMS04IDhIMTg0eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iMTQxOCI+PC9wYXRoPjwvc3ZnPg==',
        search: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTY3NDk1OTczIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIwNzciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNNDQ2LjExMjMyMyAxNzcuNTQ1MDUxYzEzNy41Njc2NzcgMC4yMTk3OTggMjUyLjYxMjUyNSAxMDQuNTk3OTggMjY2LjE2MjQyNCAyNDEuNDkzMzMzIDEzLjU2MjgyOCAxMzYuODk1MzU0LTc4Ljc3ODE4MiAyNjEuODE4MTgyLTIxMy42MTc3NzcgMjg5LjAwODQ4NS0xMzQuODUyNTI1IDI3LjIwMzIzMi0yNjguMzg2MjYzLTUyLjE1Njc2OC0zMDguOTQ1NDU1LTE4My42MDg4ODlzMjUuMDE4MTgyLTI3Mi4yNTIxMjEgMTUxLjczODE4Mi0zMjUuNzc5Mzk0QTI2Ny4yMzU1NTYgMjY3LjIzNTU1NiAwIDAgMSA0NDYuMTEyMzIzIDE3Ny41NDUwNTFtMC02Mi4wNjA2MDdjLTE4Mi43OTQzNDMgMC0zMzAuOTg5ODk5IDE0OC4xOTU1NTYtMzMwLjk4OTg5OSAzMzAuOTg5ODk5czE0OC4xOTU1NTYgMzMwLjk4OTg5OSAzMzAuOTg5ODk5IDMzMC45ODk4OTkgMzMwLjk4OTg5OS0xNDguMTk1NTU2IDMzMC45ODk4OTktMzMwLjk4OTg5OS0xNDguMTk1NTU2LTMzMC45ODk4OTktMzMwLjk4OTg5OS0zMzAuOTg5ODk5eiBtNDMxLjMyMTIxMiA3OTMuMzQxNDE1YTMwLjg0OTI5MyAzMC44NDkyOTMgMCAwIDEtMjEuOTQxMDEtOS4xMDIyMjNsLTE1Ny4yMjAyMDItMTU3LjIyMDIwMmMtMTEuNzUyNzI3LTEyLjE3OTM5NC0xMS41ODQ2NDYtMzEuNTM0NTQ1IDAuMzc0OTUtNDMuNTA3MDcgMTEuOTcyNTI1LTExLjk3MjUyNSAzMS4zMjc2NzctMTIuMTQwNjA2IDQzLjQ5NDE0MS0wLjM3NDk1bDE1Ny4yMjAyMDIgMTU3LjIyMDIwMmEzMS4wMzY3NjggMzEuMDM2NzY4IDAgMCAxIDYuNzIzMjMyIDMzLjgxMDEwMSAzMS4wMDQ0NDQgMzEuMDA0NDQ0IDAgMCAxLTI4LjY1MTMxMyAxOS4xNzQxNDJ6IG0wIDAiIHAtaWQ9IjIwNzgiIGZpbGw9IiMzMzMzMzMiPjwvcGF0aD48L3N2Zz4=',
        openLink: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTgwNDU1NTcwIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9Ijk0MiIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNODMyIDEyOEg2NDB2NjRoMTQ2Ljc1Mkw1MjEuMzc2IDQ1Ny4zNzZsNDUuMjQ4IDQ1LjI0OEw4MzIgMjM3LjI0OFYzODRoNjRWMTI4eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQzIj48L3BhdGg+PHBhdGggZD0iTTc2OCA4MzJIMTkyVjI1NmgzNTJ2LTY0SDE2MGEzMiAzMiAwIDAgMC0zMiAzMnY2NDBhMzIgMzIgMCAwIDAgMzIgMzJoNjQwYTMyIDMyIDAgMCAwIDMyLTMzVjQ4MGgtNjR2MzUyeiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iOTQ0Ij48L3BhdGg+PC9zdmc+',
        save: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3E%3Cpath fill="%23333" d="M8 12L4 8h3V4h2v4h3l-4 4zM2 14h12v-2H2v2z"/%3E%3C/svg%3E',
        highlight: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3E%3Cpath fill="%23333" d="M12.5 2.5l1 1-8 8-2-1 1-2 8-8zm-8 9l-2-1 1 2 1-1z"/%3E%3C/svg%3E'
    };

    // ==================== 搜索引擎列表（可配置）====================
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

    // ==================== 工具模块：URL和元素判断 ====================
    const UrlUtils = {
        linkCache: new WeakMap(),

        isDomain(text) {
            if (!text || text.includes(' ')) return false;
            const urlRegex = /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
            if (urlRegex.test(text)) return true;
            const domainLikeRegex = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
            return domainLikeRegex.test(text) &&
                text.includes('.') &&
                text.split('.').pop().length >= 2;
        },

        makeUrl(domain) {
            return domain.startsWith('http') ? domain : 'https://' + domain;
        },

        isInsideEditable(el) {
            return el?.closest('input, textarea, [contenteditable="true"], [contenteditable=""]') !== null;
        },

        isLinkElement(el) {
            if (!el) return false;
            if (this.linkCache.has(el)) return this.linkCache.get(el);
            const a = el.closest('a[href]');
            const result = !!a;
            this.linkCache.set(el, result);
            return result;
        },

        getLinkUrl(el) {
            const a = el?.closest('a[href]');
            return a?.href ?? null;
        },

        isImageElement(el) {
            return el?.tagName === 'IMG';
        },

        getImageUrl(el) {
            return el?.tagName === 'IMG' ? el.src : null;
        }
    };

    // ==================== 代理请求封装 ====================
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
    async function downloadImage(url) {
        const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
        const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
        const timeStr = getFormattedDateTime();
        const newFileName = timeStr + ext;

        const headers = {
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': location.origin,
            'Origin': location.origin,
            'User-Agent': navigator.userAgent
        };

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
            if (OPEN_WINDOW_AS_FALLBACK) {
                window.open(url, '_blank');
            }
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
            btn?._handler?.();
        });
        toolbar.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
        toolbar.addEventListener('mouseleave', () => {
            if (TOOLBAR_HIDE_MODE === 'auto') {
                scheduleHide();
            }
        });
        document.body.appendChild(toolbar);
    }

    function buildToolbar(selectedText, mode = 'text') {
        if (!toolbar) initToolbar();
        toolbar.innerHTML = '';

        const fragment = document.createDocumentFragment();
        let buttons = [];

        if (mode === 'image') {
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
            // 高亮按钮
            buttons.push({
                icon: ICONS.highlight,
                text: '高亮',
                handler: () => {
                    const selection = window.getSelection();
                    const keyword = selection.toString().trim();
                    if (keyword) {
                        addDynamicHighlight(keyword);
                    }
                    if (TOOLBAR_HIDE_MODE === 'auto') {
                        hideToolbar();
                    }
                }
            });

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

    function showToolbar(x, y, selectedText, mode = 'text') {
        if (hideTimeout) clearTimeout(hideTimeout);
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

    function hideToolbar() {
        if (toolbar) toolbar.style.display = 'none';
    }

    function scheduleHide() {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hideToolbar, HIDE_DELAY);
    }

    // ==================== 拖拽相关 ====================
    const DRAG_THRESHOLD = 5;
    let dragStartX = 0, dragStartY = 0;
    let dragListening = false;
    let dragTriggered = false;
    let dragMode = null;
    let dragUrl = null;
    let rafId = null;

    function startDragListening(e) {
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
            const dist = Math.sqrt(dx * dx + dy * dy);
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

    // ==================== 事件监听统一管理 ====================
    function initEventListeners() {
        document.addEventListener('mousedown', startDragListening, { passive: true });
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousedown', onDocumentMouseDown, { passive: true });
        window.addEventListener('scroll', hideToolbar, { passive: true });
        document.addEventListener('selectionchange', onSelectionChange);
    }

    function onMouseUp(e) {
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

        if (toolbar?.contains(e.target)) return;
        if (UrlUtils.isInsideEditable(e.target)) {
            hideToolbar();
            return;
        }

        showToolbar(e.clientX, e.clientY, text, 'text');
    }

    function onDocumentMouseDown(e) {
        if (toolbar && !toolbar.contains(e.target)) hideToolbar();
    }

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