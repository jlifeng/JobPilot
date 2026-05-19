# 将 ContactInfo emoji icon 替换为 SVG

## Goal

将 `buildContactEntries` 中的 emoji icon 替换为 SVG，使 PDF 导出的 icon 颜色可通过 CSS 控制，与 React 预览的 Lucide icon 视觉一致。

## What I already know

- 当前 `htmlIcon` 使用 emoji（☎、📍、💼 等），无法通过 CSS 控制颜色
- PDF 导出的 icon 显示为 emoji 原生颜色，与模板主题色不一致
- SVG 使用 `fill="currentColor"` 可继承父元素 `color` 样式
- 需要为 16 个字段定义 SVG path：phone, location, linkedin, github, age, gender, yearsOfExperience, educationLevel, hometown, maritalStatus, politicalStatus, ethnicity, email, wechat, website, customLinks

## Requirements

- 每个字段的 `htmlIcon` 从 emoji 改为 SVG 字符串
- SVG 使用 `viewBox="0 0 16 16"`，`width="12"` `height="12"`，`fill="currentColor"`
- SVG path 从 Lucide Icons 提取，保持视觉一致性
- Legacy Export 渲染时通过 `style="color:${iconColor}"` 控制 SVG 颜色

## Acceptance Criteria

- [x] `buildContactEntries` 返回的所有 `htmlIcon` 为 SVG 字符串
- [x] PDF 导出的 icon 颜色与模板主题色一致
- [x] React 预览不受影响（仍使用 Lucide React 组件）
- [x] `pnpm type-check` 通过

## Definition of Done

- 类型检查通过
- 手动验证 PDF 导出 icon 颜色正确

## Out of Scope

- React 预览的 Lucide icon（已工作正常）
- 新增字段或修改布局

## Technical Notes

- 修改文件：`src/lib/template-renderer/contact-info.tsx`
- SVG path 来源：Lucide Icons 源码（`lucide-react` 包）
- Legacy Export 渲染代码无需修改（已使用 `style="color:${iconColor}"`）
- SVG 使用 `stroke="currentColor"` 而非 `fill="currentColor"`（与 Lucide 风格一致，outline stroke 图标）
- viewBox 为 `0 0 24 24`（Lucide 标准），渲染尺寸 `width="12" height="12"`
