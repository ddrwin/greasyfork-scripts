// ==UserScript==
// @name         豆包全宽 + 蓝色气泡（DeepSeek 风格）
// @namespace    https://github.com/yourname/doubao-blue-chat-v2
// @version      1.1
// @description  撑满豆包内容宽度，并把你的发送消息气泡和助手消息气泡都改成蓝色系，类似 DeepSeek 的对话样式。
// @author       你
// @match        https://www.doubao.com/*
// @match        https://doubao.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    /* ========== 1. 全宽设置 ========== */
    :root {
      --content-max-width: 100% !important;
    }
    div[class*="max-w-"] {
      max-width: 100% !important;
    }
    .container-PvPoAn,
    .item-kDun2N,
    [class*="max-dbx-xs:"] {
      max-width: 100% !important;
    }

    /* ========== 2. 蓝色气泡 ========== */
    /* 你的发送消息气泡（根据你提供的类名） */
    .bg-g-send-msg-bubble-bg {
      background: #dbeafe !important;   /* 浅蓝色，和 DS 的输入框风格一致 */
      color: #1e293b !important;        /* 深色文字，保证可读性 */
    }

    /* 助手/接收的消息气泡（常见类名，如果豆包用别的类再补） */
    .bg-g-receive-msg-bubble-bg {
      background: #ffffff !important;   /* 白底，让助手的回答更清爽 */
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    /* 兜底：用属性选择器匹配所有可能的消息气泡类 */
    [class*="send-msg-bubble"] {
      background: #dbeafe !important;
      color: #1e293b !important;
    }
    [class*="receive-msg-bubble"] {
      background: #ffffff !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    /* 微调气泡圆角，保持和豆包原生一致或不一致都行 */
    .bg-g-send-msg-bubble-bg,
    .bg-g-receive-msg-bubble-bg {
      border-radius: 12px;
    }

    /* 代码块背景微调，防止在蓝色气泡里看不清 */
    .bg-g-send-msg-bubble-bg code,
    .bg-g-send-msg-bubble-bg pre {
      background-color: rgba(0,0,0,0.06);
    }
  `);
})();