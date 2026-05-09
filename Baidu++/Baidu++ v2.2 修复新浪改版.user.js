// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、抖音、小红书、Google、Bing搜索，为Google/Bing添加百度/Google/Bing辅助搜索框
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google、Bing搜索按钮，一键跳转到Google/Bing；在Google搜索结果页添加百度/Bing搜索框；在Bing搜索结果页添加百度/Google搜索框。支持各个搜索引擎自动翻页，去除百度结果页面的广告和右边栏。虎嗅网模块增强：当URL带有#q=关键词时，优先点击完全匹配的历史关键词；若不匹配或无历史，则自动填入关键词并搜索。新增新浪搜索自动翻页功能。优化版：统一分隔符样式，减少冗余操作，提升执行效率。修复Bing翻页分隔符问题，统一翻页触发距离为2000px。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.2
// @author       ddrwin
// @run-at       document-end
// @match        *://*.baidu.com/*
// @match        *://baidu.com/*
// @match        *://*.google.*/*
// @match        *://*.bing.*/*
// @match        *://so.mydrivers.com/default.htm*
// @match        *://*.mydrivers.com/*
// @match        *://*.huxiu.com/*
// @match        *://search.sina.com.cn/*
// @match        *://so.toutiao.com/*
// @match        *://news.sina.com.cn/*
// @exclude      *://*.google.*/maps/*
// @exclude      *://*.google.*/images/*
// @exclude      *://*.google.*/videos/*
// @exclude      *://*.bing.*/images/*
// @exclude      *://*.bing.*/videos/*
// @exclude      *://*.bing.*/maps/*
// @exclude      *://*.baidu.com/homepage/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @connect      search.sina.com.cn
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @note         2020.02.22 V1.0 基础版本：在百度搜索结果页加入磁力、种子、网盘、Google 搜索按钮
// @note         2020.02.23 V1.1 跨引擎支持：在 Google 搜索结果页加入百度搜索按钮
// @note         2020.02.25 V1.2 搜索维度扩展：增加软件搜索、头条搜索、哔哩哔哩搜索入口
// @note         2020.02.26 V1.3 功能整合：重写代码，将种子/磁力搜索集成到网盘搜索，软件搜索增加多个网址
// @note         2020.02.27 V1.4 分类优化：头条/B站集成到头条搜索，知乎/CSDN集成到问答搜索
// @note         2020.05.30 V1.5 资源更新：网盘搜索新增结果，软件搜索增加大眼仔/微当等，问答搜索增加微信搜索/百度知道
// @note         2021.03.04 V1.6 链接维护：网盘搜索更新，软件搜索去除失效链接，问答搜索增加今日头条
// @note         2022.01.23 V1.7 功能合并：合并软件/破解搜索，问答搜索增加B站/驱动之家，新增行研搜索
// @note         2022.03.03 V1.8 内容迭代：更新网盘搜索，问答搜索增加IT之家，去除失效入口
// @note         2024.01.29 V1.9 AI能力增强：更新软件搜索，AI问答增加文心一言/讯飞星火/天工
// @note         2025.11.30 V1.9.5 稳定性优化：修复关键词获取问题，确保所有按钮正确传递搜索词
// @note         2026.02.19 V1.9.9 多引擎升级：新增Bing搜索支持（百度页Bing按钮、Google/Bing页内联搜索框），卡片美化样式，精准间距控制
// @note         2026.02.21 V2.0 全量核心更新：1. 稳定性：新增强制刷新机制（点击翻页/更多/搜索触发），优化异步刷新后按钮稳定性，修复首页跳转脚本未运行问题；2. 翻页能力：整合自动翻页功能，适配新旧版Google/Bing/百度页面，融合东方永页机精准选择器，解决古老页面翻页问题；3. 体验优化：完善快科技搜索中转，修复层级遮挡，模块化重构代码，优化Google搜索框插入位置；4. 域名适配：统一Google/Bing国家域名匹配规则，排除非搜索页面；5. 细节修复：增加百度首页搜索框下拉词监听，修复语法错误，增强翻页选择器兼容性
// @note         2026.02.23 V2.0.3.4 虎嗅增强：当URL带有#q=关键词时，自动点击搜索按钮，并在搜索历史中点击第一个匹配的关键词。
// @note         2026.02.24 V2.0.3.5 虎嗅增强：采用“虎嗅网自动点击搜索按钮并选择首个搜索历史（db版）”的重试机制，确保搜索面板可靠打开。
// @note         2026.02.24 V2.0.3.6 虎嗅增强：若历史关键词不匹配或无历史，则自动填入关键词并执行搜索，确保新词被注入历史。
// @note         2026.02.25 V2.0.3.7 虎嗅增强：将匹配条件改为严格相等，避免部分匹配导致误点击；优化代码结构；重试次数增加至5次，进一步提高成功率。
// @note         2026.02.25 V2.0.4.0 新增驱动之家翻页模块：整合原“驱动之家(mydrivers.com) 终极自动翻页”脚本，为所有 mydrivers.com 页面添加滚动自动翻页，置于快科技中转模块之后。
// @note         2026.02.25 V2.0.5 优化驱动之家翻页模块，增强选择器兼容性，修复部分页面内容提取失败的问题。
// @note         2026.02.26 V2.0.5.2 新增新浪搜索自动翻页功能（基于0.6版重构），支持POST分页，滚动加载下一页。
// @note         2026.02.26 V2.0.5.3 新浪搜索增强：为新浪搜索结果页添加百度风格的卡片美化样式
// @note         2026.02.26 V2.0.5.4 新浪搜索增强：隐藏右侧广告(.sRight)和“我要反馈”悬浮块(#scrollDiv)
// @note         2026.02.26 V2.0.6 代码重构：合并重复工具函数至 MyApi，统一请求处理；修复驱动之家翻页模块 CSS 选择器前缀问题（添加 "css;"），确保兼容性；增强虎嗅模块：增加后备 hash 获取方式，提高在部分浏览器中的健壮性。
// @note         2026.02.26 V2.0.7 虎嗅模块进一步优化：增加防重复执行标志，完善关键词获取逻辑，增强异常捕获，防止页面白板。
// @note         2026.02.27 V2.0.8 优化版：统一翻页分隔符样式，移除头条模块冗余JS隐藏，合并干扰容器清理循环，提升执行效率。
// @note         2026.02.28 V2.0.9 修复Bing翻页分隔符问题，统一翻页触发距离为2000px（可自行调整），提升使用体感。
// @note         2026.03.01 V2.1.0 结构优化：将所有样式集中管理，百度样式分离避免污染；延长翻页轮询间隔至5秒，降低CPU占用；统一使用 MyApi 工具函数，精简代码；为各模块补充详细注释。完善头条模块的干扰过滤（包含头部搜索框），增加定时检查下一页链接，优化滚动监听。
// @note         2026.04.10 V2.2.0 新浪搜索适配改版：新浪搜索全面升级为 Vue SPA，关键词改为 ?q= URL 参数，结果条目改用 .result-item，分页改为 Ant Design 点击式翻页，侧边栏改为 .sidebar。脚本相应重写：关键词从 URL 参数提取，自动翻页改为点击 Ant Pagination 下一页按钮并用 MutationObserver 监听新条目插入，新增 .result-item 卡片美化样式，隐藏新版 .sidebar 和 .pagination。


// ==/UserScript==

