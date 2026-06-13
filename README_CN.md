<div align="center">
  <img src="public/logo.svg" alt="JobPilot" width="200">

  **本地优先的 AI 简历工作台**

  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![GitHub Release](https://img.shields.io/github/v/release/jlifeng/JobPilot?color=brightgreen)](https://github.com/jlifeng/JobPilot/releases)
  [![GitHub Stars](https://img.shields.io/github/stars/jlifeng/JobPilot?style=social)](https://github.com/jlifeng/JobPilot/stargazers)
  [![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
  [![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-0078d4)](./desktop)
  [![Linux.do](https://img.shields.io/badge/Linux.do-社区-blue)](https://linux.do/)

  [English](./README.md) | 中文文档 | [贡献指南](./CONTRIBUTING.md)

  **🎯 数据留在本地。隐私由你掌控。简历在 AI 协助下变得更好。**

</div>


---

## 🎥 演示视频

> **👉 [观看 60 秒演示视频](https://www.bilibili.com/video/BV11pJp6sEt2/?share_source=copy_web&vd_source=8389da06f877de3cbf53d43b449f8022)** 或查看下方截图

JobPilot 是一款本地优先的 AI 求职桌面应用，聚焦简历编写、AI 辅助评审、JD 匹配、模拟面试和本地求职资料管理。它把导入、编辑、导出、同步和持续优化整合进桌面端工作台，下载安装后即可使用，无需搭建服务端。

### 💡 为什么选择 JobPilot？

| 功能特性 | JobPilot | 在线简历工具 |
|---------|----------|-------------|
| **隐私保护** | ✅ 100% 本地存储，不上传数据 | ❌ 简历存储在第三方服务器 |
| **AI 集成** | ✅ 原生工具调用，精确编辑 | ⚠️ 仅支持全文替换 |
| **离线使用** | ✅ 无需联网即可工作 | ❌ 必须持续联网 |
| **数据所有权** | ✅ SQLite + WebDAV 自主同步 | ❌ 供应商锁定 |
| **使用成本** | ✅ 免费开源 | 💰 按月订阅 |
| **自定义程度** | ✅ 50+ 模板，完全掌控 | ⚠️ 模板数量有限 |

## 功能特色

- **原生桌面工作台** — 基于 Tauri 2、React、TypeScript 和 Rust 构建，提供轻量、本地化的 Windows、macOS Apple Silicon 与 Intel Mac 体验。
- **真实工作区数据** — 工作台基于本地简历、最近面试、WebDAV 同步状态和 AI 分析记录展示内容，不再依赖演示假数据。
- **AI 简历评审与编辑** — 支持简历生成、改写、语法检查、JD 匹配、ATS 检查、求职信和 AI 润色，专用入口可按建议逐条应用修改。
- **Anthropic 工具调用支持** — 支持 Anthropic 原生 `tool_use` / `tool_result` 调用链，AI 助手可通过 `replaceResumeText` 精确替换文本片段，而不是整份简历覆盖。
- **多格式导入** — 支持 JSON、Markdown、PDF、图片等格式导入；普通 PDF 和扫描件可结合多模态 AI 解析为结构化简历。
- **隐私友好的导出** — 支持 PDF、智能一页 PDF、HTML、纯文本、Markdown 和 JSON 导出，并可一键脱敏姓名、手机号、邮箱、公司、学校和私人链接。
- **编辑体验优化** — 支持模块拖拽、行内编辑、自动保存、Markdown 工具栏、长文本列表编辑和 50+ 简历模板。
- **模拟面试与复盘** — 可根据 JD 和目标岗位创建面试，支持候选人回答评分、薄弱点分析、追问风险和训练计划。
- **WebDAV 加密同步** — 支持将简历、设置和 API 密钥加密备份到 123云盘、坚果云、Nextcloud 等 WebDAV 服务，支持手动恢复和可配置自动同步。
- **发布与更新流程** — 支持应用内更新检测、版本同步、Windows/macOS 安装包构建，以及从更新日志生成 Release Notes。

## 近期亮点

- **v1.5.0** — 桌面工作台重构、AI 分析记录落库、WebDAV 自动同步、AI 生成简历、设置页简化、深色模式优化和更完整的模拟面试反馈。
- **v1.4.1** — 发布流程新增 Intel Mac 构建，与 Windows 和 macOS Apple Silicon 安装包一并生成。
- **v1.4.0** — 导出数据脱敏、Anthropic 简历编辑工具、局部文本替换和更稳定的 AI 流式输出。
- **v1.3.0** — 工作台布局重构、编辑器预览与侧边栏优化、面试删除/重新开始、Anthropic 面试流式对话。
- **v1.2.2** — WebDAV 加密云端同步，支持快照备份与恢复。
- **v1.1.x** — 桌面端打包、多格式导入、PDF 解析增强、应用内更新、模板优化和 macOS 支持。

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新记录。

## 后续计划

以下是计划在后续版本中开发的功能：

- **AI 分析中心** — 集中查看历史 JD 匹配、ATS 检查、语法检查、求职信和后续行动建议。
- **简历版本管理** — 支持简历版本对比、历史恢复，并管理面向不同岗位的简历变体。
- **JD 与投递跟踪** — 保存目标岗位，把 JD、简历、模拟面试和 AI 分析关联起来，本地跟踪投递进度。
- **面试训练闭环** — 将薄弱点和回答评分转化为专项练习，持续追踪练习效果。
- **同步可靠性增强** — 增加 WebDAV 冲突处理、同步历史和更清晰的多设备恢复流程。

> 💡 **欢迎贡献想法！** 如果你有功能建议或发现了 Bug，欢迎在 [GitHub Issues](https://github.com/jlifeng/JobPilot/issues) 中提出，或者直接提交 Pull Request。

## 产品截图

### 工作台

| 工作台 | 深色模式 |
|:------:|:--------:|
| ![工作台](images/工作台.png) | ![深色模式](images/深色模式.png) |

### 简历生成与模板库

| AI 生成简历 | 模板库 |
|:-----------:|:------:|
| ![AI生成简历](images/AI生成简历.png) | ![模板库](images/模板库.png) |

### AI 助手与配置

| AI 助手 | AI 助手配置 |
|:------:|:------------:|
| ![AI助手](images/AI助手.png) | ![AI助手配置](images/AI助手配置.png) |

### 导入与导出

| 多项导出 | AI 解析 Markdown | AI 解析 PDF |
|:--------:|:----------------:|:----------:|
| ![多项导出](images/多项导出.png) | ![AI解析markdown文件](images/AI解析markdown文件.png) | ![AI解析PDF文件](images/AI解析PDF文件.png) |

### 模拟面试

| 模拟面试 | 模拟面试对话 | 面试报告 |
|:--------:|:------------:|:--------:|
| ![模拟面试](images/模拟面试.png) | ![模拟面试对话](images/模拟面试对话.png) | ![面试报告](images/面试报告.png) |

## 🚀 快速开始

### 下载安装

1. 前往 [GitHub Releases](https://github.com/jlifeng/JobPilot/releases) 下载最新版本
2. 下载对应平台的安装包：
   - **Windows**: `.msi` 安装包
   - **macOS (Apple Silicon)**: `.dmg` 适用于 M1/M2/M3 芯片
   - **macOS (Intel)**: `.dmg` 适用于 Intel 芯片
3. 双击安装，启动应用

**📖 [完整安装指南 →](docs/GETTING_STARTED.md)**

### 首次使用

1. **配置 AI 服务商**（设置 → AI 助手）
   - 添加 OpenAI、Anthropic 或 Google API 密钥
   - [免费 API 密钥获取指南 →](https://github.com/jlifeng/JobPilot/wiki)

2. **创建第一份简历**
   - AI 从头生成
   - 从 PDF/Markdown/JSON 导入
   - 或从模板开始

3. **使用 AI 润色**
   - 点击任意模块的 ✨ 润色按钮
   - 获取 JD 匹配建议
   - 选择性应用修改

### 💾 数据备份（可选）

在设置中启用 WebDAV 同步，备份到：
- 123云盘
- 坚果云
- Nextcloud
- 任何 WebDAV 兼容服务

---

## 📚 文档

- **[快速入门指南](docs/GETTING_STARTED.md)** - 详细的安装和使用说明
- **[贡献指南](CONTRIBUTING.md)** - 如何为 JobPilot 贡献
- **[安全策略](SECURITY.md)** - 负责任地报告漏洞
- **[更新日志](CHANGELOG.md)** - 版本历史和更新

## 从源码构建

### 环境要求

- Node.js 20+
- pnpm 9+
- Rust stable（构建桌面应用时需要）
- Tauri 2 Windows 工具链

### 安装依赖

```bash
git clone https://github.com/jlifeng/JobPilot.git
cd JobPilot
pnpm install
```

### 开发模式

```bash
# 启动 Tauri 桌面应用开发模式
pnpm run dev:tauri

# 启动 Web 版本开发模式
pnpm run dev:web
```

### 构建发布

```bash
# 构建 Tauri 桌面应用
pnpm run build:tauri
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16、React 19 |
| 桌面应用 | Tauri 2、Rust |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| UI 组件 | shadcn/ui |
| 状态管理 | Zustand |
| AI SDK | Vercel AI SDK |
| 本地数据 | SQLite、OS Keyring |
| 云端同步 | WebDAV |

## 开源协议

本项目基于 [Apache License Version 2.0](LICENSE) 开源。

## 致谢

JobPilot 包含来自 [JadeAI](https://github.com/LingyiChen-AI/JadeAI) 的开源工作，感谢原作者和开源社区的贡献。

---
