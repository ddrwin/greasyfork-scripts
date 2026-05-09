// ==UserScript==
// @name         DeepSeek Usage Token 千分位 & 缓存命中率 (XHR修复版)
// @namespace    http://tampermonkey.net/
// @version      7.1
// @description  悬浮窗显示缓存命中率（基于 API 数据），Token 千分位。V7.1 修复：同时劫持 XHR 和 fetch。
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
    const PREF_KEYS = { tokenFormat: 'token_format_enabled', cacheRateWin: 'cache_rate_window_enabled' };
    const DEFAULTS = { tokenFormat: true, cacheRateWin: true };
    const loadPref = k => GM_getValue(k) ?? DEFAULTS[k];
    const savePref = (k, v) => GM_setValue(k, v);

    // 2. 工具函数
    const formatNumber = s => s.trim().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    function shouldExclude(node) {
        const p = node.parentElement;
        if (!p) return true;
        const tag = p.tagName.toLowerCase();
        if (['script','style','input','textarea','code','pre','kbd','samp'].includes(tag)) return true;
        if (p.isContentEditable || p.closest('[contenteditable="true"]')) return true;
        if (p.closest('[data-ai-expert-skip]')) return true;
        return false;
    }

    // 3. 全局状态：Token 数据存储
    const TOKEN_DATA = {
        models: [],
        lastUpdateTime: null
    };

    // 4. 数据处理函数（复用）
    function processTokenData(jsonData) {
        try {
            const totalArray = jsonData?.data?.biz_data?.total;
            if (Array.isArray(totalArray)) {
                TOKEN_DATA.models = totalArray.map(model => ({
                    name: model.model,
                    cacheHit: parseInt(model.usage?.find(u => u.type === 'PROMPT_CACHE_HIT_TOKEN')?.amount || '0'),
                    cacheMiss: parseInt(model.usage?.find(u => u.type === 'PROMPT_CACHE_MISS_TOKEN')?.amount || '0'),
                    total: 0,
                    hitRate: 0
                })).filter(m => m.cacheHit > 0 || m.cacheMiss > 0);

                TOKEN_DATA.models.forEach(m => {
                    m.total = m.cacheHit + m.cacheMiss;
                    m.hitRate = m.total > 0 ? (m.cacheHit / m.total * 100).toFixed(2) : 0;
                });

                TOKEN_DATA.lastUpdateTime = Date.now();
                console.log('🚀 [API拦截] Token 数据已更新：', TOKEN_DATA.models);
                updateFloatContent();
            }
        } catch (e) {
            console.error('❌ [API拦截] 解析数据失败：', e);
        }
    }

    // 5. 数据拦截器（同时劫持 XHR 和 fetch）
    function installDataInterceptor() {
        // 5.1 劫持 XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this._url = url; // 记住 URL
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

        // 5.2 劫持 fetch（保留作为备用）
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

    // 6. 千分位格式化模块
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

    // 7. 悬浮窗模块
    let floatWin = null, isDragging = false, sx, sy, sl, st;
    function createFloatWindow() {
        if (floatWin) return;
        GM_addStyle(`
            .ai-expert-float { position:fixed; z-index:999999; width:250px; background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.15); border-radius:12px; font-family:system-ui; overflow:hidden; }
            .ai-expert-header { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#f0f4ff; cursor:move; border-bottom:1px solid #e2e8f0; }
            .ai-expert-header .title { font-weight:600; color:#1e293b; font-size:13px; }
            .ai-expert-header .actions button { background:none; border:none; font-size:16px; cursor:pointer; color:#64748b; }
            .ai-expert-body { padding:14px; font-size:13px; color:#334155; }
            .ai-expert-body .hit-rate { font-size:24px; font-weight:700; color:#0f172a; margin-bottom:8px; }
            .ai-expert-body .detail { font-size:12px; color:#64748b; line-height:1.5; }
            .ai-expert-body .detail span { font-weight:500; color:#334155; }
            .ai-expert-body .loading { font-style:italic; color:#94a3b8; text-align:center; padding:10px 0; }
            .ai-expert-minimized .ai-expert-body { display:none; }
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
        document.addEventListener('mouseup', () => isDragging = false);
        floatWin.querySelector('#min-btn').addEventListener('click', () => floatWin.classList.toggle('ai-expert-minimized'));
        floatWin.querySelector('#close-btn').addEventListener('click', () => {
            floatWin.style.display = 'none';
            savePref(PREF_KEYS.cacheRateWin, false);
        });
    }
    function updateFloatContent() {
        const body = document.getElementById('float-body');
        if (!body) return;
        if (TOKEN_DATA.models.length === 0) {
            body.innerHTML = '<div class="loading">⏳ 等待 API 数据...</div>';
            return;
        }
        let html = '';
        TOKEN_DATA.models.forEach(m => {
            html += `
                <div style="margin-bottom:12px;">
                    <div style="font-size:11px; color:#94a3b8; margin-bottom:2px;">${m.name}</div>
                    <div class="hit-rate">${m.hitRate}%</div>
                    <div class="detail">
                        ✅ 命中: <span>${formatNumber(m.cacheHit+'')}</span><br>
                        ⚡ 未命中: <span>${formatNumber(m.cacheMiss+'')}</span><br>
                        📊 总计: <span>${formatNumber(m.total+'')}</span>
                    </div>
                </div>
            `;
        });
        body.innerHTML = html;
    }
    function enableCacheRateWindow() {
        createFloatWindow();
        floatWin.style.display = 'block';
        updateFloatContent();
        console.log('📈 [悬浮窗] 缓存命中率悬浮窗已启用');
    }

    // 8. 启动自检与预警（铁律 §4.4）
    function startupSelfCheck() {
        setTimeout(() => {
            if (TOKEN_DATA.models.length === 0) {
                console.warn('🚨 [预警] 启动 1.5 秒后仍未接收到 API 数据。请确认是否在 Usage 页面？');
            }
        }, 1500);
    }

    // 9. 主控制器
    let formatEnabled = loadPref(PREF_KEYS.tokenFormat);
    let cacheEnabled = loadPref(PREF_KEYS.cacheRateWin);

    installDataInterceptor();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (formatEnabled) enableFormatting();
            if (cacheEnabled) enableCacheRateWindow();
            startupSelfCheck();
        });
    } else {
        if (formatEnabled) enableFormatting();
        if (cacheEnabled) enableCacheRateWindow();
        startupSelfCheck();
    }

    GM_registerMenuCommand('📊 开启 Token 千分位', () => {
        if (!formatEnabled) { formatEnabled = true; savePref(PREF_KEYS.tokenFormat, true); enableFormatting(); }
    });
    GM_registerMenuCommand('📊 关闭 Token 千分位', () => {
        if (formatEnabled) { formatEnabled = false; savePref(PREF_KEYS.tokenFormat, false); if (formatObserver) formatObserver.disconnect(); }
    });
    GM_registerMenuCommand('📈 显示缓存率悬浮窗', () => {
        if (!cacheEnabled) { cacheEnabled = true; savePref(PREF_KEYS.cacheRateWin, true); enableCacheRateWindow(); }
    });
    GM_registerMenuCommand('📈 隐藏缓存率悬浮窗', () => {
        if (cacheEnabled) { cacheEnabled = false; savePref(PREF_KEYS.cacheRateWin, false); if (floatWin) floatWin.style.display = 'none'; }
    });

})();