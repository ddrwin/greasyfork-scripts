// ==UserScript==
// @name         豆包 & DeepSeek 自动专家 V3.13
// @namespace    https://github.com/ddrwin/ai-auto-expert
// @version      3.13
// @description  统一偏好管理、模块化站点控制、遥测拦截。豆包默认思考，DeepSeek 默认专家+深度思考。V3.13：全域监控日志+步骤日志+三重金标准验证。修复强制触发时的卡顿Bug。
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
// @note         2026.04.30 V3.13 最终版：修复强制触发时由于鼠标移动导致流程卡死的Bug。
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

    // ==================== 2. 遥测拦截模块（带去重） ====================
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

    // ==================== 4. 站点控制器 ====================
    function createSiteController(config) {
        if (config.styles) GM_addStyle(config.styles);
        const prefs = loadPrefs();

        let manualCooldownUntil = 0;
        const COOLDOWN_MS = 1500;

        let lastMouseMove = 0;
        document.addEventListener('mousemove', () => { lastMouseMove = Date.now(); }, { passive: true });

        const isConversationPage = () => location.pathname.startsWith('/a/chat/s/');
        let lastPathname = location.pathname;

        // 动态菜单管理
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

        // ==================== 全域监控监听器 ====================
        const observeRouteChange = () => {
            const currentPath = location.pathname;
            if (currentPath === lastPathname) return;
            
            const prevIsConv = lastPathname.startsWith('/a/chat/s/');
            const currIsConv = currentPath.startsWith('/a/chat/s/');
            
            if (!prevIsConv && currIsConv) {
                console.log(`[监控] 感知到用户操作：进入对话页，路径: ${currentPath}`);
            } else if (prevIsConv && !currIsConv) {
                console.log(`[监控] 感知到用户操作：从对话页切回，进入首页或其它页面，路径: ${currentPath}`);
                // 【核心修复】只要检测到从对话页切回，不考虑鼠标状态，强制执行一次恢复流程
                setTimeout(() => scanAll(true), 100);
            } else if (currentPath === '/') {
                console.log(`[监控] 感知到用户操作：进入首页，路径: ${currentPath}`);
            }
            lastPathname = currentPath;
        };

        const routeObserver = new MutationObserver(() => {
            observeRouteChange();
        });
        routeObserver.observe(document.body, { childList: true, subtree: true });

        // 自动同步控制（全控件增强重试）
        // 新增 force 参数，为 true 时跳过鼠标静止检测
        async function applyControl(control, force = false) {
            const MOUSE_IDLE_THRESHOLD = 300;
            if (!force && Date.now() - lastMouseMove < MOUSE_IDLE_THRESHOLD) return;
            if (Date.now() < manualCooldownUntil) return;

            const MAX_RETRIES = 4;
            const RETRY_DELAY = 200;

            // 模型切换 - 步骤日志 + 三重金标准验证
            if (control.id === 'modelSelect') {
                if (isConversationPage()) return;

                console.log('[1/5] 读取本地配置，偏好目标：' + prefs[control.storageKey]);
                console.log('[2/5] 环境检查：当前为非对话页，开始读取页面状态');

                const target = prefs[control.storageKey];
                let currentModel = null;
                for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                    currentModel = control.getCurrentValue();
                    if (currentModel === null) {
                        console.log(`[3/5] 第${attempt + 1}次读取状态：null（页面尚未就绪）`);
                    } else {
                        console.log(`[3/5] 第${attempt + 1}次读取状态：${currentModel === target ? '已匹配' : currentModel}`);
                        break;
                    }
                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                }

                if (currentModel === null) {
                    console.warn('[3/5] ⚠️ 状态读取失败（重试耗尽），放弃本次自动恢复');
                    return;
                }

                if (currentModel === target) {
                    console.log('[4/5] 当前已是目标模型，无需切换');
                    return;
                }

                console.log('[4/5] 执行点击切换...');
                await control.action(target);

                // 金标准验证
                await new Promise(r => setTimeout(r, 300));
                const targetEl = document.querySelector(`div[data-model-type="${target}"]`);
                const ariaOk = targetEl && targetEl.getAttribute('aria-checked') === 'true';
                const classOk = targetEl && targetEl.classList.contains('_31a22b0');
                
                const parent = targetEl ? targetEl.closest('.b0db7355') : null;
                const selectedIndex = parent ? parent.style.getPropertyValue('--selected-index') : null;
                const expectedIndex = target === 'expert' ? '1' : '0';
                const indexOk = selectedIndex === expectedIndex;

                if (ariaOk && classOk && indexOk) {
                    console.log(`[5/5] ✅ 三重验证通过 (aria-checked=true ∧ 含_31a22b0 ∧ 父容器索引匹配)`);
                } else {
                    console.warn(`[5/5] ❌ 三重验证失败 (aria=${ariaOk}, class=${classOk}, index=${selectedIndex}/${expectedIndex})，等待下次自动重试`);
                }
                return;
            }

            // 深度思考 / 智能搜索 / 豆包模型
            let el = null;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                el = control.findElement();
                if (el && control.isMatch(el, prefs[control.storageKey])) return;
                if (el) break;
                await new Promise(r => setTimeout(r, RETRY_DELAY));
            }

            if (!el) {
                console.warn(`⚠️ ${control.id} 元素查找失败（重试耗尽），放弃本次自动恢复`);
                return;
            }

            try {
                await control.action(prefs[control.storageKey], el);
                console.log(`✅ 已应用偏好: ${control.id} = ${prefs[control.storageKey]}`);
            } catch (e) {
                console.warn(`❌ 应用偏好失败: ${control.id}`, e);
            }
        }

        let scanTimer;
        function scanAll(force = false) {
            if (force || (!isConversationPage() && lastPathname !== location.pathname)) {
                lastPathname = location.pathname;
                config.controls.forEach(c => applyControl(c, true));
            } else {
                config.controls.forEach(c => applyControl(c));
            }
        }
        function debouncedScan() { clearTimeout(scanTimer); scanTimer = setTimeout(scanAll, 800); }

        if (document.body) scanAll();
        else document.addEventListener('DOMContentLoaded', scanAll);

        const observerTarget = document.body || document.documentElement;
        new MutationObserver(debouncedScan).observe(observerTarget, { childList: true, subtree: true });

        // 手动偏好捕获（带 try/catch 防御）
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
                            manualCooldownUntil = Date.now() + COOLDOWN_MS;
                            clearTimeout(scanTimer);
                            updatePreference('deepseekModel', finalValue);
                            console.log(`👆 手动更新偏好: deepseekModel = ${finalValue}`);
                        }
                    }, 0);
                }
            }

            config.controls.forEach(ctrl => {
                if (typeof ctrl.manualTrigger === 'function') {
                    try {
                        const newValue = ctrl.manualTrigger(e);
                        if (newValue !== null && newValue !== undefined && newValue !== prefs[ctrl.storageKey]) {
                            manualCooldownUntil = Date.now() + COOLDOWN_MS;
                            clearTimeout(scanTimer);
                            updatePreference(ctrl.storageKey, newValue);
                            console.log(`👆 手动更新偏好: ${ctrl.storageKey} = ${newValue}`);
                        }
                    } catch (err) { /* ignore */ }
                }
            });
        }, true);

        // 新对话按钮监听（组合识别 + 优先链路）—— 强制触发
        document.addEventListener('click', e => {
            const target = e.target.closest('div,button,span,svg,a');
            if (!target) return;

            const text = target.textContent.trim();
            if (text !== '开启新对话' && text !== '新对话') return;

            const hasButtonClass = target.classList.contains('_5a8ac7a') && target.classList.contains('a084f19e');
            const hasParentClass = target.parentElement?.classList.contains('b8812f16');
            const hasGrandparentClass = target.parentElement?.parentElement?.classList.contains('dc04ec1d');

            if (hasButtonClass) {
                console.log('[监控] 感知到用户操作：点击“开启新对话”按钮（文字+class 精确匹配）');
            } else if (hasParentClass) {
                console.log('[监控] 感知到用户操作：点击“开启新对话”按钮（文字+父容器 兜底匹配）');
            } else if (hasGrandparentClass) {
                console.log('[监控] 感知到用户操作：点击“开启新对话”按钮（文字+祖父容器 兜底匹配）');
            } else {
                console.log('[监控] 感知到用户操作：点击“开启新对话”按钮（纯文字 兜底匹配 — 页面可能已改版）');
            }
            // 点击新对话后，强制触发扫描，跳过鼠标抑制
            setTimeout(() => scanAll(true), 300);
            setTimeout(() => scanAll(true), 800);
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