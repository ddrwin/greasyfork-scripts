// ==UserScript==
// @name         Baidu++：为百度搜索结果页添加磁力、种子、网盘、软件、头条、哔哩哔哩、知乎、CSDN、Google搜索按钮，为Google添加百度搜索按钮
// @description  给百度搜索引擎的结果页加入头条、哔哩哔哩、软件、网盘搜索按钮，一键跳转到磁力、种子、网盘、软件、头条、哔哩哔哩、Google搜索进行相同关键词的检索；在google搜索结果页添加百度搜索按钮，一键跳转到百度搜索进行相同关键词的检索。支持去除百度结果页面的广告和右边栏。
// @icon         https://www.baidu.com/cache/icon/favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/396960
// @license	 MIT
// @version      1.9
// @author       ddrwin
// @run-at       document-start
// @include      http*://*baidu.com/s*
// @include      http*://*baidu.com/baidu*
// @include      *://www.google.com/search?*
// @include      *://www.google.com.*/search?*
// @require      https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
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
// @downloadURL https://update.greasyfork.org/scripts/396960/Baidu%2B%2B%EF%BC%9A%E4%B8%BA%E7%99%BE%E5%BA%A6%E6%90%9C%E7%B4%A2%E7%BB%93%E6%9E%9C%E9%A1%B5%E6%B7%BB%E5%8A%A0%E7%A3%81%E5%8A%9B%E3%80%81%E7%A7%8D%E5%AD%90%E3%80%81%E7%BD%91%E7%9B%98%E3%80%81%E8%BD%AF%E4%BB%B6%E3%80%81%E5%A4%B4%E6%9D%A1%E3%80%81%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E3%80%81%E7%9F%A5%E4%B9%8E%E3%80%81CSDN%E3%80%81Google%E6%90%9C%E7%B4%A2%E6%8C%89%E9%92%AE%EF%BC%8C%E4%B8%BAGoogle%E6%B7%BB%E5%8A%A0%E7%99%BE%E5%BA%A6%E6%90%9C%E7%B4%A2%E6%8C%89%E9%92%AE.user.js
// @updateURL https://update.greasyfork.org/scripts/396960/Baidu%2B%2B%EF%BC%9A%E4%B8%BA%E7%99%BE%E5%BA%A6%E6%90%9C%E7%B4%A2%E7%BB%93%E6%9E%9C%E9%A1%B5%E6%B7%BB%E5%8A%A0%E7%A3%81%E5%8A%9B%E3%80%81%E7%A7%8D%E5%AD%90%E3%80%81%E7%BD%91%E7%9B%98%E3%80%81%E8%BD%AF%E4%BB%B6%E3%80%81%E5%A4%B4%E6%9D%A1%E3%80%81%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E3%80%81%E7%9F%A5%E4%B9%8E%E3%80%81CSDN%E3%80%81Google%E6%90%9C%E7%B4%A2%E6%8C%89%E9%92%AE%EF%BC%8C%E4%B8%BAGoogle%E6%B7%BB%E5%8A%A0%E7%99%BE%E5%BA%A6%E6%90%9C%E7%B4%A2%E6%8C%89%E9%92%AE.meta.js
// ==/UserScript==

