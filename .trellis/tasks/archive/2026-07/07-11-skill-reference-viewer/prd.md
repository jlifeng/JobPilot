# Skill 引用文件内容查看

## Goal

Skill 管理页面详情面板中，引用文件区域从只显示数量改为可展开列表，每个条目显示文件名，点击可查看全文内容。

## What I already know

- `SkillReference` 类型（types/skill.ts:65-74）已有 `key`、`label`、`filename`、`content` 四个字段，数据完整。
- 详情面板 `skill-detail-panel.tsx:168-176` 当前只渲染 `references.length` 数字。
- `skill.references` 从 Rust 端序列化过来，imported Skill 的 references 已正确加载（`collect_reference_entries` 读取 `references/*.md` 全文）。
- builtin Skill 的 references 为空数组，不需要展示。

## Requirements

- references 区域改为可折叠列表：默认折叠显示数量，展开后列出每个引用文件的 label/filename
- 每个条目可点击展开查看 content 全文（markdown 内容，用等宽字体或 prose 渲染）
- 无引用时保持现状（显示 0）
- 样式与详情面板其他区域一致（slate/zinc 色系、rounded-lg border 卡片）

## Acceptance Criteria

- [ ] references > 0 时，区域可展开显示文件列表
- [ ] 每个条目显示 label + filename，点击可展开查看 content
- [ ] content 以可读格式展示（保留换行、等宽或 prose）
- [ ] references = 0 时行为不变（只显示数字 0）
- [ ] builtin Skill（references 为空）不受影响

## Definition of Done

- `tsc -b` + `cargo build` 通过
- 详情面板 references 区域交互正常

## Out of Scope

- references 编辑/删除/新增
- markdown 实时预览渲染（纯文本展示即可）
