// ==UserScript==
// @name         今日头条、Mydrivers驱动之家新闻站净化阅读，宽度适配，特定关键词的新闻标红加高亮、并把包含不感兴趣关键词的新闻屏蔽掉
// @description  对包含感兴趣的关键词的新闻高亮显示，并屏蔽掉不感兴趣的关键词的新闻
// @icon         http://www.drivergenius.com//favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/397075
// @version      1.8
// @author       ddrwin
// @match        *://www.toutiao.com/*
// @include      http*://*.mydrivers.com/*
// @exclude      *://www.toutiao.com/video/*
// @note         2020.2.28 V1.0 对包含感兴趣的关键词的新闻高亮显示；
// @note         2020.2.29 V1.1 增加屏蔽包含不感兴趣的关键词的新闻；
// @note         2020.3.1  V1.2 增加文章页高亮关键词，优化文章页阅读宽度；
// @note         2021.2.23  V1.3 优化首页高亮关键词，调整文章页阅读宽度；
// @note         2022.2.2  V1.4 优化首页高亮关键词，调整文章页阅读宽度；
// @note         2022.2.4  V1.4.1 首页列表页居左；
// @note         2022.3.3  V1.5 优化首页高亮关键词，屏蔽文章页向前、向后按钮；
// @note         2023.5.20  V1.7 优化首页及文章页高亮关键词；
// @note         2025.4.7  V1.8 添加今日头条首页及文章页宽度适配，去掉侧边栏；
// ==/UserScript==

