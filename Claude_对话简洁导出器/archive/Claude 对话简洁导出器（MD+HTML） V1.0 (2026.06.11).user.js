// ==UserScript==
// @name                Claude 对话简洁导出器（MD+HTML）
// @name:zh-CN           Claude 对话简洁导出器
// @namespace            https://github.com/ddrwin/userscripts
// @version              1.0.0
// @author               ddrwin
// @license              MIT
// @description          Export Claude.ai conversations to clean Markdown or HTML — conversation only, no tool calls or document noise.
// @description:zh-CN    在 claude.ai 对话页面添加导出按钮，支持导出为简洁版 Markdown 或 HTML。
//                       只保留用户对话、Claude 回复和思考过程，过滤掉工具调用、文档原文等干扰内容。
// @match                https://claude.ai/*
// @grant                none
// @run-at               document-idle
// @downloadURL          https://raw.githubusercontent.com/ddrwin/greasyfork-scripts/main/Claude_%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8/Claude%20%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8%EF%BC%88MD+HTML%EF%BC%89%20V1.0%20(2026.06.11).user.js
// @updateURL            https://raw.githubusercontent.com/ddrwin/greasyfork-scripts/main/Claude_%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8/Claude%20%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8%EF%BC%88MD+HTML%EF%BC%89%20V1.0%20(2026.06.11).meta.js
// ==/UserScript==

