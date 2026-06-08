# 更新日志

所有重要的项目变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.4.1] - 2026-06-09

### 新增

- **macOS Intel 构建支持** — 桌面端发布流程新增 Intel Mac (`x86_64-apple-darwin`) 构建，与 Apple Silicon 和 Windows 安装包一并生成

## [1.4.0] - 2026-06-09

### 新增

- **导出数据脱敏** — 简历导出弹窗新增数据脱敏开关，开启后对 PDF、智能一页 PDF、HTML、纯文本、Markdown 和 JSON 导出统一生效
  - 邮箱、手机号、姓名、公司名、学校名、私人链接等敏感信息替换为星号
  - 项目经历正文保留，便于他人评审简历内容质量
  - 公开代码仓库地址保留，支持 GitHub、Gitee、GitLab、Bitbucket 和 SourceForge 仓库链接
- **Anthropic 工具调用支持** — AI 助手在 Anthropic 原生协议下支持真正的 `tool_use` / `tool_result` 调用链，简历编辑请求会把可用工具随请求发送给模型
  - 支持解析 Anthropic 流式响应中的 `tool_use` 和 `input_json_delta`
  - 后端执行工具后回传 `tool_result`，再继续生成最终回复
  - 避免模型把 `<tool_call>` 等标签当作普通文本输出
- **简历局部文本替换工具** — 新增 `replaceResumeText` 编辑工具，AI 助手可按条替换简历片段，而不是覆盖整份简历或整段模块
  - 每条修改指定 `sectionId`、原文、替换文本和修改原因
  - 后端只替换目标模块 JSON 内容中的第一处精确匹配文本，降低误改其它内容的风险
  - 保留旧编辑执行逻辑兼容历史调用，但不再作为模型主要编辑工具暴露

### 优化

- **AI 建议逐条应用** — JD 匹配、语法检查和 AI 润色等专用入口改为生成可逐条应用的建议，用户可按建议卡片逐项确认修改
- **AI 流式渲染稳定性** — 优化流式文本增量读取逻辑，减少中间输出阶段出现重复片段或临时占位内容的问题

## [1.3.0] - 2026-06-06

### 新增

- **首页布局重构** — 仪表盘全新布局：header 增加"本地工作区"标签和最近编辑 pill，工具栏改为卡片容器，空状态增加快捷操作按钮，右侧增加快捷工具和工作区状态侧边栏
  - 侧边栏只在 xl（1280px+）展开为两栏布局，小屏时自然堆叠
  - 导入/新建、搜索框、视图切换按钮补齐 aria-label
- **面试记录删除与重新开始** — 面试大厅和面试房间支持删除面试记录（含对话和报告），一键重新开始（自动继承 JD 和角色配置）
- **Anthropic 面试流式对话** — 面试流式对话新增 Anthropic provider 支持（此前仅支持 OpenAI-compatible）
- **编辑器预览面板优化** — 缩放控件改为胶囊样式，默认缩放从 80% 调整为 90%，增加缩放边界常量；预览区背景加深、简历页增加边框阴影和 A4 最小高度
- **编辑器侧边栏视觉升级** — 选中区块改为深色高亮样式，拖拽手柄和图标透明度优化，重命名输入框增加 aria 标记

### 修复

- 修复面试轮次自动开始时 start 消息重复写入的问题（增加 turnKind=start 幂等检查）
- 修复面试房间 stream 失败后的 start 消息残留问题（新增幂等插入函数 insert_interview_start_message）

## [1.2.2] - 2026-06-03

### 新增

- **WebDAV 云端同步** — 支持将简历、设置和 API 密钥加密备份到 WebDAV 服务器（如 123云盘、坚果云、Nextcloud 等），一键恢复
  - 设置抽屉新增"同步"标签页，配置 WebDAV 服务器地址、用户名、密码和远端目录
  - 测试连接：PROPFIND 优先探测目录可达性，PUT 写入验证，兼容非标 WebDAV 服务（MKCOL 降级、PUT 405 容错）
  - 上传快照：将本地数据库、设置和加密后的密钥打包上传，使用 Argon2id + XChaCha20Poly1305 加密
  - 恢复快照：从远端下载并恢复数据，自动创建本地备份后重启应用确保数据生效
  - 加密密钥复用 WebDAV 密码，无需额外备份密码，减少操作步骤
