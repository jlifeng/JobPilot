<div align="center">
  <img src="public/logo.svg" alt="JobPilot" width="200">

  **Local-First AI Resume Workbench**

  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
  [![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-0078d4)](./desktop)
  [![Linux.do](https://img.shields.io/badge/Linux.do-Community-blue)](https://linux.do/)

  [中文文档](./README_CN.md) | English

</div>

<img width="1536" height="1024" alt="JobPilot Screenshot" src="https://github.com/user-attachments/assets/a8d4fef2-969f-4cc8-a168-ad78771a4d35" />

---

JobPilot is a **local-first AI job-search desktop app** focused on resume writing, AI-assisted review, JD matching, mock interviews, and private document management. It packages the job-search workflow into a native desktop workspace, so you can import, edit, export, sync, and iterate on your materials without running a server.

## ✨ Key Features

- **Native Desktop Workspace** — Built with Tauri 2, React, TypeScript, and Rust for a lightweight local app experience on Windows, macOS Apple Silicon, and Intel Mac.
- **AI Resume Review & Editing** — Resume generation, rewriting, grammar checks, JD matching, and AI polishing with per-suggestion application for targeted edits.
- **Anthropic Tool Use Support** — Native Anthropic `tool_use` / `tool_result` flow for resume editing, including precise `replaceResumeText` patches instead of whole-resume rewrites.
- **Multi-Format Import** — Import resumes from JSON, Markdown, PDF, and images. Regular PDFs and scanned documents can be parsed with multimodal AI.
- **Privacy-Aware Export** — Export to PDF, smart one-page PDF, HTML, plain text, Markdown, and JSON, with an optional masking switch for names, phone numbers, emails, companies, schools, and private links.
- **Editor Experience** — Drag-and-drop sections, inline editing, auto-save, Markdown toolbar shortcuts, textarea lists for long content, and 50+ resume templates.
- **Mock Interview & Review** — Create interview sessions from a JD and target role, simulate conversations, delete/restart interview records, and review reports.
- **Encrypted WebDAV Sync** — Back up resumes, settings, and API keys to 123Cloud, Nutstore, Nextcloud, and other WebDAV services with one-click restore.
- **Release & Update Flow** — In-app update checks, version synchronization, Windows/macOS packaging, and release notes generated from the changelog.

## 🚀 Recent Highlights

- **v1.4.1** — Added Intel Mac release builds alongside Windows and macOS Apple Silicon artifacts.
- **v1.4.0** — Export data masking, Anthropic resume editing tools, precise text replacement, and more stable AI streaming output.
- **v1.3.0** — Redesigned workspace layout, improved editor preview/sidebar, interview deletion/restart, and Anthropic interview streaming.
- **v1.2.2** — Encrypted WebDAV cloud sync with snapshot backup and restore.
- **v1.1.x** — Desktop packaging, multi-format import, enhanced PDF parsing, app updates, template improvements, and macOS support.

## 📋 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## 🗺️ Roadmap

Planned features for upcoming releases:

- **Professional Headshot Optimization** — Lightweight LinkedIn/resume avatar cleanup, cropping, and background replacement
- **Resume Version Management** — Compare and restore historical resume versions

> 💡 **Contributions Welcome!** If you have feature suggestions or find bugs, please open an issue on [GitHub Issues](https://github.com/jlifeng/JobPilot/issues) or submit a Pull Request directly.

## 📸 Screenshots

### Workspace & Template Library

| Workspace | Template Library |
|:---------:|:----------------:|
| ![Workspace](images/工作台.png) | ![Templates](images/模版库.png) |

### Resume Editor & AI Assistant

| Edit Resume | AI Assistant |
|:-----------:|:------------:|
| ![Edit Resume](images/编辑简历.png) | ![AI Assistant](images/AI助手.png) |

### AI Configuration & Import

| AI Config | Parse Markdown | Parse PDF |
|:---------:|:--------------:|:---------:|
| ![AI Config](images/AI助手配置.png) | ![Parse Markdown](images/AI解析markdown文件.png) | ![Parse PDF](images/AI解析PDF文件.png) |

### Export & Interview

| Multi-Format Export | Mock Interview | Interview Report |
|:-------------------:|:--------------:|:----------------:|
| ![Export](images/多项导出.png) | ![Interview](images/模拟面试.png) | ![Report](images/面试报告.png) |

## 📥 Installation

1. Go to [GitHub Releases](https://github.com/jlifeng/JobPilot/releases) to download the latest version
2. Download the installer for your platform
3. Double-click to install and launch the app

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
