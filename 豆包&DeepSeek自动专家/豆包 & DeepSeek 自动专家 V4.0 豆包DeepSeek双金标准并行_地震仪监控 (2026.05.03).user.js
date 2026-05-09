// ==UserScript==
// @name         豆包 & DeepSeek 自动专家 V4.0
// @namespace    https://github.com/ddrwin/ai-auto-expert
// @version      4.0
// @description  豆包独立金标准（文字+data-checked）与DeepSeek三重金标准并行；调度中心统筹+地震仪监控；启动自检+控件可见性预警。
// @icon         https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/chat/favicon.png
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
// @note         2026.05.03 V4.0 修复V3.22引入的豆包调度断流；豆包独立金标准 + DeepSeek三重金标准；启动自检+控件可见性预警；铁律V2.1全面落实。
// ==/UserScript==

(function() {
    'use strict';

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 0 / 基础工具与日志（地震仪）
     * 「地震仪」与程序物理隔离：日志函数是纯函数，不修改任何外部状态。
     * 所有控件、所有阶段、所有等待都必须有日志输出，无死角。
     * ══════════════════════════════════════════════════════════════════════ */

    const SCRIPT_START = performance.now();
    const SCRIPT_VERSION = '4.0';

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
        '豆包模型':  { main: '#fa8c16', light: '#ffc069', dark: '#ad4e00' }  // 橙（与DeepSeek模型切换区分）
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
     * GM 存储 + 默认值 + 向下兼容（旧字段迁移）。
     * ══════════════════════════════════════════════════════════════════════ */
    const PREF_KEY = 'ai_assistant_prefs_v2';
    const defaultPrefs = Object.freeze({
        doubaoModel: '思考',
        deepseekModel: 'expert',
        deepseekDeepThink: true,
        deepseekSmartSearch: false
    });

    function loadPrefs() {
        const saved = GM_getValue(PREF_KEY, {});
        // 兼容：旧版布尔字段 deepseekExpert → deepseekModel
        if (typeof saved.deepseekExpert === 'boolean' && !saved.deepseekModel) {
            saved.deepseekModel = saved.deepseekExpert ? 'expert' : 'default';
            delete saved.deepseekExpert;
            GM_setValue(PREF_KEY, saved);
        }
        // 兼容：旧版字符串 'fast' → 'default'
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

    /* ════════════════════════════════════════════════════════════════════════
     *                         模块 2 / 遥测拦截
     * 在 document-start 拦截 fetch / XHR，匹配黑名单的请求直接阻断。
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
     *                         模块 3 / 站点配置（声明式）
     * 每站点一份配置：样式、遥测黑名单、控件数组。
     * 控件四要素：findElement、getCurrentValue、action、verify（金标准）。
     * 控件元数据：id、storageKey、label、appliesTo、steps、manualTrigger。
     * 注：豆包模型控件 appliesTo 设为 ['home','conversation']，因为豆包对话页
     *    的输入区也带模型按钮；交由 findElement 的存在性兜底判断。
     * ══════════════════════════════════════════════════════════════════════ */
    const siteConfigs = {
        'doubao.com': {
            siteName: '豆包',
            // 样式：完整保留 V3.20 + V3.33 的视觉调整（重构纪律：禁止占位符，逐字节迁移）
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
     *                         模块 4 / 站点控制器
     * 4.1 调度中心：identifyPage + Scheduler.run
     * 4.2 路由感知：MutationObserver + pathname 比对
     * 4.3 单控件执行器：applyControl（按 id 分发到独立金标准分支）
     * 4.4 启动自检：1.5s 后扫描所有适用控件的 findElement，缺失则预警
     * 4.5 手动捕获：网页按钮点击 → 同步偏好与菜单
     * 4.6 新对话按钮监听：触发模型恢复
     * ══════════════════════════════════════════════════════════════════════ */
    function createSiteController(hostname, config) {
        if (config.styles) GM_addStyle(config.styles);
        const prefs = loadPrefs();
        const siteName = config.siteName;

        // ----- 4.0 页面识别（URL → 'home' / 'conversation' / 'unknown'）-----
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
     *                         模块 5 / 启动
     * ══════════════════════════════════════════════════════════════════════ */
    const hostname = location.hostname;
    LOG.boot(`脚本启动 V${SCRIPT_VERSION}, hostname=${hostname}, pathname=${location.pathname}`);

    let matched = false;
    try {
        for (const [domain, cfg] of Object.entries(siteConfigs)) {
            if (hostname.includes(domain)) {
                if (cfg.blockedHosts?.length) installTelemetryBlocker(cfg.blockedHosts);
                createSiteController(hostname, cfg);
                matched = true;
                break;
            }
        }
        if (!matched) {
            LOG.alert(`无匹配站点配置，hostname=${hostname}，脚本不会执行任何控件操作`);
        }
    } catch(e) {
        LOG.alert(`站点控制器初始化异常：${e && e.message}`);
        console.error(e);
    }
})();
