// ==UserScript==
// @name         Baidu++：多功能搜索增强（百度+Google）
// @description  为百度搜索结果页添加软件、网盘、财经、社交问答、Google搜索按钮，点击后一次性打开多个搜索窗口；在Google搜索结果页添加百度搜索按钮。去除百度广告和右侧栏。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license      MIT
// @version      2.0
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
// @note         2020.2.22 V1.0 在百度搜索的结果页加入磁力、种子、网盘、Google搜索按钮；
// @note         2020.2.23 V1.1 在google搜索的结果页加入百度搜索按钮；
// @note         2020.2.25 V1.2 增加软件搜索、增加头条搜索、哔哩哔哩搜索；
// @note         2020.2.26 V1.3 重写代码，将种子搜索、磁力搜索集成到网盘搜索中、同时软件搜索增加多个搜索网址；
// @note         2020.2.27 V1.4 今日头条和bilibili集成到头条搜索中，知乎和CSDN集成到问答搜索中；
// @note         2020.5.30 V1.5 网盘搜索增加新的搜索结果，软件搜索增加大眼仔、微当、小众软件，问答搜索增加微信搜索、百度知道并整合哔哩哔哩，头条搜索增加移动端搜索；
// @note         2021.3.4 V1.6 网盘搜索增加新的搜索结果，软件搜索去除失效链接，问答搜索改成破解下载搜索、问答搜索里增加今日头条搜索；
// @note         2022.1.23 V1.7 合并软件搜索和破解搜索，问答搜索增加bilibili和驱动之家，增加行研搜索，去除失效的搜索入口；
// @note         2022.3.3 V1.8 更新网盘搜索，问答搜索增加IT之家，去除失效的搜索入口；
// @note         2024.1.29 V1.9 更新软件搜索，AI问答增加文心一言、讯飞星火、天工，去除失效的搜索入口；
// @note         2025.11.30 V1.9.5 修复关键词获取问题，确保所有搜索按钮都能正确带上搜索词；
// @note         2026.2.19 V2.0 代码重构：优化执行效率，移除弹窗提示，添加详细注释；更新网盘搜索按钮链接列表，提供更多磁力、种子、网盘搜索源；新增财经搜索、社交问答按钮，移除行研/AI问答按钮；广告去除改用动态监听，支持异步加载；简化百度站内搜索链接参数，保留必要字段；统一使用encodeURIComponent处理关键词，确保编码正确。
// ==/UserScript==

