// ==UserScript==
// @name         Mydrivers驱动之家新闻站特定关键词的新闻标红加高亮、并把包含不感兴趣关键词的新闻屏蔽掉
// @description  对包含感兴趣的关键词的新闻高亮显示，并屏蔽掉不感兴趣的关键词的新闻
// @icon         http://www.drivergenius.com//favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/397075
// @version      1.6
// @author       ddrwin
// @include      http*://*.mydrivers.com/*
// @note         2020.2.28 V1.0 对包含感兴趣的关键词的新闻高亮显示；
// @note         2020.2.29 V1.1 增加屏蔽包含不感兴趣的关键词的新闻；
// @note         2020.3.1  V1.2 增加文章页高亮关键词，优化文章页阅读宽度；
// @note         2021.2.23  V1.3 优化首页高亮关键词，调整文章页阅读宽度；
// @note         2022.2.2  V1.4 优化首页高亮关键词，调整文章页阅读宽度；
// @note         2022.2.4  V1.4.1 首页列表页居左；
// @note         2022.3.3  V1.5 优化首页高亮关键词，屏蔽文章页向前、向后按钮；
// @note         2023.5.20  V1.6 优化首页及文章页高亮关键词；
// ==/UserScript==

(function() {

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
    var BanText = ["小米", "红米", "雷军", "Redmi", "畅享", "OPPO", "vivo", "卢伟冰", "紫米", "MIUI", "一加","realme", "长城","官方", "魅族", "狂促", "苏宁", "华米", "iQOO", "史低","大促","到手","发车", "仅", "元起", "元/件"]; //屏蔽的字符
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

    //首页添加关键词，高亮颜色可以自定义 --蓝底蓝字 --华为
    var ColorText = ["5G","华为","HMS","鸿蒙","HUAWEI","麒麟","光刻机","Mate","HarmonyOS","荣耀","海思"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
            $('a:contains(' + i + ')').css("cssText","background-color:#CCEEFF;color:#5555FF");
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

})()