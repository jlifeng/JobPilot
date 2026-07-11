# 发布 1.6.0-beta.0

## Goal

将当前 Skills 功能分支准备为 beta 发布：版本号同步、CHANGELOG/README 文案统一为 beta，并提交版本 bump。

## Requirements

- 根 `package.json` 版本改为 `1.6.0-beta.0`
- `pnpm sync:desktop-version` 同步 desktop package / tauri.conf / Cargo.toml
- CHANGELOG / README / README_CN 中 `1.6.0-preview` 统一为 `1.6.0-beta.0`
- 提交 `chore: bump version to 1.6.0-beta.0`
- 本地创建 tag `v1.6.0-beta.0`（推送需用户确认）

## Out of Scope

- 不自动 push 到远程
- 不在本地执行完整 Tauri 打包
