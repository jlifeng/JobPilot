# 简历高质量模板矩阵规划

## 背景

当前项目已有较多简历模板，数量足够形成模板库，但整体更接近“视觉皮肤集合”：很多模板主要差异在颜色、边框、背景和布局装饰上，尚未完全围绕求职场景、行业气质和信息优先级形成清晰分层。

后续模板建设不应继续单纯堆数量，而应把核心模板打磨成一组高质量矩阵：

- 每个模板有明确适用人群；
- 每个模板有稳定的信息层级；
- 预览和 PDF 导出保持一致；
- 招聘平台解析友好；
- 中文简历常见字段有合理展示策略；
- 模板之间差异来自场景和信息组织，而不只是视觉皮肤。

## 目标

建立一套“少而精”的主模板矩阵，优先打磨 8-12 个核心模板，覆盖大多数真实求职场景。

核心目标：

1. 降低用户选模板的认知成本。
2. 让模板名称和适用场景更直观。
3. 统一预览和导出实现，减少样式漂移。
4. 为后续模板推荐、模板筛选、行业化模板扩展打基础。
5. 把现有模板从“样式集合”升级为“求职场景解决方案”。

## 矩阵分类

### 1. ATS/通用投递

适合场景：

- 网申系统；
- 外企/互联网标准投递；
- 需要招聘平台解析稳定；
- 用户不确定该选什么模板。

现有候选：

- `ats`
- `minimal`
- `classic`
- `clean`
- `formal`

设计重点：

- 少图标、少复杂背景；
- 结构清楚，字段稳定；
- 不依赖复杂 CSS；
- 标题、时间、公司、项目、技能容易被解析。

建议主模板：

- `ats`
- `minimal`

### 2. 技术工程

适合场景：

- 前端、后端、全栈、架构师；
- 算法、数据、AI 工程；
- DevOps、测试、嵌入式等工程岗位。

现有候选：

- `developer`
- `coder`
- `engineer`
- `modern-minimal`

设计重点：

- 项目经历权重高；
- 技术栈结构化展示；
- 项目亮点使用 bullet；
- 时间和项目名称布局稳定；
- 支持较长技术栈和多项目内容。

建议主模板：

- `modern-minimal`
- `developer` 或 `engineer`

### 3. 咨询/金融/商务

适合场景：

- 咨询顾问；
- 金融、财务、投研；
- 战略、商业分析；
- 大厂职能、运营管理。

现有候选：

- `consultant`
- `professional`
- `corporate`
- `finance`
- `swiss`

设计重点：

- 克制、正式、信息密度高；
- 成果指标清晰；
- 工作经历和教育背景要稳重；
- 避免过强视觉装饰。

建议主模板：

- `consultant`
- `professional`
- `finance`

### 4. 应届/学术/科研

适合场景：

- 应届生；
- 实习申请；
- 科研、学术、实验室；
- 教师、科研人员。

现有候选：

- `academic`
- `teacher`
- `scientist`
- `clean`

设计重点：

- 教育背景权重更高；
- 校园经历、竞赛、项目可承载；
- 论文、科研、证书类内容展示友好；
- 不要过度商务化。

建议主模板：

- `academic`
- `scientist`

### 5. 医疗/法律/专业资格

适合场景：

- 医生、护士、药师；
- 律师、法务；
- 需要突出执业资格、证书、机构经历的岗位。

现有候选：

- `medical`
- `legal`
- `formal`

设计重点：

- 专业可信；
- 证书和资质展示明显；
- 颜色和装饰克制；
- 信息完整但不拥挤。

建议主模板：

- `medical`
- `legal`

### 6. 管理/高管

适合场景：

- 经理、总监、负责人；
- 创业者；
- 高级职能管理岗。

现有候选：

- `executive`
- `luxe`
- `corporate`

设计重点：

- 强调业务影响力；
- 支持团队规模、营收、增长等结果指标；
- 个人简介可以更突出；
- 视觉要高级但不能花。

建议主模板：

- `executive`
- `corporate`

### 7. 设计/创意

适合场景：

- UI/UX、视觉设计；
- 品牌、内容、创意策划；
- 作品集导向岗位。

现有候选：

- `designer`
- `creative`
- `artistic`
- `magazine`
- `watercolor`

