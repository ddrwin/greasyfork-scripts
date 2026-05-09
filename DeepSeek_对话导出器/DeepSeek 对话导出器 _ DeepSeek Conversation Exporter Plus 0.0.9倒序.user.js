// ==UserScript==
// @name         DeepSeek 对话导出器 | DeepSeek Conversation Exporter Plus
// @namespace    http://tampermonkey.net/
// @version      0.0.9
// @description  优雅导出 DeepSeek 对话记录，支持 JSON 和 Markdown 格式。适配 V4 网页版（专家/快速模式、深度搜索、多段思考链）。Elegantly export DeepSeek conversation records, supporting JSON and Markdown formats.
// @author       Gao + Claude + ceyaima
// @license      Custom License
// @match        https://chat.deepseek.com/*
// @match        https://*.deepseek.com/a/chat/s/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @downloadURL https://update.greasyfork.org/scripts/523474/DeepSeek%20%E5%AF%B9%E8%AF%9D%E5%AF%BC%E5%87%BA%E5%99%A8%20%7C%20DeepSeek%20Conversation%20Exporter%20Plus.user.js
// @updateURL https://update.greasyfork.org/scripts/523474/DeepSeek%20%E5%AF%B9%E8%AF%9D%E5%AF%BC%E5%87%BA%E5%99%A8%20%7C%20DeepSeek%20Conversation%20Exporter%20Plus.meta.js
// ==/UserScript==

/*
 您可以在个人设备上使用和修改该代码。
 不得将该代码或其修改版本重新分发、再发布或用于其他公众渠道。
 保留所有权利，未经授权不得用于商业用途。
*/

/*
You may use and modify this code on your personal devices.
You may not redistribute, republish, or use this code or its modified versions in other public channels.
All rights reserved. Unauthorized commercial use is prohibited.
*/

