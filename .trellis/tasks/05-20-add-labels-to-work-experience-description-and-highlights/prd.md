# 工作经历描述和亮点区分展示

## Goal

在工作经历模块中，为描述和亮点添加明确的标签，使内容结构更清晰。

## 现状

当前工作经历渲染：
```
高级工程师 at ABC公司
2020.01 - 至今

负责核心业务系统的架构设计...（描述，无标记）

技术栈: React, TypeScript, Node.js

- 带领团队完成微服务改造（亮点，列表项）
- 性能优化提升响应速度 50%
```

**问题**：描述直接显示没有标签，亮点是列表但没有标题，用户难以区分两部分内容。

## Requirements

### 改动方案

1. **描述**：添加前缀 "职责: " / "Responsibilities: "
2. **亮点**：添加标题 "主要成就:" / "Key Achievements:"

改动后效果：
```
高级工程师 at ABC公司
2020.01 - 至今

职责: 负责核心业务系统的架构设计...

技术栈: React, TypeScript

主要成就:
- 带领团队完成微服务改造
- 性能优化提升响应速度 50%
```

### 国际化

- 中文：职责 / 主要成就
- 英文：Responsibilities / Key Achievements

### 分批实施

分 3 批修改模板，每批完成后确认效果：

**第一批**：unified 模板（3 个）
- classic.tsx
- modern.tsx
- modern-minimal.tsx

**第二批**：legacy 模板（10 个常用模板）
- professional.tsx
- minimal.tsx
- elegant.tsx
- executive.tsx
- developer.tsx
- ats.tsx
- creative.tsx
- two-column.tsx
- modern.tsx (legacy)
- academic.tsx

**第三批**：其余 legacy 模板（37 个）

## Acceptance Criteria

- [ ] 描述前有 "职责/Responsibilities" 标签
- [ ] 亮点列表前有 "主要成就/Key Achievements" 标题
- [ ] 中英文正确切换
- [ ] 第一批 unified 模板修改完成并确认效果

## Out of Scope

- 其他 section（education、projects 等）的类似改动
- 编辑器 UI 改动
