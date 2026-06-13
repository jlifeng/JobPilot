<div align="center">
  <img src="public/logo.svg" alt="JobPilot" width="200">

  **Local-First AI Resume Workbench**

  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![GitHub Release](https://img.shields.io/github/v/release/jlifeng/JobPilot?color=brightgreen)](https://github.com/jlifeng/JobPilot/releases)
  [![GitHub Stars](https://img.shields.io/github/stars/jlifeng/JobPilot?style=social)](https://github.com/jlifeng/JobPilot/stargazers)
  [![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
  [![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-0078d4)](./desktop)
  [![Linux.do](https://img.shields.io/badge/Linux.do-Community-blue)](https://linux.do/)

  [中文文档](./README_CN.md) | English | [Contributing](./CONTRIBUTING.md)

  **🎯 Your data stays local. Your privacy stays yours. Your resumes get better with AI.**

</div>


---

## 🎥 Demo

> **👉 [Watch 60s Demo Video](https://www.bilibili.com/video/BV11pJp6sEt2/?share_source=copy_web&vd_source=8389da06f877de3cbf53d43b449f8022)** or see screenshots below

JobPilot is a **local-first AI job-search desktop app** focused on resume writing, AI-assisted review, JD matching, mock interviews, and private document management. It packages the job-search workflow into a native desktop workspace, so you can import, edit, export, sync, and iterate on your materials without running a server.

### 💡 Why JobPilot?

| Feature | JobPilot | Online Resume Builders |
|---------|----------|------------------------|
| **Privacy** | ✅ 100% local, no data upload | ❌ Your resume on their servers |
| **AI Integration** | ✅ Native tool calling, precise edits | ⚠️ Full text replacement only |
| **Offline Access** | ✅ Works without internet | ❌ Requires constant connection |
| **Data Ownership** | ✅ SQLite + WebDAV sync | ❌ Vendor lock-in |
| **Cost** | ✅ Free & open source | 💰 Monthly subscription |
| **Customization** | ✅ 50+ templates, full control | ⚠️ Limited templates |

## ✨ Key Features

- **Native Desktop Workspace** — Built with Tauri 2, React, TypeScript, and Rust for a lightweight local app experience on Windows, macOS Apple Silicon, and Intel Mac.
- **Real Workspace Signals** — The dashboard is driven by local resumes, recent interviews, WebDAV sync status, and saved AI analysis records instead of demo data.
- **AI Resume Review & Editing** — Resume generation, rewriting, grammar checks, JD matching, ATS checks, cover letters, and AI polishing with per-suggestion application for targeted edits.
- **Anthropic Tool Use Support** — Native Anthropic `tool_use` / `tool_result` flow for resume editing, including precise `replaceResumeText` patches instead of whole-resume rewrites.
- **Multi-Format Import** — Import resumes from JSON, Markdown, PDF, and images. Regular PDFs and scanned documents can be parsed with multimodal AI.
- **Privacy-Aware Export** — Export to PDF, smart one-page PDF, HTML, plain text, Markdown, and JSON, with an optional masking switch for names, phone numbers, emails, companies, schools, and private links.
- **Editor Experience** — Drag-and-drop sections, inline editing, auto-save, Markdown toolbar shortcuts, textarea lists for long content, and 50+ resume templates.
- **Mock Interview & Review** — Create interview sessions from a JD and target role, simulate conversations, score candidate answers, review weak points, and get a training plan.
- **Encrypted WebDAV Sync** — Back up resumes, settings, and API keys to 123Cloud, Nutstore, Nextcloud, and other WebDAV services, with manual restore and configurable auto sync.
- **Release & Update Flow** — In-app update checks, version synchronization, Windows/macOS packaging, and release notes generated from the changelog.

## 🚀 Recent Highlights

- **v1.5.0** — Desktop workbench redesign, AI analysis records, auto WebDAV sync, AI resume generation, simplified settings, dark mode polish, and richer mock interview feedback.
- **v1.4.1** — Added Intel Mac release builds alongside Windows and macOS Apple Silicon artifacts.
- **v1.4.0** — Export data masking, Anthropic resume editing tools, precise text replacement, and more stable AI streaming output.
- **v1.3.0** — Redesigned workspace layout, improved editor preview/sidebar, interview deletion/restart, and Anthropic interview streaming.
- **v1.2.2** — Encrypted WebDAV cloud sync with snapshot backup and restore.
- **v1.1.x** — Desktop packaging, multi-format import, enhanced PDF parsing, app updates, template improvements, and macOS support.

## 📋 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## 🗺️ Roadmap

Planned features for upcoming releases:

- **AI Analysis Center** — A dedicated place to review historical JD matches, ATS checks, grammar reviews, cover letters, and follow-up actions.
- **Resume Version Management** — Compare resume revisions, restore earlier versions, and keep role-specific resume variants organized.
- **JD & Application Tracker** — Save target jobs, connect each JD to resumes/interviews/AI analysis, and track application progress locally.
- **Interview Training Loop** — Turn weak points and answer scores into focused practice sessions with measurable improvement over time.
- **Sync Reliability** — Add WebDAV conflict handling, sync history, and clearer recovery flows for multi-device usage.

> 💡 **Contributions Welcome!** If you have feature suggestions or find bugs, please open an issue on [GitHub Issues](https://github.com/jlifeng/JobPilot/issues) or submit a Pull Request directly.

## 📸 Screenshots

### Workspace

| Workspace | Dark Mode |
|:---------:|:---------:|
| ![Workspace](images/工作台.png) | ![Dark Mode](images/深色模式.png) |

### Resume Creation & Templates

| AI Resume Generation | Template Library |
|:--------------------:|:----------------:|
| ![AI Resume Generation](images/AI生成简历.png) | ![Template Library](images/模板库.png) |

### AI Assistant & Configuration

| AI Assistant | AI Config |
|:------------:|:---------:|
| ![AI Assistant](images/AI助手.png) | ![AI Config](images/AI助手配置.png) |

### Import & Export

| Multi-Format Export | Parse Markdown | Parse PDF |
|:-------------------:|:--------------:|:---------:|
| ![Export](images/多项导出.png) | ![Parse Markdown](images/AI解析markdown文件.png) | ![Parse PDF](images/AI解析PDF文件.png) |

### Mock Interview

| Interview Setup | Interview Conversation | Interview Report |
|:---------------:|:----------------------:|:----------------:|
| ![Interview Setup](images/模拟面试.png) | ![Interview Conversation](images/模拟面试对话.png) | ![Interview Report](images/面试报告.png) |

## 🚀 Quick Start

### Download & Install

1. Visit [GitHub Releases](https://github.com/jlifeng/JobPilot/releases)
2. Download the latest installer:
   - **Windows**: `.msi` installer
   - **macOS (Apple Silicon)**: `.dmg` for M1/M2/M3 Macs
   - **macOS (Intel)**: `.dmg` for Intel Macs
3. Install and launch

**📖 [Full Installation Guide →](docs/GETTING_STARTED.md)**

### First Steps

1. **Configure AI Provider** (Settings → AI Assistant)
   - Add your OpenAI, Anthropic, or Google API key
   - [Get free API keys guide →](https://github.com/jlifeng/JobPilot/wiki)

2. **Create Your First Resume**
   - Use AI generation from scratch
   - Import from PDF/Markdown/JSON
   - Or start with a template

3. **Polish with AI**
   - Click the ✨ polish button on any section
   - Get JD-matching suggestions
   - Apply changes selectively

### 💾 Backup Your Data (Optional)

Enable WebDAV sync in Settings to backup to:
- 123Cloud (123云盘)
- Nutstore (坚果云)
- Nextcloud
- Any WebDAV-compatible service

---

## 📚 Documentation

- **[Getting Started Guide](docs/GETTING_STARTED.md)** - Detailed setup and usage instructions
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to JobPilot
- **[Security Policy](SECURITY.md)** - Report vulnerabilities responsibly
- **[Changelog](CHANGELOG.md)** - Version history and updates

## 🔧 Build from Source

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust stable (required for desktop app build)
- Tauri 2 Windows toolchain

### Install Dependencies

```bash
git clone https://github.com/jlifeng/JobPilot.git
cd JobPilot
pnpm install
```

### Development Mode

```bash
# Start Tauri desktop app in development mode
pnpm run dev:tauri

# Start web version in development mode
pnpm run dev:web
```

### Build for Production

```bash
# Build Tauri desktop application
pnpm run build:tauri
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16, React 19 |
| Desktop App | Tauri 2, Rust |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui |
| State Management | Zustand |
| AI SDK | Vercel AI SDK |
| Local Data | SQLite, OS Keyring |
| Sync | WebDAV |

## 📄 License

This project is open-sourced under the [Apache License Version 2.0](LICENSE).

## 🙏 Acknowledgments

JobPilot includes work derived from [JadeAI](https://github.com/LingyiChen-AI/JadeAI). Thanks to the original author and the open-source community.

---
