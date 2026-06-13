# Getting Started with JobPilot / JobPilot 快速入门

[English](#english) | [中文](#中文)

---

## English

### Installation

#### 1. Download

Visit the [Releases page](https://github.com/jlifeng/JobPilot/releases) and download the installer for your platform:

- **Windows**: `JobPilot_x.x.x_x64_en-US.msi`
- **macOS (Apple Silicon)**: `JobPilot_aarch64.dmg` (for M1/M2/M3 Macs)
- **macOS (Intel)**: `JobPilot_x64.dmg`

#### 2. Install

**Windows:**
1. Double-click the `.msi` file
2. Follow the installation wizard
3. Launch from Start Menu

**macOS:**
1. Open the `.dmg` file
2. Drag JobPilot to Applications folder
3. Right-click and select "Open" (first time only, to bypass Gatekeeper)

### Initial Setup

#### Configure AI Provider

JobPilot requires an AI provider to use intelligent features:

1. Open **Settings** (gear icon in sidebar)
2. Navigate to **AI Assistant**
3. Choose your provider:
   - **OpenAI** (GPT-4, GPT-3.5-Turbo)
   - **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)
   - **Google** (Gemini 1.5 Pro, Gemini 1.5 Flash)
   - **OpenAI-Compatible** (for Chinese models like DeepSeek, Moonshot, Zhipu)
4. Enter your API key and API base URL (if using OpenAI-compatible)
5. Select a model

**Getting API Keys:**

**International Providers:**
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Anthropic: [console.anthropic.com](https://console.anthropic.com/)
- Google: [ai.google.dev](https://ai.google.dev/)

**Chinese Model Providers (国内大模型):**

JobPilot supports Chinese AI models through OpenAI-compatible API:

| Provider | API Base URL | Get API Key | Recommended Models |
|----------|--------------|-------------|-------------------|
| **DeepSeek (深度求索)** | `https://api.deepseek.com` | [platform.deepseek.com](https://platform.deepseek.com/) | `deepseek-chat` |
| **Moonshot (月之暗面)** | `https://api.moonshot.cn/v1` | [platform.moonshot.cn](https://platform.moonshot.cn/) | `moonshot-v1-8k`, `moonshot-v1-32k` |
| **Zhipu AI (智谱)** | `https://open.bigmodel.cn/api/paas/v4` | [open.bigmodel.cn](https://open.bigmodel.cn/) | `glm-4`, `glm-4-flash` |
| **Alibaba Qwen (通义千问)** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) | `qwen-plus`, `qwen-turbo` |
| **Baidu (文心一言)** | API via SDK only | [console.bce.baidu.com](https://console.bce.baidu.com/) | Use OpenAI-compatible proxy |
| **SiliconFlow (硅基流动)** | `https://api.siliconflow.cn/v1` | [siliconflow.cn](https://siliconflow.cn/) | `Qwen/Qwen2.5-7B-Instruct` (Free tier available) |

**How to use Chinese models:**
1. Select **"OpenAI-Compatible"** as provider
2. Enter the **API Base URL** from the table above
3. Enter your **API key** from the provider
4. Enter the **model name** (e.g., `deepseek-chat`, `moonshot-v1-8k`)
5. Click **"Test Connection"** to verify

**Cost Comparison (as of 2025):**
- DeepSeek: ~¥0.001/1K tokens (very affordable)
- Moonshot: ~¥0.012/1K tokens
- Zhipu GLM-4: ~¥0.05/1K tokens
- SiliconFlow: Free tier available for testing

**Note:** Chinese models work best with Chinese-language prompts. For English resumes, international providers (OpenAI, Anthropic) may provide better results.

### Creating Your First Resume

#### Option 1: AI Generation

1. Click **"+ New Resume"** in the sidebar
2. Select **"AI Generate Resume"**
3. Fill in your basic information:
   - Name, contact info
   - Work experience
   - Education
   - Skills
4. Click **"Generate"**
5. Review and edit the result

#### Option 2: Import Existing Resume

1. Click **"+ New Resume"**
2. Select **"Import"**
3. Choose format:
   - **PDF**: Upload your PDF resume (AI will parse it)
   - **Markdown**: Import from `.md` file
   - **JSON**: Import from JobPilot JSON export
4. Review and adjust

#### Option 3: Start from Template

1. Click **"+ New Resume"**
2. Select **"Choose Template"**
3. Browse 50+ templates
4. Click a template to preview
5. Click **"Use This Template"**

### Using AI Features

#### Polish a Section

1. Hover over any resume section (e.g., "Work Experience")
2. Click the **✨ sparkle icon**
3. The AI chat opens with auto-filled prompt
4. Review AI suggestions
5. Click **"Apply"** to accept changes

#### JD Matching

1. Click **"AI Assistant"** in the top bar
2. Paste a job description
3. Type: "Match my resume to this JD"
4. Review suggestions for improvements
5. Apply changes selectively

#### Grammar Check

1. Open **AI Assistant**
2. Type: "Check grammar and spelling"
3. Review highlighted issues
4. Apply fixes

### Exporting Your Resume

1. Click **"Export"** button in top bar
2. Choose format:
   - **PDF**: Standard multi-page PDF
   - **Smart PDF**: AI-optimized single page
   - **HTML**: For web publishing
   - **Markdown**: Plain text with formatting
   - **JSON**: For backup/transfer
3. **Privacy Option**: Toggle "Mask Sensitive Data" to hide:
   - Name, phone, email
   - Company names, school names
   - Personal URLs
4. Click **"Export"**

### Syncing with WebDAV (Optional)

Keep your resumes backed up across devices:

1. Go to **Settings → WebDAV Sync**
2. Enter your WebDAV server details:
   - Server URL (e.g., `https://dav.123pan.com`)
   - Username
   - Password
   - Remote path
3. Click **"Test Connection"**
4. Enable **"Auto Sync"** (optional)
5. Click **"Upload Now"** for manual backup

**Supported Services:**
- 123Cloud (123云盘)
- Nutstore (坚果云)
- Nextcloud
- ownCloud
- Any WebDAV-compatible service

### Keyboard Shortcuts

| Action | Windows | macOS |
|--------|---------|-------|
| New Resume | `Ctrl+N` | `Cmd+N` |
| Save | `Ctrl+S` | `Cmd+S` |
| Export | `Ctrl+E` | `Cmd+E` |
| Toggle AI Chat | `Ctrl+K` | `Cmd+K` |
| Search | `Ctrl+F` | `Cmd+F` |

### Tips & Best Practices

1. **Backup Regularly**: Enable WebDAV auto-sync or export to JSON
2. **Use Templates**: Start with a template that matches your industry
3. **AI Polishing**: Use the section-specific polish button for targeted improvements
4. **JD Matching**: Always tailor your resume to specific job descriptions
5. **Privacy**: Enable data masking when sharing resume files

---

## 中文

### 安装

#### 1. 下载

访问 [Releases 页面](https://github.com/jlifeng/JobPilot/releases) 下载适合你平台的安装包：

- **Windows**: `JobPilot_x.x.x_x64_en-US.msi`
- **macOS (Apple Silicon)**: `JobPilot_aarch64.dmg`（M1/M2/M3 芯片）
- **macOS (Intel)**: `JobPilot_x64.dmg`

#### 2. 安装

**Windows:**
1. 双击 `.msi` 文件
2. 按照安装向导操作
3. 从开始菜单启动

**macOS:**
1. 打开 `.dmg` 文件
2. 拖拽 JobPilot 到应用程序文件夹
3. 首次运行需右键点击选择"打开"（绕过 Gatekeeper）

### 初始配置

#### 配置 AI 服务商

JobPilot 需要配置 AI 服务商才能使用智能功能：

1. 打开**设置**（侧边栏齿轮图标）
2. 进入 **AI 助手**
3. 选择服务商：
   - **OpenAI**（GPT-4、GPT-3.5-Turbo）
   - **Anthropic**（Claude 3.5 Sonnet、Claude 3 Opus）
   - **Google**（Gemini 1.5 Pro、Gemini 1.5 Flash）
   - **OpenAI 兼容**（用于国内大模型如 DeepSeek、Moonshot、智谱等）
4. 输入 API 密钥和 API Base URL（如使用 OpenAI 兼容模式）
5. 选择模型

**获取 API 密钥：**

**国际服务商：**
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Anthropic: [console.anthropic.com](https://console.anthropic.com/)
- Google: [ai.google.dev](https://ai.google.dev/)

**国内大模型服务商：**

JobPilot 通过 OpenAI 兼容 API 支持国内大模型：

| 服务商 | API Base URL | 获取密钥 | 推荐模型 |
|--------|--------------|---------|---------|
| **DeepSeek（深度求索）** | `https://api.deepseek.com` | [platform.deepseek.com](https://platform.deepseek.com/) | `deepseek-chat` |
| **Moonshot（月之暗面）** | `https://api.moonshot.cn/v1` | [platform.moonshot.cn](https://platform.moonshot.cn/) | `moonshot-v1-8k`, `moonshot-v1-32k` |
| **智谱 AI（Zhipu）** | `https://open.bigmodel.cn/api/paas/v4` | [open.bigmodel.cn](https://open.bigmodel.cn/) | `glm-4`, `glm-4-flash` |
| **阿里通义千问（Qwen）** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) | `qwen-plus`, `qwen-turbo` |
| **百度文心一言** | 需通过 SDK 或代理 | [console.bce.baidu.com](https://console.bce.baidu.com/) | 使用 OpenAI 兼容代理 |
| **SiliconFlow（硅基流动）** | `https://api.siliconflow.cn/v1` | [siliconflow.cn](https://siliconflow.cn/) | `Qwen/Qwen2.5-7B-Instruct`（有免费额度）|

**如何使用国内大模型：**
1. 选择 **"OpenAI 兼容"** 作为服务商
2. 输入上表中的 **API Base URL**
3. 输入从服务商获取的 **API 密钥**
4. 输入 **模型名称**（例如：`deepseek-chat`、`moonshot-v1-8k`）
5. 点击 **"测试连接"** 验证配置

**价格对比（2025 年参考）：**
- DeepSeek：~¥0.001/1K tokens（性价比极高）
- Moonshot：~¥0.012/1K tokens
- 智谱 GLM-4：~¥0.05/1K tokens
- SiliconFlow：有免费额度可供测试

**注意：** 国内大模型对中文简历效果最佳。如需处理英文简历，建议使用国际服务商（OpenAI、Anthropic）以获得更好效果。

### 创建第一份简历

#### 方式 1：AI 生成

1. 点击侧边栏 **"+ 新建简历"**
2. 选择 **"AI 生成简历"**
3. 填写基本信息：
   - 姓名、联系方式
   - 工作经历
   - 教育背景
   - 技能
4. 点击 **"生成"**
5. 审阅并编辑结果

#### 方式 2：导入现有简历

1. 点击 **"+ 新建简历"**
2. 选择 **"导入"**
3. 选择格式：
   - **PDF**：上传 PDF 简历（AI 将解析）
   - **Markdown**：从 `.md` 文件导入
   - **JSON**：从 JobPilot JSON 导出文件导入
4. 审阅并调整

#### 方式 3：从模板开始

1. 点击 **"+ 新建简历"**
2. 选择 **"选择模板"**
3. 浏览 50+ 模板
4. 点击模板预览
5. 点击 **"使用此模板"**

### 使用 AI 功能

#### 润色某个模块

1. 鼠标悬停在简历模块上（如"工作经历"）
2. 点击 **✨ 星星图标**
3. AI 聊天面板打开，提示词已自动填充
4. 审阅 AI 建议
5. 点击 **"应用"** 接受修改

#### JD 匹配

1. 点击顶栏 **"AI 助手"**
2. 粘贴职位描述
3. 输入："匹配这个 JD"
4. 审阅改进建议
5. 选择性应用修改

#### 语法检查

1. 打开 **AI 助手**
2. 输入："检查语法和拼写"
3. 审阅标记的问题
4. 应用修复

### 导出简历

1. 点击顶栏 **"导出"** 按钮
2. 选择格式：
   - **PDF**：标准多页 PDF
   - **智能 PDF**：AI 优化的单页版本
   - **HTML**：用于网页发布
   - **Markdown**：带格式的纯文本
   - **JSON**：用于备份/迁移
3. **隐私选项**：开启"脱敏数据"可隐藏：
   - 姓名、手机、邮箱
   - 公司名、学校名
   - 个人 URL
4. 点击 **"导出"**

### WebDAV 同步（可选）

跨设备备份简历：

1. 进入**设置 → WebDAV 同步**
2. 输入 WebDAV 服务器信息：
   - 服务器地址（如 `https://dav.123pan.com`）
   - 用户名
   - 密码
   - 远程路径
3. 点击 **"测试连接"**
4. 启用 **"自动同步"**（可选）
5. 点击 **"立即上传"** 进行手动备份

**支持的服务：**
- 123云盘
- 坚果云
- Nextcloud
- ownCloud
- 任何兼容 WebDAV 的服务

### 键盘快捷键

| 操作 | Windows | macOS |
|------|---------|-------|
| 新建简历 | `Ctrl+N` | `Cmd+N` |
| 保存 | `Ctrl+S` | `Cmd+S` |
| 导出 | `Ctrl+E` | `Cmd+E` |
| 切换 AI 聊天 | `Ctrl+K` | `Cmd+K` |
| 搜索 | `Ctrl+F` | `Cmd+F` |

### 使用技巧

1. **定期备份**：启用 WebDAV 自动同步或导出为 JSON
2. **使用模板**：选择符合行业的模板作为起点
3. **AI 润色**：使用模块特定的润色按钮进行针对性改进
4. **JD 匹配**：始终针对具体职位描述定制简历
5. **隐私保护**：分享简历文件时启用数据脱敏

---

**Need more help? / 需要更多帮助？**
- [FAQ / 常见问题](https://github.com/jlifeng/JobPilot/wiki/FAQ)
- [Troubleshooting / 故障排除](https://github.com/jlifeng/JobPilot/wiki/Troubleshooting)
- [Community / 社区](https://linux.do/)
