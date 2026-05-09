// ==UserScript==
// @name         今日头条宽屏展示
// @icon         https://www.toutiao.com/favicon.ico
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  尝试在油猴上删除今日头条的右侧边栏并宽屏展示左侧内容
// @author       ddrwin
// @match        *://www.toutiao.com/*
// @exclude      *://www.toutiao.com/video/*
// @grant        none
// @license      Apache 2.0
// @downloadURL https://update.greasyfork.org/scripts/507914/%E4%BB%8A%E6%97%A5%E5%A4%B4%E6%9D%A1%E5%AE%BD%E5%B1%8F%E5%B1%95%E7%A4%BA.user.js
// @updateURL https://update.greasyfork.org/scripts/507914/%E4%BB%8A%E6%97%A5%E5%A4%B4%E6%9D%A1%E5%AE%BD%E5%B1%8F%E5%B1%95%E7%A4%BA.meta.js
// ==/UserScript==

(function() {
    'use strict';

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
})();