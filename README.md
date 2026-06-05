<div align="center">
  <img src="public/logo.svg" alt="JobPilot" width="200">

  **Local-First AI Resume Workbench**

  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
  [![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
  [![Platform](https://img.shields.io/badge/Platform-Windows-0078d4)](./desktop)
  [![Linux.do](https://img.shields.io/badge/Linux.do-Community-blue)](https://linux.do/)

  [中文文档](./README_CN.md) | English

</div>

<img width="1536" height="1024" alt="JobPilot Screenshot" src="https://github.com/user-attachments/assets/a8d4fef2-969f-4cc8-a168-ad78771a4d35" />

---

JobPilot is a **local-first AI-powered desktop application** for job seekers, helping you create, optimize resumes, simulate interviews, and review performance. From resume writing to interview preparation, JobPilot covers the entire job hunting workflow. Simply download and start using—no server setup required.

## ✨ Key Features

<details>
<summary><b>Core Features (from JadeAI)</b></summary>

- **Drag-and-Drop Resume Editor** — Inline editing, auto-save, module reordering
- **50+ Resume Templates** — Classic, modern, minimal, ATS-friendly styles with theme customization
- **AI Assistant** — Resume generation, content optimization, JD matching analysis, cover letter writing, translation & polishing
- **Resume Parsing** — Extract resume content from PDF and images
- **Multi-Format Export** — PDF, PNG, Word, and more
- **Resume Sharing** — Generate shareable links for easy distribution
- **LinkedIn Headshot** — AI-generated professional portrait photos
- **Bilingual Support** — Full internationalization (English/Chinese)
- **Local-First** — Data stored locally, privacy guaranteed

</details>

<details open>
<summary><b>JobPilot Exclusive Features</b></summary>

- **Tauri Desktop App** — Built with Tauri 2 for a native, lightweight, and fast experience. Supports Mac (Apple Silicon)
- **Multi-Format Import** — Import from JSON, Markdown, PDF, and images (PNG/JPG/WebP) with AI-powered smart parsing
- **Enhanced PDF Import** — Supports both regular PDFs and scanned documents using multimodal AI models
- **Markdown Editor** — New editor component with toolbar shortcuts (bold, italic, code, lists, links)
- **Textarea List Component** — Multi-line text input for editing long-form content like experience descriptions
- **In-App Updates** — Automatic update detection and installation
- **Model List Refresh** — Manually refresh available AI models for quick selection
- **Layout Optimization** — Continuous improvements to styling
- **More Templates** — Regularly updated template library
- **WebDAV Cloud Sync** — Encrypted backup to 123Cloud, Nutstore, Nextcloud, and other WebDAV servers with one-click restore

</details>

## 📋 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## 🗺️ Roadmap

Planned features for upcoming releases:

- **LinkedIn Headshot** — AI-generated professional portrait photos
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
2. Download the Windows installer (`.exe` or `.msi`)
3. Double-click to install and launch the app

> Currently supports Windows. macOS version is planned.

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
| Desktop App | Tauri 2 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui |
| State Management | Zustand |
| AI SDK | Vercel AI SDK |

## 📄 License

This project is open-sourced under the [Apache License Version 2.0](LICENSE).

## 🙏 Acknowledgments

This project is built upon the following open-source projects:
- [JadeAI](https://github.com/LingyiChen-AI/JadeAI) — Thanks to the original author for the open-source contribution
- [RoleRover](https://github.com/lingshichat/RoleRover) — Thanks to the original author for continuous maintenance

---