(function() {
    'use strict';
    const hostname = location.hostname;

    // ========== 百度搜索结果页间距调整参数（按需修改） ==========
    const PAGE_TOP = 40;               // 页面整体与顶部距离（防止按钮被搜索框遮挡）
    const NAV_MARGIN_TOP = 0;           // 导航栏额外下移距离
    const TOOL_MARGIN_TOP = 0;           // 工具栏与导航栏距离
    const CONTENT_MARGIN_TOP = 10;       // 搜索结果与工具栏距离
    const MIN_REFRESH_INTERVAL = 1000;   // 最小刷新间隔（防止频繁刷新）

    // ========== 全局翻页触发距离（像素，距离底部多远开始加载下一页） ==========
    const PAGE_TRIGGER_DISTANCE = 2000;  // 可根据个人喜好调整，越大越早触发

    // ===================== 1. 全局样式 =====================
    GM_addStyle(`
        /* 翻页分隔符统一样式 */
        .autopagerize_page_info {
            margin: 25px 0 !important;
            padding: 10px !important;
            border-top: 1px solid #e8e8e8 !important;
            border-bottom: 1px solid #e8e8e8 !important;
            color: #999 !important;
            text-align: center !important;
            width: 100% !important;
            clear: both !important;
            font-size: 14px !important;
        }
        /* 新浪兼容：仅文字，无边框 */
        .sina-pager-separator {
            border: none !important;
            background: transparent !important;
            /* 新浪搜索翻页符左移10px（可自行调整） */
            margin-left: -18px !important;
        }
        /* 驱动之家翻页分隔符专用样式（仅文字） */
        .mydrivers-pager-separator {
            border: none !important;
            background: transparent !important;
            margin: 15px 0 !important;
            color: #666 !important;
        }

        /* 新浪搜索专用样式（旧版兼容，隐藏旧版翻页/侧边栏） */
        .pagebox, #_function_code_page, .search-form-bot {
            display: none !important;
        }
        .sRight, #scrollDiv {
            display: none !important;
        }

        /* 新浪搜索新版（Vue SPA）专用样式 */
        /* 隐藏新版侧边栏和分页控件 */
        .sidebar, .pagination {
            display: none !important;
        }
        /* 结果卡片美化 */
        .result-item {
            background: #DEF1EF !important;
            border: 1px solid #B8D9B5 !important;
            border-radius: 2px !important;
            box-shadow: 0 1px 4px 0 rgba(0,0,0,0.14) !important;
            margin-bottom: 16px !important;
            padding: 20px 25px !important;
            transition: all 0.3s ease !important;
        }
        .result-item:hover {
            box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
            border-color: #3D7CD4 !important;
            transform: translateY(-2px) !important;
            background: #d4edea !important;
        }
        .result-item .result-title a {
            font-size: 18px !important;
            font-weight: 600 !important;
            line-height: 1.4 !important;
            color: #3476d2 !important;
            text-decoration: none !important;
        }
        .result-item .result-title a:hover {
            color: #7CA5E0 !important;
            text-decoration: underline !important;
        }
        .result-item .result-intro {
            color: #2c3e50 !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            margin: 6px 0 8px 0 !important;
        }
        .result-item .result-meta {
            color: #4CAF50 !important;
            font-size: 13px !important;
            margin-top: 6px !important;
            border-top: 1px dashed #B8D9B5 !important;
            padding-top: 8px !important;
        }
        .result-item .result-meta .source {
            font-weight: 600 !important;
            margin-right: 8px !important;
        }

        /* 旧版 #result 兼容保留 */
        div#result {
            width: 100% !important;
            max-width: 800px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            float: none !important;
            padding: 0 !important;
        }
        #result .box-result {
            background: #DEF1EF !important;
            border: 1px solid #B8D9B5 !important;
            border-radius: 2px !important;
            box-shadow: 0 1px 4px 0 rgba(0,0,0,0.14) !important;
            margin-bottom: 16px !important;
            padding: 20px 25px !important;
            transition: all 0.3s ease !important;
            clear: both;
            overflow: hidden;
        }
        #result .box-result:hover {
            box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
            border-color: #3D7CD4 !important;
            transform: translateY(-2px) !important;
            background: #d4edea !important;
        }
        #result .box-result h2,
        #result .box-result h2 a {
            background: transparent !important;
            margin: 0 0 8px 0 !important;
            padding: 0 !important;
            border: none !important;
            font-size: 18px !important;
            font-weight: 600 !important;
            line-height: 1.4 !important;
            color: #3476d2 !important;
            text-decoration: none !important;
        }
        #result .box-result h2 a:hover {
            color: #7CA5E0 !important;
            text-decoration: underline !important;
        }
        #result .box-result .content {
            color: #2c3e50 !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            margin: 4px 0 8px 0 !important;
        }
        #result .box-result .fgray_time,
        #result .box-result .r-info h2 span {
            color: #4CAF50 !important;
            font-size: 13px !important;
            margin-top: 4px !important;
            border-top: 1px dashed #B8D9B5 !important;
            padding-top: 8px !important;
            display: block;
        }
        #result .box-result .r-img {
            float: left;
            margin-right: 15px;
            margin-bottom: 10px;
        }
        #result .box-result .r-img img {
            border-radius: 2px;
            max-width: 120px;
        }
        #result .box-result .r-info2 {
            margin-left: 0 !important;
        }
        #result .box-result .r-img a:last-child img.video {
            position: relative;
            top: -30px;
            left: 30px;
            border: none;
        }
        #result .l_v2 {
            background: #f0f7f0;
            padding: 8px 15px;
            margin-bottom: 16px;
            border-left: 4px solid #B8D9B5;
            font-size: 14px;
            color: #2c3e50;
        }

        /* Google/Bing辅助搜索框样式（旧版） */
        .google-baidu-search-container {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-left: auto !important;
            vertical-align: middle !important;
            height: 34px !important;
            flex-wrap: nowrap !important;
        }
        .google-baidu-search-container input {
            width: 200px !important;
            height: 32px !important;
            padding: 0 8px !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            outline: none !important;
            box-sizing: border-box !important;
            flex-shrink: 0 !important;
        }
        .google-baidu-search-container button {
            height: 34px !important;
            padding: 0 10px !important;
            border: none !important;
            border-radius: 4px !important;
            color: white !important;
            font-size: 14px !important;
            cursor: pointer !important;
            transition: background 0.2s !important;
            box-sizing: border-box !important;
            flex-shrink: 0 !important;
            line-height: 34px !important;
        }
        .google-baidu-search-container .baidu-btn {
            background: #3385ff !important;
        }
        .google-baidu-search-container .baidu-btn:hover {
            background: #317ef3 !important;
        }
        .google-baidu-search-container .bing-btn {
            background: #008373 !important;
        }
        .google-baidu-search-container .bing-btn:hover {
            background: #006b5f !important;
        }

        .bing-search-helper {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-left: 12px;
            vertical-align: middle;
            height: 34px;
        }
        .bing-search-helper input {
            width: 200px;
            height: 32px;
            padding: 0 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            outline: none;
            box-sizing: border-box;
        }
        .bing-search-helper input:focus {
            border-color: #3385ff;
        }
        .bing-search-helper button {
            height: 34px;
            padding: 0 10px;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
            box-sizing: border-box;
        }
        .bing-search-helper .baidu-btn {
            background: #3385ff;
        }
        .bing-search-helper .baidu-btn:hover {
            background: #317ef3;
        }
        .bing-search-helper .google-btn {
            background: #CC3333;
        }
        .bing-search-helper .google-btn:hover {
            background: #CC0033;
        }
        .b_scopebar .bing-search-helper {
            margin-top: 4px;
            margin-left: 8px;
        }

        /* 虎嗅网滚动锁定 */
        .huxiu-panel-open,
        .huxiu-panel-open body {
            overflow: hidden !important;
        }
        .search-result {
            max-height: 70vh !important;
            overflow-y: auto !important;
        }

        /* Bing知识面板对齐（右移160px，可自行调整） */
        .b_poleContent .utilAns .wptabs_cont {
            margin-left: 160px !important;
        }

        /* 头条搜索：隐藏右侧热榜（与最终版一致） */
        .s-side-list { display: none !important; }
        /* 隐藏原生翻页条（最终版隐藏） */
        .cs-pagination { display: none !important; }
    `);

    // ===================== 2. 百度专属样式（恢复为旧版 v2.0.9） =====================
    const injectBaiduStyles = () => {
        GM_addStyle(`
            #content_right { display: none !important; }
            .options_2Vntk { margin-top: 0px !important; }
            .tag-scroll_3EMBO { margin-top: 0px !important; padding-bottom: 0px !important; }
            ._content-border_1q9is_4 { background-color: transparent !important; }
            #head {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                z-index: 999999 !important;
                background: #fff !important;
            }
            body {
                padding-top: ${PAGE_TOP}px !important;
            }
            #s_tab,
            #content_left,
            .result-molecule[tpl="app/search-tool"] {
                overflow: visible !important;
            }
            #s_tab {
                z-index: 99999 !important;
            }
            #s_tab_inner {
                margin-top: ${NAV_MARGIN_TOP}px !important;
            }
            #content_left {
                margin-top: ${TOOL_MARGIN_TOP}px !important;
                z-index: 9999 !important;
            }
            .result-molecule[tpl="app/search-tool"] {
                margin-bottom: ${CONTENT_MARGIN_TOP}px !important;
                z-index: 1000 !important;
            }
            #tsn_inner {
                z-index: 1001 !important;
                background: #fff !important;
            }

            /* 卡片美化 */
            #content_left {
                width: 100% !important;
                max-width: 800px !important;
                margin-left: auto !important;
                margin-right: auto !important;
                float: none !important;
            }
            body[baidu] { background-color: #DEF1EF !important; }
            #content_left .result,
            #content_left .c-container,
            #content_left [class*="result"] {
                background: #DEF1EF !important;
                border: 1px solid #B8D9B5 !important;
                border-radius: 2px !important;
                box-shadow: 0 1px 4px 0 rgba(0,0,0,0.14) !important;
                margin-bottom: 16px !important;
                padding: 20px 25px !important;
                transition: all 0.3s ease !important;
            }
            #content_left .result:hover,
            #content_left .c-container:hover {
                box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
                border-color: #3D7CD4 !important;
                transform: scale(1.00) translateY(-2px) !important;
                background: #d4edea !important;
            }
            #content_left .result h3,
            #content_left .c-container h3,
            #content_left .result .t,
            #content_left .c-container .t {
                background: transparent !important;
                margin: 0 0 8px 0 !important;
                padding: 0 !important;
                border: none !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                line-height: 1.4 !important;
            }
            #content_left .result h3 a,
            #content_left .c-container h3 a {
                color: #3476d2 !important;
                text-decoration: none !important;
            }
            #content_left .result h3 a:hover {
                color: #7CA5E0 !important;
                text-decoration: underline !important;
            }
            #content_left .result .c-abstract,
            #content_left .c-container .c-abstract,
            #content_left .result [class*="summary"] {
                color: #2c3e50 !important;
                font-size: 14px !important;
                line-height: 1.6 !important;
                margin: 4px 0 8px 0 !important;
            }
            #content_left .result .c-showurl,
            #content_left .c-container .c-showurl,
            #content_left .result .source-container_3WKXu {
                color: #4CAF50 !important;
                font-size: 13px !important;
                margin-top: 4px !important;
                border-top: 1px dashed #B8D9B5 !important;
                padding-top: 8px !important;
            }
            #content_left .result .c-showurl a,
            #content_left .c-container .c-showurl a {
                color: #3476d2 !important;
                text-decoration: none !important;
            }
            #content_left .result .c-tools,
            #content_left .c-container .c-tools {
                margin-top: 8px !important;
                font-size: 13px !important;
            }
            #page a,
            #page strong {
                background: #fff !important;
                border-radius: 2px !important;
                border: none !important;
                color: #424242 !important;
                padding: 8px 12px !important;
                margin: 0 4px !important;
            }
            #page strong {
                background: #4285F4 !important;
                color: #fff !important;
            }
        `);
    };

    // ===================== 3. 全局工具函数（MyApi） =====================
    const MyApi = (() => {
        const safeFunc = (callback, catchCallback = () => {}) => {
            try { return callback(); } catch (e) { console.log('[MyApi] 执行异常:', e); return catchCallback(); }
        };

        const waitTime = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const debounce = (fn, wait) => {
            let timer = null;
            return function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), wait);
            };
        };

        const getAllElementsByXpath = (xpath, contextNode = document, doc = document) => {
            const result = [];
            try {
                const query = doc.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (let i = 0; i < query.snapshotLength; i++) {
                    const node = query.snapshotItem(i);
                    if (node.nodeType === 1) result.push(node);
                }
            } catch (err) { console.error('[MyApi] XPath解析失败:', xpath, err); }
            return result;
        };

        const getAllElements = (selector, contextNode = document, doc = document) => {
            if (!selector) return [];
            contextNode = contextNode || doc;
            if (typeof selector === 'string') {
                if (selector.startsWith('css;')) {
                    return Array.from(contextNode.querySelectorAll(selector.slice(4)));
                } else {
                    return getAllElementsByXpath(selector, contextNode, doc);
                }
            } else if (typeof selector === 'function') {
                const res = selector(doc);
                return Array.isArray(res) ? res : [];
            }
            return [];
        };

        const resolveUrl = (url) => {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            return new URL(url, location.href).href;
        };

        const http = {
            async get(url) {
                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        url, method: 'GET', timeout: 10000,
                        onload: resp => resolve([null, resp.responseText, resp.responseHeaders]),
                        onerror: resp => resolve([resp, '', {}]),
                        ontimeout: () => resolve([new Error('请求超时'), '', {}])
                    });
                });
            },
            async post(url, data) {
                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        url, method: 'POST', data: data.toString(),
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'User-Agent': navigator.userAgent,
                            'Referer': location.href,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                        },
                        timeout: 15000,
                        onload: resp => resolve([null, resp.responseText, resp.responseHeaders]),
                        onerror: err => resolve([err, '', {}]),
                        ontimeout: () => resolve([new Error('超时'), '', {}])
                    });
                });
            }
        };

        return { safeFunc, waitTime, debounce, getAllElementsByXpath, getAllElements, resolveUrl, http };
    })();

    // ===================== 4. 翻页配置（增强Bing兼容性） =====================
    class SitePagerConfig {
        constructor() {
            this.siteName = this._detectSite();
            this.pagerConfig = this._getFullPagerConfig();
        }

        _detectSite() {
            const host = location.host;
            const pathname = location.pathname;
            if (host.includes('baidu.com')) return pathname.includes('xueshu') ? 'baidu_xueshu' : 'baidu';
            if (host.includes('google.')) return pathname.includes('scholar') ? 'google_scholar' : 'google';
            if (host.includes('bing.')) return 'bing';
            return ''; // 无匹配则返回空字符串
        }

        _getFullPagerConfig() {
            const centerStyle = `
                .autopagerize_page_info {
                    margin: 15px 0 !important;
                    padding: 10px !important;
                    border-top: 1px solid #eee !important;
                    border-bottom: 1px solid #eee !important;
                    color: #666 !important;
                    text-align: center !important;
                    width: 100% !important;
                    clear: both !important;
                    font-size: 14px !important;
                }
                #content_left .autopagerize_page_info {
                    margin-left: -85px !important;
                }
                div.sp-separator {margin-bottom: 10px !important;}
                .c-img-border{display:none}
            `;

            const configs = {
                baidu: {
                    nextLink: [
                        "//div[@id='page']//a[contains(span/text(), '下一页')]",
                        "//*[@id='page']/div/a[span[contains(text(),'下')]]",
                        "//*[@id='page']/div/a[span[contains(text(),'上')]]"
                    ],
                    pageElement: [
                        "css;div#content_left > *",
                        "//*[@id=\"content_left\"]/*"
                    ],
                    HT_insert: ["css;div#content_left", 2],
                    replaceE: "css;#page",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 已加载第 ${pageNum} 页 ——`
                },
                baidu_xueshu: {
                    nextLink: '//div[@id="page"]//a[contains(span/text(), "下一页")]',
                    pageElement: "css;div#content_left .result",
                    HT_insert: ["css;div#content_left", 2],
                    replaceE: "css;#page",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 百度学术第 ${pageNum} 页 ——`
                },
                google: {
                    nextLink: [
                        "css;a[aria-label='下一页'], a[aria-label='Next page'], a#pnnext",
                        "id('pnnext')|id('navbar navcnt nav')//td[span]/following-sibling::td[1]/a|id('nn')/parent::a",
                        "id('main')[not(id('rso botstuff'))]/footer//a[@aria-label and contains(@href, 'start=') and contains(., '>')]",
                        "css;a.nBDE1b.G5eFlf[aria-label='下一页']"
                    ],
                    pageElement: [
                        "css;#rso > div:not([jscontroller='SC7lYd']):not([class*='nav'])",
                        "id('rso')|id('center_col')/style[contains(.,'relative')]",
                        "id('main')/div[not(@*)][.//a//h3 or .//a/accordion-entry-search-icon]"
                    ],
                    HT_insert: [
                        ["css;#rso", 2],
                        ["id('main')", 2]
                    ],
                    replaceE: '//table[@class="AaVjTc"]',
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Search Page ${pageNum} ——`,
                    afertPagerAutoCallFunc: () => {}
                },
                google_scholar: {
                    nextLink: '//a[./span[@class="gs_ico gs_ico_nav_next"]]',
                    pageElement: '//div[@class="gs_r gs_or gs_scl"]',
                    HT_insert: ["css;#gs_res_ccl_mid", 2],
                    replaceE: '//div[@id="navcnt"] | //div[@id="rcnt"]//div[@role="navigation"]',
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Scholar Page ${pageNum} ——`
                },
                // Bing 配置增强：增加基于文本的下一页选择器和更宽松的页面元素选择器
                bing: {
                    nextLink: [
                        "//a[@aria-label='下一页'] | //a[contains(@class,'sb_pagN')] | //a[.//span[contains(text(),'下一页')]]",
                        "css;a[title='Next page'], a.sb_pagN, a.sb_halfnext, a.sb_fullnpl, a[class*='pag']:has(span:contains('下一页'))"
                    ],
                    pageElement: [
                        "id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]",
                        "css;ol#b_results > li.b_algo",
                        "css;.b_results > .b_algo",
                        "//li[contains(@class, 'b_algo')]"
                    ],
                    HT_insert: [
                        ["css;ol#b_results", 2],
                        ["id(\"b_results\")/li[@class=\"b_pag\"]", 1]
                    ],
                    replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 必应搜索第 ${pageNum} 页 ——`,
                    filter: (elements, doc) => {
                        return Array.from(elements).filter(el => {
                            if (el.matches && (el.matches('div.b_rs.rsExplr, li.b_msg.b_canvas'))) return false;
                            if (el.querySelector && (el.querySelector('div.b_rs.rsExplr') || el.querySelector('li.b_msg.b_canvas'))) return false;
                            return true;
                        });
                    }
                }
            };
            return configs[this.siteName] || null;
        }
    }

    // ===================== 5. 通用翻页类 =====================
    class AutoPager {
        constructor() {
            this.config = new SitePagerConfig().pagerConfig;
            if (!this.config) return;
            this.isLoading = false;
            this.pageNum = 1;
            this.nextPageUrl = null;
            this._init();
        }

        async _init() {
            // 注入站点专用样式（如百度分隔符偏移）
            if (this.config.stylish) {
                const style = document.createElement('style');
                style.textContent = this.config.stylish;
                document.head.appendChild(style);
            }

            await MyApi.waitTime(this.config.siteName === 'google' ? 1200 : 800);
            this.updateNextPageUrl();
            this.bindScrollListener();
            // 仅当未找到下一页时启动周期性检查，减少轮询
            this._checkInterval = setInterval(() => {
                if (!this.nextPageUrl) this.updateNextPageUrl();
            }, 5000);
        }

        updateNextPageUrl(tempDoc = document) {
            let nextLinkNode = null;
            if (Array.isArray(this.config.nextLink)) {
                for (const sel of this.config.nextLink) {
                    const nodes = MyApi.getAllElements(sel, tempDoc, tempDoc);
                    if (nodes.length) { nextLinkNode = nodes[0]; break; }
                }
            } else {
                const nodes = MyApi.getAllElements(this.config.nextLink, tempDoc, tempDoc);
                if (nodes.length) nextLinkNode = nodes[0];
            }
            this.nextPageUrl = nextLinkNode ? MyApi.resolveUrl(nextLinkNode.href) : null;
        }

        bindScrollListener() {
            const scrollHandler = MyApi.debounce(async () => {
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                const clientHeight = document.documentElement.clientHeight || window.innerHeight;
                if (scrollTop + clientHeight >= scrollHeight - PAGE_TRIGGER_DISTANCE && !this.isLoading) {
                    await this.loadNextPage();
                }
            }, 500);
            window.addEventListener('scroll', scrollHandler);
            scrollHandler();
        }

        async loadNextPage() {
            if (!this.nextPageUrl) return;
            this.isLoading = true;
            try {
                const nextUrl = this.nextPageUrl;
                this.pageNum++;
                const [err, respText] = await MyApi.http.get(nextUrl);
                if (err || !respText) throw err || new Error('空响应');

                const tempDoc = new DOMParser().parseFromString(respText, 'text/html');
                let pageElements = [];
                if (Array.isArray(this.config.pageElement)) {
                    for (const sel of this.config.pageElement) {
                        const nodes = MyApi.getAllElements(sel, tempDoc, tempDoc);
                        if (nodes.length) { pageElements = nodes; break; }
                    }
                } else {
                    pageElements = MyApi.getAllElements(this.config.pageElement, tempDoc, tempDoc);
                }

                if (!pageElements.length) return;

                if (typeof this.config.filter === 'function') {
                    pageElements = this.config.filter(pageElements, tempDoc);
                }

                await this.insertPageContent(pageElements, tempDoc);
                this.updateNextPageUrl(tempDoc);
                this.replacePagerBar();
            } catch (e) {
                console.error('[AutoPager] 翻页异常:', e);
                this.pageNum--;
            } finally {
                this.isLoading = false;
            }
        }

        async insertPageContent(pageElements, tempDoc) {
            let insertSelector, insertPos;
            if (Array.isArray(this.config.HT_insert) && Array.isArray(this.config.HT_insert[0])) {
                for (const [sel, pos] of this.config.HT_insert) {
                    if (MyApi.getAllElements(sel)[0]) { insertSelector = sel; insertPos = pos; break; }
                }
            } else {
                [insertSelector, insertPos] = this.config.HT_insert || [];
            }
            if (!insertSelector || insertPos === undefined) return;

            let insertNode = MyApi.getAllElements(insertSelector)[0];
            if (!insertNode && this.config.siteName === 'google') {
                insertNode = MyApi.getAllElements('css;#center_col')[0] || MyApi.getAllElements('css;footer')[0];
            }
            if (!insertNode) return;

            const pageInfoDiv = document.createElement('div');
            pageInfoDiv.className = 'autopagerize_page_info';
            pageInfoDiv.textContent = this.config.pageInfoText(this.pageNum);
            insertPos === 1 ? insertNode.before(pageInfoDiv) : insertNode.append(pageInfoDiv);

            pageElements.forEach(el => {
                if (el.textContent.trim() === '') return;
                const newEl = document.importNode(el, true);
                insertPos === 1 ? insertNode.before(newEl) : insertNode.append(newEl);
            });

            if (this.config.afertPagerAutoCallFunc) {
                const scriptElements = MyApi.getAllElements('css;script', tempDoc, tempDoc);
                this.config.afertPagerAutoCallFunc(pageElements, scriptElements, insertNode);
            }
        }

        replacePagerBar() {
            if (!this.config.replaceE) return;
            MyApi.getAllElements(this.config.replaceE).forEach(node => {
                if (this.config.siteName === 'google') {
                    node.style.visibility = 'hidden';
                    node.style.height = '0';
                } else {
                    node.style.display = 'none';
                }
            });
        }
    }

    // ===================== 6. 百度页面模块 =====================
    const initBaiduPage = () => {
        // 注入百度专属样式（旧版）
        injectBaiduStyles();

        let lastRefreshTime = 0;
        const ensureFormPadding = () => {
            let form = document.querySelector('.s_form.s_form_fresh, .s_form');
            if (form) form.style.paddingBottom = '40px';
        };
        const scheduleRefresh = () => {
            if (Date.now() - lastRefreshTime < MIN_REFRESH_INTERVAL) return;
            lastRefreshTime = Date.now();
            setTimeout(() => { window.scrollTo(0,0); location.reload(); }, 50);
        };
        const hideAds = () => {
            $('.c-container').filter(function() { return $(this).find('.f13 span:contains("广告")').length > 0; }).hide();
        };

        ensureFormPadding();
        new MutationObserver(() => ensureFormPadding()).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        const searchBtn = document.querySelector('#chat-submit-button, #su, .s_btn, input[type="submit"]');
        if (searchBtn) searchBtn.addEventListener('click', scheduleRefresh);
        const searchForm = document.querySelector('#form, form[name="f"]');
        if (searchForm) searchForm.addEventListener('submit', scheduleRefresh);

        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.matches && target.matches('a, button, [type="submit"]')) {
                const text = (target.textContent || target.innerText || '').trim();
                if (/^(更多|展开|更多结果)$/i.test(text)) scheduleRefresh();
            }
            if (target.closest('#chat-submit-button, #normalSugSearchUl li, li.bdsug-item, #rs_new a, .rs-link_2DE3Q, .list_1V4Yg a, .item_3WKCf')) scheduleRefresh();
        }, true);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.isComposing && (e.target.matches('#chat-textarea, #kw'))) scheduleRefresh();
        }, true);

        const observer = new MutationObserver((_, obs) => {
            const searchContainer = $('#chat-input-main').parent();
            if (searchContainer.length) {
                obs.disconnect();
                searchContainer.css('position', 'relative');
                // 使用旧版按钮样式（已内联在按钮中，但样式定义已通过 injectBaiduStyles 恢复）
                const btnContainer = $(`<div style="position: absolute; top:40px; left:0; transform:translateX(0px); padding:10px 0; width:100%; z-index:999;"></div>`).appendTo(searchContainer);

                // 判断是否为首页，若是则隐藏按钮容器
                const isHomePage = !location.search.includes('wd=') && !location.search.includes('word=') && (location.pathname === '/' || location.pathname === '');
                if (isHomePage) {
                    btnContainer.hide();
                    btnContainer.addClass('baidu-home-hidden');
                }

                const buttons = [
                    {
                        id: 'social',
                        text: '社交问答',
                        bg: '#66CC00',
                        border: '#00CC00',
                        hover: '#33CC00',
                        urls: (kw) => [
                            `https://so.toutiao.com/search?dvpf=pc&source=input&keyword=${kw}`,
                            `https://search.bilibili.com/all?keyword=${kw}&order=pubdate`,
                            `https://s.weibo.com/weibo?q=${kw}&Refer=top`,
                            `https://www.xiaohongshu.com/search_result?keyword=${kw}&source=web_search`,
                            `https://www.douyin.com/search/${kw}`,
                            `https://www.zhihu.com/search?type=content&q=${kw}`
                        ]
                    },
                    {
                        id: 'finance',
                        text: '财经搜索',
                        bg: '#6633FF',
                        border: '#3333FF',
                        hover: '#3333FF',
                        urls: (kw) => [
                            `https://wallstreetcn.com/search?q=${kw}`,
                            `https://xueqiu.com/k?q=${kw}`,
                            `https://www.huxiu.com/#q=${kw}`,
                            `https://www.yicai.com/search?keys=${kw}`,
                            `https://www.ithome.com/search/${kw}.html`,
                            `https://so.mydrivers.com/default.htm#q=${kw}`,
                            `https://www.cls.cn/searchPage?keyword=${kw}&type=all`,
                            `https://search.sina.com.cn/news#q=${kw}`
                        ]
                    },
                    {
                        id: 'soft_pojie',
                        text: '软件搜索',
                        bg: '#FF9966',
                        border: '#FF9900',
                        hover: '#FF9933',
                        urls: (kw) => [
                            `https://github.com/search?q=${kw}`,
                            `https://www.baidu.com/s?wd=${kw}%20site:www.52pojie.cn`,
                            `https://www.baidu.com/s?wd=${kw}%20site:geekotg.com`,
                            `https://www.baidu.com/s?wd=${kw}%20site:weidown.com`,
                            `https://www.ypojie.com/?s=${kw}`,
                            `http://www.th-sjy.com/?s=${kw}`,
                            `https://www.sixyin.com/?s=${kw}&type=post`,
                            `http://www.qiuquan.cc/?s=${kw}`,
                            `http://www.dayanzai.me/?s=${kw}`,
                            `https://search.gndown.com/?s=${kw}`,
                            `https://www.ghpym.com/?s=${kw}`
                        ]
                    },
                    {
                        id: 'magnet_torrent_baidupan',
                        text: '网盘搜索',
                        bg: '#3385ff',
                        border: '#2d78f4',
                        hover: '#317ef3',
                        urls: (kw) => [
                            `https://www.pandashi8.com/search?keyword=${kw}`,
                            `https://www.pikasoo.top/search/?pan=all&q=${kw}`,
                            `https://btdig.com/search?q=${kw}`,
                            `https://bt4g.org/search?q=${kw}`,
                            `https://thepiratebay.org/search/${kw}/`,
                            `https://kickass.sx/usearch/${kw}/`,
                            `https://www.baidu.com/s?wd=${kw}%20百度网盘`
                        ]
                    },
                    {
                        id: 'bing',
                        text: 'Bing搜索',
                        bg: '#008373',
                        border: '#006b5f',
                        hover: '#006b5f',
                        urls: (kw) => [
                            `https://www.bing.com/search?q=${kw}`
                        ]
                    },
                    {
                        id: 'google',
                        text: 'Google搜索',
                        bg: '#CC3333',
                        border: '#CC0033',
                        hover: '#CC0033',
                        urls: (kw) => [
                            `https://www.google.com/search?q=${kw}`
                        ]
                    }
                ];
                buttons.forEach(btn => {
                    const $btn = $(`<input type="button" id="${btn.id}" value="${btn.text}" style="display:inline-block;font-size:14px;text-align:center;text-decoration:none;width:100px;height:33px;line-height:33px;margin:0 5px;-webkit-appearance:none;-webkit-border-radius:4px;border:0;color:#fff;letter-spacing:1px;outline:medium;cursor:pointer;background:${btn.bg};border-bottom:1px solid ${btn.border};" onmouseover="this.style.background='${btn.hover}'" onmouseout="this.style.background='${btn.bg}'">`).appendTo(btnContainer);
                    $btn.on('click', () => {
                        const kw = encodeURIComponent($('#chat-input-main, #kw, input[name="wd"]').val() || new URLSearchParams(location.search).get('wd') || '');
                        if (kw) btn.urls(kw).forEach((url,i)=>setTimeout(()=>window.open(url,`_blank_${i}_${Date.now()}`,'noopener,noreferrer'),i*300));
                    });
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        if (document.querySelector('#content_left')) {
            MyApi.safeFunc(() => new AutoPager());
        }
    };

    // ===================== 7. Google页面模块 =====================
    const initGooglePage = () => {
        const createGoogleSearchBar = () => {
            const old = document.querySelector('.google-baidu-search-container');
            if (old) old.remove();

            const getKeyword = () => document.querySelector('input[name="q"]')?.value || new URLSearchParams(location.search).get('q') || '';
            const container = document.createElement('div');
            container.className = 'google-baidu-search-container';
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '输入关键词 百度/Bing搜索';
            input.value = getKeyword();
            const baiduBtn = document.createElement('button');
            baiduBtn.className = 'baidu-btn';
            baiduBtn.textContent = '百度';
            const bingBtn = document.createElement('button');
            bingBtn.className = 'bing-btn';
            bingBtn.textContent = 'Bing';
            container.append(input, baiduBtn, bingBtn);

            const navBar = document.querySelector('.HTOhZ, .KP7LCb');
            if (navBar) {
                container.style.marginLeft = 'auto';
                navBar.appendChild(container);
            } else {
                const toolBtn = document.querySelector('#hdtb-tls, #st-toggle');
                if (toolBtn) toolBtn.parentNode.insertBefore(container, toolBtn.nextSibling);
                else {
                    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;background:#f8f8f8;border:1px solid #d2d2d2;padding:8px 12px;box-shadow:0 2px 5px rgba(0,0,0,0.2);';
                    document.body.appendChild(container);
                }
            }

            const doSearch = (engine) => {
                const kw = input.value.trim();
                if (!kw) return alert('请输入关键词');
                window.open(engine === 'baidu' ? `https://www.baidu.com/s?wd=${encodeURIComponent(kw)}` : `https://www.bing.com/search?q=${encodeURIComponent(kw)}`, '_blank');
            };
            baiduBtn.addEventListener('click', () => doSearch('baidu'));
            bingBtn.addEventListener('click', () => doSearch('bing'));
            input.addEventListener('keypress', (e) => e.key === 'Enter' && doSearch('baidu'));
        };

        new MutationObserver(MyApi.debounce(createGoogleSearchBar, 300)).observe(document.body, { childList: true, subtree: true, attributes: true });
        createGoogleSearchBar();
        MyApi.safeFunc(() => new AutoPager());
    };

    // ===================== 8. Bing页面模块 =====================
    const initBingPage = () => {
        const createBingSearchBar = () => {
            const old = document.querySelector('.bing-search-helper');
            if (old) old.remove();

            const getKeyword = () => document.querySelector('input[name="q"], #sb_form_q')?.value || new URLSearchParams(location.search).get('q') || '';
            const container = document.createElement('div');
            container.className = 'bing-search-helper';
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '输入关键词 百度/Google搜索';
            input.value = getKeyword();
            const baiduBtn = document.createElement('button');
            baiduBtn.className = 'baidu-btn';
            baiduBtn.textContent = '百度';
            const googleBtn = document.createElement('button');
            googleBtn.className = 'google-btn';
            googleBtn.textContent = 'Google';
            container.append(input, baiduBtn, googleBtn);

            const bingMoreLi = document.querySelector('#b-scopeListItem-menu');
            if (bingMoreLi) bingMoreLi.parentNode.insertBefore(container, bingMoreLi.nextSibling);
            else {
                const bingNavUl = document.querySelector('.b_scopebar > ul');
                if (bingNavUl) bingNavUl.appendChild(container);
                else {
                    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;background:#f8f8f8;border:1px solid #d2d2d2;padding:8px 12px;box-shadow:0 2px 5px rgba(0,0,0,0.2);';
                    document.body.appendChild(container);
                }
            }

            const doSearch = (engine) => {
                const kw = input.value.trim();
                if (!kw) return alert('请输入关键词');
                if (engine === 'baidu') window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(kw)}`, '_blank');
                else window.open(`https://www.google.com/search?q=${encodeURIComponent(kw)}`, '_blank');
            };
            baiduBtn.addEventListener('click', () => doSearch('baidu'));
            googleBtn.addEventListener('click', () => doSearch('google'));
            input.addEventListener('keypress', (e) => e.key === 'Enter' && doSearch('baidu'));
        };

        new MutationObserver(MyApi.debounce(createBingSearchBar, 300)).observe(document.body, { childList: true, subtree: true, attributes: true });
        createBingSearchBar();
        MyApi.safeFunc(() => new AutoPager());
    };

    // ===================== 9. 驱动之家（快科技）中转模块 =====================
    const initSoMydrivers = () => {
        const keyword = (() => {
            const hash = window.location.hash;
            if (hash && hash.startsWith('#q=')) return decodeURIComponent(hash.substring(3));
            return null;
        })();
        if (!keyword) return;
        window.location.hash = '';
        const wait = setInterval(() => {
            const searchInput = $('#s');
            const searchButton = $('#btnsearch');
            if (searchInput.length && searchButton.length) {
                clearInterval(wait);
                searchInput.val(keyword);
                searchButton.click();
            }
        }, 200);
        setTimeout(() => clearInterval(wait), 10000);
    };

    // ===================== 10. 驱动之家（快科技）翻页模块 =====================
    const initMydriversPager = () => {
        const CONFIG = {
            nextLinkSelector: 'css;a.next',
            mainContentSelector: 'css;body > div.main_box > div.main_left > div.main_1 > div.news_lb > ul',
            fallbackSelectors: [
                'css;div.news_lb > ul',
                'css;.main_left ul',
                'css;.main_left li'
            ],
            insertSelector: 'css;body > div.main_box > div.main_left > div.main_1 > div.news_lb > ul',
            hidePagerSelector: 'css;#div_pager, .m-page',
            triggerDistance: 1200,
            pageInfoText: (pageNum) => `—— 快科技第 ${pageNum} 页 ——`
        };

        const fetchPage = async (url, retries = 2) => {
            for (let i = 0; i <= retries; i++) {
                try {
                    const result = await new Promise((resolve) => {
                        GM_xmlhttpRequest({
                            url, method: 'GET', timeout: 15000, responseType: 'arraybuffer',
                            headers: {
                                'User-Agent': navigator.userAgent,
                                'Referer': location.href,
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                                'Accept-Encoding': 'gzip, deflate',
                                'Connection': 'keep-alive',
                                'Upgrade-Insecure-Requests': '1',
                                'Cache-Control': 'max-age=0'
                            },
                            onload: resp => resolve({ err: null, resp }),
                            onerror: err => resolve({ err, resp: null }),
                            ontimeout: () => resolve({ err: new Error('超时'), resp: null })
                        });
                    });
                    if (result.err || !result.resp) {
                        if (i < retries) { await MyApi.waitTime(1000); continue; }
                        return [result.err, ''];
                    }
                    const resp = result.resp;
                    const arrayBuffer = resp.response;
                    let charset = 'utf-8';
                    const contentTypeHeader = resp.responseHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1] || '';
                    const charsetMatch = contentTypeHeader.match(/charset=([^;]+)/i);
                    if (charsetMatch) charset = charsetMatch[1].toLowerCase();

                    if (charset === 'utf-8') {
                        const decoderUtf8 = new TextDecoder('utf-8');
                        const headSample = decoderUtf8.decode(arrayBuffer.slice(0, 4096));
                        const metaMatch = headSample.match(/<meta\s+charset=["']?([^"'\s>]+)/i) || headSample.match(/<meta\s+http-equiv=["']?content-type["']?\s+content=["']?[^"']*charset=([^"'\s>]+)/i);
                        if (metaMatch && (metaMatch[1].toLowerCase().includes('gb') || metaMatch[1].toLowerCase().includes('2312'))) {
                            charset = metaMatch[1].toLowerCase();
                        }
                    }

                    if (charset.includes('gb') || charset.includes('2312')) {
                        try {
                            const gbkDecoder = new TextDecoder('gbk');
                            return [null, gbkDecoder.decode(arrayBuffer)];
                        } catch (e) {}
                    }
                    return [null, new TextDecoder('utf-8').decode(arrayBuffer)];
                } catch (e) {
                    if (i === retries) return [e, ''];
                    await MyApi.waitTime(1000);
                }
            }
        };

        class MydriversPager {
            constructor() {
                this.isLoading = false;
                this.pageNum = 1;
                this.nextUrl = null;
                this.contentContainer = null;
                this._init();
            }
            async _init() {
                await MyApi.waitTime(1000);
                this.contentContainer = MyApi.getAllElements(CONFIG.mainContentSelector)[0] || MyApi.getAllElements(CONFIG.insertSelector)[0];
                if (!this.contentContainer) return;
                this.updateNextUrl();
                this.hidePager();
                this.bindScroll();
            }
            updateNextUrl(doc = document) {
                const link = MyApi.getAllElements(CONFIG.nextLinkSelector, doc, doc)[0];
                this.nextUrl = link ? MyApi.resolveUrl(link.href) : null;
            }
            hidePager() {
                MyApi.getAllElements(CONFIG.hidePagerSelector).forEach(el => el.style.display = 'none');
            }
            bindScroll() {
                const handler = MyApi.debounce(async () => {
                    if (this.isLoading) return;
                    const st = document.documentElement.scrollTop || document.body.scrollTop;
                    const sh = document.documentElement.scrollHeight || document.body.scrollHeight;
                    const ch = document.documentElement.clientHeight || window.innerHeight;
                    if (st + ch >= sh - CONFIG.triggerDistance) await this.loadNext();
                }, 400);
                window.addEventListener('scroll', handler);
                handler();
            }
            async loadNext() {
                if (!this.nextUrl) return;
                this.isLoading = true;
                this.pageNum++;
                try {
                    const [err, html] = await fetchPage(this.nextUrl);
                    if (err || !html) throw err || new Error('空响应');
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    let content = MyApi.getAllElements(CONFIG.mainContentSelector, doc, doc);
                    if (!content.length) {
                        for (const sel of CONFIG.fallbackSelectors) {
                            content = MyApi.getAllElements(sel, doc, doc);
                            if (content.length) break;
                        }
                    }
                    if (!content.length) {
                        this.updateNextUrl(doc);
                        return;
                    }
                    this.insertContent(content, doc);
                    this.updateNextUrl(doc);
                    this.hidePager();
                } catch (e) {
                    console.error('[翻页] 加载失败:', e);
                    this.pageNum--;
                } finally {
                    this.isLoading = false;
                }
            }
            insertContent(contentElements, doc) {
                const insertNode = MyApi.getAllElements(CONFIG.insertSelector)[0];
                if (!insertNode) return;

                // 分隔符以<div>形式插入到容器之前，并使用专用类去除边框背景
                const separator = document.createElement('div');
                separator.className = 'autopagerize_page_info mydrivers-pager-separator';
                separator.textContent = CONFIG.pageInfoText(this.pageNum);
                insertNode.parentNode.insertBefore(separator, insertNode);

                contentElements.forEach(container => {
                    const items = container.children.length ? Array.from(container.children) : [container];
                    items.forEach(item => {
                        if (item.nodeType === 1 && item.textContent.trim() !== '') {
                            insertNode.appendChild(doc.importNode(item, true));
                        }
                    });
                });
            }
        }
        MyApi.safeFunc(() => new MydriversPager());
    };

    // ===================== 11. 虎嗅网增强模块 =====================
    const initHuxiuPage = () => {
        // 如果是搜索结果页，跳过执行
        if (location.pathname.includes('/search') || location.search.includes('keyword=') || location.search.includes('q=') || window.__huxiuExecuted) return;

        const getKeywordFromHash = () => {
            let hash = window.location.hash;
            if (hash && hash.startsWith('#q=')) try { return decodeURIComponent(hash.substring(3)); } catch (e) {}
            const match = location.href.match(/#q=([^#&]+)/);
            if (match) try { return decodeURIComponent(match[1]); } catch (e) {}
            return null;
        };
        const keyword = getKeywordFromHash();
        if (!keyword) {
            // 无关键词，但可能面板已打开且输入框有内容，静默返回
            const input = document.querySelector('.input-wrapper input[placeholder*="搜索"], .search-input input');
            if (input && input.value.trim() !== '' && document.querySelector('.input-wrapper, .search-history__history-items, .search-panel')?.offsetParent) return;
            return;
        }
        window.location.hash = '';

        const waitForElement = (selector, timeout = 15000, context = document) => new Promise((resolve, reject) => {
            const el = context.querySelector(selector);
            if (el) return resolve(el);
            const observer = new MutationObserver(() => {
                const found = context.querySelector(selector);
                if (found) { observer.disconnect(); resolve(found); }
            });
            observer.observe(context, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); reject(new Error(`超时: ${selector}`)); }, timeout);
        });

        const simulateFullClick = (element) => {
            if (!element) return;
            const rect = element.getBoundingClientRect();
            const clientX = rect.left + rect.width / 2, clientY = rect.top + rect.height / 2;
            const view = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            ['mousedown', 'mouseup', 'click'].forEach(type => {
                element.dispatchEvent(new MouseEvent(type, { view, bubbles: true, cancelable: true, clientX, clientY }));
            });
        };

        const isSearchPanelOpen = () => !!document.querySelector('.input-wrapper, .search-history__history-items, .search-panel')?.offsetParent;

        (async () => {
            try {
                let searchBtn = document.querySelector('svg.search-btn.pointer, .search-icon-container .search-btn') || await waitForElement('.search-icon-container, .search-btn, svg.search-btn.pointer');
                let panelOpened = false;
                for (let i = 0; i < 3; i++) {
                    simulateFullClick(searchBtn);
                    await MyApi.waitTime(600);
                    if (isSearchPanelOpen()) { panelOpened = true; break; }
                }
                if (!panelOpened) throw new Error('无法打开搜索面板');

                const searchInput = await waitForElement('.input-wrapper input[placeholder*="搜索"], .search-input input, input[placeholder="搜索文章"]');
                searchInput.value = keyword;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));

                await MyApi.waitTime(300);
                const submitBtn = await waitForElement('.input-icons .icon-search, .icon-search-show, .search-btn[type="submit"]', 5000);
                simulateFullClick(submitBtn);

                let searchSuccess = false;
                for (let i = 0; i < 10; i++) {
                    await MyApi.waitTime(500);
                    if (!isSearchPanelOpen() || document.querySelector('.search-result, .article-list, .feed-list')) { searchSuccess = true; break; }
                }
                if (searchSuccess) {
                    window.__huxiuExecuted = true;
                } else {
                    window.location.href = `https://www.huxiu.com/search?keyword=${encodeURIComponent(keyword)}`;
                }
            } catch (e) {
                console.error('虎嗅操作失败，跳转:', e);
                window.location.href = `https://www.huxiu.com/search?keyword=${encodeURIComponent(keyword)}`;
            }
        })();

        // 滚动锁定管理
        let isLocked = false;
        const lockScroll = () => { if (!isLocked) { document.documentElement.classList.add('huxiu-panel-open'); isLocked = true; } };
        const unlockScroll = () => { if (isLocked) { document.documentElement.classList.remove('huxiu-panel-open'); isLocked = false; } };
        const updateScrollLock = () => { (document.querySelector('.search.home-search')?.classList.contains('transitionShow')) ? lockScroll() : unlockScroll(); };

        const panel = document.querySelector('.search.home-search');
        if (panel) new MutationObserver(updateScrollLock).observe(panel, { attributes: true, attributeFilter: ['class'] });
        else {
            new MutationObserver((mutations, obs) => {
                const p = document.querySelector('.search.home-search');
                if (p) { obs.disconnect(); new MutationObserver(updateScrollLock).observe(p, { attributes: true, attributeFilter: ['class'] }); updateScrollLock(); }
            }).observe(document.body, { childList: true, subtree: true });
        }
        document.querySelector('.search-icon-container .search-btn, svg.search-btn.pointer')?.addEventListener('click', () => setTimeout(updateScrollLock, 50));
        document.querySelector('.search-icon-container .close-btn, svg.close-btn.pointer')?.addEventListener('click', () => setTimeout(updateScrollLock, 50));
        setInterval(updateScrollLock, 300);
        updateScrollLock();
    };

    // ===================== 12. 新浪搜索模块（适配2026改版 Vue SPA） =====================
    const initSinaSearch = () => {
        const urlParams = new URLSearchParams(location.search);
        const keyword   = urlParams.get('q') || '';

        // 兼容旧版 #q= hash 跳转
        if (!keyword) {
            const hash = window.location.hash;
            if (hash && hash.startsWith('#q=')) {
                const kw = decodeURIComponent(hash.substring(3));
                window.location.replace(`https://search.sina.com.cn/search?q=${encodeURIComponent(kw)}`);
            }
            return;
        }

        class SinaSearchPager {
            constructor() {
                this.isLoading   = false;
                this.hasMore     = true;
                this.pageNum     = 1;
                // 所有已加载条目的克隆（跨页累积）
                this.accumulated = [];
                this.container   = null;
                this._init();
            }

            async _init() {
                // 等待 Vue 首屏渲染
                await MyApi.waitTime(1500);
                this.container = this._findContainer();
                if (!this.container) {
                    console.warn('[新浪翻页] 未找到结果容器');
                    return;
                }
                // 保存第 1 页条目
                this.accumulated = this._cloneItems();
                this._hidePager();
                this._bindScroll();
                console.log('[新浪翻页] 初始化完成，第1页条目数:', this.accumulated.length);
            }

            _findContainer() {
                const first = document.querySelector('.result-item');
                if (first && first.parentElement) return first.parentElement;
                for (const s of ['.result-list', '.search-result-list', '.result', '#result']) {
                    const el = document.querySelector(s);
                    if (el) return el;
                }
                return null;
            }

            _hidePager() {
                document.querySelectorAll('.pagination, .sidebar').forEach(el => {
                    el.style.display = 'none';
                });
            }

            _cloneItems() {
                return Array.from(document.querySelectorAll('.result-item'))
                            .map(el => el.cloneNode(true));
            }

            _getNextBtn() {
                return document.querySelector(
                    '.ant-pagination-next:not(.ant-pagination-disabled) button'
                );
            }

            async _loadNext() {
                if (this.isLoading || !this.hasMore) return;
                const btn = this._getNextBtn();
                if (!btn) {
                    console.log('[新浪翻页] 无下一页按钮，已到末页');
                    this.hasMore = false;
                    return;
                }

                this.isLoading = true;
                this.pageNum++;

                // 记录当前第一条结果的链接，判断 Vue 是否完成替换
                const anchorBefore = document.querySelector('.result-item .result-title a')?.href || '';

                // 点击触发 Vue 路由 + API 请求
                btn.click();
                console.log('[新浪翻页] 已点击下一页，等待 Vue 渲染第', this.pageNum, '页...');

                // 等待 Vue 完成内容替换（最多 15 秒）
                const newItems = await this._waitForChange(anchorBefore);

                if (!newItems || newItems.length === 0) {
                    console.log('[新浪翻页] 第', this.pageNum, '页加载超时或无数据');
                    this.hasMore  = false;
                    this.isLoading = false;
                    this.pageNum--;
                    return;
                }

                console.log('[新浪翻页] 第', this.pageNum, '页加载成功，条目数:', newItems.length);

                // 存入累积列表（带分隔符标记）
                const sep = { _isSep: true, pageNum: this.pageNum };
                this.accumulated.push(sep, ...newItems.map(el => el.cloneNode(true)));

                // 重建 DOM：把所有页面重新插入
                this._rebuildDOM();
                this._hidePager();
                this.isLoading = false;
            }

            /**
             * 轮询直到第一条结果链接发生变化（Vue 已渲染新页面）。
             * 两阶段：等待 href 消失（loading）→ 等待新 href 出现
             */
            _waitForChange(anchorBefore) {
                return new Promise(resolve => {
                    let ticks = 0;
                    let phase = 'wait_change';
                    const timer = setInterval(() => {
                        ticks++;
                        const current = document.querySelector('.result-item .result-title a')?.href || '';

                        if (phase === 'wait_change') {
                            if (current && current !== anchorBefore) {
                                clearInterval(timer);
                                setTimeout(() => resolve(this._cloneItems()), 300);
                                return;
                            }
                            if (!current) phase = 'wait_load';
                        } else if (phase === 'wait_load') {
                            if (current && current !== anchorBefore) {
                                clearInterval(timer);
                                setTimeout(() => resolve(this._cloneItems()), 300);
                                return;
                            }
                        }

                        if (ticks > 30) {
                            clearInterval(timer);
                            resolve(null);
                        }
                    }, 500);
                });
            }

            _rebuildDOM() {
                if (!this.container) return;
                while (this.container.firstChild) {
                    this.container.removeChild(this.container.firstChild);
                }
                this.accumulated.forEach(entry => {
                    if (entry._isSep) {
                        const sep = document.createElement('div');
                        sep.className = 'autopagerize_page_info sina-pager-separator';
                        sep.textContent = `—— 新浪搜索第 ${entry.pageNum} 页 ——`;
                        this.container.appendChild(sep);
                    } else {
                        this.container.appendChild(entry);
                    }
                });
            }

            _bindScroll() {
                const handler = MyApi.debounce(() => {
                    if (this.isLoading || !this.hasMore) return;
                    const st = document.documentElement.scrollTop || document.body.scrollTop;
                    const sh = document.documentElement.scrollHeight || document.body.scrollHeight;
                    const ch = document.documentElement.clientHeight || window.innerHeight;
                    if (st + ch >= sh - PAGE_TRIGGER_DISTANCE) this._loadNext();
                }, 400);
                window.addEventListener('scroll', handler);
                handler();
            }
        }

        MyApi.safeFunc(() => new SinaSearchPager());
    };

    // ===================== 13. 头条搜索自动翻页模块（移植自优化版） =====================
    const initToutiaoPage = () => {
        // 干扰项检测函数（完整移植优化版）
        const DISTRACTING_FEATURES = [
            // 头部搜索框
            el => el.querySelector('[data-test-card-id="SearchBar"]'),
            // 热榜卡片（76-undefined）
            el => el.querySelector('[data-test-card-id="76-undefined"]'),
            // 相关搜索卡片（20-undefined）
            el => el.querySelector('[data-test-card-id="20-undefined"]'),
            // 筛选条件栏（全网内容/只看头条 + 下拉框）
            el => (el.textContent.includes('全网内容') || el.textContent.includes('只看头条')) && el.querySelector('.cs-select-pro'),
            // 底部翻页条或加载动画容器
            el => el.querySelector('.cs-pagination, .bar_3xTirN, .text-center.mx-auto')
        ];

        class ToutiaoPager {
            constructor() {
                this.RESULT_CONTAINER = '.s-result-list';
                this.RESULT_ITEM = '.result-content';
                this.TRIGGER_DISTANCE = 800;
                this.isLoading = false;
                this.nextUrl = null;
                this.pageNum = 1;
                this.container = document.querySelector(this.RESULT_CONTAINER);
                if (!this.container) return;
                this._init();
            }
            _init() {
                this.cleanPage();
                this.nextUrl = this.getNextUrl();
                this.bindScroll();
                this.startUrlChecker(); // 定时检查下一页链接
            }
            getNextUrl(doc = document) {
                const pagination = doc.querySelector('.cs-pagination');
                if (!pagination) return null;
                for (let link of pagination.querySelectorAll('a')) {
                    if (link.textContent.includes('下一页')) {
                        const href = link.getAttribute('href');
                        if (href) return MyApi.resolveUrl(href);
                    }
                }
                return null;
            }
            cleanPage() {
                document.querySelectorAll(this.RESULT_ITEM).forEach(el => {
                    if (this.isDistractingElement(el)) {
                        el.style.display = 'none';
                    }
                });
            }
            isDistractingElement(el) {
                return DISTRACTING_FEATURES.some(feature => feature(el));
            }
            addSeparator() {
                const sep = document.createElement('div');
                sep.className = 'autopagerize_page_info';
                sep.textContent = `—— 已加载第 ${this.pageNum} 页 ——`;
                this.container.appendChild(sep);
            }
            async loadNext() {
                if (this.isLoading || !this.nextUrl) return;
                this.isLoading = true;
                this.pageNum++;
                try {
                    const [err, html] = await MyApi.http.get(this.nextUrl);
                    if (err || !html) throw err || new Error('空响应');
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const allItems = doc.querySelectorAll(this.RESULT_ITEM);
                    const newItems = Array.from(allItems).filter(el => !this.isDistractingElement(el));
                    if (!newItems.length) { this.nextUrl = null; return; }
                    this.addSeparator();
                    newItems.forEach(item => this.container.appendChild(item.cloneNode(true)));
                    this.nextUrl = this.getNextUrl(doc);
                    this.cleanPage(); // 清理可能新增的干扰
                } catch (e) {
                    console.error('[头条翻页] 加载失败:', e);
                    this.pageNum--;
                } finally {
                    this.isLoading = false;
                }
            }
            bindScroll() {
                let ticking = false;
                const scrollHandler = () => {
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            if (!this.isLoading && this.nextUrl) {
                                const st = window.scrollY;
                                const sh = document.documentElement.scrollHeight;
                                const ch = window.innerHeight;
                                if (st + ch >= sh - this.TRIGGER_DISTANCE) this.loadNext();
                            }
                            ticking = false;
                        });
                        ticking = true;
                    }
                };
                window.addEventListener('scroll', scrollHandler);
                scrollHandler();
            }
            startUrlChecker() {
                setInterval(() => {
                    if (!this.nextUrl) {
                        const newNext = this.getNextUrl();
                        if (newNext) {
                            this.nextUrl = newNext;
                            console.log('[头条翻页] 通过定时器重新获取到下一页:', this.nextUrl);
                        }
                    }
                }, 3000);
            }
        }
        MyApi.safeFunc(() => new ToutiaoPager());
    };

    // ===================== 14. 脚本入口 =====================
    GM_registerMenuCommand("反馈建议", () => window.open("https://greasyfork.org/zh-CN/scripts/396960/feedback"));

    if (/baidu\./.test(hostname)) {
        initBaiduPage();
    } else if (/google\./.test(hostname)) {
        initGooglePage();
    } else if (/bing\./.test(hostname) && location.pathname === '/search') {
        initBingPage();
    } else if (hostname === 'so.mydrivers.com' && location.pathname === '/default.htm') {
        initSoMydrivers();
    } else if (/mydrivers\.com/.test(hostname)) {
        initMydriversPager();
    } else if (/so\.toutiao\.com/.test(hostname)) {
        initToutiaoPage();
    } else if (/huxiu\.com/.test(hostname)) {
        initHuxiuPage();
    } else if (/search\.sina\.com\.cn/.test(hostname)) {
        initSinaSearch();
    }
})();