(function () {
  'use strict';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Helpers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function escapeHtml(t) {
    if (!t) return '';
    return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escapeAttr(t) { return escapeHtml(t); }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9_\-\s一-鿿]/g, '').replace(/\s+/g, '-').substring(0, 80) || 'claude-chat';
  }

  const _cp1252Rev = (() => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const chars = new TextDecoder('windows-1252').decode(bytes);
    const map = new Map();
    for (let i = 0x80; i < 0x100; i++) map.set(chars.charCodeAt(i), i);
    return map;
  })();

  function fixMojibake(text) {
    if (!text) return text;
    const toByte = ch => { const c = ch.charCodeAt(0); return c < 0x80 ? c : (_cp1252Rev.get(c) ?? -1); };
    let out = '', i = 0;
    while (i < text.length) {
      const b0 = toByte(text[i]);
      if (b0 >= 0xC2 && b0 <= 0xF4) {
        const seqLen = b0 < 0xE0 ? 2 : b0 < 0xF0 ? 3 : 4;
        if (i + seqLen <= text.length) {
          let valid = true, cp = b0 & (seqLen === 2 ? 0x1F : seqLen === 3 ? 0x0F : 0x07);
          for (let j = 1; j < seqLen; j++) {
            const b = toByte(text[i + j]);
            if (b < 0x80 || b > 0xBF) { valid = false; break; }
            cp = (cp << 6) | (b & 0x3F);
          }
          if (valid && cp >= [0, 0, 0x80, 0x800, 0x10000][seqLen] && cp <= 0x10FFFF) {
            out += String.fromCodePoint(cp); i += seqLen; continue;
          }
        }
      }
      out += text[i++];
    }
    return out;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  API — fetch conversation data from Claude
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async function fetchOrgId() {
    const r = await fetch('https://claude.ai/api/organizations', { credentials: 'include' });
    if (!r.ok) throw new Error(r.status === 403 ? '未登录' : '获取组织信息失败: ' + r.status);
    const orgs = await r.json();
    if (!orgs?.[0]?.uuid) throw new Error('未找到组织信息');
    return orgs[0].uuid;
  }

  function getConvId() {
    const m = location.pathname.match(/\/chat\/([a-f0-9-]+)/);
    if (!m) throw new Error('请在对话页面使用');
    return m[1];
  }

  async function fetchConversation(orgId, convId) {
    const r = await fetch(
      `https://claude.ai/api/organizations/${orgId}/chat_conversations/${convId}?rendering_mode=messages&render_all_tools=true`,
      { credentials: 'include' }
    );
    if (!r.ok) throw new Error('获取对话失败: ' + r.status);
    return JSON.parse(fixMojibake(await r.text()));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Content Filter — keep only text + thinking, strip tools/files/docs
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Filter a message's content blocks — only keep text and thinking.
   * User messages: keep text, skip file/document details.
   * Assistant messages: keep text + thinking blocks, strip everything else.
   */
  function filterBlocks(blocks, sender) {
    if (!blocks?.length) return [];
    const keepTypes = new Set(['text', 'thinking', 'redacted_thinking']);
    return blocks.filter(b => keepTypes.has(b.type));
  }

  /**
   * Process conversation: sort messages, filter each, build clean array.
   * Returns [{sender, role, textParts, thinking}]
   */
  function processConversation(conv) {
    const msgs = (conv.chat_messages || []).sort((a, b) => (a.index || 0) - (b.index || 0));
    return msgs.map(msg => {
      const role = msg.sender === 'human' ? 'user' : 'assistant';
      const filtered = filterBlocks(msg.content || [], msg.sender);

      const textParts = [];   // text blocks
      const thinking = [];    // thinking blocks

      for (const b of filtered) {
        if (b.type === 'thinking') {
          thinking.push(b.thinking || b.text || '');
        } else if (b.type === 'redacted_thinking') {
          thinking.push('[思考过程已隐藏]');
        } else if (b.type === 'text') {
          textParts.push(b.text || '');
        }
      }

      return {
        sender: msg.sender,
        role,
        textParts,
        thinking: thinking.join('\n\n'),
        hasThinking: thinking.length > 0,
      };
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Syntax Highlighting (for HTML export)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const KEYWORDS = {
    js: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|new|try|catch|throw|typeof|instanceof|in|of|switch|case|break|continue|do|this|super|extends|yield|delete|void|null|undefined|true|false)\b/g,
    python: /\b(def|class|if|elif|else|for|while|import|from|return|try|except|raise|with|as|in|not|and|or|is|None|True|False|self|lambda|yield|pass|break|continue|global|nonlocal|async|await|print)\b/g,
    bash: /\b(if|then|else|fi|for|do|done|while|case|esac|function|return|echo|exit|export|source|local|readonly|declare|set|unset|cd|ls|grep|awk|sed|cat|mkdir|rm|cp|mv|chmod|chown)\b/g,
    default: /\b(function|return|if|else|for|while|class|import|export|const|let|var|new|try|catch|throw|true|false|null|void|this|async|await|def|self|None|print)\b/g,
  };

  function highlight(code, lang) {
    if (!lang || lang === 'text' || lang === 'plaintext') return code;
    const map = { javascript:'js', typescript:'js', jsx:'js', tsx:'js', py:'python', sh:'bash', shell:'bash', zsh:'bash' };
    const nl = map[lang] || lang;
    let tokens = [], rem = code;
    while (rem.length > 0) {
      let m;
      if ((m = rem.match(/^(\/\/.*|#(?!!\/)[^\n]*)/))) { tokens.push(`<span class="hl-comment">${m[0]}</span>`); rem = rem.slice(m[0].length); continue; }
      if ((m = rem.match(/^\/\*[\s\S]*?\*\//))) { tokens.push(`<span class="hl-comment">${m[0]}</span>`); rem = rem.slice(m[0].length); continue; }
      if ((m = rem.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/))) { tokens.push(`<span class="hl-string">${m[0]}</span>`); rem = rem.slice(m[0].length); continue; }
      if ((m = rem.match(/^\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/))) { tokens.push(`<span class="hl-number">${m[0]}</span>`); rem = rem.slice(m[0].length); continue; }
      const kw = KEYWORDS[nl] || KEYWORDS.default; kw.lastIndex = 0;
      if ((m = rem.match(new RegExp(`^${kw.source}`)))) { tokens.push(`<span class="hl-keyword">${m[0]}</span>`); rem = rem.slice(m[0].length); continue; }
      tokens.push(rem[0]); rem = rem.slice(1);
    }
    return tokens.join('');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Markdown Parser (simplified, for HTML export)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function inlineFmt(text) {
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => /^\s*javascript:/i.test(u) ? t : `<a href="${u.replace(/"/g,'&quot;')}" target="_blank" rel="noopener">${t}</a>`);
    return text;
  }

  function parseMd(text) {
    if (!text) return '';
    let html = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    html = html.replace(/```([^\n`]*?)\n([\s\S]*?)```/g, (_, lang, code) => {
      const l = lang.trim();
      return `<pre class="code-block" data-lang="${escapeHtml(l)}"><code class="language-${escapeHtml(l||'text')}">${highlight(code.trim(), l)}</code></pre>`;
    });
    html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
    const lines = html.split('\n');
    let res = [], inUl = false, inOl = false, inBq = false;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.includes('<pre class="code-block"')) {
        let block = line;
        while (!block.includes('</pre>') && i < lines.length - 1) { i++; block += '\n' + lines[i]; }
        res.push(block); inUl = false; inOl = false; inBq = false; continue;
      }
      let hm = line.match(/^(#{1,6})\s+(.+)$/);
      if (hm) { closeLists(); res.push(`<h${hm[1].length}>${inlineFmt(hm[2])}</h${hm[1].length}>`); continue; }
      if (line.match(/^(\-{3,}|\*{3,}|_{3,})$/)) { closeLists(); res.push('<hr>'); continue; }
      if (line.match(/^&gt;\s?/)) {
        if (!inBq) { closeLists(); res.push('<blockquote>'); inBq = true; }
        res.push(`<p>${inlineFmt(line.replace(/^&gt;\s?/, ''))}</p>`); continue;
      } else if (inBq) { res.push('</blockquote>'); inBq = false; }
      if (line.match(/^[\s]*[-*+]\s+/)) {
        if (!inUl) { closeLists(); res.push('<ul>'); inUl = true; }
        res.push(`<li>${inlineFmt(line.replace(/^[\s]*[-*+]\s+/, ''))}</li>`); continue;
      } else if (inUl && line.trim() === '') { continue; } else if (inUl) { res.push('</ul>'); inUl = false; }
      if (line.match(/^[\s]*\d+\.\s+/)) {
        if (!inOl) { closeLists(); res.push('<ol>'); inOl = true; }
        res.push(`<li>${inlineFmt(line.replace(/^[\s]*\d+\.\s+/, ''))}</li>`); continue;
      } else if (inOl && line.trim() === '') { continue; } else if (inOl) { res.push('</ol>'); inOl = false; }
      if (line.trim() === '') continue;
      res.push(`<p>${inlineFmt(line)}</p>`);
    }
    closeLists();
    return res.join('\n');

    function closeLists() {
      if (inUl) { res.push('</ul>'); inUl = false; }
      if (inOl) { res.push('</ol>'); inOl = false; }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Markdown Renderer — clean MD with thinking
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function renderBlocksAsText(blocks) {
    if (!blocks?.length) return '';
    return blocks.map(b => {
      if (b.type === 'text') return b.text || '';
      if (b.type === 'thinking') return '';
      if (b.type === 'redacted_thinking') return '';
      return '';
    }).join('\n\n').trim();
  }

  function buildMarkdown(conv, filtered) {
    const title = conv.name || 'Claude 对话';
    const model = conv.model || 'claude';
    const createdAt = conv.created_at ? new Date(conv.created_at).toLocaleString('zh-CN') : '';

    let md = `# ${title}\n\n`;
    md += `> 模型: ${model}  ·  创建: ${createdAt}\n\n`;
    md += `---\n\n`;

    for (const msg of filtered) {
      if (msg.role === 'user') {
        md += `## 你\n\n`;
        md += msg.textParts.join('\n\n') + '\n\n';
      } else {
        md += `## Claude\n\n`;

        // Thinking block first (collapsible in MD via blockquote)
        if (msg.hasThinking) {
          md += `> 💭 **思考过程**\n>\n`;
          const thinkLines = msg.thinking.split('\n');
          for (const line of thinkLines) {
            md += `> ${line}\n`;
          }
          md += `>\n> ---\n>\n`;
        }

        // Response text
        md += msg.textParts.join('\n\n') + '\n\n';
      }

      md += `---\n\n`;
    }

    return md.trim();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Clean HTML Renderer — based on midasgao's exporter, simplified
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function renderBlocksHtml(filtered) {
    if (!filtered?.length) return '';
    return filtered.map(b => {
      switch (b.type) {
        case 'text': return `<div class="text-block">${parseMd(b.text)}</div>`;
        case 'thinking': return `<details class="thinking-block" open><summary><span class="thinking-icon">💭</span> 思考过程</summary><div class="thinking-content">${parseMd(b.thinking || b.text || '')}</div></details>`;
        case 'redacted_thinking': return `<div class="redacted-thinking">💭 思考过程（已隐藏）</div>`;
        default: return '';
      }
    }).join('\n');
  }

  function buildCleanHTML(conv, filtered) {
    const title = conv.name || 'Claude 对话';
    const model = conv.model || 'claude';
    const createdAt = conv.created_at ? new Date(conv.created_at).toLocaleString('zh-CN') : '';

    let messagesHtml = '';
    for (const msg of filtered) {
      const isHuman = msg.sender === 'human';
      const contentHtml = renderBlocksHtml(msg.textParts.map(t => ({type: 'text', text: t})).concat(
        msg.hasThinking ? [{type: 'thinking', thinking: msg.thinking}] : []
      ));
      messagesHtml += `<div class="message message-${msg.sender}">
        <div class="message-avatar ${msg.sender}-avatar">${isHuman ? 'H' : 'C'}</div>
        <div class="message-body">
          <div class="message-sender">${isHuman ? '你' : 'Claude'}</div>
          <div class="message-content">${contentHtml}</div>
        </div>
      </div>`;
    }

    const css = `
:root {
  --bg-primary: #f5f4ef;
  --bg-secondary: #eae8e1;
  --bg-msg-human: #e8e5db;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6560;
  --text-muted: #9a948e;
  --accent: #c96442;
  --accent-light: rgba(201,100,66,.1);
  --border: #d8d4cc;
  --code-bg: #2b2926;
  --code-text: #e8e4da;
  --thinking-bg: #edeadf;
  --thinking-border: #d4d0c5;
  --header-bg: #f5f4ef;
  --radius: 8px;
  --radius-sm: 4px;
}
[data-theme="dark"] {
  --bg-primary: #1a1916;
  --bg-secondary: #232220;
  --bg-msg-human: #2a2824;
  --text-primary: #e8e4da;
  --text-secondary: #a09890;
  --text-muted: #706860;
  --accent: #d4805e;
  --accent-light: rgba(212,128,94,.1);
  --border: #3a3632;
  --code-bg: #111110;
  --code-text: #d4d0c5;
  --thinking-bg: #222120;
  --thinking-border: #3a3632;
  --header-bg: #1a1916;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;background:var(--bg-primary);color:var(--text-primary);line-height:1.6;font-size:15px}
.page-header{position:sticky;top:0;z-index:100;background:var(--header-bg);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(8px)}
.header-left{display:flex;align-items:center;gap:12px}
.header-title h1{font-size:16px;font-weight:600}
.header-meta{font-size:12px;color:var(--text-muted)}
.header-actions button{background:none;border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;cursor:pointer;color:var(--text-secondary);font-size:13px;margin-left:6px}
.header-actions button:hover{background:var(--bg-secondary)}
.conversation{max-width:48rem;margin:0 auto;padding:24px 16px 80px}
.message{display:flex;gap:16px;padding:24px 0}
.message+.message{border-top:1px solid var(--border)}
.message-avatar{width:28px;height:28px;min-width:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;margin-top:2px}
.human-avatar{background:var(--bg-msg-human);color:var(--text-primary);border:1px solid var(--border)}
.assistant-avatar{background:var(--accent-light);color:var(--accent)}
.message-body{flex:1;min-width:0}
.message-sender{font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-secondary)}
.message-content{overflow-wrap:break-word}
.message-content p{margin-bottom:.75em}
.message-content h1{font-size:1.5em;margin:1em 0 .5em}
.message-content h2{font-size:1.3em;margin:1em 0 .5em}
.message-content h3{font-size:1.1em;margin:.8em 0 .4em}
.message-content ul,.message-content ol{padding-left:1.5em;margin-bottom:.75em}
.message-content li{margin-bottom:.25em}
.message-content blockquote{border-left:3px solid var(--accent);padding:.5em 1em;margin:.75em 0;color:var(--text-secondary);background:var(--thinking-bg)}
.message-content table{border-collapse:collapse;margin:.75em 0;width:100%}
.message-content th,.message-content td{border:1px solid var(--border);padding:8px 12px}
.message-content th{background:var(--bg-secondary);font-weight:600}
.message-content a{color:var(--accent)}
.inline-code{background:var(--bg-secondary);padding:2px 6px;border-radius:3px;font-family:'SF Mono',Monaco,monospace;font-size:.9em}
.code-block{background:var(--code-bg);color:var(--code-text);border-radius:var(--radius);padding:16px;margin:.75em 0;overflow-x:auto;font-family:'SF Mono',Monaco,monospace;font-size:13px;line-height:1.5;position:relative}
.code-block code{background:none;padding:0}
.code-block .copy-btn{position:absolute;top:8px;right:8px;background:rgba(255,255,255,.1);border:none;border-radius:var(--radius-sm);padding:4px 8px;cursor:pointer;color:var(--code-text);font-size:11px;opacity:0;transition:opacity .15s}
.code-block:hover .copy-btn{opacity:1}
.hl-keyword{color:#c678dd}
.hl-string{color:#98c379}
.hl-comment{color:#5c6370;font-style:italic}
.hl-number{color:#d19a66}
.thinking-block{background:var(--thinking-bg);border:1px solid var(--thinking-border);border-radius:var(--radius);margin:.75em 0}
.thinking-block summary{padding:10px 16px;cursor:pointer;font-size:14px;color:var(--text-secondary)}
.thinking-content{padding:0 16px 16px;font-size:14px;color:var(--text-secondary)}
.redacted-thinking{background:var(--thinking-bg);border:1px solid var(--thinking-border);border-radius:var(--radius);padding:10px 16px;margin:.75em 0;color:var(--text-muted)}
@media(max-width:640px){.conversation{padding:16px 12px 60px}.message{gap:12px;padding:16px 0}.page-header{padding:10px 12px}}
`;

    return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
<header class="page-header">
  <div class="header-left">
    <div style="color:var(--accent);font-size:20px">C</div>
    <div class="header-title">
      <h1>${escapeHtml(title)}</h1>
      <div class="header-meta">${escapeHtml(model)} · ${escapeHtml(createdAt)}</div>
    </div>
  </div>
  <div class="header-actions">
    <button id="expand-all-btn">💭 展开/折叠思考</button>
    <button id="theme-toggle">🌓 主题</button>
  </div>
</header>
<main class="conversation">${messagesHtml}</main>
<script>
(function(){
  var t=document.getElementById('theme-toggle'),h=document.documentElement;
  t.addEventListener('click',function(){
    var c=h.getAttribute('data-theme'),n=c==='dark'?'light':'dark';
    h.setAttribute('data-theme',n);
  });
  var e=false;
  document.getElementById('expand-all-btn').addEventListener('click',function(){
    e=!e;
    document.querySelectorAll('.thinking-block').forEach(function(d){d.open=e;});
  });
  document.querySelectorAll('.code-block').forEach(function(b){
    var btn=document.createElement('button');
    btn.className='copy-btn';
    btn.textContent='复制';
    btn.addEventListener('click',function(){
      navigator.clipboard.writeText(b.querySelector('code').textContent).then(function(){
        btn.textContent='已复制!';
        setTimeout(function(){btn.textContent='复制';},1500);
      });
    });
    b.appendChild(btn);
  });
})();
</script>
</body>
</html>`;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Download
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function download(content, filename, type) {
    const blob = new Blob([content], { type: type + '; charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  UI — floating button with dropdown
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function isOnChatPage() { return /\/chat\/[a-f0-9-]+/.test(location.pathname); }

  function createUI() {
    if (document.getElementById('cce-ui')) return;

    const container = document.createElement('div');
    container.id = 'cce-ui';
    container.innerHTML = [
      '<div id="cce-main-btn" title="导出对话">',
      '  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
      '    <polyline points="7 10 12 15 17 10"/>',
      '    <line x1="12" y1="15" x2="12" y2="3"/>',
      '  </svg>',
      '</div>',
      '<div id="cce-menu">',
      '  <button class="cce-menu-item" data-format="md">📝 导出 Markdown</button>',
      '  <button class="cce-menu-item" data-format="html">📄 导出 HTML（简洁版）</button>',
      '</div>',
    ].join('\n');
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;';

    const mainBtn = container.querySelector('#cce-main-btn');
    mainBtn.style.cssText = 'width:48px;height:48px;border-radius:50%;background:#c96442;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:all .2s;';
    mainBtn.onmouseenter = () => mainBtn.style.transform = 'scale(1.1)';
    mainBtn.onmouseleave = () => mainBtn.style.transform = 'scale(1)';

    const menu = container.querySelector('#cce-menu');
    menu.style.cssText = 'display:none;flex-direction:column;background:var(--cce-menu-bg,#fff);border:1px solid var(--cce-menu-border,#e0ddd5);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);overflow:hidden;min-width:220px;';
    // Adapt to dark claude theme
    menu.style.background = '#fff';
    menu.style.borderColor = '#e0ddd5';

    // Toggle menu on button click
    mainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.style.display === 'flex') {
        menu.style.display = 'none';
      } else {
        menu.style.display = 'flex';
      }
    });

    // Menu items
    menu.querySelectorAll('.cce-menu-item').forEach(btn => {
      btn.style.cssText = 'padding:12px 16px;border:none;background:none;cursor:pointer;font-size:14px;text-align:left;display:flex;align-items:center;gap:8px;color:#333;transition:background .15s;font-family:system-ui;';
      btn.onmouseenter = () => btn.style.background = '#f5f4ef';
      btn.onmouseleave = () => btn.style.background = 'none';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fmt = btn.dataset.format;
        menu.style.display = 'none';
        doExport(fmt);
      });
    });

    // Close menu on outside click
    document.addEventListener('click', () => { menu.style.display = 'none'; });

    document.body.appendChild(container);
  }

  function removeUI() {
    const el = document.getElementById('cce-ui');
    if (el) el.remove();
  }

  function setMainBtnState(state) {
    const btn = document.querySelector('#cce-main-btn');
    if (!btn) return;
    if (state === 'loading') {
      btn.style.opacity = '0.7'; btn.style.pointerEvents = 'none';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="30 70"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';
    } else if (state === 'done') {
      btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.style.background = '#4a9e6a';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => { btn.style.background = '#c96442'; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'; }, 2000);
    } else if (state === 'error') {
      btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.style.background = '#e05252';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      setTimeout(() => { btn.style.background = '#c96442'; btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'; }, 3000);
    }
  }

  async function doExport(format) {
    setMainBtnState('loading');
    try {
      const orgId = await fetchOrgId();
      const convId = getConvId();
      const conv = await fetchConversation(orgId, convId);
      const filtered = processConversation(conv);
      const baseName = sanitizeFilename(conv.name || 'claude-chat');

      if (format === 'md') {
        const md = buildMarkdown(conv, filtered);
        download(md, baseName + '.md', 'text/markdown');
      } else if (format === 'html') {
        const html = buildCleanHTML(conv, filtered);
        download(html, baseName + '.html', 'text/html');
      }

      setMainBtnState('done');
    } catch (err) {
      console.error('CCE error:', err);
      setMainBtnState('error');
      alert('导出失败: ' + err.message);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Init
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function ensureUI() {
    if (isOnChatPage()) createUI();
    else removeUI();
  }

  function init() {
    ensureUI();
    setTimeout(ensureUI, 1000);
    setTimeout(ensureUI, 3000);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

  let lastPath = location.pathname;
  const observer = new MutationObserver(() => {
    if (location.pathname !== lastPath) { lastPath = location.pathname; ensureUI(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', () => { lastPath = location.pathname; ensureUI(); });
})();