设计重点：

- 作品链接和个人网站更突出；
- 视觉记忆点更强；
- 保持内容可读，不牺牲 PDF 稳定性；
- 适度表达个性。

建议主模板：

- `designer`
- `creative`

### 8. 高信息密度/长经历

适合场景：

- 工作年限长；
- 项目多；
- 经历内容很长；
- 用户希望一页内容承载更多信息。

现有候选：

- `compact`
- `two-column`
- `sidebar`
- `blocks`

设计重点：

- 信息密度高但层次清楚；
- 时间、公司、岗位、项目标题能快速扫描；
- 技能、证书、语言等适合放侧栏；
- 长文本换行稳定。

建议主模板：

- `compact`
- `two-column`

## 第一批推荐打磨模板

优先打磨以下 10 个模板作为主矩阵：

| 优先级 | 模板 ID | 矩阵定位 | 处理建议 |
|---|---|---|---|
| P0 | `minimal` | ATS/通用极简 | 迁移统一渲染，保持解析友好 |
| P0 | `modern-minimal` | 技术/产品通用 | 已在统一渲染，继续打磨项目和技能展示 |
| P0 | `professional` | 商务正式 | 已在统一渲染，继续统一字段和列表样式 |
| P0 | `consultant` | 咨询/金融 | 已在统一渲染，强化成果指标和经历密度 |
| P1 | `ats` | 招聘系统解析 | 迁移统一渲染，降低装饰 |
| P1 | `developer` | 技术工程 | 迁移统一渲染，突出技术栈和项目 |
| P1 | `academic` | 学术/应届 | 迁移统一渲染，突出教育和科研 |
| P1 | `executive` | 管理高管 | 迁移统一渲染，突出影响力 |
| P2 | `designer` | 设计创意 | 迁移统一渲染，控制视觉复杂度 |
| P2 | `compact` | 高信息密度 | 迁移统一渲染，优化长内容 |

## 当前实施进展

更新日期：2026-05-30。

### 已完成

1. 模板矩阵分组已落地到模板选择页。
   - 新增统一矩阵配置：`src/lib/template-matrix.ts`
   - Web 模板页已使用矩阵分组：`src/app/[locale]/templates/page.tsx`
   - Desktop 模板页已使用矩阵分组：`desktop/src/routes/templates.tsx`
   - 中英文文案已补充：`messages/zh.json`、`messages/en.json`

2. 第一批主矩阵模板已完成统一渲染迁移。

| 模板 ID | 矩阵定位 | 当前状态 |
|---|---|---|
| `minimal` | ATS/通用极简 | 已迁移统一渲染 |
| `modern-minimal` | 技术/产品通用 | 已在统一渲染，已修复项目/教育亮点 bullet 和项目时间右对齐 |
| `professional` | 商务正式 | 已在统一渲染，已修复技能分类导出与预览不一致 |
| `consultant` | 咨询/金融 | 已在统一渲染 |
| `ats` | 招聘系统解析 | 已迁移统一渲染 |
| `developer` | 技术工程 | 已迁移统一渲染 |
| `engineer` | 技术工程变体 | 已迁移统一渲染，和 `developer` 形成差异化 |
| `academic` | 学术/应届 | 已迁移统一渲染 |
| `executive` | 管理高管 | 已迁移统一渲染 |
| `designer` | 设计创意 | 已迁移统一渲染 |
| `creative` | 设计创意变体 | 已迁移统一渲染，保留创意视觉但控制 PDF 稳定性 |
| `compact` | 高信息密度 | 已迁移统一渲染 |

3. 第二层矩阵候选已迁移一批，作为后续扩展和对照模板。

