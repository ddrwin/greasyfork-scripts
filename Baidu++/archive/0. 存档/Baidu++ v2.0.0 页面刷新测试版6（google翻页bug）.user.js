// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、CSDN、Google、Bing搜索按钮，为Google/Bing添加百度/Google/Bing辅助搜索框
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google、Bing搜索按钮，一键跳转到多个搜索引擎；在Google搜索结果页添加内联百度/Bing搜索框；在Bing搜索结果页添加内联百度/Google搜索框。支持去除百度结果页面的广告和右边栏。集成了快科技搜索页（so.mydrivers.com）中转，修复社交问答中驱动之家搜索失败问题，并将驱动之家搜索链接移至末尾。按钮样式统一为百度页风格。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.0.0-autopager
// @author       ddrwin (整合自动翻页)
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
// ==/UserScript==

(function() {
    'use strict';
    const hostname = location.hostname;

    // ========== 百度搜索结果页间距调整参数（按需修改） ==========
    const PAGE_TOP = 40;
    const NAV_MARGIN_TOP = 0;
    const TOOL_MARGIN_TOP = 0;
    const CONTENT_MARGIN_TOP = 10;
    // ==========================================================

    // ===================== 1. 核心工具函数（AC-baidu原版提取） =====================
    const MyApi = (() => {
        /**
         * 安全执行函数（防止单个逻辑异常导致脚本崩溃）
         * @param {Function} callback 执行函数
         * @param {Function} catchCallback 异常回调
         * @returns {any} 函数执行结果
         */
        const safeFunc = (callback, catchCallback = () => {}) => {
            try {
                return callback()
            } catch (e) {
                console.log('[AC-Pager] 执行异常:', e)
                return catchCallback()
            }
        }

        /**
         * 等待元素加载（核心：保证分页箭头/文字加载完成后再处理）
         * @param {string|Function} selector CSS/XPath/检测函数
         * @param {Function} callbackFunc 找到元素后的回调
         * @param {number} findTick 检测间隔(ms)
         * @param {boolean} clearAfterFind 找到后是否停止检测
         * @param {number} timeout 超时时间(ms)
         * @param {Function} errCallback 超时回调
         */
        const safeWaitFunc = async (selector, callbackFunc = () => {}, findTick = 200, clearAfterFind = true, timeout = 20000, errCallback) => {
            if (findTick < 20) findTick = 20
            let count = timeout / findTick
            let t_id = null

            const firstSuccess = await mainRunFunc()
            if (!clearAfterFind || !firstSuccess) {
                t_id = setInterval(mainRunFunc, findTick)
            }

            // 处理字符串选择器（CSS/XPath）
            async function strRun() {
                let hasFind = false
                const selectRes = document.querySelectorAll(selector)
                if (selectRes.length >= 1) {
                    hasFind = true
                    if (clearAfterFind) clearId()
                    await callbackFunc(selectRes[0])
                }
                return hasFind
            }

            // 处理函数式选择器
            async function funcRun() {
                let hasFind = false
                const res = selector()
                if (res && res.length > 0) {
                    hasFind = true
                    if (clearAfterFind) clearId()
                    await callbackFunc(res[0])
                } else if (res) {
                    hasFind = true
                    if (clearAfterFind) clearId()
                    await callbackFunc()
                }
                return hasFind
            }

            // 主检测逻辑
            async function mainRunFunc() {
                if (count-- < 0) {
                    clearId()
                    errCallback && errCallback()
                    return false
                }
                return typeof selector === "string" ? await strRun() : await funcRun()
            }

            // 清除定时器
            function clearId() {
                if (t_id) clearInterval(t_id)
            }
        }

        /**
         * 提取URL参数（处理翻页链接参数）
         * @param {string} attribute 参数名
         * @param {string} baseUrl 目标URL，默认当前页面
         * @returns {string|null} 参数值
         */
        function getUrlAttribute(baseUrl = location.href, attribute) {
            const [, search = ''] = baseUrl.split("?")
            const searchValue = search.split("&")
            for (let i = 0; i < searchValue.length; i++) {
                const [key, value] = searchValue[i].split("=")
                if (key === attribute) {
                    return decodeURIComponent(value || '')
                }
            }
            return null
        }

        /**
         * HTTP请求封装（AC-baidu原版GM_xmlhttpRequest）
         * @returns {Object} get方法
         */
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
                    })
                })
            }
        }

        /**
         * 等待指定时间
         * @param {number} ms 毫秒数
         * @returns {Promise<void>}
         */
        const waitTime = (ms) => new Promise(resolve => setTimeout(resolve, ms))

        /**
         * 防抖函数（防止滚动时频繁触发翻页）
         * @param {Function} fn 目标函数
         * @param {number} delay 延迟时间
         * @returns {Function} 防抖后的函数
         */
        const debounce = (fn, delay) => {
            let timer = null
            return function () {
                clearTimeout(timer)
                timer = setTimeout(() => fn.apply(this, arguments), delay)
            }
        }

        /**
         * XPath元素获取（核心：精准定位分页箭头/文字）
         * @param {string} xpath XPath表达式
         * @param {Node} contextNode 上下文节点
         * @param {Document} doc 文档对象
         * @returns {HTMLElement[]} 元素数组
         */
        function getAllElementsByXpath(xpath, contextNode = document, doc = document) {
            const result = []
            try {
                const query = doc.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
                for (let i = 0; i < query.snapshotLength; i++) {
                    const node = query.snapshotItem(i)
                    if (node.nodeType === 1) result.push(node)
                }
            } catch (err) {
                console.error('[AC-Pager] XPath解析失败:', xpath, err)
            }
            return result
        }

        /**
         * 通用元素获取器（AC-baidu核心：支持CSS/XPath/函数，处理分页箭头/文字）
         * @param {string|Function} selector css;xxx | XPath | 自定义函数
         * @param {Node} contextNode 上下文节点
         * @param {Document} doc 文档对象
         * @returns {HTMLElement[]} 元素数组
         */
        const getAllElements = (selector, contextNode = document, doc = document) => {
            if (!selector) return []
            contextNode = contextNode || doc

            if (typeof selector === 'string') {
                // CSS选择器（前缀css;）
                if (selector.startsWith('css;')) {
                    return Array.from(contextNode.querySelectorAll(selector.slice(4)))
                }
                // XPath选择器（默认）
                else {
                    return getAllElementsByXpath(selector, contextNode, doc)
                }
            }
            // 函数式选择器
            else if (typeof selector === 'function') {
                const res = selector(doc)
                return Array.isArray(res) ? res : []
            }
            return []
        }

        return {
            safeFunc,
            safeWaitFunc,
            getUrlAttribute,
            http,
            waitTime,
            debounce,
            getAllElementsByXpath,
            getAllElements
        }
    })()

    // ===================== 2. 站点翻页配置（强制居中样式） =====================
    class SitePagerConfig {
        constructor() {
            this.siteName = this._detectSite()
            this.pagerConfig = this._getFullPagerConfig()
        }

        // 检测当前站点
        _detectSite() {
            const host = location.host
            const pathname = location.pathname

            if (host.includes('baidu.com')) {
                return pathname.includes('xueshu') ? 'baidu_xueshu' : 'baidu'
            } else if (host.includes('google.com') || host.includes('google.')) {
                return pathname.includes('scholar') ? 'google_scholar' : 'google'
            } else if (host.includes('bing.com')) {
                return 'bing'
            } else if (host.includes('so.com')) {
                return 'haosou'
            } else if (host.includes('duckduckgo.com') || host.includes('dogedoge.com')) {
                return 'duck'
            }
            return ''
        }

        // 完整翻页配置（核心修改：强制居中样式）
        _getFullPagerConfig() {
            // 通用强制居中样式（所有站点共享，优先级最高）
            const centerStyle = `
                .autopagerize_page_info {
                    margin: 15px 0 !important;
                    padding: 10px !important;
                    border-top: 1px solid #eee !important;
                    border-bottom: 1px solid #eee !important;
                    color: #666 !important;
                    text-align: center !important; /* 强制居中，覆盖所有场景 */
                    width: 100% !important; /* 占满容器宽度，保证居中效果 */
                    clear: both !important; /* 清除浮动影响 */
                    font-size: 14px !important;
                }
                div.sp-separator {margin-bottom: 10px !important;}
                .c-img-border{display:none}
            `;

            const configs = {
                // 百度（含箭头/文字：下一页）
                baidu: {
                    nextLink: '//div[@id="page"]//a[contains(span/text(), "下一页")]',
                    pageElement: "css;div#content_left > *",
                    HT_insert: ["css;div#content_left", 2],
                    replaceE: "css;#page",
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
                // 谷歌
                google: {
                    nextLink: "id('pnnext')|id('navbar navcnt nav')//td[span]/following-sibling::td[1]/a|id('nn')/parent::a",
                    pageElement: "id('rso')|id('center_col')/style[contains(.,'relative')][id('rso')]",
                    HT_insert: ["css;#res", 2],
                    replaceE: '//div[@id="navcnt"] | //div[@id="rcnt"]//div[@role="navigation"]',
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Search Page ${pageNum} ——`,
                    afertPagerAutoCallFunc: (pageElements, scriptElements, toElement) => {
                        scriptElements.forEach((one) => {
                            const newScript = document.createElement('script')
                            newScript.textContent = one.textContent
                            newScript.type = one.type
                            newScript.nonce = one.nonce
                            try { toElement.appendChild(newScript) } catch (e) {}
                        })
                    }
                },
                // 谷歌学术
                google_scholar: {
                    nextLink: '//a[./span[@class="gs_ico gs_ico_nav_next"]]',
                    pageElement: '//div[@class="gs_r gs_or gs_scl"]',
                    HT_insert: ["css;#gs_res_ccl_mid", 2],
                    replaceE: '//div[@id="navcnt"] | //div[@id="rcnt"]//div[@role="navigation"]',
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— Google Scholar Page ${pageNum} ——`
                },
                // 必应
                bing: {
                    nextLink: "//a[contains(@class,\"sb_pagN\")]",
                    pageElement: "id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]",
                    HT_insert: ["id(\"b_results\")/li[@class=\"b_pag\"]", 1],
                    replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 必应搜索第 ${pageNum} 页 ——`
                },
                // 好搜
                haosou: {
                    nextLink: "//div[@id='page']//a[text()='下一页>'] | id('snext')",
                    pageElement: "//div[@id='container']/div[@id='main']/ul[@class='result']/li",
                    HT_insert: ["//div[@id='container']//ul[@class='result']", 2],
                    replaceE: "id('page')",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— 360好搜第 ${pageNum} 页 ——`,
                    afertPagerAutoCallFunc: () => {
                        if (unsafeWindow.So?.web?.lazyLoad?.init) {
                            unsafeWindow.So.web.lazyLoad.init()
                        }
                    }
                },
                // 鸭鸭/二狗
                duck: {
                    nextLink: "//a[contains(@class,\"sb_pagN\")]",
                    pageElement: "id(\"b_results\")/li[not(contains(@class,\"b_pag\") or contains(@class,\"b_ans b_top\"))]",
                    HT_insert: ["id(\"b_results\")/li[@class=\"b_pag\"]", 1],
                    replaceE: "id(\"b_results\")//nav[@role=\"navigation\"]",
                    stylish: centerStyle,
                    pageInfoText: (pageNum) => `—— DuckDuckGo第 ${pageNum} 页 ——`
                }
            }
            return configs[this.siteName] || null
        }
    }

    // ===================== 3. 自动翻页核心类（完整处理拼接/箭头/文字） =====================
    class AutoPager {
        constructor() {
            this.config = new SitePagerConfig().pagerConfig
            this.isLoading = false // 防重复加载锁
            this.pageNum = 1 // 当前页码
            this.nextPageUrl = null // 新增：缓存下一页的URL（解决翻页重复问题）
            this.init()
        }

        // 初始化
        async init() {
            if (!this.config) {
                console.log('[AC-Pager] 当前站点无翻页配置')
                return
            }

            // 等待页面基础结构加载完成
            await MyApi.waitTime(800)
            // 初始获取下一页URL（关键：首次加载时提取第一页的下一页链接）
            this.updateNextPageUrl()
            // 绑定滚动监听
            this.bindScrollListener()
            // 初始化样式（强制居中）
            this.initStyle()
        }

        // 新增：提取并更新下一页URL（支持从新页面DOM提取）
        updateNextPageUrl(tempDoc = document) {
            const nextLinkNode = MyApi.getAllElements(this.config.nextLink, tempDoc, tempDoc)[0]
            this.nextPageUrl = nextLinkNode ? nextLinkNode.href : null
        }

        // 初始化拼接样式（强制居中优先）
        initStyle() {
            if (!this.config.stylish) return
            const style = document.createElement('style')
            style.textContent = this.config.stylish
            // 插入到head末尾，确保优先级高于站点默认样式
            document.head.appendChild(style)
        }

        // 绑定滚动监听（防抖+距离检测）
        bindScrollListener() {
            const scrollHandler = MyApi.debounce(async () => {
                // 计算滚动位置（距离底部200px触发）
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
                const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
                const clientHeight = document.documentElement.clientHeight || window.innerHeight

                // 触发条件：未加载中 + 滚动到距离底部200px内
                if (scrollTop + clientHeight >= scrollHeight - 200 && !this.isLoading) {
                    await this.loadNextPage()
                }
            }, 300)

            window.addEventListener('scroll', scrollHandler)
            // 初始检测（页面加载完成时如果已经在底部，直接加载）
            scrollHandler()
        }

        // 加载下一页（核心：修复重复加载第二页问题）
        async loadNextPage() {
            this.isLoading = true
            try {
                // 1. 检查缓存的下一页URL是否存在（不再从当前DOM找）
                if (!this.nextPageUrl) {
                    console.log('[AC-Pager] 无更多页面（未找到下一页链接）')
                    this.isLoading = false
                    return
                }
                const nextUrl = this.nextPageUrl
                this.pageNum++

                // 2. 请求下一页内容
                console.log(`[AC-Pager] 加载第${this.pageNum}页:`, nextUrl)
                const [err, respText] = await MyApi.http.get(nextUrl)
                if (err || !respText) {
                    console.error('[AC-Pager] 页面请求失败:', err)
                    this.isLoading = false
                    return
                }

                // 3. 解析下一页HTML
                const tempDoc = new DOMParser().parseFromString(respText, 'text/html')

                // 4. 提取下一页内容元素
                const pageElements = MyApi.getAllElements(this.config.pageElement, tempDoc, tempDoc)
                if (!pageElements.length) {
                    console.log('[AC-Pager] 未提取到页面内容')
                    this.isLoading = false
                    return
                }

                // 5. 插入内容（含页分隔文字/处理箭头）
                await this.insertPageContent(pageElements, tempDoc)

                // 6. 关键修复：从新页面DOM中更新下一页URL（获取第三页/第四页链接）
                this.updateNextPageUrl(tempDoc)

                // 7. 替换/隐藏原分页栏（移除重复的下一页箭头/文字）
                this.replacePagerBar()

                console.log(`[AC-Pager] 第${this.pageNum}页加载完成（箭头/分页栏已处理）`)
            } catch (e) {
                console.error('[AC-Pager] 翻页异常:', e)
            } finally {
                this.isLoading = false
            }
        }

        // 插入下一页内容（核心：处理拼接位置+分隔文字+箭头）
        async insertPageContent(pageElements, tempDoc) {
            const [insertSelector, insertPos] = this.config.HT_insert || []
            if (!insertSelector || !insertPos) return

            // 定位插入节点
            const insertNode = MyApi.getAllElements(insertSelector)[0]
            if (!insertNode) return

            // 创建页分隔文字（强制居中）
            const pageInfoDiv = document.createElement('div')
            pageInfoDiv.className = 'autopagerize_page_info'
            pageInfoDiv.textContent = this.config.pageInfoText(this.pageNum)
            // 插入分隔文字（优先插入，保证居中显示）
            if (insertPos === 1) {
                insertNode.before(pageInfoDiv)
            } else {
                insertNode.append(pageInfoDiv)
            }

            // 插入下一页内容
            pageElements.forEach(el => {
                const newEl = document.importNode(el, true)
                if (insertPos === 1) {
                    insertNode.before(newEl) // 插入到目标节点前
                } else {
                    insertNode.append(newEl)  // 插入到目标节点末尾
                }
            })

            // 执行站点专属后置处理（谷歌/好搜的箭头/样式修复）
            if (this.config.afertPagerAutoCallFunc) {
                const scriptElements = MyApi.getAllElements('css;script', tempDoc, tempDoc)
                this.config.afertPagerAutoCallFunc(pageElements, scriptElements, insertNode)
            }
        }

        // 替换/隐藏原分页栏（移除重复的下一页箭头/文字）
        replacePagerBar() {
            if (!this.config.replaceE) return
            const replaceNodes = MyApi.getAllElements(this.config.replaceE)
            replaceNodes.forEach(node => {
                // 隐藏原分页栏（保留可恢复性）
                node.style.display = 'none'
            })
        }
    }

    // ---------- 通用工具函数 ----------
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

    // ---------- 样式定义 ----------
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

    // ---------- 全局样式（包含去广告、布局调整和卡片美化） ----------
    GM_addStyle(`
        /* 原Baidu++样式：去除广告、右侧栏，护眼色背景等 */
        #content_right { display: none !important; }
        .options_2Vntk { margin-top: 0px !important; }
        .tag-scroll_3EMBO { margin-top: 0px !important; padding-bottom: 0px !important; }
        /* 移除百度自带的绿色背景，避免干扰卡片背景 */
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
        /* 单列居中布局（来自 baiduOnePageStyle） */
        #content_left {
            width: 100% !important;
            max-width: 800px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            float: none !important;
        }

        /* 护眼绿色背景（来自 HuYanStyle） */
        body[baidu] {
            background-color: #DEF1EF !important;
        }

        /* 卡片容器：Lite 风格 + 护眼绿色卡片背景 */
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
            transform: scale(1.01) translateY(-2px) !important;
            background: #d4edea !important;
        }

        /* 标题行（保持 Lite 风格，但背景透明以显示卡片背景） */
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

        /* 摘要文本 */
        #content_left .result .c-abstract,
        #content_left .c-container .c-abstract,
        #content_left .result [class*="summary"] {
            color: #2c3e50 !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            margin: 4px 0 8px 0 !important;
        }

        /* 来源信息 */
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

        /* 工具按钮（快照等） */
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

    // ---------- 百度页面处理 ----------
    if (/baidu\.com/.test(hostname)) {
        // ---------- 动态保持搜索框底部间距 ----------
        const ensureFormPadding = () => {
            let form = document.querySelector('.s_form.s_form_fresh');
            if (!form) form = document.querySelector('.s_form');
            if (form) form.style.paddingBottom = '40px';
        };
        ensureFormPadding();

        // 监听 class 变化以维持间距
        const paddingObserver = new MutationObserver(() => ensureFormPadding());
        paddingObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // ---------- 强制刷新机制 (优化版，刷新前回到顶部) ----------
        let lastRefreshTime = 0;
        const MIN_REFRESH_INTERVAL = 1000; // 最小刷新间隔 1 秒，避免频繁重载
        const scheduleRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) return;
            lastRefreshTime = now;
            setTimeout(() => {
                console.log('[Baidu++] 检测到内容变化，执行强制刷新');
                window.scrollTo(0, 0); // 强制回到顶部
                location.reload();
            }, 50); // 延迟 50ms 后刷新，几乎立即生效
        };

        // 移除原有的翻页相关监听：不再监听 #page 点击和文本匹配“下一页”，避免与自动翻页冲突
        // 保留搜索框回车和“百度一下”按钮监听，确保首页搜索能正常触发刷新

        // 监听搜索按钮点击（百度一下）—— 同时覆盖新版和旧版按钮
        const searchBtn = document.querySelector('#chat-submit-button, #su, .s_btn, input[type="submit"]');
        if (searchBtn) {
            searchBtn.addEventListener('click', scheduleRefresh);
        }

        // 监听搜索表单提交
        const searchForm = document.querySelector('#form, form[name="f"]');
        if (searchForm) {
            searchForm.addEventListener('submit', scheduleRefresh);
        }

        // 保留其他点击监听（推荐关键词、相关搜索、大家还在搜等），移除翻页相关部分
        document.addEventListener('click', function(e) {
            const target = e.target;
            // 移除 #page 点击监听和文本匹配“下一页”等翻页相关部分
            // 检查是否是链接或按钮，且文本包含特定关键词（更多、展开、更多结果），但排除“下一页”
            if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.type === 'submit') {
                const text = (target.textContent || target.innerText || '').trim();
                // 只匹配“更多”、“展开”、“更多结果”，不再匹配“下一页”、“上一页”
                if (/^(更多|展开|更多结果)$/i.test(text)) {
                    scheduleRefresh();
                }
            }
            // 监听搜索按钮（百度一下）
            if (target.closest('#chat-submit-button')) {
                scheduleRefresh();
            }
            // 监听搜索框下拉推荐关键词（点击后搜索）
            if (target.closest('#normalSugSearchUl li')) {
                scheduleRefresh();
            }
            // 监听相关搜索链接（#rs_new 内的链接或 .rs-link_2DE3Q）
            if (target.closest('#rs_new a') || target.closest('.rs-link_2DE3Q')) {
                scheduleRefresh();
            }
            // 新增：监听“大家还在搜”区域（卡片 tpl="recommend_list" 内的链接）
            if (target.closest('.list_1V4Yg a') || target.closest('.item_3WKCf')) {
                scheduleRefresh();
            }
        }, true); // 使用捕获阶段确保尽早执行

        // 新增：监听搜索框回车（新版 #chat-textarea 和旧版 #kw）
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.isComposing) {
                const target = e.target;
                if (target.matches && (target.matches('#chat-textarea') || target.matches('#kw'))) {
                    scheduleRefresh();
                }
            }
        }, true);

        // ---------- 原有按钮和广告隐藏逻辑 ----------
        // 监听搜索框容器出现，用于定位按钮
        const observer = new MutationObserver((_, obs) => {
            const searchContainer = $('#chat-input-main').parent();
            if (searchContainer.length) {
                obs.disconnect();
                searchContainer.css('position', 'relative');
                initBaiduButtons(searchContainer);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // 广告隐藏函数
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

            // 判断是否为首页（无搜索结果页），若是则隐藏按钮容器
            const isHomePage = !location.search.includes('wd=') && !location.search.includes('word=') && (location.pathname === '/' || location.pathname === '');
            if (isHomePage) {
                btnContainer.hide();
            }

            // 按钮配置数组（按顺序显示）
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

        // ---------- 初始化自动翻页（仅在搜索结果页） ----------
        if (document.querySelector('#content_left')) {
            MyApi.safeFunc(() => {
                // 确保在 DOM 加载完成后初始化
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => new AutoPager());
                } else {
                    new AutoPager();
                }
            });
        }
    }
    // ---------- Google页面处理（内联百度/Bing搜索框，不启用自动翻页）----------
    else if (/google\.com/.test(hostname)) {
        // 防抖函数
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        // 创建搜索框的函数
        function createGoogleSearchBar() {
            // 移除旧的搜索框避免重复
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

            function getGoogleKeyword() {
                const input = document.querySelector('input[name="q"]');
                if (input && input.value) return input.value;
                const params = new URLSearchParams(location.search);
                const kw = params.get('q');
                if (kw) return decodeURIComponent(kw);
                return '';
            }

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

            function doBaiduSearch() {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank');
            }

            function doBingSearch() {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.bing.com/search?q=${encodeURIComponent(keyword)}`, '_blank');
            }

            baiduButton.addEventListener('click', doBaiduSearch);
            bingButton.addEventListener('click', doBingSearch);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doBaiduSearch();
            });
        }

        const googleObserver = new MutationObserver(debounce(createGoogleSearchBar, 300));
        googleObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        createGoogleSearchBar();
    }
    // ---------- Bing页面处理（内联百度/Google搜索框，启用自动翻页）----------
    else if (/bing\.com/.test(hostname) && location.pathname === '/search') {
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        function createBingSearchBar() {
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

            function getBingKeyword() {
                const input = document.querySelector('input[name="q"], #sb_form_q');
                if (input && input.value) return input.value;
                const params = new URLSearchParams(location.search);
                const kw = params.get('q');
                if (kw) return decodeURIComponent(kw);
                return '';
            }

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

            function doBaiduSearch() {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank');
            }

            function doGoogleSearch() {
                const keyword = input.value.trim();
                if (!keyword) {
                    alert('请输入关键词');
                    return;
                }
                window.open(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, '_blank');
            }

            baiduButton.addEventListener('click', doBaiduSearch);
            googleButton.addEventListener('click', doGoogleSearch);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doBaiduSearch();
            });
        }

        const bingObserver = new MutationObserver(debounce(createBingSearchBar, 300));
        bingObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        createBingSearchBar();

        // 在 Bing 搜索结果页初始化自动翻页
        MyApi.safeFunc(() => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => new AutoPager());
            } else {
                new AutoPager();
            }
        });
    }
    // ---------- 快科技搜索页中转 ----------
    else if (hostname === 'so.mydrivers.com' && location.pathname === '/default.htm') {
        $(function() {
            function getKeywordFromHash() {
                const hash = window.location.hash;
                if (!hash || !hash.startsWith('#q=')) return null;
                return decodeURIComponent(hash.substring(3));
            }

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
    }

    // 注册菜单命令，方便反馈
    GM_registerMenuCommand("反馈建议", () => window.open("https://greasyfork.org/zh-CN/scripts/396960/feedback"));
})();