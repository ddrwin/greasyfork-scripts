// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、抖音、小红书、Google、Bing搜索，为Google/Bing添加百度/Google/Bing辅助搜索框
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google、Bing搜索按钮，一键跳转到Google/Bing；在Google搜索结果页添加百度/Bing搜索框；在Bing搜索结果页添加百度/Google搜索框。支持各个搜索引擎自动翻页，去除百度结果页面的广告和右边栏。虎嗅网模块增强：当URL带有#q=关键词时，优先点击完全匹配的历史关键词；若不匹配或无历史，则自动填入关键词并搜索。新增新浪搜索自动翻页功能。优化版：统一分隔符样式，减少冗余操作，提升执行效率。修复Bing翻页分隔符问题，统一翻页触发距离为2000px。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.1.0
// @author       ddrwin (优化: DeepSeek)
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
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';
    const hostname = location.hostname;

    // ========== 百度搜索结果页间距调整参数（按需修改） ==========
    const PAGE_TOP = 40;
    const NAV_MARGIN_TOP = 0;
    const TOOL_MARGIN_TOP = 0;
    const CONTENT_MARGIN_TOP = 10;
    const MIN_REFRESH_INTERVAL = 1000;

    // ========== 全局翻页触发距离（像素） ==========
    const PAGE_TRIGGER_DISTANCE = 2000;

    // ===================== 全局样式（一次性注入） =====================
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
        /* 新浪兼容 */
        .sina-pager-separator {
            border: none !important;
            background: transparent !important;
        }

        /* 百度页面卡片美化及广告隐藏 */
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
        #s_tab, #content_left, .result-molecule[tpl="app/search-tool"] {
            overflow: visible !important;
        }
        #s_tab { z-index: 99999 !important; }
        #s_tab_inner { margin-top: ${NAV_MARGIN_TOP}px !important; }
        #content_left { margin-top: ${TOOL_MARGIN_TOP}px !important; z-index: 9999 !important; }
        .result-molecule[tpl="app/search-tool"] {
            margin-bottom: ${CONTENT_MARGIN_TOP}px !important;
            z-index: 1000 !important;
        }
        #tsn_inner { z-index: 1001 !important; background: #fff !important; }

        /* 百度卡片美化 */
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
            transform: translateY(-2px) !important;
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

        /* 新浪搜索专用样式 */
        .pagebox, #_function_code_page, .search-form-bot {
            display: none !important;
        }
        .sRight, #scrollDiv {
            display: none !important;
        }
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

        /* Google/Bing辅助搜索框样式 */
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

        /* 头条搜索专用样式 */
        .s-side-list { display: none !important; }

        /* 虎嗅网滚动锁定 */
        .huxiu-panel-open,
        .huxiu-panel-open body {
            overflow: hidden !important;
        }
        .search-result {
            max-height: 70vh !important;
            overflow-y: auto !important;
        }
    `);

    // ===================== 全局工具函数（MyApi） =====================
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

    // ===================== 翻页配置（增强Bing兼容性） =====================
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
            if (host.includes('so.com')) return 'haosou';
            if (host.includes('duckduckgo.com') || host.includes('dogedoge.com')) return 'duck';
            return '';
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
                    pageElement: ["css;div#content_left > *", "//*[@id=\"content_left\"]/*"],
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
                    HT_insert: [["css;#rso", 2], ["id('main')", 2]],
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
                    HT_insert: [["css;ol#b_results", 2], ["id(\"b_results\")/li[@class=\"b_pag\"]", 1]],
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
                },
                haosou: {
                    nextLink: "//div[@id='page']//a[text()='下一页>'] | id('snext')",
                    pageElement: "//div[@id='container']/div[@id='main']/ul[@class='result']/li",
                    HT_insert: ["//div[@id='container']//ul[@class='result']", 2],
                    replaceE: "id('page')",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 360好搜第 ${pageNum} 页 ——`,
                    afertPagerAutoCallFunc: () => {
                        if (unsafeWindow.So?.web?.lazyLoad?.init) unsafeWindow.So.web.lazyLoad.init();
                    }
                },
                duck: {
                    nextLink: "//a[contains(@class,\"sb_pagN\")]",
                    pageElement: "id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]",
                    HT_insert: ["id(\"b_results\")/li[@class=\"b_pag\"]", 1],
                    replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— DuckDuckGo第 ${pageNum} 页 ——`
                }
            };
            return configs[this.siteName] || null;
        }
    }

    // ===================== 通用翻页类 =====================
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

    // ===================== 各站点初始化函数（保持原有逻辑，但使用优化后的工具） =====================
    const initBaiduPage = () => {
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
                const btnContainer = $(`<div style="position: absolute; top:40px; left:0; transform:translateX(0px); padding:10px 0; width:100%; z-index:999;"></div>`).appendTo(searchContainer);
                const buttons = [
                    { id:'social', text:'社交问答', bg:'#66CC00', border:'#00CC00', hover:'#33CC00', urls:(kw)=>[`https://so.toutiao.com/search?dvpf=pc&source=input&keyword=${kw}`,`https://search.bilibili.com/all?keyword=${kw}&order=pubdate`,`https://s.weibo.com/weibo?q=${kw}&Refer=top`,`https://www.xiaohongshu.com/search_result?keyword=${kw}&source=web_search`,`https://www.douyin.com/search/${kw}`,`https://www.zhihu.com/search?type=content&q=${kw}`] },
                    { id:'finance', text:'财经搜索', bg:'#6633FF', border:'#3333FF', hover:'#3333FF', urls:(kw)=>[`https://wallstreetcn.com/search?q=${kw}`,`https://xueqiu.com/k?q=${kw}`,`https://www.huxiu.com/#q=${kw}`,`https://www.yicai.com/search?keys=${kw}`,`https://www.ithome.com/search/${kw}.html`,`https://so.mydrivers.com/default.htm#q=${kw}`,`https://www.cls.cn/searchPage?keyword=${kw}&type=all`,`https://search.sina.com.cn/news#q=${kw}`] },
                    { id:'soft_pojie', text:'软件搜索', bg:'#FF9966', border:'#FF9900', hover:'#FF9933', urls:(kw)=>[`https://github.com/search?q=${kw}`,`https://www.baidu.com/s?wd=${kw}%20site:www.52pojie.cn`,`https://www.baidu.com/s?wd=${kw}%20site:geekotg.com`,`https://www.baidu.com/s?wd=${kw}%20site:weidown.com`,`https://www.ypojie.com/?s=${kw}`,`http://www.th-sjy.com/?s=${kw}`,`https://www.sixyin.com/?s=${kw}&type=post`,`http://www.qiuquan.cc/?s=${kw}`,`http://www.dayanzai.me/?s=${kw}`,`https://search.gndown.com/?s=${kw}`,`https://www.ghpym.com/?s=${kw}`] },
                    { id:'magnet_torrent_baidupan', text:'网盘搜索', bg:'#3385ff', border:'#2d78f4', hover:'#317ef3', urls:(kw)=>[`https://www.pandashi8.com/search?keyword=${kw}`,`https://www.pikasoo.top/search/?pan=all&q=${kw}`,`https://btdig.com/search?q=${kw}`,`https://bt4g.org/search?q=${kw}`,`https://thepiratebay.org/search/${kw}/`,`https://kickass.sx/usearch/${kw}/`,`https://www.baidu.com/s?wd=${kw}%20百度网盘`] },
                    { id:'bing', text:'Bing搜索', bg:'#008373', border:'#006b5f', hover:'#006b5f', urls:(kw)=>[`https://www.bing.com/search?q=${kw}`] },
                    { id:'google', text:'Google搜索', bg:'#CC3333', border:'#CC0033', hover:'#CC0033', urls:(kw)=>[`https://www.google.com/search?q=${kw}`] }
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

    const initMydriversPager = () => {
        const CONFIG = {
            nextLinkSelector: 'css;a.next',
            mainContentSelector: 'css;body > div.main_box > div.main_left > div.main_1 > div.news_lb > ul',
            fallbackSelectors: ['css;div.news_lb > ul', 'css;.main_left ul', 'css;.main_left li'],
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
                const sep = document.createElement('li');
                sep.className = 'autopagerize_page_info';
                sep.textContent = CONFIG.pageInfoText(this.pageNum);
                insertNode.appendChild(sep);
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

    const initHuxiuPage = () => {
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

    const initSinaSearch = () => {
        const keyword = (() => {
            const hash = window.location.hash;
            if (hash && hash.startsWith('#q=')) return decodeURIComponent(hash.substring(3));
            return null;
        })();
        if (keyword) {
            window.location.hash = '';
            const wait = setInterval(() => {
                const searchInput = document.querySelector('#keyword, input[name="q"]');
                const searchButton = document.querySelector('.ipt-03, input[type="submit"]');
                if (searchInput && searchButton) {
                    clearInterval(wait);
                    searchInput.value = keyword;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    searchButton.click();
                }
            }, 200);
            setTimeout(() => clearInterval(wait), 10000);
        }

        class SinaSearchPager {
            constructor() {
                this.isLoading = false;
                this.pageNum = 1;
                this.nextInfo = null;
                this.contentContainer = null;
                this._init();
            }
            async _init() {
                await MyApi.waitTime(800);
                const possibleContainers = ['.result', '.blkResult', '.list', '.search-result', '.news-item', '#result', '.news-list', '.search-content', '.main-content'];
                for (const sel of possibleContainers) {
                    const el = document.querySelector(sel);
                    if (el) { this.contentContainer = el; break; }
                }
                if (!this.contentContainer) return;
                this.updateNextInfo();
                this.hidePager();
                this.bindScroll();
            }
            updateNextInfo(doc = document) {
                const pager = doc.querySelector('.pagebox, #_function_code_page');
                if (!pager) { this.nextInfo = null; return; }
                const nextLink = (() => {
                    const links = pager.querySelectorAll('a');
                    for (let link of links) if (link.textContent.includes('下一页') || link.textContent.includes('下页')) return link;
                    return links[links.length - 1];
                })();
                if (!nextLink) { this.nextInfo = null; return; }
                const href = nextLink.getAttribute('href');
                const match = href?.match(/linkPostPage\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
                if (match) {
                    const basePath = match[1], queryString = match[2];
                    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
                    this.nextInfo = { url: new URL(basePath, location.origin).href, params };
                } else {
                    this.nextInfo = null;
                }
            }
            hidePager() {
                document.querySelectorAll('.pagebox, #_function_code_page, .m-page').forEach(el => el.style.display = 'none');
            }
            bindScroll() {
                const handler = MyApi.debounce(async () => {
                    if (this.isLoading) return;
                    const st = document.documentElement.scrollTop || document.body.scrollTop;
                    const sh = document.documentElement.scrollHeight || document.body.scrollHeight;
                    const ch = document.documentElement.clientHeight || window.innerHeight;
                    if (st + ch >= sh - 800) await this.loadNext();
                }, 400);
                window.addEventListener('scroll', handler);
                handler();
            }
            async loadNext() {
                if (!this.nextInfo) return;
                this.isLoading = true;
                this.pageNum++;
                try {
                    const [err, html] = await MyApi.http.post(this.nextInfo.url, this.nextInfo.params);
                    if (err || !html) throw err || new Error('空响应');
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    let content = [];
                    const possibleContainers = ['.result', '.blkResult', '.list', '.search-result', '.news-item', '#result', '.news-list', '.search-content', '.main-content'];
                    for (const sel of possibleContainers) {
                        const nodes = doc.querySelectorAll(sel);
                        if (nodes.length) { content = Array.from(nodes); break; }
                    }
                    if (!content.length) {
                        this.updateNextInfo(doc);
                        return;
                    }
                    this.insertContent(content, doc);
                    this.updateNextInfo(doc);
                    this.hidePager();
                } catch (e) {
                    console.error('[新浪翻页] 加载失败:', e);
                    this.pageNum--;
                } finally {
                    this.isLoading = false;
                }
            }
            insertContent(contentElements, doc) {
                if (!this.contentContainer) return;
                const sep = document.createElement('div');
                sep.className = 'autopagerize_page_info sina-pager-separator';
                sep.textContent = `—— 新浪搜索第 ${this.pageNum} 页 ——`;
                this.contentContainer.appendChild(sep);
                contentElements.forEach(container => {
                    const items = container.children.length ? Array.from(container.children) : [container];
                    items.forEach(item => {
                        if (item.nodeType === 1 && item.textContent.trim() !== '') {
                            this.contentContainer.appendChild(doc.importNode(item, true));
                        }
                    });
                });
            }
        }
        MyApi.safeFunc(() => new SinaSearchPager());
    };

    const initToutiaoPage = () => {
        const DISTRACTING_FEATURES = [
            el => el.querySelector('[data-test-card-id="SearchBar"]'),
            el => el.querySelector('[data-test-card-id="76-undefined"]'),
            el => el.querySelector('[data-test-card-id="20-undefined"]'),
            el => (el.textContent.includes('全网内容') || el.textContent.includes('只看头条')) && el.querySelector('.cs-select-pro'),
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
                    if (DISTRACTING_FEATURES.some(fn => fn(el))) el.style.display = 'none';
                });
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
                    const newItems = Array.from(allItems).filter(el => !DISTRACTING_FEATURES.some(fn => fn(el)));
                    if (!newItems.length) { this.nextUrl = null; return; }
                    this.addSeparator();
                    newItems.forEach(item => this.container.appendChild(item.cloneNode(true)));
                    this.nextUrl = this.getNextUrl(doc);
                    this.cleanPage();
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
        }
        MyApi.safeFunc(() => new ToutiaoPager());
    };

    // ===================== 脚本入口 =====================
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