| 模板 ID | 矩阵定位 | 当前状态 |
|---|---|---|
| `classic` | 通用基础 | 已在统一渲染 |
| `modern` | 通用现代 | 已在统一渲染 |
| `formal` | 通用/专业资格 | 已迁移统一渲染 |
| `euro` | 国际化/商务 | 已迁移统一渲染 |
| `nordic` | 国际化/克制现代 | 已迁移统一渲染 |
| `timeline` | 经历叙事 | 已迁移统一渲染 |
| `elegant` | 商务优雅 | 已迁移统一渲染 |
| `finance` | 咨询/金融/商务 | 已迁移统一渲染 |
| `medical` | 医疗/专业资格 | 已迁移统一渲染 |
| `legal` | 法律/专业资格 | 已迁移统一渲染 |
| `scientist` | 科研/学术 | 已迁移统一渲染 |
| `teacher` | 教师/教育/应届 | 已迁移统一渲染 |
| `clean` | ATS/通用投递 | 已迁移统一渲染 |
| `corporate` | 商务/管理 | 已迁移统一渲染 |
| `two-column` | 高信息密度/双栏 | 已迁移统一渲染，验证侧栏 section 先于主内容 |
| `sidebar` | 长经历/侧栏组织 | 已迁移统一渲染，验证侧栏技能标签和主栏内容顺序 |
| `swiss` | 商务/国际化 | 已迁移统一渲染，保留瑞士风格网格与红色强调 |

4. 基础回归测试已覆盖统一模板关键差异。
   - `src/lib/template-renderer/__tests__/template-renderer.test.ts`
   - 覆盖预览/导出 section 顺序与基础内容 parity
   - 覆盖技能模块的不同展示策略：列表、逗号行内、分号行内、管道分隔、标签 pill
   - 覆盖 `modern-minimal` 项目/教育亮点 bullet、项目时间右对齐、无头像左对齐和个人信息顺序
   - 覆盖 `two-column`、`sidebar` 的侧栏/主栏 section 顺序
   - 覆盖 `swiss` 红色 bullet 行和严格网格结构
   - 覆盖 `modern-minimal`、`developer`、`clean` 的长项目名称、长技术栈和多亮点抽检

5. 已执行过的验证命令。
   - `pnpm exec tsx "src/lib/template-renderer/__tests__/template-renderer.test.ts"`
   - `pnpm exec eslint ...` 针对统一模板相关文件
   - `pnpm type-check`
   - `pnpm build:desktop-shell`
   - `git diff --check`
   - `pnpm lint`

说明：`pnpm lint` 当前脚本退出码为 0；Desktop 阻塞面无 error，纯 Web reference 区域仍有既有 lint 旧债，脚本已标记为 observation-only。

6. 过渡期质量打磨已推进到 legacy 模板列表结构一致性。
   - 已对 `startup`、`card`、`zigzag`、`ribbon`、`mosaic` 修复工作经历中“职责 / Responsibilities”和“主要成就 / Key Achievements”的列表结构对齐问题。
   - 已对 `magazine`、`artistic`、`retro`、`japanese`、`berlin` 复用各自模板原生 bullet 风格，统一工作经历中职责、主要成就和个人简介的无序列表符号。
   - 已补齐 `medical` 的统一渲染和 legacy 渲染中“主要成就”标题、工作经历列表结构，以及个人简介列表符号一致性。
   - 这部分修复属于迁移完成前的过渡性维护，目标是在未完成 unified migration 之前，先把用户可见的预览 / 导出漂移压到可接受范围。

### 当前代码状态

当前已进入统一渲染的模板目录包含 29 个模板：

```text
academic
ats
classic
clean
compact
consultant
corporate
creative
designer
developer
elegant
engineer
euro
executive
finance
formal
legal
medical
minimal
modern
modern-minimal
nordic
professional
scientist
sidebar
swiss
teacher
timeline
two-column
```

补充说明：

- 这 29 个 unified template 中，`modern-minimal` 是原生统一渲染模板，不属于 legacy 50 个同名模板配对；
- 其余 28 个 unified template 对应 legacy 50 个模板中的同名迁移结果；
- 因此当前状态可以理解为：`29 个统一模板可用`，其中 `28 个已完成 legacy 同名迁移`，`22 个 legacy 模板仍未迁移`。

当前仍未迁移到统一渲染、继续依赖 legacy preview/export 双轨实现的模板如下：

```text
architect
artistic
berlin
blocks
bold
card
coder
gradient
infographic
japanese
luxe
magazine
material
metro
mosaic
neon
retro
ribbon
rose
startup
watercolor
zigzag
```

当前维护策略应明确分成两条线：

1. 已迁移的 29 个模板：
   - 只改 `src/lib/template-renderer/templates/<template-id>.tsx`
   - 预览和导出统一从 unified template 出发
   - 旧 preview/export 文件仅作为 fallback 和历史对照，不再作为主维护入口

