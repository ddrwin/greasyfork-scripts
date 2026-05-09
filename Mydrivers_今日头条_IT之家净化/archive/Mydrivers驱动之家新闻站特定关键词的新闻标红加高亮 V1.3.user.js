// ==UserScript==
// @name         Mydrivers驱动之家新闻站特定关键词的新闻标红加高亮、并把包含不感兴趣关键词的新闻屏蔽掉
// @description  对包含感兴趣的关键词的新闻高亮显示，并屏蔽掉不感兴趣的关键词的新闻
// @icon         http://www.drivergenius.com//favicon.ico
// @namespace    https://greasyfork.org/zh-CN/scripts/397075
// @version      1.3
// @author       ddrwin
// @include      http*://*.mydrivers.com/*
// @note         2020.2.28 V1.0 对包含感兴趣的关键词的新闻高亮显示；
// @note         2020.2.29 V1.1 增加屏蔽包含不感兴趣的关键词的新闻；
// @note         2020.3.1  V1.2 增加文章页高亮关键词，优化文章页阅读宽度；
// @note         2021.2.23  V1.3 优化首页高亮关键词，调整文章页阅读宽度；
// ==/UserScript==

(function() {
   
    //文章页的界面优化 
    var isContentPage = /.*htm$/.test(location.href) &&  /^http(s)?:\/\/news\.mydrivers\.com\/.*$/.test(location.href)
    if (isContentPage) {
    $(".news_right,.baidu,.main_right,#left_tab,#right_tab > ul > li").remove();    
    $("#thread_subject").attr("style", "margin-right:100px;");   
    $(".news_n,.news_box,.news_left").attr("style", "width:800px;");      
    $("#commentsiframe").attr("style", "width:600px;");    
    $(".news_info").attr("style", "width:650px;");   
    $(".news_n,#commentsiframe").attr("style", "margin-left:80px;");         
    $(".main_left").attr("style", "margin-left:180px;");         
}  
  
    //首页屏蔽关键词，把相关新闻屏蔽掉
    var BanText = ["小米", "红米", "雷军", "Redmi", "畅享", "OPPO", "vivo", "卢伟冰", "紫米", "淘宝", "腾讯", "魅族", "tcl", "苏宁", "华米", "iQOO", "ROG", "华米"]; //屏蔽的字符
    var check_Ban = window.location.href.match(/mydrivers\.com\/$/);//检查驱动之家首页
    //Ban掉相关字符
    if (check_Ban) {
        BanText.map(function(v) {
            $('li:contains(' + v + ')').hide();
        })
    }

    //首页添加关键词，高亮颜色可以自定义
    var ColorText = ["比特币","奔驰","新一代","电动车","特斯拉","女生","女性","Win11","Windows11","登月","月球","火星","飞船","火箭","探测器", "宇宙","暗黑", "科学"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
            $('a:contains(' + i + ')').css({"background-color":"#FFFFCC","color":"#00CC00"});
        })
    }
  
    //首页添加关键词，高亮颜色可以自定义
    var ColorText = ["5G","华为","HMS","鸿蒙","EMUI","麒麟","Mate","HarmonyOS","荣耀"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
            $('a:contains(' + i + ')').css({"background-color":"#CCEEFF","color":"#5555FF","font-weight":"bold"});
        })
    }
  
    //首页添加关键词，高亮颜色可以自定义
    var ColorText = ["苹果", "iPhone", "iPad", "ios"]; //高亮的字符
    var checkHigh = window.location.href.match(/mydrivers\.com\/$/);//检查首页
    if (checkHigh) {
        ColorText.map(function(i) {
            $('a:contains(' + i + ')').css("cssText","background-color:#FFFFCC;color:#00CC00;font-weight:bold !important");
        })
    }
   
    //文章页高亮关键词，颜色可以自定义  
	  var news_info = document.getElementsByClassName("news_info")[0].innerHTML;
	  var s = "比特币|奔驰|新一代|电动车|特斯拉|女生|女性|Win11|Windows11|登月|月球|火星|飞船|火箭|探测器|宇宙|暗黑|科学|ios";
    var reg = new RegExp("(" + s + ")", "g");  
    var str = news_info;  
    var newstr = str.replace(reg, "<SPAN style='background-color:#FFFFCC;color:#00CC00'>$1</SPAN>");
	  document.getElementsByClassName("news_info")[0].innerHTML = newstr;
  
    //文章页高亮关键词，颜色可以自定义  
	  var news_info = document.getElementsByClassName("news_info")[0].innerHTML;
	  var s = "5G|华为|HMS|鸿蒙|EMUI|麒麟|Mate|HarmonyOS|荣耀";
    var reg = new RegExp("(" + s + ")", "g");  
    var str = news_info;  
    var newstr = str.replace(reg, "<SPAN style='background-color:#CCEEFF;color:#5555FF;font-weight:bold'>$1</SPAN>");
	  document.getElementsByClassName("news_info")[0].innerHTML = newstr;
  
    //文章页高亮关键词，颜色可以自定义  
	  var news_info = document.getElementsByClassName("news_info")[0].innerHTML;
	  var s = "苹果|iPhone|iPad|ios";
    var reg = new RegExp("(" + s + ")", "g");  
    var str = news_info;  
    var newstr = str.replace(reg, "<SPAN style='background-color:#FFFFCC;color:#00CC00'>$1</SPAN>");
	  document.getElementsByClassName("news_info")[0].innerHTML = newstr;

})()