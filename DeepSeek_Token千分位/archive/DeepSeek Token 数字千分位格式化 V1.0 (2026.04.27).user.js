// ==UserScript==
// @name         DeepSeek Token 数字千分位格式化
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  为 DeepSeek 使用统计页面中的 Token 数字自动添加千分位分隔符（如 8091264 → 8,091,264）
// @author       You
// @match        https://deepseek.com/*
// @match        https://*.deepseek.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // 防抖定时器
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 150; // ms

    /**
     * 给数字字符串添加千分位分隔符
     * @param {string} numStr - 纯数字字符串
     * @returns {string} 格式化后的字符串
     */
    function formatNumber(numStr) {
        // 去除首尾空格后添加千分位逗号
        return numStr.trim().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 判断节点是否应该被排除（不处理其内部文本）
     * @param {Node} node - 文本节点
     * @returns {boolean} 是否应排除
     */
    function shouldExclude(node) {
        const parent = node.parentElement;
        if (!parent) return true;

        const tagName = parent.tagName.toLowerCase();
        // 排除脚本、样式、输入框、代码块等元素
        if (['script', 'style', 'input', 'textarea', 'code', 'pre', 'kbd', 'samp'].includes(tagName)) {
            return true;
        }
        // 排除可编辑元素
        if (parent.isContentEditable) {
            return true;
        }
        // 排除带有特定属性的元素（如代码编辑器）
        if (parent.closest('[contenteditable="true"]')) {
            return true;
        }
        return false;
    }

    /**
     * 处理单个文本节点，对其中的数字进行千分位格式化
     * @param {Text} textNode - 文本节点
     * @returns {boolean} 是否进行了修改
     */
    function processTextNode(textNode) {
        if (shouldExclude(textNode)) return false;

        const originalText = textNode.textContent;
        if (!originalText || originalText.trim().length === 0) return false;

        // 匹配4位及以上纯数字，但排除年份（1900-2099）
        // 已包含逗号的数字（如 8,627,189）不会被匹配，避免重复处理
        const regex = /\b(?!19\d{2}\b|20\d{2}\b)(\d{4,})\b/g;

        // 先测试是否匹配，避免不必要的替换操作
        if (!regex.test(originalText)) return false;

        // 重置正则的 lastIndex
        regex.lastIndex = 0;

        const newText = originalText.replace(regex, function (match) {
            return formatNumber(match);
        });

        if (newText !== originalText) {
            textNode.textContent = newText;
            return true;
        }
        return false;
    }

    /**
     * 遍历并处理页面中的所有文本节点
     * @param {Node} rootNode - 根节点（默认为 document.body）
     * @returns {number} 修改的文本节点数量
     */
    function processAllTextNodes(rootNode) {
        let modifiedCount = 0;

        const walker = document.createTreeWalker(
            rootNode || document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (shouldExclude(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // 跳过空文本或仅包含空白的文本
                    if (!node.textContent || node.textContent.trim().length === 0) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let textNode;
        while ((textNode = walker.nextNode())) {
            if (processTextNode(textNode)) {
                modifiedCount++;
            }
        }

        return modifiedCount;
    }

    /**
     * 防抖执行格式化
     */
    function debouncedProcess() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(function () {
            processAllTextNodes(document.body);
            debounceTimer = null;
        }, DEBOUNCE_DELAY);
    }

    /**
     * 初始化：首次格式化 + 设置 MutationObserver
     */
    function init() {
        // 首次执行格式化
        processAllTextNodes(document.body);

        // 使用 MutationObserver 监听 DOM 变化
        const observer = new MutationObserver(function (mutations) {
            // 检查是否有新增的文本内容
            let hasNewText = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // 新增节点
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            hasNewText = true;
                            break;
                        }
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 新增元素节点，检查其中是否包含文本
                            if (node.textContent && node.textContent.trim().length > 0) {
                                hasNewText = true;
                                break;
                            }
                        }
                    }
                } else if (mutation.type === 'characterData') {
                    // 文本内容变化
                    hasNewText = true;
                }
                if (hasNewText) break;
            }

            if (hasNewText) {
                debouncedProcess();
            }
        });

        // 开始观察
        observer.observe(document.body, {
            childList: true,      // 监听子节点增删
            subtree: true,        // 监听所有后代节点
            characterData: true,  // 监听文本内容变化
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();