(function() {

    //今日头条开始
    // 删除首页右侧边栏
    var rightSidebar = document.querySelector('.right-container');
    if (rightSidebar) {
        rightSidebar.remove();
    }

      // 删除首页底部
    var rightSidebar = document.querySelector('.footer-wrapper');
    if (rightSidebar) {
        rightSidebar.remove();
    }

    // 使首页左侧内容宽屏展示
    var leftSidebar = document.querySelector('.left-container');
    if (leftSidebar) {
        leftSidebar.style.width = '100%';
    }


    // 首页可能需要调整的其他样式
    var mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.width = '55%';
        mainContent.style.marginLeft = '125px';
    }

    // 删除文章页右侧边栏
    var rightSidebar = document.querySelector('.right-sidebar');
    if (rightSidebar) {
        rightSidebar.remove();
    }

    // 删除文章页底部推荐
    var rightSidebar = document.querySelector('.detail-end-feed');
    if (rightSidebar) {
        rightSidebar.remove();
    }

    // 使文章页左侧内容宽屏展示
    var leftSidebar = document.querySelector('.left-sidebar');
    if (leftSidebar) {
        leftSidebar.style.width = '100%';
    }

    // 文章页可能需要调整的其他样式
    var mainContent = document.querySelector('.main');
    if (mainContent) {
        mainContent.style.width = '65%';
        mainContent.style.marginLeft = '0';
    }



  //驱动之家开始
  //首页的界面优化
    var isContentPage = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (isContentPage) {
      $("#newlist_1.zxgx").attr("style", "margin-left:-120px !important;");   //文章list区居左
}

    //文章页的界面优化
    var isContentPage = /.*htm$/.test(location.href) &&  /^http(s)?:\/\/news\.mydrivers\.com\/.*$/.test(location.href)
    if (isContentPage) {
      $(".news_right,.baidu,.main_right,#left_tab,#right_tab,.nav_box,.last,.next").remove();    //删除无用部分
      $(".main_box").attr("style", "width:830px !important;");      //主体宽度
      $("#thread_subject").attr("style", "width:800px; margin-left:-70px;");   //文章页的标题
      $(".news_info").attr("style", "width:600px;margin-left:20px !important;");     //文章宽度
      $(".newsinfo_vedio").attr("style", "margin-left:0px !important;");   //视频播放器
      $(".main_left").attr("style", "margin-left:1000px !important;");   //视频播放器
      //$("#MyComments.pinglun").attr("style", "width:660px !important;");        //评论宽度

}

    //首页屏蔽关键词，把相关新闻屏蔽掉
    var BanText = ["小米", "红米", "雷军", "Redmi", "好物", "OPPO", "vivo", "卢伟冰", "紫米", "MIUI", "一加","realme", "长城","官方", "魅族", "tcl", "苏宁", "华米", "iQOO", "史低","大促","到手","发车", "仅", "元/件"]; //屏蔽的字符
    var check_Ban = window.location.href.match(/mydrivers\.com\/$/);//检查驱动之家首页
    //Ban掉相关字符
    if (check_Ban) {
        BanText.map(function(v) {
            $('li:contains(' + v + ')').hide();
        })
    }

    //首页添加关键词，高亮颜色可以自定义 --黄底绿字 --科普
    var ColorText = ["北京","阿里","百度","腾讯","奔驰","新一代","中国","美国","女性","太空","NASA","月球","火星","飞船","火箭","探测器", "宇宙","暗黑", "科学"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
    //     $('a:contains(' + i + ')').css({"background-color":"#FFFFCC","color":"#000000"});
            $('a:contains(' + i + ')').css("cssText","background-color:#FFFFCC;color:#000000 !important");
        })
    }

    //首页添加关键词，高亮颜色可以自定义 --加粗 --硬件
    var ColorText = ["ITX","RTX","DLSS","DLSS3","CPU","酷睿","三星","台积电","Intel"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
    //     $('a:contains(' + i + ')').css({"background-color":"#FFFFCC","color":"#000000"});
            $('a:contains(' + i + ')').css("cssText","font-weight:bold !important");
        })
    }

    //首页添加关键词，高亮颜色可以自定义 --黄底蓝字加粗 --人工智能
    var ColorText = [ "NVIDIA", "大模型","OpenAI","AI","ChatGPT","GPT","人工智能","芯片","机器人","GPU","科大讯飞","通义千问","文心一言"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
    //     $('a:contains(' + i + ')').css({"background-color":"#FFFFCC","color":"#5555FF"});
            $('a:contains(' + i + ')').css("cssText","background-color:#FFFFCC;color:#5555FF;font-weight:bold !important");
        })
    }

    //首页添加关键词，高亮颜色可以自定义 --蓝底蓝字加粗 --华为
    var ColorText = ["5G","华为","HMS","鸿蒙","HUAWEI","麒麟","光刻机","Mate","HarmonyOS","荣耀","海思"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
            $('a:contains(' + i + ')').css("cssText","background-color:#CCEEFF;color:#5555FF");
            $('a:contains(' + i + ')').css("cssText","font-weight:bold !important");
        })
    }

    //首页添加关键词，高亮颜色可以自定义 --黄底绿字加粗 --苹果|微软|特斯拉
    var ColorText = ["苹果", "iPhone", "iPad", "ios", "iOS","微软","电动车","特斯拉","马斯克"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
            $('a:contains(' + i + ')').css("cssText","background-color:#FFFFCC;color:#00CC00;font-weight:bold !important");
        })
    }

    //文章页高亮关键词，颜色可以自定义  --黄底黑字 --科普
	  var news_info = document.getElementsByClassName("news_info")[0].innerHTML;
	  var s = "北京|阿里|百度|腾讯|奔驰|新一代|中国|美国|太空|女性|NASA|月球|火星|飞船|火箭|探测器|宇宙|暗黑|科学";
    var reg = new RegExp("(" + s + ")", "g");
    var str = news_info;
    var newstr = str.replace(reg, "<SPAN style='background-color:#FFFFCC;color:#000000'>$1</SPAN>");
	  document.getElementsByClassName("news_info")[0].innerHTML = newstr;

    //文章页高亮关键词，颜色可以自定义  --黄底蓝字 --人工智能
	  var news_info = document.getElementsByClassName("news_info")[0].innerHTML;
	  var s = "NVIDIA|大模型|OpenAI|AI|ChatGPT|GPT|人工智能|芯片|机器人|GPU|科大讯飞|通义千问|文心一言";
    var reg = new RegExp("(" + s + ")", "g");
    var str = news_info;
    var newstr = str.replace(reg, "<SPAN style='background-color:#FFFFCC;color:#5555FF'>$1</SPAN>");
	  document.getElementsByClassName("news_info")[0].innerHTML = newstr;

    //文章页高亮关键词，颜色可以自定义  --蓝底蓝字加粗 --华为
	  var news_info = document.getElementsByClassName("news_info")[0].innerHTML;
	  var s = "5G|华为|HMS|鸿蒙|HUAWEI|麒麟|光刻机|Mate|HarmonyOS|荣耀|海思";
    var reg = new RegExp("(" + s + ")", "g");
    var str = news_info;
    var newstr = str.replace(reg, "<SPAN style='background-color:#CCEEFF;color:#5555FF;font-weight:bold !important'>$1</SPAN>");
	  document.getElementsByClassName("news_info")[0].innerHTML = newstr;

    //文章页高亮关键词，颜色可以自定义  --黄底绿字加粗 --苹果|微软|特斯拉
	  var news_info = document.getElementsByClassName("news_info")[0].innerHTML;
	  var s = "苹果|iPhone|iPad|ios|iOS|微软|特斯拉|电动车|马斯克";
    var reg = new RegExp("(" + s + ")", "g");
    var str = news_info;
    var newstr = str.replace(reg, "<SPAN style='background-color:#FFFFCC;color:#00CC00;font-weight:bold !important'>$1</SPAN>");
	  document.getElementsByClassName("news_info")[0].innerHTML = newstr;


