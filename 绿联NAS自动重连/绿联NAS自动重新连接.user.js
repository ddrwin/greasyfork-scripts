// ==UserScript==
// @name         绿联NAS自动重新连接
// @namespace    http://tampermonkey.net/
// @icon         https://www.ugnas.com/file/upload/2024-10/18/202410181636007801.png
// @version      1.1
// @description  当cookie过期时自动处理重新连接流程
// @author       ddrwin
// @match        https://www.ug.link/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const UGREEN_ID = 'ddrwin';  // 需要填写的ID

    // 统一处理所有 ug.link 下的页面
    const handlePage = () => {
        const url = window.location.href;

        // 错误页面：点击“重新连接”按钮
        if (url.includes('/errorPage')) {
            console.log('[自动重连] 检测到错误页面，尝试点击“重新连接”按钮...');
            const checkBtn = setInterval(() => {
                const reconnectBtn = Array.from(document.querySelectorAll('button, a'))
                    .find(el => el.textContent.includes('重新连接'));
                if (reconnectBtn) {
                    clearInterval(checkBtn);
                    console.log('[自动重连] 找到按钮，点击');
                    reconnectBtn.click();
                }
            }, 500);
            setTimeout(() => clearInterval(checkBtn), 10000);
            return;
        }

        // ID输入页面：自动填写并连接（路径可能是根或其它）
        // 通常页面会有一个明显的输入框和“连接”按钮
        const input = document.querySelector('input[type="text"], input[type="search"], input:not([type="hidden"])');
        const connectBtn = input ? Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('连接')) : null;

        if (input && connectBtn) {
            console.log('[自动重连] 检测到ID输入页面，自动填写并连接');
            input.value = UGREEN_ID;
            // 触发input事件，让页面感知变化
            input.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
                connectBtn.click();
                console.log('[自动重连] 已点击连接按钮');
            }, 100); // 稍延迟确保值生效
        } else {
            // 页面可能尚未加载完成，等待元素出现
            console.log('[自动重连] 页面未检测到输入框/连接按钮，等待...');
            const observer = new MutationObserver(() => {
                const newInput = document.querySelector('input[type="text"], input[type="search"], input:not([type="hidden"])');
                const newBtn = newInput ? Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('连接')) : null;
                if (newInput && newBtn) {
                    observer.disconnect();
                    console.log('[自动重连] 检测到ID输入页面元素，自动填写并连接');
                    newInput.value = UGREEN_ID;
                    newInput.dispatchEvent(new Event('input', { bubbles: true }));
                    setTimeout(() => newBtn.click(), 100);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 10000); // 10秒后停止观察
        }
    };

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handlePage);
    } else {
        handlePage();
    }

    // 如果页面是单页应用，监听URL变化（可选）
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(handlePage, 500); // 延迟等待新页面内容加载
        }
    }).observe(document, { subtree: true, childList: true });
})();