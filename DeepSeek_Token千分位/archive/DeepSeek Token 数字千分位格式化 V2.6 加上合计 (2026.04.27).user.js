// ==UserScript==
// @name         DeepSeek Usage Token 千分位 & 缓存命中率
// @namespace    http://tampermonkey.net/
// @version      8.3
// @description  整合菜单：一键开关千分位+悬浮窗，双模式切换（简约/完整）。V8.3 修复完整模式布局。
// @author       You
// @match        https://platform.deepseek.com/usage
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 1. 偏好管理
    const PREF_KEYS = {
        masterSwitch: 'master_switch',
        displayMode: 'display_mode'
    };
    const DEFAULTS = {
        masterSwitch: true,
        displayMode: 'full'
    };
    const loadPref = k => GM_getValue(k) ?? DEFAULTS[k];
    const savePref = (k, v) => GM_setValue(k, v);

    // 2. 工具函数
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

    // 3. 全局状态
    const TOKEN_DATA = {
        models: [],
        lastUpdateTime: null
    };

    // 4. 数据处理
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
                console.log('🚀 [API拦截] Token 数据已更新：', TOKEN_DATA.models);
                updateFloatContent();
            }
        } catch (e) {
            console.error('❌ [API拦截] 解析数据失败：', e);
        }
    }

    // 5. 数据拦截器
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
                        console.log('📦 [XHR拦截] 捕获 amount 数据：', this._url);
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
                        console.log('📦 [fetch拦截] 捕获 amount 数据：', url);
                        processTokenData(data);
                    }).catch(() => {});
                }
                return response;
            });
        };

        console.log('✅ [API拦截] XHR + fetch 数据拦截器已就绪');
    }

    // 6. 千分位格式化
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
        console.log('✅ [格式化] Token 千分位格式化已启用');
    }
    function disableFormatting() {
        if (formatObserver) { formatObserver.disconnect(); formatObserver = null; }
    }

    // 7. 悬浮窗模块（简约=第二版，完整=第一版两列优化）
    let floatWin = null, isDragging = false, sx, sy, sl, st;
    let currentMode = 'full';

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
            /* 简约模式窄宽度 */
            .ai-expert-float.simple-mode {
                width:200px;
            }
            /* 完整模式宽一些 */
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
            .ai-expert-header .actions button {
                background:none;
                border:none;
                font-size:14px;
                cursor:pointer;
                color:#64748b;
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
.full-mode .total-row {
    text-align: center;
    margin-top: 10px;
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
        floatWin.innerHTML = `
            <div class="ai-expert-header" id="drag-handle">
                <span class="title">📊 Token 缓存率</span>
                <div class="actions">
                    <button id="min-btn" title="最小化">—</button>
                    <button id="close-btn" title="关闭">✕</button>
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

        floatWin.querySelector('#min-btn').addEventListener('click', () => floatWin.classList.toggle('ai-expert-minimized'));
        floatWin.querySelector('#close-btn').addEventListener('click', () => {
            floatWin.style.display = 'none';
        });
    }

    function setDisplayMode(mode) {
        currentMode = mode;
        if (!floatWin) return;
        // 切换类名改变宽度和样式
        floatWin.classList.remove('simple-mode', 'full-mode');
        floatWin.classList.add(mode === 'simple' ? 'simple-mode' : 'full-mode');
        updateFloatContent();
        savePref(PREF_KEYS.displayMode, mode);
    }

    function updateFloatContent() {
        const body = document.getElementById('float-body');
        if (!body) return;

        if (TOKEN_DATA.models.length === 0) {
            body.innerHTML = '<div class="loading">⏳ 等待 API 数据...</div>';
            return;
        }

        if (currentMode === 'simple') {
            // 第二版：简洁居中布局（你的第二版）
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
    // 完整模式：两列布局 + 总计居中
    let html = '';
    TOKEN_DATA.models.forEach(m => {
        html += `
            <div class="model-item">
                <div class="model-name">${m.name}</div>
                <div class="hit-rate">${m.hitRate}%</div>
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
        console.log('📈 [悬浮窗] 缓存命中率悬浮窗已启用');
    }

    function disableFloatWindow() {
        if (floatWin) floatWin.style.display = 'none';
    }

    // 8. 总开关
    function applyMasterSwitch(on) {
        savePref(PREF_KEYS.masterSwitch, on);
        if (on) {
            enableFormatting();
            enableFloatWindow();
            console.log('📊 完整功能已开启');
        } else {
            disableFormatting();
            disableFloatWindow();
            console.log('📊 完整功能已关闭');
        }
    }

    // 9. 启动自检
    function startupSelfCheck() {
        setTimeout(() => {
            if (TOKEN_DATA.models.length === 0) {
                console.warn('🚨 [预警] 启动 1.5 秒后仍未接收到 API 数据。');
            }
        }, 1500);
    }

    // 10. 主控制器
    const masterOn = loadPref(PREF_KEYS.masterSwitch);
    currentMode = loadPref(PREF_KEYS.displayMode);

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

    // 11. 菜单
    GM_registerMenuCommand('📊 完整功能: 开启', () => applyMasterSwitch(true));
    GM_registerMenuCommand('📊 完整功能: 关闭', () => applyMasterSwitch(false));
    GM_registerMenuCommand('🎯 悬浮窗: 简约模式', () => setDisplayMode('simple'));
    GM_registerMenuCommand('📋 悬浮窗: 完整模式', () => setDisplayMode('full'));
})();