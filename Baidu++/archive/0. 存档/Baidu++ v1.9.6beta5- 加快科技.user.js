// ==UserScript==
// @name         Baidu++：多功能搜索增强（按钮消失+间距修复最终版）
// @description  百度搜索增强，彻底解决筛选后按钮消失、间距设置无效问题，全功能保留
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.3
// @author       ddrwin
// @run-at       document-end
// @match        *://www.baidu.com/s*
// @match        *://www.baidu.com/baidu*
// @match        *://*.baidu.com/s*
// @match        *://*.baidu.com/baidu*
// @match        *://www.google.com/search*
// @match        *://www.google.com.*/search*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// ==/UserScript==
(function() {
    'use strict';
    const hostname = location.hostname;

    // ========== 【精准间距控制，单位px，直接改数字即可】 ==========
    // 1. 顶部固定搜索框预留高度（适配百度搜索框，建议55-65）
    const HEAD_FIXED_HEIGHT = 60;
    // 2. 自定义按钮组 ↔ 顶部搜索框 的间距
    const BTN_TO_HEAD_GAP = 5;
    // 3. 导航栏（网页/图片那一行） ↔ 自定义按钮组 的间距
    const NAV_TO_BTN_GAP = 8;
    // 4. 工具栏（筛选栏） ↔ 导航栏 的间距（设0就完全贴紧，无任何空隙）
    const TOOL_TO_NAV_GAP = 0;
    // 5. 搜索结果列表 ↔ 工具栏 的间距
    const CONTENT_TO_TOOL_GAP = 10;
    // ==============================================================

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
    // 防抖函数：避免DOM频繁变化导致重复执行
    const debounce = (func, wait = 300) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
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
    const btnBoxStyle = `
        display: block;
        margin: ${BTN_TO_HEAD_GAP}px auto 0;
        padding: 8px 0;
        width: 100%;
        max-width: 1200px;
        z-index: 9999;
        background: #fff;
    `;

    // 【核心修复】全局样式，覆盖原生间距+解决层级遮挡
    GM_addStyle(`
        /* 原功能：去广告、隐藏右侧栏 */
        #content_right { display: none !important; }
        ._content-border_1q9is_4 { background-color: #f0f9e8 !important; }

        /* 1. 顶部搜索框固定，全页面最高层级 */
        #head {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            z-index: 999999 !important;
            background: #fff !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
        }

        /* 2. 页面整体只给顶部搜索框留空间，无多余留白 */
        body {
            padding-top: ${HEAD_FIXED_HEIGHT}px !important;
        }

        /* 【核心修复】覆盖百度原生间距，让自定义参数100%生效 */
        #s_tab {
            position: relative !important;
            z-index: 99999 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
            margin-top: ${NAV_TO_BTN_GAP}px !important; /* 导航栏和按钮组的间距 */
            margin-bottom: 0 !important; /* 彻底清除原生底部间距，TOOL_TO_NAV_GAP完全可控 */
        }
        #s_tab_inner {
            position: relative !important;
            background: #fff !important;
        }

        /* 【核心修复】导航栏和工具栏的间距完全由TOOL_TO_NAV_GAP控制 */
        #content_left {
            position: relative !important;
            z-index: 999 !important;
            margin-top: ${TOOL_TO_NAV_GAP}px !important; /* 设0就完全贴紧导航栏 */
            overflow: visible !important;
            height: auto !important;
        }

        /* 工具栏层级修复：永远在搜索结果最上层，点击展开不被遮挡 */
        .result-molecule[tpl="app/search-tool"] {
            position: relative !important;
            z-index: 9999 !important;
            overflow: visible !important;
            height: auto !important;
            margin-bottom: ${CONTENT_TO_TOOL_GAP}px !important;
        }
        #tsn_inner {
            position: relative !important;
            z-index: 10000 !important;
            background: #fff !important;
            overflow: visible !important;
        }
        #tsn_inner .options_2Vntk {
            position: relative !important;
            z-index: 10001 !important;
        }
    `);

    // ---------- 百度页面核心逻辑 ----------
    if (/baidu\.com/.test(hostname)) {
        // 广告隐藏函数
        const hideAds = () => {
            $('.c-container').filter(function() {
                return $(this).find('.f13 span:contains("广告")').length > 0;
            }).hide();
        };

        // 【核心修复】按钮容器初始化：检查是否存在，不存在才创建，避免重复插入
        const initBtnContainer = () => {
            // 如果按钮容器已经存在，直接返回，不重复渲染
            if (document.getElementById('baidu-plus-btn-container')) return;

            // 插入按钮容器：固定在搜索框下方、导航栏上方
            const btnBox = $(`<div id="baidu-plus-btn-container" style="${btnBoxStyle}"></div>`).insertAfter('#head');
            
            // 按钮配置（全功能保留）
            const buttons = [
                {
                    id: 'social',
                    text: '社交问答',
                    bg: '#66CC00',
                    border: '#00CC00',
                    hover: '#33CC00',
                    urls: (kw) => [
                        `https://www.baidu.com/s?wd=${kw}%20site:mydrivers.com`,
                        `https://so.toutiao.com/search?dvpf=pc&keyword=${kw}`,
                        `https://s.weibo.com/weibo?q=${kw}`,
                        `https://search.bilibili.com/all?keyword=${kw}`,
                        `https://www.zhihu.com/search?q=${kw}`,
                        `https://www.ithome.com/search/${kw}.html`
                    ]
                },
                {
                    id: 'finance',
                    text: '财经搜索',
                    bg: '#6633FF',
                    border: '#3333FF',
                    hover: '#3333FF',
                    urls: (kw) => [
                        `https://www.baidu.com/s?wd=${kw}%20site:huxiu.com`,
                        `https://www.baidu.com/s?wd=${kw}%20site:caijing.com.cn`,
                        `https://www.cls.cn/searchPage?keyword=${kw}`,
                        `https://www.yicai.com/search?keys=${kw}`,
                        `https://xueqiu.com/k?q=${kw}`,
                        `https://wallstreetcn.com/search?q=${kw}`
                    ]
                },
                {
                    id: 'soft',
                    text: '软件搜索',
                    bg: '#FF9966',
                    border: '#FF9900',
                    hover: '#FF9933',
                    urls: (kw) => [
                        `https://github.com/search?q=${kw}`,
                        `https://www.baidu.com/s?wd=${kw}%20site:www.52pojie.cn`,
                        `https://www.baidu.com/s?wd=${kw}%20site:geekotg.com`,
                        `https://www.baidu.com/s?wd=${kw}%20site:weidown.com`,
                        `https://www.ypojie.com/?s=${kw}`
                    ]
                },
                {
                    id: 'pan',
                    text: '网盘搜索',
                    bg: '#3385ff',
                    border: '#2d78f4',
                    hover: '#317ef3',
                    urls: (kw) => [
                        `https://www.pandashi8.com/search?keyword=${kw}`,
                        `https://www.pikasoo.top/search/?pan=all&q=${kw}`,
                        `https://btdig.com/search?q=${kw}`,
                        `https://bt4g.org/search?q=${kw}`,
                        `https://www.baidu.com/s?wd=${kw}%20百度网盘`
                    ]
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

            // 渲染按钮
            buttons.forEach(btn => {
                const $btn = $(`<input type="button" id="${btn.id}" value="${btn.text}" style="${buttonStyle} background:${btn.bg}; border-bottom:1px solid ${btn.border};" onmouseover="this.style.background='${btn.hover}'" onmouseout="this.style.background='${btn.bg}'">`).appendTo(btnBox);
                $btn.on('click', () => {
                    const kw = encodeURIComponent(getSearchKeyword());
                    if (kw) openAllWindows(btn.urls(kw));
                });
            });
        };

        // 【核心修复】监听页面DOM变化，解决异步刷新后按钮消失问题
        const pageObserver = new MutationObserver(debounce(() => {
            initBtnContainer(); // 检查并重建按钮
            hideAds(); // 重新隐藏新加载的广告
        }));

        // 监听整个页面的DOM变化，覆盖所有异步刷新场景
        pageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 页面首次加载执行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initBtnContainer();
                hideAds();
            }, { once: true });
        } else {
            initBtnContainer();
            hideAds();
        }
    }

    // ---------- Google页面处理（全功能保留） ----------
    else if (/google\.com/.test(hostname)) {
        $(() => {
            const searchInput = $(".gLFyf.gsfi:first");
            if (searchInput.length) {
                const btnContainer = $('<div style="display:inline-block; margin-left:10px;"></div>').appendTo($(".RNNXgb:first"));
                const baiduBtn = $('<button type="button" style="height:36px; padding:0 16px; border:none; border-radius:4px; background:#3385ff; color:white; cursor:pointer; font-size:14px;">百度一下</button>').appendTo(btnContainer);
                const updateUrl = () => {
                    const keyword = searchInput.val() || new URLSearchParams(location.search).get('q') || '';
                    baiduBtn.off('click').on('click', () => window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`));
                };
                updateUrl();
                searchInput.on('input', updateUrl);
            }
        });
    }

    // 注册菜单命令
    GM_registerMenuCommand("反馈建议", () => window.open("https://greasyfork.org/zh-CN/scripts/396960/feedback"));
})();