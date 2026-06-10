# 免费获取 AI API Key 指南

JobPilot 的 AI 功能（智能导入、AI 助手、JD 分析等）需要配置模型服务的 API Key。以下平台提供免费额度，注册即可使用。

> **提示**：免费额度可能随时调整，以各平台官网为准。本页面会不定期更新。

---

## 推荐平台

### 1. 硅基流动 (SiliconFlow)

- **官网**：<https://siliconflow.cn>
- **免费额度**：注册即送额度，支持 Qwen、DeepSeek、Llama 等多种模型
- **兼容格式**：OpenAI API
- **配置方式**：
  1. 注册账号并登录
  2. 进入「API 密钥」页面，创建密钥
  3. 在 JobPilot 设置中：
     - 模型协议选 **OpenAI**
     - API 地址填 `https://api.siliconflow.cn/v1`
     - API Key 填你创建的密钥
     - 默认模型填 `Qwen/Qwen3-8B`（或其他可用模型）

### 2. 讯飞星辰 (iFlytek MaaS)

- **官网**：<https://maas.xfyun.cn/modelSquare>
- **免费额度**：Qwen 模型服务免费开放，高并发不限量
- **兼容格式**：OpenAI API
- **配置方式**：
  1. 注册讯飞账号并登录星辰平台
  2. 开通模型服务，获取 API Key
  3. 在 JobPilot 设置中：
     - 模型协议选 **OpenAI**
     - API 地址填星辰平台提供的 Base URL
     - API Key 填你获取的密钥
     - 默认模型填 `qwen-plus`（或其他可用模型）

### 3. 魔搭 ModelScope

- **官网**：<https://modelscope.cn>
- **免费额度**：阿里旗下平台，提供部分模型的免费 API 调用
- **兼容格式**：OpenAI API
- **配置方式**：
  1. 注册阿里云账号并登录魔搭
  2. 开通模型服务，获取 API Key
  3. 在 JobPilot 设置中：
     - 模型协议选 **OpenAI**
     - API 地址填魔搭提供的 Base URL
     - API Key 填你获取的密钥
     - 默认模型填对应模型名称

### 4. DeepSeek

- **官网**：<https://platform.deepseek.com>
- **免费额度**：注册送额度，DeepSeek-V3 / R1 等模型可用
- **兼容格式**：OpenAI API
- **配置方式**：
  1. 注册并登录
  2. 进入「API Keys」页面，创建密钥
  3. 在 JobPilot 设置中：
     - 模型协议选 **OpenAI**
     - API 地址填 `https://api.deepseek.com/v1`
     - API Key 填你创建的密钥
     - 默认模型填 `deepseek-chat`

### 5. Google AI Studio (Gemini)

- **官网**：<https://aistudio.google.com>
- **免费额度**：Gemini 模型有较大免费额度
- **兼容格式**：Gemini API（JobPilot 原生支持）
- **配置方式**：
  1. 使用 Google 账号登录 AI Studio
  2. 点击「Get API Key」，创建或选择项目
  3. 在 JobPilot 设置中：
     - 模型协议选 **Google Gemini**
     - API Key 填你获取的密钥
     - 默认模型填 `gemini-2.0-flash`

### 6. OpenRouter

- **官网**：<https://openrouter.ai>
- **免费额度**：部分模型标记为 Free，可免费调用
- **兼容格式**：OpenAI API
- **配置方式**：
  1. 注册并登录
  2. 进入「Keys」页面，创建密钥
  3. 在 JobPilot 设置中：
     - 模型协议选 **OpenAI**
     - API 地址填 `https://openrouter.ai/api/v1`
     - API Key 填你创建的密钥
     - 默认模型填免费模型名称（如 `deepseek/deepseek-chat-v3-0324:free`）

---

## 视觉模型说明

如果需要导入**图片简历**或**扫描版 PDF**，还需要在「简历导入视觉模型」中填写支持图像输入的模型名称。推荐：
- 硅基流动：`Qwen/Qwen2.5-VL-7B-Instruct`
- DeepSeek：暂不支持视觉输入
- Gemini：`gemini-2.0-flash`（原生支持视觉）
- OpenRouter：查找带 `vision` 的免费模型

---

## 通用配置说明

以上平台大多兼容 OpenAI API 格式，配置时注意：

1. **模型协议**选 **OpenAI**（Gemini 除外）
2. **API 地址**要填平台提供的 Base URL，不是 OpenAI 的默认地址
3. **默认模型**要填平台支持的模型名称，不是 OpenAI 的模型名
4. API Key 保存在本地，不会上传到 JobPilot 服务器

---

*最后更新：2026-06-10*
