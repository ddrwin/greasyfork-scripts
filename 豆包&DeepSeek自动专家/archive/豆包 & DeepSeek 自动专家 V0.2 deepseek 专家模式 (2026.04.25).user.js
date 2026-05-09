// ==UserScript==
// @name         DeepSeek 默认专家模式 & 关闭智能搜索
// @namespace    https://github.com/yourname/deepseek-defaults
// @version      1.0
// @description  每次打开 DeepSeek 时自动选择专家模式，并关闭智能搜索按钮
// @author       You
// @match        https://chat.deepseek.com/*
// @icon         https://chat.deepseek.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 切换到专家模式
    function clickExpertMode() {
        const expertRadio = document.querySelector('div[data-model-type="expert"]');
        if (expertRadio && expertRadio.getAttribute('aria-checked') === 'false') {
            expertRadio.click();
            console.log('✅ 已切换到专家模式');
            return true;
        } else if (expertRadio && expertRadio.getAttribute('aria-checked') === 'true') {
            return true; // 已经是专家模式
        }
        return false;
    }

    // 关闭智能搜索（仅当它处于选中状态时点击取消）
    function disableSmartSearch() {
        const toggleButtons = document.querySelectorAll('.ds-toggle-button');
        for (const btn of toggleButtons) {
            if (btn.textContent.includes('智能搜索')) {
                if (btn.classList.contains('ds-toggle-button--selected')) {
                    btn.click();
                    console.log('🔍 已关闭智能搜索');
                }
                return true;
            }
        }
        return false;
    }

    // 应用所有设置
    function applySettings() {
        const expertOk = clickExpertMode();
        const searchOk = disableSmartSearch();
        return expertOk && searchOk;
    }

    // 重试逻辑（最多尝试 20 次，每次间隔 500ms）
    function tryApply(attempts = 0) {
        if (applySettings()) return;
        if (attempts < 20) {
            setTimeout(() => tryApply(attempts + 1), 500);
        }
    }

    // 页面加载完成后启动
    window.addEventListener('load', () => {
        tryApply();
    });

    // 如果页面已经加载完成则立即执行
    if (document.readyState === 'complete') {
        tryApply();
    }

    // 监听页面中 DOM 的动态变化（SPA 内部切换时也会重新应用设置）
    const observer = new MutationObserver(() => {
        // 为了防止频繁触发，可以加一些防抖，但直接调用也不会有副作用
        applySettings();
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();