// ==UserScript==
// @name         最终稳定版划词搜索（带图标）
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  带图标+冷却机制，复制即消失，彻底解决所有问题
// @author       You
// @match        *://*/*
// @exclude      *://*.baidu.com/*
// @exclude      *://baidu.com/*
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ============= 配置区 =============
    const SEARCH_URL = "https://www.baidu.com/s?wd=";
    
    // 图标常量（已修复显示问题）
    const ICONS = {
        // 复制图标
        copy: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjU1Nzc5ODc4NDY4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0MTciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTM3NyA0MzJoMzQ5YTggOCAwIDAgMSA4IDh2NDhhOCA4IDAgMCAxLTggOEgzNzdhOCA4IDAgMCAxLTgtOHYtNDhhOCA4IDAgMCAxIDgtOHogbTAgMTYwaDI1OGE4IDggMCAwIDEgOCA4djQ4YTggOCAwIDAgMS04IDhIMzc3YTggOCAwIDAgMS04LTh2LTQ4YTggOCAwIDAgMSA4LTh6IG0tNjUtMjgwdjU3Nmg0ODBWMzEySDMxMnogbS00MC03Mmg1NjBjMTcuNjczIDAgMzIgMTQuMzI3IDMyIDMydjY1NmMwIDE3LjY3My0xNC4zMjcgMzItMzIgMzJIMjcyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJWMjcyYzAtMTcuNjczIDE0LjMyNy0zMiAzMi0zMnogbS04OC01NnY2NjRhOCA4IDAgMCAxLTggOGgtNTZhOCA4IDAgMCAxLTgtOFYxNDRjMC0xNy42NzMgMTQuMzI3LTMyIDMyLTMyaDYzMmE4IDggMCAwIDEgOCA4djU2YTggOCAwIDAgMS04IDhIMTg0eiIgZmlsbD0iIzMzMzMzMyIgcC1pZD0iMTQxOCI+PC9wYXRoPjwvc3ZnPg==',
        // 搜索图标（你提供的放大镜，已修复填充色，正常显示）
        search: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjUxNTY3NDk1OTczIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIwNzciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PHN0eWxlIHR5cGU9InRleHQvY3NzIj48L3N0eWxlPjwvZGVmcz48cGF0aCBkPSJNNDQ2LjExMjMyMyAxNzcuNTQ1MDUxYzEzNy41Njc2NzcgMC4yMTk3OTggMjUyLjYxMjUyNSAxMDQuNTk3OTggMjY2LjE2MjQyNCAyNDEuNDkzMzMzIDEzLjU2MjgyOCAxMzYuODk1MzU0LTc4Ljc3ODE4MiAyNjEuODE4MTgyLTIxMy42MTc3NzcgMjg5LjAwODQ4NS0xMzQuODUyNTI1IDI3LjIwMzIzMi0yNjguMzg2MjYzLTUyLjE1Njc2OC0zMDguOTQ1NDU1LTE4My42MDg4ODlzMjUuMDE4MTgyLTI3Mi4yNTIxMjEgMTUxLjczODE4Mi0zMjUuNzc5Mzk0QTI2Ny4yMzU1NTYgMjY3LjIzNTU1NiAwIDAgMSA0NDYuMTEyMzIzIDE3Ny41NDUwNTFtMC02Mi4wNjA2MDdjLTE4Mi43OTQzNDMgMC0zMzAuOTg5ODk5IDE0OC4xOTU1NTYtMzMwLjk4OTg5OSAzMzAuOTg5ODk5czE0OC4xOTU1NTYgMzMwLjk4OTg5OSAzMzAuOTg5ODk5IDMzMC45ODk4OTkgMzMwLjk4OTg5OS0xNDguMTk1NTU2IDMzMC45ODk4OTktMzMwLjk4OTg5OS0xNDguMTk1NTU2LTMzMC45ODk4OTktMzMwLjk4OTg5OS0zMzAuOTg5ODk5eiBtNDMxLjMyMTIxMiA3OTMuMzQxNDE1YTMwLjg0OTI5MyAzMC44NDkyOTMgMCAwIDEtMjEuOTQxMDEtOS4xMDIyMjNsLTE1Ny4yMjAyMDItMTU3LjIyMDIwMmMtMTEuNzUyNzI3LTEyLjE3OTM5NC0xMS41ODQ2NDYtMzEuNTM0NTQ1IDAuMzc0OTUtNDMuNTA3MDcgMTEuOTcyNTI1LTExLjk3MjUyNSAzMS4zMjc2NzctMTIuMTQwNjA2IDQzLjQ5NDE0MS0wLjM3NDk1bDE1Ny4yMjAyMDIgMTU3LjIyMDIwMmEzMS4wMzY3NjggMzEuMDM2NzY4IDAgMCAxIDYuNzIzMjMyIDMzLjgxMDEwMSAzMS4wMDQ0NDQgMzEuMDA0NDQ0IDAgMCAxLTI4LjY1MTMxMyAxOS4xNzQxNDJ6IG0wIDAiIHAtaWQ9IjIwNzgiIGZpbGw9IiMzMzMzMzMiPjwvcGF0aD48L3N2Zz4='
    };

    // ============= 全局变量 =============
    let toolbar = null;
    let selectedText = "";
    let isCoolingDown = false; // 冷却标志，彻底解决复制后浮窗重现

    // ============= 核心功能 =============
    async function copyText(text) {
        // 1. 立即开启冷却，锁死浮窗生成
        isCoolingDown = true;
        
        // 2. 第一时间强制移除浮窗
        if (toolbar) {
            toolbar.remove();
            toolbar = null;
        }

        // 3. 执行复制操作
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // 兼容旧浏览器兜底方案
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.cssText = "position:absolute;opacity:0;z-index:-999;";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }

        // 4. 500ms冷却期，期间绝对不显示任何浮窗
        setTimeout(() => {
            isCoolingDown = false;
        }, 500);
    }

    function showToolbar(x, y) {
        // 冷却期直接拦截，不生成浮窗
        if (isCoolingDown) return;

        // 先清理旧浮窗，避免重复生成
        if (toolbar) {
            toolbar.remove();
            toolbar = null;
        }

        // 1. 创建浮窗容器（超小尺寸）
        toolbar = document.createElement("div");
        toolbar.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y + 6}px;
            display: flex;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            z-index: 9999999;
            user-select: none;
            font-family: system-ui, -apple-system, sans-serif;
        `;

        // 2. 创建复制按钮（带图标）
        const copyBtn = document.createElement("button");
        copyBtn.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 5px 10px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 12px;
            color: #333333;
            border-right: 1px solid #eeeeee;
            transition: background 0.1s ease;
        `;
        copyBtn.innerHTML = `
            <img src="${ICONS.copy}" style="width: 12px; height: 12px; display: block; flex-shrink: 0;" />
            <span>复制</span>
        `;
        // 按钮事件
        copyBtn.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            copyText(selectedText);
        });
        copyBtn.addEventListener("mouseenter", () => copyBtn.style.background = "#f5f5f5");
        copyBtn.addEventListener("mouseleave", () => copyBtn.style.background = "transparent");

        // 3. 创建百度搜索按钮（带放大镜图标）
        const searchBtn = document.createElement("button");
        searchBtn.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 5px 10px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 12px;
            color: #333333;
            transition: background 0.1s ease;
        `;
        searchBtn.innerHTML = `
            <img src="${ICONS.search}" style="width: 12px; height: 12px; display: block; flex-shrink: 0;" />
            <span>百度</span>
        `;
        // 按钮事件
        searchBtn.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            const url = SEARCH_URL + encodeURIComponent(selectedText);
            window.open(url, "_blank");
            // 点击搜索也立即移除浮窗
            if (toolbar) {
                toolbar.remove();
                toolbar = null;
            }
        });
        searchBtn.addEventListener("mouseenter", () => searchBtn.style.background = "#f5f5f5");
        searchBtn.addEventListener("mouseleave", () => searchBtn.style.background = "transparent");

        // 4. 组装按钮
        toolbar.appendChild(copyBtn);
        toolbar.appendChild(searchBtn);

        // 5. 防止焦点丢失，不影响选词蓝色高亮
        toolbar.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // 6. 边界处理，防止浮窗超出屏幕
        document.body.appendChild(toolbar);
        const rect = toolbar.getBoundingClientRect();
        const screenWidth = document.documentElement.clientWidth;
        const screenHeight = document.documentElement.clientHeight;

        if (rect.right > screenWidth) toolbar.style.left = `${x - rect.width}px`;
        if (rect.bottom > screenHeight) toolbar.style.top = `${y - rect.height - 6}px`;
    }

    // ============= 事件监听 =============
    // 鼠标松开，检测选词生成浮窗
    document.addEventListener("mouseup", (e) => {
        if (isCoolingDown) return;
        setTimeout(() => {
            const text = window.getSelection().toString().trim();
            if (text.length > 0) {
                selectedText = text;
                showToolbar(e.pageX, e.pageY);
            } else {
                // 无选词时清理浮窗
                if (toolbar) {
                    toolbar.remove();
                    toolbar = null;
                }
            }
        }, 10);
    });

    // 点击空白处关闭浮窗
    document.addEventListener("mousedown", (e) => {
        if (toolbar && !toolbar.contains(e.target)) {
            toolbar.remove();
            toolbar = null;
        }
    });
})();