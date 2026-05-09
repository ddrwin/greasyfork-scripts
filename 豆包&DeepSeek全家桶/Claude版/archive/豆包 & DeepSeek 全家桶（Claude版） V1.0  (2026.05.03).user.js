// ==UserScript==
// @name         豆包 & DeepSeek 全家桶 (Claude)
// @namespace    https://github.com/ddrwin/ai-auto-expert-fullsuite
// @version      1.0
// @description  合并三脚本：自动专家(V4.0) + DeepSeek侧边栏守护(v2.5) + Usage千分位&缓存命中率(V8.6)。站点路由器架构，统一偏好命名空间，行为等价合并。
// @icon         https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/chat/favicon.png
// @author       ddrwin
// @match        *://*.doubao.com/*
// @match        *://chat.deepseek.com/*
// @match        *://platform.deepseek.com/usage*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @note         2026.05.03 V1.0 合并自 V4.0(自动专家主程序) + v2.5(侧边栏永恒守护) + V8.6(Usage千分位&悬浮窗)。行为等价合并，未做项目卡§5的偏好解耦优化（留待V1.1专项处理）。
// ==/UserScript==

(function() {
    'use strict';

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 0 / 基础工具与日志（地震仪）
     * 「地震仪」与程序物理隔离：日志函数是纯函数，不修改任何外部状态。
     * 所有控件、所有阶段、所有等待都必须有日志输出，无死角。
     * ══════════════════════════════════════════════════════════════════════ */

    const SCRIPT_START = performance.now();
    const SCRIPT_VERSION = '1.0';
    const SCRIPT_NAME = 'ai-auto-expert-fullsuite';

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

    // 控件色系：每个控件固定一种主色调，保证日志可视化辨识度
    const COLORS = {
        '模型切换':  { main: '#1e6fff', light: '#85b3ff', dark: '#0a4db8' }, // 蓝
        '深度思考':  { main: '#389e0d', light: '#95de64', dark: '#1f6100' }, // 绿
        '智能搜索':  { main: '#722ed1', light: '#b37feb', dark: '#3c108a' }, // 紫
        '豆包模型':  { main: '#fa8c16', light: '#ffc069', dark: '#ad4e00' }, // 橙
        '侧边栏守护':{ main: '#13c2c2', light: '#87e8de', dark: '#006d75' }, // 青
        'Usage监控': { main: '#eb2f96', light: '#ffadd2', dark: '#9e1068' }  // 玫红
    };
    function getColor(label) { return COLORS[label.split(' ')[0]] || COLORS['模型切换']; }

    const TEXT_COLOR  = '#1a1a1a';
    const LABEL_COLOR = '#ffffff';

    const LOG = {
        // ——— 监控/调度/预警/启动：固定色 ———
        boot(msg)    { console.log(`${ts()} %c🛠️ [启动] %c${msg}`, `color:${LABEL_COLOR};background:#13c2c2;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        monitor(msg) { console.log(`${ts()} %c🟢 [监控] %c${msg}`, `color:${LABEL_COLOR};background:#1e6fff;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        scheduler(msg){console.log(`${ts()} %c⚙️ [调度中心] %c${msg}`, `color:${LABEL_COLOR};background:#2c3e50;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        selftest(msg){ console.log(`${ts()} %c🔬 [自检] %c${msg}`, `color:${LABEL_COLOR};background:#08979c;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        manual(msg)  { console.log(`${ts()} %c👆 [手动] %c${msg}`, `color:${LABEL_COLOR};background:#722ed1;padding:1px 4px;border-radius:2px`, `color:${TEXT_COLOR}`); },
        alert(msg)   { console.warn(`${ts()} %c🚨 [预警] %c${msg}`, `color:${LABEL_COLOR};background:#cf1322;padding:1px 4px;border-radius:2px`, `color:#cf1322;font-weight:bold`); },
        // ——— 控件相关：根据 label 取色 ———
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

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 1 / 统一偏好管理
     * 命名空间：ai_assistant_prefs_v2（全脚本共用一个键）。
     * 包含字段：
     *   自动专家      : doubaoModel, deepseekModel, deepseekDeepThink, deepseekSmartSearch
     *   Usage 监控    : usageMasterSwitch, usageDisplayMode
     * 兼容迁移：
     *   旧键 'master_switch' / 'display_mode'（来自原 V8.6 Token 脚本）
     *   旧字段 deepseekExpert (boolean) / deepseekModel === 'fast'
     * ══════════════════════════════════════════════════════════════════════ */
    const PREF_KEY = 'ai_assistant_prefs_v2';
    const defaultPrefs = Object.freeze({
        // 自动专家（V4.0 原字段）
        doubaoModel: '思考',
        deepseekModel: 'expert',
        deepseekDeepThink: true,
        deepseekSmartSearch: false,
        // Usage 监控（从 V8.6 迁移，保持其原 master_switch 一布尔同时控制千分位+悬浮窗的语义）
        usageMasterSwitch: true,
        usageDisplayMode: 'full'  // 'simple' | 'full'
    });

    function loadPrefs() {
        const saved = GM_getValue(PREF_KEY, {});

        // —— 兼容迁移 1：V4.0 内部字段 ——
        if (typeof saved.deepseekExpert === 'boolean' && !saved.deepseekModel) {
            saved.deepseekModel = saved.deepseekExpert ? 'expert' : 'default';
            delete saved.deepseekExpert;
            GM_setValue(PREF_KEY, saved);
        }
        if (saved.deepseekModel === 'fast') {
            saved.deepseekModel = 'default';
            GM_setValue(PREF_KEY, saved);
        }

        // —— 兼容迁移 2：从原 V8.6 的裸 GM 键迁移到统一命名空间 ——
        // 仅在新字段未设置时才迁移，避免覆盖用户在新版上做过的修改
        let migrated = false;
        const oldMaster = GM_getValue('master_switch', undefined);
        const oldMode   = GM_getValue('display_mode', undefined);
        if (oldMaster !== undefined && saved.usageMasterSwitch === undefined) {
            saved.usageMasterSwitch = oldMaster;
            migrated = true;
            console.log(`[${SCRIPT_NAME}] 偏好迁移：master_switch=${oldMaster} → usageMasterSwitch`);
        }
        if (oldMode !== undefined && saved.usageDisplayMode === undefined) {
            saved.usageDisplayMode = oldMode;
            migrated = true;
            console.log(`[${SCRIPT_NAME}] 偏好迁移：display_mode=${oldMode} → usageDisplayMode`);
        }
        if (migrated) GM_setValue(PREF_KEY, saved);

        return { ...defaultPrefs, ...saved };
    }
    function savePref(key, value) {
        const prefs = loadPrefs();
        prefs[key] = value;
        GM_setValue(PREF_KEY, prefs);
    }

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 2 / 遥测拦截
     * 在 document-start 拦截 fetch / XHR，匹配黑名单的请求直接阻断。
     * 仅在自动专家域名下启用（豆包 / chat.deepseek.com）；
     * Usage 监控页（platform.deepseek.com/usage）需要让 amount 接口正常通过，
     * 故在路由器中只对前两个域名调用此函数。
     * ══════════════════════════════════════════════════════════════════════ */
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

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 3 / 站点配置（声明式）— 自动专家
     * 每站点一份配置：样式、遥测黑名单、控件数组、对话页路径判定。
     * 控件四要素：findElement、getCurrentValue、isMatch、action、verify（金标准）。
     * 控件元数据：id、storageKey、label、appliesTo、steps、manualTrigger。
     * 注：豆包模型控件 appliesTo 设为 ['home','conversation']，因为豆包对话页
     *    的输入区也带模型按钮；交由 findElement 的存在性兜底判断。
     * ══════════════════════════════════════════════════════════════════════ */
    const siteConfigs = {
        'doubao.com': {
            siteName: '豆包',
            // 样式：完整保留 V4.0 的视觉调整（重构纪律：禁止占位符，逐字节迁移）
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
            // 豆包对话页路径模式（用于页面识别 + 路由切换日志）
            conversationPathTest: (p) => p.startsWith('/chat/') && p.length > 6 && !/^\/chat\/?$/.test(p),
            controls: [{
                id: 'doubaoModel',
                storageKey: 'doubaoModel',
                label: '豆包模型',
                steps: 5,
                // 关键修复：豆包模型按钮在首页和对话页都可能出现；
                // 由 findElement 的存在性兜底，appliesTo 不收紧。
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
                    // 等待菜单出现（最多 2s）
                    for (let i = 0; i < 10; i++) {
                        if (document.querySelector('[role="menu"] [role="menuitem"]')) break;
                        await new Promise(r => setTimeout(r, 200));
                    }
                    if (!document.querySelector('[role="menu"] [role="menuitem"]')) {
                        // 菜单没出来：再点一次兜底
                        simulateClick(btn);
                        await new Promise(r => setTimeout(r, 500));
                    }
                    const items = document.querySelectorAll('[role="menu"] [role="menuitem"]');
                    const target = Array.from(items).find(it => it.textContent.includes(pref));
                    if (target) simulateClick(target);
                    else simulateClick(btn); // 兜底：把已打开的菜单关掉，避免UI卡住
                },
                // 豆包独立金标准：文字匹配 + data-checked='true'（参考 V3.33）
                verify: (target) => {
                    const btns = document.querySelectorAll('button[aria-haspopup="menu"]');
                    const btn = Array.from(btns).find(b => ['快速','思考','专家'].some(m => b.textContent.includes(m)));
                    if (!btn) return { ok: false, details: [{ name: '按钮存在', ok: false, value: 'null' }] };
                    const txt = btn.textContent.trim();
                    const textOk = txt.includes(target);
                    const dc = btn.getAttribute('data-checked');
                    // data-checked 在豆包按钮上不一定每次都是 true（可能是子元素带），所以仅作辅助标识
                    const dcOk = (dc === 'true') || (btn.querySelector('[data-checked="true"]') !== null);
                    return {
                        ok: textOk, // 主判据：可见即所得
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
                    appliesTo: ['home'], // DeepSeek 模型选择器仅首页存在
                    findElement: () => document.querySelector('div[data-model-type="expert"], div[data-model-type="default"]'),
                    getCurrentValue: () => {
                        const expert = document.querySelector('div[data-model-type="expert"]');
                        if (expert && expert.getAttribute('aria-checked') === 'true') return 'expert';
                        const def = document.querySelector('div[data-model-type="default"]');
                        if (def && def.getAttribute('aria-checked') === 'true') return 'default';
                        return null;
                    },
                    isMatch: () => false, // 不走 isMatch 早退路径
                    action: async (pref) => {
                        const targetEl = document.querySelector(`div[data-model-type="${pref}"]`);
                        if (targetEl && targetEl.getAttribute('aria-checked') !== 'true') {
                            targetEl.click();
                        }
                    },
                    // DeepSeek 三重金标准：aria-checked + class + 父容器索引（V3.33 已稳定，原样保留）
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

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 4 / 站点控制器（自动专家）
     * 4.0 页面识别（identifyPage）
     * 4.1 动态菜单
     * 4.2 调度中心：Scheduler.run
     * 4.3 路由感知：MutationObserver + pathname 比对
     * 4.4 单控件执行器：applyControl
     * 4.5 启动自检
     * 4.6 手动捕获
     * 4.7 新对话按钮监听
     * ══════════════════════════════════════════════════════════════════════ */
    function createSiteController(hostname, config) {
        if (config.styles) GM_addStyle(config.styles);
        const prefs = loadPrefs();
        const siteName = config.siteName;

        // ----- 4.0 页面识别（URL → 'home' / 'conversation'）-----
        const isConversationPage = () => {
            try { return config.conversationPathTest(location.pathname); }
            catch (e) { return false; }
        };
        function identifyPage() {
            if (isConversationPage()) return 'conversation';
            // 首页定义：非对话页 = 首页（宽松判定，避免新URL格式被误判为unknown而漏跑）
            // 这是从 V3.20 沿用的实践经验：识别失败时，宽容地走 home 工作流
            return 'home';
        }

        let lastPathname = location.pathname;
        let currentPageType = null;
        let scanTimer = null;

        // ----- 4.1 动态菜单 -----
        let menuIds = [];
        function unregisterAllMenus() {
            menuIds.forEach(id => { try { GM_unregisterMenuCommand(id); } catch(e) {} });
            menuIds = [];
        }
        function refreshMenus() {
            unregisterAllMenus();
            const p = prefs;
            if (hostname.includes('doubao.com')) {
                menuIds.push(GM_registerMenuCommand(`🌱 思考模式${p.doubaoModel === '思考' ? ' [当前]' : ''}`, () => { updatePreference('doubaoModel', '思考'); scanAll(); }));
                menuIds.push(GM_registerMenuCommand(`🚀 专家模式${p.doubaoModel === '专家' ? ' [当前]' : ''}`, () => { updatePreference('doubaoModel', '专家'); scanAll(); }));
            } else if (hostname.includes('deepseek.com')) {
                menuIds.push(GM_registerMenuCommand(`🚀 专家模型${p.deepseekModel === 'expert' ? ' [当前]' : ''}`, () => { updatePreference('deepseekModel', 'expert'); scanAll(); }));
                menuIds.push(GM_registerMenuCommand(`⚡ 快速模型${p.deepseekModel === 'default' ? ' [当前]' : ''}`, () => { updatePreference('deepseekModel', 'default'); scanAll(); }));
                menuIds.push(GM_registerMenuCommand(`🧠 深度思考 [${p.deepseekDeepThink ? '已开启' : '已关闭'}]`, () => { updatePreference('deepseekDeepThink', !p.deepseekDeepThink); scanAll(); }));
                menuIds.push(GM_registerMenuCommand(`🔍 智能搜索 [${p.deepseekSmartSearch ? '已开启' : '已关闭'}]`, () => { updatePreference('deepseekSmartSearch', !p.deepseekSmartSearch); scanAll(); }));
            }
        }
        function updatePreference(key, value) {
            savePref(key, value);
            prefs[key] = value;
            refreshMenus();
        }
        refreshMenus();

        // ----- 4.2 调度中心 -----
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
                    LOG.alert(`【${siteName}】page="${pageType}" 工作流为空：检查 appliesTo 是否覆盖该页面类型。`);
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

        // ----- 4.3 全局感知（MutationObserver + 路由变化）-----
        function observeRouteChange() {
            const newPath = location.pathname;
            if (newPath === lastPathname) return;

            const prevType = currentPageType;
            const newType = identifyPage();
            const prevIsConv = config.conversationPathTest(lastPathname);
            const currIsConv = config.conversationPathTest(newPath);

            if (!prevIsConv && currIsConv) {
                LOG.monitor(`【${siteName}】进入对话页，路径: ${newPath}`);
            } else if (prevIsConv && !currIsConv) {
                LOG.monitor(`【${siteName}】从对话页切回首页，路径: ${newPath}`);
            } else if (prevIsConv && currIsConv) {
                LOG.monitor(`【${siteName}】对话页之间切换：${lastPathname} → ${newPath}`);
            } else {
                LOG.monitor(`【${siteName}】首页内路径变化：${lastPathname} → ${newPath}`);
            }

            lastPathname = newPath;

            if (newType !== prevType) {
                LOG.scheduler(`感知页面切换：${prevType} → ${newType}`);
                currentPageType = newType;
                Scheduler.run(newType, `页面切换:${prevType}→${newType}`);
            } else {
                // 同类型路由变化（如对话页之间切换），延迟扫一遍以兜底
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

        // ----- 4.4 单控件执行器 -----
        async function applyControl(control) {
            const label = control.label || control.id;
            const totalSteps = control.steps || 5;
            const MAX_RETRIES = 4;
            const RETRY_DELAY = 200;
            const target = prefs[control.storageKey];

            // 步骤 1：环境检查
            LOG.step(`${label} 1/${totalSteps}`, `环境检查：site=${siteName}, page=${currentPageType}`);

            // 步骤 2：配置读取
            LOG.step(`${label} 2/${totalSteps}`, `配置读取：偏好为 ${target}`);

            // 步骤 3：增强重试，定位元素 + 读取当前状态
            LOG.step(`${label} 3/${totalSteps}`, `增强重试读取页面状态（最多 ${MAX_RETRIES} 次）`);
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
                    LOG.scan(label, `第 ${attempt + 1} 次读取：元素已找到但状态为 ${currentValue}（页面可能尚未就绪）`);
                } else {
                    LOG.scan(label, `第 ${attempt + 1} 次读取：未找到元素`);
                }
                if (attempt < MAX_RETRIES - 1) {
                    LOG.wait(label, `等待 ${RETRY_DELAY}ms 后重试...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                }
            }

            // 元素未就绪：判断是「不适用页面」还是「页面改版」
            if (!el || currentValue === null || currentValue === undefined) {
                // 启发式：在对话页未找到模型选择器是正常的；在首页未找到则是改版预警
                if (currentPageType === 'home') {
                    LOG.warn(label, '在首页未找到控件元素，可能页面已改版（页面改版预警）');
                } else {
                    LOG.scan(label, `当前为 ${currentPageType} 页面，控件未出现，跳过本次执行`);
                }
                return;
            }

            // 步骤 4：判断 + 行动（与偏好一致则跳过点击）
            // 注意：此处比较使用宽松等价（豆包是字符串、DeepSeek toggle 是布尔，DS 模型是字符串）
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

            // 步骤 5：金标准验证（站点独立 verify 函数）
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

        // ----- 4.5 统一扫描入口 + 启动自检 -----
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

            // 探测每个控件的元素是否能找到
            let missing = 0;
            workflow.forEach(ctrl => {
                let el = null;
                try { el = ctrl.findElement(); } catch (e) {}
                if (el) {
                    LOG.selftest(`✅ 控件 [${ctrl.label}] findElement 命中`);
                } else {
                    LOG.selftest(`⚠️ 控件 [${ctrl.label}] findElement 未命中（页面可能尚未渲染完毕，将在 MutationObserver 触发后重试）`);
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

        // 启动入口：DOM 就绪即扫描，1.5s 后做一次自检
        function bootstrap() {
            currentPageType = identifyPage();
            LOG.boot(`【${siteName}】控制器初始化，pathname=${location.pathname}, page=${currentPageType}`);
            Scheduler.run(currentPageType, '启动');
            setTimeout(runStartupSelfTest, 1500);
        }

        if (document.body) bootstrap();
        else document.addEventListener('DOMContentLoaded', bootstrap);

        // ----- 4.6 手动偏好捕获（网页按钮 → 偏好 + 菜单）-----
        document.addEventListener('click', function(e) {
            if (!e.isTrusted) return;

            // DeepSeek 模型选择器：radiogroup 范围内的点击都视为模型切换
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

            // 通用：每个控件的 manualTrigger
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

        // ----- 4.7 新对话按钮监听 -----
        document.addEventListener('click', e => {
            const target = e.target.closest('div,button,span,svg,a');
            if (!target) return;
            const text = target.textContent.trim();
            if (text !== '开启新对话' && text !== '新对话') return;

            const hasButtonClass     = target.classList.contains('_5a8ac7a') && target.classList.contains('a084f19e');
            const hasParentClass     = target.parentElement?.classList.contains('b8812f16');
            const hasGrandparentClass= target.parentElement?.parentElement?.classList.contains('dc04ec1d');

            if (hasButtonClass)            LOG.monitor(`【${siteName}】点击"开启新对话"（文字+class 精确匹配）`);
            else if (hasParentClass)       LOG.monitor(`【${siteName}】点击"开启新对话"（文字+父容器 兜底匹配）`);
            else if (hasGrandparentClass)  LOG.monitor(`【${siteName}】点击"开启新对话"（文字+祖父容器 兜底匹配）`);
            else                           LOG.monitor(`【${siteName}】点击"开启新对话"（纯文字 兜底匹配 — 页面可能已改版）`);

            LOG.monitor(`【${siteName}】已触发模型恢复流程，等待页面渲染...`);
            setTimeout(() => scanAll('开启新对话(300ms)'), 300);
            setTimeout(() => scanAll('开启新对话(800ms)'), 800);
        }, true);
    }

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 5 / DeepSeek 侧边栏永恒守护
     * 来源：DeepSeek 侧边栏永恒守护 v2.5（行为等价合并，未改任何业务逻辑）
     * 永远开启（按用户决策，不加偏好），仅在 chat.deepseek.com 上激活。
     *
     * 双防线：
     *   防线一：matchMedia 劫持（在 document-start 阶段，路由器之前执行）
     *           → 见 installMatchMediaInterceptor()
     *   防线二：resize 兜底 + 动态间距 + SPA 路由兼容（在 DOM ready 后激活）
     *           → 见 bootSidebarGuardian()
     *
     * 调试开关：window.__DS_DEBUG__ = true（与原 v2.5 兼容）
     * ══════════════════════════════════════════════════════════════════════ */

    // ----- 防线一：matchMedia 劫持 -----
    // 必须在 document-start 阶段执行，确保在 React 首次调用 matchMedia 之前完成
    function installMatchMediaInterceptor() {
        const originalMatchMedia = window.matchMedia.bind(window);
        let interceptCount = 0;

        window.matchMedia = function(query) {
            if (typeof query === 'string') {
                const match = query.match(/max-width\s*:\s*(\d+)px/);
                if (match && parseInt(match[1], 10) <= 1280) {
                    interceptCount++;
                    if (window.__DS_DEBUG__) {
                        console.log(`[侧边栏守护] 拦截查询 #${interceptCount}: ${query}`);
                    }
                    return {
                        matches: false,
                        media: query,
                        onchange: null,
                        addListener: function(cb) { cb(this); },
                        removeListener: function() {},
                        addEventListener: function(type, cb) { if (type === 'change') cb(this); },
                        removeEventListener: function() {},
                        dispatchEvent: function() { return true; }
                    };
                }
            }
            return originalMatchMedia(query);
        };
        LOG.boot('【侧边栏守护】防线一已安装（matchMedia 劫持）');
    }

    // ----- 防线二：resize + 动态间距 + 健康检查 + SPA 兼容 -----
    function bootSidebarGuardian() {
        const THRESHOLD = 770;
        const PADDING_WIDE = 10;
        const PADDING_NARROW = 30;
        const MAX_FAIL_COUNT = 5;

        let failCount = 0;
        let warned = false;

        // ----- 语义化元素查找（支持降级） -----
        function findSidebar() {
            // 优先用已知类名
            let el = document.querySelector('._189b4a0');
            if (el) return el;

            // 降级：查找固定在右侧且包含滚动列表的容器
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
            // 优先用已知类名
            let el = document.querySelector('._6f2c522');
            if (el) return el;

            // 降级：查找包含大量文本内容的主要区域
            const candidates = document.querySelectorAll('[class*="virtual"]');
            for (const c of candidates) {
                if (c.textContent && c.textContent.length > 500) {
                    return c;
                }
            }
            return null;
        }

        // ----- 核心函数 -----
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
                    LOG.warn('侧边栏守护',
                        '⚠️ 连续多次未找到侧边栏或聊天区，可能页面已改版，脚本需要更新。' +
                        ' 请检查选择器是否仍然有效：._189b4a0 / ._6f2c522'
                    );
                }
            } else {
                failCount = 0; // 找到了就重置计数
            }
        }

        // ----- resize 监听 -----
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                applyAll();
                if (window.__DS_DEBUG__) {
                    console.log(`[侧边栏守护] 宽度: ${window.innerWidth}px | 模式: ${window.innerWidth <= THRESHOLD ? '窄屏' : '宽屏'}`);
                }
            }, 50);
        });

        // ----- SPA 路由切换兼容：监视 DOM 变化 -----
        let observerTimer;
        const bodyObserver = new MutationObserver(() => {
            clearTimeout(observerTimer);
            observerTimer = setTimeout(() => {
                applyAll();
                checkHealth();
            }, 200);
        });

        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // ----- 初始化 -----
        window.addEventListener('load', () => {
            setTimeout(() => {
                applyAll();
                checkHealth();
            }, 500);
        });

        // ----- 调试开关 -----
        if (typeof window.__DS_DEBUG__ === 'undefined') {
            window.__DS_DEBUG__ = false;
        }
        LOG.boot(`【侧边栏守护】v2.5 防线二已就绪。调试模式: window.__DS_DEBUG__ = true`);
    }

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 6 / Usage 千分位 + 缓存命中率悬浮窗
     * 来源：DeepSeek Usage Token 千分位 V8.6（行为等价合并）
     *
     * 仅在 platform.deepseek.com/usage 上激活。
     * 偏好键迁移：
     *   master_switch  → usageMasterSwitch（统一命名空间，原一布尔同时控制双功能）
     *   display_mode   → usageDisplayMode
     * ══════════════════════════════════════════════════════════════════════ */
    function bootUsageMonitor() {
        // ===== 6.1 全局状态 =====
        const TOKEN_DATA = {
            models: [],
            lastUpdateTime: null
        };
        let formatObserver = null;
        let floatWin = null, isDragging = false, sx, sy, sl, st;
        let currentMode = 'full';

        // ===== 6.2 工具函数 =====
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

        // ===== 6.3 数据处理 =====
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
                    console.log('🚀 [Usage监控/API拦截] Token 数据已更新：', TOKEN_DATA.models);
                    updateFloatContent();
                }
            } catch (e) {
                console.error('❌ [Usage监控/API拦截] 解析数据失败：', e);
            }
        }

        // ===== 6.4 数据拦截器（fetch + XHR 双通道，铁律 § 9.4）=====
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
                            console.log('📦 [Usage监控/XHR拦截] 捕获 amount 数据：', this._url);
                            processTokenData(data);
                        } catch (e) {
                            console.error('❌ [Usage监控/XHR拦截] 解析响应失败：', e);
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
                            console.log('📦 [Usage监控/fetch拦截] 捕获 amount 数据：', url);
                            processTokenData(data);
                        }).catch(() => {});
                    }
                    return response;
                });
            };

            console.log('✅ [Usage监控/API拦截] XHR + fetch 数据拦截器已就绪');
        }

        // ===== 6.5 千分位格式化 =====
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
            console.log('✅ [Usage监控/格式化] Token 千分位格式化已启用');
        }
        function disableFormatting() {
            if (formatObserver) { formatObserver.disconnect(); formatObserver = null; }
        }

        // ===== 6.6 悬浮窗模块 =====
        function createFloatWindow() {
            if (floatWin) return;

            GM_addStyle(`
                .ai-expert-float {
                    position:fixed;
                    z-index:999999;
                    background:#fff;
                    box-shadow:0 8px 24px rgba(0,0,0,.15);
                    border-radius:12px;
                    font-family:system-ui, -apple-system, sans-serif;
                    overflow:hidden;
                    user-select: none;
                }
                .ai-expert-float.simple-mode {
                    width:200px;
                }
                .ai-expert-float.full-mode {
                    width:280px;
                }
                .ai-expert-header {
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:8px 12px;
                    background:#f0f4ff;
                    cursor:move;
                    border-bottom:1px solid #e2e8f0;
                    text-align:center;
                }
                .ai-expert-header .title {
                    font-weight:600;
                    color:#1e293b;
                    font-size:12px;
                    flex:1;
                }
                .ai-expert-header .actions {
                    display: flex;
                    gap: 4px;
                }
                .ai-expert-header .actions button {
                    background:none;
                    border:none;
                    font-size:14px;
                    cursor:pointer;
                    color:#64748b;
                    padding: 2px 4px;
                    border-radius: 4px;
                    transition: background 0.15s;
                }
                .ai-expert-header .actions button:hover {
                    background: #e2e8f0;
                }
                .ai-expert-header .actions button.active {
                    color: #2563eb;
                    background: #dbeafe;
                }
                .ai-expert-body {
                    padding:10px 12px;
                    font-size:12px;
                    color:#334155;
                }
                .ai-expert-body .model-item {
                    margin-bottom:14px;
                    padding-bottom:14px;
                    border-bottom:1px dashed #e2e8f0;
                }
                .ai-expert-body .model-item:last-child {
                    border-bottom:none;
                    margin-bottom:0;
                    padding-bottom:0;
                }
                .ai-expert-body .model-name {
                    font-size:11px;
                    color:#64748b;
                    margin-bottom:6px;
                    text-align:center;
                    word-break:break-all;
                }
                .ai-expert-body .hit-rate {
                    font-size:28px;
                    font-weight:700;
                    color:#0f172a;
                    margin:4px 0 10px;
                    text-align:center;
                }
                .ai-expert-body .detail {
                    font-size:11px;
                    color:#64748b;
                    line-height:1.6;
                    text-align:center;
                }
                .ai-expert-body .detail span {
                    font-weight:500;
                    color:#334155;
                }
                /* 完整模式两列布局 */
                .full-mode .two-col {
                    display: flex;
                    gap: 16px;
                    justify-content: space-between;
                }
                .full-mode .two-col .col {
                    flex: 1;
                }
                .full-mode .two-col .row {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                .full-mode .two-col .row .label {
                    color: #64748b;
                    white-space: nowrap;
                }
                .full-mode .two-col .row .value {
                    font-weight: 600;
                    color: #1e293b;
                    text-align: right;
                    font-variant-numeric: tabular-nums;
                    margin-left: 8px;
                }
                .dotted-sep {
                    border-top: 1px dashed #e2e8f0;
                    margin: 8px 0;
                }
                /* 总计行 */
                .full-mode .total-row {
                    text-align: center;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px dashed #e2e8f0;
                    font-size: 13px;
                    font-weight: 600;
                    color: #1e293b;
                }
                .ai-expert-body .loading {
                    font-style:italic;
                    color:#94a3b8;
                    text-align:center;
                    padding:15px 0;
                }
                .ai-expert-minimized .ai-expert-body {
                    display:none;
                }
            `);

            floatWin = document.createElement('div');
            floatWin.className = 'ai-expert-float';
            floatWin.setAttribute('data-ai-expert-skip', 'true');
            // 按钮顺序调换：完整在左，简约在右
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

            // 拖拽
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

            // 模式切换按钮
            floatWin.querySelector('#simple-btn').addEventListener('click', () => setDisplayMode('simple'));
            floatWin.querySelector('#full-btn').addEventListener('click', () => setDisplayMode('full'));

            // 初始化按钮高亮
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
            if (!floatWin) return;
            floatWin.classList.remove('simple-mode', 'full-mode');
            floatWin.classList.add(mode === 'simple' ? 'simple-mode' : 'full-mode');
            updateModeButtons();
            updateFloatContent();
            savePref('usageDisplayMode', mode);
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
                    html += `
                        <div class="model-item">
                            <div class="model-name">${m.name}</div>
                            <div class="hit-rate">${m.hitRate}%</div>
                            <div class="detail">
                                ✅ <span>${formatNumber(m.cacheHit+'')}</span> &nbsp;
                                ⚡ <span>${formatNumber(m.cacheMiss+'')}</span>
                            </div>
                        </div>
                    `;
                });
                body.innerHTML = html;
            } else {
                let html = '';
                TOKEN_DATA.models.forEach(m => {
                    html += `
                        <div class="model-item">
                            <div class="model-name">${m.name}</div>
                            <div class="hit-rate">${m.hitRate}%</div>
                            <div class="dotted-sep"></div>
                            <div class="two-col">
                                <div class="col">
                                    <div class="row">
                                        <span class="label">✅ 命中</span>
                                        <span class="value">${formatNumber(m.cacheHit)}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label">⚡ 未命中</span>
                                        <span class="value">${formatNumber(m.cacheMiss)}</span>
                                    </div>
                                </div>
                                <div class="col">
                                    <div class="row">
                                        <span class="label">📤 输出</span>
                                        <span class="value">${formatNumber(m.output)}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label">📊 输出占比</span>
                                        <span class="value">${m.outputRate}%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="total-row">🔢 总计 ${formatNumber(m.total)}</div>
                        </div>
                    `;
                });
                body.innerHTML = html;
            }
        }

        function enableFloatWindow() {
            createFloatWindow();
            floatWin.style.display = 'block';
            setDisplayMode(currentMode);
            console.log('📈 [Usage监控/悬浮窗] 缓存命中率悬浮窗已启用');
        }

        function disableFloatWindow() {
            if (floatWin) floatWin.style.display = 'none';
        }

        // ===== 6.7 总开关（保持 V8.6 原行为：一布尔同时控制千分位+悬浮窗）=====
        function applyMasterSwitch(on) {
            savePref('usageMasterSwitch', on);
            if (on) {
                enableFormatting();
                enableFloatWindow();
                console.log('📊 [Usage监控] 完整功能已开启');
            } else {
                disableFormatting();
                disableFloatWindow();
                console.log('📊 [Usage监控] 完整功能已关闭');
            }
        }

        // ===== 6.8 启动自检（V8.6 原逻辑）=====
        function startupSelfCheck() {
            setTimeout(() => {
                if (TOKEN_DATA.models.length === 0) {
                    LOG.warn('Usage监控',
                        '启动 1.5 秒后仍未接收到 API 数据。可能未访问到使用量页面，或 API 路径已变更。'
                    );
                }
            }, 1500);
        }

        // ===== 6.9 主控制器 =====
        const prefs = loadPrefs();
        const masterOn = prefs.usageMasterSwitch;
        currentMode = prefs.usageDisplayMode;

        LOG.boot(`【Usage监控】控制器初始化，masterSwitch=${masterOn}, displayMode=${currentMode}`);

        // 关键时序：拦截器必须在 document-start 阶段安装（即此函数被调用时立刻安装），
        // 不能等到 DOMContentLoaded，否则会漏掉早期请求。
        installDataInterceptor();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (masterOn) applyMasterSwitch(true);
                startupSelfCheck();
            });
        } else {
            if (masterOn) applyMasterSwitch(true);
            startupSelfCheck();
        }

        // ===== 6.10 菜单 =====
        GM_registerMenuCommand('📊 Usage 完整功能: 开启', () => applyMasterSwitch(true));
        GM_registerMenuCommand('📊 Usage 完整功能: 关闭', () => applyMasterSwitch(false));
    }

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 7 / 站点路由器 + 启动入口
     *
     * 路由策略（按 hostname + pathname 分流，三个域名互不重叠）：
     *   doubao.com                       → 自动专家（豆包配置）
     *   chat.deepseek.com                → 自动专家（DeepSeek 配置）+ 侧边栏永恒守护
     *   platform.deepseek.com/usage      → Usage 千分位 + 缓存命中率悬浮窗
     *   其他匹配域名                     → 预警但不报错
     *
     * 时序约束（document-start 阶段必须完成）：
     *   1. matchMedia 劫持（仅 chat.deepseek.com）— 必须在 React 首次调用前完成
     *   2. 遥测拦截器安装（仅自动专家域名）— 不能在 platform.deepseek.com 上装，
     *      否则会和 Usage 监控的拦截器冲突（虽未观测到，但保守隔离）
     *   3. Usage 数据拦截器（仅 platform.deepseek.com/usage）— 在 bootUsageMonitor 内首行安装
     * ══════════════════════════════════════════════════════════════════════ */
    const hostname = location.hostname;
    const pathname = location.pathname;

    LOG.boot(`脚本启动 ${SCRIPT_NAME} V${SCRIPT_VERSION}, hostname=${hostname}, pathname=${pathname}`);

    try {
        // ----- 路由分支 1：豆包 -----
        if (hostname.includes('doubao.com')) {
            LOG.boot(`路由命中：豆包域名 → 启动自动专家（豆包配置）`);
            const cfg = siteConfigs['doubao.com'];
            if (cfg.blockedHosts?.length) installTelemetryBlocker(cfg.blockedHosts);
            createSiteController(hostname, cfg);
        }
        // ----- 路由分支 2：DeepSeek 聊天 -----
        else if (hostname === 'chat.deepseek.com') {
            LOG.boot(`路由命中：chat.deepseek.com → 启动自动专家 + 侧边栏永恒守护`);

            // 关键时序 1：matchMedia 劫持必须在 React 之前
            installMatchMediaInterceptor();

            // 自动专家
            const cfg = siteConfigs['chat.deepseek.com'];
            if (cfg.blockedHosts?.length) installTelemetryBlocker(cfg.blockedHosts);
            createSiteController(hostname, cfg);

            // 侧边栏永恒守护防线二（DOM ready 后激活）
            if (document.body) {
                bootSidebarGuardian();
            } else {
                document.addEventListener('DOMContentLoaded', bootSidebarGuardian);
            }
        }
        // ----- 路由分支 3：DeepSeek 用量页 -----
        else if (hostname === 'platform.deepseek.com' && pathname.startsWith('/usage')) {
            LOG.boot(`路由命中：platform.deepseek.com/usage → 启动 Usage 千分位 + 悬浮窗`);
            // 注意：此分支不安装遥测拦截器（不污染 Usage API 接口）；
            //      Usage 数据拦截器在 bootUsageMonitor() 内部第一行安装。
            bootUsageMonitor();
        }
        // ----- 路由未命中：给出诊断信息（铁律 § 4.4 真预警）-----
        else {
            LOG.alert(`无匹配站点路由：hostname=${hostname}, pathname=${pathname}。脚本不会执行任何业务逻辑。请检查 @match 是否被某个上游规则误触发。`);
        }
    } catch(e) {
        LOG.alert(`站点路由器初始化异常：${e && e.message}`);
        console.error(e);
    }
})();
