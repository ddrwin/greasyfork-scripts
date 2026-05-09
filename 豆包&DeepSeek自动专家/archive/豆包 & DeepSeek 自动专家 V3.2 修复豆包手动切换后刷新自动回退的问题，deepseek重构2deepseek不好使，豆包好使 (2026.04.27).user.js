// ==UserScript==
// @name         豆包 & DeepSeek 自动专家
// @namespace    https://github.com/ddrwin/ai-auto-expert
// @version      3.2
// @description  统一偏好记忆、模块化监听与遥测拦截：豆包默认思考+全宽+蓝色气泡，DeepSeek 专家模式+关闭智能搜索+全宽。修复自动回退问题。
// @icon         https://www.deepseek.com/favicon.ico
// @author       ddrwin
// @match        *://*.doubao.com/*
// @match        *://*.deepseek.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @note         2026.04.27  V3.2  修复豆包手动切换后刷新自动回退的问题（只响应用户真实点击）
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 辅助工具 ====================
    function simulateClick(el) {
        if (!el) return;
        el.focus();
        ['pointerdown', 'mousedown', 'focus', 'mouseup', 'click'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
        });
    }

    // ==================== 1. 统一偏好管理 ====================
    const PREF_KEY = 'ai_assistant_prefs_v2';
    const defaultPrefs = Object.freeze({
        doubaoModel: '思考',               // 豆包模型：'思考' | '专家'
        deepseekExpert: true,             // DeepSeek 专家模式
        deepseekSmartSearch: false        // DeepSeek 智能搜索 (false = 关闭)
    });

    function loadPrefs() {
        const saved = GM_getValue(PREF_KEY, {});
        return { ...defaultPrefs, ...saved };
    }

    function savePref(key, value) {
        const prefs = loadPrefs();
        prefs[key] = value;
        GM_setValue(PREF_KEY, prefs);
    }

    // ==================== 2. 统一遥测拦截模块 ====================
    function installTelemetryBlocker(hosts) {
        if (!hosts || !hosts.length) return;

        const _fetch = window.fetch;
        window.fetch = function(url, options) {
            const urlStr = typeof url === 'string' ? url : (url.url || '');
            if (hosts.some(h => urlStr.includes(h))) {
                console.debug('[Telemetry] blocked fetch:', urlStr);
                return Promise.reject(new Error('Blocked'));
            }
            return _fetch.call(this, url, options);
        };

        const _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (hosts.some(h => String(url).includes(h))) {
                this.send = () => {};
                this.setRequestHeader = () => {};
                return;
            }
            return _open.call(this, method, url, ...rest);
        };
    }

    // ==================== 3. 站点配置 ====================
    const siteConfigs = {
        'doubao.com': {
            styles: `
                :root { --content-max-width: 100% !important; }
                div[class*="max-w-"] { max-width: 100% !important; }
                .container-PvPoAn, .item-kDun2N, [class*="max-dbx-xs:"] { max-width: 100% !important; }
                .bg-g-send-msg-bubble-bg { background: #dbeafe !important; color: #1e293b !important; }
                .bg-g-receive-msg-bubble-bg { background: #ffffff !important; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
                [class*="send-msg-bubble"] { background: #dbeafe !important; color: #1e293b !important; }
                [class*="receive-msg-bubble"] { background: #ffffff !important; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
                .bg-g-send-msg-bubble-bg, .bg-g-receive-msg-bubble-bg { border-radius: 12px; }
                .bg-g-send-msg-bubble-bg code, .bg-g-send-msg-bubble-bg pre { background-color: rgba(0,0,0,0.06); }
                .mdbox-table-root, .table-scroll-container-OfUx5s, .table-wrapper-wG0rS7 {
                    max-width: 100% !important; width: 100% !important; overflow-x: auto !important;
                }
                .mdbox-table-root table, .table-scroll-container-OfUx5s table {
                    width: 100% !important; table-layout: auto;
                }
            `,
            blockedHosts: ['opt.doubao.com', 'mon.zijieapi.com', 'mcs.doubao.com', 'mssdk.bytedance.com'],
            controls: [{
                id: 'doubaoModel',
                storageKey: 'doubaoModel',
                findElement: () => {
                    const btns = document.querySelectorAll('button[aria-haspopup="menu"]');
                    return Array.from(btns).find(b => ['快速','思考','专家'].some(m => b.textContent.includes(m)));
                },
                getCurrentValue: (btn) => {
                    const t = btn.textContent.trim();
                    if (t.includes('思考')) return '思考';
                    if (t.includes('专家')) return '专家';
                    if (t.includes('快速')) return '快速';
                    return t;
                },
                isMatch: (btn, pref) => btn.textContent.includes(pref),
                action: async (pref, btn) => {
                    simulateClick(btn);
                    // 等待菜单出现（最多2秒）
                    for (let i = 0; i < 10; i++) {
                        if (document.querySelector('[role="menu"] [role="menuitem"]')) break;
                        await new Promise(r => setTimeout(r, 200));
                    }
                    if (!document.querySelector('[role="menu"] [role="menuitem"]')) {
                        // 重试一次
                        simulateClick(btn);
                        await new Promise(r => setTimeout(r, 500));
                    }
                    const items = document.querySelectorAll('[role="menu"] [role="menuitem"]');
                    const target = Array.from(items).find(it => it.textContent.includes(pref));
                    if (target) {
                        simulateClick(target);
                    } else {
                        // 没找到就关闭菜单
                        simulateClick(btn);
                    }
                },
                manualTrigger: (e) => {
                    if (!e.isTrusted) return null;  // 只有真实用户操作才记录偏好
                    const menuItem = e.target.closest('[role="menuitem"]');
                    if (!menuItem) return null;
                    const txt = menuItem.textContent.trim();
                    if (txt.includes('思考')) return '思考';
                    if (txt.includes('专家')) return '专家';
                    if (txt.includes('快速')) return '快速';
                    return null;
                }
            }]
        },
        'chat.deepseek.com': {
            styles: `
                div:has( > #latest-context-divider) { width: 95% !important; }
                div:has( > div > #chat-input) { width: 95% !important; max-width: 90vw; }
                :root { --message-list-max-width: calc(100% - 20px); }
                #root > div > div.d4850e57 > div.d7ae46fd > div.ad902ce3 { max-width: calc(100% - 20px); }
                #root > div > div.c3ecdb44 > div.f2eea526 > div > div > div.a2f8e4bb { max-width: calc(100% - 20px); }
                #root > div > div.c3ecdb44 > div.f2eea526 > div > div > div.a2f8e4bb > div.aaff8b8f.eb830e32 > div > div > div.fad49dec { max-height: 50vh; }
                .ds-markdown .ds-scroll-area { max-width: none !important; width: 100% !important; overflow-x: auto !important; }
                .ds-markdown .ds-scroll-area table { width: 100% !important; }
            `,
            blockedHosts: [],
            controls: [
                {
                    id: 'expertMode',
                    storageKey: 'deepseekExpert',
                    findElement: () => document.querySelector('div[data-model-type="expert"]'),
                    getCurrentValue: el => el.getAttribute('aria-checked') === 'true',
                    isMatch: (el, pref) => el.getAttribute('aria-checked') === String(pref),
                    action: (pref, el) => {
                        const checked = el.getAttribute('aria-checked') === 'true';
                        if (checked !== pref) el.click();
                    }
                },
                {
                    id: 'smartSearch',
                    storageKey: 'deepseekSmartSearch',
                    findElement: () => {
                        const toggles = document.querySelectorAll('.ds-toggle-button');
                        return Array.from(toggles).find(b => b.textContent.includes('智能搜索'));
                    },
                    getCurrentValue: el => el.classList.contains('ds-toggle-button--selected'),
                    isMatch: (el, pref) => el.classList.contains('ds-toggle-button--selected') === pref,
                    action: (pref, el) => {
                        if (el.classList.contains('ds-toggle-button--selected') !== pref) el.click();
                    }
                }
            ]
        }
    };

    // ==================== 4. 站点控制器 ====================
    function createSiteController(config) {
        if (config.styles) GM_addStyle(config.styles);
        const prefs = loadPrefs();

        async function applyControl(control) {
            const el = control.findElement();
            if (!el) return;
            const currentValue = control.getCurrentValue(el);
            if (control.isMatch(el, prefs[control.storageKey])) return;
            try {
                await control.action(prefs[control.storageKey], el);
                console.log(`✅ 已应用偏好: ${control.id} = ${prefs[control.storageKey]}`);
            } catch (e) {
                console.warn(`❌ 应用偏好失败: ${control.id}`, e);
            }
        }

        let scanTimer;
        function scanAll() {
            config.controls.forEach(ctrl => applyControl(ctrl));
        }
        function debouncedScan() {
            clearTimeout(scanTimer);
            scanTimer = setTimeout(scanAll, 800);
        }

        if (document.body) {
            scanAll();
        } else {
            document.addEventListener('DOMContentLoaded', scanAll);
        }

        const observer = new MutationObserver(debouncedScan);
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // 监听用户手动操作，保存偏好（仅响应真实用户点击）
        document.addEventListener('click', function(e) {
            // 关键修复：忽略脚本触发的非用户事件
            if (!e.isTrusted) return;

            config.controls.forEach(ctrl => {
                // 优先使用手动触发检测（菜单项点击）
                if (typeof ctrl.manualTrigger === 'function') {
                    const newValue = ctrl.manualTrigger(e);
                    if (newValue !== null && newValue !== undefined) {
                        if (prefs[ctrl.storageKey] !== newValue) {
                            savePref(ctrl.storageKey, newValue);
                            prefs[ctrl.storageKey] = newValue;
                            console.log(`👆 手动更新偏好: ${ctrl.storageKey} = ${newValue}`);
                        }
                        return;
                    }
                }

                // 通用检测：点击控件本身（按钮/开关）
                const el = ctrl.findElement();
                if (!el) return;

                if (el.contains(e.target)) {
                    setTimeout(() => {
                        const updatedEl = ctrl.findElement();
                        if (updatedEl) {
                            const newValue = ctrl.getCurrentValue(updatedEl);
                            if (newValue !== prefs[ctrl.storageKey]) {
                                savePref(ctrl.storageKey, newValue);
                                prefs[ctrl.storageKey] = newValue;
                                console.log(`🖱️ 自动捕获偏好变更: ${ctrl.storageKey} = ${newValue}`);
                            }
                        }
                    }, 300);
                }
            });
        }, true);

        // 豆包油猴菜单保留
        if (config.controls.some(c => c.id === 'doubaoModel')) {
            GM_registerMenuCommand('🌱 默认「思考」模式', () => {
                savePref('doubaoModel', '思考');
                prefs.doubaoModel = '思考';
                scanAll();
            });
            GM_registerMenuCommand('🚀 默认「专家」模式', () => {
                savePref('doubaoModel', '专家');
                prefs.doubaoModel = '专家';
                scanAll();
            });
        }

        // 豆包新对话自动切回默认模型
        if (config.controls.some(c => c.id === 'doubaoModel')) {
            document.addEventListener('click', e => {
                const target = e.target.closest('div,button,span,svg');
                if (target && target.textContent.includes('新对话')) {
                    setTimeout(scanAll, 300);
                    setTimeout(scanAll, 800);
                }
            }, true);
        }
    }

    // ==================== 5. 启动 ====================
    const host = location.hostname;

    for (const [domain, config] of Object.entries(siteConfigs)) {
        if (host.includes(domain) && config.blockedHosts.length) {
            installTelemetryBlocker(config.blockedHosts);
            break;
        }
    }

    for (const [domain, config] of Object.entries(siteConfigs)) {
        if (host.includes(domain)) {
            createSiteController(config);
            break;
        }
    }
})();