// ==UserScript==
// @name         豆包｜默认思考 + 保留技能栏 + 加速
// @namespace    https://github.com/yourname/doubao-think
// @version      5.1
// @description  默认选择“思考”模式（可菜单切换专家），保留全部技能按钮，拦截遥测请求
// @author       你
// @match        *://*.doubao.com/*
// @match        *://*.bytedance.com/*
// @icon         https://www.doubao.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ========== 1. 加速：拦截遥测/埋点请求 ==========
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

    // ========== 2. 模型切换（仅切换“快速/思考/专家”，不碰技能栏）==========
    let targetModel = GM_getValue('doubaoModel', '思考');
    let isProcessing = false;

    console.log(`🎯 当前默认模型：${targetModel}`);

    // 右键菜单切换
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

    // 重试直到成功
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

    // 监听页面动态变化（新对话、路由切换）
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

    // 点击“新对话”后立即重新应用
    document.addEventListener('click', e => {
        const el = e.target.closest('div,button,span,svg');
        if (el && el.textContent.includes('新对话')) {
            setTimeout(() => switchToModel(targetModel), 300);
            setTimeout(() => switchToModel(targetModel), 800);
        }
    }, true);

})();