// ==UserScript==
// @name         豆包 & DeepSeek 全家桶 (deepseek)
// @namespace    https://github.com/ddrwin/ai-auto-expert-fullsuite
// @version      1.3
// @description  统一偏好管理、站点控件增强、遥测拦截；侧边栏永恒守护；Usage 页千分位格式化 + 缓存命中率悬浮窗
// @icon         https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/chat/favicon.png
// @author       ddrwin
// @match        *://*.doubao.com/*
// @match        *://*.deepseek.com/*
// @match        *://platform.deepseek.com/usage*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// @note         合并自 V4.0 (自动专家) + V8.6 (Usage 监控) + v2.5 (侧边栏守护)。侧边栏永远开启；千分位/悬浮窗由 master_switch 统一控制。
// @note         V1.1 修复 matchMedia 劫持时序问题 (移至文件最顶部执行，hostname 判断内置)
// @note         V1.2 劫持策略升级：所有 max-width 查询一律返回 false (覆盖 1200/1024/768 等全部断点)
// @note         V1.3 修复 GM grant 导致的沙箱隔离：劫持作用于 unsafeWindow，解决 matchMedia 失效问题
// ==/UserScript==

(function() {
    'use strict';

    /* ════════════════════════════════════════════════════════════════════
     *     修复时序 & 沙箱 V1.3：
     *     1. matchMedia 劫持必须作为第一个同步操作执行，hostname 判断内置。
     *     2. 拦截策略：所有 max-width 查询一律返回 false (覆盖 1200/1024/768 等全部断点)。
     *     3. 修复 GM grant 导致的作用域隔离：劫持作用于 unsafeWindow（页面真实 window），
     *        同时劫持脚本作用域的 window 以防万一。
     *     4. 通过 @grant unsafeWindow 申请父作用域访问权限。
     * ══════════════════════════════════════════════════════════════════ */
    if (location.hostname === 'chat.deepseek.com') {
        // 获取页面真实的 window（油猴沙箱下通过 unsafeWindow 访问）
        const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const originalMatchMedia = pageWindow.matchMedia.bind(pageWindow);

        const interceptedMatchMedia = function(query) {
            if (typeof query === 'string') {
                const match = query.match(/max-width\s*:\s*(\d+)px/);
                if (match) {
                    // 所有 max-width 查询一律返回 false（永不匹配窄屏）
                    return {
                        matches: false,
                        media: query,
                        onchange: null,
                        addListener: function(cb) { cb(this); },
                        removeListener: function() {},
                        addEventListener: function(type, cb) {
                            if (type === 'change') cb(this);
                        },
                        removeEventListener: function() {},
                        dispatchEvent: function() { return true; }
                    };
                }
            }
            return originalMatchMedia(query);
        };

        // 劫持页面真实 window（React 读这个）
        pageWindow.matchMedia = interceptedMatchMedia;
        // 同时劫持脚本作用域 window（其他模块可能读这个）
        window.matchMedia = interceptedMatchMedia;

        console.log('[全家桶 V1.3] matchMedia 劫持已安装 (侧边栏防线一，全 max-width 拦截，双作用域)');
    }

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 0  地震仪日志 (V4.0 原样)
     * ══════════════════════════════════════════════════════════════════ */
    const SCRIPT_START = performance.now();
    const SCRIPT_VERSION = '1.3';

    function ts() {
        return `[T+${((performance.now() - SCRIPT_START) / 1000).toFixed(3)}s]`;
    }

    function simulateClick(el) {
        if (!el) return;
        try { el.focus(); } catch(e) {}
        ['pointerdown','mousedown','focus','mouseup','click'].forEach(type =>
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
        );
    }

    const COLORS = {
        '模型切换': { main: '#1e6fff', light: '#85b3ff', dark: '#0a4db8' },
        '深度思考': { main: '#389e0d', light: '#95de64', dark: '#1f6100' },
        '智能搜索': { main: '#722ed1', light: '#b37feb', dark: '#3c108a' },
        '豆包模型': { main: '#fa8c16', light: '#ffc069', dark: '#ad4e00' }
    };
    function getColor(label) { return COLORS[label.split(' ')[0]] || COLORS['模型切换']; }

    const TEXT_COLOR = '#1a1a1a';
    const LABEL_COLOR = '#ffffff';

    const LOG = {
        boot(msg)    { console.log(`${ts()} %c🛠️ [启动] %c${msg}`, `color:${LABEL_COLOR};background:#13c2c2;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        monitor(msg) { console.log(`${ts()} %c🟢 [监控] %c${msg}`, `color:${LABEL_COLOR};background:#1e6fff;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        scheduler(msg){ console.log(`${ts()} %c⚙️ [调度中心] %c${msg}`, `color:${LABEL_COLOR};background:#2c3e50;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        selftest(msg){ console.log(`${ts()} %c🔬 [自检] %c${msg}`, `color:${LABEL_COLOR};background:#08979c;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        manual(msg)  { console.log(`${ts()} %c👆 [手动] %c${msg}`, `color:${LABEL_COLOR};background:#722ed1;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        alert(msg)   { console.warn(`${ts()} %c🚨 [预警] %c${msg}`, `color:${LABEL_COLOR};background:#cf1322;padding:1px 4px;border-radius:2px`, `color:#cf1322;font-weight:bold`); },
        step(label, msg) {
            const c = getColor(label);
            console.log(`${ts()} %c⚡ [${label}] %c${msg}`, `color:${LABEL_COLOR};background:${c.main};padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`);
        },
        scan(label, msg) {
            const c = getColor(label);
            console.log(`${ts()} %c  🔍 [${label}] %c${msg}`, `color:${TEXT_COLOR};background:${c.light};padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`);
        },
        wait(label, msg) {
            const c = getColor(label);
            console.log(`${ts()} %c  ⏳ [${label}] %c${msg}`, `color:${c.dark};background:${c.light}33;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`);
        },
        action(label, msg) {
            const c = getColor(label);
            console.log(`${ts()} %c  ⚡ [${label}] %c${msg}`, `color:${LABEL_COLOR};background:${c.dark};padding:1px 4px;border-radius:2px`, `color:${LABEL_COLOR}`);
        },
        ok(label, msg) {
            const c = getColor(label);
            console.log(`${ts()} %c✅ [${label}] %c${msg} ✅`, `color:${LABEL_COLOR};background:${c.main};padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`);
        },
        fail(label, msg) {
            const c = getColor(label);
            console.log(`${ts()} %c❌ [${label}] %c${msg}`, `color:${LABEL_COLOR};background:${c.dark};padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`);
        },
        warn(label, msg) {
            const c = getColor(label);
            console.warn(`${ts()} %c⚠️ [${label}] %c${msg}`, `color:${LABEL_COLOR};background:${c.main};padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`);
        },
        divider() { console.log('%c————————————————————————————————', 'color:#aaa'); }
    };

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 1  统一偏好管理 (扩展)
     * ══════════════════════════════════════════════════════════════════ */
    const PREF_KEY = 'ai_assistant_prefs_v2';
    const defaultPrefs = Object.freeze({
        doubaoModel: '思考',
        deepseekModel: 'expert',
        deepseekDeepThink: true,
        deepseekSmartSearch: false,
        usageMasterSwitch: true,
        usageDisplayMode: 'full'
    });

    function loadPrefs() {
        let saved = GM_getValue(PREF_KEY, {});
        if (typeof saved.deepseekExpert === 'boolean' && !saved.deepseekModel) {
            saved.deepseekModel = saved.deepseekExpert ? 'expert' : 'default';
            delete saved.deepseekExpert;
        }
        if (saved.deepseekModel === 'fast') {
            saved.deepseekModel = 'default';
        }
        const oldMaster = GM_getValue('master_switch', undefined);
        if (oldMaster !== undefined && saved.usageMasterSwitch === undefined) {
            saved.usageMasterSwitch = oldMaster;
        }
        const oldMode = GM_getValue('display_mode', undefined);
        if (oldMode !== undefined && saved.usageDisplayMode === undefined) {
            saved.usageDisplayMode = oldMode;
        }
        return Object.assign({}, defaultPrefs, saved);
    }

    function savePref(key, value) {
        const prefs = loadPrefs();
        prefs[key] = value;
        GM_setValue(PREF_KEY, prefs);
    }

    function savePrefs(obj) {
        const current = loadPrefs();
        Object.assign(current, obj);
        GM_setValue(PREF_KEY, current);
    }

    const prefs = loadPrefs();

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 2  遥测拦截 (V4.0 原样)
     * ══════════════════════════════════════════════════════════════════ */
    function installTelemetryBlocker(hosts) {
        if (!hosts || !hosts.length) return;
        if (window.__telemetryBlockerInstalled__) return;
        window.__telemetryBlockerInstalled__ = true;

        const _fetch = window.fetch;
        window.fetch = function(url, options) {
            const u = typeof url === 'string' ? url : (url && url.url) || '';
            if (hosts.some(h => u.includes(h))) {
                return Promise.reject(new Error('Blocked by telemetry blocker'));
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

    /* ════════════════════════════════════════════════════════════════════
     *     模块 3 已移除：matchMedia 劫持已在脚本最顶部同步执行。
     * ══════════════════════════════════════════════════════════════════ */

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 4  站点配置与控件 (V4.0 原样)
     * ══════════════════════════════════════════════════════════════════ */
    const siteConfigs = {
        'doubao.com': {
            siteName: '豆包',
            styles: `
                :root { --content-max-width: 100% !important; }
                div[class*="max-w-"] { max-width: 100% !important; }
                .container-PvPoAn, .item-kDun2N, [class*="max-dbx-xs:"] { max-width: 100% !important; }
                .bg-g-send-msg-bubble-bg { background: #EDF3FE !important; color: #1e293b !important; }
                .bg-g-receive-msg-bubble-bg { background: #ffffff !important; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
                [class*="send-msg-bubble"] { background: #EDF3FE !important; color: #1e293b !important; }
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
            conversationPathTest: (p) => p.startsWith('/chat/') && p.length > 6 && !/^\/chat\/?$/.test(p),
            controls: [{
                id: 'doubaoModel',
                storageKey: 'doubaoModel',
                label: '豆包模型',
                steps: 5,
                appliesTo: ['home', 'conversation'],
                findElement: () => {
                    const btns = document.querySelectorAll('button[aria-haspopup="menu"]');
                    return Array.from(btns).find(b => ['快速','思考','专家'].some(m => b.textContent.includes(m)));
                },
                getCurrentValue: btn => {
                    if (!btn) return null;
                    const t = btn.textContent.trim();
                    if (t.includes('思考')) return '思考';
                    if (t.includes('专家')) return '专家';
                    if (t.includes('快速')) return '快速';
                    return null;
                },
                isMatch: (btn, pref) => btn && btn.textContent.includes(pref),
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
                verify: (target) => {
                    const btns = document.querySelectorAll('button[aria-haspopup="menu"]');
                    const btn = Array.from(btns).find(b => ['快速','思考','专家'].some(m => b.textContent.includes(m)));
                    if (!btn) return { ok: false, details: [{ name: '按钮存在', ok: false, value: 'null' }] };
                    const txt = btn.textContent.trim();
                    const textOk = txt.includes(target);
                    const dc = btn.getAttribute('data-checked');
                    const dcOk = (dc === 'true') || (btn.querySelector('[data-checked="true"]') !== null);
                    return {
                        ok: textOk,
                        details: [
                            { name: `按钮文字含"${target}"`, ok: textOk, value: txt.slice(0, 20) },
                            { name: `data-checked辅助`,     ok: dcOk,    value: String(dc) }
                        ]
                    };
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
            siteName: 'DeepSeek',
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
            blockedHosts: ['hif-dliq.deepseek.com'],
            conversationPathTest: (p) => p.startsWith('/a/chat/s/'),
            controls: [
                {
                    id: 'modelSelect',
                    storageKey: 'deepseekModel',
                    label: '模型切换',
                    steps: 5,
                    appliesTo: ['home'],
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
                    verify: (target) => {
                        const targetEl = document.querySelector(`div[data-model-type="${target}"]`);
                        const ariaOk = targetEl?.getAttribute('aria-checked') === 'true';
                        const classOk = targetEl?.classList.contains('_31a22b0') || false;
                        const parent = targetEl?.closest('.b0db7355');
                        const selectedIndex = parent ? parent.style.getPropertyValue('--selected-index') : null;
                        const expectedIndex = target === 'expert' ? '1' : '0';
                        const indexOk = selectedIndex === expectedIndex;
                        return {
                            ok: ariaOk && classOk && indexOk,
                            details: [
                                { name: 'aria-checked=true',      ok: ariaOk,  value: String(targetEl?.getAttribute('aria-checked')) },
                                { name: 'class含_31a22b0',         ok: classOk, value: classOk ? 'yes' : 'no' },
                                { name: `父容器索引(${expectedIndex})`, ok: indexOk, value: String(selectedIndex) }
                            ]
                        };
                    },
                    manualTrigger: null
                },
                {
                    id: 'deepThink',
                    storageKey: 'deepseekDeepThink',
                    label: '深度思考',
                    steps: 5,
                    appliesTo: ['home', 'conversation'],
                    findElement: () => Array.from(document.querySelectorAll('.ds-toggle-button')).find(b => b.textContent.includes('深度思考')),
                    getCurrentValue: el => el ? el.classList.contains('ds-toggle-button--selected') : null,
                    isMatch: (el, pref) => el && el.classList.contains('ds-toggle-button--selected') === pref,
                    action: (pref, el) => {
                        if (el.classList.contains('ds-toggle-button--selected') !== pref) el.click();
                    },
                    verify: (target) => {
                        const el = Array.from(document.querySelectorAll('.ds-toggle-button')).find(b => b.textContent.includes('深度思考'));
                        if (!el) return { ok: false, details: [{ name: '元素存在', ok: false, value: 'null' }] };
                        const actual = el.classList.contains('ds-toggle-button--selected');
                        return {
                            ok: actual === target,
                            details: [{ name: `selected类(${target?'需有':'需无'})`, ok: actual === target, value: actual ? 'on' : 'off' }]
                        };
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
                    label: '智能搜索',
                    steps: 5,
                    appliesTo: ['home', 'conversation'],
                    findElement: () => Array.from(document.querySelectorAll('.ds-toggle-button')).find(b => b.textContent.includes('智能搜索')),
                    getCurrentValue: el => el ? el.classList.contains('ds-toggle-button--selected') : null,
                    isMatch: (el, pref) => el && el.classList.contains('ds-toggle-button--selected') === pref,
                    action: (pref, el) => {
                        if (el.classList.contains('ds-toggle-button--selected') !== pref) el.click();
                    },
                    verify: (target) => {
                        const el = Array.from(document.querySelectorAll('.ds-toggle-button')).find(b => b.textContent.includes('智能搜索'));
                        if (!el) return { ok: false, details: [{ name: '元素存在', ok: false, value: 'null' }] };
                        const actual = el.classList.contains('ds-toggle-button--selected');
                        return {
                            ok: actual === target,
                            details: [{ name: `selected类(${target?'需有':'需无'})`, ok: actual === target, value: actual ? 'on' : 'off' }]
                        };
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

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 5  站点控制器 (V4.0 原样)
     * ══════════════════════════════════════════════════════════════════ */
    function createSiteController(hostname, config) {
        if (config.styles) GM_addStyle(config.styles);
        const siteName = config.siteName;

        const isConversationPage = () => {
            try { return config.conversationPathTest(location.pathname); }
            catch (e) { return false; }
        };
        function identifyPage() {
            if (isConversationPage()) return 'conversation';
            return 'home';
        }

        let lastPathname = location.pathname;
        let currentPageType = null;
        let scanTimer = null;

        let menuIds = [];
        function unregisterAllMenus() {
            menuIds.forEach(id => { try { GM_unregisterMenuCommand(id); } catch(e) {} });
            menuIds = [];
        }
        function refreshMenus() {
            unregisterAllMenus();
            const p = loadPrefs();
            if (hostname.includes('doubao.com')) {
                menuIds.push(GM_registerMenuCommand(`🌱 思考模式${p.doubaoModel === '思考' ? ' [当前]' : ''}`, () => {
                    updatePreference('doubaoModel', '思考');
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`🚀 专家模式${p.doubaoModel === '专家' ? ' [当前]' : ''}`, () => {
                    updatePreference('doubaoModel', '专家');
                    scanAll();
                }));
            } else if (hostname.includes('deepseek.com')) {
                menuIds.push(GM_registerMenuCommand(`🚀 专家模型${p.deepseekModel === 'expert' ? ' [当前]' : ''}`, () => {
                    updatePreference('deepseekModel', 'expert');
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`⚡ 快速模型${p.deepseekModel === 'default' ? ' [当前]' : ''}`, () => {
                    updatePreference('deepseekModel', 'default');
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`🧠 深度思考 [${p.deepseekDeepThink ? '已开启' : '已关闭'}]`, () => {
                    updatePreference('deepseekDeepThink', !p.deepseekDeepThink);
                    scanAll();
                }));
                menuIds.push(GM_registerMenuCommand(`🔍 智能搜索 [${p.deepseekSmartSearch ? '已开启' : '已关闭'}]`, () => {
                    updatePreference('deepseekSmartSearch', !p.deepseekSmartSearch);
                    scanAll();
                }));
            }
        }
        function updatePreference(key, value) {
            savePref(key, value);
            Object.assign(prefs, loadPrefs());
            refreshMenus();
        }
        refreshMenus();

        const Scheduler = {
            getWorkflow(pageType) {
                return config.controls.filter(ctrl => {
                    const appliesTo = ctrl.appliesTo || ['home'];
                    return appliesTo.includes(pageType);
                });
            },
            async run(pageType, reason) {
                const workflow = this.getWorkflow(pageType);
                LOG.scheduler(`【${siteName}】开始工作流：page=${pageType}, 控件数=${workflow.length}, 触发=${reason || '未知'}`);
                if (workflow.length === 0) {
                    LOG.alert(`【${siteName}】page="${pageType}" 工作流为空：检查 appliesTo`);
                    LOG.divider();
                    return;
                }
                for (const control of workflow) {
                    await applyControl(control);
                }
                LOG.scheduler(`【${siteName}】工作流结束：${pageType}`);
                LOG.divider();
            }
        };

        function observeRouteChange() {
            const newPath = location.pathname;
            if (newPath === lastPathname) return;
            const prevType = currentPageType;
            const newType = identifyPage();
            lastPathname = newPath;
            if (newType !== prevType) {
                LOG.scheduler(`感知页面切换：${prevType} → ${newType}`);
                currentPageType = newType;
                Scheduler.run(newType, `页面切换:${prevType}→${newType}`);
            } else {
                scheduleScan(`同类型路由变化(${newType})`);
            }
        }

        function scheduleScan(reason) {
            clearTimeout(scanTimer);
            scanTimer = setTimeout(() => scanAll(reason), 800);
        }

        try {
            new MutationObserver(() => {
                observeRouteChange();
                scheduleScan('DOM变化');
            }).observe(document.body || document.documentElement, { childList: true, subtree: true });
        } catch(e) {
            LOG.alert(`【${siteName}】MutationObserver 安装失败：${e.message}`);
        }

        async function applyControl(control) {
            const label = control.label || control.id;
            const totalSteps = control.steps || 5;
            const MAX_RETRIES = 4;
            const RETRY_DELAY = 200;
            const target = prefs[control.storageKey];

            LOG.step(`${label} 1/${totalSteps}`, `环境检查：site=${siteName}, page=${currentPageType}`);
            LOG.step(`${label} 2/${totalSteps}`, `配置读取：偏好为 ${target}`);

            let el = null;
            let currentValue = null;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                el = control.findElement();
                if (el) {
                    currentValue = control.getCurrentValue(el);
                    if (currentValue !== null && currentValue !== undefined) {
                        LOG.scan(label, `第 ${attempt + 1} 次读取：元素已找到，currentValue=${String(currentValue)}`);
                        break;
                    }
                    LOG.scan(label, `第 ${attempt + 1} 次读取：元素已找到但状态为 ${currentValue}`);
                } else {
                    LOG.scan(label, `第 ${attempt + 1} 次读取：未找到元素`);
                }
                if (attempt < MAX_RETRIES - 1) {
                    LOG.wait(label, `等待 ${RETRY_DELAY}ms 后重试...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                }
            }

            if (!el || currentValue === null || currentValue === undefined) {
                if (currentPageType === 'home') {
                    LOG.warn(label, '在首页未找到控件元素，可能页面已改版');
                } else {
                    LOG.scan(label, `当前为 ${currentPageType} 页面，控件未出现，跳过`);
                }
                return;
            }

            const isAlready = control.isMatch(el, target);
            if (isAlready) {
                LOG.step(`${label} 4/${totalSteps}`, `页面状态与偏好一致（${String(currentValue)}），无需点击`);
            } else {
                LOG.step(`${label} 4/${totalSteps}`, `执行点击：${String(currentValue)} → ${target}`);
                LOG.action(label, `调用 control.action(${target})`);
                try {
                    await control.action(target, el);
                } catch (err) {
                    LOG.fail(label, `action 抛异常：${err && err.message}`);
                    return;
                }
                LOG.wait(label, '点击已完成，等待 300ms 后进行金标准验证...');
                await new Promise(r => setTimeout(r, 300));
            }

            LOG.step(`${label} 5/${totalSteps}`, '金标准验证');
            let result;
            try {
                result = control.verify(target);
            } catch (err) {
                LOG.fail(label, `verify 抛异常：${err && err.message}`);
                return;
            }
            if (result && Array.isArray(result.details)) {
                result.details.forEach(d => {
                    LOG.scan(label, `${d.name}: ${d.ok ? '✅' : '❌'} (${d.value})`);
                });
            }
            if (result && result.ok) {
                LOG.ok(label, `切换成功，金标准验证通过：${target}`);
            } else {
                LOG.fail(label, '金标准验证未通过，等待下次触发重试');
            }
        }

        function scanAll(reason) {
            const type = identifyPage();
            if (type !== currentPageType) {
                LOG.scheduler(`感知页面切换：${currentPageType} → ${type}`);
                currentPageType = type;
            }
            Scheduler.run(type, reason || '直接调用');
        }

        function runStartupSelfTest() {
            LOG.selftest(`【${siteName}】启动自检开始：版本 V${SCRIPT_VERSION}`);
            LOG.selftest(`location.pathname = ${location.pathname}`);
            LOG.selftest(`识别页面类型：${currentPageType}`);
            LOG.selftest(`已注册控件：${config.controls.map(c => c.id).join(', ')}`);
            const workflow = Scheduler.getWorkflow(currentPageType);
            LOG.selftest(`当前工作流应包含 ${workflow.length} 个控件：${workflow.map(c => c.id).join(', ') || '(空)'}`);
            let missing = 0;
            workflow.forEach(ctrl => {
                let el = null;
                try { el = ctrl.findElement(); } catch (e) {}
                if (el) {
                    LOG.selftest(`✅ 控件 [${ctrl.label}] findElement 命中`);
                } else {
                    LOG.selftest(`⚠️ 控件 [${ctrl.label}] findElement 未命中（页面可能尚未渲染完毕）`);
                    missing++;
                }
            });
            if (missing > 0 && currentPageType === 'home') {
                LOG.alert(`【${siteName}】启动自检：${missing}/${workflow.length} 个控件在首页未找到，可能页面改版或加载延迟`);
            } else {
                LOG.selftest(`【${siteName}】启动自检完成：通过`);
            }
            LOG.divider();
        }

        function bootstrap() {
            currentPageType = identifyPage();
            LOG.boot(`【${siteName}】控制器初始化，pathname=${location.pathname}, page=${currentPageType}`);
            Scheduler.run(currentPageType, '启动');
            setTimeout(runStartupSelfTest, 1500);
        }

        if (document.body) bootstrap();
        else document.addEventListener('DOMContentLoaded', bootstrap);

        document.addEventListener('click', function(e) {
            if (!e.isTrusted) return;
            if (hostname.includes('deepseek.com')) {
                const radioGroup = document.querySelector('[role="radiogroup"]');
                if (radioGroup && radioGroup.contains(e.target)) {
                    setTimeout(() => {
                        const ctrl = config.controls.find(c => c.id === 'modelSelect');
                        if (!ctrl) return;
                        const finalValue = ctrl.getCurrentValue();
                        if (finalValue && finalValue !== prefs.deepseekModel) {
                            clearTimeout(scanTimer);
                            updatePreference('deepseekModel', finalValue);
                            LOG.manual(`deepseekModel = ${finalValue}（手动捕获）`);
                        }
                    }, 0);
                }
            }
            config.controls.forEach(ctrl => {
                if (typeof ctrl.manualTrigger === 'function') {
                    try {
                        const newValue = ctrl.manualTrigger(e);
                        if (newValue !== null && newValue !== undefined && newValue !== prefs[ctrl.storageKey]) {
                            clearTimeout(scanTimer);
                            updatePreference(ctrl.storageKey, newValue);
                            LOG.manual(`${ctrl.storageKey} = ${newValue}（手动捕获）`);
                        }
                    } catch (err) { /* ignore */ }
                }
            });
        }, true);

        document.addEventListener('click', e => {
            const target = e.target.closest('div,button,span,svg,a');
            if (!target) return;
            const text = target.textContent.trim();
            if (text !== '开启新对话' && text !== '新对话') return;
            LOG.monitor(`【${siteName}】点击"开启新对话"`);
            setTimeout(() => scanAll('开启新对话(300ms)'), 300);
            setTimeout(() => scanAll('开启新对话(800ms)'), 800);
        }, true);
    }

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 6  侧边栏守护 (防线二 + 动态间距)
     * ══════════════════════════════════════════════════════════════════ */
    function bootSidebarGuardian() {
        const THRESHOLD = 770;
        const PADDING_WIDE = 10;
        const PADDING_NARROW = 30;
        const MAX_FAIL_COUNT = 5;

        let failCount = 0;
        let warned = false;

        function findSidebar() {
            let el = document.querySelector('._189b4a0');
            if (el) return el;
            const candidates = document.querySelectorAll('[class*="scroll"]');
            for (const c of candidates) {
                const style = window.getComputedStyle(c);
                if (style.position === 'fixed' && style.right !== 'auto' && parseInt(style.right) < 100) {
                    return c;
                }
            }
            return null;
        }

        function findChatArea() {
            let el = document.querySelector('._6f2c522');
            if (el) return el;
            const candidates = document.querySelectorAll('[class*="virtual"]');
            for (const c of candidates) {
                if (c.textContent && c.textContent.length > 500) {
                    return c;
                }
            }
            return null;
        }

        function forceShowSidebar() {
            const sidebar = findSidebar();
            if (!sidebar) return;
            sidebar.style.setProperty('display', 'flex', 'important');
            sidebar.style.setProperty('visibility', 'visible', 'important');
            sidebar.style.setProperty('opacity', '1', 'important');
            sidebar.style.setProperty('pointer-events', 'auto', 'important');
        }

        function updateChatPadding() {
            const chat = findChatArea();
            if (!chat) return;
            const padding = window.innerWidth <= THRESHOLD ? PADDING_NARROW : PADDING_WIDE;
            chat.style.setProperty('padding-right', `${padding}px`, 'important');
            chat.style.setProperty('box-sizing', 'border-box', 'important');
        }

        function applyAll() {
            forceShowSidebar();
            updateChatPadding();
        }

        function checkHealth() {
            const sidebar = findSidebar();
            const chat = findChatArea();
            if (!sidebar || !chat) {
                failCount++;
                if (failCount >= MAX_FAIL_COUNT && !warned) {
                    warned = true;
                    console.warn('[侧边栏守护] ⚠️ 连续多次未找到侧边栏或聊天区，可能页面已改版。');
                }
            } else {
                failCount = 0;
            }
        }

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(applyAll, 50);
        });

        let observerTimer;
        const bodyObserver = new MutationObserver(() => {
            clearTimeout(observerTimer);
            observerTimer = setTimeout(() => {
                applyAll();
                checkHealth();
            }, 200);
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('load', () => {
            setTimeout(() => {
                applyAll();
                checkHealth();
            }, 500);
        });
        if (document.readyState === 'complete') {
            setTimeout(() => {
                applyAll();
                checkHealth();
            }, 500);
        }

        window.__DS_DEBUG__ = false;
        console.log('[守护] v2.5 (已合并至全家桶) 已就绪。调试模式: window.__DS_DEBUG__ = true');
    }

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 7  Usage 监控 (千分位 + 悬浮窗)
     *                         V8.6 原样逻辑，偏好已迁移
     * ══════════════════════════════════════════════════════════════════ */
    function bootUsageMonitor() {
        const currentPrefs = loadPrefs();
        const masterSwitch = currentPrefs.usageMasterSwitch;
        const displayMode = currentPrefs.usageDisplayMode;

        const formatNumber = s => String(s).trim().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        function shouldExclude(node) {
            const p = node.parentElement;
            if (!p) return true;
            const tag = p.tagName.toLowerCase();
            if (['script','style','input','textarea','code','pre','kbd','samp'].includes(tag)) return true;
            if (p.isContentEditable || p.closest('[contenteditable="true"]')) return true;
            if (p.closest('[data-ai-expert-skip]')) return true;
            return false;
        }

        const TOKEN_DATA = { models: [], lastUpdateTime: null };

        function processTokenData(jsonData) {
            try {
                const totalArray = jsonData?.data?.biz_data?.total;
                if (Array.isArray(totalArray)) {
                    TOKEN_DATA.models = totalArray.map(model => ({
                        name: model.model,
                        cacheHit: parseInt(model.usage?.find(u => u.type === 'PROMPT_CACHE_HIT_TOKEN')?.amount || '0'),
                        cacheMiss: parseInt(model.usage?.find(u => u.type === 'PROMPT_CACHE_MISS_TOKEN')?.amount || '0'),
                        output: parseInt(model.usage?.find(u => u.type === 'RESPONSE_TOKEN')?.amount || '0'),
                        total: 0,
                        hitRate: 0,
                        outputRate: 0
                    })).filter(m => m.cacheHit > 0 || m.cacheMiss > 0 || m.output > 0);

                    TOKEN_DATA.models.forEach(m => {
                        m.total = m.cacheHit + m.cacheMiss;
                        m.hitRate = m.total > 0 ? (m.cacheHit / m.total * 100).toFixed(2) : 0;
                        m.outputRate = m.total > 0 ? (m.output / m.total * 100).toFixed(2) : 0;
                    });

                    TOKEN_DATA.lastUpdateTime = Date.now();
                    updateFloatContent();
                }
            } catch (e) {
                console.error('❌ [API拦截] 解析数据失败：', e);
            }
        }

        function installDataInterceptor() {
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                this._url = url;
                return originalXHROpen.call(this, method, url, ...rest);
            };

            XMLHttpRequest.prototype.send = function (...args) {
                this.addEventListener('load', function () {
                    if (this._url && this._url.includes('/api/v0/usage/amount')) {
                        try {
                            const data = JSON.parse(this.responseText);
                            processTokenData(data);
                        } catch (e) {
                            console.error('❌ [XHR拦截] 解析响应失败：', e);
                        }
                    }
                });
                return originalXHRSend.apply(this, args);
            };

            const originalFetch = window.fetch;
            window.fetch = function (...args) {
                const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
                return originalFetch.apply(this, args).then(response => {
                    if (url && url.includes('/api/v0/usage/amount')) {
                        const clonedResponse = response.clone();
                        clonedResponse.json().then(data => {
                            processTokenData(data);
                        }).catch(() => {});
                    }
                    return response;
                });
            };
        }

        let formatObserver = null;
        function processTextNode(textNode) {
            if (shouldExclude(textNode)) return false;
            const originalText = textNode.textContent;
            if (!originalText || originalText.trim().length === 0) return false;
            const regex = /\b(?!19\d{2}\b|20\d{2}\b)(\d{4,})\b/g;
            if (!regex.test(originalText)) return false;
            regex.lastIndex = 0;
            const newText = originalText.replace(regex, match => formatNumber(match));
            if (newText !== originalText) {
                textNode.textContent = newText;
                return true;
            }
            return false;
        }
        function processAddedNodes(root) {
            if (root.nodeType === Node.TEXT_NODE) return processTextNode(root) ? 1 : 0;
            let count = 0;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: node => shouldExclude(node) || !node.textContent?.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
            });
            while (walker.nextNode()) if (processTextNode(walker.currentNode)) count++;
            return count;
        }
        function enableFormatting() {
            if (formatObserver) return;
            processAddedNodes(document.body);
            formatObserver = new MutationObserver(mutations => {
                for (const m of mutations) {
                    if (m.type === 'childList') for (const n of m.addedNodes) processAddedNodes(n);
                    else if (m.type === 'characterData') processTextNode(m.target);
                }
            });
            formatObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
        function disableFormatting() {
            if (formatObserver) { formatObserver.disconnect(); formatObserver = null; }
        }

        let floatWin = null, isDragging = false, sx, sy, sl, st;
        let currentMode = displayMode;

        function createFloatWindow() {
            if (floatWin) return;
            GM_addStyle(`
                .ai-expert-float { position:fixed; z-index:999999; background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.15); border-radius:12px; font-family:system-ui, -apple-system, sans-serif; overflow:hidden; user-select:none; }
                .ai-expert-float.simple-mode { width:200px; }
                .ai-expert-float.full-mode { width:280px; }
                .ai-expert-header { display:flex; align-items:center; justify-content:center; padding:8px 12px; background:#f0f4ff; cursor:move; border-bottom:1px solid #e2e8f0; text-align:center; }
                .ai-expert-header .title { font-weight:600; color:#1e293b; font-size:12px; flex:1; }
                .ai-expert-header .actions { display:flex; gap:4px; }
                .ai-expert-header .actions button { background:none; border:none; font-size:14px; cursor:pointer; color:#64748b; padding:2px 4px; border-radius:4px; transition:background 0.15s; }
                .ai-expert-header .actions button:hover { background:#e2e8f0; }
                .ai-expert-header .actions button.active { color:#2563eb; background:#dbeafe; }
                .ai-expert-body { padding:10px 12px; font-size:12px; color:#334155; }
                .ai-expert-body .model-item { margin-bottom:14px; padding-bottom:14px; border-bottom:1px dashed #e2e8f0; }
                .ai-expert-body .model-item:last-child { border-bottom:none; margin-bottom:0; padding-bottom:0; }
                .ai-expert-body .model-name { font-size:11px; color:#64748b; margin-bottom:6px; text-align:center; word-break:break-all; }
                .ai-expert-body .hit-rate { font-size:28px; font-weight:700; color:#0f172a; margin:4px 0 10px; text-align:center; }
                .ai-expert-body .detail { font-size:11px; color:#64748b; line-height:1.6; text-align:center; }
                .ai-expert-body .detail span { font-weight:500; color:#334155; }
                .full-mode .two-col { display:flex; gap:16px; justify-content:space-between; }
                .full-mode .two-col .col { flex:1; }
                .full-mode .two-col .row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px; font-size:12px; }
                .full-mode .two-col .row .label { color:#64748b; white-space:nowrap; }
                .full-mode .two-col .row .value { font-weight:600; color:#1e293b; text-align:right; font-variant-numeric:tabular-nums; margin-left:8px; }
                .dotted-sep { border-top:1px dashed #e2e8f0; margin:8px 0; }
                .full-mode .total-row { text-align:center; margin-top:8px; padding-top:8px; border-top:1px dashed #e2e8f0; font-size:13px; font-weight:600; color:#1e293b; }
                .ai-expert-body .loading { font-style:italic; color:#94a3b8; text-align:center; padding:15px 0; }
            `);

            floatWin = document.createElement('div');
            floatWin.className = 'ai-expert-float';
            floatWin.setAttribute('data-ai-expert-skip', 'true');
            floatWin.innerHTML = `
                <div class="ai-expert-header" id="drag-handle">
                    <span class="title">📊 Token 缓存率</span>
                    <div class="actions">
                        <button id="full-btn" title="完整视图">📋</button>
                        <button id="simple-btn" title="简约视图">🎯</button>
                    </div>
                </div>
                <div class="ai-expert-body" id="float-body">
                    <div class="loading">等待数据...</div>
                </div>
            `;
            document.body.appendChild(floatWin);
            floatWin.style.right = '20px'; floatWin.style.bottom = '20px';

            const header = floatWin.querySelector('#drag-handle');
            header.addEventListener('mousedown', e => {
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true; sx = e.clientX; sy = e.clientY;
                const r = floatWin.getBoundingClientRect(); sl = r.left; st = r.top;
                floatWin.style.right = 'auto'; floatWin.style.bottom = 'auto';
                floatWin.style.left = sl+'px'; floatWin.style.top = st+'px';
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!isDragging) return;
                floatWin.style.left = (sl + e.clientX - sx)+'px';
                floatWin.style.top = (st + e.clientY - sy)+'px';
            });
            document.addEventListener('mouseup', () => { isDragging = false; });

            floatWin.querySelector('#simple-btn').addEventListener('click', () => setDisplayMode('simple'));
            floatWin.querySelector('#full-btn').addEventListener('click', () => setDisplayMode('full'));

            updateModeButtons();
        }

        function updateModeButtons() {
            if (!floatWin) return;
            const simpleBtn = floatWin.querySelector('#simple-btn');
            const fullBtn = floatWin.querySelector('#full-btn');
            if (!simpleBtn || !fullBtn) return;
            simpleBtn.classList.toggle('active', currentMode === 'simple');
            fullBtn.classList.toggle('active', currentMode === 'full');
        }

        function setDisplayMode(mode) {
            currentMode = mode;
            savePref('usageDisplayMode', mode);
            if (!floatWin) return;
            floatWin.classList.remove('simple-mode', 'full-mode');
            floatWin.classList.add(mode === 'simple' ? 'simple-mode' : 'full-mode');
            updateModeButtons();
            updateFloatContent();
        }

        function updateFloatContent() {
            const body = document.getElementById('float-body');
            if (!body) return;
            if (TOKEN_DATA.models.length === 0) {
                body.innerHTML = '<div class="loading">⏳ 等待 API 数据...</div>';
                return;
            }

            if (currentMode === 'simple') {
                let html = '';
                TOKEN_DATA.models.forEach(m => {
                    html += `<div class="model-item"><div class="model-name">${m.name}</div><div class="hit-rate">${m.hitRate}%</div><div class="detail">✅ <span>${formatNumber(m.cacheHit+'')}</span> &nbsp; ⚡ <span>${formatNumber(m.cacheMiss+'')}</span></div></div>`;
                });
                body.innerHTML = html;
            } else {
                let html = '';
                TOKEN_DATA.models.forEach(m => {
                    html += `<div class="model-item"><div class="model-name">${m.name}</div><div class="hit-rate">${m.hitRate}%</div><div class="dotted-sep"></div>
                    <div class="two-col"><div class="col"><div class="row"><span class="label">✅ 命中</span><span class="value">${formatNumber(m.cacheHit)}</span></div><div class="row"><span class="label">⚡ 未命中</span><span class="value">${formatNumber(m.cacheMiss)}</span></div></div>
                    <div class="col"><div class="row"><span class="label">📤 输出</span><span class="value">${formatNumber(m.output)}</span></div><div class="row"><span class="label">📊 输出占比</span><span class="value">${m.outputRate}%</span></div></div></div>
                    <div class="total-row">🔢 总计 ${formatNumber(m.total)}</div></div>`;
                });
                body.innerHTML = html;
            }
        }

        function enableFloatWindow() {
            createFloatWindow();
            floatWin.style.display = 'block';
            setDisplayMode(currentMode);
        }

        function disableFloatWindow() {
            if (floatWin) floatWin.style.display = 'none';
        }

        function applyMasterSwitch(on) {
            if (on) {
                enableFormatting();
                enableFloatWindow();
            } else {
                disableFormatting();
                disableFloatWindow();
            }
        }

        const usageMenuIds = [];
        function registerUsageMenus() {
            usageMenuIds.forEach(id => { try { GM_unregisterMenuCommand(id); } catch(e) {} });
            usageMenuIds.length = 0;

            const currentMaster = loadPrefs().usageMasterSwitch;
            usageMenuIds.push(GM_registerMenuCommand(`📊 完整功能: ${currentMaster ? '关闭' : '开启'}`, () => {
                const newState = !loadPrefs().usageMasterSwitch;
                savePref('usageMasterSwitch', newState);
                applyMasterSwitch(newState);
                registerUsageMenus();
            }));

            const currentDispMode = loadPrefs().usageDisplayMode;
            usageMenuIds.push(GM_registerMenuCommand(`📋 视图: ${currentDispMode === 'full' ? '完整' : '简约'}`, () => {
                const newMode = currentDispMode === 'full' ? 'simple' : 'full';
                setDisplayMode(newMode);
                registerUsageMenus();
            }));
        }

        installDataInterceptor();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                applyMasterSwitch(masterSwitch);
                startupSelfCheck();
                registerUsageMenus();
            });
        } else {
            applyMasterSwitch(masterSwitch);
            startupSelfCheck();
            registerUsageMenus();
        }

        function startupSelfCheck() {
            setTimeout(() => {
                if (TOKEN_DATA.models.length === 0) {
                    console.warn('🚨 [Usage监控] 启动 1.5 秒后仍未接收到 API 数据。请检查网络或拦截器。');
                }
            }, 1500);
        }
    }

    /* ════════════════════════════════════════════════════════════════════
     *                         模块 8  站点路由器
     * ══════════════════════════════════════════════════════════════════ */
    const hostname = location.hostname;
    const pathname = location.pathname;

    LOG.boot(`全家桶启动 V${SCRIPT_VERSION}, hostname=${hostname}, pathname=${pathname}`);

    if (hostname.includes('doubao.com')) {
        const cfg = siteConfigs['doubao.com'];
        if (cfg.blockedHosts?.length) installTelemetryBlocker(cfg.blockedHosts);
        createSiteController(hostname, cfg);
    }
    else if (hostname === 'chat.deepseek.com') {
        const cfg = siteConfigs['chat.deepseek.com'];
        installTelemetryBlocker(cfg.blockedHosts);
        createSiteController(hostname, cfg);
        bootSidebarGuardian();
    }
    else if (hostname === 'platform.deepseek.com' && pathname.startsWith('/usage')) {
        bootUsageMonitor();
    }
    else {
        LOG.alert(`全家桶已加载，但当前页面无任何模块匹配：${hostname}${pathname}`);
    }

})();