(function() {
    'use strict';

    const SID_RE = /\/chat\/s\/([0-9a-f-]{36})/i;
    let state = {
        target: null,  // { chat_session, chat_messages }
        sessionId: (location.href.match(SID_RE) || [])[1] || '',
        includeThinking: localStorage.getItem('ds_export_thinking') !== 'false'
    };

    function formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function convertToMd(d) {
        try {
            const s = d.chat_session, msgs = d.chat_messages;
            let md = `# DeepSeek - ${s.title || 'Untitled'}\n\n`;
            md += `> Model: ${s.model_type || 'unknown'}\n> Exported: ${new Date().toLocaleString()}\n\n`;

            msgs.forEach(msg => {
                const role = msg.role === 'USER' ? '👤 Human' : '🤖 Assistant';
                const time = new Date(msg.inserted_at * 1000).toLocaleString();
                md += `### ${role}\n*${time}*\n\n`;

                const frags = msg.fragments || [];
                const byId = {};
                frags.forEach(f => byId[f.id] = f);

                // 文件（V4 在 type=FILE 的 fragment 里；老版本兼容 msg.files）
                const files = [...(msg.files || [])];
                frags.forEach(f => f.type === 'FILE' && f.files && files.push(...f.files));
                if (files.length) {
                    md += `> **📁 Files:**\n`;
                    files.forEach(f => md += `> - ${f.file_name}${f.is_image ? ' 🖼' : ''} (${formatSize(f.file_size)})\n`);
                    md += `\n`;
                }

                // 思考链（V4 可能多段 THINK 穿插在工具调用之间，不再只有一段）
                const thinks = frags.filter(f => f.type === 'THINK');
                if (state.includeThinking && thinks.length) {
                    const total = thinks.reduce((s, t) => s + (+t.elapsed_secs || 0), 0);
                    md += `> **💭 Thinking (${total.toFixed(1)}s${thinks.length > 1 ? `, ${thinks.length} 步` : ''})**\n>\n`;
                    thinks.forEach((t, i) => {
                        if (thinks.length > 1) md += `> **Step ${i + 1}**\n`;
                        md += `> ${(t.content || '').replace(/\n/g, '\n> ')}\n${i < thinks.length - 1 ? '>\n' : ''}`;
                    });
                    md += `\n`;
                }

                // 旧的 [citation:N] 引用表（V4 仍然在用，并未移除）
                const citations = {};
                frags.forEach(f => {
                    if ((f.type === 'SEARCH' || f.type === 'TOOL_SEARCH') && f.results)
                        f.results.forEach(r => r.cite_index != null && r.url && (citations[r.cite_index] = r.url));
                });

                // 正文
                let body = '';
                frags.forEach(f => {
                    if (f.type !== 'RESPONSE' && f.type !== 'REQUEST') return;
                    let c = f.content || '';
                    // V4 新格式 [reference:N] -> fragment.references[N].id -> 同消息内的 fragment
                    if (f.references) c = c.replace(/\[reference:(\d+)\]/g, (m, i) => {
                        const ref = f.references[+i], target = ref && byId[ref.id];
                        const url = target?.result?.url || target?.results?.[0]?.url;
                        return url ? ` [[${+i + 1}]](${url})` : m;
                    });
                    body += c;
                });
                body = body.replace(/\[citation:(\d+)\]/g, (m, id) => citations[id] ? ` [[${id}]](${citations[id]})` : m);
                body = body.replace(/\$\$(.*?)\$\$/gs, (m, f) => f.includes('\n') ? `\n$$\n${f.trim()}\n$$\n` : `$$${f}$$`);
                md += body;

                // 来源汇总
                const sources = [], seen = new Set();
                frags.forEach(f => {
                    if ((f.type === 'SEARCH' || f.type === 'TOOL_SEARCH') && f.results)
                        f.results.forEach(r => r.url && !seen.has(r.url) && (seen.add(r.url), sources.push(r)));
                    else if (f.type === 'TOOL_OPEN' && f.result?.url && !seen.has(f.result.url))
                        seen.add(f.result.url), sources.push(f.result);
                });
                if (sources.length) {
                    md += `\n\n> **🔗 Sources:**\n`;
                    sources.forEach(r => md += `> - [${r.title || r.url}](${r.url})\n`);
                }
                md += `\n\n---\n\n`;
            });
            return md;
        } catch (e) { return "Export failed: " + e.message; }
    }

    function setTarget(session, messages) {
        if (!session || !messages?.length) return;
        if (state.sessionId && session.id !== state.sessionId) return;
        state.target = { chat_session: session, chat_messages: messages };
        updateStatus();
    }

    function createUI() {
        if (document.getElementById('ds_export_root')) { updateStatus(); return; }
        const root = document.createElement('div');
        root.id = 'ds_export_root';
        Object.assign(root.style, {
            position: 'fixed', top: '45%', right: '12px', zIndex: '10000',
            display: 'flex', flexDirection: 'column', gap: '6px',
            opacity: '0.4', transition: 'opacity 0.3s'
        });
        const btnStyle = {
            width: '56px', height: '34px', border: 'none', borderRadius: '6px',
            color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'all 0.2s'
        };
        const jsonBtn = document.createElement('button');
        jsonBtn.id = 'ds_json'; jsonBtn.innerText = 'JSON';
        Object.assign(jsonBtn.style, btnStyle);
        const mdBtn = document.createElement('button');
        mdBtn.id = 'ds_md'; mdBtn.innerText = 'MD';
        Object.assign(mdBtn.style, btnStyle);
        jsonBtn.onclick = () => state.target && download(JSON.stringify({ code: 0, msg: '', data: { biz_code: 0, biz_msg: '', biz_data: state.target } }, null, 2), 'json');
        mdBtn.onclick = () => state.target && download(convertToMd(state.target), 'md');
        root.onmouseenter = () => root.style.opacity = '1';
        root.onmouseleave = () => root.style.opacity = '0.4';

        // 拖拽手柄（位于两按钮之间），位置存 localStorage
        const grip = document.createElement('div');
        Object.assign(grip.style, { width: '56px', height: '14px', cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center' });
        grip.innerHTML = '<div style="width:24px;height:3px;background:#3b82f6;border-radius:999px"></div>';
        grip.title = 'Drag to move | 拖动';
        grip.onmousedown = e => {
            e.preventDefault();
            const sx = e.clientX, sy = e.clientY, r = root.getBoundingClientRect();
            const mv = e2 => Object.assign(root.style, {
                left: Math.max(0, Math.min(innerWidth - root.offsetWidth, r.left + e2.clientX - sx)) + 'px',
                top: Math.max(0, Math.min(innerHeight - root.offsetHeight, r.top + e2.clientY - sy)) + 'px',
                right: 'auto'
            });
            const up = () => {
                document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
                localStorage.setItem('ds_export_pos', JSON.stringify({ left: parseInt(root.style.left), top: parseInt(root.style.top) }));
            };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        };

        root.appendChild(jsonBtn); root.appendChild(grip); root.appendChild(mdBtn);
        document.body.appendChild(root);

        // 恢复上次位置，超出当前屏幕则夹回可见区域
        const pos = JSON.parse(localStorage.getItem('ds_export_pos') || 'null');
        if (pos) Object.assign(root.style, {
            left: Math.max(0, Math.min(pos.left, innerWidth - root.offsetWidth)) + 'px',
            top: Math.max(0, Math.min(pos.top, innerHeight - root.offsetHeight)) + 'px',
            right: 'auto'
        });
        updateStatus();
    }

    function updateStatus() {
        const has = !!state.target;
        const j = document.getElementById('ds_json'), m = document.getElementById('ds_md');
        if (j && m) {
            j.style.backgroundColor = has ? '#28a745' : '#007bff';
            m.style.backgroundColor = has ? '#28a745' : '#007bff';
            j.title = has ? `Data Ready (${state.target.chat_messages.length} 条)` : 'Waiting...';
            m.title = j.title;
        }
    }

    function download(content, ext) {
        const title = (state.target.chat_session.title || 'DeepSeek').replace(/[\/\\?%*:|"<>]/g, '-');
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
        a.click();
    }

    // 网络拦截：注入到页面 window（沙箱里改 prototype 拦不到页面发的请求）
    // V4 的接口走 XHR，但同时 hook fetch 防止以后改造
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (!w.__DS_HOOKED__) {
        w.__DS_HOOKED__ = true;
        const URL_RE = /\/api\/v0\/chat\/(history_messages|completion)/;
        const post = body => w.postMessage({ ds: 1, body }, '*');

        const _f = w.fetch;
        w.fetch = async function(...args) {
            const r = await _f.apply(this, args);
            const url = r.url || (typeof args[0] === 'string' ? args[0] : args[0]?.url) || '';
            if (URL_RE.test(url)) r.clone().text().then(post).catch(() => {});
            return r;
        };

        const _open = w.XMLHttpRequest.prototype.open;
        w.XMLHttpRequest.prototype.open = function(m, url) {
            this.__url = url;
            this.addEventListener('load', () => URL_RE.test(this.responseURL || url) && post(this.responseText));
            return _open.apply(this, arguments);
        };
    }

    window.addEventListener('message', e => {
        if (!e.data?.ds) return;
        try {
            const biz = JSON.parse(e.data.body)?.data?.biz_data;
            // V4: 二次访问时返回 cache_control:"MERGE" + 空 chat_messages，得读 IDB
            if (biz?.chat_session && biz.chat_messages?.length > 0) setTarget(biz.chat_session, biz.chat_messages);
        } catch {}
    });

    // IndexedDB 回退（MERGE 模式下完整对话只在客户端 IDB 缓存里）
    async function readIDB() {
        if (!state.sessionId || !indexedDB.databases) return;
        const find = (v, depth = 0) => {
            if (!v || typeof v !== 'object' || depth > 8) return null;
            if (v.chat_session?.id === state.sessionId && v.chat_messages?.length > 0) return v;
            for (const item of (Array.isArray(v) ? v : Object.values(v))) {
                const r = find(item, depth + 1);
                if (r) return r;
            }
            return null;
        };
        for (const { name } of await indexedDB.databases()) {
            if (!name) continue;
            try {
                const db = await new Promise((res, rej) => {
                    const r = indexedDB.open(name);
                    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
                });
                for (const store of db.objectStoreNames) {
                    const records = await new Promise(res => {
                        const out = [], req = db.transaction(store, 'readonly').objectStore(store).openCursor();
                        req.onsuccess = e => { const c = e.target.result; if (!c) return res(out); out.push(c.value); c.continue(); };
                        req.onerror = () => res(out);
                    });
                    for (const v of records) {
                        const found = find(v);
                        if (found) { setTarget(found.chat_session, found.chat_messages); db.close(); return; }
                    }
                }
                db.close();
            } catch {}
        }
    }

    // SPA 路由切换检测（V4 切会话不刷新页面）
    const onUrlChange = () => {
        const id = (location.href.match(SID_RE) || [])[1] || '';
        if (id !== state.sessionId) {
            state.sessionId = id; state.target = null; updateStatus();
            setTimeout(() => !state.target && state.sessionId && readIDB(), 800);
        }
    };
    window.addEventListener('popstate', onUrlChange);
    const _ps = history.pushState;
    history.pushState = function() { const r = _ps.apply(this, arguments); onUrlChange(); return r; };

    window.addEventListener('load', () => {
        createUI();
        setInterval(createUI, 2000);
        setTimeout(() => !state.target && state.sessionId && readIDB(), 1500);
        GM_registerMenuCommand(state.includeThinking ? '✅ Include Thinking' : '❌ Exclude Thinking', () => {
            state.includeThinking = !state.includeThinking;
            localStorage.setItem('ds_export_thinking', state.includeThinking);
            location.reload();
        });
    });
})();