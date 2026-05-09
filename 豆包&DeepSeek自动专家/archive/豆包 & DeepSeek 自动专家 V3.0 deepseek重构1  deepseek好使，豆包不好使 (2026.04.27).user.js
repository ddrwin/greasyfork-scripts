// ==UserScript==
// @name         豆包 & DeepSeek 自动专家
// @namespace    https://github.com/ddrwin/ai-auto-expert
// @version      3.0
// @description  统一偏好记忆、模块化监听与遥测拦截：豆包默认思考+全宽+蓝色气泡，DeepSeek 专家模式+关闭智能搜索+全宽
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
// @note         2026.04.27  V3.0  重构：统一偏好存储、站点配置驱动、遥测模块化，更稳定更易维护
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
                // 查找触发的模型按钮
                findElement: () => {
                    const btns = document.querySelectorAll('button[aria-haspopup="menu"]');
                    return Array.from(btns).find(b => ['快速','思考','专家'].includes(b.textContent.trim()));
                },
                // 从按钮文本提取当前模型名
                getCurrentValue: (btn) => {
                    const t = btn.textContent.trim();
                    if (t.includes('思考')) return '思考';
                    if (t.includes('专家')) return '专家';
                    if (t.includes('快速')) return '快速'; // 未在偏好中，但保留
                    return t;
                },
                isMatch: (btn, pref) => btn.textContent.includes(pref),
                // 切换操作 (异步)
                action: async (pref, btn) => {
                    // 打开菜单
                    simulateClick(btn);
                    // 等待菜单出现
                    let menuItem;
                    for (let i = 0; i < 10; i++) {
                        await new Promise(r => setTimeout(r, 200));
                        menuItem = document.querySelector('[role="menu"] [role="menuitem"]');
                        if (menuItem) break;
                    }
                    if (!menuItem) {
                        // 重试一次
                        simulateClick(btn);
                        await new Promise(r => setTimeout(r, 500));
                    }
                    const items = document.querySelectorAll('[role="menu"] [role="menuitem"]');
                    const target = Array.from(items).find(it => it.textContent.includes(pref));
                    if (target) {
                        simulateClick(target);
                    } else {
                        // 关闭菜单
                        simulateClick(btn);
                    }
                },
                // 手动触发检测（点击菜单项直接保存偏好）
                manualTrigger: (e, el) => {
                    const menuItem = e.target.closest('[role="menuitem"]');
                    if (!menuItem) return null;
                    const txt = menuItem.textContent || '';
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
                        if (checked !== pref) {
                            el.click();
                        }
                    },
                    // 手动点击后延迟读取即可，无需 manualTrigger
                },
                {
                    id: 'smartSearch',
                    storageKey: 'deepseekSmartSearch',
                    findElement: () => {
                        const toggles = document.querySelectorAll('.ds-toggle-button');
                        return Array.from(toggles).find(b => b.textContent.includes('智能搜索'));
                    },
                    getCurrentValue: el => el.classList.contains('ds-toggle-button--selected'),
                    // 偏好 false 表示要关闭智能搜索，即需要 selected == false
                    isMatch: (el, pref) => {
                        const selected = el.classList.contains('ds-toggle-button--selected');
                        return selected === pref;
                    },
                    action: (pref, el) => {
                        const selected = el.classList.contains('ds-toggle-button--selected');
                        if (selected !== pref) {
                            el.click();
                        }
                    },
                }
            ]
        }
    };

    // ==================== 4. 站点控制器 ====================
    function createSiteController(config) {
        // 注入 CSS
        if (config.styles) {
            GM_addStyle(config.styles);
        }

        // 加载偏好
        const prefs = loadPrefs();

        // 应用单个控件的偏好
        async function applyControl(control) {
            const el = control.findElement();
            if (!el) return; // 元素不存在，等待下次扫描
            const currentValue = control.getCurrentValue(el);
            if (control.isMatch(el, prefs[control.storageKey])) {
                return; // 已匹配
            }
            try {
                await control.action(prefs[control.storageKey], el);
                console.log(`✅ 已应用偏好: ${control.id} = ${prefs[control.storageKey]}`);
            } catch (e) {
                console.warn(`❌ 应用偏好失败: ${control.id}`, e);
            }
        }

        // 扫描所有控件
        let scanTimer;
        function scanAll() {
            config.controls.forEach(ctrl => applyControl(ctrl));
        }
        function debouncedScan() {
            clearTimeout(scanTimer);
            scanTimer = setTimeout(scanAll, 800);
        }

        // 初始化扫描
        if (document.body) {
            scanAll();
        } else {
            document.addEventListener('DOMContentLoaded', scanAll);
        }

        // 全局 DOM 变化监听
        const observer = new MutationObserver(debouncedScan);
        observer.observe(document.documentElement, { childList: true, subtree: true });

        // 监听手动操作，立即保存偏好
        document.addEventListener('click', function(e) {
            config.controls.forEach(ctrl => {
                const el = ctrl.findElement();
                if (!el) return;

                // 如果控件定义了 manualTrigger，优先使用
                if (typeof ctrl.manualTrigger === 'function') {
                    const newValue = ctrl.manualTrigger(e, el);
                    if (newValue !== null && newValue !== undefined) {
                        if (prefs[ctrl.storageKey] !== newValue) {
                            savePref(ctrl.storageKey, newValue);
                            prefs[ctrl.storageKey] = newValue; // 同步本地缓存
                            console.log(`👆 手动更新偏好: ${ctrl.storageKey} = ${newValue}`);
                        }
                        return;
                    }
                }

                // 通用检测：如果点击目标在控件元素内部，延迟后读取新值
                if (el.contains(e.target) || e.target.closest(ctrl.findElement()?.tagName)) {
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

        // 为豆包保留的油猴菜单（功能与按钮点击等效）
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

        // 针对豆包的“新对话”特殊处理：自动切回默认模型
        if (config.controls.some(c => c.id === 'doubaoModel')) {
            document.addEventListener('click', e => {
                const el = e.target.closest('div,button,span,svg');
                if (el && el.textContent.includes('新对话')) {
                    setTimeout(scanAll, 300);
                    setTimeout(scanAll, 800);
                }
            }, true);
        }
    }

    // ==================== 5. 启动 ====================
    const host = location.hostname;

    // 安装遥测拦截（需尽早，已在 document-start 执行）
    for (const [domain, config] of Object.entries(siteConfigs)) {
        if (host.includes(domain) && config.blockedHosts.length) {
            installTelemetryBlocker(config.blockedHosts);
            break;
        }
    }

    // 启动站点控制器
    for (const [domain, config] of Object.entries(siteConfigs)) {
        if (host.includes(domain)) {
            createSiteController(config);
            break;
        }
    }
})();