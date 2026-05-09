// ==UserScript==
// @name         豆包 & DeepSeek 自动专家
// @namespace
// @version      3.0
// @description  统一架构重构：Store模块+遥测拦截+DOM监听调度+站点配置驱动的模式切换
// @icon         https://www.doubao.com/favicon.ico
// @author       ddrwin
// @match        *://*.doubao.com/*
// @match        *://*.deepseek.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// @note         2026.4.27   V3.0  架构重构：Store / Telemetry / DOMWatcher / SiteConfigs / ModeManager
// ==/UserScript==

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // █ 1. Store — 统一 KV 存储模块
    //    所有持久化偏好通过 Store 读写，key 用 "站点.字段" 格式
    // ─────────────────────────────────────────────
    const Store = {
        get(key, fallback) {
            return GM_getValue(key, fallback);
        },
        set(key, value) {
            GM_setValue(key, value);
            console.log(`[Store] ${key} = ${JSON.stringify(value)}`);
        },
    };

    // ─────────────────────────────────────────────
    // █ 2. Telemetry — 统一遥测拦截模块
    //    传入域名数组，同时拦截 fetch 和 XHR
    // ─────────────────────────────────────────────
    const Telemetry = {
        block(hosts) {
            if (!hosts || hosts.length === 0) return;

            // 拦截 fetch
            const _fetch = window.fetch;
            window.fetch = function (url, ...args) {
                const u = typeof url === 'string' ? url : (url && url.url) || '';
                if (hosts.some(h => u.includes(h))) {
                    console.log(`[Telemetry] fetch blocked: ${u}`);
                    return Promise.reject(new Error('Blocked by userscript'));
                }
                return _fetch.call(this, url, ...args);
            };

            // 拦截 XMLHttpRequest
            const _open = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                const u = String(url);
                if (hosts.some(h => u.includes(h))) {
                    console.log(`[Telemetry] XHR blocked: ${u}`);
                    this.send = () => {};
                    this.setRequestHeader = () => {};
                    return;
                }
                return _open.call(this, method, url, ...rest);
            };

            console.log(`[Telemetry] 已拦截 ${hosts.length} 个遥测域名`);
        },
    };

    // ─────────────────────────────────────────────
    // █ 3. DOMWatcher — 统一 MutationObserver 调度器
    //    所有回调共用一个 Observer + debounce，避免多个 Observer 竞争
    // ─────────────────────────────────────────────
    const DOMWatcher = {
        _callbacks: [],
        _timer: null,
        _observer: null,
        _debounceMs: 600,

        add(fn) {
            this._callbacks.push(fn);
        },

        start() {
            const target = document.body || document.documentElement;
            this._observer = new MutationObserver(() => {
                clearTimeout(this._timer);
                this._timer = setTimeout(() => {
                    this._callbacks.forEach(fn => {
                        try { fn(); } catch (e) { console.warn('[DOMWatcher] callback error', e); }
                    });
                }, this._debounceMs);
            });
            this._observer.observe(target, { childList: true, subtree: true });
            console.log('[DOMWatcher] 已启动统一 MutationObserver');
        },

        // 等待元素出现（用 rAF 替代轮询 setInterval）
        waitFor(selector, timeout = 8000, validate = () => true) {
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
        },
    };

    // ─────────────────────────────────────────────
    // █ 4. UIAdapter — 按钮交互工具
    //    隔离 simulateClick 等脆弱的 UI 操作，出问题只改这里
    // ─────────────────────────────────────────────
    const UIAdapter = {
        simulateClick(el) {
            if (!el) return;
            el.focus();
            ['pointerdown', 'mousedown', 'focus', 'mouseup', 'click'].forEach(type => {
                el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
            });
        },

        // 点击下拉触发按钮，从弹出菜单中找到目标项并点击
        async clickMenuOption(triggerSelector, optionTextMatch, validate) {
            const trigger = await DOMWatcher.waitFor(triggerSelector, 8000, validate);
            if (!trigger) return false;

            this.simulateClick(trigger);
            await new Promise(r => setTimeout(r, 300));

            const items = document.querySelectorAll('[role="menu"] [role="menuitem"]');
            const target = Array.from(items).find(i => i.textContent.includes(optionTextMatch));
            if (!target) {
                // 关闭菜单
                this.simulateClick(trigger);
                return false;
            }
            this.simulateClick(target);
            return true;
        },

        // 切换 aria-checked 类型的 radio 按钮
        clickIfUnchecked(selector) {
            const el = document.querySelector(selector);
            if (!el) return false;
            if (el.getAttribute('aria-checked') === 'false') {
                el.click();
                return true;
            }
            return el.getAttribute('aria-checked') === 'true';
        },

        // 关闭某个 toggle（有 selected 类则点击取消）
        disableToggle(selector, textMatch) {
            const btns = document.querySelectorAll(selector);
            for (const btn of btns) {
                if (btn.textContent.includes(textMatch)) {
                    if (btn.classList.contains('ds-toggle-button--selected')) btn.click();
                    return true;
                }
            }
            return false;
        },
    };

    // ─────────────────────────────────────────────
    // █ 5. SiteConfigs — 各站点配置
    //    每个站点定义：样式、遥测域名、需要切换的模式列表
    //    mode 对象结构：
    //      { key, label, storeKey, defaultValue, apply: async fn => bool }
    // ─────────────────────────────────────────────
    const SiteConfigs = [
        // ── 豆包 ──────────────────────────────────
        {
            match: host => host.includes('doubao.com') || host.includes('bytedance.com'),
            telemetry: [
                'opt.doubao.com',
                'mon.zijieapi.com',
                'mcs.doubao.com',
                'mssdk.bytedance.com',
            ],
            css: `
                :root { --content-max-width: 100% !important; }
                div[class*="max-w-"] { max-width: 100% !important; }
                .container-PvPoAn, .item-kDun2N, [class*="max-dbx-xs:"] { max-width: 100% !important; }

                .bg-g-send-msg-bubble-bg, [class*="send-msg-bubble"] {
                    background: #dbeafe !important;
                    color: #1e293b !important;
                    border-radius: 12px;
                }
                .bg-g-receive-msg-bubble-bg, [class*="receive-msg-bubble"] {
                    background: #ffffff !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    border-radius: 12px;
                }
                .bg-g-send-msg-bubble-bg code,
                .bg-g-send-msg-bubble-bg pre { background-color: rgba(0,0,0,0.06); }

                .mdbox-table-root, .table-scroll-container-OfUx5s, .table-wrapper-wG0rS7 {
                    max-width: 100% !important; width: 100% !important; overflow-x: auto !important;
                }
                .mdbox-table-root table, .table-scroll-container-OfUx5s table {
                    width: 100% !important; table-layout: auto;
                }
            `,
            // 豆包只有一个"当前模型"选项，通过下拉菜单切换
            modes: [
                {
                    key: 'doubao.model',
                    label: '豆包对话模型',
                    defaultValue: '思考',
                    choices: ['快速', '思考', '专家'],   // 枚举合法值，供菜单注册
                    // apply: 检查当前按钮文字，不一致则切换
                    apply: async () => {
                        const current = Store.get('doubao.model', '思考');
                        const isModelBtn = btn => ['快速', '思考', '专家'].includes(btn.textContent?.trim());
                        const trigger = await DOMWatcher.waitFor(
                            'button[aria-haspopup="menu"]', 8000, isModelBtn
                        );
                        if (!trigger) return false;
                        if (trigger.textContent.trim().includes(current)) return true; // 已是目标

                        const ok = await UIAdapter.clickMenuOption(
                            'button[aria-haspopup="menu"]',
                            current,
                            isModelBtn
                        );
                        if (ok) console.log(`[豆包] ✅ 已切换至 ${current}`);
                        return ok;
                    },
                },
            ],
            // 监听用户在 UI 上手动点击菜单项，自动更新 Store
            onManualClick: (item) => {
                const text = item.textContent || '';
                const choices = ['快速', '思考', '专家'];
                const hit = choices.find(c => text.includes(c));
                if (hit) {
                    Store.set('doubao.model', hit);
                    console.log(`[豆包] 👆 手动选择「${hit}」，已更新默认`);
                }
            },
            // 点击"新对话"按钮时重新触发
            newChatKeyword: '新对话',
        },

        // ── DeepSeek ──────────────────────────────
        {
            match: host => host === 'chat.deepseek.com',
            telemetry: [
                'sentry.io',           // DeepSeek 使用 Sentry 上报错误
                'analytics.deepseek.com',
            ],
            css: `
                div:has( > #latest-context-divider) { width: 95% !important; }
                div:has( > div > #chat-input) { width: 95% !important; max-width: 90vw; }
                :root { --message-list-max-width: calc(100% - 20px); }
                #root > div > div.d4850e57 > div.d7ae46fd > div.ad902ce3 { max-width: calc(100% - 20px); }
                #root > div > div.c3ecdb44 > div.f2eea526 > div > div > div.a2f8e4bb { max-width: calc(100% - 20px); }
                #root > div > div.c3ecdb44 > div.f2eea526 > div > div > div.a2f8e4bb > div.aaff8b8f.eb830e32 > div > div > div.fad49dec { max-height: 50vh; }
                .ds-markdown .ds-scroll-area { max-width: none !important; width: 100% !important; overflow-x: auto !important; }
                .ds-markdown .ds-scroll-area table { width: 100% !important; }
            `,
            modes: [
                {
                    key: 'deepseek.expertMode',
                    label: 'DeepSeek 专家模式',
                    defaultValue: true,
                    apply: async () => {
                        const want = Store.get('deepseek.expertMode', true);
                        if (!want) return true; // 用户关闭了此功能
                        const ok = UIAdapter.clickIfUnchecked('div[data-model-type="expert"]');
                        if (ok) console.log('[DeepSeek] ✅ 专家模式已激活');
                        return ok;
                    },
                },
                {
                    key: 'deepseek.disableSearch',
                    label: 'DeepSeek 关闭智能搜索',
                    defaultValue: true,
                    apply: async () => {
                        const want = Store.get('deepseek.disableSearch', true);
                        if (!want) return true;
                        const ok = UIAdapter.disableToggle('.ds-toggle-button', '智能搜索');
                        if (ok) console.log('[DeepSeek] 🔍 智能搜索已关闭');
                        return ok;
                    },
                },
            ],
        },
    ];

    // ─────────────────────────────────────────────
    // █ 6. ModeManager — 模式切换主控
    //    读取 SiteConfigs，注册菜单，启动监听，执行切换
    // ─────────────────────────────────────────────
    const ModeManager = {
        _config: null,
        _isProcessing: false,

        init(config) {
            this._config = config;
            this._registerMenus();
            this._registerListeners();
            this._applyAll();
        },

        _registerMenus() {
            const { modes } = this._config;
            modes.forEach(mode => {
                if (mode.choices) {
                    // 枚举型：每个选项注册一个菜单
                    mode.choices.forEach(choice => {
                        GM_registerMenuCommand(
                            `${mode.label}：${choice}`,
                            () => {
                                Store.set(mode.key, choice);
                                mode.apply();
                            }
                        );
                    });
                } else {
                    // 布尔型：开/关两个菜单
                    GM_registerMenuCommand(`✅ 启用 ${mode.label}`, () => {
                        Store.set(mode.key, true);
                        mode.apply();
                    });
                    GM_registerMenuCommand(`❌ 禁用 ${mode.label}`, () => {
                        Store.set(mode.key, false);
                    });
                }
            });
        },

        _registerListeners() {
            const { onManualClick, newChatKeyword, modes } = this._config;

            // 监听用户手动点击，更新 Store 偏好
            if (onManualClick) {
                document.addEventListener('click', e => {
                    const item = e.target.closest('[role="menuitem"]');
                    if (item) onManualClick(item);
                }, true);
            }

            // 点击新对话时重新应用
            if (newChatKeyword) {
                document.addEventListener('click', e => {
                    const el = e.target.closest('div,button,span');
                    if (el && el.textContent.includes(newChatKeyword)) {
                        setTimeout(() => this._applyAll(), 300);
                        setTimeout(() => this._applyAll(), 900);
                    }
                }, true);
            }

            // 页面变化时自动恢复（由 DOMWatcher 统一调度）
            DOMWatcher.add(() => {
                if (!this._isProcessing) this._applyAll();
            });
        },

        async _applyAll() {
            if (this._isProcessing) return;
            this._isProcessing = true;
            try {
                for (const mode of this._config.modes) {
                    await mode.apply();
                }
            } finally {
                this._isProcessing = false;
            }
        },
    };

    // ─────────────────────────────────────────────
    // █ 7. Bootstrap — 入口，匹配当前站点并启动
    // ─────────────────────────────────────────────
    const host = location.hostname;

    const matchedConfig = SiteConfigs.find(cfg => cfg.match(host));
    if (!matchedConfig) return; // 非目标站点，直接退出

    // 注入样式
    if (matchedConfig.css) {
        GM_addStyle(matchedConfig.css);
    }

    // 启动遥测拦截（document-start 时机，越早越好）
    if (matchedConfig.telemetry && matchedConfig.telemetry.length > 0) {
        Telemetry.block(matchedConfig.telemetry);
    }

    // 启动 DOMWatcher + ModeManager（等 body 就绪）
    function bootstrap() {
        DOMWatcher.start();
        ModeManager.init(matchedConfig);
    }

    if (document.body) {
        bootstrap();
    } else {
        document.addEventListener('DOMContentLoaded', bootstrap);
    }

})();