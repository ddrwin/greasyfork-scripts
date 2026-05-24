// ==UserScript==
// @name         DeepSeek 对话导出器 v1.5 (极简正序版)
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  导出 DeepSeek 对话全量历史，按日期由远及近正序排列。基于原版 0.0.9 数据捕获 + 排序修复。
// @author       Gao + Claude + ceyaima (v1.5 回归原版捕获)
// @license      Custom License
// @match        https://chat.deepseek.com/*
// @match        https://*.deepseek.com/a/chat/s/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

/*
  v1.5 改动说明：
  - [核心] 数据捕获方式完全回归 0.0.9（不插手指令、不设端点过滤、不提前 return）
  - [修复] 消息按 inserted_at 升序排序 → 永远正序
  - [精简] 去掉 GM_registerMenuCommand、includeThinking 开关、reverseOrder
  - [精简] 无菜单、无倒序、无冗余功能
*/

(function() {
    'use strict';

    const SID_RE = /\/chat\/s\/([0-9a-f-]{36})/i;
    let state = {
        target: null,  // { chat_session, chat_messages }
        sessionId: (location.href.match(SID_RE) || [])[1] || '',
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

                const files = [...(msg.files || [])];
                frags.forEach(f => f.type === 'FILE' && f.files && files.push(...f.files));
                if (files.length) {
                    md += `> **📁 Files:**\n`;
                    files.forEach(f => md += `> - ${f.file_name}${f.is_image ? ' 🖼' : ''} (${formatSize(f.file_size)})\n`);
                    md += `\n`;
                }

                const thinks = frags.filter(f => f.type === 'THINK');
                if (thinks.length) {
                    const total = thinks.reduce((s, t) => s + (+t.elapsed_secs || 0), 0);
                    md += `> **💭 Thinking (${total.toFixed(1)}s${thinks.length > 1 ? `, ${thinks.length} 步` : ''})**\n>\n`;
                    thinks.forEach((t, i) => {
                        if (thinks.length > 1) md += `> **Step ${i + 1}**\n`;
                        md += `> ${(t.content || '').replace(/\n/g, '\n> ')}\n${i < thinks.length - 1 ? '>\n' : ''}`;
                    });
                    md += `\n`;
                }

                const citations = {};
                frags.forEach(f => {
                    if ((f.type === 'SEARCH' || f.type === 'TOOL_SEARCH') && f.results)
                        f.results.forEach(r => r.cite_index != null && r.url && (citations[r.cite_index] = r.url));
                });

                let body = '';
                frags.forEach(f => {
                    if (f.type !== 'RESPONSE' && f.type !== 'REQUEST') return;
                    let c = f.content || '';
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

    // 按 API 返回顺序存储，不按 inserted_at 排序（同一问答对内该值可能颠倒）
    // 合并时按 id 去重，以已有顺序为准，新消息追加到末尾
    function mergeMessages(existing, incoming) {
        const seen = new Set();
        existing.forEach(m => m.id && seen.add(m.id));
        const result = [...existing];
        incoming.forEach(m => { if (m.id && !seen.has(m.id)) { seen.add(m.id); result.push(m); } });
        return result;
    }

    function setTarget(session, messages) {
        if (!session || !messages?.length) return;
        if (state.sessionId && session.id !== state.sessionId) return;
        if (state.target && state.target.chat_session.id === session.id) {
            // 合并，保留已有顺序
            state.target.chat_messages = mergeMessages(state.target.chat_messages, messages);
        } else {
            state.target = { chat_session: session, chat_messages: [...messages] };
        }
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

        const grip = document.createElement('div');
        Object.assign(grip.style, { width: '56px', height: '14px', cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center' });
        grip.innerHTML = '<div style="width:24px;height:3px;background:#3b82f6;border-radius:999px"></div>';
        grip.title = 'Drag to move';
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
            j.title = has ? `Ready (${state.target.chat_messages.length} msgs)` : 'Waiting...';
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

    // 网络拦截：与原版 0.0.9 完全一致 — 不设端点过滤，不提前 return
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

    // 消息处理器：与原版 0.0.9 完全一致 — 不插手指令，不添加过滤
    // 任何端点返回的可解析数据都会进入 setTarget
    window.addEventListener('message', e => {
        if (!e.data?.ds) return;
        try {
            const biz = JSON.parse(e.data.body)?.data?.biz_data;
            if (biz?.chat_session && biz.chat_messages?.length > 0) setTarget(biz.chat_session, biz.chat_messages);
        } catch {}
    });

    // IDB 回退（与原版 0.0.9 一致）
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

    // SPA 路由切换检测
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
    });
})();
