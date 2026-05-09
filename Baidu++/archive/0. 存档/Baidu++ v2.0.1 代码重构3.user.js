// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、抖音、小红书、Google、Bing搜索，为Google/Bing添加百度/Google/Bing辅助搜索框
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google、Bing搜索按钮，一键跳转到Google/Bing；在Google搜索结果页添加百度/Bing搜索框；在Bing搜索结果页添加百度/Google搜索框。支持各个搜索引擎自动翻页，去除百度结果页面的广告和右边栏。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.0
// @author       ddrwin
// @run-at       document-end
// @match        *://www.baidu.com/*
// @match        *://*.baidu.com/s*
// @match        *://*.baidu.com/baidu*
// @match        *://www.google.com/search*
// @match        *://www.google.com.*/search*
// @match        *://www.bing.com/search*
// @match        *://so.mydrivers.com/default.htm*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @note         2020.02.22 V1.0 在百度搜索结果页加入磁力、种子、网盘、Google 搜索按钮
// @note         2020.02.23 V1.1 在 Google 搜索结果页加入百度搜索按钮
// @note         2020.02.25 V1.2 增加软件搜索、头条搜索、哔哩哔哩搜索
// @note         2020.02.26 V1.3 重写代码，将种子 / 磁力搜索集成到网盘搜索，软件搜索增加多个网址
// @note         2020.02.27 V1.4 头条 / B 站集成到头条搜索，知乎 / CSDN 集成到问答搜索
// @note         2020.05.30 V1.5 网盘搜索新增结果，软件搜索增加大眼仔 / 微当等，问答搜索增加微信搜索 / 百度知道
// @note         2021.03.04 V1.6 网盘搜索更新，软件搜索去除失效链接，问答搜索增加今日头条
// @note         2022.01.23 V1.7 合并软件 / 破解搜索，问答搜索增加 B 站 / 驱动之家，增加行研搜索
// @note         2022.03.03 V1.8 更新网盘搜索，问答搜索增加 IT 之家，去除失效入口
// @note         2024.01.29 V1.9 更新软件搜索，AI 问答增加文心一言 / 讯飞星火 / 天工
// @note         2025.11.30 V1.9.5 修复关键词获取问题，确保所有按钮正确传递搜索词
// @note         2026.02.19 V1.9.9 新增 Bing 搜索支持（百度页 Bing 按钮、Google/Bing 页内联搜索框），卡片美化样式，精准间距控制
// @note         2026.02.21 V2.0 核心更新：新增强制刷新机制（点击翻页/更多/搜索触发），优化异步刷新后按钮稳定性，完善快科技搜索中转，修复层级遮挡问题，整合所有功能优化执行效率；修复首页跳转脚本未运行问题，匹配规则统一为 *://www.baidu.com/*；整合自动翻页功能，优化Google翻页按钮显示及内容拼接逻辑，模块化重构代码结构
// ==/UserScript==

