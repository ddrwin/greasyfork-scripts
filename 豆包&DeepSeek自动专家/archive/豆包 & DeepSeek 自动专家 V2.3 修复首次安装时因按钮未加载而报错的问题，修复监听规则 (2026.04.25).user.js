// ==UserScript==
// @name         豆包 & DeepSeek 自动专家
// @namespace
// @version      2.3
// @description  豆包：默认思考模式+遥测拦截+全宽+蓝色气泡（点击菜单即保存偏好）；DeepSeek：自动专家模式+关闭智能搜索+全宽+表格全宽
// @icon         http://www.deepseek.com//favicon.ico
// @author       ddrwin
// @match        *://*.doubao.com/*
// @match        *://*.deepseek.com/*
// @icon         https://www.doubao.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @note         2026.1.9    V1.5  豆包：引入默认思考模式，新对话/刷新自动切换为思考
// @note         2026.1.17   V1.6  豆包：增加遥测拦截，屏蔽 opt.doubao.com 等埋点请求
// @note         2026.2.5    V1.7  豆包：界面全宽化 + 发送气泡改为蓝色背景
// @note         2026.2.20   V1.8  DeepSeek：自动切换专家模式，关闭智能搜索
// @note         2026.3.15   V1.9  DeepSeek：对话窗口宽度扩展至 95%，表格区域全宽
// @note         2026.3.23   V2.0  统一优化表格字体大小与间隙（豆包/DeepSeek）
// @note         2026.4.15   V2.1  集成更宽的 DeepSeek 对话窗口与表格全宽样式
// @note         2026.4.22   V2.2  豆包菜单项点击直接保存默认偏好（再也不去油猴菜单啦～）
// @note         2026.4.25   V2.3  修复首次安装时因按钮未加载而报错的问题，改用观察者自动适配
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

    // ==================== DeepSeek：专家模式 + 关闭智能搜索 + 全宽样式 ====================
    if (host === 'chat.deepseek.com') {
        GM_addStyle(`
            div:has( > #latest-context-divider) {
                width: 95% !important;
            }
            div:has( > div > #chat-input) {
                width: 95% !important;
                max-width: 90vw;
            }
            :root {
                --message-list-max-width: calc(100% - 20px);
            }
            #root > div > div.d4850e57 > div.d7ae46fd > div.ad902ce3 {
                max-width: calc(100% - 20px);
            }
            #root > div > div.c3ecdb44 > div.f2eea526 > div > div > div.a2f8e4bb {
                max-width: calc(100% - 20px);
            }
            #root > div > div.c3ecdb44 > div.f2eea526 > div > div > div.a2f8e4bb > div.aaff8b8f.eb830e32 > div > div > div.fad49dec {
                max-height: 50vh;
            }
            .ds-markdown .ds-scroll-area {
                max-width: none !important;
                width: 100% !important;
                overflow-x: auto !important;
            }
            .ds-markdown .ds-scroll-area table {
                width: 100% !important;
            }
        `);

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

    // ==================== 豆包：默认思考 + 遥测拦截 + 菜单即保存偏好（v2.3 修复首次安装提示） ====================
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

        // 2. 模型切换逻辑（增强：按钮点击即保存，首次安装静默适配）
        let targetModel = GM_getValue('doubaoModel', '思考');
        let isProcessing = false;

        console.log(`🎯 当前默认模型：${targetModel}`);

        // 保留油猴菜单（与按钮功能等价）
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
                    console.log('❌ 未找到模型切换按钮（页面尚未加载完毕，稍后自动适配）');
                    return false;
                }

                if (triggerBtn.textContent.trim().includes(modelName)) {
                    console.log(`✅ 已是${modelName}模式`);
                    // 确保偏好存储
                    GM_setValue('doubaoModel', modelName);
                    targetModel = modelName;
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
                // ★ 关键改动：切换成功后立即保存为默认偏好
                GM_setValue('doubaoModel', modelName);
                targetModel = modelName;
                console.log(`🚀 已切换至${modelName}，并保存为默认`);
                return true;
            } finally {
                isProcessing = false;
            }
        }

        // 监听用户点击菜单项，立即保存偏好
        document.addEventListener('click', function(e) {
            const menuItem = e.target.closest('[role="menuitem"]');
            if (!menuItem) return;

            const text = menuItem.textContent || '';
            if (text.includes('思考')) {
                GM_setValue('doubaoModel', '思考');
                targetModel = '思考';
                console.log('👆 手动点击「思考」，已设为默认偏好');
            } else if (text.includes('专家')) {
                GM_setValue('doubaoModel', '专家');
                targetModel = '专家';
                console.log('👆 手动点击「专家」，已设为默认偏好');
            }
        }, true);

        // 页面变化时自动恢复偏好（核心：代替原来的 autoApply）
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

        // 点击“新对话”时，瞬间切回默认模型
        document.addEventListener('click', e => {
            const el = e.target.closest('div,button,span,svg');
            if (el && el.textContent.includes('新对话')) {
                setTimeout(() => switchToModel(targetModel), 300);
                setTimeout(() => switchToModel(targetModel), 800);
            }
        }, true);

        // 首次安装时，如果按钮已经存在就立刻切换一次；否则静默等待观察器处理
        (async () => {
            const btn = await getModelButton();
            if (btn && !btn.textContent.includes(targetModel)) {
                console.log(`🎬 初始检测：切换至默认${targetModel}`);
                await switchToModel(targetModel);
            } else if (!btn) {
                console.log('⏳ 模型按钮尚未出现，将自动适配页面变化');
            } else {
                console.log(`✅ 初始模型已是${targetModel}`);
            }
        })();
    }
})();