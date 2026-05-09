// ==UserScript==
// @name         豆包 & DeepSeek 自动专家
// @namespace    https://github.com/ddrwin/ai-auto-expert
// @version      3.5
// @description  统一偏好管理、模块化站点控制、遥测拦截。豆包默认思考，DeepSeek 默认专家+深度思考，所有切换永久记忆。
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
// @note         2026.04.27  V3.3  修复 DeepSeek 模型切换记忆，增加深度思考控制，完全解耦
// @note         2026.04.27  V3.4  修复 data-model-type="default" 与存储值 'fast' 不匹配
// @note         2026.04.27  V3.5  修复 toggle 按钮 manualTrigger 读取的是点击前状态导致偏好被反向保存的死循环；增加冷却期；DeepSeek 油猴菜单
// ==/UserScript==

(function() {
    'use strict';

    function simulateClick(el) {
        if (!el) return;
        el.focus();
        ['pointerdown','mousedown','focus','mouseup','click'].forEach(type =>
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
        );
    }

    // ==================== 1. 统一偏好管理 ====================
    const PREF_KEY = 'ai_assistant_prefs_v2';
    const defaultPrefs = Object.freeze({
        doubaoModel: '思考',               // 豆包：'思考' | '专家'
        deepseekModel: 'expert',          // DeepSeek：'expert' | 'default'（对应 data-model-type 属性值）
        deepseekDeepThink: true,          // DeepSeek 深度思考
        deepseekSmartSearch: false        // DeepSeek 智能搜索
    });

    function loadPrefs() {
        const saved = GM_getValue(PREF_KEY, {});
        // 向下兼容：旧版只存了 deepseekExpert 布尔值
        if (typeof saved.deepseekExpert === 'boolean' && !saved.deepseekModel) {
            saved.deepseekModel = saved.deepseekExpert ? 'expert' : 'default';
            delete saved.deepseekExpert;
            GM_setValue(PREF_KEY, saved);
        }
        // 向下兼容：旧版存了 'fast'，修正为 DOM 实际使用的 'default'
        if (saved.deepseekModel === 'fast') {
            saved.deepseekModel = 'default';
            GM_setValue(PREF_KEY, saved);
        }
        return { ...defaultPrefs, ...saved };
    }

    function savePref(key, value) {
        const prefs = loadPrefs();
        prefs[key] = value;
        GM_setValue(PREF_KEY, prefs);
    }

    // ==================== 2. 遥测拦截模块 ====================
    function installTelemetryBlocker(hosts) {
        if (!hosts || !hosts.length) return;
        const _fetch = window.fetch;
        window.fetch = function(url, options) {
            const u = typeof url === 'string' ? url : (url.url || '');
            if (hosts.some(h => u.includes(h))) {
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
            blockedHosts: ['opt.doubao.com','mon.zijieapi.com','mcs.doubao.com','mssdk.bytedance.com'],
            controls: [{
                id: 'doubaoModel',
                storageKey: 'doubaoModel',
                findElement: () => {
                    const btns = document.querySelectorAll('button[aria-haspopup="menu"]');
                    return Array.from(btns).find(b => ['快速','思考','专家'].some(m => b.textContent.includes(m)));
                },
                getCurrentValue: btn => {
                    const t = btn.textContent.trim();
                    if (t.includes('思考')) return '思考';
                    if (t.includes('专家')) return '专家';
                    if (t.includes('快速')) return '快速';
                    return t;
                },
                isMatch: (btn, pref) => btn.textContent.includes(pref),
                action: async (pref, btn) => {
                    simulateClick(btn);
                    for (let i = 0; i < 10; i++) {
                        if (document.querySelector('[role="menu"] [role="menuitem"]')) break;
                        await new Promise(r => setTimeout(r, 200));
                    }
                    if (!document.querySelector('[role="menu"] [role="menuitem"]')) {
                        simulateClick(btn);
                        await new Promise(r => setTimeout(r, 500));
                    }
                    const items = document.querySelectorAll('[role="menu"] [role="menuitem"]');
                    const target = Array.from(items).find(it => it.textContent.includes(pref));
                    if (target) simulateClick(target);
                    else simulateClick(btn);
                },
                manualTrigger: (e) => {
                    if (!e.isTrusted) return null;
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
                    id: 'modelSelect',
                    storageKey: 'deepseekModel',
                    // data-model-type 实际值：'expert' 或 'default'（不是 'fast'）
                    findElement: () => document.querySelector('div[data-model-type="expert"], div[data-model-type="default"]'),
                    getCurrentValue: () => {
                        const expert = document.querySelector('div[data-model-type="expert"]');
                        if (expert && expert.getAttribute('aria-checked') === 'true') return 'expert';
                        const def = document.querySelector('div[data-model-type="default"]');
                        if (def && def.getAttribute('aria-checked') === 'true') return 'default';
                        return null;
                    },
                    // isMatch 在 applyControl 中通过 modelSelect 特殊分支处理，这里留空占位
                    isMatch: () => false,
                    action: async (pref) => {
                        const targetEl = document.querySelector(`div[data-model-type="${pref}"]`);
                        if (targetEl && targetEl.getAttribute('aria-checked') !== 'true') {
                            targetEl.click();
                        }
                    },
                    manualTrigger: (e) => {
                        if (!e.isTrusted) return null;
                        const el = e.target.closest('div[data-model-type]');
                        if (!el) return null;
                        const type = el.getAttribute('data-model-type');
                        if (type === 'expert' || type === 'default') return type;
                        return null;
                    }
                },
                {
                    id: 'deepThink',
                    storageKey: 'deepseekDeepThink',
                    findElement: () => Array.from(document.querySelectorAll('.ds-toggle-button')).find(b => b.textContent.includes('深度思考')),
                    getCurrentValue: el => el.classList.contains('ds-toggle-button--selected'),
                    isMatch: (el, pref) => el.classList.contains('ds-toggle-button--selected') === pref,
                    action: (pref, el) => {
                        if (el.classList.contains('ds-toggle-button--selected') !== pref) el.click();
                    },
                    // 关键：点击发生在 class 切换之前，所以新状态 = 当前状态取反
                    manualTrigger: (e) => {
                        if (!e.isTrusted) return null;
                        const el = e.target.closest('.ds-toggle-button');
                        if (!el || !el.textContent.includes('深度思考')) return null;
                        return !el.classList.contains('ds-toggle-button--selected');
                    }
                },
                {
                    id: 'smartSearch',
                    storageKey: 'deepseekSmartSearch',
                    findElement: () => Array.from(document.querySelectorAll('.ds-toggle-button')).find(b => b.textContent.includes('智能搜索')),
                    getCurrentValue: el => el.classList.contains('ds-toggle-button--selected'),
                    isMatch: (el, pref) => el.classList.contains('ds-toggle-button--selected') === pref,
                    action: (pref, el) => {
                        if (el.classList.contains('ds-toggle-button--selected') !== pref) el.click();
                    },
                    // 关键：点击发生在 class 切换之前，所以新状态 = 当前状态取反
                    manualTrigger: (e) => {
                        if (!e.isTrusted) return null;
                        const el = e.target.closest('.ds-toggle-button');
                        if (!el || !el.textContent.includes('智能搜索')) return null;
                        return !el.classList.contains('ds-toggle-button--selected');
                    }
                }
            ]
        }
    };

    // ==================== 4. 站点控制器 (完全解耦) ====================
    function createSiteController(config) {
        if (config.styles) GM_addStyle(config.styles);
        const prefs = loadPrefs();

        // 用户刚手动点击后的"冷却期"，防止脚本立刻把用户操作覆盖回去
        let manualCooldownUntil = 0;
        const COOLDOWN_MS = 1500;

        async function applyControl(control) {
            // 冷却期内跳过所有自动同步
            if (Date.now() < manualCooldownUntil) return;

            // 特殊处理 modelSelect，因为需要全局查询当前值
            if (control.id === 'modelSelect') {
                const currentModel = control.getCurrentValue();
                const target = prefs[control.storageKey];
                if (currentModel === null) return; // DOM 未就绪
                if (currentModel === target) return;
                await control.action(target);
                console.log(`✅ 已应用偏好: ${control.id} = ${target}`);
                return;
            }

            const el = control.findElement();
            if (!el) return;
            if (control.isMatch(el, prefs[control.storageKey])) return;
            try {
                await control.action(prefs[control.storageKey], el);
                console.log(`✅ 已应用偏好: ${control.id} = ${prefs[control.storageKey]}`);
            } catch (e) {
                console.warn(`❌ 应用偏好失败: ${control.id}`, e);
            }
        }

        let scanTimer;
        function scanAll() { config.controls.forEach(c => applyControl(c)); }
        function debouncedScan() { clearTimeout(scanTimer); scanTimer = setTimeout(scanAll, 800); }

        if (document.body) scanAll();
        else document.addEventListener('DOMContentLoaded', scanAll);

        // 只观察 body 子树（不是 documentElement），减少 DeepSeek 流式响应的噪声
        const observerTarget = document.body || document.documentElement;
        new MutationObserver(debouncedScan).observe(observerTarget, { childList: true, subtree: true });

        // 统一手动偏好捕获（关键：先进入冷却期，再保存偏好）
        document.addEventListener('click', function(e) {
            if (!e.isTrusted) return;
            config.controls.forEach(ctrl => {
                if (typeof ctrl.manualTrigger === 'function') {
                    const newValue = ctrl.manualTrigger(e);
                    if (newValue !== null && newValue !== undefined && newValue !== prefs[ctrl.storageKey]) {
                        // 立即设置冷却期 + 取消任何待执行的 scan
                        manualCooldownUntil = Date.now() + COOLDOWN_MS;
                        clearTimeout(scanTimer);

                        savePref(ctrl.storageKey, newValue);
                        prefs[ctrl.storageKey] = newValue;
                        console.log(`👆 手动更新偏好: ${ctrl.storageKey} = ${newValue}`);
                    }
                }
            });
        }, true);

        // 豆包油猴菜单
        if (hostname.includes('doubao.com')) {
            GM_registerMenuCommand('🌱 默认「思考」模式', () => { savePref('doubaoModel', '思考'); prefs.doubaoModel = '思考'; scanAll(); });
            GM_registerMenuCommand('🚀 默认「专家」模式', () => { savePref('doubaoModel', '专家'); prefs.doubaoModel = '专家'; scanAll(); });
        }

        // DeepSeek 油猴菜单
        if (hostname.includes('deepseek.com')) {
            GM_registerMenuCommand('🚀 默认「专家」模式', () => { savePref('deepseekModel', 'expert'); prefs.deepseekModel = 'expert'; scanAll(); });
            GM_registerMenuCommand('⚡ 默认「快速」模式', () => { savePref('deepseekModel', 'default'); prefs.deepseekModel = 'default'; scanAll(); });
            GM_registerMenuCommand('🧠 启用深度思考', () => { savePref('deepseekDeepThink', true); prefs.deepseekDeepThink = true; scanAll(); });
            GM_registerMenuCommand('🚫 关闭深度思考', () => { savePref('deepseekDeepThink', false); prefs.deepseekDeepThink = false; scanAll(); });
            GM_registerMenuCommand('🔍 启用智能搜索', () => { savePref('deepseekSmartSearch', true); prefs.deepseekSmartSearch = true; scanAll(); });
            GM_registerMenuCommand('🚫 关闭智能搜索', () => { savePref('deepseekSmartSearch', false); prefs.deepseekSmartSearch = false; scanAll(); });
        }

        // 豆包"新对话"特殊处理
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
    const hostname = location.hostname;
    for (const [domain, cfg] of Object.entries(siteConfigs)) {
        if (hostname.includes(domain)) {
            if (cfg.blockedHosts?.length) installTelemetryBlocker(cfg.blockedHosts);
            createSiteController(cfg);
            break;
        }
    }
})();