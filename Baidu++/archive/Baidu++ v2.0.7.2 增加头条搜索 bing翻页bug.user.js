// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、抖音、小红书、Google、Bing搜索，为Google/Bing添加百度/Google/Bing辅助搜索框
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google、Bing搜索按钮，一键跳转到Google/Bing；在Google搜索结果页添加百度/Bing搜索框；在Bing搜索结果页添加百度/Google搜索框。支持各个搜索引擎自动翻页，去除百度结果页面的广告和右边栏。虎嗅网模块增强：当URL带有#q=关键词时，优先点击完全匹配的历史关键词；若不匹配或无历史，则自动填入关键词并搜索。新增新浪搜索自动翻页功能。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.0.7
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

    // ===================== 1. 全局工具函数 =====================
    /**
     * 从百度搜索页面获取当前关键词（支持多种输入框和URL参数）
     * @returns {string} 搜索关键词
     */
    const getSearchKeyword = () => {
        const input = document.querySelector('#chat-input-main, #kw, input[name="wd"], input[name="word"]');
        if (input && input.value) return input.value;

        const params = new URLSearchParams(location.search);
        const kw = params.get('wd') || params.get('word') || params.get('q');
        if (kw) return decodeURIComponent(kw);

        const titleMatch = document.title.match(/(.+?) - 百度搜索/);
        return titleMatch ? titleMatch[1] : '';
    };

    /**
     * 批量打开多个窗口，每个窗口延迟300ms，使用独立target名称，尽可能绕过弹窗拦截
     * @param {string[]} urls 要打开的URL数组
     */
    const openAllWindows = (urls) => {
        if (!urls || !urls.length) return;
        urls.forEach((url, i) => {
            setTimeout(() => {
                window.open(url, `_blank_${i}_${Date.now()}`, 'noopener,noreferrer');
            }, i * 300);
        });
    };

    // ===================== 2. 核心工具函数 ======================
    const MyApi = (() => {
        /**
         * 安全执行函数，捕获异常
         * @param {Function} callback 要执行的函数
         * @param {Function} catchCallback 异常时的回调
         * @returns {*} 执行结果
         */
        const safeFunc = (callback, catchCallback = () => {}) => {
            try {
                return callback();
            } catch (e) {
                console.log('[AutoPager] 执行异常:', e);
                return catchCallback();
            }
        };

        /**
         * 等待元素出现（支持选择器字符串或函数）
         * @param {string|Function} selector CSS选择器或返回元素的函数
         * @param {Function} callbackFunc 找到元素后的回调
         * @param {number} findTick 轮询间隔（毫秒）
         * @param {boolean} clearAfterFind 找到后是否停止轮询
         * @param {number} timeout 超时时间（毫秒）
         * @param {Function} errCallback 超时回调
         * @returns {Promise} 无返回值
         */
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

        /**
         * 从URL中获取指定参数值
         * @param {string} baseUrl URL
         * @param {string} attribute 参数名
         * @returns {string|null} 参数值
         */
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

        /**
         * 通用请求封装（支持GET和POST）
         */
        const http = {
            /**
             * GET请求，返回文本
             * @param {string} url
             * @returns {Promise<[Error|null, string, Object]>} [错误, 响应文本, 响应头]
             */
            async get(url) {
                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        url: url,
                        fetch: true,
                        method: 'GET',
                        timeout: 10000,
                        onload: resp => resolve([null, resp.responseText, resp.responseHeaders]),
                        onerror: resp => resolve([resp, '', {}]),
                        ontimeout: () => resolve([new Error('请求超时'), '', {}])
                    });
                });
            },

            /**
             * POST请求，支持表单数据，返回文本
             * @param {string} url
             * @param {string|URLSearchParams} data
             * @returns {Promise<[Error|null, string, Object]>}
             */
            async post(url, data) {
                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        url: url,
                        method: 'POST',
                        data: data.toString(),
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

        /**
         * 等待指定毫秒
         * @param {number} ms 毫秒数
         * @returns {Promise} 无返回值
         */
        const waitTime = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        /**
         * 防抖函数
         * @param {Function} fn 要执行的函数
         * @param {number} wait 等待时间（毫秒）
         * @returns {Function} 防抖后的函数
         */
        const debounce = (fn, wait) => {
            let timer = null;
            return function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), wait);
            };
        };

        /**
         * 通过 XPath 获取所有元素
         * @param {string} xpath XPath表达式
         * @param {Node} contextNode 上下文节点
         * @param {Document} doc 文档对象
         * @returns {HTMLElement[]} 元素数组
         */
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

        /**
         * 通用元素获取：支持 CSS 选择器（以 "css;" 开头）、XPath 或函数
         * @param {string|Function} selector 选择器
         * @param {Node} contextNode 上下文节点
         * @param {Document} doc 文档对象
         * @returns {HTMLElement[]} 元素数组
         */
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

        /**
         * 将相对URL解析为绝对URL
         * @param {string} url
         * @returns {string}
         */
        const resolveUrl = (url) => {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            return new URL(url, location.href).href;
        };

        return {
            safeFunc: safeFunc,
            safeWaitFunc: safeWaitFunc,
            getUrlAttribute: getUrlAttribute,
            http: http,
            waitTime: waitTime,
            debounce: debounce,
            getAllElementsByXpath: getAllElementsByXpath,
            getAllElements: getAllElements,
            resolveUrl: resolveUrl
        };
    })();

    // ===================== 3. 翻页核心类 =====================
    /**
     * 站点翻页配置类，根据当前域名返回相应配置
     */
    class SitePagerConfig {
        constructor() {
            this.siteName = this._detectSite();
            this.pagerConfig = this._getFullPagerConfig();
        }

        /**
         * 检测当前站点
         * @returns {string} 站点名称
         */
        _detectSite() {
            const host = location.host;
            const pathname = location.pathname;

            if (host.includes('baidu.com')) {
                return pathname.includes('xueshu') ? 'baidu_xueshu' : 'baidu';
            } else if (host.includes('google.')) {
                return pathname.includes('scholar') ? 'google_scholar' : 'google';
            } else if (host.includes('bing.')) {
                return 'bing';
            } else if (host.includes('so.com')) {
                return 'haosou';
            } else if (host.includes('duckduckgo.com') || host.includes('dogedoge.com')) {
                return 'duck';
            }
            return '';
        }

        /**
         * 获取完整的翻页配置（包括下一页链接、页面元素、插入点等）
         * @returns {Object} 翻页配置对象
         */
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
                // 百度通用搜索
                baidu: {
                    // 下一页链接候选：先尝试现有规则，再加入东方永页机的规则
                    nextLink: [
                        "//div[@id='page']//a[contains(span/text(), '下一页')]",
                        "//*[@id='page']/div/a[span[contains(text(),'下')]]",
                        "//*[@id='page']/div/a[span[contains(text(),'上')]]"
                    ],
                    // 页面元素候选：先尝试现有规则，再加入东方永页机的规则
                    pageElement: [
                        "css;div#content_left > *",
                        "//*[@id=\"content_left\"]/*",
                        "//*[@id=\"content_style\"]/style/following-sibling::*|//*[@id=\"content_left\"]/*"
                    ],
                    HT_insert: ["css;div#content_left", 2],   // 插入点：追加到 #content_left 内部
                    replaceE: "css;#page",                     // 替换元素：隐藏原生翻页条
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 已加载第 ${pageNum} 页 ——`
                },
                // 百度学术
                baidu_xueshu: {
                    nextLink: '//div[@id="page"]//a[contains(span/text(), "下一页")]',
                    pageElement: "css;div#content_left .result",
                    HT_insert: ["css;div#content_left", 2],
                    replaceE: "css;#page",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 百度学术第 ${pageNum} 页 ——`
                },
                // Google 通用搜索
                google: {
                    // 下一页链接候选：先尝试新版 CSS，再加入东方永页机的通用 XPath 和古老页面 XPath
                    nextLink: [
                        "css;a[aria-label='下一页'], a[aria-label='Next page'], a#pnnext",
                        "id('pnnext')|id('navbar navcnt nav')//td[span]/following-sibling::td[1]/a|id('nn')/parent::a",
                        "id('main')[not(id('rso botstuff'))]/footer//a[@aria-label and contains(@href, 'start=') and contains(., '>')]",
                        "css;a.nBDE1b.G5eFlf[aria-label='下一页']"
                    ],
                    // 页面元素候选：先新版，再东方永页机通用，再古老页面
                    pageElement: [
                        "css;#rso > div:not([jscontroller='SC7lYd']):not([class*='nav'])",
                        "id('rso')|id('center_col')/style[contains(.,'relative')]",
                        "id('main')/div[not(@*)][.//a//h3 or .//a/accordion-entry-search-icon]"
                    ],
                    HT_insert: [
                        ["css;#rso", 2],       // 新版插入点
                        ["id('main')", 2]       // 旧版插入点
                    ],
                    replaceE: '//table[@class="AaVjTc"]', // 隐藏原生翻页表格
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Search Page ${pageNum} ——`,
                    afertPagerAutoCallFunc: () => {} // 空函数，避免复制脚本报错
                },
                // Google 学术
                google_scholar: {
                    nextLink: '//a[./span[@class="gs_ico gs_ico_nav_next"]]',
                    pageElement: '//div[@class="gs_r gs_or gs_scl"]',
                    HT_insert: ["css;#gs_res_ccl_mid", 2],
                    replaceE: '//div[@id="navcnt"] | //div[@id="rcnt"]//div[@role="navigation"]',
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Scholar Page ${pageNum} ——`
                },
                // Bing 搜索
                bing: {
                    // 下一页链接候选：先 XPath，后东方永页机的 CSS 规则
                    nextLink: [
                        "//a[@aria-label='下一页'] | //a[contains(@class,'sb_pagN')]",
                        "css;a[title='Next page'], a.sb_pagN, a.sb_halfnext, a.sb_fullnpl"
                    ],
                    // 页面元素候选：先 XPath，后东方永页机的 CSS 规则
                    pageElement: [
                        "id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]",
                        "css;ol#b_results > li.b_algo"
                    ],
                    HT_insert: [
                        ["css;ol#b_results", 2],               // 新版插入点
                        ["id(\"b_results\")/li[@class=\"b_pag\"]", 1] // 旧版插入点（翻页条之前）
                    ],
                    replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 必应搜索第 ${pageNum} 页 ——`
                },
                // 360 好搜
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
                // DuckDuckGo / 多吉搜索
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

    /**
     * 自动翻页主类
     */
    class AutoPager {
        constructor() {
            this.config = new SitePagerConfig().pagerConfig;
            this.isLoading = false;        // 是否正在加载中
            this.pageNum = 1;               // 当前页码
            this.nextPageUrl = null;        // 下一页链接
            this.init();
            // 额外兜底：定期检查下一页链接是否存在（防止 MutationObserver 漏掉）
            this.interval = setInterval(() => {
                if (this.nextPageUrl) return;
                this.updateNextPageUrl();
            }, 2000);
        }

        /**
         * 初始化：等待页面加载，获取下一页链接，绑定滚动监听，注入样式
         */
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

        /**
         * 更新下一页链接（支持数组选择器）
         * @param {Document} tempDoc 临时文档对象（用于获取下一页链接）
         */
        updateNextPageUrl(tempDoc = document) {
            let nextLinkNode = null;
            if (Array.isArray(this.config.nextLink)) {
                for (const sel of this.config.nextLink) {
                    const nodes = MyApi.getAllElements(sel, tempDoc, tempDoc);
                    if (nodes.length) {
                        nextLinkNode = nodes[0];
                        console.log('[AutoPager] 使用 nextLink 选择器:', sel);
                        break;
                    }
                }
            } else {
                const nodes = MyApi.getAllElements(this.config.nextLink, tempDoc, tempDoc);
                if (nodes.length) nextLinkNode = nodes[0];
            }

            if (nextLinkNode) {
                this.nextPageUrl = nextLinkNode.href;
                console.log('[AutoPager] 找到下一页链接:', this.nextPageUrl);
            } else {
                console.log('[AutoPager] 未找到下一页链接');
                this.nextPageUrl = null;
            }
        }

        /**
         * 初始化翻页提示样式
         */
        initStyle() {
            if (!this.config.stylish) return;
            const style = document.createElement('style');
            style.textContent = this.config.stylish;
            document.head.appendChild(style);
        }

        /**
         * 绑定滚动监听，触底时加载下一页
         */
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

        /**
         * 加载下一页
         */
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
                let pageElements = [];

                // 处理 pageElement 可能是数组的情况
                if (Array.isArray(this.config.pageElement)) {
                    for (const sel of this.config.pageElement) {
                        const nodes = MyApi.getAllElements(sel, tempDoc, tempDoc);
                        if (nodes.length) {
                            pageElements = nodes;
                            console.log('[AutoPager] 使用 pageElement 选择器:', sel);
                            break;
                        }
                    }
                } else if (typeof this.config.pageElement === 'function') {
                    pageElements = this.config.pageElement(tempDoc) || [];
                } else {
                    pageElements = MyApi.getAllElements(this.config.pageElement, tempDoc, tempDoc);
                }

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

        /**
         * 将新页面元素插入到当前页面
         * @param {HTMLElement[]} pageElements 新页面元素数组
         * @param {Document} tempDoc 临时文档对象
         */
        async insertPageContent(pageElements, tempDoc) {
            let insertSelector, insertPos;

            // 处理 HT_insert 可能是数组的数组（多个备选插入点）
            if (Array.isArray(this.config.HT_insert) && Array.isArray(this.config.HT_insert[0])) {
                for (const [sel, pos] of this.config.HT_insert) {
                    let node = MyApi.getAllElements(sel)[0];
                    if (node) {
                        insertSelector = sel;
                        insertPos = pos;
                        console.log('[AutoPager] 使用插入点:', sel);
                        break;
                    }
                }
            } else {
                [insertSelector, insertPos] = this.config.HT_insert || [];
            }

            if (!insertSelector || insertPos === undefined) {
                console.log('[AutoPager] 未找到可用的插入点');
                return;
            }

            let insertNode = MyApi.getAllElements(insertSelector)[0];
            if (!insertNode && this.config.siteName === 'google') {
                insertNode = MyApi.getAllElements('css;#center_col')[0];
                if (!insertNode) insertNode = MyApi.getAllElements('css;footer')[0];
            }
            if (!insertNode) {
                console.log('[AutoPager] 插入节点不存在');
                return;
            }

            // 添加翻页提示信息
            const pageInfoDiv = document.createElement('div');
            pageInfoDiv.className = 'autopagerize_page_info';
            pageInfoDiv.textContent = this.config.pageInfoText(this.pageNum);
            if (insertPos === 1) {
                insertNode.before(pageInfoDiv);
            } else {
                insertNode.append(pageInfoDiv);
            }

            // 插入新元素
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

        /**
         * 隐藏原生翻页条
         */
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
    // 百度页面按钮样式（固定宽度100px，高度33px）
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
    // 百度按钮容器样式（绝对定位）
    const containerStyle = `
        position: absolute;
        top: 40px;
        left: 0;
        transform: translateX(0px);
        padding: 10px 0;
        width: 100%;
        z-index: 999;
    `;

    /**
     * 全局样式：去除广告、调整间距、卡片美化（仅在百度页面调用）
     */
    const injectGlobalStyles = () => {
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

    // ===================== 新增：新浪搜索页面专用样式 =====================
    const injectSinaStyles = () => {
        GM_addStyle(`
            /* 隐藏新浪自带翻页条（由自动翻页接管） */
            .pagebox, #_function_code_page, .search-form-bot {
                display: none !important;
            }

            /* 隐藏右侧广告和我要反馈悬浮块 */
            .sRight, #scrollDiv {
                display: none !important;
            }

            /* 结果容器居中，模拟百度 #content_left 的布局 */
            div#result {
                width: 100% !important;
                max-width: 800px !important;
                margin-left: auto !important;
                margin-right: auto !important;
                float: none !important;
                padding: 0 !important;
            }

            /* 每个搜索结果卡片 */
            #result .box-result {
                background: #DEF1EF !important;
                border: 1px solid #B8D9B5 !important;
                border-radius: 2px !important;
                box-shadow: 0 1px 4px 0 rgba(0,0,0,0.14) !important;
                margin-bottom: 16px !important;
                padding: 20px 25px !important;
                transition: all 0.3s ease !important;
                clear: both;
                overflow: hidden; /* 清除浮动 */
            }

            /* 悬停效果 */
            #result .box-result:hover {
                box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
                border-color: #3D7CD4 !important;
                transform: translateY(-2px) !important;
                background: #d4edea !important;
            }

            /* 标题样式 */
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

            /* 摘要内容 */
            #result .box-result .content {
                color: #2c3e50 !important;
                font-size: 14px !important;
                line-height: 1.6 !important;
                margin: 4px 0 8px 0 !important;
            }

            /* 来源/时间信息 */
            #result .box-result .fgray_time,
            #result .box-result .r-info h2 span {
                color: #4CAF50 !important;
                font-size: 13px !important;
                margin-top: 4px !important;
                border-top: 1px dashed #B8D9B5 !important;
                padding-top: 8px !important;
                display: block;
            }

            /* 图片区域微调 */
            #result .box-result .r-img {
                float: left;
                margin-right: 15px;
                margin-bottom: 10px;
            }

            #result .box-result .r-img img {
                border-radius: 2px;
                max-width: 120px;
            }

            /* 当没有图片时，r-info2 的样式调整 */
            #result .box-result .r-info2 {
                margin-left: 0 !important;
            }

            /* 视频图标调整 */
            #result .box-result .r-img a:last-child img.video {
                position: relative;
                top: -30px;
                left: 30px;
                border: none;
            }

            /* 统计条（“找到相关新闻X篇”）样式，可选 */
            #result .l_v2 {
                background: #f0f7f0;
                padding: 8px 15px;
                margin-bottom: 16px;
                border-left: 4px solid #B8D9B5;
                font-size: 14px;
                color: #2c3e50;
            }

            /* 自动翻页分隔符样式（沿用已有的 .autopagerize_page_info） */
            .autopagerize_page_info {
                margin: 15px 0 !important;
                padding: 10px !important;
                border-top: 1px solid #B8D9B5 !important;
                border-bottom: 1px solid #B8D9B5 !important;
                color: #666 !important;
                text-align: center !important;
                width: 100% !important;
                clear: both !important;
                font-size: 14px !important;
            }
        `);
    };

    // ===================== 5. 百度页面模块 =====================
    const initBaiduPage = () => {
        injectGlobalStyles();  // 仅百度页面注入专属样式
        let lastRefreshTime = 0;

        /**
         * 确保搜索表单底部有足够空白，避免按钮遮挡
         */
        const ensureFormPadding = () => {
            let form = document.querySelector('.s_form.s_form_fresh');
            if (!form) form = document.querySelector('.s_form');
            if (form) form.style.paddingBottom = '40px';
        };

        /**
         * 刷新页面（用于点击推荐词等后重置）
         */
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

        /**
         * 隐藏广告
         */
        const hideAds = () => {
            $('.c-container').filter(function() {
                return $(this).find('.f13 span:contains("广告")').length > 0;
            }).hide();
        };

        /**
         * 初始化百度页面的所有按钮
         * @param {jQuery} container 按钮容器
         */
        const initBaiduButtons = (container) => {
            hideAds();
            const adObserver = new MutationObserver(() => hideAds());
            const contentLeft = document.querySelector('#content_left');
            if (contentLeft) adObserver.observe(contentLeft, { childList: true, subtree: true });

            const btnContainer = $(`<div style="${containerStyle}"></div>`).appendTo(container);

            // 如果是首页，隐藏按钮
            const isHomePage = !location.search.includes('wd=') && !location.search.includes('word=') && (location.pathname === '/' || location.pathname === '');
            if (isHomePage) btnContainer.hide();

            // 按钮配置数组
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
				                `https://search.sina.com.cn/news#q=${kw}`   // 新增新浪新闻搜索
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

        ensureFormPadding();
        const paddingObserver = new MutationObserver(() => ensureFormPadding());
        paddingObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        // 监听搜索按钮点击
        const searchBtn = document.querySelector('#chat-submit-button, #su, .s_btn, input[type="submit"]');
        if (searchBtn) searchBtn.addEventListener('click', scheduleRefresh);
        // 监听搜索表单提交
        const searchForm = document.querySelector('#form, form[name="f"]');
        if (searchForm) searchForm.addEventListener('submit', scheduleRefresh);

        // 全局点击监听：捕捉推荐关键词、相关搜索、下拉关键词等
        document.addEventListener('click', function(e) {
            const target = e.target;
            // 点击链接或按钮，且文本包含“更多/展开/更多结果”时刷新
            if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.type === 'submit') {
                const text = (target.textContent || target.innerText || '').trim();
                if (/^(更多|展开|更多结果)$/i.test(text)) scheduleRefresh();
            }
            // 点击搜索按钮（部分页面）
            if (target.closest('#chat-submit-button')) scheduleRefresh();
            // 点击搜索框下拉推荐词（搜索结果页）
            if (target.closest('#normalSugSearchUl li')) scheduleRefresh();
            // 点击首页搜索框下拉推荐词（新增加）
            if (target.closest('li.bdsug-item')) scheduleRefresh();
            // 点击相关搜索链接
            if (target.closest('#rs_new a') || target.closest('.rs-link_2DE3Q')) scheduleRefresh();
            // 点击其他列表项（如热词）
            if (target.closest('.list_1V4Yg a') || target.closest('.item_3WKCf')) scheduleRefresh();
        }, true);

        // 监听搜索框回车
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.isComposing) {
                const target = e.target;
                if (target.matches && (target.matches('#chat-textarea') || target.matches('#kw'))) scheduleRefresh();
            }
        }, true);

        // 等待搜索框容器出现，用于放置按钮
        const observer = new MutationObserver((_, obs) => {
            const searchContainer = $('#chat-input-main').parent();
            if (searchContainer.length) {
                obs.disconnect();
                searchContainer.css('position', 'relative');
                initBaiduButtons(searchContainer);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // 自动翻页初始化
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

    // ===================== 6. Google页面模块（增强版，适配所有域名） =====================
    const initGooglePage = () => {
        // 强制设置搜索框样式，确保尺寸固定，并添加右对齐
        GM_addStyle(`
            .google-baidu-search-container {
                display: inline-flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-left: auto !important;  /* 靠右对齐 */
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
        `);

        /**
         * 创建 Google 页面的百度/Bing 搜索框
         */
        const createGoogleSearchBar = () => {
            const oldContainer = document.querySelector('.google-baidu-search-container');
            if (oldContainer) oldContainer.remove();

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

            // 优先插入到导航栏最右侧（最后一个子元素）
            const navBar = document.querySelector('.HTOhZ') || document.querySelector('.KP7LCb');
            if (navBar) {
                if (window.getComputedStyle(navBar).display === 'flex') {
                    container.style.marginLeft = 'auto';
                }
                navBar.appendChild(container);
            } else {
                const toolBtn = document.querySelector('#hdtb-tls') || document.querySelector('#st-toggle');
                if (toolBtn) {
                    const parent = toolBtn.parentNode;
                    if (parent) {
                        parent.insertBefore(container, toolBtn.nextSibling);
                    }
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

        const googleObserver = new MutationObserver(MyApi.debounce(createGoogleSearchBar, 300));
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

        /**
         * 创建 Bing 页面的百度/Google 搜索框
         */
        const createBingSearchBar = () => {
            const oldContainer = document.querySelector('.bing-search-helper');
            if (oldContainer) oldContainer.remove();

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

        const bingObserver = new MutationObserver(MyApi.debounce(createBingSearchBar, 300));
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

    // ===================== 8. 驱动之家（快科技）中转模块 =====================
    const initSoMydrivers = () => {
        $(function() {
            /**
             * 从 URL hash 中提取关键词（格式：#q=关键词）
             * @returns {string|null} 关键词
             */
            const getKeywordFromHash = () => {
                const hash = window.location.hash;
                if (!hash || !hash.startsWith('#q=')) return null;
                return decodeURIComponent(hash.substring(3));
            };

            const keyword = getKeywordFromHash();
            if (!keyword) return;

            window.location.hash = '';
            console.log('快科技搜索页中转：关键词 =', keyword);

            // 等待搜索框和按钮出现，然后填入关键词并点击搜索
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

    // ===================== 9. 驱动之家（快科技）翻页模块（修复选择器前缀，统一使用 MyApi） =====================
    const initMydriversPager = () => {
        // 驱动之家翻页专用配置（所有 CSS 选择器均添加 "css;" 前缀，确保 MyApi.getAllElements 能正确识别）
        const CONFIG = {
            nextLinkSelector: 'css;a.next',   // 修复：加前缀
            mainContentSelector: 'css;body > div.main_box > div.main_left > div.main_1 > div.news_lb > ul',
            fallbackSelectors: [
                'css;div.news_lb > ul',
                'css;.main_left ul',
                'css;.main_left li'
            ],
            insertSelector: 'css;body > div.main_box > div.main_left > div.main_1 > div.news_lb > ul',
            hidePagerSelector: 'css;#div_pager, .m-page',  // 修复：加前缀
            triggerDistance: 1200,
            pageInfoText: (pageNum) => `—— 快科技第 ${pageNum} 页 ——`
        };

        // 辅助函数：从HTML片段中检测字符集（保留原有复杂逻辑）
        const extractCharsetFromHtml = (arrayBuffer) => {
            const decoderUtf8 = new TextDecoder('utf-8');
            const headSample = decoderUtf8.decode(arrayBuffer.slice(0, 4096));
            const metaMatch = headSample.match(/<meta\s+charset=["']?([^"'\s>]+)/i) ||
                             headSample.match(/<meta\s+http-equiv=["']?content-type["']?\s+content=["']?[^"']*charset=([^"'\s>]+)/i);
            if (metaMatch) return metaMatch[1].toLowerCase();
            return null;
        };

        // 自定义 fetch 页面（因为需要处理GBK编码）
        const fetchPage = async (url, retries = 2) => {
            for (let i = 0; i <= retries; i++) {
                try {
                    const result = await new Promise((resolve) => {
                        GM_xmlhttpRequest({
                            url,
                            method: 'GET',
                            timeout: 15000,
                            responseType: 'arraybuffer',
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
                        const metaCharset = extractCharsetFromHtml(arrayBuffer);
                        if (metaCharset && (metaCharset.includes('gb') || metaCharset.includes('2312'))) {
                            charset = metaCharset;
                        }
                    }

                    const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
                    const utf8Text = utf8Decoder.decode(arrayBuffer);
                    const replacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
                    if (replacementCount > 10 || charset.includes('gb') || charset.includes('2312')) {
                        try {
                            const gbkDecoder = new TextDecoder('gbk');
                            const gbkText = gbkDecoder.decode(arrayBuffer);
                            const gbkReplacementCount = (gbkText.match(/\uFFFD/g) || []).length;
                            if (gbkReplacementCount < replacementCount) {
                                console.log('[翻页] 使用 GBK 解码');
                                return [null, gbkText];
                            }
                        } catch (e) {}
                    }
                    return [null, utf8Text];
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
                this.init();
            }

            async init() {
                // 注入极简样式（分隔符隐藏，仅保留纯文本效果）
                GM_addStyle(`
                    li.autopagerize_page_info {
                        display: none !important;
                        list-style: none;
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                        margin: 0;
                        padding: 0;
                        border: none;
                        background: transparent;
                        line-height: normal;
                    }
                `);

                await MyApi.waitTime(1000);
                // 使用修复后的带 "css;" 前缀的选择器
                this.contentContainer = MyApi.getAllElements(CONFIG.mainContentSelector)[0] ||
                                       MyApi.getAllElements(CONFIG.insertSelector)[0];
                if (!this.contentContainer) {
                    console.warn('[翻页] 未找到内容容器，脚本退出');
                    return;
                }

                this.updateNextUrl();
                this.hidePager();
                this.bindScroll();
                setInterval(() => {
                    if (!this.nextUrl) this.updateNextUrl();
                }, 3000);
            }

            updateNextUrl(doc = document) {
                const link = MyApi.getAllElements(CONFIG.nextLinkSelector, doc, doc)[0];
                if (link && link.href) {
                    this.nextUrl = MyApi.resolveUrl(link.href);
                    console.log('[翻页] 下一页:', this.nextUrl);
                } else {
                    this.nextUrl = null;
                }
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
                    if (st + ch >= sh - CONFIG.triggerDistance) {
                        await this.loadNext();
                    }
                }, 400);
                window.addEventListener('scroll', handler);
                handler();
            }

            async loadNext() {
                if (!this.nextUrl) return;
                this.isLoading = true;
                this.pageNum++;

                try {
                    console.log(`[翻页] 加载第 ${this.pageNum} 页:`, this.nextUrl);
                    const [err, html] = await fetchPage(this.nextUrl);
                    if (err || !html) throw err || new Error('空响应');

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    let content = MyApi.getAllElements(CONFIG.mainContentSelector, doc, doc);
                    if (!content.length) {
                        for (const sel of CONFIG.fallbackSelectors) {
                            content = MyApi.getAllElements(sel, doc, doc);
                            if (content.length) {
                                console.log('[翻页] 使用备选选择器:', sel);
                                break;
                            }
                        }
                    }

                    if (!content.length) {
                        console.warn('[翻页] 第', this.pageNum, '页无内容');
                        this.updateNextUrl(doc);
                        return;
                    }

                    this.insertContent(content, doc);
                    this.updateNextUrl(doc);
                    this.hidePager();
                    console.log(`[翻页] 第 ${this.pageNum} 页加载完成`);
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

                const separator = document.createElement('li');
                separator.className = 'autopagerize_page_info';
                separator.textContent = CONFIG.pageInfoText(this.pageNum);
                insertNode.appendChild(separator);

                contentElements.forEach(container => {
                    const items = container.children.length ? Array.from(container.children) : [container];
                    items.forEach(item => {
                        if (item.nodeType === 1 && item.textContent.trim() !== '') {
                            insertNode.appendChild(document.importNode(item, true));
                        }
                    });
                });
            }
        }

        // 启动翻页
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new MydriversPager());
        } else {
            new MydriversPager();
        }
    };

    // ===================== 10. 虎嗅网增强模块（稳健版：等待搜索结果 + 后备跳转） =====================
    const initHuxiuPage = () => {
        // 如果是搜索结果页（路径包含 /search 或参数包含 keyword/q），直接退出，避免干扰
        if (location.pathname.includes('/search') || location.search.includes('keyword=') || location.search.includes('q=')) {
            console.log('虎嗅网：搜索结果页，跳过执行');
            return;
        }

        // 防止同一页面重复执行（防重复标志）
        if (window.__huxiuExecuted) {
            console.log('虎嗅网：已执行过，跳过');
            return;
        }

        // ---------- 辅助函数（与原版相同） ----------
        const waitForElement = (selector, timeout = 15000, context = document) => {
            return new Promise((resolve, reject) => {
                const el = context.querySelector(selector);
                if (el) return resolve(el);
                const observer = new MutationObserver(() => {
                    const found = context.querySelector(selector);
                    if (found) {
                        observer.disconnect();
                        resolve(found);
                    }
                });
                observer.observe(context, { childList: true, subtree: true });
                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`等待元素超时: ${selector}`));
                }, timeout);
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
                const evt = new MouseEvent(type, {
                    view: view,
                    bubbles: true,
                    cancelable: true,
                    clientX: clientX,
                    clientY: clientY
                });
                element.dispatchEvent(evt);
            });
            console.log('✅ 已触发完整鼠标点击');
        };

        const isSearchPanelOpen = () => {
            const panel = document.querySelector('.input-wrapper, .search-history__history-items, .search-panel');
            return panel && panel.offsetParent !== null;
        };

        // 从 URL 获取关键词（与原版相同）
        const getKeywordFromHash = () => {
            let hash = window.location.hash;
            if (hash && hash.startsWith('#q=')) {
                try {
                    return decodeURIComponent(hash.substring(3));
                } catch (e) {}
            }
            const url = document.URL;
            const hashIndex = url.indexOf('#');
            if (hashIndex !== -1) {
                hash = url.substring(hashIndex);
                if (hash.startsWith('#q=')) {
                    try {
                        return decodeURIComponent(hash.substring(3));
                    } catch (e) {}
                }
            }
            const href = location.href;
            const match = href.match(/#q=([^#&]+)/);
            if (match) {
                try {
                    return decodeURIComponent(match[1]);
                } catch (e) {}
            }
            return null;
        };

        const keyword = getKeywordFromHash();
        if (!keyword) {
            // 无关键词，但可能面板已打开且输入框有内容（例如之前已成功操作），静默返回
            const input = document.querySelector('.input-wrapper input[placeholder*="搜索"], .search-input input');
            if (input && input.value.trim() !== '' && isSearchPanelOpen()) {
                console.log('虎嗅网：面板已打开且已有输入，可能是之前操作成功，跳过');
                return;
            }
            console.log('虎嗅网：无传入关键词且面板未激活，不执行操作');
            return;
        }

        // 清除 hash，避免后续干扰
        window.location.hash = '';
        console.log('虎嗅网：检测到传入关键词，准备操作:', keyword);

        // 检查是否已经成功（面板打开且输入框值正确，或历史第一个词匹配）
        const checkAlreadyDone = () => {
            if (!isSearchPanelOpen()) return false;
            // 检查输入框
            const input = document.querySelector('.input-wrapper input[placeholder*="搜索"], .search-input input');
            if (input && input.value.trim() === keyword) {
                console.log('虎嗅网：面板已打开且输入框已正确填入，无需重复操作');
                return true;
            }
            // 检查搜索历史第一个词
            const firstHistoryItem = document.querySelector('.search-history__history-items .hx-tag-closable:first-child span');
            if (firstHistoryItem && firstHistoryItem.textContent.trim() === keyword) {
                console.log('虎嗅网：搜索历史首个词已匹配，操作已成功，无需重复');
                return true;
            }
            return false;
        };

        if (checkAlreadyDone()) {
            window.__huxiuExecuted = true; // 标记已执行
            return;
        }

        (async () => {
            try {
                // ----- 步骤1：打开搜索悬浮面板（最多尝试3次）-----
                let searchBtn = document.querySelector('svg.search-btn.pointer, .search-icon-container .search-btn');
                if (!searchBtn) {
                    searchBtn = await waitForElement('.search-icon-container, .search-btn, svg.search-btn.pointer');
                }

                let panelOpened = false;
                for (let i = 0; i < 3; i++) {
                    simulateFullClick(searchBtn);
                    await new Promise(resolve => setTimeout(resolve, 600));
                    if (isSearchPanelOpen()) {
                        panelOpened = true;
                        console.log(`✅ 搜索面板已打开（尝试次数：${i+1}）`);
                        break;
                    } else {
                        console.log(`⚠️ 搜索面板未打开，重试点击（${i+1}/3）`);
                    }
                }

                if (!panelOpened) {
                    throw new Error('无法打开搜索面板');
                }

                // ----- 步骤2：找到输入框并填入关键词 -----
                const searchInput = await waitForElement('.input-wrapper input[placeholder*="搜索"], .search-input input, input[placeholder="搜索文章"]');
                searchInput.value = keyword;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('✅ 关键词已填入输入框');

                // 触发回车键（增强可靠性）
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                });
                searchInput.dispatchEvent(enterEvent);

                // ----- 步骤3：点击搜索提交按钮（放大镜）-----
                await new Promise(resolve => setTimeout(resolve, 300));
                const submitBtn = await waitForElement('.input-icons .icon-search, .icon-search-show, .search-btn[type="submit"]', 5000);
                simulateFullClick(submitBtn);
                console.log('✅ 已点击搜索按钮，等待搜索结果...');

                // ----- 步骤4：等待搜索结果出现（不依赖 URL 变化）-----
                // 搜索结果出现时，搜索面板通常关闭，且页面出现文章列表
                const searchResultSelectors = [
                    '.search-result',           // 常见搜索结果容器
                    '.article-list',             // 文章列表
                    '.feed-list',                 // 信息流列表
                    '.search-history__history-items', // 搜索历史消失（负向判断）
                    '[data-v-7819aa03]'          // 根据用户提供的片段
                ];
                let searchSuccess = false;
                for (let i = 0; i < 10; i++) { // 等待最多 5 秒（每次 500ms）
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // 如果面板关闭（输入容器隐藏），且页面出现可能的结果容器，认为成功
                    const panelStillOpen = isSearchPanelOpen();
                    const anyResult = searchResultSelectors.some(sel => document.querySelector(sel));
                    if (!panelStillOpen || anyResult) {
                        searchSuccess = true;
                        break;
                    }
                }

                if (searchSuccess) {
                    console.log('✅ 搜索结果已出现，操作成功');
                    window.__huxiuExecuted = true;
                    // 可选的验证：检查历史第一个词是否匹配（作为额外确认）
                    const firstHistory = document.querySelector('.search-history__history-items .hx-tag-closable:first-child span');
                    if (firstHistory && firstHistory.textContent.trim() === keyword) {
                        console.log('✅ 搜索历史首个词匹配，验证通过');
                    }
                } else {
                    // 超时未检测到搜索结果，执行后备跳转
                    console.log('⚠️ 等待搜索结果超时，执行后备跳转');
                    window.location.href = `https://www.huxiu.com/search?keyword=${encodeURIComponent(keyword)}`;
                }
            } catch (e) {
                console.error('❌ 虎嗅自动操作失败，尝试直接跳转搜索页:', e);
                window.location.href = `https://www.huxiu.com/search?keyword=${encodeURIComponent(keyword)}`;
            }
        })();
    };

    // ===================== 11. 新浪搜索关键词注入模块 =====================
    const initSinaSearch = () => {
        $(function() {
            const getKeywordFromHash = () => {
                const hash = window.location.hash;
                if (!hash || !hash.startsWith('#q=')) return null;
                return decodeURIComponent(hash.substring(3));
            };

            const keyword = getKeywordFromHash();
            if (!keyword) return;

            window.location.hash = '';
            console.log('新浪搜索页中转：关键词 =', keyword);

            const waitForElements = setInterval(() => {
                // 根据您提供的HTML，搜索框 id="keyword"，搜索按钮 class="ipt-03"
                const searchInput = document.querySelector('#keyword, input[name="q"]');
                const searchButton = document.querySelector('.ipt-03, input[type="submit"]');
                if (searchInput && searchButton) {
                    clearInterval(waitForElements);
                    searchInput.value = keyword;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    searchButton.click();
                }
            }, 200);

            setTimeout(() => {
                clearInterval(waitForElements);
                console.warn('等待新浪搜索框或按钮超时');
            }, 10000);
        });
    };

    // ===================== 12. 新浪搜索自动翻页模块 =====================
    /**
     * 新浪搜索翻页专用类（支持POST分页）
     */
    class SinaSearchPager {
        constructor() {
            this.isLoading = false;
            this.pageNum = 1;
            this.nextInfo = null;      // { url, params }
            this.contentContainer = null;
            this.init();
        }

        async init() {
            // 添加极简分隔符样式
            GM_addStyle(`
                .autopagerize_page_info {
                    display: block !important;
                    text-align: center;
                    color: #999;
                    font-size: 14px;
                    margin: 20px 0;
                    padding: 0;
                    border: none;
                    background: transparent;
                    clear: both;
                }
            `);

            // 等待页面初始内容加载
            await MyApi.waitTime(800);

            // 确定内容容器（使用更通用的选择器）
            const possibleContainers = [
                '.result', '.blkResult', '.list', '.search-result', '.news-item',
                '#result', '.news-list', '.search-content', '.main-content'
            ];
            for (const sel of possibleContainers) {
                const el = document.querySelector(sel);
                if (el) {
                    this.contentContainer = el;
                    console.log('[新浪翻页] 使用内容容器:', sel);
                    break;
                }
            }
            if (!this.contentContainer) {
                console.warn('[新浪翻页] 未找到搜索结果容器，脚本退出');
                return;
            }

            this.updateNextInfo();
            this.hidePager();
            this.bindScroll();

            // 定期检查是否有下一页（应对动态变化）
            setInterval(() => {
                if (!this.nextInfo) this.updateNextInfo();
            }, 3000);
        }

        // 从当前页面（或指定文档）中提取下一页信息
        updateNextInfo(doc = document) {
            const pager = doc.querySelector('.pagebox, #_function_code_page');
            if (!pager) {
                this.nextInfo = null;
                return;
            }

            const nextLink = this.findNextLink(pager);
            if (!nextLink) {
                this.nextInfo = null;
                return;
            }

            const parsed = this.parseNextLink(nextLink);
            if (parsed) {
                this.nextInfo = parsed;
                console.log('[新浪翻页] 下一页地址:', parsed.url, '参数:', parsed.params.toString());
            } else {
                this.nextInfo = null;
            }
        }

        // 解析 javascript:linkPostPage(url, params) 调用
        parseNextLink(linkElement) {
            const href = linkElement.getAttribute('href');
            if (!href || !href.startsWith('javascript:linkPostPage')) return null;

            const match = href.match(/linkPostPage\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
            if (!match) return null;

            const basePath = match[1];
            const queryString = match[2];

            const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
            const url = new URL(basePath, location.origin).href;

            return { url, params };
        }

        // 在分页容器中查找下一页链接（按文本包含）
        findNextLink(container) {
            const links = container.querySelectorAll('a');
            for (let link of links) {
                const text = link.textContent.trim();
                if (text.includes('下一页') || text.includes('下页') || text.includes('下一')) {
                    return link;
                }
            }
            // 若没找到，返回最后一个链接（通常为“下一页”）
            return links[links.length - 1];
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
                if (st + ch >= sh - 800) {
                    await this.loadNext();
                }
            }, 400);
            window.addEventListener('scroll', handler);
            handler(); // 立即检查一次
        }

        async loadNext() {
            if (!this.nextInfo) return;
            this.isLoading = true;
            this.pageNum++;

            try {
                console.log(`[新浪翻页] 加载第 ${this.pageNum} 页`);
                // 使用 MyApi.http.post 发起 POST 请求
                const [err, html] = await MyApi.http.post(this.nextInfo.url, this.nextInfo.params);
                if (err || !html) throw err || new Error('空响应');

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // 获取新内容（使用与主容器相同的选择器逻辑）
                let content = [];
                const possibleContainers = [
                    '.result', '.blkResult', '.list', '.search-result', '.news-item',
                    '#result', '.news-list', '.search-content', '.main-content'
                ];
                for (const sel of possibleContainers) {
                    const nodes = doc.querySelectorAll(sel);
                    if (nodes.length) {
                        content = Array.from(nodes);
                        console.log('[新浪翻页] 使用内容选择器:', sel);
                        break;
                    }
                }

                if (!content.length) {
                    console.warn('[新浪翻页] 第', this.pageNum, '页未找到内容');
                    this.updateNextInfo(doc);
                    return;
                }

                this.insertContent(content, doc);
                this.updateNextInfo(doc);
                this.hidePager();
                console.log(`[新浪翻页] 第 ${this.pageNum} 页加载完成`);
            } catch (e) {
                console.error('[新浪翻页] 加载失败:', e);
                this.pageNum--;
            } finally {
                this.isLoading = false;
            }
        }

        insertContent(contentElements, doc) {
            const target = this.contentContainer;
            if (!target) return;

            // 插入分隔符
            const separator = document.createElement('div');
            separator.className = 'autopagerize_page_info';
            separator.textContent = `—— 新浪搜索第 ${this.pageNum} 页 ——`;
            target.appendChild(separator);

            // 将新内容追加到目标容器后
            contentElements.forEach(container => {
                const items = container.children.length ? Array.from(container.children) : [container];
                items.forEach(item => {
                    if (item.nodeType === 1 && item.textContent.trim() !== '') {
                        target.appendChild(doc.importNode(item, true));
                    }
                });
            });
        }
    }


// ===================== 13. 头条搜索自动翻页模块 =====================
/**
 * 头条搜索自动翻页模块
 * 功能：滚动自动翻页，过滤热榜、相关搜索、筛选栏、底部空白等干扰项
 */
const initToutiaoPage = () => {
    // 头条搜索专用样式
    GM_addStyle(`
        .s-side-list,                     /* 右侧热榜 */
        .cs-pagination { display: none !important; }  /* 原生翻页条 */
    `);

    class ToutiaoPager {
        constructor() {
            this.RESULT_CONTAINER = '.s-result-list';
            this.RESULT_ITEM = '.result-content';
            this.TRIGGER_DISTANCE = 800;
            this.isLoading = false;
            this.nextUrl = null;
            this.pageNum = 1;
            this.container = document.querySelector(this.RESULT_CONTAINER);
            this.ticking = false;

            if (!this.container) {
                console.warn('[头条翻页] 未找到结果容器 .s-result-list，脚本退出');
                return;
            }

            this.init();
        }

        async init() {
            // 先清理初始页面的干扰容器
            this.cleanPage();

            this.nextUrl = this.getNextUrl();
            if (this.nextUrl) {
                console.log('[头条翻页] 初始下一页:', this.nextUrl);
            } else {
                console.log('[头条翻页] 未找到下一页链接，可能只有一页');
            }

            this.bindScroll();
            this.startUrlChecker();
        }

        // 从文档中提取下一页链接
        getNextUrl(doc = document) {
            const pagination = doc.querySelector('.cs-pagination');
            if (!pagination) return null;
            const links = pagination.querySelectorAll('a');
            for (let link of links) {
                if (link.textContent.trim().includes('下一页')) {
                    const href = link.getAttribute('href');
                    if (href) return MyApi.resolveUrl(href);
                }
            }
            return null;
        }

        // 清理干扰容器
        cleanPage() {
            // 隐藏翻页条
            document.querySelectorAll('.cs-pagination').forEach(el => el.style.display = 'none');
            // 隐藏包含翻页条或加载动画的 .result-content 容器（首页底部空白）
            document.querySelectorAll(this.RESULT_ITEM).forEach(el => {
                if (el.querySelector('.cs-pagination') ||
                    el.querySelector('.bar_3xTirN') ||
                    el.querySelector('.text-center.mx-auto')) {
                    el.style.display = 'none';
                }
            });
        }

        // 添加翻页分隔符（上下间距25px）
        addSeparator() {
            const sep = document.createElement('div');
            sep.style.cssText = 'margin: 25px 0; padding: 10px; border-top: 1px solid #e8e8e8; border-bottom: 1px solid #e8e8e8; color: #999; text-align: center; clear: both;';
            sep.textContent = `—— 已加载第 ${this.pageNum} 页 ——`;
            this.container.appendChild(sep);
        }

        // 干扰项检测特征
        isDistractingElement(el) {
            const features = [
                () => el.querySelector('[data-test-card-id="SearchBar"]'),      // 头部搜索框
                () => el.querySelector('[data-test-card-id="76-undefined"]'),   // 热榜
                () => el.querySelector('[data-test-card-id="20-undefined"]'),   // 相关搜索
                () => {
                    const text = el.textContent || '';
                    return (text.includes('全网内容') || text.includes('只看头条')) &&
                           el.querySelector('.cs-select-pro');                    // 筛选栏
                },
                () => el.querySelector('.cs-pagination') ||                      // 翻页条
                     el.querySelector('.bar_3xTirN') ||                          // 底部加载条
                     el.querySelector('.text-center.mx-auto')                    // 底部空白容器
            ];
            return features.some(f => f());
        }

        // 过滤真实结果项
        filterRealItems(elements) {
            return Array.from(elements).filter(el => !this.isDistractingElement(el));
        }

        // 加载下一页
        async loadNext() {
            if (this.isLoading || !this.nextUrl) return;

            this.isLoading = true;
            this.pageNum++;

            try {
                console.log('[头条翻页] 加载第', this.pageNum, '页:', this.nextUrl);
                const [err, html] = await MyApi.http.get(this.nextUrl);
                if (err || !html) {
                    console.error('[头条翻页] 请求失败:', err);
                    return;
                }

                const doc = new DOMParser().parseFromString(html, 'text/html');
                const allItems = doc.querySelectorAll(this.RESULT_ITEM);
                const newItems = this.filterRealItems(allItems);

                if (!newItems.length) {
                    console.warn('[头条翻页] 第', this.pageNum, '页无有效结果');
                    this.nextUrl = null;
                    return;
                }

                this.addSeparator();
                newItems.forEach(item => {
                    this.container.appendChild(item.cloneNode(true));
                });

                // 更新下一页链接
                const newNextUrl = this.getNextUrl(doc);
                if (newNextUrl) {
                    this.nextUrl = newNextUrl;
                    console.log('[头条翻页] 更新下一页链接:', this.nextUrl);
                } else {
                    this.nextUrl = null;
                }

                this.cleanPage(); // 清理新内容可能带入的干扰
                console.log('[头条翻页] 第', this.pageNum, '页加载完成');
            } catch (e) {
                console.error('[头条翻页] 加载失败:', e);
                this.pageNum--;
            } finally {
                this.isLoading = false;
            }
        }

        // 滚动监听（使用 requestAnimationFrame 优化）
        onScroll() {
            if (this.isLoading || !this.nextUrl) return;
            const scrollTop = window.scrollY;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = window.innerHeight;
            if (scrollTop + clientHeight >= scrollHeight - this.TRIGGER_DISTANCE) {
                this.loadNext();
            }
        }

        bindScroll() {
            const scrollHandler = () => {
                if (!this.ticking) {
                    requestAnimationFrame(() => {
                        this.onScroll();
                        this.ticking = false;
                    });
                    this.ticking = true;
                }
            };
            window.addEventListener('scroll', scrollHandler);
            scrollHandler(); // 立即检查一次
        }

        // 定时检查下一页链接（应对动态变化）
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

    // 启动翻页
    MyApi.safeFunc(() => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new ToutiaoPager());
        } else {
            new ToutiaoPager();
        }
    });
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

        // 注入控制滚动条的 CSS 类（!important 确保优先级）
        GM_addStyle(`
            .huxiu-panel-open,
            .huxiu-panel-open body {
                overflow: hidden !important;
            }
            /* 保证搜索结果列表内部有滚动条 */
            .search-result {
                max-height: 70vh !important;
                overflow-y: auto !important;
            }
        `);

        // 滚动锁定状态管理
        let isLocked = false;
        const lockScroll = () => {
            if (!isLocked) {
                document.documentElement.classList.add('huxiu-panel-open');
                isLocked = true;
                console.log('滚动已锁定');
            }
        };
        const unlockScroll = () => {
            if (isLocked) {
                document.documentElement.classList.remove('huxiu-panel-open');
                isLocked = false;
                console.log('滚动已解锁');
            }
        };

        // 根据 transitionShow 类判断面板是否打开
        const isPanelOpen = () => {
            const panel = document.querySelector('.search.home-search');
            return panel && panel.classList.contains('transitionShow');
        };

        // 更新滚动锁定状态
        const updateScrollLock = () => {
            if (isPanelOpen()) {
                lockScroll();
            } else {
                unlockScroll();
            }
        };

        // 1. 监听搜索面板的 class 变化（最核心）
        const panel = document.querySelector('.search.home-search');
        if (panel) {
            const observer = new MutationObserver(updateScrollLock);
            observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
        } else {
            // 如果面板还未出现，等待它出现后再监听
            const waitObserver = new MutationObserver((mutations, obs) => {
                const p = document.querySelector('.search.home-search');
                if (p) {
                    obs.disconnect();
                    const observer = new MutationObserver(updateScrollLock);
                    observer.observe(p, { attributes: true, attributeFilter: ['class'] });
                    updateScrollLock(); // 初始检查
                }
            });
            waitObserver.observe(document.body, { childList: true, subtree: true });
        }

        // 2. 监听搜索按钮点击（快速响应打开）
        const searchBtn = document.querySelector('.search-icon-container .search-btn, svg.search-btn.pointer');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                // 点击后立即检查，面板类可能还未变化，稍等再检查
                setTimeout(updateScrollLock, 50);
            });
        }

        // 3. 监听关闭按钮点击（快速响应关闭）
        const closeBtn = document.querySelector('.search-icon-container .close-btn, svg.close-btn.pointer');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                setTimeout(updateScrollLock, 50);
            });
        }

        // 4. 轮询兜底（每300ms检测一次，确保任何方式打开/关闭都能捕获）
        setInterval(updateScrollLock, 300);

        // 初始检查
        updateScrollLock();

    } else if (/search\.sina\.com\.cn/.test(hostname)) {
        injectSinaStyles();
        initSinaSearch();
        MyApi.safeFunc(() => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => new SinaSearchPager());
            } else {
                new SinaSearchPager();
            }
        });
    }

})();