2. 未迁移的 22 个模板：
   - 仍需同时关注 `src/components/preview/templates/*.tsx` 和 `src/app/api/resume/[id]/export/templates/*.ts`
   - 凡是 bullet、字段顺序、时间布局、技能展示类问题，必须同时修 preview 和 export，避免再次漂移
   - 如果某模板开始频繁进入质量修复队列，应优先考虑将其迁移到 unified renderer，而不是长期在 legacy 双轨上打补丁

### 主矩阵模板抽检进展

截至 2026-05-30，已完成两轮 unified 模板人工视觉快速抽检，共覆盖 13 / 29 个模板：

1. 第一轮抽检已覆盖：
   - `ats`
   - `minimal`
   - `modern-minimal`
   - `professional`
   - `developer`

2. 第二轮抽检已覆盖：
   - `academic`
   - `executive`
   - `clean`
   - `finance`
   - `corporate`
   - `two-column`
   - `sidebar`
   - `swiss`

当前抽检结论：

- 上述 13 个模板的 preview / export 主结构肉眼一致，未见明显块级错位；
- `modern-minimal` 的项目时间右对齐、项目亮点 bullet、技能层级显示正常；
- `two-column`、`sidebar` 的侧栏 / 主栏结构在预览和导出中保持一致；
- `executive`、`finance`、`corporate`、`swiss` 的头部强调色和分区层级在导出中基本保持住模板气质；
- `ats`、`minimal`、`academic`、`clean` 这类偏投递 / 学术模板的信息密度与行高比较稳定，没有明显拥挤或松散失衡；
- 本轮结论仍属于“快速视觉取样”，尚未替代招聘平台导入抽检、多页内容抽检和极端长文本抽检。

### 剩余 22 个 legacy 模板处置建议（第一版）

这部分属于规划性建议，主要依据当前矩阵覆盖情况、近几轮质量修复频率和模板差异度，不等同于最终下线决定。

1. 建议继续迁移到 unified renderer 的模板：
   - `blocks`
   - `coder`
   - `startup`
   - `architect`
   - `card`
   - `magazine`
   - `artistic`
   - `retro`
   - `japanese`
   - `berlin`

2. 建议保留为低优先级风格模板，后续按需迁移：
   - `infographic`
   - `material`
   - `metro`
   - `mosaic`
   - `ribbon`
   - `zigzag`
   - `watercolor`
   - `neon`
   - `rose`
   - `luxe`

3. 建议作为“合并 / 下线候选”继续观察的模板：
   - `bold`
   - `gradient`

补充判断依据：

- `blocks`、`coder` 能补高信息密度 / 技术工程方向的历史风格空位；
- `startup`、`architect`、`card` 仍有相对明确的场景辨识度，不只是换色皮肤；
- `magazine`、`artistic`、`retro`、`japanese`、`berlin` 已经积累过列表样式修复，继续长期维持 legacy 双轨的成本偏高，更适合迁移收口；
- `bold`、`gradient` 当前与现有主矩阵的差异更多停留在装饰层，和高质量矩阵目标的重合度偏低，适合先观察是否真的需要保留。

## 统一设计原则

### 个人信息区

推荐默认信息层级：

1. 姓名；
2. 求职意向、工作经验、所在地、手机号、邮箱；
3. 微信号、个人网站、性别、年龄、籍贯、政治面貌；
4. 民族、婚姻状况默认不展示，除非模板定位偏体制内或用户明确需要。

说明：

- 求职意向从姓名下方移入个人信息行，避免重复；
- 联系方式优先于身份信息；
- 身份信息只作为补充层；
- 无头像时不强制居中，应按模板气质决定。

### 项目经历

技术类和产品类模板应优先保证：

- 项目名称和时间同一行；
- 时间右对齐；
- 技术栈支持换行和拖拽排序；
- 项目亮点使用 bullet；
- 预览和导出列表样式一致。

### 技能模块

推荐规则：

- 技能分类可拖拽；
- 分类下技能按单项展示，不应在导出时被拼成一行；
- 技术型模板可以用标签；
- ATS 型模板应尽量用纯文本或简洁列表。

### 头像策略

推荐规则：

