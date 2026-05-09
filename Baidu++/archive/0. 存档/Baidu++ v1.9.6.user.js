// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、CSDN、Google搜索按钮，为Google添加百度搜索按钮
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google搜索按钮，一键跳转到磁力、种子、网盘、软件、头条、哔哩哔哩、Google搜索进行相同关键词的检索；在Google搜索结果页添加百度搜索按钮，一键跳转到百度搜索进行相同关键词的检索。支持去除百度结果页面的广告和右边栏。集成了快科技搜索页（so.mydrivers.com）中转，修复社交问答中驱动之家搜索失败问题，并将驱动之家搜索链接移至末尾。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      1.9.7
// @author       ddrwin (修改 by YourName)
// @run-at       document-end
// @match        *://www.baidu.com/s*
// @match        *://www.baidu.com/baidu*
// @match        *://*.baidu.com/s*
// @match        *://*.baidu.com/baidu*
// @match        *://www.google.com/search*
// @match        *://www.google.com.*/search*
// @match        *://so.mydrivers.com/default.htm*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @note         2026.2.21 V1.9.7 优化Google页百度按钮，使用encodeURIComponent确保编码正确；将驱动之家搜索移至社交问答最后；集成快科技搜索页中转，解决Referer问题。
// ==/UserScript==

(function() {
    'use strict';
    const hostname = location.hostname;

    // ========== 百度搜索结果页间距调整参数（按需修改） ==========
    const PAGE_TOP = 40;          // 整体下移，防止按钮被盖
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

    // 全局样式（百度页面布局调整）
    GM_addStyle(`
        /* 原Baidu++样式：去除广告、右侧栏，护眼色背景等 */
        #content_right { display: none !important; }
        .s_form.s_form_fresh { padding-bottom: 40px !important; }
        .options_2Vntk { margin-top: 0px !important; }
        .tag-scroll_3EMBO { margin-top: 0px !important; padding-bottom: 0px !important; }
        ._content-border_1q9is_4 { background-color: #f0f9e8 !important; }

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
    `);

    // ---------- 百度页面处理 ----------
    if (/baidu\.com/.test(hostname)) {
        // 监听页面加载，等待搜索框容器出现（用于定位按钮）
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
                        `https://s.weibo.com/weibo?q=${kw}&Refer=top`,
                        `https://search.bilibili.com/all?keyword=${kw}&order=pubdate`,
                        `https://www.zhihu.com/search?type=content&q=${kw}`,
                        `https://www.ithome.com/search/${kw}.html`,
                        // 驱动之家搜索放在最后
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
    // ---------- Google页面处理（优化版） ----------
    else if (/google\.com/.test(hostname)) {
        $(() => {
            // 查找 Google 搜索框
            const searchInput = $('input[name="q"]');
            if (searchInput.length) {
                // 在搜索框旁边添加百度按钮
                const btnContainer = $('<div style="display:inline-block; margin-left:10px;"></div>');
                // 尝试将按钮放在搜索框附近（Google 页面结构可能变化，这里简单追加到 form 内）
                const form = searchInput.closest('form');
                if (form.length) {
                    form.append(btnContainer);
                } else {
                    // 如果找不到 form，则放在搜索框后面
                    searchInput.after(btnContainer);
                }

                const baiduBtn = $('<button id="google-baidu-btn" type="button" style="height:36px; padding:0 16px; border:none; border-radius:4px; background:#3385ff; color:white; cursor:pointer; font-size:14px; margin-left:8px;" title="使用百度搜索">百度一下</button>').appendTo(btnContainer);

                // 获取当前关键词并更新按钮点击事件
                const updateBaiduLink = () => {
                    const keyword = searchInput.val() || new URLSearchParams(location.search).get('q') || '';
                    baiduBtn.off('click').on('click', () => {
                        if (keyword) {
                            window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`, '_blank');
                        } else {
                            alert('请输入搜索关键词');
                        }
                    });
                };

                updateBaiduLink();
                searchInput.on('input', updateBaiduLink);
            }
        });
    }
    // ---------- 快科技搜索页（so.mydrivers.com/default.htm）处理中转 ----------
    else if (hostname === 'so.mydrivers.com' && location.pathname === '/default.htm') {
        $(function() {
            function getKeywordFromHash() {
                const hash = window.location.hash;
                if (!hash || !hash.startsWith('#q=')) return null;
                return decodeURIComponent(hash.substring(3));
            }

            const keyword = getKeywordFromHash();
            if (!keyword) return;

            // 清除 hash，避免重复触发
            window.location.hash = '';
            console.log('快科技搜索页中转：关键词 =', keyword);

            // 等待搜索框和按钮加载完成
            const waitForElements = setInterval(() => {
                const searchInput = $('#s');               // 输入框 id="s"
                const searchButton = $('#btnsearch');       // 按钮 id="btnsearch"

                if (searchInput.length && searchButton.length) {
                    clearInterval(waitForElements);

                    // 填入关键词
                    searchInput.val(keyword);

                    // 直接触发按钮的点击事件，该按钮绑定了 gosearch()
                    searchButton.click();

                    // 页面即将跳转到搜索结果，后续代码不会执行
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