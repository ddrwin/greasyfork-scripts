// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、CSDN、Google、Bing搜索按钮，为Google/Bing添加百度/Google/Bing辅助搜索框
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google、Bing搜索按钮，一键跳转到多个搜索引擎；在Google搜索结果页添加内联百度/Bing搜索框；在Bing搜索结果页添加内联百度/Google搜索框。支持去除百度结果页面的广告和右边栏。集成了快科技搜索页（so.mydrivers.com）中转，修复社交问答中驱动之家搜索失败问题，并将驱动之家搜索链接移至末尾。按钮样式统一为百度页风格。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      1.9.9-test
// @author       ddrwin (修改 by YourName)
// @run-at       document-end
// @match        *://www.baidu.com/s*
// @match        *://www.baidu.com/baidu*
// @match        *://*.baidu.com/s*
// @match        *://*.baidu.com/baidu*
// @match        *://www.google.com/search*
// @match        *://www.google.com.*/search*
// @match        *://www.bing.com/search*
// @match        *://so.mydrivers.com/default.htm*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @note         2026.2.21 V1.9.9 增强悬停动画 + 点击翻页/更多按钮自动刷新
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
        /* 增强悬停动画 */
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

        // ---------- 强制刷新机制 (按您的要求) ----------
        let lastRefreshTime = 0;
        const MIN_REFRESH_INTERVAL = 5000; // 5秒内不重复刷新
        const scheduleRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) return;
            lastRefreshTime = now;
            setTimeout(() => {
                console.log('[Baidu++] 检测到内容变化，执行强制刷新');
                location.reload();
            }, 500);
        };

        // 监听 #content_left 的子节点变化（翻页或AJAX加载）
        const contentLeft = document.querySelector('#content_left');
        if (contentLeft) {
            const refreshObserver = new MutationObserver((mutations) => {
                for (const mut of mutations) {
                    if (mut.addedNodes.length > 0) {
                        // 检查是否有新的结果项被添加
                        const added = Array.from(mut.addedNodes).some(node =>
                            node.nodeType === 1 && (
                                node.matches?.('.result, .c-container, [class*="result"]') ||
                                node.querySelector?.('.result, .c-container, [class*="result"]')
                            )
                        );
                        if (added) {
                            scheduleRefresh();
                            break;
                        }
                    }
                }
            });
            refreshObserver.observe(contentLeft, { childList: true, subtree: true });
        }

        // 监听搜索按钮点击（百度一下）
        const searchBtn = document.querySelector('#su, .s_btn, input[type="submit"]');
        if (searchBtn) {
            searchBtn.addEventListener('click', scheduleRefresh);
        }

        // 监听搜索表单提交
        const searchForm = document.querySelector('#form, form[name="f"]');
        if (searchForm) {
            searchForm.addEventListener('submit', scheduleRefresh);
        }

        // 新增：监听翻页和加载更多按钮的点击，触发强制刷新
        document.addEventListener('click', function(e) {
            const target = e.target;
            // 如果点击在翻页区域（#page内），直接刷新
            if (target.closest('#page')) {
                scheduleRefresh();
                return;
            }
            // 检查是否是链接或按钮，且文本包含特定关键词（下一页、上一页、更多、展开、更多结果）
            if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.type === 'submit') {
                const text = (target.textContent || target.innerText || '').trim();
                if (/^(下一页|上一页|更多|展开|更多结果)$/i.test(text)) {
                    scheduleRefresh();
                }
            }
        }, true); // 使用捕获阶段确保尽早执行

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
    }
    // ---------- Google页面处理（内联百度/Bing搜索框）----------
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
    // ---------- Bing页面处理（内联百度/Google搜索框）----------
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