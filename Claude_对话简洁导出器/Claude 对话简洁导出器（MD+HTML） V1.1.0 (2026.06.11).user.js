// ==UserScript==
// @name                Claude 对话简洁导出器（MD+HTML）
// @name:zh-CN           Claude 对话简洁导出器
// @namespace            https://github.com/ddrwin/userscripts
// @version              1.1.0
// @author               ddrwin
// @license              MIT
// @description          Export Claude.ai conversations to clean Markdown or HTML — conversation only, no tool calls or document noise.
// @description:zh-CN    在 claude.ai 对话页面添加导出按钮，支持简洁版（仅对话+思考）和完整版（含工具调用、文档引用，均带清晰视觉容器）。Markdown / HTML 双格式。
// @match                https://claude.ai/*
// @grant                none
// @run-at               document-idle
// @downloadURL          https://raw.githubusercontent.com/ddrwin/greasyfork-scripts/main/Claude_%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8/Claude%20%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8%EF%BC%88MD+HTML%EF%BC%89%20V1.1.0%20(2026.06.11).user.js
// @updateURL            https://raw.githubusercontent.com/ddrwin/greasyfork-scripts/main/Claude_%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8/Claude%20%E5%AF%B9%E8%AF%9D%E7%AE%80%E6%B4%81%E5%AF%BC%E5%87%BA%E5%99%A8%EF%BC%88MD+HTML%EF%BC%89%20V1.1.0%20(2026.06.11).meta.js
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
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // Strip code line numbers from tool result text
  function stripLineNumbers(text) {
    if (!text) return text;
    // Removes leading line numbers:
    //   "N content"          "  N│ content"      "  N: content"
    //   "  N| content"       "N│content"          "N" (bare number on its own line)
    return text.replace(/^[ \t]*\d{1,5}[ │\|:][ \t]?/gm, '').replace(/^\d{1,5}\s*$/gm, '');
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
  //  Process — two modes: clean | full
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function processClean(conv) {
    const msgs = (conv.chat_messages || []).sort((a, b) => (a.index || 0) - (b.index || 0));
    const keep = new Set(['text','thinking','redacted_thinking']);
    return msgs.map(msg => {
      const role = msg.sender === 'human' ? 'user' : 'assistant';
      const blocks = (msg.content || []).filter(b => keep.has(b.type));
      const textParts = [], thinking = [];
      for (const b of blocks) {
        if (b.type === 'thinking') thinking.push(b.thinking || b.text || '');
        else if (b.type === 'redacted_thinking') thinking.push('[思考过程已隐藏]');
        else if (b.type === 'text') textParts.push(b.text || '');
      }
      return { sender: msg.sender, role, textParts, thinking: thinking.join('\n\n'), hasThinking: thinking.length > 0, blocks: [], files: [], attachments: [] };
    });
  }

  function processFull(conv) {
    const msgs = (conv.chat_messages || []).sort((a, b) => (a.index || 0) - (b.index || 0));
    return msgs.map(msg => ({
      sender: msg.sender,
      role: msg.sender === 'human' ? 'user' : 'assistant',
      blocks: msg.content || [],
      files: msg.files_v2 || msg.files || [],
      attachments: msg.attachments || [],
    }));
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
  //  Markdown Parser (for HTML export)
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
    function closeLists() { if (inUl) { res.push('</ul>'); inUl = false; } if (inOl) { res.push('</ol>'); inOl = false; } }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MD Export — Clean & Full
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function buildMarkdownClean(conv, messages) {
    const title = conv.name || 'Claude 对话';
    const model = conv.model || 'claude';
    const createdAt = conv.created_at ? new Date(conv.created_at).toLocaleString('zh-CN') : '';
    let md = `# ${title}\n\n> 模型: ${model}  ·  创建: ${createdAt}\n\n---\n\n`;
    for (const msg of messages) {
      if (msg.role === 'user') { md += `## 你\n\n${msg.textParts.join('\n\n')}\n\n`; }
      else {
        md += `## Claude\n\n`;
        if (msg.hasThinking) {
          md += `> 💭 **思考过程**\n>\n`;
          for (const line of msg.thinking.split('\n')) md += `> ${line}\n`;
          md += `>\n> ---\n>\n`;
        }
        md += `${msg.textParts.join('\n\n')}\n\n`;
      }
      md += `---\n\n`;
    }
    return md.trim();
  }

  // Full MD: render a single block as MD text
  function renderBlockMd(b) {
    switch (b.type) {
      case 'text': return b.text || '';
      case 'thinking':
        let t = `> 💭 **思考过程**\n>\n`;
        for (const line of (b.thinking || b.text || '').split('\n')) t += `> ${line}\n`;
        return t;
      case 'redacted_thinking': return `> 💭 **思考过程（已隐藏）**\n`;
      case 'tool_use': case 'server_tool_use': {
        const name = b.name || 'tool';
        const input = b.input || {};
        let s = `> 🔧 **工具调用: ${name}**\n>\n`;
        const inputStr = JSON.stringify(input, null, 2);
        if (inputStr.length > 200) s += `>\`\`\`json\n${inputStr.replace(/^/gm, '> ')}\n>\`\`\`\n`;
        else s += `> \`${inputStr.replace(/\n/g, '\n> ')}\`\n`;
        return s;
      }
      case 'tool_result': {
        const isErr = b.is_error ? ' ❌' : '';
        let s = `> 📋 **工具结果${isErr}**\n>\n`;
        const c = b.content;
        if (Array.isArray(c)) {
          for (const item of c) {
            if (item.type === 'text') s += `> ${stripLineNumbers(item.text).replace(/\n/g, '\n> ')}\n`;
            else if (item.type === 'knowledge') s += `> 📚 ${item.title || item.name || '来源'}\n`;
          }
        } else if (typeof c === 'string') {
          s += `> ${stripLineNumbers(c).replace(/\n/g, '\n> ')}\n`;
        }
        if (b.message) s += `> ${stripLineNumbers(b.message).replace(/\n/g, '\n> ')}\n`;
        return s;
      }
      case 'web_search_tool_result': {
        const results = Array.isArray(b.content) ? b.content.filter(c => c.type === 'web_search_result') : [];
        let s = `> 🔍 **搜索结果** ${results.length ? '(' + results.length + ' 个来源)' : ''}\n>\n`;
        for (const r of results) s += `> [${escapeHtml(r.title || r.url)}](${r.url})\n`;
        return s;
      }
      case 'code_execution_tool_result': {
        let s = `> ⚡ **代码执行结果**\n>\n`;
        if (b.output) s += `> 输出:\n> \`\`\`\n${b.output.replace(/\n/g, '\n> ')}\n> \`\`\`\n`;
        if (b.error) s += `> 错误: ${b.error.replace(/\n/g, '\n> ')}\n`;
        if (b.return_value !== undefined) s += `> 返回值: ${b.return_value.replace(/\n/g, '\n> ')}\n`;
        return s;
      }
      case 'image': {
        const alt = b.alt || '';
        if (b.source?.url) return `> 🖼️ ${alt ? ': ' + alt : ''}\n`;
        if (b.source?.type === 'base64') return `> 🖼️ ${alt ? ': ' + alt : ''}\n`;
        return `> 🖼️ [图片]\n`;
      }
      default: return b.text ? `> 📦 [${escapeHtml(b.type)}]\n> ${b.text.replace(/\n/g, '\n> ')}\n` : `> 📦 [${escapeHtml(b.type)}]\n`;
    }
  }

  function buildMarkdownFull(conv, messages) {
    const title = conv.name || 'Claude 对话';
    const model = conv.model || 'claude';
    const createdAt = conv.created_at ? new Date(conv.created_at).toLocaleString('zh-CN') : '';
    let md = `# ${title}\n\n> 模型: ${model}  ·  创建: ${createdAt}\n\n---\n\n`;

    for (const msg of messages) {
      if (msg.role === 'user') {
        md += `## 你\n\n`;
        // User files
        for (const f of msg.files) {
          const name = f.file_name || 'file';
          if (f.file_kind === 'image') md += `> 🖼️ **上传图片: ${name}**\n\n`;
          else if (f.file_kind === 'document') md += `> 📄 **上传文档: ${name}**${f.file_size ? ' (' + formatFileSize(f.file_size) + ')' : ''}\n\n`;
          else md += `> 📎 **上传文件: ${name}**\n\n`;
        }
        for (const a of msg.attachments) {
          const name = a.file_name || a.filename || 'attachment';
          const size = a.file_size ? ` (${formatFileSize(a.file_size)})` : '';
          md += `> 📄 **引用文档: ${name}**${size}\n>\n`;
          if (a.extracted_content) {
            const extLines = a.extracted_content.split('\n');
            md += `> \`\`\`\n`;
            for (const l of extLines) md += `> ${l}\n`;
            md += `> \`\`\`\n`;
          }
          md += `\n`;
        }
        // User text
        for (const b of msg.blocks) {
          if (b.type === 'text') md += `${b.text}\n\n`;
        }
      } else {
        md += `## Claude\n\n`;
        for (const b of msg.blocks) {
          md += renderBlockMd(b) + '\n\n';
        }
      }
      md += `---\n\n`;
    }
    return md.trim();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  HTML Export — Clean
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function renderBlocksHtmlClean(blocks) {
    if (!blocks?.length) return '';
    return blocks.map(b => {
      switch (b.type) {
        case 'text': return `<div class="text-block">${parseMd(b.text)}</div>`;
        case 'thinking': return `<details class="block-container thinking-block" open><summary><span class="bi bi-think">💭</span> 思考过程</summary><div class="block-body">${parseMd(b.thinking || b.text || '')}</div></details>`;
        case 'redacted_thinking': return `<div class="block-container redacted-block">💭 思考过程（已隐藏）</div>`;
        default: return '';
      }
    }).join('\n');
  }

  function buildCleanHTML(conv, messages) {
    const title = conv.name || 'Claude 对话';
    const model = conv.model || 'claude';
    const createdAt = conv.created_at ? new Date(conv.created_at).toLocaleString('zh-CN') : '';
    let messagesHtml = '';
    for (const msg of messages) {
      const isHuman = msg.sender === 'human';
      const contentHtml = renderBlocksHtmlClean(
        msg.textParts.map(t => ({type: 'text', text: t})).concat(
          msg.hasThinking ? [{type: 'thinking', thinking: msg.thinking}] : []
        )
      );
      messagesHtml += `<div class="message message-${msg.sender}">
        <div class="message-avatar ${msg.sender}-avatar">${isHuman ? 'H' : 'C'}</div>
        <div class="message-body">
          <div class="message-sender">${isHuman ? '你' : 'Claude'}</div>
          <div class="message-content">${contentHtml}</div>
        </div>
      </div>`;
    }
    return buildHtmlPage(title, model, createdAt, messagesHtml, false);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  HTML Export — Full (all blocks, visually distinct)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function renderBlockHtmlFull(b) {
    switch (b.type) {
      case 'text': return `<div class="text-block">${parseMd(b.text)}</div>`;

      case 'thinking': return `<details class="block-container thinking-block" open><summary><span class="bi bi-think">💭</span> 思考过程</summary><div class="block-body">${parseMd(b.thinking || b.text || '')}</div></details>`;
      case 'redacted_thinking': return `<div class="block-container redacted-block">💭 思考过程（已隐藏）</div>`;

      case 'tool_use': case 'server_tool_use': {
        const name = b.name || 'unknown';
        const input = b.input || {};
        const icon = name === 'web_search' || name === 'brave_search' ? '🔍' :
                     name === 'code_execution' || name === 'execute_code' ? '⚡' :
                     name === 'create_artifact' || name === 'update_artifact' || name === 'rewrite_artifact' ? '📄' :
                     name.startsWith('visualize:') || name === 'show_widget' ? '📊' : '🔧';
        let header = `${icon} ${escapeHtml(name)}`;
        // For search/brave, show query in header
        if ((name === 'web_search' || name === 'brave_search') && input.query) header += `: "${escapeHtml(input.query)}"`;
        if (name === 'code_execution' || name === 'execute_code') header += ` · ${escapeHtml(input.language || 'python')}`;
        let body = '';
        // For artifact, show title and lang
        if (name === 'create_artifact' || name === 'update_artifact' || name === 'rewrite_artifact') {
          const titleA = input.title || 'Artifact';
          const langA = input.language || input.type || 'text';
          const content = input.content || '';
          header = `📄 ${escapeHtml(titleA)} <span class="badge">${escapeHtml(langA)}</span>`;
          if (langA === 'html') {
            body += `<div class="tab-bar"><button class="tab-btn active" data-tab="code">代码</button><button class="tab-btn" data-tab="preview">预览</button></div>`;
            body += `<div class="tab-content code-view"><pre class="code-block" data-lang="html"><code>${highlight(escapeHtml(content), 'html')}</code></pre></div>`;
            body += `<div class="tab-content preview-view" style="display:none"><iframe sandbox="allow-scripts" srcdoc="${escapeAttr(content)}"></iframe></div>`;
          } else {
            body += `<pre class="code-block" data-lang="${escapeHtml(langA)}"><code>${highlight(escapeHtml(content), langA)}</code></pre>`;
          }
        } else if (name === 'code_execution' || name === 'execute_code') {
          const code = input.code || input.source || JSON.stringify(input, null, 2);
          const langC = input.language || 'python';
          body += `<pre class="code-block" data-lang="${langC}"><code>${highlight(escapeHtml(code), langC)}</code></pre>`;
        } else {
          const inputStr = JSON.stringify(input, null, 2);
          body += `<pre class="code-block" data-lang="json"><code>${escapeHtml(inputStr)}</code></pre>`;
        }
        return `<details class="block-container tool-block" open><summary><span class="bi">${icon}</span> ${header}</summary><div class="block-body">${body}</div></details>`;
      }

      case 'tool_result': {
        const errCls = b.is_error ? ' tool-error' : '';
        const content = b.content;
        let body = '';

        // Check if all content is placeholder
        const isPlaceholder = v => typeof v === 'string' && (v.includes('Content rendered') || v.includes('already see the result') || v.includes('already visually represented'));
        if (Array.isArray(content) && content.every(c => c.type === 'text' && isPlaceholder(c.text))) return '';
        if (typeof content === 'string' && isPlaceholder(content)) return '';

        if (Array.isArray(content)) {
          // Knowledge results (from search)
          const knowledge = content.filter(c => c.type === 'knowledge');
          if (knowledge.length) {
            body += `<div class="source-list">${knowledge.map(k => {
              const titleK = k.title || k.name || '来源';
              const url = k.url || '';
              let domain = '';
              if (url) try { domain = new URL(url).hostname; } catch {}
              const meta = k.metadata || {};
              const favicon = meta.favicon_url ? `<img class="favicon" src="${escapeAttr(meta.favicon_url)}" width="14" height="14">` : '';
              if (url) return `<a class="source-card" href="${escapeAttr(url)}" target="_blank" rel="noopener"><span class="source-title">${favicon} ${escapeHtml(titleK)}</span><span class="source-url">${escapeHtml(meta.site_name || domain)}</span></a>`;
              return `<div class="source-card"><span class="source-title">${favicon} ${escapeHtml(titleK)}</span></div>`;
            }).join('\n')}</div>`;
          }
          for (const c of content) {
            if (c.type === 'text' && !isPlaceholder(c.text)) body += `<div class="tool-result-text${errCls}">${parseMd(stripLineNumbers(c.text))}</div>`;
            if (c.type === 'image') body += renderBlockHtmlFull(c);
            if (c.type === 'web_search_result') {
              let dom = ''; try { dom = new URL(c.url || '').hostname; } catch {}
              body += `<a class="source-card" href="${escapeAttr(c.url || '#')}" target="_blank" rel="noopener"><span class="source-title">${escapeHtml(c.title || c.url)}</span><span class="source-url">${escapeHtml(dom)}</span></a>`;
            }
          }
        } else if (typeof content === 'string') {
          body += `<div class="tool-result-text${errCls}">${parseMd(stripLineNumbers(content))}</div>`;
        }
        if (b.message) body += `<div class="tool-result-text">${parseMd(stripLineNumbers(b.message))}</div>`;
        if (!body) return '';
        return `<details class="block-container tool-result-block" open><summary><span class="bi">📋</span> 工具结果${b.is_error ? ' ❌' : ''}</summary><div class="block-body">${body}</div></details>`;
      }

      case 'web_search_tool_result': {
        const results = Array.isArray(b.content) ? b.content.filter(c => c.type === 'web_search_result') : [];
        if (!results.length) return '';
        const list = results.map(r => {
          let dom = ''; try { dom = new URL(r.url || '').hostname; } catch {}
          return `<a class="source-card" href="${escapeAttr(r.url || '#')}" target="_blank" rel="noopener"><span class="source-title">${escapeHtml(r.title || r.url)}</span><span class="source-url">${escapeHtml(dom)}</span></a>`;
        }).join('\n');
        return `<details class="block-container search-block" open><summary><span class="bi">🔍</span> 搜索结果 <span class="badge">${results.length} 个来源</span></summary><div class="block-body source-list">${list}</div></details>`;
      }

      case 'code_execution_tool_result': {
        let body = '';
        if (b.output) body += `<div class="exec-section"><div class="exec-label">输出</div><pre class="exec-pre"><code>${escapeHtml(stripLineNumbers(b.output))}</code></pre></div>`;
        if (b.return_value !== undefined) body += `<div class="exec-section"><div class="exec-label">返回值</div><pre class="exec-pre"><code>${escapeHtml(stripLineNumbers(String(b.return_value)))}</code></pre></div>`;
        if (b.error) body += `<div class="exec-section"><div class="exec-label error-label">错误</div><pre class="exec-pre error-pre"><code>${escapeHtml(stripLineNumbers(b.error))}</code></pre></div>`;
        if (!body) return '';
        return `<details class="block-container code-exec-block" open><summary><span class="bi">⚡</span> 代码执行结果</summary><div class="block-body">${body}</div></details>`;
      }

      case 'image': {
        if (b.source?.type === 'base64') return `<div class="msg-image"><img src="data:${b.source.media_type};base64,${b.source.data}" alt="${escapeHtml(b.alt || '')}"></div>`;
        if (b.source?.url) return `<div class="msg-image"><img src="${escapeAttr(b.source.url)}" alt="${escapeHtml(b.alt || '')}"></div>`;
        return '';
      }

      default: return '';
    }
  }

  function buildFullHTML(conv, messages) {
    const title = conv.name || 'Claude 对话';
    const model = conv.model || 'claude';
    const createdAt = conv.created_at ? new Date(conv.created_at).toLocaleString('zh-CN') : '';
    let messagesHtml = '';

    for (const msg of messages) {
      const isHuman = msg.sender === 'human';
      let bodyHtml = '';

      // User: render files first, then text blocks
      if (msg.role === 'user') {
        // Uploaded files
        for (const f of msg.files) {
          const name = f.file_name || 'file';
          if (f.file_kind === 'image') {
            // Try to render the image inline if we have a thumbnail/data
            bodyHtml += `<div class="block-container upload-block" open><summary><span class="bi">🖼️</span> 上传图片: ${escapeHtml(name)}</summary></div>`;
          } else if (f.file_kind === 'document') {
            bodyHtml += `<div class="block-container upload-block" open><summary><span class="bi">📄</span> 上传文档: ${escapeHtml(name)}${f.file_size ? ' (' + formatFileSize(f.file_size) + ')' : ''}</summary></div>`;
          } else {
            bodyHtml += `<div class="block-container upload-block" open><summary><span class="bi">📎</span> 上传文件: ${escapeHtml(name)}</summary></div>`;
          }
        }
        // Attachments (document references with extracted content)
        for (const a of msg.attachments) {
          const name = a.file_name || a.filename || 'attachment';
          const size = a.file_size ? ` (${formatFileSize(a.file_size)})` : '';
          let contentHtml = '';
          if (a.extracted_content) {
            contentHtml += `<pre class="code-block" data-lang="text"><code>${escapeHtml(a.extracted_content)}</code></pre>`;
          }
          bodyHtml += `<details class="block-container doc-block" open><summary><span class="bi">📄</span> 引用文档: ${escapeHtml(name)}<span class="badge">${escapeHtml(size)}</span></summary><div class="block-body">${contentHtml}</div></details>`;
        }
        // User text blocks
        for (const b of msg.blocks) {
          bodyHtml += renderBlockHtmlFull(b);
        }
      } else {
        // Assistant: render all blocks
        for (const b of msg.blocks) {
          bodyHtml += renderBlockHtmlFull(b);
        }
      }

      messagesHtml += `<div class="message message-${msg.sender}">
        <div class="message-avatar ${msg.sender}-avatar">${isHuman ? 'H' : 'C'}</div>
        <div class="message-body">
          <div class="message-sender">${isHuman ? '你' : 'Claude'}</div>
          <div class="message-content">${bodyHtml}</div>
        </div>
      </div>`;
    }

    return buildHtmlPage(title, model, createdAt, messagesHtml, true);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  HTML Page Shell — shared between clean & full
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function buildHtmlPage(title, model, createdAt, messagesHtml, isFull) {
    const extraCss = isFull ? `
.block-container .badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;background:var(--bg-secondary);color:var(--text-muted);margin-left:6px;vertical-align:middle}
.block-container summary .badge{background:var(--border);color:var(--text-secondary)}
.tab-bar{display:flex;border-bottom:1px solid var(--border);background:var(--tool-bg);padding:0 8px}
.tab-btn{padding:6px 14px;border:none;background:none;cursor:pointer;font-size:13px;color:var(--text-secondary);border-bottom:2px solid transparent}
.tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
.tab-content .code-block{margin:0;border-radius:0}
.preview-view iframe{width:100%;min-height:300px;border:none;background:#fff}
.exec-section{margin:8px 0}
.exec-label{font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:4px}
.error-label{color:#e05252}
.exec-pre{background:var(--code-bg);color:var(--code-text);padding:10px;border-radius:var(--radius-sm);font-size:13px;overflow-x:auto;margin:0}
.error-pre{background:rgba(224,82,82,.08);color:#e05252}
.msg-image{max-width:100%;margin:8px 0}
.msg-image img{max-width:100%;border-radius:var(--radius)}
.source-list{display:flex;flex-direction:column;gap:6px;padding:4px}
.source-card{display:block;padding:10px 14px;background:var(--search-card-bg);border:1px solid var(--search-card-border);border-radius:var(--radius-sm);text-decoration:none}
.source-card:hover{border-color:var(--accent)}
.source-title{font-size:14px;font-weight:500;color:var(--text-primary);display:flex;align-items:center;gap:6px}
.source-url{font-size:12px;color:var(--text-muted)}
.favicon{border-radius:2px}
.tool-result-text{padding:4px 0 4px 0;font-size:14px}
.tool-error{color:#e05252}
` : '';

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
  --header-bg: #f5f4ef;
  --radius: 8px;
  --radius-sm: 4px;
  --search-card-bg: #fff;
  --search-card-border: #e0ddd5;
  --tool-bg: #f0ede4;
  /* Block container colors */
  --block-think-bg: #edeadf;
  --block-think-border: #d4d0c5;
  --block-tool-bg: #f0ede4;
  --block-tool-border: #d0cbbf;
  --block-toolresult-bg: #f5f2eb;
  --block-toolresult-border: #d8d4cc;
  --block-search-bg: #e8f0fa;
  --block-search-border: #c0d4e8;
  --block-codeexec-bg: #edf3e8;
  --block-codeexec-border: #c0d4b0;
  --block-doc-bg: #f5edf5;
  --block-doc-border: #d4c5d4;
  --block-upload-bg: #f5f0e8;
  --block-upload-border: #d8d0c0;
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
  --header-bg: #1a1916;
  --search-card-bg: #252320;
  --search-card-border: #3a3632;
  --tool-bg: #252320;
  --block-think-bg: #222120;
  --block-think-border: #3a3632;
  --block-tool-bg: #252320;
  --block-tool-border: #3a3632;
  --block-toolresult-bg: #222120;
  --block-toolresult-border: #3a3632;
  --block-search-bg: #1c2530;
  --block-search-border: #2a3a50;
  --block-codeexec-bg: #1c2820;
  --block-codeexec-border: #2a4030;
  --block-doc-bg: #252025;
  --block-doc-border: #3a303a;
  --block-upload-bg: #252220;
  --block-upload-border: #3a352a;
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
.message-content blockquote{border-left:3px solid var(--accent);padding:.5em 1em;margin:.75em 0;color:var(--text-secondary);background:var(--block-think-bg)}
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
/* Block containers — shared visual system */
.block-container{border-radius:var(--radius);margin:.75em 0;overflow:hidden}
.block-container summary{padding:10px 16px;cursor:pointer;font-size:14px;color:var(--text-secondary);display:flex;align-items:center;gap:6px}
.block-container .bi{font-size:16px;flex-shrink:0}
.block-body{padding:4px 16px 12px;font-size:14px;color:var(--text-secondary)}
.thinking-block{background:var(--block-think-bg);border:1px solid var(--block-think-border)}
.thinking-block summary{color:var(--text-secondary)}
.tool-block{background:var(--block-tool-bg);border:1px solid var(--block-tool-border)}
.tool-result-block{background:var(--block-toolresult-bg);border:1px solid var(--block-toolresult-border)}
.search-block{background:var(--block-search-bg);border:1px solid var(--block-search-border)}
.code-exec-block{background:var(--block-codeexec-bg);border:1px solid var(--block-codeexec-border)}
.doc-block{background:var(--block-doc-bg);border:1px solid var(--block-doc-border)}
.upload-block{background:var(--block-upload-bg);border:1px solid var(--block-upload-border)}
.redacted-block{background:var(--block-think-bg);border:1px solid var(--block-think-border);padding:10px 16px;margin:.75em 0;color:var(--text-muted)}
.text-block{padding:0;font-size:15px;color:var(--text-primary)}
@media(max-width:640px){.conversation{padding:16px 12px 60px}.message{gap:12px;padding:16px 0}.page-header{padding:10px 12px}}
${extraCss}`;

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
    <button id="expand-all-btn">🔽 全部展开/折叠</button>
    <button id="theme-toggle">🌓 主题</button>
  </div>
</header>
<main class="conversation">${messagesHtml}</main>
<script>
(function(){
  var t=document.getElementById('theme-toggle'),h=document.documentElement;
  t.addEventListener('click',function(){
    h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark');
  });
  var e=true;
  document.getElementById('expand-all-btn').addEventListener('click',function(){
    e=!e;
    document.querySelectorAll('.block-container').forEach(function(d){d.open=e;});
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
  document.querySelectorAll('.tab-btn').forEach(function(tab){
    tab.addEventListener('click',function(){
      var art=this.closest('.block-container');
      art.querySelectorAll('.tab-btn').forEach(function(t){t.classList.remove('active');});
      this.classList.add('active');
      var target=this.dataset.tab;
      art.querySelectorAll('.code-view').forEach(function(v){v.style.display=target==='code'?'':'none';});
      art.querySelectorAll('.preview-view').forEach(function(v){v.style.display=target==='preview'?'':'none';});
    });
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
  //  UI — floating button with 4-item menu
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
      '  <div class="cce-group-header">简洁版</div>',
      '  <button class="cce-menu-item" data-mode="clean" data-format="md">📝 Markdown</button>',
      '  <button class="cce-menu-item" data-mode="clean" data-format="html">📄 HTML</button>',
      '  <div class="cce-group-header">完整版</div>',
      '  <button class="cce-menu-item" data-mode="full" data-format="md">📝 Markdown</button>',
      '  <button class="cce-menu-item" data-mode="full" data-format="html">📄 HTML</button>',
      '</div>',
    ].join('\n');
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;';

    const mainBtn = container.querySelector('#cce-main-btn');
    mainBtn.style.cssText = 'width:48px;height:48px;border-radius:50%;background:#c96442;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:all .2s;';
    mainBtn.onmouseenter = () => mainBtn.style.transform = 'scale(1.1)';
    mainBtn.onmouseleave = () => mainBtn.style.transform = 'scale(1)';

    const menu = container.querySelector('#cce-menu');
    menu.style.cssText = 'display:none;flex-direction:column;background:#fff;border:1px solid #e0ddd5;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);overflow:hidden;min-width:220px;';

    mainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    });

    // Group headers
    menu.querySelectorAll('.cce-group-header').forEach(h => {
      h.style.cssText = 'padding:6px 16px 4px;font-size:11px;font-weight:600;color:#9a948e;text-transform:uppercase;letter-spacing:0.5px;background:#f9f8f5;border-bottom:1px solid #eee;';
    });

    // Menu items
    menu.querySelectorAll('.cce-menu-item').forEach(btn => {
      btn.style.cssText = 'padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;text-align:left;display:flex;align-items:center;gap:8px;color:#333;transition:background .15s;font-family:system-ui;';
      btn.onmouseenter = () => btn.style.background = '#f5f4ef';
      btn.onmouseleave = () => btn.style.background = 'none';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.dataset.mode;
        const fmt = btn.dataset.format;
        menu.style.display = 'none';
        doExport(mode, fmt);
      });
    });

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

  async function doExport(mode, format) {
    setMainBtnState('loading');
    try {
      const orgId = await fetchOrgId();
      const convId = getConvId();
      const conv = await fetchConversation(orgId, convId);
      const baseName = sanitizeFilename(conv.name || 'claude-chat');
      const suffix = mode === 'full' ? '_完整版' : '';

      if (mode === 'clean') {
        const messages = processClean(conv);
        if (format === 'md') {
          download(buildMarkdownClean(conv, messages), baseName + '.md', 'text/markdown');
        } else {
          download(buildCleanHTML(conv, messages), baseName + suffix + '.html', 'text/html');
        }
      } else {
        const messages = processFull(conv);
        if (format === 'md') {
          download(buildMarkdownFull(conv, messages), baseName + suffix + '.md', 'text/markdown');
        } else {
          download(buildFullHTML(conv, messages), baseName + suffix + '.html', 'text/html');
        }
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