- 通用/ATS 模板默认弱化头像；
- 商务/管理模板可以保留头像但布局稳定；
- 无头像时不要留下视觉空洞；
- 头像不应影响 PDF 解析和文本主线。

## 实施阶段

### 阶段一：矩阵梳理

目标：

- 为现有模板打标签；
- 区分主模板、变体模板、低优先级模板；
- 在模板选择页展示更明确的场景分类。

产出：

- 模板矩阵表；
- 模板适用人群说明；
- 第一批主模板清单。

### 阶段二：统一渲染迁移

目标：

- 将第一批主模板迁移到 `src/lib/template-renderer/templates/`；
- 预览和导出共用同一个 `UnifiedTemplate`；
- 消除双轨实现导致的样式漂移。

参考文档：

- `docs/template-unified-renderer-migration-guide.md`

建议顺序：

1. `minimal`：已完成。
2. `ats`：已完成。
3. `developer`：已完成。
4. `academic`：已完成。
5. `executive`：已完成。
6. `designer`：已完成。
7. `compact`：已完成。
8. `finance`、`medical`、`teacher`：已完成，作为行业/专业模板补充。
9. `clean`、`corporate`：已完成，作为通用和商务变体补充。

本轮迁移完成状态：

1. `two-column`：已完成，补齐高信息密度矩阵，和 `compact` 形成双模板选择。
2. `sidebar`：已完成，用于长经历和侧栏信息组织的对照验证。
3. `engineer`：已完成，补齐技术工程变体，重点检查项目经历、技术栈和亮点。
4. `creative`：已完成，补齐设计/创意矩阵，控制视觉复杂度和 PDF 稳定性。
5. `swiss`：已完成，补齐商务/国际化变体，和 `consultant`、`finance` 做风格区分。

当前运行机制结论：

- 旧预览模板仍保留在 `src/components/preview/templates/`，目前目录下仍有 50 个旧预览实现；
- 旧导出模板仍保留在 `src/app/api/resume/[id]/export/templates/`，目前目录下仍有 50 个旧导出实现；
- 运行时已经优先使用统一渲染：预览在 `src/components/preview/resume-preview.tsx` 先通过 `getUnifiedTemplate(resume.template)` 查找统一模板，命中后渲染 `unifiedTemplate.PreviewComponent`；
- 导出在 `src/app/api/resume/[id]/export/builders.ts` 先通过 `getUnifiedTemplate(resume.template)` 查找统一模板，命中后调用 `unifiedTemplate.buildHtml(toCanonicalResume(resume))`；
- 未迁移的模板继续 fallback 到旧预览和旧导出实现，因此旧代码目前仍承担兼容兜底和迁移对照作用；
- 对已迁移的 29 个模板，后续修改主体样式、字段顺序、项目经历、技能展示时，应优先修改 `src/lib/template-renderer/templates/<template-id>.tsx`，不再分别修改旧预览和旧导出两套文件。

后续旧代码清理策略：

- 不建议一次性删除全部旧模板，因为仍有未迁移模板依赖 fallback；
- 可在完成人工视觉抽检和导出抽检后，分批删除已迁移 29 个模板对应的旧预览/旧导出实现；
- 删除旧实现时必须同步清理 `src/components/preview/resume-preview.tsx` 和 `src/app/api/resume/[id]/export/builders.ts` 中对应的 legacy import、映射和分支；
- 每批清理后至少执行模板测试、`pnpm type-check`、`pnpm build:desktop-shell` 和 `git diff --check`；
- 清理完成前，文档和开发约定应明确：统一模板是已迁移模板的唯一维护入口，旧文件只作为 fallback 和历史对照。

每迁移一个模板，都应同步完成：

- 在 `src/lib/template-renderer/templates/` 新增统一模板；
- 在 `src/lib/template-renderer/index.ts` 注册；
- 在 `src/lib/template-renderer/__tests__/template-renderer.test.ts` 增加 parity 测试；
- 根据技能展示方式补充专项断言；
- 执行模板测试、targeted ESLint、`pnpm type-check`、`pnpm build:desktop-shell`、`git diff --check`。

### 阶段三：模板质量打磨

目标：

