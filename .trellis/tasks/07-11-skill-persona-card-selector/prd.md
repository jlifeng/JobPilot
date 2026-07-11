# Skill 人设卡片选择器

## Goal

模拟面试 setup-form 的 Skill 人设模式下，将下拉 SkillSelector 替换为卡片列表风格，与内置人设选择卡片保持一致的交互体验。不再显示"默认助手"选项（因为已区分两个 tab）。

## What I already know

- 内置人设卡片：`grid gap-3 md:grid-cols-2`，每个卡片显示 name + title + style，点击切换选中态（选中=彩色背景+shadow，未选中=白底+border），右上角显示"已选/添加"标签。
- SkillSelector 是通用下拉组件，被 AI Chat 和面试两处使用。AI Chat 场景仍需下拉模式。
- SkillRuntime.getCapabilitiesForScenario("interview-persona") 返回匹配的 AvailableCapability 列表，每项含 skillId/skillName/capabilityId/capabilityName/capabilityDescription。
- 当前 Skill 模式区域（:380-401）用虚线紫色边框包裹 SkillSelector + 空选提示。

## Requirements

- Skill 人设模式下，用卡片列表替代下拉 SkillSelector
- 卡片内容：Skill 名称（capabilityName 或 skillName）+ Skill 描述（capabilityDescription）
- 卡片风格与内置人设卡片一致：`rounded-2xl border p-4`，选中=彩色背景（violet 系），未选中=白底，右上角"已选/添加"标签
- 不显示"默认助手"选项——已区分 tab，Skill 模式必须选具体 Skill
- AI Chat 等其他场景的 SkillSelector 不受影响
- Skill 模式下选中卡片后 isSkillValid=true，canCreate 逻辑不变

## Acceptance Criteria

- [ ] Skill 人设 tab 下显示卡片列表（grid 2 列），不显示下拉选择器
- [ ] 每张卡片显示 Skill 名称 + 描述
- [ ] 选中卡片后高亮（violet 色系），未选中白底
- [ ] 不显示"默认助手"选项
- [ ] 内置人设 tab 行为不变
- [ ] AI Chat 等其他场景 SkillSelector 不受影响
- [ ] canCreate 逻辑不变（选了 Skill 卡片 → isSkillValid=true）

## Definition of Done

- `tsc -b` + `cargo build` 通过

## Out of Scope

- AI Chat 场景 SkillSelector 改造
- Skill 卡片显示更多元信息（icon、author、version 等）
