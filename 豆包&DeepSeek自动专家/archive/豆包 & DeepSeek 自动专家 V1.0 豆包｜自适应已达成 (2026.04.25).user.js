// ==UserScript==
// @name         豆包 & DeepSeek 综合优化
// @namespace    https://github.com/yourname/doubao-deepseek-combo
// @version      1.0
// @description  豆包：默认思考模式+保留技能栏+遥测拦截+全宽+蓝色气泡；DeepSeek：自动专家模式+关闭智能搜索
// @author       你
// @match        https://chat.deepseek.com/*
// @match        *://*.doubao.com/*
// @match        *://*.bytedance.com/*
// @icon         https://www.doubao.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const host = location.hostname;

    // ==================== 豆包：全宽 + 蓝色气泡样式 ====================
    if (host.includes('doubao.com')) {
        GM_addStyle(`
            :root {
                --content-max-width: 100% !important;
            }
            div[class*="max-w-"] {
                max-width: 100% !important;
            }
            .container-PvPoAn,
            .item-kDun2N,
            [class*="max-dbx-xs:"] {
                max-width: 100% !important;
            }

            .bg-g-send-msg-bubble-bg {
                background: #dbeafe !important;
                color: #1e293b !important;
            }
            .bg-g-receive-msg-bubble-bg {
                background: #ffffff !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            [class*="send-msg-bubble"] {
                background: #dbeafe !important;
                color: #1e293b !important;
            }
            [class*="receive-msg-bubble"] {
                background: #ffffff !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .bg-g-send-msg-bubble-bg,
            .bg-g-receive-msg-bubble-bg {
                border-radius: 12px;
            }
            .bg-g-send-msg-bubble-bg code,
            .bg-g-send-msg-bubble-bg pre {
                background-color: rgba(0,0,0,0.06);
            }

            /* 表格容器全宽 */
            .mdbox-table-root,
            .table-scroll-container-OfUx5s,
            .table-wrapper-wG0rS7 {
                max-width: 100% !important;
                width: 100% !important;
                overflow-x: auto !important;
            }
            /* 表格本身宽度自适应 */
            .mdbox-table-root table,
            .table-scroll-container-OfUx5s table {
                width: 100% !important;
                table-layout: auto;
            }
        `);
    }



    // ==================== DeepSeek：专家模式 + 关闭智能搜索 ====================
    if (host === 'chat.deepseek.com') {
        function clickExpertMode() {
            const expertRadio = document.querySelector('div[data-model-type="expert"]');
            if (expertRadio && expertRadio.getAttribute('aria-checked') === 'false') {
                expertRadio.click();
                console.log('✅ 已切换到专家模式');
                return true;
            } else if (expertRadio && expertRadio.getAttribute('aria-checked') === 'true') {
                return true;
            }
            return false;
        }

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

        function applySettings() {
            const expertOk = clickExpertMode();
            const searchOk = disableSmartSearch();
            return expertOk && searchOk;
        }

        function tryApply(attempts = 0) {
            if (applySettings()) return;
            if (attempts < 20) {
                setTimeout(() => tryApply(attempts + 1), 500);
            }
        }

        window.addEventListener('load', () => {
            tryApply();
        });

        if (document.readyState === 'complete') {
            tryApply();
        }

        // 确保 body 存在后再启动 DOM 观察
        function startObserver() {
            new MutationObserver(() => {
                applySettings();
            }).observe(document.body, { childList: true, subtree: true });
        }
        if (document.body) {
            startObserver();
        } else {
            document.addEventListener('DOMContentLoaded', startObserver);
        }
    }

    // ==================== 豆包：默认思考 + 保留技能栏 + 遥测拦截 ====================
    if (host.includes('doubao.com') || host.includes('bytedance.com')) {
        // 1. 拦截遥测/埋点请求
        const BLOCKED_HOSTS = ['opt.doubao.com','mon.zijieapi.com','mcs.doubao.com','mssdk.bytedance.com'];
        const _fetch = window.fetch;
        window.fetch = function(url, ...args) {
            const u = typeof url === 'string' ? url : url.url;
            if (BLOCKED_HOSTS.some(h => u.includes(h))) return Promise.reject(new Error('Blocked'));
            return _fetch.call(this, url, ...args);
        };
        const _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (BLOCKED_HOSTS.some(h => String(url).includes(h))) {
                this.send = () => {};
                this.setRequestHeader = () => {};
                return;
            }
            return _open.call(this, method, url, ...rest);
        };

        // 2. 模型切换逻辑
        let targetModel = GM_getValue('doubaoModel', '思考');
        let isProcessing = false;

        console.log(`🎯 当前默认模型：${targetModel}`);

        GM_registerMenuCommand('🌱 默认「思考」模式', () => {
            GM_setValue('doubaoModel', '思考');
            targetModel = '思考';
            switchToModel('思考');
        });
        GM_registerMenuCommand('🚀 默认「专家」模式', () => {
            GM_setValue('doubaoModel', '专家');
            targetModel = '专家';
            switchToModel('专家');
        });

        function simulateClick(el) {
            if (!el) return;
            el.focus();
            ['pointerdown','mousedown','focus','mouseup','click'].forEach(type => {
                el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
            });
        }

        function waitForElement(selector, timeout = 5000, validate = () => true) {
            const start = Date.now();
            return new Promise(resolve => {
                const check = () => {
                    const el = document.querySelector(selector);
                    if (el && validate(el)) return resolve(el);
                    if (Date.now() - start > timeout) return resolve(null);
                    requestAnimationFrame(check);
                };
                check();
            });
        }

        function isModelButton(btn) {
            const text = btn.textContent?.trim() || '';
            return ['快速','思考','专家'].includes(text);
        }

        async function getModelButton() {
            const btns = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
            return btns.find(isModelButton) || await waitForElement('button[aria-haspopup="menu"]', 8000, isModelButton);
        }

        async function switchToModel(modelName) {
            if (isProcessing) return false;
            isProcessing = true;

            try {
                const triggerBtn = await getModelButton();
                if (!triggerBtn) {
                    console.log('❌ 未找到模型切换按钮');
                    return false;
                }

                if (triggerBtn.textContent.trim().includes(modelName)) {
                    console.log(`✅ 已是${modelName}模式`);
                    return true;
                }

                console.log(`📌 当前：${triggerBtn.textContent.trim()}，切换至${modelName}`);
                simulateClick(triggerBtn);

                const menuItem = await waitForElement('[role="menu"] [role="menuitem"]');
                if (!menuItem) {
                    console.log('❌ 菜单未弹出，重试');
                    simulateClick(triggerBtn);
                    await new Promise(r => setTimeout(r, 500));
                    if (!document.querySelector('[role="menu"] [role="menuitem"]')) {
                        console.log('❌ 再次失败');
                        return false;
                    }
                }

                const items = document.querySelectorAll('[role="menu"] [role="menuitem"]');
                const target = Array.from(items).find(item => item.textContent.includes(modelName));
                if (!target) {
                    console.log(`❌ 菜单中无“${modelName}”`);
                    simulateClick(triggerBtn);
                    return false;
                }

                simulateClick(target);
                console.log(`🚀 已切换至${modelName}`);
                return true;
            } finally {
                isProcessing = false;
            }
        }

        async function autoApply(retries = 15, interval = 800) {
            for (let i = 0; i < retries; i++) {
                await switchToModel(targetModel);
                const btn = await getModelButton();
                if (btn && btn.textContent.includes(targetModel)) return;
                await new Promise(r => setTimeout(r, interval));
            }
            console.warn('⚠️ 最终未切换至目标模型');
        }

        if (document.readyState === 'complete') autoApply();
        else window.addEventListener('load', autoApply);

        let debounce;
        new MutationObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(async () => {
                if (isProcessing) return;
                const btn = await getModelButton();
                if (btn && !btn.textContent.includes(targetModel)) {
                    console.log(`🔄 页面变化，重新应用${targetModel}`);
                    await switchToModel(targetModel);
                }
            }, 800);
        }).observe(document.documentElement, { childList: true, subtree: true });

        document.addEventListener('click', e => {
            const el = e.target.closest('div,button,span,svg');
            if (el && el.textContent.includes('新对话')) {
                setTimeout(() => switchToModel(targetModel), 300);
                setTimeout(() => switchToModel(targetModel), 800);
            }
        }, true);
    }
})();