- 统一个人信息排序；
- 统一项目经历时间、技术栈、亮点样式；
- 统一技能模块分类展示；
- 修复 PDF 导出与预览不一致问题。

重点检查：

- 预览和导出字段顺序一致；
- bullet、标签、分隔线一致；
- 长文本不溢出；
- 多页 PDF 不破坏布局；
- 招聘平台导入后颜色和文本可解析。

下一步质量打磨建议：

1. 收敛个人信息展示策略。
   - 已迁移模板分为两类：使用 `ContactInfo` 公共组件的模板优先保持公共排序；强视觉/侧栏模板保留定制 label/value 或网格布局，但必须保证预览和导出一致。
   - 保留模板气质差异：ATS/学术可更克制，商务/管理可保留头像和图标，侧栏模板可保留纵向 label/value。
   - 民族、婚姻状况默认仍作为低优先级补充字段，不作为核心信息。

2. 收敛项目经历展示策略。
   - 技术类模板优先保证项目名称与时间同一行，时间右对齐。
   - 技术栈优先使用可换行标签或清晰行内文本，不要让长技术栈挤压标题。
   - 亮点统一使用 bullet，并确保预览和导出一致。

3. 收敛技能模块展示策略。
   - 技术/创意模板可使用 pill 标签。
   - 商务/金融模板可使用分类名 + 逗号行内文本。
   - ATS/通用模板优先使用列表或简单文本，减少复杂装饰。
   - 任一模板的预览与导出必须保持同一种技能展示策略。

4. 对已迁移模板做视觉抽检。
   - 已补自动抽检：`modern-minimal`、`developer`、`clean` 的长项目名、长技术栈、多亮点。
   - 已完成人工快速抽检：`ats`、`minimal`、`modern-minimal`、`professional`、`developer`、`academic`、`executive`、`clean`、`finance`、`corporate`、`two-column`、`sidebar`、`swiss`。
   - 后续人工视觉抽检优先：`medical`、`teacher`、`consultant`、`designer`、`creative`、`compact`、`classic`、`modern`、`formal`、`euro`、`nordic`、`timeline`、`elegant`、`engineer`、`legal`、`scientist`。
   - 检查长姓名、长邮箱、长项目名、长技术栈、多项目、多教育经历、多技能分类。
   - 检查无头像、有头像两种状态。

近期质量打磨补充结论：

1. 列表类内容已经成为当前模板一致性的最高频问题。
   - 典型区域包括：个人简介、工作经历职责、主要成就、项目亮点、教育亮点、荣誉奖项。
   - 对未迁移模板，不能再依赖 `md(...)` 的默认 `<ul>` 输出作为最终样式；只要模板本身有自定义 bullet 风格，就应该提取到本地 helper，在 preview/export 两侧复用。

2. “先迁移再优化”与“先做用户可见修复”需要并行。
   - 对主矩阵模板，优先统一渲染迁移；
   - 对暂不迁移但用户频繁使用的 legacy 模板，可以先做结构一致性补丁，降低日常回归成本；
   - 这类补丁应被视为临时质量收口，不应替代 unified migration。

3. 当前阶段最值得优先抽检的 legacy 模板是已经做过过渡修复的一组。
   - `startup`、`card`、`zigzag`、`ribbon`、`mosaic`
   - `magazine`、`artistic`、`retro`、`japanese`、`berlin`
   - 它们已经积累过列表修复，后续如果决定继续保留，应优先纳入 unified migration 候选池。

### 阶段四：产品化模板选择

目标：

- 模板库不只展示模板名称，而是展示适用场景；
- 支持按“行业/岗位/风格/信息密度”筛选；
- 默认推荐 3-5 个高质量模板，而不是让用户在大量模板中盲选。

可选分类：

- 通用投递；
- 技术工程；
- 商务金融；
- 应届学术；
- 管理高管；
- 设计创意；
- 高信息密度。

后续产品化建议：

1. 模板选择页继续保留矩阵分组，但每组只推荐 2-4 个主模板，其他模板作为“更多风格”。
2. 为模板增加更明确的适用描述，例如“适合网申解析”“适合技术项目多”“适合管理岗成果展示”。
3. 增加默认推荐顺序：`ats`、`minimal`、`modern-minimal`、`professional`、`developer`。
4. 不急于新增模板数量，优先把已迁移模板做稳定。

