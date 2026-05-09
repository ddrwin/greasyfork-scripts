# greasyfork-scripts

ddrwin 的 Greasy Fork 油猴脚本仓库。

## 脚本列表

### 🔓 公开脚本

| 脚本 | 最新版本 | 说明 | Greasy Fork 链接 |
|------|---------|------|-----------------|
| **Baidu++** | v2.2 | 百度搜索结果页增强：添加磁力、种子、网盘、知乎、小红书等多引擎搜索；Google/Bing 互搜；自动翻页；去广告 | [Greasy Fork](https://greasyfork.org/scripts/396960) |
| **豆包 & DeepSeek 自动专家** | v4.0 | 豆包默认思考模式 + 遥测拦截 + 全宽；DeepSeek 自动专家模式 + 智能搜索关闭 + 全宽 | [Greasy Fork](https://greasyfork.org/scripts/538175) |
| **极简划词搜索** | v2.5.1 | 超小尺寸悬浮窗，支持划词搜索、复制、打开链接；拖拽链接/图片保存；预定义高亮样式；图标显示开关；自定义搜索引擎 | [Greasy Fork](https://greasyfork.org/scripts/566626) |
| **知乎++** | v4.0 | 知乎增强：清理标题括号数字、隐藏消息/私信、解除复制限制、护眼色、卡片化设计 | [Greasy Fork](https://greasyfork.org/scripts/571059) |
| **DeepSeek Token 千分位** | v8.6 | DeepSeek 用量页 Token 数字千分位格式化 + 缓存命中率可视化 | - |
| **DeepSeek 侧边栏永恒守护** | v2.5 | DeepSeek 侧边栏保持展开，SPA 兼容 | - |
| **DeepSeek 对话导出器** | v0.1.0 | DeepSeek 对话导出工具 | - |
| **Mydrivers/今日头条/IT之家 净化** | v2.0 | 新闻站净化阅读、宽度适配、关键词高亮与屏蔽 | [Greasy Fork](https://greasyfork.org/scripts/397075) |
| **SingleFile 自动展开助手** | v1.0 | 配合 SingleFile 自动展开页面内容 | - |
| **关闭CSDN动态背景** | v1.1 | 关闭 CSDN 动态背景特效 + 隐藏右侧工具栏 | [Greasy Fork](https://greasyfork.org/scripts/571060) |
| **豆包 & DeepSeek 全家桶 (Claude版)** | v1.1 | 自动专家 + Token 千分位 + 侧边栏守护 三合一（Claude 重构版） | - |
| **豆包 & DeepSeek 全家桶 (deepseek版)** | v1.3 | 自动专家 + Token 千分位 + 侧边栏守护 三合一（deepseek 重构版） | - |

### 🔒 私有脚本（暂不公开）

| 脚本 | 最新版本 | 说明 |
|------|---------|------|
| **绿联NAS自动重连** | v1.1 | 绿联 NAS 自动重新连接（含个人密码配置） |
| **Chiphell 高亮关键词** | v0.6 | Chiphell 网站关键词高亮及隐藏勋章 |
| **去除雪球弹窗** | v1.2 | 去除雪球弹窗、侧边栏、聊天栏 |

## 目录结构

```
greasyfork-scripts/
├── README.md             # 本文件，脚本总览
├── docs/                 # 公共文档
│   └── case_logs/        # 案例日志
├── 脚本名称/             # 每个脚本一个目录
│   ├── README.md         # 脚本说明（版本、功能、更新日志）
│   ├── 脚本名.user.js    # 最新版本
│   └── archive/          # 历史版本存档
├── ...
```

各脚本目录均包含 `README.md`，记录版本号、功能说明和更新日志。

## 许可证

各脚本许可证以文件头元数据块声明为准，默认 MIT License。