(function() {
    'use strict';
    const hostname = location.hostname;

    // ---------- 通用工具函数 ----------
    // 从百度搜索页面获取当前关键词（支持多种输入框和URL参数）
    const getSearchKeyword = () => {
        const input = document.querySelector('#chat-input-main, #kw, input[name="wd"], input[name="word"]');
        if (input && input.value) return input.value;

        const params = new URLSearchParams(location.search);
        const kw = params.get('wd') || params.get('word') || params.get('q');
        if (kw) return decodeURIComponent(kw);

        const titleMatch = document.title.match(/(.+?) - 百度搜索/);
        return titleMatch ? titleMatch[1] : '';
    };

    // 批量打开多个窗口，每个窗口延迟300ms，使用独立target名称，尽可能绕过弹窗拦截
    const openAllWindows = (urls) => {
        if (!urls || !urls.length) return;
        urls.forEach((url, i) => {
            setTimeout(() => {
                window.open(url, `_blank_${i}_${Date.now()}`, 'noopener,noreferrer');
            }, i * 300);
        });
    };

    // ---------- 样式定义 ----------
    // 按钮基本样式（固定宽度100px，高度33px）
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
    // 按钮容器样式（绝对定位，通过top和transform调整位置）
    const containerStyle = `
        position: absolute;
        top: 40px;
        left: 0;
        transform: translateX(0px);
        padding: 10px 0;
        width: 100%;
        z-index: 999;
    `;

    // 全局样式：去除广告、右侧栏，调整间距，护眼色背景
    GM_addStyle(`
        #content_right { display: none !important; }
        .s_form.s_form_fresh { padding-bottom: 40px !important; }
        #s_tab_inner { margin-top: 40px !important; }
        .options_2Vntk { margin-top: 11px !important; }
        .tag-scroll_3EMBO { margin-top: 40px !important; padding-bottom: 0px !important; }
        #content_left { margin-top: 30px !important; }
        ._content-border_1q9is_4 { background-color: #f0f9e8 !important; }
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

        // 广告隐藏函数（使用jQuery选择器，支持动态加载）
        const hideAds = () => {
            $('.c-container').filter(function() {
                return $(this).find('.f13 span:contains("广告")').length > 0;
            }).hide();
        };

        // 初始化百度页面的所有按钮
        const initBaiduButtons = (container) => {
            // 首次隐藏广告
            hideAds();

            // 监听搜索结果区域变化，动态隐藏新加载的广告
            const adObserver = new MutationObserver(() => hideAds());
            const contentLeft = document.querySelector('#content_left');
            if (contentLeft) {
                adObserver.observe(contentLeft, { childList: true, subtree: true });
            }

            const btnContainer = $(`<div style="${containerStyle}"></div>`).appendTo(container);

            // 按钮配置数组：每个对象包含id、显示文本、背景色、边框色、悬停色、链接生成函数
            const buttons = [
                {
                    id: 'social',
                    text: '社交问答',
                    bg: '#66CC00',
                    border: '#00CC00',
                    hover: '#33CC00',
                    urls: (kw) => [
                        `https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&tn=51076811_dg&wd=${kw}%20site:mydrivers.com&oq=${kw}%20site:mydrivers.com&rsv_pq=825fb96c042e081c&rsv_t=6bdasfrTqWvDmPYUpYiIJz6NGXzSbtW98zxwsZnHtefxFtCQYw1C%2B6hNkh0vBr5wFWU&rqlang=cn&rsv_enter=1&rsv_dl=tb&gpc=stf%3D1768799315%2C1771477715%7Cstftype%3D1&tfflag=1`,
                        `https://so.toutiao.com/search?dvpf=pc&source=input&keyword=${kw}`,
                        `https://s.weibo.com/weibo?q=${kw}&Refer=top`,
                        `https://search.bilibili.com/all?keyword=${kw}&order=pubdate`,
                        `https://www.zhihu.com/search?type=content&q=${kw}`,
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

            // 循环创建按钮并绑定点击事件
            buttons.forEach(btn => {
                const $btn = $(`<input type="button" id="${btn.id}" value="${btn.text}" style="${buttonStyle} background:${btn.bg}; border-bottom:1px solid ${btn.border};" onmouseover="this.style.background='${btn.hover}'" onmouseout="this.style.background='${btn.bg}'">`).appendTo(btnContainer);
                $btn.on('click', () => {
                    const kw = encodeURIComponent(getSearchKeyword());
                    if (kw) openAllWindows(btn.urls(kw));
                });
            });
        };
    }
    // ---------- Google页面处理 ----------
    else if (/google\.com/.test(hostname)) {
        $(() => {
            const searchInput = $(".gLFyf.gsfi:first");
            if (searchInput.length) {
                const btnContainer = $('<div style="display:inline-block; margin-left:10px;"></div>').appendTo($(".RNNXgb:first"));
                const baiduBtn = $('<button id="google++" type="button" style="height:36px; padding:0 16px; border:none; border-radius:4px; background:#3385ff; color:white; cursor:pointer; font-size:14px;" title="使用百度搜索">百度一下</button>').appendTo(btnContainer);
                const updateUrl = () => {
                    const keyword = searchInput.val() || new URLSearchParams(location.search).get('q') || '';
                    baiduBtn.off('click').on('click', () => window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`));
                };
                updateUrl();
                searchInput.on('input', updateUrl);
            }
        });
    }

    // 注册菜单命令，方便反馈
    GM_registerMenuCommand("反馈建议", () => window.open("https://greasyfork.org/zh-CN/scripts/396960/feedback"));
})();