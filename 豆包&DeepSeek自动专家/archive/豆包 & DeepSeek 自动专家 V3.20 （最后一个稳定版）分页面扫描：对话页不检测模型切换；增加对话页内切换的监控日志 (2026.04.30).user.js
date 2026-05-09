// ==UserScript==
// @name         豆包 & DeepSeek 自动专家 V3.20
// @namespace    https://github.com/ddrwin/ai-auto-expert
// @version      3.20
// @description  统一偏好管理、模块化站点控制、遥测拦截。V3.20：分页面扫描（对话页不扫模型切换）；对话页内部切换独立监控。
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
// @note         2026.04.30 V3.20 分页面扫描：对话页不检测模型切换；增加对话页内切换的监控日志；程序/日志解耦铁律不变。
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_START = performance.now();

    function simulateClick(el) {
        if (!el) return;
        el.focus();
        ['pointerdown','mousedown','focus','mouseup','click'].forEach(type =>
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
        );
    }

    function ts() {
        return `[T+${((performance.now() - SCRIPT_START) / 1000).toFixed(3)}s]`;
    }

    // 控件色系定义
    const COLORS = {
        '模型切换': { main: '#1e6fff', light: '#85b3ff', dark: '#0a4db8' },
        '深度思考': { main: '#389e0d', light: '#95de64', dark: '#1f6100' },
        '智能搜索': { main: '#722ed1', light: '#b37feb', dark: '#3c108a' },
        '豆包模型': { main: '#1e6fff', light: '#85b3ff', dark: '#0a4db8' }
    };

    function getColor(label) {
        return COLORS[label] || COLORS['模型切换'];
    }

    const LOG = {
        monitor(msg) {
            console.log(`${ts()} %c🟢 [监控] %c${msg}`, 'color:#fff;background:#1e6fff;padding:1px 4px;border-radius:2px', 'color:#000');
        },
        step(label, msg) {
            const c = getColor(label.split(' ')[0]);
            console.log(`${ts()} %c📋 [${label}] %c${msg}`, `color:#fff;background:${c.main};padding:1px 4px;border-radius:2px`, 'color:#000');
        },
        scan(label, msg) {
            const c = getColor(label.split(' ')[0]);
            console.log(`${ts()} %c  🔍 [${label}] %c${msg}`, `color:#fff;background:${c.light};padding:1px 4px;border-radius:2px`, 'color:#000');
        },
        wait(label, msg) {
            const c = getColor(label.split(' ')[0]);
            console.log(`${ts()} %c  ⏳ [${label}] %c${msg}`, `color:${c.dark};background:${c.light}33;padding:1px 4px;border-radius:2px`, 'color:#000');
        },
        action(label, msg) {
            const c = getColor(label.split(' ')[0]);
            console.log(`${ts()} %c  ⚡ [${label}] %c${msg}`, `color:#fff;background:${c.dark};padding:1px 4px;border-radius:2px`, 'color:#fff');
        },
        ok(label, msg) {
            const c = getColor(label.split(' ')[0]);
            console.log(`${ts()} %c✅ [${label}] %c${msg}`, `color:#fff;background:${c.main};padding:1px 4px;border-radius:2px`, 'color:#fff');
        },
        fail(label, msg) {
            const c = getColor(label.split(' ')[0]);
            console.log(`${ts()} %c❌ [${label}] %c${msg}`, `color:#fff;background:${c.dark};padding:1px 4px;border-radius:2px`, 'color:#fff');
        },
        warn(label, msg) {
            const c = getColor(label.split(' ')[0]);
            console.warn(`${ts()} %c⚠️ [${label}] %c${msg}`, `color:#fff;background:${c.main};padding:1px 4px;border-radius:2px`, 'color:#000');
        },
        manual(msg) {
            console.log(`${ts()} %c👆 [手动] %c${msg}`, 'color:#fff;background:#722ed1;padding:1px 4px;border-radius:2px', 'color:#fff');
        },
        divider() {
            console.log('%c————————————————————————————————', 'color:#aaa');
        }
    };

    // ==================== 1. 统一偏好管理 ====================
    const PREF_KEY = 'ai_assistant_prefs_v2';
    const defaultPrefs = Object.freeze({
        doubaoModel: '思考',
        deepseekModel: 'expert',
        deepseekDeepThink: true,
        deepseekSmartSearch: false
    });

    function loadPrefs() {
        const saved = GM_getValue(PREF_KEY, {});
        if (typeof saved.deepseekExpert === 'boolean' && !saved.deepseekModel) {
            saved.deepseekModel = saved.deepseekExpert ? 'expert' : 'default';
            delete saved.deepseekExpert;
            GM_setValue(PREF_KEY, saved);
        }
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
        if (window.__telemetryBlockerInstalled__) return;
        window.__telemetryBlockerInstalled__ = true;

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
                label: '豆包模型',
                steps: 5,
                appliesTo: ['home'], // 仅首页
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
            blockedHosts: ['hif-dliq.deepseek.com'],
            controls: [
                {
                    id: 'modelSelect',
                    storageKey: 'deepseekModel',
                    label: '模型切换',
                    steps: 5,
                    appliesTo: ['home'], // 仅首页
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
                    manualTrigger: null
                },
                {
                    id: 'deepThink',
                    storageKey: 'deepseekDeepThink',
                    label: '深度思考',
                    steps: 3,
                    appliesTo: ['home', 'conversation'],
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
                    label: '智能搜索',
                    steps: 4,
                    appliesTo: ['home', 'conversation'],
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

    // ==================== 4. 站点控制器 ====================
    function createSiteController(config) {
        if (config.styles) GM_addStyle(config.styles);
        const prefs = loadPrefs();

        const isConversationPage = () => location.pathname.startsWith('/a/chat/s/');
        let lastPathname = location.pathname;

        // 动态菜单
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

        // ==================== 全域监控（含对话页内切换） ====================
        const observeRouteChange = () => {
            const currentPath = location.pathname;
            if (currentPath === lastPathname) return;
            
            const prevIsConv = lastPathname.startsWith('/a/chat/s/');
            const currIsConv = currentPath.startsWith('/a/chat/s/');
            
            if (!prevIsConv && currIsConv) {
                LOG.monitor(`进入对话页，路径: ${currentPath}`);
            } else if (prevIsConv && !currIsConv) {
                LOG.monitor(`从对话页切回，进入首页，路径: ${currentPath}`);
                LOG.monitor('已触发模型恢复流程，等待页面渲染...');
                setTimeout(() => scanAll(), 200);
            } else if (prevIsConv && currIsConv) {
                // 对话页内部切换
                LOG.monitor(`切换对话，从 ${lastPathname} → ${currentPath}`);
            }
            lastPathname = currentPath;
        };
        new MutationObserver(() => observeRouteChange()).observe(document.body, { childList: true, subtree: true });

        // ==================== 自动同步控制 ====================
        async function applyControl(control) {
            const label = control.label || control.id;
            const totalSteps = control.steps || 5;
            const MAX_RETRIES = 4;
            const RETRY_DELAY = 200;

            if (control.id === 'modelSelect') {
                // 对话页本不应执行，但保留作为防御
                if (isConversationPage()) {
                    LOG.step(`${label} 1/${totalSteps}`, '环境检查：当前为对话页');
                    LOG.ok(label, '对话页无模型选择器，跳过切换');
                    LOG.divider();
                    return;
                }
                LOG.step(`${label} 1/${totalSteps}`, '环境检查：当前为非对话页，继续执行');

                const target = prefs[control.storageKey];
                LOG.step(`${label} 2/${totalSteps}`, `配置读取：偏好为 ${target}`);

                let currentModel = null;
                LOG.step(`${label} 3/${totalSteps}`, `增强重试读取页面状态（最多 ${MAX_RETRIES} 次）`);
                for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                    currentModel = control.getCurrentValue();
                    if (currentModel === null) {
                        LOG.scan(label, `第 ${attempt + 1} 次读取：null（页面尚未就绪）`);
                    } else {
                        LOG.scan(label, `第 ${attempt + 1} 次读取：${currentModel}`);
                        break;
                    }
                    if (attempt < MAX_RETRIES - 1) {
                        LOG.wait(label, `等待 ${RETRY_DELAY}ms 后重试...`);
                        await new Promise(r => setTimeout(r, RETRY_DELAY));
                    }
                }

                if (currentModel === null) {
                    LOG.step(`${label} 4/${totalSteps}`, '状态读取失败（重试耗尽）');
                    LOG.fail(label, '无法读取当前模型状态，等待 MutationObserver 下次触发');
                    LOG.divider();
                    return;
                }

                if (currentModel === target) {
                    LOG.step(`${label} 4/${totalSteps}`, '页面状态与偏好一致，无需点击');
                } else {
                    LOG.action(label, `执行点击切换至 ${target}...`);
                    await control.action(target);
                    LOG.wait(label, '点击已完成，等待 300ms 后验证...');
                    await new Promise(r => setTimeout(r, 300));
                }

                const targetEl = document.querySelector(`div[data-model-type="${target}"]`);
                const ariaOk = targetEl?.getAttribute('aria-checked') === 'true';
                const classOk = targetEl?.classList.contains('_31a22b0') || false;
                const parent = targetEl?.closest('.b0db7355');
                const selectedIndex = parent ? parent.style.getPropertyValue('--selected-index') : null;
                const expectedIndex = target === 'expert' ? '1' : '0';
                const indexOk = selectedIndex === expectedIndex;

                LOG.step(`${label} 5/${totalSteps}`, '金标准三重验证');
                LOG.scan(label, `aria-checked=true: ${ariaOk ? '✅' : '❌'}`);
                LOG.scan(label, `class含_31a22b0: ${classOk ? '✅' : '❌'}`);
                LOG.scan(label, `父容器索引(${selectedIndex}/${expectedIndex}): ${indexOk ? '✅' : '❌'}`);

                if (ariaOk && classOk && indexOk) {
                    LOG.ok(label, '金标准三重验证通过，切换已生效');
                } else {
                    LOG.fail(label, '金标准三重验证未通过，等待下次触发重试');
                }
                LOG.divider();
                return;
            }

            LOG.step(`${label} 1/${totalSteps}`, '环境检查');
            const target = prefs[control.storageKey];
            LOG.step(`${label} 2/${totalSteps}`, `配置读取：偏好为 ${target}`);

            let el = null;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                el = control.findElement();
                if (el && control.isMatch(el, target)) {
                    LOG.step(`${label} ${totalSteps}/${totalSteps}`, '页面状态与偏好一致，无需操作');
                    LOG.ok(label, '已处于目标状态');
                    LOG.divider();
                    return;
                }
                if (el) break;
                LOG.scan(label, `第 ${attempt + 1} 次查找元素：未找到`);
                if (attempt < MAX_RETRIES - 1) {
                    LOG.wait(label, `等待 ${RETRY_DELAY}ms 后重试...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                }
            }

            if (!el) {
                LOG.step(`${label} ${totalSteps}/${totalSteps}`, '元素查找失败（重试耗尽）');
                LOG.fail(label, '无法找到控件，等待下次触发');
                LOG.divider();
                return;
            }

            LOG.action(label, '执行切换操作...');
            await control.action(target, el);
            LOG.step(`${label} ${totalSteps}/${totalSteps}`, '切换完成');
            LOG.ok(label, '偏好已应用');
            LOG.divider();
        }

        let scanTimer;
        function scanAll() {
            const isConv = isConversationPage();
            const activeControls = config.controls.filter(ctrl => {
                const appliesTo = ctrl.appliesTo || ['home'];
                return appliesTo.includes(isConv ? 'conversation' : 'home');
            });
            activeControls.forEach(c => applyControl(c));
        }
        function debouncedScan() { clearTimeout(scanTimer); scanTimer = setTimeout(scanAll, 800); }

        if (document.body) scanAll();
        else document.addEventListener('DOMContentLoaded', scanAll);

        new MutationObserver(debouncedScan).observe(document.body || document.documentElement, { childList: true, subtree: true });

        // ==================== 手动偏好捕获 ====================
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
                            LOG.manual(`deepseekModel = ${finalValue}`);
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
                            LOG.manual(`${ctrl.storageKey} = ${newValue}`);
                        }
                    } catch (err) { /* ignore */ }
                }
            });
        }, true);

        // ==================== 新对话按钮监听 ====================
        document.addEventListener('click', e => {
            const target = e.target.closest('div,button,span,svg,a');
            if (!target) return;
            const text = target.textContent.trim();
            if (text !== '开启新对话' && text !== '新对话') return;

            const hasButtonClass = target.classList.contains('_5a8ac7a') && target.classList.contains('a084f19e');
            const hasParentClass = target.parentElement?.classList.contains('b8812f16');
            const hasGrandparentClass = target.parentElement?.parentElement?.classList.contains('dc04ec1d');

            if (hasButtonClass) LOG.monitor('点击"开启新对话"（文字+class 精确匹配）');
            else if (hasParentClass) LOG.monitor('点击"开启新对话"（文字+父容器 兜底匹配）');
            else if (hasGrandparentClass) LOG.monitor('点击"开启新对话"（文字+祖父容器 兜底匹配）');
            else LOG.monitor('点击"开启新对话"（纯文字 兜底匹配 — 页面可能已改版）');

            LOG.monitor('已触发模型恢复流程，等待页面渲染...');
            setTimeout(() => scanAll(), 300);
            setTimeout(() => scanAll(), 800);
        }, true);
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