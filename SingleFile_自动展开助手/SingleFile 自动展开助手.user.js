// ==UserScript==
// @name         SingleFile 自动展开助手
// @namespace    https://github.com/ddrwin
// @version      1.0
// @description  在 SingleFile 保存前自动展开网页折叠区（100vh、grid 折叠、overflow hidden 等），确保保存的 HTML 内容完整，方便后续转 PDF
// @author       ddrwin
// @match        *://chat.deepseek.com/*
// @match        *://*.doubao.com/*
// @match        *://claude.ai/*
// @match        *://platform.deepseek.com/*
// @match        <all_urls>
// @grant        none
// @run-at       document-start
// @note         依赖 SingleFile 设置的"用户脚本"选项开启。
//               SingleFile → 设置 → 高级 → 用户脚本 → 启用
// @note         原理：定义 _singleFile_waitForUserScript 钩子，
//               在 SingleFile 捕获 DOM 之前展开所有折叠内容。
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const EXPANDED = new WeakSet();

    function expandPage() {
        if (EXPANDED.has(document)) return;
        EXPANDED.add(document);

        // === CSS 类名/属性展开 ===
        document.querySelectorAll('[class*="h-screen"]').forEach(el => {
            el.classList.forEach(cls => {
                if (cls.includes('h-screen')) el.classList.remove(cls);
            });
        });

        // === 内联样式展开 ===
        // 100vh 容器 → 自动高度
        document.querySelectorAll('[style*="height:calc"], [style*="height: calc"]').forEach(el => {
            const s = el.getAttribute('style') || '';
            if (/height\s*:\s*calc\s*\(\s*100vh/i.test(s)) {
                el.style.setProperty('height', 'auto', 'important');
            }
        });

        // grid-template-rows: 0fr → 1fr
        document.querySelectorAll('[style*="grid-template-rows"]').forEach(el => {
            const s = el.getAttribute('style') || '';
            if (/:0fr\b/.test(s)) {
                el.style.setProperty('grid-template-rows', '1fr', 'important');
            }
        });

        // overflow hidden → visible
        document.querySelectorAll('[style*="overflow:hidden"], [style*="overflow: hidden"]').forEach(el => {
            el.style.setProperty('overflow', 'visible', 'important');
        });
        document.querySelectorAll('[class*="overflow-hidden"], [class*="overflow-y-hidden"]').forEach(el => {
            el.classList.forEach(cls => {
                if (cls.includes('overflow-hidden') || cls.includes('overflow-y-hidden')) {
                    el.style.setProperty('overflow', 'visible', 'important');
                }
            });
        });

        // max-height 固定值容器 → 无限制
        document.querySelectorAll('[style*="max-height"]').forEach(el => {
            const s = el.getAttribute('style') || '';
            if (/max-height\s*:\s*\d+/.test(s)) {
                el.style.setProperty('max-height', 'none', 'important');
            }
        });

        // === aria 展开 ===
        document.querySelectorAll('[aria-expanded="false"]').forEach(el => {
            el.setAttribute('aria-expanded', 'true');
        });

        // === details 元素 ===
        document.querySelectorAll('details:not([open])').forEach(el => {
            el.setAttribute('open', '');
        });
    }

    // === 定义 SingleFile 钩子 ===
    window._singleFile_waitForUserScript = async function(eventName) {
        if (eventName === 'single-file-on-init-capture' ||
            eventName === 'single-file-on-before-capture') {
            expandPage();
        }
    };

    // === 兜底：如果页面自己触发保存（非 SingleFile 路径）===
    // 监听自定义事件（某些站点可能在保存前触发）
    document.addEventListener('single-file-on-init-capture-request', () => expandPage(), true);
    document.addEventListener('single-file-on-before-capture-request', () => expandPage(), true);

    // DOM 就绪后再扫一次（某些懒加载内容）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', expandPage);
    } else {
        expandPage();
    }

})();
