// ==UserScript==
// @name         DeepSeek Usage Token 千分位格式化
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  专为 DeepSeek 开放平台用量页面优化，为 Token 数字智能添加千分位分隔符。支持开关且默认启用。
// @author       You
// @match        https://platform.deepseek.com/usage
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @license      MIT
// @note         2026.04.29 V2.0 重构：增量扫描、避免自我触发、收紧作用域、加入跳过标记、永久记忆开关
// ==/UserScript==

(function () {
    'use strict';

    // ---------- 偏好管理 ----------
    const PREF_KEY = 'token_format_enabled';
    const DEFAULT_ENABLED = true;

    function loadEnabled() {
        const saved = GM_getValue(PREF_KEY);
        return saved === undefined ? DEFAULT_ENABLED : saved;
    }

    function saveEnabled(value) {
        GM_setValue(PREF_KEY, value);
    }

    // ---------- 核心格式化逻辑 ----------
    /**
     * 给数字字符串添加千分位分隔符
     * @param {string} numStr - 纯数字字符串
     * @returns {string} 格式化后的字符串
     */
    function formatNumber(numStr) {
        return numStr.trim().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 判断节点是否应该被跳过
     * @param {Node} node - 文本节点
     * @returns {boolean} 是否应跳过
     */
    function shouldExclude(node) {
        const parent = node.parentElement;
        if (!parent) return true;

        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'input', 'textarea', 'code', 'pre', 'kbd', 'samp'].includes(tagName)) {
            return true;
        }
        if (parent.isContentEditable) {
            return true;
        }
        if (parent.closest('[contenteditable="true"]')) {
            return true;
        }
        // 新增：跳过脚本自身可能注入的未来 UI 元素
        if (parent.closest('[data-ai-expert-skip]')) {
            return true;
        }
        return false;
    }

    /**
     * 处理单个文本节点，对纯数字进行千分位格式化
     * @param {Text} textNode - 要处理的文本节点
     * @returns {boolean} 是否进行了修改
     */
    function processTextNode(textNode) {
        if (shouldExclude(textNode)) return false;

        const originalText = textNode.textContent;
        if (!originalText || originalText.trim().length === 0) return false;

        // 匹配4位及以上纯数字，排除年份（1900-2099）和已带逗号的数字
        const regex = /\b(?!19\d{2}\b|20\d{2}\b)(\d{4,})\b/g;

        if (!regex.test(originalText)) return false;
        regex.lastIndex = 0;

        const newText = originalText.replace(regex, (match) => formatNumber(match));

        if (newText !== originalText) {
            textNode.textContent = newText;
            return true;
        }
        return false;
    }

    /**
     * 增量处理新增节点，避免全量扫描
     * @param {Node} rootNode - 要处理的根节点
     * @returns {number} 修改的文本节点数量
     */
    function processAddedNodes(rootNode) {
        let count = 0;

        // 若 rootNode 本身是文本节点，直接处理
        if (rootNode.nodeType === Node.TEXT_NODE) {
            return processTextNode(rootNode) ? 1 : 0;
        }

        // 使用 TreeWalker 仅遍历 rootNode 的子树
        const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (shouldExclude(node)) return NodeFilter.FILTER_REJECT;
                    if (!node.textContent || node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let textNode;
        while ((textNode = walker.nextNode())) {
            if (processTextNode(textNode)) {
                count++;
            }
        }
        return count;
    }

    // ---------- 模块化控制 ----------
    let observer = null;

    function enableFormatting() {
        if (observer) return; // 避免重复启用

        // 初始处理已存在的页面内容
        processAddedNodes(document.body);

        // 使用 MutationObserver 监听增量变化
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        processAddedNodes(node);
                    }
                } else if (mutation.type === 'characterData') {
                    // 直接处理发生变化的文本节点
                    // 注意：由于我们修改文本也会触发此事件，但 processTextNode 内部的 hasComma 检查会阻止循环
                    processTextNode(mutation.target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        console.log('✅ Token 千分位格式化已启用');
    }

    function disableFormatting() {
        if (observer) {
            observer.disconnect();
            observer = null;
            console.log('⏸️ Token 千分位格式化已禁用（已修改内容不变，刷新页面可恢复）');
        }
    }

    // ---------- 启动与菜单 ----------
    let isEnabled = loadEnabled();

    // 根据初始偏好启动
    if (isEnabled) {
        enableFormatting();
    }

    // 注册油猴菜单命令
    GM_registerMenuCommand('📊 开启 Token 千分位', () => {
        if (!isEnabled) {
            isEnabled = true;
            saveEnabled(true);
            enableFormatting();
        }
    });

    GM_registerMenuCommand('📊 关闭 Token 千分位', () => {
        if (isEnabled) {
            isEnabled = false;
            saveEnabled(false);
            disableFormatting();
        }
    });

    // 可选：页面完全就绪后再处理一次，以应对异步加载
    window.addEventListener('load', () => {
        if (isEnabled) {
            processAddedNodes(document.body);
        }
    });

})();