(function() {
    'use strict';

    var hostname = window.location.hostname;

    if(hostname.match(RegExp(/baidu.com/))){
        // 去除一些无用的百度广告
        var style_tag_baidu = document.createElement('style');
        style_tag_baidu.innerHTML = '#content_right{display:none;}'; // 移除百度右侧栏
        document.head.appendChild(style_tag_baidu);
        document.addEventListener ("DOMContentLoaded",show_button_baidu);
        $('#content_left>div').has('span:contains("广告")').remove();// 去除常规广告

        // 在百度结果首页开始添加按钮
        function show_button_baidu () {

            //添加Google搜索按钮
            $('.s_btn_wr,#s_btn_wr').after('<input type="button" id="google" value="Google搜索" class="btn self-btn bg" style="float:right; font-size:14px; text-align:center; text-decoration:none; width:100px; height:33px; line-height:33px; margin-left:5px;-webkit-appearance:none;-webkit-border-radius:0;border: 0;color:#fff;letter-spacing:1px;background:#CC3333;border-bottom:1px solid #CC0033;outline:medium;" onmouseover="this.style.background=\'#CC0033\'" onmouseout="this.style.background=\'#CC3333\'">')
            $("#google").click(function(){
            window.open('https://www.google.com/search?&q=' + encodeURIComponent($('#kw').val()));
            }) // 结束

      		//添加行研搜索按钮
            $('.s_btn_wr,#s_btn_wr').after('<input type="button" id="wendang" value="行研搜索" class="btn self-btn bg" style="float:right; font-size:14px; text-align:center; text-decoration:none; width:100px; height:33px; line-height:33px; margin-left:5px;-webkit-appearance:none;-webkit-border-radius:0;border: 0;color:#fff;letter-spacing:1px;background:#6633FF;border-bottom:1px solid #3333FF;outline:medium;" onmouseover="this.style.background=\'#3333FF\'" onmouseout="this.style.background=\'#6633FF\'">')
            $("#wendang").click(function(){
            window.open('https://www.opp2.com/?sk=' + encodeURIComponent($('#kw').val()));
            window.open('http://www.icdo.com.cn/?s=' + encodeURIComponent($('#kw').val()));
            window.open('https://s.iresearch.cn/search/' + encodeURIComponent($('#kw').val()) + "/");
            window.open('https://www.iimedia.cn/search.html?kw=' + encodeURIComponent($('#kw').val()));
            window.open('http://www.aliresearch.com/cn/search?queryName=' + encodeURIComponent($('#kw').val()));
            window.open('https://baogao.store/?s=' + encodeURIComponent($('#kw').val()) + "&post_type=post");
            window.open('http://search.199it.com/?q=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.analysys.cn/es/search?keyword=' + encodeURIComponent($('#kw').val()));
            window.open('https://wenku.baidu.com/search?word=' + encodeURIComponent($('#kw').val()));
            window.open('https://36kr.com/search/articles/' + encodeURIComponent($('#kw').val()));
            window.open('https://www.zhihu.com/search?type=content&q=' + encodeURIComponent($('#kw').val()));
            //window.open('https://www.chyxx.com/search?q=' + encodeURIComponent($('#kw').val()));
            }) // 结束


            //添加网盘搜索按钮
            $('.s_btn_wr,#s_btn_wr').after('<input type="button" id="magnet_torrent_baidupan" value="网盘搜索" class="btn self-btn bg" style="outline:none;float:right; font-size:14px; text-align:center; text-decoration:none; width:100px; height:33px; line-height:33px; margin-left:5px;-webkit-appearance:none;-webkit-border-radius:0;border: 0;color:#fff;letter-spacing:1px;background:#3385ff;border-bottom:1px solid #2d78f4;;outline:medium;" onmouseover="this.style.background=\'#317ef3\'" onmouseout="this.style.background=\'#3385ff\'">')
            $("#magnet_torrent_baidupan").click(function(){
            //window.open('https://www.oxtorrent.com/recherche/' + encodeURIComponent($('#kw').val()));
            //window.open('https://www.torrentkitty.vip/search/' + encodeURIComponent($('#kw').val()));
            //window.open('http://clg.btdp.online/search/' + encodeURIComponent($('#kw').val()));
            //window.open('http://clg.uihp.online/search/' + encodeURIComponent($('#kw').val()));
            //window.open('https://www.torrentkitty.app/search/' + encodeURIComponent($('#kw').val()));
            //window.open('https://javdb.com/search?q=' + encodeURIComponent($('#kw').val()) + "&f=all");
            //window.open('https://www.ywxinxi.com/search/' + encodeURIComponent($('#kw').val()));
            //window.open('https://www.maoliyun.com/search?k=' + encodeURIComponent($('#kw').val()));
            window.open('https://kickass.sx/usearch/' + encodeURIComponent($('#kw').val()) + "/");
            window.open('https://pirate-bays.net/search?q=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.nmme.cc/s/1/?wd=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.wuyasou.com/search?keyword=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.baidu.com/s?wd=  ' + encodeURIComponent($('#kw').val()) + " 网盘下载");
            window.open('https://www.baidu.com/s?wd=  ' + encodeURIComponent($('#kw').val()) + " 百度网盘");
           }) // 结束


            //添加AI问答按钮
            $('.s_btn_wr,#s_btn_wr').after('<input type="button" id="AI" value="AI问答" class="btn self-btn bg" style="float:right; font-size:14px; text-align:center; text-decoration:none; width:100px; height:33px; line-height:33px; margin-left:5px;-webkit-appearance:none;-webkit-border-radius:0;border: 0;color:#fff;letter-spacing:1px; background:#66CC00; border-bottom:1px solid #00CC00; outline:medium;" onmouseover="this.style.background=\'#33CC00\'" onmouseout="this.style.background=\'#66CC00\'">')
            $("#AI").click(function(){
            //window.open('https://so.csdn.net/so/search?q=' + encodeURIComponent($('#kw').val()));
            //window.open('https://search.sohu.com/?keyword=' + encodeURIComponent($('#kw').val()));
            window.open('https://search.tiangong.cn/');
            window.open('https://xinghuo.xfyun.cn/desk');
            window.open('https://yiyan.baidu.com/');
            window.open('https://www.ithome.com/search/' + encodeURIComponent($('#kw').val()) + ".html");
            window.open('https://search.bilibili.com/all?keyword=' + encodeURIComponent($('#kw').val()) + "&order=pubdate");
            window.open('https://weixin.sogou.com/weixin?type=2&query=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.zhihu.com/search?type=content&q=' + encodeURIComponent($('#kw').val()));
            window.open('https://so.toutiao.com/search?dvpf=pc&source=input&keyword=' + encodeURIComponent($('#kw').val()));
            }) // 结束


      		  //添加软件搜索按钮
            $('.s_btn_wr,#s_btn_wr').after('<input type="button" id="soft_pojie" value="软件搜索" class="btn self-btn bg" style="float:right; font-size:14px; text-align:center; text-decoration:none; width:100px; height:33px; line-height:33px; margin-left:5px;-webkit-appearance:none;-webkit-border-radius:0;border: 0;color:#fff;letter-spacing:1px;background:#FF9966; border-bottom:1px solid #FF9900; outline:medium;" onmouseover="this.style.background=\'#FF9933\'" onmouseout="this.style.background=\'#FF9966\'">')
            $("#soft_pojie").click(function(){
            //window.open('https://apphot.cc/?s=' + encodeURIComponent($('#kw').val()));
            //window.open('http://www.sd124.com/plus/search.php?q=' + encodeURIComponent($('#kw').val()) + "&pd=soft");
            window.open('https://github.com/search?q=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.baidu.com/s?wd=  ' + encodeURIComponent($('#kw').val()) + " site:www.52pojie.cn");
            window.open('https://www.baidu.com/s?wd=  ' + encodeURIComponent($('#kw').val()) + " site:geekotg.com");
            window.open('https://www.baidu.com/s?wd=  ' + encodeURIComponent($('#kw').val()) + " site:weidown.com");
            window.open('https://www.ypojie.com/?s=' + encodeURIComponent($('#kw').val()));
            window.open('http://www.th-sjy.com/?s=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.sixyin.com/?s=' + encodeURIComponent($('#kw').val()) + "&type=post");
            window.open('http://www.qiuquan.cc/?s=' + encodeURIComponent($('#kw').val()));
            window.open('http://www.dayanzai.me/?s=' + encodeURIComponent($('#kw').val()));
            window.open('https://search.gndown.com/?s=' + encodeURIComponent($('#kw').val()));
            window.open('https://www.ghpym.com/?s=' + encodeURIComponent($('#kw').val()));
            }) // 结束




            function del_delayed_ads(){
                $('.c-container').has('.f13>span:contains("广告")').remove();
            }
            setTimeout(function () { del_delayed_ads(); }, 2100); // 去除顽固性的延迟加载广告，一般延迟2秒左右。例如搜索“淘宝”，当页面加载完毕之后在搜索结果最前或最后会再插入一个广告。
            }

            } // 百度上添加其他搜索结束

    else if(hostname.match(RegExp(/google.com/))){
        //Google上添加百度搜索
        document.addEventListener ("DOMContentLoaded", show_button_google);
        function show_button_google () {
            var url_baidu = "https://www.baidu.com/s?wd=" + encodeURIComponent($(".gLFyf.gsfi:first").val()) + "&from=TsingScript";
            $(".RNNXgb:first").append('<div style="display:inline-block; height:100%; width:0px; box-sizing: border-box; border-radius:30px;"><button id="google++" type="button" style="height:100%; width:100%; border:none; outline:none; border-radius:30px; font-size:15px; cursor:pointer; display:block; float:left; font-size:14px; text-align:center; text-decoration:none; width:100px;  margin-left:30px; color:#fff; letter-spacing:1px; background:#3385ff; " onclick="window.open(\''+ url_baidu + '\')" title="使用百度搜索引擎检索该关键词">百度一下</button></div>');
            $(".gLFyf.gsfi:first").change(function(){
                var url_baidu_new = "https://www.baidu.com/s?wd=" + encodeURIComponent($(".gLFyf.gsfi:first").val()) + "&from=TsingScript";
                $("#google++").attr('onclick','window.open("'+ url_baidu_new + '")');
             });
           }
          } // 结束

    GM_registerMenuCommand ("欢迎提出建议和意见", menu_func, ""); // 注册脚本的菜单选项
    function menu_func () {
        window.open("https://greasyfork.org/zh-CN/scripts/396960/feedback");
    }

    console.log("%cThanks for using baidu++ script, enjoy your time here."," font-size:14px; background:#444; border-radius:3px; padding:2px 5px; color:#ffff66; margin:10px 0;","--by ddrwin");

})();