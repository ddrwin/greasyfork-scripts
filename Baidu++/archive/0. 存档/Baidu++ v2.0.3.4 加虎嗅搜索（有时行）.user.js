// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、抖音、小红书、Google、Bing搜索，为Google/Bing添加百度/Google/Bing辅助搜索框
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google、Bing搜索按钮，一键跳转到Google/Bing；在Google搜索结果页添加百度/Bing搜索框；在Bing搜索结果页添加百度/Google搜索框。支持各个搜索引擎自动翻页，去除百度结果页面的广告和右边栏。虎嗅网模块增强：当URL带有#q=关键词时，优先点击匹配的历史关键词；若不匹配或无历史，则自动填入关键词并搜索，确保新词被注入历史。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.0.3.6
// @author       ddrwin
// @run-at       document-end
// @match        *://*.baidu.com/*
// @match        *://baidu.com/*
// @match        *://*.google.*/*
// @match        *://*.bing.*/*
// @match        *://so.mydrivers.com/default.htm*
// @match        *://*.huxiu.com/*
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
// @note         2026.02.26 V2.0.3.4 虎嗅增强：当URL带有#q=关键词时，自动点击搜索按钮，并在搜索历史中点击第一个匹配的关键词。
// @note         2026.02.27 V2.0.3.5 虎嗅增强：采用“虎嗅网自动点击搜索按钮并选择首个搜索历史（db版）”的重试机制，确保搜索面板可靠打开。
// @note         2026.02.28 V2.0.3.6 虎嗅增强：若历史关键词不匹配或无历史，则自动填入关键词并执行搜索，确保新词被注入历史。
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

    // ===================== 1. 全局工具函数 =====================
    const getSearchKeyword = () => {
        const input = document.querySelector('#chat-input-main, #kw, input[name="wd"], input[name="word"]');
        if (input && input.value) return input.value;
        const params = new URLSearchParams(location.search);
        const kw = params.get('wd') || params.get('word') || params.get('q');
        if (kw) return decodeURIComponent(kw);
        const titleMatch = document.title.match(/(.+?) - 百度搜索/);
        return titleMatch ? titleMatch[1] : '';
    };

    const openAllWindows = (urls) => {
        if (!urls || !urls.length) return;
        urls.forEach((url, i) => {
            setTimeout(() => {
                window.open(url, `_blank_${i}_${Date.now()}`, 'noopener,noreferrer');
            }, i * 300);
        });
    };

    const debounce = (fn, wait) => {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), wait);
        };
    };

    // ===================== 2. 核心工具函数 ======================
    const MyApi = (() => {
        const safeFunc = (callback, catchCallback = () => {}) => {
            try { return callback(); } catch (e) { console.log('[AutoPager] 执行异常:', e); return catchCallback(); }
        };

        const safeWaitFunc = async (selector, callbackFunc = () => {}, findTick = 200, clearAfterFind = true, timeout = 20000, errCallback) => {
            if (findTick < 20) findTick = 20;
            let count = timeout / findTick;
            let t_id = null;
            const firstSuccess = await mainRunFunc();
            if (!clearAfterFind || !firstSuccess) t_id = setInterval(mainRunFunc, findTick);

            async function strRun() {
                let hasFind = false;
                const selectRes = document.querySelectorAll(selector);
                if (selectRes.length >= 1) { hasFind = true; if (clearAfterFind) clearId(); await callbackFunc(selectRes[0]); }
                return hasFind;
            }
            async function funcRun() {
                let hasFind = false;
                const res = selector();
                if (res && res.length > 0) { hasFind = true; if (clearAfterFind) clearId(); await callbackFunc(res[0]); }
                else if (res) { hasFind = true; if (clearAfterFind) clearId(); await callbackFunc(); }
                return hasFind;
            }
            async function mainRunFunc() {
                if (count-- < 0) { clearId(); errCallback && errCallback(); return false; }
                return typeof selector === 'string' ? await strRun() : await funcRun();
            }
            function clearId() { if (t_id) clearInterval(t_id); }
        };

        const getUrlAttribute = (baseUrl = location.href, attribute) => {
            const [, search = ''] = baseUrl.split('?');
            const searchValue = search.split('&');
            for (let i = 0; i < searchValue.length; i++) {
                const [key, value] = searchValue[i].split('=');
                if (key === attribute) return decodeURIComponent(value || '');
            }
            return null;
        };

        const http = {
            async get(url) {
                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        url, fetch: true, method: 'GET', timeout: 10000,
                        onload: resp => resolve([null, resp.responseText, resp.responseHeaders]),
                        onerror: resp => resolve([resp, '', {}]),
                        ontimeout: () => resolve([new Error('请求超时'), '', {}])
                    });
                });
            }
        };

        const waitTime = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const debounce = (fn, delay) => { let timer; return function () { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, arguments), delay); }; };

        const getAllElementsByXpath = (xpath, contextNode = document, doc = document) => {
            const result = [];
            try {
                const query = doc.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (let i = 0; i < query.snapshotLength; i++) {
                    const node = query.snapshotItem(i);
                    if (node.nodeType === 1) result.push(node);
                }
            } catch (err) { console.error('[AutoPager] XPath解析失败:', xpath, err); }
            return result;
        };

        const getAllElements = (selector, contextNode = document, doc = document) => {
            if (!selector) return [];
            contextNode = contextNode || doc;
            if (typeof selector === 'string') {
                if (selector.startsWith('css;')) return Array.from(contextNode.querySelectorAll(selector.slice(4)));
                else return getAllElementsByXpath(selector, contextNode, doc);
            } else if (typeof selector === 'function') {
                const res = selector(doc);
                return Array.isArray(res) ? res : [];
            }
            return [];
        };

        return { safeFunc, safeWaitFunc, getUrlAttribute, http, waitTime, debounce, getAllElementsByXpath, getAllElements };
    })();

    // ===================== 3. 翻页核心类 =====================
    class SitePagerConfig {
        constructor() {
            this.siteName = this._detectSite();
            this.pagerConfig = this._getFullPagerConfig();
        }
        _detectSite() {
            const host = location.host; const path = location.pathname;
            if (host.includes('baidu.com')) return path.includes('xueshu') ? 'baidu_xueshu' : 'baidu';
            if (host.includes('google.')) return path.includes('scholar') ? 'google_scholar' : 'google';
            if (host.includes('bing.')) return 'bing';
            if (host.includes('so.com')) return 'haosou';
            if (host.includes('duckduckgo.com') || host.includes('dogedoge.com')) return 'duck';
            return '';
        }
        _getFullPagerConfig() {
            const centerStyle = `
                .autopagerize_page_info { margin:15px 0 !important; padding:10px !important; border-top:1px solid #eee !important; border-bottom:1px solid #eee !important; color:#666 !important; text-align:center !important; width:100% !important; clear:both !important; font-size:14px !important; }
                #content_left .autopagerize_page_info { margin-left:-85px !important; }
                div.sp-separator {margin-bottom:10px !important;}
                .c-img-border{display:none}
            `;
            const configs = {
                baidu: {
                    nextLink: ["//div[@id='page']//a[contains(span/text(), '下一页')]", "//*[@id='page']/div/a[span[contains(text(),'下')]]", "//*[@id='page']/div/a[span[contains(text(),'上')]]"],
                    pageElement: ["css;div#content_left > *", "//*[@id=\"content_left\"]/*", "//*[@id=\"content_style\"]/style/following-sibling::*|//*[@id=\"content_left\"]/*"],
                    HT_insert: ["css;div#content_left", 2], replaceE: "css;#page", stylish: centerStyle, pageInfoText: (pageNum) => `—— 已加载第 ${pageNum} 页 ——`
                },
                baidu_xueshu: {
                    nextLink: '//div[@id="page"]//a[contains(span/text(), "下一页")]', pageElement: "css;div#content_left .result",
                    HT_insert: ["css;div#content_left", 2], replaceE: "css;#page", stylish: centerStyle, pageInfoText: (pageNum) => `—— 百度学术第 ${pageNum} 页 ——`
                },
                google: {
                    nextLink: ["css;a[aria-label='下一页'], a[aria-label='Next page'], a#pnnext", "id('pnnext')|id('navbar navcnt nav')//td[span]/following-sibling::td[1]/a|id('nn')/parent::a", "id('main')[not(id('rso botstuff'))]/footer//a[@aria-label and contains(@href, 'start=') and contains(., '>')]", "css;a.nBDE1b.G5eFlf[aria-label='下一页']"],
                    pageElement: ["css;#rso > div:not([jscontroller='SC7lYd']):not([class*='nav'])", "id('rso')|id('center_col')/style[contains(.,'relative')]", "id('main')/div[not(@*)][.//a//h3 or .//a/accordion-entry-search-icon]"],
                    HT_insert: [["css;#rso", 2], ["id('main')", 2]], replaceE: '//table[@class="AaVjTc"]', stylish: centerStyle, pageInfoText: (pageNum) => `—— Google Search Page ${pageNum} ——`, afertPagerAutoCallFunc: () => {}
                },
                google_scholar: {
                    nextLink: '//a[./span[@class="gs_ico gs_ico_nav_next"]]', pageElement: '//div[@class="gs_r gs_or gs_scl"]',
                    HT_insert: ["css;#gs_res_ccl_mid", 2], replaceE: '//div[@id="navcnt"] | //div[@id="rcnt"]//div[@role="navigation"]', stylish: centerStyle, pageInfoText: (pageNum) => `—— Google Scholar Page ${pageNum} ——`
                },
                bing: {
                    nextLink: ["//a[@aria-label='下一页'] | //a[contains(@class,'sb_pagN')]", "css;a[title='Next page'], a.sb_pagN, a.sb_halfnext, a.sb_fullnpl"],
                    pageElement: ["id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]", "css;ol#b_results > li.b_algo"],
                    HT_insert: [["css;ol#b_results", 2], ["id(\"b_results\")/li[@class=\"b_pag\"]", 1]], replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]", stylish: centerStyle, pageInfoText: (pageNum) => `—— 必应搜索第 ${pageNum} 页 ——`
                },
                haosou: {
                    nextLink: "//div[@id='page']//a[text()='下一页>'] | id('snext')", pageElement: "//div[@id='container']/div[@id='main']/ul[@class='result']/li",
                    HT_insert: ["//div[@id='container']//ul[@class='result']", 2], replaceE: "id('page')", stylish: centerStyle, pageInfoText: (pageNum) => `—— 360好搜第 ${pageNum} 页 ——`,
                    afertPagerAutoCallFunc: () => { if (unsafeWindow.So?.web?.lazyLoad?.init) unsafeWindow.So.web.lazyLoad.init(); }
                },
                duck: {
                    nextLink: "//a[contains(@class,\"sb_pagN\")]", pageElement: "id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]",
                    HT_insert: ["id(\"b_results\")/li[@class=\"b_pag\"]", 1], replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]", stylish: centerStyle, pageInfoText: (pageNum) => `—— DuckDuckGo第 ${pageNum} 页 ——`
                }
            };
            return configs[this.siteName] || null;
        }
    }

    class AutoPager {
        constructor() {
            this.config = new SitePagerConfig().pagerConfig;
            this.isLoading = false; this.pageNum = 1; this.nextPageUrl = null;
            this.init();
            this.interval = setInterval(() => { if (!this.nextPageUrl) this.updateNextPageUrl(); }, 2000);
        }
        async init() {
            if (!this.config) { console.log('[AutoPager] 当前站点无翻页配置'); return; }
            await MyApi.waitTime(this.config.siteName === 'google' ? 1200 : 800);
            this.updateNextPageUrl(); this.bindScrollListener(); this.initStyle();
        }
        updateNextPageUrl(tempDoc = document) {
            let nextLinkNode = null;
            if (Array.isArray(this.config.nextLink)) {
                for (const sel of this.config.nextLink) {
                    const nodes = MyApi.getAllElements(sel, tempDoc, tempDoc);
                    if (nodes.length) { nextLinkNode = nodes[0]; console.log('[AutoPager] 使用 nextLink 选择器:', sel); break; }
                }
            } else {
                const nodes = MyApi.getAllElements(this.config.nextLink, tempDoc, tempDoc);
                if (nodes.length) nextLinkNode = nodes[0];
            }
            if (nextLinkNode) { this.nextPageUrl = nextLinkNode.href; console.log('[AutoPager] 找到下一页链接:', this.nextPageUrl); }
            else { console.log('[AutoPager] 未找到下一页链接'); this.nextPageUrl = null; }
        }
        initStyle() { if (!this.config.stylish) return; const style = document.createElement('style'); style.textContent = this.config.stylish; document.head.appendChild(style); }
        bindScrollListener() {
            const scrollHandler = MyApi.debounce(async () => {
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                const clientHeight = document.documentElement.clientHeight || window.innerHeight;
                const triggerDistance = this.config.siteName === 'google' ? 1500 : 1200;
                if (scrollTop + clientHeight >= scrollHeight - triggerDistance && !this.isLoading) await this.loadNextPage();
            }, 500);
            window.addEventListener('scroll', scrollHandler); scrollHandler();
        }
        async loadNextPage() {
            this.isLoading = true;
            try {
                if (!this.nextPageUrl) { console.log('[AutoPager] 无更多页面（未找到下一页链接）'); this.isLoading = false; return; }
                const nextUrl = this.nextPageUrl; this.pageNum++;
                console.log(`[AutoPager] 加载第${this.pageNum}页:`, nextUrl);
                const [err, respText] = await MyApi.http.get(nextUrl);
                if (err || !respText) { console.error('[AutoPager] 页面请求失败:', err); this.isLoading = false; return; }
                const tempDoc = new DOMParser().parseFromString(respText, 'text/html');
                let pageElements = [];
                if (Array.isArray(this.config.pageElement)) {
                    for (const sel of this.config.pageElement) {
                        const nodes = MyApi.getAllElements(sel, tempDoc, tempDoc);
                        if (nodes.length) { pageElements = nodes; console.log('[AutoPager] 使用 pageElement 选择器:', sel); break; }
                    }
                } else if (typeof this.config.pageElement === 'function') { pageElements = this.config.pageElement(tempDoc) || []; }
                else { pageElements = MyApi.getAllElements(this.config.pageElement, tempDoc, tempDoc); }
                if (!pageElements.length) { console.log('[AutoPager] 未提取到页面内容'); this.isLoading = false; return; }
                await this.insertPageContent(pageElements, tempDoc);
                this.updateNextPageUrl(tempDoc); this.replacePagerBar();
                console.log(`[AutoPager] 第${this.pageNum}页加载完成`);
            } catch (e) { console.error('[AutoPager] 翻页异常:', e); } finally { this.isLoading = false; }
        }
        async insertPageContent(pageElements, tempDoc) {
            let insertSelector, insertPos;
            if (Array.isArray(this.config.HT_insert) && Array.isArray(this.config.HT_insert[0])) {
                for (const [sel, pos] of this.config.HT_insert) {
                    let node = MyApi.getAllElements(sel)[0];
                    if (node) { insertSelector = sel; insertPos = pos; console.log('[AutoPager] 使用插入点:', sel); break; }
                }
            } else { [insertSelector, insertPos] = this.config.HT_insert || []; }
            if (!insertSelector || insertPos === undefined) { console.log('[AutoPager] 未找到可用的插入点'); return; }
            let insertNode = MyApi.getAllElements(insertSelector)[0];
            if (!insertNode && this.config.siteName === 'google') {
                insertNode = MyApi.getAllElements('css;#center_col')[0];
                if (!insertNode) insertNode = MyApi.getAllElements('css;footer')[0];
            }
            if (!insertNode) { console.log('[AutoPager] 插入节点不存在'); return; }
            const pageInfoDiv = document.createElement('div'); pageInfoDiv.className = 'autopagerize_page_info'; pageInfoDiv.textContent = this.config.pageInfoText(this.pageNum);
            if (insertPos === 1) insertNode.before(pageInfoDiv); else insertNode.append(pageInfoDiv);
            pageElements.forEach(el => {
                if (el.textContent.trim() === '') return;
                const newEl = document.importNode(el, true);
                if (insertPos === 1) insertNode.before(newEl); else insertNode.append(newEl);
            });
            if (this.config.afertPagerAutoCallFunc) {
                const scriptElements = MyApi.getAllElements('css;script', tempDoc, tempDoc);
                this.config.afertPagerAutoCallFunc(pageElements, scriptElements, insertNode);
            }
        }
        replacePagerBar() {
            if (!this.config.replaceE) return;
            const replaceNodes = MyApi.getAllElements(this.config.replaceE);
            replaceNodes.forEach(node => {
                if (this.config.siteName === 'google') { node.style.visibility = 'hidden'; node.style.height = '0'; }
                else node.style.display = 'none';
            });
        }
    }

    // ===================== 4. 样式定义 =====================
    const buttonStyle = `display:inline-block; font-size:14px; text-align:center; text-decoration:none; width:100px; height:33px; line-height:33px; margin:0 5px; -webkit-appearance:none; -webkit-border-radius:4px; border:0; color:#fff; letter-spacing:1px; outline:medium; cursor:pointer;`;
    const containerStyle = `position:absolute; top:40px; left:0; transform:translateX(0px); padding:10px 0; width:100%; z-index:999;`;

    const injectGlobalStyles = () => {
        GM_addStyle(`
            #content_right { display: none !important; }
            .options_2Vntk { margin-top: 0px !important; }
            .tag-scroll_3EMBO { margin-top: 0px !important; padding-bottom: 0px !important; }
            ._content-border_1q9is_4 { background-color: transparent !important; }
            #head { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; z-index: 999999 !important; background: #fff !important; }
            body { padding-top: ${PAGE_TOP}px !important; }
            #s_tab, #content_left, .result-molecule[tpl="app/search-tool"] { overflow: visible !important; }
            #s_tab { z-index: 99999 !important; }
            #s_tab_inner { margin-top: ${NAV_MARGIN_TOP}px !important; }
            #content_left { margin-top: ${TOOL_MARGIN_TOP}px !important; z-index: 9999 !important; }
            .result-molecule[tpl="app/search-tool"] { margin-bottom: ${CONTENT_MARGIN_TOP}px !important; z-index: 1000 !important; }
            #tsn_inner { z-index: 1001 !important; background: #fff !important; }
            #content_left { width: 100% !important; max-width: 800px !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
            body[baidu] { background-color: #DEF1EF !important; }
            #content_left .result, #content_left .c-container, #content_left [class*="result"] {
                background: #DEF1EF !important; border: 1px solid #B8D9B5 !important; border-radius: 2px !important; box-shadow: 0 1px 4px 0 rgba(0,0,0,0.14) !important; margin-bottom: 16px !important; padding: 20px 25px !important; transition: all 0.3s ease !important;
            }
            #content_left .result:hover, #content_left .c-container:hover {
                box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important; border-color: #3D7CD4 !important; transform: scale(1.00) translateY(-2px) !important; background: #d4edea !important;
            }
            #content_left .result h3, #content_left .c-container h3, #content_left .result .t, #content_left .c-container .t {
                background: transparent !important; margin: 0 0 8px 0 !important; padding: 0 !important; border: none !important; font-size: 18px !important; font-weight: 600 !important; line-height: 1.4 !important;
            }
            #content_left .result h3 a, #content_left .c-container h3 a { color: #3476d2 !important; text-decoration: none !important; }
            #content_left .result h3 a:hover { color: #7CA5E0 !important; text-decoration: underline !important; }
            #content_left .result .c-abstract, #content_left .c-container .c-abstract, #content_left .result [class*="summary"] { color: #2c3e50 !important; font-size: 14px !important; line-height: 1.6 !important; margin: 4px 0 8px 0 !important; }
            #content_left .result .c-showurl, #content_left .c-container .c-showurl, #content_left .result .source-container_3WKXu { color: #4CAF50 !important; font-size: 13px !important; margin-top: 4px !important; border-top: 1px dashed #B8D9B5 !important; padding-top: 8px !important; }
            #content_left .result .c-showurl a, #content_left .c-container .c-showurl a { color: #3476d2 !important; text-decoration: none !important; }
            #content_left .result .c-tools, #content_left .c-container .c-tools { margin-top: 8px !important; font-size: 13px !important; }
            #page a, #page strong { background: #fff !important; border-radius: 2px !important; border: none !important; color: #424242 !important; padding: 8px 12px !important; margin: 0 4px !important; }
            #page strong { background: #4285F4 !important; color: #fff !important; }
        `);
    };

    // ===================== 5. 百度页面模块 =====================
    const initBaiduPage = () => {
        injectGlobalStyles();
        let lastRefreshTime = 0;
        const ensureFormPadding = () => { let form = document.querySelector('.s_form.s_form_fresh, .s_form'); if (form) form.style.paddingBottom = '40px'; };
        const scheduleRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) return;
            lastRefreshTime = now;
            setTimeout(() => { console.log('[Baidu++] 检测到内容变化，执行强制刷新'); window.scrollTo(0, 0); location.reload(); }, 50);
        };
        const hideAds = () => { $('.c-container').filter(function() { return $(this).find('.f13 span:contains("广告")').length > 0; }).hide(); };
        const initBaiduButtons = (container) => {
            hideAds();
            const adObserver = new MutationObserver(() => hideAds());
            const contentLeft = document.querySelector('#content_left');
            if (contentLeft) adObserver.observe(contentLeft, { childList: true, subtree: true });

            const btnContainer = $(`<div style="${containerStyle}"></div>`).appendTo(container);
            const isHomePage = !location.search.includes('wd=') && !location.search.includes('word=') && (location.pathname === '/' || location.pathname === '');
            if (isHomePage) btnContainer.hide();

            const buttons = [
                { id: 'social', text: '社交问答', bg: '#66CC00', border: '#00CC00', hover: '#33CC00', urls: (kw) => [`https://so.toutiao.com/search?dvpf=pc&source=input&keyword=${kw}`, `https://s.weibo.com/weibo?q=${kw}&Refer=top`, `https://www.xiaohongshu.com/search_result?keyword=${kw}&source=web_search`, `https://www.douyin.com/search/${kw}`, `https://search.bilibili.com/all?keyword=${kw}&order=pubdate`, `https://www.zhihu.com/search?type=content&q=${kw}`, `https://www.ithome.com/search/${kw}.html`, `https://so.mydrivers.com/default.htm#q=${kw}`] },
                { id: 'finance', text: '财经搜索', bg: '#6633FF', border: '#3333FF', hover: '#3333FF', urls: (kw) => [`https://www.huxiu.com/#q=${kw}`, `https://zhannei.baidu.com/cse/search?q=${kw}&item=3&range=0&s=2942127813356630428&entry=1`, `https://www.cls.cn/searchPage?keyword=${kw}&type=all`, `https://www.yicai.com/search?keys=${kw}`, `https://xueqiu.com/k?q=${kw}`, `https://wallstreetcn.com/search?q=${kw}`] },
                { id: 'soft_pojie', text: '软件搜索', bg: '#FF9966', border: '#FF9900', hover: '#FF9933', urls: (kw) => [`https://github.com/search?q=${kw}`, `https://www.baidu.com/s?wd=${kw}%20site:www.52pojie.cn`, `https://www.baidu.com/s?wd=${kw}%20site:geekotg.com`, `https://www.baidu.com/s?wd=${kw}%20site:weidown.com`, `https://www.ypojie.com/?s=${kw}`, `http://www.th-sjy.com/?s=${kw}`, `https://www.sixyin.com/?s=${kw}&type=post`, `http://www.qiuquan.cc/?s=${kw}`, `http://www.dayanzai.me/?s=${kw}`, `https://search.gndown.com/?s=${kw}`, `https://www.ghpym.com/?s=${kw}`] },
                { id: 'magnet_torrent_baidupan', text: '网盘搜索', bg: '#3385ff', border: '#2d78f4', hover: '#317ef3', urls: (kw) => [`https://www.pandashi8.com/search?keyword=${kw}`, `https://www.pikasoo.top/search/?pan=all&q=${kw}`, `https://btdig.com/search?q=${kw}`, `https://bt4g.org/search?q=${kw}`, `https://thepiratebay.org/search/${kw}/`, `https://kickass.sx/usearch/${kw}/`, `https://www.baidu.com/s?wd=${kw}%20百度网盘`] },
                { id: 'bing', text: 'Bing搜索', bg: '#008373', border: '#006b5f', hover: '#006b5f', urls: (kw) => [`https://www.bing.com/search?q=${kw}`] },
                { id: 'google', text: 'Google搜索', bg: '#CC3333', border: '#CC0033', hover: '#CC0033', urls: (kw) => [`https://www.google.com/search?q=${kw}`] }
            ];
            buttons.forEach(btn => {
                const $btn = $(`<input type="button" id="${btn.id}" value="${btn.text}" style="${buttonStyle} background:${btn.bg}; border-bottom:1px solid ${btn.border};" onmouseover="this.style.background='${btn.hover}'" onmouseout="this.style.background='${btn.bg}'">`).appendTo(btnContainer);
                $btn.on('click', () => { const kw = encodeURIComponent(getSearchKeyword()); if (kw) openAllWindows(btn.urls(kw)); });
            });
        };
        ensureFormPadding();
        const paddingObserver = new MutationObserver(() => ensureFormPadding());
        paddingObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        const searchBtn = document.querySelector('#chat-submit-button, #su, .s_btn, input[type="submit"]');
        if (searchBtn) searchBtn.addEventListener('click', scheduleRefresh);
        const searchForm = document.querySelector('#form, form[name="f"]');
        if (searchForm) searchForm.addEventListener('submit', scheduleRefresh);
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.type === 'submit') {
                const text = (target.textContent || target.innerText || '').trim();
                if (/^(更多|展开|更多结果)$/i.test(text)) scheduleRefresh();
            }
            if (target.closest('#chat-submit-button')) scheduleRefresh();
            if (target.closest('#normalSugSearchUl li')) scheduleRefresh();
            if (target.closest('li.bdsug-item')) scheduleRefresh();
            if (target.closest('#rs_new a') || target.closest('.rs-link_2DE3Q')) scheduleRefresh();
            if (target.closest('.list_1V4Yg a') || target.closest('.item_3WKCf')) scheduleRefresh();
        }, true);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.isComposing) {
                const target = e.target;
                if (target.matches && (target.matches('#chat-textarea') || target.matches('#kw'))) scheduleRefresh();
            }
        }, true);
        const observer = new MutationObserver((_, obs) => {
            const searchContainer = $('#chat-input-main').parent();
            if (searchContainer.length) { obs.disconnect(); searchContainer.css('position', 'relative'); initBaiduButtons(searchContainer); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        if (document.querySelector('#content_left')) {
            MyApi.safeFunc(() => {
                if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => new AutoPager());
                else new AutoPager();
            });
        }
    };

    // ===================== 6. Google页面模块 =====================
    const initGooglePage = () => {
        GM_addStyle(`
            .google-baidu-search-container { display: inline-flex !important; align-items: center !important; gap: 8px !important; margin-left: auto !important; vertical-align: middle !important; height: 34px !important; flex-wrap: nowrap !important; }
            .google-baidu-search-container input { width: 200px !important; height: 32px !important; padding: 0 8px !important; border: 1px solid #ccc !important; border-radius: 4px !important; font-size: 14px !important; outline: none !important; box-sizing: border-box !important; flex-shrink: 0 !important; }
            .google-baidu-search-container button { height: 34px !important; padding: 0 10px !important; border: none !important; border-radius: 4px !important; color: white !important; font-size: 14px !important; cursor: pointer !important; transition: background 0.2s !important; box-sizing: border-box !important; flex-shrink: 0 !important; line-height: 34px !important; }
            .google-baidu-search-container .baidu-btn { background: #3385ff !important; }
            .google-baidu-search-container .baidu-btn:hover { background: #317ef3 !important; }
            .google-baidu-search-container .bing-btn { background: #008373 !important; }
            .google-baidu-search-container .bing-btn:hover { background: #006b5f !important; }
        `);
        const createGoogleSearchBar = () => {
            const oldContainer = document.querySelector('.google-baidu-search-container'); if (oldContainer) oldContainer.remove();
            const getGoogleKeyword = () => {
                const input = document.querySelector('input[name="q"]');
                if (input && input.value) return input.value;
                const params = new URLSearchParams(location.search);
                const kw = params.get('q'); if (kw) return decodeURIComponent(kw);
                return '';
            };
            const container = document.createElement('div'); container.className = 'google-baidu-search-container';
            const input = document.createElement('input'); input.type = 'text'; input.placeholder = '输入关键词 百度/Bing搜索'; input.value = getGoogleKeyword();
            const baiduButton = document.createElement('button'); baiduButton.className = 'baidu-btn'; baiduButton.textContent = '百度';
            const bingButton = document.createElement('button'); bingButton.className = 'bing-btn'; bingButton.textContent = 'Bing';
            container.appendChild(input); container.appendChild(baiduButton); container.appendChild(bingButton);
            const navBar = document.querySelector('.HTOhZ, .KP7LCb');
            if (navBar) { if (window.getComputedStyle(navBar).display === 'flex') container.style.marginLeft = 'auto'; navBar.appendChild(container); }
            else {
                const toolBtn = document.querySelector('#hdtb-tls, #st-toggle');
                if (toolBtn) { const parent = toolBtn.parentNode; if (parent) parent.insertBefore(container, toolBtn.nextSibling); }
                else { container.style.position = 'fixed'; container.style.top = '80px'; container.style.right = '20px'; container.style.zIndex = '9999'; container.style.background = '#f8f8f8'; container.style.border = '1px solid #d2d2d2'; container.style.padding = '8px 12px'; container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; document.body.appendChild(container); }
            }
            const doBaiduSearch = () => { const keyword = input.value.trim(); if (!keyword) { alert('请输入关键词'); return; } window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank'); };
            const doBingSearch = () => { const keyword = input.value.trim(); if (!keyword) { alert('请输入关键词'); return; } window.open(`https://www.bing.com/search?q=${encodeURIComponent(keyword)}`, '_blank'); };
            baiduButton.addEventListener('click', doBaiduSearch); bingButton.addEventListener('click', doBingSearch);
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doBaiduSearch(); });
        };
        const googleObserver = new MutationObserver(debounce(createGoogleSearchBar, 300));
        googleObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        createGoogleSearchBar();
        MyApi.safeFunc(() => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => new AutoPager()); else new AutoPager(); });
    };

    // ===================== 7. Bing页面模块 =====================
    const initBingPage = () => {
        GM_addStyle(`
            .bing-search-helper { display: inline-flex; align-items: center; gap: 8px; margin-left: 12px; vertical-align: middle; height: 34px; }
            .bing-search-helper input { width: 200px; height: 32px; padding: 0 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; outline: none; box-sizing: border-box; }
            .bing-search-helper input:focus { border-color: #3385ff; }
            .bing-search-helper button { height: 34px; padding: 0 10px; border: none; border-radius: 4px; color: white; font-size: 14px; cursor: pointer; transition: background 0.2s; box-sizing: border-box; }
            .bing-search-helper .baidu-btn { background: #3385ff; }
            .bing-search-helper .baidu-btn:hover { background: #317ef3; }
            .bing-search-helper .google-btn { background: #CC3333; }
            .bing-search-helper .google-btn:hover { background: #CC0033; }
            .b_scopebar .bing-search-helper { margin-top: 4px; margin-left: 8px; }
        `);
        const createBingSearchBar = () => {
            const oldContainer = document.querySelector('.bing-search-helper'); if (oldContainer) oldContainer.remove();
            const getBingKeyword = () => {
                const input = document.querySelector('input[name="q"], #sb_form_q');
                if (input && input.value) return input.value;
                const params = new URLSearchParams(location.search); const kw = params.get('q'); if (kw) return decodeURIComponent(kw);
                return '';
            };
            const container = document.createElement('div'); container.className = 'bing-search-helper';
            const input = document.createElement('input'); input.type = 'text'; input.placeholder = '输入关键词 百度/Google搜索'; input.value = getBingKeyword();
            const baiduButton = document.createElement('button'); baiduButton.className = 'baidu-btn'; baiduButton.textContent = '百度';
            const googleButton = document.createElement('button'); googleButton.className = 'google-btn'; googleButton.textContent = 'Google';
            container.appendChild(input); container.appendChild(baiduButton); container.appendChild(googleButton);
            const bingMoreLi = document.querySelector('#b-scopeListItem-menu');
            if (bingMoreLi && bingMoreLi.parentNode) bingMoreLi.parentNode.insertBefore(container, bingMoreLi.nextSibling);
            else {
                const bingNavUl = document.querySelector('.b_scopebar > ul');
                if (bingNavUl) bingNavUl.appendChild(container);
                else { container.style.position = 'fixed'; container.style.top = '80px'; container.style.right = '20px'; container.style.zIndex = '9999'; container.style.background = '#f8f8f8'; container.style.border = '1px solid #d2d2d2'; container.style.padding = '8px 12px'; container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; document.body.appendChild(container); }
            }
            const doBaiduSearch = () => { const keyword = input.value.trim(); if (!keyword) { alert('请输入关键词'); return; } window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank'); };
            const doGoogleSearch = () => { const keyword = input.value.trim(); if (!keyword) { alert('请输入关键词'); return; } window.open(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, '_blank'); };
            baiduButton.addEventListener('click', doBaiduSearch); googleButton.addEventListener('click', doGoogleSearch);
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doBaiduSearch(); });
        };
        const bingObserver = new MutationObserver(debounce(createBingSearchBar, 300));
        bingObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        createBingSearchBar();
        MyApi.safeFunc(() => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => new AutoPager()); else new AutoPager(); });
    };

    // ===================== 8. 快科技中转模块 =====================
    const initSoMydrivers = () => {
        $(function() {
            const getKeywordFromHash = () => { const hash = window.location.hash; if (!hash || !hash.startsWith('#q=')) return null; return decodeURIComponent(hash.substring(3)); };
            const keyword = getKeywordFromHash(); if (!keyword) return;
            window.location.hash = ''; console.log('快科技搜索页中转：关键词 =', keyword);
            const waitForElements = setInterval(() => {
                const searchInput = $('#s'); const searchButton = $('#btnsearch');
                if (searchInput.length && searchButton.length) { clearInterval(waitForElements); searchInput.val(keyword); searchButton.click(); }
            }, 200);
            setTimeout(() => { clearInterval(waitForElements); console.warn('等待搜索框或按钮超时'); }, 10000);
        });
    };

    // ===================== 9. 虎嗅网增强模块（最终版） =====================
    // 当URL带有#q=关键词时，优先点击匹配的历史关键词；若不匹配或无历史，则自动填入关键词并执行搜索。
    const initHuxiuPage = () => {
        // ---------- 辅助函数定义 ----------
        const waitForElement = (selector, timeout = 15000, context = document) => {
            return new Promise((resolve, reject) => {
                const el = context.querySelector(selector);
                if (el) return resolve(el);
                const observer = new MutationObserver(() => {
                    const found = context.querySelector(selector);
                    if (found) { observer.disconnect(); resolve(found); }
                });
                observer.observe(context, { childList: true, subtree: true });
                setTimeout(() => { observer.disconnect(); reject(new Error(`等待元素超时: ${selector}`)); }, timeout);
            });
        };

        const simulateFullClick = (element) => {
            if (!element) return;
            const rect = element.getBoundingClientRect();
            const clientX = rect.left + rect.width / 2;
            const clientY = rect.top + rect.height / 2;
            const view = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            const events = ['mousedown', 'mouseup', 'click'];
            events.forEach(type => {
                const evt = new MouseEvent(type, { view, bubbles: true, cancelable: true, clientX, clientY });
                element.dispatchEvent(evt);
            });
            console.log('✅ 已触发完整鼠标点击:', element);
        };

        const isSearchPanelOpen = () => {
            const history = document.querySelector('.search-history__history-items, .search-history');
            return history && history.offsetParent !== null;
        };

        const clickSearchBtnWithRetry = async (btn, maxRetry = 3) => {
            for (let i = 0; i < maxRetry; i++) {
                simulateFullClick(btn);
                await new Promise(resolve => setTimeout(resolve, 500));
                if (isSearchPanelOpen()) {
                    console.log(`✅ 搜索悬浮面板已成功打开（重试次数：${i + 1}）`);
                    return true;
                }
                console.log(`⚠️ 搜索面板未打开，重试点击（次数：${i + 1}）`);
            }
            throw new Error('多次点击搜索按钮仍未打开悬浮面板');
        };

        // ---------- 主逻辑 ----------
        const getKeywordFromHash = () => {
            const hash = window.location.hash;
            if (!hash || !hash.startsWith('#q=')) return null;
            return decodeURIComponent(hash.substring(3));
        };

        const keyword = getKeywordFromHash();
        if (!keyword) {
            console.log('虎嗅网：无传入关键词，不执行操作');
            return;
        }

        window.location.hash = '';
        console.log('虎嗅网：检测到传入关键词，准备操作:', keyword);

        (async () => {
            try {
                // 1. 等待搜索按钮加载
                let searchBtn = document.querySelector('svg.search-btn.pointer');
                if (!searchBtn) {
                    searchBtn = await waitForElement('.search-icon-container, .search-btn');
                }

                // 2. 使用重试机制点击搜索按钮并等待面板打开
                await clickSearchBtnWithRetry(searchBtn);

                // 3. 等待历史容器出现
                const historyContainer = await waitForElement('.search-history__history-items');

                // 4. 检查是否有历史关键词
                const firstItemSpan = historyContainer.querySelector('.hx-tag-closable:first-child span');
                if (firstItemSpan) {
                    const firstText = firstItemSpan.textContent.trim();
                    if (firstText.includes(keyword) || keyword.includes(firstText)) {
                        simulateFullClick(firstItemSpan);
                        console.log(`✅ 已点击第一个历史关键词: "${firstText}"，匹配传入词: "${keyword}"`);
                        return; // 成功，退出
                    } else {
                        console.log(`⚠️ 第一个历史关键词 "${firstText}" 与传入词 "${keyword}" 不匹配，将执行自动搜索`);
                    }
                } else {
                    console.log('📭 历史容器内无任何关键词，将执行自动搜索');
                }

                // 5. 回退方案：执行填词搜索
                // 等待搜索输入框出现（面板已开，应该很快）
                const searchInput = await waitForElement('.search-input input[placeholder="搜索文章"]');
                // 填入关键词
                searchInput.value = keyword;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                // 点击搜索提交按钮
                const searchSubmit = await waitForElement('.search-input .icon-search, .search-input .icon-search-show');
                simulateFullClick(searchSubmit);
                console.log(`✅ 已执行自动搜索关键词: "${keyword}"`);
            } catch (e) {
                console.error('❌ 虎嗅自动操作失败:', e);
            }
        })();
    };

    // ===================== 10. 脚本入口 =====================
    GM_registerMenuCommand("反馈建议", () => window.open("https://greasyfork.org/zh-CN/scripts/396960/feedback"));

    if (/baidu\./.test(hostname)) {
        initBaiduPage();
    } else if (/google\./.test(hostname)) {
        initGooglePage();
    } else if (/bing\./.test(hostname) && location.pathname === '/search') {
        initBingPage();
    } else if (hostname === 'so.mydrivers.com' && location.pathname === '/default.htm') {
        initSoMydrivers();
    } else if (/huxiu\.com/.test(hostname)) {
        initHuxiuPage();
    }
})();