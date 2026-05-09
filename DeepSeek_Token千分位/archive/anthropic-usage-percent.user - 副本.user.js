// ==UserScript==
// @name         Anthropic Console 用量百分比
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 token 浮窗中自动添加缓存命中率与各项占比
// @author       you
// @match        https://console.anthropic.com/*
// @icon         https://console.anthropic.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待浮窗出现并增强
    function enhanceTooltip() {
        // 查找所有浮窗容器（定位到带图例和数字的 tooltip）
        document.querySelectorAll('div[style*="z-index: 9999999"]').forEach(el => {
            if (el.dataset.enhanced) return;

            // 找到数字列容器 — 里面包含三个 token 数值
            const cols = el.querySelectorAll('div[style*="flex-direction: column"][style*="gap: 8px"]');
            if (cols.length < 2) return;

            const numCol = cols[1]; // 第二个 column 是数字
            const nums = numCol?.querySelectorAll('div[style*="justify-content: flex-end"]');
            if (!nums || nums.length < 3) return;

            // 解析三个数值（命中、未命中、输出）
            const vals = [];
            nums.forEach(n => {
                const txt = n.textContent.trim();
                const m = txt.match(/[\d,.]+/);
                vals.push(m ? parseFloat(m[0].replace(/,/g, '')) : 0);
            });
            const [hit, miss, output] = vals;
            const totalInput = hit + miss;

            // 计算百分比
            const hitRate = totalInput > 0 ? (hit / totalInput * 100) : 0;
            const inputPct = (hit + miss + output) > 0 ? ((hit + miss) / (hit + miss + output) * 100) : 0;
            const outputPct = (hit + miss + output) > 0 ? (output / (hit + miss + output) * 100) : 0;

            // 为每个数值追加百分比显示
            const colorLabels = ['#A0DCFD', '#60B3FE', '#0C70F3'];
            nums.forEach((n, idx) => {
                if (n.dataset.enhanced) return;
                const orig = n.textContent.trim();

                let pct = '';
                if (idx === 0 && totalInput > 0) {
                    pct = ` (${hitRate.toFixed(1)}%)`;        // 命中率 = 命中/总输入
                } else if (idx === 1 && totalInput > 0) {
                    pct = ` (${(100 - hitRate).toFixed(1)}%)`; // 未命中率
                } else if (idx === 2 && (hit + miss + output) > 0) {
                    pct = ` (${outputPct.toFixed(1)}%)`;       // 输出占总比
                }

                if (pct) {
                    const span = document.createElement('span');
                    span.textContent = pct;
                    span.style.cssText = `color: ${colorLabels[idx]}; font-size: 11px; margin-left: 2px;`;
                    n.appendChild(span);
                }

                // 缓存命中率高亮条
                if (idx === 0 && totalInput > 0) {
                    const bar = document.createElement('div');
                    bar.style.cssText = `height: 3px; background: linear-gradient(90deg, #0C70F3 ${hitRate}%, #e0e0e0 ${hitRate}%); border-radius: 2px; margin-top: 2px;`;
                    n.appendChild(bar);
                }

                n.dataset.enhanced = '1';
            });

            // 在日期下方加一行汇总
            const dateEl = cols[0]?.querySelector('div[style*="font-weight: var(--ds-font-weight-strong)"]');
            if (dateEl && totalInput > 0) {
                const summary = document.createElement('div');
                summary.style.cssText = 'font-size: 11px; color: rgb(var(--ds-rgb-label-2)); margin-top: 4px;';
                summary.textContent = `缓存命中率 ${hitRate.toFixed(1)}%`;
                dateEl.appendChild(summary);
            }

            el.dataset.enhanced = '1';
        });
    }

    // 监听 DOM 变化（浮窗是动态出现的）
    const observer = new MutationObserver(() => enhanceTooltip());
    observer.observe(document.body, { childList: true, subtree: true });

    // 初始执行
    setTimeout(enhanceTooltip, 1000);
})();