- **远端目录输入** — WebDAV 同步支持自定义远端挂载目录，默认值 `JobPilot`

### 修复

- 修复 Tauri v2 命令权限未注册导致 WebDAV 命令无法调用的问题
- 修复 WebDAV remotePath 前端 state 未绑定用户输入的问题
- 修复恢复快照后 SQLite 连接缓存导致数据不生效的问题（恢复后自动重启应用）
- 修复 123云盘等不支持 MKCOL 的 WebDAV 服务器创建子目录失败的问题

## [1.2.1] - 2026-06-01

### 新增

- 统一模板渲染 Markdown 基础语法保障：为 29 个 unified 模板新增自动化回归覆盖，统一校验预览与导出对 `**加粗**`、`` `行内代码` `` 和无序列表的渲染一致性

### 文档

- 模板质量矩阵规划更新：补齐 unified 模板抽检进度、legacy 模板处置门槛与招聘平台导入抽检台账，便于后续持续推进

## [1.1.9] - 2026-05-28

### 修复

- macOS 更新重启 — 更新安装完成后通过 Tauri process 插件重新启动应用，并保留原生命令兜底
- 桌面 PDF 导出 — 修复 Apple Silicon 上 Chrome/Edge headless 已生成 PDF 但进程不退出导致导出中卡住的问题
- 现代极简模板导出 — 修复 Modern Minimal 模板预览与导出的样式一致性、图标、列表和分页表现
- 技能列表导出 — 统一 Consultant、Classic、Professional 模板技能列表按独立条目渲染

## [1.1.8] - 2026-05-27

### 新增

- 技能分类拖拽排序 — 简历编辑器支持拖拽调整技能分类顺序，Web 与桌面端保持一致
- Professional 模板统一渲染 — 迁移到统一模板渲染系统，技能列表渲染为独立条目

### 变更

- 移除 DOCX 导出功能
- 项目文档整合到 AGENTS.md

## [1.1.7] - 2026-05-26

### 新增

- 项目经历排序 — 简历编辑器支持在“项目经历”模块内拖拽调整多个项目的先后顺序，Web 与桌面端保持一致

### 修复

- 桌面 PDF 导出 — 修复 Windows/Chrome 下临时 HTML 过早清理可能导致导出的 PDF 变成 `ERR_FILE_NOT_FOUND` 错误页的问题

## [1.1.6] - 2026-05-22

### 新增

- AI 深度思考 — 支持 Extended Thinking / Reasoning 功能，兼容 Anthropic 原生 API 和 OpenAI 兼容格式（DeepSeek 等），聊天面板顶部 Brain 图标切换开关
- AI 设置手动保存 — 设置面板新增保存/取消按钮，固定在底部，保存后同步更新聊天面板模型列表

## [1.1.5] - 2025-05-21

### 新增

- 工作经历标签 — 为所有模板的工作经历模块添加标签区分，描述前显示"职责/Responsibilities:"，成就列表前显示"主要成就/Key Achievements:"

### 修复

- 字体主题 — 修复个人简介模块字体不跟随主题设置的问题
- macOS 更新重启 — 修复 macOS 版本更新安装后不自动重启的问题
- 学术模板 — 移除个人简介模块的首行缩进

## [1.1.4] - 2025-05-20

### 新增

- 关于对话框 — 导航栏新增"关于"按钮，显示应用版本号，支持手动检查更新

### 修复

- macOS 更新检测 — 修复 CI 发布流程中 PowerShell 路径解析 bug，导致 macOS 平台更新清单丢失
- MSI 打包版本号 — 使用纯数字版本格式，兼容 Windows MSI 安装包

## [1.1.3] - 2025-05-19

### 新增

- Modern Minimal 模板 — 现代极简风格简历模板，蓝色主题，时间线工作经历，卡片式项目展示

### 变更

- ContactInfo 组件 SVG 图标 — 将 emoji 图标替换为 Lucide SVG 图标，支持 CSS 颜色继承
- 模板 ContactInfo 统一 — 迁移 30+ 模板使用共享 ContactInfo 组件，统一个人信息展示
- 现代极简模板优化 — 重构时间线布局使用绝对定位，技能改为列表展示，项目卡片单列布局并支持亮点渲染