## 阶段性完成定义

需要明确区分两个目标：

### 目标 A：高质量模板矩阵完成

满足以下条件即可视为“矩阵规划阶段基本完成”：

- 模板选择页已经按矩阵分组展示；
- 主矩阵模板已经具备稳定推荐集；
- 统一渲染模板数量足以覆盖主流程；
- 预览 / 导出一致性的主要问题集中在少数 legacy 模板，而不是主矩阵模板；
- 已迁移模板具备测试和基本视觉抽检。

按当前状态看，目标 A 已经进入“可收口但仍需抽检”的阶段。

### 目标 B：历史模板库全量统一渲染

满足以下条件才算完成：

- legacy 50 个模板全部迁移到 unified renderer；
- 旧 preview / export 双轨实现全部删除；
- fallback 逻辑只保留极少数历史兼容分支；
- 所有模板的维护入口都统一到 `src/lib/template-renderer/templates/`。

按当前状态看，目标 B 仍有 22 个 legacy 模板未完成，不应与目标 A 混为一谈。

## 验收标准

一个模板进入“高质量矩阵”前，至少满足：

- 预览和导出结构一致；
- PDF 导出后主要样式一致；
- 个人信息排序合理且不重复；
- 项目经历、教育背景、技能模块有清晰层级；
- 长内容不会明显溢出；
- 中文字段展示自然；
- 模板定位明确；
- 有基础渲染测试覆盖。

## 暂不处理事项

以下事项后续再做，不纳入本轮规划落地：

- 新增全新模板；
- 大规模重命名模板 ID；
- 重做模板库页面；
- 批量迁移全部 50 个模板；
- 为每个行业定制独立数据结构。

## 下一阶段待办

优先级建议如下：

| 优先级 | 任务 | 说明 |
|---|---|---|
| P0 | 完成剩余 16 个 unified 模板的人工视觉抽检 | 当前已完成 13 / 29，优先补 `medical`、`teacher`、`consultant`、`designer`、`creative`、`compact` |
| P0 | 做招聘平台导入抽检 | 优先检查颜色、列表、时间、字段顺序、长文本解析 |
| P0 | 锁定剩余 22 个 legacy 模板处置策略 | 当前已形成第一版分层建议，下一步需结合模板使用频率和产品取舍定稿 |
| P1 | 从剩余 22 个模板里挑下一批 unified migration 候选 | 第一优先级建议：`blocks`、`coder`、`startup`、`architect`、`card`、`magazine`、`artistic`、`retro`、`japanese`、`berlin` |
| P1 | 把高频 legacy 列表修复经验沉淀到迁移 checklist | 重点是 summary / responsibilities / highlights / honors 四类 bullet 区域 |
| P2 | 分批删除已迁移 29 个模板对应的旧 preview/export 实现 | 前提是人工抽检通过，并完成 legacy import / mapping 清理 |

下一轮不建议再无差别追求模板数量，优先顺序应为：

1. 把 29 个 unified 模板的视觉和导出稳定性做扎实；
2. 对剩余 22 个 legacy 模板做产品层面的取舍；
3. 只迁移那些真正值得保留、且已经被验证有持续维护价值的模板。

## 后续恢复工作入口

继续开发时优先阅读：

1. `docs/template-unified-renderer-migration-guide.md`
2. `src/lib/template-renderer/index.ts`
3. `src/lib/template-renderer/__tests__/template-renderer.test.ts`
4. 目标模板的旧预览实现：`src/components/preview/templates/<template-id>.tsx`
5. 目标模板的旧导出实现：`src/app/api/resume/[id]/export/templates/<template-id>.ts`

推荐恢复命令：

```bash
pnpm exec tsx "src/lib/template-renderer/__tests__/template-renderer.test.ts"
pnpm type-check
pnpm build:desktop-shell
git diff --check
```

## 建议结论

现有模板可以组成模板矩阵，但需要筛选和打磨。短期不建议继续增加模板数量，应优先把 8-12 个主模板做成真正稳定、可推荐、预览导出一致的精品模板。

第一阶段建议先围绕 `minimal`、`modern-minimal`、`professional`、`consultant`、`ats`、`developer`、`academic`、`executive`、`designer`、`compact` 建立主矩阵。
