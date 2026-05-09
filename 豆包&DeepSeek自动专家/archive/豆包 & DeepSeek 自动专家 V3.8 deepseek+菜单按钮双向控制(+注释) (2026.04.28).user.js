// ==UserScript==
// @name         豆包 & DeepSeek 自动专家
// @namespace    https://github.com/ddrwin/ai-auto-expert
// @version      3.8
// @description  统一偏好管理、模块化站点控制、遥测拦截。豆包默认思考，DeepSeek 默认专家+深度思考，所有切换永久记忆。菜单动态显示当前状态。
// @icon         https://www.deepseek.com/favicon.ico
// @author       ddrwin
// @match        *://*.doubao.com/*
// @match        *://*.deepseek.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @note         2026.04.27  V3.3  修复 DeepSeek 模型切换记忆，增加深度思考控制，完全解耦
// @note         2026.04.27  V3.4  修复 data-model-type="default" 与存储值 'fast' 不匹配
// @note         2026.04.27  V3.5  修复 toggle 按钮 manualTrigger 读取的是点击前状态导致偏好被反向保存的死循环；增加冷却期；DeepSeek 油猴菜单
// @note         2026.04.28  V3.6  菜单项动态显示当前生效状态；统一网站按钮与菜单的记忆入口，支持 GM_unregisterMenuCommand 刷新菜单
// @note         2026.04.28  V3.7  修复 DeepSeek 模型切换在页面点击不记忆的 bug（改用异步读取最终状态）；增加鼠标悬停/移动时的自动同步抑制，防止 hover 效果干扰脚本误判
// @note         2026.04.28  V3.8  彻底修复 DeepSeek 模型点击记忆：因页面内部测量元素及事件委托导致 closest('[data-model-type]') 失效，改为监听整个模型区域点击，异步读取 aria-checked 获取最终状态并记忆。
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
                    findElement: () => document.querySelector('div[data-model-type="expert"], div[data-model-type="default"]'),
                    getCurrentValue: () => {
                        const expert = document.querySelector('div[data-model-type="expert"]');
                        if (expert && expert.getAttribute('aria-checked') === 'true') return 'expert';
                        const def = document.querySelector('div[data-model-type="default"]');
                        if (def && def.getAttribute('aria-checked') === 'true') return 'default';
                        return null;
                    },
                    isMatch: () => false,
                    action: async (pref) => {
                        const targetEl = document.querySelector(`div[data-model-type="${pref}"]`);
                        if (targetEl && targetEl.getAttribute('aria-checked') !== 'true') {
                            targetEl.click();
                        }
                    },
                    // 【重要】模型切换的 manualTrigger 现在由控制器统一处理，不再在此处实现同步返回。
                    // 原因：用户点击可能落在深层子元素上，closest 可能找不到 data-model-type；且 hover 效果可能临时改变 aria-checked 状态。
                    // 解决方案：在全局 click 监听中检测到点击发生在模型区域后，延迟读取 getCurrentValue 获取最终状态，避免误判。
                    manualTrigger: null // 由控制器特殊分支处理
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

    // ==================== 4. 站点控制器 (完全解耦，新增动态菜单、hover抑制、异步模型记忆) ====================
    function createSiteController(config) {
        if (config.styles) GM_addStyle(config.styles);
        const prefs = loadPrefs();

        let manualCooldownUntil = 0;
        const COOLDOWN_MS = 1500;

        // ---- 鼠标移动时间戳，用于抑制 hover 造成的自动同步误判 ----
        let lastMouseMove = 0;
        document.addEventListener('mousemove', () => { lastMouseMove = Date.now(); }, { passive: true });

        // ----- 动态菜单管理 -----
        let menuIds = [];
        function unregisterAllMenus() {
            menuIds.forEach(id => { try { GM_unregisterMenuCommand(id); } catch(e) {} });
            menuIds = [];
        }

        function refreshMenus() {
            unregisterAllMenus();
            const p = prefs;
            if (hostname.includes('doubao.com')) {
                const thinkingActive = p.doubaoModel === '思考';
                const expertActive = p.doubaoModel === '专家';
                menuIds.push(GM_registerMenuCommand(`🌱 思考模式${thinkingActive ? ' [当前]' : ''}`, () => {
                    updatePreference('doubaoModel', '思考');
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`🚀 专家模式${expertActive ? ' [当前]' : ''}`, () => {
                    updatePreference('doubaoModel', '专家');
                    scanAll();
                }));
            } else if (hostname.includes('deepseek.com')) {
                const expertActive = p.deepseekModel === 'expert';
                const fastActive = p.deepseekModel === 'default';
                const thinkOn = p.deepseekDeepThink;
                const searchOn = p.deepseekSmartSearch;
                menuIds.push(GM_registerMenuCommand(`🚀 专家模型${expertActive ? ' [当前]' : ''}`, () => {
                    updatePreference('deepseekModel', 'expert');
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`⚡ 快速模型${fastActive ? ' [当前]' : ''}`, () => {
                    updatePreference('deepseekModel', 'default');
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`🧠 深度思考 [${thinkOn ? '已开启' : '已关闭'}]`, () => {
                    updatePreference('deepseekDeepThink', !thinkOn);
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`🔍 智能搜索 [${searchOn ? '已开启' : '已关闭'}]`, () => {
                    updatePreference('deepseekSmartSearch', !searchOn);
                    scanAll();
                }));
            }
        }

        function updatePreference(key, value) {
            savePref(key, value);
            prefs[key] = value;
            refreshMenus();
        }
        refreshMenus();

        // ----- 自动同步控制（带 hover 抑制）-----
        async function applyControl(control) {
            const MOUSE_IDLE_THRESHOLD = 300;
            if (Date.now() - lastMouseMove < MOUSE_IDLE_THRESHOLD) return;
            if (Date.now() < manualCooldownUntil) return;

            if (control.id === 'modelSelect') {
                const currentModel = control.getCurrentValue();
                const target = prefs[control.storageKey];
                if (currentModel === null) return;
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

        const observerTarget = document.body || document.documentElement;
        new MutationObserver(debouncedScan).observe(observerTarget, { childList: true, subtree: true });

        // ----- 统一的手动偏好捕获（网页按钮 / 菜单触发）-----
        document.addEventListener('click', function(e) {
            if (!e.isTrusted) return;

            // DeepSeek 模型切换采用全新的检测方式：判断点击是否发生在包含“快速模式/专家模式”文本的模型切换容器内
            if (hostname.includes('deepseek.com')) {
                // 定位模型切换容器：查找 role="radiogroup" 且内部有 data-model-type 的元素
                const radioGroup = document.querySelector('[role="radiogroup"]');
                if (radioGroup && radioGroup.contains(e.target)) {
                    // 用户确实在模型区域内点击了（不论具体点到哪个子元素）
                    // 延迟读取最终生效的模型，避免 hover 动画和测量元素干扰
                    setTimeout(() => {
                        const ctrl = config.controls.find(c => c.id === 'modelSelect');
                        if (!ctrl) return;
                        const finalValue = ctrl.getCurrentValue();
                        if (finalValue && finalValue !== prefs.deepseekModel) {
                            manualCooldownUntil = Date.now() + COOLDOWN_MS;
                            clearTimeout(scanTimer);
                            updatePreference('deepseekModel', finalValue);
                            console.log(`👆 手动更新偏好: deepseekModel = ${finalValue} (通过容器检测)`);
                        }
                    }, 0);
                }
            }

            // 其他控件的同步手动触发（深度思考、智能搜索、豆包模型等）
            config.controls.forEach(ctrl => {
                if (typeof ctrl.manualTrigger === 'function') {
                    const newValue = ctrl.manualTrigger(e);
                    if (newValue !== null && newValue !== undefined && newValue !== prefs[ctrl.storageKey]) {
                        manualCooldownUntil = Date.now() + COOLDOWN_MS;
                        clearTimeout(scanTimer);
                        updatePreference(ctrl.storageKey, newValue);
                        console.log(`👆 手动更新偏好: ${ctrl.storageKey} = ${newValue}`);
                    }
                }
            });
        }, true);

        // 豆包新对话
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