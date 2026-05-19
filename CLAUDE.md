# JobPilot

JobPilot 是一个简历编辑桌面应用，基于 Tauri 2 + React + Rust 构建。项目从开源 Web 项目 fork 而来，Desktop 端通过 Vite alias 直接引用 Web 端 `src/` 下的共享代码。

## 项目结构

```
RoleRover/                          # pnpm monorepo 根目录
  src/                              # 共享前端代码（UI 组件、模板、类型、工具库）
    components/ui/                  # 22 个 shadcn/ui 组件
    components/preview/             # 简历预览 + 50 个模板
    components/dashboard/           # 模板缩略图（template-thumbnail.tsx）
    lib/                            # 工具函数、常量、导出系统、模板渲染器
    types/resume.ts                 # 核心简历数据类型
    app/globals.css                 # 全局 CSS（Desktop 也引用）
  desktop/                          # Tauri 桌面端
    src/                            # Desktop 前端（React + TanStack Router）
      components/editor/            # 编辑器组件
      components/dashboard/         # 仪表盘组件
      components/ai/                # AI 对话组件
      lib/desktop-api.ts            # Tauri invoke 封装层
      stores/                       # Zustand stores
      routes/                       # TanStack Router 路由
      i18n.ts                       # 国际化（react-i18next）
    src-tauri/                      # Rust 后端
      src/lib.rs                    # Tauri 命令注册
      src/storage.rs                # 文档 CRUD、SQLite 操作
      src/ai.rs                     # AI 功能、LLM API 调用
      src/settings.rs               # 设置、密钥管理（OS Keyring）
      src/importer.rs               # 数据迁移
  scripts/                          # 构建和验证脚本
  messages/                         # i18n 翻译文件（en.json、zh.json）
```

## 关键架构

- Desktop 通过 `desktop/vite.config.ts` 中的 `@/` alias 引用 `../src/`（Web 端共享代码）
- 增加模板、修改 UI 组件等共享代码改动，Desktop 端自动生效
- Web 端和 Desktop 端的数据层完全独立（Web 用 Drizzle ORM，Desktop 用 Rust rusqlite）

## 常用命令

```bash
# Desktop 开发
pnpm dev:tauri                      # 启动 Tauri 开发环境
pnpm build:desktop-shell            # 仅构建 Desktop 前端（Vite）
pnpm build:tauri                    # 完整构建（Rust + 前端）

# 验证
pnpm lint                           # ESLint 边界检查
pnpm verify:desktop:version-sync    # 版本同步检查
pnpm verify:desktop:release-readiness # 发布就绪检查

# 版本同步
pnpm sync:desktop-version           # 同步 package.json 版本到 tauri.conf.json 和 Cargo.toml
```

## 密钥存储

- Windows: Credential Manager（Win32 API）
- macOS: Keychain（`keyring` crate）
- 服务名: `JobPilot`，target 格式: `JobPilot/provider.{name}.api_key`
- Fallback: `workspace/secrets/vault-fallback.json`（plaintext，仅在 OS keyring 不可用时使用）

## CI/CD

- `.github/workflows/desktop-build.yml` — PR 验证（lint、version-sync、release-readiness）
- `.github/workflows/release-desktop.yml` — tag 触发（`v*`），构建 Windows + macOS aarch64，生成 Draft Release

## Commit 规范

使用 `fix:` / `ci:` / `feat:` 前缀，英文小写，简洁描述。

## Commit 策略（重要）

- **默认不要执行 `git commit` 或 `git push`**
- 只有在用户明确授权当前更改后，才可以代替用户提交和推送
- 提交前确认：包含的文件、目标分支、远程仓库

## Trellis 开发规范

项目使用 Trellis 管理开发规范。参考 `@/.trellis/` 目录：
- `workflow.md` — 开发工作流
- `spec/` — 项目结构和规范
- `workspace/` — 开发者工作区

## 注意事项

- 不要删除 `src/` 目录下的共享代码，Desktop 端依赖这些文件
- `src/app/globals.css` 虽然在 `src/app/` 下，但 Desktop 也直接引用，不能删除
- `desktop/src-tauri/src/storage.rs` 中的 `rolerover.db` 文件名是历史遗留，不要修改（影响数据迁移）
- `pnpm-workspace.yaml` 定义了 `[., desktop]`，根 package 是共享代码容器
