// ==UserScript==
// @name         今日头条、Mydrivers驱动之家、IT之家新闻站净化阅读，宽度适配，特定关键词的新闻标红加高亮、并把包含不感兴趣关键词的新闻屏蔽掉
// @description  对包含感兴趣的关键词的新闻高亮显示，并屏蔽掉不感兴趣的关键词的新闻
// @icon         http://www.drivergenius.com//favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/397075
// @version      2.0.4
// @author       ddrwin (重构版 - 保留驱动之家文章页AI摘要)
// @match        *://www.toutiao.com/*
// @match        *://*.ithome.com/*
// @include      http*://*.mydrivers.com/*
// @exclude      *://www.toutiao.com/video/*
// @grant        GM_addStyle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @note         重构版：模块化设计，关键词与颜色集中配置，便于自定义。驱动之家文章页：保留AI摘要，修复图片标签，移除广告/侧栏/悬浮按钮，宽屏居中。
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置区域（用户可自由修改）====================
    const CONFIG = {
        // 屏蔽的关键词（包含这些词的新闻条目将被隐藏）
        blockKeywords: [
            "小米", "红米", "雷军", "Redmi", "好物", "OPPO", "vivo", "卢伟冰", "紫米", "MIUI", "一加", "realme", "Galaxy", "红魔",
            "长城", "东风日产", "长安", "tcl", "天选", "上汽", "零跑", "广汽", "蔚来", "深蓝", "官方", "魅族", "tcl", "苏宁", "华米", "iQOO",
            "史低", "大促", "到手", "发车", "仅", "元/件"
        ],

        // 高亮关键词分组（每组可定义不同的样式，应用于首页和文章页）
        highlightGroups: [
            {
                name: "科普",
                keywords: ["北京", "阿里", "百度", "腾讯", "奔驰", "新一代", "中国", "美国", "女性", "太空", "NASA", "月球", "火星", "飞船", "火箭", "探测器", "宇宙", "暗黑", "科学"],
                style: "background-color:#FFFFCC; color:#000000;"
            },
            {
                name: "硬件",
                keywords: ["nApoleon", "ITX", "RTX", "DLSS", "Arrow", "Lake", "英特尔", "新一代", "Ultra", "Intel", "137", "国补", "265"],
                style: "font-weight:bold;"
            },
            {
                name: "人工智能",
                keywords: ["NVIDIA", "大模型", "OpenAI", "AI", "ChatGPT", "GPT", "人工智能", "芯片", "机器人", "GPU", "deepseek", "通义千问", "文心一言"],
                style: "background-color:#FFFFCC; color:#5555FF; font-weight:bold;"
            },
            {
                name: "华为",
                keywords: ["5G", "华为", "HMS", "鸿蒙", "HUAWEI", "麒麟", "光刻机", "Mate", "HarmonyOS", "荣耀", "海思"],
                style: "background-color:#CCEEFF; color:#5555FF; font-weight:bold;"
            },
            {
                name: "苹果|微软|特斯拉",
                keywords: ["苹果", "iPhone", "iPad", "ios", "iOS", "微软", "电动车", "特斯拉", "马斯克"],
                style: "background-color:#FFFFCC; color:#00CC00; font-weight:bold;"
            }
        ],

        // 各网站特定的布局调整（可根据需要启用/禁用）
        siteLayout: {
            toutiao: true,
            ithome: true,
            mydrivers: true
        }
    };
    // ==================== 配置结束 ====================

    // 工具函数：判断当前页面是否属于指定网站
    const Site = {
        isToutiao: () => location.hostname.includes('toutiao.com'),
        isIthome: () => location.hostname.includes('ithome.com'),
        isMydrivers: () => location.hostname.includes('mydrivers.com'),
        isHomePage: () => /^(https?:\/\/[^\/]+\/?)$/.test(location.href),
        isArticlePage: () => /news\.mydrivers\.com\/1\/\d+\/\d+\.htm/.test(location.href) || /\.html?$/.test(location.pathname)
    };

    // ==================== 模块：布局调整 ====================
    const LayoutAdjuster = {
        // 今日头条布局优化
        toutiao: function() {
            $('.right-container, .footer-wrapper, .right-sidebar, .ttp-toolbar, .detail-end-feed').remove();
            $('.left-container').css('width', '100%');
            $('.main-content').css({ width: '55%', marginLeft: '125px' });
            $('.main').css({ width: '65%', marginLeft: '0' });
        },

        // IT之家布局优化（通过CSS注入）
        ithome: function() {
            const css = `
                #news { padding-top:20px; padding-bottom:25px; }
                #nnews, #dt .content { width:100%; }
                #nav, #nav .fr { height:auto; }
                ul.nl { width:46%; padding-top:0; margin-top:0; }
                ul.nl li a { width:calc(100% - 60px); }
                #nnews .t-f { margin-bottom:20px; }
                #tt, .ra, #nav .fl, #news .fl, .hotkeyword, div.bl.bb, #fls.bb, #cp.bb, #side_func a, .fr .t-h, footer,
                div.mt.so, #top #music, #dt .fr, .newsgrade, .shareto, .related_post, .dajia {
                    display:none !important;
                }
                .article-share-code, .page-last, .page-next { display:none; }
                .fr { float:initial; }
                .cnbeta-update-list, .cnbeta-article { width:auto; }
                .pmsg { margin:0 auto; }
            `;
            GM_addStyle(css);
            $('.ad').each(function() { $(this).parent().hide(); });
            $('.t-b.clearfix').addClass('sel');
            $('#n-p').hide();
            $('#nmsg').on('click', () => location.reload());
        },

        // 驱动之家布局优化
        mydrivers: function() {
            // ----- 首页优化 -----
            if (Site.isHomePage()) {
                $('#newlist_1.zxgx').css('margin', '0 auto');
                // 原有的首页清理代码保持不变...
                $('.shidian').remove();
                $('.main_box').remove();
                $('#GC_box').nextAll().remove();
                $('#GC_box').remove();
                $('iframe, body link, body style').remove();
                $('.main_2, .nav_box, .main_right, .main_right_title').remove();
                $('.main').attr('style', 'width:1333px;');
                $('#news_content_1, #news_content_2, #news_content_3, #news_content_4, #news_content_5').after('<hr style="filter: alpha(opacity=100,finishopacity=0,style=3)" width="80%" color=#987cb9 size=1>').show();
                $('#news_content_page').remove();
            }
            // ----- 文章页优化 -----
            else if (Site.isArticlePage() && /news\.mydrivers\.com/.test(location.href)) {
                // 1. 移除核心干扰元素（广告、侧栏、今日视点）
                $('.baidu').remove();
                $('.main_right').remove();
                $('.baidu_right').remove();

                // 2. 移除左右两侧悬浮按钮
                $('#kkj_app_client').closest('li').remove();
                $('#rightTg').closest('li').remove();
                $('#contentjiucuo').closest('li').remove();
                $('#rightbaoliao').closest('li').remove();
                $('#rightfankui').closest('li').remove();
                $('#rightplun').closest('li').remove();
                $('#gotop').closest('li').remove();

                // 3. 额外清理（移除其他无关元素，但保留AI摘要）
                $('.pathway, .weixin, .news_xg, .top, .news_bt1, .zcdf, .share, #footer').remove();
                $('#dangbei_down').parent().remove();
                // 注意：不再移除AI摘要相关元素，AI摘要被保留

                // 4. 调整主内容区样式
                $('.main_left').removeAttr('style').css({
                    'width': '100%',
                    'max-width': '1200px',
                    'margin': '0 auto',
                    'float': 'none',
                    'padding': '0 20px',
                    'box-sizing': 'border-box'
                });
                $('.news_info').removeAttr('style').css({
                    'width': '100%',
                    'margin': '20px auto',
                    'padding': '20px',
                    'box-sizing': 'border-box',
                    'background': '#fff',
                    'border-radius': '8px',
                    'box-shadow': '0 2px 8px rgba(0,0,0,0.1)'
                });

                // 5. 处理评论区域
                $('#commentsiframe').attr('style', 'width:100%; max-width:1200px; margin:20px auto; display:block;');
                $('#commentsiframe').on('load', function() {
                    $(this).contents().find('.plun_box').css({ margin: '0 auto', 'padding-left': '45px' });
                    $(this).css('height', $(this).contents().find('body').height());
                });
            }
            // ----- 其他驱动之家页面清理 -----
            else if (Site.isMydrivers()) {
                $('.shidian, .product_box, .righttitle, .top_1_center, .pathway, .link, #footer').remove();
                $('.main_right div:not(:last-child)').remove();
            }

            // 所有驱动之家页面通用的清理
            $('.footer_about').remove();
            $('.share table tbody tr td:lt(2)').remove();
            $('.yzm').css('margin-right', '30px');
        }
    };

    // ==================== 模块：关键词处理 ====================
    const KeywordProcessor = {
        // 首页屏蔽
        blockOnHome: function() {
            if (!Site.isHomePage()) return;
            CONFIG.blockKeywords.forEach(keyword => {
                $(`a:contains(${keyword})`).closest('li, div, article').hide();
            });
        },

        // 首页高亮
        highlightOnHome: function() {
            if (!Site.isHomePage()) return;
            CONFIG.highlightGroups.forEach(group => {
                const selector = group.keywords.map(k => `a:contains(${k})`).join(',');
                $(selector).each(function() {
                    const currentStyle = $(this).attr('style') || '';
                    $(this).attr('style', currentStyle + group.style);
                });
            });
        },

        // 文章页高亮（遍历文本节点，避免破坏HTML标签）
        highlightInArticle: function() {
            if (!Site.isMydrivers() || !Site.isArticlePage()) return;

            // 获取所有需要高亮的文本节点所在的容器
            const $containers = $('.news_info, .news_content, .article-content, #AiSummaryLink'); // 增加AI摘要容器，确保其内部也被高亮
            if ($containers.length === 0) return;

            $containers.each(function() {
                const container = this;
                const walker = document.createTreeWalker(
                    container,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: function(node) {
                            if (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE') {
                                return NodeFilter.FILTER_REJECT;
                            }
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                );

                const textNodes = [];
                while (walker.nextNode()) {
                    textNodes.push(walker.currentNode);
                }

                // 构建关键词-样式映射
                const keywordStyleMap = new Map();
                CONFIG.highlightGroups.forEach(group => {
                    group.keywords.forEach(keyword => {
                        if (!keywordStyleMap.has(keyword)) {
                            keywordStyleMap.set(keyword, group.style);
                        }
                    });
                });

                const allKeywords = Array.from(keywordStyleMap.keys()).sort((a, b) => b.length - a.length);
                if (allKeywords.length === 0) return;

                // 转义正则特殊字符
                const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const escapedKeywords = allKeywords.map(escapeRegExp);
                const combinedPattern = escapedKeywords.join('|');
                const combinedRegex = new RegExp(`(${combinedPattern})`, 'g');

                textNodes.forEach(textNode => {
                    const text = textNode.nodeValue;
                    if (!combinedRegex.test(text)) return;

                    const newNode = document.createElement('span');
                    newNode.innerHTML = text.replace(combinedRegex, (match) => {
                        const style = keywordStyleMap.get(match);
                        return `<span style="${style}">${match}</span>`;
                    });
                    textNode.parentNode.replaceChild(newNode, textNode);
                });
            });
        }
    };

    // ==================== 主流程 ====================
    function main() {
        // 1. 执行布局调整
        if (Site.isToutiao() && CONFIG.siteLayout.toutiao) {
            LayoutAdjuster.toutiao();
        }
        if (Site.isIthome() && CONFIG.siteLayout.ithome) {
            LayoutAdjuster.ithome();
        }
        if (Site.isMydrivers() && CONFIG.siteLayout.mydrivers) {
            LayoutAdjuster.mydrivers();
        }

        // 2. 关键词处理
        if (Site.isHomePage()) {
            KeywordProcessor.blockOnHome();
            KeywordProcessor.highlightOnHome();
        } else if (Site.isArticlePage()) {
            KeywordProcessor.highlightInArticle();
        }
    }

    // 启动
    $(document).ready(main);
})();