# Claude 对话简洁导出器（MD+HTML）

在 claude.ai 对话页面添加导出按钮，一键导出为简洁版 **Markdown** 或 **HTML**。

**版本：** v1.0.0

## 与同类脚本的区别

市面上的 Claude 导出器（如 midasgao 的 Claude Chat Exporter）会导出**所有内容**——包括工具调用（搜索、代码执行、widget）、上传文档原文等。这在阅读时非常干扰。

本脚本只保留：

- ✅ **用户与 Claude 的对话文本**
- ✅ **Claude 的思考过程（thinking）**
- ❌ **过滤工具调用**（tool_use / tool_result）
- ❌ **过滤上传文档原文和附件内容**

## 两种导出格式

| 格式 | 特点 |
|------|------|
| **Markdown** | 纯文本，thinking 用 `> 💭` 引用块表示，适合在 Obsidian/VS Code 等中阅读 |
| **HTML（简洁版）** | 自包含 HTML 文件，语法高亮、暗色/亮色切换、thinking 可折叠展开 |

## 安装

1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 打开 `Claude 对话简洁导出器（MD+HTML） V1.0 (2026.06.11).user.js`
3. Tampermonkey 自动识别并提示安装

或手动复制到 Tampermonkey 新建脚本中。

## 使用方法

1. 打开 Claude.ai 任意对话页面
2. 右下角出现橙色导出按钮
3. 点击按钮 → 选择「导出 Markdown」或「导出 HTML（简洁版）」
4. 文件自动下载

## 实现

- 数据来源：Claude 官方 API（`/api/organizations/.../chat_conversations/...`）
- 数据不经过第三方，仅从 Claude 拉取后在浏览器本地生成文件
- 基于 midasgao 的 [Claude Chat Exporter](https://greasyfork.org/scripts/571748) 的 API 架构改进

## 更新日志

- **2026-06-11:** v1.0.0 — 首个版本
