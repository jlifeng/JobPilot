<div align="center">
  <img src="public/logo.svg" alt="JobPilot" width="200">

  **本地优先的 AI 简历工作台**

  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
  [![Platform](https://img.shields.io/badge/Platform-Windows-0078d4)](./desktop)
  [![Linux.do](https://img.shields.io/badge/Linux.do-社区-blue)](https://linux.do/)

  English | [中文文档](./README.md)

</div>

<img width="1536" height="1024" alt="JobPilot Screenshot" src="https://github.com/user-attachments/assets/a8d4fef2-969f-4cc8-a168-ad78771a4d35" />


---

JobPilot 是一款本地优先的 AI 求职桌面应用，帮助你完成简历编写与优化、面试模拟与复盘，从简历到面试全覆盖。下载安装后即可开始使用，无需搭建服务端环境。

## 功能特色

<details>
<summary><b>原有功能（来自 JadeAI）</b></summary>

- **拖拽式简历编辑器** — 支持行内编辑、自动保存、模块拖拽排序
- **50+ 简历模板** — 涵盖经典、现代、极简、ATS 友好等多种风格，支持主题定制
- **AI 智能助手** — 简历生成、内容优化、JD 匹配分析、求职信撰写、翻译润色
- **简历解析** — 支持从 PDF 和图片中解析简历内容
- **多格式导出** — 支持 PDF、PNG、Word 等格式导出
- **简历分享** — 生成分享链接，方便投递和展示
- **LinkedIn 职业照** — AI 生成专业证件照
- **中英双语** — 完整的国际化支持
- **本地优先** — 数据存储在本地，隐私安全有保障

</details>

<details open>
<summary><b>JobPilot 新增功能</b></summary>

- **Tauri 桌面端** — 基于 Tauri 2 构建原生桌面应用，更轻量、更快的体验，支持 Mac（Apple Silicon 芯片）
- **多格式导入** — 支持 JSON、Markdown、PDF、图片（PNG/JPG/WebP）多种格式导入，AI 智能解析简历内容
- **PDF 导入增强** — 支持普通 PDF 和扫描件，图片与扫描 PDF 使用多模态模型智能解析
- **Markdown 编辑器** — 新增编辑器组件，支持工具栏快捷操作（加粗、斜体、代码、列表、链接）
- **文本域列表组件** — 支持多行文本输入，适合编辑经历描述等长文本内容
- **应用内更新** — 自动检测并安装新版本
- **模型列表获取** — 支持手动刷新获取可用模型列表，快速选择模型
- **排版样式优化** - 持续更新
- **更多模板** — 持续更新
- **WebDAV 云端同步** — 加密备份到 123云盘、坚果云、Nextcloud 等 WebDAV 服务器，一键恢复

</details>

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新记录。

## 后续计划

以下是计划在后续版本中开发的功能：

- **LinkedIn 证件照** — AI 生成专业证件照功能
- **简历版本管理** — 支持简历历史版本对比与恢复

> 💡 **欢迎贡献想法！** 如果你有功能建议或发现了 Bug，欢迎在 [GitHub Issues](https://github.com/jlifeng/JobPilot/issues) 中提出，或者直接提交 Pull Request。

## 产品截图

### 工作台与模版库

| 工作台 | 模版库 |
|:------:|:------:|
| ![工作台](images/工作台.png) | ![模版库](images/模版库.png) |

### 简历编辑与 AI 助手

| 编辑简历 | AI 助手 |
|:--------:|:------:|
| ![编辑简历](images/编辑简历.png) | ![AI助手](images/AI助手.png) |

### AI 配置与导入

| AI 助手配置 | AI 解析 Markdown | AI 解析 PDF |
|:----------:|:----------------:|:----------:|
| ![AI助手配置](images/AI助手配置.png) | ![AI解析markdown文件](images/AI解析markdown文件.png) | ![AI解析PDF文件](images/AI解析PDF文件.png) |

### 导出与面试

| 多项导出 | 模拟面试 | 面试报告 |
|:--------:|:--------:|:--------:|
| ![多项导出](images/多项导出.png) | ![模拟面试](images/模拟面试.png) | ![面试报告](images/面试报告.png) |

## 下载安装

1. 前往 [GitHub Releases](https://github.com/jlifeng/JobPilot/releases) 下载最新版本
2. 下载 Windows 安装包（`.exe` 或 `.msi`）
3. 双击安装，启动应用

> 目前支持 Windows 平台，macOS 版本计划开发中。

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
| 桌面应用 | Tauri 2 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| UI 组件 | shadcn/ui |
| 状态管理 | Zustand |
| AI SDK | Vercel AI SDK |

## 开源协议

本项目基于 [Apache License Version 2.0](LICENSE) 开源。

## 致谢

本项目基于以下开源项目二次开发：
- [JadeAI](https://github.com/LingyiChen-AI/JadeAI) — 感谢原作者的开源贡献
- [RoleRover](https://github.com/lingshichat/RoleRover) — 感谢原作者的持续维护

---