//驱动之家净化阅读 - 文章样式调整
  if ('loading' == document.readyState) {
    console.log("此脚本在文档启动时运行。");
    $("script").remove()
} else {
    console.log("此脚本与document.readyState一起运行：" + document.readyState);
    $("script").remove()
}
document.addEventListener('readystatechange', event => {
    $("script").remove()
    if (event.target.readyState === 'loading') {
        $("script").remove()
        console.log("此脚本在文档启动时运行1。");
    }
    if (event.target.readyState === 'interactive') {
        $("script").remove()
        console.log("此脚本在文档启动时运行2。");
    } else if (event.target.readyState === 'complete') {
        $("script").remove()
        console.log("此脚本在文档启动时运行3。");
    }
});

    $("script").remove()
    console.log("此脚本开始运行。");
    'use strict';

    var isContentPage = /.*htm$/.test(location.href) &&  /^http(s)?:\/\/news\.mydrivers\.com\/.*$/.test(location.href)
    var isIndexPage = /^http(s)?:\/\/www\.mydrivers\.com\/$/.test(location.href)
    var isZhiBo = $(".zhibo_box").length > 0


    if(isZhiBo) {

    } else if (isContentPage) {

        $(".main_left").attr("style", "width:1250px !important;margin:0 auto;float:none;height: auto;");
        $(".news_info1").attr("style", "background: #fff;");
        $(".main_1").removeAttr("style");
        $(".main_1").attr("style", "height:1099px;");


        $("script").remove()
        //$(".news_info>div").remove();
        $("#i_lastnext").remove();
        $(".pathway").remove();
        $(".baidu").remove();

        $(".news_n").nextAll().not("#commentsiframe").remove();

        $(".top").remove();
        $(".weixin").remove();
        $(".news_xg").remove();
        $(".main_right").remove();
        $("#right_tab").remove();
        //$("iframe").remove();
        $("body link").remove();
        $("body style").remove();


        $("#dummybodyid .news_box").attr("style", "width:1333px;");
        $("#dummybodyid .news_box .news_left").attr("style", "width:1333px;");

        $(".news_n").attr("style", "width:1230px;");
        $(".pinlun_input").attr("style", "width:1230px;");
        $(".plun_left_newplun").attr("style", "width:1230px;");
        $("#commentsiframe").attr("style", "width:92%;");
        $(".share table").attr("style", "width:85%;");
        $("#a_showhotnews_list_dia").remove();

        $("#dangbei_down").parent().remove();
        $(".news_bt1").remove();
        $(".zcdf").remove();
        $(".share").remove();
        //$("#commentsiframe").remove();
        $("#footer").remove();
        $("div.news_box  div.news_right").remove();

        var newsLeft = $(".news_left");
        var commentsiframe = $("#commentsiframe");
        newsLeft.css("width", "1333px")

        // iframe加载完毕
        commentsiframe.load(function() {
            console.log("commentsiframe iframe 加载完毕！");
            commentsiframe.contents().find(".plun_box").css("margin","0 auto").css("padding-left","45px");
            var iframeHeight = commentsiframe.contents().find("body").height();
            commentsiframe.css("height", iframeHeight);

            setTimeout('$(".news_left").css("height", "auto")', 1000);
            $(".baidu").remove();

        });


    } else {
        if (isIndexPage) {

            $(".main_left").attr("style", "width:1050px !important;margin:0 auto;float:none;height: auto;background:#fff0;");
            $(".news_info1").attr("style", "background: #fff;");
            $(".main_1").removeAttr("style");
            $(".main_1").attr("style", "height:1099px;");

            var shidianDom = $(".shidian")
            shidianDom.remove();

            $(".main_box").remove();
            var gcDom = $("#GC_box")
            gcDom.nextAll().remove();
            gcDom.remove();

            $("iframe").remove();
            $("body link").remove();
            $("body style").remove();

            $(".main_2").remove();

            $(".nav_box").remove();
            $(".main_right").remove();
            $(".main_right_title").remove();
            $(".main").attr("style", "width:1333px;");
            $("#news_content_1,#news_content_2,#news_content_3,#news_content_4,#news_content_5").after(
                '<HR style="FILTER: alpha(opacity=100,finishopacity=0,style=3)" width="80%" color=#987cb9 SIZE=1>'
            ).show()
            $("#news_content_page").remove();
        } else {
            $(".shidian").remove();
            $(".product_box").remove();
            $(".righttitle ").remove();
            $(".top_1_center ").remove();
            $(".pathway ").remove();
            $(".main_right div:not(:last-child)").remove();
            $(".link ").remove();
            $("#footer").remove();
        }
    }


    //$("iframe").not("#commentsiframe").each(function() {$(this).remove();});
    $(".footer_about").remove();


    $(".share table tbody tr td:lt(2)").remove();

    $(".yzm").css("margin-right", "30px");

})()