# 预览版发布文档更新

## Goal

准备预览版发布前的文档：更新 README / README_CN / CHANGELOG，并加入 images 目录下新增的两张 Skills 截图与近期新功能说明。

## Requirements

- CHANGELOG 新增预览版条目（1.6.0-preview），覆盖 Skill 系统与近期面试/管理页改进
- README.md / README_CN.md 的「近期亮点」补充最近几个版本（含预览版）
- Key Features 增加 Skill 系统能力说明
- Screenshots 新增 Skills 相关截图（管理页 + AI 对话框效果）
- 清理截图文件名中的空格，避免 Markdown 链接脆弱

## Out of Scope

- 不改 package.json / tauri 版本号（文档先行，版本 bump 另一步）
- 不打 tag、不触发 CI 发布