(function() {
    'use strict';
    const hostname = location.hostname;

    // ========== 百度搜索结果页间距调整参数（按需修改） ==========
    const PAGE_TOP = 40;
    const NAV_MARGIN_TOP = 0;
    const TOOL_MARGIN_TOP = 0;
    const CONTENT_MARGIN_TOP = 10;
    const MIN_REFRESH_INTERVAL = 1000; // 最小刷新间隔

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

    // 防抖函数
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
            try {
                return callback();
            } catch (e) {
                console.log('[AutoPager] 执行异常:', e);
                return catchCallback();
            }
        };

        const safeWaitFunc = async (selector, callbackFunc = () => {}, findTick = 200, clearAfterFind = true, timeout = 20000, errCallback) => {
            if (findTick < 20) findTick = 20;
            let count = timeout / findTick;
            let t_id = null;

            const firstSuccess = await mainRunFunc();
            if (!clearAfterFind || !firstSuccess) {
                t_id = setInterval(mainRunFunc, findTick);
            }

            async function strRun() {
                let hasFind = false;
                const selectRes = document.querySelectorAll(selector);
                if (selectRes.length >= 1) {
                    hasFind = true;
                    if (clearAfterFind) clearId();
                    await callbackFunc(selectRes[0]);
                }
                return hasFind;
            }

            async function funcRun() {
                let hasFind = false;
                const res = selector();
                if (res && res.length > 0) {
                    hasFind = true;
                    if (clearAfterFind) clearId();
                    await callbackFunc(res[0]);
                } else if (res) {
                    hasFind = true;
                    if (clearAfterFind) clearId();
                    await callbackFunc();
                }
                return hasFind;
            }

            async function mainRunFunc() {
                if (count-- < 0) {
                    clearId();
                    errCallback && errCallback();
                    return false;
                }
                return typeof selector === 'string' ? await strRun() : await funcRun();
            }

            function clearId() {
                if (t_id) clearInterval(t_id);
            }
        };

        const getUrlAttribute = (baseUrl = location.href, attribute) => {
            const [, search = ''] = baseUrl.split('?');
            const searchValue = search.split('&');
            for (let i = 0; i < searchValue.length; i++) {
                const [key, value] = searchValue[i].split('=');
                if (key === attribute) {
                    return decodeURIComponent(value || '');
                }
            }
            return null;
        };

        const http = {
            async get(url) {
                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        url,
                        fetch: true,
                        method: 'GET',
                        timeout: 10000,
                        onload: resp => resolve([null, resp.responseText, resp.responseHeaders]),
                        onerror: resp => resolve([resp, '', {}]),
                        ontimeout: () => resolve([new Error('请求超时'), '', {}])
                    });
                });
            }
        };

        const waitTime = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const debounce = (fn, delay) => {
            let timer = null;
            return function () {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, arguments), delay);
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
            } catch (err) {
                console.error('[AutoPager] XPath解析失败:', xpath, err);
            }
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

        return {
            safeFunc,
            safeWaitFunc,
            getUrlAttribute,
            http,
            waitTime,
            debounce,
            getAllElementsByXpath,
            getAllElements
        };
    })();

    // ===================== 3. 翻页核心类 =====================
    class SitePagerConfig {
        constructor() {
            this.siteName = this._detectSite();
            this.pagerConfig = this._getFullPagerConfig();
        }

        _detectSite() {
            const host = location.host;
            const pathname = location.pathname;

            if (host.includes('baidu.com')) {
                return pathname.includes('xueshu') ? 'baidu_xueshu' : 'baidu';
            } else if (host.includes('google.com') || host.includes('google.')) {
                return pathname.includes('scholar') ? 'google_scholar' : 'google';
            } else if (host.includes('bing.com')) {
                return 'bing';
            } else if (host.includes('so.com')) {
                return 'haosou';
            } else if (host.includes('duckduckgo.com') || host.includes('dogedoge.com')) {
                return 'duck';
            }
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
                /* 百度结果页的翻页提示左移85px（可调整此值） */
                #content_left .autopagerize_page_info {
                    margin-left: -85px !important;
                }
                div.sp-separator {margin-bottom: 10px !important;}
                .c-img-border{display:none}
            `;

            const configs = {
                baidu: {
                    nextLink: '//div[@id="page"]//a[contains(span/text(), "下一页")]',
                    pageElement: "css;div#content_left > *",
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
                    nextLink: '//a[@id="pnnext"]',
                    pageElement: "css;#rso > div:not([jscontroller='SC7lYd']):not([class*='nav'])",
                    HT_insert: ["css;#rso", 2],
                    replaceE: '//table[@class="AaVjTc"]',
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Search Page ${pageNum} ——`,
                    afertPagerAutoCallFunc: (pageElements, scriptElements, toElement) => {
                        scriptElements.forEach((one) => {
                            const newScript = document.createElement('script');
                            newScript.textContent = one.textContent;
                            newScript.type = one.type;
                            newScript.nonce = one.nonce;
                            try { toElement.appendChild(newScript); } catch (e) {}
                        });
                    }
                },
                google_scholar: {
                    nextLink: '//a[./span[@class="gs_ico gs_ico_nav_next"]]',
                    pageElement: '//div[@class="gs_r gs_or gs_scl"]',
                    HT_insert: ["css;#gs_res_ccl_mid", 2],
                    replaceE: '//div[@id="navcnt"] | //div[@id="rcnt"]//div[@role="navigation"]',
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Scholar Page ${pageNum} ——`
                },
				bing: {
				    // 使用 aria-label 或包含 sb_pagN 的类名（两者取其一）
				    nextLink: "//a[@aria-label='下一页'] | //a[contains(@class,'sb_pagN')]",
				    pageElement: "id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]",
				    HT_insert: ["id(\"b_results\")/li[@class=\"b_pag\"]", 1],
				    replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]",
				    stylish: centerStyle,
				    pageInfoText: (pageNum) => `—— 必应搜索第 ${pageNum} 页 ——`
				},
                haosou: {
                    nextLink: "//div[@id='page']//a[text()='下一页>'] | id('snext')",
                    pageElement: "//div[@id='container']/div[@id='main']/ul[@class='result']/li",
                    HT_insert: ["//div[@id='container']//ul[@class='result']", 2],
                    replaceE: "id('page')",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 360好搜第 ${pageNum} 页 ——`,
                    afertPagerAutoCallFunc: () => {
                        if (unsafeWindow.So?.web?.lazyLoad?.init) {
                            unsafeWindow.So.web.lazyLoad.init();
                        }
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

    class AutoPager {
        constructor() {
            this.config = new SitePagerConfig().pagerConfig;
            this.isLoading = false;
            this.pageNum = 1;
            this.nextPageUrl = null;
            this.init();
        }

        async init() {
            if (!this.config) {
                console.log('[AutoPager] 当前站点无翻页配置');
                return;
            }

            await MyApi.waitTime(this.config.siteName === 'google' ? 1200 : 800);
            this.updateNextPageUrl();
            this.bindScrollListener();
            this.initStyle();
        }

        updateNextPageUrl(tempDoc = document) {
            const nextLinkNode = MyApi.getAllElements(this.config.nextLink, tempDoc, tempDoc)[0];
            this.nextPageUrl = nextLinkNode ? nextLinkNode.href : null;
        }

        initStyle() {
            if (!this.config.stylish) return;
            const style = document.createElement('style');
            style.textContent = this.config.stylish;
            document.head.appendChild(style);
        }

        bindScrollListener() {
            const scrollHandler = MyApi.debounce(async () => {
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                const clientHeight = document.documentElement.clientHeight || window.innerHeight;
                const triggerDistance = this.config.siteName === 'google' ? 1500 : 1200;

                if (scrollTop + clientHeight >= scrollHeight - triggerDistance && !this.isLoading) {
                    await this.loadNextPage();
                }
            }, 500);

            window.addEventListener('scroll', scrollHandler);
            scrollHandler();
        }

        async loadNextPage() {
            this.isLoading = true;
            try {
                if (!this.nextPageUrl) {
                    console.log('[AutoPager] 无更多页面（未找到下一页链接）');
                    this.isLoading = false;
                    return;
                }
                const nextUrl = this.nextPageUrl;
                this.pageNum++;

                console.log(`[AutoPager] 加载第${this.pageNum}页:`, nextUrl);
                const [err, respText] = await MyApi.http.get(nextUrl);
                if (err || !respText) {
                    console.error('[AutoPager] 页面请求失败:', err);
                    this.isLoading = false;
                    return;
                }

                const tempDoc = new DOMParser().parseFromString(respText, 'text/html');
                const pageElements = MyApi.getAllElements(this.config.pageElement, tempDoc, tempDoc);
                if (!pageElements.length) {
                    console.log('[AutoPager] 未提取到页面内容');
                    this.isLoading = false;
                    return;
                }

                await this.insertPageContent(pageElements, tempDoc);
                this.updateNextPageUrl(tempDoc);
                this.replacePagerBar();

                console.log(`[AutoPager] 第${this.pageNum}页加载完成`);
            } catch (e) {
                console.error('[AutoPager] 翻页异常:', e);
            } finally {
                this.isLoading = false;
            }
        }

        async insertPageContent(pageElements, tempDoc) {
            const [insertSelector, insertPos] = this.config.HT_insert || [];
            if (!insertSelector || !insertPos) return;

            let insertNode = MyApi.getAllElements(insertSelector)[0];
            if (!insertNode && this.config.siteName === 'google') {
                insertNode = MyApi.getAllElements('css;#center_col')[0];
            }
            if (!insertNode) return;

            const pageInfoDiv = document.createElement('div');
            pageInfoDiv.className = 'autopagerize_page_info';
            pageInfoDiv.textContent = this.config.pageInfoText(this.pageNum);
            if (insertPos === 1) {
                insertNode.before(pageInfoDiv);
            } else {
                insertNode.append(pageInfoDiv);
            }

            pageElements.forEach(el => {
                if (el.textContent.trim() === '') return;
                const newEl = document.importNode(el, true);
                if (insertPos === 1) {
                    insertNode.before(newEl);
                } else {
                    insertNode.append(newEl);
                }
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
                if (this.config.siteName === 'google') {
                    node.style.visibility = 'hidden';
                    node.style.height = '0';
                } else {
                    node.style.display = 'none';
                }
            });
        }
    }

    // ===================== 4. 样式定义 =====================
    const buttonStyle = `
        display: inline-block;
        font-size: 14px;
        text-align: center;
        text-decoration: none;
        width: 100px;
        height: 33px;
        line-height: 33px;
        margin: 0 5px;
        -webkit-appearance: none;
        -webkit-border-radius: 4px;
        border: 0;
        color: #fff;
        letter-spacing: 1px;
        outline: medium;
        cursor: pointer;
    `;
    const containerStyle = `
        position: absolute;
        top: 40px;
        left: 0;
        transform: translateX(0px);
        padding: 10px 0;
        width: 100%;
        z-index: 999;
    `;

    const injectGlobalStyles = () => {
        GM_addStyle(`
            /* 原Baidu++样式：去除广告、右侧栏，护眼色背景等 */
            #content_right { display: none !important; }
            .options_2Vntk { margin-top: 0px !important; }
            .tag-scroll_3EMBO { margin-top: 0px !important; padding-bottom: 0px !important; }
            ._content-border_1q9is_4 { background-color: transparent !important; }

            /* 间距调整样式 */
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

            /* ===== 卡片美化 (增强悬停动画版) ===== */
            #content_left {
                width: 100% !important;
                max-width: 800px !important;
                margin-left: auto !important;
                margin-right: auto !important;
                float: none !important;
            }

            body[baidu] {
                background-color: #DEF1EF !important;
            }

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
            /* 增强悬停动画 (可调整 scale 和 translateY 值) */
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

            /* 翻页按钮保持 Lite 风格 */
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

    // ===================== 5. 百度页面模块 =====================
    const initBaiduPage = () => {
        let lastRefreshTime = 0;

        const ensureFormPadding = () => {
            let form = document.querySelector('.s_form.s_form_fresh');
            if (!form) form = document.querySelector('.s_form');
            if (form) form.style.paddingBottom = '40px';
        };

        const scheduleRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) return;
            lastRefreshTime = now;
            setTimeout(() => {
                console.log('[Baidu++] 检测到内容变化，执行强制刷新');
                window.scrollTo(0, 0);
                location.reload();
            }, 50);
        };

        const hideAds = () => {
            $('.c-container').filter(function() {
                return $(this).find('.f13 span:contains("广告")').length > 0;
            }).hide();
        };

        const initBaiduButtons = (container) => {
            hideAds();
            const adObserver = new MutationObserver(() => hideAds());
            const contentLeft = document.querySelector('#content_left');
            if (contentLeft) adObserver.observe(contentLeft, { childList: true, subtree: true });

            const btnContainer = $(`<div style="${containerStyle}"></div>`).appendTo(container);

            // 判断是否为首页，隐藏按钮容器
            const isHomePage = !location.search.includes('wd=') && !location.search.includes('word=') && (location.pathname === '/' || location.pathname === '');
            if (isHomePage) {
                btnContainer.hide();
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
                        `https://s.weibo.com/weibo?q=${kw}&Refer=top`,
                        `https://www.xiaohongshu.com/search_result?keyword=${kw}&source=web_search`,
                        `https://www.douyin.com/search/${kw}`,
                        `https://search.bilibili.com/all?keyword=${kw}&order=pubdate`,
                        `https://www.zhihu.com/search?type=content&q=${kw}`,
                        `https://www.ithome.com/search/${kw}.html`,
                        `https://so.mydrivers.com/default.htm#q=${kw}`
                    ]
                },
                {
                    id: 'finance',
                    text: '财经搜索',
                    bg: '#6633FF',
                    border: '#3333FF',
                    hover: '#3333FF',
                    urls: (kw) => [
                        `https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&tn=51076811_dg&wd=${kw}%20site:huxiu.com&oq=${kw}%20site:huxiu.com&rsv_pq=825fb96c042e081c&rsv_t=6bdasfrTqWvDmPYUpYiIJz6NGXzSbtW98zxwsZnHtefxFtCQYw1C%2B6hNkh0vBr5wFWU&rqlang=cn&rsv_enter=1&rsv_dl=tb&gpc=stf%3D1768799315%2C1771477715%7Cstftype%3D1&tfflag=1`,
                        `https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&tn=51076811_dg&wd=${kw}%20site:caijing.com.cn&oq=${kw}%20site:caijing.com.cn&rsv_pq=825fb96c042e081c&rsv_t=6bdasfrTqWvDmPYUpYiIJz6NGXzSbtW98zxwsZnHtefxFtCQYw1C%2B6hNkh0vBr5wFWU&rqlang=cn&rsv_enter=1&rsv_dl=tb&gpc=stf%3D1768799315%2C1771477715%7Cstftype%3D1&tfflag=1`,
                        `https://www.cls.cn/searchPage?keyword=${kw}&type=all`,
                        `https://www.yicai.com/search?keys=${kw}`,
                        `https://xueqiu.com/k?q=${kw}`,
                        `https://wallstreetcn.com/search?q=${kw}`
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
                    urls: (kw) => [`https://www.bing.com/search?q=${kw}`]
                },
                {
                    id: 'google',
                    text: 'Google搜索',
                    bg: '#CC3333',
                    border: '#CC0033',
                    hover: '#CC0033',
                    urls: (kw) => [`https://www.google.com/search?q=${kw}`]
                }
            ];

            buttons.forEach(btn => {
                const $btn = $(`<input type="button" id="${btn.id}" value="${btn.text}" style="${buttonStyle} background:${btn.bg}; border-bottom:1px solid ${btn.border};" onmouseover="this.style.background='${btn.hover}'" onmouseout="this.style.background='${btn.bg}'">`).appendTo(btnContainer);
                $btn.on('click', () => {
                    const kw = encodeURIComponent(getSearchKeyword());
                    if (kw) openAllWindows(btn.urls(kw));
                });
            });
        };

        // ---------- 执行初始化 ----------
        ensureFormPadding();
        const paddingObserver = new MutationObserver(() => ensureFormPadding());
        paddingObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // 搜索按钮
        const searchBtn = document.querySelector('#chat-submit-button, #su, .s_btn, input[type="submit"]');
        if (searchBtn) searchBtn.addEventListener('click', scheduleRefresh);

        const searchForm = document.querySelector('#form, form[name="f"]');
        if (searchForm) searchForm.addEventListener('submit', scheduleRefresh);

        // 点击监听（推荐关键词、相关搜索等，不含翻页）
        document.addEventListener('click', function(e) {
            const target = e.target;
            if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.type === 'submit') {
                const text = (target.textContent || target.innerText || '').trim();
                if (/^(更多|展开|更多结果)$/i.test(text)) {
                    scheduleRefresh();
                }
            }
            if (target.closest('#chat-submit-button')) scheduleRefresh();
            if (target.closest('#normalSugSearchUl li')) scheduleRefresh();
            if (target.closest('#rs_new a') || target.closest('.rs-link_2DE3Q')) scheduleRefresh();
            if (target.closest('.list_1V4Yg a') || target.closest('.item_3WKCf')) scheduleRefresh();
        }, true);

        // 搜索框回车
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.isComposing) {
                const target = e.target;
                if (target.matches && (target.matches('#chat-textarea') || target.matches('#kw'))) {
                    scheduleRefresh();
                }
            }
        }, true);

        // 按钮容器监听
        const observer = new MutationObserver((_, obs) => {
            const searchContainer = $('#chat-input-main').parent();
            if (searchContainer.length) {
                obs.disconnect();
                searchContainer.css('position', 'relative');
                initBaiduButtons(searchContainer);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // 自动翻页
        if (document.querySelector('#content_left')) {
            MyApi.safeFunc(() => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => new AutoPager());
                } else {
                    new AutoPager();
                }
            });
        }
    };

    // ===================== 6. Google页面模块 =====================
    const initGooglePage = () => {
        const createGoogleSearchBar = () => {
            const oldContainer = document.querySelector('.google-baidu-search-container');
            if (oldContainer) oldContainer.remove();

            GM_addStyle(`
                .google-baidu-search-container {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: 12px;
                    vertical-align: middle;
                    height: 34px;
                }
                .google-baidu-search-container input {
                    width: 200px;
                    height: 32px;
                    padding: 0 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                    outline: none;
                    box-sizing: border-box;
                }
                .google-baidu-search-container input:focus {
                    border-color: #3385ff;
                }
                .google-baidu-search-container button {
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
                .google-baidu-search-container .baidu-btn {
                    background: #3385ff;
                }
                .google-baidu-search-container .baidu-btn:hover {
                    background: #317ef3;
                }
                .google-baidu-search-container .bing-btn {
                    background: #008373;
                }
                .google-baidu-search-container .bing-btn:hover {
                    background: #006b5f;
                }
            `);

            const getGoogleKeyword = () => {
                const input = document.querySelector('input[name="q"]');
                if (input && input.value) return input.value;
                const params = new URLSearchParams(location.search);
                const kw = params.get('q');
                if (kw) return decodeURIComponent(kw);
                return '';
            };

            const container = document.createElement('div');
            container.className = 'google-baidu-search-container';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '输入关键词 百度/Bing搜索';
            input.value = getGoogleKeyword();

            const baiduButton = document.createElement('button');
            baiduButton.className = 'baidu-btn';
            baiduButton.textContent = '百度';

            const bingButton = document.createElement('button');
            bingButton.className = 'bing-btn';
            bingButton.textContent = 'Bing';

            container.appendChild(input);
            container.appendChild(baiduButton);
            container.appendChild(bingButton);

            const toolsButton = document.querySelector('#hdtb-tls.mOKdDc');
            const toolsButtonFallback = document.querySelector('div[aria-label="更多过滤条件"]')?.closest('.HTOhZ')?.querySelector('.mOKdDc');

            if (toolsButton) {
                toolsButton.parentNode.insertBefore(container, toolsButton.nextSibling);
            } else if (toolsButtonFallback) {
                toolsButtonFallback.parentNode.insertBefore(container, toolsButtonFallback.nextSibling);
            } else if (document.querySelector('.HTOhZ')) {
                document.querySelector('.HTOhZ').appendChild(container);
            } else {
                container.style.position = 'fixed';
                container.style.top = '80px';
                container.style.right = '20px';
                container.style.zIndex = '9999';
                container.style.background = '#f8f8f8';
                container.style.border = '1px solid #d2d2d2';
                container.style.padding = '8px 12px';
                container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                document.body.appendChild(container);
            }

            const doBaiduSearch = () => {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank');
            };

            const doBingSearch = () => {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.bing.com/search?q=${encodeURIComponent(keyword)}`, '_blank');
            };

            baiduButton.addEventListener('click', doBaiduSearch);
            bingButton.addEventListener('click', doBingSearch);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doBaiduSearch();
            });
        };

        const googleObserver = new MutationObserver(debounce(createGoogleSearchBar, 300));
        googleObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        createGoogleSearchBar();

        // 自动翻页
        MyApi.safeFunc(() => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => new AutoPager());
            } else {
                new AutoPager();
            }
        });
    };

    // ===================== 7. Bing页面模块 =====================
    const initBingPage = () => {
        const createBingSearchBar = () => {
            const oldContainer = document.querySelector('.bing-search-helper');
            if (oldContainer) oldContainer.remove();

            GM_addStyle(`
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
            `);

            const getBingKeyword = () => {
                const input = document.querySelector('input[name="q"], #sb_form_q');
                if (input && input.value) return input.value;
                const params = new URLSearchParams(location.search);
                const kw = params.get('q');
                if (kw) return decodeURIComponent(kw);
                return '';
            };

            const container = document.createElement('div');
            container.className = 'bing-search-helper';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '输入关键词 百度/Google搜索';
            input.value = getBingKeyword();

            const baiduButton = document.createElement('button');
            baiduButton.className = 'baidu-btn';
            baiduButton.textContent = '百度';

            const googleButton = document.createElement('button');
            googleButton.className = 'google-btn';
            googleButton.textContent = 'Google';

            container.appendChild(input);
            container.appendChild(baiduButton);
            container.appendChild(googleButton);

            const bingMoreLi = document.querySelector('#b-scopeListItem-menu');
            if (bingMoreLi && bingMoreLi.parentNode) {
                bingMoreLi.parentNode.insertBefore(container, bingMoreLi.nextSibling);
            } else {
                const bingNavUl = document.querySelector('.b_scopebar > ul');
                if (bingNavUl) {
                    bingNavUl.appendChild(container);
                } else {
                    container.style.position = 'fixed';
                    container.style.top = '80px';
                    container.style.right = '20px';
                    container.style.zIndex = '9999';
                    container.style.background = '#f8f8f8';
                    container.style.border = '1px solid #d2d2d2';
                    container.style.padding = '8px 12px';
                    container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    document.body.appendChild(container);
                }
            }

            const doBaiduSearch = () => {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank');
            };

            const doGoogleSearch = () => {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, '_blank');
            };

            baiduButton.addEventListener('click', doBaiduSearch);
            googleButton.addEventListener('click', doGoogleSearch);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doBaiduSearch();
            });
        };

        const bingObserver = new MutationObserver(debounce(createBingSearchBar, 300));
        bingObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        createBingSearchBar();

        // 自动翻页
        MyApi.safeFunc(() => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => new AutoPager());
            } else {
                new AutoPager();
            }
        });
    };

    // ===================== 8. 快科技中转模块 =====================
    const initSoMydrivers = () => {
        $(function() {
            const getKeywordFromHash = () => {
                const hash = window.location.hash;
                if (!hash || !hash.startsWith('#q=')) return null;
                return decodeURIComponent(hash.substring(3));
            };

            const keyword = getKeywordFromHash();
            if (!keyword) return;

            window.location.hash = '';
            console.log('快科技搜索页中转：关键词 =', keyword);

            const waitForElements = setInterval(() => {
                const searchInput = $('#s');
                const searchButton = $('#btnsearch');
                if (searchInput.length && searchButton.length) {
                    clearInterval(waitForElements);
                    searchInput.val(keyword);
                    searchButton.click();
                }
            }, 200);

            setTimeout(() => {
                clearInterval(waitForElements);
                console.warn('等待搜索框或按钮超时');
            }, 10000);
        });
    };

    // ===================== 9. 脚本入口 =====================
    injectGlobalStyles();
    GM_registerMenuCommand("反馈建议", () => window.open("https://greasyfork.org/zh-CN/scripts/396960/feedback"));

    if (/baidu\.com/.test(hostname)) {
        initBaiduPage();
    } else if (/google\.com/.test(hostname)) {
        initGooglePage();
    } else if (/bing\.com/.test(hostname) && location.pathname === '/search') {
        initBingPage();
    } else if (hostname === 'so.mydrivers.com' && location.pathname === '/default.htm') {
        initSoMydrivers();
    }
})();