### 修复

- macOS Keychain 访问 — 未签名应用访问 Keychain 失败时 fallback 到文件存储，确保 API Key 能正常保存

## [1.1.2] - 2025-05-17

### 新增

- macOS 构建支持 — 支持 Apple Silicon (aarch64) 构建

### 变更

- 项目重命名 — 从 RoleRover 重命名为 JobPilot，更新应用名称、图标、包名

### 修复

- Keyring 密钥管理 — 修复 macOS/Windows Keyring 读写逻辑，简化验证流程
- 桌面端密钥保留 — Keyring 读取失败时保留本地密钥，不意外清空
- Tauri 包版本同步 — 修复 NPM 包与 Rust crate 版本不匹配问题
- macOS 更新器 — 支持 .app.tar.gz 格式的更新包
- CI 构建流程 — 修复资源重复上传、隐藏文件处理、artifact 路径解析等问题

## [1.1.1] - 2025-05-15

### 新增

- Tauri 桌面端 — 基于 Tauri 2 构建原生桌面应用
- 多格式导入 — 支持 JSON、Markdown、PDF、图片多种格式导入
- PDF 导入增强 — 支持普通 PDF 和扫描件，使用多模态模型智能解析
- Markdown 编辑器 — 支持工具栏快捷操作（加粗、斜体、代码、列表、链接）
- 文本域列表组件 — 支持多行文本输入，适合编辑经历描述
- 应用内更新 — 自动检测并安装新版本
- 模型列表获取 — 支持手动刷新获取可用模型列表

### 变更

- 亮点字段优化 — 改用文本域组件，便于输入长文本亮点描述
- 窗口启动优化 — 应用启动时以最小尺寸居中显示
- 设置保存优化 — AI 配置即使测试失败也会保存用户填入的信息
- API Key 管理 — 支持显示/隐藏切换，默认以密文展示
- 模型获取优化 — 测试连接前自动保存配置

### 修复

- Exa 配置保存 — 修复 Exa Base URL 无法保存的问题
- Tauri 权限配置 — 补全 interview 面试功能和 read_secret_value 命令的权限
- 面试功能修复 — 修复面试创建失败的问题（Tauri 命令权限缺失）
- 导入功能重构 — 统一文件导入组件，支持 JSON 直接解析和 Markdown AI 解析
- 导入进度显示 — 显示详细的五阶段进度（验证、提取、渲染、解析、保存）
- PDF 导出错误 — 改进 PDF 导出错误显示和浏览器发现逻辑
- Headless Chrome — 增强 Windows 10 精简版系统的 Chrome 兼容性

## [1.0.0] - 2025-05-01

### 新增

- 初始发布 — 基于 JadeAI/RoleRover 二次开发
- 拖拽式简历编辑器 — 支持行内编辑、自动保存、模块拖拽排序
- 50+ 简历模板 — 涵盖经典、现代、极简、ATS 友好等多种风格
- AI 智能助手 — 简历生成、内容优化、JD 匹配分析、求职信撰写
- 简历解析 — 支持从 PDF 和图片中解析简历内容
- 多格式导出 — 支持 PDF、PNG、Word 等格式导出
- 简历分享 — 生成分享链接，方便投递和展示
- LinkedIn 职业照 — AI 生成专业证件照
- 中英双语 — 完整的国际化支持
- 本地优先 — 数据存储在本地，隐私安全有保障

[Unreleased]: https://github.com/jlifeng/JobPilot/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/jlifeng/JobPilot/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/jlifeng/JobPilot/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/jlifeng/JobPilot/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/jlifeng/JobPilot/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/jlifeng/JobPilot/compare/v1.1.9...v1.2.1
[1.1.8]: https://github.com/jlifeng/JobPilot/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/jlifeng/JobPilot/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/jlifeng/JobPilot/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/jlifeng/JobPilot/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/jlifeng/JobPilot/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/jlifeng/JobPilot/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/jlifeng/JobPilot/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/jlifeng/JobPilot/compare/v1.0.0...v1.1.1
[1.0.0]: https://github.com/jlifeng/JobPilot/releases/tag/v1.0.0
